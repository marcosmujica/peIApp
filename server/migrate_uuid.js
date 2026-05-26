const { Client } = require('pg');

async function migrate() {
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

    // Tablas a migrar que tienen "user_id" como FK a "users.user_id" (que era el telefono)
    const tables = [
      'ticket_details',
      'wallet_members',
      'ticket_logs',
      'phone_otps'
    ];
    
    // ticket_chat usa sender_id
    // helpdesk usa user_id

    // 1.5. Create shadow users for any missing user_ids in all these tables
    console.log('Creating shadow users for missing references...');
    const allRefTables = [...tables, 'ticket_chat', 'helpdesk'];
    for (const table of allRefTables) {
      const colName = table === 'ticket_chat' ? 'sender_id' : 'user_id';
      
      // Select all missing phone numbers
      const missingQuery = await client.query(`
        SELECT DISTINCT t.${colName} as phone 
        FROM ${table} t 
        LEFT JOIN users u ON t.${colName} = u.user_id 
        WHERE u.user_id IS NULL AND t.${colName} IS NOT NULL;
      `);
      
      for (const row of missingQuery.rows) {
        if (!row.phone) continue;
        console.log(`Creating shadow user for missing phone: ${row.phone}`);
        // long_user_id is unique, we must provide it
        // crypto.randomUUID() could be used
        const { randomUUID } = require('crypto');
        const newUuid = randomUUID();
        await client.query(`
          INSERT INTO users (user_id, long_user_id, display_name, country, currency, push_enabled, created_at, updated_at, theme, daily_reports_enabled, monthly_reports_enabled, transaction_notifications_enabled, preferred_notification_time)
          VALUES ($1, $2, $3, 'AR', 'USD', true, NOW(), NOW(), 'light', true, true, true, '09:00')
          ON CONFLICT DO NOTHING;
        `, [row.phone, newUuid, 'Unknown User']);
      }
    }

    for (const table of tables) {
      console.log(`Migrating table ${table}...`);
      
      // 1. Add temporary UUID column
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id_uuid UUID;`);
      
      // 2. Map existing data
      await client.query(`
        UPDATE ${table} t 
        SET user_id_uuid = (SELECT long_user_id::uuid FROM users u WHERE u.user_id = t.user_id)
        WHERE t.user_id IS NOT NULL;
      `);
      
      // Fix nulls (if any remain)
      // If there are still nulls, we delete those rows or provide a dummy. They shouldn't exist now.
      await client.query(`DELETE FROM ${table} WHERE user_id_uuid IS NULL AND user_id IS NOT NULL;`);
    }

    // Para ticket_chat
    console.log('Migrating ticket_chat...');
    await client.query(`ALTER TABLE ticket_chat ADD COLUMN IF NOT EXISTS sender_id_uuid UUID;`);
    await client.query(`
      UPDATE ticket_chat t
      SET sender_id_uuid = (SELECT long_user_id::uuid FROM users u WHERE u.user_id = t.sender_id)
      WHERE t.sender_id IS NOT NULL;
    `);
    await client.query(`DELETE FROM ticket_chat WHERE sender_id_uuid IS NULL AND sender_id IS NOT NULL;`);

    // Para helpdesk
    console.log('Migrating helpdesk...');
    await client.query(`ALTER TABLE helpdesk ADD COLUMN IF NOT EXISTS user_id_uuid UUID;`);
    await client.query(`
      UPDATE helpdesk t
      SET user_id_uuid = (SELECT long_user_id::uuid FROM users u WHERE u.user_id = t.user_id)
      WHERE t.user_id IS NOT NULL;
    `);
    await client.query(`DELETE FROM helpdesk WHERE user_id_uuid IS NULL AND user_id IS NOT NULL;`);

    // 3. Drop constraints on all tables (to safely alter PK on users)
    // Here we find and drop constraints dynamically
    const constraintsQuery = await client.query(`
      SELECT tc.table_name, tc.constraint_name 
      FROM information_schema.table_constraints AS tc 
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN (
        'ticket_details', 'wallet_members', 'ticket_logs', 'phone_otps', 'ticket_chat', 'helpdesk'
      );
    `);
    
    for (const row of constraintsQuery.rows) {
      console.log(`Dropping FK ${row.constraint_name} from ${row.table_name}...`);
      await client.query(`ALTER TABLE ${row.table_name} DROP CONSTRAINT IF EXISTS "${row.constraint_name}";`);
    }

    // 4. Transform users table
    console.log('Modifying users table...');
    
    // Find the primary key constraint name for users
    const pkQuery = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass AND contype = 'p';
    `);
    if (pkQuery.rows.length > 0) {
      const pkName = pkQuery.rows[0].conname;
      console.log(`Dropping PK ${pkName} from users...`);
      await client.query(`ALTER TABLE users DROP CONSTRAINT "${pkName}" CASCADE;`);
    }

    // Renombrar la columna vieja (telefono) y la nueva (UUID)
    await client.query(`ALTER TABLE users RENAME COLUMN user_id TO phone;`);
    // Castear long_user_id a UUID explicitamente si era varchar
    await client.query(`ALTER TABLE users ALTER COLUMN long_user_id TYPE UUID USING long_user_id::uuid;`);
    await client.query(`ALTER TABLE users RENAME COLUMN long_user_id TO user_id;`);
    
    // Add primary key back
    await client.query(`ALTER TABLE users ADD PRIMARY KEY (user_id);`);
    // Add unique constraint on phone
    await client.query(`ALTER TABLE users ADD CONSTRAINT "UQ_users_phone" UNIQUE (phone);`);

    // 5. Transform referencing tables
    for (const table of tables) {
      console.log(`Finalizing table ${table}...`);
      await client.query(`ALTER TABLE ${table} DROP COLUMN user_id;`);
      await client.query(`ALTER TABLE ${table} RENAME COLUMN user_id_uuid TO user_id;`);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN user_id SET NOT NULL;`);
      // Add FK
      await client.query(`ALTER TABLE ${table} ADD CONSTRAINT "FK_${table}_user_id" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;`);
    }

    // Finalizing ticket_chat
    console.log(`Finalizing ticket_chat...`);
    await client.query(`ALTER TABLE ticket_chat DROP COLUMN sender_id;`);
    await client.query(`ALTER TABLE ticket_chat RENAME COLUMN sender_id_uuid TO sender_id;`);
    await client.query(`ALTER TABLE ticket_chat ALTER COLUMN sender_id SET NOT NULL;`);
    await client.query(`ALTER TABLE ticket_chat ADD CONSTRAINT "FK_ticket_chat_sender_id" FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE;`);

    // Finalizing helpdesk
    console.log(`Finalizing helpdesk...`);
    await client.query(`ALTER TABLE helpdesk DROP COLUMN user_id;`);
    await client.query(`ALTER TABLE helpdesk RENAME COLUMN user_id_uuid TO user_id;`);
    await client.query(`ALTER TABLE helpdesk ADD CONSTRAINT "FK_helpdesk_user_id" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;`);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
