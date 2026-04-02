// ══════════════════════════════════════════════════════════════════════════════
// Schaubild-Komponenten + GeschaeftsfallKarte
// Extrahiert aus BuchungsWerk.jsx – Phase E1 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { MessageSquare, PenLine, Save, RefreshCw, Zap } from "lucide-react";

// ── Schaubild-Komponenten (SVG, selbst generiert – kein Urheberrecht) ────────
export function LinienDiagramm({ daten }) {
  const { titel, untertitel, einheit, quelle, herausgeber, jahre, werte } = daten;
  const W = 480, H = 220, pad = { t: 40, r: 20, b: 50, l: 60 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const min = 0, max = Math.max(...werte) * 1.2;
  const x = i => pad.l + i * iW / (jahre.length - 1);
  const y = v => pad.t + iH - (v - min) / (max - min) * iH;
  const pts = werte.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const farbe = "#e8600a";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 480, fontFamily: "Arial, sans-serif", border: "1px solid rgba(240,236,227,0.12)", borderRadius: 8, background: "rgba(240,236,227,0.04)" }}>
      {/* Titel */}
      <text x={W/2} y={16} textAnchor="middle" fontSize={11} fontWeight="700" fill="#f0ece3">{titel}</text>
      <text x={W/2} y={28} textAnchor="middle" fontSize={9} fill="rgba(240,236,227,0.5)">{untertitel}</text>
      {/* Gitternetz */}
      {[0,0.25,0.5,0.75,1].map((t,i) => {
        const yv = pad.t + iH * (1-t);
        const val = min + (max-min)*t;
        return <g key={i}>
          <line x1={pad.l} y1={yv} x2={W-pad.r} y2={yv} stroke="rgba(240,236,227,0.12)" strokeWidth={1}/>
          <text x={pad.l-5} y={yv+4} textAnchor="end" fontSize={8} fill="rgba(240,236,227,0.4)">{val.toFixed(0)}</text>
        </g>;
      })}
      {/* Achsen */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t+iH} stroke="rgba(240,236,227,0.2)" strokeWidth={1.5}/>
      <line x1={pad.l} y1={pad.t+iH} x2={W-pad.r} y2={pad.t+iH} stroke="rgba(240,236,227,0.2)" strokeWidth={1.5}/>
      {/* Linie */}
      <polyline points={pts} fill="none" stroke={farbe} strokeWidth={2.5} strokeLinejoin="round"/>
      {/* Punkte + Werte */}
      {werte.map((v, i) => <g key={i}>
        <circle cx={x(i)} cy={y(v)} r={4} fill={farbe} stroke="#fff" strokeWidth={1.5}/>
        <text x={x(i)} y={y(v)-8} textAnchor="middle" fontSize={8} fontWeight="600" fill={farbe}>{v.toLocaleString("de-DE")}</text>
        <text x={x(i)} y={pad.t+iH+14} textAnchor="middle" fontSize={9} fill="rgba(240,236,227,0.6)">{jahre[i]}</text>
      </g>)}
      {/* Einheit links */}
      <text x={12} y={pad.t+iH/2} textAnchor="middle" fontSize={8} fill="rgba(240,236,227,0.35)" transform={`rotate(-90,12,${pad.t+iH/2})`}>{einheit}</text>
      {/* Quelle */}
      <text x={W-4} y={H-4} textAnchor="end" fontSize={7} fill="rgba(240,236,227,0.35)">Quelle: {quelle} | {herausgeber}</text>
    </svg>
  );
}

export function BalkenDiagramm({ daten }) {
  const { titel, untertitel, einheit, quelle, herausgeber, kategorien, werte } = daten;
  const W = 480, H = 220, pad = { t: 40, r: 20, b: 60, l: 70 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const max = Math.max(...werte) * 1.15;
  const barH = iH / kategorien.length * 0.65;
  const gap  = iH / kategorien.length;
  const farben = ["#e8600a","rgba(240,236,227,0.7)","rgba(240,236,227,0.5)","rgba(240,236,227,0.38)","rgba(240,236,227,0.26)","rgba(240,236,227,0.16)"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 480, fontFamily: "Arial, sans-serif", border: "1px solid rgba(240,236,227,0.12)", borderRadius: 8, background: "rgba(240,236,227,0.04)" }}>
      <text x={W/2} y={16} textAnchor="middle" fontSize={11} fontWeight="700" fill="#f0ece3">{titel}</text>
      <text x={W/2} y={28} textAnchor="middle" fontSize={9} fill="rgba(240,236,227,0.5)">{untertitel}</text>
      {/* Achsen */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t+iH} stroke="rgba(240,236,227,0.15)" strokeWidth={1.5}/>
      <line x1={pad.l} y1={pad.t+iH} x2={W-pad.r} y2={pad.t+iH} stroke="rgba(240,236,227,0.15)" strokeWidth={1.5}/>
      {/* Balken */}
      {kategorien.map((kat, i) => {
        const bW = werte[i] / max * iW;
        const yPos = pad.t + i * gap + (gap - barH) / 2;
        return <g key={i}>
          <text x={pad.l-5} y={yPos+barH/2+4} textAnchor="end" fontSize={9} fill="rgba(240,236,227,0.6)">{kat.length > 14 ? kat.slice(0,13)+"…" : kat}</text>
          <rect x={pad.l} y={yPos} width={bW} height={barH} fill={farben[i % farben.length]} rx={2} opacity={0.85}/>
          <text x={pad.l+bW+4} y={yPos+barH/2+4} fontSize={9} fontWeight="600" fill={farben[i % farben.length]}>{werte[i].toLocaleString("de-DE")}</text>
        </g>;
      })}
      {/* Einheit */}
      <text x={W-4} y={H-4} textAnchor="end" fontSize={7} fill="rgba(240,236,227,0.35)">Quelle: {quelle} | {herausgeber}</text>
    </svg>
  );
}

export function SchaubildAnzeige({ schaubild }) {
  if (!schaubild) return null;
  return (
    <div style={{ margin: "12px 0" }}>
      {schaubild.typ === "linie" && <LinienDiagramm daten={schaubild} />}
      {schaubild.typ === "balken" && <BalkenDiagramm daten={schaubild} />}
    </div>
  );
}

export function GeschaeftsfallKarte({ text, editText, onEdit, isEditing, onSave, onReset, onCancel, onKI, kiLaden }) {
  return (
    <div style={{ border: "1.5px dashed rgba(240,236,227,0.2)", borderRadius: "10px", background: "rgba(240,236,227,0.04)", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", flex: 1 }}>
          <MessageSquare size={11} strokeWidth={1.5} style={{ verticalAlign:"middle", marginRight:4 }} />Geschäftsfall
        </div>
        {!isEditing && onEdit && (
          <button onClick={onEdit} title="Geschäftsfall bearbeiten"
            style={{ padding: "2px 7px", border: "1.5px solid rgba(240,236,227,0.15)", borderRadius: "6px", background: "rgba(240,236,227,0.06)", cursor: "pointer", display:"flex", alignItems:"center" }}><PenLine size={13} strokeWidth={1.5} /></button>
        )}
      </div>
      {isEditing ? (
        <div>
          <textarea value={editText} onChange={e => onEdit && onEdit(e.target.value)} rows={4}
            style={{ width: "100%", padding: "8px", border: "1.5px solid rgba(240,236,227,0.22)", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", background: "rgba(240,236,227,0.05)", color: "#f0ece3" }} />
          <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
            <button onClick={onSave} style={{ padding: "5px 12px", background: "#141008", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><Save size={12} strokeWidth={1.5}/>Speichern</button>
            <button onClick={onReset} style={{ padding: "5px 12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><RefreshCw size={12} strokeWidth={1.5}/>Original</button>
            {onKI && <button onClick={onKI} disabled={kiLaden}
              style={{ padding: "5px 12px", background: "rgba(232,96,10,0.15)", color: "#e8600a", border: "1px solid rgba(232,96,10,0.3)", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: kiLaden ? "wait" : "pointer", opacity: kiLaden ? 0.7 : 1, display:"flex", alignItems:"center", gap:4 }}>
              {kiLaden ? <><Zap size={12} strokeWidth={1.5}/>KI…</> : <><RefreshCw size={12} strokeWidth={1.5}/>KI-Neuformulierung</>}
            </button>}
            <button onClick={onCancel} style={{ padding: "5px 12px", background: "rgba(240,236,227,0.06)", color: "rgba(240,236,227,0.5)", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Abbrechen</button>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: "14px", color: "rgba(240,236,227,0.85)", lineHeight: 1.7 }}>{text}</p>
      )}
    </div>
  );
}
