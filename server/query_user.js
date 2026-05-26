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

  const user = await client.query("SELECT user_id, phone, display_name FROM users WHERE user_id = 'f75942b6-c209-428e-a6df-375c5dd74839'");
  console.table(user.rows);

  await client.end();
}
checkDB();
