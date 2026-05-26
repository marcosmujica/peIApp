const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testLib() {
  try {
    const genAI = new GoogleGenerativeAI("AIzaSyDU9gOzOB7K2Bz9gOG64LpGxO1oNx-zzQQ");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1beta' });





    const prompt = "Respóndeme con la palabra 'Hola' si me escuchas.";
    console.log("Sending prompt...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log("Response:", response.text());
  } catch (err) {
    console.error("SDK Error:", err);
  }
}

testLib();
