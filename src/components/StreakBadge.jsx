// ══════════════════════════════════════════════════════════════════════════════
// StreakBadge – Kompaktes Streak-Anzeige-Badge (Top-Right oder Inline)
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { Flame, Zap, Trophy, Check } from "lucide-react";

const ORANGE = "#e8600a";
const YELLOW = "#fbbf24";

function BadgeIcon({ badge, size = 16 }) {
  const props = { size, strokeWidth: 2 };
  if (badge === "trophy") return <Trophy {...props} color={YELLOW} />;
  if (badge === "flame2") return <><Flame {...props} color={ORANGE} /><Flame {...props} color={ORANGE} /></>;
  if (badge === "flame")  return <Flame {...props} color={ORANGE} />;
  if (badge === "zap")    return <Zap {...props} color={YELLOW} />;
  return <Check {...props} color="rgba(240,236,227,0.5)" />;
}

// ── Kompakt (für Header) ─────────────────────────────────────────────────────
export function StreakBadge({ streak }) {
  if (!streak || streak.current_streak < 1) return null;
  const days = streak.current_streak;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 10px",
      background: "rgba(232,96,10,0.12)",
      border: "1px solid rgba(232,96,10,0.25)",
      borderRadius: 8,
      fontSize: 12, fontWeight: 700,
      color: ORANGE,
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <BadgeIcon badge={streak.badge} size={13} />
      <span>{days}d</span>
    </div>
  );
}

// ── Celebration (nach Quiz-Abschluss) ────────────────────────────────────────
export function StreakCelebration({ streak, onClose }) {
  if (!streak || streak.current_streak < 1) return null;
  const days = streak.current_streak;
  const isNew = streak.neu !== false;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      padding: "16px 20px",
      background: "rgba(232,96,10,0.09)",
      border: "1px solid rgba(232,96,10,0.22)",
      borderRadius: 14,
      textAlign: "center",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <BadgeIcon badge={streak.badge} size={20} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: ORANGE }}>
        {isNew ? `${days}-Tage-Streak!` : `${days} Tage am Stück`}
      </div>
      <div style={{ fontSize: 11, color: "rgba(240,236,227,0.45)" }}>
        Bestleistung: {streak.max_streak} Tage
      </div>
    </div>
  );
}
