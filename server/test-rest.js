const axios = require('axios');
const API_KEY = "AIzaSyASQtuCrA_XiUmHlaLCmx9W0oe09d2UNu8";

const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function testRest() {
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const names = res.data.models.map(m => m.name);
    console.log("Names:", names);
  } catch (err) {
    console.error("HTTP Error:", err.response?.status);
    console.error("Data:", JSON.stringify(err.response?.data, null, 2));
  }
}



testRest();
