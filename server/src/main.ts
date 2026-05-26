import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { Logger } from 'nestjs-pino';

import { json, urlencoded } from 'express';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
    app.useLogger(app.get(Logger));
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.use((req, res, next) => {
      if (req.method === 'POST' && req.url.includes('/avatar')) {
        console.log(`[Request Inspect] Method: ${req.method}, URL: ${req.url}, Content-Length: ${req.headers['content-length']}`);
      }
      next();
    });
    app.use(json({ limit: '100mb' }));
    app.use(urlencoded({ limit: '100mb', extended: true }));
    app.useStaticAssets(join(process.cwd(), 'public'));
    await app.listen(process.env.PORT ?? 3000);
    console.log(`[Server] Is running on port ${process.env.PORT ?? 3000}`);
  } catch (err) {
    console.error('[Bootstrap ERROR]', err);
    process.exit(1);
  }
}
bootstrap();
// Triggering reload to apply balance fix (duplicate removal) - 2026-05-09 10:51
