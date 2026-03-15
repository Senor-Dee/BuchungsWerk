# BuchungsWerk Backend

FastAPI + SQLite · Raspberry Pi / Home Server

## Schnellstart

```bash
# 1. Ins Verzeichnis wechseln
cd buchungswerk-backend

# 2. Mit Docker Compose starten
docker compose up -d

# API läuft auf http://raspberrypi.local:8000
# Swagger-Doku: http://raspberrypi.local:8000/docs
```

## Ohne Docker (direkt auf dem Pi)

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API-Endpunkte

| Methode | Pfad                              | Beschreibung                        |
|---------|-----------------------------------|-------------------------------------|
| GET     | /                                 | Health-Check                        |
| GET     | /klassen                          | Alle Klassen auflisten              |
| POST    | /klassen                          | Neue Klasse anlegen                 |
| DELETE  | /klassen/{id}                     | Klasse löschen                      |
| GET     | /klassen/{id}/schueler            | Schüler einer Klasse                |
| POST    | /schueler                         | Neuen Schüler anlegen               |
| DELETE  | /schueler/{id}                    | Schüler löschen                     |
| POST    | /sessions                         | Quiz-Session starten                |
| POST    | /sessions/{id}/abschliessen       | Session beenden                     |
| GET     | /sessions/{id}/zusammenfassung    | Ergebnisse einer Session            |
| POST    | /ergebnisse                       | Einzelergebnis speichern            |
| GET     | /klassen/{id}/statistik           | Klassenauswertung                   |

## BuchungsWerk konfigurieren

In `BuchungsWerk.jsx` (Zeile ~18) die URL anpassen:

```js
const API_URL = "http://raspberrypi.local:8000";
// oder mit IP: "http://192.168.1.xx:8000"
```

## Datenspeicherung

SQLite-Datenbank unter `./data/buchungswerk.db` (persistiert via Docker Volume).

## Datenmodell

```
klassen ──< schueler
         ──< quiz_sessions ──< ergebnisse
```

- **klassen**: Schulklassen (z.B. „8b", Stufe 8, Schuljahr 2025/26)
- **schueler**: Schüler einer Klasse
- **quiz_sessions**: Ein generiertes Quiz (mit Config-JSON)
- **ergebnisse**: Punktzahl pro Frage einer Session
