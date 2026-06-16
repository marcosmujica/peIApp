import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // Ensure cron is enabled for this standalone process
  process.env.ENABLE_CRON = 'true';

  // Create a standalone application context
  // This will initialize the AppModule and all its providers (including CronService with its scheduled tasks)
  // but it won't start a HTTP server.
  const app = await NestFactory.createApplicationContext(AppModule);

  const logger = new Logger('CronStandalone');
  logger.log('PeIApp Standalone Cron Process is now running...');

  // This process will stay alive because of the @Cron decorators in our services.
  // NestJS ScheduleModule uses setInterval internally which keeps the event loop active.
}

bootstrap().catch(err => {
  console.error('Failed to start Standalone Cron Process:', err);
  process.exit(1);
});
