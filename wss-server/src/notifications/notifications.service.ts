import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}

  async sendNotification(userId: string, content: string, title: string = 'peIApp', data: any = {}) {
    this.logger.log(`Attempting to notify user ${userId} via standalone notification-service...`);
    
    try {
      const url = this.configService.get<string>('NOTIFICATION_SERVER_URL') || 'http://localhost:4000/send';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content, title, data })
      });

      if (response.ok) {
        this.logger.log(`Notification sent request successful for ${userId}`);
        return true;
      }
      
      const responseText = await response.text();
      this.logger.error(`Notification server returned status ${response.status} for ${userId}. Response: ${responseText}`);
      return false;

    } catch (err) {
      this.logger.error(`FATAL ERROR in sendNotification for ${userId}: ${err.message}`);
      return false;
    }
  }
}

export function ensureE164Phone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d]/g, '');
  const countryCodes = [
    '598', '54', '55', '56', '57', '58', '51', '52', '595', '591', '593',
    '506', '503', '502', '509', '504', '505', '507', '1'
  ];
  for (const cc of countryCodes) {
    if (cleaned.startsWith(cc) && cleaned.length >= 10) {
      return cleaned;
    }
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return '598' + cleaned;
}
