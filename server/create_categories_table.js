const { Client } = require('pg');
require('dotenv').config();

async function createTable() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Make sure we have uuid-ossp extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "wallets_categories" (
        "category_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "category_key" character varying(100) NOT NULL,
        "type" character varying(10) NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "wallet_id" uuid NOT NULL,
        CONSTRAINT "PK_wallets_categories_id" PRIMARY KEY ("category_id"),
        CONSTRAINT "FK_wallets_categories_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("wallet_id") ON DELETE CASCADE
      )
    `);

    console.log('Table wallets_categories created successfully');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await client.end();
  }
}

createTable();
