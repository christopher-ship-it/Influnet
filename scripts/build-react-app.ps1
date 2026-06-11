# Build React app from influnet.io and copy into d:\influnet\influnet
$ErrorActionPreference = "Stop"
$Monorepo = "D:\influnet.io\Influnet-Io\Influnet-Io"
$Artifact = Join-Path $Monorepo "artifacts\influnet"
$Dist = Join-Path $Artifact "dist\public"
$Site = "D:\influnet\influnet"
$Assets = Join-Path $Site "assets"

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

if (-not (Test-Path $Assets)) {
  New-Item -ItemType Directory -Path $Assets | Out-Null
}
Get-ChildItem $Assets -File | Remove-Item -Force
Copy-Item -Path (Join-Path $Dist "assets\*") -Destination $Assets -Force

foreach ($name in @("robots.txt", "opengraph.jpg")) {
  $src = Join-Path $Dist $name
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination $Site -Force
  }
}

$FaviconSrc = Join-Path $Site "Asset\favicon.png"
if (Test-Path $FaviconSrc) {
  Copy-Item -Path $FaviconSrc -Destination (Join-Path $Site "favicon.png") -Force
}

Get-ChildItem (Join-Path $Assets "index-*.js") | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $patched = $content.Replace('base:"/app/"', 'base:"/"')
  if ($content -ne $patched) {
    Set-Content -Path $_.FullName -Value $patched -NoNewline
    Write-Host "Patched router base in $($_.Name)"
  }
}

Write-Host "Copied React build assets to $Assets"
Write-Host "SPA entry: $Site\index.html (update script src if hashed names change)"
Write-Host "Deploy:      cd D:\influnet; firebase deploy --only hosting"
