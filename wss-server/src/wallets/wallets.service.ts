import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Wallet, WalletType } from './entities/wallet.entity';
import { WalletMember } from './entities/wallet-member.entity';
import { WalletDistributionList } from './entities/wallet-distribution-list.entity';
import { User } from '../users/entities/user.entity';
import { TicketDetail } from '../tickets/entities/ticket-detail.entity';
import { WalletGoal } from './entities/wallet-goal.entity';
import { WalletPanel } from './entities/wallet-panel.entity';
import { WalletCategory } from './entities/wallet-category.entity';
import { WALLET_CONFIGS } from './constants/wallet-configs';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletMember)
    private memberRepo: Repository<WalletMember>,
    @InjectRepository(WalletDistributionList)
    private listRepo: Repository<WalletDistributionList>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(TicketDetail)
    private ticketDetailRepo: Repository<TicketDetail>,
    @InjectRepository(WalletGoal)
    private goalRepo: Repository<WalletGoal>,
    @InjectRepository(WalletPanel)
    private panelRepo: Repository<WalletPanel>,
    @InjectRepository(WalletCategory)
    private categoryRepo: Repository<WalletCategory>,
    private notificationsService: NotificationsService,
  ) {}

  async create(ownerId: string, name: string, type: WalletType, currency = 'USD', defaultPaymentMethod?: string, helpToCollect = false, warningThreshold = 0, alertThreshold = 0, defaultTransactionType?: "income" | "expense", includeInGeneralBalance = true) {
    const isBusiness = type.includes('negocio') || type === 'business';
    const calculatedDefault = defaultTransactionType || (isBusiness ? 'income' : 'expense');
    
    const wallet = await this.walletRepo.save({
      walletId: uuidv4(),
      name,
      type,
      currency,
      defaultPaymentMethod,
      defaultTransactionType: calculatedDefault,
      helpToCollect,
      warningThreshold,
      alertThreshold,
      ownerId,
      includeInGeneralBalance,
    });

    // Owner is also a member with role 'owner'
    await this.memberRepo.save({
      walletId: wallet.walletId,
      userId: ownerId,
      role: 'owner',
    });

    // 4. Apply defaults from config
    const config = WALLET_CONFIGS[type] || WALLET_CONFIGS['otro'];

    if (config) {
      console.log(`[WalletsService] Applying defaults for type=${type}`);
      
      // Categories
      if (config.defaultCategories.length > 0) {
        const categoriesToSave = config.defaultCategories.map(cat => ({
          walletId: wallet.walletId,
          categoryKey: cat.key,
          type: cat.type,
          isEnabled: true,
        }));
        await this.categoryRepo.save(categoriesToSave);
      }

      // Panels
      if (config.defaultPanels.length > 0) {
        const panelsToSave = config.defaultPanels.map(panel => ({
          walletId: wallet.walletId,
          panelName: panel,
          isEnabled: true,
        }));
        await this.panelRepo.save(panelsToSave);
      }

      // AI Questions
      if (config.defaultQuestions.length > 0) {
        wallet.aiQuestions = config.defaultQuestions;
        await this.walletRepo.save(wallet);
      }

      // Origins (Distribution Lists)
      if (config.defaultOrigins && config.defaultOrigins.length > 0) {
        const listsToSave = config.defaultOrigins.map(origin => ({
          walletId: wallet.walletId,
          name: origin.name,
          contacts: origin.contacts,
        }));
        await this.listRepo.save(listsToSave);
      }
    }

    return wallet;
  }

  async getUserCurrency(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { userId } });
    
    if (user?.country) {
      const country = user.country.toUpperCase();
      if (country === 'UY') return 'UYU';
      if (country === 'AR') return 'ARS';
      if (country === 'CL') return 'CLP';
      if (country === 'BR') return 'BRL';
      if (country === 'CO') return 'COP';
      if (country === 'MX') return 'MXN';
      if (country === 'PE') return 'PEN';
      if (country === 'US') return 'USD';
      if (country === 'ES') return 'EUR';
    }

    // Fallback: Infer from E.164 phone number prefix
    if (userId.startsWith('+598')) return 'UYU';
    if (userId.startsWith('+54')) return 'ARS';
    if (userId.startsWith('+56')) return 'CLP';
    if (userId.startsWith('+55')) return 'BRL';
    if (userId.startsWith('+57')) return 'COP';
    if (userId.startsWith('+52')) return 'MXN';
    if (userId.startsWith('+51')) return 'PEN';
    if (userId.startsWith('+34')) return 'EUR';

    return user?.currency && user.currency !== 'USD' ? user.currency : 'USD';
  }

  async findByUser(userId: string) {
    return this.walletRepo
      .createQueryBuilder('w')
      .innerJoin('wallet_members', 'wm', 'wm.wallet_id = w.wallet_id')
      .leftJoinAndSelect('w.distributionLists', 'dl', 'dl.deleted_at IS NULL')
      .leftJoinAndSelect('w.goals', 'g')
      .leftJoinAndSelect('w.panels', 'p')
      .leftJoinAndSelect('w.categories', 'c')
      .leftJoinAndSelect('w.members', 'm', 'm.deleted_at IS NULL')
      .leftJoinAndSelect('m.user', 'mu')
      .where('wm.user_id = :userId', { userId })
      .andWhere('w.deleted_at IS NULL')
      .andWhere('wm.deleted_at IS NULL')
      .orderBy('w.created_at', 'DESC')
      .getMany();
  }

  async getMembers(walletId: string) {
    const raw = await this.memberRepo
      .createQueryBuilder('wm')
      .leftJoinAndSelect('wm.user', 'user')
      .where('wm.wallet_id = :walletId', { walletId })
      .andWhere('wm.deleted_at IS NULL')
      .getMany();

    return raw.map((m) => ({
      userId: m.userId,
      displayName: m.user?.displayName || m.userId,
      avatarUrl: m.user?.avatarUrl,
      role: m.role,
    }));
  }

  async updateMembers(walletId: string, members: { userId: string; displayName: string }[]) {
    // 1. Mark existing non-owner members as deleted
    await this.memberRepo
      .createQueryBuilder()
      .update(WalletMember)
      .set({ deletedAt: new Date() })
      .where('wallet_id = :walletId', { walletId })
      .andWhere('role != :role', { role: 'owner' })
      .execute();

    // 2. Upsert members
    for (const m of members) {
      const cleanUserId = m.userId.replace(/[^\d+]/g, '');
      // Ensure user exists
      const userExists = await this.userRepo.findOne({ where: { userId: cleanUserId } });
      if (!userExists) {
        console.warn(`[WalletsService] User ${cleanUserId} not found, skipping.`);
        continue;
      }

      // Check if already member (might be deleted)
      const existingMember = await this.memberRepo.findOne({
        where: { walletId, userId: cleanUserId },
        withDeleted: true,
      });

      if (existingMember) {
        await this.memberRepo.restore({ memberId: existingMember.memberId });
        await this.memberRepo.update(
          { memberId: existingMember.memberId },
          { role: 'operator' },
        );
      } else {
        await this.memberRepo.save({
          walletId,
          userId: cleanUserId,
          role: 'operator',
        });
        
        // Notify the user that they were added
        try {
          const wallet = await this.walletRepo.findOne({ where: { walletId } });
          const walletName = wallet?.name || 'una billetera';
          await this.notificationsService.sendNotification(
            cleanUserId, 
            `Fuiste agregado como miembro a la billetera "${walletName}".`,
            'Nueva Billetera Compartida'
          );
        } catch (e) {
          console.error(`[WalletsService] Failed to notify added member ${cleanUserId}`, e);
        }
      }

      // 3. Backfill TicketDetail for this user if it's a new or restored member
      // This allows they to see all historical tickets for this wallet.
      // We look for all unique tickets that have AT LEAST ONE detail in this wallet already.
      const ticketsWithDetails = await this.ticketDetailRepo
        .createQueryBuilder('td')
        .select('DISTINCT td.ticket_id', 'ticketId')
        .where('td.wallet_id = :walletId', { walletId })
        .getRawMany();

      for (const t of ticketsWithDetails) {
        // Enforce existing detail check
        const hasDetail = await this.ticketDetailRepo.findOne({
          where: { ticketId: t.ticketId, userId: cleanUserId }
        });
        if (!hasDetail) {
          // Find the type and rubro from an existing member for reference (usually they all see the same for wallet tickets)
          const reference = await this.ticketDetailRepo.findOne({
            where: { ticketId: t.ticketId, walletId }
          });
          
          if (reference) {
            await this.ticketDetailRepo.save({
              ticketId: t.ticketId,
              userId: cleanUserId,
              walletId: walletId,
              role: 'member',
              type: reference.type,
              rubro: reference.rubro,
            });
          }
        }
      }
    }

    return this.getMembers(walletId);
  }

  async update(walletId: string, data: { name?: string; defaultPaymentMethod?: string; defaultTransactionType?: 'income' | 'expense'; helpToCollect?: boolean; avatarUrl?: string; distributionLists?: any[]; warningThreshold?: number; alertThreshold?: number; includeInGeneralBalance?: boolean; goals?: any[]; enabledPanels?: string[]; enabledCategories?: { categoryKey: string; type: 'income' | 'expense' }[] }) {
    const { distributionLists, goals, enabledPanels, enabledCategories, ...walletData } = data;
    
    if (Object.keys(walletData).length > 0) {
      await this.walletRepo.update({ walletId }, walletData);
    }

    if (distributionLists) {
      await this.updateDistributionLists(walletId, distributionLists);
    }

    if (goals) {
      await this.updateGoals(walletId, goals);
    }

    if (enabledPanels) {
      await this.updatePanels(walletId, enabledPanels);
    }

    if (enabledCategories) {
      await this.updateCategories(walletId, enabledCategories);
    }

    return this.walletRepo.findOne({ 
      where: { walletId },
      relations: ['distributionLists', 'goals', 'panels', 'categories']
    });
  }

  async updatePanels(walletId: string, enabledPanels: string[]) {
    await this.panelRepo.delete({ walletId });
    for (const panel of enabledPanels) {
      await this.panelRepo.save({
        walletId,
        panelName: panel,
        isEnabled: true,
      });
    }
  }

  async updateGoals(walletId: string, goals: any[]) {
    await this.goalRepo.delete({ walletId });
    for (const g of goals) {
      await this.goalRepo.save({
        walletId,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline,
      });
    }
  }

  async updateDistributionLists(walletId: string, lists: any[]) {
    // Eliminamos (lógico) las anteriores
    await this.listRepo.softDelete({ walletId });

    // Insertamos las nuevas
    for (const l of lists) {
      await this.listRepo.save({
        walletId,
        name: l.name,
        contacts: l.contacts,
      });
    }
  }

  async updateCategories(walletId: string, enabledCategories: { categoryKey: string; type: 'income' | 'expense' }[]) {
    await this.categoryRepo.delete({ walletId });
    for (const cat of enabledCategories) {
      await this.categoryRepo.save({
        walletId,
        categoryKey: cat.categoryKey,
        type: cat.type,
        isEnabled: true,
      });
    }
  }

  async getDistributionLists(walletId: string) {
    return this.listRepo.find({ where: { walletId } });
  }
}
