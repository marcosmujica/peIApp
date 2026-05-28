require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Logging Setup
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFilePath = path.join(logDir, 'notifications.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function fileLog(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  logStream.write(logEntry);
  console.log(message); // Still log to console
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logStream })); // Morgan logs to file
app.use(morgan('dev')); // Dev logs to console

// Custom Middleware for detailed Request Logging
app.use((req, res, next) => {
  fileLog(`INCOMING: ${req.method} ${req.path} - Body: ${JSON.stringify(req.body)}`);
  next();
});

// Database Pools
const mainDb = new Pool({
  host: process.env.MAIN_DB_HOST,
  port: process.env.MAIN_DB_PORT,
  database: process.env.MAIN_DB_NAME,
  user: process.env.MAIN_DB_USER,
  password: process.env.MAIN_DB_PASSWORD,
});

const notifDb = new Pool({
  host: process.env.NOTIF_DB_HOST,
  port: process.env.NOTIF_DB_PORT,
  database: process.env.NOTIF_DB_NAME,
  user: process.env.NOTIF_DB_USER,
  password: process.env.NOTIF_DB_PASSWORD,
});

const { Expo } = require('expo-server-sdk');
const expo = new Expo();

// In-memory User Cache
// Key: userId, Value: { phone, pushEnabled, notificationId }
let usersCache = new Map();

/**
 * Initialize Tables in Notification DB
 */
async function initNotifDb() {
  console.log('⏳ Verifying notification logs table...');
  try {
    const res = await notifDb.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50),
        content TEXT,
        type VARCHAR(20),
        status VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Notification logs table verified/created.');
  } catch (err) {
    fileLog(`❌ Error initializing notification DB: ${err.message}`);
    throw err;
  }
}

/**
 * Load all users from Main DB to memory
 */
async function loadUsersToMemory() {
  console.log('⏳ Loading users from main DB...');
  try {
    const result = await mainDb.query('SELECT user_id, push_enabled, notification_id FROM users');
    usersCache.clear();
    result.rows.forEach(user => {
      usersCache.set(user.user_id, {
        phone: user.user_id,
        pushEnabled: user.push_enabled,
        notificationId: user.notification_id
      });
    });
    fileLog(`🚀 Loaded ${usersCache.size} users into memory.`);
  } catch (err) {
    fileLog(`❌ Error loading users into memory: ${err.message}`);
    throw err;
  }
}

// 1. Path /addUser
app.post('/addUser', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const result = await mainDb.query('SELECT user_id, push_enabled, notification_id FROM users WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      usersCache.set(user.user_id, {
        phone: user.user_id,
        pushEnabled: user.push_enabled,
        notificationId: user.notification_id
      });
      console.log(`👤 User ${userId} added/updated in memory.`);
      res.json({ message: 'User added to memory', user: usersCache.get(userId) });
    } else {
      res.status(404).json({ error: 'User not found in main DB' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Path /updateuser
app.post('/updateuser', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const result = await mainDb.query('SELECT user_id, push_enabled, notification_id FROM users WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      usersCache.set(user.user_id, {
        phone: user.user_id,
        pushEnabled: user.push_enabled,
        notificationId: user.notification_id
      });
      console.log(`🔄 User ${userId} refreshed in memory.`);
      res.json({ message: 'User updated in memory', user: usersCache.get(userId) });
    } else {
      res.status(404).json({ error: 'User not found in main DB' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Helper to get user from cache or DB
 */
async function getOrFetchUser(userId) {
  if (usersCache.has(userId)) return usersCache.get(userId);
  try {
    const result = await mainDb.query('SELECT user_id, push_enabled, notification_id FROM users WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) {
      const u = result.rows[0];
      const userData = {
        phone: u.user_id,
        pushEnabled: u.push_enabled,
        notificationId: u.notification_id
      };
      usersCache.set(u.user_id, userData);
      return userData;
    }
  } catch (err) {
    console.error(`[DB] Error fetching user ${userId}:`, err.message);
  }
  return null;
}

// 3. Path /send
app.post('/send', async (req, res) => {
  const { userId, content, title } = req.body || {};
  if (!userId || !content) return res.status(400).json({ error: 'userId and content are required' });

  const user = await getOrFetchUser(userId);
  let type = 'whatsapp';
  let status = 'sent';

  if (user && user.notificationId) {
    // Si existe en BD y tiene token, el canal por defecto es PUSH
    type = 'push';
    
    if (!Expo.isExpoPushToken(user.notificationId)) {
        console.error(`Push token ${user.notificationId} is not a valid Expo push token`);
        status = 'invalid_token';
        // Fallback a whatsapp si el token es inválido? 
        // El usuario pidió que el canal por defecto sea la app, 
        // pero si falla podemos dejarlo como error o fallback.
    } else {
        const isEnabled = process.env.ENABLE_NOTIFICATIONS === 'true';
        if (!isEnabled) {
            fileLog(`[PUSH-LOG-ONLY] Would have sent to ${userId}: ${content}`);
            status = 'logged_only';
        } else {
            try {
                 const messages = [{
                     to: user.notificationId,
                     sound: 'default',
                     title: title || 'PeiApp',
                     body: content,
                     data: { userId, ...(req.body.data || {}) },
                 }];
                
                const chunks = expo.chunkPushNotifications(messages);
                for (let chunk of chunks) {
                    try {
                        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                        fileLog(`[PUSH] Expo ticket: ${JSON.stringify(ticketChunk)}`);
                    } catch (error) {
                        fileLog(`[PUSH] Error sending chunk: ${error.message}`);
                        status = 'error';
                    }
                }
                fileLog(`✅ [PUSH] Sent to ${userId}: ${content}`);
            } catch (e) {
                fileLog(`❌ [PUSH] Critical Error: ${e.message}`);
                status = 'error';
            }
        }
    }
  } else if (user) {
    // Existe pero no tiene token de push
    type = 'whatsapp';
    if (process.env.ENABLE_NOTIFICATIONS === 'true') {
      fileLog(`[WHATSAPP] Sending to ${user.phone}: ${content}`);
    } else {
      fileLog(`[WHATSAPP-LOG-ONLY] Would have sent to ${user.phone}: ${content}`);
      status = 'logged_only';
    }
  } else {
    // Usuario no existe en BD
    type = 'whatsapp';
    if (process.env.ENABLE_NOTIFICATIONS === 'true') {
      fileLog(`[WHATSAPP] External/Unknown User ${userId}: ${content}`);
    } else {
      fileLog(`[WHATSAPP-LOG-ONLY] Would have sent to External/Unknown User ${userId}: ${content}`);
      status = 'logged_only';
    }
  }

  // Registrar en DB de notificaciones
  try {
    await notifDb.query(
      'INSERT INTO notification_logs (user_id, content, type, status) VALUES ($1, $2, $3, $4)',
      [userId, content, type, status]
    );
  } catch (err) {
    console.error('❌ Error logging notification:', err.message);
  }
  res.json({ success: true, type, status });
});

// 4. Path /send-sms
app.post('/send-sms', async (req, res) => {
  const { phone, content, title } = req.body || {};
  if (!phone || !content) return res.status(400).json({ error: 'phone and content are required' });

  // Push redirect removed as requested by user. OTPs will always send via SMS (or Mock).

  if (process.env.SMS_MOCK === 'true') {
    fileLog(`[SMS-MOCK] Simulating SMS to ${phone}: ${content}`);
    // Log to DB
    try {
      await notifDb.query(
        'INSERT INTO notification_logs (user_id, content, type, status) VALUES ($1, $2, $3, $4)',
        [phone, content, 'sms', 'mocked']
      );
    } catch (dbErr) {
      console.error('❌ Error logging Mocked SMS to DB:', dbErr.message);
    }
    return res.json({ success: true, message: 'Mocked SMS', type: 'sms', status: 'mocked' });
  }

  if (process.env.ENABLE_NOTIFICATIONS !== 'true') {
    fileLog(`[SMS-LOG-ONLY] Would have sent SMS to ${phone}: ${content}`);
    // Log to DB
    try {
      await notifDb.query(
        'INSERT INTO notification_logs (user_id, content, type, status) VALUES ($1, $2, $3, $4)',
        [phone, content, 'sms', 'logged_only']
      );
    } catch (dbErr) {
      console.error('❌ Error logging Logged-only SMS to DB:', dbErr.message);
    }
    return res.json({ success: true, message: 'SMS Logged Only', type: 'sms', status: 'logged_only' });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
      fileLog('❌ Twilio credentials missing in .env');
      return res.status(500).json({ error: 'Twilio credentials missing' });
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const body = new URLSearchParams();
    body.append('To', phone);
    body.append('From', from);
    body.append('Body', content);

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      fileLog(`❌ Twilio SMS failed for ${phone}: ${JSON.stringify(data)}`);
      return res.status(500).json({ error: 'Twilio API error', details: data });
    }

    fileLog(`✅ SMS sent to ${phone}: ${content}`);
    
    // Log to DB
    try {
      await notifDb.query(
        'INSERT INTO notification_logs (user_id, content, type, status) VALUES ($1, $2, $3, $4)',
        [phone, content, 'sms', 'sent']
      );
    } catch (dbErr) {
      console.error('❌ Error logging SMS to DB:', dbErr.message);
    }

    res.json({ success: true, messageId: data.sid, type: 'sms' });
  } catch (err) {
    fileLog(`❌ Exception during SMS sending to ${phone}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Startup
(async () => {
  console.log('🛠 Starting Notification Service initialization...');
  try {
    await initNotifDb();
    await loadUsersToMemory();

    app.listen(PORT, () => {
      fileLog(`\n🔔 Notification Service running on http://localhost:${PORT}`);
      fileLog(`-----------------------------------------------------`);
    });
  } catch (err) {
    fileLog(`💥 Critical failure during startup: ${err.message}`);
    process.exit(1);
  }
})();
