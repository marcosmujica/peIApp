import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

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
  console.log('Database initialized.');

  const sqlPath = path.join(__dirname, '..', 'create_wallet_balances_view.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('Applying SQL from create_wallet_balances_view.sql...');
  await ds.query(sql);
  console.log('SQL applied successfully.');

  // Optionally trigger a full recalculate for all wallets
  console.log('Recalculating all wallet balances...');
  await ds.query(`
    UPDATE wallets w
    SET
      balance          = v.balance,
      total_incomes    = v.total_incomes,
      total_expenses   = v.total_expenses,
      pending_incomes  = v.pending_incomes,
      pending_expenses = v.pending_expenses,
      updated_at       = NOW()
    FROM wallet_balances_view v
    WHERE w.wallet_id = v.wallet_id
  `);
  console.log('Full recalculation complete.');

  await ds.destroy();
}

run().catch(console.error);
