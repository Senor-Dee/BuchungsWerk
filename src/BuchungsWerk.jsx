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

const ICON_MAP = {
  Hash, BarChart2, BookOpen, Settings, Package, Megaphone, Tag, Users,
  Landmark, Briefcase, Factory, Building2, TrendingUp, AlertTriangle,
  Calendar, TrendingDown, Calculator, ClipboardList, Lock, Library,
  Layers, Wrench, Component, Fuel,
  Sun, Trees, Scissors, Dumbbell,
  FileText, PenLine, Download, Upload, Zap,
};
function IconFor({ name, size = 14, ...props }) {
  const C = ICON_MAP[name];
  return C ? <C size={size} strokeWidth={1.5} {...props} /> : null;
}
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
function DraggableHaken({ label = "✓" }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const start = useRef(null);
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);

  // Long-Press-Start (Touch)
  const startLongPress = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setDeleted(true);
    }, 600);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const onPointerDown = (e) => {
    if (e.button === 2) return; // Rechtsklick über onContextMenu
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
    if (e.pointerType === "touch") startLongPress();
  };

  const onPointerMove = (e) => {
    if (!dragging || !start.current) return;
    const nx = start.current.ox + (e.clientX - start.current.mx);
    const ny = start.current.oy + (e.clientY - start.current.my);
    // Bewegung > 5px → kein Long-Press-Löschen
    if (Math.abs(e.clientX - start.current.mx) > 5 || Math.abs(e.clientY - start.current.my) > 5) cancelLongPress();
    setOffset({ x: nx, y: ny });
    if (Math.abs(nx) > 3 || Math.abs(ny) > 3) setMoved(true);
  };

  const onPointerUp = (e) => {
    setDragging(false);
    if (e.pointerType === "touch") cancelLongPress();
  };

  // Rechtsklick = löschen (Desktop)
  const onContextMenu = (e) => { e.preventDefault(); setDeleted(true); };

  // Doppelklick = zurücksetzen
  const onDoubleClick = () => { setOffset({ x: 0, y: 0 }); setMoved(false); };

  if (deleted) return (
    <span
      onClick={() => { setDeleted(false); setOffset({ x:0, y:0 }); setMoved(false); }}
      title="Haken wiederherstellen"
      style={{
        display: "inline-block", cursor: "pointer",
        fontFamily: "sans-serif", fontSize: 12, fontWeight: 800,
        color: "rgba(240,236,227,0.4)", background: "rgba(240,236,227,0.06)",
        border: "1.5px dashed rgba(240,236,227,0.2)", borderRadius: 3,
        padding: "0 4px", margin: "0 4px", lineHeight: 1,
        flexShrink: 0, userSelect: "none",
      }}>+</span>
  );

  return (
    <span
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      title={moved ? "Doppelklick → zurücksetzen | Rechtsklick → löschen" : "Ziehen → verschieben | Rechtsklick / Lang-Tippen → löschen"}
      style={{
        display: "inline-block",
        position: "relative",
        left: offset.x,
        top: offset.y,
        zIndex: dragging ? 200 : 1,
        cursor: dragging ? "grabbing" : "grab",
        fontFamily: "sans-serif",
        fontSize: 13,
        fontWeight: 800,
        color: "#4ade80",
        background: moved ? "rgba(74,222,128,0.15)" : "rgba(34,197,94,0.08)",
        border: `1.5px solid ${moved ? "#4ade80" : "rgba(74,222,128,0.3)"}`,
        borderRadius: 3,
        padding: "0 4px",
        margin: "0 4px",
        lineHeight: 1,
        flexShrink: 0,
        userSelect: "none",
        touchAction: "none",
        boxShadow: dragging ? "0 4px 12px rgba(0,0,0,.18)" : moved ? "0 1px 4px rgba(0,0,0,.10)" : "none",
        transition: dragging ? "none" : "box-shadow .15s",
      }}
    >{label}</span>
  );
}

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

// ══════════════════════════════════════════════════════════════════════════════
// SCHRITT 1 — Konfiguration
// ══════════════════════════════════════════════════════════════════════════════
function SchrittTyp({ onWeiter, onBelegEditor, onEigeneBelege, onSimulation, initialConfig }) {
  // Wenn initialConfig gesetzt → Vorauswahl aus bestehendem config
  const ic = initialConfig;
  const [typ, setTyp] = useState(ic?.typ ?? null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredTool, setHoveredTool] = useState(null);
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
      <div style={{ background: "linear-gradient(160deg,#1a1208 0%,#251a0a 100%)", padding: "32px 20px 36px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#e8600a", marginBottom: "6px" }}>BwR Bayern</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: "24px" }}>Was möchtest du erstellen?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        {[
          ["Übung", PenLine, "Aufgaben üben", () => { setTyp("Übung"); setPruefungsart(null); }],
          ["Prüfung", ClipboardList, "Schulaufgabe erstellen", () => setTyp("Prüfung")],
          ["Simulation", Factory, "Firma führen", () => { setTyp("Simulation"); onSimulation && onSimulation(); }],
        ].map(([t, icon, desc, onClick]) => {
          const sel = typ === t;
          const hov = hoveredCard === t && !sel;
          return (
            <button key={t} onClick={onClick}
              onMouseEnter={() => setHoveredCard(t)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ flex: 1, padding: "20px 16px", cursor: "pointer", textAlign: "center",
                borderRadius: "16px", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                border: `2.5px solid ${sel ? "#e8600a" : hov ? "rgba(240,236,227,0.32)" : "rgba(240,236,227,0.15)"}`,
                background: sel ? "linear-gradient(135deg,rgba(20,16,8,0.9),rgba(40,28,12,0.95))"
                  : hov ? "rgba(40,30,15,0.8)" : "rgba(30,22,10,0.6)",
                color: sel || hov ? "#f0ece3" : "rgba(240,236,227,0.7)",
                boxShadow: sel ? "0 4px 24px rgba(232,96,10,0.35)" : hov ? "0 2px 12px rgba(0,0,0,0.3)" : "none",
                transform: hov ? "translateY(-1px)" : "none",
                transition: "all 0.18s" }}>
              <div style={{ marginBottom: "10px", display:"flex", justifyContent:"center", color:"rgba(240,236,227,0.75)" }}>{React.createElement(icon, { size: 36, strokeWidth: 1.5 })}</div>
              <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "3px" }}>{t}</div>
              <div style={{ fontSize: "11px", opacity: 0.7 }}>{desc}</div>
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

      {/* Beleg-Werkzeuge */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {[
          { key: "editor",  Icon: ReceiptEuro, label: "Beleg-Editor",  sub: "Beleg erstellen",   onClick: onBelegEditor   },
          { key: "eigene",  Icon: FolderOpen,  label: "Eigene Belege", sub: "Aufgabe aus Beleg", onClick: onEigeneBelege  },
        ].map(({ key, Icon, label, sub, onClick }) => {
          const hov = hoveredTool === key;
          return (
            <button key={key} onClick={onClick}
              onMouseEnter={() => setHoveredTool(key)}
              onMouseLeave={() => setHoveredTool(null)}
              style={{ flex: 1, padding: "14px 16px", borderRadius: "14px",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                border: `2px solid ${hov ? "rgba(240,236,227,0.32)" : "rgba(240,236,227,0.15)"}`,
                background: hov ? "rgba(40,30,15,0.8)" : "rgba(30,22,10,0.6)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
                color: "#f0ece3", fontWeight: 700, fontSize: "14px", minHeight: "56px",
                boxShadow: hov ? "0 2px 12px rgba(0,0,0,0.3)" : "none",
                transform: hov ? "translateY(-1px)" : "none",
                transition: "all 0.18s" }}>
              <Icon size={22} strokeWidth={1.5} style={{ color: hov ? "#f0ece3" : "rgba(240,236,227,0.6)", flexShrink: 0 }} />
              <div style={{ textAlign: "left" }}>
                <div style={S.bold}>{label}</div>
                <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.45)", fontWeight: 500 }}>{sub}</div>
              </div>
            </button>
          );
        })}
      </div>

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
        }} disabled={!canProceed} style={{ ...S.btnPrimary, width: "100%", padding: "16px", fontSize: "16px", borderRadius: "14px",
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

function SchrittFirma({ config, onWeiter, onZurueck }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ background: "transparent", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ background: "linear-gradient(160deg,#1a1208,#251a0a)", padding: "28px 20px 36px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#e8600a", marginBottom: "6px" }}>Schritt 2 von 3</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>Modellunternehmen wählen</div>
          <p style={{ color: "#94a3b8", marginTop: "6px", marginBottom: 0, fontSize: "14px" }}>
            {config.typ}{config.pruefungsart ? ` · ${config.pruefungsart}` : ""} · Klasse {config.klasse} · {Object.values(config.selectedThemen).reduce((s, ids) => s + ids.length, 0)} Themen{config.anzahl ? ` · ${config.anzahl} Aufgaben` : ` · Ziel: ${config.maxPunkte} P`}
          </p>
        </div>
      </div>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {UNTERNEHMEN.map(u => (
            <button key={u.id} onClick={() => setSelected(u.id)} style={{ padding: 0, border: "2px solid", cursor: "pointer", textAlign: "left", overflow: "hidden", borderRadius: "12px", borderColor: selected === u.id ? u.farbe : "rgba(240,236,227,0.15)", background: selected === u.id ? u.farbe + "22" : "rgba(30,22,10,0.6)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
              <div style={{ background: u.farbe, padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.9)", display:"flex" }}><IconFor name={u.icon} size={20} /></span>
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#fff" }}>{u.name}</span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: "13px", color: "#f0ece3", fontWeight: 600 }}>{u.ort} · {u.rechtsform}</div>
                <div style={{ fontSize: "12px", color: "rgba(240,236,227,0.5)" }}>{u.branche}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onZurueck} style={S.btnSecondary}>← Zurück</button>
          <button onClick={() => selected && onWeiter(UNTERNEHMEN.find(u => u.id === selected))} disabled={!selected}
            style={{ ...S.btnPrimary, flex: 1, opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "not-allowed",
              boxShadow: selected ? "0 4px 16px rgba(15,23,42,0.3)" : "none" }}>
            Aufgaben generieren →
          </button>
        </div>
      </div>
    </div>
  );
}



// ── MaterialienModal ───────────────────────────────────────────────────────────
function MaterialienModal({ onSchliessen, onLaden }) {
  const [materialien, setMaterialien] = useState([]);
  const [stufe, setStufe] = useState(null);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");

  const ladeAlles = async (s) => {
    setLaden(true); setFehler("");
    const url = "/materialien" + (s ? `?stufe=${s}` : "");
    const res = await apiFetch(url);
    if (res) setMaterialien(res);
    else setFehler("Backend nicht erreichbar.");
    setLaden(false);
  };

  React.useEffect(() => { ladeAlles(stufe); }, [stufe]);

  const loeschen = async (id, titel) => {
    if (!confirm(`"${titel}" löschen?`)) return;
    await apiFetch(`/materialien/${id}`, "DELETE");
    ladeAlles(stufe);
  };

  const material_laden = async (id) => {
    const m = await apiFetch(`/materialien/${id}`);
    if (!m?.daten_json) return;
    try {
      const daten = JSON.parse(m.daten_json);
      onLaden(daten);
      onSchliessen();
    } catch { alert("Fehler beim Laden."); }
  };

  const gruppiertNachStufe = [7,8,9,10].map(s => ({
    stufe: s,
    items: materialien.filter(m => m.jahrgangsstufe === s)
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#0f172a", borderRadius:"16px", width:"100%", maxWidth:"560px", maxHeight:"85vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #1e293b", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#64748b", marginBottom:"3px" }}>Materialien</div>
            <div style={{ fontSize:"18px", fontWeight:900, color:"#fff" }}>📚 Gespeicherte Übungen</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", width:"34px", height:"34px", cursor:"pointer", fontSize:"18px" }}>×</button>
        </div>

        {/* Filter */}
        <div style={{ padding:"12px 22px", borderBottom:"1px solid #1e293b", display:"flex", gap:"6px", flexShrink:0 }}>
          {[null,7,8,9,10].map(s => (
            <button key={s??'alle'} onClick={() => setStufe(s)}
              style={{ padding:"5px 12px", borderRadius:"7px", border:"none", cursor:"pointer", fontSize:"12px", fontWeight:stufe===s?700:500,
                background: stufe===s ? "#e8600a" : "#1e293b", color: stufe===s ? "#0f172a" : "#94a3b8" }}>
              {s ? `Klasse ${s}` : "Alle"}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div style={{ overflowY:"auto", padding:"16px 22px", flex:1 }}>
          {laden && <div style={{ color:"#64748b", textAlign:"center", padding:"20px" }}>⏳ Laden…</div>}
          {fehler && <div style={{ color:"#f87171", textAlign:"center", padding:"20px" }}>{fehler}</div>}
          {!laden && !fehler && materialien.length === 0 && (
            <div style={{ color:"#475569", textAlign:"center", padding:"28px", fontSize:"13px" }}>
              Noch keine Materialien gespeichert.<br/>
              <span style={{ fontSize:"11px" }}>Erstelle eine Übung und klicke auf "💾 Speichern".</span>
            </div>
          )}
          {gruppiertNachStufe.map(({ stufe: s, items }) => (
            <div key={s} style={{ marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"8px" }}>
                Klasse {s}
              </div>
              {items.map(m => (
                <div key={m.id} style={{ background:"#1e293b", borderRadius:"10px", padding:"12px 14px", marginBottom:"7px", display:"flex", alignItems:"center", gap:"10px" }}>
                  <div style={{ fontSize:"20px", flexShrink:0, display:"flex", alignItems:"center" }}>
                    {m.firma_icon
                      ? <IconFor name={m.firma_icon} size={20} color="#94a3b8" />
                      : "📋"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:700, color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.titel}</div>
                    <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>
                      {m.typ}{m.pruefungsart ? ` · ${m.pruefungsart}` : ""} · {m.firma_name || ""} · {m.gesamt_punkte} P
                    </div>
                    <div style={{ fontSize:"10px", color:"#475569", marginTop:"1px" }}>
                      {new Date(m.erstellt).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                    <button onClick={() => material_laden(m.id)}
                      style={{ padding:"6px 12px", borderRadius:"7px", border:"none", background:"#e8600a", color:"#0f172a", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
                      Laden
                    </button>
                    <button onClick={() => loeschen(m.id, m.titel)}
                      style={{ padding:"6px 10px", borderRadius:"7px", border:"1px solid #334155", background:"transparent", color:"#94a3b8", fontSize:"12px", cursor:"pointer" }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── KopfzeilenEditor ──────────────────────────────────────────────────────────
const DEFAULT_KOPFZEILE = {
  schulName: "", // wird aus settings.stammschule vorausgefüllt
  klasse: "",
  pruefungsart: "Schulaufgabe",
  datum: new Date().toISOString().split("T")[0],
  zeigeNote: true,
  zeigePunkte: true,
  zeigeUnterschrift: true,
};

function KopfzeilenEditor({ config, firma, kopfzeile, setKopfzeile }) {
  const settings = useSettings();
  // Auto-fill Stammschule from settings if kopfzeile.schulName is empty
  React.useEffect(() => {
    if (!kopfzeile.schulName && settings.stammschule) {
      setKopfzeile(p => ({ ...p, schulName: settings.stammschule }));
    }
  }, [settings.stammschule]);
  const k = kopfzeile;
  const inp = (label, field, type="text", placeholder="") => (
    <div style={{ display:"flex", flexDirection:"column", gap:3, flex:1 }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em" }}>{label}</label>
      <input type={type} value={k[field]} placeholder={placeholder}
        onChange={e => setKopfzeile(p => ({ ...p, [field]: e.target.value }))}
        style={{ ...S.input, fontSize:13, padding:"7px 10px" }} />
    </div>
  );
  const chk = (label, field) => (
    <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#374151", cursor:"pointer" }}>
      <input type="checkbox" checked={k[field]} onChange={e => setKopfzeile(p => ({ ...p, [field]: e.target.checked }))}
        style={{ width:14, height:14 }} />
      {label}
    </label>
  );

  // Vorschau der Kopfzeile
  const year = new Date(k.datum + "T00:00:00").getFullYear();
  const datumStr = k.datum ? new Date(k.datum + "T00:00:00").toLocaleDateString("de-DE", {day:"2-digit",month:"2-digit",year:"numeric"}) : "";

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>
        Kopfzeile der Prüfung
      </div>

      {/* Eingabefelder */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
        <div style={{ display:"flex", gap:10 }}>
          {inp("Schule", "schulName", "text", "z. B. Städtische Realschule München")}
          {inp("Klasse", "klasse", "text", `z. B. ${config.klasse}a`)}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {inp("Prüfungsart", "pruefungsart", "text", "z. B. Schulaufgabe Nr. 2")}
          {inp("Datum", "datum", "date")}
        </div>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", padding:"8px 0" }}>
          {chk("Notenfeld anzeigen", "zeigeNote")}
          {chk("Punkte-Feld anzeigen", "zeigePunkte")}
          {chk("Unterschrift EB", "zeigeUnterschrift")}
        </div>
      </div>

      {/* Vorschau */}
      <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>
        Vorschau
      </div>
      <div style={{ border:"1px solid #cbd5e1", borderRadius:8, overflow:"hidden", fontFamily:"Arial,sans-serif", fontSize:11 }}>
        {/* Obere Linie: Schule + Fach */}
        <div style={{ background:"#f1f5f9", padding:"6px 12px", display:"flex", justifyContent:"space-between", borderBottom:"1px solid #e2e8f0" }}>
          <span style={{ fontWeight:700 }}>{k.schulName || "Schule"}</span>
          <span style={{ color:"#475569" }}>Betriebswirtschaftslehre/Rechnungswesen</span>
        </div>
        {/* Hauptkopf */}
        <div style={{ padding:"10px 12px", display:"flex", gap:12, flexWrap:"wrap", borderBottom:"2px solid #0f172a" }}>
          <div style={{ flex:2 }}>
            <div style={{ fontSize:14, fontWeight:800, marginBottom:2 }}>{k.pruefungsart || "Prüfungsart"}</div>
            <div style={{ fontSize:11, color:"#475569" }}>
              Klasse: <strong>{k.klasse || config.klasse}</strong>
              {datumStr && <span style={{ marginLeft:14 }}>Datum: <strong>{datumStr}</strong></span>}
            </div>
            <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>
              {firma.name} · {gesamtPunkteStr(config)} Punkte
            </div>
          </div>
          {k.zeigePunkte && (
            <div style={{ border:"1px solid #cbd5e1", borderRadius:6, padding:"4px 10px", textAlign:"center", minWidth:90 }}>
              <div style={{ fontSize:9, color:"#64748b" }}>Erreichte Punkte</div>
              <div style={{ borderTop:"1px solid #cbd5e1", marginTop:2, paddingTop:2, fontSize:11, color:"#94a3b8" }}>____ / ? P</div>
            </div>
          )}
          {k.zeigeNote && (
            <div style={{ border:"2px solid #0f172a", borderRadius:6, padding:"4px 10px", textAlign:"center", minWidth:70 }}>
              <div style={{ fontSize:9, color:"#64748b" }}>Note</div>
              <div style={{ fontSize:20, fontWeight:900, color:"#0f172a", lineHeight:1.2 }}>&nbsp;</div>
            </div>
          )}
        </div>
        {/* Name + Unterschrift */}
        <div style={{ padding:"8px 12px", display:"flex", gap:14, fontSize:11 }}>
          <div style={{ flex:2 }}>
            Name: <span style={{ display:"inline-block", borderBottom:"1px solid #0f172a", minWidth:160 }}>&nbsp;</span>
          </div>
          {k.zeigeUnterschrift && (
            <div style={{ flex:1 }}>
              Unterschrift EB: <span style={{ display:"inline-block", borderBottom:"1px solid #0f172a", minWidth:110 }}>&nbsp;</span>
            </div>
          )}
        </div>
      </div>
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
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// BELEG-EDITOR MODAL (eingebettet aus BelegEditor.jsx)
// ══════════════════════════════════════════════════════════════════════════════

const be_fmt = n => (isNaN(n) ? "0,00" : Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const be_uid = () => Math.random().toString(36).slice(2, 8);

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
  .be-body { display: grid; grid-template-columns: 360px 1fr; gap: 16px; padding: 16px 20px; flex: 1; overflow: hidden; align-items: start; }
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
    setBeKiLaden(true); setBeKiErgebnis(null); setBeKiError(false);
    const beData = { eingangsrechnung:dataER, ausgangsrechnung:dataAR, kontoauszug:dataKA, ueberweisung:dataUB, email:dataEM, quittung:dataQU }[typ];
    const belegText = belegZuText({ typ, data: beData });
    const prompt = `Du bist BwR-Fachlehrer an einer bayerischen Realschule (Klasse ${beKiKlasse}, ISB LehrplanPLUS Bayern).
Erstelle auf Basis des folgenden Belegs eine korrekte Buchungsaufgabe mit Lösung.

BELEG: ${belegText}

Antworte NUR mit JSON (kein Markdown):
{
  "aufgabe": "Aufgabentext für Schüler (1–2 Sätze, du-Form wenn Klasse ≤9)",
  "buchungssatz": [
    { "gruppe": 1, "soll_nr": "XXXX", "soll_name": "Kontoname (KÜRZEL)", "haben_nr": "XXXX", "haben_name": "Kontoname (KÜRZEL)", "betrag": 0.00, "punkte": 1, "erklaerung": "kurze Begründung" }
  ],
  "nebenrechnung": "Rechenweg falls nötig, sonst leer",
  "nebenrechnung_punkte": 0,
  "punkte_gesamt": 1,
  "erklaerung": "Didaktischer Hinweis für den Lehrer"
}`;
    try {
      const json = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: 800 });
      if (!json) throw new Error("Keine Antwort");
      const text = json.content?.find(c => c.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setBeKiErgebnis(parsed);
    } catch { setBeKiError(true); }
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
          <div className="be-panel" style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div className="be-panel-head">👁 Live-Vorschau · {typLabel}</div>
            <div className="be-preview-wrap" ref={previewRef} style={{ flex:1, overflowY:"auto" }}>
              {typ === "eingangsrechnung" && <BeVorschauRechnung data={dataER} typ="eingangsrechnung" />}
              {typ === "ausgangsrechnung" && <BeVorschauRechnung data={dataAR} typ="ausgangsrechnung" />}
              {typ === "kontoauszug"      && <BeVorschauKontoauszug data={dataKA} />}
              {typ === "ueberweisung"     && <BeVorschauUeberweisung data={dataUB} />}
              {typ === "email"            && <BeVorschauEmail data={dataEM} />}
              {typ === "quittung"         && <BeVorschauQuittung data={dataQU} />}
            </div>
            {/* ── KI-Aufgabe ── */}
            <div style={{ padding:"12px 16px", borderTop:"1px solid #e2e8f0", background:"#f8fafc", flexShrink:0 }}>
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
              {beKiError && <div style={{ fontSize:12, color:"#dc2626", padding:"6px 10px", background:"#fee2e2", borderRadius:6 }}>⚠ Fehler – bitte nochmal versuchen.</div>}
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
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EIGENE BELEGE – Aufgabenpool aus BelegEditor
// ══════════════════════════════════════════════════════════════════════════════

const BELEGTYP_LABELS = {
  eingangsrechnung: "Eingangsrechnung",
  ausgangsrechnung: "Ausgangsrechnung",
  kontoauszug:      "Kontoauszug",
  ueberweisung:     "Überweisung",
  email:            "E-Mail",
  quittung:         "Quittung",
};

function belegZuText(b) {
  const d = b.data;
  switch (b.typ) {
    case "eingangsrechnung": {
      const pos = (d.positionen || []).map(p => `${p.menge} ${p.einheit} ${p.artikel} à ${p.ep} € netto`).join(", ");
      const rabatt = d.rabattAktiv ? ` Sofortrabatt: ${d.rabattArt} ${d.rabattPct} %.` : "";
      const bezug  = parseFloat(d.bezugskosten) > 0 ? ` Bezugskosten: ${d.bezugskosten} €.` : "";
      const skonto = parseFloat(d.skontoPct) > 0 ? ` Skonto: ${d.skontoPct} % bei Zahlung in ${d.skontoTage} Tagen.` : "";
      return `Eingangsrechnung von ${d.lieferantName} an ${d.empfaengerName}. Positionen: ${pos}.${rabatt}${bezug} USt: ${d.ustSatz} %. Zahlungsziel: ${d.zahlungsziel} Tage.${skonto} Rechnungs-Nr.: ${d.rechnungsNr}.`;
    }
    case "ausgangsrechnung": {
      const pos = (d.positionen || []).map(p => `${p.menge} ${p.einheit} ${p.artikel} à ${p.ep} € netto`).join(", ");
      const rabatt = d.rabattAktiv ? ` Sofortrabatt: ${d.rabattArt} ${d.rabattPct} %.` : "";
      const skonto = parseFloat(d.skontoPct) > 0 ? ` Skonto: ${d.skontoPct} % bei Zahlung in ${d.skontoTage} Tagen.` : "";
      return `Ausgangsrechnung von ${d.absenderName} an ${d.kundeName}. Positionen: ${pos}.${rabatt} USt: ${d.ustSatz} %. Zahlungsziel: ${d.zahlungsziel} Tage.${skonto}`;
    }
    case "kontoauszug": {
      const hl = (d.buchungen || []).find(x => x.highlight);
      return `Kontoauszug der ${d.bank}, Inhaber: ${d.inhaber}. Zu buchende Zeile: "${hl?.text || "(keine markiert)"}", Betrag: ${hl?.betrag || "?"} €.`;
    }
    case "ueberweisung":
      return `Überweisung von ${d.auftraggeberName} an ${d.empfaengerName}, Betrag: ${d.betrag} €, Verwendung: ${d.verwendung}.${parseFloat(d.skontoBetrag) > 0 ? ` Skonto-Abzug: ${d.skontoBetrag} €.` : ""}`;
    case "email":
      return `E-Mail von ${d.von} an ${d.an}, Betreff: "${d.betreff}". Inhalt: ${d.text?.slice(0, 200)}`;
    case "quittung":
      return `Quittung Nr. ${d.quittungsNr}. Aussteller: ${d.aussteller}. Zahlender: ${d.empfaenger}. Betrag: ${d.betrag} €. Zweck: ${d.zweck}.`;
    default: return JSON.stringify(b.data).slice(0, 300);
  }
}

function EigeneBelege({ onSchliessen }) {
  const [belege, setBelege] = useState(() => {
    try { return JSON.parse(localStorage.getItem("buchungswerk_belege") || "[]"); }
    catch { return []; }
  });
  const [selected, setSelected]         = useState(null);
  const [genStatus, setGenStatus]       = useState(null);
  // FIX 2: Historie statt einzelnem Result – Folgeaufgaben werden ANGEHÄNGT
  const [historie, setHistorie]         = useState([]);
  const [klasse, setKlasse]             = useState("9");
  const [kopiert, setKopiert]           = useState(null);
  const [vorschlaege, setVorschlaege]   = useState(null);
  const [vorschlaegeStatus, setVorschlaegeStatus] = useState(null);

  const loeschen = (id) => {
    const neu = belege.filter(b => b.id !== id);
    localStorage.setItem("buchungswerk_belege", JSON.stringify(neu));
    setBelege(neu);
    if (selected?.id === id) { setSelected(null); setHistorie([]); setVorschlaege(null); }
  };

  // FIX 2+3: Anhängen + ISB-Punkte im Prompt
  const generieren = async (varianteHinweis = null, varianteTitel = null) => {
    if (!selected) return;
    setGenStatus("loading");
    setVorschlaege(null);
    setVorschlaegeStatus(null);
    const belegText = belegZuText(selected);
    const varianteZusatz = varianteHinweis ? `\n\nVariante / Fokus: ${varianteHinweis}` : "";
    const prompt = `Du bist BwR-Fachlehrer an einer bayerischen Realschule (Klasse ${klasse}, ISB LehrplanPLUS Bayern).
Erstelle auf Basis des folgenden Belegs eine korrekte Buchungsaufgabe.

BELEG: ${belegText}${varianteZusatz}

══════════════════════════════════════════════
ISB-KONTENPLAN BAYERN – NUR DIESE KONTEN VERWENDEN!
══════════════════════════════════════════════
AKTIVKONTEN:
0500 GR     | Grundstücke
0700 MA     | Maschinen und Anlagen
0840 FP     | Fuhrpark
0860 BM     | Büromaschinen
0870 BGA    | Büromöbel und Geschäftsausstattung
0890 GWG    | Geringwertige Wirtschaftsgüter
2000 R      | Rohstoffe
2010 F      | Fremdbauteile
2020 H      | Hilfsstoffe
2030 B      | Betriebsstoffe
2400 FO     | Forderungen aus Lieferungen und Leistungen
2470 ZWFO   | Zweifelhafte Forderungen
2600 VORST  | Vorsteuer
2800 BK     | Bank (Kontokorrentkonto)
2880 KA     | Kasse
2900 ARA    | Aktive Rechnungsabgrenzung

PASSIVKONTEN:
3000 EK     | Eigenkapital
3001 P      | Privatkonto
3670 EWB    | Einzelwertberichtigung
3680 PWB    | Pauschalwertberichtigung
3900 RST    | Rückstellungen
4200 KBKV   | Kurzfristige Bankverbindlichkeiten
4250 LBKV   | Langfristige Bankverbindlichkeiten
4400 VE     | Verbindlichkeiten aus Lieferungen und Leistungen
4800 UST    | Umsatzsteuer
4900 PRA    | Passive Rechnungsabgrenzung

ERTRAGSKONTEN:
5000 UEFE   | Umsatzerlöse für eigene Erzeugnisse
5430 ASBE   | Andere sonstige betriebliche Erträge
5495 EFO    | Erträge aus abgeschriebenen Forderungen
5710 ZE     | Zinserträge

AUFWANDSKONTEN:
6000 AWR    | Aufwendungen für Rohstoffe
6001 BZKR   | Bezugskosten für Rohstoffe
6010 AWF    | Aufwendungen für Fremdbauteile
6020 AWH    | Aufwendungen für Hilfsstoffe
6030 AWB    | Aufwendungen für Betriebsstoffe
6140 AFR    | Ausgangsfrachten
6200 LG     | Löhne und Gehälter
6400 AGASV  | Arbeitgeberanteil zur Sozialversicherung
6520 ABSA   | Abschreibungen auf Sachanlagen
6700 AWMP   | Mieten, Pachten
6750 KGV    | Kosten des Geldverkehrs
6800 BMK    | Büromaterial und Kleingüter
6870 WER    | Werbung
6900 VBEI   | Versicherungsbeiträge
6950 ABFO   | Abschreibungen auf Forderungen
7510 ZAW    | Zinsaufwendungen

══════════════════════════════════════════════
BUCHUNGSSTRUKTUR-REGELN (ISB LehrplanPLUS Bayern)
══════════════════════════════════════════════

AUSGANGSRECHNUNG (Verkauf auf Ziel):
  Buchungssatz: 2400 FO an 5000 UEFE (Nettobetrag) + 4800 UST (Umsatzsteuerbetrag)
  → IMMER als zusammengesetzter Buchungssatz mit 3 Posten im JSON!
  → Jede Teilbuchung = 1 Punkt (2400 FO an 5000 UEFE = Punkt 1; 2400 FO an 4800 UST = Punkt 2)
  → Bei Sofortrabatt auf Rechnung: Nettobetrag NACH Rabatt verwenden, kein eigenes Rabattkonto!

EINGANGSRECHNUNG (Kauf auf Ziel):
  Buchungssatz: 6000 AWR (o.ä.) + 2600 VORST an 4400 VE
  → IMMER zusammengesetzt! Jede Teilbuchung = 1 Punkt
  → Bei Bezugskosten: 6001 BZKR als eigene Zeile
  → Bei Sofortrabatt: Nettobetrag nach Abzug, kein Rabattkonto
  → Bei GWG (≤800 € netto): 0890 GWG + 2600 VORST an 4400 VE

BARZAHLUNG (Kassenbeleg):
  Kauf bar:    Aufwandskonto + 2600 VORST an 2880 KA
  Verkauf bar: 2880 KA an 5000 UEFE + 4800 UST

RECHNUNGSAUSGLEICH ÜBERWEISUNG:
  Ausgangsrechnung beglichen: 2800 BK an 2400 FO (Bruttobetrag)
  Eingangsrechnung bezahlt:   4400 VE an 2800 BK (Bruttobetrag)
  Mit Skonto (Klasse 8+): zusätzlich 6750 KGV (Käufer) bzw. 5430 ASBE (Verkäufer) buchen

ANLAGEVERMÖGEN (Kauf auf Ziel):
  0700 MA (o.ä.) + 2600 VORST an 4400 VE

ABSCHREIBUNG:
  6520 ABSA an 0700 MA (o.ä.)  – kein USt-Vorgang!

══════════════════════════════════════════════
KONTOANGABE nach Klassenstufe:
══════════════════════════════════════════════
Klasse 7:    NUR Kürzel (z. B. "FO", "UEFE", "UST") – soll_nr und haben_nr = ""
Klasse 8–10: Nummer + Kürzel (z. B. "2400 FO", "5000 UEFE", "4800 UST")

══════════════════════════════════════════════
PUNKTEVERGABE (ISB Handreichung BwR 2025)
══════════════════════════════════════════════
BUCHUNGSSÄTZE:
- 1 Punkt pro Konto-Betrag-Block (Teilbuchung im zusammengesetzten Satz)
- Reine USt-Berechnung = KEIN eigener Punkt

NEBENRECHNUNGEN (1 Punkt je wenn echter betriebswirtschaftlicher Gedankenschritt):
- Skonto-Berechnung beim Rechnungsausgleich: 1 Punkt
- Anschaffungskosten / Abschreibungshöhe: 1 Punkt
- Zeitanteilige Abschreibung (Monatszahl): 1 Punkt
- EWB / PWB / Forderungsausfall-Berechnung: 1 Punkt
- Disagio / Auszahlungsbetrag Darlehen: 1 Punkt
- Periodenrichtige Abgrenzung: 1 Punkt
KEIN Punkt: reine USt-Berechnung, reine Rabattrechnung

BRUTTO→NETTO:
- Klasse 7: 1 Punkt
- Klasse 8+: kein Punkt (außer als Basis für EWB/PWB, Skonto-Nettovergleich, Abgrenzung)

Setze nebenrechnung_punkte nur dann > 0, wenn ein echter Punkt nach obigen Regeln vorliegt.

══════════════════════════════════════════════
AUSGABE: NUR JSON (kein Markdown, kein Text davor/danach)
══════════════════════════════════════════════
{
  "aufgabe": "Aufgabenstellung für Schüler (1-3 Sätze; Klasse ≤9: Du-Form; Klasse 10: Sie-Form)",
  "buchungssatz": [
    {
      "gruppe": 1,
      "soll_nr": "XXXX", "soll_name": "Kontoname (KÜRZEL)",
      "haben_nr": "XXXX", "haben_name": "Kontoname (KÜRZEL)",
      "betrag": 0.00, "punkte": 1, "erklaerung": "Begründung"
    }
  ],
  "nebenrechnung": "Rechenweg mit Schrittangabe, sonst leer",
  "nebenrechnung_punkte": 0,
  "punkte_gesamt": 2,
  "erklaerung": "Didaktischer Kommentar für den Lehrer (2-3 Sätze)"
}

ZUSAMMENGESETZTER BUCHUNGSSATZ – PFLICHT-REGELN FÜR DAS JSON:
- Alle Zeilen, die zum selben buchhalterischen Vorgang gehören, erhalten dieselbe "gruppe"-Zahl (z. B. alle 1).
- Verschiedene Vorgänge (z. B. Einkauf UND Abschreibung in derselben Aufgabe) erhalten verschiedene gruppe-Zahlen (1, 2, ...).
- Bei Ausgangsrechnung (Verkauf auf Ziel): gruppe=1 für BEIDE Zeilen:
    { "gruppe":1, "soll_nr":"2400", "soll_name":"Forderungen aus L+L (FO)", "haben_nr":"5000", "haben_name":"Umsatzerlöse f. eig. Erzeugnisse (UEFE)", "betrag":4500.00, "punkte":1, "erklaerung":"Forderung gegen Kunden" }
    { "gruppe":1, "soll_nr":"2400", "soll_name":"Forderungen aus L+L (FO)", "haben_nr":"4800", "haben_name":"Umsatzsteuer (UST)", "betrag":855.00, "punkte":1, "erklaerung":"USt-Schuld gegenüber Finanzamt" }
- Bei Eingangsrechnung (Kauf auf Ziel): gruppe=1 für BEIDE Zeilen:
    { "gruppe":1, "soll_nr":"6000", "soll_name":"Aufwendungen f. Rohstoffe (AWR)", "haben_nr":"4400", "haben_name":"Verbindlichkeiten aus L+L (VE)", "betrag":1000.00, "punkte":1, "erklaerung":"Materialaufwand" }
    { "gruppe":1, "soll_nr":"2600", "soll_name":"Vorsteuer (VORST)", "haben_nr":"4400", "haben_name":"Verbindlichkeiten aus L+L (VE)", "betrag":190.00, "punkte":1, "erklaerung":"Vorsteuer aus Eingangsrechnung" }
- NIEMALS nur eine Zeile für einen zusammengesetzten Vorgang ausgeben!
- Die punkte_gesamt-Zahl muss der Summe aller punkte-Felder (+ nebenrechnung_punkte) entsprechen.`;
    try {
      const json = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: 1000 });
      if (!json) throw new Error("Keine Antwort vom KI-Proxy");
      const text = json.content?.find(c => c.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const eintrag = { ...parsed, _label: varianteTitel || "Aufgabe", _ts: Date.now() };
      setHistorie(prev => {
        const neu = [...prev, eintrag];
        // Für Export in SchrittAufgaben bereitstellen
        try { localStorage.setItem("buchungswerk_ki_export", JSON.stringify(neu.map(e => ({ result: e, beleg: selected })))); } catch {}
        return neu;
      });
      setGenStatus("ok");
      ladeVorschlaege(belegText, parsed);
    } catch { setGenStatus("error"); }
  };

  const ladeVorschlaege = async (belegText, ergebnis) => {
    setVorschlaegeStatus("loading");
    const prompt = `Du bist BwR-Lehrer (Klasse ${klasse}, Bayern). Zum folgenden Beleg wurde bereits eine Buchungsaufgabe erstellt.
Beleg: ${belegText}
Bereits generierte Aufgabe: ${ergebnis.aufgabe}

Schlage 3 weitere didaktisch sinnvolle Aufgabenvarianten oder Folgethemen vor.

Antworte NUR mit JSON (kein Markdown):
{ "vorschlaege": [ { "titel": "Kurzer Titel", "beschreibung": "1 Satz was geübt wird", "variante": "Präziser Hinweis für Aufgabengenerierung (1-2 Sätze)" } ] }`;
    try {
      const json = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: 600 });
      if (!json) throw new Error("Keine Antwort vom KI-Proxy");
      const text = json.content?.find(c => c.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setVorschlaege(parsed.vorschlaege);
      setVorschlaegeStatus("ok");
    } catch { setVorschlaegeStatus("error"); }
  };

  const exportText = (result, idx) => {
    const buchungen = result.buchungssatz || [];
    const gruppen = [...new Set(buchungen.map(b => b.gruppe ?? 0))];
    const bs = gruppen.map(g => {
      const zeilen = buchungen.filter(b => (b.gruppe ?? 0) === g);
      const sollSeite = [...new Map(zeilen.map(z => [z.soll_nr, z])).values()];
      const gesamtBetrag = zeilen.reduce((s, z) => s + (typeof z.betrag === "number" ? z.betrag : 0), 0);
      const sollStr = sollSeite.map(z => `${z.soll_nr} ${z.soll_name}`).join(" + ");
      if (zeilen.length === 1) {
        const z = zeilen[0];
        const b = typeof z.betrag === "number" ? z.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : z.betrag;
        return `  ${z.soll_nr} ${z.soll_name}  an  ${z.haben_nr} ${z.haben_name}  ${b} €  [${z.punkte ?? 1} P]`;
      }
      const habenZeilen = zeilen.map(z => {
        const b = typeof z.betrag === "number" ? z.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : z.betrag;
        return `    an  ${z.haben_nr} ${z.haben_name}  ${b} €  [${z.punkte ?? 1} P]`;
      }).join("\n");
      return `  ${sollStr}  ${gesamtBetrag.toLocaleString("de-DE",{minimumFractionDigits:2})} €\n${habenZeilen}`;
    }).join("\n") || "";
    const text = `AUFGABE (${result.punkte_gesamt ?? "?"} Punkte)\n${"─".repeat(50)}\n${result.aufgabe}\n\n${result.nebenrechnung ? `NEBENRECHNUNG (${result.nebenrechnung_punkte ?? 0} P)\n${"─".repeat(50)}\n${result.nebenrechnung}\n\n` : ""}BUCHUNGSSATZ\n${"─".repeat(50)}\n${bs}\n\n${result.erklaerung ? `DIDAKTIK (Lehrer)\n${"─".repeat(50)}\n${result.erklaerung}` : ""}`;
    navigator.clipboard.writeText(text).then(() => { setKopiert(idx); setTimeout(() => setKopiert(null), 2000); });
  };

  const exportDruck = (result) => {
    const buchungen = result.buchungssatz || [];
    const gruppen = [...new Set(buchungen.map(b => b.gruppe ?? 0))];
    const bs = gruppen.map(g => {
      const zeilen = buchungen.filter(b => (b.gruppe ?? 0) === g);
      const sollSeite = [...new Map(zeilen.map(z => [z.soll_nr, z])).values()];
      const gesamtBetrag = zeilen.reduce((s, z) => s + (typeof z.betrag === "number" ? z.betrag : 0), 0);
      const btFmt = n => typeof n === "number" ? n.toLocaleString("de-DE",{minimumFractionDigits:2}) : n;
      if (zeilen.length === 1) {
        const z = zeilen[0];
        return `<tr><td style="padding:7px 10px;font-weight:700;color:#1d4ed8">${z.soll_nr} ${z.soll_name}</td><td style="padding:7px 10px;color:#94a3b8;text-align:center;font-weight:400">an</td><td style="padding:7px 10px;font-weight:700;color:#dc2626">${z.haben_nr} ${z.haben_name}</td><td style="padding:7px 10px;text-align:right;font-family:monospace;color:#059669;font-weight:700">${btFmt(z.betrag)} €</td><td style="padding:7px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;background:#0f172a;border-radius:4px">${z.punkte ?? 1} P</td></tr>`;
      }
      const sollStr = sollSeite.map(z => `${z.soll_nr} ${z.soll_name}`).join("<br>");
      const firstRow = `<tr><td rowspan="${zeilen.length}" style="padding:7px 10px;font-weight:700;color:#1d4ed8;vertical-align:middle;border-right:1px solid #e2e8f0">${sollStr}<br><span style='font-family:monospace;color:#059669;font-size:12px'>${btFmt(gesamtBetrag)} €</span></td><td style="padding:7px 10px;color:#94a3b8;text-align:center;font-weight:400">an</td><td style="padding:7px 10px;font-weight:700;color:#dc2626">${zeilen[0].haben_nr} ${zeilen[0].haben_name}</td><td style="padding:7px 10px;text-align:right;font-family:monospace;color:#059669;font-weight:700">${btFmt(zeilen[0].betrag)} €</td><td style="padding:7px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;background:#0f172a;border-radius:4px">${zeilen[0].punkte ?? 1} P</td></tr>`;
      const restRows = zeilen.slice(1).map(z => `<tr><td style="padding:7px 10px;color:#94a3b8;text-align:center;font-weight:400">an</td><td style="padding:7px 10px;font-weight:700;color:#dc2626">${z.haben_nr} ${z.haben_name}</td><td style="padding:7px 10px;text-align:right;font-family:monospace;color:#059669;font-weight:700">${btFmt(z.betrag)} €</td><td style="padding:7px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;background:#0f172a;border-radius:4px">${z.punkte ?? 1} P</td></tr>`).join("");
      return firstRow + restRows;
    }).join("") || "";
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>BuchungsWerk – Aufgabe</title><style>body{font-family:'Segoe UI',sans-serif;max-width:720px;margin:40px auto;color:#0f172a}.lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;margin:0 0 5px}.badge{display:inline-block;background:#0f172a;color:#e8600a;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:800;margin-left:8px}p{font-size:15px;line-height:1.7;margin:0 0 20px}table{width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e2e8f0}td{font-size:13px;border-bottom:1px solid #f1f5f9}.nr{font-family:monospace;font-size:12px;background:#f8fafc;padding:12px 14px;border-radius:6px;white-space:pre-wrap;margin-bottom:20px;border:1px solid #e2e8f0}.erkl{background:#fffbeb;border-left:4px solid #e8600a;padding:12px 16px;font-size:12px;color:#92400e}@media print{.erkl{display:none}}</style></head><body><div class="lbl">Aufgabenstellung <span class="badge">${result.punkte_gesamt ?? "?"} Punkte</span></div><p>${result.aufgabe}</p>${result.nebenrechnung ? `<div class="lbl">Nebenrechnung <span class="badge">${result.nebenrechnung_punkte ?? 0} P</span></div><div class="nr">${result.nebenrechnung.replace(/\n/g,"<br>")}</div>` : ""}<div class="lbl">Buchungssatz</div><table>${bs}</table>${result.erklaerung ? `<div class="erkl"><strong>💡 Didaktik (Lehrer):</strong> ${result.erklaerung}</div>` : ""}</body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  // ISB Korrekturzeichen: DraggableHaken (globale Komponente) – frei verschiebbar
  const ISBHaken = () => <DraggableHaken />;

  // Wiederverwendbare Aufgaben-Karte
  const AufgabeKarte = ({ result, nr, isLatest }) => {
    const nrPunkte = result.nebenrechnung_punkte ?? 0;
    return (
    <div style={{ borderTop: nr > 1 ? "2px dashed #e2e8f0" : "none", paddingTop: nr > 1 ? 16 : 0, display:"flex", flexDirection:"column", gap:10 }}>
      {/* Kopfzeile */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:24, height:24, borderRadius:"50%", background: isLatest ? "#e8600a" : "#e2e8f0", color: isLatest ? "#0f172a" : "#94a3b8", fontWeight:800, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{nr}</div>
        <span style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{result._label}</span>
        {(result.punkte_gesamt ?? 0) > 0 && (
          <span style={{ marginLeft:"auto", background:"#0f172a", color:"#e8600a", borderRadius:20, padding:"2px 11px", fontSize:11, fontWeight:800 }}>{result.punkte_gesamt} P</span>
        )}
      </div>

      {/* Aufgabenstellung */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:7 }}>Aufgabenstellung</div>
        <div style={{ fontSize:14, lineHeight:1.7 }}>{result.aufgabe}</div>
      </div>

      {/* Nebenrechnung mit ✓-Haken wenn bepunktet */}
      {result.nebenrechnung && (
        <div style={{ background:"#fefce8", border:"1px solid #fde68a", borderRadius:8, padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#92400e" }}>📐 Nebenrechnung</div>
            <div style={{ display:"flex", gap:3, alignItems:"center" }}>
              {nrPunkte > 0
                ? Array.from({ length: nrPunkte }).map((_, i) => <ISBHaken key={i} title={`✓ = 1 Punkt (Nebenrechnung Schritt ${i+1})`} />)
                : <span style={{ fontSize:9, color:"#92400e", fontStyle:"italic" }}>kein eigener Punkt (Handreichung)</span>
              }
            </div>
          </div>
          <div style={{ fontFamily:"monospace", fontSize:12, whiteSpace:"pre-wrap", background:"#fffbeb", padding:"10px 12px", borderRadius:6, color:"#78350f" }}>{result.nebenrechnung}</div>
        </div>
      )}

      {/* Buchungssätze – gruppe-basiert, ISB-Format: "an" nur einmal */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:10 }}>Buchungssatz</div>
        {(() => {
          const buchungen = result.buchungssatz || [];
          const gruppen = [...new Set(buchungen.map(b => b.gruppe ?? 0))];
          const btFmt = n => typeof n === "number" ? n.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) : n;
          return gruppen.map(g => {
            const zeilen = buchungen.filter(b => (b.gruppe ?? 0) === g);
            const sollSeite = [...new Map(zeilen.map(z => [z.soll_nr, z])).values()];
            const isMehrfach = zeilen.length > 1;
            // ISB-Buchungssatzformat:
            // Einfach:      SOLL ✓  an  HABEN ✓  Betrag  P
            // Zusammenges.: SOLL ✓  an  HABEN1 ✓  Betrag1  P
            //                           HABEN2 ✓  Betrag2  P
            return (
              <div key={g} style={{ padding:"10px 12px", background:"#f8fafc", borderRadius:6, marginBottom:6, borderLeft:"3px solid #3b82f6", fontFamily:"inherit" }}>
                {zeilen.map((z, zi) => (
                  <div key={zi} style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", fontSize:13, fontWeight:600, marginBottom: zi < zeilen.length-1 ? 4 : 0 }}>
                    {/* Soll – nur in erster Zeile */}
                    {zi === 0 ? (
                      <span style={{ color:"#1d4ed8", minWidth:0 }}>
                        {sollSeite.map((s, si) => (
                          <span key={si}>{s.soll_nr && <>{s.soll_nr} </>}<KürzelSpan nr={s.soll_nr} style={{ color:"#1d4ed8", fontWeight:600, fontSize:13 }} /></span>
                        ))}
                      </span>
                    ) : (
                      /* Platzhalter gleicher Breite für Folgezeilen */
                      <span style={{ visibility:"hidden", color:"#1d4ed8", userSelect:"none", minWidth:0 }}>
                        {sollSeite.map((s, si) => (
                          <span key={si}>{s.soll_nr && <>{s.soll_nr} </>}<KürzelSpan nr={s.soll_nr} style={{ color:"#1d4ed8", fontWeight:600, fontSize:13 }} /></span>
                        ))}
                      </span>
                    )}
                    {/* ISBHaken nach Soll – nur in erster Zeile sichtbar */}
                    {zi === 0 ? <ISBHaken /> : <span style={{ visibility:"hidden" }}><ISBHaken /></span>}
                    {/* "an" – nur in erster Zeile */}
                    {zi === 0
                      ? <span style={{ color:"#94a3b8", fontWeight:400, fontSize:12, flexShrink:0 }}>an</span>
                      : <span style={{ color:"transparent", fontWeight:400, fontSize:12, flexShrink:0, userSelect:"none" }}>an</span>
                    }
                    {/* Haben-Konto */}
                    <span style={{ color:"#dc2626" }}>
                      {z.haben_nr && <>{z.haben_nr} </>}<KürzelSpan nr={z.haben_nr} style={{ color:"#dc2626", fontWeight:600, fontSize:13 }} />
                    </span>
                    <ISBHaken />
                    {/* Betrag + Punkte */}
                    <span style={{ marginLeft:"auto", fontFamily:"monospace", color:"#059669", fontWeight:700 }}>
                      {btFmt(z.betrag)} €
                    </span>
                    <span style={{ background:"#0f172a", color:"#e8600a", borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:800 }}>{z.punkte ?? 1} P</span>
                    {/* Erklärung */}
                    {z.erklaerung && <div style={{ width:"100%", fontSize:11, color:"#64748b", fontWeight:400, marginTop:2, paddingLeft:2 }}>{z.erklaerung}</div>}
                  </div>
                ))}
              </div>
            );
          });
        })()}
      </div>

      {/* Didaktik */}
      {result.erklaerung && (
        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:12, fontSize:12, color:"#92400e", lineHeight:1.6 }}>
          <strong>💡 Didaktik (Lehrer):</strong> {result.erklaerung}
        </div>
      )}

      {/* Export-Leiste */}
      <div style={{ display:"flex", gap:7 }}>
        <button onClick={() => exportText(result, nr)}
          style={{ flex:1, padding:"8px 10px", background: kopiert===nr ? "#f0fdf4" : "#fff", border:`1.5px solid ${kopiert===nr?"#86efac":"#e2e8f0"}`, borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700, color: kopiert===nr?"#15803d":"#374151", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          {kopiert===nr ? <><CheckSquare size={11} strokeWidth={1.5}/>Kopiert!</> : <><ClipboardList size={11} strokeWidth={1.5}/>Kopieren</>}
        </button>
        <button onClick={() => exportDruck(result)}
          style={{ flex:1, padding:"8px 10px", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700, color:"#374151" }}>
          🖨 Drucken
        </button>
      </div>
    </div>
  );};

  const fmt_datum = iso => new Date(iso).toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px", overflowY:"auto" }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:1100, overflow:"hidden", boxShadow:"0 24px 64px rgba(0,0,0,.25)" }}>
        {/* Header */}
        <div style={{ background:"#0f172a", padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"#fff", fontWeight:800, fontSize:18 }}>📂 Eigene Belege</div>
            <div style={{ color:"#94a3b8", fontSize:12, marginTop:2 }}>{belege.length} Beleg{belege.length!==1?"e":""} im Pool · erstellt im Beleg-Editor</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>✕ Schließen</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", minHeight:500 }}>
          {/* Linke Liste */}
          <div style={{ borderRight:"1px solid #e2e8f0", overflowY:"auto", maxHeight:"70vh" }}>
            {belege.length === 0 ? (
              <div style={{ padding:"32px 20px", textAlign:"center", color:"#94a3b8" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
                <div style={{ fontWeight:700, marginBottom:6 }}>Noch keine Belege</div>
                <div style={{ fontSize:12, lineHeight:1.5 }}>Erstelle im Beleg-Editor einen Beleg und klicke auf "In BuchungsWerk übernehmen".</div>
              </div>
            ) : belege.map(b => (
              <div key={b.id}
                onClick={() => { setSelected(b); setHistorie([]); setGenStatus(null); setVorschlaege(null); setVorschlaegeStatus(null); }}
                style={{ padding:"14px 16px", borderBottom:"1px solid rgba(240,236,227,0.08)", cursor:"pointer",
                  background: selected?.id===b.id ? "rgba(232,96,10,0.08)" : "transparent",
                  borderLeft: selected?.id===b.id ? "3px solid #e8600a" : "3px solid transparent" }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{b.titel}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{BELEGTYP_LABELS[b.typ]||b.typ} · {fmt_datum(b.erstellt)}</div>
                <button onClick={e=>{e.stopPropagation();loeschen(b.id);}}
                  style={{ marginTop:6, fontSize:10, color:"#ef4444", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:600 }}>🗑 Löschen</button>
              </div>
            ))}
          </div>
          {/* Rechte Detailansicht */}
          <div style={{ overflowY:"auto", maxHeight:"70vh", padding:20 }}>
            {!selected ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#94a3b8", textAlign:"center" }}>
                <div><div style={{ fontSize:40, marginBottom:12 }}>👈</div><div style={{ fontWeight:700 }}>Beleg auswählen</div><div style={{ fontSize:12, marginTop:4 }}>Klicke links auf einen Beleg.</div></div>
              </div>
            ) : (
              <>
                {/* Beleg-Vorschau */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:10 }}>Beleg-Vorschau</div>
                  {selected.typ==="eingangsrechnung" && <BeVorschauRechnung data={selected.data} typ="eingangsrechnung" />}
                  {selected.typ==="ausgangsrechnung" && <BeVorschauRechnung data={selected.data} typ="ausgangsrechnung" />}
                  {selected.typ==="kontoauszug"      && <BeVorschauKontoauszug data={selected.data} />}
                  {selected.typ==="ueberweisung"     && <BeVorschauUeberweisung data={selected.data} />}
                  {selected.typ==="email"            && <BeVorschauEmail data={selected.data} />}
                  {selected.typ==="quittung"         && <BeVorschauQuittung data={selected.data} />}
                </div>

                {/* KI-Block */}
                <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:16 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>🤖 Aufgabe mit KI generieren</div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:"#64748b", flexShrink:0 }}>Klassenstufe:</label>
                    {["7","8","9","10"].map(k => (
                      <button key={k} onClick={() => setKlasse(k)}
                        style={{ padding:"5px 14px", borderRadius:20, border:"1.5px solid", borderColor:klasse===k?"#0f172a":"#e2e8f0", background:klasse===k?"#0f172a":"#fff", color:klasse===k?"#fff":"#475569", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                        {k}
                      </button>
                    ))}
                    <button onClick={() => generieren(null, "Aufgabe")} disabled={genStatus==="loading"}
                      style={{ marginLeft:"auto", padding:"8px 20px", background:genStatus==="loading"?"#94a3b8":"#e8600a", color:"#0f172a", border:"none", borderRadius:8, fontWeight:800, fontSize:13, cursor:genStatus==="loading"?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6 }}>
                      {genStatus==="loading" ? <><Zap size={13} strokeWidth={1.5}/>Generiere…</> : historie.length===0 ? <><Star size={13} strokeWidth={1.5}/>Aufgabe generieren</> : <><Star size={13} strokeWidth={1.5}/>Weitere Aufgabe</>}
                    </button>
                  </div>

                  {genStatus==="error" && (
                    <div style={{ padding:12, background:"#fee2e2", borderRadius:8, color:"#dc2626", fontSize:12, fontWeight:600 }}>⚠ Fehler. Bitte nochmal versuchen.</div>
                  )}

                  {/* Alle Aufgaben in der Historie */}
                  {historie.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      {historie.map((result, idx) => (
                        <AufgabeKarte key={result._ts} result={result} nr={idx+1} isLatest={idx===historie.length-1} />
                      ))}

                      {/* Weiterführende Vorschläge unter der letzten Karte */}
                      <div style={{ borderTop:"1px solid #e2e8f0", paddingTop:14 }}>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:10 }}>💡 Weiterführende Aufgaben</div>
                        {vorschlaegeStatus==="loading" && <div style={{ fontSize:12, color:"#94a3b8" }}>⏳ Lade Vorschläge…</div>}
                        {vorschlaegeStatus==="error"   && <div style={{ fontSize:12, color:"#ef4444" }}>Vorschläge konnten nicht geladen werden.</div>}
                        {vorschlaege && (
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            {vorschlaege.map((v, i) => (
                              <button key={i} onClick={() => generieren(v.variante, v.titel)}
                                style={{ textAlign:"left", padding:"11px 14px", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:10, cursor:"pointer" }}
                                onMouseEnter={e=>e.currentTarget.style.borderColor="#0f172a"}
                                onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}>
                                <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{v.titel}</div>
                                <div style={{ fontSize:11, color:"#64748b", lineHeight:1.5 }}>{v.beschreibung}</div>
                                <div style={{ fontSize:10, color:"#94a3b8", marginTop:5, fontWeight:600 }}>→ Aufgabe generieren und unten anfügen</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}






// ── H5PModal ──────────────────────────────────────────────────────────────────
const QUIZ_TYPEN = [
  { key: "drag_konten",   label: "Kontenplan-Drag" },
  { key: "fill_blanks",   label: "Lückentext" },
  { key: "single_choice", label: "Multiple Choice" },
  { key: "true_false",    label: "Wahr/Falsch" },
  { key: "drag_kalk",     label: "Kalkulation" },
];

// ── Beleg → HTML (für H5P-Aufgabenbeschreibung) ──────────────────────────────
function belegDataZuHtml(b) {
  if (!b) return "";
  const fmt2 = n => n != null ? Number(n).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €" : "";
  const zeile = (l, v) => v ? `<br><strong>${l}:</strong> ${v}` : "";
  let titel = "", inhalt = "";
  if (b.typ === "email") {
    titel = "E-Mail";
    inhalt = [zeile("Von", b.vonName || b.von), zeile("An", b.an), zeile("Betreff", b.betreff), zeile("Datum", b.datum), zeile("Text", b.text)].join("");
  } else if (b.typ === "rechnung") {
    titel = "Eingangsrechnung";
    const pos = (b.positionen || []).filter(p => !p.isRabatt).map(p => `${p.menge ? p.menge+" "+p.einheit+" " : ""}${p.beschr}`).join(", ");
    inhalt = [zeile("Ware", pos), zeile("Netto", fmt2(b.netto)), zeile("USt " + (b.ustPct||19)+" %", fmt2(b.ustBetrag)), zeile("Brutto", fmt2(b.brutto)), b.skonto ? zeile("Skonto", b.skonto+" %") : ""].join("");
  } else if (b.typ === "kontoauszug") {
    titel = "Kontoauszug";
    inhalt = (b.buchungen || []).map(bk => `<br>${bk.datum||""} | ${bk.vz==="s"?"Soll":"Haben"} | ${fmt2(bk.betrag)} | ${bk.zweck||""}`).join("");
  } else if (b.typ === "ueberweisung") {
    titel = "Überweisung";
    inhalt = [zeile("Empfänger", b.empfaenger), zeile("Betrag", fmt2(b.betrag)), zeile("Zweck", b.zweck)].join("");
  } else {
    titel = b.typ || "Beleg";
  }
  return `<p><strong>📄 ${titel}</strong>${inhalt}</p>`;
}

// ── H5P Content Generator ─────────────────────────────────────────────────────
function h5pUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function generiereH5PContent(fragen, config, firma) {
  const questions = fragen.map(f => {
    const subContentId = h5pUuid();

    // ── MultiChoice: single_choice ─────────────────────────────────────────
    if (f.typ === "single_choice") {
      const antworten = f.antworten || [];
      const richtigIdx = antworten.indexOf(f.richtig);
      const answers = antworten.map((opt, i) => ({
        correct: i === richtigIdx,
        text: String(opt).replace(/<[^>]*>/g, ""),
        tipsAndFeedback: { tip:"", chosenFeedback:"", notChosenFeedback:"" },
      }));
      return {
        library: "H5P.MultiChoice 1.16",
        subContentId,
        params: {
          question: `<p>${String(f.frage||"").replace(/<[^>]*>/g, "")}</p>${f.belegData ? belegDataZuHtml(f.belegData) : ""}`,
          answers,
          behaviour: { enableRetry:true, enableSolutionsButton:true, singleAnswer:true, showSolutionsRequiresInput:false, autoCheck:false },
          UI: { checkAnswerButton:"Überprüfen", showSolutionButton:"Lösung anzeigen", tryAgainButton:"Nochmal", scoreBarLabel:"Punkte" },
          overallFeedback: [{ from:0, to:49, feedback:"Leider falsch. Schau nochmal." },{ from:50, to:100, feedback:"Richtig!" }],
        },
        metadata: { contentType:"Multiple Choice", license:"U", title: String(f.frage||"").replace(/<[^>]*>/g," ").trim().slice(0,60), defaultLanguage:"de" },
      };
    }

    // ── True/False ──────────────────────────────────────────────────────────
    if (f.typ === "true_false") {
      return {
        library: "H5P.MultiChoice 1.16",
        subContentId,
        params: {
          question: `<p>${String(f.frage||"").replace(/<[^>]*>/g," ").trim()}</p>`,
          answers: [
            { correct: f.antwort === true,  text: "Ja",  tipsAndFeedback:{ tip:"", chosenFeedback: f.antwort===true  ? "✓ "+f.begruendung : "", notChosenFeedback:"" } },
            { correct: f.antwort === false, text: "Nein", tipsAndFeedback:{ tip:"", chosenFeedback: f.antwort===false ? "✓ "+f.begruendung : "", notChosenFeedback:"" } },
          ],
          behaviour: { enableRetry:true, enableSolutionsButton:true, singleAnswer:true, showSolutionsRequiresInput:false },
          UI: { checkAnswerButton:"Überprüfen", showSolutionButton:"Lösung anzeigen", tryAgainButton:"Nochmal", scoreBarLabel:"Punkte" },
          overallFeedback: [{ from:0, to:49, feedback:"Falsch." },{ from:50, to:100, feedback:"Richtig!" }],
        },
        metadata: { contentType:"Multiple Choice", license:"U", title: String(f.frage||"").replace(/<[^>]*>/g," ").trim().slice(0,60), defaultLanguage:"de" },
      };
    }

    // ── DragText: drag_konten (Buchungssatz) ───────────────────────────────
    if (f.typ === "drag_konten") {
      // H5P.DragText: Zeilen mit \n trennen, Lücken mit *text*
      // Format: "Soll:\n*Nr Kürzel*\nan\nHaben:\n*Nr Kürzel*"
      const sollZeilen = (f.sollSlots || []).map(s => `*${s.antwort}*`).join("\n");
      const habenZeilen = (f.habenSlots || []).map(h => `*${h.antwort}*`).join("\n");
      const textField = "Soll:\n" + (sollZeilen || "*Konto*") + "\nan\nHaben:\n" + (habenZeilen || "*Konto*");
      const desc = String(f.frage||"").replace(/<[^>]*>/g," ").trim();
      // Belegs-HTML falls vorhanden
      const belegHtml = f.belegData ? belegDataZuHtml(f.belegData) : "";
      return {
        library: "H5P.DragText 1.10",
        subContentId,
        params: {
          taskDescription: `<p>${String(f.frage||"").replace(/<strong>/g,"").replace(/<\/strong>/g,"").replace(/<br>/g," ").replace(/<[^>]*>/g," ").trim()}</p>${belegHtml}`,
          textField,
          behaviour: { enableRetry:true, enableSolutionsButton:true, showSolutionsRequiresInput:false, instantFeedback:false },
          overallFeedback: [{ from:0, to:49, feedback:"Nochmal versuchen!" },{ from:50, to:100, feedback:"Richtig!" }],
          checkAnswer:"Überprüfen", showSolution:"Lösung anzeigen", tryAgain:"Nochmal",
        },
        metadata: { contentType:"Drag Text", license:"U", title: desc.slice(0,60), defaultLanguage:"de" },
      };
    }

    // ── Blanks: fill_blanks ─────────────────────────────────────────────────
    if (f.typ === "fill_blanks") {
      const felder = f.felder || [];
      // Build one cloze sentence per field
      const questions2 = felder.length
        ? felder.map(feld => `${feld.label ? feld.label+": " : ""}*${feld.antwort}*`)
        : [String(f.lueckentext || f.frage || "").replace(/<[^>]*>/g," ").trim()];
      return {
        library: "H5P.Blanks 1.14",
        subContentId,
        params: {
          text: `<p>${String(f.frage||"").replace(/<[^>]*>/g," ").trim()}</p>${f.belegData ? belegDataZuHtml(f.belegData) : ""}`,
          questions: questions2,
          behaviour: { enableRetry:true, enableSolutionsButton:true, showSolutionsRequiresInput:false, caseSensitive:false, showSolutionButton:"end", autoCheck:false },
          UI: { checkAnswerButton:"Überprüfen", showSolutionButton:"Lösung", tryAgainButton:"Nochmal", scoreBarLabel:"Punkte" },
          overallFeedback: [{ from:0, to:49, feedback:"Schau nochmal nach." },{ from:50, to:100, feedback:"Gut gemacht!" }],
        },
        metadata: { contentType:"Fill in the Blanks", license:"U", title: String(f.frage||"").replace(/<[^>]*>/g," ").trim().slice(0,60), defaultLanguage:"de" },
      };
    }

    // ── Blanks: drag_kalk (Schema-Lückentext) ──────────────────────────────
    if (f.typ === "drag_kalk") {
      const zeilen = f.zeilen || [];
      const questions2 = zeilen
        .filter(z => z.antwort != null)
        .map(z => `${z.label}: *${z.antwort}*`);
      return {
        library: "H5P.Blanks 1.14",
        subContentId,
        params: {
          text: `<p>${String(f.frage||"").replace(/<[^>]*>/g," ").trim()}</p>`,
          questions: questions2.length ? questions2 : ["*Wert*"],
          behaviour: { enableRetry:true, enableSolutionsButton:true, showSolutionsRequiresInput:false, caseSensitive:false, autoCheck:false },
          UI: { checkAnswerButton:"Überprüfen", showSolutionButton:"Lösung", tryAgainButton:"Nochmal", scoreBarLabel:"Punkte" },
          overallFeedback: [{ from:0, to:49, feedback:"Schau nochmal nach." },{ from:50, to:100, feedback:"Richtig!" }],
        },
        metadata: { contentType:"Fill in the Blanks", license:"U", title: String(f.frage||"").replace(/<[^>]*>/g," ").trim().slice(0,60), defaultLanguage:"de" },
      };
    }

    return null;
  }).filter(Boolean);

  return {
    introPage: {
      showIntroPage: true,
      title: `BuchungsWerk – Klasse ${config.klasse}`,
      introduction: `<p>Interaktive Aufgaben für ${config.typ}${firma?.name ? " · " + firma.name : ""}.<br>Bearbeite alle Aufgaben sorgfältig.</p>`,
      startButtonText: "Starten →",
    },
    progressType: "dots",
    passPercentage: 50,
    questions,
    endGame: {
      showResultPage: true,
      noResultMessage: "Du hast alle Aufgaben bearbeitet.",
      message: "Ergebnis:",
      overallFeedback: [
        { from:0,  to:49,  feedback:"Noch üben – schau nochmal in deine Unterlagen!" },
        { from:50, to:79,  feedback:"Gut gemacht! Du kennst schon vieles." },
        { from:80, to:100, feedback:"Ausgezeichnet! Top-Leistung!" },
      ],
      solutionButtonText: "Lösung anzeigen",
      retryButtonText: "Wiederholen",
      finishButtonText: "Fertig",
      showAnimations: false,
      skippable: false,
      skipButtonText: "Überspringen",
    },
    override: { checkButton:true },
    texts: {
      prevButton:"Zurück", nextButton:"Weiter", finishButton:"Beenden",
      textualProgress:"Aufgabe @current von @total",
      jumpToQuestion:"Frage %d von %total", questionLabel:"Frage",
      readSpeakerProgress:"Frage @current von @total",
      unansweredText:"Unbeantwortet", answeredText:"Beantwortet",
      currentQuestionText:"Aktuelle Frage",
    },
  };
}

function H5PModal({ aufgaben, config, firma, onSchliessen }) {
  const [tab, setTab] = useState("quiz");
  const [qrUrl, setQrUrl] = useState("");
  const [qrReady, setQrReady] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [fragenTypen, setFragenTypen] = useState(() =>
    aufgaben.map(a => ({ id: a.id, typ: bestimmeFragetyp(a) }))
  );
  const setTyp = (id, typ) =>
    setFragenTypen(prev => prev.map(ft => ft.id === id ? { ...ft, typ } : ft));

  // Session beim Backend anlegen und sessionId zurückbekommen
  const erstelleSession = async () => {
    try {
      const res = await apiFetch("/sessions", "POST", {
        titel: config.typ,
        klasse_stufe: config.klasse,
        pruefungsart: config.pruefungsart || null,
        config_json: JSON.stringify({ ...config, firma: firma?.name }),
      });
      return res?.id ?? null;
    } catch { return null; }
  };

  const downloadQuiz = async () => {
    const sessionId = await erstelleSession();
    const html = generateQuizHTML({ aufgaben, config, firma, fragenTypen, apiUrl: API_URL, sessionId });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `BuchungsWerk_Quiz_Kl${config.klasse}_${config.datum || "2026"}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const vorschauQuiz = async () => {
    const sessionId = await erstelleSession();
    const html = generateQuizHTML({ aufgaben, config, firma, fragenTypen, apiUrl: API_URL, sessionId });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const generiereQR = async () => {
    if (!qrUrl) return;
    setQrLoading(true);
    try {
      await new Promise((res, rej) => {
        if (window.QRCode) { res(); return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
      setQrReady(true);
    } catch { alert("QR-Bibliothek konnte nicht geladen werden."); }
    setQrLoading(false);
  };

  const QRContainer = ({ url }) => {
    const ref = useRef(null);
    React.useEffect(() => {
      if (!ref.current || !url || !window.QRCode) return;
      ref.current.innerHTML = "";
      new window.QRCode(ref.current, { text: url, width: 224, height: 224, colorDark: "#0f172a", colorLight: "#ffffff", correctLevel: window.QRCode?.CorrectLevel?.M });
    }, [url]);
    return <div ref={ref} style={{ display: "inline-block" }} />;
  };

  const frageAnzahl = React.useMemo(
    () => generiereAlleQuizFragen(aufgaben, fragenTypen).length,
    [aufgaben, fragenTypen]
  );

  const TABS = [
    { key: "quiz", icon: Monitor,       label: "Interaktives Quiz" },
    { key: "qr",   icon: QrCode,        label: "QR / Teilen" },
    { key: "h5p",  icon: GraduationCap, label: "H5P (mebis)" },
  ];

  const S2 = {
    infoBox: { background:"rgba(240,236,227,0.05)", borderRadius:"12px", padding:"13px 15px", marginBottom:"14px", fontSize:"13px", color:"rgba(240,236,227,0.75)", lineHeight:1.7, border:"1px solid rgba(240,236,227,0.1)" },
    sectionLbl: { fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"rgba(240,236,227,0.4)", marginBottom:"9px" },
    aufgRow: { display:"flex", alignItems:"center", gap:"8px", padding:"9px 12px", background:"rgba(240,236,227,0.05)", borderRadius:"9px", marginBottom:"6px", flexWrap:"wrap" },
    aufgNr: { fontSize:"11px", fontWeight:800, color:"#e8600a", minWidth:"24px" },
    aufgTxt: { fontSize:"12px", color:"#e2e8f0", flex:1, minWidth:"120px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
    typPill: (active) => ({ padding:"4px 8px", borderRadius:"6px", border:"1px solid", fontSize:"10px", fontWeight:700, cursor:"pointer", borderColor: active ? "#e8600a" : "#334155", background: active ? "#e8600a" : "transparent", color: active ? "#0f172a" : "#64748b" }),
    bigBtn: (bg) => ({ flex:1, padding:"12px", borderRadius:"10px", border:"none", background:bg, color:"#fff", fontWeight:800, fontSize:"13px", cursor:"pointer" }),
    outlineBtn: { flex:1, padding:"12px", borderRadius:"10px", border:"1.5px solid #334155", background:"transparent", color:"#e2e8f0", fontWeight:700, fontSize:"13px", cursor:"pointer" },
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#0f172a", borderRadius:"16px", width:"100%", maxWidth:"580px", maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ padding:"18px 22px 0", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
            <div>
              <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#64748b", marginBottom:"3px" }}>Interaktiv & Teilen</div>
              <div style={{ fontSize:"20px", fontWeight:900, color:"#fff", display:"flex", alignItems:"center", gap:8 }}><Monitor size={20} strokeWidth={1.5}/>Quiz & H5P</div>
            </div>
            <button onClick={onSchliessen} style={{ background:"transparent", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", width:"36px", height:"36px", cursor:"pointer", fontSize:"18px" }}>×</button>
          </div>
          <div style={{ display:"flex" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:"9px 4px", border:"none", background:"transparent", borderBottom: tab===t.key?"3px solid #e8600a":"3px solid transparent", color: tab===t.key?"#e8600a":"#64748b", fontSize:"11px", fontWeight: tab===t.key?700:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>{React.createElement(t.icon,{size:13,strokeWidth:1.5})} {t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowY:"auto", padding:"20px 22px", flex:1 }}>

          {tab==="quiz" && (
            <div>
              <div style={S2.infoBox}>
                Self-contained HTML für iPad – kein Internet nötig. Neuer Modus: <strong style={{color:"#e8600a"}}>Kontenplan-Drag</strong> – Schüler wählt Konten selbst aus dem vollständigen Kontenplan. Jeder Slot verlangt Nr. + Kürzel + Betrag. Beleg wird vollständig angezeigt.
              </div>
              <div style={{ ...S2.sectionLbl, marginBottom:"7px" }}>Aufgaben · {frageAnzahl} Fragen</div>
              <div style={{ marginBottom:"16px" }}>
                {aufgaben.map((a, i) => {
                  const aktTyp = fragenTypen.find(ft => ft.id === a.id)?.typ ?? bestimmeFragetyp(a);
                  const verfuegbar = a.taskTyp==="rechnung"
                    ? [QUIZ_TYPEN.find(t=>t.key==="drag_kalk")]
                    : a.taskTyp==="theorie"
                    ? [QUIZ_TYPEN.find(t=>t.key==="single_choice"),QUIZ_TYPEN.find(t=>t.key==="true_false")]
                    : QUIZ_TYPEN.filter(t=>t.key!=="drag_kalk");
                  const kurzTxt = (a.aufgabe||"").replace(/<[^>]*>/g,"").slice(0,44);
                  return (
                    <div key={a.id} style={S2.aufgRow}>
                      <span style={S2.aufgNr}>#{i+1}</span>
                      <span style={S2.aufgTxt} title={(a.aufgabe||"").replace(/<[^>]*>/g,"")}>{kurzTxt}</span>
                      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                        {verfuegbar.filter(Boolean).map(t => (
                          <button key={t.key} onClick={() => setTyp(a.id, t.key)}
                            style={S2.typPill(aktTyp===t.key)} title={t.label}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:"9px" }}>
                <button onClick={vorschauQuiz} style={{...S2.outlineBtn,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Eye size={13} strokeWidth={1.5}/>Vorschau</button>
                <button onClick={downloadQuiz} style={{...S2.bigBtn("#e8600a"),display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Download size={13} strokeWidth={1.5}/>Herunterladen (.html)</button>
              </div>
              <div style={{ marginTop:"9px", fontSize:"11px", color:"#475569", textAlign:"center" }}>
                iPad-optimiert · Offline · Kontenplan eingebettet · Belege vollständig
              </div>
            </div>
          )}

          {tab==="qr" && (
            <div>
              <div style={S2.infoBox}>QR-Code für den Unterricht: Schülerinnen und Schüler scannen mit der iPad-Kamera und öffnen das Quiz direkt im Browser.</div>
              <div style={{ marginBottom:"10px" }}>
                <div style={{ ...S2.sectionLbl, marginBottom:"5px" }}>Link eingeben</div>
                <input type="url" value={qrUrl} onChange={e=>{setQrUrl(e.target.value);setQrReady(false);}}
                  placeholder="https://lernplattform.mebis.bycs.de/… oder http://buchungswerk.local"
                  style={{ width:"100%", padding:"10px 13px", borderRadius:"9px", border:"1.5px solid #334155", background:"#1e293b", color:"#e2e8f0", fontSize:"13px", outline:"none", fontFamily:"inherit" }} />
              </div>
              <div style={{ display:"flex", gap:"7px", marginBottom:"14px" }}>
                {[{label:"Pi-Server",url:"http://buchungswerk.local"},{label:"mebis",url:"https://lernplattform.mebis.bycs.de/"}].map(p=>(
                  <button key={p.label} onClick={()=>{setQrUrl(p.url);setQrReady(false);}}
                    style={{ flex:1, padding:"8px", borderRadius:"8px", border:"1px solid #334155", background:"#1e293b", color:"#94a3b8", fontSize:"11px", cursor:"pointer" }}>{p.label}</button>
                ))}
              </div>
              <button onClick={generiereQR} disabled={!qrUrl||qrLoading}
                style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"none", background:qrUrl?"#e8600a":"#334155", color:qrUrl?"#0f172a":"#64748b", fontWeight:800, fontSize:"14px", cursor:qrUrl?"pointer":"not-allowed", marginBottom:"14px", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {qrLoading ? <><Zap size={14} strokeWidth={1.5}/>Lädt…</> : <><Monitor size={14} strokeWidth={1.5}/>QR-Code generieren</>}
              </button>
              {qrReady&&qrUrl
                ?<div style={{ textAlign:"center", background:"#fff", borderRadius:"14px", padding:"20px" }}>
                  <QRContainer url={qrUrl}/>
                  <div style={{ marginTop:"10px", fontSize:"12px", color:"#374151", fontWeight:600 }}>📱 iPad-Kamera → QR scannen → Quiz startet</div>
                  <div style={{ fontSize:"10px", color:"#6b7280", marginTop:"4px", wordBreak:"break-all" }}>{qrUrl}</div>
                </div>
                :<div style={{ textAlign:"center", padding:"28px", color:"#475569", fontSize:"12px" }}>QR-Code erscheint nach dem Generieren.<br/><span style={{ fontSize:"11px" }}>Einmalig Internetverbindung für QR-Bibliothek erforderlich</span></div>
              }
            </div>
          )}

          {tab==="h5p" && (
            <div>
              <div style={{ ...S2.infoBox, borderLeft:"3px solid #e8600a", fontSize:"12px" }}>
                <div style={{ fontSize:"13px", color:"#e8600a", fontWeight:700, marginBottom:"7px" }}>🎓 H5P-Export für bycs / mebis</div>
                Erzeugt eine echte <strong>.h5p-Datei</strong> (Question Set) die direkt in bycs hochgeladen werden kann. Jede Aufgabe wird als interaktive Frage exportiert.
              </div>
              <div style={S2.sectionLbl}>Enthaltene Aktivitäten</div>
              <div style={{ marginBottom:14 }}>
                {[
                  ["Buchungssatz-Aufgaben","Drag & Drop – Soll/Haben zuordnen"],
                  ["Rechnung / Schema","Lückentext – Werte eintragen"],
                  ["Theorie-Aufgaben","Multiple Choice"],
                ].map(([typ,hint]) => (
                  <div key={typ} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"#1e293b", borderRadius:8, marginBottom:5 }}>
                    <span style={{ fontSize:"12px", color:"#e2e8f0", fontWeight:600, flex:1 }}>{typ}</span>
                    <span style={{ fontSize:"10px", color:"#94a3b8" }}>{hint}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:"10px" }}>
                <button onClick={async () => {
                  // Load JSZip
                  try {
                    if (!window.JSZip) {
                      await new Promise((res, rej) => {
                        const s = document.createElement("script");
                        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
                        s.onload = res; s.onerror = rej; document.head.appendChild(s);
                      });
                    }
                    const fragen = generiereAlleQuizFragen(aufgaben, fragenTypen);
                    const h5pContent = generiereH5PContent(fragen, config, firma);
                    const zip = new window.JSZip();
                    // h5p.json
                    zip.file("h5p.json", JSON.stringify({
                      title: `BuchungsWerk ${config.typ} Klasse ${config.klasse}`,
                      language: "de",
                      mainLibrary: "H5P.QuestionSet",
                      license: "U",
                      embedTypes: ["div"],
                      preloadedDependencies: [
                        { machineName:"H5P.QuestionSet", majorVersion:1, minorVersion:20 },
                        { machineName:"H5P.MultiChoice", majorVersion:1, minorVersion:16 },
                        { machineName:"H5P.Blanks", majorVersion:1, minorVersion:14 },
                        { machineName:"H5P.DragText", majorVersion:1, minorVersion:10 },
                        { machineName:"H5P.JoubelUI", majorVersion:1, minorVersion:3 },
                        { machineName:"H5P.FontIcons", majorVersion:1, minorVersion:0 },
                      ],
                    }, null, 2));
                    // content/content.json – direkt als Pfad, kein Ordner-Eintrag
                    zip.file("content/content.json", JSON.stringify(h5pContent, null, 2));
                    // Alle Ordner-Einträge entfernen (H5P-Validator erlaubt nur Dateien)
                    Object.keys(zip.files).forEach(k => { if (zip.files[k].dir) delete zip.files[k]; });
                    // Download
                    const blob = await zip.generateAsync({ type:"blob", createFolders: false });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `BuchungsWerk_Kl${config.klasse}_${config.datum || "2026"}.h5p`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                  } catch(e) { alert("H5P-Export Fehler: " + e.message); }
                }} style={{ ...S2.bigBtn("#e8600a"), display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <Download size={14} strokeWidth={1.5}/>.h5p herunterladen
                </button>
              </div>
              <div style={{ marginTop:10, fontSize:"10px", color:"#475569", textAlign:"center" }}>
                bycs → Kurse → Aktivität hinzufügen → H5P → Datei hochladen
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// BANKING SIMULATOR – Klasse 7
// ══════════════════════════════════════════════════════════════════════════════

const BANK_IBAN = "DE12 8001 0010 0000 3456 78";
const BANK_START = 20000;

const BANK_AUFGABEN = [
  { id:"b1",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Miete abgebucht",
    story:"Im Kontoauszug siehst du folgende Abbuchung:",
    transaktion:{ datum:"03.01.2026", text:"Miete Januar · SEPA-Lastschrift · Immobilien Müller GmbH", betrag:-2400 },
    aufgabe:"Welcher Buchungssatz gehört zu dieser Kontoabbuchung?",
    soll:[{kuerzel:"AWMP",name:"Mieten und Pachten"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:2400,
    erklaerung:"Miete ist betrieblicher Aufwand → Soll: AWMP. Das Geld verlässt das Bankkonto → Haben: BK." },
  { id:"b2",  ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"Lieferantenrechnung überweisen",
    story:"Bayern Rohstoffe GmbH (IBAN: DE12 7205 0101 0012 3456 78) hat eine Rechnung gestellt: 3.500 €, Ref.: RE-2026-0112. Überweise den Betrag.",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"Bayern Rohstoffe GmbH", iban:"DE12 7205 0101 0012 3456 78", betrag:"3500", verwendung:"RE-2026-0112" },
    aufgabe:"Welcher Buchungssatz wird durch diese Banküberweisung ausgelöst?",
    soll:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:3500,
    erklaerung:"Verbindlichkeit wird beglichen → Soll: VE. Bankabgang → Haben: BK." },
  { id:"b3",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Versicherungsprämie",
    story:"Die Betriebshaftpflicht hat per Lastschrift abgebucht:",
    transaktion:{ datum:"15.01.2026", text:"ALLIANZ Versicherung · Prämie Q1 2026", betrag:-780 },
    aufgabe:"Buche diese Lastschrift korrekt.",
    soll:[{kuerzel:"VBEI",name:"Versicherungsbeiträge"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:780,
    erklaerung:"Versicherungsprämie = Versicherungsbeiträge → Soll: VBEI. Bankabbuchung → Haben: BK." },
  { id:"b4",  ansicht:"dauerauftrag", punkte:3, aktion:"dauerauftrag",
    titel:"Dauerauftrag einrichten",
    story:"Immobilien Müller GmbH (IBAN: DE45 7002 0070 0012 3456 78) vermietet euch das Büro für 1.800 € monatlich, Zahlung am 1. jeden Monats. Richte den Dauerauftrag ein.",
    dauerauftragsDaten:{ empfaenger:"Immobilien Müller GmbH", iban:"DE45 7002 0070 0012 3456 78", betrag:"1800", verwendung:"Miete Büro", rhythmus:"monatlich", tag:"1" },
    aufgabe:"Was bucht man buchhalterisch, wenn der Dauerauftrag ausgeführt wird?",
    soll:[{kuerzel:"AWMP",name:"Mieten, Pachten"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:1800,
    erklaerung:"Dauerauftrag = Miete (Aufwand AWMP) wird vom Bankkonto (BK) überwiesen." },
  { id:"b5",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Kundenzahlung eingegangen",
    story:"Auf dem Konto ist folgende Gutschrift eingegangen:",
    transaktion:{ datum:"18.01.2026", text:"Schmidt AG · RE-2026-0089 · Zahlung", betrag:+4200 },
    aufgabe:"Welcher Buchungssatz gehört zu diesem Zahlungseingang?",
    soll:[{kuerzel:"BK",name:"Bank"}], haben:[{kuerzel:"FO",name:"Forderungen aus L+L"}], betrag:4200,
    erklaerung:"Geld kommt aufs Konto → Soll: BK. Forderung erlischt → Haben: FO." },
  { id:"b6",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Gehaltsüberweisungen Januar",
    story:"Ende Januar wurden Löhne und Gehälter per Banküberweisung ausgezahlt:",
    transaktion:{ datum:"31.01.2026", text:"Gehaltsüberweisung Januar 2026 · 5 Mitarbeiter", betrag:-8500 },
    aufgabe:"Buche die Gehaltszahlung.",
    soll:[{kuerzel:"LG",name:"Löhne und Gehälter"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:8500,
    erklaerung:"Gehälter = Personalaufwand → Soll: LG. Bankabgang → Haben: BK." },
  { id:"b7",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Telefonrechnung",
    story:"Der Telekommunikationsanbieter hat die monatliche Rechnung per Lastschrift eingezogen:",
    transaktion:{ datum:"22.01.2026", text:"Telekom · Festnetz & Internet Januar", betrag:-129 },
    aufgabe:"Buche diese Lastschrift.",
    soll:[{kuerzel:"KOM",name:"Kommunikationsgebühren"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:129,
    erklaerung:"Telefonkosten = Kommunikationsgebühren → Soll: KOM. Bankabgang → Haben: BK." },
  { id:"b8",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Kasseneinlage",
    story:"Das Unternehmen zahlt 1.500 € Bargeld auf das Bankkonto ein:",
    transaktion:{ datum:"25.01.2026", text:"Bareinzahlung Kasse · Filiale München", betrag:+1500 },
    aufgabe:"Buche diese Kasseneinlage auf das Bankkonto.",
    soll:[{kuerzel:"BK",name:"Bank"}], haben:[{kuerzel:"KA",name:"Kasse"}], betrag:1500,
    erklaerung:"Geld kommt auf Bankkonto → Soll: BK. Kasse wird geleert → Haben: KA." },
  { id:"b9",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Bankgebühren",
    story:"Die BayernBank bucht monatliche Kontoführungsgebühren ab:",
    transaktion:{ datum:"31.01.2026", text:"BayernBank AG · Kontoführung Januar 2026", betrag:-18.50 },
    aufgabe:"Buche diese Bankgebühr.",
    soll:[{kuerzel:"KGV",name:"Kosten des Geldverkehrs"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:18.50,
    erklaerung:"Bankgebühren = Kosten des Geldverkehrs → Soll: KGV. Bankabgang → Haben: BK." },
  { id:"b10", ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"Werbekosten bezahlen",
    story:"Bayern Medien GmbH (IBAN: DE89 7001 0080 0012 3456 78) hat eine Rechnung für Werbeanzeigen gestellt: 450 €, Ref.: Rechnung 2026-0045 Werbung. Führe die Überweisung durch.",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"Bayern Medien GmbH", iban:"DE89 7001 0080 0012 3456 78", betrag:"450", verwendung:"Rechnung 2026-0045 Werbung" },
    aufgabe:"Welcher Buchungssatz entsteht durch diese Überweisung?",
    soll:[{kuerzel:"WER",name:"Werbung"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:450,
    erklaerung:"Werbekosten = Werbung → Soll: WER. Bankabgang → Haben: BK." },

  { id:"b11", ansicht:"beleg", punkte:4, aktion:"beleg",
    titel:"Eingangsrechnung überweisen",
    story:"Du hast folgende Eingangsrechnung erhalten. Gib die Überweisung korrekt ein und buche den Vorgang.",
    transaktion:null,
    belegDaten:{
      typ:"eingangsrechnung",
      absenderName:"Bayern Bürobedarf GmbH",
      absenderAdresse:"Kaufingerstr. 12, 80331 München",
      absenderIBAN:"DE33 7002 0270 0012 3456 89",
      rechnungsnummer:"RE-2026-0198",
      datum:"07.02.2026",
      faellig:"21.02.2026",
      positionen:[
        { menge:5, einheit:"Stk.", beschreibung:"Ordner A4 breit, blau", einzelpreis:3.20, gesamt:16.00 },
        { menge:10, einheit:"Stk.", beschreibung:"Kugelschreiber Set", einzelpreis:2.40, gesamt:24.00 },
        { menge:2, einheit:"Pck.", beschreibung:"Kopierpapier A4 500 Blatt", einzelpreis:5.00, gesamt:10.00 },
      ],
      netto:50.00, brutto:50.00,
      verwendung:"RE-2026-0198 Bürobedarf",
    },
    ueberweisungsDaten:{ empfaenger:"Bayern Bürobedarf GmbH", iban:"DE33 7002 0270 0012 3456 89", betrag:"50", verwendung:"RE-2026-0198 Bürobedarf" },
    aufgabe:"Buche die Bezahlung dieser Rechnung.",
    soll:[{kuerzel:"BMK",name:"Büromaterial und Kleingüter"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:50,
    erklaerung:"Büromaterial = Büromaterial und Kleingüter → Soll: BMK. Banküberweisung → Haben: BK." },

  { id:"b12", ansicht:"beleg", punkte:4, aktion:"beleg",
    titel:"Ausgangsrechnung eintragen",
    story:"Du hast an einen Kunden geliefert und folgende Ausgangsrechnung geschrieben. Überweise noch ausstehende Positionen und buche die Forderung als eingegangen.",
    transaktion:null,
    belegDaten:{
      typ:"ausgangsrechnung",
      absenderName:"Schmidt Handels AG",
      absenderAdresse:"Leopoldstr. 5, 80802 München",
      absenderIBAN:"DE44 7001 0080 0001 2345 67",
      rechnungsnummer:"AR-2026-0055",
      datum:"12.02.2026",
      faellig:"26.02.2026",
      positionen:[
        { menge:3, einheit:"Stk.", beschreibung:"Bürostuhl Modell Comfort", einzelpreis:189.00, gesamt:567.00 },
        { menge:1, einheit:"Stk.", beschreibung:"Schreibtisch Profi 160 cm", einzelpreis:233.00, gesamt:233.00 },
      ],
      netto:800.00, brutto:800.00,
      verwendung:"AR-2026-0055 Warenlieferung",
    },
    ueberweisungsDaten:{ empfaenger:"Schmidt Handels AG", iban:"DE44 7001 0080 0001 2345 67", betrag:"800", verwendung:"AR-2026-0055 Warenlieferung" },
    aufgabe:"Der Kunde hat die Rechnung bezahlt. Welcher Buchungssatz entsteht beim Zahlungseingang?",
    soll:[{kuerzel:"BK",name:"Bank"}], haben:[{kuerzel:"FO",name:"Forderungen aus L+L"}], betrag:800,
    erklaerung:"Geld kommt aufs Bankkonto → Soll: BK. Die Forderung erlischt → Haben: FO." },

  // ── Theorieaufgaben (Multiple Choice) ─────────────────────────────────────
  { id:"t1", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Buchungssatz",
    story:"Grundregel der doppelten Buchführung: Jeder Buchungssatz hat eine Soll- und eine Haben-Seite.",
    aufgabe:"Welche Reihenfolge gilt im Buchungssatz?",
    mcOptionen:["Soll-Konto an Haben-Konto","Haben-Konto an Soll-Konto","Aktivkonto an Passivkonto","Ertrags- an Aufwandskonto"],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Ein Buchungssatz lautet immer: Soll-Konto an Haben-Konto. Beispiel: AWMP an BK." },

  { id:"t2", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Kontotypen",
    story:"Bestandskonten teilen sich in Aktiv- und Passivkonten auf.",
    aufgabe:"Was ist die Kasse (KA) für ein Kontotyp?",
    mcOptionen:["Passivkonto (Schulden)","Erfolgskonto (Aufwand)","Aktivkonto (Vermögen)","Abschlusskonto"],
    mcKorrekt:2, soll:[], haben:[], betrag:0,
    erklaerung:"Die Kasse (KA) ist ein Aktivkonto – sie zählt zum Vermögen des Unternehmens (Aktivseite der Bilanz)." },

  // ── Kalkulationsaufgaben ───────────────────────────────────────────────────
  { id:"k1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Kalkulation: Eigenkapital",
    story:"Die Eröffnungsbilanz zeigt: Aktiva insgesamt 48.000 €, Verbindlichkeiten aus L+L (VE) 13.000 €.",
    aufgabe:"Berechne das Eigenkapital (EK = Aktiva − Schulden).",
    kalkulation:{ richtigerWert:35000, einheit:"€" },
    soll:[], haben:[], betrag:35000,
    erklaerung:"Eigenkapital = Aktiva − Schulden = 48.000 € − 13.000 € = 35.000 €" },

  { id:"k2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie", nurMitUst:true,
    titel:"Kalkulation: Bruttobetrag",
    story:"Eine Eingangsrechnung zeigt: Nettobetrag 500 €, Umsatzsteuer 19 %.",
    aufgabe:"Berechne den Bruttobetrag (Netto + 19 % USt).",
    kalkulation:{ richtigerWert:595, einheit:"€" },
    soll:[], haben:[], betrag:595,
    erklaerung:"Brutto = Netto × 1,19 = 500 × 1,19 = 595 €" },

  // ── Lückentext-Aufgaben (Kl. 7) ──────────────────────────────────────────
  { id:"lt7_1", typ:"lueckentext", ansicht:"konto", punkte:2, aktion:"lueckentext",
    titel:"Lückentext: Buchungssatz Miete",
    story:"Dein Chef schickt dir eine Notiz: Bitte vervollständige den Buchungssatz für die monatliche Miete (2.400,00 €, Bankabbuchung).",
    aufgabe:"Fülle die fehlenden Kürzel im Buchungssatz aus.",
    lueckentext:{
      template:"[L0] (6700) an [L1] (2800) — 2.400,00 €",
      luecken:[
        { id:0, hinweis:"Miet-Aufwand (Kürzel z.B. AWMP)",  korrekt:"AWMP" },
        { id:1, hinweis:"Bankkonto (Kürzel z.B. BK)",        korrekt:"BK"   }
      ]
    },
    soll:[{kuerzel:"AWMP",nr:"6700"}], haben:[{kuerzel:"BK",nr:"2800"}], betrag:2400,
    erklaerung:"Miete: AWMP (6700) im Soll – Aufwand steigt. Bank: BK (2800) im Haben – Bankguthaben sinkt." },

  // ── Zuordnung-Aufgaben (Kl. 7) ───────────────────────────────────────────
  { id:"zu7_1", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Zuordnung: Aktiv- oder Passivkonto?",
    story:"Dein Chef fragt: Auf welche Seite der Bilanz gehören diese Konten?",
    aufgabe:"Ordne jedes Konto der richtigen Bilanzseite zu.",
    zuordnung:{
      items:[
        { id:"BK", text:"BK – Bank",                      korrektKat:"A" },
        { id:"KA", text:"KA – Kasse",                     korrektKat:"A" },
        { id:"VE", text:"VE – Verbindlichkeiten aus L+L",  korrektKat:"P" },
        { id:"EK", text:"EK – Eigenkapital",               korrektKat:"P" },
        { id:"FO", text:"FO – Forderungen aus L+L",        korrektKat:"A" },
      ],
      kategorien:[
        { id:"A", label:"Aktivseite (Vermögen)", color:"#10b981", rgb:"16,185,129" },
        { id:"P", label:"Passivseite (Kapital)",  color:"#a855f7", rgb:"168,85,247" },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Aktiv (Vermögen): BK, KA, FO. Passiv (Kapital): VE (Schulden), EK (Eigenkapital). Aktiva = Mittelverwendung, Passiva = Mittelherkunft." },

  // ── Freitext-Aufgaben (Kl. 7) ─────────────────────────────────────────────
  { id:"ft7_1", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Grundsätze ordnungsgem. Buchführung",
    story:"Dein Chef fragt dich vor dem Steuerberater-Termin: Was bedeuten eigentlich die GoB?",
    aufgabe:"Erkläre in 2–3 Sätzen: Was sind die Grundsätze ordnungsgemäßer Buchführung (GoB) und wozu dienen sie?",
    freitext:{ zeilen:4, minZeichen:40,
      loesung:"Die GoB (Grundsätze ordnungsgemäßer Buchführung, §238 HGB) regeln, wie die Buchführung zu erfolgen hat. Wichtige Grundsätze sind: Vollständigkeit, Richtigkeit, Zeitgerechtheit, Klarheit und das Belegprinzip (keine Buchung ohne Beleg). Ziel: Dritte (z.B. Finanzamt, Gläubiger) sollen sich ein klares Bild der wirtschaftlichen Lage machen können." },
    erklaerung:"GoB: Grundsätze ordnungsgem. Buchführung – Vollständigkeit, Richtigkeit, Zeitgerechtheit, Klarheit, Belegprinzip. Rechtsgrundlage: §238 HGB. Klasse 7, LB 3." },

  { id:"ft7_2", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Bestandskonto vs. Erfolgskonto",
    story:"Dein Mitschüler Leo fragt dich: Was ist der Unterschied zwischen einem Bestandskonto und einem Erfolgskonto?",
    aufgabe:"Erkläre den Unterschied zwischen Bestandskonto und Erfolgskonto. Nenne je ein Beispiel.",
    freitext:{ zeilen:4, minZeichen:40,
      loesung:"Bestandskonten zeigen, was ein Unternehmen HAT (Vermögen) oder SCHULDET (Kapital). Sie erscheinen in der Bilanz und werden am Jahresende über den SBK abgeschlossen. Beispiel: BK (Bank), VE (Verbindlichkeiten). Erfolgskonten zeigen Aufwendungen oder Erträge einer Periode. Sie werden über die GuV abgeschlossen. Beispiel: LG (Löhne, Aufwand), UEFE (Umsatzerlöse, Ertrag)." },
    erklaerung:"Bestandskonten: Bilanz (Aktiv/Passiv) → SBK-Abschluss. Erfolgskonten: GuV (Aufwand/Ertrag) → GuV-Abschluss. Kl.7 LB 3/5." },

  // ── Prozentrechnung (Kl. 7 LB1) ───────────────────────────────────────────
  { id:"pz7_1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Rabattbetrag",
    story:"Dein Chef zeigt dir das Angebot von Bayern Bürobedarf GmbH: Listenpreis 320,00 €, Sofortrabatt 25 %.",
    aufgabe:"Berechne den Rabattbetrag (Grundwert × Prozentsatz).",
    kalkulation:{ richtigerWert:80, einheit:"€" },
    soll:[], haben:[], betrag:80,
    erklaerung:"Rabattbetrag = Listenpreis × Rabattsatz = 320,00 € × 0,25 = 80,00 €. (Kl.7 LB1 – Dreisatz/Prozentrechnung)" },

  { id:"pz7_2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Zieleinkaufspreis nach Rabatt",
    story:"Gleiche Rechnung: Listenpreis 320,00 €, Sofortrabatt 25 %. Du hast den Rabattbetrag (80,00 €) bereits ermittelt.",
    aufgabe:"Berechne den Zieleinkaufspreis (Listenpreis − Rabattbetrag).",
    kalkulation:{ richtigerWert:240, einheit:"€" },
    soll:[], haben:[], betrag:240,
    erklaerung:"Zieleinkaufspreis = 320,00 € − 80,00 € = 240,00 €. Wird auf dem Überweisungsformular als Zahlungsbetrag eingetragen. (Kl.7 LB1)" },

  { id:"pz7_3", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Skontobetrag",
    story:"Bayern Rohstoffe GmbH schickt eine Rechnung über 850,00 € mit dem Hinweis: '2 % Skonto bei Zahlung innerhalb 10 Tagen'.",
    aufgabe:"Berechne den Skontobetrag (Rechnungsbetrag × Skontosatz).",
    kalkulation:{ richtigerWert:17, einheit:"€" },
    soll:[], haben:[], betrag:17,
    erklaerung:"Skontobetrag = 850,00 € × 0,02 = 17,00 €. Skonto ist ein Preisnachlass bei früher Zahlung. (Kl.7 LB1)" },

  { id:"pz7_4", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Zahlbetrag nach Skonto",
    story:"Rechnungsbetrag 850,00 €, Skonto 2 % (= 17,00 €). Zahlung erfolgt innerhalb der Skontofrist.",
    aufgabe:"Berechne den Zahlbetrag (Rechnungsbetrag − Skontobetrag).",
    kalkulation:{ richtigerWert:833, einheit:"€" },
    soll:[], haben:[], betrag:833,
    erklaerung:"Zahlbetrag = 850,00 € − 17,00 € = 833,00 €. Dieser Betrag wird überwiesen. (Kl.7 LB1)" },

  { id:"pz7_5", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Umsatzsteuer-Betrag",
    story:"Dein Unternehmen kauft Büromaterial. Nettobetrag laut Rechnung: 600,00 €. Umsatzsteuer: 19 %.",
    aufgabe:"Berechne den Umsatzsteuerbetrag (Netto × 19 %).",
    kalkulation:{ richtigerWert:114, einheit:"€" },
    soll:[], haben:[], betrag:114,
    erklaerung:"USt = 600,00 € × 0,19 = 114,00 €. Die Umsatzsteuer wird als Vorsteuer (VORST) auf den Kontoauszug verbucht (ab Kl. 8). (Kl.7 LB1)" },

  { id:"pz7_6", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Grundwert ermitteln",
    story:"Die Rechnung weist einen Rabattbetrag von 45,00 € aus. Der Rabattsatz beträgt 15 %.",
    aufgabe:"Berechne den Grundwert (= Listenpreis). Formel: G = W ÷ p%",
    kalkulation:{ richtigerWert:300, einheit:"€" },
    soll:[], haben:[], betrag:300,
    erklaerung:"Grundwert = Prozentwert ÷ Prozentsatz = 45,00 € ÷ 0,15 = 300,00 €. (Kl.7 LB1 – Dreisatz)" },

  { id:"pz7_7", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Prozentsatz ermitteln",
    story:"Der Listenpreis einer Maschine beträgt 500,00 €. Der Händler gewährt einen Rabatt von 75,00 €.",
    aufgabe:"Berechne den Rabattsatz in % (Formel: p% = W ÷ G × 100).",
    kalkulation:{ richtigerWert:15, einheit:"%" },
    soll:[], haben:[], betrag:15,
    erklaerung:"Prozentsatz = 75,00 € ÷ 500,00 € × 100 = 15 %. (Kl.7 LB1 – Dreisatz)" },

  // ── Schaubild-Aufgaben (Kl. 7) ────────────────────────────────────────────
  { id:"sb7_1", typ:"mc", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Schaubild: Kostenstruktur LumiTec GmbH",
    story:"Die LumiTec GmbH hat ihre jährlichen Ausgaben nach Kostenart ausgewertet. Schau dir das Schaubild an.",
    schaubild:{
      typ:"balken",
      titel:"Kostenstruktur LumiTec GmbH (2025)",
      untertitel:"Jährliche Ausgaben nach Kostenart in €",
      einheit:"€",
      quelle:"Unternehmensbericht 2025",
      herausgeber:"Fiktive Daten – Übungszweck",
      kategorien:["Personalkosten","Wareneinkauf","Miete","Werbung","Sonstiges"],
      werte:[52000, 38000, 14400, 4500, 6100]
    },
    aufgabe:"Welcher Kostenfaktor ist der größte Ausgabenposten der LumiTec GmbH?",
    mcOptionen:["Wareneinkauf (38.000 €)","Personalkosten (52.000 €)","Miete (14.400 €)","Werbung (4.500 €)"],
    mcKorrekt:1, soll:[], haben:[], betrag:0,
    erklaerung:"Personalkosten (52.000 €) sind der größte Posten. In produzierenden Betrieben machen Löhne/Gehälter (LG) und Sozialabgaben (AGASV) oft 40–60 % der Gesamtkosten aus. (Kl.7 LB4)" },

  { id:"sb7_2", typ:"mc", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Schaubild: Umsatzentwicklung Waldform Design GmbH",
    story:"Die Waldform Design GmbH zeigt in der Betriebsversammlung die Umsatzentwicklung der letzten 5 Jahre.",
    schaubild:{
      typ:"linie",
      titel:"Umsatzentwicklung Waldform Design GmbH",
      untertitel:"Nettoumsatz in €, 2021–2025",
      einheit:"€",
      quelle:"Geschäftsbericht Waldform Design GmbH",
      herausgeber:"Fiktive Daten – Übungszweck",
      jahre:["2021","2022","2023","2024","2025"],
      werte:[95000, 112000, 108000, 124000, 138000]
    },
    aufgabe:"In welchem Jahr ist der Umsatz der Waldform Design GmbH im Vergleich zum Vorjahr gesunken?",
    mcOptionen:["2022 (von 95.000 auf 112.000 €)","2023 (von 112.000 auf 108.000 €)","2024 (von 108.000 auf 124.000 €)","2025 (von 124.000 auf 138.000 €)"],
    mcKorrekt:1, soll:[], haben:[], betrag:0,
    erklaerung:"2023 ist der Umsatz von 112.000 € (2022) auf 108.000 € gesunken – ein Rückgang von 4.000 €. In allen anderen Jahren stieg der Umsatz. (Kl.7 LB2 – Schaubild lesen)" },

  // ── Paare zuordnen (Kl. 7) ────────────────────────────────────────────────
  { id:"pa7_1", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Paare zuordnen: Kürzel → Kontoname",
    story:"Dein Chef zeigt dir einen Kontenplan-Auszug. Ordne jedem Konto-Kürzel den richtigen vollständigen Kontonamen zu.",
    aufgabe:"Welcher Kontoname gehört zu welchem Kürzel?",
    zuordnung:{
      items:[
        { id:"BK",  text:"BK",  korrektKat:"bank"   },
        { id:"KA",  text:"KA",  korrektKat:"kasse"  },
        { id:"VE",  text:"VE",  korrektKat:"verb"   },
        { id:"FO",  text:"FO",  korrektKat:"ford"   },
        { id:"LG",  text:"LG",  korrektKat:"loehne" },
      ],
      kategorien:[
        { id:"bank",   label:"Bank",                     color:"#e8600a", rgb:"232,96,10"  },
        { id:"kasse",  label:"Kasse",                    color:"#10b981", rgb:"16,185,129" },
        { id:"verb",   label:"Verbindlichkeiten aus L+L",color:"#a855f7", rgb:"168,85,247" },
        { id:"ford",   label:"Forderungen aus L+L",      color:"#3b82f6", rgb:"59,130,246" },
        { id:"loehne", label:"Löhne und Gehälter",       color:"#eab308", rgb:"234,179,8"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"BK=Bank, KA=Kasse, VE=Verbindlichkeiten aus L+L, FO=Forderungen aus L+L, LG=Löhne und Gehälter. Kürzel auswendig lernen – sie stehen in jedem Buchungssatz! (Kl.7 LB2)" },

  { id:"pa7_2", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Paare zuordnen: Buchungsregel → Kontentyp",
    story:"Dein Buchführungslehrer erklärt die vier Grundregeln der doppelten Buchführung. Ordne jede Regel dem richtigen Kontentyp zu.",
    aufgabe:"Zu welchem Kontentyp gehört welche Buchungsregel?",
    zuordnung:{
      items:[
        { id:"r1", text:"Zugänge im SOLL · Abgänge im HABEN",  korrektKat:"aktiv"   },
        { id:"r2", text:"Zugänge im HABEN · Abgänge im SOLL",  korrektKat:"passiv"  },
        { id:"r3", text:"Aufwand erhöht sich immer im SOLL",   korrektKat:"aufwand" },
        { id:"r4", text:"Ertrag erhöht sich immer im HABEN",   korrektKat:"ertrag"  },
      ],
      kategorien:[
        { id:"aktiv",   label:"Aktivkonto (Vermögen)",  color:"#10b981", rgb:"16,185,129" },
        { id:"passiv",  label:"Passivkonto (Kapital)",  color:"#a855f7", rgb:"168,85,247" },
        { id:"aufwand", label:"Aufwandskonto (GuV)",    color:"#ef4444", rgb:"239,68,68"  },
        { id:"ertrag",  label:"Ertragskonto (GuV)",     color:"#22c55e", rgb:"34,197,94"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Aktivkonten: Zugänge im Soll (Vermögen wächst). Passivkonten: Zugänge im Haben (Schulden/EK wächst). Aufwandskonto: Soll = Aufwand steigt, mindert GuV. Ertragskonto: Haben = Ertrag steigt, erhöht GuV. (Kl.7 LB3)" },

  // ── Sequenzkette Kl. 7 (LB4) ─────────────────────────────────────────────
  { id:"kette7_1", typ:"kette", ansicht:"konto", punkte:5, aktion:"kette",
    titel:"Rohstoffeinkauf: E-Mail → Fälligkeit → Buchung",
    story:"Bayern Rohstoffe GmbH hat Siliziumscheiben für die Produktion von LumiTec GmbH geliefert. Im E-Mail-Postfach liegt eine Lieferantenbenachrichtigung.",
    soll:[], haben:[], betrag:0,
    erklaerung:"Rohstoffzukauf auf Ziel: 6000 AWR an 4400 VE. Kl.7 LB4.",
    kette:[
      { typ:"mc", punkte:1, label:"E-Mail lesen",
        aufgabe:"Bayern Rohstoffe GmbH – Betreff: Lieferung Siliziumscheiben, Rg.-Nr. BR-2026-0115\n\nSehr geehrte Damen und Herren,\nhiermit bestätigen wir die Lieferung von 500 kg Siliziumscheiben.\nNettobetrag: 350,00 €  ·  Rechnungsdatum: 10.01.2026  ·  Zahlungsziel: 14 Tage\n\nWie hoch ist der Rechnungsbetrag?",
        mcOptionen:["200,00 €","280,00 €","350,00 €","420,00 €"],
        mcKorrekt:2,
        erklaerung:"Der Nettobetrag steht direkt in der E-Mail: 350,00 €. Immer Beleg prüfen – GoB: Belegprinzip!" },
      { typ:"mc", punkte:1, label:"Fälligkeit prüfen",
        aufgabe:"Rechnungsdatum: 10. Januar 2026  ·  Zahlungsziel: 14 Tage\n\nBis wann muss LumiTec GmbH spätestens zahlen?\n(Tipp: Zähle 14 Tage ab dem 10. Januar!)",
        mcOptionen:["17. Januar 2026","24. Januar 2026","31. Januar 2026","10. Februar 2026"],
        mcKorrekt:1,
        erklaerung:"10. Jan + 14 Tage = 24. Januar 2026. Dieser Termin gehört als Zahlungsfrist in den Kalender – so wird keine Mahnung fällig!" },
      { typ:"buchung", punkte:3, label:"Buchungssatz",
        aufgabe:"Buche den Rohstoffeinkauf auf Ziel:\nSiliziumscheiben, 350,00 € (ohne USt, Kl.7 LB4).",
        soll:[{kuerzel:"AWR",nr:"6000"}],
        haben:[{kuerzel:"VE",nr:"4400"}],
        betrag:350,
        erklaerung:"Rohstoff auf Ziel zugekauft: Aufwendungen für Rohstoffe (6000 AWR) ↑ im Soll, Verbindlichkeiten aus L+L (4400 VE) entstehen im Haben. Kl.7 LB4." },
    ] },

  { id:"kette7_2", typ:"kette", ansicht:"konto", punkte:4, aktion:"kette",
    titel:"Verkauf von Fertigerzeugnissen: E-Mail → Buchung",
    story:"Kunde TechBau AG hat Solarmodule bestellt und bezahlt. Im Posteingang liegt eine Zahlungsbestätigung der BayernBank AG.",
    soll:[], haben:[], betrag:0,
    erklaerung:"Verkauf auf Ziel: FO an UEFE. Kl.7 LB4.",
    kette:[
      { typ:"mc", punkte:1, label:"E-Mail lesen",
        aufgabe:"BayernBank AG – Betreff: Zahlungseingang Kd.-Nr. KD-4821\n\nSehr geehrte Damen und Herren,\nfolgender Zahlungseingang wurde gebucht:\nAuftraggeberin: TechBau AG, Nürnberg\nVerwendungszweck: RE LT-2026-0072 · Solarmodule\nBetrag: 1.190,00 € (brutto, inkl. 19% USt)\n\nWie hoch ist der Bruttobetrag laut E-Mail?",
        mcOptionen:["950,00 €","1.000,00 €","1.190,00 €","1.250,00 €"],
        mcKorrekt:2,
        erklaerung:"Bruttobetrag = 1.190,00 €. Dieser Betrag inkl. USt steht auf der Ausgangsrechnung und im Bankeingang." },
      { typ:"kalkulation", punkte:1, label:"Nettobetrag",
        aufgabe:"Der Bruttobetrag beträgt 1.190,00 € (inkl. 19% USt).\n\nBerechne den Nettobetrag (Umsatzerlös):\nNetto = Brutto ÷ 1,19",
        kalkulation:{ richtigerWert:1000, einheit:"€" },
        erklaerung:"1.190 ÷ 1,19 = 1.000,00 €. Der Nettobetrag ist der eigentliche Umsatzerlös – die USt gehört dem Finanzamt." },
      { typ:"buchung", punkte:2, label:"Buchungssatz",
        aufgabe:"Buche den Zahlungseingang von TechBau AG:\n1.190,00 € Brutto (vereinfacht: BK an FO).",
        soll:[{kuerzel:"BK",nr:"2800"}],
        haben:[{kuerzel:"FO",nr:"2400"}],
        betrag:1190,
        erklaerung:"Zahlung eingegangen: Bank (2800 BK) erhöht sich im Soll, Forderung aus L+L (2400 FO) sinkt im Haben. Kl.7 LB3/4." },
    ] },
];

// Welches Desk-Item ist für welchen Aufgabentyp zuständig?
const DESK_MAP = { buchung:"email", ueberweisung:"pc", dauerauftrag:"kalender", beleg:"post", theorie:"email", kette:"email",
  aktie_kauf:"boerse", aktie_verkauf:"boerse", dividende:"post",
  klr:"klr",
  lueckentext:"email", zuordnung:"post", multi_mc:"email", freitext:"email" };

// ── Klasse 8 – Simulationsaufgaben ────────────────────────────────────────────
const BANK8_AUFGABEN = [
  { id:"b8_1", ansicht:"beleg", aktion:"buchung",
    titel:"Eingangsrechnung mit Frachtkosten",
    story:"LumiTec GmbH hat folgende Eingangsrechnung von Alumet Bayern GmbH erhalten (Kauf auf Ziel, Zahlungsziel 30 Tage):",
    transaktion:null,
    belegDaten:{
      typ:"eingangsrechnung",
      absenderName:"Alumet Bayern GmbH",
      absenderAdresse:"Gewerbepark 7, 85221 Dachau",
      absenderIBAN:"DE44 7001 0080 0123 4567 89",
      rechnungsnummer:"RE-AB-2026-0041",
      datum:"09.01.2026", faellig:"08.02.2026",
      positionen:[
        { menge:40, einheit:"Stk.", beschreibung:"Aluminiumrahmen für Solarmodule (Rohstoff)", einzelpreis:15.00, gesamt:600.00 },
        { menge:1,  einheit:"Psch.", beschreibung:"Frachtkosten Spedition Schäfer GmbH", einzelpreis:60.00, gesamt:60.00 },
      ],
      netto:660.00, brutto:785.40,
      verwendung:"RE-AB-2026-0041 Aluminiumrahmen",
    },
    aufgabe:"Buche diesen Rechnungseingang auf Ziel (vollständig mit USt). Drei Soll-Konten: Rohstoffwert, Frachtkosten und Vorsteuer – ein Haben-Konto.",
    soll:[
      {kuerzel:"AWR",  name:"Aufwendungen Rohstoffe",       nr:"6000", betrag:600.00},
      {kuerzel:"BZKR", name:"Bezugskosten Rohstoffe",       nr:"6001", betrag:60.00},
      {kuerzel:"VORST",name:"Vorsteuer",                    nr:"2600", betrag:125.40},
    ],
    haben:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L",nr:"4400", betrag:785.40}],
    punkte:4,
    betrag:785.40,
    erklaerung:"Zusammengesetzter Buchungssatz: 6000 AWR 600,00 + 6001 BZKR 60,00 + 2600 VORST 125,40 an 4400 VE 785,40. Rohstoffwert → AWR · Frachtkosten → BZKR · 19 % USt → VORST · Verbindlichkeit auf Ziel → VE (Kl.8 LB2)." },

  { id:"b8_2", ansicht:"beleg", punkte:2, aktion:"beleg",
    titel:"Eingangsrechnung Rohstoffe",
    story:"Bayern Rohstoffe GmbH hat folgende Rechnung für gelieferte Solarmodulglas-Platten zugeschickt (Kauf auf Ziel, Zahlungsziel 14 Tage):",
    transaktion:null,
    belegDaten:{
      typ:"eingangsrechnung",
      absenderName:"Bayern Rohstoffe GmbH",
      absenderAdresse:"Industriestraße 12, 86150 Augsburg",
      absenderIBAN:"DE12 7205 0101 0012 3456 78",
      rechnungsnummer:"RE-2026-0042",
      datum:"08.01.2026", faellig:"22.01.2026",
      positionen:[
        { menge:200, einheit:"kg", beschreibung:"Solarmodulglas geschnitten 4 mm (Rohstoff)", einzelpreis:10.00, gesamt:2000.00 },
      ],
      netto:2000.00, brutto:2380.00,
      verwendung:"RE-2026-0042 Solarmodulglas",
    },
    ueberweisungsDaten:{ empfaenger:"Bayern Rohstoffe GmbH", iban:"DE12 7205 0101 0012 3456 78", betrag:"2380", verwendung:"RE-2026-0042 Solarmodulglas" },
    aufgabe:"Buche diesen Rohstoffeinkauf auf Ziel (vereinfacht ohne USt, netto 2.000,00 €). Welche Konten kommen ins Soll und ins Haben?",
    soll:[{kuerzel:"AWR",name:"Aufwendungen Rohstoffe",nr:"6000"}],
    haben:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L",nr:"4400"}],
    betrag:2000,
    erklaerung:"Rohstoffe auf Ziel (vereinfacht): AWR (6000) im Soll, netto 2.000,00 €. Verbindlichkeit VE (4400) im Haben. Vollständig mit USt: 6000 AWR 2.000,00 + 2600 VORST 380,00 an 4400 VE 2.380,00." },

  { id:"b8_3", ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"Verbindlichkeit überweisen",
    story:"Bayern Rohstoffe GmbH (IBAN: DE12 7205 0101 0012 3456 78) – die Rechnung RE-2026-0042 ist fällig. Betrag: 2.380 €. Überweise den Betrag.",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"Bayern Rohstoffe GmbH", iban:"DE12 7205 0101 0012 3456 78", betrag:"2380", verwendung:"RE-2026-0042 Rohstoffe" },
    aufgabe:"Welcher Buchungssatz entsteht beim Begleichen der Verbindlichkeit per Banküberweisung?",
    soll:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L",nr:"4400"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:2380,
    erklaerung:"Verbindlichkeit erlischt → VE (4400) im Soll. Bank wird belastet → BK (2800) im Haben." },

  { id:"b8_4", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Nachlass vom Lieferanten",
    story:"Bayern Rohstoffe GmbH sendet euch eine Gutschrift (GS-2026-0018): Wegen festgestellter Mängel gewährt sie einen nachträglichen Preisnachlass von 150 €. Die Verbindlichkeit aus der ursprünglichen Rechnung verringert sich entsprechend.",
    transaktion:null,
    aufgabe:"Buche den Preisnachlass laut Gutschrift: Die Verbindlichkeit (VE) sinkt im Soll – welches Erlöskorrektur-/Nachlasskonto kommt ins Haben? (Signalwort: Nachlass für Rohstoffe)",
    soll:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L",nr:"4400"}],
    haben:[{kuerzel:"NR",name:"Nachlässe für Rohstoffe",nr:"6002"}],
    betrag:150,
    erklaerung:"Verbindlichkeit sinkt → VE (4400) im Soll. Nachlass für Rohstoffe → NR (6002) im Haben." },

  { id:"b8_5", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Fertigerzeugnisse auf Ziel verkauft",
    story:"Ihr habt an TechBau AG Fertigerzeugnisse auf Ziel (= gegen Rechnung, Zahlungsziel 14 Tage) geliefert. Ausgangsrechnung AR-2026-0021: 4.760 € brutto (= 4.000 € netto). Das Geld ist noch nicht eingegangen.",
    transaktion:null,
    aufgabe:"Buche den Verkauf auf Ziel (vereinfacht): Eine Forderung entsteht (FO im Soll), ein Umsatzerlös wird realisiert (UEFE im Haben). Betrag: 4.760 €.",
    soll:[{kuerzel:"FO",name:"Forderungen aus L+L",nr:"2400"}],
    haben:[{kuerzel:"UEFE",name:"Umsatzerlöse FE",nr:"5000"}],
    betrag:4760,
    erklaerung:"Forderung entsteht → FO (2400) im Soll. Umsatzerlös realisiert → UEFE (5000) im Haben." },

  { id:"b8_6", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Kundenzahlung eingegangen",
    story:"TechBau AG hat die Rechnung vollständig bezahlt. Auf dem Kontoauszug siehst du:",
    transaktion:{ datum:"26.01.2026", text:"TechBau AG · AR-2026-0021 · Zahlung", betrag:+4760 },
    aufgabe:"Welcher Buchungssatz gehört zu diesem Zahlungseingang?",
    soll:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    haben:[{kuerzel:"FO",name:"Forderungen aus L+L",nr:"2400"}],
    betrag:4760,
    erklaerung:"Geld kommt auf Bankkonto → BK (2800) im Soll. Forderung erlischt → FO (2400) im Haben." },

  { id:"b8_7", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Kunde zieht Skonto ab",
    story:"Maier Technik GmbH hat eine Rechnung über 2.380 € bezahlt, aber 2 % Skonto (= 47,60 €) abgezogen und nur 2.332,40 € überwiesen:",
    transaktion:{ datum:"20.01.2026", text:"Maier Technik GmbH · AR-2026-0018 · Zahlung abzgl. 2 % Skonto", betrag:+2332.40 },
    aufgabe:"Buche den Skontoabzug des Kunden – die Erlösberichtigung (Differenz: 47,60 €).",
    soll:[{kuerzel:"EBFE",name:"Erlösberichtigungen FE",nr:"5001"}],
    haben:[{kuerzel:"FO",name:"Forderungen aus L+L",nr:"2400"}],
    betrag:47.60,
    erklaerung:"Kundenskonto = Erlösminderung → EBFE (5001) im Soll. Forderung sinkt → FO (2400) im Haben." },

  { id:"b8_8", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Gehälter überwiesen",
    story:"Ende Januar wurden die Nettolöhne per Banküberweisung ausgezahlt:",
    transaktion:{ datum:"31.01.2026", text:"Gehaltsüberweisung Januar 2026 · 4 Mitarbeiter", betrag:-7200 },
    aufgabe:"Buche die Gehaltszahlung (vereinfacht: Bruttolohn direkt an Bank).",
    soll:[{kuerzel:"LG",name:"Löhne und Gehälter",nr:"6200"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:7200,
    erklaerung:"Personalaufwand → LG (6200) im Soll. Bankabgang → BK (2800) im Haben. (Vollständig: LG / VFA + VSV + BK)" },

  { id:"b8_9", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"AG-Sozialversicherung überwiesen",
    story:"Das Unternehmen überweist den Arbeitgeberanteil zur Sozialversicherung:",
    transaktion:{ datum:"31.01.2026", text:"DAK Gesundheit · AG-Anteil SV Jan 2026 · SEPA", betrag:-1800 },
    aufgabe:"Buche den Arbeitgeberanteil zur Sozialversicherung.",
    soll:[{kuerzel:"AGASV",name:"AG-Anteil Sozialversicherung",nr:"6400"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:1800,
    erklaerung:"AG-Anteil SV = betrieblicher Personalaufwand → AGASV (6400) im Soll. Bankabgang → BK (2800) im Haben." },

  { id:"b8_10", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Gewerbesteuer-Vorauszahlung",
    story:"Das Finanzamt hat die Gewerbesteuer-Vorauszahlung per SEPA eingezogen:",
    transaktion:{ datum:"15.02.2026", text:"Finanzamt München · Gewerbesteuer VZ Q1/2026", betrag:-3200 },
    aufgabe:"Buche diese Gewerbesteuerzahlung.",
    soll:[{kuerzel:"GWST",name:"Gewerbesteuer",nr:"7000"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:3200,
    erklaerung:"Gewerbesteuer = Betriebssteuer → GWST (7000) im Soll. Bankabgang → BK (2800) im Haben." },

  { id:"b8_11", ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"USt-Zahllast überweisen",
    story:"Die monatliche Umsatzsteuer-Zahllast (USt − Vorsteuer) beträgt 940 €. Überweise an das Finanzamt (IBAN: DE86 7000 0000 0070 0070 07, Ref.: USt Jan 2026).",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"Finanzamt München", iban:"DE86 7000 0000 0070 0070 07", betrag:"940", verwendung:"USt Jan 2026" },
    aufgabe:"Welcher Buchungssatz entsteht bei der Überweisung der Umsatzsteuer-Zahllast?",
    soll:[{kuerzel:"UST",name:"Umsatzsteuer",nr:"4800"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:940,
    erklaerung:"USt-Verbindlichkeit erlischt → UST (4800) im Soll. Bankabgang → BK (2800) im Haben." },

  { id:"b8_12", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Werbeanzeige bezahlt",
    story:"Medienhaus Bayern GmbH hat eine Rechnung für eine Werbeanzeige per Lastschrift eingezogen:",
    transaktion:{ datum:"17.01.2026", text:"Medienhaus Bayern GmbH · Werbeanzeige Jan 2026", betrag:-595 },
    aufgabe:"Buche diese Werbekosten.",
    soll:[{kuerzel:"WER",name:"Werbung",nr:"6870"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:595,
    erklaerung:"Werbekosten = betrieblicher Aufwand → WER (6870) im Soll. Bankabgang → BK (2800) im Haben." },

  { id:"t8_1", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Bezugskosten",
    story:"Beim Werkstoffeinkauf fallen neben dem Kaufpreis noch weitere Kosten an.",
    aufgabe:"Was versteht man unter Bezugskosten (z.B. BZKR 6001)?",
    mcOptionen:["Rabatte des Lieferanten","Transport- und Frachtkosten beim Einkauf","Rücksendungen an den Lieferanten","Provisionen an Handelsvertreter"],
    mcKorrekt:1, soll:[], haben:[], betrag:0,
    erklaerung:"Bezugskosten (BZKR 6001) sind Transport- und Frachtkosten, die beim Einkauf von Rohstoffen anfallen." },

  { id:"k8_1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Kalkulation: Nettobetrag ermitteln",
    story:"Eine Eingangsrechnung zeigt: Bruttobetrag 2.380 €, Umsatzsteuer 19 %.",
    aufgabe:"Berechne den Nettobetrag (Netto = Brutto ÷ 1,19).",
    kalkulation:{ richtigerWert:2000, einheit:"€" },
    soll:[], haben:[], betrag:2000,
    erklaerung:"Netto = 2.380 ÷ 1,19 = 2.000,00 €. Nettobetrag ist Basis für AWR (6000) und VORST (2600)." },

  // ── Lückentext (Kl. 8) ───────────────────────────────────────────────────
  { id:"lt8_1", typ:"lueckentext", ansicht:"konto", punkte:3, aktion:"lueckentext",
    titel:"E-Mail: Buchungsanweisung Rohstoffe auf Ziel",
    story:"E-Mail der Buchhaltungsleitung: Bitte den Rohstoffkauf von Bayern Rohstoffe GmbH (Brutto 2.380,00 €, Netto 2.000,00 €, USt 380,00 €) auf Ziel buchen.",
    aufgabe:"Vervollständige den zusammengesetzten Buchungssatz (Kürzel oder Nr.).",
    lueckentext:{
      template:"[L0] (6000) + VORST (2600) an [L1] (4400) — Brutto 2.380,00 €",
      luecken:[
        { id:0, hinweis:"Rohstoff-Aufwand (AWR oder 6000)",     korrekt:"AWR",  korrektAlt:["6000"] },
        { id:1, hinweis:"Verbindlichkeiten Lieferant (VE/4400)", korrekt:"VE",   korrektAlt:["4400"] }
      ]
    },
    soll:[{kuerzel:"AWR",nr:"6000"},{kuerzel:"VORST",nr:"2600"}], haben:[{kuerzel:"VE",nr:"4400"}], betrag:2380,
    erklaerung:"Rohstoffe auf Ziel: AWR + VORST im Soll (Aufwand + Vorsteuer). VE im Haben (Verbindlichkeit entsteht). (Kl.8 LB2)" },

  // ── Multi-Choice (Kl. 8) ─────────────────────────────────────────────────
  { id:"mc8_1", typ:"multi_mc", ansicht:"konto", punkte:2, aktion:"multi_mc",
    titel:"Multi-Choice: Löhne überweisen – was stimmt?",
    story:"Der Chef testet dein Kontenwissen. Gehälter i.H.v. 8.500,00 € werden per Bank überwiesen.",
    aufgabe:"Welche Aussagen sind RICHTIG? (Mehrere Antworten möglich)",
    mcOptionen:[
      "LG (6200) kommt ins Soll",
      "BK (2800) kommt ins Soll",
      "BK (2800) kommt ins Haben",
      "LG (6200) ist ein Aufwandskonto",
    ],
    multiKorrekt:[0, 2, 3],
    soll:[], haben:[], betrag:0,
    erklaerung:"Richtig: A, C, D – Löhne LG (6200) ins Soll (Aufwand steigt). Bank BK (2800) ins Haben (sinkt). LG ist ein Aufwandskonto. B ist falsch: BK kommt ins Haben, nicht ins Soll. (Kl.8 LB5)" },

  // ── Freitext-Aufgaben (Kl. 8) ─────────────────────────────────────────────
  { id:"ft8_1", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Skonto, Rabatt, Bonus – Unterschiede",
    story:"Beim Durchsehen der Eingangsrechnung von Bayern Rohstoffe GmbH siehst du: 3 % Rabatt, 2 % Skonto, Jahresbonus 1 %.",
    aufgabe:"Erkläre den Unterschied zwischen Rabatt, Skonto und Bonus. Wann wird welcher gewährt?",
    freitext:{ zeilen:5, minZeichen:50,
      loesung:"Rabatt: Preisnachlass beim Kauf, z.B. für große Abnahmemengen oder als Treuerabatt – wird sofort vom Listenpreis abgezogen (Anschaffungspreisminderung, Konto NR/NF/NH). Skonto: Preisnachlass für schnelle Zahlung innerhalb der Skontofrist (z.B. 2 % bei Zahlung binnen 10 Tagen) – Konto EBFE/5001 beim Verkauf, NR-ähnlich beim Einkauf. Bonus: Nachträglicher Jahresrabatt bei Erreichen einer bestimmten Abnahmemenge, wird am Jahresende gutgeschrieben. Alle drei sind Anschaffungspreisminderungen." },
    erklaerung:"Rabatt (sofort), Skonto (bei früher Zahlung), Bonus (nachträglich bei Jahresumsatz). Alle mindern die Anschaffungskosten. Kl.8 LB2." },

  { id:"ft8_2", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Warum Rohstoffverbrauch als Aufwand?",
    story:"Dein Chef erklärt dir die Gewinn- und Verlustrechnung. Er fragt: Weißt du, warum der Rohstoffeinsatz als Aufwand erscheint und nicht einfach als Lagerbestand stehen bleibt?",
    aufgabe:"Begründe, warum der Rohstoffverbrauch (Einsatz für die Produktion) als Aufwand gebucht wird und nicht als Bestand.",
    freitext:{ zeilen:4, minZeichen:40,
      loesung:"Wenn Rohstoffe ins Lager kommen, sind sie Vermögen (Bestandskonto R, 2000) – das Unternehmen hat etwas. Sobald sie für die Produktion verbraucht werden, verlässt ihr Wert das Unternehmen: Sie werden zu einem Produkt umgewandelt, dessen Wert noch nicht realisiert ist. Dieser Verbrauch senkt das Vermögen und ist deshalb ein Aufwand (AWR 6000) – er erscheint in der GuV und mindert den Gewinn. Buchungssatz: AWR an R." },
    erklaerung:"Rohstoffe im Lager = Bestand (Aktivkonto). Rohstoffverbrauch für Produktion = Aufwand (AWR 6000). GoB: Aufwände werden in der Periode erfasst, in der sie entstehen. Kl.8 LB2/LB4." },

  // ── Paare zuordnen (Kl. 8) ────────────────────────────────────────────────
  { id:"pa8_1", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Paare zuordnen: Kontonummer → Kontoname",
    story:"Der Buchhalter legt dir einen Kontenplan-Auszug vor. Ordne jeder vierstelligen Kontonummer den richtigen Kontonamen zu.",
    aufgabe:"Welcher Kontoname gehört zu welcher Kontonummer?",
    zuordnung:{
      items:[
        { id:"n6000", text:"6000", korrektKat:"awr"   },
        { id:"n4400", text:"4400", korrektKat:"ve"    },
        { id:"n2600", text:"2600", korrektKat:"vorst" },
        { id:"n3800", text:"3800", korrektKat:"aust"  },
        { id:"n2000", text:"2000", korrektKat:"r"     },
      ],
      kategorien:[
        { id:"awr",   label:"AWR – Aufwand f. Rohstoffe",   color:"#e8600a", rgb:"232,96,10"  },
        { id:"ve",    label:"VE – Verbindlichkeiten L+L",   color:"#a855f7", rgb:"168,85,247" },
        { id:"vorst", label:"VORST – Vorsteuer",            color:"#10b981", rgb:"16,185,129" },
        { id:"aust",  label:"AUST – Umsatzsteuer",          color:"#ef4444", rgb:"239,68,68"  },
        { id:"r",     label:"R – Rohstoffe (Lager)",        color:"#3b82f6", rgb:"59,130,246" },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"6000 AWR (Rohstoffaufwand), 4400 VE (Verbindlichkeiten L+L), 2600 VORST (abziehbare Vorsteuer, Aktivkonto), 3800 AUST (Umsatzsteuerverbindlichkeit, Passivkonto), 2000 R (Rohstofflager). (Kl.8 LB2/LB3)" },

  // ── Sequenzkette Kl. 8 (LB2) ─────────────────────────────────────────────
  { id:"kette8_1", typ:"kette", ansicht:"konto", punkte:8, aktion:"kette",
    titel:"Eingangsrechnung mit Bezugskosten: Komplett-Workflow",
    story:"Waldform Design GmbH erhält eine Eingangsrechnung von Südbayer Werkstoffe KG für Eichenholzbohlen inkl. Frachtkosten der Spedition.",
    soll:[], haben:[], betrag:0,
    erklaerung:"Eingangsrechnung: AWR + BZKR im Soll, VE im Haben. Kl.8 LB2.",
    kette:[
      { typ:"mc", punkte:1, label:"Beleg prüfen",
        aufgabe:"Eingangsrechnung, Südbayer Werkstoffe KG, Regensburg\nRg.-Nr. SW-2026-0882  ·  Datum: 15.01.2026\n\n· Eichenholzbohlen (Rohstoffe):    800,00 €\n· Frachtkosten Spedition Bayern:    60,00 €\n· Gesamtnetto:                      860,00 €\n\nIn welches Konto werden die Frachtkosten beim Rohstoffeinkauf gebucht?",
        mcOptionen:["6000 AWR – Aufwendungen für Rohstoffe","6001 BZKR – Bezugskosten Rohstoffe","4400 VE – Verbindlichkeiten aus L+L","2600 VORST – Vorsteuer"],
        mcKorrekt:1,
        erklaerung:"Frachtkosten beim Rohstoffeinkauf = Bezugskosten → 6001 BZKR. Sie erhöhen den Einstandspreis! Kl.8 LB2." },
      { typ:"kalkulation", punkte:2, label:"Einstandspreis",
        aufgabe:"Berechne den Gesamtnettobetrag (Einstandspreis) der Lieferung:\n· Eichenholzbohlen:  800,00 €\n· Frachtkosten:       60,00 €\n\nEinstandspreis = Warenpreis + Bezugskosten",
        kalkulation:{ richtigerWert:860, einheit:"€" },
        erklaerung:"Einstandspreis = 800 + 60 = 860,00 €. Das ist der tatsächliche Aufwand, der in die Bücher kommt. Kl.8 LB2." },
      { typ:"buchung", punkte:2, label:"Buchung: Rohstoffe",
        aufgabe:"Buche den Rohstoff-Nettobetrag (ohne Frachtkosten): 800,00 € auf Ziel.\nHinweis: Vereinfacht ohne USt.",
        soll:[{kuerzel:"AWR",nr:"6000"}],
        haben:[{kuerzel:"VE",nr:"4400"}],
        betrag:800,
        erklaerung:"Rohstoffaufwand (6000 AWR) ↑ im Soll, Verbindlichkeit (4400 VE) entsteht im Haben. Kl.8 LB2." },
      { typ:"buchung", punkte:3, label:"Buchung: Frachtkosten",
        aufgabe:"Buche die Frachtkosten (Bezugskosten Rohstoffe): 60,00 € ebenfalls auf Ziel.\nBeachte: Frachtkosten → eigenes Konto BZKR!",
        soll:[{kuerzel:"BZKR",nr:"6001"}],
        haben:[{kuerzel:"VE",nr:"4400"}],
        betrag:60,
        erklaerung:"Bezugskosten Rohstoffe (6001 BZKR) ↑ im Soll, Verbindlichkeit (4400 VE) ↑ im Haben. Zusammen mit AWR: Einstandspreis 860 €. Kl.8 LB2." },
    ] },
];

const KALENDER8_EINTRAEGE = [
  // Jan 1 = Neujahr (Feiertag) → Freitag 2.1.
  { tag:2,  text:"Nettolöhne überweisen (Personalabrechnung)",    typ:"task", aufgabeAktion:"buchung"      },
  { tag:8,  text:"Eingangsrechnung Bayern Rohstoffe prüfen",       typ:"task", aufgabeAktion:"beleg"        },
  // Jan 9 = Samstag → Dienstag 13.1. (12.1. Mon = Steuerberater)
  { tag:12, text:"Steuerberater-Termin · Gewerbesteuer",           typ:"info"                              },
  { tag:13, text:"Frachtkosten Spedition Meyer verbuchen",         typ:"task", aufgabeAktion:"buchung"      },
  // Jan 17 = Samstag → Freitag 16.1.
  { tag:16, text:"Werbung Medienhaus Bayern bezahlen",             typ:"task", aufgabeAktion:"buchung"      },
  { tag:20, text:"Kundenzahlung Maier Technik (Skonto prüfen!)",   typ:"task", aufgabeAktion:"buchung"      },
  { tag:22, text:"Verbindlichkeit Bayern Rohstoffe überweisen",    typ:"task", aufgabeAktion:"ueberweisung" },
  { tag:26, text:"Kundenzahlung TechBau AG eingetroffen",          typ:"task", aufgabeAktion:"buchung"      },
  { tag:28, text:"AG-SV + USt-Zahllast: Frist prüfen!",           typ:"info"                              },
  // Jan 31 = Samstag → Freitag 30.1.
  { tag:30, text:"Monatsabschluss: Buchungen kontrollieren",       typ:"info"                              },
];

// Geschäftskalender – dynamisch; wird auf den aktuellen Monat gemappt
// typ:"task" = auswählbar + farbcodiert; typ:"info" = nur Hinweis
const KALENDER_EINTRAEGE = [
  // Jan 1 = Neujahr (Feiertag) → Bank-Ausführung am 2.1. (Freitag)
  { tag:2,  text:"Dauerauftrag Miete ausführen (2.400 €)",       typ:"task", aufgabeAktion:"dauerauftrag" },
  // Jan 3 = Samstag → Montag 5.1. belegt → Mittwoch 7.1.
  { tag:5,  text:"Gehaltsabrechnung vorbereiten",                 typ:"info" },
  { tag:7,  text:"Miete abgebucht → Buchung erfassen",            typ:"info" },
  { tag:8,  text:"Angebot Bayern Rohstoffe GmbH einholen",        typ:"info" },
  // Jan 10 = Samstag → Freitag 9.1.
  { tag:9,  text:"Steuerberater-Termin 14:00 Uhr (Finanzamt)",    typ:"info" },
  { tag:15, text:"ALLIANZ: Versicherungsprämie fällig (780 €)",   typ:"task", aufgabeAktion:"buchung"     },
  // Jan 18 = Sonntag → Montag 19.1.
  { tag:19, text:"Kundenzahlung Schmidt AG prüfen",               typ:"task", aufgabeAktion:"buchung"     },
  { tag:22, text:"Telefonrechnung Telekom einbuchen",             typ:"task", aufgabeAktion:"buchung"     },
  // Jan 25 = Sonntag → Montag 26.1.
  { tag:26, text:"Bankauszug prüfen + buchen",                    typ:"info" },
  { tag:28, text:"Offene Buchungsfälle erledigen",                typ:"task", aufgabeAktion:"buchung"     },
  // Jan 31 = Samstag → Freitag 30.1.
  { tag:30, text:"Gehälter überweisen (8.500 €) + LSt melden",   typ:"info" },
];

// ── Klasse 9 – Börsenspiel (LB4 Kapitalanlage) ───────────────────────────────

// 5 fiktive Bayern-Aktien mit deterministischen Kursverläufen (Jan 2026, 30 Tage)
// Kurs-Arrays: Index 0 = Tag 1, Index 29 = Tag 30
const BOERSEN_AKTIEN = [
  { id:"BSOL", name:"BayernSolar AG",  kuerzel:"BSOL", branche:"Solar/Energie",
    startKurs:48.50,
    kurse:[48.50,48.80,49.10,49.35,52.65,52.10,51.80,51.90,52.20,52.10,
           51.80,51.95,52.30,52.40,52.50,53.10,53.50,53.80,54.00,54.20,
           54.15,54.00,54.10,54.20,54.30,54.40,54.20,54.50,54.60,54.70] },
  { id:"SUDB", name:"SüdBau AG",       kuerzel:"SUDB", branche:"Immobilien",
    startKurs:52.00,
    kurse:[52.00,52.20,52.10,52.30,52.50,52.40,52.20,51.80,51.50,51.20,
           50.80,50.30,50.50,50.60,51.00,51.20,51.00,51.10,51.30,52.00,
           52.10,52.20,52.00,51.80,51.90,52.10,52.00,51.90,52.00,52.10] },
  { id:"BFOO", name:"BavariaFood AG",  kuerzel:"BFOO", branche:"Lebensmittel",
    startKurs:38.20,
    kurse:[38.20,38.30,38.25,38.40,38.60,38.50,38.45,38.20,38.00,37.90,
           37.75,37.80,38.00,38.10,38.20,38.30,38.40,38.50,38.60,39.20,
           39.10,39.00,39.10,39.20,39.30,39.40,39.30,39.40,39.50,39.60] },
  { id:"ALPM", name:"AlpenMobil KGaA", kuerzel:"ALPM", branche:"Mobilität/Transport",
    startKurs:67.80,
    kurse:[67.80,68.10,68.50,68.30,69.00,68.80,68.50,68.20,68.00,67.80,
           67.50,67.20,66.80,66.50,59.90,60.50,61.20,61.80,62.50,64.20,
           64.50,64.80,65.00,65.20,65.50,65.80,66.00,66.20,66.50,66.80] },
  { id:"MTEX", name:"MünchTex AG",     kuerzel:"MTEX", branche:"Textil/Mode",
    startKurs:24.50,
    kurse:[24.50,24.70,24.60,24.80,25.10,24.90,24.80,24.70,24.60,24.50,
           24.40,24.30,24.50,24.60,24.80,24.70,24.60,24.50,24.40,24.80,
           24.90,24.70,24.60,24.50,24.30,20.10,20.50,20.80,21.00,21.20] },
];

// Kursereignisse für Nachrichten-Feed im Börsencockpit
const BOERSEN_EREIGNISSE = [
  { tag:5,  ticker:"BSOL", pct:+8.3,  text:"BayernSolar AG: Quartalsbericht – Rekordgewinn, Kurs +8,3 %" },
  { tag:12, ticker:"SUDB", pct:-4.1,  text:"EZB-Entscheidung: Leitzins stabil – Immobilienaktien unter Druck, SUDB −4,1 %" },
  { tag:15, ticker:"ALPM", pct:-11.5, text:"AlpenMobil KGaA: Gewinnwarnung – Auftragseingang −15 %, Kurs −11,5 %" },
  { tag:20, ticker:null,   pct:+2.5,  text:"DAX-Allzeithoch! Breite Kursgewinne an allen deutschen Börsen" },
  { tag:26, ticker:"MTEX", pct:-18.0, text:"MünchTex AG: Insolvenzgerücht – Aktie bricht massiv ein, −18 %" },
];

// ── Klasse 9 – Simulationsaufgaben (LB2 Anlagen, LB3 Finanzierung, LB4 Kapitalanlage, LB5 Forderungen)
// bwr-sensei-check: Klasse 9 → du/dir · Konten: 1500 WP, 5780 DDE, 5650 EAWP, 7460 VAWP, 6750 KGV, 6520 ABSA
const BANK9_AUFGABEN = [

  // ── LB4 Kapitalanlage – Aktienkauf ────────────────────────────────────────
  { id:"b9_1", ansicht:"konto", punkte:2, aktion:"aktie_kauf",
    titel:"Aktienkauf BayernSolar AG",
    story:"Du kaufst über die BayernBank AG 100 Aktien der BayernSolar AG zum Kurs von 48,50 € je Aktie. Bankprovision 1,5 % (72,75 €) ist bereits im WP-Wert enthalten. Gesamtkaufpreis: 4.922,75 €.",
    transaktion:{ datum:"13.01.2026", text:"BayernBank AG · Aktienkauf BSOL 100 Stk. · Depot-Nr. 012345", betrag:-4922.75 },
    aufgabe:"Buche den Aktienkauf (vereinfacht: alle Anschaffungsnebenkosten sind im 1500 WP-Betrag enthalten).",
    soll:[{kuerzel:"WP", name:"Wertpapiere des Anlagevermögens", nr:"1500"}],
    haben:[{kuerzel:"BK", name:"Bank", nr:"2800"}], betrag:4922.75,
    erklaerung:"Aktienkauf → Wertpapier aktivieren: 1500 WP im Soll. Bank wird belastet → 2800 BK im Haben. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Depotgebühren (Kosten des Geldverkehrs) ──────────
  { id:"b9_2", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Depotgebühren buchen",
    story:"Die BayernBank AG berechnet jährlich 0,5 % Depotgebühr auf den Depotwert (11.200 €). Quartalsbetrag (1/4 von 56 €): 14,00 €. Lastschrift heute:",
    transaktion:{ datum:"02.01.2026", text:"BayernBank AG · Depotgebühr Q1/2026 · Konto 012345", betrag:-14 },
    aufgabe:"Buche diese Depotgebühr.",
    soll:[{kuerzel:"KGV", name:"Kosten des Geldverkehrs", nr:"6750"}],
    haben:[{kuerzel:"BK", name:"Bank", nr:"2800"}], betrag:14,
    erklaerung:"Depotgebühren = Kosten des Geldverkehrs → 6750 KGV im Soll. Bankabgang → 2800 BK im Haben. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Dividendeneingang (BK / DDE) ────────────────────
  { id:"b9_3", ansicht:"beleg", punkte:3, aktion:"dividende",
    titel:"Dividende SüdBau AG",
    story:"Die SüdBau AG schüttet eine Dividende von 1,20 € je Aktie aus. Du besitzt 50 Aktien → 60,00 €. Dividendenabrechnung der BayernBank AG:",
    transaktion:null,
    belegDaten:{
      typ:"ausgangsrechnung",
      absenderName:"BayernBank AG – Depot-Service",
      absenderAdresse:"Maximilianstraße 5, 80333 München",
      absenderIBAN:"DE92700200000020000000",
      rechnungsnummer:"DIV-2026-0042",
      datum:"08.01.2026", faellig:"08.01.2026",
      positionen:[
        { menge:50, einheit:"Stk.", beschreibung:"SüdBau AG (SUDB) – Dividende Geschäftsjahr 2025, 1,20 €/Aktie", einzelpreis:1.20, gesamt:60.00 },
      ],
      netto:60.00, brutto:60.00,
      verwendung:"Dividende SUDB GJ 2025",
    },
    ueberweisungsDaten:{ empfaenger:"BayernBank AG – Depot", iban:"DE92700200000020000000", betrag:"60", verwendung:"Dividende SUDB GJ 2025" },
    aufgabe:"Buche den Dividendeneingang von 60,00 €.",
    soll:[{kuerzel:"BK", name:"Bank", nr:"2800"}],
    haben:[{kuerzel:"DDE", name:"Dividendenerträge", nr:"5780"}], betrag:60.00,
    erklaerung:"Dividende fließt auf Bankkonto → 2800 BK im Soll. Kapitalertrag → 5780 DDE im Haben. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Zinserträge Termingeld (BK / ZE) ────────────────
  { id:"b9_4", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Zinserträge Termingeld",
    story:"Das Termingeld (4.000 €, 3 % p.a.) wurde nach 6 Monaten ausgezahlt. Zinsen: 4.000 × 3 % ÷ 2 = 60,00 €. Gutschrift auf Bankkonto:",
    transaktion:{ datum:"15.01.2026", text:"BayernBank AG · Zinsgutschrift Termingeld TG-2025-07", betrag:+60 },
    aufgabe:"Buche den Zinsertrag aus dem Termingeld.",
    soll:[{kuerzel:"BK", name:"Bank", nr:"2800"}],
    haben:[{kuerzel:"ZE", name:"Zinserträge", nr:"5710"}], betrag:60,
    erklaerung:"Zinsgutschrift auf Bankkonto → 2800 BK im Soll. Zinsertrag → 5710 ZE im Haben. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – MC: Buchgewinn beim Aktienverkauf → EAWP ─────────
  { id:"b9_5", typ:"mc", ansicht:"konto", punkte:1, aktion:"aktie_verkauf",
    titel:"Aktienverkauf mit Buchgewinn",
    story:"BayernSolar AG (BSOL): 100 Aktien gekauft für 4.922,75 €. Verkauft für 5.420,00 €. Buchgewinn = 497,25 €. BK wird mit 5.420 € gutgeschrieben, 1500 WP mit 4.922,75 € ausgebucht.",
    aufgabe:"Welches Konto erfasst den Buchgewinn von 497,25 € beim Aktienverkauf?",
    mcOptionen:[
      "5650 EAWP – Erträge aus Abgang von Wertpapieren",
      "7460 VAWP – Verluste aus Abgang von Wertpapieren",
      "5780 DDE – Dividendenerträge",
      "5710 ZE – Zinserträge",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Ein Buchgewinn beim Aktienverkauf (Verkaufspreis > Buchwert) fließt auf 5650 EAWP (Erträge aus Abgang von Wertpapieren). (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – MC: Magisches Dreieck ────────────────────────────
  { id:"t9_1", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Magisches Dreieck",
    story:"Das magische Dreieck der Geldanlage zeigt, dass keine Anlageform alle drei Eigenschaften gleichzeitig vollständig erfüllen kann.",
    aufgabe:"Welche drei Eigenschaften bilden das magische Dreieck der Geldanlage?",
    mcOptionen:[
      "Liquidität – Rentabilität – Sicherheit",
      "Eigenkapital – Fremdkapital – Gewinn",
      "Aktien – Anleihen – Immobilien",
      "Kurs – Dividende – Depotgebühr",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Das magische Dreieck: Liquidität (schnelle Verfügbarkeit) – Rentabilität (Rendite) – Sicherheit (Verlustrisiko). Alle drei sind nie gleichzeitig optimal. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Kalkulation: Kaufpreis + Provision ──────────────
  { id:"k9_1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Kalkulation: Kaufpreis Aktien",
    story:"Du kaufst 100 Aktien der BayernSolar AG zum Kurs von 48,50 € je Aktie. Die BayernBank AG berechnet 1,5 % Bankprovision auf den Kurswert.",
    aufgabe:"Berechne den gesamten Anschaffungswert (Kurswert + 1,5 % Provision) in €.",
    kalkulation:{ richtigerWert:4922.75, einheit:"€" },
    soll:[], haben:[], betrag:4922.75,
    erklaerung:"100 × 48,50 € = 4.850,00 € + 1,5 % × 4.850 € = 72,75 € → Anschaffungswert = 4.922,75 €. (Kl.9 LB4)" },

  // ── LB2 Anlagenbereich – Abschreibung auf Sachanlagen (ABSA / MA) ────────
  { id:"b9_6", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Jahresabschreibung auf Maschine",
    story:"Eine Fertigungsmaschine (0700 MA) wurde für 48.000 € angeschafft. Nutzungsdauer laut AfA-Tabelle: 8 Jahre. Lineare Abschreibung: 48.000 ÷ 8 = 6.000 € pro Jahr.",
    transaktion:null,
    aufgabe:"Buche die planmäßige Jahresabschreibung auf die Maschine.",
    soll:[{kuerzel:"ABSA", name:"Abschreibungen auf Sachanlagen", nr:"6520"}],
    haben:[{kuerzel:"MA", name:"Maschinen und Anlagen", nr:"0700"}], betrag:6000,
    erklaerung:"Wertminderung Sachanlage → 6520 ABSA im Soll (Aufwand). Buchwert Maschine sinkt → 0700 MA im Haben. (Kl.9 LB2)" },

  // ── LB3 Finanzierung – Zinsaufwand Bankkredit (ZAW / BK) ─────────────────
  { id:"b9_7", ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"Zinsaufwand Bankkredit überweisen",
    story:"Für den Investitionskredit (20.000 €, 5 % p.a.) werden Quartalszinsen fällig: 20.000 × 5 % ÷ 4 = 250 €. Überweisung an BayernBank AG (IBAN: DE92700200000020000000, Ref.: ZAW Q1/2026).",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"BayernBank AG", iban:"DE92700200000020000000", betrag:"250", verwendung:"ZAW Q1/2026 Kredit-Nr. 7734" },
    aufgabe:"Welcher Buchungssatz entsteht bei der Überweisung der Kreditzinsen?",
    soll:[{kuerzel:"ZAW", name:"Zinsaufwendungen", nr:"7510"}],
    haben:[{kuerzel:"BK", name:"Bank", nr:"2800"}], betrag:250,
    erklaerung:"Kreditzinsen = Finanzierungsaufwand → 7510 ZAW im Soll. Bankabgang → 2800 BK im Haben. (Kl.9 LB3)" },

  // ── LB4 Kapitalanlage – MC: Buchverlust beim Aktienverkauf → VAWP ────────
  { id:"t9_2", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Buchverlust Aktienverkauf",
    story:"MünchTex AG (MTEX): 50 Aktien zu je 24,50 € gekauft (= 1.225 €). Kurs fällt auf 20,10 € → Verkaufserlös 1.005 €. Buchverlust = 220 €.",
    aufgabe:"Welches Konto erfasst den Buchverlust von 220 € beim Aktienverkauf?",
    mcOptionen:[
      "7460 VAWP – Verluste aus Abgang von Wertpapieren",
      "5650 EAWP – Erträge aus Abgang von Wertpapieren",
      "6750 KGV – Kosten des Geldverkehrs",
      "5780 DDE – Dividendenerträge",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Ein Buchverlust beim Aktienverkauf (Verkaufspreis < Buchwert) wird auf 7460 VAWP (Verluste aus Abgang von Wertpapieren) gebucht. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Kalkulation: Dividendenrendite ──────────────────
  { id:"k9_2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Kalkulation: Dividendenrendite",
    story:"SüdBau AG: Dividende 1,20 € je Aktie, aktueller Kurs 52,00 € je Aktie. Dividendenrendite = Dividende ÷ Kurs × 100.",
    aufgabe:"Berechne die Dividendenrendite der SüdBau AG (in %, auf 2 Nachkommastellen).",
    kalkulation:{ richtigerWert:2.31, einheit:"%" },
    soll:[], haben:[], betrag:2.31,
    erklaerung:"Dividendenrendite = 1,20 ÷ 52,00 × 100 = 2,31 %. Zeigt die jährliche Ausschüttung relativ zum Kurs. (Kl.9 LB4)" },

  // ── LB5 Forderungen – MC: Zweifelhafte Forderungen (ZWFO) ────────────────
  { id:"t9_3", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Zweifelhafte Forderungen",
    story:"Ein Kunde (Maier Technik GmbH) zahlt trotz Mahnung nicht. Du zweifelst an der Einbringlichkeit der Forderung (2.000 €).",
    aufgabe:"Auf welches Konto werden zweifelhafte Forderungen umgebucht?",
    mcOptionen:[
      "2470 ZWFO – Zweifelhafte Forderungen",
      "3670 EWB – Einzelwertberichtigung",
      "6950 ABFO – Abschreibungen auf Forderungen",
      "2400 FO – Forderungen aus L+L",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Zweifelhafte Forderungen werden von 2400 FO auf 2470 ZWFO umgebucht (Buchung: ZWFO / FO). Erst beim tatsächlichen Ausfall folgt die Abschreibung mit 6950 ABFO. (Kl.9 LB5)" },

  // ── Lückentext (Kl. 9) ───────────────────────────────────────────────────
  { id:"lt9_1", typ:"lueckentext", ansicht:"konto", punkte:2, aktion:"lueckentext",
    titel:"Lückentext: Dividendeneingang buchen",
    story:"E-Mail der BayernBank AG: SüdBau AG Dividende 1,20 €/Aktie × 50 Stk. = 60,00 € wird auf dein Konto überwiesen. Vervollständige den Buchungssatz:",
    aufgabe:"Fülle die fehlenden Kürzel aus.",
    lueckentext:{
      template:"[L0] (2800) an [L1] (5780) — 60,00 €",
      luecken:[
        { id:0, hinweis:"Bankkonto (BK / 2800)",          korrekt:"BK",  korrektAlt:["2800"] },
        { id:1, hinweis:"Dividendenerträge (DDE / 5780)",  korrekt:"DDE", korrektAlt:["5780"] }
      ]
    },
    soll:[{kuerzel:"BK",nr:"2800"}], haben:[{kuerzel:"DDE",nr:"5780"}], betrag:60,
    erklaerung:"Dividende: BK (2800) im Soll (Bankzugang). DDE (5780) im Haben – Ertrag aus Kapitalanlage. (Kl.9 LB4)" },

  // ── Zuordnung (Kl. 9) ────────────────────────────────────────────────────
  { id:"zu9_1", typ:"zuordnung", ansicht:"konto", punkte:4, aktion:"zuordnung",
    titel:"Zuordnung: Anlage- oder Umlaufvermögen?",
    story:"Der Steuerberater fragt für die Bilanzgliederung: Welche Konten gehören ins Anlage-, welche ins Umlaufvermögen?",
    aufgabe:"Ordne jede Bilanzposition dem richtigen Vermögensbereich zu.",
    zuordnung:{
      items:[
        { id:"MA",  text:"MA (0700) – Maschinen und Anlagen", korrektKat:"AV" },
        { id:"WP",  text:"WP (1500) – Wertpapiere (Depot)",   korrektKat:"AV" },
        { id:"FO",  text:"FO (2400) – Forderungen aus L+L",    korrektKat:"UV" },
        { id:"BK",  text:"BK (2800) – Bank",                   korrektKat:"UV" },
        { id:"R",   text:"R (2000) – Rohstoffe (Lager)",       korrektKat:"UV" },
      ],
      kategorien:[
        { id:"AV", label:"Anlagevermögen",  color:"#3b82f6", rgb:"59,130,246"  },
        { id:"UV", label:"Umlaufvermögen",  color:"#10b981", rgb:"16,185,129"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Anlagevermögen (dauerhafter Nutzen): MA, WP (Depot 1500). Umlaufvermögen (kurzfristig): FO, BK, R (Vorräte). (Kl.9 LB2/LB4)" },

  // ── Freitext-Aufgaben (Kl. 9) ─────────────────────────────────────────────
  { id:"ft9_1", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Eigen- vs. Fremdfinanzierung",
    story:"Die Geschäftsleitung berät über die Finanzierung einer neuen Maschine (60.000 €). Option A: Eigenkapitalerhöhung, Option B: Bankdarlehen.",
    aufgabe:"Nenne je zwei Vor- und Nachteile der Eigenfinanzierung und der Fremdfinanzierung.",
    freitext:{ zeilen:6, minZeichen:60,
      loesung:"Eigenfinanzierung – Vorteile: keine Zinsen, keine Rückzahlungspflicht, volle Unabhängigkeit vom Kreditgeber. Nachteile: Kapital muss im Unternehmen vorhanden sein / aufgebracht werden, Gewinn muss einbehalten werden (Liquiditätsbindung). Fremdfinanzierung – Vorteile: sofortiger Kapitalbedarf gedeckt auch ohne eigenes Kapital, Zinsen als Betriebsausgabe steuerlich absetzbar. Nachteile: Zinszahlungen (Aufwand, Konto ZAW 7510), Tilgungspflicht, Abhängigkeit vom Gläubiger, Sicherheiten erforderlich." },
    erklaerung:"Eigenfinanzierung: EK-Erhöhung ohne Schulden, aber Kapitalaufbringung nötig. Fremdfinanzierung: Bankkredit mit Zinsen (ZAW 7510) und Tilgung, dafür sofort verfügbar. Kl.9 LB3." },

  { id:"ft9_2", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Warum Abschreibungen?",
    story:"Beim Jahresgespräch mit dem Steuerberater fragt er dich: Erklär mir mal in eigenen Worten, warum wir überhaupt abschreiben.",
    aufgabe:"Erkläre, was Abschreibungen sind, warum sie notwendig sind und welche Wirkung sie auf Gewinn und Liquidität haben.",
    freitext:{ zeilen:5, minZeichen:50,
      loesung:"Abschreibungen (ABSA 6520) erfassen die jährliche Wertminderung von Sachanlagen durch Nutzung, Verschleiß oder wirtschaftliche Veralterung. Sie sind notwendig, weil Anschaffungskosten nicht im Kaufjahr voll als Aufwand verrechnet werden dürfen – der Aufwand muss auf die Nutzungsdauer verteilt werden (Periodenabgrenzung). Wirkung: Abschreibungen mindern den Gewinn (→ geringere Steuerbelastung) und stellen gleichzeitig Kapital für die spätere Wiederbeschaffung bereit (Selbstfinanzierungseffekt / Abschreibungskreislauf). Sie sind nicht zahlungswirksam – die Liquidität bleibt erhalten." },
    erklaerung:"AfA = Absetzung für Abnutzung (§7 EStG). Lineares Verfahren: AK / ND = jährl. AfA. ABSA (6520) im Soll / MA im Haben (direkte Abschreibung). Selbstfinanzierungseffekt! Kl.9 LB2." },

  // ── Schaubild: Börsenkurs (Kl. 9 LB4) ────────────────────────────────────
  { id:"sb9_1", typ:"mc", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Börsenchart: BayernSolar AG – Kursentwicklung",
    story:"Im Börsenfenster siehst du den Kursverlauf der BayernSolar AG der letzten 6 Monate.",
    schaubild:{
      typ:"linie",
      titel:"BayernSolar AG – Aktienkurs (Jul–Dez 2025)",
      untertitel:"Schlusskurs in € je Aktie (fiktive Daten)",
      einheit:"€/Aktie",
      quelle:"Fiktiver Börsenkurs",
      herausgeber:"BuchungsWerk – Übungszweck",
      jahre:["Jul","Aug","Sep","Okt","Nov","Dez"],
      werte:[41.20, 44.80, 43.50, 47.30, 52.10, 48.50]
    },
    aufgabe:"In welchem Monat war der Aktienkurs der BayernSolar AG am höchsten?",
    mcOptionen:["August (44,80 €)","Oktober (47,30 €)","November (52,10 €)","Dezember (48,50 €)"],
    mcKorrekt:2, soll:[], haben:[], betrag:0,
    erklaerung:"Im November 2025 erreichte der Kurs mit 52,10 € sein Höchst. Im Dezember fiel er wieder auf 48,50 €. Beim Verkauf im Dezember ergibt sich ein Buchgewinn gegenüber dem Kaufkurs von 41,20 € (Juli): EAWP 5650 im Haben. (Kl.9 LB4)" },

  { id:"sb9_2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Börsenchart: Kursgewinn berechnen",
    story:"Du hast BayernSolar AG-Aktien im Juli zu 41,20 € je Aktie gekauft (50 Stück). Im Dezember verkaufst du sie zum Kurs von 48,50 €.",
    aufgabe:"Berechne den Kursgewinn in € (Verkaufswert − Kaufwert, ohne Nebenkosten).",
    kalkulation:{ richtigerWert:365, einheit:"€" },
    schaubild:{
      typ:"linie",
      titel:"BayernSolar AG – Aktienkurs (Jul–Dez 2025)",
      untertitel:"Schlusskurs in € je Aktie (fiktive Daten)",
      einheit:"€/Aktie",
      quelle:"Fiktiver Börsenkurs",
      herausgeber:"BuchungsWerk – Übungszweck",
      jahre:["Jul","Aug","Sep","Okt","Nov","Dez"],
      werte:[41.20, 44.80, 43.50, 47.30, 52.10, 48.50]
    },
    soll:[], haben:[], betrag:365,
    erklaerung:"Kaufwert: 50 × 41,20 € = 2.060,00 €. Verkaufswert: 50 × 48,50 € = 2.425,00 €. Kursgewinn = 2.425,00 − 2.060,00 = 365,00 €. Buchung: BK / WP 1500 + EAWP 5650. (Kl.9 LB4)" },

  // ── Paare zuordnen (Kl. 9) ────────────────────────────────────────────────
  { id:"pa9_1", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Paare zuordnen: Börsenbegriff → Erklärung",
    story:"Vor dem Aktienkauf musst du die wichtigsten Börsenbegriffe kennen. Ordne jeden Begriff der richtigen Erklärung zu.",
    aufgabe:"Welche Erklärung gehört zu welchem Börsenbegriff?",
    zuordnung:{
      items:[
        { id:"kurs",  text:"Kurs",      korrektKat:"kurs_def"  },
        { id:"div",   text:"Dividende", korrektKat:"div_def"   },
        { id:"depot", text:"Depot",     korrektKat:"depot_def" },
        { id:"emit",  text:"Emission",  korrektKat:"emit_def"  },
        { id:"rend",  text:"Rendite",   korrektKat:"rend_def"  },
      ],
      kategorien:[
        { id:"kurs_def",  label:"Marktpreis einer Aktie an der Börse",  color:"#e8600a", rgb:"232,96,10"  },
        { id:"div_def",   label:"Gewinnausschüttung je Aktie",          color:"#10b981", rgb:"16,185,129" },
        { id:"depot_def", label:"Wertpapier-Konto bei der Bank",        color:"#3b82f6", rgb:"59,130,246" },
        { id:"emit_def",  label:"Erstausgabe neuer Aktien am Markt",    color:"#a855f7", rgb:"168,85,247" },
        { id:"rend_def",  label:"Ertrag einer Kapitalanlage in %",      color:"#eab308", rgb:"234,179,8"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Kurs=Börsenpreis. Dividende=Gewinnanteil/Aktie (BK/DDE 5780). Depot=WP-Konto (1500). Emission=Neuausgabe von Aktien. Rendite=Ertrag in % (Dividendenrendite = Div÷Kurs×100). (Kl.9 LB4)" },
];

// ── Klasse 9 Kalender – Börsentermine Januar 2026 ────────────────────────────
// Wochenenden Jan 2026: 3,4,10,11,17,18,24,25,31 · Feiertage: 1 (Neujahr), 6 (Hl. 3 Könige)
const KALENDER9_EINTRAEGE = [
  // Jan 1 = Neujahr → Freitag 2.1.
  { tag:2,  text:"Depotgebühr BayernBank AG fällig (Q1)",          typ:"task", aufgabeAktion:"buchung"       },
  // Jan 6 = Hl. 3 Könige → Mittwoch 7.1.
  { tag:7,  text:"Quartalsbericht BayernSolar AG · Kurs +8 %",     typ:"info"                               },
  { tag:8,  text:"Dividende SüdBau AG eingetroffen – buchen!",      typ:"task", aufgabeAktion:"dividende"    },
  { tag:13, text:"Aktienkauf BayernSolar AG ausführen",             typ:"task", aufgabeAktion:"aktie_kauf"   },
  { tag:15, text:"Termingeld-Zinsgutschrift prüfen + buchen",       typ:"task", aufgabeAktion:"buchung"      },
  { tag:16, text:"AlpenMobil Gewinnwarnung · Kurs −11,5 %",        typ:"info"                               },
  { tag:20, text:"DAX-Allzeithoch – Depot­wert prüfen",            typ:"info"                               },
  { tag:22, text:"BayernSolar Aktienverkauf: Buchgewinn erfassen",  typ:"task", aufgabeAktion:"aktie_verkauf"},
  { tag:26, text:"MünchTex Insolvenzgerücht · Kurs −18 %",         typ:"info"                               },
  { tag:28, text:"Quartalszinsen Bankkredit überweisen",            typ:"task", aufgabeAktion:"ueberweisung" },
  // Jan 31 = Samstag → Freitag 30.1.
  { tag:30, text:"Monatsabschluss: Depot + Buchführung prüfen",     typ:"info"                               },
];

// ── Klasse 10 Aufgaben – MSA-Vorbereitung ────────────────────────────────────
// LB1: ARA/PRA/RST · LB2: Kennzahlen · LB3: Vollkostenrechnung · LB4: DBR
// Sprache: Sie/Ihr/Ihnen (Klasse 10)
const BANK10_AUFGABEN = [

  // ── LB1 ARA – Aktive Rechnungsabgrenzung (VBEI / ARA) ────────────────────
  { id:"b10_1", ansicht:"konto", punkte:3, aktion:"buchung",
    titel:"Aktive Rechnungsabgrenzung: Versicherungsbeitrag",
    story:"Am 01.12.2025 zahlt die VitaSport GmbH den Jahresbeitrag der Betriebsunterbrechungsversicherung (2.400 €). Der Beitrag deckt 01.12.2025–30.11.2026. Auf das GJ 2025 entfallen 1/12 = 200 €, auf 2026 entfallen 11/12 = 2.200 €.",
    transaktion:{ datum:"01.12.2025", text:"VSH Versicherungs-AG · Betriebsunterbrechung JB 2025/26", betrag:-2400 },
    aufgabe:"Buchen Sie zum 31.12.2025 die Bildung des aktiven Rechnungsabgrenzungspostens für den auf 2026 entfallenden Anteil (2.200 €).",
    soll:[{kuerzel:"ARA", name:"Aktive Rechnungsabgrenzung", nr:"2900"}],
    haben:[{kuerzel:"VBEI", name:"Versicherungsbeiträge", nr:"6900"}], betrag:2200,
    erklaerung:"Der auf das Folgejahr entfallende Aufwand wird abgegrenzt: 2900 ARA im Soll (Aktivierung), 6900 VBEI im Haben (Korrektur des Aufwands). Im Folgejahr Auflösung VBEI/ARA. (Kl.10 LB1)" },

  // ── LB1 RST – Rückstellung für Prozesskosten (PFAW / RST) ────────────────
  { id:"b10_2", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Rückstellung für Prozesskosten",
    story:"Ein ehemaliger Mitarbeiter klagt auf Schadensersatz. Der Rechtsanwalt schätzt die anfallenden Prozesskosten auf ca. 3.500 €. Höhe und Zeitpunkt der Zahlung sind noch ungewiss (§ 249 HGB).",
    transaktion:null,
    aufgabe:"Buchen Sie zum 31.12.2025 die Bildung der Rückstellung für Prozesskosten.",
    soll:[{kuerzel:"PFAW", name:"Periodenfremde Aufwendungen", nr:"6990"}],
    haben:[{kuerzel:"RST", name:"Rückstellungen", nr:"3900"}], betrag:3500,
    erklaerung:"Ungewisse Verbindlichkeit → Rückstellung bilden: 6990 PFAW im Soll (Aufwand im GJ 2025), 3900 RST im Haben. Pflicht nach § 249 HGB. (Kl.10 LB1)" },

  // ── LB1 MC – Was ist 2900 ARA? ────────────────────────────────────────────
  { id:"t10_1", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Aktive Rechnungsabgrenzung",
    story:"Zum Jahresabschluss werden Aufwendungen und Erträge periodengerecht abgegrenzt.",
    aufgabe:"Welcher Sachverhalt führt zur Buchung 2900 ARA im Soll?",
    mcOptionen:[
      "Vorauszahlung einer Versicherungsprämie, die das Folgejahr betrifft",
      "Eingang einer Kundenzahlung für eine noch nicht erbrachte Leistung",
      "Zahlung einer Lieferantenrechnung vor der Fälligkeit",
      "Bildung einer Rücklage für geplante Investitionen",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"2900 ARA (aktiver RAP) entsteht, wenn im laufenden GJ eine Ausgabe getätigt wird, die Aufwand des Folgejahres ist. Vorauszahlte Versicherungsprämien sind das klassische Beispiel. (Kl.10 LB1)" },

  // ── LB2 Kennzahl – Anlagendeckung II ──────────────────────────────────────
  { id:"k10_1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kennzahl: Anlagendeckung II",
    story:"VitaSport GmbH Bilanz 31.12.2025: Eigenkapital 180.000 €, langfristige Fremdverbindlichkeiten (LBKV) 50.000 €, Anlagevermögen gesamt 184.000 €.",
    aufgabe:"Berechnen Sie die Anlagendeckung II in % (auf 2 Nachkommastellen). Formel: (EK + LFV) ÷ AV × 100.",
    kalkulation:{ richtigerWert:125.00, einheit:"%" },
    soll:[], haben:[], betrag:125.00,
    erklaerung:"Anlagendeckung II = (180.000 + 50.000) / 184.000 × 100 = 125,00 %. Ziel ≥ 100 % (goldene Bilanzregel) → erfüllt! Das AV ist vollständig durch langfristige Mittel gedeckt. (Kl.10 LB2)" },

  // ── LB2 Kennzahl – Eigenkapitalrentabilität ────────────────────────────────
  { id:"k10_2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kennzahl: Eigenkapitalrentabilität",
    story:"VitaSport GmbH GJ 2025: Jahresüberschuss (Gewinn) 27.000 €, Eigenkapital zum 31.12.2025 = 180.000 €.",
    aufgabe:"Berechnen Sie die Eigenkapitalrentabilität in % (auf 2 Nachkommastellen). Formel: Gewinn ÷ EK × 100.",
    kalkulation:{ richtigerWert:15.00, einheit:"%" },
    soll:[], haben:[], betrag:15.00,
    erklaerung:"EK-Rentabilität = 27.000 / 180.000 × 100 = 15,00 %. Bedeutung: Auf jede 100 € eingesetztes Eigenkapital erwirtschaftet die VitaSport GmbH 15 € Gewinn. (Kl.10 LB2)" },

  // ── LB2 Kennzahl – Einzugsliquidität ──────────────────────────────────────
  { id:"k10_3", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kennzahl: Einzugsliquidität",
    story:"VitaSport GmbH 31.12.2025: Forderungen aus L+L (FO) 42.000 €, Bankguthaben (BK) 28.000 €, kurzfristige Verbindlichkeiten (KBKV + VE) 56.000 €.",
    aufgabe:"Berechnen Sie die Einzugsliquidität in % (auf 2 Nachkommastellen). Formel: (FO + BK) ÷ KFV × 100.",
    kalkulation:{ richtigerWert:125.00, einheit:"%" },
    soll:[], haben:[], betrag:125.00,
    erklaerung:"Einzugsliquidität = (42.000 + 28.000) / 56.000 × 100 = 125,00 %. Ziel ≥ 100 % → erfüllt! Kurzfristige Verbindlichkeiten sind durch liquide Mittel + Forderungen gedeckt. (Kl.10 LB2)" },

  // ── LB2 MC – Anlagendeckung II Zielwert ───────────────────────────────────
  { id:"t10_2", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Zielwert Anlagendeckung II",
    story:"Die Anlagendeckung II ist eine zentrale Kennzahl der goldenen Bilanzregel und jedes Jahr im MSA relevant.",
    aufgabe:"Welchen Mindestzielwert sollte die Anlagendeckung II nach der goldenen Bilanzregel aufweisen?",
    mcOptionen:[
      "≥ 100 % – das Anlagevermögen soll vollständig durch langfristige Mittel gedeckt sein",
      "≥ 50 % – mindestens die Hälfte des AV durch Eigenkapital finanzieren",
      "≥ 200 % – zur Sicherheit doppelte Deckung des Anlagevermögens anstreben",
      "Es gibt keinen festen Zielwert – nur Branchenvergleiche sind aussagekräftig",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Anlagendeckung II ≥ 100 %: Das Anlagevermögen soll vollständig durch Eigenkapital + langfristiges Fremdkapital finanziert sein (goldene Bilanzregel). (Kl.10 LB2)" },

  // ── LB3 Vollkosten – FGKZ berechnen ──────────────────────────────────────
  { id:"k10_4", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kalkulation: Fertigungsgemeinkostenzuschlagssatz",
    story:"Aus dem BAB der VitaSport GmbH (GJ 2025) entnehmen Sie: Fertigungsgemeinkosten (FGK) 96.000 €, Fertigungseinzelkosten (FEK) 240.000 €.",
    aufgabe:"Berechnen Sie den Fertigungsgemeinkostenzuschlagssatz in % (auf 2 Nachkommastellen). Formel: FGK ÷ FEK × 100.",
    kalkulation:{ richtigerWert:40.00, einheit:"%" },
    soll:[], haben:[], betrag:40.00,
    erklaerung:"FGKZ = 96.000 / 240.000 × 100 = 40,00 %. Auf jeden Euro Fertigungseinzelkosten kommen 0,40 € Fertigungsgemeinkosten. (Kl.10 LB3)" },

  // ── LB3 Vollkosten – Herstellkosten Stückkalkulation ─────────────────────
  { id:"k10_5", typ:"kalkulation", ansicht:"konto", punkte:3, aktion:"klr",
    titel:"Kalkulation: Herstellkosten Kraftstation",
    story:"Zuschlagskalkulation VitaSport GmbH, Kraftstation 'MaxForce 300': Materialeinzelkosten (MEK) 85,00 €, Materialgemeinkostenzuschlag 12 %, Fertigungseinzelkosten (FEK) 120,00 €, Fertigungsgemeinkostenzuschlag 40 %, Sondereinzelkosten der Fertigung (SEF) 15,00 €.",
    aufgabe:"Berechnen Sie die Herstellkosten je Stück in € (auf 2 Nachkommastellen).",
    kalkulation:{ richtigerWert:278.20, einheit:"€" },
    soll:[], haben:[], betrag:278.20,
    erklaerung:"MEK 85,00 + MGK (12%) 10,20 + FEK 120,00 + FGK (40%) 48,00 + SEF 15,00 = Herstellkosten 278,20 €/Stk. (Kl.10 LB3)" },

  // ── LB3 MC – Einzelkosten vs. Gemeinkosten ────────────────────────────────
  { id:"t10_3", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Einzel- vs. Gemeinkosten",
    story:"Im Betriebsabrechnungsbogen (BAB) werden Kosten verursachungsgerecht auf Kostenstellen verteilt.",
    aufgabe:"Welche Kostenart lässt sich einem einzelnen Erzeugnis direkt zurechnen?",
    mcOptionen:[
      "Einzelkosten – z.B. Materialeinzelkosten, Fertigungseinzelkosten",
      "Gemeinkosten – z.B. Miete, Versicherungsbeiträge",
      "Fixkosten – z.B. Jahresabschreibungen auf Maschinen",
      "Zusatzkosten – z.B. kalkulatorische Zinsen auf das EK",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Einzelkosten (z.B. MEK, FEK) können dem Kostenträger direkt zugerechnet werden. Gemeinkosten (Miete, Versicherungen) entstehen für mehrere Kostenstellen und werden über Zuschlagssätze verteilt. (Kl.10 LB3)" },

  // ── LB4 DBR – Stückdeckungsbeitrag ────────────────────────────────────────
  { id:"k10_6", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kalkulation: Stückdeckungsbeitrag",
    story:"VitaSport GmbH, Produkt 'PulseRun' Laufband: Nettoverkaufspreis (NVP) 890,00 €/Stk., variable Kosten je Stück 580,00 €.",
    aufgabe:"Berechnen Sie den Stückdeckungsbeitrag in € (auf 2 Nachkommastellen). Formel: NVP − variable Kosten.",
    kalkulation:{ richtigerWert:310.00, einheit:"€" },
    soll:[], haben:[], betrag:310.00,
    erklaerung:"Stückdeckungsbeitrag = 890,00 − 580,00 = 310,00 €. Jeder verkaufte PulseRun trägt 310 € zur Deckung der Fixkosten und zum Gewinn bei. (Kl.10 LB4)" },

  // ── LB4 DBR – Break-even-Menge ────────────────────────────────────────────
  { id:"k10_7", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kalkulation: Break-even-Menge",
    story:"VitaSport GmbH, PulseRun Laufband: Stückdeckungsbeitrag 310,00 €, Fixkosten gesamt 186.000 €.",
    aufgabe:"Berechnen Sie die Break-even-Menge (Gewinnschwelle) in Stück. Formel: Fixkosten ÷ Stück-DB.",
    kalkulation:{ richtigerWert:600, einheit:"Stk." },
    soll:[], haben:[], betrag:600,
    erklaerung:"Break-even-Menge = 186.000 / 310 = 600 Stk. Ab der 601. Einheit erzielt die VitaSport GmbH Gewinn. Unterhalb = Verlust. (Kl.10 LB4)" },

  // ── LB4 DBR – MC: Zusatzauftrag annehmen? ─────────────────────────────────
  { id:"t10_4", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Zusatzauftrag",
    story:"VitaSport GmbH erhält Zusatzauftrag: 50 Stk. 'AquaPro' Rudergerät zu 320 €/Stk. (NVP). Variable Kosten je Stück: 280 €. Freie Kapazität vorhanden.",
    aufgabe:"Soll der Zusatzauftrag angenommen werden?",
    mcOptionen:[
      "Ja – NVP (320 €) > variable Kosten (280 €) → positiver DB von 40 €/Stk.; freie Kapazität vorhanden",
      "Nein – der NVP liegt unter dem regulären Angebotspreis",
      "Nein – die Fixkosten werden durch den Zusatzauftrag nicht vollständig gedeckt",
      "Ja – aber nur dann, wenn der NVP über den Herstellkosten (inkl. Fixkostenanteil) liegt",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Bei freier Kapazität: Zusatzauftrag annehmen, wenn NVP > variable Kosten (positiver Deckungsbeitrag). Fixkosten sind bereits gedeckt und steigen nicht. → Jeder positive DB erhöht den Gewinn. (Kl.10 LB4)" },

  // ── LB4 DBR – MC: langfristige Preisuntergrenze ───────────────────────────
  { id:"t10_5", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Langfristige Preisuntergrenze",
    story:"Die VitaSport GmbH überlegt, dauerhaft zu einem günstigeren Preis zu verkaufen.",
    aufgabe:"Was ist die langfristige Preisuntergrenze bei der Teilkostenrechnung?",
    mcOptionen:[
      "Die Selbstkosten (Herstellkosten + Verwaltungs- und Vertriebsgemeinkosten) – alle Kosten müssen langfristig gedeckt sein",
      "Die variablen Kosten je Stück – kurzfristig reicht ein positiver Deckungsbeitrag",
      "Der Einstandspreis der Rohstoffe – nur direkte Materialkosten müssen gedeckt sein",
      "Null – solange überhaupt Umsatz erzielt wird, ist jeder Preis langfristig akzeptabel",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Langfristige Preisuntergrenze = Selbstkosten. Kurzfristig reichen variable Kosten (Deckungsbeitrag ≥ 0), aber langfristig müssen alle Kosten – auch Fixkosten – gedeckt werden. (Kl.10 LB4)" },

  // ── Lückentext (Kl. 10) ──────────────────────────────────────────────────
  { id:"lt10_1", typ:"lueckentext", ansicht:"konto", punkte:2, aktion:"lueckentext",
    titel:"Lückentext: Aktive Rechnungsabgrenzung bilden",
    story:"Zum Jahresabschluss 31.12.2025: Die Versicherungsprämie (01.07.2025–30.06.2026, 2.200,00 €) wurde bereits gezahlt. Der auf 2026 entfallende Anteil (6 Monate = 1.100,00 €) ist abzugrenzen.",
    aufgabe:"Vervollständigen Sie den Buchungssatz (Kürzel oder Nr. eingeben).",
    lueckentext:{
      template:"[L0] (2900) an [L1] (6900) — 1.100,00 €",
      luecken:[
        { id:0, hinweis:"Aktive Rechnungsabgrenzung (ARA / 2900)", korrekt:"ARA",  korrektAlt:["2900"] },
        { id:1, hinweis:"Versicherungsbeiträge (VBEI / 6900)",      korrekt:"VBEI", korrektAlt:["6900"] }
      ]
    },
    soll:[{kuerzel:"ARA",nr:"2900"}], haben:[{kuerzel:"VBEI",nr:"6900"}], betrag:1100,
    erklaerung:"ARA (2900) im Soll: Vorauszahlung auf 2026 aktivieren. VBEI (6900) im Haben: Aufwand auf das Folgejahr verschieben. Ergebnis 2025 wird entlastet. (Kl.10 LB1)" },

  // ── Zuordnung (Kl. 10) ───────────────────────────────────────────────────
  { id:"zu10_1", typ:"zuordnung", ansicht:"konto", punkte:4, aktion:"zuordnung",
    titel:"Zuordnung: Kosten → Kostenstelle im BAB",
    story:"Im Betriebsabrechnungsbogen (BAB) müssen Gemeinkosten den Kostenstellen zugeordnet werden.",
    aufgabe:"Ordnen Sie jede Kostenart der richtigen Hauptkostenstelle zu.",
    zuordnung:{
      items:[
        { id:"LohnFert",  text:"Löhne der Fertigungsarbeiter",   korrektKat:"FERT" },
        { id:"MieteVerw", text:"Miete Verwaltungsgebäude",        korrektKat:"VERW" },
        { id:"WerbVtr",   text:"Werbekosten (Anzeigen)",          korrektKat:"VTR"  },
        { id:"HilfsMat",  text:"Hilfsmaterial für Produktion",   korrektKat:"MAT"  },
        { id:"GehVerw",   text:"Gehälter Buchhaltungsabteilung", korrektKat:"VERW" },
      ],
      kategorien:[
        { id:"MAT",  label:"Material",    color:"#3b82f6", rgb:"59,130,246"  },
        { id:"FERT", label:"Fertigung",   color:"#e8600a", rgb:"232,96,10"   },
        { id:"VERW", label:"Verwaltung",  color:"#8b5cf6", rgb:"139,92,246"  },
        { id:"VTR",  label:"Vertrieb",    color:"#10b981", rgb:"16,185,129"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Fertigungsarbeiter → Fertigung. Verwaltungsmiete + Buchh.-Gehälter → Verwaltung. Werbung → Vertrieb. Hilfsmaterial → Material. Schlüssel: Verursachungsgerechte Zuteilung. (Kl.10 LB3)" },

  // ── Freitext-Aufgaben (Kl. 10) ────────────────────────────────────────────
  { id:"ft10_1", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Voll- vs. Teilkostenrechnung",
    story:"Im MSA-Kurs fragt Ihre Lehrkraft: Was ist der grundlegende Unterschied zwischen Voll- und Teilkostenrechnung?",
    aufgabe:"Erläutern Sie den Unterschied zwischen Voll- und Teilkostenrechnung. Nennen Sie je einen typischen Anwendungsfall.",
    freitext:{ zeilen:5, minZeichen:60,
      loesung:"Die Vollkostenrechnung verrechnet alle Kosten (fixe und variable) auf die Kostenträger (Produkte). Anwendungsfall: Kalkulation des Angebotspreises (Herstellkosten inkl. Fixkostenanteil über GKZ). Vorteil: langfristige Preisfindung. Nachteil: Fixkosten werden proportional verteilt – bei Beschäftigungsschwankungen entstehen Verzerrungen. Die Teilkostenrechnung berücksichtigt nur die variablen Kosten pro Einheit; Fixkosten werden als Periodenblock behandelt. Anwendungsfall: Entscheidung über Zusatzaufträge, kurzfristige Preisuntergrenze (DB ≥ 0). Vorteil: klare Entscheidungsgrundlage. Kennzahl: Deckungsbeitrag = NVP − variable Kosten." },
    erklaerung:"Vollkosten → BAB + GKZ → Herstellkosten → Angebotspreis. Teilkosten → DB = NVP − VK → Break-even, Make-or-buy, Zusatzauftrag. Kl.10 LB3/LB4." },

  { id:"ft10_2", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Rechnungsabgrenzungsposten",
    story:"Der Steuerberater erklärt dem Geschäftsführer aktive und passive Rechnungsabgrenzungsposten. Er bittet Sie, es in eigenen Worten zusammenzufassen.",
    aufgabe:"Erläutern Sie, was aktive und passive Rechnungsabgrenzungsposten (ARA/PRA) sind und geben Sie je ein Beispiel.",
    freitext:{ zeilen:5, minZeichen:60,
      loesung:"Rechnungsabgrenzungsposten dienen der periodengerechten Erfolgsermittlung: Aufwendungen und Erträge sollen in dem Jahr erfasst werden, zu dem sie wirtschaftlich gehören. ARA (2900, Aktiva): Ausgabe erfolgt bereits in diesem Jahr, der Aufwand gehört aber ins nächste Jahr – z.B. Versicherungsprämie 01.07.–30.06. wird im Juli bezahlt; der Anteil Jan.–Juni des Folgejahres wird als ARA aktiviert (ARA an VBEI). PRA (4900, Passiva): Einnahme erfolgt bereits, der Ertrag gehört aber ins nächste Jahr – z.B. Mietvorauszahlung des Mieters für das Folgejahr (BK an PRA)." },
    erklaerung:"ARA: Aktivseite (2900) – Ausgabe jetzt, Aufwand später. PRA: Passivseite (4900) – Einnahme jetzt, Ertrag später. Buchungen: ARA an Aufwandskonto / BK an PRA. Kl.10 LB1." },

  // ── Paare zuordnen (Kl. 10) ───────────────────────────────────────────────
  { id:"pa10_1", typ:"zuordnung", ansicht:"konto", punkte:4, aktion:"klr",
    titel:"Paare zuordnen: Kennzahl → Berechnungsformel",
    story:"Zur MSA-Vorbereitung legt Ihre Lehrkraft eine Formelübersicht vor. Ordnen Sie jeder Kennzahl die richtige Berechnungsformel zu.",
    aufgabe:"Welche Berechnungsformel gehört zu welcher Kennzahl?",
    zuordnung:{
      items:[
        { id:"adII", text:"Anlagendeckung II",       korrektKat:"adII_f" },
        { id:"ekr",  text:"EK-Rentabilität",          korrektKat:"ekr_f"  },
        { id:"eliq", text:"Einzugsliquidität",        korrektKat:"eliq_f" },
        { id:"mgkz", text:"Materialgemeinkostenzuschlag", korrektKat:"mgkz_f" },
      ],
      kategorien:[
        { id:"adII_f", label:"(EK + LFV) ÷ AV × 100",  color:"#e8600a", rgb:"232,96,10"  },
        { id:"ekr_f",  label:"Gewinn ÷ EK × 100",      color:"#10b981", rgb:"16,185,129" },
        { id:"eliq_f", label:"(FO + BK) ÷ KFV × 100",  color:"#3b82f6", rgb:"59,130,246" },
        { id:"mgkz_f", label:"MGK ÷ MEK × 100",        color:"#a855f7", rgb:"168,85,247" },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Anlagendeckung II: (EK+LFV)÷AV×100 ≥100% = goldene Bilanzregel erfüllt. EK-Rentabilität: Gewinn÷EK×100. Einzugsliquidität: (FO+BK)÷KFV×100. MGKZ: MGK÷MEK×100. (Kl.10 LB2/LB3)" },
];

// ── Klasse 10 Kalender – Jahresabschluss-Nacharbeiten Januar 2026 ─────────────
// Wochenenden Jan 2026: 3,4,10,11,17,18,24,25,31 · Feiertage: 1 (Neujahr), 6 (Hl.3 Könige)
// Verfügbare Werktage: 2,5,7,8,9,12,13,14,15,16,19,20,21,22,23,26,27,28,29,30
const KALENDER10_EINTRAEGE = [
  { tag:2,  text:"Jahresabschluss GJ 2025 – Startbesprechung mit Steuerberater", typ:"info" },
  { tag:5,  text:"ARA-Buchung: Versicherungsbeitrag 2025/26 abgrenzen",           typ:"task", aufgabeAktion:"buchung" },
  { tag:7,  text:"Rückstellung Prozesskosten bilden (3.500 €)",                   typ:"task", aufgabeAktion:"buchung" },
  { tag:9,  text:"BAB abschließen: Fertigungsgemeinkostenzuschlag berechnen",     typ:"task", aufgabeAktion:"klr"    },
  { tag:12, text:"Herstellkosten Kraftstation 'MaxForce 300' kalkulieren",         typ:"task", aufgabeAktion:"klr"    },
  { tag:14, text:"Stückdeckungsbeitrag PulseRun berechnen",                       typ:"task", aufgabeAktion:"klr"    },
  { tag:15, text:"Teambesprechung: Vertriebsstrategie Q1/2026",                   typ:"info" },
  { tag:19, text:"Break-even-Analyse PulseRun abschließen",                       typ:"task", aufgabeAktion:"klr"    },
  { tag:21, text:"Eigenkapitalrentabilität GJ 2025 ermitteln",                    typ:"task", aufgabeAktion:"klr"    },
  { tag:22, text:"Anlagendeckung II + Einzugsliquidität berechnen",               typ:"task", aufgabeAktion:"klr"    },
  { tag:27, text:"Entwurf Geschäftsbericht GJ 2025 prüfen",                       typ:"info" },
  { tag:29, text:"Jahresabschluss GJ 2025 finalisiert und übermittelt",            typ:"info" },
];

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

const SIM_SCHWIERIGKEITEN = [
  { id: "7",  label: "Klasse 7",  desc: "Einfache Buchungen, keine USt" },
  { id: "8",  label: "Klasse 8",  desc: "Einkauf, Verkauf, Zahlung mit USt" },
  { id: "9",  label: "Klasse 9",  desc: "Kapitalanlage, Börsenspiel, AfA" },
  { id: "10", label: "Klasse 10", desc: "ARA, RST, Kennzahlen, KLR, MSA-Vorbereitung" },
];

// Eröffnungsbilanz-Werte je Schwierigkeit
function simStartKonten(klasse) {
  const k = Number(klasse);
  const basis = [
    { nr:"0870", name:"BGA",         kuerzel:"BGA",   seite:"aktiv",  betrag: 15000 },
    { nr:"2800", name:"Bank (BK)",    kuerzel:"BK",    seite:"aktiv",  betrag: 20000 },
    { nr:"2400", name:"Ford. aus L+L (FO)", kuerzel:"FO", seite:"aktiv", betrag: 8000 },
    { nr:"2000", name:"Rohstoffe (R)", kuerzel:"R",    seite:"aktiv",  betrag:  5000 },
    { nr:"3000", name:"Eigenkapital (EK)", kuerzel:"EK", seite:"passiv", betrag: 35000 },
    { nr:"4400", name:"Verb. aus L+L (VE)", kuerzel:"VE", seite:"passiv", betrag: 13000 },
  ];
  if (k >= 9) {
    basis.push({ nr:"0700", name:"Maschinen und Anlagen (MA)", kuerzel:"MA", seite:"aktiv", betrag: 30000 });
    basis.find(b => b.nr==="3000").betrag += 30000;
  }
  return basis;
}

// Hilfsfunktion: Ereignis-Objekt bauen
// Klasse 7: nur Kürzel (keine Nummern), Klasse 8+: Nr + Kürzel
function simKto(nr, name, kuerzel, betrag, klasse) {
  return { nr: Number(klasse) >= 8 ? nr : "", name: `${name}`, kuerzel, betrag };
}

// Geschäftsvorfälle-Pool je Schwierigkeit (je 15 Ereignisse)
function simEreignisse(klasse, firma) {
  const k = Number(klasse);
  const fn = firma?.name || "Unser Unternehmen";
  const lief = (firma?.lieferanten || LIEFERANTEN)[0]?.name || "Müller GmbH";
  const kunde = (firma?.kunden || [{ name:"Schmidt AG" }])[0]?.name || "Schmidt AG";
  const kto = (nr, name, kuerzel, betrag) => simKto(nr, name, kuerzel, betrag, k);
  const pool = [];

  // Klasse 7+: Einfache Buchungen, nur Kürzel
  pool.push(
    { id:"s1", titel:"Bareinkauf Büromaterial", text:`${fn} kauft Büromaterial für 480 € bar.`,
      soll:[kto("0870","Büromöbel/Geschäftsausstattung","BGA",480)],
      haben:[kto("2880","Kasse","KA",480)], punkte:2, klasse:7 },
    { id:"s2", titel:"Barverkauf Waren", text:`${fn} verkauft Waren für 1.200 € bar (ohne USt, Kl. 7).`,
      soll:[kto("2880","Kasse","KA",1200)],
      haben:[kto("5000","Umsatzerlöse FE","UEFE",1200)], punkte:2, klasse:7 },
    { id:"s3", titel:"Miete überweisen", text:`${fn} überweist die Monatsmiete von 2.400 € per Bank.`,
      soll:[kto("6700","Mieten und Pachten","AWMP",2400)],
      haben:[kto("2800","Bank","BK",2400)], punkte:2, klasse:7 },
    { id:"s4", titel:"Gehälter überweisen", text:`${fn} überweist Löhne und Gehälter i.H.v. 8.500 €.`,
      soll:[kto("6200","Löhne und Gehälter","LG",8500)],
      haben:[kto("2800","Bank","BK",8500)], punkte:2, klasse:7 },
    { id:"s4b", titel:"Rohstoffe bar eingekauft", text:`${fn} kauft Rohstoffe für 3.200 € bar.`,
      soll:[kto("6000","Aufwend. Rohstoffe","AWR",3200)],
      haben:[kto("2880","Kasse","KA",3200)], punkte:2, klasse:7 },
  );

  // Klasse 8+: mit Kontonummern und USt
  if (k >= 8) pool.push(
    { id:"s5", titel:"Eingangsrechnung buchen", text:`${lief} liefert Rohstoffe auf Ziel. Netto 4.000 €, USt 19 % = 760 €, Brutto 4.760 €.`,
      soll:[kto("6000","Aufwend. Rohstoffe (AWR)",   "AWR",  4000),
            kto("2600","Vorsteuer (VORST)",           "VORST", 760)],
      haben:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE",4760)], punkte:3, klasse:8 },
    { id:"s6", titel:"Ausgangsrechnung buchen", text:`${fn} liefert Fertigerzeugnisse an ${kunde} auf Ziel. Netto 6.000 €, USt 19 % = 1.140 €, Brutto 7.140 €.`,
      soll:[kto("2400","Forderungen aus L+L (FO)",   "FO",   7140)],
      haben:[kto("5000","Umsatzerlöse FE (UEFE)",     "UEFE", 6000),
             kto("4800","Umsatzsteuer (UST)",          "UST",  1140)], punkte:3, klasse:8 },
    { id:"s7", titel:"Lieferantenrechnung bezahlen", text:`${fn} bezahlt Verbindlichkeiten i.H.v. 4.760 € per Banküberweisung.`,
      soll:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE",4760)],
      haben:[kto("2800","Bank (BK)",                   "BK", 4760)], punkte:2, klasse:8 },
    { id:"s8", titel:"Forderungseingang", text:`${kunde} überweist 7.140 €.`,
      soll:[kto("2800","Bank (BK)",                   "BK", 7140)],
      haben:[kto("2400","Forderungen aus L+L (FO)",   "FO", 7140)], punkte:2, klasse:8 },
    { id:"s9", titel:"Rücksendung an Lieferant", text:`${fn} sendet Rohstoffe im Wert von 500 € netto + 95 € USt (19 %) zurück.`,
      soll:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE", 595)],
      haben:[kto("6000","Aufwend. Rohstoffe (AWR)",   "AWR", 500),
             kto("2600","Vorsteuer (VORST)",           "VORST", 95)], punkte:3, klasse:8 },
    { id:"s10", titel:"Zahlung mit Skonto", text:`${fn} bezahlt VE über 2.380 € unter Abzug von 2 % Skonto (= 47,60 €). Zahlung per Bank: 2.332,40 €.`,
      soll:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE",   2380)],
      haben:[kto("2800","Bank (BK)",                   "BK",    2332.40),
             kto("6001","Bezugskosten Rohstoffe (BZKR)","BZKR", 47.60)], punkte:4, klasse:8 },
    { id:"s10b", titel:"Warenlieferung bar (mit USt)", text:`${fn} kauft Hilfsstoffe für 595 € brutto (19 % USt) bar.`,
      soll:[kto("6020","Aufwend. Hilfsstoffe (AWH)","AWH",500),
            kto("2600","Vorsteuer (VORST)",          "VORST",95)],
      haben:[kto("2880","Kasse (KA)","KA",595)], punkte:3, klasse:8 },
  );

  // Klasse 9+: Anlagen, AfA, ZWFO
  if (k >= 9) pool.push(
    { id:"s11", titel:"Maschine kaufen (auf Ziel)", text:`${fn} kauft eine Maschine für 24.000 € netto + 19 % USt (= 4.560 €) auf Ziel.`,
      soll:[kto("0700","Maschinen und Anlagen (MA)","MA",  24000),
            kto("2600","Vorsteuer (VORST)",          "VORST",4560)],
      haben:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE",28560)], punkte:3, klasse:9 },
    { id:"s12", titel:"Abschreibung auf Sachanlagen", text:`Die Jahres-AfA auf Maschinen und Anlagen beträgt 4.800 €.`,
      soll:[kto("6520","Abschreibungen auf Sachanlagen (ABSA)","ABSA",4800)],
      haben:[kto("0700","Maschinen und Anlagen (MA)","MA",4800)], punkte:2, klasse:9 },
    { id:"s13", titel:"Zweifelhafte Forderung", text:`Die Forderung über 3.570 € brutto an ${kunde} ist gefährdet. Umbuchen auf zweifelhafte Forderungen.`,
      soll:[kto("2470","Zweifelhafte Forderungen (ZWFO)","ZWFO",3570)],
      haben:[kto("2400","Forderungen aus L+L (FO)",      "FO",  3570)], punkte:3, klasse:9 },
  );

  // Klasse 10: Jahresabschluss
  if (k >= 10) pool.push(
    { id:"s14", titel:"Rückstellung bilden", text:`${fn} bildet eine Rückstellung für Prozesskosten i.H.v. 5.000 €.`,
      soll:[kto("6990","Rückstellungsaufwand","RST-AW",5000)],
      haben:[kto("3900","Rückstellungen (RST)","RST",5000)], punkte:3, klasse:10 },
    { id:"s15", titel:"Aktive Rechnungsabgrenzung", text:`${fn} hat Versicherungskosten von 1.800 € vorausgezahlt, die das Folgejahr betreffen.`,
      soll:[kto("2900","Aktiver Rechnungsabgrenzungsposten (ARA)","ARA",1800)],
      haben:[kto("6700","Mieten und Pachten (AWMP)","AWMP",1800)], punkte:3, klasse:10 },
  );

  const gefiltert = pool.filter(e => e.klasse <= k);
  const gemischt = [...gefiltert].sort(() => Math.random() - 0.5);
  return gemischt.slice(0, Math.min(15, gemischt.length));
}


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
function MasteryModal({ onSchliessen }) {
  const mastery = ladeMastery();
  const [filterKlasse, setFilterKlasse] = React.useState("alle");

  // Alle Tasks aus AUFGABEN_POOL flach sammeln
  const alleTasks = [];
  [7,8,9,10].forEach(k => {
    Object.entries(AUFGABEN_POOL[k] || {}).forEach(([lb, tasks]) => {
      tasks.forEach(t => {
        if (!alleTasks.find(x => x.id === t.id))
          alleTasks.push({ ...t, lb, klasse: k });
      });
    });
  });

  const klassen = ["alle", 7, 8, 9, 10];
  const gefiltert = filterKlasse === "alle" ? alleTasks : alleTasks.filter(t => t.klasse === filterKlasse);
  const geuebt   = gefiltert.filter(t => (mastery[t.id] || 0) > 0).length;
  const gesamt   = gefiltert.length;
  const pct      = gesamt > 0 ? Math.round(geuebt / gesamt * 100) : 0;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"rgba(22,16,8,0.96)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:20, width:"100%", maxWidth:600,
        maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#0f172a,#1e293b)", padding:"20px 24px",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#e8600a", letterSpacing:".12em",
              textTransform:"uppercase", marginBottom:4 }}>BuchungsWerk</div>
            <div style={{ fontSize:20, fontWeight:900, color:"#fff" }}>📈 Mein Fortschritt</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1.5px solid #334155",
            borderRadius:10, color:"#94a3b8", width:36, height:36, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>

        {/* Gesamtfortschritt */}
        <div style={{ padding:"16px 24px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>
              Themen geübt: {geuebt} / {gesamt}
            </span>
            <span style={{ fontSize:13, fontWeight:800, color:"#e8600a" }}>{pct}%</span>
          </div>
          <div style={{ height:10, background:"#e2e8f0", borderRadius:10, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#22c55e,#e8600a)",
              borderRadius:10, transition:"width 0.5s" }} />
          </div>
          {/* Klassen-Filter */}
          <div style={{ display:"flex", gap:6, marginTop:12 }}>
            {klassen.map(k => (
              <button key={k} onClick={() => setFilterKlasse(k)}
                style={{ padding:"4px 12px", borderRadius:20, border:"1.5px solid",
                  borderColor: filterKlasse===k ? "#0f172a" : "#e2e8f0",
                  background: filterKlasse===k ? "#0f172a" : "#fff",
                  color: filterKlasse===k ? "#e8600a" : "#64748b",
                  fontWeight:700, fontSize:11, cursor:"pointer" }}>
                {k === "alle" ? "Alle Klassen" : `Klasse ${k}`}
              </button>
            ))}
          </div>
        </div>

        {/* Task-Liste */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {/* Gruppiert nach LB */}
          {[...new Set(gefiltert.map(t => t.lb))].map(lb => {
            const lbTasks = gefiltert.filter(t => t.lb === lb);
            return (
              <div key={lb} style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase",
                  letterSpacing:".1em", marginBottom:8 }}>{lb}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {lbTasks.map(task => {
                    const count = mastery[task.id] || 0;
                    const ml = masteryLevel(count);
                    const barPct = Math.min(100, count / 20 * 100);
                    return (
                      <div key={task.id} style={{ display:"flex", alignItems:"center", gap:10,
                        padding:"8px 12px", borderRadius:10, background:ml.bg,
                        border:`1px solid ${ml.color}33` }}>
                        <span style={{ flexShrink:0, color:ml.color, display:"flex" }}>
                          {ml.level >= 4 ? <Trophy size={16} strokeWidth={1.5}/> : ml.level === 3 ? <Star size={16} strokeWidth={1.5}/> : ml.level === 2 ? <TrendingUp size={16} strokeWidth={1.5}/> : ml.level === 1 ? <Sprout size={16} strokeWidth={1.5}/> : <span style={{ fontSize:14, color:"#94a3b8" }}>○</span>}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"#0f172a",
                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {task.titel}
                          </div>
                          <div style={{ height:4, background:"#e2e8f0", borderRadius:4, marginTop:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${barPct}%`, background:ml.color,
                              borderRadius:4, transition:"width 0.4s" }} />
                          </div>
                        </div>
                        <div style={{ flexShrink:0, textAlign:"right" }}>
                          <div style={{ fontSize:11, fontWeight:800, color:ml.color }}>{ml.label}</div>
                          <div style={{ fontSize:10, color:"#94a3b8" }}>{count}×</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legende */}
        <div style={{ padding:"12px 24px", borderTop:"1px solid #f1f5f9", background:"#f8fafc",
          display:"flex", gap:12, flexWrap:"wrap" }}>
          {[
            { IconC: Sprout,    color:"#16a34a", label:"Beginner (1×)" },
            { IconC: TrendingUp, color:"#2563eb", label:"Geübt (5×)" },
            { IconC: Star,      color:"#7c3aed", label:"Fortgesch. (10×)" },
            { IconC: Trophy,    color:"#f59e0b", label:"Meister (20×)" },
          ].map(({ IconC, color, label }) => (
            <span key={label} style={{ fontSize:11, color:"#64748b", display:"flex", alignItems:"center", gap:4 }}><IconC size={12} strokeWidth={1.5} color={color}/>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── EinstellungenModal ────────────────────────────────────────────────────────
function EinstellungenModal({ settings, setSettings, onSchliessen }) {
  const [tab, setTab] = React.useState("profil");
  const [local, setLocal] = React.useState({ ...settings });

  function set(key, val) { setLocal(s => ({ ...s, [key]: val })); }
  function speichern() { setSettings(local); speichereSettings(local); onSchliessen(); }

  const tabs = [
    { id:"profil",   icon: User,       label:"Profil"    },
    { id:"aufgaben", icon: Settings2,  label:"Aufgaben"  },
    { id:"anzeige",  icon: Eye,        label:"Anzeige"   },
    { id:"export",   icon: Download,   label:"Export"    },
    { id:"hilfe",    icon: HelpCircle, label:"Hilfe"     },
  ];

  const row = (label, children) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid #f1f5f9" }}>
      <span style={{ fontSize:"14px", color:"#374151", fontWeight:500 }}>{label}</span>
      <div>{children}</div>
    </div>
  );
  const chk = (key, label) => (
    <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", fontSize:"14px" }}>
      <input type="checkbox" checked={!!local[key]} onChange={e=>set(key,e.target.checked)}
        style={{ width:"18px", height:"18px", accentColor:"#0f172a", cursor:"pointer" }} />
      <span style={{ color:"#374151" }}>{label}</span>
    </label>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"rgba(22,16,8,0.97)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:"20px", width:"100%", maxWidth:"560px", maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1a1208,#251a0a)", borderBottom:"2px solid #e8600a", padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:700, color:"#e8600a", letterSpacing:".12em", textTransform:"uppercase", marginBottom:"4px" }}>BuchungsWerk</div>
            <div style={{ fontSize:"20px", fontWeight:900, color:"#f0ece3" }}>Einstellungen</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:"10px", color:"rgba(240,236,227,0.5)", width:"36px", height:"36px", cursor:"pointer", fontSize:"18px" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"2px solid rgba(240,236,227,0.1)", background:"rgba(240,236,227,0.03)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex:1, padding:"12px 8px", border:"none", background:"transparent", cursor:"pointer", fontSize:"12px", fontWeight:tab===t.id?800:500,
                color:tab===t.id?"#f0ece3":"rgba(240,236,227,0.45)",
                borderBottom:`3px solid ${tab===t.id?"#e8600a":"transparent"}`,
                transition:"all 0.15s" }}>
              <div style={{ marginBottom:"4px", display:"flex", justifyContent:"center" }}>{React.createElement(t.icon, { size: 18, strokeWidth: 1.5 })}</div>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {tab === "profil" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Lehrkraft & Schule</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
                <div>
                  <label style={{ fontSize:"11px", fontWeight:700, color:"#64748b", display:"block", marginBottom:"4px" }}>Vorname</label>
                  <input value={local.lehrerVorname} onChange={e=>set("lehrerVorname",e.target.value)}
                    placeholder="z.B. Maria" style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize:"11px", fontWeight:700, color:"#64748b", display:"block", marginBottom:"4px" }}>Nachname</label>
                  <input value={local.lehrerNachname} onChange={e=>set("lehrerNachname",e.target.value)}
                    placeholder="z.B. Gruber" style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom:"16px" }}>
                <label style={{ fontSize:"11px", fontWeight:700, color:"#64748b", display:"block", marginBottom:"4px" }}>Stammschule</label>
                <input value={local.stammschule} onChange={e=>set("stammschule",e.target.value)}
                  placeholder="z.B. Realschule Musterstadt"
                  style={{ ...S.input, width:"100%", boxSizing:"border-box" }} />
                <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"4px" }}>→ Wird automatisch in alle Kopfzeilen bei Prüfungsexport übernommen.</div>
              </div>
              {(local.stammschule || local.lehrerVorname) && (
                <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"12px 16px", fontSize:"13px", color:"#374151" }}>
                  <div style={{ fontWeight:700, marginBottom:"4px" }}>Vorschau Kopfzeile:</div>
                  <div>{local.stammschule || "Schule nicht angegeben"}</div>
                  {(local.lehrerVorname || local.lehrerNachname) && <div style={{ color:"#64748b", fontSize:"12px", marginTop:"2px" }}>Lehrkraft: {local.lehrerVorname} {local.lehrerNachname}</div>}
                </div>
              )}
            </div>
          )}

          {tab === "aufgaben" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Aufgaben generieren</div>
              {chk("sofortrabatte", "Sofortrabatte in Eingangsrechnungen berücksichtigen")}
              <div style={{ height:1, background:"#f1f5f9", margin:"4px 0" }} />
              {chk("anschaffungsnebenkosten", "Anschaffungsnebenkosten (Bezugskosten) verwenden")}
              <div style={{ height:1, background:"#f1f5f9", margin:"4px 0" }} />
              {chk("einfacheBetraege", "Einfache (runde) Beträge bevorzugen")}
              <div style={{ marginTop:"16px", padding:"10px 14px", background:"#fffbeb", borderRadius:"10px", border:"1px solid #fde68a", fontSize:"12px", color:"#92400e", display:"flex", alignItems:"flex-start", gap:6 }}>
                <AlertTriangle size={12} strokeWidth={1.5} style={{flexShrink:0,marginTop:1}}/><span>Änderungen wirken sich auf neu generierte Aufgaben aus, nicht auf bereits erstellte.</span>
              </div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", margin:"20px 0 12px" }}>Anrede</div>
              {chk("anredeKlasse10", 'Klasse 10: Schüler automatisch mit "Sie" ansprechen')}
            </div>
          )}

          {tab === "anzeige" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Darstellung</div>
              {chk("kontennummernAnzeigen", "Kontennummern in Lösungen anzeigen")}
              <div style={{ height:1, background:"#f1f5f9", margin:"4px 0" }} />
              {chk("loesungenStandardAn", "Lösungen beim Öffnen standardmäßig eingeblendet")}
              <div style={{ height:1, background:"#f1f5f9", margin:"4px 0" }} />

              <div style={{ padding:"12px 0", borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ fontSize:"14px", color:"#374151", fontWeight:500, marginBottom:"8px" }}>Standard-Belegmodus</div>
                <div style={{ display:"flex", gap:"8px" }}>
                  {[["beleg","Beleg"],["text","Geschäftsfall"]].map(([v,l]) => (
                    <button key={v} onClick={() => set("belegModus",v)}
                      style={{ flex:1, padding:"10px", border:`2px solid ${local.belegModus===v?"#0f172a":"#e2e8f0"}`,
                        borderRadius:"10px", background:local.belegModus===v?"#0f172a":"#fff",
                        color:local.belegModus===v?"#fff":"#64748b", fontWeight:700, fontSize:"13px", cursor:"pointer" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding:"12px 0" }}>
                <div style={{ fontSize:"14px", color:"#374151", fontWeight:500, marginBottom:"8px" }}>Lösungsfarbe</div>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                  {[["#16a34a","Grün"],["#1d4ed8","Blau"],["#dc2626","Rot"],["#7c3aed","Lila"],["#0f172a","Schwarz"]].map(([c,l]) => (
                    <button key={c} onClick={() => set("loesungsfarbe",c)}
                      style={{ padding:"7px 14px", border:`2.5px solid ${local.loesungsfarbe===c?c:"#e2e8f0"}`,
                        borderRadius:"20px", background:local.loesungsfarbe===c?c+"18":"#fff",
                        color:local.loesungsfarbe===c?c:"#64748b", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "export" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Standard-Exportformat</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
                {[["word","Word / Pages","Empfohlen für iPad"],["pdf","PDF","Direkt druckbereit"]].map(([v,l,d]) => (
                  <button key={v} onClick={() => set("exportFormat",v)}
                    style={{ padding:"16px", border:`2.5px solid ${local.exportFormat===v?"#0f172a":"#e2e8f0"}`,
                      borderRadius:"14px", background:local.exportFormat===v?"#0f172a":"#fff",
                      color:local.exportFormat===v?"#fff":"#475569", cursor:"pointer", textAlign:"left" }}>
                    <div style={{ fontWeight:700, fontSize:"14px", marginBottom:"2px" }}>{l}</div>
                    <div style={{ fontSize:"11px", opacity:0.6 }}>{d}</div>
                    {local.exportFormat===v && <div style={{ marginTop:"6px", fontSize:"11px", color:"#e8600a" }}>✓ Standard</div>}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"12px" }}>Über BuchungsWerk</div>
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"14px 16px", fontSize:"13px", color:"#374151" }}>
                <div style={{ fontWeight:700, fontSize:"15px", marginBottom:"6px" }}>Buchungs<span style={{ color:"#e8600a" }}>Werk</span></div>
                <div>Version: 2026 · Bayern · Realschule BwR</div>
                <div style={{ color:"#94a3b8", fontSize:"12px", marginTop:"4px" }}>Für den Einsatz an bayerischen Realschulen im Fach BwR.</div>
                {(local.lehrerVorname || local.stammschule) && (
                  <div style={{ marginTop:"8px", paddingTop:"8px", borderTop:"1px solid #e2e8f0", color:"#64748b" }}>
                    Lizenziert für: {local.lehrerVorname} {local.lehrerNachname}{local.stammschule ? ` · ${local.stammschule}` : ""}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "hilfe" && (
            <div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"16px" }}>Häufige Fragen</div>
              {[
                { q:"Wie generiere ich Aufgaben?",
                  a:"Im ersten Schritt Klasse und Thema wählen, dann Firmenname eingeben – BuchungsWerk erstellt automatisch passende Aufgaben mit Buchungssatz und Musterlösung." },
                { q:"Was sind Eigene Belege?",
                  a:"Im Beleg-Editor kannst du eigene Rechnungen, Kontoauszüge oder Überweisungen erstellen und daraus per KI eine vollständige Buchungsaufgabe generieren lassen." },
                { q:"Wie exportiere ich eine Schulaufgabe?",
                  a:"Im Aufgaben-Schritt den Export-Button nutzen – als Word/Pages-Datei oder PDF. Das Layout entspricht dem bayerischen Schulaufgabenformat mit Punkte- und Notenfeld." },
                { q:"Was bedeuten die Punkte-Badges?",
                  a:"Jeder Buchungssatz-Block ergibt 1 Punkt. Nebenrechnungen (z.B. Skonto, Abschreibung) werden separat ausgewiesen. Die Bepunktung folgt der aktuellen Handreichung." },
                { q:"Wie funktioniert der KI-Helfer?",
                  a:"Bei eigenen Belegen kann per Knopfdruck eine vollständige Aufgabe mit Lösung und didaktischem Kommentar generiert werden. Die KI nutzt ausschließlich den bayerischen Kontenplan." },
                { q:"Was ist der Kontenplan-Button?",
                  a:"Unten in der Navigationsleiste öffnet sich der vollständige bayerische Kontenplan (IKR) mit Suche, Filteroptionen und KLR-Markierungen." },
                { q:"Wie ändere ich die Stammschule?",
                  a:"Im Tab 'Profil' dieser Einstellungen. Stammschule und Name werden automatisch in alle exportierten Schulaufgaben-Kopfzeilen übernommen." },
                { q:"Werden meine Daten gespeichert?",
                  a:"Alle Einstellungen und Belege werden lokal im Browser (localStorage) gespeichert – keine Daten auf externen Servern. Für die KI-Funktion wird nur der anonymisierte Beleg-Text übertragen." },
              ].map(({ q, a }, i) => (
                <div key={i} style={{ marginBottom:12, padding:"11px 14px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:3 }}>❓ {q}</div>
                  <div style={{ fontSize:13, color:"#475569", lineHeight:1.6 }}>{a}</div>
                </div>
              ))}
              <div style={{ marginTop:14, padding:"11px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, fontSize:12, color:"#92400e" }}>
                <strong>Probleme oder Feedback?</strong><br />Den Support-Button unten rechts verwenden – danke!
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", gap:"10px" }}>
          <button onClick={onSchliessen} style={{ flex:1, padding:"12px", background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"14px", cursor:"pointer" }}>
            Abbrechen
          </button>
          <button onClick={speichern} style={{ flex:2, padding:"12px", background:"#0f172a", color:"#fff", border:"none", borderRadius:"10px", fontWeight:800, fontSize:"14px", cursor:"pointer",
            boxShadow:"0 4px 16px rgba(15,23,42,0.25)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <Save size={16} strokeWidth={1.5}/>Speichern
          </button>
        </div>
      </div>
    </div>
  );
}


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
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.72)", zIndex:3000, display:"flex", alignItems:"stretch", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onSchliessen()}>
      <div style={{ background:"#0f172a", width:"100%", maxWidth:860, display:"flex", flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,.7)", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1e293b,#0f172a)", borderBottom:"2px solid #e8600a", padding:"14px 20px 12px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <span style={{ fontSize:24 }}>🎓</span>
          <div style={{ flex:1 }}>
            <div style={{ color:"#f8fafc", fontWeight:800, fontSize:16 }}>AP-Übung · BwR Klasse 10</div>
            <div style={{ color:"#94a3b8", fontSize:11 }}>
              {satz.unternehmen.name} · {gesamt} Punkte gesamt
            </div>
          </div>
          <button onClick={neuerSatz}
            style={{ background:"rgba(240,236,227,0.06)", border:"1px solid rgba(240,236,227,0.18)", color:"rgba(240,236,227,0.7)", borderRadius:7, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            ↻ Neuer Satz
          </button>
          <button onClick={onSchliessen}
            style={{ background:"#334155", border:"none", color:"#94a3b8", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontSize:13, fontWeight:700 }}>✕</button>
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
