const fs = require('fs');
const readline = require('readline');

async function extract() {
  const logPath = 'C:\\Users\\59896\\.gemini\\antigravity\\brain\\d67610d7-7365-4ecc-a111-2946ab854d41\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let bestContent = null;

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'TOOL_RESPONSE' && parsed.content && parsed.content.includes('DashboardScreen.tsx')) {
        // Check if it looks like a view_file response
        if (parsed.content.includes('The above content shows the entire, complete file contents')) {
           bestContent = parsed.content;
        }
      }
    } catch (e) {
      // skip
    }
  }

  if (bestContent) {
    // Extract the content from the view_file format
    // It's usually like:
    // ... file metadata ...
    // 1: import React ...
    // ...
    // The above content shows...
    const lines = bestContent.split('\n');
    const codeLines = [];
    for (const l of lines) {
       const match = l.match(/^\d+:\s(.*)/);
       if (match) {
         codeLines.push(match[1]);
       }
    }
    const finalCode = codeLines.join('\n');
    fs.writeFileSync('c:\\trabajos\\test\\test13\\app\\src\\screens\\main\\DashboardScreen.tsx', finalCode, 'utf8');
    console.log('Successfully restored DashboardScreen.tsx (' + codeLines.length + ' lines)');
  } else {
    console.log('Could not find the original DashboardScreen.tsx in the transcript.');
  }
}

extract();
