// ══════════════════════════════════════════════════════════════════════════════
// StudentJoin – Schüler gibt Code ein & beantwortet Quiz-Fragen
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from "react";
import { Play, ChevronRight, Check, X, Loader, Trophy } from "lucide-react";
import { quizInfo, quizJoinen, quizAntwort } from "../api/teacherApi.js";

function sessionKey(code) { return `bw_quiz_sess_${code}`; }
function loadSession(code) { try { return localStorage.getItem(sessionKey(code)); } catch { return null; } }
function saveSession(code, sid) { try { localStorage.setItem(sessionKey(code), sid); } catch {} }
function clearSession(code) { try { localStorage.removeItem(sessionKey(code)); } catch {} }

const BLUE  = "#3b82f6";
const GREEN = "#4ade80";
const RED   = "#f87171";
const OPT_COLORS = ["#3b82f6","#8b5cf6","#f59e0b","#ef4444"];
const OPT_LABELS = ["A","B","C","D"];

export default function StudentJoin({ initialCode = "" }) {
  const [phase, setPhase] = useState("join"); // join | lobby | frage | resultat | fertig
  const [code,     setCode]     = useState(initialCode.toUpperCase());
  const [name,     setName]     = useState("");
  const [quiz,     setQuiz]     = useState(null);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // Session-ID (verhindert Antworten als fremder Schüler)
  const [sessionId,  setSessionId]  = useState(null);

  // Antwort-State
  const [gewaehlt,  setGewaehlt]  = useState(null);  // idx der gewählten Option
  const [korrekt,   setKorrekt]   = useState(null);
  const [punkte,    setPunkte]    = useState(null);
  const [gesamtP,   setGesamtP]   = useState(0);
  const [startMs,   setStartMs]   = useState(0);
  const [aktFrageNr,setAktFrageNr]= useState(-1);

  // Timer
  const [verbleibend, setVerbleibend] = useState(0);
  const timerRef  = useRef(null);
  const pollRef   = useRef(null);

  // Polling-Schleife sobald code + name gesetzt
  useEffect(() => {
    if (phase !== "lobby" && phase !== "frage" && phase !== "resultat") return;
    async function poll() {
      try {
        const q = await quizInfo(code);
        setQuiz(q);
        if (q.status === "beendet") { setPhase("fertig"); clearInterval(pollRef.current); return; }
        const fn = q.frage_nr ?? 0;
        if (q.aktuelle_frage && fn !== aktFrageNr) {
          // Neue Frage ist da
          setAktFrageNr(fn);
          setGewaehlt(null); setKorrekt(null); setPunkte(null);
          setStartMs(Date.now());
          const limit = (q.aktuelle_frage.zeitlimit || 25);
          setVerbleibend(limit);
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setVerbleibend(v => { if (v <= 1) { clearInterval(timerRef.current); return 0; } return v - 1; });
          }, 1000);
          setPhase("frage");
        }
      } catch {}
    }
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current); };
  }, [phase, code, aktFrageNr]);

  async function beitreten(e) {
    e.preventDefault();
    const upperCode = code.trim().toUpperCase();
    if (!upperCode || !name.trim()) return;
    setLoading(true); setError("");
    try {
      // Reconnect: gespeicherte Session nutzen statt neu joinen
      const stored = loadSession(upperCode);
      if (stored) {
        const q = await quizInfo(upperCode);
        if (!q) throw new Error("Quiz nicht gefunden.");
        if (q.status === "beendet") throw new Error("Dieses Quiz ist bereits beendet.");
        setSessionId(stored);
        setQuiz(q);
        setPhase("lobby");
        return;
      }
      // Erstmaliger Join
      const q = await quizInfo(upperCode);
      if (!q) throw new Error("Quiz nicht gefunden.");
      if (q.status === "beendet") throw new Error("Dieses Quiz ist bereits beendet.");
      const joined = await quizJoinen(upperCode, name.trim());
      saveSession(upperCode, joined.session_id);
      setSessionId(joined.session_id);
      setQuiz(q);
      setPhase("lobby");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function antworten(idx) {
    if (gewaehlt !== null) return;  // Schon geantwortet
    clearInterval(timerRef.current);
    const zeitMs = Date.now() - startMs;
    setGewaehlt(idx);
    try {
      const res = await quizAntwort(code, sessionId, aktFrageNr, idx, zeitMs);
      setKorrekt(res.korrekt);
      setPunkte(res.punkte);
      setGesamtP(prev => prev + (res.punkte || 0));
      setPhase("resultat");
    } catch (err) {
      // Ungültige Session → Session löschen und zurück zu Join
      if (err.message?.includes("Session")) {
        clearSession(code.toUpperCase());
        setError("Sitzung abgelaufen – bitte erneut beitreten.");
        setPhase("join");
      } else {
        setPhase("resultat");
      }
    }
  }

  // ── Join-Screen ────────────────────────────────────────────────────────────
  if (phase === "join") return (
    <div style={{ minHeight: "100dvh", background: "#0d1117", display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#f0f6fc",
            fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>
            QUIZ BEITRETEN
          </div>
          <div style={{ fontSize: 13, color: "rgba(240,246,252,0.4)", marginTop: 4 }}>
            BuchungsWerk Live-Quiz
          </div>
        </div>
        <form onSubmit={beitreten} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,246,252,0.4)",
              textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>
              Quiz-Code
            </label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="z.B. AB1C2D3E" maxLength={12}
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px",
                fontSize: 22, fontFamily: "'Fira Code', monospace", fontWeight: 700,
                letterSpacing: ".2em", textAlign: "center",
                background: "rgba(240,246,252,0.06)", border: `2px solid ${BLUE}`,
                borderRadius: 10, color: "#f0f6fc", outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,246,252,0.4)",
              textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>
              Dein Name
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Max Muster"
              maxLength={40} style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px",
                fontSize: 15, background: "rgba(240,246,252,0.06)",
                border: "1px solid rgba(240,246,252,0.14)",
                borderRadius: 10, color: "#f0f6fc", outline: "none", fontFamily: "inherit" }} />
          </div>
          {error && <div style={{ color: RED, fontSize: 13, textAlign: "center" }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ padding: "13px", borderRadius: 10, border: "none", cursor: "pointer",
              background: BLUE, color: "#fff", fontSize: 15, fontWeight: 800,
              fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <Loader size={18} strokeWidth={2}/> : <Play size={18} strokeWidth={2}/>}
            Loslegen
          </button>
        </form>
      </div>
    </div>
  );

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (phase === "lobby") return (
    <div style={{ minHeight: "100dvh", background: "#0d1117", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Sans', sans-serif", padding: 24, textAlign: "center", gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(59,130,246,0.15)",
        border: `2px solid ${BLUE}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size={24} color={BLUE} style={{ animation: "spin 1.2s linear infinite" }}/>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#f0f6fc" }}>
        Warte auf den Lehrer…
      </div>
      <div style={{ fontSize: 14, color: "rgba(240,246,252,0.4)" }}>
        {quiz?.titel} · Hallo, {name}!
      </div>
    </div>
  );

  // ── Frage ─────────────────────────────────────────────────────────────────
  if (phase === "frage" && quiz?.aktuelle_frage) {
    const frage = quiz.aktuelle_frage;
    const pct = frage.zeitlimit > 0 ? (verbleibend / frage.zeitlimit) * 100 : 100;
    const timerColor = pct > 50 ? GREEN : pct > 25 ? "#fbbf24" : RED;
    return (
      <div style={{ minHeight: "100dvh", background: "#0d1117", display: "flex",
        flexDirection: "column", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {/* Timer-Bar */}
        <div style={{ height: 6, background: "rgba(240,246,252,0.08)", flexShrink: 0 }}>
          <div style={{ height: "100%", width: pct + "%", background: timerColor,
            transition: "width 1s linear, background 500ms ease" }}/>
        </div>
        {/* Header */}
        <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between",
          alignItems: "center", borderBottom: "1px solid rgba(240,246,252,0.06)" }}>
          <span style={{ fontSize: 12, color: "rgba(240,246,252,0.35)" }}>
            Frage {(quiz.frage_nr ?? 0) + 1}/{quiz.fragen_gesamt ?? "?"}
          </span>
          <span style={{ fontSize: 14, fontWeight: 900, color: timerColor,
            fontFamily: "'Fira Code', monospace" }}>{verbleibend}s</span>
          <span style={{ fontSize: 12, color: BLUE, fontWeight: 700 }}>{gesamtP} P</span>
        </div>
        {/* Frage */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 16px", gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#f0f6fc", lineHeight: 1.65,
            textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
            {frage.text}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 600, margin: "0 auto", width: "100%" }}>
            {(frage.optionen || []).map((opt, i) => (
              <button key={i} onClick={() => antworten(i)} disabled={gewaehlt !== null}
                style={{ padding: "16px 12px", borderRadius: 12,
                  background: OPT_COLORS[i] + "22",
                  border: `2px solid ${OPT_COLORS[i]}44`,
                  cursor: gewaehlt !== null ? "default" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  transition: "transform 120ms ease",
                }}>
                <span style={{ width: 28, height: 28, borderRadius: 7,
                  background: OPT_COLORS[i], display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>
                  {OPT_LABELS[i]}
                </span>
                <span style={{ fontSize: 12, color: "#f0f6fc", fontFamily: "'Fira Code', monospace",
                  textAlign: "center", lineHeight: 1.4 }}>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Resultat (nach Antwort, vor nächster Frage) ───────────────────────────
  if (phase === "resultat") return (
    <div style={{ minHeight: "100dvh", background: "#0d1117", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Sans', sans-serif", padding: 24, gap: 20, textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%",
        background: korrekt ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.1)",
        border: `3px solid ${korrekt ? GREEN : RED}`,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        {korrekt
          ? <Check size={36} color={GREEN} strokeWidth={2.5}/>
          : <X     size={36} color={RED}   strokeWidth={2.5}/>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: korrekt ? GREEN : RED }}>
        {korrekt ? "Richtig!" : "Falsch!"}
      </div>
      {korrekt && punkte > 0 && (
        <div style={{ fontSize: 16, color: "#fbbf24", fontWeight: 700 }}>
          +{punkte} Punkte
        </div>
      )}
      <div style={{ fontSize: 13, color: "rgba(240,246,252,0.4)" }}>
        Gesamt: {gesamtP} Punkte · Warte auf nächste Frage…
      </div>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(59,130,246,0.1)" }}>
        <Loader size={18} color={BLUE} style={{ animation: "spin 1.2s linear infinite", margin: 7 }}/>
      </div>
    </div>
  );

  // ── Fertig ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: "#0d1117", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Sans', sans-serif", padding: 24, gap: 20, textAlign: "center" }}>
      <Trophy size={56} color="#fbbf24" strokeWidth={1.5}/>
      <div style={{ fontSize: 26, fontWeight: 900, color: "#f0f6fc" }}>Quiz beendet!</div>
      <div style={{ fontSize: 18, color: BLUE, fontWeight: 700 }}>
        Du hast {gesamtP} Punkte erzielt!
      </div>
      <div style={{ fontSize: 14, color: "rgba(240,246,252,0.4)" }}>
        Warte auf die finale Rangliste vom Lehrer.
      </div>
    </div>
  );
}
