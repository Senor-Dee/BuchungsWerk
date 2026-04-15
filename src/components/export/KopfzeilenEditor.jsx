// ══════════════════════════════════════════════════════════════════════════════
// KopfzeilenEditor – Kopfzeilen-Konfiguration für Schulaufgaben
// Extrahiert aus BuchungsWerk.jsx – Phase C5 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useEffect } from "react";
import { S } from "../../styles.js";
import { useSettings } from "../../settings.js";

// ── Helper ────────────────────────────────────────────────────────────────────
function gesamtPunkteStr(config) { return config?.maxPunkte ? config.maxPunkte + "" : "?"; }

// ── KopfzeilenEditor ──────────────────────────────────────────────────────────
const DEFAULT_KOPFZEILE = {
  schulName: "", // wird aus settings.stammschule vorausgefüllt
  klasse: "",
  pruefungsNr: "",
  pruefungsart: "Schulaufgabe",
  datum: new Date().toISOString().split("T")[0],
  zeigeNote: true,
  zeigePunkte: true,
  zeigeUnterschrift: true,
};

function KopfzeilenEditor({ config, firma, kopfzeile, setKopfzeile }) {
  const settings = useSettings();
  // Auto-fill Stammschule from settings if kopfzeile.schulName is empty
  React.useEffect(() => {
    if (!kopfzeile.schulName && settings.stammschule) {
      setKopfzeile(p => ({ ...p, schulName: settings.stammschule }));
    }
  }, [settings.stammschule]);
  const k = kopfzeile;
  const lightInput = { fontSize:13, padding:"7px 10px", border:"1.5px solid #cbd5e1", borderRadius:8,
    background:"#fff", color:"#0f172a", outline:"none", boxSizing:"border-box",
    fontFamily:"Arial,sans-serif", transition:"border-color 150ms" };
  const inp = (label, field, type="text", placeholder="", extra={}) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3, flex:1, ...extra }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:".06em" }}>{label}</label>
      <input type={type} value={k[field] ?? ""} placeholder={placeholder}
        onChange={e => setKopfzeile(p => ({ ...p, [field]: e.target.value }))}
        style={lightInput} />
    </div>
  );
  const chk = (label, field) => (
    <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#374151", cursor:"pointer" }}>
      <input type="checkbox" checked={k[field]} onChange={e => setKopfzeile(p => ({ ...p, [field]: e.target.checked }))}
        style={{ width:14, height:14 }} />
      {label}
    </label>
  );

  // Vorschau der Kopfzeile
  const year = new Date(k.datum + "T00:00:00").getFullYear();
  const datumStr = k.datum ? new Date(k.datum + "T00:00:00").toLocaleDateString("de-DE", {day:"2-digit",month:"2-digit",year:"numeric"}) : "";

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>
        Kopfzeile der Prüfung
      </div>

      {/* Eingabefelder */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
        <div style={{ display:"flex", gap:10 }}>
          {inp("Schule", "schulName", "text", "z. B. Städtische Realschule München")}
          {inp("Klasse", "klasse", "text", `z. B. ${config.klasse}a`, { maxWidth:90 })}
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
          {inp("Nr.", "pruefungsNr", "text", "1", { maxWidth:56 })}
          {inp("Prüfungsart", "pruefungsart", "text", "z. B. Schulaufgabe")}
          {inp("Datum", "datum", "date", "", { maxWidth:150 })}
        </div>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", padding:"8px 0" }}>
          {chk("Notenfeld anzeigen", "zeigeNote")}
          {chk("Punkte-Feld anzeigen", "zeigePunkte")}
          {chk("Unterschrift EB", "zeigeUnterschrift")}
        </div>
      </div>

      {/* Vorschau */}
      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>
        Vorschau
      </div>
      <div style={{ border:"1px solid #cbd5e1", borderRadius:8, overflow:"hidden", fontFamily:"Arial,sans-serif", fontSize:11 }}>
        {/* Obere Linie: Schule + Fach */}
        <div style={{ background:"#f1f5f9", padding:"6px 12px", display:"flex", justifyContent:"space-between", borderBottom:"1px solid #e2e8f0" }}>
          <span style={{ fontWeight:700 }}>{k.schulName || "Schule"}</span>
          <span style={{ color:"#475569" }}>Betriebswirtschaftslehre/Rechnungswesen</span>
        </div>
        {/* Hauptkopf */}
        <div style={{ padding:"10px 12px", display:"flex", gap:12, flexWrap:"wrap", borderBottom:"2px solid #0f172a" }}>
          <div style={{ flex:2 }}>
            <div style={{ fontSize:14, fontWeight:800, marginBottom:2 }}>{(k.pruefungsNr ? k.pruefungsNr + ". " : "") + (k.pruefungsart || "Prüfungsart")}</div>
            <div style={{ fontSize:10, color:"#374151" }}>im Fach Betriebswirtschaft/Rechnungswesen</div>
            <div style={{ fontSize:11, color:"#475569" }}>
              Klasse: <strong>{k.klasse || config.klasse}</strong>
              {datumStr && <span style={{ marginLeft:14 }}>Datum: <strong>{datumStr}</strong></span>}
            </div>
            <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>
              {firma.name} · {gesamtPunkteStr(config)} Punkte
            </div>
          </div>
          {k.zeigePunkte && (
            <div style={{ border:"1px solid #cbd5e1", borderRadius:6, padding:"4px 10px", textAlign:"center", minWidth:90 }}>
              <div style={{ fontSize:9, color:"#64748b" }}>Erreichte Punkte</div>
              <div style={{ borderTop:"1px solid #cbd5e1", marginTop:2, paddingTop:2, fontSize:11, color:"#94a3b8" }}>____ / ? P</div>
            </div>
          )}
          {k.zeigeNote && (
            <div style={{ border:"2px solid #0f172a", borderRadius:6, padding:"4px 10px", textAlign:"center", minWidth:70 }}>
              <div style={{ fontSize:9, color:"#64748b" }}>Note</div>
              <div style={{ fontSize:20, fontWeight:900, color:"#0f172a", lineHeight:1.2 }}>&nbsp;</div>
            </div>
          )}
        </div>
        {/* Name + Unterschrift */}
        <div style={{ padding:"8px 12px", display:"flex", gap:14, fontSize:11 }}>
          <div style={{ flex:2 }}>
            Name: <span style={{ display:"inline-block", borderBottom:"1px solid #0f172a", minWidth:160 }}>&nbsp;</span>
          </div>
          {k.zeigeUnterschrift && (
            <div style={{ flex:1 }}>
              Unterschrift EB: <span style={{ display:"inline-block", borderBottom:"1px solid #0f172a", minWidth:110 }}>&nbsp;</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default KopfzeilenEditor;
export { DEFAULT_KOPFZEILE };
