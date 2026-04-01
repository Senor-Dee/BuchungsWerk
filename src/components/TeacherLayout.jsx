// ══════════════════════════════════════════════════════════════════════════════
// TeacherLayout – Sidebar + Hauptbereich (Lehrer-Bereich, Blau #3b82f6)
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { Users, Play, BarChart2, X, Home, LineChart } from "lucide-react";

const BLUE  = "#3b82f6";
const BLUE2 = "rgba(59,130,246,0.12)";
const BLUE3 = "rgba(59,130,246,0.25)";

const NAV = [
  { key: "dashboard", icon: Home,      label: "Übersicht"  },
  { key: "klassen",   icon: Users,     label: "Klassen"    },
  { key: "quiz",      icon: Play,      label: "Live-Quiz"  },
  { key: "ergebnisse",icon: BarChart2, label: "Ergebnisse" },
  { key: "statistik", icon: LineChart, label: "Statistik"  },
];

export default function TeacherLayout({ view, onView, onClose, user, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", flexDirection: "column",
      background: "#0d1117",
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    }}>
      {/* Top-Bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 16px", height: 54, flexShrink: 0,
        background: "rgba(13,17,23,0.95)",
        borderBottom: `2px solid ${BLUE}`,
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: BLUE,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={15} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontWeight: 900, fontSize: 16, color: "#f0f6fc",
            letterSpacing: "-0.3px", fontFamily: "'Bebas Neue', sans-serif" }}>
            KLASSENZIMMER
          </span>
        </div>

        {/* Nav – horizontal auf Desktop */}
        <nav style={{ display: "flex", gap: 2, marginLeft: 16 }}>
          {NAV.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => onView(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                background: view === key ? BLUE2 : "transparent",
                color: view === key ? BLUE : "rgba(240,246,252,0.45)",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                transition: "all 150ms",
              }}>
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>

        {/* User + Schließen */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {user && (
            <span style={{ fontSize: 12, color: "rgba(240,246,252,0.4)" }}>
              {user.vorname} {user.nachname}
            </span>
          )}
          <button onClick={onClose}
            style={{ background: "rgba(240,246,252,0.07)", border: "1px solid rgba(240,246,252,0.12)",
              borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", color: "rgba(240,246,252,0.5)" }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {children}
      </div>
    </div>
  );
}
