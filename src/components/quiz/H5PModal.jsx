// ══════════════════════════════════════════════════════════════════════════════
// H5PModal – Quiz & Export Wizard
// 3 Pfade: Live-Session · ByCS Lernplattform · Offline/iPad
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import {
  Monitor, Download, Eye, QrCode, Play, SkipForward, Square,
  Copy, Check, Loader, ChevronLeft, GraduationCap, Zap, Users,
} from "lucide-react";
import { apiFetch, API_URL } from "../../api.js";
import { generiereAlleQuizFragen, generateQuizHTML, bestimmeFragetyp } from "../../utils/quizGenerator.js";
import { quizStarten, quizLoeschen } from "../../api/teacherApi.js";
import { aufgabenZuQuizFragen } from "../QuizControl.jsx";
import { useQuiz } from "../../hooks/useQuiz.js";

// ── Beleg → HTML (für H5P-Aufgabenbeschreibung) ──────────────────────────────
function belegDataZuHtml(b) {
  if (!b) return "";
  const fmt2 = n => n != null ? Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" : "";
  const zeile = (l, v) => v ? `<br><strong>${l}:</strong> ${v}` : "";
  let titel = "", inhalt = "";
  if (b.typ === "email") {
    titel = "E-Mail";
    inhalt = [zeile("Von", b.vonName || b.von), zeile("An", b.an), zeile("Betreff", b.betreff), zeile("Datum", b.datum), zeile("Text", b.text)].join("");
  } else if (b.typ === "rechnung") {
    titel = "Eingangsrechnung";
    const pos = (b.positionen || []).filter(p => !p.isRabatt).map(p => `${p.menge ? p.menge + " " + p.einheit + " " : ""}${p.beschr}`).join(", ");
    inhalt = [zeile("Ware", pos), zeile("Netto", fmt2(b.netto)), zeile("USt " + (b.ustPct || 19) + " %", fmt2(b.ustBetrag)), zeile("Brutto", fmt2(b.brutto)), b.skonto ? zeile("Skonto", b.skonto + " %") : ""].join("");
  } else if (b.typ === "kontoauszug") {
    titel = "Kontoauszug";
    inhalt = (b.buchungen || []).map(bk => `<br>${bk.datum || ""} | ${bk.vz === "s" ? "Soll" : "Haben"} | ${fmt2(bk.betrag)} | ${bk.zweck || ""}`).join("");
  } else if (b.typ === "ueberweisung") {
    titel = "Überweisung";
    inhalt = [zeile("Empfänger", b.empfaenger), zeile("Betrag", fmt2(b.betrag)), zeile("Zweck", b.zweck)].join("");
  } else {
    titel = b.typ || "Beleg";
  }
  return `<p><strong>📄 ${titel}</strong>${inhalt}</p>`;
}

function h5pUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function generiereH5PContent(fragen, config, firma) {
  const questions = fragen.map(f => {
    const subContentId = h5pUuid();
    if (f.typ === "single_choice") {
      const antworten = f.antworten || [];
      const richtigIdx = antworten.indexOf(f.richtig);
      const answers = antworten.map((opt, i) => ({
        correct: i === richtigIdx,
        text: String(opt).replace(/<[^>]*>/g, ""),
        tipsAndFeedback: { tip: "", chosenFeedback: "", notChosenFeedback: "" },
      }));
      return {
        library: "H5P.MultiChoice 1.16", subContentId,
        params: {
          question: `<p>${String(f.frage || "").replace(/<[^>]*>/g, "")}</p>${f.belegData ? belegDataZuHtml(f.belegData) : ""}`,
          answers,
          behaviour: { enableRetry: true, enableSolutionsButton: true, singleAnswer: true, showSolutionsRequiresInput: false, autoCheck: false },
          UI: { checkAnswerButton: "Überprüfen", showSolutionButton: "Lösung anzeigen", tryAgainButton: "Nochmal", scoreBarLabel: "Punkte" },
          overallFeedback: [{ from: 0, to: 49, feedback: "Leider falsch. Schau nochmal." }, { from: 50, to: 100, feedback: "Richtig!" }],
        },
        metadata: { contentType: "Multiple Choice", license: "U", title: String(f.frage || "").replace(/<[^>]*>/g, " ").trim().slice(0, 60), defaultLanguage: "de" },
      };
    }
    if (f.typ === "true_false") {
      return {
        library: "H5P.MultiChoice 1.16", subContentId,
        params: {
          question: `<p>${String(f.frage || "").replace(/<[^>]*>/g, " ").trim()}</p>`,
          answers: [
            { correct: f.antwort === true, text: "Ja", tipsAndFeedback: { tip: "", chosenFeedback: f.antwort === true ? "✓ " + f.begruendung : "", notChosenFeedback: "" } },
            { correct: f.antwort === false, text: "Nein", tipsAndFeedback: { tip: "", chosenFeedback: f.antwort === false ? "✓ " + f.begruendung : "", notChosenFeedback: "" } },
          ],
          behaviour: { enableRetry: true, enableSolutionsButton: true, singleAnswer: true, showSolutionsRequiresInput: false },
          UI: { checkAnswerButton: "Überprüfen", showSolutionButton: "Lösung anzeigen", tryAgainButton: "Nochmal", scoreBarLabel: "Punkte" },
          overallFeedback: [{ from: 0, to: 49, feedback: "Falsch." }, { from: 50, to: 100, feedback: "Richtig!" }],
        },
        metadata: { contentType: "Multiple Choice", license: "U", title: String(f.frage || "").replace(/<[^>]*>/g, " ").trim().slice(0, 60), defaultLanguage: "de" },
      };
    }
    if (f.typ === "drag_konten") {
      const sollZeilen = (f.sollSlots || []).map(s => `*${s.antwort}*`).join("\n");
      const habenZeilen = (f.habenSlots || []).map(h => `*${h.antwort}*`).join("\n");
      const textField = "Soll:\n" + (sollZeilen || "*Konto*") + "\nan\nHaben:\n" + (habenZeilen || "*Konto*");
      const belegHtml = f.belegData ? belegDataZuHtml(f.belegData) : "";
      return {
        library: "H5P.DragText 1.10", subContentId,
        params: {
          taskDescription: `<p>${String(f.frage || "").replace(/<strong>/g, "").replace(/<\/strong>/g, "").replace(/<br>/g, " ").replace(/<[^>]*>/g, " ").trim()}</p>${belegHtml}`,
          textField,
          behaviour: { enableRetry: true, enableSolutionsButton: true, showSolutionsRequiresInput: false, instantFeedback: false },
          overallFeedback: [{ from: 0, to: 49, feedback: "Nochmal versuchen!" }, { from: 50, to: 100, feedback: "Richtig!" }],
          checkAnswer: "Überprüfen", showSolution: "Lösung anzeigen", tryAgain: "Nochmal",
        },
        metadata: { contentType: "Drag Text", license: "U", title: String(f.frage || "").replace(/<[^>]*>/g, " ").trim().slice(0, 60), defaultLanguage: "de" },
      };
    }
    if (f.typ === "fill_blanks") {
      const felder = f.felder || [];
      const questions2 = felder.length
        ? felder.map(feld => `${feld.label ? feld.label + ": " : ""}*${feld.antwort}*`)
        : [String(f.lueckentext || f.frage || "").replace(/<[^>]*>/g, " ").trim()];
      return {
        library: "H5P.Blanks 1.14", subContentId,
        params: {
          text: `<p>${String(f.frage || "").replace(/<[^>]*>/g, " ").trim()}</p>${f.belegData ? belegDataZuHtml(f.belegData) : ""}`,
          questions: questions2,
          behaviour: { enableRetry: true, enableSolutionsButton: true, showSolutionsRequiresInput: false, caseSensitive: false, showSolutionButton: "end", autoCheck: false },
          UI: { checkAnswerButton: "Überprüfen", showSolutionButton: "Lösung", tryAgainButton: "Nochmal", scoreBarLabel: "Punkte" },
          overallFeedback: [{ from: 0, to: 49, feedback: "Schau nochmal nach." }, { from: 50, to: 100, feedback: "Gut gemacht!" }],
        },
        metadata: { contentType: "Fill in the Blanks", license: "U", title: String(f.frage || "").replace(/<[^>]*>/g, " ").trim().slice(0, 60), defaultLanguage: "de" },
      };
    }
    if (f.typ === "drag_kalk") {
      const zeilen = f.zeilen || [];
      const questions2 = zeilen.filter(z => z.antwort != null).map(z => `${z.label}: *${z.antwort}*`);
      return {
        library: "H5P.Blanks 1.14", subContentId,
        params: {
          text: `<p>${String(f.frage || "").replace(/<[^>]*>/g, " ").trim()}</p>`,
          questions: questions2.length ? questions2 : ["*Wert*"],
          behaviour: { enableRetry: true, enableSolutionsButton: true, showSolutionsRequiresInput: false, caseSensitive: false, autoCheck: false },
          UI: { checkAnswerButton: "Überprüfen", showSolutionButton: "Lösung", tryAgainButton: "Nochmal", scoreBarLabel: "Punkte" },
          overallFeedback: [{ from: 0, to: 49, feedback: "Schau nochmal nach." }, { from: 50, to: 100, feedback: "Richtig!" }],
        },
        metadata: { contentType: "Fill in the Blanks", license: "U", title: String(f.frage || "").replace(/<[^>]*>/g, " ").trim().slice(0, 60), defaultLanguage: "de" },
      };
    }
    return null;
  }).filter(Boolean);

  return {
    introPage: {
      showIntroPage: true,
      title: `BuchungsWerk – Klasse ${config.klasse}`,
      introduction: `<p>Interaktive Aufgaben für ${config.typ}${firma?.name ? " · " + firma.name : ""}.<br>Bearbeite alle Aufgaben sorgfältig.</p>`,
      startButtonText: "Starten →",
    },
    progressType: "dots",
    passPercentage: 50,
    questions,
    endGame: {
      showResultPage: true,
      noResultMessage: "Du hast alle Aufgaben bearbeitet.",
      message: "Ergebnis:",
      overallFeedback: [
        { from: 0, to: 49, feedback: "Noch üben – schau nochmal in deine Unterlagen!" },
        { from: 50, to: 79, feedback: "Gut gemacht! Du kennst schon vieles." },
        { from: 80, to: 100, feedback: "Ausgezeichnet! Top-Leistung!" },
      ],
      solutionButtonText: "Lösung anzeigen",
      retryButtonText: "Wiederholen",
      finishButtonText: "Fertig",
      showAnimations: false,
      skippable: false,
      skipButtonText: "Überspringen",
    },
    override: { checkButton: true },
    texts: {
      prevButton: "Zurück", nextButton: "Weiter", finishButton: "Beenden",
      textualProgress: "Aufgabe @current von @total",
      jumpToQuestion: "Frage %d von %total", questionLabel: "Frage",
      readSpeakerProgress: "Aufgabe @current von @total",
      unansweredText: "Unbeantwortet", answeredText: "Beantwortet",
      currentQuestionText: "Aktuelle Frage",
    },
  };
}

const QUIZ_TYPEN = [
  { key: "drag_konten",   label: "Kontenplan-Drag" },
  { key: "fill_blanks",   label: "Lückentext" },
  { key: "single_choice", label: "Multiple Choice" },
  { key: "true_false",    label: "Wahr/Falsch" },
  { key: "drag_kalk",     label: "Kalkulation" },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const ORANGE = "#e8600a";
const BLUE   = "#3b82f6";
const GREEN  = "#4ade80";
const BONE   = "rgba(240,236,227,0.85)";
const SUB    = "rgba(240,236,227,0.4)";
const PANEL  = "rgba(240,236,227,0.05)";
const BORDER = "rgba(240,236,227,0.1)";

const S2 = {
  infoBox: { background: PANEL, borderRadius: "12px", padding: "13px 15px", marginBottom: "14px", fontSize: "13px", color: SUB, lineHeight: 1.7, border: `1px solid ${BORDER}` },
  sectionLbl: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SUB, marginBottom: "9px" },
  aufgRow: { display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", background: PANEL, borderRadius: "9px", marginBottom: "6px", flexWrap: "wrap" },
  aufgNr: { fontSize: "11px", fontWeight: 800, color: ORANGE, minWidth: "24px" },
  aufgTxt: { fontSize: "12px", color: "#e2e8f0", flex: 1, minWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  typPill: (active) => ({ padding: "4px 8px", borderRadius: "6px", border: "1px solid", fontSize: "10px", fontWeight: 700, cursor: "pointer", borderColor: active ? ORANGE : "#334155", background: active ? ORANGE : "transparent", color: active ? "#0f172a" : "#64748b" }),
  bigBtn: (bg) => ({ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: bg, color: "#fff", fontWeight: 800, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }),
  outlineBtn: { flex: 1, padding: "12px", borderRadius: "10px", border: "1.5px solid #334155", background: "transparent", color: "#e2e8f0", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
};

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
function H5PModal({ aufgaben, config, firma, onSchliessen }) {
  // Wizard-State
  const [ziel, setZiel] = useState(null); // null | "live" | "bycs" | "offline"

  // Live-Session-State
  const [liveCode,     setLiveCode]     = useState(null);
  const [liveStarting, setLiveStarting] = useState(false);
  const [liveCopied,   setLiveCopied]   = useState(false);
  const [liveError,    setLiveError]    = useState("");

  // ByCS + Offline: Fragentyp pro Aufgabe
  const [fragenTypen, setFragenTypen] = useState(() =>
    aufgaben.map(a => ({ id: a.id, typ: bestimmeFragetyp(a) }))
  );
  const setTyp = (id, typ) =>
    setFragenTypen(prev => prev.map(ft => ft.id === id ? { ...ft, typ } : ft));

  // Live-Quiz Polling (nur aktiv wenn liveCode gesetzt)
  const { quiz, ergebnisse, naechsteFrage, stoppeQuiz } = useQuiz(liveCode);

  // Live-Quiz Hilfswerte
  const joinUrl    = liveCode ? `${window.location.origin}?join=${liveCode}` : "";
  const isLaufend  = quiz?.status === "laufend";
  const isBeendet  = quiz?.status === "beendet";
  const frageNr    = quiz?.frage_nr ?? 0;
  const frageGes   = quiz?.fragen_gesamt ?? 0;
  const teilnehmer = ergebnisse?.length ?? 0;

  // Quiz-Fragen für Live-Session (Multiple-Choice, aus QuizControl-Konvertierung)
  const quizFragen = useMemo(() => aufgabenZuQuizFragen(aufgaben), [aufgaben]);

  // Anzahl der quiz-fähigen Fragen für Offline/ByCS
  const frageAnzahl = useMemo(
    () => generiereAlleQuizFragen(aufgaben, fragenTypen).length,
    [aufgaben, fragenTypen]
  );

  // ── Live-Session starten ───────────────────────────────────────────────────
  async function starteSession() {
    if (!quizFragen.length) { setLiveError("Keine quiz-fähigen Aufgaben vorhanden."); return; }
    setLiveStarting(true); setLiveError("");
    try {
      const res = await quizStarten(
        `${config.typ || "BwR"} · Klasse ${config.klasse || "?"}`,
        quizFragen
      );
      setLiveCode(res.code);
    } catch (e) { setLiveError("Fehler beim Starten: " + e.message); }
    finally { setLiveStarting(false); }
  }

  // ── Session beenden + Daten löschen ────────────────────────────────────────
  async function beendeSession() {
    try { await stoppeQuiz(); } catch {}
    try { if (liveCode) await quizLoeschen(liveCode); } catch {}
    setLiveCode(null);
    setZiel(null);
  }

  // ── Offline: Session erstellen + HTML ────────────────────────────────────
  async function erstelleSession() {
    try {
      const res = await apiFetch("/sessions", "POST", {
        titel: config.typ,
        klasse_stufe: config.klasse,
        pruefungsart: config.pruefungsart || null,
        config_json: JSON.stringify({ ...config, firma: firma?.name }),
      });
      return res?.id ?? null;
    } catch { return null; }
  }

  async function downloadQuiz() {
    const sessionId = await erstelleSession();
    const html = generateQuizHTML({ aufgaben, config, firma, fragenTypen, apiUrl: API_URL, sessionId });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `BuchungsWerk_Quiz_Kl${config.klasse}_${config.datum || "2026"}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function vorschauQuiz() {
    const sessionId = await erstelleSession();
    const html = generateQuizHTML({ aufgaben, config, firma, fragenTypen, apiUrl: API_URL, sessionId });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  // ── Fragentyp-Picker (ByCS + Offline) ────────────────────────────────────
  function FragenTypPicker() {
    return (
      <div style={{ marginBottom: "16px" }}>
        <div style={S2.sectionLbl}>{frageAnzahl} Fragen · Typ pro Aufgabe</div>
        {aufgaben.map((a, i) => {
          const aktTyp = fragenTypen.find(ft => ft.id === a.id)?.typ ?? bestimmeFragetyp(a);
          const verfuegbar = a.taskTyp === "rechnung"
            ? [QUIZ_TYPEN.find(t => t.key === "drag_kalk")]
            : a.taskTyp === "theorie"
            ? [QUIZ_TYPEN.find(t => t.key === "single_choice"), QUIZ_TYPEN.find(t => t.key === "true_false")]
            : QUIZ_TYPEN.filter(t => t.key !== "drag_kalk");
          const kurzTxt = (a.aufgabe || "").replace(/<[^>]*>/g, "").slice(0, 44);
          return (
            <div key={a.id} style={S2.aufgRow}>
              <span style={S2.aufgNr}>#{i + 1}</span>
              <span style={S2.aufgTxt} title={(a.aufgabe || "").replace(/<[^>]*>/g, "")}>{kurzTxt}</span>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {verfuegbar.filter(Boolean).map(t => (
                  <button key={t.key} onClick={() => setTyp(a.id, t.key)}
                    style={S2.typPill(aktTyp === t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#0f172a", borderRadius: "16px", width: "100%", maxWidth: "600px", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div style={{ padding: "18px 22px 14px", flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {ziel && (
                <button onClick={() => { setZiel(null); setLiveCode(null); setLiveError(""); }}
                  style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: SUB, width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronLeft size={16} strokeWidth={2} />
                </button>
              )}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", marginBottom: "1px" }}>
                  {ziel === "live" ? "Live-Session" : ziel === "bycs" ? "ByCS Lernplattform" : ziel === "offline" ? "Offline / iPad" : "Quiz & Export"}
                </div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 7 }}>
                  {ziel === "live" ? <><Zap size={17} strokeWidth={1.5} color={GREEN} />Live-Quiz</>
                   : ziel === "bycs" ? <><GraduationCap size={17} strokeWidth={1.5} color={BLUE} />ByCS Export</>
                   : ziel === "offline" ? <><Monitor size={17} strokeWidth={1.5} />Offline-Quiz</>
                   : <><Monitor size={17} strokeWidth={1.5} />Quiz & Export</>}
                </div>
              </div>
            </div>
            <button onClick={onSchliessen}
              style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "8px", color: "#94a3b8", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px" }}>
              ×
            </button>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div style={{ overflowY: "auto", padding: "20px 22px", flex: 1 }}>

          {/* ── STARTSCREEN: Ziel wählen ──────────────────────────────── */}
          {!ziel && (
            <div>
              <p style={{ fontSize: "13px", color: SUB, marginBottom: "20px", marginTop: 0 }}>
                Wähle, wie du deine <strong style={{ color: BONE }}>{aufgaben.length} Aufgaben</strong> exportieren oder teilen möchtest:
              </p>

              {/* Card: Live-Session */}
              <button onClick={() => setZiel("live")} style={{
                width: "100%", textAlign: "left", padding: "16px 18px", borderRadius: "12px",
                border: "1.5px solid rgba(74,222,128,0.25)", background: "rgba(74,222,128,0.05)",
                cursor: "pointer", marginBottom: "10px", display: "flex", alignItems: "flex-start", gap: 14,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Zap size={20} color={GREEN} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: GREEN, marginBottom: 3 }}>Live-Session</div>
                  <div style={{ fontSize: "12px", color: "rgba(74,222,128,0.65)", lineHeight: 1.6 }}>
                    Schüler scannen QR-Code · Namen eingeben · Aufgaben lösen<br />
                    <span style={{ color: "rgba(74,222,128,0.45)", fontSize: "11px" }}>Lehrer sieht Ergebnisse in Echtzeit · Alle Daten nach Session gelöscht</span>
                  </div>
                </div>
              </button>

              {/* Card: ByCS */}
              <button onClick={() => setZiel("bycs")} style={{
                width: "100%", textAlign: "left", padding: "16px 18px", borderRadius: "12px",
                border: "1.5px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.05)",
                cursor: "pointer", marginBottom: "10px", display: "flex", alignItems: "flex-start", gap: 14,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <GraduationCap size={20} color={BLUE} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: BLUE, marginBottom: 3 }}>ByCS Lernplattform</div>
                  <div style={{ fontSize: "12px", color: "rgba(59,130,246,0.65)", lineHeight: 1.6 }}>
                    .h5p-Datei herunterladen · Direkt in ByCS-Kurs hochladen<br />
                    <span style={{ color: "rgba(59,130,246,0.45)", fontSize: "11px" }}>Buchungssatz-Drag · Lückentext · Multiple Choice</span>
                  </div>
                </div>
              </button>

              {/* Card: Offline */}
              <button onClick={() => setZiel("offline")} style={{
                width: "100%", textAlign: "left", padding: "16px 18px", borderRadius: "12px",
                border: `1.5px solid ${BORDER}`, background: PANEL,
                cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 14,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(240,236,227,0.08)", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Monitor size={20} color={BONE} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: BONE, marginBottom: 3 }}>Offline / iPad</div>
                  <div style={{ fontSize: "12px", color: SUB, lineHeight: 1.6 }}>
                    HTML-Datei herunterladen · Ohne Internet nutzbar<br />
                    <span style={{ color: "rgba(240,236,227,0.3)", fontSize: "11px" }}>iPad-optimiert · Kontenplan eingebettet · Belege vollständig</span>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ── LIVE-SESSION ────────────────────────────────────────────── */}
          {ziel === "live" && !liveCode && (
            <div>
              <div style={{ ...S2.infoBox, borderLeft: `3px solid ${GREEN}` }}>
                <div style={{ fontSize: "13px", color: GREEN, fontWeight: 700, marginBottom: 6 }}>Wie funktioniert die Live-Session?</div>
                <div style={{ color: "rgba(74,222,128,0.7)", lineHeight: 1.7, fontSize: "12px" }}>
                  1. Session starten → QR-Code erscheint<br />
                  2. Schüler scannen QR mit iPad-Kamera → geben nur ihren Namen ein<br />
                  3. Lehrer steuert das Tempo (Frage für Frage wie Kahoot)<br />
                  4. Live-Dashboard zeigt Ergebnisse in Echtzeit<br />
                  5. Session beenden → alle Namen & Antworten werden sofort gelöscht
                </div>
              </div>

              {quizFragen.length === 0 ? (
                <div style={{ ...S2.infoBox, borderLeft: "3px solid #fbbf24", color: "#fbbf24" }}>
                  <strong>Keine quiz-fähigen Aufgaben gefunden.</strong><br />
                  <span style={{ fontSize: "12px", color: "rgba(251,191,36,0.7)" }}>
                    Buchungsaufgaben mit Soll/Haben oder Theorie-Multiple-Choice werden benötigt.
                  </span>
                </div>
              ) : (
                <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: GREEN, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={14} strokeWidth={2.5} /> {quizFragen.length} Fragen bereit (Multiple-Choice, automatisch generiert)
                </div>
              )}

              {liveError && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: 12 }}>{liveError}</div>}

              <div style={{ background: "rgba(240,236,227,0.04)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", fontSize: "11px", color: "rgba(240,236,227,0.35)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                🔒 Kein Login für Schüler nötig · Nur Name zur Zuordnung · Automatisch gelöscht nach Session
              </div>

              <button onClick={starteSession} disabled={liveStarting || !quizFragen.length}
                style={{ ...S2.bigBtn(quizFragen.length ? GREEN : "#334155"), color: quizFragen.length ? "#0f172a" : "#64748b", width: "100%", opacity: quizFragen.length ? 1 : 0.5 }}>
                {liveStarting ? <><Loader size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />Starte Session…</>
                  : <><Play size={16} strokeWidth={2} />Live-Session starten</>}
              </button>
            </div>
          )}

          {/* ── LIVE-SESSION AKTIV: Dashboard ──────────────────────────── */}
          {ziel === "live" && liveCode && (
            <div>
              {/* QR + Code */}
              <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
                <div style={{ background: "#fff", borderRadius: 12, padding: 10, flexShrink: 0 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=0f172a&bgcolor=ffffff&data=${encodeURIComponent(joinUrl)}`}
                    alt="QR Code für Schüler" width={120} height={120}
                    style={{ display: "block", borderRadius: 6 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: SUB, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Quiz-Code</div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: GREEN, fontFamily: "'Fira Code', monospace", letterSpacing: ".2em", marginBottom: 8 }}>{liveCode}</div>
                  <button onClick={() => { navigator.clipboard?.writeText(joinUrl).catch(() => {}); setLiveCopied(true); setTimeout(() => setLiveCopied(false), 2000); }}
                    style={{ padding: "6px 12px", borderRadius: "8px", border: `1px solid ${BORDER}`, background: PANEL, color: liveCopied ? GREEN : SUB, fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                    {liveCopied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={1.8} />}
                    {liveCopied ? "Kopiert!" : "Link kopieren"}
                  </button>
                  <div style={{ fontSize: "10px", color: "rgba(240,236,227,0.25)", marginTop: 4, wordBreak: "break-all" }}>
                    {joinUrl.replace("https://", "")}
                  </div>
                </div>
              </div>

              {/* Status & Steuerung */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: "11px", color: SUB, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>
                      {isBeendet ? "Session beendet" : isLaufend ? "Läuft" : "Warte auf Schüler…"}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: isBeendet ? "#64748b" : GREEN }}>
                      {isBeendet ? "Fertig" : `Frage ${frageNr + 1} / ${frageGes}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: SUB, fontSize: "13px" }}>
                    <Users size={14} strokeWidth={1.5} />{teilnehmer} Schüler
                  </div>
                </div>

                {!isBeendet && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={naechsteFrage} disabled={isBeendet}
                      style={{ ...S2.bigBtn(BLUE), flex: 2 }}>
                      <SkipForward size={14} strokeWidth={2} />
                      {frageNr + 1 >= frageGes ? "Quiz beenden" : "Nächste Frage"}
                    </button>
                    <button onClick={beendeSession}
                      style={{ ...S2.bigBtn("#dc2626"), flex: 1 }}>
                      <Square size={13} strokeWidth={2} />Beenden
                    </button>
                  </div>
                )}
                {isBeendet && (
                  <button onClick={beendeSession}
                    style={{ ...S2.bigBtn("#334155"), width: "100%" }}>
                    Session schließen & Daten löschen
                  </button>
                )}
              </div>

              {/* Live-Ergebnisse */}
              {ergebnisse.length > 0 && (
                <div>
                  <div style={S2.sectionLbl}>Live-Ergebnisse</div>
                  {ergebnisse.slice(0, 12).map((e, i) => {
                    const pct = frageNr > 0 ? Math.round((e.richtig / frageNr) * 100) : 0;
                    return (
                      <div key={e.spieler} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: PANEL, borderRadius: 9, marginBottom: 5 }}>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7f32" : SUB, minWidth: 20 }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontSize: "13px", color: BONE, flex: 1, fontWeight: 600 }}>{e.spieler}</span>
                        <span style={{ fontSize: "12px", color: pct >= 70 ? GREEN : pct >= 50 ? "#fbbf24" : "#f87171", fontWeight: 700 }}>
                          {e.richtig}/{e.beantwortet} ✓
                        </span>
                        <span style={{ fontSize: "12px", color: ORANGE, fontWeight: 800 }}>{e.gesamt_punkte}P</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {ergebnisse.length === 0 && isLaufend && (
                <div style={{ textAlign: "center", padding: "20px", color: SUB, fontSize: "12px" }}>
                  <Loader size={18} style={{ animation: "spin 1.2s linear infinite", margin: "0 auto 8px", display: "block" }} />
                  Warte auf erste Antworten…
                </div>
              )}
            </div>
          )}

          {/* ── ByCS LERNPLATTFORM ──────────────────────────────────────── */}
          {ziel === "bycs" && (
            <div>
              <div style={{ ...S2.infoBox, borderLeft: `3px solid ${BLUE}` }}>
                <div style={{ fontSize: "13px", color: BLUE, fontWeight: 700, marginBottom: 7 }}>H5P-Export für ByCS Lernplattform</div>
                Erzeugt eine echte <strong>.h5p-Datei</strong> (Question Set), die direkt in einen ByCS-Kurs hochgeladen werden kann. Jede Aufgabe wird als interaktive H5P-Aktivität exportiert.
              </div>

              <FragenTypPicker />

              <div style={{ marginBottom: 14 }}>
                {[
                  ["Buchungssatz-Aufgaben", "Drag & Drop – Soll/Haben zuordnen"],
                  ["Rechnung / Schema", "Lückentext – Werte eintragen"],
                  ["Theorie-Aufgaben", "Multiple Choice"],
                ].map(([typ, hint]) => (
                  <div key={typ} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#1e293b", borderRadius: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 600, flex: 1 }}>{typ}</span>
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>{hint}</span>
                  </div>
                ))}
              </div>

              <button onClick={async () => {
                try {
                  if (!window.JSZip) {
                    await new Promise((res, rej) => {
                      const s = document.createElement("script");
                      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
                      s.onload = res; s.onerror = rej; document.head.appendChild(s);
                    });
                  }
                  const fragen = generiereAlleQuizFragen(aufgaben, fragenTypen);
                  const h5pContent = generiereH5PContent(fragen, config, firma);
                  const zip = new window.JSZip();
                  zip.file("h5p.json", JSON.stringify({
                    title: `BuchungsWerk ${config.typ} Klasse ${config.klasse}`,
                    language: "de",
                    mainLibrary: "H5P.QuestionSet",
                    license: "U",
                    embedTypes: ["div"],
                    preloadedDependencies: [
                      { machineName: "H5P.QuestionSet", majorVersion: 1, minorVersion: 20 },
                      { machineName: "H5P.MultiChoice", majorVersion: 1, minorVersion: 16 },
                      { machineName: "H5P.Blanks", majorVersion: 1, minorVersion: 14 },
                      { machineName: "H5P.DragText", majorVersion: 1, minorVersion: 10 },
                      { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
                      { machineName: "H5P.FontIcons", majorVersion: 1, minorVersion: 0 },
                    ],
                  }, null, 2));
                  zip.file("content/content.json", JSON.stringify(h5pContent, null, 2));
                  Object.keys(zip.files).forEach(k => { if (zip.files[k].dir) delete zip.files[k]; });
                  const blob = await zip.generateAsync({ type: "blob", createFolders: false });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `BuchungsWerk_Kl${config.klasse}_${config.datum || "2026"}.h5p`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                } catch (e) { alert("H5P-Export Fehler: " + e.message); }
              }} style={S2.bigBtn(BLUE)}>
                <Download size={14} strokeWidth={1.5} />.h5p herunterladen
              </button>

              <div style={{ marginTop: 10, fontSize: "11px", color: "#475569", textAlign: "center", lineHeight: 1.6 }}>
                ByCS → Kurs öffnen → Aktivität hinzufügen → H5P → Datei hochladen
              </div>
            </div>
          )}

          {/* ── OFFLINE / iPAD ─────────────────────────────────────────── */}
          {ziel === "offline" && (
            <div>
              <div style={S2.infoBox}>
                Self-contained HTML für iPad – kein Internet nötig. Modus <strong style={{ color: ORANGE }}>Kontenplan-Drag</strong>: Schüler wählt Konten selbst aus dem vollständigen Kontenplan. Beleg wird vollständig angezeigt.
              </div>

              <FragenTypPicker />

              <div style={{ display: "flex", gap: "9px" }}>
                <button onClick={vorschauQuiz} style={S2.outlineBtn}>
                  <Eye size={13} strokeWidth={1.5} />Vorschau
                </button>
                <button onClick={downloadQuiz} style={S2.bigBtn(ORANGE)}>
                  <Download size={13} strokeWidth={1.5} />Herunterladen (.html)
                </button>
              </div>
              <div style={{ marginTop: "9px", fontSize: "11px", color: "#475569", textAlign: "center" }}>
                iPad-optimiert · Offline · Kontenplan eingebettet · Belege vollständig
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default H5PModal;
