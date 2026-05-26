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
      if (content.includes('DashboardScreen.tsx') && (parsed.type === 'CODE_ACTION' || parsed.type === 'TOOL_RESPONSE' || parsed.type === 'PLANNER_RESPONSE')) {
         if (content.includes('write_to_file') || content.includes('replace_file_content') || content.includes('Copy-Item')) {
             console.log("MODIFICATION IN STEP:", parsed.step_index, "AT:", parsed.created_at);
             console.log(content.substring(0, 150));
         }
      }
    } catch (e) {
      // skip
    }
  }
}

search();
