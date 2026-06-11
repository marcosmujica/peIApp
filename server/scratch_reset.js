const { Client } = require('pg');

const client = new Client({
  host: 'db.peiapp.tech',
  port: 5432,
  database: 'peiapp_dev',
  user: 'db_user_peiapp_dev',
  password: 'Z7mQ4vK9T2rX8pL5nW3s'
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  const res = await client.query(
    `UPDATE tickets SET status = 'pending', amount_paid = 0 WHERE short_id = 'V9qCqu' RETURNING *`
  );
  console.log('Updated ticket status successfully:', res.rows[0].status);
  await client.end();
}

run().catch(console.error);
