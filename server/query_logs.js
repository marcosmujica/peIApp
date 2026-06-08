const { Client } = require('pg');
require('dotenv').config();

async function queryRecentTickets() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: String(process.env.DATABASE_PASSWORD),
    database: process.env.DATABASE_NAME,
  });

  await client.connect();

  try {
    const res = await client.query(`
      SELECT ticket_id, description, status, amount, updated_at
      FROM tickets
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

queryRecentTickets();
