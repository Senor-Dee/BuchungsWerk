$PI_LOCAL  = "senor_d@192.168.68.54"
$PI_REMOTE = "senor_d@ssh.buchungswerk.org"
$ROOT      = "C:\Project Buchungswerk"
$MAIN      = "$ROOT\buchungswerk-backend\main.py"
$KEY       = "$HOME\.ssh\id_buchungswerk"

# SSH-Optionen: -4 = IPv4 erzwingen (kein IPv6-Timeout); StrictHostKeyChecking=accept-new
$SSH_OPTS  = @("-n", "-4", "-i", $KEY, "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=accept-new")
$SCP_OPTS  = @("-4", "-i", $KEY, "-o", "StrictHostKeyChecking=accept-new")

function Invoke-SSH($target, $cmd) {
    & ssh @SSH_OPTS $target $cmd
}

function Invoke-SCP($src, $dst, [switch]$Recurse) {
    if ($Recurse) {
        & scp @SCP_OPTS -r $src $dst
    } else {
        & scp @SCP_OPTS $src $dst
    }
}

# 1. Pi erreichbar?
Write-Host "Netzwerk pruefen..."
if (Test-Connection -ComputerName 192.168.68.54 -Count 1 -Quiet -ErrorAction SilentlyContinue) {
    $PI = $PI_LOCAL; Write-Host "Heimnetz."
} else {
    # Tunnel (ssh.buchungswerk.org muss DNS-only / grauer Cloudflare-Record sein!)
    Write-Host "Kein Heimnetz – versuche Tunnel (ssh.buchungswerk.org)..."
    $testConn = Test-NetConnection -ComputerName "ssh.buchungswerk.org" -Port 22 -WarningAction SilentlyContinue
    if (-not $testConn.TcpTestSucceeded) {
        Write-Host ""
        Write-Host "FEHLER: Port 22 auf ssh.buchungswerk.org nicht erreichbar." -ForegroundColor Red
        Write-Host "Lösung: Cloudflare Dashboard → buchungswerk.org → DNS → 'ssh' Eintrag" -ForegroundColor Yellow
        Write-Host "        Orange Cloud-Icon → Grey Cloud (DNS only) umstellen, dann erneut versuchen." -ForegroundColor Yellow
        exit 1
    }
    $PI = $PI_REMOTE; Write-Host "Tunnel."
}

# 2. Quellcode hochladen
Write-Host "Lade Quellcode hoch..."
Invoke-SCP "$ROOT\package.json"   "${PI}:~/BuchungsWerk/package.json"
Invoke-SCP "$ROOT\vite.config.js" "${PI}:~/BuchungsWerk/vite.config.js"
Invoke-SCP "$ROOT\index.html"     "${PI}:~/BuchungsWerk/index.html"
Invoke-SCP "$ROOT\src"            "${PI}:~/BuchungsWerk/" -Recurse
Invoke-SCP "$ROOT\public"         "${PI}:~/BuchungsWerk/" -Recurse

# 3. Build auf dem Pi
Write-Host "Baue auf dem Pi..."
Invoke-SSH $PI "cd ~/BuchungsWerk && npm install && npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Build fehlgeschlagen!"; exit 1 }

# 4. Backend hochladen + API-Image neu bauen
if (Test-Path $MAIN) {
    Invoke-SCP $MAIN "$ROOT\buchungswerk-backend\docker-compose.yml" "$ROOT\buchungswerk-backend\Dockerfile" "$ROOT\buchungswerk-backend\requirements.txt" "${PI}:~/buchungswerk-backend/"
    Write-Host "Backend-Dateien hochgeladen. Baue API-Container neu..."
    Invoke-SSH $PI "cd ~/buchungswerk-backend && docker compose up --build -d buchungswerk-api"
    if ($LASTEXITCODE -ne 0) { Write-Error "API-Build fehlgeschlagen!"; exit 1 }
    Write-Host "API-Container neu gebaut und gestartet."
}

# 5. .env einmalig auf den Pi kopieren (nur wenn noch nicht vorhanden)
$envFile = "$ROOT\.env"
if (Test-Path $envFile) {
    $envExists = Invoke-SSH $PI "test -f ~/buchungswerk-backend/.env && echo yes || echo no"
    if ($envExists.Trim() -eq "no") {
        Invoke-SCP $envFile "${PI}:~/buchungswerk-backend/.env"
        Write-Host ".env auf Pi kopiert."
    } else {
        Write-Host ".env bereits vorhanden, nicht ueberschrieben."
    }
}

# 6. Frontend-Container neu starten
Write-Host "Starte Frontend-Container neu..."
Invoke-SSH $PI "cd ~/buchungswerk-backend && docker compose restart buchungswerk-app"

# 7. DB-Backup einmalig einrichten (nur wenn Cron-Job noch nicht existiert)
$cronCheck = Invoke-SSH $PI "crontab -l 2>/dev/null | grep -c backup-buchungswerk || echo 0"
if ($cronCheck.Trim() -eq "0") {
    Write-Host "DB-Backup einrichten (einmalig)..."
    $backupScript = @'
#!/bin/bash
set -e
DB_PATH="/home/senor_d/buchungswerk-backend/data/buchungswerk.db"
BACKUP_DIR="/home/senor_d/buchungswerk-backend/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" ".dump" | gzip > "$BACKUP_DIR/buchungswerk-$TIMESTAMP.sql.gz"
    echo "[$(date)] Backup erstellt: buchungswerk-$TIMESTAMP.sql.gz"
else
    echo "[$(date)] WARNUNG: DB nicht gefunden: $DB_PATH"; exit 1
fi
find "$BACKUP_DIR" -name "buchungswerk-*.sql.gz" -mtime +30 -delete
'@
    $tmp = [System.IO.Path]::GetTempFileName()
    $backupScript | Out-File -FilePath $tmp -Encoding utf8 -NoNewline
    Invoke-SCP $tmp "${PI}:/home/senor_d/backup-buchungswerk.sh"
    Remove-Item $tmp
    Invoke-SSH $PI "chmod +x /home/senor_d/backup-buchungswerk.sh"
    Invoke-SSH $PI "(crontab -l 2>/dev/null; echo '0 2 * * * /home/senor_d/backup-buchungswerk.sh >> /home/senor_d/buchungswerk-backup.log 2>&1') | crontab -"
    Invoke-SSH $PI "/home/senor_d/backup-buchungswerk.sh"
    Write-Host "DB-Backup eingerichtet (taeglicher Cron um 02:00 Uhr)."
} else {
    Write-Host "DB-Backup-Cron bereits aktiv."
}

# 8. DDNS-Script einmalig einrichten (haelt ssh.buchungswerk.org aktuell)
$ddnsCheck = Invoke-SSH $PI "crontab -l 2>/dev/null | grep -c ddns-buchungswerk || echo 0"
if ($ddnsCheck.Trim() -eq "0") {
    Write-Host "DDNS-Script einrichten (einmalig)..."
    $ddnsScript = @'
#!/bin/bash
# /home/senor_d/ddns-buchungswerk.sh
# Haelt den DNS-Record ssh.buchungswerk.org aktuell (Cloudflare API)
# Voraussetzung: CF_TOKEN und CF_ZONE_ID und CF_RECORD_ID in /home/senor_d/.ddns.env

ENV_FILE="/home/senor_d/.ddns.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "[$(date)] DDNS: .ddns.env nicht gefunden – Setup noetig. Bitte cf-setup.sh ausfuehren." >> /home/senor_d/ddns.log
    exit 0
fi
source "$ENV_FILE"

CURRENT_IP=$(curl -s -4 https://ifconfig.me)
if [ -z "$CURRENT_IP" ]; then
    echo "[$(date)] DDNS: Keine IP ermittelt." >> /home/senor_d/ddns.log
    exit 1
fi

STORED_IP=$(cat /tmp/ddns_last_ip 2>/dev/null || echo "")
if [ "$CURRENT_IP" = "$STORED_IP" ]; then
    exit 0  # Keine Aenderung
fi

# Cloudflare DNS-Record aktualisieren
RESPONSE=$(curl -s -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${CF_RECORD_ID}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"content\":\"${CURRENT_IP}\",\"proxied\":false}")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "[$(date)] DDNS: IP aktualisiert: $STORED_IP -> $CURRENT_IP" >> /home/senor_d/ddns.log
    echo "$CURRENT_IP" > /tmp/ddns_last_ip
else
    echo "[$(date)] DDNS: Fehler: $RESPONSE" >> /home/senor_d/ddns.log
fi
'@
    $tmp2 = [System.IO.Path]::GetTempFileName()
    $ddnsScript | Out-File -FilePath $tmp2 -Encoding utf8 -NoNewline
    Invoke-SCP $tmp2 "${PI}:/home/senor_d/ddns-buchungswerk.sh"
    Remove-Item $tmp2
    Invoke-SSH $PI "chmod +x /home/senor_d/ddns-buchungswerk.sh"
    Invoke-SSH $PI "(crontab -l 2>/dev/null; echo '*/5 * * * * /home/senor_d/ddns-buchungswerk.sh') | crontab -"
    Write-Host "DDNS-Script eingerichtet (alle 5 Minuten)."
    Write-Host ""
    Write-Host "WICHTIG: DDNS benoetigt noch Cloudflare-Zugangsdaten auf dem Pi!" -ForegroundColor Yellow
    Write-Host "Fuehre aus: cf-setup.sh (wird separat bereitgestellt)" -ForegroundColor Yellow
} else {
    Write-Host "DDNS-Cron bereits aktiv."
}

Write-Host "Fertig! https://buchungswerk.org"
