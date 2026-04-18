# cf-setup.ps1 – Cloudflare DDNS einmalig konfigurieren
# Ruft Cloudflare API ab um Zone-ID und Record-ID fuer ssh.buchungswerk.org zu ermitteln
# und schreibt .ddns.env auf den Pi

param(
    [Parameter(Mandatory=$true)]
    [string]$CfToken   # Cloudflare API-Token (DNS:Edit Berechtigung)
)

$PI_LOCAL  = "senor_d@192.168.68.54"
$PI_REMOTE = "senor_d@ssh.buchungswerk.org"
$KEY       = "$HOME\.ssh\id_buchungswerk"
$SSH_OPTS  = @("-n", "-4", "-i", $KEY, "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=accept-new")
$SCP_OPTS  = @("-4", "-i", $KEY, "-o", "StrictHostKeyChecking=accept-new")

Write-Host "Cloudflare DDNS Setup fuer ssh.buchungswerk.org..." -ForegroundColor Cyan

# Pi ermitteln
if (Test-Connection -ComputerName 192.168.68.54 -Count 1 -Quiet -ErrorAction SilentlyContinue) {
    $PI = $PI_LOCAL; Write-Host "Heimnetz."
} else {
    $PI = $PI_REMOTE; Write-Host "Tunnel."
}

# Cloudflare Zone-ID abrufen
Write-Host "Rufe Zone-ID fuer buchungswerk.org ab..."
$zoneResp = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones?name=buchungswerk.org" `
    -Headers @{ "Authorization" = "Bearer $CfToken"; "Content-Type" = "application/json" }

if (-not $zoneResp.success) {
    Write-Error "Cloudflare API Fehler: $($zoneResp.errors | ConvertTo-Json)"
    exit 1
}
$zoneId = $zoneResp.result[0].id
Write-Host "Zone-ID: $zoneId" -ForegroundColor Green

# Record-ID fuer ssh.buchungswerk.org abrufen
Write-Host "Rufe Record-ID fuer ssh.buchungswerk.org ab..."
$recResp = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?type=A&name=ssh.buchungswerk.org" `
    -Headers @{ "Authorization" = "Bearer $CfToken"; "Content-Type" = "application/json" }

if (-not $recResp.success -or $recResp.result.Count -eq 0) {
    Write-Error "Record ssh.buchungswerk.org nicht gefunden! Pruefen ob er in Cloudflare existiert."
    exit 1
}
$recordId = $recResp.result[0].id
$currentIp = $recResp.result[0].content
$isProxied = $recResp.result[0].proxied
Write-Host "Record-ID: $recordId" -ForegroundColor Green
Write-Host "Aktuelle IP: $currentIp" -ForegroundColor Green
Write-Host "Proxied: $isProxied" -ForegroundColor $(if ($isProxied) { "Red" } else { "Green" })

if ($isProxied) {
    Write-Host ""
    Write-Host "WARNUNG: ssh.buchungswerk.org ist noch als Cloudflare-Proxy eingetragen!" -ForegroundColor Red
    Write-Host "SSH (Port 22) funktioniert nur mit 'DNS only' (grauer Cloud)." -ForegroundColor Red
    Write-Host ""
    Write-Host "Setze auf DNS-only via API..." -ForegroundColor Yellow

    $patchResp = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId" `
        -Method Patch `
        -Headers @{ "Authorization" = "Bearer $CfToken"; "Content-Type" = "application/json" } `
        -Body '{"proxied":false}'

    if ($patchResp.success) {
        Write-Host "ssh.buchungswerk.org ist jetzt DNS only (grey cloud)!" -ForegroundColor Green
    } else {
        Write-Error "Konnte Proxy-Status nicht aendern: $($patchResp.errors | ConvertTo-Json)"
    }
}

# .ddns.env auf Pi schreiben
$ddnsEnv = "CF_TOKEN=$CfToken`nCF_ZONE_ID=$zoneId`nCF_RECORD_ID=$recordId"
$tmp = [System.IO.Path]::GetTempFileName()
$ddnsEnv | Out-File -FilePath $tmp -Encoding utf8 -NoNewline
& scp @SCP_OPTS $tmp "${PI}:/home/senor_d/.ddns.env"
Remove-Item $tmp
& ssh @SSH_OPTS $PI "chmod 600 /home/senor_d/.ddns.env"

# Einmaligen DDNS-Lauf ausfuehren
Write-Host "Fuehre DDNS-Update aus..."
& ssh @SSH_OPTS $PI "/home/senor_d/ddns-buchungswerk.sh"

Write-Host ""
Write-Host "DDNS Setup abgeschlossen!" -ForegroundColor Green
Write-Host "Der Pi aktualisiert ssh.buchungswerk.org automatisch alle 5 Minuten." -ForegroundColor Green
Write-Host ""
Write-Host "Teste SSH-Verbindung von ausserhalb:"
Write-Host "  ssh -i ~/.ssh/id_buchungswerk senor_d@ssh.buchungswerk.org" -ForegroundColor Cyan
