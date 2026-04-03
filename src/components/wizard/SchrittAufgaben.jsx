// ══════════════════════════════════════════════════════════════════════════════
// SchrittAufgaben – Wizard Schritt 3: Aufgaben-Vorschau und Bearbeitung
// Extrahiert aus BuchungsWerk.jsx – Phase E6 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useMemo } from "react";
import { ClipboardList, Calendar, Download, FilePen, Printer,
         Monitor, Library, Save, CheckSquare } from "lucide-react";
import { fmt, fmtIBAN, berechnePunkte, LB_INFO, r2 } from "../../utils.js";
import { validatePoolBuchungssatz, belegPoolToBuchungssatz, engineFormatToPoolFormat } from "../../utils/buchungsEngine.js";
import { S } from "../../styles.js";
import { apiFetch } from "../../api.js";
import { useSettings, trackMastery } from "../../settings.js";
import { AUFGABEN_POOL } from "../../data/aufgabenPool.js";
import { IconFor } from "../IconFor.jsx";
import { FirmaLogoSVG } from "../beleg/BelegAnzeige.jsx";
import MaterialienModal from "../export/MaterialienModal.jsx";
import H5PModal from "../quiz/H5PModal.jsx";
import ExportModal from "../export/ExportModal.jsx";
import PunktePanel from "../aufgaben/PunktePanel.jsx";
import { AufgabeKarte, TheorieKarte, KomplexKarte } from "../aufgaben/AufgabeKarte.jsx";
import { KOMPLEX_STEP_DEFS } from "../../data/stammdaten.js";

const fmt_datum = iso => new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

export default function SchrittAufgaben({ config, firma, initialAufgaben, onNeu, onMaterialLaden, onThemen, onFirma, aufgabenRef }) {
  const settings = useSettings();
  const [showLoesungen, setShowLoesungen] = useState(!!settings.loesungenStandardAn);
  const [globalMode, setGlobalMode] = useState(settings.belegModus || "beleg"); // "beleg" | "text"
  const [exportOffen, setExportOffen] = useState(false);
  const [h5pOffen, setH5pOffen] = useState(false);
  const [materialienOffen, setMaterialienOffen] = useState(false);
  const [speichernStatus, setSpeichernStatus] = useState(""); // "" | "saving" | "ok" | "err"
  const [kiHistorie, setKiHistorie] = useState([]);
  const speichernTimerRef = useRef(null);
  useEffect(() => () => { if (speichernTimerRef.current) clearTimeout(speichernTimerRef.current); }, []);

  const pool = useMemo(() => {
    const result = [];
    Object.entries(config.selectedThemen).forEach(([lb, taskIds]) => {
      // Suche in allen Klassen (klassenübergreifende Wiederholung)
      // taskIds kann Duplikate enthalten (für count > 1)
      [7, 8, 9, 10].forEach(k => {
        (AUFGABEN_POOL[k]?.[lb] || []).forEach(t => {
          const cnt = taskIds.filter(x => x === t.id).length;
          for (let i = 0; i < cnt; i++) result.push(t);
        });
      });
    });
    return result;
  }, [config.selectedThemen]);

  const [aufgaben, setAufgaben] = useState(() => {
    if (initialAufgaben) return initialAufgaben;
    if (pool.length === 0) return [];
    const result = [];
    let punkteSum = 0;
    const zielAnzahl = config.anzahl || 5;
    const maxRunden = config.maxPunkte ? 50 : zielAnzahl * 4; // safety cap
    let teilaufgabenSum = 0; // Komplexaufgaben zählen als N Teilaufgaben
    for (let i = 0; i < maxRunden; i++) {
      const typ = pool[i % pool.length];
      const isLB2 = Object.keys(config.selectedThemen).some(lb => lb.includes("Werkstoffe"));
      const opts = {
        werkstoffId: config.werkstoffId || "rohstoffe",
        ...(typ.id === "8_komplex_einkauf_kette" ? (config.komplexOpts || {}) : {}),
        ...(typ.id === "8_komplex_verkauf_kette"    ? (config.verkaufOpts    || {}) : {}),
        ...(typ.id === "9_komplex_forderungskette"  ? (config.forderungOpts  || {}) : {}),
        ...(typ.id === "10_komplex_abschlusskette" ? (config.abschlussOpts || {}) : {}),
        ...(typ.id.startsWith("7_pct_") ? (config.pctOpts || {}) : {}),
      };
      let gen;
      try {
        gen = typ.taskTyp === "theorie" ? typ.generate() : typ.generate(firma, opts);

        // ── Engine-Safety-Net ────────────────────────────────────────────────
        // 1. Pool-Bilanzcheck: Soll-Summe muss Haben-Summe entsprechen
        if (gen && typeof validatePoolBuchungssatz === 'function') {
          validatePoolBuchungssatz(gen, typ.id);
        }

        // 2. Beleg-Crosscheck → Engine autoritativ für Beleg-Tasks
        if (gen?.beleg?.typ && typeof belegPoolToBuchungssatz === 'function') {
          try {
            const klasseNum = parseInt(config?.klasse || 8, 10);
            const engineResult = belegPoolToBuchungssatz(gen.beleg, klasseNum);

            if (engineResult?.buchungssatz?.length) {
              // Engine-Output in Pool-Format konvertieren und Pool-Werte ersetzen
              const enginePool = engineFormatToPoolFormat(engineResult.buchungssatz);
              gen = { ...gen, soll: enginePool.soll, haben: enginePool.haben };

              if (import.meta.env?.DEV) {
                console.info(`[BuchungsEngine] ✅ Task "${typ.id}": Engine-Output autoritativ gesetzt (${enginePool.soll.length} Soll, ${enginePool.haben.length} Haben)`);
              }
            }
          } catch (engineErr) {
            // Engine-Fehler → Pool-Werte bleiben (Graceful Degradation)
            if (import.meta.env?.DEV) {
              console.warn(`[BuchungsEngine] ⚠️ Engine-Override fehlgeschlagen für "${typ.id}" – Pool-Werte behalten:`, engineErr.message);
            }
          }
        }
        // ── Ende Engine-Safety-Net ─────────────────────────────────────────

      } catch(e) {
        console.warn("BuchungsWerk: Fehler in generate() für", typ.id, e.message);
        continue;
      }
      if (!gen) continue;
      const pts = typ.taskTyp === "komplex"
        ? (gen.schritte || []).reduce((s, st) => s + st.punkte, 0)
        : typ.taskTyp === "theorie"
          ? (gen.nrPunkte || 4)
          : typ.taskTyp === "rechnung" || typ.taskTyp === "schaubild"
          ? (gen.punkte || gen.nrPunkte || 3)
          : (gen.soll?.length || 0) + (gen.haben?.length || 0) + (gen.nrPunkte || 0);
      // Komplex-Aufgabe zählt als so viele Teilaufgaben wie sie Schritte hat
      const schrittAnzahl = typ.taskTyp === "komplex" ? (gen.schritte || []).length : 1;
      if (config.maxPunkte && punkteSum + pts > config.maxPunkte) break;
      if (!config.maxPunkte && result.length > 0 && teilaufgabenSum + schrittAnzahl > zielAnzahl) break;
      result.push({ ...gen, titel: typ.titel, id: `${typ.id}_${i}`, taskTyp: typ.taskTyp || "buchung", themenTyp: typ.themenTyp,
        _baseTypId: typ.id, _typ: typ, _opts: opts, _firma: firma });
      punkteSum += pts;
      teilaufgabenSum += schrittAnzahl;
    }
    // Mastery tracking: Nutzung pro Task-Typ speichern
    try { trackMastery(result); } catch {}
    return result;
  });

  useEffect(() => { if (aufgabenRef) aufgabenRef.current = aufgaben; }, [aufgaben, aufgabenRef]);

  const gesamtPunkte = aufgaben.reduce((s, a) => s + berechnePunkte(a), 0);
  const activeLBs = Object.keys(config.selectedThemen);

  return (
    <div>
      {exportOffen && (
        <ExportModal
          aufgaben={aufgaben}
          config={config}
          firma={firma}
          kiHistorie={kiHistorie}
          onSchliessen={() => setExportOffen(false)}
        />
      )}
      {h5pOffen && (
        <H5PModal
          aufgaben={aufgaben}
          config={config}
          firma={firma}
          onSchliessen={() => setH5pOffen(false)}
        />
      )}
      {materialienOffen && (
        <MaterialienModal
          onSchliessen={() => setMaterialienOffen(false)}
          onLaden={onMaterialLaden}
        />
      )}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={S.label}>Schritt 3 von 3 · Vorschau</div>
            <div style={S.h2}>
              {config.typ}{config.pruefungsart ? ` · ${config.pruefungsart}` : ""} · Klasse {config.klasse}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, ...S.tag(firma.farbe) }}><FirmaLogoSVG firma={firma} size={18}/>{firma.name}</span>
              {config.pruefungsart && <span style={{ display:"inline-flex", alignItems:"center", gap:4, ...S.tag("#0f172a") }}><ClipboardList size={11} strokeWidth={1.5}/>{config.pruefungsart}</span>}
              {activeLBs.map(lb => { const m = LB_INFO[lb] || { icon: "FileText", farbe: "#475569" }; return <span key={lb} style={{ display:"inline-flex", alignItems:"center", gap:3, ...S.tag(m.farbe) }}><IconFor name={m.icon} size={11} />{lb.split("·")[0].trim()}</span>; })}
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, ...S.tag("#475569") }}><Calendar size={11} strokeWidth={1.5}/>{fmt_datum(config.datum)}</span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, ...S.tag("#475569") }}><ClipboardList size={11} strokeWidth={1.5}/>{aufgaben.reduce((s,a) => s + (a.taskTyp === "komplex" ? (a.schritte?.length || 1) : Array.isArray(a.teilaufgaben) ? a.teilaufgaben.length : 1), 0)} Aufg. · {gesamtPunkte} P</span>
            </div>
            {/* Fortschrittsleiste bei Punktziel */}
            {config.maxPunkte && (
              <div style={{ marginTop: "10px", maxWidth: "360px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(240,236,227,0.45)", marginBottom: "3px" }}>
                  <span>Punkteausnutzung</span>
                  <span style={S.bold}>{gesamtPunkte} / {config.maxPunkte} P ({Math.round(gesamtPunkte/config.maxPunkte*100)} %)</span>
                </div>
                <div style={{ height: "8px", background: "rgba(240,236,227,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: Math.min(100, Math.round(gesamtPunkte/config.maxPunkte*100)) + "%", background: "#e8600a", borderRadius: "4px" }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>

            {/* ── Globaler Modus-Schalter (Pill-Slider) ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>Alle Aufgaben</div>
              <div
                onClick={() => setGlobalMode(globalMode === "beleg" ? "text" : "beleg")}
                title={globalMode === "beleg" ? "Zum Geschäftsfall wechseln" : "Zum Beleg wechseln"}
                style={{ position:"relative", display:"flex", background:"rgba(20,16,8,0.8)", border:"1.5px solid rgba(240,236,227,0.18)", borderRadius:"24px", padding:"3px", cursor:"pointer", userSelect:"none", width:"168px", flexShrink:0 }}>
                {/* Gleitender Thumb */}
                <div style={{
                  position:"absolute", top:3,
                  left: globalMode === "beleg" ? 3 : "calc(50% + 1px)",
                  width:"calc(50% - 4px)", height:"calc(100% - 6px)",
                  background:"linear-gradient(180deg,#f07320 0%,#e8600a 55%,#c24f08 100%)",
                  borderRadius:"20px",
                  transition:"left 0.22s cubic-bezier(.4,0,.2,1)",
                  boxShadow:"0 2px 6px rgba(232,96,10,0.5), inset 0 1px 0 rgba(255,200,80,0.18)",
                  pointerEvents:"none",
                }}/>
                <span style={{ position:"relative", zIndex:1, padding:"5px 0", color: globalMode === "beleg" ? "#f0ece3" : "rgba(240,236,227,0.4)", fontWeight:700, fontSize:"11px", letterSpacing:"0.03em", transition:"color 0.15s", flex:1, textAlign:"center" }}>Beleg</span>
                <span style={{ position:"relative", zIndex:1, padding:"5px 0", color: globalMode === "text" ? "#f0ece3" : "rgba(240,236,227,0.4)", fontWeight:700, fontSize:"11px", letterSpacing:"0.03em", transition:"color 0.15s", flex:1, textAlign:"center" }}>GF</span>
              </div>
            </div>

            <button onClick={() => setShowLoesungen(!showLoesungen)} style={S.btnSecondary}>{showLoesungen ? "Lösungen ausblenden" : "Alle Lösungen"}</button>
            <button onClick={() => {
              try {
                const ki = JSON.parse(localStorage.getItem("buchungswerk_ki_export") || "[]");
                setKiHistorie(ki);
              } catch { setKiHistorie([]); }
              setExportOffen(true);
            }} style={{ ...S.btnPrimary, display:"flex", alignItems:"center", gap:"7px" }}>
              <Download size={14} strokeWidth={1.5}/>Export
            </button>
            <button onClick={() => setH5pOffen(true)} style={{ ...S.btnSecondary, display:"flex", alignItems:"center", gap:6, padding:"10px 16px", fontSize:"13px" }}><Monitor size={14} strokeWidth={1.5}/>H5P</button>
            <button onClick={() => setMaterialienOffen(true)} style={{ ...S.btnSecondary, display:"flex", alignItems:"center", gap:6 }}><Library size={14} strokeWidth={1.5}/>Materialien</button>
            <button onClick={onFirma} style={{ padding:"6px 14px", borderRadius:"8px", border:"1px solid rgba(240,236,227,0.15)", background:"rgba(240,236,227,0.05)", color:"rgba(240,236,227,0.45)", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>‹ Unternehmen</button>
            <button onClick={onThemen} style={{ padding:"6px 14px", borderRadius:"8px", border:"1px solid rgba(240,236,227,0.15)", background:"rgba(240,236,227,0.05)", color:"rgba(240,236,227,0.45)", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>‹‹ Themen</button>
            <button onClick={async () => {
              setSpeichernStatus("saving");
              const titel = `${config.typ}${config.pruefungsart ? " · " + config.pruefungsart : ""} · Kl. ${config.klasse} · ${firma.name}`;
              const res = await apiFetch("/materialien", "POST", {
                titel,
                jahrgangsstufe: config.klasse,
                typ: config.typ,
                pruefungsart: config.pruefungsart || null,
                firma_name: firma.name,
                firma_icon: firma.icon,
                gesamt_punkte: gesamtPunkte,
                daten_json: JSON.stringify({ config, firma, aufgaben }),
              });
              setSpeichernStatus(res ? "ok" : "err");
              if (speichernTimerRef.current) clearTimeout(speichernTimerRef.current);
              speichernTimerRef.current = setTimeout(() => setSpeichernStatus(""), 3000);
            }} style={{ ...S.btnPrimary, display:"flex", alignItems:"center", gap:6, ...(speichernStatus === "ok" && { background: "rgba(74,222,128,0.85)", boxShadow: "0 3px 0 rgba(0,0,0,0.5), 0 0 16px rgba(74,222,128,0.35)" }), ...(speichernStatus === "err" && { background: "rgba(239,68,68,0.9)" }), ...(speichernStatus === "saving" && { opacity: 0.7 }) }}>
              {speichernStatus === "saving" ? <><Save size={14} strokeWidth={1.5}/>…</> : speichernStatus === "ok" ? <><CheckSquare size={14} strokeWidth={1.5}/>Gespeichert</> : speichernStatus === "err" ? "✗ Fehler" : <><Save size={14} strokeWidth={1.5}/>Speichern</>}
            </button>
          </div>
        </div>

        {/* Firmen-Vorspann */}
        {(() => {
          const intro = config.klasse <= 9
            ? `Du bist als Auszubildende/r im Unternehmen tätig und mit Aufgaben des betrieblichen Rechnungswesens betraut.`
            : `Als Mitarbeiterin bzw. Mitarbeiter im Unternehmen sind Sie mit Aufgaben des betrieblichen Rechnungswesens betraut.`;
          const wtLabels = [
            ["Rohstoffe", firma.rohstoffe],
            ["Hilfsstoffe", firma.hilfsstoffe],
            ["Fremdbauteile", firma.fremdbauteile],
            ["Betriebsstoffe", firma.betriebsstoffe],
          ].filter(([, list]) => list?.length);
          return (
            <div style={{ marginTop: "18px", padding: "14px 18px", background: "rgba(240,236,227,0.04)", border: `1px solid rgba(240,236,227,0.1)`, borderLeft: `4px solid ${firma.farbe}`, borderRadius: "10px", textAlign: "left", backdropFilter:"blur(8px)" }}>
              <div style={{ fontSize: "13px", color: "rgba(240,236,227,0.9)", marginBottom: "8px", textAlign: "left" }}>
                <strong style={{color:"#f0ece3"}}><IconFor name={firma.icon} size={13} style={{ verticalAlign:"middle", marginRight:4 }} />{firma.name}</strong>, {firma.plz} {firma.ort} – {firma.slogan} {intro}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "5px", fontSize: "12px", color: "rgba(240,236,227,0.7)", marginBottom: "8px", textAlign: "left" }}>
                <div><strong style={{color:"rgba(240,236,227,0.85)"}}>Rechtsform:</strong> {firma.rechtsform}</div>
                <div><strong style={{color:"rgba(240,236,227,0.85)"}}>Inhaber/in:</strong> {firma.inhaber}</div>
                <div><strong style={{color:"rgba(240,236,227,0.85)"}}>Branche:</strong> {firma.branche}</div>
                <div><strong style={{color:"rgba(240,236,227,0.85)"}}>IBAN:</strong> {fmtIBAN(firma.iban).slice(0, 18)}…</div>
              </div>
              {/* Werkstoffe */}
              <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px", textAlign: "left" }}>
                {wtLabels.map(([label, list]) => (
                  <div key={label} style={{ fontSize: "12px", color: "rgba(240,236,227,0.7)" }}>
                    <strong style={{color:"rgba(240,236,227,0.85)"}}>{label}:</strong> {list.join(", ")}
                  </div>
                ))}
              </div>
              <div style={{ padding: "6px 10px", background: "rgba(240,236,227,0.08)", borderRadius: "6px", fontSize: "11px", color: "rgba(240,236,227,0.6)", textAlign: "left", border:"1px solid rgba(240,236,227,0.12)" }}>
                <strong style={{color:"rgba(240,236,227,0.8)"}}>Formale Vorgaben:</strong> Bei Buchungssätzen sind Kontonummer, Kontobezeichnung und Betrag anzugeben. Ergebnisse auf zwei Nachkommastellen runden. Sofern nicht anders angegeben: USt-Satz 19 %.
              </div>
            </div>
          );
        })()}
      </div>

      <PunktePanel aufgaben={aufgaben} typ={config.typ} maxPunkte={config.maxPunkte} />

      {aufgaben.map((a, i) =>
        a.taskTyp === "komplex"
          ? <KomplexKarte key={a.id} aufgabe={a} nr={i + 1} showLoesung={showLoesungen} globalMode={globalMode} klasse={config.klasse}
              onAufgabeChange={updated => setAufgaben(prev => prev.map((x, xi) => xi === i ? updated : x))}
              onSchrittEntfernen={schrittIdx => {
                setAufgaben(prev => prev.map((aufg, ai) => {
                  if (ai !== i) return aufg;
                  const optsKey = (aufg.schritte || [])[schrittIdx]?._optsKey;
                  // Wenn kein optsKey → einfaches Filtern (Schritt ist immer vorhanden)
                  if (!optsKey || !aufg._typ) {
                    const neuSchritte = (aufg.schritte || [])
                      .filter((_, si) => si !== schrittIdx)
                      .map((s, ni) => ({ ...s, nr: ni + 1 }));
                    return { ...aufg, schritte: neuSchritte };
                  }
                  // Mit optsKey → Neugeneration mit deaktiviertem Schritt
                  const newOpts = { ...aufg._opts, [optsKey]: false };
                  try {
                    const gen = aufg._typ.generate(aufg._firma, newOpts);
                    if (!gen) return aufg;
                    return { ...aufg, ...gen, _opts: newOpts };
                  } catch { return aufg; }
                }));
              }}
              onSchrittHinzufuegen={optsKey => {
                setAufgaben(prev => prev.map((aufg, ai) => {
                  if (ai !== i || !aufg._typ) return aufg;
                  const newOpts = { ...aufg._opts, [optsKey]: true };
                  try {
                    const gen = aufg._typ.generate(aufg._firma, newOpts);
                    if (!gen) return aufg;
                    return { ...aufg, ...gen, _opts: newOpts };
                  } catch { return aufg; }
                }));
              }}
            />
          : a.taskTyp === "theorie"
          ? <TheorieKarte  key={a.id} aufgabe={a} nr={i + 1} showLoesung={showLoesungen} klasse={config.klasse} />
          : <AufgabeKarte  key={a.id} aufgabe={a} nr={i + 1} showLoesung={showLoesungen} globalMode={globalMode} klasse={config.klasse}
              onAufgabeChange={updated => setAufgaben(prev => prev.map((x, xi) => xi === i ? updated : x))} />
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", alignItems:"center" }}>
        <button onClick={onFirma} style={{ padding:"8px 16px", borderRadius:"8px", border:"1.5px solid #334155", background:"transparent", color:"#94a3b8", fontWeight:700, fontSize:12, cursor:"pointer" }}>‹ Unternehmen</button>
        <button onClick={onThemen} style={{ padding:"8px 16px", borderRadius:"8px", border:"1px solid rgba(240,236,227,0.15)", background:"rgba(240,236,227,0.05)", color:"rgba(240,236,227,0.45)", fontWeight:700, fontSize:12, cursor:"pointer" }}>‹‹ Themen</button>
        <button onClick={onNeu} style={S.btnSecondary}>✕ Neu starten</button>
        <button onClick={() => {
          try {
            const ki = JSON.parse(localStorage.getItem("buchungswerk_ki_export") || "[]");
            setKiHistorie(ki);
          } catch { setKiHistorie([]); }
          setExportOffen(true);
        }} style={{ ...S.btnPrimary, display:"flex", alignItems:"center", gap:"7px" }}>
          <FilePen size={15} strokeWidth={2}/>
          <Printer size={15} strokeWidth={2}/>
          Exportieren
        </button>
        <button onClick={() => setH5pOffen(true)} style={{ ...S.btnPrimary, display:"flex", alignItems:"center", gap:"7px" }}>
          <Monitor size={15} strokeWidth={2}/>
          H5P exportieren
        </button>
      </div>
    </div>
  );
}



