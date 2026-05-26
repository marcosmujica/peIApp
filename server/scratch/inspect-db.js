const { Client } = require('pg');
const client = new Client({
  host: 'db.peiapp.tech',
  port: 5432,
  user: 'db_user_peiapp_dev',
  password: 'Z7mQ4vK9T2rX8pL5nW3s',
  database: 'peiapp_dev',
});

async function run() {
  await client.connect();
  console.log('--- TABLES ---');
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log(res.rows.map(r => r.table_name).join(', '));

  console.log('\n--- COLUMNS for wallets ---');
  const colRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'wallets'
  `);
  colRes.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

  console.log('\n--- COLUMNS for tickets ---');
  const ticketColRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tickets'
  `);
  ticketColRes.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

  console.log('\n--- COLUMNS for wallet_members ---');
  const memberColRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'wallet_members'
  `);
  memberColRes.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

  await client.end();
}

run().catch(console.error);
