// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Anton Gebert <info@buchungswerk.org> - BuchungsWerk

import React from "react";

const s = {
  page: {
    minHeight: "100vh",
    background: "#141008",
    color: "#f0ece3",
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    padding: "0 0 60px",
  },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 32px",
    borderBottom: "1px solid rgba(240,236,227,0.08)",
    background: "rgba(20,16,8,0.85)",
    backdropFilter: "blur(12px)",
    position: "sticky", top: 0, zIndex: 100,
  },
  logo: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 22, letterSpacing: "0.06em", textDecoration: "none",
    color: "rgba(240,236,227,0.8)",
  },
  accent: { color: "#e8600a" },
  backBtn: {
    fontSize: 13, color: "rgba(240,236,227,0.5)",
    background: "none", border: "none", cursor: "pointer",
    padding: "6px 0", fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  },
  container: { maxWidth: 740, margin: "0 auto", padding: "48px 24px" },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 38, letterSpacing: "0.06em",
    color: "#f0ece3", marginBottom: 8,
  },
  subtitle: {
    fontSize: 13, color: "rgba(240,236,227,0.4)",
    marginBottom: 36, letterSpacing: "0.04em",
  },
  section: { marginBottom: 32 },
  h3: {
    fontSize: 13, fontWeight: 700, letterSpacing: "0.1em",
    textTransform: "uppercase", color: "#e8600a",
    marginBottom: 10,
  },
  p: { fontSize: 14.5, lineHeight: 1.75, color: "rgba(240,236,227,0.8)", marginBottom: 10 },
  ul: { paddingLeft: 20, marginBottom: 10 },
  li: { fontSize: 14.5, lineHeight: 1.75, color: "rgba(240,236,227,0.8)", marginBottom: 4 },
  a: { color: "#e8600a", textDecoration: "none" },
  table: {
    width: "100%", borderCollapse: "collapse", marginBottom: 10,
    fontSize: 13.5,
  },
  th: {
    textAlign: "left", padding: "8px 12px",
    background: "rgba(232,96,10,0.08)", color: "#e8600a",
    fontWeight: 600, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase",
    border: "1px solid rgba(240,236,227,0.07)",
  },
  td: {
    padding: "8px 12px", color: "rgba(240,236,227,0.75)",
    border: "1px solid rgba(240,236,227,0.07)",
    verticalAlign: "top",
  },
  infoBox: {
    background: "rgba(232,96,10,0.06)", border: "1px solid rgba(232,96,10,0.2)",
    borderRadius: 8, padding: "14px 18px", marginBottom: 16,
  },
  divider: { borderColor: "rgba(240,236,227,0.08)", margin: "32px 0" },
};

export default function Datenschutz() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <a href="/" style={s.logo}>
          BUCHUNGS<span style={s.accent}>WERK</span>
        </a>
        <button style={s.backBtn} onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = "/"}>
          ← Zurück
        </button>
      </nav>

      <div style={s.container}>
        <h1 style={s.title}>Datenschutzerklärung</h1>
        <p style={s.subtitle}>Stand: April 2026 · gemäß DSGVO</p>

        {/* 1 */}
        <div style={s.section}>
          <h3 style={s.h3}>1. Verantwortliche Stelle</h3>
          <p style={s.p}>
            <strong>Anton Gebert</strong><br />
            E-Mail: <a href="mailto:info@buchungswerk.org" style={s.a}>info@buchungswerk.org</a>
          </p>
        </div>

        <hr style={s.divider} />

        {/* 2 */}
        <div style={s.section}>
          <h3 style={s.h3}>2. Welche Daten werden gespeichert?</h3>
          <p style={s.p}>Bei der Registrierung und Nutzung werden folgende Daten gespeichert:</p>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Datenkategorie</th>
                <th style={s.th}>Konkrete Daten</th>
                <th style={s.th}>Zweck</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}>Kontodaten</td>
                <td style={s.td}>E-Mail-Adresse, Passwort-Hash (PBKDF2-SHA256), Vorname, Nachname, Schule</td>
                <td style={s.td}>Login, Kontoidentifikation</td>
              </tr>
              <tr>
                <td style={s.td}>Lizenzdaten</td>
                <td style={s.td}>Lizenztyp (free/pro/schule), Ablaufdatum</td>
                <td style={s.td}>Zugangskontrolle zu Premiumfunktionen</td>
              </tr>
              <tr>
                <td style={s.td}>Nutzungsdaten</td>
                <td style={s.td}>Quiz-Ergebnisse, Lernfortschritte, letzter Login</td>
                <td style={s.td}>Personalisierte Auswertungen</td>
              </tr>
              <tr>
                <td style={s.td}>Sicherheitsdaten</td>
                <td style={s.td}>2FA-Status (TOTP), E-Mail-Verifikationsstatus</td>
                <td style={s.td}>Kontosicherheit</td>
              </tr>
            </tbody>
          </table>
          <p style={s.p}>
            Passwörter werden ausschließlich als gehashter Wert gespeichert —
            das Klartextpasswort verlässt Ihr Gerät nie im Klartext und ist für uns nicht einsehbar.
          </p>
        </div>

        <hr style={s.divider} />

        {/* 3 */}
        <div style={s.section}>
          <h3 style={s.h3}>3. Zweck der Verarbeitung</h3>
          <ul style={s.ul}>
            <li style={s.li}><strong>Login und Authentifizierung</strong> — Bereitstellung des personalisierten Zugangs</li>
            <li style={s.li}><strong>Lizenzprüfung</strong> — Steuerung des Zugriffs auf Premiumfunktionen</li>
            <li style={s.li}><strong>Lernfortschritt</strong> — Speicherung von Quiz-Ergebnissen zur Auswertung</li>
            <li style={s.li}><strong>Kontosicherheit</strong> — Passwort-Reset, E-Mail-Verifikation, 2-Faktor-Authentifizierung</li>
          </ul>
          <p style={s.p}>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) für Login
            und Kernfunktionen; Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) für Sicherheitsmaßnahmen.
          </p>
        </div>

        <hr style={s.divider} />

        {/* 4 */}
        <div style={s.section}>
          <h3 style={s.h3}>4. Hosting und Server</h3>
          <div style={s.infoBox}>
            <p style={{ ...s.p, marginBottom: 0, color: "rgba(240,236,227,0.9)" }}>
              BuchungsWerk wird auf einem <strong>eigenen Raspberry Pi-Server in Deutschland</strong> betrieben.
              Es wird kein Cloud-Anbieter (AWS, Azure, GCP o.ä.) verwendet.
              Sämtliche Daten verbleiben auf diesem privaten Server.
            </p>
          </div>
          <p style={s.p}>
            Der Webdienst wird über Cloudflare als Reverse-Proxy erreichbar gemacht.
            Cloudflare verarbeitet dabei IP-Adressen und HTTP-Anfragen im Rahmen der Weiterleitung.
            Details: <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" style={s.a}>Cloudflare Datenschutzerklärung</a>.
          </p>
        </div>

        <hr style={s.divider} />

        {/* 5 */}
        <div style={s.section}>
          <h3 style={s.h3}>5. Cookies und lokaler Speicher</h3>
          <p style={s.p}>
            Diese Website verwendet <strong>keine Tracking- oder Werbe-Cookies</strong>.
            Zur Anmeldung wird ein JWT-Session-Token im <code style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(240,236,227,0.6)" }}>localStorage</code> des
            Browsers gespeichert. Dieses Token enthält keine personenbezogenen Daten im Klartext
            und wird automatisch ungültig (Ablauf: 30 Tage).
          </p>
          <p style={s.p}>
            Weitere Einstellungen (z.B. Anzeigeoptionen) werden ebenfalls nur lokal im
            Browser gespeichert und nicht an den Server übertragen.
          </p>
        </div>

        <hr style={s.divider} />

        {/* 6 */}
        <div style={s.section}>
          <h3 style={s.h3}>6. KI-Funktion (Anthropic Claude API)</h3>
          <p style={s.p}>
            BuchungsWerk bietet eine KI-gestützte Aufgabengenerierung auf Basis der{" "}
            <a href="https://www.anthropic.com" target="_blank" rel="noopener noreferrer" style={s.a}>Anthropic Claude API</a>.
            Bei Nutzung dieser Funktion wird Ihr Eingabe-Prompt an die Anthropic-Server übermittelt.
          </p>
          <ul style={s.ul}>
            <li style={s.li}>Anthropic speichert Anfragen gemäß eigener Datenschutzrichtlinie (Standardmäßig keine Speicherung für Training)</li>
            <li style={s.li}>Keine personenbezogenen Schülerdaten werden an Anthropic übermittelt</li>
            <li style={s.li}>Die KI-Funktion ist nur für eingeloggte Nutzer verfügbar (JWT-geschützt)</li>
          </ul>
          <p style={s.p}>
            Weitere Informationen: <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={s.a}>Anthropic Privacy Policy</a>.
          </p>
        </div>

        <hr style={s.divider} />

        {/* 7 */}
        <div style={s.section}>
          <h3 style={s.h3}>7. Keine Weitergabe an Dritte</h3>
          <p style={s.p}>
            Ihre personenbezogenen Daten werden <strong>nicht an Dritte weitergegeben</strong>,
            verkauft oder für Werbezwecke genutzt. Eine Übermittlung an Dritte erfolgt
            ausschließlich wenn dies gesetzlich vorgeschrieben ist.
          </p>
        </div>

        <hr style={s.divider} />

        {/* 8 */}
        <div style={s.section}>
          <h3 style={s.h3}>8. Speicherdauer</h3>
          <ul style={s.ul}>
            <li style={s.li}><strong>Kontodaten:</strong> Bis zur Löschung des Kontos auf Anfrage</li>
            <li style={s.li}><strong>Lernfortschritte:</strong> Bis zur Löschung des Kontos</li>
            <li style={s.li}><strong>Session-Token (localStorage):</strong> 30 Tage, danach automatisch ungültig</li>
            <li style={s.li}><strong>Passwort-Reset-Token:</strong> 1 Stunde</li>
            <li style={s.li}><strong>E-Mail-Verifikations-Token:</strong> 24 Stunden</li>
          </ul>
        </div>

        <hr style={s.divider} />

        {/* 9 */}
        <div style={s.section}>
          <h3 style={s.h3}>9. Ihre Rechte (Art. 15–22 DSGVO)</h3>
          <p style={s.p}>Sie haben jederzeit das Recht auf:</p>
          <ul style={s.ul}>
            <li style={s.li}><strong>Auskunft</strong> (Art. 15 DSGVO) — Welche Daten wir über Sie gespeichert haben</li>
            <li style={s.li}><strong>Berichtigung</strong> (Art. 16 DSGVO) — Korrektur unrichtiger Daten</li>
            <li style={s.li}><strong>Löschung</strong> (Art. 17 DSGVO) — Löschung Ihrer personenbezogenen Daten</li>
            <li style={s.li}><strong>Einschränkung</strong> (Art. 18 DSGVO) — Einschränkung der Verarbeitung</li>
            <li style={s.li}><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) — Herausgabe Ihrer Daten in maschinenlesbarer Form</li>
            <li style={s.li}><strong>Widerspruch</strong> (Art. 21 DSGVO) — Widerspruch gegen die Verarbeitung</li>
          </ul>
          <p style={s.p}>
            Zur Ausübung Ihrer Rechte wenden Sie sich an:{" "}
            <a href="mailto:info@buchungswerk.org" style={s.a}>info@buchungswerk.org</a>
          </p>
        </div>

        <hr style={s.divider} />

        {/* 10 */}
        <div style={s.section}>
          <h3 style={s.h3}>10. Beschwerderecht</h3>
          <p style={s.p}>
            Sie haben das Recht, sich bei der zuständigen Datenschutzbehörde zu beschweren.<br />
            In Bayern: <strong>Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)</strong><br />
            Promenade 27, 91522 Ansbach<br />
            <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer" style={s.a}>www.lda.bayern.de</a>
          </p>
        </div>
      </div>
    </div>
  );
}
