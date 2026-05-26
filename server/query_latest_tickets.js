const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function checkDB() {
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
      SELECT t.ticket_id, t.description, td.user_id, td.role, td.type, td.rubro
      FROM tickets t
      JOIN ticket_details td ON t.ticket_id = td.ticket_id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkDB();
