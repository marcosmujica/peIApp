Add-Type -AssemblyName System.Drawing
$imagePath = "c:\trabajos\test\test13\app\assets\icon_test.png"
$bmp = New-Object System.Drawing.Bitmap($imagePath)

$foundX = 35
$foundY = 144

Write-Host "Printing 5x5 neighborhood of X=$foundX, Y=$foundY in icon_test.png:"

for ($y = $foundY - 2; $y -le $foundY + 2; $y++) {
    $line = ""
    for ($x = $foundX - 2; $x -le $foundX + 2; $x++) {
        if ($x -ge 0 -and $x -lt $bmp.Width -and $y -ge 0 -and $y -lt $bmp.Height) {
            $p = $bmp.GetPixel($x, $y)
            $line += "($($p.R),$($p.G),$($p.B),$($p.A)) "
        }
    }
    Write-Host $line
}

$bmp.Dispose()
