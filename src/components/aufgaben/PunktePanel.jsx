// ══════════════════════════════════════════════════════════════════════════════
// PunktePanel – Punkte-Auswertung und Notenschlüssel
// Extrahiert aus BuchungsWerk.jsx – Phase E4 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { GraduationCap, Smile, Frown, RefreshCw } from "lucide-react";
import { berechnePunkte, NOTEN_ANKER, notenTabelle } from "../../utils.js";
import { S } from "../../styles.js";

export default function PunktePanel({ aufgaben, typ, maxPunkte }) {
  const [zeigTab, setZeigTab] = useState(false);
  const [strenge, setStrenge] = useState(0.5); // 0=locker, 1=streng, 0.5=ISB
  const gesamt = aufgaben.reduce((s, a) => s + berechnePunkte(a), 0);
  // Notenschlüssel basiert auf geplantem Punkteziel (wenn gesetzt), sonst auf tatsächlichem Gesamt
  const gesamtFuerNoten = maxPunkte && maxPunkte > 0 ? maxPunkte : gesamt;
  const g4pct = strenge <= 0.5
    ? NOTEN_ANKER.locker[3] + (NOTEN_ANKER.isb[3] - NOTEN_ANKER.locker[3]) * strenge * 2
    : NOTEN_ANKER.isb[3]    + (NOTEN_ANKER.streng[3] - NOTEN_ANKER.isb[3]) * (strenge - 0.5) * 2;
  const grenze4 = Math.round(gesamtFuerNoten * g4pct * 2) / 2;
  let einordnung = "";
  if (typ === "Prüfung") {
    if (gesamtFuerNoten <= 22) einordnung = "Stegreifaufgabe";
    else if (gesamtFuerNoten <= 32) einordnung = "Kurzarbeit";
    else if (gesamtFuerNoten <= 46) einordnung = "Schulaufgabe";
    else einordnung = "Umfangr. Schulaufgabe";
  }
  return (
    <div style={{ background: "#141008", borderRadius: "14px", padding: "20px 24px", marginBottom: "16px", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.4)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Punkte-Auswertung · 2026</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap:"wrap" }}>
            <span style={{ fontSize: "42px", fontWeight: 900, color: "#e8600a", lineHeight: 1 }}>{gesamt}</span>
            <span style={{ fontSize: "18px", color: "rgba(240,236,227,0.5)" }}>Punkte</span>
            {maxPunkte && maxPunkte !== gesamt && (
              <span style={{ fontSize:"12px", color:"rgba(240,236,227,0.4)", background:"rgba(240,236,227,0.06)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:6, padding:"2px 8px", alignSelf:"center" }}>
                Ziel: {maxPunkte} P
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "24px", fontWeight: 800, color: "#60a5fa" }}>~{gesamt} min</div><div style={{ fontSize: "11px", color: "#64748b" }}>Bearbeitungszeit</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "24px", fontWeight: 800, color: "#4ade80" }}>≥ {grenze4 % 1 === 0 ? grenze4 : grenze4.toFixed(1)} P</div><div style={{ fontSize: "11px", color: "#64748b" }}>Untergrenze Note 4</div></div>
          {einordnung && <div style={{ textAlign: "center" }}><div style={{ fontSize: "13px", fontWeight: 800, color: "#fbbf24", background: "#78350f33", border: "1px solid #78350f55", borderRadius: "8px", padding: "6px 12px" }}>{einordnung}</div></div>}
        </div>
      </div>
      <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        {(() => {
          const pills = [];
          let aufgNr = 0;
          aufgaben.forEach((a, i) => {
            if (a.taskTyp === "komplex" && a.schritte?.length) {
              aufgNr++;
              const labels = "abcdefghij";
              a.schritte.forEach((st, si) => {
                pills.push(
                  <div key={`${i}-${si}`} style={{ background: "#1e293b", border: "1px solid #e8600a44", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", display: "flex", gap: "4px" }}>
                    <span style={{ color: "#e8600a88", fontWeight: 700 }}>A{aufgNr}{labels[si]}</span>
                    <span style={S.accent}>{st.punkte}P</span>
                  </div>
                );
              });
            } else {
              aufgNr++;
              const p = berechnePunkte(a);
              pills.push(
                <div key={i} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", display: "flex", gap: "4px" }}>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>A{aufgNr}</span>
                  <span style={S.accent}>{p}P</span>
                </div>
              );
            }
          });
          return pills;
        })()}
        <div style={{ background: "#e8600a", borderRadius: "8px", padding: "4px 12px", fontSize: "12px", color: "#fff", fontWeight: 800 }}>Σ {gesamt} P</div>
      </div>
      <button onClick={() => setZeigTab(!zeigTab)} style={{ marginTop: "10px", background: "transparent", border: "1px solid #334155", borderRadius: "6px", color: "#94a3b8", fontSize: "11px", padding: "4px 12px", cursor: "pointer" }}>
        {zeigTab ? "▲ Notenschlüssel" : "▼ Notenschlüssel"}
      </button>
      {zeigTab && (
        <div style={{ marginTop: "10px" }}>
          {/* ── Strenge-Regler ── */}
          <div style={{ marginBottom: "12px", background: "#1e293b", borderRadius: "10px", padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, display:"flex", alignItems:"center", gap:4 }}><GraduationCap size={12} strokeWidth={1.5}/>Anforderungsniveau</span>
              <span style={{ fontSize: "11px", color: "#e8600a", fontWeight: 700 }}>
                Note 4 ab {Math.round(g4pct * 100)} %
                {Math.abs(strenge - 0.5) < 0.04 && <span style={{ color: "#64748b", marginLeft: "6px" }}>(ISB-Standard)</span>}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: 700, minWidth: "46px", display:"flex", alignItems:"center", gap:3 }}><Smile size={12} strokeWidth={1.5}/>locker</span>
              <div style={{ flex: 1, position: "relative" }}>
                <input type="range" min="0" max="100" value={Math.round(strenge * 100)}
                  onChange={e => setStrenge(Number(e.target.value) / 100)}
                  style={{ width: "100%", accentColor: "#e8600a", cursor: "pointer", height: "6px" }} />
                {/* ISB-Marker */}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "3px", height: "14px", background: "#475569", borderRadius: "2px", pointerEvents: "none" }} />
              </div>
              <span style={{ fontSize: "12px", color: "#f87171", fontWeight: 700, minWidth: "46px", textAlign: "right", display:"flex", alignItems:"center", gap:3, justifyContent:"flex-end" }}><Frown size={12} strokeWidth={1.5}/>streng</span>
            </div>
            {Math.abs(strenge - 0.5) > 0.04 && (
              <button onClick={() => setStrenge(0.5)} style={{ marginTop: "6px", fontSize: "10px", color: "#64748b", background: "transparent", border: "1px solid #334155", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}>
                <RefreshCw size={9} strokeWidth={1.5}/>Standard zurücksetzen
              </button>
            )}
          </div>
          {/* ── Noten-Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "4px" }}>
            {notenTabelle(gesamtFuerNoten, strenge).map(n => (
              <div key={n.note} style={{ background: n.farbe + "22", border: `1px solid ${n.farbe}44`, borderRadius: "8px", padding: "6px 4px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: 900, color: n.farbe }}>{n.note}</div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>{n.text}</div>
                <div style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 700 }}>{n.von % 1 === 0 ? n.von : n.von.toFixed(1)}–{n.bis % 1 === 0 ? n.bis : n.bis.toFixed(1)}P</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
