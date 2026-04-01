// ══════════════════════════════════════════════════════════════════════════════
// Quiz-Generator – Pure Functions (kein React-State)
// Extrahiert aus BuchungsWerk.jsx – Phase A4 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import { KONTEN, getKonto } from "../data/kontenplan.js";
import { API_URL } from "../api.js";

// ══════════════════════════════════════════════════════════════════════════════
// H5P / INTERAKTIVES QUIZ — Generator + Modal  (v3 – ISB-konform)
// ══════════════════════════════════════════════════════════════════════════════

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
export function shuffleArr(arr) { return [...arr].sort(() => Math.random() - 0.5); }
export function fmtBtr(b) {
  if (typeof b !== "number") return String(b);
  return b.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
export function fmtNum(b) {
  if (typeof b !== "number") return String(b);
  return b.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function pick3Distractors(richtigeNr, pool) {
  const same = pool.filter(k => k.nr !== richtigeNr && k.nr[0] === richtigeNr[0]);
  const rest = pool.filter(k => k.nr !== richtigeNr && k.nr[0] !== richtigeNr[0]);
  return [...same, ...rest].sort(() => Math.random() - 0.5).slice(0, 3);
}

// ── Sinnvolle Fragetyp-Vorauswahl ─────────────────────────────────────────────
export function bestimmeFragetyp(a) {
  if (a.taskTyp === "rechnung" && a.schema?.length) return "drag_kalk";
  if (a.taskTyp === "theorie") return "single_choice";
  if (a.taskTyp === "komplex") return "drag_konten";
  // Buchungssatz → immer drag_konten (interaktiver Kontenplan)
  return "drag_konten";
}

// ── Beleg-Serialisierung ───────────────────────────────────────────────────────
// Extrahiert relevante Daten aus dem Beleg-Objekt für das Quiz-HTML
export function serialisiereBeleg(beleg) {
  if (!beleg) return null;
  // E-Mail
  if (beleg.typ === "email" || beleg.von) {
    return {
      typ: "email",
      von: beleg.von,
      vonName: beleg.vonName,
      an: beleg.an,
      betreff: beleg.betreff,
      datum: beleg.datum,
      uhrzeit: beleg.uhrzeit,
      text: beleg.text,
    };
  }
  // Eingangsrechnung / Ausgangsrechnung
  if (beleg.positionen) {
    return {
      typ: "rechnung",
      positionen: beleg.positionen.map(p => ({
        beschr: p.beschr, menge: p.menge, einheit: p.einheit,
        ep: p.ep, netto: p.netto,
      })),
      netto: beleg.netto,
      ustPct: beleg.ustPct,
      ustBetrag: beleg.ustBetrag,
      brutto: beleg.brutto,
      skonto: beleg.skonto ?? 0,
    };
  }
  // Kontoauszug
  if (beleg.buchungen) {
    return {
      typ: "kontoauszug",
      buchungen: beleg.buchungen.map(b => ({
        datum: b.datum, vz: b.vz, betrag: b.betrag, zweck: b.zweck,
      })),
    };
  }
  // Überweisung
  if (beleg.empfaenger) {
    return {
      typ: "ueberweisung",
      empfaenger: beleg.empfaenger,
      betrag: beleg.betrag,
      zweck: beleg.zweck,
    };
  }
  return null;
}

// ── drag_konten: Buchungssatz per interaktivem Kontenplan ──────────────────────
// Alle Soll- UND Haben-Positionen werden als separate Slots dargestellt.
// Kein Vorschlag – Schüler wählt Konto aus dem Kontenplan.
export function macheDragKonten(a, nr) {
  const soll = a.soll || [], haben = a.haben || [];
  if (!soll.length && !haben.length) return null;

  const sollSlots = soll.map(s => {
    const k = getKonto(s.nr);
    return {
      nr: s.nr, kuerzel: k?.kuerzel ?? s.nr, betrag: s.betrag,
      antwort: `${s.nr} ${k?.kuerzel ?? s.nr}`,
      betragAntwort: fmtNum(s.betrag),
    };
  });
  const habenSlots = haben.map(h => {
    const k = getKonto(h.nr);
    return {
      nr: h.nr, kuerzel: k?.kuerzel ?? h.nr, betrag: h.betrag,
      antwort: `${h.nr} ${k?.kuerzel ?? h.nr}`,
      betragAntwort: fmtNum(h.betrag),
    };
  });

  return {
    typ: "drag_konten", nr,
    frage: `<strong>${a.aufgabe || ""}</strong>`,
    belegData: serialisiereBeleg(a.beleg),
    sollSlots,
    habenSlots,
    erklaerung: a.erklaerung || "",
  };
}

// ── fill_blanks mit Beleg ──────────────────────────────────────────────────────
export function macheFillBlanks(a, nr, schritte) {
  const quellen = schritte || [a];
  const felder = [];
  const wordspeicher = [];
  quellen.forEach((q, qi) => {
    const prefix = quellen.length > 1 ? `(${String.fromCharCode(97 + qi)}) ` : "";
    (q.soll || []).forEach((s, i) => {
      const sk = getKonto(s.nr);
      const kuerzel = sk?.kuerzel ?? s.nr;
      felder.push({ label: prefix + (i === 0 ? "Soll-Nr." : `Soll ${i+1} Nr.`), antwort: s.nr, typ: "nr", gruppe: qi });
      felder.push({ label: "Kürzel", antwort: kuerzel, typ: "kuerzel", gruppe: qi });
      wordspeicher.push(s.nr, kuerzel);
    });
    const betragStr = fmtNum(q.soll?.[0]?.betrag ?? 0);
    felder.push({ label: prefix + "Betrag (€)", antwort: betragStr, typ: "betrag", gruppe: qi });
    wordspeicher.push(betragStr);
    (q.haben || []).forEach((h, i) => {
      const hk = getKonto(h.nr);
      const kuerzel = hk?.kuerzel ?? h.nr;
      felder.push({ label: i === 0 ? "Haben-Nr." : `Haben ${i+1} Nr.`, antwort: h.nr, typ: "nr", gruppe: qi });
      felder.push({ label: "Kürzel", antwort: kuerzel, typ: "kuerzel", gruppe: qi });
      wordspeicher.push(h.nr, kuerzel);
    });
  });
  return {
    typ: "fill_blanks", nr,
    frage: `<strong>${a.aufgabe || ""}</strong>`,
    belegData: serialisiereBeleg(a.beleg),
    felder,
    wordspeicher: shuffleArr([...new Set(wordspeicher)]),
    erklaerung: a.erklaerung || "",
  };
}

export function macheSingleChoice(a, nr) {
  const soll = a.soll || [], haben = a.haben || [];
  if (!soll.length || !haben.length) return null;

  // Vollständige Antwort mit ALLEN Positionen (ISB-konform)
  const fmtPos = pos => { const k = getKonto(pos.nr); return `${pos.nr} ${k?.kuerzel ?? pos.nr} ${fmtBtr(pos.betrag)}`; };
  const richtig = soll.map(fmtPos).join(" + ") + "  an  " + haben.map(fmtPos).join(" + ");

  const distractors = [];

  // Distraktoren: strukturiert, nicht zufällig
  // 1. Soll ↔ Haben vertauscht
  distractors.push(haben.map(fmtPos).join(" + ") + "  an  " + soll.map(fmtPos).join(" + "));

  // 2. Wenn USt im Spiel: AWR bekommt Bruttobetrag, VORST fehlt (typischer Schülerfehler)
  if (soll.length >= 2) {
    const s0 = soll[0], h0 = haben[0];
    const ks0 = getKonto(s0.nr), kh0 = getKonto(h0.nr);
    distractors.push(
      `${s0.nr} ${ks0?.kuerzel ?? ""} ${fmtBtr(h0.betrag)}  an  ${h0.nr} ${kh0?.kuerzel ?? ""} ${fmtBtr(h0.betrag)}`
    );
  } else {
    // Sonst: Netto ↔ Brutto tauschen (falls belegData vorhanden)
    // Alternativ: falscher Betrag (5% daneben)
    const s0 = soll[0], h0 = haben[0];
    const ks0 = getKonto(s0.nr), kh0 = getKonto(h0.nr);
    const falschBetrag = Math.round(s0.betrag * 1.19 * 100) / 100; // Brutto statt Netto
    if (falschBetrag !== s0.betrag) {
      distractors.push(`${s0.nr} ${ks0?.kuerzel ?? ""} ${fmtBtr(falschBetrag)}  an  ${h0.nr} ${kh0?.kuerzel ?? ""} ${fmtBtr(falschBetrag)}`);
    }
  }

  // 3. Verwandtes Konto (gleiche Klasse) statt korrektem Soll-Konto
  const pool = KONTEN.filter(k => !soll.find(s => s.nr === k.nr) && !haben.find(h => h.nr === k.nr));
  const d = pick3Distractors(soll[0].nr, pool);
  if (d[0]) {
    const h0 = haben[0], kh0 = getKonto(h0.nr);
    const rest = soll.slice(1).map(fmtPos);
    const falschSoll = [`${d[0].nr} ${d[0].kuerzel} ${fmtBtr(soll[0].betrag)}`, ...rest].join(" + ");
    distractors.push(falschSoll + "  an  " + `${h0.nr} ${kh0?.kuerzel ?? ""} ${fmtBtr(h0.betrag)}`);
  }

  // 4. Falsches Haben-Konto (z.B. BK statt VE oder FO statt BK)
  if (d[1]) {
    const falschHaben = haben.map((h, i) => {
      const k = i === 0 ? d[1] : getKonto(h.nr);
      return `${k?.nr ?? h.nr} ${k?.kuerzel ?? ""} ${fmtBtr(h.betrag)}`;
    }).join(" + ");
    distractors.push(soll.map(fmtPos).join(" + ") + "  an  " + falschHaben);
  }

  return {
    typ: "single_choice", nr,
    frage: `<strong>${a.aufgabe || ""}</strong><br>Welcher Buchungssatz ist korrekt?`,
    belegData: serialisiereBeleg(a.beleg),
    antworten: shuffleArr([richtig, ...distractors.filter((d, i, arr) => d !== richtig && arr.indexOf(d) === i).slice(0, 3)]),
    richtig,
    erklaerung: a.erklaerung || "",
  };
}

export function macheTrueFalse(a, nr) {
  const s0 = (a.soll || [])[0];
  if (!s0) return null;
  const sk = getKonto(s0.nr);
  if (!sk || (sk.typ !== "aktiv" && sk.typ !== "passiv")) return null;
  const istAktiv = sk.typ === "aktiv";
  return {
    typ: "true_false", nr,
    frage: `Ist <strong>${s0.nr} ${sk.kuerzel}</strong> (${sk.name}) ein <em>Aktivkonto</em>?`,
    antwort: istAktiv,
    begruendung: istAktiv
      ? `Ja – ${sk.kuerzel} ist ein Aktivkonto (Klasse ${sk.klasse}).`
      : `Nein – ${sk.kuerzel} ist ein Passivkonto (Klasse ${sk.klasse}).`,
  };
}

export function macheDragKalk(a, nr) {
  if (!a.schema?.length) return null;
  const tokens = shuffleArr(
    a.schema.filter(r => r.wert != null).map(r => ({
      text: fmtNum(r.wert) + " " + (r.einheit || "€"),
    }))
  );
  return {
    typ: "drag_kalk", nr,
    frage: `<strong>${a.aufgabe || ""}</strong><br>Ordne die Beträge dem Kalkulationsschema zu:`,
    belegData: serialisiereBeleg(a.beleg),
    zeilen: a.schema.map(r => ({
      label: r.label,
      antwort: r.wert != null ? fmtNum(r.wert) + " " + (r.einheit || "€") : null,
    })),
    tokens,
    erklaerung: a.erklaerung || "",
  };
}

export function generiereMatchingFragen(anzahl) {
  const pool = KONTEN.filter(k => k.kuerzel && k.typ !== "abschluss").sort(() => Math.random() - 0.5);
  const fragen = [];
  for (let i = 0; i < anzahl && (i + 1) * 4 <= pool.length; i++) {
    const gruppe = pool.slice(i * 4, i * 4 + 4);
    fragen.push({
      typ: "matching", nr: `M${i + 1}`,
      frage: "Ordne die Kontonummern den richtigen Kürzeln zu:",
      paare: gruppe.map(k => ({ links: k.nr, rechts: k.kuerzel, name: k.name })),
    });
  }
  return fragen;
}

export function generiereAlleQuizFragen(aufgaben, fragenTypen) {
  const fragen = [];
  aufgaben.forEach((a, aufgIdx) => {
    const typEintrag = (fragenTypen || []).find(ft => ft.id === a.id);
    const typ = typEintrag?.typ ?? bestimmeFragetyp(a);
    const nr = String(aufgIdx + 1);

    if (a.taskTyp === "komplex" && a.schritte?.length) {
      if (typ === "fill_blanks") {
        const f = macheFillBlanks(a, nr, a.schritte);
        if (f) fragen.push(f);
      } else {
        "abcdefghij".split("").forEach((l, si) => {
          if (!a.schritte[si]) return;
          const stNr = `${nr}${l}`;
          let f = null;
          if (typ === "drag_konten") f = macheDragKonten(a.schritte[si], stNr);
          if (typ === "single_choice") f = macheSingleChoice(a.schritte[si], stNr);
          if (typ === "true_false") f = macheTrueFalse(a.schritte[si], stNr);
          if (f) fragen.push(f);
        });
      }
    } else if (typ === "drag_kalk" || a.taskTyp === "rechnung") {
      const f = macheDragKalk(a, nr); if (f) fragen.push(f);
    } else {
      let f = null;
      // fill_blanks nur für Theorie-Lückentext; bei Buchungssatz-Aufgaben → drag_konten
      const effTyp = (typ === "fill_blanks" && a.taskTyp !== "theorie") ? "drag_konten" : typ;
      if (effTyp === "drag_konten")   f = macheDragKonten(a, nr);
      if (effTyp === "fill_blanks")   f = macheFillBlanks(a, nr, null);
      if (effTyp === "single_choice") f = macheSingleChoice(a, nr);
      if (typ === "true_false")    f = macheTrueFalse(a, nr);
      if (f) fragen.push(f);
      // True/False als Bonus-Frage
      if (typ === "drag_konten" || typ === "single_choice") {
        const bonus = macheTrueFalse(a, nr + "★");
        if (bonus) fragen.push(bonus);
      }
    }
  });
  fragen.push(...generiereMatchingFragen(2));
  return fragen;
}

// ── Quiz-HTML-Generator ───────────────────────────────────────────────────────
export function generateQuizHTML({ aufgaben, config, firma, fragenTypen, apiUrl = "", sessionId = null }) {
  const fragen = generiereAlleQuizFragen(aufgaben, fragenTypen);
  const fragenJSON = JSON.stringify(fragen);
  const kontenJSON = JSON.stringify(
    KONTEN.filter(k => k.typ !== "abschluss").map(k => ({
      nr: k.nr, kuerzel: k.kuerzel, name: k.name, klasse: k.klasse, typ: k.typ
    }))
  );
  const firmaJSON = JSON.stringify({
    name: firma.name || "",
    icon: firma.icon || "🏢",
    ort: firma.ort || "",
    plz: firma.plz || "",
    branche: firma.branche || "",
    rechtsform: firma.rechtsform || "",
    inhaber: firma.inhaber || "",
    slogan: firma.slogan || "",
    rohstoffe: firma.rohstoffe || [],
    hilfsstoffe: firma.hilfsstoffe || [],
    fremdbauteile: firma.fremdbauteile || [],
    betriebsstoffe: firma.betriebsstoffe || [],
  });
  const datum = new Date(config.datum + "T00:00:00").toLocaleDateString("de-DE",
    { day: "2-digit", month: "long", year: "numeric" });
  const klLabel = `Klasse ${config.klasse}`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>BuchungsWerk Quiz \xb7 ${config.typ} \xb7 ${klLabel}</title>
<style>
:root{--a:#d97706;--dk:#0f172a;--g:#16a34a;--r:#dc2626;--bg:#f8fafc;--soll:#1d4ed8;--haben:#dc2626}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,Arial,sans-serif;background:var(--bg);color:var(--dk);min-height:100vh}
#app{max-width:660px;margin:0 auto;padding:12px}
.hdr{background:var(--dk);border-radius:14px;padding:13px 18px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:17px;font-weight:900;color:#fff}.logo span{color:var(--a)}
.meta{font-size:10px;color:#94a3b8;text-align:right;line-height:1.5}
.pb{background:#e2e8f0;border-radius:8px;height:7px;margin-bottom:13px;overflow:hidden}
.pf{height:100%;background:var(--a);border-radius:8px;transition:width .3s}
.card{background:#fff;border-radius:14px;padding:16px 18px;box-shadow:0 2px 12px rgba(0,0,0,.08);margin-bottom:12px;text-align:left}
.fnr{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px}
.ftxt{font-size:15px;line-height:1.6;color:var(--dk);margin-bottom:12px}
/* Beleg */
.beleg{background:#fafafa;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:13px}
.beleg-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px}
.beleg-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6px}
.beleg-table th{text-align:left;color:#94a3b8;font-weight:600;padding:2px 6px 4px 0;border-bottom:1px solid #e2e8f0}
.beleg-table td{padding:3px 6px 3px 0;vertical-align:top}
.beleg-table td.r{text-align:right;font-family:'Courier New',monospace;font-weight:600}
.beleg-summe{display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:5px;font-size:12px}
.beleg-summe.total{font-weight:800;font-size:13px;border-top:2px solid var(--dk);margin-top:3px;padding-top:6px}
.beleg-zeile{display:flex;justify-content:space-between;font-size:12px;padding:2px 0}
/* Buchungssatz-Slots */
.bs-container{margin-bottom:14px}
.bs-header{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:6px}
.bs-lbl{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;text-align:center}
.bs-lbl.soll{color:var(--soll)}.bs-lbl.haben{color:var(--haben)}
.bs-an{font-size:11px;font-weight:600;color:#94a3b8;text-align:center}
.bs-slots{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:start}
.bs-col{display:flex;flex-direction:column;gap:6px}
.bs-slot{border:2px dashed #cbd5e1;border-radius:10px;padding:10px 12px;min-height:56px;background:#f8fafc;transition:all .15s;cursor:pointer;position:relative}
.bs-slot:hover:not(.ok):not(.nok){border-color:var(--a);background:#fffbeb}
.bs-slot.drag-over{border-color:var(--a);background:#fffbeb;border-style:solid}
.bs-slot.filled{border-style:solid;border-color:#475569}
.bs-slot.ok{border-color:var(--g)!important;background:#f0fdf4!important;border-style:solid!important}
.bs-slot.nok{border-color:var(--r)!important;background:#fef2f2!important;border-style:solid!important}
.bs-slot.soll-slot{border-color:#bfdbfe}
.bs-slot.haben-slot{border-color:#fecaca}
.bs-slot-nr{font-family:'Courier New',monospace;font-weight:800;font-size:14px;color:var(--dk)}
.bs-slot-kuerzel{font-family:'Courier New',monospace;font-weight:600;font-size:12px;color:#475569}
.bs-slot-betrag{font-family:'Courier New',monospace;font-weight:800;font-size:13px;color:#374151;margin-top:2px}
.bs-slot-leer{font-size:12px;color:#94a3b8;line-height:1.4}
.bs-slot-hint{font-size:9px;color:#94a3b8;margin-top:2px}
.bs-slot-clear{position:absolute;top:4px;right:6px;font-size:14px;color:#94a3b8;cursor:pointer;display:none}
.bs-slot.filled .bs-slot-clear{display:block}
.bs-an-center{display:flex;align-items:center;justify-content:center;min-height:56px}
.bs-an-text{font-size:18px;font-weight:700;color:#94a3b8}
/* Kontenplan */
.kplan-wrap{margin-top:14px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff}
.kplan-header{padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
.kplan-title{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
.kplan-search{border:1px solid #e2e8f0;border-radius:7px;padding:5px 10px;font-size:13px;width:180px;outline:none;font-family:inherit}
.kplan-search:focus{border-color:var(--a)}
.kplan-body{max-height:260px;overflow-y:auto;-webkit-overflow-scrolling:touch}
.kplan-klasse{border-bottom:1px solid #f1f5f9}
.kplan-klasse-hdr{padding:6px 14px;background:#f8fafc;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;cursor:pointer;display:flex;justify-content:space-between;user-select:none}
.kplan-klasse-hdr:hover{background:#f1f5f9}
.kplan-konto{padding:8px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:background .12s;border-bottom:1px solid #f8fafc}
.kplan-konto:hover{background:#fffbeb}
.kplan-konto.selected{background:#fffbeb;border-left:3px solid var(--a)}
.kplan-konto-nr{font-family:'Courier New',monospace;font-weight:700;font-size:13px;color:var(--dk);min-width:42px}
.kplan-konto-kuerzel{font-family:'Courier New',monospace;font-weight:700;font-size:12px;color:var(--a);min-width:55px}
.kplan-konto-name{font-size:12px;color:#374151;flex:1}
.kplan-konto-typ{font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;text-transform:uppercase}
.typ-aktiv{background:#dbeafe;color:#1d4ed8}
.typ-passiv{background:#fce7f3;color:#9d174d}
.typ-aufwand{background:#fef3c7;color:#92400e}
.typ-ertrag{background:#d1fae5;color:#065f46}
.kplan-no-results{padding:20px;text-align:center;color:#94a3b8;font-size:13px}
.kplan-selected-info{padding:8px 14px;background:#fffbeb;border-top:1px solid #fde68a;font-size:12px;color:#92400e;font-weight:600;display:none}
.kplan-selected-info.visible{display:block}
/* Gemeinsame Buttons */
.btn{display:block;width:100%;padding:12px 14px;border-radius:10px;border:2px solid #e2e8f0;background:#fff;font-size:14px;font-weight:600;cursor:pointer;text-align:left;margin-bottom:8px;transition:all .15s;color:var(--dk);font-family:inherit}
.btn:hover:not(:disabled){border-color:var(--a);background:#fffbeb}
.bpri{background:var(--dk);color:var(--a);border:none;border-radius:10px;padding:12px 18px;font-size:15px;font-weight:800;cursor:pointer;width:100%;font-family:inherit;margin-top:10px}
.bpri:disabled{opacity:.4;cursor:not-allowed}
.ok{border-color:var(--g)!important;background:#f0fdf4!important;color:var(--g)!important}
.nok{border-color:var(--r)!important;background:#fef2f2!important;color:var(--r)!important}
.fb{margin-top:12px;padding:10px 14px;border-radius:10px;font-size:13px;line-height:1.6}
.fb.ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}
.fb.nok{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
/* Fill in Blanks */
.wordspeicher{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;padding:10px 12px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0}
.ws-chip{background:var(--dk);color:var(--a);border-radius:7px;padding:5px 11px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Courier New',monospace;border:none;transition:opacity .15s}
.ws-chip.used{opacity:.35;text-decoration:line-through}
.blank-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.blank-lbl{font-size:11px;color:#64748b;min-width:90px;flex-shrink:0}
.blank-inp{border:2px solid #e2e8f0;border-radius:8px;padding:7px 10px;font-size:14px;font-family:'Courier New',monospace;font-weight:700;width:140px;outline:none;transition:border-color .15s}
.blank-inp:focus{border-color:var(--a)}
.blank-inp.ok{border-color:var(--g);background:#f0fdf4;color:var(--g)}
.blank-inp.nok{border-color:var(--r);background:#fef2f2;color:var(--r)}
.gruppe-trenner{width:100%;border:none;border-top:1px dashed #e2e8f0;margin:8px 0}
/* True/False */
.tfg{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tfb{padding:20px;border-radius:12px;border:2px solid #e2e8f0;background:#fff;font-size:22px;font-weight:800;cursor:pointer;transition:all .15s;font-family:inherit}
.tfb:hover{border-color:var(--a);background:#fffbeb}
/* Matching */
.mg{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.mcell{border:2px solid #e2e8f0;border-radius:9px;padding:9px 12px;font-family:'Courier New',monospace;font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;background:#fff;text-align:center}
.mcell:hover:not(.ok):not(.nok){border-color:var(--a);background:#fffbeb}
.mcell.sel{border-color:var(--a);background:#fffbeb}
/* Firma-Panel */
.fp{background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.07);margin-bottom:12px;overflow:hidden;border:1px solid #e2e8f0}
.fp-bar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;user-select:none;gap:10px}
.fp-bar:hover{background:#fafafa}
.fp-left{display:flex;align-items:center;gap:9px;flex:1;min-width:0}
.fp-icon{font-size:18px;flex-shrink:0}
.fp-name{font-size:13px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fp-sub{font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fp-toggle{font-size:11px;font-weight:700;color:#94a3b8;flex-shrink:0;padding:3px 8px;border-radius:6px;border:1px solid #e2e8f0;background:#f8fafc;white-space:nowrap}
.fp-body{padding:0 14px 12px;border-top:1px solid #f1f5f9}
.fp-wt-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}
.fp-wt-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px}
.fp-wt-lbl{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
.fp-wt-val{font-size:11px;font-weight:600;color:#0f172a;line-height:1.4}
.fp-isb{background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:8px 11px;font-size:11px;color:#92400e;margin-top:9px;line-height:1.5}
.kalk-drag-area{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;min-height:46px}
.token{background:var(--dk);color:var(--a);border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;cursor:grab;user-select:none;font-family:'Courier New',monospace;transition:opacity .15s;touch-action:none}
.token.used{opacity:.3;cursor:default;pointer-events:none}
.token.dragging{opacity:.5;transform:scale(1.05)}
.kalk-row{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;padding:6px 12px}
.kalk-lbl{font-size:13px;color:#374151;flex:1}
.kalk-dz{border:2px dashed #cbd5e1;border-radius:8px;padding:5px 9px;min-width:130px;display:flex;align-items:center;transition:all .15s;background:#f8fafc}
.kalk-dz.drag-over{border-color:var(--a);background:#fffbeb;border-style:solid}
.kalk-dz.ok{border-color:var(--g);background:#f0fdf4;border-style:solid}
.kalk-dz.nok{border-color:var(--r);background:#fef2f2;border-style:solid}
.dz-val{font-family:'Courier New',monospace;font-weight:700;font-size:13px;color:var(--dk)}
/* Score */
.sc{text-align:center;padding:24px 16px}
.sc-pct{font-size:64px;font-weight:900;color:var(--a);line-height:1}
.sc-sub{font-size:14px;color:#64748b;margin:6px 0 20px}
.sc-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:16px 0}
.sc-box{background:#f8fafc;border-radius:10px;padding:13px;border:1px solid #e2e8f0}
.sc-box .n{font-size:24px;font-weight:800}.sc-box .l{font-size:10px;color:#64748b;margin-top:2px}
.detail{border:1px solid #e2e8f0;border-radius:9px;padding:10px 13px;margin-bottom:7px;text-align:left}
.detail.ok{border-color:#bbf7d0;background:#f0fdf4}
.detail.nok{border-color:#fecaca;background:#fef2f2}
.detail-q{font-size:11px;color:#64748b;margin-bottom:3px}.detail-a{font-size:12px;font-weight:700;font-family:'Courier New',monospace}
</style>
</head>
<body>
<div id="app">
  <div class="hdr">
    <div class="logo">Buchungs<span>Werk</span></div>
    <div class="meta"><strong>${config.typ}</strong><br>${klLabel} \xb7 ${datum}<br>${firma.name || ""}</div>
  </div>
  <div class="pb"><div class="pf" id="pf" style="width:0%"></div></div>
  <div id="firma-panel"></div>
  <div id="qc"></div>
</div>
<script>
const F=${fragenJSON};
const KONTEN=${kontenJSON};
const FIRMA=${firmaJSON};
const API_URL=${JSON.stringify(apiUrl)};
const SESSION_ID=${JSON.stringify(sessionId)};
// Kontenplan nach Klassen gruppieren
const KPLAN={};
KONTEN.forEach(k=>{if(!KPLAN[k.klasse])KPLAN[k.klasse]=[];KPLAN[k.klasse].push(k);});

// ── Collapsible Firmen-Panel ──────────────────────────────────────────────────
(function baueFirmaPanel(){
  const wt=[["Rohstoffe",FIRMA.rohstoffe],["Hilfsstoffe",FIRMA.hilfsstoffe],["Fremdbauteile",FIRMA.fremdbauteile],["Betriebsstoffe",FIRMA.betriebsstoffe]].filter(([,l])=>l&&l.length);
  const panel=document.getElementById("firma-panel");
  if(!panel||(!wt.length&&!FIRMA.name))return;
  panel.className="fp";
  let open=false;
  // Bar
  const bar=document.createElement("div");bar.className="fp-bar";
  const left=document.createElement("div");left.className="fp-left";
  const icon=document.createElement("div");icon.className="fp-icon";icon.textContent=FIRMA.icon||"\uD83C\uDFE2";
  const txt=document.createElement("div");txt.style.cssText="min-width:0";
  const nm=document.createElement("div");nm.className="fp-name";nm.textContent=FIRMA.name;
  const sub=document.createElement("div");sub.className="fp-sub";
  sub.textContent=[FIRMA.rechtsform,FIRMA.branche,FIRMA.ort].filter(Boolean).join(" \xb7 ");
  txt.appendChild(nm);txt.appendChild(sub);
  left.appendChild(icon);left.appendChild(txt);
  const tog=document.createElement("div");tog.className="fp-toggle";tog.textContent="\u25be Werkstoffe";
  bar.appendChild(left);bar.appendChild(tog);
  // Body
  const body=document.createElement("div");body.className="fp-body";body.style.display="none";
  if(wt.length){
    const grid=document.createElement("div");grid.className="fp-wt-grid";
    wt.forEach(([lbl,list])=>{
      const box=document.createElement("div");box.className="fp-wt-box";
      const bl=document.createElement("div");bl.className="fp-wt-lbl";bl.textContent=lbl;
      const bv=document.createElement("div");bv.className="fp-wt-val";bv.textContent=list.join(", ");
      box.appendChild(bl);box.appendChild(bv);grid.appendChild(box);
    });
    body.appendChild(grid);
  }
  const isb=document.createElement("div");isb.className="fp-isb";
  isb.innerHTML="\uD83D\uDCCB <strong>Formale Vorgaben:</strong> Kontonummer, Kontoabk\xfcrzung und Betrag angeben. Auf zwei Nachkommastellen runden. USt 19\xa0%.";
  body.appendChild(isb);
  bar.onclick=()=>{
    open=!open;
    body.style.display=open?"block":"none";
    tog.textContent=(open?"\u25b4":"\u25be")+" Werkstoffe";
  };
  panel.appendChild(bar);panel.appendChild(body);
})();

let idx=0,pts=0,maxP=0,res=[],dragSel=null,matchSel=null,focusInp=null;
let kplanSel=null;
let introGezeigt=false;

// ── Helpers ───────────────────────────────────────────────────────────────────
function mk(tag,cls){const e=document.createElement(tag);if(cls)e.className=cls;return e;}
function fmtN(n){return typeof n==="number"?n.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" \u20ac":String(n);}
function next(g,m){pts+=g;maxP+=m;res.push({f:F[idx],g,m});idx++;setTimeout(rf,600);}
function setProgress(){document.getElementById("pf").style.width=(introGezeigt?Math.round(idx/F.length*100):0)+"%";}
function feed(card,f,ok){
  const d=mk("div","fb "+(ok?"ok":"nok"));
  d.textContent=(ok?"\u2713 Richtig!":"\u2717 Leider falsch.")+
    (f.erklaerung?" "+f.erklaerung.slice(0,140):"")+(f.begruendung?" "+f.begruendung:"");
  card.appendChild(d);
}

function zeigeWeiter(card,g,m){
  const btn=mk("button","bpri");
  btn.style.cssText="margin-top:10px;background:#334155;color:#fff";
  btn.textContent="Weiter \u2192";
  btn.onclick=()=>next(g,m);
  card.appendChild(btn);
}

// ── Unternehmens-Intro ────────────────────────────────────────────────────────
function showIntro(){
  introGezeigt=true;
  const c=document.getElementById("qc");c.innerHTML="";
  const card=mk("div","card");card.style.textAlign="left";
  // Header
  const hd=mk("div");hd.style.cssText="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:14px;color:#fff";
  const nm=mk("div");nm.style.cssText="font-size:18px;font-weight:900;margin-bottom:2px";nm.textContent=FIRMA.icon+" "+FIRMA.name;
  const sub=mk("div");sub.style.cssText="font-size:11px;color:#94a3b8";sub.textContent=[FIRMA.rechtsform,FIRMA.plz+" "+FIRMA.ort,FIRMA.branche].filter(Boolean).join(" · ");
  hd.appendChild(nm);hd.appendChild(sub);
  if(FIRMA.slogan){const sl=mk("div");sl.style.cssText="font-size:12px;color:#e8600a;margin-top:5px;font-style:italic";sl.textContent="\u201e"+FIRMA.slogan+"\u201c";hd.appendChild(sl);}
  card.appendChild(hd);
  // Werkstoffe
  const wt=[["Rohstoffe",FIRMA.rohstoffe],["Hilfsstoffe",FIRMA.hilfsstoffe],["Fremdbauteile",FIRMA.fremdbauteile],["Betriebsstoffe",FIRMA.betriebsstoffe]].filter(([,l])=>l&&l.length);
  if(wt.length){
    const wtTitle=mk("div");wtTitle.style.cssText="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px";
    wtTitle.textContent="Verwendete Werkstoffe";card.appendChild(wtTitle);
    const grid=mk("div");grid.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px";
    wt.forEach(([lbl,list])=>{
      const box=mk("div");box.style.cssText="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px";
      const bt=mk("div");bt.style.cssText="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px";bt.textContent=lbl;
      const items=mk("div");items.style.cssText="font-size:12px;font-weight:600;color:#0f172a;line-height:1.5";items.textContent=list.join(", ");
      box.appendChild(bt);box.appendChild(items);grid.appendChild(box);
    });
    card.appendChild(grid);
  }
  // ISB-Hinweis
  const info=mk("div");info.style.cssText="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 13px;font-size:12px;color:#92400e;margin-bottom:14px;line-height:1.6";
  info.innerHTML="\uD83D\uDCCB <strong>Formale Vorgaben:</strong> Bei Buchungss\xe4tzen sind <strong>Kontonummer, Kontoabk\xfcrzung und Betrag</strong> anzugeben. Ergebnisse auf zwei Nachkommastellen runden. USt-Satz 19\xa0% sofern nicht anders angegeben.";
  card.appendChild(info);
  // Inhaberinfo
  if(FIRMA.inhaber){const inh=mk("div");inh.style.cssText="font-size:11px;color:#64748b;margin-bottom:12px";inh.textContent="Inhaber/in: "+FIRMA.inhaber;card.appendChild(inh);}
  // Weiter-Button
  const btn=mk("button","bpri");btn.textContent="Los geht\u2019s \u2192";
  btn.onclick=()=>rf();
  card.appendChild(btn);
  c.appendChild(card);
}

// ── Beleg rendern ─────────────────────────────────────────────────────────────
function renderBeleg(card, belegData) {
  if(!belegData) return;
  const wrap=mk("div","beleg");
  const title=mk("div","beleg-title");

  if(belegData.typ==="rechnung"){
    title.textContent="Eingangsrechnung / Ausgangsrechnung";
    wrap.appendChild(title);
    const tbl=mk("table","beleg-table");
    const hdr=mk("tr");
    ["Pos.","Bezeichnung","Menge","EP (netto)","Netto"].forEach((h,i)=>{
      const th=mk("th");th.textContent=h;if(i>=2)th.style.textAlign="right";hdr.appendChild(th);
    });
    tbl.appendChild(hdr);
    belegData.positionen.forEach(p=>{
      if (p.isRabatt) return; // Sofortrabatt-Zeile nicht in BelegEditor anzeigen
      const tr=mk("tr");
      const fmtN = v => v != null ? v.toLocaleString("de-DE",{minimumFractionDigits:2})+" \u20ac" : "–";
      const cells=[p.pos||"1",p.beschr,(p.menge != null ? p.menge+" "+p.einheit : ""),
        fmtN(p.ep),
        fmtN(p.netto)
      ];
      cells.forEach((c,i)=>{const td=mk("td");td.textContent=c;if(i>=2)td.style.textAlign="right";tr.appendChild(td);});
      tbl.appendChild(tr);
    });
    wrap.appendChild(tbl);
    const netto=mk("div","beleg-summe");
    netto.innerHTML="<span>Nettobetrag</span><span style='font-family:monospace;font-weight:600'>"+
      belegData.netto.toLocaleString("de-DE",{minimumFractionDigits:2})+" \u20ac</span>";
    wrap.appendChild(netto);
    const ust=mk("div","beleg-summe");
    ust.innerHTML="<span>zzgl. "+belegData.ustPct+"% USt</span><span style='font-family:monospace;font-weight:600'>"+
      belegData.ustBetrag.toLocaleString("de-DE",{minimumFractionDigits:2})+" \u20ac</span>";
    wrap.appendChild(ust);
    const brutto=mk("div","beleg-summe total");
    brutto.innerHTML="<span>Bruttobetrag</span><span style='font-family:monospace;font-weight:800'>"+
      belegData.brutto.toLocaleString("de-DE",{minimumFractionDigits:2})+" \u20ac</span>";
    wrap.appendChild(brutto);
    if(belegData.skonto){
      const sk=mk("div","beleg-zeile");
      sk.style.cssText="color:#64748b;font-size:11px;margin-top:4px";
      sk.textContent="Skontovereinbarung: "+belegData.skonto+"% bei fristgerechter Zahlung";
      wrap.appendChild(sk);
    }
  } else if(belegData.typ==="kontoauszug"){
    title.textContent="Kontoauszug";
    wrap.appendChild(title);
    (belegData.buchungen||[]).forEach(b=>{
      const z=mk("div","beleg-zeile");
      const vz=b.vz==="H"?"+":"-";
      const col=b.vz==="H"?"#16a34a":"#dc2626";
      z.innerHTML="<span style='color:#64748b;min-width:80px'>"+b.datum+"</span>"+
        "<span style='flex:1'>"+b.zweck+"</span>"+
        "<span style='font-family:monospace;font-weight:700;color:"+col+"'>"+vz+
        b.betrag.toLocaleString("de-DE",{minimumFractionDigits:2})+" \u20ac</span>";
      z.style.cssText="display:flex;gap:10px;align-items:baseline;padding:2px 0";
      wrap.appendChild(z);
    });
  } else if(belegData.typ==="ueberweisung"){
    title.textContent="Online-\xdcberweisung";
    wrap.appendChild(title);
    const z1=mk("div","beleg-zeile");z1.innerHTML="<strong>Empf\xe4nger:</strong> "+belegData.empfaenger;wrap.appendChild(z1);
    const z2=mk("div","beleg-zeile");z2.innerHTML="<strong>Betrag:</strong> <span style='font-family:monospace;font-weight:700'>"+
      belegData.betrag.toLocaleString("de-DE",{minimumFractionDigits:2})+" \u20ac</span>";wrap.appendChild(z2);
    if(belegData.zweck){const z3=mk("div","beleg-zeile");z3.innerHTML="<strong>Verwendungszweck:</strong> "+belegData.zweck;wrap.appendChild(z3);}
  } else if(belegData.typ==="email"){
    wrap.style.cssText="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px 14px;font-size:12px;font-family:Arial,sans-serif";
    const hdr=mk("div");hdr.style.cssText="background:#1e3a5f;color:#fff;border-radius:7px 7px 0 0;padding:8px 12px;margin:-12px -14px 10px;font-size:11px";
    hdr.innerHTML="\uD83D\uDCE7 <strong>E-Mail</strong>";
    wrap.insertBefore(hdr,wrap.firstChild);
    const meta=[
      ["Von",belegData.vonName?belegData.vonName+" &lt;"+belegData.von+"&gt;":belegData.von],
      ["An",belegData.an],
      ["Datum",belegData.datum+(belegData.uhrzeit?" \u00b7 "+belegData.uhrzeit:"")],
      ["Betreff","<strong>"+belegData.betreff+"</strong>"],
    ];
    meta.forEach(([lbl,val])=>{
      const z=mk("div","beleg-zeile");
      z.style.cssText="padding:2px 0;border-bottom:1px solid #e0f2fe";
      z.innerHTML="<span style='color:#64748b;min-width:55px;display:inline-block'>"+lbl+":</span> "+val;
      wrap.appendChild(z);
    });
    const body=mk("div");body.style.cssText="margin-top:10px;white-space:pre-wrap;line-height:1.6;color:#1e293b";
    body.textContent=belegData.text;
    wrap.appendChild(body);
  }
  card.appendChild(wrap);
}

// ── Interaktiver Kontenplan ───────────────────────────────────────────────────
function renderKontenplan(card, onKontoGewaehlt) {
  const wrap=mk("div","kplan-wrap");
  const hdr=mk("div","kplan-header");
  const title=mk("div","kplan-title");title.textContent="Kontenplan \u2013 Konto ausw\xe4hlen & zuordnen";
  const search=mk("input","kplan-search");
  search.type="text";search.placeholder="Nr. oder K\xfcrzel suchen\u2026";search.setAttribute("autocomplete","off");
  hdr.appendChild(title);hdr.appendChild(search);
  wrap.appendChild(hdr);

  const info=mk("div","kplan-selected-info");
  info.textContent="Kein Konto ausgew\xe4hlt";
  wrap.appendChild(info);

  const body=mk("div","kplan-body");
  const klassenWrapper={};
  let alleKontoEls=[];
  let gewaehltEl=null;

  Object.keys(KPLAN).sort((a,b)=>a-b).forEach(kl=>{
    const klWrap=mk("div","kplan-klasse");
    const klHdr=mk("div","kplan-klasse-hdr");
    const klLabel=["Sachanlagen","Finanzanlagen","Umlaufverm\xf6gen","Eigenkapital","Verbindlichkeiten","Erl\xf6se","Aufwendungen","Steuern & Zinsen","Abschlusskonten"][parseInt(kl)]||"";
    klHdr.innerHTML="<span>Klasse "+kl+" \u2013 "+klLabel+"</span><span class='kl-arrow'>\u25be</span>";
    let collapsed=false;
    const klBody=mk("div");
    klHdr.onclick=()=>{collapsed=!collapsed;klBody.style.display=collapsed?"none":"";klHdr.querySelector(".kl-arrow").textContent=collapsed?"\u25b8":"\u25be";};
    klWrap.appendChild(klHdr);
    klWrap.appendChild(klBody);
    KPLAN[kl].forEach(k=>{
      const row=mk("div","kplan-konto");
      const nr=mk("span","kplan-konto-nr");nr.textContent=k.nr;
      const kuerzel=mk("span","kplan-konto-kuerzel");kuerzel.textContent=k.kuerzel;
      const name=mk("span","kplan-konto-name");name.textContent=k.name;
      const typ=mk("span","kplan-konto-typ typ-"+k.typ);typ.textContent=k.typ;
      row.appendChild(nr);row.appendChild(kuerzel);row.appendChild(name);row.appendChild(typ);
      row.dataset.nr=k.nr;row.dataset.kuerzel=k.kuerzel;row.dataset.name=k.name;
      row.onclick=()=>{
        if(gewaehltEl)gewaehltEl.classList.remove("selected");
        row.classList.add("selected");gewaehltEl=row;
        kplanSel={konto:k};
        info.textContent=k.nr+" "+k.kuerzel+" \u2013 "+k.name;info.classList.add("visible");
        onKontoGewaehlt(k);
      };
      klBody.appendChild(row);
      alleKontoEls.push({el:row,k});
    });
    klassenWrapper[kl]={wrap:klWrap,body:klBody};
    body.appendChild(klWrap);
  });
  wrap.appendChild(body);
  search.addEventListener("input",()=>{
    const q=search.value.trim().toLowerCase();
    alleKontoEls.forEach(({el,k})=>{
      const match=!q||k.nr.includes(q)||k.kuerzel.toLowerCase().includes(q)||k.name.toLowerCase().includes(q);
      el.style.display=match?"":"none";
    });
    Object.values(klassenWrapper).forEach(({body:b})=>{b.style.display="";});
  });
  card.appendChild(wrap);
  return {clearSelection:()=>{if(gewaehltEl)gewaehltEl.classList.remove("selected");gewaehltEl=null;kplanSel=null;info.textContent="Kein Konto ausgew\xe4hlt";info.classList.remove("visible");}};
}

// ── Drag Konten (Buchungssatz per Kontenplan + Betrageingabe) ─────────────────
function renderDragKonten(card, f) {
  const allSlots=[...f.sollSlots.map(s=>({...s,seite:"soll"})),...f.habenSlots.map(h=>({...h,seite:"haben"}))];
  // Punkte: pro Slot 2 (Konto + Betrag)
  maxP += allSlots.length * 2;
  const slotMap={};
  let activeSlot=null;

  renderBeleg(card, f.belegData);

  const hinweis=mk("div");hinweis.style.cssText="font-size:11px;color:#64748b;margin-bottom:10px;line-height:1.5";
  hinweis.innerHTML="\u2139\ufe0f Gesucht: <strong>Kontonummer, K\xfcrzel</strong> (aus Kontenplan) <strong>und Betrag</strong> (\u20ac) f\xfcr jeden Buchungssatz-Posten.";
  card.appendChild(hinweis);

  const bsContainer=mk("div","bs-container");
  const bsHeader=mk("div","bs-header");
  const sollLbl=mk("div","bs-lbl soll");sollLbl.textContent="SOLL";
  const anLbl=mk("div","bs-an");anLbl.textContent="";
  const habenLbl=mk("div","bs-lbl haben");habenLbl.textContent="HABEN";
  bsHeader.appendChild(sollLbl);bsHeader.appendChild(anLbl);bsHeader.appendChild(habenLbl);
  bsContainer.appendChild(bsHeader);

  const bsSlots=mk("div","bs-slots");
  const sollCol=mk("div","bs-col");
  const anCenter=mk("div","bs-an-center");
  const anText=mk("div","bs-an-text");anText.textContent="an";
  anCenter.appendChild(anText);
  const habenCol=mk("div","bs-col");

  function makeSlot(slotDef) {
    const slot=mk("div","bs-slot "+(slotDef.seite==="soll"?"soll-slot":"haben-slot"));
    const sid=slotDef.nr+slotDef.seite;
    slot.dataset.id=sid;
    // Leer-Zustand
    const leer=mk("div","bs-slot-leer");
    leer.innerHTML="Konto ausw\xe4hlen\u2026<div class='bs-slot-hint'>im Kontenplan unten tippen</div>";
    // Gefüllt-Zustand
    const filled=mk("div");filled.style.display="none";
    const snr=mk("div","bs-slot-nr");
    const skuerzel=mk("div","bs-slot-kuerzel");
    // Betrag-Eingabefeld
    const sbetragWrap=mk("div");sbetragWrap.style.cssText="display:flex;align-items:center;gap:5px;margin-top:6px";
    const sbetragInp=mk("input","blank-inp");
    sbetragInp.style.cssText="width:100%;padding:5px 8px;font-size:13px;margin:0";
    sbetragInp.placeholder="0,00";
    sbetragInp.title="Betrag eingeben";
    const sbetragEuro=mk("span");sbetragEuro.textContent="\u20ac";sbetragEuro.style.cssText="font-size:13px;color:#64748b;font-weight:700";
    sbetragWrap.appendChild(sbetragInp);sbetragWrap.appendChild(sbetragEuro);
    filled.appendChild(snr);filled.appendChild(skuerzel);filled.appendChild(sbetragWrap);
    const clear=mk("span","bs-slot-clear");clear.textContent="\u00d7";clear.title="Leeren";
    slot.appendChild(leer);slot.appendChild(filled);slot.appendChild(clear);

    slot.onclick=(e)=>{
      if(e.target===clear||e.target===sbetragInp||slot.classList.contains("ok")||slot.classList.contains("nok"))return;
      document.querySelectorAll(".bs-slot").forEach(s=>s.style.outline="");
      if(activeSlot===slot){activeSlot=null;return;}
      activeSlot=slot;
      slot.style.outline="2px solid var(--a)";
    };
    clear.onclick=(e)=>{
      e.stopPropagation();
      slot.dataset.v="";sbetragInp.value="";
      leer.style.display="";filled.style.display="none";
      slot.classList.remove("filled");
      slot.style.outline="";activeSlot=null;
    };

    slotMap[sid]={slot,snr,skuerzel,sbetragInp,leer,filled,antwort:slotDef.antwort,betragAntwort:slotDef.betragAntwort};
    return slot;
  }

  f.sollSlots.forEach(s=>sollCol.appendChild(makeSlot(s)));
  f.habenSlots.forEach(h=>habenCol.appendChild(makeSlot(h)));
  bsSlots.appendChild(sollCol);bsSlots.appendChild(anCenter);bsSlots.appendChild(habenCol);
  bsContainer.appendChild(bsSlots);
  card.appendChild(bsContainer);

  // Kontenplan
  const {clearSelection}=renderKontenplan(card,(k)=>{
    let target=activeSlot;
    if(!target){
      for(const sid of Object.keys(slotMap)){
        if(!slotMap[sid].slot.dataset.v){target=slotMap[sid].slot;break;}
      }
    }
    if(!target)return;
    const sid=target.dataset.id;
    const sm=slotMap[sid];
    if(!sm)return;
    sm.snr.textContent=k.nr;sm.skuerzel.textContent=k.kuerzel;
    sm.leer.style.display="none";sm.filled.style.display="";
    target.classList.add("filled");
    target.dataset.v=k.nr+" "+k.kuerzel;
    target.style.outline="";activeSlot=null;
    sm.sbetragInp.focus();
    clearSelection();
    // Nächsten leeren Slot vormerken (aber nicht sofort aktivieren - Schüler tippt erst Betrag)
  });

  // Prüfen-Button
  const btn=mk("button","bpri");btn.textContent="\u2713 Pr\xfcfen";
  btn.onclick=()=>{
    let ok=0;
    Object.values(slotMap).forEach(sm=>{
      const vKonto=(sm.slot.dataset.v||"").trim();
      const vBetrag=sm.sbetragInp.value.trim().replace(",",".");
      const aBetrag=sm.betragAntwort.replace(",",".");
      const kontoOk=vKonto===sm.antwort.trim();
      const betragOk=Math.abs(parseFloat(vBetrag)-parseFloat(aBetrag))<0.005;
      if(kontoOk)ok++;
      if(betragOk)ok++;
      const gesOk=kontoOk&&betragOk;
      sm.slot.className="bs-slot "+(sm.slot.classList.contains("soll-slot")?"soll-slot ":"haben-slot ")+
        (gesOk?"ok":"nok");
      sm.slot.style.outline="";
      if(!gesOk){
        const hint=mk("div");hint.style.cssText="font-size:10px;color:#991b1b;margin-top:4px;font-family:monospace;font-weight:700;line-height:1.4";
        const lines=[];
        if(!kontoOk)lines.push("Konto: "+sm.antwort);
        if(!betragOk)lines.push("Betrag: "+sm.betragAntwort+" \u20ac");
        hint.textContent="\u2192 "+lines.join(" | ");sm.slot.appendChild(hint);
      }
    });
    btn.disabled=true;
    feed(card,f,ok===allSlots.length*2);zeigeWeiter(card,ok,allSlots.length*2);
  };
  card.appendChild(btn);
}

// ── Fill in the Blanks ────────────────────────────────────────────────────────
function renderFillBlanks(card,f){
  const m=f.felder.length;maxP+=m;
  const inputs=[];
  renderBeleg(card,f.belegData);
  if(f.wordspeicher&&f.wordspeicher.length){
    const wslbl=mk("div");wslbl.style.cssText="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px";
    wslbl.textContent="Wortspeicher";card.appendChild(wslbl);
    const ws=mk("div","wordspeicher");
    f.wordspeicher.forEach(w=>{
      const chip=mk("button","ws-chip");chip.textContent=w;
      chip.onclick=()=>{
        let target=null;
        if(focusInp&&!focusInp.dataset.geprueft&&inputs.includes(focusInp))target=focusInp;
        if(!target)target=inputs.find(i=>!i.value&&!i.dataset.geprueft);
        if(target){target.value=w;target.focus();chip.classList.add("used");}
      };
      ws.appendChild(chip);
    });
    card.appendChild(ws);
  }
  let prevGruppe=-1;
  f.felder.forEach((fd,fi)=>{
    if(fd.gruppe!==undefined&&fd.gruppe!==prevGruppe&&prevGruppe!==-1){card.appendChild(mk("hr","gruppe-trenner"));}
    prevGruppe=fd.gruppe??0;
    const row=mk("div","blank-row");
    const lbl=mk("span","blank-lbl");lbl.textContent=fd.label+":";row.appendChild(lbl);
    const inp=mk("input","blank-inp");
    inp.placeholder=fd.typ==="betrag"?"0,00":fd.typ==="nr"?"0000":"···";
    inp.dataset.a=fd.antwort;
    inp.addEventListener("focus",()=>{focusInp=inp;});
    inp.addEventListener("keydown",(e)=>{if(e.key==="Enter"&&fi===f.felder.length-1)pruefen();});
    inputs.push(inp);row.appendChild(inp);card.appendChild(row);
  });
  const btn=mk("button","bpri");btn.textContent="\u2713 Pr\xfcfen";
  function pruefen(){
    if(btn.disabled)return;
    let ok=0;
    inputs.forEach(inp=>{
      if(inp.dataset.geprueft==="1")return;
      inp.dataset.geprueft="1";inp.readOnly=true;
      const v=inp.value.trim().replace(",",".");
      const a=String(inp.dataset.a).replace(",",".");
      const r=v.toLowerCase()===a.toLowerCase()||v.replace(/\s/g,"")===a.replace(/\s/g,"");
      inp.className="blank-inp "+(r?"ok":"nok");
      if(r)ok++;else inp.title="L\xf6sung: "+inp.dataset.a;
    });
    btn.disabled=true;feed(card,f,ok===m);zeigeWeiter(card,ok,m);
  }
  btn.onclick=pruefen;card.appendChild(btn);
}

// ── Single Choice ─────────────────────────────────────────────────────────────
function renderSingleChoice(card,f){
  maxP++;
  renderBeleg(card,f.belegData);
  f.antworten.forEach(a=>{
    const b=mk("button","btn");b.style.cssText="font-family:'Courier New',monospace;font-size:13px;line-height:1.5;text-align:left";b.textContent=a;
    b.onclick=function(){
      const ok=a===f.richtig;
      card.querySelectorAll(".btn").forEach(x=>{x.onclick=null;x.style.cursor="default";});
      b.className="btn "+(ok?"ok":"nok");
      if(!ok)card.querySelectorAll(".btn").forEach(x=>{if(x.textContent===f.richtig)x.className="btn ok";});
      feed(card,f,ok);zeigeWeiter(card,ok?1:0,1);
    };
    card.appendChild(b);
  });
}

// ── True/False ────────────────────────────────────────────────────────────────
function renderTrueFalse(card,f){
  const g=mk("div","tfg");
  ["Ja \u2713","Nein \u2717"].forEach((l,i)=>{
    const b=mk("button","tfb");b.textContent=l;
    b.onclick=function(){
      const ok=(i===0)===f.antwort;
      g.querySelectorAll(".tfb").forEach(x=>{x.onclick=null;x.style.cursor="default";});
      b.className="tfb "+(ok?"ok":"nok");
      feed(card,f,ok);zeigeWeiter(card,ok?1:0,1);
    };
    g.appendChild(b);
  });
  card.appendChild(g);
}

// ── Drag Kalkulation ──────────────────────────────────────────────────────────
function renderDragKalk(card,f){
  const zMitA=f.zeilen.filter(z=>z.antwort);const dm={};
  renderBeleg(card,f.belegData);
  const ta=mk("div","kalk-drag-area");
  f.tokens.forEach((t,ti)=>{
    const tok=mk("div","token");tok.textContent=t.text;tok.draggable=true;
    tok.addEventListener("dragstart",e=>{e.dataTransfer.setData("text",t.text);e.dataTransfer.setData("idx",String(ti));tok.classList.add("dragging");});
    tok.addEventListener("dragend",()=>tok.classList.remove("dragging"));
    tok.addEventListener("touchstart",e=>{e.preventDefault();dragSel={text:t.text,el:tok,i:ti};tok.classList.add("dragging");},{passive:false});
    tok.addEventListener("touchmove",e=>{e.preventDefault();if(!dragSel)return;const touch=e.touches[0];document.querySelectorAll(".kalk-dz").forEach(z=>z.classList.remove("drag-over"));tok.style.visibility="hidden";const under=document.elementFromPoint(touch.clientX,touch.clientY);tok.style.visibility="";const zone=under?.closest(".kalk-dz");if(zone)zone.classList.add("drag-over");},{passive:false});
    tok.addEventListener("touchend",e=>{e.preventDefault();if(!dragSel)return;const touch=e.changedTouches[0];document.querySelectorAll(".kalk-dz").forEach(z=>z.classList.remove("drag-over"));tok.style.visibility="hidden";const under=document.elementFromPoint(touch.clientX,touch.clientY);tok.style.visibility="";const zone=under?.closest(".kalk-dz");if(zone){zone.querySelector(".dz-val").textContent=dragSel.text;zone.querySelector(".dz-val").style.color="";zone.dataset.v=dragSel.text;dragSel.el.classList.add("used");}dragSel.el.classList.remove("dragging");dragSel=null;},{passive:false});
    ta.appendChild(tok);
  });
  card.appendChild(ta);
  const schema=mk("div");schema.style.cssText="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:8px";
  f.zeilen.forEach(z=>{
    const row=mk("div","kalk-row");
    const lbl=mk("div","kalk-lbl");lbl.textContent=z.label;row.appendChild(lbl);
    if(z.antwort){
      const dz=mk("div","kalk-dz");dz.dataset.a=z.antwort;
      const val=mk("span","dz-val");val.textContent="\u00b7\u00b7\u00b7";val.style.color="#94a3b8";dz.appendChild(val);dm[z.label]=dz;
      dz.addEventListener("dragover",e=>{e.preventDefault();dz.classList.add("drag-over");});
      dz.addEventListener("dragleave",()=>dz.classList.remove("drag-over"));
      dz.addEventListener("drop",e=>{e.preventDefault();dz.classList.remove("drag-over");const txt=e.dataTransfer.getData("text");val.textContent=txt;val.style.color="";dz.dataset.v=txt;ta.children[parseInt(e.dataTransfer.getData("idx"))]?.classList.add("used");});
      row.appendChild(dz);
    } else {const calc=mk("span");calc.style.cssText="font-size:11px;color:#94a3b8;font-style:italic";calc.textContent="wird berechnet";row.appendChild(calc);}
    schema.appendChild(row);
  });
  card.appendChild(schema);
  const btn=mk("button","bpri");btn.textContent="\u2713 Pr\xfcfen";
  btn.onclick=()=>{let ok=0;zMitA.forEach(z=>{const dz=dm[z.label];const r=(dz.dataset.v||"").trim()===z.antwort.trim();dz.className="kalk-dz "+(r?"ok":"nok");if(r)ok++;});btn.disabled=true;feed(card,f,ok===zMitA.length);zeigeWeiter(card,ok,zMitA.length);};
  card.appendChild(btn);
}

// ── Matching ──────────────────────────────────────────────────────────────────
function renderMatching(card,f){
  const vb={};const lE={};
  const rechtsShuffled=shuffleArr(f.paare.map(p=>p.rechts));
  const g=mk("div","mg");
  f.paare.forEach(p=>{
    const l=mk("button","mcell");l.textContent=p.links;l.dataset.nr=p.links;
    l.onclick=()=>{if(l.classList.contains("ok")||l.classList.contains("nok"))return;document.querySelectorAll(".mcell.sel-l").forEach(b=>b.classList.remove("sel","sel-l"));l.classList.add("sel","sel-l");matchSel=p.links;};
    lE[p.links]=l;g.appendChild(l);
  });
  rechtsShuffled.forEach(rechts=>{
    const r=mk("button","mcell");r.textContent=rechts;
    r.onclick=()=>{
      if(!matchSel||r.classList.contains("ok")||r.classList.contains("nok"))return;
      const pp=f.paare.find(x=>x.links===matchSel);const ok=pp&&pp.rechts===rechts;
      const lBtn=lE[matchSel];lBtn.classList.remove("sel","sel-l");lBtn.classList.add(ok?"ok":"nok");
      r.classList.add(ok?"ok":"nok");if(ok)vb[matchSel]=rechts;matchSel=null;
      if(Object.keys(vb).length===f.paare.length){feed(card,f,true);zeigeWeiter(card,f.paare.length,f.paare.length);}
    };
    g.appendChild(r);
  });
  card.appendChild(g);
  const btn=mk("button","bpri");btn.style.marginTop="10px";btn.textContent="\u2713 Auswerten";
  btn.onclick=()=>{const ok=Object.keys(vb).length;btn.disabled=true;feed(card,f,ok===f.paare.length);zeigeWeiter(card,ok,f.paare.length);};
  card.appendChild(btn);
}

// ── Hauptroutine ──────────────────────────────────────────────────────────────
function rf(){
  setProgress();
  if(!introGezeigt){showIntro();return;}
  const c=document.getElementById("qc");c.innerHTML="";
  const f=F[idx];
  if(!f){showScore();return;}
  const card=mk("div","card");
  card.innerHTML='<div class="fnr">Frage '+(idx+1)+' / '+F.length+'</div>'+
    '<div class="ftxt">'+f.frage+'</div>';
  if(f.typ==="drag_konten")   renderDragKonten(card,f);
  else if(f.typ==="fill_blanks")  renderFillBlanks(card,f);
  else if(f.typ==="single_choice") renderSingleChoice(card,f);
  else if(f.typ==="true_false")  renderTrueFalse(card,f);
  else if(f.typ==="drag_kalk")   renderDragKalk(card,f);
  else if(f.typ==="matching")   renderMatching(card,f);
  c.appendChild(card);
}

// ── Score ─────────────────────────────────────────────────────────────────────
async function speichereErgebnis(btn){
  if(!SESSION_ID){btn.textContent="⚠ Kein Backend";return;}
  btn.disabled=true;btn.textContent="⏳ Wird gespeichert…";
  try{
    // Session abschließen
    await fetch(API_URL+"/sessions/"+SESSION_ID+"/abschliessen",{method:"POST"});
    // Einzelne Fragen-Ergebnisse
    for(const e of res){
      await fetch(API_URL+"/ergebnisse",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({session_id:SESSION_ID,frage_nr:e.f.nr,frage_typ:e.f.typ,
          punkte:e.g,max_punkte:e.m,korrekt:e.g===e.m})});
    }
    btn.textContent="✓ Gespeichert!";btn.style.background="#16a34a";
  }catch(err){btn.textContent="✗ Fehler: "+err.message;btn.style.background="#dc2626";btn.disabled=false;}
}

function showScore(){
  document.getElementById("pf").style.width="100%";
  const pct=maxP>0?Math.round(pts/maxP*100):0;
  const note=pct>=87?"1":pct>=75?"2":pct>=62?"3":pct>=50?"4":pct>=37?"5":"6";
  const em=pct>=75?"\uD83C\uDF1F":pct>=50?"\uD83D\uDC4D":"\uD83D\uDCAA";
  const c=mk("div","card sc");
  const top=mk("div");
  top.innerHTML='<div style="font-size:42px;margin-bottom:8px">'+em+'</div>'+
    '<div class="sc-pct">'+pct+'%</div>'+
    '<div class="sc-sub">'+pts+' / '+maxP+' Punkte &bull; Note ca. '+note+'</div>'+
    '<div class="sc-grid">'+
    '<div class="sc-box"><div class="n" style="color:var(--g)">'+res.filter(e=>e.g===e.m).length+'</div><div class="l">Richtig</div></div>'+
    '<div class="sc-box"><div class="n" style="color:var(--r)">'+res.filter(e=>e.g<e.m).length+'</div><div class="l">Fehler</div></div>'+
    '<div class="sc-box"><div class="n" style="color:var(--a)">'+F.length+'</div><div class="l">Fragen</div></div>'+
    '</div>'+
    '<div style="font-size:12px;font-weight:700;color:#374151;margin:14px 0 8px;text-align:left">\uD83D\uDCCB L\xf6sungsabgleich</div>';
  c.appendChild(top);
  res.forEach((e,i)=>{
    const li=mk("div","detail "+(e.g===e.m?"ok":"nok"));
    li.innerHTML='<div class="detail-q">'+(i+1)+'. '+e.f.frage.replace(/<[^>]*>/g,"").slice(0,60)+'\u2026</div>'+
      '<div class="detail-a">'+(e.g===e.m?"\u2713 Richtig":"\u2717 Fehler")+' \xb7 '+e.g+'/'+e.m+' P</div>';
    c.appendChild(li);
  });
  // Speichern-Button (nur wenn Backend konfiguriert)
  if(SESSION_ID||API_URL){
    const sb=mk("button","bpri");sb.style.cssText="margin-top:12px;background:#0369a1;width:100%";
    sb.textContent="☁ Ergebnis speichern";
    sb.onclick=()=>speichereErgebnis(sb);
    c.appendChild(sb);
  }
  const rb=mk("button","bpri");rb.style.marginTop="8px";rb.textContent="\u21ba Neu starten";
  rb.onclick=()=>{idx=0;pts=0;maxP=0;res=[];matchSel=null;dragSel=null;focusInp=null;kplanSel=null;introGezeigt=false;rf();};
  c.appendChild(rb);
  document.getElementById("qc").appendChild(c);
}

export function shuffleArr(a){return[...a].sort(()=>Math.random()-.5);}
rf();
</script>
</body>
</html>`;
}
