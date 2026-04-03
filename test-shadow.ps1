# ============================================================
# BuchungsWerk – Shadow Tester
# Adversarial · Security · Sprachqualität
#
# Usage:
#   .\test-shadow.ps1           → Vollständiger Lauf
#   .\test-shadow.ps1 --quick   → Schnell-Lauf (SHADOW_QUICK=1)
#   .\test-shadow.ps1 --lang    → Nur Sprachqualität
# ============================================================

param(
    [switch]$quick,
    [switch]$lang
)

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

function Write-Header($text) {
    Write-Host "`n══════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  $text" -ForegroundColor Red
    Write-Host "══════════════════════════════════════════`n" -ForegroundColor Red
}
function Write-OK($text)   { Write-Host "  ✅  $text" -ForegroundColor Green }
function Write-Fail($text) { Write-Host "  ❌  $text" -ForegroundColor Red }
function Write-Warn($text) { Write-Host "  ⚠️   $text" -ForegroundColor Yellow }
function Write-Info($text) { Write-Host "  ℹ️   $text" -ForegroundColor Cyan }

Write-Header "BuchungsWerk Shadow Tester"
Write-Info "Startzeit: $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')"

# Modus
if ($lang) {
    Write-Info "Modus: Nur Sprachqualität"
    $npmScript = "test:shadow:lang"
} elseif ($quick) {
    Write-Info "Modus: Quick"
    $env:SHADOW_QUICK = "1"
    $npmScript = "test:shadow"
} else {
    Write-Info "Modus: Vollständig"
    $env:SHADOW_QUICK = "0"
    $npmScript = "test:shadow"
}

Write-Host ""

# Script ausführen
try {
    npm run $npmScript
    $exitCode = $LASTEXITCODE
} catch {
    Write-Fail "Fehler beim Starten: $_"
    exit 1
}

Write-Host ""

# Ergebnis
switch ($exitCode) {
    0 { Write-OK "Shadow Tests abgeschlossen – keine kritischen Funde" }
    1 { Write-Fail "Fehler gefunden – Report prüfen!" }
    2 { Write-Fail "KRITISCHE FUNDE – sofort handeln!" }
    default { Write-Warn "Unbekannter Exit-Code: $exitCode" }
}

# Report-Pfad
$reportDir = Join-Path $ProjectDir "..\.claude\communication\TEST_REPORTS"
if (Test-Path $reportDir) {
    $latestReport = Get-ChildItem $reportDir -Filter "SHADOW_REPORT_*.md" |
                    Sort-Object LastWriteTime -Descending |
                    Select-Object -First 1
    if ($latestReport) {
        Write-Info "Report: $($latestReport.FullName)"
    }
}

Write-Host ""
exit $exitCode
