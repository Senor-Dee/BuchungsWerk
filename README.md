# BuchungsWerk

> KI-gestützte Lern-App für Buchführung · Bayerische Realschulen Klassen 7–10  
> Live: [https://buchungswerk.org](https://buchungswerk.org)

![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)
![Playwright](https://img.shields.io/badge/Playwright-14%2F14%20grün-brightgreen)
![Live](https://img.shields.io/badge/Status-Live-success)

---

## 1. Was ist BuchungsWerk?

BuchungsWerk ist eine webbasierte Lern-App für den Fachunterricht **Betriebswirtschaftslehre/Rechnungswesen (BwR)** an bayerischen Realschulen (Klassen 7–10). Lehrkräfte erstellen randomisierte Buchungsaufgaben auf Basis echter Buchungsbelege (Eingangs-/Ausgangsrechnungen, Überweisungen, Kontoauszüge, E-Mails). Schülerinnen und Schüler üben Buchungssätze nach den Vorgaben des ISB Bayern / LehrplanPLUS.

Das Herzstück ist die **BuchungsEngine** – ein deterministischer, lokal laufender JavaScript-Algorithmus, der Buchungssätze ohne KI-Aufruf berechnet. Damit sind Aufgaben offline-fähig, 100 % fehlerfrei und kostenlos generierbar. Die KI (Anthropic Claude Haiku) wird nur noch für individuelle Aufgabentexte verwendet und benötigt dabei ~95 % weniger Tokens als zuvor.

Anton Gebert, BwR-Lehrer an einer bayerischen Realschule, entwickelt BuchungsWerk seit März 2026 für den eigenen Unterrichtsalltag – mit dem Ziel, qualitativ hochwertige, ISB-konforme Übungsmaterialien auf Knopfdruck zu erzeugen.

---

## 2. Features

- **Aufgabenpool** (6 Belegtypen: Eingangsrechnung, Ausgangsrechnung, Überweisung, Kontoauszug, E-Mail/Mahnung, Quittung – plus Komplex-Ketten und Schaubilder)
- **BuchungsEngine** (lokal, offline, deterministisch – 0 % KI-Fehler bei Buchungssätzen)
- **KI-Aufgabengenerator** (Claude Haiku, ISB-konform, bwr-sensei-Prompt-Standard)
- **Playwright E2E Tests** (14/14 grün)
- **Export** (HTML, DOCX, H5P für bycs/mebis)
- **Live-Quiz / Klassenzimmer-Modus** (Schüler joinen per 6-stelligem Code)
- **Mastery-System + Streak** (Lernfortschritt tracken)
- **AP-Übungsmodus** (Abschlussprüfungsvorbereitung)
- **PWA-ready** (offline-fähig durch BuchungsEngine)
- **Lehrer-Dashboard + Admin-Panel** (Klassen, Nutzer, Statistiken)
- **Kontenplan** nach ISB Bayern (IKR, volltext-durchsuchbar)
- **Beleg-Editor** mit eigenen Ausgangs-/Eingangsrechnungen

---

## 3. Tech Stack

| Layer | Technologie |
|-------|-------------|
| Frontend | React 18 + Vite, Lucide Icons |
| Backend | FastAPI (Python 3.12), SQLite |
| Engine | buchungsEngine.js (deterministisch, ISB-Bayern) |
| Auth | JWT + TOTP (2FA), bcrypt |
| E-Mail | Resend API |
| Infra | Raspberry Pi, Docker Compose, nginx |
| Tests | Playwright E2E (14 Tests), Vitest Unit |
| KI | Anthropic Claude Haiku (via `/ki/buchung`) |
| Export | docx.js (Word), JSZip (H5P) |

---

## 4. BuchungsEngine API

### Übersicht

Die BuchungsEngine berechnet Buchungssätze **lokal, offline und deterministisch** nach ISB-Bayern / LehrplanPLUS. Kein KI-Aufruf, kein Netzwerk, keine Tokens.

| Metrik | Ohne Engine (KI) | Mit Engine | Gewinn |
|--------|-----------------|------------|--------|
| Tokens/Aufgabe | ~3.000 | ~150 | −95 % |
| Latenz | 2–3 s | < 50 ms | −98 % |
| Kosten/100 Aufgaben | ~$0,45 | ~$0,02 | −96 % |
| Offline-fähig | ❌ | ✅ | PWA-ready |
| Fehlerquote | ~2 % | 0 % | Null KI-Fehler |

### Import

```javascript
import { belegToBuchungssatz, buchungssatzToText } from './src/utils/buchungsEngine.js';
```

### Aufruf

```javascript
const { buchungssatz, warnings, punkte_gesamt } = belegToBuchungssatz(beleg, klasse);
```

**Parameter:**
- `beleg` – `{ typ: string, data: object }` – Beleg-Objekt (siehe Typen unten)
- `klasse` – Jahrgangsstufe `7–10` (steuert Kontenplan-Konformität nach LehrplanPLUS)

**Rückgabe:**

```javascript
{
  buchungssatz: [
    {
      gruppe:     1,          // Buchungsgruppe (1 = erste Teilbuchung)
      soll_nr:    '6000',     // Kontonummer Soll (leer in Klasse 7)
      soll_name:  'AWR',      // Kontokürzel Soll
      haben_nr:   '4400',     // Kontonummer Haben
      haben_name: 'VE',       // Kontokürzel Haben
      betrag:     1000.00,    // Betrag in €
      punkte:     1,          // Punkte nach ISB-Schema
      erklaerung: 'Kl.8 LB2: Wareneinkauf auf Ziel',
    }
  ],
  warnings:       [],         // Lehrplan-Konformitäts-Warnungen (kein throw)
  punkte_gesamt:  2,          // Summe aller Punkte
}
```

---

### Unterstützte Belegtypen

#### 1. Eingangsrechnung (`eingangsrechnung`)

Lehrplan: Jg 7 LB4 (ohne USt), Jg 8 LB2/LB6 (mit VORST, GWG, BZKR)

```javascript
// Klasse 8: Wareneinkauf 1.000 € netto + 19 % USt
const { buchungssatz } = belegToBuchungssatz({
  typ: 'eingangsrechnung',
  data: {
    positionen: [{ artikel: 'Rohstoffe', menge: 10, ep: 100 }],
    ustSatz: 19,
  }
}, 8);

// buchungssatz:
// [
//   { gruppe:1, soll_nr:'6000', soll_name:'AWR',   haben_nr:'4400', haben_name:'VE', betrag:1000 },
//   { gruppe:1, soll_nr:'2600', soll_name:'VORST', haben_nr:'4400', haben_name:'VE', betrag:190  }
// ]
```

**Automatische GWG-Erkennung:** Bei Nettobetrag ≤ 800 € (und kein Vorratsmaterial) wird automatisch Konto `0890 GWG` statt `6000 AWR` verwendet.

**Bezugskosten:** Feld `bezugskosten` erzeugt eine separate Zeile `6001 BZKR` (Jg 8 LB2).

**Klasse 7:** Bruttobuchung ohne VORST (`6000 AWR an 4400 VE`, USt noch nicht im LP).

---

#### 2. Ausgangsrechnung (`ausgangsrechnung`)

Lehrplan: Jg 8 LB4

```javascript
// Klasse 8: Warenverkauf 2.000 € netto + 19 % USt
const { buchungssatz } = belegToBuchungssatz({
  typ: 'ausgangsrechnung',
  data: {
    positionen: [{ artikel: 'Fertigerzeugnisse', menge: 20, ep: 100 }],
    ustSatz: 19,
  }
}, 8);

// buchungssatz:
// [
//   { gruppe:1, soll_nr:'2400', soll_name:'FO',  haben_nr:'5000', haben_name:'UEFE', betrag:2000 },
//   { gruppe:2, soll_nr:'2400', soll_name:'FO',  haben_nr:'4800', haben_name:'UST',  betrag:380  }
// ]
// Achtung: UST an 2400 FO (nicht an 5000 UEFE!) – häufiger Schülerfehler!
```

---

#### 3. Überweisung (`ueberweisung`)

Lehrplan: Jg 7 LB3 (ohne Skonto), Jg 9 LB3 (Skonto-Gewinn)

```javascript
// Standard: Verbindlichkeit per Bank begleichen
const { buchungssatz } = belegToBuchungssatz({
  typ: 'ueberweisung',
  data: { betrag: 1190, skontoBetrag: 0 }
}, 7);
// → [{ soll_nr:'4400', soll_name:'VE', haben_nr:'2800', haben_name:'BK', betrag:1190 }]

// Mit Skonto (Jg 9): Skonto = ERTRAG (6750 KGV), KEINE Aufwand-Minderung!
const { buchungssatz: skontoBS } = belegToBuchungssatz({
  typ: 'ueberweisung',
  data: { betrag: 1190, skontoBetrag: 23.80 }  // 2% Skonto
}, 9);
// → [
//     { gruppe:1, soll_nr:'4400', soll_name:'VE', haben_nr:'2800', haben_name:'BK',  betrag:1166.20 },
//     { gruppe:2, soll_nr:'4400', soll_name:'VE', haben_nr:'6750', haben_name:'KGV', betrag:23.80   }
//   ]
```

---

#### 4. Kontoauszug (`kontoauszug`)

Lehrplan: Jg 9 LB3 – Typ-Erkennung automatisch aus `buchungen[].text`

```javascript
const { buchungssatz } = belegToBuchungssatz({
  typ: 'kontoauszug',
  data: {
    buchungen: [
      { text: 'Kontogebühren Mai', betrag: -12.50, highlight: true },
    ]
  }
}, 9);
// Schlüsselwort "Kontogebühren" → 6820 KOM an 2800 BK
// → [{ soll_nr:'6820', soll_name:'KOM', haben_nr:'2800', haben_name:'BK', betrag:12.50 }]

// Weitere automatische Typ-Erkennungen:
// "Zinsgutschrift" → 2800 BK an 5780 DDE   (Zinsertrag)
// "Barabhebung"   → 2880 KA an 2800 BK     (Bargeld aktivieren)
// Positive Beträge → 2800 BK an 2400 FO    (Kundenzahlung)
// Negative Beträge → 4400 VE an 2800 BK    (Lieferantenzahlung)
```

---

#### 5. E-Mail / Mahnung (`email`)

Lehrplan: Jg 8 LB4 (Gutschrift), Jg 9 LB5 (Mahngebühren) – Typ aus Betreff/Text

```javascript
// Gutschrift (Storno): Schlüsselwort "Gutschrift" oder "Storno"
const { buchungssatz: gutschrift } = belegToBuchungssatz({
  typ: 'email',
  data: {
    betreff: 'Gutschrift über 100,00 €',
    text:    'Wir stornieren die Rechnung über 100,00 €.',
  }
}, 8);
// → [
//     { gruppe:1, soll_nr:'5000', soll_name:'UEFE', haben_nr:'2400', haben_name:'FO', betrag:100 },
//     { gruppe:2, soll_nr:'4800', soll_name:'UST',  haben_nr:'2400', haben_name:'FO', betrag:19  }
//   ]

// Mahngebühr: Schlüsselwort "Mahnung" oder "Mahngebühr"
const { buchungssatz: mahnung } = belegToBuchungssatz({
  typ: 'email',
  data: {
    betreff: 'Mahnung – Mahngebühr 5,00 €',
    text:    'Wir berechnen eine Mahngebühr von 5,00 €.',
  }
}, 9);
// → [{ soll_nr:'2400', soll_name:'FO', haben_nr:'5400', haben_name:'EMP', betrag:5 }]
```

---

#### 6. Quittung (`quittung`)

Lehrplan: Jg 7+ – Barzahlung für Verbrauchsmaterial/Dienstleistungen

```javascript
const { buchungssatz } = belegToBuchungssatz({
  typ: 'quittung',
  data: { betrag: 25.00, zweck: 'Büromaterial' }
}, 7);
// → [{ soll_nr:'6800', soll_name:'BMK', haben_nr:'2880', haben_name:'KA', betrag:25 }]

// Weitere Zweck-Erkennungen:
// "Porto"/"Fracht" → 6140 AFR an 2880 KA
// "Werbung"        → 6870 WER an 2880 KA
// "Versicherung"   → 6900 VBEI an 2880 KA
```

---

### ISB-Kontenplan (Auszug)

| Nr | Kürzel | Bezeichnung | ab Klasse |
|----|--------|-------------|-----------|
| 0500 | GR | Grundstücke | 9 |
| 0700 | MA | Maschinen/Betriebseinrichtungen | 8 |
| 0890 | GWG | Geringwertiges Anlagevermögen ≤ 800 € | 8 |
| 1500 / 2880 | KA | Kassabestand | 7 |
| 2000 | R | Roh-/Hilfsstoffe (Vorräte) | 7 |
| 2400 | FO | Forderungen gegen Kunden | 8 |
| 2600 | VORST | Vorsteuer | 8 |
| 2800 | BK | Bankkonten | 7 |
| 3000 | EK | Eigenkapital | 7 |
| 4400 | VE | Verbindlichkeiten gegen Lieferanten | 7 |
| 4800 | UST | Umsatzsteuer (Schuld) | 8 |
| 5000 | UEFE | Umsatzerlöse Fertigerzeugnisse | 8 |
| 5400 | EMP | Entgelte, Mahngebühren, Provisionen | 9 |
| 5780 | DDE | Dividenden-/Zinserträge | 9 |
| 6000 | AWR | Aufwendungen Rohstoffe | 7 |
| 6001 | BZKR | Bezugskosten Rohstoffe | 8 |
| 6750 | KGV | Skontoertrag (Konzessionen/Geldanlage) | 9 |
| 6800 | BMK | Büromaterial/Kleingeräte | 7 |
| 6820 | KOM | Kontogebühren | 9 |

> Alle Konten aus der offiziellen ISB-Handreichung Bayern. Kein SKR03/SKR04!

### Klassenkonformitäts-Warnungen

Die Engine wirft bei jahrgangsstufen-fremden Konten keine Fehler, sondern gibt `warnings[]` zurück – die Lehrkraft entscheidet. Klasse 7 erhält automatisch Brutto-Buchungen ohne USt-Kontierung (USt erst ab Jg 8 LB6 im LP).

---

## 5. Installation & Setup

### Voraussetzungen

- Node.js 18+, Python 3.12+, Docker + Docker Compose
- Raspberry Pi (Produktion) oder beliebiger Linux-Server

### Frontend

```bash
git clone https://github.com/Senor-Dee/BuchungsWerk.git
cd BuchungsWerk
npm install
npm run dev        # Entwicklung: http://localhost:5173
npm run build      # Produktions-Build → buchungswerk-backend/app/
npm test           # Playwright E2E Tests (14 Tests)
```

### Backend

```bash
cd buchungswerk-backend

# Secrets einrichten (/etc/buchungswerk/secrets):
sudo mkdir -p /etc/buchungswerk
sudo nano /etc/buchungswerk/secrets
```

Inhalt der `secrets`-Datei:
```
BW_JWT_SECRET=<openssl rand -hex 32>
RESEND_API_KEY=re_...
BW_ANTHROPIC_KEY=sk-ant-...
BW_FROM_EMAIL=BuchungsWerk <noreply@buchungswerk.org>
BW_APP_URL=https://buchungswerk.org
BW_ADMIN_EMAIL=admin@buchungswerk.org
```

```bash
# Docker starten:
docker compose up -d
```

### Umgebungsvariablen

| Variable | Beschreibung | Pflicht | Beispiel |
|----------|-------------|---------|---------|
| `BW_JWT_SECRET` | JWT-Signaturschlüssel | ✅ | `openssl rand -hex 32` |
| `RESEND_API_KEY` | Resend-API-Schlüssel für E-Mails | ✅ | `re_abc123...` |
| `BW_ANTHROPIC_KEY` | Anthropic API-Schlüssel (KI) | ✅ | `sk-ant-...` |
| `BW_FROM_EMAIL` | Absender-Adresse für E-Mails | ✅ | `BuchungsWerk <noreply@...>` |
| `BW_APP_URL` | Öffentliche App-URL | ✅ | `https://buchungswerk.org` |
| `BW_ADMIN_EMAIL` | Admin-Benachrichtigungs-E-Mail | — | `admin@...` |
| `BW_DB` | Pfad zur SQLite-Datenbank | — | `/data/buchungswerk.db` |
| `BW_REQUIRE_VERIFY` | E-Mail-Verifikation erforderlich | — | `true` |

---

## 6. Tests ausführen

```bash
npm test                           # Alle Playwright E2E Tests (headless)
npx playwright test --headed       # Mit Browser-Fenster
npx playwright show-report         # HTML-Report öffnen
```

Aktueller Status: **14/14 Tests grün** ✅

Die Tests decken ab: Auth (Login/Logout/Token), Wizard (Konfiguration), Aufgaben-Ausführung, Materialien/Beleg-Editor, Support-Formular, Dashboard & Navigation.

---

## 7. Deployment (Raspberry Pi)

```bash
# Windows: deploy.ps1 ausführen (SCP → Pi-Build → Docker)
powershell.exe -ExecutionPolicy Bypass -File deploy.ps1

# Auf dem Pi (manuell):
ssh senor_d@192.168.68.54
cd ~/buchungswerk-backend
docker compose build buchungswerk-api
docker compose up -d --force-recreate buchungswerk-api
docker logs buchungswerk-api --tail 30

# nginx nach nginx.conf-Änderungen:
docker exec buchungswerk-nginx nginx -s reload
```

---

## 8. Projektstruktur

```
buchungswerk/
├── src/
│   ├── BuchungsWerk.jsx              # App-Shell (175 Zeilen, nach Phase A–E)
│   ├── Landing.jsx                   # Landing-Page
│   ├── components/
│   │   ├── aufgaben/                 # AufgabeKarte, SchrittAufgaben, ...
│   │   ├── beleg/                    # BelegEditorModal, BelegViewer
│   │   ├── common/                   # Shared UI-Komponenten
│   │   ├── export/                   # ExportModal, H5P-Export
│   │   ├── kontenplan/               # KontenplanModal
│   │   ├── modals/                   # Verschiedene Modals
│   │   ├── quiz/                     # Live-Quiz, StudentJoin, QuizControl
│   │   ├── simulation/               # Virtuelle Firma
│   │   └── wizard/                   # Aufgaben-Konfigurations-Wizard
│   ├── utils/
│   │   ├── buchungsEngine.js         # Deterministische Buchungslogik (ISB-Bayern)
│   │   ├── kontenplanEngine.js       # ISB-Kontenplan Bayern (Konten-Definitionen)
│   │   └── buchungsEngine.test.js    # Unit-Tests (Vitest)
│   ├── data/
│   │   └── aufgabenPool.js           # Aufgabenpool (Belegtypen, Komplex-Ketten)
│   ├── api/                          # API-Client-Funktionen
│   ├── hooks/                        # React Custom Hooks
│   └── pages/                        # Seitenkomponenten
├── buchungswerk-backend/
│   ├── main.py                       # FastAPI Backend (Auth, KI-Proxy, SQLite)
│   ├── nginx.conf                    # nginx (SPA + Security Headers)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
├── src/__tests__/e2e/                # Playwright E2E Tests (14 Tests)
│   ├── 01-auth.spec.js
│   ├── 02-lesson-config.spec.js
│   ├── 03-task-execution.spec.js
│   ├── 04-materials.spec.js
│   ├── 05-support.spec.js
│   └── 06-dashboard.spec.js
├── deploy.ps1                        # Deployment-Skript (Windows → Pi)
└── package.json
```

---

## 9. Sicherheit

Ein CISO Security Audit wurde am 2026-04-02 durchgeführt. Alle kritischen und hochpriorisierten Findings sind behoben (Phase F, 2026-04-03):

- **Auth:** bcrypt-Passwort-Hashing, JWT-Signierung (HS256), TOTP 2FA (pyotp)
- **Rate-Limiting:** slowapi auf allen Auth-Endpoints (Login: 10/min, Register: 5/min, Reset: 3/min)
- **SQL:** Ausschließlich parametrisierte SQLite-Queries (kein SQL-Injection-Risiko)
- **CORS:** Beschränkt auf `buchungswerk.org` und `localhost:5173`
- **Secrets:** Alle API-Keys in `/etc/buchungswerk/secrets` (nie im Repository)
- **nginx Security Headers:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **HTML-Injection:** `html.escape()` auf allen User-Inputs in E-Mail-Templates
- **FastAPI Docs:** `/docs`, `/redoc`, `/openapi.json` deaktiviert (kein Endpoint-Listing)
- **Auth-Pflicht:** Alle Write-Endpoints (`POST /sessions`, `/ergebnisse`, etc.) erfordern JWT

---

## 10. Roadmap

```
✅ Phase A–E: Refactoring (14.075 → 175 Zeilen BuchungsWerk.jsx)
✅ Phase G:   BuchungsEngine (deterministisch, ISB-Bayern, 6 Belegtypen)
✅ Phase 1:   Credential Rotation
✅ Phase 2:   CISO Security Audit
✅ Phase T:   Playwright E2E Tests (14/14 grün)
✅ Phase F:   Security Hardening (8 Findings behoben)
✅ Phase 5:   README.md
⏳ Beta-Launch (blockiert: Impressum/Datenschutz)
🔜 Phase 6:   Final QA & Production Readiness Check
🔜 Schullizenzen / Freemium-Modell
🔜 KI-Tutor, Live-Quiz-Erweiterung
🔜 ARA/PRA-Buchungen (Jg 10, BuchungsEngine v2)
```

---

## 11. Lizenz & Kontakt

**Lizenz:** GNU Affero General Public License v3 (AGPL-3.0)  
Wer BuchungsWerk verändert und als Webservice betreibt, muss den vollständigen Quellcode veröffentlichen (§ 13 AGPL).

**Entwickler:** Anton Gebert, BwR-Lehrer, Bayern  
**Kontakt:** info@buchungswerk.org  
**Live:** [https://buchungswerk.org](https://buchungswerk.org)  
**GitHub:** [github.com/Senor-Dee/BuchungsWerk](https://github.com/Senor-Dee/BuchungsWerk)

---

> Alle generierten Aufgaben und Musterlösungen basieren auf der aktuellen ISB-Handreichung und dem bayerischen LehrplanPLUS für BwR. Trotz sorgfältiger Konzeption können Fehler auftreten. **Bitte alle Aufgaben vor der Ausgabe an Schülerinnen und Schüler gegenchecken.**
