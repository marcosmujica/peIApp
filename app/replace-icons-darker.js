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
  // Reemplazar el color claro por uno mucho más oscuro (#363630)
  content = content.replace(/<Ionicons name="information" size={14} color="#737373"/g, '<Ionicons name="information" size={14} color="#363630"');
  content = content.replace(/<Ionicons name="information" size={24} color="#737373"/g, '<Ionicons name="information" size={24} color="#363630"');
  fs.writeFileSync(f, content, 'utf8');
});
console.log('Replaced to darker color successfully!');
