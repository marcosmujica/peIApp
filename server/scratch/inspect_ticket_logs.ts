import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: false,
});

async function run() {
  await ds.initialize();
  const res = await ds.query("SELECT * FROM ticket_logs WHERE ticket_id = 'c3b3a5ec-9b27-4f60-8160-126c80ec41b3' ORDER BY created_at ASC");
  console.log('TICKET LOGS:');
  console.log(res);
  await ds.destroy();
}

run().catch(console.error);
