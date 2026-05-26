import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { TicketsModule } from './tickets/tickets.module';
import { AIModule } from './ai/ai.module';

import { HelpDeskModule } from './helpdesk/helpdesk.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
                translateTime: 'SYS:standard',
              },
            },
            {
              target: 'pino/file',
              options: { destination: '../logs/server.log' },
            },
          ],
        },
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST'),
        port: parseInt(config.get<string>('DATABASE_PORT') || '5432', 10),
        username: config.get<string>('DATABASE_USER'),
        password: String(config.get<string>('DATABASE_PASSWORD')),
        database: config.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: false, // Disabled after schema update
        logging: true,
      }),
    }),
    AuthModule,
    UsersModule,
    WalletsModule,
    TicketsModule,
    AIModule,
    HelpDeskModule,
    NotificationsModule,
    CronModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {} // Trigger reload for route registration check - 2026-05-08 13:32