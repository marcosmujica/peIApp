const fetch = require('node-fetch');

async function testOtpRequest() {
  try {
    const res = await fetch('http://localhost:3000/auth/request-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: '+59896725662',
        country: 'UY'
      })
    });
    const data = await res.text();
    console.log('Server response:', res.status, data);
  } catch (e) {
    console.error('Error:', e);
  }
}

testOtpRequest();
