const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function checkDB() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const users = await client.query("SELECT user_id, phone, display_name FROM users ORDER BY created_at DESC LIMIT 10");
  console.table(users.rows);

  await client.end();
}
checkDB();
