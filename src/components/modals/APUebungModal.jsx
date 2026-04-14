// ══════════════════════════════════════════════════════════════════════════════
// APUebungModal – Abschlussprüfungs-Übungsmodul (vollständig überarbeitet)
// Issues gelöst: UX-Redesign, Sidebar-Nav, Export Word/PDF,
//   rein-netto-Badge, Inline-Bearbeitung, Notenschlüssel, Live-Sharing
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import { RefreshCw, FileDown, Printer, GraduationCap,
         PenLine, Check, X, Award, Monitor } from "lucide-react";
import { generiereAPSatz, gesamtpunkte,
         AP_WAHLTEIL_6, AP_WAHLTEIL_7, AP_WAHLTEIL_8 } from "../../data/apAufgaben.js";
import H5PModal from "../quiz/H5PModal.jsx";

// ── Konstanten ─────────────────────────────────────────────────────────────────
const WAHLTEIL_OPTIONEN = [
  { key:"wahlteil6", nr:"6", label:"KLR / Kalkulation",        pool: AP_WAHLTEIL_6 },
  { key:"wahlteil7", nr:"7", label:"Forderungsmanagement",      pool: AP_WAHLTEIL_7 },
  { key:"wahlteil8", nr:"8", label:"Beschaffung / Einkauf",     pool: AP_WAHLTEIL_8 },
];

const PFLICHT_NAV = [
  { key:"aufgabe1", nr:1, titel:"Beleg & Buchführung" },
  { key:"aufgabe2", nr:2, titel:"Wertpapiere" },
  { key:"aufgabe3", nr:3, titel:"Deckungsbeitragsrechnung" },
  { key:"aufgabe4", nr:4, titel:"Investition & Kosten" },
  { key:"aufgabe5", nr:5, titel:"Jahresabschluss" },
];

// Bayern AP BwR Notenschlüssel (ISB-Empfehlung)
const NOTEN_SCHWELLEN = [
  { note:1, label:"sehr gut",      pct:87 },
  { note:2, label:"gut",           pct:73 },
  { note:3, label:"befriedigend",  pct:58 },
  { note:4, label:"ausreichend",   pct:44 },
  { note:5, label:"mangelhaft",    pct:20 },
  { note:6, label:"ungenügend",    pct:0  },
];

// ── Markdown-Renderer ──────────────────────────────────────────────────────────
function renderMD(text) {
  if (!text || typeof text !== "string") return null;
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

// ── Buchungssatz-Renderer ──────────────────────────────────────────────────────
function renderBuchungssatz(loesung) {
  if (!loesung?.soll) return null;
  const fmt = b => b.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 }) + " €";
  return (
    <div>
      {loesung.nebenrechnung && (
        <div style={{ color:"#94a3b8", fontSize:11, marginBottom:8, fontFamily:"'Courier New',monospace" }}>
          {loesung.nebenrechnung.map((z, i) => <div key={i}>{z}</div>)}
        </div>
      )}
      <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
        <div>
          <div style={{ color:"#60a5fa", fontSize:10, fontWeight:700, marginBottom:3, letterSpacing:".06em" }}>SOLL</div>
          {loesung.soll.map((p, i) => (
            <div key={i} style={{ whiteSpace:"pre", fontSize:12 }}>
              <span style={{ color:"#e8600a", fontWeight:700 }}>{p.konto}</span>{"  "}{p.name}{"  "}{fmt(p.betrag)}
            </div>
          ))}
        </div>
        {loesung.haben?.length > 0 && (
          <div>
            <div style={{ color:"#4ade80", fontSize:10, fontWeight:700, marginBottom:3, letterSpacing:".06em" }}>HABEN</div>
            {loesung.haben.map((p, i) => (
              <div key={i} style={{ whiteSpace:"pre", fontSize:12 }}>
                <span style={{ color:"#e8600a", fontWeight:700 }}>{p.konto}</span>{"  "}{p.name}{"  "}{fmt(p.betrag)}
              </div>
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
    <table style={{ borderCollapse:"collapse", fontSize:11, width:"100%" }}>
      <tbody>
        {schema.map((row, i) => {
          const isTotal = row.pos?.startsWith("=") || row.pos?.startsWith("Gewinn") || row.pos?.startsWith("Verlust");
          return (
            <tr key={i} style={{ borderBottom: isTotal ? "1px solid #4ade80" : "none" }}>
              <td style={{ color:"#94a3b8", paddingRight:16, paddingTop:2, paddingBottom:2 }}>{row.pos}</td>
              {Object.entries(row).filter(([k]) => k !== "pos").map(([k, v]) => (
                <td key={k} style={{ color:"#86efac", textAlign:"right", paddingRight:12, whiteSpace:"nowrap" }}>
                  {typeof v === "number" ? v.toLocaleString("de-DE", { minimumFractionDigits:0, maximumFractionDigits:2 }) : v}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function renderLoesung(loesung) {
  if (loesung === null || loesung === undefined) return null;
  if (typeof loesung === "string") return <div style={{ fontSize:13 }}>{renderMD(loesung)}</div>;
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
  if (loesung.soll) return renderBuchungssatz(loesung);
  if (loesung.schema) return renderSchema(loesung.schema);
  if (loesung.rechnung || loesung.ergebnis !== undefined) {
    const fmtB = b => typeof b === "number"
      ? b.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 })
      : b;
    return (
      <div>
        {Array.isArray(loesung.rechnung)
          ? loesung.rechnung.map((z, i) => <div key={i} style={{ color:"#94a3b8", fontSize:11 }}>{z}</div>)
          : loesung.rechnung && <div style={{ color:"#94a3b8", fontSize:11 }}>{loesung.rechnung}</div>
        }
        {loesung.ergebnis !== undefined && (
          <div style={{ color:"#4ade80", fontWeight:700, marginTop:4 }}>= {fmtB(loesung.ergebnis)}</div>
        )}
        {loesung.beurteilung && <div style={{ color:"#86efac", marginTop:4 }}>{loesung.beurteilung}</div>}
        {loesung.entscheidung && <div style={{ color:"#4ade80", fontWeight:700, marginTop:4 }}>→ {loesung.entscheidung}</div>}
        {loesung.hinweis && <div style={{ color:"#94a3b8", fontSize:11, marginTop:4 }}>{loesung.hinweis}</div>}
      </div>
    );
  }
  return (
    <div>
      {Object.entries(loesung).map(([k, v]) => (
        <div key={k}><strong style={{ color:"#e8600a" }}>{k}:</strong> {String(v)}</div>
      ))}
    </div>
  );
}

// ── AP-Beleg-Anzeige ────────────────────────────────────────────────────────────
function APBelegAnzeige({ beleg, unternehmen }) {
  if (!beleg) return null;
  const fmt = n => typeof n === "number"
    ? n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(n ?? "");
  const istAusgang = beleg.typ?.toLowerCase().includes("ausgang");
  const partner = beleg.kunde || beleg.lieferant;
  // "rein netto": Eingangsrechnung ohne Listenpreis-Rabatt, hat aber Zahlungsziel
  const istReinNetto = !beleg.listenpreis && beleg.zahlungsziel && !istAusgang;

  return (
    <div style={{ margin:"0 0 12px", background:"#fff", borderRadius:8, overflow:"hidden",
      fontSize:12, border:"1px solid #e2e8f0", fontFamily:"Arial,sans-serif", color:"#1e293b", flexShrink:0 }}>
      {/* Kopf */}
      <div style={{ background:"#1e293b", color:"#fff", padding:"8px 14px",
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:800, fontSize:13 }}>{beleg.typ}</span>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {istReinNetto && (
            <span style={{ background:"#e8600a", color:"#fff", borderRadius:4,
              padding:"2px 8px", fontSize:10, fontWeight:800, letterSpacing:".06em" }}>
              REIN NETTO
            </span>
          )}
          <span style={{ fontSize:11, opacity:0.7 }}>Nr. {beleg.rechnungsNr} · {beleg.datum}</span>
        </div>
      </div>
      {/* Adressblock */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12,
        padding:"10px 14px", borderBottom:"1px solid #e2e8f0" }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:"#64748b",
            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Absender</div>
          <div style={{ fontWeight:700 }}>{unternehmen?.name}</div>
          <div style={{ color:"#475569", fontSize:11 }}>{unternehmen?.anschrift}</div>
        </div>
        {partner && (
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:"#64748b",
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>
              {istAusgang ? "An" : "Von"}
            </div>
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
                <th key={h} style={{ padding:"5px 10px",
                  textAlign: h==="Artikel" ? "left" : "right",
                  fontWeight:700, fontSize:10, color:"#64748b",
                  borderBottom:"1px solid #e2e8f0",
                  paddingLeft: h==="Artikel" ? 14 : 10,
                  paddingRight: h==="Gesamt" ? 14 : 10 }}>{h}</th>
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
        <table style={{ borderCollapse:"collapse", minWidth:280 }}>
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
              <td style={{ padding:"4px 16px 2px 0", fontWeight:800, fontSize:13,
                borderTop:"2px solid #1e293b", color:"#1e293b" }}>Rechnungsbetrag</td>
              <td style={{ textAlign:"right", fontWeight:800, fontSize:13,
                borderTop:"2px solid #1e293b", color:"#1e293b" }}>{fmt(beleg.rechnungsbetrag)} €</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Skonto / Zahlungsinfo */}
      {(beleg.skonto_pct || beleg.zahlungsziel) && (
        <div style={{ padding:"6px 14px 8px", borderTop:"1px solid #e2e8f0",
          fontSize:11, color:"#64748b", display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
          {beleg.skonto_pct && <span>Skonto: {beleg.skonto_pct} % bis {beleg.skonto_frist}</span>}
          {beleg.zahlungsziel && (
            <span style={{ display:"flex", alignItems:"center", gap:6 }}>
              Zahlungsziel: {beleg.zahlungsziel}
              {istReinNetto && (
                <span style={{ background:"#fff7ed", border:"1px solid #fed7aa",
                  color:"#c2410c", borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:700 }}>
                  rein netto
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Notenschlüssel-Panel ───────────────────────────────────────────────────────
function NotenschluesselPanel({ gesamtP }) {
  const rows = NOTEN_SCHWELLEN.map((s, i) => {
    const maxPct = i === 0 ? 100 : NOTEN_SCHWELLEN[i - 1].pct - 1;
    const minP = Math.ceil((s.pct / 100) * gesamtP);
    const maxP = Math.floor((maxPct / 100) * gesamtP);
    return { ...s, maxPct, minP, maxP };
  });

  const NOTE_COLORS = {
    1:"#16a34a", 2:"#22c55e", 3:"#eab308", 4:"#f97316", 5:"#ef4444", 6:"#dc2626"
  };

  return (
    <div style={{ padding:"20px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <Award size={20} color="#e8600a" />
        <span style={{ color:"#f0ece3", fontWeight:800, fontSize:15 }}>Notenschlüssel</span>
        <span style={{ color:"rgba(240,236,227,0.4)", fontSize:12, marginLeft:"auto" }}>
          Bayern AP BwR · {gesamtP} Punkte gesamt
        </span>
      </div>
      <div style={{ background:"rgba(240,236,227,0.04)", borderRadius:10,
        border:"1px solid rgba(240,236,227,0.08)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"rgba(232,96,10,0.12)", borderBottom:"1px solid rgba(240,236,227,0.1)" }}>
              {["Note","Bezeichnung","Prozent","Mindestpunkte"].map(h => (
                <th key={h} style={{ padding:"8px 14px", textAlign:"left",
                  color:"rgba(240,236,227,0.5)", fontSize:10, fontWeight:700,
                  letterSpacing:".06em", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.note} style={{ borderBottom:"1px solid rgba(240,236,227,0.06)",
                background: i % 2 === 0 ? "transparent" : "rgba(240,236,227,0.02)" }}>
                <td style={{ padding:"9px 14px" }}>
                  <span style={{ background: NOTE_COLORS[r.note] + "22",
                    color: NOTE_COLORS[r.note], border:`1px solid ${NOTE_COLORS[r.note]}44`,
                    borderRadius:6, padding:"2px 8px", fontWeight:800, fontSize:14 }}>
                    {r.note}
                  </span>
                </td>
                <td style={{ padding:"9px 14px", color:"#f0ece3", fontSize:13 }}>{r.label}</td>
                <td style={{ padding:"9px 14px", color:"rgba(240,236,227,0.55)", fontSize:12 }}>
                  {r.note === 6 ? "0–19 %" : `${r.pct}–${r.maxPct} %`}
                </td>
                <td style={{ padding:"9px 14px", color:"rgba(240,236,227,0.7)", fontSize:12, fontWeight:600 }}>
                  {r.note === 6 ? `0–${r.maxP}` : r.minP >= r.maxP ? `${r.minP}` : `${r.minP}–${r.maxP}`} P
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:12, fontSize:11, color:"rgba(240,236,227,0.3)", lineHeight:1.6 }}>
        Richtwerte gemäß ISB Bayern. Die Schule kann den Schlüssel anpassen.
      </div>
    </div>
  );
}

// ── Word-Export für AP-Satz ────────────────────────────────────────────────────
async function exportAPWord(satz, wahlteil, gesamtP, mitLoesung = false) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, BorderStyle, AlignmentType, VerticalAlign } = await import("docx");

  const nb = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const sb = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const lb = { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" };

  const p = (text, opts = {}) => new Paragraph({
    children: [new TextRun({
      text: text || "",
      size:   opts.size   || 22,
      bold:   opts.bold   || false,
      italic: opts.italic || false,
      color:  opts.color  || "000000",
      font:   "Arial",
    })],
    spacing: { after: opts.after ?? 120 },
    alignment: opts.align || AlignmentType.LEFT,
  });

  const sectionBreak = () => new Paragraph({
    children: [new TextRun({ text: "", size: 22, font: "Arial" })],
    pageBreakBefore: true,
  });

  const leerP = () => p("", { after: 60 });

  const fmtBetrag = b => typeof b === "number"
    ? b.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 }) + " €"
    : String(b ?? "");

  const loesungZuText = (loesung) => {
    if (!loesung) return [];
    if (typeof loesung === "string") return [p(loesung, { size:20, color:"2d6a0a" })];
    if (Array.isArray(loesung)) {
      return loesung.flatMap(item => {
        const lines = [];
        if (item.buchungsNr) lines.push(p(`Bu.-Nr. ${item.buchungsNr}:`, { size:18, bold:true }));
        if (item.soll) {
          lines.push(p("SOLL: " + item.soll.map(s => `${s.konto} ${s.name} ${fmtBetrag(s.betrag)}`).join(" / "), { size:20, color:"2d6a0a" }));
          if (item.haben) lines.push(p("HABEN: " + item.haben.map(h => `${h.konto} ${h.name} ${fmtBetrag(h.betrag)}`).join(" / "), { size:20, color:"2d6a0a" }));
        }
        return lines;
      });
    }
    if (loesung.soll) {
      const lines = [];
      if (loesung.nebenrechnung) loesung.nebenrechnung.forEach(z => lines.push(p(z, { size:18, italic:true, color:"555555" })));
      lines.push(p("SOLL: " + loesung.soll.map(s => `${s.konto} ${s.name} ${fmtBetrag(s.betrag)}`).join(" / "), { size:20, color:"2d6a0a" }));
      if (loesung.haben) lines.push(p("HABEN: " + loesung.haben.map(h => `${h.konto} ${h.name} ${fmtBetrag(h.betrag)}`).join(" / "), { size:20, color:"2d6a0a" }));
      return lines;
    }
    if (loesung.schema) {
      return loesung.schema.map(row => {
        const vals = Object.entries(row).filter(([k]) => k !== "pos").map(([, v]) => String(v)).join(" | ");
        return p(`${row.pos}  ${vals}`, { size:20, color:"2d6a0a" });
      });
    }
    if (loesung.rechnung || loesung.ergebnis !== undefined) {
      const lines = [];
      if (Array.isArray(loesung.rechnung)) loesung.rechnung.forEach(z => lines.push(p(z, { size:18, italic:true, color:"555555" })));
      else if (loesung.rechnung) lines.push(p(loesung.rechnung, { size:18, italic:true, color:"555555" }));
      if (loesung.ergebnis !== undefined) lines.push(p("= " + fmtBetrag(loesung.ergebnis), { size:20, bold:true, color:"2d6a0a" }));
      if (loesung.entscheidung) lines.push(p("→ " + loesung.entscheidung, { size:20, bold:true, color:"2d6a0a" }));
      return lines;
    }
    return [p(Object.entries(loesung).map(([k, v]) => `${k}: ${v}`).join("  |  "), { size:20, color:"2d6a0a" })];
  };

  const allAufgaben = [
    ...PFLICHT_NAV.map(nav => ({ ...nav, data: satz[nav.key] })),
    { key: wahlteil, nr: WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil)?.nr || "W",
      titel: WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil)?.label || "Wahlteil",
      data: satz[wahlteil] },
  ];

  const children = [];

  // Deckblatt-Info
  children.push(p("AP-Übung · BwR Klasse 10", { size:32, bold:true, after:200 }));
  children.push(p(satz.unternehmen.name, { size:24, bold:true, color:"555555", after:80 }));
  children.push(p(satz.unternehmen.anschrift + " · " + satz.unternehmen.branche, { size:20, color:"888888", after:60 }));
  children.push(p("Geschäftsjahr: " + satz.unternehmen.gj, { size:20, color:"888888", after:300 }));
  children.push(p(`Gesamtpunkte: ${gesamtP} Punkte`, { size:22, bold:true, after:60 }));
  children.push(leerP());

  allAufgaben.forEach((aufgabe, ai) => {
    if (!aufgabe.data) return;
    if (ai > 0) children.push(sectionBreak());

    // Aufgaben-Überschrift
    children.push(p(`Aufgabe ${aufgabe.nr} – ${aufgabe.titel}  (${aufgabe.data.gesamtpunkte} Punkte)`,
      { size:26, bold:true, after:120, color:"1e293b" }));

    // Beleg-Info (vereinfacht)
    if (aufgabe.data.beleg) {
      const b = aufgabe.data.beleg;
      children.push(p(`${b.typ} · Nr. ${b.rechnungsNr} · ${b.datum}`, { size:20, bold:true, color:"333333", after:80 }));
      if (b.warenwert) children.push(p(`Warenwert: ${fmtBetrag(b.warenwert)}  |  USt: ${fmtBetrag(b.ust)}  |  Rechnungsbetrag: ${fmtBetrag(b.rechnungsbetrag)}`, { size:20, color:"555555", after:60 }));
      if (b.skonto_pct) children.push(p(`Skonto: ${b.skonto_pct} % bis ${b.skonto_frist}  |  Zahlungsziel: ${b.zahlungsziel}`, { size:20, color:"555555", after:120 }));
    }

    // Teilaufgaben
    aufgabe.data.teilaufgaben?.forEach(ta => {
      children.push(p(`${ta.nr}  [${ta.punkte} ${ta.punkte === 1 ? "Punkt" : "Punkte"}]  ${ta.text}`,
        { size:22, bold:false, after:60 }));
      if (mitLoesung) {
        const loesZeilen = loesungZuText(ta.loesung);
        loesZeilen.forEach(z => children.push(z));
      }
      children.push(leerP());
    });
  });

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top:1134, bottom:1134, left:1134, right:1134 } } }, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AP-Übung_${satz.unternehmen.kurz}_${new Date().toLocaleDateString("de-DE").replace(/\./g, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF-Export für AP-Satz ─────────────────────────────────────────────────────
function exportAPPdf(satz, wahlteil, gesamtP) {
  const allAufgaben = [
    ...PFLICHT_NAV.map(nav => ({ ...nav, data: satz[nav.key] })),
    { key: wahlteil, nr: WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil)?.nr || "W",
      titel: WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil)?.label || "Wahlteil",
      data: satz[wahlteil] },
  ];

  const fmtB = n => typeof n === "number"
    ? n.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 })
    : String(n ?? "");

  const aufgabenHtml = allAufgaben.map(aufgabe => {
    if (!aufgabe.data) return "";
    const beleg = aufgabe.data.beleg;
    const belegHtml = beleg ? `
      <div class="beleg">
        <div class="beleg-head">${beleg.typ} · Nr. ${beleg.rechnungsNr} · ${beleg.datum}</div>
        ${beleg.warenwert ? `<div class="beleg-row">Warenwert: ${fmtB(beleg.warenwert)} € | USt ${beleg.ust_pct} %: ${fmtB(beleg.ust)} € | <strong>Rechnungsbetrag: ${fmtB(beleg.rechnungsbetrag)} €</strong></div>` : ""}
        ${beleg.skonto_pct ? `<div class="beleg-row">Skonto: ${beleg.skonto_pct} % bis ${beleg.skonto_frist} | Zahlungsziel: ${beleg.zahlungsziel}</div>` : ""}
      </div>` : "";

    const taHtml = (aufgabe.data.teilaufgaben || []).map(ta => `
      <div class="ta">
        <span class="ta-nr">${ta.nr}</span>
        <span class="ta-p">${ta.punkte} P</span>
        <span class="ta-text">${ta.text}</span>
      </div>`).join("");

    return `
      <div class="aufgabe">
        <div class="aufgabe-title">Aufgabe ${aufgabe.nr} – ${aufgabe.titel} <span class="punkte">(${aufgabe.data.gesamtpunkte} Punkte)</span></div>
        ${belegHtml}
        ${taHtml}
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>AP-Übung ${satz.unternehmen.name}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:12px; color:#1e293b; padding:20mm; line-height:1.5; }
  h1 { font-size:18px; margin-bottom:4px; }
  .meta { color:#64748b; font-size:11px; margin-bottom:20px; }
  .aufgabe { margin-bottom:24px; page-break-inside:avoid; }
  .aufgabe-title { font-size:14px; font-weight:700; border-bottom:2px solid #1e293b;
    padding-bottom:4px; margin-bottom:10px; }
  .punkte { font-weight:400; color:#64748b; font-size:12px; }
  .beleg { background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px;
    padding:8px 12px; margin-bottom:10px; font-size:11px; }
  .beleg-head { font-weight:700; margin-bottom:4px; }
  .beleg-row { color:#64748b; }
  .ta { display:flex; gap:8px; align-items:baseline; padding:4px 0; border-bottom:1px solid #f1f5f9; }
  .ta-nr { font-weight:700; min-width:40px; color:#1e293b; }
  .ta-p { color:#64748b; min-width:28px; font-size:10px; }
  .ta-text { flex:1; }
  @media print { body { padding:15mm; } }
</style></head><body>
<h1>AP-Übung · BwR Klasse 10</h1>
<div class="meta">${satz.unternehmen.name} · ${satz.unternehmen.anschrift} · GJ: ${satz.unternehmen.gj} · Gesamt: ${gesamtP} Punkte</div>
${aufgabenHtml}
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Bitte Popup-Blocker deaktivieren."); return; }
  w.document.write(html);
  w.document.close();
}

// ── Hauptkomponente ────────────────────────────────────────────────────────────
function APUebungModal({ onSchliessen }) {
  const [satz, setSatz]                 = useState(() => generiereAPSatz());
  const [aktiveTab, setAktiveTab]       = useState("aufgabe1");
  const [wahlteil, setWahlteil]         = useState("wahlteil6");
  const [loesungOffen, setLoesungOffen] = useState({});
  const [alleAuf, setAlleAuf]           = useState(false);
  const [editTexte, setEditTexte]       = useState({});     // { [ta.nr]: string }
  const [editAktiv, setEditAktiv]       = useState({});     // { [ta.nr]: bool }
  const [h5pOffen, setH5pOffen]         = useState(false);
  const [exportLaeuft, setExportLaeuft] = useState(false);

  const neuerSatz = () => {
    setSatz(generiereAPSatz());
    setAktiveTab("aufgabe1");
    setLoesungOffen({});
    setAlleAuf(false);
    setEditTexte({});
    setEditAktiv({});
  };

  const gesamtP = gesamtpunkte(satz, wahlteil);

  // Aktuelle Aufgabe
  const aktuelleAufgabe = aktiveTab === "notenschluessel"
    ? null
    : aktiveTab === wahlteil
      ? satz[wahlteil]
      : satz[aktiveTab];

  const teilaufgaben = aktuelleAufgabe?.teilaufgaben ?? [];
  const geloest = teilaufgaben.filter(t => loesungOffen[t.nr]).length;

  const toggleL = nr => setLoesungOffen(p => ({ ...p, [nr]: !p[nr] }));
  const toggleAlle = () => {
    const open = !alleAuf;
    setAlleAuf(open);
    const m = {};
    teilaufgaben.forEach(t => { m[t.nr] = open; });
    setLoesungOffen(m);
  };

  const startEdit = (ta) => {
    setEditAktiv(p => ({ ...p, [ta.nr]: true }));
    if (!editTexte[ta.nr]) setEditTexte(p => ({ ...p, [ta.nr]: ta.text }));
  };
  const saveEdit = (nr) => setEditAktiv(p => ({ ...p, [nr]: false }));
  const cancelEdit = (nr, originalText) => {
    setEditTexte(p => ({ ...p, [nr]: originalText }));
    setEditAktiv(p => ({ ...p, [nr]: false }));
  };

  // H5P: buchungssatz-fähige Teilaufgaben → reguläres aufgaben-Format
  // macheDragKonten erwartet: { id, text, soll:[{nr,name,betrag}], haben:[{nr,name,betrag}] }
  const h5pAufgaben = useMemo(() => {
    const result = [];
    [...PFLICHT_NAV, { key: wahlteil }].forEach(nav => {
      const aufgabe = nav.key === wahlteil ? satz[wahlteil] : satz[nav.key];
      if (!aufgabe) return;
      aufgabe.teilaufgaben?.forEach(ta => {
        if (ta.loesung?.soll) {
          // AP-Konten haben "konto" statt "nr" — normalisieren
          const normKonto = k => ({ nr: k.konto || k.nr, name: k.name, betrag: k.betrag });
          result.push({
            id: `ap-${ta.nr}`,
            text: ta.text,
            soll:  ta.loesung.soll.map(normKonto),
            haben: (ta.loesung.haben || []).map(normKonto),
            punkte: ta.punkte,
          });
        }
      });
    });
    return result;
  }, [satz, wahlteil]);

  const h5pConfig = { klasse:"10", typ:"AP-Übung", datum: new Date().toISOString().split("T")[0] };
  const h5pFirma  = { name: satz.unternehmen.name, typ: satz.unternehmen.branche };

  const handleWordExport = async () => {
    setExportLaeuft(true);
    try { await exportAPWord(satz, wahlteil, gesamtP, false); }
    catch (e) { alert("Word-Export Fehler: " + e.message); }
    finally { setExportLaeuft(false); }
  };

  // ── Sidebar-Farben ──────────────────────────────────────────────────────────
  const sidebarBg    = "rgba(10,8,4,0.8)";
  const sidebarBorder= "rgba(240,236,227,0.07)";

  const navBtn = (key, nr, titel, punkte, isWahlteil = false) => {
    const isActive = aktiveTab === key;
    return (
      <button key={key}
        onClick={() => { setAktiveTab(key); setLoesungOffen({}); setAlleAuf(false); }}
        style={{ display:"flex", alignItems:"center", gap:10, width:"100%",
          background: isActive ? "rgba(232,96,10,0.15)" : "transparent",
          border:"none", borderLeft: isActive ? "3px solid #e8600a" : "3px solid transparent",
          padding:"9px 14px 9px 12px", cursor:"pointer", textAlign:"left",
          borderRadius:"0 6px 6px 0", transition:"all 150ms ease" }}>
        <span style={{ background: isActive ? "#e8600a" : "rgba(240,236,227,0.12)",
          color: isActive ? "#0f172a" : "rgba(240,236,227,0.5)",
          borderRadius:5, padding:"2px 7px", fontSize:11, fontWeight:800,
          minWidth:24, textAlign:"center", flexShrink:0 }}>
          {nr}
        </span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color: isActive ? "#f0ece3" : "rgba(240,236,227,0.55)",
            fontSize:11, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden",
            textOverflow:"ellipsis" }}>
            {titel}
          </div>
          {punkte && (
            <div style={{ color:"rgba(240,236,227,0.3)", fontSize:10 }}>{punkte} P</div>
          )}
        </div>
        {isWahlteil && (
          <span style={{ fontSize:9, color:"rgba(232,96,10,0.7)", fontWeight:700, letterSpacing:".04em" }}>
            WAHL
          </span>
        )}
      </button>
    );
  };

  const wt = WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil);

  return (
    <>
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.76)",
      backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", zIndex:3000,
      display:"flex", alignItems:"stretch", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onSchliessen()}>

      <div style={{ background:"rgba(20,16,8,0.98)", backdropFilter:"blur(28px)",
        WebkitBackdropFilter:"blur(28px)", border:"1px solid rgba(240,236,227,0.08)",
        width:"100%", maxWidth:1060, display:"flex", flexDirection:"column",
        boxShadow:"0 12px 60px rgba(0,0,0,.8)" }}>

        {/* ── Modal-Header ─────────────────────────────────────────────────── */}
        <div style={{ background:"rgba(240,236,227,0.03)",
          borderBottom:"2px solid #e8600a", padding:"12px 18px",
          display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <GraduationCap size={22} color="#e8600a" />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:"#f0ece3", fontWeight:800, fontSize:15 }}>
              AP-Übung · BwR Klasse 10
            </div>
            <div style={{ color:"rgba(240,236,227,0.4)", fontSize:11,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {satz.unternehmen.name} · {gesamtP} Punkte gesamt
            </div>
          </div>

          {/* Aktions-Buttons */}
          <button onClick={neuerSatz} title="Neuer Aufgabensatz"
            style={{ background:"rgba(240,236,227,0.07)", border:"1px solid rgba(240,236,227,0.15)",
              color:"rgba(240,236,227,0.65)", borderRadius:7, padding:"6px 11px",
              cursor:"pointer", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
            <RefreshCw size={13} /> Neuer Satz
          </button>
          <button onClick={() => exportAPPdf(satz, wahlteil, gesamtP)} title="PDF-Export"
            style={{ background:"rgba(240,236,227,0.07)", border:"1px solid rgba(240,236,227,0.15)",
              color:"rgba(240,236,227,0.65)", borderRadius:7, padding:"6px 11px",
              cursor:"pointer", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
            <Printer size={13} /> PDF
          </button>
          <button onClick={handleWordExport} disabled={exportLaeuft} title="Word-Export"
            style={{ background:"rgba(240,236,227,0.07)", border:"1px solid rgba(240,236,227,0.15)",
              color: exportLaeuft ? "rgba(240,236,227,0.3)" : "rgba(240,236,227,0.65)",
              borderRadius:7, padding:"6px 11px", cursor: exportLaeuft ? "default" : "pointer",
              fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
            <FileDown size={13} /> {exportLaeuft ? "…" : "Word"}
          </button>
          {h5pAufgaben.length > 0 && (
            <button onClick={() => setH5pOffen(true)} title="Live im Unterricht teilen"
              style={{ background:"rgba(232,96,10,0.15)", border:"1px solid rgba(232,96,10,0.35)",
                color:"#e8600a", borderRadius:7, padding:"6px 11px",
                cursor:"pointer", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
              <Monitor size={13} /> Live teilen
            </button>
          )}
          <button onClick={onSchliessen}
            style={{ background:"rgba(240,236,227,0.07)", border:"1px solid rgba(240,236,227,0.12)",
              color:"rgba(240,236,227,0.45)", borderRadius:8, padding:"7px 13px",
              cursor:"pointer", fontSize:13, fontWeight:700 }}>✕</button>
        </div>

        {/* ── Body (Sidebar + Content) ──────────────────────────────────────── */}
        <div style={{ display:"flex", flex:1, minHeight:0, overflow:"hidden" }}>

          {/* ── Linke Sidebar ──────────────────────────────────────────────── */}
          <div style={{ width:210, flexShrink:0, background:sidebarBg,
            borderRight:`1px solid ${sidebarBorder}`, display:"flex", flexDirection:"column",
            overflowY:"auto" }}>

            {/* Unternehmensinfo */}
            <div style={{ padding:"12px 14px 10px", borderBottom:`1px solid ${sidebarBorder}` }}>
              <div style={{ color:"#e8600a", fontSize:10, fontWeight:800,
                letterSpacing:".07em", textTransform:"uppercase", marginBottom:4 }}>Unternehmen</div>
              <div style={{ color:"#f0ece3", fontSize:12, fontWeight:700, lineHeight:1.4 }}>
                {satz.unternehmen.name}
              </div>
              <div style={{ color:"rgba(240,236,227,0.4)", fontSize:10, marginTop:2 }}>
                {satz.unternehmen.branche}
              </div>
            </div>

            {/* Wahlteil-Wähler */}
            <div style={{ padding:"10px 14px 8px", borderBottom:`1px solid ${sidebarBorder}` }}>
              <div style={{ color:"rgba(240,236,227,0.35)", fontSize:10, fontWeight:700,
                letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>Wahlteil</div>
              {WAHLTEIL_OPTIONEN.map(w => (
                <button key={w.key}
                  onClick={() => { setWahlteil(w.key); if (aktiveTab === wahlteil) setAktiveTab(w.key); setLoesungOffen({}); setAlleAuf(false); }}
                  style={{ display:"block", width:"100%", textAlign:"left",
                    background: wahlteil===w.key ? "rgba(232,96,10,0.18)" : "transparent",
                    border:"none", borderRadius:5, padding:"5px 8px", cursor:"pointer",
                    color: wahlteil===w.key ? "#e8600a" : "rgba(240,236,227,0.45)",
                    fontSize:11, fontWeight: wahlteil===w.key ? 700 : 400, marginBottom:1 }}>
                  A{w.nr} {w.label}
                </button>
              ))}
            </div>

            {/* Aufgaben-Navigation */}
            <div style={{ padding:"10px 0 8px" }}>
              <div style={{ color:"rgba(240,236,227,0.35)", fontSize:10, fontWeight:700,
                letterSpacing:".07em", textTransform:"uppercase", padding:"0 14px", marginBottom:6 }}>
                Aufgaben
              </div>
              {PFLICHT_NAV.map(nav =>
                navBtn(nav.key, nav.nr, nav.titel, satz[nav.key]?.gesamtpunkte)
              )}
              {wt && navBtn(wahlteil, wt.nr, wt.label, satz[wahlteil]?.gesamtpunkte, true)}
            </div>

            {/* Notenschlüssel */}
            <div style={{ padding:"8px 0", borderTop:`1px solid ${sidebarBorder}`, marginTop:"auto" }}>
              <button
                onClick={() => setAktiveTab("notenschluessel")}
                style={{ display:"flex", alignItems:"center", gap:8, width:"100%",
                  background: aktiveTab==="notenschluessel" ? "rgba(232,96,10,0.15)" : "transparent",
                  border:"none", borderLeft: aktiveTab==="notenschluessel" ? "3px solid #e8600a" : "3px solid transparent",
                  padding:"9px 14px 9px 12px", cursor:"pointer",
                  borderRadius:"0 6px 6px 0" }}>
                <Award size={16} color={aktiveTab==="notenschluessel" ? "#e8600a" : "rgba(240,236,227,0.4)"} />
                <span style={{ color: aktiveTab==="notenschluessel" ? "#f0ece3" : "rgba(240,236,227,0.45)",
                  fontSize:11, fontWeight:600 }}>Notenschlüssel</span>
              </button>
            </div>
          </div>

          {/* ── Rechte Content-Fläche ──────────────────────────────────────── */}
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>

            {aktiveTab === "notenschluessel" ? (
              <NotenschluesselPanel gesamtP={gesamtP} />
            ) : (
              <>
                {/* Aufgabe-Header */}
                <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid rgba(240,236,227,0.07)",
                  flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                  <div>
                    <div style={{ color:"#f0ece3", fontWeight:800, fontSize:14 }}>
                      {aktuelleAufgabe
                        ? (PFLICHT_NAV.find(n => n.key === aktiveTab)
                          ? `Aufgabe ${PFLICHT_NAV.find(n => n.key === aktiveTab).nr} – ${PFLICHT_NAV.find(n => n.key === aktiveTab).titel}`
                          : `Aufgabe ${wt?.nr} – ${wt?.label}`)
                        : "Aufgabe"}
                    </div>
                    <div style={{ color:"rgba(240,236,227,0.35)", fontSize:11, marginTop:2 }}>
                      {geloest}/{teilaufgaben.length} Lösungen geöffnet
                      {aktuelleAufgabe?.gesamtpunkte && (
                        <span style={{ marginLeft:10 }}>· {aktuelleAufgabe.gesamtpunkte} Punkte</span>
                      )}
                    </div>
                  </div>
                  <button onClick={toggleAlle}
                    style={{ background: alleAuf ? "rgba(22,101,52,0.4)" : "rgba(51,65,85,0.6)",
                      border:`1px solid ${alleAuf ? "rgba(74,222,128,0.3)" : "rgba(240,236,227,0.12)"}`,
                      color: alleAuf ? "#4ade80" : "rgba(240,236,227,0.6)",
                      borderRadius:7, padding:"5px 12px", cursor:"pointer", fontSize:11, fontWeight:700 }}>
                    {alleAuf ? "Alle zuklappen" : "Alle Lösungen"}
                  </button>
                </div>

                {/* Scrollbarer Content */}
                <div style={{ padding:"16px 20px 24px", flex:1 }}>
                  {/* Beleg */}
                  {aktuelleAufgabe?.beleg && (
                    <APBelegAnzeige beleg={aktuelleAufgabe.beleg} unternehmen={satz.unternehmen} />
                  )}

                  {/* Teilaufgaben */}
                  {teilaufgaben.map(ta => (
                    <div key={ta.nr} style={{ marginBottom:10,
                      background:"rgba(30,41,59,0.5)", borderRadius:10, overflow:"hidden",
                      border:"1px solid rgba(51,65,85,0.8)" }}>

                      {/* Teilaufgabe-Kopf */}
                      <div style={{ padding:"9px 14px", display:"flex",
                        alignItems:"flex-start", gap:8 }}>
                        <span style={{ background:"#e8600a", color:"#0f172a", borderRadius:5,
                          padding:"2px 8px", fontSize:11, fontWeight:800, flexShrink:0, marginTop:1 }}>
                          {ta.nr}
                        </span>
                        <span style={{ color:"rgba(240,236,227,0.4)", fontSize:10,
                          flexShrink:0, marginTop:3, minWidth:38 }}>
                          {ta.punkte} {ta.punkte === 1 ? "P" : "P"}
                        </span>
                        <div style={{ flex:1 }} />
                        {/* Bearbeiten-Button */}
                        {!editAktiv[ta.nr] ? (
                          <button onClick={() => startEdit(ta)}
                            style={{ background:"transparent", border:"none",
                              color:"rgba(240,236,227,0.25)", cursor:"pointer", padding:"2px 4px",
                              display:"flex", alignItems:"center", gap:3, fontSize:10,
                              transition:"color 150ms" }}
                            title="Aufgabentext bearbeiten">
                            <PenLine size={12} /> <span>Bearbeiten</span>
                          </button>
                        ) : (
                          <div style={{ display:"flex", gap:4 }}>
                            <button onClick={() => saveEdit(ta.nr)}
                              style={{ background:"rgba(22,101,52,0.4)", border:"1px solid rgba(74,222,128,0.3)",
                                color:"#4ade80", borderRadius:5, padding:"2px 8px",
                                cursor:"pointer", fontSize:10, fontWeight:700,
                                display:"flex", alignItems:"center", gap:3 }}>
                              <Check size={11} /> Speichern
                            </button>
                            <button onClick={() => cancelEdit(ta.nr, ta.text)}
                              style={{ background:"rgba(51,65,85,0.5)", border:"1px solid rgba(100,116,139,0.3)",
                                color:"rgba(240,236,227,0.5)", borderRadius:5, padding:"2px 8px",
                                cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", gap:3 }}>
                              <X size={11} />
                            </button>
                          </div>
                        )}
                        <button onClick={() => toggleL(ta.nr)}
                          style={{ marginLeft:4, background: loesungOffen[ta.nr]
                            ? "rgba(22,101,52,0.4)" : "rgba(30,58,95,0.6)",
                            border: `1px solid ${loesungOffen[ta.nr] ? "rgba(74,222,128,0.3)" : "rgba(96,165,250,0.2)"}`,
                            color: loesungOffen[ta.nr] ? "#4ade80" : "#60a5fa",
                            borderRadius:6, padding:"4px 10px", cursor:"pointer",
                            fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                          {loesungOffen[ta.nr] ? "✓ Lösung" : "Lösung zeigen"}
                        </button>
                      </div>

                      {/* Aufgabentext (editierbar oder normal) */}
                      {editAktiv[ta.nr] ? (
                        <div style={{ padding:"0 14px 10px" }}>
                          <textarea
                            value={editTexte[ta.nr] ?? ta.text}
                            onChange={e => setEditTexte(p => ({ ...p, [ta.nr]: e.target.value }))}
                            style={{ width:"100%", background:"rgba(240,236,227,0.08)",
                              border:"1px solid rgba(232,96,10,0.4)", borderRadius:6,
                              color:"#f0ece3", fontSize:13, padding:"8px 10px",
                              fontFamily:"'IBM Plex Sans',sans-serif", lineHeight:1.6,
                              resize:"vertical", minHeight:60, outline:"none",
                              colorScheme:"dark" }}
                            rows={3}
                          />
                        </div>
                      ) : (
                        <div style={{ padding:"8px 14px 12px", fontSize:13, color:"#cbd5e1",
                          lineHeight:1.7, fontFamily:"'Segoe UI',sans-serif",
                          borderTop:"1px solid rgba(15,23,42,0.6)" }}>
                          {renderMD(editTexte[ta.nr] ?? ta.text)}
                        </div>
                      )}

                      {/* Lösung */}
                      {loesungOffen[ta.nr] && (
                        <div style={{ padding:"12px 14px 14px",
                          fontSize:13, color:"#86efac", lineHeight:1.8,
                          borderTop:"1px solid rgba(15,23,42,0.6)",
                          background:"rgba(5,46,22,0.4)",
                          fontFamily:"'Courier New',monospace" }}>
                          <div style={{ color:"#4ade80", fontWeight:700, fontSize:10,
                            marginBottom:6, fontFamily:"'IBM Plex Sans',sans-serif",
                            letterSpacing:".06em" }}>✓ MUSTERLÖSUNG</div>
                          {renderLoesung(ta.loesung)}
                        </div>
                      )}
                    </div>
                  ))}

                  {teilaufgaben.length === 0 && (
                    <div style={{ color:"rgba(240,236,227,0.25)", textAlign:"center",
                      padding:"40px 20px", fontSize:13 }}>
                      Keine Teilaufgaben verfügbar.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {h5pOffen && (
      <H5PModal
        aufgaben={h5pAufgaben}
        config={h5pConfig}
        firma={h5pFirma}
        onSchliessen={() => setH5pOffen(false)}
      />
    )}
    </>
  );
}

export default APUebungModal;
