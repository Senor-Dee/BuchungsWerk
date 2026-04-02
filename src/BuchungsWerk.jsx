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
import BankingSimulator7 from "./components/simulation/BankingSimulator7.jsx";



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
