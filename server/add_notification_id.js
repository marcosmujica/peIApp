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
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_id VARCHAR(255)');
    console.log('Column notification_id added successfully');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await client.end();
  }
}
run();
