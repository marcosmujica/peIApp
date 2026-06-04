Add-Type -AssemblyName System.Drawing
$imagePath = "c:\trabajos\test\test13\app\assets\icon.png"
$outputPath = "c:\trabajos\test\test13\app\assets\icon_test.png"

$bmp = New-Object System.Drawing.Bitmap($imagePath)
$newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

$R_blue = 1.0
$G_blue = 102.0
$B_blue = 254.0

$R_target = 7.0
$G_target = 46.0
$B_target = 110.0

$delta_R = $R_target - $R_blue
$delta_G = $G_target - $G_blue
$delta_B = $B_target - $B_blue

for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $p = $bmp.GetPixel($x, $y)
        
        # Calculate blueness weight
        $maxRG = [Math]::Max($p.R, $p.G)
        $diff = $p.B - $maxRG
        
        if ($diff -gt 0 -and $p.A -gt 0) {
            $w = [Math]::Min(1.0, [Math]::Max(0.0, $diff / 152.0))
            
            # Apply color shift
            $newR = [Math]::Min(255, [Math]::Max(0, [int]($p.R + $w * $delta_R)))
            $newG = [Math]::Min(255, [Math]::Max(0, [int]($p.G + $w * $delta_G)))
            $newB = [Math]::Min(255, [Math]::Max(0, [int]($p.B + $w * $delta_B)))
            
            $newColor = [System.Drawing.Color]::FromArgb($p.A, $newR, $newG, $newB)
            $newBmp.SetPixel($x, $y, $newColor)
        } else {
            $newBmp.SetPixel($x, $y, $p)
        }
    }
}

$newBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$newBmp.Dispose()
Write-Host "Done! Saved modified image to $outputPath"
