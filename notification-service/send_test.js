require('dotenv').config();
const { Pool } = require('pg');

const mainDb = new Pool({
  host: process.env.MAIN_DB_HOST,
  port: process.env.MAIN_DB_PORT,
  database: process.env.MAIN_DB_NAME,
  user: process.env.MAIN_DB_USER,
  password: process.env.MAIN_DB_PASSWORD,
});

async function run() {
  const token = 'ExponentPushToken[0xlrXiA51a1B18ikOisieJ]';
  const result = await mainDb.query('SELECT user_id FROM users WHERE notification_id = $1', [token]);
  
  if (result.rows.length === 0) {
    console.log('No user found with that token.');
    process.exit(1);
  }

  const userId = result.rows[0].user_id;
  console.log(`Found user: ${userId}. Sending notification via localhost:4000...`);

  const res = await fetch('http://localhost:4000/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userId,
      title: 'Notificación de Prueba',
      content: 'Esta es una notificación de prueba enviada desde PeiApp.'
    })
  });

  const data = await res.json();
  console.log('Response:', data);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
