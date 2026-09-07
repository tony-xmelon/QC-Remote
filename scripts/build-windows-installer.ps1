param(
    [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
if (-not $SkipPreflight) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repositoryRoot "scripts\verify-software-parity.ps1") -BuildApps -RequireClean
    if ($LASTEXITCODE -ne 0) { throw "Software parity preflight failed; Windows installer build was not started." }
}
$buildLockPath = Join-Path $repositoryRoot "apps\windows\src-tauri\target\qc-control-installer.lock"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $buildLockPath) | Out-Null
try {
    $buildLock = [System.IO.File]::Open($buildLockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
}
catch {
    throw "Another QC Remote installer build is already running. Wait for it to finish before starting another build."
}
if ([string]::IsNullOrWhiteSpace($env:CARGO_TARGET_DIR)) {
    $env:CARGO_TARGET_DIR = Join-Path $env:LOCALAPPDATA "QCControlBuild\cargo-target"
}
$nativeBrokerRoot = Join-Path $repositoryRoot "services\device-broker"
$tauriRoot = Join-Path $repositoryRoot "apps\windows\src-tauri"
$binaryDirectory = Join-Path $tauriRoot "binaries"
$sidecarBuildDirectory = Join-Path $tauriRoot "target\sidecar-build"
$rustVersion = @(& rustc -vV 2>&1)
$rustExitCode = $LASTEXITCODE
$rustHostLine = $rustVersion | Where-Object { "$_" -match "^host:\s*" } | Select-Object -First 1
if ($rustExitCode -ne 0 -or -not $rustHostLine) {
    throw "Could not determine the active Rust host target."
}
$rustHost = ($rustHostLine -split ":", 2)[1].Trim()
& node (Join-Path $PSScriptRoot "version-app.mjs") sync
if ($LASTEXITCODE -ne 0) { throw "Could not synchronize the Windows app version." }

New-Item -ItemType Directory -Force -Path $binaryDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $sidecarBuildDirectory | Out-Null

& cargo build --release --manifest-path (Join-Path $nativeBrokerRoot "Cargo.toml")
if ($LASTEXITCODE -ne 0) { throw "Could not build the native QC device broker." }
$nativeBrokerSource = Join-Path $env:CARGO_TARGET_DIR "release\qc-device-broker.exe"
if (-not (Test-Path -LiteralPath $nativeBrokerSource -PathType Leaf)) {
    throw "Native QC broker build output is missing: $nativeBrokerSource"
}
$nativeBrokerTarget = Join-Path $binaryDirectory "qc-device-broker-$rustHost.exe"
Copy-Item -LiteralPath $nativeBrokerSource -Destination $nativeBrokerTarget -Force
& node (Join-Path $repositoryRoot "tools\verify-packaged-gateway.mjs") $nativeBrokerTarget
if ($LASTEXITCODE -ne 0) { throw "The Rust device gateway does not match the current application API." }
foreach ($windowsTarget in @("x86_64-pc-windows-msvc", "x86_64-pc-windows-gnu")) {
    $targetNativeBroker = Join-Path $binaryDirectory "qc-device-broker-$windowsTarget.exe"
    if ($targetNativeBroker -ne $nativeBrokerTarget) {
        Copy-Item -LiteralPath $nativeBrokerSource -Destination $targetNativeBroker -Force
    }
}
& node (Join-Path $repositoryRoot "tools\verify-packaged-gateway.mjs") (Join-Path $binaryDirectory "qc-device-broker-x86_64-pc-windows-msvc.exe")
if ($LASTEXITCODE -ne 0) { throw "The Windows bundle target contains a mismatched Rust device gateway." }

Push-Location $repositoryRoot
try {
    npm run tauri:build
    if ($LASTEXITCODE -ne 0) { throw "Could not build the Windows app and installer." }
}
finally {
    Pop-Location
}
$tauriConfig = Get-Content -LiteralPath (Join-Path $tauriRoot "tauri.conf.json") -Raw | ConvertFrom-Json
$expectedInstallerName = "$($tauriConfig.productName)_$($tauriConfig.version)_x64-setup.exe"
$expectedInstallerPath = Join-Path $env:CARGO_TARGET_DIR "release\bundle\nsis\$expectedInstallerName"
$windowsInstallers = @(Get-Item -LiteralPath $expectedInstallerPath -ErrorAction SilentlyContinue | ForEach-Object FullName)
if ($windowsInstallers.Count -ne 1) {
    throw "The Windows installer build completed without its exact current-version NSIS artifact: $expectedInstallerPath"
}
$stagedInstallerPath = @(& node (Join-Path $repositoryRoot "tools\release-candidates.mjs") finalize windows $windowsInstallers[0])
if ($LASTEXITCODE -ne 0 -or $stagedInstallerPath.Count -ne 1) { throw "Could not finalize the Windows release candidate." }
$buildLock.Dispose()
