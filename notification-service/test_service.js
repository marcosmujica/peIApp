const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function runTests() {
  console.log('🧪 Testing Notification Service...\n');

  try {
    // 1. Test addUser
    console.log('Testing /addUser...');
    const addRes = await axios.post(`${BASE_URL}/addUser`, { userId: '59896739775' });
    console.log('Result:', addRes.data);

    // 2. Test send (Push)
    console.log('\nTesting /send (Push expected if user has push_enabled)...');
    const sendRes = await axios.post(`${BASE_URL}/send`, {
      userId: '59896739775',
      content: 'Hello from PeIApp!'
    });
    console.log('Result:', sendRes.data);

    // 3. Test send (SMS for unknown user)
    console.log('\nTesting /send (SMS expected for unknown user)...');
    const unknownRes = await axios.post(`${BASE_URL}/send`, {
      userId: '99999999',
      content: 'Hello stranger!'
    });
    console.log('Result:', unknownRes.data);

  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
  }
}

runTests();
