// ══════════════════════════════════════════════════════════════════════════════
// Leaderboard – Live-Rangliste mit Platz-Badges
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { Trophy, Medal, Award } from "lucide-react";

const BLUE = "#3b82f6";

function RangBadge({ rang }) {
  if (rang === 1) return <Trophy size={16} color="#fbbf24" strokeWidth={2} />;
  if (rang === 2) return <Medal  size={16} color="#94a3b8" strokeWidth={2} />;
  if (rang === 3) return <Award  size={16} color="#cd7c2e" strokeWidth={2} />;
  return <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(240,246,252,0.35)", width: 16, textAlign: "center" }}>{rang}</span>;
}

export default function Leaderboard({ ergebnisse = [], fragen_gesamt = 0, compact = false }) {
  if (ergebnisse.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: compact ? "24px 16px" : "48px 16px",
        color: "rgba(240,246,252,0.3)", fontSize: 13 }}>
        Noch keine Antworten — warte auf Schüler…
      </div>
    );
  }

  const maxP = ergebnisse[0]?.gesamt_punkte || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 6 }}>
      {ergebnisse.map((e, i) => {
        const pct = Math.min(100, (e.gesamt_punkte / Math.max(maxP, 1)) * 100);
        return (
          <div key={e.spieler} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: i === 0 ? "rgba(251,191,36,0.08)" :
                        i === 1 ? "rgba(148,163,184,0.06)" :
                        i === 2 ? "rgba(205,124,46,0.06)" :
                        "rgba(240,246,252,0.03)",
            border: `1px solid ${i < 3 ? "rgba(240,246,252,0.1)" : "rgba(240,246,252,0.05)"}`,
            borderRadius: 10, padding: compact ? "7px 10px" : "10px 14px",
          }}>
            <RangBadge rang={i + 1} />

            <span style={{ flex: 1, fontSize: compact ? 13 : 14, fontWeight: 700,
              color: "#f0f6fc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.spieler}
            </span>

            {/* Progress-Bar */}
            <div style={{ width: compact ? 80 : 120, height: 5, borderRadius: 3,
              background: "rgba(240,246,252,0.08)", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: "100%", width: pct + "%", borderRadius: 3,
                background: i === 0 ? "#fbbf24" : BLUE, transition: "width 400ms ease" }} />
            </div>

            <span style={{
              fontSize: compact ? 12 : 13, fontWeight: 900, color: BLUE,
              fontFamily: "'Fira Code', monospace", flexShrink: 0, minWidth: 48, textAlign: "right",
            }}>
              {e.gesamt_punkte} P
            </span>

            {fragen_gesamt > 0 && (
              <span style={{ fontSize: 10, color: "rgba(240,246,252,0.3)", flexShrink: 0 }}>
                {e.richtig}/{fragen_gesamt} ✓
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
