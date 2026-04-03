// ══════════════════════════════════════════════════════════════════════════════
// APUebungModal – Abschlussprüfungs-Übungsmodul
// Extrahiert aus BuchungsWerk.jsx – Phase C7 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { S } from "../../styles.js";
import { generiereAPSatz, gesamtpunkte, AP_WAHLTEIL_6, AP_WAHLTEIL_7, AP_WAHLTEIL_8 } from "../../data/apAufgaben.js";
import { BelegAnzeige } from "../beleg/BelegAnzeige.jsx";

// ── AP-Übung Modal ─────────────────────────────────────────────────────────────
const WAHLTEIL_OPTIONEN = [
  { key:"wahlteil6", label:"Aufgabe 6 – KLR/Kalkulation",        pool: AP_WAHLTEIL_6 },
  { key:"wahlteil7", label:"Aufgabe 7 – Forderungsmanagement",   pool: AP_WAHLTEIL_7 },
  { key:"wahlteil8", label:"Aufgabe 8 – Beschaffung/Einkauf",    pool: AP_WAHLTEIL_8 },
];

const AUFGABEN_KEYS = [
  { key:"aufgabe1", nr:1, titel:"Beleg & Buchführung" },
  { key:"aufgabe2", nr:2, titel:"Wertpapiere" },
  { key:"aufgabe3", nr:3, titel:"Deckungsbeitragsrechnung" },
  { key:"aufgabe4", nr:4, titel:"Investition & Kosten" },
  { key:"aufgabe5", nr:5, titel:"Jahresabschluss" },
];

function renderMD(text) {
  if (text === null || text === undefined) return null;
  if (typeof text !== "string") return null;
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

function renderBuchungssatz(loesung) {
  if (!loesung || typeof loesung !== "object" || !loesung.soll) return null;
  const fmtBetrag = b => b.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 }) + " €";
  const sollStr = loesung.soll.map(p => `${p.konto} ${p.name}  ${fmtBetrag(p.betrag)}`).join("\n");
  const habenStr = loesung.haben?.map(p => `${p.konto} ${p.name}  ${fmtBetrag(p.betrag)}`).join("\n") ?? "";
  return (
    <div>
      {loesung.nebenrechnung && (
        <div style={{ color:"#94a3b8", fontSize:12, marginBottom:8, fontFamily:"'Courier New',monospace" }}>
          {loesung.nebenrechnung.map((z, i) => <div key={i}>{z}</div>)}
        </div>
      )}
      <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
        <div>
          <div style={{ color:"#60a5fa", fontSize:10, fontWeight:700, marginBottom:3 }}>SOLL</div>
          {loesung.soll.map((p, i) => (
            <div key={i} style={{ whiteSpace:"pre" }}><span style={{ color:"#e8600a" }}>{p.konto}</span> {p.name}  {fmtBetrag(p.betrag)}</div>
          ))}
        </div>
        {loesung.haben?.length > 0 && (
          <div>
            <div style={{ color:"#4ade80", fontSize:10, fontWeight:700, marginBottom:3 }}>HABEN</div>
            {loesung.haben.map((p, i) => (
              <div key={i} style={{ whiteSpace:"pre" }}><span style={{ color:"#e8600a" }}>{p.konto}</span> {p.name}  {fmtBetrag(p.betrag)}</div>
            ))}
          </div>
        )}
      </div>
      {loesung.hinweis && <div style={{ color:"#94a3b8", fontSize:11, marginTop:6 }}>{loesung.hinweis}</div>}
    </div>
  );
}

function renderSchema(schema) {
  if (!Array.isArray(schema)) return null;
  return (
    <table style={{ borderCollapse:"collapse", fontSize:12, width:"100%" }}>
      <tbody>
        {schema.map((row, i) => (
          <tr key={i} style={{ borderBottom: row.pos?.startsWith("=") || row.pos?.startsWith("Gewinn") || row.pos?.startsWith("Verlust") ? "1px solid #4ade80" : "none" }}>
            <td style={{ color:"#94a3b8", paddingRight:16, paddingTop:2, paddingBottom:2 }}>{row.pos}</td>
            {Object.entries(row).filter(([k]) => k !== "pos").map(([k, v]) => (
              <td key={k} style={{ color:"#86efac", textAlign:"right", paddingRight:12, whiteSpace:"nowrap" }}>
                {typeof v === "number" ? v.toLocaleString("de-DE", { minimumFractionDigits:0, maximumFractionDigits:2 }) : v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderLoesung(loesung) {
  if (loesung === null || loesung === undefined) return null;

  // String
  if (typeof loesung === "string") return <div>{renderMD(loesung)}</div>;

  // Array (mehrere Buchungssätze)
  if (Array.isArray(loesung)) {
    return (
      <div>
        {loesung.map((item, i) => (
          <div key={i} style={{ marginBottom:8 }}>
            {item.buchungsNr && <div style={{ color:"#94a3b8", fontSize:11, marginBottom:4 }}>Bu.-Nr. {item.buchungsNr}:</div>}
            {renderBuchungssatz(item)}
          </div>
        ))}
      </div>
    );
  }

  // Buchungssatz-Objekt
  if (loesung.soll) return renderBuchungssatz(loesung);

  // Schema (DB-Rechnung, KLR)
  if (loesung.schema) return renderSchema(loesung.schema);

  // Rechnung + Ergebnis
  if (loesung.rechnung || loesung.ergebnis !== undefined) {
    const fmtBetrag = b => typeof b === "number"
      ? b.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 })
      : b;
    return (
      <div>
        {Array.isArray(loesung.rechnung)
          ? loesung.rechnung.map((z, i) => <div key={i} style={{ color:"#94a3b8", fontSize:12 }}>{z}</div>)
          : loesung.rechnung && <div style={{ color:"#94a3b8", fontSize:12 }}>{loesung.rechnung}</div>
        }
        {loesung.ergebnis !== undefined && (
          <div style={{ color:"#4ade80", fontWeight:700, marginTop:4 }}>= {fmtBetrag(loesung.ergebnis)}</div>
        )}
        {loesung.beurteilung && <div style={{ color:"#86efac", marginTop:4 }}>{loesung.beurteilung}</div>}
        {loesung.entscheidung && <div style={{ color:"#4ade80", fontWeight:700, marginTop:4 }}>→ {loesung.entscheidung}</div>}
        {loesung.hinweis && <div style={{ color:"#94a3b8", fontSize:11, marginTop:4 }}>{loesung.hinweis}</div>}
      </div>
    );
  }

  // Einfache Key-Value Objekte (z.B. {A:"richtig", B:"falsch"})
  return (
    <div>
      {Object.entries(loesung).map(([k, v]) => (
        <div key={k}><strong style={{ color:"#e8600a" }}>{k}:</strong> {String(v)}</div>
      ))}
    </div>
  );
}

// ── AP-Beleg-Anzeige (Eingangs-/Ausgangsrechnung als Papierdokument) ──────────
function APBelegAnzeige({ beleg, unternehmen }) {
  if (!beleg) return null;
  const fmt = n => typeof n === "number"
    ? n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(n ?? "");
  const istAusgang = beleg.typ?.toLowerCase().includes("ausgang");
  const partner = beleg.kunde || beleg.lieferant;

  return (
    <div style={{ margin:"0 20px 12px", background:"#fff", borderRadius:8, overflow:"hidden",
      fontSize:12, border:"1px solid #e2e8f0", fontFamily:"Arial,sans-serif", color:"#1e293b", flexShrink:0 }}>
      {/* Kopf */}
      <div style={{ background:"#1e293b", color:"#fff", padding:"8px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:800, fontSize:13 }}>{beleg.typ}</span>
        <span style={{ fontSize:11, opacity:0.7 }}>Nr. {beleg.rechnungsNr} · {beleg.datum}</span>
      </div>
      {/* Adressblock */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, padding:"10px 14px", borderBottom:"1px solid #e2e8f0" }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Absender</div>
          <div style={{ fontWeight:700 }}>{unternehmen?.name}</div>
          <div style={{ color:"#475569", fontSize:11 }}>{unternehmen?.anschrift}</div>
        </div>
        {partner && (
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{istAusgang ? "An" : "Von"}</div>
            <div style={{ fontWeight:700 }}>{partner.name}</div>
            <div style={{ color:"#475569", fontSize:11 }}>{partner.ort}</div>
          </div>
        )}
      </div>
      {/* Positionen */}
      {beleg.positionen?.length > 0 && (
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              {["Artikel","Menge","Einzelpreis","Gesamt"].map(h => (
                <th key={h} style={{ padding:"5px 10px", textAlign: h==="Artikel" ? "left" : "right",
                  fontWeight:700, fontSize:10, color:"#64748b", borderBottom:"1px solid #e2e8f0",
                  paddingLeft: h==="Artikel" ? 14 : 10, paddingRight: h==="Gesamt" ? 14 : 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {beleg.positionen.map((p, i) => (
              <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                <td style={{ padding:"5px 14px" }}>{p.artikel}</td>
                <td style={{ padding:"5px 10px", textAlign:"right" }}>{p.menge}</td>
                <td style={{ padding:"5px 10px", textAlign:"right" }}>{fmt(p.einzelpreis)} €</td>
                <td style={{ padding:"5px 14px", textAlign:"right" }}>{fmt(p.menge * p.einzelpreis)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Summenblock */}
      <div style={{ padding:"8px 14px 10px", background:"#f8fafc", display:"flex", justifyContent:"flex-end" }}>
        <table style={{ borderCollapse:"collapse", minWidth:260 }}>
          <tbody>
            {beleg.listenpreis != null && beleg.rabatt_pct && <>
              <tr><td style={{ padding:"2px 0", color:"#64748b", paddingRight:16 }}>Listenpreis</td><td style={{ textAlign:"right", color:"#64748b" }}>{fmt(beleg.listenpreis)} €</td></tr>
              <tr><td style={{ padding:"2px 0", color:"#64748b", paddingRight:16 }}>− Rabatt ({beleg.rabatt_pct} %)</td><td style={{ textAlign:"right", color:"#dc2626" }}>− {fmt(beleg.rabatt)} €</td></tr>
            </>}
            {beleg.leihverpackung > 0 && (
              <tr><td style={{ padding:"2px 0", color:"#64748b", paddingRight:16 }}>+ Leihverpackung</td><td style={{ textAlign:"right", color:"#475569" }}>{fmt(beleg.leihverpackung)} €</td></tr>
            )}
            <tr><td style={{ padding:"2px 0", color:"#475569", paddingRight:16 }}>Warenwert (netto)</td><td style={{ textAlign:"right" }}>{fmt(beleg.warenwert)} €</td></tr>
            <tr><td style={{ padding:"2px 0", color:"#64748b", paddingRight:16 }}>+ USt ({beleg.ust_pct} %)</td><td style={{ textAlign:"right", color:"#64748b" }}>{fmt(beleg.ust)} €</td></tr>
            <tr>
              <td style={{ padding:"4px 16px 2px 0", fontWeight:800, fontSize:13, borderTop:"2px solid #1e293b", color:"#1e293b" }}>Rechnungsbetrag</td>
              <td style={{ textAlign:"right", fontWeight:800, fontSize:13, borderTop:"2px solid #1e293b", color:"#1e293b" }}>{fmt(beleg.rechnungsbetrag)} €</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Skonto-/Zahlungsinfo */}
      {(beleg.skonto_pct || beleg.zahlungsziel) && (
        <div style={{ padding:"6px 14px 8px", borderTop:"1px solid #e2e8f0", fontSize:11, color:"#64748b", display:"flex", gap:16, flexWrap:"wrap" }}>
          {beleg.skonto_pct && <span>Skonto: {beleg.skonto_pct} % bis {beleg.skonto_frist}</span>}
          {beleg.zahlungsziel && <span>Zahlungsziel: {beleg.zahlungsziel}</span>}
        </div>
      )}
    </div>
  );
}

function APUebungModal({ onSchliessen }) {
  const [satz, setSatz]               = useState(() => generiereAPSatz());
  const [aktiveTab, setAktiveTab]     = useState("aufgabe1");
  const [wahlteil, setWahlteil]       = useState("wahlteil6");
  const [loesungOffen, setLoesungOffen] = useState({});
  const [alleAuf, setAlleAuf]         = useState(false);

  const neuerSatz = () => { setSatz(generiereAPSatz()); setAktiveTab("aufgabe1"); setLoesungOffen({}); setAlleAuf(false); };

  const alleTabs = [
    ...AUFGABEN_KEYS,
    WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil),
  ];

  const aktuelleAufgabe = aktiveTab === wahlteil ? satz[wahlteil] : satz[aktiveTab];
  const teilaufgaben = aktuelleAufgabe?.teilaufgaben ?? [];
  const geloest = teilaufgaben.filter(t => loesungOffen[t.nr]).length;
  const gesamt = gesamtpunkte(satz, wahlteil);

  const toggleL = nr => setLoesungOffen(p => ({ ...p, [nr]: !p[nr] }));
  const toggleAlle = () => {
    const open = !alleAuf;
    setAlleAuf(open);
    const m = {};
    teilaufgaben.forEach(t => { m[t.nr] = open; });
    setLoesungOffen(m);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.72)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", zIndex:3000, display:"flex", alignItems:"stretch", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onSchliessen()}>
      <div style={{ background:"rgba(22,16,8,0.97)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(240,236,227,0.1)", width:"100%", maxWidth:860, display:"flex", flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,.7)", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ background:"rgba(240,236,227,0.04)", borderBottom:"2px solid #e8600a", padding:"14px 20px 12px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <span style={{ fontSize:24 }}>🎓</span>
          <div style={{ flex:1 }}>
            <div style={{ color:"#f0ece3", fontWeight:800, fontSize:16 }}>AP-Übung · BwR Klasse 10</div>
            <div style={{ color:"rgba(240,236,227,0.45)", fontSize:11 }}>
              {satz.unternehmen.name} · {gesamt} Punkte gesamt
            </div>
          </div>
          <button onClick={neuerSatz}
            style={{ background:"rgba(240,236,227,0.06)", border:"1px solid rgba(240,236,227,0.18)", color:"rgba(240,236,227,0.7)", borderRadius:7, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            ↻ Neuer Satz
          </button>
          <button onClick={onSchliessen}
            style={{ background:"rgba(240,236,227,0.08)", border:"1px solid rgba(240,236,227,0.15)", color:"rgba(240,236,227,0.5)", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontSize:13, fontWeight:700 }}>✕</button>
        </div>

        {/* Wahlteil-Selector */}
        <div style={{ background:"#0a1120", borderBottom:"1px solid #1e293b", padding:"8px 20px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <span style={{ color:"#64748b", fontSize:11, fontWeight:600 }}>WAHLTEIL:</span>
          {WAHLTEIL_OPTIONEN.map(w => (
            <button key={w.key}
              onClick={() => { setWahlteil(w.key); if (aktiveTab !== "aufgabe1" && !AUFGABEN_KEYS.find(a => a.key === aktiveTab)) setAktiveTab(w.key); setLoesungOffen({}); setAlleAuf(false); }}
              style={{ padding:"4px 10px", border:"none", background: wahlteil===w.key?"#e8600a":"#1e293b", color: wahlteil===w.key?"#0f172a":"#64748b", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer" }}>
              {w.label.split(" – ")[1]}
            </button>
          ))}
        </div>

        {/* Aufgaben-Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #1e293b", background:"#0a1120", flexShrink:0, overflowX:"auto" }}>
          {alleTabs.map(tab => {
            if (!tab) return null;
            const isWahlteil = WAHLTEIL_OPTIONEN.some(w => w.key === tab.key);
            const isActive = aktiveTab === tab.key || (isWahlteil && aktiveTab === wahlteil);
            const aufgabe = isWahlteil ? satz[wahlteil] : satz[tab.key];
            const punkte = aufgabe?.gesamtpunkte ?? "?";
            return (
              <button key={tab.key}
                onClick={() => { setAktiveTab(isWahlteil ? wahlteil : tab.key); setLoesungOffen({}); setAlleAuf(false); }}
                style={{ padding:"10px 13px", border:"none", background:"transparent", borderBottom: isActive?"2px solid #e8600a":"2px solid transparent", color: isActive?"#e8600a":"#64748b", fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                {isWahlteil ? `${tab.nr || "W"}. ${tab.titel}` : `${tab.nr}. ${tab.titel}`}
                <span style={{ color:"#475569", fontSize:10, marginLeft:4 }}>({punkte}P)</span>
              </button>
            );
          })}
        </div>

        {/* Unternehmensinfo */}
        <div style={{ margin:"10px 20px 0", background:"#1e293b", borderRadius:8, padding:"8px 14px", fontSize:11, color:"#94a3b8", lineHeight:1.6, flexShrink:0 }}>
          <strong style={{ color:"#e8600a" }}>Unternehmen: </strong>
          {satz.unternehmen.name} · {satz.unternehmen.anschrift} · Branche: {satz.unternehmen.branche}
          {" · "}GJ: {satz.unternehmen.gj}
        </div>

        {/* Beleg – nur wenn vorhanden (z.B. Aufgabe 1: Eingangs-/Ausgangsrechnung) */}
        {aktuelleAufgabe?.beleg && (
          <APBelegAnzeige beleg={aktuelleAufgabe.beleg} unternehmen={satz.unternehmen} />
        )}

        {/* Aufgaben-Header */}
        <div style={{ padding:"12px 20px 8px", borderBottom:"1px solid #1e293b", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ color:"#64748b", fontSize:11 }}>
            {geloest}/{teilaufgaben.length} Lösungen geöffnet
            {aktuelleAufgabe?.gesamtpunkte && <span style={{ marginLeft:8 }}>· {aktuelleAufgabe.gesamtpunkte} Punkte</span>}
          </div>
          <button onClick={toggleAlle}
            style={{ background: alleAuf?"#065f46":"#334155", border:"none", color:"#fff", borderRadius:7, padding:"5px 11px", cursor:"pointer", fontSize:11, fontWeight:700 }}>
            {alleAuf ? "Alle zuklappen" : "Alle Lösungen"}
          </button>
        </div>

        {/* Teilaufgaben */}
        <div style={{ padding:"10px 20px 24px", flex:1 }}>
          {teilaufgaben.map(ta => (
            <div key={ta.nr} style={{ marginBottom:10, background:"#1e293b", borderRadius:10, overflow:"hidden", border:"1px solid #334155" }}>
              <div style={{ padding:"9px 14px", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ background:"#e8600a", color:"#0f172a", borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:800, flexShrink:0 }}>{ta.nr}</span>
                <span style={{ color:"#64748b", fontSize:11 }}>{ta.punkte} {ta.punkte === 1 ? "Punkt" : "Punkte"}</span>
                <button onClick={() => toggleL(ta.nr)}
                  style={{ marginLeft:"auto", background: loesungOffen[ta.nr]?"#065f46":"#1e3a5f", border:"none", color: loesungOffen[ta.nr]?"#4ade80":"#60a5fa", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:700 }}>
                  {loesungOffen[ta.nr] ? "✓ Lösung" : "Lösung zeigen"}
                </button>
              </div>
              <div style={{ padding:"10px 14px 12px", fontSize:13, color:"#cbd5e1", lineHeight:1.7, fontFamily:"'Segoe UI',sans-serif", borderTop:"1px solid #0f172a" }}>
                {ta.text}
              </div>
              {loesungOffen[ta.nr] && (
                <div style={{ padding:"12px 14px", fontSize:13, color:"#86efac", lineHeight:1.8, borderTop:"1px solid #0f172a", background:"#052e16", fontFamily:"'Courier New',monospace" }}>
                  <div style={{ color:"#4ade80", fontWeight:700, fontSize:10, marginBottom:6, fontFamily:"'Segoe UI',sans-serif", letterSpacing:".06em" }}>✓ MUSTERLÖSUNG</div>
                  {renderLoesung(ta.loesung)}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}


export default APUebungModal;
