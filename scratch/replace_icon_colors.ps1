Add-Type -AssemblyName System.Drawing
$assetsDir = "c:\trabajos\test\test13\app\assets"
$files = @(
    "icon.png",
    "android-icon-foreground.png",
    "favicon.png",
    "icon - copia.png"
)

$R_blue = 1.0
$G_blue = 102.0
$B_blue = 254.0

$R_target = 7.0
$G_target = 46.0
$B_target = 110.0

$delta_R = $R_target - $R_blue
$delta_G = $G_target - $G_blue
$delta_B = $B_target - $B_blue

foreach ($fileName in $files) {
    $filePath = Join-Path $assetsDir $fileName
    if (-not (Test-Path $filePath)) {
        Write-Host "File not found: $filePath, skipping."
        continue
    }

    Write-Host "Processing $fileName..."
    $bmp = New-Object System.Drawing.Bitmap($filePath)
    $newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

    for ($x = 0; $x -lt $bmp.Width; $x++) {
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            $p = $bmp.GetPixel($x, $y)
            
            # Calculate blueness weight
            $maxRG = [Math]::Max($p.R, $p.G)
            $diff = $p.B - $maxRG
            
            if ($diff -gt 0 -and $p.A -gt 0) {
                # Pixel is blue-ish
                $w = [Math]::Min(1.0, [Math]::Max(0.0, $diff / 152.0))
                
                # Shift color smoothly
                $newR = [Math]::Min(255, [Math]::Max(0, [int]($p.R + $w * $delta_R)))
                $newG = [Math]::Min(255, [Math]::Max(0, [int]($p.G + $w * $delta_G)))
                $newB = [Math]::Min(255, [Math]::Max(0, [int]($p.B + $w * $delta_B)))
                
                $newColor = [System.Drawing.Color]::FromArgb($p.A, $newR, $newG, $newB)
                $newBmp.SetPixel($x, $y, $newColor)
            } else {
                # Keep pixel unchanged
                $newBmp.SetPixel($x, $y, $p)
            }
        }
    }

    # Save to a temporary file first, then replace original
    $tempPath = Join-Path $assetsDir "temp_$fileName"
    $newBmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $bmp.Dispose()
    $newBmp.Dispose()

    # Overwrite the original file
    Remove-Item $filePath -Force
    Rename-Item $tempPath $fileName
    Write-Host "Successfully replaced $fileName."
}

# Clean up test file if it exists
$testPath = Join-Path $assetsDir "icon_test.png"
if (Test-Path $testPath) {
    Remove-Item $testPath -Force
}

Write-Host "All assets processed successfully!"
