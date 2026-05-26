import { Body, Controller, Get, Param, Post, Put, UseGuards, Req, UseInterceptors, UploadedFile, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { WalletsService } from './wallets.service';
import { TicketsService } from '../tickets/tickets.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { SYSTEM_WALLET_NAME } from '../constants';

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly ticketsService: TicketsService,
    private config: ConfigService,
  ) {}

  /**
   * POST /wallets/recalculate-all (autenticado)
   * Recalcula todos los saldos de todas las billeteras del usuario.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('recalculate-all')
  async recalculateAll(@Req() req: any) {
    const userId = req.user.sub;
    return this.ticketsService.recalculateAllUserWallets(userId);
  }

  /**
   * POST /wallets/create  (autenticado)
   * Crea una nueva billetera para el usuario logueado.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  async createForUser(
    @Req() req: any,
    @Body() body: { name: string; type: string; currency?: string; defaultPaymentMethod?: string; defaultTransactionType?: 'income' | 'expense'; helpToCollect?: boolean; warningThreshold?: number; alertThreshold?: number; includeInGeneralBalance?: boolean },
  ) {
    const userId = req.user.sub;
    const wallet = await this.walletsService.create(
      userId,
      body.name,
      body.type as any,
      body.currency ?? 'USD',
      body.defaultPaymentMethod,
      body.helpToCollect,
      body.warningThreshold || 0,
      body.alertThreshold || 0,
      body.defaultTransactionType,
      body.includeInGeneralBalance ?? true
    );
    return {
      id: wallet.walletId,
      name: wallet.name,
      type: wallet.type,
      currency: wallet.currency,
      defaultPaymentMethod: wallet.defaultPaymentMethod,
      helpToCollect: wallet.helpToCollect,
      balance: 0,
      avatarUrl: wallet.avatarUrl,
      warningThreshold: wallet.warningThreshold,
      alertThreshold: wallet.alertThreshold,
      defaultTransactionType: wallet.defaultTransactionType,
      includeInGeneralBalance: wallet.includeInGeneralBalance,
    };
  }

  /** POST /wallets  (sin auth, legacy) */
  @Post()
  create(@Body() body: { ownerId: string; name: string; type: string; currency?: string }) {
    return this.walletsService.create(body.ownerId, body.name, body.type as any, body.currency);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.walletsService.findByUser(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('onboarding')
  async setupOnboarding(@Req() req: any, @Body() body: any) {
    const userId = req.user.sub;
    const { businessType } = body;
    
    try {
      const currency = await this.walletsService.getUserCurrency(userId);
      let defaultWalletId: string | null = null;

      const userWallets = await this.walletsService.findByUser(userId);
      const nonSystemWallets = userWallets.filter(w => !['mycollects', 'mypays', 'mymoney'].includes(w.type));

      if (nonSystemWallets.length === 0) {
        // 1. Always create System Wallets if they don't exist
        const hasMyCollects = userWallets.find(w => w.type === 'mycollects');
        if (!hasMyCollects) {
          await this.walletsService.create(userId, SYSTEM_WALLET_NAME, 'mycollects' as any, currency, undefined, false);
        }
        
        const hasMyPays = userWallets.find(w => w.type === 'mypays');
        if (!hasMyPays) {
          await this.walletsService.create(userId, 'Pagos sin Billetera', 'mypays' as any, currency, undefined, false);
        }

        // 2. Create specific wallets based on businessType
        if (businessType === 'none') {
          const w = await this.walletsService.create(userId, 'Mi Billetera', 'personal' as any, currency, undefined, false);
          defaultWalletId = w.walletId;
        } else if (businessType === 'services') {
          const w = await this.walletsService.create(userId, 'Mi Negocio de Servicios', 'negocio_servicios' as any, currency, undefined, true);
          defaultWalletId = w.walletId;
        } else if (businessType === 'products') {
          const w = await this.walletsService.create(userId, 'Mi Negocio de Productos', 'negocio_productos' as any, currency, undefined, true);
          defaultWalletId = w.walletId;
        } else if (businessType === 'both') {
          const w1 = await this.walletsService.create(userId, 'Mi Negocio de Productos', 'negocio_productos' as any, currency, undefined, true);
          await this.walletsService.create(userId, 'Mi Negocio de Servicios', 'negocio_servicios' as any, currency, undefined, true);
          defaultWalletId = w1.walletId;
        }
      } else {
        defaultWalletId = nonSystemWallets[0].walletId;
      }

      return { success: true, defaultWalletId };
    } catch (e) {
      console.error('[WalletsController] onboarding error', e);
      throw e;
    }
  }
  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  async getMyWallets(@Req() req: any) {
    try {
      const userId = req.user.sub;
      console.log('[WalletsController] /mine called for userId:', userId);
      const userWallets = await this.walletsService.findByUser(userId);
      console.log('[WalletsController] wallets found:', userWallets.length);

      return userWallets.map(w => ({
        id: w.walletId,
        name: w.name,
        type: w.type,
        currency: w.currency,
        balance: Number(w.balance),
        totalIncomes: Number(w.totalIncomes),
        totalExpenses: Number(w.totalExpenses),
        pendingIncomes: Number(w.pendingIncomes),
        pendingExpenses: Number(w.pendingExpenses),
        defaultPaymentMethod: w.defaultPaymentMethod,
        helpToCollect: w.helpToCollect,
        avatarUrl: w.avatarUrl,
        distributionLists: w.distributionLists,
        warningThreshold: Number(w.warningThreshold),
        alertThreshold: Number(w.alertThreshold),
        defaultTransactionType: w.defaultTransactionType,
        includeInGeneralBalance: w.includeInGeneralBalance,
        goals: w.goals,
        enabledPanels: w.panels ? w.panels.filter(p => p.isEnabled).map(p => p.panelName) : [],
        enabledCategories: w.categories ? w.categories.map(c => ({ categoryKey: c.categoryKey, type: c.type })) : [],
        aiQuestions: w.aiQuestions || [],
        members: w.members ? w.members.map(m => ({
          userId: m.userId,
          displayName: m.user?.displayName || m.userId,
          avatarUrl: m.user?.avatarUrl,
          role: m.role
        })) : [],
      }));
    } catch (err) {
      console.error('[WalletsController] /mine ERROR:', err);
      throw err;
    }
  }

  /**
   * GET /wallets/summary
   * Dashboard summary: total balance + wallet list + recent transactions
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('summary')
  async getSummary(@Req() req: any) {
    const userId = req.user.sub;

    let userWallets = await this.walletsService.findByUser(userId);
    if (userWallets.length === 0) {
      await this.walletsService.create(userId, 'Mi Negocio', 'business');
      await this.walletsService.create(userId, 'Mi Negocio', 'personal');
      userWallets = await this.walletsService.findByUser(userId);
    }

    const wallets = userWallets.map(w => ({
      id: w.walletId,
      name: w.name,
      type: w.type,
      balance: Number(w.balance),
      totalIncomes: Number(w.totalIncomes),
      totalExpenses: Number(w.totalExpenses),
      pendingIncomes: Number(w.pendingIncomes),
      pendingExpenses: Number(w.pendingExpenses),
      defaultPaymentMethod: w.defaultPaymentMethod,
      helpToCollect: w.helpToCollect,
      avatarUrl: w.avatarUrl,
      warningThreshold: Number(w.warningThreshold),
      alertThreshold: Number(w.alertThreshold),
      defaultTransactionType: w.defaultTransactionType,
      includeInGeneralBalance: w.includeInGeneralBalance,
      goals: w.goals,
      enabledPanels: w.panels ? w.panels.filter(p => p.isEnabled).map(p => p.panelName) : [],
      members: w.members ? w.members.map(m => ({
        userId: m.userId,
        displayName: m.user?.displayName || m.userId,
        avatarUrl: m.user?.avatarUrl,
        role: m.role
      })) : [],
    }));

    const totalBalance = wallets.reduce((acc, curr) => acc + curr.balance, 0);

    return {
      totalBalance,
      wallets,
      recentTransactions: [],
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':walletId/members')
  async updateMembers(
    @Param('walletId') walletId: string,
    @Body() body: { members: { userId: string; displayName: string }[] },
  ) {
    return this.walletsService.updateMembers(walletId, body.members);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':walletId/members')
  async getMembers(@Param('walletId') walletId: string) {
    return this.walletsService.getMembers(walletId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':walletId')
  async update(
    @Param('walletId') walletId: string,
    @Body() body: { name?: string; defaultPaymentMethod?: string; defaultTransactionType?: 'income' | 'expense'; helpToCollect?: boolean; avatarUrl?: string; distributionLists?: any[]; warningThreshold?: number; alertThreshold?: number; includeInGeneralBalance?: boolean; goals?: any[]; enabledPanels?: string[]; enabledCategories?: { categoryKey: string; type: 'income' | 'expense' }[] },
  ) {
    return this.walletsService.update(walletId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = './public/uploads/avatars';
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const id = req.params.id as string || 'default';
        const encodedId = encodeURIComponent(id);
        cb(null, `wallet-${encodedId}-${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
  }))
  async uploadAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    console.log('[WalletsController] uploadAvatar called for id:', id);
    try {
      if (!file) throw new Error('No file uploaded');
      
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const baseUrl = this.config.get<string>('AVATAR_BASE_URL') || `${protocol}://${host}`;
      const url = `${baseUrl}/uploads/avatars/${file.filename}`;
      
      return this.walletsService.update(id, { avatarUrl: url });
    } catch (err) {
      console.error('[WalletsController] Error in uploadAvatar:', err);
      throw new InternalServerErrorException('Failed to upload wallet avatar');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':walletId/reconcile')
  async reconcile(
    @Param('walletId') walletId: string,
    @Body() body: { settlements: { fromId: string; toId: string; amount: number }[] },
    @Req() req: any
  ) {
    const userId = req.user.sub;
    console.log(`[WalletsController] reconcile called for wallet ${walletId} by user ${userId}. Settlements:`, JSON.stringify(body.settlements));
    
    const results: any[] = [];
    for (const s of body.settlements) {
      try {
        const ticket = await this.ticketsService.create(s.toId, {
          walletId,
          amount: s.amount,
          type: 'income',
          description: `Conciliación Billetera`,
          toUser: s.fromId,
          status: 'pending',
          dueDate: new Date(),
          helpToCollect: true,
          currency: await this.walletsService.getUserCurrency(s.toId),
          generatePeilink: true,
        });
        results.push(ticket);
      } catch (err) {
        console.error(`[WalletsController] Error creating reconciliation ticket for ${s.toId}:`, err.message);
      }
    }
    
    return { success: true, count: results.length };
  }
}
