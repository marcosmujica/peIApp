const { Client } = require('pg');
require('dotenv').config();

async function checkTable() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'wallets_categories';
    `);
    if (res.rows.length > 0) {
      console.log('Table wallets_categories EXISTS');
    } else {
      console.log('Table wallets_categories DOES NOT EXIST');
    }
  } catch (err) {
    console.error('Error checking table:', err);
  } finally {
    await client.end();
  }
}

checkTable();
