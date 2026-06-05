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

function ensureE164Phone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d]/g, '');
  const countryCodes = [
    '598', '54', '55', '56', '57', '58', '51', '52', '595', '591', '593',
    '506', '503', '502', '509', '504', '505', '507', '1'
  ];
  for (const cc of countryCodes) {
    if (cleaned.startsWith(cc) && cleaned.length >= 10) {
      return cleaned;
    }
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return '598' + cleaned;
}

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
    const result = await mainDb.query('SELECT user_id, phone, push_enabled, notification_id FROM users');
    usersCache.clear();
    result.rows.forEach(user => {
      usersCache.set(user.user_id, {
        phone: user.phone ? ensureE164Phone(user.phone) : '',
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
    const result = await mainDb.query('SELECT user_id, phone, push_enabled, notification_id FROM users WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) {
      const u = result.rows[0];
      const userData = {
        phone: u.phone ? ensureE164Phone(u.phone) : '',
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
  let type = (user && user.notificationId) ? 'push' : 'whatsapp';
  let status = 'pending';

  // 1. Registrar primero en la BD con estado 'pending'
  let logId = null;
  try {
    const insertRes = await notifDb.query(
      'INSERT INTO notification_logs (user_id, content, type, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, content, type, status]
    );
    logId = insertRes.rows[0].id;
  } catch (dbErr) {
    console.error('❌ Error pre-logging notification:', dbErr.message);
  }

  // 2. Intentar el envío
  status = 'sent';
  if (user && user.notificationId) {
    if (!Expo.isExpoPushToken(user.notificationId)) {
        console.error(`Push token ${user.notificationId} is not a valid Expo push token`);
        status = 'invalid_token';
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
    const cleanUserPhone = ensureE164Phone(user.phone);
    if (process.env.ENABLE_NOTIFICATIONS === 'true') {
      fileLog(`[WHATSAPP] Sending to ${cleanUserPhone}: ${content}`);
    } else {
      fileLog(`[WHATSAPP-LOG-ONLY] Would have sent to ${cleanUserPhone}: ${content}`);
      status = 'logged_only';
    }
  } else {
    // Usuario no existe en BD
    const cleanUserId = ensureE164Phone(userId);
    if (process.env.ENABLE_NOTIFICATIONS === 'true') {
      fileLog(`[WHATSAPP] External/Unknown User ${cleanUserId}: ${content}`);
    } else {
      fileLog(`[WHATSAPP-LOG-ONLY] Would have sent to External/Unknown User ${cleanUserId}: ${content}`);
      status = 'logged_only';
    }
  }

  // 3. Actualizar estado en la BD de notificaciones
  if (logId) {
    try {
      await notifDb.query(
        'UPDATE notification_logs SET status = $1, type = $2 WHERE id = $3',
        [status, type, logId]
      );
    } catch (dbErr) {
      console.error('❌ Error updating notification log:', dbErr.message);
    }
  }

  res.json({ success: true, type, status });
});

// 4. Path /send-sms
app.post('/send-sms', async (req, res) => {
  const { phone, content, title } = req.body || {};
  if (!phone || !content) return res.status(400).json({ error: 'phone and content are required' });

  const cleanPhone = ensureE164Phone(phone);

  // 1. Registrar primero en la BD con estado 'pending'
  let logId = null;
  try {
    const insertRes = await notifDb.query(
      'INSERT INTO notification_logs (user_id, content, type, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [cleanPhone, content, 'sms', 'pending']
    );
    logId = insertRes.rows[0].id;
  } catch (dbErr) {
    console.error('❌ Error pre-logging SMS:', dbErr.message);
  }

  // 2. Procesar el envío según configuración
  let status = 'sent';
  let twilioError = null;
  let responseData = null;

  if (process.env.SMS_MOCK === 'true') {
    fileLog(`[SMS-MOCK] Simulating SMS to ${cleanPhone}: ${content}`);
    status = 'mocked';
    responseData = { success: true, message: 'Mocked SMS', type: 'sms', status };
  } else if (process.env.ENABLE_NOTIFICATIONS !== 'true') {
    fileLog(`[SMS-LOG-ONLY] Would have sent SMS to ${cleanPhone}: ${content}`);
    status = 'logged_only';
    responseData = { success: true, message: 'SMS Logged Only', type: 'sms', status };
  } else {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
        fileLog('❌ Twilio credentials missing in .env');
        status = 'error';
        twilioError = 'Twilio credentials missing';
    } else {
        try {
          const auth = Buffer.from(`${sid}:${token}`).toString('base64');
          const body = new URLSearchParams();
          const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone;
          body.append('To', formattedPhone);
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
            status = 'error';
            twilioError = { error: 'Twilio API error', details: data };
          } else {
            fileLog(`✅ SMS sent to ${phone}: ${content}`);
            status = 'sent';
            responseData = { success: true, messageId: data.sid, type: 'sms' };
          }
        } catch (err) {
          fileLog(`❌ Exception during SMS sending to ${phone}: ${err.message}`);
          status = 'error';
          twilioError = err.message;
        }
    }
  }

  // 3. Actualizar estado en la BD de notificaciones
  if (logId) {
    try {
      await notifDb.query(
        'UPDATE notification_logs SET status = $1 WHERE id = $2',
        [status, logId]
      );
    } catch (dbErr) {
      console.error('❌ Error updating SMS log:', dbErr.message);
    }
  }

  if (status === 'error') {
    return res.status(500).json(typeof twilioError === 'string' ? { error: twilioError } : twilioError);
  }

  res.json(responseData);
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
