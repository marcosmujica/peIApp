
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  try {
    console.log('--- ADDING MISSING COLUMNS TO RECURRING_TICKETS ---');
    
    await dataSource.query(`
      ALTER TABLE recurring_tickets 
      ADD COLUMN IF NOT EXISTS to_wallet_id character varying,
      ADD COLUMN IF NOT EXISTS to_rubro character varying
    `);
    
    console.log('Columns added successfully.');
    
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    await app.close();
  }
}
bootstrap();
