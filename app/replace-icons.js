const fs = require('fs');
const files = [
  'c:/trabajos/test/test13/app/src/screens/wallets/WalletSettingsScreen.tsx',
  'c:/trabajos/test/test13/app/src/screens/movements/AddMovementScreen.tsx',
  'c:/trabajos/test/test13/app/src/screens/movements/EditRecurringTicketScreen.tsx',
  'c:/trabajos/test/test13/app/src/screens/main/SettingsScreen.tsx'
];
files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/backgroundColor: '#196342', alignItems: 'center', justifyContent: 'center'/g, "backgroundColor: '#f2f2f0', alignItems: 'center', justifyContent: 'center'");
  content = content.replace(/<Ionicons name="information" size={14} color="#ffffff"/g, '<Ionicons name="information" size={14} color="#737373"');
  content = content.replace(/backgroundColor: '#e8f5e9'/g, "backgroundColor: '#f2f2f0'");
  content = content.replace(/<Ionicons name="information" size={24} color="#196342"/g, '<Ionicons name="information" size={24} color="#737373"');
  fs.writeFileSync(f, content, 'utf8');
});
console.log('Replaced successfully!');
