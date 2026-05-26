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
      SELECT user_id, role, type, rubro
      FROM ticket_details
      WHERE ticket_id = '415aaafc-684d-45ef-bc1a-c3d9cd8744f7'
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkDB();
