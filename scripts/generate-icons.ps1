Add-Type -AssemblyName System.Drawing

$publicDir = Join-Path (Get-Location) "public"
$iconsDir = Join-Path $publicDir "icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

function Create-AppIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark rounded background
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 11, 15, 26))
    $g.FillRectangle($darkBrush, $rect)

    # Gradient glowing circle/squircle
    $pad = [int]($size * 0.1)
    $innerRect = New-Object System.Drawing.Rectangle($pad, $pad, ($size - 2 * $pad), ($size - 2 * $pad))
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $innerRect,
        [System.Drawing.Color]::FromArgb(255, 245, 203, 26),
        [System.Drawing.Color]::FromArgb(255, 234, 88, 12),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )

    # Draw rounded squircle
    $radius = [int]($size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($innerRect.X, $innerRect.Y, $radius * 2, $radius * 2, 180, 90)
    $path.AddArc($innerRect.Right - $radius * 2, $innerRect.Y, $radius * 2, $radius * 2, 270, 90)
    $path.AddArc($innerRect.Right - $radius * 2, $innerRect.Bottom - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $path.AddArc($innerRect.X, $innerRect.Bottom - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($gradBrush, $path)

    # Draw inner iconic symbol: upward trending financial bar + arrow
    $barBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 11, 15, 26))
    $barW = [int]($size * 0.08)
    $barGap = [int]($size * 0.05)
    $baseY = [int]($size * 0.70)

    # 3 progressive bars
    $b1 = New-Object System.Drawing.Rectangle([int]($size * 0.30), [int]($baseY - $size * 0.18), $barW, [int]($size * 0.18))
    $b2 = New-Object System.Drawing.Rectangle([int]($size * 0.30 + $barW + $barGap), [int]($baseY - $size * 0.28), $barW, [int]($size * 0.28))
    $b3 = New-Object System.Drawing.Rectangle([int]($size * 0.30 + ($barW + $barGap)*2), [int]($baseY - $size * 0.40), $barW, [int]($size * 0.40))
    $g.FillRectangle($barBrush, $b1)
    $g.FillRectangle($barBrush, $b2)
    $g.FillRectangle($barBrush, $b3)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Success: Generated $outputPath"
}

Create-AppIcon 192 (Join-Path $iconsDir "icon-192.png")
Create-AppIcon 512 (Join-Path $iconsDir "icon-512.png")
Create-AppIcon 180 (Join-Path $publicDir "apple-touch-icon.png")
