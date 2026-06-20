param(
  [switch]$NoServer,
  [switch]$NoDashboard
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPort = 3001
$dashPort = 5173

Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        PayFlow — Smart Routing       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan

if (-not $NoServer) {
  Write-Host "`n[1/2] Starting PayFlow Server (port $serverPort)..." -ForegroundColor Green
  $env:PAYFLOW_MODE = "local"
  $env:PORT = $serverPort.ToString()
  $serverJob = Start-Job -Name "payflow-server" -ScriptBlock {
    param($dir, $port)
    Set-Location -LiteralPath $dir
    $env:PAYFLOW_MODE = "local"
    $env:PORT = $port
    npx tsx packages/payflow-server/src/index.ts
  } -ArgumentList $root, $serverPort.ToString()

  Start-Sleep -Seconds 5

  try {
    $h = Invoke-WebRequest -Uri "http://localhost:$serverPort/api/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "  ✓ Server OK" -ForegroundColor Green
  } catch {
    Write-Host "  ✗ Server failed to start" -ForegroundColor Red
    exit 1
  }
}

if (-not $NoDashboard) {
  Write-Host "[2/2] Starting PayFlow Dashboard (port $dashPort)..." -ForegroundColor Green
  $dashDir = Join-Path $root "packages\payflow-dashboard"
  $dashJob = Start-Job -Name "payflow-dash" -ScriptBlock {
    param($dir)
    Set-Location -LiteralPath $dir
    & "..\..\node_modules\.bin\vite" --port 5173
  } -ArgumentList $dashDir

  Start-Sleep -Seconds 4

  try {
    $d = Invoke-WebRequest -Uri "http://localhost:$dashPort/" -UseBasicParsing -TimeoutSec 3
    Write-Host "  ✓ Dashboard OK" -ForegroundColor Green
  } catch {
    Write-Host "  ✗ Dashboard may not be ready yet" -ForegroundColor Yellow
  }
}

Write-Host "`n══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Dashboard: http://localhost:$dashPort" -ForegroundColor White
Write-Host "  API:       http://localhost:$serverPort" -ForegroundColor White
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop both servers.`n" -ForegroundColor Gray

try {
  while ($true) { Start-Sleep -Seconds 60 }
} finally {
  Get-Job -Name "payflow-server" -ErrorAction SilentlyContinue | Stop-Job | Remove-Job
  Get-Job -Name "payflow-dash" -ErrorAction SilentlyContinue | Stop-Job | Remove-Job
  Write-Host "`nServers stopped." -ForegroundColor Yellow
}
