// ══════════════════════════════════════════════════════════════════════════════
// TeacherDashboard – Hauptseite des Lehrer-Bereichs
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from "react";
import { Play, Users, BarChart2, LineChart, CheckCircle, Home, Copy, Check, QrCode, Square } from "lucide-react";
import TeacherLayout    from "../components/TeacherLayout.jsx";
import ClassroomManager from "../components/ClassroomManager.jsx";
import QuizControl      from "../components/QuizControl.jsx";
import Leaderboard      from "../components/Leaderboard.jsx";
import TeacherStats     from "../components/TeacherStats.jsx";
import { meineQuizze, quizErgebnisse, quizStoppen } from "../api/teacherApi.js";

const BLUE  = "#3b82f6";
const GREEN = "#4ade80";

// ── Übersicht-Dashboard ────────────────────────────────────────────────────
function Dashboard({ onView, aufgaben }) {
  const [quizze, setQuizze] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  const laden = () => meineQuizze().then(d => { setQuizze(d || []); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { laden(); }, []);

  async function stoppeQuiz(code) {
    if (!confirm(`Quiz ${code} jetzt beenden?`)) return;
    await quizStoppen(code).catch(() => {});
    laden();
  }

  function kopiereCode(code) {
    const url = `${window.location.origin}?join=${code}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const laufend = quizze.filter(q => q.status === "laufend");
  const beendet = quizze.filter(q => q.status === "beendet");

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto", width: "100%", overflow: "auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f0f6fc", margin: "0 0 6px" }}>
        Lehrer-Dashboard
      </h1>
      <p style={{ fontSize: 13, color: "rgba(240,246,252,0.4)", margin: "0 0 28px" }}>
        Erstelle Live-Quizze aus deinen generierten Aufgaben und verwalte deine Klassen.
      </p>

      {/* Quick-Start Kacheln */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { icon: Play,   label: "Live-Quiz starten", sub: `${aufgaben.length} Aufgaben bereit`, key: "quiz",       color: BLUE       },
          { icon: Users,  label: "Klassen verwalten", sub: "Schüler & Gruppen",                 key: "klassen",    color: "#8b5cf6"  },
          { icon: BarChart2,label:"Ergebnisse",       sub: `${beendet.length} abgeschlossene`,  key: "ergebnisse", color: "#f59e0b"  },
          { icon: LineChart, label:"Statistik",        sub: "Leaderboard & Trends",               key: "statistik",  color: "#22c55e"  },
        ].map(({ icon: Icon, label, sub, key, color }) => (
          <button key={key} onClick={() => onView(key)}
            style={{ background: "rgba(240,246,252,0.04)", border: `1px solid rgba(240,246,252,0.08)`,
              borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left",
              display: "flex", flexDirection: "column", gap: 8,
              transition: "background 150ms, border 150ms",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${color}11`; e.currentTarget.style.borderColor = `${color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(240,246,252,0.04)"; e.currentTarget.style.borderColor = "rgba(240,246,252,0.08)"; }}>
            <Icon size={22} color={color} strokeWidth={1.8}/>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f6fc" }}>{label}</div>
              <div style={{ fontSize: 11, color: "rgba(240,246,252,0.35)", marginTop: 2 }}>{sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Aktive Quizze */}
      {laufend.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: GREEN,
            textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px",
            display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN,
              display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }}/>
            Laufende Quizze
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {laufend.map(q => (
              <div key={q.code} style={{ display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", background: "rgba(74,222,128,0.06)",
                border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc" }}>{q.titel}</div>
                  <div style={{ fontSize: 11, color: "rgba(240,246,252,0.35)", marginTop: 2 }}>
                    Code: <span style={{ color: BLUE, fontFamily: "'Fira Code', monospace",
                      fontWeight: 700, letterSpacing: ".1em" }}>{q.code}</span>
                    · {q.teilnehmer ?? 0} Teilnehmer
                  </div>
                </div>
                <button onClick={() => kopiereCode(q.code)}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    color: copied === q.code ? GREEN : "rgba(240,246,252,0.4)", padding: 6 }}>
                  {copied === q.code ? <Check size={15}/> : <Copy size={15}/>}
                </button>
                <button onClick={() => onView("quiz")}
                  style={{ background: BLUE + "22", border: `1px solid ${BLUE}44`,
                    color: BLUE, borderRadius: 7, padding: "5px 12px", cursor: "pointer",
                    fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                  Öffnen
                </button>
                <button onClick={() => stoppeQuiz(q.code)}
                  style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)",
                    color: "#f87171", borderRadius: 7, padding: "5px 10px", cursor: "pointer",
                    fontSize: 12, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                  <Square size={11} strokeWidth={2}/>Beenden
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Letzte Quizze */}
      {loading ? (
        <div style={{ color: "rgba(240,246,252,0.3)", fontSize: 13 }}>Lade Verlauf…</div>
      ) : beendet.length > 0 ? (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(240,246,252,0.4)",
            textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px" }}>
            Zuletzt abgeschlossen
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {beendet.slice(0, 5).map(q => (
              <div key={q.code} style={{ display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px", background: "rgba(240,246,252,0.03)",
                border: "1px solid rgba(240,246,252,0.06)", borderRadius: 9 }}>
                <CheckCircle size={14} color="rgba(240,246,252,0.25)" strokeWidth={1.5}/>
                <div style={{ flex: 1, fontSize: 13, color: "#f0f6fc" }}>{q.titel}</div>
                <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 11,
                  color: "rgba(240,246,252,0.35)", letterSpacing: ".1em" }}>{q.code}</span>
                <span style={{ fontSize: 11, color: "rgba(240,246,252,0.25)" }}>
                  {q.teilnehmer ?? 0} TN
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "24px 0", color: "rgba(240,246,252,0.3)", fontSize: 13 }}>
          Noch keine Quizze durchgeführt. Starte dein erstes Live-Quiz!
        </div>
      )}

      {/* Schüler-Link-Hinweis */}
      <div style={{ marginTop: 28, padding: "14px 18px",
        background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)",
        borderRadius: 12, fontSize: 12, color: "rgba(240,246,252,0.55)", lineHeight: 1.7 }}>
        <span style={{ color: BLUE, fontWeight: 700 }}>Schüler beitreten:</span>{" "}
        Schüler öffnen <span style={{ color: "#f0f6fc" }}>buchungswerk.org</span> und klicken unten auf{" "}
        <span style={{ color: "#f0f6fc" }}>„Quiz beitreten"</span> — oder öffnen direkt{" "}
        <span style={{ color: BLUE, fontFamily: "'Fira Code', monospace" }}>buchungswerk.org?join=CODE</span>.
      </div>
    </div>
  );
}

// ── Ergebnisse-Ansicht ─────────────────────────────────────────────────────
function ErgebnisseView() {
  const [quizze, setQuizze]       = useState([]);
  const [aktQuiz, setAktQuiz]     = useState(null);
  const [ergebnisse, setErgebnisse] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    meineQuizze().then(d => { setQuizze(d || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function zeigErgebnisse(code) {
    setAktQuiz(code);
    const e = await quizErgebnisse(code).catch(() => []);
    setErgebnisse(e || []);
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto", width: "100%", overflow: "auto",
      display: "grid", gridTemplateColumns: aktQuiz ? "240px 1fr" : "1fr", gap: 20 }}>

      {/* Quiz-Liste */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(240,246,252,0.4)",
          textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px" }}>
          Meine Quizze
        </h3>
        {loading ? <div style={{ color: "rgba(240,246,252,0.3)", fontSize: 13 }}>Lade…</div>
          : quizze.length === 0 ? <div style={{ color: "rgba(240,246,252,0.3)", fontSize: 13 }}>Keine Quizze vorhanden.</div>
          : quizze.map(q => (
            <button key={q.code} onClick={() => zeigErgebnisse(q.code)}
              style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 9,
                background: aktQuiz === q.code ? "rgba(59,130,246,0.12)" : "rgba(240,246,252,0.03)",
                border: `1px solid ${aktQuiz === q.code ? "rgba(59,130,246,0.3)" : "rgba(240,246,252,0.06)"}`,
                cursor: "pointer", marginBottom: 5, display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f6fc" }}>{q.titel}</div>
              <div style={{ fontSize: 11, color: "rgba(240,246,252,0.35)", marginTop: 2,
                fontFamily: "'Fira Code', monospace" }}>{q.code} · {q.teilnehmer ?? 0} TN</div>
            </button>
          ))
        }
      </div>

      {/* Ergebnisse */}
      {aktQuiz && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#f0f6fc", margin: "0 0 16px" }}>
            Ergebnisse: {quizze.find(q => q.code === aktQuiz)?.titel ?? aktQuiz}
          </h3>
          <Leaderboard ergebnisse={ergebnisse} fragen_gesamt={0} />
        </div>
      )}
    </div>
  );
}

// ── Haupt-Export ─────────────────────────────────────────────────────────────
export default function TeacherDashboard({ onClose, user, aufgaben = [] }) {
  const [view, setView] = useState("dashboard");

  return (
    <TeacherLayout view={view} onView={setView} onClose={onClose} user={user}>
      <div style={{ flex: 1, overflow: "auto", color: "#f0f6fc" }}>
        {view === "dashboard"  && <Dashboard onView={setView} aufgaben={aufgaben} />}
        {view === "klassen"    && <ClassroomManager />}
        {view === "quiz"       && <QuizControl aufgaben={aufgaben} />}
        {view === "ergebnisse" && <ErgebnisseView />}
        {view === "statistik"  && <TeacherStats />}
      </div>
    </TeacherLayout>
  );
}
