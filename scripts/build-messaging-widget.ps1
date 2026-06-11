# Build floating messaging widget into influnet/messaging/
$ErrorActionPreference = "Stop"
$Root = Join-Path $PSScriptRoot ".." "messaging-widget"
Push-Location $Root
try {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is required to build messaging-widget"
  }
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Built -> influnet/messaging/infl-messenger.js"
} finally {
  Pop-Location
}
