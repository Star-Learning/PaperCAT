param(
    [int]$BackendPort = 8766,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Desktop = Join-Path $Root "desktop"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$Electron = Join-Path $Desktop "node_modules\electron\dist\electron.exe"
$Runtime = Join-Path $Desktop "runtime"
$LogDir = Join-Path $Runtime "logs"

function Wait-Health {
    param([string]$Url)
    for ($i = 0; $i -lt 30; $i++) {
        try {
            Invoke-RestMethod -Uri $Url -TimeoutSec 2 | Out-Null
            return
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    throw "Backend did not become ready: $Url"
}

if (-not $SkipInstall) {
    if (-not (Test-Path $Python)) {
        Push-Location $Backend
        python -m venv .venv
        & $Python -m pip install -r requirements.txt
        Pop-Location
    }

    if (-not (Test-Path (Join-Path $Desktop "node_modules"))) {
        Push-Location $Desktop
        npm.cmd install
        Pop-Location
    }
}

New-Item -ItemType Directory -Force -Path $Runtime, $LogDir | Out-Null

$oldElectron = Get-CimInstance Win32_Process |
    Where-Object { $_.ExecutablePath -eq $Electron -or $_.CommandLine -like "*PaperCAT*desktop*" }

foreach ($process in $oldElectron) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

Push-Location $Desktop
npm.cmd run build
Pop-Location

Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

$env:PAPER_CAT_BACKEND_PORT = [string]$BackendPort
$backendProcess = Start-Process -FilePath $Python `
    -ArgumentList "run_backend.py" `
    -WorkingDirectory $Backend `
    -WindowStyle Hidden `
    -PassThru

Wait-Health "http://127.0.0.1:$BackendPort/api/health"

Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$electronProcess = Start-Process -FilePath $Electron `
    -ArgumentList "." `
    -WorkingDirectory $Desktop `
    -RedirectStandardOutput (Join-Path $LogDir "electron.out.log") `
    -RedirectStandardError (Join-Path $LogDir "electron.err.log") `
    -PassThru

Write-Host "PaperCat started."
Write-Host "Backend PID: $($backendProcess.Id)  http://127.0.0.1:$BackendPort"
Write-Host "Electron PID: $($electronProcess.Id)"
Write-Host "Logs: $LogDir"
