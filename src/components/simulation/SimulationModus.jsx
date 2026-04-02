// ══════════════════════════════════════════════════════════════════════════════
// SimulationModus – Virtuelle Firma führen (Klasse 7–10)
// Extrahiert aus BuchungsWerk.jsx – Phase D4 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { Award, BarChart2, BookOpen, CheckSquare, Download, Eye, Factory,
         Megaphone, QrCode, Settings2, Star, Timer, Trophy, Users, XCircle } from "lucide-react";
import { apiFetch } from "../../api.js";
import { S } from "../../styles.js";
import { UNTERNEHMEN } from "../../data/stammdaten.js";
import { SIM_SCHWIERIGKEITEN, simStartKonten, simEreignisse } from "../../data/simulatorDaten.js";
import { useStreak } from "../../hooks/useStreak.js";
import { useLevel } from "../../hooks/useLevel.js";
import { StreakBadge, StreakCelebration } from "../StreakBadge.jsx";
import { LevelUpdate } from "../LevelCard.jsx";
import LehrerDashboard from "./LehrerDashboard.jsx";
import BankingSimulator7 from "./BankingSimulator7.jsx";

// ══════════════════════════════════════════════════════════════════════════════
// SIMULATION – Virtuelle Firma führen
// ══════════════════════════════════════════════════════════════════════════════



export default function SimulationModus({ onZurueck, onVonURLDetected, onRegisterReset }) {
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
