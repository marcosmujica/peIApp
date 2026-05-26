const fs = require('fs');
const readline = require('readline');

async function search() {
  const logPath = 'C:\\Users\\59896\\.gemini\\antigravity\\brain\\d67610d7-7365-4ecc-a111-2946ab854d41\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      const content = JSON.stringify(parsed);
      if (content.includes('DashboardScreen.tsx')) {
         console.log("FIRST APPEARANCE IN STEP:", parsed.step_index);
         console.log(content.substring(0, 300));
         break;
      }
    } catch (e) {
      // skip
    }
  }
}

search();
