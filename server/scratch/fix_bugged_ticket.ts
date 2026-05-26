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
  
  const ticketId = 'c3b3a5ec-9b27-4f60-8160-126c80ec41b3';
  const walletId = '9bbb958f-f4de-4744-a00d-e1165c3666b5';

  console.log(`Fixing ticket ${ticketId}...`);
  await ds.query("UPDATE tickets SET amount_paid = amount WHERE ticket_id = $1", [ticketId]);
  
  console.log(`Recalculating wallet ${walletId}...`);
  await ds.query("SELECT sync_wallet_balance($1)", [walletId]);

  console.log('Fix applied.');
  await ds.destroy();
}

run().catch(console.error);
