// ══════════════════════════════════════════════════════════════════════════════
// AufgabeKarte-Familie: TheorieKarte, KomplexKarte, BelegGFSlider, AufgabeKarte
// Extrahiert aus BuchungsWerk.jsx – Phase E3 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef } from "react";
import { FileText, ArrowLeftRight, CheckSquare, PenLine,
         ClipboardList, BarChart2, Save, RefreshCw, Zap,
         MessageSquare, AlertTriangle } from "lucide-react";
import { anrede, berechnePunkte } from "../../utils.js";
import { S } from "../../styles.js";
import { apiFetch } from "../../api.js";
import { KOMPLEX_STEP_DEFS } from "../../data/stammdaten.js";
import { BelegAnzeige, belegToGeschaeftsfall } from "../beleg/BelegAnzeige.jsx";
import { KürzelSpan, renderMitTooltips } from "../kontenplan/KontenplanModal.jsx";
import DraggableHaken from "../DraggableHaken.jsx";
import { SchaubildAnzeige, GeschaeftsfallKarte } from "../common/Schaubilder.jsx";
import { BuchungsSatz, TKonten, NebenrechnungBox, SchemaTabelle,
         AngebotsVergleichAufgabe, AngebotsVergleichLoesung,
         BELEG_LABEL } from "./Buchungskomponenten.jsx";

export function TheorieKarte({ aufgabe, nr, showLoesung, klasse = 10 }) {
  const [open, setOpen] = useState(false);
  const show = showLoesung || open;
  const punkte = aufgabe.nrPunkte || 0;
  const aufgabeText = anrede(klasse, aufgabe.aufgabe);

  // ── Lückentext Renderer ──────────────────────────────────────────────────
  const renderLückentext = (lt, showAnswer) => {
    const teile = lt.text.split(/\{(\d+)\}/);
    return (
      <div style={{ lineHeight: "2.2", fontSize: "14px", color: "rgba(240,236,227,0.85)" }}>
        {teile.map((t, i) => {
          if (i % 2 === 0) return <span key={i}>{t}</span>;
          const idx = parseInt(t);
          const antwort = lt.luecken[idx];
          return showAnswer
            ? <span key={i} style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", fontWeight: 700, borderRadius: "4px", padding: "0 6px", margin: "0 2px", borderBottom: "2px solid #4ade80" }}>{antwort}</span>
            : <span key={i} style={{ display: "inline-block", minWidth: "120px", borderBottom: "2px solid rgba(240,236,227,0.25)", margin: "0 4px", verticalAlign: "bottom" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;
        })}
        <div style={{ marginTop: "14px", padding: "10px 12px", background: "rgba(240,236,227,0.05)", borderRadius: "8px", border: "1px solid rgba(240,236,227,0.12)" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(240,236,227,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Wortbank: </span>
          {lt.wortbank.map((w, i) => (
            <span key={i} style={{ display: "inline-block", margin: "2px 4px", padding: "2px 8px", background: "rgba(240,236,227,0.08)", border: "1.5px solid rgba(240,236,227,0.18)", borderRadius: "6px", fontSize: "13px", color: "rgba(240,236,227,0.85)" }}>{w}</span>
          ))}
        </div>
      </div>
    );
  };

  // ── Zuordnung Renderer ───────────────────────────────────────────────────
  const renderZuordnung = (zu, showAnswer) => {
    // Shuffle once on first render, stable via aufgabe.id
    const seed = aufgabe.id || "x";
    const arr   = zu.paare.map((p, i) => ({ ...p, origIdx: i, letter: String.fromCharCode(65 + i) }));
    // deterministic pseudo-shuffle based on seed
    const defs  = arr.map(p => ({ def: p.def, letter: p.letter }))
      .sort((a, b) => {
        const ha = (a.letter.charCodeAt(0) * 31 + seed.charCodeAt(0)) % 7;
        const hb = (b.letter.charCodeAt(0) * 31 + seed.charCodeAt(0)) % 7;
        return ha - hb;
      });
    const shuffled = { terms: arr, defs };

    // Build answer map: origIdx → letter in shuffled defs
    const answerMap = {};
    shuffled.terms.forEach(t => {
      const found = shuffled.defs.find(d => d.def === t.def);
      if (found) answerMap[t.origIdx] = found.letter;
    });

    return (
      <div style={{ fontSize: "13px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "4px" }}>
          <div style={{ fontWeight: 700, color: "rgba(240,236,227,0.8)", padding: "4px 0", borderBottom: "2px solid rgba(240,236,227,0.12)" }}>Begriff</div>
          <div style={{ fontWeight: 700, color: "rgba(240,236,227,0.8)", padding: "4px 0", borderBottom: "2px solid rgba(240,236,227,0.12)" }}>Definition</div>
          {shuffled.terms.map((t, i) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "6px 0", borderBottom: "1px solid rgba(240,236,227,0.08)" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: "22px", height: "22px", borderRadius: "50%",
                  background: showAnswer ? "rgba(34,197,94,0.18)" : "rgba(240,236,227,0.06)",
                  border: "1.5px solid " + (showAnswer ? "#4ade80" : "rgba(240,236,227,0.2)"),
                  color: showAnswer ? "#4ade80" : "rgba(240,236,227,0.6)",
                  fontWeight: 800, fontSize: "12px", flexShrink: 0,
                }}>
                  {showAnswer ? answerMap[t.origIdx] : " "}
                </span>
                <span style={{ fontWeight: 600, color: "#f0ece3" }}>{t.term}</span>
              </div>
              <div style={{ color: "rgba(240,236,227,0.55)", padding: "6px 0", borderBottom: "1px solid rgba(240,236,227,0.08)", lineHeight: 1.5 }}>
                <span style={{ display: "inline-block", minWidth: "20px", fontWeight: 700, color: "rgba(240,236,227,0.4)" }}>{shuffled.defs[i]?.letter})</span>
                {shuffled.defs[i]?.def}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // ── Multiple Choice Renderer ─────────────────────────────────────────────
  const renderMC = (mc, showAnswer) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {mc.fragen.map((f, fi) => (
        <div key={fi} style={{ background: "rgba(240,236,227,0.05)", border: "1px solid rgba(240,236,227,0.12)", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "8px", fontSize: "13px" }}>{fi + 1}. {f.frage}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {f.optionen.map((opt, oi) => {
              const isRichtig = oi === f.richtig;
              return (
                <div key={oi} style={{
                  display: "flex", alignItems: "flex-start", gap: "8px", padding: "5px 8px", borderRadius: "7px",
                  background: showAnswer && isRichtig ? "rgba(74,222,128,0.1)" : "rgba(240,236,227,0.04)",
                  border: "1.5px solid " + (showAnswer && isRichtig ? "#4ade80" : "rgba(240,236,227,0.12)"),
                }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    minWidth: "18px", height: "18px", borderRadius: "50%",
                    border: "1.5px solid " + (showAnswer && isRichtig ? "#4ade80" : "rgba(240,236,227,0.3)"),
                    fontSize: "11px", fontWeight: 700,
                    background: showAnswer && isRichtig ? "rgba(74,222,128,0.2)" : "rgba(240,236,227,0.06)",
                    color: showAnswer && isRichtig ? "#4ade80" : "rgba(240,236,227,0.55)",
                    flexShrink: 0, marginTop: "1px",
                  }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span style={{ fontSize: "13px", color: showAnswer && isRichtig ? "#4ade80" : "#f0ece3", fontWeight: showAnswer && isRichtig ? 700 : 400 }}>{opt}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const themenTyp = aufgabe.themenTyp;
  const lt  = aufgabe.lueckentext;
  const zu  = aufgabe.zuordnung;
  const mc  = aufgabe.mc;

  return (
    <div style={{ border: "1px solid rgba(240,236,227,0.12)", borderRadius: "12px", overflow: "hidden", marginBottom: "12px", background: "rgba(28,20,10,0.6)" }}>
      <div style={{ background: "rgba(240,236,227,0.06)", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid rgba(240,236,227,0.1)", flexWrap: "wrap" }}>
        <div style={{ width: "26px", height: "26px", background: "#e8600a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>{nr}</div>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#f0ece3", flex: 1, minWidth: "120px" }}>{aufgabe.titel}</span>
        <span style={{ fontSize: "11px", color: "rgba(240,236,227,0.65)", fontWeight: 700, background: "rgba(240,236,227,0.1)", padding: "2px 8px", borderRadius: "20px" }}>
          {themenTyp === "lueckentext" ? <><FileText size={10} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Lückentext</> : themenTyp === "zuordnung" ? <><ArrowLeftRight size={10} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Zuordnung</> : themenTyp === "mc" ? <><CheckSquare size={10} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Multiple Choice</> : <><PenLine size={10} strokeWidth={1.5} style={{verticalAlign:"middle",marginRight:3}}/>Freitext</>}
        </span>
        <div style={{ display: "flex", alignItems: "center", background: "#141008", color: "#e8600a", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>
          {punkte} P
        </div>
        <button onClick={() => setOpen(!open)} style={{ ...S.btnSecondary, padding: "8px 14px", fontSize: "12px", borderRadius: "10px", fontWeight: 700 }}>{open ? "▲ Lösung" : "▼ Lösung"}</button>
      </div>

      <div style={{ padding: "16px" }}>
        <p style={{ margin: "0 0 14px", color: "rgba(240,236,227,0.85)", fontWeight: 600, fontSize: "14px", whiteSpace: "pre-wrap" }}>{aufgabeText}</p>
        {themenTyp === "lueckentext" && lt  && renderLückentext(lt, show)}
        {themenTyp === "zuordnung"   && zu  && renderZuordnung(zu, show)}
        {themenTyp === "mc"          && mc  && renderMC(mc, show)}
        {themenTyp === "freitext"    && aufgabe.freitext && (
          <div style={{ marginTop: "4px" }}>
            <div style={{ background: "rgba(240,236,227,0.05)", border: "1px solid rgba(240,236,227,0.12)", borderRadius: "8px", padding: "12px 14px", minHeight: "60px", fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>
              Antwortfeld (ca. {aufgabe.freitext.zeilen || 4} Zeilen)
            </div>
            {show && aufgabe.freitext.loesung && (
              <div style={{ marginTop: "10px", background: "rgba(74,222,128,0.08)", border: "1.5px solid rgba(74,222,128,0.3)", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#4ade80", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>✓ Musterlösung</div>
                <div style={{ fontSize: "13px", color: "rgba(240,236,227,0.85)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aufgabe.freitext.loesung}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function KomplexKarte({ aufgabe, nr, showLoesung, globalMode, klasse = 10, onSchrittEntfernen, onSchrittHinzufuegen, onAufgabeChange }) {
  const [openAll, setOpenAll] = useState(false);
  const [openSchritte, setOpenSchritte] = useState({});
  const [loesungsViews, setLoesungsViews] = useState({});
  const [localMode, setLocalMode] = useState(null);
  const [schrittModes, setSchrittModes] = useState({});
  const [addMenuOffen, setAddMenuOffen] = useState(false);
  const [editSchrittIdx, setEditSchrittIdx] = useState(null);
  const [editText, setEditText] = useState("");
  const [kiLaden, setKiLaden] = useState(false);
  const effectiveMode = localMode ?? globalMode;
  const getSchrittMode = i => schrittModes[i] ?? effectiveMode;
  const setSchrittMode = (i, v) => setSchrittModes(p => ({ ...p, [i]: v }));
  const gesamtPunkte = (aufgabe.schritte || []).reduce((s, st) => s + st.punkte, 0);

  // Verfügbare Schritte die noch nicht enthalten sind
  const vorhandenKeys = new Set((aufgabe.schritte || []).map(s => s._optsKey).filter(Boolean));
  const stepDefs = KOMPLEX_STEP_DEFS[aufgabe._baseTypId] || [];
  const verfuegbareSchritte = stepDefs.filter(d => !vorhandenKeys.has(d.optsKey));

  const toggleSchritt = i => setOpenSchritte(p => ({ ...p, [i]: !p[i] }));
  const getLoeView = i => loesungsViews[i] || "buchungssatz";
  const setLoeView = (i, v) => setLoesungsViews(p => ({ ...p, [i]: v }));

  return (
    <div style={{ border: "1px solid rgba(240,236,227,0.12)", borderLeft: "3px solid #e8600a", borderRadius: "14px", overflow: "hidden", marginBottom: "16px", background: "rgba(30,22,10,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      {/* ── Gesamtheader ── */}
      <div style={{ background: "#141008", padding: "14px 18px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ width: "28px", height: "28px", background: "#e8600a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: 900, flexShrink: 0 }}>{nr}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2px", display:"flex", alignItems:"center", gap:4 }}><ArrowLeftRight size={10} strokeWidth={1.5}/>Komplexaufgabe · {(aufgabe.schritte || []).length} Schritte</div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#fff" }}>{aufgabe.titel.replace("🔗 ", "")}</div>
        </div>
        <div style={{ background: "#e8600a", color: "#fff", borderRadius: "20px", padding: "4px 14px", fontSize: "13px", fontWeight: 900, flexShrink: 0 }}>{gesamtPunkte} P</div>
        {/* Beleg/Geschäftsfall-Toggle für alle Schritte */}
        <BelegGFSlider
          value={effectiveMode}
          isOverridden={!!localMode}
          onChange={v => setLocalMode(v)}
          compact
        />
        <button onClick={() => setOpenAll(!openAll)}
          style={{ ...S.btnSecondary, padding: "4px 12px", fontSize: "12px" }}>
          {openAll ? "▲ Lösungen" : "▼ Lösungen"}
        </button>
      </div>

      {/* ── Schritte ── */}
      {(aufgabe.schritte || []).map((schritt, i) => {
        const isOpen = showLoesung || openAll || !!openSchritte[i];
        const loeView = getLoeView(i);
        const hasBeleg = !!schritt.beleg;
        const gfText = hasBeleg ? belegToGeschaeftsfall(schritt.beleg) : null;
        const nrPunkte = schritt.nrPunkte || 0;
        const buchPunkte = schritt.punkte - nrPunkte;
        return (
          <div key={i} style={{ borderTop: "1px solid rgba(240,236,227,0.1)" }}>
            {/* Schritt-Header */}
            <div style={{ padding: "9px 18px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", background: "rgba(240,236,227,0.04)" }}>
              <div style={{ width: "22px", height: "22px", background: "rgba(232,96,10,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8600a", fontSize: "11px", fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontWeight: 700, fontSize: "13px", color: "#f0ece3", flex: 1 }}>{schritt.titel}</span>
              <div style={{ display: "flex", alignItems: "center", background: "#1e293b", color: "#e8600a", borderRadius: "20px", padding: "2px 10px", fontSize: "11px", fontWeight: 800 }}>
                {schritt.punkte} P{nrPunkte > 0 && <span style={{ color: "#fbbf24", fontSize: "10px", fontWeight: 700 }}> (+{nrPunkte} NR)</span>}
              </div>
              <button onClick={() => toggleSchritt(i)} style={{ ...S.btnSecondary, padding: "3px 9px", fontSize: "11px" }}>
                {openSchritte[i] ? "▲" : "▼ Lösung"}
              </button>
              {onSchrittEntfernen && schritt._optsKey && (
                <button onClick={() => onSchrittEntfernen(i)}
                  title="Teilaufgabe entfernen"
                  style={{ padding: "3px 8px", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "6px", background: "rgba(220,38,38,0.12)",
                    color: "#fca5a5", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                  ✕
                </button>
              )}
            </div>

            {/* Schritt-Body */}
            <div style={{ padding: "12px 18px 14px 48px", textAlign: "left" }}>
              {/* Aufgabentext mit Edit */}
              {editSchrittIdx === i ? (
                <div style={{ marginBottom: "10px" }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                    style={{ width: "100%", padding: "8px", border: "1.5px solid rgba(240,236,227,0.22)", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", background: "rgba(240,236,227,0.05)", color: "#f0ece3" }} />
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                    <button onClick={() => {
                      if (onAufgabeChange) {
                        const neuSchritte = (aufgabe.schritte || []).map((s, si) => si === i ? { ...s, _aufgabeEdit: editText.trim() || undefined } : s);
                        onAufgabeChange({ ...aufgabe, schritte: neuSchritte });
                      }
                      setEditSchrittIdx(null);
                    }} style={{ padding: "5px 12px", background: "#141008", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><Save size={12} strokeWidth={1.5}/>Speichern</button>
                    <button onClick={() => {
                      if (onAufgabeChange) {
                        const neuSchritte = (aufgabe.schritte || []).map((s, si) => si === i ? { ...s, _aufgabeEdit: undefined } : s);
                        onAufgabeChange({ ...aufgabe, schritte: neuSchritte });
                      }
                      setEditText(anrede(klasse, schritt.aufgabe ?? ""));
                      setEditSchrittIdx(null);
                    }} style={{ padding: "5px 12px", background: "rgba(220,38,38,0.12)", color: "#fca5a5", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><RefreshCw size={10} strokeWidth={1.5}/>Original</button>
                    <button disabled={kiLaden} onClick={async () => {
                      setKiLaden(true);
                      try {
                        const orig = anrede(klasse, schritt.aufgabe || "");
                        const res = await apiFetch("/ki/buchung", "POST", { prompt: `Du bist bwr-sensei – BwR-Assistent für bayerische Realschulen (LehrplanPLUS Bayern).\nFormuliere diese Aufgabenstellung für Klasse ${klasse} vollständig um.\nPFLICHT: Verwende ANDERE Signalwörter, einen anderen Satzeinstieg und eine andere Satzkonstruktion als das Original. NICHT erlaubt: gleiche Wortreihenfolge mit minimalen Änderungen.\nBehalte: alle Zahlen, Beträge und den fachlichen Inhalt exakt.\nSprache: ${parseInt(klasse) <= 9 ? "du/dein/dir" : "Sie/Ihr/Ihnen"}.\nAntworte NUR mit dem neuen Aufgabentext – keine Erklärung, keine Anführungszeichen.\n\nOriginal: ${orig}`, max_tokens: 200 });
                        const t = (res?.content?.find?.(c => c.type==="text")?.text || "").trim();
                        if (t) setEditText(t);
                      } catch(e) { alert("KI-Fehler: " + e.message); }
                      setKiLaden(false);
                    }} style={{ padding: "5px 12px", background: "rgba(232,96,10,0.15)", color: "#e8600a", border: "1px solid rgba(232,96,10,0.3)", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: kiLaden?"wait":"pointer", opacity: kiLaden?0.7:1 }}>
                      {kiLaden ? <><Zap size={11} strokeWidth={1.5}/>KI…</> : <><RefreshCw size={11} strokeWidth={1.5}/>KI-Neuformulierung</>}
                    </button>
                    <button onClick={() => setEditSchrittIdx(null)} style={{ padding: "5px 12px", background: "rgba(240,236,227,0.06)", color: "rgba(240,236,227,0.5)", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "rgba(240,236,227,0.9)", fontWeight: 600, flex: 1, whiteSpace: "pre-wrap" }}>
                    {schritt._aufgabeEdit ?? anrede(klasse, schritt.aufgabe)}
                  </p>
                  <button onClick={() => { setEditText(schritt._aufgabeEdit ?? anrede(klasse, schritt.aufgabe ?? "")); setEditSchrittIdx(i); }}
                    title="Aufgabentext bearbeiten"
                    style={{ padding: "4px 7px", border: `1.5px solid ${schritt._aufgabeEdit ? "#e8600a" : "#e2e8f0"}`,
                      borderRadius: "6px", background: schritt._aufgabeEdit ? "#fffbeb" : "#fff",
                      cursor: "pointer", flexShrink: 0, display:"flex", alignItems:"center", gap:3 }}>
                    <PenLine size={11} strokeWidth={1.5} color={schritt._aufgabeEdit?"#e8600a":"#94a3b8"}/>{schritt._aufgabeEdit ? <CheckSquare size={10} strokeWidth={1.5} color="#16a34a"/> : null}
                  </button>
                </div>
              )}

              {/* ── Angebotsvergleich: Aufgabenteil (immer sichtbar) ── */}
              {schritt.typ === "angebotsvergleich" && schritt.angebote && (
                <div style={{ marginBottom: "10px" }}>
                  <AngebotsVergleichAufgabe angebote={schritt.angebote} />

                </div>
              )}

              {/* ── Einfache Kalkulation – Blanko-Schema (Labels ohne Beträge) ── */}
              {(schritt.typ === "kalkulation" || schritt.typ === "kalkulation_vk") && schritt.schema && !schritt.angebote && (
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ border: "1px solid rgba(240,236,227,0.12)", borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                      <tbody>
                        {schritt.schema.map((r, i) => {
                          const isInfo = typeof r.wert !== "number";
                          if (isInfo) return null;
                          return (
                            <tr key={i} style={{ background: r.bold ? "#f8fafc" : "#fff", borderTop: r.trennlinie ? "2px solid #0f172a" : i > 0 ? "1px solid #f1f5f9" : "none" }}>
                              <td style={{ padding: "7px 14px", color: r.bold ? "#0f172a" : "#374151", fontWeight: r.bold ? 700 : 400,
                                paddingLeft: r.label.startsWith("+") || r.label.startsWith("−") ? "28px" : undefined }}>
                                {r.label}
                              </td>
                              <td style={{ padding: "7px 14px", textAlign: "right", width: "140px" }}>
                                <div style={{ borderBottom: "1.5px solid #94a3b8", height: "22px", minWidth: "100px" }} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "rgba(240,236,227,0.4)" }}>
                    {anrede(klasse, "Füllen Sie das Kalkulationsschema aus.")}{schritt.typ === "kalkulation" ? " Rechne nur mit Nettowerten." : ""}
                  </div>
                </div>
              )}

              {/* ── Normaler Beleg ── */}
              {hasBeleg && schritt.typ !== "angebotsvergleich" && schritt.typ !== "kalkulation" && schritt.typ !== "kalkulation_vk" && (
                <div style={{ marginBottom: "10px" }}>
                  {/* Per-Schritt Toggle */}
                  <div style={{ marginBottom: "8px" }}>
                    <BelegGFSlider
                      value={getSchrittMode(i)}
                      onChange={v => setSchrittMode(i, v)}
                    />
                  </div>
                  {getSchrittMode(i) === "beleg"
                    ? <BelegAnzeige beleg={schritt.beleg} />
                    : <GeschaeftsfallKarte text={gfText} />
                  }
                </div>
              )}

              {isOpen && schritt.typ !== "angebotsvergleich" && schritt.typ !== "kalkulation" && schritt.typ !== "kalkulation_vk" && (
                <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "12px 14px" }}>
                  {/* View Toggle */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    {[{ key: "buchungssatz", label: "Buchungssatz" }, { key: "tkonten", label: "T-Konten" }].map(opt => (
                      <button key={opt.key} onClick={() => setLoeView(i, opt.key)}
                        style={{ ...S.btnSecondary, padding: "3px 9px", fontSize: "11px",
                          fontWeight: loeView === opt.key ? 800 : 500,
                          background: loeView === opt.key ? "rgba(74,222,128,0.15)" : "transparent" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {loeView === "buchungssatz"
                    ? <BuchungsSatz soll={schritt.soll} haben={schritt.haben} />
                    : <TKonten soll={schritt.soll} haben={schritt.haben} />
                  }
                  {schritt.erklaerung && (
                    <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(232,96,10,0.06)", borderRadius: "8px", border: "1px solid rgba(232,96,10,0.2)", fontSize: "12px", color: "rgba(240,236,227,0.8)", lineHeight: 1.6 }}>
                      💡 {schritt.erklaerung}
                    </div>
                  )}
                </div>
              )}

              {/* Lösung Angebotsvergleich: vollständiges Schema + Entscheidung */}
              {isOpen && schritt.typ === "angebotsvergleich" && schritt.angebote && (
                <div style={{ marginTop: "10px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#4ade80", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", display:"flex", alignItems:"center", gap:4 }}><BarChart2 size={11} strokeWidth={1.5}/>Lösung – Kalkulationsschema</div>
                  <AngebotsVergleichLoesung angebote={schritt.angebote} gewinner={schritt.gewinner} />
                  {schritt.erklaerung && (
                    <div style={{ marginTop: "8px", padding: "6px 10px", background: "rgba(232,96,10,0.06)", borderRadius: "7px", border: "1px solid rgba(232,96,10,0.2)", fontSize: "12px", color: "rgba(240,236,227,0.8)", lineHeight: 1.6 }}>
                      💡 {schritt.erklaerung}
                    </div>
                  )}
                </div>
              )}

              {/* Lösung einfache Kalkulation */}
              {isOpen && (schritt.typ === "kalkulation" || schritt.typ === "kalkulation_vk") && schritt.schema && (
                <div style={{ marginTop: "10px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#4ade80", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {schritt.typ === "kalkulation_vk" ? <><BarChart2 size={11} strokeWidth={1.5} style={{marginRight:4}}/>Lösung – Verkaufskalkulation</> : <><BarChart2 size={11} strokeWidth={1.5} style={{marginRight:4}}/>Lösung – Kalkulationsschema</>}
                  </div>
                  <SchemaTabelle rows={schritt.schema} />
                  {schritt.erklaerung && (
                    <div style={{ marginTop: "8px", padding: "6px 10px", background: "rgba(232,96,10,0.08)", borderRadius: "7px", border: "1px solid rgba(232,96,10,0.25)", fontSize: "12px", color: "rgba(240,236,227,0.85)" }}>
                      💡 {schritt.erklaerung}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Footer: Schritt hinzufügen ── */}
      {onSchrittHinzufuegen && verfuegbareSchritte.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(240,236,227,0.1)", padding: "10px 18px", background: "rgba(240,236,227,0.05)", position: "relative" }}>
          <button
            onClick={() => setAddMenuOffen(v => !v)}
            style={{ padding: "5px 14px", border: "1.5px dashed rgba(240,236,227,0.2)", borderRadius: "8px", background: "transparent",
              color: "rgba(240,236,227,0.4)", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            ＋ Schritt hinzufügen
          </button>
          {addMenuOffen && (
            <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: "18px", background: "rgba(20,16,8,0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(240,236,227,0.12)",
              borderRadius: "10px", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", zIndex: 50, minWidth: "220px", overflow: "hidden" }}>
              {verfuegbareSchritte.map(d => (
                <button key={d.optsKey}
                  onClick={() => { onSchrittHinzufuegen(d.optsKey); setAddMenuOffen(false); }}
                  style={{ display: "block", width: "100%", padding: "9px 16px", border: "none", background: "transparent",
                    textAlign: "left", fontSize: "13px", fontWeight: 600, color: "rgba(240,236,227,0.85)", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(240,236,227,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  + {d.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Beleg / Geschäftsfall Slider ──────────────────────────────────────────────
export function BelegGFSlider({ value, onChange, compact = false }) {
  const opts = compact
    ? [{ key:"beleg", label:"Beleg", icon:FileText }, { key:"text", label:"GF", icon:MessageSquare }]
    : [{ key:"beleg", label:"Beleg", icon:FileText }, { key:"text", label:"Geschäftsfall", icon:MessageSquare }];
  const isLeft = value === "beleg";
  const W = compact ? 108 : 166;
  const pillW = Math.floor(W / 2) - 3;
  const leftRest = 2;
  const rightRest = Math.ceil(W / 2) + 1;
  const restPos = isLeft ? leftRest : rightRest;
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [dragX, setDragX] = useState(null);

  const onDown = e => {
    startXRef.current = e.clientX;
    isDraggingRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) >= 4) isDraggingRef.current = true;
    if (isDraggingRef.current) {
      setDragX(Math.max(leftRest, Math.min(rightRest, restPos + dx)));
    }
  };
  const onUp = e => {
    if (isDraggingRef.current) {
      const dx = e.clientX - startXRef.current;
      const threshold = (rightRest - leftRest) * 0.4;
      if (isLeft && dx > threshold) onChange("text");
      else if (!isLeft && dx < -threshold) onChange("beleg");
    }
    isDraggingRef.current = false;
    setDragX(null);
  };

  const pillLeft = dragX !== null ? dragX : restPos;
  const useAnim = dragX === null;

  return (
    <div style={{ position:"relative", width:W, height:28, borderRadius:14, flexShrink:0,
      background:"rgba(240,236,227,0.06)", border:"1.5px solid rgba(240,236,227,0.2)",
      cursor:"grab", userSelect:"none", touchAction:"none" }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {/* sliding pill – folgt dem Finger, schnappt beim Loslassen */}
      <div style={{ position:"absolute", top:2, left:pillLeft,
        width:pillW, height:"calc(100% - 4px)",
        background:"#e8600a", borderRadius:12,
        transition: useAnim ? "left 200ms cubic-bezier(.4,0,.2,1)" : "none",
        boxShadow:"0 1px 8px rgba(232,96,10,0.45)" }}/>
      {/* labels */}
      {opts.map((opt, i) => (
        <div key={opt.key} style={{ position:"absolute", top:0, bottom:0,
          left: i === 0 ? 0 : "50%", width:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          gap:3, zIndex:1, pointerEvents:"none",
          fontSize:10, fontWeight:700, fontFamily:"'IBM Plex Sans',sans-serif",
          color: value === opt.key ? "#fff" : "rgba(240,236,227,0.38)",
          transition:"color 200ms" }}>
          <opt.icon size={10} strokeWidth={2.5}/>{opt.label}
        </div>
      ))}
    </div>
  );
}

export function AufgabeKarte({ aufgabe, nr, showLoesung, globalMode, klasse = 10, onAufgabeChange }) {
  const [open, setOpen] = useState(false);
  const [localMode, setLocalMode] = useState(null);
  const [loesungsView, setLoesungsView] = useState("buchungssatz");
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [kiLaden, setKiLaden] = useState(false);
  const [gfEditMode, setGfEditMode] = useState(false);
  const [gfEditText, setGfEditText] = useState("");
  const [gfKiLaden, setGfKiLaden] = useState(false);
  const effectiveMode = localMode ?? globalMode;

  const punkte = berechnePunkte(aufgabe);
  const isRechnung = aufgabe.taskTyp === "rechnung";
  const belegTyp = aufgabe.beleg?.typ;
  const hasBeleg = !!aufgabe.beleg;
  const geschaeftsfallText = hasBeleg ? belegToGeschaeftsfall(aufgabe.beleg) : null;

  // _aufgabeEdit enthält bereits den finalen Text (kein anrede() mehr nötig)
  // Ohne Edit: anrede() auf Originaltext anwenden
  const aufgabeText = effectiveMode === "text" && geschaeftsfallText
    ? anrede(klasse, "Bilde den Buchungssatz zum folgenden Geschäftsfall.")
    : (aufgabe._aufgabeEdit ?? anrede(klasse, aufgabe.aufgabe));

  const originalText = anrede(klasse, aufgabe.aufgabe); // für Textarea + KI-Basis
  const isEdited = !!aufgabe._aufgabeEdit;

  function startEdit() {
    // Textarea zeigt genau das was auch angezeigt wird
    setEditText(aufgabe._aufgabeEdit ?? anrede(klasse, aufgabe.aufgabe ?? ""));
    setEditMode(true);
  }
  function saveEdit() {
    if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _aufgabeEdit: editText.trim() || undefined });
    setEditMode(false);
  }
  function resetEdit() {
    if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _aufgabeEdit: undefined });
    setEditText(anrede(klasse, aufgabe.aufgabe ?? ""));
    setEditMode(false);
  }
  async function kiNeuformulierung() {
    setKiLaden(true);
    try {
      const prompt = `Du bist bwr-sensei – BwR-Assistent für bayerische Realschulen (LehrplanPLUS Bayern).\nFormuliere diese Aufgabenstellung für Klasse ${klasse} vollständig um.\nPFLICHT: Verwende ANDERE Signalwörter, einen anderen Satzeinstieg und eine andere Satzkonstruktion als das Original. NICHT erlaubt: gleiche Wortreihenfolge mit minimalen Änderungen.\nBehalte: alle Zahlen, Beträge und den fachlichen Inhalt exakt.\nSprache: ${parseInt(klasse) <= 9 ? "du/dein/dir" : "Sie/Ihr/Ihnen"}.\nAntworte NUR mit dem neuen Aufgabentext – keine Erklärung, keine Anführungszeichen.\n\nOriginal: ${originalText}`;
      const res = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: 300 });
      // Anthropic API gibt { content: [{ type: "text", text: "..." }] } zurück
      const newText = (
        res?.content?.find?.(c => c.type === "text")?.text ||
        res?.content?.[0]?.text || ""
      ).trim();
      if (newText) {
        if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _aufgabeEdit: newText });
        setEditText(newText);
      } else {
        alert("KI-Antwort: " + JSON.stringify(res)?.slice(0, 200));
      }
    } catch(e) { alert("KI-Fehler: " + e.message); }
    setKiLaden(false);
  }

  return (
    <div style={{ border: "1px solid rgba(240,236,227,0.12)", borderLeft: "3px solid #e8600a", borderRadius: "12px", overflow: "hidden", marginBottom: "12px", background: "rgba(30,22,10,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      {/* Task header */}
      <div style={{ background: "rgba(240,236,227,0.04)", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid rgba(240,236,227,0.1)", flexWrap: "wrap" }}>
        <div style={{ width: "26px", height: "26px", background: "#e8600a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 900, flexShrink: 0 }}>{nr}</div>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#f0ece3", flex: 1, minWidth: "120px" }}>{aufgabe.titel}</span>

        {hasBeleg && (
          <BelegGFSlider
            value={effectiveMode}
            isOverridden={!!localMode}
            onChange={v => setLocalMode(v)}
          />
        )}

        {belegTyp && effectiveMode === "beleg" && <span style={{ fontSize: "11px", color: "rgba(240,236,227,0.6)", background: "rgba(240,236,227,0.1)", padding: "2px 8px", borderRadius: "20px", fontWeight: 600 }}>{BELEG_LABEL[belegTyp] || belegTyp}</span>}
        {isRechnung && <span style={{ fontSize: "11px", color: "rgba(240,236,227,0.7)", fontWeight: 700, background: "rgba(240,236,227,0.1)", padding: "2px 8px", borderRadius: "20px" }}>Rechnung</span>}
        <div style={{ display: "flex", alignItems: "center", background: "#141008", color: "#e8600a", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>
          {punkte} P{aufgabe.nrPunkte > 0 && !isRechnung && <span style={{ color: "#fbbf24", fontSize: "10px", fontWeight: 700 }}> (+{aufgabe.nrPunkte} NR)</span>}
        </div>
        {/* Stift-Button – nur im Beleg-Modus oder ohne Beleg */}
        {(effectiveMode !== "text" || !hasBeleg) && (
          <button onClick={startEdit} title="Aufgabentext bearbeiten"
            style={{ padding: "4px 8px", border: "1.5px solid " + (isEdited ? "#e8600a" : "#e2e8f0"), borderRadius: "8px", background: isEdited ? "#fffbeb" : "#fff", cursor: "pointer", display:"flex", alignItems:"center", gap:3 }}>
            <PenLine size={12} strokeWidth={1.5} color={isEdited?"#e8600a":"#94a3b8"}/>{isEdited ? <CheckSquare size={10} strokeWidth={1.5} color="#16a34a"/> : null}
          </button>
        )}
        <button onClick={() => setOpen(!open)} style={{ ...S.btnSecondary, padding: "4px 10px", fontSize: "12px" }}>{open ? "▲" : "▼ Lösung"}</button>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Inline-Editor */}
        {editMode ? (
          <div style={{ marginBottom: "12px" }}>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
              style={{ width: "100%", padding: "10px", border: "1.5px solid rgba(240,236,227,0.22)", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", background: "rgba(240,236,227,0.05)", color: "#f0ece3" }} />
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
              <button onClick={saveEdit} style={{ padding: "6px 14px", background: "#141008", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 700, fontSize: "12px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><Save size={12} strokeWidth={1.5}/>Speichern</button>
              <button onClick={resetEdit} title="Zurück zur generierten Formulierung"
                style={{ padding: "6px 14px", background: "rgba(220,38,38,0.12)", color: "#fca5a5", border: "none", borderRadius: "7px", fontWeight: 700, fontSize: "12px", cursor: "pointer", display:"flex", alignItems:"center", gap:4 }}><RefreshCw size={12} strokeWidth={1.5}/>Original</button>
              <button onClick={kiNeuformulierung} disabled={kiLaden}
                style={{ padding: "6px 14px", background: "rgba(232,96,10,0.15)", color: "#e8600a", border: "1px solid rgba(232,96,10,0.3)", borderRadius: "7px", fontWeight: 700, fontSize: "12px", cursor: kiLaden ? "wait" : "pointer", opacity: kiLaden ? 0.7 : 1, display:"flex", alignItems:"center", gap:4 }}>
                {kiLaden ? <><Zap size={12} strokeWidth={1.5}/>KI…</> : <><RefreshCw size={12} strokeWidth={1.5}/>KI-Neuformulierung</>}
              </button>
              <button onClick={() => setEditMode(false)} style={{ padding: "6px 14px", background: "rgba(240,236,227,0.06)", color: "rgba(240,236,227,0.5)", border: "none", borderRadius: "7px", fontSize: "12px", cursor: "pointer" }}>Abbrechen</button>
            </div>
          </div>
        ) : (
          <p style={{ margin: "0 0 12px", color: "rgba(240,236,227,0.92)", fontWeight: 600, fontSize: "14px" }}>{aufgabeText}</p>
        )}

        {hasBeleg && (
          <div style={{ marginBottom: "12px" }}>
            {effectiveMode === "beleg" ? <BelegAnzeige beleg={aufgabe.beleg} /> : (
            <GeschaeftsfallKarte
              text={aufgabe._geschaeftsfallEdit ?? geschaeftsfallText}
              editText={gfEditText}
              isEditing={gfEditMode}
              onEdit={val => { if (typeof val === "string") { setGfEditText(val); } else { setGfEditText(aufgabe._geschaeftsfallEdit ?? geschaeftsfallText ?? ""); setGfEditMode(true); } }}
              onSave={() => { if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _geschaeftsfallEdit: gfEditText.trim() || undefined }); setGfEditMode(false); }}
              onReset={() => { if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _geschaeftsfallEdit: undefined }); setGfEditMode(false); }}
              onCancel={() => setGfEditMode(false)}
              kiLaden={gfKiLaden}
              onKI={async () => {
                setGfKiLaden(true);
                try {
                  const origText = geschaeftsfallText || "";
                  const prompt = `Du bist bwr-sensei – BwR-Assistent für bayerische Realschulen (LehrplanPLUS Bayern).\nFormuliere diesen Geschäftsfall für Klasse ${klasse} vollständig um.\nPFLICHT: Verwende ANDERE Signalwörter, einen anderen Satzeinstieg und eine andere Satzkonstruktion als das Original. NICHT erlaubt: gleiche Wortreihenfolge mit minimalen Änderungen.\nBehalte: alle Zahlen, Beträge, Firmennamen und den fachlichen Inhalt exakt.\nSprache: ${parseInt(klasse) <= 9 ? "du/dein/dir" : "Sie/Ihr/Ihnen"}.\nAntworte NUR mit dem neuen Geschäftsfall-Text – keine Erklärung, keine Anführungszeichen.\n\nOriginal: ${origText}`;
                  const res = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: 200 });
                  const newText = (res?.content?.find?.(c => c.type === "text")?.text || res?.content?.[0]?.text || "").trim();
                  if (newText) {
                    if (onAufgabeChange) onAufgabeChange({ ...aufgabe, _geschaeftsfallEdit: newText });
                    setGfEditText(newText);
                  }
                } catch(e) { alert("KI-Fehler: " + e.message); }
                setGfKiLaden(false);
              }}
            />
          )}
          </div>
        )}

        {/* Schaubild: immer sichtbar */}
        {aufgabe.taskTyp === "schaubild" && aufgabe.schaubild && (
          <div>
            {/* Hinweis fiktive Daten */}
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, padding: "6px 12px", fontSize: "11px", color: "#92400e", marginBottom: 8, fontWeight: 600, display:"flex", alignItems:"flex-start", gap:5 }}>
              <AlertTriangle size={11} strokeWidth={1.5} style={{flexShrink:0,marginTop:1}}/><span>Hinweis: Die dargestellten Daten sind fiktiv und dienen ausschließlich zu Übungszwecken.</span>
            </div>
            <SchaubildAnzeige schaubild={aufgabe.schaubild} />
            <div style={{ marginTop: 12 }}>
              {(aufgabe.teilaufgaben || []).map((ta, ti) => (
                <div key={ti} style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 6px", color: "#f0ece3", fontWeight: 600, fontSize: "13px" }}>
                    <span style={{ fontWeight: 800, color: "#e8600a" }}>{ta.nr})</span> {ta.text}
                    <span style={{ marginLeft: 8, fontSize: "11px", color: "rgba(240,236,227,0.4)" }}>[{ta.punkte} P]</span>
                  </p>
                  {(showLoesung || open) ? (
                    <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 7, padding: "8px 12px", fontSize: "13px", color: "#4ade80" }}>
                      {ta.loesung}
                    </div>
                  ) : (
                    <div style={{ height: 32, border: "1px solid rgba(240,236,227,0.12)", borderRadius: 6, background: "rgba(240,236,227,0.05)" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(showLoesung || open) && aufgabe.taskTyp !== "schaubild" && (
          <div data-testid="loesung-container" style={{ background: isRechnung ? "rgba(139,92,246,0.08)" : "rgba(34,197,94,0.05)", border: `1px solid ${isRechnung ? "rgba(139,92,246,0.25)" : "rgba(74,222,128,0.2)"}`, borderRadius: "10px", padding: "14px 16px", marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
              {/* Ansicht-Toggle für Buchungslösungen */}
              {!isRechnung && aufgabe.soll && (
                <div style={{ display: "flex", border: "1.5px solid rgba(74,222,128,0.3)", borderRadius: "8px", overflow: "hidden" }}>
                  {[{ key: "buchungssatz", label: "Buchungssatz" }, { key: "tkonten", label: "T-Konten" }].map(opt => (
                    <button key={opt.key} onClick={() => setLoesungsView(opt.key)}
                      style={{ padding: "4px 12px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: loesungsView === opt.key ? 700 : 500,
                        background: loesungsView === opt.key ? "#16a34a" : "rgba(240,236,227,0.06)",
                        color: loesungsView === opt.key ? "#fff" : "rgba(240,236,227,0.6)" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {isRechnung && <span style={{ fontSize: "11px", fontWeight: 700, color: "#e8600a", textTransform: "uppercase" }}>✦ Lösung (Schema)</span>}
              <span style={{ fontSize: "12px", color: "rgba(240,236,227,0.55)" }}>
                <strong>{punkte} P</strong>
                {!isRechnung && aufgabe.nrPunkte > 0 && <span style={{ color: "rgba(240,236,227,0.4)" }}> = {(aufgabe.soll?.length || 0) + (aufgabe.haben?.length || 0)} BS-P + {aufgabe.nrPunkte} NR-P</span>}
              </span>
            </div>
            <NebenrechnungBox nrs={aufgabe.nebenrechnungen} nrPunkte={aufgabe.nrPunkte} />
            {isRechnung && aufgabe.schema && <SchemaTabelle rows={aufgabe.schema} />}
            {!isRechnung && aufgabe.soll && (
              loesungsView === "buchungssatz"
                ? <BuchungsSatz soll={aufgabe.soll} haben={aufgabe.haben} />
                : <TKonten soll={aufgabe.soll} haben={aufgabe.haben} />
            )}
            <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(232,96,10,0.12)", borderRadius: "8px", border: "1px solid rgba(232,96,10,0.3)", fontSize: "13px", color: "rgba(240,236,227,0.85)", lineHeight: 1.6 }}>
              💡 {renderMitTooltips(aufgabe.erklaerung)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

