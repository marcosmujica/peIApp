const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

async function run() {
  await client.connect();
  try {
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ticket_details'");
    console.log('Columns in ticket_details:', res.rows.map(r => r.column_name));
    
    const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets'");
    console.log('Columns in tickets:', res2.rows.map(r => r.column_name));

    const res3 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Columns in users:', res3.rows.map(r => r.column_name));

    const res4 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'wallets'");
    console.log('Columns in wallets:', res4.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error checking columns:', err);
  } finally {
    await client.end();
  }
}
run();
