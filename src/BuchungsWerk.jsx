// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Anton Gebert <info@buchungswerk.org> - BuchungsWerk

import React, { useState, useRef, useEffect } from "react";
import { Factory, BookOpen, GraduationCap, BookMarked,
         Users, FolderOpen,
         Zap, Star, Trophy, Flame, Sprout } from "lucide-react";
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

  const isSimulation = schritt === 4;

  // Custom Events: UserBadge (main.jsx) kann Mastery + Einstellungen öffnen
  useEffect(() => {
    const openMastery   = () => setMasteryOffen(true);
    const openSettings  = () => setEinstellungenOffen(true);
    window.addEventListener("bw:mastery",   openMastery);
    window.addEventListener("bw:settings",  openSettings);
    return () => {
      window.removeEventListener("bw:mastery",  openMastery);
      window.removeEventListener("bw:settings", openSettings);
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

      {/* CSS Animations */}
      <style>{`
        @keyframes bw-picker-up {
          from { opacity:0; transform:translateY(18px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes bw-backdrop {
          from { opacity:0; }
          to   { opacity:1; }
        }
        .bw-nav-btn {
          transition: color 0.15s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1) !important;
        }
        .bw-nav-btn:hover { transform: translateY(-3px) !important; }
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
          <div style={{ position:"fixed", inset:0, zIndex:150,
            background:"rgba(0,0,0,0.35)", backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)",
            animation:"bw-backdrop 0.2s ease" }}
            onClick={() => setBibliothekPickerOffen(false)} />
          <div style={{ position:"fixed", bottom:72, left:8, right:8, zIndex:151,
            animation:"bw-picker-up 0.32s cubic-bezier(0.34,1.56,0.64,1)",
            background:"rgba(12,8,2,0.98)", backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
            border:"1px solid rgba(240,236,227,0.13)", borderTop:"2px solid #e8600a",
            borderRadius:16, padding:"10px",
            display:"flex", gap:8, boxShadow:"0 -12px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(232,96,10,0.08)" }}>
            {[
              { icon: BookOpen,   label:"Materialien",   sub:"Geteilte Aufgabensets laden",    action: () => { setBibliothekPickerOffen(false); setMaterialienStartOffen(true); } },
              { icon: FolderOpen, label:"Eigene Belege", sub:"Selbst erstellte Belege öffnen", action: () => { setBibliothekPickerOffen(false); setEigeneBelegeOffen(true); } },
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
      <div style={{ ...S.container, paddingBottom: 16 }}>
        {!gastModus && <SupportButton />}
        {schritt === 1 && <SchrittTyp onWeiter={cfg => { setConfig(cfg); if (skipFirma) { setSkipFirma(false); setSchritt(3); if (!gastModus) setStreak(aktualisiereStreak()); } else setSchritt(2); }} onBelegEditor={() => setBelegEditorOffen(true)} onEigeneBelege={() => setEigeneBelegeOffen(true)} onSimulation={() => setSchritt(4)} initialConfig={skipFirma ? config : null} />}
        {schritt === 2 && <SchrittFirma config={config} onWeiter={f => { setFirma(f); setSchritt(3); if (!gastModus) setStreak(aktualisiereStreak()); }} onZurueck={() => setSchritt(1)} />}
        {schritt === 3 && <ErrorBoundary><SchrittAufgaben key={configVersion} config={config} firma={firma} initialAufgaben={initialAufgaben} onNeu={reset} onMaterialLaden={materialLaden} onThemen={zuThemen} onFirma={zuFirma} aufgabenRef={aufgabenForQuizRef} /></ErrorBoundary>}
        {schritt === 4 && <ErrorBoundary><SimulationModus onZurueck={reset} onVonURLDetected={() => setIsVonURL(true)} onRegisterReset={fn => { simResetFnRef.current = fn; }} /></ErrorBoundary>}
      </div>

      {/* ── Mini-Footer – vor der BottomBar, damit sie nicht dahinter verschwindet ── */}
      <div style={{ textAlign:"center", padding:"16px 24px 80px", fontSize:11,
        color:"rgba(240,236,227,0.18)", borderTop:"1px solid rgba(240,236,227,0.04)",
        display:"flex", justifyContent:"center", gap:20, flexWrap:"wrap" }}>
        <a href="/impressum"   style={{ color:"inherit", textDecoration:"none" }}>Impressum</a>
        <a href="/datenschutz" style={{ color:"inherit", textDecoration:"none" }}>Datenschutz</a>
        <span>© 2026 Anton Gebert · AGPL-3.0</span>
      </div>

      {/* ── BOTTOM-BAR – position:fixed, echter Liquid-Glass-Effekt ──────────── */}
      {!gastModus && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0,
          height:56, zIndex:100,
          display:"flex", alignItems:"center", justifyContent:"space-around", padding:"0 8px",
          background:"rgba(14,10,4,0.52)",
          backdropFilter:"blur(36px) saturate(220%) brightness(1.08)",
          WebkitBackdropFilter:"blur(36px) saturate(220%) brightness(1.08)",
          borderTop:"1px solid rgba(255,255,255,0.07)",
          boxShadow:"0 -1px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.055)",
        }}>
          {[
            { icon: BookOpen,      label:"Bibliothek",    action: () => setBibliothekPickerOffen(v => !v), active: bibliothekPickerOffen },
            { icon: GraduationCap, label:"AP-Übung",      action: () => setApUebungOffen(true) },
            { icon: Users,         label:"Klassenzimmer", action: () => { setKlasseZimmerAufgaben(aufgabenForQuizRef.current || []); setKlasseZimmerOffen(true); } },
            { icon: BookMarked,    label:"Kontenplan",    action: () => setKontenplanOffen(true) },
          ].map(({ icon, label, action, active }) => (
            <button key={label} onClick={action} className="bw-nav-btn"
              style={{ background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 14px", borderRadius:10, color: active?"#e8600a":"rgba(240,236,227,0.38)" }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color="#e8600a"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color="rgba(240,236,227,0.38)"; }}>
              {React.createElement(icon, { size: 21, strokeWidth: 1.5 })}
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
    </SettingsContext.Provider>
  );
}
