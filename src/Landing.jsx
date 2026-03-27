// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Anton Gebert <info@buchungswerk.org> - BuchungsWerk

import React, { useState, useEffect, useRef } from "react";
import { API_URL } from "./api.js";
import {
  Zap, FileText, GraduationCap, Mail, Lock, User, Eye, EyeOff,
  X, CheckSquare, BookOpen, Download, Building2, BarChart2,
  AlertTriangle, ArrowRight, School, Settings2, ReceiptEuro,
  Plus, Minus, ChevronLeft, ChevronRight, KeyRound, Shield, Smartphone,
} from "lucide-react";

// ── CSS ────────────────────────────────────────────────────────────────────────
const LANDING_CSS = `
  @keyframes forge-glow {
    0%,100% { text-shadow:0 0 28px rgba(232,96,10,.45),0 0 56px rgba(232,96,10,.18); }
    50%      { text-shadow:0 0 48px rgba(232,96,10,.75),0 0 96px rgba(232,96,10,.32); }
  }
  @keyframes lp-fade-up  { from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)} }
  @keyframes lp-fade-in  { from{opacity:0}to{opacity:1} }
  @keyframes lp-modal-in { from{opacity:0;transform:scale(.96) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes lp-pulse    { 0%,100%{transform:scale(1);opacity:.6}100%{transform:scale(1.6);opacity:0} }
  @keyframes step-in-r   { from{opacity:0;transform:translateX(60px) scale(.97)}to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes step-in-l   { from{opacity:0;transform:translateX(-60px) scale(.97)}to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes prog-bar    { from{width:0%}to{width:100%} }
  @keyframes feat-in     { from{opacity:0;transform:translateY(52px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)} }

  .lp-cursor-active * { cursor:none !important; }
  .lp-nav-link { transition:color 140ms ease; text-decoration:none; }
  .lp-nav-link:hover { color:#f0ece3 !important; }
  .lp-input { transition:border-color 180ms,box-shadow 180ms; }
  .lp-input:focus { outline:none; border-color:#e8600a !important; box-shadow:0 0 0 3px rgba(232,96,10,.18) !important; }
  .lp-ghost-btn { transition:background 150ms,border-color 150ms,color 150ms; }
  .lp-ghost-btn:hover { background:rgba(232,96,10,.1) !important; border-color:#e8600a !important; color:#f0ece3 !important; }
  .lp-cta-btn { transition:transform 150ms,box-shadow 150ms; }
  .lp-cta-btn:hover { transform:translateY(-2px); box-shadow:0 6px 0 rgba(0,0,0,.5),0 0 40px rgba(232,96,10,.55),inset 0 1px 0 rgba(255,200,80,.18) !important; }
  .lp-tab-btn { transition:color 150ms,border-color 150ms; }
  .lp-acc-row { transition:background 200ms,border-color 200ms; }
  .lp-acc-row:hover { background:rgba(240,236,227,.04) !important; }
  .lp-stat-item { transition:opacity 200ms; }
  .lp-stat-item:hover { opacity:1 !important; }
`;

// ── Auth ───────────────────────────────────────────────────────────────────────
export const getToken   = () => { try { return localStorage.getItem("bw_token"); } catch { return null; } };
export const getUser    = () => { try { return JSON.parse(localStorage.getItem("bw_user") || "null"); } catch { return null; } };
export const setAuth    = (t,u) => { try { localStorage.setItem("bw_token",t); localStorage.setItem("bw_user",JSON.stringify(u)); } catch {} };
export const clearAuth  = () => { try { localStorage.removeItem("bw_token"); localStorage.removeItem("bw_user"); } catch {} };
export const isLoggedIn = () => !!getToken();

async function apiAuth(path, body) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 12000);
  try {
    const res = await fetch(API_URL + path, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body), signal:c.signal });
    if (!res.ok) {
      let msg = "Serverfehler – bitte erneut versuchen.";
      try { const e = await res.json(); msg = e.detail || e.message || msg; } catch {}
      if (res.status === 401) msg = "E-Mail oder Passwort falsch.";
      if (res.status === 409) msg = "Diese E-Mail-Adresse ist bereits registriert.";
      throw new Error(msg);
    }
    return res.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Keine Serververbindung – bitte erneut versuchen.");
    throw e;
  } finally { clearTimeout(t); }
}

// ── Scroll Reveal ──────────────────────────────────────────────────────────────
function SR({ children, delay = 0, zoom = false, style: s }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0) scale(1)" : `translateY(36px) scale(${zoom ? ".93" : ".99"})`,
      transition: `opacity .62s ease ${delay}ms, transform .62s cubic-bezier(.4,0,.2,1) ${delay}ms`,
      ...s,
    }}>{children}</div>
  );
}

// ── Cursor Lens: dual-layer color-swap (bone↔orange) clipped to cursor circle ─
// Usage: <Lens id="unique-id" normal={...} swapped={...} style={...} />
function Lens({ id, normal, swapped, style: s }) {
  const ref = useRef(null);
  useEffect(() => {
    const L = `--ln-${id}-l`, T = `--ln-${id}-t`;
    const update = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      document.documentElement.style.setProperty(L, r.left + "px");
      document.documentElement.style.setProperty(T, r.top  + "px");
    };
    update();
    const t0 = setTimeout(update, 700); // re-measure after SR scroll-reveal animation (620ms)
    let bounce;
    const onScroll = () => { update(); clearTimeout(bounce); bounce = setTimeout(update, 720); };
    window.addEventListener("scroll", onScroll, { passive:true });
    window.addEventListener("resize", update);
    return () => { clearTimeout(t0); clearTimeout(bounce); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", update); };
  }, [id]);
  return (
    <div ref={ref} style={{ position:"relative", ...s }}>
      {normal}
      <div aria-hidden style={{
        position:"absolute", inset:0, pointerEvents:"none", userSelect:"none", overflow:"visible",
        clipPath:`circle(var(--cr,0px) at calc(var(--cx,-9999px) - var(--ln-${id}-l,-9999px)) calc(var(--cy,-9999px) - var(--ln-${id}-t,-9999px)))`
      }}>{swapped}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOM CURSOR
// Ring + white glow for explore states, tiny dot for interactive states.
// Sets CSS vars --cx/--cy (viewport px) and --cr (radius px) so the Hero title
// can show an exact orange↔bone color swap via clip-path on a duplicate layer.
// ══════════════════════════════════════════════════════════════════════════════
function CustomCursor() {
  const dotRef = useRef(null);
  const [cs, setCs] = useState("idle");

  // Sync cursor radius to CSS var whenever state changes
  useEffect(() => {
    const r = { idle:22, hero:44, small:6, cta:10, arrowL:26, arrowR:26, scroll:22, scrollUp:22 };
    document.documentElement.style.setProperty("--cr", (r[cs] ?? 22) + "px");
  }, [cs]);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot || window.matchMedia("(pointer: coarse)").matches) return;
    document.documentElement.classList.add("lp-cursor-active");
    let appeared = false;

    const onMove = e => {
      dot.style.left = e.clientX + "px";
      dot.style.top  = e.clientY + "px";
      if (!appeared) { dot.style.opacity = "1"; appeared = true; }
      // Drive the hero-title color-swap clip circle
      document.documentElement.style.setProperty("--cx", e.clientX + "px");
      document.documentElement.style.setProperty("--cy", e.clientY + "px");
      // Dynamic scroll direction in features section
      if (e.target.closest("[data-cursor='features']")) {
        setCs(e.clientY < window.innerHeight / 3 ? "scrollUp" : "scroll");
      }
    };
    const onOver = e => {
      const t = e.target;
      if (t.closest("[data-cursor='hero']"))    { setCs("hero");   return; }
      if (t.closest("[data-cursor-left]"))      { setCs("arrowL"); return; }
      if (t.closest("[data-cursor-right]"))     { setCs("arrowR"); return; }
      if (t.closest("[data-cursor-label]"))     { setCs("cta");    return; }
      if (t.closest("[data-cursor-small]"))      { setCs("small");  return; }
      if (t.closest("[data-cursor='features']")) { setCs("scroll"); return; }
      if (t.closest(".lp-acc-row"))              { setCs("scroll"); return; }
    };
    const onOut = e => {
      if (e.target.closest("[data-cursor='hero'],[data-cursor='features'],[data-cursor-left],[data-cursor-right],[data-cursor-label],[data-cursor-small],.lp-acc-row,button,a")) {
        setCs("idle");
      }
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover",  onOver, { passive: true });
    document.addEventListener("mouseout",   onOut,  { passive: true });
    return () => {
      document.documentElement.classList.remove("lp-cursor-active");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover",  onOver);
      document.removeEventListener("mouseout",   onOut);
    };
  }, []);

  // Ring + glow for explore states; tiny filled dot for interactive/button states
  const cfg = {
    idle:   { sz:44, border:"1.5px solid rgba(240,236,227,0.88)", glow:"0 0 12px rgba(240,236,227,0.28),0 0 28px rgba(240,236,227,0.10)", bg:"transparent" },
    hero:   { sz:88, border:"1.5px solid rgba(240,236,227,0.75)", glow:"0 0 20px rgba(240,236,227,0.20),0 0 42px rgba(240,236,227,0.08)", bg:"transparent" },
    small:  { sz:12, border:"none",                                                                        glow:"0 0 8px rgba(240,236,227,0.50)",                                              bg:"rgba(240,236,227,0.85)" },
    cta:    { sz:20, border:"1.5px solid rgba(240,236,227,0.70)",                                          glow:"0 0 8px rgba(240,236,227,0.30),0 0 16px rgba(240,236,227,0.10)",               bg:"transparent" },
    arrowL: { sz:52, border:"1.5px solid rgba(240,236,227,0.75)", glow:"0 0 12px rgba(240,236,227,0.22),0 0 28px rgba(240,236,227,0.08)", bg:"transparent", icon:"←" },
    arrowR: { sz:52, border:"1.5px solid rgba(240,236,227,0.75)", glow:"0 0 12px rgba(240,236,227,0.22),0 0 28px rgba(240,236,227,0.08)", bg:"transparent", icon:"→" },
    scroll:   { sz:44, border:"1.5px solid rgba(240,236,227,0.55)", glow:"none", bg:"transparent", icon:"↓" },
    scrollUp: { sz:44, border:"1.5px solid rgba(240,236,227,0.55)", glow:"none", bg:"transparent", icon:"↑" },
  }[cs] || {};

  const { sz=44, border, glow="none", bg="transparent", icon } = cfg;

  return (
    <div ref={dotRef} style={{ position:"fixed", top:0, left:0, zIndex:9998, pointerEvents:"none", opacity:0, transition:"opacity 300ms" }}>
      <div style={{
        position:"absolute", width:sz, height:sz, marginLeft:-sz/2, marginTop:-sz/2,
        borderRadius:"50%", background:bg, border, boxShadow:glow,
        transition:"width 200ms ease,height 200ms ease,margin 200ms ease,border 200ms,background 150ms",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {icon && (
          <span style={{ fontSize:14, color:"rgba(240,236,227,0.7)", lineHeight:1,
            fontFamily:"sans-serif", pointerEvents:"none" }}>{icon}</span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NAVBAR
// ══════════════════════════════════════════════════════════════════════════════
function Nav({ onLogin, onRegister }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:300, height:"62px", padding:"0 24px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      background: scrolled ? "rgba(28,18,6,0.6)" : "rgba(28,18,6,0.28)",
      backdropFilter:"blur(36px) saturate(220%) brightness(1.12)", WebkitBackdropFilter:"blur(36px) saturate(220%) brightness(1.12)",
      borderBottom:"1px solid rgba(232,96,10,0.4)",
      boxShadow: scrolled ? "0 1px 0 rgba(240,236,227,0.04), 0 4px 24px rgba(0,0,0,0.25)" : "none", transition:"background 300ms" }}>
      <Lens id="nav-logo" style={{ display:"inline-block" }}
        normal={<div style={{ fontFamily:"'Bebas Neue',system-ui,sans-serif", fontSize:"22px",
          letterSpacing:"0.06em", color:"#f0ece3", userSelect:"none" }}>
          BUCHUNGS<span style={{ color:"#e8600a" }}>WERK</span>
          <span style={{ marginLeft:"10px", fontSize:"9px", fontFamily:"'IBM Plex Sans',sans-serif",
            fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase",
            color:"rgba(240,236,227,0.4)", verticalAlign:"middle" }}>BwR Bayern</span>
        </div>}
        swapped={<div style={{ fontFamily:"'Bebas Neue',system-ui,sans-serif", fontSize:"22px",
          letterSpacing:"0.06em", color:"#e8600a", userSelect:"none" }}>
          BUCHUNGS<span style={{ color:"#f0ece3" }}>WERK</span>
          <span style={{ marginLeft:"10px", fontSize:"9px", fontFamily:"'IBM Plex Sans',sans-serif",
            fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase",
            color:"rgba(232,96,10,0.4)", verticalAlign:"middle" }}>BwR Bayern</span>
        </div>}
      />
      <div style={{ display:"flex", gap:"28px", alignItems:"center" }}>
        {[["Funktionen","#features"],["So funktionierts","#how"],["Kostenlos starten","#cta"]].map(([l,h]) => (
          <a key={l} href={h} className="lp-nav-link" style={{ fontSize:"13px", fontWeight:600,
            color:"rgba(240,236,227,0.55)", letterSpacing:"0.02em" }}>{l}</a>
        ))}
      </div>
      <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
        <button onClick={onLogin} className="lp-ghost-btn" data-cursor-small style={{
          padding:"8px 18px", background:"none", border:"1.5px solid rgba(240,236,227,0.22)",
          borderRadius:"9px", color:"rgba(240,236,227,0.7)", fontSize:"13px", fontWeight:600,
          cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>Anmelden</button>
        <Lens id="nav-cta" style={{ display:"inline-block" }}
          normal={<button onClick={onRegister} className="lp-cta-btn" data-cursor-label="START" style={{
            padding:"8px 18px",
            background:"linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
            border:"1px solid rgba(255,170,60,0.25)", borderRadius:"9px", color:"#f0ece3",
            fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif",
            boxShadow:"0 2px 0 rgba(0,0,0,0.4),0 0 14px rgba(232,96,10,0.3)" }}>Kostenlos starten</button>}
          swapped={<button style={{
            padding:"8px 18px", background:"#f0ece3",
            border:"1px solid rgba(232,96,10,0.3)", borderRadius:"9px", color:"#e8600a",
            fontSize:"13px", fontWeight:700, fontFamily:"'IBM Plex Sans',sans-serif" }}>Kostenlos starten</button>}
        />
      </div>
    </nav>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════════════════════════════════
function Hero({ onRegister, onLogin }) {

  return (
    <section data-cursor="hero" style={{ minHeight:"92vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"60px 24px 80px",
      textAlign:"center", position:"relative" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 80% 70% at 50% 40%,transparent 40%,#141008 100%)" }}/>

      <div style={{ animation:"lp-fade-up 0.6s ease both", position:"relative", zIndex:1,
        display:"inline-flex", alignItems:"center", gap:"8px", padding:"5px 14px",
        background:"rgba(232,96,10,0.12)", border:"1px solid rgba(232,96,10,0.3)",
        borderRadius:"20px", marginBottom:"28px" }}>
        <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#e8600a",
          display:"inline-block", animation:"lp-pulse 1.8s ease-out infinite" }}/>
        <span style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.14em",
          textTransform:"uppercase", color:"#e8600a" }}>Das Lernwerkzeug für BwR Bayern</span>
      </div>

      <Lens id="hero-title" style={{ animation:"lp-fade-up 0.7s 0.1s ease both",
        fontFamily:"'Bebas Neue',system-ui,sans-serif", lineHeight:0.92,
        marginBottom:"28px", position:"relative", zIndex:1 }}
        normal={<>
          <div style={{ fontSize:"clamp(72px,12vw,128px)", color:"#f0ece3", letterSpacing:"0.03em" }}>BUCHUNGS</div>
          <div style={{ fontSize:"clamp(72px,12vw,128px)", color:"#e8600a",
            letterSpacing:"0.03em", animation:"forge-glow 3.5s ease-in-out infinite" }}>WERK</div>
        </>}
        swapped={<>
          <div style={{ fontSize:"clamp(72px,12vw,128px)", color:"#e8600a", letterSpacing:"0.03em" }}>BUCHUNGS</div>
          <div style={{ fontSize:"clamp(72px,12vw,128px)", color:"#f0ece3", letterSpacing:"0.03em" }}>WERK</div>
        </>}
      />

      <p style={{ animation:"lp-fade-up 0.7s 0.2s ease both", fontSize:"clamp(16px,2.2vw,20px)",
        color:"rgba(240,236,227,0.65)", lineHeight:1.6, maxWidth:"560px",
        marginBottom:"40px", position:"relative", zIndex:1 }}>
        KI-gestützte Buchungsaufgaben für Realschule und FOS/BOS.{" "}
        <strong style={{ color:"rgba(240,236,227,0.9)", fontWeight:600 }}>
          Klassen 8–12, alle Lernbereiche, druckfertig in Sekunden.
        </strong>
      </p>

      <div style={{ animation:"lp-fade-up 0.7s 0.3s ease both", display:"flex", gap:"12px",
        flexWrap:"wrap", justifyContent:"center", position:"relative", zIndex:1 }}>
        <Lens id="hero-cta" style={{ display:"inline-block" }}
          normal={<button onClick={onRegister} className="lp-cta-btn" data-cursor-label="JETZT STARTEN" style={{
            padding:"14px 32px",
            background:"linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
            border:"1px solid rgba(255,170,60,0.25)", borderRadius:"12px",
            color:"#f0ece3", fontSize:"16px", fontWeight:700, cursor:"pointer",
            fontFamily:"'IBM Plex Sans',sans-serif",
            boxShadow:"0 4px 0 rgba(0,0,0,0.5),0 0 28px rgba(232,96,10,0.4),inset 0 1px 0 rgba(255,200,80,0.18)",
            display:"flex", alignItems:"center", gap:"8px" }}>
            Jetzt kostenlos starten <ArrowRight size={16} strokeWidth={2}/>
          </button>}
          swapped={<button style={{
            padding:"14px 32px", background:"#f0ece3",
            border:"1px solid rgba(232,96,10,0.3)", borderRadius:"12px",
            color:"#e8600a", fontSize:"16px", fontWeight:700,
            fontFamily:"'IBM Plex Sans',sans-serif",
            display:"flex", alignItems:"center", gap:"8px" }}>
            Jetzt kostenlos starten <ArrowRight size={16} strokeWidth={2} color="#e8600a"/>
          </button>}
        />
        <button onClick={onLogin} className="lp-ghost-btn" data-cursor-label="ANMELDEN" style={{
          padding:"14px 28px", background:"rgba(240,236,227,0.06)",
          border:"1.5px solid rgba(240,236,227,0.22)", borderRadius:"12px",
          color:"rgba(240,236,227,0.75)", fontSize:"16px", fontWeight:600,
          cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>
          Ich habe bereits einen Account
        </button>
      </div>

      <div style={{ animation:"lp-fade-in 1s 1.2s ease both", position:"absolute", bottom:"28px",
        fontSize:"11px", color:"rgba(240,236,227,0.25)",
        letterSpacing:"0.12em", textTransform:"uppercase" }}>↓ mehr erfahren</div>
    </section>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value:"20+",  label:"Lernbereiche" }, { value:"100+", label:"Aufgabentypen" },
    { value:"8–12", label:"Klassen" },      { value:"∞",    label:"Varianten" },
  ];
  return (
    <div style={{ borderTop:"1px solid rgba(240,236,227,0.08)", borderBottom:"1px solid rgba(240,236,227,0.08)",
      background:"rgba(240,236,227,0.03)", padding:"20px 24px", display:"flex", justifyContent:"center" }}>
      {stats.map((s,i) => (
        <SR key={s.value} delay={i*80} style={{ flex:"0 0 auto" }}>
          <div className="lp-stat-item" style={{ textAlign:"center", padding:"4px 48px",
            borderRight: i<stats.length-1 ? "1px solid rgba(240,236,227,0.1)" : "none", opacity:0.85 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px",
              color:"#e8600a", letterSpacing:"0.04em", lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:"11px", fontWeight:600, letterSpacing:"0.1em",
              textTransform:"uppercase", color:"rgba(240,236,227,0.45)", marginTop:"3px" }}>{s.label}</div>
          </div>
        </SR>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FIX 2 — FEATURES: Sticky scroll, öffnet sich automatisch beim Scrollen
// ══════════════════════════════════════════════════════════════════════════════
const FEATURES = [
  { nr:"01", Icon:Zap,          title:"KI-Aufgaben in Sekunden",  sub:"Sofort einsetzbar · Musterlösung inklusive",
    desc:"Buchungsaufgaben passend zu Klasse, Thema und Unternehmen – fertig generiert, direkt einsetzbar. Du gibst Firma und Lernbereich vor, die KI liefert vollständige Aufgaben mit Musterlösung.", tag:"KI" },
  { nr:"02", Icon:FileText,     title:"Druckfertig exportieren",   sub:"Word · Pages · PDF",
    desc:"Schulaufgaben im bayerischen Format als Word, Pages oder PDF. Kopfzeile, Notenfeld und Punkteverteilung werden automatisch generiert – direkt druckbar ohne Nachbearbeitung.", tag:"Export" },
  { nr:"03", Icon:GraduationCap,title:"ISB-konform & vollständig", sub:"LB 1 bis Jahresabschluss",
    desc:"Kontenplan nach IKR, Punktevergabe nach Handreichung. Alle Lernbereiche von LB 1 (Werkstoffe) bis Jahresabschluss (GuV, Bilanz) vollständig abgedeckt.", tag:"ISB" },
  { nr:"04", Icon:BookOpen,     title:"Übungen & Prüfungen",       sub:"Stegreifaufgabe bis Schulaufgabe",
    desc:"Von Stegreifaufgaben bis Schulaufgaben – mit Notenspiegel, Punkte-Strenge und interaktivem H5P-Export für mebis/bycs. Alle Prüfungsformate auf Knopfdruck.", tag:"Prüfung" },
  { nr:"05", Icon:ReceiptEuro,   title:"Beleg-Editor",              sub:"Eigene Belege · KI-Generierung",
    desc:"Eigene Rechnungen, Kontoauszüge und Überweisungen gestalten – und daraus per KI vollständige Aufgaben generieren. Realitätsnahe Belege für authentischen Unterricht.", tag:"Belege" },
  { nr:"06", Icon:BarChart2,    title:"Fortschritt & Mastery",     sub:"Gamification · Wiederholung",
    desc:"Wiederholungsvorschläge, Mastery-Level je Thema, Lern-Streak und Fortschrittsdiagramme – Gamification für nachhaltigeres Üben und messbaren Lernerfolg.", tag:"Lernen" },
];

// Outer section height: each feature gets ~100vh of scroll range
const FEAT_H = `${FEATURES.length * 100 + 20}vh`;

function FeaturesSection() {
  const sectionRef = useRef(null);
  const [active, setActive]   = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current; if (!el) return;
      const scrolled   = Math.max(0, -el.getBoundingClientRect().top);
      const scrollable = el.offsetHeight - window.innerHeight;
      const progress   = scrollable > 0 ? Math.min(1, scrolled / scrollable) : 0;
      const next       = Math.min(FEATURES.length - 1, Math.floor(progress * FEATURES.length));
      if (next !== active) { setActive(next); setAnimKey(k => k + 1); }
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [active]);

  const { nr, Icon, title, sub, desc, tag } = FEATURES[active];

  return (
    <section ref={sectionRef} id="features" data-cursor="features" style={{ height:FEAT_H, position:"relative" }}>
      <div style={{ position:"sticky", top:0, height:"100vh", overflow:"hidden",
        display:"flex", alignItems:"center", justifyContent:"center" }}>

        {/* Ghost number background */}
        <div style={{ position:"absolute", right:"-0.03em", bottom:"-0.08em",
          fontFamily:"'Bebas Neue',sans-serif",
          fontSize:"clamp(200px,28vw,360px)", color:"rgba(240,236,227,0.022)",
          lineHeight:1, pointerEvents:"none", userSelect:"none",
          transition:"opacity 400ms" }}>{nr}</div>

        {/* Top accent line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
          background:"linear-gradient(90deg,transparent,rgba(232,96,10,0.55),transparent)" }}/>

        {/* Animated content */}
        <div key={animKey} style={{ maxWidth:900, width:"100%", padding:"0 32px",
          animation:"feat-in 0.55s cubic-bezier(.4,0,.2,1) both" }}>

          {/* Progress bar row */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:52 }}>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.16em",
              textTransform:"uppercase", color:"#e8600a",
              fontFamily:"'IBM Plex Sans',sans-serif" }}>Funktionen</div>
            <div style={{ display:"flex", gap:5, flex:1, maxWidth:180 }}>
              {FEATURES.map((_,i) => (
                <div key={i} style={{ height:2, flex:1, borderRadius:2,
                  background: i <= active ? "#e8600a" : "rgba(240,236,227,0.1)",
                  transition:"background 400ms" }}/>
              ))}
            </div>
            <div style={{ fontFamily:"'Fira Code',monospace", fontSize:"11px",
              color:"rgba(240,236,227,0.28)", marginLeft:"auto" }}>
              {active + 1} / {FEATURES.length}
            </div>
          </div>

          {/* Two-column layout */}
          <div style={{ display:"flex", gap:64, alignItems:"center" }}>

            {/* Left: text */}
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:32 }}>
                <div style={{ width:56, height:56, borderRadius:16,
                  background:"rgba(232,96,10,0.1)", border:"1px solid rgba(232,96,10,0.3)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon size={24} strokeWidth={1.5} color="#e8600a"/>
                </div>
                <div style={{ padding:"3px 13px",
                  background:"rgba(232,96,10,0.08)", border:"1px solid rgba(232,96,10,0.28)",
                  borderRadius:20, fontSize:"10px", fontWeight:700, color:"#e8600a",
                  letterSpacing:"0.12em", textTransform:"uppercase",
                  fontFamily:"'IBM Plex Sans',sans-serif" }}>{tag}</div>
              </div>

              <Lens id="feat-title" style={{ display:"block", margin:"0 0 18px" }}
                normal={<h2 style={{ fontFamily:"'Bebas Neue',sans-serif",
                  fontSize:"clamp(44px,6.5vw,84px)", color:"#f0ece3",
                  letterSpacing:"0.04em", lineHeight:0.93, margin:0 }}>{title}</h2>}
                swapped={<h2 style={{ fontFamily:"'Bebas Neue',sans-serif",
                  fontSize:"clamp(44px,6.5vw,84px)", color:"#e8600a",
                  letterSpacing:"0.04em", lineHeight:0.93, margin:0 }}>{title}</h2>}
              />

              <div style={{ fontSize:"12px", color:"rgba(240,236,227,0.38)",
                fontFamily:"'IBM Plex Sans',sans-serif",
                letterSpacing:"0.06em", marginBottom:28 }}>{sub}</div>

              <p style={{ fontSize:"16px", color:"rgba(240,236,227,0.62)",
                lineHeight:1.78, maxWidth:500, fontFamily:"'IBM Plex Sans',sans-serif",
                margin:0 }}>{desc}</p>

              {active < FEATURES.length - 1 && (
                <div style={{ marginTop:44, display:"flex", alignItems:"center", gap:8,
                  fontSize:"11px", color:"rgba(240,236,227,0.2)", letterSpacing:"0.12em",
                  textTransform:"uppercase", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  <div style={{ width:18, height:18, borderRadius:"50%",
                    border:"1px solid rgba(240,236,227,0.18)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:9 }}>↓</div>
                  Scrollen für nächste Funktion
                </div>
              )}
            </div>

            {/* Right: icon orb */}
            <div style={{ flexShrink:0, width:"clamp(140px,18vw,220px)",
              aspectRatio:"1", position:"relative",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ position:"absolute", inset:0, borderRadius:"50%",
                background:"radial-gradient(circle,rgba(232,96,10,0.14) 0%,transparent 70%)",
                border:"1px solid rgba(232,96,10,0.12)" }}/>
              <div style={{ position:"absolute", inset:"18%", borderRadius:"50%",
                border:"1px dashed rgba(232,96,10,0.1)" }}/>
              <Icon size="clamp(56px,8vw,88px)" strokeWidth={0.75}
                color="rgba(232,96,10,0.45)"/>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FIX 3 — HOW IT WORKS: Karussell mit Cursor-Pfeil und Zoom-Reveal
// ══════════════════════════════════════════════════════════════════════════════
const STEPS = [
  { nr:"01", Icon:Settings2, title:"Klasse & Thema",    desc:"Jahrgangsstufe und Lernbereich auswählen – von Werkstoffen bis Jahresabschluss." },
  { nr:"02", Icon:Building2, title:"Unternehmen",        desc:"Firmennamen eingeben oder ein fiktives Musterunternehmen wählen." },
  { nr:"03", Icon:Zap,       title:"Aufgaben erhalten",  desc:"Die KI generiert passende Buchungsaufgaben mit vollständiger Musterlösung." },
  { nr:"04", Icon:Download,  title:"Exportieren",        desc:"Als druckfertige Word-Datei oder PDF – direkt in den Unterricht." },
];

function HowItWorksSection() {
  const [cur,    setCur]    = useState(0);
  const [dir,    setDir]    = useState(1);  // 1 = right, -1 = left
  const [animKey, setAnimKey] = useState(0);

  const go = (next, d = 1) => { setDir(d); setCur(next); setAnimKey(k => k + 1); };
  const prev = () => go((cur - 1 + STEPS.length) % STEPS.length, -1);
  const next = () => go((cur + 1) % STEPS.length, 1);

  const step = STEPS[cur];

  return (
    <section id="how" style={{
      padding:"80px 24px",
      background:"rgba(240,236,227,0.02)",
      borderTop:"1px solid rgba(240,236,227,0.07)",
      borderBottom:"1px solid rgba(240,236,227,0.07)",
    }}>
      <div style={{ maxWidth:"860px", margin:"0 auto" }}>

        <SR delay={0} style={{ textAlign:"center", marginBottom:8 }}>
          <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.16em",
            textTransform:"uppercase", color:"#e8600a" }}>So funktioniert's</div>
        </SR>
        <SR delay={80} style={{ textAlign:"center", marginBottom:52 }}>
          <Lens id="how-title" style={{ display:"inline-block" }}
            normal={<h2 style={{ fontFamily:"'Bebas Neue',system-ui,sans-serif",
              fontSize:"clamp(36px,5vw,56px)", color:"#f0ece3",
              letterSpacing:"0.04em", lineHeight:1 }}>
              IN VIER SCHRITTEN<br/><span style={{ color:"#e8600a" }}>ZUR AUFGABE</span>
            </h2>}
            swapped={<h2 style={{ fontFamily:"'Bebas Neue',system-ui,sans-serif",
              fontSize:"clamp(36px,5vw,56px)", color:"#e8600a",
              letterSpacing:"0.04em", lineHeight:1 }}>
              IN VIER SCHRITTEN<br/><span style={{ color:"#f0ece3" }}>ZUR AUFGABE</span>
            </h2>}
          />
        </SR>

        <SR delay={120} zoom>
          {/* Carousel */}
          <div style={{ position:"relative", overflow:"hidden", borderRadius:16,
            border:"1px solid rgba(240,236,227,0.09)",
            background:"rgba(28,20,10,0.5)", minHeight:280 }}>

            {/* Left click zone */}
            <div data-cursor-left onClick={prev} style={{
              position:"absolute", left:0, top:0, width:"50%", height:"100%",
              zIndex:3, cursor:"pointer" }}/>
            {/* Right click zone */}
            <div data-cursor-right onClick={next} style={{
              position:"absolute", right:0, top:0, width:"50%", height:"100%",
              zIndex:3, cursor:"pointer" }}/>

            {/* Step content */}
            <div key={animKey} style={{
              padding:"52px 60px",
              animation:`${dir > 0 ? "step-in-r" : "step-in-l"} 0.55s cubic-bezier(.4,0,.2,1) both`,
            }}>
              {/* Step counter */}
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
                <div style={{ width:44, height:44, borderRadius:"50%",
                  background:"linear-gradient(180deg,#f07320,#c24f08)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:"0 0 20px rgba(232,96,10,0.45)", flexShrink:0 }}>
                  <span style={{ fontFamily:"'Fira Code',monospace",
                    fontSize:"13px", fontWeight:700, color:"#fff" }}>{step.nr}</span>
                </div>
                <step.Icon size={20} strokeWidth={1.5} color="rgba(240,236,227,0.4)"/>
                <span style={{ fontFamily:"'Fira Code',monospace", fontSize:"12px",
                  color:"rgba(240,236,227,0.2)", letterSpacing:"0.1em" }}>
                  {cur + 1} / {STEPS.length}
                </span>
              </div>

              <div style={{ fontFamily:"'Bebas Neue',sans-serif",
                fontSize:"clamp(28px,4vw,48px)", color:"#f0ece3",
                letterSpacing:"0.04em", marginBottom:16, lineHeight:1 }}>{step.title}</div>

              <p style={{ fontSize:"16px", color:"rgba(240,236,227,0.6)",
                lineHeight:1.7, maxWidth:"480px", fontFamily:"'IBM Plex Sans',sans-serif",
                margin:0 }}>{step.desc}</p>
            </div>

            {/* Border top accent */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px",
              background:`linear-gradient(90deg,transparent,rgba(232,96,10,${0.2 + cur * 0.25}),transparent)`,
              transition:"background 600ms" }}/>

          </div>

          {/* Step dots + nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
            gap:12, marginTop:20 }}>
            <button onClick={prev} data-cursor-small style={{
              background:"none", border:"1px solid rgba(240,236,227,0.15)",
              borderRadius:"50%", width:32, height:32, cursor:"pointer",
              color:"rgba(240,236,227,0.4)", display:"flex", alignItems:"center",
              justifyContent:"center", transition:"border-color 150ms,color 150ms" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#e8600a"; e.currentTarget.style.color="#e8600a"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(240,236,227,0.15)"; e.currentTarget.style.color="rgba(240,236,227,0.4)"; }}>
              <ChevronLeft size={14} strokeWidth={2}/>
            </button>

            {STEPS.map((_,i) => (
              <button key={i} data-cursor-small onClick={() => go(i, i > cur ? 1 : -1)} style={{
                width: i === cur ? 28 : 8, height:8, borderRadius:4, border:"none",
                background: i === cur ? "#e8600a" : "rgba(240,236,227,0.18)",
                cursor:"pointer", padding:0,
                transition:"width 300ms ease,background 300ms",
              }}/>
            ))}

            <button onClick={next} data-cursor-small style={{
              background:"none", border:"1px solid rgba(240,236,227,0.15)",
              borderRadius:"50%", width:32, height:32, cursor:"pointer",
              color:"rgba(240,236,227,0.4)", display:"flex", alignItems:"center",
              justifyContent:"center", transition:"border-color 150ms,color 150ms" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#e8600a"; e.currentTarget.style.color="#e8600a"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(240,236,227,0.15)"; e.currentTarget.style.color="rgba(240,236,227,0.4)"; }}>
              <ChevronRight size={14} strokeWidth={2}/>
            </button>
          </div>

          {/* Step overview */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:12 }}>
            {STEPS.map((s,i) => (
              <button key={i} data-cursor-small onClick={() => go(i, i > cur ? 1 : -1)} style={{
                background: i === cur ? "rgba(232,96,10,0.1)" : "rgba(240,236,227,0.03)",
                border:`1px solid ${i === cur ? "rgba(232,96,10,0.35)" : "rgba(240,236,227,0.07)"}`,
                borderRadius:8, padding:"8px 10px", cursor:"pointer", textAlign:"left",
                transition:"all 200ms" }}>
                <div style={{ fontSize:"10px", fontWeight:700,
                  color: i === cur ? "#e8600a" : "rgba(240,236,227,0.25)",
                  fontFamily:"'Fira Code',monospace", marginBottom:3 }}>{s.nr}</div>
                <div style={{ fontSize:"11px", fontWeight:600,
                  color: i === cur ? "#f0ece3" : "rgba(240,236,227,0.35)",
                  fontFamily:"'IBM Plex Sans',sans-serif", lineHeight:1.3 }}>{s.title}</div>
              </button>
            ))}
          </div>
        </SR>
      </div>
    </section>
  );
}

// ── CTA ────────────────────────────────────────────────────────────────────────
function CtaSection({ onRegister }) {
  return (
    <section id="cta" style={{ padding:"100px 24px", textAlign:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 60% 50% at 50% 50%,rgba(232,96,10,.07) 0%,transparent 70%)" }}/>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px",
        background:"linear-gradient(90deg,transparent,#e8600a44,transparent)" }}/>
      <div style={{ position:"relative", zIndex:1, maxWidth:"600px", margin:"0 auto" }}>
        <SR delay={0}><Lens id="cta-title" style={{ display:"inline-block" }}
          normal={<div style={{ fontFamily:"'Bebas Neue',system-ui,sans-serif",
            fontSize:"clamp(42px,6vw,68px)", color:"#f0ece3",
            letterSpacing:"0.04em", marginBottom:16, lineHeight:.95 }}>
            JETZT <span style={{ color:"#e8600a" }}>KOSTENLOS</span><br/>STARTEN
          </div>}
          swapped={<div style={{ fontFamily:"'Bebas Neue',system-ui,sans-serif",
            fontSize:"clamp(42px,6vw,68px)", color:"#e8600a",
            letterSpacing:"0.04em", marginBottom:16, lineHeight:.95 }}>
            JETZT <span style={{ color:"#f0ece3" }}>KOSTENLOS</span><br/>STARTEN
          </div>}
        /></SR>
        <SR delay={80}><p style={{ fontSize:"16px", color:"rgba(240,236,227,0.6)",
          lineHeight:1.7, marginBottom:36 }}>
          Kein Abo, kein Risiko. Registrieren und sofort mit dem Erstellen von BwR-Aufgaben beginnen.
        </p></SR>
        <SR delay={160}><Lens id="cta-btn" style={{ display:"inline-block" }}
          normal={<button onClick={onRegister} className="lp-cta-btn" data-cursor-label="LOS GEHT'S" style={{
            padding:"16px 40px",
            background:"linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
            border:"1px solid rgba(255,170,60,0.25)", borderRadius:"12px",
            color:"#f0ece3", fontSize:"17px", fontWeight:700, cursor:"pointer",
            fontFamily:"'IBM Plex Sans',sans-serif",
            boxShadow:"0 4px 0 rgba(0,0,0,.5),0 0 36px rgba(232,96,10,.45),inset 0 1px 0 rgba(255,200,80,.18)",
            display:"inline-flex", alignItems:"center", gap:10 }}>
            Account erstellen – kostenlos <ArrowRight size={18} strokeWidth={2}/>
          </button>}
          swapped={<button style={{
            padding:"16px 40px", background:"#f0ece3",
            border:"1px solid rgba(232,96,10,0.3)", borderRadius:"12px",
            color:"#e8600a", fontSize:"17px", fontWeight:700,
            fontFamily:"'IBM Plex Sans',sans-serif",
            display:"inline-flex", alignItems:"center", gap:10 }}>
            Account erstellen – kostenlos <ArrowRight size={18} strokeWidth={2} color="#e8600a"/>
          </button>}
        /></SR>
        <SR delay={220}><div style={{ marginTop:20, fontSize:"12px", color:"rgba(240,236,227,0.35)",
          display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
          {["Keine Kreditkarte","Sofortiger Zugang","Made in Bavaria"].map(t => (
            <span key={t} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <CheckSquare size={12} strokeWidth={1.5} color="#e8600a"/> {t}
            </span>
          ))}
        </div></SR>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop:"1px solid rgba(240,236,227,0.08)", padding:"28px 24px",
      display:"flex", justifyContent:"space-between", alignItems:"center",
      flexWrap:"wrap", gap:12 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"17px",
        color:"rgba(240,236,227,0.4)", letterSpacing:"0.06em" }}>
        BUCHUNGS<span style={{ color:"rgba(232,96,10,0.6)" }}>WERK</span>
      </div>
      <div style={{ fontSize:"11px", color:"rgba(240,236,227,0.25)", display:"flex", gap:20, flexWrap:"wrap" }}>
        {["Impressum","Datenschutz","Kontakt"].map(l => (
          <span key={l} style={{ cursor:"pointer" }} className="lp-nav-link">{l}</span>
        ))}
      </div>
      <div style={{ fontSize:"11px", color:"rgba(240,236,227,0.2)" }}>© 2026 Anton Gebert · AGPL-3.0</div>
    </footer>
  );
}

// ── Auth Modal ─────────────────────────────────────────────────────────────────
function AuthModal({ mode, onSwitch, onClose, onSuccess }) {
  const [email,p,pw2,vn,nn,sc] = [useState(""),useState(""),useState(""),useState(""),useState(""),useState("")];
  const [[email_v,setEmail],[p_v,setP],[pw2_v,setPw2],[vn_v,setVn],[nn_v,setNn],[sc_v,setSc]] =
    [[...email],[...p],[...pw2],[...vn],[...nn],[...sc]];
  const [showPw, setShowPw] = useState(false);
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);
  const [success,setSuccess]= useState(false);
  // Passwort-Reset
  const [resetStep,    setResetStep]    = useState(1);
  const [resetEmail,   setResetEmail]   = useState("");
  const [resetCode,    setResetCode]    = useState("");
  const [resetPw,      setResetPw]      = useState("");
  const [resetPw2,     setResetPw2]     = useState("");
  const [showResetPw,  setShowResetPw]  = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  // E-Mail-Verifizierung
  const [isVerify,     setIsVerify]     = useState(false);
  const [verifyEmail,  setVerifyEmail]  = useState("");
  const [verifyCode,   setVerifyCode]   = useState("");
  const [resentOk,     setResentOk]     = useState(false);
  // 2-Faktor-Auth
  const [isTwoFa,      setIsTwoFa]      = useState(false);
  const [twoFaTemp,    setTwoFaTemp]    = useState("");
  const [twoFaCode,    setTwoFaCode]    = useState("");
  // Login: E-Mail nicht bestätigt
  const [needsVerify,  setNeedsVerify]  = useState(false);
  const isLogin = mode === "login";
  const isReset = mode === "reset";
  const reset = () => { setError(""); setLoading(false); setNeedsVerify(false); };

  const handleResetRequest = async e => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await apiAuth("/auth/reset-request", { email: resetEmail.trim() });
      setResetStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResetConfirm = async e => {
    e.preventDefault(); setError("");
    if (resetPw !== resetPw2) { setError("Die Passwörter stimmen nicht überein."); return; }
    if (resetPw.length < 8)  { setError("Passwort muss mind. 8 Zeichen haben."); return; }
    setLoading(true);
    try {
      await apiAuth("/auth/reset-confirm",
        { email: resetEmail.trim(), token: resetCode.trim(), neues_passwort: resetPw });
      setResetSuccess(true);
      setTimeout(() => { onSwitch("login"); setResetStep(1); setResetCode(""); setResetPw(""); setResetPw2(""); setResetSuccess(false); }, 2200);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async e => {
    e.preventDefault(); setError(""); setResentOk(false); setLoading(true);
    try {
      const { token, user } = await apiAuth("/auth/verify-email", { email: verifyEmail, token: verifyCode.trim() });
      setAuth(token, user); setSuccess(true);
      setTimeout(() => onSuccess(user), 500);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  const handleResendVerify = async () => {
    setError(""); setResentOk(false); setLoading(true);
    try {
      await apiAuth("/auth/resend-verify", { email: verifyEmail });
      setResentOk(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleTwoFa = async e => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const { token, user } = await apiAuth("/auth/totp/login", { temp_token: twoFaTemp, code: twoFaCode.trim() });
      setAuth(token, user); setSuccess(true);
      setTimeout(() => onSuccess(user), 500);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault(); setError(""); setNeedsVerify(false); setLoading(true);
    try {
      if (!isLogin) {
        if (p_v !== pw2_v)   throw new Error("Die Passwörter stimmen nicht überein.");
        if (p_v.length < 8)  throw new Error("Das Passwort muss mindestens 8 Zeichen haben.");
        if (!vn_v.trim())    throw new Error("Bitte Vornamen eingeben.");
      }
      const payload = isLogin ? { email:email_v.trim(), passwort:p_v }
        : { vorname:vn_v.trim(), nachname:nn_v.trim(), email:email_v.trim(), schule:sc_v.trim(), passwort:p_v };
      const result = await apiAuth(isLogin ? "/auth/login" : "/auth/register", payload);
      if (result.requires_verify) {
        setVerifyEmail(email_v.trim().toLowerCase());
        setIsVerify(true); setLoading(false); return;
      }
      if (result.requires_2fa) {
        setTwoFaTemp(result.temp_token);
        setIsTwoFa(true); setLoading(false); return;
      }
      setAuth(result.token, result.user); setSuccess(true);
      setTimeout(() => onSuccess(result.user), 500);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("nicht bestätigt")) setNeedsVerify(true);
      setLoading(false);
    }
  };

  const inp = { width:"100%", padding:"11px 14px", boxSizing:"border-box",
    background:"rgba(240,236,227,0.06)", border:"1.5px solid rgba(240,236,227,0.16)",
    borderRadius:"9px", fontSize:"14px", color:"#f0ece3",
    fontFamily:"'IBM Plex Sans',sans-serif", minHeight:"44px" };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1200, background:"rgba(0,0,0,0.75)",
      backdropFilter:"blur(12px)", display:"flex", alignItems:"center",
      justifyContent:"center", padding:"20px", animation:"lp-fade-in 0.18s ease" }}>
      <div style={{ width:"100%", maxWidth:"440px", background:"rgba(22,15,6,0.97)",
        backdropFilter:"blur(24px)", border:"1px solid rgba(240,236,227,0.12)",
        borderTop:"2px solid #e8600a", borderRadius:"18px", padding:"32px 28px",
        boxShadow:"0 20px 60px rgba(0,0,0,0.7)",
        animation:"lp-modal-in 0.22s cubic-bezier(.4,0,.2,1)", position:"relative" }}>

        <button onClick={onClose} data-cursor-small style={{ position:"absolute", top:16, right:16,
          background:"none", border:"none", cursor:"pointer",
          color:"rgba(240,236,227,0.4)", padding:4, display:"flex" }}>
          <X size={18} strokeWidth={1.5}/>
        </button>

        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px",
          letterSpacing:"0.06em", color:"#f0ece3", marginBottom:22 }}>
          BUCHUNGS<span style={{ color:"#e8600a" }}>WERK</span>
        </div>

        {isVerify ? (
          /* ── E-Mail-Verifizierung ── */
          <form onSubmit={handleVerify} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(232,96,10,0.15)",
                border:"1.5px solid rgba(232,96,10,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Mail size={16} strokeWidth={1.5} color="#e8600a"/>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"#f0ece3" }}>E-Mail bestätigen</div>
                <div style={{ fontSize:12, color:"rgba(240,236,227,0.45)" }}>{verifyEmail}</div>
              </div>
            </div>
            <div style={{ fontSize:13, color:"rgba(240,236,227,0.55)", lineHeight:1.55 }}>
              Wir haben einen <strong style={{ color:"#f0ece3" }}>6-stelligen Code</strong> an deine E-Mail geschickt. Bitte eingeben:
            </div>
            <div style={{ position:"relative" }}>
              <KeyRound size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
              <input className="lp-input" type="text" placeholder="000000" value={verifyCode}
                onChange={e => setVerifyCode(e.target.value)} required maxLength={6} inputMode="numeric"
                style={{ ...inp, paddingLeft:34, letterSpacing:".22em", fontWeight:800, fontSize:18, textAlign:"center" }}/>
            </div>
            {resentOk && (
              <div style={{ padding:"9px 12px", background:"rgba(74,222,128,0.10)",
                border:"1px solid rgba(74,222,128,0.25)", borderRadius:8,
                fontSize:13, color:"#4ade80", display:"flex", alignItems:"center", gap:7 }}>
                <CheckSquare size={14} strokeWidth={1.5}/>Neuer Code wurde gesendet.
              </div>
            )}
            {error && (
              <div style={{ padding:"9px 12px", background:"rgba(220,38,38,0.12)",
                border:"1px solid rgba(220,38,38,0.3)", borderRadius:8,
                fontSize:13, color:"#fca5a5", display:"flex", alignItems:"flex-start", gap:7 }}>
                <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink:0, marginTop:1 }}/>{error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              width:"100%", padding:12,
              background: loading ? "rgba(232,96,10,0.4)" : "linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
              border:"1px solid rgba(255,170,60,0.25)", borderRadius:10,
              color:"#f0ece3", fontWeight:700, fontSize:15,
              cursor: loading ? "default" : "pointer", fontFamily:"'IBM Plex Sans',sans-serif",
              boxShadow: loading ? "none" : "0 3px 0 rgba(0,0,0,.4),0 0 20px rgba(232,96,10,.3)",
              transition:"all 180ms", minHeight:46 }}>
              {loading ? "Wird geprüft…" : "Bestätigen & Anmelden"}
            </button>
            <div style={{ textAlign:"center", fontSize:12, color:"rgba(240,236,227,0.35)" }}>
              Keinen Code erhalten?{" "}
              <span onClick={handleResendVerify}
                style={{ color:"#e8600a", cursor:"pointer", fontWeight:600 }}>Erneut senden</span>
            </div>
          </form>

        ) : isTwoFa ? (
          /* ── 2-Faktor-Auth ── */
          <form onSubmit={handleTwoFa} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(232,96,10,0.15)",
                border:"1.5px solid rgba(232,96,10,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Shield size={16} strokeWidth={1.5} color="#e8600a"/>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"#f0ece3" }}>Zwei-Faktor-Authentifizierung</div>
                <div style={{ fontSize:12, color:"rgba(240,236,227,0.45)" }}>Code aus deiner Authenticator-App</div>
              </div>
            </div>
            <div style={{ fontSize:13, color:"rgba(240,236,227,0.55)", lineHeight:1.55 }}>
              Öffne deine Authenticator-App und gib den <strong style={{ color:"#f0ece3" }}>6-stelligen Code</strong> ein:
            </div>
            <div style={{ position:"relative" }}>
              <Smartphone size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
              <input className="lp-input" type="text" placeholder="000000" value={twoFaCode}
                onChange={e => setTwoFaCode(e.target.value)} required maxLength={6} inputMode="numeric"
                style={{ ...inp, paddingLeft:34, letterSpacing:".22em", fontWeight:800, fontSize:18, textAlign:"center" }}/>
            </div>
            {error && (
              <div style={{ padding:"9px 12px", background:"rgba(220,38,38,0.12)",
                border:"1px solid rgba(220,38,38,0.3)", borderRadius:8,
                fontSize:13, color:"#fca5a5", display:"flex", alignItems:"flex-start", gap:7 }}>
                <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink:0, marginTop:1 }}/>{error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              width:"100%", padding:12,
              background: loading ? "rgba(232,96,10,0.4)" : "linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
              border:"1px solid rgba(255,170,60,0.25)", borderRadius:10,
              color:"#f0ece3", fontWeight:700, fontSize:15,
              cursor: loading ? "default" : "pointer", fontFamily:"'IBM Plex Sans',sans-serif",
              boxShadow: loading ? "none" : "0 3px 0 rgba(0,0,0,.4),0 0 20px rgba(232,96,10,.3)",
              transition:"all 180ms", minHeight:46 }}>
              {loading ? "Wird geprüft…" : "Anmelden"}
            </button>
            <div style={{ textAlign:"center", fontSize:12, color:"rgba(240,236,227,0.35)" }}>
              <span onClick={() => { setIsTwoFa(false); setTwoFaTemp(""); setTwoFaCode(""); setError(""); }}
                style={{ color:"rgba(240,236,227,0.4)", cursor:"pointer" }}>← Zurück zur Anmeldung</span>
            </div>
          </form>

        ) : isReset ? (
          /* ── Passwort-Reset ── */
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <button onClick={() => { onSwitch("login"); setResetStep(1); reset(); setResetCode(""); setResetPw(""); setResetPw2(""); setResetSuccess(false); }}
              style={{ background:"none", border:"none", cursor:"pointer", padding:0,
                color:"rgba(240,236,227,0.45)", fontSize:13, fontWeight:600,
                fontFamily:"'IBM Plex Sans',sans-serif", display:"flex", alignItems:"center", gap:5,
                marginBottom:4, width:"fit-content" }}>
              ← Zurück zur Anmeldung
            </button>

            {resetSuccess ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <CheckSquare size={38} strokeWidth={1.5} color="#16a34a" style={{ marginBottom:12 }}/>
                <div style={{ fontWeight:700, color:"#f0ece3", marginBottom:6 }}>Passwort geändert!</div>
                <div style={{ fontSize:13, color:"rgba(240,236,227,0.5)" }}>Du wirst zur Anmeldung weitergeleitet…</div>
              </div>
            ) : resetStep === 1 ? (
              <form onSubmit={handleResetRequest} style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ fontSize:13, color:"rgba(240,236,227,0.55)", lineHeight:1.55 }}>
                  Gib deine E-Mail-Adresse ein. Du erhältst einen 6-stelligen Code.
                </div>
                <div style={{ position:"relative" }}>
                  <Mail size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                    position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                  <input className="lp-input" type="email" placeholder="E-Mail-Adresse *"
                    value={resetEmail} onChange={e => setResetEmail(e.target.value)} required
                    style={{ ...inp, paddingLeft:34 }}/>
                </div>
                {error && (
                  <div style={{ padding:"9px 12px", background:"rgba(220,38,38,0.12)",
                    border:"1px solid rgba(220,38,38,0.3)", borderRadius:8,
                    fontSize:13, color:"#fca5a5", display:"flex", alignItems:"flex-start", gap:7 }}>
                    <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink:0, marginTop:1 }}/>{error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{
                  marginTop:4, width:"100%", padding:12,
                  background: loading ? "rgba(232,96,10,0.4)"
                    : "linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
                  border:"1px solid rgba(255,170,60,0.25)", borderRadius:10,
                  color:"#f0ece3", fontWeight:700, fontSize:15,
                  cursor: loading ? "default" : "pointer", fontFamily:"'IBM Plex Sans',sans-serif",
                  boxShadow: loading ? "none" : "0 3px 0 rgba(0,0,0,.4),0 0 20px rgba(232,96,10,.3)",
                  transition:"all 180ms", minHeight:46 }}>
                  {loading ? "Sende Code…" : "Code per E-Mail senden"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetConfirm} style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ fontSize:13, color:"rgba(240,236,227,0.55)", lineHeight:1.55 }}>
                  Code aus der E-Mail an <strong style={{ color:"#e8600a" }}>{resetEmail}</strong> eingeben und neues Passwort setzen.
                </div>
                <div style={{ position:"relative" }}>
                  <KeyRound size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                    position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                  <input className="lp-input" type="text" placeholder="6-stelliger Code *"
                    value={resetCode} onChange={e => setResetCode(e.target.value)} required
                    maxLength={6} inputMode="numeric"
                    style={{ ...inp, paddingLeft:34, letterSpacing:".18em", fontWeight:700, fontSize:16 }}/>
                </div>
                <div style={{ position:"relative" }}>
                  <Lock size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                    position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                  <input className="lp-input" type={showResetPw?"text":"password"} placeholder="Neues Passwort *"
                    value={resetPw} onChange={e => setResetPw(e.target.value)} required
                    style={{ ...inp, paddingLeft:34, paddingRight:40 }}/>
                  <button type="button" onClick={() => setShowResetPw(v=>!v)} style={{
                    position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer",
                    color:"rgba(240,236,227,0.3)", padding:4, display:"flex" }}>
                    {showResetPw ? <EyeOff size={14} strokeWidth={1.5}/> : <Eye size={14} strokeWidth={1.5}/>}
                  </button>
                </div>
                <div style={{ position:"relative" }}>
                  <Lock size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                    position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                  <input className="lp-input" type={showResetPw?"text":"password"} placeholder="Passwort wiederholen *"
                    value={resetPw2} onChange={e => setResetPw2(e.target.value)} required
                    style={{ ...inp, paddingLeft:34 }}/>
                </div>
                {error && (
                  <div style={{ padding:"9px 12px", background:"rgba(220,38,38,0.12)",
                    border:"1px solid rgba(220,38,38,0.3)", borderRadius:8,
                    fontSize:13, color:"#fca5a5", display:"flex", alignItems:"flex-start", gap:7 }}>
                    <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink:0, marginTop:1 }}/>{error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{
                  marginTop:4, width:"100%", padding:12,
                  background: loading ? "rgba(232,96,10,0.4)"
                    : "linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
                  border:"1px solid rgba(255,170,60,0.25)", borderRadius:10,
                  color:"#f0ece3", fontWeight:700, fontSize:15,
                  cursor: loading ? "default" : "pointer", fontFamily:"'IBM Plex Sans',sans-serif",
                  boxShadow: loading ? "none" : "0 3px 0 rgba(0,0,0,.4),0 0 20px rgba(232,96,10,.3)",
                  transition:"all 180ms", minHeight:46 }}>
                  {loading ? "Wird gesetzt…" : "Passwort setzen"}
                </button>
                <div style={{ textAlign:"center", fontSize:12, color:"rgba(240,236,227,0.35)" }}>
                  Keinen Code erhalten?{" "}
                  <span onClick={() => { setResetStep(1); reset(); }}
                    style={{ color:"#e8600a", cursor:"pointer", fontWeight:600 }}>Erneut senden</span>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display:"flex", borderBottom:"2px solid rgba(240,236,227,0.1)", marginBottom:24 }}>
              {[["login","Anmelden"],["register","Registrieren"]].map(([m,l]) => (
                <button key={m} onClick={() => { onSwitch(m); reset(); }} className="lp-tab-btn"
                  data-cursor-small style={{ flex:1, padding:10, background:"none", border:"none",
                  cursor:"pointer", fontSize:"14px", fontWeight:700, fontFamily:"'IBM Plex Sans',sans-serif",
                  color: mode===m ? "#f0ece3" : "rgba(240,236,227,0.38)",
                  borderBottom: mode===m ? "2px solid #e8600a" : "2px solid transparent",
                  marginBottom:-2 }}>{l}</button>
              ))}
            </div>

            {success ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <CheckSquare size={40} strokeWidth={1.5} color="#16a34a" style={{ marginBottom:12 }}/>
                <div style={{ fontWeight:700, color:"#f0ece3", marginBottom:6 }}>
                  {isLogin ? "Willkommen zurück!" : "Account erstellt!"}</div>
                <div style={{ fontSize:"13px", color:"rgba(240,236,227,0.5)" }}>Wird geladen…</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {!isLogin && (
                  <>
                    <div style={{ display:"flex", gap:8 }}>
                      <div style={{ flex:1, position:"relative" }}>
                        <User size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                          position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                        <input className="lp-input" type="text" placeholder="Vorname *"
                          value={vn_v} onChange={e => setVn(e.target.value)} required
                          style={{ ...inp, paddingLeft:34 }}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <input className="lp-input" type="text" placeholder="Nachname"
                          value={nn_v} onChange={e => setNn(e.target.value)} style={inp}/>
                      </div>
                    </div>
                    <div style={{ position:"relative" }}>
                      <School size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                        position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                      <input className="lp-input" type="text" placeholder="Schule (optional)"
                        value={sc_v} onChange={e => setSc(e.target.value)}
                        style={{ ...inp, paddingLeft:34 }}/>
                    </div>
                  </>
                )}
                <div style={{ position:"relative" }}>
                  <Mail size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                    position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                  <input className="lp-input" type="email" placeholder="E-Mail-Adresse *"
                    value={email_v} onChange={e => setEmail(e.target.value)} required
                    style={{ ...inp, paddingLeft:34 }}/>
                </div>
                <div style={{ position:"relative" }}>
                  <Lock size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                    position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                  <input className="lp-input" type={showPw?"text":"password"} placeholder="Passwort *"
                    value={p_v} onChange={e => setP(e.target.value)} required
                    style={{ ...inp, paddingLeft:34, paddingRight:40 }}/>
                  <button type="button" data-cursor-small onClick={() => setShowPw(v=>!v)} style={{
                    position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer",
                    color:"rgba(240,236,227,0.3)", padding:4, display:"flex" }}>
                    {showPw ? <EyeOff size={14} strokeWidth={1.5}/> : <Eye size={14} strokeWidth={1.5}/>}
                  </button>
                </div>
                {!isLogin && (
                  <div style={{ position:"relative" }}>
                    <Lock size={14} strokeWidth={1.5} color="rgba(240,236,227,0.3)" style={{
                      position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                    <input className="lp-input" type={showPw?"text":"password"} placeholder="Passwort wiederholen *"
                      value={pw2_v} onChange={e => setPw2(e.target.value)} required
                      style={{ ...inp, paddingLeft:34 }}/>
                  </div>
                )}
                {error && (
                  <div style={{ padding:"9px 12px", background:"rgba(220,38,38,0.12)",
                    border:"1px solid rgba(220,38,38,0.3)", borderRadius:8,
                    fontSize:13, color:"#fca5a5", display:"flex", alignItems:"flex-start", gap:7 }}>
                    <AlertTriangle size={14} strokeWidth={1.5} style={{ flexShrink:0, marginTop:1 }}/>{error}
                  </div>
                )}
                {needsVerify && (
                  <button type="button" onClick={() => {
                    setVerifyEmail(email_v.trim().toLowerCase());
                    setIsVerify(true); setError(""); setNeedsVerify(false);
                  }} style={{ background:"rgba(232,96,10,0.12)", border:"1px solid rgba(232,96,10,0.35)",
                    color:"#e8600a", borderRadius:8, padding:"8px 12px", fontWeight:700, fontSize:12,
                    cursor:"pointer", display:"flex", alignItems:"center", gap:6,
                    fontFamily:"'IBM Plex Sans',sans-serif" }}>
                    <Mail size={13} strokeWidth={2}/>E-Mail jetzt bestätigen →
                  </button>
                )}
                <button type="submit" disabled={loading} style={{
                  marginTop:4, width:"100%", padding:12,
                  background: loading ? "rgba(232,96,10,0.4)"
                    : "linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
                  border:"1px solid rgba(255,170,60,0.25)", borderRadius:10,
                  color:"#f0ece3", fontWeight:700, fontSize:15,
                  cursor: loading ? "default" : "pointer", fontFamily:"'IBM Plex Sans',sans-serif",
                  boxShadow: loading ? "none" : "0 3px 0 rgba(0,0,0,.4),0 0 20px rgba(232,96,10,.3)",
                  transition:"all 180ms", minHeight:46 }}>
                  {loading ? "Wird verarbeitet…" : (isLogin ? "Anmelden" : "Account erstellen")}
                </button>
                <div style={{ textAlign:"center", fontSize:12, color:"rgba(240,236,227,0.38)", marginTop:4 }}>
                  {isLogin ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <div>Noch kein Account?{" "}
                        <span onClick={() => { onSwitch("register"); reset(); }}
                          style={{ color:"#e8600a", cursor:"pointer", fontWeight:600 }}>Jetzt registrieren</span>
                      </div>
                      <div>
                        <span onClick={() => { onSwitch("reset"); reset(); setResetStep(1); setResetEmail(email_v); }}
                          style={{ color:"rgba(240,236,227,0.45)", cursor:"pointer", fontWeight:500 }}>
                          Passwort vergessen?
                        </span>
                      </div>
                    </div>
                  ) : <>Bereits registriert?{" "}
                    <span onClick={() => { onSwitch("login"); reset(); }}
                      style={{ color:"#e8600a", cursor:"pointer", fontWeight:600 }}>Anmelden</span>
                  </>}
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function Landing({ onLogin }) {
  const [authModal, setAuthModal] = useState(null);
  useEffect(() => {
    if (window.location.hash === "#login")    setAuthModal("login");
    if (window.location.hash === "#register") setAuthModal("register");
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"#141008", color:"#f0ece3",
      fontFamily:"'IBM Plex Sans',system-ui,-apple-system,sans-serif",
      overflowX:"clip", paddingTop:"62px" }}>
      <style>{LANDING_CSS}</style>
      <CustomCursor />
      <Nav onLogin={() => setAuthModal("login")} onRegister={() => setAuthModal("register")}/>
      <Hero onRegister={() => setAuthModal("register")} onLogin={() => setAuthModal("login")}/>
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection onRegister={() => setAuthModal("register")}/>
      <Footer />
      {authModal && (
        <AuthModal mode={authModal} onSwitch={m => setAuthModal(m)}
          onClose={() => setAuthModal(null)}
          onSuccess={user => { setAuthModal(null); onLogin(user); }}/>
      )}
    </div>
  );
}
