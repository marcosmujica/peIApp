$path = "c:\trabajos\test\test13\app\src\screens\movements\EditRecurringTicketScreen.tsx"
$content = Get-Content $path -Raw

$find = @"
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.infoDualValue} numberOfLines={1}>
"@

$replace = @"
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                <Text style={[styles.infoDualValue, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
"@

$content = $content.Replace($find, $replace)

$content | Set-Content $path -Encoding UTF8
Write-Host "Replaced EditRecurringTicketScreen UI overlap fix"
