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
  const res = await ds.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'wallets'");
  console.log('WALLETS_COLUMNS:');
  console.log(res.map((r: any) => r.column_name));
  await ds.destroy();
}

run().catch(console.error);
