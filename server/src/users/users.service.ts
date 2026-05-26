import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { userId: id } });
  }

  async updateProfile(id: string, data: Partial<Pick<User, 'displayName' | 'avatarUrl' | 'country' | 'currency' | 'pushEnabled' | 'defaultPaymentProcedure' | 'gender' | 'age' | 'theme' | 'defaultWalletId' | 'notificationId' | 'preferredNotificationTime' | 'dailyReportsEnabled' | 'monthlyReportsEnabled' | 'transactionNotificationsEnabled' | 'lastAccess'>>) {
    await this.userRepo.update({ userId: id }, data);
    return this.findById(id);
  }

  async findAllActiveUsers(): Promise<User[]> {
    return this.userRepo.find();
  }

  async findForDailyReport(hour: string): Promise<User[]> {
    return this.userRepo.find({
      where: {
        dailyReportsEnabled: true,
        preferredNotificationTime: hour,
      },
    });
  }
}
