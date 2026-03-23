# BuchungsWerk - Git Push
# Verwendung: .\gitpush.ps1
#             .\gitpush.ps1 "Eigene Commit-Nachricht"

param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $Message) {
  $datum = Get-Date -Format "yyyy-MM-dd HH:mm"
  $Message = "Update BuchungsWerk ($datum)"
}

Write-Host "-- Git Status --" -ForegroundColor Cyan
git status

Write-Host "`n-- Staging --" -ForegroundColor Cyan
git add BuchungsWerk.jsx

Write-Host "`n-- Commit: $Message" -ForegroundColor Cyan
git commit -m $Message

Write-Host "`n-- Push nach GitHub --" -ForegroundColor Cyan
git push

Write-Host "`nFertig!" -ForegroundColor Green
