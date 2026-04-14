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

// ── Word-Export für AP-Satz (AP-Layout nach ISB-Vorgabe) ────────────────────
async function exportAPWord(satz, wahlteil, gesamtP) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, BorderStyle, AlignmentType, ShadingType, VerticalAlign } = await import('docx');

  const PW = 9638;
  const nb = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' };
  const sb = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const lb = { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' };
  const bb = { style: BorderStyle.SINGLE, size: 2, color: 'AAAAAA' };

  const p = (text, opts = {}) => new Paragraph({
    children: [new TextRun({
      text: text || '', size: opts.size || 22, bold: opts.bold || false,
      italic: opts.italic || false, color: opts.color || '000000', font: 'Arial',
    })],
    spacing: { before: opts.before || 0, after: opts.after ?? 80 },
    alignment: opts.align || AlignmentType.LEFT,
    indent: opts.indent ? { left: opts.indent } : undefined,
  });
  const ep = (h = 80) => new Paragraph({ children: [], spacing: { after: h } });

  const aufgZeile = (nr, text, punkte, pageBreakBefore = false) => new Paragraph({
    spacing: { before: 120, after: 60 },
    pageBreakBefore,
    tabStops: [{ type: 'right', position: PW - 200 }],
    children: [
      new TextRun({ text: String(nr) + '  ', size: 22, bold: true,  font: 'Arial' }),
      new TextRun({ text: text,              size: 22, bold: false, font: 'Arial' }),
      new TextRun({ text: '	[' + punkte + ' P]', size: 20, color: '555555', font: 'Arial' }),
    ],
  });

  const fmt = n => typeof n === 'number'
    ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
    : String(n ?? '');

  const unt = satz.unternehmen;
  const children = [];

  // 1. KOPFZEILE
  const noteW = 1800, pktW = 2000, titW = PW - noteW - pktW;
  children.push(new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: [titW, noteW, pktW],
    rows: [new TableRow({ height: { value: 900, rule: 'atLeast' }, children: [
      new TableCell({
        width: { size: titW, type: WidthType.DXA },
        borders: { top: sb, bottom: sb, left: sb, right: nb },
        margins: { top: 80, bottom: 80, left: 120, right: 60 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 16 }, children: [
            new TextRun({ text: 'Abschlussprüfungs-Übung  ·  BwR Klasse 10', size: 20, color: '666666', font: 'Arial' }),
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
            new TextRun({ text: unt.name, size: 28, bold: true, font: 'Arial' }),
          ]}),
        ],
      }),
      new TableCell({
        width: { size: noteW, type: WidthType.DXA },
        borders: { top: sb, bottom: sb, left: sb, right: nb },
        verticalAlign: VerticalAlign.BOTTOM,
        margins: { top: 80, bottom: 80, left: 80, right: 40 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
          new TextRun({ text: '_______', size: 22, font: 'Arial' }),
          new TextRun({ text: ' Note',  size: 18, color: '666666', font: 'Arial' }),
        ]})],
      }),
      new TableCell({
        width: { size: pktW, type: WidthType.DXA },
        borders: { top: sb, bottom: sb, left: sb, right: sb },
        verticalAlign: VerticalAlign.BOTTOM,
        margins: { top: 80, bottom: 80, left: 40, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
          new TextRun({ text: '______ / ' + String(gesamtP) + ' P', size: 22, font: 'Arial' }),
        ]})],
      }),
    ]}),
  ]}));

  children.push(new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: PW, type: WidthType.DXA },
      borders: { top: nb, bottom: sb, left: sb, right: sb },
      margins: { top: 140, bottom: 140, left: 120, right: 120 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [
        new TextRun({ text: 'Name: ',   size: 22, bold: true, font: 'Arial' }),
        new TextRun({ text: '___________________________          ', size: 22, font: 'Arial' }),
        new TextRun({ text: 'Datum: ',  size: 22, bold: true, font: 'Arial' }),
        new TextRun({ text: new Date().toLocaleDateString('de-DE') + '          ', size: 22, font: 'Arial' }),
        new TextRun({ text: 'Klasse: ', size: 22, bold: true, font: 'Arial' }),
        new TextRun({ text: '_____',    size: 22, font: 'Arial' }),
      ]})],
    })]})],
  }));
  children.push(ep(220));

  // 2. UNTERNEHMENSVORSTELLUNG
  children.push(new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
    borders: {
      top: lb, bottom: lb,
      left: { style: BorderStyle.SINGLE, size: 16, color: '1E4D8C' },
      right: nb, insideH: nb, insideV: nb,
    },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: PW, type: WidthType.DXA },
      shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
      borders: { top: nb, bottom: nb, left: nb, right: nb },
      margins: { top: 100, bottom: 100, left: 180, right: 140 },
      children: [
        new Paragraph({ spacing: { after: 14 }, children: [
          new TextRun({ text: unt.name,                    size: 24, bold: true, color: '1E4D8C', font: 'Arial' }),
          new TextRun({ text: '  ·  ' + unt.anschrift, size: 18, color: '555555',            font: 'Arial' }),
        ]}),
        new Paragraph({ spacing: { after: 10 }, children: [
          new TextRun({ text: 'Inhaber: ',             size: 20, bold: true,  color: '444444', font: 'Arial' }),
          new TextRun({ text: unt.inhaber,             size: 20,              color: '444444', font: 'Arial' }),
          new TextRun({ text: '  ·  Branche: ',  size: 20, bold: true,  color: '444444', font: 'Arial' }),
          new TextRun({ text: unt.branche,             size: 20,              color: '444444', font: 'Arial' }),
          new TextRun({ text: '  ·  GJ: ',       size: 20, bold: true,  color: '444444', font: 'Arial' }),
          new TextRun({ text: unt.gj,                  size: 20,              color: '444444', font: 'Arial' }),
        ]}),
        ...[
          unt.rohstoffe      ? 'Rohstoffe: '      + unt.rohstoffe      : null,
          unt.fremdbauteile  ? 'Fremdbauteile: '  + unt.fremdbauteile  : null,
          unt.hilfsstoffe    ? 'Hilfsstoffe: '    + unt.hilfsstoffe    : null,
          unt.betriebsstoffe ? 'Betriebsstoffe: ' + unt.betriebsstoffe : null,
        ].filter(Boolean).map((line, idx, arr) => {
          const ci = line.indexOf(': ');
          return new Paragraph({
            spacing: { after: idx === arr.length - 1 ? 0 : 8 }, indent: { left: 320 },
            children: [
              new TextRun({ text: line.slice(0, ci + 2), size: 20, bold: true, color: '333333', font: 'Arial' }),
              new TextRun({ text: line.slice(ci + 2),    size: 20,             color: '555555', font: 'Arial' }),
            ],
          });
        }),
      ],
    })]})],
  }));
  children.push(ep(160));

  // 3. SZENARIO + FORMALE VORGABEN
  children.push(new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: PW, type: WidthType.DXA },
      shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
      borders: { top: sb, bottom: sb, left: sb, right: sb },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({ spacing: { after: 80 }, children: [
          new TextRun({ text: 'Als Mitarbeiter/in im Unternehmen ' + unt.name + ' bearbeiten Sie betriebswirtschaftliche Aufgaben.', size: 20, italic: true, font: 'Arial' }),
        ]}),
        new Paragraph({ spacing: { after: 60 }, children: [
          new TextRun({ text: 'Formale Vorgaben:', size: 20, bold: true, font: 'Arial' }),
        ]}),
        ...[
          'Bei Buchungsstäzen sind stets Kontonummern, Kontennamen (abgekürzt möglich) und Beträge anzugeben.',
          'Bei Berechnungen sind jeweils alle notwendigen Lösungsschritte und Nebenrechnungen darzustellen.',
          'Alle Ergebnisse sind in der Regel auf zwei Nachkommastellen gerundet anzugeben.',
          'Soweit nicht anders vermerkt, gilt ein Umsatzsteuersatz von 19 %.',
        ].map(txt => new Paragraph({
          spacing: { after: 40 }, indent: { left: 360 },
          children: [
            new TextRun({ text: '•  ', size: 20, font: 'Arial' }),
            new TextRun({ text: txt,        size: 20, font: 'Arial' }),
          ],
        })),
      ],
    })]})],
  }));
  children.push(ep(240));

  // 4. AUFGABEN
  const allAufgaben = [
    ...PFLICHT_NAV.map(nav => ({ ...nav, data: satz[nav.key] })),
    { key: wahlteil, nr: WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil)?.nr || 'W',
      titel: WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil)?.label || 'Wahlteil',
      data: satz[wahlteil] },
  ];

  allAufgaben.forEach((aufgabe, ai) => {
    if (!aufgabe.data) return;

    // Aufgaben-Titel (grauer Balken + Seitenumbruch)
    children.push(new Table({
      width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
      rows: [new TableRow({ children: [new TableCell({
        width: { size: PW, type: WidthType.DXA },
        shading: { fill: 'E5E7EB', type: ShadingType.CLEAR },
        borders: { top: nb, bottom: nb, left: nb, right: nb },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          spacing: { after: 0 }, pageBreakBefore: ai > 0,
          tabStops: [{ type: 'right', position: PW - 200 }],
          children: [
            new TextRun({ text: 'Aufgabe ' + aufgabe.nr + ' – ' + aufgabe.titel, size: 26, bold: true, font: 'Arial' }),
            new TextRun({ text: '	(' + aufgabe.data.gesamtpunkte + ' Punkte)', size: 22, bold: false, color: '555555', font: 'Arial' }),
          ],
        })],
      })]})],
    }));
    children.push(ep(100));

    // Beleg als vollstaendige Rechnung
    if (aufgabe.data.beleg) {
      const b   = aufgabe.data.beleg;
      const par = b.kunde || b.lieferant;
      const colW = [Math.floor(PW*0.40), Math.floor(PW*0.12), Math.floor(PW*0.24), PW - Math.floor(PW*0.40) - Math.floor(PW*0.12) - Math.floor(PW*0.24)];

      // Belegkopf
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
        borders: { top: sb, bottom: nb, left: sb, right: sb, insideH: nb, insideV: nb },
        rows: [new TableRow({ children: [new TableCell({
          width: { size: PW, type: WidthType.DXA },
          shading: { fill: '1E293B', type: ShadingType.CLEAR },
          borders: { top: nb, bottom: nb, left: nb, right: nb },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            spacing: { after: 0 }, tabStops: [{ type: 'right', position: PW - 200 }],
            children: [
              new TextRun({ text: b.typ.toUpperCase(), size: 24, bold: true, color: 'FFFFFF', font: 'Arial' }),
              new TextRun({ text: '	Nr. ' + b.rechnungsNr + '  ·  ' + b.datum, size: 18, color: 'AAAAAA', font: 'Arial' }),
            ],
          })],
        })]})],
      }));

      // Adressblock
      const aW = Math.floor(PW / 2);
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA }, columnWidths: [aW, aW],
        borders: { top: nb, bottom: bb, left: sb, right: sb, insideH: nb, insideV: bb },
        rows: [new TableRow({ children: [
          new TableCell({
            width: { size: aW, type: WidthType.DXA }, borders: { top: nb, bottom: nb, left: nb, right: nb },
            margins: { top: 80, bottom: 80, left: 120, right: 60 },
            children: [
              new Paragraph({ spacing: { after: 16 }, children: [new TextRun({ text: 'Absender', size: 16, bold: true, color: '888888', font: 'Arial' })] }),
              new Paragraph({ spacing: { after: 8  }, children: [new TextRun({ text: unt.name,      size: 20, bold: true, font: 'Arial' })] }),
              new Paragraph({ spacing: { after: 0  }, children: [new TextRun({ text: unt.anschrift, size: 18, color: '555555', font: 'Arial' })] }),
            ],
          }),
          new TableCell({
            width: { size: aW, type: WidthType.DXA }, borders: { top: nb, bottom: nb, left: nb, right: nb },
            margins: { top: 80, bottom: 80, left: 60, right: 120 },
            children: par ? [
              new Paragraph({ spacing: { after: 16 }, children: [new TextRun({ text: b.kunde ? 'An' : 'Von', size: 16, bold: true, color: '888888', font: 'Arial' })] }),
              new Paragraph({ spacing: { after: 8  }, children: [new TextRun({ text: par.name,     size: 20, bold: true, font: 'Arial' })] }),
              new Paragraph({ spacing: { after: 0  }, children: [new TextRun({ text: par.ort || '', size: 18, color: '555555', font: 'Arial' })] }),
            ] : [ep(0)],
          }),
        ]})]
      }));

      // Positionen
      if (b.positionen?.length) {
        const mkH = (txt, w, last = false) => new TableCell({
          width: { size: w, type: WidthType.DXA }, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
          borders: { top: nb, bottom: bb, left: sb, right: last ? sb : nb },
          margins: { top: 50, bottom: 50, left: 80, right: 80 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: txt, size: 18, bold: true, color: '555555', font: 'Arial' })] })],
        });
        const mkC = (txt, w, right = false, last = false) => new TableCell({
          width: { size: w, type: WidthType.DXA },
          borders: { top: nb, bottom: nb, left: sb, right: last ? sb : nb },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT, spacing: { after: 0 }, children: [new TextRun({ text: txt, size: 20, font: 'Arial' })] })],
        });
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA }, columnWidths: colW,
          borders: { top: nb, bottom: nb, left: nb, right: nb, insideH: nb, insideV: nb },
          rows: [
            new TableRow({ children: [mkH('Artikel', colW[0]), mkH('Menge', colW[1]), mkH('Einzelpreis', colW[2]), mkH('Gesamt', colW[3], true)] }),
            ...b.positionen.map(pos => new TableRow({ children: [
              mkC(pos.artikel, colW[0]), mkC(String(pos.menge), colW[1]),
              mkC(fmt(pos.einzelpreis), colW[2], true), mkC(fmt(pos.menge * pos.einzelpreis), colW[3], true, true),
            ]})),
          ],
        }));
      }

      // Summenblock
      const spW = Math.floor(PW * 0.55), valW = PW - spW;
      const mkSum = (label, value, bold = false, topB = false) => {
        const bT = topB ? { style: BorderStyle.SINGLE, size: 4, color: '000000' } : nb;
        return new TableRow({ children: [
          new TableCell({
            width: { size: spW, type: WidthType.DXA },
            borders: { top: bT, bottom: nb, left: sb, right: nb },
            margins: { top: bold ? 60 : 30, bottom: bold ? 60 : 30, left: 120, right: 80 },
            children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: label, size: bold ? 22 : 20, bold, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: valW, type: WidthType.DXA },
            borders: { top: bT, bottom: nb, left: nb, right: sb },
            margins: { top: bold ? 60 : 30, bottom: bold ? 60 : 30, left: 80, right: 80 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: value, size: bold ? 22 : 20, bold, font: 'Arial' })] })],
          }),
        ]});
      };
      const sumRows = [];
      if (b.listenpreis != null && b.rabatt_pct) {
        sumRows.push(mkSum('Listenpreis', fmt(b.listenpreis)));
        sumRows.push(mkSum('− Rabatt (' + b.rabatt_pct + ' %)', '− ' + fmt(b.rabatt)));
      }
      if (b.leihverpackung > 0) sumRows.push(mkSum('+ Leihverpackung', '+ ' + fmt(b.leihverpackung)));
      sumRows.push(mkSum('Warenwert (netto)',                   fmt(b.warenwert)));
      sumRows.push(mkSum('+ Umsatzsteuer (' + b.ust_pct + ' %)', fmt(b.ust)));
      sumRows.push(mkSum('Rechnungsbetrag', fmt(b.rechnungsbetrag), true, true));
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA }, columnWidths: [spW, valW],
        borders: { top: nb, bottom: sb, left: nb, right: nb, insideH: nb, insideV: nb },
        rows: sumRows,
      }));

      // Zahlungskonditionen
      if (b.skonto_pct || b.zahlungsziel) {
        const zInfo = [
          b.skonto_pct   ? 'Skonto: ' + b.skonto_pct + ' % bis ' + b.skonto_frist : null,
          b.zahlungsziel ? 'Zahlungsziel: ' + b.zahlungsziel : null,
        ].filter(Boolean).join('     ');
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
          borders: { top: nb, bottom: sb, left: sb, right: sb, insideH: nb, insideV: nb },
          rows: [new TableRow({ children: [new TableCell({
            width: { size: PW, type: WidthType.DXA }, borders: { top: nb, bottom: nb, left: nb, right: nb },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: zInfo, size: 18, italic: true, color: '666666', font: 'Arial' })] })],
          })]})],
        }));
      }
      children.push(ep(160));
    }

    // Teilaufgaben
    aufgabe.data.teilaufgaben?.forEach(ta => {
      children.push(aufgZeile(ta.nr, ta.text, ta.punkte));
    });
    children.push(ep(80));
  });

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top:1134, bottom:1134, left:1134, right:1134 } } }, children }],
  });
  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'AP-Übung_' + unt.kurz + '_' + new Date().toLocaleDateString('de-DE').replace(/./g, '-') + '.docx';
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

  const unt = satz.unternehmen;
  const fmt = n => typeof n === "number"
    ? n.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 }) + " €"
    : String(n ?? "");
  const today = new Date().toLocaleDateString("de-DE");

  const aufgabenHtml = allAufgaben.map((aufgabe, ai) => {
    if (!aufgabe.data) return "";
    const b = aufgabe.data.beleg;

    let belegHtml = "";
    if (b) {
      const par = b.kunde || b.lieferant;
      const posHtml = b.positionen?.length ? `
        <table class="pos-table">
          <thead><tr><th class="pos-art">Artikel</th><th class="pos-mge">Menge</th><th class="pos-ep">Einzelpreis</th><th class="pos-ges">Gesamt</th></tr></thead>
          <tbody>${b.positionen.map(pos => `
            <tr>
              <td>${pos.artikel}</td>
              <td>${pos.menge}</td>
              <td class="r">${fmt(pos.einzelpreis)}</td>
              <td class="r">${fmt(pos.menge * pos.einzelpreis)}</td>
            </tr>`).join("")}
          </tbody>
        </table>` : "";
      const sumRows = [];
      if (b.listenpreis != null && b.rabatt_pct) {
        sumRows.push(`<tr><td>Listenpreis</td><td class="r">${fmt(b.listenpreis)}</td></tr>`);
        sumRows.push(`<tr><td>− Rabatt (${b.rabatt_pct} %)</td><td class="r">− ${fmt(b.rabatt)}</td></tr>`);
      }
      if (b.leihverpackung > 0) sumRows.push(`<tr><td>+ Leihverpackung</td><td class="r">+ ${fmt(b.leihverpackung)}</td></tr>`);
      sumRows.push(`<tr><td>Warenwert (netto)</td><td class="r">${fmt(b.warenwert)}</td></tr>`);
      sumRows.push(`<tr><td>+ Umsatzsteuer (${b.ust_pct} %)</td><td class="r">${fmt(b.ust)}</td></tr>`);
      sumRows.push(`<tr class="sum-final"><td><strong>Rechnungsbetrag</strong></td><td class="r"><strong>${fmt(b.rechnungsbetrag)}</strong></td></tr>`);
      const zkHtml = (b.skonto_pct || b.zahlungsziel) ? `
        <div class="zk">
          ${b.skonto_pct ? `Skonto: <strong>${b.skonto_pct} %</strong> bis ${b.skonto_frist}&emsp;` : ""}
          ${b.zahlungsziel ? `Zahlungsziel: <strong>${b.zahlungsziel}</strong>` : ""}
        </div>` : "";
      belegHtml = `
        <div class="beleg">
          <div class="beleg-head">
            <span class="beleg-typ">${b.typ.toUpperCase()}</span>
            <span class="beleg-meta">Nr. ${b.rechnungsNr} &nbsp;·&nbsp; ${b.datum}</span>
          </div>
          <div class="beleg-addr">
            <div class="addr-col">
              <div class="addr-label">Absender</div>
              <div class="addr-name">${unt.name}</div>
              <div class="addr-sub">${unt.anschrift}</div>
            </div>
            ${par ? `<div class="addr-col">
              <div class="addr-label">${b.kunde ? "An" : "Von"}</div>
              <div class="addr-name">${par.name}</div>
              <div class="addr-sub">${par.ort || ""}</div>
            </div>` : ""}
          </div>
          ${posHtml}
          <table class="sum-table">
            <tbody>${sumRows.join("")}</tbody>
          </table>
          ${zkHtml}
        </div>`;
    }

    const taHtml = (aufgabe.data.teilaufgaben || []).map(ta => `
      <div class="ta">
        <span class="ta-nr">${ta.nr}</span>
        <span class="ta-p">${ta.punkte}&thinsp;P</span>
        <span class="ta-text">${ta.text}</span>
      </div>`).join("");

    const pb = ai > 0 ? ' style="page-break-before:always"' : "";
    return `
      <div class="aufgabe"${pb}>
        <div class="aufg-title">
          <span>Aufgabe ${aufgabe.nr} &ndash; ${aufgabe.titel}</span>
          <span class="aufg-p">(${aufgabe.data.gesamtpunkte} Punkte)</span>
        </div>
        ${belegHtml}
        <div class="ta-list">${taHtml}</div>
      </div>`;
  }).join("");

  const untInfoRows = [
    unt.rohstoffe      ? `<tr><td><strong>Rohstoffe:</strong></td><td>${unt.rohstoffe}</td></tr>` : "",
    unt.fremdbauteile  ? `<tr><td><strong>Fremdbauteile:</strong></td><td>${unt.fremdbauteile}</td></tr>` : "",
    unt.hilfsstoffe    ? `<tr><td><strong>Hilfsstoffe:</strong></td><td>${unt.hilfsstoffe}</td></tr>` : "",
    unt.betriebsstoffe ? `<tr><td><strong>Betriebsstoffe:</strong></td><td>${unt.betriebsstoffe}</td></tr>` : "",
  ].filter(Boolean).join("");

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>AP-Übung ${unt.name}</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:Arial,sans-serif; font-size:11pt; color:#1e293b; padding:20mm; line-height:1.5; }

/* Kopfzeile */
.kopf { display:table; width:100%; border:2px solid #000; border-collapse:collapse; margin-bottom:0; }
.kopf-main { display:table-cell; width:70%; border-right:2px solid #000; padding:8px 14px; vertical-align:middle; }
.kopf-main .sub { font-size:9pt; color:#666; margin-bottom:3px; }
.kopf-main .firm { font-size:15pt; font-weight:700; }
.kopf-note { display:table-cell; width:15%; border-right:2px solid #000; padding:8px; text-align:center; vertical-align:bottom; font-size:10pt; color:#555; }
.kopf-pkt  { display:table-cell; width:15%; padding:8px; text-align:center; vertical-align:bottom; font-size:10pt; }
.name-row { border:2px solid #000; border-top:none; padding:10px 14px; margin-bottom:18px; font-size:10.5pt; }
.name-row strong { margin-right:4px; }
.name-row .uline { display:inline-block; min-width:120px; border-bottom:1px solid #333; margin-right:24px; }

/* Unternehmensvorstellung */
.unt-box { border-left:5px solid #1e4d8c; background:#f8fafc; border-top:1px solid #d1d5db;
           border-bottom:1px solid #d1d5db; border-right:1px solid #d1d5db;
           padding:10px 14px; margin-bottom:16px; }
.unt-box .unt-name { font-size:13pt; font-weight:700; color:#1e4d8c; margin-bottom:4px; }
.unt-box .unt-meta { font-size:10pt; color:#444; margin-bottom:6px; }
.unt-box table { font-size:9.5pt; color:#555; border-spacing:0; }
.unt-box table td { padding:1px 8px 1px 0; }

/* Szenario */
.szenario { border:1px solid #000; background:#f3f4f6; padding:10px 14px; margin-bottom:24px; }
.szenario .sz-text { font-size:10pt; font-style:italic; margin-bottom:8px; }
.szenario .fv-title { font-size:10pt; font-weight:700; margin-bottom:6px; }
.szenario ul { padding-left:20px; font-size:9.5pt; }
.szenario ul li { margin-bottom:3px; }

/* Aufgabe */
.aufgabe { margin-bottom:20px; }
.aufg-title { background:#e5e7eb; padding:7px 12px; font-size:13pt; font-weight:700;
              display:flex; justify-content:space-between; margin-bottom:10px; }
.aufg-p { font-weight:400; color:#555; font-size:11pt; }

/* Beleg */
.beleg { border:1px solid #ccc; margin-bottom:14px; font-size:10pt; }
.beleg-head { background:#1e293b; color:#fff; padding:6px 12px; display:flex; justify-content:space-between; }
.beleg-typ  { font-size:11pt; font-weight:700; }
.beleg-meta { font-size:9pt; color:#aaa; padding-top:3px; }
.beleg-addr { display:flex; border-bottom:1px solid #aaa; }
.addr-col   { flex:1; padding:8px 12px; border-right:1px solid #ddd; }
.addr-col:last-child { border-right:none; }
.addr-label { font-size:8pt; color:#888; font-weight:700; text-transform:uppercase; margin-bottom:3px; }
.addr-name  { font-weight:700; font-size:10.5pt; }
.addr-sub   { font-size:9pt; color:#555; }
.pos-table  { width:100%; border-collapse:collapse; font-size:9.5pt; border-bottom:1px solid #aaa; }
.pos-table th { background:#f8fafc; font-weight:700; color:#555; padding:4px 10px; text-align:left; border-bottom:1px solid #aaa; }
.pos-table td { padding:4px 10px; }
.pos-table .pos-ep,.pos-table .pos-ges,.pos-table th:nth-child(3),.pos-table th:nth-child(4) { text-align:right; }
.sum-table  { width:100%; border-collapse:collapse; font-size:10pt; margin-left:auto; max-width:45%; }
.sum-table td { padding:3px 10px; }
.sum-table .r { text-align:right; }
.sum-table tr.sum-final { border-top:2px solid #000; }
.zk { background:#f8fafc; border-top:1px solid #ddd; padding:6px 12px; font-size:9pt; color:#555; font-style:italic; }

/* Teilaufgaben */
.ta-list { padding:4px 0; }
.ta { display:flex; gap:10px; padding:5px 0; border-bottom:1px solid #f1f5f9; font-size:10.5pt; }
.ta:last-child { border-bottom:none; }
.ta-nr { font-weight:700; min-width:44px; }
.ta-p  { color:#64748b; min-width:32px; font-size:9pt; padding-top:2px; }
.ta-text { flex:1; }

@media print {
  body { padding:15mm; }
  .aufgabe[style] { page-break-before:always; }
}
</style>
</head><body>

<div class="kopf">
  <div class="kopf-main">
    <div class="sub">Abschlussprüfungs-Übung &nbsp;·&nbsp; BwR Klasse 10</div>
    <div class="firm">${unt.name}</div>
  </div>
  <div class="kopf-note">_______ Note</div>
  <div class="kopf-pkt">______ / ${gesamtP}&thinsp;P</div>
</div>
<div class="name-row">
  <strong>Name:</strong><span class="uline">&nbsp;</span>
  <strong>Datum:</strong><span class="uline">${today}&nbsp;</span>
  <strong>Klasse:</strong><span class="uline">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
</div>

<div class="unt-box">
  <div class="unt-name">${unt.name} &nbsp;<span style="font-weight:400;font-size:10pt;color:#555">&nbsp;${unt.anschrift}</span></div>
  <div class="unt-meta">Inhaber: <strong>${unt.inhaber}</strong> &nbsp;·&nbsp; Branche: <strong>${unt.branche}</strong> &nbsp;·&nbsp; GJ: <strong>${unt.gj}</strong></div>
  ${untInfoRows ? `<table>${untInfoRows}</table>` : ""}
</div>

<div class="szenario">
  <div class="sz-text">Als Mitarbeiter/in im Unternehmen ${unt.name} bearbeiten Sie betriebswirtschaftliche Aufgaben.</div>
  <div class="fv-title">Formale Vorgaben:</div>
  <ul>
    <li>Bei Buchungsstäzen sind stets Kontonummern, Kontennamen (abgekürzt möglich) und Beträge anzugeben.</li>
    <li>Bei Berechnungen sind jeweils alle notwendigen Lösungsschritte und Nebenrechnungen darzustellen.</li>
    <li>Alle Ergebnisse sind in der Regel auf zwei Nachkommastellen gerundet anzugeben.</li>
    <li>Soweit nicht anders vermerkt, gilt ein Umsatzsteuersatz von 19 %.</li>
  </ul>
</div>

${aufgabenHtml}
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Bitte Popup-Blocker deaktivieren."); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
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
          <button onClick={() => setH5pOffen(true)} title="Live im Unterricht teilen"
            style={{ background:"rgba(232,96,10,0.15)", border:"1px solid rgba(232,96,10,0.35)",
              color:"#e8600a", borderRadius:7, padding:"6px 11px",
              cursor:"pointer", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
            <Monitor size={13} /> Live teilen
          </button>
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
                  onClick={() => { setWahlteil(w.key); setAktiveTab(w.key); setLoesungOffen({}); setAlleAuf(false); }}
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
