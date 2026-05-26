$path = "c:\trabajos\test\test13\app\src\screens\movements\AddMovementScreen.tsx"
$content = Get-Content $path -Raw

$find = @"
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          {selectedRubro && <Ionicons name={selectedRubro.icon as any} size={16} color="#363630" />}
                          <Text style={{ fontSize: 17, fontFamily: FontFamily.semibold, color: '#363630' }} numberOfLines={1}>
"@

$replace = @"
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexShrink: 1 }}>
                          {selectedRubro && <Ionicons name={selectedRubro.icon as any} size={16} color="#363630" />}
                          <Text style={{ fontSize: 17, fontFamily: FontFamily.semibold, color: '#363630', flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">
"@

$content = $content.Replace($find, $replace)

$content | Set-Content $path -Encoding UTF8
Write-Host "Replaced AddMovementScreen UI overlap fix"
