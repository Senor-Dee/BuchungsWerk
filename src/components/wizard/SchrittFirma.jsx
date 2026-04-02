// ══════════════════════════════════════════════════════════════════════════════
// SchrittFirma – Schritt 2: Modellunternehmen wählen
// Extrahiert aus BuchungsWerk.jsx – Phase D2 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { UNTERNEHMEN } from "../../data/stammdaten.js";
import { IconFor } from "../IconFor.jsx";
import { S } from "../../styles.js";

export function SchrittFirma({ config, onWeiter, onZurueck }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ background: "transparent", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ background: "linear-gradient(160deg,#1a1208,#251a0a)", padding: "28px 20px 36px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#e8600a", marginBottom: "6px" }}>Schritt 2 von 3</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>Modellunternehmen wählen</div>
          <p style={{ color: "#94a3b8", marginTop: "6px", marginBottom: 0, fontSize: "14px" }}>
            {config.typ}{config.pruefungsart ? ` · ${config.pruefungsart}` : ""} · Klasse {config.klasse} · {Object.values(config.selectedThemen).reduce((s, ids) => s + ids.length, 0)} Themen{config.anzahl ? ` · ${config.anzahl} Aufgaben` : ` · Ziel: ${config.maxPunkte} P`}
          </p>
        </div>
      </div>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {UNTERNEHMEN.map(u => (
            <button key={u.id} onClick={() => setSelected(u.id)} style={{ padding: 0, border: "2px solid", cursor: "pointer", textAlign: "left", overflow: "hidden", borderRadius: "12px", borderColor: selected === u.id ? u.farbe : "rgba(240,236,227,0.15)", background: selected === u.id ? u.farbe + "22" : "rgba(30,22,10,0.6)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
              <div style={{ background: u.farbe, padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.9)", display:"flex" }}><IconFor name={u.icon} size={20} /></span>
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#fff" }}>{u.name}</span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: "13px", color: "#f0ece3", fontWeight: 600 }}>{u.ort} · {u.rechtsform}</div>
                <div style={{ fontSize: "12px", color: "rgba(240,236,227,0.5)" }}>{u.branche}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onZurueck} style={S.btnSecondary}>← Zurück</button>
          <button onClick={() => selected && onWeiter(UNTERNEHMEN.find(u => u.id === selected))} disabled={!selected}
            style={{ ...S.btnPrimary, flex: 1, opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "not-allowed",
              boxShadow: selected ? "0 4px 16px rgba(15,23,42,0.3)" : "none" }}>
            Aufgaben generieren →
          </button>
        </div>
      </div>
    </div>
  );
}
