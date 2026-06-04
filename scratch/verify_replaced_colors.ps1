Add-Type -AssemblyName System.Drawing
$assetsDir = "c:\trabajos\test\test13\app\assets"
$files = @("icon.png", "android-icon-foreground.png", "favicon.png")

foreach ($fileName in $files) {
    $filePath = Join-Path $assetsDir $fileName
    if (-not (Test-Path $filePath)) {
        Write-Host "ERROR: File not found: $filePath"
        continue
    }

    $bmp = New-Object System.Drawing.Bitmap($filePath)
    $brightBlueCount = 0
    $darkBlueCount = 0
    
    $stepX = [Math]::Max(1, [Math]::Floor($bmp.Width / 100))
    $stepY = [Math]::Max(1, [Math]::Floor($bmp.Height / 100))

    for ($x = 0; $x -lt $bmp.Width; $x += $stepX) {
        for ($y = 0; $y -lt $bmp.Height; $y += $stepY) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -gt 0) {
                # Check for bright blue (#0166FE / #0066FF range)
                if ($p.B -gt 240 -and $p.G -gt 90 -and $p.G -lt 110 -and $p.R -lt 10) {
                    $brightBlueCount++
                }
                # Check for dark blue (#072E6E range)
                if ($p.B -gt 95 -and $p.B -lt 120 -and $p.G -gt 35 -and $p.G -lt 55 -and $p.R -lt 15) {
                    $darkBlueCount++
                }
            }
        }
    }
    Write-Host "$fileName : Bright blue pixels (sampled) = $brightBlueCount, Dark blue pixels (sampled) = $darkBlueCount"
    $bmp.Dispose()
}
