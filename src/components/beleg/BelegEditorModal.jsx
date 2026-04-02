// ══════════════════════════════════════════════════════════════════════════════
// BelegEditorModal – Beleg-Editor (Eingangs-/Ausgangsrechnung, Kontoauszug…)
// Extrahiert aus BuchungsWerk.jsx – Phase C4 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef } from "react";
import { PenLine, Zap, Download, Upload, Mail, Landmark, ArrowLeftRight, Receipt } from "lucide-react";
import { apiFetch } from "../../api.js";
import { UNTERNEHMEN } from "../../data/stammdaten.js";
import { r2 } from "../../utils.js";

// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// BELEG-EDITOR MODAL (eingebettet aus BelegEditor.jsx)
// ══════════════════════════════════════════════════════════════════════════════

const be_fmt = n => (isNaN(n) ? "0,00" : Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const be_uid = () => Math.random().toString(36).slice(2, 8);

function belegZuText(b) {
  const d = b.data;
  switch (b.typ) {
    case "eingangsrechnung": {
      const pos = (d.positionen||[]).map(p=>`${p.menge} ${p.einheit} ${p.artikel} à ${p.ep} € netto`).join(", ");
      const rabatt = d.rabattAktiv ? ` Sofortrabatt: ${d.rabattArt} ${d.rabattPct} %.` : "";
      const bezug  = parseFloat(d.bezugskosten) > 0 ? ` Bezugskosten: ${d.bezugskosten} €.` : "";
      const skonto = parseFloat(d.skontoPct) > 0 ? ` Skonto: ${d.skontoPct} % bei Zahlung in ${d.skontoTage} Tagen.` : "";
      return `Eingangsrechnung von ${d.lieferantName} an ${d.empfaengerName}. Positionen: ${pos}.${rabatt}${bezug} USt: ${d.ustSatz} %. Zahlungsziel: ${d.zahlungsziel} Tage.${skonto} Rechnungs-Nr.: ${d.rechnungsNr}.`;
    }
    case "ausgangsrechnung": {
      const pos = (d.positionen||[]).map(p=>`${p.menge} ${p.einheit} ${p.artikel} à ${p.ep} € netto`).join(", ");
      const rabatt = d.rabattAktiv ? ` Sofortrabatt: ${d.rabattArt} ${d.rabattPct} %.` : "";
      const skonto = parseFloat(d.skontoPct) > 0 ? ` Skonto: ${d.skontoPct} % bei Zahlung in ${d.skontoTage} Tagen.` : "";
      return `Ausgangsrechnung von ${d.absenderName} an ${d.kundeName}. Positionen: ${pos}.${rabatt} USt: ${d.ustSatz} %. Zahlungsziel: ${d.zahlungsziel} Tage.${skonto}`;
    }
    case "kontoauszug": {
      const hl = (d.buchungen||[]).find(x=>x.highlight);
      return `Kontoauszug der ${d.bank}, Inhaber: ${d.inhaber}. Zu buchende Zeile: "${hl?.text||"(keine markiert)"}", Betrag: ${hl?.betrag||"?"} €.`;
    }
    case "ueberweisung":
      return `Überweisung von ${d.auftraggeberName} an ${d.empfaengerName}, Betrag: ${d.betrag} €, Verwendung: ${d.verwendung}.${parseFloat(d.skontoBetrag)>0?` Skonto-Abzug: ${d.skontoBetrag} €.`:""}`;
    case "email":
      return `E-Mail von ${d.von} an ${d.an}, Betreff: "${d.betreff}". Inhalt: ${d.text?.slice(0,200)}`;
    case "quittung":
      return `Quittung Nr. ${d.quittungsNr}. Aussteller: ${d.aussteller}. Zahlender: ${d.empfaenger}. Betrag: ${d.betrag} €. Zweck: ${d.zweck}.`;
    default: return JSON.stringify(b.data).slice(0, 300);
  }
}

const BELEGTYPEN = [
  { id: "eingangsrechnung", label: "Eingangsrechnung", icon: Download },
  { id: "ausgangsrechnung", label: "Ausgangsrechnung", icon: Upload },
  { id: "kontoauszug",      label: "Kontoauszug",      icon: Landmark },
  { id: "ueberweisung",     label: "Überweisung",      icon: ArrowLeftRight },
  { id: "email",            label: "E-Mail",            icon: Mail },
  { id: "quittung",         label: "Quittung",          icon: Receipt },
];

const MODELLUNTERNEHMEN = [
  { name: "LumiTec GmbH",         ort: "Ingolstadt", strasse: "Solarstraße 12"     },
  { name: "Waldform Design GmbH", ort: "Straubing",  strasse: "Holzmarkt 5"        },
  { name: "AlpenTextil KG",       ort: "Kaufbeuren", strasse: "Weberweg 8"         },
  { name: "VitaSport GmbH",       ort: "Landsberg",  strasse: "Sportpark-Allee 3"  },
];

// ── Default-Zustände ─────────────────────────────────────────────────────────
const defaultEingangsrechnung = () => {
  const mu = MODELLUNTERNEHMEN[Math.floor(Math.random() * MODELLUNTERNEHMEN.length)];
  return {
    lieferantName: "Müller GmbH", lieferantStrasse: "Industriestr. 7",
    lieferantPlz: "80333", lieferantOrt: "München", lieferantUStId: "DE123456789",
    rechnungsNr: `RE-2026-${Math.floor(1000 + Math.random()*9000)}`,
    datum: new Date().toISOString().slice(0, 10), zahlungsziel: "30", ustSatz: "19",
    skontoPct: "2", skontoTage: "14",
    positionen: [{ id: be_uid(), artikel: "Rohstoffe", menge: "500", einheit: "kg", ep: "12,00", highlight: false }],
    bezugskosten: "0", empfaengerName: mu.name, empfaengerStrasse: mu.strasse,
    empfaengerPlz: "86150", empfaengerOrt: mu.ort, rabattAktiv: false,
    rabattArt: "Mengenrabatt", rabattPct: "5",
  };
};
const defaultAusgangsrechnung = () => {
  const mu = MODELLUNTERNEHMEN[Math.floor(Math.random() * MODELLUNTERNEHMEN.length)];
  return {
    kundeName: "Technik Handel GmbH", kundeStrasse: "Marktplatz 3",
    kundePlz: "85049", kundeOrt: "Ingolstadt", kundeUStId: "DE987654321",
    rechnungsNr: `AR-2026-${Math.floor(1000 + Math.random()*9000)}`,
    datum: new Date().toISOString().slice(0, 10), zahlungsziel: "30", ustSatz: "19",
    skontoPct: "2", skontoTage: "14",
    positionen: [{ id: be_uid(), artikel: "Fertigerzeugnisse", menge: "100", einheit: "Stk", ep: "45,00", highlight: false }],
    absenderName: mu.name, absenderStrasse: mu.strasse, absenderPlz: "86150", absenderOrt: mu.ort,
    rabattAktiv: false, rabattArt: "Mengenrabatt", rabattPct: "5",
  };
};
const defaultKontoauszug = () => ({
  bank: "Volksbank Bayern eG", inhaber: "LumiTec GmbH",
  iban: "DE12 3456 7890 1234 5678 90", bic: "VOBADEMMXXX",
  datum: new Date().toISOString().slice(0, 10), saldoVor: "12.450,00",
  buchungen: [
    { id: be_uid(), datum: new Date(Date.now()-5*86400000).toISOString().slice(0,10), text: "Überweisung Lieferant",  betrag: "-3.200,00", highlight: false },
    { id: be_uid(), datum: new Date(Date.now()-2*86400000).toISOString().slice(0,10), text: "Eingang Kundenzahlung",  betrag: "+8.500,00", highlight: false },
    { id: be_uid(), datum: new Date().toISOString().slice(0,10),                      text: "Buchung markieren →",    betrag: "-450,00",   highlight: true  },
  ],
});
const defaultUeberweisung = () => ({
  auftraggeberName: "LumiTec GmbH", auftraggeberIban: "DE12 3456 7890 1234 5678 90",
  empfaengerName: "Müller GmbH",    empfaengerIban:   "DE98 7654 3210 9876 5432 10",
  betrag: "3.200,00", verwendung: "RE-2026-1042",
  datum: new Date().toISOString().slice(0, 10), skontoBetrag: "0",
});
const defaultEmail = () => ({
  von: "bestellung@lumitec-gmbh.de", an: "vertrieb@mueller-gmbh.de",
  datum: new Date().toISOString().slice(0, 10), betreff: "Bestellung Nr. 2026-042",
  text: "Sehr geehrte Damen und Herren,\n\nhiermit bestellen wir:\n\n500 kg Rohstoffe à 12,00 € netto\n\nMit freundlichen Grüßen\nLumiTec GmbH",
});
const defaultQuittung = () => ({
  aussteller: "Bürobedarf Schreiber", empfaenger: "LumiTec GmbH",
  betrag: "119,00", zweck: "Druckerpapier und Büromaterial",
  datum: new Date().toISOString().slice(0, 10), barzahlung: true,
  quittungsNr: `Q-${Math.floor(100 + Math.random()*900)}`,
});

// ── CSS (als scoped <style> im Modal) ────────────────────────────────────────
const BE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  .be-root *, .be-root *::before, .be-root *::after { box-sizing: border-box; }
  .be-root { font-family: 'IBM Plex Sans', system-ui, sans-serif; color: #0f172a; height: 100%; display: flex; flex-direction: column; }
  .be-typ-bar { background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; padding: 0 20px; gap: 4px; flex-shrink: 0; }
  .be-typ-tab { padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; border: none; background: none; border-bottom: 3px solid transparent; transition: all .15s; white-space: nowrap; font-family: inherit; }
  .be-typ-tab:hover { color: #0f172a; }
  .be-typ-tab.active { color: #0f172a; border-bottom-color: #e8600a; }
  .be-body { display: grid; grid-template-columns: 360px 1fr; gap: 16px; padding: 16px 20px; flex: 1; overflow: hidden; align-items: stretch; }
  .be-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .be-panel-head { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; }
  .be-panel-body { padding: 16px; overflow-y: auto; max-height: calc(100vh - 240px); }
  .be-field-group { margin-bottom: 14px; }
  .be-field-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
  .be-field-input { width: 100%; padding: 7px 9px; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: 12px; font-family: inherit; color: #0f172a; background: #fff; transition: border-color .15s; outline: none; }
  .be-field-input:focus { border-color: #0f172a; }
  .be-field-row { display: grid; gap: 8px; }
  .be-field-row-2 { grid-template-columns: 1fr 1fr; }
  .be-field-row-3 { grid-template-columns: 1fr 1fr 1fr; }
  textarea.be-field-input { resize: vertical; min-height: 90px; line-height: 1.5; }
  select.be-field-input { cursor: pointer; }
  .be-divider { border: none; border-top: 1px dashed #e2e8f0; margin: 12px 0; }
  .be-pos-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 6px; }
  .be-pos-table th { background: #f8fafc; padding: 5px 6px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #e2e8f0; }
  .be-pos-table td { padding: 4px 5px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .be-pos-input { width: 100%; padding: 4px 6px; border: 1.5px solid #e2e8f0; border-radius: 4px; font-size: 11px; font-family: 'IBM Plex Mono', monospace; outline: none; background: #fff; }
  .be-pos-input:focus { border-color: #0f172a; }
  .be-pos-input.wide { font-family: inherit; }
  .be-btn-del { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px; padding: 2px 4px; border-radius: 3px; }
  .be-btn-del:hover { background: #fee2e2; }
  .be-btn-add { width: 100%; padding: 6px; border: 1.5px dashed #e2e8f0; border-radius: 6px; background: none; font-size: 11px; font-weight: 600; color: #94a3b8; cursor: pointer; transition: all .15s; font-family: inherit; }
  .be-btn-add:hover { border-color: #0f172a; color: #0f172a; background: #f8fafc; }
  .be-hl-toggle { width: 28px; height: 16px; background: #e2e8f0; border: none; border-radius: 8px; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
  .be-hl-toggle.on { background: #e8600a; }
  .be-hl-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background: #fff; border-radius: 50%; transition: left .2s; }
  .be-hl-toggle.on::after { left: 14px; }
  .be-action-bar { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc; flex-direction: column; }
  .be-btn-save { padding: 9px 14px; background: #0f172a; color: #fff; border: none; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background .15s; }
  .be-btn-save:hover { background: #1e293b; }
  .be-btn-print { padding: 9px 14px; background: #fff; color: #0f172a; border: 1.5px solid #e2e8f0; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .be-btn-print:hover { border-color: #0f172a; }
  .be-preview-wrap { padding: 16px; background: #f8fafc; overflow-y: auto; max-height: calc(100vh - 240px); }
  .be-vorlage-bar { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 12px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; align-items: center; }
  .be-vorlage-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; margin-right: 3px; white-space: nowrap; }
  .be-vorlage-btn { padding: 3px 8px; border: 1.5px solid #e2e8f0; border-radius: 20px; background: #fff; font-size: 10px; font-weight: 600; color: #475569; cursor: pointer; transition: all .15s; white-space: nowrap; font-family: inherit; }
  .be-vorlage-btn:hover { border-color: #0f172a; color: #0f172a; }
  .be-rabatt-block { border: 1.5px solid #e2e8f0; border-radius: 7px; overflow: hidden; margin-bottom: 14px; }
  .be-rabatt-toggle-row { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: #f8fafc; cursor: pointer; user-select: none; }
  .be-rabatt-toggle-row:hover { background: #f1f5f9; }
  .be-rabatt-toggle-label { font-size: 12px; font-weight: 700; color: #475569; flex: 1; }
  .be-rabatt-badge { font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
  .be-rabatt-badge.on  { background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; }
  .be-rabatt-badge.off { background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; }
  .be-rabatt-felder { padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1px solid #e2e8f0; }
  .be-rechnung { background: #fff; border: 1px solid #e2e8f0; border-radius: 7px; font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; overflow: hidden; }
  .be-re-head { background: #0f172a; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: flex-start; }
  .be-re-head-firma { font-weight: 700; font-size: 13px; }
  .be-re-head-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .be-re-head-badge { background: #e8600a; color: #0f172a; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 3px; text-transform: uppercase; letter-spacing: .06em; }
  .be-re-body { padding: 14px 16px; }
  .be-re-adressen { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .be-re-adr-label { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 3px; }
  .be-re-adr-name { font-weight: 700; font-size: 12px; }
  .be-re-adr-sub { font-size: 11px; color: #475569; }
  .be-re-meta { display: flex; gap: 16px; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 6px 0; margin-bottom: 12px; flex-wrap: wrap; }
  .be-re-meta-item { font-size: 10px; }
  .be-re-meta-label { color: #94a3b8; font-weight: 600; }
  .be-re-meta-val { font-weight: 700; margin-left: 3px; }
  .be-re-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
  .be-re-table th { background: #f8fafc; padding: 6px 7px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
  .be-re-table th:last-child, .be-re-table td:last-child { text-align: right; }
  .be-re-table td { padding: 6px 7px; border-bottom: 1px solid #f1f5f9; }
  .be-re-table tr.hl td { background: #fffbeb; border-left: 3px solid #e8600a; font-weight: 700; }
  .be-re-summen { display: flex; justify-content: flex-end; }
  .be-re-summen-box { width: 200px; }
  .be-re-sum-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
  .be-re-sum-row.total { font-weight: 800; font-size: 13px; border-top: 2px solid #0f172a; margin-top: 3px; padding-top: 5px; }
  .be-re-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 8px 16px; font-size: 10px; color: #64748b; display: flex; gap: 16px; }
  .be-ka { background: #fff; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; font-size: 11px; }
  .be-ka-head { background: #1e3a5f; color: #fff; padding: 10px 14px; }
  .be-ka-head-bank { font-weight: 800; font-size: 13px; }
  .be-ka-head-sub { font-size: 10px; color: #93c5fd; margin-top: 1px; }
  .be-ka-meta { background: #e0f2fe; padding: 7px 14px; display: flex; justify-content: space-between; font-size: 10px; color: #0c4a6e; font-weight: 600; flex-wrap: wrap; gap: 4px; }
  .be-ka-table { width: 100%; border-collapse: collapse; }
  .be-ka-table th { background: #f8fafc; padding: 5px 10px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #e2e8f0; }
  .be-ka-table th.right { text-align: right; }
  .be-ka-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  .be-ka-table td.right { text-align: right; font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
  .be-ka-table tr.hl td { background: #fffbeb; }
  .be-ka-table tr.hl td.text-col { border-left: 3px solid #e8600a; font-weight: 700; }
  .be-ka-pos { color: #059669; }
  .be-ka-neg { color: #dc2626; }
  .be-ka-hl-badge { display: inline-block; background: #e8600a; color: #0f172a; font-size: 8px; font-weight: 800; padding: 1px 5px; border-radius: 3px; margin-left: 5px; vertical-align: middle; }
  .be-ub { background: #fff; border: 2px solid #0f172a; border-radius: 7px; overflow: hidden; font-size: 11px; }
  .be-ub-head { background: #0f172a; color: #fff; padding: 9px 14px; display: flex; justify-content: space-between; align-items: center; }
  .be-ub-head-title { font-weight: 800; font-size: 12px; letter-spacing: .05em; text-transform: uppercase; }
  .be-ub-head-sub { font-size: 9px; color: #94a3b8; }
  .be-ub-body { padding: 14px; }
  .be-ub-section { margin-bottom: 10px; }
  .be-ub-section-label { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px; }
  .be-ub-feld { border: 1px solid #e2e8f0; border-radius: 5px; padding: 7px 10px; background: #f8fafc; }
  .be-ub-feld-label { font-size: 8px; color: #94a3b8; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
  .be-ub-feld-val { font-weight: 700; font-size: 12px; margin-top: 1px; font-family: 'IBM Plex Mono', monospace; }
  .be-ub-feld-val.normal { font-family: inherit; }
  .be-ub-betrag-box { background: #0f172a; color: #fff; border-radius: 7px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
  .be-ub-betrag-label { font-size: 10px; color: #94a3b8; }
  .be-ub-betrag-val { font-size: 18px; font-weight: 800; font-family: 'IBM Plex Mono', monospace; color: #e8600a; }
  .be-ub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .be-email { background: #fff; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; font-size: 12px; }
  .be-em-head { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 14px; }
  .be-em-betreff { font-weight: 700; font-size: 14px; margin-bottom: 7px; }
  .be-em-meta-row { display: flex; gap: 7px; font-size: 11px; margin-bottom: 2px; }
  .be-em-meta-label { color: #94a3b8; font-weight: 600; width: 36px; flex-shrink: 0; }
  .be-em-body { padding: 14px; line-height: 1.7; white-space: pre-wrap; font-size: 12px; color: #1e293b; }
  .be-quit { background: #fff; border: 2px solid #0f172a; border-radius: 7px; overflow: hidden; font-size: 12px; }
  .be-quit-head { border-bottom: 3px double #0f172a; padding: 12px 18px; display: flex; justify-content: space-between; align-items: flex-start; }
  .be-quit-title { font-size: 20px; font-weight: 900; letter-spacing: -.03em; }
  .be-quit-nr { font-size: 10px; color: #64748b; font-weight: 600; margin-top: 2px; }
  .be-quit-body { padding: 16px 18px; }
  .be-quit-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: baseline; }
  .be-quit-label { font-size: 11px; color: #64748b; width: 110px; flex-shrink: 0; font-weight: 600; }
  .be-quit-val { font-weight: 700; flex: 1; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
  .be-quit-betrag-box { border: 2px solid #0f172a; border-radius: 5px; padding: 9px 12px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center; }
  .be-quit-betrag-label { font-size: 11px; color: #64748b; font-weight: 600; }
  .be-quit-betrag-val { font-size: 18px; font-weight: 900; font-family: 'IBM Plex Mono', monospace; }
  .be-quit-footer { border-top: 1px solid #e2e8f0; padding: 10px 18px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
`;

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────
function parseGeld(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
}
function fmtDatum(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Formular-Unterkomponenten ─────────────────────────────────────────────────
function BePositionenEditor({ positionen, onChange }) {
  const update = (id, field, val) => onChange(positionen.map(p => p.id === id ? { ...p, [field]: val } : p));
  const add    = () => onChange([...positionen, { id: be_uid(), artikel: "", menge: "1", einheit: "Stk", ep: "0,00", highlight: false }]);
  const remove = id => onChange(positionen.filter(p => p.id !== id));
  return (
    <div>
      <table className="be-pos-table">
        <thead><tr><th>Artikel</th><th>Menge</th><th>Einh.</th><th>EP (€)</th><th>HL</th><th></th></tr></thead>
        <tbody>
          {positionen.map(p => (
            <tr key={p.id}>
              <td><input className="be-pos-input wide" value={p.artikel} onChange={e => update(p.id, "artikel", e.target.value)} /></td>
              <td><input className="be-pos-input" value={p.menge} style={{width:44}} onChange={e => update(p.id, "menge", e.target.value)} /></td>
              <td><input className="be-pos-input" value={p.einheit} style={{width:38}} onChange={e => update(p.id, "einheit", e.target.value)} /></td>
              <td><input className="be-pos-input" value={p.ep} style={{width:60}} onChange={e => update(p.id, "ep", e.target.value)} /></td>
              <td><button className={`be-hl-toggle ${p.highlight ? "on" : ""}`} onClick={() => update(p.id, "highlight", !p.highlight)} /></td>
              <td><button className="be-btn-del" onClick={() => remove(p.id)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="be-btn-add" onClick={add}>+ Position hinzufügen</button>
    </div>
  );
}

function BeBuchungenEditor({ buchungen, onChange }) {
  const update = (id, field, val) => onChange(buchungen.map(b => b.id === id ? { ...b, [field]: val } : b));
  const add    = () => onChange([...buchungen, { id: be_uid(), datum: new Date().toISOString().slice(0,10), text: "", betrag: "0,00", highlight: false }]);
  const remove = id => onChange(buchungen.filter(b => b.id !== id));
  return (
    <div>
      <table className="be-pos-table">
        <thead><tr><th>Datum</th><th>Verwendungszweck</th><th>Betrag (€)</th><th>HL</th><th></th></tr></thead>
        <tbody>
          {buchungen.map(b => (
            <tr key={b.id}>
              <td><input type="date" className="be-pos-input" value={b.datum} style={{width:110}} onChange={e => update(b.id, "datum", e.target.value)} /></td>
              <td><input className="be-pos-input wide" value={b.text} onChange={e => update(b.id, "text", e.target.value)} /></td>
              <td><input className="be-pos-input" value={b.betrag} style={{width:80}} placeholder="+1.200,00" onChange={e => update(b.id, "betrag", e.target.value)} /></td>
              <td><button className={`be-hl-toggle ${b.highlight ? "on" : ""}`} onClick={() => update(b.id, "highlight", !b.highlight)} /></td>
              <td><button className="be-btn-del" onClick={() => remove(b.id)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="be-btn-add" onClick={add}>+ Buchung hinzufügen</button>
    </div>
  );
}

function BeField({ label, value, onChange, type = "text", ...rest }) {
  return (
    <div className="be-field-group">
      <label className="be-field-label">{label}</label>
      {type === "textarea"
        ? <textarea className="be-field-input" value={value} onChange={e => onChange(e.target.value)} {...rest} />
        : type === "select"
          ? <select className="be-field-input" value={value} onChange={e => onChange(e.target.value)} {...rest}>
              {rest.options?.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
            </select>
          : <input type={type} className="be-field-input" value={value} onChange={e => onChange(e.target.value)} {...rest} />
      }
    </div>
  );
}

const BE_RABATT_ARTEN = ["Mengenrabatt", "Treuerabatt", "Sonderrabatt", "Wiederverkäuferrabatt"];

function BeVorlageBar({ label, onSelect }) {
  return (
    <div className="be-vorlage-bar">
      <span className="be-vorlage-label"><Zap size={12} strokeWidth={1.5} style={{ verticalAlign:"middle", marginRight:4 }} />{label}:</span>
      {MODELLUNTERNEHMEN.map(m => (
        <button key={m.name} className="be-vorlage-btn" onClick={() => onSelect(m)}>{m.name}</button>
      ))}
    </div>
  );
}

function BeRabattBlock({ data, set }) {
  return (
    <div className="be-rabatt-block">
      <div className="be-rabatt-toggle-row" onClick={() => set("rabattAktiv", !data.rabattAktiv)}>
        <button className={`be-hl-toggle ${data.rabattAktiv ? "on" : ""}`} onClick={e => { e.stopPropagation(); set("rabattAktiv", !data.rabattAktiv); }} />
        <span className="be-rabatt-toggle-label">Sofortrabatt</span>
        <span className={`be-rabatt-badge ${data.rabattAktiv ? "on" : "off"}`}>
          {data.rabattAktiv ? `${data.rabattArt} · ${data.rabattPct} %` : "kein Rabatt"}
        </span>
      </div>
      {data.rabattAktiv && (
        <div className="be-rabatt-felder">
          <div className="be-field-group" style={{margin:0}}>
            <label className="be-field-label">Rabattart</label>
            <select className="be-field-input" value={data.rabattArt} onChange={e => set("rabattArt", e.target.value)}>
              {BE_RABATT_ARTEN.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="be-field-group" style={{margin:0}}>
            <label className="be-field-label">Rabatt (%)</label>
            <input className="be-field-input" value={data.rabattPct} onChange={e => set("rabattPct", e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formular je Belegtyp ─────────────────────────────────────────────────────
function BeFormEingangsrechnung({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const fillEmpf = mu => setData(d => ({ ...d, empfaengerName: mu.name, empfaengerStrasse: mu.strasse, empfaengerPlz: "86150", empfaengerOrt: mu.ort }));
  return (
    <>
      <BeField label="Lieferant (Name)" value={data.lieferantName} onChange={v => set("lieferantName", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Straße" value={data.lieferantStrasse} onChange={v => set("lieferantStrasse", v)} />
        <BeField label="PLZ / Ort" value={`${data.lieferantPlz} ${data.lieferantOrt}`}
          onChange={v => { const [plz, ...rest] = v.split(" "); set("lieferantPlz", plz); set("lieferantOrt", rest.join(" ")); }} />
      </div>
      <hr className="be-divider" />
      <BeVorlageBar label="Empfänger-Vorlage" onSelect={fillEmpf} />
      <BeField label="Empfänger (Name)" value={data.empfaengerName} onChange={v => set("empfaengerName", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Straße" value={data.empfaengerStrasse} onChange={v => set("empfaengerStrasse", v)} />
        <BeField label="PLZ / Ort" value={`${data.empfaengerPlz} ${data.empfaengerOrt}`}
          onChange={v => { const [plz, ...rest] = v.split(" "); set("empfaengerPlz", plz); set("empfaengerOrt", rest.join(" ")); }} />
      </div>
      <hr className="be-divider" />
      <div className="be-field-row be-field-row-2">
        <BeField label="USt-Satz (%)" value={data.ustSatz} type="select" onChange={v => set("ustSatz", v)}
          options={[{value:"19",label:"19 %"},{value:"7",label:"7 %"},{value:"0",label:"0 % (steuerfrei)"}]} />
        <BeField label="Zahlungsziel (Tage)" value={data.zahlungsziel} onChange={v => set("zahlungsziel", v)} />
      </div>
      <div className="be-field-row be-field-row-3">
        <BeField label="Rechnungs-Nr." value={data.rechnungsNr} onChange={v => set("rechnungsNr", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
        <BeField label="Bezugskosten (€ netto)" value={data.bezugskosten} onChange={v => set("bezugskosten", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Skonto (%)" value={data.skontoPct} onChange={v => set("skontoPct", v)} />
        <BeField label="Skonto innerhalb (Tage)" value={data.skontoTage} onChange={v => set("skontoTage", v)} />
      </div>
      <BeRabattBlock data={data} set={set} />
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>📦 POSITIONEN · Gelbe Zeile = zu buchende Position</div>
      <BePositionenEditor positionen={data.positionen} onChange={v => set("positionen", v)} />
    </>
  );
}

function BeFormAusgangsrechnung({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const fillAbs = mu => setData(d => ({ ...d, absenderName: mu.name, absenderStrasse: mu.strasse, absenderPlz: "86150", absenderOrt: mu.ort }));
  return (
    <>
      <BeVorlageBar label="Absender-Vorlage" onSelect={fillAbs} />
      <BeField label="Absender (Name)" value={data.absenderName} onChange={v => set("absenderName", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Straße" value={data.absenderStrasse} onChange={v => set("absenderStrasse", v)} />
        <BeField label="PLZ / Ort" value={`${data.absenderPlz} ${data.absenderOrt}`}
          onChange={v => { const [plz, ...rest] = v.split(" "); set("absenderPlz", plz); set("absenderOrt", rest.join(" ")); }} />
      </div>
      <hr className="be-divider" />
      <BeField label="Kunde (Name)" value={data.kundeName} onChange={v => set("kundeName", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Straße" value={data.kundeStrasse} onChange={v => set("kundeStrasse", v)} />
        <BeField label="PLZ / Ort" value={`${data.kundePlz} ${data.kundeOrt}`}
          onChange={v => { const [plz, ...rest] = v.split(" "); set("kundePlz", plz); set("kundeOrt", rest.join(" ")); }} />
      </div>
      <hr className="be-divider" />
      <div className="be-field-row be-field-row-2">
        <BeField label="USt-Satz (%)" value={data.ustSatz} type="select" onChange={v => set("ustSatz", v)}
          options={[{value:"19",label:"19 %"},{value:"7",label:"7 %"},{value:"0",label:"0 % (steuerfrei)"}]} />
        <BeField label="Zahlungsziel (Tage)" value={data.zahlungsziel} onChange={v => set("zahlungsziel", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Rechnungs-Nr." value={data.rechnungsNr} onChange={v => set("rechnungsNr", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Skonto (%)" value={data.skontoPct} onChange={v => set("skontoPct", v)} />
        <BeField label="Skonto innerhalb (Tage)" value={data.skontoTage} onChange={v => set("skontoTage", v)} />
      </div>
      <BeRabattBlock data={data} set={set} />
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>📦 POSITIONEN</div>
      <BePositionenEditor positionen={data.positionen} onChange={v => set("positionen", v)} />
    </>
  );
}

function BeFormKontoauszug({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <>
      <BeField label="Bank" value={data.bank} onChange={v => set("bank", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Kontoinhaber" value={data.inhaber} onChange={v => set("inhaber", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="IBAN" value={data.iban} onChange={v => set("iban", v)} />
        <BeField label="Saldo Vortrag (€)" value={data.saldoVor} onChange={v => set("saldoVor", v)} />
      </div>
      <hr className="be-divider" />
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>💳 BUCHUNGEN · Gelbe Zeile = Buchungsaufgabe</div>
      <BeBuchungenEditor buchungen={data.buchungen} onChange={v => set("buchungen", v)} />
    </>
  );
}

function BeFormUeberweisung({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <>
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>👤 AUFTRAGGEBER</div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Name" value={data.auftraggeberName} onChange={v => set("auftraggeberName", v)} />
        <BeField label="IBAN" value={data.auftraggeberIban} onChange={v => set("auftraggeberIban", v)} />
      </div>
      <hr className="be-divider" />
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>🏢 EMPFÄNGER</div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Name" value={data.empfaengerName} onChange={v => set("empfaengerName", v)} />
        <BeField label="IBAN" value={data.empfaengerIban} onChange={v => set("empfaengerIban", v)} />
      </div>
      <hr className="be-divider" />
      <div className="be-field-row be-field-row-2">
        <BeField label="Betrag (€)" value={data.betrag} onChange={v => set("betrag", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
      </div>
      <BeField label="Verwendungszweck" value={data.verwendung} onChange={v => set("verwendung", v)} />
      <BeField label="Skonto-Abzug (€, 0 = keiner)" value={data.skontoBetrag} onChange={v => set("skontoBetrag", v)} />
    </>
  );
}

function BeFormEmail({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <>
      <div className="be-field-row be-field-row-2">
        <BeField label="Von" value={data.von} onChange={v => set("von", v)} />
        <BeField label="An" value={data.an} onChange={v => set("an", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
        <BeField label="Betreff" value={data.betreff} onChange={v => set("betreff", v)} />
      </div>
      <BeField label="Nachricht" type="textarea" value={data.text} onChange={v => set("text", v)} style={{minHeight:140}} />
    </>
  );
}

function BeFormQuittung({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <>
      <div className="be-field-row be-field-row-2">
        <BeField label="Quittungs-Nr." value={data.quittungsNr} onChange={v => set("quittungsNr", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
      </div>
      <BeField label="Aussteller (Empfänger des Geldes)" value={data.aussteller} onChange={v => set("aussteller", v)} />
      <BeField label="Zahlender (Unternehmen)" value={data.empfaenger} onChange={v => set("empfaenger", v)} />
      <BeField label="Betrag (€ brutto)" value={data.betrag} onChange={v => set("betrag", v)} />
      <BeField label="Verwendungszweck / Ware" value={data.zweck} onChange={v => set("zweck", v)} />
    </>
  );
}

// ── Vorschau-Komponenten ─────────────────────────────────────────────────────
// ── Modernes Beleg-Design ────────────────────────────────────────────────────
const BV = {
  // Rechnung: zweispaltiger Header, Accent-Streifen links, saubere Tabelle
  re: {
    wrap: { fontFamily:"'IBM Plex Sans',system-ui,sans-serif", fontSize:12, background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,.07)" },
    accent: { height:4, background:"linear-gradient(90deg,#0f172a 0%,#334155 60%,#e8600a 100%)" },
    header: { display:"grid", gridTemplateColumns:"1fr auto", gap:16, padding:"18px 20px 14px", borderBottom:"1px solid #f1f5f9" },
    firma: { fontWeight:800, fontSize:15, color:"#0f172a", marginBottom:2 },
    adrsub: { fontSize:11, color:"#64748b", lineHeight:1.6 },
    typBadge: active => ({ display:"inline-block", padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:".04em", background: active ? "#e8600a" : "#f1f5f9", color: active ? "#0f172a" : "#64748b", border: active ? "none" : "1px solid #e2e8f0", alignSelf:"flex-start" }),
    body: { padding:"14px 20px" },
    adressgrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:14 },
    adrlabel: { fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:4 },
    adrname: { fontWeight:700, fontSize:13 },
    adrsub2: { fontSize:11, color:"#64748b", marginTop:1 },
    chips: { display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 },
    chip: { padding:"3px 10px", borderRadius:20, background:"#f8fafc", border:"1px solid #e2e8f0", fontSize:10, color:"#64748b", fontWeight:600 },
    table: { width:"100%", borderCollapse:"collapse", fontSize:11, marginBottom:12 },
    th: { background:"#f8fafc", padding:"7px 8px", textAlign:"left", fontSize:9, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"#94a3b8", borderBottom:"2px solid #e2e8f0" },
    td: { padding:"7px 8px", borderBottom:"1px solid #f8fafc", verticalAlign:"middle" },
    tdR: { padding:"7px 8px", borderBottom:"1px solid #f8fafc", textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" },
    hlRow: { background:"#fffbeb", borderLeft:"3px solid #e8600a" },
    sumBox: { display:"flex", justifyContent:"flex-end", marginTop:4 },
    sumInner: { width:220, borderTop:"1px solid #e2e8f0", paddingTop:10 },
    sumRow: { display:"flex", justifyContent:"space-between", fontSize:11, padding:"2px 0", color:"#475569" },
    sumTotal: { display:"flex", justifyContent:"space-between", fontSize:14, fontWeight:800, color:"#0f172a", borderTop:"2px solid #0f172a", marginTop:6, paddingTop:7 },
    footer: { background:"#f8fafc", borderTop:"1px solid #f1f5f9", padding:"9px 20px", display:"flex", gap:20, fontSize:10, color:"#94a3b8" },
  },
};

function BeVorschauRechnung({ data, typ }) {
  const isAusgang = typ === "ausgangsrechnung";
  const absender = isAusgang
    ? { name: data.absenderName, strasse: data.absenderStrasse, plz: data.absenderPlz, ort: data.absenderOrt, ustId: "—" }
    : { name: data.lieferantName, strasse: data.lieferantStrasse, plz: data.lieferantPlz, ort: data.lieferantOrt, ustId: data.lieferantUStId };
  const empfNamen = isAusgang ? data.kundeName : data.empfaengerName;
  const empfAdr1  = isAusgang ? data.kundeStrasse : data.empfaengerStrasse;
  const empfAdr2  = isAusgang ? `${data.kundePlz} ${data.kundeOrt}` : `${data.empfaengerPlz} ${data.empfaengerOrt}`;

  const ust = Number(data.ustSatz) / 100;
  let warenwert = 0;
  data.positionen.forEach(p => { warenwert += parseGeld(p.menge) * parseGeld(p.ep); });
  const bezug        = parseGeld(data.bezugskosten);
  const rabattPct    = data.rabattAktiv ? (parseFloat(data.rabattPct) || 0) : 0;
  const rabattBetrag = r2(warenwert * rabattPct / 100);
  const netto        = r2(warenwert - rabattBetrag + bezug);
  const ustBetrag    = r2(netto * ust);
  const brutto       = r2(netto + ustBetrag);
  const skontoBetrag = r2(brutto * parseFloat(data.skontoPct || 0) / 100);
  const R = BV.re;

  return (
    <div style={R.wrap}>
      <div style={R.accent} />
      <div style={R.header}>
        <div>
          <div style={R.firma}>{absender.name}</div>
          <div style={R.adrsub}>{absender.strasse} · {absender.plz} {absender.ort}</div>
          {absender.ustId && absender.ustId !== "—" && <div style={R.adrsub}>USt-IdNr: {absender.ustId}</div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={R.typBadge(true)}>{isAusgang ? "RECHNUNG" : "EINGANGSRECHNUNG"}</div>
          <div style={{fontSize:11,color:"#64748b",marginTop:8}}>Nr. <strong style={{color:"#0f172a"}}>{data.rechnungsNr}</strong></div>
          <div style={{fontSize:11,color:"#64748b"}}>Datum: <strong style={{color:"#0f172a"}}>{fmtDatum(data.datum)}</strong></div>
        </div>
      </div>
      <div style={R.body}>
        <div style={R.adressgrid}>
          <div>
            <div style={R.adrlabel}>Rechnungsempfänger</div>
            <div style={R.adrname}>{empfNamen}</div>
            <div style={R.adrsub2}>{empfAdr1}</div>
            <div style={R.adrsub2}>{empfAdr2}</div>
          </div>
          <div>
            <div style={R.adrlabel}>Zahlungskonditionen</div>
            <div style={{...R.adrsub2, marginBottom:3}}>Zahlungsziel: <strong>{data.zahlungsziel} Tage</strong></div>
            {parseFloat(data.skontoPct) > 0 && <div style={R.adrsub2}>Skonto: <strong>{data.skontoPct} %</strong> bei Zahlung in <strong>{data.skontoTage} Tagen</strong></div>}
            <div style={R.adrsub2}>USt-Satz: <strong>{data.ustSatz} %</strong></div>
          </div>
        </div>

        <table style={R.table}>
          <thead>
            <tr>
              {["Pos.", "Bezeichnung", "Menge", "Einh.", "EP netto", "Gesamt netto"].map((h,i) =>
                <th key={i} style={{...R.th, textAlign: i>=2 ? "right" : "left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.positionen.map((p, i) => {
              const gp = r2(parseGeld(p.menge) * parseGeld(p.ep));
              const hl = p.highlight;
              return (
                <tr key={p.id} style={hl ? R.hlRow : {}}>
                  <td style={{...R.td, ...(hl?{borderLeft:"3px solid #e8600a"}:{})}}>{i+1}</td>
                  <td style={{...R.td, fontWeight: hl ? 700 : 400}}>{p.artikel}{hl && <span style={{marginLeft:6,fontSize:9,background:"#e8600a",color:"#0f172a",padding:"1px 5px",borderRadius:3,fontWeight:800}}>BUCHEN</span>}</td>
                  <td style={{...R.tdR}}>{p.menge}</td>
                  <td style={{...R.td}}>{p.einheit}</td>
                  <td style={{...R.tdR}}>{be_fmt(parseGeld(p.ep))} €</td>
                  <td style={{...R.tdR, fontWeight:600}}>{be_fmt(gp)} €</td>
                </tr>
              );
            })}
            {bezug > 0 && (
              <tr>
                <td style={R.td}></td>
                <td style={{...R.td, color:"#64748b", fontStyle:"italic"}}>Bezugskosten (Transport/Fracht)</td>
                <td colSpan={3} style={R.td}></td>
                <td style={{...R.tdR, color:"#64748b"}}>{be_fmt(bezug)} €</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={R.sumBox}>
          <div style={R.sumInner}>
            <div style={R.sumRow}><span>Warenwert (netto)</span><span>{be_fmt(warenwert)} €</span></div>
            {rabattBetrag > 0 && <div style={{...R.sumRow, color:"#b45309"}}><span>− {data.rabattArt} ({data.rabattPct} %)</span><span>−{be_fmt(rabattBetrag)} €</span></div>}
            {bezug > 0 && <div style={R.sumRow}><span>+ Bezugskosten</span><span>{be_fmt(bezug)} €</span></div>}
            <div style={R.sumRow}><span>Nettobetrag</span><span style={{fontWeight:600,color:"#0f172a"}}>{be_fmt(netto)} €</span></div>
            {ust > 0 && <div style={R.sumRow}><span>zzgl. {data.ustSatz} % USt</span><span>{be_fmt(ustBetrag)} €</span></div>}
            <div style={R.sumTotal}><span>Rechnungsbetrag</span><span style={{fontFamily:"'IBM Plex Mono',monospace"}}>{be_fmt(brutto)} €</span></div>
            {skontoBetrag > 0 && (
              <div style={{...R.sumRow, fontSize:10, marginTop:6, background:"#f0fdf4", padding:"4px 8px", borderRadius:4, color:"#15803d"}}>
                <span>Bei Skonto ({data.skontoPct} %) zahlen:</span>
                <span style={{fontWeight:700}}>{be_fmt(r2(brutto - skontoBetrag))} €</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={R.footer}>
        <span>Rechnungsnummer: {data.rechnungsNr}</span>
        <span>Rechnungsdatum: {fmtDatum(data.datum)}</span>
        {absender.ustId && <span>USt-IdNr: {absender.ustId}</span>}
      </div>
    </div>
  );
}

function BeVorschauKontoauszug({ data }) {
  let saldo = parseGeld(data.saldoVor);
  const rows = data.buchungen.map(b => {
    const raw = b.betrag.replace(/\s/g,"");
    const neg = raw.startsWith("-");
    const num = parseGeld(neg ? raw.slice(1) : (raw.startsWith("+") ? raw.slice(1) : raw)) * (neg ? -1 : 1);
    saldo = r2(saldo + num);
    return { ...b, betragNum: num, saldoNach: saldo };
  });
  return (
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",fontSize:12,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
      {/* Bank-Header */}
      <div style={{background:"linear-gradient(135deg,#1e3a5f 0%,#1e40af 100%)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontWeight:900,fontSize:16,color:"#fff",letterSpacing:"-.01em"}}>{data.bank}</div>
          <div style={{fontSize:10,color:"#93c5fd",marginTop:2}}>Kontoauszug vom {fmtDatum(data.datum)}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:"#93c5fd"}}>Kontoinhaber</div>
          <div style={{fontWeight:700,color:"#fff",fontSize:12}}>{data.inhaber}</div>
        </div>
      </div>
      {/* IBAN-Strip */}
      <div style={{background:"#dbeafe",padding:"6px 20px",display:"flex",justifyContent:"space-between",fontSize:10,color:"#1e40af",fontWeight:600}}>
        <span>IBAN: {data.iban}</span>
        <span>Saldo Vortrag: <strong>{data.saldoVor} €</strong></span>
      </div>
      {/* Buchungen */}
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead>
          <tr style={{background:"#f8fafc"}}>
            {["Datum","Buchungstext","Betrag","Saldo"].map((h,i) =>
              <th key={i} style={{padding:"7px 12px",textAlign:i>=2?"right":"left",fontSize:9,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#94a3b8",borderBottom:"2px solid #e2e8f0"}}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((b,i) => (
            <tr key={b.id} style={{background: b.highlight ? "#fffbeb" : i%2===0 ? "#fff" : "#fafafa"}}>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",color:"#64748b",whiteSpace:"nowrap"}}>{fmtDatum(b.datum)}</td>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",fontWeight: b.highlight ? 700 : 400, borderLeft: b.highlight ? "3px solid #e8600a" : "3px solid transparent"}}>
                {b.text}
                {b.highlight && <span style={{marginLeft:8,fontSize:9,background:"#e8600a",color:"#0f172a",padding:"2px 6px",borderRadius:3,fontWeight:800}}>▶ BUCHEN</span>}
              </td>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",textAlign:"right",fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color: b.betragNum >= 0 ? "#059669" : "#dc2626"}}>
                {b.betragNum >= 0 ? "+" : ""}{be_fmt(b.betragNum)} €
              </td>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",textAlign:"right",fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,color:"#0f172a"}}>
                {be_fmt(b.saldoNach)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BeVorschauUeberweisung({ data }) {
  const betragNum   = parseGeld(data.betrag);
  const skontoNum   = parseGeld(data.skontoBetrag);
  const ueberBetrag = r2(betragNum - skontoNum);
  const IbanFeld = ({label, name, iban}) => (
    <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px"}}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#94a3b8",marginBottom:4}}>{label}</div>
      <div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:2}}>{name}</div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"#475569",letterSpacing:".06em"}}>{iban}</div>
    </div>
  );
  return (
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",fontSize:12,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
      <div style={{height:4,background:"linear-gradient(90deg,#0f172a,#334155,#0ea5e9)"}} />
      <div style={{padding:"14px 20px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #f1f5f9"}}>
        <div>
          <div style={{fontWeight:800,fontSize:14,letterSpacing:"-.01em",color:"#0f172a"}}>SEPA-Überweisungsbeleg</div>
          <div style={{fontSize:10,color:"#64748b",marginTop:1}}>{fmtDatum(data.datum)}</div>
        </div>
        <div style={{fontSize:10,color:"#64748b",background:"#f1f5f9",padding:"3px 10px",borderRadius:20,fontWeight:600}}>SEPA Credit Transfer</div>
      </div>
      <div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <IbanFeld label="Auftraggeber" name={data.auftraggeberName} iban={data.auftraggeberIban} />
          <IbanFeld label="Empfänger" name={data.empfaengerName} iban={data.empfaengerIban} />
        </div>
        <div style={{background:"#0f172a",borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>Überweisungsbetrag</div>
            {skontoNum > 0 && <div style={{fontSize:10,color:"#64748b"}}>{be_fmt(betragNum)} € − {be_fmt(skontoNum)} € Skonto</div>}
          </div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:900,color:"#e8600a"}}>{be_fmt(ueberBetrag)} €</div>
        </div>
        <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"9px 14px"}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#94a3b8",marginBottom:3}}>Verwendungszweck</div>
          <div style={{fontWeight:600,color:"#0f172a"}}>{data.verwendung || "—"}</div>
        </div>
      </div>
      <div style={{background:"#f8fafc",borderTop:"1px solid #f1f5f9",padding:"7px 20px",fontSize:9,color:"#94a3b8",display:"flex",gap:16}}>
        <span>Datum der Ausführung: {fmtDatum(data.datum)}</span>
        <span>SEPA-Überweisung</span>
      </div>
    </div>
  );
}

function BeVorschauEmail({ data }) {
  return (
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",fontSize:12,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
      {/* E-Mail-Kopf */}
      <div style={{background:"#f8fafc",borderBottom:"1px solid #e2e8f0",padding:"14px 18px"}}>
        <div style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Mail size={16} strokeWidth={1.5} color="#475569"/></div>
          <div style={{fontWeight:700,fontSize:15,color:"#0f172a",lineHeight:1.3}}>{data.betreff || "(kein Betreff)"}</div>
        </div>
        {[["Von", data.von],["An", data.an],["Datum", fmtDatum(data.datum)]].map(([l,v]) => (
          <div key={l} style={{display:"flex",gap:8,fontSize:11,marginBottom:2}}>
            <span style={{color:"#94a3b8",fontWeight:700,width:42,flexShrink:0}}>{l}:</span>
            <span style={{color:"#374151"}}>{v}</span>
          </div>
        ))}
      </div>
      {/* Nachricht */}
      <div style={{padding:"16px 18px",lineHeight:1.8,whiteSpace:"pre-wrap",fontSize:12,color:"#1e293b",background:"#fff"}}>
        {data.text}
      </div>
    </div>
  );
}

function BeVorschauQuittung({ data }) {
  return (
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",fontSize:12,background:"#fff",border:"2px solid #0f172a",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
      {/* Quittungs-Kopf */}
      <div style={{background:"#0f172a",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:"-.02em",color:"#fff"}}>QUITTUNG</div>
          <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Nr. {data.quittungsNr}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{background:"#22c55e",color:"#fff",fontSize:10,fontWeight:800,padding:"4px 12px",borderRadius:20,marginBottom:4}}>✓ BEZAHLT</div>
          <div style={{fontSize:10,color:"#94a3b8"}}>{fmtDatum(data.datum)}</div>
        </div>
      </div>
      {/* Quittungs-Body */}
      <div style={{padding:"16px 20px"}}>
        {[
          ["Ausgestellt von", data.aussteller],
          ["Erhalten von",    data.empfaenger],
          ["Verwendungszweck", data.zweck],
        ].map(([l,v]) => (
          <div key={l} style={{display:"flex",gap:12,marginBottom:12,alignItems:"baseline"}}>
            <span style={{fontSize:10,color:"#64748b",width:130,flexShrink:0,fontWeight:700}}>{l}</span>
            <span style={{fontWeight:600,flex:1,borderBottom:"1px solid #e2e8f0",paddingBottom:2}}>{v}</span>
          </div>
        ))}
        <div style={{background:"#f8fafc",border:"2px solid #0f172a",borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
          <span style={{fontSize:11,color:"#64748b",fontWeight:700}}>Betrag (inkl. MwSt.)</span>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:900,color:"#0f172a"}}>{data.betrag} €</span>
        </div>
      </div>
      {/* Footer */}
      <div style={{borderTop:"1px solid #e2e8f0",padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc"}}>
        <span style={{fontSize:10,color:"#64748b"}}>Barzahlung bestätigt</span>
        <div style={{textAlign:"center"}}>
          <div style={{width:140,borderBottom:"1px solid #0f172a",marginBottom:3}} />
          <span style={{fontSize:9,color:"#94a3b8"}}>Unterschrift Aussteller</span>
        </div>
      </div>
    </div>
  );
}

// ── BelegEditorModal ─────────────────────────────────────────────────────────
function BelegEditorModal({ onSchliessen }) {
  const [typ, setTyp] = useState("eingangsrechnung");
  const [dataER, setDataER] = useState(defaultEingangsrechnung);
  const [dataAR, setDataAR] = useState(defaultAusgangsrechnung);
  const [dataKA, setDataKA] = useState(defaultKontoauszug);
  const [dataUB, setDataUB] = useState(defaultUeberweisung);
  const [dataEM, setDataEM] = useState(defaultEmail);
  const [dataQU, setDataQU] = useState(defaultQuittung);
  const [belegTitel, setBelegTitel] = useState("");
  const [saveState, setSaveState] = useState(null);
  const previewRef = React.useRef(null);

  const handlePrint = () => {
    const html = previewRef.current?.innerHTML || "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>BuchungsWerk · Beleg</title><style>${BE_CSS}\nbody{background:#fff;margin:0;padding:24px;}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 350);
  };

  const [beKiLaden,   setBeKiLaden]   = useState(false);
  const [beKiErgebnis,setBeKiErgebnis]= useState(null);
  const [beKiKlasse,  setBeKiKlasse]  = useState("8");
  const [beKiError,   setBeKiError]   = useState(false);

  const generiereBeKi = async () => {
    setBeKiLaden(true); setBeKiErgebnis(null); setBeKiError(null);
    const beData = { eingangsrechnung:dataER, ausgangsrechnung:dataAR, kontoauszug:dataKA, ueberweisung:dataUB, email:dataEM, quittung:dataQU }[typ];
    const belegText = belegZuText({ typ, data: beData });
    const duSie = parseInt(beKiKlasse) <= 9 ? "du/dein/dir (Schüler werden geduzt)" : "Sie/Ihr/Ihnen (Klasse 10 → Siezen)";
    const prompt = `Du bist bwr-sensei – BwR-Fachlehrer an einer bayerischen Realschule (Klasse ${beKiKlasse}, ISB LehrplanPLUS Bayern).
Erstelle auf Basis des folgenden Belegs eine korrekte Buchungsaufgabe. Sprache: ${duSie}

BELEG: ${belegText}

══════════════════════════════════════════════
ISB-KONTENPLAN BAYERN – NUR DIESE KONTEN VERWENDEN!
══════════════════════════════════════════════
AKTIVKONTEN:
0500 GR | Grundstücke · 0700 MA | Maschinen und Anlagen · 0840 FP | Fuhrpark
0860 BM | Büromaschinen · 0870 BGA | Büromöbel und Geschäftsausstattung · 0890 GWG | Geringwertige Wirtschaftsgüter
2000 R | Rohstoffe · 2010 F | Fremdbauteile · 2020 H | Hilfsstoffe · 2030 B | Betriebsstoffe
2400 FO | Forderungen aus Lieferungen und Leistungen · 2470 ZWFO | Zweifelhafte Forderungen
2600 VORST | Vorsteuer · 2800 BK | Bank (Kontokorrentkonto) · 2880 KA | Kasse · 2900 ARA | Aktive Rechnungsabgrenzung

PASSIVKONTEN:
3000 EK | Eigenkapital · 3001 P | Privatkonto · 3670 EWB | Einzelwertberichtigung
3680 PWB | Pauschalwertberichtigung · 3900 RST | Rückstellungen
4200 KBKV | Kurzfristige Bankverbindlichkeiten · 4250 LBKV | Langfristige Bankverbindlichkeiten
4400 VE | Verbindlichkeiten aus Lieferungen und Leistungen · 4800 UST | Umsatzsteuer · 4900 PRA | Passive Rechnungsabgrenzung

ERTRAGSKONTEN:
5000 UEFE | Umsatzerlöse für eigene Erzeugnisse · 5430 ASBE | Andere sonstige betriebliche Erträge
5495 EFO | Erträge aus abgeschriebenen Forderungen · 5710 ZE | Zinserträge

AUFWANDSKONTEN:
6000 AWR | Aufwendungen für Rohstoffe · 6001 BZKR | Bezugskosten für Rohstoffe
6010 AWF | Aufwendungen für Fremdbauteile · 6020 AWH | Aufwendungen für Hilfsstoffe
6030 AWB | Aufwendungen für Betriebsstoffe · 6140 AFR | Ausgangsfrachten
6200 LG | Löhne und Gehälter · 6400 AGASV | Arbeitgeberanteil zur Sozialversicherung
6520 ABSA | Abschreibungen auf Sachanlagen · 6700 AWMP | Mieten, Pachten
6750 KGV | Kosten des Geldverkehrs · 6800 BMK | Büromaterial und Kleingüter
6870 WER | Werbung · 6900 VBEI | Versicherungsbeiträge
6950 ABFO | Abschreibungen auf Forderungen · 7510 ZAW | Zinsaufwendungen

══════════════════════════════════════════════
BUCHUNGSSTRUKTUR-REGELN (ISB LehrplanPLUS Bayern)
══════════════════════════════════════════════
AUSGANGSRECHNUNG (Verkauf auf Ziel):
  → ZUSAMMENGESETZTER Buchungssatz (alle Zeilen gruppe=1):
    Zeile 1: 2400 FO an 5000 UEFE Nettobetrag (punkte:1)
    Zeile 2: 2400 FO an 4800 UST  USt-Betrag   (punkte:1)
  → Bei Sofortrabatt: Nettobetrag NACH Rabatt, kein Rabattkonto!

EINGANGSRECHNUNG (Kauf auf Ziel):
  → ZUSAMMENGESETZTER Buchungssatz (alle Zeilen gruppe=1):
    Zeile 1: 6000 AWR (o.ä.) an 4400 VE Nettobetrag (punkte:1)
    Zeile 2: 2600 VORST       an 4400 VE USt-Betrag  (punkte:1)
  → Bei Bezugskosten: 6001 BZKR als eigene Zeile (gruppe=1)
  → Bei GWG (≤800 € netto): 0890 GWG statt AWR
  → Bei Sofortrabatt: Nettobetrag nach Abzug

RECHNUNGSAUSGLEICH ÜBERWEISUNG:
  Ausgangsrechnung beglichen: 2800 BK an 2400 FO (Bruttobetrag)
  Eingangsrechnung bezahlt:   4400 VE an 2800 BK (Bruttobetrag)
  Mit Skonto (Kl. 8+): zusätzlich 6750 KGV (Käufer) bzw. 5430 ASBE (Verkäufer)

ANLAGEVERMÖGEN (Kauf auf Ziel):
  0700 MA (o.ä.) + 2600 VORST an 4400 VE

ABSCHREIBUNG: 6520 ABSA an 0700 MA (o.ä.) – kein USt-Vorgang!

══════════════════════════════════════════════
KONTOANGABE nach Klassenstufe:
══════════════════════════════════════════════
Klasse 7:    NUR Kürzel (soll_nr="" haben_nr="")
Klasse 8–10: Nummer + Kürzel (z.B. "2400", "5000", "4800")

══════════════════════════════════════════════
AUFGABENTEXT-REGEL (WICHTIG!):
══════════════════════════════════════════════
Da der Beleg direkt sichtbar ist, KEINE Belegdaten im Aufgabentext wiederholen!
NICHT nennen: USt-Satz, Skontofrist, Zahlungsziel, Beträge, Rechnungsnummer.
RICHTIG: "Buche die Eingangsrechnung in die Bücher der [Firma] ein."
FALSCH: "...19% USt, Zahlungsziel 30 Tage, Skonto 2% bei Zahlung in 14 Tagen..."

══════════════════════════════════════════════
PUNKTEVERGABE (ISB Handreichung BwR 2025)
══════════════════════════════════════════════
- 1 Punkt pro Konto-Betrag-Block (Teilbuchung im zusammengesetzten Satz)
- NR-Punkt (nebenrechnung_punkte=1): nur wenn Brutto→Netto selbst berechnet werden muss (Kl.8+)
- Reine USt-Berechnung = KEIN eigener NR-Punkt

Antworte NUR mit reinem JSON – kein Markdown, kein Text davor oder danach:
{
  "aufgabe": "Kurzer Aufgabentext (max. 1 Satz, KEINE Belegdaten wiederholen!)",
  "buchungssatz": [
    { "gruppe": 1, "soll_nr": "XXXX", "soll_name": "Kontoname (KÜRZEL)", "haben_nr": "XXXX", "haben_name": "Kontoname (KÜRZEL)", "betrag": 0.00, "punkte": 1, "erklaerung": "Buchungsgrund" }
  ],
  "nebenrechnung": "Rechenweg Brutto→Netto falls nötig, sonst leer",
  "nebenrechnung_punkte": 0,
  "punkte_gesamt": 2,
  "erklaerung": "LB-Bezug (z.B. LB2 Kl.8: Wareneinkauf auf Ziel), typische Schülerfehler"
}`;
    try {
      const json = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: 1400 }, 45000, true);
      const text = json.content?.find(c => c.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setBeKiErgebnis(parsed);
    } catch(e) {
      const msg = e?.message || "";
      setBeKiError(
        msg.includes("503") ? "KI nicht konfiguriert – API-Key fehlt auf Server" :
        msg.includes("502") ? "Anthropic-Fehler – Key ungültig oder Rate-Limit" :
        msg.includes("401") || msg.includes("403") ? "Nicht autorisiert – bitte neu einloggen" :
        msg.includes("Timeout") ? "Timeout – bitte nochmal versuchen" :
        `Fehler: ${msg || "unbekannt"}`
      );
    }
    setBeKiLaden(false);
  };

  const dataMap = {
    eingangsrechnung: [dataER, setDataER],
    ausgangsrechnung: [dataAR, setDataAR],
    kontoauszug:      [dataKA, setDataKA],
    ueberweisung:     [dataUB, setDataUB],
    email:            [dataEM, setDataEM],
    quittung:         [dataQU, setDataQU],
  };
  const [data] = dataMap[typ];

  const handleSaveToPool = () => {
    try {
      const existing = JSON.parse(localStorage.getItem("buchungswerk_belege") || "[]");
      existing.push({
        id: be_uid(), typ,
        titel: belegTitel.trim() || `${BELEGTYPEN.find(t=>t.id===typ)?.label} vom ${new Date().toLocaleDateString("de-DE")}`,
        data, erstellt: new Date().toISOString(),
      });
      localStorage.setItem("buchungswerk_belege", JSON.stringify(existing));
      setSaveState("ok"); setTimeout(() => setSaveState(null), 2500);
    } catch { setSaveState("error"); setTimeout(() => setSaveState(null), 3000); }
  };

  const typLabel = BELEGTYPEN.find(t => t.id === typ)?.label;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1100, display:"flex", flexDirection:"column" }}>
      <style>{BE_CSS}</style>
      {/* Modal-Header */}
      <div style={{ background:"#0f172a", borderBottom:"2px solid #e8600a", padding:"0 24px", height:"52px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ color:"#fff", fontWeight:800, fontSize:"17px" }}>Buchungs<span style={{color:"#e8600a"}}>Werk</span></span>
          <span style={{ fontSize:"10px", fontWeight:700, background:"#e8600a22", color:"#e8600a", border:"1px solid #e8600a55", borderRadius:"4px", padding:"2px 8px", letterSpacing:".06em", textTransform:"uppercase" }}>Beleg-Editor</span>
        </div>
        <button onClick={onSchliessen} style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:"7px", padding:"5px 14px", cursor:"pointer", fontSize:"12px", fontWeight:700 }}>✕ Schließen</button>
      </div>
      {/* Typ-Tabs */}
      <div className="be-typ-bar">
        {BELEGTYPEN.map(t => (
          <button key={t.id} className={`be-typ-tab ${typ === t.id ? "active" : ""}`} onClick={() => setTyp(t.id)}>
            {React.createElement(t.icon, { size: 13, style: { verticalAlign: "middle", marginRight: "4px" } })}{t.label}
          </button>
        ))}
      </div>
      {/* Body */}
      <div className="be-root" style={{ flex:1, overflow:"hidden" }}>
        <div className="be-body">
          {/* Formular */}
          <div className="be-panel be-panel-form">
            <div className="be-panel-head" style={{display:"flex",alignItems:"center",gap:6}}><PenLine size={12} strokeWidth={1.5}/>{typLabel} · Felder bearbeiten</div>
            <div className="be-panel-body">
              {typ === "eingangsrechnung" && <BeFormEingangsrechnung data={dataER} setData={setDataER} />}
              {typ === "ausgangsrechnung" && <BeFormAusgangsrechnung data={dataAR} setData={setDataAR} />}
              {typ === "kontoauszug"      && <BeFormKontoauszug      data={dataKA} setData={setDataKA} />}
              {typ === "ueberweisung"     && <BeFormUeberweisung     data={dataUB} setData={setDataUB} />}
              {typ === "email"            && <BeFormEmail            data={dataEM} setData={setDataEM} />}
              {typ === "quittung"         && <BeFormQuittung         data={dataQU} setData={setDataQU} />}
            </div>
            <div className="be-action-bar">
              <input className="be-field-input" placeholder={`Titel (z. B. "${typLabel} mit Mengenrabatt, Kl. 9")`}
                value={belegTitel} onChange={e => setBelegTitel(e.target.value)} style={{fontSize:12}} />
              <div style={{ display:"flex", gap:8 }}>
                <button className="be-btn-save"
                  style={saveState === "ok" ? {background:"#16a34a",flex:1} : saveState === "error" ? {background:"#dc2626",flex:1} : {flex:1}}
                  onClick={handleSaveToPool}>
                  {saveState === "ok" ? "✓ In Eigene Belege gespeichert!" : saveState === "error" ? "⚠ Fehler" : "📥 In BuchungsWerk übernehmen"}
                </button>
                <button className="be-btn-print" onClick={handlePrint} style={{flexShrink:0}}>🖨</button>
              </div>
            </div>
          </div>
          {/* Vorschau + KI */}
          <div className="be-panel" style={{ display:"flex", flexDirection:"column" }}>
            <div className="be-panel-head" style={{ flexShrink:0 }}>👁 Live-Vorschau · {typLabel}</div>
            {/* Einziger Scroll-Container für Vorschau + KI */}
            <div ref={previewRef} style={{ flex:1, overflowY:"auto", minHeight:0 }}>
              <div className="be-preview-wrap" style={{ overflowY:"visible", maxHeight:"none" }}>
                {typ === "eingangsrechnung" && <BeVorschauRechnung data={dataER} typ="eingangsrechnung" />}
                {typ === "ausgangsrechnung" && <BeVorschauRechnung data={dataAR} typ="ausgangsrechnung" />}
                {typ === "kontoauszug"      && <BeVorschauKontoauszug data={dataKA} />}
                {typ === "ueberweisung"     && <BeVorschauUeberweisung data={dataUB} />}
                {typ === "email"            && <BeVorschauEmail data={dataEM} />}
                {typ === "quittung"         && <BeVorschauQuittung data={dataQU} />}
              </div>
              {/* ── KI-Aufgabe ── */}
              <div style={{ padding:"12px 16px", borderTop:"1px solid #e2e8f0", background:"#f8fafc" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: beKiErgebnis ? 10 : 0 }}>
                  <span style={{ fontWeight:700, fontSize:13, color:"#0f172a", flex:1 }}>🤖 KI-Aufgabe generieren</span>
                  {["7","8","9","10"].map(k => (
                    <button key={k} onClick={() => setBeKiKlasse(k)}
                      style={{ padding:"3px 10px", borderRadius:20, border:"1.5px solid", borderColor:beKiKlasse===k?"#0f172a":"#e2e8f0", background:beKiKlasse===k?"#0f172a":"#fff", color:beKiKlasse===k?"#fff":"#475569", fontWeight:700, cursor:"pointer", fontSize:12 }}>
                      Kl.{k}
                    </button>
                  ))}
                  <button onClick={generiereBeKi} disabled={beKiLaden}
                    style={{ padding:"6px 14px", background:beKiLaden?"#94a3b8":"#e8600a", color:"#0f172a", border:"none", borderRadius:8, fontWeight:800, fontSize:12, cursor:beKiLaden?"not-allowed":"pointer" }}>
                    {beKiLaden ? "Generiere…" : beKiErgebnis ? "Neue Aufgabe" : "Generieren"}
                  </button>
                </div>
                {beKiError && <div style={{ fontSize:12, color:"#dc2626", padding:"6px 10px", background:"#fee2e2", borderRadius:6 }}>⚠ {beKiError}</div>}
                {beKiErgebnis && (
                  <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 12px", fontSize:12 }}>
                    <div style={{ fontWeight:700, color:"#0f172a", marginBottom:5 }}>{beKiErgebnis.punkte_gesamt ?? "?"} P · {beKiErgebnis.aufgabe}</div>
                    {(beKiErgebnis.buchungssatz || []).map((z, i) => (
                      <div key={i} style={{ fontFamily:"monospace", fontSize:11, color:"#0f172a", padding:"2px 0" }}>
                        <span style={{ color:"#1d4ed8", fontWeight:700 }}>{z.soll_nr} {z.soll_name}</span>
                        <span style={{ color:"#64748b", margin:"0 6px" }}>an</span>
                        <span style={{ color:"#dc2626", fontWeight:700 }}>{z.haben_nr} {z.haben_name}</span>
                        <span style={{ color:"#059669", marginLeft:6 }}>{typeof z.betrag==="number"?z.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}):z.betrag} €</span>
                      </div>
                    ))}
                    {beKiErgebnis.erklaerung && <div style={{ marginTop:6, fontSize:11, color:"#92400e", background:"#fffbeb", borderRadius:5, padding:"4px 8px" }}>💡 {beKiErgebnis.erklaerung}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default BelegEditorModal;
export { BeVorschauRechnung, BeVorschauKontoauszug, BeVorschauUeberweisung, BeVorschauEmail, BeVorschauQuittung };
