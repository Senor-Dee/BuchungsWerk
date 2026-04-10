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
          {UNTERNEHMEN.map(u => {
            const isSel = selected === u.id;
            return (
              <button key={u.id} onClick={() => setSelected(u.id)}
                style={{ padding: 0, border: "2px solid", cursor: "pointer", textAlign: "left", overflow: "hidden", borderRadius: "14px",
                  borderColor: isSel ? u.farbe : "rgba(240,236,227,0.12)",
                  background: isSel ? u.farbe + "1a" : "rgba(20,16,8,0.72)",
                  backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                  boxShadow: isSel ? `0 0 22px ${u.farbe}40, 0 2px 8px rgba(0,0,0,0.4)` : "0 2px 8px rgba(0,0,0,0.3)",
                  transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s" }}>
                <div style={{ background: `linear-gradient(135deg, ${u.farbe}ee, ${u.farbe}bb)`, padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:"rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ color: "rgba(255,255,255,0.95)", display:"flex" }}><IconFor name={u.icon} size={20} /></span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "14px", color: "#fff", letterSpacing:"-0.01em" }}>{u.name}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>{u.rechtsform}</div>
                  </div>
                  {isSel && <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", background:"rgba(255,255,255,0.9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>✓</div>}
                </div>
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: "13px", color: "rgba(240,236,227,0.85)", fontWeight: 600 }}>{u.ort}</div>
                  <div style={{ fontSize: "12px", color: "rgba(240,236,227,0.45)", marginTop:2 }}>{u.branche}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onZurueck} className="bw-btn" style={S.btnSecondary}>← Zurück</button>
          <button onClick={() => selected && onWeiter(UNTERNEHMEN.find(u => u.id === selected))} disabled={!selected} className="bw-btn bw-btn-primary"
            style={{ ...S.btnPrimary, flex: 1, opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "not-allowed",
              boxShadow: selected ? "0 4px 16px rgba(15,23,42,0.3)" : "none" }}>
            Aufgaben generieren →
          </button>
        </div>
      </div>
    </div>
  );
}
