const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

async function checkSchema() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'helpdesk';
    `);
    console.log('Columns in helpdesk table:', res.rows);
  } catch (err) {
    console.error('Error during check', err);
  } finally {
    await client.end();
  }
}

checkSchema();
