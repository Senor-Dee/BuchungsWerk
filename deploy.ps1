$PI_LOCAL  = "senor_d@192.168.68.54"
$PI_REMOTE = "senor_d@ssh.buchungswerk.org"
$ROOT      = "C:\Project Buchungswerk"
$MAIN      = "$ROOT\main.py"
$KEY       = "$HOME\.ssh\id_buchungswerk"

function Invoke-SSH($target, $cmd) {
    & ssh -n -i $KEY -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new $target $cmd
}

# 1. Pi erreichbar?
Write-Host "Netzwerk pruefen..."
if (Test-Connection -ComputerName 192.168.68.54 -Count 1 -Quiet -ErrorAction SilentlyContinue) {
    $PI = $PI_LOCAL; Write-Host "Heimnetz."
} else {
    $PI = $PI_REMOTE; Write-Host "Tunnel."
}

# 2. Quellcode hochladen
Write-Host "Lade Quellcode hoch..."
& scp -i $KEY -o StrictHostKeyChecking=accept-new "$ROOT\package.json"   "${PI}:~/BuchungsWerk/package.json"
& scp -i $KEY -o StrictHostKeyChecking=accept-new "$ROOT\vite.config.js" "${PI}:~/BuchungsWerk/vite.config.js"
& scp -i $KEY -o StrictHostKeyChecking=accept-new "$ROOT\index.html"     "${PI}:~/BuchungsWerk/index.html"
& scp -i $KEY -o StrictHostKeyChecking=accept-new -r "$ROOT\src"         "${PI}:~/BuchungsWerk/"

# 3. Build auf dem Pi
Write-Host "Baue auf dem Pi..."
Invoke-SSH $PI "cd ~/BuchungsWerk && npm install && npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Build fehlgeschlagen!"; exit 1 }

# 4. Backend hochladen + API-Image neu bauen
if (Test-Path $MAIN) {
    & scp -i $KEY -o StrictHostKeyChecking=accept-new $MAIN "$ROOT\buchungswerk-backend\docker-compose.yml" "$ROOT\buchungswerk-backend\Dockerfile" "$ROOT\buchungswerk-backend\requirements.txt" "${PI}:~/buchungswerk-backend/"
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
        & scp -i $KEY -o StrictHostKeyChecking=accept-new $envFile "${PI}:~/buchungswerk-backend/.env"
        Write-Host ".env auf Pi kopiert."
    } else {
        Write-Host ".env bereits vorhanden, nicht ueberschrieben."
    }
}

# 6. Frontend-Container neu starten
Write-Host "Starte Frontend-Container neu..."
Invoke-SSH $PI "cd ~/buchungswerk-backend && docker compose restart buchungswerk-app"

Write-Host "Fertig! https://buchungswerk.org"
