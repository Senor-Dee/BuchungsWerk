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
import SimulationModus from "./components/simulation/SimulationModus.jsx";



import { LinienDiagramm, BalkenDiagramm, SchaubildAnzeige, GeschaeftsfallKarte } from "./components/common/Schaubilder.jsx";

import { BuchungsSatz, TKonten, NebenrechnungBox, SchemaTabelle,
         AngebotsVergleichAufgabe, AngebotsVergleichLoesung, BELEG_LABEL } from "./components/aufgaben/Buchungskomponenten.jsx";
import { TheorieKarte, KomplexKarte, BelegGFSlider, AufgabeKarte } from "./components/aufgaben/AufgabeKarte.jsx";
import PunktePanel from "./components/aufgaben/PunktePanel.jsx";
import ExportModal from "./components/export/ExportModal.jsx";

// ══════════════════════════════════════════════════════════════════════════════
// SCHRITT 3 — Aufgaben-Vorschau
// ══════════════════════════════════════════════════════════════════════════════
import SchrittAufgaben from "./components/wizard/SchrittAufgaben.jsx";
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
  const [configVersion, setConfigVersion] = useState(0);
  const [initialAufgaben, setInitialAufgaben] = useState(null);
  const reset = () => { setSchritt(1); setConfig(null); setFirma(null); setInitialAufgaben(null); setIsVonURL(false); };

  const materialLaden = ({ config: c, firma: f, aufgaben: a }) => {
    setConfig(c);
    setFirma(f);
    setInitialAufgaben(a || null);
    setConfigVersion(v => v + 1);
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
        {schritt === 3 && <ErrorBoundary><SchrittAufgaben key={configVersion} config={config} firma={firma} initialAufgaben={initialAufgaben} onNeu={reset} onMaterialLaden={materialLaden} onThemen={zuThemen} onFirma={zuFirma} aufgabenRef={aufgabenForQuizRef} /></ErrorBoundary>}
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
