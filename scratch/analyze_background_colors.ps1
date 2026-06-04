Add-Type -AssemblyName System.Drawing
$imagePath = "c:\trabajos\test\test13\app\assets\icon_white.png"
$bmp = New-Object System.Drawing.Bitmap($imagePath)

$colors = @{}
for ($x = 0; $x -lt $bmp.Width; $x += 10) {
    for ($y = 0; $y -lt $bmp.Height; $y += 10) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -gt 10) {
            $hex = "#{0:X2}{1:X2}{2:X2}" -f $p.R, $p.G, $p.B
            if ($hex -ne "#FFFFFF" -and $hex -ne "#000000") {
                $colors[$hex] = $colors[$hex] + 1
            }
        }
    }
}

Write-Host "Top 15 non-white/black colors in icon_white.png:"
$colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 15 | Out-String
$bmp.Dispose()
