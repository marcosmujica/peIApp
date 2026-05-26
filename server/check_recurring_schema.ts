
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  try {
    console.log('--- RECURRING_TICKETS COLUMNS ---');
    const columns = await dataSource.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recurring_tickets'
    `);
    console.log(JSON.stringify(columns, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await app.close();
  }
}
bootstrap();
