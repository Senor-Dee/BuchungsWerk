// ══════════════════════════════════════════════════════════════════════════════
// Export-Funktionen – Pure HTML/DOCX-Generatoren (kein React-State)
// Extrahiert aus BuchungsWerk.jsx – Phase A3 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import { getKonto } from "../data/kontenplan.js";
import { anrede, berechnePunkte, fmt } from "../utils.js";

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT — HTML-Generator + Modal
// ══════════════════════════════════════════════════════════════════════════════

// Hilfsfunktion: Buchungssatz-Zeilen als HTML-String (für Export)
export function exportBuchungssatzHTML(soll, haben) {
  if (!soll?.length && !haben?.length) return "";
  const rows = Math.max(soll?.length || 0, haben?.length || 0);
  const anRow = (soll?.length || 1) - 1;
  let html = `<table class="bs-table"><tbody>`;
  for (let i = 0; i < rows; i++) {
    const s = soll?.[i];
    const hIdx = i - anRow;
    const h = hIdx >= 0 ? haben?.[hIdx] : null;
    const showAn = i === anRow;
    const sk = s ? getKonto(s.nr) : null;
    const hk = h ? getKonto(h.nr) : null;
    html += `<tr>
      <td class="bs-nr soll">${s ? s.nr : ""}</td>
      <td class="bs-kz soll">${s ? (sk?.kuerzel ?? s.nr) : ""}</td>
      <td class="bs-haken">${s ? "✓" : ""}</td>
      <td class="bs-bet soll">${s ? (typeof s.betrag === "number" ? s.betrag : parseFloat(s.betrag) || 0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €" : ""}</td>
      <td class="bs-an">${showAn ? "an" : ""}</td>
      <td class="bs-nr haben">${h ? h.nr : ""}</td>
      <td class="bs-kz haben">${h ? (hk?.kuerzel ?? h.nr) : ""}</td>
      <td class="bs-haken">${h ? "✓" : ""}</td>
      <td class="bs-bet haben">${h ? (typeof h.betrag === "number" ? h.betrag : parseFloat(h.betrag) || 0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €" : ""}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

// Nebenrechnungs-Block als HTML
export function exportNrHTML(nebenrechnungen) {
  if (!nebenrechnungen?.length) return "";
  let html = `<div class="nr-block"><div class="nr-label">Nebenrechnung</div>`;
  nebenrechnungen.forEach(nr => {
    html += `<div class="nr-row">`;
    if (nr.label) html += `<span class="nr-lbl">${nr.label}:</span> `;
    html += `<span class="nr-wert">${(typeof nr.wert === "number" ? nr.wert : parseFloat(nr.wert) || 0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} ${nr.einheit || "€"}</span>`;
    if (nr.hinweis) html += ` <span class="nr-hint">(${nr.hinweis})</span>`;
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

// Komplex-Kette: Schritte als Aufgaben
export function exportKomplexHTML(aufgabe, mitLoesung) {
  if (!aufgabe.schritte?.length) return "";
  let html = "";
  const labels = "abcdefghij";
  aufgabe.schritte.forEach((st, si) => {
    html += `<div class="schritt-block">
      <div class="schritt-header"><span class="schritt-label">${labels[si]})</span> ${st._aufgabeEdit || st.aufgabe || ""} <span class="punkte-badge">${st.punkte} P</span></div>`;
    if (mitLoesung && st.soll?.length) {
      html += `<div class="loesung-block">` + exportBuchungssatzHTML(st.soll, st.haben) + `</div>`;
      if (st.nebenrechnungen?.length) html += exportNrHTML(st.nebenrechnungen);
      if (st.erklaerung) html += `<div class="erkl">💡 ${st.erklaerung}</div>`;
    }
    html += `</div>`;
  });
  return html;
}

// Lucide-Icon-Namen → Emoji (für HTML/DOCX-Export, da Lucide nur in React rendert)
const ICON_EMOJI = { Sun: "☀️", Trees: "🌲", Scissors: "✂️", Dumbbell: "🏋️" };
export const firmaIconEmoji = icon => ICON_EMOJI[icon] || icon || "🏢";

// Firmen-Vorspann-HTML
export function exportFirmaHTML(config, firma) {
  const introSie = `Als Mitarbeiter/in im Unternehmen ${firma.name}, ${firma.ort || ""}, bearbeiten Sie verschiedene betriebswirtschaftliche Aufgaben.`;
  const intro = anrede(config.klasse, introSie);
  const wtLabels = [
    ["Rohstoffe", firma.rohstoffe],
    ["Hilfsstoffe", firma.hilfsstoffe],
    ["Fremdbauteile", firma.fremdbauteile],
    ["Betriebsstoffe", firma.betriebsstoffe],
  ].filter(([, list]) => list?.length);
  return `<div class="firma-block">
    <div class="firma-name">${firmaIconEmoji(firma.icon)} ${firma.name} · ${firma.plz || ""} ${firma.ort || ""}</div>
    <div class="firma-info">${firma.slogan || ""} ${intro}</div>
    <div class="firma-details">
      <span><strong>Rechtsform:</strong> ${firma.rechtsform || ""}</span>
      <span><strong>Inhaber/in:</strong> ${firma.inhaber || ""}</span>
      <span><strong>Branche:</strong> ${firma.branche || ""}</span>
    </div>
    ${wtLabels.map(([l, list]) => `<div class="firma-wt"><strong>${l}:</strong> ${list.join(", ")}</div>`).join("")}
    <div class="formvorgaben">📐 <strong>Formale Vorgaben:</strong> Bei Buchungssätzen sind Kontonummer, Kontobezeichnung und Betrag anzugeben. Ergebnisse auf zwei Nachkommastellen runden. USt-Satz 19 % sofern nicht anders angegeben.</div>
  </div>`;
}

// Haupt-Generator: erzeugt komplettes HTML-Dokument für Druck / Word

// ── Kopfzeile HTML für PDF-Export ─────────────────────────────────────────────
export function buildKopfzeilenHTML(k, gesamtP, klasse) {
  if (!k) return "";
  const datumStr = k.datum ? new Date(k.datum + "T00:00:00").toLocaleDateString("de-DE", {day:"2-digit",month:"2-digit",year:"numeric"}) : "";
  const pruefArt = k.pruefungsart || "";
  const schulName = k.schulName || "";
  return `<div style="border:1.5px solid #333;margin-bottom:18px;font-family:Arial,sans-serif;font-size:11px">
    <div style="display:flex;align-items:stretch;border-bottom:2px solid #333">
      <div style="flex:1;padding:10px 14px;border-right:1.5px solid #333">
        ${schulName ? `<div style="font-size:10px;color:#666;margin-bottom:4px">${schulName}</div>` : ""}
        <div style="font-size:15px;font-weight:900">${pruefArt}</div>
      </div>
      <div style="width:110px;display:flex;flex-direction:column;text-align:center">
        <div style="flex:1;border-bottom:1.5px solid #333;padding:10px 8px">
          <div style="font-size:28px;font-weight:900;line-height:1">&nbsp;</div>
          <div style="font-size:10px;color:#555;margin-top:4px">Note</div>
        </div>
        <div style="flex:1;padding:8px">
          <div style="font-size:26px;font-weight:900;line-height:1">${gesamtP}</div>
          <div style="font-size:10px;color:#555;margin-top:2px">Punkte gesamt</div>
          <div style="font-size:10px;margin-top:4px">Erreicht: _____ P</div>
        </div>
      </div>
    </div>
    <div style="padding:8px 14px;border-bottom:1.5px solid #ccc;font-size:12px">
      <strong>Name:</strong> <span style="display:inline-block;border-bottom:1px solid #333;min-width:200px">&nbsp;</span>
      &nbsp;&nbsp;&nbsp;<strong>Datum:</strong> ${datumStr || '<span style="display:inline-block;border-bottom:1px solid #333;min-width:100px">&nbsp;</span>'}
      &nbsp;&nbsp;&nbsp;<strong>Klasse:</strong> ${k.klasse || ""}
    </div>
    ${k.zeigeUnterschrift !== false ? `<div style="background:#f3f4f6;padding:6px 14px;border-bottom:1.5px solid #ccc;font-size:10px;font-weight:700">
      Ich/Wir habe/n von diesem Leistungsnachweis beziehungsweise von der Note Kenntnis genommen.
    </div>
    <div style="padding:12px 14px;min-height:38px;font-size:11px">
      Datum &nbsp;<span style="display:inline-block;border-bottom:1px solid #333;min-width:120px">&nbsp;</span>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Unterschrift &nbsp;<span style="display:inline-block;border-bottom:1px solid #333;min-width:200px">&nbsp;</span>
    </div>` : ""}
  </div>`;
}

export function generateExportHTML({ aufgaben, config, firma, modus, kiHistorie, kopfzeile = null, format = "pdf" }) {
  // modus: "aufgaben" | "loesungen" | "beides" | "ki"
  const mitAufgabe  = modus !== "loesungen";
  const mitLoesung  = modus !== "aufgaben";
  const datum = new Date(config.datum + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  const titel = config.typ + (config.pruefungsart ? ` · ${config.pruefungsart}` : "");
  const gesamtP = aufgaben.reduce((s, a) => s + berechnePunkte(a), 0);

  // CSS für PDF: volle BuchungsWerk-Farben
  const CSS_PDF = `
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #0f172a; padding: 24px 32px; max-width: 800px; margin: 0 auto; }
    .bw-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #0f172a; margin-bottom: 18px; }
    .bw-logo { font-size: 20px; font-weight: 900; color: #0f172a; }
    .bw-logo span { color: #d97706; }
    .bw-meta { text-align: right; font-size: 10px; color: #64748b; line-height: 1.6; }
    .bw-meta strong { color: #0f172a; }
    .print-btn { display:inline-block; margin-bottom:16px; padding:8px 18px; background:#0f172a; color:#e8600a; border:none; border-radius:6px; font-weight:700; font-size:13px; cursor:pointer; }
    .doc-titel { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .doc-sub { font-size: 11px; color: #475569; margin-bottom: 14px; display: flex; gap: 12px; flex-wrap: wrap; }
    .doc-sub span { background: #f1f5f9; padding: 2px 7px; border-radius: 8px; }
    .firma-block { border: 1px solid #e2e8f0; border-left: 4px solid #d97706; background: #fffbeb; border-radius: 6px; padding: 9px 13px; margin-bottom: 18px; font-size: 11px; }
    .firma-name { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
    .firma-info { color: #374151; margin-bottom: 5px; }
    .firma-details { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 3px; }
    .firma-wt { color: #374151; margin-bottom: 2px; }
    .formvorgaben { margin-top: 5px; font-size: 10px; color: #475569; }
    .aufgabe-card { border: 1px solid #e2e8f0; border-radius: 7px; margin-bottom: 14px; page-break-inside: avoid; }
    .aufgabe-header { background: #f8fafc; padding: 8px 13px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e2e8f0; border-radius: 7px 7px 0 0; }
    .aufg-nr { width: 22px; height: 22px; background: #0f172a; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .aufg-titel { font-weight: 700; font-size: 12px; flex: 1; }
    .punkte-badge { background: #0f172a; color: #e8600a; border-radius: 20px; padding: 2px 9px; font-size: 10px; font-weight: 800; white-space: nowrap; }
    .aufgabe-body { padding: 10px 14px; }
    .aufgabe-text { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 9px; }
    .leerzeile { border: 1px solid #cbd5e1; height: 36px; margin-bottom: 8px; background: #f8fafc; }
    .loesung-block { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 7px; padding: 9px 11px; margin-top: 7px; }
    .loesung-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #16a34a; margin-bottom: 5px; }
    .bs-table { font-family: 'Courier New', monospace; font-size: 12px; border-collapse: collapse; width: 100%; }
    .bs-table td { padding: 2px 4px; vertical-align: baseline; white-space: nowrap; }
    .bs-nr { font-weight: 700; min-width: 42px; }
    .bs-kz { font-weight: 700; min-width: 58px; }
    .bs-haken { color: #16a34a; font-weight: 900; width: 16px; text-align: center; }
    .bs-bet { min-width: 88px; text-align: right; padding-right: 5px; }
    .bs-an { font-weight: 700; color: #64748b; width: 30px; text-align: center; }
    .soll { color: #1d4ed8; }
    .haben { color: #dc2626; }
    .nr-block { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 5px; padding: 7px 11px; margin-top: 7px; font-size: 11px; }
    .nr-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #92400e; margin-bottom: 3px; }
    .nr-row { margin-bottom: 2px; }
    .nr-lbl { font-weight: 600; color: #374151; }
    .nr-wert { font-family: monospace; font-weight: 700; }
    .nr-hint { color: #64748b; font-size: 10px; }
    .erkl { margin-top: 7px; padding: 5px 9px; background: #fffbeb; border-left: 3px solid #e8600a; font-size: 10px; color: #92400e; }
    .schritt-block { margin-bottom: 9px; padding: 7px 9px; border: 1px solid #e2e8f0; border-radius: 5px; }
    .schritt-header { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; }
    .schritt-label { color: #0f172a; font-weight: 800; }
    .seitenumbruch { page-break-before: always; padding-top: 18px; }
    .loesung-header { font-size: 14px; font-weight: 800; color: #16a34a; margin: 0 0 12px; padding-bottom: 7px; border-bottom: 2px solid #16a34a; }
    .ki-aufgabe-header { background: #faf5ff; border-bottom: 1px solid #e9d5ff; }
    .ki-aufg-titel { font-weight: 700; color: #6d28d9; font-size: 12px; }
    @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
    @media print {
      .print-btn { display: none !important; }
      .no-print { display: none !important; }
      body { padding: 0; margin: 0; max-width: 100%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .aufgabe-card { page-break-inside: avoid; break-inside: avoid; }
      .seitenumbruch { page-break-before: always; break-before: always; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  `;

  // CSS für Word: sauber, druckoptimiert, kein Dunkel, keine Boxschatten
  const CSS_WORD = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; padding: 1.5cm 2cm; max-width: 21cm; }
    .bw-header { border-bottom: 1.5pt solid #000; margin-bottom: 10pt; padding-bottom: 5pt; }
    .bw-logo { font-size: 13pt; font-weight: bold; }
    .bw-logo span { color: #b45309; }
    .bw-meta { font-size: 8pt; color: #555; margin-top: 2pt; }
    .doc-titel { font-size: 13pt; font-weight: bold; margin: 8pt 0 3pt; }
    .doc-sub { font-size: 8pt; color: #555; margin-bottom: 10pt; }
    .doc-sub span::after { content: " · "; }
    .doc-sub span:last-child::after { content: ""; }
    .firma-block { border: 0.75pt solid #bbb; border-left: 3pt solid #b45309; padding: 6pt 9pt; margin-bottom: 12pt; font-size: 8.5pt; }
    .firma-name { font-size: 10pt; font-weight: bold; margin-bottom: 2pt; }
    .firma-info { margin-bottom: 3pt; }
    .firma-details span { margin-right: 12pt; }
    .firma-wt { margin-bottom: 2pt; }
    .formvorgaben { margin-top: 4pt; font-size: 7.5pt; color: #555; }
    .aufgabe-card { border: 0.75pt solid #bbb; margin-bottom: 10pt; page-break-inside: avoid; }
    .aufgabe-header { border-bottom: 0.75pt solid #bbb; padding: 4pt 8pt; display: flex; align-items: center; gap: 6pt; }
    .aufg-nr { font-weight: bold; font-size: 10pt; min-width: 16pt; }
    .aufg-titel { font-weight: bold; font-size: 9.5pt; flex: 1; }
    .punkte-badge { font-size: 8pt; border: 0.75pt solid #999; padding: 1pt 5pt; }
    .aufgabe-body { padding: 6pt 9pt; }
    .aufgabe-text { font-size: 9.5pt; font-weight: bold; margin-bottom: 6pt; }
    .leerzeile { border-bottom: 0.75pt solid #bbb; height: 18pt; margin-bottom: 5pt; }
    .loesung-block { border: 0.75pt solid #bbb; border-left: 2pt solid #16a34a; padding: 5pt 8pt; margin-top: 5pt; }
    .loesung-label { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #16a34a; margin-bottom: 3pt; }
    .bs-table { font-family: 'Courier New', monospace; font-size: 9pt; border-collapse: collapse; width: 100%; }
    .bs-table td { padding: 1.5pt 3pt; vertical-align: baseline; }
    .bs-nr { font-weight: bold; min-width: 32pt; }
    .bs-kz { font-weight: bold; min-width: 44pt; }
    .bs-haken { color: #16a34a; font-weight: bold; width: 12pt; text-align: center; }
    .bs-bet { min-width: 68pt; text-align: right; padding-right: 4pt; }
    .bs-an { font-weight: bold; color: #666; width: 20pt; text-align: center; }
    .soll { color: #1a56db; }
    .haben { color: #c81e1e; }
    .nr-block { border: 0.75pt solid #ccc; border-left: 2pt solid #b45309; padding: 4pt 7pt; margin-top: 5pt; font-size: 8.5pt; }
    .nr-label { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #b45309; margin-bottom: 2pt; }
    .nr-row { margin-bottom: 2pt; }
    .nr-lbl { font-weight: bold; }
    .nr-wert { font-family: monospace; font-weight: bold; }
    .nr-hint { color: #666; font-size: 7.5pt; }
    .erkl { margin-top: 5pt; padding: 4pt 7pt; border-left: 1.5pt solid #b45309; font-size: 7.5pt; color: #555; }
    .schritt-block { margin-bottom: 6pt; padding: 5pt 7pt; border: 0.5pt solid #ccc; }
    .schritt-header { font-size: 9pt; font-weight: bold; margin-bottom: 3pt; }
    .schritt-label { font-weight: bold; }
    .seitenumbruch { page-break-before: always; padding-top: 14pt; }
    .loesung-header { font-size: 12pt; font-weight: bold; color: #16a34a; margin: 0 0 10pt; padding-bottom: 4pt; border-bottom: 1pt solid #16a34a; }
    .ki-aufg-titel { font-weight: bold; font-size: 9.5pt; }
    .print-btn { display: none; }
    @media print { body { padding: 0; } }
  `;

  // CSS: MSA-Format für Kl. 10 PDF, sonst Word-Style (clean/druckfertig)

  // ── Aufgaben-Blöcke aufbauen ──────────────────────────────────────────────
  let aufgabenHTML = "";
  let aufgNr = 0;
  aufgaben.forEach(a => {
    aufgNr++;
    const punkte = berechnePunkte(a);
    const isKomplex = a.taskTyp === "komplex";
    const isRechnung = a.taskTyp === "rechnung";
    const aufgabeText = anrede(config.klasse, (a._aufgabeEdit ?? a.aufgabe) || "");

    aufgabenHTML += `<div class="aufgabe-card">
      <div class="aufgabe-header">
        <div class="aufg-nr">${aufgNr}</div>
        <div class="aufg-titel">${a.titel || ""}</div>
        <div class="punkte-badge">${punkte} P</div>
      </div>
      <div class="aufgabe-body">`;

    if (mitAufgabe) {
      aufgabenHTML += `<div class="aufgabe-text">${aufgabeText}</div>`;
      if (!mitLoesung) {
        // Leerfelder für Schüler
        aufgabenHTML += `<div class="leerzeile"></div>`;
        if (isKomplex) aufgabenHTML += `<div class="leerzeile"></div><div class="leerzeile"></div>`;
      }
    }

    if (isKomplex) {
      aufgabenHTML += exportKomplexHTML(a, mitLoesung);
    } else {
      if (mitLoesung) {
        aufgabenHTML += `<div class="loesung-block">`;
        aufgabenHTML += `<div class="loesung-label">✔ Musterlösung</div>`;
        if (a.nebenrechnungen?.length) aufgabenHTML += exportNrHTML(a.nebenrechnungen);
        if (isRechnung && a.schema?.length) {
          aufgabenHTML += `<table class="bs-table"><tbody>`;
          a.schema.forEach(row => {
            aufgabenHTML += `<tr><td style="color:#374151;padding:2px 8px">${row.label || ""}</td><td style="text-align:right;font-family:monospace;padding:2px 8px">${typeof row.wert === "number" ? row.wert.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) : (row.wert||"")} ${row.einheit||"€"}</td></tr>`;
          });
          aufgabenHTML += `</tbody></table>`;
        }
        if (a.soll?.length) aufgabenHTML += exportBuchungssatzHTML(a.soll, a.haben);
        if (a.erklaerung) aufgabenHTML += `<div class="erkl">💡 ${a.erklaerung}</div>`;
        aufgabenHTML += `</div>`; // .loesung-block
      }
    }

    aufgabenHTML += `</div></div>`; // .aufgabe-body + .aufgabe-card
  });

  // ── KI-Aufgaben ──────────────────────────────────────────────────────────
  let kiHTML = "";
  if (modus === "ki" && kiHistorie?.length) {
    kiHistorie.forEach((eintrag, idx) => {
      const result = eintrag.result;
      if (!result) return;
      kiHTML += `<div class="aufgabe-card">
        <div class="ki-aufgabe-header aufgabe-header">
          <div class="aufg-nr" style="background:#6d28d9">${idx+1}</div>
          <div class="ki-aufg-titel aufg-titel">KI-Aufgabe ${idx+1} · ${result.punkte_gesamt || "?"} Punkte</div>
        </div>
        <div class="aufgabe-body">
          <div class="aufgabe-text">${result.aufgabe || ""}</div>`;
      if (result.nebenrechnung) {
        kiHTML += `<div class="nr-block"><div class="nr-label">Nebenrechnung</div><div class="nr-row" style="white-space:pre-wrap;font-family:monospace">${result.nebenrechnung}</div></div>`;
      }
      if (mitLoesung && result.buchungssatz?.length) {
        kiHTML += `<div class="loesung-block"><div class="loesung-label">✔ Buchungssatz</div>`;
        kiHTML += `<table class="bs-table"><tbody>`;
        result.buchungssatz.forEach(bs => {
          const sk = getKonto(bs.soll_nr);
          const hk = getKonto(bs.haben_nr);
          kiHTML += `<tr>
            <td class="bs-nr soll">${bs.soll_nr}</td>
            <td class="bs-kz soll">${sk?.kuerzel || bs.soll_nr}</td>
            <td class="bs-haken">✓</td>
            <td class="bs-bet soll">${typeof bs.betrag==="number" ? bs.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : bs.betrag} €</td>
            <td class="bs-an">an</td>
            <td class="bs-nr haben">${bs.haben_nr}</td>
            <td class="bs-kz haben">${hk?.kuerzel || bs.haben_nr}</td>
            <td class="bs-haken">✓</td>
            <td class="bs-bet haben">${typeof bs.betrag==="number" ? bs.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : bs.betrag} €</td>
          </tr>`;
        });
        kiHTML += `</tbody></table>`;
        if (result.erklaerung) kiHTML += `<div class="erkl">💡 ${result.erklaerung}</div>`;
        kiHTML += `</div>`;
      }
      kiHTML += `</div></div>`;
    });
  }

  // ── Für "beides": Lösungen auf gesonderter Seite ─────────────────────────
  let loesungsseiteHTML = "";
  if (modus === "beides") {
    loesungsseiteHTML = `<div class="seitenumbruch"><div class="loesung-header">✔ Musterlösung</div>`;
    let lNr = 0;
    aufgaben.forEach(a => {
      lNr++;
      const isKomplex = a.taskTyp === "komplex";
      const isRechnung = a.taskTyp === "rechnung";
      loesungsseiteHTML += `<div class="aufgabe-card">
        <div class="aufgabe-header">
          <div class="aufg-nr">${lNr}</div>
          <div class="aufg-titel">${a.titel || ""}</div>
          <div class="punkte-badge">${berechnePunkte(a)} P</div>
        </div>
        <div class="aufgabe-body loesung-block">`;
      if (isKomplex) {
        loesungsseiteHTML += exportKomplexHTML(a, true);
      } else {
        if (a.nebenrechnungen?.length) loesungsseiteHTML += exportNrHTML(a.nebenrechnungen);
        if (isRechnung && a.schema?.length) {
          loesungsseiteHTML += `<table class="bs-table"><tbody>`;
          a.schema.forEach(row => { loesungsseiteHTML += `<tr><td style="color:#374151;padding:2px 8px">${row.label||""}</td><td style="text-align:right;font-family:monospace;padding:2px 8px">${typeof row.wert==="number" ? row.wert.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) : (row.wert||"")} ${row.einheit||"€"}</td></tr>`; });
          loesungsseiteHTML += `</tbody></table>`;
        }
        if (a.soll?.length) loesungsseiteHTML += exportBuchungssatzHTML(a.soll, a.haben);
        if (a.erklaerung) loesungsseiteHTML += `<div class="erkl">💡 ${a.erklaerung}</div>`;
      }
      loesungsseiteHTML += `</div></div>`;
    });
    loesungsseiteHTML += `</div>`;
  }

  // ── MSA-Format für Klasse 10 ─────────────────────────────────────────────
  const isMSA = config.klasse >= 10 && format === "pdf";
  const CSS_MSA = `
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }
    /* Grauer Balken oben – wie MSA */
    .msa-topbar { background: #595959; color: #fff; padding: 10px 28px 10px 28px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
    .msa-topbar-left { font-size: 10pt; font-weight: 700; line-height: 1.5; }
    .msa-topbar-right { font-size: 10pt; font-weight: 700; text-align: right; line-height: 1.5; }
    .msa-subbar { background: #e8e8e8; padding: 6px 28px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #595959; margin-bottom: 20px; }
    .msa-subbar-typ { font-size: 11pt; font-weight: 700; color: #000; }
    .msa-subbar-punkte { font-size: 10pt; color: #333; }
    .msa-page { padding: 0 28px 28px 28px; max-width: 800px; margin: 0 auto; }
    /* Seitenkopf auf Folgeseiten */
    .msa-pageheader { font-size: 9pt; color: #333; border-bottom: 1px solid #999; padding-bottom: 4px; margin-bottom: 14px; display: flex; justify-content: space-between; }
    .print-btn { display:inline-block; margin: 12px 0; padding:8px 18px; background:#595959; color:#fff; border:none; border-radius:4px; font-weight:700; font-size:12pt; cursor:pointer; }
    /* Firmenblock */
    .msa-firma { border: 1.5px solid #999; margin-bottom: 16px; }
    .msa-firma-header { background: #e8e8e8; padding: 7px 12px; font-weight: 700; font-size: 11pt; border-bottom: 1px solid #999; }
    .msa-firma-body { display: grid; grid-template-columns: 180px 1fr 180px 1fr; gap: 0; font-size: 10pt; }
    .msa-firma-label { padding: 5px 10px 5px 12px; font-weight: 700; color: #333; border-bottom: 1px solid #e8e8e8; }
    .msa-firma-value { padding: 5px 10px; border-bottom: 1px solid #e8e8e8; }
    .msa-firma-wt { padding: 5px 12px; font-size: 10pt; border-top: 1px solid #ccc; }
    .msa-firma-wt strong { font-weight: 700; }
    .msa-vorgaben { font-size: 10pt; margin-bottom: 16px; border: 1px solid #ccc; padding: 8px 12px; background: #fafafa; }
    .msa-vorgaben-title { font-weight: 700; margin-bottom: 5px; }
    .msa-vorgaben ul { margin: 0; padding-left: 18px; }
    .msa-vorgaben li { margin-bottom: 3px; line-height: 1.5; }
    /* Aufgaben */
    .msa-aufgabe { margin-bottom: 18px; page-break-inside: avoid; break-inside: avoid; }
    .msa-aufgabe-header { background: #e8e8e8; border: 1.5px solid #595959; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .msa-aufgabe-nr { font-size: 12pt; font-weight: 700; color: #000; }
    .msa-aufgabe-titel { font-size: 10pt; color: #333; flex: 1; margin: 0 14px; }
    .msa-punkte { font-size: 10pt; font-weight: 700; color: #000; white-space: nowrap; }
    .msa-aufgabe-body { padding: 4px 0 0 14px; font-size: 11pt; line-height: 1.6; }
    .msa-teilaufgabe { margin-bottom: 10px; }
    .msa-ta-nr { font-weight: 700; color: #000; display: inline; }
    .msa-ta-text { display: inline; }
    .msa-ta-punkte { float: right; font-size: 10pt; color: #555; font-style: italic; }
    /* Buchungssatz */
    .msa-bs { font-family: 'Courier New', monospace; font-size: 10pt; margin: 6px 0 8px 0; }
    .msa-bs .soll { color: #1d4ed8; font-weight: 700; }
    .msa-bs .haben { color: #dc2626; font-weight: 700; }
    .msa-loesung { background: #f0f0f0; border-left: 3px solid #595959; padding: 8px 12px; margin-top: 6px; font-size: 10pt; }
    .msa-loesung-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #595959; margin-bottom: 4px; }
    .msa-nr-block { background: #fff8dc; border: 1px solid #d4a; padding: 6px 10px; margin: 5px 0; font-size: 10pt; }
    .msa-erkl { margin-top: 6px; padding: 4px 10px; border-left: 2px solid #d97706; font-size: 9pt; color: #555; font-style: italic; }
    .seitenumbruch { page-break-before: always; break-before: always; }
    /* Leerfelder */
    .msa-leer { border-bottom: 1px solid #999; min-height: 28px; margin: 4px 0 10px; }
    .msa-leer-label { font-size: 9pt; color: #666; margin-bottom: 2px; }
    @page { size: A4; margin: 12mm 18mm 15mm 18mm; }
    @media print {
      .print-btn { display: none !important; }
      body { padding: 0; margin: 0; }
      .msa-aufgabe { page-break-inside: avoid; break-inside: avoid; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  `;

  // ── Kopfzeile für Aufgabenblatt ─────────────────────────────────────────
  const isLoesung = modus === "loesungen";
  const headerTitel = isLoesung ? `Musterlösung – ${titel}` : titel;
  const headerFarbe = isLoesung ? "#16a34a" : "#0f172a";
  const CSS = isMSA ? CSS_MSA : CSS_WORD;

  // ── MSA Body ─────────────────────────────────────────────────────────────
  const buildMSABody = () => {
    const year = new Date(config.datum + "T00:00:00").getFullYear();
    const typLabel = config.pruefungsart || config.typ || "Übung";
    const isLoesungMSA = modus === "loesungen";

    // Firmenblock
    const wtRows = [
      ["Rohstoffe", firma.rohstoffe],
      ["Fremdbauteile", firma.fremdbauteile],
      ["Hilfsstoffe", firma.hilfsstoffe],
      ["Betriebsstoffe", firma.betriebsstoffe],
    ].filter(([,list]) => list?.length);

    const firmaHTML = `
      <div class="msa-firma">
        <div class="msa-firma-header">Informationen zum Unternehmen: ${firma.name}</div>
        <div class="msa-firma-body">
          <div class="msa-firma-label">Inhaberin/Inhaber:</div>
          <div class="msa-firma-value">${firma.inhaber || ""}</div>
          <div class="msa-firma-label">Rechtsform:</div>
          <div class="msa-firma-value">${firma.rechtsform || ""}</div>
          <div class="msa-firma-label">Anschrift:</div>
          <div class="msa-firma-value">${firma.strasse || ""}, ${firma.plz || ""} ${firma.ort || ""}</div>
          <div class="msa-firma-label">Branche:</div>
          <div class="msa-firma-value">${firma.branche || ""}</div>
          <div class="msa-firma-label">Geschäftsjahr:</div>
          <div class="msa-firma-value">1. Januar bis 31. Dezember ${year}</div>
          <div class="msa-firma-label">Unternehmens&shy;philosophie:</div>
          <div class="msa-firma-value">${firma.slogan || ""}</div>
        </div>
        ${wtRows.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #ccc;">
          ${wtRows.map(([label, list]) => `
            <div class="msa-firma-wt"><strong>${label}:</strong> ${list.slice(0,3).join(", ")} …</div>
          `).join("")}
        </div>` : ""}
      </div>`;

    const vorgabenHTML = `
      <div class="msa-vorgaben">
        <div class="msa-vorgaben-title">Formale Vorgaben:</div>
        <ul>
          <li>Bei Buchungssätzen sind stets Kontennummern, Kontennamen (abgekürzt möglich) und Beträge anzugeben.</li>
          <li>Bei Berechnungen sind jeweils alle notwendigen Lösungsschritte und Nebenrechnungen darzustellen.</li>
          <li>Alle Ergebnisse sind auf zwei Nachkommastellen gerundet anzugeben.</li>
          <li>Soweit nicht anders vermerkt, gilt ein Umsatzsteuersatz von 19 %.</li>
        </ul>
      </div>`;

    let aufgabenMSA = "";
    aufgaben.forEach((a, i) => {
      const pts = berechnePunkte(a);
      const aufgNr = i + 1;
      const aufgText = mitAufgabe ? ((a._aufgabeEdit ?? a.aufgabe) || "") : "";

      // Buchungssatz HTML
      const bsHTML = (soll, haben) => {
        if (!soll?.length && !haben?.length) return "";
        let rows = [];
        const maxLen = Math.max(soll?.length || 0, haben?.length || 0);
        soll?.forEach((s, i) => {
          const h = haben?.[i];
          rows.push(`<tr>
            <td class="soll" style="padding:1px 6px;white-space:nowrap">${s.nr} ${s.name.split("(")[1]?.replace(")","") || s.name.slice(0,6)}</td>
            <td style="padding:1px 6px;text-align:right;white-space:nowrap">${s.betrag?.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €</td>
            <td style="padding:1px 8px;color:#666">an</td>
            <td class="haben" style="padding:1px 6px;white-space:nowrap">${h ? h.nr + " " + (h.name.split("(")[1]?.replace(")","") || h.name.slice(0,6)) : ""}</td>
            <td style="padding:1px 6px;text-align:right;white-space:nowrap">${h ? h.betrag?.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €" : ""}</td>
          </tr>`);
        });
        if ((haben?.length || 0) > (soll?.length || 0)) {
          haben?.slice(soll?.length || 0).forEach(h => {
            rows.push(`<tr>
              <td></td><td></td><td style="padding:1px 8px;color:#666">an</td>
              <td class="haben" style="padding:1px 6px">${h.nr} ${h.name.split("(")[1]?.replace(")","") || h.name.slice(0,6)}</td>
              <td style="padding:1px 6px;text-align:right">${h.betrag?.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €</td>
            </tr>`);
          });
        }
        return `<table class="msa-bs" style="border-collapse:collapse">${rows.join("")}</table>`;
      };

      const loesungHTML = !mitLoesung ? "" : `
        <div class="msa-loesung">
          <div class="msa-loesung-label">${isLoesungMSA ? "Musterlösung" : "Lösung"}</div>
          ${a.taskTyp === "buchung" ? bsHTML(a.soll, a.haben) : ""}
          ${a.nebenrechnungen?.length ? `<div style="font-size:10pt;margin-top:4px">
            ${a.nebenrechnungen.map(r => `<div>${r.label}: ${r.formel} = ${r.ergebnis}</div>`).join("")}
          </div>` : ""}
          ${a.schema?.length && a.taskTyp === "rechnung" ? `<table style="font-size:10pt;border-collapse:collapse;width:100%">
            ${a.schema.map(r => typeof r.wert === "number" ? `<tr>
              <td style="padding:2px 6px;${r.bold ? "font-weight:700" : ""}">${r.label}</td>
              <td style="padding:2px 6px;text-align:right;font-weight:${r.bold ? "700" : "400"}">${r.wert?.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €</td>
            </tr>` : "").join("")}
          </table>` : ""}
          ${a.erklaerung ? `<div class="msa-erkl">${a.erklaerung}</div>` : ""}
        </div>`;

      const leerfelderHTML = !mitAufgabe ? "" : `
        <div class="msa-leer-label" style="font-size:9pt;color:#666;margin-top:8px">Lösung:</div>
        <div class="msa-leer"></div>
        ${a.nebenrechnungen?.length ? `<div class="msa-leer-label" style="font-size:9pt;color:#666">Nebenrechnung:</div><div class="msa-leer" style="min-height:50px"></div>` : ""}
      `;

      aufgabenMSA += `
        <div class="msa-aufgabe">
          <div class="msa-aufgabe-header">
            <span class="msa-aufgabe-nr">Aufgabe ${aufgNr}</span>
            <span class="msa-aufgabe-titel">${a.titel || ""}</span>
            <span class="msa-punkte">${pts} Punkte</span>
          </div>
          <div class="msa-aufgabe-body">
            ${mitAufgabe ? `<div style="margin-bottom:8px;font-size:11pt">${aufgText}</div>` : ""}
            ${mitAufgabe ? leerfelderHTML : ""}
            ${loesungHTML}
          </div>
        </div>`;
    });

    const gesamtStr = `${gesamtP} Punkte gesamt`;
    return `
      <div class="msa-topbar">
        <div class="msa-topbar-left">
          <div style="font-size:13pt">Betriebswirtschaftslehre/Rechnungswesen</div>
          <div>${isLoesungMSA ? "✔ Musterlösung" : typLabel} · Klasse ${config.klasse}</div>
        </div>
        <div class="msa-topbar-right">
          <div>${firma.name || ""}</div>
          <div>${datum}</div>
        </div>
      </div>
      <div class="msa-subbar">
        <div class="msa-subbar-typ">${isLoesungMSA ? "Musterlösung" : typLabel}</div>
        <div class="msa-subbar-punkte">${gesamtStr}</div>
      </div>
      <div class="msa-page">
        ${firmaHTML}
        ${vorgabenHTML}
        ${aufgabenMSA}
      </div>`;
  };

  const body = isMSA
    ? buildMSABody()
    : modus === "ki"
    ? `<h1 class="doc-titel" style="color:#6d28d9">🤖 KI-Aufgaben · ${kiHistorie?.length || 0} Aufgaben</h1>
       <div class="doc-sub"><span>${datum}</span></div>${kiHTML}`
    : `
      ${kopfzeile ? buildKopfzeilenHTML(kopfzeile, gesamtP, config.klasse) : ""}
      <h1 class="doc-titel" style="color:${headerFarbe}">${headerTitel}</h1>
      <div class="doc-sub">
        <span>📅 ${datum}</span>
        <span>Klasse ${config.klasse}</span>
        ${config.pruefungsart ? `<span>📋 ${config.pruefungsart}</span>` : ""}
        <span>${gesamtP} Punkte</span>
      </div>
      ${exportFirmaHTML(config, firma)}
      ${aufgabenHTML}
      ${loesungsseiteHTML}
    `;

  const printBtn = format === "pdf"
    ? `<button class="print-btn no-print" onclick="window.print()">🖨 Als PDF drucken / speichern</button>`
    : "";
  const autoprint = format === "pdf"
    ? `<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),400);});<\/script>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BuchungsWerk – ${headerTitel}</title>
  <style>${CSS}</style>
  ${autoprint}
</head>
<body>
  ${(isMSA || format === "pdf") ? "" : `<div class="bw-header">
    <div class="bw-logo">Buchungs<span>Werk</span></div>
    <div class="bw-meta">
      <strong>BwR Bayern · Realschule · 2026</strong><br>
      ${firma.name || ""} · ${datum}<br>
      Klasse ${config.klasse} · ${gesamtP} Punkte
    </div>
  </div>`}
  ${printBtn}
  ${body}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BELEG-EXPORT FACTORY – Modulebene (außerhalb ExportModal)
// ══════════════════════════════════════════════════════════════════════════════
export function makeBelegDocx({ Table, TableRow, TableCell, Paragraph, TextRun,
                         WidthType, BorderStyle, AlignmentType, ShadingType }) {

  const PW = 9638; // A4, 2 cm Ränder in DXA

  // ── Rahmen ──────────────────────────────────────────────────────────────────
  const bNo  = { style: BorderStyle.NONE,   size: 0,  color: "FFFFFF" };
  const bTh  = { style: BorderStyle.SINGLE, size: 4,  color: "CCCCCC" };
  const bOut = { style: BorderStyle.SINGLE, size: 20, color: "111111" }; // schwarzer Außenrahmen
  const noB  = { top: bNo, bottom: bNo, left: bNo, right: bNo };
  const allTh = { top: bTh, bottom: bTh, left: bTh, right: bTh };
  const botTh = { top: bNo, bottom: bTh, left: bNo, right: bNo };
  const empty = () => new Paragraph({ spacing: { after: 0 }, children: [] });

  // ── Text-Helfer ──────────────────────────────────────────────────────────────
  const run = (text, o) => new TextRun({
    text: String(text || ""), size: (o&&o.sz)||20, bold: !!(o&&o.b),
    italic: !!(o&&o.i), color: (o&&o.col)||"000000", font: "Arial",
  });
  const para = (runs, o) => new Paragraph({
    spacing: { after: (o&&o.sp)||0 },
    keepNext: !!(o&&o.kn),
    alignment: (o&&o.r) ? AlignmentType.RIGHT : (o&&o.c) ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: Array.isArray(runs) ? runs : [runs],
  });
  const p = (text, o) => para(run(text, o), o);

  // ── Zellen-Helfer ────────────────────────────────────────────────────────────
  // Zellen-Helfer: bg wird aus belegToDocx-Scope per Closure übergeben
  // da cell() im äußeren Scope lebt, braucht bg eine andere Lösung:
  // Wir machen cell() zu einer curried Funktion die bg akzeptiert.
  const makeCell = (bg) => (content, w, o) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: (o&&o.brd) || noB,
    shading: { fill: (o&&o.fill) ? o.fill : "FFFFFF", type: ShadingType.CLEAR },
    columnSpan: (o&&o.span) || undefined,
    margins: { top: (o&&o.mt!=null)?o.mt:80, bottom: (o&&o.mb!=null)?o.mb:80, left: (o&&o.ml)||140, right: (o&&o.mr)||140 },
    children: Array.isArray(content) ? content : [content],
  });
  const row = (cells) => new TableRow({ cantSplit: true, children: cells });
  const makeHrRow = (cell) => (w, col) => row([cell(empty(), w, {
    brd: { top: bNo, bottom: { style: BorderStyle.SINGLE, size: 6, color: col||"CCCCCC" }, left: bNo, right: bNo },
    mt: 0, mb: 0,
  })]);

  // Gesamttabelle – in 1-Zellen-Wrapper für garantierten Außenrahmen
  const bOut2 = { style: BorderStyle.SINGLE, size: 8, color: "000000" }; // 1pt schwarz
  const belegTable = (rows, colWidths) => {
    const innerTable = new Table({
      width: { size: PW, type: WidthType.DXA },
      columnWidths: colWidths,
      borders: { top: bNo, bottom: bNo, left: bNo, right: bNo, insideH: bNo, insideV: bNo },
      rows,
    });
    // Wrapper: Zell-Rahmen setzen (Zell-Rahmen haben in Word Vorrang vor Tabellen-Rahmen)
    return new Table({
      width: { size: PW, type: WidthType.DXA },
      columnWidths: [PW],
      borders: { top: bNo, bottom: bNo, left: bNo, right: bNo, insideH: bNo, insideV: bNo },
      rows: [new TableRow({ cantSplit: true, children: [new TableCell({
        width: { size: PW, type: WidthType.DXA },
        borders: { top: bOut2, bottom: bOut2, left: bOut2, right: bOut2 },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [innerTable],
      })] })],
    });
  };

  // Unterschrift-Zeile: Vorname abgekürzt, einzeilig
  const makeSignRow = (cell) => (name, titel, w) => {
    // "Josef Brandl" → "J. Brandl" für Handschrift
    const parts = (name || "").trim().split(" ");
    const short = parts.length > 1 ? parts[0][0] + ". " + parts.slice(1).join(" ") : name;
    return row([cell([
      // Zeile 1: Kursive Handschrift (Initiale + Nachname) – tintenblau
      new Paragraph({ spacing: { after: 2 }, children: [
        new TextRun({ text: short, size: 24, italic: true, color: "1a3a6b", font: "Segoe Script" }),
      ]}),
      // Zeile 2: Horizontale Linie (etwas Abstand zur Unterschrift)
      new Paragraph({ spacing: { after: 2 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" } },
        children: [new TextRun({ text: "\u00a0", size: 8, font: "Arial" })],
      }),
      // Zeile 3: i. A. Vorname Nachname (voller Name)
      new Paragraph({ spacing: { after: 2 }, children: [
        new TextRun({ text: "i.\u202fA.\u2002" + name, size: 17, color: "222222", font: "Arial" }),
      ]}),
      // Zeile 4: Abteilung/Branche
      new Paragraph({ spacing: { after: 0 }, children: [
        new TextRun({ text: titel, size: 15, color: "666666", font: "Arial" }),
      ]}),
    ], w, { mt: 40, mb: 60, ml: 120 })]);
  };

  // ── HAUPTFUNKTION ────────────────────────────────────────────────────────────
  return function belegToDocx(beleg, firma) {
    if (!beleg) return [];
    const fc = ((firma&&firma.farbe)||"#1e293b").replace("#","").toUpperCase();
    // Hintergrundfarbe: Firmenfarbe 6% + 94% Weiß
    const rv = parseInt(fc.slice(0,2),16), gv = parseInt(fc.slice(2,4),16), bv2 = parseInt(fc.slice(4,6),16);
    const nr = Math.round(rv+(255-rv)*0.94), ng = Math.round(gv+(255-gv)*0.94), nb3 = Math.round(bv2+(255-bv2)*0.94);
    const bg = (nr<16?"0":"")+nr.toString(16).toUpperCase()+(ng<16?"0":"")+ng.toString(16).toUpperCase()+(nb3<16?"0":"")+nb3.toString(16).toUpperCase();
    // cell und hrRow mit bg erzeugen
    const cell = makeCell(bg);
    const hrRow = makeHrRow(cell);
    const signRow = makeSignRow(cell);
    const bAkz = { style: BorderStyle.SINGLE, size: 20, color: fc };
    const hdrBrd = { top: bNo, bottom: bAkz, left: bNo, right: bNo };

    // ══════════════════════════════════════════════════════
    // EINGANGS- / AUSGANGSRECHNUNG
    // ══════════════════════════════════════════════════════
    if (beleg.typ === "eingangsrechnung" || beleg.typ === "ausgangsrechnung") {
      // Für Rechnungen: Zellen ohne Hintergrundfarbe (nur Titelzeile hat Firmenfarbe)
      const isEin = beleg.typ === "eingangsrechnung";
      const abs   = isEin ? (beleg.lief||{}) : (beleg.firma||firma||{});
      const empf  = isEin ? (beleg.empfaenger||{}) : (beleg.kunde||{});
      const absFc = (abs.farbe||"#1e293b").replace("#","").toUpperCase();
      const rgnr  = beleg.rgnr || beleg.belegnr || "–";
      const dat   = beleg.datum || "";
      const ziel  = beleg.zahlungsziel || "";
      const gf    = abs.gf || ""; // Geschäftsführer für Unterschrift
      const icon  = abs.icon || "";

      // 5-Spalten-Raster: Art-Nr. | Gegenstand | Menge | Einzelpr. | Betrag
      const c1=867, c2=3662, c3=1156, c4=1638, c5=2315; // Summe=9638
      const wL=c1+c2+c3, wR=c4+c5;
      const empfAdr = empf.plz_ort || ((empf.plz||"")+" "+(empf.ort||"")).trim();
      const rows = [];

      // Block 1: Firmen-Kopf
      rows.push(row([cell([
        para([
          ...(icon ? [run(icon+" ", { sz: 26 })] : []),
          run(abs.name||"", { sz: 30, b: true, col: absFc }),
        ], { sp: 10 }),
        ...(abs.slogan ? [p(abs.slogan, { sz: 15, i: true, col: "666666", sp: 6 })] : []),
        p([abs.strasse, abs.plz_ort || ((abs.plz||"")+" "+(abs.ort||"")).trim()].filter(Boolean).join("  ·  "), { sz: 16, col: "555555", sp: 4 }),
        ...(abs.tel   ? [p("Tel.: "+abs.tel,  { sz: 14, col: "777777", sp: 2 })] : []),
        ...(abs.email ? [p(abs.email,          { sz: 14, col: "777777" })] : []),
      ], PW, { brd: hdrBrd, mt: 100, mb: 100, fill: "F9F7F4", span: 5 })]));

      // Block 2: Empfänger | Bankverbindung + HRB
      rows.push(row([
        cell([
          p("An:", { sz: 14, col: "999999", sp: 8 }),
          p(empf.name||"", { sz: 20, b: true, sp: 6 }),
          ...(empf.strasse ? [p(empf.strasse,  { sz: 18 })] : []),
          ...(empfAdr      ? [p(empfAdr,        { sz: 18 })] : []),
        ], wL, { mt: 90, mb: 80 }),
        cell([
          ...(abs.bank&&abs.iban ? [
            p("Bankverbindung:", { sz: 14, col: "777777", sp: 4, r: true }),
            p(abs.bank,          { sz: 14, col: "444444", sp: 2, r: true }),
            p("IBAN: "+abs.iban,  { sz: 14, col: "444444", sp: 12, r: true }),
          ] : []),
          ...(abs.hrb ? [p(abs.hrb, { sz: 14, col: "888888", r: true })] : []),
        ], wR, { mt: 90, mb: 80 }),
      ]));

      rows.push(hrRow(PW, absFc));

      // Block 3: Dokumenttitel + Nr/Datum
      rows.push(row([
        cell([
          para([run("Rechnung", { sz: 34, b: true, col: "111111" })], { sp: 10 }),
          p("Nr. "+rgnr+"   ·   "+dat, { sz: 18, col: "444444" }),
        ], wL, { mt: 80, mb: 80 }),
        cell([
          ...(beleg.lieferdatum ? [p("Lieferdatum: "+beleg.lieferdatum, { sz: 15, col: "555555", sp: 6, r: true })] : []),
          ...(empf.kundennr ? [p("Kunden-Nr.: "+empf.kundennr, { sz: 15, col: "555555", r: true })] : []),
        ], wR, { mt: 80, mb: 80 }),
      ]));

      // Block 4: Positions-Tabelle Header
      const hF = "E8E8E8";
      rows.push(row([
        cell(p("Art-Nr.",    {sz:16,b:true}), c1, {brd:allTh,fill:hF}),
        cell(p("Gegenstand", {sz:16,b:true}), c2, {brd:allTh,fill:hF}),
        cell(p("Menge",      {sz:16,b:true}), c3, {brd:allTh,fill:hF}),
        cell(p("Einzelpr.",  {sz:16,b:true}), c4, {brd:allTh,fill:hF}),
        cell(p("Betrag",     {sz:16,b:true,r:true}), c5, {brd:allTh,fill:hF,mr:120}),
      ]));

      // Block 5: Positionen (Sofortrabatt als eigene Zeile grün)
      (beleg.positionen||[]).forEach(pos => {
        const isRab = !!pos.isRabatt;
        const ep2 = pos.ep!=null ? pos.ep : null;
        const betragFmt = pos.netto!=null ? (isRab ? "− "+fmt(Math.abs(pos.netto)) : fmt(pos.netto))+" €" : "";
        rows.push(row([
          cell(p(pos.artnr||"",                                                           {sz:18}), c1, {brd:allTh}),
          cell(p(pos.beschr||"",                                                          {sz:18, b:isRab}), c2, {brd:allTh}),
          cell(p(isRab||!pos.menge ? "" : String(pos.menge)+" "+(pos.einheit||""),        {sz:18}), c3, {brd:allTh}),
          cell(p(isRab||ep2==null ? "" : fmt(ep2)+" €",                                  {sz:18,r:true}), c4, {brd:allTh,mr:120}),
          cell(p(betragFmt,                                                               {sz:18,r:true, b:isRab}), c5, {brd:allTh,mr:120}),
        ]));
      });

      // Leerzeile
      rows.push(row([
        cell(empty(),c1,{brd:allTh,mt:20,mb:20}),
        cell(empty(),c2,{brd:allTh,mt:20,mb:20}),
        cell(empty(),c3,{brd:allTh,mt:20,mb:20}),
        cell(empty(),c4,{brd:allTh,mt:20,mb:20}),
        cell(empty(),c5,{brd:allTh,mt:20,mb:20}),
      ]));

      // USt
      rows.push(row([
        cell(empty(), c1+c2+c3, {brd:allTh,mt:30,mb:30,span:3}),
        cell(p("+ "+(beleg.ustPct||19)+" % Umsatzsteuer", {sz:17,r:true}), c4, {brd:allTh,mr:120}),
        cell(p(fmt(beleg.ustBetrag)+" €", {sz:17,r:true}), c5, {brd:allTh,mr:120}),
      ]));

      // Rechnungsbetrag (fett)
      const sF = "F0F0F0";
      rows.push(row([
        cell(empty(), c1+c2+c3, {brd:allTh,fill:sF,mt:60,mb:60,span:3}),
        cell(p("Rechnungsbetrag:", {sz:18,b:true,r:true}), c4, {brd:allTh,fill:sF,mr:120}),
        cell(p(fmt(beleg.brutto)+" €", {sz:22,b:true,r:true}), c5, {brd:allTh,fill:sF,mr:120}),
      ]));

      // Block 6: Zahlungsziel + Bank
      if (ziel) {
        rows.push(hrRow(PW));
        rows.push(row([cell([
          p("Zahlungsbedingung: "+ziel, {sz:17,i:true,col:"333333",sp:8}),
          ...(abs.iban ? [p((abs.bank||"")+"   ·   IBAN: "+abs.iban, {sz:14,col:"666666"})] : []),
        ], PW, {mt:60,mb:50,span:5})]));
      }

      // Block 7: Unterschrift
      if (gf) {
        rows.push(hrRow(PW, "DDDDDD"));
        rows.push(signRow(gf, abs.branche||"Buchhaltung", PW));
      }

      return [belegTable(rows, [c1,c2,c3,c4,c5], absFc)];

    // ══════════════════════════════════════════════════════
    // ÜBERWEISUNG
    // ══════════════════════════════════════════════════════
    } else if (beleg.typ === "ueberweisung") {
      const abs  = beleg.absender   || {};
      const empf = beleg.empfaenger || {};
      const cL   = 3200, cR = PW-cL;
      const rows = [
        row([cell([
          p("ONLINE-ÜBERWEISUNG", {sz:22,b:true,col:fc}),
          p(beleg.bank||"Online Banking", {sz:15,col:"888888"}),
        ], PW, {brd:hdrBrd,mt:80,mb:80,fill:"EDF7EE",span:2})]),
        row([
          cell(p("Auftraggeber:", {sz:17,b:true}), cL, {brd:botTh}),
          cell([p(abs.name||"", {sz:19,b:true,sp:6}), p("IBAN: "+(abs.iban||""), {sz:16,col:"555555"})], cR, {brd:botTh}),
        ]),
        row([
          cell(p("Empfänger:", {sz:17,b:true}), cL, {brd:botTh}),
          cell([p(empf.name||"", {sz:19,b:true,sp:6}), p("IBAN: "+(empf.iban||""), {sz:16,col:"555555"})], cR, {brd:botTh}),
        ]),
        row([
          cell(p("Betrag:", {sz:17,b:true}), cL, {brd:botTh}),
          cell(para([
            run(fmt(beleg.betrag)+" €", {sz:28,b:true,col:fc}),
            ...(beleg.skontoBetrag>0 ? [run("  (Skonto: "+fmt(beleg.skontoBetrag)+" €)", {sz:16,col:"777777"})] : []),
          ]), cR, {brd:botTh}),
        ]),
        row([
          cell(p("Verwendungszweck:", {sz:17,b:true}), cL, {brd:botTh}),
          cell(p(beleg.verwendungszweck||"", {sz:18,i:true}), cR, {brd:botTh}),
        ]),
        row([
          cell(p("Datum:", {sz:17,b:true}), cL),
          cell(p(beleg.ausfuehrungsdatum||"", {sz:18}), cR, {mb:100}),
        ]),
      ];
      return [belegTable(rows, [cL,cR], fc)];

    // ══════════════════════════════════════════════════════
    // KONTOAUSZUG
    // ══════════════════════════════════════════════════════
    } else if (beleg.typ === "kontoauszug") {
      const cD=1100, cA=1500, cTx=4538, cB=1300, cSl=1200; // Summe=9638
      const hFill="DDDDDD";
      const rows = [
        row([cell([
          para([run(beleg.bank||"Bank", {sz:26,b:true,col:fc})], {sp:10}),
          p(beleg.kontoinhaber||"", {sz:18,sp:4}),
          p("IBAN: "+(beleg.iban||""), {sz:15,col:"666666"}),
        ], PW, {brd:hdrBrd,mt:80,mb:80,fill:"F0F4FA",span:5})]),
        row([
          cell(p("Datum",     {sz:16,b:true}), cD,  {brd:allTh,fill:hFill}),
          cell(p("Umsatzart", {sz:16,b:true}), cA,  {brd:allTh,fill:hFill}),
          cell(p("Buchungstext / Verwendungszweck", {sz:16,b:true}), cTx, {brd:allTh,fill:hFill}),
          cell(p("Betrag",    {sz:16,b:true,r:true}), cB,  {brd:allTh,fill:hFill,mr:100}),
          cell(p("Saldo",     {sz:16,b:true,r:true}), cSl, {brd:allTh,fill:hFill,mr:100}),
        ]),
      ];
      (beleg.buchungen||[]).forEach(b => {
        const hl  = !!b.highlight;
        const hlF = hl ? "FFFBEB" : undefined;
        const hlBrd = hl ? {top:{style:BorderStyle.SINGLE,size:8,color:fc},bottom:{style:BorderStyle.SINGLE,size:8,color:fc},left:bTh,right:bTh} : allTh;
        const pos = (b.betrag||0) > 0;
        rows.push(row([
          cell(p(b.datum||"",       {sz:17,b:hl}), cD,  {brd:hlBrd,fill:hlF}),
          cell(p(b.art||"Buchung",  {sz:17,b:hl}), cA,  {brd:hlBrd,fill:hlF}),
          cell([p(b.text||"",{sz:17,b:hl}), ...(b.iban?[p(b.iban,{sz:14,col:"888888"})]:[])], cTx, {brd:hlBrd,fill:hlF}),
          cell(p((pos?"+":"")+fmt(b.betrag)+" €", {sz:17,b:hl,r:true,col:pos?"005500":"AA0000"}), cB, {brd:hlBrd,fill:hlF,mr:100}),
          cell(p(b.saldo!=null?fmt(b.saldo)+" €":"", {sz:17,r:true}), cSl, {brd:hlBrd,fill:hlF,mr:100}),
        ]));
      });
      return [belegTable(rows, [cD,cA,cTx,cB,cSl], fc)];

    // ══════════════════════════════════════════════════════
    // E-MAIL
    // ══════════════════════════════════════════════════════
    } else if (beleg.typ === "email") {
      const cL=1900, cR=PW-cL;
      const bodyText = beleg.text||beleg.body||beleg.nachricht||"";
      const rows = [
        row([cell(p("E-MAIL", {sz:22,b:true,col:fc}), PW, {brd:hdrBrd,mt:80,mb:80,fill:"FFF8ED",span:2})]),
        row([cell(p("Von:",     {sz:16,b:true}),cL,{brd:botTh}), cell([p(beleg.vonName||"",{sz:18,b:true,sp:6}), p(beleg.von||"",{sz:15,col:"555555"})],cR,{brd:botTh})]),
        row([cell(p("An:",      {sz:16,b:true}),cL,{brd:botTh}), cell(p(beleg.an||"",{sz:18}),cR,{brd:botTh})]),
        row([cell(p("Betreff:", {sz:16,b:true}),cL,{brd:botTh}), cell(p(beleg.betreff||"",{sz:18,b:true}),cR,{brd:botTh})]),
        row([cell(p("Datum:",   {sz:16,b:true}),cL),              cell(p((beleg.datum||"")+(beleg.uhrzeit?"  ·  "+beleg.uhrzeit:""),{sz:17}),cR,{mb:60})]),
        row([cell(empty(), PW, {brd:{top:bNo,bottom:bTh,left:bNo,right:bNo},mt:0,mb:0,span:2})]),
        // E-Mail Inhalt – alle Zeilen in EINER Zelle
        row([cell(
          bodyText.split("\n").map(line => p(line||" ", {sz:18,sp:line?40:0})),
          PW, {mt:80,mb:80,span:2}
        )]),
      ];
      return [belegTable(rows, [cL,cR], fc)];

    // ══════════════════════════════════════════════════════
    // QUITTUNG
    // ══════════════════════════════════════════════════════
    } else if (beleg.typ === "quittung") {
      const fmtNum = n => Number(n||0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2});
      const ustRate = Number(beleg.ustSatz||19) / 100;
      const brutto  = Number(beleg.betrag||0);
      const netto   = Math.round(brutto / (1 + ustRate) * 100) / 100;
      const ust     = Math.round((brutto - netto) * 100) / 100;
      const cL=2400, cR=PW-cL;
      const lineRow = (label, val, bold) => row([
        cell(p(label, {sz:17,b:bold}), cL, {brd:botTh, mt:80, mb:60}),
        cell(p(val||"", {sz:17,b:bold}), cR, {brd:botTh, mt:80, mb:60}),
      ]);
      const rows = [
        // Kopfzeile
        row([cell([
          para([run("Quittung", {sz:36,b:true})], {sp:6}),
          p("Nr. "+(beleg.quittungsNr||""), {sz:17,col:"555555"}),
        ], PW, {brd:hdrBrd,mt:80,mb:80,fill:"FAFAFA",span:2})]),
        // Betragsblock
        row([
          cell(p("Währung", {sz:15,col:"777777",b:true}), cL, {brd:allTh,fill:"F4F4F4",mt:60,mb:40}),
          cell(p("EUR", {sz:17,b:true}), cR, {brd:allTh,fill:"F4F4F4",mt:60,mb:40}),
        ]),
        row([
          cell(p("Nettowert", {sz:15,col:"777777",b:true}), cL, {brd:allTh,mt:40,mb:40}),
          cell(p(fmtNum(netto)+" €", {sz:17}), cR, {brd:allTh,mt:40,mb:40}),
        ]),
        row([
          cell(p("+ "+(beleg.ustSatz||19)+" % MwSt.", {sz:15,col:"777777",b:true}), cL, {brd:allTh,mt:40,mb:40}),
          cell(p(fmtNum(ust)+" €", {sz:17}), cR, {brd:allTh,mt:40,mb:40}),
        ]),
        row([
          cell(p("Gesamtbetrag", {sz:17,b:true}), cL, {brd:allTh,fill:"EEEEEE",mt:60,mb:60}),
          cell(p(fmtNum(brutto)+" €", {sz:20,b:true}), cR, {brd:allTh,fill:"EEEEEE",mt:60,mb:60}),
        ]),
        // Gesamtbetrag in Worten (leere Zeile)
        row([
          cell(p("Gesamtbetrag in Worten", {sz:15,col:"777777",b:true}), PW, {brd:{top:bNo,bottom:bTh,left:bNo,right:bNo},mt:100,mb:100,span:2}),
        ]),
        // von / für
        lineRow("von",  beleg.empfaenger||""),
        lineRow("für",  beleg.zweck||""),
        row([cell(p("richtig erhalten zu haben, bestätigt", {sz:16,i:true,col:"555555"}), PW, {mt:80,mb:80,span:2})]),
        // Ort / Datum / Unterschrift
        row([
          cell([
            p("Ort", {sz:14,col:"777777",b:true}),
            p(beleg.ort||"", {sz:17}),
            empty(),
            p("Datum", {sz:14,col:"777777",b:true}),
            p(beleg.datum||"", {sz:17}),
          ], cL, {mt:80,mb:80}),
          cell([
            empty(),
            p(" ", {sz:20}),
            p(" ", {sz:20}),
            new Paragraph({ spacing:{after:2}, border:{ bottom:{style:BorderStyle.SINGLE,size:4,color:"AAAAAA"} }, children:[new TextRun({text:"\u00a0",size:8,font:"Arial"})] }),
            p("Stempel / Unterschrift  ·  "+beleg.aussteller, {sz:14,col:"777777"}),
          ], cR, {mt:80,mb:80}),
        ]),
        // Buchungsvermerke
        hrRow(PW, "CCCCCC"),
        row([cell(p("Buchungsvermerke", {sz:14,col:"999999",b:true}), PW, {mt:60,mb:80,span:2})]),
        row([cell(empty(), PW, {brd:{top:bNo,bottom:bTh,left:bNo,right:bNo},mt:0,mb:60,span:2})]),
      ];
      return [belegTable(rows, [cL, cR], "888888")];
    }

    return [];
  };
}


// ── Gemeinsame DOCX-Blob-Erzeugung (für Word, PDF und Pages) ──────────────
export async function buildDocxBlob({ aufgaben, config, firma, modus, kopfzeile, kiHistorie }) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, BorderStyle, AlignmentType, ShadingType, LevelFormat,
          VerticalAlign } = await import("docx");
  // Wiederverwendung der exportWord-Logik: wir rufen sie als Funktion auf
  // Da exportWord eine Closure in ExportModal ist, übergeben wir alles als
  // Argument an eine eigenständige Hilfsfunktion:
  return buildDocxBlobCore({ aufgaben, config, firma, modus, kopfzeile, kiHistorie,
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, BorderStyle, AlignmentType, ShadingType, LevelFormat, VerticalAlign });
}

// ── Print-HTML (für PDF via Browser-Druckdialog) ──────────────────────────
export function generatePrintHTML({ aufgaben, config, firma, modus, kopfzeile }) {
  // Vorhandene generateExportHTML-Funktion nutzen, aber mit Print-CSS
  return generateExportHTML({ aufgaben, config, firma, modus, kiHistorie: [], kopfzeile, format: "print" });
}
