$path = "c:\trabajos\test\test13\server\src\tickets\tickets.service.ts"
$content = Get-Content $path -Raw

$find = @"
          type: userType,
          rubro: isOwner ? (data.type === 'income' ? data.rubroIncome : data.rubroExpense) : (isReceiver ? data.toRubro : null),
          description: data.description || null,
"@

$replace = @"
          type: userType,
          rubro: isOwner ? (data.rubro || (data.type === 'income' ? data.rubroIncome : data.rubroExpense)) : (isReceiver ? data.toRubro : null),
          description: data.description || null,
"@

$content = $content.Replace($find, $replace)

$find2 = @"
      // 8. AI Predictions
      if (savedTicket.description) {
        // Predict for owner if missing
        const ownerRubro = data.type === 'income' ? data.rubroIncome : data.rubroExpense;
        if (!ownerRubro) {
          this.triggerAsyncAIPrediction(savedTicket.ticketId, ownerId, savedTicket.description, data.type);
        }
"@

$replace2 = @"
      // 8. AI Predictions
      if (savedTicket.description) {
        // Predict for owner if missing
        const ownerRubro = data.rubro || (data.type === 'income' ? data.rubroIncome : data.rubroExpense);
        if (!ownerRubro) {
          this.triggerAsyncAIPrediction(savedTicket.ticketId, ownerId, savedTicket.description, data.type);
        }
"@

$content = $content.Replace($find2, $replace2)

$content | Set-Content $path -Encoding UTF8
Write-Host "Backend fixed"
