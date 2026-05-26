const { Client } = require('pg');

async function removeUnknownUser() {
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
    const res = await client.query(`UPDATE users SET display_name = NULL WHERE display_name = 'Unknown User';`);
    console.log(`Updated ${res.rowCount} users to remove 'Unknown User'`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

removeUnknownUser();
