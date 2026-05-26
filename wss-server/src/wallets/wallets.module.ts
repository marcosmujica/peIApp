import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletMember } from './entities/wallet-member.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketDetail } from '../tickets/entities/ticket-detail.entity';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';

import { WalletDistributionList } from './entities/wallet-distribution-list.entity';
import { WalletGoal } from './entities/wallet-goal.entity';
import { WalletPanel } from './entities/wallet-panel.entity';
import { WalletCategory } from './entities/wallet-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletMember, WalletDistributionList, WalletGoal, WalletPanel, WalletCategory, User, Ticket, TicketDetail]),
    AuthModule,
    forwardRef(() => TicketsModule),
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
