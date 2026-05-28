const { Client } = require('pg');
require('dotenv').config({ path: '../.env' }); // Load .env from parent if needed, or local

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
    // Get all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Tables found:', tables);

    for (const table of tables) {
      console.log(`\n--- TABLE: ${table} ---`);
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      for (const col of colsRes.rows) {
        console.log(`  ${col.column_name}: ${col.data_type} (Nullable: ${col.is_nullable}, Default: ${col.column_default})`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
