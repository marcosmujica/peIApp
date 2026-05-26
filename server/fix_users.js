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
    console.log('Adding missing columns to users...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT \'light\'');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS default_wallet_id UUID');
    console.log('Columns added successfully to users table');
  } catch (err) {
    console.error('Error adding columns to users table:', err);
  } finally {
    await client.end();
  }
}
run();
