import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronService } from './cron.service';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CronController } from './cron.controller';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketDetail } from '../tickets/entities/ticket-detail.entity';
import { TicketLog } from '../tickets/entities/ticket-log.entity';
import { TicketChat } from '../tickets/entities/ticket-chat.entity';

@Module({
  imports: [
    UsersModule, 
    TicketsModule, 
    NotificationsModule,
    TypeOrmModule.forFeature([Ticket, TicketDetail, TicketLog, TicketChat])
  ],
  controllers: [CronController],
  providers: [CronService],
})
export class CronModule {}
