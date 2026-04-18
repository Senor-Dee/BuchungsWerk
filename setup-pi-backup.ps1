$PI_LOCAL  = "senor_d@192.168.68.54"
$PI_REMOTE = "senor_d@ssh.buchungswerk.org"
$KEY       = "$HOME\.ssh\id_buchungswerk"

function Invoke-SSH($target, $cmd) {
    & ssh -n -i $KEY -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new $target $cmd
}

Write-Host "Netzwerk pruefen..."
if (Test-Connection -ComputerName 192.168.68.54 -Count 1 -Quiet -ErrorAction SilentlyContinue) {
    $PI = $PI_LOCAL; Write-Host "Heimnetz."
} else {
    $PI = $PI_REMOTE; Write-Host "Tunnel."
}

# Backup-Script-Inhalt
$backupScript = @'
#!/bin/bash
set -e

DB_PATH="/home/senor_d/buchungswerk-backend/data/buchungswerk.db"
BACKUP_DIR="/home/senor_d/buchungswerk-backend/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Online-Dump (respektiert WAL, blockiert keine Schreibzugriffe)
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" ".dump" | gzip > "$BACKUP_DIR/buchungswerk-$TIMESTAMP.sql.gz"
    echo "[$(date)] Backup erstellt: buchungswerk-$TIMESTAMP.sql.gz"
else
    echo "[$(date)] WARNUNG: DB-Datei nicht gefunden: $DB_PATH"
    exit 1
fi

# Retention: alles aelter als 30 Tage loeschen
find "$BACKUP_DIR" -name "buchungswerk-*.sql.gz" -mtime +30 -delete
echo "[$(date)] Retention-Check abgeschlossen."
'@

# Temp-Datei fuer Upload
$tmpFile = [System.IO.Path]::GetTempFileName()
$backupScript | Out-File -FilePath $tmpFile -Encoding utf8 -NoNewline

Write-Host "Backup-Script hochladen..."
& scp -i $KEY -o StrictHostKeyChecking=accept-new $tmpFile "${PI}:/home/senor_d/backup-buchungswerk.sh"
Remove-Item $tmpFile

Write-Host "Permissions setzen..."
Invoke-SSH $PI "chmod +x /home/senor_d/backup-buchungswerk.sh"

Write-Host "Einmaligen Testlauf ausfuehren..."
Invoke-SSH $PI "/home/senor_d/backup-buchungswerk.sh"

Write-Host "Cron-Job einrichten (täglich 02:00 Uhr)..."
# Bestehenden Cron laden, Duplikate vermeiden, dann neu setzen
Invoke-SSH $PI "
    (crontab -l 2>/dev/null | grep -v 'backup-buchungswerk'; echo '0 2 * * * /home/senor_d/backup-buchungswerk.sh >> /home/senor_d/buchungswerk-backup.log 2>&1') | crontab -
"

Write-Host "Cron-Job verifizieren..."
Invoke-SSH $PI "crontab -l | grep backup-buchungswerk"

Write-Host "Backup-Datei pruefen..."
Invoke-SSH $PI "ls -lh /home/senor_d/buchungswerk-backend/backups/"

Write-Host ""
Write-Host "Pi-DB-Backup erfolgreich eingerichtet!"
