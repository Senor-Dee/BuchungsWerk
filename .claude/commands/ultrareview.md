Führe ein **umfassendes Ultrareview** des BuchungsWerk-Projekts durch. Analysiere alle relevanten Bereiche systematisch und erstelle einen strukturierten Bericht mit konkreten Handlungsempfehlungen.

## Zu prüfende Bereiche

### 1. Sicherheit
- JWT-Implementierung (Ablaufzeiten, Signatur, Refresh-Logik)
- TOTP 2FA-Flow (pyotp, Secret-Speicherung)
- Passwort-Hashing (bcrypt Rounds)
- Rate-Limiting-Konfiguration (slowapi: Login 10/min, Register 5/min, Reset 3/min)
- SQL-Injection-Schutz (parametrierte Queries in `buchungswerk-backend/main.py`)
- HTML-Injection-Schutz (html.escape auf User-Inputs in E-Mail-Templates)
- CORS-Konfiguration (erlaubte Origins)
- Security-Headers (nginx.conf: CSP, HSTS, X-Frame-Options)
- Secrets-Management (Umgebungsvariablen, keine Hardcodes)
- FastAPI-Docs deaktiviert (keine /docs, /redoc, /openapi.json)

### 2. Fachliche Korrektheit (Buchführung)
- BuchungsEngine (`src/utils/buchungsEngine.js`): Korrektheit der Buchungssätze für alle 6 Belegtypen
- ISB-Bayern-Konformität (Kontenplan nach Klassen 7–10)
- Determinismus der Engine (keine zufälligen Zustände, gleiche Eingabe → gleiche Ausgabe)
- Korrektheit der Soll/Haben-Zuordnungen
- Aufgabenpool (`src/data/aufgabenPool.js`): Plausibilität der Aufgabenketten

### 3. Architektur & Code-Qualität
- Komponentenstruktur (42 JSX-Komponenten in 14 Verzeichnissen)
- Custom-Hooks-Nutzung (8 Hooks: useAuth, useQuiz, useLevel, etc.)
- Props-Drilling vs. Context vs. State-Management
- Trennung von UI/Logik/Daten
- Größe kritischer Dateien (Landing.jsx: 1.576 Zeilen, main.jsx: 1.172 Zeilen)
- Backend-Struktur (main.py: 2.098 Zeilen – zu groß für eine Datei?)
- Wiederverwendbarkeit und DRY-Prinzip

### 4. Performance
- Bundle-Größe (aktuell: 1.616 kB, gzip: 422 kB) – Optimierungspotenzial?
- Code-Splitting mit Vite (lazy loading für große Komponenten)
- BuchungsEngine-Performance bei komplexen Aufgabenketten
- React-Rendering-Optimierungen (useMemo, useCallback, React.memo)
- SQLite WAL-Mode-Konfiguration
- nginx-Caching für statische Assets

### 5. Tests
- E2E-Abdeckung (14 Playwright-Tests): Welche kritischen Pfade fehlen?
- Unit-Test-Qualität (buchungsEngine.test.js: 863 Zeilen)
- Fehlende Testszenarien (Edge-Cases, Fehlerbehandlung)
- Mock-Strategien in Playwright-Fixtures
- Kein CI/CD – Risikobewertung

### 6. Benutzerfreundlichkeit & Barrierefreiheit
- Accessibility-Tests (@axe-core/playwright) – Ergebnisse
- Responsive Design für Lehrkräfte/Schüler
- Fehlerbehandlung und Nutzerfeedback
- Deutsche Lokalisierung vollständig?

### 7. Deployment & Betrieb
- Docker-Compose-Konfiguration (3 Services: API, Frontend, nginx)
- Raspberry-Pi-Deployment (deploy.ps1): Risiken und Automatisierungslücken
- Kein GitHub Actions CI – fehlende Automatisierung
- Backup-Strategie für SQLite-Datenbank
- Health-Check-Endpunkt (`GET /health`)

## Ausgabeformat

Erstelle einen strukturierten Bericht mit:

**Gesamtbewertung:** [Note 1–5 mit Begründung]

Für jeden Bereich:
- **Bewertung:** [Ampel: 🟢 Gut / 🟡 Verbesserungswürdig / 🔴 Kritisch]
- **Befunde:** Konkrete Probleme mit Datei-Referenzen (`datei.js:Zeile`)
- **Empfehlungen:** Priorisierte, umsetzbare Maßnahmen (P1/P2/P3)

Abschließend:
- **Top-3-Sofortmaßnahmen** (P1 – muss sofort behoben werden)
- **Top-5-Verbesserungen** (P2 – nächster Sprint)
- **Langfristige Architekturentscheidungen** (P3)
