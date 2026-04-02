// ══════════════════════════════════════════════════════════════════════════════
// BankingSimulator7 – Virtueller Bankarbeitsplatz-Simulator (Klasse 7–10)
// Extrahiert aus BuchungsWerk.jsx – Phase D3 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from "react";
import { Mail, Receipt, Calendar, FileText, BookOpen, Briefcase, Timer,
         Laptop, AtSign, Layers, Trophy, TrendingUp, BarChart2, TrendingDown,
         GraduationCap, Landmark, CheckSquare, XCircle, Upload } from "lucide-react";
import { BANK_AUFGABEN, BANK8_AUFGABEN, BANK9_AUFGABEN, BANK10_AUFGABEN,
         BOERSEN_AKTIEN, BOERSEN_EREIGNISSE, DESK_MAP,
         KALENDER_EINTRAEGE, KALENDER8_EINTRAEGE, KALENDER9_EINTRAEGE, KALENDER10_EINTRAEGE,
         BANK_IBAN, BANK_START } from "../../data/simulatorDaten.js";

function LiveTKonto({ sollKuerzel, habenKuerzel, betrag }) {
  const fmt = (b) => Number(b).toLocaleString("de-DE", { minimumFractionDigits:2 });
  const Seite = ({ kuerzel, aktiveSeite }) => (
    <div style={{ flex:1, border:"1px solid rgba(74,222,128,0.2)", borderRadius:8, overflow:"hidden" }}>
      <div style={{ padding:"3px 8px", background:"rgba(74,222,128,0.08)", borderBottom:"1px solid rgba(74,222,128,0.12)", fontSize:10, fontWeight:800, color:"#4ade80", textAlign:"center", letterSpacing:".05em" }}>{kuerzel}</div>
      <div style={{ display:"flex", minHeight:44 }}>
        {["SOLL","HABEN"].map(s => (
          <div key={s} style={{ flex:1, borderRight:s==="SOLL"?"1px solid rgba(240,236,227,0.07)":"none", padding:"5px 8px" }}>
            <div style={{ fontSize:7.5, color:"rgba(240,236,227,0.25)", marginBottom:3 }}>{s}</div>
            {s === aktiveSeite
              ? <div style={{ fontSize:13, fontWeight:800, color:"#4ade80", fontFamily:"'Fira Code',monospace" }}>{fmt(betrag)}</div>
              : <div style={{ fontSize:10, color:"rgba(240,236,227,0.12)", fontFamily:"'Fira Code',monospace" }}>—</div>}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ marginTop:10, padding:"9px 11px", background:"rgba(74,222,128,0.04)", border:"1px solid rgba(74,222,128,0.14)", borderRadius:10 }}>
      <div style={{ fontSize:9, fontWeight:800, color:"rgba(74,222,128,0.55)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:7 }}>T-Konto · Buchung</div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <Seite kuerzel={sollKuerzel} aktiveSeite="SOLL"/>
        <div style={{ fontSize:14, color:"rgba(74,222,128,0.35)", flexShrink:0 }}>→</div>
        <Seite kuerzel={habenKuerzel} aktiveSeite="HABEN"/>
      </div>
    </div>
  );
}

export default function BankingSimulator7({ firma, onAbschluss, lehrerConfig = {}, klasse = "7", modus = "stunde", stundenMin = 45, onFortschritt }) {
  const firmaName = firma?.name || "MöbelWerk GmbH";
  const aufgabenListe = React.useMemo(() => {
    const NEUE_TYPEN = ["lueckentext","zuordnung","multi_mc","freitext","kette"];
    const klasse9Themen  = ["buchung","ueberweisung","beleg","theorie","aktie_kauf","aktie_verkauf","dividende",...NEUE_TYPEN];
    const klasse10Themen = ["buchung","theorie","klr",...NEUE_TYPEN];
    const erlaubteThemen = lehrerConfig.themen || (klasse === "10" ? klasse10Themen : klasse === "9" ? klasse9Themen : ["buchung","ueberweisung","dauerauftrag","beleg","theorie",...NEUE_TYPEN]);
    const pool = klasse === "10" ? BANK10_AUFGABEN : klasse === "9" ? BANK9_AUFGABEN : (klasse === "8" ? BANK8_AUFGABEN : BANK_AUFGABEN);
    let gefiltert = pool.filter(a => {
      if (!erlaubteThemen.includes(a.aktion)) return false;
      if (a.nurMitUst && !lehrerConfig.mitUst) return false;
      return true;
    });
    // Grundwissen: Vorklassen-Aufgaben (einfache Buchungen + MC) voranstellen
    if (lehrerConfig.grundwissen && klasse !== "7") {
      const vorPools = {
        "8":  BANK_AUFGABEN,
        "9":  [...BANK_AUFGABEN, ...BANK8_AUFGABEN],
        "10": [...BANK9_AUFGABEN],
      };
      const gwPool = (vorPools[klasse] || []).filter(a => ["buchung","theorie"].includes(a.aktion) && !a.nurMitUst);
      const gwTasks = gwPool.slice(0, 3).map(a => ({ ...a, id: "gw_"+a.id, grundwissen: true }));
      gefiltert = [...gwTasks, ...gefiltert];
    }
    return gefiltert;
  }, []); // eslint-disable-line

  const [aufgabeIdx,   setAufgabeIdx]   = useState(0);
  const [kontostand,   setKontostand]   = useState(BANK_START);
  const [ansicht,      setAnsicht]      = useState(aufgabenListe[0]?.ansicht || "konto");
  const [buchAntwort,  setBuchAntwort]  = useState({ soll: [""], haben: [""], betragSoll: [""], betragHaben: [""] });
  const [feedback,     setFeedback]     = useState(null);
  const [verlauf,      setVerlauf]      = useState([]);
  const [punkte,       setPunkte]       = useState(0);
  const [aktionOk,     setAktionOk]     = useState(false);
  const [daForm,       setDaForm]       = useState({});
  const [ueForm,       setUeForm]       = useState({});
  const [belegUeForm,  setBelegUeForm]  = useState({ empfaenger:"", iban:"", betrag:"", verwendung:"" });
  const [belegUeOk,    setBelegUeOk]    = useState(false); // Überweisung im Beleg bestätigt
  const [belegUePunkte,setBelegUePunkte]= useState(0);     // Punkte für Ue-Richtigkeit
  const [taskStartTime,setTaskStartTime]= useState(Date.now());
  const [startTime]                     = useState(Date.now);
  const [elapsed,      setElapsed]      = useState(0);
  const [szene,        setSzene]        = useState("schreibtisch"); // schreibtisch | vorfall
  const [theorieAntwort,setTheorieAntwort] = useState(null);  // index der gewählten MC-Option
  const [kalkAntwort,  setKalkAntwort]  = useState("");        // numerische Antwort Kalkulation
  const [deskPopup,    setDeskPopup]    = useState(null);      // "kalender"|"email"|"post"|null
  const [zeitAbgelaufen,setZeitAbgelaufen] = useState(false);  // Zeitlimit überschritten
  const [mahnungen,    setMahnungen]    = useState(new Set()); // Tags mit bereits abgezogenem Mahnpunkt
  const [kalSelTag,    setKalSelTag]    = useState(null);      // ausgewählter Kalendertag
  const [boersenTab,   setBoersenTab]   = useState("depot");   // "depot"|"markt" im Börsencockpit
  const [klrTab,       setKlrTab]       = useState("bab");     // "bab"|"dbr"|"kz" im KLR-Cockpit
  const [lueckenEingaben, setLueckenEingaben] = useState({});  // { lücken-id → eingabe } für Lückentext-Aufgaben
  const [zuordnungState,  setZuordnungState]  = useState({});  // { item-id → kategorie-id } für Zuordnungs-Aufgaben
  const [multiMcState,    setMultiMcState]    = useState([]);  // Array gewählter Indizes für Multi-Choice
  const [freitextAntwort, setFreitextAntwort] = useState(""); // Freitext-Eingabe
  const [ketteSchritt,    setKetteSchritt]    = useState(0);   // aktiver Schritt in Ketten-Aufgabe
  // ── Kanban-State ──────────────────────────────────────────────────────────
  const [kbBacklog,    setKbBacklog]    = useState([]);   // task-ids im Backlog
  const [kbDoing,      setKbDoing]      = useState(null); // task-id in Doing (null = leer)
  const [kbDragId,     setKbDragId]     = useState(null); // aktuell gezogene task-id
  const [kbDragOver,   setKbDragOver]   = useState(null); // "backlog"|"doing"|"pool"|null
  const [selMailId,    setSelMailId]    = useState(null); // geöffnete Mail im Inbox

  const [tutorialOffen, setTutorialOffen] = useState(() => { try { return !localStorage.getItem("bw_sim_tutorial_seen"); } catch { return true; } });

  const aufgabe   = kbDoing ? (aufgabenListe.find(a => a.id === kbDoing) ?? null) : null;
  const maxPunkte = aufgabenListe.reduce((s,a) => s + a.punkte, 0);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  // Fortschritt an Elternkomponente melden (für Heartbeat / Live-Dashboard)
  React.useEffect(() => {
    onFortschritt?.(punkte, maxPunkte);
  }, [punkte]); // eslint-disable-line

  // Zeitlimit: Punkt abziehen wenn Schüler zu lang wartet
  React.useEffect(() => {
    if (!lehrerConfig.zeitlimitSek || zeitAbgelaufen || feedback !== null || szene !== "schreibtisch") return;
    const sek = (Date.now() - taskStartTime) / 1000;
    if (sek >= lehrerConfig.zeitlimitSek) {
      setPunkte(p => Math.max(0, p - 1));
      setZeitAbgelaufen(true);
    }
  }, [elapsed]); // eslint-disable-line

  // Reset-Effekt: wenn eine neue Aufgabe in "doing" gezogen wird
  React.useEffect(() => {
    if (!kbDoing) return;
    const a = aufgabenListe.find(a => a.id === kbDoing);
    if (!a) return;
    setAnsicht(a.ansicht || "konto");
    setFeedback(null);
    const nS = Math.max(1,(a.soll||[]).length), nH = Math.max(1,(a.haben||[]).length);
    setBuchAntwort({ soll: Array(nS).fill(""), haben: Array(nH).fill(""), betragSoll: Array(nS).fill(""), betragHaben: Array(nH).fill("") });
    setAktionOk(false);
    setBelegUeOk(false);
    setBelegUePunkte(0);
    setBelegUeForm({ empfaenger:"", iban:"", betrag:"", verwendung:"" });
    setTheorieAntwort(null);
    setKalkAntwort("");
    setLueckenEingaben({});
    setZuordnungState({});
    setMultiMcState([]);
    setFreitextAntwort("");
    setKetteSchritt(0);
    setDeskPopup(null);
    setZeitAbgelaufen(false);
    setKalSelTag(null);
    setTaskStartTime(Date.now());
    if (a.dauerauftragsDaten) setDaForm({ empfaenger: a.dauerauftragsDaten.empfaenger, rhythmus:"monatlich", tag:"1" });
    else setDaForm({});
    if (a.aktion !== "beleg" && a.ueberweisungsDaten) setUeForm({ empfaenger: a.ueberweisungsDaten.empfaenger });
    else if (a.aktion !== "beleg") setUeForm({});
  }, [kbDoing]); // eslint-disable-line

  function pruefen() {
    let buchOk = false;
    if (aufgabe.typ === "mc") {
      buchOk = theorieAntwort === aufgabe.mcKorrekt;
    } else if (aufgabe.typ === "kalkulation") {
      // Akzeptiere deutsches Format (1.234,56) und internationales (1234.56)
      const normiert = (kalkAntwort || "").trim()
        .replace(/\./g, "").replace(",", ".");    // 1.234,56 → 123456 → 1234.56
      const val = parseFloat(normiert);
      buchOk = !isNaN(val) && Math.abs(val - aufgabe.kalkulation.richtigerWert) < 0.055;
    } else if (aufgabe.typ === "lueckentext") {
      // Alle Lücken müssen korrekt ausgefüllt sein
      buchOk = (aufgabe.lueckentext?.luecken || []).length > 0 &&
        (aufgabe.lueckentext.luecken).every((l) => {
          const eingabe = (lueckenEingaben[l.id] || "").trim().toUpperCase();
          const erlaubt = [l.korrekt, ...(l.korrektAlt || [])].map(k => k.toUpperCase());
          return erlaubt.includes(eingabe);
        });
    } else if (aufgabe.typ === "zuordnung") {
      // Alle Items müssen der richtigen Kategorie zugewiesen sein
      buchOk = (aufgabe.zuordnung?.items || []).length > 0 &&
        (aufgabe.zuordnung.items).every(item =>
          (zuordnungState[item.id] || "") === item.korrektKat
        );
    } else if (aufgabe.typ === "multi_mc") {
      // Exakt die richtigen Antworten müssen ausgewählt sein
      const korrektSet = new Set(aufgabe.multiKorrekt || []);
      const gewaehlt   = new Set(multiMcState);
      buchOk = korrektSet.size > 0 &&
        [...korrektSet].every(i => gewaehlt.has(i)) &&
        [...gewaehlt].every(i => korrektSet.has(i));
    } else if (aufgabe.typ === "freitext") {
      // Freitext: akzeptiert wenn ausreichend Text eingegeben (selbst bewertet)
      buchOk = (freitextAntwort || "").trim().length >= (aufgabe.freitext?.minZeichen || 20);
    } else if (aufgabe.typ === "kette") {
      // Ketten-Aufgabe: aktuellen Schritt prüfen, dann eigene Punkte setzen und early-return
      const ks = aufgabe.kette[ketteSchritt];
      if (ks.typ === "mc") {
        buchOk = theorieAntwort === ks.mcKorrekt;
      } else if (ks.typ === "kalkulation") {
        const n = (kalkAntwort || "").trim().replace(/\./g, "").replace(",", ".");
        const v = parseFloat(n);
        buchOk = !isNaN(v) && Math.abs(v - ks.kalkulation.richtigerWert) < 0.055;
      } else if (ks.typ === "buchung") {
        const eS = (buchAntwort.soll||[""]).map(s=>(s||"").trim().toUpperCase()).filter(Boolean);
        const eH = (buchAntwort.haben||[""]).map(h=>(h||"").trim().toUpperCase()).filter(Boolean);
        const rS = ks.soll.map(s=>[s.kuerzel.toUpperCase(),s.nr||""]);
        const rH = ks.haben.map(h=>[h.kuerzel.toUpperCase(),h.nr||""]);
        const _pbk = s => { const n=(s||"").trim().replace(/\./g,"").replace(",","."); return parseFloat(n); };
        const _sbk = i => ks.soll[i]?.betrag ?? (ks.soll.length===1 ? ks.betrag ?? aufgabe.betrag : null);
        const _hbk = i => ks.haben[i]?.betrag ?? (ks.haben.length===1 ? ks.betrag ?? aufgabe.betrag : null);
        const kontoOkK = rS.length>0 && rH.length>0
               && eS.length===rS.length
               && rS.every(([k,n])=>eS.some(e=>e===k||(n&&e===n)))
               && eS.every(e=>rS.some(([k,n])=>e===k||(n&&e===n)))
               && eH.length===rH.length
               && rH.every(([k,n])=>eH.some(e=>e===k||(n&&e===n)))
               && eH.every(e=>rH.some(([k,n])=>e===k||(n&&e===n)));
        const betragOkK = ks.soll.every((_,i)=>{
          const e=_sbk(i); if(e===null||e===undefined) return true;
          const v=_pbk((buchAntwort.betragSoll||[])[i]); return !isNaN(v)&&Math.abs(v-e)<0.055;
        }) && ks.haben.every((_,i)=>{
          const e=_hbk(i); if(e===null||e===undefined) return true;
          const v=_pbk((buchAntwort.betragHaben||[])[i]); return !isNaN(v)&&Math.abs(v-e)<0.055;
        });
        buchOk = kontoOkK && betragOkK;
      }
      const sekK = (Date.now() - taskStartTime) / 1000;
      const spK  = buchOk && lehrerConfig.geschwindigkeitsBonus !== false && sekK <= 30 ? 1 : 0;
      const gewK = (buchOk ? (ks.punkte || 1) : 0) + spK;
      setPunkte(p => p + gewK);
      setFeedback(buchOk ? "richtig" : "falsch");
      // verlauf nur beim letzten Schritt
      if (ketteSchritt === aufgabe.kette.length - 1) {
        setVerlauf(v => [...v, { ...aufgabe, korrekt: buchOk, gewPunkte: gewK, speedBonus: spK }]);
      }
      return; // ← kein gemeinsamer Tail
    } else {
      const eS = (buchAntwort.soll||[""]).map(s=>(s||"").trim().toUpperCase()).filter(Boolean);
      const eH = (buchAntwort.haben||[""]).map(h=>(h||"").trim().toUpperCase()).filter(Boolean);
      const rS = aufgabe.soll.map(s=>[s.kuerzel.toUpperCase(),s.nr||""]);
      const rH = aufgabe.haben.map(h=>[h.kuerzel.toUpperCase(),h.nr||""]);
      const kontoOk = rS.length>0 && rH.length>0
             && eS.length===rS.length
             && rS.every(([k,n])=>eS.some(e=>e===k||(n&&e===n)))
             && eS.every(e=>rS.some(([k,n])=>e===k||(n&&e===n)))
             && eH.length===rH.length
             && rH.every(([k,n])=>eH.some(e=>e===k||(n&&e===n)))
             && eH.every(e=>rH.some(([k,n])=>e===k||(n&&e===n)));
      // Betrag-Validierung
      const _pb = s => { const n=(s||"").trim().replace(/\./g,"").replace(",","."); return parseFloat(n); };
      const _sb = i => aufgabe.soll[i]?.betrag ?? (aufgabe.soll.length===1 ? aufgabe.betrag : null);
      const _hb = i => aufgabe.haben[i]?.betrag ?? (aufgabe.haben.length===1 ? aufgabe.betrag : null);
      const betragOk = aufgabe.soll.every((_,i)=>{
        const e=_sb(i); if(e===null||e===undefined) return true;
        const v=_pb((buchAntwort.betragSoll||[])[i]); return !isNaN(v)&&Math.abs(v-e)<0.055;
      }) && aufgabe.haben.every((_,i)=>{
        const e=_hb(i); if(e===null||e===undefined) return true;
        const v=_pb((buchAntwort.betragHaben||[])[i]); return !isNaN(v)&&Math.abs(v-e)<0.055;
      });
      buchOk = kontoOk && betragOk;
    }
    // Speed bonus: +1 if answered within 30 seconds
    const sek = (Date.now() - taskStartTime) / 1000;
    const speedBonus = buchOk && lehrerConfig.geschwindigkeitsBonus !== false && sek <= 30 ? 1 : 0;
    const gew = (buchOk ? aufgabe.punkte : 0) + belegUePunkte + speedBonus;
    setPunkte(p => p + gew);
    setFeedback(buchOk ? "richtig" : "falsch");
    setVerlauf(v => [...v, { ...aufgabe, korrekt: buchOk, gewPunkte: gew, speedBonus }]);
    if (buchOk && aufgabe.soll.length > 0) {
      const delta = aufgabe.soll.some(s => s.kuerzel === "BK") ? +aufgabe.betrag
                  : aufgabe.haben.some(h => h.kuerzel === "BK") ? -aufgabe.betrag : 0;
      setKontostand(k => k + delta);
    }
  }

  // Spieltag: startet bei 1, läuft proportional mit den Aufgaben bis Tag 28
  const getSpielTag = (idx) => Math.max(1, Math.round(1 + (idx / Math.max(1, aufgabenListe.length)) * 27));
  const spielTag = getSpielTag(aufgabeIdx);

  function weiter() {
    const newIdx = aufgabeIdx + 1;
    if (newIdx >= aufgabenListe.length) {
      onAbschluss({ punkte, maxPunkte, verlauf, zeit: Math.round(elapsed / 1000), poolGroesse: aufgabenListe.length });
      return;
    }
    // Strafpunkte für Termine, die jetzt überfällig werden
    const newSpielTag = getSpielTag(newIdx);
    const kalEintraege = (klasse === "10" ? KALENDER10_EINTRAEGE : klasse === "9" ? KALENDER9_EINTRAEGE : klasse === "8" ? KALENDER8_EINTRAEGE : KALENDER_EINTRAEGE).filter(e => e.typ === "task");
    let strafPunkte = 0;
    kalEintraege.forEach(e => {
      if (e.tag >= spielTag && e.tag < newSpielTag) {
        const erledigt = verlauf.some(v => v.aktion === e.aufgabeAktion && v.korrekt);
        if (!erledigt) { strafPunkte++; setMahnungen(m => { const n = new Set(m); n.add(e.tag); return n; }); }
      }
    });
    if (strafPunkte > 0) setPunkte(p => Math.max(0, p - strafPunkte));
    setAufgabeIdx(newIdx);
    // Kanban: Doing leeren → zurück zum Schreibtisch
    setKbDoing(null);
    setSzene("schreibtisch");
    setFeedback(null);
  }

  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2,"0")}`;
  const BG  = "#1a3a5c";
  const LT  = "#f0f4f8";
  const BD  = "#d1dae5";

  // Past transactions to show in Kontoauszug – aus tatsächlichem Verlauf (nicht linear)
  const pastTx = verlauf.map(v => {
    const a = aufgabenListe.find(a => a.id === v.id);
    if (!a) return null;
    if (a.transaktion) return a.transaktion;
    if (a.aktion === "beleg" && a.belegDaten) return { datum: a.belegDaten.datum, text:`${a.belegDaten.typ==="eingangsrechnung"?"Überweisung":"Eingang"} · ${a.ueberweisungsDaten.empfaenger} · ${a.belegDaten.rechnungsnummer}`, betrag: a.belegDaten.typ==="eingangsrechnung" ? -Number(a.ueberweisungsDaten.betrag) : +Number(a.ueberweisungsDaten.betrag) };
    if (a.ueberweisungsDaten) return { datum:"10.01.2026", text:`Überweisung · ${a.ueberweisungsDaten.empfaenger} · ${a.ueberweisungsDaten.verwendung}`, betrag: -Number(a.ueberweisungsDaten.betrag) };
    if (a.dauerauftragsDaten) return { datum:"01.01.2026", text:`Dauerauftrag · ${a.dauerauftragsDaten.empfaenger} · ${a.dauerauftragsDaten.verwendung}`, betrag: -Number(a.dauerauftragsDaten.betrag) };
    return null;
  }).filter(Boolean);

  const inputStyle = { width:"100%", padding:"8px 10px", border:`1px solid ${BD}`, borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff", color:"#0f172a" };

  // Event metadata for desk display
  const eventMeta = {
    buchung:     { icon: <Mail size={18} strokeWidth={1.5}/>,     farbe:"#3b82f6", ort:"Posteingang"  },
    ueberweisung:{ icon: <Receipt size={18} strokeWidth={1.5}/>,  farbe:"#f59e0b", ort:"Überweisung"  },
    dauerauftrag:{ icon: <Calendar size={18} strokeWidth={1.5}/>, farbe:"#10b981", ort:"Dauerauftrag" },
    beleg:       { icon: <FileText size={18} strokeWidth={1.5}/>, farbe:"#e8600a", ort:"Beleg"        },
    theorie:     { icon: <BookOpen size={18} strokeWidth={1.5}/>, farbe:"#a855f7", ort:"Lernkarte"    },
  };
  const meta = eventMeta[aufgabe?.aktion] || eventMeta.buchung;

  // Shared header (used in both scenes)
  const simFortschritt = aufgabenListe.length > 0 ? Math.round(aufgabeIdx / aufgabenListe.length * 100) : 0;
  const simHeader = (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Briefcase size={16} strokeWidth={1.5} style={{ color:"#e8600a" }}/>
          <span style={{ fontWeight:800, fontSize:14, color:"#f0ece3" }}>{firmaName}</span>
          <span style={{ fontSize:10, color:"rgba(240,236,227,0.35)", padding:"2px 7px", background:"rgba(240,236,227,0.07)", borderRadius:20 }}>Klasse {klasse}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, color:"rgba(240,236,227,0.55)" }}>
          <span style={{ display:"flex", alignItems:"center", gap:3, color:"rgba(232,96,10,0.7)", fontWeight:600, fontSize:11 }}>
            <Calendar size={11} strokeWidth={1.5}/>Tag {spielTag}
          </span>
          {modus === "stunde" ? (() => {
            const restSek = Math.max(0, stundenMin * 60 - Math.round(elapsed / 1000));
            const restMin = Math.floor(restSek / 60);
            const restS   = restSek % 60;
            const warn    = restSek < 300; // letzte 5 Min
            return (
              <span style={{ display:"flex", alignItems:"center", gap:3, fontWeight:700, color: warn ? "#f87171" : "rgba(240,236,227,0.7)", fontSize:12 }}>
                <Timer size={12} strokeWidth={1.5}/>
                {restMin}:{String(restS).padStart(2,"0")} verbleibend
              </span>
            );
          })() : (
            <span style={{ display:"flex", alignItems:"center", gap:3 }}><Timer size={12} strokeWidth={1.5}/>{fmtTime(Math.round(elapsed/1000))}</span>
          )}
          <span style={{ color:"#e8600a", fontWeight:700 }}>{punkte}/{maxPunkte} P</span>
        </div>
      </div>
      {/* Fortschrittsbalken */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ flex:1, height:8, background:"rgba(240,236,227,0.08)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${simFortschritt}%`, background:"linear-gradient(90deg,#e8600a,#f07320)", borderRadius:4, transition:"width 0.5s" }}/>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.5)", flexShrink:0, minWidth:52, textAlign:"right" }}>
          {aufgabeIdx + 1}/{aufgabenListe.length}
        </span>
      </div>
    </div>
  );

  // ── Tutorial (Schüler, erstes Mal) ──────────────────────────────────────
  if (tutorialOffen) return (
    <div style={{ maxWidth:520, margin:"0 auto", padding:"20px 16px" }}>
      <div style={{ background:"rgba(28,20,10,0.95)", border:"2px solid rgba(232,96,10,0.4)", borderRadius:16, padding:"24px", color:"#f0ece3" }}>
        <div style={{ fontSize:20, fontWeight:900, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
          <Briefcase size={20} strokeWidth={1.5} style={{ color:"#e8600a" }}/>Willkommen in der Simulation!
        </div>
        <div style={{ fontSize:12, color:"rgba(240,236,227,0.5)", marginBottom:20 }}>So funktioniert dein digitales Büro:</div>

        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
          <div style={{ background:"rgba(232,96,10,0.07)", border:"1px solid rgba(232,96,10,0.2)", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#e8600a", marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
              <Layers size={13} strokeWidth={2}/>Schritt 1 · Aufgaben-Board
            </div>
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.75)", lineHeight:1.6 }}>
              Du siehst ein <strong style={{ color:"#f0ece3" }}>Kanban-Board</strong>. Ziehe eine Aufgabenkarte aus dem Pool in <strong style={{ color:"#e8600a" }}>„In Arbeit"</strong> – das ist deine aktive Aufgabe. Du kannst auch auf <strong style={{ color:"#f0ece3" }}>„▶ Start"</strong> klicken.
            </div>
          </div>

          <div style={{ background:"rgba(74,158,255,0.07)", border:"1px solid rgba(74,158,255,0.2)", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#4a9eff", marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
              <Laptop size={13} strokeWidth={2}/>Schritt 2 · Schreibtisch-Icons
            </div>
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.75)", lineHeight:1.6, marginBottom:8 }}>
              Ein <strong style={{ color:"#e8600a" }}>oranges Punkt-Indikator</strong> zeigt, welches Icon eine neue Aufgabe enthält. Klicke darauf!
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {[
                [<AtSign size={13} strokeWidth={1.5}/>, "E-Mail", "#e8600a", "Buchungsaufträge vom Chef"],
                [<Laptop size={13} strokeWidth={1.5}/>, "Online Banking", "#4a9eff", "Überweisungen durchführen"],
                [<Mail size={13} strokeWidth={1.5}/>, "Briefkasten", "#a855f7", "Belege & Eingangspost"],
                [<Calendar size={13} strokeWidth={1.5}/>, "Kalender", "#10b981", "Fälligkeiten im Blick"],
              ].map(([icon, label, color, desc], i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:7, padding:"6px 8px", background:`rgba(${color==="#e8600a"?"232,96,10":color==="#4a9eff"?"74,158,255":color==="#a855f7"?"168,85,247":"16,185,129"},0.08)`, borderRadius:7 }}>
                  <span style={{ color, flexShrink:0, marginTop:2 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color }}>{label}</div>
                    <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#4ade80", marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
              <Trophy size={13} strokeWidth={2}/>Schritt 3 · Aufgabe lösen
            </div>
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.75)", lineHeight:1.6 }}>
              Klicke auf <strong style={{ color:"#f0ece3" }}>„Öffnen →"</strong> an deiner aktiven Aufgabe. Beantworte die Frage und klicke <strong style={{ color:"#4ade80" }}>„Überprüfen"</strong>. Nach jeder Aufgabe siehst du sofort, ob du richtig lagst.
            </div>
          </div>
        </div>

        <button
          onClick={() => { try { localStorage.setItem("bw_sim_tutorial_seen","1"); } catch {} setTutorialOffen(false); }}
          style={{ width:"100%", padding:"14px", background:"#e8600a", color:"#fff", border:"none", borderRadius:12, fontWeight:800, fontSize:15, cursor:"pointer" }}>
          Verstanden – Simulation starten! →
        </button>
      </div>
    </div>
  );

  // ── Schreibtisch (Desk) Scene – Game Interface ────────────────────────────
  if (szene === "schreibtisch" || !aufgabe) {
    const aktiveDesk = DESK_MAP[aufgabe?.aktion] || "email";
    const deskItems = [
      { id:"pc",       icon:<Laptop size={26} strokeWidth={1.2}/>,      label:"Online Banking", color:"#4a9eff", rgb:"74,158,255"  },
      { id:"email",    icon:<AtSign size={26} strokeWidth={1.2}/>,      label:"E-Mail",         color:"#e8600a", rgb:"232,96,10"   },
      { id:"post",     icon:<Mail size={26} strokeWidth={1.2}/>,        label:"Briefkasten",    color:"#a855f7", rgb:"168,85,247"  },
      { id:"kalender", icon:<Calendar size={26} strokeWidth={1.2}/>,    label:"Kalender",       color:"#10b981", rgb:"16,185,129"  },
    ];
    if (klasse === "9")  deskItems.push({ id:"boerse", icon:<TrendingUp size={26} strokeWidth={1.2}/>, label:"Börse",  color:"#f59e0b", rgb:"245,158,11" });
    if (klasse === "10") deskItems.push({ id:"klr",    icon:<BarChart2 size={26} strokeWidth={1.2}/>,  label:"KLR",    color:"#8b5cf6", rgb:"139,92,246" });
    return (
      <div style={{ maxWidth:540, margin:"0 auto", padding:"12px 14px" }}>
        {simHeader}

        {/* ── Büro-Dashboard ── */}
        <div style={{ background:"#0e0a04", borderRadius:16, overflow:"hidden", border:"1px solid rgba(240,236,227,0.07)", marginBottom:12 }}>

          {/* Top-Bar */}
          <div style={{ background:"rgba(240,236,227,0.03)", padding:"7px 14px", borderBottom:"1px solid rgba(240,236,227,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 4px #4ade80" }}/>
              <span style={{ fontSize:10.5, color:"rgba(240,236,227,0.45)", fontWeight:700, letterSpacing:".05em" }}>BÜRO · {firmaName.toUpperCase()}</span>
            </div>
            <span style={{ fontSize:10, color:"rgba(240,236,227,0.25)" }}>Mo, 13. Jan 2026</span>
          </div>

          {/* 2×2 Grid (Kl.7/8) bzw. 2×2+1 Grid (Kl.9) */}
          <div style={{ padding:"16px", display:"grid", gridTemplateColumns: (klasse === "9" || klasse === "10") ? "repeat(3,1fr)" : "1fr 1fr", gap:10 }}>
            {deskItems.map(item => {
              const isActive = item.id === aktiveDesk;
              return (
                <div key={item.id} style={{ position:"relative" }}>
                  {/* Push-Notification-Dot */}
                  {isActive && !zeitAbgelaufen && (
                    <div style={{ position:"absolute", top:-5, right:-5, width:14, height:14, background:"#e8600a", borderRadius:"50%", boxShadow:"0 0 8px rgba(232,96,10,0.9)", zIndex:2, pointerEvents:"none" }}/>
                  )}
                  <button
                    onClick={() => {
                      if (item.id === "pc") { setDeskPopup(null); setSzene("vorfall"); }
                      else { setDeskPopup(item.id); }
                    }}
                    style={{ width:"100%", minHeight:100, background:`rgba(${item.rgb},0.07)`, border:`1.5px solid rgba(${item.rgb},${isActive ? "0.45" : "0.14"})`, borderRadius:12, padding:"18px 10px 14px", cursor:"pointer", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"border-color 0.15s" }}>
                    <div style={{ color: isActive ? item.color : `rgba(${item.rgb},0.45)` }}>{item.icon}</div>
                    <span style={{ fontSize:10, color: isActive ? item.color : "rgba(240,236,227,0.35)", fontWeight: isActive ? 800 : 500, letterSpacing:".06em", textTransform:"uppercase" }}>{item.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Kanban-Board mit Drag-and-Drop ── */}
        {!deskPopup && !zeitAbgelaufen && (() => {
          const KB_RGB  = { email:"232,96,10", post:"168,85,247", pc:"74,158,255", kalender:"16,185,129", boerse:"245,158,11", klr:"139,92,246" };
          const KB_AREA = { email:"E-Mail", post:"Briefkasten", pc:"Banking", kalender:"Kalender", boerse:"Börse", klr:"KLR" };

          const doneIds     = new Set(verlauf.map(v => v.id));
          const backlogSet  = new Set(kbBacklog);
          const poolItems   = aufgabenListe.filter(a => !backlogSet.has(a.id) && a.id !== kbDoing && !doneIds.has(a.id));
          const backlogAufg = kbBacklog.map(id => aufgabenListe.find(a => a.id === id)).filter(Boolean);
          const doingAufg   = kbDoing ? aufgabenListe.find(a => a.id === kbDoing) : null;
          const doneAufg    = verlauf.map(v => aufgabenListe.find(a => a.id === v.id)).filter(Boolean).reverse();

          const moveToBacklog    = (id) => { if (!backlogSet.has(id) && id !== kbDoing && !doneIds.has(id)) setKbBacklog(b => [...b, id]); };
          const moveToDoing      = (id, fromBL) => { if (!kbDoing) { if (fromBL) setKbBacklog(b => b.filter(x => x !== id)); setKbDoing(id); } };
          const moveDoingToBL    = () => { if (kbDoing) { setKbBacklog(b => [kbDoing, ...b]); setKbDoing(null); if (szene==="vorfall") setSzene("schreibtisch"); } };
          const removeFromBL     = (id) => setKbBacklog(b => b.filter(x => x !== id));

          const onDragStart = (e, id) => { setKbDragId(id); e.dataTransfer.effectAllowed = "move"; };
          const onDragEnd   = () => { setKbDragId(null); setKbDragOver(null); };
          const onDragOver  = (e, zone) => { e.preventDefault(); setKbDragOver(zone); };
          const onDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setKbDragOver(null); };
          const onDrop = (e, zone) => {
            e.preventDefault(); setKbDragOver(null);
            if (!kbDragId) return;
            const fromBL   = backlogSet.has(kbDragId);
            const fromDoing = kbDragId === kbDoing;
            if (zone === "backlog") { if (!fromBL && !fromDoing && !doneIds.has(kbDragId)) moveToBacklog(kbDragId); else if (fromDoing) moveDoingToBL(); }
            else if (zone === "doing") { if ((fromBL || (!fromDoing && !doneIds.has(kbDragId))) && !kbDoing) moveToDoing(kbDragId, fromBL); }
            else if (zone === "pool") { if (fromBL) removeFromBL(kbDragId); }
            setKbDragId(null);
          };

          const CardStyle = (rgb, isActive, isDragging) => ({
            background:`rgba(${rgb},${isActive?0.09:0.04})`,
            border:`1.5px solid rgba(${rgb},${isDragging?0.7:isActive?0.35:0.15})`,
            borderRadius:8, padding:"7px 8px", marginBottom:4,
            cursor:"grab", opacity:isDragging?0.45:1, userSelect:"none"
          });

          return (
            <div style={{ background:"rgba(10,7,2,0.98)", border:"1px solid rgba(240,236,227,0.07)", borderRadius:12, overflow:"hidden", marginBottom:12 }}>

              {/* Header */}
              <div style={{ padding:"7px 14px", borderBottom:"1px solid rgba(240,236,227,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <Layers size={13} color="#e8600a" strokeWidth={2}/>
                  <span style={{ fontSize:10.5, fontWeight:800, color:"rgba(240,236,227,0.55)", letterSpacing:".06em", textTransform:"uppercase" }}>Aufgaben-Board</span>
                  <span style={{ fontSize:9, color:"rgba(240,236,227,0.18)", fontStyle:"italic" }}>{firmaName}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:8.5, color:"rgba(240,236,227,0.2)" }}>{verlauf.length}/{aufgabenListe.length}</span>
                  <div style={{ width:40, height:3, borderRadius:2, background:"rgba(240,236,227,0.07)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${aufgabenListe.length?verlauf.length/aufgabenListe.length*100:0}%`, background:"#4ade80", borderRadius:2, transition:"width 0.4s" }}/>
                  </div>
                </div>
              </div>

              {/* Verfügbare Aufgaben (Pool) – horizontaler Feed */}
              {poolItems.length > 0 && (
                <div style={{ padding:"8px 12px 4px", borderBottom:"1px solid rgba(240,236,227,0.05)" }}
                  onDragOver={e => onDragOver(e, "pool")} onDragLeave={onDragLeave} onDrop={e => onDrop(e, "pool")}>
                  <div style={{ fontSize:8.5, fontWeight:800, color:"rgba(240,236,227,0.22)", letterSpacing:".07em", textTransform:"uppercase", marginBottom:7, display:"flex", alignItems:"center", gap:5 }}>
                    Verfügbare Aufgaben
                    <span style={{ background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.28)", fontSize:8, padding:"1px 5px", borderRadius:20, fontWeight:700 }}>{poolItems.length}</span>
                    <span style={{ fontSize:7.5, color:"rgba(240,236,227,0.15)", fontStyle:"italic", fontWeight:400 }}>· in Backlog oder In Arbeit ziehen</span>
                  </div>
                  <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:9 }}>
                    {poolItems.map(a => {
                      const desk = DESK_MAP[a.aktion] || "email";
                      const rgb  = KB_RGB[desk] || "232,96,10";
                      const area = KB_AREA[desk] || "Aufgabe";
                      return (
                        <div key={a.id} draggable="true"
                          onDragStart={e => onDragStart(e, a.id)} onDragEnd={onDragEnd}
                          style={{ flexShrink:0, width:136, background:`rgba(${rgb},0.06)`, border:`1.5px solid rgba(${rgb},${kbDragId===a.id?0.65:0.15})`, borderRadius:10, padding:"8px 9px", cursor:"grab", opacity:kbDragId===a.id?0.45:1 }}>
                          <div style={{ fontSize:9.5, fontWeight:700, color:"rgba(240,236,227,0.72)", lineHeight:1.35, marginBottom:5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{a.titel}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:6 }}>
                            <span style={{ fontSize:7.5, fontWeight:700, color:`rgba(${rgb},0.85)`, background:`rgba(${rgb},0.1)`, padding:"1px 5px", borderRadius:20 }}>{area}</span>
                            <span style={{ fontSize:7.5, color:"rgba(240,236,227,0.22)" }}>{a.punkte}P</span>
                          </div>
                          <div style={{ display:"flex", gap:4 }}>
                            <button onClick={() => moveToBacklog(a.id)}
                              style={{ flex:1, padding:"4px 0", background:"rgba(240,236,227,0.07)", color:"rgba(240,236,227,0.5)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:5, fontSize:8, fontWeight:600, cursor:"pointer" }}>Backlog</button>
                            {!kbDoing && (
                              <button onClick={() => moveToDoing(a.id, false)}
                                style={{ flex:1, padding:"4px 0", background:"rgba(232,96,10,0.15)", color:"#e8600a", border:"1px solid rgba(232,96,10,0.28)", borderRadius:5, fontSize:8, fontWeight:800, cursor:"pointer" }}>▶ Start</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3 Kanban-Spalten */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr", padding:"8px 10px", gap:8 }}>

                {/* BACKLOG */}
                <div onDragOver={e => onDragOver(e, "backlog")} onDragLeave={onDragLeave} onDrop={e => onDrop(e, "backlog")}
                  style={{ minHeight:90, borderRadius:8, padding:"6px 7px", background:kbDragOver==="backlog"?"rgba(240,236,227,0.05)":"rgba(240,236,227,0.02)", border:`1.5px dashed rgba(240,236,227,${kbDragOver==="backlog"?0.22:0.07})`, transition:"all 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:7 }}>
                    <div style={{ width:6, height:6, borderRadius:1.5, background:"rgba(240,236,227,0.28)" }}/>
                    <span style={{ fontSize:8.5, fontWeight:800, color:"rgba(240,236,227,0.32)", letterSpacing:".07em", textTransform:"uppercase" }}>Backlog</span>
                    {backlogAufg.length > 0 && <span style={{ marginLeft:"auto", fontSize:7.5, background:"rgba(240,236,227,0.07)", color:"rgba(240,236,227,0.3)", padding:"1px 5px", borderRadius:20, fontWeight:700 }}>{backlogAufg.length}</span>}
                  </div>
                  {backlogAufg.length === 0
                    ? <div style={{ fontSize:8, color:"rgba(240,236,227,0.14)", textAlign:"center", padding:"12px 4px", lineHeight:1.5 }}>Aufgaben<br/>hierher ziehen</div>
                    : backlogAufg.map(a => {
                        const desk = DESK_MAP[a.aktion] || "email";
                        const rgb  = KB_RGB[desk] || "232,96,10";
                        const area = KB_AREA[desk] || "Aufgabe";
                        return (
                          <div key={a.id} draggable="true"
                            onDragStart={e => onDragStart(e, a.id)} onDragEnd={onDragEnd}
                            style={CardStyle(rgb, false, kbDragId===a.id)}>
                            <div style={{ fontSize:9, fontWeight:600, color:"rgba(240,236,227,0.68)", lineHeight:1.3, marginBottom:4, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{a.titel}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                              <span style={{ fontSize:7, fontWeight:700, color:`rgba(${rgb},0.75)`, background:`rgba(${rgb},0.1)`, padding:"1px 4px", borderRadius:20 }}>{area}</span>
                              {!kbDoing && (
                                <button onClick={() => moveToDoing(a.id, true)}
                                  style={{ marginLeft:"auto", padding:"2px 6px", background:"rgba(232,96,10,0.15)", color:"#e8600a", border:"1px solid rgba(232,96,10,0.25)", borderRadius:4, fontSize:7.5, fontWeight:800, cursor:"pointer" }}>▶</button>
                              )}
                              <button onClick={() => removeFromBL(a.id)}
                                style={{ padding:"1px 4px", background:"none", color:"rgba(240,236,227,0.22)", border:"none", fontSize:12, lineHeight:1, cursor:"pointer" }}>×</button>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>

                {/* IN ARBEIT */}
                <div onDragOver={e => onDragOver(e, "doing")} onDragLeave={onDragLeave} onDrop={e => onDrop(e, "doing")}
                  style={{ minHeight:90, borderRadius:8, padding:"6px 7px", background:kbDragOver==="doing"?"rgba(232,96,10,0.09)":"rgba(232,96,10,0.04)", border:`1.5px ${doingAufg?"solid":"dashed"} rgba(232,96,10,${kbDragOver==="doing"?0.55:doingAufg?0.32:0.12})`, transition:"all 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:7 }}>
                    <div style={{ width:6, height:6, borderRadius:1.5, background:"#e8600a", boxShadow:doingAufg?"0 0 5px rgba(232,96,10,0.6)":"none" }}/>
                    <span style={{ fontSize:8.5, fontWeight:800, color:"rgba(232,96,10,0.8)", letterSpacing:".07em", textTransform:"uppercase" }}>In Arbeit</span>
                    <span style={{ fontSize:7, color:"rgba(232,96,10,0.35)", fontStyle:"italic" }}>WIP 1</span>
                  </div>
                  {!doingAufg
                    ? <div style={{ fontSize:8, color:"rgba(232,96,10,0.28)", textAlign:"center", padding:"12px 4px", lineHeight:1.5 }}>Aufgabe<br/>hierher ziehen</div>
                    : (() => {
                        const desk = DESK_MAP[doingAufg.aktion] || "email";
                        const rgb  = KB_RGB[desk] || "232,96,10";
                        const area = KB_AREA[desk] || "Aufgabe";
                        return (
                          <div draggable="true"
                            onDragStart={e => onDragStart(e, doingAufg.id)} onDragEnd={onDragEnd}
                            style={{ background:"rgba(232,96,10,0.09)", border:"1.5px solid rgba(232,96,10,0.32)", borderRadius:8, padding:"8px 9px", cursor:"grab", opacity:kbDragId===doingAufg.id?0.45:1 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#f0ece3", lineHeight:1.35, marginBottom:5 }}>{doingAufg.titel}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:7 }}>
                              <span style={{ fontSize:7.5, fontWeight:700, color:`rgba(${rgb},0.9)`, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.22)`, padding:"1px 5px", borderRadius:20 }}>{area}</span>
                              <span style={{ fontSize:7.5, color:"rgba(240,236,227,0.28)" }}>{doingAufg.punkte}P</span>
                            </div>
                            <div style={{ display:"flex", gap:5 }}>
                              <button onClick={() => { setDeskPopup(null); setSzene("vorfall"); }}
                                style={{ flex:1, padding:"7px", background:"#e8600a", color:"#fff", border:"none", borderRadius:7, fontWeight:800, fontSize:11, cursor:"pointer" }}>
                                Öffnen →
                              </button>
                              <button onClick={moveDoingToBL}
                                style={{ padding:"7px 8px", background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.4)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:7, fontSize:10, cursor:"pointer" }} title="Zurück in Backlog (Pause)">⏸</button>
                            </div>
                          </div>
                        );
                      })()
                  }
                </div>

                {/* ERLEDIGT */}
                <div style={{ minHeight:90, borderRadius:8, padding:"6px 7px", background:"rgba(74,222,128,0.02)", border:"1.5px dashed rgba(74,222,128,0.08)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:7 }}>
                    <div style={{ width:6, height:6, borderRadius:1.5, background:"rgba(74,222,128,0.45)" }}/>
                    <span style={{ fontSize:8.5, fontWeight:800, color:"rgba(74,222,128,0.42)", letterSpacing:".07em", textTransform:"uppercase" }}>Erledigt</span>
                    {doneAufg.length > 0 && <span style={{ marginLeft:"auto", fontSize:7.5, background:"rgba(74,222,128,0.07)", color:"rgba(74,222,128,0.4)", padding:"1px 5px", borderRadius:20, fontWeight:700 }}>{doneAufg.length}</span>}
                  </div>
                  {doneAufg.length === 0
                    ? <div style={{ fontSize:8, color:"rgba(74,222,128,0.2)", textAlign:"center", padding:"12px 4px", lineHeight:1.5 }}>Noch nichts<br/>erledigt</div>
                    : doneAufg.slice(0,5).map(a => {
                        const vEntry = verlauf.find(v => v.id === a.id);
                        const ok = vEntry?.korrekt;
                        return (
                          <div key={a.id} style={{ background:ok?"rgba(74,222,128,0.05)":"rgba(248,113,113,0.04)", border:`1px solid ${ok?"rgba(74,222,128,0.15)":"rgba(248,113,113,0.12)"}`, borderRadius:7, padding:"5px 7px", marginBottom:4 }}>
                            <div style={{ fontSize:8.5, fontWeight:500, color:ok?"rgba(74,222,128,0.65)":"rgba(248,113,113,0.55)", lineHeight:1.3, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                              {ok ? "✓ " : "✗ "}{a.titel}
                            </div>
                          </div>
                        );
                      })
                  }
                  {doneAufg.length > 5 && <div style={{ fontSize:7.5, color:"rgba(74,222,128,0.28)", textAlign:"center", paddingTop:2 }}>+{doneAufg.length-5} weitere</div>}
                </div>

              </div>
            </div>
          );
        })()}

        {/* ── Zeit-abgelaufen Overlay ── */}
        {zeitAbgelaufen && (
          <div style={{ background:"rgba(248,113,113,0.08)", border:"1.5px solid rgba(248,113,113,0.35)", borderRadius:12, padding:"18px 16px", marginBottom:12, textAlign:"center" }}>
            <div style={{ fontSize:26, marginBottom:4 }}>⏰</div>
            <div style={{ fontWeight:800, fontSize:14, color:"#f87171", marginBottom:5 }}>Zeit abgelaufen!</div>
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.5)", marginBottom:14, lineHeight:1.5 }}>Der Vorfall wurde nicht rechtzeitig bearbeitet.<br/>−1 Punkt wurde abgezogen.</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { setZeitAbgelaufen(false); weiter(); }}
                style={{ flex:1, padding:"10px", background:"rgba(248,113,113,0.15)", color:"#f87171", border:"1px solid rgba(248,113,113,0.3)", borderRadius:9, fontWeight:700, fontSize:12, cursor:"pointer" }}>
                Nächste Aufgabe →
              </button>
              <button onClick={() => { setZeitAbgelaufen(false); setSzene("vorfall"); }}
                style={{ flex:1, padding:"10px", background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.55)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:9, fontWeight:700, fontSize:12, cursor:"pointer" }}>
                Trotzdem versuchen
              </button>
            </div>
          </div>
        )}

        {/* ── Kalender-Popup – rundenbasierter Spieltag ── */}
        {deskPopup === "kalender" && (() => {
          const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
          const SIMULATIONSJAHR = 2026;
          const SIMULATIONSMONAT = 0; // Januar
          const daysInMonth = 31;
          const startOffset = (new Date(SIMULATIONSJAHR, SIMULATIONSMONAT, 1).getDay() + 6) % 7; // Mo=0
          // Bayern-Feiertage Januar 2026
          const FEIERTAGE = { 1: "Neujahr", 6: "Hl. 3 Könige" };
          const istFeiertag = (day) => !!FEIERTAGE[day];
          const istWochenende = (day) => ((startOffset + day - 1) % 7) >= 5;
          const istFreierTag = (day) => istWochenende(day) || istFeiertag(day);
          const entryMap = Object.fromEntries((klasse === "10" ? KALENDER10_EINTRAEGE : klasse === "9" ? KALENDER9_EINTRAEGE : klasse === "8" ? KALENDER8_EINTRAEGE : KALENDER_EINTRAEGE).map(e => [e.tag, e]));

          const getStatus = (entry) => {
            if (!entry) return null;
            if (entry.typ !== "task") return "info";
            const done = verlauf.some(v => v.aktion === entry.aufgabeAktion && v.korrekt);
            if (done) return "done";
            if (entry.tag < spielTag) return mahnungen.has(entry.tag) ? "overdue" : "verpasst";
            if (entry.tag === spielTag) return "heute";
            return "pending";
          };
          const statusColor = { pending:"rgba(240,236,227,0.45)", heute:"#e8600a", done:"#4ade80", verpasst:"#f87171", overdue:"#f87171", info:"rgba(96,165,250,0.7)" };
          const selEntry = kalSelTag ? entryMap[kalSelTag] : null;

          return (
            <div style={{ background:"rgba(12,9,4,0.99)", border:"1.5px solid rgba(16,185,129,0.3)", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
              {/* Titelleiste */}
              <div style={{ background:"#0f3460", padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:20, height:20, background:"#0078d4", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Calendar size={11} color="#fff" strokeWidth={2.5}/>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>Kalender</span>
                  <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.4)" }}>— {firmaName}</span>
                </div>
                <button onClick={() => { setDeskPopup(null); setKalSelTag(null); }} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
              </div>

              {/* Spieltag-Banner */}
              <div style={{ padding:"7px 14px", background:"rgba(232,96,10,0.12)", borderBottom:"1px solid rgba(232,96,10,0.2)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#e8600a" }}>
                  📅 Spieltag {spielTag}. {MONATE[SIMULATIONSMONAT]} {SIMULATIONSJAHR}
                </span>
                <div style={{ display:"flex", gap:8, fontSize:9, color:"rgba(240,236,227,0.4)" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"#e8600a", borderRadius:2, display:"inline-block" }}/> heute</span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"rgba(240,236,227,0.3)", borderRadius:2, display:"inline-block" }}/> geplant</span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"#4ade80", borderRadius:2, display:"inline-block" }}/> erledigt</span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"#f87171", borderRadius:2, display:"inline-block" }}/> verpasst</span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:7, height:7, background:"rgba(232,96,10,0.25)", borderRadius:2, border:"1px solid rgba(232,96,10,0.3)", display:"inline-block" }}/> WE/Feiertag</span>
                </div>
              </div>

              {/* Monat-Header + Wochentage */}
              <div style={{ padding:"8px 14px 4px", fontWeight:800, fontSize:12, color:"#f0ece3" }}>{MONATE[SIMULATIONSMONAT]} {SIMULATIONSJAHR}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, padding:"0 14px", marginBottom:2 }}>
                {["Mo","Di","Mi","Do","Fr","Sa","So"].map((d, di) => (
                  <div key={d} style={{ textAlign:"center", fontSize:8.5, fontWeight:700, color: di >= 5 ? "rgba(232,96,10,0.55)" : "rgba(240,236,227,0.3)", padding:"2px 0" }}>{d}</div>
                ))}
              </div>

              {/* Tage-Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, padding:"0 14px 12px" }}>
                {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`}/>)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const isHeute   = day === spielTag;
                  const entry     = entryMap[day];
                  const status    = getStatus(entry);
                  const isWeekend = istWochenende(day);
                  const isFT      = istFeiertag(day);
                  const isFrei    = istFreierTag(day);
                  const isSelected = kalSelTag === day;
                  const eventColor = status ? statusColor[status] : null;
                  const isClickable = !!entry;
                  const isFuture = day > spielTag;
                  return (
                    <div key={day}
                      title={isFT ? FEIERTAGE[day] : undefined}
                      onClick={() => isClickable && setKalSelTag(kalSelTag === day ? null : day)}
                      style={{ borderRadius:5, padding:"3px 2px 4px", minHeight:44,
                        background: isHeute ? "rgba(232,96,10,0.13)" : isSelected && eventColor ? `${eventColor}22` : isFT ? "rgba(232,96,10,0.14)" : isWeekend ? "rgba(232,96,10,0.06)" : isFuture ? "rgba(240,236,227,0.02)" : "rgba(240,236,227,0.03)",
                        border: isSelected && eventColor ? `1.5px solid ${eventColor}` : isHeute ? "1.5px solid #e8600a" : isFT ? "1px solid rgba(232,96,10,0.35)" : isWeekend ? "1px solid rgba(232,96,10,0.15)" : `1px solid rgba(240,236,227,${isFuture ? "0.04" : "0.07"})`,
                        opacity: isFuture && !isFrei ? 0.75 : 1,
                        cursor: isClickable ? "pointer" : "default" }}>
                      <div style={{ fontSize:10, fontWeight: isHeute ? 900 : 600, color: isHeute ? "#e8600a" : isFT ? "rgba(232,96,10,0.85)" : isWeekend ? "rgba(232,96,10,0.55)" : isFuture ? "rgba(240,236,227,0.35)" : "rgba(240,236,227,0.65)", textAlign:"right", paddingRight:3, marginBottom:1 }}>{day}</div>
                      {isFT && (
                        <div style={{ fontSize:6, color:"rgba(232,96,10,0.75)", padding:"0 2px", lineHeight:1.2, textAlign:"center", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", fontWeight:700 }}>{FEIERTAGE[day]}</div>
                      )}
                      {entry && eventColor && (
                        <div style={{ width:"100%", height:3, borderRadius:2, background: eventColor, opacity: status === "info" ? 0.6 : 0.9, marginBottom:2 }}/>
                      )}
                      {entry && (
                        <div style={{ fontSize:7, color: eventColor || "rgba(240,236,227,0.4)", padding:"0 2px", lineHeight:1.25, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", fontWeight: status === "heute" ? 700 : 500 }}>
                          {entry.text.split(" ").slice(0,3).join(" ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ereignis-Detail */}
              {selEntry && (() => {
                const status = getStatus(selEntry);
                const col = statusColor[status] || "rgba(240,236,227,0.45)";
                const verpasst = (status === "verpasst" || status === "overdue");
                const isInfo = status === "info";
                const isTask = !isInfo;
                return (
                  <div style={{ margin:"0 14px 14px", background:`${col}10`, border:`1px solid ${col}33`, borderRadius:9, padding:"10px 12px" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom: isTask ? 8 : 0 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:col, flexShrink:0, marginTop:3 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11.5, fontWeight:700, color:"#f0ece3", marginBottom:2 }}>{selEntry.text}</div>
                        <div style={{ fontSize:10, color:col, fontWeight:600 }}>
                          {isInfo      && `ℹ️ Termin · ${selEntry.tag}. Januar 2026`}
                          {status === "heute"   && `⚡ Fällig heute (Spieltag ${spielTag}) – jetzt erledigen!`}
                          {status === "pending" && `📋 Geplant für Spieltag ${selEntry.tag}. Jan`}
                          {status === "done"    && "✓ Erledigt"}
                          {verpasst            && `⚠ Verpasst (Spieltag ${selEntry.tag}) – −1 Punkt wurde abgezogen`}
                        </div>
                      </div>
                    </div>
                    {isTask && (status === "heute" || status === "pending") && !verlauf.some(v => v.aktion === selEntry.aufgabeAktion && v.korrekt) && (
                      <button onClick={() => {
                        const matchId = aufgabenListe.find(a =>
                          a.aktion === selEntry.aufgabeAktion && !doneIds.has(a.id) && a.id !== kbDoing
                        )?.id;
                        if (!matchId) return;
                        if (!kbDoing) {
                          setKbBacklog(b => b.filter(x => x !== matchId));
                          setKbDoing(matchId);
                        }
                        setKalSelTag(null); setDeskPopup(null); setSzene("vorfall");
                      }}
                        style={{ width:"100%", padding:"8px", background:status==="heute"?"#e8600a":col, color:"#fff", border:"none", borderRadius:7, fontWeight:800, fontSize:12, cursor:"pointer", marginTop:4 }}>
                        {status === "heute" ? "Jetzt erledigen →" : "Vorziehen und erledigen →"}
                      </button>
                    )}
                    {status === "done" && (
                      <div style={{ fontSize:10.5, color:"rgba(74,222,128,0.7)", marginTop:4 }}>Aufgabe korrekt abgeschlossen.</div>
                    )}
                    {verpasst && (
                      <div style={{ fontSize:10.5, color:"rgba(248,113,113,0.65)", fontStyle:"italic", marginTop:4 }}>Strafpunkt wurde beim Übergang zum nächsten Spieltag automatisch abgezogen.</div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ── Börsen-Cockpit (Kl. 9 LB4) ── */}
        {deskPopup === "boerse" && klasse === "9" && (() => {
          const kursIdx  = Math.min(spielTag, 30) - 1;
          const vorIdx   = Math.max(0, kursIdx - 1);
          const depotPos = [
            { aktie: BOERSEN_AKTIEN.find(a => a.id === "BSOL"), stk:100, einstand:4850.00 },
            { aktie: BOERSEN_AKTIEN.find(a => a.id === "SUDB"), stk:50,  einstand:2600.00 },
          ];
          const kapital = 3284.50;
          const fmt = (n, d=2) => n.toLocaleString("de-DE", { minimumFractionDigits:d, maximumFractionDigits:d });
          const depotwert    = depotPos.reduce((s,p) => s + p.aktie.kurse[kursIdx] * p.stk, 0);
          const einstandGes  = depotPos.reduce((s,p) => s + p.einstand, 0);
          const perf         = depotwert - einstandGes;
          const perfPct      = einstandGes > 0 ? (perf / einstandGes * 100) : 0;
          const aktuellesEvt = [...BOERSEN_EREIGNISSE].reverse().find(e => e.tag <= spielTag);
          return (
            <div style={{ background:"rgba(12,9,4,0.99)", border:"1.5px solid rgba(245,158,11,0.3)", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
              {/* Titelleiste */}
              <div style={{ background:"#0d1117", padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:20, height:20, background:"#f59e0b", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <TrendingUp size={11} color="#fff" strokeWidth={2.5}/>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>BörsenWerk</span>
                  <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.4)" }}>— Kl. 9 · LB4 Kapitalanlage</span>
                </div>
                <button onClick={() => setDeskPopup(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
              </div>
              {/* Spieltag-Banner */}
              <div style={{ padding:"5px 14px", background:"rgba(245,158,11,0.08)", borderBottom:"1px solid rgba(245,158,11,0.15)", fontSize:10, color:"rgba(245,158,11,0.75)", fontWeight:700 }}>
                📅 Spieltag {spielTag}. Jan 2026 · XETRA-Handelsschluss
              </div>
              {/* Tabs */}
              <div style={{ display:"flex", borderBottom:"1px solid rgba(240,236,227,0.07)" }}>
                {[["depot","Depot"],["markt","Markt"]].map(([id,label]) => (
                  <button key={id} onClick={() => setBoersenTab(id)}
                    style={{ flex:1, padding:"7px", background:"none", border:"none",
                      borderBottom: boersenTab===id ? "2px solid #f59e0b" : "2px solid transparent",
                      color: boersenTab===id ? "#f59e0b" : "rgba(240,236,227,0.4)",
                      fontWeight: boersenTab===id ? 800 : 500, fontSize:11, cursor:"pointer" }}>
                    {label}
                  </button>
                ))}
              </div>

              {boersenTab === "depot" && (
                <div style={{ padding:"12px 14px" }}>
                  {/* Kapital-Header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10, paddingBottom:8, borderBottom:"1px solid rgba(240,236,227,0.06)" }}>
                    <div>
                      <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", fontWeight:700, letterSpacing:".05em" }}>VERFÜGBAR · 2800 BK</div>
                      <div style={{ fontSize:17, fontWeight:900, color:"#f0ece3" }}>{fmt(kapital)} €</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", fontWeight:700, letterSpacing:".05em" }}>DEPOTWERT · 1500 WP</div>
                      <div style={{ fontSize:17, fontWeight:900, color:"#f0ece3" }}>{fmt(depotwert)} €</div>
                    </div>
                  </div>
                  {/* Performance */}
                  <div style={{ background: perf >= 0 ? "rgba(74,222,128,0.07)" : "rgba(248,113,113,0.07)", border:`1px solid ${perf>=0?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"}`, borderRadius:8, padding:"6px 10px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>Buchgewinn/-verlust (nicht realisiert)</span>
                    <span style={{ fontSize:12, fontWeight:800, color: perf>=0?"#4ade80":"#f87171" }}>
                      {perf>=0?"+":""}{fmt(perf)} € ({perf>=0?"+":""}{fmt(perfPct,1)} %)
                    </span>
                  </div>
                  {/* Positionen */}
                  {depotPos.map(pos => {
                    const kurs    = pos.aktie.kurse[kursIdx];
                    const vorKurs = pos.aktie.kurse[vorIdx];
                    const wert    = kurs * pos.stk;
                    const gv      = wert - pos.einstand;
                    const pct     = (kurs - vorKurs) / vorKurs * 100;
                    return (
                      <div key={pos.aktie.id} style={{ padding:"7px 0", borderBottom:"1px solid rgba(240,236,227,0.05)", display:"grid", gridTemplateColumns:"1fr auto auto", gap:6, alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:"#f0ece3" }}>{pos.aktie.name}</div>
                          <div style={{ fontSize:9.5, color:"rgba(240,236,227,0.33)" }}>{pos.stk} Stk. · Einstand {fmt(pos.einstand/pos.stk)} €/Stk.</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#f0ece3" }}>{fmt(kurs)} €</div>
                          <div style={{ fontSize:9.5, fontWeight:600, color: pct>=0?"#4ade80":"#f87171" }}>{pct>=0?"+":""}{fmt(pct,1)} % (Tag)</div>
                        </div>
                        <div style={{ textAlign:"right", minWidth:60 }}>
                          <div style={{ fontSize:11, color:"rgba(240,236,227,0.7)" }}>{fmt(wert)} €</div>
                          <div style={{ fontSize:9.5, color: gv>=0?"#4ade80":"#f87171" }}>{gv>=0?"+":""}{fmt(gv)} €</div>
                        </div>
                      </div>
                    );
                  })}
                  {aktuellesEvt && (
                    <div style={{ marginTop:10, padding:"6px 10px", background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.14)", borderRadius:6, fontSize:9.5, color:"rgba(240,236,227,0.5)", lineHeight:1.5 }}>
                      <span style={{ color:"#f59e0b", fontWeight:700 }}>📰 </span>{aktuellesEvt.text}
                    </div>
                  )}
                  {aktiveDesk === "boerse" && (
                    <button onClick={() => { setDeskPopup(null); setSzene("vorfall"); }}
                      style={{ marginTop:10, width:"100%", padding:"10px", background:"#f59e0b", color:"#0d1117", border:"none", borderRadius:8, fontWeight:800, fontSize:12, cursor:"pointer" }}>
                      Aufgabe bearbeiten →
                    </button>
                  )}
                </div>
              )}

              {boersenTab === "markt" && (
                <div style={{ padding:"12px 14px" }}>
                  <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", fontWeight:700, letterSpacing:".05em", marginBottom:8 }}>XETRA KURSE · SPIELTAG {spielTag}. JAN 2026</div>
                  {BOERSEN_AKTIEN.map(aktie => {
                    const kurs    = aktie.kurse[kursIdx];
                    const vorKurs = aktie.kurse[vorIdx];
                    const pct     = (kurs - vorKurs) / vorKurs * 100;
                    const inDepot = depotPos.some(p => p.aktie.id === aktie.id);
                    return (
                      <div key={aktie.id} style={{ padding:"7px 0", borderBottom:"1px solid rgba(240,236,227,0.05)", display:"grid", gridTemplateColumns:"1fr auto auto", gap:8, alignItems:"center" }}>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                            <span style={{ fontSize:8.5, fontWeight:800, color:"rgba(245,158,11,0.7)", background:"rgba(245,158,11,0.1)", padding:"1px 5px", borderRadius:3 }}>{aktie.kuerzel}</span>
                            {inDepot && <span style={{ fontSize:7.5, color:"#4ade80", background:"rgba(74,222,128,0.1)", padding:"1px 4px", borderRadius:3 }}>Depot</span>}
                          </div>
                          <div style={{ fontSize:10.5, fontWeight:600, color:"#f0ece3" }}>{aktie.name}</div>
                          <div style={{ fontSize:9, color:"rgba(240,236,227,0.3)" }}>{aktie.branche}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:13, fontWeight:800, color:"#f0ece3" }}>{fmt(kurs)} €</div>
                        </div>
                        <div style={{ textAlign:"right", minWidth:52 }}>
                          <div style={{ fontSize:10.5, fontWeight:700, color: pct>=0?"#4ade80":"#f87171", display:"flex", alignItems:"center", justifyContent:"flex-end", gap:2 }}>
                            {pct>=0?<TrendingUp size={10}/>:<TrendingDown size={10}/>}
                            {pct>=0?"+":""}{fmt(pct,1)} %
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Börsenereignisse */}
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", fontWeight:700, letterSpacing:".05em", marginBottom:6 }}>AKTUELLE MELDUNGEN</div>
                    {BOERSEN_EREIGNISSE.filter(e => e.tag <= spielTag).slice(-3).reverse().map((e,i) => (
                      <div key={i} style={{ padding:"5px 8px", background:"rgba(240,236,227,0.03)", border:"1px solid rgba(240,236,227,0.06)", borderRadius:5, marginBottom:3, fontSize:9.5, color:"rgba(240,236,227,0.5)", lineHeight:1.4 }}>
                        <span style={{ color:"rgba(245,158,11,0.55)", fontSize:8.5 }}>Tag {e.tag} · </span>{e.text}
                      </div>
                    ))}
                  </div>
                  {/* Magisches Dreieck */}
                  <div style={{ marginTop:8, padding:"7px 10px", background:"rgba(240,236,227,0.025)", border:"1px solid rgba(240,236,227,0.06)", borderRadius:7 }}>
                    <div style={{ fontSize:8.5, fontWeight:700, color:"rgba(245,158,11,0.65)", marginBottom:3 }}>MAGISCHES DREIECK (Kl. 9 LB4)</div>
                    <div style={{ display:"flex", gap:10, fontSize:9.5, color:"rgba(240,236,227,0.45)" }}>
                      <span>🔒 Sicherheit</span><span>💧 Liquidität</span><span>📈 Rentabilität</span>
                    </div>
                    <div style={{ fontSize:8.5, color:"rgba(240,236,227,0.25)", marginTop:3 }}>Nie alle drei Ziele gleichzeitig optimal erreichbar!</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── KLR-Cockpit (Kl. 10 LB2–4) ── */}
        {deskPopup === "klr" && klasse === "10" && (() => {
          const fmt = (n, d=2) => n.toLocaleString("de-DE", { minimumFractionDigits:d, maximumFractionDigits:d });
          const KLR_TABS = [["bab","BAB"],["dbr","DBR"],["kz","Kennzahlen"]];
          // BAB-Daten VitaSport GmbH GJ 2025
          const babKosten = [
            { art:"Miete",              gesamt:48000, mat:8000, fert:24000, verw:8000, vtr:8000 },
            { art:"Abschreibungen",     gesamt:18000, mat:3000, fert: 9000, verw:3000, vtr:3000 },
            { art:"Büromaterial",       gesamt: 6000, mat: 600, fert: 2400, verw:1800, vtr:1200 },
            { art:"Versicherungen",     gesamt: 7200, mat:1200, fert: 3600, verw:1200, vtr:1200 },
            { art:"Löhne (indirekt)",   gesamt:36000, mat:3200, fert:57000, verw:10800, vtr:7600 },
          ];
          // Fixierte Summen aus dem Lehrkontext (konsistent mit k10_4 + k10_5)
          const babGK = { mat:16000, fert:96000, verw:24800, vtr:21000 };
          const babEK = { mek:85000, fek:240000 };
          const mgkz  = (babGK.mat / babEK.mek * 100).toFixed(2);  // 18,82% – gerundet aus Lehrkontext
          const fgkz  = (babGK.fert / babEK.fek * 100).toFixed(2); // 40,00%
          // DBR-Daten
          const dbrProdukte = [
            { name:"PulseRun Laufband",       nvp:890, vk:580, stk:680, fixAnteil:186000 },
            { name:"MaxForce 300 Kraftstation", nvp:1200, vk:850, stk:420, fixAnteil:null },
          ];
          // Kennzahlen-Daten
          const kz = { ek:180000, lfv:50000, av:184000, gewinn:27000, fo:42000, bk:28000, kfv:56000 };
          // Welcher Kennzahl-/BAB-Wert wird gerade abgefragt? → maskieren
          const klrMaskedId = (aktiveDesk === "klr") ? aufgabe?.id : null;
          return (
            <div style={{ background:"rgba(12,9,4,0.99)", border:`1.5px solid rgba(139,92,246,${aktiveDesk==="klr"?"0.4":"0.15"})`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
              {/* Titelleiste */}
              <div style={{ background:"linear-gradient(90deg,#2d1b69,#1e1256)", padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:20, height:20, background:"#8b5cf6", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <BarChart2 size={11} color="#fff" strokeWidth={2.5}/>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>KLR-Cockpit</span>
                  <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.4)" }}>— {firmaName} · GJ 2025</span>
                </div>
                <button onClick={() => setDeskPopup(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
              </div>
              {/* Tab-Leiste */}
              <div style={{ display:"flex", borderBottom:"1px solid rgba(139,92,246,0.18)", background:"rgba(139,92,246,0.05)" }}>
                {KLR_TABS.map(([id,label]) => (
                  <button key={id} onClick={() => setKlrTab(id)} style={{ flex:1, background:"none", border:"none",
                    borderBottom: klrTab===id ? "2px solid #8b5cf6" : "2px solid transparent",
                    color: klrTab===id ? "#8b5cf6" : "rgba(240,236,227,0.4)",
                    fontWeight: klrTab===id ? 800 : 500, fontSize:11, cursor:"pointer", padding:"8px 4px", letterSpacing:".04em" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ padding:"14px 12px" }}>
                {/* ── BAB ── */}
                {klrTab === "bab" && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.35)", letterSpacing:".06em", marginBottom:8 }}>BETRIEBSABRECHNUNGSBOGEN · GJ 2025</div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
                        <thead>
                          <tr style={{ borderBottom:"1px solid rgba(139,92,246,0.2)" }}>
                            {["Kostenart","Gesamt","Material","Fertigung","Verwaltung","Vertrieb"].map(h => (
                              <th key={h} style={{ padding:"3px 6px", textAlign: h==="Kostenart"?"left":"right", color:"rgba(240,236,227,0.45)", fontWeight:700, fontSize:9.5 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {babKosten.map((row,i) => (
                            <tr key={i} style={{ borderBottom:"1px solid rgba(240,236,227,0.05)" }}>
                              <td style={{ padding:"3px 6px", color:"rgba(240,236,227,0.7)", fontSize:10 }}>{row.art}</td>
                              {[row.gesamt,row.mat,row.fert,row.verw,row.vtr].map((v,j) => (
                                <td key={j} style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.55)", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>{fmt(v)}</td>
                              ))}
                            </tr>
                          ))}
                          <tr style={{ borderTop:"1px solid rgba(139,92,246,0.3)" }}>
                            <td style={{ padding:"3px 6px", fontWeight:800, color:"#8b5cf6", fontSize:10 }}>Summe GK</td>
                            {[babGK.mat+babGK.fert+babGK.verw+babGK.vtr, babGK.mat, babGK.fert, babGK.verw, babGK.vtr].map((v,j) => (
                              <td key={j} style={{ padding:"3px 6px", textAlign:"right", fontWeight:800, color:"#8b5cf6", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>{fmt(v)}</td>
                            ))}
                          </tr>
                          <tr>
                            <td style={{ padding:"3px 6px", color:"rgba(240,236,227,0.45)", fontSize:10 }}>Bezugsgröße (EK)</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>—</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.45)", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>MEK {fmt(babEK.mek)}</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.45)", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>FEK {fmt(babEK.fek)}</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>HK</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>SK</td>
                          </tr>
                          <tr style={{ borderTop:"1px solid rgba(139,92,246,0.15)" }}>
                            <td style={{ padding:"3px 6px", fontWeight:700, color:"#a78bfa", fontSize:10 }}>Zuschlagssatz</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>—</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", fontWeight:700, color:"#a78bfa", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>MGKZ {mgkz} %</td>
                            <td style={{ padding:"3px 6px", textAlign:"right", fontWeight:700, color: klrMaskedId==="k10_4" ? "#e8600a" : "#a78bfa", fontFamily:"'Fira Code',monospace", fontSize:9.5 }}>{klrMaskedId==="k10_4" ? "FGKZ ??? %" : `FGKZ ${fgkz} %`}</td>
                            <td colSpan={2} style={{ padding:"3px 6px", textAlign:"center", color:"rgba(240,236,227,0.25)", fontSize:9 }}>→ über HK/SK</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop:10, padding:"8px", background:"rgba(139,92,246,0.07)", borderRadius:6, fontSize:9.5, color:"rgba(240,236,227,0.5)", lineHeight:1.5 }}>
                      <strong style={{ color:"#a78bfa" }}>Einzelkosten:</strong> MEK + FEK werden <em>direkt</em> dem Produkt zugerechnet.<br/>
                      <strong style={{ color:"#a78bfa" }}>Gemeinkosten:</strong> Werden über Zuschlagssätze (MGKZ, FGKZ …) verteilt.
                    </div>
                  </div>
                )}
                {/* ── DBR ── */}
                {klrTab === "dbr" && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.35)", letterSpacing:".06em", marginBottom:8 }}>DECKUNGSBEITRAGSRECHNUNG · GJ 2025</div>
                    {dbrProdukte.map((p,i) => {
                      const db = p.nvp - p.vk;
                      const be = p.fixAnteil ? Math.ceil(p.fixAnteil / db) : null;
                      return (
                        <div key={i} style={{ marginBottom:10, padding:"10px", background:"rgba(139,92,246,0.07)", borderRadius:8, border:"1px solid rgba(139,92,246,0.15)" }}>
                          <div style={{ fontSize:10.5, fontWeight:800, color:"#c4b5fd", marginBottom:6 }}>{p.name}</div>
                          <table style={{ width:"100%", fontSize:10 }}>
                            <tbody>
                              {[
                                ["Nettoverkaufspreis (NVP)",   fmt(p.nvp)+" €", "rgba(240,236,227,0.7)"],
                                ["− Variable Kosten/Stk.",      "−"+fmt(p.vk)+" €",  "rgba(240,236,227,0.5)"],
                                ["= Stückdeckungsbeitrag",      (klrMaskedId==="k10_6"&&i===0) ? "??? €" : fmt(db)+" €",   "#a78bfa"],
                              ].map(([label,val,col],j) => (
                                <tr key={j}>
                                  <td style={{ padding:"1px 0", color:"rgba(240,236,227,0.45)", fontSize:9.5 }}>{label}</td>
                                  <td style={{ padding:"1px 0", textAlign:"right", fontWeight: j===2?800:500, color:col, fontFamily:"'Fira Code',monospace" }}>{val}</td>
                                </tr>
                              ))}
                              {p.fixAnteil && <tr><td colSpan={2}><div style={{ borderTop:"1px dashed rgba(139,92,246,0.2)", margin:"4px 0" }}/></td></tr>}
                              {p.fixAnteil && (
                                <>
                                  <tr><td style={{ color:"rgba(240,236,227,0.45)", fontSize:9.5 }}>Fixkosten gesamt</td><td style={{ textAlign:"right", fontFamily:"'Fira Code',monospace", color:"rgba(240,236,227,0.5)", fontSize:9.5 }}>{fmt(p.fixAnteil)} €</td></tr>
                                  <tr><td style={{ fontWeight:700, color:"#e8600a", fontSize:9.5 }}>Break-even-Menge</td><td style={{ textAlign:"right", fontWeight:800, fontFamily:"'Fira Code',monospace", color:"#e8600a", fontSize:9.5 }}>{(klrMaskedId==="k10_7"&&i===0) ? "???" : be} Stk.</td></tr>
                                </>
                              )}
                            </tbody>
                          </table>
                          <div style={{ marginTop:6, padding:"5px 7px", background:`rgba(139,92,246,${p.stk > (be||0) ? "0.12":"0.05"})`, borderRadius:5, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ fontSize:9.5, color:"rgba(240,236,227,0.45)" }}>Absatzmenge GJ 2025</span>
                            <span style={{ fontFamily:"'Fira Code',monospace", fontWeight:800, color: be&&p.stk>be?"#4ade80":"#facc15", fontSize:10 }}>{fmt(p.stk,0)} Stk. {be ? (p.stk>be?"✓ Gewinn":"⚠ Verlust") : ""}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ padding:"7px 9px", background:"rgba(232,96,10,0.07)", borderRadius:6, border:"1px solid rgba(232,96,10,0.15)", fontSize:9.5, color:"rgba(240,236,227,0.5)" }}>
                      <strong style={{ color:"#e8600a" }}>Zusatzauftrag-Regel:</strong> Annehmen wenn NVP &gt; variable Kosten (pos. DB) + freie Kapazität vorhanden.<br/>
                      <strong style={{ color:"#e8600a" }}>Langfristige Preisuntergrenze:</strong> = Selbstkosten (alle Kosten müssen gedeckt sein).
                    </div>
                  </div>
                )}
                {/* ── Kennzahlen ── */}
                {klrTab === "kz" && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.35)", letterSpacing:".06em", marginBottom:8 }}>AUFBEREITETE BILANZ · 31.12.2025</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                      {[
                        { label:"Eigenkapital (EK)",     value:fmt(kz.ek)+" €",    color:"#a78bfa" },
                        { label:"LFV (LBKV)",            value:fmt(kz.lfv)+" €",   color:"rgba(240,236,227,0.55)" },
                        { label:"Anlagevermögen (AV)",   value:fmt(kz.av)+" €",    color:"rgba(240,236,227,0.55)" },
                        { label:"Gewinn",                value:fmt(kz.gewinn)+" €",color:"#4ade80" },
                        { label:"Forderungen (FO)",      value:fmt(kz.fo)+" €",    color:"rgba(240,236,227,0.55)" },
                        { label:"Bankguthaben (BK)",     value:fmt(kz.bk)+" €",    color:"rgba(240,236,227,0.55)" },
                        { label:"Kurzfr. Verbindl. (KFV)", value:fmt(kz.kfv)+" €", color:"rgba(240,236,227,0.55)" },
                      ].map((item,i) => (
                        <div key={i} style={{ padding:"6px 8px", background:"rgba(139,92,246,0.07)", borderRadius:6, border:"1px solid rgba(139,92,246,0.12)" }}>
                          <div style={{ fontSize:9, color:"rgba(240,236,227,0.4)", marginBottom:2 }}>{item.label}</div>
                          <div style={{ fontFamily:"'Fira Code',monospace", fontWeight:800, color:item.color, fontSize:11 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(240,236,227,0.35)", letterSpacing:".06em", marginBottom:6 }}>KENNZAHLEN</div>
                    {[
                      { name:"Anlagendeckung II",       formel:"(EK + LFV) ÷ AV × 100",       wert:((kz.ek+kz.lfv)/kz.av*100).toFixed(2)+" %", ziel:"≥ 100 %", ok:true,  maskId:"k10_1" },
                      { name:"EK-Rentabilität",         formel:"Gewinn ÷ EK × 100",             wert:(kz.gewinn/kz.ek*100).toFixed(2)+" %",         ziel:"≥ Marktzins", ok:true,  maskId:"k10_2" },
                      { name:"Einzugsliquidität",       formel:"(FO + BK) ÷ KFV × 100",         wert:((kz.fo+kz.bk)/kz.kfv*100).toFixed(2)+" %",    ziel:"≥ 100 %", ok:true,  maskId:"k10_3" },
                      { name:"Barliquidität",           formel:"BK ÷ KFV × 100",                wert:(kz.bk/kz.kfv*100).toFixed(2)+" %",             ziel:"20–50 %", ok:(kz.bk/kz.kfv*100)>=20, maskId:null },
                    ].map((kzItem,i) => (
                      <div key={i} style={{ marginBottom:7, padding:"8px 10px", background:"rgba(139,92,246,0.06)", borderRadius:7, border:`1px solid rgba(139,92,246,${kzItem.ok?"0.2":"0.1"})` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:"#c4b5fd" }}>{kzItem.name}</span>
                          <span style={{ fontSize:11, fontWeight:800, fontFamily:"'Fira Code',monospace", color: (kzItem.maskId && klrMaskedId===kzItem.maskId) ? "#e8600a" : (kzItem.ok ? "#4ade80" : "#facc15") }}>{(kzItem.maskId && klrMaskedId===kzItem.maskId) ? "???%" : kzItem.wert}</span>
                        </div>
                        <div style={{ fontSize:9, color:"rgba(240,236,227,0.35)", display:"flex", justifyContent:"space-between" }}>
                          <span>Formel: {kzItem.formel}</span>
                          <span style={{ color: kzItem.ok ? "rgba(74,222,128,0.6)" : "rgba(250,204,21,0.6)" }}>Ziel: {kzItem.ziel} {kzItem.ok ? "✓" : "⚠"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* ── Aufgaben-Banner ── */}
              {aktiveDesk === "klr" && (
                <div style={{ borderTop:"1px solid rgba(139,92,246,0.2)", padding:"10px 14px", background:"rgba(139,92,246,0.06)" }}>
                  <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.5)", marginBottom:7 }}>
                    <span style={{ color:"#e8600a", fontWeight:700 }}>● Aufgabe läuft:</span> {aufgabe?.titel}
                    <span style={{ marginLeft:8, color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>— Nutze die Cockpit-Daten oben zur Berechnung</span>
                  </div>
                  <button onClick={() => { setDeskPopup(null); setSzene("vorfall"); }}
                    style={{ width:"100%", padding:"10px 14px", background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", color:"#fff", border:"none", borderRadius:9, fontWeight:800, fontSize:13, cursor:"pointer", letterSpacing:".02em" }}>
                    Aufgabe bearbeiten →
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── E-Mail-Popup – Outlook-Stil – volle Inbox ── */}
        {deskPopup === "email" && (() => {
          const doneIds = new Set(verlauf.map(v => v.id));
          // Alle E-Mail-Aufgaben: doing zuerst, dann backlog, dann pool (nach tag/id sortiert), dann erledigte
          const emailAufgaben = aufgabenListe.filter(a => DESK_MAP[a.typ] === "email" || a.typ === "buchung" || a.typ === "theorie" || a.typ === "kette" || a.typ === "freitext" || a.typ === "multi_mc" || a.typ === "lueckentext");
          const order = (a) => {
            if (a.id === kbDoing) return 0;
            if (kbBacklog.includes(a.id)) return 1;
            if (!doneIds.has(a.id)) return 2;
            return 3;
          };
          const inboxMails = [...aufgabenListe].sort((a,b) => order(a)-order(b));
          const unreadCount = inboxMails.filter(a => !doneIds.has(a.id) && a.id !== kbDoing).length;
          const selMail = selMailId ? inboxMails.find(a => a.id === selMailId) : (kbDoing ? inboxMails.find(a => a.id === kbDoing) : inboxMails[0]) ?? null;
          const SENDERS = [
            { name:"BayernBank AG",        init:"B", col:"#0078d4" },
            { name:"Steuerberater Müller",  init:"M", col:"#7c3aed" },
            { name:"Chef – Geschäftsführung",init:"C", col:"#e8600a" },
            { name:"Einkauf – Beschaffung", init:"E", col:"#059669" },
            { name:"Kunden-Service",        init:"K", col:"#0891b2" },
          ];
          const getSender = (a) => SENDERS[aufgabenListe.indexOf(a) % SENDERS.length];
          const getMailStatus = (a) => {
            if (a.id === kbDoing) return "aktiv";
            if (doneIds.has(a.id)) return "done";
            if (kbBacklog.includes(a.id)) return "backlog";
            return "neu";
          };
          const statusDot = { neu:"#e8600a", aktiv:"#4ade80", backlog:"rgba(240,236,227,0.4)", done:"rgba(240,236,227,0.2)" };
          return (
            <div style={{ background:"rgba(12,9,4,0.99)", border:`1.5px solid rgba(232,96,10,0.3)`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
              {/* Outlook Titelleiste */}
              <div style={{ background:"#0f3460", padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:20, height:20, background:"#0078d4", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <AtSign size={11} color="#fff" strokeWidth={2.5}/>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>Outlook</span>
                  <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.4)" }}>— {firmaName}</span>
                  {unreadCount > 0 && <span style={{ background:"#e8600a", color:"#fff", fontSize:8, fontWeight:800, padding:"1px 6px", borderRadius:20 }}>{unreadCount} neu</span>}
                </div>
                <button onClick={() => { setDeskPopup(null); setSelMailId(null); }} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
              </div>

              {/* Dreispaltig: Sidebar | Mailliste | Detail */}
              <div style={{ display:"flex", minHeight:280 }}>
                {/* Schmale Icon-Sidebar */}
                <div style={{ width:40, background:"#0a0e17", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, gap:5, paddingBottom:8 }}>
                  {[
                    { icon:<AtSign size={13} strokeWidth={1.8}/>, active:true, badge:unreadCount },
                    { icon:<FileText size={13} strokeWidth={1.8}/>, active:false, badge:0 },
                    { icon:<Upload size={13} strokeWidth={1.8}/>, active:false, badge:0 },
                  ].map((item, i) => (
                    <div key={i} style={{ position:"relative" }}>
                      <div style={{ width:28, height:28, borderRadius:6, background:item.active?"rgba(0,120,212,0.25)":"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", color:item.active?"#4da6ff":"rgba(255,255,255,0.3)" }}>{item.icon}</div>
                      {item.badge > 0 && <div style={{ position:"absolute", top:-3, right:-3, width:13, height:13, background:"#e8600a", borderRadius:"50%", fontSize:7, fontWeight:800, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>{item.badge}</div>}
                    </div>
                  ))}
                </div>

                {/* Mailliste */}
                <div style={{ width:180, borderRight:"1px solid rgba(255,255,255,0.06)", overflowY:"auto", maxHeight:320 }}>
                  <div style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,0.06)", fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.5)" }}>Posteingang</div>
                  {inboxMails.map(a => {
                    const sender = getSender(a);
                    const ms = getMailStatus(a);
                    const isOpen = selMail?.id === a.id;
                    const isDone = ms === "done";
                    return (
                      <div key={a.id} onClick={() => setSelMailId(a.id)}
                        style={{ padding:"7px 10px", borderBottom:"1px solid rgba(255,255,255,0.04)", cursor:"pointer",
                          background: isOpen ? "rgba(0,120,212,0.15)" : "transparent",
                          borderLeft: isOpen ? "2.5px solid #0078d4" : "2.5px solid transparent",
                          opacity: isDone ? 0.45 : 1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:statusDot[ms], flexShrink:0 }}/>
                          <div style={{ fontSize:10, fontWeight: isDone ? 400 : 700, color:isDone?"rgba(255,255,255,0.4)":"#fff", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{sender.name}</div>
                        </div>
                        <div style={{ fontSize:9.5, color:isDone?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.65)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", fontWeight: ms==="neu"?600:400 }}>{a.titel}</div>
                        {ms === "aktiv" && <div style={{ fontSize:8, color:"#4ade80", marginTop:1 }}>● In Bearbeitung</div>}
                        {ms === "neu"   && <div style={{ fontSize:8, color:"#e8600a", marginTop:1 }}>● Ungelesen</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Mail-Detail */}
                {selMail ? (() => {
                  const sender = getSender(selMail);
                  const ms = getMailStatus(selMail);
                  const isDone = doneIds.has(selMail.id);
                  const isInBacklog = kbBacklog.includes(selMail.id);
                  const isActive = selMail.id === kbDoing;
                  return (
                    <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
                      {/* Mail-Kopf */}
                      <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize:13, fontWeight:800, color:"#f0ece3", marginBottom:7 }}>{selMail.titel}</div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <div style={{ width:30, height:30, borderRadius:"50%", background:sender.col, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{sender.init}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:10.5, fontWeight:700, color:"#f0ece3" }}>{sender.name}</div>
                            <div style={{ fontSize:9, color:"rgba(240,236,227,0.4)" }}>
                              An: buchhaltung@{firmaName.toLowerCase().replace(/[\s\-]/g,"")}.de
                            </div>
                          </div>
                          {isDone && <span style={{ background:"rgba(74,222,128,0.15)", color:"#4ade80", fontSize:8.5, fontWeight:800, padding:"2px 8px", borderRadius:20, flexShrink:0 }}>✓ Erledigt</span>}
                        </div>
                      </div>
                      {/* Mail-Body */}
                      <div style={{ flex:1, padding:"10px 12px 6px", fontSize:11.5, color:"rgba(240,236,227,0.72)", lineHeight:1.7, overflowY:"auto" }}>
                        <div style={{ marginBottom:8, color:"rgba(240,236,227,0.4)", fontSize:10 }}>Sehr geehrte Damen und Herren,</div>
                        <div>{selMail.story}</div>
                        <div style={{ marginTop:10, color:"rgba(240,236,227,0.3)", fontSize:9.5 }}>
                          Mit freundlichen Grüßen<br/>{sender.name}
                        </div>
                      </div>
                      {/* Aktionsleiste */}
                      {!isDone && (
                        <div style={{ padding:"8px 12px 10px", display:"flex", gap:6, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                          {isActive ? (
                            <button onClick={() => { setDeskPopup(null); setSelMailId(null); setSzene("vorfall"); }}
                              style={{ flex:1, padding:"8px", background:"#4ade80", color:"#0f0a04", border:"none", borderRadius:7, fontWeight:800, fontSize:11.5, cursor:"pointer" }}>
                              ▶ Weiterbearbeiten →
                            </button>
                          ) : (
                            <>
                              {!isInBacklog ? (
                                <button onClick={() => { setKbBacklog(b => [...b, selMail.id]); }}
                                  style={{ flex:1, padding:"8px", background:"rgba(240,236,227,0.1)", color:"#f0ece3", border:"1px solid rgba(240,236,227,0.15)", borderRadius:7, fontWeight:700, fontSize:11, cursor:"pointer" }}>
                                  + In Backlog
                                </button>
                              ) : (
                                <button onClick={() => { setKbBacklog(b => b.filter(x => x !== selMail.id)); }}
                                  style={{ flex:1, padding:"8px", background:"rgba(240,236,227,0.06)", color:"rgba(240,236,227,0.45)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:7, fontWeight:600, fontSize:11, cursor:"pointer" }}>
                                  Aus Backlog entfernen
                                </button>
                              )}
                              {!kbDoing && (
                                <button onClick={() => {
                                  if (isInBacklog) setKbBacklog(b => b.filter(x => x !== selMail.id));
                                  setKbDoing(selMail.id);
                                  setDeskPopup(null); setSelMailId(null); setSzene("vorfall");
                                }} style={{ flex:1, padding:"8px", background:"#e8600a", color:"#fff", border:"none", borderRadius:7, fontWeight:800, fontSize:11.5, cursor:"pointer" }}>
                                  ▶ Jetzt starten →
                                </button>
                              )}
                            </>
                          )}
                          <button style={{ padding:"8px 10px", background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.4)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:7, fontSize:10, cursor:"default" }}>↩ Antworten</button>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.2)", gap:8 }}>
                    <AtSign size={28} strokeWidth={1} style={{ opacity:0.2 }}/>
                    <div style={{ fontSize:11, fontWeight:600 }}>Keine Mail ausgewählt</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Briefkasten-Popup ── */}
        {deskPopup === "post" && (
          <div style={{ background:"rgba(20,14,4,0.98)", border:`1.5px solid rgba(168,85,247,${aktiveDesk === "post" ? "0.45" : "0.18"})`, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <Mail size={14} color="#a855f7" strokeWidth={1.5}/>
                <span style={{ fontWeight:800, fontSize:13, color:"#f0ece3" }}>Briefkasten</span>
                {aktiveDesk === "post" && (
                  <span style={{ background:"#a855f7", color:"#fff", fontSize:9, fontWeight:800, padding:"1px 7px", borderRadius:20 }}>1 neu</span>
                )}
              </div>
              <button onClick={() => setDeskPopup(null)} style={{ background:"none", border:"none", color:"rgba(240,236,227,0.4)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>✕</button>
            </div>
            {aktiveDesk === "post" && aufgabe.belegDaten ? (
              <div>
                <div style={{ background:"rgba(168,85,247,0.08)", border:"1px solid rgba(168,85,247,0.22)", borderRadius:9, padding:"10px 12px", marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:12, color:"#f0ece3" }}>{aufgabe.belegDaten.absenderName}</div>
                      <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)", marginTop:1 }}>{aufgabe.belegDaten.absenderAdresse}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                      <div style={{ fontSize:9.5, color:"#a855f7", fontWeight:700, textTransform:"uppercase" }}>{aufgabe.belegDaten.typ === "eingangsrechnung" ? "Eingangsrechnung" : "Gutschrift"}</div>
                      <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)" }}>Nr. {aufgabe.belegDaten.rechnungsnummer}</div>
                      <div style={{ fontSize:10, color:"rgba(240,236,227,0.4)" }}>Fällig: {aufgabe.belegDaten.faellig}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"flex-end", fontWeight:800, fontSize:14, color:"#a855f7", paddingTop:6, borderTop:"1px solid rgba(168,85,247,0.15)" }}>
                    {aufgabe.belegDaten.brutto.toLocaleString("de-DE", { minimumFractionDigits:2 })} €
                  </div>
                </div>
                <div style={{ fontSize:11.5, color:"rgba(240,236,227,0.5)", marginBottom:10, lineHeight:1.55 }}>{aufgabe.story}</div>
                <button onClick={() => { setDeskPopup(null); setSzene("vorfall"); }}
                  style={{ width:"100%", padding:"11px", background:"#a855f7", color:"#fff", border:"none", borderRadius:9, fontWeight:800, fontSize:13, cursor:"pointer" }}>
                  Beleg bearbeiten →
                </button>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"18px 0", color:"rgba(240,236,227,0.28)", fontSize:12 }}>
                <Mail size={24} strokeWidth={1} style={{ marginBottom:8, opacity:0.3 }}/>
                <div>Briefkasten leer</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Vorfall / PC / Buchung / Feedback scene ───────────────────────────────
  return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"12px 14px" }}>
      {simHeader}

      {feedback === null && (
        <button onClick={() => setSzene("schreibtisch")}
          style={{ background:"none", border:"none", color:"rgba(240,236,227,0.4)", cursor:"pointer", fontSize:12, marginBottom:10, padding:0, display:"flex", alignItems:"center", gap:4 }}>
          ← Schreibtisch
        </button>
      )}

      {/* Task card */}
      <div style={{ background:"rgba(28,20,10,0.7)", border:"1px solid rgba(240,236,227,0.1)", borderLeft:`3px solid ${meta.farbe}`, borderRadius:12, padding:"13px 16px", marginBottom:12 }}>
        {aufgabe.grundwissen && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:9.5, fontWeight:700, color:"#4ade80", background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.25)", padding:"2px 8px", borderRadius:20, marginBottom:6 }}>
            <GraduationCap size={9} strokeWidth={2}/>Grundwissen (Wiederholung)
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
          <div style={{ fontWeight:800, fontSize:14, color:"#f0ece3" }}>{aufgabeIdx+1}/{aufgabenListe.length} · {aufgabe.titel}</div>
          <span style={{ background:`${meta.farbe}22`, color:meta.farbe, fontWeight:700, fontSize:11, padding:"2px 10px", borderRadius:20, flexShrink:0, marginLeft:8 }}>{aufgabe.punkte} P</span>
        </div>
        <div style={{ fontSize:13, color:"rgba(240,236,227,0.7)", lineHeight:1.55 }}>{aufgabe.story}</div>
      </div>

      {/* ── Ketten-Aufgabe: Stepper + aktueller Schritt ── */}
      {aufgabe.typ === "kette" && feedback === null && (() => {
        const ks = aufgabe.kette[ketteSchritt];
        const KETTE_ICONS = { mc:"❓", kalkulation:"🔢", buchung:"📒" };
        return (
          <div style={{ marginBottom:12 }}>
            {/* Stepper */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:2, marginBottom:14 }}>
              {aufgabe.kette.map((s, i) => {
                const done  = i < ketteSchritt;
                const aktiv = i === ketteSchritt;
                return (
                  <React.Fragment key={i}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1 }}>
                      <div style={{ width:26, height:26, borderRadius:"50%",
                        background: done ? "rgba(74,222,128,0.2)" : aktiv ? "#e8600a" : "rgba(240,236,227,0.07)",
                        border:`2px solid ${done ? "rgba(74,222,128,0.5)" : aktiv ? "#e8600a" : "rgba(240,236,227,0.12)"}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:11, fontWeight:800,
                        color: done ? "#4ade80" : aktiv ? "#fff" : "rgba(240,236,227,0.3)" }}>
                        {done ? "✓" : i+1}
                      </div>
                      <div style={{ fontSize:8, color: aktiv ? "#e8600a" : done ? "rgba(74,222,128,0.7)" : "rgba(240,236,227,0.22)", fontWeight: aktiv ? 800 : 500, textAlign:"center", lineHeight:1.2 }}>
                        {s.label}
                      </div>
                    </div>
                    {i < aufgabe.kette.length - 1 && (
                      <div style={{ height:2, flex:0.5, marginTop:12, background: i < ketteSchritt ? "rgba(74,222,128,0.4)" : "rgba(240,236,227,0.07)", borderRadius:1 }}/>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Schritt-Karte */}
            <div style={{ background:"rgba(20,14,4,0.95)", border:"1px solid rgba(240,236,227,0.09)", borderLeft:"3px solid #e8600a", borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:"#e8600a", marginBottom:5 }}>
                {KETTE_ICONS[ks.typ] || "▶"} Schritt {ketteSchritt+1}/{aufgabe.kette.length} – {ks.label}
              </div>
              <div style={{ fontSize:13, color:"rgba(240,236,227,0.82)", lineHeight:1.65, whiteSpace:"pre-line" }}>{ks.aufgabe}</div>
            </div>

            {/* MC-Antworten */}
            {ks.typ === "mc" && (
              <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"12px 14px" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {ks.mcOptionen.map((opt, i) => (
                    <button key={i} onClick={() => setTheorieAntwort(i)}
                      style={{ padding:"10px 14px", border:`1.5px solid ${theorieAntwort===i?"#e8600a":"rgba(240,236,227,0.14)"}`, borderRadius:9, background:theorieAntwort===i?"rgba(232,96,10,0.14)":"rgba(240,236,227,0.04)", color:theorieAntwort===i?"#e8600a":"#f0ece3", fontSize:13, textAlign:"left", cursor:"pointer", fontWeight:theorieAntwort===i?700:400, display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ width:22, height:22, borderRadius:6, background:theorieAntwort===i?"#e8600a":"rgba(240,236,227,0.1)", color:theorieAntwort===i?"#fff":"rgba(240,236,227,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{String.fromCharCode(65+i)}</span>
                      {opt}
                    </button>
                  ))}
                </div>
                <button onClick={pruefen} disabled={theorieAntwort === null}
                  style={{ marginTop:12, width:"100%", padding:"11px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity:theorieAntwort===null?0.4:1 }}>
                  Antwort prüfen
                </button>
              </div>
            )}

            {/* Kalkulations-Eingabe */}
            {ks.typ === "kalkulation" && (
              <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"12px 14px" }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                  <div style={{ flex:1 }}>
                    <input value={kalkAntwort} onChange={e => setKalkAntwort(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && kalkAntwort.trim()) pruefen(); }}
                      placeholder="Ergebnis eingeben …" autoFocus
                      style={{ width:"100%", padding:"12px 14px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:16, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'Fira Code',monospace", outline:"none", textAlign:"right" }}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:"rgba(240,236,227,0.5)", paddingBottom:14 }}>{ks.kalkulation?.einheit || "€"}</div>
                </div>
                <button onClick={pruefen} disabled={!kalkAntwort.trim()}
                  style={{ marginTop:10, width:"100%", padding:"11px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity:!kalkAntwort.trim()?0.4:1 }}>
                  Ergebnis prüfen
                </button>
              </div>
            )}

            {/* Buchungssatz-Eingabe (kette-Schritt) */}
            {ks.typ === "buchung" && (() => {
              const iSt = { width:"100%", padding:"10px 12px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:14, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'Fira Code',monospace", textTransform:"uppercase", outline:"none" };
              const bSt = { ...iSt, fontSize:13, textTransform:"none", color:"rgba(240,236,227,0.8)", marginTop:4 };
              const nS = (ks.soll||[]).length;
              const nH = (ks.haben||[]).length;
              const maxR = Math.max(nS, nH);
              const anRow = nH > nS ? 0 : nS - 1;
              const habenOffset = nS > nH ? nS - nH : 0;
              const allFilled = (buchAntwort.soll||[""]).every(s=>(s||"").trim())
                && (buchAntwort.haben||[""]).every(h=>(h||"").trim())
                && (buchAntwort.betragSoll||[""]).every(b=>(b||"").trim())
                && (buchAntwort.betragHaben||[""]).every(b=>(b||"").trim());
              return (
                <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:"rgba(240,236,227,0.35)", marginBottom:9 }}>
                    Kürzel {lehrerConfig.mitKontennummern ? "oder Nr. – z.B. 6000 / AWR …" : "– z.B. AWR, VE, BK …"}
                    {" · Betrag: "}
                    <span style={{ fontFamily:"'Fira Code',monospace", color:"rgba(232,96,10,0.7)" }}>1.234,56</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"0 8px", marginBottom:3 }}>
                    <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{nS>1 ? `Soll (${nS} Konten)` : "Soll"}</div>
                    <div/>
                    <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{nH>1 ? `Haben (${nH} Konten)` : "Haben"}</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"6px 8px", alignItems:"start" }}>
                    {Array.from({length: maxR}).map((_,row) => {
                      const si = row; const hi = row - habenOffset;
                      return (<React.Fragment key={row}>
                        {si < nS
                          ? <div>
                              <input value={(buchAntwort.soll||[])[si]||""}
                                onChange={e=>{ const v=[...(buchAntwort.soll||[])]; v[si]=e.target.value; setBuchAntwort(a=>({...a,soll:v})); }}
                                onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                                placeholder={nS>1 ? `Soll-Konto ${si+1}` : "Soll-Konto"} autoFocus={row===0}
                                style={iSt}/>
                              <input value={(buchAntwort.betragSoll||[])[si]||""}
                                onChange={e=>{ const v=[...(buchAntwort.betragSoll||[])]; v[si]=e.target.value; setBuchAntwort(a=>({...a,betragSoll:v})); }}
                                onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                                placeholder="0,00 €" inputMode="decimal" style={bSt}/>
                            </div>
                          : <div/>}
                        <div style={{ fontWeight:800, color:"rgba(240,236,227,0.35)", fontSize:12, textAlign:"center", paddingTop:12, visibility: row===anRow?"visible":"hidden" }}>an</div>
                        {hi>=0 && hi<nH
                          ? <div>
                              <input value={(buchAntwort.haben||[])[hi]||""}
                                onChange={e=>{ const v=[...(buchAntwort.haben||[])]; v[hi]=e.target.value; setBuchAntwort(a=>({...a,haben:v})); }}
                                onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                                placeholder={nH>1 ? `Haben-Konto ${hi+1}` : "Haben-Konto"}
                                style={iSt}/>
                              <input value={(buchAntwort.betragHaben||[])[hi]||""}
                                onChange={e=>{ const v=[...(buchAntwort.betragHaben||[])]; v[hi]=e.target.value; setBuchAntwort(a=>({...a,betragHaben:v})); }}
                                onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                                placeholder="0,00 €" inputMode="decimal" style={bSt}/>
                            </div>
                          : <div/>}
                      </React.Fragment>);
                    })}
                  </div>
                  <button onClick={pruefen} disabled={!allFilled}
                    style={{ marginTop:10, width:"100%", padding:"11px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity:!allFilled?0.4:1 }}>
                    Buchungssatz prüfen
                  </button>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ── PC/Banking Interface with monitor framing ── */}
      {aufgabe.typ !== "kette" && <div style={{ marginBottom:12 }}>
        {/* Monitor bezel */}
        <div style={{ background:"#1a3a5c", borderRadius:"10px 10px 0 0", padding:"7px 14px 4px" }}>
          <div style={{ display:"flex", gap:5, marginBottom:3 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#ff5f57" }}/>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#febc2e" }}/>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#28c840" }}/>
          </div>
          <div style={{ textAlign:"center", fontSize:9.5, color:"rgba(255,255,255,0.35)" }}>BayernBank AG — Online Banking · {firmaName}</div>
        </div>

        <div style={{ background:"#fff", borderRadius:"0 0 10px 10px", overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.3)" }}>

          {/* Bank header */}
          <div style={{ background:BG, padding:"11px 15px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:28, height:28, background:"rgba(255,255,255,0.12)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Landmark size={14} color="#7dd3fc" strokeWidth={1.5}/>
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:11.5, color:"#fff" }}>BayernBank AG</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)" }}>Firmenkundenkonto</div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)" }}>Kontostand</div>
                <div style={{ fontSize:20, fontWeight:900, color: kontostand >= 0 ? "#4ade80" : "#f87171", letterSpacing:"-0.02em" }}>
                  {kontostand.toLocaleString("de-DE", { minimumFractionDigits:2 })} €
                </div>
              </div>
            </div>
            <div style={{ fontSize:10, fontFamily:"monospace", color:"rgba(255,255,255,0.45)", letterSpacing:"0.04em" }}>{BANK_IBAN}</div>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", background:LT, borderBottom:`1px solid ${BD}` }}>
            {[["konto","Kontoübersicht"],["ueberweisung","Überweisen"],["dauerauftrag","Daueraufträge"],["beleg","Beleg"]].map(([id,label]) => (
              <div key={id} onClick={() => setAnsicht(id)} style={{ flex:1, padding:"9px 4px", textAlign:"center", borderBottom:`2px solid ${ansicht===id ? BG : "transparent"}`, fontSize:9.5, fontWeight:ansicht===id?700:400, color:ansicht===id?BG:"#64748b", background:ansicht===id?"#fff":"transparent", cursor:"pointer", userSelect:"none", transition:"all 0.15s" }}>{label}</div>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding:"12px 14px", minHeight:100 }}>

            {/* ── Kontoübersicht ── */}
            {ansicht === "konto" && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Letzte Umsätze · ···{BANK_IBAN.slice(-7)}</div>
                <div style={{ display:"flex", gap:8, padding:"6px 0", borderBottom:`1px solid ${BD}`, fontSize:11, color:"#374151" }}>
                  <span style={{ minWidth:80, color:"#94a3b8", flexShrink:0 }}>02.01.2026</span>
                  <span style={{ flex:1 }}>Eröffnungssaldo</span>
                  <span style={{ minWidth:90, textAlign:"right", fontFamily:"monospace", fontWeight:700, color:"#0f172a" }}>{BANK_START.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span>
                </div>
                {pastTx.map((tx, i) => (
                  <div key={i} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:`1px solid ${BD}`, fontSize:10.5, color:"#374151" }}>
                    <span style={{ minWidth:80, color:"#94a3b8", flexShrink:0 }}>{tx.datum}</span>
                    <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.text}</span>
                    <span style={{ minWidth:90, textAlign:"right", fontFamily:"monospace", fontWeight:600, color: tx.betrag > 0 ? "#15803d" : "#dc2626" }}>{(tx.betrag > 0 ? "+" : "") + tx.betrag.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span>
                  </div>
                ))}
                {aufgabe.transaktion && (
                  <div style={{ display:"flex", gap:8, padding:"8px 10px", marginTop:5, borderRadius:8, background:"rgba(232,96,10,0.07)", border:"1.5px solid rgba(232,96,10,0.3)", fontSize:11, color:"#0f172a" }}>
                    <span style={{ minWidth:80, color:"#64748b", flexShrink:0, fontWeight:600 }}>{aufgabe.transaktion.datum}</span>
                    <span style={{ flex:1, fontWeight:600 }}>{aufgabe.transaktion.text}</span>
                    <span style={{ minWidth:90, textAlign:"right", fontFamily:"monospace", fontWeight:800, color: aufgabe.transaktion.betrag > 0 ? "#15803d" : "#dc2626" }}>{(aufgabe.transaktion.betrag > 0 ? "+" : "") + aufgabe.transaktion.betrag.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Überweisung ── */}
            {ansicht === "ueberweisung" && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>Neue Überweisung</div>
                {[["Empfänger","empfaenger"],["IBAN Empfänger","iban"],["Betrag (€)","betrag"],["Verwendungszweck","verwendung"]].map(([label,key]) => (
                  <div key={key} style={{ marginBottom:7 }}>
                    <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>{label}</div>
                    <input value={ueForm[key] || ""} onChange={e => setUeForm(f => ({...f,[key]:e.target.value}))}
                      placeholder={key==="iban"?"DE.. .... .... ....":key==="betrag"?"0,00":""}
                      style={{ ...inputStyle, fontFamily: key==="iban" ? "monospace" : "inherit" }}/>
                  </div>
                ))}
                {!aktionOk ? (
                  <button onClick={() => setAktionOk(true)}
                    disabled={!ueForm.iban || !ueForm.betrag}
                    style={{ width:"100%", padding:"9px", background:BG, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:12, cursor:"pointer", marginTop:2, opacity:(!ueForm.iban||!ueForm.betrag)?0.45:1 }}>
                    Überweisung bestätigen →
                  </button>
                ) : (
                  <div style={{ padding:"7px 11px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, fontSize:11, color:"#15803d", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                    <CheckSquare size={12} strokeWidth={1.5}/> Überweisung ausgeführt!
                  </div>
                )}
              </div>
            )}

            {/* ── Dauerauftrag ── */}
            {ansicht === "dauerauftrag" && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>Neuer Dauerauftrag</div>
                {[["Empfänger","empfaenger"],["IBAN Empfänger","iban"],["Betrag (€)","betrag"],["Verwendungszweck","verwendung"]].map(([label,key]) => (
                  <div key={key} style={{ marginBottom:7 }}>
                    <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>{label}</div>
                    <input value={daForm[key] || ""} onChange={e => setDaForm(f => ({...f,[key]:e.target.value}))}
                      placeholder={key==="iban"?"DE.. .... .... ....":key==="betrag"?"0,00":""}
                      style={{ ...inputStyle, fontFamily: key==="iban" ? "monospace" : "inherit" }}/>
                  </div>
                ))}
                <div style={{ display:"flex", gap:8, marginBottom:7 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>Rhythmus</div>
                    <select value={daForm.rhythmus || "monatlich"} onChange={e => setDaForm(f=>({...f,rhythmus:e.target.value}))} style={{ ...inputStyle }}>
                      <option value="monatlich">monatlich</option>
                      <option value="vierteljaehrlich">vierteljährlich</option>
                      <option value="jaehrlich">jährlich</option>
                    </select>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:"#64748b", marginBottom:2 }}>Ausführungstag</div>
                    <select value={daForm.tag || "1"} onChange={e => setDaForm(f=>({...f,tag:e.target.value}))} style={{ ...inputStyle }}>
                      {[1,5,10,15,20,25,28].map(d => <option key={d} value={String(d)}>{d}.</option>)}
                    </select>
                  </div>
                </div>
                {!aktionOk ? (
                  <button onClick={() => setAktionOk(true)}
                    disabled={!daForm.iban || !daForm.betrag}
                    style={{ width:"100%", padding:"9px", background:BG, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:12, cursor:"pointer", opacity:(!daForm.iban||!daForm.betrag)?0.45:1 }}>
                    Dauerauftrag speichern →
                  </button>
                ) : (
                  <div style={{ padding:"7px 11px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, fontSize:11, color:"#15803d", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                    <CheckSquare size={12} strokeWidth={1.5}/> Dauerauftrag gespeichert!
                  </div>
                )}
              </div>
            )}

            {/* ── Beleg ── */}
            {ansicht === "beleg" && aufgabe.belegDaten && (() => {
              const b = aufgabe.belegDaten;
              const isEin = b.typ === "eingangsrechnung";
              return (
                <div>
                  <div style={{ border:`1.5px solid ${BD}`, borderRadius:8, padding:"10px 12px", marginBottom:8, background:"#fafbfc", fontSize:10.5 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:7 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:11.5, color:"#0f172a" }}>{b.absenderName}</div>
                        <div style={{ color:"#64748b", marginTop:1 }}>{b.absenderAdresse}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:700, color:isEin?"#dc2626":"#15803d", fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.06em" }}>{isEin ? "Eingangsrechnung" : "Ausgangsrechnung"}</div>
                        <div style={{ color:"#374151", marginTop:1 }}>Nr. {b.rechnungsnummer}</div>
                        <div style={{ color:"#64748b" }}>{b.datum} · Fällig: {b.faellig}</div>
                        <div style={{ fontSize:9.5, color:"#94a3b8", fontFamily:"monospace", marginTop:1 }}>IBAN: {b.absenderIBAN}</div>
                      </div>
                    </div>
                    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:5 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${BD}`, color:"#64748b" }}>
                          {["Menge","Einheit","Beschreibung","EP (€)","Gesamt (€)"].map(h => <th key={h} style={{ padding:"2px 3px", textAlign: h.includes("€")?"right":"left", fontWeight:700, fontSize:9.5 }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {b.positionen.map((p, i) => (
                          <tr key={i} style={{ borderBottom:`1px solid ${BD}26`, color:"#1e293b" }}>
                            <td style={{ padding:"2px 3px", textAlign:"right" }}>{p.menge}</td>
                            <td style={{ padding:"2px 3px" }}>{p.einheit}</td>
                            <td style={{ padding:"2px 3px", fontWeight:500 }}>{p.beschreibung}</td>
                            <td style={{ padding:"2px 3px", textAlign:"right", fontFamily:"monospace" }}>{p.einzelpreis.toFixed(2)}</td>
                            <td style={{ padding:"2px 3px", textAlign:"right", fontFamily:"monospace", fontWeight:600 }}>{p.gesamt.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ borderTop:`1px solid ${BD}`, paddingTop:5, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, fontSize:10.5 }}>
                      {b.netto !== undefined && b.netto !== b.brutto && <>
                        <div style={{ color:"#374151" }}>Nettobetrag: <span style={{ fontFamily:"monospace", fontWeight:600 }}>{b.netto.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
                        <div style={{ color:"#374151" }}>zzgl. 19 % USt: <span style={{ fontFamily:"monospace", fontWeight:600 }}>{(b.brutto-b.netto).toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
                      </>}
                      <div style={{ fontWeight:700, fontSize:11, color:"#0f172a" }}>Rechnungsbetrag (brutto): <span style={{ fontFamily:"monospace" }}>{b.brutto.toLocaleString("de-DE",{minimumFractionDigits:2})} €</span></div>
                    </div>
                  </div>
                  {aufgabe.aktion === "beleg" && (!belegUeOk ? (
                    <div>
                      <div style={{ fontSize:9.5, fontWeight:700, color:"#94a3b8", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Überweisung ausfüllen</div>
                      {[["Empfänger","empfaenger","text"],["IBAN Empfänger","iban","text"],["Betrag (€)","betrag","number"],["Verwendungszweck","verwendung","text"]].map(([label,key,type]) => (
                        <div key={key} style={{ marginBottom:5 }}>
                          <div style={{ fontSize:9.5, color:"#64748b", marginBottom:2 }}>{label}</div>
                          <input type={type} value={belegUeForm[key] || ""} onChange={e => setBelegUeForm(f=>({...f,[key]:e.target.value}))}
                            style={{ ...inputStyle, fontFamily: key==="iban"?"monospace":"inherit" }} placeholder={key==="iban"?"DE.. .... .... ....":""} />
                        </div>
                      ))}
                      <button onClick={() => {
                        const sol = aufgabe.ueberweisungsDaten;
                        const chkIban = (belegUeForm.iban||"").replace(/\s/g,"").toUpperCase() === sol.iban.replace(/\s/g,"").toUpperCase();
                        const chkBetrag = parseFloat((belegUeForm.betrag||"").replace(",",".")) === parseFloat(sol.betrag);
                        const chkEmpf = (belegUeForm.empfaenger||"").trim().toLowerCase().includes(sol.empfaenger.split(" ")[0].toLowerCase());
                        const teilPunkte = (chkIban?1:0) + (chkBetrag?1:0) + (chkEmpf?1:0);
                        setBelegUePunkte(teilPunkte);
                        setBelegUeOk(true);
                      }}
                        disabled={!belegUeForm.empfaenger || !belegUeForm.iban || !belegUeForm.betrag}
                        style={{ width:"100%", marginTop:3, padding:"8px", background:BG, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:11.5, cursor:"pointer", opacity:(!belegUeForm.empfaenger||!belegUeForm.iban||!belegUeForm.betrag)?0.5:1 }}>
                        Überweisung bestätigen →
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding:"7px 11px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, fontSize:11, color:"#15803d", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                      <CheckSquare size={12} strokeWidth={1.5}/> Überweisung übermittelt! {belegUePunkte > 0 ? `(+${belegUePunkte} Pkt für Richtigkeit)` : "(Daten unvollständig)"}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>}

      {/* ── Buchungssatz-Eingabe (Buchung / Überweisung / Beleg) ── */}
      {aufgabe.typ !== "mc" && aufgabe.typ !== "kalkulation" && aufgabe.typ !== "kette" &&
       (aufgabe.aktion === "buchung" || aktionOk || belegUeOk) && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:5 }}>{aufgabe.aufgabe}</div>
          <div style={{ fontSize:11, color:"rgba(240,236,227,0.35)", marginBottom:9 }}>
            {lehrerConfig.mitKontennummern ? "Nr. oder Kürzel – z.B. 6000 / AWR, 2800 / BK …" : "Kürzel – z.B. BK, AWMP, FO, LG, AWR, VE …"}
            {" · Beträge: GoB-Format "}
            <span style={{ fontFamily:"'Fira Code',monospace", color:"rgba(232,96,10,0.8)" }}>1.234,56</span>
          </div>
          {(() => {
            const iSt = { width:"100%", padding:"10px 12px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:14, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'Fira Code',monospace", textTransform:"uppercase", outline:"none" };
            const bSt = { ...iSt, fontSize:13, textTransform:"none", color:"rgba(240,236,227,0.8)", marginTop:4 };
            const nS = (aufgabe.soll||[]).length;
            const nH = (aufgabe.haben||[]).length;
            const maxR = Math.max(nS, nH);
            const anRow = nH > nS ? 0 : nS - 1;
            const habenOffset = nS > nH ? nS - nH : 0;
            const allFilled = (buchAntwort.soll||[""]).every(s=>(s||"").trim())
              && (buchAntwort.haben||[""]).every(h=>(h||"").trim())
              && (buchAntwort.betragSoll||[""]).every(b=>(b||"").trim())
              && (buchAntwort.betragHaben||[""]).every(b=>(b||"").trim());
            return (<>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"0 8px", marginBottom:3 }}>
                <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{nS>1 ? `Soll (${nS} Konten)` : "Soll"}</div>
                <div/>
                <div style={{ fontSize:10, color:"rgba(240,236,227,0.45)" }}>{nH>1 ? `Haben (${nH} Konten)` : "Haben"}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"6px 8px", alignItems:"start" }}>
                {Array.from({length: maxR}).map((_,row) => {
                  const si = row; const hi = row - habenOffset;
                  return (<React.Fragment key={row}>
                    {si < nS
                      ? <div>
                          <input value={(buchAntwort.soll||[])[si]||""}
                            onChange={e=>{ const v=[...(buchAntwort.soll||[])]; v[si]=e.target.value; setBuchAntwort(a=>({...a,soll:v})); }}
                            onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                            placeholder={nS>1 ? `Soll-Konto ${si+1}` : "Soll-Konto"} autoFocus={row===0}
                            style={iSt}/>
                          <input value={(buchAntwort.betragSoll||[])[si]||""}
                            onChange={e=>{ const v=[...(buchAntwort.betragSoll||[])]; v[si]=e.target.value; setBuchAntwort(a=>({...a,betragSoll:v})); }}
                            onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                            placeholder="0,00 €" inputMode="decimal"
                            style={bSt}/>
                        </div>
                      : <div/>}
                    <div style={{ fontWeight:800, color:"rgba(240,236,227,0.35)", fontSize:12, textAlign:"center", paddingTop:12, visibility: row===anRow?"visible":"hidden" }}>an</div>
                    {hi>=0 && hi<nH
                      ? <div>
                          <input value={(buchAntwort.haben||[])[hi]||""}
                            onChange={e=>{ const v=[...(buchAntwort.haben||[])]; v[hi]=e.target.value; setBuchAntwort(a=>({...a,haben:v})); }}
                            onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                            placeholder={nH>1 ? `Haben-Konto ${hi+1}` : "Haben-Konto"}
                            style={iSt}/>
                          <input value={(buchAntwort.betragHaben||[])[hi]||""}
                            onChange={e=>{ const v=[...(buchAntwort.betragHaben||[])]; v[hi]=e.target.value; setBuchAntwort(a=>({...a,betragHaben:v})); }}
                            onKeyDown={e=>{ if(e.key==="Enter"&&allFilled) pruefen(); }}
                            placeholder="0,00 €" inputMode="decimal"
                            style={bSt}/>
                        </div>
                      : <div/>}
                  </React.Fragment>);
                })}
              </div>
              <button onClick={pruefen} disabled={!allFilled}
                style={{ marginTop:10, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity:!allFilled?0.4:1 }}>
                Buchungssatz prüfen
              </button>
            </>);
          })()}
        </div>
      )}

      {/* ── Multiple-Choice (Theoriefragen) ── */}
      {aufgabe.typ === "mc" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          {aufgabe.schaubild && <SchaubildAnzeige schaubild={aufgabe.schaubild} />}
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:12 }}>{aufgabe.aufgabe}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {aufgabe.mcOptionen.map((opt, i) => (
              <button key={i} onClick={() => setTheorieAntwort(i)}
                style={{ padding:"10px 14px", border:`1.5px solid ${theorieAntwort === i ? "#e8600a" : "rgba(240,236,227,0.14)"}`, borderRadius:9, background: theorieAntwort === i ? "rgba(232,96,10,0.14)" : "rgba(240,236,227,0.04)", color: theorieAntwort === i ? "#e8600a" : "#f0ece3", fontSize:13, textAlign:"left", cursor:"pointer", fontWeight: theorieAntwort === i ? 700 : 400, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ width:22, height:22, borderRadius:6, background: theorieAntwort === i ? "#e8600a" : "rgba(240,236,227,0.1)", color: theorieAntwort === i ? "#fff" : "rgba(240,236,227,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0 }}>{String.fromCharCode(65+i)}</span>
                {opt}
              </button>
            ))}
          </div>
          <button onClick={pruefen} disabled={theorieAntwort === null}
            style={{ marginTop:12, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: theorieAntwort === null ? 0.4 : 1 }}>
            Antwort prüfen
          </button>
        </div>
      )}

      {/* ── Kalkulation ── */}
      {aufgabe.typ === "kalkulation" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          {aufgabe.schaubild && <SchaubildAnzeige schaubild={aufgabe.schaubild} />}
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:5 }}>{aufgabe.aufgabe}</div>
          <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.35)", marginBottom:8 }}>
            GoB-Format: <span style={{ fontFamily:"'Fira Code',monospace", color:"rgba(232,96,10,0.7)" }}>1.234,56</span> (Tausenderpunkt, Komma als Dezimalzeichen)
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <input type="text" inputMode="decimal" value={kalkAntwort} onChange={e => setKalkAntwort(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && kalkAntwort) pruefen(); }}
              placeholder="z.B. 1.234,56" autoFocus
              style={{ flex:1, padding:"10px 12px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:16, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'Fira Code',monospace", outline:"none" }}/>
            <span style={{ fontSize:15, color:"rgba(240,236,227,0.5)", fontWeight:700 }}>{aufgabe.kalkulation?.einheit}</span>
          </div>
          <button onClick={pruefen} disabled={!kalkAntwort}
            style={{ width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: !kalkAntwort ? 0.4 : 1 }}>
            Ergebnis prüfen
          </button>
        </div>
      )}

      {/* ── Lückentext ── */}
      {aufgabe.typ === "lueckentext" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:10 }}>{aufgabe.aufgabe}</div>
          {/* Template mit Lücken-Inputs inline rendern */}
          <div style={{ fontSize:14, color:"rgba(240,236,227,0.8)", lineHeight:2.2, marginBottom:12, fontFamily:"'Fira Code',monospace", background:"rgba(240,236,227,0.04)", borderRadius:8, padding:"10px 12px" }}>
            {(aufgabe.lueckentext?.template || "").split(/(\[L\d+\])/).map((part, idx) => {
              const match = part.match(/\[L(\d+)\]/);
              if (match) {
                const li = parseInt(match[1]);
                const luecke = (aufgabe.lueckentext.luecken || []).find(l => l.id === li);
                return (
                  <input key={idx}
                    value={lueckenEingaben[li] || ""}
                    onChange={e => setLueckenEingaben(prev => ({...prev, [li]: e.target.value}))}
                    placeholder={luecke?.hinweis || "…"}
                    style={{ display:"inline-block", width: Math.max(80, ((luecke?.hinweis?.length || 6) + 2) * 8), padding:"3px 7px", border:"1.5px solid rgba(232,96,10,0.5)", borderRadius:5, background:"rgba(232,96,10,0.07)", color:"#e8600a", fontFamily:"'Fira Code',monospace", fontSize:13, textTransform:"uppercase", outline:"none", verticalAlign:"middle" }}/>
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </div>
          <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.3)", marginBottom:10 }}>
            Kürzel (z.B. BK, AWMP) oder Kontonummer (z.B. 2800) eingeben · Groß-/Kleinschreibung egal
          </div>
          <button onClick={pruefen}
            disabled={Object.keys(lueckenEingaben).length < (aufgabe.lueckentext?.luecken?.length || 1)}
            style={{ width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: Object.keys(lueckenEingaben).length < (aufgabe.lueckentext?.luecken?.length || 1) ? 0.4 : 1 }}>
            Lückentext prüfen
          </button>
        </div>
      )}

      {/* ── Zuordnung ── */}
      {aufgabe.typ === "zuordnung" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:4 }}>{aufgabe.aufgabe}</div>
          {/* Kategorie-Legende */}
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            {(aufgabe.zuordnung?.kategorien || []).map(kat => (
              <span key={kat.id} style={{ fontSize:11, fontWeight:700, color:kat.color, background:`rgba(${kat.rgb},0.1)`, border:`1px solid rgba(${kat.rgb},0.3)`, padding:"3px 10px", borderRadius:20 }}>
                {kat.label}
              </span>
            ))}
          </div>
          {/* Items mit Kategorie-Buttons */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {(aufgabe.zuordnung?.items || []).map(item => {
              const zugewiesen = zuordnungState[item.id];
              return (
                <div key={item.id} style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:9, padding:"8px 10px" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#f0ece3", marginBottom:6 }}>{item.text}</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {(aufgabe.zuordnung.kategorien || []).map(kat => {
                      const aktiv = zugewiesen === kat.id;
                      return (
                        <button key={kat.id} onClick={() => setZuordnungState(s => ({...s, [item.id]: kat.id}))}
                          style={{ padding:"5px 12px", border:`1.5px solid ${aktiv ? kat.color : "rgba(240,236,227,0.15)"}`, borderRadius:7, background: aktiv ? `rgba(${kat.rgb},0.18)` : "transparent", color: aktiv ? kat.color : "rgba(240,236,227,0.45)", fontSize:11, fontWeight: aktiv ? 800 : 500, cursor:"pointer" }}>
                          {kat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={pruefen}
            disabled={Object.keys(zuordnungState).length < (aufgabe.zuordnung?.items?.length || 1)}
            style={{ marginTop:12, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: Object.keys(zuordnungState).length < (aufgabe.zuordnung?.items?.length || 1) ? 0.4 : 1 }}>
            Zuordnung prüfen
          </button>
        </div>
      )}

      {/* ── Multi-Choice ── */}
      {aufgabe.typ === "multi_mc" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:4 }}>{aufgabe.aufgabe}</div>
          <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.35)", marginBottom:10 }}>Mehrere Antworten möglich – alle zutreffenden auswählen</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {(aufgabe.mcOptionen || []).map((opt, i) => {
              const aktiv = multiMcState.includes(i);
              return (
                <button key={i} onClick={() => setMultiMcState(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
                  style={{ padding:"10px 14px", border:`1.5px solid ${aktiv ? "#e8600a" : "rgba(240,236,227,0.14)"}`, borderRadius:9, background: aktiv ? "rgba(232,96,10,0.14)" : "rgba(240,236,227,0.04)", color: aktiv ? "#e8600a" : "#f0ece3", fontSize:13, textAlign:"left", cursor:"pointer", fontWeight: aktiv ? 700 : 400, display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:22, height:22, borderRadius:5, border:`2px solid ${aktiv ? "#e8600a" : "rgba(240,236,227,0.25)"}`, background: aktiv ? "#e8600a" : "transparent", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, flexShrink:0 }}>
                    {aktiv ? "✓" : ""}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          <button onClick={pruefen} disabled={multiMcState.length === 0}
            style={{ marginTop:12, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: multiMcState.length === 0 ? 0.4 : 1 }}>
            Antworten prüfen
          </button>
        </div>
      )}

      {/* ── Freitext ── */}
      {aufgabe.typ === "freitext" && feedback === null && (
        <div style={{ background:"rgba(28,20,10,0.85)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f0ece3", marginBottom:4 }}>{aufgabe.aufgabe}</div>
          <div style={{ fontSize:10.5, color:"rgba(240,236,227,0.35)", marginBottom:10 }}>
            Schreibe deine Antwort in eigenen Worten – die Musterlösung wird danach angezeigt.
          </div>
          <textarea value={freitextAntwort} onChange={e => setFreitextAntwort(e.target.value)}
            rows={aufgabe.freitext?.zeilen || 4}
            placeholder="Hier eingeben …"
            style={{ width:"100%", padding:"10px 12px", border:"1.5px solid rgba(240,236,227,0.2)", borderRadius:8, fontSize:13, boxSizing:"border-box", background:"rgba(240,236,227,0.06)", color:"#f0ece3", fontFamily:"'IBM Plex Sans',system-ui,sans-serif", outline:"none", resize:"vertical", lineHeight:1.6 }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
            <span style={{ fontSize:10, color: freitextAntwort.trim().length >= (aufgabe.freitext?.minZeichen||20) ? "#4ade80" : "rgba(240,236,227,0.3)" }}>
              {freitextAntwort.trim().length} / {aufgabe.freitext?.minZeichen || 20} Zeichen
            </span>
          </div>
          <button onClick={pruefen} disabled={freitextAntwort.trim().length < (aufgabe.freitext?.minZeichen || 20)}
            style={{ marginTop:10, width:"100%", padding:"12px", background:"#e8600a", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", opacity: freitextAntwort.trim().length < (aufgabe.freitext?.minZeichen||20) ? 0.4 : 1 }}>
            Antwort abgeben &amp; Musterlösung zeigen
          </button>
        </div>
      )}

      {/* ── Feedback ── */}
      {feedback !== null && (() => {
        // Für Ketten-Aufgaben: Daten des aktuellen Schritts
        const isKette = aufgabe.typ === "kette";
        const ks = isKette ? aufgabe.kette[ketteSchritt] : null;
        const istLetzterKetteSchritt = isKette && ketteSchritt === aufgabe.kette.length - 1;
        const erklaerungText = isKette ? (ks?.erklaerung || "") : aufgabe.erklaerung;

        // T-Konto anzeigen? Nur bei richtigem Buchungssatz
        const stdBuchungRichtig = feedback === "richtig" && !aufgabe.typ && (aufgabe.soll?.length||0) > 0 && (aufgabe.betrag||0) > 0;
        const ketteBuchungRichtig = feedback === "richtig" && isKette && ks?.typ === "buchung";

        return (
          <div style={{ background:"rgba(28,20,10,0.85)", border:`1.5px solid ${feedback==="richtig" ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`, borderRadius:12, padding:"14px 16px" }}>
            {/* Titel */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, fontWeight:800, fontSize:14, color: feedback === "richtig" ? "#4ade80" : "#f87171" }}>
              {aufgabe.typ === "freitext"
                ? <><CheckSquare size={16} strokeWidth={1.5}/>Abgegeben! +{verlauf[verlauf.length-1]?.gewPunkte} Punkte</>
                : feedback === "richtig"
                ? <><CheckSquare size={16} strokeWidth={1.5}/>Richtig!{isKette ? ` (Schritt ${ketteSchritt+1})` : ` +${verlauf[verlauf.length-1]?.gewPunkte} Punkte`}</>
                : <><XCircle size={16} strokeWidth={1.5}/>Leider falsch{isKette ? ` (Schritt ${ketteSchritt+1})` : ""}</>}
            </div>
            {aufgabe.typ === "freitext" && (
              <div style={{ fontSize:11, color:"rgba(240,236,227,0.4)", marginBottom:8, fontStyle:"italic" }}>
                Vergleiche deine Antwort mit der Musterlösung und bewerte dich selbst.
              </div>
            )}
            {/* Lösung */}
            <div style={{ fontSize:12, color:"rgba(240,236,227,0.75)", marginBottom:8, padding:"8px 10px", background:"rgba(240,236,227,0.05)", borderRadius:8 }}>
              <strong style={{color:"#f0ece3"}}>Lösung: </strong>
              {isKette
                ? ks?.typ === "mc"        ? <>{String.fromCharCode(65+ks.mcKorrekt)}. {ks.mcOptionen[ks.mcKorrekt]}</>
                : ks?.typ === "kalkulation"? <span style={{fontFamily:"'Fira Code',monospace"}}>{ks.kalkulation.richtigerWert.toLocaleString("de-DE",{minimumFractionDigits:2})} {ks.kalkulation.einheit}</span>
                : ks?.typ === "buchung"    ? <span style={{fontFamily:"'Fira Code',monospace"}}>{ks.soll.map(s=>s.kuerzel).join("+")} an {ks.haben.map(h=>h.kuerzel).join("+")} ({(ks.betrag||0).toLocaleString("de-DE",{minimumFractionDigits:2})} €)</span>
                : null
                : aufgabe.typ === "mc"
                ? <>{String.fromCharCode(65 + aufgabe.mcKorrekt)}. {aufgabe.mcOptionen[aufgabe.mcKorrekt]}</>
                : aufgabe.typ === "multi_mc"
                ? <>{(aufgabe.multiKorrekt || []).map(i => String.fromCharCode(65+i)+". "+aufgabe.mcOptionen[i]).join(" | ")}</>
                : aufgabe.typ === "kalkulation"
                ? <span style={{ fontFamily:"'Fira Code',monospace" }}>{aufgabe.kalkulation.richtigerWert.toLocaleString("de-DE",{minimumFractionDigits:2, maximumFractionDigits:2})} {aufgabe.kalkulation.einheit}</span>
                : aufgabe.typ === "lueckentext"
                ? <span style={{ fontFamily:"'Fira Code',monospace", wordBreak:"break-word" }}>
                    {(aufgabe.lueckentext?.template || "").replace(/\[L(\d+)\]/g, (_, id) => {
                      const l = (aufgabe.lueckentext.luecken || []).find(l => l.id === parseInt(id));
                      return `[${l?.korrekt || "?"}]`;
                    })}
                  </span>
                : aufgabe.typ === "zuordnung"
                ? <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:4 }}>
                    {(aufgabe.zuordnung?.items || []).map(item => {
                      const kat = (aufgabe.zuordnung.kategorien || []).find(k => k.id === item.korrektKat);
                      return (
                        <span key={item.id} style={{ fontSize:11, background:`rgba(${kat?.rgb || "240,236,227"},0.12)`, color: kat?.color || "#f0ece3", border:`1px solid rgba(${kat?.rgb || "240,236,227"},0.25)`, padding:"2px 8px", borderRadius:5 }}>
                          {item.id} → {kat?.label || item.korrektKat}
                        </span>
                      );
                    })}
                  </div>
                : aufgabe.typ === "freitext"
                ? <div style={{ fontSize:12, color:"rgba(240,236,227,0.85)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{aufgabe.freitext?.loesung}</div>
                : <>{aufgabe.soll.map(s=>s.kuerzel).join(" + ")} an {aufgabe.haben.map(h=>h.kuerzel).join(" + ")}{" "}
                    ({aufgabe.betrag.toLocaleString("de-DE",{minimumFractionDigits:2, maximumFractionDigits:2})} €)</>
              }
            </div>

            {/* Live T-Konto (Prio 2) */}
            {stdBuchungRichtig && (
              <LiveTKonto sollKuerzel={aufgabe.soll[0].kuerzel} habenKuerzel={aufgabe.haben[0].kuerzel} betrag={aufgabe.betrag}/>
            )}
            {ketteBuchungRichtig && (
              <LiveTKonto sollKuerzel={ks.soll[0].kuerzel} habenKuerzel={ks.haben[0].kuerzel} betrag={ks.betrag||0}/>
            )}

            <div style={{ fontSize:12, color:"rgba(240,236,227,0.5)", lineHeight:1.6, marginBottom:10, marginTop:10 }}>{erklaerungText}</div>
            <button onClick={() => {
              if (isKette && !istLetzterKetteSchritt) {
                const nextKs = aufgabe.kette[ketteSchritt + 1];
                const nxtS = (nextKs?.soll||[]).length || 1;
                const nxtH = (nextKs?.haben||[]).length || 1;
                setKetteSchritt(s => s + 1);
                setFeedback(null);
                setTheorieAntwort(null);
                setKalkAntwort("");
                setBuchAntwort({ soll: Array(nxtS).fill(""), haben: Array(nxtH).fill(""), betragSoll: Array(nxtS).fill(""), betragHaben: Array(nxtH).fill("") });
              } else {
                weiter();
              }
            }}
              style={{ width:"100%", padding:"11px", background:"rgba(240,236,227,0.08)", color:"#f0ece3", border:"1px solid rgba(240,236,227,0.16)", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              {isKette && !istLetzterKetteSchritt
                ? `Schritt ${ketteSchritt+2} / ${aufgabe.kette.length} →`
                : aufgabeIdx + 1 >= aufgabenListe.length ? "Abschluss →" : "Weiter →"}
            </button>
          </div>
        );
      })()}
    </div>
  );
}
