const { Client } = require('pg');
require('dotenv').config({ path: '../server/.env' });

async function queryLogs() {
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
      SELECT log_id, ticket_id, user_id, action, old_value, new_value, comment, created_at
      FROM ticket_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

queryLogs();
