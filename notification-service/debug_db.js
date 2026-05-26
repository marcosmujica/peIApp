const { Pool } = require('pg');

const mainDb = new Pool({
  host: 'db.peiapp.tech',
  port: 5432,
  database: 'peiapp_dev',
  user: 'db_user_peiapp_dev',
  password: 'Z7mQ4vK9T2rX8pL5nW3s',
});

async function test() {
  console.log('Testing connection to main DB...');
  try {
    const res = await mainDb.query('SELECT count(*) FROM users');
    console.log('Main DB Users count:', res.rows[0].count);
    await mainDb.end();
    console.log('Main DB connection closed.');
  } catch (err) {
    console.error('Main DB Error:', err.message);
  }
}

test();
