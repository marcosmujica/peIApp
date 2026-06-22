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
     if(lines[i].includes('<Ionicons name="information"')) {
         if(lines[i].includes('color="#ffffff"')) {
            lines[i] = lines[i].replace('color="#ffffff"', 'color="#363630"');
            changed = true;
         }
         if(lines[i].includes('color="#196342"')) {
            lines[i] = lines[i].replace('color="#196342"', 'color="#363630"');
            changed = true;
         }
     }
  }
  if(changed) fs.writeFileSync(f, lines.join('\n'), 'utf8');
});
console.log('Replaced text successfully 3!');
