# ─────────────────────────────────────────────────────────────────────────────
# run_cohesive.ps1 — Houston AI Watchdog launcher (Windows PowerShell)
# Starts the FastAPI backend (port 8000) and Vite frontend (port 5173).
# ─────────────────────────────────────────────────────────────────────────────

$Root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host ""
Write-Host "  Houston AI Watchdog"
Write-Host "  Trust layer for multi-agent AI systems"
Write-Host ""

# ── Backend ──────────────────────────────────────────────────────────────────
Write-Host "[ 1/4 ] Setting up Python virtual environment..."
$VenvPath = Join-Path $Backend "venv"
if (-not (Test-Path $VenvPath)) {
    python -m venv $VenvPath
}

$ActivateScript = Join-Path $VenvPath "Scripts\Activate.ps1"
& $ActivateScript

Write-Host "[ 2/4 ] Installing backend dependencies..."
pip install -q -r (Join-Path $Backend "requirements.txt")

Write-Host "[ 3/4 ] Starting FastAPI backend on http://localhost:8000 ..."
$BackendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    & (Join-Path $using:VenvPath "Scripts\python.exe") -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList $Backend

Start-Sleep -Seconds 2

# ── Frontend ─────────────────────────────────────────────────────────────────
Write-Host "[ 4/4 ] Installing frontend dependencies and starting Vite..."
Set-Location $Frontend
npm install --silent
$FrontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList $Frontend

Write-Host ""
Write-Host "  Houston AI Watchdog is running"
Write-Host "  Frontend  -->  http://localhost:5173"
Write-Host "  Backend   -->  http://localhost:8000"
Write-Host "  API docs  -->  http://localhost:8000/docs"
Write-Host ""
Write-Host "  Press Ctrl+C to stop both servers."
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 2
        $BackendJob  | Receive-Job | Write-Host
        $FrontendJob | Receive-Job | Write-Host
    }
} finally {
    Stop-Job $BackendJob
    Stop-Job $FrontendJob
    Remove-Job $BackendJob
    Remove-Job $FrontendJob
    Write-Host "Servers stopped."
}
