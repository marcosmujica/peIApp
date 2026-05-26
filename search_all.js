const fs = require('fs');
const readline = require('readline');

async function search() {
  const logPath = 'C:\\Users\\59896\\.gemini\\antigravity\\brain\\d67610d7-7365-4ecc-a111-2946ab854d41\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let count = 0;
  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      const content = parsed.content || "";
      if (content.includes('DashboardScreen') && content.length > 2000) {
         console.log("Found big chunk in step:", parsed.step_index);
         fs.writeFileSync(`c:\\trabajos\\test\\test13\\chunk_${parsed.step_index}.txt`, content, 'utf8');
         count++;
      }
    } catch (e) {
      // skip
    }
  }
  console.log("Done extracting " + count + " chunks.");
}

search();
