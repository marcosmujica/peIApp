const axios = require('axios');

async function testAI() {
  try {
    const res = await axios.post('http://localhost:3000/ai/predict-rubro', {
      description: 'Pago de alquiler del mes de marzo',
      type: 'expense'
    }, {
      headers: {
        // I need a token. I'll use a mock one if the guard is bypassed or just skip the guard for testing.
        Authorization: 'Bearer MOCK_TOKEN' 
      }
    });
    console.log('Result:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testAI();
