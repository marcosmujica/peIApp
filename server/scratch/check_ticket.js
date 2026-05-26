const { Client } = require('pg');
require('dotenv').config();

async function checkTicket() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    await client.connect();
    const res = await client.query("SELECT * FROM tickets WHERE short_id = 'xlVeKZ' OR short_id = 'xIVeKZ'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTicket();
