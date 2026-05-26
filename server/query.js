const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

async function query() {
  await client.connect();
  const res = await client.query('SELECT * FROM helpdesk;');
  console.log('ROWS:', res.rows);
  await client.end();
}

query();
