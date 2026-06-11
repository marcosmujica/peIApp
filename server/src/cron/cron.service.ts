import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, In, MoreThanOrEqual } from 'typeorm';
import { UsersService } from '../users/users.service';
import { TicketsService } from '../tickets/tickets.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketDetail } from '../tickets/entities/ticket-detail.entity';
import { TicketLog } from '../tickets/entities/ticket-log.entity';
import { TicketChat } from '../tickets/entities/ticket-chat.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private readonly logFilePath = path.join(process.cwd(), 'logs', 'daily_reports.log');

  constructor(
    private usersService: UsersService,
    private ticketsService: TicketsService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
    @InjectRepository(Ticket)
    private ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketDetail)
    private detailRepo: Repository<TicketDetail>,
    @InjectRepository(TicketLog)
    private logRepo: Repository<TicketLog>,
    @InjectRepository(TicketChat)
    private chatRepo: Repository<TicketChat>,
  ) {
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private writeToLog(message: string) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logFilePath, formattedMessage);
  }

  @Cron('0 * * * *') // Every hour on the dot
  async handleDailyReportsCron() {
    if (process.env.ENABLE_CRON !== 'true') {
      return;
    }
    this.writeToLog('--- INICIANDO CRON DE REPORTES DIARIOS ---');
    this.logger.log('Running daily reports cron...');
    const now = new Date();
    // Format: HH:00
    const currentHour = `${now.getHours().toString().padStart(2, '0')}:00`;
    
    await this.processReportsForHour(currentHour);
    this.writeToLog('--- FIN DE CRON DE REPORTES DIARIOS ---');
  }

  async processReportsForHour(hour: string) {
    this.writeToLog(`Procesando reportes para la hora: ${hour}`);
    this.logger.log(`Processing reports for hour: ${hour}`);
    
    const users = await this.usersService.findForDailyReport(hour);
    this.writeToLog(`Usuarios encontrados para esta hora: ${users.length}`);
    this.logger.log(`Found ${users.length} users for this hour.`);

    for (const user of users) {
      this.writeToLog(`Generando reporte para usuario: ${user.userId} (${user.displayName || 'Sin nombre'})`);
      try {
        const summary = await this.ticketsService.getFinancialSummary(user.userId);
        this.writeToLog(`Resumen obtenido: Overdue=${summary.overdue.count}, Today=${summary.today.count}, Next7=${summary.next7Days.count}`);
        
        // Build the message
        let message = `📊 Reporte PeiApp: `;
        
        const hasOverdue = summary.overdue.incomes > 0 || summary.overdue.expenses > 0;
        const hasToday = summary.today.incomes > 0 || summary.today.expenses > 0;
        const hasNext7 = summary.next7Days.incomes > 0 || summary.next7Days.expenses > 0;

        if (!hasOverdue && !hasToday && !hasNext7) {
          message += '¡Todo al día! No tienes pagos pendientes para hoy ni para la semana.';
        } else {
          if (hasOverdue) {
            message += `⚠️ ATRASADOS: Cobrar $${summary.overdue.incomes.toLocaleString('es-AR')} / Pagar $${summary.overdue.expenses.toLocaleString('es-AR')}. `;
          }
          if (hasToday) {
            message += `📅 HOY: Cobrar $${summary.today.incomes.toLocaleString('es-AR')} / Pagar $${summary.today.expenses.toLocaleString('es-AR')}. `;
          }
          if (hasNext7) {
            message += `📈 PRÓX. 7 DÍAS: Cobrar $${summary.next7Days.incomes.toLocaleString('es-AR')} / Pagar $${summary.next7Days.expenses.toLocaleString('es-AR')}.`;
          }
        }

        this.writeToLog(`Enviando notificación: ${message}`);
        await this.notificationsService.sendNotification(user.userId, message);
        this.writeToLog(`Reporte enviado con éxito a ${user.userId}`);
        this.logger.log(`Report sent to user ${user.userId}`);
      } catch (err) {
        this.writeToLog(`ERROR procesando usuario ${user.userId}: ${err.message}`);
        this.logger.error(`Error sending report to user ${user.userId}: ${err.message}`);
      }
    }
  }

  @Cron('0 10 * * *') // Every day at 10 AM
  async handlePaymentAgreementsCron() {
    if (process.env.ENABLE_CRON !== 'true') {
      return;
    }
    this.writeToLog('--- INICIANDO CRON DE ACUERDOS DE PAGO ---');
    this.logger.log('Running payment agreements cron...');

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Buscar tickets pendientes
    const pendingTickets = await this.ticketRepo.find({
      where: { status: 'pending' },
    });

    for (const ticket of pendingTickets) {
      try {
        const dueDate = new Date(ticket.dueDate);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let alertWeight: 'low' | 'medium' | 'high' | 'critical' | null = null;
        let messageTitle = '';
        let messageBody = '';

        if (diffDays === 1) {
          alertWeight = 'medium';
          messageTitle = '🔔 Recordatorio de Pago (Próximo)';
          messageBody = `Mañana vence el ticket "${ticket.description || 'Sin descripción'}".`;
        } else if (diffDays === 0) {
          alertWeight = 'high';
          messageTitle = '📢 ¡Día de Pago! (Hoy)';
          messageBody = `Hoy vence el ticket "${ticket.description || 'Sin descripción'}". Por favor, realiza el pago a la brevedad.`;
        } else if (diffDays === -2) {
          alertWeight = 'critical';
          messageTitle = '⚠️ ¡PAGO ATRASADO! (2 días)';
          messageBody = `El ticket "${ticket.description || 'Sin descripción'}" venció hace 2 días. Es importante regularizar tu situación hoy mismo.`;
        }

        if (alertWeight) {
          // Buscar al destinatario (participante que no es el dueño)
          const participants = await this.detailRepo.find({ where: { ticketId: ticket.ticketId } });
          const targetDetail = participants.find(p => p.userId !== ticket.ownerId);

          if (targetDetail) {
            const baseUrl = this.configService.get<string>('WEB_SHARE_URL') || 'http://localhost:5173';
            const publicLink = ticket.shortId ? `\nLink para ver/editar: ${baseUrl}/t/${ticket.shortId}` : '';
            
            const fullMessage = `${messageTitle}\n${messageBody}${publicLink}`;

            // 1. Enviar notificación
            await this.notificationsService.sendNotification(targetDetail.userId, fullMessage, 'Acuerdo de Pago');

            // 2. Registrar en Chat
            const chatEntry = this.chatRepo.create({
              ticketId: ticket.ticketId,
              senderId: ticket.ownerId,
              senderName: 'Sistema',
              message: `*** Recordatorio enviado al destinatario: ${messageTitle}\n${messageBody}`,
            });
            await this.chatRepo.save(chatEntry);

            // 3. Registrar en Log
            const logEntry = this.logRepo.create({
              ticketId: ticket.ticketId,
              userId: ticket.ownerId,
              action: 'payment_agreement_sent',
              newValue: alertWeight,
              comment: messageTitle,
            });
            await this.logRepo.save(logEntry);

            this.writeToLog(`Alerta enviada para ticket ${ticket.ticketId} (Diff: ${diffDays} días) a usuario ${targetDetail.userId}`);
          }
        }
      } catch (err) {
        this.writeToLog(`ERROR procesando ticket ${ticket.ticketId}: ${err.message}`);
        this.logger.error(`Error processing payment agreement for ticket ${ticket.ticketId}: ${err.message}`);
      }
    }

    this.writeToLog('--- FIN DE CRON DE ACUERDOS DE PAGO ---');
  }

  @Cron('0 10 * * *') // Every day at 10 AM
  async handleInactiveUsersCron() {
    if (process.env.ENABLE_CRON !== 'true') return;
    this.writeToLog('--- INICIANDO CRON DE USUARIOS INACTIVOS ---');
    this.logger.log('Running inactive users cron...');

    const now = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const users = await this.usersService.findAllActiveUsers();
    
    for (const user of users) {
      try {
        // Buscar si el usuario tiene algún ticket como owner creado en los últimos 3 días
        const recentTicketsCount = await this.ticketRepo.count({
          where: {
            ownerId: user.userId,
            createdAt: MoreThanOrEqual(threeDaysAgo)
          }
        });

        // Si no tiene ningún ticket nuevo en 3 días, enviar motivación
        if (recentTicketsCount === 0) {
          const message = `🌟 ¡Te extrañamos, ${user.displayName || 'emprendedor'}! Mantener al día tus ingresos y gastos es clave para tener el control de tus finanzas. Anímate a registrar tus movimientos y descubre el poder de una buena gestión. 💪📈`;
          
          await this.notificationsService.sendNotification(user.userId, message, 'Consejo peIApp');
          this.writeToLog(`Notificación de inactividad enviada a ${user.userId}`);
        }
      } catch (err) {
        this.writeToLog(`ERROR al revisar inactividad para el usuario ${user.userId}: ${err.message}`);
        this.logger.error(`Error checking inactivity for ${user.userId}: ${err.message}`);
      }
    }
    this.writeToLog('--- FIN DE CRON DE USUARIOS INACTIVOS ---');
  }
}
