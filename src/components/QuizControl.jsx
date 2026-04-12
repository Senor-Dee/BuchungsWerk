// ══════════════════════════════════════════════════════════════════════════════
// QuizControl – Lehrer erstellt & steuert ein Live-Quiz
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useMemo } from "react";
import { Play, SkipForward, Square, Copy, Check, Loader, QrCode, RefreshCw } from "lucide-react";
import { quizStarten } from "../api/teacherApi.js";
import { useQuiz } from "../hooks/useQuiz.js";
import Leaderboard from "./Leaderboard.jsx";

const BLUE  = "#3b82f6";
const GREEN = "#4ade80";
const RED   = "#f87171";

const btnBlue = (disabled) => ({
  padding: "9px 18px", borderRadius: 9, border: "none", cursor: disabled ? "not-allowed" : "pointer",
  background: disabled ? "rgba(59,130,246,0.3)" : BLUE,
  color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
  display: "flex", alignItems: "center", gap: 6, opacity: disabled ? 0.6 : 1,
});

// Format: "6000 AWR" aus { nr: "6000", name: "Aufwend. Rohstoffe (AWR)" }
function fmtKonto(k) {
  const m = (k.name || "").match(/\(([^)]+)\)\s*$/);
  const kuerzel = m ? m[1] : (k.nr || "?");
  return k.nr ? `${k.nr} ${kuerzel}` : kuerzel;
}

// GoB-Buchungssatz: "6000 AWR / 2600 VORST an 4400 VE"
function fmtBS(soll, haben) {
  return `${(soll || []).map(fmtKonto).join(" / ")} an ${(haben || []).map(fmtKonto).join(" / ")}`;
}

// Konvertiert BuchungsWerk-Aufgaben → Quiz-Fragen mit 4 Antwortoptionen
export function aufgabenZuQuizFragen(aufgaben) {
  // Plausible Ablenkungskonten für Falschantworten (mit Kontonr.)
  const COMMON_SOLL = [
    { nr: "2880", name: "Kasse (KA)" },
    { nr: "2800", name: "Bank (BK)" },
    { nr: "6000", name: "Aufwend. Rohstoffe (AWR)" },
    { nr: "0700", name: "Maschinen und Anlagen (MA)" },
    { nr: "2400", name: "Forderungen aus L+L (FO)" },
    { nr: "6010", name: "Aufwend. Fremdbauteile (AWF)" },
  ];
  const COMMON_HABEN = [
    { nr: "4400", name: "Verbindlichkeiten aus L+L (VE)" },
    { nr: "4830", name: "Umsatzsteuer (UST)" },
    { nr: "2800", name: "Bank (BK)" },
    { nr: "4110", name: "Erlöse aus Warenverkäufen (VK)" },
    { nr: "2880", name: "Kasse (KA)" },
    { nr: "3100", name: "Darlehensverbindlichkeiten (DARL)" },
  ];
  const result = [];
  let buchungIdx = 0;

  function buchungZuFrage(soll, haben, text, id, punkte) {
    const idx = buchungIdx++;
    const richtig = fmtBS(soll, haben);
    const wrongA  = fmtBS(haben, soll);  // Soll/Haben vertauscht
    const wrongB  = fmtBS([COMMON_SOLL[idx % COMMON_SOLL.length]], [COMMON_HABEN[(idx + 1) % COMMON_HABEN.length]]);
    const wrongC  = fmtBS([soll[0]], [COMMON_HABEN[idx % COMMON_HABEN.length]]);
    const opts = [richtig, wrongA, wrongB, wrongC];
    const shuffled = opts.map((o, i) => ({ o, isRichtig: i === 0 }));
    shuffled.sort(() => Math.random() - 0.5);
    result.push({
      id,
      text,
      optionen: shuffled.map(x => x.o),
      richtig: shuffled.findIndex(x => x.isRichtig),
      punkte: Math.max(1, punkte ?? 2),
      zeitlimit: 25,
    });
  }

  aufgaben.forEach((a, aufgabeIdx) => {
    // Einfache Buchungsaufgabe (soll/haben auf Top-Ebene)
    if (a.soll?.length && a.haben?.length) {
      buchungZuFrage(a.soll, a.haben,
        a._aufgabeEdit ?? a.aufgabe ?? `Aufgabe ${aufgabeIdx + 1}`,
        aufgabeIdx, a.punkte ?? 2);
    }
    // Komplex-Aufgabe: jeder Schritt ist eine eigene Frage mit genau einem Signalwort
    // Kein kontext-Prefix – jeder schritt.aufgabe enthält bereits das spezifische Signalwort
    else if (a.schritte?.length) {
      a.schritte.forEach((schritt, si) => {
        if (schritt.soll?.length && schritt.haben?.length) {
          buchungZuFrage(schritt.soll, schritt.haben,
            schritt.aufgabe ?? schritt.titel ?? `Schritt ${si + 1}`,
            aufgabeIdx * 100 + si, schritt.punkte ?? 2);
        }
      });
    }
    // Theorie-Multiple-Choice
    else if (a.mc?.fragen?.length) {
      const pktProFrage = Math.max(1, Math.floor((a.nrPunkte || 3) / a.mc.fragen.length));
      a.mc.fragen.forEach((f, fi) => {
        const idxMap = f.optionen.map((o, i) => ({ o, isRichtig: i === f.richtig }));
        idxMap.sort(() => Math.random() - 0.5);
        result.push({
          id: aufgabeIdx * 100 + fi,
          text: f.frage,
          optionen: idxMap.map(x => x.o),
          richtig: idxMap.findIndex(x => x.isRichtig),
          punkte: pktProFrage,
          zeitlimit: 20,
        });
      });
    }
  });

  return result;
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function QuizControl({ aufgaben = [], onQuizGestartet }) {
  const [aktCode, setAktCode]   = useState(null);
  const [titel, setTitel]       = useState("Live-Quiz");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);

  const { quiz, ergebnisse, naechsteFrage, stoppeQuiz } = useQuiz(aktCode);

  // useMemo: Shuffle nur einmal beim Mounten, nicht bei jedem Re-Render
  const quizFragen = useMemo(() => aufgabenZuQuizFragen(aufgaben), [aufgaben]);

  async function starten() {
    if (quizFragen.length === 0) { setError("Keine buchungsfähigen Aufgaben vorhanden."); return; }
    setLoading(true); setError("");
    try {
      const res = await quizStarten(titel, quizFragen);
      setAktCode(res.code);
      if (onQuizGestartet) onQuizGestartet(res.code);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const joinUrl = aktCode ? `${window.location.origin}?join=${aktCode}` : "";

  function kopiereCode() {
    if (!joinUrl) return;
    navigator.clipboard?.writeText(joinUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isLaufend  = quiz?.status === "laufend";
  const isBeendet  = quiz?.status === "beendet";
  const frageNr    = quiz?.frage_nr ?? 0;
  const frageGes   = quiz?.fragen_gesamt ?? quizFragen.length;
  const frage      = isLaufend ? quizFragen[frageNr] : null;

  // ── Kein aktives Quiz: Start-Formular ─────────────────────────────────────
  if (!aktCode) {
    return (
      <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f0f6fc", margin: "0 0 8px" }}>Live-Quiz starten</h2>
        <p style={{ fontSize: 13, color: "rgba(240,246,252,0.45)", margin: "0 0 24px" }}>
          Generierte Aufgaben werden als Multiple-Choice-Quiz für die Klasse bereitgestellt.
        </p>

        {quizFragen.length === 0 ? (
          <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: 10, padding: "14px 18px", color: "#fbbf24", fontSize: 13, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Keine quiz-fähigen Aufgaben gefunden.</div>
            <div style={{ color: "rgba(251,191,36,0.75)", lineHeight: 1.5 }}>
              {aufgaben.length === 0
                ? "Bitte zuerst Aufgaben generieren (Schritt 1–3), dann Klassenzimmer öffnen."
                : `${aufgaben.length} Aufgabe(n) übergeben (Typen: ${[...new Set(aufgaben.map(a => a.taskTyp || "buchung"))].join(", ")}), aber keine davon hat Soll/Haben-Buchungssätze oder MC-Fragen.`}
            </div>
          </div>
        ) : (
          <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 10, padding: "10px 14px", fontSize: 13, color: GREEN, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={14} strokeWidth={2.5}/> {quizFragen.length} Fragen bereit (aus generierten Aufgaben)
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,246,252,0.4)",
            textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>
            Quiz-Titel
          </label>
          <input value={titel} onChange={e => setTitel(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9,
              border: "1px solid rgba(240,246,252,0.14)", background: "rgba(240,246,252,0.05)",
              color: "#f0f6fc", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
        </div>

        {error && <div style={{ color: RED, fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button style={btnBlue(loading || quizFragen.length === 0)} onClick={starten} disabled={loading || quizFragen.length === 0}>
          {loading ? <Loader size={16} strokeWidth={2}/> : <Play size={16} strokeWidth={2}/>}
          Quiz starten
        </button>
      </div>
    );
  }

  // ── Aktives/beendetes Quiz ────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Status-Bar */}
      <div style={{ flexShrink: 0, padding: "12px 24px",
        background: "rgba(59,130,246,0.08)", borderBottom: "1px solid rgba(59,130,246,0.15)",
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

        {/* Code + QR */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,246,252,0.4)",
            textTransform: "uppercase", letterSpacing: ".06em" }}>Code:</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: BLUE,
            fontFamily: "'Fira Code', monospace", letterSpacing: ".2em" }}>{aktCode}</span>
          <button onClick={kopiereCode} title="Link kopieren"
            style={{ background: "none", border: "none", cursor: "pointer", color: copied ? GREEN : "rgba(240,246,252,0.4)", padding: 4 }}>
            {copied ? <Check size={15} strokeWidth={2.5}/> : <Copy size={15} strokeWidth={1.8}/>}
          </button>
        </div>

        {/* QR-Code für Schüler */}
        {joinUrl && !isBeendet && (
          <div style={{ display: "flex", alignItems: "center", gap: 10,
            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 10, padding: "8px 14px" }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&color=f0f6fc&bgcolor=0d1117&data=${encodeURIComponent(joinUrl)}`}
              alt="QR Code" width={72} height={72}
              style={{ borderRadius: 6, border: "1px solid rgba(240,246,252,0.1)", flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,246,252,0.5)",
                marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
                <QrCode size={11} strokeWidth={2}/> QR-Code für Schüler
              </div>
              <div style={{ fontSize: 10, color: "rgba(240,246,252,0.3)", fontFamily: "'Fira Code', monospace",
                wordBreak: "break-all", maxWidth: 200, lineHeight: 1.4 }}>
                {joinUrl.replace("https://", "")}
              </div>
              <button onClick={kopiereCode}
                style={{ marginTop: 5, padding: "4px 10px", borderRadius: 6,
                  background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
                  color: BLUE, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                {copied ? "✓ Kopiert!" : "Link kopieren"}
              </button>
            </div>
          </div>
        )}

        <span style={{ fontSize: 12, color: "rgba(240,246,252,0.4)" }}>
          {isBeendet ? "Beendet" : `Frage ${frageNr + 1} / ${frageGes}`}
        </span>

        <span style={{ background: isBeendet ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.12)",
          color: isBeendet ? RED : GREEN,
          border: `1px solid ${isBeendet ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.25)"}`,
          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: ".06em" }}>
          {isBeendet ? "Beendet" : "Läuft"}
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {isLaufend && (
            <>
              <button style={{ ...btnBlue(false), background: "rgba(59,130,246,0.15)",
                color: BLUE, border: `1px solid ${BLUE}`, fontSize: 13 }}
                onClick={naechsteFrage}>
                <SkipForward size={14} strokeWidth={2}/>
                {frageNr + 1 >= frageGes ? "Quiz beenden" : "Nächste Frage"}
              </button>
              <button style={{ ...btnBlue(false), background: "rgba(248,113,113,0.12)",
                color: RED, border: `1px solid rgba(248,113,113,0.3)`, fontSize: 13 }}
                onClick={() => { if (confirm("Quiz jetzt stoppen?")) stoppeQuiz(); }}>
                <Square size={14} strokeWidth={2}/> Stopp
              </button>
            </>
          )}
          {isBeendet && (
            <button style={{ ...btnBlue(false), fontSize: 13 }} onClick={() => setAktCode(null)}>
              <RefreshCw size={14} strokeWidth={2}/> Neues Quiz
            </button>
          )}
        </div>
      </div>

      {/* Zweispaltig: Frage | Rangliste */}
      <div style={{ flex: 1, overflow: "auto", display: "grid",
        gridTemplateColumns: isBeendet ? "1fr" : "1fr 1fr", gap: 0 }}>

        {/* Aktuelle Frage (nur bei laufendem Quiz) */}
        {!isBeendet && (
          <div style={{ padding: 24, borderRight: "1px solid rgba(240,246,252,0.06)",
            display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,246,252,0.35)",
              textTransform: "uppercase", letterSpacing: ".06em" }}>
              Aktuelle Frage ({frageNr + 1}/{frageGes})
            </div>
            {frage ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f6fc", lineHeight: 1.6 }}>
                  {frage.text}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(frage.optionen || []).map((opt, i) => (
                    <div key={i} style={{
                      padding: "10px 14px", borderRadius: 9,
                      background: i === frage.richtig ? "rgba(74,222,128,0.1)" : "rgba(240,246,252,0.04)",
                      border: `1px solid ${i === frage.richtig ? "rgba(74,222,128,0.3)" : "rgba(240,246,252,0.08)"}`,
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: i === frage.richtig ? "rgba(74,222,128,0.2)" : "rgba(240,246,252,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, color: i === frage.richtig ? GREEN : "rgba(240,246,252,0.4)" }}>
                        {["A","B","C","D"][i]}
                      </span>
                      <span style={{ fontSize: 13, color: i === frage.richtig ? GREEN : "rgba(240,246,252,0.7)",
                        fontFamily: "'Fira Code', monospace" }}>
                        {opt}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "rgba(240,246,252,0.3)" }}>
                  {frage.punkte} Punkte · {frage.zeitlimit} s
                </div>
              </>
            ) : (
              <div style={{ color: "rgba(240,246,252,0.3)", fontSize: 13 }}>Frage wird geladen…</div>
            )}
          </div>
        )}

        {/* Rangliste */}
        <div style={{ padding: 24, overflow: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,246,252,0.35)",
            textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>
            {isBeendet ? "Endergebnis" : "Live-Rangliste"} ({ergebnisse.length} Teilnehmer)
          </div>
          <Leaderboard ergebnisse={ergebnisse} fragen_gesamt={isBeendet ? frageGes : 0} />
        </div>
      </div>
    </div>
  );
}
