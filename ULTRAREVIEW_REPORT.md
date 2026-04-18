# BuchungsWerk — Vollständiger Ultrareview

**Datum:** 2026-04-18  
**Gesamtbewertung: 3 / 5**

Solide Fachlogik und gute Grundstruktur. Mehrere sicherheitskritische Auth-Lücken und ein kritisches Infrastrukturproblem (kein Backup) müssen vor weiterem Wachstum behoben werden.

---

## 1. Sicherheit 🔴 Kritisch

### P1 — Sofort beheben

**JWT-Fallback-Secret** (`buchungswerk-backend/main.py:23`)
```python
JWT_SECRET = os.environ.get("BW_JWT_SECRET", "change-me-in-production")
```
Wenn die Umgebungsvariable fehlt, kann jeder Angreifer Tokens fälschen. Fix: Crash beim Start:
```python
JWT_SECRET = os.environ.get("BW_JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("BW_JWT_SECRET MUSS gesetzt sein")
```

**Unauthentifizierter Session-Close** (`main.py:901`)  
`POST /sessions/{id}/abschliessen` hat keine Auth-Dependency — jeder kann fremde Quiz-Sessions durch ID-Raten schließen. Auth + Ownership-Check fehlt vollständig.

**Session-Kontrolle ohne Auth** (`main.py:1150`)  
`POST /session/kontrolle/{code}` erlaubt jedem, die Endzeit beliebiger Quiz-Sessions zu setzen. Lehrerauthentifizierung fehlt.

**Fehlende Rate-Limits:**

| Endpoint | Zeile | Risiko |
|----------|-------|--------|
| `/auth/verify-email` | `main.py:582` | Token-Brute-Force |
| `/auth/resend-verify` | `main.py:609` | E-Mail-Spam |
| `/auth/reset-confirm` | `main.py:647` | Reset-Token-Brute-Force |

### P2 — Nächster Sprint

| Befund | Stelle | Fix |
|--------|--------|-----|
| CORS-Wildcard statt Whitelist | `main.py:50` | `allow_origins=CORS_ORIGINS` |
| Register-Rate-Limit zu hoch (20/min) | `main.py:489` | 5/min |
| `html.escape()` fehlt in Payment-E-Mail | `main.py:2053` | `html.escape(user['vorname'])` |
| TOTP-Secrets unverschlüsselt in DB | `main.py:705` | AES-256-Verschlüsselung |
| CSP: `unsafe-inline` + `unsafe-eval` | `nginx.conf:12` | Nonce-basierte CSP |
| TOTP `valid_window=1` | `main.py:573,717` | Auf 2 erhöhen (Uhrabweichung) |
| bcrypt ohne explizite Rounds | `main.py:327` | `bcrypt.gensalt(rounds=14)` |
| Health-Endpoint leakt DB-Pfad | `main.py:481` | DB-Pfad aus Response entfernen |

### P3 — Gut, aber optimierbar

- JWT-Ablaufzeit 7 Tage ohne Refresh-Tokens (`main.py:24`) — Reduktion auf 1 Tag empfohlen
- `X-XSS-Protection`-Header deprecated (`nginx.conf:9`) — entfernen, CSP ist ausreichend
- HSTS ohne `preload`-Direktive (`nginx.conf:11`)

---

## 2. Fachliche Korrektheit (BuchungsEngine) 🟢 Gut

**Engine 100% deterministisch** — kein `Math.random()`, kein `Date.now()` in `buchungsEngine.js`. ✅

### Alle 6 Belegtypen korrekt implementiert

| Belegtyp | Soll/Haben | GWG-Logik | Skonto | Status |
|----------|-----------|-----------|--------|--------|
| Eingangsrechnung | ✅ | ✅ ≤800€→Konto 0890 | — | Korrekt |
| Ausgangsrechnung | ✅ (2 Gruppen) | — | — | Korrekt |
| Überweisung | ✅ | — | ✅ 6750 KGV | Korrekt |
| Kontoauszug | ✅ (5 Varianten) | — | — | Korrekt |
| E-Mail-Beleg | ✅ (Gutschrift+Mahnung) | — | — | Korrekt |
| Quittung | ✅ | — | — | Korrekt |

### Lücken

**`stammdaten.js:168`** — `mkEmail()` nutzt `Math.random()` für Uhrzeiten → Testdaten nicht-deterministisch:
```javascript
uhrzeit: `${9 + Math.floor(Math.random() * 8)}:${...} Uhr`
```

**`buchungsEngine.js:198-201`** — Leere `positionen[]`-Arrays erzeugen Buchungen mit `betrag: 0` statt Fehler zu werfen. Sollte explizit validiert werden.

### Kontonummern (ISB-Bayern IKR-konform) ✅

Alle Kontonummern (0890, 2400, 2600, 2800, 4400, 5000, 6750 etc.) entsprechen dem ISB-Bayern-Kontenplan für Klassen 7–10.

---

## 3. Tests 🟡 Verbesserungswürdig

### Unit-Tests (`buchungsEngine.test.js`, 863 Zeilen)

| Belegtyp | Tests | Status |
|----------|-------|--------|
| Eingangsrechnung | 10 | ✅ Umfassend (GWG, Rabatt, Bezugskosten) |
| Ausgangsrechnung | 5 | ✅ Vollständig |
| Überweisung | 5 | ✅ Vollständig |
| Kontoauszug | 5 | ✅ Gut |
| E-Mail-Beleg | 4 | ✅ Gut |
| **Quittung** | **0** | 🔴 **Fehlend** |

**Fehlende Tests:**
- Quittung mit Porto/Versand (AFR), Werbung (WER), Versicherung (VBEI)
- `positionen: []` Edge-Case (was soll passieren?)
- E-Mail-Betrag-Regex-Fallback wenn `data.betrag` nicht gesetzt

### E2E-Tests (Playwright, 22 Tests in 7 Dateien)

| Datei | Tests | Abdeckung |
|-------|-------|-----------|
| `01-auth.spec.js` | 3 | Login, Logout, Token |
| `02-lesson-config.spec.js` | 2 | Wizard-Navigation |
| `03-task-execution.spec.js` | 3 | SchrittAufgaben-UI |
| `04-materials.spec.js` | 2 | Bibliothek, BelegEditor |
| `05-support.spec.js` | 2 | Support-Formular |
| `06-dashboard.spec.js` | 2 | Teacher-Dashboard |
| `07-fachlich.spec.js` | 8 | Buchungssatz, KI, A11y |

**Nicht abgedeckte kritische Flows:**
- Beleg-Editor Vollworkflow (erstellen → speichern → in Aufgabe verwenden)
- Klassenzimmer-Modus (Lehrer legt Stunde an, Schüler bearbeiten)
- Simulations-Modus
- Prüfungs-Modus (Timer, automatische Abgabe)
- Quittung-spezifische Aufgaben

**Mock-Strategie: Ausgezeichnet** — alle APIs per `helpers.js` gemockt, kein echter Backend-Call nötig. ✅

---

## 4. Architektur & Code-Qualität 🟡 Verbesserungswürdig

### Komponentengröße

| Datei | LOC | Problem |
|-------|-----|---------|
| `src/data/aufgabenPool.js` | 4.585 | Größte Datei im Projekt |
| `src/components/simulation/BankingSimulator7.jsx` | 2.173 | 20+ useState, Kalender, Kanban in einer Datei |
| `src/Landing.jsx` | 1.576 | Auth-Logik, Animationen, Modals vermischt |
| `src/components/wizard/SchrittTyp.jsx` | 1.184 | 10+ useState in einem Wizard-Schritt |
| `src/main.jsx` | 1.172 | Router + CSS + SVG-Filter kombiniert |
| `src/components/beleg/BelegEditorModal.jsx` | 1.138 | Alle 6 Belegtypen in einem Modal |

**P1:** `BankingSimulator7.jsx` aufteilen in `TaskEngine.js`, `KanbanBoard.jsx`, `Calendar.jsx`, `Bank.jsx`.

### Props-Drilling (P1)

`SchrittAufgaben → AufgabeKarte → Buchungskomponenten`: 3+ Ebenen mit `aufgabe`, `globalMode`, `klasse`, `onAufgabeChange`.

**Fix:** `AufgabenContext` mit `useAufgaben()`-Hook einführen.

### State-Management (P1)

`BuchungsWerk.jsx:41–75` hat **24 `useState`-Deklarationen** für Modals, Navigation, Config, UI.

**Fix:** `useReducer` mit strukturiertem State:
```javascript
const [state, dispatch] = useReducer(appReducer, {
  wizard: { schritt, config, firma },
  modals: { disclaimer, settings, belegEditor, ... },
  ui: { hoveredNav, blurLevel },
  user: { settings, streak }
});
```

Zusätzlich: **Duale Settings-Wahrheit** — Settings existieren sowohl im Context als auch als `useState` in `BuchungsWerk.jsx:54`. Einer muss weg.

### Code-Duplikation (P1/P2)

**Modal-Backdrop** identisch in 3+ Dateien → `<ModalWrapper>`-Komponente extrahieren (30 Min):
```jsx
// src/components/common/ModalWrapper.jsx
export function ModalWrapper({ children, zIndex = 9000 }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex }}>
      <div style={{ background:"rgba(22,16,8,0.97)", backdropFilter:"blur(20px)", ... }}>
        {children}
      </div>
    </div>
  );
}
```

**Zahlenformatierung** `fmt()` in mehreren Komponenten dupliziert — `src/utils.js` wird ignoriert.

### API-Client (P1)

`teacherApi.js` verwaist, Auth-Logik in `Landing.jsx:48–78` dupliziert.

**Fix:** Strukturierter Client:
```
src/api/
  ├── client.js      (apiFetch-Wrapper)
  ├── auth.js        (login, register, reset...)
  ├── quiz.js        (sessions, answers...)
  ├── classroom.js   (klassen, schüler...)
  └── index.js       (barrel exports)
```

### Debug-Logs in Produktion (P1 — sofort)

`SchrittAufgaben.jsx:97, 103, 110` enthält `console.info` und `console.warn` im normalen App-Flow. Sofort entfernen oder hinter `if (import.meta.env.DEV)` verschieben.

### Sonstiges

- Kein TypeScript — `typ.generate()` in `SchrittAufgaben.jsx:77` ohne Existenzprüfung
- `ErrorBoundary` nur an 2 Stellen — fehlt um Modals, `BankingSimulator7`, `BelegEditorModal`
- Backend `main.py` (2.098 Zeilen) — Monolith, sollte in Module aufgeteilt werden

---

## 5. Performance & Deployment 🔴 Kritisch

### Kein Datenbank-Backup — KRITISCH

Kein Backup-Skript gefunden. SQLite auf Raspberry-Pi-MicroSD = Totalverlust bei Karten-Defekt.

**Sofortlösung:**
```bash
#!/bin/bash
# /root/backup-buchungswerk.sh — täglich via Cron (0 2 * * *)
DB_PATH="/home/user/BuchungsWerk/buchungswerk-backend/data/buchungswerk.db"
BACKUP_DIR="/home/user/BuchungsWerk/buchungswerk-backend/backups"
mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".dump" | gzip > $BACKUP_DIR/buchungswerk-$(date +%Y%m%d-%H%M%S).sql.gz
find $BACKUP_DIR -name "buchungswerk-*.sql.gz" -mtime +30 -delete
```

### Raspberry Pi Kapazitätsgrenze — Hoch

Geeignet für ≤50 gleichzeitige Nutzer. Schulstunden können auf 200+ spiken.

**Mittelfristig:** Migration zu Hetzner VPS (ab €5/Monat, 2 vCPU, 4 GB RAM, SSD).

### Kein CI/CD — Hoch

Manuelles `deploy.ps1` ohne Tests vor dem Deploy, ohne Rollback-Mechanismus.

**Minimale GitHub Actions:**
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build && npm test
      - name: Deploy to Pi
        run: ssh ${PI} 'cd ~/buchungswerk-backend && docker compose up -d'
```

### Docker ohne Ressourcenlimits — Mittel

`docker-compose.yml` hat weder `deploy.resources.limits` noch `healthcheck`.

```yaml
# Ergänzung für docker-compose.yml
services:
  buchungswerk-api:
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Bundle-Größe / Code-Splitting — Mittel

Kein Code-Splitting in `vite.config.js` konfiguriert. Aktuell 422 kB (gzip) — noch akzeptabel, aber wächst weiter.

```javascript
// vite.config.js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'simulator': ['./src/components/simulation/BankingSimulator7.jsx'],
        'teacher': ['./src/components/teacher/AdminPanel.jsx'],
      }
    }
  }
}
```

### nginx-Kompression nicht explizit konfiguriert

`gzip on` fehlt in `nginx.conf` — empfehlenswert zu ergänzen:
```nginx
gzip on;
gzip_types text/css application/javascript application/json;
gzip_comp_level 6;
```

### React-Performance — Niedrig

Kein einziges `React.memo()` auf exportierten Komponenten. `Leaderboard.jsx` rendert große Listen ohne Memoization. `StudentJoin.jsx` polling alle 2s ohne `AbortController`.

---

## Gesamtzusammenfassung

### Top-3 Sofortmaßnahmen (P1 — diese Woche)

| # | Maßnahme | Warum |
|---|----------|-------|
| 1 | **Datenbank-Backup einrichten** | Totalverlust bei Pi-Ausfall |
| 2 | **`BW_JWT_SECRET`-Fallback entfernen** | Token-Fälschung möglich |
| 3 | **Auth auf `/sessions/{id}/abschliessen` und `/session/kontrolle/{code}`** | Session-Sabotage möglich |

### Top-5 Verbesserungen (P2 — nächster Sprint)

1. Rate-Limits auf Verify/Reset-Endpoints hinzufügen (`main.py:582, 609, 647`)
2. `console.info/warn` aus `SchrittAufgaben.jsx:97–110` entfernen
3. CORS-Whitelist aktivieren (`allow_origins=CORS_ORIGINS`)
4. Docker Health-Checks und Ressourcenlimits hinzufügen
5. `<ModalWrapper>`-Komponente extrahieren (30 Min, hoher Impact)

### Langfristige Architekturentscheidungen (P3)

1. Migration von Raspberry Pi auf Cloud-VPS (Hetzner, DigitalOcean, oder ähnlich)
2. `BankingSimulator7.jsx` (2.173 LOC) aufteilen
3. CI/CD Pipeline (GitHub Actions: test → build → deploy)
4. Strukturierten API-Client einführen (`src/api/auth.js`, `quiz.js`, etc.)
5. Backend `main.py` (2.098 Zeilen) in Module aufteilen (`routes/auth.py`, `routes/quiz.py`)

---

*Erstellt mit `/ultrareview` — Claude Code*
