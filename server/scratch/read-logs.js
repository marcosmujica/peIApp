const fs = require('fs');
try {
  const data = fs.readFileSync('c:\\trabajos\\test\\test13\\server\\logs\\server.log');
  // Pino logs are usually one JSON object per line.
  // We want the last few lines.
  const lines = data.toString().split('\n');
  console.log(lines.slice(-20).join('\n'));
} catch (err) {
  console.error('Error reading log file:', err);
}
