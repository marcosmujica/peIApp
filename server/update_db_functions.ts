import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: false,
});

async function run() {
  await dataSource.initialize();
  const res = await dataSource.query(`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'sync_wallet_balance';`);
  console.log('SYNC_WALLET_BALANCE:');
  console.log(res);

  const res2 = await dataSource.query(`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'sync_user_wallet_balances';`);
  console.log('\nSYNC_USER_WALLET_BALANCES:');
  console.log(res2);
  
  await dataSource.query(`
    CREATE OR REPLACE FUNCTION sync_wallet_balance(p_wallet_id UUID) RETURNS VOID AS $$
    DECLARE
      v_balance NUMERIC := 0;
    BEGIN
      SELECT 
        COALESCE(SUM(CASE WHEN d.type = 'income' THEN t.amount ELSE -t.amount END), 0)
      INTO v_balance
      FROM ticket_details d
      JOIN tickets t ON d.ticket_id = t.ticket_id
      WHERE d.wallet_id = p_wallet_id AND t.deleted_at IS NULL;

      UPDATE wallets
      SET balance = v_balance
      WHERE wallet_id = p_wallet_id;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log('Wallet db balance function updated without totalizer columns!');

  await dataSource.query(`
    CREATE OR REPLACE FUNCTION sync_user_wallet_balances(p_user_id VARCHAR) RETURNS VOID AS $$
    BEGIN
      WITH updated_balances AS (
        SELECT 
          d.wallet_id,
          COALESCE(SUM(CASE WHEN d.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS new_balance
        FROM ticket_details d
        JOIN tickets t ON d.ticket_id = t.ticket_id
        JOIN wallets w ON w.wallet_id = d.wallet_id
        WHERE w.owner_id = p_user_id AND t.deleted_at IS NULL AND w.deleted_at IS NULL
        GROUP BY d.wallet_id
      )
      UPDATE wallets w
      SET balance = ub.new_balance, updated_at = NOW()
      FROM updated_balances ub
      WHERE w.wallet_id = ub.wallet_id;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log('User wallets balance function sync_user_wallet_balances updated!');
  await dataSource.destroy();
}

run().catch(console.error);
