const { Client } = require('../server/node_modules/pg');
const io = require('../app/node_modules/socket.io-client');

const dbConfig = {
  host: 'db.peiapp.tech',
  port: 5432,
  database: 'peiapp_dev',
  user: 'db_user_peiapp_dev',
  password: 'Z7mQ4vK9T2rX8pL5nW3s',
};

async function runTest() {
  console.log('--- STARTING REPLIES INTEGRATION TEST ---');
  
  const pgClient = new Client(dbConfig);
  let ticket = null;
  let owner = null;
  let participant = null;
  let parentChatId = null;
  
  const parentMessageText = 'Original parent message text for E2E testing';
  
  try {
    await pgClient.connect();
    console.log('✅ Connected to database.');
    
    // Get test ticket and users
    const ticketRes = await pgClient.query(`SELECT ticket_id, description, owner_id FROM tickets LIMIT 1`);
    ticket = ticketRes.rows[0];
    
    const usersRes = await pgClient.query(`SELECT user_id, display_name FROM users LIMIT 2`);
    owner = usersRes.rows[0];
    participant = usersRes.rows[1];
    
    // Insert actual parent message to satisfy foreign key constraint
    console.log('Inserting real parent message into DB...');
    const parentInsertRes = await pgClient.query(`
      INSERT INTO ticket_chat (ticket_id, sender_id, message, sender_name)
      VALUES ($1, $2, $3, $4)
      RETURNING chat_id
    `, [ticket.ticket_id, participant.user_id, parentMessageText, participant.display_name]);
    
    parentChatId = parentInsertRes.rows[0].chat_id;
    console.log(`✅ Created parent message in DB with ID: ${parentChatId}`);
    
  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    if (pgClient) await pgClient.end();
    process.exit(1);
  }

  console.log('Connecting WebSockets to http://localhost:3001...');
  const socketA = io('http://localhost:3001', { transports: ['websocket'] });
  const socketB = io('http://localhost:3001', { transports: ['websocket'] });

  await Promise.all([
    new Promise(r => socketA.on('connect', r)),
    new Promise(r => socketB.on('connect', r))
  ]);
  console.log('✅ WebSockets connected.');

  socketA.emit('joinTicket', ticket.ticket_id);
  socketB.emit('joinTicket', ticket.ticket_id);
  await new Promise(r => setTimeout(r, 500));

  const replyMessageText = `This is a reply to: "${parentMessageText}"`;

  const receivePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for B to receive reply message'));
    }, 5000);
    
    socketB.on('newMessage', (data) => {
      if (data.message === replyMessageText) {
        clearTimeout(timeout);
        resolve(data);
      }
    });
  });

  console.log(`📤 Sending reply message from Client A (replying to parent: ${parentChatId})...`);
  socketA.emit('sendMessage', {
    ticketId: ticket.ticket_id,
    senderId: owner.user_id,
    message: replyMessageText,
    senderName: owner.display_name,
    replyToChatId: parentChatId,
    replyToMessage: parentMessageText,
    replyToSenderName: participant.display_name,
  });

  try {
    const receivedData = await receivePromise;
    console.log('✅ Client B received the reply newMessage event:');
    console.log(JSON.stringify(receivedData, null, 2));

    if (
      receivedData.replyToChatId === parentChatId &&
      receivedData.replyToMessage === parentMessageText &&
      receivedData.replyToSenderName === participant.display_name
    ) {
      console.log('✅ Reply details match sent metadata exactly.');
    } else {
      throw new Error('Reply details in broadcast event do not match sent metadata!');
    }

    // Verify DB persistence
    console.log('\nChecking PostgreSQL database for persisted reply columns...');
    await new Promise(r => setTimeout(r, 1000));

    const dbCheckRes = await pgClient.query(`
      SELECT chat_id, reply_to_chat_id, reply_to_message, reply_to_sender_name 
      FROM ticket_chat 
      WHERE chat_id = $1
    `, [receivedData.chatId]);

    if (dbCheckRes.rows.length > 0) {
      const row = dbCheckRes.rows[0];
      console.log('✅ Persisted Database Row:');
      console.log(JSON.stringify(row, null, 2));
      
      if (
        row.reply_to_chat_id === parentChatId &&
        row.reply_to_message === parentMessageText &&
        row.reply_to_sender_name === participant.display_name
      ) {
        console.log('✅ Database values match and are persisted correctly.');
      } else {
        throw new Error('Database persisted reply fields do not match expected values.');
      }

      console.log('Cleaning up test chat entries...');
      await pgClient.query(`DELETE FROM ticket_chat WHERE chat_id IN ($1, $2)`, [receivedData.chatId, parentChatId]);
      console.log('✅ Cleaned up both test messages.');
    } else {
      throw new Error('Could not find the sent reply message in the database!');
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    // Cleanup parent message if test failed before deleting it
    if (parentChatId) {
      console.log('Cleaning up parent message after failure...');
      await pgClient.query(`DELETE FROM ticket_chat WHERE chat_id = $1`, [parentChatId]).catch(() => {});
    }
  } finally {
    socketA.disconnect();
    socketB.disconnect();
    await pgClient.end();
    console.log('--- REPLIES INTEGRATION TEST CONCLUDED ---');
  }
}

runTest();
