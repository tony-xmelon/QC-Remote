$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceIcon = Join-Path $repoRoot "packages\typescript\qc-theme\app-icon-source.png"
$tauriRoot = Join-Path $repoRoot "apps\windows\src-tauri"
$nativeTheme = Get-Content -LiteralPath (Join-Path $repoRoot "packages\typescript\qc-theme\src\native-theme.json") -Raw | ConvertFrom-Json
$iconTheme = $nativeTheme.appIcon
Add-Type -AssemblyName System.Drawing
function Convert-Color([string]$value) { [System.Drawing.ColorTranslator]::FromHtml($value) }
function New-RoundedPath([int]$x, [int]$y, [int]$width, [int]$height, [int]$radius) {
    $diameter = $radius * 2
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

$size = 1024
$bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.Point]::new(80, 70), [System.Drawing.Point]::new(900, 940), (Convert-Color $iconTheme.backgroundStart), (Convert-Color $iconTheme.backgroundEnd))
    $rounded = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $rounded.AddArc(32, 32, 224, 224, 180, 90); $rounded.AddArc(768, 32, 224, 224, 270, 90); $rounded.AddArc(768, 768, 224, 224, 0, 90); $rounded.AddArc(32, 768, 224, 224, 90, 90); $rounded.CloseFigure()
    $graphics.FillPath($background, $rounded)
    $deck = New-RoundedPath 50 184 924 650 84
    $deckBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.Point]::new(512, 184), [System.Drawing.Point]::new(512, 834), (Convert-Color $iconTheme.deckStart), (Convert-Color $iconTheme.deckEnd)); $deckPen = [System.Drawing.Pen]::new((Convert-Color $iconTheme.deckStroke), 16)
    $graphics.FillPath($deckBrush, $deck); $graphics.DrawPath($deckPen, $deck)
    $bezelBrush = [System.Drawing.SolidBrush]::new((Convert-Color $iconTheme.bezel)); $bezelPen = [System.Drawing.Pen]::new((Convert-Color $iconTheme.bezelStroke), 14)
    $graphics.FillRectangle($bezelBrush, 278, 230, 476, 290); $graphics.DrawRectangle($bezelPen, 278, 230, 476, 290)
    $screenBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.Point]::new(306, 258), [System.Drawing.Point]::new(726, 492), (Convert-Color $iconTheme.screenStart), (Convert-Color $iconTheme.screenEnd)); $graphics.FillRectangle($screenBrush, 306, 258, 420, 234)
    $bluePen = [System.Drawing.Pen]::new((Convert-Color $iconTheme.routeBlue), 20); $greenPen = [System.Drawing.Pen]::new((Convert-Color $iconTheme.routeGreen), 20); $bluePen.StartCap = $bluePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round; $greenPen.StartCap = $greenPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLines($bluePen, [System.Drawing.Point[]]@([System.Drawing.Point]::new(340, 326),[System.Drawing.Point]::new(440, 326),[System.Drawing.Point]::new(484, 370),[System.Drawing.Point]::new(560, 370),[System.Drawing.Point]::new(604, 326),[System.Drawing.Point]::new(692, 326)))
    $graphics.DrawLines($greenPen, [System.Drawing.Point[]]@([System.Drawing.Point]::new(340, 432),[System.Drawing.Point]::new(424, 432),[System.Drawing.Point]::new(468, 388),[System.Drawing.Point]::new(560, 388),[System.Drawing.Point]::new(604, 432),[System.Drawing.Point]::new(692, 432)))
    $switchBrush = [System.Drawing.SolidBrush]::new((Convert-Color $iconTheme.switch)); $switchPen = [System.Drawing.Pen]::new((Convert-Color $iconTheme.switchStroke), 12)
    $graphics.FillEllipse($switchBrush, 94, 300, 124, 124); $graphics.DrawEllipse($switchPen, 94, 300, 124, 124)
    foreach ($y in @(620, 766)) { foreach ($x in @(136, 324, 512, 700, 888)) { $graphics.FillEllipse($switchBrush, $x - 40, $y - 40, 80, 80); $graphics.DrawEllipse($switchPen, $x - 40, $y - 40, 80, 80) } }
    $graphics.FillEllipse($switchBrush, 854, 330, 68, 68); $graphics.DrawEllipse($switchPen, 854, 330, 68, 68)
    $offBrush = [System.Drawing.SolidBrush]::new((Convert-Color $iconTheme.ledOff)); foreach ($y in @(562, 708)) { foreach ($x in @(136, 324, 512, 700, 888)) { $graphics.FillEllipse($offBrush, $x - 10, $y - 10, 20, 20) } }; $graphics.FillEllipse($offBrush, 878, 304, 20, 20)
    $blueBrush = [System.Drawing.SolidBrush]::new((Convert-Color $iconTheme.routeBlue)); $greenBrush = [System.Drawing.SolidBrush]::new((Convert-Color $iconTheme.routeGreen)); $whiteBrush = [System.Drawing.SolidBrush]::new((Convert-Color $iconTheme.ledWhite))
    foreach ($p in @(@(136,562),@(512,562))) { $graphics.FillEllipse($blueBrush, $p[0]-12, $p[1]-12, 24, 24) }; foreach ($p in @(@(324,708),@(700,708))) { $graphics.FillEllipse($greenBrush, $p[0]-12, $p[1]-12, 24, 24) }; $graphics.FillEllipse($whiteBrush, 876, 696, 24, 24)
    $bitmap.Save($sourceIcon, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally { $graphics.Dispose(); $bitmap.Dispose() }

Push-Location $tauriRoot
try { npx tauri icon $sourceIcon; if ($LASTEXITCODE -ne 0) { throw "Tauri icon generation failed." } }
finally { Pop-Location }
& (Join-Path $PSScriptRoot "generate-android-branding.ps1")
Write-Output "Generated Windows and Android assets from the original QC Remote icon."
