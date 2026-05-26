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
  
  // 1. Ver qué billeteras tienen ese saldo de 4000
  const wallets = await ds.query("SELECT wallet_id, name, balance, total_incomes, total_expenses FROM wallets WHERE balance = 4000 OR balance = -4000");
  console.log('WALLETS WITH 4000 BALANCE:', wallets);

  if (wallets.length > 0) {
    const walletId = wallets[0].wallet_id;
    console.log(`\nInspecting wallet: ${wallets[0].name} (${walletId})`);

    // 2. Ver qué tickets están asociados a esa billetera en ticket_details
    const details = await ds.query("SELECT * FROM ticket_details WHERE wallet_id = $1", [walletId]);
    console.log('\nTICKET DETAILS FOR THIS WALLET:', details);

    // 3. Ver los tickets reales
    const ticketIds = details.map((d: any) => d.ticket_id);
    if (ticketIds.length > 0) {
        const tickets = await ds.query("SELECT ticket_id, amount, amount_paid, status, type, deleted_at FROM tickets WHERE ticket_id = ANY($1)", [ticketIds]);
        console.log('\nTICKETS FOR THIS WALLET:', tickets);
    }

    // 4. Ver qué devuelve la vista exactamente para esta billetera
    const viewData = await ds.query("SELECT * FROM wallet_balances_view WHERE wallet_id = $1", [walletId]);
    console.log('\nVIEW DATA FOR THIS WALLET:', viewData);
  }

  await ds.destroy();
}

run().catch(console.error);
