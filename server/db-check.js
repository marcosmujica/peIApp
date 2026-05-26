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
    const res = await client.query('SELECT user_id, last_access FROM users LIMIT 5;');
    console.log('Users:', res.rows);
  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await client.end();
  }
}

run();
