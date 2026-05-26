const { Pool } = require('pg');

const notifDb = new Pool({
  host: 'db.peiapp.tech',
  port: 5432,
  database: 'peiapp_notifications',
  user: 'db_user_peiapp_dev',
  password: 'Z7mQ4vK9T2rX8pL5nW3s',
});

async function test() {
  console.log('Testing connection to notification DB...');
  try {
    const res = await notifDb.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
    console.log('Tables:', res.rows.map(r => r.tablename));
    await notifDb.end();
    console.log('Notif DB connection closed.');
  } catch (err) {
    console.error('Notif DB Error:', err.message);
  }
}

test();
