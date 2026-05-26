const fetch = require('node-fetch');

async function testSMS() {
  try {
    const response = await fetch('http://localhost:4000/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '+59811223344', // A dummy number to avoid Push fallback if it doesn't exist in DB
        content: 'Test SMS from script'
      })
    });
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testSMS();
