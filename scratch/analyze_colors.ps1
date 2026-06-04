Add-Type -AssemblyName System.Drawing
$imagePath = "c:\trabajos\test\test13\app\assets\icon.png"
$bmp = New-Object System.Drawing.Bitmap($imagePath)

$bluePixels = @{}
for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.A -gt 0) {
            # Let's find pixels where Blue is the dominant channel
            # blue-ish color: B > R and B > G
            if ($p.B -gt $p.R -and $p.B -gt $p.G -and $p.B -gt 50) {
                $hex = "#{0:X2}{1:X2}{2:X2}" -f $p.R, $p.G, $p.B
                $bluePixels[$hex] = $bluePixels[$hex] + 1
            }
        }
    }
}

Write-Host "Blue pixels count: $($bluePixels.Count)"
Write-Host "Top 50 blue-ish colors in icon.png:"
$bluePixels.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 50 | Out-String
$bmp.Dispose()
