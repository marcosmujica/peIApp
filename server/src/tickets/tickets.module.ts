import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from './entities/ticket.entity';
import { TicketChat } from './entities/ticket-chat.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { TicketDetail } from './entities/ticket-detail.entity';
import { User } from '../users/entities/user.entity';
import { TicketLog } from './entities/ticket-log.entity';
import { RecurringTicket } from './entities/recurring-ticket.entity';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketChat, Wallet, TicketDetail, User, TicketLog, RecurringTicket]),
    AIModule
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

