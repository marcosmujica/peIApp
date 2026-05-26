const { Client } = require('pg');

async function migratePart2() {
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
    await client.query('BEGIN');
    await client.query('DROP VIEW IF EXISTS wallet_balances_view CASCADE;');

    const tables = [
      'tickets',
      'recurring_tickets',
      'wallets'
    ];

    console.log('Creating shadow users for missing references...');
    for (const table of tables) {
      const missingQuery = await client.query(`
        SELECT DISTINCT t.owner_id as phone 
        FROM ${table} t 
        LEFT JOIN users u ON t.owner_id = u.phone 
        WHERE u.phone IS NULL AND t.owner_id IS NOT NULL;
      `);
      
      for (const row of missingQuery.rows) {
        if (!row.phone) continue;
        console.log(`Creating shadow user for missing phone in ${table}: ${row.phone}`);
        const { randomUUID } = require('crypto');
        const newUuid = randomUUID();
        await client.query(`
          INSERT INTO users (user_id, phone, display_name, country, currency, push_enabled, created_at, updated_at, theme, daily_reports_enabled, monthly_reports_enabled, transaction_notifications_enabled, preferred_notification_time)
          VALUES ($1, $2, $3, 'AR', 'USD', true, NOW(), NOW(), 'light', true, true, true, '09:00')
          ON CONFLICT DO NOTHING;
        `, [newUuid, row.phone, 'Unknown User']);
      }
    }

    for (const table of tables) {
      console.log(`Migrating table ${table}...`);
      
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS owner_id_uuid UUID;`);
      
      await client.query(`
        UPDATE ${table} t 
        SET owner_id_uuid = (SELECT u.user_id FROM users u WHERE u.phone = t.owner_id)
        WHERE t.owner_id IS NOT NULL;
      `);
      
      await client.query(`DELETE FROM ${table} WHERE owner_id_uuid IS NULL AND owner_id IS NOT NULL;`);
    }

    const constraintsQuery = await client.query(`
      SELECT tc.table_name, tc.constraint_name 
      FROM information_schema.table_constraints AS tc 
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN (
        'tickets', 'recurring_tickets', 'wallets'
      );
    `);
    
    for (const row of constraintsQuery.rows) {
      console.log(`Dropping FK ${row.constraint_name} from ${row.table_name}...`);
      await client.query(`ALTER TABLE ${row.table_name} DROP CONSTRAINT IF EXISTS "${row.constraint_name}";`);
    }

    for (const table of tables) {
      console.log(`Finalizing table ${table}...`);
      await client.query(`ALTER TABLE ${table} DROP COLUMN owner_id;`);
      await client.query(`ALTER TABLE ${table} RENAME COLUMN owner_id_uuid TO owner_id;`);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN owner_id SET NOT NULL;`);
      await client.query(`ALTER TABLE ${table} ADD CONSTRAINT "FK_${table}_owner_id" FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE;`);
    }

    await client.query('COMMIT');
    console.log('Migration Part 2 completed successfully!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migratePart2();
