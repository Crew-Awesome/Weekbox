Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\leive\Proyectos\WeekBox-Proyectos\Weekbox-otra-re-escritura\assets\icon.png"
$resBase = "c:\Users\leive\Proyectos\WeekBox-Proyectos\Weekbox-otra-re-escritura\android\app\src\main\res"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source icon not found at $srcPath"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [string]$DestinationPath,
        [double]$ScaleFactor = 1.0
    )

    $destBmp = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $targetW = [int]($Width * $ScaleFactor)
    $targetH = [int]($Height * $ScaleFactor)
    $posX = [int](($Width - $targetW) / 2)
    $posY = [int](($Height - $targetH) / 2)

    $rect = New-Object System.Drawing.Rectangle($posX, $posY, $targetW, $targetH)
    $graphics.DrawImage($Image, $rect)
    $graphics.Dispose()

    $destBmp.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Output "Generated $DestinationPath ($Width x $Height)"
}

$densities = @(
    @{ Name = "mipmap-mdpi"; LauncherSize = 48; ForegroundSize = 108 },
    @{ Name = "mipmap-hdpi"; LauncherSize = 72; ForegroundSize = 162 },
    @{ Name = "mipmap-xhdpi"; LauncherSize = 96; ForegroundSize = 216 },
    @{ Name = "mipmap-xxhdpi"; LauncherSize = 144; ForegroundSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; LauncherSize = 192; ForegroundSize = 432 }
)

foreach ($d in $densities) {
    $dir = Join-Path $resBase $d.Name
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # Standard launcher icon
    $launcherPath = Join-Path $dir "ic_launcher.png"
    Resize-Image -Image $srcImg -Width $d.LauncherSize -Height $d.LauncherSize -DestinationPath $launcherPath -ScaleFactor 0.95

    # Round launcher icon
    $roundPath = Join-Path $dir "ic_launcher_round.png"
    Resize-Image -Image $srcImg -Width $d.LauncherSize -Height $d.LauncherSize -DestinationPath $roundPath -ScaleFactor 0.95

    # Foreground adaptive icon (scaled to 72% safe zone within 108dp canvas)
    $fgPath = Join-Path $dir "ic_launcher_foreground.png"
    Resize-Image -Image $srcImg -Width $d.ForegroundSize -Height $d.ForegroundSize -DestinationPath $fgPath -ScaleFactor 0.72
}

$srcImg.Dispose()
Write-Output "All Android icons generated successfully!"
