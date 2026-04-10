// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Anton Gebert <info@buchungswerk.org> - BuchungsWerk

import React, { useState, useRef, useEffect } from "react";
import { Factory, BookOpen, GraduationCap, BookMarked,
         Users, FolderOpen,
         Zap, Star, Trophy, Flame, Sprout,
         ListChecks, Dices, Play, BarChart2, Building2, TrendingUp } from "lucide-react";
import { useStreak } from "./hooks/useStreak.js";
import { useLevel } from "./hooks/useLevel.js";
import { S } from "./styles.js";
import { SettingsContext, ladeSettings, ladeStreak, aktualisiereStreak } from "./settings.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import SupportButton from "./components/SupportButton.jsx";
import DisclaimerModal from "./components/modals/DisclaimerModal.jsx";
import MasteryModal from "./components/modals/MasteryModal.jsx";
import EinstellungenModal from "./components/modals/EinstellungenModal.jsx";
import BelegEditorModal from "./components/beleg/BelegEditorModal.jsx";
import EigeneBelege from "./components/beleg/EigeneBelege.jsx";
import { KontenplanModal } from "./components/kontenplan/KontenplanModal.jsx";
import MaterialienModal from "./components/export/MaterialienModal.jsx";
import APUebungModal from "./components/modals/APUebungModal.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import { SchrittTyp } from "./components/wizard/SchrittTyp.jsx";
import { SchrittFirma } from "./components/wizard/SchrittFirma.jsx";
import SchrittAufgaben from "./components/wizard/SchrittAufgaben.jsx";
import SimulationModus from "./components/simulation/SimulationModus.jsx";

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
  const [bibliothekPickerOffen, setBibliothekPickerOffen] = useState(false);
  const [disclaimerOffen, setDisclaimerOffen] = useState(() => {
    if (gastModus) return false;
    try { return !localStorage.getItem("bw_disclaimer_ok"); } catch { return true; }
  });
  const [isVonURL, setIsVonURL] = useState(false);
  const simResetFnRef = useRef(null);
  const [klasseZimmerOffen, setKlasseZimmerOffen] = useState(false);
  const [klasseZimmerAufgaben, setKlasseZimmerAufgaben] = useState([]);
  const aufgabenForQuizRef = useRef([]);
  const [configVersion, setConfigVersion] = useState(0);
  const [initialAufgaben, setInitialAufgaben] = useState(null);
  const [hoveredNav, setHoveredNav] = useState(null);
  const hoverTimerRef = useRef(null);
  const contentBlurRef = useRef(null);
  // Jede Blur-Quelle hält ihr eigenes Level – updateBlur() nimmt immer das Maximum.
  // Verhindert, dass navLeave/dropdown-close ein höher-priorisiertes bibliothek-Level löscht.
  const blurSourcesRef = useRef({ nav: 0, bibliothek: 0, dropdown: 0 });

  const updateBlur = () => {
    const el = contentBlurRef.current;
    if (!el) return;
    const level = Math.max(
      blurSourcesRef.current.nav,
      blurSourcesRef.current.bibliothek,
      blurSourcesRef.current.dropdown,
    );
    el.style.filter = level === 2 ? "blur(10px) brightness(0.55)"
                    : level === 1 ? "blur(5px) brightness(0.70)"
                    : "";
  };

  const reset = () => { setSchritt(1); setConfig(null); setFirma(null); setInitialAufgaben(null); setIsVonURL(false); };
  const navEnter = (label, level = 1) => { clearTimeout(hoverTimerRef.current); setHoveredNav(label); blurSourcesRef.current.nav = level; updateBlur(); };
  const navLeave = () => { hoverTimerRef.current = setTimeout(() => { setHoveredNav(null); blurSourcesRef.current.nav = 0; updateBlur(); }, 80); };

  const materialLaden = ({ config: c, firma: f, aufgaben: a }) => {
    // Alle Blur-Quellen zurücksetzen (Bibliothek-Picker könnte offen/aktiv sein)
    blurSourcesRef.current.bibliothek = 0;
    blurSourcesRef.current.nav = 0;
    updateBlur();
    setBibliothekPickerOffen(false);
    setConfig(c);
    setFirma(f);
    setInitialAufgaben(a || null);
    setConfigVersion(v => v + 1);
    setSchritt(3);
  };

  const [skipFirma, setSkipFirma] = useState(false);
  const zuThemen = () => { setSkipFirma(true); setSchritt(1); };
  const zuFirma  = () => setSchritt(2);

  const isSimulation = schritt === 4;

  // Custom Events: UserBadge (main.jsx) kann Mastery + Einstellungen öffnen + Dropdown-Blur
  useEffect(() => {
    const openMastery   = () => setMasteryOffen(true);
    const openSettings  = () => setEinstellungenOffen(true);
    const onDropdown    = (e) => { blurSourcesRef.current.dropdown = e.detail?.open ? 1 : 0; updateBlur(); };
    window.addEventListener("bw:mastery",   openMastery);
    window.addEventListener("bw:settings",  openSettings);
    window.addEventListener("bw:dropdown",  onDropdown);
    return () => {
      window.removeEventListener("bw:mastery",  openMastery);
      window.removeEventListener("bw:settings", openSettings);
      window.removeEventListener("bw:dropdown", onDropdown);
    };
  }, []);

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

      {/* ── Hover-Scrim: Level 1 – nur Overlay, kein backdrop-filter ── */}
      {hoveredNav !== null && (
        <div style={{
          position:"fixed", top:62, bottom:56, left:0, right:0,
          zIndex:99, pointerEvents:"none",
          background:"rgba(0,0,0,0.08)",
          animation:"bw-backdrop 0.15s ease",
        }} />
      )}

      {/* CSS Animations + Blur-Klassen */}
      <style>{`
        @keyframes bw-picker-up {
          from { opacity:0; transform:translateY(18px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes bw-backdrop {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes bw-nav-expand {
          from { opacity:0; transform:translateX(-50%) translateY(8px) scale(0.93); }
          to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
        .bw-nav-btn {
          transition: all 0.18s cubic-bezier(0.23,1,0.32,1) !important;
        }
        .bw-nav-btn:hover { transform: translateY(-2px) !important; }
        .bw-picker-btn {
          transition: background 0.15s, border-color 0.15s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1) !important;
        }
        .bw-picker-btn:hover {
          background: rgba(232,96,10,0.13) !important;
          border-color: rgba(232,96,10,0.4) !important;
          transform: translateY(-2px) !important;
        }
      `}</style>

      {/* Bibliothek-Picker — animiertes Bottom-Sheet */}
      {bibliothekPickerOffen && (
        <>
          <div style={{ position:"fixed", top:62, bottom:56, left:0, right:0, zIndex:150,
            background:"rgba(0,0,0,0.15)",
            animation:"bw-backdrop 0.18s ease" }}
            onClick={() => { blurSourcesRef.current.bibliothek = 0; updateBlur(); setBibliothekPickerOffen(false); }} />
          <div style={{ position:"fixed", bottom:72, left:8, right:8, zIndex:151,
            animation:"bw-picker-up 0.32s cubic-bezier(0.34,1.56,0.64,1)",
            background:"rgba(12,8,2,0.98)", backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
            border:"1px solid rgba(240,236,227,0.13)", borderTop:"2px solid #e8600a",
            borderRadius:16, padding:"10px",
            display:"flex", gap:8, boxShadow:"0 -12px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(232,96,10,0.08)" }}>
            {[
              { icon: BookOpen,   label:"Materialien",   sub:"Geteilte Aufgabensets laden",    action: () => { blurSourcesRef.current.bibliothek = 0; updateBlur(); setBibliothekPickerOffen(false); setMaterialienStartOffen(true); } },
              { icon: FolderOpen, label:"Eigene Belege", sub:"Selbst erstellte Belege öffnen", action: () => { blurSourcesRef.current.bibliothek = 0; updateBlur(); setBibliothekPickerOffen(false); setEigeneBelegeOffen(true); } },
            ].map(({ icon: Icon, label, sub, action }) => (
              <button key={label} onClick={action} className="bw-picker-btn"
                style={{ flex:1, display:"flex", alignItems:"center", gap:12, padding:"12px 18px", borderRadius:12,
                  background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.09)",
                  cursor:"pointer", color:"#f0ece3" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"rgba(232,96,10,0.12)",
                  border:"1px solid rgba(232,96,10,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon size={18} strokeWidth={1.5} style={{ color:"#e8600a" }} />
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:13, fontWeight:700, letterSpacing:"-.01em" }}>{label}</div>
                  <div style={{ fontSize:10, color:"rgba(240,236,227,0.35)", marginTop:2, fontWeight:500 }}>{sub}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── TOP-BAR ─────────────────────────────────────────────────────────── */}
      <div style={{ ...S.topbar, justifyContent:"space-between" }}>

        {/* Links: Logo + Streak */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
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

        {/* Mitte: Kontext-abhängige Bar */}
        {isSimulation && isVonURL ? (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Factory size={13} strokeWidth={1.5} style={{ color:"#e8600a" }}/>
            <span style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.45)", letterSpacing:".07em", textTransform:"uppercase" }}>Simulation · Schüler</span>
          </div>
        ) : isSimulation ? (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Factory size={13} strokeWidth={1.5} style={{ color:"#e8600a" }}/>
            <span style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.45)", letterSpacing:".07em", textTransform:"uppercase" }}>Simulation</span>
            <button onClick={() => simResetFnRef.current?.()} className="bw-btn"
              style={{ marginLeft:6, padding:"5px 11px", background:"rgba(232,96,10,0.1)", border:"1px solid rgba(232,96,10,0.25)", borderRadius:7, color:"#e8600a", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              ← Zur Session
            </button>
            <button onClick={reset} className="bw-btn"
              style={{ padding:"5px 11px", background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:7, color:"rgba(240,236,227,0.35)", fontSize:11, fontWeight:600, cursor:"pointer" }}>
              Verlassen ✕
            </button>
          </div>
        ) : gastModus ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
            <button onClick={() => setKontenplanOffen(true)} className="bw-btn"
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"rgba(232,96,10,0.1)", border:"1px solid rgba(232,96,10,0.25)", borderRadius:8, color:"#e8600a", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              <BookMarked size={14} strokeWidth={1.5}/>Kontenplan
            </button>
          </div>
        ) : (
          /* Lehrer-Stepper */
          <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", overflow:"hidden", padding:"0 12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:0 }}>
              {[["Thema","1"],["Unternehmen","2"],["Aufgaben","3"],["Export","4"]].map(([label], i) => {
                const s = i + 1;
                const done = schritt > s;
                const active = schritt === s;
                return (
                  <React.Fragment key={s}>
                    {i > 0 && (
                      <div style={{ width:32, height:2, background: done?"rgba(240,236,227,0.25)":"rgba(240,236,227,0.08)", flexShrink:0 }} />
                    )}
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{
                        width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize: done?12:11, fontWeight:800,
                        background: done?"rgba(240,236,227,0.18)": active?"linear-gradient(180deg,#f07320,#e8600a)":"rgba(240,236,227,0.06)",
                        color: done?"rgba(240,236,227,0.6)": active?"#fff":"rgba(240,236,227,0.3)",
                        border: active?"1px solid rgba(255,170,60,0.3)": done?"none":"1px solid rgba(240,236,227,0.12)",
                        boxShadow: active?"0 0 14px rgba(232,96,10,0.5), 0 2px 0 rgba(0,0,0,0.4)":"none",
                        transition:"all 0.2s"
                      }}>
                        {done?"✓":s}
                      </div>
                      <span style={{ fontSize:8, fontWeight:active?700:500, color:active?"#e8600a":done?"rgba(240,236,227,0.45)":"rgba(240,236,227,0.25)", letterSpacing:".05em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                        {label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Rechts: Spacer damit der Stepper visuell zentriert bleibt (UserBadge aus main.jsx liegt darüber) */}
        <div style={{ flexShrink:0, minWidth:130 }} />
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      {!gastModus && <SupportButton />}
      <div style={{ ...S.container, paddingBottom: 16 }}>
        <div ref={contentBlurRef} style={{ transition: "filter 0.22s ease" }}>
          {schritt === 1 && <SchrittTyp
            onWeiter={cfg => { setConfig(cfg); if (skipFirma) { setSkipFirma(false); setSchritt(3); if (!gastModus) setStreak(aktualisiereStreak()); } else setSchritt(2); }}
            onBelegEditor={() => setBelegEditorOffen(true)}
            onEigeneBelege={() => setEigeneBelegeOffen(true)}
            onSimulation={() => setSchritt(4)}
            initialConfig={skipFirma ? config : null}
            onFirmaWaehlen={skipFirma ? () => { setSkipFirma(false); setSchritt(2); } : null}
          />}
          {schritt === 2 && <SchrittFirma config={config} onWeiter={f => { setFirma(f); setSchritt(3); if (!gastModus) setStreak(aktualisiereStreak()); }} onZurueck={() => setSchritt(1)} />}
          {schritt === 3 && <ErrorBoundary><SchrittAufgaben key={configVersion} config={config} firma={firma} initialAufgaben={initialAufgaben} onNeu={reset} onMaterialLaden={materialLaden} onThemen={zuThemen} onFirma={zuFirma} aufgabenRef={aufgabenForQuizRef} /></ErrorBoundary>}
          {schritt === 4 && <ErrorBoundary><SimulationModus onZurueck={reset} onVonURLDetected={() => setIsVonURL(true)} onRegisterReset={fn => { simResetFnRef.current = fn; }} /></ErrorBoundary>}
        </div>
      </div>

      {/* Spacer für fixe Bottom-Bar */}
      <div style={{ height: 80 }} />

      {/* ── BOTTOM-BAR – Liquid-Glass 3-Layer + Hover-Expand ──────────────────── */}
      {!gastModus && (
        <>
          {/* SVG glass-distort filter (einmalig im DOM) */}
          <svg style={{ position:"absolute", width:0, height:0, overflow:"hidden", pointerEvents:"none" }}>
            <defs>
              <filter id="bw-glass-filter" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.018 0.042" numOctaves="1" seed="5" result="turb"/>
                <feDisplacementMap in="SourceGraphic" in2="turb" scale="7" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
            </defs>
          </svg>

          <div style={{
            position:"fixed", bottom:0, left:0, right:0,
            height:56, zIndex:100,
            display:"flex", alignItems:"center", padding:"0 4px",
            background:"rgba(14,10,4,0.62)",
            backdropFilter:"blur(40px) saturate(230%) brightness(1.12)",
            WebkitBackdropFilter:"blur(40px) saturate(230%) brightness(1.12)",
            borderTop:"1px solid rgba(255,255,255,0.09)",
            boxShadow:[
              "0 -1px 0 rgba(0,0,0,0.60)",
              "inset 0 1px 0 rgba(255,255,255,0.07)",
              "inset 0 -1px 0 rgba(0,0,0,0.18)",
            ].join(", "),
          }}>
            {/* ── Nav items ── */}
            {[
              { icon: BookOpen,      label:"Bibliothek",    active: bibliothekPickerOffen,
                action: () => setBibliothekPickerOffen(v => { blurSourcesRef.current.bibliothek = v ? 0 : 2; updateBlur(); return !v; }),
                expandItems: [
                  { icon: BookOpen,   label:"Materialien",   sub:"Aufgabensets laden",      action: () => { setBibliothekPickerOffen(false); setMaterialienStartOffen(true); } },
                  { icon: FolderOpen, label:"Eigene Belege", sub:"Selbst erstellte Belege", action: () => { setBibliothekPickerOffen(false); setEigeneBelegeOffen(true); } },
                ],
              },
              { icon: GraduationCap, label:"Abschluss", action: () => setApUebungOffen(true),
                expandItems: [
                  { icon: ListChecks, label:"Pflichtaufgaben", sub:"Aufg. 1–5: Buchführung bis Jahresabschluss", action: () => setApUebungOffen(true) },
                  { icon: Dices,      label:"Wahlteil",        sub:"Aufg. 6 – KLR · 7 – Forderung · 8 – Einkauf", action: () => setApUebungOffen(true) },
                ],
              },
              { icon: Users, label:"Klassenzimmer",
                action: () => { setKlasseZimmerAufgaben(aufgabenForQuizRef.current || []); setKlasseZimmerOffen(true); },
                expandItems: [
                  { icon: Play,      label:"Quiz starten", sub:"Live-Übung für die Klasse",      action: () => { setKlasseZimmerAufgaben(aufgabenForQuizRef.current || []); setKlasseZimmerOffen(true); } },
                  { icon: BarChart2, label:"Auswertung",   sub:"Ergebnisse & Bestenliste anzeigen", action: () => { setKlasseZimmerAufgaben(aufgabenForQuizRef.current || []); setKlasseZimmerOffen(true); } },
                ],
              },
              { icon: BookMarked, label:"Kontenplan", action: () => setKontenplanOffen(true),
                expandItems: [
                  { icon: Building2,  label:"Bestandskonten", sub:"Klasse 0–4: Aktiva & Passiva",   action: () => setKontenplanOffen(true) },
                  { icon: TrendingUp, label:"Erfolgskonten",  sub:"Klasse 5–8: Aufwand & Ertrag",   action: () => setKontenplanOffen(true) },
                  { icon: BookMarked, label:"Alle SKR04",     sub:"Vollständiger Kontenplan",        action: () => setKontenplanOffen(true) },
                ],
              },
            ].map(({ icon: Icon, label, action, active, expandItems, desc }) => {
              const isHovered = hoveredNav === label;
              return (
                <div key={label} style={{ position:"relative", flex:1 }}
                  onMouseEnter={() => navEnter(label)}
                  onMouseLeave={() => navLeave()}>

                  {/* ── Hover expand panel ── */}
                  {isHovered && (
                    <>
                      {/* Transparente Brücke schließt 8px-Lücke, verhindert mouseLeave */}
                      <div style={{ position:"absolute", bottom:"100%", left:0, right:0, height:8, zIndex:200 }} />

                      <div style={{
                        position:"absolute", bottom:"calc(100% + 8px)", left:"50%",
                        transform:"translateX(-50%)",
                        zIndex:201, pointerEvents:"auto",
                        minWidth: expandItems ? 210 : 140,
                        borderRadius:12,
                        border:"1px solid rgba(255,255,255,0.10)",
                        borderTop:"1.5px solid rgba(255,255,255,0.20)",
                        boxShadow:[
                          "0 24px 56px rgba(0,0,0,0.85)",
                          "0 4px 16px rgba(0,0,0,0.55)",
                          "0 0 0 1px rgba(255,255,255,0.04)",
                        ].join(", "),
                        animation:"bw-nav-expand 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                        overflow:"hidden",
                      }}
                      onMouseEnter={() => navEnter(label, 2)}
                      onMouseLeave={() => navEnter(label, 1)}>
                        {/* Layer 1: backdrop + gradient + SVG distort */}
                        <div style={{
                          position:"absolute", inset:0, borderRadius:12,
                          backdropFilter:"blur(40px) saturate(230%) brightness(1.10)",
                          WebkitBackdropFilter:"blur(40px) saturate(230%) brightness(1.10)",
                          background:"linear-gradient(160deg, rgba(32,22,10,0.97) 0%, rgba(14,10,4,0.95) 60%, rgba(20,14,6,0.97) 100%)",
                          filter:"url(#bw-glass-filter)",
                          zIndex:0,
                        }} />
                        {/* Layer 2: edge highlights */}
                        <div style={{
                          position:"absolute", inset:0, borderRadius:12, zIndex:1, pointerEvents:"none",
                          boxShadow:[
                            "inset 0 1px 0 rgba(255,255,255,0.18)",
                            "inset 0 -1px 0 rgba(0,0,0,0.50)",
                            "inset 1px 0 0 rgba(255,255,255,0.08)",
                            "inset -1px 0 0 rgba(255,255,255,0.08)",
                            "inset 0 2px 10px rgba(255,255,255,0.05)",
                          ].join(", "),
                        }} />
                        {/* Layer 3: content */}
                        <div style={{ position:"relative", zIndex:2, padding: expandItems ? "8px" : "10px 14px" }}>
                        {expandItems ? (
                          <>
                            <div style={{ fontSize:9, fontWeight:700, color:"rgba(240,236,227,0.28)", letterSpacing:".09em", textTransform:"uppercase", marginBottom:6, paddingLeft:2 }}>{label}</div>
                            {expandItems.map(({ icon: EI, label: el, sub: es, action: ea }) => (
                              <button key={el} onClick={() => { setHoveredNav(null); ea(); }}
                                style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 8px", borderRadius:8, width:"100%",
                                  background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.07)",
                                  cursor:"pointer", color:"#f0ece3", marginBottom:4, textAlign:"left", boxSizing:"border-box" }}
                                onMouseEnter={e => { e.currentTarget.style.background="rgba(232,96,10,0.14)"; e.currentTarget.style.borderColor="rgba(232,96,10,0.32)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background="rgba(240,236,227,0.04)"; e.currentTarget.style.borderColor="rgba(240,236,227,0.07)"; }}>
                                <div style={{ width:28, height:28, borderRadius:7, background:"rgba(232,96,10,0.12)", border:"1px solid rgba(232,96,10,0.22)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                  <EI size={14} strokeWidth={1.5} style={{ color:"#e8600a" }}/>
                                </div>
                                <div>
                                  <div style={{ fontSize:11, fontWeight:700 }}>{el}</div>
                                  <div style={{ fontSize:9, color:"rgba(240,236,227,0.38)", marginTop:1 }}>{es}</div>
                                </div>
                              </button>
                            ))}
                          </>
                        ) : (
                          <div style={{ textAlign:"center" }}>
                            <div style={{ fontSize:12, fontWeight:700, color:"#f0ece3", marginBottom:3 }}>{label}</div>
                            <div style={{ fontSize:10, color:"rgba(240,236,227,0.42)" }}>{desc}</div>
                          </div>
                        )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Nav button ── */}
                  <button onClick={action} className="bw-nav-btn"
                    style={{
                      width:"100%", cursor:"pointer",
                      display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                      padding:"6px 10px", borderRadius:10,
                      color: active ? "#e8600a" : isHovered ? "#f0ece3" : "rgba(240,236,227,0.38)",
                      background: active
                        ? "rgba(232,96,10,0.13)"
                        : isHovered ? "rgba(232,96,10,0.08)" : "transparent",
                      border: active
                        ? "1px solid rgba(232,96,10,0.26)"
                        : isHovered ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                      boxShadow: (active || isHovered)
                        ? "inset 0 1px 0 rgba(255,255,255,0.11), inset 0 -1px 0 rgba(0,0,0,0.20), 0 2px 10px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.03)"
                        : "none",
                    }}>
                    <Icon size={20} strokeWidth={1.5}/>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>
                  </button>
                </div>
              );
            })}

            {/* ── Legal + Copyright (rechts) ── */}
            <div style={{ flexShrink:0, paddingLeft:10, paddingRight:8, borderLeft:"1px solid rgba(240,236,227,0.07)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                {[["Impressum","/impressum"],["Datenschutz","/datenschutz"]].map(([text, href], i) => (
                  <React.Fragment key={text}>
                    {i > 0 && <span style={{ fontSize:6, color:"rgba(240,236,227,0.18)", lineHeight:1 }}>·</span>}
                    <a href={href}
                      style={{ fontSize:8, color:"rgba(240,236,227,0.28)", textDecoration:"none", fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", whiteSpace:"nowrap", transition:"color 0.15s", cursor:"pointer" }}
                      onMouseEnter={e => e.currentTarget.style.color="rgba(240,236,227,0.65)"}
                      onMouseLeave={e => e.currentTarget.style.color="rgba(240,236,227,0.28)"}>
                      {text}
                    </a>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ fontSize:8, color:"rgba(240,236,227,0.18)", fontWeight:500, whiteSpace:"nowrap" }}>© 2026 Anton Gebert</div>
            </div>
          </div>
        </>
      )}
    </div>
    </SettingsContext.Provider>
  );
}
