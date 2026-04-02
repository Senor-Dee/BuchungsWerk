// ══════════════════════════════════════════════════════════════════════════════
// LehrerDashboard – Live-Schüler-Rangliste während SimulationModus
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { Users } from "lucide-react";

function LehrerDashboard({ rangliste, klassenCode, phase, onSchliessen }) {
  const aktiv  = rangliste.filter(r => !r.zeit || r.zeit === 0);
  const fertig = rangliste.filter(r => r.zeit && r.zeit > 0);
  const fmtT   = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, display:"flex", alignItems:"flex-start", justifyContent:"flex-end", pointerEvents:"none" }}>
      <div style={{ pointerEvents:"all", width:320, maxHeight:"100vh", overflowY:"auto", background:"rgba(10,7,2,0.97)", border:"1px solid rgba(232,96,10,0.3)", borderRight:"none", borderTop:"none", boxShadow:"-4px 0 24px rgba(0,0,0,0.6)", display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(240,236,227,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(232,96,10,0.06)", flexShrink:0 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Users size={14} strokeWidth={1.5} style={{ color:"#e8600a" }}/>
              <span style={{ fontSize:13, fontWeight:800, color:"#f0ece3" }}>Live-Dashboard</span>
            </div>
            <div style={{ fontSize:10, color:"rgba(240,236,227,0.35)", marginTop:2, fontFamily:"'Fira Code',monospace" }}>{klassenCode || "Keine Session"} · Phase: {phase}</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"none", border:"none", color:"rgba(240,236,227,0.4)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
        </div>
        {/* Statistik-Kacheln */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, padding:"12px 14px", borderBottom:"1px solid rgba(240,236,227,0.07)", flexShrink:0 }}>
          {[
            { label:"Verbunden", value:rangliste.length, color:"#4ade80" },
            { label:"Aktiv", value:aktiv.length, color:"#e8600a" },
            { label:"Fertig", value:fertig.length, color:"#93c5fd" },
          ].map(({label,value,color}) => (
            <div key={label} style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.08)", borderRadius:8, padding:"8px", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:900, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:9, color:"rgba(240,236,227,0.4)", marginTop:2, textTransform:"uppercase", letterSpacing:".06em" }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Rangliste */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
          {rangliste.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:"rgba(240,236,227,0.2)", fontSize:12 }}>Warten auf Schüler…</div>
          ) : (
            rangliste.map((r, i) => {
              const pct = r.max_punkte ? Math.round(r.punkte / r.max_punkte * 100) : 0;
              const laufend = !r.zeit || r.zeit === 0;
              return (
                <div key={i} style={{ marginBottom:8, padding:"9px 10px", background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.07)", borderRadius:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                    <span style={{ fontWeight:800, fontSize:11, color:"#e8600a", minWidth:18 }}>{i+1}.</span>
                    <span style={{ flex:1, fontSize:12, fontWeight:700, color:"#f0ece3" }}>{r.spieler || "Anonym"}</span>
                    <span style={{ fontSize:10, color: laufend ? "#e8600a" : "#4ade80", fontWeight:700 }}>
                      {laufend ? "●" : "✓"} {r.punkte}/{r.max_punkte} P
                    </span>
                  </div>
                  <div style={{ height:4, background:"rgba(240,236,227,0.07)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background: pct>=80?"#4ade80":pct>=50?"#e8600a":"#f87171", borderRadius:2, transition:"width 1s" }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                    <span style={{ fontSize:9, color:"rgba(240,236,227,0.3)" }}>{pct}%</span>
                    {!laufend && <span style={{ fontSize:9, color:"rgba(240,236,227,0.3)", fontFamily:"monospace" }}>{fmtT(r.zeit)}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div style={{ padding:"8px 14px", borderTop:"1px solid rgba(240,236,227,0.07)", fontSize:9, color:"rgba(240,236,227,0.2)", flexShrink:0 }}>Aktualisiert alle 5 s</div>
      </div>
    </div>
  );
}

export default LehrerDashboard;
