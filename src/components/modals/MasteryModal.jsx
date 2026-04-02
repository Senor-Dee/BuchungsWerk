// ══════════════════════════════════════════════════════════════════════════════
// MasteryModal – Fortschrittsübersicht pro Task
// Extrahiert aus BuchungsWerk.jsx – Phase C2 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { Sprout, TrendingUp, Trophy, Star } from "lucide-react";
import { ladeMastery, masteryLevel } from "../../settings.js";
import { AUFGABEN_POOL } from "../../data/aufgabenPool.js";

function MasteryModal({ onSchliessen }) {
  const mastery = ladeMastery();
  const [filterKlasse, setFilterKlasse] = React.useState("alle");

  // Alle Tasks aus AUFGABEN_POOL flach sammeln
  const alleTasks = [];
  [7,8,9,10].forEach(k => {
    Object.entries(AUFGABEN_POOL[k] || {}).forEach(([lb, tasks]) => {
      tasks.forEach(t => {
        if (!alleTasks.find(x => x.id === t.id))
          alleTasks.push({ ...t, lb, klasse: k });
      });
    });
  });

  const klassen = ["alle", 7, 8, 9, 10];
  const gefiltert = filterKlasse === "alle" ? alleTasks : alleTasks.filter(t => t.klasse === filterKlasse);
  const geuebt   = gefiltert.filter(t => (mastery[t.id] || 0) > 0).length;
  const gesamt   = gefiltert.length;
  const pct      = gesamt > 0 ? Math.round(geuebt / gesamt * 100) : 0;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"rgba(22,16,8,0.96)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:20, width:"100%", maxWidth:600,
        maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#0f172a,#1e293b)", padding:"20px 24px",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#e8600a", letterSpacing:".12em",
              textTransform:"uppercase", marginBottom:4 }}>BuchungsWerk</div>
            <div style={{ fontSize:20, fontWeight:900, color:"#fff" }}>📈 Mein Fortschritt</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1.5px solid #334155",
            borderRadius:10, color:"#94a3b8", width:36, height:36, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>

        {/* Gesamtfortschritt */}
        <div style={{ padding:"16px 24px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>
              Themen geübt: {geuebt} / {gesamt}
            </span>
            <span style={{ fontSize:13, fontWeight:800, color:"#e8600a" }}>{pct}%</span>
          </div>
          <div style={{ height:10, background:"#e2e8f0", borderRadius:10, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#22c55e,#e8600a)",
              borderRadius:10, transition:"width 0.5s" }} />
          </div>
          {/* Klassen-Filter */}
          <div style={{ display:"flex", gap:6, marginTop:12 }}>
            {klassen.map(k => (
              <button key={k} onClick={() => setFilterKlasse(k)}
                style={{ padding:"4px 12px", borderRadius:20, border:"1.5px solid",
                  borderColor: filterKlasse===k ? "#0f172a" : "#e2e8f0",
                  background: filterKlasse===k ? "#0f172a" : "#fff",
                  color: filterKlasse===k ? "#e8600a" : "#64748b",
                  fontWeight:700, fontSize:11, cursor:"pointer" }}>
                {k === "alle" ? "Alle Klassen" : `Klasse ${k}`}
              </button>
            ))}
          </div>
        </div>

        {/* Task-Liste */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {/* Gruppiert nach LB */}
          {[...new Set(gefiltert.map(t => t.lb))].map(lb => {
            const lbTasks = gefiltert.filter(t => t.lb === lb);
            return (
              <div key={lb} style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase",
                  letterSpacing:".1em", marginBottom:8 }}>{lb}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {lbTasks.map(task => {
                    const count = mastery[task.id] || 0;
                    const ml = masteryLevel(count);
                    const barPct = Math.min(100, count / 20 * 100);
                    return (
                      <div key={task.id} style={{ display:"flex", alignItems:"center", gap:10,
                        padding:"8px 12px", borderRadius:10, background:ml.bg,
                        border:`1px solid ${ml.color}33` }}>
                        <span style={{ flexShrink:0, color:ml.color, display:"flex" }}>
                          {ml.level >= 4 ? <Trophy size={16} strokeWidth={1.5}/> : ml.level === 3 ? <Star size={16} strokeWidth={1.5}/> : ml.level === 2 ? <TrendingUp size={16} strokeWidth={1.5}/> : ml.level === 1 ? <Sprout size={16} strokeWidth={1.5}/> : <span style={{ fontSize:14, color:"#94a3b8" }}>○</span>}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"#0f172a",
                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {task.titel}
                          </div>
                          <div style={{ height:4, background:"#e2e8f0", borderRadius:4, marginTop:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${barPct}%`, background:ml.color,
                              borderRadius:4, transition:"width 0.4s" }} />
                          </div>
                        </div>
                        <div style={{ flexShrink:0, textAlign:"right" }}>
                          <div style={{ fontSize:11, fontWeight:800, color:ml.color }}>{ml.label}</div>
                          <div style={{ fontSize:10, color:"#94a3b8" }}>{count}×</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legende */}
        <div style={{ padding:"12px 24px", borderTop:"1px solid #f1f5f9", background:"#f8fafc",
          display:"flex", gap:12, flexWrap:"wrap" }}>
          {[
            { IconC: Sprout,    color:"#16a34a", label:"Beginner (1×)" },
            { IconC: TrendingUp, color:"#2563eb", label:"Geübt (5×)" },
            { IconC: Star,      color:"#7c3aed", label:"Fortgesch. (10×)" },
            { IconC: Trophy,    color:"#f59e0b", label:"Meister (20×)" },
          ].map(({ IconC, color, label }) => (
            <span key={label} style={{ fontSize:11, color:"#64748b", display:"flex", alignItems:"center", gap:4 }}><IconC size={12} strokeWidth={1.5} color={color}/>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}


export default MasteryModal;
