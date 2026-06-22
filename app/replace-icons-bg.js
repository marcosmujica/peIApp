const fs = require('fs');
const files = [
  'c:/trabajos/test/test13/app/src/screens/wallets/WalletSettingsScreen.tsx',
  'c:/trabajos/test/test13/app/src/screens/movements/AddMovementScreen.tsx',
  'c:/trabajos/test/test13/app/src/screens/movements/EditRecurringTicketScreen.tsx',
  'c:/trabajos/test/test13/app/src/screens/main/SettingsScreen.tsx'
];
files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let lines = fs.readFileSync(f, 'utf8').split('\n');
  let changed = false;
  for(let i=0; i<lines.length; i++) {
     if(lines[i].includes("backgroundColor: '#f2f2f0'") && (lines[i].includes("width: 20") || lines[i].includes("width: 48"))) {
         lines[i] = lines[i].replace("backgroundColor: '#f2f2f0'", "backgroundColor: '#e5e5e5'");
         changed = true;
     }
  }
  if(changed) fs.writeFileSync(f, lines.join('\n'), 'utf8');
});
console.log('Replaced background to darker grey successfully!');
