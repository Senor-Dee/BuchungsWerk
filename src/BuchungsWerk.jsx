// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Anton Gebert <info@buchungswerk.org> - BuchungsWerk

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { PenLine, ClipboardList, Factory, FileText, Zap, Timer, Search,
         TrendingUp, BookOpen, GraduationCap, BookMarked, Settings,
         CheckSquare, Files, Bot, Download, Upload, Landmark, ArrowLeftRight,
         Mail, AtSign, Receipt, ReceiptEuro, FilePen, Printer, User, Settings2, Eye, HelpCircle, FolderOpen,
         Hash, BarChart2, Package, Megaphone, Tag, Users, Briefcase,
         Building2, AlertTriangle, Calendar, TrendingDown, Calculator,
         Lock, Library, Layers, Wrench, Component, Fuel,
         Sun, Trees, Scissors, Dumbbell,
         Save, Monitor, Laptop, Smile, Frown, Sprout, Star, Trophy, Flame,
         RefreshCw, MessageSquare, XCircle, Award, Paperclip, QrCode } from "lucide-react";
import { useStreak } from "./hooks/useStreak.js";
import { StreakBadge, StreakCelebration } from "./components/StreakBadge.jsx";
import { useLevel } from "./hooks/useLevel.js";
import { LevelUpdate } from "./components/LevelCard.jsx";

import { ICON_MAP, IconFor } from "./components/IconFor.jsx";
import DraggableHaken from "./components/DraggableHaken.jsx";
import MaterialienModal from "./components/export/MaterialienModal.jsx";
import KopfzeilenEditor, { DEFAULT_KOPFZEILE } from "./components/export/KopfzeilenEditor.jsx";
import H5PModal from "./components/quiz/H5PModal.jsx";
import APUebungModal from "./components/modals/APUebungModal.jsx";
import EigeneBelege from "./components/beleg/EigeneBelege.jsx";
import { apiFetch, API_URL } from "./api.js";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import { r2, fmt, pick, rnd, fmtIBAN, duSie, duSieGross, anrede,
         BUCHUNGS_JAHR, rgnr, augnr, fakeDatum, berechnePunkte,
         WERKSTOFF_TYPEN, LB_INFO, NOTEN_ANKER, notenTabelle } from "./utils.js";
import { S } from "./styles.js";
import { DEFAULT_SETTINGS, SettingsContext, useSettings,
         ladeSettings, speichereSettings,
         ladeStreak, aktualisiereStreak, streakEmoji,
         ladeMastery, trackMastery, masteryLevel } from "./settings.js";
import { LIEFERANTEN, KUNDEN, UNTERNEHMEN, KOMPLEX_STEP_DEFS,
         mkEingangsRE, mkAusgangsRE, mkUeberweisung, mkKontoauszug, mkEmail } from "./data/stammdaten.js";
import { AUFGABEN_POOL } from "./data/aufgabenPool.js";
import { KONTEN, getKonto, getKürzel, getVollname,
         _KUERZEL_SET, _KUERZEL_REGEX, _KUERZEL_TO_NR,
         KONTEN_KLASSEN, KONTEN_TYP_FARBEN } from "./data/kontenplan.js";
import { exportBuchungssatzHTML, exportNrHTML, exportKomplexHTML,
         exportFirmaHTML, buildKopfzeilenHTML, generateExportHTML,
         makeBelegDocx, buildDocxBlob, generatePrintHTML } from "./utils/exportFunctions.js";
import { shuffleArr, fmtBtr, fmtNum, pick3Distractors, bestimmeFragetyp,
         serialisiereBeleg, macheDragKonten, macheFillBlanks, macheSingleChoice,
         macheTrueFalse, macheDragKalk, generiereMatchingFragen,
         generiereAlleQuizFragen, generateQuizHTML } from "./utils/quizGenerator.js";
import { generiereAPSatz, gesamtpunkte,
         AP_WAHLTEIL_6, AP_WAHLTEIL_7, AP_WAHLTEIL_8 } from "./data/apAufgaben.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import SupportButton from "./components/SupportButton.jsx";
import DisclaimerModal from "./components/modals/DisclaimerModal.jsx";
import LehrerDashboard from "./components/simulation/LehrerDashboard.jsx";
import { FirmaLogoSVG, BelegAnzeige, belegToGeschaeftsfall } from "./components/beleg/BelegAnzeige.jsx";
import { KontenplanModal, KürzelSpan, renderMitTooltips } from "./components/kontenplan/KontenplanModal.jsx";
import MasteryModal from "./components/modals/MasteryModal.jsx";
import EinstellungenModal from "./components/modals/EinstellungenModal.jsx";
import BelegEditorModal from "./components/beleg/BelegEditorModal.jsx";
import { BANK_IBAN, BANK_START, BANK_AUFGABEN, DESK_MAP,
         BANK8_AUFGABEN, KALENDER8_EINTRAEGE, KALENDER_EINTRAEGE,
         BOERSEN_AKTIEN, BOERSEN_EREIGNISSE,
         BANK9_AUFGABEN, KALENDER9_EINTRAEGE,
         BANK10_AUFGABEN, KALENDER10_EINTRAEGE,
         SIM_SCHWIERIGKEITEN, simStartKonten, simKto, simEreignisse } from "./data/simulatorDaten.js";
import { SchrittTyp } from "./components/wizard/SchrittTyp.jsx";
import { SchrittFirma } from "./components/wizard/SchrittFirma.jsx";



// ── Schaubild-Komponenten (SVG, selbst generiert – kein Urheberrecht) ────────
function LinienDiagramm({ daten }) {
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

function BalkenDiagramm({ daten }) {
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

function SchaubildAnzeige({ schaubild }) {
  if (!schaubild) return null;
  return (
    <div style={{ margin: "12px 0" }}>
      {schaubild.typ === "linie" && <LinienDiagramm daten={schaubild} />}
      {schaubild.typ === "balken" && <BalkenDiagramm daten={schaubild} />}
    </div>
  );
}

function GeschaeftsfallKarte({ text, editText, onEdit, isEditing, onSave, onReset, onCancel, onKI, kiLaden }) {
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


// ══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE HAKEN – ISB-Korrekturzeichen, frei verschiebbar und löschbar
// Bedienung: Ziehen = verschieben | Doppelklick = zurücksetzen
//            Rechtsklick (Desktop) / Long-Press >600ms (iOS) = löschen
// ══════════════════════════════════════════════════════════════════════════════
function BuchungsSatz({ soll, haben }) {
  const sollLen = soll.length;
  const habenLen = haben.length;
  const rows = Math.max(sollLen, habenLen);

  const col = {
    nr:    { fontFamily: "'Courier New',monospace", fontWeight: 700, minWidth: "44px" },
    kürz:  { fontFamily: "'Courier New',monospace", fontWeight: 700, minWidth: "62px" },
    betr:  { fontFamily: "'Courier New',monospace", minWidth: "90px", textAlign: "right", paddingRight: "6px" },
    an:    { fontFamily: "'Courier New',monospace", fontWeight: 700, color: "rgba(240,236,227,0.35)", minWidth: "30px", textAlign: "center", padding: "0 6px" },
  };

  const anRow = sollLen - 1;

  return (
    <div style={{ fontFamily: "'Courier New',monospace", fontSize: "14px", lineHeight: 2.1,
                  background: "rgba(240,236,227,0.05)", border: "1.5px solid rgba(240,236,227,0.15)", borderRadius: "8px",
                  padding: "12px 16px", display: "inline-block", minWidth: "100%" }}>
      {Array.from({ length: rows }).map((_, rowIdx) => {
        const s = rowIdx < sollLen ? soll[rowIdx] : null;
        const hIdx = rowIdx - anRow;
        const h = hIdx >= 0 && hIdx < habenLen ? haben[hIdx] : null;
        const showAn = rowIdx === anRow;

        return (
          <div key={rowIdx} style={{ display: "flex", alignItems: "baseline", gap: "0" }}>
            {/* SOLL-Seite: Nr  Kürzel  ✓  Betrag */}
            <div style={{ display: "flex", alignItems: "baseline", minWidth: "270px", gap: "4px" }}>
              {s ? (
                <>
                  <span style={{ ...col.nr, color: "#93c5fd" }}>{s.nr}</span>
                  <KürzelSpan nr={s.nr} style={{ ...col.kürz, color: "#93c5fd" }} />
                  <DraggableHaken />
                  <span style={{ ...col.betr, color: "rgba(240,236,227,0.8)" }}>{fmt(s.betrag)} €</span>
                </>
              ) : (
                <span style={{ minWidth: "220px" }}></span>
              )}
            </div>
            {/* "an" Trennwort */}
            <span style={{ ...col.an, visibility: showAn ? "visible" : "hidden" }}>an</span>
            {/* HABEN-Seite: Nr  Kürzel  ✓  Betrag */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              {h ? (
                <>
                  <span style={{ ...col.nr, color: "#fca5a5" }}>{h.nr}</span>
                  <KürzelSpan nr={h.nr} style={{ ...col.kürz, color: "#fca5a5" }} />
                  <DraggableHaken />
                  <span style={{ ...col.betr, color: "rgba(240,236,227,0.8)" }}>{fmt(h.betrag)} €</span>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NebenrechnungBox({ nrs, nrPunkte = 0 }) {
  if (!nrs || nrs.length === 0) return null;
  return (
    <div style={{ background: "rgba(232,96,10,0.07)", border: "1px solid rgba(232,96,10,0.22)", borderRadius: "8px", padding: "10px 14px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#e8600a", textTransform: "uppercase", display:"flex", alignItems:"center", gap:4 }}><Calculator size={11} strokeWidth={1.5}/>Nebenrechnung</div>
        {nrPunkte > 0 && (
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: nrPunkte }).map((_, i) => (
              <DraggableHaken key={i} />
            ))}
          </div>
        )}
      </div>
      <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
        <tbody>
          {nrs.map((nr, i) => (
            <tr key={i}>
              <td style={{ color: "rgba(240,236,227,0.7)", fontWeight: 600, paddingRight: "12px", paddingBottom: "3px" }}>{nr.label}</td>
              <td style={{ color: "rgba(240,236,227,0.55)", fontFamily: "monospace", paddingRight: "12px" }}>{nr.formel}</td>
              <td style={{ color: "#f0ece3", fontFamily: "monospace", fontWeight: 700, textAlign: "right" }}>= {nr.ergebnis}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchemaTabelle({ rows }) {
  return (
    <div style={{ border: "1px solid rgba(240,236,227,0.12)", borderRadius: "8px", overflow: "hidden" }}>
      <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((r, i) => {
            const isInfo = typeof r.wert !== "number";
            return (
              <tr key={i} style={{ background: r.highlight ? "rgba(74,222,128,0.1)" : isInfo ? "rgba(240,236,227,0.03)" : r.bold ? "rgba(240,236,227,0.05)" : "transparent", borderTop: r.trennlinie ? "2px solid rgba(240,236,227,0.3)" : i > 0 ? "1px solid rgba(240,236,227,0.07)" : "none" }}>
                <td style={{ padding: isInfo ? "4px 14px 4px 20px" : "7px 14px", color: r.highlight ? "#4ade80" : isInfo ? "rgba(240,236,227,0.4)" : r.bold ? "#f0ece3" : "rgba(240,236,227,0.7)", fontWeight: r.bold || r.highlight ? 700 : 400, fontStyle: isInfo ? "italic" : "normal", paddingLeft: !isInfo && (r.label.startsWith("+") || r.label.startsWith("−") || r.label.startsWith("×")) ? "28px" : undefined }} colSpan={isInfo ? 2 : 1}>
                  {isInfo ? `ℹ ${r.label}` : r.label}
                </td>
                {!isInfo && (
                  <td style={{ padding: "7px 14px", textAlign: "right", fontFamily: "monospace", fontWeight: r.bold || r.highlight ? 700 : 400, color: r.highlight ? "#4ade80" : r.bold ? "#f0ece3" : "rgba(240,236,227,0.55)" }}>
                    {`${fmt(r.wert)} ${r.einheit}`}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AngebotsVergleichAufgabe({ angebote }) {
  // Zeigt nur die Angaben (ohne Beträge) – für die Aufgabenstellung
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
      {angebote.map((a, ai) => (
        <div key={ai} style={{ border: "1px solid rgba(240,236,227,0.12)", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ background: "rgba(240,236,227,0.05)", padding: "8px 12px", borderBottom: "1px solid rgba(240,236,227,0.1)", fontWeight: 700, fontSize: "13px", color: "#f0ece3" }}>
            {a.name} – {a.lief}
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 400 }}>{a.ort}</div>
          </div>
          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Listeneinkaufspreis", `${fmt(a.k.lep)} €`, false],
                [`Sofortrabatt`, `${a.k.rabPct} %`, false],
                [`Liefererskonto`, `${a.skPct} %`, false],
                ["Bezugskosten", `${fmt(a.k.bzkBetrag)} €`, false],
              ].map(([label, val, bold], i) => (
                <tr key={i} style={{ borderTop: i > 0 ? "1px solid rgba(240,236,227,0.07)" : "none" }}>
                  <td style={{ padding: "6px 12px", color: bold ? "#f0ece3" : "rgba(240,236,227,0.6)", fontWeight: bold ? 700 : 400 }}>{label}</td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: bold ? 700 : 400, color: bold ? "#f0ece3" : "rgba(240,236,227,0.7)" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function AngebotsVergleichLoesung({ angebote, gewinner }) {
  // Zeigt das vollständige ausgefüllte Schema – nur in der Lösung
  const rowLabels = angebote[0].rows.map(r => r.label);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", border: "1px solid rgba(240,236,227,0.12)", borderRadius: "8px", overflow: "hidden" }}>
        <thead>
          <tr>
            <th style={{ padding: "7px 12px", textAlign: "left", background: "rgba(240,236,227,0.05)", borderBottom: "2px solid rgba(240,236,227,0.12)", color: "rgba(240,236,227,0.6)", fontWeight: 700, width: "42%" }}>Position</th>
            {angebote.map((a, ai) => (
              <th key={ai} style={{ padding: "7px 12px", textAlign: "right",
                background: gewinner === ai ? "rgba(74,222,128,0.1)" : "rgba(240,236,227,0.04)",
                borderBottom: "2px solid " + (gewinner === ai ? "#4ade80" : "rgba(240,236,227,0.1)"),
                color: gewinner === ai ? "#4ade80" : "#f0ece3", fontWeight: 800 }}>
                {a.name} {gewinner === ai ? "✓" : ""}
                <div style={{ fontSize: "10px", fontWeight: 400, color: "rgba(240,236,227,0.4)" }}>{a.lief}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {angebote[0].rows.map((r, ri) => {
            const isInfo = typeof r.wert !== "number";
            if (isInfo) return null;
            return (
              <tr key={ri} style={{ background: r.bold ? "rgba(240,236,227,0.05)" : "transparent", borderTop: r.trennlinie ? "2px solid rgba(240,236,227,0.25)" : "1px solid rgba(240,236,227,0.07)" }}>
                <td style={{ padding: "6px 12px", color: r.bold ? "#f0ece3" : "rgba(240,236,227,0.6)", fontWeight: r.bold ? 700 : 400,
                  paddingLeft: r.label.startsWith("+") || r.label.startsWith("−") ? "24px" : undefined }}>
                  {r.label}
                </td>
                {angebote.map((a, ai) => {
                  const cell = a.rows[ri];
                  const isWinner = gewinner === ai;
                  return (
                    <td key={ai} style={{ padding: "6px 12px", textAlign: "right", fontFamily: "monospace",
                      fontWeight: cell?.bold || cell?.highlight ? 700 : 400,
                      color: cell?.highlight && isWinner ? "#4ade80" : cell?.bold ? "#f0ece3" : "rgba(240,236,227,0.55)",
                      background: cell?.highlight && isWinner ? "rgba(74,222,128,0.12)" : cell?.highlight ? "rgba(250,204,21,0.1)" : "transparent" }}>
                      {cell && typeof cell.wert === "number" ? `${fmt(cell.wert)} €` : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: "8px", padding: "8px 12px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "8px", fontSize: "12px", color: "#4ade80", fontWeight: 700 }}>
        🏆 {angebote[gewinner].name} ({angebote[gewinner].lief}) – Einstandspreis {fmt(angebote[gewinner].k.einst)} € &lt; {fmt(angebote[1-gewinner].k.einst)} € &nbsp;→&nbsp; Kauf zum ZielEP: <strong>{fmt(angebote[gewinner].rows.find(r => r.highlight)?.wert)} €</strong>
      </div>
    </div>
  );
}

const BELEG_LABEL = { eingangsrechnung: "Eingangsrechnung", ausgangsrechnung: "Ausgangsrechnung", kontoauszug: "Kontoauszug", ueberweisung: "Online-Überweisung", email: "E-Mail" };

// ══════════════════════════════════════════════════════════════════════════════
// T-KONTEN-KOMPONENTE
// ══════════════════════════════════════════════════════════════════════════════
function TKonten({ soll, haben }) {
  // Group all entries by account number
  const kontenMap = {};
  soll.forEach(k => {
    if (!kontenMap[k.nr]) kontenMap[k.nr] = { nr: k.nr, soll: [], haben: [] };
    kontenMap[k.nr].soll.push(k);
  });
  haben.forEach(k => {
    if (!kontenMap[k.nr]) kontenMap[k.nr] = { nr: k.nr, soll: [], haben: [] };
    kontenMap[k.nr].haben.push(k);
  });

  return (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "4px" }}>
      {Object.values(kontenMap).map(k => {
        const sollSum = r2(k.soll.reduce((a, e) => a + e.betrag, 0));
        const habenSum = r2(k.haben.reduce((a, e) => a + e.betrag, 0));
        const saldo = r2(sollSum - habenSum);
        const kürzel = getKürzel(k.nr);
        const vollname = getVollname(k.nr);
        return (
          <div key={k.nr} style={{ border: "1px solid rgba(240,236,227,0.12)", borderRadius: "8px", minWidth: "180px", overflow: "hidden", fontSize: "13px", fontFamily: "'Courier New',monospace" }}>
            {/* Kontoname */}
            <div style={{ background: "rgba(240,236,227,0.08)", color: "#f0ece3", padding: "5px 10px", textAlign: "center", fontWeight: 700, fontSize: "12px", letterSpacing: "0.04em" }}>
              {k.nr} · <KürzelSpan nr={k.nr} style={{ color: "#f0ece3", fontFamily: "'Courier New',monospace", fontWeight: 700, fontSize: "12px" }} />
              {vollname && <div style={{ fontSize: 9, fontWeight: 400, color: "rgba(240,236,227,0.4)", marginTop: 1, letterSpacing: 0 }}>{vollname}</div>}
            </div>
            {/* T-Konto Körper */}
            <div style={{ display: "flex", background: "rgba(240,236,227,0.03)" }}>
              {/* Soll-Seite */}
              <div style={{ flex: 1, borderRight: "1px solid rgba(240,236,227,0.12)", padding: "8px 10px", minWidth: "80px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#60a5fa", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.08em" }}>Soll</div>
                {k.soll.map((e, i) => (
                  <div key={i} style={{ color: "#93c5fd", fontWeight: 600, textAlign: "right", lineHeight: 1.8 }}>{fmt(e.betrag)}</div>
                ))}
                {k.soll.length === 0 && <div style={{ color: "rgba(240,236,227,0.2)", fontSize: "11px" }}>—</div>}
              </div>
              {/* Haben-Seite */}
              <div style={{ flex: 1, padding: "8px 10px", minWidth: "80px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#f87171", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.08em" }}>Haben</div>
                {k.haben.map((e, i) => (
                  <div key={i} style={{ color: "#fca5a5", fontWeight: 600, textAlign: "right", lineHeight: 1.8 }}>{fmt(e.betrag)}</div>
                ))}
                {k.haben.length === 0 && <div style={{ color: "rgba(240,236,227,0.2)", fontSize: "11px" }}>—</div>}
              </div>
            </div>
            {/* Saldo */}
            <div style={{ borderTop: "1.5px solid rgba(240,236,227,0.1)", padding: "4px 10px", background: "rgba(240,236,227,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "rgba(240,236,227,0.4)", fontWeight: 600 }}>Saldo</span>
              <span style={{ fontWeight: 800, fontSize: "12px", color: saldo > 0 ? "#60a5fa" : saldo < 0 ? "#f87171" : "rgba(240,236,227,0.4)" }}>
                {fmt(Math.abs(saldo))} {saldo > 0 ? "S" : saldo < 0 ? "H" : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KOMPLEX-KARTE — mehrstufige Buchungskette
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// THEORIE-KARTE
// ══════════════════════════════════════════════════════════════════════════════
function TheorieKarte({ aufgabe, nr, showLoesung, klasse = 10 }) {
  const [open, setOpen] = useState(false);
  const show = showLoesung || open;
  const punkte = aufgabe.nrPunkte || 0;
  const aufgabeText = anrede(klasse, aufgabe.aufgabe);

  // ── Lückentext Renderer ──────────────────────────────────────────────────
  const renderLückentext = (lt, showAnswer) => {
    const teile = lt.text.split(/\{(\d+)\}/);
    return (
      <div style={{ lineHeight: "2.2", fontSize: "14px", color: "rgba(240,236,227,0.85)" }}>
        {teile.map((t, i) => {
          if (i % 2 === 0) return <span key={i}>{t}</span>;
          const idx = parseInt(t);
          const antwort = lt.luecken[idx];
          return showAnswer
            ? <span key={i} style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", fontWeight: 700, borderRadius: "4px", padding: "0 6px", margin: "0 2px", borderBottom: "2px solid #4ade80" }}>{antwort}</span>
            : <span key={i} style={{ display: "inline-block", minWidth: "120px", borderBottom: "2px solid rgba(240,236,227,0.25)", margin: "0 4px", verticalAlign: "bottom" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;
        })}
        <div style={{ marginTop: "14px", padding: "10px 12px", background: "rgba(240,236,227,0.05)", borderRadius: "8px", border: "1px solid rgba(240,236,227,0.12)" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Wortbank: </span>
          {lt.wortbank.map((w, i) => (
            <span key={i} style={{ display: "inline-block", margin: "2px 4px", padding: "2px 8px", background: "rgba(240,236,227,0.08)", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "13px", color: "rgba(240,236,227,0.85)" }}>{w}</span>
          ))}
        </div>
      </div>
    );
  };

  // ── Zuordnung Renderer ───────────────────────────────────────────────────
  const renderZuordnung = (zu, showAnswer) => {
    // Shuffle once on first render, stable via aufgabe.id
    const seed = aufgabe.id || "x";
    const arr   = zu.paare.map((p, i) => ({ ...p, origIdx: i, letter: String.fromCharCode(65 + i) }));
    // deterministic pseudo-shuffle based on seed
    const defs  = arr.map(p => ({ def: p.def, letter: p.letter }))
      .sort((a, b) => {
        const ha = (a.letter.charCodeAt(0) * 31 + seed.charCodeAt(0)) % 7;
        const hb = (b.letter.charCodeAt(0) * 31 + seed.charCodeAt(0)) % 7;
        return ha - hb;
      });
    const shuffled = { terms: arr, defs };

    // Build answer map: origIdx → letter in shuffled defs
    const answerMap = {};
    shuffled.terms.forEach(t => {
      const found = shuffled.defs.find(d => d.def === t.def);
      if (found) answerMap[t.origIdx] = found.letter;
    });

    return (
      <div style={{ fontSize: "13px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "4px" }}>
          <div style={{ fontWeight: 700, color: "#374151", padding: "4px 0", borderBottom: "2px solid rgba(240,236,227,0.12)" }}>Begriff</div>
          <div style={{ fontWeight: 700, color: "#374151", padding: "4px 0", borderBottom: "2px solid rgba(240,236,227,0.12)" }}>Definition</div>
          {shuffled.terms.map((t, i) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "6px 0", borderBottom: "1px solid rgba(240,236,227,0.08)" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: "22px", height: "22px", borderRadius: "50%",
                  background: showAnswer ? "rgba(34,197,94,0.18)" : "rgba(240,236,227,0.06)",
                  border: "1.5px solid " + (showAnswer ? "#4ade80" : "rgba(240,236,227,0.2)"),
                  color: showAnswer ? "#4ade80" : "rgba(240,236,227,0.6)",
                  fontWeight: 800, fontSize: "12px", flexShrink: 0,
                }}>
                  {showAnswer ? answerMap[t.origIdx] : " "}
                </span>
                <span style={{ fontWeight: 600, color: "#f0ece3" }}>{t.term}</span>
              </div>
              <div style={{ color: "rgba(240,236,227,0.55)", padding: "6px 0", borderBottom: "1px solid rgba(240,236,227,0.08)", lineHeight: 1.5 }}>
                <span style={{ display: "inline-block", minWidth: "20px", fontWeight: 700, color: "rgba(240,236,227,0.4)" }}>{shuffled.defs[i]?.letter})</span>
                {shuffled.defs[i]?.def}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // ── Multiple Choice Renderer ─────────────────────────────────────────────
  const renderMC = (mc, showAnswer) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {mc.fragen.map((f, fi) => (
        <div key={fi} style={{ background: "rgba(240,236,227,0.05)", border: "1px solid rgba(240,236,227,0.12)", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "8px", fontSize: "13px" }}>{fi + 1}. {f.frage}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {f.optionen.map((opt, oi) => {
              const isRichtig = oi === f.richtig;
              return (
                <div key={oi} style={{
                  display: "flex", alignItems: "flex-start", gap: "8px", padding: "5px 8px", borderRadius: "7px",
                  background: showAnswer && isRichtig ? "rgba(74,222,128,0.1)" : "rgba(240,236,227,0.04)",
                  border: "1.5px solid " + (showAnswer && isRichtig ? "#4ade80" : "rgba(240,236,227,0.12)"),
                }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    minWidth: "18px", height: "18px", borderRadius: "50%",
                    border: "1.5px solid " + (showAnswer && isRichtig ? "#4ade80" : "rgba(240,236,227,0.3)"),
                    fontSize: "11px", fontWeight: 700,
                    background: showAnswer && isRichtig ? "rgba(74,222,128,0.2)" : "rgba(240,236,227,0.06)",
                    color: showAnswer && isRichtig ? "#4ade80" : "rgba(240,236,227,0.55)",
                    flexShrink: 0, marginTop: "1px",
                  }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span style={{ fontSize: "13px", color: showAnswer && isRichtig ? "#4ade80" : "#f0ece3", fontWeight: showAnswer && isRichtig ? 700 : 400 }}>{opt}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const themenTyp = aufgabe.themenTyp;
  const lt  = aufgabe.lueckentext;
  const zu  = aufgabe.zuordnung;
  const mc  = aufgabe.mc;

  return (
    <div style={{ border: "1px solid rgba(240,236,227,0.12)", borderRadius: "12px", overflow: "hidden", marginBottom: "12px", background: "rgba(28,20,10,0.6)" }}>
      <div style={{ background: "rgba(240,236,227,0.06)", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid rgba(240,236,227,0.1)", flexWrap: "wrap" }}>
        <div style={{ width: "26px", height: "26px", background: "#e8600a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>{nr}</div>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#f0ece3", flex: 1, minWidth: "120px" }}>{aufgabe.titel}</span>
        <span style={{ fontSize: "11px", color: "rgba(240,236,227,0.65)", fontWeight: 700, background: "rgba(240,236,227,0.1)", padding: "2px 8px", borderRadius: "20px" }}>
          {themenTyp === "lueckentext" ? <><FileText size={10} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Lückentext</> : themenTyp === "zuordnung" ? <><ArrowLeftRight size={10} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Zuordnung</> : themenTyp === "mc" ? <><CheckSquare size={10} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Multiple Choice</> : <><PenLine size={10} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Freitext</>}
        </span>
        <div style={{ display: "flex", alignItems: "center", background: "#141008", color: "#e8600a", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>
          {punkte} P
        </div>
        <button onClick={() => setOpen(!open)} style={{ ...S.btnSecondary, padding: "8px 14px", fontSize: "12px", borderRadius: "10px", fontWeight: 700 }}>{open ? "▲ Lösung" : "▼ Lösung"}</button>
      </div>

      <div style={{ padding: "16px" }}>
        <p style={{ margin: "0 0 14px", color: "rgba(240,236,227,0.85)", fontWeight: 600, fontSize: "14px" }}>{aufgabeText}</p>
        {themenTyp === "lueckentext" && lt  && renderLückentext(lt, show)}
        {themenTyp === "zuordnung"   && zu  && renderZuordnung(zu, show)}
        {themenTyp === "mc"          && mc  && renderMC(mc, show)}
        {themenTyp === "freitext"    && aufgabe.freitext && (
          <div style={{ marginTop: "4px" }}>
            <div style={{ background: "rgba(240,236,227,0.05)", border: "1px solid rgba(240,236,227,0.12)", borderRadius: "8px", padding: "12px 14px", minHeight: "60px", fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>
              Antwortfeld (ca. {aufgabe.freitext.zeilen || 4} Zeilen)
            </div>
            {show && aufgabe.freitext.loesung && (
              <div style={{ marginTop: "10px", background: "rgba(74,222,128,0.08)", border: "1.5px solid rgba(74,222,128,0.3)", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#4ade80", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>✓ Musterlösung</div>
                <div style={{ fontSize: "13px", color: "rgba(240,236,227,0.85)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aufgabe.freitext.loesung}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KomplexKarte({ aufgabe, nr, showLoesung, globalMode, klasse = 10, onSchrittEntfernen, onSchrittHinzufuegen, onAufgabeChange }) {
  const [openAll, setOpenAll] = useState(false);
  const [openSchritte, setOpenSchritte] = useState({});
  const [loesungsViews, setLoesungsViews] = useState({});
  const [localMode, setLocalMode] = useState(null);
  const [schrittModes, setSchrittModes] = useState({});
  const [addMenuOffen, setAddMenuOffen] = useState(false);
  const [editSchrittIdx, setEditSchrittIdx] = useState(null);
  const [editText, setEditText] = useState("");
  const [kiLaden, setKiLaden] = useState(false);
  const effectiveMode = localMode ?? globalMode;
  const getSchrittMode = i => schrittModes[i] ?? effectiveMode;
  const setSchrittMode = (i, v) => setSchrittModes(p => ({ ...p, [i]: v }));
  const gesamtPunkte = (aufgabe.schritte || []).reduce((s, st) => s + st.punkte, 0);

  // Verfügbare Schritte die noch nicht enthalten sind
  const vorhandenKeys = new Set((aufgabe.schritte || []).map(s => s._optsKey).filter(Boolean));
  const stepDefs = KOMPLEX_STEP_DEFS[aufgabe._baseTypId] || [];
  const verfuegbareSchritte = stepDefs.filter(d => !vorhandenKeys.has(d.optsKey));

  const toggleSchritt = i => setOpenSchritte(p => ({ ...p, [i]: !p[i] }));
  const getLoeView = i => loesungsViews[i] || "buchungssatz";
  const setLoeView = (i, v) => setLoesungsViews(p => ({ ...p, [i]: v }));

  return (
    <div style={{ border: "1px solid rgba(240,236,227,0.12)", borderLeft: "3px solid #e8600a", borderRadius: "14px", overflow: "hidden", marginBottom: "16px", background: "rgba(30,22,10,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      {/* ── Gesamtheader ── */}
      <div style={{ background: "#141008", padding: "14px 18px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ width: "28px", height: "28px", background: "#e8600a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: 900, flexShrink: 0 }}>{nr}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2px", display:"flex", alignItems:"center", gap:4 }}><ArrowLeftRight size={10} strokeWidth={1.5}/>Komplexaufgabe · {(aufgabe.schritte || []).length} Schritte</div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#fff" }}>{aufgabe.titel.replace("🔗 ", "")}</div>
        </div>
        <div style={{ background: "#e8600a", color: "#fff", borderRadius: "20px", padding: "4px 14px", fontSize: "13px", fontWeight: 900, flexShrink: 0 }}>{gesamtPunkte} P</div>
        {/* Beleg/Geschäftsfall-Toggle für alle Schritte */}
        <BelegGFSlider
          value={effectiveMode}
          isOverridden={!!localMode}
          onChange={v => setLocalMode(v)}
          compact
        />
        <button onClick={() => setOpenAll(!openAll)}
          style={{ ...S.btnSecondary, padding: "4px 12px", fontSize: "12px" }}>
          {openAll ? "▲ Lösungen" : "▼ Lösungen"}
        </button>
      </div>

      {/* ── Szenario-Box ── */}
      <div style={{ padding: "12px 18px 10px", background: "rgba(240,236,227,0.04)", borderBottom: "1px solid rgba(240,236,227,0.1)", fontSize: "13px", color: "rgba(240,236,227,0.8)", textAlign: "left" }}>
        <span style={{ fontWeight: 700, color: "#e8600a", display:"inline-flex", alignItems:"center", gap:4 }}><ClipboardList size={13} strokeWidth={1.5}/>Szenario</span>
        {Array.isArray(aufgabe.kontext)
          ? aufgabe.kontext.map((teil, i) => (
              <p key={i} style={{ margin: "6px 0 0", lineHeight: 1.6, paddingLeft: i > 0 ? "12px" : 0, borderLeft: i > 0 ? "2px solid #e2e8f0" : "none", textAlign: "left" }}>{teil}</p>
            ))
          : <p style={{ margin: "6px 0 0", lineHeight: 1.6, textAlign: "left" }}>{aufgabe.kontext}</p>
        }
      </div>

      {/* ── Schritte ── */}
      {(aufgabe.schritte || []).map((schritt, i) => {
        const isOpen = showLoesung || openAll || !!openSchritte[i];
        const loeView = getLoeView(i);
        const hasBeleg = !!schritt.beleg;
        const gfText = hasBeleg ? belegToGeschaeftsfall(schritt.beleg) : null;
        const nrPunkte = schritt.nrPunkte || 0;
        const buchPunkte = schritt.punkte - nrPunkte;
        return (
          <div key={i} style={{ borderTop: "1px solid rgba(240,236,227,0.1)" }}>
            {/* Schritt-Header */}
            <div style={{ padding: "9px 18px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", background: "rgba(240,236,227,0.04)" }}>
              <div style={{ width: "22px", height: "22px", background: "rgba(232,96,10,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8600a", fontSize: "11px", fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontWeight: 700, fontSize: "13px", color: "#f0ece3", flex: 1 }}>{schritt.titel}</span>
              <div style={{ display: "flex", alignItems: "center", background: "#1e293b", color: "#e8600a", borderRadius: "20px", padding: "2px 10px", fontSize: "11px", fontWeight: 800 }}>
                {schritt.punkte} P{nrPunkte > 0 && <span style={{ color: "#fbbf24", fontSize: "10px", fontWeight: 700 }}> (+{nrPunkte} NR)</span>}
              </div>
              <button onClick={() => toggleSchritt(i)} style={{ ...S.btnSecondary, padding: "3px 9px", fontSize: "11px" }}>
                {openSchritte[i] ? "▲" : "▼ Lösung"}
              </button>
              {onSchrittEntfernen && schritt._optsKey && (
                <button onClick={() => onSchrittEntfernen(i)}
                  title="Teilaufgabe entfernen"
                  style={{ padding: "3px 8px", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fff1f2",
                    color: "#dc2626", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                  ✕
                </button>
              )}
            </div>

            {/* Schritt-Body */}
            <div style={{ padding: "12px 18px 14px 48px", textAlign: "left" }}>
              {/* Aufgabentext mit Edit */}
              {editSchrittIdx === i ? (
                <div style={{ marginBottom: "10px" }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                    style={{ width: "100%", padding: "8px", border: "1.5px solid rgba(240,236,227,0.22)", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", background: "rgba(240,236,227,0.05)", color: "#f0ece3" }} />
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                    <button onClick={() => {
                      if (onAufgabeChange) {
                        const neuSchritte = (aufgabe.schritte || []).map((s, si) => si === i ? { ...s, _aufgabeEdit: editText.trim() || undefined } : s);
                        onAufgabeChange({ ...aufgabe, schritte: neuSchritte });
                      }
                      setEditSchrittIdx(null);
                    }} style={{ padding: "5px 12px", background: "#141008", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><Save size={12} strokeWidth={1.5}/>Speichern</button>
                    <button onClick={() => {
                      if (onAufgabeChange) {
                        const neuSchritte = (aufgabe.schritte || []).map((s, si) => si === i ? { ...s, _aufgabeEdit: undefined } : s);
                        onAufgabeChange({ ...aufgabe, schritte: neuSchritte });
                      }
                      setEditText(anrede(klasse, schritt.aufgabe ?? ""));
                      setEditSchrittIdx(null);
                    }} style={{ padding: "5px 12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><RefreshCw size={10} strokeWidth={1.5}/>Original</button>
                    <button disabled={kiLaden} onClick={async () => {
                      setKiLaden(true);
                      try {
                        const orig = anrede(klasse, schritt.aufgabe || "");
                        const res = await apiFetch("/ki/buchung", "POST", { prompt: `Formuliere die folgende BwR-Aufgabenstellung für Klasse ${klasse} neu – gleicher Inhalt, andere Wortwahl. Nur den neuen Text, ohne Erklärung.\n\nOriginal: ${orig}`, max_tokens: 200 });
                        const t = (res?.content?.find?.(c => c.type==="text")?.text || "").trim();
                        if (t) setEditText(t);
                      } catch(e) { alert("KI-Fehler: " + e.message); }
                      setKiLaden(false);
                    }} style={{ padding: "5px 12px", background: "rgba(232,96,10,0.15)", color: "#e8600a", border: "1px solid rgba(232,96,10,0.3)", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: kiLaden?"wait":"pointer", opacity: kiLaden?0.7:1 }}>
                      {kiLaden ? <><Zap size={11} strokeWidth={1.5}/>KI…</> : <><RefreshCw size={11} strokeWidth={1.5}/>KI-Neuformulierung</>}
                    </button>
                    <button onClick={() => setEditSchrittIdx(null)} style={{ padding: "5px 12px", background: "rgba(240,236,227,0.06)", color: "rgba(240,236,227,0.5)", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151", fontWeight: 600, flex: 1 }}>
                    {schritt._aufgabeEdit ?? anrede(klasse, schritt.aufgabe)}
                  </p>
                  <button onClick={() => { setEditText(schritt._aufgabeEdit ?? anrede(klasse, schritt.aufgabe ?? "")); setEditSchrittIdx(i); }}
                    title="Aufgabentext bearbeiten"
                    style={{ padding: "4px 7px", border: `1.5px solid ${schritt._aufgabeEdit ? "#e8600a" : "#e2e8f0"}`,
                      borderRadius: "6px", background: schritt._aufgabeEdit ? "#fffbeb" : "#fff",
                      cursor: "pointer", flexShrink: 0, display:"flex", alignItems:"center", gap:3 }}>
                    <PenLine size={11} strokeWidth={1.5} color={schritt._aufgabeEdit?"#e8600a":"#94a3b8"}/>{schritt._aufgabeEdit ? <CheckSquare size={10} strokeWidth={1.5} color="#16a34a"/> : null}
                  </button>
                </div>
              )}

              {/* ── Angebotsvergleich: Aufgabenteil (immer sichtbar) ── */}
              {schritt.typ === "angebotsvergleich" && schritt.angebote && (
                <div style={{ marginBottom: "10px" }}>
                  <AngebotsVergleichAufgabe angebote={schritt.angebote} />

                </div>
              )}

              {/* ── Einfache Kalkulation – Blanko-Schema (Labels ohne Beträge) ── */}
              {(schritt.typ === "kalkulation" || schritt.typ === "kalkulation_vk") && schritt.schema && !schritt.angebote && (
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ border: "1px solid rgba(240,236,227,0.12)", borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                      <tbody>
                        {schritt.schema.map((r, i) => {
                          const isInfo = typeof r.wert !== "number";
                          if (isInfo) return null;
                          return (
                            <tr key={i} style={{ background: r.bold ? "#f8fafc" : "#fff", borderTop: r.trennlinie ? "2px solid #0f172a" : i > 0 ? "1px solid #f1f5f9" : "none" }}>
                              <td style={{ padding: "7px 14px", color: r.bold ? "#0f172a" : "#374151", fontWeight: r.bold ? 700 : 400,
                                paddingLeft: r.label.startsWith("+") || r.label.startsWith("−") ? "28px" : undefined }}>
                                {r.label}
                              </td>
                              <td style={{ padding: "7px 14px", textAlign: "right", width: "140px" }}>
                                <div style={{ borderBottom: "1.5px solid #94a3b8", height: "22px", minWidth: "100px" }} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "rgba(240,236,227,0.4)" }}>
                    {anrede(klasse, "Füllen Sie das Kalkulationsschema aus.")}{schritt.typ === "kalkulation" ? " Rechne nur mit Nettowerten." : ""}
                  </div>
                </div>
              )}

              {/* ── Normaler Beleg ── */}
              {hasBeleg && schritt.typ !== "angebotsvergleich" && schritt.typ !== "kalkulation" && schritt.typ !== "kalkulation_vk" && (
                <div style={{ marginBottom: "10px" }}>
                  {/* Per-Schritt Toggle */}
                  <div style={{ marginBottom: "8px" }}>
                    <BelegGFSlider
                      value={getSchrittMode(i)}
                      onChange={v => setSchrittMode(i, v)}
                    />
                  </div>
                  {getSchrittMode(i) === "beleg"
                    ? <BelegAnzeige beleg={schritt.beleg} />
                    : <GeschaeftsfallKarte text={gfText} />
                  }
                </div>
              )}

              {isOpen && schritt.typ !== "angebotsvergleich" && schritt.typ !== "kalkulation" && schritt.typ !== "kalkulation_vk" && (
                <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "12px 14px" }}>
                  {/* View Toggle */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    {[{ key: "buchungssatz", label: "Buchungssatz" }, { key: "tkonten", label: "T-Konten" }].map(opt => (
                      <button key={opt.key} onClick={() => setLoeView(i, opt.key)}
                        style={{ ...S.btnSecondary, padding: "3px 9px", fontSize: "11px",
                          fontWeight: loeView === opt.key ? 800 : 500,
                          background: loeView === opt.key ? "rgba(74,222,128,0.15)" : "transparent" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {loeView === "buchungssatz"
                    ? <BuchungsSatz soll={schritt.soll} haben={schritt.haben} />
                    : <TKonten soll={schritt.soll} haben={schritt.haben} />
                  }
                  {schritt.erklaerung && (
                    <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(232,96,10,0.06)", borderRadius: "8px", border: "1px solid rgba(232,96,10,0.2)", fontSize: "12px", color: "rgba(240,236,227,0.8)", lineHeight: 1.6 }}>
                      💡 {schritt.erklaerung}
                    </div>
                  )}
                </div>
              )}

              {/* Lösung Angebotsvergleich: vollständiges Schema + Entscheidung */}
              {isOpen && schritt.typ === "angebotsvergleich" && schritt.angebote && (
                <div style={{ marginTop: "10px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#4ade80", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", display:"flex", alignItems:"center", gap:4 }}><BarChart2 size={11} strokeWidth={1.5}/>Lösung – Kalkulationsschema</div>
                  <AngebotsVergleichLoesung angebote={schritt.angebote} gewinner={schritt.gewinner} />
                  {schritt.erklaerung && (
                    <div style={{ marginTop: "8px", padding: "6px 10px", background: "rgba(232,96,10,0.06)", borderRadius: "7px", border: "1px solid rgba(232,96,10,0.2)", fontSize: "12px", color: "rgba(240,236,227,0.8)", lineHeight: 1.6 }}>
                      💡 {schritt.erklaerung}
                    </div>
                  )}
                </div>
              )}

              {/* Lösung einfache Kalkulation */}
              {isOpen && (schritt.typ === "kalkulation" || schritt.typ === "kalkulation_vk") && schritt.schema && (
                <div style={{ marginTop: "10px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#4ade80", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {schritt.typ === "kalkulation_vk" ? <><BarChart2 size={11} strokeWidth={1.5} style={{marginRight:4}}/>Lösung – Verkaufskalkulation</> : <><BarChart2 size={11} strokeWidth={1.5} style={{marginRight:4}}/>Lösung – Kalkulationsschema</>}
                  </div>
                  <SchemaTabelle rows={schritt.schema} />
                  {schritt.erklaerung && (
                    <div style={{ marginTop: "8px", padding: "6px 10px", background: "#fff", borderRadius: "7px", border: "1px solid #d1fae5", fontSize: "12px", color: "#374151" }}>
                      💡 {schritt.erklaerung}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Footer: Schritt hinzufügen ── */}
      {onSchrittHinzufuegen && verfuegbareSchritte.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(240,236,227,0.1)", padding: "10px 18px", background: "rgba(240,236,227,0.05)", position: "relative" }}>
          <button
            onClick={() => setAddMenuOffen(v => !v)}
            style={{ padding: "5px 14px", border: "1.5px dashed rgba(240,236,227,0.2)", borderRadius: "8px", background: "transparent",
              color: "rgba(240,236,227,0.4)", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            ＋ Schritt hinzufügen
          </button>
          {addMenuOffen && (
            <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: "18px", background: "rgba(20,16,8,0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(240,236,227,0.12)",
              borderRadius: "10px", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", zIndex: 50, minWidth: "220px", overflow: "hidden" }}>
              {verfuegbareSchritte.map(d => (
                <button key={d.optsKey}
                  onClick={() => { onSchrittHinzufuegen(d.optsKey); setAddMenuOffen(false); }}
                  style={{ display: "block", width: "100%", padding: "9px 16px", border: "none", background: "transparent",
                    textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#0f172a", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  + {d.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Beleg / Geschäftsfall Slider ──────────────────────────────────────────────
function BelegGFSlider({ value, onChange, compact = false }) {
  const opts = compact
    ? [{ key:"beleg", label:"Beleg", icon:FileText }, { key:"text", label:"GF", icon:MessageSquare }]
    : [{ key:"beleg", label:"Beleg", icon:FileText }, { key:"text", label:"Geschäftsfall", icon:MessageSquare }];
  const isLeft = value === "beleg";
  const W = compact ? 108 : 166;
  const pillW = Math.floor(W / 2) - 3;
  const leftRest = 2;
  const rightRest = Math.ceil(W / 2) + 1;
  const restPos = isLeft ? leftRest : rightRest;
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [dragX, setDragX] = useState(null);

  const onDown = e => {
    startXRef.current = e.clientX;
    isDraggingRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) >= 4) isDraggingRef.current = true;
    if (isDraggingRef.current) {
      setDragX(Math.max(leftRest, Math.min(rightRest, restPos + dx)));
    }
  };
  const onUp = e => {
    if (isDraggingRef.current) {
      const dx = e.clientX - startXRef.current;
      const threshold = (rightRest - leftRest) * 0.4;
      if (isLeft && dx > threshold) onChange("text");
      else if (!isLeft && dx < -threshold) onChange("beleg");
    }
    isDraggingRef.current = false;
    setDragX(null);
  };

  const pillLeft = dragX !== null ? dragX : restPos;
  const useAnim = dragX === null;

  return (
    <div style={{ position:"relative", width:W, height:28, borderRadius:14, flexShrink:0,
      background:"rgba(240,236,227,0.06)", border:"1.5px solid rgba(240,236,227,0.2)",
      cursor:"grab", userSelect:"none", touchAction:"none" }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {/* sliding pill – folgt dem Finger, schnappt beim Loslassen */}
      <div style={{ position:"absolute", top:2, left:pillLeft,
        width:pillW, height:"calc(100% - 4px)",
        background:"#e8600a", borderRadius:12,
        transition: useAnim ? "left 200ms cubic-bezier(.4,0,.2,1)" : "none",
        boxShadow:"0 1px 8px rgba(232,96,10,0.45)" }}/>
      {/* labels */}
      {opts.map((opt, i) => (
        <div key={opt.key} style={{ position:"absolute", top:0, bottom:0,
          left: i === 0 ? 0 : "50%", width:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          gap:3, zIndex:1, pointerEvents:"none",
          fontSize:10, fontWeight:700, fontFamily:"'IBM Plex Sans',sans-serif",
          color: value === opt.key ? "#fff" : "rgba(240,236,227,0.38)",
          transition:"color 200ms" }}>
          <opt.icon size={10} strokeWidth={2.5}/>{opt.label}
        </div>
      ))}
    </div>
  );
}

function AufgabeKarte({ aufgabe, nr, showLoesung, globalMode, klasse = 10, onAufgabeChange }) {
  const [open, setOpen] = useState(false);
  const [localMode, setLocalMode] = useState(null);
  const [loesungsView, setLoesungsView] = useState("buchungssatz");
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [kiLaden, setKiLaden] = useState(false);
  const [gfEditMode, setGfEditMode] = useState(false);
  const [gfEditText, setGfEditText] = useState("");
  const [gfKiLaden, setGfKiLaden] = useState(false);
  const effectiveMode = localMode ?? globalMode;

  const punkte = berechnePunkte(aufgabe);
  const isRechnung = aufgabe.taskTyp === "rechnung";
  const belegTyp = aufgabe.beleg?.typ;
  const hasBeleg = !!aufgabe.beleg;
  const geschaeftsfallText = hasBeleg ? belegToGeschaeftsfall(aufgabe.beleg) : null;

  // _aufgabeEdit enthält bereits den finalen Text (kein anrede() mehr nötig)
  // Ohne Edit: anrede() auf Originaltext anwenden
  const aufgabeText = effectiveMode === "text" && geschaeftsfallText
    ? anrede(klasse, "Bilde den Buchungssatz zum folgenden Geschäftsfall.")
    : (aufgabe._aufgabeEdit ?? anrede(klasse, aufgabe.aufgabe));

  const originalText = anrede(klasse, aufgabe.aufgabe); // für Textarea + KI-Basis
  const isEdited = !!aufgabe._aufgabeEdit;

  function startEdit() {
    // Textarea zeigt genau das was auch angezeigt wird
    setEditText(aufgabe._aufgabeEdit ?? anrede(klasse, aufgabe.aufgabe ?? ""));
    setEditMode(true);
  }
  function saveEdit() {
    if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _aufgabeEdit: editText.trim() || undefined });
    setEditMode(false);
  }
  function resetEdit() {
    if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _aufgabeEdit: undefined });
    setEditText(anrede(klasse, aufgabe.aufgabe ?? ""));
    setEditMode(false);
  }
  async function kiNeuformulierung() {
    setKiLaden(true);
    try {
      const prompt = `Du bist BwR-Lehrer an einer bayerischen Realschule (Klasse ${klasse}). Formuliere die folgende Aufgabenstellung für Schüler neu – gleicher Inhalt, andere Wortwahl. Antworte NUR mit dem neuen Aufgabentext, ohne Erklärung oder Anführungszeichen.\n\nOriginal: ${originalText}`;
      const res = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: 300 });
      // Anthropic API gibt { content: [{ type: "text", text: "..." }] } zurück
      const newText = (
        res?.content?.find?.(c => c.type === "text")?.text ||
        res?.content?.[0]?.text || ""
      ).trim();
      if (newText) {
        if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _aufgabeEdit: newText });
        setEditText(newText);
      } else {
        alert("KI-Antwort: " + JSON.stringify(res)?.slice(0, 200));
      }
    } catch(e) { alert("KI-Fehler: " + e.message); }
    setKiLaden(false);
  }

  return (
    <div style={{ border: "1px solid rgba(240,236,227,0.12)", borderLeft: "3px solid #e8600a", borderRadius: "12px", overflow: "hidden", marginBottom: "12px", background: "rgba(30,22,10,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      {/* Task header */}
      <div style={{ background: "rgba(240,236,227,0.04)", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid rgba(240,236,227,0.1)", flexWrap: "wrap" }}>
        <div style={{ width: "26px", height: "26px", background: "#e8600a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 900, flexShrink: 0 }}>{nr}</div>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#f0ece3", flex: 1, minWidth: "120px" }}>{aufgabe.titel}</span>

        {hasBeleg && (
          <BelegGFSlider
            value={effectiveMode}
            isOverridden={!!localMode}
            onChange={v => setLocalMode(v)}
          />
        )}

        {belegTyp && effectiveMode === "beleg" && <span style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", background: "rgba(240,236,227,0.1)", padding: "2px 8px", borderRadius: "20px", fontWeight: 600 }}>{BELEG_LABEL[belegTyp] || belegTyp}</span>}
        {isRechnung && <span style={{ fontSize: "11px", color: "rgba(240,236,227,0.7)", fontWeight: 700, background: "rgba(240,236,227,0.1)", padding: "2px 8px", borderRadius: "20px" }}>Rechnung</span>}
        <div style={{ display: "flex", alignItems: "center", background: "#141008", color: "#e8600a", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>
          {punkte} P{aufgabe.nrPunkte > 0 && !isRechnung && <span style={{ color: "#fbbf24", fontSize: "10px", fontWeight: 700 }}> (+{aufgabe.nrPunkte} NR)</span>}
        </div>
        {/* Stift-Button – nur im Beleg-Modus oder ohne Beleg */}
        {(effectiveMode !== "text" || !hasBeleg) && (
          <button onClick={startEdit} title="Aufgabentext bearbeiten"
            style={{ padding: "4px 8px", border: "1.5px solid " + (isEdited ? "#e8600a" : "#e2e8f0"), borderRadius: "8px", background: isEdited ? "#fffbeb" : "#fff", cursor: "pointer", display:"flex", alignItems:"center", gap:3 }}>
            <PenLine size={12} strokeWidth={1.5} color={isEdited?"#e8600a":"#94a3b8"}/>{isEdited ? <CheckSquare size={10} strokeWidth={1.5} color="#16a34a"/> : null}
          </button>
        )}
        <button onClick={() => setOpen(!open)} style={{ ...S.btnSecondary, padding: "4px 10px", fontSize: "12px" }}>{open ? "▲" : "▼ Lösung"}</button>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Inline-Editor */}
        {editMode ? (
          <div style={{ marginBottom: "12px" }}>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
              style={{ width: "100%", padding: "10px", border: "1.5px solid rgba(240,236,227,0.22)", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", background: "rgba(240,236,227,0.05)", color: "#f0ece3" }} />
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
              <button onClick={saveEdit} style={{ padding: "6px 14px", background: "#141008", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 700, fontSize: "12px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><Save size={12} strokeWidth={1.5}/>Speichern</button>
              <button onClick={resetEdit} title="Zurück zur generierten Formulierung"
                style={{ padding: "6px 14px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "7px", fontWeight: 700, fontSize: "12px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><RefreshCw size={12} strokeWidth={1.5}/>Original</button>
              <button onClick={kiNeuformulierung} disabled={kiLaden}
                style={{ padding: "6px 14px", background: "rgba(232,96,10,0.15)", color: "#e8600a", border: "1px solid rgba(232,96,10,0.3)", borderRadius: "7px", fontWeight: 700, fontSize: "12px", cursor: kiLaden ? "wait" : "pointer", opacity: kiLaden ? 0.7 : 1, display:"flex", alignItems:"center", gap:4 }}>
                {kiLaden ? <><Zap size={12} strokeWidth={1.5}/>KI…</> : <><RefreshCw size={12} strokeWidth={1.5}/>KI-Neuformulierung</>}
              </button>
              <button onClick={() => setEditMode(false)} style={{ padding: "6px 14px", background: "rgba(240,236,227,0.06)", color: "rgba(240,236,227,0.5)", border: "none", borderRadius: "7px", fontSize: "12px", cursor: "pointer" }}>Abbrechen</button>
            </div>
          </div>
        ) : (
          <p style={{ margin: "0 0 12px", color: "rgba(240,236,227,0.92)", fontWeight: 600, fontSize: "14px" }}>{aufgabeText}</p>
        )}

        {hasBeleg && (
          <div style={{ marginBottom: "12px" }}>
            {effectiveMode === "beleg" ? <BelegAnzeige beleg={aufgabe.beleg} /> : (
            <GeschaeftsfallKarte
              text={aufgabe._geschaeftsfallEdit ?? geschaeftsfallText}
              editText={gfEditText}
              isEditing={gfEditMode}
              onEdit={val => { if (typeof val === "string") { setGfEditText(val); } else { setGfEditText(aufgabe._geschaeftsfallEdit ?? geschaeftsfallText ?? ""); setGfEditMode(true); } }}
              onSave={() => { if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _geschaeftsfallEdit: gfEditText.trim() || undefined }); setGfEditMode(false); }}
              onReset={() => { if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _geschaeftsfallEdit: undefined }); setGfEditMode(false); }}
              onCancel={() => setGfEditMode(false)}
              kiLaden={gfKiLaden}
              onKI={async () => {
                setGfKiLaden(true);
                try {
                  const origText = geschaeftsfallText || "";
                  const prompt = `Du bist BwR-Lehrer an einer bayerischen Realschule. Formuliere den folgenden Geschäftsfall für Schüler neu – gleicher Inhalt, andere Wortwahl. Antworte NUR mit dem neuen Text, ohne Erklärung.

Original: ${origText}`;
                  const res = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: 200 });
                  const newText = (res?.content?.find?.(c => c.type === "text")?.text || res?.content?.[0]?.text || "").trim();
                  if (newText) {
                    if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _geschaeftsfallEdit: newText });
                    setGfEditText(newText);
                  }
                } catch(e) { alert("KI-Fehler: " + e.message); }
                setGfKiLaden(false);
              }}
            />
          )}
          </div>
        )}

        {/* Schaubild: immer sichtbar */}
        {aufgabe.taskTyp === "schaubild" && aufgabe.schaubild && (
          <div>
            {/* Hinweis fiktive Daten */}
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, padding: "6px 12px", fontSize: "11px", color: "#92400e", marginBottom: 8, fontWeight: 600, display:"flex", alignItems:"flex-start", gap:5 }}>
              <AlertTriangle size={11} strokeWidth={1.5} style={{flexShrink:0,marginTop:1}}/><span>Hinweis: Die dargestellten Daten sind fiktiv und dienen ausschließlich zu Übungszwecken.</span>
            </div>
            <SchaubildAnzeige schaubild={aufgabe.schaubild} />
            <div style={{ marginTop: 12 }}>
              {(aufgabe.teilaufgaben || []).map((ta, ti) => (
                <div key={ti} style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 6px", color: "#f0ece3", fontWeight: 600, fontSize: "13px" }}>
                    <span style={{ fontWeight: 800, color: "#e8600a" }}>{ta.nr})</span> {ta.text}
                    <span style={{ marginLeft: 8, fontSize: "11px", color: "rgba(240,236,227,0.4)" }}>[{ta.punkte} P]</span>
                  </p>
                  {(showLoesung || open) ? (
                    <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 7, padding: "8px 12px", fontSize: "13px", color: "#4ade80" }}>
                      {ta.loesung}
                    </div>
                  ) : (
                    <div style={{ height: 32, border: "1px solid rgba(240,236,227,0.12)", borderRadius: 6, background: "rgba(240,236,227,0.05)" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(showLoesung || open) && aufgabe.taskTyp !== "schaubild" && (
          <div style={{ background: isRechnung ? "#faf5ff" : "#f0fdf4", border: `1px solid ${isRechnung ? "#ddd6fe" : "#bbf7d0"}`, borderRadius: "10px", padding: "14px 16px", marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
              {/* Ansicht-Toggle für Buchungslösungen */}
              {!isRechnung && aufgabe.soll && (
                <div style={{ display: "flex", border: "1.5px solid #bbf7d0", borderRadius: "8px", overflow: "hidden" }}>
                  {[{ key: "buchungssatz", label: "Buchungssatz" }, { key: "tkonten", label: "T-Konten" }].map(opt => (
                    <button key={opt.key} onClick={() => setLoesungsView(opt.key)}
                      style={{ padding: "4px 12px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: loesungsView === opt.key ? 700 : 500,
                        background: loesungsView === opt.key ? "#16a34a" : "#fff",
                        color: loesungsView === opt.key ? "#fff" : "#64748b" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {isRechnung && <span style={{ fontSize: "11px", fontWeight: 700, color: "#e8600a", textTransform: "uppercase" }}>✦ Lösung (Schema)</span>}
              <span style={{ fontSize: "12px", color: "rgba(240,236,227,0.55)" }}>
                <strong>{punkte} P</strong>
                {!isRechnung && aufgabe.nrPunkte > 0 && <span style={{ color: "rgba(240,236,227,0.4)" }}> = {(aufgabe.soll?.length || 0) + (aufgabe.haben?.length || 0)} BS-P + {aufgabe.nrPunkte} NR-P</span>}
              </span>
            </div>
            <NebenrechnungBox nrs={aufgabe.nebenrechnungen} nrPunkte={aufgabe.nrPunkte} />
            {isRechnung && aufgabe.schema && <SchemaTabelle rows={aufgabe.schema} />}
            {!isRechnung && aufgabe.soll && (
              loesungsView === "buchungssatz"
                ? <BuchungsSatz soll={aufgabe.soll} haben={aufgabe.haben} />
                : <TKonten soll={aufgabe.soll} haben={aufgabe.haben} />
            )}
            <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(232,96,10,0.12)", borderRadius: "8px", border: "1px solid rgba(232,96,10,0.3)", fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
              💡 {renderMitTooltips(aufgabe.erklaerung)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PUNKTE-PANEL
// ══════════════════════════════════════════════════════════════════════════════
function PunktePanel({ aufgaben, typ, maxPunkte }) {
  const [zeigTab, setZeigTab] = useState(false);
  const [strenge, setStrenge] = useState(0.5); // 0=locker, 1=streng, 0.5=ISB
  const gesamt = aufgaben.reduce((s, a) => s + berechnePunkte(a), 0);
  // Notenschlüssel basiert auf geplantem Punkteziel (wenn gesetzt), sonst auf tatsächlichem Gesamt
  const gesamtFuerNoten = maxPunkte && maxPunkte > 0 ? maxPunkte : gesamt;
  const g4pct = strenge <= 0.5
    ? NOTEN_ANKER.locker[3] + (NOTEN_ANKER.isb[3] - NOTEN_ANKER.locker[3]) * strenge * 2
    : NOTEN_ANKER.isb[3]    + (NOTEN_ANKER.streng[3] - NOTEN_ANKER.isb[3]) * (strenge - 0.5) * 2;
  const grenze4 = Math.round(gesamtFuerNoten * g4pct * 2) / 2;
  let einordnung = "";
  if (typ === "Prüfung") {
    if (gesamtFuerNoten <= 22) einordnung = "Stegreifaufgabe";
    else if (gesamtFuerNoten <= 32) einordnung = "Kurzarbeit";
    else if (gesamtFuerNoten <= 46) einordnung = "Schulaufgabe";
    else einordnung = "Umfangr. Schulaufgabe";
  }
  return (
    <div style={{ background: "#141008", borderRadius: "14px", padding: "20px 24px", marginBottom: "16px", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.4)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Punkte-Auswertung · 2026</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap:"wrap" }}>
            <span style={{ fontSize: "42px", fontWeight: 900, color: "#e8600a", lineHeight: 1 }}>{gesamt}</span>
            <span style={{ fontSize: "18px", color: "rgba(240,236,227,0.5)" }}>Punkte</span>
            {maxPunkte && maxPunkte !== gesamt && (
              <span style={{ fontSize:"12px", color:"rgba(240,236,227,0.4)", background:"rgba(240,236,227,0.06)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:6, padding:"2px 8px", alignSelf:"center" }}>
                Ziel: {maxPunkte} P
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "24px", fontWeight: 800, color: "#60a5fa" }}>~{gesamt} min</div><div style={{ fontSize: "11px", color: "#64748b" }}>Bearbeitungszeit</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "24px", fontWeight: 800, color: "#4ade80" }}>≥ {grenze4 % 1 === 0 ? grenze4 : grenze4.toFixed(1)} P</div><div style={{ fontSize: "11px", color: "#64748b" }}>Untergrenze Note 4</div></div>
          {einordnung && <div style={{ textAlign: "center" }}><div style={{ fontSize: "13px", fontWeight: 800, color: "#fbbf24", background: "#78350f33", border: "1px solid #78350f55", borderRadius: "8px", padding: "6px 12px" }}>{einordnung}</div></div>}
        </div>
      </div>
      <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        {(() => {
          const pills = [];
          let aufgNr = 0;
          aufgaben.forEach((a, i) => {
            if (a.taskTyp === "komplex" && a.schritte?.length) {
              aufgNr++;
              const labels = "abcdefghij";
              a.schritte.forEach((st, si) => {
                pills.push(
                  <div key={`${i}-${si}`} style={{ background: "#1e293b", border: "1px solid #e8600a44", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", display: "flex", gap: "4px" }}>
                    <span style={{ color: "#e8600a88", fontWeight: 700 }}>A{aufgNr}{labels[si]}</span>
                    <span style={S.accent}>{st.punkte}P</span>
                  </div>
                );
              });
            } else {
              aufgNr++;
              const p = berechnePunkte(a);
              pills.push(
                <div key={i} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", display: "flex", gap: "4px" }}>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>A{aufgNr}</span>
                  <span style={S.accent}>{p}P</span>
                </div>
              );
            }
          });
          return pills;
        })()}
        <div style={{ background: "#e8600a", borderRadius: "8px", padding: "4px 12px", fontSize: "12px", color: "#fff", fontWeight: 800 }}>Σ {gesamt} P</div>
      </div>
      <button onClick={() => setZeigTab(!zeigTab)} style={{ marginTop: "10px", background: "transparent", border: "1px solid #334155", borderRadius: "6px", color: "#94a3b8", fontSize: "11px", padding: "4px 12px", cursor: "pointer" }}>
        {zeigTab ? "▲ Notenschlüssel" : "▼ Notenschlüssel"}
      </button>
      {zeigTab && (
        <div style={{ marginTop: "10px" }}>
          {/* ── Strenge-Regler ── */}
          <div style={{ marginBottom: "12px", background: "#1e293b", borderRadius: "10px", padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, display:"flex", alignItems:"center", gap:4 }}><GraduationCap size={12} strokeWidth={1.5}/>Anforderungsniveau</span>
              <span style={{ fontSize: "11px", color: "#e8600a", fontWeight: 700 }}>
                Note 4 ab {Math.round(g4pct * 100)} %
                {Math.abs(strenge - 0.5) < 0.04 && <span style={{ color: "#64748b", marginLeft: "6px" }}>(ISB-Standard)</span>}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: 700, minWidth: "46px", display:"flex", alignItems:"center", gap:3 }}><Smile size={12} strokeWidth={1.5}/>locker</span>
              <div style={{ flex: 1, position: "relative" }}>
                <input type="range" min="0" max="100" value={Math.round(strenge * 100)}
                  onChange={e => setStrenge(Number(e.target.value) / 100)}
                  style={{ width: "100%", accentColor: "#e8600a", cursor: "pointer", height: "6px" }} />
                {/* ISB-Marker */}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "3px", height: "14px", background: "#475569", borderRadius: "2px", pointerEvents: "none" }} />
              </div>
              <span style={{ fontSize: "12px", color: "#f87171", fontWeight: 700, minWidth: "46px", textAlign: "right", display:"flex", alignItems:"center", gap:3, justifyContent:"flex-end" }}><Frown size={12} strokeWidth={1.5}/>streng</span>
            </div>
            {Math.abs(strenge - 0.5) > 0.04 && (
              <button onClick={() => setStrenge(0.5)} style={{ marginTop: "6px", fontSize: "10px", color: "#64748b", background: "transparent", border: "1px solid #334155", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}>
                <RefreshCw size={9} strokeWidth={1.5}/>Standard zurücksetzen
              </button>
            )}
          </div>
          {/* ── Noten-Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "4px" }}>
            {notenTabelle(gesamtFuerNoten, strenge).map(n => (
              <div key={n.note} style={{ background: n.farbe + "22", border: `1px solid ${n.farbe}44`, borderRadius: "8px", padding: "6px 4px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: 900, color: n.farbe }}>{n.note}</div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>{n.text}</div>
                <div style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 700 }}>{n.von % 1 === 0 ? n.von : n.von.toFixed(1)}–{n.bis % 1 === 0 ? n.bis : n.bis.toFixed(1)}P</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}




function gesamtPunkteStr(config) { return config.maxPunkte ? config.maxPunkte + "" : "?"; }


// ── ExportModal ───────────────────────────────────────────────────────────
function ExportModal({ aufgaben, config, firma, kiHistorie, onSchliessen }) {
  const [modus, setModus] = useState("aufgaben");
  const [kopfzeile, setKopfzeile] = useState({ ...DEFAULT_KOPFZEILE, klasse: config.klasse + "", pruefungsart: config.pruefungsart || config.typ || "Schulaufgabe", datum: config.datum || new Date().toISOString().split("T")[0] });
  const [zeigeKopfEditor, setZeigeKopfEditor] = useState(false);

  const modusOpts = [
    { key: "aufgaben",  icon: FileText,    label: "Aufgabenblatt",   desc: "Ohne Lösung (für Schüler)" },
    { key: "loesungen", icon: CheckSquare, label: "Lösungsblatt",    desc: "Mit Buchungssatz + Haken" },
    { key: "beides",    icon: Files,       label: "Aufgabe + Lösung", desc: "Lösung auf Folgeseite" },
    { key: "ki",        icon: Bot,         label: "KI-Aufgaben",      desc: "Eigene Belege / KI-Output" },
  ];

  // PDF: öffnet HTML in neuem Tab → Drucken / Als PDF speichern
  const exportPDF = () => {
    try {
      const html = generateExportHTML({ aufgaben, config, firma, modus, kiHistorie, kopfzeile, format: "pdf" });
      const w = window.open("", "_blank");
      if (!w) { alert("Bitte Popup-Blocker deaktivieren und erneut versuchen."); return; }
      w.document.write(html);
      w.document.close();
    } catch(err) {
      alert("PDF-Export Fehler: " + err.message);
    }
  };

  const exportWordGetBlob = () => exportWord("blob");
  const exportPages = () => exportWord("pages");

  // Word: echtes DOCX via docx-Library – Format nach Vorgabe Erich-Kästner-RS
  const exportWord = async (ext = "docx") => {
    try {
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
              WidthType, BorderStyle, AlignmentType, ShadingType, LevelFormat,
              VerticalAlign } = await import("docx");

      const mitAufgabe = modus !== "loesungen";
      const mitLoesung = modus !== "aufgaben";
      const isLoesung  = modus === "loesungen";
      const kl = kopfzeile || {};
      const schulName   = kl.schulName   || "";
      const pruefArt    = kl.pruefungsart || config.typ || "Übung";
      const klasseStr   = kl.klasse      || String(config.klasse);
      const datumStr    = kl.datum
        ? new Date(kl.datum + "T00:00:00").toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" })
        : "";
      const gesamtP     = aufgaben.reduce((s, a) => s + berechnePunkte(a), 0);
      const stripHtml   = t => (t || "").replace(/<[^>]*>/g, "");

      // ── A4, 2 cm Ränder ────────────────────────────────────────────────────
      // A4 = 11906 × 16838 DXA  |  2 cm = 1134 DXA  |  Textbreite = 9638 DXA
      const PW = 9638;

      // ── Border-Helfer ──────────────────────────────────────────────────────
      const nb = { style: BorderStyle.NONE,   size: 0, color: "FFFFFF" };
      const sb = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
      const lb = { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" };

      // ── Absatz-Helfer ──────────────────────────────────────────────────────
      const p = (text, opts = {}) => new Paragraph({
        children: [new TextRun({
          text: text || "",
          size:   opts.size   || 22,
          bold:   opts.bold   || false,
          italic: opts.italic || false,
          color:  opts.color  || "000000",
          font:   "Arial",
        })],
        spacing:   { before: opts.before || 0, after: opts.after || 80 },
        alignment: opts.align || AlignmentType.LEFT,
        keepNext:  opts.keepNext || false,
        shading:   opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
        indent:    opts.indent ? { left: opts.indent } : undefined,
      });
      const ep = (h = 80) => new Paragraph({ children: [], spacing: { after: h } });

      // ── Buchungssatz-Tabelle ───────────────────────────────────────────────
      const bsTable = (sollArr, habenArr) => {
        const maxR = Math.max(sollArr.length, habenArr.length);
        const cw = [900, 3000, 1200, 360, 900, 3000, 1200];
        const tw = PW - 240;
        const rows = [];
        for (let r = 0; r < maxR; r++) {
          const s = sollArr[r];
          const h = habenArr[r];
          const showAn = r === sollArr.length - 1;
          const cell = (txt, w, opts = {}) => new TableCell({
            width: { size: w, type: WidthType.DXA },
            borders: { top: nb, bottom: nb, left: nb, right: nb },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: opts.right ? AlignmentType.RIGHT : opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
              spacing: { after: 0 },
              children: [new TextRun({ text: txt || "", size: 20, bold: opts.bold || false, font: "Arial" })],
            })],
          });
          rows.push(new TableRow({ children: [
            cell(s ? s.nr   : "", cw[0], { bold: true }),
            cell(s ? s.name : "", cw[1]),
            cell(s && s.betrag != null ? s.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " \u20ac" : "", cw[2], { right: true }),
            cell(showAn ? "an" : "", cw[3], { center: true, bold: true }),
            cell(h ? h.nr   : "", cw[0], { bold: true }),
            cell(h ? h.name : "", cw[1]),
            cell(h && h.betrag != null ? h.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " \u20ac" : "", cw[2], { right: true }),
          ]}));
        }
        return new Table({
          width: { size: tw, type: WidthType.DXA },
          columnWidths: cw,
          borders: { top: lb, bottom: lb, left: nb, right: nb, insideH: nb, insideV: nb },
          rows,
          indent: { size: 240, type: WidthType.DXA },
        });
      };

      // ── Aufgabenzeile: Text links, Punkte rechtsbündig per Tab-Stop ───────
      const aufgZeile = (numText, aufgText, pkte, keepNext) => new Paragraph({
        spacing: { before: 120, after: 60 },
        keepNext: !!keepNext,
        tabStops: [{ type: "right", position: PW - 200 }],
        children: [
          new TextRun({ text: numText, size: 22, bold: true, font: "Arial" }),
          new TextRun({ text: aufgText, size: 22, font: "Arial" }),
          new TextRun({ text: "\t[" + pkte + "\u202fP]", size: 20, color: "555555", font: "Arial" }),
        ],
      });

      const belegToDocx = makeBelegDocx({ Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, AlignmentType, ShadingType, VerticalAlign });
      const children = [];

      // ══════════════════════════════════════════════════════════════════════
      // 1. KOPFZEILE
      // ══════════════════════════════════════════════════════════════════════
      // Tabelle A: Prüfungsart-Titel  |  Note + Punkte (gestapelt)
      // Kompakte Kopfzeile: Titel links, Note+Punkte einzeilig rechts
      const noteW = 1800; // Breite Note-Box
      const pktW  = 2000; // Breite Punkte-Box
      const titW  = PW - noteW - pktW;
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA },
        columnWidths: [titW, noteW, pktW],
        rows: [new TableRow({ height: { value: 900, rule: "atLeast" }, children: [
          // Titel: Schulname + Prüfungsart, zentriert
          new TableCell({
            width: { size: titW, type: WidthType.DXA },
            borders: { top: sb, bottom: sb, left: sb, right: nb },
            margins: { top: 80, bottom: 80, left: 120, right: 60 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              ...(schulName ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 16 }, children: [
                new TextRun({ text: schulName, size: 16, color: "666666", font: "Arial" }),
              ]})] : []),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
                new TextRun({ text: (isLoesung ? "Musterl\u00f6sung \u2013 " : "") + pruefArt, size: 30, bold: true, font: "Arial" }),
              ]}),
            ],
          }),
          // Note: einzeilig
          new TableCell({
            width: { size: noteW, type: WidthType.DXA },
            borders: { top: sb, bottom: sb, left: sb, right: nb },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 80, bottom: 80, left: 80, right: 40 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
              new TextRun({ text: "_______", size: 22, font: "Arial" }),
              new TextRun({ text: " Note", size: 18, color: "666666", font: "Arial" }),
            ]})],
          }),
          // Punkte: einzeilig
          new TableCell({
            width: { size: pktW, type: WidthType.DXA },
            borders: { top: sb, bottom: sb, left: sb, right: sb },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 80, bottom: 80, left: 40, right: 80 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
              new TextRun({ text: "______ / " + String(gesamtP) + "\u202fP", size: 22, font: "Arial" }),
            ]})],
          }),
        ]}),],
      }));

      // Tabelle B: Name / Datum / Klasse
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA },
        columnWidths: [PW],
        rows: [
          new TableRow({ children: [
            new TableCell({
              width: { size: PW, type: WidthType.DXA },
              borders: { top: nb, bottom: sb, left: sb, right: sb },
              margins: { top: 160, bottom: 160, left: 120, right: 120 },
              children: [new Paragraph({ spacing: { after: 0 }, children: [
                new TextRun({ text: "Name: ", size: 22, bold: true, font: "Arial" }),
                new TextRun({ text: "___________________________          ", size: 22, font: "Arial" }),
                new TextRun({ text: "Datum: ", size: 22, bold: true, font: "Arial" }),
                new TextRun({ text: (datumStr || "___________") + "          ", size: 22, font: "Arial" }),
                new TextRun({ text: "Klasse: ", size: 22, bold: true, font: "Arial" }),
                new TextRun({ text: klasseStr || "____", size: 22, bold: true, font: "Arial" }),
              ]})],
            }),
          ]}),
        ],
      }));

      // Tabelle C: Elternkenntnisnahme + Unterschrift
      if (kl.zeigeUnterschrift !== false) {
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [PW],
          rows: [
            new TableRow({ children: [
              new TableCell({
                width: { size: PW, type: WidthType.DXA },
                shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                borders: { top: nb, bottom: nb, left: sb, right: sb },
                margins: { top: 60, bottom: 20, left: 120, right: 120 },
                children: [new Paragraph({ spacing: { after: 0 }, children: [
                  new TextRun({ text: "Ich/Wir habe/n von diesem Leistungsnachweis beziehungsweise von der Note Kenntnis genommen.", size: 18, bold: true, font: "Arial" }),
                ]})],
              }),
            ]}),
            new TableRow({ children: [
              new TableCell({
                width: { size: PW, type: WidthType.DXA },
                borders: { top: nb, bottom: sb, left: sb, right: sb },
                margins: { top: 360, bottom: 120, left: 120, right: 120 },
                children: [new Paragraph({ spacing: { after: 0 }, children: [
                  new TextRun({ text: "Datum  __________________               Unterschrift  _______________________________", size: 20, font: "Arial" }),
                ]})],
              }),
            ]}),
          ],
        }));
      }

      children.push(ep(200));

      // ══════════════════════════════════════════════════════════════════════
      // 2. SZENARIO-BOX
      // ══════════════════════════════════════════════════════════════════════
      if (firma?.name) {
        const szenarioRaw = `Als Mitarbeiter/in im Unternehmen ${firma.name}${firma.ort ? ", " + firma.ort : ""}, bearbeiten Sie verschiedene betriebswirtschaftliche Aufgaben.`;
        const szenario = anrede(config.klasse, szenarioRaw);

        // ── Unternehmensvorstellung ──────────────────────────────────────────
        const wt = [
          firma.rohstoffe?.length     ? `Rohstoffe: ${firma.rohstoffe.join(", ")}`         : null,
          firma.hilfsstoffe?.length   ? `Hilfsstoffe: ${firma.hilfsstoffe.join(", ")}`     : null,
          firma.fremdbauteile?.length ? `Fremdbauteile: ${firma.fremdbauteile.join(", ")}` : null,
          firma.betriebsstoffe?.length? `Betriebsstoffe: ${firma.betriebsstoffe.join(", ")}`:null,
          firma.fertigerzeugnisse?.length ? `Fertigerzeugnisse: ${firma.fertigerzeugnisse.join(", ")}` : null,
        ].filter(Boolean);
        const firmaFarbe = (firma.farbe||"#1e293b").replace("#","").toUpperCase();
        const firmaAkz = { style: BorderStyle.SINGLE, size: 16, color: firmaFarbe };
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [PW],
          borders: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" }, left: { style: BorderStyle.SINGLE, size: 16, color: firmaFarbe }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideH: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideV: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
          rows: [new TableRow({ children: [new TableCell({
            width: { size: PW, type: WidthType.DXA },
            shading: { fill: "F8F9FA", type: ShadingType.CLEAR },
            borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
            margins: { top: 100, bottom: 100, left: 180, right: 140 },
            children: [
              new Paragraph({ spacing: { after: 16 }, children: [
                new TextRun({ text: (firma.icon ? firma.icon + "  " : "") + firma.name, size: 24, bold: true, color: firmaFarbe, font: "Arial" }),
                // rechtsform nicht separat – bereits im Firmennamen enthalten
                ...(firma.ort ? [new TextRun({ text: "  ·  " + firma.plz + " " + firma.ort, size: 18, color: "555555", font: "Arial" })] : []),
                ...(firma.slogan ? [new TextRun({ text: "  |  ", size: 18, color: "BBBBBB", font: "Arial" }), new TextRun({ text: firma.slogan, size: 20, italic: true, bold: false, color: "555555", font: "Georgia" })] : []),
              ]}),
              ...(firma.inhaber ? [new Paragraph({ spacing: { after: wt.length ? 16 : 0 }, children: [
                new TextRun({ text: (() => {
                  // Geschlecht aus Vornamen ableiten (typisch deutsche Vornamen)
                  const fn = (firma.inhaber || "").replace(/^Dr\.\s+|^Prof\.\s+/i, "").split(" ")[0];
                  const femaleEndings = ["a", "e", "ine", "tte", "lie", "ia", "ra", "ika", "ita"];
                  const isFemale = femaleEndings.some(end => fn.toLowerCase().endsWith(end));
                  return isFemale ? "Inhaberin: " : "Inhaber: ";
                })(), size: 20, bold: true, color: "444444", font: "Arial" }),
                new TextRun({ text: firma.inhaber, size: 20, color: "444444", font: "Arial" }),
              ]})] : []),
              ...wt.map((line, idx) => {
                const colonIdx = line.indexOf(":");
                const label = colonIdx >= 0 ? line.slice(0, colonIdx + 1) : line;
                const rest  = colonIdx >= 0 ? line.slice(colonIdx + 1) : "";
                return new Paragraph({
                  spacing: { after: idx === wt.length - 1 ? 0 : 8 },
                  indent: { left: 320 },
                  children: [
                    new TextRun({ text: label, size: 20, bold: true, color: "333333", font: "Arial" }),
                    ...(rest ? [new TextRun({ text: rest, size: 20, bold: false, color: "555555", font: "Arial" })] : []),
                  ],
                });
              }),
            ],
          })]})]
        }));
        children.push(ep(160));

        // ── Szenario + Formale Vorgaben ──────────────────────────────────────
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [PW],
          rows: [new TableRow({ children: [
            new TableCell({
              width: { size: PW, type: WidthType.DXA },
              shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
              borders: { top: sb, bottom: sb, left: sb, right: sb },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [
                new Paragraph({ spacing: { after: 80 }, children: [
                  new TextRun({ text: szenario, size: 20, italic: true, font: "Arial" }),
                ]}),
                new Paragraph({ spacing: { after: 60 }, children: [
                  new TextRun({ text: "Formale Vorgaben:", size: 20, bold: true, font: "Arial" }),
                ]}),
                ...[
                  "Bei Buchungss\u00e4tzen sind stets Kontonummern, Kontennamen (abgek\u00fcrzt m\u00f6glich) und Betr\u00e4ge anzugeben.",
                  "Bei Berechnungen sind jeweils alle notwendigen L\u00f6sungsschritte und Nebenrechnungen darzustellen.",
                  "Alle Ergebnisse sind in der Regel auf zwei Nachkommastellen gerundet anzugeben.",
                  "Soweit nicht anders vermerkt, gilt ein Umsatzsteuersatz von 19\u00a0%.",
                ].map(txt => new Paragraph({
                  spacing: { after: 40 },
                  numbering: { reference: "bw-bullets", level: 0 },
                  children: [new TextRun({ text: txt, size: 20, font: "Arial" })],
                })),
              ],
            }),
          ]})],
        }));
        children.push(ep(240));
      }

      aufgaben.forEach((a, i) => {
        const punkte  = berechnePunkte(a);
        const aufgTxt = stripHtml(anrede(config.klasse, (a._aufgabeEdit ?? a.aufgabe) || ""));

        // ── Aufgaben-Titel (grauer Balken, Seitenumbruch wenn nötig) ──
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [PW],
          rows: [new TableRow({ children: [
            new TableCell({
              width: { size: PW, type: WidthType.DXA },
              shading: { fill: "E5E7EB", type: ShadingType.CLEAR },
              borders: { top: nb, bottom: nb, left: nb, right: nb },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({
                spacing: { after: 0, before: i > 0 ? 0 : 0 },
                pageBreakBefore: i > 0,
                children: [
                  new TextRun({ text: `Aufgabe ${i + 1} (${punkte} Punkte)`, size: 26, bold: true, font: "Arial" }),
                ],
              })],
            }),
          ]})],
        }));
        children.push(ep(80));

        // ── Komplex-Aufgabe (Kettenbuchung) ──────────────────────────────
        if (a.taskTyp === "komplex" && a.schritte?.length) {
          // kontext wird im Export bewusst weggelassen – die Teilaufgaben
          // entwickeln das Szenario selbst aus den Aufgabenstellungen
          a.schritte.forEach((s, si) => {
            children.push(si === 0 ? ep(120) : ep(80));
            const hasBeleg = mitAufgabe && !!s.beleg;
            if (hasBeleg) {
              // Aufgabenzeile + Freizeile + Beleg in einem Container → kein Seitenumbruch
              const aufgPara = aufgZeile(`${i + 1}.${si + 1}  `, stripHtml(anrede(config.klasse, (s._aufgabeEdit ?? s.aufgabe) || "")), s.punkte, false);
              const belegElems = belegToDocx(s.beleg, firma);
              const containerRows = [
                new TableRow({ cantSplit: true, children: [new TableCell({
                  width: { size: PW, type: WidthType.DXA },
                  borders: { top: nb, bottom: nb, left: nb, right: nb },
                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                  children: [aufgPara, ep(60)],
                })] }),
                new TableRow({ cantSplit: true, children: [new TableCell({
                  width: { size: PW, type: WidthType.DXA },
                  borders: { top: nb, bottom: nb, left: nb, right: nb },
                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                  children: belegElems,
                })] }),
              ];
              children.push(new Table({
                width: { size: PW, type: WidthType.DXA },
                columnWidths: [PW],
                borders: { top: nb, bottom: nb, left: nb, right: nb, insideH: nb, insideV: nb },
                rows: containerRows,
              }));
              children.push(ep(80));
            } else {
              children.push(aufgZeile(`${i + 1}.${si + 1}  `, stripHtml(anrede(config.klasse, (s._aufgabeEdit ?? s.aufgabe) || "")), s.punkte, false));
            }
            if (mitLoesung && s.soll?.length) {
              children.push(bsTable(s.soll, s.haben || []));
              children.push(ep(60));
              if (s.erklaerung) children.push(p(s.erklaerung, { size: 18, italic: true, color: "374151", after: 40 }));
            } else if (mitAufgabe && !mitLoesung) {
            }
          });

        // ── Einfache Aufgabe ─────────────────────────────────────────────
        } else {
          if (mitAufgabe && a.beleg) { children.push(ep(80)); children.push(...belegToDocx(a.beleg, firma)); children.push(ep(80)); }
          if (mitAufgabe && aufgTxt) {
            children.push(p(aufgTxt, { size: 22, after: 80, align: AlignmentType.JUSTIFIED, keepNext: !!(mitAufgabe && a.beleg) }));
          }
          // Nebenrechnungen
          if (mitAufgabe && a.nebenrechnungen?.length) {
            a.nebenrechnungen.forEach(nr => {
              children.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: [
                new TextRun({ text: nr.label + ": ", size: 20, bold: true, font: "Arial" }),
                new TextRun({ text: nr.formel + " = " + nr.ergebnis, size: 20, font: "Arial" }),
              ]}));
            });
            children.push(ep(60));
          }
          if (mitLoesung && a.soll?.length) {
            children.push(bsTable(a.soll, a.haben || []));
            children.push(ep(80));
            if (a.erklaerung) children.push(p(a.erklaerung, { size: 18, italic: true, color: "374151", after: 60 }));
          } else if (mitAufgabe && !mitLoesung) {
          }
        }

        // ── Theorie-Aufgabe ──────────────────────────────────────────────
        if (a.taskTyp === "theorie") {
          if (mitAufgabe && (a._aufgabeEdit ?? a.aufgabe)) {
            children.push(p(stripHtml(anrede(config.klasse, (a._aufgabeEdit ?? a.aufgabe))), { size: 22, after: 80, align: AlignmentType.JUSTIFIED }));
          }
          if (mitLoesung && a.loesung) {
            children.push(p(stripHtml(a.loesung), { size: 20, italic: true, color: "166534", after: 80 }));
          } else if (mitAufgabe && !mitLoesung) {
          }
        }
      });

      // ══════════════════════════════════════════════════════════════════════
      // 4. DOKUMENT BAUEN
      // ══════════════════════════════════════════════════════════════════════
      const doc = new Document({
        numbering: {
          config: [{
            reference: "bw-bullets",
            levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 480, hanging: 240 } } } }],
          }],
        },
        styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
        sections: [{
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
            },
          },
          children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      if (ext === "blob") return blob; // interner Aufruf → Blob zurückgeben
      const url  = URL.createObjectURL(blob);
      const el   = document.createElement("a");
      el.href    = url;
      el.download = `${pruefArt.replace(/[^a-zA-Z0-9äöüÄÖÜß_\- ]/g, "")}_Kl${klasseStr}_${kl.datum || config.datum || "2026"}.${ext}`;
      document.body.appendChild(el); el.click(); document.body.removeChild(el);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err) {
      alert("Word-Export Fehler: " + err.message);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#0f172a", borderRadius:"16px", width:"100%", maxWidth:"520px", overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #1e293b", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#64748b", marginBottom:"4px" }}>Export</div>
            <div style={{ fontSize:"20px", fontWeight:900, color:"#fff" }}>📄 Buchungs<span style={{color:"#e8600a"}}>Werk</span></div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", width:"36px", height:"36px", cursor:"pointer", fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Modus-Auswahl */}
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"10px" }}>Inhalt</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"20px" }}>
            {modusOpts.map(opt => {
              const isActive = modus === opt.key;
              const disabled = opt.key === "ki" && !kiHistorie?.length;
              return (
                <button key={opt.key} onClick={() => !disabled && setModus(opt.key)}
                  style={{ padding:"12px 14px", borderRadius:"10px", border:`2px solid ${isActive ? "#e8600a" : "#1e293b"}`,
                    background: isActive ? "#1e3a5f" : "#1e293b",
                    cursor: disabled ? "not-allowed" : "pointer",
                    textAlign:"left", opacity: disabled ? 0.4 : 1, transition:"all 0.15s" }}>
                  <div style={{ marginBottom:"6px", color: isActive ? "#e8600a" : "#64748b" }}>{React.createElement(opt.icon, { size: 20, strokeWidth: 1.5 })}</div>
                  <div style={{ fontSize:"13px", fontWeight:700, color: isActive ? "#e8600a" : "#e2e8f0" }}>{opt.label}</div>
                  <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Kopfzeile */}
          <div style={{ marginBottom:"14px" }}>
            <button onClick={() => setZeigeKopfEditor(p => !p)}
              style={{ width:"100%", padding:"9px 14px", borderRadius:"8px", border:"1px solid #334155",
                background: zeigeKopfEditor ? "#1e3a5f" : "#1e293b", color: zeigeKopfEditor ? "#e8600a" : "#94a3b8",
                fontWeight:700, fontSize:12, cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between" }}>
              <span style={{display:"flex",alignItems:"center",gap:5}}><ClipboardList size={12} strokeWidth={1.5}/>Kopfzeile bearbeiten</span>
              <span>{zeigeKopfEditor ? "▲" : "▼"}</span>
            </button>
            {zeigeKopfEditor && (
              <div style={{ background:"#fff", borderRadius:"0 0 8px 8px", padding:"14px", border:"1px solid #334155", borderTop:"none" }}>
                <KopfzeilenEditor config={config} firma={firma} kopfzeile={kopfzeile} setKopfzeile={setKopfzeile} />
              </div>
            )}
          </div>

          {/* Export-Buttons */}
          <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"10px" }}>Format</div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <button onClick={() => exportWord("docx")}
              style={{ flex:1, minWidth:"120px", padding:"12px 14px", borderRadius:"10px",
                background:"linear-gradient(180deg,rgba(37,99,235,0.22) 0%,rgba(37,99,235,0.10) 100%)",
                border:"1.5px solid rgba(37,99,235,0.55)", color:"#93c5fd", fontWeight:800, fontSize:"13px", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                boxShadow:"0 3px 0 rgba(0,0,0,0.5), 0 0 18px rgba(37,99,235,0.25), inset 0 1px 0 rgba(147,197,253,0.15)" }}>
              <FilePen size={18} strokeWidth={1.5}/>
              Word / Pages
            </button>
            <button onClick={() => exportPDF()}
              style={{ flex:1, minWidth:"120px", padding:"12px 14px", borderRadius:"10px",
                background:"linear-gradient(180deg,rgba(220,38,38,0.22) 0%,rgba(220,38,38,0.10) 100%)",
                border:"1.5px solid rgba(220,38,38,0.55)", color:"#fca5a5", fontWeight:800, fontSize:"13px", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                boxShadow:"0 3px 0 rgba(0,0,0,0.5), 0 0 18px rgba(220,38,38,0.25), inset 0 1px 0 rgba(252,165,165,0.15)" }}>
              <Printer size={18} strokeWidth={1.5}/>
              PDF
            </button>
          </div>
          <div style={{ marginTop:"10px", fontSize:"10px", color:"#64748b", textAlign:"center" }}>
            Word/Pages: .docx herunterladen, dann "Öffnen mit Pages" · PDF: neuer Tab öffnet → Drucken / Als PDF speichern
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHRITT 3 — Aufgaben-Vorschau
// ══════════════════════════════════════════════════════════════════════════════
const fmt_datum = iso => new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

function SchrittAufgaben({ config, firma, onNeu, onMaterialLaden, onThemen, onFirma, aufgabenRef }) {
  const settings = useSettings();
  const [showLoesungen, setShowLoesungen] = useState(!!settings.loesungenStandardAn);
  const [globalMode, setGlobalMode] = useState(settings.belegModus || "beleg"); // "beleg" | "text"
  const [exportOffen, setExportOffen] = useState(false);
  const [h5pOffen, setH5pOffen] = useState(false);
  const [materialienOffen, setMaterialienOffen] = useState(false);
  const [speichernStatus, setSpeichernStatus] = useState(""); // "" | "saving" | "ok" | "err"
  const [kiHistorie, setKiHistorie] = useState([]);
  const speichernTimerRef = useRef(null);
  useEffect(() => () => { if (speichernTimerRef.current) clearTimeout(speichernTimerRef.current); }, []);

  const pool = useMemo(() => {
    const result = [];
    Object.entries(config.selectedThemen).forEach(([lb, taskIds]) => {
      // Suche in allen Klassen (klassenübergreifende Wiederholung)
      // taskIds kann Duplikate enthalten (für count > 1)
      [7, 8, 9, 10].forEach(k => {
        (AUFGABEN_POOL[k]?.[lb] || []).forEach(t => {
          const cnt = taskIds.filter(x => x === t.id).length;
          for (let i = 0; i < cnt; i++) result.push(t);
        });
      });
    });
    return result;
  }, [config.selectedThemen]);

  const [aufgaben, setAufgaben] = useState(() => {
    if (pool.length === 0) return [];
    const result = [];
    let punkteSum = 0;
    const zielAnzahl = config.anzahl || 5;
    const maxRunden = config.maxPunkte ? 50 : zielAnzahl * 4; // safety cap
    let teilaufgabenSum = 0; // Komplexaufgaben zählen als N Teilaufgaben
    for (let i = 0; i < maxRunden; i++) {
      const typ = pool[i % pool.length];
      const isLB2 = Object.keys(config.selectedThemen).some(lb => lb.includes("Werkstoffe"));
      const opts = {
        werkstoffId: config.werkstoffId || "rohstoffe",
        ...(typ.id === "8_komplex_einkauf_kette" ? (config.komplexOpts || {}) : {}),
        ...(typ.id === "8_komplex_verkauf_kette"    ? (config.verkaufOpts    || {}) : {}),
        ...(typ.id === "9_komplex_forderungskette"  ? (config.forderungOpts  || {}) : {}),
        ...(typ.id === "10_komplex_abschlusskette" ? (config.abschlussOpts || {}) : {}),
        ...(typ.id.startsWith("7_pct_") ? (config.pctOpts || {}) : {}),
      };
      let gen;
      try {
        gen = typ.taskTyp === "theorie" ? typ.generate() : typ.generate(firma, opts);
      } catch(e) {
        console.warn("BuchungsWerk: Fehler in generate() für", typ.id, e.message);
        continue;
      }
      if (!gen) continue;
      const pts = typ.taskTyp === "komplex"
        ? (gen.schritte || []).reduce((s, st) => s + st.punkte, 0)
        : typ.taskTyp === "theorie"
          ? (gen.nrPunkte || 4)
          : typ.taskTyp === "rechnung" || typ.taskTyp === "schaubild"
          ? (gen.punkte || gen.nrPunkte || 3)
          : (gen.soll?.length || 0) + (gen.haben?.length || 0) + (gen.nrPunkte || 0);
      // Komplex-Aufgabe zählt als so viele Teilaufgaben wie sie Schritte hat
      const schrittAnzahl = typ.taskTyp === "komplex" ? (gen.schritte || []).length : 1;
      if (config.maxPunkte && punkteSum + pts > config.maxPunkte) break;
      if (!config.maxPunkte && result.length > 0 && teilaufgabenSum + schrittAnzahl > zielAnzahl) break;
      result.push({ ...gen, titel: typ.titel, id: `${typ.id}_${i}`, taskTyp: typ.taskTyp || "buchung", themenTyp: typ.themenTyp,
        _baseTypId: typ.id, _typ: typ, _opts: opts, _firma: firma });
      punkteSum += pts;
      teilaufgabenSum += schrittAnzahl;
    }
    // Mastery tracking: Nutzung pro Task-Typ speichern
    try { trackMastery(result); } catch {}
    return result;
  });

  useEffect(() => { if (aufgabenRef) aufgabenRef.current = aufgaben; }, [aufgaben, aufgabenRef]);

  const gesamtPunkte = aufgaben.reduce((s, a) => s + berechnePunkte(a), 0);
  const activeLBs = Object.keys(config.selectedThemen);

  return (
    <div>
      {exportOffen && (
        <ExportModal
          aufgaben={aufgaben}
          config={config}
          firma={firma}
          kiHistorie={kiHistorie}
          onSchliessen={() => setExportOffen(false)}
        />
      )}
      {h5pOffen && (
        <H5PModal
          aufgaben={aufgaben}
          config={config}
          firma={firma}
          onSchliessen={() => setH5pOffen(false)}
        />
      )}
      {materialienOffen && (
        <MaterialienModal
          onSchliessen={() => setMaterialienOffen(false)}
          onLaden={onMaterialLaden}
        />
      )}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={S.label}>Schritt 3 von 3 · Vorschau</div>
            <div style={S.h2}>
              {config.typ}{config.pruefungsart ? ` · ${config.pruefungsart}` : ""} · Klasse {config.klasse}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, ...S.tag(firma.farbe) }}><FirmaLogoSVG firma={firma} size={18}/>{firma.name}</span>
              {config.pruefungsart && <span style={{ display:"inline-flex", alignItems:"center", gap:4, ...S.tag("#0f172a") }}><ClipboardList size={11} strokeWidth={1.5}/>{config.pruefungsart}</span>}
              {activeLBs.map(lb => { const m = LB_INFO[lb] || { icon: "FileText", farbe: "#475569" }; return <span key={lb} style={{ display:"inline-flex", alignItems:"center", gap:3, ...S.tag(m.farbe) }}><IconFor name={m.icon} size={11} />{lb.split("·")[0].trim()}</span>; })}
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, ...S.tag("#475569") }}><Calendar size={11} strokeWidth={1.5}/>{fmt_datum(config.datum)}</span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, ...S.tag("#475569") }}><ClipboardList size={11} strokeWidth={1.5}/>{aufgaben.reduce((s,a) => s + (a.taskTyp === "komplex" ? (a.schritte?.length || 1) : Array.isArray(a.teilaufgaben) ? a.teilaufgaben.length : 1), 0)} Aufg. · {gesamtPunkte} P</span>
            </div>
            {/* Fortschrittsleiste bei Punktziel */}
            {config.maxPunkte && (
              <div style={{ marginTop: "10px", maxWidth: "360px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(240,236,227,0.45)", marginBottom: "3px" }}>
                  <span>Punkteausnutzung</span>
                  <span style={S.bold}>{gesamtPunkte} / {config.maxPunkte} P ({Math.round(gesamtPunkte/config.maxPunkte*100)} %)</span>
                </div>
                <div style={{ height: "8px", background: "rgba(240,236,227,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: Math.min(100, Math.round(gesamtPunkte/config.maxPunkte*100)) + "%", background: "#e8600a", borderRadius: "4px" }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>

            {/* ── Globaler Modus-Schalter (Pill-Slider) ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>Alle Aufgaben</div>
              <div
                onClick={() => setGlobalMode(globalMode === "beleg" ? "text" : "beleg")}
                title={globalMode === "beleg" ? "Zum Geschäftsfall wechseln" : "Zum Beleg wechseln"}
                style={{ position:"relative", display:"flex", background:"rgba(20,16,8,0.8)", border:"1.5px solid rgba(240,236,227,0.18)", borderRadius:"24px", padding:"3px", cursor:"pointer", userSelect:"none", width:"168px", flexShrink:0 }}>
                {/* Gleitender Thumb */}
                <div style={{
                  position:"absolute", top:3,
                  left: globalMode === "beleg" ? 3 : "calc(50% + 1px)",
                  width:"calc(50% - 4px)", height:"calc(100% - 6px)",
                  background:"linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
                  borderRadius:"20px",
                  transition:"left 0.22s cubic-bezier(.4,0,.2,1)",
                  boxShadow:"0 2px 6px rgba(232,96,10,0.5), inset 0 1px 0 rgba(255,200,80,0.18)",
                  pointerEvents:"none",
                }}/>
                <span style={{ position:"relative", zIndex:1, padding:"5px 0", color: globalMode === "beleg" ? "#f0ece3" : "rgba(240,236,227,0.4)", fontWeight:700, fontSize:"11px", letterSpacing:"0.03em", transition:"color 0.15s", flex:1, textAlign:"center" }}>Beleg</span>
                <span style={{ position:"relative", zIndex:1, padding:"5px 0", color: globalMode === "text" ? "#f0ece3" : "rgba(240,236,227,0.4)", fontWeight:700, fontSize:"11px", letterSpacing:"0.03em", transition:"color 0.15s", flex:1, textAlign:"center" }}>GF</span>
              </div>
            </div>

            <button onClick={() => setShowLoesungen(!showLoesungen)} style={S.btnSecondary}>{showLoesungen ? "Lösungen ausblenden" : "Alle Lösungen"}</button>
            <button onClick={() => {
              try {
                const ki = JSON.parse(localStorage.getItem("buchungswerk_ki_export") || "[]");
                setKiHistorie(ki);
              } catch { setKiHistorie([]); }
              setExportOffen(true);
            }} style={{ ...S.btnPrimary, display:"flex", alignItems:"center", gap:"7px" }}>
              <Download size={14} strokeWidth={1.5}/>Export
            </button>
            <button onClick={() => setH5pOffen(true)} style={{ ...S.btnSecondary, display:"flex", alignItems:"center", gap:6, padding:"10px 16px", fontSize:"13px" }}><Monitor size={14} strokeWidth={1.5}/>H5P</button>
            <button onClick={() => setMaterialienOffen(true)} style={{ ...S.btnSecondary, display:"flex", alignItems:"center", gap:6 }}><Library size={14} strokeWidth={1.5}/>Materialien</button>
            <button onClick={onFirma} style={{ padding:"6px 14px", borderRadius:"8px", border:"1px solid rgba(240,236,227,0.15)", background:"rgba(240,236,227,0.05)", color:"rgba(240,236,227,0.45)", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>‹ Unternehmen</button>
            <button onClick={onThemen} style={{ padding:"6px 14px", borderRadius:"8px", border:"1px solid rgba(240,236,227,0.15)", background:"rgba(240,236,227,0.05)", color:"rgba(240,236,227,0.45)", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>‹‹ Themen</button>
            <button onClick={async () => {
              setSpeichernStatus("saving");
              const titel = `${config.typ}${config.pruefungsart ? " · " + config.pruefungsart : ""} · Kl. ${config.klasse} · ${firma.name}`;
              const res = await apiFetch("/materialien", "POST", {
                titel,
                jahrgangsstufe: config.klasse,
                typ: config.typ,
                pruefungsart: config.pruefungsart || null,
                firma_name: firma.name,
                firma_icon: firma.icon,
                gesamt_punkte: gesamtPunkte,
                daten_json: JSON.stringify({ config, firma, aufgaben }),
              });
              setSpeichernStatus(res ? "ok" : "err");
              if (speichernTimerRef.current) clearTimeout(speichernTimerRef.current);
              speichernTimerRef.current = setTimeout(() => setSpeichernStatus(""), 3000);
            }} style={{ ...S.btnPrimary, display:"flex", alignItems:"center", gap:6, ...(speichernStatus === "ok" && { background: "rgba(74,222,128,0.85)", boxShadow: "0 3px 0 rgba(0,0,0,0.5), 0 0 16px rgba(74,222,128,0.35)" }), ...(speichernStatus === "err" && { background: "rgba(239,68,68,0.9)" }), ...(speichernStatus === "saving" && { opacity: 0.7 }) }}>
              {speichernStatus === "saving" ? <><Save size={14} strokeWidth={1.5}/>…</> : speichernStatus === "ok" ? <><CheckSquare size={14} strokeWidth={1.5}/>Gespeichert</> : speichernStatus === "err" ? "✗ Fehler" : <><Save size={14} strokeWidth={1.5}/>Speichern</>}
            </button>
          </div>
        </div>

        {/* Firmen-Vorspann */}
        {(() => {
          const intro = config.klasse <= 9
            ? `Du bist als Auszubildende/r im Unternehmen tätig und mit Aufgaben des betrieblichen Rechnungswesens betraut.`
            : `Als Mitarbeiterin bzw. Mitarbeiter im Unternehmen sind Sie mit Aufgaben des betrieblichen Rechnungswesens betraut.`;
          const wtLabels = [
            ["Rohstoffe", firma.rohstoffe],
            ["Hilfsstoffe", firma.hilfsstoffe],
            ["Fremdbauteile", firma.fremdbauteile],
            ["Betriebsstoffe", firma.betriebsstoffe],
          ].filter(([, list]) => list?.length);
          return (
            <div style={{ marginTop: "18px", padding: "14px 18px", background: "rgba(240,236,227,0.04)", border: `1px solid rgba(240,236,227,0.1)`, borderLeft: `4px solid ${firma.farbe}`, borderRadius: "10px", textAlign: "left", backdropFilter:"blur(8px)" }}>
              <div style={{ fontSize: "13px", color: "rgba(240,236,227,0.9)", marginBottom: "8px", textAlign: "left" }}>
                <strong style={{color:"#f0ece3"}}><IconFor name={firma.icon} size={13} style={{ verticalAlign:"middle", marginRight:4 }} />{firma.name}</strong>, {firma.plz} {firma.ort} – {firma.slogan} {intro}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "5px", fontSize: "12px", color: "rgba(240,236,227,0.7)", marginBottom: "8px", textAlign: "left" }}>
                <div><strong style={{color:"rgba(240,236,227,0.85)"}}>Rechtsform:</strong> {firma.rechtsform}</div>
                <div><strong style={{color:"rgba(240,236,227,0.85)"}}>Inhaber/in:</strong> {firma.inhaber}</div>
                <div><strong style={{color:"rgba(240,236,227,0.85)"}}>Branche:</strong> {firma.branche}</div>
                <div><strong style={{color:"rgba(240,236,227,0.85)"}}>IBAN:</strong> {fmtIBAN(firma.iban).slice(0, 18)}…</div>
              </div>
              {/* Werkstoffe */}
              <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px", textAlign: "left" }}>
                {wtLabels.map(([label, list]) => (
                  <div key={label} style={{ fontSize: "12px", color: "rgba(240,236,227,0.7)" }}>
                    <strong style={{color:"rgba(240,236,227,0.85)"}}>{label}:</strong> {list.join(", ")}
                  </div>
                ))}
              </div>
              <div style={{ padding: "6px 10px", background: "rgba(240,236,227,0.08)", borderRadius: "6px", fontSize: "11px", color: "rgba(240,236,227,0.6)", textAlign: "left", border:"1px solid rgba(240,236,227,0.12)" }}>
                <strong style={{color:"rgba(240,236,227,0.8)"}}>Formale Vorgaben:</strong> Bei Buchungssätzen sind Kontonummer, Kontobezeichnung und Betrag anzugeben. Ergebnisse auf zwei Nachkommastellen runden. Sofern nicht anders angegeben: USt-Satz 19 %.
              </div>
            </div>
          );
        })()}
      </div>

      <PunktePanel aufgaben={aufgaben} typ={config.typ} maxPunkte={config.maxPunkte} />

      {aufgaben.map((a, i) =>
        a.taskTyp === "komplex"
          ? <KomplexKarte key={a.id} aufgabe={a} nr={i + 1} showLoesung={showLoesungen} globalMode={globalMode} klasse={config.klasse}
              onAufgabeChange={updated => setAufgaben(prev => prev.map((x, xi) => xi === i ? updated : x))}
              onSchrittEntfernen={schrittIdx => {
                setAufgaben(prev => prev.map((aufg, ai) => {
                  if (ai !== i) return aufg;
                  const optsKey = (aufg.schritte || [])[schrittIdx]?._optsKey;
                  // Wenn kein optsKey → einfaches Filtern (Schritt ist immer vorhanden)
                  if (!optsKey || !aufg._typ) {
                    const neuSchritte = (aufg.schritte || [])
                      .filter((_, si) => si !== schrittIdx)
                      .map((s, ni) => ({ ...s, nr: ni + 1 }));
                    return { ...aufg, schritte: neuSchritte };
                  }
                  // Mit optsKey → Neugeneration mit deaktiviertem Schritt
                  const newOpts = { ...aufg._opts, [optsKey]: false };
                  try {
                    const gen = aufg._typ.generate(aufg._firma, newOpts);
                    if (!gen) return aufg;
                    return { ...aufg, ...gen, _opts: newOpts };
                  } catch { return aufg; }
                }));
              }}
              onSchrittHinzufuegen={optsKey => {
                setAufgaben(prev => prev.map((aufg, ai) => {
                  if (ai !== i || !aufg._typ) return aufg;
                  const newOpts = { ...aufg._opts, [optsKey]: true };
                  try {
                    const gen = aufg._typ.generate(aufg._firma, newOpts);
                    if (!gen) return aufg;
                    return { ...aufg, ...gen, _opts: newOpts };
                  } catch { return aufg; }
                }));
              }}
            />
          : a.taskTyp === "theorie"
          ? <TheorieKarte  key={a.id} aufgabe={a} nr={i + 1} showLoesung={showLoesungen} klasse={config.klasse} />
          : <AufgabeKarte  key={a.id} aufgabe={a} nr={i + 1} showLoesung={showLoesungen} globalMode={globalMode} klasse={config.klasse}
              onAufgabeChange={updated => setAufgaben(prev => prev.map((x, xi) => xi === i ? updated : x))} />
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", alignItems:"center" }}>
        <button onClick={onFirma} style={{ padding:"8px 16px", borderRadius:"8px", border:"1.5px solid #334155", background:"transparent", color:"#94a3b8", fontWeight:700, fontSize:12, cursor:"pointer" }}>‹ Unternehmen</button>
        <button onClick={onThemen} style={{ padding:"8px 16px", borderRadius:"8px", border:"1px solid rgba(240,236,227,0.15)", background:"rgba(240,236,227,0.05)", color:"rgba(240,236,227,0.45)", fontWeight:700, fontSize:12, cursor:"pointer" }}>‹‹ Themen</button>
        <button onClick={onNeu} style={S.btnSecondary}>✕ Neu starten</button>
        <button onClick={() => {
          try {
            const ki = JSON.parse(localStorage.getItem("buchungswerk_ki_export") || "[]");
            setKiHistorie(ki);
          } catch { setKiHistorie([]); }
          setExportOffen(true);
        }} style={{ ...S.btnPrimary, display:"flex", alignItems:"center", gap:"7px" }}>
          <FilePen size={15} strokeWidth={2}/>
          <Printer size={15} strokeWidth={2}/>
          Exportieren
        </button>
        <button onClick={() => setH5pOffen(true)} style={{ ...S.btnPrimary, display:"flex", alignItems:"center", gap:"7px" }}>
          <Monitor size={15} strokeWidth={2}/>
          H5P exportieren
        </button>
      </div>
    </div>
  );
}


// ── Live T-Konto – visuelles Feedback nach korrekter Buchung ─────────────────
function LiveTKonto({ sollKuerzel, habenKuerzel, betrag }) {
  const fmt = (b) => Number(b).toLocaleString("de-DE", { minimumFractionDigits:2 });
  const Seite = ({ kuerzel, aktiveSeite }) => (
    <div style={{ flex:1, border:"1px solid rgba(74,222,128,0.2)", borderRadius:8, overflow:"hidden" }}>
      <div style={{ padding:"3px 8px", background:"rgba(74,222,128,0.08)", borderBottom:"1px solid rgba(74,222,128,0.12)", fontSize:10, fontWeight:800, color:"#4ade80", textAlign:"center", letterSpacing:".05em" }}>{kuerzel}</div>
      <div style={{ display:"flex", minHeight:44 }}>
        {["SOLL","HABEN"].map(s => (
          <div key={s} style={{ flex:1, borderRight:s==="SOLL"?"1px solid rgba(240,236,227,0.07)":"none", padding:"5px 8px" }}>
            <div style={{ fontSize:7.5, color:"rgba(240,236,227,0.25)", marginBottom:3 }}>{s}</div>
            {s === aktiveSeite
              ? <div style={{ fontSize:13, fontWeight:800, color:"#4ade80", fontFamily:"'Fira Code',monospace" }}>{fmt(betrag)}</div>
              : <div style={{ fontSize:10, color:"rgba(240,236,227,0.12)", fontFamily:"'Fira Code',monospace" }}>—</div>}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ marginTop:10, padding:"9px 11px", background:"rgba(74,222,128,0.04)", border:"1px solid rgba(74,222,128,0.14)", borderRadius:10 }}>
      <div style={{ fontSize:9, fontWeight:800, color:"rgba(74,222,128,0.55)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:7 }}>T-Konto · Buchung</div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <Seite kuerzel={sollKuerzel} aktiveSeite="SOLL"/>
        <div style={{ fontSize:14, color:"rgba(74,222,128,0.35)", flexShrink:0 }}>→</div>
        <Seite kuerzel={habenKuerzel} aktiveSeite="HABEN"/>
      </div>
    </div>
  );
}

function BankingSimulator7({ firma, onAbschluss, lehrerConfig = {}, klasse = "7", modus = "stunde", stundenMin = 45, onFortschritt }) {
  const firmaName = firma?.name || "MöbelWerk GmbH";
  const aufgabenListe = React.useMemo(() => {
    const NEUE_TYPEN = ["lueckentext","zuordnung","multi_mc","freitext","kette"];
    const klasse9Themen  = ["buchung","ueberweisung","beleg","theorie","aktie_kauf","aktie_verkauf","dividende",...NEUE_TYPEN];
    const klasse10Themen = ["buchung","theorie","klr",...NEUE_TYPEN];
    const erlaubteThemen = lehrerConfig.themen || (klasse === "10" ? klasse10Themen : klasse === "9" ? klasse9Themen : ["buchung","ueberweisung","dauerauftrag","beleg","theorie",...NEUE_TYPEN]);
    const pool = klasse === "10" ? BANK10_AUFGABEN : klasse === "9" ? BANK9_AUFGABEN : (klasse === "8" ? BANK8_AUFGABEN : BANK_AUFGABEN);
    let gefiltert = pool.filter(a => {
      if (!erlaubteThemen.includes(a.aktion)) return false;
      if (a.nurMitUst && !lehrerConfig.mitUst) return false;
      return true;
    });
    // Grundwissen: Vorklassen-Aufgaben (einfache Buchungen + MC) voranstellen
    if (lehrerConfig.grundwissen && klasse !== "7") {
      const vorPools = {
        "8":  BANK_AUFGABEN,
        "9":  [...BANK_AUFGABEN, ...BANK8_AUFGABEN],
        "10": [...BANK9_AUFGABEN],
      };
      const gwPool = (vorPools[klasse] || []).filter(a => ["buchung","theorie"].includes(a.aktion) && !a.nurMitUst);
      const gwTasks = gwPool.slice(0, 3).map(a => ({ ...a, id: "gw_"+a.id, grundwissen: true }));
      gefiltert = [...gwTasks, ...gefiltert];
    }
    return gefiltert;
  }, []); // eslint-disable-line

  const [aufgabeIdx,   setAufgabeIdx]   = useState(0);
  const [kontostand,   setKontostand]   = useState(BANK_START);
  const [ansicht,      setAnsicht]      = useState(aufgabenListe[0]?.ansicht || "konto");
  const [buchAntwort,  setBuchAntwort]  = useState({ soll: [""], haben: [""], betragSoll: [""], betragHaben: [""] });
  const [feedback,     setFeedback]     = useState(null);
  const [verlauf,      setVerlauf]      = useState([]);
  const [punkte,       setPunkte]       = useState(0);
  const [aktionOk,     setAktionOk]     = useState(false);
  const [daForm,       setDaForm]       = useState({});
  const [ueForm,       setUeForm]       = useState({});
  const [belegUeForm,  setBelegUeForm]  = useState({ empfaenger:"", iban:"", betrag:"", verwendung:"" });
  const [belegUeOk,    setBelegUeOk]    = useState(false); // Überweisung im Beleg bestätigt
  const [belegUePunkte,setBelegUePunkte]= useState(0);     // Punkte für Ue-Richtigkeit
  const [taskStartTime,setTaskStartTime]= useState(Date.now());
  const [startTime]                     = useState(Date.now);
  const [elapsed,      setElapsed]      = useState(0);
  const [szene,        setSzene]        = useState("schreibtisch"); // schreibtisch | vorfall
  const [theorieAntwort,setTheorieAntwort] = useState(null);  // index der gewählten MC-Option
  const [kalkAntwort,  setKalkAntwort]  = useState("");        // numerische Antwort Kalkulation
  const [deskPopup,    setDeskPopup]    = useState(null);      // "kalender"|"email"|"post"|null
  const [zeitAbgelaufen,setZeitAbgelaufen] = useState(false);  // Zeitlimit überschritten
  const [mahnungen,    setMahnungen]    = useState(new Set()); // Tags mit bereits abgezogenem Mahnpunkt
  const [kalSelTag,    setKalSelTag]    = useState(null);      // ausgewählter Kalendertag
  const [boersenTab,   setBoersenTab]   = useState("depot");   // "depot"|"markt" im Börsencockpit
  const [klrTab,       setKlrTab]       = useState("bab");     // "bab"|"dbr"|"kz" im KLR-Cockpit
  const [lueckenEingaben, setLueckenEingaben] = useState({});  // { lücken-id → eingabe } für Lückentext-Aufgaben
  const [zuordnungState,  setZuordnungState]  = useState({});  // { item-id → kategorie-id } für Zuordnungs-Aufgaben
  const [multiMcState,    setMultiMcState]    = useState([]);  // Array gewählter Indizes für Multi-Choice
  const [freitextAntwort, setFreitextAntwort] = useState(""); // Freitext-Eingabe
  const [ketteSchritt,    setKetteSchritt]    = useState(0);   // aktiver Schritt in Ketten-Aufgabe
  // ── Kanban-State ──────────────────────────────────────────────────────────
  const [kbBacklog,    setKbBacklog]    = useState([]);   // task-ids im Backlog
  const [kbDoing,      setKbDoing]      = useState(null); // task-id in Doing (null = leer)
  const [kbDragId,     setKbDragId]     = useState(null); // aktuell gezogene task-id
  const [kbDragOver,   setKbDragOver]   = useState(null); // "backlog"|"doing"|"pool"|null
  const [selMailId,    setSelMailId]    = useState(null); // geöffnete Mail im Inbox

  const [tutorialOffen, setTutorialOffen] = useState(() => { try { return !localStorage.getItem("bw_sim_tutorial_seen"); } catch { return true; } });

  const aufgabe   = kbDoing ? (aufgabenListe.find(a => a.id === kbDoing) ?? null) : null;
  const maxPunkte = aufgabenListe.reduce((s,a) => s + a.punkte, 0);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  // Fortschritt an Elternkomponente melden (für Heartbeat / Live-Dashboard)
  React.useEffect(() => {
    onFortschritt?.(punkte, maxPunkte);
  }, [punkte]); // eslint-disable-line

  // Zeitlimit: Punkt abziehen wenn Schüler zu lang wartet
  React.useEffect(() => {
    if (!lehrerConfig.zeitlimitSek || zeitAbgelaufen || feedback !== null || szene !== "schreibtisch") return;
    const sek = (Date.now() - taskStartTime) / 1000;
    if (sek >= lehrerConfig.zeitlimitSek) {
      setPunkte(p => Math.max(0, p - 1));
      setZeitAbgelaufen(true);
    }
  }, [elapsed]); // eslint-disable-line

  // Reset-Effekt: wenn eine neue Aufgabe in "doing" gezogen wird
  React.useEffect(() => {
    if (!kbDoing) return;
    const a = aufgabenListe.find(a => a.id === kbDoing);
    if (!a) return;
    setAnsicht(a.ansicht || "konto");
    setFeedback(null);
    const nS = Math.max(1,(a.soll||[]).length), nH = Math.max(1,(a.haben||[]).length);
    setBuchAntwort({ soll: Array(nS).fill(""), haben: Array(nH).fill(""), betragSoll: Array(nS).fill(""), betragHaben: Array(nH).fill("") });
    setAktionOk(false);
    setBelegUeOk(false);
    setBelegUePunkte(0);
    setBelegUeForm({ empfaenger:"", iban:"", betrag:"", verwendung:"" });
    setTheorieAntwort(null);
    setKalkAntwort("");
    setLueckenEingaben({});
    setZuordnungState({});
    setMultiMcState([]);
    setFreitextAntwort("");
    setKetteSchritt(0);
    setDeskPopup(null);
    setZeitAbgelaufen(false);
    setKalSelTag(null);
    setTaskStartTime(Date.now());
    if (a.dauerauftragsDaten) setDaForm({ empfaenger: a.dauerauftragsDaten.empfaenger, rhythmus:"monatlich", tag:"1" });
    else setDaForm({});
    if (a.aktion !== "beleg" && a.ueberweisungsDaten) setUeForm({ empfaenger: a.ueberweisungsDaten.empfaenger });
    else if (a.aktion !== "beleg") setUeForm({});
  }, [kbDoing]); // eslint-disable-line

  function pruefen() {
    let buchOk = false;
    if (aufgabe.typ === "mc") {
      buchOk = theorieAntwort === aufgabe.mcKorrekt;
    } else if (aufgabe.typ === "kalkulation") {
      // Akzeptiere deutsches Format (1.234,56) und internationales (1234.56)
      const normiert = (kalkAntwort || "").trim()
        .replace(/\./g, "").replace(",", ".");    // 1.234,56 → 123456 → 1234.56
      const val = parseFloat(normiert);
      buchOk = !isNaN(val) && Math.abs(val - aufgabe.kalkulation.richtigerWert) < 0.055;
    } else if (aufgabe.typ === "lueckentext") {
      // Alle Lücken müssen korrekt ausgefüllt sein
      buchOk = (aufgabe.lueckentext?.luecken || []).length > 0 &&
        (aufgabe.lueckentext.luecken).every((l) => {
          const eingabe = (lueckenEingaben[l.id] || "").trim().toUpperCase();
          const erlaubt = [l.korrekt, ...(l.korrektAlt || [])].map(k => k.toUpperCase());
          return erlaubt.includes(eingabe);
        });
    } else if (aufgabe.typ === "zuordnung") {
      // Alle Items müssen der richtigen Kategorie zugewiesen sein
      buchOk = (aufgabe.zuordnung?.items || []).length > 0 &&
        (aufgabe.zuordnung.items).every(item =>
          (zuordnungState[item.id] || "") === item.korrektKat
        );
    } else if (aufgabe.typ === "multi_mc") {
      // Exakt die richtigen Antworten müssen ausgewählt sein
      const korrektSet = new Set(aufgabe.multiKorrekt || []);
      const gewaehlt   = new Set(multiMcState);
      buchOk = korrektSet.size > 0 &&
        [...korrektSet].every(i => gewaehlt.has(i)) &&
        [...gewaehlt].every(i => korrektSet.has(i));
    } else if (aufgabe.typ === "freitext") {
      // Freitext: akzeptiert wenn ausreichend Text eingegeben (selbst bewertet)
      buchOk = (freitextAntwort || "").trim().length >= (aufgabe.freitext?.minZeichen || 20);
    } else if (aufgabe.typ === "kette") {
      // Ketten-Aufgabe: aktuellen Schritt prüfen, dann eigene Punkte setzen und early-return
      const ks = aufgabe.kette[ketteSchritt];
      if (ks.typ === "mc") {
        buchOk = theorieAntwort === ks.mcKorrekt;
      } else if (ks.typ === "kalkulation") {
        const n = (kalkAntwort || "").trim().replace(/\./g, "").replace(",", ".");
        const v = parseFloat(n);
        buchOk = !isNaN(v) && Math.abs(v - ks.kalkulation.richtigerWert) < 0.055;
      } else if (ks.typ === "buchung") {
        const eS = (buchAntwort.soll||[""]).map(s=>(s||"").trim().toUpperCase()).filter(Boolean);
        const eH = (buchAntwort.haben||[""]).map(h=>(h||"").trim().toUpperCase()).filter(Boolean);
        const rS = ks.soll.map(s=>[s.kuerzel.toUpperCase(),s.nr||""]);
        const rH = ks.haben.map(h=>[h.kuerzel.toUpperCase(),h.nr||""]);
        const _pbk = s => { const n=(s||"").trim().replace(/\./g,"").replace(",","."); return parseFloat(n); };
        const _sbk = i => ks.soll[i]?.betrag ?? (ks.soll.length===1 ? ks.betrag ?? aufgabe.betrag : null);
        const _hbk = i => ks.haben[i]?.betrag ?? (ks.haben.length===1 ? ks.betrag ?? aufgabe.betrag : null);
        const kontoOkK = rS.length>0 && rH.length>0
               && eS.length===rS.length
               && rS.every(([k,n])=>eS.some(e=>e===k||(n&&e===n)))
               && eS.every(e=>rS.some(([k,n])=>e===k||(n&&e===n)))
               && eH.length===rH.length
               && rH.every(([k,n])=>eH.some(e=>e===k||(n&&e===n)))
               && eH.every(e=>rH.some(([k,n])=>e===k||(n&&e===n)));
        const betragOkK = ks.soll.every((_,i)=>{
          const e=_sbk(i); if(e===null||e===undefined) return true;
          const v=_pbk((buchAntwort.betragSoll||[])[i]); return !isNaN(v)&&Math.abs(v-e)<0.055;
        }) && ks.haben.every((_,i)=>{
          const e=_hbk(i); if(e===null||e===undefined) return true;
          const v=_pbk((buchAntwort.betragHaben||[])[i]); return !isNaN(v)&&Math.abs(v-e)<0.055;
        });
        buchOk = kontoOkK && betragOkK;
      }
      const sekK = (Date.now() - taskStartTime) / 1000;
      const spK  = buchOk && lehrerConfig.geschwindigkeitsBonus !== false && sekK <= 30 ? 1 : 0;
      const gewK = (buchOk ? (ks.punkte || 1) : 0) + spK;
      setPunkte(p => p + gewK);
      setFeedback(buchOk ? "richtig" : "falsch");
      // verlauf nur beim letzten Schritt
      if (ketteSchritt === aufgabe.kette.length - 1) {
        setVerlauf(v => [...v, { ...aufgabe, korrekt: buchOk, gewPunkte: gewK, speedBonus: spK }]);
      }
      return; // ← kein gemeinsamer Tail
    } else {
      const eS = (buchAntwort.soll||[""]).map(s=>(s||"").trim().toUpperCase()).filter(Boolean);
      const eH = (buchAntwort.haben||[""]).map(h=>(h||"").trim().toUpperCase()).filter(Boolean);
      const rS = aufgabe.soll.map(s=>[s.kuerzel.toUpperCase(),s.nr||""]);
      const rH = aufgabe.haben.map(h=>[h.kuerzel.toUpperCase(),h.nr||""]);
      const kontoOk = rS.length>0 && rH.length>0
             && eS.length===rS.length
             && rS.every(([k,n])=>eS.some(e=>e===k||(n&&e===n)))
             && eS.every(e=>rS.some(([k,n])=>e===k||(n&&e===n)))
             && eH.length===rH.length
             && rH.every(([k,n])=>eH.some(e=>e===k||(n&&e===n)))
             && eH.every(e=>rH.some(([k,n])=>e===k||(n&&e===n)));
      // Betrag-Validierung
      const _pb = s => { const n=(s||"").trim().replace(/\./g,"").replace(",","."); return parseFloat(n); };
      const _sb = i => aufgabe.soll[i]?.betrag ?? (aufgabe.soll.length===1 ? aufgabe.betrag : null);
      const _hb = i => aufgabe.haben[i]?.betrag ?? (aufgabe.haben.length===1 ? aufgabe.betrag : null);
      const betragOk = aufgabe.soll.every((_,i)=>{
        const e=_sb(i); if(e===null||e===undefined) return true;
        const v=_pb((buchAntwort.betragSoll||[])[i]); return !isNaN(v)&&Math.abs(v-e)<0.055;
      }) && aufgabe.haben.every((_,i)=>{
        const e=_hb(i); if(e===null||e===undefined) return true;
        const v=_pb((buchAntwort.betragHaben||[])[i]); return !isNaN(v)&&Math.abs(v-e)<0.055;
      });
      buchOk = kontoOk && betragOk;
    }
    // Speed bonus: +1 if answered within 30 seconds
    const sek = (Date.now() - taskStartTime) / 1000;
    const speedBonus = buchOk && lehrerConfig.geschwindigkeitsBonus !== false && sek <= 30 ? 1 : 0;
    const gew = (buchOk ? aufgabe.punkte : 0) + belegUePunkte + speedBonus;
    setPunkte(p => p + gew);
    setFeedback(buchOk ? "richtig" : "falsch");
    setVerlauf(v => [...v, { ...aufgabe, korrekt: buchOk, gewPunkte: gew, speedBonus }]);
    if (buchOk && aufgabe.soll.length > 0) {
      const delta = aufgabe.soll.some(s => s.kuerzel === "BK") ? +aufgabe.betrag
                  : aufgabe.haben.some(h => h.kuerzel === "BK") ? -aufgabe.betrag : 0;
      setKontostand(k => k + delta);
    }
  }

  // Spieltag: startet bei 1, läuft proportional mit den Aufgaben bis Tag 28
  const getSpielTag = (idx) => Math.max(1, Math.round(1 + (idx / Math.max(1, aufgabenListe.length)) * 27));
  const spielTag = getSpielTag(aufgabeIdx);

  function weiter() {
    const newIdx = aufgabeIdx + 1;
    if (newIdx >= aufgabenListe.length) {
      onAbschluss({ punkte, maxPunkte, verlauf, zeit: Math.round(elapsed / 1000), poolGroesse: aufgabenListe.length });
      return;
    }
    // Strafpunkte für Termine, die jetzt überfällig werden
    const newSpielTag = getSpielTag(newIdx);
    const kalEintraege = (klasse === "10" ? KALENDER10_EINTRAEGE : klasse === "9" ? KALENDER9_EINTRAEGE : klasse === "8" ? KALENDER8_EINTRAEGE : KALENDER_EINTRAEGE).filter(e => e.typ === "task");
    let strafPunkte = 0;
    kalEintraege.forEach(e => {
      if (e.tag >= spielTag && e.tag < newSpielTag) {
        const erledigt = verlauf.some(v => v.aktion === e.aufgabeAktion && v.korrekt);
        if (!erledigt) { strafPunkte++; setMahnungen(m => { const n = new Set(m); n.add(e.tag); return n; }); }
      }
    });
    if (strafPunkte > 0) setPunkte(p => Math.max(0, p - strafPunkte));
    setAufgabeIdx(newIdx);
    // Kanban: Doing leeren → zurück zum Schreibtisch
    setKbDoing(null);
    setSzene("schreibtisch");
    setFeedback(null);
  }

  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2,"0")}`;
  const BG  = "#1a3a5c";
  const LT  = "#f0f4f8";
  const BD  = "#d1dae5";

  // Past transactions to show in Kontoauszug – aus tatsächlichem Verlauf (nicht linear)
  const pastTx = verlauf.map(v => {
    const a = aufgabenListe.find(a => a.id === v.id);
    if (!a) return null;
    if (a.transaktion) return a.transaktion;
    if (a.aktion === "beleg" && a.belegDaten) return { datum: a.belegDaten.datum, text:`${a.belegDaten.typ==="eingangsrechnung"?"Überweisung":"Eingang"} · ${a.ueberweisungsDaten.empfaenger} · ${a.belegDaten.rechnungsnummer}`, betrag: a.belegDaten.typ==="eingangsrechnung" ? -Number(a.ueberweisungsDaten.betrag) : +Number(a.ueberweisungsDaten.betrag) };
    if (a.ueberweisungsDaten) return { datum:"10.01.2026", text:`Überweisung · ${a.ueberweisungsDaten.empfaenger} · ${a.ueberweisungsDaten.verwendung}`, betrag: -Number(a.ueberweisungsDaten.betrag) };
    if (a.dauerauftragsDaten) return { datum:"01.01.2026", text:`Dauerauftrag · ${a.dauerauftragsDaten.empfaenger} · ${a.dauerauftragsDaten.verwendung}`, betrag: -Number(a.dauerauftragsDaten.betrag) };
    return null;
  }).filter(Boolean);

  const inputStyle = { width:"100%", padding:"8px 10px", border:`1px solid ${BD}`, borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff", color:"#0f172a" };

  // Event metadata for desk display
  const eventMeta = {
    buchung:     { icon: <Mail size={18} strokeWidth={1.5}/>,     farbe:"#3b82f6", ort:"Posteingang"  },
    ueberweisung:{ icon: <Receipt size={18} strokeWidth={1.5}/>,  farbe:"#f59e0b", ort:"Überweisung"  },
    dauerauftrag:{ icon: <Calendar size={18} strokeWidth={1.5}/>, farbe:"#10b981", ort:"Dauerauftrag" },
    beleg:       { icon: <FileText size={18} strokeWidth={1.5}/>, farbe:"#e8600a", ort:"Beleg"        },
    theorie:     { icon: <BookOpen size={18} strokeWidth={1.5}/>, farbe:"#a855f7", ort:"Lernkarte"    },
  };
  const meta = eventMeta[aufgabe?.aktion] || eventMeta.buchung;

  // Shared header (used in both scenes)
  const simFortschritt = aufgabenListe.length > 0 ? Math.round(aufgabeIdx / aufgabenListe.length * 100) : 0;
  const simHeader = (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Briefcase size={16} strokeWidth={1.5} style={{ color:"#e8600a" }}/>
          <span style={{ fontWeight:800, fontSize:14, color:"#f0ece3" }}>{firmaName}</span>
          <span style={{ fontSize:10, color:"rgba(240,236,227,0.35)", padding:"2px 7px", background:"rgba(240,236,227,0.07)", borderRadius:20 }}>Klasse {klasse}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, color:"rgba(240,236,227,0.55)" }}>
          <span style={{ display:"flex", alignItems:"center", gap:3, color:"rgba(232,96,10,0.7)", fontWeight:600, fontSize:11 }}>
            <Calendar size={11} strokeWidth={1.5}/>Tag {spielTag}
          </span>
          {modus === "stunde" ? (() => {
            const restSek = Math.max(0, stundenMin * 60 - Math.round(elapsed / 1000));
            const restMin = Math.floor(restSek / 60);
            const restS   = restSek % 60;
            const warn    = restSek < 300; // letzte 5 Min
            return (
              <span style={{ display:"flex", alignItems:"center", gap:3, fontWeight:700, color: warn ? "#f87171" : "rgba(240,236,227,0.7)", fontSize:12 }}>
                <Timer size={12} strokeWidth={1.5}/>
                {restMin}:{String(restS).padStart(2,"0")} verbleibend
              </span>
            );
          })() : (
            <span style={{ display:"flex", alignItems:"center", gap:3 }}><Timer size={12} strokeWidth={1.5}/>{fmtTime(Math.round(elapsed/1000))}</span>
          )}
          <span style={{ color:"#e8600a", fontWeight:700 }}>{punkte}/{maxPunkte} P</span>
        </div>
      </div>
      {/* Fortschrittsbalken */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ flex:1, height:8, background:"rgba(240,236,227,0.08)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${simFortschritt}%`, background:"linear-gradient(90deg,#e8600a,#f07320)", borderRadius:4, transition:"width 0.5s" }}/>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.5)", flexShrink:0, minWidth:52, textAlign:"right" }}>
          {aufgabeIdx + 1}/{aufgabenListe.length}
        </span>
      </div>
    </div>
  );

  // ── Tutorial (Schüler, erstes Mal) ──────────────────────────────────────
  if (tutorialOffen) return (
    <div style={{ maxWidth:520, margin:"0 auto", padding:"20px 16px" }}>
      <div style={{ background:"rgba(28,20,10,0.95)", border:"2px solid rgba(232,96,10,0.4)", borderRadius:16, padding:"24px", color:"#f0ece3" }}>
        <div style={{ fontSize:20, fontWeight:900, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
          <Briefcase size={20} strokeWidth={1.5} style={{ color:"#e8600a" }}/>Willkommen in der Simulation!
        </div>
        <div style={{ fontSize:12, color:"rgba(240,236,227,0.5)", marginBottom:20 }}>So funktioniert dein digitales Büro:</div>

        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
          <div style={{ background:"rgba(232,96,10,0.07)", border:"1px solid rgba(232,96,10,0.2)", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#e8600a", marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
              <Layers size={13} strokeWidth={2}/>Schritt 1 · Aufgaben-Board
            </div>
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.75)", lineHeight:1.6 }}>
              Du siehst ein <strong style={{ color:"#f0ece3" }}>Kanban-Board</strong>. Ziehe eine Aufgabenkarte aus dem Pool in <strong style={{ color:"#e8600a" }}>„In Arbeit"</strong> – das ist deine aktive Aufgabe. Du kannst auch auf <strong style={{ color:"#f0ece3" }}>„▶ Start"</strong> klicken.
            </div>
          </div>

          <div style={{ background:"rgba(74,158,255,0.07)", border:"1px solid rgba(74,158,255,0.2)", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#4a9eff", marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
              <Laptop size={13} strokeWidth={2}/>Schritt 2 · Schreibtisch-Icons
            </div>
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.75)", lineHeight:1.6, marginBottom:8 }}>
              Ein <strong style={{ color:"#e8600a" }}>oranges Punkt-Indikator</strong> zeigt, welches Icon eine neue Aufgabe enthält. Klicke darauf!
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {[
                [<AtSign size={13} strokeWidth={1.5}/>, "E-Mail", "#e8600a", "Buchungsaufträge vom Chef"],
                [<Laptop size={13} strokeWidth={1.5}/>, "Online Banking", "#4a9eff", "Überweisungen durchführen"],
                [<Mail size={13} strokeWidth={1.5}/>, "Briefkasten", "#a855f7", "Belege & Eingangspost"],
                [<Calendar size={13} strokeWidth={1.5}/>, "Kalender", "#10b981", "Fälligkeiten im Blick"],
              ].map(([icon, label, color, desc], i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:7, padding:"6px 8px", background:`rgba(${color==="#e8600a"?"232,96,10":color==="#4a9eff"?"74,158,255":color==="#a855f7"?"168,85,247":"16,185,129"},0.08)`, borderRadius:7 }}>
                  <span style={{ color, flexShrink:0, marginTop:2 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color }}>{label}</div>
                    <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#4ade80", marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
              <Trophy size={13} strokeWidth={2}/>Schritt 3 · Aufgabe lösen
            </div>
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.75)", lineHeight:1.6 }}>
              Klicke auf <strong style={{ color:"#f0ece3" }}>„Öffnen →"</strong> an deiner aktiven Aufgabe. Beantworte die Frage und klicke <strong style={{ color:"#4ade80" }}>„Überprüfen"</strong>. Nach jeder Aufgabe siehst du sofort, ob du richtig lagst.
            </div>
          </div>
        </div>

        <button
          onClick={() => { try { localStorage.setItem("bw_sim_tutorial_seen","1"); } catch {} setTutorialOffen(false); }}
          style={{ width:"100%", padding:"14px", background:"#e8600a", color:"#fff", border:"none", borderRadius:12, fontWeight:800, fontSize:15, cursor:"pointer" }}>
          Verstanden – Simulation starten! →
        </button>
      </div>
    </div>
  );

  // ── Schreibtisch (Desk) Scene – Game Interface ────────────────────────────
  if (szene === "schreibtisch" || !aufgabe) {
    const aktiveDesk = DESK_MAP[aufgabe?.aktion] || "email";
    const deskItems = [
      { id:"pc",       icon:<Laptop size={26} strokeWidth={1.2}/>,      label:"Online Banking", color:"#4a9eff", rgb:"74,158,255"  },
      { id:"email",    icon:<AtSign size={26} strokeWidth={1.2}/>,      label:"E-Mail",         color:"#e8600a", rgb:"232,96,10"   },
      { id:"post",     icon:<Mail size={26} strokeWidth={1.2}/>,        label:"Briefkasten",    color:"#a855f7", rgb:"168,85,247"  },
      { id:"kalender", icon:<Calendar size={26} strokeWidth={1.2}/>,    label:"Kalender",       color:"#10b981", rgb:"16,185,129"  },
    ];
    if (klasse === "9")  deskItems.push({ id:"boerse", icon:<TrendingUp size={26} strokeWidth={1.2}/>, label:"Börse",  color:"#f59e0b", rgb:"245,158,11" });
    if (klasse === "10") deskItems.push({ id:"klr",    icon:<BarChart2 size={26} strokeWidth={1.2}/>,  label:"KLR",    color:"#8b5cf6", rgb:"139,92,246" });
    return (
      <div style={{ maxWidth:540, margin:"0 auto", padding:"12px 14px" }}>
        {simHeader}

        {/* ── Büro-Dashboard ── */}
        <div style={{ background:"#0e0a04", borderRadius:16, overflow:"hidden", border:"1px solid rgba(240,236,227,0.07)", marginBottom:12 }}>

          {/* Top-Bar */}
          <div style={{ background:"rgba(240,236,227,0.03)", padding:"7px 14px", borderBottom:"1px solid rgba(240,236,227,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 4px #4ade80" }}/>
              <span style={{ fontSize:10.5, color:"rgba(240,236,227,0.45)", fontWeight:700, letterSpacing:".05em" }}>BÜRO · {firmaName.toUpperCase()}</span>
            </div>
            <span style={{ fontSize:10, color:"rgba(240,236,227,0.25)" }}>Mo, 13. Jan 2026</span>
          </div>

          {/* 2×2 Grid (Kl.7/8) bzw. 2×2+1 Grid (Kl.9) */}
          <div style={{ padding:"16px", display:"grid", gridTemplateColumns: (klasse === "9" || klasse === "10") ? "repeat(3,1fr)" : "1fr 1fr", gap:10 }}>
            {deskItems.map(item => {
              const isActive = item.id === aktiveDesk;
              return (
                <div key={item.id} style={{ position:"relative" }}>
                  {/* Push-Notification-Dot */}
                  {isActive && !zeitAbgelaufen && (
                    <div style={{ position:"absolute", top:-5, right:-5, width:14, height:14, background:"#e8600a", borderRadius:"50%", boxShadow:"0 0 8px rgba(232,96,10,0.9)", zIndex:2, pointerEvents:"none" }}/>
                  )}
                  <button
                    onClick={() => {
                      if (item.id === "pc") { setDeskPopup(null); setSzene("vorfall"); }
                      else { setDeskPopup(item.id); }
                    }}
                    style={{ width:"100%", minHeight:100, background:`rgba(${item.rgb},0.07)`, border:`1.5px solid rgba(${item.rgb},${isActive ? "0.45" : "0.14"})`, borderRadius:12, padding:"18px 10px 14px", cursor:"pointer", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"border-color 0.15s" }}>
                    <div style={{ color: isActive ? item.color : `rgba(${item.rgb},0.45)` }}>{item.icon}</div>
                    <span style={{ fontSize:10, color: isActive ? item.color : "rgba(240,236,227,0.35)", fontWeight: isActive ? 800 : 500, letterSpacing:".06em", textTransform:"uppercase" }}>{item.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Kanban-Board mit Drag-and-Drop ── */}
        {!deskPopup && !zeitAbgelaufen && (() => {
          const KB_RGB  = { email:"232,96,10", post:"168,85,247", pc:"74,158,255", kalender:"16,185,129", boerse:"245,158,11", klr:"139,92,246" };
          const KB_AREA = { email:"E-Mail", post:"Briefkasten", pc:"Banking", kalender:"Kalender", boerse:"Börse", klr:"KLR" };

          const doneIds     = new Set(verlauf.map(v => v.id));
          const backlogSet  = new Set(kbBacklog);
          const poolItems   = aufgabenListe.filter(a => !backlogSet.has(a.id) && a.id !== kbDoing && !doneIds.has(a.id));
          const backlogAufg = kbBacklog.map(id => aufgabenListe.find(a => a.id === id)).filter(Boolean);
          const doingAufg   = kbDoing ? aufgabenListe.find(a => a.id === kbDoing) : null;
          const doneAufg    = verlauf.map(v => aufgabenListe.find(a => a.id === v.id)).filter(Boolean).reverse();

          const moveToBacklog    = (id) => { if (!backlogSet.has(id) && id !== kbDoing && !doneIds.has(id)) setKbBacklog(b => [...b, id]); };
          const moveToDoing      = (id, fromBL) => { if (!kbDoing) { if (fromBL) setKbBacklog(b => b.filter(x => x !== id)); setKbDoing(id); } };
          const moveDoingToBL    = () => { if (kbDoing) { setKbBacklog(b => [kbDoing, ...b]); setKbDoing(null); if (szene==="vorfall") setSzene("schreibtisch"); } };
          const removeFromBL     = (id) => setKbBacklog(b => b.filter(x => x !== id));

          const onDragStart = (e, id) => { setKbDragId(id); e.dataTransfer.effectAllowed = "move"; };
          const onDragEnd   = () => { setKbDragId(null); setKbDragOver(null); };
          const onDragOver  = (e, zone) => { e.preventDefault(); setKbDragOver(zone); };
          const onDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setKbDragOver(null); };
          const onDrop = (e, zone) => {
            e.preventDefault(); setKbDragOver(null);
            if (!kbDragId) return;
            const fromBL   = backlogSet.has(kbDragId);
            const fromDoing = kbDragId === kbDoing;
            if (zone === "backlog") { if (!fromBL && !fromDoing && !doneIds.has(kbDragId)) moveToBacklog(kbDragId); else if (fromDoing) moveDoingToBL(); }
            else if (zone === "doing") { if ((fromBL || (!fromDoing && !doneIds.has(kbDragId))) && !kbDoing) moveToDoing(kbDragId, fromBL); }
            else if (zone === "pool") { if (fromBL) removeFromBL(kbDragId); }
            setKbDragId(null);
          };

          const CardStyle = (rgb, isActive, isDragging) => ({
            background:`rgba(${rgb},${isActive?0.09:0.04})`,
            border:`1.5px solid rgba(${rgb},${isDragging?0.7:isActive?0.35:0.15})`,
            borderRadius:8, padding:"7px 8px", marginBottom:4,
            cursor:"grab", opacity:isDragging?0.45:1, userSelect:"none"
          });

          return (
            <div style={{ background:"rgba(10,7,2,0.98)", border:"1px solid rgba(240,236,227,0.07)", borderRadius:12, overflow:"hidden", marginBottom:12 }}>

              {/* Header */}
              <div style={{ padding:"7px 14px", borderBottom:"1px solid rgba(240,236,227,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <Layers size={13} color="#e8600a" strokeWidth={2}/>
                  <span style={{ fontSize:10.5, fontWeight:800, color:"rgba(240,236,227,0.55)", letterSpacing:".06em", textTransform:"uppercase" }}>Aufgaben-Board</span>
                  <span style={{ fontSize:9, color:"rgba(240,236,227,0.18)", fontStyle:"italic" }}>{firmaName}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:8.5, color:"rgba(240,236,227,0.2)" }}>{verlauf.length}/{aufgabenListe.length}</span>
                  <div style={{ width:40, height:3, borderRadius:2, background:"rgba(240,236,227,0.07)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${aufgabenListe.length?verlauf.length/aufgabenListe.length*100:0}%`, background:"#4ade80", borderRadius:2, transition:"width 0.4s" }}/>
                  </div>
                </div>
              </div>

              {/* Verfügbare Aufgaben (Pool) – horizontaler Feed */}
              {poolItems.length > 0 && (
                <div style={{ padding:"8px 12px 4px", borderBottom:"1px solid rgba(240,236,227,0.05)" }}
                  onDragOver={e => onDragOver(e, "pool")} onDragLeave={onDragLeave} onDrop={e => onDrop(e, "pool")}>
                  <div style={{ fontSize:8.5, fontWeight:800, color:"rgba(240,236,227,0.22)", letterSpacing:".07em", textTransform:"uppercase", marginBottom:7, display:"flex", alignItems:"center", gap:5 }}>
                    Verfügbare Aufgaben
                    <span style={{ background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.28)", fontSize:8, padding:"1px 5px", borderRadius:20, fontWeight:700 }}>{poolItems.length}</span>
                    <span style={{ fontSize:7.5, color:"rgba(240,236,227,0.15)", fontStyle:"italic", fontWeight:400 }}>· in Backlog oder In Arbeit ziehen</span>
                  </div>
                  <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:9 }}>
                    {poolItems.map(a => {
                      const desk = DESK_MAP[a.aktion] || "email";
                      const rgb  = KB_RGB[desk] || "232,96,10";
                      const area = KB_AREA[desk] || "Aufgabe";
                      return (
                        <div key={a.id} draggable="true"
                          onDragStart={e => onDragStart(e, a.id)} onDragEnd={onDragEnd}
                          style={{ flexShrink:0, width:136, background:`rgba(${rgb},0.06)`, border:`1.5px solid rgba(${rgb},${kbDragId===a.id?0.65:0.15})`, borderRadius:10, padding:"8px 9px", cursor:"grab", opacity:kbDragId===a.id?0.45:1 }}>
                          <div style={{ fontSize:9.5, fontWeight:700, color:"rgba(240,236,227,0.72)", lineHeight:1.35, marginBottom:5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{a.titel}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:6 }}>
                            <span style={{ fontSize:7.5, fontWeight:700, color:`rgba(${rgb},0.85)`, background:`rgba(${rgb},0.1)`, padding:"1px 5px", borderRadius:20 }}>{area}</span>
                            <span style={{ fontSize:7.5, color:"rgba(240,236,227,0.22)" }}>{a.punkte}P</span>
                          </div>
                          <div style={{ display:"flex", gap:4 }}>
                            <button onClick={() => moveToBacklog(a.id)}
                              style={{ flex:1, padding:"4px 0", background:"rgba(240,236,227,0.07)", color:"rgba(240,236,227,0.5)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:5, fontSize:8, fontWeight:600, cursor:"pointer" }}>Backlog</button>
                            {!kbDoing && (
                              <button onClick={() => moveToDoing(a.id, false)}
                                style={{ flex:1, padding:"4px 0", background:"rgba(232,96,10,0.15)", color:"#e8600a", border:"1px solid rgba(232,96,10,0.28)", borderRadius:5, fontSize:8, fontWeight:800, cursor:"pointer" }}>▶ Start</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3 Kanban-Spalten */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr", padding:"8px 10px", gap:8 }}>

                {/* BACKLOG */}
                <div onDragOver={e => onDragOver(e, "backlog")} onDragLeave={onDragLeave} onDrop={e => onDrop(e, "backlog")}
                  style={{ minHeight:90, borderRadius:8, padding:"6px 7px", background:kbDragOver==="backlog"?"rgba(240,236,227,0.05)":"rgba(240,236,227,0.02)", border:`1.5px dashed rgba(240,236,227,${kbDragOver==="backlog"?0.22:0.07})`, transition:"all 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:7 }}>
                    <div style={{ width:6, height:6, borderRadius:1.5, background:"rgba(240,236,227,0.28)" }}/>
                    <span style={{ fontSize:8.5, fontWeight:800, color:"rgba(240,236,227,0.32)", letterSpacing:".07em", textTransform:"uppercase" }}>Backlog</span>
                    {backlogAufg.length > 0 && <span style={{ marginLeft:"auto", fontSize:7.5, background:"rgba(240,236,227,0.07)", color:"rgba(240,236,227,0.3)", padding:"1px 5px", borderRadius:20, fontWeight:700 }}>{backlogAufg.length}</span>}
                  </div>
                  {backlogAufg.length === 0
                    ? <div style={{ fontSize:8, color:"rgba(240,236,227,0.14)", textAlign:"center", padding:"12px 4px", lineHeight:1.5 }}>Aufgaben<br/>hierher ziehen</div>
                    : backlogAufg.map(a => {
                        const desk = DESK_MAP[a.aktion] || "email";
                        const rgb  = KB_RGB[desk] || "232,96,10";
                        const area = KB_AREA[desk] || "Aufgabe";
                        return (
                          <div key={a.id} draggable="true"
                            onDragStart={e => onDragStart(e, a.id)} onDragEnd={onDragEnd}
                            style={CardStyle(rgb, false, kbDragId===a.id)}>
                            <div style={{ fontSize:9, fontWeight:600, color:"rgba(240,236,227,0.68)", lineHeight:1.3, marginBottom:4, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{a.titel}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                              <span style={{ fontSize:7, fontWeight:700, color:`rgba(${rgb},0.75)`, background:`rgba(${rgb},0.1)`, padding:"1px 4px", borderRadius:20 }}>{area}</span>
                              {!kbDoing && (
                                <button onClick={() => moveToDoing(a.id, true)}
                                  style={{ marginLeft:"auto", padding:"2px 6px", background:"rgba(232,96,10,0.15)", color:"#e8600a", border:"1px solid rgba(232,96,10,0.25)", borderRadius:4, fontSize:7.5, fontWeight:800, cursor:"pointer" }}>▶</button>
                              )}
                              <button onClick={() => removeFromBL(a.id)}
                                style={{ padding:"1px 4px", background:"none", color:"rgba(240,236,227,0.22)", border:"none", fontSize:12, lineHeight:1, cursor:"pointer" }}>×</button>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>

                {/* IN ARBEIT */}
                <div onDragOver={e => onDragOver(e, "doing")} onDragLeave={onDragLeave} onDrop={e => onDrop(e, "doing")}
                  style={{ minHeight:90, borderRadius:8, padding:"6px 7px", background:kbDragOver==="doing"?"rgba(232,96,10,0.09)":"rgba(232,96,10,0.04)", border:`1.5px ${doingAufg?"solid":"dashed"} rgba(232,96,10,${kbDragOver==="doing"?0.55:doingAufg?0.32:0.12})`, transition:"all 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:7 }}>
                    <div style={{ width:6, height:6, borderRadius:1.5, background:"#e8600a", boxShadow:doingAufg?"0 0 5px rgba(232,96,10,0.6)":"none" }}/>
                    <span style={{ fontSize:8.5, fontWeight:800, color:"rgba(232,96,10,0.8)", letterSpacing:".07em", textTransform:"uppercase" }}>In Arbeit</span>
                    <span style={{ fontSize:7, color:"rgba(232,96,10,0.35)", fontStyle:"italic" }}>WIP 1</span>
                  </div>
                  {!doingAufg
                    ? <div style={{ fontSize:8, color:"rgba(232,96,10,0.28)", textAlign:"center", padding:"12px 4px", lineHeight:1.5 }}>Aufgabe<br/>hierher ziehen</div>
                    : (() => {
                        const desk = DESK_MAP[doingAufg.aktion] || "email";
                        const rgb  = KB_RGB[desk] || "232,96,10";
                        const area = KB_AREA[desk] || "Aufgabe";
                        return (
                          <div draggable="true"
                            onDragStart={e => onDragStart(e, doingAufg.id)} onDragEnd={onDragEnd}
                            style={{ background:"rgba(232,96,10,0.09)", border:"1.5px solid rgba(232,96,10,0.32)", borderRadius:8, padding:"8px 9px", cursor:"grab", opacity:kbDragId===doingAufg.id?0.45:1 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#f0ece3", lineHeight:1.35, marginBottom:5 }}>{doingAufg.titel}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:7 }}>
                              <span style={{ fontSize:7.5, fontWeight:700, color:`rgba(${rgb},0.9)`, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.22)`, padding:"1px 5px", borderRadius:20 }}>{area}</span>
                              <span style={{ fontSize:7.5, color:"rgba(240,236,227,0.28)" }}>{doingAufg.punkte}P</span>
                            </div>
                            <div style={{ display:"flex", gap:5 }}>
                              <button onClick={() => { setDeskPopup(null); setSzene("vorfall"); }}
                                style={{ flex:1, padding:"7px", background:"#e8600a", color:"#fff", border:"none", borderRadius:7, fontWeight:800, fontSize:11, cursor:"pointer" }}>
                                Öffnen →
                              </button>
                              <button onClick={moveDoingToBL}
                                style={{ padding:"7px 8px", background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.4)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:7, fontSize:10, cursor:"pointer" }} title="Zurück in Backlog (Pause)">⏸</button>
                            </div>
                          </div>
                        );
                      })()
                  }
                </div>

                {/* ERLEDIGT */}
                <div style={{ minHeight:90, borderRadius:8, padding:"6px 7px", background:"rgba(74,222,128,0.02)", border:"1.5px dashed rgba(74,222,128,0.08)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:7 }}>
                    <div style={{ width:6, height:6, borderRadius:1.5, background:"rgba(74,222,128,0.45)" }}/>
                    <span style={{ fontSize:8.5, fontWeight:800, color:"rgba(74,222,128,0.42)", letterSpacing:".07em", textTransform:"uppercase" }}>Erledigt</span>
                    {doneAufg.length > 0 && <span style={{ marginLeft:"auto", fontSize:7.5, background:"rgba(74,222,128,0.07)", color:"rgba(74,222,128,0.4)", padding:"1px 5px", borderRadius:20, fontWeight:700 }}>{doneAufg.length}</span>}
                  </div>
                  {doneAufg.length === 0
                    ? <div style={{ fontSize:8, color:"rgba(74,222,128,0.2)", textAlign:"center", padding:"12px 4px", lineHeight:1.5 }}>Noch nichts<br/>erledigt</div>
                    : doneAufg.slice(0,5).map(a => {
                        const vEntry = verlauf.find(v => v.id === a.id);
                        const ok = vEntry?.korrekt;
                        return (
                          <div key={a.id} style={{ background:ok?"rgba(74,222,128,0.05)":"rgba(248,113,113,0.04)", border:`1px solid ${ok?"rgba(74,222,128,0.15)":"rgba(248,113,113,0.12)"}`, borderRadius:7, padding:"5px 7px", marginBottom:4 }}>
                            <div style={{ fontSize:8.5, fontWeight:500, color:ok?"rgba(74,222,128,0.65)":"rgba(248,113,113,0.55)", lineHeight:1.3, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                              {ok ? "✓ " : "✗ "}{a.titel}
                            </div>
                          </div>
                        );
                      })
                  }
                  {doneAufg.length > 5 && <div style={{ fontSize:7.5, color:"rgba(74,222,128,0.28)", textAlign:"center", paddingTop:2 }}>+{doneAufg.length-5} weitere</div>}
                </div>

              </div>
            </div>
          );
        })()}

        {/* ── Zeit-abgelaufen Overlay ── */}
        {zeitAbgelaufen && (
          <div style={{ background:"rgba(248,113,113,0.08)", border:"1.5px solid rgba(248,113,113,0.35)", borderRadius:12, padding:"18px 16px", marginBottom:12, textAlign:"center" }}>
            <div style={{ fontSize:26, marginBottom:4 }}>⏰</div>
            <div style={{ fontWeight:800, fontSize:14, color:"#f87171", marginBottom:5 }}>Zeit abgelaufen!</div>
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.5)", marginBottom:14, lineHeight:1.5 }}>Der Vorfall wurde nicht rechtzeitig bearbeitet.<br/>−1 Punkt wurde abgezogen.</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { setZeitAbgelaufen(false); weiter(); }}
                style={{ flex:1, padding:"10px", background:"rgba(248,113,113,0.15)", color:"#f87171", border:"1px solid rgba(248,113,113,0.3)", borderRadius:9, fontWeight:700, fontSize:12, cursor:"pointer" }}>
                Nächste Aufgabe →
              </button>
              <button onClick={() => { setZeitAbgelaufen(false); setSzene("vorfall"); }}
                style={{ flex:1, padding:"10px", background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.55)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:9, fontWeight:700, fontSize:12, cursor:"pointer" }}>
                Trotzdem versuchen
              </button>
            </div>
          </div>
        )}

        {/* ── Kalender-Popup – rundenbasierter Spieltag ── */}
        {deskPopup === "kalender" && (() => {
          const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
          const SIMULATIONSJAHR = 2026;
          const SIMULATIONSMONAT = 0; // Januar
          const daysInMonth = 31;
          const startOffset = (new Date(SIMULATIONSJAHR, SIMULATIONSMONAT, 1).getDay() + 6) % 7; // Mo=0
          // Bayern-Feiertage Januar 2026
          const FEIERTAGE = { 1: "Neujahr", 6: "Hl. 3 Könige" };
          const istFeiertag = (day) => !!FEIERTAGE[day];
          const istWochenende = (day) => ((startOffset + day - 1) % 7) >= 5;
          const istFreierTag = (day) => istWochenende(day) || istFeiertag(day);
          const entryMap = Object.fromEntries((klasse === "10" ? KALENDER10_EINTRAEGE : klasse === "9" ? KALENDER9_EINTRAEGE : klasse === "8" ? KALENDER8_EINTRAEGE : KALENDER_EINTRAEGE).map(e => [e.tag, e]));

          const getStatus = (entry) => {
            if (!entry) return null;
            if (entry.typ !== "task") return "info";
            const done = verlauf.some(v => v.aktion === entry.aufgabeAktion && v.korrekt);
            if (done) return "done";
            if (entry.tag < spielTag) return mahnungen.has(entry.tag) ? "overdue" : "verpasst";
            if (entry.tag === spielTag) return "heute";
            return "pending";
          };
          const statusColor = { pending:"rgba(240,236,227,0.45)", heute:"#e8600a", done:"#4ade80", verpasst:"#f87171", overdue:"#f87171", info:"rgba(96,165,250,0.7)" };
          const selEntry = kalSelTag ? entryMap[kalSelTag] : null;

          return (
            <div style={{ background:"rgba(12,9,4,0.99)", border:"1.5px solid rgba(16,185,129,0.3)", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
              {/* Titelleiste */}
              <div style={{ background:"#0f3460", padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:20, height:20, background:"#0078d4", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Calendar size={11} color="#fff" strokeWidth={2.5}/>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>Kalender</span>
                  <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.4)" }}>— {firmaName}</span>
                </div>
                <button onClick={() => { setDeskPopup(null); setKalSelTag(null); }} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
              </div>

              {/* Spieltag-Banner */}
              <div style={{ padding:"7px 14px", background:"rgba(232,96,10,0.12)", borderBottom:"1px solid rgba(232,96,10,0.2)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#e8600a" }}>
                  📅 Spieltag {spielTag}. {MONATE[SIMULATIONSMONAT]} {SIMULATIONSJAHR}
                </span>
                <div style={{ display:"flex", gap:8, fontSize:9, color:"rgba(240,236,227,0.4)" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"#e8600a", borderRadius:2, display:"inline-block" }}/> heute</span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"rgba(240,236,227,0.3)", borderRadius:2, display:"inline-block" }}/> geplant</span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"#4ade80", borderRadius:2, display:"inline-block" }}/> erledigt</span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"#f87171", borderRadius:2, display:"inline-block" }}/> verpasst</span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"rgba(232,96,10,0.25)", borderRadius:2, border:"1px solid rgba(232,96,10,0.3)", display:"inline-block" }}/> WE/Feiertag</span>
                </div>
              </div>

              {/* Monat-Header + Wochentage */}
              <div style={{ padding:"8px 14px 4px", fontWeight:800, fontSize:12, color:"#f0ece3" }}>{MONATE[SIMULATIONSMONAT]} {SIMULATIONSJAHR}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, padding:"0 14px", marginBottom:2 }}>
                {["Mo","Di","Mi","Do","Fr","Sa","So"].map((d, di) => (
                  <div key={d} style={{ textAlign:"center", fontSize:8.5, fontWeight:700, color: di >= 5 ? "rgba(232,96,10,0.55)" : "rgba(240,236,227,0.3)", padding:"2px 0" }}>{d}</div>
                ))}
              </div>

              {/* Tage-Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, padding:"0 14px 12px" }}>
                {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`}/>)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const isHeute   = day === spielTag;
                  const entry     = entryMap[day];
                  const status    = getStatus(entry);
                  const isWeekend = istWochenende(day);
                  const isFT      = istFeiertag(day);
                  const isFrei    = istFreierTag(day);
                  const isSelected = kalSelTag === day;
                  const eventColor = status ? statusColor[status] : null;
                  const isClickable = !!entry;
                  const isFuture = day > spielTag;
                  return (
                    <div key={day}
                      title={isFT ? FEIERTAGE[day] : undefined}
                      onClick={() => isClickable && setKalSelTag(kalSelTag === day ? null : day)}
                      style={{ borderRadius:5, padding:"3px 2px 4px", minHeight:44,
                        background: isHeute ? "rgba(232,96,10,0.13)" : isSelected && eventColor ? `${eventColor}22` : isFT ? "rgba(232,96,10,0.14)" : isWeekend ? "rgba(232,96,10,0.06)" : isFuture ? "rgba(240,236,227,0.02)" : "rgba(240,236,227,0.03)",
                        border: isSelected && eventColor ? `1.5px solid ${eventColor}` : isHeute ? "1.5px solid #e8600a" : isFT ? "1px solid rgba(232,96,10,0.35)" : isWeekend ? "1px solid rgba(232,96,10,0.15)" : `1px solid rgba(240,236,227,${isFuture ? "0.04" : "0.07"})`,
                        opacity: isFuture && !isFrei ? 0.75 : 1,
                        cursor: isClickable ? "pointer" : "default" }}>
                      <div style={{ fontSize:10, fontWeight: isHeute ? 900 : 600, color: isHeute ? "#e8600a" : isFT ? "rgba(232,96,10,0.85)" : isWeekend ? "rgba(232,96,10,0.55)" : isFuture ? "rgba(240,236,227,0.35)" : "rgba(240,236,227,0.65)", textAlign:"right", paddingRight:3, marginBottom:1 }}>{day}</div>
                      {isFT && (
                        <div style={{ fontSize:6, color:"rgba(232,96,10,0.75)", padding:"0 2px", lineHeight:1.2, textAlign:"center", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", fontWeight:700 }}>{FEIERTAGE[day]}</div>
                      )}
                      {entry && eventColor && (
                        <div style={{ width:"100%", height:3, borderRadius:2, background: eventColor, opacity: status === "info" ? 0.6 : 0.9, marginBottom:2 }}/>
                      )}
                      {entry && (
                        <div style={{ fontSize:7, color: eventColor || "rgba(240,236,227,0.4)", padding:"0 2px", lineHeight:1.25, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", fontWeight: status === "heute" ? 700 : 500 }}>
                          {entry.text.split(" ").slice(0,3).join(" ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ereignis-Detail */}
              {selEntry && (() => {
                const status = getStatus(selEntry);
                const col = statusColor[status] || "rgba(240,236,227,0.45)";
                const verpasst = (status === "verpasst" || status === "overdue");
                const isInfo = status === "info";
                const isTask = !isInfo;
                return (
                  <div style={{ margin:"0 14px 14px", background:`${col}10`, border:`1px solid ${col}33`, borderRadius:9, padding:"10px 12px" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom: isTask ? 8 : 0 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:col, flexShrink:0, marginTop:3 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11.5, fontWeight:700, color:"#f0ece3", marginBottom:2 }}>{selEntry.text}</div>
                        <div style={{ fontSize:10, color:col, fontWeight:600 }}>
                          {isInfo      && `ℹ️ Termin · ${selEntry.tag}. Januar 2026`}
                          {status === "heute"   && `⚡ Fällig heute (Spieltag ${spielTag}) – jetzt erledigen!`}
                          {status === "pending" && `📋 Geplant für Spieltag ${selEntry.tag}. Jan`}
                          {status === "done"    && "✓ Erledigt"}
                          {verpasst            && `⚠ Verpasst (Spieltag ${selEntry.tag}) – −1 Punkt wurde abgezogen`}
                        </div>
                      </div>
                    </div>
                    {isTask && (status === "heute" || status === "pending") && !verlauf.some(v => v.aktion === selEntry.aufgabeAktion && v.korrekt) && (
                      <button onClick={() => {
                        const matchId = aufgabenListe.find(a =>
                          a.aktion === selEntry.aufgabeAktion && !doneIds.has(a.id) && a.id !== kbDoing
                        )?.id;
                        if (!matchId) return;
                        if (!kbDoing) {
                          setKbBacklog(b => b.filter(x => x !== matchId));
                          setKbDoing(matchId);
                        }
                        setKalSelTag(null); setDeskPopup(null); setSzene("vorfall");
                      }}
                        style={{ width:"100%", padding:"8px", background:status==="heute"?"#e8600a":col, color:"#fff", border:"none", borderRadius:7, fontWeight:800, fontSize:12, cursor:"pointer", marginTop:4 }}>
                        {status === "heute" ? "Jetzt erledigen →" : "Vorziehen und erledigen →"}
                      </button>
                    )}
                    {status === "done" && (
                      <div style={{ fontSize:10.5, color:"rgba(74,222,128,0.7)", marginTop:4 }}>Aufgabe korrekt abgeschlossen.</div>
                    )}
                    {verpasst && (
                      <div style={{ fontSize:10.5, color:"rgba(248,113,113,0.65)", fontStyle:"italic", marginTop:4 }}>Strafpunkt wurde beim Übergang zum nächsten Spieltag automatisch abgezogen.</div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ── Börsen-Cockpit (Kl. 9 LB4) ── */}
        {deskPopup === "boerse" && klasse === "9" && (() => {
          const kursIdx  = Math.min(spielTag, 30) - 1;
          const vorIdx   = Math.max(0, kursIdx - 1);
          const depotPos = [
            { aktie: BOERSEN_AKTIEN.find(a => a.id === "BSOL"), stk:100, einstand:4850.00 },
            { aktie: BOERSEN_AKTIEN.find(a => a.id === "SUDB"), stk:50,  einstand:2600.00 },
          ];
          const kapital = 3284.50;
          const fmt = (n, d=2) => n.toLocaleString("de-DE", { minimumFractionDigits:d, maximumFractionDigits:d });
          const depotwert    = depotPos.reduce((s,p) => s + p.aktie.kurse[kursIdx] * p.stk, 0);
          const einstandGes  = depotPos.reduce((s,p) => s + p.einstand, 0);
          const perf         = depotwert - einstandGes;
          const perfPct      = einstandGes > 0 ? (perf / einstandGes * 100) : 0;
          const aktuellesEvt = [...BOERSEN_EREIGNISSE].reverse().find(e => e.tag <= spielTag);
          return (
            <div style={{ background:"rgba(12,9,4,0.99)", border:"1.5px solid rgba(245,158,11,0.3)", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
              {/* Titelleiste */}
              <div style={{ background:"#0d1117", padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:20, height:20, background:"#f59e0b", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <TrendingUp size={11} color="#fff" strokeWidth={2.5}/>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>BörsenWerk</span>
                  <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.4)" }}>— Kl. 9 · LB4 Kapitalanlage</span>
                </div>
                <button onClick={() => setDeskPopup(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
              </div>
              {/* Spieltag-Banner */}
              <div style={{ padding:"5px 14px", background:"rgba(245,158,11,0.08)", borderBottom:"1px solid rgba(245,158,11,0.15)", fontSize:10, color:"rgba(245,158,11,0.75)", fontWeight:700 }}>
                📅 Spieltag {spielTag}. Jan 2026 · XETRA-Handelsschluss
              </div>
              {/* Tabs */}
              <div style={{ display:"flex", borderBottom:"1px solid rgba(240,236,227,0.07)" }}>
                {[["depot","Depot"],["markt","Markt"]].map(([id,label]) => (
                  <button key={id} onClick={() => setBoersenTab(id)}
                    style={{ flex:1, padding:"7px", background:"none", border:"none",
                      borderBottom: boersenTab===id ? "2px solid #f59e0b" : "2px solid transparent",
                      color: boersenTab===id ? "#f59e0b" : "rgba(240,236,227,0.4)",
                      fontWeight: boersenTab===id ? 800 : 500, fontSize:11, cursor:"pointer" }}>
                    {label}
                  </button>
                ))}
              </div>

              {boersenTab === "depot" && (
                <div style={{ padding:"12px 14px" }}>
                  {/* Kapital-Header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10, paddingBottom:8, borderBottom:"1px solid rgba(240,236,227,0.06)" }}>
                    <div>
                      <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", fontWeight:700, letterSpacing:".05em" }}>VERFÜGBAR · 2800 BK</div>
                      <div style={{ fontSize:17, fontWeight:900, color:"#f0ece3" }}>{fmt(kapital)} €</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", fontWeight:700, letterSpacing:".05em" }}>DEPOTWERT · 1500 WP</div>
                      <div style={{ fontSize:17, fontWeight:900, color:"#f0ece3" }}>{fmt(depotwert)} €</div>
                    </div>
                  </div>
                  {/* Performance */}
                  <div style={{ background: perf >= 0 ? "rgba(74,222,128,0.07)" : "rgba(248,113,113,0.07)", border:`1px solid ${perf>=0?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"}`, borderRadius:8, padding:"6px 10px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>Buchgewinn/-verlust (nicht realisiert)</span>
                    <span style={{ fontSize:12, fontWeight:800, color: perf>=0?"#4ade80":"#f87171" }}>
                      {perf>=0?"+":""}{fmt(perf)} € ({perf>=0?"+":""}{fmt(perfPct,1)} %)
                    </span>
                  </div>
                  {/* Positionen */}
                  {depotPos.map(pos => {
                    const kurs    = pos.aktie.kurse[kursIdx];
                    const vorKurs = pos.aktie.kurse[vorIdx];
                    const wert    = kurs * pos.stk;
                    const gv      = wert - pos.einstand;
                    const pct     = (kurs - vorKurs) / vorKurs * 100;
                    return (
                      <div key={pos.aktie.id} style={{ padding:"7px 0", borderBottom:"1px solid rgba(240,236,227,0.05)", display:"grid", gridTemplateColumns:"1fr auto auto", gap:6, alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:"#f0ece3" }}>{pos.aktie.name}</div>
                          <div style={{ fontSize:9.5, color:"rgba(240,236,227,0.33)" }}>{pos.stk} Stk. · Einstand {fmt(pos.einstand/pos.stk)} €/Stk.</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#f0ece3" }}>{fmt(kurs)} €</div>
                          <div style={{ fontSize:9.5, fontWeight:600, color: pct>=0?"#4ade80":"#f87171" }}>{pct>=0?"+":""}{fmt(pct,1)} % (Tag)</div>
                        </div>
                        <div style={{ textAlign:"right", minWidth:60 }}>
                          <div style={{ fontSize:11, color:"rgba(240,236,227,0.7)" }}>{fmt(wert)} €</div>
                          <div style={{ fontSize:9.5, color: gv>=0?"#4ade80":"#f87171" }}>{gv>=0?"+":""}{fmt(gv)} €</div>
                        </div>
                      </div>
                    );
                  })}
                  {aktuellesEvt && (
                    <div style={{ marginTop:10, padding:"6px 10px", background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.14)", borderRadius:6, fontSize:9.5, color:"rgba(240,236,227,0.5)", lineHeight:1.5 }}>
                      <span style={{ color:"#f59e0b", fontWeight:700 }}>📰 </span>{aktuellesEvt.text}
                    </div>
                  )}
                  {aktiveDesk === "boerse" && (
                    <button onClick={() => { setDeskPopup(null); setSzene("vorfall"); }}
                      style={{ marginTop:10, width:"100%", padding:"10px", background:"#f59e0b", color:"#0d1117", border:"none", borderRadius:8, fontWeight:800, fontSize:12, cursor:"pointer" }}>
                      Aufgabe bearbeiten →
                    </button>
                  )}
                </div>
              )}

              {boersenTab === "markt" && (
                <div style={{ padding:"12px 14px" }}>
                  <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", fontWeight:700, letterSpacing:".05em", marginBottom:8 }}>XETRA KURSE · SPIELTAG {spielTag}. JAN 2026</div>
                  {BOERSEN_AKTIEN.map(aktie => {
                    const kurs    = aktie.kurse[kursIdx];
                    const vorKurs = aktie.kurse[vorIdx];
                    const pct     = (kurs - vorKurs) / vorKurs * 100;
                    const inDepot = depotPos.some(p => p.aktie.id === aktie.id);
                    return (
                      <div key={aktie.id} style={{ padding:"7px 0", borderBottom:"1px solid rgba(240,236,227,0.05)", display:"grid", gridTemplateColumns:"1fr auto auto", gap:8, alignItems:"center" }}>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                            <span style={{ fontSize:8.5, fontWeight:800, color:"rgba(245,158,11,0.7)", background:"rgba(245,158,11,0.1)", padding:"1px 5px", borderRadius:3 }}>{aktie.kuerzel}</span>
                            {inDepot && <span style={{ fontSize:7.5, color:"#4ade80", background:"rgba(74,222,128,0.1)", padding:"1px 4px", borderRadius:3 }}>Depot</span>}
                          </div>
                          <div style={{ fontSize:10.5, fontWeight:600, color:"#f0ece3" }}>{aktie.name}</div>
                          <div style={{ fontSize:9, color:"rgba(240,236,227,0.3)" }}>{aktie.branche}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:13, fontWeight:800, color:"#f0ece3" }}>{fmt(kurs)} €</div>
                        </div>
                        <div style={{ textAlign:"right", minWidth:52 }}>
                          <div style={{ fontSize:10.5, fontWeight:700, color: pct>=0?"#4ade80":"#f87171", display:"flex", alignItems:"center", justifyContent:"flex-end", gap:2 }}>
                            {pct>=0?<TrendingUp size={10}/>:<TrendingDown size={10}/>}
                            {pct>=0?"+":""}{fmt(pct,1)} %
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Börsenereignisse */}
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", fontWeight:700, letterSpacing:".05em", marginBottom:6 }}>AKTUELLE MELDUNGEN</div>
                    {BOERSEN_EREIGNISSE.filter(e => e.tag <= spielTag).slice(-3).reverse().map((e,i) => (
                      <div key={i} style={{ padding:"5px 8px", background:"rgba(240,236,227,0.03)", border:"1px solid rgba(240,236,227,0.06)", borderRadius:5, marginBottom:3, fontSize:9.5, color:"rgba(240,236,227,0.5)", lineHeight:1.4 }}>
                        <span style={{ color:"rgba(245,158,11,0.55)", fontSize:8.5 }}>Tag {e.tag} · </span>{e.text}
                      </div>
                    ))}
                  </div>
                  {/* Magisches Dreieck */}
                  <div style={{ marginTop:8, padding:"7px 10px", background:"rgba(240,236,227,0.025)", border:"1px solid rgba(240,236,227,0.06)", borderRadius:7 }}>
                    <div style={{ fontSize:8.5, fontWeight:700, color:"rgba(245,158,11,0.65)", marginBottom:3 }}>MAGISCHES DREIECK (Kl. 9 LB4)</div>
                    <div style={{ display:"flex", gap:10, fontSize:9.5, color:"rgba(240,236,227,0.45)" }}>
                      <span>🔒 Sicherheit</span><span>💧 Liquidität</span><span>📈 Rentabilität</span>
                    </div>
                    <div style={{ fontSize:8.5, color:"rgba(240,236,227,0.25)", marginTop:3 }}>Nie alle drei Ziele gleichzeitig optimal erreichbar!</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── KLR-Cockpit (Kl. 10 LB2–4) ── */}
        {deskPopup === "klr" && klasse === "10" && (() => {
          const fmt = (n, d=2) => n.toLocaleString("de-DE", { minimumFractionDigits:d, maximumFractionDigits:d });
          const KLR_TABS = [["bab","BAB"],["dbr","DBR"],["kz","Kennzahlen"]];
          // BAB-Daten VitaSport GmbH GJ 2025
          const babKosten = [
            { art:"Miete",              gesamt:48000, mat:8000, fert:24000, verw:8000, vtr:8000 },
            { art:"Abschreibungen",     gesamt:18000, mat:3000, fert: 9000, verw:3000, vtr:3000 },
            { art:"Büromaterial",       gesamt: 6000, mat: 600, fert: 2400, verw:1800, vtr:1200 },
            { art:"Versicherungen",     gesamt: 7200, mat:1200, fert: 3600, verw:1200, vtr:1200 },
            { art:"Löhne (indirekt)",   gesamt:36000, mat:3200, fert:57000, verw:10800, vtr:7600 },
          ];
          // Fixierte Summen aus dem Lehrkontext (konsistent mit k10_4 + k10_5)
          const babGK = { mat:16000, fert:96000, verw:24800, vtr:21000 };
          const babEK = { mek:85000, fek:240000 };
          const mgkz  = (babGK.mat / babEK.mek * 100).toFixed(2);  // 18,82% – gerundet aus Lehrkontext
          const fgkz  = (babGK.fert / babEK.fek * 100).toFixed(2); // 40,00%
          // DBR-Daten
          const dbrProdukte = [
            { name:"PulseRun Laufband",       nvp:890, vk:580, stk:680, fixAnteil:186000 },
            { name:"MaxForce 300 Kraftstation", nvp:1200, vk:850, stk:420, fixAnteil:null },
          ];
          // Kennzahlen-Daten
          const kz = { ek:180000, lfv:50000, av:184000, gewinn:27000, fo:42000, bk:28000, kfv:56000 };
          // Welcher Kennzahl-/BAB-Wert wird gerade abgefragt? → maskieren
          const klrMaskedId = (aktiveDesk === "klr") ? aufgabe?.id : null;
          return (
            <div style={{ background:"rgba(12,9,4,0.99)", border:`1.5px solid rgba(139,92,246,${aktiveDesk==="klr"?"0.4":"0.15"})`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
              {/* Titelleiste */}
              <div style={{ background:"linear-gradient(90deg,#2d1b69,#1e1256)", padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:20, height:20, background:"#8b5cf6", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <BarChart2 size={11} color="#fff" strokeWidth={2.5}/>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>KLR-Cockpit</span>
                  <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.4)" }}>— {firmaName} · GJ 2025</span>
                </div>
                <button onClick={() => setDeskPopup(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
              </div>
              {/* Tab-Leiste */}
              <div style={{ display:"flex", borderBottom:"1px solid rgba(139,92,246,0.18)", background:"rgba(139,92,246,0.05)" }}>
                {KLR_TABS.map(([id,label]) => (
                  <button key={id} onClick={() => setKlrTab(id)} style={{ flex:1, background:"none", border:"none",
                    borderBottom: klrTab===id ? "2px solid #8b5cf6" : "2px solid transparent",
                    color: klrTab===id ? "#8b5cf6" : "rgba(240,236,227,0.4)",
                    fontWeight: klrTab===id ? 800 : 500, fontSize:11, cursor:"pointer", padding:"8px 4px", letterSpacing:".04em" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ padding:"14px 12px" }}>
                {/* ── BAB ── */}
                {klrTab === "bab" && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.35)", letterSpacing:".06em", marginBottom:8 }}>BETRIEBSABRECHNUNGSBOGEN · GJ 2025</div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
                        <thead>
                          <tr style={{ borderBottom:"1px solid rgba(139,92,246,0.2)" }}>
                            {["Kostenart","Gesamt","Material","Fertigung","Verwaltung","Vertrieb"].map(h => (
                              <th key={h} style={{ padding:"3px 6px", textAlign: h==="Kostenart"?"left":"right", color:"rgba(240,236,227,0.45)", fontWeight:700, fontSize:9.5 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {babKosten.map((row,i) => (
                            <tr key={i} style={{ borderBottom:"1px solid rgba(240,236,227,0.05)" }}>
                              <td style={{ padding:"3px 6px", color:"rgba(240,236,227,0.7)", fontSize:10 }}>{row.art}</td>
                              {[row.gesamt,row.mat,row.fert,row.verw,row.vtr].map((v,j) => (
                                <td key={j} style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.55)", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>{fmt(v)}</td>
                              ))}
                            </tr>
                          ))}
                          <tr style={{ borderTop:"1px solid rgba(139,92,246,0.3)" }}>
                            <td style={{ padding:"3px 6px", fontWeight:800, color:"#8b5cf6", fontSize:10 }}>Summe GK</td>
                            {[babGK.mat+babGK.fert+babGK.verw+babGK.vtr, babGK.mat, babGK.fert, babGK.verw, babGK.vtr].map((v,j) => (
                              <td key={j} style={{ padding:"3px 6px", textAlign:"right", fontWeight:800, color:"#8b5cf6", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>{fmt(v)}</td>
                            ))}
                          </tr>
                          <tr>
                            <td style={{ padding:"3px 6px", color:"rgba(240,236,227,0.45)", fontSize:10 }}>Bezugsgröße (EK)</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>—</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.45)", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>MEK {fmt(babEK.mek)}</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.45)", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>FEK {fmt(babEK.fek)}</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>HK</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>SK</td>
                          </tr>
                          <tr style={{ borderTop:"1px solid rgba(139,92,246,0.15)" }}>
                            <td style={{ padding:"3px 6px", fontWeight:700, color:"#a78bfa", fontSize:10 }}>Zuschlagssatz</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>—</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", fontWeight:700, color:"#a78bfa", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>MGKZ {mgkz} %</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", fontWeight:700, color: klrMaskedId==="k10_4" ? "#e8600a" : "#a78bfa", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>{klrMaskedId==="k10_4" ? "FGKZ ??? %" : `FGKZ ${fgkz} %`}</td>
                            <td colSpan={2} style={{ padding:"3px 6px", textAlign:"center", color:"rgba(240,236,227,0.25)", fontSize:9 }}>→ über HK/SK</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop:10, padding:"8px", background:"rgba(139,92,246,0.07)", borderRadius:6, fontSize:9.5, color:"rgba(240,236,227,0.5)", lineHeight:1.5 }}>
                      <strong style={{ color:"#a78bfa" }}>Einzelkosten:</strong> MEK + FEK werden <em>direkt</em> dem Produkt zugerechnet.<br/>
                      <strong style={{ color:"#a78bfa" }}>Gemeinkosten:</strong> Werden über Zuschlagssätze (MGKZ, FGKZ …) verteilt.
                    </div>
                  </div>
                )}
                {/* ── DBR ── */}
                {klrTab === "dbr" && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.35)", letterSpacing:".06em", marginBottom:8 }}>DECKUNGSBEITRAGSRECHNUNG · GJ 2025</div>
                    {dbrProdukte.map((p,i) => {
                      const db = p.nvp - p.vk;
                      const be = p.fixAnteil ? Math.ceil(p.fixAnteil / db) : null;
                      return (
                        <div key={i} style={{ marginBottom:10, padding:"10px", background:"rgba(139,92,246,0.07)", borderRadius:8, border:"1px solid rgba(139,92,246,0.15)" }}>
                          <div style={{ fontSize:10.5, fontWeight:800, color:"#c4b5fd", marginBottom:6 }}>{p.name}</div>
                          <table style={{ width:"100%", fontSize:10 }}>
                            <tbody>
                              {[
                                ["Nettoverkaufspreis (NVP)",   fmt(p.nvp)+" €", "rgba(240,236,227,0.7)"],
                                ["− Variable Kosten/Stk.",      "−"+fmt(p.vk)+" €",  "rgba(240,236,227,0.5)"],
                                ["= Stückdeckungsbeitrag",      (klrMaskedId==="k10_6"&&i===0) ? "??? €" : fmt(db)+" €",   "#a78bfa"],
                              ].map(([label,val,col],j) => (
                                <tr key={j}>
                                  <td style={{ padding:"1px 0", color:"rgba(240,236,227,0.45)", fontSize:9.5 }}>{label}</td>
                                  <td style={{ padding:"1px 0", textAlign:"right", fontWeight: j===2?800:500, color:col, fontFamily:"'Fira Code',monospace" }}>{val}</td>
                                </tr>
                              ))}
                              {p.fixAnteil && <tr><td colSpan={2}><div style={{ borderTop:"1px dashed rgba(139,92,246,0.2)", margin:"4px 0" }}/></td></tr>}
                              {p.fixAnteil && (
                                <>
                                  <tr><td style={{ color:"rgba(240,236,227,0.45)", fontSize:9.5 }}>Fixkosten gesamt</td><td style={{ textAlign:"right", fontFamily:"'Fira Code',monospace", color:"rgba(240,236,227,0.5)", fontSize:9.5 }}>{fmt(p.fixAnteil)} €</td></tr>
                                  <tr><td style={{ fontWeight:700, color:"#e8600a", fontSize:9.5 }}>Break-even-Menge</td><td style={{ textAlign:"right", fontWeight:800, fontFamily:"'Fira Code',monospace", color:"#e8600a", fontSize:9.5 }}>{(klrMaskedId==="k10_7"&&i===0) ? "???" : be} Stk.</td></tr>
                                </>
                              )}
                            </tbody>
                          </table>
                          <div style={{ marginTop:6, padding:"5px 7px", background:`rgba(139,92,246,${p.stk > (be||0) ? "0.12":"0.05"})`, borderRadius:5, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ fontSize:9.5, color:"rgba(240,236,227,0.45)" }}>Absatzmenge GJ 2025</span>
                            <span style={{ fontFamily:"'Fira Code',monospace", fontWeight:800, color: be&&p.stk>be?"#4ade80":"#facc15", fontSize:10 }}>{fmt(p.stk,0)} Stk. {be ? (p.stk>be?"✓ Gewinn":"⚠ Verlust") : ""}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ padding:"7px 9px", background:"rgba(232,96,10,0.07)", borderRadius:6, border:"1px solid rgba(232,96,10,0.15)", fontSize:9.5, color:"rgba(240,236,227,0.5)" }}>
                      <strong style={{ color:"#e8600a" }}>Zusatzauftrag-Regel:</strong> Annehmen wenn NVP &gt; variable Kosten (pos. DB) + freie Kapazität vorhanden.<br/>
                      <strong style={{ color:"#e8600a" }}>Langfristige Preisuntergrenze:</strong> = Selbstkosten (alle Kosten müssen gedeckt sein).
                    </div>
                  </div>
                )}
                {/* ── Kennzahlen ── */}
                {klrTab === "kz" && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.35)", letterSpacing:".06em", marginBottom:8 }}>AUFBEREITETE BILANZ · 31.12.2025</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                      {[
                        { label:"Eigenkapital (EK)",     value:fmt(kz.ek)+" €",    color:"#a78bfa" },
                        { label:"LFV (LBKV)",            value:fmt(kz.lfv)+" €",   color:"rgba(240,236,227,0.55)" },
                        { label:"Anlagevermögen (AV)",   value:fmt(kz.av)+" €",    color:"rgba(240,236,227,0.55)" },
                        { label:"Gewinn",                value:fmt(kz.gewinn)+" €",color:"#4ade80" },
                        { label:"Forderungen (FO)",      value:fmt(kz.fo)+" €",    color:"rgba(240,236,227,0.55)" },
                        { label:"Bankguthaben (BK)",     value:fmt(kz.bk)+" €",    color:"rgba(240,236,227,0.55)" },
                        { label:"Kurzfr. Verbindl. (KFV)", value:fmt(kz.kfv)+" €", color:"rgba(240,236,227,0.55)" },
                      ].map((item,i) => (
                        <div key={i} style={{ padding:"6px 8px", background:"rgba(139,92,246,0.07)", borderRadius:6, border:"1px solid rgba(139,92,246,0.12)" }}>
                          <div style={{ fontSize:9, color:"rgba(240,236,227,0.4)", marginBottom:2 }}>{item.label}</div>
                          <div style={{ fontFamily:"'Fira Code',monospace", fontWeight:800, color:item.color, fontSize:11 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.35)", letterSpacing:".06em", marginBottom:6 }}>KENNZAHLEN</div>
                    {[
                      { name:"Anlagendeckung II",       formel:"(EK + LFV) ÷ AV × 100",       wert:((kz.ek+kz.lfv)/kz.av*100).toFixed(2)+" %", ziel:"≥ 100 %", ok:true,  maskId:"k10_1" },
                      { name:"EK-Rentabilität",         formel:"Gewinn ÷ EK × 100",             wert:(kz.gewinn/kz.ek*100).toFixed(2)+" %",         ziel:"≥ Marktzins", ok:true,  maskId:"k10_2" },
                      { name:"Einzugsliquidität",       formel:"(FO + BK) ÷ KFV × 100",         wert:((kz.fo+kz.bk)/kz.kfv*100).toFixed(2)+" %",    ziel:"≥ 100 %", ok:true,  maskId:"k10_3" },
                      { name:"Barliquidität",           formel:"BK ÷ KFV × 100",                wert:(kz.bk/kz.kfv*100).toFixed(2)+" %",             ziel:"20–50 %", ok:(kz.bk/kz.kfv*100)>=20, maskId:null },
                    ].map((kzItem,i) => (
                      <div key={i} style={{ marginBottom:7, padding:"8px 10px", background:"rgba(139,92,246,0.06)", borderRadius:7, border:`1px solid rgba(139,92,246,${kzItem.ok?"0.2":"0.1"})` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:"#c4b5fd" }}>{kzItem.name}</span>
                          <span style={{ fontSize:11, fontWeight:800, fontFamily:"'Fira Code',monospace", color: (kzItem.maskId && klrMaskedId===kzItem.maskId) ? "#e8600a" : (kzItem.ok ? "#4ade80" : "#facc15") }}>{(kzItem.maskId && klrMaskedId===kzItem.maskId) ? "???%" : kzItem.wert}</span>
                        </div>
                        <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", display:"flex", justifyContent:"space-between" }}>
                          <span>Formel: {kzItem.formel}</span>
                          <span style={{ color: kzItem.ok ? "rgba(74,222,128,0.6)" : "rgba(250,204,21,0.6)" }}>Ziel: {kzItem.ziel} {kzItem.ok ? "✓" : "⚠"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* ── Aufgaben-Banner ── */}
              {aktiveDesk === "klr" && (
                <div style={{ borderTop:"1px solid rgba(139,92,246,0.2)", padding:"10px 14px", background:"rgba(139,92,246,0.06)" }}>
                  <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.5)", marginBottom:7 }}>
                    <span style={{ color:"#e8600a", fontWeight:700 }}>● Aufgabe läuft:</span> {aufgabe?.titel}
                    <span style={{ marginLeft:8, color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>— Nutze die Cockpit-Daten oben zur Berechnung</span>
                  </div>
                  <button onClick={() => { setDeskPopup(null); setSzene("vorfall"); }}
                    style={{ width:"100%", padding:"10px 14px", background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", color:"#fff", border:"none", borderRadius:9, fontWeight:800, fontSize:13, cursor:"pointer", letterSpacing:".02em" }}>
                    Aufgabe bearbeiten →
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── E-Mail-Popup – Outlook-Stil – volle Inbox ── */}
        {deskPopup === "email" && (() => {
          const doneIds = new Set(verlauf.map(v => v.id));
          // Alle E-Mail-Aufgaben: doing zuerst, dann backlog, dann pool (nach tag/id sortiert), dann erledigte
          const emailAufgaben = aufgabenListe.filter(a => DESK_MAP[a.typ] === "email" || a.typ === "buchung" || a.typ === "theorie" || a.typ === "kette" || a.typ === "freitext" || a.typ === "multi_mc" || a.typ === "lueckentext");
          const order = (a) => {
            if (a.id === kbDoing) return 0;
            if (kbBacklog.includes(a.id)) return 1;
            if (!doneIds.has(a.id)) return 2;
            return 3;
          };
          const inboxMails = [...aufgabenListe].sort((a,b) => order(a)-order(b));
          const unreadCount = inboxMails.filter(a => !doneIds.has(a.id) && a.id !== kbDoing).length;
          const selMail = selMailId ? inboxMails.find(a => a.id === selMailId) : (kbDoing ? inboxMails.find(a => a.id === kbDoing) : inboxMails[0]) ?? null;
          const SENDERS = [
            { name:"BayernBank AG",        init:"B", col:"#0078d4" },
            { name:"Steuerberater Müller",  init:"M", col:"#7c3aed" },
            { name:"Chef – Geschäftsführung",init:"C", col:"#e8600a" },
            { name:"Einkauf – Beschaffung", init:"E", col:"#059669" },
            { name:"Kunden-Service",        init:"K", col:"#0891b2" },
          ];
          const getSender = (a) => SENDERS[aufgabenListe.indexOf(a) % SENDERS.length];
          const getMailStatus = (a) => {
            if (a.id === kbDoing) return "aktiv";
            if (doneIds.has(a.id)) return "done";
            if (kbBacklog.includes(a.id)) return "backlog";
            return "neu";
          };
          const statusDot = { neu:"#e8600a", aktiv:"#4ade80", backlog:"rgba(240,236,227,0.4)", done:"rgba(240,236,227,0.2)" };
          return (
            <div style={{ background:"rgba(12,9,4,0.99)", border:`1.5px solid rgba(232,96,10,0.3)`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
              {/* Outlook Titelleiste */}
              <div style={{ background:"#0f3460", padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:20, height:20, background:"#0078d4", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <AtSign size={11} color="#fff" strokeWidth={2.5}/>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>Outlook</span>
                  <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.4)" }}>— {firmaName}</span>
                  {unreadCount > 0 && <span style={{ background:"#e8600a", color:"#fff", fontSize:8, fontWeight:800, padding:"1px 6px", borderRadius:20 }}>{unreadCount} neu</span>}
                </div>
                <button onClick={() => { setDeskPopup(null); setSelMailId(null); }} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
              </div>

              {/* Dreispaltig: Sidebar | Mailliste | Detail */}
              <div style={{ display:"flex", minHeight:280 }}>
                {/* Schmale Icon-Sidebar */}
                <div style={{ width:40, background:"#0a0e17", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, gap:5, paddingBottom:8 }}>
                  {[
                    { icon:<AtSign size={13} strokeWidth={1.8}/>, active:true, badge:unreadCount },
                    { icon:<FileText size={13} strokeWidth={1.8}/>, active:false, badge:0 },
                    { icon:<Upload size={13} strokeWidth={1.8}/>, active:false, badge:0 },
                  ].map((item, i) => (
                    <div key={i} style={{ position:"relative" }}>
                      <div style={{ width:28, height:28, borderRadius:6, background:item.active?"rgba(0,120,212,0.25)":"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", color:item.active?"#4da6ff":"rgba(255,255,255,0.3)" }}>{item.icon}</div>
                      {item.badge > 0 && <div style={{ position:"absolute", top:-3, right:-3, width:13, height:13, background:"#e8600a", borderRadius:"50%", fontSize:7, fontWeight:800, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>{item.badge}</div>}
                    </div>
                  ))}
                </div>

                {/* Mailliste */}
                <div style={{ width:180, borderRight:"1px solid rgba(255,255,255,0.06)", overflowY:"auto", maxHeight:320 }}>
                  <div style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.06)", fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.5)" }}>Posteingang</div>
                  {inboxMails.map(a => {
                    const sender = getSender(a);
                    const ms = getMailStatus(a);
                    const isOpen = selMail?.id === a.id;
                    const isDone = ms === "done";
                    return (
                      <div key={a.id} onClick={() => setSelMailId(a.id)}
                        style={{ padding:"7px 10px", borderBottom:"1px solid rgba(255,255,255,0.04)", cursor:"pointer",
                          background: isOpen ? "rgba(0,120,212,0.15)" : "transparent",
                          borderLeft: isOpen ? "2.5px solid #0078d4" : "2.5px solid transparent",
                          opacity: isDone ? 0.45 : 1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:statusDot[ms], flexShrink:0 }}/>
                          <div style={{ fontSize:10, fontWeight: isDone ? 400 : 700, color:isDone?"rgba(255,255,255,0.4)":"#fff", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{sender.name}</div>
                        </div>
                        <div style={{ fontSize:9.5, color:isDone?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.65)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", fontWeight: ms==="neu"?600:400 }}>{a.titel}</div>
                        {ms === "aktiv" && <div style={{ fontSize:8, color:"#4ade80", marginTop:1 }}>● In Bearbeitung</div>}
                        {ms === "neu"   && <div style={{ fontSize:8, color:"#e8600a", marginTop:1 }}>● Ungelesen</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Mail-Detail */}
                {selMail ? (() => {
                  const sender = getSender(selMail);
                  const ms = getMailStatus(selMail);
                  const isDone = doneIds.has(selMail.id);
                  const isInBacklog = kbBacklog.includes(selMail.id);
                  const isActive = selMail.id === kbDoing;
                  return (
                    <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
                      {/* Mail-Kopf */}
                      <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize:13, fontWeight:800, color:"#f0ece3", marginBottom:7 }}>{selMail.titel}</div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <div style={{ width:30, height:30, borderRadius:"50%", background:sender.col, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{sender.init}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:10.5, fontWeight:700, color:"#f0ece3" }}>{sender.name}</div>
                            <div style={{ fontSize:9, color:"rgba(240,236,227,0.4)" }}>
                              An: buchhaltung@{firmaName.toLowerCase().replace(/[\s\-]/g,"")}.de
                            </div>
                          </div>
                          {isDone && <span style={{ background:"rgba(74,222,128,0.15)", color:"#4ade80", fontSize:8.5, fontWeight:800, padding:"2px 8px", borderRadius:20, flexShrink:0 }}>✓ Erledigt</span>}
                        </div>
                      </div>
                      {/* Mail-Body */}
                      <div style={{ flex:1, padding:"10px 12px 6px", fontSize:11.5, color:"rgba(240,236,227,0.72)", lineHeight:1.7, overflowY:"auto" }}>
                        <div style={{ marginBottom:8, color:"rgba(240,236,227,0.4)", fontSize:10 }}>Sehr geehrte Damen und Herren,</div>
                        <div>{selMail.story}</div>
                        <div style={{ marginTop:10, color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>
                          Mit freundlichen Grüßen<br/>{sender.name}
                        </div>
                      </div>
                      {/* Aktionsleiste */}
                      {!isDone && (
                        <div style={{ padding:"8px 12px 10px", display:"flex", gap:6, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                          {isActive ? (
                            <button onClick={() => { setDeskPopup(null); setSelMailId(null); setSzene("vorfall"); }}
                              style={{ flex:1, padding:"8px", background:"#4ade80", color:"#0f0a04", border:"none", borderRadius:7, fontWeight:800, fontSize:11.5, cursor:"pointer" }}>
                              ▶ Weiterbearbeiten →
                            </button>
                          ) : (
                            <>
                              {!isInBacklog ? (
                                <button onClick={() => { setKbBacklog(b => [...b, selMail.id]); }}
                                  style={{ flex:1, padding:"8px", background:"rgba(240,236,227,0.1)", color:"#f0ece3", border:"1px solid rgba(240,236,227,0.15)", borderRadius:7, fontWeight:700, fontSize:11, cursor:"pointer" }}>
                                  + In Backlog
                                </button>
                              ) : (
                                <button onClick={() => { setKbBacklog(b => b.filter(x => x !== selMail.id)); }}
                                  style={{ flex:1, padding:"8px", background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.45)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:7, fontWeight:600, fontSize:11, cursor:"pointer" }}>
                                  Aus Backlog entfernen
                                </button>
                              )}
                              {!kbDoing && (
                                <button onClick={() => {
                                  if (isInBacklog) setKbBacklog(b => b.filter(x => x !== selMail.id));
                                  setKbDoing(selMail.id);
                                  setDeskPopup(null); setSelMailId(null); setSzene("vorfall");
                                }} style={{ flex:1, padding:"8px", background:"#e8600a", color:"#fff", border:"none", borderRadius:7, fontWeight:800, fontSize:11.5, cursor:"pointer" }}>
                                  ▶ Jetzt starten →
                                </button>
                              )}
                            </>
                          )}
                          <button style={{ padding:"8px 10px", background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.4)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:7, fontSize:10, cursor:"default" }}>↩ Antworten</button>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.2)", gap:8 }}>
                    <AtSign size={28} strokeWidth={1} style={{ opacity:0.2 }}/>
                    <div style={{ fontSize:11, fontWeight:600 }}>Keine Mail ausgewählt</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Briefkasten-Popup ── */}
        {deskPopup === "post" && (
          <div style={{ background:"rgba(20,14,4,0.98)", border:`1.5px solid rgba(168,85,247,${aktiveDesk === "post" ? "0.45" : "0.18"})`, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <Mail size={14} color="#a855f7" strokeWidth={1.5}/>
                <span style={{ fontWeight:800, fontSize:13, color:"#f0ece3" }}>Briefkasten</span>
                {aktiveDesk === "post" && (
                  <span style={{ background:"#a855f7", color:"#fff", fontSize:9, fontWeight:800, padding:"1px 7px", borderRadius:20 }}>1 neu</span>
                )}
              </div>
              <button onClick={() => setDeskPopup(null)} style={{ background:"none", border:"none", color:"rgba(240,236,227,0.4)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
            </div>
            {aktiveDesk === "post" && aufgabe.belegDaten ? (
              <div>
                <div style={{ background:"rgba(168,85,247,0.08)", border:"1px solid rgba(168,85,247,0.22)", borderRadius:9, padding:"10px 12px", marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:12, color:"#f0ece3" }}>{aufgabe.belegDaten.absenderName}</div>
                      <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)", marginTop:1 }}>{aufgabe.belegDaten.absenderAdresse}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                      <div style={{ fontSize:9.5, color:"#a855f7", fontWeight:700, textTransform:"uppercase" }}>{aufgabe.belegDaten.typ === "eingangsrechnung" ? "Eingangsrechnung" : "Gutschrift"}</div>
                      <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)" }}>Nr. {aufgabe.belegDaten.rechnungsnummer}</div>
                      <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)" }}>Fällig: {aufgabe.belegDaten.faellig}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"flex-end", fontWeight:800, fontSize:14, color:"#a855f7", paddingTop:6, borderTop:"1px solid rgba(168,85,247,0.15)" }}>
                    {aufgabe.belegDaten.brutto.toLocaleString("de-DE", { minimumFractionDigits:2 })} €
                  </div>
                </div>
                <div style={{ fontSize:11.5, color:"rgba(240,236,227,0.5)", marginBottom:10, lineHeight:1.55 }}>{aufgabe.story}</div>
                <button onClick={() => { setDeskPopup(null); setSzene("vorfall"); }}
                  style={{ width:"100%", padding:"11px", background:"#a855f7", color:"#fff", border:"none", borderRadius:9, fontWeight:800, fontSize:13, cursor:"pointer" }}>
                  Beleg bearbeiten →
                </button>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"18px 0", color:"rgba(240,236,227,0.28)", fontSize:12 }}>
                <Mail size={24} strokeWidth={1} style={{ marginBottom:8, opacity:0.3 }}/>
                <div>Briefkasten leer</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Vorfall / PC / Buchung / Feedback scene ───────────────────────────────
  return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"12px 14px" }}>
      {simHeader}

      {feedback === null && (
        <button onClick={() => setSzene("schreibtisch")}
          style={{ background:"none", border:"none", color:"rgba(240,236,227,0.4)", cursor:"pointer", fontSize:12, marginBottom:10, padding:0, display:"flex", alignItems:"center", gap:4 }}>
          ← Schreibtisch
        </button>
      )}

      {/* Task card */}
      <div style={{ background:"rgba(28,20,10,0.7)", border:"1px solid rgba(240,236,227,0.1)", borderLeft:`3px solid ${meta.farbe}`, borderRadius:12, padding:"13px 16px", marginBottom:12 }}>
        {aufgabe.grundwissen && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:9.5, fontWeight:700, color:"#4ade80", background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.25)", padding:"2px 8px", borderRadius:20, marginBottom:6 }}>
            <GraduationCap size={9} strokeWidth={2}/>Grundwissen (Wiederholung)
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
          <div style={{ fontWeight:800, fontSize:14, color:"#f0ece3" }}>{aufgabeIdx+1}/{aufgabenListe.length} · {aufgabe.titel}</div>
          <span style={{ background:`${meta.farbe}22`, color:meta.farbe, fontWeight:700, fontSize:11, padding:"2px 10px", borderRadius:20, flexShrink:0, marginLeft:8 }}>{aufgabe.punkte} P</span>
        </div>
        <div style={{ fontSize:13, color:"rgba(240,236,227,0.7)", lineHeight:1.55 }}>{aufgabe.story}</div>
      </div>

      {/* ── Ketten-Aufgabe: Stepper + aktueller Schritt ── */}
      {aufgabe.typ === "kette" && feedback === null && (() => {
        const ks = aufgabe.kette[ketteSchritt];
        const KETTE_ICONS = { mc:"❓", kalkulation:"🔢", buchung:"📒" };
        return (
          <div style={{ marginBottom:12 }}>
            {/* Stepper */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:2, marginBottom:14 }}>
              {aufgabe.kette.map((s, i) => {
                const done  = i < ketteSchritt;
                const aktiv = i === ketteSchritt;
                return (
                  <React.Fragment key={i}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1 }}>
                      <div style={{ width:26, height:26, borderRadius:"50%",
                        background: done ? "rgba(74,222,128,0.2)" : aktiv ? "#e8600a" : "rgba(240,236,227,0.07)",
                        border:`2px solid ${done ? "rgba(74,222,128,0.5)" : aktiv ? "#e8600a" : "rgba(240,236,227,0.12)"}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:11, fontWeight:800,
                        color: done ? "#4ade80" : aktiv ? "#fff" : "rgba(240,236,227,0.3)" }}>
                        {done ? "✓" : i+1}
                      </div>
                      <div style={{ fontSize:8, color: aktiv ? "#e8600a" : done ? "rgba(74,222,128,0.7)" : "rgba(240,236,227,0.22)", fontWeight: aktiv ? 800 : 500, textAlign:"center", lineHeight:1.2 }}>
                        {s.label}
                      </div>
                    </div>
                    {i < aufgabe.kette.length - 1 && (
                      <div style={{ height:2, flex:0.5, marginTop:12, background: i < ketteSchritt ? "rgba(74,222,128,0.4)" : "rgba(240,236,227,0.07)", borderRadius:1 }}/>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Schritt-Karte */}
            <div style={{ background:"rgba(20,14,4,0.95)", border:"1px solid rgba(240,236,227,0.09)", borderLeft:"3px solid #e8600a", borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:"#e8600a", marginBottom:5 }}>
                {KETTE_ICONS[ks.typ] || "▶"} Schritt {ketteSchritt+1}/{aufgabe.kette.length} – {ks.label}
              </div>
              <div style={{ fontSize:13, color:"rgba(240,236,227,0.82)", lineHeight:1.65, whiteSpace:"pre-line" }}>{ks.aufgabe}</div>
            </div>

            {/* MC-Antworten */}
            {ks.typ === "mc" && (
              <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"12px 14px" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {ks.mcOptionen.map((opt, i) => (
                    <button key={i} onClick={() => setTheorieAntwort(i)}
                      style={{ padding:"10px 14px", border:`1.5px solid ${theorieAntwort===i?"#e8600a":"rgba(240,236,227,0.14)"}`, borderRadius:9, background:theorieAntwort===i?"rgba(232,96,10,0.14)":"rgba(240,236,227,0.04)", color:theorieAntwort===i?"#e8600a":"#f0ece3", fontSize:13, textAlign:"left", cursor:"pointer", fontWeight:theorieAntwort===i?700:400, display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ width:22, height:22, borderRadius:6, background:theorieAntwort===i?"#e8600a":"rgba(240,236,227,0.1)", color:theorieAntwort===i?"#fff":"rgba(240,236,227,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{String.fromCharCode(65+i)}</span>
                      {opt}
                    </button>
                  ))}
                </div>
                <button onClick={pruefen} disabled={theorieAntwort === null}
                  style={{ marginTop:12, width:"100%", padding:"11px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity:theorieAntwort===null?0.4:1 }}>
                  Antwort prüfen
                </button>
              </div>
            )}

            {/* Kalkulations-Eingabe */}
            {ks.typ === "kalkulation" && (
              <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"12px 14px" }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                  <div style={{ flex:1 }}>
                    <input value={kalkAntwort} onChange={e => setKalkAntwort(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && kalkAntwort.trim()) pruefen(); }}
                      placeholder="Ergebnis eingeben …" autoFocus
                      style={{ width:"100%", padding:"12px 14px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:16, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'Fira Code',monospace", outline:"none", textAlign:"right" }}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:"rgba(240,236,227,0.5)", paddingBottom:14 }}>{ks.kalkulation?.einheit || "€"}</div>
                </div>
                <button onClick={pruefen} disabled={!kalkAntwort.trim()}
                  style={{ marginTop:10, width:"100%", padding:"11px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity:!kalkAntwort.trim()?0.4:1 }}>
                  Ergebnis prüfen
                </button>
              </div>
            )}

            {/* Buchungssatz-Eingabe (kette-Schritt) */}
            {ks.typ === "buchung" && (() => {
              const iSt = { width:"100%", padding:"10px 12px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:14, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'Fira Code',monospace", textTransform:"uppercase", outline:"none" };
              const bSt = { ...iSt, fontSize:13, textTransform:"none", color:"rgba(240,236,227,0.8)", marginTop:4 };
              const nS = (ks.soll||[]).length;
              const nH = (ks.haben||[]).length;
              const maxR = Math.max(nS, nH);
              const anRow = nH > nS ? 0 : nS - 1;
              const habenOffset = nS > nH ? nS - nH : 0;
              const allFilled = (buchAntwort.soll||[""]).every(s=>(s||"").trim())
                && (buchAntwort.haben||[""]).every(h=>(h||"").trim())
                && (buchAntwort.betragSoll||[""]).every(b=>(b||"").trim())
                && (buchAntwort.betragHaben||[""]).every(b=>(b||"").trim());
              return (
                <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:"rgba(240,236,227,0.35)", marginBottom:9 }}>
                    Kürzel {lehrerConfig.mitKontennummern ? "oder Nr. – z.B. 6000 / AWR …" : "– z.B. AWR, VE, BK …"}
                    {" · Betrag: "}
                    <span style={{ fontFamily:"'Fira Code',monospace", color:"rgba(232,96,10,0.7)" }}>1.234,56</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"0 8px", marginBottom:3 }}>
                    <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{nS>1 ? `Soll (${nS} Konten)` : "Soll"}</div>
                    <div/>
                    <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{nH>1 ? `Haben (${nH} Konten)` : "Haben"}</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"6px 8px", alignItems:"start" }}>
                    {Array.from({length: maxR}).map((_,row) => {
                      const si = row; const hi = row - habenOffset;
                      return (<React.Fragment key={row}>
                        {si < nS
                          ? <div>
                              <input value={(buchAntwort.soll||[])[si]||""}
                                onChange={e=>{ const v=[...(buchAntwort.soll||[])]; v[si]=e.target.value; setBuchAntwort(a=>({...a,soll:v})); }}
                                onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                                placeholder={nS>1 ? `Soll-Konto ${si+1}` : "Soll-Konto"} autoFocus={row===0}
                                style={iSt}/>
                              <input value={(buchAntwort.betragSoll||[])[si]||""}
                                onChange={e=>{ const v=[...(buchAntwort.betragSoll||[])]; v[si]=e.target.value; setBuchAntwort(a=>({...a,betragSoll:v})); }}
                                onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                                placeholder="0,00 €" inputMode="decimal" style={bSt}/>
                            </div>
                          : <div/>}
                        <div style={{ fontWeight:800, color:"rgba(240,236,227,0.35)", fontSize:12, textAlign:"center", paddingTop:12, visibility: row===anRow?"visible":"hidden" }}>an</div>
                        {hi>=0 && hi<nH
                          ? <div>
                              <input value={(buchAntwort.haben||[])[hi]||""}
                                onChange={e=>{ const v=[...(buchAntwort.haben||[])]; v[hi]=e.target.value; setBuchAntwort(a=>({...a,haben:v})); }}
                                onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                                placeholder={nH>1 ? `Haben-Konto ${hi+1}` : "Haben-Konto"}
                                style={iSt}/>
                              <input value={(buchAntwort.betragHaben||[])[hi]||""}
                                onChange={e=>{ const v=[...(buchAntwort.betragHaben||[])]; v[hi]=e.target.value; setBuchAntwort(a=>({...a,betragHaben:v})); }}
                                onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                                placeholder="0,00 €" inputMode="decimal" style={bSt}/>
                            </div>
                          : <div/>}
                      </React.Fragment>);
                    })}
                  </div>
                  <button onClick={pruefen} disabled={!allFilled}
                    style={{ marginTop:10, width:"100%", padding:"11px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity:!allFilled?0.4:1 }}>
                    Buchungssatz prüfen
                  </button>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ── PC/Banking Interface with monitor framing ── */}
      {aufgabe.typ !== "kette" && <div style={{ marginBottom:12 }}>
        {/* Monitor bezel */}
        <div style={{ background:"#1a3a5c", borderRadius:"10px 10px 0 0", padding:"7px 14px 4px" }}>
          <div style={{ display:"flex", gap:5, marginBottom:3 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#ff5f57" }}/>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#febc2e" }}/>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#28c840" }}/>
          </div>
          <div style={{ textAlign:"center", fontSize:9.5, color:"rgba(255,255,255,0.35)" }}>BayernBank AG — Online Banking · {firmaName}</div>
        </div>

        <div style={{ background:"#fff", borderRadius:"0 0 10px 10px", overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.3)" }}>

          {/* Bank header */}
          <div style={{ background:BG, padding:"11px 15px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:28, height:28, background:"rgba(255,255,255,0.12)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Landmark size={14} color="#7dd3fc" strokeWidth={1.5}/>
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:11.5, color:"#fff" }}>BayernBank AG</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)" }}>Firmenkundenkonto</div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)" }}>Kontostand</div>
                <div style={{ fontSize:20, fontWeight:900, color: kontostand >= 0 ? "#4ade80" : "#f87171", letterSpacing:"-0.02em" }}>
                  {kontostand.toLocaleString("de-DE", { minimumFractionDigits:2 })} €
                </div>
              </div>
            </div>
            <div style={{ fontSize:10, fontFamily:"monospace", color:"rgba(255,255,255,0.45)", letterSpacing:"0.04em" }}>{BANK_IBAN}</div>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", background:LT, borderBottom:`1px solid ${BD}` }}>
            {[["konto","Kontoübersicht"],["ueberweisung","Überweisen"],["dauerauftrag","Daueraufträge"],["beleg","Beleg"]].map(([id,label]) => (
              <div key={id} onClick={() => setAnsicht(id)} style={{ flex:1, padding:"9px 4px", textAlign:"center", borderBottom:`2px solid ${ansicht===id ? BG : "transparent"}`, fontSize:9.5, fontWeight:ansicht===id?700:400, color:ansicht===id?BG:"#64748b", background:ansicht===id?"#fff":"transparent", cursor:"pointer", userSelect:"none", transition:"all 0.15s" }}>{label}</div>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding:"12px 14px", minHeight:100 }}>

            {/* ── Kontoübersicht ── */}
            {ansicht === "konto" && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Letzte Umsätze · ···{BANK_IBAN.slice(-7)}</div>
                <div style={{ display:"flex", gap:8, padding:"6px 0", borderBottom:`1px solid ${BD}`, fontSize:11, color:"#374151" }}>
                  <span style={{ minWidth:80, color:"#94a3b8", flexShrink:0 }}>02.01.2026</span>
                  <span style={{ flex:1 }}>Eröffnungssaldo</span>
                  <span style={{ minWidth:90, textAlign:"right", fontFamily:"monospace", fontWeight:700, color:"#0f172a" }}>{BANK_START.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span>
                </div>
                {pastTx.map((tx, i) => (
                  <div key={i} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:`1px solid ${BD}`, fontSize:10.5, color:"#374151" }}>
                    <span style={{ minWidth:80, color:"#94a3b8", flexShrink:0 }}>{tx.datum}</span>
                    <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.text}</span>
                    <span style={{ minWidth:90, textAlign:"right", fontFamily:"monospace", fontWeight:600, color: tx.betrag > 0 ? "#15803d" : "#dc2626" }}>{(tx.betrag > 0 ? "+" : "") + tx.betrag.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span>
                  </div>
                ))}
                {aufgabe.transaktion && (
                  <div style={{ display:"flex", gap:8, padding:"8px 10px", marginTop:5, borderRadius:8, background:"rgba(232,96,10,0.07)", border:"1.5px solid rgba(232,96,10,0.3)", fontSize:11, color:"#0f172a" }}>
                    <span style={{ minWidth:80, color:"#64748b", flexShrink:0, fontWeight:600 }}>{aufgabe.transaktion.datum}</span>
                    <span style={{ flex:1, fontWeight:600 }}>{aufgabe.transaktion.text}</span>
                    <span style={{ minWidth:90, textAlign:"right", fontFamily:"monospace", fontWeight:800, color: aufgabe.transaktion.betrag > 0 ? "#15803d" : "#dc2626" }}>{(aufgabe.transaktion.betrag > 0 ? "+" : "") + aufgabe.transaktion.betrag.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Überweisung ── */}
            {ansicht === "ueberweisung" && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>Neue Überweisung</div>
                {[["Empfänger","empfaenger"],["IBAN Empfänger","iban"],["Betrag (€)","betrag"],["Verwendungszweck","verwendung"]].map(([label,key]) => (
                  <div key={key} style={{ marginBottom:7 }}>
                    <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>{label}</div>
                    <input value={ueForm[key] || ""} onChange={e => setUeForm(f => ({...f,[key]:e.target.value}))}
                      placeholder={key==="iban"?"DE.. .... .... ....":key==="betrag"?"0,00":""}
                      style={{ ...inputStyle, fontFamily: key==="iban" ? "monospace" : "inherit" }}/>
                  </div>
                ))}
                {!aktionOk ? (
                  <button onClick={() => setAktionOk(true)}
                    disabled={!ueForm.iban || !ueForm.betrag}
                    style={{ width:"100%", padding:"9px", background:BG, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:12, cursor:"pointer", marginTop:2, opacity:(!ueForm.iban||!ueForm.betrag)?0.45:1 }}>
                    Überweisung bestätigen →
                  </button>
                ) : (
                  <div style={{ padding:"7px 11px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, fontSize:11, color:"#15803d", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                    <CheckSquare size={12} strokeWidth={1.5}/> Überweisung ausgeführt!
                  </div>
                )}
              </div>
            )}

            {/* ── Dauerauftrag ── */}
            {ansicht === "dauerauftrag" && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>Neuer Dauerauftrag</div>
                {[["Empfänger","empfaenger"],["IBAN Empfänger","iban"],["Betrag (€)","betrag"],["Verwendungszweck","verwendung"]].map(([label,key]) => (
                  <div key={key} style={{ marginBottom:7 }}>
                    <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>{label}</div>
                    <input value={daForm[key] || ""} onChange={e => setDaForm(f => ({...f,[key]:e.target.value}))}
                      placeholder={key==="iban"?"DE.. .... .... ....":key==="betrag"?"0,00":""}
                      style={{ ...inputStyle, fontFamily: key==="iban" ? "monospace" : "inherit" }}/>
                  </div>
                ))}
                <div style={{ display:"flex", gap:8, marginBottom:7 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>Rhythmus</div>
                    <select value={daForm.rhythmus || "monatlich"} onChange={e => setDaForm(f=>({...f,rhythmus:e.target.value}))} style={{ ...inputStyle }}>
                      <option value="monatlich">monatlich</option>
                      <option value="vierteljaehrlich">vierteljährlich</option>
                      <option value="jaehrlich">jährlich</option>
                    </select>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>Ausführungstag</div>
                    <select value={daForm.tag || "1"} onChange={e => setDaForm(f=>({...f,tag:e.target.value}))} style={{ ...inputStyle }}>
                      {[1,5,10,15,20,25,28].map(d => <option key={d} value={String(d)}>{d}.</option>)}
                    </select>
                  </div>
                </div>
                {!aktionOk ? (
                  <button onClick={() => setAktionOk(true)}
                    disabled={!daForm.iban || !daForm.betrag}
                    style={{ width:"100%", padding:"9px", background:BG, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:12, cursor:"pointer", opacity:(!daForm.iban||!daForm.betrag)?0.45:1 }}>
                    Dauerauftrag speichern →
                  </button>
                ) : (
                  <div style={{ padding:"7px 11px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, fontSize:11, color:"#15803d", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                    <CheckSquare size={12} strokeWidth={1.5}/> Dauerauftrag gespeichert!
                  </div>
                )}
              </div>
            )}

            {/* ── Beleg ── */}
            {ansicht === "beleg" && aufgabe.belegDaten && (() => {
              const b = aufgabe.belegDaten;
              const isEin = b.typ === "eingangsrechnung";
              return (
                <div>
                  <div style={{ border:`1.5px solid ${BD}`, borderRadius:8, padding:"10px 12px", marginBottom:8, background:"#fafbfc", fontSize:10.5 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:7 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:11.5, color:"#0f172a" }}>{b.absenderName}</div>
                        <div style={{ color:"#64748b", marginTop:1 }}>{b.absenderAdresse}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:700, color:isEin?"#dc2626":"#15803d", fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.06em" }}>{isEin ? "Eingangsrechnung" : "Ausgangsrechnung"}</div>
                        <div style={{ color:"#374151", marginTop:1 }}>Nr. {b.rechnungsnummer}</div>
                        <div style={{ color:"#64748b" }}>{b.datum} · Fällig: {b.faellig}</div>
                        <div style={{ fontSize:9.5, color:"#94a3b8", fontFamily:"monospace", marginTop:1 }}>IBAN: {b.absenderIBAN}</div>
                      </div>
                    </div>
                    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:5 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${BD}`, color:"#64748b" }}>
                          {["Menge","Einheit","Beschreibung","EP (€)","Gesamt (€)"].map(h => <th key={h} style={{ padding:"2px 3px", textAlign: h.includes("€")?"right":"left", fontWeight:700, fontSize:9.5 }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {b.positionen.map((p, i) => (
                          <tr key={i} style={{ borderBottom:`1px solid ${BD}26`, color:"#1e293b" }}>
                            <td style={{ padding:"2px 3px", textAlign:"right" }}>{p.menge}</td>
                            <td style={{ padding:"2px 3px" }}>{p.einheit}</td>
                            <td style={{ padding:"2px 3px", fontWeight:500 }}>{p.beschreibung}</td>
                            <td style={{ padding:"2px 3px", textAlign:"right", fontFamily:"monospace" }}>{p.einzelpreis.toFixed(2)}</td>
                            <td style={{ padding:"2px 3px", textAlign:"right", fontFamily:"monospace", fontWeight:600 }}>{p.gesamt.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ borderTop:`1px solid ${BD}`, paddingTop:5, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, fontSize:10.5 }}>
                      {b.netto !== undefined && b.netto !== b.brutto && <>
                        <div style={{ color:"#374151" }}>Nettobetrag: <span style={{ fontFamily:"monospace", fontWeight:600 }}>{b.netto.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
                        <div style={{ color:"#374151" }}>zzgl. 19 % USt: <span style={{ fontFamily:"monospace", fontWeight:600 }}>{(b.brutto-b.netto).toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
                      </>}
                      <div style={{ fontWeight:700, fontSize:11, color:"#0f172a" }}>Rechnungsbetrag (brutto): <span style={{ fontFamily:"monospace" }}>{b.brutto.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
                    </div>
                  </div>
                  {aufgabe.aktion === "beleg" && (!belegUeOk ? (
                    <div>
                      <div style={{ fontSize:9.5, fontWeight:700, color:"#94a3b8", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Überweisung ausfüllen</div>
                      {[["Empfänger","empfaenger","text"],["IBAN Empfänger","iban","text"],["Betrag (€)","betrag","number"],["Verwendungszweck","verwendung","text"]].map(([label,key,type]) => (
                        <div key={key} style={{ marginBottom:5 }}>
                          <div style={{ fontSize:9.5, color:"#64748b", marginBottom:2 }}>{label}</div>
                          <input type={type} value={belegUeForm[key] || ""} onChange={e => setBelegUeForm(f=>({...f,[key]:e.target.value}))}
                            style={{ ...inputStyle, fontFamily: key==="iban"?"monospace":"inherit" }} placeholder={key==="iban"?"DE.. .... .... ....":""} />
                        </div>
                      ))}
                      <button onClick={() => {
                        const sol = aufgabe.ueberweisungsDaten;
                        const chkIban = (belegUeForm.iban||"").replace(/\s/g,"").toUpperCase() === sol.iban.replace(/\s/g,"").toUpperCase();
                        const chkBetrag = parseFloat((belegUeForm.betrag||"").replace(",",".")) === parseFloat(sol.betrag);
                        const chkEmpf = (belegUeForm.empfaenger||"").trim().toLowerCase().includes(sol.empfaenger.split(" ")[0].toLowerCase());
                        const teilPunkte = (chkIban?1:0) + (chkBetrag?1:0) + (chkEmpf?1:0);
                        setBelegUePunkte(teilPunkte);
                        setBelegUeOk(true);
                      }}
                        disabled={!belegUeForm.empfaenger || !belegUeForm.iban || !belegUeForm.betrag}
                        style={{ width:"100%", marginTop:3, padding:"8px", background:BG, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:11.5, cursor:"pointer", opacity:(!belegUeForm.empfaenger||!belegUeForm.iban||!belegUeForm.betrag)?0.5:1 }}>
                        Überweisung bestätigen →
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding:"7px 11px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, fontSize:11, color:"#15803d", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                      <CheckSquare size={12} strokeWidth={1.5}/> Überweisung übermittelt! {belegUePunkte > 0 ? `(+${belegUePunkte} Pkt für Richtigkeit)` : "(Daten unvollständig)"}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>}

      {/* ── Buchungssatz-Eingabe (Buchung / Überweisung / Beleg) ── */}
      {aufgabe.typ !== "mc" && aufgabe.typ !== "kalkulation" && aufgabe.typ !== "kette" &&
       (aufgabe.aktion === "buchung" || aktionOk || belegUeOk) && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:5 }}>{aufgabe.aufgabe}</div>
          <div style={{ fontSize:11, color:"rgba(240,236,227,0.35)", marginBottom:9 }}>
            {lehrerConfig.mitKontennummern ? "Nr. oder Kürzel – z.B. 6000 / AWR, 2800 / BK …" : "Kürzel – z.B. BK, AWMP, FO, LG, AWR, VE …"}
            {" · Beträge: GoB-Format "}
            <span style={{ fontFamily:"'Fira Code',monospace", color:"rgba(232,96,10,0.8)" }}>1.234,56</span>
          </div>
          {(() => {
            const iSt = { width:"100%", padding:"10px 12px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:14, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'Fira Code',monospace", textTransform:"uppercase", outline:"none" };
            const bSt = { ...iSt, fontSize:13, textTransform:"none", color:"rgba(240,236,227,0.8)", marginTop:4 };
            const nS = (aufgabe.soll||[]).length;
            const nH = (aufgabe.haben||[]).length;
            const maxR = Math.max(nS, nH);
            const anRow = nH > nS ? 0 : nS - 1;
            const habenOffset = nS > nH ? nS - nH : 0;
            const allFilled = (buchAntwort.soll||[""]).every(s=>(s||"").trim())
              && (buchAntwort.haben||[""]).every(h=>(h||"").trim())
              && (buchAntwort.betragSoll||[""]).every(b=>(b||"").trim())
              && (buchAntwort.betragHaben||[""]).every(b=>(b||"").trim());
            return (<>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"0 8px", marginBottom:3 }}>
                <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{nS>1 ? `Soll (${nS} Konten)` : "Soll"}</div>
                <div/>
                <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{nH>1 ? `Haben (${nH} Konten)` : "Haben"}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"6px 8px", alignItems:"start" }}>
                {Array.from({length: maxR}).map((_,row) => {
                  const si = row; const hi = row - habenOffset;
                  return (<React.Fragment key={row}>
                    {si < nS
                      ? <div>
                          <input value={(buchAntwort.soll||[])[si]||""}
                            onChange={e=>{ const v=[...(buchAntwort.soll||[])]; v[si]=e.target.value; setBuchAntwort(a=>({...a,soll:v})); }}
                            onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                            placeholder={nS>1 ? `Soll-Konto ${si+1}` : "Soll-Konto"} autoFocus={row===0}
                            style={iSt}/>
                          <input value={(buchAntwort.betragSoll||[])[si]||""}
                            onChange={e=>{ const v=[...(buchAntwort.betragSoll||[])]; v[si]=e.target.value; setBuchAntwort(a=>({...a,betragSoll:v})); }}
                            onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                            placeholder="0,00 €" inputMode="decimal"
                            style={bSt}/>
                        </div>
                      : <div/>}
                    <div style={{ fontWeight:800, color:"rgba(240,236,227,0.35)", fontSize:12, textAlign:"center", paddingTop:12, visibility: row===anRow?"visible":"hidden" }}>an</div>
                    {hi>=0 && hi<nH
                      ? <div>
                          <input value={(buchAntwort.haben||[])[hi]||""}
                            onChange={e=>{ const v=[...(buchAntwort.haben||[])]; v[hi]=e.target.value; setBuchAntwort(a=>({...a,haben:v})); }}
                            onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                            placeholder={nH>1 ? `Haben-Konto ${hi+1}` : "Haben-Konto"}
                            style={iSt}/>
                          <input value={(buchAntwort.betragHaben||[])[hi]||""}
                            onChange={e=>{ const v=[...(buchAntwort.betragHaben||[])]; v[hi]=e.target.value; setBuchAntwort(a=>({...a,betragHaben:v})); }}
                            onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                            placeholder="0,00 €" inputMode="decimal"
                            style={bSt}/>
                        </div>
                      : <div/>}
                  </React.Fragment>);
                })}
              </div>
              <button onClick={pruefen} disabled={!allFilled}
                style={{ marginTop:10, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity:!allFilled?0.4:1 }}>
                Buchungssatz prüfen
              </button>
            </>);
          })()}
        </div>
      )}

      {/* ── Multiple-Choice (Theoriefragen) ── */}
      {aufgabe.typ === "mc" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          {aufgabe.schaubild && <SchaubildAnzeige schaubild={aufgabe.schaubild} />}
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:12 }}>{aufgabe.aufgabe}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {aufgabe.mcOptionen.map((opt, i) => (
              <button key={i} onClick={() => setTheorieAntwort(i)}
                style={{ padding:"10px 14px", border:`1.5px solid ${theorieAntwort === i ? "#e8600a" : "rgba(240,236,227,0.14)"}`, borderRadius:9, background: theorieAntwort === i ? "rgba(232,96,10,0.14)" : "rgba(240,236,227,0.04)", color: theorieAntwort === i ? "#e8600a" : "#f0ece3", fontSize:13, textAlign:"left", cursor:"pointer", fontWeight: theorieAntwort === i ? 700 : 400, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ width:22, height:22, borderRadius:6, background: theorieAntwort === i ? "#e8600a" : "rgba(240,236,227,0.1)", color: theorieAntwort === i ? "#fff" : "rgba(240,236,227,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{String.fromCharCode(65+i)}</span>
                {opt}
              </button>
            ))}
          </div>
          <button onClick={pruefen} disabled={theorieAntwort === null}
            style={{ marginTop:12, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: theorieAntwort === null ? 0.4 : 1 }}>
            Antwort prüfen
          </button>
        </div>
      )}

      {/* ── Kalkulation ── */}
      {aufgabe.typ === "kalkulation" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          {aufgabe.schaubild && <SchaubildAnzeige schaubild={aufgabe.schaubild} />}
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:5 }}>{aufgabe.aufgabe}</div>
          <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.35)", marginBottom:8 }}>
            GoB-Format: <span style={{ fontFamily:"'Fira Code',monospace", color:"rgba(232,96,10,0.7)" }}>1.234,56</span> (Tausenderpunkt, Komma als Dezimalzeichen)
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <input type="text" inputMode="decimal" value={kalkAntwort} onChange={e => setKalkAntwort(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && kalkAntwort) pruefen(); }}
              placeholder="z.B. 1.234,56" autoFocus
              style={{ flex:1, padding:"10px 12px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:16, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'Fira Code',monospace", outline:"none" }}/>
            <span style={{ fontSize:15, color:"rgba(240,236,227,0.5)", fontWeight:700 }}>{aufgabe.kalkulation?.einheit}</span>
          </div>
          <button onClick={pruefen} disabled={!kalkAntwort}
            style={{ width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: !kalkAntwort ? 0.4 : 1 }}>
            Ergebnis prüfen
          </button>
        </div>
      )}

      {/* ── Lückentext ── */}
      {aufgabe.typ === "lueckentext" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:10 }}>{aufgabe.aufgabe}</div>
          {/* Template mit Lücken-Inputs inline rendern */}
          <div style={{ fontSize:14, color:"rgba(240,236,227,0.8)", lineHeight:2.2, marginBottom:12, fontFamily:"'Fira Code',monospace", background:"rgba(240,236,227,0.04)", borderRadius:8, padding:"10px 12px" }}>
            {(aufgabe.lueckentext?.template || "").split(/(\[L\d+\])/).map((part, idx) => {
              const match = part.match(/\[L(\d+)\]/);
              if (match) {
                const li = parseInt(match[1]);
                const luecke = (aufgabe.lueckentext.luecken || []).find(l => l.id === li);
                return (
                  <input key={idx}
                    value={lueckenEingaben[li] || ""}
                    onChange={e => setLueckenEingaben(prev => ({...prev, [li]: e.target.value}))}
                    placeholder={luecke?.hinweis || "…"}
                    style={{ display:"inline-block", width: Math.max(80, ((luecke?.hinweis?.length || 6) + 2) * 8), padding:"3px 7px", border:"1.5px solid rgba(232,96,10,0.5)", borderRadius:5, background:"rgba(232,96,10,0.07)", color:"#e8600a", fontFamily:"'Fira Code',monospace", fontSize:13, textTransform:"uppercase", outline:"none", verticalAlign:"middle" }}/>
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </div>
          <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.3)", marginBottom:10 }}>
            Kürzel (z.B. BK, AWMP) oder Kontonummer (z.B. 2800) eingeben · Groß-/Kleinschreibung egal
          </div>
          <button onClick={pruefen}
            disabled={Object.keys(lueckenEingaben).length < (aufgabe.lueckentext?.luecken?.length || 1)}
            style={{ width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: Object.keys(lueckenEingaben).length < (aufgabe.lueckentext?.luecken?.length || 1) ? 0.4 : 1 }}>
            Lückentext prüfen
          </button>
        </div>
      )}

      {/* ── Zuordnung ── */}
      {aufgabe.typ === "zuordnung" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:4 }}>{aufgabe.aufgabe}</div>
          {/* Kategorie-Legende */}
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            {(aufgabe.zuordnung?.kategorien || []).map(kat => (
              <span key={kat.id} style={{ fontSize:11, fontWeight:700, color:kat.color, background:`rgba(${kat.rgb},0.1)`, border:`1px solid rgba(${kat.rgb},0.3)`, padding:"3px 10px", borderRadius:20 }}>
                {kat.label}
              </span>
            ))}
          </div>
          {/* Items mit Kategorie-Buttons */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {(aufgabe.zuordnung?.items || []).map(item => {
              const zugewiesen = zuordnungState[item.id];
              return (
                <div key={item.id} style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:9, padding:"8px 10px" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#f0ece3", marginBottom:6 }}>{item.text}</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {(aufgabe.zuordnung.kategorien || []).map(kat => {
                      const aktiv = zugewiesen === kat.id;
                      return (
                        <button key={kat.id} onClick={() => setZuordnungState(s => ({...s, [item.id]: kat.id}))}
                          style={{ padding:"5px 12px", border:`1.5px solid ${aktiv ? kat.color : "rgba(240,236,227,0.15)"}`, borderRadius:7, background: aktiv ? `rgba(${kat.rgb},0.18)` : "transparent", color: aktiv ? kat.color : "rgba(240,236,227,0.45)", fontSize:11, fontWeight: aktiv ? 800 : 500, cursor:"pointer" }}>
                          {kat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={pruefen}
            disabled={Object.keys(zuordnungState).length < (aufgabe.zuordnung?.items?.length || 1)}
            style={{ marginTop:12, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: Object.keys(zuordnungState).length < (aufgabe.zuordnung?.items?.length || 1) ? 0.4 : 1 }}>
            Zuordnung prüfen
          </button>
        </div>
      )}

      {/* ── Multi-Choice ── */}
      {aufgabe.typ === "multi_mc" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:4 }}>{aufgabe.aufgabe}</div>
          <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.35)", marginBottom:10 }}>Mehrere Antworten möglich – alle zutreffenden auswählen</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {(aufgabe.mcOptionen || []).map((opt, i) => {
              const aktiv = multiMcState.includes(i);
              return (
                <button key={i} onClick={() => setMultiMcState(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
                  style={{ padding:"10px 14px", border:`1.5px solid ${aktiv ? "#e8600a" : "rgba(240,236,227,0.14)"}`, borderRadius:9, background: aktiv ? "rgba(232,96,10,0.14)" : "rgba(240,236,227,0.04)", color: aktiv ? "#e8600a" : "#f0ece3", fontSize:13, textAlign:"left", cursor:"pointer", fontWeight: aktiv ? 700 : 400, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:22, height:22, borderRadius:5, border:`2px solid ${aktiv ? "#e8600a" : "rgba(240,236,227,0.25)"}`, background: aktiv ? "#e8600a" : "transparent", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, flexShrink:0 }}>
                    {aktiv ? "✓" : ""}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          <button onClick={pruefen} disabled={multiMcState.length === 0}
            style={{ marginTop:12, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: multiMcState.length === 0 ? 0.4 : 1 }}>
            Antworten prüfen
          </button>
        </div>
      )}

      {/* ── Freitext ── */}
      {aufgabe.typ === "freitext" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:4 }}>{aufgabe.aufgabe}</div>
          <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.35)", marginBottom:10 }}>
            Schreibe deine Antwort in eigenen Worten – die Musterlösung wird danach angezeigt.
          </div>
          <textarea value={freitextAntwort} onChange={e => setFreitextAntwort(e.target.value)}
            rows={aufgabe.freitext?.zeilen || 4}
            placeholder="Hier eingeben …"
            style={{ width:"100%", padding:"10px 12px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:13, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'IBM Plex Sans',system-ui,sans-serif", outline:"none", resize:"vertical", lineHeight:1.6 }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
            <span style={{ fontSize:10, color: freitextAntwort.trim().length >= (aufgabe.freitext?.minZeichen||20) ? "#4ade80" : "rgba(240,236,227,0.3)" }}>
              {freitextAntwort.trim().length} / {aufgabe.freitext?.minZeichen || 20} Zeichen
            </span>
          </div>
          <button onClick={pruefen} disabled={freitextAntwort.trim().length < (aufgabe.freitext?.minZeichen || 20)}
            style={{ marginTop:10, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: freitextAntwort.trim().length < (aufgabe.freitext?.minZeichen||20) ? 0.4 : 1 }}>
            Antwort abgeben &amp; Musterlösung zeigen
          </button>
        </div>
      )}

      {/* ── Feedback ── */}
      {feedback !== null && (() => {
        // Für Ketten-Aufgaben: Daten des aktuellen Schritts
        const isKette = aufgabe.typ === "kette";
        const ks = isKette ? aufgabe.kette[ketteSchritt] : null;
        const istLetzterKetteSchritt = isKette && ketteSchritt === aufgabe.kette.length - 1;
        const erklaerungText = isKette ? (ks?.erklaerung || "") : aufgabe.erklaerung;

        // T-Konto anzeigen? Nur bei richtigem Buchungssatz
        const stdBuchungRichtig = feedback === "richtig" && !aufgabe.typ && (aufgabe.soll?.length||0) > 0 && (aufgabe.betrag||0) > 0;
        const ketteBuchungRichtig = feedback === "richtig" && isKette && ks?.typ === "buchung";

        return (
          <div style={{ background:"rgba(28,20,10,0.85)", border:`1.5px solid ${feedback==="richtig" ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`, borderRadius:12, padding:"14px 16px" }}>
            {/* Titel */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, fontWeight:800, fontSize:14, color: feedback === "richtig" ? "#4ade80" : "#f87171" }}>
              {aufgabe.typ === "freitext"
                ? <><CheckSquare size={16} strokeWidth={1.5}/>Abgegeben! +{verlauf[verlauf.length-1]?.gewPunkte} Punkte</>
                : feedback === "richtig"
                ? <><CheckSquare size={16} strokeWidth={1.5}/>Richtig!{isKette ? ` (Schritt ${ketteSchritt+1})` : ` +${verlauf[verlauf.length-1]?.gewPunkte} Punkte`}</>
                : <><XCircle size={16} strokeWidth={1.5}/>Leider falsch{isKette ? ` (Schritt ${ketteSchritt+1})` : ""}</>}
            </div>
            {aufgabe.typ === "freitext" && (
              <div style={{ fontSize:11, color:"rgba(240,236,227,0.4)", marginBottom:8, fontStyle:"italic" }}>
                Vergleiche deine Antwort mit der Musterlösung und bewerte dich selbst.
              </div>
            )}
            {/* Lösung */}
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.75)", marginBottom:8, padding:"8px 10px", background:"rgba(240,236,227,0.05)", borderRadius:8 }}>
              <strong style={{color:"#f0ece3"}}>Lösung: </strong>
              {isKette
                ? ks?.typ === "mc"        ? <>{String.fromCharCode(65+ks.mcKorrekt)}. {ks.mcOptionen[ks.mcKorrekt]}</>
                : ks?.typ === "kalkulation"? <span style={{fontFamily:"'Fira Code',monospace"}}>{ks.kalkulation.richtigerWert.toLocaleString("de-DE",{minimumFractionDigits:2})} {ks.kalkulation.einheit}</span>
                : ks?.typ === "buchung"    ? <span style={{fontFamily:"'Fira Code',monospace"}}>{ks.soll.map(s=>s.kuerzel).join("+")} an {ks.haben.map(h=>h.kuerzel).join("+")} ({(ks.betrag||0).toLocaleString("de-DE",{minimumFractionDigits:2})} €)</span>
                : null
                : aufgabe.typ === "mc"
                ? <>{String.fromCharCode(65 + aufgabe.mcKorrekt)}. {aufgabe.mcOptionen[aufgabe.mcKorrekt]}</>
                : aufgabe.typ === "multi_mc"
                ? <>{(aufgabe.multiKorrekt || []).map(i => String.fromCharCode(65+i)+". "+aufgabe.mcOptionen[i]).join(" | ")}</>
                : aufgabe.typ === "kalkulation"
                ? <span style={{ fontFamily:"'Fira Code',monospace" }}>{aufgabe.kalkulation.richtigerWert.toLocaleString("de-DE",{minimumFractionDigits:2, maximumFractionDigits:2})} {aufgabe.kalkulation.einheit}</span>
                : aufgabe.typ === "lueckentext"
                ? <span style={{ fontFamily:"'Fira Code',monospace", wordBreak:"break-word" }}>
                    {(aufgabe.lueckentext?.template || "").replace(/\[L(\d+)\]/g, (_, id) => {
                      const l = (aufgabe.lueckentext.luecken || []).find(l => l.id === parseInt(id));
                      return `[${l?.korrekt || "?"}]`;
                    })}
                  </span>
                : aufgabe.typ === "zuordnung"
                ? <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:4 }}>
                    {(aufgabe.zuordnung?.items || []).map(item => {
                      const kat = (aufgabe.zuordnung.kategorien || []).find(k => k.id === item.korrektKat);
                      return (
                        <span key={item.id} style={{ fontSize:11, background:`rgba(${kat?.rgb || "240,236,227"},0.12)`, color: kat?.color || "#f0ece3", border:`1px solid rgba(${kat?.rgb || "240,236,227"},0.25)`, padding:"2px 8px", borderRadius:5 }}>
                          {item.id} → {kat?.label || item.korrektKat}
                        </span>
                      );
                    })}
                  </div>
                : aufgabe.typ === "freitext"
                ? <div style={{ fontSize:12, color:"rgba(240,236,227,0.85)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{aufgabe.freitext?.loesung}</div>
                : <>{aufgabe.soll.map(s=>s.kuerzel).join(" + ")} an {aufgabe.haben.map(h=>h.kuerzel).join(" + ")}{" "}
                    ({aufgabe.betrag.toLocaleString("de-DE",{minimumFractionDigits:2, maximumFractionDigits:2})} €)</>
              }
            </div>

            {/* Live T-Konto (Prio 2) */}
            {stdBuchungRichtig && (
              <LiveTKonto sollKuerzel={aufgabe.soll[0].kuerzel} habenKuerzel={aufgabe.haben[0].kuerzel} betrag={aufgabe.betrag}/>
            )}
            {ketteBuchungRichtig && (
              <LiveTKonto sollKuerzel={ks.soll[0].kuerzel} habenKuerzel={ks.haben[0].kuerzel} betrag={ks.betrag||0}/>
            )}

            <div style={{ fontSize:12, color:"rgba(240,236,227,0.5)", lineHeight:1.6, marginBottom:10, marginTop:10 }}>{erklaerungText}</div>
            <button onClick={() => {
              if (isKette && !istLetzterKetteSchritt) {
                const nextKs = aufgabe.kette[ketteSchritt + 1];
                const nxtS = (nextKs?.soll||[]).length || 1;
                const nxtH = (nextKs?.haben||[]).length || 1;
                setKetteSchritt(s => s + 1);
                setFeedback(null);
                setTheorieAntwort(null);
                setKalkAntwort("");
                setBuchAntwort({ soll: Array(nxtS).fill(""), haben: Array(nxtH).fill(""), betragSoll: Array(nxtS).fill(""), betragHaben: Array(nxtH).fill("") });
              } else {
                weiter();
              }
            }}
              style={{ width:"100%", padding:"11px", background:"rgba(240,236,227,0.08)", color:"#f0ece3", border:"1px solid rgba(240,236,227,0.16)", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              {isKette && !istLetzterKetteSchritt
                ? `Schritt ${ketteSchritt+2} / ${aufgabe.kette.length} →`
                : aufgabeIdx + 1 >= aufgabenListe.length ? "Abschluss →" : "Weiter →"}
            </button>
          </div>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SIMULATION – Virtuelle Firma führen
// ══════════════════════════════════════════════════════════════════════════════



function SimulationModus({ onZurueck, onVonURLDetected, onRegisterReset }) {
  const [phase, setPhase] = useState("setup"); // setup | firma | spiel | abschluss
  const [schwierigkeit, setSchwierigkeit] = useState("8");
  const [modus, setModus] = useState("stunde"); // stunde | projekt
  const [stundenMin, setStundenMin] = useState(45); // 45 | 90
  const [klassenCode, setKlassenCode] = useState("");
  const [spielerName, setSpielerName] = useState("");
  const [streakData, setStreakData] = useState(null);
  const [levelData,  setLevelData]  = useState(null);
  const { recordCompletion } = useStreak(spielerName || null);
  const { recordLevel }      = useLevel(spielerName || null);
  const [firma, setFirma] = useState(null);
  const [showLehrerKonfig, setShowLehrerKonfig] = useState(false);
  const [themenOffen, setThemenOffen] = useState(false);
  const [dashboardOffen, setDashboardOffen] = useState(false);
  const [endeAnkuendigung, setEndeAnkuendigung] = useState(null); // {end_in, ts} | null
  const [endAnnouncement, setEndAnnouncement] = useState(0);      // teacher UI: selected end_in
  const [savedStand, setSavedStand] = useState(null);             // {found,punkte,max_punkte,aufgabe_idx} | null
  const [selectedFirma, setSelectedFirma] = useState(null);       // LK-Firmenwahl in Schritt 3
  const fortschrittRef = useRef({ punkte: 0, maxPunkte: 0 });    // aktueller Spielstand für Heartbeat

  // "← Zur Session"-Callback beim Lehrer registrieren
  React.useEffect(() => {
    onRegisterReset?.(() => { setPhase("setup"); setEndeAnkuendigung(null); setEndAnnouncement(0); });
    return () => onRegisterReset?.(null);
  }, []); // eslint-disable-line
  const LC_DEFAULTS = {
    zeitlimitSek: 0,
    erklaerungSofort: true,
    geschwindigkeitsBonus: true,
    aufgabenAnzahl: 10,
    themen: ["buchung","ueberweisung","dauerauftrag","beleg","theorie"],
    mitUst: false,
    grundwissen: false,
    mitKontennummern: false,
  };
  const [lehrerConfig, setLehrerConfig] = useState(() => {
    try {
      const s = localStorage.getItem("bw_lehrer_konfig");
      return s ? { ...LC_DEFAULTS, ...JSON.parse(s) } : { ...LC_DEFAULTS };
    } catch { return { ...LC_DEFAULTS }; }
  });
  React.useEffect(() => {
    try { localStorage.setItem("bw_lehrer_konfig", JSON.stringify(lehrerConfig)); } catch {}
  }, [lehrerConfig]);
  const [ereignisse, setEreignisse] = useState([]);
  const [aktuellesIdx, setAktuellesIdx] = useState(0);
  const [konten, setKonten] = useState([]);
  const [punkte, setPunkte] = useState(0);
  const [maxPunkte, setMaxPunkte] = useState(0);
  const [antwort, setAntwort] = useState({ soll: "", haben: "", betrag: "" });
  const [feedback, setFeedback] = useState(null); // null | "richtig" | "falsch"
  const [verlauf, setVerlauf] = useState([]);
  const [rangliste, setRangliste] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [vonURL, setVonURL] = useState(false);
  const [klassenFirmaId, setKlassenFirmaId] = useState(""); // vom Lehrer vorgewählt
  const [klassenKlasse, setKlassenKlasse] = useState("7");  // Klasse vom Lehrer in URL kodiert

  // Timer
  React.useEffect(() => {
    if (phase !== "spiel") return;
    const t = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(t);
  }, [phase, startTime]);

  // URL-Parameter ?session=XYZ&firma=ID → Schüler tritt Session bei
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("session");
    const f = params.get("firma");
    const kl = params.get("klasse");
    if (s) {
      setModus("stunde");
      setKlassenCode(s.toUpperCase());
      setVonURL(true);
      onVonURLDetected?.();
      if (f) setKlassenFirmaId(f);
      if (kl) setKlassenKlasse(kl);
      const url = new URL(window.location.href);
      url.searchParams.delete("session");
      url.searchParams.delete("firma");
      url.searchParams.delete("klasse");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Rangliste live für Lehrer (alle 5s) – läuft in setup UND abschluss
  React.useEffect(() => {
    if (!klassenCode || vonURL) return;
    if (phase !== "setup" && phase !== "abschluss") return;
    const poll = async () => {
      const rl = await apiFetch(`/rangliste/${klassenCode}`);
      setRangliste(rl || []);
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [modus, klassenCode, phase, vonURL]);

  // Kampagne-Ende-Polling (Schüler) – alle 20s
  React.useEffect(() => {
    if (!vonURL || !klassenCode || modus !== "projekt") return;
    if (phase === "setup" || phase === "abschluss") return;
    const poll = async () => {
      const res = await apiFetch(`/session/kontrolle/${klassenCode}`);
      if (res && res.end_in > 0) setEndeAnkuendigung(res);
      else setEndeAnkuendigung(null);
    };
    poll();
    const t = setInterval(poll, 20000);
    return () => clearInterval(t);
  }, [vonURL, klassenCode, modus, phase]);

  // Heartbeat (Schüler) – alle 30s solange Spiel läuft; sendet aktuellen Spielstand
  React.useEffect(() => {
    if (!vonURL || !klassenCode) return;
    if (phase === "setup" || phase === "abschluss") return;
    const beat = () => apiFetch("/session/join", "POST", {
      session_code: klassenCode,
      spieler: spielerName || "Anonym",
      klasse: klassenKlasse,
      punkte: fortschrittRef.current.punkte,
      max_punkte: fortschrittRef.current.maxPunkte,
    });
    beat();
    const t = setInterval(beat, 30000);
    return () => clearInterval(t);
  }, [vonURL, klassenCode, phase, spielerName, klassenKlasse]);

  // Auto-fill: Name + savedStand aus localStorage wenn via URL beigetreten
  React.useEffect(() => {
    if (!vonURL) return;
    try {
      const last = JSON.parse(localStorage.getItem("bw_last_session") || "null");
      if (last?.code === klassenCode && last?.name) {
        setSpielerName(last.name);
        apiFetch(`/session/stand/${klassenCode}/${encodeURIComponent(last.name)}`).then(res => {
          if (res?.found) setSavedStand(res);
        });
      }
    } catch {}
  }, [vonURL]); // eslint-disable-line

  function startSpiel(f) {
    setFirma(f);
    if (schwierigkeit === "7") {
      setPhase("bank7");
      return;
    }
    if (schwierigkeit === "8") {
      setPhase("bank8");
      return;
    }
    if (schwierigkeit === "9") {
      setPhase("bank9");
      return;
    }
    if (schwierigkeit === "10") {
      setPhase("bank10");
      return;
    }
    const ev = simEreignisse(schwierigkeit, f);
    const startK = simStartKonten(schwierigkeit);
    setEreignisse(ev);
    setKonten(startK);
    setMaxPunkte(ev.reduce((s, e) => s + e.punkte, 0));
    setPunkte(0);
    setAktuellesIdx(0);
    setVerlauf([]);
    setFeedback(null);
    setStartTime(Date.now());
    setElapsed(0);
    setPhase("spiel");
  }

  function genCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const c = Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join("");
    setKlassenCode("BW-" + c);
    setVonURL(false);
    setRangliste([]);
  }

  function pruefen() {
    const ev = ereignisse[aktuellesIdx];
    if (!ev) return;
    const k = Number(schwierigkeit);
    const normSoll = antwort.soll.trim().toUpperCase();
    const normHaben = antwort.haben.trim().toUpperCase();
    // Kl7: compare against kuerzel, Kl8+: compare against nr OR kuerzel
    const matchKto = (slot, input) => {
      if (k <= 7) return slot.kuerzel?.toUpperCase() === input;
      return slot.nr === input || slot.kuerzel?.toUpperCase() === input;
    };
    const korrektSoll = ev.soll.some(s => matchKto(s, normSoll));
    const korrektHaben = ev.haben.some(h => matchKto(h, normHaben));
    const korrekt = korrektSoll && korrektHaben;
    const gewPunkte = korrekt ? ev.punkte : 0;
    setPunkte(p => p + gewPunkte);
    setFeedback(korrekt ? "richtig" : "falsch");
    setVerlauf(v => [...v, { ...ev, korrekt, gewPunkte }]);
    // Konten aktualisieren
    if (korrekt) {
      setKonten(prev => {
        const k = prev.map(x => ({...x}));
        const add = (nr, name, seite, betrag) => {
          const found = k.find(x => x.nr === nr);
          if (found) {
            if (found.seite === seite) found.betrag += betrag;
            else found.betrag = Math.max(0, found.betrag - betrag);
          } else {
            k.push({ nr, name, seite, betrag });
          }
        };
        ev.soll.forEach(s => add(s.nr, s.name, "aktiv", s.betrag));
        ev.haben.forEach(h => add(h.nr, h.name, "passiv", h.betrag));
        return k;
      });
    }
  }

  async function weiter() {
    setFeedback(null);
    setAntwort({ soll: "", haben: "", betrag: "" });
    if (aktuellesIdx + 1 >= ereignisse.length) {
      // Abschluss
      if (klassenCode) {
        await apiFetch("/spielrangliste", "POST", { session_code: klassenCode, spieler: spielerName || "Anonym", punkte, max_punkte: maxPunkte, zeit: Math.round(elapsed/1000), klasse: schwierigkeit });
        const rl = await apiFetch(`/rangliste/${klassenCode}`);
        setRangliste(rl || []);
      }
      setPhase("abschluss");
    } else {
      setAktuellesIdx(i => i + 1);
    }
  }

  const fmtTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const aktuellesEreignis = ereignisse[aktuellesIdx];
  const fortschritt = ereignisse.length ? (aktuellesIdx / ereignisse.length * 100) : 0;
  const aktivUmme = konten.filter(k=>k.seite==="aktiv").reduce((s,k)=>s+k.betrag,0);
  const passivSumme = konten.filter(k=>k.seite==="passiv").reduce((s,k)=>s+k.betrag,0);

  // ── Konfiguration (must come before phase checks) ─────────────────────────
  if (showLehrerKonfig) {
    const lc = lehrerConfig;
    const setLC = (k, v) => setLehrerConfig(c => ({...c, [k]: v}));
    const themaToggle = (t) => setLC("themen", lc.themen.includes(t) ? lc.themen.filter(x=>x!==t) : [...lc.themen, t]);
    return (
      <div style={{ maxWidth:520, margin:"0 auto", padding:"24px 16px" }}>
        <button onClick={() => setShowLehrerKonfig(false)} style={{ background:"none", border:"none", color:"rgba(240,236,227,0.45)", cursor:"pointer", fontSize:13, marginBottom:16 }}>← Zurück</button>
        <div style={{ fontSize:22, fontWeight:800, color:"#f0ece3", marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><Settings2 size={20} strokeWidth={1.5} style={{color:"#e8600a"}}/>Konfiguration</div>
        <div style={{ fontSize:13, color:"rgba(240,236,227,0.45)", marginBottom:20 }}>Konfiguriere die Simulation für deinen Unterricht.</div>
        <div style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:12, padding:"16px", marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"rgba(240,236,227,0.5)", marginBottom:10, textTransform:"uppercase", letterSpacing:".07em" }}>Zeitlimit pro Aufgabe</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[[0,"Kein Limit"],[60,"1 Minute"],[90,"90 Sek."],[120,"2 Min."]].map(([sek,label]) => (
              <button key={sek} onClick={() => setLC("zeitlimitSek", sek)}
                style={{ padding:"8px 14px", borderRadius:8, border:`2px solid ${lc.zeitlimitSek===sek?"#e8600a":"rgba(240,236,227,0.15)"}`, background:lc.zeitlimitSek===sek?"rgba(232,96,10,0.12)":"rgba(240,236,227,0.04)", color:lc.zeitlimitSek===sek?"#e8600a":"rgba(240,236,227,0.65)", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:12, padding:"16px", marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"rgba(240,236,227,0.5)", marginBottom:10, textTransform:"uppercase", letterSpacing:".07em" }}>Aufgaben-Typen (Klasse 7)</div>
          {[["buchung","Kontoauszug buchen"],["ueberweisung","Überweisung (interaktiv)"],["dauerauftrag","Dauerauftrag einrichten"],["beleg","Beleg → Überweisung"],["theorie","Theorie & Kalkulation"],["lueckentext","Lückentext"],["zuordnung","Zuordnung"],["multi_mc","Multiple Choice"],["freitext","Freitext (offen)"]].map(([t, label]) => (
            <label key={t} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(240,236,227,0.07)", cursor:"pointer" }}>
              <input type="checkbox" checked={lc.themen.includes(t)} onChange={() => themaToggle(t)} style={{ width:16, height:16, accentColor:"#e8600a", cursor:"pointer" }}/>
              <span style={{ fontSize:13, color:"#f0ece3" }}>{label}</span>
            </label>
          ))}
        </div>
        <div style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:12, padding:"16px", marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"rgba(240,236,227,0.5)", marginBottom:10, textTransform:"uppercase", letterSpacing:".07em" }}>Lehrplan-Optionen</div>
          <label style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(240,236,227,0.07)", cursor:"pointer" }}>
            <input type="checkbox" checked={!!lc.mitUst} onChange={e => setLC("mitUst", e.target.checked)} style={{ width:16, height:16, accentColor:"#e8600a", cursor:"pointer", marginTop:2, flexShrink:0 }}/>
            <div>
              <span style={{ fontSize:13, color:"#f0ece3", fontWeight:600 }}>USt/VorSt berücksichtigen</span>
              <div style={{ fontSize:11, color:"rgba(240,236,227,0.4)", marginTop:2 }}>Schaltet USt-Aufgaben (Brutto-Kalkulation) frei. Lehrplan Klasse 7 – nur aktivieren wenn im Unterricht behandelt.</div>
            </div>
          </label>
          <label style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(240,236,227,0.07)", cursor:"pointer" }}>
            <input type="checkbox" checked={!!lc.grundwissen} onChange={e => setLC("grundwissen", e.target.checked)} style={{ width:16, height:16, accentColor:"#4ade80", cursor:"pointer", marginTop:2, flexShrink:0 }}/>
            <div>
              <span style={{ fontSize:13, color:"#f0ece3", fontWeight:600 }}>Grundwissen aus Vorklassen einblenden</span>
              <div style={{ fontSize:11, color:"rgba(240,236,227,0.4)", marginTop:2 }}>Stellt 2–3 einfache Aufgaben aus der Vorstufe an den Anfang (als grüne „Grundwissen"-Karte). Nur für Klasse 8–10 sinnvoll.</div>
            </div>
          </label>
          <label style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", cursor:"pointer" }}>
            <input type="checkbox" checked={!!lc.mitKontennummern} onChange={e => setLC("mitKontennummern", e.target.checked)} style={{ width:16, height:16, accentColor:"#93c5fd", cursor:"pointer", marginTop:2, flexShrink:0 }}/>
            <div>
              <span style={{ fontSize:13, color:"#f0ece3", fontWeight:600 }}>Kontennummern verwenden</span>
              <div style={{ fontSize:11, color:"rgba(240,236,227,0.4)", marginTop:2 }}>Schüler geben Nr. (6000, 4400 …) statt Kürzel (AWR, VE …) ein. Ab Klasse 8 HJ2 lehrplankonform. Kürzel werden trotzdem akzeptiert.</div>
            </div>
          </label>
        </div>
        <div style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:12, padding:"16px", marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"rgba(240,236,227,0.5)", marginBottom:10, textTransform:"uppercase", letterSpacing:".07em" }}>Optionen</div>
          {[["erklaerungSofort","Erklärung sofort nach Antwort zeigen"],["geschwindigkeitsBonus","Geschwindigkeits-Bonus (+1 Pkt bei schneller Antwort)"]].map(([k, label]) => (
            <label key={k} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(240,236,227,0.07)", cursor:"pointer" }}>
              <input type="checkbox" checked={!!lc[k]} onChange={e => setLC(k, e.target.checked)} style={{ width:16, height:16, accentColor:"#e8600a", cursor:"pointer" }}/>
              <span style={{ fontSize:13, color:"#f0ece3" }}>{label}</span>
            </label>
          ))}
        </div>
        <button onClick={() => setShowLehrerKonfig(false)}
          style={{ width:"100%", padding:"13px", background:"#e8600a", color:"#fff", border:"none", borderRadius:12, fontWeight:800, fontSize:14, cursor:"pointer" }}>
          Einstellungen speichern
        </button>
      </div>
    );
  }

  // ── Dashboard-Overlay (Lehrer, alle Phasen) ────────────────────────────────
  if (dashboardOffen && !vonURL) return (
    <div style={{ position:"relative" }}>
      <LehrerDashboard rangliste={rangliste} klassenCode={klassenCode} phase={phase} onSchliessen={() => setDashboardOffen(false)}/>
    </div>
  );

  // ── Schüler-Gastzugang: Minimaler Willkommensscreen ───────────────────────
  if (phase === "setup" && vonURL) return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#f0ece3", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
        <Factory size={22} strokeWidth={1.5} style={{ color: "#e8600a", flexShrink: 0 }}/>Simulation
      </div>
      <div style={{ fontSize: 13, color: "rgba(240,236,227,0.5)", marginBottom: 24 }}>Du wurdest zu einer Klassen-Session eingeladen.</div>
      <div style={{ background: "rgba(15,52,96,0.2)", border: "1px solid rgba(0,120,212,0.3)", borderRadius: 10, padding: "14px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22, fontFamily: "'Fira Code',monospace", fontWeight: 900, color: "#93c5fd", letterSpacing: ".08em" }}>{klassenCode}</span>
        <span style={{ fontSize: 12, color: "rgba(240,236,227,0.45)" }}>Session beigetreten ✓</span>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(240,236,227,0.5)", marginBottom: 4, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span>Dein Spitzname</span>
          <StreakBadge streak={streakData} />
        </div>
        <input
          value={spielerName}
          onChange={e => setSpielerName(e.target.value)}
          placeholder="z.B. Adler, Turbo7, …"
          autoFocus
          style={{ width: "100%", padding: "12px", border: "1.5px solid rgba(240,236,227,0.2)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "rgba(240,236,227,0.05)", color: "#f0ece3", outline: "none" }}
        />
        <div style={{ fontSize: 11, color: "rgba(240,236,227,0.3)", marginTop: 5 }}>
          Kein echter Name nötig · Nur du und deine Lehrkraft sehen diesen Spitznamen
        </div>
      </div>
      {/* Wiederverbindungs-Code – prominent anzeigen */}
      <div style={{ background:"rgba(0,0,0,0.3)", border:"1px solid rgba(240,236,227,0.13)", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.4)", marginBottom:6, textTransform:"uppercase", letterSpacing:".07em" }}>Merke dir deinen Wiederverbindungs-Code:</div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:5 }}>
          <span style={{ fontFamily:"'Fira Code',monospace", fontWeight:900, fontSize:22, color:"#93c5fd", letterSpacing:".1em" }}>{klassenCode}</span>
          <span style={{ color:"rgba(240,236,227,0.3)", fontSize:16 }}>+</span>
          <span style={{ color:"#e8600a", fontWeight:800, fontSize:16 }}>{spielerName || "dein Name"}</span>
        </div>
        <div style={{ fontSize:10, color:"rgba(240,236,227,0.35)", lineHeight:1.5 }}>
          Damit kannst du dich jederzeit von jedem Gerät wieder einloggen – ohne Registrierung.
        </div>
      </div>
      {savedStand && (
        <div style={{ background:"rgba(74,158,255,0.08)", border:"1px solid rgba(74,158,255,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <Trophy size={16} strokeWidth={1.5} style={{ color:"#93c5fd", flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#93c5fd", marginBottom:2 }}>
              Willkommen zurück, {spielerName}!
            </div>
            <div style={{ fontSize:11, color:"rgba(240,236,227,0.55)" }}>
              Letzter Stand: {savedStand.punkte} / {savedStand.max_punkte} Punkte · Aufgabe {(savedStand.aufgabe_idx || 0) + 1}
            </div>
          </div>
          <button onClick={() => setSavedStand(null)}
            style={{ background:"none", border:"none", color:"rgba(240,236,227,0.3)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
        </div>
      )}
      <button
        onClick={async () => {
          const name = (spielerName.trim() || "Anonym");
          // Persist for auto-fill on same device
          try { localStorage.setItem("bw_last_session", JSON.stringify({ code: klassenCode, name })); } catch {}
          // Register as active in session
          await apiFetch("/session/join", "POST", { session_code: klassenCode, spieler: name, klasse: klassenKlasse });
          const chosen = klassenFirmaId
            ? (UNTERNEHMEN.find(u => u.id === klassenFirmaId) || UNTERNEHMEN[0])
            : UNTERNEHMEN[Math.floor(Math.random() * Math.min(UNTERNEHMEN.length, 12))];
          setFirma(chosen);
          setSpielerName(name);
          setPhase(klassenKlasse === "10" ? "bank10" : klassenKlasse === "9" ? "bank9" : klassenKlasse === "8" ? "bank8" : "bank7");
        }}
        style={{ width: "100%", padding: "14px", background: "#e8600a", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
        Simulation starten →
      </button>
    </div>
  );

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (phase === "setup" || phase === "firma") {
    const lc = lehrerConfig;
    const setLC = (k, v) => setLehrerConfig(c => ({...c, [k]: v}));
    const themaToggle = (t) => setLC("themen", lc.themen.includes(t) ? lc.themen.filter(x=>x!==t) : [...lc.themen, t]);
    const alleThemen = [["buchung","Kontoauszug buchen"],["ueberweisung","Überweisung (interaktiv)"],["dauerauftrag","Dauerauftrag einrichten"],["beleg","Beleg → Überweisung"],["theorie","Theorie & Kalkulation"],["lueckentext","Lückentext"],["zuordnung","Zuordnung"],["multi_mc","Multiple Choice"],["freitext","Freitext (offen)"]];
    const themenAngepasst = JSON.stringify(lc.themen.slice().sort()) !== JSON.stringify(LC_DEFAULTS.themen.slice().sort()) || lc.mitUst || lc.grundwissen || lc.mitKontennummern;
    return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "24px 16px" }}>

      {/* ── Schritt 1: Klassenstufe ── */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#e8600a", letterSpacing:".09em", textTransform:"uppercase", marginBottom:8 }}>1 · Klassenstufe</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {SIM_SCHWIERIGKEITEN.map(s => (
            <button key={s.id} onClick={() => setSchwierigkeit(s.id)}
              style={{ padding:"12px", border:`2px solid ${schwierigkeit===s.id?"#e8600a":"rgba(240,236,227,0.12)"}`, borderRadius:10, background:schwierigkeit===s.id?"rgba(232,96,10,0.1)":"rgba(240,236,227,0.04)", cursor:"pointer", textAlign:"left" }}>
              <div style={{ fontWeight:700, fontSize:13, color:schwierigkeit===s.id?"#e8600a":"#f0ece3" }}>{s.label}</div>
              <div style={{ fontSize:11, color:"rgba(240,236,227,0.4)", marginTop:2 }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Schritt 2: Themen & Grundwissen ── */}
      <div style={{ marginBottom:20 }}>
        <button onClick={() => setThemenOffen(v => !v)}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", background:"rgba(240,236,227,0.04)", border:`1.5px solid ${themenAngepasst?"rgba(232,96,10,0.4)":"rgba(240,236,227,0.12)"}`, borderRadius:10, cursor:"pointer", color:"#f0ece3" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:11, fontWeight:800, color:"#e8600a", letterSpacing:".09em", textTransform:"uppercase" }}>2 · Themen & Inhalte</span>
            {themenAngepasst && <span style={{ fontSize:9, background:"rgba(232,96,10,0.2)", color:"#e8600a", padding:"2px 7px", borderRadius:20, fontWeight:700 }}>Angepasst</span>}
          </div>
          <span style={{ fontSize:13, color:"rgba(240,236,227,0.4)" }}>{themenOffen?"▾":"▸"}</span>
        </button>
        {themenOffen && (
          <div style={{ background:"rgba(240,236,227,0.03)", border:"1px solid rgba(240,236,227,0.09)", borderTop:"none", borderRadius:"0 0 10px 10px", padding:"14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.4)", marginBottom:8, textTransform:"uppercase", letterSpacing:".07em" }}>Aufgaben-Typen</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0, marginBottom:12 }}>
              {alleThemen.map(([t, label]) => (
                <label key={t} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 4px", cursor:"pointer" }}>
                  <input type="checkbox" checked={lc.themen.includes(t)} onChange={() => themaToggle(t)} style={{ width:15, height:15, accentColor:"#e8600a", cursor:"pointer", flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:"#f0ece3" }}>{label}</span>
                </label>
              ))}
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.4)", marginBottom:8, textTransform:"uppercase", letterSpacing:".07em" }}>Lehrplan-Optionen</div>
            <label style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", borderTop:"1px solid rgba(240,236,227,0.07)" }}>
              <input type="checkbox" checked={!!lc.mitUst} onChange={e => setLC("mitUst", e.target.checked)} style={{ width:15, height:15, accentColor:"#e8600a", cursor:"pointer", flexShrink:0 }}/>
              <span style={{ fontSize:12, color:"#f0ece3" }}>USt/VorSt berücksichtigen</span>
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer" }}>
              <input type="checkbox" checked={!!lc.grundwissen} onChange={e => setLC("grundwissen", e.target.checked)} style={{ width:15, height:15, accentColor:"#4ade80", cursor:"pointer", flexShrink:0 }}/>
              <span style={{ fontSize:12, color:"#f0ece3" }}>Grundwissen aus Vorklassen einblenden</span>
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer" }}>
              <input type="checkbox" checked={!!lc.mitKontennummern} onChange={e => setLC("mitKontennummern", e.target.checked)} style={{ width:15, height:15, accentColor:"#93c5fd", cursor:"pointer", flexShrink:0 }}/>
              <span style={{ fontSize:12, color:"#f0ece3" }}>Kontennummern (Kl. 8+)</span>
            </label>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.4)", marginTop:10, marginBottom:6, textTransform:"uppercase", letterSpacing:".07em" }}>Zeitlimit pro Aufgabe</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[[0,"Kein"],[60,"1 Min"],[90,"90 Sek"],[120,"2 Min"]].map(([sek,label]) => (
                <button key={sek} onClick={() => setLC("zeitlimitSek", sek)}
                  style={{ padding:"6px 12px", borderRadius:7, border:`2px solid ${lc.zeitlimitSek===sek?"#e8600a":"rgba(240,236,227,0.15)"}`, background:lc.zeitlimitSek===sek?"rgba(232,96,10,0.12)":"rgba(240,236,227,0.04)", color:lc.zeitlimitSek===sek?"#e8600a":"rgba(240,236,227,0.65)", fontWeight:700, fontSize:11, cursor:"pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Schritt 3: Firma wählen ── */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#e8600a", letterSpacing:".09em", textTransform:"uppercase", marginBottom:8 }}>3 · Firma wählen</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {UNTERNEHMEN.slice(0, 12).map(u => (
            <button key={u.id} onClick={() => setSelectedFirma(u)}
              style={{ padding:"13px 14px", border:`2px solid ${selectedFirma?.id===u.id?"#e8600a":"rgba(240,236,227,0.12)"}`, borderRadius:11, background:selectedFirma?.id===u.id?"rgba(232,96,10,0.1)":"rgba(240,236,227,0.04)", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
              <div style={{ fontWeight:700, fontSize:13, color:selectedFirma?.id===u.id?"#e8600a":"#f0ece3", marginBottom:2 }}>{u.name}</div>
              <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)" }}>{u.branche}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Schritt 4: Modus & Start ── */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#e8600a", letterSpacing:".09em", textTransform:"uppercase", marginBottom:8 }}>4 · Modus &amp; Start</div>

        {/* Modus-Auswahl */}
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {[
            ["stunde",  "Übungsstunde",  "45 / 90 Min · Timer · Live-Rangliste"],
            ["projekt", "Kampagne",      "Kein Zeitlimit · Lehrer steuert Ende"],
          ].map(([id,l,d]) => (
            <button key={id} onClick={() => setModus(id)}
              style={{ flex:1, padding:"12px", border:`2px solid ${modus===id?"#e8600a":"rgba(240,236,227,0.12)"}`, borderRadius:10, background:modus===id?"rgba(232,96,10,0.1)":"rgba(240,236,227,0.04)", cursor:"pointer", textAlign:"left" }}>
              <div style={{ fontWeight:700, fontSize:12, color:modus===id?"#e8600a":"#f0ece3" }}>{l}</div>
              <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)", marginTop:3 }}>{d}</div>
            </button>
          ))}
        </div>

        {/* Übungsstunde: Zeitfenster */}
        {modus === "stunde" && (
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            {[["45","45 Min · Einzelstunde"],["90","90 Min · Doppelstunde"]].map(([min, label]) => (
              <button key={min} onClick={() => setStundenMin(Number(min))}
                style={{ flex:1, padding:"9px 12px", border:`2px solid ${stundenMin===Number(min)?"#e8600a":"rgba(240,236,227,0.12)"}`, borderRadius:8, background:stundenMin===Number(min)?"rgba(232,96,10,0.1)":"rgba(240,236,227,0.04)", cursor:"pointer", textAlign:"left" }}>
                <div style={{ fontWeight:700, fontSize:12, color:stundenMin===Number(min)?"#e8600a":"#f0ece3" }}>{label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Session-Code (für beide Modi) */}
        <div style={{ background:"rgba(240,236,227,0.03)", border:"1px solid rgba(240,236,227,0.09)", borderRadius:10, padding:"12px", marginBottom:10 }}>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.4)", marginBottom:4 }}>Dein Name (LK)</div>
              <input value={spielerName} onChange={e=>setSpielerName(e.target.value)} placeholder="Vorname"
                style={{ width:"100%", padding:"9px 10px", border:"1.5px solid rgba(240,236,227,0.15)", borderRadius:7, fontSize:12, boxSizing:"border-box", background:"rgba(240,236,227,0.05)", color:"#f0ece3", outline:"none" }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.4)", marginBottom:4 }}>Klassen-Code (optional)</div>
              <input value={klassenCode} onChange={e=>{ setKlassenCode(e.target.value.toUpperCase()); setVonURL(false); }} placeholder="leer = wird automatisch generiert"
                style={{ width:"100%", padding:"9px 10px", border:"1.5px solid rgba(240,236,227,0.15)", borderRadius:7, fontSize:12, boxSizing:"border-box", background:"rgba(240,236,227,0.05)", color:"#f0ece3", outline:"none" }} />
            </div>
          </div>
          {klassenCode && (() => {
            const fId = selectedFirma?.id || klassenFirmaId;
            const sessionUrl = `https://buchungswerk.org/?session=${klassenCode}${fId?`&firma=${fId}`:""}&klasse=${schwierigkeit}`;
            return (
              <div style={{ background:"rgba(15,52,96,0.15)", border:"1px solid rgba(0,120,212,0.22)", borderRadius:8, padding:"12px" }}>
                {/* Code + QR */}
                <div style={{ display:"flex", gap:12, marginBottom:10, alignItems:"flex-start" }}>
                  <div style={{ textAlign:"center", minWidth:80 }}>
                    <div style={{ fontSize:28, fontWeight:900, color:"#f0ece3", fontFamily:"'Fira Code',monospace", letterSpacing:".1em" }}>{klassenCode}</div>
                    <div style={{ fontSize:9, color:"rgba(240,236,227,0.3)", marginTop:1 }}>Wiederverbindungs-Code</div>
                  </div>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&color=f0ece3&bgcolor=141008&data=${encodeURIComponent(sessionUrl)}`} alt="QR" width={64} height={64} style={{ borderRadius:6, border:"1px solid rgba(240,236,227,0.1)", flexShrink:0 }}/>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                    <div style={{ fontSize:9, color:"rgba(240,236,227,0.3)", fontFamily:"'Fira Code',monospace", wordBreak:"break-all", lineHeight:1.4 }}>{sessionUrl.replace("https://","")}</div>
                    <button onClick={() => navigator.clipboard?.writeText(sessionUrl)} style={{ padding:"5px 10px", background:"rgba(232,96,10,0.12)", border:"1px solid rgba(232,96,10,0.25)", borderRadius:6, color:"#e8600a", cursor:"pointer", fontSize:10, fontWeight:700 }}>Link kopieren</button>
                  </div>
                </div>
                {/* Schüler-Reconnect-Hinweis */}
                <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)", background:"rgba(240,236,227,0.04)", borderRadius:6, padding:"7px 10px", marginBottom:8, lineHeight:1.5 }}>
                  Schüler verwenden Code <strong style={{ color:"#93c5fd", fontFamily:"monospace" }}>{klassenCode}</strong> + ihren eingegebenen Namen zum Wiederverbinden.
                </div>
                {/* Live Rangliste */}
                {rangliste.length > 0 && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Live-Rangliste</div>
                    {rangliste.slice(0,5).map((r,i) => (
                      <div key={i} style={{ display:"flex", gap:6, fontSize:11, padding:"3px 0", borderBottom:"1px solid rgba(240,236,227,0.05)", color:"#f0ece3" }}>
                        <span style={{ fontWeight:700, minWidth:16, color:"#e8600a" }}>{i+1}.</span>
                        <span style={{ flex:1 }}>{r.spieler}</span>
                        <span style={{ color: r.zeit?"#4ade80":"#e8600a", fontWeight:700 }}>{r.punkte}/{r.max_punkte} P</span>
                        <span style={{ color:"rgba(240,236,227,0.3)", fontFamily:"monospace", fontSize:10 }}>{r.zeit ? fmtTime(r.zeit) : "läuft…"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* LK-Aktionen im QR-Block */}
                <div style={{ display:"flex", gap:7, marginTop:4 }}>
                  <button onClick={() => startSpiel(selectedFirma || UNTERNEHMEN[0])}
                    style={{ flex:2, padding:"10px 12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:8, fontWeight:800, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <Eye size={13} strokeWidth={1.5}/>Vorschau starten
                  </button>
                  <button onClick={() => setDashboardOffen(true)}
                    style={{ flex:1, padding:"10px 10px", background:"rgba(240,236,227,0.07)", color:"rgba(240,236,227,0.75)", border:"1px solid rgba(240,236,227,0.15)", borderRadius:8, fontWeight:700, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                    <Users size={12} strokeWidth={1.5}/>Dashboard
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Kampagne-Steuerung */}
        {modus === "projekt" && klassenCode && !vonURL && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.4)", marginBottom:6, textTransform:"uppercase", letterSpacing:".07em" }}>Kampagne-Steuerung</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[[0,"Ankündigung aufheben"],[1,"Ende in 1 Runde"],[3,"Ende in 3 Runden"],[5,"Ende in 5 Runden"]].map(([n, label]) => (
                <button key={n} onClick={async () => {
                  setEndAnnouncement(n);
                  await apiFetch(`/session/kontrolle/${klassenCode}`, "POST", { end_in: n });
                }}
                  style={{ padding:"7px 11px", borderRadius:7, border:`1.5px solid ${endAnnouncement===n?"#e8600a":"rgba(240,236,227,0.15)"}`, background:endAnnouncement===n?"rgba(232,96,10,0.12)":"rgba(240,236,227,0.04)", color:endAnnouncement===n?"#e8600a":"rgba(240,236,227,0.55)", fontWeight:700, fontSize:11, cursor:"pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start-Button – generiert Code + öffnet QR-Menü */}
        <div style={{ marginTop:4 }}>
          <button
            onClick={() => { if (selectedFirma) genCode(); }}
            disabled={!selectedFirma}
            style={{ width:"100%", padding:"14px", background:selectedFirma?"#e8600a":"rgba(240,236,227,0.08)", color:selectedFirma?"#fff":"rgba(240,236,227,0.3)", border:"none", borderRadius:12, fontWeight:800, fontSize:15, cursor:selectedFirma?"pointer":"not-allowed", transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <QrCode size={18} strokeWidth={1.5}/>
            {selectedFirma ? "Simulation starten →" : "← Zuerst Firma wählen (Schritt 3)"}
          </button>
        </div>
      </div>
    </div>
    );
  }

  // Kampagne-Ende-Banner (Schüler sehen es im Spiel)
  const endeBanner = endeAnkuendigung?.end_in > 0 && vonURL ? (
    <div style={{ background:"rgba(232,96,10,0.13)", border:"1px solid rgba(232,96,10,0.45)", borderRadius:10, padding:"10px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
      <Megaphone size={14} strokeWidth={1.5} style={{ color:"#e8600a", flexShrink:0 }}/>
      <span style={{ fontSize:12, fontWeight:700, color:"#e8600a" }}>
        Deine Lehrkraft hat das Ende angekündigt – noch {endeAnkuendigung.end_in} Runde{endeAnkuendigung.end_in !== 1 ? "n" : ""} verbleibend.
      </span>
    </div>
  ) : null;

  // Hilfsfunktion: Abschluss-POST + Spielstand-Checkpoint
  const KL_LERNBEREICH = { "7": "Buchführung Kl. 7", "8": "Buchführung Kl. 8", "9": "Buchführung Kl. 9", "10": "Buchführung Kl. 10" };

  const mkAbschluss = (kl) => async ({ punkte: p, maxPunkte: mp, verlauf: v, zeit, poolGroesse }) => {
    setPunkte(p); setMaxPunkte(mp); setVerlauf(v); setElapsed(zeit * 1000);
    if (klassenCode) {
      const name = spielerName || "Anonym";
      await apiFetch("/spielrangliste", "POST", { session_code: klassenCode, spieler: name, punkte: p, max_punkte: mp, zeit, klasse: kl });
      await apiFetch(`/session/stand/${klassenCode}/${encodeURIComponent(name)}`, "POST", { punkte: p, max_punkte: mp, aufgabe_idx: 0 });
      const rl = await apiFetch(`/rangliste/${klassenCode}`);
      setRangliste(rl || []);
    }
    // Streak + Level aufzeichnen (nur wenn Name angegeben)
    if (spielerName.trim()) {
      const sd = await recordCompletion(klassenCode || null);
      if (sd) setStreakData(sd);
      // Level: korrekte/gesamt aus verlauf zählen
      if (v && v.length > 0) {
        const lernbereich   = KL_LERNBEREICH[kl] || `Buchführung Kl. ${kl}`;
        const korrektCount  = v.filter(x => x.korrekt).length;
        const gesamtCount   = v.length;
        const gesamtAufgaben = poolGroesse || gesamtCount * 3; // Fallback: 3× Session-Größe
        const ld = await recordLevel(lernbereich, korrektCount, gesamtCount, gesamtAufgaben);
        if (ld) setLevelData({ ...ld, lernbereich });
      }
    }
    setPhase("abschluss");
  };

  const onFortschritt = (p, mp) => { fortschrittRef.current = { punkte: p, maxPunkte: mp }; };

  // ── Banking Simulator Klasse 7 ─────────────────────────────────────────────
  if (phase === "bank7" && firma) return (
    <>{endeBanner}<BankingSimulator7
      firma={firma}
      lehrerConfig={lehrerConfig}
      modus={modus}
      stundenMin={stundenMin}
      onAbschluss={mkAbschluss("7")}
      onFortschritt={onFortschritt}
    /></>
  );

  // ── Banking Simulator Klasse 8 ─────────────────────────────────────────────
  if (phase === "bank8" && firma) return (
    <>{endeBanner}<BankingSimulator7
      klasse="8"
      firma={firma}
      lehrerConfig={lehrerConfig}
      modus={modus}
      stundenMin={stundenMin}
      onAbschluss={mkAbschluss("8")}
      onFortschritt={onFortschritt}
    /></>
  );

  // ── Banking Simulator Klasse 9 – Börsenspiel ───────────────────────────────
  if (phase === "bank9" && firma) return (
    <>{endeBanner}<BankingSimulator7
      klasse="9"
      firma={firma}
      lehrerConfig={lehrerConfig}
      modus={modus}
      stundenMin={stundenMin}
      onAbschluss={mkAbschluss("9")}
      onFortschritt={onFortschritt}
    /></>
  );

  // ── Banking Simulator Klasse 10 – MSA-Vorbereitung ────────────────────────
  if (phase === "bank10" && firma) return (
    <>{endeBanner}<BankingSimulator7
      klasse="10"
      firma={firma}
      lehrerConfig={lehrerConfig}
      modus={modus}
      stundenMin={stundenMin}
      onAbschluss={mkAbschluss("10")}
      onFortschritt={onFortschritt}
    /></>
  );

  // ── Spiel ──────────────────────────────────────────────────────────────────
  if (phase === "spiel" && aktuellesEreignis) return (
    <div style={{ maxWidth:560, margin:"0 auto", padding:"16px" }}>
      {/* Header */}
      <div style={{ background:"#0f172a", borderRadius:14, padding:"14px 18px", marginBottom:14, color:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontWeight:800, fontSize:14, display:"flex", alignItems:"center", gap:5 }}><Factory size={13} strokeWidth={1.5}/>{firma?.name}</div>
          <div style={{ display:"flex", gap:12, fontSize:13 }}>
            <span style={{display:"flex",alignItems:"center",gap:3}}><Timer size={12} strokeWidth={1.5}/>{fmtTime(Math.round(elapsed/1000))}</span>
            <span style={{ color:"#e8600a", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}><Star size={13} strokeWidth={1.5}/>{punkte}/{maxPunkte} P</span>
          </div>
        </div>
        {/* Fortschrittsbalken */}
        <div style={{ height:6, background:"rgba(240,236,227,0.1)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:fortschritt+"%", background:"#e8600a", borderRadius:3, transition:"width 0.4s" }} />
        </div>
        <div style={{ fontSize:11, color:"rgba(240,236,227,0.4)", marginTop:4 }}>Ereignis {aktuellesIdx+1} von {ereignisse.length}</div>
      </div>

      {/* Ereignis-Karte */}
      <div style={{ background:"rgba(28,20,10,0.7)", border:"1px solid rgba(240,236,227,0.12)", borderLeft:"3px solid #e8600a", borderRadius:14, padding:"18px", marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#f0ece3" }}>{aktuellesEreignis.titel}</div>
          <span style={{ background:"rgba(232,96,10,0.15)", color:"#e8600a", fontWeight:700, fontSize:12, padding:"3px 10px", borderRadius:20 }}>{aktuellesEreignis.punkte} P</span>
        </div>
        <div style={{ fontSize:14, color:"rgba(240,236,227,0.75)", lineHeight:1.6, marginBottom:14, padding:"12px", background:"rgba(240,236,227,0.04)", borderRadius:8 }}>
          {aktuellesEreignis.text}
        </div>

        {/* Buchungssatz-Eingabe */}
        {feedback === null ? (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:8 }}>
              Buchungssatz eingeben {Number(schwierigkeit) <= 7 ? "(Kürzel, z.B. AWR)" : "(Kontonummer, z.B. 6000)"}:
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:120 }}>
                <div style={{ fontSize:10, color:"#64748b", marginBottom:3 }}>Soll {Number(schwierigkeit) <= 7 ? "(Kürzel)" : "(Nr.)"}</div>
                <input value={antwort.soll} onChange={e=>setAntwort(a=>({...a,soll:e.target.value}))}
                  placeholder={Number(schwierigkeit) <= 7 ? "z.B. AWR" : "z.B. 6000"} style={{ width:"100%", padding:"10px", border:"2px solid #e2e8f0", borderRadius:8, fontSize:14, boxSizing:"border-box" }} />
              </div>
              <div style={{ fontWeight:800, color:"#94a3b8", paddingTop:18 }}>an</div>
              <div style={{ flex:1, minWidth:120 }}>
                <div style={{ fontSize:10, color:"#64748b", marginBottom:3 }}>Haben {Number(schwierigkeit) <= 7 ? "(Kürzel)" : "(Nr.)"}</div>
                <input value={antwort.haben} onChange={e=>setAntwort(a=>({...a,haben:e.target.value}))}
                  placeholder={Number(schwierigkeit) <= 7 ? "z.B. BK" : "z.B. 2800"} style={{ width:"100%", padding:"10px", border:"2px solid #e2e8f0", borderRadius:8, fontSize:14, boxSizing:"border-box" }} />
              </div>
            </div>
            <button onClick={pruefen} disabled={!antwort.soll || !antwort.haben}
              style={{ marginTop:12, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity:(!antwort.soll||!antwort.haben)?0.5:1 }}>
              ✓ Überprüfen
            </button>
          </div>
        ) : (
          <div>
            <div style={{ padding:"14px", borderRadius:10, background:feedback==="richtig"?"#f0fdf4":"#fef2f2", border:`2px solid ${feedback==="richtig"?"#86efac":"#fca5a5"}`, marginBottom:12 }}>
              <div style={{ fontWeight:800, fontSize:15, color:feedback==="richtig"?"#15803d":"#dc2626", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                {feedback==="richtig" ? <><CheckSquare size={14} strokeWidth={1.5}/>{"Richtig! +" + aktuellesEreignis.punkte + " Punkte"}</> : <><XCircle size={14} strokeWidth={1.5}/>Leider falsch</>}
              </div>
              <div style={{ fontSize:13, color:"#374151" }}>
                <strong>Lösung:</strong>{" "}
                {aktuellesEreignis.soll.map(s => Number(schwierigkeit) <= 7 ? s.kuerzel : `${s.nr} ${s.kuerzel}`).join(" + ")}
                {" an "}
                {aktuellesEreignis.haben.map(h => Number(schwierigkeit) <= 7 ? h.kuerzel : `${h.nr} ${h.kuerzel}`).join(" + ")}
                {" ("}
                {aktuellesEreignis.soll[0]?.betrag?.toLocaleString("de-DE")} €{")"}
              </div>
            </div>
            <button onClick={weiter} style={{ width:"100%", padding:"12px", background:"#0f172a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer" }}>
              {aktuellesIdx+1 >= ereignisse.length ? "Abschluss →" : "Weiter →"}
            </button>
          </div>
        )}
      </div>

      {/* Mini-Bilanz */}
      <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 16px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", display:"flex", alignItems:"center", gap:4 }}><BarChart2 size={11} strokeWidth={1.5}/>Aktuelle Kontenstände</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.55)", marginBottom:4 }}>AKTIVA</div>
            {konten.filter(k=>k.seite==="aktiv").map(k => (
              <div key={k.nr} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"2px 0" }}>
                <span style={{ color:"#374151" }}>{k.name}</span>
                <span style={{ color:"#0f172a", fontWeight:600 }}>{k.betrag.toLocaleString("de-DE")} €</span>
              </div>
            ))}
            <div style={{ borderTop:"1px solid #e2e8f0", marginTop:4, paddingTop:4, display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:700 }}>
              <span>Summe</span><span>{aktivUmme.toLocaleString("de-DE")} €</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#e8600a", marginBottom:4 }}>PASSIVA</div>
            {konten.filter(k=>k.seite==="passiv").map(k => (
              <div key={k.nr} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"2px 0" }}>
                <span style={{ color:"#374151" }}>{k.name}</span>
                <span style={{ color:"#0f172a", fontWeight:600 }}>{k.betrag.toLocaleString("de-DE")} €</span>
              </div>
            ))}
            <div style={{ borderTop:"1px solid #e2e8f0", marginTop:4, paddingTop:4, display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:700 }}>
              <span>Summe</span><span>{passivSumme.toLocaleString("de-DE")} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Abschluss ──────────────────────────────────────────────────────────────
  if (phase === "abschluss") {
    const pct = maxPunkte ? Math.round(punkte/maxPunkte*100) : 0;
    const note = pct >= 92 ? "1" : pct >= 81 ? "2" : pct >= 67 ? "3" : pct >= 50 ? "4" : pct >= 30 ? "5" : "6";
    return (
      <div style={{ maxWidth:540, margin:"0 auto", padding:"24px 16px" }}>
        <div style={{ background:"rgba(28,20,10,0.9)", border:"2px solid #e8600a", borderRadius:16, padding:"28px", marginBottom:20, textAlign:"center", color:"#fff" }}>
          <div style={{ fontSize:48, marginBottom:8, display:"flex", justifyContent:"center" }}>{pct>=80?<Trophy size={48} strokeWidth={1.5} color="#f59e0b"/>:pct>=60?<Award size={48} strokeWidth={1.5} color="#94a3b8"/>:pct>=40?<Award size={48} strokeWidth={1.5} color="#92400e"/>:<BookOpen size={48} strokeWidth={1.5} color="#3b82f6"/>}</div>
          <div style={{ fontSize:24, fontWeight:900, marginBottom:4 }}>{punkte} / {maxPunkte} Punkte</div>
          <div style={{ fontSize:15, color:"#e8600a", marginBottom:8 }}>{pct} % – Tendenz Note {note}</div>
          <div style={{ fontSize:13, color:"rgba(240,236,227,0.5)", display:"flex", alignItems:"center", gap:6, justifyContent:"center" }}><Timer size={13} strokeWidth={1.5}/>{fmtTime(Math.round(elapsed/1000))} | {firma?.name}</div>
        </div>

        {/* Streak-Celebration */}
        {streakData && <div style={{ marginBottom:12 }}><StreakCelebration streak={streakData} /></div>}
        {/* Level-Update */}
        {levelData && <div style={{ marginBottom:16 }}><LevelUpdate {...levelData} /></div>}

        {/* Verlauf */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>Auswertung</div>
          {verlauf.map((v, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:v.korrekt?"#f0fdf4":"#fef2f2", borderRadius:8, marginBottom:4, fontSize:12 }}>
              <span style={{display:"flex"}}>{v.korrekt?<CheckSquare size={13} strokeWidth={1.5} color="#15803d"/>:<XCircle size={13} strokeWidth={1.5} color="#dc2626"/>}</span>
              <span style={{ flex:1, color:"#374151", fontWeight:600 }}>{v.titel}</span>
              <span style={{ color:v.korrekt?"#15803d":"#dc2626", fontWeight:700 }}>{v.gewPunkte}/{v.punkte} P</span>
            </div>
          ))}
        </div>

        {/* Rangliste (Klassenmodus) */}
        {rangliste.length > 0 && (
          <div style={{ background:"#0f172a", borderRadius:12, padding:"16px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#e8600a", marginBottom:10, display:"flex", alignItems:"center", gap:5 }}><Trophy size={13} strokeWidth={1.5}/>Rangliste – {klassenCode}</div>
            {rangliste.slice(0,10).map((r, i) => (
              <div key={i} style={{ display:"flex", gap:10, fontSize:12, padding:"5px 0", borderBottom:"1px solid #1e293b", color:r.spieler===spielerName?"#e8600a":"#e2e8f0" }}>
                <span style={{ fontWeight:700, minWidth:20 }}>{i+1}.</span>
                <span style={{ flex:1 }}>{r.spieler}</span>
                <span style={{ fontWeight:700 }}>{r.punkte}/{r.max_punkte} P</span>
                <span style={{ color:"#64748b" }}>{r.zeit ? fmtTime(r.zeit) : ""}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:10, marginBottom:10 }}>
          <button onClick={() => { setPhase("setup"); }} style={{ flex:1, padding:"12px", background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.7)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Nochmal
          </button>
          {!vonURL && (
            <button onClick={onZurueck} style={{ flex:1, padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              Zurück zum Start
            </button>
          )}
        </div>
        <button onClick={() => {
          const note = maxPunkte ? Math.round(punkte/maxPunkte*100) : 0;
          const notenText = note >= 92?"Note 1":note>=81?"Note 2":note>=67?"Note 3":note>=50?"Note 4":note>=30?"Note 5":"Note 6";
          const badgeBg = note>=80?"#f0fdf4":note>=60?"#fffbeb":"#fef2f2";
          const badgeColor = note>=80?"#15803d":note>=60?"#92400e":"#dc2626";
          const zeileHtml = (v, i) => `<tr style="background:${i%2===0?"#f8fafc":"#fff"}">
            <td style="padding:6px 10px;border:1px solid #e2e8f0">${i+1}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600">${v.titel}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;color:${v.korrekt?"#15803d":"#dc2626"}">${v.korrekt?"Richtig":"Falsch"}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:700">${v.gewPunkte}/${v.punkte}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:11px;color:#64748b">${v.soll.map(s=>s.kuerzel).join("+")} an ${v.haben.map(h=>h.kuerzel).join("+")}</td>
          </tr>`;
          const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/>
            <title>Simulation – ${firma?.name || ""} – Ergebnisse</title>
            <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#0f172a}
            h1{font-size:22px;margin-bottom:4px}
            .badge{display:inline-block;padding:4px 14px;border-radius:20px;font-weight:700;font-size:13px}
            </style></head><body>
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:20px">
              <div>
                <div style="font-size:11px;font-weight:700;color:#e8600a;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">BuchungsWerk – Simulation Klasse ${schwierigkeit}</div>
                <h1>${firma?.name || "Simulation"}</h1>
                <div style="color:#64748b;font-size:13px">Ergebnisauswertung · ${modus === "stunde" ? "Übungsstunde "+stundenMin+" Min" : "Kampagne"}${klassenCode ? " · Session "+klassenCode : ""}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:32px;font-weight:900;color:#0f172a">${punkte} / ${maxPunkte}</div>
                <div class="badge" style="background:${badgeBg};color:${badgeColor}">${note}% – Tendenz ${notenText}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:6px">Zeit: ${fmtTime(Math.round(elapsed/1000))}</div>
              </div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="background:#0f172a;color:#fff">
                <th style="padding:8px 10px;border:1px solid #1e293b;text-align:left">#</th>
                <th style="padding:8px 10px;border:1px solid #1e293b;text-align:left">Aufgabe</th>
                <th style="padding:8px 10px;border:1px solid #1e293b">Ergebnis</th>
                <th style="padding:8px 10px;border:1px solid #1e293b">Punkte</th>
                <th style="padding:8px 10px;border:1px solid #1e293b;text-align:left">Lösung</th>
              </tr></thead>
              <tbody>${verlauf.map(zeileHtml).join("")}</tbody>
            </table>
            <div style="margin-top:20px;font-size:11px;color:#94a3b8;text-align:center">Erstellt mit BuchungsWerk · buchungswerk.org · ${new Date().toLocaleDateString("de-DE")}</div>
          </body></html>`;
          const blob = new Blob([html], { type:"text/html;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `BuchungsWerk_Simulation_${firma?.name?.replace(/\s/g,"_")||"Ergebnisse"}_${new Date().toISOString().slice(0,10)}.html`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }} style={{ width:"100%", padding:"12px", background:"rgba(240,236,227,0.05)", color:"rgba(240,236,227,0.6)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:10, fontWeight:600, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
          <Download size={14} strokeWidth={1.5}/> Ergebnisse exportieren (.html)
        </button>
      </div>
    );
  }

  return null;
}

// ── MasteryModal ──────────────────────────────────────────────────────────────
export default function BuchungsWerk({ gastModus = false }) {
  const [schritt, setSchritt] = useState(() =>
    new URLSearchParams(window.location.search).get("session") ? 4 : 1
  );
  const [config, setConfig] = useState(null);
  const [firma, setFirma] = useState(null);
  const [eigeneBelegeOffen, setEigeneBelegeOffen] = useState(false);
  const [belegEditorOffen, setBelegEditorOffen]   = useState(false);
  const [kontenplanOffen, setKontenplanOffen]     = useState(false);
  const [materialienStartOffen, setMaterialienStartOffen] = useState(false);
  const [apUebungOffen, setApUebungOffen]                 = useState(false);
  const [einstellungenOffen, setEinstellungenOffen] = useState(false);
  const [settings, setSettings] = useState(ladeSettings);
  const [streak, setStreak] = useState(ladeStreak);
  const [masteryOffen, setMasteryOffen] = useState(false);
  const [disclaimerOffen, setDisclaimerOffen] = useState(() => {
    if (gastModus) return false; // Schüler sehen keinen Lehrer-Disclaimer
    try { return !localStorage.getItem("bw_disclaimer_ok"); } catch { return true; }
  });
  const [isVonURL, setIsVonURL] = useState(false);
  const simResetFnRef = useRef(null);
  const [klasseZimmerOffen, setKlasseZimmerOffen] = useState(false);
  const [klasseZimmerAufgaben, setKlasseZimmerAufgaben] = useState([]);
  const aufgabenForQuizRef = useRef([]);
  const reset = () => { setSchritt(1); setConfig(null); setFirma(null); setIsVonURL(false); };

  const materialLaden = ({ config: c, firma: f }) => {
    setConfig(c);
    setFirma(f);
    setSchritt(3);
  };

  const [skipFirma, setSkipFirma] = useState(false);
  const zuThemen = () => { setSkipFirma(true); setSchritt(1); };
  const zuFirma  = () => setSchritt(2);


  return (
    <SettingsContext.Provider value={settings}>
    <div style={S.page}>
      {masteryOffen && <MasteryModal onSchliessen={() => setMasteryOffen(false)} />}
      {klasseZimmerOffen && <TeacherDashboard aufgaben={klasseZimmerAufgaben} user={(() => { try { return JSON.parse(localStorage.getItem("bw_user")); } catch { return null; } })()} onClose={() => setKlasseZimmerOffen(false)} />}
      {disclaimerOffen && <DisclaimerModal onSchliessen={() => { try { localStorage.setItem("bw_disclaimer_ok","1"); } catch {} setDisclaimerOffen(false); }} />}
      {einstellungenOffen && <EinstellungenModal settings={settings} setSettings={setSettings} onSchliessen={() => setEinstellungenOffen(false)} />}
      {belegEditorOffen  && <BelegEditorModal  onSchliessen={() => setBelegEditorOffen(false)} />}
      {eigeneBelegeOffen && <EigeneBelege onSchliessen={() => setEigeneBelegeOffen(false)} />}
      {kontenplanOffen   && <KontenplanModal   onSchliessen={() => setKontenplanOffen(false)} />}
      {materialienStartOffen && <MaterialienModal onSchliessen={() => setMaterialienStartOffen(false)} onLaden={materialLaden} />}
      {apUebungOffen && <APUebungModal onSchliessen={() => setApUebungOffen(false)} />}
      <div style={S.topbar}>
        {/* Logo – links */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={S.logo} onClick={reset}>
            <div>Buchungs<span style={S.logoAccent}>Werk</span></div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 2 }}>BwR Bayern</div>
          </div>
          {!gastModus && !isVonURL && streak.count > 0 && (
            <div title={`${streak.count} Tag${streak.count===1?"":"e"} in Folge aktiv · Rekord: ${streak.longest} Tage`}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", background:"#1e293b",
                border:`1.5px solid ${streak.count>=7?"#e8600a":"#334155"}`, borderRadius:8,
                padding:"3px 8px", cursor:"default", minWidth:38 }}>
              <span style={{ lineHeight:1, color: streak.count>=30?"#f59e0b": streak.count>=14?"#e8600a": streak.count>=7?"#facc15": streak.count>=3?"#a78bfa":"#86efac", display:"flex" }}>
                {streak.count>=30 ? <Trophy size={15} strokeWidth={1.5}/> : streak.count>=14 ? <Flame size={15} strokeWidth={1.5}/> : streak.count>=7 ? <Zap size={15} strokeWidth={1.5}/> : streak.count>=3 ? <Star size={15} strokeWidth={1.5}/> : <Sprout size={15} strokeWidth={1.5}/>}
              </span>
              <span style={{ fontSize:10, fontWeight:800, color: streak.count>=7?"#e8600a":"#94a3b8",
                letterSpacing:".02em", lineHeight:1.3 }}>{streak.count}d</span>
            </div>
          )}
        </div>

        {/* Mitte: Kontext-abhängige Top-Bar */}
        {schritt === 4 && isVonURL ? (
          /* Schüler-Session-Bar */
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Factory size={13} strokeWidth={1.5} style={{ color:"#e8600a" }}/>
            <span style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.45)", letterSpacing:".07em", textTransform:"uppercase" }}>Simulation · Schüler</span>
          </div>
        ) : schritt === 4 ? (
          /* Lehrer Simulation-Bar */
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Factory size={13} strokeWidth={1.5} style={{ color:"#e8600a" }}/>
            <span style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.45)", letterSpacing:".07em", textTransform:"uppercase" }}>Simulation</span>
            <button onClick={() => simResetFnRef.current?.()}
              style={{ marginLeft:6, padding:"5px 11px", background:"rgba(232,96,10,0.1)", border:"1px solid rgba(232,96,10,0.25)", borderRadius:7, color:"#e8600a", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              ← Zur Session
            </button>
            <button onClick={reset}
              style={{ padding:"5px 11px", background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:7, color:"rgba(240,236,227,0.35)", fontSize:11, fontWeight:600, cursor:"pointer" }}>
              Verlassen ✕
            </button>
          </div>
        ) : gastModus ? (
          /* Gast-Bar (normaler Übungsmodus, kein QR-Scan) */
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
            <button onClick={() => setKontenplanOffen(true)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"rgba(232,96,10,0.1)", border:"1px solid rgba(232,96,10,0.25)", borderRadius:8, color:"#e8600a", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              <BookMarked size={14} strokeWidth={1.5}/>Kontenplan
            </button>
          </div>
        ) : (
          /* Lehrer-Stepper (normale Aufgaben-Erstellung) */
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {[["Thema","1"], ["Unternehmen","2"], ["Aufgaben","3"], ["Export","4"]].map(([label, icon], i) => {
                const s = i + 1;
                const done = schritt > s;
                const active = schritt === s;
                return (
                  <React.Fragment key={s}>
                    {i > 0 && (
                      <div style={{ width: 36, height: 2, background: done ? "rgba(240,236,227,0.25)" : "rgba(240,236,227,0.08)", flexShrink: 0 }} />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: done ? 12 : 11, fontWeight: 800,
                        background: done ? "rgba(240,236,227,0.18)" : active ? "linear-gradient(180deg,#f07320,#e8600a)" : "rgba(240,236,227,0.06)",
                        color: done ? "rgba(240,236,227,0.6)" : active ? "#fff" : "rgba(240,236,227,0.3)",
                        border: active ? "1px solid rgba(255,170,60,0.3)" : done ? "none" : "1px solid rgba(240,236,227,0.12)",
                        boxShadow: active ? "0 0 14px rgba(232,96,10,0.5), 0 2px 0 rgba(0,0,0,0.4)" : "none",
                        transition: "all 0.2s"
                      }}>
                        {done ? "✓" : s}
                      </div>
                      <span style={{ fontSize: 8, fontWeight: active ? 700 : 500, color: active ? "#e8600a" : done ? "rgba(240,236,227,0.45)" : "rgba(240,236,227,0.25)", letterSpacing: ".05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={S.container}>
        {!gastModus && <SupportButton />}
        {schritt === 1 && <SchrittTyp onWeiter={cfg => { setConfig(cfg); if (skipFirma) { setSkipFirma(false); setSchritt(3); if (!gastModus) setStreak(aktualisiereStreak()); } else setSchritt(2); }} onBelegEditor={() => setBelegEditorOffen(true)} onEigeneBelege={() => setEigeneBelegeOffen(true)} onSimulation={() => setSchritt(4)} initialConfig={skipFirma ? config : null} />}
        {schritt === 2 && <SchrittFirma config={config} onWeiter={f => { setFirma(f); setSchritt(3); if (!gastModus) setStreak(aktualisiereStreak()); }} onZurueck={() => setSchritt(1)} />}
        {schritt === 3 && <ErrorBoundary><SchrittAufgaben config={config} firma={firma} onNeu={reset} onMaterialLaden={materialLaden} onThemen={zuThemen} onFirma={zuFirma} aufgabenRef={aufgabenForQuizRef} /></ErrorBoundary>}
        {schritt === 4 && <ErrorBoundary><SimulationModus onZurueck={reset} onVonURLDetected={() => setIsVonURL(true)} onRegisterReset={fn => { simResetFnRef.current = fn; }} /></ErrorBoundary>}
      </div>

      {/* Bottom-Bar – nur für eingeloggte Lehrer */}
      {!gastModus && <div style={{ borderTop:"1px solid rgba(240,236,227,0.1)", background:"rgba(14,10,4,0.9)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", padding:"0 8px", height:56, display:"flex", alignItems:"center", justifyContent:"space-around", position:"sticky", bottom:0, zIndex:100, flexShrink:0 }}>
        {[
          { icon: TrendingUp,    label:"Fortschritt",  action: () => setMasteryOffen(true) },
          { icon: BookOpen,      label:"Materialien",  action: () => setMaterialienStartOffen(true) },
          { icon: GraduationCap, label:"AP-Übung",     action: () => setApUebungOffen(true) },
          { icon: ReceiptEuro,   label:"Beleg-Editor", action: () => setBelegEditorOffen(true) },
          { icon: Users,         label:"Klassenzimmer",action: () => { setKlasseZimmerAufgaben(aufgabenForQuizRef.current || []); setKlasseZimmerOffen(true); } },
          { icon: BookMarked,    label:"Kontenplan",   action: () => setKontenplanOffen(true) },
          { icon: Settings,      label:"Einstell.",    action: () => setEinstellungenOffen(true) },
        ].map(({ icon, label, action }) => (
          <button key={label} onClick={action}
            style={{ background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"6px 10px", borderRadius:8, color:"#475569", transition:"color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color="#e8600a"}
            onMouseLeave={e => e.currentTarget.style.color="#475569"}>
            {React.createElement(icon, { size: 20, strokeWidth: 1.5 })}
            <span style={{ fontSize:9, fontWeight:600, letterSpacing:".04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>
          </button>
        ))}
      </div>}
    </div>
    </SettingsContext.Provider>
  );
}
