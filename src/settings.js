import React from "react";
import { userKey } from "./api.js";

// ══════════════════════════════════════════════════════════════════════════════
// EINSTELLUNGEN – global, in localStorage gespeichert
// ══════════════════════════════════════════════════════════════════════════════
export const DEFAULT_SETTINGS = {
  // Profil
  lehrerVorname:  "",
  lehrerNachname: "",
  stammschule:    "",
  // Aufgaben
  sofortrabatte:           true,
  anschaffungsnebenkosten: true,
  einfacheBetraege:        false,
  // Anzeige
  kontennummernAnzeigen: true,
  anredeKlasse10:        true,    // Klasse 10 → Sie-Anrede
  belegModus:            "beleg", // "beleg" | "text"
  loesungenStandardAn:   false,
  // Lösungen
  loesungsfarbe: "#16a34a",       // Grün
  // Export
  exportFormat: "word",           // "word" | "pdf"
};

// ── Streak-System ──────────────────────────────────────────────────────────────
export function ladeStreak() {
  try {
    const raw = localStorage.getItem(userKey("bw_streak"));
    if (!raw) return { count: 0, lastDate: null, longest: 0 };
    return JSON.parse(raw);
  } catch { return { count: 0, lastDate: null, longest: 0 }; }
}

export function aktualisiereStreak() {
  const heute = new Date().toISOString().split("T")[0];
  const s = ladeStreak();
  if (s.lastDate === heute) return s;
  const gestern = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const neuerCount = s.lastDate === gestern ? s.count + 1 : 1;
  const neu = { count: neuerCount, lastDate: heute, longest: Math.max(neuerCount, s.longest || 0) };
  try { localStorage.setItem(userKey("bw_streak"), JSON.stringify(neu)); } catch {}
  return neu;
}

export function streakEmoji(count) {
  if (count >= 30) return "🏆";
  if (count >= 14) return "🔥";
  if (count >= 7)  return "⚡";
  if (count >= 3)  return "✨";
  return "🌱";
}

// ── Mastery-System ─────────────────────────────────────────────────────────────
export function ladeMastery() {
  try { return JSON.parse(localStorage.getItem(userKey("bw_mastery")) || "{}"); }
  catch { return {}; }
}
export function trackMastery(aufgaben) {
  if (!aufgaben || aufgaben.length === 0) return;
  const m = ladeMastery();
  aufgaben.forEach(a => { if (a._baseTypId) m[a._baseTypId] = (m[a._baseTypId] || 0) + 1; });
  try { localStorage.setItem(userKey("bw_mastery"), JSON.stringify(m)); } catch {}
}
export function masteryLevel(count) {
  if (count >= 20) return { level: 4, label: "Meister",    color: "#f59e0b", bg: "#fffbeb", icon: "🏆" };
  if (count >= 10) return { level: 3, label: "Fortgesch.", color: "#7c3aed", bg: "#f5f3ff", icon: "⭐" };
  if (count >=  5) return { level: 2, label: "Geübt",      color: "#2563eb", bg: "#eff6ff", icon: "📈" };
  if (count >=  1) return { level: 1, label: "Beginner",   color: "#16a34a", bg: "#f0fdf4", icon: "🌱" };
  return                   { level: 0, label: "Neu",        color: "#94a3b8", bg: "#f8fafc", icon: "○" };
}

export function ladeSettings() {
  try {
    const s = localStorage.getItem(userKey("buchungswerk_settings"));
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
export function speichereSettings(s) {
  try { localStorage.setItem(userKey("buchungswerk_settings"), JSON.stringify(s)); } catch {}
}

// ── React Context ──────────────────────────────────────────────────────────────
export const SettingsContext = React.createContext(DEFAULT_SETTINGS);
export const useSettings = () => React.useContext(SettingsContext);
