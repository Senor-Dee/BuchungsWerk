// ══════════════════════════════════════════════════════════════════════════════
// TeacherStats – Lehrer-Statistik-Dashboard (Phase 2.3)
// Zeigt Klassen-Übersicht, Leaderboard, Lernbereich-Trends und At-Risk-Schüler
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Target, Flame, AlertTriangle, TrendingUp, TrendingDown,
  Minus, ChevronDown, RefreshCw, Trophy,
} from "lucide-react";
import { LevelBadge } from "./LevelCard.jsx";
import {
  getKlassen, classroomStats, classroomLeaderboard,
  classroomAtRisk, classroomTrends,
} from "../api/teacherApi.js";

const BLUE  = "#3b82f6";
const GREEN = "#22c55e";
const RED   = "#f87171";
const AMBER = "#f59e0b";
const TEXT  = "#f0f6fc";
const MUTED = "rgba(240,246,252,0.4)";
const CARD  = "rgba(240,246,252,0.04)";
const BORD  = "rgba(240,246,252,0.08)";

const LEVEL_FARBE = {
  BLAU:   "#3b82f6",
  "GRÜN": "#22c55e",
  GOLD:   "#eab308",
  ROT:    "#ef4444",
  PLATIN: "#a78bfa",
};

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function levelFarbe(level) {
  return LEVEL_FARBE[level] || LEVEL_FARBE.BLAU;
}

function StatCard({ icon: Icon, label, value, sub, color = BLUE }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORD}`, borderRadius: 12,
      padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: color + "1a", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} color={color} strokeWidth={2} />
        </div>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{label}</span>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <h3 style={{
      fontSize: 11, fontWeight: 700, color: MUTED,
      textTransform: "uppercase", letterSpacing: ".08em",
      margin: "0 0 12px",
    }}>
      {children}
    </h3>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

function LeaderboardSection({ rows }) {
  if (!rows.length) return (
    <div style={{ color: MUTED, fontSize: 13, padding: "20px 0" }}>
      Noch keine Daten für diese Klasse.
    </div>
  );

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORD}` }}>
            {["#", "Name", "Level", "Genauigkeit", "Streak"].map((h, i) => (
              <th key={h} style={{
                padding: "8px 12px", textAlign: i >= 3 ? "right" : "left",
                fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase",
                letterSpacing: ".06em",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.name} style={{
              borderBottom: `1px solid rgba(240,246,252,0.04)`,
              transition: "background 120ms",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(240,246,252,0.03)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "11px 12px", fontSize: 13, color: MUTED, width: 40 }}>
                {i < 3 ? medals[i] : <span style={{ fontWeight: 700 }}>#{i + 1}</span>}
              </td>
              <td style={{ padding: "11px 12px" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{s.name}</span>
                <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>
                  {s.fragenGesamt} Fragen
                </span>
              </td>
              <td style={{ padding: "11px 12px" }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: levelFarbe(s.gesamtLevel),
                  background: levelFarbe(s.gesamtLevel) + "1a",
                  padding: "2px 8px", borderRadius: 4,
                }}>
                  {s.gesamtLevel}
                </span>
              </td>
              <td style={{ padding: "11px 12px", textAlign: "right" }}>
                <span style={{
                  fontSize: 14, fontWeight: 800,
                  color: s.gesamtGenauigkeit >= 70 ? GREEN
                       : s.gesamtGenauigkeit >= 40 ? AMBER : RED,
                }}>
                  {s.gesamtGenauigkeit}%
                </span>
              </td>
              <td style={{ padding: "11px 12px", textAlign: "right" }}>
                <span style={{ fontSize: 13, color: s.streak > 0 ? AMBER : MUTED }}>
                  {s.streak > 0 ? "🔥" : ""} {s.streak}
                  <span style={{ fontSize: 11, color: MUTED, marginLeft: 4 }}>/ {s.maxStreak} max</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Lernbereich-Trends ────────────────────────────────────────────────────────

function TrendsSection({ trends }) {
  const entries = Object.entries(trends);
  if (!entries.length) return (
    <div style={{ color: MUTED, fontSize: 13, padding: "20px 0" }}>
      Noch keine Lernbereich-Daten vorhanden.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map(([lb, data]) => {
        const t = data.trend;
        const TrendIcon = t > 0 ? TrendingUp : t < 0 ? TrendingDown : Minus;
        const tColor    = t > 0 ? GREEN : t < 0 ? RED : MUTED;
        const barWidth  = Math.min(data.avgGenauigkeit, 100);
        const barColor  = data.avgGenauigkeit >= 70 ? GREEN
                        : data.avgGenauigkeit >= 40 ? AMBER : RED;

        return (
          <div key={lb} style={{
            background: CARD, border: `1px solid ${BORD}`, borderRadius: 10,
            padding: "12px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: TEXT }}>{lb}</span>
              <span style={{ fontSize: 11, color: MUTED }}>{data.studentsEnrolled} Schüler</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: tColor }}>
                <TrendIcon size={14} strokeWidth={2.5} />
                {t > 0 ? `+${t}` : t}%
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: barColor, minWidth: 42, textAlign: "right" }}>
                {data.avgGenauigkeit}%
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 4, background: "rgba(240,246,252,0.08)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${barWidth}%`,
                background: barColor, borderRadius: 2,
                transition: "width 600ms ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── At-Risk Schüler ───────────────────────────────────────────────────────────

function AtRiskSection({ rows }) {
  if (!rows.length) return (
    <div style={{
      padding: "16px 18px", background: GREEN + "0d",
      border: `1px solid ${GREEN}33`, borderRadius: 10,
      fontSize: 13, color: GREEN, fontWeight: 600,
    }}>
      Alle Schüler über 30% – kein akuter Handlungsbedarf.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(s => (
        <div key={`${s.name}-${s.lernbereich}`} style={{
          padding: "12px 16px", background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.18)", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: s.genauigkeit < 10 ? RED : AMBER, flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{s.name}</span>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
              {s.lernbereich !== "–" ? `${s.lernbereich} · ` : ""}{s.genauigkeit}% · {s.level}
            </div>
          </div>
          <span style={{
            fontSize: 11, color: MUTED, maxWidth: 200, textAlign: "right", lineHeight: 1.4,
          }}>
            {s.empfehlung}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Klassen-Selektor ──────────────────────────────────────────────────────────

function KlassenSelect({ klassen, selected, onSelect }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={selected || ""}
        onChange={e => onSelect(Number(e.target.value) || null)}
        style={{
          appearance: "none", background: CARD, border: `1px solid ${BORD}`,
          borderRadius: 8, padding: "7px 36px 7px 12px", color: TEXT,
          fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
          outline: "none",
        }}
      >
        {!selected && <option value="">Klasse wählen…</option>}
        {klassen.map(k => (
          <option key={k.id} value={k.id}>{k.name} (Jg. {k.stufe})</option>
        ))}
      </select>
      <ChevronDown size={14} color={MUTED}
        style={{ position: "absolute", right: 10, pointerEvents: "none" }} />
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function TeacherStats() {
  const [klassen,     setKlassen]     = useState([]);
  const [selectedId,  setSelectedId]  = useState(null);
  const [stats,       setStats]       = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [atRisk,      setAtRisk]      = useState([]);
  const [trends,      setTrends]      = useState({});
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    getKlassen()
      .then(ks => {
        setKlassen(ks || []);
        if (ks?.length) setSelectedId(ks[0].id);
      })
      .catch(() => {});
  }, []);

  const laden = useCallback(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      classroomStats(selectedId),
      classroomLeaderboard(selectedId),
      classroomAtRisk(selectedId),
      classroomTrends(selectedId),
    ])
      .then(([s, lb, ar, tr]) => {
        setStats(s);
        setLeaderboard(lb || []);
        setAtRisk(ar || []);
        setTrends(tr || {});
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedId]);

  useEffect(() => { laden(); }, [laden]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", width: "100%", overflow: "auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: "0 0 4px" }}>
            Klassen-Statistik
          </h1>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            Leistungsübersicht, Leaderboard und At-Risk-Schüler
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {klassen.length > 0 && (
            <KlassenSelect klassen={klassen} selected={selectedId} onSelect={setSelectedId} />
          )}
          <button onClick={laden} disabled={loading}
            style={{
              background: CARD, border: `1px solid ${BORD}`,
              borderRadius: 8, width: 34, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: MUTED,
            }}>
            <RefreshCw size={14} strokeWidth={2}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      {/* Kein Classroom gewählt */}
      {!selectedId && (
        <div style={{ color: MUTED, fontSize: 13, padding: "32px 0", textAlign: "center" }}>
          Wähle eine Klasse, um die Statistik zu laden.
        </div>
      )}

      {/* Fehler */}
      {error && (
        <div style={{
          padding: "12px 16px", background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10,
          color: RED, fontSize: 13, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Keine Quizze für Klasse */}
      {stats && stats.schuelerAnzahl === 0 && !loading && (
        <div style={{
          padding: "20px 24px", background: CARD, border: `1px solid ${BORD}`,
          borderRadius: 12, color: MUTED, fontSize: 13,
        }}>
          Für <strong style={{ color: TEXT }}>{stats.className}</strong> wurden noch keine
          Live-Quizze durchgeführt. Starte ein Quiz mit dieser Klasse, um hier Statistiken zu sehen.
        </div>
      )}

      {/* Statistik-Inhalt */}
      {stats && stats.schuelerAnzahl > 0 && (
        <>
          {/* Stat-Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12, marginBottom: 28,
          }}>
            <StatCard
              icon={Users} label="Teilnehmer" color={BLUE}
              value={stats.schuelerAnzahl}
              sub={stats.className}
            />
            <StatCard
              icon={Target} label="Ø Genauigkeit" color={AMBER}
              value={`${stats.durchschnittGenauigkeit}%`}
              sub="über alle Fragen"
            />
            <StatCard
              icon={Flame} label="Ø Streak" color="#f97316"
              value={`${stats.durchschnittStreak} Tage`}
              sub={stats.streakLeader
                ? `Leader: ${stats.streakLeader.name} (${stats.streakLeader.streak})`
                : "Kein Streak aktiv"}
            />
            <StatCard
              icon={AlertTriangle} label="At-Risk" color={RED}
              value={stats.atRiskCount}
              sub="Schüler unter 30%"
            />
          </div>

          {/* Leaderboard */}
          <div style={{
            background: CARD, border: `1px solid ${BORD}`,
            borderRadius: 12, padding: "18px 20px", marginBottom: 20,
          }}>
            <SectionHeader>Schüler-Leaderboard</SectionHeader>
            <LeaderboardSection rows={leaderboard} />
          </div>

          {/* Trends + At-Risk nebeneinander auf Desktop */}
          <div style={{
            display: "grid",
            gridTemplateColumns: Object.keys(trends).length ? "1fr 1fr" : "1fr",
            gap: 16, alignItems: "start",
          }}>
            {Object.keys(trends).length > 0 && (
              <div style={{
                background: CARD, border: `1px solid ${BORD}`,
                borderRadius: 12, padding: "18px 20px",
              }}>
                <SectionHeader>Lernbereiche</SectionHeader>
                <TrendsSection trends={trends} />
              </div>
            )}

            <div style={{
              background: stats.atRiskCount > 0
                ? "rgba(239,68,68,0.04)"
                : CARD,
              border: `1px solid ${stats.atRiskCount > 0 ? "rgba(239,68,68,0.15)" : BORD}`,
              borderRadius: 12, padding: "18px 20px",
            }}>
              <SectionHeader>
                {stats.atRiskCount > 0
                  ? `⚠ At-Risk Schüler (${stats.atRiskCount})`
                  : "At-Risk Schüler"}
              </SectionHeader>
              <AtRiskSection rows={atRisk} />
            </div>
          </div>
        </>
      )}

      {/* Loading-Skeleton */}
      {loading && (
        <div style={{ color: MUTED, fontSize: 13, padding: "32px 0", textAlign: "center" }}>
          Lade Statistiken…
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
