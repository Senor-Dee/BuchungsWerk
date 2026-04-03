# ============================================================
# BuchungsWerk – Digitaler Tester
# Usage:
#   .\test-digital.ps1           → Full Run (50 Iterationen)
#   .\test-digital.ps1 --quick   → Quick Run (10 Iterationen)
# ============================================================

param(
    [switch]$quick
)

$ErrorActionPreference = "Stop"

# Projektverzeichnis (Script liegt im Projektroot)
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

# Farben für Output
function Write-Header($text) {
    Write-Host "`n══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════`n" -ForegroundColor Cyan
}
function Write-OK($text)   { Write-Host "  ✅  $text" -ForegroundColor Green }
function Write-Fail($text) { Write-Host "  ❌  $text" -ForegroundColor Red }
function Write-Info($text) { Write-Host "  ℹ️   $text" -ForegroundColor Yellow }

Write-Header "BuchungsWerk Digitaler Tester"
Write-Info "Startzeit: $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')"

# Modus bestimmen
if ($quick) {
    Write-Info "Modus: Quick (10 Iterationen)"
    $npmScript = "test:digital:quick"
} else {
    Write-Info "Modus: Full (50 Iterationen)"
    $npmScript = "test:digital"
}

Write-Host ""

# npm Script ausführen
try {
    npm run $npmScript
    $exitCode = $LASTEXITCODE
} catch {
    Write-Fail "Fehler beim Starten: $_"
    exit 1
}

Write-Host ""

# Ergebnis auswerten
if ($exitCode -eq 0) {
    Write-OK "Alle Tests bestanden!"
} else {
    Write-Fail "Fehler gefunden – Report prüfen:"
}

# Neuesten Report-Pfad anzeigen
$reportDir = Join-Path $ProjectDir "..\.claude\communication\TEST_REPORTS"
if (Test-Path $reportDir) {
    $latestReport = Get-ChildItem $reportDir -Filter "TEST_REPORT_*.md" |
                    Sort-Object LastWriteTime -Descending |
                    Select-Object -First 1
    if ($latestReport) {
        Write-Info "Report: $($latestReport.FullName)"
    }
}

Write-Host ""
exit $exitCode
