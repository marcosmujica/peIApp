$path = "c:\trabajos\test\test13\app\src\screens\movements\AddMovementScreen.tsx"
$content = Get-Content $path -Raw

$find1 = @"
    let syncRubroId = selectedRubroId?.toString();
    let syncToRubroId = toRubroId;

    if (!syncRubroId || !syncToRubroId) {
      try {
        const oppType = type === 'income' ? 'expense' : 'income';
        let allowedRubros: any[] = [];
        if (selectedWallet) {
           const map = WALLET_RUBROS_MAP[selectedWallet.walletType || 'personal'];
           const ids = type === 'income' ? map.ingresos : map.gastos;
           const general = type === 'income' ? GENERAL_RUBROS_INGRESOS : GENERAL_RUBROS_GASTOS;
           allowedRubros = general.filter(r => ids.includes(r.id));
        }

        if (!syncRubroId && allowedRubros.length > 0) {
          const predictedId = await aiApi.predictRubro(description, type, allowedRubros);
          if (predictedId) {
            syncRubroId = predictedId;
            setSelectedRubroId(predictedId);
          }
        }
        
        if (!syncToRubroId) {
          const oppPredictedId = await aiApi.predictRubro(description, oppType);
          if (oppPredictedId) {
             syncToRubroId = oppPredictedId;
             setToRubroId(oppPredictedId);
          }
        }
      } catch(e) {
        console.error("AI Sync Prediction Failed", e);
      }
    }

    const finalShortId = shortId || generateShortId();
    if (!shortId) setShortId(finalShortId);

    // Estructura común del ticket
    const commonDto = {
"@

$replace1 = @"
    const finalShortId = shortId || generateShortId();
    if (!shortId) setShortId(finalShortId);

    // Estructura común del ticket
    const commonDto = {
"@

$find2 = @"
      reference: reference || undefined,
      attachmentUrl: finalAttachmentUrl || undefined,
      rubro: syncRubroId || undefined,
      source,
      sourceInfo: sourceInfo || undefined,
      comment: (isOwner || isParticipant) ? (comment || undefined) : undefined,
      ownerRating: ownerRating || undefined,
      participantRating: participantRating || undefined,
      shortId: finalShortId,
      toWalletId: toWalletId || undefined,
      toRubro: syncToRubroId || undefined,
"@

$replace2 = @"
      reference: reference || undefined,
      attachmentUrl: finalAttachmentUrl || undefined,
      rubro: selectedRubroId?.toString() || undefined,
      source,
      sourceInfo: sourceInfo || undefined,
      comment: (isOwner || isParticipant) ? (comment || undefined) : undefined,
      ownerRating: ownerRating || undefined,
      participantRating: participantRating || undefined,
      shortId: finalShortId,
      toWalletId: toWalletId || undefined,
      toRubro: toRubroId || undefined,
"@

$content = $content.Replace($find1, $replace1)
$content = $content.Replace($find2, $replace2)

$content | Set-Content $path -Encoding UTF8
Write-Host "Reverted"
