const { Client } = require('../server/node_modules/pg');

const dbConfig = {
  host: 'db.peiapp.tech',
  port: 5432,
  database: 'peiapp_dev',
  user: 'db_user_peiapp_dev',
  password: 'Z7mQ4vK9T2rX8pL5nW3s',
};

async function run() {
  const client = new Client(dbConfig);
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected.');

    console.log('Adding columns to ticket_chat table...');
    const sql = `
      ALTER TABLE ticket_chat 
      ADD COLUMN IF NOT EXISTS reply_to_chat_id UUID REFERENCES ticket_chat(chat_id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS reply_to_message TEXT,
      ADD COLUMN IF NOT EXISTS reply_to_sender_name VARCHAR(100);
    `;
    await client.query(sql);
    console.log('✅ Columns added successfully.');

    // Verify the columns in the schema
    const checkSql = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ticket_chat' AND column_name IN ('reply_to_chat_id', 'reply_to_message', 'reply_to_sender_name');
    `;
    const res = await client.query(checkSql);
    console.log('Current schema columns:');
    console.table(res.rows);

  } catch (err) {
    console.error('❌ Error updating database schema:', err.message);
  } finally {
    await client.end();
  }
}

run();
