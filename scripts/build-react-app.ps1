# Build React app from influnet.io and copy into d:\influnet\app
$ErrorActionPreference = "Stop"
$Monorepo = "D:\influnet.io\Influnet-Io\Influnet-Io"
$Artifact = Join-Path $Monorepo "artifacts\influnet"
$Dist = Join-Path $Artifact "dist\public"
$Target = "D:\influnet\app"

if (-not (Test-Path $Monorepo)) {
  Write-Error "Monorepo not found: $Monorepo"
}

Push-Location $Monorepo
try {
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pnpm via npm..."
    npm install -g pnpm
  }
  # Monorepo preinstall uses `sh` (Git Bash/WSL). On Windows without sh, use WSL or Replit.
  pnpm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Retrying with --ignore-scripts (may need WSL/Replit for a clean install)..."
    pnpm install --ignore-scripts
  }
  $env:PORT = "5000"
  $env:BASE_PATH = "/app/"
  pnpm --filter @workspace/influnet build
} finally {
  Pop-Location
}

if (-not (Test-Path $Dist)) {
  Write-Error "Build output not found: $Dist"
}

Get-ChildItem $Target -Exclude README.md | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $Dist "*") -Destination $Target -Recurse -Force
Write-Host "Copied React build to $Target"
Write-Host "Serve locally:  py D:\influnet\main.py"
Write-Host "Deploy:         cd D:\influnet; firebase deploy --only hosting"
