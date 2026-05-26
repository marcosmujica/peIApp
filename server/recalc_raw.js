const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function run() {
  await client.connect();
  console.log("Connected to PG");

  const res = await client.query("SELECT wallet_id, owner_id, name FROM wallets");
  console.log(`Found ${res.rows.length} total wallets`);

  for (const row of res.rows) {
    const { wallet_id, owner_id, name } = row;
    const isSystemWallet = name.toLowerCase().trim() === 'tickets sin billetera';
    
    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN d.type = 'income' THEN t.amount ELSE 0 END), 0) as incomes,
        COALESCE(SUM(CASE WHEN d.type = 'expense' THEN t.amount ELSE 0 END), 0) as expenses,
        COALESCE(SUM(CASE WHEN d.type = 'income' AND t.status = 'pending' THEN t.amount ELSE 0 END), 0) as pending_incomes,
        COALESCE(SUM(CASE WHEN d.type = 'expense' AND t.status = 'pending' THEN t.amount ELSE 0 END), 0) as pending_expenses
      FROM ticket_details d
      JOIN tickets t ON t.ticket_id = d.ticket_id
      WHERE (d.wallet_id = $1)
    `;
    let params = [wallet_id];

    if (isSystemWallet) {
      query += ` OR (d.wallet_id IS NULL AND d.user_id = $2)`;
      params.push(owner_id);
    }

    const calc = await client.query(query, params);

    const { incomes, expenses, pending_incomes, pending_expenses } = calc.rows[0];
    const totalIncomes = Number(incomes || 0);
    const totalExpenses = Number(expenses || 0);
    const pendIncomes = Number(pending_incomes || 0);
    const pendExpenses = Number(pending_expenses || 0);
    const balance = totalIncomes - totalExpenses;

    await client.query(`
      UPDATE wallets 
      SET total_incomes = $1, total_expenses = $2, pending_incomes = $3, pending_expenses = $4, balance = $5
      WHERE wallet_id = $6
    `, [totalIncomes, totalExpenses, pendIncomes, pendExpenses, balance, wallet_id]);

    console.log(`Updated: ${name} (${wallet_id}) - Balance: ${balance}`);
  }

  await client.end();
  console.log("Full recalculation completed");
}

run().catch(console.error);
