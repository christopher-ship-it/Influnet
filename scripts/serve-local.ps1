# Serve the influnet/ site locally (SPA). Uses port 5000 by default.
param(
  [int]$Port = 5000
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Site = Join-Path $RepoRoot "influnet"
$IndexPath = Join-Path $Site "index.html"

if (-not (Test-Path $IndexPath)) {
  Write-Error "Missing $IndexPath - run from repo root after build."
}

# Free the port if something stale is listening
$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $procId = $conn.OwningProcess | Select-Object -First 1
  Write-Host "Stopping process on port $Port (PID $procId)..."
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

$url = "http://127.0.0.1:$Port/"
Write-Host "Serving $Site"
Write-Host "Open $url"
Write-Host "Press Ctrl+C to stop."
Set-Location $Site
npx --yes serve -s -l $Port .
