Add-Type -AssemblyName System.Drawing
$assetsDir = "c:\trabajos\test\test13\app\assets"
$pngFiles = Get-ChildItem -Path $assetsDir -Filter *.png

foreach ($file in $pngFiles) {
    try {
        $bmp = New-Object System.Drawing.Bitmap($file.FullName)
        $blueCount = 0
        for ($x = 0; $x -lt $bmp.Width; $x += [Math]::Max(1, [Math]::Floor($bmp.Width / 100))) {
            for ($y = 0; $y -lt $bmp.Height; $y += [Math]::Max(1, [Math]::Floor($bmp.Height / 100))) {
                $p = $bmp.GetPixel($x, $y)
                if ($p.A -gt 0) {
                    if ($p.B -gt $p.R -and $p.B -gt $p.G -and $p.B -gt 50) {
                        $blueCount++
                    }
                }
            }
        }
        Write-Host "$($file.Name): Found blue pixels indicator (sampled): $blueCount"
        $bmp.Dispose()
    } catch {
        Write-Host "Error processing $($file.Name): $_"
    }
}
