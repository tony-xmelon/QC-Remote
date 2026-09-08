$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceIcon = Join-Path $repoRoot "packages\typescript\qc-theme\assets\app-icon.svg"
$tauriRoot = Join-Path $repoRoot "apps\windows\src-tauri"
$windowsIcon = Join-Path $tauriRoot "icons\icon.png"

if (-not (Test-Path -LiteralPath $sourceIcon -PathType Leaf)) {
    throw "The canonical QC Remote SVG icon is missing: $sourceIcon"
}

Push-Location $tauriRoot
try {
    npx tauri icon $sourceIcon
    if ($LASTEXITCODE -ne 0) { throw "Tauri icon generation failed." }
}
finally { Pop-Location }

& (Join-Path $PSScriptRoot "generate-android-branding.ps1") -SourceIcon $windowsIcon
Write-Output "Generated Windows and Android assets from the shared QC Remote SVG icon."
