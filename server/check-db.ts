
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  try {
    console.log('--- EXTENSIONS ---');
    const extensions = await dataSource.query('SELECT extname FROM pg_extension');
    console.log(extensions);
    
    console.log('--- FUNCTIONS ---');
    const functions = await dataSource.query("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%ia%'");
    console.log(functions);
    
  } catch (err) {
    console.error(err);
  } finally {
    await app.close();
  }
}
bootstrap();
