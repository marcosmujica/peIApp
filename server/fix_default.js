const { Client } = require('pg');

async function fixDefault() {
  const client = new Client({
    host: 'db.peiapp.tech',
    port: 5432,
    database: 'peiapp_dev',
    user: 'db_user_peiapp_dev',
    password: 'Z7mQ4vK9T2rX8pL5nW3s',
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();
  console.log('Connected to DB');

  try {
    await client.query('ALTER TABLE users ALTER COLUMN user_id SET DEFAULT gen_random_uuid();');
    console.log('Fixed users user_id default!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixDefault();
