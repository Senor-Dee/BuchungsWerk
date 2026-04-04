// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Anton Gebert <info@buchungswerk.org> - BuchungsWerk

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import BuchungsWerk from "./BuchungsWerk.jsx";
import Landing, { isLoggedIn, getUser, clearAuth, setAuth } from "./Landing.jsx";
import StudentJoin from "./components/StudentJoin.jsx";
import Impressum from "./pages/Impressum.jsx";
import Datenschutz from "./pages/Datenschutz.jsx";
import { InfiniteGrid } from "./components/ui/InfiniteGrid.jsx";

// ── SVG Liquid-Glass-Filter (einmalig, global verfügbar) ──────────────────────
function SvgFilters() {
  return (
    <svg style={{ position:'absolute', width:0, height:0, overflow:'hidden' }} aria-hidden="true">
      <defs>
        <filter id="lg-btn" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.022" numOctaves="2" seed="7" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" result="dist"/>
          <feGaussianBlur in="dist" stdDeviation="0.4" result="soft"/>
          <feComposite in="soft" in2="SourceGraphic" operator="atop"/>
        </filter>
        <filter id="lg-sm" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="3" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        {/* #radio-glass – für LiquidRadio Schieberegler */}
        <filter id="radio-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence"/>
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise"/>
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="30" xChannelSelector="R" yChannelSelector="B" result="displaced"/>
          <feGaussianBlur in="displaced" stdDeviation="2" result="finalBlur"/>
          <feComposite in="finalBlur" in2="finalBlur" operator="over"/>
        </filter>
        {/* #glass-distortion – Specular-Lighting-Glaseffekt (liquid-glass.tsx Referenz) */}
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence"/>
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5"/>
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0"/>
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5"/>
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap"/>
          <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
            <fePointLight x="-200" y="-200" z="300"/>
          </feSpecularLighting>
          <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/>
          <feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>
  );
}
import { apiFetch, API_URL } from "./api.js";
import {
  LogOut, User, Lock, Shield, Trash2, ChevronRight,
  CheckCircle, AlertCircle, X, Eye, EyeOff, Settings,
  Crown, School, Mail, Send, Search, ChevronDown,
  TrendingUp, SlidersHorizontal,
} from "lucide-react";

// ── Shared helpers ─────────────────────────────────────────────────────────────
function getToken() {
  try { return localStorage.getItem("bw_token"); } catch { return null; }
}

async function authFetch(path, method = "GET", body = null) {
  const token = getToken();
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = method === "DELETE" ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((data?.detail) || `HTTP ${res.status}`);
  return data;
}

// ── Profile Modal ─────────────────────────────────────────────────────────────
function ProfileModal({ user, onClose, onUpdated, initialTab = "profil" }) {
  const [tab, setTab] = useState(initialTab); // profil | passwort
  // Profil
  const [vorname, setVorname]   = useState(user?.vorname || "");
  const [nachname, setNachname] = useState(user?.nachname || "");
  const [schule, setSchule]     = useState(user?.schule || "");
  // Passwort
  const [altPw, setAltPw]       = useState("");
  const [neuPw, setNeuPw]       = useState("");
  const [neuPw2, setNeuPw2]     = useState("");
  const [showAlt, setShowAlt]   = useState(false);
  const [showNeu, setShowNeu]   = useState(false);
  // 2FA
  const [totpSetup, setTotpSetup] = useState(null); // {secret, uri}
  const [totpCode,  setTotpCode]  = useState("");
  const [dis2faPw,  setDis2faPw]  = useState("");
  // State
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");

  const reset = () => { setSuccess(""); setError(""); };

  async function saveProfile(e) {
    e.preventDefault(); reset(); setLoading(true);
    try {
      const updated = await authFetch("/auth/profile", "PUT", { vorname, nachname, schule });
      setAuth(getToken(), updated);
      onUpdated(updated);
      setSuccess("Profil gespeichert.");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function setup2fa() {
    reset(); setLoading(true);
    try {
      const result = await authFetch("/auth/totp/setup", "POST");
      setTotpSetup(result);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function enable2fa() {
    reset(); setLoading(true);
    try {
      await authFetch("/auth/totp/enable", "POST", { code: totpCode });
      const updated = await authFetch("/auth/me");
      setAuth(getToken(), updated); onUpdated(updated);
      setTotpSetup(null); setTotpCode("");
      setSuccess("2FA erfolgreich aktiviert.");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function disable2fa() {
    reset(); setLoading(true);
    try {
      await authFetch("/auth/totp/disable", "POST", { passwort: dis2faPw });
      const updated = await authFetch("/auth/me");
      setAuth(getToken(), updated); onUpdated(updated);
      setDis2faPw(""); setSuccess("2FA deaktiviert.");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function savePassword(e) {
    e.preventDefault(); reset();
    if (neuPw.length < 8) { setError("Neues Passwort muss mind. 8 Zeichen haben."); return; }
    if (neuPw !== neuPw2)  { setError("Die neuen Passwörter stimmen nicht überein."); return; }
    setLoading(true);
    try {
      await authFetch("/auth/password", "PUT", { altes_passwort: altPw, neues_passwort: neuPw });
      setSuccess("Passwort geändert.");
      setAltPw(""); setNeuPw(""); setNeuPw2("");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px", boxSizing: "border-box",
    background: "rgba(240,236,227,0.05)", border: "1px solid rgba(240,236,227,0.15)",
    borderRadius: "8px", color: "#f0ece3", fontSize: "13px",
    fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
  };
  const labelStyle = { fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.45)",
    textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "5px", display: "block" };

  const tabBtn = (key, label) => (
    <button onClick={() => { setTab(key); reset(); }} style={{
      flex: 1, padding: "8px", background: tab === key ? "rgba(232,96,10,0.15)" : "none",
      border: "none", borderBottom: `2px solid ${tab === key ? "#e8600a" : "transparent"}`,
      color: tab === key ? "#e8600a" : "rgba(240,236,227,0.4)",
      cursor: "pointer", fontSize: "13px", fontWeight: 700,
      fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 150ms",
    }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(18,12,5,0.98)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(240,236,227,0.12)", borderTop: "2px solid #e8600a",
        borderRadius: "14px", width: "100%", maxWidth: "420px", padding: "0",
        animation: "lp-modal-in 0.18s ease",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: "1px solid rgba(240,236,227,0.08)" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg,#f07320,#c24f08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: 900, color: "#fff" }}>
            {(user?.vorname?.[0] || "?").toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "#f0ece3", fontSize: "14px",
              fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {user?.vorname} {user?.nachname}
            </div>
            <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.35)" }}>{user?.email}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none",
            color: "rgba(240,236,227,0.3)", cursor: "pointer", padding: 4 }}>
            <X size={16} strokeWidth={2}/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(240,236,227,0.08)" }}>
          {tabBtn("profil", "Profil")}
          {tabBtn("passwort", "Passwort")}
          {tabBtn("sicherheit", "Sicherheit")}
        </div>

        <div style={{ padding: "20px" }}>
          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
              color: "#4ade80", fontSize: "13px", background: "rgba(74,222,128,0.08)",
              border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, padding: "9px 12px" }}>
              <CheckCircle size={14} strokeWidth={2}/>{success}
            </div>
          )}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
              color: "#f87171", fontSize: "13px", background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "9px 12px" }}>
              <AlertCircle size={14} strokeWidth={2}/>{error}
            </div>
          )}

          {tab === "profil" && (
            <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Vorname *</label>
                <input value={vorname} onChange={e => setVorname(e.target.value)} required style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Nachname</label>
                <input value={nachname} onChange={e => setNachname(e.target.value)} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Schule</label>
                <input value={schule} onChange={e => setSchule(e.target.value)}
                  placeholder="z.B. Staatliche Realschule München" style={inputStyle}/>
              </div>
              <button type="submit" disabled={loading} style={{
                background: loading ? "rgba(232,96,10,0.4)" : "#e8600a",
                color: "#fff", border: "none", borderRadius: "9px",
                padding: "10px", fontWeight: 800, fontSize: "13px",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif", marginTop: 4,
              }}>{loading ? "Wird gespeichert…" : "Speichern"}</button>
            </form>
          )}

          {tab === "passwort" && (
            <form onSubmit={savePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Aktuelles Passwort</label>
                <div style={{ position: "relative" }}>
                  <input type={showAlt ? "text" : "password"} value={altPw}
                    onChange={e => setAltPw(e.target.value)} required style={{ ...inputStyle, paddingRight: 38 }}/>
                  <button type="button" onClick={() => setShowAlt(v => !v)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", color: "rgba(240,236,227,0.35)", cursor: "pointer", padding: 0 }}>
                    {showAlt ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Neues Passwort</label>
                <div style={{ position: "relative" }}>
                  <input type={showNeu ? "text" : "password"} value={neuPw}
                    onChange={e => setNeuPw(e.target.value)} required style={{ ...inputStyle, paddingRight: 38 }}
                    placeholder="Mindestens 8 Zeichen"/>
                  <button type="button" onClick={() => setShowNeu(v => !v)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", color: "rgba(240,236,227,0.35)", cursor: "pointer", padding: 0 }}>
                    {showNeu ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Neues Passwort bestätigen</label>
                <input type="password" value={neuPw2}
                  onChange={e => setNeuPw2(e.target.value)} required style={inputStyle}/>
              </div>
              <button type="submit" disabled={loading} style={{
                background: loading ? "rgba(232,96,10,0.4)" : "#e8600a",
                color: "#fff", border: "none", borderRadius: "9px",
                padding: "10px", fontWeight: 800, fontSize: "13px",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif", marginTop: 4,
              }}>{loading ? "Wird geändert…" : "Passwort ändern"}</button>
            </form>
          )}

          {tab === "sicherheit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#f0ece3", marginBottom: 2 }}>
                2-Faktor-Authentifizierung
              </div>
              <div style={{ fontSize: "12px", color: "rgba(240,236,227,0.45)", lineHeight: 1.6, marginBottom: 4 }}>
                Schütze deinen Account mit einem Einmalcode aus einer Authenticator-App (z.B. Google Authenticator, Authy, 1Password).
              </div>

              {user?.totp_enabled ? (
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
                    background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)",
                    borderRadius:9, marginBottom:14 }}>
                    <Shield size={14} strokeWidth={2} color="#4ade80"/>
                    <span style={{ fontSize:13, color:"#4ade80", fontWeight:700 }}>2FA ist aktiv</span>
                  </div>
                  <label style={labelStyle}>Passwort zur Bestätigung</label>
                  <input type="password" value={dis2faPw} onChange={e => setDis2faPw(e.target.value)}
                    placeholder="Aktuelles Passwort" style={{ ...inputStyle, marginBottom:10 }}/>
                  <button onClick={disable2fa} disabled={loading} style={{
                    background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.3)",
                    color:"#f87171", borderRadius:8, padding:"9px 14px", fontWeight:700, fontSize:13,
                    cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", width:"100%" }}>
                    {loading ? "Wird deaktiviert…" : "2FA deaktivieren"}
                  </button>
                </div>
              ) : totpSetup ? (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ fontSize:12, color:"rgba(240,236,227,0.5)", lineHeight:1.6 }}>
                    Gib diesen <strong style={{ color:"#f0ece3" }}>Secret Key</strong> in deine Authenticator-App ein:
                  </div>
                  <div style={{ background:"rgba(232,96,10,0.08)", border:"1.5px solid rgba(232,96,10,0.3)",
                    borderRadius:9, padding:"12px 14px", fontFamily:"'IBM Plex Mono',monospace",
                    fontSize:13, color:"#e8600a", letterSpacing:".1em", wordBreak:"break-all",
                    textAlign:"center", userSelect:"all" }}>
                    {totpSetup.secret}
                  </div>
                  <a href={totpSetup.uri}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                      fontSize:12, color:"rgba(240,236,227,0.5)", textDecoration:"none",
                      padding:"7px 12px", border:"1px solid rgba(240,236,227,0.12)", borderRadius:7 }}>
                    <Shield size={12} strokeWidth={2}/>Auf Mobilgerät in App öffnen
                  </a>
                  <div>
                    <label style={labelStyle}>Code aus der App zur Bestätigung</label>
                    <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)}
                      style={{ ...inputStyle, letterSpacing:".2em", fontSize:16, textAlign:"center" }}
                      placeholder="000000" maxLength={6} inputMode="numeric"/>
                  </div>
                  <button onClick={enable2fa} disabled={loading || totpCode.length < 6} style={{
                    background: loading ? "rgba(232,96,10,0.4)" : "#e8600a",
                    color:"#fff", border:"none", borderRadius:9, padding:"10px",
                    fontWeight:800, fontSize:13, cursor:"pointer",
                    fontFamily:"'IBM Plex Sans',sans-serif" }}>
                    {loading ? "Wird aktiviert…" : "2FA aktivieren"}
                  </button>
                </div>
              ) : (
                <button onClick={setup2fa} disabled={loading} style={{
                  background:"rgba(232,96,10,0.10)", border:"1.5px solid rgba(232,96,10,0.3)",
                  color:"#e8600a", borderRadius:9, padding:"11px 16px", fontWeight:700, fontSize:13,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                  fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  <Shield size={15} strokeWidth={2}/>
                  2FA einrichten
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel ────────────────────────────────────────────────────────────────
function StatChip({ label, value, color }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      padding:"3px 9px", background:"rgba(240,236,227,0.04)", borderRadius:8,
      border:"1px solid rgba(240,236,227,0.07)", minWidth:44 }}>
      <span style={{ fontSize:15, fontWeight:900, color, fontFamily:"'Fira Code',monospace", lineHeight:1.25 }}>
        {value ?? "—"}
      </span>
      <span style={{ fontSize:9, color:"rgba(240,236,227,0.28)", fontFamily:"'IBM Plex Sans',sans-serif",
        textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</span>
    </div>
  );
}

const LIZENZ_CFG = {
  free:   { label:"Free",   bg:"rgba(240,236,227,0.07)", color:"rgba(240,236,227,0.42)", border:"rgba(240,236,227,0.1)" },
  pro:    { label:"Pro",    bg:"rgba(232,96,10,0.13)",   color:"#e8600a",               border:"rgba(232,96,10,0.32)"  },
  schule: { label:"Schule", bg:"rgba(59,130,246,0.10)",  color:"rgba(147,197,253,0.85)", border:"rgba(59,130,246,0.26)"},
};

function LizenzBadge({ typ }) {
  const s = LIZENZ_CFG[typ] || LIZENZ_CFG.free;
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, flexShrink:0,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
      fontFamily:"'Fira Code',monospace", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
      {s.label}
    </span>
  );
}

function AdminPanel({ onClose }) {
  const [users,     setUsers]     = useState([]);
  const [stats,     setStats]     = useState(null);
  const [smtpOk,    setSmtpOk]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [filterLiz, setFilterLiz] = useState("alle");
  const [sortBy,    setSortBy]    = useState("erstellt_desc");
  const [expanded,  setExpanded]  = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [toggling,  setToggling]  = useState(null);
  // Lizenz-Edit für aufgeklappten User
  const [editLiz,   setEditLiz]   = useState("free");
  const [editBis,   setEditBis]   = useState("");
  const [editNotiz, setEditNotiz] = useState("");
  const [savingLiz, setSavingLiz] = useState(false);
  const [lizMsg,    setLizMsg]    = useState("");
  // E-Mail-Composer
  const [emailFor,  setEmailFor]  = useState(null);
  const [eBtrf,     setEBtrf]     = useState("");
  const [eMsg,      setEMsg]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [sendRes,   setSendRes]   = useState("");

  useEffect(() => {
    Promise.all([
      authFetch("/admin/users"),
      authFetch("/admin/stats").catch(() => null),
      authFetch("/admin/smtp/status").catch(() => null),
    ]).then(([u, s, smtp]) => {
      setUsers(u || []);
      setStats(s);
      setSmtpOk(smtp?.configured || false);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  function expand(u) {
    if (expanded === u.id) { setExpanded(null); return; }
    setExpanded(u.id);
    setEditLiz(u.lizenz_typ || "free");
    setEditBis(u.lizenz_bis || "");
    setEditNotiz(u.notiz || "");
    setLizMsg("");
  }

  const displayed = users
    .filter(u => {
      if (filterLiz !== "alle" && (u.lizenz_typ || "free") !== filterLiz) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return [u.vorname, u.nachname, u.email, u.schule].join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name_asc":     return (a.vorname+a.nachname).localeCompare(b.vorname+b.nachname);
        case "name_desc":    return (b.vorname+b.nachname).localeCompare(a.vorname+a.nachname);
        case "erstellt_asc": return (a.erstellt||"").localeCompare(b.erstellt||"");
        case "schule":       return (a.schule||"").localeCompare(b.schule||"");
        case "lizenz":       return (a.lizenz_typ||"").localeCompare(b.lizenz_typ||"");
        case "login":        return (b.letzter_login||"").localeCompare(a.letzter_login||"");
        default:             return (b.erstellt||"").localeCompare(a.erstellt||"");
      }
    });

  async function saveLizenz(u) {
    setSavingLiz(true); setLizMsg("");
    try {
      const res = await authFetch(`/admin/users/${u.id}/lizenz`, "PATCH",
        { lizenz_typ: editLiz, lizenz_bis: editBis || null, notiz: editNotiz });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...res } : x));
      setLizMsg("ok");
      setTimeout(() => setLizMsg(""), 2500);
    } catch (e) { setLizMsg("error:" + e.message); }
    finally { setSavingLiz(false); }
  }

  async function deleteUser(u) {
    if (!window.confirm(`${u.vorname} ${u.nachname} (${u.email}) wirklich löschen?`)) return;
    setDeleting(u.id);
    try {
      await authFetch(`/admin/users/${u.id}`, "DELETE");
      setUsers(prev => prev.filter(x => x.id !== u.id));
      if (expanded === u.id) setExpanded(null);
    } catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  }

  async function toggleAdmin(u) {
    setToggling(u.id);
    try {
      const res = await authFetch(`/admin/users/${u.id}/admin`, "PATCH");
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_admin: res.is_admin } : x));
    } catch (e) { alert(e.message); }
    finally { setToggling(null); }
  }

  async function sendEmail() {
    if (!emailFor || !eBtrf.trim() || !eMsg.trim()) return;
    setSending(true); setSendRes("");
    try {
      await authFetch(`/admin/users/${emailFor.id}/email`, "POST",
        { betreff: eBtrf, nachricht: eMsg });
      setSendRes("ok");
      setTimeout(() => { setEmailFor(null); setEBtrf(""); setEMsg(""); setSendRes(""); }, 2200);
    } catch (e) { setSendRes("error:" + e.message); }
    finally { setSending(false); }
  }

  // ── Shared micro-styles ──────────────────────────────────────────────────────
  const inp = {
    width:"100%", padding:"8px 10px", boxSizing:"border-box",
    background:"rgba(240,236,227,0.05)", border:"1px solid rgba(240,236,227,0.12)",
    borderRadius:7, color:"#f0ece3", fontSize:12,
    fontFamily:"'IBM Plex Sans',sans-serif", outline:"none",
  };
  const sel = { ...inp, cursor:"pointer", WebkitAppearance:"none", appearance:"none" };
  const secLbl = {
    fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.28)",
    textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5,
  };
  const ctaB = {
    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
    background:"#e8600a", color:"#fff", border:"none", borderRadius:8,
    padding:"8px 14px", fontSize:12, fontWeight:800, cursor:"pointer",
    fontFamily:"'IBM Plex Sans',sans-serif",
  };
  const ghostB = {
    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
    background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.55)",
    border:"1px solid rgba(240,236,227,0.12)", borderRadius:8,
    padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer",
    fontFamily:"'IBM Plex Sans',sans-serif",
  };
  const actB = {
    display:"flex", alignItems:"center", gap:7,
    background:"rgba(240,236,227,0.04)", color:"rgba(240,236,227,0.6)",
    border:"1px solid rgba(240,236,227,0.1)", borderRadius:7,
    padding:"7px 10px", fontSize:12, fontWeight:700, cursor:"pointer",
    fontFamily:"'IBM Plex Sans',sans-serif", width:"100%",
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      {/* ── E-Mail-Composer Sub-Modal ── */}
      {emailFor && (
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.65)", zIndex:10,
          display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e => e.target === e.currentTarget && setEmailFor(null)}>
          <div style={{ background:"rgba(18,12,5,0.99)", border:"1px solid rgba(240,236,227,0.14)",
            borderTop:"2px solid #e8600a", borderRadius:14, width:"100%", maxWidth:460,
            boxShadow:"0 24px 64px rgba(0,0,0,0.8)", overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(240,236,227,0.08)",
              display:"flex", alignItems:"center", gap:10 }}>
              <Mail size={15} style={{ color:"#e8600a", flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:13, color:"#f0ece3",
                  fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  E-Mail an {emailFor.vorname} {emailFor.nachname}
                </div>
                <div style={{ fontSize:11, color:"rgba(240,236,227,0.3)" }}>{emailFor.email}</div>
              </div>
              <button onClick={() => setEmailFor(null)} style={{ background:"none", border:"none",
                color:"rgba(240,236,227,0.3)", cursor:"pointer", padding:4 }}><X size={14}/></button>
            </div>
            <div style={{ padding:18, display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <div style={secLbl}>Betreff</div>
                <input value={eBtrf} onChange={e => setEBtrf(e.target.value)}
                  placeholder="E-Mail-Betreff" style={inp}/>
              </div>
              <div>
                <div style={secLbl}>Nachricht</div>
                <textarea value={eMsg} onChange={e => setEMsg(e.target.value)}
                  rows={7} placeholder="Nachrichtentext…" style={{ ...inp, resize:"vertical" }}/>
              </div>
              {sendRes === "ok" && (
                <div style={{ display:"flex", alignItems:"center", gap:7, color:"#4ade80",
                  fontSize:12, fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  <CheckCircle size={13}/>E-Mail erfolgreich gesendet.
                </div>
              )}
              {sendRes.startsWith("error:") && (
                <div style={{ display:"flex", alignItems:"center", gap:7, color:"#f87171",
                  fontSize:12, fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  <AlertCircle size={13}/>{sendRes.slice(6)}
                </div>
              )}
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button onClick={() => setEmailFor(null)} style={ghostB}>Abbrechen</button>
                <button onClick={sendEmail}
                  disabled={sending || !eBtrf.trim() || !eMsg.trim()}
                  style={{ ...ctaB, opacity: sending || !eBtrf.trim() || !eMsg.trim() ? 0.5 : 1 }}>
                  <Send size={13}/>{sending ? "Senden…" : "Senden"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hauptpanel ── */}
      <div style={{ background:"rgba(18,12,5,0.98)", backdropFilter:"blur(24px)",
        border:"1px solid rgba(240,236,227,0.12)", borderTop:"2px solid #e8600a",
        borderRadius:14, width:"100%", maxWidth:880, maxHeight:"90vh",
        display:"flex", flexDirection:"column",
        animation:"lp-modal-in 0.18s ease",
        boxShadow:"0 24px 64px rgba(0,0,0,0.65)" }}>

        {/* Header */}
        <div style={{ padding:"13px 18px", display:"flex", alignItems:"center", gap:12,
          borderBottom:"1px solid rgba(240,236,227,0.08)", flexShrink:0, flexWrap:"wrap", rowGap:8 }}>
          <Crown size={17} style={{ color:"#e8600a", flexShrink:0 }}/>
          <span style={{ fontWeight:800, color:"#f0ece3", fontSize:15, flex:1,
            fontFamily:"'IBM Plex Sans',sans-serif", whiteSpace:"nowrap" }}>
            Admin-Panel · Benutzerverwaltung
          </span>
          {stats && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              <StatChip label="Gesamt"   value={stats.total}      color="rgba(240,236,227,0.7)"/>
              <StatChip label="30T aktiv" value={stats.active_30d} color="#4ade80"/>
              <StatChip label="Free"     value={stats.free}       color="rgba(240,236,227,0.38)"/>
              <StatChip label="Pro"      value={stats.pro}        color="#e8600a"/>
              <StatChip label="Schule"   value={stats.schule}     color="rgba(147,197,253,0.8)"/>
            </div>
          )}
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:"rgba(240,236,227,0.3)", cursor:"pointer", padding:4, flexShrink:0, marginLeft:4 }}>
            <X size={16}/>
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ padding:"9px 14px", display:"flex", gap:7, flexShrink:0, flexWrap:"wrap",
          borderBottom:"1px solid rgba(240,236,227,0.06)", alignItems:"center" }}>
          <div style={{ flex:1, minWidth:150, position:"relative" }}>
            <Search size={12} style={{ position:"absolute", left:9, top:"50%",
              transform:"translateY(-50%)", color:"rgba(240,236,227,0.28)", pointerEvents:"none" }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, E-Mail oder Schule…"
              style={{ ...inp, paddingLeft:27, fontSize:12 }}/>
          </div>
          <select value={filterLiz} onChange={e => setFilterLiz(e.target.value)}
            style={{ ...sel, width:"auto", minWidth:130 }}>
            <option value="alle">Alle Lizenzen</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="schule">Schule</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ ...sel, width:"auto", minWidth:155 }}>
            <option value="erstellt_desc">Neueste zuerst</option>
            <option value="erstellt_asc">Älteste zuerst</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="schule">Schule A–Z</option>
            <option value="lizenz">Lizenztyp</option>
            <option value="login">Letzter Login</option>
          </select>
          <span style={{ fontSize:11, color:"rgba(240,236,227,0.2)",
            fontFamily:"'Fira Code',monospace", whiteSpace:"nowrap" }}>
            {displayed.length}/{users.length}
          </span>
        </div>

        {/* Liste */}
        <div style={{ overflowY:"auto", flex:1, padding:"6px 8px" }}>
          {loading && (
            <div style={{ padding:28, textAlign:"center", color:"rgba(240,236,227,0.3)",
              fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>Lade…</div>
          )}
          {error && (
            <div style={{ padding:14, color:"#f87171", fontSize:13,
              fontFamily:"'IBM Plex Sans',sans-serif" }}>Fehler: {error}</div>
          )}

          {!loading && displayed.map(u => {
            const isExp = expanded === u.id;
            return (
              <div key={u.id} style={{ marginBottom:3 }}>
                {/* Zeile */}
                <div onClick={() => expand(u)} style={{
                  display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                  borderRadius: isExp ? "9px 9px 0 0" : 9,
                  border:`1px solid ${isExp ? "rgba(232,96,10,0.32)" : "rgba(240,236,227,0.07)"}`,
                  background: isExp ? "rgba(232,96,10,0.05)"
                    : u.is_admin ? "rgba(232,96,10,0.04)" : "rgba(240,236,227,0.02)",
                  cursor:"pointer", transition:"all 140ms" }}>

                  <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
                    background: u.is_admin
                      ? "linear-gradient(135deg,#f07320,#c24f08)"
                      : "rgba(240,236,227,0.1)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:900,
                    color: u.is_admin ? "#fff" : "rgba(240,236,227,0.6)" }}>
                    {(u.vorname?.[0] || "?").toUpperCase()}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#f0ece3",
                      fontFamily:"'IBM Plex Sans',sans-serif",
                      display:"flex", alignItems:"center", gap:6 }}>
                      {u.vorname} {u.nachname}
                      {u.is_admin && <Crown size={11} strokeWidth={2} style={{ color:"#e8600a" }}/>}
                    </div>
                    <div style={{ fontSize:11, color:"rgba(240,236,227,0.3)", overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {u.email}{u.schule ? ` · ${u.schule}` : ""}
                    </div>
                  </div>

                  <LizenzBadge typ={u.lizenz_typ || "free"}/>

                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:10, color:"rgba(240,236,227,0.2)",
                      fontFamily:"'Fira Code',monospace" }}>
                      +{u.erstellt?.slice(0,10)}
                    </div>
                    {u.letzter_login && (
                      <div style={{ fontSize:10, color:"rgba(74,222,128,0.45)",
                        fontFamily:"'Fira Code',monospace" }}>
                        ↩{u.letzter_login.slice(0,10)}
                      </div>
                    )}
                  </div>

                  <ChevronDown size={13} style={{ color:"rgba(240,236,227,0.22)", flexShrink:0,
                    transform: isExp ? "rotate(180deg)" : "none", transition:"transform 200ms" }}/>
                </div>

                {/* Ausgeklapptes Detail */}
                {isExp && (
                  <div style={{ border:"1px solid rgba(232,96,10,0.25)", borderTop:"none",
                    borderRadius:"0 0 9px 9px", padding:"16px",
                    background:"rgba(10,6,2,0.7)" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>

                      {/* Links: Lizenz-Editor */}
                      <div>
                        <div style={secLbl}>Lizenztyp</div>
                        <div style={{ display:"flex", gap:5, marginBottom:10 }}>
                          {["free","pro","schule"].map(t => {
                            const s = LIZENZ_CFG[t];
                            const active = editLiz === t;
                            return (
                              <button key={t} onClick={() => setEditLiz(t)} style={{
                                flex:1, padding:"5px 0", borderRadius:7, fontSize:11,
                                fontWeight:700, cursor:"pointer",
                                fontFamily:"'Fira Code',monospace",
                                background: active ? s.bg : "rgba(240,236,227,0.03)",
                                border:`1px solid ${active ? s.border : "rgba(240,236,227,0.07)"}`,
                                color: active ? s.color : "rgba(240,236,227,0.26)",
                                transition:"all 120ms",
                              }}>{s.label}</button>
                            );
                          })}
                        </div>

                        <div style={secLbl}>Gültig bis</div>
                        <input type="date" value={editBis} onChange={e => setEditBis(e.target.value)}
                          style={{ ...inp, marginBottom:10, colorScheme:"dark" }}/>

                        <div style={secLbl}>Admin-Notiz</div>
                        <textarea value={editNotiz} onChange={e => setEditNotiz(e.target.value)}
                          rows={3} placeholder="Interne Notiz (nur für Admins sichtbar)…"
                          style={{ ...inp, resize:"vertical", marginBottom:10 }}/>

                        <button onClick={() => saveLizenz(u)} disabled={savingLiz}
                          style={{ ...ctaB, width:"100%", opacity: savingLiz ? 0.5 : 1 }}>
                          {savingLiz ? "Speichere…" : "Lizenz speichern"}
                        </button>
                        {lizMsg === "ok" && (
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8,
                            color:"#4ade80", fontSize:11, fontFamily:"'IBM Plex Sans',sans-serif" }}>
                            <CheckCircle size={12}/>Gespeichert.
                          </div>
                        )}
                        {lizMsg.startsWith("error:") && (
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8,
                            color:"#f87171", fontSize:11, fontFamily:"'IBM Plex Sans',sans-serif" }}>
                            <AlertCircle size={12}/>{lizMsg.slice(6)}
                          </div>
                        )}
                      </div>

                      {/* Rechts: Benutzerdetails + Aktionen */}
                      <div>
                        <div style={secLbl}>Benutzerdetails</div>
                        <div style={{ fontSize:11, fontFamily:"'IBM Plex Sans',sans-serif",
                          display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
                          {[
                            ["ID",           `#${u.id}`],
                            ["E-Mail",        u.email],
                            ["Schule",        u.schule || "—"],
                            ["Registriert",   u.erstellt?.slice(0,16).replace("T"," ")],
                            ["Letzter Login", u.letzter_login
                              ? u.letzter_login.slice(0,16).replace("T"," ")
                              : null],
                            u.lizenz_bis ? ["Lizenz bis", u.lizenz_bis] : null,
                          ].filter(Boolean).map(([k, v]) => (
                            <div key={k} style={{ display:"flex", gap:6, lineHeight:1.4 }}>
                              <span style={{ color:"rgba(240,236,227,0.25)", minWidth:95, flexShrink:0 }}>{k}:</span>
                              <span style={{
                                color: k === "Letzter Login" && !v ? "rgba(240,236,227,0.22)"
                                  : k === "Letzter Login" ? "#4ade80"
                                  : k === "Lizenz bis" && v && new Date(v) < new Date() ? "#f87171"
                                  : "#f0ece3",
                              }}>{v || "Noch nie"}</span>
                            </div>
                          ))}
                          {u.notiz && (
                            <div style={{ marginTop:4, padding:"6px 8px",
                              background:"rgba(240,236,227,0.04)", borderRadius:5,
                              border:"1px solid rgba(240,236,227,0.07)",
                              color:"rgba(240,236,227,0.5)", whiteSpace:"pre-wrap",
                              fontSize:11, lineHeight:1.5 }}>
                              {u.notiz}
                            </div>
                          )}
                        </div>

                        <div style={secLbl}>Aktionen</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          <button onClick={() => {
                            setEmailFor(u); setEBtrf(""); setEMsg(""); setSendRes("");
                          }} style={actB}>
                            <Mail size={13}/> E-Mail senden
                            {!smtpOk && (
                              <span style={{ marginLeft:"auto", fontSize:10,
                                color:"rgba(240,236,227,0.2)" }}>SMTP n. konfig.</span>
                            )}
                          </button>
                          <button onClick={() => toggleAdmin(u)} disabled={toggling === u.id}
                            style={{ ...actB,
                              color: u.is_admin ? "#e8600a" : "rgba(240,236,227,0.6)",
                              borderColor: u.is_admin
                                ? "rgba(232,96,10,0.3)" : "rgba(240,236,227,0.1)" }}>
                            <Crown size={13}/>
                            {toggling === u.id ? "…"
                              : u.is_admin ? "Admin-Rechte entziehen" : "Zum Admin machen"}
                          </button>
                          <button onClick={() => deleteUser(u)} disabled={deleting === u.id}
                            style={{ ...actB,
                              color:"rgba(248,113,113,0.7)",
                              borderColor:"rgba(248,113,113,0.18)" }}>
                            <Trash2 size={13}/>
                            {deleting === u.id ? "Löschen…" : "Benutzer löschen"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!loading && displayed.length === 0 && !error && (
            <div style={{ padding:28, textAlign:"center", color:"rgba(240,236,227,0.2)",
              fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>
              Keine Benutzer gefunden.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"9px 18px", borderTop:"1px solid rgba(240,236,227,0.06)",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          fontSize:11, color:"rgba(240,236,227,0.2)", flexShrink:0,
          fontFamily:"'IBM Plex Sans',sans-serif" }}>
          <span>Zeile anklicken → Details & Lizenz bearbeiten</span>
          <span style={{ color: smtpOk ? "rgba(74,222,128,0.5)" : "rgba(240,236,227,0.18)" }}>
            SMTP: {smtpOk ? "konfiguriert ✓" : "nicht konfiguriert"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── User Badge ────────────────────────────────────────────────────────────────
function UserBadge({ user, onLogout, onUserUpdate }) {
  const [open, setOpen]               = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab]   = useState("profil");
  const [showAdmin, setShowAdmin]     = useState(false);
  const dropRef                       = useRef(null);
  const name = [user?.vorname, user?.nachname ? user.nachname[0] + "." : ""].filter(Boolean).join(" ");

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const menuItem = (icon, label, onClick, danger) => (
    <button onClick={() => { setOpen(false); onClick(); }} style={{
      width: "100%", padding: "8px 12px",
      background: "none", border: "none", cursor: "pointer", borderRadius: "8px",
      textAlign: "left", fontSize: "13px", fontWeight: 600,
      color: danger ? "rgba(248,113,113,0.8)" : "rgba(240,236,227,0.65)",
      fontFamily: "'IBM Plex Sans', sans-serif",
      display: "flex", alignItems: "center", gap: "9px",
      transition: "background 120ms ease, color 120ms ease",
    }}
    onMouseEnter={e => { e.currentTarget.style.background = danger ? "rgba(248,113,113,0.08)" : "rgba(240,236,227,0.08)"; e.currentTarget.style.color = danger ? "#f87171" : "#f0ece3"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = danger ? "rgba(248,113,113,0.8)" : "rgba(240,236,227,0.65)"; }}>
      {icon}{label}
    </button>
  );

  return (
    <>
      <div ref={dropRef} style={{ position: "fixed", top: 0, right: "16px", zIndex: 500,
        height: "62px", display: "flex", alignItems: "center", gap: "8px" }}>

        <button onClick={() => setOpen(v => !v)} style={{
          display: "flex", alignItems: "center", gap: "7px",
          padding: "5px 10px 5px 8px",
          background: open ? "rgba(240,236,227,0.1)" : "rgba(240,236,227,0.06)",
          border: "1px solid rgba(240,236,227,0.15)",
          borderRadius: "20px", cursor: "pointer",
          fontFamily: "'IBM Plex Sans', sans-serif",
          transition: "background 150ms ease",
        }}>
          <div style={{
            width: "22px", height: "22px", borderRadius: "50%",
            background: "linear-gradient(135deg, #f07320, #c24f08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "10px", fontWeight: 800, color: "#fff", flexShrink: 0,
          }}>
            {(user?.vorname?.[0] || "?").toUpperCase()}
          </div>
          {name && (
            <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(240,236,227,0.65)", whiteSpace: "nowrap" }}>
              {name}
            </span>
          )}
        </button>

        {open && (
          <>
          <style>{`
            @keyframes bw-dropdown {
              from { opacity:0; transform:translateY(-8px) scale(0.96); }
              to   { opacity:1; transform:translateY(0) scale(1); }
            }
          `}</style>
          <div style={{
            position: "absolute", top: "54px", right: 0,
            background: "rgba(12,8,2,0.98)",
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(240,236,227,0.12)",
            borderTop: "2px solid #e8600a",
            borderRadius: "14px", padding: "8px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(232,96,10,0.06)",
            minWidth: "210px",
            animation: "bw-dropdown 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
          }}>
            {/* User info */}
            <div style={{ padding: "6px 12px 10px", borderBottom: "1px solid rgba(240,236,227,0.08)", marginBottom: "6px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#f0ece3",
                fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {user?.vorname} {user?.nachname}
                {user?.is_admin && <Crown size={11} strokeWidth={2} style={{ color: "#e8600a", marginLeft: 5, verticalAlign: "middle" }}/>}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.3)", marginTop: 1 }}>{user?.email}</div>
              {user?.schule && (
                <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.25)", marginTop: 1,
                  display: "flex", alignItems: "center", gap: 4 }}>
                  <School size={10} strokeWidth={2}/>{user.schule}
                </div>
              )}
            </div>

            {menuItem(<TrendingUp size={14} strokeWidth={1.5}/>, "Fortschritt", () => window.dispatchEvent(new CustomEvent("bw:mastery")))}
            {menuItem(<SlidersHorizontal size={14} strokeWidth={1.5}/>, "Einstellungen", () => window.dispatchEvent(new CustomEvent("bw:settings")))}

            <div style={{ borderTop: "1px solid rgba(240,236,227,0.07)", marginTop: "6px", paddingTop: "6px" }}/>
            {menuItem(<Settings size={14} strokeWidth={1.5}/>, "Profil bearbeiten", () => { setProfileTab("profil"); setShowProfile(true); })}
            {menuItem(<Lock size={14} strokeWidth={1.5}/>, "Passwort ändern", () => { setProfileTab("passwort"); setShowProfile(true); })}
            {user?.is_admin && menuItem(<Crown size={14} strokeWidth={1.5}/>, "Registrierungen (Admin)", () => setShowAdmin(true))}

            <div style={{ borderTop: "1px solid rgba(240,236,227,0.07)", marginTop: "6px", paddingTop: "6px" }}/>
            {menuItem(<LogOut size={14} strokeWidth={1.5}/>, "Abmelden", onLogout, true)}
          </div>
          </>
        )}
      </div>

      {showProfile && (
        <ProfileModal
          user={user}
          initialTab={profileTab}
          onClose={() => setShowProfile(false)}
          onUpdated={updated => { onUserUpdate(updated); setShowProfile(false); }}
        />
      )}
      {showAdmin && user?.is_admin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}
    </>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);
  const [user,     setUser]     = useState(getUser);
  // Schüler-Gastzugang: beim ersten Render prüfen ob ?session vorhanden ist.
  // Wert einmalig einfrieren – SimulationModus löscht den Param aus der URL later.
  const [gastSession] = useState(() =>
    Boolean(new URLSearchParams(window.location.search).get("session"))
  );
  // Live-Quiz Schüler-Beitritt: ?join=CODE öffnet direkt den StudentJoin-Screen
  const [joinCode] = useState(() =>
    new URLSearchParams(window.location.search).get("join") || ""
  );

  const handleLogin = u => { setUser(u); setLoggedIn(true); };
  const handleLogout = () => { clearAuth(); setUser(null); setLoggedIn(false); };
  const handleUserUpdate = u => { setUser(u); };

  // Statische Seiten: /impressum und /datenschutz (kein Login nötig)
  const path = window.location.pathname;
  if (path === "/impressum") return <Impressum />;
  if (path === "/datenschutz") return <Datenschutz />;

  // Schüler tritt einem Live-Quiz bei – kein Login nötig
  if (joinCode) return <StudentJoin initialCode={joinCode.toUpperCase()} />;

  // Kein Login erforderlich wenn Schüler über einen Session-Link kommt
  if (!loggedIn && !gastSession) return <Landing onLogin={handleLogin} />;

  return (
    <>
      <SvgFilters />
      <InfiniteGrid />
      {loggedIn && <UserBadge user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />}
      <BuchungsWerk gastModus={gastSession} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
