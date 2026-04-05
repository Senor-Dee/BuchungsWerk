// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Anton Gebert <info@buchungswerk.org> - BuchungsWerk

import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
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
  @keyframes step-in-up  { from{opacity:0;transform:translateY(32px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes step-in-dn  { from{opacity:0;transform:translateY(-32px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)} }
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
          Klassen 7–10, alle Lernbereiche, druckfertig in Sekunden.
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
    { value:"7–10", label:"Klassen" },      { value:"∞",    label:"Varianten" },
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
// FEATURES: iPad-Frame + scroll-driven Feature-Reveal
// ══════════════════════════════════════════════════════════════════════════════
const FEATURES = [
  { nr:"01", Icon:Zap,          title:"KI-Aufgaben in Sekunden",        sub:"Planspiel · Komplexaufgaben · Belege",
    desc:"Mit einem Klick vollständige BwR-Aufgaben generieren – inkl. Unternehmens-Planspiel, Komplexaufgaben und realistischen Belegen. Die KI liefert Aufgabe und Musterlösung, passend zu Klasse, Thema und Lernbereich.", tag:"KI" },
  { nr:"02", Icon:FileText,     title:"Druckfertig in Sekunden",         sub:"Ohne Wasserzeichen · Word · PDF",
    desc:"Exportiere Schulaufgaben als Word, Pages oder PDF – ohne Wasserzeichen, ohne Nachbearbeitung. Kopfzeile, Notenfeld und Punkteverteilung werden automatisch ergänzt. In wenigen Sekunden druckbereit.", tag:"Export" },
  { nr:"03", Icon:GraduationCap,title:"ISB-konform & lehrplangerecht",   sub:"LB 1 bis Jahresabschluss · Grundwissen",
    desc:"Alle Lernbereiche nach bayerischem Lehrplan – von LB 1 (Werkstoffe) bis Jahresabschluss (GuV, Bilanz). Kontenplan nach IKR, Punktevergabe nach Handreichung. Inklusive Wiederholung des Grundwissens.", tag:"ISB" },
  { nr:"04", Icon:School,       title:"ByCS & H5P-Integration",          sub:"Lernplattform-Export · Offline-Übungen",
    desc:"Exportiere H5P-Übungen direkt auf die ByCS Lernplattform – oder als offline-Paket für das Klassenzimmer ohne Internetanschluss. Schüler üben digital, du behältst die Kontrolle.", tag:"ByCS" },
  { nr:"05", Icon:Shield,       title:"DSGVO-konform & geräteunabhängig",sub:"Deutsche Server · Windows · Mac · Linux",
    desc:"BuchungsWerk läuft vollständig auf deutschen Servern – DSGVO-konform ohne externe Dienste. Die App funktioniert auf jedem Betriebssystem: Windows, macOS, Linux, Tablet – immer im Browser, ohne Installation.", tag:"Datenschutz" },
  { nr:"06", Icon:Building2,    title:"Schullizenzen & Speicher",         sub:"Kollegium · Aufgaben teilen · Klassen",
    desc:"Mit einer Schullizenz erhalten alle Lehrkräfte Ihrer Schule Zugang. Eigene Aufgaben und Szenarien zentral speichern und im Kollegium teilen – für einheitlichen Unterricht ohne Mehraufwand.", tag:"Schule" },
];

// iPad Pro Portrait – Space Black (App-Farben), kein Stift, kein Home-Button
function IPadFrame({ children, deviceW, deviceH }) {
  const bezelTop    = 16;
  const bezelSide   = 22;
  const bezelBottom = 14;
  const outerR = 20;
  const innerR = 13;

  const btnStyle = {
    position: "absolute",
    right: -2.5,
    width: 3,
    borderRadius: "0 3px 3px 0",
    background: "linear-gradient(90deg, #2a2520 0%, #3c342a 55%, #2e2820 100%)",
    boxShadow: "1.5px 0 0 rgba(255,255,255,0.07), -1px 0 2px rgba(0,0,0,0.6)",
  };

  return (
    <div style={{
      position: "relative",
      width:  deviceW,
      height: deviceH,
      borderRadius: outerR,
      background: "linear-gradient(158deg, #3a342a 0%, #28231a 28%, #1e1a13 52%, #272218 76%, #38312a 100%)",
      boxShadow: [
        "0 0 0 1px rgba(255,255,255,0.11)",
        "inset 0 0 0 0.5px rgba(0,0,0,0.65)",
        "0 70px 160px rgba(0,0,0,0.90)",
        "0 24px 64px rgba(0,0,0,0.60)",
        "inset 0 1.5px 0 rgba(255,255,255,0.17)",
        "inset 0 -1px 0 rgba(0,0,0,0.8)",
      ].join(", "),
      flexShrink: 0,
    }}>

      {/* Kamera – Oberkante zentriert (Face ID Seite) */}
      <div style={{
        position: "absolute",
        top: Math.round(bezelTop * 0.46) - 3,
        left: "50%", transform: "translateX(-50%)",
        width: 8, height: 8, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #2e2c2a, #0c0c0a)",
        boxShadow: "0 0 0 1.5px rgba(0,0,0,0.75), 0 0 0 3px rgba(55,50,42,0.45)",
      }} />

      {/* Power-Taste – rechte Seite, oben */}
      <div style={{ ...btnStyle, top: "21%", height: 32 }} />

      {/* Lautstärke + – rechte Seite */}
      <div style={{ ...btnStyle, top: "37%", height: 36 }} />

      {/* Lautstärke – – rechte Seite */}
      <div style={{ ...btnStyle, top: "51%", height: 36 }} />

      {/* USB-C – Unterkante zentriert */}
      <div style={{
        position: "absolute",
        bottom: Math.round(bezelBottom * 0.44),
        left: "50%", transform: "translateX(-50%)",
        width: Math.round(deviceW * 0.09), height: 3.5,
        borderRadius: 2,
        background: "rgba(0,0,0,0.52)",
        boxShadow: "inset 0 1px 0 rgba(0,0,0,0.5), 0 0 0 0.5px rgba(75,68,52,0.32)",
      }} />

      {/* Lautsprecher links – Unterkante */}
      <div style={{ position:"absolute", bottom: Math.round(bezelBottom * 0.42) - 0.5, left:"20%", display:"flex", gap:3 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width:2, height:3.5, borderRadius:1, background:"rgba(0,0,0,0.52)", boxShadow:"0 0 0 0.5px rgba(75,68,52,0.24)" }} />)}
      </div>

      {/* Lautsprecher rechts – Unterkante */}
      <div style={{ position:"absolute", bottom: Math.round(bezelBottom * 0.42) - 0.5, right:"20%", display:"flex", gap:3 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width:2, height:3.5, borderRadius:1, background:"rgba(0,0,0,0.52)", boxShadow:"0 0 0 0.5px rgba(75,68,52,0.24)" }} />)}
      </div>

      {/* Screen */}
      <div style={{
        position: "absolute",
        top: bezelTop, left: bezelSide, right: bezelSide, bottom: bezelBottom,
        borderRadius: innerR,
        background: "#0e0b07",
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.78), inset 0 2px 18px rgba(0,0,0,0.7)",
      }}>
        {children}
      </div>
    </div>
  );
}

function FeaturesSection() {
  const sectionRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Echtzeit-Uhr für iPad-Statusleiste
  const [clock, setClock] = useState(() => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Phase 1 (0–15 %): iPad hebt sich aus der Fläche hoch
  // Phase 2 (15–85 %): Features cyclen, iPad scrollt nach oben → Bottom wird sichtbar
  // Phase 3 (85–100 %): iPad legt sich wieder hin
  const rotateX    = useTransform(scrollYProgress, [0,    0.15, 0.85, 1.0], [65,   0,    0,    65  ]);
  const scale      = useTransform(scrollYProgress, [0,    0.15, 0.85, 1.0], [0.80, 1,    1,    0.80]);
  const iPadOp     = useTransform(scrollYProgress, [0,    0.06, 0.94, 1.0], [0,    1,    1,    0   ]);
  // translateY: hebt iPad in Clip-Fenster, dann scrollt langsam nach oben → Bottom sichtbar
  // iPad 543px, Clip 390px → Mitte bei y=-76, Bottom-Bezel bei y=-190 (vor Mask-Fade bei 93%)
  const iPadY      = useTransform(scrollYProgress, [0,    0.15, 0.85, 1.0], [30,  -76, -190,  -190 ]);

  // Feature-Index aus Scroll
  const featureRaw = useTransform(scrollYProgress, [0.18, 0.82], [0, FEATURES.length - 1]);
  useEffect(() => {
    const unsub = featureRaw.on("change", v => {
      setActiveIdx(Math.round(Math.min(Math.max(v, 0), FEATURES.length - 1)));
    });
    return unsub;
  }, [featureRaw]);

  // Portrait-Dimensionen: iPad Pro 11" Hochformat
  const deviceW = 380;
  const deviceH = 543;
  // Clip-Fenster: zeigt nur Mittelteil des iPads – enthüllt mit Scroll den Bottom
  const CLIP_H  = 390;

  return (
    <section ref={sectionRef} id="features"
      style={{ position:"relative", height:"600vh",
        borderTop:"1px solid rgba(240,236,227,0.07)" }}>

      {/* Top accent */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
        background:"linear-gradient(90deg,transparent,rgba(232,96,10,0.55),transparent)",
        zIndex:1, pointerEvents:"none" }}/>

      {/* Sticky viewport */}
      <div data-cursor="features" style={{ position:"sticky", top:0, height:"100vh",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"flex-start",
        paddingTop: 80, overflow:"hidden" }}>

        {/* Überschrift – immer sichtbar über dem iPad */}
        <div style={{ textAlign:"center", marginBottom:18, zIndex:2, flexShrink:0 }}>
          <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.18em",
            textTransform:"uppercase", color:"#e8600a",
            fontFamily:"'IBM Plex Sans',sans-serif", marginBottom:8 }}>
            Funktionen
          </div>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif",
            fontSize:"clamp(28px,3.4vw,46px)", color:"#f0ece3",
            letterSpacing:"0.04em", lineHeight:0.95, margin:"0 0 6px" }}>
            ALLES WAS DU <span style={{ color:"#e8600a" }}>BRAUCHST</span>
          </h2>
          <p style={{ fontFamily:"'IBM Plex Sans',sans-serif",
            fontSize:"clamp(11px,1vw,13px)", color:"rgba(240,236,227,0.4)",
            maxWidth:360, margin:"0 auto" }}>
            Sechs leistungsstarke Werkzeuge — für jeden BwR-Unterricht.
          </p>
        </div>

        {/* Clip-Fenster: volle Breite + CSS-Maske → kein sichtbares Rechteck */}
        <div style={{
          width: "100%",
          height: `${CLIP_H}px`,
          overflow: "hidden",
          flexShrink: 0,
          zIndex: 2,
          display: "flex",
          justifyContent: "center",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 9%, black 93%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 9%, black 93%, transparent 100%)",
        }}>
          {/* Perspective-Wrapper direkt um das bewegte iPad */}
          <div style={{ perspective: "900px", perspectiveOrigin: "50% 35%", flexShrink: 0 }}>
          <motion.div style={{ rotateX, scale, opacity: iPadOp, y: iPadY, flexShrink: 0 }}>
            <IPadFrame deviceW={deviceW} deviceH={deviceH}>

              {/* Status-Bar */}
              <div style={{ position:"absolute", top:0, left:0, right:0, height:22,
                background:"rgba(14,11,7,0.92)",
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"0 14px", zIndex:10 }}>
                <span style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.65)",
                  fontFamily:"'IBM Plex Sans',sans-serif" }}>{clock}</span>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  {/* Wifi */}
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                    <path d="M7 8.5a.75.75 0 100 1.5.75.75 0 000-1.5z" fill="rgba(240,236,227,0.55)"/>
                    <path d="M4.5 6.2C5.2 5.5 6 5.1 7 5.1s1.8.4 2.5 1.1" stroke="rgba(240,236,227,0.55)" strokeWidth="1" strokeLinecap="round" fill="none"/>
                    <path d="M2.5 4.1A6.4 6.4 0 017 2.5a6.4 6.4 0 014.5 1.6" stroke="rgba(240,236,227,0.4)" strokeWidth="1" strokeLinecap="round" fill="none"/>
                    <path d="M.5 2A9.3 9.3 0 017 0a9.3 9.3 0 016.5 2" stroke="rgba(240,236,227,0.25)" strokeWidth="1" strokeLinecap="round" fill="none"/>
                  </svg>
                  {/* Batterie */}
                  <div style={{ width:18, height:9, borderRadius:2, border:"1px solid rgba(240,236,227,0.45)", position:"relative" }}>
                    <div style={{ position:"absolute", top:1.5, left:1, bottom:1.5, right:5,
                      background:"rgba(240,236,227,0.55)", borderRadius:1 }} />
                    <div style={{ position:"absolute", top:2.5, right:-3.5, width:2.5, height:4,
                      background:"rgba(240,236,227,0.4)", borderRadius:"0 1.5px 1.5px 0" }} />
                  </div>
                </div>
              </div>

              {/* Feature-Content – Portrait Single-Column */}
              <div style={{ position:"absolute", inset:0, paddingTop:22, overflow:"hidden" }}>

                {/* Vertikale Progress-Dots – rechter Rand */}
                <div style={{
                  position: "absolute", right: 10, top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex", flexDirection: "column", gap: 7,
                  zIndex: 5, pointerEvents: "none",
                }}>
                  {FEATURES.map((_, i) => (
                    <div key={i} style={{
                      width: 5,
                      height: i === activeIdx ? 24 : 5,
                      borderRadius: 3,
                      background: i === activeIdx ? "#e8600a" : "rgba(240,236,227,0.20)",
                      transition: "height 280ms ease, background 280ms ease",
                    }} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {(() => {
                    const f = FEATURES[activeIdx];
                    const Ic = f.Icon;
                    return (
                      <motion.div
                        key={activeIdx}
                        initial={{ opacity:0, y:20 }}
                        animate={{ opacity:1, y:0 }}
                        exit={{ opacity:0, y:-20 }}
                        transition={{ duration:0.26, ease:"easeOut" }}
                        style={{
                          position:"absolute", inset:0,
                          display:"flex", flexDirection:"column",
                          alignItems:"center", justifyContent:"center",
                          background:"linear-gradient(170deg, #1a1208 0%, #141008 55%, #0e0b07 100%)",
                          padding:"16px 22px 20px",
                          textAlign:"center",
                          overflow:"hidden",
                        }}
                      >
                        {/* Nummer + Tag */}
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                          <span style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.2em",
                            color:"rgba(232,96,10,0.65)", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                            {f.nr}<span style={{ color:"rgba(240,236,227,0.22)" }}> / 06</span>
                          </span>
                          <span style={{ padding:"3px 10px", borderRadius:8,
                            background:"rgba(232,96,10,0.12)", border:"1px solid rgba(232,96,10,0.22)",
                            fontSize:"9px", fontWeight:700, color:"#e8600a",
                            letterSpacing:"0.12em", textTransform:"uppercase",
                            fontFamily:"'IBM Plex Sans',sans-serif" }}>
                            {f.tag}
                          </span>
                        </div>

                        {/* Icon */}
                        <div style={{ width:62, height:62, borderRadius:20,
                          background:"rgba(232,96,10,0.11)", border:"1px solid rgba(232,96,10,0.22)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          boxShadow:"0 0 28px rgba(232,96,10,0.18), inset 0 1px 0 rgba(255,160,60,0.08)",
                          marginBottom:16 }}>
                          <Ic size={30} strokeWidth={1.5} color="#e8600a" />
                        </div>

                        {/* Titel */}
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif",
                          fontSize:"22px", color:"#f0ece3",
                          letterSpacing:"0.04em", lineHeight:1.1, marginBottom:6 }}>
                          {f.title}
                        </div>

                        {/* Subtitle */}
                        <div style={{ fontSize:"10px", fontWeight:600,
                          color:"rgba(240,236,227,0.35)", letterSpacing:"0.06em",
                          fontFamily:"'IBM Plex Sans',sans-serif", marginBottom:14 }}>
                          {f.sub}
                        </div>

                        {/* Divider */}
                        <div style={{ width:"80%", height:1, background:"rgba(240,236,227,0.07)", marginBottom:14 }} />

                        {/* Beschreibung */}
                        <div style={{ fontSize:"11.5px", color:"rgba(240,236,227,0.72)",
                          lineHeight:1.65, fontFamily:"'IBM Plex Sans',sans-serif",
                          maxWidth:230 }}>
                          {f.desc}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>

            </IPadFrame>
          </motion.div>
          </div>{/* /perspective-wrapper */}
        </div>{/* /clip-fenster */}

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
function Footer({ onLegal }) {
  return (
    <footer style={{ borderTop:"1px solid rgba(240,236,227,0.08)", padding:"28px 24px",
      display:"flex", justifyContent:"space-between", alignItems:"center",
      flexWrap:"wrap", gap:12 }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"17px",
        color:"rgba(240,236,227,0.4)", letterSpacing:"0.06em" }}>
        BUCHUNGS<span style={{ color:"rgba(232,96,10,0.6)" }}>WERK</span>
      </div>
      <div style={{ fontSize:"11px", color:"rgba(240,236,227,0.25)", display:"flex", gap:20, flexWrap:"wrap" }}>
        <a href="/impressum" style={{ color:"inherit", textDecoration:"none" }} className="lp-nav-link">Impressum</a>
        <a href="/datenschutz" style={{ color:"inherit", textDecoration:"none" }} className="lp-nav-link">Datenschutz</a>
        <span onClick={() => onLegal("kontakt")} style={{ cursor:"pointer" }} className="lp-nav-link">Kontakt</span>
      </div>
      <div style={{ fontSize:"11px", color:"rgba(240,236,227,0.2)" }}>© 2026 Anton Gebert · AGPL-3.0</div>
    </footer>
  );
}

// ── Legal Modal ─────────────────────────────────────────────────────────────────
const LEGAL_CONTENT = {
  impressum: {
    title: "Impressum",
    html: `
<h3>Angaben gemäß § 5 TMG</h3>
<p><strong>Anton Gebert</strong><br/>
[STRASSE UND HAUSNUMMER]<br/>
[PLZ ORT]</p>

<h3>Kontakt</h3>
<p>E-Mail: <a href="mailto:info@buchungswerk.org">info@buchungswerk.org</a></p>

<h3>Berufsbezeichnung und berufsrechtliche Regelungen</h3>
<p>Berufsbezeichnung: Lehrer (verliehen in der Bundesrepublik Deutschland)<br/>
Zuständige Kammer/Behörde: Bayerisches Staatsministerium für Unterricht und Kultus</p>

<h3>EU-Streitschlichtung</h3>
<p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
<a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr/</a>.<br/>
Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>

<h3>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h3>
<p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

<h3>Haftung für Inhalte</h3>
<p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Die auf dieser Plattform bereitgestellten Aufgaben und Inhalte dienen ausschließlich Bildungszwecken und erheben keinen Anspruch auf Vollständigkeit oder Aktualität des Lehrplans.</p>
    `
  },
  datenschutz: {
    title: "Datenschutzerklärung",
    html: `
<h3>1. Datenschutz auf einen Blick</h3>
<p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.</p>

<h3>2. Verantwortliche Stelle</h3>
<p><strong>Anton Gebert</strong><br/>
E-Mail: <a href="mailto:info@buchungswerk.org">info@buchungswerk.org</a></p>

<h3>3. Erhebung und Speicherung personenbezogener Daten</h3>
<p><strong>Registrierung:</strong> Bei der Registrierung werden E-Mail-Adresse, Vorname, Nachname und Schule/Klasse gespeichert. Diese Daten werden ausschließlich zur Bereitstellung des Dienstes verwendet.</p>
<p><strong>Nutzungsdaten:</strong> Quiz-Ergebnisse und Lernfortschritte werden gespeichert, um personalisierte Auswertungen zu ermöglichen.</p>
<p><strong>Server:</strong> Die Anwendung wird auf einem eigenen Server in Deutschland betrieben. Es werden keine Daten an Dritte weitergegeben.</p>

<h3>4. Cookies</h3>
<p>Diese Website verwendet ausschließlich technisch notwendige Cookies (Session-Token für die Anmeldung). Es werden keine Tracking- oder Werbe-Cookies eingesetzt.</p>

<h3>5. Keine Weitergabe an Dritte</h3>
<p>Ihre personenbezogenen Daten werden nicht an Dritte weitergegeben, verkauft oder für Werbezwecke genutzt.</p>

<h3>6. Ihre Rechte (Art. 15–22 DSGVO)</h3>
<p>Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit. Wenden Sie sich dazu an: <a href="mailto:info@buchungswerk.org">info@buchungswerk.org</a></p>

<h3>7. Beschwerderecht</h3>
<p>Sie haben das Recht, sich bei der zuständigen Datenschutzbehörde zu beschweren. In Bayern: Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), Promenade 27, 91522 Ansbach.</p>
    `
  },
  kontakt: {
    title: "Kontakt",
    html: `
<h3>Kontakt aufnehmen</h3>
<p>Bei Fragen, Anregungen oder Feedback zu BuchungsWerk:</p>
<p>
  <strong>E-Mail:</strong> <a href="mailto:info@buchungswerk.org">info@buchungswerk.org</a>
</p>
<p style="margin-top:16px; color:rgba(240,236,227,0.5); font-size:13px;">
  BuchungsWerk ist ein nicht-kommerzielles Bildungsprojekt für bayerische BwR-Lehrkräfte.<br/>
  Quellcode: <a href="https://github.com" target="_blank" rel="noopener noreferrer" style="color:rgba(232,96,10,0.8)">AGPL-3.0 Open Source</a>
</p>
    `
  }
};

function LegalModal({ which, onClose }) {
  const content = LEGAL_CONTENT[which];
  if (!content) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
      backdropFilter:"blur(8px)", zIndex:9000, display:"flex", alignItems:"center",
      justifyContent:"center", padding:"20px" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"rgba(20,14,8,0.97)", border:"1px solid rgba(232,96,10,0.2)",
        borderRadius:16, padding:"32px 36px", maxWidth:680, width:"100%",
        maxHeight:"80vh", overflowY:"auto", position:"relative",
        animation:"lp-modal-in 220ms ease",
        boxShadow:"0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,96,10,0.1)" }}>
        <button onClick={onClose} style={{
          position:"absolute", top:16, right:16, background:"rgba(240,236,227,0.06)",
          border:"1px solid rgba(240,236,227,0.1)", borderRadius:8, width:32, height:32,
          cursor:"pointer", color:"rgba(240,236,227,0.6)", fontSize:18, display:"flex",
          alignItems:"center", justifyContent:"center" }}>×</button>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:"0.05em",
          color:"#f0ece3", marginBottom:24 }}>{content.title}</h2>
        <div style={{ color:"rgba(240,236,227,0.75)", fontSize:14, lineHeight:1.7 }}
          dangerouslySetInnerHTML={{ __html: content.html }} />
        <style>{`
          .legal-body h3{color:#f0ece3;font-size:15px;font-weight:700;margin:20px 0 6px;letter-spacing:.02em}
          .legal-body p{margin-bottom:10px}
          .legal-body a{color:rgba(232,96,10,0.9);text-decoration:none}
          .legal-body a:hover{text-decoration:underline}
        `}</style>
      </div>
    </div>
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
  const [legalModal, setLegalModal] = useState(null);
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
      <Footer onLegal={setLegalModal}/>
      {authModal && (
        <AuthModal mode={authModal} onSwitch={m => setAuthModal(m)}
          onClose={() => setAuthModal(null)}
          onSuccess={user => { setAuthModal(null); onLogin(user); }}/>
      )}
      {legalModal && <LegalModal which={legalModal} onClose={() => setLegalModal(null)}/>}
    </div>
  );
}
