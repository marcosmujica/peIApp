
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  try {
    const res = await dataSource.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('ticket_details', 'wallets', 'tickets') 
      AND (column_name LIKE '%wallet_id%' OR column_name LIKE '%ticket_id%' OR column_name LIKE '%user_id%')
    `);
    console.table(res);
  } catch (err) {
    console.error(err);
  } finally {
    await app.close();
  }
}
bootstrap();
