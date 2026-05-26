const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function checkDB() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log("--- LATEST TICKETS ---");
  const tickets = await client.query('SELECT ticket_id, amount, description, type, to_char(created_at, \'YYYY-MM-DD HH24:MI:SS\') as created FROM tickets ORDER BY created_at DESC LIMIT 3');
  console.table(tickets.rows);

  console.log("--- TICKET DETAILS FOR LATEST TICKETS ---");
  for (const t of tickets.rows) {
      console.log(`\nTicket ID: ${t.ticket_id} (${t.description})`);
      const details = await client.query('SELECT user_id, role, type, rubro FROM ticket_details WHERE ticket_id = $1', [t.ticket_id]);
      console.table(details.rows);
  }

  await client.end();
}
checkDB();
