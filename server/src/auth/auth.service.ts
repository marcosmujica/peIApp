import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { PhoneOtp } from './entities/phone-otp.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(PhoneOtp)
    private otpRepo: Repository<PhoneOtp>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async requestOtp(phoneNumber: string, country?: string, currency?: string): Promise<{ sent: boolean }> {
    const isMock = this.config.get<string>('OTP_MOCK') === 'true';
    const ttl = this.config.get<number>('OTP_TTL_MINUTES', 10);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    let user = await this.userRepo.findOne({ where: { phone: phoneNumber } });
    if (!user) {
      user = this.userRepo.create({ phone: phoneNumber });
    }
    if (country) user.country = country;
    if (currency) user.currency = currency;
    await this.userRepo.save(user);

    await this.otpRepo.save({ userId: user.userId, otpHash, expiresAt });

    if (isMock) {
      console.log(`[DEV OTP] ${phoneNumber} → ${code}`);
    } else {
      const notifUrl = this.config.get('NOTIFICATION_SERVER_URL', 'http://localhost:4000/send');
      const smsUrl = notifUrl.replace('/send', '/send-sms');

      try {
        const response = await fetch(smsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
            content: `Tu codigo de verificacion de peIApp es: ${code}`,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          console.error('[AUTH] SMS request to Notif Service failed', errData);
        } else {
          console.log(`[AUTH] SMS request sent to Notif Service for ${phoneNumber}`);
        }
      } catch (err) {
        console.error('[AUTH] Error calling Notification Service for SMS', err);
      }
    }

    return { sent: true };
  }

  async verifyOtp(
    phoneNumber: string,
    code: string,
  ): Promise<{ 
    access_token: string; 
    user: { 
        id: string; 
        phoneNumber: string; 
        needsOnboarding: boolean;
        displayName?: string;
        avatarUrl?: string;
        country?: string;
        currency?: string;
        pushEnabled?: boolean;
    } 
  }> {
    const isMock = this.config.get<string>('OTP_MOCK') === 'true';

    const user = await this.userRepo.findOne({ where: { phone: phoneNumber } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const otp = await this.otpRepo.findOne({
      where: { userId: user.userId, usedAt: undefined as any },
      order: { createdAt: 'DESC' },
    });

    if (!otp) throw new UnauthorizedException('OTP no encontrado');
    if (otp.expiresAt < new Date()) throw new UnauthorizedException('OTP vencido');

    const valid = await bcrypt.compare(code, otp.otpHash);
    if (!valid) throw new UnauthorizedException('Código incorrecto');

    otp.usedAt = new Date();
    await this.otpRepo.save(otp);

    const payload = { sub: user.userId };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      user: {
        id: user.userId,
        phoneNumber: user.phone,
        needsOnboarding: !user.displayName || user.displayName === 'Unknown User',
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        country: user.country,
        currency: user.currency,
        pushEnabled: user.pushEnabled
      },
    };
  }
}
