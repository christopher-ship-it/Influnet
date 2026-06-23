# Deploy phone-otp Edge Function + TWOFACTOR_API_KEY secret
# Prerequisites: migration 022 applied in Supabase SQL Editor
#
# Usage:
#   1. npx supabase login
#   2. Add to .env (repo root, never commit): TWOFACTOR_API_KEY=your_key_from_2factor.in
#   3. .\scripts\deploy-phone-otp.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$EnvFile = Join-Path $RepoRoot ".env"

function Load-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return @{} }
    $vars = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $k = $line.Substring(0, $idx).Trim()
        $v = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
        $vars[$k] = $v
    }
    return $vars
}

$dotenv = Load-DotEnv $EnvFile
$twoFactorKey = $env:TWOFACTOR_API_KEY
if (-not $twoFactorKey -and $dotenv["TWOFACTOR_API_KEY"]) {
    $twoFactorKey = $dotenv["TWOFACTOR_API_KEY"]
}

if (-not $twoFactorKey) {
    Write-Host "ERROR: TWOFACTOR_API_KEY not set." -ForegroundColor Red
    Write-Host "  Add to $EnvFile : TWOFACTOR_API_KEY=your_key"
    Write-Host "  Or: `$env:TWOFACTOR_API_KEY='your_key'; .\scripts\deploy-phone-otp.ps1"
    exit 1
}

$supabase = "npx --yes supabase@latest"
Push-Location $RepoRoot

Write-Host "Checking Supabase CLI auth..."
& cmd /c "$supabase projects list 2>&1" | Out-String | ForEach-Object {
    if ($_ -match "Access token not provided") {
        Write-Host "ERROR: Not logged in. Run: npx supabase login" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

Write-Host "Linking project hrpaqufvjcihnjrjnpej (if needed)..."
& cmd /c "$supabase link --project-ref hrpaqufvjcihnjrjnpej 2>&1"

Write-Host "Setting TWOFACTOR_API_KEY secret..."
& cmd /c "$supabase secrets set TWOFACTOR_API_KEY=$twoFactorKey --project-ref hrpaqufvjcihnjrjnpej"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: secrets set failed (exit $LASTEXITCODE)" -ForegroundColor Red
    Pop-Location
    exit $LASTEXITCODE
}

Write-Host "Deploying phone-otp function (public, no JWT — required for browser CORS)..."
& cmd /c "$supabase functions deploy phone-otp --no-verify-jwt --project-ref hrpaqufvjcihnjrjnpej"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: phone-otp deploy failed" -ForegroundColor Red
    Pop-Location
    exit $LASTEXITCODE
}

Write-Host "Deploying auth-signup function (OTP signup, no email confirmation)..."
& cmd /c "$supabase functions deploy auth-signup --no-verify-jwt --project-ref hrpaqufvjcihnjrjnpej"
$deployExit = $LASTEXITCODE

Pop-Location

if ($deployExit -ne 0) {
    Write-Host "ERROR: auth-signup deploy failed (exit $deployExit)" -ForegroundColor Red
    exit $deployExit
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "phone-otp:  https://hrpaqufvjcihnjrjnpej.supabase.co/functions/v1/phone-otp"
Write-Host "auth-signup: https://hrpaqufvjcihnjrjnpej.supabase.co/functions/v1/auth-signup"
Write-Host "Signup: mobile OTP verifies the user; email is collected but not confirmed."
Write-Host "Ensure migrations 022+ are applied in SQL Editor."
