# BuchungsWerk

**BwR-Aufgabengenerator für bayerische Realschulen (Klassen 7–10)**

BuchungsWerk ist eine webbasierte React-Anwendung zur Erstellung randomisierter Buchungsaufgaben im Fach Betriebswirtschaftslehre/Rechnungswesen (BwR) nach dem bayerischen LehrplanPLUS. Die App läuft als Single-File JSX-Anwendung und ist für den Einsatz auf iPad und Desktop optimiert.

---

## Autor

**Anton Gebert** – BwR-Lehrer an einer bayerischen Realschule  
Erstellt: März 2026  
Kontakt: info@buchungswerk.org  
Web: [buchungswerk.org](https://buchungswerk.org)

---

## Funktionsumfang

- **Aufgabengenerator** für Klassen 7–10 (Buchungs-, Komplex-, Rechnung-, Schaubild- und Theorieaufgaben)
- **Kontenplan** nach ISB Bayern (IKR, 72 Konten, volltext-durchsuchbar)
- **Beleg-Editor** mit eigenen Ausgangs-/Eingangsrechnungen, Kontoauszügen, Überweisungen
- **KI-Proxy** zur Aufgabengenerierung aus eigenen Belegen (Anthropic API, bayerischer Kontenplan)
- **Prozentrechnung Klasse 7** (7 Aufgabentypen, ISB-Bepunktung)
- **Schaubild-Analyse** (Linien- und Balkendiagramme, SVG-generiert)
- **Export** als Word/Pages (.docx via docx.js) und PDF (LibreOffice via Backend)
- **H5P-Export** (Question Set für bycs/mebis, JSZip)
- **Interaktives Quiz** (HTML + QR-Code)
- **Simulation** „Virtuelle Firma führen" (Solo/Klassenmodus, Rangliste)
- **Einstellungen** mit Profil, Aufgaben, Anzeige, Export und Hilfe
- **Bepunktung** nach ISB-Handreichung BwR (PLUSPunkt-Schema)

---

## Technischer Stack

| Komponente | Technologie |
|---|---|
| Frontend | React 18, JSX (Single File), Vite |
| Backend | FastAPI (Python), Docker Compose |
| Hosting | Raspberry Pi „PlatonOne", nginx, Cloudflare Tunnel |
| KI | Anthropic Claude API (`/ki/buchung`) |
| E-Mail | Resend.com (Support-Button) |
| Export | docx.js, LibreOffice (PDF), JSZip (H5P) |

---

## Projektstruktur

```
BuchungsWerk.jsx        # Gesamte Frontend-Applikation (~14.000 Zeilen)
main.py                 # FastAPI Backend (KI-Proxy, PDF-Konvertierung, Support-Mail)
Dockerfile              # Backend-Container
deploy.ps1              # Deployment-Skript (PowerShell → SCP → remote build)
deploy.sh               # Remote Build-Skript auf dem Pi (Vite-Build, nginx reload)
```

---

## Deployment

```bash
# Lokal entwickeln (Vite Dev Server)
npm install
npm run dev

# Auf dem Pi deployen
./deploy.ps1   # Windows PowerShell
```

Backend:
```bash
cd ~/buchungswerk-backend
docker compose up -d
```

---

## Lizenz

Copyright (C) 2026 Anton Gebert

Dieses Programm ist freie Software unter den Bedingungen der  
**GNU Affero General Public License v3** (AGPL-3.0).  
Siehe [`LICENSE`](LICENSE) für den vollständigen Lizenztext.

> **Wichtig für Derivate:** Wer BuchungsWerk verändert und als Webservice betreibt,  
> ist verpflichtet, den vollständigen Quellcode der modifizierten Version öffentlich  
> zugänglich zu machen (§ 13 AGPL).

---

## Wichtiger Hinweis

Alle generierten Aufgaben und Musterlösungen basieren auf der aktuellen Handreichung und dem bayerischen Lehrplan für BwR. Trotz sorgfältiger Konzeption können Fehler auftreten. **Bitte alle Aufgaben vor der Ausgabe an Schülerinnen und Schüler gegenchecken.**
