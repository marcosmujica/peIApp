import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef
} from '@nestjs/common';
import { WalletsService } from '../wallets/wallets.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager, Brackets, LessThan, MoreThanOrEqual, Between } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketChat } from './entities/ticket-chat.entity';
import { RecurringTicket } from './entities/recurring-ticket.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

// Local helpers for date manipulation (avoiding date-fns dependency)
const addWeeks = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount * 7);
  return result;
};
const addMonths = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + amount);
  return result;
};
const addYears = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + amount);
  return result;
};
const isPast = (date: Date) => date.getTime() < Date.now();
import { TicketDetail } from './entities/ticket-detail.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { User } from '../users/entities/user.entity';

import { SYSTEM_WALLET_NAME, SYSTEM_EXPENSES_WALLET_NAME } from '../constants';
import { TicketLog } from './entities/ticket-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AIService } from '../ai/ai.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  constructor(
    @InjectRepository(Ticket)
    private ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketDetail)
    private ticketDetailRepo: Repository<TicketDetail>,
    @InjectRepository(TicketChat)
    private chatRepo: Repository<TicketChat>,
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(TicketLog)
    private logRepo: Repository<TicketLog>,
    @InjectRepository(RecurringTicket)
    private recurringRepo: Repository<RecurringTicket>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private aiService: AIService,
    private configService: ConfigService,
    @Inject(forwardRef(() => WalletsService))
    private walletsService: WalletsService,
  ) {}

  async sendTicketNotification(ticketId: string, senderId: string, content: string, senderNameOverride?: string, manager?: EntityManager) {
    this.logger.log(`[sendTicketNotification] START - ticketId=${ticketId}, senderId=${senderId}`);
    try {
      const ticketRepo = manager ? manager.getRepository(Ticket) : this.ticketRepo;
      const userRepo = manager ? manager.getRepository(User) : this.userRepo;
      const ticketDetailRepo = manager ? manager.getRepository(TicketDetail) : this.ticketDetailRepo;

      const ticket = await ticketRepo.findOne({ where: { ticketId } });
      if (!ticket) {
        this.logger.warn(`[sendTicketNotification] Ticket not found: ${ticketId}`);
        return;
      }

      const sender = await userRepo.findOne({ where: { userId: senderId } });
      const senderName = sender?.displayName || senderNameOverride || 'Un usuario';

      const participants = await ticketDetailRepo.find({ where: { ticketId } });
      this.logger.log(`[sendTicketNotification] Found ${participants.length} participants for ticket ${ticketId}`);
      
      let targetUserId: string | null = null;
      
      if (senderId === ticket.ownerId) {
        // El dueño realizó el cambio -> Notificar al destinatario principal
        // Buscamos cualquier participante que no sea el dueño
        const targetDetail = participants.find(p => 
          p.userId !== ticket.ownerId && 
          (p.role === 'user_id' || p.role === 'receiver' || p.role === 'member' || p.role === 'participant')
        ) || participants.find(p => p.userId !== ticket.ownerId);

        targetUserId = targetDetail ? targetDetail.userId : null;
      } else {
        // Alguien más (destinatario o invitado) realizó el cambio -> Notificar al dueño
        targetUserId = ticket.ownerId;
      }

      this.logger.log(`[sendTicketNotification] Logic: sender=${senderId}, owner=${ticket.ownerId}, target=${targetUserId}`);

      const targetUser = targetUserId ? await userRepo.findOne({ where: { userId: targetUserId } }) : null;

      if (targetUserId && targetUserId !== senderId && targetUser) {
        const baseUrl = this.configService.get<string>('WEB_SHARE_URL') || 'http://localhost:5173';
        const publicLink = ticket.shortId ? `\nLink: ${baseUrl}/t/${ticket.shortId}` : '';
        const ticketInfo = `\nTicket: ${ticket.description || 'Sin detalle'} (${ticket.currency} ${Number(ticket.amount).toLocaleString('es-AR')})`;
        
        const fullContent = `${senderName}: ${content}${ticketInfo}${publicLink}`;
        
        this.logger.log(`[sendTicketNotification] SENDING to ${targetUserId}: ${fullContent}`);
        await this.notificationsService.sendNotification(targetUserId, fullContent, 'peIApp');
      } else {
        this.logger.log(`[sendTicketNotification] SKIP: No target, target is sender, or target user record not found. target=${targetUserId}`);
      }

    } catch (err) {
      this.logger.error(`[sendTicketNotification] Error: ${err.message}`);
    }
  }


  async create(ownerId: string, data: any) {
    console.log(`[TicketsService.create] Start for user=${ownerId}`, data);
    try {
      return await this.dataSource.transaction(async (manager) => {
        return await this.internalCreateTicket(manager, ownerId, data);
      });
    } catch (totalErr) {
      console.error(`[TicketsService.create] TOTAL ERROR:`, totalErr);
      throw totalErr;
    }
  }

  async update(id: string, userId: string, data: any) {
    return await this.dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, { where: { ticketId: id } });
      if (!ticket) throw new Error('Ticket not found');
      
      const userDetail = await manager.findOne(TicketDetail, { 
        where: { ticketId: id, userId } 
      });

      if (!userDetail) {
        throw new Error('No tienes permiso para participar en este ticket');
      }

      // Guardar wallet vieja para recálculo si cambia
      const oldWalletId = userDetail.walletId;

      // 1. Si es el dueño, puede editar datos globales del Ticket
      if (ticket.ownerId === userId) {
        // Campos que pueden venir en data y son globales
        const globalFields = [
          'amount', 'currency', 'description', 'dueDate', 'status', 
          'paymentMethod', 'paymentProcedure', 'privateNote', 
          'generatePeilink', 'helpToCollect', 'reference', 
          'expenses', 'expensesDetail', 'attachmentUrl',
          'source', 'sourceInfo', 'comment', 'ownerRating', 'participantRating',
          'shortId'
        ];

        
        for (const field of globalFields) {
          if (data[field] !== undefined) {
            (ticket as any)[field] = data[field];
          }
        }
        await manager.save(ticket);
      }

      // 2. Todos los participantes pueden editar SU propia configuración (wallet, rubro, descripcion)
      if (data.walletId !== undefined) userDetail.walletId = data.walletId;
      if (data.type !== undefined) userDetail.type = data.type;
      if (data.description !== undefined) userDetail.description = data.description;
      if (data.privateNote !== undefined) userDetail.privateNote = data.privateNote;
      
      // Manejar el rubro (puede venir como 'rubro', 'rubroIncome' o 'rubroExpense')
      const incomeRubro = data.rubroIncome || (data.type === 'income' ? data.rubro : undefined);
      const expenseRubro = data.rubroExpense || (data.type === 'expense' ? data.rubro : undefined);
      
      const newRubro = data.rubro || (userDetail.type === 'income' ? incomeRubro : expenseRubro);
      
      if (newRubro !== undefined) {
        userDetail.rubro = newRubro;
      } else if (data.rubroIncome !== undefined && userDetail.type === 'income') {
        userDetail.rubro = data.rubroIncome;
      } else if (data.rubroExpense !== undefined && userDetail.type === 'expense') {
        userDetail.rubro = data.rubroExpense;
      }
      
      await manager.save(userDetail);
      
      // 3. Recalcular billeteras involucradas
      if (oldWalletId) {
        await this.internalRecalculate(manager, oldWalletId);
      }
      if (userDetail.walletId && userDetail.walletId !== oldWalletId) {
        await this.internalRecalculate(manager, userDetail.walletId);
      }

      // Notify the counterpart if the owner modified global fields
      if (ticket.ownerId === userId) {
        await this.sendTicketNotification(ticket.ticketId, userId, 'modificó los detalles del ticket', undefined, manager);
        
        // Trigger AI prediction for others if description changed
        if (data.description && data.description !== ticket.description) {
           const participants = await manager.find(TicketDetail, { where: { ticketId: id } });
           for (const p of participants) {
             if (p.userId !== userId && !p.rubro) {
                this.triggerAsyncAIPrediction(id, p.userId, data.description, p.type);
             }
           }
        }
      }

      return ticket;
    });
  }

  async findByUser(userId: string) {
    // Buscar todos los TicketDetails para este usuario y unirlos con el Ticket
    const qb = this.ticketDetailRepo.createQueryBuilder('detail')
      .leftJoinAndSelect('detail.ticket', 'ticket')
      .leftJoinAndSelect('ticket.owner', 'owner')
      .leftJoinAndMapOne('ticket.otherParticipant', TicketDetail, 'other', 'other.ticketId = detail.ticketId AND other.userId != :userId', { userId })
      .leftJoinAndMapOne('ticket.otherUserObj', User, 'u', 'u.userId = other.userId')
      .where('detail.userId = :userId', { userId });

    // Regla: Si el ticket está asociado a una billetera (detail.walletId is not null),
    // el usuario DEBE ser miembro activo de esa billetera para verlo.
    // Excepto si es el ownerId global del ticket (que siempre lo ve?) o si es un ticket sin billetera (walletId null)
    // Pero si el usuario es dueño del ticket pero ya no tiene acceso a la billetera donde lo puso? 
    // Generalmente, el dueño de una billetera no se puede ir de ella (es el owner).
    
    // Implementamos filtro dinámico:
    qb.andWhere(new Brackets(innerQb => {
        innerQb.where('detail.walletId IS NULL')
               .orWhere(sub => {
                 const subQuery = sub.subQuery()
                    .select('wm.member_id')
                    .from('wallet_members', 'wm')
                    .where('wm.wallet_id = detail.walletId')
                    .andWhere('wm.user_id = :userId', { userId })
                    .andWhere('wm.deleted_at IS NULL')
                    .getQuery();
                 return 'EXISTS (' + subQuery + ')';
               });
    }));

    const details = await qb.orderBy('ticket.createdAt', 'DESC').getMany();
    const systemWallet = await this.walletRepo.findOne({
      where: { ownerId: userId, type: 'mycollects' }
    });

    return details.map(d => ({
       ...d.ticket,
       description: d.description !== null && d.description !== undefined ? d.description : d.ticket.description,
       privateNote: d.privateNote || '',
       walletId: d.walletId || systemWallet?.walletId,
       type: d.type,
       globalType: d.ticket.type,
       rubro: d.rubro,
       role: d.role,
       toUser: (d.ticket as any).otherParticipant?.userId,
       toUserObj: (d.ticket as any).otherUserObj,
    }));
  }

  /**
   * Método interno para sincronizar saldos de una billetera llamando a la función de la DB
   */
  private async internalRecalculate(manager: EntityManager, walletId: string) {
    try {
      await manager.query(`SELECT sync_wallet_balance($1)`, [walletId]);
    } catch (e) {
      console.error(`[internalRecalculate] Error syncing wallet ${walletId}:`, e);
    }
  }

  // Mantenemos este para compatibilidad o procesos fuera de transacción simple
  async recalculateWalletBalance(walletId: string) {
    await this.dataSource.transaction(async (manager) => {
      await this.internalRecalculate(manager, walletId);
    });
  }

  async findByWallet(walletId: string, userId?: string) {
    const wallet = await this.walletRepo.findOne({ where: { walletId } });
    const isUnassignedWallet = wallet?.type === 'mycollects' || wallet?.type === 'mypays';

    const qb = this.ticketDetailRepo.createQueryBuilder('detail')
      .leftJoinAndSelect('detail.ticket', 'ticket')
      .leftJoinAndSelect('ticket.owner', 'owner')
      .leftJoinAndMapOne('ticket.otherParticipant', TicketDetail, 'other', 'other.ticketId = detail.ticketId AND other.userId != detail.userId')
      .leftJoinAndMapOne('ticket.otherUserObj', User, 'u', 'u.userId = other.userId')
      .where('detail.walletId = :walletId', { walletId });

    if (isUnassignedWallet && userId) {
      qb.orWhere('(detail.walletId IS NULL AND detail.userId = :userId)', { userId });
    }

    const details = await qb.orderBy('ticket.createdAt', 'DESC').getMany();

    return details.map(d => ({
      ...d.ticket,
      description: d.description !== null && d.description !== undefined ? d.description : d.ticket.description,
      privateNote: d.privateNote || '',
      walletId: d.walletId,
      type: d.type,
      globalType: d.ticket.type,
      rubro: d.rubro,
      role: d.role,
      toUser: (d.ticket as any).otherParticipant?.userId,
      toUserObj: (d.ticket as any).otherUserObj,
    }));
  }

  async addChatMessage(
    ticketId: string, 
    senderId: string, 
    message?: string, 
    senderName?: string,
    attachmentUrl?: string,
    attachmentType?: string,
    replyToChatId?: string,
    replyToMessage?: string,
    replyToSenderName?: string,
  ) {
    const chat = this.chatRepo.create({
      ticketId,
      senderId,
      message,
      senderName,
      attachmentUrl,
      attachmentType,
      replyToChatId,
      replyToMessage,
      replyToSenderName,
    });
    const saved = await this.chatRepo.save(chat);
    
    const lastMsgText = message || (attachmentType === 'image' ? '📸 Imagen' : '📄 Archivo');
    await this.ticketRepo.update(ticketId, {
      lastChatMessage: lastMsgText,
      lastChatMessageTimestamp: saved.createdAt,
      lastChatSenderId: senderId,
    });

    return saved;
  }

  async findOne(ticketId: string) {
    return this.ticketRepo.findOne({
      where: { ticketId },
    });
  }

  async findByShortId(shortId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { shortId },
      relations: ['owner']
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    
    // Fetch logs
    const logs = await this.logRepo.find({
      where: { ticketId: ticket.ticketId },
      order: { createdAt: 'DESC' }
    });
    
    return {
      ...ticket,
      logs
    };
  }

  async getChatMessages(ticketId: string) {
    return this.chatRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
  }

  async getParticipants(ticketId: string) {
    return this.ticketDetailRepo.find({
      where: { ticketId },
    });
  }

  async getLogs(ticketId: string) {
    try {
      const logs = await this.logRepo.createQueryBuilder('log')
        .leftJoinAndSelect('log.user', 'user')
        .where('log.ticketId = :ticketId', { ticketId })
        .orderBy('log.createdAt', 'ASC')
        .getMany();
      
      return logs;
    } catch (error) {
      console.error(`[GetLogs] Error:`, error);
      throw error;
    }
  }

  async recordPayment(ticketId: string, userId: string, data: { 
    amount: number, 
    paymentMethod: string, 
    description?: string,
    attachmentUrl?: string,
    isPublic?: boolean
  }) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const ticket = await manager.findOne(Ticket, { where: { ticketId } });
        if (!ticket) throw new NotFoundException('Ticket no encontrado');

        const oldStatus = ticket.status;
        const currentPaid = Number(ticket.amountPaid) || 0;
        const totalAmount = Number(ticket.amount);
        const newPaidTotal = currentPaid + Number(data.amount);

        ticket.amountPaid = newPaidTotal;
        if (newPaidTotal >= totalAmount) {
          ticket.status = 'completed';
        }
        await manager.save(ticket);

        const dbUserId = userId === 'public_guest' ? ticket.ownerId : userId;

        // Create payment log entry
        const log = manager.create(TicketLog, {
          ticketId,
          userId: dbUserId,
          action: 'payment_received',
          oldValue: currentPaid.toString(),
          newValue: newPaidTotal.toString(),
          paymentMethod: data.paymentMethod,
          comment: data.description,
          attachmentUrl: data.attachmentUrl,
        });
        await manager.save(log);

        // If status changed to completed, log it
        if (oldStatus !== 'completed' && ticket.status === 'completed') {
          const statusLog = manager.create(TicketLog, {
            ticketId,
            userId: dbUserId,
            action: 'status_completed',
            oldValue: oldStatus,
            newValue: 'completed',
            comment: data.isPublic ? 'Completado vía Web' : 'Pago total recibido',
          });
          await manager.save(statusLog);
        }

        // Add Chat Message
        const amountStr = `${ticket.currency} ${Number(data.amount).toLocaleString('es-ES')}`;
        const chatMsg = manager.create(TicketChat, {
          ticketId,
          senderId: dbUserId,
          message: `✅ Pago recibido${data.isPublic ? ' vía Web' : ''}: ${amountStr} (${data.paymentMethod})${data.description ? ` - ${data.description}` : ''}${ticket.status === 'completed' ? '\n🏁 Ticket COMPLETADO' : ''}`,
          senderName: data.isPublic ? 'Invitado Web' : 'Sistema',
          attachmentUrl: data.attachmentUrl,
          attachmentType: data.attachmentUrl ? 'image' : undefined
        });
        const savedChatMsg = await manager.save(chatMsg);
        await manager.update(Ticket, ticketId, {
          lastChatMessage: savedChatMsg.message,
          lastChatMessageTimestamp: savedChatMsg.createdAt || new Date(),
          lastChatSenderId: dbUserId,
        });

        // Recalculate wallets for all participants
        const details = await manager.find(TicketDetail, { where: { ticketId } });
        for (const d of details) {
          if (d.walletId) {
            await this.internalRecalculate(manager, d.walletId);
          }
        }

        // Notify
        const remaining = totalAmount - newPaidTotal;
        const remainingStr = remaining > 0 ? `. Resta pagar: ${ticket.currency} ${remaining.toLocaleString('es-AR')}` : '';

        await this.sendTicketNotification(
          ticketId, 
          userId, 
          `Registró un pago de ${amountStr} (${data.paymentMethod}) para el ticket "${ticket.description || 'Sin descripción'}"${ticket.status === 'completed' ? '. ¡Ticket completado!' : remainingStr}`,
          undefined,
          manager
        );

        return ticket;
      });
    } catch (err) {
      console.error("[RecordPayment Error]", err);
      throw err;
    }
  }

  async recordPaymentPublic(shortId: string, data: { 
    amount: number, 
    paymentMethod: string, 
    description?: string,
    attachmentUrl?: string,
  }) {
    const ticket = await this.findByShortId(shortId);
    return this.recordPayment(ticket.ticketId, 'public_guest', {
      ...data,
      isPublic: true,
      description: data.description ? `(Vía Web) ${data.description}` : '(Vía Web)'
    });
  }

  async updateDueDate(ticketId: string, userId: string, newDate: Date) {
    this.logger.log(`[updateDueDate] ticketId=${ticketId}, userId=${userId}, newDate=${newDate.toISOString()}`);


    return await this.dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, { where: { ticketId } });
      if (!ticket) throw new Error('Ticket not found');

      const isParticipant = await manager.findOne(TicketDetail, {
        where: { ticketId, userId }
      });
      if (!isParticipant) throw new Error('No tienes permiso para editar este ticket');

      const oldDate = ticket.dueDate;
      
      // Update Ticket
      ticket.dueDate = newDate;
      if (ticket.initialDueDate === null || ticket.initialDueDate === undefined) {
        ticket.initialDueDate = oldDate;
      }
      await manager.save(ticket);

      // Create Log
      const log = manager.create(TicketLog, {
        ticketId,
        userId,
        action: 'due_date_change',
        oldValue: oldDate instanceof Date ? oldDate.toISOString() : (oldDate ? String(oldDate) : undefined),
        newValue: newDate.toISOString(),
      });
      await manager.save(log);

      // Add Chat Message via Manager
      const formattedDate = newDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      const chat = manager.create(TicketChat, {
        ticketId,
        senderId: userId,
        message: `*** Cambio la fecha de pago para el ${formattedDate}`,
        senderName: 'Sistema',
      });
      const savedChat = await manager.save(chat);
      await manager.update(Ticket, ticketId, {
        lastChatMessage: savedChat.message,
        lastChatMessageTimestamp: savedChat.createdAt || new Date(),
        lastChatSenderId: userId,
      });

      // Notify
      const formattedDateNotif = newDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      await this.sendTicketNotification(
        ticketId,
        userId,
        `Cambió la fecha de vencimiento: El ticket "${ticket.description || 'Sin descripción'}" ahora vence el ${formattedDateNotif}`,
        undefined,
        manager
      );

      return ticket;
    });
  }

  async updateDueDatePublic(shortId: string, newDate: Date) {
    const t = await this.findByShortId(shortId);
    
    return await this.dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, { where: { ticketId: t.ticketId } });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');

      const oldDate = ticket.dueDate;
      ticket.dueDate = newDate;
      if (!ticket.initialDueDate) ticket.initialDueDate = oldDate;
      await manager.save(ticket);

      // Log
      const log = manager.create(TicketLog, {
        ticketId: ticket.ticketId,
        userId: ticket.ownerId,
        action: 'due_date_change',
        oldValue: oldDate?.toISOString(),
        newValue: newDate.toISOString(),
        comment: 'Cambio realizado vía link público',
      });
      await manager.save(log);

      // Chat
      const formattedDate = newDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      const chat = manager.create(TicketChat, {
        ticketId: ticket.ticketId,
        senderId: ticket.ownerId,
        message: `📅 Fecha de pago cambiada para el ${formattedDate} (vía Web)`,
        senderName: 'Sistema',
      });
      const savedChat = await manager.save(chat);
      await manager.update(Ticket, ticket.ticketId, {
        lastChatMessage: savedChat.message,
        lastChatMessageTimestamp: savedChat.createdAt || new Date(),
        lastChatSenderId: ticket.ownerId,
      });

      // Notify
      await this.sendTicketNotification(
        ticket.ticketId,
        'public_guest',
        `Se cambió la fecha de pago vía web para el ${formattedDate}`,
        'Invitado vía Web',
        manager
      );

      return ticket;
    });
  }

  async cancel(ticketId: string, userId: string, reason?: string) {
    return await this.dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, { where: { ticketId } });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');
      
      const participants = await manager.find(TicketDetail, { where: { ticketId } });
      const isParticipant = participants.some(p => p.userId === userId);
      
      if (!isParticipant) throw new ForbiddenException('No tienes permiso para cancelar este ticket');
      if (ticket.status === 'cancelled') return ticket;
      if (ticket.status !== 'pending') throw new BadRequestException('Solo se pueden cancelar tickets pendientes');

      const oldStatus = ticket.status;
      ticket.status = 'cancelled';
      if (reason) {
        ticket.privateNote = ticket.privateNote ? `${ticket.privateNote}\nMOTIVO CANCELACIÓN: ${reason}` : `MOTIVO CANCELACIÓN: ${reason}`;
      }
      await manager.save(ticket);

      // Create Log
      const log = manager.create(TicketLog, {
        ticketId,
        userId,
        action: 'status_cancelled',
        oldValue: oldStatus,
        newValue: 'cancelled',
        comment: reason,
      });
      await manager.save(log);

      // Add Chat Message
      const chat = manager.create(TicketChat, {
        ticketId,
        senderId: userId,
        message: `*** Ticket ANULADO. Motivo: ${reason || 'Sin especificar'}`,
        senderName: 'Sistema',
      });
      const savedChat = await manager.save(chat);
      await manager.update(Ticket, ticketId, {
        lastChatMessage: savedChat.message,
        lastChatMessageTimestamp: savedChat.createdAt || new Date(),
        lastChatSenderId: userId,
      });

      // Recalculate affected wallets
      const details = await manager.find(TicketDetail, { where: { ticketId } });
      for (const d of details) {
        if (d.walletId) await this.internalRecalculate(manager, d.walletId);
      }

      // Notify
      await this.sendTicketNotification(
        ticketId,
        userId,
        `ANULÓ el ticket: "${ticket.description || 'Sin descripción'}". ${reason ? `Motivo: ${reason}` : ''}`,
        undefined,
        manager
      );

      return ticket;
    });
  }

  async cancelPublic(shortId: string, reason?: string) {
    const t = await this.findByShortId(shortId);
    
    return await this.dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, { where: { ticketId: t.ticketId } });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');
      
      if (ticket.status === 'cancelled') return ticket;
      if (ticket.status !== 'pending') throw new Error('Solo se pueden cancelar tickets pendientes');

      const oldStatus = ticket.status;
      ticket.status = 'cancelled';
      await manager.save(ticket);

      const log = manager.create(TicketLog, {
        ticketId: ticket.ticketId,
        userId: ticket.ownerId,
        action: 'status_cancelled',
        oldValue: oldStatus,
        newValue: 'cancelled',
        comment: `Cancelado vía Web. Motivo: ${reason || 'Sin especificar'}`,
      });
      await manager.save(log);

      const chat = manager.create(TicketChat, {
        ticketId: ticket.ticketId,
        senderId: ticket.ownerId,
        message: `🚫 Ticket CANCELADO vía Web. ${reason ? `Motivo: ${reason}` : ''}`,
        senderName: 'Sistema',
      });
      const savedChat = await manager.save(chat);
      await manager.update(Ticket, ticket.ticketId, {
        lastChatMessage: savedChat.message,
        lastChatMessageTimestamp: savedChat.createdAt || new Date(),
        lastChatSenderId: ticket.ownerId,
      });

      // Recalculate affected wallets
      const details = await manager.find(TicketDetail, { where: { ticketId: ticket.ticketId } });
      for (const d of details) {
        if (d.walletId) await this.internalRecalculate(manager, d.walletId);
      }

      // Notify the owner that the ticket was cancelled via web
      await this.sendTicketNotification(
        ticket.ticketId,
        'public_guest',
        `Se canceló el ticket vía web: "${ticket.description || 'Sin descripción'}"${reason ? `. Motivo: ${reason}` : ''}`,
        'Invitado Web',
        manager
      );

      return ticket;
    });
  }

  async recalculateAllUserWallets(userId: string) {
    return await this.dataSource.transaction(async (manager) => {
      console.log(`[TicketsService] Recalculating all wallets for user ${userId} using DB function`);
      try {
        await manager.query(`SELECT sync_user_wallet_balances($1)`, [userId]);
        return { success: true };
      } catch (e) {
        console.error(`[recalculateAllUserWallets] Error for user ${userId}:`, e);
        return { success: false, error: e.message };
      }
    });
  }

  // RECURRING TICKETS METHODS
  async createRecurring(ownerId: string, data: any) {
    const nextDate = this.calculateNextDate(new Date(), data.frequency);
    const recurring = this.recurringRepo.create({
      ...data,
      ownerId,
      nextGenerationDate: nextDate,
      currentInstallment: 1, // First one is created manually in frontend or we consider it done
      lastGeneratedDate: new Date(),
    });
    return this.recurringRepo.save(recurring);
  }

  async getRecurringByUser(userId: string) {
    return this.recurringRepo.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' }
    });
  }

  async updateRecurring(id: string, userId: string, data: any) {
    const recurring = await this.recurringRepo.findOne({ where: { id, ownerId: userId } });
    if (!recurring) throw new NotFoundException('Recurring template not found');
    Object.assign(recurring, data);
    return this.recurringRepo.save(recurring);
  }

  async toggleRecurring(id: string, userId: string) {
    const recurring = await this.recurringRepo.findOne({ where: { id, ownerId: userId } });
    if (!recurring) throw new NotFoundException('Recurring template not found');
    recurring.isActive = !recurring.isActive;
    return this.recurringRepo.save(recurring);
  }

  async deleteRecurring(id: string, userId: string) {
    const recurring = await this.recurringRepo.findOne({ where: { id, ownerId: userId } });
    if (!recurring) throw new NotFoundException('Recurring template not found or access denied');
    await this.recurringRepo.remove(recurring);
    return { success: true, message: 'Recurring ticket deleted' };
  }

  @Cron('0 10 * * *') // Every day at 10 AM
  async handleCron() {
    console.log('[Cron] Checking recurring tickets...');
    const now = new Date();
    const pendings = await this.recurringRepo.find({
      where: { 
        isActive: true,
      }
    });

    for (const r of pendings) {
      if (isPast(new Date(r.nextGenerationDate)) && r.currentInstallment < r.totalInstallments) {
        await this.generateTicketFromRecurring(r);
      }
    }
  }

  private async generateTicketFromRecurring(r: RecurringTicket) {
    console.log(`[Recurring] Generating ticket for ${r.id} (Installment ${r.currentInstallment + 1}/${r.totalInstallments})`);
    
    await this.dataSource.transaction(async (manager) => {
      const nextInstallment = r.currentInstallment + 1;
      const installmentLabel = `(${nextInstallment}/${r.totalInstallments})`;
      
      const ticketData = {
        amount: r.amount,
        currency: r.currency,
        description: `${r.description} ${installmentLabel}`,
        walletId: r.walletId,
        categoryId: r.categoryId,
        rubro: r.rubro,
        helpToCollect: r.helpToCollect,
        paymentProcedure: r.paymentProcedure,
        privateNote: r.privateNote,
        comment: r.comment,
        type: r.type,
        dueDate: new Date(), // Today
        status: 'pending',
        toUser: r.participants && r.participants.length > 0 ? r.participants[0].userId : null,
        toWalletId: r.toWalletId,
        toRubro: r.toRubro,
      };

      // Create the ticket using existing logic (but within this transaction)
      // Note: We need to use a version of 'create' that uses the manager
      await this.internalCreateTicket(manager, r.ownerId, ticketData);

      // Update recurring state
      r.currentInstallment = nextInstallment;
      r.lastGeneratedDate = new Date();
      r.nextGenerationDate = this.calculateNextDate(r.nextGenerationDate, r.frequency);
      
      if (r.currentInstallment >= r.totalInstallments) {
        r.isActive = false;
      }
      
      await manager.save(r);
    });
  }

  private calculateNextDate(current: Date, frequency: string): Date {
    const d = new Date(current);
    switch (frequency) {
      case 'weekly': return addWeeks(d, 1);
      case 'biweekly': return addWeeks(d, 2);
      case 'monthly': return addMonths(d, 1);
      case 'bimonthly': return addMonths(d, 2);
      case 'semi-annually': return addMonths(d, 6);
      case 'yearly': return addYears(d, 1);
      default: return addMonths(d, 1);
    }
  }

  private async internalCreateTicket(manager: EntityManager, ownerId: string, data: any) {
    // 1. Crear el ticket único
    console.log(`[TicketsService.internalCreateTicket] Creating main ticket entity...`);
    const globalType = (data.type === 'income' || data.type === 'expense') ? 'ticket' : (data.type || 'ticket');
    
    const ticketParams = {
      ...data,
      ownerId,
      type: globalType,
      initialAmount: data.amount,
      amountPaid: data.status === 'completed' ? data.amount : 0,
      initialDueDate: data.dueDate,
    };
    // Ensure shortId exists
    if (!ticketParams.shortId) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let sid = '';
      for (let i = 0; i < 6; i++) {
        sid += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      ticketParams.shortId = sid;
    }

    const ticket = manager.create(Ticket, ticketParams);
    const savedTicket = await manager.save(ticket);
    console.log(`[TicketsService.internalCreateTicket] Ticket saved OK: id=${savedTicket.ticketId}`);

    // 2. Fetch members
    const walletMembers: string[] = [];
    if (data.walletId) {
      console.log(`[TicketsService.internalCreateTicket] Fetching members for wallet ${data.walletId}...`);
      try {
        const members = await manager.query(
          'SELECT user_id FROM wallet_members WHERE wallet_id = $1 AND deleted_at IS NULL',
          [data.walletId]
        );
        for (const m of members) {
          walletMembers.push(m.user_id);
        }
      } catch (qErr) {
        console.error(`[TicketsService.internalCreateTicket] Member query failed:`, qErr.message);
      }
    }

    // 3. Set participants
    const allParticipants = new Set(walletMembers);
    allParticipants.add(ownerId);
    if (data.toUser) {
      allParticipants.add(data.toUser);
    }

    console.log(`[TicketsService.internalCreateTicket] Creating details for participants:`, Array.from(allParticipants));

    // 4. Create TicketDetails
    for (const userId of allParticipants) {
      const isOwner = userId === ownerId;
      const isReceiver = userId === data.toUser;
      const isWalletMember = walletMembers.includes(userId);
      
      let userType = data.subType || data.type;
      if (isReceiver && !isWalletMember) {
        userType = userType === 'income' ? 'expense' : 'income';
      }

      let userWalletId = isWalletMember ? data.walletId : (isReceiver ? data.toWalletId : null);

      if (!userWalletId) {
        const targetType = userType === 'income' ? 'mycollects' : 'mypays';
        const targetCurrency = savedTicket.currency || 'USD';
        
        let systemWallet = await manager.findOne(Wallet, {
          where: { ownerId: userId, type: targetType as any, currency: targetCurrency }
        });
        
        if (!systemWallet) {
          const targetName = userType === 'income' ? SYSTEM_WALLET_NAME : SYSTEM_EXPENSES_WALLET_NAME;
          const newWallet = await this.walletsService.create(
            userId,
            targetName,
            targetType as any,
            targetCurrency,
            undefined,
            false,
            0,
            0,
            undefined,
            true,
            manager
          );
          userWalletId = newWallet.walletId;
        } else {
          userWalletId = systemWallet.walletId;
        }
      }

      const role = isOwner ? 'owner_id' : (isReceiver ? 'user_id' : 'member');

      console.log(`[TicketsService.internalCreateTicket] Creating detail for user=${userId} role=${role} wallet=${userWalletId}...`);
      try {
        const detail = manager.create(TicketDetail, {
          ticketId: savedTicket.ticketId,
          userId,
          walletId: userWalletId,
          role,
          type: userType,
          rubro: isOwner ? (data.type === 'income' ? data.rubroIncome : data.rubroExpense) : (isReceiver ? data.toRubro : null),
          description: data.description || null,
          privateNote: isOwner ? (data.privateNote || null) : null,
        });
        await manager.save(detail);

        if (userWalletId) {
          await this.internalRecalculate(manager, userWalletId);
        }
      } catch (dErr) {
        console.error(`[TicketsService.internalCreateTicket] Failed to save detail for user=${userId}:`, dErr.message);
        throw dErr; 
      }
    }

    // 5. Create log entry
    const log = manager.create(TicketLog, {
      ticketId: savedTicket.ticketId,
      userId: ownerId,
      action: 'created',
      oldValue: undefined,
      newValue: savedTicket.amount.toString(),
    });
    await manager.save(log);

    // 6. Recalculate
    if (data.walletId) {
      console.log(`[TicketsService.internalCreateTicket] Recalculating wallet ${data.walletId}...`);
      await this.internalRecalculate(manager, data.walletId);
    }

    // 8. AI Predictions
    if (savedTicket.description) {
      // Predict for owner if missing
      const ownerRubro = data.type === 'income' ? data.rubroIncome : data.rubroExpense;
      if (!ownerRubro) {
        this.triggerAsyncAIPrediction(savedTicket.ticketId, ownerId, savedTicket.description, data.type);
      }

      // Predict for recipient if exists and missing
      if (data.toUser && !data.toRubro) {
        const recipientType = (data.type === 'income') ? 'expense' : 'income';
        this.triggerAsyncAIPrediction(savedTicket.ticketId, data.toUser, savedTicket.description, recipientType);
      }
    }

    // 9. Notify Participants
    try {
      const owner = await manager.findOne(User, { where: { userId: ownerId } });
      const ownerName = owner?.displayName || ownerId;
      const amountStr = `${savedTicket.currency} ${Number(savedTicket.amount).toLocaleString('es-AR')}`;
      const concept = savedTicket.description || 'Sin concepto';
      // Mensaje detallado como pidió el usuario: nuevo ticket, moneda, importe y detalle
      const baseUrl = this.configService.get<string>('WEB_SHARE_URL') || 'http://localhost:5173';
      const publicLink = savedTicket.shortId ? `\nLink: ${baseUrl}/t/${savedTicket.shortId}` : '';
      
      // Notificar SOLO al destinatario principal (si existe y no es el sender)
      if (data.toUser && data.toUser !== ownerId) {
        const pmSuffix = (savedTicket.status === 'completed' && savedTicket.paymentMethod) ? ` (${savedTicket.paymentMethod})` : '';
        const notificationContent = `Nuevo Ticket de ${ownerName}: ${concept} por ${amountStr}${pmSuffix}.${publicLink}`;
        
        console.log(`[internalCreateTicket] Notifying primary recipient ${data.toUser}`);
        await this.notificationsService.sendNotification(data.toUser, notificationContent, 'peIApp');
      }
    } catch (notifErr) {
      console.error(`[internalCreateTicket] Notification failed:`, notifErr.message);
    }

    return savedTicket;
  }

  /**
   * Proceso asincrónico para determinar el rubro de un participante mediante IA
   */
  private async triggerAsyncAIPrediction(ticketId: string, userId: string, description: string, type: any) {
    console.log(`[TicketsService.triggerAsyncAIPrediction] START - ticket=${ticketId}, user=${userId}, type=${type}`);
    try {
      if (!description) return;

      // 1. Llamar a la IA
      const predictedRubro = await this.aiService.predictRubro(description, type);
      
      if (predictedRubro) {
        console.log(`[TicketsService.triggerAsyncAIPrediction] AI predicted rubro: ${predictedRubro} for user ${userId}. Updating TicketDetail...`);
        
        // 2. Actualizar el TicketDetail si no tiene uno ya asignado
        await this.ticketDetailRepo.update(
          { ticketId, userId },
          { rubro: predictedRubro }
        );
        console.log(`[TicketsService.triggerAsyncAIPrediction] TicketDetail updated successfully.`);
      }
    } catch (err) {
      console.error(`[TicketsService.triggerAsyncAIPrediction] Error:`, err.message);
    }
  }

  async getFinancialSummary(userId: string) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 8); // +1 to +7 full days

    // Obtenemos todos los tickets pendientes del usuario
    const allPendingDetails = await this.ticketDetailRepo.createQueryBuilder('detail')
      .leftJoinAndSelect('detail.ticket', 'ticket')
      .where('detail.userId = :userId', { userId })
      .andWhere('ticket.status = :status', { status: 'pending' })
      .getMany();

    const summary = {
      overdue: { incomes: 0, expenses: 0, count: 0 },
      today: { incomes: 0, expenses: 0, count: 0 },
      next7Days: { incomes: 0, expenses: 0, count: 0 },
    };

    for (const detail of allPendingDetails) {
      const ticket = detail.ticket;
      const dueDate = new Date(ticket.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const remainingAmount = Number(ticket.amount) - (Number(ticket.amountPaid) || 0);
      if (remainingAmount <= 0) continue;

      if (dueDate < today) {
        if (detail.type === 'income') summary.overdue.incomes += remainingAmount;
        else summary.overdue.expenses += remainingAmount;
        summary.overdue.count++;
      } else if (dueDate.getTime() === today.getTime()) {
        if (detail.type === 'income') summary.today.incomes += remainingAmount;
        else summary.today.expenses += remainingAmount;
        summary.today.count++;
      } else if (dueDate >= tomorrow && dueDate < nextWeek) {
        if (detail.type === 'income') summary.next7Days.incomes += remainingAmount;
        else summary.next7Days.expenses += remainingAmount;
        summary.next7Days.count++;
      }
    }

    return summary;
  }

  async findPaymentLogsByUser(userId: string) {
    // We want logs where the user is a participant in the ticket
    // And the action is payment related
    const logs = await this.logRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.ticket', 'ticket')
      .leftJoinAndSelect('log.user', 'logUser')
      .innerJoinAndSelect(TicketDetail, 'td', 'td.ticket_id = log.ticketId AND td.user_id = :userId', { userId })
      .leftJoinAndSelect('td.wallet', 'userWallet')
      .where('log.action IN (:...actions)', { 
        actions: ['payment_received', 'paid'] 
      })
      .orderBy('log.createdAt', 'DESC')
      .getRawAndEntities();

    // getRawAndEntities returns both entities and raw columns (useful for the td join)
    return logs.entities.map((log, index) => {
      const raw = logs.raw[index];
      
      // Extract wallet from raw columns (TypeORM prefixes them)
      const walletId = raw.userWallet_wallet_id || raw.userWallet_walletId;
      const userWallet = walletId ? {
        id: walletId,
        name: raw.userWallet_name,
        currency: raw.userWallet_currency,
        balance: raw.userWallet_balance
      } : null;

      // Calculate the specific payment amount from newValue - oldValue
      const amt = Number(log.newValue) - (Number(log.oldValue) || 0);

      return {
        ...log,
        direction: raw.td_type, // 'income' or 'expense'
        userWallet,
        amount: amt,
        currency: log.ticket?.currency
      };
    });
  }
}


