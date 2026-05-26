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
  console.log('Applying schema fixes...');
  
  try {
    await client.query('ALTER TABLE wallets ADD COLUMN IF NOT EXISTS include_in_general_balance BOOLEAN DEFAULT true');
    console.log('Added wallets.include_in_general_balance');
  } catch (e) { console.error('Error adding wallets.include_in_general_balance:', e.message); }

  try {
    await client.query('ALTER TABLE wallets ADD COLUMN IF NOT EXISTS ai_questions JSONB');
    console.log('Added wallets.ai_questions');
  } catch (e) { console.error('Error adding wallets.ai_questions:', e.message); }

  try {
    await client.query("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'ticket'");
    console.log('Added tickets.type');
  } catch (e) { console.error('Error adding tickets.type:', e.message); }

  await client.end();
}

run().catch(console.error);
