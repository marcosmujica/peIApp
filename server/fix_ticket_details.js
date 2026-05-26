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
    console.log('Adding missing columns to ticket_details...');
    await client.query('ALTER TABLE ticket_details ADD COLUMN IF NOT EXISTS description VARCHAR(255)');
    await client.query('ALTER TABLE ticket_details ADD COLUMN IF NOT EXISTS private_note TEXT');
    console.log('Columns added successfully');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    await client.end();
  }
}
run();
