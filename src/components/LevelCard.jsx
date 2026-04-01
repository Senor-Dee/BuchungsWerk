// ══════════════════════════════════════════════════════════════════════════════
// LevelCard – Lernbereich-Niveau-Anzeige (Kompakt + Übersicht)
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { TrendingUp } from "lucide-react";

// Level → Farbe (als Indikatoren, nicht als Hintergrund)
const LEVEL_FARBE = {
  BLAU:   "#3b82f6",
  "GRÜN": "#22c55e",
  GOLD:   "#eab308",
  ROT:    "#ef4444",
  PLATIN: "#a78bfa",
};

const LEVEL_LABEL = {
  BLAU:   "Anfänger",
  "GRÜN": "Fortgeschritten",
  GOLD:   "Meister",
  ROT:    "Experte",
  PLATIN: "Perfektionist",
};

// ── Einzelne Karte (für Übersicht-Grid) ─────────────────────────────────────
export function LevelCard({ lernbereich, level, genauigkeit, aufgaben_geloest, gesamt_aufgaben }) {
  const farbe = LEVEL_FARBE[level] || LEVEL_FARBE.BLAU;
  const fortschritt = gesamt_aufgaben > 0
    ? Math.min(100, Math.round((aufgaben_geloest / gesamt_aufgaben) * 100))
    : 0;

  return (
    <div style={{
      padding: "16px",
      background: "rgba(28,20,10,0.8)",
      border: `1px solid rgba(240,236,227,0.08)`,
      borderRadius: 12,
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: farbe, flexShrink: 0,
          boxShadow: `0 0 6px ${farbe}66`,
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(240,236,227,0.85)", flex: 1, lineHeight: 1.3 }}>
          {lernbereich}
        </span>
      </div>

      {/* Stats */}
      <div style={{ fontSize: 11, color: "rgba(240,236,227,0.45)", marginBottom: 10, display: "flex", gap: 12 }}>
        <span>{Math.round(genauigkeit)}% Genauigkeit</span>
        <span>{aufgaben_geloest} Aufg. gelöst</span>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: 4, background: "rgba(240,236,227,0.08)",
        borderRadius: 2, overflow: "hidden", marginBottom: 10,
      }}>
        <div style={{
          height: "100%", width: `${fortschritt}%`,
          background: farbe,
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Level Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px",
        background: `${farbe}18`,
        border: `1px solid ${farbe}44`,
        borderRadius: 6,
        fontSize: 11, fontWeight: 700,
        color: farbe,
      }}>
        {level}
        <span style={{ fontWeight: 400, color: `${farbe}99` }}>{LEVEL_LABEL[level]}</span>
      </div>
    </div>
  );
}

// ── Celebration nach Quiz (ähnlich StreakCelebration) ────────────────────────
export function LevelUpdate({ lernbereich, level, genauigkeit, fortschritt, aufgaben_geloest, gesamt_aufgaben }) {
  if (!lernbereich || !level) return null;
  const farbe = LEVEL_FARBE[level] || LEVEL_FARBE.BLAU;
  const fPct  = fortschritt ?? (gesamt_aufgaben > 0
    ? Math.min(100, Math.round((aufgaben_geloest / gesamt_aufgaben) * 100))
    : 0);

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8,
      padding: "14px 18px",
      background: "rgba(28,20,10,0.85)",
      border: `1px solid ${farbe}44`,
      borderRadius: 14,
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TrendingUp size={15} color={farbe} strokeWidth={2} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(240,236,227,0.6)" }}>
          {lernbereich}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 10px",
          background: `${farbe}20`,
          border: `1px solid ${farbe}55`,
          borderRadius: 6,
          fontSize: 12, fontWeight: 800,
          color: farbe,
        }}>
          {level}
        </span>
        <span style={{ fontSize: 11, color: "rgba(240,236,227,0.45)" }}>
          {Math.round(genauigkeit)}% Genauigkeit · {fPct}% Fortschritt
        </span>
      </div>
      {/* Mini Progress Bar */}
      <div style={{ height: 3, background: "rgba(240,236,227,0.07)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${fPct}%`, background: farbe, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ── Kompakt-Badge (für Header, optional) ─────────────────────────────────────
export function LevelBadge({ level }) {
  if (!level || level === "BLAU") return null;
  const farbe = LEVEL_FARBE[level] || LEVEL_FARBE.BLAU;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "4px 10px",
      background: `${farbe}18`,
      border: `1px solid ${farbe}33`,
      borderRadius: 8,
      fontSize: 11, fontWeight: 700,
      color: farbe,
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: farbe, display: "inline-block" }} />
      {level}
    </div>
  );
}
