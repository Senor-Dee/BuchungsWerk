// ══════════════════════════════════════════════════════════════════════════════
// H5PModal – Quiz-Generator und H5P-Export
// Extrahiert aus BuchungsWerk.jsx – Phase C6 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Zap, Download, Eye, Monitor, QrCode } from "lucide-react";
import { S } from "../../styles.js";
import { apiFetch, API_URL } from "../../api.js";
import { generiereAlleQuizFragen, generateQuizHTML } from "../../utils/quizGenerator.js";

// ── H5PModal ──────────────────────────────────────────────────────────────────
const QUIZ_TYPEN = [
  { key: "drag_konten",   label: "Kontenplan-Drag" },
  { key: "fill_blanks",   label: "Lückentext" },
  { key: "single_choice", label: "Multiple Choice" },
  { key: "true_false",    label: "Wahr/Falsch" },
  { key: "drag_kalk",     label: "Kalkulation" },
];

// ── Beleg → HTML (für H5P-Aufgabenbeschreibung) ──────────────────────────────
function belegDataZuHtml(b) {
  if (!b) return "";
  const fmt2 = n => n != null ? Number(n).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €" : "";
  const zeile = (l, v) => v ? `<br><strong>${l}:</strong> ${v}` : "";
  let titel = "", inhalt = "";
  if (b.typ === "email") {
    titel = "E-Mail";
    inhalt = [zeile("Von", b.vonName || b.von), zeile("An", b.an), zeile("Betreff", b.betreff), zeile("Datum", b.datum), zeile("Text", b.text)].join("");
  } else if (b.typ === "rechnung") {
    titel = "Eingangsrechnung";
    const pos = (b.positionen || []).filter(p => !p.isRabatt).map(p => `${p.menge ? p.menge+" "+p.einheit+" " : ""}${p.beschr}`).join(", ");
    inhalt = [zeile("Ware", pos), zeile("Netto", fmt2(b.netto)), zeile("USt " + (b.ustPct||19)+" %", fmt2(b.ustBetrag)), zeile("Brutto", fmt2(b.brutto)), b.skonto ? zeile("Skonto", b.skonto+" %") : ""].join("");
  } else if (b.typ === "kontoauszug") {
    titel = "Kontoauszug";
    inhalt = (b.buchungen || []).map(bk => `<br>${bk.datum||""} | ${bk.vz==="s"?"Soll":"Haben"} | ${fmt2(bk.betrag)} | ${bk.zweck||""}`).join("");
  } else if (b.typ === "ueberweisung") {
    titel = "Überweisung";
    inhalt = [zeile("Empfänger", b.empfaenger), zeile("Betrag", fmt2(b.betrag)), zeile("Zweck", b.zweck)].join("");
  } else {
    titel = b.typ || "Beleg";
  }
  return `<p><strong>📄 ${titel}</strong>${inhalt}</p>`;
}

// ── H5P Content Generator ─────────────────────────────────────────────────────
function h5pUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function generiereH5PContent(fragen, config, firma) {
  const questions = fragen.map(f => {
    const subContentId = h5pUuid();

    // ── MultiChoice: single_choice ─────────────────────────────────────────
    if (f.typ === "single_choice") {
      const antworten = f.antworten || [];
      const richtigIdx = antworten.indexOf(f.richtig);
      const answers = antworten.map((opt, i) => ({
        correct: i === richtigIdx,
        text: String(opt).replace(/<[^>]*>/g, ""),
        tipsAndFeedback: { tip:"", chosenFeedback:"", notChosenFeedback:"" },
      }));
      return {
        library: "H5P.MultiChoice 1.16",
        subContentId,
        params: {
          question: `<p>${String(f.frage||"").replace(/<[^>]*>/g, "")}</p>${f.belegData ? belegDataZuHtml(f.belegData) : ""}`,
          answers,
          behaviour: { enableRetry:true, enableSolutionsButton:true, singleAnswer:true, showSolutionsRequiresInput:false, autoCheck:false },
          UI: { checkAnswerButton:"Überprüfen", showSolutionButton:"Lösung anzeigen", tryAgainButton:"Nochmal", scoreBarLabel:"Punkte" },
          overallFeedback: [{ from:0, to:49, feedback:"Leider falsch. Schau nochmal." },{ from:50, to:100, feedback:"Richtig!" }],
        },
        metadata: { contentType:"Multiple Choice", license:"U", title: String(f.frage||"").replace(/<[^>]*>/g," ").trim().slice(0,60), defaultLanguage:"de" },
      };
    }

    // ── True/False ──────────────────────────────────────────────────────────
    if (f.typ === "true_false") {
      return {
        library: "H5P.MultiChoice 1.16",
        subContentId,
        params: {
          question: `<p>${String(f.frage||"").replace(/<[^>]*>/g," ").trim()}</p>`,
          answers: [
            { correct: f.antwort === true,  text: "Ja",  tipsAndFeedback:{ tip:"", chosenFeedback: f.antwort===true  ? "✓ "+f.begruendung : "", notChosenFeedback:"" } },
            { correct: f.antwort === false, text: "Nein", tipsAndFeedback:{ tip:"", chosenFeedback: f.antwort===false ? "✓ "+f.begruendung : "", notChosenFeedback:"" } },
          ],
          behaviour: { enableRetry:true, enableSolutionsButton:true, singleAnswer:true, showSolutionsRequiresInput:false },
          UI: { checkAnswerButton:"Überprüfen", showSolutionButton:"Lösung anzeigen", tryAgainButton:"Nochmal", scoreBarLabel:"Punkte" },
          overallFeedback: [{ from:0, to:49, feedback:"Falsch." },{ from:50, to:100, feedback:"Richtig!" }],
        },
        metadata: { contentType:"Multiple Choice", license:"U", title: String(f.frage||"").replace(/<[^>]*>/g," ").trim().slice(0,60), defaultLanguage:"de" },
      };
    }

    // ── DragText: drag_konten (Buchungssatz) ───────────────────────────────
    if (f.typ === "drag_konten") {
      // H5P.DragText: Zeilen mit \n trennen, Lücken mit *text*
      // Format: "Soll:\n*Nr Kürzel*\nan\nHaben:\n*Nr Kürzel*"
      const sollZeilen = (f.sollSlots || []).map(s => `*${s.antwort}*`).join("\n");
      const habenZeilen = (f.habenSlots || []).map(h => `*${h.antwort}*`).join("\n");
      const textField = "Soll:\n" + (sollZeilen || "*Konto*") + "\nan\nHaben:\n" + (habenZeilen || "*Konto*");
      const desc = String(f.frage||"").replace(/<[^>]*>/g," ").trim();
      // Belegs-HTML falls vorhanden
      const belegHtml = f.belegData ? belegDataZuHtml(f.belegData) : "";
      return {
        library: "H5P.DragText 1.10",
        subContentId,
        params: {
          taskDescription: `<p>${String(f.frage||"").replace(/<strong>/g,"").replace(/<\/strong>/g,"").replace(/<br>/g," ").replace(/<[^>]*>/g," ").trim()}</p>${belegHtml}`,
          textField,
          behaviour: { enableRetry:true, enableSolutionsButton:true, showSolutionsRequiresInput:false, instantFeedback:false },
          overallFeedback: [{ from:0, to:49, feedback:"Nochmal versuchen!" },{ from:50, to:100, feedback:"Richtig!" }],
          checkAnswer:"Überprüfen", showSolution:"Lösung anzeigen", tryAgain:"Nochmal",
        },
        metadata: { contentType:"Drag Text", license:"U", title: desc.slice(0,60), defaultLanguage:"de" },
      };
    }

    // ── Blanks: fill_blanks ─────────────────────────────────────────────────
    if (f.typ === "fill_blanks") {
      const felder = f.felder || [];
      // Build one cloze sentence per field
      const questions2 = felder.length
        ? felder.map(feld => `${feld.label ? feld.label+": " : ""}*${feld.antwort}*`)
        : [String(f.lueckentext || f.frage || "").replace(/<[^>]*>/g," ").trim()];
      return {
        library: "H5P.Blanks 1.14",
        subContentId,
        params: {
          text: `<p>${String(f.frage||"").replace(/<[^>]*>/g," ").trim()}</p>${f.belegData ? belegDataZuHtml(f.belegData) : ""}`,
          questions: questions2,
          behaviour: { enableRetry:true, enableSolutionsButton:true, showSolutionsRequiresInput:false, caseSensitive:false, showSolutionButton:"end", autoCheck:false },
          UI: { checkAnswerButton:"Überprüfen", showSolutionButton:"Lösung", tryAgainButton:"Nochmal", scoreBarLabel:"Punkte" },
          overallFeedback: [{ from:0, to:49, feedback:"Schau nochmal nach." },{ from:50, to:100, feedback:"Gut gemacht!" }],
        },
        metadata: { contentType:"Fill in the Blanks", license:"U", title: String(f.frage||"").replace(/<[^>]*>/g," ").trim().slice(0,60), defaultLanguage:"de" },
      };
    }

    // ── Blanks: drag_kalk (Schema-Lückentext) ──────────────────────────────
    if (f.typ === "drag_kalk") {
      const zeilen = f.zeilen || [];
      const questions2 = zeilen
        .filter(z => z.antwort != null)
        .map(z => `${z.label}: *${z.antwort}*`);
      return {
        library: "H5P.Blanks 1.14",
        subContentId,
        params: {
          text: `<p>${String(f.frage||"").replace(/<[^>]*>/g," ").trim()}</p>`,
          questions: questions2.length ? questions2 : ["*Wert*"],
          behaviour: { enableRetry:true, enableSolutionsButton:true, showSolutionsRequiresInput:false, caseSensitive:false, autoCheck:false },
          UI: { checkAnswerButton:"Überprüfen", showSolutionButton:"Lösung", tryAgainButton:"Nochmal", scoreBarLabel:"Punkte" },
          overallFeedback: [{ from:0, to:49, feedback:"Schau nochmal nach." },{ from:50, to:100, feedback:"Richtig!" }],
        },
        metadata: { contentType:"Fill in the Blanks", license:"U", title: String(f.frage||"").replace(/<[^>]*>/g," ").trim().slice(0,60), defaultLanguage:"de" },
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
        { from:0,  to:49,  feedback:"Noch üben – schau nochmal in deine Unterlagen!" },
        { from:50, to:79,  feedback:"Gut gemacht! Du kennst schon vieles." },
        { from:80, to:100, feedback:"Ausgezeichnet! Top-Leistung!" },
      ],
      solutionButtonText: "Lösung anzeigen",
      retryButtonText: "Wiederholen",
      finishButtonText: "Fertig",
      showAnimations: false,
      skippable: false,
      skipButtonText: "Überspringen",
    },
    override: { checkButton:true },
    texts: {
      prevButton:"Zurück", nextButton:"Weiter", finishButton:"Beenden",
      textualProgress:"Aufgabe @current von @total",
      jumpToQuestion:"Frage %d von %total", questionLabel:"Frage",
      readSpeakerProgress:"Frage @current von @total",
      unansweredText:"Unbeantwortet", answeredText:"Beantwortet",
      currentQuestionText:"Aktuelle Frage",
    },
  };
}

function H5PModal({ aufgaben, config, firma, onSchliessen }) {
  const [tab, setTab] = useState("quiz");
  const [qrUrl, setQrUrl] = useState("");
  const [qrReady, setQrReady] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [fragenTypen, setFragenTypen] = useState(() =>
    aufgaben.map(a => ({ id: a.id, typ: bestimmeFragetyp(a) }))
  );
  const setTyp = (id, typ) =>
    setFragenTypen(prev => prev.map(ft => ft.id === id ? { ...ft, typ } : ft));

  // Session beim Backend anlegen und sessionId zurückbekommen
  const erstelleSession = async () => {
    try {
      const res = await apiFetch("/sessions", "POST", {
        titel: config.typ,
        klasse_stufe: config.klasse,
        pruefungsart: config.pruefungsart || null,
        config_json: JSON.stringify({ ...config, firma: firma?.name }),
      });
      return res?.id ?? null;
    } catch { return null; }
  };

  const downloadQuiz = async () => {
    const sessionId = await erstelleSession();
    const html = generateQuizHTML({ aufgaben, config, firma, fragenTypen, apiUrl: API_URL, sessionId });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `BuchungsWerk_Quiz_Kl${config.klasse}_${config.datum || "2026"}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const vorschauQuiz = async () => {
    const sessionId = await erstelleSession();
    const html = generateQuizHTML({ aufgaben, config, firma, fragenTypen, apiUrl: API_URL, sessionId });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const generiereQR = async () => {
    if (!qrUrl) return;
    setQrLoading(true);
    try {
      await new Promise((res, rej) => {
        if (window.QRCode) { res(); return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
      setQrReady(true);
    } catch { alert("QR-Bibliothek konnte nicht geladen werden."); }
    setQrLoading(false);
  };

  const QRContainer = ({ url }) => {
    const ref = useRef(null);
    React.useEffect(() => {
      if (!ref.current || !url || !window.QRCode) return;
      ref.current.innerHTML = "";
      new window.QRCode(ref.current, { text: url, width: 224, height: 224, colorDark: "#0f172a", colorLight: "#ffffff", correctLevel: window.QRCode?.CorrectLevel?.M });
    }, [url]);
    return <div ref={ref} style={{ display: "inline-block" }} />;
  };

  const frageAnzahl = React.useMemo(
    () => generiereAlleQuizFragen(aufgaben, fragenTypen).length,
    [aufgaben, fragenTypen]
  );

  const TABS = [
    { key: "quiz", icon: Monitor,       label: "Interaktives Quiz" },
    { key: "qr",   icon: QrCode,        label: "QR / Teilen" },
    { key: "h5p",  icon: GraduationCap, label: "H5P (mebis)" },
  ];

  const S2 = {
    infoBox: { background:"rgba(240,236,227,0.05)", borderRadius:"12px", padding:"13px 15px", marginBottom:"14px", fontSize:"13px", color:"rgba(240,236,227,0.75)", lineHeight:1.7, border:"1px solid rgba(240,236,227,0.1)" },
    sectionLbl: { fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"rgba(240,236,227,0.4)", marginBottom:"9px" },
    aufgRow: { display:"flex", alignItems:"center", gap:"8px", padding:"9px 12px", background:"rgba(240,236,227,0.05)", borderRadius:"9px", marginBottom:"6px", flexWrap:"wrap" },
    aufgNr: { fontSize:"11px", fontWeight:800, color:"#e8600a", minWidth:"24px" },
    aufgTxt: { fontSize:"12px", color:"#e2e8f0", flex:1, minWidth:"120px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
    typPill: (active) => ({ padding:"4px 8px", borderRadius:"6px", border:"1px solid", fontSize:"10px", fontWeight:700, cursor:"pointer", borderColor: active ? "#e8600a" : "#334155", background: active ? "#e8600a" : "transparent", color: active ? "#0f172a" : "#64748b" }),
    bigBtn: (bg) => ({ flex:1, padding:"12px", borderRadius:"10px", border:"none", background:bg, color:"#fff", fontWeight:800, fontSize:"13px", cursor:"pointer" }),
    outlineBtn: { flex:1, padding:"12px", borderRadius:"10px", border:"1.5px solid #334155", background:"transparent", color:"#e2e8f0", fontWeight:700, fontSize:"13px", cursor:"pointer" },
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#0f172a", borderRadius:"16px", width:"100%", maxWidth:"580px", maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ padding:"18px 22px 0", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
            <div>
              <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#64748b", marginBottom:"3px" }}>Interaktiv & Teilen</div>
              <div style={{ fontSize:"20px", fontWeight:900, color:"#fff", display:"flex", alignItems:"center", gap:8 }}><Monitor size={20} strokeWidth={1.5}/>Quiz & H5P</div>
            </div>
            <button onClick={onSchliessen} style={{ background:"transparent", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", width:"36px", height:"36px", cursor:"pointer", fontSize:"18px" }}>×</button>
          </div>
          <div style={{ display:"flex" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:"9px 4px", border:"none", background:"transparent", borderBottom: tab===t.key?"3px solid #e8600a":"3px solid transparent", color: tab===t.key?"#e8600a":"#64748b", fontSize:"11px", fontWeight: tab===t.key?700:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>{React.createElement(t.icon,{size:13,strokeWidth:1.5})} {t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowY:"auto", padding:"20px 22px", flex:1 }}>

          {tab==="quiz" && (
            <div>
              <div style={S2.infoBox}>
                Self-contained HTML für iPad – kein Internet nötig. Neuer Modus: <strong style={{color:"#e8600a"}}>Kontenplan-Drag</strong> – Schüler wählt Konten selbst aus dem vollständigen Kontenplan. Jeder Slot verlangt Nr. + Kürzel + Betrag. Beleg wird vollständig angezeigt.
              </div>
              <div style={{ ...S2.sectionLbl, marginBottom:"7px" }}>Aufgaben · {frageAnzahl} Fragen</div>
              <div style={{ marginBottom:"16px" }}>
                {aufgaben.map((a, i) => {
                  const aktTyp = fragenTypen.find(ft => ft.id === a.id)?.typ ?? bestimmeFragetyp(a);
                  const verfuegbar = a.taskTyp==="rechnung"
                    ? [QUIZ_TYPEN.find(t=>t.key==="drag_kalk")]
                    : a.taskTyp==="theorie"
                    ? [QUIZ_TYPEN.find(t=>t.key==="single_choice"),QUIZ_TYPEN.find(t=>t.key==="true_false")]
                    : QUIZ_TYPEN.filter(t=>t.key!=="drag_kalk");
                  const kurzTxt = (a.aufgabe||"").replace(/<[^>]*>/g,"").slice(0,44);
                  return (
                    <div key={a.id} style={S2.aufgRow}>
                      <span style={S2.aufgNr}>#{i+1}</span>
                      <span style={S2.aufgTxt} title={(a.aufgabe||"").replace(/<[^>]*>/g,"")}>{kurzTxt}</span>
                      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                        {verfuegbar.filter(Boolean).map(t => (
                          <button key={t.key} onClick={() => setTyp(a.id, t.key)}
                            style={S2.typPill(aktTyp===t.key)} title={t.label}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:"9px" }}>
                <button onClick={vorschauQuiz} style={{...S2.outlineBtn,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Eye size={13} strokeWidth={1.5}/>Vorschau</button>
                <button onClick={downloadQuiz} style={{...S2.bigBtn("#e8600a"),display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Download size={13} strokeWidth={1.5}/>Herunterladen (.html)</button>
              </div>
              <div style={{ marginTop:"9px", fontSize:"11px", color:"#475569", textAlign:"center" }}>
                iPad-optimiert · Offline · Kontenplan eingebettet · Belege vollständig
              </div>
            </div>
          )}

          {tab==="qr" && (
            <div>
              <div style={S2.infoBox}>QR-Code für den Unterricht: Schülerinnen und Schüler scannen mit der iPad-Kamera und öffnen das Quiz direkt im Browser.</div>
              <div style={{ marginBottom:"10px" }}>
                <div style={{ ...S2.sectionLbl, marginBottom:"5px" }}>Link eingeben</div>
                <input type="url" value={qrUrl} onChange={e=>{setQrUrl(e.target.value);setQrReady(false);}}
                  placeholder="https://lernplattform.mebis.bycs.de/… oder http://buchungswerk.local"
                  style={{ width:"100%", padding:"10px 13px", borderRadius:"9px", border:"1.5px solid #334155", background:"#1e293b", color:"#e2e8f0", fontSize:"13px", outline:"none", fontFamily:"inherit" }} />
              </div>
              <div style={{ display:"flex", gap:"7px", marginBottom:"14px" }}>
                {[{label:"Pi-Server",url:"http://buchungswerk.local"},{label:"mebis",url:"https://lernplattform.mebis.bycs.de/"}].map(p=>(
                  <button key={p.label} onClick={()=>{setQrUrl(p.url);setQrReady(false);}}
                    style={{ flex:1, padding:"8px", borderRadius:"8px", border:"1px solid #334155", background:"#1e293b", color:"#94a3b8", fontSize:"11px", cursor:"pointer" }}>{p.label}</button>
                ))}
              </div>
              <button onClick={generiereQR} disabled={!qrUrl||qrLoading}
                style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"none", background:qrUrl?"#e8600a":"#334155", color:qrUrl?"#0f172a":"#64748b", fontWeight:800, fontSize:"14px", cursor:qrUrl?"pointer":"not-allowed", marginBottom:"14px", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {qrLoading ? <><Zap size={14} strokeWidth={1.5}/>Lädt…</> : <><Monitor size={14} strokeWidth={1.5}/>QR-Code generieren</>}
              </button>
              {qrReady&&qrUrl
                ?<div style={{ textAlign:"center", background:"#fff", borderRadius:"14px", padding:"20px" }}>
                  <QRContainer url={qrUrl}/>
                  <div style={{ marginTop:"10px", fontSize:"12px", color:"#374151", fontWeight:600 }}>📱 iPad-Kamera → QR scannen → Quiz startet</div>
                  <div style={{ fontSize:"10px", color:"#6b7280", marginTop:"4px", wordBreak:"break-all" }}>{qrUrl}</div>
                </div>
                :<div style={{ textAlign:"center", padding:"28px", color:"#475569", fontSize:"12px" }}>QR-Code erscheint nach dem Generieren.<br/><span style={{ fontSize:"11px" }}>Einmalig Internetverbindung für QR-Bibliothek erforderlich</span></div>
              }
            </div>
          )}

          {tab==="h5p" && (
            <div>
              <div style={{ ...S2.infoBox, borderLeft:"3px solid #e8600a", fontSize:"12px" }}>
                <div style={{ fontSize:"13px", color:"#e8600a", fontWeight:700, marginBottom:"7px" }}>🎓 H5P-Export für bycs / mebis</div>
                Erzeugt eine echte <strong>.h5p-Datei</strong> (Question Set) die direkt in bycs hochgeladen werden kann. Jede Aufgabe wird als interaktive Frage exportiert.
              </div>
              <div style={S2.sectionLbl}>Enthaltene Aktivitäten</div>
              <div style={{ marginBottom:14 }}>
                {[
                  ["Buchungssatz-Aufgaben","Drag & Drop – Soll/Haben zuordnen"],
                  ["Rechnung / Schema","Lückentext – Werte eintragen"],
                  ["Theorie-Aufgaben","Multiple Choice"],
                ].map(([typ,hint]) => (
                  <div key={typ} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"#1e293b", borderRadius:8, marginBottom:5 }}>
                    <span style={{ fontSize:"12px", color:"#e2e8f0", fontWeight:600, flex:1 }}>{typ}</span>
                    <span style={{ fontSize:"10px", color:"#94a3b8" }}>{hint}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:"10px" }}>
                <button onClick={async () => {
                  // Load JSZip
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
                    // h5p.json
                    zip.file("h5p.json", JSON.stringify({
                      title: `BuchungsWerk ${config.typ} Klasse ${config.klasse}`,
                      language: "de",
                      mainLibrary: "H5P.QuestionSet",
                      license: "U",
                      embedTypes: ["div"],
                      preloadedDependencies: [
                        { machineName:"H5P.QuestionSet", majorVersion:1, minorVersion:20 },
                        { machineName:"H5P.MultiChoice", majorVersion:1, minorVersion:16 },
                        { machineName:"H5P.Blanks", majorVersion:1, minorVersion:14 },
                        { machineName:"H5P.DragText", majorVersion:1, minorVersion:10 },
                        { machineName:"H5P.JoubelUI", majorVersion:1, minorVersion:3 },
                        { machineName:"H5P.FontIcons", majorVersion:1, minorVersion:0 },
                      ],
                    }, null, 2));
                    // content/content.json – direkt als Pfad, kein Ordner-Eintrag
                    zip.file("content/content.json", JSON.stringify(h5pContent, null, 2));
                    // Alle Ordner-Einträge entfernen (H5P-Validator erlaubt nur Dateien)
                    Object.keys(zip.files).forEach(k => { if (zip.files[k].dir) delete zip.files[k]; });
                    // Download
                    const blob = await zip.generateAsync({ type:"blob", createFolders: false });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `BuchungsWerk_Kl${config.klasse}_${config.datum || "2026"}.h5p`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                  } catch(e) { alert("H5P-Export Fehler: " + e.message); }
                }} style={{ ...S2.bigBtn("#e8600a"), display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <Download size={14} strokeWidth={1.5}/>.h5p herunterladen
                </button>
              </div>
              <div style={{ marginTop:10, fontSize:"10px", color:"#475569", textAlign:"center" }}>
                bycs → Kurse → Aktivität hinzufügen → H5P → Datei hochladen
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}



export default H5PModal;
