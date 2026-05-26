const fs = require('fs');
const readline = require('readline');

async function extract() {
  const logPath = 'C:\\Users\\59896\\.gemini\\antigravity\\brain\\d67610d7-7365-4ecc-a111-2946ab854d41\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'TOOL_RESPONSE' && parsed.content && parsed.content.includes('emptyState: {')) {
         fs.writeFileSync(`c:\\trabajos\\test\\test13\\found_view_file_${parsed.step_index}.txt`, parsed.content, 'utf8');
      }
    } catch (e) {
      // skip
    }
  }
}

extract();
