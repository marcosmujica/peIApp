const fs = require('fs');
const readline = require('readline');

async function search() {
  const logPath = 'C:\\Users\\59896\\.gemini\\antigravity\\brain\\d67610d7-7365-4ecc-a111-2946ab854d41\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'USER_INPUT' && parsed.content && parsed.content.includes('DashboardScreen: React.FC')) {
         console.log("FOUND IN USER INPUT STEP:", parsed.step_index);
         fs.writeFileSync('c:\\trabajos\\test\\test13\\user_dashboard.txt', parsed.content, 'utf8');
      }
    } catch (e) {
      // skip
    }
  }
}

search();
