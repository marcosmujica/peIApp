const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

async function run() {
  await client.connect();
  try {
    console.log('[Migration] Connected to database');
    
    // 1. Add last_chat_sender_id column to tickets table
    await client.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_chat_sender_id UUID');
    console.log('[Migration] Column last_chat_sender_id verified/added successfully');

    // 2. Backfill existing tickets with their latest chat message sender
    const backfillQuery = `
      UPDATE tickets t
      SET 
        last_chat_message = CASE 
          WHEN tc.message IS NOT NULL AND tc.message <> '' THEN tc.message 
          WHEN tc.attachment_type = 'image' THEN '📸 Imagen' 
          WHEN tc.attachment_type IS NOT NULL THEN '📄 Archivo'
          ELSE 'Mensaje'
        END,
        last_chat_message_timestamp = tc.created_at,
        last_chat_sender_id = tc.sender_id
      FROM (
        SELECT DISTINCT ON (ticket_id) ticket_id, message, attachment_type, created_at, sender_id
        FROM ticket_chat
        ORDER BY ticket_id, created_at DESC
      ) tc
      WHERE t.ticket_id = tc.ticket_id AND (t.last_chat_sender_id IS NULL OR t.last_chat_message IS NULL);
    `;
    const res = await client.query(backfillQuery);
    console.log(`[Migration] Backfilled/updated ${res.rowCount} tickets with last chat sender`);
  } catch (err) {
    console.error('[Migration] Error running migration:', err);
  } finally {
    await client.end();
  }
}
run();
