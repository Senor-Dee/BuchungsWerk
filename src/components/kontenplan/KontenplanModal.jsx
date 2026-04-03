// ══════════════════════════════════════════════════════════════════════════════
// KontenplanModal + KürzelSpan + renderMitTooltips
// Extrahiert aus BuchungsWerk.jsx – Phase C1 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef } from "react";
import { KONTEN, getKürzel, getVollname, _KUERZEL_SET, _KUERZEL_REGEX, _KUERZEL_TO_NR, KONTEN_KLASSEN, KONTEN_TYP_FARBEN } from "../../data/kontenplan.js";

function renderMitTooltips(text) {
  if (!text) return null;
  const parts = [];
  let last = 0;
  let m;
  _KUERZEL_REGEX.lastIndex = 0;
  while ((m = _KUERZEL_REGEX.exec(text)) !== null) {
    const kürzel = m[1];
    if (!_KUERZEL_SET.has(kürzel)) continue;
    const nr = _KUERZEL_TO_NR.get(kürzel);
    if (last < m.index) parts.push(text.slice(last, m.index));
    parts.push(<KürzelSpan key={m.index} nr={nr} style={{ fontWeight: "inherit", fontFamily: "inherit", fontSize: "inherit" }} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

// ══════════════════════════════════════════════════════════════════════════════
// KÜRZEL-SPAN – zeigt Kürzel mit Tooltip (Vollname) bei Hover und Touch
// iOS-optimiert: kein title-Attribut, eigenes Tooltip-Div mit position:fixed
// ══════════════════════════════════════════════════════════════════════════════
function KürzelSpan({ nr, style = {} }) {
  const [tip, setTip] = useState(null); // { x, y } oder null
  const hideTimer = useRef(null);
  const kürzel = getKürzel(nr);
  const vollname = getVollname(nr);
  if (!vollname) return <span style={style}>{kürzel}</span>;

  const show = (x, y) => {
    clearTimeout(hideTimer.current);
    setTip({ x, y });
  };
  const hide = (delay = 0) => {
    clearTimeout(hideTimer.current);
    hideTimer.current = delay > 0 ? setTimeout(() => setTip(null), delay) : (setTip(null), undefined);
  };

  return (
    <>
      <span
        style={{ ...style, cursor: "help", textDecoration: "underline dotted", textUnderlineOffset: 2 }}
        onMouseEnter={e => show(e.clientX, e.clientY)}
        onMouseLeave={() => hide(0)}
        onTouchStart={e => { e.stopPropagation(); const t = e.touches[0]; show(t.clientX, t.clientY); }}
        onTouchEnd={() => hide(1800)}
        onTouchMove={() => hide(0)}
      >{kürzel}</span>
      {tip && (
        <div style={{
          position: "fixed",
          left: Math.min(tip.x, window.innerWidth - 200),
          top: tip.y - 38,
          background: "rgba(20,16,8,0.95)",
          color: "#f0ece3",
          fontSize: 11,
          fontWeight: 600,
          padding: "5px 9px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          zIndex: 9999,
          pointerEvents: "none",
          boxShadow: "0 3px 10px rgba(0,0,0,.3)",
          lineHeight: 1.4,
        }}>
          <span style={{ color: "#94a3b8", fontSize: 10, marginRight: 5 }}>{nr}</span>{vollname}
          {/* kleiner Pfeil nach unten */}
          <div style={{ position:"absolute", left:12, bottom:-4, width:8, height:8,
            background:"rgba(20,16,8,0.95)", transform:"rotate(45deg)" }} />
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KONTENPLAN-MODAL – vollständige Übersicht mit Suche und Filter
// ══════════════════════════════════════════════════════════════════════════════
function KontenplanModal({ onSchliessen }) {
  const [suche, setSuche] = useState("");
  const [filterKlasse, setFilterKlasse] = useState(null);
  const [filterTyp, setFilterTyp] = useState(null);
  const [nurKLR, setNurKLR] = useState(false);

  const gefiltert = React.useMemo(() => {
    const q = suche.trim().toLowerCase();
    return KONTEN.filter(k => {
      if (filterKlasse !== null && k.klasse !== filterKlasse) return false;
      if (filterTyp    !== null && k.typ    !== filterTyp)    return false;
      if (nurKLR && !k.klr) return false;
      if (!q) return true;
      return k.nr.includes(q) || k.kuerzel.toLowerCase().includes(q) || k.name.toLowerCase().includes(q) || k.gruppe.toLowerCase().includes(q);
    });
  }, [suche, filterKlasse, filterTyp, nurKLR]);

  const nachKlasse = React.useMemo(() => {
    const map = {};
    gefiltert.forEach(k => { if (!map[k.klasse]) map[k.klasse] = []; map[k.klasse].push(k); });
    return map;
  }, [gefiltert]);

  const typen = ["aktiv","passiv","ertrag","aufwand","abschluss"];
  const fBtn = (active, bg, text, border) => ({
    padding:"5px 10px", borderRadius:6, border:`1.5px solid ${active ? border : "rgba(240,236,227,0.12)"}`,
    fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Courier New',monospace",
    background: active ? bg : "rgba(240,236,227,0.05)", color: active ? text : "rgba(240,236,227,0.45)", letterSpacing:"0.04em",
  });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", zIndex:3000, display:"flex", alignItems:"stretch", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onSchliessen()}>
      <div style={{ background:"rgba(22,16,8,0.97)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(240,236,227,0.1)", width:"100%", maxWidth:760, display:"flex", flexDirection:"column",
        boxShadow:"0 8px 40px rgba(0,0,0,.6)", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ background:"rgba(240,236,227,0.04)", borderBottom:"1px solid rgba(240,236,227,0.1)",
          padding:"18px 20px 14px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"#f0ece3", letterSpacing:"-0.3px" }}>Kontenplan Bayern</div>
            <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)", textTransform:"uppercase", letterSpacing:".1em", marginTop:2 }}>IKR · BwR · Klassen 7–10</div>
          </div>
          <button onClick={onSchliessen} style={{ marginLeft:"auto", background:"rgba(240,236,227,0.06)", border:"1.5px solid rgba(240,236,227,0.15)",
            borderRadius:8, color:"rgba(240,236,227,0.5)", fontSize:18, cursor:"pointer", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Suche */}
        <div style={{ padding:"12px 20px", background:"#1e293b", borderBottom:"1px solid #334155", flexShrink:0 }}>
          <input
            style={{ width:"100%", boxSizing:"border-box", background:"#0f172a", border:"1.5px solid #334155",
              borderRadius:8, padding:"8px 14px", color:"#e2e8f0", fontSize:13,
              fontFamily:"'Courier New',monospace", outline:"none" }}
            placeholder="🔍  Nr., Kürzel oder Bezeichnung …"
            value={suche} onChange={e => setSuche(e.target.value)}
            autoFocus
          />
        </div>

        {/* Klassen-Filter */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"10px 20px", background:"rgba(240,236,227,0.04)", borderBottom:"1px solid rgba(240,236,227,0.1)", flexShrink:0 }}>
          {KONTEN_KLASSEN.map(k => (
            <button key={k.nr} style={fBtn(filterKlasse===k.nr,"rgba(232,96,10,0.15)","#e8600a","rgba(232,96,10,0.5)")}
              onClick={() => setFilterKlasse(filterKlasse===k.nr ? null : k.nr)}>{k.label}</button>
          ))}
        </div>

        {/* Typ-Filter */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"8px 20px", background:"rgba(240,236,227,0.04)", borderBottom:"1px solid rgba(240,236,227,0.1)", flexShrink:0, alignItems:"center" }}>
          <span style={{ fontSize:10, color:"rgba(240,236,227,0.4)", fontWeight:700, letterSpacing:".08em" }}>TYP:</span>
          {typen.map(t => { const f = KONTEN_TYP_FARBEN[t]; return (
            <button key={t} style={fBtn(filterTyp===t, f.bg, f.text, f.border)}
              onClick={() => setFilterTyp(filterTyp===t ? null : t)}>{f.label}</button>
          );})}
          <button style={{ ...fBtn(nurKLR,"#e8600a","#f0ece3","rgba(232,96,10,0.5)") }}
            onClick={() => setNurKLR(!nurKLR)}>● KLR</button>
          <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(240,236,227,0.4)" }}>{gefiltert.length} / {KONTEN.length}</span>
        </div>

        {/* Tabelle */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
          {Object.keys(nachKlasse).length === 0
            ? <div style={{ textAlign:"center", padding:48, color:"#475569", fontSize:13 }}>Keine Konten gefunden.</div>
            : KONTEN_KLASSEN.filter(kl => nachKlasse[kl.nr]?.length).map(kl => (
              <div key={kl.nr} style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:8, paddingBottom:6, borderBottom:"1px solid #1e293b" }}>
                  <span style={{ fontSize:10, fontWeight:800, color:"#475569", letterSpacing:".1em", textTransform:"uppercase" }}>{kl.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#94a3b8" }}>{kl.titel}</span>
                  <span style={{ marginLeft:"auto", fontSize:10, color:"#334155" }}>{nachKlasse[kl.nr].length} Konten</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>{["Nr.","Kürzel","Bezeichnung","Typ"].map(h => (
                      <th key={h} style={{ textAlign:"left", fontSize:10, fontWeight:800, color:"#475569",
                        letterSpacing:".1em", textTransform:"uppercase", padding:"3px 8px", borderBottom:"1px solid #1e293b" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {nachKlasse[kl.nr].map(k => {
                      const f = KONTEN_TYP_FARBEN[k.typ];
                      return (
                        <tr key={k.nr} style={{ borderBottom:"1px solid #1e293b" }}>
                          <td style={{ padding:"7px 8px", fontSize:13, fontWeight:700, color:"#e8600a", fontFamily:"'Courier New',monospace", whiteSpace:"nowrap" }}>{k.nr}</td>
                          <td style={{ padding:"7px 8px", fontSize:12, fontWeight:800, color:"#38bdf8", fontFamily:"'Courier New',monospace", whiteSpace:"nowrap" }}>{k.kuerzel}</td>
                          <td style={{ padding:"7px 8px", fontSize:13, color:"#e2e8f0" }}>
                            {k.name}
                            {k.klr && <span title="KLR-relevant" style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:"#e8600a", marginLeft:6, verticalAlign:"middle" }} />}
                          </td>
                          <td style={{ padding:"7px 8px" }}>
                            <span style={{ display:"inline-block", fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4,
                              background:f?.bg||"#1e293b", color:f?.text||"#e2e8f0", border:`1px solid ${f?.border||"#334155"}` }}>
                              {f?.label||k.typ}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))
          }
          {/* Legende */}
          <div style={{ marginTop:16, padding:"12px 14px", background:"#1e293b", borderRadius:8, border:"1px solid #334155" }}>
            <div style={{ fontSize:10, fontWeight:800, color:"#475569", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8 }}>Legende</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
              {typen.map(t => { const f = KONTEN_TYP_FARBEN[t]; return (
                <span key={t} style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:4,
                  background:f.bg, color:f.text, border:`1px solid ${f.border}` }}>{f.label}</span>
              );})}
              <span style={{ fontSize:11, color:"#94a3b8", display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:"#e8600a" }} />
                = geht in KLR ein
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { KontenplanModal, KürzelSpan, renderMitTooltips };
