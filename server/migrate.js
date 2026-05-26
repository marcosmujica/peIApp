const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_access timestamptz NULL;');
    console.log('Column last_access added successfully');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await client.end();
  }
}

run();
