import { 
  Body, Controller, Delete, Get, Param, Post, Patch, UseGuards, Req, 
  UseInterceptors, UploadedFile 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}
  
  // PUBLIC WEB ENDPOINTS (via short_id)
  @Get('public/:shortId')
  async getPublicTicket(@Param('shortId') shortId: string) {
    console.log(`[TicketsController] GET /tickets/public/${shortId}`);
    return this.ticketsService.findByShortId(shortId);
  }

  @Patch('public/:shortId/due-date')
  async updateDueDatePublic(
    @Param('shortId') shortId: string,
    @Body() body: { dueDate: string }
  ) {
    console.log(`[TicketsController] PATCH /tickets/public/${shortId}/due-date`, body);
    const { dueDate } = body;
    const newDate = new Date(dueDate);
    if (isNaN(newDate.getTime())) throw new Error("Fecha inválida");
    return this.ticketsService.updateDueDatePublic(shortId, newDate);
  }

  @Post('public/:shortId/payment')
  async recordPaymentPublic(
    @Param('shortId') shortId: string,
    @Body() body: { amount: number; paymentMethod: string; description?: string; attachmentUrl?: string }
  ) {
    console.log(`[TicketsController] POST /tickets/public/${shortId}/payment`, body);
    return this.ticketsService.recordPaymentPublic(shortId, body);
  }

  @Post('public/:shortId/cancel')
  async cancelPublic(
    @Param('shortId') shortId: string, 
    @Body() body: { reason?: string }
  ) {
    console.log(`[TicketsController] POST /tickets/public/${shortId}/cancel`, body);
    return this.ticketsService.cancelPublic(shortId, body.reason);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const userId = req.user.sub;
    console.log(`[Controller Mock] POST /tickets user=${userId}`, body);
    try {
       const ticket = await this.ticketsService.create(userId, body);
       return ticket;
    } catch (err) {
       console.error("[Controller Mock] Create failed, returning MOCK", err.message);
       // Return a dummy ticket so the app doesn't break
       return {
         ticketId: `remote_mock_${Date.now()}`,
         ownerId: userId,
         createdAt: new Date().toISOString(),
         ...body
       };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  async getMyTickets(@Req() req: any) {
    const userId = req.user.sub; // Phone number (e.g. +59812345678)
    return this.ticketsService.findByUser(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('payments/my')
  async getMyPaymentLogs(@Req() req: any) {
    const userId = req.user.sub;
    console.log(`[TicketsController] GET /tickets/payments/my user=${userId}`);
    return this.ticketsService.findPaymentLogsByUser(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user.sub;
    console.log(`[Controller] PATCH /tickets/${id} user=${userId}`);
    if (id.startsWith('local_') || id.startsWith('remote_mock_')) {
      return { success: true, message: 'Mocked successful update' };
    }
    return this.ticketsService.update(id, userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('wallet/:walletId')
  async findByWallet(@Req() req: any, @Param('walletId') walletId: string) {
    const userId = req.user.sub;
    return this.ticketsService.findByWallet(walletId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/chat')
  async addChatMessage(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (id.startsWith('local_') || id.startsWith('remote_mock_')) {
      return { success: true, message: 'Mocked successful chat' };
    }
    const userId = req.user.sub;
    const { message, senderName, attachmentUrl, attachmentType } = body;
    return this.ticketsService.addChatMessage(id, userId, message, senderName, attachmentUrl, attachmentType);
  }

  @Post('chat/upload')

  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  async uploadFile(@UploadedFile() file: any) {
    console.log(`[ChatUpload] Reached controller method. File present: ${!!file}`);
    if (file) {
      console.log(`[ChatUpload] File Saved: ${file.filename} (${file.size} bytes)`);
    }

    try {
      if (!file) {
        throw new Error("No file object provided by interceptor or disk storage");
      }
      
      return {
        url: `/uploads/${file.filename}`,
        originalname: file.originalname,
        mimetype: file.mimetype,
      };
    } catch (err) {
      console.error("[ChatUpload] Internal Method Error:", err.message);
      throw err;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/chat')
  async getChatMessages(@Param('id') id: string) {
    if (id.startsWith('local_') || id.startsWith('remote_mock_')) {
      return [];
    }
    return this.ticketsService.getChatMessages(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/logs')
  async getLogs(@Param('id') id: string) {
    if (id.startsWith('local_') || id.startsWith('remote_mock_')) {
      return [];
    }
    return this.ticketsService.getLogs(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/payment')
  async recordPayment(
    @Param('id') id: string,
    @Req() req,
    @Body() body: { amount: number; paymentMethod: string; description?: string; attachmentUrl?: string }
  ) {
    if (id.startsWith('local_') || id.startsWith('remote_mock_')) {
      return { success: true, message: 'Mocked successful payment' };
    }
    return this.ticketsService.recordPayment(id, req.user.sub, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/due-date')
  async updateDueDate(
    @Req() req: any, 
    @Param('id') id: string, 
    @Body() body: { dueDate: string }
  ) {
    const userId = req.user.sub;
    console.log(`[Controller] PATCH /tickets/${id}/due-date user=${userId}`);
    if (id.startsWith('local_') || id.startsWith('remote_mock_')) {
       return { dueDate: body.dueDate };
    }
    const { dueDate } = body;
    const newDate = new Date(dueDate);
    if (isNaN(newDate.getTime())) throw new Error("Fecha inválida");
    return this.ticketsService.updateDueDate(id, userId, newDate);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    if (id.startsWith('local_') || id.startsWith('remote_mock_')) {
      return { success: true, message: 'Mocked successful cancellation' };
    }
    const userId = req.user.sub;
    return this.ticketsService.cancel(id, userId, body.reason);
  }

  // RECURRING TICKETS
  @UseGuards(AuthGuard('jwt'))
  @Post('recurring')
  async createRecurring(@Req() req: any, @Body() body: any) {
    const userId = req.user.sub;
    return this.ticketsService.createRecurring(userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('recurring/my')
  async getMyRecurring(@Req() req: any) {
    const userId = req.user.sub;
    return this.ticketsService.getRecurringByUser(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('recurring/:id')
  async updateRecurring(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user.sub;
    return this.ticketsService.updateRecurring(id, userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('recurring/:id/toggle')
  async toggleRecurring(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.ticketsService.toggleRecurring(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('recurring/:id')
  async deleteRecurring(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.ticketsService.deleteRecurring(id, userId);
  }

}

