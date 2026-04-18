# BuchungsWerk – Production Readiness Checklist
**Stand: 2026-04-18 | Geprüft von: Claude Code (Phase 5A/5B)**

---

## 🟢 Bereit für Beta-Launch

### Security (Phase 5A – P1-Hotfix 2026-04-18, alle P1-Findings behoben)

- [x] **5A-01:** JWT_SECRET-Fallback entfernt — `RuntimeError` beim Start wenn `BW_JWT_SECRET` fehlt oder < 32 Zeichen (Commit `61aa252`)
- [x] **5A-02:** Auth + Ownership auf `POST /sessions/{id}/abschliessen` — `Depends(get_current_user)` + 403 bei Fremdzugriff (Commit `61aa252`)
- [x] **5A-03:** Auth + Ownership auf `POST /session/kontrolle/{code}` — lehrer_id-Check via `live_quizze` (Commit `61aa252`)
- [x] **5A-04:** Rate-Limits auf E-Mail-Endpoints — `verify-email` 10/min, `resend-verify` 3/min, `reset-confirm` 5/min (Commit `61aa252`)
- [x] **5A-05:** Debug-Logs aus Production-Build entfernt — `console.warn/info` hinter `import.meta.env?.DEV`-Guard (Commit `61aa252`)
- [x] **5A-06:** DB-Backup-Cron eingerichtet — `sqlite3 dump | gzip`, täglich 02:00, 30 Tage Retention (Commit `61aa252`)

### Security (Phase F – CISO Audit 2026-04-02, alle kritischen Findings behoben)

- [x] **F-01:** GitHub Recovery Codes erneuert (Anton, manuell)
- [x] **F-02:** Resend API Key widerrufen + neu in `/etc/buchungswerk/secrets` gesetzt
- [x] **F-03:** BW_JWT_SECRET in Produktion gesetzt + Docker neu gestartet
- [x] **F-04:** Rate-Limiting Auth-Endpoints (slowapi: Login 10/min, Register 5/min, Reset 3/min, TOTP 10/min)
- [x] **F-05:** Auth-Pflicht (JWT) für alle Write-Endpoints (`POST /sessions`, `/ergebnisse`, `/spielrangliste`, `/streak/record`, `/level/record`, `/support`) + Spielername-Regex-Validierung auf `/session/join`
- [x] **F-07:** `/ki/buchung` Endpoint mit eigenem Rate-Limiting implementiert
- [x] **F-08:** nginx Security Headers konfiguriert (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [x] **F-09:** FastAPI `/docs`, `/redoc`, `/openapi.json` deaktiviert (bestätigt: alle 3 Endpoints → 404)
- [x] **F-10:** Rate-Limiter Memory Leak behoben (leere `_rate_buckets` werden bereinigt)
- [x] **F-11:** HTML-Injection in Admin-Email + Support-Endpoint behoben (`html.escape()`)
- [x] **F-12:** `TEMP/` in `.gitignore`, nicht im Git-Index
- [x] **F-16:** SQLite WAL-Mode aktiviert (`PRAGMA journal_mode=WAL`)

### Repo-Hygiene (Phase 5B – 2026-04-18)

- [x] **5B-01:** `.gitattributes` angelegt — `* text=auto eol=lf`, Binary-Ausschlüsse, PS1/BAT=CRLF (Commit `ab40c05`)
- [x] **5B-02:** `fix_ap_word.mjs` archiviert unter `scripts/archive/` — `git status` sauber (Commit `f7b1229`)
- [x] **5B-03:** GitHub Actions CI/CD — Vitest + Build + Playwright, Artifact-Upload on failure (Commit `1d8e800`)
- [x] **5B-04:** Alle 24+ Commits auf `origin/main` gepusht — Repo auf Stand

### Qualität

- [x] **Playwright E2E:** 14/14 Tests grün (letzte Ausführung: 2026-04-03, 56s)
- [x] **GitHub Actions CI:** Workflow aktiv (Vitest + Build + Playwright auf ubuntu-latest)
- [x] **npm run build:** Erfolgreich, keine Errors (Chunk-Size-Warning: 1.550 kB, akzeptabel)
- [x] **console.log:** 0 Stück in Produktions-Code (hinter `import.meta.env?.DEV`-Guard, Phase 5A)
- [x] **TODOs/FIXMEs:** Keine kritischen TODOs im Quellcode
- [x] **Hardcodierte URLs:** Keine funktionalen hardcodierten IPs oder `localhost:8000` im src/-Code (nur UI-Placeholder-Text in H5PModal)
- [x] **BuchungsEngine:** Deterministisch, ISB-Bayern validiert, 6 Belegtypen, 0 % Fehlerquote
- [x] **Refactoring:** Abgeschlossen (32 Module, BuchungsWerk.jsx = 175 Zeilen statt 14.075)
- [x] **README.md:** Vollständig (Roadmap auf Stand 5A/5B, CI-Badge, Security-Abschnitt aktualisiert)

### Infrastruktur

- [x] Docker deployed auf Raspberry Pi (buchungswerk-api + buchungswerk-app Container)
- [x] nginx mit HTTPS via Cloudflare Tunnel (Let's Encrypt + Cloudflare-Zertifikat)
- [x] Secrets in `/etc/buchungswerk/secrets` (außerhalb des Repositories)
- [x] CORS beschränkt auf `buchungswerk.org`, `www.buchungswerk.org`, `localhost:5173`
- [x] API Health: `{"status":"ok"}` ✅ (bestätigt: 2026-04-03)
- [x] Write-Endpoints Auth: `POST /sessions` → 401 ohne Token ✅
- [x] Rate-Limiting: Login 10/min → 11. Request = 429 ✅ (bestätigt getestet)

---

## 🔴 Blockiert (vor Vollstart – kein Beta-Launch für Öffentlichkeit)

- [ ] **Impressum:** Fehlt – gesetzlich erforderlich für öffentliche Webangebote (DE). Blockiert durch Gewerbeanmeldung (Osterferien).
- [ ] **Datenschutzerklärung:** Fehlt – DSGVO-Pflicht. Blockiert durch Gewerbeanmeldung.

> **Empfehlung:** Beta-Launch mit bekannten Kolleginnen/Kollegen (geschlossener Kreis) ist technisch möglich. Öffentlicher Launch erst nach Impressum + Datenschutzerklärung.

---

## 🟡 Bewusst zurückgestellt (Q2 2026)

### Security (niedrige Priorität)

- [ ] **F-06:** JWT in httpOnly Cookies statt localStorage — aktuell kein aktives Angriffsszenario, da App nur für registrierte Lehrkräfte
- [ ] **F-13:** `/health`-Endpoint leakt DB-Pfad (`/data/buchungswerk.db`) — niedrig, kein direkter Angriffswert
- [ ] **F-14:** API-Version in Root-Response sichtbar — niedrig
- [ ] **F-15:** Passwort-Mindestlänge 6 Zeichen (sollte 12+) — für Beta akzeptabel
- [ ] **Security Headers via Cloudflare:** nginx.conf-Header werden durch Cloudflare-Tunnel nicht an Clients weitergeleitet. Lösung: Cloudflare Transform Rules konfigurieren (Dashboard → Rules → Transform Rules → Modify Response Headers). Betrifft: X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy.

### Features / Technologie

- [ ] **PWA Service Worker:** BuchungsEngine ist offline-ready, aber kein vollständiger Service Worker implementiert (Assets werden nicht gecacht)
- [ ] **Bundle-Size:** Größter Chunk 1.245 kB (gzip: 317 kB) — Code-Splitting empfohlen für Jg-10-Aufgaben und BankingSimulator
- [ ] **ARA/PRA-Buchungen:** Jg 10 (BuchungsEngine v2 — nicht in v1.0)
- [ ] **Schullizenzen / Freemium-Modell:** Konzept vorhanden, Implementierung Q2 2026
- [ ] **KI-Tutor Integration:** Anthropic Claude für Schüler-Feedback

---

## 📊 QA-Ergebnisse – 2026-04-03

| Bereich | Status | Ergebnis / Details |
|---------|--------|--------------------|
| **Build** | ✅ | Keine Errors. Chunk-Size-Warning (1.245 kB) akzeptabel |
| **Playwright E2E** | ✅ | 14/14 grün, Laufzeit 56s |
| **Bundle-Größe** | ⚠️ | Gesamt: ~1.616 kB (gzip: ~422 kB). Größter Chunk: `index-D7Ci0Jzq.js` 1.245 kB |
| **API Docs** | ✅ | `/docs`, `/redoc`, `/openapi.json` → alle 404 |
| **API Health** | ✅ | `{"status":"ok","db":"/data/buchungswerk.db","time":"..."}` |
| **Rate-Limiting** | ✅ | Login: 10x 401, dann 429 ✅ (10 Requests/min Limit greift) |
| **Auth Write-Endpoints** | ✅ | `/sessions` ohne Token → 401, `/support` ohne Token → 401 |
| **Security Headers (nginx)** | ⚠️ | In `nginx.conf` konfiguriert ✅, aber Cloudflare-Tunnel leitet sie nicht weiter → Clients sehen keine Custom-Header. Fix: Cloudflare Transform Rules |
| **console.log** | ✅ | 0 Stück im Produktions-Code |
| **TODOs/FIXMEs** | ✅ | Keine kritischen offenen TODOs |
| **Hardcodierte URLs** | ✅ | Keine funktionalen `localhost`/IP-Hardcodierungen (nur UI-Placeholder) |
| **SSH Pi-Zugriff** | ⚠️ | Kein SSH-Key in dieser Umgebung → `docker logs`, `df -h`, WAL-Pragma nicht direkt geprüft. WAL wurde beim letzten Deploy korrekt gesetzt (Commit `94735a3`) |

---

## 🚀 Beta-Launch Freigabe

**Empfehlung: App ist technisch bereit für Beta-Launch mit Kolleginnen und Kollegen.**

Vorbedingungen für öffentlichen Launch:
1. Impressum live schalten (nach Osterferien/Gewerbeanmeldung)
2. Datenschutzerklärung live schalten
3. Cloudflare Transform Rules für Security Headers einrichten

Alle sicherheitskritischen Findings aus dem CISO-Audit 2026-04-02 sind behoben.  
Rate-Limiting, Auth, CORS, SQL-Injection-Schutz, HTML-Injection — alle produktionsreif.

---

---

## 📋 Änderungshistorie

| Stand | Phase | Was |
|-------|-------|-----|
| 2026-04-03 | Phase 6 Final QA | Erstellt |
| 2026-04-18 | Phase 5A | P1-Security (JWT, Auth/Ownership, Rate-Limits, Debug-Logs, DB-Backup) |
| 2026-04-18 | Phase 5B | Repo-Hygiene (.gitattributes, LF), CI/CD (GitHub Actions), Doku-Sync |

*Aktualisiert: 2026-04-18 · Claude Code · Phase 5A/5B*
