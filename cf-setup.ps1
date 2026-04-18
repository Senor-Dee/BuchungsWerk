# cf-setup.ps1 – SSH-Tunnel über Cloudflare API automatisch reparieren
# Loescht den CNAME-Tunnel-Eintrag fuer "ssh" und legt einen A-Record (DNS only) an
# Richtet dann DDNS auf dem Pi ein (automatische IP-Aktualisierung alle 5 Min)
#
# Verwendung: .\cf-setup.ps1 -CfToken "dein-cloudflare-api-token"
# Token erstellen: dash.cloudflare.com → Profil → API-Tokens → DNS:Edit

param(
    [Parameter(Mandatory=$true)]
    [string]$CfToken
)

$PI_LOCAL = "senor_d@192.168.68.54"
$PI_REMOTE = "senor_d@ssh.buchungswerk.org"
$KEY      = "$HOME\.ssh\id_buchungswerk"
$SSH_OPTS = @("-n", "-4", "-i", $KEY, "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=accept-new")
$SCP_OPTS = @("-4", "-i", $KEY, "-o", "StrictHostKeyChecking=accept-new")
$Headers  = @{ "Authorization" = "Bearer $CfToken"; "Content-Type" = "application/json" }

Write-Host ""
Write-Host "=== Cloudflare SSH-Fix fuer buchungswerk.org ===" -ForegroundColor Cyan
Write-Host ""

# Schritt 1: Zone-ID abrufen
Write-Host "[1/6] Zone-ID abrufen..."
$zoneResp = Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones?name=buchungswerk.org" -Headers $Headers
if (-not $zoneResp.success) { Write-Error "API-Token ungueltig oder keine Berechtigung!"; exit 1 }
$zoneId = $zoneResp.result[0].id
Write-Host "      Zone-ID: $zoneId" -ForegroundColor Green

# Schritt 2: Aktuelle öffentliche IP ermitteln
Write-Host "[2/6] Oeffentliche IP ermitteln..."
$publicIp = (Invoke-RestMethod "https://api.ipify.org?format=json").ip
Write-Host "      IP: $publicIp" -ForegroundColor Green

# Schritt 3: Alle "ssh"-Eintraege finden und loeschen (CNAME-Tunnel + ggf. alter A-Record)
Write-Host "[3/6] Alte 'ssh'-Eintraege loeschen..."
$allRecs = Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?name=ssh.buchungswerk.org" -Headers $Headers
foreach ($rec in $allRecs.result) {
    Write-Host "      Loesche: $($rec.type) $($rec.name) → $($rec.content)" -ForegroundColor Yellow
    Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$($rec.id)" `
        -Method Delete -Headers $Headers | Out-Null
}
Write-Host "      Alte Eintraege geloescht." -ForegroundColor Green

# Schritt 4: Neuen A-Record (DNS only, kein Proxy) anlegen
Write-Host "[4/6] Neuen A-Record anlegen (DNS only)..."
$body = @{ type="A"; name="ssh"; content=$publicIp; proxied=$false; ttl=60 } | ConvertTo-Json
$newRec = Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" `
    -Method Post -Headers $Headers -Body $body
if (-not $newRec.success) { Write-Error "A-Record konnte nicht erstellt werden: $($newRec.errors)"; exit 1 }
$recordId = $newRec.result.id
Write-Host "      A-Record erstellt: ssh.buchungswerk.org → $publicIp (DNS only, TTL 60s)" -ForegroundColor Green

# Schritt 5: Pi erreichbar?
Write-Host "[5/6] Pi-Verbindung testen..."
Start-Sleep -Seconds 3  # Kurz warten bis DNS propagiert
if (Test-Connection -ComputerName 192.168.68.54 -Count 1 -Quiet -ErrorAction SilentlyContinue) {
    $PI = $PI_LOCAL; Write-Host "      Heimnetz erreichbar." -ForegroundColor Green
} else {
    Write-Host "      Warte auf DNS-Propagierung (max. 60s)..."
    $tries = 0
    do {
        Start-Sleep -Seconds 5; $tries++
        $test = Test-NetConnection -ComputerName "ssh.buchungswerk.org" -Port 22 -WarningAction SilentlyContinue
    } while (-not $test.TcpTestSucceeded -and $tries -lt 12)

    if ($test.TcpTestSucceeded) {
        $PI = $PI_REMOTE; Write-Host "      Tunnel erreichbar (ssh.buchungswerk.org)!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "SSH noch nicht erreichbar. Moeglicherweise fehlt eine Router-Portweiterleitung." -ForegroundColor Red
        Write-Host "Fritzbox: Heimnetz → Netzwerk → Port 22 → 192.168.68.54" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "DNS-Record wurde gesetzt. Wenn Portweiterleitung aktiv ist, einfach nochmal ausfuehren." -ForegroundColor Yellow
        exit 0
    }
}

# Schritt 6: DDNS-Script auf Pi einrichten
Write-Host "[6/6] DDNS-Script auf Pi einrichten..."
$ddnsScript = @"
#!/bin/bash
ENV_FILE="/home/senor_d/.ddns.env"
[ ! -f "`$ENV_FILE" ] && exit 0
source "`$ENV_FILE"
CURRENT_IP=`$(curl -s -4 https://api.ipify.org)
[ -z "`$CURRENT_IP" ] && exit 1
STORED_IP=`$(cat /tmp/ddns_last_ip 2>/dev/null || echo "")
[ "`$CURRENT_IP" = "`$STORED_IP" ] && exit 0
RESPONSE=`$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/`${CF_ZONE_ID}/dns_records/`${CF_RECORD_ID}" \
    -H "Authorization: Bearer `${CF_TOKEN}" -H "Content-Type: application/json" \
    --data "{\"content\":\"`${CURRENT_IP}\",\"proxied\":false}")
if echo "`$RESPONSE" | grep -q '"success":true'; then
    echo "[`$(date)] DDNS: `$STORED_IP -> `$CURRENT_IP" >> /home/senor_d/ddns.log
    echo "`$CURRENT_IP" > /tmp/ddns_last_ip
fi
"@
$ddnsEnv = "CF_TOKEN=$CfToken`nCF_ZONE_ID=$zoneId`nCF_RECORD_ID=$recordId"

$tmp1 = [System.IO.Path]::GetTempFileName()
$tmp2 = [System.IO.Path]::GetTempFileName()
$ddnsScript | Out-File $tmp1 -Encoding utf8 -NoNewline
$ddnsEnv    | Out-File $tmp2 -Encoding utf8 -NoNewline
& scp @SCP_OPTS $tmp1 "${PI}:/home/senor_d/ddns-buchungswerk.sh"
& scp @SCP_OPTS $tmp2 "${PI}:/home/senor_d/.ddns.env"
Remove-Item $tmp1, $tmp2
& ssh @SSH_OPTS $PI "chmod +x /home/senor_d/ddns-buchungswerk.sh && chmod 600 /home/senor_d/.ddns.env"
& ssh @SSH_OPTS $PI "(crontab -l 2>/dev/null | grep -v ddns-buchungswerk; echo '*/5 * * * * /home/senor_d/ddns-buchungswerk.sh') | crontab -"
& ssh @SSH_OPTS $PI "/home/senor_d/ddns-buchungswerk.sh"
Write-Host "      DDNS laeuft (alle 5 Minuten)." -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Fertig! SSH funktioniert jetzt von ueberall:" -ForegroundColor Green
Write-Host " ssh -i ~/.ssh/id_buchungswerk senor_d@ssh.buchungswerk.org" -ForegroundColor Cyan
Write-Host " deploy.ps1 funktioniert von jedem Netz!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
