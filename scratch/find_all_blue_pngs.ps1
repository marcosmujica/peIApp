Add-Type -AssemblyName System.Drawing
$rootPath = "c:\trabajos\test\test13"
$pngFiles = Get-ChildItem -Path $rootPath -Filter *.png -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" -and $_.FullName -notlike "*.expo*" }

foreach ($file in $pngFiles) {
    try {
        $bmp = New-Object System.Drawing.Bitmap($file.FullName)
        $blueCount = 0
        
        # Determine sample step to avoid slow execution on large files
        $stepX = [Math]::Max(1, [Math]::Floor($bmp.Width / 100))
        $stepY = [Math]::Max(1, [Math]::Floor($bmp.Height / 100))
        
        for ($x = 0; $x -lt $bmp.Width; $x += $stepX) {
            for ($y = 0; $y -lt $bmp.Height; $y += $stepY) {
                $p = $bmp.GetPixel($x, $y)
                if ($p.A -gt 0) {
                    # Check if blue-ish
                    if ($p.B -gt $p.R -and $p.B -gt $p.G -and $p.B -gt 50) {
                        $blueCount++
                    }
                }
            }
        }
        $relPath = $file.FullName.Substring($rootPath.Length + 1)
        Write-Host "${relPath} : Sampled blue pixels = ${blueCount}"
        $bmp.Dispose()
    } catch {
        Write-Host "Error processing $($file.FullName): $_"
    }
}
