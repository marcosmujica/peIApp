require('dotenv').config({ path: '.env' });
const { AI_RUBROS_INGRESOS } = require('./dist/src/ai/rubros.constants.js');

async function testAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  const description = 'jardineria';
  const type = 'income';
  const rubros = AI_RUBROS_INGRESOS;
  const rubroList = rubros.map((r) => `${r.id} (${r.label || r.id})`).join(', ');

  const prompt = `Clasifica esta descripción de transacción financiera seleccionando el ID que mejor corresponda de la siguiente lista estricta.

LISTA DE IDS VÁLIDOS:
${rubroList}

Descripción a clasificar: "${description}"
Tipo: ${type === 'income' ? 'Ingreso' : 'Egreso'}

Reglas CRÍTICAS:
1. Devuelve ÚNICAMENTE uno de los IDs exactos de la lista anterior.
2. NUNCA inventes un ID que no esté en la lista. Si dudas, elige el más genérico (ej: "otros_ing").
3. No incluyas puntuación, comillas, ni explicaciones. Solo el ID literal.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 50,
      }
    }),
  });

  const data = await response.json();
  console.log("PROMPT:");
  console.log(prompt);
  console.log("\nRESPONSE:");
  console.log(JSON.stringify(data, null, 2));
}
testAI();
