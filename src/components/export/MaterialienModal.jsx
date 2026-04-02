// ══════════════════════════════════════════════════════════════════════════════
// MaterialienModal – gespeicherte Übungen laden und verwalten
// Extrahiert aus BuchungsWerk.jsx – Phase C5 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { apiFetch } from "../../api.js";
import { IconFor } from "../IconFor.jsx";

// ── MaterialienModal ───────────────────────────────────────────────────────────
function MaterialienModal({ onSchliessen, onLaden }) {
  const [materialien, setMaterialien] = useState([]);
  const [stufe, setStufe] = useState(null);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");

  const ladeAlles = async (s) => {
    setLaden(true); setFehler("");
    const url = "/materialien" + (s ? `?stufe=${s}` : "");
    const res = await apiFetch(url);
    if (res) setMaterialien(res);
    else setFehler("Backend nicht erreichbar.");
    setLaden(false);
  };

  React.useEffect(() => { ladeAlles(stufe); }, [stufe]);

  const loeschen = async (id, titel) => {
    if (!confirm(`"${titel}" löschen?`)) return;
    await apiFetch(`/materialien/${id}`, "DELETE");
    ladeAlles(stufe);
  };

  const material_laden = async (id) => {
    const m = await apiFetch(`/materialien/${id}`);
    if (!m?.daten_json) return;
    try {
      const daten = JSON.parse(m.daten_json);
      onLaden(daten);
      onSchliessen();
    } catch { alert("Fehler beim Laden."); }
  };

  const gruppiertNachStufe = [7,8,9,10].map(s => ({
    stufe: s,
    items: materialien.filter(m => m.jahrgangsstufe === s)
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#0f172a", borderRadius:"16px", width:"100%", maxWidth:"560px", maxHeight:"85vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #1e293b", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#64748b", marginBottom:"3px" }}>Materialien</div>
            <div style={{ fontSize:"18px", fontWeight:900, color:"#fff" }}>📚 Gespeicherte Übungen</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", width:"34px", height:"34px", cursor:"pointer", fontSize:"18px" }}>×</button>
        </div>

        {/* Filter */}
        <div style={{ padding:"12px 22px", borderBottom:"1px solid #1e293b", display:"flex", gap:"6px", flexShrink:0 }}>
          {[null,7,8,9,10].map(s => (
            <button key={s??'alle'} onClick={() => setStufe(s)}
              style={{ padding:"5px 12px", borderRadius:"7px", border:"none", cursor:"pointer", fontSize:"12px", fontWeight:stufe===s?700:500,
                background: stufe===s ? "#e8600a" : "#1e293b", color: stufe===s ? "#0f172a" : "#94a3b8" }}>
              {s ? `Klasse ${s}` : "Alle"}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div style={{ overflowY:"auto", padding:"16px 22px", flex:1 }}>
          {laden && <div style={{ color:"#64748b", textAlign:"center", padding:"20px" }}>⏳ Laden…</div>}
          {fehler && <div style={{ color:"#f87171", textAlign:"center", padding:"20px" }}>{fehler}</div>}
          {!laden && !fehler && materialien.length === 0 && (
            <div style={{ color:"#475569", textAlign:"center", padding:"28px", fontSize:"13px" }}>
              Noch keine Materialien gespeichert.<br/>
              <span style={{ fontSize:"11px" }}>Erstelle eine Übung und klicke auf "💾 Speichern".</span>
            </div>
          )}
          {gruppiertNachStufe.map(({ stufe: s, items }) => (
            <div key={s} style={{ marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"8px" }}>
                Klasse {s}
              </div>
              {items.map(m => (
                <div key={m.id} style={{ background:"#1e293b", borderRadius:"10px", padding:"12px 14px", marginBottom:"7px", display:"flex", alignItems:"center", gap:"10px" }}>
                  <div style={{ fontSize:"20px", flexShrink:0, display:"flex", alignItems:"center" }}>
                    {m.firma_icon
                      ? <IconFor name={m.firma_icon} size={20} color="#94a3b8" />
                      : "📋"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:700, color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.titel}</div>
                    <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>
                      {m.typ}{m.pruefungsart ? ` · ${m.pruefungsart}` : ""} · {m.firma_name || ""} · {m.gesamt_punkte} P
                    </div>
                    <div style={{ fontSize:"10px", color:"#475569", marginTop:"1px" }}>
                      {new Date(m.erstellt).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                    <button onClick={() => material_laden(m.id)}
                      style={{ padding:"6px 12px", borderRadius:"7px", border:"none", background:"#e8600a", color:"#0f172a", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
                      Laden
                    </button>
                    <button onClick={() => loeschen(m.id, m.titel)}
                      style={{ padding:"6px 10px", borderRadius:"7px", border:"1px solid #334155", background:"transparent", color:"#94a3b8", fontSize:"12px", cursor:"pointer" }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



export default MaterialienModal;
