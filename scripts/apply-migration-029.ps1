# Apply migration 029 (connections table)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$migration = Join-Path $root "supabase\migrations\029_connections.sql"
if (-not (Test-Path $migration)) { throw "Missing $migration" }
Write-Host "Apply 029_connections.sql in Supabase SQL Editor:"
Write-Host $migration
Get-Content $migration | Set-Clipboard
Write-Host "SQL copied to clipboard."
