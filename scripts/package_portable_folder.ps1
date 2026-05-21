param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Desktop = Join-Path $Root "desktop"
$ElectronDist = Join-Path $Desktop "node_modules\electron\dist"
$Output = Join-Path $Desktop "release\PaperCat-portable"
$StageRoot = Join-Path $Desktop "release\portable-app-stage"
$AppDir = Join-Path $StageRoot "app"
$BackendOut = Join-Path $Output "resources\backend"
$BackendExe = Join-Path $Backend "dist\papercat-backend.exe"
$AsarCli = Join-Path $Desktop "node_modules\@electron\asar\bin\asar.js"

if (-not (Test-Path $ElectronDist)) {
    throw "Electron runtime not found. Run npm install in desktop first."
}

if (-not $SkipBuild) {
    Push-Location $Desktop
    npm.cmd run build
    Pop-Location
}

if (-not (Test-Path $BackendExe)) {
    throw "Backend executable not found: $BackendExe. Run build_windows.cmd first."
}

Get-Process -ErrorAction SilentlyContinue |
    Where-Object {
        try {
            $_.Path -and ($_.Path -like "$Output\*" -or $_.Path -like "$Output/*")
        } catch {
            $false
        }
    } |
    Stop-Process -Force -ErrorAction SilentlyContinue

if (Test-Path $Output) {
    Remove-Item -LiteralPath $Output -Recurse -Force
}
if (Test-Path $StageRoot) {
    Remove-Item -LiteralPath $StageRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $Output | Out-Null
Copy-Item -Path (Join-Path $ElectronDist "*") -Destination $Output -Recurse -Force
Remove-Item -LiteralPath (Join-Path $Output "resources\default_app.asar") -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $Output "debug.log") -Force -ErrorAction SilentlyContinue

$ElectronExe = Join-Path $Output "electron.exe"
$PaperCatExe = Join-Path $Output "PaperCat.exe"
if (Test-Path $PaperCatExe) {
    Remove-Item -LiteralPath $PaperCatExe -Force
}
Rename-Item -LiteralPath $ElectronExe -NewName "PaperCat.exe"

New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
Copy-Item -LiteralPath (Join-Path $Desktop "dist") -Destination $AppDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Desktop "electron") -Destination $AppDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Desktop "package.json") -Destination $AppDir -Force
node $AsarCli pack $AppDir (Join-Path $Output "resources\app.asar")
Remove-Item -LiteralPath $StageRoot -Recurse -Force

New-Item -ItemType Directory -Force -Path $BackendOut | Out-Null
Copy-Item -LiteralPath $BackendExe -Destination (Join-Path $BackendOut "papercat-backend.exe") -Force

Compress-Archive -LiteralPath $Output -DestinationPath (Join-Path $Desktop "release\PaperCat-portable.zip") -Force

Write-Host "Portable folder ready:"
Write-Host $Output
Write-Host "Run:"
Write-Host (Join-Path $Output "PaperCat.exe")
Write-Host "Zip:"
Write-Host (Join-Path $Desktop "release\PaperCat-portable.zip")
