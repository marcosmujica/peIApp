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
  try {
    await client.connect();
    console.log('Connected to DB. Adding theme column to users...');
    const result = await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light';
    `);
    console.log('Column theme added successfully or already exists.');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await client.end();
  }
}

run();
