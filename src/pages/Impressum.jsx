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
    transition: "color 150ms",
  },
  container: { maxWidth: 740, margin: "0 auto", padding: "48px 24px" },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 38, letterSpacing: "0.06em",
    color: "#f0ece3", marginBottom: 36,
  },
  section: { marginBottom: 32 },
  h3: {
    fontSize: 13, fontWeight: 700, letterSpacing: "0.1em",
    textTransform: "uppercase", color: "#e8600a",
    marginBottom: 10,
  },
  p: { fontSize: 14.5, lineHeight: 1.75, color: "rgba(240,236,227,0.8)", marginBottom: 10 },
  a: { color: "#e8600a", textDecoration: "none" },
  placeholder: {
    background: "rgba(232,96,10,0.08)", border: "1px dashed rgba(232,96,10,0.4)",
    borderRadius: 6, padding: "2px 8px", fontSize: 13,
    color: "rgba(232,96,10,0.9)", fontFamily: "monospace",
  },
  divider: { borderColor: "rgba(240,236,227,0.08)", margin: "32px 0" },
};

export default function Impressum() {
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
        <h1 style={s.title}>Impressum</h1>

        <div style={s.section}>
          <h3 style={s.h3}>Angaben gemäß § 5 TMG</h3>
          <p style={s.p}>
            Anton Gebert<br />
            <span style={s.placeholder}>[STRASSE UND HAUSNUMMER]</span><br />
            <span style={s.placeholder}>[PLZ ORT]</span>
          </p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h3 style={s.h3}>Kontakt</h3>
          <p style={s.p}>
            E-Mail: <a href="mailto:info@buchungswerk.org" style={s.a}>info@buchungswerk.org</a>
          </p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h3 style={s.h3}>Berufsbezeichnung</h3>
          <p style={s.p}>
            Berufsbezeichnung: Lehrer (verliehen in der Bundesrepublik Deutschland)<br />
            Zuständige Behörde: Bayerisches Staatsministerium für Unterricht und Kultus
          </p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h3 style={s.h3}>Verantwortlicher für den Inhalt (§ 18 Abs. 2 MStV)</h3>
          <p style={s.p}>
            Anton Gebert<br />
            <span style={s.placeholder}>[STRASSE UND HAUSNUMMER]</span><br />
            <span style={s.placeholder}>[PLZ ORT]</span>
          </p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h3 style={s.h3}>EU-Streitschlichtung</h3>
          <p style={s.p}>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={s.a}>
              https://ec.europa.eu/consumers/odr/
            </a>.<br />
            Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
        </div>

        <div style={s.section}>
          <h3 style={s.h3}>Verbraucherstreitbeilegung</h3>
          <p style={s.p}>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h3 style={s.h3}>Haftung für Inhalte</h3>
          <p style={s.p}>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen
            Seiten nach den allgemeinen Gesetzen verantwortlich. Die auf dieser Plattform
            bereitgestellten Aufgaben und Inhalte dienen ausschließlich Bildungszwecken und
            erheben keinen Anspruch auf Vollständigkeit oder Aktualität des Lehrplans.
          </p>
        </div>
      </div>
    </div>
  );
}
