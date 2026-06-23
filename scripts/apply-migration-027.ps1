# Apply migration 027 — fixes public influencer profile RPC (ambiguous ip.user_id)
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Sql = Join-Path $RepoRoot "supabase\migrations\027_fix_get_public_influencer.sql"
$ProjectUrl = "https://supabase.com/dashboard/project/hrpaqufvjcihnjrjnpej/sql/new"

if (-not (Test-Path $Sql)) {
  Write-Error "Missing $Sql"
}

Write-Host "Public profile fix (migration 027)"
Write-Host "-----------------------------------"
Write-Host "1. Open Supabase SQL Editor:"
Write-Host "   $ProjectUrl"
Write-Host "2. Paste the full contents of:"
Write-Host "   $Sql"
Write-Host "3. Click Run"
Write-Host ""
Write-Host "This replaces get_public_influencer so /influnet/:username works for everyone (including logged-out visitors)."
Write-Host ""

if (Get-Command Set-Clipboard -ErrorAction SilentlyContinue) {
  Get-Content $Sql -Raw | Set-Clipboard
  Write-Host "SQL copied to clipboard."
} else {
  Write-Host "--- SQL preview (first 20 lines) ---"
  Get-Content $Sql -Head 20
}
