# Build React app from influnet.io and copy into d:\influnet (site root SPA)
$ErrorActionPreference = "Stop"
$Monorepo = "D:\influnet.io\Influnet-Io\Influnet-Io"
$Artifact = Join-Path $Monorepo "artifacts\influnet"
$Dist = Join-Path $Artifact "dist\public"
$Root = "D:\influnet"
$Assets = Join-Path $Root "assets"

if (-not (Test-Path $Monorepo)) {
  Write-Error "Monorepo not found: $Monorepo. Clone/build influnet.io first."
}

Push-Location $Monorepo
try {
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pnpm via npm..."
    npm install -g pnpm
  }
  pnpm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Retrying with --ignore-scripts (may need WSL/Replit for a clean install)..."
    pnpm install --ignore-scripts
  }
  $env:PORT = "5000"
  $env:BASE_PATH = "/"
  pnpm --filter @workspace/influnet build
} finally {
  Pop-Location
}

if (-not (Test-Path $Dist)) {
  Write-Error "Build output not found: $Dist"
}

# Copy hashed bundles (preserve custom index.html shell at repo root)
if (-not (Test-Path $Assets)) {
  New-Item -ItemType Directory -Path $Assets | Out-Null
}
Get-ChildItem $Assets -File | Remove-Item -Force
Copy-Item -Path (Join-Path $Dist "assets\*") -Destination $Assets -Force

foreach ($name in @("favicon.svg", "robots.txt", "opengraph.jpg")) {
  $src = Join-Path $Dist $name
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination $Root -Force
  }
}

# Ensure Wouter base matches root hosting
Get-ChildItem (Join-Path $Assets "index-*.js") | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $patched = $content.Replace('base:"/app/"', 'base:"/"')
  if ($content -ne $patched) {
    Set-Content -Path $_.FullName -Value $patched -NoNewline
    Write-Host "Patched router base in $($_.Name)"
  }
}

Write-Host "Copied React build assets to $Assets"
Write-Host "SPA entry: $Root\index.html (committed shell; update script src if hashed names change)"
Write-Host "Deploy:      cd $Root; firebase deploy --only hosting"
