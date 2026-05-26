const { Client } = require('pg');
const client = new Client({
  host: 'db.peiapp.tech',
  port: 5432,
  user: 'db_user_peiapp_dev',
  password: 'Z7mQ4vK9T2rX8pL5nW3s',
  database: 'peiapp_dev',
});
client.connect()
  .then(() => { 
    console.log('Connected successfully to db.peiapp.tech'); 
    client.end(); 
  })
  .catch(err => { 
    console.error('FAILED to connect to db.peiapp.tech');
    console.error(err);
    process.exit(1);
  });
