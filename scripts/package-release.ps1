$ErrorActionPreference = "Stop"
$rootDir = (Resolve-Path "$PSScriptRoot/..").Path
Set-Location $rootDir

$configPath = Join-Path $rootDir "neutralino.config.json"
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$version = $config.version

$distWeekBox = Join-Path $rootDir "dist/WeekBox"
$releaseAssetsDir = Join-Path $rootDir "dist/release-assets"

if (-not (Test-Path $distWeekBox)) {
    Write-Error "dist/WeekBox does not exist. Run build first."
}

New-Item -ItemType Directory -Path $releaseAssetsDir -Force | Out-Null

$assets = @{
    "WeekBox-linux_arm64"     = "WeekBox-$version-linux-arm64.zip"
    "WeekBox-linux_armhf"     = "WeekBox-$version-linux-armhf.zip"
    "WeekBox-linux_x64"       = "WeekBox-$version-linux-x64.zip"
    "WeekBox-mac_arm64"       = "WeekBox-$version-macos-arm64.zip"
    "WeekBox-mac_universal"   = "WeekBox-$version-macos-universal.zip"
    "WeekBox-mac_x64"         = "WeekBox-$version-macos-x64.zip"
    "WeekBox-win_x64.exe"     = "WeekBox-$version-windows-x64.zip"
}

$resourcesNeu = Join-Path $distWeekBox "resources.neu"
$extensionsDir = Join-Path $distWeekBox "extensions"

foreach ($entry in $assets.GetEnumerator()) {
    $binaryName = $entry.Key
    $zipName = $entry.Value
    $binaryPath = Join-Path $distWeekBox $binaryName

    if (Test-Path $binaryPath) {
        $items = @($binaryPath, $resourcesNeu)
        if (Test-Path $extensionsDir) {
            $items += $extensionsDir
        }
        $destZip = Join-Path $releaseAssetsDir $zipName
        Write-Host "Creating $zipName..."
        Compress-Archive -LiteralPath $items -DestinationPath $destZip -Force
    }
}

Copy-Item $resourcesNeu (Join-Path $releaseAssetsDir "WeekBox-$version-resources.neu") -Force
Write-Host "Packaging completed successfully."
Get-ChildItem $releaseAssetsDir | Select-Object Name, Length
