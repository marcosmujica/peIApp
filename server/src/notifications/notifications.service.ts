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
    this.logger.log(`Attempting to notify user ${userId}...`);
    
    try {
      const user = await this.usersService.findById(userId);
      const pushToken = user?.notificationId;

      // SI TIENE TOKEN VALIDO -> EXPO
      if (pushToken && pushToken.includes('ExponentPushToken')) {
        this.logger.log(`Using Expo Push for ${userId}`);
        const response = await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
          },
          body: JSON.stringify({
            to: pushToken,
            title: title,
            body: content,
            sound: 'default',
            data: { userId, content, ...data },
          }),
        });

        if (response.ok) {
          this.logger.log(`Push notification SENT to ${userId} via Expo`);
          return true;
        }
        this.logger.warn(`Expo Push failed for ${userId}, falling back to SMS...`);
      }

      // SI NO TIENE TOKEN O FALLO EXPO -> SMS
      this.logger.log(`Using SMS for ${userId}`);
      const smsUrl = (this.configService.get<string>('NOTIFICATION_SERVER_URL') || 'http://localhost:4000/send').replace('/send', '/send-sms');
      
      const response = await fetch(smsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: userId.startsWith('+') ? userId : `+${userId}`, content: `${title}: ${content}` })
      });

      if (response.ok) {
        this.logger.log(`SMS notification SENT to ${userId}`);
        return true;
      }

      this.logger.error(`ALL notification channels FAILED for ${userId}`);
      return false;

    } catch (err) {
      this.logger.error(`FATAL ERROR in sendNotification for ${userId}: ${err.message}`);
      return false;
    }
  }
}
