// ══════════════════════════════════════════════════════════════════════════════
// SchrittTyp – Schritt 1: Konfiguration (Typ, Klasse, Themen, Optionen)
// Extrahiert aus BuchungsWerk.jsx – Phase D2 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { FileText, Zap, Timer, Search, PenLine, ClipboardList, Factory,
         ReceiptEuro, FolderOpen, RefreshCw, Package, BarChart2, Download,
         Tag, Building2, Upload, AlertTriangle, TrendingDown, Settings } from "lucide-react";
import { AUFGABEN_POOL } from "../../data/aufgabenPool.js";
import { LB_INFO, WERKSTOFF_TYPEN } from "../../utils.js";
import { UNTERNEHMEN } from "../../data/stammdaten.js";
import { IconFor } from "../IconFor.jsx";
import { KürzelSpan } from "../kontenplan/KontenplanModal.jsx";
import { S } from "../../styles.js";

export function SchrittTyp({ onWeiter, onBelegEditor, onEigeneBelege, onSimulation, initialConfig }) {
  // Wenn initialConfig gesetzt → Vorauswahl aus bestehendem config
  const ic = initialConfig;
  const [typ, setTyp] = useState(ic?.typ ?? null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [pruefungsart, setPruefungsart] = useState(ic?.pruefungsart ?? null);
  const [klasse, setKlasse] = useState(ic?.klasse ?? null);
  const [datum, setDatum] = useState(ic?.datum ?? new Date().toISOString().split("T")[0]);
  const [maxPunkte, setMaxPunkte] = useState(ic?.maxPunkte ?? 30);
  const [zielAnzahl, setZielAnzahl] = useState(ic?.anzahl ?? 5);
  const [zielModus, setZielModus] = useState("anzahl"); // "anzahl" | "punkte" – nur für Übung
  // selectedThemen: { lb: { taskId: count } } — count=0 bedeutet abgewählt
  const [selectedThemen, setSelectedThemen] = useState(() => {
    if (!ic?.selectedThemen) return {};
    return Object.fromEntries(
      Object.entries(ic.selectedThemen).map(([lb, ids]) => {
        const m = {};
        (ids || []).forEach(id => { m[id] = (m[id] || 0) + 1; });
        return [lb, m];
      })
    );
  });
  const [expandedLBs, setExpandedLBs] = useState(() => {
    if (!ic?.selectedThemen) return {};
    return Object.fromEntries(Object.keys(ic.selectedThemen).map(lb => [lb, true]));
  });
  const [werkstoffId, setWerkstoffId] = useState(ic?.werkstoffId ?? "rohstoffe");
  const [komplexOpts, setKomplexOpts] = useState(ic?.komplexOpts ?? {
    angebotsvergleich: false,
    kalkulation: false,
    ruecksendung: false,
    nachlass: false,
    anteilArt: "pct",       // "pct" | "euro"
    rueckPct: 20,
    nlPct: 5,
    rueckEuro: "",
    nlEuro: "",
    euroIsBrutto: false,
    skonto: true,
  });
  const [abschlussOpts, setAbschlussOpts] = useState({
    ara: true, rst: true, afa: true, ewb: false, ewbPct: 50, guv: true, kennzahlen: false,
  });
  const [pctOpts, setPctOpts] = useState(ic?.pctOpts ?? {
    typen: ["prozentwert","grundwert","prozentsatz","erhoeht","vermindert","veraenderung","kombiniert"],
    schwierigkeit: "gemischt", // "einfach" | "gemischt" | "schwer"
  });
  const [forderungOpts, setForderungOpts] = useState({
    ewb: false,
    ewbPct: 50,
    ausgang: "totalausfall",   // "totalausfall" | "teilausfall" | "wiederzahlung"
    quotePct: 30,
  });
  const [verkaufOpts, setVerkaufOpts] = useState({
    vorkalkulation: false,
    ruecksendung: false,
    nachlass: false,
    anteilArt: "pct",
    rueckPct: 25,
    nlPct: 5,
    rueckEuro: "",
    nlEuro: "",
    euroIsBrutto: false,
    skonto: true,
  });

  // Lernbereiche: aktuelle Klasse + optionale Vorklassen (Wiederholung)
  const [wiederholungAn, setWiederholungAn] = useState(false);
  const vorklassen = klasse ? [7,8,9,10].filter(k => k < klasse) : [];
  // Hilfsfunktion: findet den Pool-Eintrag eines Tasks klassenübergreifend
  const findTask = (lb, tid) => {
    for (const k of [7,8,9,10]) {
      const t = (AUFGABEN_POOL[k]?.[lb] || []).find(x => x.id === tid);
      if (t) return t;
    }
    return null;
  };
  const lernbereiche = klasse ? Object.keys(AUFGABEN_POOL[klasse]) : [];
  const vorLernbereiche = (klasse && wiederholungAn)
    ? vorklassen.flatMap(k => Object.keys(AUFGABEN_POOL[k]).map(lb => ({ lb, k })))
    : [];
  const activeLBs = Object.keys(selectedThemen).filter(lb => {
    const m = selectedThemen[lb] || {};
    return Object.values(m).some(c => c > 0);
  });
  const totalThemen = activeLBs.reduce((s, lb) => {
    return s + Object.values(selectedThemen[lb] || {}).filter(c => c > 0).length;
  }, 0);
  // Für komplex-Tasks: Schrittzahl aus den konfigurierten Optionen ableiten
  const estimiereKomplexSchritte = (tid) => {
    if (tid === "8_komplex_einkauf_kette")
      return 2 + (komplexOpts.angebotsvergleich || komplexOpts.kalkulation ? 1 : 0)
               + (komplexOpts.ruecksendung ? 1 : 0) + (komplexOpts.nachlass ? 1 : 0);
    if (tid === "8_komplex_verkauf_kette")
      return 2 + (verkaufOpts.vorkalkulation ? 1 : 0)
               + (verkaufOpts.ruecksendung ? 1 : 0) + (verkaufOpts.nachlass ? 1 : 0);
    if (tid === "9_komplex_forderungskette")
      return 3 + (forderungOpts.ewb ? 1 : 0);
    if (tid === "10_komplex_abschlusskette")
      return (abschlussOpts.ara !== false ? 1 : 0) + (abschlussOpts.rst !== false ? 1 : 0)
           + (abschlussOpts.afa !== false ? 1 : 0) + (abschlussOpts.ewb ? 1 : 0)
           + (abschlussOpts.guv !== false ? 1 : 0) + (abschlussOpts.kennzahlen ? 1 : 0);
    return 3;
  };
  const totalAnzahl = activeLBs.reduce((s, lb) => {
    return s + Object.entries(selectedThemen[lb] || {}).reduce((a2, [tid, cnt]) => {
      if (!cnt) return a2;
      const t = findTask(lb, tid);
      return a2 + (t?.taskTyp === "komplex" ? estimiereKomplexSchritte(tid) * cnt : cnt);
    }, 0);
  }, 0);

  // Estimate points: sum of selected task types × count × average points
  const estPunkte = activeLBs.reduce((sum, lb) => {
    return sum + Object.entries(selectedThemen[lb] || {}).reduce((s2, [tid, cnt]) => {
      if (!cnt) return s2;
      const t = findTask(lb, tid);
      if (!t) return s2;
      const pts = t.taskTyp === "komplex" ? 16 : t.taskTyp === "rechnung" ? (t.nrPunkte || 3) : 2 + (t.nrPunkte || 0);
      return s2 + pts * cnt;
    }, 0);
  }, 0);

  function onKlasseChange(k) { setKlasse(k); setSelectedThemen({}); setExpandedLBs({}); setWiederholungAn(false); }

  function toggleLB(lb) {
    // Nur Auf-/Zuklappen – keine automatische Auswahl aller Themen
    setExpandedLBs(prev => ({ ...prev, [lb]: !prev[lb] }));
  }

  function toggleThema(lb, id) {
    setSelectedThemen(prev => {
      const m = { ...(prev[lb] || {}) };
      m[id] = (m[id] || 0) > 0 ? 0 : 1;
      return { ...prev, [lb]: m };
    });
  }
  function adjustCount(lb, id, delta) {
    setSelectedThemen(prev => {
      const m = { ...(prev[lb] || {}) };
      m[id] = Math.max(0, Math.min(5, (m[id] || 0) + delta));
      return { ...prev, [lb]: m };
    });
  }

  const PRUEFUNGSARTEN = [
    { id: "Schulaufgabe",    icon: FileText, info: "90–100 min · 30–50 P", defaultP: 40 },
    { id: "Stegreifaufgabe", icon: Zap,      info: "20 min · 10–15 P",     defaultP: 12 },
    { id: "Kurzarbeit",      icon: Timer,    info: "30–45 min · 15–25 P",  defaultP: 20 },
    { id: "Test",            icon: Search,   info: "45–60 min · 20–30 P",  defaultP: 25 },
  ];

  const canProceed = typ && klasse && totalThemen > 0 && (typ === "Übung" || pruefungsart);

  return (
    <div style={{ background: "transparent" }}>

      {/* ── HERO ── */}
      <div style={{ padding: "18px 16px 20px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#e8600a", marginBottom: "4px" }}>BwR Bayern</div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "rgba(240,236,227,0.85)", letterSpacing: "-0.02em", marginBottom: "14px" }}>Was möchtest du erstellen?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
        {[
          ["Übung", PenLine, "Aufgaben üben", () => { setTyp("Übung"); setPruefungsart(null); }],
          ["Prüfung", ClipboardList, "Schulaufgabe", () => setTyp("Prüfung")],
          ["Simulation", Factory, "Firma führen", () => { setTyp("Simulation"); onSimulation && onSimulation(); }],
          ["Beleg-Editor", ReceiptEuro, "Beleg erstellen", () => onBelegEditor && onBelegEditor()],
        ].map(([t, icon, desc, onClick]) => {
          const sel = typ === t;
          const hov = hoveredCard === t && !sel;
          return (
            <button key={t} onClick={onClick}
              onMouseEnter={() => setHoveredCard(t)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ flex: 1, padding: "14px 10px", cursor: "pointer", textAlign: "center",
                borderRadius: "14px", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                border: `2px solid ${sel ? "#e8600a" : hov ? "rgba(240,236,227,0.28)" : "rgba(240,236,227,0.12)"}`,
                background: sel ? "rgba(232,96,10,0.12)" : hov ? "rgba(40,30,15,0.8)" : "rgba(30,22,10,0.5)",
                color: sel ? "#e8600a" : hov ? "#f0ece3" : "rgba(240,236,227,0.6)",
                boxShadow: sel ? "0 4px 20px rgba(232,96,10,0.25)" : hov ? "0 2px 10px rgba(0,0,0,0.25)" : "none",
                transform: hov ? "translateY(-1px)" : "none",
                transition: "all 0.18s" }}>
              <div style={{ marginBottom: "7px", display:"flex", justifyContent:"center" }}>{React.createElement(icon, { size: 22, strokeWidth: 1.5 })}</div>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "2px" }}>{t}</div>
              <div style={{ fontSize: "10px", opacity: 0.6 }}>{desc}</div>
            </button>
          );
        })}
          </div>
        </div>
      </div>

      {/* ── Sticky Fortschritts-Bar ── */}
      {klasse && totalAnzahl > 0 && (() => {
        const isPruefung = typ === "Prüfung";
        const showPunkte = isPruefung || zielModus === "punkte";
        const cur = showPunkte ? estPunkte : totalAnzahl;
        const ziel = showPunkte ? maxPunkte : zielAnzahl;
        const pct = Math.min(100, ziel > 0 ? (cur / ziel) * 100 : 0);
        const ok = cur >= ziel;
        const over = cur > ziel;
        const barColor = over ? "#f87171" : ok ? "#4ade80" : "#e8600a";
        const label = showPunkte ? `${cur} / ${ziel} P` : `${cur} / ${ziel} Aufg.`;
        const sub = showPunkte ? "Punkte-Fortschritt" : "Aufgaben-Fortschritt";
        return (
          <div style={{ position:"sticky", top:62, zIndex:150,
            background:"rgba(14,10,4,0.55)", backdropFilter:"blur(24px) saturate(180%)", WebkitBackdropFilter:"blur(24px) saturate(180%)",
            borderBottom:"1.5px solid rgba(240,236,227,0.1)", padding:"8px 20px",
            display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.45)", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>{sub}</span>
            <div style={{ flex:1, height:5, borderRadius:3, background:"rgba(240,236,227,0.08)", overflow:"hidden" }}>
              <div style={{ height:"100%", width:pct+"%", background:barColor, borderRadius:3, transition:"width 250ms ease" }} />
            </div>
            <span style={{ fontSize:14, fontWeight:900, color:barColor, flexShrink:0, fontFamily:"'Fira Code',monospace" }}>
              {label}{ok && !over ? " ✓" : over ? " ⚠" : ""}
            </span>
          </div>
        );
      })()}

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "20px 16px" }}>

      {/* Prüfungsart — nur bei Prüfung */}
      {typ === "Prüfung" && (
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "rgba(240,236,227,0.7)", display: "block", marginBottom: "8px" }}>Art der Prüfung</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {PRUEFUNGSARTEN.map(pa => (
              <button key={pa.id} onClick={() => { setPruefungsart(pa.id); setMaxPunkte(pa.defaultP); }}
                style={{ padding: "10px 14px", border: "2px solid", borderRadius: "10px", cursor: "pointer", textAlign: "left",
                  borderColor: pruefungsart === pa.id ? "#e8600a" : "rgba(240,236,227,0.15)",
                  background: pruefungsart === pa.id ? "linear-gradient(135deg,rgba(20,16,8,0.9),rgba(40,28,12,0.95))" : "rgba(30,22,10,0.6)",
                  boxShadow: pruefungsart === pa.id ? "0 4px 24px rgba(232,96,10,0.35)" : "none",
                  color: "#f0ece3" }}>
                {React.createElement(pa.icon, { size: 18, style: { marginRight: "8px", verticalAlign: "middle" } })}
                <span style={{ fontWeight: 700, fontSize: "14px" }}>{pa.id}</span>
                <div style={{ fontSize: "11px", marginTop: "3px", color: pruefungsart === pa.id ? "rgba(240,236,227,0.6)" : "rgba(240,236,227,0.4)" }}>{pa.info}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {typ && (<>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px", alignItems: "start", marginBottom: "20px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "rgba(240,236,227,0.7)", display: "block", marginBottom: "6px" }}>Datum</label>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={{ ...S.input, width: "170px" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "rgba(240,236,227,0.7)", display: "block", marginBottom: "8px" }}>Jahrgangsstufe</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[7, 8, 9, 10].map(k => (
                <button key={k} onClick={() => onKlasseChange(k)} style={{ padding: "10px 18px", border: "2px solid", borderRadius: "10px", cursor: "pointer",
                  borderColor: klasse === k ? "#e8600a" : "rgba(240,236,227,0.15)", background: klasse === k ? "linear-gradient(135deg,rgba(20,16,8,0.9),rgba(40,28,12,0.95))" : "rgba(30,22,10,0.6)",
                  boxShadow: klasse === k ? "0 4px 24px rgba(232,96,10,0.35)" : "none",
                  color: "#f0ece3", fontWeight: 700, fontSize: "17px" }}>{k}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Ziel festlegen ── */}
        {klasse && (
          <div style={{ marginBottom:"16px", background:"rgba(240,236,227,0.04)", border:"1.5px solid rgba(240,236,227,0.1)", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(240,236,227,0.4)", marginBottom:10 }}>
              {typ === "Prüfung" ? "Punkteziel" : "Aufgaben-Ziel"}
            </div>
            {typ === "Prüfung" ? (
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                {[10,12,20,25,30,40,50].map(p => (
                  <button key={p} onClick={() => setMaxPunkte(p)} style={{ padding:"5px 13px", borderRadius:7, border:"1.5px solid", borderColor: maxPunkte===p ? "#e8600a" : "rgba(240,236,227,0.15)", background: maxPunkte===p ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: maxPunkte===p ? "#e8600a" : "rgba(240,236,227,0.5)", fontWeight:700, fontSize:12, cursor:"pointer" }}>{p}</button>
                ))}
                <input type="number" min="5" max="100" value={maxPunkte} onChange={e => setMaxPunkte(Number(e.target.value))}
                  style={{ width:58, padding:"4px 7px", border:"1.5px solid rgba(240,236,227,0.18)", borderRadius:7, fontSize:12, fontWeight:700, textAlign:"center", background:"rgba(240,236,227,0.06)", color:"#f0ece3" }} />
                <span style={{ fontSize:12, color:"rgba(240,236,227,0.5)" }}>Punkte</span>
              </div>
            ) : (
              <>
                {/* Toggle: Aufgaben / Punkte */}
                <div style={{ display:"flex", gap:5, marginBottom:10 }}>
                  {[["anzahl","Aufgaben-Anzahl"],["punkte","Punkteziel"]].map(([m, l]) => (
                    <button key={m} onClick={() => setZielModus(m)} style={{ padding:"4px 14px", borderRadius:20, border:"1.5px solid", borderColor: zielModus===m ? "#e8600a" : "rgba(240,236,227,0.15)", background: zielModus===m ? "rgba(232,96,10,0.12)" : "transparent", color: zielModus===m ? "#e8600a" : "rgba(240,236,227,0.4)", fontWeight:700, fontSize:11, cursor:"pointer" }}>{l}</button>
                  ))}
                </div>
                {zielModus === "anzahl" ? (
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    {[3,5,7,10,15].map(n => (
                      <button key={n} onClick={() => setZielAnzahl(n)} style={{ padding:"5px 13px", borderRadius:7, border:"1.5px solid", borderColor: zielAnzahl===n ? "#e8600a" : "rgba(240,236,227,0.15)", background: zielAnzahl===n ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: zielAnzahl===n ? "#e8600a" : "rgba(240,236,227,0.5)", fontWeight:700, fontSize:12, cursor:"pointer" }}>{n}</button>
                    ))}
                    <input type="number" min="1" max="30" value={zielAnzahl} onChange={e => setZielAnzahl(Number(e.target.value))}
                      style={{ width:58, padding:"4px 7px", border:"1.5px solid rgba(240,236,227,0.18)", borderRadius:7, fontSize:12, fontWeight:700, textAlign:"center", background:"rgba(240,236,227,0.06)", color:"#f0ece3" }} />
                    <span style={{ fontSize:12, color:"rgba(240,236,227,0.5)" }}>Aufgaben</span>
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    {[10,15,20,25,30].map(p => (
                      <button key={p} onClick={() => setMaxPunkte(p)} style={{ padding:"5px 13px", borderRadius:7, border:"1.5px solid", borderColor: maxPunkte===p ? "#e8600a" : "rgba(240,236,227,0.15)", background: maxPunkte===p ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: maxPunkte===p ? "#e8600a" : "rgba(240,236,227,0.5)", fontWeight:700, fontSize:12, cursor:"pointer" }}>{p}</button>
                    ))}
                    <input type="number" min="1" max="100" value={maxPunkte} onChange={e => setMaxPunkte(Number(e.target.value))}
                      style={{ width:58, padding:"4px 7px", border:"1.5px solid rgba(240,236,227,0.18)", borderRadius:7, fontSize:12, fontWeight:700, textAlign:"center", background:"rgba(240,236,227,0.06)", color:"#f0ece3" }} />
                    <span style={{ fontSize:12, color:"rgba(240,236,227,0.5)" }}>Punkte</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {klasse && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "rgba(240,236,227,0.7)" }}>Lernbereiche & Themen <span style={{ fontWeight: 400, color: "rgba(240,236,227,0.4)" }}>— Mehrfachauswahl</span></label>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {vorklassen.length > 0 && (
                  <button onClick={() => setWiederholungAn(w => !w)}
                    style={{ fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:20, border:"1.5px solid", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:6,
                      borderColor: wiederholungAn ? "#e8600a" : "rgba(240,236,227,0.2)",
                      background: wiederholungAn ? "rgba(232,96,10,0.15)" : "rgba(240,236,227,0.06)",
                      color: wiederholungAn ? "#e8600a" : "rgba(240,236,227,0.55)",
                      fontFamily:"'IBM Plex Sans',sans-serif" }}>
                    <RefreshCw size={13} strokeWidth={2}/>
                    Wiederholung {wiederholungAn ? "ein" : "aus"}
                  </button>
                )}
              </div>
            </div>
            {/* ── Fortschritts-Balken ── */}
            {totalAnzahl > 0 && (
              <div style={{ marginBottom:12 }}>
                {typ === "Prüfung" ? (
                  <>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                      <span style={{ color:"rgba(240,236,227,0.5)", fontWeight:600 }}>Punkte-Fortschritt</span>
                      <span style={{ fontWeight:800, color: estPunkte > maxPunkte ? "#f87171" : estPunkte >= maxPunkte * 0.85 ? "#4ade80" : "#e8600a" }}>
                        {estPunkte} / {maxPunkte} P{estPunkte > maxPunkte ? " — ⚠ Überschreitung" : estPunkte >= maxPunkte ? " ✓" : ""}
                      </span>
                    </div>
                    <div style={{ height:5, borderRadius:3, background:"rgba(240,236,227,0.08)" }}>
                      <div style={{ height:"100%", width:Math.min(100, (estPunkte/maxPunkte)*100) + "%", background: estPunkte > maxPunkte ? "#f87171" : "#e8600a", borderRadius:3, transition:"width 200ms ease" }} />
                    </div>
                  </>
                ) : zielModus === "punkte" ? (
                  <>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                      <span style={{ color:"rgba(240,236,227,0.5)", fontWeight:600 }}>Punkte-Fortschritt</span>
                      <span style={{ fontWeight:800, color: estPunkte > maxPunkte ? "#f87171" : estPunkte >= maxPunkte * 0.85 ? "#4ade80" : "#e8600a" }}>
                        {estPunkte} / {maxPunkte} P{estPunkte >= maxPunkte ? " ✓" : ""}
                      </span>
                    </div>
                    <div style={{ height:5, borderRadius:3, background:"rgba(240,236,227,0.08)" }}>
                      <div style={{ height:"100%", width:Math.min(100, (estPunkte/maxPunkte)*100) + "%", background: estPunkte > maxPunkte ? "#f87171" : "#e8600a", borderRadius:3, transition:"width 200ms ease" }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                      <span style={{ color:"rgba(240,236,227,0.5)", fontWeight:600 }}>Aufgaben-Fortschritt</span>
                      <span style={{ fontWeight:800, color: totalAnzahl > zielAnzahl ? "#f87171" : totalAnzahl >= zielAnzahl ? "#4ade80" : "#e8600a" }}>
                        {totalAnzahl} / {zielAnzahl} Aufgaben{totalAnzahl >= zielAnzahl ? " ✓" : ""}
                      </span>
                    </div>
                    <div style={{ height:5, borderRadius:3, background:"rgba(240,236,227,0.08)" }}>
                      <div style={{ height:"100%", width:Math.min(100, (totalAnzahl/zielAnzahl)*100) + "%", background: totalAnzahl > zielAnzahl ? "#f87171" : "#e8600a", borderRadius:3, transition:"width 200ms ease" }} />
                    </div>
                  </>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {/* Themen der aktuellen Klasse */}
              {lernbereiche.map(lb => {
                const meta = LB_INFO[lb] || { icon: "📌", farbe: "#475569" };
                const tasks = AUFGABEN_POOL[klasse][lb];
                const selSet = selectedThemen[lb] || {};
                const isActive = Object.values(selSet).some(c => c > 0);
                const isExpanded = expandedLBs[lb];
                const selCount = Object.values(selSet).filter(c => c > 0).length;
                return (
                  <div key={lb} style={{ border: `2px solid ${isActive ? meta.farbe : "rgba(240,236,227,0.13)"}`, borderRadius: "16px", overflow: "hidden", background: isActive ? meta.farbe + "18" : "rgba(30,22,10,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", cursor: "pointer" }} onClick={() => toggleLB(lb)}>
                      <div style={{ width: "18px", height: "18px", borderRadius: "5px", border: `2px solid ${isActive ? meta.farbe : "rgba(240,236,227,0.3)"}`, background: isActive ? meta.farbe : "rgba(240,236,227,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isActive && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                      </div>
                      <span style={{ color: isActive ? meta.farbe : "rgba(240,236,227,0.55)", display:"flex", alignItems:"center" }}><IconFor name={meta.icon} size={15} /></span>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: isActive ? meta.farbe : "#f0ece3", flex: 1 }}>{lb}</span>
                      {isActive && <span style={{ fontSize: "11px", color: meta.farbe, fontWeight: 700, background: meta.farbe + "18", padding: "1px 8px", borderRadius: "12px" }}>{selCount}/{tasks.length}</span>}
                      <button onClick={e => { e.stopPropagation(); setExpandedLBs(p => ({ ...p, [lb]: !p[lb] })); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "2px 6px" }}>{isExpanded ? "▲" : "▼"}</button>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${meta.farbe}33`, padding: "10px 14px", background: "rgba(240,236,227,0.03)" }}>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                          <button onClick={() => setSelectedThemen(p => { const m = {}; tasks.forEach(t => { m[t.id] = 1; }); return { ...p, [lb]: m }; })} style={{ fontSize: "11px", fontWeight: 700, color: meta.farbe, background: meta.farbe + "18", border: `1px solid ${meta.farbe}44`, borderRadius: "5px", padding: "2px 8px", cursor: "pointer" }}>✓ Alle</button>
                          <button onClick={() => setSelectedThemen(p => ({ ...p, [lb]: {} }))} style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", border: "1px solid rgba(240,236,227,0.12)", borderRadius: "5px", padding: "2px 8px", cursor: "pointer" }}>✗ Keine</button>
                        </div>

                        {/* ── Werkstoff-Auswahl direkt in LB 2 ── */}
                        {lb.includes("Werkstoffe") && (
                          <div style={{ background: "rgba(232,96,10,0.1)", border: "1.5px solid rgba(232,96,10,0.3)", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#f0c090", marginBottom: "7px", display:"flex", alignItems:"center", gap:4 }}><Package size={12} strokeWidth={1.5}/>Werkstoff-Typ</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {WERKSTOFF_TYPEN.map(wt => (
                                <button key={wt.id} onClick={() => setWerkstoffId(wt.id)}
                                  style={{ padding: "4px 11px", borderRadius: "16px", border: "1.5px solid " + (werkstoffId === wt.id ? "#d97706" : "rgba(240,236,227,0.12)"),
                                    background: werkstoffId === wt.id ? "rgba(232,96,10,0.2)" : "rgba(240,236,227,0.06)",
                                    color: werkstoffId === wt.id ? "#f0c090" : "rgba(240,236,227,0.7)",
                                    fontWeight: werkstoffId === wt.id ? 700 : 400, cursor: "pointer", fontSize: "12px" }}>
                                  <IconFor name={wt.icon} size={12} style={{ verticalAlign:"middle", marginRight:4 }} />{wt.label}
                                  <span style={{ fontSize: "10px", marginLeft: "5px", color: "rgba(240,236,227,0.4)" }}>(<KürzelSpan nr={wt.aw.nr} style={{ fontSize: "10px", color: "rgba(240,236,227,0.4)" }} />)</span>
                                </button>
                              ))}
                            </div>
                            <div style={{ fontSize: "10px", color: "rgba(240,236,227,0.5)", marginTop: "6px" }}>
                              Einkauf → <strong>{WERKSTOFF_TYPEN.find(w=>w.id===werkstoffId)?.aw.nr} <KürzelSpan nr={WERKSTOFF_TYPEN.find(w=>w.id===werkstoffId)?.aw.nr} style={{ fontWeight:700, fontSize:"10px", color:"rgba(240,236,227,0.6)" }} /></strong> &nbsp;|&nbsp;
                              Nachlass/Skonto → <strong>{WERKSTOFF_TYPEN.find(w=>w.id===werkstoffId)?.nl.nr} <KürzelSpan nr={WERKSTOFF_TYPEN.find(w=>w.id===werkstoffId)?.nl.nr} style={{ fontWeight:700, fontSize:"10px", color:"rgba(240,236,227,0.6)" }} /></strong>
                            </div>
                          </div>
                        )}
                        {tasks.map(task => {
                          const count = selSet[task.id] || 0;
                          const checked = count > 0;
                          const isKomplexEK = task.id === "8_komplex_einkauf_kette";
                          const isKomplexVK = task.id === "8_komplex_verkauf_kette";
                          const isKomplexFO  = task.id === "9_komplex_forderungskette";
                          const isKomplexABS = task.id === "10_komplex_abschlusskette";
                          const isPct = task.id.startsWith("7_pct_");
                          const showConfig = (isKomplexEK || isKomplexVK || isKomplexFO || isKomplexABS || isPct) && checked;
                          const hasAnteil = isKomplexVK
                            ? (verkaufOpts.ruecksendung || verkaufOpts.nachlass)
                            : (komplexOpts.ruecksendung || komplexOpts.nachlass);
                          return (
                            <div key={task.id} style={{ marginBottom: "2px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 6px", borderRadius: "6px", background: checked ? meta.farbe + "10" : "transparent", border: `1px solid ${checked ? meta.farbe + "44" : "transparent"}` }}>
                                <div onClick={() => toggleThema(lb, task.id)} style={{ width: "14px", height: "14px", borderRadius: "3px", border: `2px solid ${checked ? meta.farbe : "#cbd5e1"}`, background: checked ? meta.farbe : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                                  {checked && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
                                </div>
                                <span onClick={() => toggleThema(lb, task.id)} style={{ fontSize: "13px", color: checked ? "#f0ece3" : "rgba(240,236,227,0.5)", fontWeight: checked ? 600 : 400, flex: 1, cursor: "pointer" }}>{task.titel}</span>
                                {task.taskTyp === "rechnung" && <span style={{ fontSize: "10px", color: "rgba(240,236,227,0.7)", background: "rgba(240,236,227,0.1)", padding: "1px 5px", borderRadius: "8px", fontWeight: 700 }}>Rechnung</span>}
                                {task.taskTyp === "komplex" && <span style={{ fontSize: "10px", color: "#e8600a", background: "rgba(232,96,10,0.12)", border: "1px solid rgba(232,96,10,0.3)", padding: "1px 5px", borderRadius: "8px", fontWeight: 700 }}>Kette</span>}
                                {checked && (
                                  <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
                                    <button onClick={() => adjustCount(lb, task.id, -1)} style={{ width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${meta.farbe}66`, background: "rgba(240,236,227,0.08)", color: meta.farbe, fontWeight: 900, fontSize: 14, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                                    <span style={{ fontSize: 12, fontWeight: 800, minWidth: 18, textAlign: "center", color: "#f0ece3", fontFamily: "'Fira Code',monospace" }}>{count}×</span>
                                    <button onClick={() => adjustCount(lb, task.id, +1)} style={{ width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${meta.farbe}66`, background: "rgba(240,236,227,0.08)", color: meta.farbe, fontWeight: 900, fontSize: 14, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                                  </div>
                                )}
                              </div>

                              {/* ── Inline-Konfiguratoren ── */}
                              {showConfig && isKomplexEK && (
                                <div style={{ margin: "4px 0 6px 22px", background: "rgba(232,96,10,0.06)", border: "1.5px solid rgba(232,96,10,0.25)", borderRadius: "10px", padding: "12px 14px" }}>
                                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#e8600a", marginBottom: "10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Einkauf-Kette konfigurieren</div>

                                  {/* Schrittfolge-Vorschau */}
                                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px", marginBottom: "10px", fontSize: "11px" }}>
                                    {(komplexOpts.kalkulation || komplexOpts.angebotsvergleich) && <>
                                      <span style={{ background: "#141008", color: "#e8600a", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>
                                        {komplexOpts.angebotsvergleich ? <><BarChart2 size={11} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Angebotsvergleich</> : <><BarChart2 size={11} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Kalkulation</>}
                                      </span>
                                      <span style={S.muted}>→</span>
                                    </>}
                                    <span style={{ ...S.badgeDark, display:"inline-flex", alignItems:"center", gap:3 }}><Download size={11} strokeWidth={1.5}/>Einkauf</span>
                                    {komplexOpts.ruecksendung && <><span style={S.muted}>→</span><span style={{ ...S.badgeWarn, display:"inline-flex", alignItems:"center", gap:3 }}><RefreshCw size={10} strokeWidth={1.5}/>Rücksendung</span></>}
                                    {komplexOpts.nachlass && <><span style={S.muted}>→</span><span style={{ ...S.badgeWarn, display:"inline-flex", alignItems:"center", gap:3 }}><Tag size={10} strokeWidth={1.5}/>Nachlass</span></>}
                                    <span style={S.muted}>→</span>
                                    <span style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "2px 7px", fontWeight: 700, display:"inline-flex", alignItems:"center", gap:3 }}><Building2 size={11} strokeWidth={1.5}/>{komplexOpts.skonto ? "Zahlung+Skonto" : "Zahlung"}</span>
                                  </div>

                                  {/* Schritt 1: Kalkulation + Sofortrabatt */}
                                  <div style={S.mb8}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Schritt 1 – Kalkulation</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                      {[["none","Keine"],["kalkulation","Einfache Kalkulation"],["angebotsvergleich","Angebotsvergleich (2 Angebote)"]].map(([v, l]) => {
                                        const active = v === "none" ? !komplexOpts.kalkulation && !komplexOpts.angebotsvergleich : !!komplexOpts[v];
                                        return (
                                          <button key={v} onClick={() => setKomplexOpts(o => ({ ...o, kalkulation: v === "kalkulation", angebotsvergleich: v === "angebotsvergleich" }))}
                                            style={{ padding: "4px 10px", borderRadius: "14px", cursor: "pointer", fontSize: "11px", fontWeight: active ? 700 : 400,
                                              border: "1.5px solid " + (active ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                              background: active ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: active ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                            {l}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {(komplexOpts.kalkulation || komplexOpts.angebotsvergleich) && (
                                      <div style={{ marginTop: "8px", background: "rgba(232,96,10,0.06)", border: "1.5px solid rgba(232,96,10,0.2)", borderRadius: "8px", padding: "8px 10px" }}>
                                        <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "6px" }}>
                                          💡 Sofortrabatt (auf Rechnung ausgewiesen, kein eigenes Konto – wird direkt vom LEP abgezogen)
                                        </div>
                                        {/* Rabattart */}
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginBottom: "6px" }}>
                                          {["Sofortrabatt","Mengenrabatt","Treuerabatt","Wiederverkäuferrabatt","Sonderrabatt","Jubiläumsrabatt"].map(rt => {
                                            const active = (komplexOpts.rabattTyp || "Sofortrabatt") === rt;
                                            return (
                                              <button key={rt} onClick={() => setKomplexOpts(o => ({ ...o, rabattTyp: rt }))}
                                                style={{ padding: "2px 8px", borderRadius: "12px", cursor: "pointer", fontSize: "10px", fontWeight: active ? 700 : 400,
                                                  border: "1.5px solid " + (active ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                                  background: active ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: active ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                                {rt}
                                              </button>
                                            );
                                          })}
                                        </div>
                                        {/* Rabatthöhe: % oder € */}
                                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                                          <div style={{ fontSize: "10px", color: "rgba(240,236,227,0.6)", fontWeight: 600 }}>Höhe:</div>
                                          {[["pct","in %"],["euro","in €"]].map(([v, l]) => (
                                            <button key={v} onClick={() => setKomplexOpts(o => ({ ...o, rabattArt: v }))}
                                              style={{ padding: "2px 8px", borderRadius: "10px", cursor: "pointer", fontSize: "10px", fontWeight: (komplexOpts.rabattArt||"pct") === v ? 700 : 400,
                                                border: "1.5px solid " + ((komplexOpts.rabattArt||"pct") === v ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                                background: (komplexOpts.rabattArt||"pct") === v ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: (komplexOpts.rabattArt||"pct") === v ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                              {l}
                                            </button>
                                          ))}
                                          {(komplexOpts.rabattArt || "pct") === "pct" ? (
                                            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px" }}>
                                              <input type="number" min="1" max="40" step="0.5"
                                                value={komplexOpts.rabattPct || ""}
                                                placeholder="zuf."
                                                onChange={e => setKomplexOpts(o => ({ ...o, rabattPct: e.target.value ? parseFloat(e.target.value) : null }))}
                                                style={{ width: "52px", padding: "2px 5px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "5px", fontSize: "11px", fontWeight: 700, textAlign: "right", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                              <span style={{ color: "rgba(240,236,227,0.45)" }}>%</span>
                                            </label>
                                          ) : (
                                            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px" }}>
                                              <input type="number" min="1" step="0.01"
                                                value={komplexOpts.rabattEuro || ""}
                                                placeholder="Betrag"
                                                onChange={e => setKomplexOpts(o => ({ ...o, rabattEuro: e.target.value ? parseFloat(e.target.value) : null }))}
                                                style={{ width: "80px", padding: "2px 5px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "5px", fontSize: "11px", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                              <span style={{ color: "rgba(240,236,227,0.45)" }}>€ (netto)</span>
                                            </label>
                                          )}
                                          <span style={{ fontSize: "10px", color: "rgba(240,236,227,0.35)" }}>Leer = zufällig</span>
                                        </div>
                                        <div style={{ fontSize: "10px", color: "rgba(240,236,227,0.55)", marginTop: "6px", display:"flex", alignItems:"center", gap:3 }}><AlertTriangle size={10} strokeWidth={1.5}/>Buchungsbasis = <strong>Zieleinkaufspreis</strong> (nach Sofortrabatt, vor Skonto)</div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Zwischenschritte */}
                                  <div style={S.mb8}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Zwischenschritte (optional)</div>
                                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                      {[["ruecksendung","Rücksendung"],["nachlass","Nachlass"]].map(([k, l]) => (
                                        <label key={k} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: komplexOpts[k] ? 700 : 400,
                                          padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (komplexOpts[k] ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                          background: komplexOpts[k] ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: komplexOpts[k] ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                          <input type="checkbox" checked={!!komplexOpts[k]} onChange={e => setKomplexOpts(o => ({ ...o, [k]: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                          {l}
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Anteilsangabe */}
                                  {hasAnteil && (
                                    <div style={S.mb8}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Anteilsangabe</div>

                                      {/* Einheit wählen */}
                                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                                        {[["pct","in %"],["euro","in €"]].map(([v, l]) => (
                                          <button key={v} onClick={() => setKomplexOpts(o => ({ ...o, anteilArt: v }))}
                                            style={{ padding: "3px 9px", borderRadius: "12px", cursor: "pointer", fontSize: "11px", fontWeight: komplexOpts.anteilArt === v ? 700 : 400,
                                              border: "1.5px solid " + (komplexOpts.anteilArt === v ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                              background: komplexOpts.anteilArt === v ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: komplexOpts.anteilArt === v ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                            {l}
                                          </button>
                                        ))}
                                      </div>

                                      {/* Betragseingabe bei % */}
                                      {komplexOpts.anteilArt === "pct" && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                          {komplexOpts.ruecksendung && (
                                            <label style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", display: "flex", alignItems: "center", gap: "5px" }}>
                                              Rücksendung
                                              <input type="number" min="1" max="99" value={komplexOpts.rueckPct}
                                                onChange={e => setKomplexOpts(o => ({ ...o, rueckPct: Math.min(99, Math.max(1, parseInt(e.target.value)||20)) }))}
                                                style={{ width: "52px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                              <span style={S.hint}>%</span>
                                            </label>
                                          )}
                                          {komplexOpts.nachlass && (
                                            <label style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", display: "flex", alignItems: "center", gap: "5px" }}>
                                              💸 Nachlass
                                              <input type="number" min="1" max="50" value={komplexOpts.nlPct}
                                                onChange={e => setKomplexOpts(o => ({ ...o, nlPct: Math.min(50, Math.max(1, parseInt(e.target.value)||5)) }))}
                                                style={{ width: "52px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                              <span style={S.hint}>%</span>
                                            </label>
                                          )}
                                        </div>
                                      )}

                                      {/* Betragseingabe bei € */}
                                      {komplexOpts.anteilArt === "euro" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                          {komplexOpts.ruecksendung && (
                                            <label style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", display: "flex", alignItems: "center", gap: "5px" }}>
                                              Rücksendung
                                              <input type="number" min="0" step="0.01" value={komplexOpts.rueckEuro}
                                                placeholder="Betrag"
                                                onChange={e => setKomplexOpts(o => ({ ...o, rueckEuro: e.target.value }))}
                                                style={{ width: "90px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                              <span style={S.hint}>€</span>
                                            </label>
                                          )}
                                          {komplexOpts.nachlass && (
                                            <label style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", display: "flex", alignItems: "center", gap: "5px" }}>
                                              💸 Nachlass
                                              <input type="number" min="0" step="0.01" value={komplexOpts.nlEuro}
                                                placeholder="Betrag"
                                                onChange={e => setKomplexOpts(o => ({ ...o, nlEuro: e.target.value }))}
                                                style={{ width: "90px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                              <span style={S.hint}>€</span>
                                            </label>
                                          )}
                                          {/* Brutto/Netto Toggle */}
                                          <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                                            {[["netto","Netto (ohne USt)"],["brutto","Brutto (inkl. USt)"]].map(([v, l]) => {
                                              const isBrutto = v === "brutto";
                                              const active = komplexOpts.euroIsBrutto === isBrutto;
                                              return (
                                                <button key={v} onClick={() => setKomplexOpts(o => ({ ...o, euroIsBrutto: isBrutto }))}
                                                  style={{ padding: "3px 9px", borderRadius: "10px", cursor: "pointer", fontSize: "11px", fontWeight: active ? 700 : 400,
                                                    border: "1.5px solid " + (active ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                                    background: active ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: active ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                                  {l}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Zahlung */}
                                  <div>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Zahlung</div>
                                    <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: komplexOpts.skonto ? 700 : 400,
                                      padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (komplexOpts.skonto ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                      background: komplexOpts.skonto ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: komplexOpts.skonto ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                      <input type="checkbox" checked={!!komplexOpts.skonto} onChange={e => setKomplexOpts(o => ({ ...o, skonto: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                      Mit Skonto
                                    </label>
                                  </div>
                                </div>
                              )}

                              {/* ── Inline-Konfigurator Verkauf-Kette ── */}
                              {showConfig && isKomplexVK && (() => {
                                const vHasAnteil = verkaufOpts.ruecksendung || verkaufOpts.nachlass;
                                return (
                                  <div style={{ margin: "4px 0 6px 22px", background: "rgba(232,96,10,0.06)", border: "1.5px solid rgba(232,96,10,0.25)", borderRadius: "10px", padding: "12px 14px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#e8600a", marginBottom: "10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Verkauf-Kette konfigurieren</div>

                                    {/* Schrittfolge-Vorschau */}
                                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px", marginBottom: "10px", fontSize: "11px" }}>
                                      {verkaufOpts.vorkalkulation && <>
                                        <span style={{ background: "rgba(232,96,10,0.18)", color: "#f0c090", borderRadius: "6px", padding: "2px 7px", fontWeight: 700, display:"inline-flex", alignItems:"center", gap:3 }}><BarChart2 size={11} strokeWidth={1.5}/>Vorkalkulation</span>
                                        <span style={S.muted}>→</span>
                                      </>}
                                      <span style={{ ...S.badgeDark, display:"inline-flex", alignItems:"center", gap:3 }}><Upload size={11} strokeWidth={1.5}/>Verkauf</span>
                                      {verkaufOpts.ruecksendung && <><span style={S.muted}>→</span><span style={{ ...S.badgeWarn, display:"inline-flex", alignItems:"center", gap:3 }}><RefreshCw size={10} strokeWidth={1.5}/>Rücksendung</span></>}
                                      {verkaufOpts.nachlass && <><span style={S.muted}>→</span><span style={{ ...S.badgeWarn, display:"inline-flex", alignItems:"center", gap:3 }}><Tag size={10} strokeWidth={1.5}/>Nachlass</span></>}
                                      <span style={S.muted}>→</span>
                                      <span style={{ background: "rgba(240,236,227,0.1)", color: "rgba(240,236,227,0.7)", border: "1px solid rgba(240,236,227,0.2)", borderRadius: "6px", padding: "2px 7px", fontWeight: 700, display:"inline-flex", alignItems:"center", gap:3 }}><Building2 size={11} strokeWidth={1.5}/>{verkaufOpts.skonto ? "Zahlungseingang + Skonto" : "Zahlungseingang"}</span>
                                    </div>

                                    {/* Schritt 0: Vorkalkulation */}
                                    <div style={S.mb8}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Vorschritt – Kalkulation</div>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: verkaufOpts.vorkalkulation ? 700 : 400,
                                        padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (verkaufOpts.vorkalkulation ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                        background: verkaufOpts.vorkalkulation ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: verkaufOpts.vorkalkulation ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                        <input type="checkbox" checked={!!verkaufOpts.vorkalkulation} onChange={e => setVerkaufOpts(o => ({ ...o, vorkalkulation: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                        📊 Verkaufskalkulation (EKP → Aufschlag → VKP)
                                      </label>
                                      {verkaufOpts.vorkalkulation && (
                                        <div style={{ fontSize: "10px", color: "rgba(240,236,227,0.55)", marginTop: "4px", display:"flex", alignItems:"center", gap:3 }}><AlertTriangle size={10} strokeWidth={1.5}/>Buchungsbasis = <strong>Zielverkaufspreis (ZVP)</strong></div>
                                      )}
                                    </div>

                                    {/* Zwischenschritte */}
                                    <div style={S.mb8}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Zwischenschritte (optional)</div>
                                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                        {[["ruecksendung","Rücksendung"],["nachlass","Nachlass"]].map(([k, l]) => (
                                          <label key={k} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: verkaufOpts[k] ? 700 : 400,
                                            padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (verkaufOpts[k] ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                            background: verkaufOpts[k] ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: verkaufOpts[k] ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                            <input type="checkbox" checked={!!verkaufOpts[k]} onChange={e => setVerkaufOpts(o => ({ ...o, [k]: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                            {l}
                                          </label>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Anteilsangabe */}
                                    {vHasAnteil && (
                                      <div style={S.mb8}>
                                        <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Anteilsangabe</div>
                                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                                          {[["pct","in %"],["euro","in €"]].map(([v, l]) => (
                                            <button key={v} onClick={() => setVerkaufOpts(o => ({ ...o, anteilArt: v }))}
                                              style={{ padding: "3px 9px", borderRadius: "12px", cursor: "pointer", fontSize: "11px", fontWeight: verkaufOpts.anteilArt === v ? 700 : 400,
                                                border: "1.5px solid " + (verkaufOpts.anteilArt === v ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                                background: verkaufOpts.anteilArt === v ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: verkaufOpts.anteilArt === v ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                              {l}
                                            </button>
                                          ))}
                                        </div>
                                        {verkaufOpts.anteilArt === "pct" && (
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                            {verkaufOpts.ruecksendung && (
                                              <label style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", display: "flex", alignItems: "center", gap: "5px" }}>
                                                Rücksendung
                                                <input type="number" min="1" max="99" value={verkaufOpts.rueckPct}
                                                  onChange={e => setVerkaufOpts(o => ({ ...o, rueckPct: Math.min(99, Math.max(1, parseInt(e.target.value)||25)) }))}
                                                  style={{ width: "52px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                                <span style={S.hint}>%</span>
                                              </label>
                                            )}
                                            {verkaufOpts.nachlass && (
                                              <label style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", display: "flex", alignItems: "center", gap: "5px" }}>
                                                💸 Nachlass
                                                <input type="number" min="1" max="50" value={verkaufOpts.nlPct}
                                                  onChange={e => setVerkaufOpts(o => ({ ...o, nlPct: Math.min(50, Math.max(1, parseInt(e.target.value)||5)) }))}
                                                  style={{ width: "52px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                                <span style={S.hint}>%</span>
                                              </label>
                                            )}
                                          </div>
                                        )}
                                        {verkaufOpts.anteilArt === "euro" && (
                                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            {verkaufOpts.ruecksendung && (
                                              <label style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", display: "flex", alignItems: "center", gap: "5px" }}>
                                                Rücksendung
                                                <input type="number" min="0" step="0.01" value={verkaufOpts.rueckEuro} placeholder="Betrag"
                                                  onChange={e => setVerkaufOpts(o => ({ ...o, rueckEuro: e.target.value }))}
                                                  style={{ width: "90px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                                <span style={S.hint}>€</span>
                                              </label>
                                            )}
                                            {verkaufOpts.nachlass && (
                                              <label style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", display: "flex", alignItems: "center", gap: "5px" }}>
                                                💸 Nachlass
                                                <input type="number" min="0" step="0.01" value={verkaufOpts.nlEuro} placeholder="Betrag"
                                                  onChange={e => setVerkaufOpts(o => ({ ...o, nlEuro: e.target.value }))}
                                                  style={{ width: "90px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                                <span style={S.hint}>€</span>
                                              </label>
                                            )}
                                            <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                                              {[["netto","Netto (ohne USt)"],["brutto","Brutto (inkl. USt)"]].map(([v, l]) => {
                                                const isBrutto = v === "brutto";
                                                const active = verkaufOpts.euroIsBrutto === isBrutto;
                                                return (
                                                  <button key={v} onClick={() => setVerkaufOpts(o => ({ ...o, euroIsBrutto: isBrutto }))}
                                                    style={{ padding: "3px 9px", borderRadius: "10px", cursor: "pointer", fontSize: "11px", fontWeight: active ? 700 : 400,
                                                      border: "1.5px solid " + (active ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                                      background: active ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: active ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                                    {l}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Zahlung */}
                                    <div>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Zahlung</div>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: verkaufOpts.skonto ? 700 : 400,
                                        padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (verkaufOpts.skonto ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                        background: verkaufOpts.skonto ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: verkaufOpts.skonto ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                        <input type="checkbox" checked={!!verkaufOpts.skonto} onChange={e => setVerkaufOpts(o => ({ ...o, skonto: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                        Mit Skonto
                                      </label>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* ── Inline-Konfigurator Forderungskette ── */}
                              {showConfig && isKomplexFO && (() => {
                                const ausgangLabels = {
                                  totalausfall: "Totalausfall",
                                  teilausfall:  "Teilausfall",
                                  wiederzahlung: "Wiederzahlung",
                                };
                                return (
                                  <div style={{ margin: "4px 0 6px 22px", background: "rgba(232,96,10,0.06)", border: "1.5px solid rgba(232,96,10,0.25)", borderRadius: "10px", padding: "12px 14px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#e8600a", marginBottom: "10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Forderungskette konfigurieren</div>

                                    {/* Schrittfolge-Vorschau */}
                                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px", marginBottom: "10px", fontSize: "11px" }}>
                                      <span style={{ ...S.badgeDark, display:"inline-flex", alignItems:"center", gap:3 }}><Upload size={11} strokeWidth={1.5}/>Verkauf</span>
                                      <span style={S.muted}>→</span>
                                      <span style={{ ...S.badgeWarn, display:"inline-flex", alignItems:"center", gap:3 }}><AlertTriangle size={10} strokeWidth={1.5}/>Umbuchung ZWFO</span>
                                      {forderungOpts.ewb && <>
                                        <span style={S.muted}>→</span>
                                        <span style={{ background: "rgba(240,236,227,0.1)", color: "rgba(240,236,227,0.7)", borderRadius: "6px", padding: "2px 7px", fontWeight: 700, display:"inline-flex", alignItems:"center", gap:3 }}><TrendingDown size={10} strokeWidth={1.5}/>EWB {forderungOpts.ewbPct} %</span>
                                      </>}
                                      <span style={S.muted}>→</span>
                                      <span style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>
                                        {ausgangLabels[forderungOpts.ausgang]}
                                      </span>
                                    </div>

                                    {/* EWB */}
                                    <div style={S.mb8}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Jahresabschluss (optional)</div>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px",
                                        fontWeight: forderungOpts.ewb ? 700 : 400,
                                        padding: "4px 10px", borderRadius: "14px",
                                        border: "1.5px solid " + (forderungOpts.ewb ? "#e8600a" : "rgba(240,236,227,0.15)"),
                                        background: forderungOpts.ewb ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)",
                                        color: forderungOpts.ewb ? "#e8600a" : "rgba(240,236,227,0.5)" }}>
                                        <input type="checkbox" checked={!!forderungOpts.ewb} onChange={e => setForderungOpts(o => ({ ...o, ewb: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                        <TrendingDown size={12} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>EWB bilden am Jahresende
                                      </label>
                                      {forderungOpts.ewb && (
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "rgba(240,236,227,0.6)", marginLeft: "10px", marginTop: "6px" }}>
                                          Geschätzter Ausfall
                                          <input type="number" min="10" max="90" step="10" value={forderungOpts.ewbPct}
                                            onChange={e => setForderungOpts(o => ({ ...o, ewbPct: Math.min(90, Math.max(10, parseInt(e.target.value)||50)) }))}
                                            style={{ width: "52px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                          <span style={S.hint}>%</span>
                                        </label>
                                      )}
                                    </div>

                                    {/* Ausgang */}
                                    <div style={S.mb8}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Ausgang</div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                        {Object.entries(ausgangLabels).map(([v, l]) => (
                                          <button key={v} onClick={() => setForderungOpts(o => ({ ...o, ausgang: v }))}
                                            style={{ padding: "4px 10px", borderRadius: "14px", cursor: "pointer", fontSize: "11px",
                                              fontWeight: forderungOpts.ausgang === v ? 700 : 400,
                                              border: "1.5px solid " + (forderungOpts.ausgang === v ? "#f87171" : "rgba(240,236,227,0.12)"),
                                              background: forderungOpts.ausgang === v ? "rgba(239,68,68,0.15)" : "rgba(240,236,227,0.04)",
                                              color: forderungOpts.ausgang === v ? "#fca5a5" : "rgba(240,236,227,0.55)" }}>
                                            {l}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Quote bei Teilausfall */}
                                    {forderungOpts.ausgang === "teilausfall" && (
                                      <div>
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "rgba(240,236,227,0.6)" }}>
                                          Insolvenzquote
                                          <input type="number" min="10" max="80" step="10" value={forderungOpts.quotePct}
                                            onChange={e => setForderungOpts(o => ({ ...o, quotePct: Math.min(80, Math.max(10, parseInt(e.target.value)||30)) }))}
                                            style={{ width: "52px", padding: "3px 6px", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right", background: "rgba(240,236,227,0.06)", color: "#f0ece3" }} />
                                          <span style={S.hint}>%</span>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* ── Inline-Konfigurator Abschluss-Kette ── */}
                              {showConfig && isKomplexABS && (() => {
                                const schrittBadges = [
                                  { key: "ara",        label: "ARA",       color: "#f0ece3",              bg: "rgba(240,236,227,0.1)" },
                                  { key: "rst",        label: "RST",       color: "#f0c090",              bg: "rgba(232,96,10,0.18)" },
                                  { key: "afa",        label: "AfA",       color: "rgba(240,236,227,0.7)", bg: "rgba(240,236,227,0.1)" },
                                  { key: "ewb",        label: "EWB",       color: "#fca5a5",              bg: "rgba(239,68,68,0.15)" },
                                  { key: "guv",        label: "GuV",       color: "#4ade80",              bg: "rgba(74,222,128,0.12)" },
                                  { key: "kennzahlen", label: "Kennzahlen", color: "rgba(240,236,227,0.6)", bg: "rgba(240,236,227,0.08)" },
                                ];
                                return (
                                  <div style={{ margin: "4px 0 6px 22px", background: "rgba(28,20,10,0.8)", border: "1.5px solid rgba(240,236,227,0.12)", borderRadius: "10px", padding: "12px 14px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 800, color: "rgba(240,236,227,0.5)", marginBottom: "10px", letterSpacing: "0.04em", textTransform: "uppercase", display:"flex", alignItems:"center", gap:4 }}><Settings size={11} strokeWidth={1.5}/>Abschluss-Kette konfigurieren</div>

                                    {/* Schrittfolge-Vorschau */}
                                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px", marginBottom: "10px", fontSize: "11px" }}>
                                      {schrittBadges.filter(b => abschlussOpts[b.key]).map((b, i, arr) => (
                                        <React.Fragment key={b.key}>
                                          <span style={{ background: b.bg, color: b.color, borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>{b.label}</span>
                                          {i < arr.length - 1 && <span style={S.muted}>→</span>}
                                        </React.Fragment>
                                      ))}
                                      {!schrittBadges.some(b => abschlussOpts[b.key]) && <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Keine Schritte aktiv</span>}
                                    </div>

                                    {/* Toggle-Buttons */}
                                    <div style={S.mb8}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "5px" }}>Enthaltene Schritte</div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                        {schrittBadges.map(b => (
                                          <label key={b.key} style={{
                                            display: "inline-flex", alignItems: "center", gap: "5px",
                                            cursor: "pointer", fontSize: "11px",
                                            fontWeight: abschlussOpts[b.key] ? 700 : 400,
                                            padding: "4px 10px", borderRadius: "14px",
                                            border: "1.5px solid " + (abschlussOpts[b.key] ? b.color : "#e5e7eb"),
                                            background: abschlussOpts[b.key] ? b.bg : "#fff",
                                            color: abschlussOpts[b.key] ? b.color : "#64748b",
                                            userSelect: "none",
                                          }}>
                                            <input type="checkbox"
                                              checked={!!abschlussOpts[b.key]}
                                              onChange={e => setAbschlussOpts(o => ({ ...o, [b.key]: e.target.checked }))}
                                              style={{ width: "12px", height: "12px" }} />
                                            {b.label}
                                          </label>
                                        ))}
                                      </div>
                                    </div>

                                    {/* EWB-Prozentsatz */}
                                    {abschlussOpts.ewb && (
                                      <div>
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#374151" }}>
                                          Geschätzter Ausfall (EWB)
                                          <input type="number" min="10" max="90" step="10"
                                            value={abschlussOpts.ewbPct}
                                            onChange={e => setAbschlussOpts(o => ({ ...o, ewbPct: Math.min(90, Math.max(10, parseInt(e.target.value)||50)) }))}
                                            style={{ width: "52px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right" }} />
                                          <span style={S.hint}>%</span>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* ── Inline-Konfigurator Prozentrechnung ── */}
                              {showConfig && isPct && (
                                <div style={{ margin: "4px 0 6px 22px", background: "rgba(232,96,10,0.06)", border: "1.5px solid rgba(232,96,10,0.25)", borderRadius: "10px", padding: "12px 14px" }}>
                                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#e8600a", marginBottom: "10px", letterSpacing: "0.04em", textTransform: "uppercase", display:"flex", alignItems:"center", gap:5 }}><Settings size={11} strokeWidth={1.5}/>Prozentrechnung konfigurieren</div>

                                  {/* Schwierigkeit */}
                                  <div style={S.mb8}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Schwierigkeitsgrad</div>
                                    <div style={{ display: "flex", gap: "4px" }}>
                                      {[["einfach","Einfach","runde Zahlen, einfache %"],["gemischt","Gemischt","variiert"],["schwer","Schwer","unrunde Zahlen, krumme %"]].map(([v, l, desc]) => {
                                        const active = (pctOpts.schwierigkeit || "gemischt") === v;
                                        return (
                                          <button key={v} onClick={() => setPctOpts(o => ({ ...o, schwierigkeit: v }))}
                                            style={{ flex: 1, padding: "5px 6px", borderRadius: "8px", cursor: "pointer", fontSize: "10px", fontWeight: active ? 700 : 400, textAlign: "center",
                                              border: "1.5px solid " + (active ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                              background: active ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)", color: active ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                            <div>{l}</div>
                                            <div style={{ fontSize: "9px", color: active ? "rgba(240,236,227,0.5)" : "rgba(240,236,227,0.3)", marginTop: "2px" }}>{desc}</div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Skonto bei kombinierter Aufgabe */}
                                  {task.id === "7_pct_kombiniert" && (
                                    <div>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.6)", marginBottom: "4px" }}>Optionen</div>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px",
                                        fontWeight: pctOpts.mitSkonto !== false ? 700 : 400,
                                        padding: "4px 10px", borderRadius: "14px",
                                        border: "1.5px solid " + (pctOpts.mitSkonto !== false ? "#e8600a" : "rgba(240,236,227,0.12)"),
                                        background: pctOpts.mitSkonto !== false ? "rgba(232,96,10,0.12)" : "rgba(240,236,227,0.04)",
                                        color: pctOpts.mitSkonto !== false ? "#e8600a" : "rgba(240,236,227,0.55)" }}>
                                        <input type="checkbox" checked={pctOpts.mitSkonto !== false}
                                          onChange={e => setPctOpts(o => ({ ...o, mitSkonto: e.target.checked }))}
                                          style={{ width: "12px", height: "12px" }} />
                                        Mit Skonto (ZEP + BEP)
                                      </label>
                                    </div>
                                  )}
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Wiederholungs-Themen aus Vorklassen */}
              {wiederholungAn && vorklassen.length > 0 && (
                <div style={{ marginTop:8, borderTop:"2px dashed rgba(232,96,10,0.35)", paddingTop:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.5)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                    🔁 Wiederholungsstoff aus {vorklassen.map(k=>`Klasse ${k}`).join(" + ")}
                  </div>
                  {vorLernbereiche.map(({ lb, k }) => {
                    const meta = LB_INFO[lb] || { icon: "📌", farbe: "#e8600a" };
                    const tasks = AUFGABEN_POOL[k][lb];
                    const selSet = selectedThemen[lb] || {};
                    const isActive = Object.values(selSet).some(c => c > 0);
                    const vorSelCount = Object.values(selSet).filter(c => c > 0).length;
                    const isExpanded = expandedLBs[lb + "_vor"];
                    return (
                      <div key={`vor_${k}_${lb}`} style={{ border:`2px solid ${isActive ? "#e8600a" : "#fde68a"}`, borderRadius:12, overflow:"hidden", background: isActive ? "#fffbeb" : "#fffdf5", marginBottom:5 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", cursor:"pointer" }}
                          onClick={() => setExpandedLBs(p => ({ ...p, [lb+"_vor"]: !p[lb+"_vor"] }))}>
                          <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${isActive?"#e8600a":"#fbbf24"}`, background:isActive?"#e8600a":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            {isActive && <span style={{ color:"#fff", fontSize:10 }}>✓</span>}
                          </div>
                          <span style={{ color: isActive ? "#92400e" : "#b45309", display:"flex", alignItems:"center" }}><IconFor name={meta.icon} size={14} /></span>
                          <span style={{ fontWeight:700, fontSize:12, color:"#92400e", flex:1 }}>{lb}</span>
                          <span style={{ fontSize:10, fontWeight:800, background:"#fef3c7", color:"#92400e", padding:"1px 7px", borderRadius:10, border:"1px solid #fde68a" }}>Kl. {k}</span>
                          {isActive && <span style={{ fontSize:10, color:"#92400e", fontWeight:700 }}>{vorSelCount}/{tasks.length}</span>}
                          <span style={{ color:"#fbbf24", fontSize:12 }}>{isExpanded ? "▲" : "▼"}</span>
                        </div>
                        {isExpanded && (
                          <div style={{ borderTop:"1px solid #fde68a", padding:"8px 12px", background:"#fff" }}>
                            <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                              <button onClick={() => setSelectedThemen(p => { const m = {}; tasks.forEach(t => { m[t.id] = 1; }); return { ...p, [lb]: m }; })} style={{ fontSize:10, fontWeight:700, color:"#92400e", background:"#fef3c7", border:"1px solid #fde68a", borderRadius:5, padding:"2px 7px", cursor:"pointer" }}>✓ Alle</button>
                              <button onClick={() => setSelectedThemen(p => ({ ...p, [lb]: {} }))} style={{ fontSize:10, fontWeight:600, color:"#94a3b8", background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:5, padding:"2px 7px", cursor:"pointer" }}>✗ Keine</button>
                            </div>
                            {tasks.map(task => {
                              const cnt = selSet[task.id] || 0;
                              const checked = cnt > 0;
                              return (
                                <div key={task.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 4px", borderRadius:6 }}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleThema(lb, task.id)}
                                    style={{ width:15, height:15, accentColor:"#e8600a", cursor:"pointer" }} />
                                  <span onClick={() => toggleThema(lb, task.id)} style={{ fontSize:12, color:"#374151", flex:1, cursor:"pointer" }}>{task.titel}</span>
                                  <span style={{ fontSize:10, color:"#94a3b8" }}>{task.nrPunkte||2}P</span>
                                  {checked && (
                                    <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                                      <button onClick={() => adjustCount(lb, task.id, -1)} style={{ width:18, height:18, borderRadius:3, border:"1.5px solid #fbbf24", background:"#fffbeb", color:"#92400e", fontWeight:900, fontSize:13, lineHeight:1, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                                      <span style={{ fontSize:11, fontWeight:800, minWidth:16, textAlign:"center", color:"#92400e", fontFamily:"'Fira Code',monospace" }}>{cnt}×</span>
                                      <button onClick={() => adjustCount(lb, task.id, +1)} style={{ width:18, height:18, borderRadius:3, border:"1.5px solid #fbbf24", background:"#fffbeb", color:"#92400e", fontWeight:900, fontSize:13, lineHeight:1, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}



        <button onClick={() => {
          if (!canProceed) return;
          const themenMap = {};
          activeLBs.forEach(lb => {
            const counts = selectedThemen[lb] || {};
            themenMap[lb] = Object.entries(counts)
              .filter(([, c]) => c > 0)
              .flatMap(([id, c]) => Array(c).fill(id));
          });
          onWeiter({ typ, pruefungsart, klasse, datum, anzahl: totalAnzahl || 5, maxPunkte: typ === "Prüfung" ? maxPunkte : null, selectedThemen: themenMap, werkstoffId, komplexOpts: {...komplexOpts, werkstoffId}, verkaufOpts, forderungOpts, abschlussOpts, pctOpts });
        }} disabled={!canProceed} className="bw-btn bw-btn-primary" style={{ ...S.btnPrimary, width: "100%", padding: "16px", fontSize: "16px", borderRadius: "14px",
            opacity: canProceed ? 1 : 0.35, cursor: canProceed ? "pointer" : "not-allowed",
            background: canProceed ? "#0f172a" : "#94a3b8",
            boxShadow: canProceed ? "0 4px 16px rgba(15,23,42,0.35)" : "none" }}>
          Weiter: Unternehmen wählen →
        </button>
      </>)}
      </div>
    </div>
  );
}
