param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Desktop = Join-Path $Root "desktop"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"

if (-not $SkipInstall) {
    if (-not (Test-Path $Python)) {
        Push-Location $Backend
        python -m venv .venv
        & $Python -m pip install -r requirements.txt
        Pop-Location
    }

    Push-Location $Backend
    & $Python -m pip install pyinstaller
    Pop-Location

    Push-Location $Desktop
    npm.cmd install
    Pop-Location
}

Push-Location $Backend
if (Test-Path "dist\papercat-backend.exe") {
    Remove-Item "dist\papercat-backend.exe" -Force
}
& $Python -m PyInstaller `
    --name papercat-backend `
    --onefile `
    --clean `
    --paths . `
    --hidden-import app.main `
    --collect-all fitz `
    run_backend.py
Pop-Location

Push-Location $Desktop
npm.cmd run build
Pop-Location

& (Join-Path $PSScriptRoot "package_portable_folder.ps1") -SkipBuild

Write-Host "Build complete."
Write-Host "Portable app output: desktop\release\PaperCat-portable"
Write-Host "Portable zip output: desktop\release\PaperCat-portable.zip"
