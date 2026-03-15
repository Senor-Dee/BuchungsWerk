import React, { useState, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// BACKEND-API
// Raspberry Pi Home Server – URL hier anpassen, wenn nötig
// ══════════════════════════════════════════════════════════════════════════════
const API_URL = "http://raspberrypi.local:8000";  // ← ggf. IP eintragen

async function apiFetch(path, method = "GET", body = null) {
  try {
    const res = await fetch(API_URL + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return method === "DELETE" ? null : res.json();
  } catch (e) {
    console.warn("BuchungsWerk API:", e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HILFSFUNKTIONEN
// ══════════════════════════════════════════════════════════════════════════════
const r2 = n => Math.round(n * 100) / 100;
const fmt = n => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rnd = (min, max, step = 50) => Math.round((min + Math.random() * (max - min)) / step) * step;
const rgnr = () => `RE-2025-${String(Math.floor(1000 + Math.random() * 8999))}`;
const augnr = () => `AR-2025-${String(Math.floor(1000 + Math.random() * 8999))}`;
const fakeDatum = (offsetDays = 0) => {
  const d = new Date(2025, 2, 8 + offsetDays);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const fmtIBAN = iban => iban.replace(/(.{4})/g, "$1 ").trim();

// Du/Sie je nach Klasse – wandelt "Sie/Ihr/Ihnen" → "du/dein/dir" für Klassen 7–9
const duSie = klasse => klasse <= 9 ? "du" : "Sie";
const duSieGross = klasse => klasse <= 9 ? "Du" : "Sie";
const anrede = (klasse, text) => {
  if (!text || klasse >= 10) return text;
  // Imperativ-Formen zuerst (vor allgemeinem "Sie"-Ersatz!)
  return text
    .replace(/Bilden Sie/g, "Bilde")
    .replace(/Buchen Sie/g, "Buche")
    .replace(/Berechnen Sie/g, "Berechne")
    .replace(/Erstellen Sie/g, "Erstelle")
    .replace(/Vergleichen Sie/g, "Vergleiche")
    .replace(/Entscheiden Sie/g, "Entscheide")
    .replace(/Begr\u00fcnden Sie/g, "Begr\u00fcnde")
    .replace(/F\u00fcllen Sie/g, "F\u00fclle")
    .replace(/Tragen Sie/g, "Trage")
    .replace(/Notieren Sie/g, "Notiere")
    .replace(/Ermitteln Sie/g, "Ermittle")
    .replace(/Stornieren Sie/g, "Storniere")
    .replace(/Pr\u00fcfen Sie/g, "Pr\u00fcfe")
    // Dann Pronomen (als ganzes Wort via lookahead/lookbehind)
    .replace(/(^|\s)Sie(\s|$|[.,!?])/g, (_, a, b) => a + "du" + b)
    .replace(/\bIhnen\b/g, "dir")
    .replace(/\bIhrer\b/g, "deiner")
    .replace(/\bIhrem\b/g, "deinem")
    .replace(/\bIhre\b/g, "deine")
    .replace(/\bIhr\b/g, "dein");
};

// ──────────────────────────────────────────────────────────────────────────────
// FAKE STAMMDATEN für realistische Belege
// ──────────────────────────────────────────────────────────────────────────────
const LIEFERANTEN = [
  { name: "Bayern Rohstoffe GmbH", ort: "Augsburg", plz: "86150", strasse: "Industriestraße 12", iban: "DE12720501010012345678", bank: "UniCredit Bank AG", email: "buchhaltung@bayern-rohstoffe.de", tel: "0821 / 44 33 21-0" },
  { name: "Südbayer Werkstoffe KG", ort: "Regensburg", plz: "93049", strasse: "Gewerbepark 5", iban: "DE45750300150001234567", bank: "Volksbank Regensburg eG", email: "info@suedbayer-werkstoffe.de", tel: "0941 / 88 77 66-0" },
  { name: "Alpen Material AG", ort: "München", plz: "80997", strasse: "Münchner Str. 88", iban: "DE78760100850201234567", bank: "Postbank", email: "vertrieb@alpen-material.de", tel: "089 / 35 46 78-0" },
  { name: "Ostbayern Handel GmbH", ort: "Landshut", plz: "84030", strasse: "Bahnhofstraße 22", iban: "DE11750400350012987654", bank: "Sparkasse Landshut", email: "rechnungen@ostbayern-handel.de", tel: "0871 / 22 11 00-0" },
  { name: "Maier Industriebedarf KG", ort: "Passau", plz: "94032", strasse: "Hafenstraße 7", iban: "DE34730500000023456789", bank: "Raiffeisenbank Passau", email: "buchhaltung@maier-industrie.de", tel: "0851 / 99 88 77-0" },
];

const KUNDEN = [
  { name: "TechBau AG", ort: "Nürnberg", plz: "90402", strasse: "Hauptstraße 100", iban: "DE78760100850000111122", kundennr: "KD-4821" },
  { name: "Maier Technik GmbH", ort: "München", plz: "80335", strasse: "Karlsplatz 5", iban: "DE45700200700012345678", kundennr: "KD-3307" },
  { name: "Franken Industrie KG", ort: "Würzburg", plz: "97070", strasse: "Juliuspromenade 64", iban: "DE12790000000012345678", kundennr: "KD-5519" },
  { name: "Allgäu Handel GmbH", ort: "Kempten", plz: "87435", strasse: "Rottachstraße 25", iban: "DE56733500000012345678", kundennr: "KD-2044" },
  { name: "Nord-Süd Vertrieb AG", ort: "Ingolstadt", plz: "85049", strasse: "Ringstraße 45", iban: "DE89721304000012345678", kundennr: "KD-6630" },
];

// ──────────────────────────────────────────────────────────────────────────────
// MODELLUNTERNEHMEN
// ──────────────────────────────────────────────────────────────────────────────
const UNTERNEHMEN = [
  {
    id: "lumitec", name: "LumiTec GmbH", ort: "Ingolstadt", plz: "85049", strasse: "Solarring 14",
    branche: "Elektronik/Solartechnik", rechtsform: "GmbH", inhaber: "Dr. Sabine Lux",
    iban: "DE45700604800000123456", bank: "Commerzbank AG", email: "buchhaltung@lumitec.de",
    farbe: "#f59e0b", icon: "☀️", slogan: "Energie aus Bayern.",
    rohstoffe: ["Siliziumscheiben", "Kupferfolie", "Aluminiumprofile", "Borosilikatglas"],
    fremdbauteile: ["Wechselrichter-Platinen", "Anschlussklemmen", "Dichtungsrahmen"],
    hilfsstoffe: ["Lötpaste", "Isolierband", "Schrauben", "Silikon-Dichtmasse"],
    betriebsstoffe: ["Druckluft (m³)", "Kühlwasser", "Reinigungsmittel"],
    handelswaren: ["Batteriespeicher", "Laderegler", "Solarhalterungen"],
    fertigerzeugnisse: ["Solarmodul 400W", "LED-Flächenstrahler", "PV-Dachsystem"],
    anlagen: ["CNC-Schneidanlage", "Bestückungsautomat", "Prüfstand", "Gabelstapler"],
  },
  {
    id: "waldform", name: "Waldform Design GmbH", ort: "Straubing", plz: "94315", strasse: "Holzhandwerkerring 3",
    branche: "Holz/Möbel/Design", rechtsform: "GmbH", inhaber: "Markus Waldner",
    iban: "DE12750501010034567890", bank: "Sparkasse Straubing-Bogen", email: "finanzen@waldform.de",
    farbe: "#92400e", icon: "🪵", slogan: "Massivholz aus dem Bayerischen Wald.",
    rohstoffe: ["Eichenholz (Bohlen)", "Buchenholz (Bretter)", "Kirschholz (Furniere)"],
    fremdbauteile: ["Möbelbeschläge", "Schubladenführungen", "Verbindungsbolzen"],
    hilfsstoffe: ["Holzleim", "Schleifpapier", "Holzöl", "Grundierfarbe"],
    betriebsstoffe: ["Kettenöl", "Maschinenöl", "Sägeblätter"],
    handelswaren: ["Designergriffe", "Wandhaken-Sets", "Tischbeine Metall"],
    fertigerzeugnisse: ["Esstisch 'Forst'", "Sideboard 'Strom'", "Bücherregal 'Ast'"],
    anlagen: ["CNC-Fräse", "Formatkreissäge", "Schleifmaschine", "Lackieranlage"],
  },
  {
    id: "alpentextil", name: "AlpenTextil KG", ort: "Kaufbeuren", plz: "87600", strasse: "Textilstraße 8",
    branche: "Textil/Bekleidung", rechtsform: "KG", inhaber: "Elisabeth Bergner",
    iban: "DE67733500000045678901", bank: "Volksbank Kaufbeuren-Ostallgäu eG", email: "verwaltung@alpentextil.de",
    farbe: "#047857", icon: "🧵", slogan: "Qualität aus dem Allgäu.",
    rohstoffe: ["Merino-Wolle (kg)", "Gore-Tex-Gewebe (m²)", "Polyamid-Garn", "Fleece-Stoff"],
    fremdbauteile: ["YKK-Reißverschlüsse", "Druckknöpfe", "Kordelstopper"],
    hilfsstoffe: ["Nähgarn", "Klebeeinlage", "Schneidöl"],
    betriebsstoffe: ["Maschinenöl", "Dampf (Bügelanlage)"],
    handelswaren: ["Outdoorjacken (zugekauft)", "Wanderrucksäcke", "Thermosocken"],
    fertigerzeugnisse: ["Funktionsjacke 'AlpFlex'", "Arbeitshose 'ProWork'", "Wetterschutzjacke 'BergTop'"],
    anlagen: ["Industrienähmaschinen (Set)", "Zuschneideroboter", "Stickmaschine", "Bügelanlage"],
  },
  {
    id: "vitasport", name: "VitaSport GmbH", ort: "Landsberg am Lech", plz: "86899", strasse: "Sportgeräteweg 21",
    branche: "Sportgeräte/Fitness", rechtsform: "GmbH", inhaber: "Thomas Kraft",
    iban: "DE23721604000056789012", bank: "Kreissparkasse Landsberg-Dießen", email: "buchhaltung@vitasport.de",
    farbe: "#1d4ed8", icon: "🏋️", slogan: "Fitness made in Bavaria.",
    rohstoffe: ["Stahlrohr (m)", "Naturkautschuk (kg)", "PU-Schaumstoff (m²)"],
    fremdbauteile: ["Stellschrauben", "Lager und Achsen", "Griffgummi", "Urethanrollen"],
    hilfsstoffe: ["Schweißdraht", "Schleifscheiben", "Montagekleber"],
    betriebsstoffe: ["Schutzgas", "Schneidöl"],
    handelswaren: ["Gewichtsscheiben (Guss)", "Springseil-Sets", "Yogamatten"],
    fertigerzeugnisse: ["Kraftstation 'MaxForce 300'", "Laufband 'PulseRun'", "Rudergerät 'AquaPro'"],
    anlagen: ["Schweißroboter", "Biegemaschine", "Pulverbeschichtungsanlage", "Prüfstand"],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// PUNKTE & NOTENSYSTEM (ISB-Handreichung Bayern 2025)
// ══════════════════════════════════════════════════════════════════════════════
const berechnePunkte = a => a.taskTyp === "komplex"
  ? (a.schritte || []).reduce((s, st) => s + st.punkte, 0)
  : a.taskTyp === "theorie"
    ? (a.nrPunkte || 4)
    : a.taskTyp === "rechnung"
    ? (a.nrPunkte || 0)
    : (a.soll?.length || 0) + (a.haben?.length || 0) + (a.nrPunkte || 0);

// Regler: 0=locker, 0.5=ISB-Standard, 1=streng
// Ankerpunkte für die Untergrenzen der Noten 1–5 (in % von max):
//   streng: Noten 1+2 schwer (hoch), 3 etwas lockerer, 4–5 linear
//   locker: Noten 1+2 kaum verändert, Note 3+4 großzügig (tief), 5+6 linear
// Punkte in BwR in 0,5-Schritten → alle Grenzen auf 0,5 runden
const NOTEN_ANKER = {
  //          N1    N2    N3    N4    N5
  locker: [0.90, 0.77, 0.58, 0.40, 0.23],
  isb:    [0.92, 0.80, 0.67, 0.50, 0.30],
  streng: [0.96, 0.87, 0.74, 0.59, 0.38],
};
const notenTabelle = (max, strenge = 0.5) => {
  const r5 = v => Math.round(v * 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  // Interpoliere zwischen locker↔isb (t=0..1) oder isb↔streng (t=0..1)
  const pcts = NOTEN_ANKER.isb.map((isb, i) =>
    strenge <= 0.5
      ? lerp(NOTEN_ANKER.locker[i], isb, strenge * 2)
      : lerp(isb, NOTEN_ANKER.streng[i], (strenge - 0.5) * 2)
  );
  const ug = idx => Math.min(max, r5(max * pcts[idx]));
  const n1 = ug(0), n2 = ug(1), n3 = ug(2), n4 = ug(3), n5 = ug(4);
  const n6bis = Math.max(0, n5 - 0.5);
  return [
    { note: 1, text: "Sehr gut",     farbe: "#15803d", von: n1,       bis: max },
    { note: 2, text: "Gut",          farbe: "#16a34a", von: n2,       bis: n1 - 0.5 },
    { note: 3, text: "Befriedigend", farbe: "#ca8a04", von: n3,       bis: n2 - 0.5 },
    { note: 4, text: "Ausreichend",  farbe: "#d97706", von: n4,       bis: n3 - 0.5 },
    { note: 5, text: "Mangelhaft",   farbe: "#dc2626", von: n5,       bis: n4 - 0.5 },
    { note: 6, text: "Ungenügend",   farbe: "#991b1b", von: 0,        bis: n6bis },
  ];
};

// ══════════════════════════════════════════════════════════════════════════════
// WERKSTOFF-TYPEN (ISB-Kontenplan Bayern)
// ══════════════════════════════════════════════════════════════════════════════
const WERKSTOFF_TYPEN = [
  { id: "rohstoffe",    label: "Rohstoffe",     icon: "⚙️",  aw: { nr: "6000", kürzel: "AWR", name: "Aufwend. Rohstoffe (AWR)"      }, nl: { nr: "6002", kürzel: "NR",  name: "Nachlässe auf Rohstoffe (NR)"    }, bzk: { nr: "6001", kürzel: "BZKR", name: "Bezugskosten Rohstoffe (BZKR)" }, key: "rohstoffe"    },
  { id: "hilfsstoffe",  label: "Hilfsstoffe",   icon: "🔧",  aw: { nr: "6020", kürzel: "AWH", name: "Aufwend. Hilfsstoffe (AWH)"     }, nl: { nr: "6022", kürzel: "NH",  name: "Nachlässe auf Hilfsstoffe (NH)"  }, bzk: { nr: "6021", kürzel: "BZKH", name: "Bezugskosten Hilfsstoffe (BZKH)" }, key: "hilfsstoffe"  },
  { id: "fremdbauteile",label: "Fremdbauteile", icon: "🔩",  aw: { nr: "6010", kürzel: "AWF", name: "Aufwend. Fremdbauteile (AWF)"   }, nl: { nr: "6012", kürzel: "NF",  name: "Nachlässe auf Fremdbauteile (NF)"},bzk: { nr: "6011", kürzel: "BZKF", name: "Bezugskosten Fremdbauteile (BZKF)" }, key: "fremdbauteile"},
  { id: "betriebsstoffe",label:"Betriebsstoffe",icon: "🛢️",  aw: { nr: "6030", kürzel: "AWB", name: "Aufwend. Betriebsstoffe (AWB)"  }, nl: { nr: "6032", kürzel: "NB",  name: "Nachlässe auf Betriebsstoffe (NB)"},bzk:{ nr: "6031", kürzel: "BZKB", name: "Bezugskosten Betriebsstoffe (BZKB)"},key: "betriebsstoffe"},
];

// ══════════════════════════════════════════════════════════════════════════════
// LERNBEREICH-META
// ══════════════════════════════════════════════════════════════════════════════
const LB_INFO = {
  "LB 3 · Einführung Buchführung":          { icon: "📒", farbe: "#3b82f6" },
  "LB 4 · Betrieblicher Produktionsprozess":{ icon: "⚙️", farbe: "#8b5cf6" },
  "LB 2 · Werkstoffe & Einkauf":            { icon: "📦", farbe: "#f59e0b" },
  "LB 3 · Marketing":                       { icon: "📢", farbe: "#e11d48" },
  "LB 4 · Verkauf & Fertigerzeugnisse":     { icon: "🏷️", farbe: "#10b981" },
  "LB 5 · Personalbereich":                 { icon: "👥", farbe: "#ec4899" },
  "LB 6 · Unternehmen und Staat":           { icon: "🏛️", farbe: "#6366f1" },
  "LB 1 · Privatkonto & Unternehmerlohn":   { icon: "💼", farbe: "#f97316" },
  "LB 2 · Anlagenbereich":                  { icon: "🏭", farbe: "#64748b" },
  "LB 3 · Finanzierung":                    { icon: "🏦", farbe: "#0ea5e9" },
  "LB 4 · Kapitalanlage":                   { icon: "📈", farbe: "#84cc16" },
  "LB 5 · Forderungsbewertung":             { icon: "⚠️", farbe: "#ef4444" },
  "LB 1 · Abgrenzung & Rückstellungen":     { icon: "📅", farbe: "#7c3aed" },
  "LB 2 · Kennzahlen & Bilanzanalyse":      { icon: "📉", farbe: "#059669" },
  "LB 3 · Vollkostenrechnung":              { icon: "🧮", farbe: "#0d9488" },
  "LB 4 · Teilkostenrechnung":              { icon: "📊", farbe: "#d97706" },
  "LB 5 · Jahresabschluss":                 { icon: "📋", farbe: "#0891b2" },
  "Kontenabschluss":                         { icon: "🔒", farbe: "#0f172a" },
  "Theorie · Grundbegriffe":                  { icon: "📚", farbe: "#0891b2" },
  "Theorie · Rechnungswesen":                 { icon: "📚", farbe: "#0891b2" },
  "Theorie · Bewertung & Personal":           { icon: "📚", farbe: "#0891b2" },
  "Theorie · Abschluss & Controlling":        { icon: "📚", farbe: "#0891b2" },
};

// ══════════════════════════════════════════════════════════════════════════════
// BELEG-HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const mkEingangsRE = (f, artikel, menge, einheit, netto, ustPct, klasse7 = false, skonto = 0, bezugskosten = 0) => {
  const lief = pick(LIEFERANTEN);
  const u = r2(netto * ustPct / 100);
  const b = r2(netto + u);
  const bzkNetto = bezugskosten;
  const bzkU = r2(bzkNetto * ustPct / 100);
  const gesamtBrutto = r2(b + bzkNetto + bzkU);
  const positionen = [{ pos: 1, beschr: artikel, menge, einheit, ep: r2(netto / menge), netto }];
  if (bzkNetto > 0) positionen.push({ pos: 2, beschr: "Transportkosten (Spedition)", menge: 1, einheit: "pauschal", ep: bzkNetto, netto: bzkNetto });
  return {
    typ: "eingangsrechnung", lief, empfaenger: { name: f.name, strasse: f.strasse, plz_ort: `${f.plz} ${f.ort}` },
    rgnr: rgnr(), datum: fakeDatum(-8), lieferdatum: fakeDatum(-11), positionen,
    netto: r2(netto + bzkNetto), ustPct, ustBetrag: r2(u + bzkU), brutto: gesamtBrutto,
    zahlungsziel: skonto > 0
      ? `${skonto} % Skonto bei Zahlung bis ${fakeDatum(-1)} | Netto 30 Tage bis ${fakeDatum(22)}`
      : `Netto 30 Tage, zahlbar bis ${fakeDatum(22)}`,
    klasse7,
  };
};

const mkAusgangsRE = (f, artikel, menge, einheit, netto, ustPct, skonto = 0) => {
  const kunde = pick(KUNDEN);
  const u = r2(netto * ustPct / 100);
  return {
    typ: "ausgangsrechnung", firma: f, kunde,
    rgnr: augnr(), datum: fakeDatum(-5), lieferdatum: fakeDatum(-7),
    positionen: [{ pos: 1, beschr: artikel, menge, einheit, ep: r2(netto / menge), netto }],
    netto, ustPct, ustBetrag: u, brutto: r2(netto + u),
    zahlungsziel: skonto > 0
      ? `${skonto} % Skonto bei Zahlung bis ${fakeDatum(5)} | Netto 30 Tage bis ${fakeDatum(25)}`
      : `Netto 30 Tage, zahlbar bis ${fakeDatum(25)}`,
  };
};

const mkUeberweisung = (absender, empfaengerName, empfaengerIBAN, betrag, verwendung, skontoBetrag = 0) => ({
  typ: "ueberweisung",
  bank: "BayernOnline Banking",
  absender: { name: absender.name, iban: absender.iban },
  empfaenger: { name: empfaengerName, iban: empfaengerIBAN },
  betrag: r2(betrag), skontoBetrag,
  verwendungszweck: verwendung,
  ausfuehrungsdatum: fakeDatum(0),
});

const mkKontoauszug = (f, buchungen) => ({
  typ: "kontoauszug",
  bank: "Volksbank Bayern eG",
  kontoinhaber: f.name,
  iban: f.iban,
  auszugNr: `${String(new Date().getMonth() + 1).padStart(2, "0")}/2025`,
  buchungen,
});

const mkEmail = (von, vonName, an, betreff, text, datum = fakeDatum(-3)) => ({
  typ: "email", von, vonName, an, betreff, datum, uhrzeit: `${9 + Math.floor(Math.random() * 8)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")} Uhr`, text,
});

// ══════════════════════════════════════════════════════════════════════════════
// AUFGABEN-POOL — nach Klasse + Lernbereich
// ══════════════════════════════════════════════════════════════════════════════
const AUFGABEN_POOL = {
  7: {
    "LB 3 · Einführung Buchführung": [
      {
        id: "7_anlage_kauf_ziel", titel: "Kauf einer Anlage auf Ziel (ohne USt – Einführung)",
        generate: f => {
          const anlagenTyp = pick([
            { art: "Fertigungsmaschine", konto: "07000400", name: "Maschinen und Anlagen" },
            { art: "Lieferwagen", konto: "0840", name: "Fuhrpark (FP)" },
            { art: "Büroausstattung", konto: "0870", name: "Büromöbel und Geschäftsausstattung (BGA)" },
            { art: "Büromaschine (Kopierer)", konto: "0860", name: "Büromaschinen (BM)" },
          ]);
          const b = rnd(5000, 80000, 500);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgendem Geschäftsfall (Einführungsbeispiel – ohne USt).",
            beleg: mkEingangsRE(f, anlagenTyp.art, 1, "Stk", b, 0, false),
            soll: [{ nr: anlagenTyp.konto, name: anlagenTyp.name, betrag: b }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: b }],
            nrPunkte: 0,
            erklaerung: `Anlage wird aktiv (${anlagenTyp.konto} Soll). Zielkauf → Verbindlichkeit entsteht (4400 VE Haben). In Kap. 3 werden zunächst Buchungen ohne Umsatzsteuer eingeübt.`,
          };
        },
      },
      {
        id: "7_kreditaufnahme", titel: "Bankkredit aufnehmen",
        generate: f => {
          const betrag = rnd(20000, 150000, 5000);
          const typ = Math.random() > 0.5 ? "langfristig" : "kurzfristig";
          const konto = typ === "langfristig" ? { nr: "4250", name: "Langfristige Bankverbindlichkeiten (LBKV)" } : { nr: "4200", name: "Kurzfristige Bankverbindlichkeiten (KBKV)" };
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-5), text: "Miete März", betrag: -1200, highlight: false },
              { datum: fakeDatum(-2), text: `Darlehensauszahlung Volksbank Bayern (${typ})`, betrag: betrag, highlight: true },
              { datum: fakeDatum(-1), text: "Lieferantenzahlung", betrag: -3200, highlight: false },
            ]),
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: betrag }],
            haben: [{ nr: konto.nr, name: konto.name, betrag: betrag }],
            nrPunkte: 0,
            erklaerung: `Bankguthaben steigt (2800 BK Soll). Es entsteht eine ${typ}e Bankschuld (${konto.nr} Haben). Kredit = Fremdkapital.`,
          };
        },
      },
      {
        id: "7_kredit_tilgung", titel: "Kredit tilgen (Überweisung an die Bank)",
        generate: f => {
          const betrag = rnd(2000, 20000, 500);
          const typ = Math.random() > 0.5;
          const konto = typ ? { nr: "4250", name: "Langfristige Bankverbindlichkeiten (LBKV)" } : { nr: "4200", name: "Kurzfristige Bankverbindlichkeiten (KBKV)" };
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-4), text: "Eingang Kundenzahlung", betrag: 8400, highlight: false },
              { datum: fakeDatum(-2), text: "Volksbank Bayern – Kreditrate/Tilgung", betrag: -betrag, highlight: true },
              { datum: fakeDatum(0), text: "Büromaterial", betrag: -145, highlight: false },
            ]),
            soll: [{ nr: konto.nr, name: konto.name, betrag: betrag }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: betrag }],
            nrPunkte: 0,
            erklaerung: `Bankschuld sinkt (${konto.nr} Soll). Bankguthaben nimmt ab (2800 BK Haben). Tilgung = Schuldenabbau.`,
          };
        },
      },
      {
        id: "7_barabhebung", titel: "Barabhebung oder Bareinzahlung (Kasse ↔ Bank)",
        generate: f => {
          const betrag = rnd(200, 3000, 50);
          const istAbhebung = Math.random() > 0.4;
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgendem Geschäftsfall.",
            beleg: mkKontoauszug(f, istAbhebung
              ? [
                { datum: fakeDatum(-3), text: "Kundenzahlung", betrag: 4200, highlight: false },
                { datum: fakeDatum(-1), text: `Barabhebung Wechselgeld`, betrag: -betrag, highlight: true },
                { datum: fakeDatum(0), text: "Lieferantenzahlung", betrag: -1800, highlight: false },
              ]
              : [
                { datum: fakeDatum(-3), text: "Lieferantenzahlung", betrag: -2400, highlight: false },
                { datum: fakeDatum(-1), text: `Bareinzahlung auf Girokonto`, betrag: betrag, highlight: true },
                { datum: fakeDatum(0), text: "Kundenzahlung", betrag: 5600, highlight: false },
              ]
            ),
            soll: [{ nr: istAbhebung ? "2880" : "2800", name: istAbhebung ? "Kasse (KA)" : "Bank (BK)", betrag: betrag }],
            haben: [{ nr: istAbhebung ? "2800" : "2880", name: istAbhebung ? "Bank (BK)" : "Kasse (KA)", betrag: betrag }],
            nrPunkte: 0,
            erklaerung: istAbhebung
              ? `Barabhebung: Kasse steigt (2880 KA Soll). Bank nimmt ab (2800 BK Haben). Beide = Aktivkonten.`
              : `Bareinzahlung: Bank steigt (2800 BK Soll). Kasse nimmt ab (2880 KA Haben). Beide = Aktivkonten.`,
          };
        },
      },
      {
        id: "7_gemischte_zahlung_kunde", titel: "Kundenzahlung: Teils bar, teils per Bank",
        generate: f => {
          const k = pick(KUNDEN); const gesamt = rnd(1000, 8000, 100);
          const bar = rnd(100, Math.floor(gesamt * 0.4), 50); const bank = r2(gesamt - bar);
          return {
            aufgabe: "Bilden Sie den zusammengesetzten Buchungssatz zu folgendem Geschäftsfall.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-5), text: "Büromieteingang", betrag: 950, highlight: false },
              { datum: fakeDatum(-2), text: `${k.name} – Teilzahlung Rechnung`, betrag: bank, highlight: true },
              { datum: fakeDatum(-1), text: "Lieferant Überweisung", betrag: -3100, highlight: false },
            ]),
            aufgabeZusatz: `Zusätzlich: ${k.name} zahlt ${fmt(bar)} € bar (Kasse).`,
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: bank }, { nr: "2880", name: "Kasse (KA)", betrag: bar }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: gesamt }],
            nrPunkte: 0,
            erklaerung: `Forderung erlischt komplett (1400 Haben, ${fmt(gesamt)} €). Bankeingang (1200 Soll, ${fmt(bank)} €). Bareingang (1000 Soll, ${fmt(bar)} €). Zusammengesetzter Buchungssatz.`,
          };
        },
      },
      {
        id: "7_ek_rs_brutto", titel: "Einkauf Rohstoffe auf Ziel (Bruttobetrag gegeben)",
        generate: f => {
          const art = pick(f.rohstoffe); const menge = rnd(100, 1000, 50); const n = rnd(500, 8000); const u = r2(n * 0.19); const b = r2(n + u);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, art, menge, "Stk", n, 19, true),
            nebenrechnungen: [{ label: "Nettowert", formel: `${fmt(b)} ÷ 1,19`, ergebnis: `${fmt(n)} €` }, { label: "Vorsteuer", formel: `${fmt(b)} − ${fmt(n)}`, ergebnis: `${fmt(u)} €` }],
            soll: [{ nr: "6000", name: "Aufwend. Rohstoffe (AWR)", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: b }],
            nrPunkte: 1, erklaerung: `Kl. 7: Bruttobetrag gegeben → Netto = Brutto ÷ 1,19 (+1 NR-Punkt). Aufwend. Rohstoffe (6000 AWR Soll). Vorsteuer (2600 VORST Soll). Verbindlichkeit brutto (4400 VE Haben).`,
          };
        },
      },
      {
        id: "7_ek_fb_brutto", titel: "Einkauf Fremdbauteile auf Ziel (Bruttobetrag gegeben)",
        generate: f => {
          const art = pick(f.fremdbauteile); const menge = rnd(50, 500, 10); const n = rnd(400, 6000); const u = r2(n * 0.19); const b = r2(n + u);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, art, menge, "Stk", n, 19, true),
            nebenrechnungen: [{ label: "Nettowert", formel: `${fmt(b)} ÷ 1,19`, ergebnis: `${fmt(n)} €` }, { label: "Vorsteuer", formel: `${fmt(b)} − ${fmt(n)}`, ergebnis: `${fmt(u)} €` }],
            soll: [{ nr: "6010", name: "Aufwend. Fremdbauteile (AWF)", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: b }],
            nrPunkte: 1, erklaerung: "Brutto ÷ 1,19 = Netto. Fremdbauteile (3100 Soll). Vorsteuer (2600 VORST Soll). Verbindlichkeit (4400 VE Haben).",
          };
        },
      },
      {
        id: "7_zahlung_vbl", titel: "Überweisung an Lieferanten",
        generate: f => {
          const lief = pick(LIEFERANTEN); const b = rnd(500, 6000); const nr = rgnr();
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Online-Überweisung.",
            beleg: mkUeberweisung(f, lief.name, lief.iban, b, `${nr} vom ${fakeDatum(-30)}`),
            soll: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: b }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: b }],
            nrPunkte: 0, erklaerung: "Verbindlichkeit erlischt (4400 VE Soll). Bank nimmt ab (2800 BK Haben).",
          };
        },
      },
      {
        id: "7_zahlung_ford", titel: "Kundenüberweisung eingehend",
        generate: f => {
          const k = pick(KUNDEN); const b = rnd(500, 6000);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-5), text: "Büromiete März", betrag: -850, highlight: false },
              { datum: fakeDatum(-2), text: `${k.name}, ${augnr()}`, betrag: b, highlight: true },
              { datum: fakeDatum(-1), text: "GEZ Rundfunkbeitrag", betrag: -55.08, highlight: false },
            ]),
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: b }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: b }],
            nrPunkte: 0, erklaerung: "Bankguthaben steigt (2800 BK Soll). Forderung erlischt (2400 FO Haben).",
          };
        },
      },
    ],
    "LB 5 · Jahresabschluss": [
      {
        id: "7_guv_erfolg", titel: "GUV-Erfolg ermitteln (Gewinn oder Verlust)",
        taskTyp: "rechnung",
        generate: f => {
          const isGewinn = Math.random() > 0.4;
          const basis = rnd(300000, 900000, 5000);
          const delta = rnd(15000, 120000, 5000);
          const aufwand = isGewinn ? basis : r2(basis + delta);
          const ertrag = isGewinn ? r2(basis + delta) : basis;
          const erfolg = r2(Math.abs(ertrag - aufwand));
          const typ = ertrag > aufwand ? "Gewinn" : "Verlust";
          return {
            aufgabe: `Im Geschäftsjahr betrugen die Aufwendungen ${fmt(aufwand)} € und die Erträge ${fmt(ertrag)} €. Ermitteln Sie Art und Höhe des Erfolgs und bilden Sie den Abschlussbuchungssatz für das GUV-Konto.`,
            beleg: null,
            schema: [
              { label: typ === "Gewinn" ? "Erträge (gesamt)" : "Aufwendungen (gesamt)", wert: typ === "Gewinn" ? ertrag : aufwand, einheit: "€" },
              { label: typ === "Gewinn" ? "− Aufwendungen (gesamt)" : "− Erträge (gesamt)", wert: typ === "Gewinn" ? aufwand : ertrag, einheit: "€" },
              { label: `= ${typ}`, wert: erfolg, einheit: "€", bold: true, highlight: typ === "Gewinn", trennlinie: true },
              { label: `Abschlussbuchung: ${typ === "Gewinn" ? "GUV an EK" : "EK an GUV"}`, wert: erfolg, einheit: "€", bold: true },
            ],
            nrPunkte: 3,
            erklaerung: `${typ === "Gewinn" ? "Erträge > Aufwendungen → Gewinn" : "Aufwendungen > Erträge → Verlust"}. ${typ}: ${fmt(erfolg)} €. Buchungssatz: ${typ === "Gewinn" ? "GUV " + fmt(erfolg) + " € an EK " + fmt(erfolg) + " €" : "EK " + fmt(erfolg) + " € an GUV " + fmt(erfolg) + " €"}.`,
          };
        },
      },
      {
        id: "7_ek_vergleich", titel: "Erfolg aus EK-Veränderung ermitteln",
        taskTyp: "rechnung",
        generate: f => {
          const ekab = rnd(150000, 700000, 5000);
          const isGewinn = Math.random() > 0.35;
          const delta = rnd(10000, 100000, 5000);
          const eksb = isGewinn ? r2(ekab + delta) : r2(ekab - delta);
          const typ = eksb > ekab ? "Gewinn" : "Verlust";
          const erfolg = r2(Math.abs(eksb - ekab));
          return {
            aufgabe: `Das Eigenkapital betrug zu Beginn des Geschäftsjahres ${fmt(ekab)} €. Am Jahresende beträgt es laut Schlussbilanz ${fmt(eksb)} €. Ermitteln Sie Art und Höhe des Erfolgs.`,
            beleg: null,
            schema: [
              { label: "EK-Schlussbestand (31.12.)", wert: eksb, einheit: "€" },
              { label: "− EK-Anfangsbestand (01.01.)", wert: ekab, einheit: "€" },
              { label: `= ${typ}`, wert: erfolg, einheit: "€", bold: true, highlight: typ === "Gewinn", trennlinie: true },
            ],
            nrPunkte: 2,
            erklaerung: `EK-Zunahme → Gewinn, EK-Abnahme → Verlust. Hier: ${fmt(eksb)} − ${fmt(ekab)} = ${typ} von ${fmt(erfolg)} €.`,
          };
        },
      },
      {
        id: "7_inventurdifferenz", titel: "Inventurdifferenz berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const artikel = pick(["Rohstoffe", "Hilfsstoffe", "Fertigerzeugnisse", "Betriebsstoffe", "Fremdbauteile"]);
          const ab = rnd(15000, 60000, 1000);
          const kauf = rnd(30000, 120000, 1000);
          const verbrauch = rnd(25000, 100000, 1000);
          const soll = r2(ab + kauf - verbrauch);
          const diffBetrag = rnd(100, 800, 50);
          const isNegativ = Math.random() > 0.35;
          const ist = isNegativ ? r2(soll - diffBetrag) : r2(soll + diffBetrag);
          const diffAbs = r2(Math.abs(soll - ist));
          const diffTyp = ist < soll ? "Minderbestand" : "Mehrbestand";
          return {
            aufgabe: `Berechnen Sie Soll- und Istbestand sowie die Inventurdifferenz bei ${artikel}. Anfangsbestand: ${fmt(ab)} €, Zugänge (Einkäufe): ${fmt(kauf)} €, Verbrauch laut Buchhaltung: ${fmt(verbrauch)} €, Istbestand laut Inventur: ${fmt(ist)} €.`,
            beleg: null,
            schema: [
              { label: "Anfangsbestand (01.01.)", wert: ab, einheit: "€" },
              { label: "+ Zugänge (Einkäufe)", wert: kauf, einheit: "€" },
              { label: "− Verbrauch (laut Buchhaltung)", wert: verbrauch, einheit: "€" },
              { label: "= Sollbestand (laut Buchhaltung)", wert: soll, einheit: "€", bold: true, trennlinie: true },
              { label: "− Istbestand (laut Inventur)", wert: ist, einheit: "€" },
              { label: `= Inventurdifferenz (${diffTyp})`, wert: diffAbs, einheit: "€", bold: true },
            ],
            nrPunkte: 4,
            erklaerung: `Sollbestand = AB + Zugänge − Verbrauch = ${fmt(soll)} €. Istbestand lt. Inventur: ${fmt(ist)} €. Differenz: ${fmt(diffAbs)} € (${diffTyp}). Mögliche Ursachen: Diebstahl, Buchungsfehler, Zählfehler bei Inventur.`,
          };
        },
      },
    ],
    "LB 4 · Betrieblicher Produktionsprozess": [
      {
        id: "7_ek_hs_brutto", titel: "Einkauf Hilfsstoffe auf Ziel (Bruttobetrag gegeben)",
        generate: f => {
          const art = pick(f.hilfsstoffe); const n = rnd(200, 2000); const u = r2(n * 0.19); const b = r2(n + u);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, art, rnd(10, 100, 5), "Stk", n, 19, true),
            nebenrechnungen: [{ label: "Nettowert", formel: `${fmt(b)} ÷ 1,19`, ergebnis: `${fmt(n)} €` }, { label: "Vorsteuer", formel: `${fmt(b)} − ${fmt(n)}`, ergebnis: `${fmt(u)} €` }],
            soll: [{ nr: "6020", name: "Aufwend. Hilfsstoffe (AWH)", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: b }],
            nrPunkte: 1, erklaerung: "Hilfsstoffe (3200 Soll). Vorsteuer (2600 VORST Soll). Verbindlichkeit (4400 VE Haben). Brutto ÷ 1,19 = Netto.",
          };
        },
      },
      {
        id: "7_ek_bs_brutto", titel: "Einkauf Betriebsstoffe (Bruttobetrag gegeben)",
        generate: f => {
          const art = pick(f.betriebsstoffe); const n = rnd(100, 1500); const u = r2(n * 0.19); const b = r2(n + u);
          const via = Math.random() > 0.5 ? "BK" : "VE";
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, art, rnd(5, 50, 5), "Stk", n, 19, true),
            nebenrechnungen: [{ label: "Nettowert", formel: `${fmt(b)} ÷ 1,19`, ergebnis: `${fmt(n)} €` }, { label: "Vorsteuer", formel: `${fmt(b)} − ${fmt(n)}`, ergebnis: `${fmt(u)} €` }],
            soll: [{ nr: "6030", name: "Aufwend. Betriebsstoffe (AWB)", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: via === "BK" ? "2800" : "4400", name: via === "BK" ? "Bank (BK)" : "Verbindlichkeiten aus L+L (VE)", betrag: b }],
            nrPunkte: 1, erklaerung: `Betriebsstoffe z. B. Öl, Strom, Reinigungsmittel = kein Bestandteil des Produkts (3300 AWB Soll). Vorsteuer (2600 VORST Soll). ${via === "BK" ? "Zahlung per Bank (2800 BK Haben)." : "Zielkauf → Verbindlichkeit (4400 VE Haben)."}`,
          };
        },
      },
      {
        id: "7_ek_rs_bar", titel: "Einkauf Rohstoffe gegen Barzahlung (Bruttobetrag)",
        generate: f => {
          const art = pick(f.rohstoffe); const menge = rnd(10, 100, 5); const n = rnd(200, 3000); const u = r2(n * 0.19); const b = r2(n + u);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung (Barzahlung).",
            beleg: mkEingangsRE(f, art, menge, "Stk", n, 19, true),
            nebenrechnungen: [{ label: "Nettowert", formel: `${fmt(b)} ÷ 1,19`, ergebnis: `${fmt(n)} €` }, { label: "Vorsteuer", formel: `${fmt(b)} − ${fmt(n)}`, ergebnis: `${fmt(u)} €` }],
            soll: [{ nr: "6000", name: "Aufwend. Rohstoffe (AWR)", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "2880", name: "Kasse (KA)", betrag: b }],
            nrPunkte: 1, erklaerung: `Aufwend. Rohstoffe (6000 AWR Soll). Vorsteuer (2600 VORST Soll). Barzahlung: Kasse nimmt ab (2880 KA Haben). Kasse-Haben = Abgang.`,
          };
        },
      },
      {
        id: "7_vk_fe", titel: "Verkauf Fertigerzeugnisse auf Ziel",
        generate: f => {
          const art = pick(f.fertigerzeugnisse); const menge = rnd(5, 50, 1); const n = rnd(1000, 15000, 100); const u = r2(n * 0.19);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Ausgangsrechnung.",
            beleg: mkAusgangsRE(f, art, menge, "Stk", n, 19),
            soll: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: r2(n + u) }],
            haben: [{ nr: "5000", name: "Umsatzerlöse FE (UEFE)", betrag: n }, { nr: "4800", name: "Umsatzsteuer (UST)", betrag: u }],
            nrPunkte: 0, erklaerung: "Forderung = Bruttobetrag (2400 FO Soll). Umsatzerlöse FE (6000 Haben). USt-Schuld (4400 Haben).",
          };
        },
      },
      {
        id: "7_vk_fe_rabatt", titel: "Verkauf Fertigerzeugnisse mit Rabatt",
        taskTyp: "rechnung",
        generate: f => {
          const art = pick(f.fertigerzeugnisse); const menge = rnd(5, 30, 1);
          const listenEP = rnd(200, 2000, 50);
          const listenGesamt = r2(menge * listenEP);
          const rabattPct = [5, 10, 15, 20][Math.floor(Math.random()*4)];
          const rabatt = r2(listenGesamt * rabattPct / 100);
          const netto = r2(listenGesamt - rabatt);
          const ust = r2(netto * 0.19);
          const brutto = r2(netto + ust);
          return {
            aufgabe: `${f.name} verkauft ${menge} Stück „${art}" an einen Kunden. Listenpreis: ${fmt(listenEP)} € je Stück. Dem Kunden wird ein Rabatt von ${rabattPct} % gewährt. Erstellen Sie die Kalkulation und bilden Sie den Buchungssatz.`,
            beleg: null,
            schema: [
              { label: `Listenverkaufspreis (${menge} × ${fmt(listenEP)} €)`, wert: listenGesamt, einheit: "€" },
              { label: `− Rabatt (${rabattPct} %)`, wert: rabatt, einheit: "€" },
              { label: "= Nettobetrag (Zieleinkaufspreis)", wert: netto, einheit: "€", bold: true, trennlinie: true },
              { label: "+ Umsatzsteuer 19 %", wert: ust, einheit: "€" },
              { label: "= Bruttobetrag (Rechnungsbetrag)", wert: brutto, einheit: "€", bold: true },
              { label: "Buchungssatz: FO (brutto) an UEFE (netto) + UST", wert: " ", einheit: "" },
            ],
            nebenrechnungen: [
              { label: `Rabatt (${rabattPct} %)`, formel: `${fmt(listenGesamt)} × ${rabattPct} %`, ergebnis: `${fmt(rabatt)} €` },
              { label: "USt (19 %)", formel: `${fmt(netto)} × 19 %`, ergebnis: `${fmt(ust)} €` },
            ],
            soll: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: brutto }],
            haben: [{ nr: "5000", name: "Umsatzerlöse FE (UEFE)", betrag: netto }, { nr: "4800", name: "Umsatzsteuer (UST)", betrag: ust }],
            nrPunkte: 3,
            erklaerung: `Rabatt wird nicht gebucht — nur der verminderte Nettobetrag (${fmt(netto)} €) kommt auf UEFE. Forderung = Bruttobetrag (${fmt(brutto)} €). USt (4400 Haben).`,
          };
        },
      },
      {
        id: "7_vk_anlage", titel: "Verkauf einer gebrauchten Anlage (Bruttobetrag)",
        generate: f => {
          const anlage = pick(f.anlagen);
          const buchwert = rnd(1000, 15000, 500);
          const u = r2(buchwert * 0.19); const brutto = r2(buchwert + u);
          // Anlage wird zum Buchwert verkauft (kein Gewinn/Verlust — Kl.7 vereinfacht)
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Ausgangsrechnung (Verkauf einer gebrauchten Anlage).",
            beleg: mkAusgangsRE(f, `Gebrauchte ${anlage}`, 1, "Stk", buchwert, 19),
            nebenrechnungen: [{ label: "Nettowert", formel: `${fmt(brutto)} ÷ 1,19`, ergebnis: `${fmt(buchwert)} €` }, { label: "USt", formel: `${fmt(brutto)} − ${fmt(buchwert)}`, ergebnis: `${fmt(u)} €` }],
            soll: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: brutto }],
            haben: [{ nr: "0700", name: "Maschinen und Anlagen (MA)", betrag: buchwert }, { nr: "4800", name: "Umsatzsteuer (UST)", betrag: u }],
            nrPunkte: 1, erklaerung: `Anlage verlässt das Unternehmen (0400 Haben, Buchwert ${fmt(buchwert)} €). Forderung = Bruttobetrag (2400 FO Soll). USt-Schuld (4400 Haben).`,
          };
        },
      },
    ],

    "Kontenabschluss": [
      {
        id: "7_abs_aktivkonto", titel: "Aktivkonto über SBK abschließen",
        generate: f => {
          const konten = [
            { nr: "2800", kürzel: "BK",   name: "Bank (BK)",                      sb: rnd(5000,50000,500) },
            { nr: "2880", kürzel: "KA",   name: "Kasse (KA)",                     sb: rnd(500,4000,100) },
            { nr: "2400", kürzel: "FO",   name: "Forderungen aus L+L (FO)",       sb: rnd(3000,20000,500) },
            { nr: "0700", kürzel: "MA",   name: "Maschinen und Anlagen (MA)",     sb: rnd(10000,80000,1000) },
          ];
          const k = pick(konten);
          return {
            aufgabe: `Das aktive Bestandskonto ${k.nr} ${k.kürzel} hat am Jahresende einen Schlussbestand von ${fmt(k.sb)} €. Schließen Sie das Konto ab (Buchungssatz).`,
            beleg: null,
            soll: [{ nr: "8010", name: "Schlussbilanzkonto (SBK)", betrag: k.sb }],
            haben: [{ nr: k.nr, name: k.name, betrag: k.sb }],
            nrPunkte: 0,
            erklaerung: `Aktive Bestandskonten: Schlussbestand auf HABEN-Seite (Ausgleich). Buchung: SBK an ${k.kürzel} ${fmt(k.sb)} €.`,
          };
        },
      },
      {
        id: "7_abs_passivkonto", titel: "Passivkonto über SBK abschließen",
        generate: f => {
          const konten = [
            { nr: "4400", kürzel: "VE",   name: "Verbindlichkeiten aus L+L (VE)", sb: rnd(2000,12000,500) },
            { nr: "4250", kürzel: "LBKV", name: "Langfr. Bankverbindlichk. (LBKV)", sb: rnd(10000,60000,1000) },
            { nr: "4800", kürzel: "UST",  name: "Umsatzsteuer (UST)",              sb: rnd(500,6000,100) },
          ];
          const k = pick(konten);
          return {
            aufgabe: `Das passive Bestandskonto ${k.nr} ${k.kürzel} hat am Jahresende einen Schlussbestand von ${fmt(k.sb)} €. Schließen Sie das Konto ab.`,
            beleg: null,
            soll: [{ nr: k.nr, name: k.name, betrag: k.sb }],
            haben: [{ nr: "8010", name: "Schlussbilanzkonto (SBK)", betrag: k.sb }],
            nrPunkte: 0,
            erklaerung: `Passive Bestandskonten: Schlussbestand auf SOLL-Seite (Ausgleich). Buchung: ${k.kürzel} an SBK ${fmt(k.sb)} €.`,
          };
        },
      },
      {
        id: "7_abs_aufwandskonto", titel: "Aufwandskonto über GUV abschließen",
        generate: f => {
          const konten = [
            { nr: "6000", kürzel: "AWR",  name: "Aufwend. Rohstoffe (AWR)" },
            { nr: "6020", kürzel: "AWH",  name: "Aufwend. Hilfsstoffe (AWH)" },
            { nr: "6030", kürzel: "AWB",  name: "Aufwend. Betriebsstoffe (AWB)" },
            { nr: "6200", kürzel: "LG",   name: "Löhne und Gehälter (LG)" },
          ];
          const k = pick(konten); const betrag = rnd(3000,40000,500);
          return {
            aufgabe: `Das Aufwandskonto ${k.nr} ${k.kürzel} weist am Jahresende einen Gesamtbetrag von ${fmt(betrag)} € auf. Schließen Sie es über das GUV-Konto ab.`,
            beleg: null,
            soll: [{ nr: "8020", name: "Gewinn- und Verlustkonto (GUV)", betrag }],
            haben: [{ nr: k.nr, name: k.name, betrag }],
            nrPunkte: 0,
            erklaerung: `Aufwandskonten haben Soll-Saldo → Ausgleich auf HABEN. Buchung: GUV an ${k.kürzel} ${fmt(betrag)} €. Aufwand erscheint im GUV auf der SOLL-Seite.`,
          };
        },
      },
      {
        id: "7_abs_ertragskonto", titel: "Ertragskonto über GUV abschließen",
        generate: f => {
          const konten = [
            { nr: "5000", kürzel: "UEFE", name: "Umsatzerlöse FE (UEFE)" },
            { nr: "5430", kürzel: "ASBE", name: "Andere betr. Erträge (ASBE)" },
          ];
          const k = pick(konten); const betrag = rnd(10000,80000,1000);
          return {
            aufgabe: `Das Ertragskonto ${k.nr} ${k.kürzel} weist am Jahresende ${fmt(betrag)} € auf. Schließen Sie es über das GUV-Konto ab.`,
            beleg: null,
            soll: [{ nr: k.nr, name: k.name, betrag }],
            haben: [{ nr: "8020", name: "Gewinn- und Verlustkonto (GUV)", betrag }],
            nrPunkte: 0,
            erklaerung: `Ertragskonten haben Haben-Saldo → Ausgleich auf SOLL. Buchung: ${k.kürzel} an GUV ${fmt(betrag)} €. Ertrag erscheint im GUV auf der HABEN-Seite.`,
          };
        },
      },
      {
        id: "7_abs_guv", titel: "GUV abschließen — Gewinn oder Verlust buchen",
        taskTyp: "rechnung",
        generate: f => {
          const isGewinn = Math.random() > 0.35;
          const aufwand = rnd(80000,300000,5000);
          const delta = rnd(5000,60000,2500);
          const ertrag = isGewinn ? r2(aufwand+delta) : r2(aufwand-delta);
          const erfolg = r2(Math.abs(ertrag-aufwand));
          const typ = ertrag > aufwand ? "Gewinn" : "Verlust";
          return {
            aufgabe: `Das GUV-Konto zeigt: Aufwendungen (Soll-Seite) ${fmt(aufwand)} €, Erträge (Haben-Seite) ${fmt(ertrag)} €. Ermitteln Sie Art und Höhe des Erfolgs und bilden Sie den Abschlussbuchungssatz für das GUV-Konto.`,
            beleg: null,
            schema: [
              { label: "Erträge (GUV Haben)", wert: ertrag, einheit: "€" },
              { label: "− Aufwendungen (GUV Soll)", wert: aufwand, einheit: "€" },
              { label: `= ${typ}`, wert: erfolg, einheit: "€", bold: true, highlight: isGewinn, trennlinie: true },
              { label: `Buchungssatz: ${typ === "Gewinn" ? "GUV an EK" : "EK an GUV"}`, wert: erfolg, einheit: "€", bold: true },
            ],
            soll: typ === "Gewinn" ? [{ nr: "8020", name: "GUV", betrag: erfolg }] : [{ nr: "3000", name: "Eigenkapital (EK)", betrag: erfolg }],
            haben: typ === "Gewinn" ? [{ nr: "3000", name: "Eigenkapital (EK)", betrag: erfolg }] : [{ nr: "8020", name: "GUV", betrag: erfolg }],
            nrPunkte: 3,
            erklaerung: `${typ === "Gewinn" ? "Erträge > Aufwendungen → Gewinn → EK wächst: GUV an EK" : "Aufwendungen > Erträge → Verlust → EK schrumpft: EK an GUV"}. Betrag: ${fmt(erfolg)} €.`,
          };
        },
      },
    ],
    "Theorie · Grundbegriffe": [
      {
        id: "7_th_buchfuehrung_zweck", titel: "Zweck der Buchführung",
        taskTyp: "theorie", themenTyp: "freitext",
        generate: () => ({
          aufgabe: "Nennen Sie drei Gründe, warum Kaufleute zur Buchführung verpflichtet sind.",
          freitext: { zeilen: 4,
            loesung: `1. Gesetzliche Pflicht (HGB, AO) – Kaufleute müssen Bücher führen.
2. Grundlage für die Steuerberechnung gegenüber dem Finanzamt.
3. Informationsquelle für Eigentümer, Banken und Gläubiger über die finanzielle Lage des Unternehmens.`,
          }, nrPunkte: 3,
        }),
      },
      {
        id: "7_th_bilanz_seiten", titel: "Aufbau der Bilanz – Aktiva und Passiva",
        taskTyp: "theorie", themenTyp: "zuordnung",
        generate: () => ({
          aufgabe: "Ordnen Sie die Begriffe der richtigen Bilanzseite zu.",
          zuordnung: { paare: [
            { term: "Aktiva (Vermögen)",   def: "Mittelverwendung – zeigt, worin das Kapital angelegt ist" },
            { term: "Passiva (Kapital)",   def: "Mittelherkunft – zeigt, woher das Kapital stammt" },
            { term: "Eigenkapital",        def: "Kapital der Eigentümer (steht auf der Passivseite)" },
            { term: "Fremdkapital",        def: "Schulden des Unternehmens gegenüber Gläubigern" },
            { term: "Anlagevermögen",      def: "Dauerhaft im Betrieb eingesetztes Vermögen (z. B. Maschinen)" },
            { term: "Umlaufvermögen",      def: "Kurzfristig wechselndes Vermögen (z. B. Waren, Kasse, Bank)" },
          ]}, nrPunkte: 6,
        }),
      },
      {
        id: "7_th_buchungssatz_regeln", titel: "Grundregel des Buchens",
        taskTyp: "theorie", themenTyp: "lueckentext",
        generate: () => ({
          aufgabe: "Ergänzen Sie den Lückentext zu den Buchungsregeln.",
          lueckentext: {
            text: "Jeder Buchungssatz lautet: {0} an {1}. Dabei wird immer zuerst das {2}-Konto genannt. Ein Konto, das auf der Aktivseite der Bilanz steht, wird durch eine Buchung im {3} größer und durch eine Buchung im {4} kleiner. Eigenkapital steht auf der {5} der Bilanz.",
            luecken: ["Soll-Konto", "Haben-Konto", "Soll", "Soll", "Haben", "Passivseite"],
            wortbank: ["Aktivseite", "Haben", "Haben-Konto", "Passivseite", "Soll", "Soll-Konto"],
          }, nrPunkte: 6,
        }),
      },
      {
        id: "7_th_inventur", titel: "Inventur und Inventar",
        taskTyp: "theorie", themenTyp: "freitext",
        generate: () => ({
          aufgabe: "Erklären Sie den Unterschied zwischen Inventur, Inventar und Bilanz.",
          freitext: { zeilen: 5,
            loesung: `Inventur: Körperliche Bestandsaufnahme aller Vermögensgegenstände und Schulden zu einem Stichtag (Zählen, Messen, Wiegen).
Inventar: Schriftliches Verzeichnis (Liste) aller Ergebnisse der Inventur mit Mengen und Werten.
Bilanz: Gegenüberstellung von Vermögen (Aktiva) und Kapital (Passiva) in Kontoform – verdichtete Kurzfassung des Inventars.`,
          }, nrPunkte: 3,
        }),
      },
      {
        id: "7_th_bestandskonten", titel: "Bestandskonten – Aktiv und Passiv",
        taskTyp: "theorie", themenTyp: "mc",
        generate: () => ({
          aufgabe: "Beantworten Sie die folgenden Fragen zu Bestandskonten.",
          mc: { fragen: [
            { frage: "Auf welcher Seite eines Aktivkontos wird der Anfangsbestand eingetragen?",
              optionen: ["Haben", "Soll", "Beide Seiten", "Weder noch"], richtig: 1 },
            { frage: "Welche Buchung vergrößert ein Passivkonto?",
              optionen: ["Buchung im Soll", "Buchung im Haben", "Buchung auf beiden Seiten", "Keine Buchung"], richtig: 1 },
            { frage: "Was zeigt das Schlussbilanzkonto (SBK)?",
              optionen: ["Den Jahresgewinn", "Die Endbestände aller Bestandskonten", "Nur die Schulden", "Den Umsatz"], richtig: 1 },
          ]}, nrPunkte: 3,
        }),
      },
    ],
  },
  8: {
    "LB 2 · Werkstoffe & Einkauf": [
      {
        id: "8_ek_rs_netto", titel: "Einkauf Werkstoffe auf Ziel (Nettobetrag)",
        generate: (f, opts = {}) => {
          const wt = WERKSTOFF_TYPEN.find(w => w.id === (opts.werkstoffId || "rohstoffe")) || WERKSTOFF_TYPEN[0];
          const art = pick(f[wt.key] || f.rohstoffe); const menge = rnd(100, 1000, 50); const n = rnd(800, 12000); const u = r2(n * 0.19);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, art, menge, "Stk", n, 19, false),
            soll: [{ nr: wt.aw.nr, name: wt.aw.name, betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: r2(n + u) }],
            nrPunkte: 0, erklaerung: `Ab Kl. 8 steht Netto auf der Rechnung. ${wt.aw.name} (${wt.aw.nr} ${wt.aw.kürzel} Soll). Vorsteuer (2600 VORST Soll). Verbindlichkeit (4400 VE Haben).`,
          };
        },
      },
      {
        id: "8_bezugskosten", titel: "Einkauf Werkstoffe mit Bezugskosten",
        generate: (f, opts = {}) => {
          const wt = WERKSTOFF_TYPEN.find(w => w.id === (opts.werkstoffId || "rohstoffe")) || WERKSTOFF_TYPEN[0];
          const art = pick(f[wt.key] || f.rohstoffe); const menge = rnd(100, 500, 50); const warenwert = rnd(2000, 10000); const bzk = rnd(100, 500, 10);
          const netto = warenwert + bzk; const u = r2(netto * 0.19);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung (inkl. Transportkosten).",
            beleg: mkEingangsRE(f, art, menge, "Stk", warenwert, 19, false, 0, bzk),
            nebenrechnungen: [{ label: "Nettosumme", formel: `${fmt(warenwert)} € + ${fmt(bzk)} €`, ergebnis: `${fmt(netto)} €` }, { label: "Vorsteuer (19 %)", formel: `${fmt(netto)} € × 19 %`, ergebnis: `${fmt(u)} €` }],
            soll: [{ nr: wt.aw.nr, name: wt.aw.name, betrag: warenwert }, { nr: wt.bzk.nr, name: wt.bzk.name, betrag: bzk }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: r2(netto + u) }],
            nrPunkte: 1, erklaerung: `Warenwert → ${wt.aw.nr} ${wt.aw.kürzel}. Bezugskosten → ${wt.bzk.nr} ${wt.bzk.kürzel}. Vorsteuer auf Gesamtnetto. Verbindlichkeit = Gesamtbrutto.`,
          };
        },
      },
      {
        id: "8_skonto_ek", titel: "Zahlung mit Lieferantenskonto",
        generate: (f, opts = {}) => {
          const wt = WERKSTOFF_TYPEN.find(w => w.id === (opts.werkstoffId || "rohstoffe")) || WERKSTOFF_TYPEN[0];
          const lief = pick(LIEFERANTEN); const brutto = rnd(2000, 10000, 100); const nr = rgnr();
          const skPct = pick([2, 3]); const skB = r2(brutto * skPct / 100); const skN = r2(skB / 1.19); const skU = r2(skB - skN); const zahl = r2(brutto - skB);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Online-Überweisung.",
            beleg: mkUeberweisung(f, lief.name, lief.iban, zahl, `${nr} (${skPct} % Skonto abgezogen)`, skB),
            nebenrechnungen: [{ label: `Brutto-Skonto (${skPct} %)`, formel: `${fmt(brutto)} € × ${skPct} %`, ergebnis: `${fmt(skB)} €` }, { label: "Überweisungsbetrag", formel: `${fmt(brutto)} € − ${fmt(skB)} €`, ergebnis: `${fmt(zahl)} €` }, { label: "Netto-Skonto", formel: `${fmt(skB)} € ÷ 1,19`, ergebnis: `${fmt(skN)} €` }, { label: "VSt-Korrektur", formel: `${fmt(skB)} € − ${fmt(skN)} €`, ergebnis: `${fmt(skU)} €` }],
            soll: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: brutto }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: zahl }, { nr: wt.nl.nr, name: wt.nl.name, betrag: skN }, { nr: "2600", name: "Vorsteuer (VORST-Korrektur)", betrag: skU }],
            nrPunkte: 2, erklaerung: `Verbindlichkeit erlischt (4400 Soll, ${fmt(brutto)} €). Bank nur ${fmt(zahl)} €. Skonto = Preisminderung → ${wt.nl.nr} ${wt.nl.kürzel} (nicht ${wt.aw.kürzel}!). VORST-Korrektur: Brutto-Skonto ÷ 1,19 = Netto; Differenz = VORST.`,
          };
        },
      },
      {
        id: "8_rueck_ek", titel: "Rücksendung an Lieferanten",
        generate: (f, opts = {}) => {
          const wt = WERKSTOFF_TYPEN.find(w => w.id === (opts.werkstoffId || "rohstoffe")) || WERKSTOFF_TYPEN[0];
          const art = pick(f[wt.key] || f.rohstoffe); const lief = pick(LIEFERANTEN); const n = rnd(500, 4000); const u = r2(n * 0.19); const nr = rgnr();
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
            beleg: mkEmail(`buchhaltung@${lief.name.toLowerCase().replace(/\s/g, "")}.de`, lief.name, f.email,
              `Gutschrift zu ${nr} – Rücksendung ${art}`,
              `Sehr geehrte Damen und Herren,\n\nwie telefonisch besprochen, senden wir Ihnen ${art} wegen festgestellter Qualitätsmängel zurück.\n\nWir haben Ihnen heute eine Gutschrift in Höhe von ${fmt(r2(n + u))} € (netto ${fmt(n)} € + 19 % USt ${fmt(u)} €) ausgestellt.\n\nMit freundlichen Grüßen\n${lief.name}`),
            soll: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: r2(n + u) }],
            haben: [{ nr: wt.aw.nr, name: wt.aw.name, betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            nrPunkte: 0, erklaerung: `Rücksendung = Storno! Ursprünglichen Buchungssatz (${wt.aw.kürzel} Soll, VORST Soll / VE Haben) umkehren: VE Soll, ${wt.aw.kürzel} Haben, VORST Haben. Nicht mit Nachlass verwechseln – dort käme ${wt.nl.kürzel}!`,
          };
        },
      },
      {
        id: "8_nachlass_ek", titel: "Nachträglicher Preisnachlass (Einkauf)",
        generate: (f, opts = {}) => {
          const wt = WERKSTOFF_TYPEN.find(w => w.id === (opts.werkstoffId || "rohstoffe")) || WERKSTOFF_TYPEN[0];
          const art = pick(f[wt.key] || f.rohstoffe); const lief = pick(LIEFERANTEN); const n = rnd(300, 2000, 50); const u = r2(n * 0.19); const nr = rgnr();
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
            beleg: mkEmail(`vertrieb@${lief.name.toLowerCase().replace(/\s/g, "")}.de`, lief.name, f.email,
              `Nachträglicher Preisnachlass – ${art} (${nr})`,
              `Sehr geehrte Damen und Herren,\n\naufgrund der festgestellten Qualitätsabweichungen bei ${art} gewähren wir Ihnen nachträglich einen Preisnachlass von ${fmt(n)} € (netto) zzgl. ${fmt(u)} € USt (19 %).\n\nDie entsprechende Gutschrift (Gesamt: ${fmt(r2(n + u))} €) wird Ihrer Verbindlichkeit gutgeschrieben.\n\nMit freundlichen Grüßen\n${lief.name}`),
            soll: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: r2(n + u) }],
            haben: [{ nr: wt.nl.nr, name: wt.nl.name, betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            nrPunkte: 0, erklaerung: `Nachträglicher Preisnachlass = Einstandspreisminderung → ${wt.nl.nr} ${wt.nl.kürzel} (nicht ${wt.aw.kürzel}!). Verbindlichkeit sinkt (4400 VE Soll). VORST wird korrigiert (2600 Haben).`,
          };
        },
      },
      {
        id: "8_einkaufskalkulation_staffel", titel: "Einkaufskalkulation mit Staffelrabatt",
        taskTyp: "rechnung",
        generate: (f, opts = {}) => {
          const wt = WERKSTOFF_TYPEN.find(w => w.id === (opts.werkstoffId || "rohstoffe")) || WERKSTOFF_TYPEN[0];
          const art = pick(f[wt.key] || f.rohstoffe);
          const menge = rnd(200, 800, 50);
          // Staffelrabatt-Schwelle knapp unter oder über Menge
          const schwelle = pick([300, 400, 500, 600]);
          const rabattPct = menge >= schwelle ? pick([5, 8, 10]) : pick([3, 5]);
          const listpreis = rnd(8, 40, 1);
          const listenpreisSumme = r2(listpreis * menge);
          const rabatt = r2(listenpreisSumme * rabattPct / 100);
          const zieleinkaufspreis = r2(listenpreisSumme - rabatt);
          const skontoPct = pick([2, 3]);
          const skonto = r2(zieleinkaufspreis * skontoPct / 100);
          const bareinkaufspreis = r2(zieleinkaufspreis - skonto);
          const bezugskosten = rnd(80, 400, 10);
          const einstandspreis = r2(bareinkaufspreis + bezugskosten);
          const lieferant = pick(["Müller GmbH", "Nordbayern Rohstoffe AG", "Weber Handels GmbH", "Süddeutsche Werkstoffe KG"]);
          const schwellenText = menge >= schwelle ? `(${menge} Stk ≥ ${schwelle} Stk → ${rabattPct} % Rabatt)` : `(${menge} Stk < ${schwelle} Stk → nur ${rabattPct} % Rabatt)`;
          return {
            aufgabe: `${f.name} bestellt ${menge} Stk ${art} bei ${lieferant} zum Listenpreis von ${fmt(listpreis)} €/Stk. Staffelrabatt: ab ${schwelle} Stk ${menge >= schwelle ? rabattPct : (rabattPct + 2)} % ${schwellenText}. Zahlungsbedingung: ${skontoPct} % Skonto. Bezugskosten: ${fmt(bezugskosten)} €. Berechnen Sie den Einstandspreis.`,
            beleg: null,
            schema: [
              { label: `Listenpreis = ${menge} Stk × ${fmt(listpreis)} €`, wert: listenpreisSumme, einheit: "€" },
              { label: `− Staffelrabatt (${rabattPct} %)`, wert: rabatt, einheit: "€", minus: true },
              { label: "= Zieleinkaufspreis", wert: zieleinkaufspreis, einheit: "€", bold: true, trennlinie: true },
              { label: `− Skonto (${skontoPct} %)`, wert: skonto, einheit: "€", minus: true },
              { label: "= Bareinkaufspreis", wert: bareinkaufspreis, einheit: "€", bold: true, trennlinie: true },
              { label: "+ Bezugskosten", wert: bezugskosten, einheit: "€" },
              { label: "= Einstandspreis", wert: einstandspreis, einheit: "€", bold: true, highlight: true, trennlinie: true },
            ],
            nrPunkte: 5,
            erklaerung: `Einkaufskalkulation: Listenpreis ${fmt(listenpreisSumme)} − Staffelrabatt ${fmt(rabatt)} = Zieleinkaufspreis ${fmt(zieleinkaufspreis)} − Skonto ${fmt(skonto)} = Bareinkaufspreis ${fmt(bareinkaufspreis)} + Bezugskosten ${fmt(bezugskosten)} = Einstandspreis ${fmt(einstandspreis)} €.`,
          };
        },
      },
      {
        id: "8_komplex_einkauf_kette",
        titel: "🔗 Einkauf-Kette (konfigurierbar)",
        taskTyp: "komplex",
        generate: (f, opts = {}) => {
          const wt       = WERKSTOFF_TYPEN.find(w => w.id === (opts.werkstoffId || "rohstoffe")) || WERKSTOFF_TYPEN[0];
          const mitAV    = opts.angebotsvergleich === true;   // Angebotsvergleich
          const mitKalk  = !mitAV && opts.kalkulation === true; // einfache Kalkulation
          const mitRueck = opts.ruecksendung === true;
          const mitNL    = opts.nachlass === true;
          const mitSko   = opts.skonto !== false;
          const anteil   = opts.anteilArt || "pct";

          const lief  = pick(LIEFERANTEN);
          const lief2 = pick(LIEFERANTEN.filter(l => l.name !== lief.name));
          const art   = pick(f[wt.key] || f.rohstoffe);
          const einheit = pick(["kg", "m", "Stk"]);
          const menge   = rnd(100, 500, 50);
          const nr1     = rgnr();

          // ── Angebotsvergleich: zwei Angebote ────────────────────────────
          // Kalkulation: LEP → −Rabatt → =ZEP → −Skonto → =BEP → +BZK → =Einstandspreis
          // Bei Kauf auf Ziel wird der ZEP als Netto-Buchungsbetrag verwendet!
          const mkKalk = (lep, rabPct, skPct, bzkBetrag) => {
            const rab   = r2(lep * rabPct / 100);
            const zep   = r2(lep - rab);                   // Zieleinkaufspreis ← Buchungsbasis
            const sko   = r2(zep * skPct / 100);
            const bep   = r2(zep - sko);
            const einst = r2(bep + bzkBetrag);
            return { lep, rab, rabPct, zep, sko, skPct, bep, bzkBetrag, einst };
          };

          // Angebot A
          const lepA   = rnd(8, 20, 1) * menge;
          const rabPctA = pick([5, 8, 10, 12]);
          const skPctA  = pick([2, 3]);
          const bzkA    = rnd(50, 300, 10);
          const kA      = mkKalk(lepA, rabPctA, skPctA, bzkA);

          // Angebot B – absichtlich nicht immer günstiger
          const lepB    = r2(lepA * pick([0.88, 0.92, 0.95, 1.05, 1.08]));
          const rabPctB = pick([3, 5, 7, 10]);
          const skPctB  = pick([2, 3]);
          const bzkB    = rnd(80, 400, 10);
          const kB      = mkKalk(lepB, rabPctB, skPctB, bzkB);

          const gewinner    = kA.einst <= kB.einst ? 0 : 1;
          const winKalk     = gewinner === 0 ? kA : kB;
          const winLief     = gewinner === 0 ? lief : lief2;
          const winRabPct   = gewinner === 0 ? rabPctA : rabPctB;
          const winSkoPct   = gewinner === 0 ? skPctA : skPctB;

          // Basis-Netto für Buchungen: bei AV/Kalk = ZEP, sonst zufällig
          const basisNetto  = (mitAV || mitKalk)
            ? winKalk.zep
            : rnd(800, 12000);
          const ust1        = r2(basisNetto * 0.19);
          const brutto1     = r2(basisNetto + ust1);

          const kalkulationszeilen = (k, skPct) => [
            { label: "Listeneinkaufspreis (netto)", wert: k.lep, einheit: "€" },
            { label: `− Sofortrabatt (${k.rabPct} %)`, wert: k.rab, einheit: "€" },
            { label: "= Zieleinkaufspreis (netto)", wert: k.zep, einheit: "€", trennlinie: true, highlight: true },
            { label: `− Skonto (${skPct} %)`, wert: k.sko, einheit: "€" },
            { label: "= Bareinkaufspreis (netto)", wert: k.bep, einheit: "€", trennlinie: true },
            { label: "+ Bezugskosten", wert: k.bzkBetrag, einheit: "€" },
            { label: "= Einstandspreis", wert: k.einst, einheit: "€", bold: true, trennlinie: true },
          ];

          // ── Rücksendung ──────────────────────────────────────────────────
          const rueckPct   = opts.rueckPct   || pick([10, 20, 25, 30]);
          const rueckMenge = Math.round(menge * rueckPct / 100);
          const _rueckEuroRaw = parseFloat(opts.rueckEuro) || 0;
          const rueckN     = anteil === "euro"  ? (_rueckEuroRaw > 0
                               ? (opts.euroIsBrutto ? r2(_rueckEuroRaw / 1.19) : _rueckEuroRaw)
                               : rnd(200, r2(basisNetto * 0.35), 50))
                           : r2(basisNetto * rueckPct / 100);
          const rueckU     = r2(rueckN * 0.19);
          const rueckB     = r2(rueckN + rueckU);

          // ── Nachlass ────────────────────────────────────────────────────
          const nettoNachRueck = mitRueck ? r2(basisNetto - rueckN) : basisNetto;
          const nlPct  = opts.nlPct || pick([3, 5, 8]);
          const _nlEuroRaw = parseFloat(opts.nlEuro) || 0;
          const nlN    = anteil === "euro"
            ? (_nlEuroRaw > 0
                ? (opts.euroIsBrutto ? r2(_nlEuroRaw / 1.19) : _nlEuroRaw)
                : rnd(100, r2(nettoNachRueck * 0.12), 20))
            : r2(nettoNachRueck * nlPct / 100);
          const nlU    = r2(nlN * 0.19);
          const nlB    = r2(nlN + nlU);

          // ── VE nach Korrekturen ──────────────────────────────────────────
          let veNach = brutto1;
          if (mitRueck) veNach = r2(veNach - rueckB);
          if (mitNL)    veNach = r2(veNach - nlB);
          const nettoNach = r2(veNach / 1.19);

          // ── Skonto-Zahlung ───────────────────────────────────────────────
          const skoN   = mitSko ? r2(nettoNach * (winSkoPct || 2) / 100) : 0;
          const skoU   = mitSko ? r2(skoN * 0.19) : 0;
          const skoB   = mitSko ? r2(skoN + skoU) : 0;
          const zahlung = r2(veNach - skoB);

          // ══ Schritte aufbauen ═══════════════════════════════════════════
          const schritte = [];
          let schrNr = 1;

          // ── Schritt 1: Angebotsvergleich (immer zuerst) ──────────────────
          if (mitAV) {
            // Aufgabentext: realistisch formulierte Angebote wie im ISB-Arbeitsheft
            const aufgabentext = `Die ${f.name} benötigt ${menge} ${einheit} ${art}. Erstellen Sie das Kalkulationsschema für beide Angebote und entscheiden Sie sich für das günstigste.`;
            schritte.push({
              nr: schrNr++,
              titel: "Angebotsvergleich (Einkaufskalkulation)",
              typ: "angebotsvergleich",
              aufgabe: aufgabentext,
              beleg: null, soll: [], haben: [],
              angebote: [
                { name: "Angebot A", lief: lief.name,  ort: lief.ort,  k: kA, skPct: skPctA, rows: kalkulationszeilen(kA, skPctA) },
                { name: "Angebot B", lief: lief2.name, ort: lief2.ort, k: kB, skPct: skPctB, rows: kalkulationszeilen(kB, skPctB) },
              ],
              gewinner,
              punkte: 8,
              nrPunkte: 6,
              erklaerung: `Angebot ${gewinner === 0 ? "A" : "B"} (${winLief.name}) ist günstiger: Einstandspreis ${fmt(winKalk.einst)} € < ${fmt(gewinner === 0 ? kB.einst : kA.einst)} €. Für den Kauf auf Ziel gilt der Zieleinkaufspreis (ZielEP) = ${fmt(winKalk.zep)} €.`,
            });
          } else if (mitKalk) {
            // ── Einfache Kalkulation ──────────────────────────────────────
            const ep = pick([6,8,10,12,15,18,20]);
            const lep = r2(menge * ep);
            schritte.push({
              nr: schrNr++,
              titel: "Einkaufskalkulation",
              typ: "kalkulation",
              aufgabe: `Berechnen Sie den Einstandspreis für ${menge} ${einheit} ${art} bei ${winLief.name}.`,
              beleg: null, soll: [], haben: [],
              schema: kalkulationszeilen(winKalk, winSkoPct),
              punkte: 5,
              nrPunkte: 4,
              erklaerung: `Zieleinkaufspreis (ZEP) = ${fmt(winKalk.zep)} € → Basis für den Kauf auf Ziel. Einstandspreis = ${fmt(winKalk.einst)} €.`,
            });
          }

          // ── Schritt: Einkauf auf Ziel ────────────────────────────────────
          schritte.push({
            nr: schrNr++,
            titel: `Einkauf auf Ziel${mitAV || mitKalk ? " (Zieleinkaufspreis!)" : ""}`,
            typ: "buchung",
            aufgabe: `Buchen Sie die folgende Eingangsrechnung.${mitAV || mitKalk ? " Hinweis: Als Buchungsbetrag gilt der Zieleinkaufspreis!" : ""}`,
            beleg: mkEingangsRE(f, art, menge, einheit, basisNetto, 19, false),
            soll: [{ nr: wt.aw.nr, name: wt.aw.name, betrag: basisNetto }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: ust1 }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: brutto1 }],
            nrPunkte: 1, punkte: 2 + 1 + 1,
            erklaerung: `${mitAV || mitKalk ? `Buchungsbasis = Zieleinkaufspreis (${fmt(basisNetto)} €), nicht Listeneinkaufspreis! ` : ""}${wt.aw.kürzel} Soll ${fmt(basisNetto)} €. VORST Soll ${fmt(ust1)} €. VE Haben ${fmt(brutto1)} €.`,
          });

          // ── Schritt: Rücksendung ─────────────────────────────────────────
          if (mitRueck) {
            const mengenH = anteil === "pct"   ? `${rueckPct} %`
                          : anteil === "menge" ? `${rueckMenge} ${einheit}`
                          : `Nettobetrag ${fmt(rueckN)} €`;
            schritte.push({
              nr: schrNr++,
              titel: `Rücksendung (${mengenH}) – Storno`,
              typ: "buchung",
              aufgabe: `${f.name} sendet ${mengenH} der Lieferung zurück. Stornieren Sie den anteiligen Buchungssatz.`,
              beleg: mkEmail(winLief.email, winLief.name, f.email,
                `Gutschrift Rücksendung ${mengenH} – ${nr1}`,
                `Sehr geehrte Damen und Herren,\n\nwir bestätigen die Rücksendung (${mengenH}) von ${art}.\n\nGutschrift netto: ${fmt(rueckN)} €\nUSt 19 %: ${fmt(rueckU)} €\nGutschrift brutto: ${fmt(rueckB)} €\n\nMit freundlichen Grüßen\n${winLief.name}`),
              soll: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: rueckB }],
              haben: [{ nr: wt.aw.nr, name: wt.aw.name, betrag: rueckN }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: rueckU }],
              nrPunkte: anteil !== "pct" ? 1 : 0,
              punkte: 1 + (anteil !== "pct" ? 1 : 0) + 2,
              erklaerung: `Storno = Umkehrung: VE Soll ${fmt(rueckB)} € (Verbindlichkeit sinkt), ${wt.aw.kürzel} Haben ${fmt(rueckN)} €, VORST Haben ${fmt(rueckU)} €.${anteil !== "pct" ? ` NR: ${fmt(rueckN)} €.` : ""}`,
            });
          }

          // ── Schritt: Nachträglicher Preisnachlass ────────────────────────
          if (mitNL) {
            const nlHinw = anteil === "pct" ? `${nlPct} %` : `${fmt(nlN)} € netto`;
            schritte.push({
              nr: schrNr++,
              titel: `Nachträglicher Preisnachlass (${nlHinw})`,
              typ: "buchung",
              aufgabe: `Der Lieferant gewährt einen Preisnachlass (${nlHinw}). Bilden Sie den Buchungssatz.`,
              beleg: mkEmail(winLief.email, winLief.name, f.email,
                `Gutschrift Preisnachlass – ${nr1}`,
                `Sehr geehrte Damen und Herren,\n\nwir gewähren Ihnen einen nachträglichen Preisnachlass auf ${art}.\n\nGutschrift netto: ${fmt(nlN)} €\nUSt 19 %: ${fmt(nlU)} €\nGutschrift brutto: ${fmt(nlB)} €\n\nMit freundlichen Grüßen\n${winLief.name}`),
              soll: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: nlB }],
              haben: [{ nr: wt.nl.nr, name: wt.nl.name, betrag: nlN }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: nlU }],
              nrPunkte: anteil === "pct" ? 1 : 0,
              punkte: 1 + (anteil === "pct" ? 1 : 0) + 2,
              erklaerung: `Nachlass → ${wt.nl.kürzel} Haben ${fmt(nlN)} € (nicht ${wt.aw.kürzel}!), VORST Haben ${fmt(nlU)} €, VE Soll ${fmt(nlB)} €.${anteil === "pct" ? ` NR: ${fmt(nettoNachRueck)} × ${nlPct} % = ${fmt(nlN)} €.` : ""}`,
            });
          }

          // ── Schritt: Zahlung ──────────────────────────────────────────────
          const effSkoPct = mitAV ? winSkoPct : (opts.skontoSatz || 2);
          if (mitSko) {
            schritte.push({
              nr: schrNr++,
              titel: `Zahlung mit ${effSkoPct} % Skonto`,
              typ: "buchung",
              aufgabe: `Die verbleibende Verbindlichkeit (${fmt(veNach)} €) wird mit ${effSkoPct} % Skonto überwiesen.`,
              beleg: mkUeberweisung(f, winLief.name, winLief.iban, zahlung, `${nr1} – abzgl. ${effSkoPct} % Skonto`, skoB),
              soll: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: veNach }],
              haben: [{ nr: "2800", name: "Bank (BK)", betrag: zahlung }, { nr: wt.nl.nr, name: wt.nl.name, betrag: skoN }, { nr: "2600", name: "Vorsteuer (VORST-Korrektur)", betrag: skoU }],
              nrPunkte: 3,
              punkte: 1 + 3 + 3,
              erklaerung: `VE ${fmt(veNach)} € erlischt. Bank ${fmt(zahlung)} €. Skonto → ${wt.nl.kürzel} ${fmt(skoN)} €, VORST-Korr. ${fmt(skoU)} €. NR: ${fmt(nettoNach)} × ${effSkoPct} % = ${fmt(skoN)} €; ${fmt(veNach)} − ${fmt(skoB)} = ${fmt(zahlung)} €.`,
            });
          } else {
            schritte.push({
              nr: schrNr++,
              titel: "Zahlung ohne Skonto",
              typ: "buchung",
              aufgabe: `Die Verbindlichkeit (${fmt(veNach)} €) wird vollständig überwiesen.`,
              beleg: mkUeberweisung(f, winLief.name, winLief.iban, veNach, `${nr1}`, 0),
              soll: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: veNach }],
              haben: [{ nr: "2800", name: "Bank (BK)", betrag: veNach }],
              nrPunkte: 0, punkte: 1 + 1,
              erklaerung: `VE ${fmt(veNach)} € erlischt (Soll). Bank ${fmt(veNach)} € (Haben). Kein Skonto.`,
            });
          }

          const kontextTeile = [
            `${f.name} kauft ${art} (${menge} ${einheit}) bei ${winLief.name}.`,
            mitAV ? "Vorher: Angebotsvergleich zwischen zwei Lieferanten." : mitKalk ? "Vorher: Einkaufskalkulation (Einstandspreis)." : "",
            mitRueck ? `${anteil === "pct" ? rueckPct + " %" : "Teil"} der Ware wird zurückgesandt.` : "",
            mitNL ? "Nachträglicher Preisnachlass wegen Mängelrüge." : "",
            mitSko ? `Zahlung mit ${effSkoPct} % Skonto.` : "Zahlung ohne Skonto.",
          ].filter(Boolean).join(" ");

          return { kontext: kontextTeile, schritte };
        },
      }
    ],
    "LB 3 · Marketing": [
      {
        id: "8_werbung", titel: "Werbekosten (Prospekte, Online-Kampagne)",
        generate: f => {
          const szenarien = [
            { art: "Druck von Werbeprospekten", konto: "Werbekosten", nr: "6870", kürzel: "WER", via: "VE" },
            { art: "Social-Media-Kampagne (Agentur)", konto: "Werbekosten", nr: "6870", kürzel: "WER", via: "BK" },
            { art: "Anzeige in Fachzeitschrift", konto: "Werbekosten", nr: "6870", kürzel: "WER", via: "VE" },
          ];
          const sz = pick(szenarien); const n = rnd(500, 5000, 100); const u = r2(n * 0.19); const b = r2(n + u);
          const viaKonto = sz.via === "VE" ? "4400" : "2800";
          const viaName = sz.via === "VE" ? "Verbindlichkeiten aus L+L (VE)" : "Bank (BK)";
          const belegText = sz.via === "BK"
            ? mkKontoauszug(f, [
                { datum: fakeDatum(-3), text: `${sz.art} – Marketingagentur ProSEO`, betrag: -b, highlight: true },
                { datum: fakeDatum(-1), text: "Miete Büro März", betrag: -1800, highlight: false },
              ])
            : mkEingangsRE(f, sz.art, 1, "pauschal", n, 19, false);
          return {
            aufgabe: sz.via === "BK"
              ? "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug."
              : "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: belegText,
            soll: [{ nr: sz.nr, name: sz.konto, betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: viaKonto, name: viaName, betrag: b }],
            nrPunkte: 0, erklaerung: `${sz.art} ist Aufwand (${sz.nr} ${sz.kürzel} Soll, Nettobetrag). Vorsteuer (2600 VORST Soll). ${sz.via === "VE" ? "Verbindlichkeit entsteht (4400 VE Haben)." : "Bankguthaben sinkt (2800 BK Haben)."}`,
          };
        },
      },
      {
        id: "8_kommunikation", titel: "Kommunikationskosten (Telefon, Internet, Porto)",
        generate: f => {
          const szenarien = [
            { art: "Telefon- und Internetanschlüsse (Monatsabrechnung)", ust: 19, via: "BK", brutto: true },
            { art: "Briefmarken (Barkauf)", ust: 0, via: "KA", brutto: false },
            { art: "Mobilfunkrechnung", ust: 19, via: "VE", brutto: false },
          ];
          const sz = pick(szenarien); const n = rnd(80, 600, 10); const u = r2(n * sz.ust / 100); const b = r2(n + u);
          const viaKonto = sz.via === "BK" ? "2800" : sz.via === "KA" ? "2880" : "4400";
          const viaName = sz.via === "BK" ? "Bank (BK)" : sz.via === "KA" ? "Kasse (KA)" : "Verbindlichkeiten aus L+L (VE)";
          const hasSteuer = sz.ust > 0;
          const belegText = sz.via === "BK"
            ? mkKontoauszug(f, [
                { datum: fakeDatum(-2), text: sz.art, betrag: -b, highlight: true },
                { datum: fakeDatum(-4), text: "SV-Beiträge", betrag: -3200, highlight: false },
              ])
            : sz.via === "KA" ? mkUeberweisung(f, "Deutsche Post AG", "DE36200400600526015800", b, sz.art)
            : mkEingangsRE(f, sz.art, 1, "pauschal", n, sz.ust, false);
          return {
            aufgabe: sz.via === "BK" ? "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug." : sz.via === "KA" ? "Bilden Sie den Buchungssatz zur folgenden Barzahlung." : "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: belegText,
            soll: hasSteuer
              ? [{ nr: "6820", name: "Kommunikationskosten", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }]
              : [{ nr: "6820", name: "Kommunikationskosten", betrag: b }],
            haben: [{ nr: viaKonto, name: viaName, betrag: b }],
            nrPunkte: 0, erklaerung: `Kommunikationskosten (6820 KOM Soll${hasSteuer ? ", Nettobetrag" : ""}). ${hasSteuer ? "Vorsteuer (2600 VORST Soll). " : "Briefmarken sind nicht vorsteuerabzugsberechtigt (kein Vorsteuerkonto). "}${viaName} (${viaKonto} Haben).`,
          };
        },
      },
      {
        id: "8_rechtsberatung", titel: "Rechts- und Beratungskosten (Notar, Anwalt)",
        generate: f => {
          const szenarien = [
            { art: "Notargebühren für Vertragserstellung", berater: "Notariat Dr. Müller", email: "kanzlei@notariat-mueller.de" },
            { art: "Rechtsberatungshonorar", berater: "Kanzlei Bauer & Partner", email: "recht@bauer-partner.de" },
            { art: "Steuerberatungshonorar", berater: "StB Gruber & Partner", email: "buero@stb-gruber.de" },
          ];
          const sz = pick(szenarien); const n = rnd(200, 2000, 50); const u = r2(n * 0.19); const b = r2(n + u);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, sz.art, 1, "pauschal", n, 19, false),
            soll: [{ nr: "6770", name: "Rechts- und Beratungskosten", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: b }],
            nrPunkte: 0, erklaerung: `${sz.art} = Rechts- und Beratungskosten (6770 RBK Soll, Nettobetrag). Vorsteuer (2600 VORST Soll). Verbindlichkeit (4400 VE Haben).`,
          };
        },
      },
      {
        id: "8_reisekosten", titel: "Reise- und Bewirtungskosten (Hotel, Taxi, Bahn)",
        generate: f => {
          const szenarien = [
            { art: "Hotelübernachtung inkl. Frühstück (Geschäftsreise)", ust: 19, via: "VE" },
            { art: "Taxifahrt zu Kundentermin (Barzahlung)", ust: 7, via: "KA" },
            { art: "Bahnticket für Geschäftsreise inkl. Verpflegung", ust: 19, via: "VE" },
          ];
          const sz = pick(szenarien); const n = rnd(100, 1500, 50); const u = r2(n * sz.ust / 100); const b = r2(n + u);
          const viaKonto = sz.via === "VE" ? "4400" : "2880";
          const viaName = sz.via === "VE" ? "Verbindlichkeiten aus L+L (VE)" : "Kasse (KA)";
          return {
            aufgabe: sz.via === "VE" ? "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung." : "Bilden Sie den Buchungssatz zur folgenden Barzahlung.",
            beleg: mkEingangsRE(f, sz.art, 1, "pauschal", n, sz.ust, false),
            soll: [{ nr: "6850", name: "Reise- und Bewirtungskosten", betrag: n }, { nr: "2600", name: `Vorsteuer ${sz.ust} % (VORST)`, betrag: u }],
            haben: [{ nr: viaKonto, name: viaName, betrag: b }],
            nrPunkte: 0, erklaerung: `${sz.art} = Reise-/Bewirtungskosten (6850 REK Soll, Nettobetrag ${fmt(n)} €). Vorsteuer ${sz.ust} % (2600 VORST Soll). ${viaName} (${viaKonto} Haben, Bruttobetrag ${fmt(b)} €).`,
          };
        },
      },
      {
        id: "8_provisionen", titel: "Provisionen (Handelsvertreter)",
        generate: f => {
          const n = rnd(500, 5000, 100); const u = r2(n * 0.19); const b = r2(n + u);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, "Verkaufsprovision für Außendienstmitarbeiter", 1, "pauschal", n, 19, false),
            soll: [{ nr: "6760", name: "Provisionen", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: b }],
            nrPunkte: 0, erklaerung: `Provisionen an Handelsvertreter = Aufwand (6760 PROV Soll, Nettobetrag). Vorsteuer (2600 VORST Soll). Verbindlichkeit (4400 Haben, Bruttobetrag).`,
          };
        },
      },
    ],
    "LB 4 · Verkauf & Fertigerzeugnisse": [
      {
        id: "8_vk_fe", titel: "Verkauf Fertigerzeugnisse auf Ziel",
        generate: f => {
          const art = pick(f.fertigerzeugnisse); const menge = rnd(5, 30, 1); const n = rnd(2000, 20000, 100); const u = r2(n * 0.19);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Ausgangsrechnung.",
            beleg: mkAusgangsRE(f, art, menge, "Stk", n, 19),
            soll: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: r2(n + u) }],
            haben: [{ nr: "5000", name: "Umsatzerlöse FE (UEFE)", betrag: n }, { nr: "4800", name: "Umsatzsteuer (UST)", betrag: u }],
            nrPunkte: 0, erklaerung: "Forderung = Bruttobetrag (2400 FO Soll). Erlöse FE (6000 Haben). USt-Schuld (4400 Haben).",
          };
        },
      },
      {
        id: "8_skonto_vk", titel: "Zahlungseingang mit Kundenskonto (2 %)",
        generate: f => {
          const k = pick(KUNDEN); const brutto = rnd(2000, 10000, 100); const nr = augnr();
          const skB = r2(brutto * 0.02); const skN = r2(skB / 1.19); const skU = r2(skB - skN); const zahl = r2(brutto - skB);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-4), text: "Stadtwerke Ingolstadt – Strom", betrag: -1240.00, highlight: false },
              { datum: fakeDatum(-2), text: `${k.name}, ${nr} abzgl. 2 % Skonto`, betrag: zahl, highlight: true },
              { datum: fakeDatum(-1), text: "Lohnzahlung Mitarbeiter", betrag: -2850.00, highlight: false },
            ]),
            nebenrechnungen: [{ label: "Brutto-Skonto (2 %)", formel: `${fmt(brutto)} € × 2 %`, ergebnis: `${fmt(skB)} €` }, { label: "Zahlungseingang", formel: `${fmt(brutto)} € − ${fmt(skB)} €`, ergebnis: `${fmt(zahl)} €` }, { label: "Netto-Skonto", formel: `${fmt(skB)} € ÷ 1,19`, ergebnis: `${fmt(skN)} €` }, { label: "USt-Korrektur", formel: `${fmt(skB)} € − ${fmt(skN)} €`, ergebnis: `${fmt(skU)} €` }],
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: zahl }, { nr: "5001", name: "Erlösberichtigungen FE", betrag: skN }, { nr: "4800", name: "Umsatzsteuer (UST-Korrektur)", betrag: skU }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: brutto }],
            nrPunkte: 2, erklaerung: `Forderung erlischt vollständig (1400 Haben, ${fmt(brutto)} €). Eingang nur ${fmt(zahl)} € (2800 BK Soll). Skonto kürzt Erlöse + USt.`,
          };
        },
      },
      {
        id: "8_rueck_vk", titel: "Rücksendung vom Kunden",
        generate: f => {
          const art = pick(f.fertigerzeugnisse); const k = pick(KUNDEN); const n = rnd(500, 5000); const u = r2(n * 0.19); const nr = augnr();
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
            beleg: mkEmail(`einkauf@${k.name.toLowerCase().replace(/[\s\-]/g, "")}.de`, k.name, f.email,
              `Rücksendung ${art} – Gutschriftbitte zu ${nr}`,
              `Sehr geehrte Damen und Herren,\n\nwir senden Ihnen hiermit ${art} zurück. Bei der Warenannahme wurden folgende Mängel festgestellt: Transportschäden, Kratzer an der Oberfläche.\n\nWir bitten um Ausstellung einer Gutschrift über ${fmt(r2(n + u))} € brutto (netto ${fmt(n)} €, USt ${fmt(u)} €).\n\nMit freundlichen Grüßen\n${k.name}`),
            soll: [{ nr: "5000", name: "Umsatzerlöse FE (UEFE)", betrag: n }, { nr: "4800", name: "Umsatzsteuer (UST)", betrag: u }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: r2(n + u) }],
            nrPunkte: 0, erklaerung: "Rücksendung = Storno-Buchung! Ursprünglicher Buchungssatz (FO Soll / UEFE + UST Haben) wird umgekehrt: UEFE Soll, UST Soll, FO Haben. Nicht mit Nachlass verwechseln – dort käme 5001 EBFE!",
          };
        },
      },
      {
        id: "8_nachlass_vk", titel: "Nachlass VK wegen Mängelrüge (5001 EBFE)",
        generate: f => {
          const art = pick(f.fertigerzeugnisse); const k = pick(KUNDEN); const n = rnd(200, 2000, 50); const u = r2(n * 0.19); const nr = augnr();
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
            beleg: mkEmail(`einkauf@${k.name.toLowerCase().replace(/[\s\-]/g, "")}.de`, k.name, f.email,
              `Mängelrüge zu Rechnung ${nr} – Bitte um Preisnachlass`,
              `Sehr geehrte Damen und Herren,\n\nbei der Lieferung von ${art} wurden leichte Mängel (Oberflächenkratzer) festgestellt. Wir behalten die Ware, bitten jedoch um einen nachträglichen Preisnachlass von ${fmt(n)} € netto (zzgl. ${fmt(u)} € USt 19 %).\n\nBitte stellen Sie uns eine entsprechende Gutschrift über ${fmt(r2(n + u))} € brutto aus.\n\nMit freundlichen Grüßen\n${k.name}`),
            soll: [{ nr: "5001", name: "Erlösberichtigungen FE", betrag: n }, { nr: "4800", name: "Umsatzsteuer (UST)", betrag: u }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: r2(n + u) }],
            nrPunkte: 0, erklaerung: "Nachlass wegen Mängelrüge mindert Erlöse (5001 EBFE Soll, Nettobetrag). USt-Schuld sinkt (4400 Soll). Forderung wird gekürzt (1400 Haben, Bruttobetrag).",
          };
        },
      },
      {
        id: "8_ausgangsfracht", titel: "Ausgangsfrachten (Versandkosten bei Lieferung frei Haus)",
        generate: f => {
          const n = rnd(50, 400, 10); const u = r2(n * 0.19); const b = r2(n + u);
          const via = Math.random() > 0.5 ? "VE" : "BK";
          const viaKonto = via === "VE" ? "4400" : "2800";
          const viaName = via === "VE" ? "Verbindlichkeiten aus L+L (VE)" : "Bank (BK)";
          const belegText = via === "BK"
            ? mkKontoauszug(f, [
                { datum: fakeDatum(-2), text: `Speditionskosten – Lieferung ${augnr()}`, betrag: -b, highlight: true },
                { datum: fakeDatum(-4), text: "Eingangsrechnung Rohstoffe", betrag: -2380, highlight: false },
              ])
            : mkEingangsRE(f, "Ausgangsfracht / Speditionskosten (Lieferung frei Haus)", 1, "pauschal", n, 19, false);
          return {
            aufgabe: via === "BK"
              ? "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug."
              : "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung (Speditionsrechnung).",
            beleg: belegText,
            soll: [{ nr: "6140", name: "Ausgangsfrachten", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: viaKonto, name: viaName, betrag: b }],
            nrPunkte: 0, erklaerung: `Versandkosten bei „frei Haus"-Lieferung = Aufwand (6140 AFR Soll, Nettobetrag). Vorsteuer (2600 VORST Soll). ${viaName} (${viaKonto} Haben).`,
          };
        },
      },
      {
        id: "8_komplex_verkauf_kette",
        titel: "🔗 Verkauf-Kette (konfigurierbar)",
        taskTyp: "komplex",
        generate: (f, opts = {}) => {
          const mitKalk  = opts.vorkalkulation === true;
          const mitRueck = opts.ruecksendung === true;
          const mitNL    = opts.nachlass === true;
          const mitSko   = opts.skonto !== false;
          const anteil   = opts.anteilArt || "pct";

          const kunde  = pick(KUNDEN);
          const art    = pick(f.fertigerzeugnisse);
          const menge  = rnd(5, 40, 1);
          const nr1    = augnr();

          // ── Vorkalkulation (Verkaufskalkulation) ─────────────────────────────
          // Einstandspreis → + Aufschlag → = Zielverkaufspreis → + USt → = Brutto-Rechnungspreis
          const ekp      = rnd(800, 6000, 100);
          const aufschPct = pick([20, 25, 30, 35, 40]);
          const aufsch   = r2(ekp * aufschPct / 100);
          const vkpNetto = r2(ekp + aufsch);                 // = Zielverkaufspreis ← Buchungsbasis
          const basisNetto = mitKalk ? vkpNetto : rnd(2000, 14000, 200);
          const ust1     = r2(basisNetto * 0.19);
          const brutto1  = r2(basisNetto + ust1);

          // ── Rücksendung ──────────────────────────────────────────────────────
          const rueckPct  = opts.rueckPct || pick([20, 25, 30]);
          const _rueckRaw = parseFloat(opts.rueckEuro) || 0;
          const rueckN    = anteil === "euro"
            ? (_rueckRaw > 0 ? (opts.euroIsBrutto ? r2(_rueckRaw / 1.19) : _rueckRaw) : rnd(200, r2(basisNetto * 0.35), 50))
            : r2(basisNetto * rueckPct / 100);
          const rueckU    = r2(rueckN * 0.19);
          const rueckB    = r2(rueckN + rueckU);

          // ── Nachlass ─────────────────────────────────────────────────────────
          const nettoNachRueck = mitRueck ? r2(basisNetto - rueckN) : basisNetto;
          const nlPct   = opts.nlPct || pick([3, 5, 8]);
          const _nlRaw  = parseFloat(opts.nlEuro) || 0;
          const nlN     = anteil === "euro"
            ? (_nlRaw > 0 ? (opts.euroIsBrutto ? r2(_nlRaw / 1.19) : _nlRaw) : rnd(100, r2(nettoNachRueck * 0.12), 20))
            : r2(nettoNachRueck * nlPct / 100);
          const nlU     = r2(nlN * 0.19);
          const nlB     = r2(nlN + nlU);

          // ── FO nach Korrekturen ───────────────────────────────────────────────
          let foNach = brutto1;
          if (mitRueck) foNach = r2(foNach - rueckB);
          if (mitNL)    foNach = r2(foNach - nlB);
          const nettoNach = r2(foNach / 1.19);

          // ── Skonto ───────────────────────────────────────────────────────────
          const skoPct  = pick([2, 3]);
          const skoN    = mitSko ? r2(nettoNach * skoPct / 100) : 0;
          const skoU    = mitSko ? r2(skoN * 0.19) : 0;
          const skoB    = mitSko ? r2(skoN + skoU) : 0;
          const zahlung = r2(foNach - skoB);

          // ══ Schritte ═════════════════════════════════════════════════════════
          const schritte = [];
          let schrNr = 1;

          // ── Schritt 0: Vorkalkulation ─────────────────────────────────────────
          if (mitKalk) {
            schritte.push({
              nr: schrNr++,
              titel: "Verkaufskalkulation",
              typ: "kalkulation_vk",
              aufgabe: `Berechnen Sie den Zielverkaufspreis für ${menge} Stk. ${art}.`,
              beleg: null, soll: [], haben: [],
              schema: [
                { label: "Einstandspreis", wert: ekp, einheit: "€" },
                { label: `+ Aufschlag (${aufschPct} %)`, wert: aufsch, einheit: "€" },
                { label: "= Zielverkaufspreis (Buchungsbasis)", wert: vkpNetto, einheit: "€", bold: true, trennlinie: true, highlight: true },
                { label: "+ USt (19 %)", wert: ust1, einheit: "€" },
                { label: "= Brutto-Rechnungsbetrag", wert: brutto1, einheit: "€", bold: true, trennlinie: true },
              ],
              punkte: 4,
              nrPunkte: 3,
              erklaerung: `EKP (${fmt(ekp)} €) + Aufschlag ${aufschPct} % (${fmt(aufsch)} €) = Zielverkaufspreis ${fmt(vkpNetto)} € → Buchungsbasis. + USt 19 % (${fmt(ust1)} €) = Rechnungsbetrag ${fmt(brutto1)} €.`,
            });
          }

          // ── Schritt: Verkauf auf Ziel ─────────────────────────────────────────
          schritte.push({
            nr: schrNr++,
            titel: `Verkauf auf Ziel${mitKalk ? " (Zielverkaufspreis!)" : ""}`,
            typ: "buchung",
            aufgabe: `Buchen Sie die folgende Ausgangsrechnung.${mitKalk ? " Hinweis: Als Buchungsbetrag gilt der Zielverkaufspreis!" : ""}`,
            beleg: mkAusgangsRE(f, art, menge, "Stk", basisNetto, 19),
            soll: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: brutto1 }],
            haben: [
              { nr: "5000", name: "Umsatzerlöse FE (UEFE)", betrag: basisNetto },
              { nr: "4800", name: "Umsatzsteuer (UST)", betrag: ust1 },
            ],
            nrPunkte: 1,
            punkte: 1 + 2 + 1,
            erklaerung: `FO ${fmt(brutto1)} € (Brutto) Soll. UEFE ${fmt(basisNetto)} € (Netto) Haben. UST ${fmt(ust1)} € Haben.`,
          });

          // ── Schritt: Rücksendung ──────────────────────────────────────────────
          if (mitRueck) {
            const mengenH = anteil === "pct" ? `${rueckPct} %` : `${fmt(rueckN)} € netto`;
            schritte.push({
              nr: schrNr++,
              titel: `Rücksendung (${mengenH}) – Storno`,
              typ: "buchung",
              aufgabe: `Der Kunde sendet ${mengenH} der Lieferung wegen Mängeln zurück. Stornieren Sie den anteiligen Buchungssatz.`,
              beleg: mkEmail(
                `einkauf@${kunde.name.toLowerCase().replace(/[\s\-]/g,"")}.de`,
                kunde.name, f.email,
                `Rücksendung ${mengenH} – AR ${nr1}`,
                `Sehr geehrte Damen und Herren,\n\nwir beanstanden die Lieferung (${art}) und senden ${mengenH} zurück.\n\nGutschrift netto: ${fmt(rueckN)} €\nUSt 19 %: ${fmt(rueckU)} €\nGutschrift brutto: ${fmt(rueckB)} €\n\nBitte stellen Sie uns eine entsprechende Gutschrift aus.\n\nMit freundlichen Grüßen\n${kunde.name}`),
              soll: [
                { nr: "5000", name: "Umsatzerlöse FE (UEFE)", betrag: rueckN },
                { nr: "4800", name: "Umsatzsteuer (UST)", betrag: rueckU },
              ],
              haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: rueckB }],
              nrPunkte: anteil !== "pct" ? 1 : 0,
              punkte: 2 + 1 + (anteil !== "pct" ? 1 : 0),
              erklaerung: `Rücksendung = Storno! Umkehrung des Verkaufsbuchungssatzes: UEFE Soll ${fmt(rueckN)} €, UST Soll ${fmt(rueckU)} €, FO Haben ${fmt(rueckB)} €. Nicht EBFE!${anteil !== "pct" ? ` NR: ${fmt(rueckN)} €.` : ""}`,
            });
          }

          // ── Schritt: Nachträglicher Preisnachlass ─────────────────────────────
          if (mitNL) {
            const nlHinw = anteil === "pct" ? `${nlPct} %` : `${fmt(nlN)} € netto`;
            schritte.push({
              nr: schrNr++,
              titel: `Nachträglicher Preisnachlass (${nlHinw})`,
              typ: "buchung",
              aufgabe: `${f.name} gewährt dem Kunden einen Preisnachlass (${nlHinw}). Bilden Sie den Buchungssatz.`,
              beleg: mkEmail(f.email, f.name,
                `einkauf@${kunde.name.toLowerCase().replace(/[\s\-]/g,"")}.de`,
                `Gutschrift Preisnachlass – AR ${nr1}`,
                `Sehr geehrte Damen und Herren,\n\nwir gewähren Ihnen einen nachträglichen Preisnachlass auf ${art}.\n\nGutschrift netto: ${fmt(nlN)} €\nUSt 19 %: ${fmt(nlU)} €\nGutschrift brutto: ${fmt(nlB)} €\n\nMit freundlichen Grüßen\n${f.name}`),
              soll: [
                { nr: "5001", name: "Erlösberichtigungen FE (EBFE)", betrag: nlN },
                { nr: "4800", name: "Umsatzsteuer (UST)", betrag: nlU },
              ],
              haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: nlB }],
              nrPunkte: anteil === "pct" ? 1 : 0,
              punkte: 2 + 1 + (anteil === "pct" ? 1 : 0),
              erklaerung: `Nachlass: EBFE Soll ${fmt(nlN)} € (nicht UEFE – keine Rücksendung!), UST Soll ${fmt(nlU)} €, FO Haben ${fmt(nlB)} €.${anteil === "pct" ? ` NR: ${fmt(nettoNachRueck)} × ${nlPct} % = ${fmt(nlN)} €.` : ""}`,
            });
          }

          // ── Schritt: Zahlungseingang ──────────────────────────────────────────
          if (mitSko) {
            schritte.push({
              nr: schrNr++,
              titel: `Zahlungseingang mit ${skoPct} % Skonto`,
              typ: "buchung",
              aufgabe: `Die verbleibende Forderung (${fmt(foNach)} €) geht unter Abzug von ${skoPct} % Skonto ein. Bilden Sie den Buchungssatz zur markierten Bankbuchung.`,
              beleg: mkKontoauszug(f, [
                { datum: fakeDatum(-2), text: "Miete Lagergebäude", betrag: -1800, highlight: false },
                { datum: fakeDatum(-1), text: `${kunde.name}, AR ${nr1}, abzgl. ${skoPct} % Skonto`, betrag: zahlung, highlight: true },
                { datum: fakeDatum(0),  text: "Energie / Stadtwerke", betrag: -420, highlight: false },
              ]),
              soll: [
                { nr: "2800", name: "Bank (BK)", betrag: zahlung },
                { nr: "5001", name: "Erlösberichtigungen FE (EBFE)", betrag: skoN },
                { nr: "4800", name: "Umsatzsteuer (UST-Korrektur)", betrag: skoU },
              ],
              haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: foNach }],
              nrPunkte: 3,
              punkte: 3 + 1 + 3,
              erklaerung: `FO ${fmt(foNach)} € erlischt (Haben). Bank ${fmt(zahlung)} €. Skonto → EBFE ${fmt(skoN)} €, UST-Korrektur ${fmt(skoU)} €. NR: ${fmt(nettoNach)} × ${skoPct} % = ${fmt(skoN)} €; ${fmt(foNach)} − ${fmt(skoB)} = ${fmt(zahlung)} €.`,
            });
          } else {
            schritte.push({
              nr: schrNr++,
              titel: "Zahlungseingang ohne Skonto",
              typ: "buchung",
              aufgabe: `Die Forderung (${fmt(foNach)} €) geht vollständig ein. Bilden Sie den Buchungssatz zur markierten Bankbuchung.`,
              beleg: mkKontoauszug(f, [
                { datum: fakeDatum(-2), text: "Miete Lagergebäude", betrag: -1800, highlight: false },
                { datum: fakeDatum(-1), text: `${kunde.name}, AR ${nr1}`, betrag: foNach, highlight: true },
                { datum: fakeDatum(0),  text: "Energie / Stadtwerke", betrag: -420, highlight: false },
              ]),
              soll: [{ nr: "2800", name: "Bank (BK)", betrag: foNach }],
              haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: foNach }],
              nrPunkte: 0,
              punkte: 1 + 1,
              erklaerung: `FO ${fmt(foNach)} € erlischt (Haben). Bank ${fmt(foNach)} € (Soll). Kein Skonto.`,
            });
          }

          const kontextTeile = [
            `${f.name} liefert ${menge} Stk. ${art} an ${kunde.name}, ${kunde.ort}.`,
            mitKalk ? "Vorher: Verkaufskalkulation (Zielverkaufspreis ermitteln)." : "",
            mitRueck ? `Rücksendung wegen Mängeln (${anteil === "pct" ? rueckPct + " %" : fmt(rueckN) + " € netto"}).` : "",
            mitNL ? `Nachträglicher Preisnachlass (${anteil === "pct" ? nlPct + " %" : fmt(nlN) + " € netto"}).` : "",
            mitSko ? `Zahlungseingang mit ${skoPct} % Skonto.` : "Zahlungseingang ohne Skonto.",
          ].filter(Boolean).join(" ");

          return { kontext: kontextTeile, schritte };
        },
      },
    ],
    "LB 5 · Personalbereich": [
      {
        id: "8_lohnbuchung", titel: "Buchung des monatlichen Personalaufwands",
        generate: f => {
          const brutto = rnd(2000, 4000, 50); const lst = r2(brutto * 0.13); const kist = r2(brutto * 0.01);
          const svAN = r2(brutto * 0.20); const svAG = r2(brutto * 0.20); const netto = r2(brutto - lst - kist - svAN); const svGes = r2(svAN + svAG);
          const monat = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"][new Date().getMonth()];
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur folgenden E-Mail (Gehaltsauszahlung).",
            beleg: mkEmail(`personal@${f.name.toLowerCase().replace(/[\s\-]/g,"")}.de`, `${f.name} – Personalbüro`, f.email,
              `Gehaltsabrechnung ${monat} 2025`,
              `Gehaltsabrechnung ${monat} 2025\n\nBruttolohn:              ${fmt(brutto)} €\n− Lohnsteuer:            ${fmt(lst)} €\n− Kirchensteuer:         ${fmt(kist)} €\n− SV-Beitrag AN (20 %):  ${fmt(svAN)} €\n─────────────────────────────────\nNettobetrag:             ${fmt(netto)} €\n\nAG-SV-Beitrag (20 %):    ${fmt(svAG)} €\nGesamtpersonalkosten:    ${fmt(r2(brutto+svAG))} €\n\nNettoauszahlung per Überweisung. LSt/KiSt an FA, SV-Gesamt an SV-Träger.`),
            nebenrechnungen: [{ label: "Nettolohn", formel: `${fmt(brutto)} − ${fmt(lst)} − ${fmt(kist)} − ${fmt(svAN)}`, ergebnis: `${fmt(netto)} €` }, { label: "Gesamt-SV (4840)", formel: `${fmt(svAN)} + ${fmt(svAG)}`, ergebnis: `${fmt(svGes)} €` }],
            soll: [{ nr: "6200", name: "Löhne und Gehälter", betrag: brutto }, { nr: "6400", name: "AG-Anteil Sozialversicherung (AGASV)", betrag: svAG }],
            haben: [{ nr: "2800", name: "Bank (BK — Nettobetrag)", betrag: netto }, { nr: "4830", name: "Verbindl. Finanzamt (LSt/KiSt)", betrag: r2(lst + kist) }, { nr: "4840", name: "Verbindl. SV-Träger (AN+AG)", betrag: svGes }],
            nrPunkte: 2, erklaerung: `Bruttolohn = Aufwand (6200). AG-SV = weiterer Aufwand (6400). Netto ${fmt(netto)} € (1200). LSt/KiSt ${fmt(r2(lst+kist))} € (4830). SV-Gesamt ${fmt(svGes)} € (4840).`,
          };
        },
      },
      {
        id: "8_sv_ueberweisung", titel: "Überweisung der SV-Beiträge",
        generate: f => {
          const sv = rnd(500, 2000, 50);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Online-Überweisung.",
            beleg: mkUeberweisung(f, "AOK Bayern", "DE87 7009 3400 0000 1234 56", sv, "SV-Beiträge " + ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][new Date().getMonth()] + " 2025"),
            soll: [{ nr: "4840", name: "Verbindlichkeiten SV-Träger", betrag: sv }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: sv }],
            nrPunkte: 0, erklaerung: "SV-Verbindlichkeit erlischt (4840 Soll). Bank nimmt ab (2800 BK Haben).",
          };
        },
      },
    ],
    "LB 6 · Unternehmen und Staat": [
      {
        id: "8_ust_zahllast", titel: "Überweisung der USt-Zahllast",
        generate: f => {
          const ust = rnd(3000, 12000, 100); const vst = rnd(1000, ust - 500, 100); const zahllast = r2(ust - vst);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur folgenden Online-Überweisung.",
            beleg: mkUeberweisung(f, "Finanzamt Ingolstadt", "DE86 7000 0000 0070 0101 00", zahllast, `USt-Voranmeldung ${["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][new Date().getMonth()]} 2025`),
            nebenrechnungen: [{ label: "USt-Zahllast", formel: `${fmt(ust)} € − ${fmt(vst)} €`, ergebnis: `${fmt(zahllast)} €` }],
            soll: [{ nr: "4800", name: "Umsatzsteuer (UST)", betrag: ust }],
            haben: [{ nr: "2600", name: "Vorsteuer (VORST)", betrag: vst }, { nr: "2800", name: "Bank (BK — Zahllast)", betrag: zahllast }],
            nrPunkte: 1, erklaerung: `USt-Konto aufgelöst (4400 Soll). VSt-Konto aufgelöst (1600 Haben). Zahllast ${fmt(zahllast)} € an FA überwiesen (2800 BK Haben).`,
          };
        },
      },
      {
        id: "8_gewerbesteuer", titel: "Betriebliche Steuern (Gewerbe-, Grund-, Kfz-Steuer)",
        generate: f => {
          const szenarien = [
            { steuer: "Gewerbesteuer", nr: "7000", kürzel: "GWST", empf: `Stadtkasse ${f.ort}`, iban: "DE75700519950000000000", via: "BK" },
            { steuer: "Grundsteuer", nr: "7020", kürzel: "GRST", empf: `Gemeindekasse ${f.ort}`, iban: "DE75700519950000000000", via: "BK" },
            { steuer: "Kfz-Steuer", nr: "7030", kürzel: "KFZST", empf: "Hauptzollamt München", iban: "DE81200400600528015800", via: "BK" },
          ];
          const sz = pick(szenarien); const b = rnd(300, 6000, 50);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-5), text: "Lieferantenüberweisung Rohstoffe", betrag: -2380, highlight: false },
              { datum: fakeDatum(-2), text: `${sz.steuer} – ${sz.empf}`, betrag: -b, highlight: true },
              { datum: fakeDatum(0), text: "Miete Büro", betrag: -1200, highlight: false },
            ]),
            soll: [{ nr: sz.nr, name: sz.steuer, betrag: b }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: b }],
            nrPunkte: 0, erklaerung: `Betriebliche Steuern sind Aufwand (${sz.nr} ${sz.kürzel} Soll). Keine Vorsteuer! Betriebssteuern sind von der Vorsteuer ausgenommen. Bankguthaben sinkt (2800 BK Haben).`,
          };
        },
      },
      {
        id: "8_gebuehren", titel: "Gebühren (Müllabfuhr, Kanal, Straßenreinigung)",
        generate: f => {
          const szenarien = [
            { art: "Müllabfuhrgebühren", ust: 19 },
            { art: "Kanalbenutzungsgebühren", ust: 19 },
            { art: "Straßenreinigungsgebühren", ust: 19 },
            { art: "Schornsteinfegergebühren", ust: 19 },
          ];
          const sz = pick(szenarien); const n = rnd(100, 800, 10); const u = r2(n * sz.ust / 100); const b = r2(n + u);
          const via = Math.random() > 0.5 ? "VE" : "BK";
          const viaKonto = via === "VE" ? "4400" : "2800";
          const viaName = via === "VE" ? "Verbindlichkeiten aus L+L (VE)" : "Bank (BK)";
          const belegText = via === "BK"
            ? mkKontoauszug(f, [
                { datum: fakeDatum(-3), text: `${sz.art} – Stadtwerke ${f.ort}`, betrag: -b, highlight: true },
                { datum: fakeDatum(-5), text: "Gehalt März", betrag: -3800, highlight: false },
              ])
            : mkEingangsRE(f, sz.art, 1, "pauschal", n, sz.ust, false);
          return {
            aufgabe: via === "BK"
              ? "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug."
              : "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: belegText,
            soll: [{ nr: "6730", name: "Gebühren", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: viaKonto, name: viaName, betrag: b }],
            nrPunkte: 0, erklaerung: `${sz.art} = Gebühren (6730 GEB Soll, Nettobetrag). Vorsteuer (2600 VORST Soll). ${viaName} (${viaKonto} Haben, Bruttobetrag).`,
          };
        },
      },
    ],
    "Kontenabschluss": [
      {
        id: "8_vabs_nr_awr", titel: "Vorabschluss: Nachlässe auf Rohstoffe (NR an AWR)",
        generate: f => {
          const nachlass = rnd(200,2000,50);
          return {
            aufgabe: `Das Konto 6002 NR (Nachlässe für Rohstoffe) weist am Jahresende ${fmt(nachlass)} € auf. Führen Sie die Vorabschlussbuchung durch (NR → AWR).`,
            beleg: null,
            soll: [{ nr: "6000", name: "Aufwend. Rohstoffe (AWR)", betrag: nachlass }],
            haben: [{ nr: "6002", name: "Nachlässe für Rohstoffe (NR)", betrag: nachlass }],
            nrPunkte: 0,
            erklaerung: "NR-Konto hat Haben-Saldo (Nachlässe = Einstandspreisminderung). Vorabschluss: NR Soll, AWR Haben → AWR-Konto wird um Nachlässe gemindert. Erst dann: AWR an GUV.",
          };
        },
      },
      {
        id: "8_vabs_ebfe", titel: "Vorabschluss: Erlösberichtigungen (EBFE in UEFE)",
        generate: f => {
          const skonto = rnd(100,1500,50);
          return {
            aufgabe: `Das Konto 5001 EBFE (Erlösberichtigungen) weist am Jahresende ${fmt(skonto)} € aus. Führen Sie die Vorabschlussbuchung durch (EBFE → UEFE).`,
            beleg: null,
            soll: [{ nr: "5000", name: "Umsatzerlöse FE (UEFE)", betrag: skonto }],
            haben: [{ nr: "5001", name: "Erlösberichtigungen (EBFE)", betrag: skonto }],
            nrPunkte: 0,
            erklaerung: "EBFE-Konto hat Soll-Saldo (Skonti/Nachlässe auf Umsätze). Vorabschluss: UEFE Soll, EBFE Haben → Erlöse werden um Berichtigungen gemindert. Erst dann: UEFE an GUV.",
          };
        },
      },
      {
        id: "8_abs_aufwand_kl8", titel: "Aufwandskonto (Kl. 8) über GUV abschließen",
        generate: f => {
          const konten = [
            { nr: "6000", kürzel: "AWR",  name: "Aufwend. Rohstoffe (AWR)" },
            { nr: "6140", kürzel: "AFR",  name: "Ausgangsfrachten (AFR)" },
            { nr: "6200", kürzel: "LG",   name: "Löhne und Gehälter (LG)" },
            { nr: "6400", kürzel: "AGASV",name: "AG-Anteil SV (AGASV)" },
            { nr: "6870", kürzel: "WER",  name: "Werbung (WER)" },
            { nr: "7000", kürzel: "GWST", name: "Gewerbesteuer (GWST)" },
          ];
          const k = pick(konten); const betrag = rnd(2000,40000,500);
          return {
            aufgabe: `Das Aufwandskonto ${k.nr} ${k.kürzel} hat einen Gesamtbetrag von ${fmt(betrag)} €. Schließen Sie es über das GUV-Konto ab.`,
            beleg: null,
            soll: [{ nr: "8020", name: "Gewinn- und Verlustkonto (GUV)", betrag }],
            haben: [{ nr: k.nr, name: k.name, betrag }],
            nrPunkte: 0,
            erklaerung: `Aufwandskonto ${k.kürzel}: Soll-Saldo → Ausgleich HABEN. Buchung: GUV an ${k.kürzel} ${fmt(betrag)} €.`,
          };
        },
      },
      {
        id: "8_abs_reihenfolge", titel: "Abschluss-Reihenfolge Einkaufsbereich (Schema)",
        taskTyp: "rechnung",
        generate: f => {
          const awr = rnd(30000,80000,1000);
          const nr = rnd(500,3000,100);
          const awr_net = r2(awr - nr);
          const bzkr = rnd(500,2000,100);
          const einstand = r2(awr_net + bzkr);
          return {
            aufgabe: `Zeigen Sie die korrekte Reihenfolge der Abschlussbuchungen im Einkaufsbereich. AWR: ${fmt(awr)} €, NR (Nachlässe): ${fmt(nr)} €, BZKR (Bezugskosten): ${fmt(bzkr)} €.`,
            beleg: null,
            schema: [
              { label: "① Vorabschluss NR → AWR", wert: nr, einheit: "€" },
              { label: "  AWR (nach NR-Abzug)", wert: awr_net, einheit: "€" },
              { label: "② Vorabschluss BZKR → AWR", wert: bzkr, einheit: "€" },
              { label: "  AWR (Einstandswert gesamt)", wert: einstand, einheit: "€", bold: true, trennlinie: true },
              { label: "③ Abschluss AWR → GUV", wert: einstand, einheit: "€", bold: true },
            ],
            nrPunkte: 5,
            erklaerung: "Reihenfolge: 1. NR an AWR (Nachlässe kürzen AWR). 2. BZKR an AWR (Bezugskosten erhöhen AWR). 3. GUV an AWR (Einstandswert auf GUV übertragen).",
          };
        },
      },
    ],
    "Theorie · Rechnungswesen": [
      {
        id: "8_th_ust_system", titel: "Umsatzsteuer – Grundprinzip",
        taskTyp: "theorie", themenTyp: "lueckentext",
        generate: () => ({
          aufgabe: "Ergänzen Sie den Lückentext zur Umsatzsteuer.",
          lueckentext: {
            text: "Die Umsatzsteuer beträgt im Regelfall {0} %. Beim Kauf bezahlt das Unternehmen {1} an den Lieferanten. Diese kann es als {2} vom Finanzamt zurückfordern. Beim Verkauf berechnet das Unternehmen dem Kunden {3} und muss diese ans Finanzamt abführen. Die Differenz aus Umsatzsteuer und Vorsteuer heißt {4}.",
            luecken: ["19", "Vorsteuer", "Vorsteuererstattung", "Umsatzsteuer", "Zahllast"],
            wortbank: ["7", "19", "Eigenkapital", "Umsatzsteuer", "Vorsteuer", "Vorsteuererstattung", "Zahllast", "Zollgebühr"],
          }, nrPunkte: 5,
        }),
      },
      {
        id: "8_th_kalkulation_begriffe", titel: "Einkaufskalkulation – Begriffe",
        taskTyp: "theorie", themenTyp: "zuordnung",
        generate: () => ({
          aufgabe: "Ordnen Sie die Kalkulationsbegriffe den richtigen Beschreibungen zu.",
          zuordnung: { paare: [
            { term: "Listeneinkaufspreis (LEP)",     def: "Preis laut Angebot oder Preisliste des Lieferanten" },
            { term: "Lieferantenrabatt",              def: "Preisnachlass des Lieferanten auf den Listeneinkaufspreis" },
            { term: "Zieleinkaufspreis (ZEP)",        def: "Buchungsbasis beim Kauf auf Rechnung (nach Rabatt, vor Skonto)" },
            { term: "Lieferantenskonto",              def: "Preisnachlass bei Zahlung innerhalb der Skontofrist" },
            { term: "Bezugskosten (BZK)",             def: "Transport- und Verpackungskosten beim Wareneinkauf" },
            { term: "Bezugspreis (Einstandspreis)",   def: "Tatsächliche Gesamtkosten des beschafften Guts" },
          ]}, nrPunkte: 6,
        }),
      },
      {
        id: "8_th_ruecksendung_nachlass", titel: "Rücksendung und Nachlass",
        taskTyp: "theorie", themenTyp: "freitext",
        generate: () => ({
          aufgabe: "Erläutern Sie den Unterschied zwischen einer Rücksendung und einem Nachlass beim Wareneinkauf. Nennen Sie je ein Buchungsbeispiel.",
          freitext: { zeilen: 6,
            loesung: `Rücksendung: Die mangelhafte Ware wird an den Lieferanten zurückgeschickt. Der gesamte Buchungssatz wird storniert (rückgängig gemacht).
Buchung: Verbindlichkeiten aus L+L an Aufwendungen Rohstoffe + Vorsteuer

Nachlass: Die Ware bleibt beim Unternehmen, aber der Rechnungsbetrag wird nachträglich gemindert (z. B. wegen leichter Mängel).
Buchung: Verbindlichkeiten aus L+L an Nachlässe auf Rohstoffe + Vorsteuer`,
          }, nrPunkte: 4,
        }),
      },
      {
        id: "8_th_inventurverfahren", titel: "Inventurverfahren im Überblick",
        taskTyp: "theorie", themenTyp: "zuordnung",
        generate: () => ({
          aufgabe: "Ordnen Sie die Inventurverfahren den richtigen Beschreibungen zu.",
          zuordnung: { paare: [
            { term: "Stichtagsinventur",    def: "Alle Bestände werden genau am Bilanzstichtag (31.12.) körperlich aufgenommen" },
            { term: "Verlegte Inventur",    def: "Aufnahme bis zu 3 Monate vor oder 2 Monate nach dem Stichtag zulässig" },
            { term: "Permanente Inventur",  def: "Fortlaufende Bestandserfassung das ganze Jahr über (Lagerbuchhaltung)" },
            { term: "Stichprobeninventur",  def: "Nur Teilmengen werden gezählt, Rest wird statistisch hochgerechnet" },
          ]}, nrPunkte: 4,
        }),
      },
      {
        id: "8_th_ust_mc", titel: "Umsatzsteuer – Multiple Choice",
        taskTyp: "theorie", themenTyp: "mc",
        generate: () => ({
          aufgabe: "Beantworten Sie die Fragen zur Umsatzsteuer.",
          mc: { fragen: [
            { frage: "Was versteht man unter Vorsteuer?",
              optionen: ["Die USt, die das Unternehmen beim Verkauf berechnet", "Die USt, die das Unternehmen beim Einkauf bezahlt und zurückfordern kann", "Eine Steuer auf Gewinne", "Die Körperschaftsteuer"], richtig: 1 },
            { frage: "Auf welchem Konto wird die Vorsteuer beim Einkauf gebucht?",
              optionen: ["Umsatzsteuer (4800)", "Vorsteuer (1570)", "Verbindlichkeiten aus L+L", "Bank"], richtig: 1 },
            { frage: "Welcher Betrag ist die Buchungsbasis beim Kauf auf Ziel?",
              optionen: ["Bruttobetrag (inkl. USt)", "Nettobetrag (Zieleinkaufspreis, ohne USt)", "Listeneinkaufspreis", "Bezugspreis"], richtig: 1 },
          ]}, nrPunkte: 3,
        }),
      },
    ],
  },
  9: {
    "LB 1 · Privatkonto & Unternehmerlohn": [
      {
        id: "9_privatentnahme", titel: "Privatentnahme (bar)",
        generate: f => {
          const b = rnd(500, 3000, 50);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-3), text: "Tankstelle Aral Ingolstadt", betrag: -68.40, highlight: false },
              { datum: fakeDatum(-1), text: `Barauszahlung – privat (Inhaber)`, betrag: -b, highlight: true },
              { datum: fakeDatum(0), text: "Lastschrift Versicherung", betrag: -142.00, highlight: false },
            ]),
            soll: [{ nr: "3001", name: "Privatkonto", betrag: b }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: b }],
            nrPunkte: 0, erklaerung: "Privatentnahme belastet das Privatkonto (3001 Soll) – wird am JE über EK abgeschlossen. Bank nimmt ab (2800 BK Haben).",
          };
        },
      },
    ],
    "LB 2 · Anlagenbereich": [
      {
        id: "9_anlage_ank", titel: "Kauf einer Anlage mit Anschaffungsnebenkosten",
        generate: f => {
          const anlage = pick(f.anlagen); const kp = rnd(5000, 30000, 500); const transport = rnd(100, 500, 50); const montage = rnd(200, 800, 50);
          const ak = r2(kp + transport + montage); const u = r2(ak * 0.19);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, anlage, 1, "Stk", kp, 19, false, 0, transport + montage),
            nebenrechnungen: [{ label: "Anschaffungskosten (AK)", formel: `${fmt(kp)} + ${fmt(transport)} + ${fmt(montage)}`, ergebnis: `${fmt(ak)} €` }, { label: "Vorsteuer 19 %", formel: `${fmt(ak)} × 19 %`, ergebnis: `${fmt(u)} €` }],
            soll: [{ nr: "0700", name: "Maschinen und Anlagen (MA)", betrag: ak }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: r2(ak + u) }],
            nrPunkte: 2, erklaerung: `AK = Kaufpreis + Nebenkosten = ${fmt(ak)} €. Anlage wird zum AK aktiviert (0400 Soll). Vorsteuer auf AK (2600 VORST Soll).`,
          };
        },
      },
      {
        id: "9_reparatur", titel: "Reparatur einer Anlage",
        generate: f => {
          const anlage = pick(f.anlagen); const n = rnd(500, 3000, 100); const u = r2(n * 0.19);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, `Reparatur ${anlage}`, 1, "pauschal", n, 19, false),
            soll: [{ nr: "6160", name: "Fremdinstandhaltung (FRI)", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: r2(n + u) }],
            nrPunkte: 0, erklaerung: "Reparatur = sofortiger Aufwand (6700 Soll). Vorsteuer (2600 VORST Soll). Zahlung per Bank (2800 BK Haben).",
          };
        },
      },
      {
        id: "9_gwg", titel: "Kauf eines geringwertigen Wirtschaftsguts (GWG)",
        generate: f => {
          const gwgArtikel = ["Bürostuhl (Ergonomie-Modell)", "Taschenrechner (professionell)", "Elektrische Heftmaschine", "Drucker (Tintenstrahl)", "Webcam HD", "Computermaus (kabellos)", "USB-Hub (industriell)", "Aktenschrank (schmal)"];
          const artikel = pick(gwgArtikel);
          const n = r2((Math.floor(Math.random() * (800 - 251) / 10) * 10 + 260)); // 260–800 €
          const u = r2(n * 0.19); const b = r2(n + u);
          const via = Math.random() > 0.5 ? "BK" : "VE";
          const viaKonto = via === "BK" ? "2800" : "4400";
          const viaName = via === "BK" ? "Bank (BK)" : "Verbindlichkeiten aus L+L (VE)";
          return {
            aufgabe: via === "BK"
              ? "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung (Barzahlung per EC-Karte)."
              : "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, artikel, 1, "Stk", n, 19, false),
            soll: [{ nr: "0890", name: "Geringwertige Wirtschaftsgüter (GWG)", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: viaKonto, name: viaName, betrag: b }],
            nrPunkte: 0,
            erklaerung: `Nettowert ${fmt(n)} € liegt zwischen 250,01 € und 800,00 € → GWG (0890 Soll). Vorsteuer (2600 VORST Soll). Jahresende: Abschreibung 20 % auf Konto 6540 ABGWG.`,
          };
        },
      },
      {
        id: "9_kleingut", titel: "Kauf eines Kleinguts (≤ 250 € netto → Sofortaufwand)",
        generate: f => {
          const kleinArtikel = ["Taschenrechner (einfach)", "Kugelschreiber (Karton)", "Locher", "Tacker", "USB-Stick (8 GB)", "Schreibtischunterlage", "Notizbücher (10er-Pack)", "Klebeband (Rolle)"];
          const artikel = pick(kleinArtikel);
          const n = r2(Math.floor(Math.random() * (250) / 5) * 5 + 20); // 20–250 €
          const u = r2(n * 0.19); const b = r2(n + u);
          const via = Math.random() > 0.6 ? "KA" : "BK";
          const viaKonto = via === "KA" ? "2880" : "2800";
          const viaName = via === "KA" ? "Kasse (KA)" : "Bank (BK)";
          return {
            aufgabe: via === "KA"
              ? "Bilden Sie den Buchungssatz zur folgenden Barzahlung (Kassenbon)."
              : "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung.",
            beleg: mkEingangsRE(f, artikel, 1, "Stk", n, 19, false),
            soll: [{ nr: "6800", name: "Büromaterial und Kleingüter (BMK)", betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: viaKonto, name: viaName, betrag: b }],
            nrPunkte: 0,
            erklaerung: `Nettowert ${fmt(n)} € ≤ 250,00 € → Kleingut = Sofortaufwand (6800 BMK Soll). Keine Aktivierung, keine Abschreibung. Vorsteuer (2600 VORST Soll). ${viaName} (${viaKonto} Haben).`,
          };
        },
      },
      {
        id: "9_afa_linear", titel: "Lineare Abschreibung (AfA) berechnen und buchen",
        taskTyp: "rechnung",
        generate: f => {
          const anlagenDaten = [
            { art: "Firmen-PKW", konto: "0840", nd: 6 },
            { art: "CNC-Maschine", konto: "0400", nd: 8 },
            { art: "Büromöbel", konto: "0680", nd: 13 },
            { art: "Kopierer", konto: "0860", nd: 7 },
            { art: "Computer/Server", konto: "0860", nd: 3 },
            { art: "LKW", konto: "0820", nd: 9 },
          ];
          const ag = pick(anlagenDaten);
          const ak = rnd(4000, 30000, 500);
          const kaufMonat = Math.floor(Math.random() * 11) + 1; // 1–11
          const monateErstjahr = 13 - kaufMonat; // z.B. Kauf Mai → 8 Monate
          const afaJahr = r2(ak / ag.nd);
          const afaErstjahr = r2(afaJahr * monateErstjahr / 12);
          const bw1 = r2(ak - afaErstjahr);
          const monatNamen = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
          return {
            aufgabe: `${f.name} kaufte am 1. ${monatNamen[kaufMonat-1]} eine(n) ${ag.art} für ${fmt(ak)} € netto. Nutzungsdauer laut AfA-Tabelle: ${ag.nd} Jahre. Berechnen Sie die Abschreibung für das erste Jahr (zeitanteilig) und bilden Sie den Buchungssatz.`,
            beleg: null,
            schema: [
              { label: "Anschaffungskosten (AK, netto)", wert: ak, einheit: "€" },
              { label: `Jährliche AfA = AK ÷ ${ag.nd} Jahre`, wert: afaJahr, einheit: "€/Jahr" },
              { label: `Monate im Erstjahr (ab ${monatNamen[kaufMonat-1]})`, wert: monateErstjahr, einheit: "Monate" },
              { label: `AfA Erstjahr = ${fmt(afaJahr)} × ${monateErstjahr}/12`, wert: afaErstjahr, einheit: "€", bold: true, trennlinie: true },
              { label: "Buchwert (BW) zum 31.12.", wert: bw1, einheit: "€", bold: true },
              { label: `Buchungssatz: 6520 ABSA ${fmt(afaErstjahr)} an ${ag.konto} FP ${fmt(afaErstjahr)}`, wert: " ", einheit: "" },
            ],
            nrPunkte: 3,
            erklaerung: `Lineare AfA: AK ÷ ND = ${fmt(afaJahr)} €/Jahr. Im Erstjahr nur ab Kaufmonat: × ${monateErstjahr}/12 = ${fmt(afaErstjahr)} €. Buchung: 6520 ABSA (Aufwand) an ${ag.konto} (Anlage wird direkt vermindert). BW = ${fmt(ak)} − ${fmt(afaErstjahr)} = ${fmt(bw1)} €.`,
          };
        },
      },
      {
        id: "9_gwg_afa", titel: "GWG-Abschreibung (20 % am Jahresende)",
        taskTyp: "rechnung",
        generate: f => {
          const gwgArtikel = ["Bürostühle", "Drucker", "Kaffeemaschinen (gewerblich)", "Aktenvernichter", "Monitore"];
          const artikel = pick(gwgArtikel);
          const saldo = rnd(1500, 8000, 100); // Saldo auf 0890 GWG
          const afa = r2(saldo * 0.20);
          const bw = r2(saldo - afa);
          return {
            aufgabe: `Der Saldo auf dem Konto 0890 GWG (geringwertige Wirtschaftsgüter) beträgt am 31.12. ${fmt(saldo)} €. Berechnen Sie die Jahresabschreibung (20 %) und bilden Sie den Buchungssatz.`,
            beleg: null,
            schema: [
              { label: "Saldo GWG-Konto (31.12.)", wert: saldo, einheit: "€" },
              { label: "AfA-Satz GWG", wert: 20, einheit: "%" },
              { label: "Abschreibungsbetrag = Saldo × 20 %", wert: afa, einheit: "€", bold: true, trennlinie: true },
              { label: "Restwert GWG nach AfA", wert: bw, einheit: "€", bold: true },
              { label: `Buchungssatz: 6540 ABGWG ${fmt(afa)} an 0890 GWG ${fmt(afa)}`, wert: " ", einheit: "" },
            ],
            nrPunkte: 2,
            erklaerung: `GWG werden pauschal mit 20 % des Kontosaldos abgeschrieben. Aufwand: 6540 ABGWG (Soll). GWG-Konto direkt vermindert (0890 Haben). Restwert: ${fmt(bw)} €.`,
          };
        },
      },
      {
        id: "9_amortisationszeit", titel: "Amortisationszeit einer Investition berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const ak = rnd(20000, 80000, 1000);
          const nd = pick([4, 5, 6, 8, 10]);
          const afa = r2(ak / nd);
          const kalkZinsPct = pick([4, 5, 6]);
          const kalkZinsen = r2(ak / 2 * kalkZinsPct / 100);
          const gewinn = rnd(3000, 15000, 500);
          const rueckfluss = r2(afa + kalkZinsen + gewinn);
          const amort = r2(ak / rueckfluss);
          const anlage = pick(f.anlagen);
          return {
            aufgabe: `${f.name} plant die Anschaffung von ${anlage} (AK: ${fmt(ak)} €, Nutzungsdauer: ${nd} Jahre). Der kalkulatorische Zinssatz beträgt ${kalkZinsPct} % (vom halben AK). Der jährliche Gewinnbeitrag wird auf ${fmt(gewinn)} € geschätzt. Berechnen Sie die Amortisationszeit.`,
            beleg: null,
            schema: [
              { label: `Lineare AfA = ${fmt(ak)} ÷ ${nd} Jahre`, wert: afa, einheit: "€/Jahr" },
              { label: `Kalk. Zinsen = ${fmt(ak)} ÷ 2 × ${kalkZinsPct} %`, wert: kalkZinsen, einheit: "€/Jahr" },
              { label: `Gewinnbeitrag (jährlich)`, wert: gewinn, einheit: "€/Jahr" },
              { label: "Jährlicher Rückfluss (AfA + Zinsen + Gewinn)", wert: rueckfluss, einheit: "€/Jahr", bold: true, trennlinie: true },
              { label: `Amortisationszeit = ${fmt(ak)} ÷ ${fmt(rueckfluss)}`, wert: amort, einheit: "Jahre", bold: true, highlight: amort <= nd },
              { label: amort <= nd ? `✓ Investition amortisiert sich innerhalb der Nutzungsdauer` : `✗ Investition amortisiert sich NICHT innerhalb der Nutzungsdauer`, wert: " ", einheit: "" },
            ],
            nrPunkte: 4,
            erklaerung: `Amortisationszeit = AK ÷ jährl. Rückfluss. Rückfluss = AfA (${fmt(afa)}) + kalk. Zinsen (${fmt(kalkZinsen)}) + Gewinn (${fmt(gewinn)}) = ${fmt(rueckfluss)} €/Jahr. Amortisation: ${fmt(ak)} ÷ ${fmt(rueckfluss)} = ${fmt(amort)} Jahre. ${amort <= nd ? "Investition lohnt sich (Amortisation < Nutzungsdauer)." : "Investition kritisch (Amortisation > Nutzungsdauer)."}`,
          };
        },
      },
      {
        id: "9_versicherung", titel: "Versicherungsbeitrag (kein Vorsteuerabzug!)",
        generate: f => {
          const szenarien = [
            { art: "Betriebshaftpflichtversicherung", vers: "Allianz Versicherungs-AG" },
            { art: "Kfz-Versicherung (Firmenfahrzeug)", vers: "HUK-COBURG Versicherung AG" },
            { art: "Feuerversicherung (Betriebsgebäude)", vers: "Bayerische Versicherungskammer" },
            { art: "Maschinenversicherung", vers: "Zurich Insurance Group" },
          ];
          const sz = pick(szenarien); const b = rnd(200, 2000, 50);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-5), text: "Lieferantenüberweisung", betrag: -3800, highlight: false },
              { datum: fakeDatum(-2), text: `${sz.vers} – ${sz.art}`, betrag: -b, highlight: true },
              { datum: fakeDatum(0), text: "Eingang Kundenzahlung", betrag: 4200, highlight: false },
            ]),
            soll: [{ nr: "6900", name: "Versicherungsbeiträge", betrag: b }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: b }],
            nrPunkte: 0,
            erklaerung: `Versicherungsbeiträge sind umsatzsteuerfrei → kein Vorsteuerabzug! Aufwand (6900 VBEI Soll). Bankguthaben sinkt (2800 BK Haben). Buchung immer Bruttobetrag = Nettobetrag.`,
          };
        },
      },
      {
        id: "9_komplex_anlagen_kette",
        titel: "🔗 Anlagen-Kette: Kauf, AfA, Verkauf mit Gewinn",
        taskTyp: "komplex",
        generate: f => {
          const anlage = pick(f.anlagen);
          const ak = rnd(8000, 30000, 500);
          const ust1 = r2(ak * 0.19);
          const brutto1 = r2(ak + ust1);
          const nd = pick([4, 5, 6, 8]);
          const afaJahr = r2(ak / nd);
          const yearsAfA = pick([1, 2]);
          const bw = r2(ak - yearsAfA * afaJahr);
          // VK-Preis immer mit Gewinn
          const gewinnBetrag = rnd(500, 3000, 200);
          const vkNetto = r2(bw + gewinnBetrag);
          const vkUST = r2(vkNetto * 0.19);
          const vkBrutto = r2(vkNetto + vkUST);
          const gewinn = r2(vkNetto - bw);
          return {
            kontext: `${f.name} kauft eine(n) ${anlage} auf Ziel und schreibt sie ${nd} Jahre linear ab. Nach ${yearsAfA} Jahr${yearsAfA > 1 ? "en" : ""} Abschreibung wird die Anlage mit Gewinn veräußert. Bilden Sie für jeden Vorfall den vollständigen Buchungssatz.`,
            schritte: [
              {
                nr: 1,
                titel: "Kauf der Anlage auf Ziel",
                aufgabe: "Buchen Sie die folgende Eingangsrechnung für den Kauf der Anlage.",
                beleg: mkEingangsRE(f, anlage, 1, "Stk", ak, 19, false),
                soll: [
                  { nr: "0700", name: "Maschinen und Anlagen (MA)", betrag: ak },
                  { nr: "2600", name: "Vorsteuer (VORST)", betrag: ust1 },
                ],
                haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: brutto1 }],
                nrPunkte: 1,
                punkte: 2 + 1 + 1,
                erklaerung: `Anlage wird zu Anschaffungskosten aktiviert (MA 0700 Soll, ${fmt(ak)} €). VORST ${fmt(ust1)} € (${fmt(ak)} × 19 %) auf Soll. VE ${fmt(brutto1)} € (Brutto) auf Haben.`,
              },
              {
                nr: 2,
                titel: `Lineare AfA buchen (1 Jahr, ND ${nd} Jahre)`,
                aufgabe: `Buchen Sie die jährliche lineare Abschreibung auf die Anlage. Nutzungsdauer: ${nd} Jahre.`,
                beleg: null,
                soll: [{ nr: "6520", name: "Abschreibungen auf Sachanlagen (ABSA)", betrag: afaJahr }],
                haben: [{ nr: "0700", name: "Maschinen und Anlagen (MA)", betrag: afaJahr }],
                nrPunkte: 1,
                punkte: 1 + 1 + 1,
                erklaerung: `Jährl. AfA = AK ÷ ND = ${fmt(ak)} ÷ ${nd} = ${fmt(afaJahr)} €. ABSA (6520) auf Soll. MA (0700) nimmt ab → auf Haben. Buchwert nach ${yearsAfA} Jahr${yearsAfA > 1 ? "en" : ""}: ${fmt(ak)} − ${yearsAfA} × ${fmt(afaJahr)} = ${fmt(bw)} €.`,
              },
              {
                nr: 3,
                titel: "Veräußerung der Anlage (Gewinn)",
                aufgabe: `Die Anlage wird nach ${yearsAfA} Jahr${yearsAfA > 1 ? "en" : ""} (Buchwert: ${fmt(bw)} €) für ${fmt(vkNetto)} € netto verkauft. Bilden Sie den Buchungssatz (Zahlung per Banküberweisung).`,
                beleg: null,
                soll: [{ nr: "2800", name: "Bank (BK)", betrag: vkBrutto }],
                haben: [
                  { nr: "0700", name: "Maschinen und Anlagen (MA)", betrag: bw },
                  { nr: "4800", name: "Umsatzsteuer (UST)", betrag: vkUST },
                  { nr: "5430", name: "Andere betriebl. Erträge (ASBE)", betrag: gewinn },
                ],
                nrPunkte: 3,
                punkte: 1 + 3 + 3,
                erklaerung: `Anlage wird ausgebucht (MA ${fmt(bw)} € Haben = Buchwert). Erlösüberschuss = Veräußerungsgewinn (ASBE ${fmt(gewinn)} € Haben). UST auf VK-Preis (${fmt(vkUST)} € Haben). Bank erhält Bruttobetrag (${fmt(vkBrutto)} € Soll). NR: BW = ${fmt(ak)} − ${yearsAfA} × ${fmt(afaJahr)} = ${fmt(bw)} €; UST = ${fmt(vkNetto)} × 19 % = ${fmt(vkUST)} €; Gewinn = ${fmt(vkNetto)} − ${fmt(bw)} = ${fmt(gewinn)} €.`,
              },
            ],
          };
        },
      },
    ],
    "LB 3 · Finanzierung": [
      {
        id: "9_kredit_disagio", titel: "Kreditaufnahme mit Disagio",
        generate: f => {
          const kreditsumme = rnd(20000, 80000, 5000); const disagioPct = [1,2,3,4,5][Math.floor(Math.random()*5)];
          const disagio = r2(kreditsumme * disagioPct / 100); const auszahlung = r2(kreditsumme - disagio);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-5), text: "Miete März 2025", betrag: -1800, highlight: false },
              { datum: fakeDatum(-2), text: `Darlehensauszahlung abzgl. ${disagioPct}% Disagio – Volksbank Bayern`, betrag: auszahlung, highlight: true },
              { datum: fakeDatum(-1), text: "Wareneinkauf Lieferant", betrag: -4200, highlight: false },
            ]),
            nebenrechnungen: [{ label: `Disagio (${disagioPct} %)`, formel: `${fmt(kreditsumme)} × ${disagioPct} %`, ergebnis: `${fmt(disagio)} €` }, { label: "Auszahlungsbetrag", formel: `${fmt(kreditsumme)} − ${fmt(disagio)}`, ergebnis: `${fmt(auszahlung)} €` }],
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: auszahlung }, { nr: "2900", name: "Aktiver RAP (Disagio)", betrag: disagio }],
            haben: [{ nr: "4250", name: "Langfristige Bankverbindlichkeiten (LBKV)", betrag: kreditsumme }],
            nrPunkte: 2, erklaerung: `Darlehen = volle Kreditsumme ${fmt(kreditsumme)} € (2100 Haben). Bank überweist nur ${fmt(auszahlung)} € (2800 BK Soll). Disagio = aktiver RAP (2900 Soll).`,
          };
        },
      },
      {
        id: "9_skonto_vorteil", titel: "Skonto-Vorteilhaftigkeitsrechnung",
        taskTyp: "rechnung",
        generate: f => {
          const skontoPct = pick([2, 3]);
          const kkZins = pick([9, 10, 11, 12]);
          const skontofrist = pick([7, 10, 14]);
          const zahlungsziel = pick([30, 45, 60]);
          const tage = zahlungsziel - skontofrist;
          const brutto = rnd(3000, 12000, 100);
          const netto = r2(brutto / 1.19);
          const skontoBrutto = r2(brutto * skontoPct / 100);
          const ueberweisungsbetrag = r2(brutto - skontoBrutto);
          const skontoNetto = r2(skontoBrutto / 1.19);
          const kkZinsen = r2(netto * kkZins / 100 * tage / 360);
          const ersparnis = r2(skontoNetto - kkZinsen);
          const lohnt = ersparnis > 0;
          const lieferant = pick(["Müller GmbH", "Schulz & Partner KG", "Weber Handels GmbH", "Bayer Industrie AG"]);
          return {
            aufgabe: `${f.name} hat eine Eingangsrechnung von ${lieferant} über ${fmt(brutto)} € (brutto) erhalten. Zahlungsziel: ${zahlungsziel} Tage, ${skontoPct} % Skonto bei Zahlung innerhalb von ${skontofrist} Tagen. Der Kontokorrentzins beträgt ${kkZins} % p.a. Beurteilen Sie, ob ${f.name} das Skonto in Anspruch nehmen soll.`,
            beleg: null,
            schema: [
              { label: `Rechnungsbetrag (brutto)`, wert: brutto, einheit: "€" },
              { label: `Skontobetrag (${skontoPct} % von ${fmt(brutto)})`, wert: skontoBrutto, einheit: "€", minus: true },
              { label: "Überweisungsbetrag bei Skontierung", wert: ueberweisungsbetrag, einheit: "€", bold: true, trennlinie: true },
              { label: `Netto-Skontobetrag (${fmt(skontoBrutto)} ÷ 1,19)`, wert: skontoNetto, einheit: "€", bold: true },
              { label: `KK-Sollzinsen: ${fmt(netto)} × ${kkZins} % × ${tage}/360`, wert: kkZinsen, einheit: "€", minus: true },
              { label: `Ersparnis durch Skonto`, wert: ersparnis, einheit: "€", bold: true, highlight: lohnt, trennlinie: true },
              { label: lohnt ? `✓ Skonto lohnt sich (Ersparnis ${fmt(ersparnis)} €)` : `✗ Skonto lohnt sich NICHT (Mehrkosten ${fmt(Math.abs(ersparnis))} €)`, wert: " ", einheit: "" },
            ],
            nrPunkte: 5,
            erklaerung: `Netto-Skonto = Skontobetrag brutto ÷ 1,19 = ${fmt(skontoNetto)} €. KK-Zinsen für ${tage} Tage Überbrückung = ${fmt(kkZinsen)} €. Ersparnis = ${fmt(skontoNetto)} − ${fmt(kkZinsen)} = ${fmt(ersparnis)} €. ${lohnt ? "Skonto ziehen lohnt sich, da Ersparnis positiv." : "Skonto ziehen lohnt sich nicht, da KK-Zinsen höher als Netto-Skonto."}`,
          };
        },
      },
      {
        id: "9_tilgung_zinsen", titel: "Tilgungsrate mit Zinsen",
        generate: f => {
          const tilgung = rnd(500, 2000, 100); const darlehen = rnd(10000, 40000, 1000); const zins = r2(darlehen * 0.05 / 12); const rate = r2(tilgung + zins);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-3), text: "Büromaterial Amazon", betrag: -89.95, highlight: false },
              { datum: fakeDatum(-1), text: `Volksbank Bayern – Darlehensrate (Tilgung ${fmt(tilgung)} € + Zinsen ${fmt(zins)} €)`, betrag: -rate, highlight: true },
              { datum: fakeDatum(0), text: "Einnahme Kunde", betrag: 5800.00, highlight: false },
            ]),
            nebenrechnungen: [{ label: "Zinsen (5 % p.a., 1/12)", formel: `${fmt(darlehen)} × 5 % ÷ 12`, ergebnis: `${fmt(zins)} €` }, { label: "Gesamtrate", formel: `${fmt(tilgung)} + ${fmt(zins)}`, ergebnis: `${fmt(rate)} €` }],
            soll: [{ nr: "4250", name: "Langfristige Bankverbindlichkeiten (LBKV)", betrag: tilgung }, { nr: "7510", name: "Zinsaufwendungen (ZAW)", betrag: zins }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: rate }],
            nrPunkte: 1, erklaerung: `Tilgung mindert Schuld (2100 Soll, ${fmt(tilgung)} €). Zinsaufwand (4630 Soll, ${fmt(zins)} €). Gesamtabfluss ${fmt(rate)} € (2800 BK Haben).`,
          };
        },
      },
    ],
    "LB 4 · Kapitalanlage": [
      {
        id: "9_zinsgutschrift", titel: "Zinsgutschrift (Tagesgeld-/Sparkonto)",
        generate: f => {
          const zinsbetrag = rnd(50, 800, 10);
          const kontoart = pick(["Tagesgeldkonto", "Sparkonto", "Festgeldkonto"]);
          const bank = pick(["Volksbank Bayern", "Sparkasse München", "HypoVereinsbank", "DKB"]);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-5), text: "Überweisung Lieferant Schmidt GmbH", betrag: -3200, highlight: false },
              { datum: fakeDatum(-1), text: `${bank} – Zinsgutschrift ${kontoart}`, betrag: zinsbetrag, highlight: true },
              { datum: fakeDatum(0), text: "Zahlungseingang Kunde", betrag: 6400, highlight: false },
            ]),
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: zinsbetrag }],
            haben: [{ nr: "5710", name: "Zinserträge (ZE)", betrag: zinsbetrag }],
            nrPunkte: 0, erklaerung: "Zinsgutschrift erhöht das Bankguthaben (2800 BK Soll). Zinsen aus Geldanlage sind Erträge (5710 ZE Haben).",
          };
        },
      },
      {
        id: "9_depotgebuehren", titel: "Depotgebühren / Kontoführungsgebühren",
        generate: f => {
          const betrag = rnd(30, 200, 5);
          const art = pick(["Depotgebühren Quartal", "Kontoführungsgebühren Wertpapierdepot", "Depotpflegegebühr"]);
          const bank = pick(["Comdirect Bank", "DKB Deutsche Kreditbank", "ING-DiBa", "Consorsbank"]);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-6), text: "Eingang Kundenzahlung", betrag: 4800, highlight: false },
              { datum: fakeDatum(-2), text: `${bank} – ${art}`, betrag: -betrag, highlight: true },
              { datum: fakeDatum(0), text: "Überweisung Lieferant", betrag: -2100, highlight: false },
            ]),
            soll: [{ nr: "6750", name: "Kontoführungsgebühren (KGV)", betrag: betrag }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: betrag }],
            nrPunkte: 0, erklaerung: "Depotgebühren sind Aufwand (6750 KGV Soll). Bankguthaben sinkt (2800 BK Haben). Kein Vorsteuerabzug bei Finanzdienstleistungen!",
          };
        },
      },
      {
        id: "9_dividende", titel: "Dividendenzahlung eingehend",
        generate: f => {
          const div = rnd(200, 2000, 50); const aktie = pick(["Bayern AG","Munich Holding AG","Alpen Industries AG","Süddeutsche Technik AG"]);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-4), text: "Internetbuchung Media Markt", betrag: -349, highlight: false },
              { datum: fakeDatum(-2), text: `${aktie} – Dividendenzahlung GJ 2024`, betrag: div, highlight: true },
              { datum: fakeDatum(-1), text: "Überweisung Lieferant", betrag: -2400, highlight: false },
            ]),
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: div }],
            haben: [{ nr: "5780", name: "Dividendenerträge", betrag: div }],
            nrPunkte: 0, erklaerung: "Bankguthaben steigt (2800 BK Soll). Dividende = Ertrag aus Kapitalanlage (5780 DDE Haben).",
          };
        },
      },
      {
        id: "9_aktien_kauf", titel: "Aktien kaufen (Spesen aktiviert)",
        taskTyp: "rechnung",
        generate: f => {
          const aktie = pick(["Bayern AG","Munich Holding AG","Alpen Industries AG","Süddeutsche Technik AG","Nordbayern Holding AG"]);
          const stück = rnd(10, 100, 5); const kurs = rnd(50, 400, 5);
          const kw = r2(stück * kurs); const spesen = r2(kw * 0.01); const gesamt = r2(kw + spesen);
          return {
            aufgabe: `${f.name} kauft ${stück} Aktien der ${aktie} zum Kurs von ${fmt(kurs)} € pro Stück. Die Bank berechnet 1 % Spesen vom Kurswert. Ermitteln Sie den Kaufpreis (Bankbelastung) und bilden Sie den Buchungssatz.`,
            beleg: null,
            schema: [
              { label: `Kurswert = ${stück} Stk × ${fmt(kurs)} €`, wert: kw, einheit: "€" },
              { label: "+ Spesen (1 % vom KW)", wert: spesen, einheit: "€" },
              { label: "= Bankbelastung (Kaufpreis)", wert: gesamt, einheit: "€", bold: true, trennlinie: true },
              { label: "Buchungssatz: 1500 WP an 1200 BK", wert: gesamt, einheit: "€", bold: true },
            ],
            nebenrechnungen: [
              { label: "Kurswert", formel: `${stück} Stk × ${fmt(kurs)} €`, ergebnis: `${fmt(kw)} €` },
              { label: "Spesen (1 %)", formel: `${fmt(kw)} × 1 %`, ergebnis: `${fmt(spesen)} €` },
              { label: "Bankbelastung", formel: `${fmt(kw)} + ${fmt(spesen)}`, ergebnis: `${fmt(gesamt)} €` },
            ],
            soll: [{ nr: "1500", name: "Wertpapiere (Aktien)", betrag: gesamt }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: gesamt }],
            nrPunkte: 2,
            erklaerung: `Spesen werden beim Kauf aktiviert (nicht separat gebucht!). KW + Spesen = Einstandswert (1500 WP Soll). Bank (2800 BK Haben). Einstandswert gesamt: ${fmt(gesamt)} €.`,
          };
        },
      },
      {
        id: "9_aktien_vk_gewinn", titel: "Aktien verkaufen mit Kursgewinn",
        taskTyp: "rechnung",
        generate: f => {
          const aktie = pick(["Bayern AG","Munich Holding AG","Alpen Industries AG","Süddeutsche Technik AG"]);
          const stück = rnd(10, 80, 5);
          const einstand = rnd(60, 300, 5); const kurs = r2(einstand * (1 + (Math.random() * 0.3 + 0.05))); // 5–35% Gewinn
          const buchwert = r2(stück * einstand); const kw = r2(stück * kurs);
          const spesen = r2(kw * 0.01); const erloes = r2(kw - spesen);
          const gewinn = r2(erloes - buchwert);
          return {
            aufgabe: `${f.name} verkauft ${stück} Aktien der ${aktie}. Einstandswert je Aktie: ${fmt(einstand)} €, aktueller Kurs: ${fmt(kurs)} €. Spesen: 1 % vom Kurswert. Ermitteln Sie den Kursgewinn und bilden Sie den Buchungssatz.`,
            beleg: null,
            schema: [
              { label: `Kurswert = ${stück} Stk × ${fmt(kurs)} €`, wert: kw, einheit: "€" },
              { label: "− Spesen (1 % vom KW)", wert: spesen, einheit: "€" },
              { label: "= Bankgutschrift (Verkaufserlös)", wert: erloes, einheit: "€", bold: true, trennlinie: true },
              { label: `− Buchwert (${stück} Stk × ${fmt(einstand)} €)`, wert: buchwert, einheit: "€" },
              { label: "= Kursgewinn", wert: gewinn, einheit: "€", bold: true, highlight: true },
            ],
            nebenrechnungen: [
              { label: "Kurswert", formel: `${stück} × ${fmt(kurs)}`, ergebnis: `${fmt(kw)} €` },
              { label: "Spesen (1 %)", formel: `${fmt(kw)} × 1 %`, ergebnis: `${fmt(spesen)} €` },
              { label: "Buchwert", formel: `${stück} × ${fmt(einstand)}`, ergebnis: `${fmt(buchwert)} €` },
              { label: "Kursgewinn", formel: `${fmt(erloes)} − ${fmt(buchwert)}`, ergebnis: `${fmt(gewinn)} €` },
            ],
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: erloes }],
            haben: [{ nr: "1500", name: "Wertpapiere (Aktien)", betrag: buchwert }, { nr: "5650", name: "Erträge aus Wertpapieren (Kursgewinn)", betrag: gewinn }],
            nrPunkte: 3,
            erklaerung: `Bankgutschrift = KW − Spesen = ${fmt(erloes)} € (2800 BK Soll). WP-Konto mit Buchwert ausgebucht (1500 Haben, ${fmt(buchwert)} €). Differenz = Kursgewinn (5650 EAWP Haben, ${fmt(gewinn)} €).`,
          };
        },
      },
      {
        id: "9_aktien_vk_verlust", titel: "Aktien verkaufen mit Kursverlust",
        taskTyp: "rechnung",
        generate: f => {
          const aktie = pick(["Bayern AG","Munich Holding AG","Alpen Industries AG","Süddeutsche Technik AG"]);
          const stück = rnd(10, 80, 5);
          const einstand = rnd(80, 300, 5); const kurs = r2(einstand * (1 - (Math.random() * 0.25 + 0.05))); // 5–30% Verlust
          const buchwert = r2(stück * einstand); const kw = r2(stück * kurs);
          const spesen = r2(kw * 0.01); const erloes = r2(kw - spesen);
          const verlust = r2(buchwert - erloes);
          return {
            aufgabe: `${f.name} verkauft ${stück} Aktien der ${aktie}. Einstandswert je Aktie: ${fmt(einstand)} €, aktueller Kurs: ${fmt(kurs)} €. Spesen: 1 % vom Kurswert. Ermitteln Sie den Kursverlust und bilden Sie den Buchungssatz.`,
            beleg: null,
            schema: [
              { label: `Kurswert = ${stück} Stk × ${fmt(kurs)} €`, wert: kw, einheit: "€" },
              { label: "− Spesen (1 % vom KW)", wert: spesen, einheit: "€" },
              { label: "= Bankgutschrift (Verkaufserlös)", wert: erloes, einheit: "€", bold: true, trennlinie: true },
              { label: `Buchwert (${stück} Stk × ${fmt(einstand)} €)`, wert: buchwert, einheit: "€" },
              { label: "= Kursverlust (Buchwert − Erlös)", wert: verlust, einheit: "€", bold: true },
            ],
            nebenrechnungen: [
              { label: "Kurswert", formel: `${stück} × ${fmt(kurs)}`, ergebnis: `${fmt(kw)} €` },
              { label: "Spesen (1 %)", formel: `${fmt(kw)} × 1 %`, ergebnis: `${fmt(spesen)} €` },
              { label: "Buchwert", formel: `${stück} × ${fmt(einstand)}`, ergebnis: `${fmt(buchwert)} €` },
              { label: "Kursverlust", formel: `${fmt(buchwert)} − ${fmt(erloes)}`, ergebnis: `${fmt(verlust)} €` },
            ],
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: erloes }, { nr: "7460", name: "Verluste aus Wertpapieren (Kursverlust)", betrag: verlust }],
            haben: [{ nr: "1500", name: "Wertpapiere (Aktien)", betrag: buchwert }],
            nrPunkte: 3,
            erklaerung: `Bankgutschrift = KW − Spesen = ${fmt(erloes)} € (2800 BK Soll). Kursverlust = Aufwand (7460 VAWP Soll, ${fmt(verlust)} €). WP-Konto mit Buchwert ausgebucht (1500 Haben, ${fmt(buchwert)} €).`,
          };
        },
      },
    ],
    "LB 5 · Forderungsbewertung": [
      {
        id: "9_komplex_forderungskette",
        titel: "🔗 Forderungskette (konfigurierbar)",
        taskTyp: "komplex",
        generate: (f, opts = {}) => {
          const mitEwb    = opts.ewb === true;
          const ausgang   = opts.ausgang || "totalausfall"; // "totalausfall"|"teilausfall"|"wiederzahlung"
          const ewbPct    = opts.ewbPct  || 50;
          const quotePct  = opts.quotePct || 30;

          const kunde  = pick(KUNDEN);
          const art    = pick(f.fertigerzeugnisse);
          const menge  = rnd(5, 20, 1);
          const nr1    = augnr();

          // Basiszahlen: Verkauf
          const netto   = rnd(2000, 8000, 100);
          const ust     = r2(netto * 0.19);
          const brutto  = r2(netto + ust);

          // EWB: auf Netto der ZWFO-Forderung
          const ewbBetrag = r2(netto * ewbPct / 100);

          // Ausgang-Zahlen
          const quoteBrutto   = r2(brutto * quotePct / 100);
          const ausfallBrutto = r2(brutto - quoteBrutto);
          const ausfallNetto  = r2(ausfallBrutto / 1.19);
          const ausfallUst    = r2(ausfallBrutto - ausfallNetto);

          const schritte = [];
          let schrNr = 1;

          // ── Schritt 1: Verkauf auf Ziel ──────────────────────────────────
          schritte.push({
            nr: schrNr++,
            titel: "Verkauf auf Ziel (Ausgangsrechnung)",
            typ: "buchung",
            aufgabe: "Buchen Sie die folgende Ausgangsrechnung.",
            beleg: mkAusgangsRE(f, art, menge, "Stk", netto, 19),
            soll: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: brutto }],
            haben: [
              { nr: "5000", name: "Umsatzerlöse FE (UEFE)", betrag: netto },
              { nr: "4800", name: "Umsatzsteuer (UST)", betrag: ust },
            ],
            nrPunkte: 1,
            punkte: 1 + 2 + 1,
            erklaerung: `FO ${fmt(brutto)} € (Brutto) Soll. UEFE ${fmt(netto)} € Haben. UST ${fmt(ust)} € Haben.`,
          });

          // ── Schritt 2: Umbuchung auf zweifelhafte Forderungen ─────────────
          schritte.push({
            nr: schrNr++,
            titel: "Umbuchung: FO → Zweifelhafte Forderungen",
            typ: "buchung",
            aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
            beleg: mkEmail(
              "inkasso@mustermann-recht.de",
              "Mustermann & Partner Rechtsanwälte", f.email,
              `Zahlungsverzug ${kunde.name} – AR ${nr1}`,
              `Sehr geehrte Damen und Herren,

wie Sie uns mitgeteilt haben, befindet sich ${kunde.name} seit mehr als 90 Tagen im Zahlungsverzug bzgl. Ihrer Forderung AR ${nr1} (${fmt(brutto)} €).

Wir empfehlen, diese Forderung als zweifelhaft einzustufen und buchhalterisch umzubuchen.

Mit freundlichen Grüßen
Mustermann & Partner Rechtsanwälte`
            ),
            soll: [{ nr: "2470", name: "Zweifelhafte Forderungen (ZWFO)", betrag: brutto }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: brutto }],
            nrPunkte: 0,
            punkte: 1 + 1,
            erklaerung: `Bruttobetrag bleibt unverändert. Umbuchen auf gesondertes Konto ZWFO 2470 / FO 2400. Noch keine USt-Korrektur (Verlust noch nicht sicher).`,
          });

          // ── Schritt 3 (optional): EWB bilden ──────────────────────────────
          if (mitEwb) {
            schritte.push({
              nr: schrNr++,
              titel: `EWB bilden am 31.12. (geschätzter Ausfall ${ewbPct} %)`,
              typ: "buchung",
              aufgabe: `Am Jahresende wird der voraussichtliche Nettoausfall für die Forderung gegen ${kunde.name} auf ${ewbPct} % geschätzt. Berechnen Sie die EWB und bilden Sie den Buchungssatz.`,
              beleg: null,
              soll: [{ nr: "6950", name: "Abschreibungen auf Forderungen (ABFO)", betrag: ewbBetrag }],
              haben: [{ nr: "3670", name: "Einzelwertberichtigung (EWB)", betrag: ewbBetrag }],
              nrPunkte: 2,
              punkte: 1 + 1 + 2,
              erklaerung: `Indirekte Abschreibung: ABFO 6950 Soll, EWB 3670 Haben. Netto-ZWFO ${fmt(netto)} € × ${ewbPct} % = ${fmt(ewbBetrag)} €. USt noch NICHT korrigieren (Verlust noch nicht endgültig).`,
            });
          }

          // ── Schritt 4+: Ausgang ───────────────────────────────────────────
          if (ausgang === "totalausfall") {
            // Erst EWB auflösen (wenn vorhanden), dann Direktabschreibung
            if (mitEwb) {
              schritte.push({
                nr: schrNr++,
                titel: "EWB auflösen (Ausfall bestätigt)",
                typ: "buchung",
                aufgabe: `Das Insolvenzverfahren über ${kunde.name} wird eröffnet. Lösen Sie zunächst die EWB auf.`,
                beleg: null,
                soll: [{ nr: "3670", name: "Einzelwertberichtigung (EWB)", betrag: ewbBetrag }],
                haben: [{ nr: "6950", name: "Abschreibungen auf Forderungen (ABFO)", betrag: ewbBetrag }],
                nrPunkte: 0,
                punkte: 1 + 1,
                erklaerung: `EWB ist nicht mehr nötig (Verlust jetzt sicher). Auflösen: EWB 3670 Soll / ABFO 6950 Haben. Aufwand aus Schritt ${schrNr - 2} wird teilweise kompensiert.`,
              });
            }
            schritte.push({
              nr: schrNr++,
              titel: "Direktabschreibung – Totalausfall",
              typ: "buchung",
              aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
              beleg: mkEmail(
                "insolvent@amtsgericht-ingolstadt.de",
                "Amtsgericht Ingolstadt – Insolvenzabteilung", f.email,
                `Insolvenzverfahren ${kunde.name} – Forderungsausfall AR ${nr1}`,
                `Sehr geehrte Damen und Herren,

über das Vermögen von ${kunde.name} wurde das Insolvenzverfahren eröffnet. Ihre Forderung AR ${nr1} (${fmt(brutto)} € brutto) ist als endgültig uneinbringlich einzustufen.

Eine Insolvenzquote kann nicht ausgezahlt werden.

Bitte buchen Sie die Forderung aus. Beachten Sie die USt-Korrektur (§ 17 UStG).

Amtsgericht Ingolstadt`
              ),
              soll: [
                { nr: "6950", name: "Abschreibungen auf Forderungen (ABFO)", betrag: netto },
                { nr: "4800", name: "Umsatzsteuer (UST-Korrektur)", betrag: ust },
              ],
              haben: [{ nr: "2470", name: "Zweifelhafte Forderungen (ZWFO)", betrag: brutto }],
              nrPunkte: 2,
              punkte: 2 + 1 + 2,
              erklaerung: `Totalausfall: ABFO Soll ${fmt(netto)} € (Nettoverlust). UST 4800 Soll ${fmt(ust)} € (§ 17 UStG – nicht mehr geschuldet). ZWFO ${fmt(brutto)} € erlischt (Haben). NR: ${fmt(brutto)} ÷ 1,19 = ${fmt(netto)} €; ${fmt(brutto)} − ${fmt(netto)} = ${fmt(ust)} €.`,
            });

          } else if (ausgang === "teilausfall") {
            if (mitEwb) {
              schritte.push({
                nr: schrNr++,
                titel: "EWB auflösen (Ausfall anteilig bestätigt)",
                typ: "buchung",
                aufgabe: `Das Amtsgericht teilt eine Insolvenzquote von ${quotePct} % mit. Lösen Sie zunächst die EWB auf.`,
                beleg: null,
                soll: [{ nr: "3670", name: "Einzelwertberichtigung (EWB)", betrag: ewbBetrag }],
                haben: [{ nr: "6950", name: "Abschreibungen auf Forderungen (ABFO)", betrag: ewbBetrag }],
                nrPunkte: 0,
                punkte: 1 + 1,
                erklaerung: `EWB auflösen bevor Direktabschreibung auf tatsächlichen Ausfall. EWB 3670 Soll / ABFO 6950 Haben.`,
              });
            }
            schritte.push({
              nr: schrNr++,
              titel: `Teilausfall – Insolvenzquote ${quotePct} %`,
              typ: "buchung",
              aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
              beleg: mkEmail(
                "insolvent@amtsgericht-muenchen.de",
                "Amtsgericht München – Insolvenzabteilung", f.email,
                `Insolvenzverfahren ${kunde.name} – Insolvenzquote ${quotePct} %`,
                `Sehr geehrte Damen und Herren,

im Insolvenzverfahren über das Vermögen von ${kunde.name} konnte eine Insolvenzquote von ${quotePct} % ermittelt werden.

Die Zahlung von ${fmt(quoteBrutto)} € wird auf Ihr Bankkonto überwiesen. Die verbleibende Forderung AR ${nr1} (${fmt(ausfallBrutto)} € brutto) gilt als endgültig verloren.

Bitte beachten Sie die USt-Korrektur auf den Ausfallbetrag (§ 17 UStG).

Amtsgericht München`
              ),
              soll: [
                { nr: "2800", name: "Bank (BK)", betrag: quoteBrutto },
                { nr: "6950", name: "Abschreibungen auf Forderungen (ABFO)", betrag: ausfallNetto },
                { nr: "4800", name: "Umsatzsteuer (UST-Korrektur auf Ausfall)", betrag: ausfallUst },
              ],
              haben: [{ nr: "2470", name: "Zweifelhafte Forderungen (ZWFO)", betrag: brutto }],
              nrPunkte: 3,
              punkte: 3 + 1 + 3,
              erklaerung: `Teilzahlung ${fmt(quoteBrutto)} € (BK Soll). Nettoausfall ${fmt(ausfallNetto)} € = Verlust (ABFO Soll). USt auf Ausfall ${fmt(ausfallUst)} € korrigieren (§ 17 UStG). ZWFO ${fmt(brutto)} € erlischt (Haben). NR: ${fmt(ausfallBrutto)} ÷ 1,19 = ${fmt(ausfallNetto)} €.`,
            });

          } else { // wiederzahlung
            if (mitEwb) {
              schritte.push({
                nr: schrNr++,
                titel: "Doch noch gezahlt – EWB auflösen",
                typ: "buchung",
                aufgabe: `${kunde.name} begleicht die Forderung doch noch vollständig. Lösen Sie zunächst die EWB auf.`,
                beleg: null,
                soll: [{ nr: "3670", name: "Einzelwertberichtigung (EWB)", betrag: ewbBetrag }],
                haben: [{ nr: "6950", name: "Abschreibungen auf Forderungen (ABFO)", betrag: ewbBetrag }],
                nrPunkte: 0,
                punkte: 1 + 1,
                erklaerung: `EWB war nicht nötig → auflösen: EWB 3670 Soll / ABFO 6950 Haben. Aufwand aus EWB-Bildung wird rückgängig gemacht.`,
              });
            }
            schritte.push({
              nr: schrNr++,
              titel: "Zahlungseingang (trotz Zweifel vollständig)",
              typ: "buchung",
              aufgabe: "Bilden Sie den Buchungssatz zur markierten Bankbuchung.",
              beleg: mkKontoauszug(f, [
                { datum: fakeDatum(-3), text: "Miete Lager", betrag: -1400, highlight: false },
                { datum: fakeDatum(-1), text: `${kunde.name}, AR ${nr1} (trotz Mahn.)`, betrag: brutto, highlight: true },
                { datum: fakeDatum(0),  text: "Energie / Stadtwerke", betrag: -380, highlight: false },
              ]),
              soll: [{ nr: "2800", name: "Bank (BK)", betrag: brutto }],
              haben: [{ nr: "2470", name: "Zweifelhafte Forderungen (ZWFO)", betrag: brutto }],
              nrPunkte: 0,
              punkte: 1 + 1,
              erklaerung: `Forderung war noch nicht direkt abgeschrieben (ZWFO besteht noch). Normale Zahlung: BK Soll / ZWFO Haben. Keine USt-Korrektur nötig.`,
            });
          }

          const ausgangText = ausgang === "totalausfall" ? "Totalausfall (Insolvenz)" : ausgang === "teilausfall" ? `Teilausfall (Quote ${quotePct} %)` : "Doch noch gezahlt";
          const kontext = [
            `${f.name} liefert ${menge} Stk. ${art} an ${kunde.name}, ${kunde.ort}.`,
            `${kunde.name} gerät in Zahlungsverzug → Umbuchung auf zweifelhafte Forderungen.`,
            mitEwb ? `Jahresende: EWB bilden (${ewbPct} % Nettoausfall).` : "",
            `Ausgang: ${ausgangText}.`,
          ].filter(Boolean).join(" ");

          return { kontext, schritte };
        },
      },
      {
        id: "9_umbuchung_zwfo", titel: "Umbuchung auf zweifelhafte Forderungen",
        generate: f => {
          const k = pick(KUNDEN); const brutto = rnd(2000, 8000, 100); const nr = augnr();
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
            beleg: mkEmail(`inkasso@mustermann-recht.de`, "Mustermann & Partner Rechtsanwälte", f.email,
              `Zahlungsverzug ${k.name} – ${nr}`,
              `Sehr geehrte Damen und Herren,\n\nwie Sie uns mitgeteilt haben, befindet sich ${k.name} seit mehr als 90 Tagen im Zahlungsverzug bzgl. Ihrer Forderung ${nr} (${fmt(brutto)} €).\n\nWir empfehlen, diese Forderung als zweifelhaft einzustufen und entsprechend buchhalterisch umzubuchen.\n\nFür weitere Fragen stehen wir gerne zur Verfügung.\n\nMit freundlichen Grüßen\nMustermann & Partner Rechtsanwälte`),
            soll: [{ nr: "2470", name: "Zweifelhafte Forderungen", betrag: brutto }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: brutto }],
            nrPunkte: 0, erklaerung: "Zweifelhafte Forderungen werden auf ein gesondertes Konto umgebucht (2470 Soll / 1400 Haben). Bruttobetrag bleibt.",
          };
        },
      },
      {
        id: "9_ford_ausfall", titel: "Direktabschreibung uneinbringlicher Forderung (100 %)",
        generate: f => {
          const k = pick(KUNDEN); const brutto = rnd(1000, 5000, 100); const netto = r2(brutto / 1.19); const ust = r2(brutto - netto); const nr = augnr();
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
            beleg: mkEmail(`insolvent@amtsgericht-ingolstadt.de`, "Amtsgericht Ingolstadt – Insolvenzabteilung", f.email,
              `Insolvenzverfahren ${k.name} – Forderungsausfall`,
              `Sehr geehrte Damen und Herren,\n\nüber das Vermögen von ${k.name} wurde mit Beschluss vom ${fakeDatum(-10)} das Insolvenzverfahren eröffnet.\n\nIhre offene Forderung ${nr} (${fmt(brutto)} € brutto) ist als endgültig uneinbringlich einzustufen. Eine Quote kann nicht ausgezahlt werden.\n\nBitte buchen Sie die Forderung aus. Beachten Sie die erforderliche Umsatzsteuerkorrektur (§ 17 UStG).\n\nAmtsgericht Ingolstadt`),
            nebenrechnungen: [{ label: "Nettobetrag (Verlust)", formel: `${fmt(brutto)} ÷ 1,19`, ergebnis: `${fmt(netto)} €` }, { label: "USt-Korrektur", formel: `${fmt(brutto)} − ${fmt(netto)}`, ergebnis: `${fmt(ust)} €` }],
            soll: [{ nr: "6950", name: "Abschreibungen auf Forderungen", betrag: netto }, { nr: "4800", name: "Umsatzsteuer (UST-Korrektur)", betrag: ust }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: brutto }],
            nrPunkte: 2, erklaerung: `Nettobetrag = Verlust (6950 ABFO Soll). USt nicht mehr geschuldet (4400 Soll, § 17 UStG). Bruttoforderung erlischt (2400 FO Haben).`,
          };
        },
      },
      {
        id: "9_ford_teilausfall", titel: "Teilausfall einer Forderung (Teilzahlung + Abschreibung)",
        generate: f => {
          const k = pick(KUNDEN); const brutto = rnd(2000, 8000, 100); const nr = augnr();
          const quotePct = [10,20,25,30,40,50][Math.floor(Math.random()*6)];
          const zahlung = r2(brutto * quotePct / 100);
          const ausfall_brutto = r2(brutto - zahlung);
          const ausfall_netto = r2(ausfall_brutto / 1.19); const ausfall_ust = r2(ausfall_brutto - ausfall_netto);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
            beleg: mkEmail(`insolvent@amtsgericht-muenchen.de`, "Amtsgericht München – Insolvenzabteilung", f.email,
              `Insolvenzverfahren ${k.name} – Teilzahlung ${quotePct} %`,
              `Sehr geehrte Damen und Herren,\n\nim Insolvenzverfahren über das Vermögen von ${k.name} konnte eine Insolvenzquote von ${quotePct} % ermittelt werden.\n\nDie Zahlung von ${fmt(zahlung)} € wird Ihnen heute auf das Bankkonto überwiesen. Ihre Forderung ${nr} (${fmt(brutto)} € brutto) gilt damit als abgeschlossen. Der verbleibende Betrag von ${fmt(ausfall_brutto)} € brutto ist endgültig verloren.\n\nAmtsgericht München`),
            nebenrechnungen: [
              { label: "Bruttoausfall", formel: `${fmt(brutto)} − ${fmt(zahlung)}`, ergebnis: `${fmt(ausfall_brutto)} €` },
              { label: "Nettoausfall (Verlust)", formel: `${fmt(ausfall_brutto)} ÷ 1,19`, ergebnis: `${fmt(ausfall_netto)} €` },
              { label: "USt-Korrektur auf Ausfall", formel: `${fmt(ausfall_brutto)} − ${fmt(ausfall_netto)}`, ergebnis: `${fmt(ausfall_ust)} €` },
            ],
            soll: [{ nr: "2800", name: "Bank (BK — Teilzahlung)", betrag: zahlung }, { nr: "6950", name: "Abschreibungen auf Forderungen (Nettoausfall)", betrag: ausfall_netto }, { nr: "4800", name: "Umsatzsteuer (UST-Korrektur Ausfall)", betrag: ausfall_ust }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: brutto }],
            nrPunkte: 3, erklaerung: `Teilzahlung (1200 Soll, ${fmt(zahlung)} €). Nettoausfall = Verlust (6950 Soll). USt auf Ausfall korrigieren (4400 Soll, §17 UStG). Bruttoforderung erlischt (1400 Haben, ${fmt(brutto)} €).`,
          };
        },
      },
      {
        id: "9_ford_wiederzahlung", titel: "Zahlung einer bereits abgeschriebenen Forderung",
        generate: f => {
          const k = pick(KUNDEN); const brutto = rnd(1000, 4000, 100); const netto = r2(brutto / 1.19); const ust = r2(brutto - netto); const nr = augnr();
          return {
            aufgabe: "Bilden Sie den Buchungssatz zur markierten Buchung im Kontoauszug.",
            beleg: mkKontoauszug(f, [
              { datum: fakeDatum(-5), text: "Wareneinkauf Lieferant", betrag: -2800, highlight: false },
              { datum: fakeDatum(-2), text: `${k.name}, ${nr} (trotz Abschreibung eingegangen)`, betrag: brutto, highlight: true },
              { datum: fakeDatum(-1), text: "Miete Büro", betrag: -950, highlight: false },
            ]),
            nebenrechnungen: [{ label: "Nettobetrag", formel: `${fmt(brutto)} ÷ 1,19`, ergebnis: `${fmt(netto)} €` }, { label: "USt-Betrag", formel: `${fmt(brutto)} − ${fmt(netto)}`, ergebnis: `${fmt(ust)} €` }],
            soll: [{ nr: "2800", name: "Bank (BK)", betrag: brutto }],
            haben: [{ nr: "5495", name: "Erträge aus Forderungseingang (vorher abgeschr.)", betrag: netto }, { nr: "4800", name: "Umsatzsteuer (UST — nachträgl. Schuld)", betrag: ust }],
            nrPunkte: 1, erklaerung: `Zahlung wider Erwarten → Ertrag (5495 EFO Haben, Nettobetrag ${fmt(netto)} €). USt nachträglich wieder schulden (4400 Haben, ${fmt(ust)} €). Bank steigt (1200 Soll, ${fmt(brutto)} €).`,
          };
        },
      },
      {
        id: "9_ewb", titel: "Einzelwertberichtigung (EWB) am Jahresende",
        taskTyp: "rechnung",
        generate: f => {
          const k = pick(KUNDEN); const brutto = rnd(3000, 10000, 100); const netto = r2(brutto / 1.19);
          const ausfallPct = [30, 40, 50, 60, 70, 80][Math.floor(Math.random()*6)];
          const ewb = r2(netto * ausfallPct / 100);
          return {
            aufgabe: `Die zweifelhafte Forderung gegen ${k.name} beträgt ${fmt(brutto)} € brutto. Am 31.12. wird der voraussichtliche Nettoausfall auf ${ausfallPct} % geschätzt. Berechnen Sie den EWB-Betrag und bilden Sie den Buchungssatz.`,
            beleg: null,
            schema: [
              { label: "Bruttoforderung (auf Konto 2470 ZWFO)", wert: brutto, einheit: "€" },
              { label: "Nettoforderung = Brutto ÷ 1,19", wert: netto, einheit: "€" },
              { label: `Geschätzter Nettoausfall (${ausfallPct} %)`, wert: ewb, einheit: "€", bold: true, trennlinie: true },
              { label: "Buchungssatz: 6950 ABFO an 3670 EWB", wert: ewb, einheit: "€", bold: true },
              { label: "USt wird erst bei tatsächlichem Verlust berichtigt!", wert: " ", einheit: "" },
            ],
            nebenrechnungen: [{ label: "Nettoforderung", formel: `${fmt(brutto)} ÷ 1,19`, ergebnis: `${fmt(netto)} €` }, { label: `EWB (${ausfallPct} % Nettoausfall)`, formel: `${fmt(netto)} × ${ausfallPct} %`, ergebnis: `${fmt(ewb)} €` }],
            soll: [{ nr: "6950", name: "Abschreibungen auf Forderungen", betrag: ewb }],
            haben: [{ nr: "3670", name: "Einzelwertberichtigung (EWB)", betrag: ewb }],
            nrPunkte: 2, erklaerung: `EWB = indirekte Abschreibung → Wertberichtigungskonto 3670 (nicht direkt von 2470 abbuchen!). USt darf noch nicht berichtigt werden, da Höhe des Verlusts noch unsicher. Aufwand: 6950 ABFO Soll. EWB: 3670 Haben.`,
          };
        },
      },
      {
        id: "9_pwb", titel: "Pauschalwertberichtigung (PWB) am Jahresende",
        taskTyp: "rechnung",
        generate: f => {
          const brutto = rnd(30000, 120000, 1000); const netto = r2(brutto / 1.19);
          const pwbPct = [1, 2][Math.floor(Math.random()*2)];
          const pwb = r2(netto * pwbPct / 100);
          return {
            aufgabe: `Die einwandfreien Forderungen aus L+L betragen am 31.12. insgesamt ${fmt(brutto)} € brutto. Es wird eine pauschale Wertberichtigung von ${pwbPct} % auf die Nettoforderungen gebildet. Berechnen Sie den PWB-Betrag und bilden Sie den Buchungssatz.`,
            beleg: null,
            schema: [
              { label: "Brutto-Forderungen (Konto 2400 FO)", wert: brutto, einheit: "€" },
              { label: "Netto-Forderungen = Brutto ÷ 1,19", wert: netto, einheit: "€", bold: true },
              { label: `PWB = Netto-FO × ${pwbPct} %`, wert: pwb, einheit: "€", bold: true, trennlinie: true },
              { label: "Buchungssatz: 6950 ABFO an 3680 PWB", wert: pwb, einheit: "€", bold: true },
            ],
            nebenrechnungen: [{ label: "Netto-Forderungen", formel: `${fmt(brutto)} ÷ 1,19`, ergebnis: `${fmt(netto)} €` }, { label: `PWB (${pwbPct} % der Netto-FO)`, formel: `${fmt(netto)} × ${pwbPct} %`, ergebnis: `${fmt(pwb)} €` }],
            soll: [{ nr: "6950", name: "Abschreibungen auf Forderungen", betrag: pwb }],
            haben: [{ nr: "3680", name: "Pauschalwertberichtigung (PWB)", betrag: pwb }],
            nrPunkte: 2, erklaerung: `PWB = allgemeines Ausfallrisiko (1–2 % der Netto-FO). Indirekte Abschreibung über Konto 3680 PWB (nicht direkt von 2400 abbuchen). Aufwand: 6950 ABFO Soll. PWB: 3680 Haben.`,
          };
        },
      },
    ],
    "Kontenabschluss": [
      {
        id: "9_abs_anlage", titel: "Anlagenkonto über SBK abschließen",
        generate: f => {
          const anlage = pick(f.anlagen);
          const aw = rnd(20000,100000,1000);
          const afa = rnd(2000,10000,500);
          const bw = r2(aw - afa);
          return {
            aufgabe: `Eine ${anlage} hat einen Anschaffungswert von ${fmt(aw)} €, kumulierte Abschreibungen ${fmt(afa)} €. Buchwert: ${fmt(bw)} €. Schließen Sie das Konto ab.`,
            beleg: null,
            schema: [
              { label: "Anschaffungswert (01.01.)", wert: aw, einheit: "€" },
              { label: "− AfA (lfd. Jahr)", wert: afa, einheit: "€" },
              { label: "= Buchwert (31.12.)", wert: bw, einheit: "€", bold: true, trennlinie: true },
              { label: "Buchungssatz: SBK an MA", wert: bw, einheit: "€", bold: true },
            ],
            soll: [{ nr: "8010", name: "Schlussbilanzkonto (SBK)", betrag: bw }],
            haben: [{ nr: "0700", name: "Maschinen und Anlagen (MA)", betrag: bw }],
            nrPunkte: 2,
            erklaerung: `MA-Konto zeigt Buchwert nach AfA. Abschluss: SBK an MA mit Buchwert ${fmt(bw)} €.`,
          };
        },
      },
      {
        id: "9_abs_forderungen", titel: "Forderungskonto (nach EWB/PWB) abschließen",
        generate: f => {
          const fo_brutto = rnd(10000,50000,1000);
          const ewb = rnd(500,3000,100);
          const pwb_pct = pick([1,2,3]);
          const pwb = r2((fo_brutto - ewb) * pwb_pct / 100);
          const fo_netto = r2(fo_brutto - ewb - pwb);
          return {
            aufgabe: `Forderungen (FO): ${fmt(fo_brutto)} €, EWB: ${fmt(ewb)} €, PWB (${pwb_pct}%): ${fmt(pwb)} €. Wie werden die Forderungen in der Schlussbilanz ausgewiesen? Buchungssätze für den Abschluss.`,
            beleg: null,
            schema: [
              { label: "FO-Brutto (2400)", wert: fo_brutto, einheit: "€" },
              { label: `− Einzelwertberichtigung (EWB ${fmt(ewb)} €)`, wert: ewb, einheit: "€" },
              { label: `− Pauschalwertberichtigung (PWB ${pwb_pct}%)`, wert: pwb, einheit: "€" },
              { label: "= FO-Nettobetrag (Bilanzbetrag)", wert: fo_netto, einheit: "€", bold: true, trennlinie: true },
            ],
            soll: [{ nr: "8010", name: "Schlussbilanzkonto (SBK)", betrag: fo_netto }],
            haben: [{ nr: "2400", name: "Forderungen aus L+L (FO)", betrag: fo_netto }],
            nrPunkte: 3,
            erklaerung: `Forderungen stehen netto in der Bilanz: FO − EWB − PWB = ${fmt(fo_netto)} €. EWB und PWB (Passivkonten) werden ebenfalls über SBK abgeschlossen.`,
          };
        },
      },
      {
        id: "9_abs_erfolgskonten_komplett", titel: "Kompletter Kontenabschluss: Reihenfolge",
        taskTyp: "rechnung",
        generate: f => {
          const uefe = rnd(80000,200000,5000);
          const awr = rnd(30000,80000,2000);
          const lg = rnd(20000,50000,1000);
          const absa = rnd(3000,10000,500);
          const ertrag = uefe;
          const aufwand = r2(awr+lg+absa);
          const erfolg = r2(ertrag - aufwand);
          const typ = erfolg >= 0 ? "Gewinn" : "Verlust";
          return {
            aufgabe: `Nennen Sie die korrekte Reihenfolge des Jahresabschlusses und zeigen Sie die wichtigsten Buchungen. Gegeben: UEFE ${fmt(uefe)} €, AWR ${fmt(awr)} €, LG ${fmt(lg)} €, ABSA ${fmt(absa)} €.`,
            beleg: null,
            schema: [
              { label: "① Vorabschlussbuchungen (NR→AWR, EBFE→UEFE)", wert: null, einheit: "" },
              { label: "② Abschluss Aufwandskonten → GUV (AWR, LG, ABSA…)", wert: r2(awr+lg+absa), einheit: "€" },
              { label: "③ Abschluss Ertragskonten → GUV (UEFE…)", wert: uefe, einheit: "€" },
              { label: `④ GUV-Saldo = ${typ}`, wert: Math.abs(erfolg), einheit: "€", bold: true, trennlinie: true },
              { label: `⑤ ${typ === "Gewinn" ? "GUV an EK" : "EK an GUV"}`, wert: Math.abs(erfolg), einheit: "€", bold: true },
              { label: "⑥ Bestandskonten → SBK (AK→SBK, PK an SBK)", wert: null, einheit: "" },
            ],
            nrPunkte: 6,
            erklaerung: "Reihenfolge: Vorabschluss → Aufwand/Ertrag → GUV → EK → SBK. Erfolgskonten immer vor Bestandskonten abschließen.",
          };
        },
      },
    ],
    "Theorie · Bewertung & Personal": [
      {
        id: "9_th_afa_begriffe", titel: "Abschreibung (AfA) – Grundbegriffe",
        taskTyp: "theorie", themenTyp: "lueckentext",
        generate: () => ({
          aufgabe: "Ergänzen Sie den Lückentext zu Abschreibungen.",
          lueckentext: {
            text: "Abschreibungen erfassen den {0} von Anlagegütern über die Nutzungsdauer. Bei der {1} Abschreibung wird der Anschaffungswert gleichmäßig auf die Nutzungsdauer verteilt. Formel: AfA = {2} ÷ Nutzungsdauer. Der Wert des Anlageguts in der Bilanz nach Abzug der Abschreibungen heißt {3}. Gebucht wird: {4} an Maschinen und Anlagen.",
            luecken: ["Wertverlust", "linearen", "Anschaffungswert", "Buchwert (Restwert)", "Abschreibungen auf Sachanlagen (AFAA 6200)"],
            wortbank: ["Abschreibungen auf Sachanlagen (AFAA 6200)", "Anschaffungswert", "Buchwert (Restwert)", "degressiven", "Gewinn", "linearen", "Wertverlust"],
          }, nrPunkte: 5,
        }),
      },
      {
        id: "9_th_forderungsbewertung", titel: "Forderungsbewertung – EWB und PWB",
        taskTyp: "theorie", themenTyp: "zuordnung",
        generate: () => ({
          aufgabe: "Ordnen Sie die Begriffe zur Forderungsbewertung den richtigen Beschreibungen zu.",
          zuordnung: { paare: [
            { term: "Zweifelhafte Forderung",        def: "Forderung, deren Eingang unsicher ist → Umbuchung auf Konto 2470" },
            { term: "Uneinbringliche Forderung",      def: "Forderung, die endgültig nicht mehr bezahlt wird → Direktabschreibung" },
            { term: "Einzelwertberichtigung (EWB)",   def: "Indirekte Abschreibung auf eine bestimmte zweifelhafte Forderung (Netto × %)" },
            { term: "Pauschalwertberichtigung (PWB)", def: "Allgemeines Ausfallrisiko auf alle einwandfreien Forderungen (1–2 % der Netto-FO)" },
            { term: "§ 17 UStG",                     def: "Erlaubt Korrektur der Umsatzsteuer bei tatsächlichem, endgültigem Forderungsausfall" },
          ]}, nrPunkte: 5,
        }),
      },
      {
        id: "9_th_personal_erklaerung", titel: "Personalkosten – Brutto und Netto",
        taskTyp: "theorie", themenTyp: "freitext",
        generate: () => ({
          aufgabe: "Erklären Sie den Unterschied zwischen Bruttolohn und Nettolohn. Welche Abzüge werden vom Bruttolohn vorgenommen?",
          freitext: { zeilen: 6,
            loesung: `Bruttolohn: Gesamtlohn vor allen Abzügen, d. h. das vereinbarte Entgelt laut Arbeitsvertrag.

Vom Bruttolohn werden abgezogen:
• Lohnsteuer (abhängig von Steuerklasse und Bruttogehalt)
• Arbeitnehmeranteil zur Sozialversicherung (Kranken-, Pflege-, Renten-, Arbeitslosenversicherung)

Nettolohn: Ausgezahlter Betrag nach Abzug aller Steuern und Sozialversicherungsbeiträge.`,
          }, nrPunkte: 4,
        }),
      },
      {
        id: "9_th_anlagen_mc", titel: "Anlagenbereich – Multiple Choice",
        taskTyp: "theorie", themenTyp: "mc",
        generate: () => ({
          aufgabe: "Beantworten Sie die Fragen zum Anlagenbereich.",
          mc: { fragen: [
            { frage: "Was versteht man unter dem Anschaffungswert?",
              optionen: ["Aktueller Marktwert der Anlage", "Preis bei der Anschaffung inkl. Nebenkosten", "Restbuchwert am Jahresende", "AfA-Betrag pro Jahr"], richtig: 1 },
            { frage: "Wie lautet der Buchungssatz bei linearer AfA?",
              optionen: ["AFAA an Eigenkapital", "AFAA an Maschinen und Anlagen", "Maschinen und Anlagen an AFAA", "Bank an Maschinen"], richtig: 1 },
            { frage: "Was gibt der Buchwert (Restwert) einer Anlage an?",
              optionen: ["Den ursprünglichen Kaufpreis", "Den Verkaufspreis am Markt", "Anschaffungswert minus kumulierte Abschreibungen", "Den Schrottwert"], richtig: 2 },
            { frage: "Auf welcher Seite der Bilanz steht Anlagevermögen?",
              optionen: ["Passivseite", "Aktivseite", "In der GuV", "Im Anhang"], richtig: 1 },
          ]}, nrPunkte: 4,
        }),
      },
      {
        id: "9_th_vergleich_ewb_pwb", titel: "EWB und PWB – Vergleich",
        taskTyp: "theorie", themenTyp: "freitext",
        generate: () => ({
          aufgabe: "Vergleichen Sie EWB (Einzelwertberichtigung) und PWB (Pauschalwertberichtigung). Nennen Sie je Buchungssatz und Bemessungsgrundlage.",
          freitext: { zeilen: 6,
            loesung: `EWB (Einzelwertberichtigung):
• Bezieht sich auf eine einzelne, konkret zweifelhafte Forderung
• Bemessungsgrundlage: geschätzter Nettoausfall in %
• Buchungssatz: ABFO 6950 an EWB 3670

PWB (Pauschalwertberichtigung):
• Erfasst das allgemeine Ausfallrisiko aller einwandfreien Forderungen
• Bemessungsgrundlage: 1–2 % der Netto-Forderungen aus L+L
• Buchungssatz: ABFO 6950 an PWB 3680`,
          }, nrPunkte: 4,
        }),
      },
    ],
  },
  10: {
    "LB 1 · Abgrenzung & Rückstellungen": [
      {
        id: "10_komplex_abschlusskette",
        titel: "🔗 Jahresabschluss-Kette (konfigurierbar)",
        taskTyp: "komplex",
        generate: (f, opts = {}) => {
          const mitARA   = opts.ara    !== false;  // default: an
          const mitRST   = opts.rst    !== false;  // default: an
          const mitAFA   = opts.afa    !== false;  // default: an
          const mitEWB   = opts.ewb    === true;
          const mitGuV   = opts.guv    !== false;  // default: an
          const mitKenn  = opts.kennzahlen === true;

          const anlage   = pick(f.anlagen);
          const aw       = rnd(20000, 80000, 1000);
          const nutzung  = pick([5, 8, 10]);
          const afa      = r2(aw / nutzung);
          const bwVorher = rnd(aw, aw, 1); // vereinfacht: 1. Jahr
          const bwNach   = r2(aw - afa);

          // ARA: Vorauszahlung (z.B. Versicherung, gezahlt am 01.10.)
          const jahresMiete  = rnd(6000, 24000, 600);
          const monat        = r2(jahresMiete / 12);
          const araMonate    = pick([2, 3, 4]);
          const araBetrag    = r2(monat * araMonate);
          const aufwandDJ    = r2(jahresMiete - araBetrag);
          const aufwandKonto = pick([
            { nr: "6700", name: "Mieten und Pachten (AWMP)" },
            { nr: "6900", name: "Versicherungsbeiträge (VBEI)" },
          ]);

          // Rückstellung
          const rstSzenarien = [
            { art: "Prozesskosten (laufende Klage)", betrag: rnd(3000, 12000, 500), nr: "6990", kto: "Rückstellungsaufwand" },
            { art: "Reparaturrückstellung (Kostenvoranschlag liegt vor)", betrag: rnd(2000, 8000, 500), nr: "6990", kto: "Rückstellungsaufwand" },
          ];
          const rst = pick(rstSzenarien);

          // EWB: auf zweifelhafte Forderung
          const ewbBrutto = rnd(4000, 10000, 100);
          const ewbNetto  = r2(ewbBrutto / 1.19);
          const ewbPct    = opts.ewbPct || pick([30, 40, 50]);
          const ewbBetrag = r2(ewbNetto * ewbPct / 100);
          const kunde     = pick(KUNDEN);

          // GuV: einfache Ergebnisermittlung
          const umsatz  = rnd(80000, 200000, 5000);
          const aufwand = r2(umsatz * (pick([55, 60, 65, 70]) / 100));
          const afaJahr = mitAFA ? afa : rnd(3000, 8000, 500);
          const rstJahr = mitRST ? rst.betrag : rnd(1000, 4000, 500);
          const araKorr = mitARA ? -araBetrag : 0; // ARA mindert Aufwand dieses Jahres
          const ewbJahr = mitEWB ? ewbBetrag : 0;
          const gesamtAufw = r2(aufwand + afaJahr + rstJahr + ewbJahr + araKorr);
          const gewinn  = r2(umsatz - gesamtAufw);

          // Kennzahlen
          const ek = rnd(150000, 500000, 10000);
          const fk = rnd(80000, 300000, 10000);
          const gk = r2(ek + fk);
          const ekQuote = r2(ek / gk * 100);
          const ekRent  = r2(gewinn / ek * 100);

          const schritte = [];
          let schrNr = 1;

          // ── ARA bilden ────────────────────────────────────────────────────
          if (mitARA) {
            schritte.push({
              nr: schrNr++,
              titel: `ARA bilden (${araMonate} Monate Folgejahr)`,
              typ: "buchung",
              aufgabe: `Bilden Sie den Buchungssatz zur Jahresvorauszahlung (${aufwandKonto.name}). Von ${fmt(jahresMiete)} € entfallen ${araMonate} Monate auf das Folgejahr.`,
              beleg: mkEingangsRE(f, `Jahresvorauszahlung ${aufwandKonto.name} (01.10.–30.09.)`, 1, "Jahr", jahresMiete, 0, false),
              soll: [{ nr: "2900", name: "Aktiver Rechnungsabgrenzungsposten (ARA)", betrag: araBetrag }],
              haben: [{ nr: aufwandKonto.nr, name: aufwandKonto.name, betrag: araBetrag }],
              nrPunkte: 2,
              punkte: 1 + 1 + 2,
              erklaerung: `${araMonate} Monate gehören ins Folgejahr → ARA aktivieren. NR: ${fmt(jahresMiete)} ÷ 12 = ${fmt(monat)} €/Monat × ${araMonate} = ${fmt(araBetrag)} €. ARA 2900 Soll / ${aufwandKonto.nr} Haben.`,
            });
          }

          // ── Rückstellung bilden ───────────────────────────────────────────
          if (mitRST) {
            schritte.push({
              nr: schrNr++,
              titel: `Rückstellung bilden (${rst.art})`,
              typ: "buchung",
              aufgabe: `Bilden Sie zum 31.12. eine Rückstellung für ${rst.art} in Höhe von ${fmt(rst.betrag)} €.`,
              beleg: null,
              soll: [{ nr: "6990", name: "Rückstellungsaufwand", betrag: rst.betrag }],
              haben: [{ nr: "3900", name: "Rückstellungen (RST)", betrag: rst.betrag }],
              nrPunkte: 0,
              punkte: 1 + 1,
              erklaerung: `Ungewisse Verbindlichkeit → Rückstellung (3900 FK). Aufwand 6990 Soll ${fmt(rst.betrag)} €, RST 3900 Haben. Kein Geldabfluss, nur Abgrenzung.`,
            });
          }

          // ── AfA buchen ────────────────────────────────────────────────────
          if (mitAFA) {
            schritte.push({
              nr: schrNr++,
              titel: `Abschreibung (AfA) auf ${anlage}`,
              typ: "buchung",
              aufgabe: `Buchen Sie die lineare Jahres-AfA auf ${anlage}. Anschaffungswert: ${fmt(aw)} €, Nutzungsdauer: ${nutzung} Jahre.`,
              beleg: null,
              soll: [{ nr: "6200", name: "Abschreibungen auf Sachanlagen (AFAA)", betrag: afa }],
              haben: [{ nr: "0700", name: "Maschinen und Anlagen (MA)", betrag: afa }],
              nrPunkte: 2,
              punkte: 1 + 1 + 2,
              erklaerung: `Linear: ${fmt(aw)} € ÷ ${nutzung} Jahre = ${fmt(afa)} €/Jahr. AFAA 6200 Soll, MA 0700 Haben (direktes Verfahren). Buchwert: ${fmt(aw)} − ${fmt(afa)} = ${fmt(bwNach)} €.`,
            });
          }

          // ── EWB bilden ────────────────────────────────────────────────────
          if (mitEWB) {
            schritte.push({
              nr: schrNr++,
              titel: `EWB bilden (${ewbPct} % auf zweifelhafte Forderung)`,
              typ: "buchung",
              aufgabe: `Die zweifelhafte Forderung gegen ${kunde.name} beträgt ${fmt(ewbBrutto)} € brutto. Der voraussichtliche Nettoausfall wird auf ${ewbPct} % geschätzt. Berechnen Sie die EWB und bilden Sie den Buchungssatz.`,
              beleg: null,
              soll: [{ nr: "6950", name: "Abschreibungen auf Forderungen (ABFO)", betrag: ewbBetrag }],
              haben: [{ nr: "3670", name: "Einzelwertberichtigung (EWB)", betrag: ewbBetrag }],
              nrPunkte: 2,
              punkte: 1 + 1 + 2,
              erklaerung: `EWB = indirekte Abschreibung. Netto: ${fmt(ewbBrutto)} ÷ 1,19 = ${fmt(ewbNetto)} €. EWB: ${fmt(ewbNetto)} × ${ewbPct} % = ${fmt(ewbBetrag)} €. ABFO 6950 Soll, EWB 3670 Haben. USt noch nicht korrigieren!`,
            });
          }

          // ── GuV-Abschluss ─────────────────────────────────────────────────
          if (mitGuV) {
            const istGewinn = gewinn >= 0;
            schritte.push({
              nr: schrNr++,
              titel: `GuV-Abschluss (${istGewinn ? "Gewinn" : "Verlust"}: ${fmt(Math.abs(gewinn))} €)`,
              typ: "kalkulation_vk",
              aufgabe: `Ermitteln Sie das Jahresergebnis von ${f.name} und bilden Sie den abschließenden Buchungssatz (GuV → EK).`,
              beleg: null,
              schema: [
                { label: "Umsatzerlöse (UEFE)", wert: umsatz, einheit: "€", bold: true },
                { label: `− Aufwendungen gesamt`, wert: gesamtAufw, einheit: "€" },
                ...(mitARA ? [{ label: `  davon ARA-Korrektur (−${fmt(araBetrag)} €)`, wert: " ", einheit: "" }] : []),
                ...(mitRST ? [{ label: `  davon Rückstellung (${fmt(rst.betrag)} €)`, wert: " ", einheit: "" }] : []),
                ...(mitAFA ? [{ label: `  davon AfA (${fmt(afa)} €)`, wert: " ", einheit: "" }] : []),
                ...(mitEWB ? [{ label: `  davon EWB (${fmt(ewbBetrag)} €)`, wert: " ", einheit: "" }] : []),
                { label: istGewinn ? "= Jahresgewinn" : "= Jahresverlust", wert: Math.abs(gewinn), einheit: "€", bold: true, trennlinie: true, highlight: istGewinn },
                { label: `Buchungssatz: GuV an ${istGewinn ? "EK (Gewinn)" : "EK (Verlust)"}`, wert: " ", einheit: "" },
              ],
              soll: istGewinn
                ? [{ nr: "8000", name: "Gewinn- und Verlustrechnung (GuV)", betrag: gewinn }]
                : [{ nr: "2000", name: "Eigenkapital (EK)", betrag: Math.abs(gewinn) }],
              haben: istGewinn
                ? [{ nr: "2000", name: "Eigenkapital (EK)", betrag: gewinn }]
                : [{ nr: "8000", name: "Gewinn- und Verlustrechnung (GuV)", betrag: Math.abs(gewinn) }],
              nrPunkte: 3,
              punkte: 1 + 1 + 3,
              erklaerung: `Jahresergebnis: ${fmt(umsatz)} − ${fmt(gesamtAufw)} = ${istGewinn ? "Gewinn" : "Verlust"} ${fmt(Math.abs(gewinn))} €. ${istGewinn ? "GuV Soll / EK Haben (Gewinn erhöht EK)" : "EK Soll / GuV Haben (Verlust mindert EK)"}.`,
            });
          }

          // ── Kennzahlen ────────────────────────────────────────────────────
          if (mitKenn) {
            schritte.push({
              nr: schrNr++,
              titel: "Kennzahlenberechnung aus Schlussbilanz",
              typ: "kalkulation_vk",
              aufgabe: `Berechnen Sie EK-Quote und EK-Rentabilität auf Basis des ermittelten Jahresergebnisses. EK: ${fmt(ek)} €, FK: ${fmt(fk)} €.`,
              beleg: null,
              schema: [
                { label: "Gesamtkapital (EK + FK)", wert: gk, einheit: "€", bold: true },
                { label: `EK-Quote = ${fmt(ek)} ÷ ${fmt(gk)} × 100`, wert: ekQuote, einheit: "%", bold: true },
                { label: ekQuote >= 30 ? "→ gut (≥ 30 %)" : "→ niedrig (< 30 %)", wert: " ", einheit: "" },
                { label: `EK-Rentabilität = ${fmt(gewinn)} ÷ ${fmt(ek)} × 100`, wert: ekRent, einheit: "%", bold: true, trennlinie: true },
                { label: ekRent >= 5 ? "→ rentabel (≥ 5 %)" : "→ schwache Rendite (< 5 %)", wert: " ", einheit: "" },
              ],
              soll: [], haben: [],
              nrPunkte: 4,
              punkte: 4,
              erklaerung: `EK-Quote: ${fmt(ek)} ÷ ${fmt(gk)} × 100 = ${ekQuote} %. EK-Rent.: ${fmt(gewinn)} ÷ ${fmt(ek)} × 100 = ${ekRent} %.`,
            });
          }

          const kontextTeile = [
            `Jahresabschluss ${f.name} zum 31.12.`,
            mitARA  ? `ARA (${araMonate} Monate ${aufwandKonto.name}).` : "",
            mitRST  ? `Rückstellung (${rst.art}).` : "",
            mitAFA  ? `AfA auf ${anlage} (${nutzung} Jahre).` : "",
            mitEWB  ? `EWB auf Forderung ${kunde.name} (${ewbPct} %).` : "",
            mitGuV  ? `GuV-Abschluss: ${gewinn >= 0 ? "Gewinn" : "Verlust"} ${fmt(Math.abs(gewinn))} €.` : "",
            mitKenn ? `Kennzahlen: EK-Quote ${ekQuote} %, EK-Rent. ${ekRent} %.` : "",
          ].filter(Boolean).join(" ");

          return { kontext: kontextTeile, schritte };
        },
      },
      {
        id: "10_ara", titel: "Aktiven Rechnungsabgrenzungsposten (ARA) bilden",
        generate: f => {
          const jahresbetrag = rnd(6000, 24000, 600); const monatsbetrag = r2(jahresbetrag / 12);
          const monate = [2,3,4,5][Math.floor(Math.random()*4)]; const ara = r2(monatsbetrag * monate);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender Eingangsrechnung (Jahresvorauszahlung).",
            beleg: mkEingangsRE(f, "Jahresmiete Lagerhalle (01.10.–30.09.)", 1, "Jahr", jahresbetrag, 0, false),
            nebenrechnungen: [{ label: "Monatsmiete", formel: `${fmt(jahresbetrag)} ÷ 12`, ergebnis: `${fmt(monatsbetrag)} €` }, { label: `ARA (${monate} Monate Folgejahr)`, formel: `${fmt(monatsbetrag)} × ${monate}`, ergebnis: `${fmt(ara)} €` }],
            soll: [{ nr: "2900", name: "Aktiver Rechnungsabgrenzungsposten", betrag: ara }],
            haben: [{ nr: "6700", name: "Mieten und Pachten (AWMP)", betrag: ara }],
            nrPunkte: 2, erklaerung: `Vorauszahlung für das Folgejahr ist kein Aufwand dieses Jahres. ARA aktivieren (2900 Soll). Mietaufwand korrigieren (4360 Haben).`,
          };
        },
      },
      {
        id: "10_rueckstellung_bilden", titel: "Rückstellung bilden",
        generate: f => {
          const szenarien = [
            { art: "Prozesskosten (Klage eines Kunden)", betrag: rnd(3000, 15000, 500), absender: "Kanzlei Bauer & Partner", email: "recht@bauer-partner.de" },
            { art: "voraussichtliche Reparaturkosten (Kostenvoranschlag liegt vor)", betrag: rnd(2000, 10000, 500), absender: "Wartungsservice Bayern GmbH", email: "service@wartung-bayern.de" },
          ];
          const sz = pick(szenarien);
          return {
            aufgabe: "Bilden Sie den Buchungssatz zu folgender E-Mail.",
            beleg: mkEmail(`info@${sz.email.split("@")[1]}`, sz.absender, f.email,
              `Kostenvoranschlag / rechtliche Einschätzung – Rückstellungsbedarf`,
              `Sehr geehrte Damen und Herren,\n\nwie besprochen, schätzen wir den voraussichtlichen Aufwand für ${sz.art} auf ca. ${fmt(sz.betrag)} €.\n\nDa Höhe und Fälligkeit noch ungewiss sind, empfehlen wir die Bildung einer Rückstellung zum Bilanzstichtag 31.12.2025 in dieser Höhe.\n\nMit freundlichen Grüßen\n${sz.absender}`),
            soll: [{ nr: "6990", name: "Rückstellungsaufwand", betrag: sz.betrag }],
            haben: [{ nr: "3900", name: "Rückstellungen", betrag: sz.betrag }],
            nrPunkte: 0, erklaerung: "Rückstellungen erfassen ungewisse Verbindlichkeiten. Aufwand (6990 Soll). Rückstellungskonto = Fremdkapital (3900 Haben).",
          };
        },
      },
    ],
    "LB 2 · Kennzahlen & Bilanzanalyse": [
      {
        id: "10_ek_quote", titel: "Eigenkapitalquote berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const ek = rnd(200000, 800000, 10000);
          const lbkv = rnd(100000, 500000, 10000);
          const ve = rnd(30000, 150000, 5000);
          const gk = r2(ek + lbkv + ve);
          const quote = r2(ek / gk * 100);
          const einordnung = quote >= 50 ? "gut (≥ 50 %)" : quote >= 30 ? "ausreichend (30–50 %)" : "niedrig (< 30 %)";
          return {
            aufgabe: `Berechnen Sie die Eigenkapitalquote von ${f.name}. Eigenkapital: ${fmt(ek)} €, langfristige Bankverbindlichkeiten: ${fmt(lbkv)} €, Verbindlichkeiten aus L+L: ${fmt(ve)} €.`,
            beleg: null,
            schema: [
              { label: "Eigenkapital (EK)", wert: ek, einheit: "€" },
              { label: "+ Fremdkapital gesamt (LBKV + VE)", wert: r2(lbkv + ve), einheit: "€" },
              { label: "= Gesamtkapital (GK)", wert: gk, einheit: "€", bold: true, trennlinie: true },
              { label: "EK-Quote = EK ÷ GK × 100", wert: quote, einheit: "%", bold: true, highlight: quote >= 30 },
              { label: `Einordnung: ${einordnung}`, wert: " ", einheit: "" },
            ],
            nrPunkte: 3,
            erklaerung: `EK-Quote = EK / GK × 100 = ${fmt(ek)} / ${fmt(gk)} × 100 = ${fmt(quote)} %. Je höher, desto unabhängiger von Fremdkapitalgebern. Richtwert ≥ 30 % (gut: ≥ 50 %).`,
          };
        },
      },
      {
        id: "10_goldene_finanzregel", titel: "Goldene Finanzierungsregel (Anlagendeckung)",
        taskTyp: "rechnung",
        generate: f => {
          const ek = rnd(150000, 600000, 10000);
          const lbkv = rnd(80000, 400000, 10000);
          const av = rnd(250000, 800000, 10000);
          const dg1 = r2(ek / av * 100);
          const dg2 = r2((ek + lbkv) / av * 100);
          return {
            aufgabe: `Beurteilen Sie die Finanzierungsstruktur von ${f.name} anhand der goldenen Finanzierungsregel. Anlagevermögen: ${fmt(av)} €, Eigenkapital: ${fmt(ek)} €, langfristige Bankverbindlichkeiten: ${fmt(lbkv)} €.`,
            beleg: null,
            nebenrechnungen: [
              { label: "Anlagendeckungsgrad 1", formel: `${fmt(ek)} ÷ ${fmt(av)} × 100`, ergebnis: `${fmt(dg1)} %` },
              { label: "Anlagendeckungsgrad 2", formel: `(${fmt(ek)} + ${fmt(lbkv)}) ÷ ${fmt(av)} × 100`, ergebnis: `${fmt(dg2)} %` },
            ],
            schema: [
              { label: "Anlagendeckungsgrad 1 = EK ÷ AV × 100", wert: dg1, einheit: "%", bold: true, highlight: dg1 >= 100 },
              { label: `Soll: ≥ 100 %  →  ${dg1 >= 100 ? "✓ erfüllt" : "✗ nicht erfüllt"}`, wert: " ", einheit: "" },
              { label: "Anlagendeckungsgrad 2 = (EK + LBKV) ÷ AV × 100", wert: dg2, einheit: "%", bold: true, highlight: dg2 >= 100, trennlinie: true },
              { label: `Soll: ≥ 100 %  →  ${dg2 >= 100 ? "✓ erfüllt" : "✗ nicht erfüllt"}`, wert: " ", einheit: "" },
            ],
            nrPunkte: 4,
            erklaerung: `Goldene Finanzierungsregel: AV soll durch langfristiges Kapital finanziert sein. Anlagendeckung 1 (nur EK): ${fmt(dg1)} %. Anlagendeckung 2 (EK + langfr. FK): ${fmt(dg2)} %.`,
          };
        },
      },
      {
        id: "10_liquiditaet", titel: "Liquiditätsgrade berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const fm = rnd(20000, 120000, 2000);
          const fo = rnd(40000, 200000, 5000);
          const ve = rnd(50000, 180000, 5000);
          const liq1 = r2(fm / ve * 100);
          const liq2 = r2((fm + fo) / ve * 100);
          return {
            aufgabe: `Berechnen Sie Liquidität 1. und 2. Grades für ${f.name} und beurteilen Sie das Ergebnis. Flüssige Mittel (Bank + Kasse): ${fmt(fm)} €, Forderungen aus L+L: ${fmt(fo)} €, kurzfristige Verbindlichkeiten: ${fmt(ve)} €.`,
            beleg: null,
            schema: [
              { label: "Liquidität 1. Grades = Flüssige Mittel ÷ kurzfr. VE × 100", wert: liq1, einheit: "%", bold: true, highlight: liq1 >= 20 },
              { label: `Soll: ≥ 20 %  →  ${liq1 >= 20 ? "✓ ausreichend" : "✗ zu niedrig"}`, wert: " ", einheit: "" },
              { label: "Liquidität 2. Grades = (FM + FO) ÷ kurzfr. VE × 100", wert: liq2, einheit: "%", bold: true, highlight: liq2 >= 100, trennlinie: true },
              { label: `Soll: ≥ 100 %  →  ${liq2 >= 100 ? "✓ ausreichend" : "✗ zu niedrig"}`, wert: " ", einheit: "" },
            ],
            nrPunkte: 4,
            erklaerung: `Liq. 1: Nur FM / kurzfr. VE = ${fmt(liq1)} % (Soll ≥ 20 %). Liq. 2: (FM + FO) / kurzfr. VE = ${fmt(liq2)} % (Soll ≥ 100 %). Je höher, desto besser kann das Unternehmen kurzfristige Schulden bedienen.`,
          };
        },
      },
      {
        id: "10_rentabilitaet", titel: "EK- und GK-Rentabilität berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const ek = rnd(200000, 700000, 10000);
          const fk = rnd(150000, 500000, 10000);
          const gk = r2(ek + fk);
          const gewinn = rnd(20000, 120000, 2000);
          const zinsen = rnd(5000, 30000, 1000);
          const ekR = r2(gewinn / ek * 100);
          const gkR = r2((gewinn + zinsen) / gk * 100);
          return {
            aufgabe: `Berechnen Sie EK- und GK-Rentabilität von ${f.name} und beurteilen Sie das Ergebnis. Jahresgewinn: ${fmt(gewinn)} €, Fremdkapitalzinsen: ${fmt(zinsen)} €, Eigenkapital: ${fmt(ek)} €, Fremdkapital: ${fmt(fk)} €.`,
            beleg: null,
            nebenrechnungen: [
              { label: "Gesamtkapital", formel: `${fmt(ek)} + ${fmt(fk)}`, ergebnis: `${fmt(gk)} €` },
            ],
            schema: [
              { label: "EK-Rentabilität = Gewinn ÷ EK × 100", wert: ekR, einheit: "%", bold: true, highlight: ekR >= 10 },
              { label: `Einordnung: ${ekR >= 15 ? "sehr gut (≥ 15 %)" : ekR >= 10 ? "gut (≥ 10 %)" : "gering (< 10 %)"}`, wert: " ", einheit: "" },
              { label: "GK-Rentabilität = (Gewinn + FK-Zinsen) ÷ GK × 100", wert: gkR, einheit: "%", bold: true, highlight: gkR >= 6, trennlinie: true },
              { label: `Einordnung: ${gkR >= 10 ? "sehr gut (≥ 10 %)" : gkR >= 6 ? "gut (≥ 6 %)" : "gering (< 6 %)"}`, wert: " ", einheit: "" },
            ],
            nrPunkte: 4,
            erklaerung: `EK-Rent. = Gewinn / EK × 100 = ${fmt(gewinn)} / ${fmt(ek)} × 100 = ${fmt(ekR)} %. GK-Rent. = (Gewinn + FK-Zinsen) / GK × 100 = ${fmt(gkR)} %. Leverage-Effekt: Wenn GK-Rent. > FK-Zinssatz lohnt sich Fremdfinanzierung.`,
          };
        },
      },
      {
        id: "10_ek_rentabilitaet_privat", titel: "EK-Entwicklung mit Privatentnahmen/-einlagen",
        taskTyp: "rechnung",
        generate: f => {
          const ek01 = rnd(80000, 300000, 5000);
          const gewinn = rnd(15000, 60000, 1000);
          const einlagen = rnd(0, 20000, 1000);
          const entnahmen = rnd(10000, 40000, 1000);
          const ek31 = r2(ek01 + gewinn + einlagen - entnahmen);
          const ekR = r2(gewinn / ek01 * 100);
          // Variante: EK(31.12.) gegeben, EK(01.01.) gesucht
          const variante = pick(["vorwaerts", "rueckwaerts"]);
          if (variante === "vorwaerts") {
            return {
              aufgabe: `Das Eigenkapital von ${f.name} beträgt am 01.01. ${fmt(ek01)} €. Im Geschäftsjahr wird ein Gewinn von ${fmt(gewinn)} € erzielt. Privateinlagen: ${fmt(einlagen)} €, Privatentnahmen: ${fmt(entnahmen)} €. Berechnen Sie das Eigenkapital am 31.12. und die EK-Rentabilität.`,
              beleg: null,
              schema: [
                { label: "EK am 01.01.", wert: ek01, einheit: "€" },
                { label: "+ Jahresgewinn", wert: gewinn, einheit: "€" },
                { label: "+ Privateinlagen", wert: einlagen, einheit: "€" },
                { label: "− Privatentnahmen", wert: entnahmen, einheit: "€", minus: true },
                { label: "= EK am 31.12.", wert: ek31, einheit: "€", bold: true, trennlinie: true },
                { label: `EK-Rentabilität = Gewinn ÷ EK(01.01.) × 100`, wert: ekR, einheit: "%", bold: true, highlight: ekR >= 10 },
                { label: ekR >= 15 ? "✓ sehr gut (≥ 15 %)" : ekR >= 10 ? "✓ gut (≥ 10 %)" : "○ gering (< 10 %)", wert: " ", einheit: "" },
              ],
              nrPunkte: 4,
              erklaerung: `EK(31.12.) = EK(01.01.) + Gewinn + Einlagen − Entnahmen = ${fmt(ek01)} + ${fmt(gewinn)} + ${fmt(einlagen)} − ${fmt(entnahmen)} = ${fmt(ek31)} €. EK-Rent. = ${fmt(gewinn)} ÷ ${fmt(ek01)} × 100 = ${fmt(ekR)} %. Basis ist immer EK zu Jahresbeginn.`,
            };
          } else {
            return {
              aufgabe: `Das Eigenkapital von ${f.name} beträgt am 31.12. ${fmt(ek31)} €. Jahresgewinn: ${fmt(gewinn)} €, Privateinlagen: ${fmt(einlagen)} €, Privatentnahmen: ${fmt(entnahmen)} €. Berechnen Sie das Eigenkapital am 01.01. und die EK-Rentabilität.`,
              beleg: null,
              schema: [
                { label: "EK am 31.12.", wert: ek31, einheit: "€" },
                { label: "− Jahresgewinn", wert: gewinn, einheit: "€", minus: true },
                { label: "− Privateinlagen", wert: einlagen, einheit: "€", minus: true },
                { label: "+ Privatentnahmen", wert: entnahmen, einheit: "€" },
                { label: "= EK am 01.01.", wert: ek01, einheit: "€", bold: true, trennlinie: true },
                { label: `EK-Rentabilität = Gewinn ÷ EK(01.01.) × 100`, wert: ekR, einheit: "%", bold: true, highlight: ekR >= 10 },
                { label: ekR >= 15 ? "✓ sehr gut (≥ 15 %)" : ekR >= 10 ? "✓ gut (≥ 10 %)" : "○ gering (< 10 %)", wert: " ", einheit: "" },
              ],
              nrPunkte: 4,
              erklaerung: `Rückrechnung: EK(01.01.) = EK(31.12.) − Gewinn − Einlagen + Entnahmen = ${fmt(ek31)} − ${fmt(gewinn)} − ${fmt(einlagen)} + ${fmt(entnahmen)} = ${fmt(ek01)} €. EK-Rent. = ${fmt(gewinn)} ÷ ${fmt(ek01)} × 100 = ${fmt(ekR)} %.`,
            };
          }
        },
      },
    ],
    "LB 3 · Vollkostenrechnung": [
      {
        id: "10_kts", titel: "Zuschlagskalkulation (Kostenträgerstückrechnung)",
        taskTyp: "rechnung",
        generate: f => {
          const mek = rnd(500, 3000, 50); const fek = rnd(800, 4000, 50);
          const mgkPct = [10,12,15,18,20][Math.floor(Math.random()*5)]; const fgkPct = [50,60,70,80,100][Math.floor(Math.random()*5)];
          const vwgkPct = [3,4,5,6,8][Math.floor(Math.random()*5)]; const vtgkPct = [5,8,10,12,15][Math.floor(Math.random()*5)];
          const gwPct = [10,12,15,20][Math.floor(Math.random()*4)];
          const mgk = r2(mek * mgkPct / 100); const fgk = r2(fek * fgkPct / 100);
          const mk = r2(mek + mgk); const fk = r2(fek + fgk); const hk = r2(mk + fk);
          const vwk = r2(hk * vwgkPct / 100); const vtk = r2(hk * vtgkPct / 100);
          const sk = r2(hk + vwk + vtk); const gw = r2(sk * gwPct / 100); const ap = r2(sk + gw);
          return {
            aufgabe: `Ermitteln Sie mithilfe der Zuschlagskalkulation den Listenverkaufspreis für ${pick(f.fertigerzeugnisse)}.`,
            beleg: null,
            schema: [
              { label: "Materialeinzelkosten (MEK)", wert: mek, einheit: "€" },
              { label: `+ Materialgemeinkosten (MGK ${mgkPct} %)`, wert: mgk, einheit: "€" },
              { label: "= Materialkosten (MK)", wert: mk, einheit: "€", bold: true },
              { label: "+ Fertigungseinzelkosten (FEK)", wert: fek, einheit: "€" },
              { label: `+ Fertigungsgemeinkosten (FGK ${fgkPct} %)`, wert: fgk, einheit: "€" },
              { label: "= Fertigungskosten (FK)", wert: fk, einheit: "€", bold: true },
              { label: "= Herstellkosten (HK)", wert: hk, einheit: "€", bold: true, trennlinie: true },
              { label: `+ Verwaltungsgemeinkosten (VwGK ${vwgkPct} %)`, wert: vwk, einheit: "€" },
              { label: `+ Vertriebsgemeinkosten (VtGK ${vtgkPct} %)`, wert: vtk, einheit: "€" },
              { label: "= Selbstkosten (SK)", wert: sk, einheit: "€", bold: true, trennlinie: true },
              { label: `+ Gewinn (${gwPct} %)`, wert: gw, einheit: "€" },
              { label: "= Angebotspreis (Listenverkaufspreis)", wert: ap, einheit: "€", bold: true, highlight: true },
            ],
            nrPunkte: 7, erklaerung: `MK = MEK + MGK. FK = FEK + FGK. HK = MK + FK. SK = HK + VwK + VtK. AP = SK × (1 + ${gwPct} %).`,
          };
        },
      },
    ],
    "LB 4 · Teilkostenrechnung": [
      {
        id: "10_deckungsbeitrag", titel: "Deckungsbeitragsrechnung",
        taskTyp: "rechnung",
        generate: f => {
          const preis = rnd(50, 300, 10); const vk = rnd(20, r2(preis * 0.7), 10); const menge = rnd(500, 3000, 100);
          const fixk = rnd(10000, 50000, 1000); const db1 = r2(preis - vk); const dbGes = r2(db1 * menge);
          const be = r2(dbGes - fixk); const bep = Math.ceil(fixk / db1);
          return {
            aufgabe: `Ermitteln Sie Deckungsbeitrag, Betriebsergebnis und Break-even-Menge für ${pick(f.fertigerzeugnisse)}.`,
            beleg: null,
            schema: [
              { label: "Verkaufspreis/Stk.", wert: preis, einheit: "€/Stk" },
              { label: "− variable Kosten/Stk.", wert: vk, einheit: "€/Stk" },
              { label: "= Deckungsbeitrag/Stk. (DB₁)", wert: db1, einheit: "€/Stk", bold: true, trennlinie: true },
              { label: `× Absatzmenge`, wert: menge, einheit: "Stk" },
              { label: "= Gesamtdeckungsbeitrag", wert: dbGes, einheit: "€", bold: true },
              { label: "− Fixkosten", wert: fixk, einheit: "€" },
              { label: "= Betriebsergebnis", wert: be, einheit: "€", bold: true, highlight: be >= 0, trennlinie: true },
              { label: "Break-even-Menge (Fixk ÷ DB₁)", wert: bep, einheit: "Stk", bold: true },
            ],
            nrPunkte: 5, erklaerung: `DB₁ = Preis − var. K. Gesamt-DB = DB₁ × Menge. BE = Gesamt-DB − Fixkosten. Break-even = ${fmt(fixk)} ÷ ${fmt(db1)} = ${bep} Stk.`,
          };
        },
      },
    ],
    "Kontenabschluss": [
      {
        id: "10_abs_rst", titel: "Rückstellung abschließen / auflösen",
        generate: f => {
          const szenarien = [
            { art: "Prozesskosten", grund: "Rechtsstreit mit Lieferant beigelegt" },
            { art: "Gewährleistungskosten", grund: "Gewährleistungsfrist abgelaufen" },
            { art: "Urlaubsrückstellung", grund: "Resturlaub wurde genommen" },
          ];
          const sz = pick(szenarien);
          const rst = rnd(2000,15000,500);
          const actual = rnd(rst-500, rst+500, 100);
          const diff = r2(rst - actual);
          const isÜber = diff > 0;
          return {
            aufgabe: `Die Rückstellung für ${sz.art} betrug ${fmt(rst)} €. Grund der Auflösung: ${sz.grund}. Tatsächliche Kosten: ${fmt(actual)} €. Bilden Sie alle Buchungssätze.`,
            beleg: null,
            schema: [
              { label: "Rückstellung gebildet (Vorjahr): RST", wert: rst, einheit: "€" },
              { label: "Tatsächliche Kosten (Zahlung)", wert: actual, einheit: "€" },
              { label: isÜber ? "Überdeckung (Ertrag)" : "Unterdeckung (Aufwand)", wert: Math.abs(diff), einheit: "€", bold: true, trennlinie: true },
            ],
            soll: [{ nr: "3900", name: "Rückstellungen (RST)", betrag: rst }],
            haben: isÜber
              ? [{ nr: "2800", name: "Bank (BK)", betrag: actual }, { nr: "5430", name: "Sonst. betr. Erträge (ASBE)", betrag: diff }]
              : [{ nr: "2800", name: "Bank (BK)", betrag: actual }, { nr: "6990", name: "Period. Aufwend. (PFAW)", betrag: Math.abs(diff) }],
            nrPunkte: 2,
            erklaerung: `Rückstellung auflösen: RST Soll ${fmt(rst)} €. ${isÜber ? `Überdeckung ${fmt(diff)} € → Ertrag (ASBE)` : `Unterdeckung ${fmt(Math.abs(diff))} € → Aufwand (PFAW)`}.`,
          };
        },
      },
      {
        id: "10_abs_ara_aufloesung", titel: "ARA auflösen (Jahresabschluss Folgeperiode)",
        generate: f => {
          const ara = rnd(500,3000,100);
          const konto = pick([
            { nr: "6900", name: "Versicherungsbeiträge (VBEI)" },
            { nr: "6700", name: "Mieten und Pachten (AWMP)" },
            { nr: "7510", name: "Zinsaufwendungen (ZAW)" },
          ]);
          return {
            aufgabe: `Im Vorjahr wurde ein ARA von ${fmt(ara)} € für ${konto.name} gebildet. Lösen Sie den ARA zu Beginn des neuen Geschäftsjahres auf.`,
            beleg: null,
            soll: [{ nr: konto.nr, name: konto.name, betrag: ara }],
            haben: [{ nr: "2900", name: "Aktive Rechnungsabgrenzung (ARA)", betrag: ara }],
            nrPunkte: 0,
            erklaerung: `ARA auflösen: Aufwand wird in die neue Periode gebucht. ${konto.nr} Soll, ARA (2900) Haben. ARA-Konto wird auf 0 reduziert.`,
          };
        },
      },
      {
        id: "10_abs_kennzahlen_abschluss", titel: "Kennzahlen aus Schlussbilanz berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const ek = rnd(100000,400000,10000);
          const fk = rnd(50000,200000,5000);
          const gk = r2(ek+fk);
          const ek_quote = r2(ek/gk*100);
          const gewinn = rnd(10000,60000,2000);
          const ek_rent = r2(gewinn/ek*100);
          const umlauf = rnd(30000,80000,2000);
          const kfFk = rnd(10000,40000,1000);
          const liq = r2(umlauf/kfFk*100);
          return {
            aufgabe: `Berechnen Sie für den Jahresabschluss: EK ${fmt(ek)} €, FK ${fmt(fk)} €, Jahresgewinn ${fmt(gewinn)} €, Umlaufvermögen ${fmt(umlauf)} €, kurzfr. Verbindlichkeiten ${fmt(kfFk)} €.`,
            beleg: null,
            schema: [
              { label: "Gesamtkapital (EK + FK)", wert: gk, einheit: "€", bold: true },
              { label: `EK-Quote: ${fmt(ek)} ÷ ${fmt(gk)} × 100`, wert: ek_quote, einheit: "%", bold: true },
              { label: `EK-Rentabilität: ${fmt(gewinn)} ÷ ${fmt(ek)} × 100`, wert: ek_rent, einheit: "%", bold: true },
              { label: `Liquidität 2. Grades: ${fmt(umlauf)} ÷ ${fmt(kfFk)} × 100`, wert: liq, einheit: "%", bold: true },
              { label: liq >= 100 ? "→ Liquidität ausreichend (≥ 100%)" : "→ Liquidität kritisch (< 100%)", wert: null, einheit: "" },
            ],
            nrPunkte: 6,
            erklaerung: `Schlussbilanz-Kennzahlen: EK-Quote ${ek_quote} %, EK-Rent. ${ek_rent} %, Liquidität ${liq} %.`,
          };
        },
      },
    ],

    "Theorie · Abschluss & Controlling": [
      {
        id: "10_th_jahresabschluss_massnahmen", titel: "Jahresabschluss – Abschlussmaßnahmen",
        taskTyp: "theorie", themenTyp: "zuordnung",
        generate: () => ({
          aufgabe: "Ordnen Sie die Jahresabschlussmaßnahmen den richtigen Beschreibungen zu.",
          zuordnung: { paare: [
            { term: "Aktiver Rechnungsabgrenzungsposten (ARA)", def: "Ausgabe im alten Jahr, die Aufwand des neuen Jahres ist (Vorauszahlung)" },
            { term: "Rückstellung",           def: "Ungewisse Verbindlichkeit: Höhe oder Fälligkeit noch nicht bekannt" },
            { term: "Abschreibung (AfA)",      def: "Jährlicher Wertverzehr von Anlagegütern – wird als Aufwand gebucht" },
            { term: "Einzelwertberichtigung",  def: "Vorsichtige Bewertung einer zweifelhaften Forderung am Jahresende" },
            { term: "GuV-Abschluss",           def: "Gegenüberstellung aller Erträge und Aufwendungen → Jahresergebnis" },
          ]}, nrPunkte: 5,
        }),
      },
      {
        id: "10_th_kennzahlen_lueckentext", titel: "Betriebliche Kennzahlen",
        taskTyp: "theorie", themenTyp: "lueckentext",
        generate: () => ({
          aufgabe: "Ergänzen Sie die Lücken zu betrieblichen Kennzahlen.",
          lueckentext: {
            text: "Die {0} zeigt, welcher Anteil des Gesamtkapitals aus Eigenmitteln stammt (EK ÷ GK × 100). Die {1} gibt an, wie rentabel das eingesetzte Eigenkapital ist (Gewinn ÷ EK × 100). Nach der goldenen Finanzierungsregel soll das {2} durch langfristiges Kapital finanziert sein. Die Liquidität 2. Grades errechnet sich als: (Flüssige Mittel + {3}) ÷ kurzfristige Verbindlichkeiten × 100. Der Richtwert liegt bei mindestens {4} %.",
            luecken: ["Eigenkapitalquote", "EK-Rentabilität", "Anlagevermögen", "Forderungen aus L+L", "100"],
            wortbank: ["100", "50", "Anlagevermögen", "EK-Rentabilität", "Eigenkapitalquote", "Forderungen aus L+L", "Umlaufvermögen", "GK-Rentabilität"],
          }, nrPunkte: 5,
        }),
      },
      {
        id: "10_th_ara_erklaerung", titel: "ARA – Erklären und Anwenden",
        taskTyp: "theorie", themenTyp: "freitext",
        generate: () => ({
          aufgabe: "Erklären Sie, was ein aktiver Rechnungsabgrenzungsposten (ARA) ist und warum er gebildet wird. Nennen Sie ein Beispiel.",
          freitext: { zeilen: 6,
            loesung: `Ein ARA wird gebildet, wenn eine Ausgabe im alten Jahr geleistet wird, der dazugehörige Aufwand aber (ganz oder teilweise) ins neue Jahr gehört.

Zweck: Periodengerechte Zuordnung von Aufwendungen (Abgrenzungsprinzip nach § 252 HGB).

Beispiel: Am 01.10. wird die Jahresmiete von 12.000 € für den Zeitraum 01.10. bis 30.09. des Folgejahres bezahlt. 3 Monate (Jan.–März) gehören ins Folgejahr → ARA = 3.000 €.
Buchung: ARA 2900 Soll / Mieten und Pachten 6700 Haben 3.000 €`,
          }, nrPunkte: 4,
        }),
      },
      {
        id: "10_th_kostenrechnung_mc", titel: "Kosten- und Leistungsrechnung",
        taskTyp: "theorie", themenTyp: "mc",
        generate: () => ({
          aufgabe: "Beantworten Sie die Fragen zur Kostenrechnung.",
          mc: { fragen: [
            { frage: "Was unterscheidet die Vollkostenrechnung von der Teilkostenrechnung?",
              optionen: ["Vollkosten: nur fixe Kosten; Teilkosten: nur variable Kosten", "Vollkosten: alle Kosten werden auf Produkte verrechnet; Teilkosten: nur variable Kosten", "Teilkostenrechnung ist veraltet und wird nicht mehr verwendet", "Kein wesentlicher Unterschied"], richtig: 1 },
            { frage: "Wie berechnet sich der Deckungsbeitrag pro Stück (DB₁)?",
              optionen: ["Verkaufspreis − Fixkosten", "Verkaufspreis − variable Kosten pro Stück", "Gesamterlös − Gesamtkosten", "Fixkosten ÷ Absatzmenge"], richtig: 1 },
            { frage: "Was gibt die Break-even-Menge an?",
              optionen: ["Die gewinnmaximale Produktionsmenge", "Die Menge, bei der Gesamterlöse gleich Gesamtkosten sind (kein Gewinn, kein Verlust)", "Die Menge, ab der Fixkosten sinken", "Die maximale Kapazität des Unternehmens"], richtig: 1 },
            { frage: "Welche Kosten verändern sich proportional mit der Produktionsmenge?",
              optionen: ["Fixkosten (z. B. Miete)", "Variable Kosten (z. B. Materialkosten)", "Abschreibungen", "Geschäftsführergehalt"], richtig: 1 },
          ]}, nrPunkte: 4,
        }),
      },
      {
        id: "10_th_finanzierung_zuordnung", titel: "Finanzierungsformen",
        taskTyp: "theorie", themenTyp: "zuordnung",
        generate: () => ({
          aufgabe: "Ordnen Sie die Finanzierungsformen den richtigen Beschreibungen zu.",
          zuordnung: { paare: [
            { term: "Eigenfinanzierung",   def: "Kapitalbeschaffung durch Einlagen der Eigentümer oder einbehaltene Gewinne" },
            { term: "Fremdfinanzierung",   def: "Kapitalaufnahme bei Gläubigern (z. B. Bankdarlehen, Lieferantenkredit)" },
            { term: "Innenfinanzierung",   def: "Kapitalbeschaffung aus dem Betrieb selbst (z. B. Gewinne, Rückstellungen, AfA-Rückflüsse)" },
            { term: "Außenfinanzierung",   def: "Kapitalbeschaffung von außerhalb des Unternehmens (Einlagen, Kredite)" },
            { term: "Leasing",             def: "Nutzung eines Wirtschaftsguts gegen Leasingraten – kein Eigentumserwerb" },
          ]}, nrPunkte: 5,
        }),
      },
    ],

  },
};

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN-SYSTEM
// ══════════════════════════════════════════════════════════════════════════════
const S = {
  page: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#0f172a" },
  topbar: { background: "#0f172a", padding: "0 28px", height: "60px", display: "flex", alignItems: "center", gap: "0", borderBottom: "1px solid #1e293b" },
  logo: { fontSize: "18px", fontWeight: 800, color: "#fff", cursor: "pointer", whiteSpace: "nowrap", minWidth: "180px", flexShrink: 0, letterSpacing: "-0.03em" },
  logoAccent: { color: "#f59e0b" },
  container: { maxWidth: "900px", margin: "0 auto", padding: "28px 20px" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", marginBottom: "16px" },
  label: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "12px" },
  h2: { fontSize: "22px", fontWeight: 700, color: "#0f172a", marginBottom: "4px", letterSpacing: "-0.02em" },
  btnPrimary: { padding: "11px 24px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer" },
  btnSecondary: { padding: "9px 18px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" },
  input: { padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#fff" },
  tag: c => ({ display: "inline-block", padding: "3px 10px", background: c + "18", color: c, borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: `1px solid ${c}33` }),
};

// ══════════════════════════════════════════════════════════════════════════════
// BELEG-KOMPONENTEN
// ══════════════════════════════════════════════════════════════════════════════

function BelegEingangsrechnung({ b }) {
  return (
    <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
      {/* Header */}
      <div style={{ background: "#1e293b", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ color: "#fff" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>{b.lief.name}</div>
          <div style={{ color: "#94a3b8", fontSize: "12px" }}>{b.lief.strasse} · {b.lief.plz} {b.lief.ort}</div>
          <div style={{ color: "#94a3b8", fontSize: "12px" }}>{b.lief.tel} · {b.lief.email}</div>
          <div style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>IBAN: {fmtIBAN(b.lief.iban)}</div>
        </div>
        <div style={{ textAlign: "right", color: "#f59e0b" }}>
          <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "0.1em" }}>RECHNUNG</div>
          {b.klasse7 && <div style={{ background: "#f59e0b", color: "#0f172a", fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", marginTop: "4px" }}>Klasse 7: Nur Bruttobetrag angegeben</div>}
        </div>
      </div>

      <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}>
        {/* Empfänger + Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>An</div>
            <div style={{ fontWeight: 700 }}>{b.empfaenger.name}</div>
            <div style={{ color: "#475569" }}>{b.empfaenger.strasse}</div>
            <div style={{ color: "#475569" }}>{b.empfaenger.plz_ort}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div><span style={{ color: "#64748b" }}>Rechnungs-Nr.: </span><strong>{b.rgnr}</strong></div>
            <div><span style={{ color: "#64748b" }}>Rechnungsdatum: </span>{b.datum}</div>
            <div><span style={{ color: "#64748b" }}>Lieferdatum: </span>{b.lieferdatum}</div>
          </div>
        </div>
      </div>

      {/* Positionen */}
      <div style={{ padding: "0 18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "8px 6px", textAlign: "left", color: "#64748b" }}>Pos.</th>
              <th style={{ padding: "8px 6px", textAlign: "left", color: "#64748b" }}>Bezeichnung</th>
              <th style={{ padding: "8px 6px", textAlign: "right", color: "#64748b" }}>Menge</th>
              <th style={{ padding: "8px 6px", textAlign: "right", color: "#64748b" }}>Einheit</th>
              <th style={{ padding: "8px 6px", textAlign: "right", color: "#64748b" }}>Einzelpreis</th>
              {!b.klasse7 && <th style={{ padding: "8px 6px", textAlign: "right", color: "#64748b" }}>Betrag (netto)</th>}
            </tr>
          </thead>
          <tbody>
            {b.positionen.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px 6px", color: "#64748b" }}>{p.pos}</td>
                <td style={{ padding: "8px 6px", fontWeight: 500 }}>{p.beschr}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{p.menge.toLocaleString("de-DE")}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#64748b" }}>{p.einheit}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmt(p.ep)} €</td>
                {!b.klasse7 && <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600 }}>{fmt(p.netto)} €</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summen */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <table style={{ fontSize: "13px", minWidth: "260px" }}>
          <tbody>
            {b.klasse7 ? (
              <tr style={{ background: "#0f172a", color: "#fff" }}>
                <td style={{ padding: "10px 12px", fontWeight: 700 }}>Rechnungsbetrag (brutto)</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: "16px" }}>{fmt(b.brutto)} €</td>
              </tr>
            ) : (<>
              <tr><td style={{ padding: "4px 12px", color: "#64748b" }}>Nettobetrag</td><td style={{ padding: "4px 12px", textAlign: "right" }}>{fmt(b.netto)} €</td></tr>
              <tr><td style={{ padding: "4px 12px", color: "#64748b" }}>zzgl. {b.ustPct} % MwSt.</td><td style={{ padding: "4px 12px", textAlign: "right" }}>{fmt(b.ustBetrag)} €</td></tr>
              <tr style={{ background: "#0f172a", color: "#fff" }}>
                <td style={{ padding: "8px 12px", fontWeight: 700 }}>Rechnungsbetrag</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, fontSize: "15px" }}>{fmt(b.brutto)} €</td>
              </tr>
            </>)}
          </tbody>
        </table>
      </div>

      {/* Zahlungsbedingungen */}
      <div style={{ padding: "10px 18px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
        <strong>Zahlungsbedingungen:</strong> {b.zahlungsziel}
      </div>
    </div>
  );
}

function BelegAusgangsrechnung({ b }) {
  return (
    <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
      <div style={{ background: b.firma.farbe, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ color: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: "16px", marginBottom: "2px" }}>{b.firma.icon} {b.firma.name}</div>
          <div style={{ opacity: 0.85, fontSize: "12px" }}>{b.firma.strasse} · {b.firma.plz} {b.firma.ort}</div>
          <div style={{ opacity: 0.7, fontSize: "11px" }}>{b.firma.email} · IBAN: {fmtIBAN(b.firma.iban)}</div>
        </div>
        <div style={{ textAlign: "right", color: "#fff" }}>
          <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "0.1em", opacity: 0.9 }}>RECHNUNG</div>
        </div>
      </div>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>An</div>
            <div style={{ fontWeight: 700 }}>{b.kunde.name}</div>
            <div style={{ color: "#475569" }}>{b.kunde.strasse}</div>
            <div style={{ color: "#475569" }}>{b.kunde.plz} {b.kunde.ort}</div>
            <div style={{ color: "#64748b", fontSize: "12px" }}>Kunden-Nr.: {b.kunde.kundennr}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div><span style={{ color: "#64748b" }}>Rechnungs-Nr.: </span><strong>{b.rgnr}</strong></div>
            <div><span style={{ color: "#64748b" }}>Datum: </span>{b.datum}</div>
            <div><span style={{ color: "#64748b" }}>Lieferdatum: </span>{b.lieferdatum}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "0 18px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              {["Pos.", "Bezeichnung", "Menge", "Einheit", "Einzelpreis", "Betrag (netto)"].map((h, i) => (
                <th key={i} style={{ padding: "8px 6px", textAlign: i > 1 ? "right" : "left", color: "#64748b" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.positionen.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px 6px", color: "#64748b" }}>{p.pos}</td>
                <td style={{ padding: "8px 6px", fontWeight: 500 }}>{p.beschr}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{p.menge}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#64748b" }}>{p.einheit}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmt(p.ep)} €</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600 }}>{fmt(p.netto)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <table style={{ fontSize: "13px", minWidth: "260px" }}>
          <tbody>
            <tr><td style={{ padding: "4px 12px", color: "#64748b" }}>Nettobetrag</td><td style={{ padding: "4px 12px", textAlign: "right" }}>{fmt(b.netto)} €</td></tr>
            <tr><td style={{ padding: "4px 12px", color: "#64748b" }}>zzgl. {b.ustPct} % MwSt.</td><td style={{ padding: "4px 12px", textAlign: "right" }}>{fmt(b.ustBetrag)} €</td></tr>
            <tr style={{ background: b.firma.farbe + "22", borderTop: "2px solid " + b.firma.farbe }}>
              <td style={{ padding: "8px 12px", fontWeight: 700, color: b.firma.farbe }}>Rechnungsbetrag</td>
              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, fontSize: "15px", color: b.firma.farbe }}>{fmt(b.brutto)} €</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ padding: "10px 18px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
        <strong>Zahlungsbedingungen:</strong> {b.zahlungsziel}
      </div>
    </div>
  );
}

function BelegKontoauszug({ b }) {
  return (
    <div style={{ border: "1px solid #bfdbfe", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
      <div style={{ background: "#1e40af", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "15px" }}>🏦 {b.bank}</div>
          <div style={{ color: "#93c5fd", fontSize: "12px" }}>Kontoauszug Nr. {b.auszugNr}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#fff", fontWeight: 600 }}>{b.kontoinhaber}</div>
          <div style={{ color: "#93c5fd", fontSize: "11px" }}>{fmtIBAN(b.iban)}</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#eff6ff" }}>
            <th style={{ padding: "8px 14px", textAlign: "left", color: "#1e40af", fontWeight: 700, borderBottom: "2px solid #bfdbfe" }}>Datum</th>
            <th style={{ padding: "8px 14px", textAlign: "left", color: "#1e40af", fontWeight: 700, borderBottom: "2px solid #bfdbfe" }}>Buchungstext</th>
            <th style={{ padding: "8px 14px", textAlign: "right", color: "#1e40af", fontWeight: 700, borderBottom: "2px solid #bfdbfe" }}>Betrag</th>
          </tr>
        </thead>
        <tbody>
          {b.buchungen.map((buch, i) => (
            <tr key={i} style={{
              background: buch.highlight ? "#fef9c3" : i % 2 === 0 ? "#fff" : "#f8fafc",
              borderLeft: buch.highlight ? "4px solid #f59e0b" : "4px solid transparent",
              borderBottom: "1px solid #e2e8f0",
            }}>
              <td style={{ padding: "9px 14px", color: "#64748b", whiteSpace: "nowrap" }}>{buch.datum}</td>
              <td style={{ padding: "9px 14px", color: "#374151" }}>
                {buch.text}
                {buch.highlight && <span style={{ marginLeft: "8px", fontSize: "10px", background: "#f59e0b", color: "#0f172a", fontWeight: 800, padding: "1px 6px", borderRadius: "10px" }}>◀ zu buchen</span>}
              </td>
              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, fontFamily: "monospace", color: buch.betrag > 0 ? "#15803d" : "#dc2626" }}>
                {buch.betrag > 0 ? "+" : ""}{fmt(Math.abs(buch.betrag))} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BelegUeberweisung({ b }) {
  return (
    <div style={{ border: "1px solid #bbf7d0", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
      <div style={{ background: "#15803d", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "15px" }}>💻 {b.bank}</div>
          <div style={{ color: "#86efac", fontSize: "12px" }}>Online-Überweisung</div>
        </div>
        <div style={{ background: "#16a34a", border: "1px solid #4ade80", borderRadius: "8px", padding: "5px 14px", color: "#fff", fontWeight: 700, fontSize: "13px" }}>
          ✓ Ausgeführt am {b.ausfuehrungsdatum}
        </div>
      </div>
      <div style={{ padding: "16px 20px", background: "#f0fdf4" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
          <div style={{ padding: "12px 14px", background: "#fff", borderRadius: "8px", border: "1px solid #d1fae5" }}>
            <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Auftraggeber</div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{b.absender.name}</div>
            <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>{fmtIBAN(b.absender.iban)}</div>
          </div>
          <div style={{ padding: "12px 14px", background: "#fff", borderRadius: "8px", border: "1px solid #d1fae5" }}>
            <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>Empfänger</div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{b.empfaenger.name}</div>
            <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>{fmtIBAN(b.empfaenger.iban)}</div>
          </div>
        </div>
        <div style={{ padding: "12px 14px", background: "#fff", borderRadius: "8px", border: "1px solid #d1fae5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Verwendungszweck</div>
              <div style={{ color: "#374151" }}>{b.verwendungszweck}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Überweisungsbetrag</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#dc2626" }}>−{fmt(b.betrag)} €</div>
              {b.skontoBetrag > 0 && (
                <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>
                  (Bruttorechnung − {fmt(b.skontoBetrag)} € Skonto)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BelegEmail({ b }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
      <div style={{ background: "#374151", padding: "10px 16px" }}>
        <div style={{ color: "#9ca3af", fontSize: "11px", marginBottom: "2px" }}>📧 E-Mail</div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>{b.betreff}</div>
      </div>
      <div style={{ background: "#f9fafb", padding: "10px 16px", borderBottom: "1px solid #e2e8f0", fontSize: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "8px", rowGap: "3px" }}>
          <span style={{ color: "#9ca3af", fontWeight: 600 }}>Von:</span> <span><strong>{b.vonName}</strong> &lt;{b.von}&gt;</span>
          <span style={{ color: "#9ca3af", fontWeight: 600 }}>An:</span> <span>{b.an}</span>
          <span style={{ color: "#9ca3af", fontWeight: 600 }}>Datum:</span> <span>{b.datum}, {b.uhrzeit}</span>
        </div>
      </div>
      <div style={{ padding: "14px 16px", whiteSpace: "pre-wrap", lineHeight: 1.65, color: "#374151", background: "#fff" }}>
        {b.text}
      </div>
    </div>
  );
}

function BelegAnzeige({ beleg }) {
  if (!beleg) return null;
  if (beleg.typ === "eingangsrechnung") return <BelegEingangsrechnung b={beleg} />;
  if (beleg.typ === "ausgangsrechnung") return <BelegAusgangsrechnung b={beleg} />;
  if (beleg.typ === "kontoauszug")      return <BelegKontoauszug b={beleg} />;
  if (beleg.typ === "ueberweisung")     return <BelegUeberweisung b={beleg} />;
  if (beleg.typ === "email")            return <BelegEmail b={beleg} />;
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUFGABE-KARTE
// ══════════════════════════════════════════════════════════════════════════════
// ──────────────────────────────────────────────────────────────────────────────
// BELEG → GESCHÄFTSFALL-TEXT (automatische Ableitung)
// ──────────────────────────────────────────────────────────────────────────────
function belegToGeschaeftsfall(beleg) {
  if (!beleg) return null;
  switch (beleg.typ) {
    case "eingangsrechnung": {
      const pos = beleg.positionen[0];
      if (beleg.klasse7) {
        return `${beleg.empfaenger.name} kauft ${pos.menge.toLocaleString("de-DE")} ${pos.einheit} ${pos.beschr} beim Lieferanten ${beleg.lief.name}, ${beleg.lief.ort}, zum Rechnungsbetrag (brutto) von ${fmt(beleg.brutto)} € auf Ziel (USt-Satz 19 %).`;
      }
      const extra = beleg.positionen.length > 1
        ? ` Zusätzlich werden ${beleg.positionen[1].beschr} von ${fmt(beleg.positionen[1].netto)} € netto in Rechnung gestellt (ebenfalls auf Ziel).`
        : "";
      return `${beleg.empfaenger.name} kauft ${pos.menge.toLocaleString("de-DE")} ${pos.einheit} ${pos.beschr} beim Lieferanten ${beleg.lief.name}, ${beleg.lief.ort}, zum Nettobetrag von ${fmt(pos.netto)} € (zzgl. ${beleg.ustPct} % USt ${fmt(beleg.ustBetrag)} €; Brutto: ${fmt(beleg.brutto)} €) auf Ziel.${extra}`;
    }
    case "ausgangsrechnung": {
      const pos = beleg.positionen[0];
      const skonto = beleg.zahlungsziel.includes("Skonto") ? ` Zahlungsbedingung: ${beleg.zahlungsziel.split("|")[0].trim()}.` : "";
      return `${beleg.firma.name}, ${beleg.firma.ort}, verkauft ${pos.menge} ${pos.einheit} ${pos.beschr} an ${beleg.kunde.name}, ${beleg.kunde.ort} (Kd.-Nr. ${beleg.kunde.kundennr}), zum Nettopreis von ${fmt(pos.netto)} € (zzgl. ${beleg.ustPct} % USt ${fmt(beleg.ustBetrag)} €; Brutto: ${fmt(beleg.brutto)} €) auf Ziel.${skonto}`;
    }
    case "ueberweisung": {
      const skontoHinweis = beleg.skontoBetrag > 0
        ? ` (Rechnungsbetrag brutto: ${fmt(r2(beleg.betrag + beleg.skontoBetrag))} €, abzgl. Skonto: ${fmt(beleg.skontoBetrag)} €)`
        : "";
      return `${beleg.absender.name} überweist ${fmt(beleg.betrag)} € an ${beleg.empfaenger.name}${skontoHinweis}. Verwendungszweck: „${beleg.verwendungszweck}" (Ausführungsdatum: ${beleg.ausfuehrungsdatum}).`;
    }
    case "kontoauszug": {
      const hl = beleg.buchungen.find(b => b.highlight);
      if (!hl) return "Bankbuchung laut Kontoauszug.";
      const richtung = hl.betrag > 0 ? "eingehend" : "ausgehend";
      return `Laut Kontoauszug der ${beleg.kontoinhaber} (${beleg.bank}) ist am ${hl.datum} ein Betrag von ${fmt(Math.abs(hl.betrag))} € ${richtung}. Buchungstext: „${hl.text}".`;
    }
    case "email": {
      return `Am ${beleg.datum} erhält die Buchhaltung eine E-Mail von ${beleg.vonName} (${beleg.von}) mit dem Betreff: „${beleg.betreff}". Entnehmen Sie der E-Mail den buchungsrelevanten Sachverhalt.`;
    }
    default: return null;
  }
}

function GeschaeftsfallKarte({ text, aufgabeText }) {
  return (
    <div style={{ border: "1.5px dashed #94a3b8", borderRadius: "10px", background: "#f8fafc", padding: "16px 18px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
        📝 Geschäftsfall
      </div>
      <p style={{ margin: 0, fontSize: "14px", color: "#1e293b", lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ISB-KONTENPLAN BAYERN – Single Source of Truth (vollständig nach IKR)
// ══════════════════════════════════════════════════════════════════════════════
const KONTEN = [
  { nr:"0500", kuerzel:"GR",    name:"Grundstücke",                                          klasse:0, gruppe:"05 Grundstücke und Bauten",              typ:"aktiv" },
  { nr:"0530", kuerzel:"BVG",   name:"Betriebs- und Verwaltungsgebäude",                     klasse:0, gruppe:"05 Grundstücke und Bauten",              typ:"aktiv" },
  { nr:"0700", kuerzel:"MA",    name:"Maschinen und Anlagen",                                klasse:0, gruppe:"07 Technische Anlagen und Maschinen",    typ:"aktiv" },
  { nr:"0840", kuerzel:"FP",    name:"Fuhrpark",                                             klasse:0, gruppe:"08 Betriebs- und Geschäftsausstattung",  typ:"aktiv" },
  { nr:"0860", kuerzel:"BM",    name:"Büromaschinen",                                        klasse:0, gruppe:"08 Betriebs- und Geschäftsausstattung",  typ:"aktiv" },
  { nr:"0870", kuerzel:"BGA",   name:"Büromöbel und Geschäftsausstattung",                   klasse:0, gruppe:"08 Betriebs- und Geschäftsausstattung",  typ:"aktiv" },
  { nr:"0890", kuerzel:"GWG",   name:"Geringwertige Wirtschaftsgüter",                       klasse:0, gruppe:"08 Betriebs- und Geschäftsausstattung",  typ:"aktiv" },
  { nr:"1500", kuerzel:"WP",    name:"Wertpapiere des Anlagevermögens",                      klasse:1, gruppe:"15 Wertpapiere des Anlagevermögens",     typ:"aktiv" },
  { nr:"2000", kuerzel:"R",     name:"Rohstoffe (Fertigungsmaterial)",                       klasse:2, gruppe:"20 Roh-, Hilfs-, Betriebsstoffe",        typ:"aktiv" },
  { nr:"2010", kuerzel:"F",     name:"Fremdbauteile",                                        klasse:2, gruppe:"20 Roh-, Hilfs-, Betriebsstoffe",        typ:"aktiv" },
  { nr:"2020", kuerzel:"H",     name:"Hilfsstoffe",                                          klasse:2, gruppe:"20 Roh-, Hilfs-, Betriebsstoffe",        typ:"aktiv" },
  { nr:"2030", kuerzel:"B",     name:"Betriebsstoffe",                                       klasse:2, gruppe:"20 Roh-, Hilfs-, Betriebsstoffe",        typ:"aktiv" },
  { nr:"2400", kuerzel:"FO",    name:"Forderungen aus Lieferungen und Leistungen",           klasse:2, gruppe:"24 Forderungen aus L+L",                 typ:"aktiv" },
  { nr:"2470", kuerzel:"ZWFO",  name:"Zweifelhafte Forderungen",                             klasse:2, gruppe:"24 Forderungen aus L+L",                 typ:"aktiv" },
  { nr:"2600", kuerzel:"VORST", name:"Vorsteuer",                                            klasse:2, gruppe:"26 Sonstige Vermögensgegenstände",       typ:"aktiv" },
  { nr:"2800", kuerzel:"BK",    name:"Bank (Kontokorrentkonto)",                             klasse:2, gruppe:"28 Flüssige Mittel",                     typ:"aktiv" },
  { nr:"2880", kuerzel:"KA",    name:"Kasse",                                                klasse:2, gruppe:"28 Flüssige Mittel",                     typ:"aktiv" },
  { nr:"2900", kuerzel:"ARA",   name:"Aktive Rechnungsabgrenzung",                           klasse:2, gruppe:"29 Aktive Rechnungsabgrenzung",          typ:"aktiv" },
  { nr:"3000", kuerzel:"EK",    name:"Eigenkapital",                                         klasse:3, gruppe:"30 Eigenkapital",                        typ:"passiv" },
  { nr:"3001", kuerzel:"P",     name:"Privatkonto",                                          klasse:3, gruppe:"30 Eigenkapital",                        typ:"passiv" },
  { nr:"3670", kuerzel:"EWB",   name:"Einzelwertberichtigung",                               klasse:3, gruppe:"36 Wertberichtigungen",                  typ:"passiv" },
  { nr:"3680", kuerzel:"PWB",   name:"Pauschalwertberichtigung",                             klasse:3, gruppe:"36 Wertberichtigungen",                  typ:"passiv" },
  { nr:"3900", kuerzel:"RST",   name:"Rückstellungen",                                       klasse:3, gruppe:"39 Sonstige Rückstellungen",             typ:"passiv" },
  { nr:"4200", kuerzel:"KBKV",  name:"Kurzfristige Bankverbindlichkeiten (bis 1 Jahr)",      klasse:4, gruppe:"42 Verbindlichkeiten bei Kreditinstituten", typ:"passiv" },
  { nr:"4250", kuerzel:"LBKV",  name:"Langfristige Bankverbindlichkeiten",                   klasse:4, gruppe:"42 Verbindlichkeiten bei Kreditinstituten", typ:"passiv" },
  { nr:"4400", kuerzel:"VE",    name:"Verbindlichkeiten aus Lieferungen und Leistungen",     klasse:4, gruppe:"44 Verbindlichkeiten aus L+L",            typ:"passiv" },
  { nr:"4800", kuerzel:"UST",   name:"Umsatzsteuer",                                         klasse:4, gruppe:"48 Sonstige Verbindlichkeiten",           typ:"passiv" },
  { nr:"4830", kuerzel:"VFA",   name:"Sonstige Steuerverbindlichkeiten",                     klasse:4, gruppe:"48 Sonstige Verbindlichkeiten",           typ:"passiv" },
  { nr:"4840", kuerzel:"VSV",   name:"Verbindlichkeiten gegenüber Sozialversicherungsträgern", klasse:4, gruppe:"48 Sonstige Verbindlichkeiten",        typ:"passiv" },
  { nr:"4900", kuerzel:"PRA",   name:"Passive Rechnungsabgrenzung",                          klasse:4, gruppe:"49 Passive Rechnungsabgrenzung",         typ:"passiv" },
  { nr:"5000", kuerzel:"UEFE",  name:"Umsatzerlöse für eigene Erzeugnisse",                  klasse:5, gruppe:"50 Umsatzerlöse",                        typ:"ertrag", klr:true },
  { nr:"5001", kuerzel:"EBFE",  name:"Erlösberichtigungen",                                  klasse:5, gruppe:"50 Umsatzerlöse",                        typ:"ertrag" },
  { nr:"5400", kuerzel:"EMP",   name:"Erlöse aus Vermietung und Verpachtung",                klasse:5, gruppe:"54 Sonstige betriebliche Erträge",       typ:"ertrag" },
  { nr:"5430", kuerzel:"ASBE",  name:"Andere sonstige betriebliche Erträge",                 klasse:5, gruppe:"54 Sonstige betriebliche Erträge",       typ:"ertrag", klr:true },
  { nr:"5490", kuerzel:"PFE",   name:"Periodenfremde Erträge",                               klasse:5, gruppe:"54 Sonstige betriebliche Erträge",       typ:"ertrag" },
  { nr:"5495", kuerzel:"EFO",   name:"Erträge aus abgeschriebenen Forderungen",              klasse:5, gruppe:"54 Sonstige betriebliche Erträge",       typ:"ertrag", klr:true },
  { nr:"5650", kuerzel:"EAWP",  name:"Erträge aus dem Abgang von Wertpapieren des AV",       klasse:5, gruppe:"56 Erträge aus anderen Wertpapieren",   typ:"ertrag" },
  { nr:"5710", kuerzel:"ZE",    name:"Zinserträge",                                          klasse:5, gruppe:"57 Zinsen und ähnliche Erträge",         typ:"ertrag" },
  { nr:"5780", kuerzel:"DDE",   name:"Dividendenerträge",                                    klasse:5, gruppe:"57 Zinsen und ähnliche Erträge",         typ:"ertrag" },
  { nr:"6000", kuerzel:"AWR",   name:"Aufwendungen für Rohstoffe",                           klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6001", kuerzel:"BZKR",  name:"Bezugskosten für Rohstoffe",                           klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6002", kuerzel:"NR",    name:"Nachlässe für Rohstoffe",                              klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6010", kuerzel:"AWF",   name:"Aufwendungen für Fremdbauteile",                       klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6011", kuerzel:"BZKF",  name:"Bezugskosten für Fremdbauteile",                       klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6012", kuerzel:"NF",    name:"Nachlässe für Fremdbauteile",                          klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6020", kuerzel:"AWH",   name:"Aufwendungen für Hilfsstoffe",                         klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6021", kuerzel:"BZKH",  name:"Bezugskosten für Hilfsstoffe",                         klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6022", kuerzel:"NH",    name:"Nachlässe für Hilfsstoffe",                            klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6030", kuerzel:"AWB",   name:"Aufwendungen für Betriebsstoffe",                      klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6031", kuerzel:"BZKB",  name:"Bezugskosten für Betriebsstoffe",                      klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6032", kuerzel:"NB",    name:"Nachlässe für Betriebsstoffe",                         klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6040", kuerzel:"AWVM",  name:"Aufwendungen für Verpackungsmaterial",                 klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand", klr:true },
  { nr:"6140", kuerzel:"AFR",   name:"Ausgangsfrachten",                                     klasse:6, gruppe:"61 Aufwand bezogene Leistungen",         typ:"aufwand", klr:true },
  { nr:"6160", kuerzel:"FRI",   name:"Fremdinstandhaltung",                                  klasse:6, gruppe:"61 Aufwand bezogene Leistungen",         typ:"aufwand" },
  { nr:"6200", kuerzel:"LG",    name:"Löhne und Gehälter",                                   klasse:6, gruppe:"62 Löhne und Gehälter",                  typ:"aufwand", klr:true },
  { nr:"6400", kuerzel:"AGASV", name:"Arbeitgeberanteil zur Sozialversicherung",             klasse:6, gruppe:"64 Soziale Abgaben",                     typ:"aufwand", klr:true },
  { nr:"6520", kuerzel:"ABSA",  name:"Abschreibungen auf Sachanlagen",                       klasse:6, gruppe:"65 Abschreibungen",                      typ:"aufwand", klr:true },
  { nr:"6540", kuerzel:"ABGWG", name:"Abschreibungen auf GWG",                              klasse:6, gruppe:"65 Abschreibungen",                      typ:"aufwand", klr:true },
  { nr:"6700", kuerzel:"AWMP",  name:"Mieten, Pachten",                                      klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand", klr:true },
  { nr:"6730", kuerzel:"GEB",   name:"Gebühren",                                             klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand", klr:true },
  { nr:"6750", kuerzel:"KGV",   name:"Kosten des Geldverkehrs",                              klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand", klr:true },
  { nr:"6760", kuerzel:"PROV",  name:"Provisionen",                                          klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand", klr:true },
  { nr:"6770", kuerzel:"RBK",   name:"Rechts- und Beratungskosten",                          klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand", klr:true },
  { nr:"6800", kuerzel:"BMK",   name:"Büromaterial und Kleingüter",                          klasse:6, gruppe:"68 Aufwand Kommunikation",               typ:"aufwand", klr:true },
  { nr:"6820", kuerzel:"KOM",   name:"Kommunikationsgebühren",                               klasse:6, gruppe:"68 Aufwand Kommunikation",               typ:"aufwand", klr:true },
  { nr:"6850", kuerzel:"REK",   name:"Reisekosten",                                          klasse:6, gruppe:"68 Aufwand Kommunikation",               typ:"aufwand", klr:true },
  { nr:"6870", kuerzel:"WER",   name:"Werbung",                                              klasse:6, gruppe:"68 Aufwand Kommunikation",               typ:"aufwand", klr:true },
  { nr:"6900", kuerzel:"VBEI",  name:"Versicherungsbeiträge",                                klasse:6, gruppe:"69 Sonstige Aufwendungen",               typ:"aufwand", klr:true },
  { nr:"6950", kuerzel:"ABFO",  name:"Abschreibungen auf Forderungen",                       klasse:6, gruppe:"69 Sonstige Aufwendungen",               typ:"aufwand" },
  { nr:"6990", kuerzel:"PFAW",  name:"Periodenfremde Aufwendungen",                          klasse:6, gruppe:"69 Sonstige Aufwendungen",               typ:"aufwand" },
  { nr:"7000", kuerzel:"GWST",  name:"Gewerbesteuer",                                        klasse:7, gruppe:"70 Betriebliche Steuern",                typ:"aufwand" },
  { nr:"7020", kuerzel:"GRST",  name:"Grundsteuer",                                          klasse:7, gruppe:"70 Betriebliche Steuern",                typ:"aufwand" },
  { nr:"7030", kuerzel:"KFZST", name:"Kraftfahrzeugsteuer",                                  klasse:7, gruppe:"70 Betriebliche Steuern",                typ:"aufwand" },
  { nr:"7460", kuerzel:"VAWP",  name:"Verluste aus dem Abgang von Wertpapieren des AV",      klasse:7, gruppe:"74 Verluste aus Finanzanlagen",          typ:"aufwand" },
  { nr:"7510", kuerzel:"ZAW",   name:"Zinsaufwendungen",                                     klasse:7, gruppe:"75 Zinsen",                              typ:"aufwand" },
  { nr:"8010", kuerzel:"SBK",   name:"Schlussbilanzkonto",                                   klasse:8, gruppe:"80 Ergebnisrechnungen",                  typ:"abschluss" },
  { nr:"8020", kuerzel:"GUV",   name:"Gewinn- und Verlustkonto",                             klasse:8, gruppe:"80 Ergebnisrechnungen",                  typ:"abschluss" },
];
// Schnelle Lookups (O(1) via Map)
const _KONTEN_BY_NR = new Map(KONTEN.map(k => [k.nr, k]));
function getKonto(nr)    { return _KONTEN_BY_NR.get(nr) || null; }
function getKürzel(nr)   { return _KONTEN_BY_NR.get(nr)?.kuerzel ?? nr; }
function getVollname(nr) { return _KONTEN_BY_NR.get(nr)?.name    ?? null; }

// renderMitTooltips – parst einen Text und ersetzt bekannte Kürzel mit <KürzelSpan>
// Wird verwendet für erklaerung-Texte wo Kürzel als Wörter vorkommen.
// Kürzel sind 2–6 Großbuchstaben, optional gefolgt von Ziffern.
const _KUERZEL_SET = new Set(KONTEN.map(k => k.kuerzel));
const _KUERZEL_REGEX = /\b([A-ZÄÖÜ]{2,6}[0-9]?)\b/g;
// Builds a lookup: kuerzel → nr (for the first match)
const _KUERZEL_TO_NR = new Map(KONTEN.map(k => [k.kuerzel, k.nr]));
function renderMitTooltips(text) {
  if (!text) return null;
  const parts = [];
  let last = 0;
  let m;
  _KUERZEL_REGEX.lastIndex = 0;
  while ((m = _KUERZEL_REGEX.exec(text)) !== null) {
    const kürzel = m[1];
    if (!_KUERZEL_SET.has(kürzel)) continue;
    const nr = _KUERZEL_TO_NR.get(kürzel);
    if (last < m.index) parts.push(text.slice(last, m.index));
    parts.push(<KürzelSpan key={m.index} nr={nr} style={{ fontWeight: "inherit", fontFamily: "inherit", fontSize: "inherit" }} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

const KONTEN_KLASSEN = [
  { nr:0, label:"Klasse 0", titel:"Sachanlagen" },
  { nr:1, label:"Klasse 1", titel:"Finanzanlagen" },
  { nr:2, label:"Klasse 2", titel:"Umlaufvermögen & ARA" },
  { nr:3, label:"Klasse 3", titel:"Eigenkapital & Rückstellungen" },
  { nr:4, label:"Klasse 4", titel:"Verbindlichkeiten & PRA" },
  { nr:5, label:"Klasse 5", titel:"Erträge" },
  { nr:6, label:"Klasse 6", titel:"Betriebliche Aufwendungen" },
  { nr:7, label:"Klasse 7", titel:"Weitere Aufwendungen & Zinsen" },
  { nr:8, label:"Klasse 8", titel:"Ergebnisrechnungen" },
];
const KONTEN_TYP_FARBEN = {
  aktiv:     { bg:"#dbeafe", text:"#1e40af", border:"#93c5fd",  label:"Aktiv" },
  passiv:    { bg:"#fce7f3", text:"#9d174d", border:"#f9a8d4",  label:"Passiv" },
  ertrag:    { bg:"#dcfce7", text:"#166534", border:"#86efac",  label:"Ertrag" },
  aufwand:   { bg:"#fee2e2", text:"#991b1b", border:"#fca5a5",  label:"Aufwand" },
  abschluss: { bg:"#fef9c3", text:"#854d0e", border:"#fde047",  label:"Abschluss" },
};

// ══════════════════════════════════════════════════════════════════════════════
// KÜRZEL-SPAN – zeigt Kürzel mit Tooltip (Vollname) bei Hover und Touch
// iOS-optimiert: kein title-Attribut, eigenes Tooltip-Div mit position:fixed
// ══════════════════════════════════════════════════════════════════════════════
function KürzelSpan({ nr, style = {} }) {
  const [tip, setTip] = useState(null); // { x, y } oder null
  const hideTimer = useRef(null);
  const kürzel = getKürzel(nr);
  const vollname = getVollname(nr);
  if (!vollname) return <span style={style}>{kürzel}</span>;

  const show = (x, y) => {
    clearTimeout(hideTimer.current);
    setTip({ x, y });
  };
  const hide = (delay = 0) => {
    clearTimeout(hideTimer.current);
    hideTimer.current = delay > 0 ? setTimeout(() => setTip(null), delay) : (setTip(null), undefined);
  };

  return (
    <>
      <span
        style={{ ...style, cursor: "help", textDecoration: "underline dotted", textUnderlineOffset: 2 }}
        onMouseEnter={e => show(e.clientX, e.clientY)}
        onMouseLeave={() => hide(0)}
        onTouchStart={e => { e.stopPropagation(); const t = e.touches[0]; show(t.clientX, t.clientY); }}
        onTouchEnd={() => hide(1800)}
        onTouchMove={() => hide(0)}
      >{kürzel}</span>
      {tip && (
        <div style={{
          position: "fixed",
          left: Math.min(tip.x, window.innerWidth - 200),
          top: tip.y - 38,
          background: "#0f172a",
          color: "#f8fafc",
          fontSize: 11,
          fontWeight: 600,
          padding: "5px 9px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          zIndex: 9999,
          pointerEvents: "none",
          boxShadow: "0 3px 10px rgba(0,0,0,.3)",
          lineHeight: 1.4,
        }}>
          <span style={{ color: "#94a3b8", fontSize: 10, marginRight: 5 }}>{nr}</span>{vollname}
          {/* kleiner Pfeil nach unten */}
          <div style={{ position:"absolute", left:12, bottom:-4, width:8, height:8,
            background:"#0f172a", transform:"rotate(45deg)" }} />
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KONTENPLAN-MODAL – vollständige Übersicht mit Suche und Filter
// ══════════════════════════════════════════════════════════════════════════════
function KontenplanModal({ onSchliessen }) {
  const [suche, setSuche] = useState("");
  const [filterKlasse, setFilterKlasse] = useState(null);
  const [filterTyp, setFilterTyp] = useState(null);
  const [nurKLR, setNurKLR] = useState(false);

  const gefiltert = React.useMemo(() => {
    const q = suche.trim().toLowerCase();
    return KONTEN.filter(k => {
      if (filterKlasse !== null && k.klasse !== filterKlasse) return false;
      if (filterTyp    !== null && k.typ    !== filterTyp)    return false;
      if (nurKLR && !k.klr) return false;
      if (!q) return true;
      return k.nr.includes(q) || k.kuerzel.toLowerCase().includes(q) || k.name.toLowerCase().includes(q) || k.gruppe.toLowerCase().includes(q);
    });
  }, [suche, filterKlasse, filterTyp, nurKLR]);

  const nachKlasse = React.useMemo(() => {
    const map = {};
    gefiltert.forEach(k => { if (!map[k.klasse]) map[k.klasse] = []; map[k.klasse].push(k); });
    return map;
  }, [gefiltert]);

  const typen = ["aktiv","passiv","ertrag","aufwand","abschluss"];
  const fBtn = (active, bg, text, border) => ({
    padding:"5px 10px", borderRadius:6, border:`1.5px solid ${active ? border : "#334155"}`,
    fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Courier New',monospace",
    background: active ? bg : "#1e293b", color: active ? text : "#94a3b8", letterSpacing:"0.04em",
  });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:3000, display:"flex", alignItems:"stretch", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onSchliessen()}>
      <div style={{ background:"#0f172a", width:"100%", maxWidth:760, display:"flex", flexDirection:"column",
        boxShadow:"0 8px 40px rgba(0,0,0,.6)", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1e293b,#0f172a)", borderBottom:"1px solid #334155",
          padding:"18px 20px 14px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"#f8fafc", letterSpacing:"-0.3px" }}>Kontenplan ISB Bayern</div>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:".1em", marginTop:2 }}>IKR · LehrplanPLUS Realschule · BwR Klassen 7–10</div>
          </div>
          <button onClick={onSchliessen} style={{ marginLeft:"auto", background:"#1e293b", border:"1.5px solid #334155",
            borderRadius:8, color:"#94a3b8", fontSize:18, cursor:"pointer", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Suche */}
        <div style={{ padding:"12px 20px", background:"#1e293b", borderBottom:"1px solid #334155", flexShrink:0 }}>
          <input
            style={{ width:"100%", boxSizing:"border-box", background:"#0f172a", border:"1.5px solid #334155",
              borderRadius:8, padding:"8px 14px", color:"#e2e8f0", fontSize:13,
              fontFamily:"'Courier New',monospace", outline:"none" }}
            placeholder="🔍  Nr., Kürzel oder Bezeichnung …"
            value={suche} onChange={e => setSuche(e.target.value)}
            autoFocus
          />
        </div>

        {/* Klassen-Filter */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"10px 20px", background:"#1e293b", borderBottom:"1px solid #334155", flexShrink:0 }}>
          {KONTEN_KLASSEN.map(k => (
            <button key={k.nr} style={fBtn(filterKlasse===k.nr,"#0369a1","#e0f2fe","#38bdf8")}
              onClick={() => setFilterKlasse(filterKlasse===k.nr ? null : k.nr)}>{k.label}</button>
          ))}
        </div>

        {/* Typ-Filter */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"8px 20px", background:"#1e293b", borderBottom:"1px solid #334155", flexShrink:0, alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#475569", fontWeight:700, letterSpacing:".08em" }}>TYP:</span>
          {typen.map(t => { const f = KONTEN_TYP_FARBEN[t]; return (
            <button key={t} style={fBtn(filterTyp===t, f.bg, f.text, f.border)}
              onClick={() => setFilterTyp(filterTyp===t ? null : t)}>{f.label}</button>
          );})}
          <button style={{ ...fBtn(nurKLR,"#4c1d95","#ddd6fe","#a78bfa") }}
            onClick={() => setNurKLR(!nurKLR)}>● KLR</button>
          <span style={{ marginLeft:"auto", fontSize:11, color:"#475569" }}>{gefiltert.length} / {KONTEN.length}</span>
        </div>

        {/* Tabelle */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
          {Object.keys(nachKlasse).length === 0
            ? <div style={{ textAlign:"center", padding:48, color:"#475569", fontSize:13 }}>Keine Konten gefunden.</div>
            : KONTEN_KLASSEN.filter(kl => nachKlasse[kl.nr]?.length).map(kl => (
              <div key={kl.nr} style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:8, paddingBottom:6, borderBottom:"1px solid #1e293b" }}>
                  <span style={{ fontSize:10, fontWeight:800, color:"#475569", letterSpacing:".1em", textTransform:"uppercase" }}>{kl.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#94a3b8" }}>{kl.titel}</span>
                  <span style={{ marginLeft:"auto", fontSize:10, color:"#334155" }}>{nachKlasse[kl.nr].length} Konten</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>{["Nr.","Kürzel","Bezeichnung","Typ"].map(h => (
                      <th key={h} style={{ textAlign:"left", fontSize:10, fontWeight:800, color:"#475569",
                        letterSpacing:".1em", textTransform:"uppercase", padding:"3px 8px", borderBottom:"1px solid #1e293b" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {nachKlasse[kl.nr].map(k => {
                      const f = KONTEN_TYP_FARBEN[k.typ];
                      return (
                        <tr key={k.nr} style={{ borderBottom:"1px solid #1e293b" }}>
                          <td style={{ padding:"7px 8px", fontSize:13, fontWeight:700, color:"#f59e0b", fontFamily:"'Courier New',monospace", whiteSpace:"nowrap" }}>{k.nr}</td>
                          <td style={{ padding:"7px 8px", fontSize:12, fontWeight:800, color:"#38bdf8", fontFamily:"'Courier New',monospace", whiteSpace:"nowrap" }}>{k.kuerzel}</td>
                          <td style={{ padding:"7px 8px", fontSize:13, color:"#e2e8f0" }}>
                            {k.name}
                            {k.klr && <span title="KLR-relevant" style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:"#a78bfa", marginLeft:6, verticalAlign:"middle" }} />}
                          </td>
                          <td style={{ padding:"7px 8px" }}>
                            <span style={{ display:"inline-block", fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4,
                              background:f?.bg||"#1e293b", color:f?.text||"#e2e8f0", border:`1px solid ${f?.border||"#334155"}` }}>
                              {f?.label||k.typ}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))
          }
          {/* Legende */}
          <div style={{ marginTop:16, padding:"12px 14px", background:"#1e293b", borderRadius:8, border:"1px solid #334155" }}>
            <div style={{ fontSize:10, fontWeight:800, color:"#475569", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8 }}>Legende</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
              {typen.map(t => { const f = KONTEN_TYP_FARBEN[t]; return (
                <span key={t} style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:4,
                  background:f.bg, color:f.text, border:`1px solid ${f.border}` }}>{f.label}</span>
              );})}
              <span style={{ fontSize:11, color:"#94a3b8", display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:"#a78bfa" }} />
                = geht in KLR ein
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE HAKEN – ISB-Korrekturzeichen, frei verschiebbar und löschbar
// Bedienung: Ziehen = verschieben | Doppelklick = zurücksetzen
//            Rechtsklick (Desktop) / Long-Press >600ms (iOS) = löschen
// ══════════════════════════════════════════════════════════════════════════════
function DraggableHaken({ label = "✓" }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const start = useRef(null);
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);

  // Long-Press-Start (Touch)
  const startLongPress = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setDeleted(true);
    }, 600);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const onPointerDown = (e) => {
    if (e.button === 2) return; // Rechtsklick über onContextMenu
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
    if (e.pointerType === "touch") startLongPress();
  };

  const onPointerMove = (e) => {
    if (!dragging || !start.current) return;
    const nx = start.current.ox + (e.clientX - start.current.mx);
    const ny = start.current.oy + (e.clientY - start.current.my);
    // Bewegung > 5px → kein Long-Press-Löschen
    if (Math.abs(e.clientX - start.current.mx) > 5 || Math.abs(e.clientY - start.current.my) > 5) cancelLongPress();
    setOffset({ x: nx, y: ny });
    if (Math.abs(nx) > 3 || Math.abs(ny) > 3) setMoved(true);
  };

  const onPointerUp = (e) => {
    setDragging(false);
    if (e.pointerType === "touch") cancelLongPress();
  };

  // Rechtsklick = löschen (Desktop)
  const onContextMenu = (e) => { e.preventDefault(); setDeleted(true); };

  // Doppelklick = zurücksetzen
  const onDoubleClick = () => { setOffset({ x: 0, y: 0 }); setMoved(false); };

  if (deleted) return (
    <span
      onClick={() => { setDeleted(false); setOffset({ x:0, y:0 }); setMoved(false); }}
      title="Haken wiederherstellen"
      style={{
        display: "inline-block", cursor: "pointer",
        fontFamily: "sans-serif", fontSize: 12, fontWeight: 800,
        color: "#94a3b8", background: "#f1f5f9",
        border: "1.5px dashed #cbd5e1", borderRadius: 3,
        padding: "0 4px", margin: "0 4px", lineHeight: 1,
        flexShrink: 0, userSelect: "none",
      }}>+</span>
  );

  return (
    <span
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      title={moved ? "Doppelklick → zurücksetzen | Rechtsklick → löschen" : "Ziehen → verschieben | Rechtsklick / Lang-Tippen → löschen"}
      style={{
        display: "inline-block",
        position: "relative",
        left: offset.x,
        top: offset.y,
        zIndex: dragging ? 200 : 1,
        cursor: dragging ? "grabbing" : "grab",
        fontFamily: "sans-serif",
        fontSize: 13,
        fontWeight: 800,
        color: "#16a34a",
        background: moved ? "#dcfce7" : "#f0fdf4",
        border: `1.5px solid ${moved ? "#4ade80" : "#bbf7d0"}`,
        borderRadius: 3,
        padding: "0 4px",
        margin: "0 4px",
        lineHeight: 1,
        flexShrink: 0,
        userSelect: "none",
        touchAction: "none",
        boxShadow: dragging ? "0 4px 12px rgba(0,0,0,.18)" : moved ? "0 1px 4px rgba(0,0,0,.10)" : "none",
        transition: dragging ? "none" : "box-shadow .15s",
      }}
    >{label}</span>
  );
}

function BuchungsSatz({ soll, haben }) {
  const sollLen = soll.length;
  const habenLen = haben.length;
  const rows = Math.max(sollLen, habenLen);

  const col = {
    nr:    { fontFamily: "'Courier New',monospace", fontWeight: 700, minWidth: "44px" },
    kürz:  { fontFamily: "'Courier New',monospace", fontWeight: 700, minWidth: "62px" },
    betr:  { fontFamily: "'Courier New',monospace", minWidth: "90px", textAlign: "right", paddingRight: "6px" },
    an:    { fontFamily: "'Courier New',monospace", fontWeight: 700, color: "#64748b", minWidth: "30px", textAlign: "center", padding: "0 6px" },
  };

  const anRow = sollLen - 1;

  return (
    <div style={{ fontFamily: "'Courier New',monospace", fontSize: "14px", lineHeight: 2.1,
                  background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "8px",
                  padding: "12px 16px", display: "inline-block", minWidth: "100%" }}>
      {Array.from({ length: rows }).map((_, rowIdx) => {
        const s = rowIdx < sollLen ? soll[rowIdx] : null;
        const hIdx = rowIdx - anRow;
        const h = hIdx >= 0 && hIdx < habenLen ? haben[hIdx] : null;
        const showAn = rowIdx === anRow;

        return (
          <div key={rowIdx} style={{ display: "flex", alignItems: "baseline", gap: "0" }}>
            {/* SOLL-Seite: Nr  Kürzel  ✓  Betrag */}
            <div style={{ display: "flex", alignItems: "baseline", minWidth: "270px", gap: "4px" }}>
              {s ? (
                <>
                  <span style={{ ...col.nr, color: "#1d4ed8" }}>{s.nr}</span>
                  <KürzelSpan nr={s.nr} style={{ ...col.kürz, color: "#1d4ed8" }} />
                  <DraggableHaken />
                  <span style={{ ...col.betr, color: "#334155" }}>{fmt(s.betrag)} €</span>
                </>
              ) : (
                <span style={{ minWidth: "220px" }}></span>
              )}
            </div>
            {/* "an" Trennwort */}
            <span style={{ ...col.an, visibility: showAn ? "visible" : "hidden" }}>an</span>
            {/* HABEN-Seite: Nr  Kürzel  ✓  Betrag */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              {h ? (
                <>
                  <span style={{ ...col.nr, color: "#dc2626" }}>{h.nr}</span>
                  <KürzelSpan nr={h.nr} style={{ ...col.kürz, color: "#dc2626" }} />
                  <DraggableHaken />
                  <span style={{ ...col.betr, color: "#334155" }}>{fmt(h.betrag)} €</span>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NebenrechnungBox({ nrs, nrPunkte = 0 }) {
  if (!nrs || nrs.length === 0) return null;
  return (
    <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>📐 Nebenrechnung</div>
        {nrPunkte > 0 && (
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: nrPunkte }).map((_, i) => (
              <DraggableHaken key={i} />
            ))}
          </div>
        )}
      </div>
      <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
        <tbody>
          {nrs.map((nr, i) => (
            <tr key={i}>
              <td style={{ color: "#92400e", fontWeight: 600, paddingRight: "12px", paddingBottom: "3px" }}>{nr.label}</td>
              <td style={{ color: "#78350f", fontFamily: "monospace", paddingRight: "12px" }}>{nr.formel}</td>
              <td style={{ color: "#78350f", fontFamily: "monospace", fontWeight: 700, textAlign: "right" }}>= {nr.ergebnis}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchemaTabelle({ rows }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
      <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((r, i) => {
            const isInfo = typeof r.wert !== "number";
            return (
              <tr key={i} style={{ background: r.highlight ? "#f0fdf4" : isInfo ? "#fafafa" : r.bold ? "#f8fafc" : "#fff", borderTop: r.trennlinie ? "2px solid #0f172a" : i > 0 ? "1px solid #f1f5f9" : "none" }}>
                <td style={{ padding: isInfo ? "4px 14px 4px 20px" : "7px 14px", color: r.highlight ? "#15803d" : isInfo ? "#64748b" : r.bold ? "#0f172a" : "#374151", fontWeight: r.bold || r.highlight ? 700 : 400, fontStyle: isInfo ? "italic" : "normal", paddingLeft: !isInfo && (r.label.startsWith("+") || r.label.startsWith("−") || r.label.startsWith("×")) ? "28px" : undefined }} colSpan={isInfo ? 2 : 1}>
                  {isInfo ? `ℹ ${r.label}` : r.label}
                </td>
                {!isInfo && (
                  <td style={{ padding: "7px 14px", textAlign: "right", fontFamily: "monospace", fontWeight: r.bold || r.highlight ? 700 : 400, color: r.highlight ? "#15803d" : r.bold ? "#0f172a" : "#475569" }}>
                    {`${fmt(r.wert)} ${r.einheit}`}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AngebotsVergleichAufgabe({ angebote }) {
  // Zeigt nur die Angaben (ohne Beträge) – für die Aufgabenstellung
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
      {angebote.map((a, ai) => (
        <div key={ai} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ background: "#f8fafc", padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: "13px", color: "#374151" }}>
            {a.name} – {a.lief}
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 400 }}>{a.ort}</div>
          </div>
          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Listeneinkaufspreis", `${fmt(a.k.lep)} €`, false],
                [`Sofortrabatt`, `${a.k.rabPct} %`, false],
                [`Liefererskonto`, `${a.skPct} %`, false],
                ["Bezugskosten", `${fmt(a.k.bzkBetrag)} €`, false],
              ].map(([label, val, bold], i) => (
                <tr key={i} style={{ borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
                  <td style={{ padding: "6px 12px", color: "#374151", fontWeight: bold ? 700 : 400 }}>{label}</td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: bold ? 700 : 400, color: "#0f172a" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function AngebotsVergleichLoesung({ angebote, gewinner }) {
  // Zeigt das vollständige ausgefüllte Schema – nur in der Lösung
  const rowLabels = angebote[0].rows.map(r => r.label);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
        <thead>
          <tr>
            <th style={{ padding: "7px 12px", textAlign: "left", background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#374151", fontWeight: 700, width: "42%" }}>Position</th>
            {angebote.map((a, ai) => (
              <th key={ai} style={{ padding: "7px 12px", textAlign: "right",
                background: gewinner === ai ? "#f0fdf4" : "#f8fafc",
                borderBottom: "2px solid " + (gewinner === ai ? "#22c55e" : "#e2e8f0"),
                color: gewinner === ai ? "#15803d" : "#374151", fontWeight: 800 }}>
                {a.name} {gewinner === ai ? "✓" : ""}
                <div style={{ fontSize: "10px", fontWeight: 400, color: "#6b7280" }}>{a.lief}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {angebote[0].rows.map((r, ri) => {
            const isInfo = typeof r.wert !== "number";
            if (isInfo) return null;
            return (
              <tr key={ri} style={{ background: r.bold ? "#f8fafc" : "#fff", borderTop: r.trennlinie ? "2px solid #374151" : "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 12px", color: r.bold ? "#0f172a" : "#374151", fontWeight: r.bold ? 700 : 400,
                  paddingLeft: r.label.startsWith("+") || r.label.startsWith("−") ? "24px" : undefined }}>
                  {r.label}
                </td>
                {angebote.map((a, ai) => {
                  const cell = a.rows[ri];
                  const isWinner = gewinner === ai;
                  return (
                    <td key={ai} style={{ padding: "6px 12px", textAlign: "right", fontFamily: "monospace",
                      fontWeight: cell?.bold || cell?.highlight ? 700 : 400,
                      color: cell?.highlight && isWinner ? "#15803d" : cell?.bold ? "#0f172a" : "#475569",
                      background: cell?.highlight && isWinner ? "#dcfce7" : cell?.highlight ? "#fef9c3" : "transparent" }}>
                      {cell && typeof cell.wert === "number" ? `${fmt(cell.wert)} €` : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: "8px", padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "12px", color: "#15803d", fontWeight: 700 }}>
        🏆 {angebote[gewinner].name} ({angebote[gewinner].lief}) – Einstandspreis {fmt(angebote[gewinner].k.einst)} € &lt; {fmt(angebote[1-gewinner].k.einst)} € &nbsp;→&nbsp; Kauf zum ZielEP: <strong>{fmt(angebote[gewinner].rows.find(r => r.highlight)?.wert)} €</strong>
      </div>
    </div>
  );
}

const BELEG_LABEL = { eingangsrechnung: "Eingangsrechnung", ausgangsrechnung: "Ausgangsrechnung", kontoauszug: "Kontoauszug", ueberweisung: "Online-Überweisung", email: "E-Mail" };

// ══════════════════════════════════════════════════════════════════════════════
// T-KONTEN-KOMPONENTE
// ══════════════════════════════════════════════════════════════════════════════
function TKonten({ soll, haben }) {
  // Group all entries by account number
  const kontenMap = {};
  soll.forEach(k => {
    if (!kontenMap[k.nr]) kontenMap[k.nr] = { nr: k.nr, soll: [], haben: [] };
    kontenMap[k.nr].soll.push(k);
  });
  haben.forEach(k => {
    if (!kontenMap[k.nr]) kontenMap[k.nr] = { nr: k.nr, soll: [], haben: [] };
    kontenMap[k.nr].haben.push(k);
  });

  return (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "4px" }}>
      {Object.values(kontenMap).map(k => {
        const sollSum = r2(k.soll.reduce((a, e) => a + e.betrag, 0));
        const habenSum = r2(k.haben.reduce((a, e) => a + e.betrag, 0));
        const saldo = r2(sollSum - habenSum);
        const kürzel = getKürzel(k.nr);
        const vollname = getVollname(k.nr);
        return (
          <div key={k.nr} style={{ border: "2px solid #334155", borderRadius: "8px", minWidth: "180px", overflow: "hidden", fontSize: "13px", fontFamily: "'Courier New',monospace" }}>
            {/* Kontoname */}
            <div style={{ background: "#1e293b", color: "#f1f5f9", padding: "5px 10px", textAlign: "center", fontWeight: 700, fontSize: "12px", letterSpacing: "0.04em" }}>
              {k.nr} · <KürzelSpan nr={k.nr} style={{ color: "#f1f5f9", fontFamily: "'Courier New',monospace", fontWeight: 700, fontSize: "12px" }} />
              {vollname && <div style={{ fontSize: 9, fontWeight: 400, color: "#94a3b8", marginTop: 1, letterSpacing: 0 }}>{vollname}</div>}
            </div>
            {/* T-Konto Körper */}
            <div style={{ display: "flex", background: "#fff" }}>
              {/* Soll-Seite */}
              <div style={{ flex: 1, borderRight: "2px solid #334155", padding: "8px 10px", minWidth: "80px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.08em" }}>Soll</div>
                {k.soll.map((e, i) => (
                  <div key={i} style={{ color: "#1d4ed8", fontWeight: 600, textAlign: "right", lineHeight: 1.8 }}>{fmt(e.betrag)}</div>
                ))}
                {k.soll.length === 0 && <div style={{ color: "#cbd5e1", fontSize: "11px" }}>—</div>}
              </div>
              {/* Haben-Seite */}
              <div style={{ flex: 1, padding: "8px 10px", minWidth: "80px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#dc2626", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.08em" }}>Haben</div>
                {k.haben.map((e, i) => (
                  <div key={i} style={{ color: "#dc2626", fontWeight: 600, textAlign: "right", lineHeight: 1.8 }}>{fmt(e.betrag)}</div>
                ))}
                {k.haben.length === 0 && <div style={{ color: "#cbd5e1", fontSize: "11px" }}>—</div>}
              </div>
            </div>
            {/* Saldo */}
            <div style={{ borderTop: "1.5px solid #334155", padding: "4px 10px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>Saldo</span>
              <span style={{ fontWeight: 800, fontSize: "12px", color: saldo > 0 ? "#1d4ed8" : saldo < 0 ? "#dc2626" : "#64748b" }}>
                {fmt(Math.abs(saldo))} {saldo > 0 ? "S" : saldo < 0 ? "H" : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KOMPLEX-KARTE — mehrstufige Buchungskette
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// THEORIE-KARTE
// ══════════════════════════════════════════════════════════════════════════════
function TheorieKarte({ aufgabe, nr, showLoesung, klasse = 10 }) {
  const [open, setOpen] = useState(false);
  const show = showLoesung || open;
  const punkte = aufgabe.nrPunkte || 0;
  const aufgabeText = anrede(klasse, aufgabe.aufgabe);

  // ── Lückentext Renderer ──────────────────────────────────────────────────
  const renderLückentext = (lt, showAnswer) => {
    const teile = lt.text.split(/\{(\d+)\}/);
    return (
      <div style={{ lineHeight: "2.2", fontSize: "14px", color: "#1e293b" }}>
        {teile.map((t, i) => {
          if (i % 2 === 0) return <span key={i}>{t}</span>;
          const idx = parseInt(t);
          const antwort = lt.luecken[idx];
          return showAnswer
            ? <span key={i} style={{ background: "#dcfce7", color: "#166534", fontWeight: 700, borderRadius: "4px", padding: "0 6px", margin: "0 2px", borderBottom: "2px solid #16a34a" }}>{antwort}</span>
            : <span key={i} style={{ display: "inline-block", minWidth: "120px", borderBottom: "2px solid #374151", margin: "0 4px", verticalAlign: "bottom" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;
        })}
        <div style={{ marginTop: "14px", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Wortbank: </span>
          {lt.wortbank.map((w, i) => (
            <span key={i} style={{ display: "inline-block", margin: "2px 4px", padding: "2px 8px", background: "#fff", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", color: "#374151" }}>{w}</span>
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
          <div style={{ fontWeight: 700, color: "#374151", padding: "4px 0", borderBottom: "2px solid #e2e8f0" }}>Begriff</div>
          <div style={{ fontWeight: 700, color: "#374151", padding: "4px 0", borderBottom: "2px solid #e2e8f0" }}>Definition</div>
          {shuffled.terms.map((t, i) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: "22px", height: "22px", borderRadius: "50%",
                  background: showAnswer ? "#dcfce7" : "#f8fafc",
                  border: "1.5px solid " + (showAnswer ? "#16a34a" : "#cbd5e1"),
                  color: showAnswer ? "#166534" : "#374151",
                  fontWeight: 800, fontSize: "12px", flexShrink: 0,
                }}>
                  {showAnswer ? answerMap[t.origIdx] : " "}
                </span>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>{t.term}</span>
              </div>
              <div style={{ color: "#475569", padding: "6px 0", borderBottom: "1px solid #f1f5f9", lineHeight: 1.5 }}>
                <span style={{ display: "inline-block", minWidth: "20px", fontWeight: 700, color: "#0f172a" }}>{shuffled.defs[i]?.letter})</span>
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
        <div key={fi} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "8px", fontSize: "13px" }}>{fi + 1}. {f.frage}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {f.optionen.map((opt, oi) => {
              const isRichtig = oi === f.richtig;
              return (
                <div key={oi} style={{
                  display: "flex", alignItems: "flex-start", gap: "8px", padding: "5px 8px", borderRadius: "7px",
                  background: showAnswer && isRichtig ? "#dcfce7" : "#fff",
                  border: "1.5px solid " + (showAnswer && isRichtig ? "#16a34a" : "#e2e8f0"),
                }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    minWidth: "18px", height: "18px", borderRadius: "50%",
                    border: "1.5px solid " + (showAnswer && isRichtig ? "#16a34a" : "#94a3b8"),
                    fontSize: "11px", fontWeight: 700,
                    background: showAnswer && isRichtig ? "#16a34a" : "#fff",
                    color: showAnswer && isRichtig ? "#fff" : "#64748b",
                    flexShrink: 0, marginTop: "1px",
                  }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span style={{ fontSize: "13px", color: showAnswer && isRichtig ? "#166534" : "#374151", fontWeight: showAnswer && isRichtig ? 700 : 400 }}>{opt}</span>
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
    <div style={{ border: "1px solid #bae6fd", borderRadius: "12px", overflow: "hidden", marginBottom: "12px", background: "#fff" }}>
      <div style={{ background: "#f0f9ff", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #bae6fd", flexWrap: "wrap" }}>
        <div style={{ width: "26px", height: "26px", background: "#0891b2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>{nr}</div>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#374151", flex: 1, minWidth: "120px" }}>{aufgabe.titel}</span>
        <span style={{ fontSize: "11px", color: "#0891b2", fontWeight: 700, background: "#e0f2fe", padding: "2px 8px", borderRadius: "20px" }}>
          {themenTyp === "lueckentext" ? "📝 Lückentext" : themenTyp === "zuordnung" ? "🔗 Zuordnung" : themenTyp === "mc" ? "☑️ Multiple Choice" : "✍️ Freitext"}
        </span>
        <div style={{ display: "flex", alignItems: "center", background: "#0f172a", color: "#f59e0b", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>
          {punkte} P
        </div>
        <button onClick={() => setOpen(!open)} style={{ ...S.btnSecondary, padding: "4px 10px", fontSize: "12px" }}>{open ? "▲" : "▼ Lösung"}</button>
      </div>

      <div style={{ padding: "16px" }}>
        <p style={{ margin: "0 0 14px", color: "#374151", fontWeight: 600, fontSize: "14px" }}>{aufgabeText}</p>
        {themenTyp === "lueckentext" && lt  && renderLückentext(lt, show)}
        {themenTyp === "zuordnung"   && zu  && renderZuordnung(zu, show)}
        {themenTyp === "mc"          && mc  && renderMC(mc, show)}
        {themenTyp === "freitext"    && aufgabe.freitext && (
          <div style={{ marginTop: "4px" }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", minHeight: "60px", fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>
              Antwortfeld (ca. {aufgabe.freitext.zeilen || 4} Zeilen)
            </div>
            {show && aufgabe.freitext.loesung && (
              <div style={{ marginTop: "10px", background: "#dcfce7", border: "1.5px solid #16a34a", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#166534", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>✓ Musterlösung</div>
                <div style={{ fontSize: "13px", color: "#166534", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aufgabe.freitext.loesung}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KomplexKarte({ aufgabe, nr, showLoesung, globalMode, klasse = 10 }) {
  const [openAll, setOpenAll] = useState(false);
  const [openSchritte, setOpenSchritte] = useState({});
  const [loesungsViews, setLoesungsViews] = useState({});
  const [localMode, setLocalMode] = useState(null);
  const effectiveMode = localMode ?? globalMode;
  const gesamtPunkte = (aufgabe.schritte || []).reduce((s, st) => s + st.punkte, 0);

  const toggleSchritt = i => setOpenSchritte(p => ({ ...p, [i]: !p[i] }));
  const getLoeView = i => loesungsViews[i] || "buchungssatz";
  const setLoeView = (i, v) => setLoesungsViews(p => ({ ...p, [i]: v }));

  return (
    <div style={{ border: "2px solid #0f172a", borderRadius: "14px", overflow: "hidden", marginBottom: "16px", background: "#fff" }}>
      {/* ── Gesamtheader ── */}
      <div style={{ background: "#0f172a", padding: "14px 18px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ width: "28px", height: "28px", background: "#f59e0b", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f172a", fontSize: "13px", fontWeight: 900, flexShrink: 0 }}>{nr}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2px" }}>🔗 Komplexaufgabe · {(aufgabe.schritte || []).length} Schritte</div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#fff" }}>{aufgabe.titel.replace("🔗 ", "")}</div>
        </div>
        <div style={{ background: "#f59e0b", color: "#0f172a", borderRadius: "20px", padding: "4px 14px", fontSize: "13px", fontWeight: 900, flexShrink: 0 }}>{gesamtPunkte} P</div>
        {/* Beleg/Geschäftsfall-Toggle für alle Schritte */}
        <div style={{ display: "flex", border: "1.5px solid #334155", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
          {[{ key: "beleg", label: "📄 Beleg" }, { key: "text", label: "📝 GF" }].map(opt => {
            const isActive = effectiveMode === opt.key;
            return (
              <button key={opt.key} onClick={() => setLocalMode(localMode === opt.key ? null : opt.key)}
                style={{ padding: "4px 10px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: isActive ? 700 : 500,
                  background: isActive ? "#334155" : "transparent", color: isActive ? "#f59e0b" : "#64748b", transition: "all 0.15s" }}>
                {opt.label}
              </button>
            );
          })}
        </div>
        <button onClick={() => setOpenAll(!openAll)}
          style={{ ...S.btnSecondary, padding: "4px 12px", fontSize: "12px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" }}>
          {openAll ? "▲ Lösungen" : "▼ Lösungen"}
        </button>
      </div>

      {/* ── Szenario-Box ── */}
      <div style={{ padding: "12px 18px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
        📋 <strong>Szenario:</strong> {aufgabe.kontext}
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
          <div key={i} style={{ borderTop: "1px solid #e2e8f0" }}>
            {/* Schritt-Header */}
            <div style={{ padding: "9px 18px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", background: "#fafafa" }}>
              <div style={{ width: "22px", height: "22px", background: "#1e293b", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", fontSize: "11px", fontWeight: 800, flexShrink: 0 }}>{schritt.nr}</div>
              <span style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", flex: 1 }}>{schritt.titel}</span>
              <div style={{ display: "flex", alignItems: "center", background: "#1e293b", color: "#f59e0b", borderRadius: "20px", padding: "2px 10px", fontSize: "11px", fontWeight: 800 }}>
                {schritt.punkte} P{nrPunkte > 0 && <span style={{ color: "#fde68a", fontSize: "10px", fontWeight: 600 }}> (+{nrPunkte} NR)</span>}
              </div>
              <button onClick={() => toggleSchritt(i)} style={{ ...S.btnSecondary, padding: "3px 9px", fontSize: "11px" }}>
                {openSchritte[i] ? "▲" : "▼ Lösung"}
              </button>
            </div>

            {/* Schritt-Body */}
            <div style={{ padding: "12px 18px 14px 48px" }}>
              <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#374151", fontWeight: 600 }}>{anrede(klasse, schritt.aufgabe)}</p>

              {/* ── Angebotsvergleich: Aufgabenteil (immer sichtbar) ── */}
              {schritt.typ === "angebotsvergleich" && schritt.angebote && (
                <div style={{ marginBottom: "10px" }}>
                  <AngebotsVergleichAufgabe angebote={schritt.angebote} />

                </div>
              )}

              {/* ── Einfache Kalkulation – Blanko-Schema (Labels ohne Beträge) ── */}
              {(schritt.typ === "kalkulation" || schritt.typ === "kalkulation_vk") && schritt.schema && !schritt.angebote && (
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
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
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#64748b" }}>
                    {anrede(klasse, "Füllen Sie das Kalkulationsschema aus.")}{schritt.typ === "kalkulation" ? " Rechne nur mit Nettowerten." : ""}
                  </div>
                </div>
              )}

              {/* ── Normaler Beleg ── */}
              {hasBeleg && schritt.typ !== "angebotsvergleich" && schritt.typ !== "kalkulation" && schritt.typ !== "kalkulation_vk" && (
                <div style={{ marginBottom: "10px" }}>
                  {effectiveMode === "beleg"
                    ? <BelegAnzeige beleg={schritt.beleg} />
                    : <GeschaeftsfallKarte text={gfText} />
                  }
                </div>
              )}

              {isOpen && schritt.typ !== "angebotsvergleich" && schritt.typ !== "kalkulation" && schritt.typ !== "kalkulation_vk" && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 14px" }}>
                  {/* View Toggle */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    {[{ key: "buchungssatz", label: "📒 Buchungssatz" }, { key: "tkonten", label: "📐 T-Konten" }].map(opt => (
                      <button key={opt.key} onClick={() => setLoeView(i, opt.key)}
                        style={{ ...S.btnSecondary, padding: "3px 9px", fontSize: "11px",
                          fontWeight: loeView === opt.key ? 800 : 500,
                          background: loeView === opt.key ? "#dcfce7" : "#fff" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {loeView === "buchungssatz"
                    ? <BuchungsSatz soll={schritt.soll} haben={schritt.haben} />
                    : <TKonten soll={schritt.soll} haben={schritt.haben} />
                  }
                  {schritt.erklaerung && (
                    <div style={{ marginTop: "10px", padding: "8px 12px", background: "#fff", borderRadius: "8px", border: "1px solid #d1fae5", fontSize: "12px", color: "#374151", lineHeight: 1.6 }}>
                      💡 {schritt.erklaerung}
                    </div>
                  )}
                </div>
              )}

              {/* Lösung Angebotsvergleich: vollständiges Schema + Entscheidung */}
              {isOpen && schritt.typ === "angebotsvergleich" && schritt.angebote && (
                <div style={{ marginTop: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#166534", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>📊 Lösung – Kalkulationsschema</div>
                  <AngebotsVergleichLoesung angebote={schritt.angebote} gewinner={schritt.gewinner} />
                  {schritt.erklaerung && (
                    <div style={{ marginTop: "8px", padding: "6px 10px", background: "#fff", borderRadius: "7px", border: "1px solid #d1fae5", fontSize: "12px", color: "#374151", lineHeight: 1.6 }}>
                      💡 {schritt.erklaerung}
                    </div>
                  )}
                </div>
              )}

              {/* Lösung einfache Kalkulation */}
              {isOpen && (schritt.typ === "kalkulation" || schritt.typ === "kalkulation_vk") && schritt.schema && (
                <div style={{ marginTop: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#166534", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {schritt.typ === "kalkulation_vk" ? "📊 Lösung – Verkaufskalkulation" : "📊 Lösung – Kalkulationsschema"}
                  </div>
                  <SchemaTabelle rows={schritt.schema} />
                  {schritt.erklaerung && (
                    <div style={{ marginTop: "8px", padding: "6px 10px", background: "#fff", borderRadius: "7px", border: "1px solid #d1fae5", fontSize: "12px", color: "#374151" }}>
                      💡 {schritt.erklaerung}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AufgabeKarte({ aufgabe, nr, showLoesung, globalMode, klasse = 10 }) {
  const [open, setOpen] = useState(false);
  const [localMode, setLocalMode] = useState(null);
  const [loesungsView, setLoesungsView] = useState("buchungssatz"); // "buchungssatz" | "tkonten"
  const effectiveMode = localMode ?? globalMode;

  const punkte = berechnePunkte(aufgabe);
  const isRechnung = aufgabe.taskTyp === "rechnung";
  const belegTyp = aufgabe.beleg?.typ;
  const hasBeleg = !!aufgabe.beleg;
  const geschaeftsfallText = hasBeleg ? belegToGeschaeftsfall(aufgabe.beleg) : null;

  const aufgabeText = anrede(klasse, effectiveMode === "text" && geschaeftsfallText
    ? "Bilde den Buchungssatz zum folgenden Geschäftsfall."
    : aufgabe.aufgabe);

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", marginBottom: "12px", background: "#fff" }}>
      {/* Task header */}
      <div style={{ background: "#f8fafc", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
        <div style={{ width: "26px", height: "26px", background: "#0f172a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>{nr}</div>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#374151", flex: 1, minWidth: "120px" }}>{aufgabe.titel}</span>

        {hasBeleg && (
          <div style={{ display: "flex", border: "1.5px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
            {[{ key: "beleg", label: "📄 Beleg" }, { key: "text", label: "📝 Geschäftsfall" }].map(opt => {
              const isActive = effectiveMode === opt.key;
              const isOverridden = localMode === opt.key;
              return (
                <button key={opt.key} onClick={() => setLocalMode(localMode === opt.key ? null : opt.key)}
                  title={isOverridden ? "Lokale Einstellung – klicken zum Zurücksetzen" : "Klicken zum Überschreiben"}
                  style={{ padding: "4px 11px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: isActive ? 700 : 500,
                    background: isActive ? "#0f172a" : "#fff", color: isActive ? (isOverridden ? "#f59e0b" : "#fff") : "#94a3b8", transition: "all 0.15s", position: "relative" }}>
                  {opt.label}
                  {isOverridden && <span style={{ position: "absolute", top: "2px", right: "3px", width: "5px", height: "5px", background: "#f59e0b", borderRadius: "50%" }} />}
                </button>
              );
            })}
          </div>
        )}

        {belegTyp && effectiveMode === "beleg" && <span style={{ fontSize: "11px", color: "#475569", background: "#e2e8f0", padding: "2px 8px", borderRadius: "20px", fontWeight: 600 }}>{BELEG_LABEL[belegTyp] || belegTyp}</span>}
        {isRechnung && <span style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 700, background: "#ede9fe", padding: "2px 8px", borderRadius: "20px" }}>Rechnung</span>}
        <div style={{ display: "flex", alignItems: "center", background: "#0f172a", color: "#f59e0b", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>
          {punkte} P{aufgabe.nrPunkte > 0 && !isRechnung && <span style={{ color: "#fde68a", fontSize: "10px", fontWeight: 600 }}> (+{aufgabe.nrPunkte} NR)</span>}
        </div>
        <button onClick={() => setOpen(!open)} style={{ ...S.btnSecondary, padding: "4px 10px", fontSize: "12px" }}>{open ? "▲" : "▼ Lösung"}</button>
      </div>

      <div style={{ padding: "16px" }}>
        <p style={{ margin: "0 0 12px", color: "#374151", fontWeight: 600, fontSize: "14px" }}>{aufgabeText}</p>

        {hasBeleg && (
          <div style={{ marginBottom: "12px" }}>
            {effectiveMode === "beleg" ? <BelegAnzeige beleg={aufgabe.beleg} /> : <GeschaeftsfallKarte text={geschaeftsfallText} />}
          </div>
        )}

        {(showLoesung || open) && (
          <div style={{ background: isRechnung ? "#faf5ff" : "#f0fdf4", border: `1px solid ${isRechnung ? "#ddd6fe" : "#bbf7d0"}`, borderRadius: "10px", padding: "14px 16px", marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
              {/* Ansicht-Toggle für Buchungslösungen */}
              {!isRechnung && aufgabe.soll && (
                <div style={{ display: "flex", border: "1.5px solid #bbf7d0", borderRadius: "8px", overflow: "hidden" }}>
                  {[{ key: "buchungssatz", label: "📒 Buchungssatz" }, { key: "tkonten", label: "📐 T-Konten" }].map(opt => (
                    <button key={opt.key} onClick={() => setLoesungsView(opt.key)}
                      style={{ padding: "4px 12px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: loesungsView === opt.key ? 700 : 500,
                        background: loesungsView === opt.key ? "#16a34a" : "#fff",
                        color: loesungsView === opt.key ? "#fff" : "#64748b" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {isRechnung && <span style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>✦ Lösung (Schema)</span>}
              <span style={{ fontSize: "12px", color: "#475569" }}>
                <strong>{punkte} P</strong>
                {!isRechnung && aufgabe.nrPunkte > 0 && <span style={{ color: "#92400e" }}> = {(aufgabe.soll?.length || 0) + (aufgabe.haben?.length || 0)} BS-P + {aufgabe.nrPunkte} NR-P</span>}
              </span>
            </div>
            <NebenrechnungBox nrs={aufgabe.nebenrechnungen} nrPunkte={aufgabe.nrPunkte} />
            {isRechnung && aufgabe.schema && <SchemaTabelle rows={aufgabe.schema} />}
            {!isRechnung && aufgabe.soll && (
              loesungsView === "buchungssatz"
                ? <BuchungsSatz soll={aufgabe.soll} haben={aufgabe.haben} />
                : <TKonten soll={aufgabe.soll} haben={aufgabe.haben} />
            )}
            <div style={{ marginTop: "10px", padding: "8px 12px", background: "#fff", borderRadius: "8px", border: `1px solid ${isRechnung ? "#ede9fe" : "#d1fae5"}`, fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
              💡 {renderMitTooltips(aufgabe.erklaerung)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PUNKTE-PANEL
// ══════════════════════════════════════════════════════════════════════════════
function PunktePanel({ aufgaben, typ }) {
  const [zeigTab, setZeigTab] = useState(false);
  const [strenge, setStrenge] = useState(0.5); // 0=locker, 1=streng, 0.5=ISB
  const gesamt = aufgaben.reduce((s, a) => s + berechnePunkte(a), 0);
  const g4pct = strenge <= 0.5
    ? NOTEN_ANKER.locker[3] + (NOTEN_ANKER.isb[3] - NOTEN_ANKER.locker[3]) * strenge * 2
    : NOTEN_ANKER.isb[3]    + (NOTEN_ANKER.streng[3] - NOTEN_ANKER.isb[3]) * (strenge - 0.5) * 2;
  const grenze4 = Math.round(gesamt * g4pct * 2) / 2;
  let einordnung = "";
  if (typ === "Prüfung") {
    if (gesamt <= 22) einordnung = "Stegreifaufgabe";
    else if (gesamt <= 32) einordnung = "Kurzarbeit";
    else if (gesamt <= 46) einordnung = "Schulaufgabe";
    else einordnung = "Umfangr. Schulaufgabe";
  }
  return (
    <div style={{ background: "#0f172a", borderRadius: "14px", padding: "20px 24px", marginBottom: "16px", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>ISB-Punkte-Auswertung · Bayern 2025</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "42px", fontWeight: 900, color: "#f59e0b", lineHeight: 1 }}>{gesamt}</span>
            <span style={{ fontSize: "18px", color: "#94a3b8" }}>Punkte</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "24px", fontWeight: 800, color: "#60a5fa" }}>~{gesamt} min</div><div style={{ fontSize: "11px", color: "#64748b" }}>Bearbeitungszeit</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "24px", fontWeight: 800, color: "#4ade80" }}>≥ {grenze4 % 1 === 0 ? grenze4 : grenze4.toFixed(1)} P</div><div style={{ fontSize: "11px", color: "#64748b" }}>Untergrenze Note 4</div></div>
          {einordnung && <div style={{ textAlign: "center" }}><div style={{ fontSize: "13px", fontWeight: 800, color: "#fbbf24", background: "#78350f33", border: "1px solid #78350f55", borderRadius: "8px", padding: "6px 12px" }}>{einordnung}</div></div>}
        </div>
      </div>
      <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        {(() => {
          const pills = [];
          let aufgNr = 0;
          aufgaben.forEach((a, i) => {
            if (a.taskTyp === "komplex" && a.schritte?.length) {
              aufgNr++;
              const labels = "abcdefghij";
              a.schritte.forEach((st, si) => {
                pills.push(
                  <div key={`${i}-${si}`} style={{ background: "#1e293b", border: "1px solid #f59e0b44", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", display: "flex", gap: "4px" }}>
                    <span style={{ color: "#f59e0b88", fontWeight: 700 }}>A{aufgNr}{labels[si]}</span>
                    <span style={{ color: "#f59e0b", fontWeight: 800 }}>{st.punkte}P</span>
                  </div>
                );
              });
            } else {
              aufgNr++;
              const p = berechnePunkte(a);
              pills.push(
                <div key={i} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", display: "flex", gap: "4px" }}>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>A{aufgNr}</span>
                  <span style={{ color: "#f59e0b", fontWeight: 800 }}>{p}P</span>
                </div>
              );
            }
          });
          return pills;
        })()}
        <div style={{ background: "#f59e0b", borderRadius: "8px", padding: "4px 12px", fontSize: "12px", color: "#0f172a", fontWeight: 800 }}>Σ {gesamt} P</div>
      </div>
      <button onClick={() => setZeigTab(!zeigTab)} style={{ marginTop: "10px", background: "transparent", border: "1px solid #334155", borderRadius: "6px", color: "#94a3b8", fontSize: "11px", padding: "4px 12px", cursor: "pointer" }}>
        {zeigTab ? "▲ Notenschlüssel" : "▼ Notenschlüssel"}
      </button>
      {zeigTab && (
        <div style={{ marginTop: "10px" }}>
          {/* ── Strenge-Regler ── */}
          <div style={{ marginBottom: "12px", background: "#1e293b", borderRadius: "10px", padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>🎓 Anforderungsniveau</span>
              <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 700 }}>
                Note 4 ab {Math.round(g4pct * 100)} %
                {Math.abs(strenge - 0.5) < 0.04 && <span style={{ color: "#64748b", marginLeft: "6px" }}>(ISB-Standard)</span>}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: 700, minWidth: "46px" }}>😊 locker</span>
              <div style={{ flex: 1, position: "relative" }}>
                <input type="range" min="0" max="100" value={Math.round(strenge * 100)}
                  onChange={e => setStrenge(Number(e.target.value) / 100)}
                  style={{ width: "100%", accentColor: "#f59e0b", cursor: "pointer", height: "6px" }} />
                {/* ISB-Marker */}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "3px", height: "14px", background: "#475569", borderRadius: "2px", pointerEvents: "none" }} />
              </div>
              <span style={{ fontSize: "12px", color: "#f87171", fontWeight: 700, minWidth: "46px", textAlign: "right" }}>😤 streng</span>
            </div>
            {Math.abs(strenge - 0.5) > 0.04 && (
              <button onClick={() => setStrenge(0.5)} style={{ marginTop: "6px", fontSize: "10px", color: "#64748b", background: "transparent", border: "1px solid #334155", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>
                ↺ ISB-Standard zurücksetzen
              </button>
            )}
          </div>
          {/* ── Noten-Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "4px" }}>
            {notenTabelle(gesamt, strenge).map(n => (
              <div key={n.note} style={{ background: n.farbe + "22", border: `1px solid ${n.farbe}44`, borderRadius: "8px", padding: "6px 4px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: 900, color: n.farbe }}>{n.note}</div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>{n.text}</div>
                <div style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 700 }}>{n.von % 1 === 0 ? n.von : n.von.toFixed(1)}–{n.bis % 1 === 0 ? n.bis : n.bis.toFixed(1)}P</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHRITT 1 — Konfiguration
// ══════════════════════════════════════════════════════════════════════════════
function SchrittTyp({ onWeiter, onBelegEditor, onEigeneBelege, initialConfig }) {
  // Wenn initialConfig gesetzt → Vorauswahl aus bestehendem config
  const ic = initialConfig;
  const [typ, setTyp] = useState(ic?.typ ?? null);
  const [pruefungsart, setPruefungsart] = useState(ic?.pruefungsart ?? null);
  const [klasse, setKlasse] = useState(ic?.klasse ?? null);
  const [datum, setDatum] = useState(ic?.datum ?? new Date().toISOString().split("T")[0]);
  const [punkteModus, setPunkteModus] = useState(ic?.maxPunkte ? "punkte" : "anzahl");
  const [anzahl, setAnzahl] = useState(ic?.anzahl ?? 5);
  const [maxPunkte, setMaxPunkte] = useState(ic?.maxPunkte ?? 30);
  // selectedThemen: aus config.selectedThemen (Array→Set) rekonstruieren
  const [selectedThemen, setSelectedThemen] = useState(() => {
    if (!ic?.selectedThemen) return {};
    return Object.fromEntries(
      Object.entries(ic.selectedThemen).map(([lb, ids]) => [lb, new Set(ids)])
    );
  });
  const [expandedLBs, setExpandedLBs] = useState(() => {
    if (!ic?.selectedThemen) return {};
    return Object.fromEntries(Object.keys(ic.selectedThemen).map(lb => [lb, true]));
  });
  const [werkstoffId, setWerkstoffId] = useState(ic?.werkstoffId ?? "rohstoffe");
  const [komplexOpts, setKomplexOpts] = useState(ic?.komplexOpts ?? {
    angebotsvergleich: false,
    kalkulation: false,
    ruecksendung: false,
    nachlass: false,
    anteilArt: "pct",       // "pct" | "euro"
    rueckPct: 20,
    nlPct: 5,
    rueckEuro: "",
    nlEuro: "",
    euroIsBrutto: false,
    skonto: true,
  });
  const [abschlussOpts, setAbschlussOpts] = useState({
    ara: true, rst: true, afa: true, ewb: false, ewbPct: 50, guv: true, kennzahlen: false,
  });
  const [forderungOpts, setForderungOpts] = useState({
    ewb: false,
    ewbPct: 50,
    ausgang: "totalausfall",   // "totalausfall" | "teilausfall" | "wiederzahlung"
    quotePct: 30,
  });
  const [verkaufOpts, setVerkaufOpts] = useState({
    vorkalkulation: false,
    ruecksendung: false,
    nachlass: false,
    anteilArt: "pct",
    rueckPct: 25,
    nlPct: 5,
    rueckEuro: "",
    nlEuro: "",
    euroIsBrutto: false,
    skonto: true,
  });

  const lernbereiche = klasse ? Object.keys(AUFGABEN_POOL[klasse]) : [];
  const activeLBs = Object.keys(selectedThemen).filter(lb => selectedThemen[lb].size > 0);
  const totalThemen = activeLBs.reduce((s, lb) => s + selectedThemen[lb].size, 0);

  // Estimate points: sum of all selected task types' average points
  const estPunkte = activeLBs.reduce((sum, lb) => {
    return sum + [...(selectedThemen[lb] || [])].reduce((s2, tid) => {
      const t = (AUFGABEN_POOL[klasse][lb] || []).find(x => x.id === tid);
      if (!t) return s2;
      const pts = t.taskTyp === "komplex" ? 16 : t.taskTyp === "rechnung" ? (t.nrPunkte || 3) : 2 + (t.nrPunkte || 0);
      return s2 + pts;
    }, 0);
  }, 0);

  function onKlasseChange(k) { setKlasse(k); setSelectedThemen({}); setExpandedLBs({}); }

  function toggleLB(lb) {
    setSelectedThemen(prev => {
      const next = { ...prev };
      next[lb] = (next[lb] && next[lb].size > 0) ? new Set() : new Set(AUFGABEN_POOL[klasse][lb].map(t => t.id));
      return next;
    });
    setExpandedLBs(prev => ({ ...prev, [lb]: true }));
  }

  function toggleThema(lb, id) {
    setSelectedThemen(prev => { const s = new Set(prev[lb] || []); s.has(id) ? s.delete(id) : s.add(id); return { ...prev, [lb]: s }; });
  }

  const PRUEFUNGSARTEN = [
    { id: "Schulaufgabe",    icon: "📝", info: "90–100 min · 30–50 P" },
    { id: "Stegreifaufgabe", icon: "⚡", info: "20 min · 10–15 P" },
    { id: "Kurzarbeit",      icon: "⏱️", info: "30–45 min · 15–25 P" },
    { id: "Test",            icon: "🔍", info: "45–60 min · 20–30 P" },
  ];

  const canProceed = typ && klasse && totalThemen > 0 && (typ === "Übung" || pruefungsart);

  return (
    <div style={S.card}>
      <div style={S.label}>Schritt 1 von 3</div>
      <div style={S.h2}>Aufgabe erstellen</div>

      {/* Modus: Übung oder Prüfung */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "20px", marginTop: "16px" }}>
        {["Übung", "Prüfung"].map(t => (
          <button key={t} onClick={() => { setTyp(t); if (t === "Übung") setPruefungsart(null); }}
            style={{ flex: 1, padding: "18px", border: "2px solid", cursor: "pointer", textAlign: "center", borderRadius: "12px",
              borderColor: typ === t ? "#0f172a" : "#e2e8f0", background: typ === t ? "#0f172a" : "#fff", color: typ === t ? "#fff" : "#475569" }}>
            <div style={{ fontSize: "26px", marginBottom: "6px" }}>{t === "Übung" ? "📝" : "📋"}</div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>{t}</div>
          </button>
        ))}
      </div>

      {/* Beleg-Werkzeuge */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={onBelegEditor}
          style={{ flex: 1, padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: "#374151", fontWeight: 700, fontSize: "13px" }}>
          <span style={{ fontSize: "18px" }}>✏️</span>
          <span>Beleg-Editor</span>
          <span style={{ marginLeft: "auto", fontSize: "10px", color: "#94a3b8", fontWeight: 500 }}>Beleg erstellen</span>
        </button>
        <button onClick={onEigeneBelege}
          style={{ flex: 1, padding: "11px 14px", border: "1.5px solid #fde68a", borderRadius: "10px", background: "#fffbeb", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: "#374151", fontWeight: 700, fontSize: "13px" }}>
          <span style={{ fontSize: "18px" }}>📂</span>
          <span>Eigene Belege</span>
          <span style={{ marginLeft: "auto", fontSize: "10px", color: "#92400e", fontWeight: 500 }}>Aufgabe aus Beleg</span>
        </button>
      </div>

      {/* Prüfungsart — nur bei Prüfung */}
      {typ === "Prüfung" && (
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>Art der Prüfung</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {PRUEFUNGSARTEN.map(pa => (
              <button key={pa.id} onClick={() => setPruefungsart(pa.id)}
                style={{ padding: "10px 14px", border: "2px solid", borderRadius: "10px", cursor: "pointer", textAlign: "left",
                  borderColor: pruefungsart === pa.id ? "#0f172a" : "#e2e8f0",
                  background: pruefungsart === pa.id ? "#0f172a" : "#fff",
                  color: pruefungsart === pa.id ? "#fff" : "#374151" }}>
                <span style={{ fontSize: "18px", marginRight: "8px" }}>{pa.icon}</span>
                <span style={{ fontWeight: 700, fontSize: "14px" }}>{pa.id}</span>
                <div style={{ fontSize: "11px", marginTop: "3px", color: pruefungsart === pa.id ? "#94a3b8" : "#9ca3af" }}>{pa.info}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {typ && (<>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px", alignItems: "start", marginBottom: "20px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Datum</label>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={{ ...S.input, width: "170px" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>Jahrgangsstufe</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[7, 8, 9, 10].map(k => (
                <button key={k} onClick={() => onKlasseChange(k)} style={{ padding: "10px 18px", border: "2px solid", borderRadius: "10px", cursor: "pointer",
                  borderColor: klasse === k ? "#0f172a" : "#e2e8f0", background: klasse === k ? "#0f172a" : "#fff",
                  color: klasse === k ? "#fff" : "#475569", fontWeight: 700, fontSize: "17px" }}>{k}</button>
              ))}
            </div>
          </div>
        </div>

        {klasse && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Lernbereiche & Themen <span style={{ fontWeight: 400, color: "#94a3b8" }}>— Mehrfachauswahl</span></label>
              {totalThemen > 0 && <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 700, background: "#0f172a", padding: "2px 10px", borderRadius: "20px" }}>{totalThemen} Thema{totalThemen === 1 ? "" : "en"}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {lernbereiche.map(lb => {
                const meta = LB_INFO[lb] || { icon: "📌", farbe: "#475569" };
                const tasks = AUFGABEN_POOL[klasse][lb];
                const selSet = selectedThemen[lb] || new Set();
                const isActive = selSet.size > 0;
                const isExpanded = expandedLBs[lb];
                return (
                  <div key={lb} style={{ border: `2px solid ${isActive ? meta.farbe : "#e2e8f0"}`, borderRadius: "10px", overflow: "hidden", background: isActive ? meta.farbe + "08" : "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", cursor: "pointer" }} onClick={() => toggleLB(lb)}>
                      <div style={{ width: "18px", height: "18px", borderRadius: "5px", border: `2px solid ${isActive ? meta.farbe : "#cbd5e1"}`, background: isActive ? meta.farbe : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isActive && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                      </div>
                      <span style={{ fontSize: "16px" }}>{meta.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: isActive ? meta.farbe : "#374151", flex: 1 }}>{lb}</span>
                      {isActive && <span style={{ fontSize: "11px", color: meta.farbe, fontWeight: 700, background: meta.farbe + "18", padding: "1px 8px", borderRadius: "12px" }}>{selSet.size}/{tasks.length}</span>}
                      <button onClick={e => { e.stopPropagation(); setExpandedLBs(p => ({ ...p, [lb]: !p[lb] })); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "2px 6px" }}>{isExpanded ? "▲" : "▼"}</button>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${meta.farbe}33`, padding: "10px 14px", background: "#fff" }}>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                          <button onClick={() => setSelectedThemen(p => ({ ...p, [lb]: new Set(tasks.map(t => t.id)) }))} style={{ fontSize: "11px", fontWeight: 700, color: meta.farbe, background: meta.farbe + "18", border: `1px solid ${meta.farbe}44`, borderRadius: "5px", padding: "2px 8px", cursor: "pointer" }}>✓ Alle</button>
                          <button onClick={() => setSelectedThemen(p => ({ ...p, [lb]: new Set() }))} style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "5px", padding: "2px 8px", cursor: "pointer" }}>✗ Keine</button>
                        </div>

                        {/* ── Werkstoff-Auswahl direkt in LB 2 ── */}
                        {lb.includes("Werkstoffe") && (
                          <div style={{ background: "#fffbeb", border: "1.5px solid #fbbf24", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", marginBottom: "7px" }}>📦 Werkstoff-Typ</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {WERKSTOFF_TYPEN.map(wt => (
                                <button key={wt.id} onClick={() => setWerkstoffId(wt.id)}
                                  style={{ padding: "4px 11px", borderRadius: "16px", border: "1.5px solid " + (werkstoffId === wt.id ? "#d97706" : "#e5e7eb"),
                                    background: werkstoffId === wt.id ? "#fef3c7" : "#fff",
                                    color: werkstoffId === wt.id ? "#92400e" : "#374151",
                                    fontWeight: werkstoffId === wt.id ? 700 : 400, cursor: "pointer", fontSize: "12px" }}>
                                  {wt.icon} {wt.label}
                                  <span style={{ fontSize: "10px", marginLeft: "5px", color: "#6b7280" }}>(<KürzelSpan nr={wt.aw.nr} style={{ fontSize: "10px", color: "#6b7280" }} />)</span>
                                </button>
                              ))}
                            </div>
                            <div style={{ fontSize: "10px", color: "#78350f", marginTop: "6px" }}>
                              Einkauf → <strong>{WERKSTOFF_TYPEN.find(w=>w.id===werkstoffId)?.aw.nr} <KürzelSpan nr={WERKSTOFF_TYPEN.find(w=>w.id===werkstoffId)?.aw.nr} style={{ fontWeight:700, fontSize:"10px", color:"#78350f" }} /></strong> &nbsp;|&nbsp;
                              Nachlass/Skonto → <strong>{WERKSTOFF_TYPEN.find(w=>w.id===werkstoffId)?.nl.nr} <KürzelSpan nr={WERKSTOFF_TYPEN.find(w=>w.id===werkstoffId)?.nl.nr} style={{ fontWeight:700, fontSize:"10px", color:"#78350f" }} /></strong>
                            </div>
                          </div>
                        )}
                        {tasks.map(task => {
                          const checked = selSet.has(task.id);
                          const isKomplexEK = task.id === "8_komplex_einkauf_kette";
                          const isKomplexVK = task.id === "8_komplex_verkauf_kette";
                          const isKomplexFO  = task.id === "9_komplex_forderungskette";
                          const isKomplexABS = task.id === "10_komplex_abschlusskette";
                          const showConfig = (isKomplexEK || isKomplexVK || isKomplexFO || isKomplexABS) && checked;
                          const hasAnteil = isKomplexVK
                            ? (verkaufOpts.ruecksendung || verkaufOpts.nachlass)
                            : (komplexOpts.ruecksendung || komplexOpts.nachlass);
                          return (
                            <div key={task.id} style={{ marginBottom: "2px" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "5px 6px", borderRadius: "6px", background: checked ? meta.farbe + "10" : "transparent", border: `1px solid ${checked ? meta.farbe + "44" : "transparent"}` }}>
                                <div onClick={() => toggleThema(lb, task.id)} style={{ width: "14px", height: "14px", borderRadius: "3px", border: `2px solid ${checked ? meta.farbe : "#cbd5e1"}`, background: checked ? meta.farbe : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  {checked && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
                                </div>
                                <span onClick={() => toggleThema(lb, task.id)} style={{ fontSize: "13px", color: checked ? "#0f172a" : "#64748b", fontWeight: checked ? 600 : 400, flex: 1 }}>{task.titel}</span>
                                {task.taskTyp === "rechnung" && <span style={{ fontSize: "10px", color: "#7c3aed", background: "#ede9fe", padding: "1px 5px", borderRadius: "8px", fontWeight: 700 }}>Rechnung</span>}
                                {task.taskTyp === "komplex" && <span style={{ fontSize: "10px", color: "#f59e0b", background: "#fffbeb", border: "1px solid #fde68a", padding: "1px 5px", borderRadius: "8px", fontWeight: 700 }}>Kette</span>}
                              </label>

                              {/* ── Inline-Konfiguratoren ── */}
                              {showConfig && isKomplexEK && (
                                <div style={{ margin: "4px 0 6px 22px", background: "#f0f9ff", border: "1.5px solid #38bdf8", borderRadius: "10px", padding: "12px 14px" }}>
                                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#0c4a6e", marginBottom: "10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>⚙️ Einkauf-Kette konfigurieren</div>

                                  {/* Schrittfolge-Vorschau */}
                                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px", marginBottom: "10px", fontSize: "11px" }}>
                                    {(komplexOpts.kalkulation || komplexOpts.angebotsvergleich) && <>
                                      <span style={{ background: "#0f172a", color: "#f59e0b", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>
                                        {komplexOpts.angebotsvergleich ? "📊 Angebotsvergleich" : "📊 Kalkulation"}
                                      </span>
                                      <span style={{ color: "#94a3b8" }}>→</span>
                                    </>}
                                    <span style={{ background: "#1e293b", color: "#fff", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>📄 Einkauf</span>
                                    {komplexOpts.ruecksendung && <><span style={{ color: "#94a3b8" }}>→</span><span style={{ background: "#fef3c7", color: "#92400e", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>↩️ Rücksendung</span></>}
                                    {komplexOpts.nachlass && <><span style={{ color: "#94a3b8" }}>→</span><span style={{ background: "#fef3c7", color: "#92400e", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>💸 Nachlass</span></>}
                                    <span style={{ color: "#94a3b8" }}>→</span>
                                    <span style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>🏦 {komplexOpts.skonto ? "Zahlung+Skonto" : "Zahlung"}</span>
                                  </div>

                                  {/* Schritt 1: Kalkulation */}
                                  <div style={{ marginBottom: "8px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Schritt 1 – Kalkulation</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                      {[["none","Keine"],["kalkulation","Einfache Kalkulation"],["angebotsvergleich","Angebotsvergleich (2 Angebote)"]].map(([v, l]) => {
                                        const active = v === "none" ? !komplexOpts.kalkulation && !komplexOpts.angebotsvergleich : !!komplexOpts[v];
                                        return (
                                          <button key={v} onClick={() => setKomplexOpts(o => ({ ...o, kalkulation: v === "kalkulation", angebotsvergleich: v === "angebotsvergleich" }))}
                                            style={{ padding: "4px 10px", borderRadius: "14px", cursor: "pointer", fontSize: "11px", fontWeight: active ? 700 : 400,
                                              border: "1.5px solid " + (active ? "#0ea5e9" : "#e5e7eb"),
                                              background: active ? "#e0f2fe" : "#fff", color: active ? "#0c4a6e" : "#64748b" }}>
                                            {l}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {(komplexOpts.kalkulation || komplexOpts.angebotsvergleich) && (
                                      <div style={{ fontSize: "10px", color: "#0369a1", marginTop: "4px" }}>⚠️ Buchungsbasis = <strong>Zieleinkaufspreis</strong></div>
                                    )}
                                  </div>

                                  {/* Zwischenschritte */}
                                  <div style={{ marginBottom: "8px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Zwischenschritte (optional)</div>
                                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                      {[["ruecksendung","↩️ Rücksendung"],["nachlass","💸 Nachlass"]].map(([k, l]) => (
                                        <label key={k} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: komplexOpts[k] ? 700 : 400,
                                          padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (komplexOpts[k] ? "#f59e0b" : "#e5e7eb"),
                                          background: komplexOpts[k] ? "#fffbeb" : "#fff", color: komplexOpts[k] ? "#92400e" : "#64748b" }}>
                                          <input type="checkbox" checked={!!komplexOpts[k]} onChange={e => setKomplexOpts(o => ({ ...o, [k]: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                          {l}
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Anteilsangabe */}
                                  {hasAnteil && (
                                    <div style={{ marginBottom: "8px" }}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Anteilsangabe</div>

                                      {/* Einheit wählen */}
                                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                                        {[["pct","in %"],["euro","in €"]].map(([v, l]) => (
                                          <button key={v} onClick={() => setKomplexOpts(o => ({ ...o, anteilArt: v }))}
                                            style={{ padding: "3px 9px", borderRadius: "12px", cursor: "pointer", fontSize: "11px", fontWeight: komplexOpts.anteilArt === v ? 700 : 400,
                                              border: "1.5px solid " + (komplexOpts.anteilArt === v ? "#0ea5e9" : "#e5e7eb"),
                                              background: komplexOpts.anteilArt === v ? "#e0f2fe" : "#fff", color: komplexOpts.anteilArt === v ? "#0c4a6e" : "#64748b" }}>
                                            {l}
                                          </button>
                                        ))}
                                      </div>

                                      {/* Betragseingabe bei % */}
                                      {komplexOpts.anteilArt === "pct" && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                          {komplexOpts.ruecksendung && (
                                            <label style={{ fontSize: "11px", color: "#374151", display: "flex", alignItems: "center", gap: "5px" }}>
                                              ↩️ Rücksendung
                                              <input type="number" min="1" max="99" value={komplexOpts.rueckPct}
                                                onChange={e => setKomplexOpts(o => ({ ...o, rueckPct: Math.min(99, Math.max(1, parseInt(e.target.value)||20)) }))}
                                                style={{ width: "52px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right" }} />
                                              <span style={{ fontSize: "11px", color: "#6b7280" }}>%</span>
                                            </label>
                                          )}
                                          {komplexOpts.nachlass && (
                                            <label style={{ fontSize: "11px", color: "#374151", display: "flex", alignItems: "center", gap: "5px" }}>
                                              💸 Nachlass
                                              <input type="number" min="1" max="50" value={komplexOpts.nlPct}
                                                onChange={e => setKomplexOpts(o => ({ ...o, nlPct: Math.min(50, Math.max(1, parseInt(e.target.value)||5)) }))}
                                                style={{ width: "52px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right" }} />
                                              <span style={{ fontSize: "11px", color: "#6b7280" }}>%</span>
                                            </label>
                                          )}
                                        </div>
                                      )}

                                      {/* Betragseingabe bei € */}
                                      {komplexOpts.anteilArt === "euro" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                          {komplexOpts.ruecksendung && (
                                            <label style={{ fontSize: "11px", color: "#374151", display: "flex", alignItems: "center", gap: "5px" }}>
                                              ↩️ Rücksendung
                                              <input type="number" min="0" step="0.01" value={komplexOpts.rueckEuro}
                                                placeholder="Betrag"
                                                onChange={e => setKomplexOpts(o => ({ ...o, rueckEuro: e.target.value }))}
                                                style={{ width: "90px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px" }} />
                                              <span style={{ fontSize: "11px", color: "#6b7280" }}>€</span>
                                            </label>
                                          )}
                                          {komplexOpts.nachlass && (
                                            <label style={{ fontSize: "11px", color: "#374151", display: "flex", alignItems: "center", gap: "5px" }}>
                                              💸 Nachlass
                                              <input type="number" min="0" step="0.01" value={komplexOpts.nlEuro}
                                                placeholder="Betrag"
                                                onChange={e => setKomplexOpts(o => ({ ...o, nlEuro: e.target.value }))}
                                                style={{ width: "90px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px" }} />
                                              <span style={{ fontSize: "11px", color: "#6b7280" }}>€</span>
                                            </label>
                                          )}
                                          {/* Brutto/Netto Toggle */}
                                          <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                                            {[["netto","Netto (ohne USt)"],["brutto","Brutto (inkl. USt)"]].map(([v, l]) => {
                                              const isBrutto = v === "brutto";
                                              const active = komplexOpts.euroIsBrutto === isBrutto;
                                              return (
                                                <button key={v} onClick={() => setKomplexOpts(o => ({ ...o, euroIsBrutto: isBrutto }))}
                                                  style={{ padding: "3px 9px", borderRadius: "10px", cursor: "pointer", fontSize: "11px", fontWeight: active ? 700 : 400,
                                                    border: "1.5px solid " + (active ? "#0ea5e9" : "#e5e7eb"),
                                                    background: active ? "#e0f2fe" : "#fff", color: active ? "#0c4a6e" : "#64748b" }}>
                                                  {l}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Zahlung */}
                                  <div>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Zahlung</div>
                                    <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: komplexOpts.skonto ? 700 : 400,
                                      padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (komplexOpts.skonto ? "#22c55e" : "#e5e7eb"),
                                      background: komplexOpts.skonto ? "#f0fdf4" : "#fff", color: komplexOpts.skonto ? "#15803d" : "#64748b" }}>
                                      <input type="checkbox" checked={!!komplexOpts.skonto} onChange={e => setKomplexOpts(o => ({ ...o, skonto: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                      Mit Skonto
                                    </label>
                                  </div>
                                </div>
                              )}

                              {/* ── Inline-Konfigurator Verkauf-Kette ── */}
                              {showConfig && isKomplexVK && (() => {
                                const vHasAnteil = verkaufOpts.ruecksendung || verkaufOpts.nachlass;
                                return (
                                  <div style={{ margin: "4px 0 6px 22px", background: "#fdf4ff", border: "1.5px solid #c084fc", borderRadius: "10px", padding: "12px 14px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#581c87", marginBottom: "10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>⚙️ Verkauf-Kette konfigurieren</div>

                                    {/* Schrittfolge-Vorschau */}
                                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px", marginBottom: "10px", fontSize: "11px" }}>
                                      {verkaufOpts.vorkalkulation && <>
                                        <span style={{ background: "#581c87", color: "#e9d5ff", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>📊 Vorkalkulation</span>
                                        <span style={{ color: "#94a3b8" }}>→</span>
                                      </>}
                                      <span style={{ background: "#1e293b", color: "#fff", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>🧾 Verkauf</span>
                                      {verkaufOpts.ruecksendung && <><span style={{ color: "#94a3b8" }}>→</span><span style={{ background: "#fef3c7", color: "#92400e", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>↩️ Rücksendung</span></>}
                                      {verkaufOpts.nachlass && <><span style={{ color: "#94a3b8" }}>→</span><span style={{ background: "#fef3c7", color: "#92400e", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>💸 Nachlass</span></>}
                                      <span style={{ color: "#94a3b8" }}>→</span>
                                      <span style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>🏦 {verkaufOpts.skonto ? "Zahlungseingang + Skonto" : "Zahlungseingang"}</span>
                                    </div>

                                    {/* Schritt 0: Vorkalkulation */}
                                    <div style={{ marginBottom: "8px" }}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Vorschritt – Kalkulation</div>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: verkaufOpts.vorkalkulation ? 700 : 400,
                                        padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (verkaufOpts.vorkalkulation ? "#9333ea" : "#e5e7eb"),
                                        background: verkaufOpts.vorkalkulation ? "#f3e8ff" : "#fff", color: verkaufOpts.vorkalkulation ? "#581c87" : "#64748b" }}>
                                        <input type="checkbox" checked={!!verkaufOpts.vorkalkulation} onChange={e => setVerkaufOpts(o => ({ ...o, vorkalkulation: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                        📊 Verkaufskalkulation (EKP → Aufschlag → VKP)
                                      </label>
                                      {verkaufOpts.vorkalkulation && (
                                        <div style={{ fontSize: "10px", color: "#7e22ce", marginTop: "4px" }}>⚠️ Buchungsbasis = <strong>Zielverkaufspreis (ZVP)</strong></div>
                                      )}
                                    </div>

                                    {/* Zwischenschritte */}
                                    <div style={{ marginBottom: "8px" }}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Zwischenschritte (optional)</div>
                                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                        {[["ruecksendung","↩️ Rücksendung"],["nachlass","💸 Nachlass"]].map(([k, l]) => (
                                          <label key={k} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: verkaufOpts[k] ? 700 : 400,
                                            padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (verkaufOpts[k] ? "#f59e0b" : "#e5e7eb"),
                                            background: verkaufOpts[k] ? "#fffbeb" : "#fff", color: verkaufOpts[k] ? "#92400e" : "#64748b" }}>
                                            <input type="checkbox" checked={!!verkaufOpts[k]} onChange={e => setVerkaufOpts(o => ({ ...o, [k]: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                            {l}
                                          </label>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Anteilsangabe */}
                                    {vHasAnteil && (
                                      <div style={{ marginBottom: "8px" }}>
                                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Anteilsangabe</div>
                                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                                          {[["pct","in %"],["euro","in €"]].map(([v, l]) => (
                                            <button key={v} onClick={() => setVerkaufOpts(o => ({ ...o, anteilArt: v }))}
                                              style={{ padding: "3px 9px", borderRadius: "12px", cursor: "pointer", fontSize: "11px", fontWeight: verkaufOpts.anteilArt === v ? 700 : 400,
                                                border: "1.5px solid " + (verkaufOpts.anteilArt === v ? "#9333ea" : "#e5e7eb"),
                                                background: verkaufOpts.anteilArt === v ? "#f3e8ff" : "#fff", color: verkaufOpts.anteilArt === v ? "#581c87" : "#64748b" }}>
                                              {l}
                                            </button>
                                          ))}
                                        </div>
                                        {verkaufOpts.anteilArt === "pct" && (
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                            {verkaufOpts.ruecksendung && (
                                              <label style={{ fontSize: "11px", color: "#374151", display: "flex", alignItems: "center", gap: "5px" }}>
                                                ↩️ Rücksendung
                                                <input type="number" min="1" max="99" value={verkaufOpts.rueckPct}
                                                  onChange={e => setVerkaufOpts(o => ({ ...o, rueckPct: Math.min(99, Math.max(1, parseInt(e.target.value)||25)) }))}
                                                  style={{ width: "52px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right" }} />
                                                <span style={{ fontSize: "11px", color: "#6b7280" }}>%</span>
                                              </label>
                                            )}
                                            {verkaufOpts.nachlass && (
                                              <label style={{ fontSize: "11px", color: "#374151", display: "flex", alignItems: "center", gap: "5px" }}>
                                                💸 Nachlass
                                                <input type="number" min="1" max="50" value={verkaufOpts.nlPct}
                                                  onChange={e => setVerkaufOpts(o => ({ ...o, nlPct: Math.min(50, Math.max(1, parseInt(e.target.value)||5)) }))}
                                                  style={{ width: "52px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right" }} />
                                                <span style={{ fontSize: "11px", color: "#6b7280" }}>%</span>
                                              </label>
                                            )}
                                          </div>
                                        )}
                                        {verkaufOpts.anteilArt === "euro" && (
                                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            {verkaufOpts.ruecksendung && (
                                              <label style={{ fontSize: "11px", color: "#374151", display: "flex", alignItems: "center", gap: "5px" }}>
                                                ↩️ Rücksendung
                                                <input type="number" min="0" step="0.01" value={verkaufOpts.rueckEuro} placeholder="Betrag"
                                                  onChange={e => setVerkaufOpts(o => ({ ...o, rueckEuro: e.target.value }))}
                                                  style={{ width: "90px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px" }} />
                                                <span style={{ fontSize: "11px", color: "#6b7280" }}>€</span>
                                              </label>
                                            )}
                                            {verkaufOpts.nachlass && (
                                              <label style={{ fontSize: "11px", color: "#374151", display: "flex", alignItems: "center", gap: "5px" }}>
                                                💸 Nachlass
                                                <input type="number" min="0" step="0.01" value={verkaufOpts.nlEuro} placeholder="Betrag"
                                                  onChange={e => setVerkaufOpts(o => ({ ...o, nlEuro: e.target.value }))}
                                                  style={{ width: "90px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px" }} />
                                                <span style={{ fontSize: "11px", color: "#6b7280" }}>€</span>
                                              </label>
                                            )}
                                            <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                                              {[["netto","Netto (ohne USt)"],["brutto","Brutto (inkl. USt)"]].map(([v, l]) => {
                                                const isBrutto = v === "brutto";
                                                const active = verkaufOpts.euroIsBrutto === isBrutto;
                                                return (
                                                  <button key={v} onClick={() => setVerkaufOpts(o => ({ ...o, euroIsBrutto: isBrutto }))}
                                                    style={{ padding: "3px 9px", borderRadius: "10px", cursor: "pointer", fontSize: "11px", fontWeight: active ? 700 : 400,
                                                      border: "1.5px solid " + (active ? "#9333ea" : "#e5e7eb"),
                                                      background: active ? "#f3e8ff" : "#fff", color: active ? "#581c87" : "#64748b" }}>
                                                    {l}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Zahlung */}
                                    <div>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Zahlung</div>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", fontWeight: verkaufOpts.skonto ? 700 : 400,
                                        padding: "4px 10px", borderRadius: "14px", border: "1.5px solid " + (verkaufOpts.skonto ? "#22c55e" : "#e5e7eb"),
                                        background: verkaufOpts.skonto ? "#f0fdf4" : "#fff", color: verkaufOpts.skonto ? "#15803d" : "#64748b" }}>
                                        <input type="checkbox" checked={!!verkaufOpts.skonto} onChange={e => setVerkaufOpts(o => ({ ...o, skonto: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                        Mit Skonto
                                      </label>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* ── Inline-Konfigurator Forderungskette ── */}
                              {showConfig && isKomplexFO && (() => {
                                const ausgangLabels = {
                                  totalausfall: "💀 Totalausfall",
                                  teilausfall:  "⚠️ Teilausfall",
                                  wiederzahlung: "✅ Wiederzahlung",
                                };
                                return (
                                  <div style={{ margin: "4px 0 6px 22px", background: "#fff1f2", border: "1.5px solid #f87171", borderRadius: "10px", padding: "12px 14px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#7f1d1d", marginBottom: "10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>⚙️ Forderungskette konfigurieren</div>

                                    {/* Schrittfolge-Vorschau */}
                                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px", marginBottom: "10px", fontSize: "11px" }}>
                                      <span style={{ background: "#1e293b", color: "#fff", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>🧾 Verkauf</span>
                                      <span style={{ color: "#94a3b8" }}>→</span>
                                      <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>⚠️ Umbuchung ZWFO</span>
                                      {forderungOpts.ewb && <>
                                        <span style={{ color: "#94a3b8" }}>→</span>
                                        <span style={{ background: "#ede9fe", color: "#4c1d95", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>📉 EWB {forderungOpts.ewbPct} %</span>
                                      </>}
                                      <span style={{ color: "#94a3b8" }}>→</span>
                                      <span style={{ background: "#fee2e2", color: "#7f1d1d", borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>
                                        {ausgangLabels[forderungOpts.ausgang]}
                                      </span>
                                    </div>

                                    {/* EWB */}
                                    <div style={{ marginBottom: "8px" }}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Jahresabschluss (optional)</div>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px",
                                        fontWeight: forderungOpts.ewb ? 700 : 400,
                                        padding: "4px 10px", borderRadius: "14px",
                                        border: "1.5px solid " + (forderungOpts.ewb ? "#8b5cf6" : "#e5e7eb"),
                                        background: forderungOpts.ewb ? "#ede9fe" : "#fff",
                                        color: forderungOpts.ewb ? "#4c1d95" : "#64748b" }}>
                                        <input type="checkbox" checked={!!forderungOpts.ewb} onChange={e => setForderungOpts(o => ({ ...o, ewb: e.target.checked }))} style={{ width: "12px", height: "12px" }} />
                                        📉 EWB bilden am Jahresende
                                      </label>
                                      {forderungOpts.ewb && (
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#374151", marginLeft: "10px", marginTop: "6px" }}>
                                          Geschätzter Ausfall
                                          <input type="number" min="10" max="90" step="10" value={forderungOpts.ewbPct}
                                            onChange={e => setForderungOpts(o => ({ ...o, ewbPct: Math.min(90, Math.max(10, parseInt(e.target.value)||50)) }))}
                                            style={{ width: "52px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right" }} />
                                          <span style={{ fontSize: "11px", color: "#6b7280" }}>%</span>
                                        </label>
                                      )}
                                    </div>

                                    {/* Ausgang */}
                                    <div style={{ marginBottom: "8px" }}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>Ausgang</div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                        {Object.entries(ausgangLabels).map(([v, l]) => (
                                          <button key={v} onClick={() => setForderungOpts(o => ({ ...o, ausgang: v }))}
                                            style={{ padding: "4px 10px", borderRadius: "14px", cursor: "pointer", fontSize: "11px",
                                              fontWeight: forderungOpts.ausgang === v ? 700 : 400,
                                              border: "1.5px solid " + (forderungOpts.ausgang === v ? "#ef4444" : "#e5e7eb"),
                                              background: forderungOpts.ausgang === v ? "#fee2e2" : "#fff",
                                              color: forderungOpts.ausgang === v ? "#7f1d1d" : "#64748b" }}>
                                            {l}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Quote bei Teilausfall */}
                                    {forderungOpts.ausgang === "teilausfall" && (
                                      <div>
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#374151" }}>
                                          Insolvenzquote
                                          <input type="number" min="10" max="80" step="10" value={forderungOpts.quotePct}
                                            onChange={e => setForderungOpts(o => ({ ...o, quotePct: Math.min(80, Math.max(10, parseInt(e.target.value)||30)) }))}
                                            style={{ width: "52px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right" }} />
                                          <span style={{ fontSize: "11px", color: "#6b7280" }}>%</span>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* ── Inline-Konfigurator Abschluss-Kette ── */}
                              {showConfig && isKomplexABS && (() => {
                                const schrittBadges = [
                                  { key: "ara",        label: "📅 ARA",       color: "#7c3aed", bg: "#ede9fe" },
                                  { key: "rst",        label: "⚠️ RST",        color: "#b45309", bg: "#fef3c7" },
                                  { key: "afa",        label: "📉 AfA",        color: "#0369a1", bg: "#e0f2fe" },
                                  { key: "ewb",        label: "🔴 EWB",        color: "#b91c1c", bg: "#fee2e2" },
                                  { key: "guv",        label: "📊 GuV",        color: "#065f46", bg: "#d1fae5" },
                                  { key: "kennzahlen", label: "🔢 Kennzahlen", color: "#4338ca", bg: "#eef2ff" },
                                ];
                                return (
                                  <div style={{ margin: "4px 0 6px 22px", background: "#f5f3ff", border: "1.5px solid #7c3aed", borderRadius: "10px", padding: "12px 14px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#3b0764", marginBottom: "10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>⚙️ Abschluss-Kette konfigurieren</div>

                                    {/* Schrittfolge-Vorschau */}
                                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px", marginBottom: "10px", fontSize: "11px" }}>
                                      {schrittBadges.filter(b => abschlussOpts[b.key]).map((b, i, arr) => (
                                        <React.Fragment key={b.key}>
                                          <span style={{ background: b.bg, color: b.color, borderRadius: "6px", padding: "2px 7px", fontWeight: 700 }}>{b.label}</span>
                                          {i < arr.length - 1 && <span style={{ color: "#94a3b8" }}>→</span>}
                                        </React.Fragment>
                                      ))}
                                      {!schrittBadges.some(b => abschlussOpts[b.key]) && <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Keine Schritte aktiv</span>}
                                    </div>

                                    {/* Toggle-Buttons */}
                                    <div style={{ marginBottom: "8px" }}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "5px" }}>Enthaltene Schritte</div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                        {schrittBadges.map(b => (
                                          <label key={b.key} style={{
                                            display: "inline-flex", alignItems: "center", gap: "5px",
                                            cursor: "pointer", fontSize: "11px",
                                            fontWeight: abschlussOpts[b.key] ? 700 : 400,
                                            padding: "4px 10px", borderRadius: "14px",
                                            border: "1.5px solid " + (abschlussOpts[b.key] ? b.color : "#e5e7eb"),
                                            background: abschlussOpts[b.key] ? b.bg : "#fff",
                                            color: abschlussOpts[b.key] ? b.color : "#64748b",
                                            userSelect: "none",
                                          }}>
                                            <input type="checkbox"
                                              checked={!!abschlussOpts[b.key]}
                                              onChange={e => setAbschlussOpts(o => ({ ...o, [b.key]: e.target.checked }))}
                                              style={{ width: "12px", height: "12px" }} />
                                            {b.label}
                                          </label>
                                        ))}
                                      </div>
                                    </div>

                                    {/* EWB-Prozentsatz */}
                                    {abschlussOpts.ewb && (
                                      <div>
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#374151" }}>
                                          Geschätzter Ausfall (EWB)
                                          <input type="number" min="10" max="90" step="10"
                                            value={abschlussOpts.ewbPct}
                                            onChange={e => setAbschlussOpts(o => ({ ...o, ewbPct: Math.min(90, Math.max(10, parseInt(e.target.value)||50)) }))}
                                            style={{ width: "52px", padding: "3px 6px", border: "1.5px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textAlign: "right" }} />
                                          <span style={{ fontSize: "11px", color: "#6b7280" }}>%</span>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Anzahl / Punktziel */}
        {totalThemen > 0 && (
          <div style={{ marginBottom: "20px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            {/* Modus-Toggle */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              {[["anzahl","🔢 Anzahl Aufgaben"],["punkte","🎯 Punktziel"]].map(([m, label]) => (
                <button key={m} onClick={() => setPunkteModus(m)} style={{
                  padding: "6px 16px", borderRadius: "8px", border: "2px solid",
                  borderColor: punkteModus === m ? "#0f172a" : "#e2e8f0",
                  background: punkteModus === m ? "#0f172a" : "#fff",
                  color: punkteModus === m ? "#fff" : "#64748b",
                  fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>{label}</button>
              ))}
            </div>

            {punkteModus === "anzahl" ? (
              <>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Anzahl Aufgaben: <span style={{ color: "#f59e0b", fontWeight: 800 }}>{anzahl}</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "8px" }}>≈ {anzahl * 2}–{anzahl * 4} Punkte</span>
                </label>
                <input type="range" min="1" max="20" value={anzahl} onChange={e => setAnzahl(Number(e.target.value))} style={{ width: "100%", accentColor: "#0f172a" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}><span>1</span><span>5</span><span>10</span><span>15</span><span>20</span></div>
              </>
            ) : (
              <>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>
                  Maximale Punkte: <span style={{ color: "#f59e0b", fontWeight: 800 }}>{maxPunkte} P</span>
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <input type="number" min="5" max="100" value={maxPunkte} onChange={e => setMaxPunkte(Number(e.target.value))}
                    style={{ ...S.input, width: "90px", textAlign: "center", fontWeight: 700, fontSize: "16px" }} />
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[10,20,30,40,50].map(p => (
                      <button key={p} onClick={() => setMaxPunkte(p)} style={{ padding: "5px 10px", borderRadius: "6px", border: "1.5px solid", borderColor: maxPunkte === p ? "#0f172a" : "#e2e8f0", background: maxPunkte === p ? "#0f172a" : "#fff", color: maxPunkte === p ? "#fff" : "#64748b", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>{p}</button>
                    ))}
                  </div>
                </div>
                {/* Fortschrittsbalken: geschätzte Punkte aus Themenauswahl */}
                {totalThemen > 0 && (() => {
                  const pct = Math.min(100, Math.round(estPunkte / maxPunkte * 100));
                  const isOver = estPunkte > maxPunkte;
                  return (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                        <span style={{ color: "#64748b" }}>Ø Punktwert der gewählten Themen</span>
                        <span style={{ fontWeight: 700, color: isOver ? "#dc2626" : "#15803d" }}>{estPunkte} / {maxPunkte} P</span>
                      </div>
                      <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: pct + "%", background: isOver ? "#dc2626" : pct > 80 ? "#f59e0b" : "#22c55e", borderRadius: "4px", transition: "all 0.3s" }} />
                      </div>
                      {isOver && <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px", fontWeight: 600 }}>⚠️ Themenauswahl überschreitet Punktziel — bitte Themen reduzieren oder Punktziel erhöhen.</div>}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}


        <button onClick={() => {
          if (!canProceed) return;
          const themenMap = {};
          activeLBs.forEach(lb => { themenMap[lb] = [...selectedThemen[lb]]; });
          onWeiter({ typ, pruefungsart, klasse, datum, anzahl: punkteModus === "punkte" ? null : anzahl, maxPunkte: punkteModus === "punkte" ? maxPunkte : null, selectedThemen: themenMap, werkstoffId, komplexOpts: {...komplexOpts, werkstoffId}, verkaufOpts, forderungOpts, abschlussOpts });
        }} disabled={!canProceed} style={{ ...S.btnPrimary, opacity: canProceed ? 1 : 0.4, cursor: canProceed ? "pointer" : "not-allowed" }}>
          Weiter: Unternehmen wählen →
        </button>
      </>)}
    </div>
  );
}

function SchrittFirma({ config, onWeiter, onZurueck }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={S.card}>
      <div style={S.label}>Schritt 2 von 3</div>
      <div style={S.h2}>Modellunternehmen wählen</div>
      <p style={{ color: "#64748b", marginTop: 0, marginBottom: "18px" }}>
        {config.typ}{config.pruefungsart ? ` · ${config.pruefungsart}` : ""} · Klasse {config.klasse} · {Object.values(config.selectedThemen).reduce((s, ids) => s + ids.length, 0)} Themen{config.anzahl ? ` · ${config.anzahl} Aufgaben` : ` · Ziel: ${config.maxPunkte} P`}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        {UNTERNEHMEN.map(u => (
          <button key={u.id} onClick={() => setSelected(u.id)} style={{ padding: 0, border: "2px solid", cursor: "pointer", textAlign: "left", overflow: "hidden", borderRadius: "12px", borderColor: selected === u.id ? u.farbe : "#e2e8f0", background: selected === u.id ? u.farbe + "0a" : "#fff" }}>
            <div style={{ background: u.farbe, padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>{u.icon}</span>
              <span style={{ fontWeight: 800, fontSize: "14px", color: "#fff" }}>{u.name}</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>{u.ort} · {u.rechtsform}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>{u.branche}</div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onZurueck} style={S.btnSecondary}>← Zurück</button>
        <button onClick={() => selected && onWeiter(UNTERNEHMEN.find(u => u.id === selected))} disabled={!selected} style={{ ...S.btnPrimary, opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "not-allowed" }}>Aufgaben generieren →</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT — HTML-Generator + Modal
// ══════════════════════════════════════════════════════════════════════════════

// Hilfsfunktion: Buchungssatz-Zeilen als HTML-String (für Export)
function exportBuchungssatzHTML(soll, haben) {
  if (!soll?.length && !haben?.length) return "";
  const rows = Math.max(soll?.length || 0, haben?.length || 0);
  const anRow = (soll?.length || 1) - 1;
  let html = `<table class="bs-table"><tbody>`;
  for (let i = 0; i < rows; i++) {
    const s = soll?.[i];
    const hIdx = i - anRow;
    const h = hIdx >= 0 ? haben?.[hIdx] : null;
    const showAn = i === anRow;
    const sk = s ? getKonto(s.nr) : null;
    const hk = h ? getKonto(h.nr) : null;
    html += `<tr>
      <td class="bs-nr soll">${s ? s.nr : ""}</td>
      <td class="bs-kz soll">${s ? (sk?.kuerzel ?? s.nr) : ""}</td>
      <td class="bs-haken">${s ? "✓" : ""}</td>
      <td class="bs-bet soll">${s ? (typeof s.betrag === "number" ? s.betrag : parseFloat(s.betrag) || 0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €" : ""}</td>
      <td class="bs-an">${showAn ? "an" : ""}</td>
      <td class="bs-nr haben">${h ? h.nr : ""}</td>
      <td class="bs-kz haben">${h ? (hk?.kuerzel ?? h.nr) : ""}</td>
      <td class="bs-haken">${h ? "✓" : ""}</td>
      <td class="bs-bet haben">${h ? (typeof h.betrag === "number" ? h.betrag : parseFloat(h.betrag) || 0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " €" : ""}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

// Nebenrechnungs-Block als HTML
function exportNrHTML(nebenrechnungen) {
  if (!nebenrechnungen?.length) return "";
  let html = `<div class="nr-block"><div class="nr-label">Nebenrechnung</div>`;
  nebenrechnungen.forEach(nr => {
    html += `<div class="nr-row">`;
    if (nr.label) html += `<span class="nr-lbl">${nr.label}:</span> `;
    html += `<span class="nr-wert">${(typeof nr.wert === "number" ? nr.wert : parseFloat(nr.wert) || 0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} ${nr.einheit || "€"}</span>`;
    if (nr.hinweis) html += ` <span class="nr-hint">(${nr.hinweis})</span>`;
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

// Komplex-Kette: Schritte als Aufgaben
function exportKomplexHTML(aufgabe, mitLoesung) {
  if (!aufgabe.schritte?.length) return "";
  let html = "";
  const labels = "abcdefghij";
  aufgabe.schritte.forEach((st, si) => {
    html += `<div class="schritt-block">
      <div class="schritt-header"><span class="schritt-label">${labels[si]})</span> ${st.aufgabe || ""} <span class="punkte-badge">${st.punkte} P</span></div>`;
    if (mitLoesung && st.soll?.length) {
      html += `<div class="loesung-block">` + exportBuchungssatzHTML(st.soll, st.haben) + `</div>`;
      if (st.nebenrechnungen?.length) html += exportNrHTML(st.nebenrechnungen);
      if (st.erklaerung) html += `<div class="erkl">💡 ${st.erklaerung}</div>`;
    }
    html += `</div>`;
  });
  return html;
}

// Firmen-Vorspann-HTML
function exportFirmaHTML(config, firma) {
  const intro = config.klasse <= 9
    ? "Du bist als Auszubildende/r im Unternehmen tätig und mit Aufgaben des betrieblichen Rechnungswesens betraut."
    : "Als Mitarbeiterin bzw. Mitarbeiter im Unternehmen sind Sie mit Aufgaben des betrieblichen Rechnungswesens betraut.";
  const wtLabels = [
    ["Rohstoffe", firma.rohstoffe],
    ["Hilfsstoffe", firma.hilfsstoffe],
    ["Fremdbauteile", firma.fremdbauteile],
    ["Betriebsstoffe", firma.betriebsstoffe],
  ].filter(([, list]) => list?.length);
  return `<div class="firma-block">
    <div class="firma-name">${firma.icon || "🏢"} ${firma.name} · ${firma.plz || ""} ${firma.ort || ""}</div>
    <div class="firma-info">${firma.slogan || ""} ${intro}</div>
    <div class="firma-details">
      <span><strong>Rechtsform:</strong> ${firma.rechtsform || ""}</span>
      <span><strong>Inhaber/in:</strong> ${firma.inhaber || ""}</span>
      <span><strong>Branche:</strong> ${firma.branche || ""}</span>
    </div>
    ${wtLabels.map(([l, list]) => `<div class="firma-wt"><strong>${l}:</strong> ${list.join(", ")}</div>`).join("")}
    <div class="formvorgaben">📐 <strong>Formale Vorgaben:</strong> Bei Buchungssätzen sind Kontonummer, Kontobezeichnung und Betrag anzugeben. Ergebnisse auf zwei Nachkommastellen runden. USt-Satz 19 % sofern nicht anders angegeben.</div>
  </div>`;
}

// Haupt-Generator: erzeugt komplettes HTML-Dokument für Druck / Word
function generateExportHTML({ aufgaben, config, firma, modus, kiHistorie, format = "pdf" }) {
  // modus: "aufgaben" | "loesungen" | "beides" | "ki"
  const mitAufgabe  = modus !== "loesungen";
  const mitLoesung  = modus !== "aufgaben";
  const datum = new Date(config.datum + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  const titel = config.typ + (config.pruefungsart ? ` · ${config.pruefungsart}` : "");
  const gesamtP = aufgaben.reduce((s, a) => s + berechnePunkte(a), 0);

  // CSS für PDF: volle BuchungsWerk-Farben
  const CSS_PDF = `
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #0f172a; padding: 24px 32px; max-width: 800px; margin: 0 auto; }
    .bw-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #0f172a; margin-bottom: 18px; }
    .bw-logo { font-size: 20px; font-weight: 900; color: #0f172a; }
    .bw-logo span { color: #d97706; }
    .bw-meta { text-align: right; font-size: 10px; color: #64748b; line-height: 1.6; }
    .bw-meta strong { color: #0f172a; }
    .print-btn { display:inline-block; margin-bottom:16px; padding:8px 18px; background:#0f172a; color:#f59e0b; border:none; border-radius:6px; font-weight:700; font-size:13px; cursor:pointer; }
    .doc-titel { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .doc-sub { font-size: 11px; color: #475569; margin-bottom: 14px; display: flex; gap: 12px; flex-wrap: wrap; }
    .doc-sub span { background: #f1f5f9; padding: 2px 7px; border-radius: 8px; }
    .firma-block { border: 1px solid #e2e8f0; border-left: 4px solid #d97706; background: #fffbeb; border-radius: 6px; padding: 9px 13px; margin-bottom: 18px; font-size: 11px; }
    .firma-name { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
    .firma-info { color: #374151; margin-bottom: 5px; }
    .firma-details { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 3px; }
    .firma-wt { color: #374151; margin-bottom: 2px; }
    .formvorgaben { margin-top: 5px; font-size: 10px; color: #475569; }
    .aufgabe-card { border: 1px solid #e2e8f0; border-radius: 7px; margin-bottom: 14px; page-break-inside: avoid; }
    .aufgabe-header { background: #f8fafc; padding: 8px 13px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #e2e8f0; border-radius: 7px 7px 0 0; }
    .aufg-nr { width: 22px; height: 22px; background: #0f172a; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .aufg-titel { font-weight: 700; font-size: 12px; flex: 1; }
    .punkte-badge { background: #0f172a; color: #f59e0b; border-radius: 20px; padding: 2px 9px; font-size: 10px; font-weight: 800; white-space: nowrap; }
    .aufgabe-body { padding: 10px 14px; }
    .aufgabe-text { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 9px; }
    .leerzeile { border: 1px solid #cbd5e1; height: 36px; margin-bottom: 8px; background: #f8fafc; }
    .loesung-block { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 7px; padding: 9px 11px; margin-top: 7px; }
    .loesung-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #16a34a; margin-bottom: 5px; }
    .bs-table { font-family: 'Courier New', monospace; font-size: 12px; border-collapse: collapse; width: 100%; }
    .bs-table td { padding: 2px 4px; vertical-align: baseline; white-space: nowrap; }
    .bs-nr { font-weight: 700; min-width: 42px; }
    .bs-kz { font-weight: 700; min-width: 58px; }
    .bs-haken { color: #16a34a; font-weight: 900; width: 16px; text-align: center; }
    .bs-bet { min-width: 88px; text-align: right; padding-right: 5px; }
    .bs-an { font-weight: 700; color: #64748b; width: 30px; text-align: center; }
    .soll { color: #1d4ed8; }
    .haben { color: #dc2626; }
    .nr-block { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 5px; padding: 7px 11px; margin-top: 7px; font-size: 11px; }
    .nr-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #92400e; margin-bottom: 3px; }
    .nr-row { margin-bottom: 2px; }
    .nr-lbl { font-weight: 600; color: #374151; }
    .nr-wert { font-family: monospace; font-weight: 700; }
    .nr-hint { color: #64748b; font-size: 10px; }
    .erkl { margin-top: 7px; padding: 5px 9px; background: #fffbeb; border-left: 3px solid #f59e0b; font-size: 10px; color: #92400e; }
    .schritt-block { margin-bottom: 9px; padding: 7px 9px; border: 1px solid #e2e8f0; border-radius: 5px; }
    .schritt-header { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; }
    .schritt-label { color: #0f172a; font-weight: 800; }
    .seitenumbruch { page-break-before: always; padding-top: 18px; }
    .loesung-header { font-size: 14px; font-weight: 800; color: #16a34a; margin: 0 0 12px; padding-bottom: 7px; border-bottom: 2px solid #16a34a; }
    .ki-aufgabe-header { background: #faf5ff; border-bottom: 1px solid #e9d5ff; }
    .ki-aufg-titel { font-weight: 700; color: #6d28d9; font-size: 12px; }
    @media print {
      .print-btn { display: none !important; }
      body { padding: 0; }
      .aufgabe-card { page-break-inside: avoid; }
    }
  `;

  // CSS für Word: sauber, druckoptimiert, kein Dunkel, keine Boxschatten
  const CSS_WORD = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; padding: 1.5cm 2cm; max-width: 21cm; }
    .bw-header { border-bottom: 1.5pt solid #000; margin-bottom: 10pt; padding-bottom: 5pt; }
    .bw-logo { font-size: 13pt; font-weight: bold; }
    .bw-logo span { color: #b45309; }
    .bw-meta { font-size: 8pt; color: #555; margin-top: 2pt; }
    .doc-titel { font-size: 13pt; font-weight: bold; margin: 8pt 0 3pt; }
    .doc-sub { font-size: 8pt; color: #555; margin-bottom: 10pt; }
    .doc-sub span::after { content: " · "; }
    .doc-sub span:last-child::after { content: ""; }
    .firma-block { border: 0.75pt solid #bbb; border-left: 3pt solid #b45309; padding: 6pt 9pt; margin-bottom: 12pt; font-size: 8.5pt; }
    .firma-name { font-size: 10pt; font-weight: bold; margin-bottom: 2pt; }
    .firma-info { margin-bottom: 3pt; }
    .firma-details span { margin-right: 12pt; }
    .firma-wt { margin-bottom: 2pt; }
    .formvorgaben { margin-top: 4pt; font-size: 7.5pt; color: #555; }
    .aufgabe-card { border: 0.75pt solid #bbb; margin-bottom: 10pt; page-break-inside: avoid; }
    .aufgabe-header { border-bottom: 0.75pt solid #bbb; padding: 4pt 8pt; display: flex; align-items: center; gap: 6pt; }
    .aufg-nr { font-weight: bold; font-size: 10pt; min-width: 16pt; }
    .aufg-titel { font-weight: bold; font-size: 9.5pt; flex: 1; }
    .punkte-badge { font-size: 8pt; border: 0.75pt solid #999; padding: 1pt 5pt; }
    .aufgabe-body { padding: 6pt 9pt; }
    .aufgabe-text { font-size: 9.5pt; font-weight: bold; margin-bottom: 6pt; }
    .leerzeile { border-bottom: 0.75pt solid #bbb; height: 18pt; margin-bottom: 5pt; }
    .loesung-block { border: 0.75pt solid #bbb; border-left: 2pt solid #16a34a; padding: 5pt 8pt; margin-top: 5pt; }
    .loesung-label { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #16a34a; margin-bottom: 3pt; }
    .bs-table { font-family: 'Courier New', monospace; font-size: 9pt; border-collapse: collapse; width: 100%; }
    .bs-table td { padding: 1.5pt 3pt; vertical-align: baseline; }
    .bs-nr { font-weight: bold; min-width: 32pt; }
    .bs-kz { font-weight: bold; min-width: 44pt; }
    .bs-haken { color: #16a34a; font-weight: bold; width: 12pt; text-align: center; }
    .bs-bet { min-width: 68pt; text-align: right; padding-right: 4pt; }
    .bs-an { font-weight: bold; color: #666; width: 20pt; text-align: center; }
    .soll { color: #1a56db; }
    .haben { color: #c81e1e; }
    .nr-block { border: 0.75pt solid #ccc; border-left: 2pt solid #b45309; padding: 4pt 7pt; margin-top: 5pt; font-size: 8.5pt; }
    .nr-label { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #b45309; margin-bottom: 2pt; }
    .nr-row { margin-bottom: 2pt; }
    .nr-lbl { font-weight: bold; }
    .nr-wert { font-family: monospace; font-weight: bold; }
    .nr-hint { color: #666; font-size: 7.5pt; }
    .erkl { margin-top: 5pt; padding: 4pt 7pt; border-left: 1.5pt solid #b45309; font-size: 7.5pt; color: #555; }
    .schritt-block { margin-bottom: 6pt; padding: 5pt 7pt; border: 0.5pt solid #ccc; }
    .schritt-header { font-size: 9pt; font-weight: bold; margin-bottom: 3pt; }
    .schritt-label { font-weight: bold; }
    .seitenumbruch { page-break-before: always; padding-top: 14pt; }
    .loesung-header { font-size: 12pt; font-weight: bold; color: #16a34a; margin: 0 0 10pt; padding-bottom: 4pt; border-bottom: 1pt solid #16a34a; }
    .ki-aufg-titel { font-weight: bold; font-size: 9.5pt; }
    .print-btn { display: none; }
    @media print { body { padding: 0; } }
  `;

  const CSS = format === "word" ? CSS_WORD : CSS_PDF;

  // ── Aufgaben-Blöcke aufbauen ──────────────────────────────────────────────
  let aufgabenHTML = "";
  let aufgNr = 0;
  aufgaben.forEach(a => {
    aufgNr++;
    const punkte = berechnePunkte(a);
    const isKomplex = a.taskTyp === "komplex";
    const isRechnung = a.taskTyp === "rechnung";
    const aufgabeText = anrede(config.klasse, a.aufgabe || "");

    aufgabenHTML += `<div class="aufgabe-card">
      <div class="aufgabe-header">
        <div class="aufg-nr">${aufgNr}</div>
        <div class="aufg-titel">${a.titel || ""}</div>
        <div class="punkte-badge">${punkte} P</div>
      </div>
      <div class="aufgabe-body">`;

    if (mitAufgabe) {
      aufgabenHTML += `<div class="aufgabe-text">${aufgabeText}</div>`;
      if (!mitLoesung) {
        // Leerfelder für Schüler
        aufgabenHTML += `<div class="leerzeile"></div>`;
        if (isKomplex) aufgabenHTML += `<div class="leerzeile"></div><div class="leerzeile"></div>`;
      }
    }

    if (isKomplex) {
      aufgabenHTML += exportKomplexHTML(a, mitLoesung);
    } else {
      if (mitLoesung) {
        aufgabenHTML += `<div class="loesung-block">`;
        aufgabenHTML += `<div class="loesung-label">✔ Musterlösung</div>`;
        if (a.nebenrechnungen?.length) aufgabenHTML += exportNrHTML(a.nebenrechnungen);
        if (isRechnung && a.schema?.length) {
          aufgabenHTML += `<table class="bs-table"><tbody>`;
          a.schema.forEach(row => {
            aufgabenHTML += `<tr><td style="color:#374151;padding:2px 8px">${row.label || ""}</td><td style="text-align:right;font-family:monospace;padding:2px 8px">${typeof row.wert === "number" ? row.wert.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) : (row.wert||"")} ${row.einheit||"€"}</td></tr>`;
          });
          aufgabenHTML += `</tbody></table>`;
        }
        if (a.soll?.length) aufgabenHTML += exportBuchungssatzHTML(a.soll, a.haben);
        if (a.erklaerung) aufgabenHTML += `<div class="erkl">💡 ${a.erklaerung}</div>`;
        aufgabenHTML += `</div>`; // .loesung-block
      }
    }

    aufgabenHTML += `</div></div>`; // .aufgabe-body + .aufgabe-card
  });

  // ── KI-Aufgaben ──────────────────────────────────────────────────────────
  let kiHTML = "";
  if (modus === "ki" && kiHistorie?.length) {
    kiHistorie.forEach((eintrag, idx) => {
      const result = eintrag.result;
      if (!result) return;
      kiHTML += `<div class="aufgabe-card">
        <div class="ki-aufgabe-header aufgabe-header">
          <div class="aufg-nr" style="background:#6d28d9">${idx+1}</div>
          <div class="ki-aufg-titel aufg-titel">KI-Aufgabe ${idx+1} · ${result.punkte_gesamt || "?"} Punkte</div>
        </div>
        <div class="aufgabe-body">
          <div class="aufgabe-text">${result.aufgabe || ""}</div>`;
      if (result.nebenrechnung) {
        kiHTML += `<div class="nr-block"><div class="nr-label">Nebenrechnung</div><div class="nr-row" style="white-space:pre-wrap;font-family:monospace">${result.nebenrechnung}</div></div>`;
      }
      if (mitLoesung && result.buchungssatz?.length) {
        kiHTML += `<div class="loesung-block"><div class="loesung-label">✔ Buchungssatz</div>`;
        kiHTML += `<table class="bs-table"><tbody>`;
        result.buchungssatz.forEach(bs => {
          const sk = getKonto(bs.soll_nr);
          const hk = getKonto(bs.haben_nr);
          kiHTML += `<tr>
            <td class="bs-nr soll">${bs.soll_nr}</td>
            <td class="bs-kz soll">${sk?.kuerzel || bs.soll_nr}</td>
            <td class="bs-haken">✓</td>
            <td class="bs-bet soll">${typeof bs.betrag==="number" ? bs.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : bs.betrag} €</td>
            <td class="bs-an">an</td>
            <td class="bs-nr haben">${bs.haben_nr}</td>
            <td class="bs-kz haben">${hk?.kuerzel || bs.haben_nr}</td>
            <td class="bs-haken">✓</td>
            <td class="bs-bet haben">${typeof bs.betrag==="number" ? bs.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : bs.betrag} €</td>
          </tr>`;
        });
        kiHTML += `</tbody></table>`;
        if (result.erklaerung) kiHTML += `<div class="erkl">💡 ${result.erklaerung}</div>`;
        kiHTML += `</div>`;
      }
      kiHTML += `</div></div>`;
    });
  }

  // ── Für "beides": Lösungen auf gesonderter Seite ─────────────────────────
  let loesungsseiteHTML = "";
  if (modus === "beides") {
    loesungsseiteHTML = `<div class="seitenumbruch"><div class="loesung-header">✔ Musterlösung</div>`;
    let lNr = 0;
    aufgaben.forEach(a => {
      lNr++;
      const isKomplex = a.taskTyp === "komplex";
      const isRechnung = a.taskTyp === "rechnung";
      loesungsseiteHTML += `<div class="aufgabe-card">
        <div class="aufgabe-header">
          <div class="aufg-nr">${lNr}</div>
          <div class="aufg-titel">${a.titel || ""}</div>
          <div class="punkte-badge">${berechnePunkte(a)} P</div>
        </div>
        <div class="aufgabe-body loesung-block">`;
      if (isKomplex) {
        loesungsseiteHTML += exportKomplexHTML(a, true);
      } else {
        if (a.nebenrechnungen?.length) loesungsseiteHTML += exportNrHTML(a.nebenrechnungen);
        if (isRechnung && a.schema?.length) {
          loesungsseiteHTML += `<table class="bs-table"><tbody>`;
          a.schema.forEach(row => { loesungsseiteHTML += `<tr><td style="color:#374151;padding:2px 8px">${row.label||""}</td><td style="text-align:right;font-family:monospace;padding:2px 8px">${typeof row.wert==="number" ? row.wert.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) : (row.wert||"")} ${row.einheit||"€"}</td></tr>`; });
          loesungsseiteHTML += `</tbody></table>`;
        }
        if (a.soll?.length) loesungsseiteHTML += exportBuchungssatzHTML(a.soll, a.haben);
        if (a.erklaerung) loesungsseiteHTML += `<div class="erkl">💡 ${a.erklaerung}</div>`;
      }
      loesungsseiteHTML += `</div></div>`;
    });
    loesungsseiteHTML += `</div>`;
  }

  // ── Kopfzeile für Aufgabenblatt ─────────────────────────────────────────
  const isLoesung = modus === "loesungen";
  const headerTitel = isLoesung ? `✔ Musterlösung – ${titel}` : titel;
  const headerFarbe = isLoesung ? "#16a34a" : "#0f172a";

  const body = modus === "ki"
    ? `<h1 class="doc-titel" style="color:#6d28d9">🤖 KI-Aufgaben · ${kiHistorie?.length || 0} Aufgaben</h1>
       <div class="doc-sub"><span>${datum}</span></div>${kiHTML}`
    : `
      <h1 class="doc-titel" style="color:${headerFarbe}">${headerTitel}</h1>
      <div class="doc-sub">
        <span>📅 ${datum}</span>
        <span>Klasse ${config.klasse}</span>
        ${config.pruefungsart ? `<span>📋 ${config.pruefungsart}</span>` : ""}
        <span>${gesamtP} Punkte</span>
      </div>
      ${exportFirmaHTML(config, firma)}
      ${aufgabenHTML}
      ${loesungsseiteHTML}
    `;

  const printBtn = format === "pdf"
    ? `<button class="print-btn no-print" onclick="window.print()">🖨 Als PDF drucken / speichern</button>`
    : "";
  const autoprint = format === "pdf"
    ? `<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),400);});<\/script>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BuchungsWerk – ${headerTitel}</title>
  <style>${CSS}</style>
  ${autoprint}
</head>
<body>
  <div class="bw-header">
    <div class="bw-logo">Buchungs<span>Werk</span></div>
    <div class="bw-meta">
      <strong>BwR Bayern · Realschule · ISB 2025</strong><br>
      ${firma.name || ""} · ${datum}<br>
      Klasse ${config.klasse} · ${gesamtP} Punkte
    </div>
  </div>
  ${printBtn}
  ${body}
</body>
</html>`;
}


// ── MaterialienModal ───────────────────────────────────────────────────────────
function MaterialienModal({ onSchliessen, onLaden }) {
  const [materialien, setMaterialien] = useState([]);
  const [stufe, setStufe] = useState(null);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");

  const ladeAlles = async (s) => {
    setLaden(true); setFehler("");
    const url = "/materialien" + (s ? `?stufe=${s}` : "");
    const res = await apiFetch(url);
    if (res) setMaterialien(res);
    else setFehler("Backend nicht erreichbar.");
    setLaden(false);
  };

  React.useEffect(() => { ladeAlles(stufe); }, [stufe]);

  const loeschen = async (id, titel) => {
    if (!confirm(`"${titel}" löschen?`)) return;
    await apiFetch(`/materialien/${id}`, "DELETE");
    ladeAlles(stufe);
  };

  const material_laden = async (id) => {
    const m = await apiFetch(`/materialien/${id}`);
    if (!m?.daten_json) return;
    try {
      const daten = JSON.parse(m.daten_json);
      onLaden(daten);
      onSchliessen();
    } catch { alert("Fehler beim Laden."); }
  };

  const gruppiertNachStufe = [7,8,9,10].map(s => ({
    stufe: s,
    items: materialien.filter(m => m.jahrgangsstufe === s)
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#0f172a", borderRadius:"16px", width:"100%", maxWidth:"560px", maxHeight:"85vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #1e293b", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#64748b", marginBottom:"3px" }}>Materialien</div>
            <div style={{ fontSize:"18px", fontWeight:900, color:"#fff" }}>📚 Gespeicherte Übungen</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", width:"34px", height:"34px", cursor:"pointer", fontSize:"18px" }}>×</button>
        </div>

        {/* Filter */}
        <div style={{ padding:"12px 22px", borderBottom:"1px solid #1e293b", display:"flex", gap:"6px", flexShrink:0 }}>
          {[null,7,8,9,10].map(s => (
            <button key={s??'alle'} onClick={() => setStufe(s)}
              style={{ padding:"5px 12px", borderRadius:"7px", border:"none", cursor:"pointer", fontSize:"12px", fontWeight:stufe===s?700:500,
                background: stufe===s ? "#f59e0b" : "#1e293b", color: stufe===s ? "#0f172a" : "#94a3b8" }}>
              {s ? `Klasse ${s}` : "Alle"}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div style={{ overflowY:"auto", padding:"16px 22px", flex:1 }}>
          {laden && <div style={{ color:"#64748b", textAlign:"center", padding:"20px" }}>⏳ Laden…</div>}
          {fehler && <div style={{ color:"#f87171", textAlign:"center", padding:"20px" }}>{fehler}</div>}
          {!laden && !fehler && materialien.length === 0 && (
            <div style={{ color:"#475569", textAlign:"center", padding:"28px", fontSize:"13px" }}>
              Noch keine Materialien gespeichert.<br/>
              <span style={{ fontSize:"11px" }}>Erstelle eine Übung und klicke auf „💾 Speichern".</span>
            </div>
          )}
          {gruppiertNachStufe.map(({ stufe: s, items }) => (
            <div key={s} style={{ marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"8px" }}>
                Klasse {s}
              </div>
              {items.map(m => (
                <div key={m.id} style={{ background:"#1e293b", borderRadius:"10px", padding:"12px 14px", marginBottom:"7px", display:"flex", alignItems:"center", gap:"10px" }}>
                  <div style={{ fontSize:"20px", flexShrink:0 }}>{m.firma_icon || "📋"}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:700, color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.titel}</div>
                    <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>
                      {m.typ}{m.pruefungsart ? ` · ${m.pruefungsart}` : ""} · {m.firma_name || ""} · {m.gesamt_punkte} P
                    </div>
                    <div style={{ fontSize:"10px", color:"#475569", marginTop:"1px" }}>
                      {new Date(m.erstellt).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                    <button onClick={() => material_laden(m.id)}
                      style={{ padding:"6px 12px", borderRadius:"7px", border:"none", background:"#f59e0b", color:"#0f172a", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
                      Laden
                    </button>
                    <button onClick={() => loeschen(m.id, m.titel)}
                      style={{ padding:"6px 10px", borderRadius:"7px", border:"1px solid #334155", background:"transparent", color:"#94a3b8", fontSize:"12px", cursor:"pointer" }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ExportModal ───────────────────────────────────────────────────────────
function ExportModal({ aufgaben, config, firma, kiHistorie, onSchliessen }) {
  const [modus, setModus] = useState("aufgaben");

  const modusOpts = [
    { key: "aufgaben",  icon: "📝", label: "Aufgabenblatt",   desc: "Ohne Lösung (für Schüler)" },
    { key: "loesungen", icon: "✔",  label: "Lösungsblatt",    desc: "Mit Buchungssatz + Haken" },
    { key: "beides",    icon: "📋", label: "Aufgabe + Lösung", desc: "Lösung auf Folgeseite" },
    { key: "ki",        icon: "🤖", label: "KI-Aufgaben",      desc: "Eigene Belege / KI-Output" },
  ];

  // PDF: öffnet HTML in neuem Tab → Drucken / Als PDF speichern
  const exportPDF = () => {
    try {
      const html = generateExportHTML({ aufgaben, config, firma, modus, kiHistorie });
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch(err) {
      alert("Export-Fehler (PDF): " + err.message);
    }
  };

  // Word: echtes DOCX via docx-Library
  const exportWord = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
              WidthType, BorderStyle, AlignmentType, ShadingType } = await import("docx");

      const mitAufgabe = modus !== "loesungen";
      const mitLoesung = modus !== "aufgaben";
      const datum = new Date(config.datum + "T00:00:00").toLocaleDateString("de-DE",
        { day:"2-digit", month:"long", year:"numeric" });
      const gesamtP = aufgaben.reduce((s,a) => s + berechnePunkte(a), 0);

      const stripHtml = t => (t||"").replace(/<[^>]*>/g,"");

      const grau = { fill:"F1F5F9", type:ShadingType.CLEAR, color:"auto" };
      const gruenBorder = { style:BorderStyle.SINGLE, size:6, color:"16A34A" };
      const noBorder = { style:BorderStyle.NONE, size:0, color:"FFFFFF" };

      const para = (text, opts={}) => new Paragraph({
        children:[new TextRun({ text, size: opts.size||22, bold:opts.bold||false,
          color: opts.color||"000000", font:"Arial" })],
        spacing:{ after: opts.after||80 },
        alignment: opts.align || AlignmentType.LEFT,
      });

      const children = [];

      // ── Kopfzeile ──
      children.push(new Paragraph({
        children:[
          new TextRun({ text:"BuchungsWerk", bold:true, size:32, font:"Arial", color:"0F172A" }),
          new TextRun({ text:"  ·  BwR Bayern · Realschule · ISB 2025", size:18, color:"64748B", font:"Arial" }),
        ], spacing:{ after:120 }
      }));

      // ── Titel ──
      const isLoesung = modus === "loesungen";
      children.push(new Paragraph({
        children:[new TextRun({
          text: (isLoesung ? "✔ Musterlösung – " : "") + config.typ + (config.pruefungsart ? ` · ${config.pruefungsart}` : ""),
          bold:true, size:28, font:"Arial", color: isLoesung ? "16A34A" : "0F172A"
        })],
        spacing:{ after:80 }
      }));
      children.push(para(`${datum}  ·  Klasse ${config.klasse}  ·  ${gesamtP} Punkte`, { color:"475569", size:18, after:160 }));

      // ── Firma ──
      if (firma?.name) {
        children.push(para(`${firma.icon||"🏢"} ${firma.name}  ·  ${firma.ort||""}`, { bold:true, size:22, after:60 }));
        if (firma.rohstoffe?.length) children.push(para(`Rohstoffe: ${firma.rohstoffe.join(", ")}`, { size:18, color:"374151", after:40 }));
        if (firma.hilfsstoffe?.length) children.push(para(`Hilfsstoffe: ${firma.hilfsstoffe.join(", ")}`, { size:18, color:"374151", after:40 }));
        if (firma.fremdbauteile?.length) children.push(para(`Fremdbauteile: ${firma.fremdbauteile.join(", ")}`, { size:18, color:"374151", after:40 }));
        children.push(para("📐 Formale Vorgaben: Kontonummer, Kontoabkürzung und Betrag angeben. Auf zwei Nachkommastellen runden. USt 19 %.", { size:16, color:"92400E", after:200 }));
      }

      // ── Aufgaben ──
      aufgaben.forEach((a, i) => {
        const punkte = berechnePunkte(a);
        const aufgTxt = stripHtml(anrede(config.klasse, a.aufgabe || ""));

        // Aufgaben-Header
        children.push(new Paragraph({
          children:[
            new TextRun({ text:`${i+1}. `, bold:true, size:22, font:"Arial", color:"0F172A" }),
            new TextRun({ text: a.titel||"", bold:true, size:22, font:"Arial", color:"0F172A" }),
            new TextRun({ text:`  [${punkte} P]`, size:18, font:"Arial", color:"64748B" }),
          ],
          spacing:{ before:160, after:80 },
          shading: grau,
        }));

        if (mitAufgabe && aufgTxt) {
          children.push(para(aufgTxt, { size:22, after:80 }));
          if (!mitLoesung) {
            children.push(new Paragraph({ children:[], spacing:{ after:400 }, border:{ bottom:{ style:BorderStyle.SINGLE, size:2, color:"CBD5E1" } } }));
          }
        }

        if (mitLoesung && a.soll?.length) {
          // Buchungssatz-Tabelle
          const sollHabenRows = [];
          const maxRows = Math.max(a.soll.length, a.haben?.length||0);
          for (let r=0; r<maxRows; r++) {
            const s = a.soll[r];
            const h = (a.haben||[])[r - (a.soll.length-1)] ;
            const showAn = r === a.soll.length-1;
            sollHabenRows.push(new TableRow({ children:[
              new TableCell({ children:[para(s?s.nr:"",{size:20,bold:true,color:"1D4ED8"})], width:{size:10,type:WidthType.PERCENTAGE}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder} }),
              new TableCell({ children:[para(s?getKonto(s.nr)?.kuerzel||s.nr:"",{size:20,bold:true,color:"1D4ED8"})], width:{size:12,type:WidthType.PERCENTAGE}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder} }),
              new TableCell({ children:[para(s&&s.betrag!=null?s.betrag.toLocaleString("de-DE",{minimumFractionDigits:2})+" €":"",{size:20,color:"1D4ED8",align:AlignmentType.RIGHT})], width:{size:16,type:WidthType.PERCENTAGE}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder} }),
              new TableCell({ children:[para(showAn?"an":"",{size:20,bold:true,color:"64748B",align:AlignmentType.CENTER})], width:{size:8,type:WidthType.PERCENTAGE}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder} }),
              new TableCell({ children:[para(h?h.nr:"",{size:20,bold:true,color:"DC2626"})], width:{size:10,type:WidthType.PERCENTAGE}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder} }),
              new TableCell({ children:[para(h?getKonto(h.nr)?.kuerzel||h.nr:"",{size:20,bold:true,color:"DC2626"})], width:{size:12,type:WidthType.PERCENTAGE}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder} }),
              new TableCell({ children:[para(h&&h.betrag!=null?h.betrag.toLocaleString("de-DE",{minimumFractionDigits:2})+" €":"",{size:20,color:"DC2626",align:AlignmentType.RIGHT})], width:{size:16,type:WidthType.PERCENTAGE}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder} }),
              new TableCell({ children:[para("✓",{size:20,bold:true,color:"16A34A",align:AlignmentType.CENTER})], width:{size:8,type:WidthType.PERCENTAGE}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder} }),
            ]}));
          }
          children.push(new Table({ rows:sollHabenRows, width:{size:100,type:WidthType.PERCENTAGE},
            borders:{ top:gruenBorder, bottom:gruenBorder, left:gruenBorder, right:gruenBorder, insideH:noBorder, insideV:noBorder } }));
          children.push(new Paragraph({ spacing:{ after:80 } }));
          if (a.erklaerung) children.push(para("💡 " + a.erklaerung, { size:18, color:"92400E", after:80 }));
        }
      });

      const doc = new Document({
        sections:[{ children }],
        styles:{ default:{ document:{ run:{ font:"Arial", size:22 } } } },
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BuchungsWerk_${modus}_Kl${config.klasse}_${config.datum||"2025"}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch(err) {
      alert("Export-Fehler (Word): " + err.message);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#0f172a", borderRadius:"16px", width:"100%", maxWidth:"520px", overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #1e293b", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#64748b", marginBottom:"4px" }}>Export</div>
            <div style={{ fontSize:"20px", fontWeight:900, color:"#fff" }}>📄 Buchungs<span style={{color:"#f59e0b"}}>Werk</span></div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", width:"36px", height:"36px", cursor:"pointer", fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Modus-Auswahl */}
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"10px" }}>Inhalt</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"20px" }}>
            {modusOpts.map(opt => {
              const isActive = modus === opt.key;
              const disabled = opt.key === "ki" && !kiHistorie?.length;
              return (
                <button key={opt.key} onClick={() => !disabled && setModus(opt.key)}
                  style={{ padding:"12px 14px", borderRadius:"10px", border:`2px solid ${isActive ? "#f59e0b" : "#1e293b"}`,
                    background: isActive ? "#1e3a5f" : "#1e293b",
                    cursor: disabled ? "not-allowed" : "pointer",
                    textAlign:"left", opacity: disabled ? 0.4 : 1, transition:"all 0.15s" }}>
                  <div style={{ fontSize:"16px", marginBottom:"3px" }}>{opt.icon}</div>
                  <div style={{ fontSize:"13px", fontWeight:700, color: isActive ? "#f59e0b" : "#e2e8f0" }}>{opt.label}</div>
                  <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Export-Buttons */}
          <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"10px" }}>Format</div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={exportPDF}
              style={{ flex:1, padding:"14px 16px", borderRadius:"10px", border:"none",
                background:"#dc2626", color:"#fff", fontWeight:800, fontSize:"14px", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                boxShadow:"0 2px 8px rgba(220,38,38,0.3)" }}>
              🖨 PDF / Drucken
            </button>
            <button onClick={exportWord}
              style={{ flex:1, padding:"14px 16px", borderRadius:"10px", border:"none",
                background:"#2563eb", color:"#fff", fontWeight:800, fontSize:"14px", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                boxShadow:"0 2px 8px rgba(37,99,235,0.3)" }}>
              📝 Word (.docx)
            </button>
          </div>
          <div style={{ marginTop:"12px", fontSize:"11px", color:"#475569", textAlign:"center" }}>
            PDF: Im neuen Tab → Drucken → „Als PDF speichern" · Word: .doc direkt herunterladen
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHRITT 3 — Aufgaben-Vorschau
// ══════════════════════════════════════════════════════════════════════════════
const fmt_datum = iso => new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

function SchrittAufgaben({ config, firma, onNeu, onMaterialLaden, onThemen, onFirma }) {
  const [showLoesungen, setShowLoesungen] = useState(false);
  const [globalMode, setGlobalMode] = useState("beleg"); // "beleg" | "text"
  const [exportOffen, setExportOffen] = useState(false);
  const [h5pOffen, setH5pOffen] = useState(false);
  const [materialienOffen, setMaterialienOffen] = useState(false);
  const [speichernStatus, setSpeichernStatus] = useState(""); // "" | "saving" | "ok" | "err"
  const [kiHistorie, setKiHistorie] = useState([]);

  const pool = [];
  Object.entries(config.selectedThemen).forEach(([lb, taskIds]) => {
    (AUFGABEN_POOL[config.klasse][lb] || []).forEach(t => { if (taskIds.includes(t.id)) pool.push(t); });
  });

  const [aufgaben] = useState(() => {
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
      };
      const gen = typ.taskTyp === "theorie" ? typ.generate() : typ.generate(firma, opts);
      const pts = typ.taskTyp === "komplex"
        ? (gen.schritte || []).reduce((s, st) => s + st.punkte, 0)
        : typ.taskTyp === "theorie"
          ? (gen.nrPunkte || 4)
          : typ.taskTyp === "rechnung"
          ? (gen.nrPunkte || 3)
          : (gen.soll?.length || 0) + (gen.haben?.length || 0) + (gen.nrPunkte || 0);
      // Komplex-Aufgabe zählt als so viele Teilaufgaben wie sie Schritte hat
      const teilaufgaben = typ.taskTyp === "komplex" ? (gen.schritte || []).length : 1;
      if (config.maxPunkte && punkteSum + pts > config.maxPunkte) break;
      if (!config.maxPunkte && teilaufgabenSum + teilaufgaben > zielAnzahl) break;
      result.push({ ...gen, titel: typ.titel, id: `${typ.id}_${i}`, taskTyp: typ.taskTyp || "buchung", themenTyp: typ.themenTyp, teilaufgaben });
      punkteSum += pts;
      teilaufgabenSum += teilaufgaben;
    }
    return result;
  });

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
              <span style={S.tag(firma.farbe)}>{firma.icon} {firma.name}</span>
              {config.pruefungsart && <span style={S.tag("#0f172a")}>📋 {config.pruefungsart}</span>}
              {activeLBs.map(lb => { const m = LB_INFO[lb] || { icon: "📌", farbe: "#475569" }; return <span key={lb} style={S.tag(m.farbe)}>{m.icon} {lb.split("·")[0].trim()}</span>; })}
              <span style={S.tag("#475569")}>📅 {fmt_datum(config.datum)}</span>
              <span style={S.tag("#475569")}>📋 {aufgaben.reduce((s,a) => s + (a.teilaufgaben || 1), 0)} Aufg. · {gesamtPunkte} P</span>
            </div>
            {/* Fortschrittsleiste bei Punktziel */}
            {config.maxPunkte && (
              <div style={{ marginTop: "10px", maxWidth: "360px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "3px" }}>
                  <span>Punkteausnutzung</span>
                  <span style={{ fontWeight: 700 }}>{gesamtPunkte} / {config.maxPunkte} P ({Math.round(gesamtPunkte/config.maxPunkte*100)} %)</span>
                </div>
                <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: Math.min(100, Math.round(gesamtPunkte/config.maxPunkte*100)) + "%", background: "#22c55e", borderRadius: "4px" }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>

            {/* ── Globaler Modus-Schalter ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>Alle Aufgaben</div>
              <div style={{ display: "flex", border: "1.5px solid #334155", borderRadius: "8px", overflow: "hidden" }}>
                {[
                  { key: "beleg", label: "📄 Beleg" },
                  { key: "text",  label: "📝 Geschäftsfall" },
                ].map(opt => (
                  <button key={opt.key} onClick={() => setGlobalMode(opt.key)} style={{
                    padding: "6px 14px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: globalMode === opt.key ? 700 : 500,
                    background: globalMode === opt.key ? "#0f172a" : "#f8fafc",
                    color: globalMode === opt.key ? "#f59e0b" : "#64748b",
                    transition: "all 0.15s",
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setShowLoesungen(!showLoesungen)} style={S.btnSecondary}>{showLoesungen ? "Lösungen ausblenden" : "Alle Lösungen"}</button>
            <button onClick={() => {
              try {
                const ki = JSON.parse(localStorage.getItem("buchungswerk_ki_export") || "[]");
                setKiHistorie(ki);
              } catch { setKiHistorie([]); }
              setExportOffen(true);
            }} style={{ ...S.btnPrimary, background: "#16a34a" }}>📄 Word/PDF</button>
            <button onClick={() => setH5pOffen(true)} style={{ ...S.btnPrimary, background: "#7c3aed" }}>🖥 H5P</button>
            <button onClick={() => setMaterialienOffen(true)} style={{ ...S.btnSecondary }}>📚 Materialien</button>
            <button onClick={onFirma} style={{ padding:"6px 14px", borderRadius:"8px", border:"1.5px solid #334155", background:"#1e293b", color:"#94a3b8", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>‹ Unternehmen</button>
            <button onClick={onThemen} style={{ padding:"6px 14px", borderRadius:"8px", border:"1.5px solid #334155", background:"#1e293b", color:"#94a3b8", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>‹‹ Themen</button>
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
              setTimeout(() => setSpeichernStatus(""), 3000);
            }} style={{ ...S.btnPrimary, background: speichernStatus === "ok" ? "#16a34a" : speichernStatus === "err" ? "#dc2626" : "#0369a1" }}>
              {speichernStatus === "saving" ? "⏳" : speichernStatus === "ok" ? "✓ Gespeichert" : speichernStatus === "err" ? "✗ Fehler" : "💾 Speichern"}
            </button>
          </div>
        </div>

        {/* Firmen-Vorspann */}
        {(() => {
          const duSie = config.klasse <= 9 ? "du" : "Sie";
          const duSieGross = config.klasse <= 9 ? "Du" : "Sie";
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
            <div style={{ marginTop: "18px", padding: "14px 18px", background: firma.farbe + "0d", border: `1px solid ${firma.farbe}33`, borderLeft: `4px solid ${firma.farbe}`, borderRadius: "10px" }}>
              <div style={{ fontSize: "13px", color: "#374151", marginBottom: "8px" }}>
                <strong>{firma.icon} {firma.name}</strong>, {firma.plz} {firma.ort} – {firma.slogan} {intro}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "5px", fontSize: "12px", color: "#374151", marginBottom: "8px" }}>
                <div><strong>Rechtsform:</strong> {firma.rechtsform}</div>
                <div><strong>Inhaber/in:</strong> {firma.inhaber}</div>
                <div><strong>Branche:</strong> {firma.branche}</div>
                <div><strong>IBAN:</strong> {fmtIBAN(firma.iban).slice(0, 18)}…</div>
              </div>
              {/* Werkstoffe */}
              <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px" }}>
                {wtLabels.map(([label, list]) => (
                  <div key={label} style={{ fontSize: "12px", color: "#374151" }}>
                    <strong>{label}:</strong> {list.join(", ")}
                  </div>
                ))}
              </div>
              <div style={{ padding: "6px 10px", background: "rgba(255,255,255,0.6)", borderRadius: "6px", fontSize: "11px", color: "#475569" }}>
                <strong>Formale Vorgaben:</strong> Bei Buchungssätzen sind Kontonummer, Kontobezeichnung und Betrag anzugeben. Ergebnisse auf zwei Nachkommastellen runden. Sofern nicht anders angegeben: USt-Satz 19 %.
              </div>
            </div>
          );
        })()}
      </div>

      <PunktePanel aufgaben={aufgaben} typ={config.typ} />

      {aufgaben.map((a, i) =>
        a.taskTyp === "komplex"
          ? <KomplexKarte  key={a.id} aufgabe={a} nr={i + 1} showLoesung={showLoesungen} globalMode={globalMode} klasse={config.klasse} />
          : a.taskTyp === "theorie"
          ? <TheorieKarte  key={a.id} aufgabe={a} nr={i + 1} showLoesung={showLoesungen} klasse={config.klasse} />
          : <AufgabeKarte  key={a.id} aufgabe={a} nr={i + 1} showLoesung={showLoesungen} globalMode={globalMode} klasse={config.klasse} />
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", alignItems:"center" }}>
        <button onClick={onFirma} style={{ padding:"8px 16px", borderRadius:"8px", border:"1.5px solid #334155", background:"transparent", color:"#94a3b8", fontWeight:700, fontSize:12, cursor:"pointer" }}>‹ Unternehmen</button>
        <button onClick={onThemen} style={{ padding:"8px 16px", borderRadius:"8px", border:"1.5px solid #334155", background:"transparent", color:"#94a3b8", fontWeight:700, fontSize:12, cursor:"pointer" }}>‹‹ Themen</button>
        <button onClick={onNeu} style={S.btnSecondary}>✕ Neu starten</button>
        <button onClick={() => {
          try {
            const ki = JSON.parse(localStorage.getItem("buchungswerk_ki_export") || "[]");
            setKiHistorie(ki);
          } catch { setKiHistorie([]); }
          setExportOffen(true);
        }} style={{ ...S.btnPrimary, background: "#16a34a" }}>📄 Word/PDF exportieren</button>
        <button onClick={() => setH5pOffen(true)} style={{ ...S.btnPrimary, background: "#7c3aed" }}>🖥 H5P exportieren</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// BELEG-EDITOR MODAL (eingebettet aus BelegEditor.jsx)
// ══════════════════════════════════════════════════════════════════════════════

const be_fmt = n => (isNaN(n) ? "0,00" : Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const be_uid = () => Math.random().toString(36).slice(2, 8);

const BELEGTYPEN = [
  { id: "eingangsrechnung", label: "Eingangsrechnung", icon: "📥" },
  { id: "ausgangsrechnung", label: "Ausgangsrechnung", icon: "📤" },
  { id: "kontoauszug",      label: "Kontoauszug",      icon: "🏦" },
  { id: "ueberweisung",     label: "Überweisung",       icon: "💸" },
  { id: "email",            label: "E-Mail",            icon: "✉️"  },
  { id: "quittung",         label: "Quittung",          icon: "🧾" },
];

const MODELLUNTERNEHMEN = [
  { name: "LumiTec GmbH",         ort: "Ingolstadt", strasse: "Solarstraße 12"     },
  { name: "Waldform Design GmbH", ort: "Straubing",  strasse: "Holzmarkt 5"        },
  { name: "AlpenTextil KG",       ort: "Kaufbeuren", strasse: "Weberweg 8"         },
  { name: "VitaSport GmbH",       ort: "Landsberg",  strasse: "Sportpark-Allee 3"  },
];

// ── Default-Zustände ─────────────────────────────────────────────────────────
const defaultEingangsrechnung = () => {
  const mu = MODELLUNTERNEHMEN[Math.floor(Math.random() * MODELLUNTERNEHMEN.length)];
  return {
    lieferantName: "Müller GmbH", lieferantStrasse: "Industriestr. 7",
    lieferantPlz: "80333", lieferantOrt: "München", lieferantUStId: "DE123456789",
    rechnungsNr: `RE-2025-${Math.floor(1000 + Math.random()*9000)}`,
    datum: new Date().toISOString().slice(0, 10), zahlungsziel: "30", ustSatz: "19",
    skontoPct: "2", skontoTage: "14",
    positionen: [{ id: be_uid(), artikel: "Rohstoffe", menge: "500", einheit: "kg", ep: "12,00", highlight: false }],
    bezugskosten: "0", empfaengerName: mu.name, empfaengerStrasse: mu.strasse,
    empfaengerPlz: "86150", empfaengerOrt: mu.ort, rabattAktiv: false,
    rabattArt: "Mengenrabatt", rabattPct: "5",
  };
};
const defaultAusgangsrechnung = () => {
  const mu = MODELLUNTERNEHMEN[Math.floor(Math.random() * MODELLUNTERNEHMEN.length)];
  return {
    kundeName: "Technik Handel GmbH", kundeStrasse: "Marktplatz 3",
    kundePlz: "85049", kundeOrt: "Ingolstadt", kundeUStId: "DE987654321",
    rechnungsNr: `AR-2025-${Math.floor(1000 + Math.random()*9000)}`,
    datum: new Date().toISOString().slice(0, 10), zahlungsziel: "30", ustSatz: "19",
    skontoPct: "2", skontoTage: "14",
    positionen: [{ id: be_uid(), artikel: "Fertigerzeugnisse", menge: "100", einheit: "Stk", ep: "45,00", highlight: false }],
    absenderName: mu.name, absenderStrasse: mu.strasse, absenderPlz: "86150", absenderOrt: mu.ort,
    rabattAktiv: false, rabattArt: "Mengenrabatt", rabattPct: "5",
  };
};
const defaultKontoauszug = () => ({
  bank: "Volksbank Bayern eG", inhaber: "LumiTec GmbH",
  iban: "DE12 3456 7890 1234 5678 90", bic: "VOBADEMMXXX",
  datum: new Date().toISOString().slice(0, 10), saldoVor: "12.450,00",
  buchungen: [
    { id: be_uid(), datum: new Date(Date.now()-5*86400000).toISOString().slice(0,10), text: "Überweisung Lieferant",  betrag: "-3.200,00", highlight: false },
    { id: be_uid(), datum: new Date(Date.now()-2*86400000).toISOString().slice(0,10), text: "Eingang Kundenzahlung",  betrag: "+8.500,00", highlight: false },
    { id: be_uid(), datum: new Date().toISOString().slice(0,10),                      text: "Buchung markieren →",    betrag: "-450,00",   highlight: true  },
  ],
});
const defaultUeberweisung = () => ({
  auftraggeberName: "LumiTec GmbH", auftraggeberIban: "DE12 3456 7890 1234 5678 90",
  empfaengerName: "Müller GmbH",    empfaengerIban:   "DE98 7654 3210 9876 5432 10",
  betrag: "3.200,00", verwendung: "RE-2025-1042",
  datum: new Date().toISOString().slice(0, 10), skontoBetrag: "0",
});
const defaultEmail = () => ({
  von: "bestellung@lumitec-gmbh.de", an: "vertrieb@mueller-gmbh.de",
  datum: new Date().toISOString().slice(0, 10), betreff: "Bestellung Nr. 2025-042",
  text: "Sehr geehrte Damen und Herren,\n\nhiermit bestellen wir:\n\n500 kg Rohstoffe à 12,00 € netto\n\nMit freundlichen Grüßen\nLumiTec GmbH",
});
const defaultQuittung = () => ({
  aussteller: "Bürobedarf Schreiber", empfaenger: "LumiTec GmbH",
  betrag: "119,00", zweck: "Druckerpapier und Büromaterial",
  datum: new Date().toISOString().slice(0, 10), barzahlung: true,
  quittungsNr: `Q-${Math.floor(100 + Math.random()*900)}`,
});

// ── CSS (als scoped <style> im Modal) ────────────────────────────────────────
const BE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  .be-root *, .be-root *::before, .be-root *::after { box-sizing: border-box; }
  .be-root { font-family: 'IBM Plex Sans', system-ui, sans-serif; color: #0f172a; height: 100%; display: flex; flex-direction: column; }
  .be-typ-bar { background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; padding: 0 20px; gap: 4px; flex-shrink: 0; }
  .be-typ-tab { padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; border: none; background: none; border-bottom: 3px solid transparent; transition: all .15s; white-space: nowrap; font-family: inherit; }
  .be-typ-tab:hover { color: #0f172a; }
  .be-typ-tab.active { color: #0f172a; border-bottom-color: #f59e0b; }
  .be-body { display: grid; grid-template-columns: 360px 1fr; gap: 16px; padding: 16px 20px; flex: 1; overflow: hidden; align-items: start; }
  .be-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .be-panel-head { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; }
  .be-panel-body { padding: 16px; overflow-y: auto; max-height: calc(100vh - 240px); }
  .be-field-group { margin-bottom: 14px; }
  .be-field-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
  .be-field-input { width: 100%; padding: 7px 9px; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: 12px; font-family: inherit; color: #0f172a; background: #fff; transition: border-color .15s; outline: none; }
  .be-field-input:focus { border-color: #0f172a; }
  .be-field-row { display: grid; gap: 8px; }
  .be-field-row-2 { grid-template-columns: 1fr 1fr; }
  .be-field-row-3 { grid-template-columns: 1fr 1fr 1fr; }
  textarea.be-field-input { resize: vertical; min-height: 90px; line-height: 1.5; }
  select.be-field-input { cursor: pointer; }
  .be-divider { border: none; border-top: 1px dashed #e2e8f0; margin: 12px 0; }
  .be-pos-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 6px; }
  .be-pos-table th { background: #f8fafc; padding: 5px 6px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #e2e8f0; }
  .be-pos-table td { padding: 4px 5px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .be-pos-input { width: 100%; padding: 4px 6px; border: 1.5px solid #e2e8f0; border-radius: 4px; font-size: 11px; font-family: 'IBM Plex Mono', monospace; outline: none; background: #fff; }
  .be-pos-input:focus { border-color: #0f172a; }
  .be-pos-input.wide { font-family: inherit; }
  .be-btn-del { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px; padding: 2px 4px; border-radius: 3px; }
  .be-btn-del:hover { background: #fee2e2; }
  .be-btn-add { width: 100%; padding: 6px; border: 1.5px dashed #e2e8f0; border-radius: 6px; background: none; font-size: 11px; font-weight: 600; color: #94a3b8; cursor: pointer; transition: all .15s; font-family: inherit; }
  .be-btn-add:hover { border-color: #0f172a; color: #0f172a; background: #f8fafc; }
  .be-hl-toggle { width: 28px; height: 16px; background: #e2e8f0; border: none; border-radius: 8px; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
  .be-hl-toggle.on { background: #f59e0b; }
  .be-hl-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background: #fff; border-radius: 50%; transition: left .2s; }
  .be-hl-toggle.on::after { left: 14px; }
  .be-action-bar { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc; flex-direction: column; }
  .be-btn-save { padding: 9px 14px; background: #0f172a; color: #fff; border: none; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background .15s; }
  .be-btn-save:hover { background: #1e293b; }
  .be-btn-print { padding: 9px 14px; background: #fff; color: #0f172a; border: 1.5px solid #e2e8f0; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .be-btn-print:hover { border-color: #0f172a; }
  .be-preview-wrap { padding: 16px; background: #f8fafc; overflow-y: auto; max-height: calc(100vh - 240px); }
  .be-vorlage-bar { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 12px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; align-items: center; }
  .be-vorlage-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; margin-right: 3px; white-space: nowrap; }
  .be-vorlage-btn { padding: 3px 8px; border: 1.5px solid #e2e8f0; border-radius: 20px; background: #fff; font-size: 10px; font-weight: 600; color: #475569; cursor: pointer; transition: all .15s; white-space: nowrap; font-family: inherit; }
  .be-vorlage-btn:hover { border-color: #0f172a; color: #0f172a; }
  .be-rabatt-block { border: 1.5px solid #e2e8f0; border-radius: 7px; overflow: hidden; margin-bottom: 14px; }
  .be-rabatt-toggle-row { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: #f8fafc; cursor: pointer; user-select: none; }
  .be-rabatt-toggle-row:hover { background: #f1f5f9; }
  .be-rabatt-toggle-label { font-size: 12px; font-weight: 700; color: #475569; flex: 1; }
  .be-rabatt-badge { font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
  .be-rabatt-badge.on  { background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; }
  .be-rabatt-badge.off { background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; }
  .be-rabatt-felder { padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1px solid #e2e8f0; }
  .be-rechnung { background: #fff; border: 1px solid #e2e8f0; border-radius: 7px; font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; overflow: hidden; }
  .be-re-head { background: #0f172a; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: flex-start; }
  .be-re-head-firma { font-weight: 700; font-size: 13px; }
  .be-re-head-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .be-re-head-badge { background: #f59e0b; color: #0f172a; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 3px; text-transform: uppercase; letter-spacing: .06em; }
  .be-re-body { padding: 14px 16px; }
  .be-re-adressen { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .be-re-adr-label { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 3px; }
  .be-re-adr-name { font-weight: 700; font-size: 12px; }
  .be-re-adr-sub { font-size: 11px; color: #475569; }
  .be-re-meta { display: flex; gap: 16px; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 6px 0; margin-bottom: 12px; flex-wrap: wrap; }
  .be-re-meta-item { font-size: 10px; }
  .be-re-meta-label { color: #94a3b8; font-weight: 600; }
  .be-re-meta-val { font-weight: 700; margin-left: 3px; }
  .be-re-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
  .be-re-table th { background: #f8fafc; padding: 6px 7px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
  .be-re-table th:last-child, .be-re-table td:last-child { text-align: right; }
  .be-re-table td { padding: 6px 7px; border-bottom: 1px solid #f1f5f9; }
  .be-re-table tr.hl td { background: #fffbeb; border-left: 3px solid #f59e0b; font-weight: 700; }
  .be-re-summen { display: flex; justify-content: flex-end; }
  .be-re-summen-box { width: 200px; }
  .be-re-sum-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
  .be-re-sum-row.total { font-weight: 800; font-size: 13px; border-top: 2px solid #0f172a; margin-top: 3px; padding-top: 5px; }
  .be-re-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 8px 16px; font-size: 10px; color: #64748b; display: flex; gap: 16px; }
  .be-ka { background: #fff; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; font-size: 11px; }
  .be-ka-head { background: #1e3a5f; color: #fff; padding: 10px 14px; }
  .be-ka-head-bank { font-weight: 800; font-size: 13px; }
  .be-ka-head-sub { font-size: 10px; color: #93c5fd; margin-top: 1px; }
  .be-ka-meta { background: #e0f2fe; padding: 7px 14px; display: flex; justify-content: space-between; font-size: 10px; color: #0c4a6e; font-weight: 600; flex-wrap: wrap; gap: 4px; }
  .be-ka-table { width: 100%; border-collapse: collapse; }
  .be-ka-table th { background: #f8fafc; padding: 5px 10px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #e2e8f0; }
  .be-ka-table th.right { text-align: right; }
  .be-ka-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  .be-ka-table td.right { text-align: right; font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
  .be-ka-table tr.hl td { background: #fffbeb; }
  .be-ka-table tr.hl td.text-col { border-left: 3px solid #f59e0b; font-weight: 700; }
  .be-ka-pos { color: #059669; }
  .be-ka-neg { color: #dc2626; }
  .be-ka-hl-badge { display: inline-block; background: #f59e0b; color: #0f172a; font-size: 8px; font-weight: 800; padding: 1px 5px; border-radius: 3px; margin-left: 5px; vertical-align: middle; }
  .be-ub { background: #fff; border: 2px solid #0f172a; border-radius: 7px; overflow: hidden; font-size: 11px; }
  .be-ub-head { background: #0f172a; color: #fff; padding: 9px 14px; display: flex; justify-content: space-between; align-items: center; }
  .be-ub-head-title { font-weight: 800; font-size: 12px; letter-spacing: .05em; text-transform: uppercase; }
  .be-ub-head-sub { font-size: 9px; color: #94a3b8; }
  .be-ub-body { padding: 14px; }
  .be-ub-section { margin-bottom: 10px; }
  .be-ub-section-label { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px; }
  .be-ub-feld { border: 1px solid #e2e8f0; border-radius: 5px; padding: 7px 10px; background: #f8fafc; }
  .be-ub-feld-label { font-size: 8px; color: #94a3b8; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
  .be-ub-feld-val { font-weight: 700; font-size: 12px; margin-top: 1px; font-family: 'IBM Plex Mono', monospace; }
  .be-ub-feld-val.normal { font-family: inherit; }
  .be-ub-betrag-box { background: #0f172a; color: #fff; border-radius: 7px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
  .be-ub-betrag-label { font-size: 10px; color: #94a3b8; }
  .be-ub-betrag-val { font-size: 18px; font-weight: 800; font-family: 'IBM Plex Mono', monospace; color: #f59e0b; }
  .be-ub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .be-email { background: #fff; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; font-size: 12px; }
  .be-em-head { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 14px; }
  .be-em-betreff { font-weight: 700; font-size: 14px; margin-bottom: 7px; }
  .be-em-meta-row { display: flex; gap: 7px; font-size: 11px; margin-bottom: 2px; }
  .be-em-meta-label { color: #94a3b8; font-weight: 600; width: 36px; flex-shrink: 0; }
  .be-em-body { padding: 14px; line-height: 1.7; white-space: pre-wrap; font-size: 12px; color: #1e293b; }
  .be-quit { background: #fff; border: 2px solid #0f172a; border-radius: 7px; overflow: hidden; font-size: 12px; }
  .be-quit-head { border-bottom: 3px double #0f172a; padding: 12px 18px; display: flex; justify-content: space-between; align-items: flex-start; }
  .be-quit-title { font-size: 20px; font-weight: 900; letter-spacing: -.03em; }
  .be-quit-nr { font-size: 10px; color: #64748b; font-weight: 600; margin-top: 2px; }
  .be-quit-body { padding: 16px 18px; }
  .be-quit-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: baseline; }
  .be-quit-label { font-size: 11px; color: #64748b; width: 110px; flex-shrink: 0; font-weight: 600; }
  .be-quit-val { font-weight: 700; flex: 1; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
  .be-quit-betrag-box { border: 2px solid #0f172a; border-radius: 5px; padding: 9px 12px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center; }
  .be-quit-betrag-label { font-size: 11px; color: #64748b; font-weight: 600; }
  .be-quit-betrag-val { font-size: 18px; font-weight: 900; font-family: 'IBM Plex Mono', monospace; }
  .be-quit-footer { border-top: 1px solid #e2e8f0; padding: 10px 18px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
`;

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────
function parseGeld(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
}
function fmtDatum(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Formular-Unterkomponenten ─────────────────────────────────────────────────
function BePositionenEditor({ positionen, onChange }) {
  const update = (id, field, val) => onChange(positionen.map(p => p.id === id ? { ...p, [field]: val } : p));
  const add    = () => onChange([...positionen, { id: be_uid(), artikel: "", menge: "1", einheit: "Stk", ep: "0,00", highlight: false }]);
  const remove = id => onChange(positionen.filter(p => p.id !== id));
  return (
    <div>
      <table className="be-pos-table">
        <thead><tr><th>Artikel</th><th>Menge</th><th>Einh.</th><th>EP (€)</th><th>HL</th><th></th></tr></thead>
        <tbody>
          {positionen.map(p => (
            <tr key={p.id}>
              <td><input className="be-pos-input wide" value={p.artikel} onChange={e => update(p.id, "artikel", e.target.value)} /></td>
              <td><input className="be-pos-input" value={p.menge} style={{width:44}} onChange={e => update(p.id, "menge", e.target.value)} /></td>
              <td><input className="be-pos-input" value={p.einheit} style={{width:38}} onChange={e => update(p.id, "einheit", e.target.value)} /></td>
              <td><input className="be-pos-input" value={p.ep} style={{width:60}} onChange={e => update(p.id, "ep", e.target.value)} /></td>
              <td><button className={`be-hl-toggle ${p.highlight ? "on" : ""}`} onClick={() => update(p.id, "highlight", !p.highlight)} /></td>
              <td><button className="be-btn-del" onClick={() => remove(p.id)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="be-btn-add" onClick={add}>+ Position hinzufügen</button>
    </div>
  );
}

function BeBuchungenEditor({ buchungen, onChange }) {
  const update = (id, field, val) => onChange(buchungen.map(b => b.id === id ? { ...b, [field]: val } : b));
  const add    = () => onChange([...buchungen, { id: be_uid(), datum: new Date().toISOString().slice(0,10), text: "", betrag: "0,00", highlight: false }]);
  const remove = id => onChange(buchungen.filter(b => b.id !== id));
  return (
    <div>
      <table className="be-pos-table">
        <thead><tr><th>Datum</th><th>Verwendungszweck</th><th>Betrag (€)</th><th>HL</th><th></th></tr></thead>
        <tbody>
          {buchungen.map(b => (
            <tr key={b.id}>
              <td><input type="date" className="be-pos-input" value={b.datum} style={{width:110}} onChange={e => update(b.id, "datum", e.target.value)} /></td>
              <td><input className="be-pos-input wide" value={b.text} onChange={e => update(b.id, "text", e.target.value)} /></td>
              <td><input className="be-pos-input" value={b.betrag} style={{width:80}} placeholder="+1.200,00" onChange={e => update(b.id, "betrag", e.target.value)} /></td>
              <td><button className={`be-hl-toggle ${b.highlight ? "on" : ""}`} onClick={() => update(b.id, "highlight", !b.highlight)} /></td>
              <td><button className="be-btn-del" onClick={() => remove(b.id)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="be-btn-add" onClick={add}>+ Buchung hinzufügen</button>
    </div>
  );
}

function BeField({ label, value, onChange, type = "text", ...rest }) {
  return (
    <div className="be-field-group">
      <label className="be-field-label">{label}</label>
      {type === "textarea"
        ? <textarea className="be-field-input" value={value} onChange={e => onChange(e.target.value)} {...rest} />
        : type === "select"
          ? <select className="be-field-input" value={value} onChange={e => onChange(e.target.value)} {...rest}>
              {rest.options?.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
            </select>
          : <input type={type} className="be-field-input" value={value} onChange={e => onChange(e.target.value)} {...rest} />
      }
    </div>
  );
}

const BE_RABATT_ARTEN = ["Mengenrabatt", "Treuerabatt", "Sonderrabatt", "Wiederverkäuferrabatt"];

function BeVorlageBar({ label, onSelect }) {
  return (
    <div className="be-vorlage-bar">
      <span className="be-vorlage-label">⚡ {label}:</span>
      {MODELLUNTERNEHMEN.map(m => (
        <button key={m.name} className="be-vorlage-btn" onClick={() => onSelect(m)}>{m.name}</button>
      ))}
    </div>
  );
}

function BeRabattBlock({ data, set }) {
  return (
    <div className="be-rabatt-block">
      <div className="be-rabatt-toggle-row" onClick={() => set("rabattAktiv", !data.rabattAktiv)}>
        <button className={`be-hl-toggle ${data.rabattAktiv ? "on" : ""}`} onClick={e => { e.stopPropagation(); set("rabattAktiv", !data.rabattAktiv); }} />
        <span className="be-rabatt-toggle-label">Sofortrabatt</span>
        <span className={`be-rabatt-badge ${data.rabattAktiv ? "on" : "off"}`}>
          {data.rabattAktiv ? `${data.rabattArt} · ${data.rabattPct} %` : "kein Rabatt"}
        </span>
      </div>
      {data.rabattAktiv && (
        <div className="be-rabatt-felder">
          <div className="be-field-group" style={{margin:0}}>
            <label className="be-field-label">Rabattart</label>
            <select className="be-field-input" value={data.rabattArt} onChange={e => set("rabattArt", e.target.value)}>
              {BE_RABATT_ARTEN.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="be-field-group" style={{margin:0}}>
            <label className="be-field-label">Rabatt (%)</label>
            <input className="be-field-input" value={data.rabattPct} onChange={e => set("rabattPct", e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formular je Belegtyp ─────────────────────────────────────────────────────
function BeFormEingangsrechnung({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const fillEmpf = mu => setData(d => ({ ...d, empfaengerName: mu.name, empfaengerStrasse: mu.strasse, empfaengerPlz: "86150", empfaengerOrt: mu.ort }));
  return (
    <>
      <BeField label="Lieferant (Name)" value={data.lieferantName} onChange={v => set("lieferantName", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Straße" value={data.lieferantStrasse} onChange={v => set("lieferantStrasse", v)} />
        <BeField label="PLZ / Ort" value={`${data.lieferantPlz} ${data.lieferantOrt}`}
          onChange={v => { const [plz, ...rest] = v.split(" "); set("lieferantPlz", plz); set("lieferantOrt", rest.join(" ")); }} />
      </div>
      <hr className="be-divider" />
      <BeVorlageBar label="Empfänger-Vorlage" onSelect={fillEmpf} />
      <BeField label="Empfänger (Name)" value={data.empfaengerName} onChange={v => set("empfaengerName", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Straße" value={data.empfaengerStrasse} onChange={v => set("empfaengerStrasse", v)} />
        <BeField label="PLZ / Ort" value={`${data.empfaengerPlz} ${data.empfaengerOrt}`}
          onChange={v => { const [plz, ...rest] = v.split(" "); set("empfaengerPlz", plz); set("empfaengerOrt", rest.join(" ")); }} />
      </div>
      <hr className="be-divider" />
      <div className="be-field-row be-field-row-2">
        <BeField label="USt-Satz (%)" value={data.ustSatz} type="select" onChange={v => set("ustSatz", v)}
          options={[{value:"19",label:"19 %"},{value:"7",label:"7 %"},{value:"0",label:"0 % (steuerfrei)"}]} />
        <BeField label="Zahlungsziel (Tage)" value={data.zahlungsziel} onChange={v => set("zahlungsziel", v)} />
      </div>
      <div className="be-field-row be-field-row-3">
        <BeField label="Rechnungs-Nr." value={data.rechnungsNr} onChange={v => set("rechnungsNr", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
        <BeField label="Bezugskosten (€ netto)" value={data.bezugskosten} onChange={v => set("bezugskosten", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Skonto (%)" value={data.skontoPct} onChange={v => set("skontoPct", v)} />
        <BeField label="Skonto innerhalb (Tage)" value={data.skontoTage} onChange={v => set("skontoTage", v)} />
      </div>
      <BeRabattBlock data={data} set={set} />
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>📦 POSITIONEN · Gelbe Zeile = zu buchende Position</div>
      <BePositionenEditor positionen={data.positionen} onChange={v => set("positionen", v)} />
    </>
  );
}

function BeFormAusgangsrechnung({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const fillAbs = mu => setData(d => ({ ...d, absenderName: mu.name, absenderStrasse: mu.strasse, absenderPlz: "86150", absenderOrt: mu.ort }));
  return (
    <>
      <BeVorlageBar label="Absender-Vorlage" onSelect={fillAbs} />
      <BeField label="Absender (Name)" value={data.absenderName} onChange={v => set("absenderName", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Straße" value={data.absenderStrasse} onChange={v => set("absenderStrasse", v)} />
        <BeField label="PLZ / Ort" value={`${data.absenderPlz} ${data.absenderOrt}`}
          onChange={v => { const [plz, ...rest] = v.split(" "); set("absenderPlz", plz); set("absenderOrt", rest.join(" ")); }} />
      </div>
      <hr className="be-divider" />
      <BeField label="Kunde (Name)" value={data.kundeName} onChange={v => set("kundeName", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Straße" value={data.kundeStrasse} onChange={v => set("kundeStrasse", v)} />
        <BeField label="PLZ / Ort" value={`${data.kundePlz} ${data.kundeOrt}`}
          onChange={v => { const [plz, ...rest] = v.split(" "); set("kundePlz", plz); set("kundeOrt", rest.join(" ")); }} />
      </div>
      <hr className="be-divider" />
      <div className="be-field-row be-field-row-2">
        <BeField label="USt-Satz (%)" value={data.ustSatz} type="select" onChange={v => set("ustSatz", v)}
          options={[{value:"19",label:"19 %"},{value:"7",label:"7 %"},{value:"0",label:"0 % (steuerfrei)"}]} />
        <BeField label="Zahlungsziel (Tage)" value={data.zahlungsziel} onChange={v => set("zahlungsziel", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Rechnungs-Nr." value={data.rechnungsNr} onChange={v => set("rechnungsNr", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Skonto (%)" value={data.skontoPct} onChange={v => set("skontoPct", v)} />
        <BeField label="Skonto innerhalb (Tage)" value={data.skontoTage} onChange={v => set("skontoTage", v)} />
      </div>
      <BeRabattBlock data={data} set={set} />
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>📦 POSITIONEN</div>
      <BePositionenEditor positionen={data.positionen} onChange={v => set("positionen", v)} />
    </>
  );
}

function BeFormKontoauszug({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <>
      <BeField label="Bank" value={data.bank} onChange={v => set("bank", v)} />
      <div className="be-field-row be-field-row-2">
        <BeField label="Kontoinhaber" value={data.inhaber} onChange={v => set("inhaber", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="IBAN" value={data.iban} onChange={v => set("iban", v)} />
        <BeField label="Saldo Vortrag (€)" value={data.saldoVor} onChange={v => set("saldoVor", v)} />
      </div>
      <hr className="be-divider" />
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>💳 BUCHUNGEN · Gelbe Zeile = Buchungsaufgabe</div>
      <BeBuchungenEditor buchungen={data.buchungen} onChange={v => set("buchungen", v)} />
    </>
  );
}

function BeFormUeberweisung({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <>
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>👤 AUFTRAGGEBER</div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Name" value={data.auftraggeberName} onChange={v => set("auftraggeberName", v)} />
        <BeField label="IBAN" value={data.auftraggeberIban} onChange={v => set("auftraggeberIban", v)} />
      </div>
      <hr className="be-divider" />
      <div className="be-panel-head" style={{margin:"0 -16px 10px",padding:"7px 16px",fontSize:9}}>🏢 EMPFÄNGER</div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Name" value={data.empfaengerName} onChange={v => set("empfaengerName", v)} />
        <BeField label="IBAN" value={data.empfaengerIban} onChange={v => set("empfaengerIban", v)} />
      </div>
      <hr className="be-divider" />
      <div className="be-field-row be-field-row-2">
        <BeField label="Betrag (€)" value={data.betrag} onChange={v => set("betrag", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
      </div>
      <BeField label="Verwendungszweck" value={data.verwendung} onChange={v => set("verwendung", v)} />
      <BeField label="Skonto-Abzug (€, 0 = keiner)" value={data.skontoBetrag} onChange={v => set("skontoBetrag", v)} />
    </>
  );
}

function BeFormEmail({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <>
      <div className="be-field-row be-field-row-2">
        <BeField label="Von" value={data.von} onChange={v => set("von", v)} />
        <BeField label="An" value={data.an} onChange={v => set("an", v)} />
      </div>
      <div className="be-field-row be-field-row-2">
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
        <BeField label="Betreff" value={data.betreff} onChange={v => set("betreff", v)} />
      </div>
      <BeField label="Nachricht" type="textarea" value={data.text} onChange={v => set("text", v)} style={{minHeight:140}} />
    </>
  );
}

function BeFormQuittung({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <>
      <div className="be-field-row be-field-row-2">
        <BeField label="Quittungs-Nr." value={data.quittungsNr} onChange={v => set("quittungsNr", v)} />
        <BeField label="Datum" type="date" value={data.datum} onChange={v => set("datum", v)} />
      </div>
      <BeField label="Aussteller (Empfänger des Geldes)" value={data.aussteller} onChange={v => set("aussteller", v)} />
      <BeField label="Zahlender (Unternehmen)" value={data.empfaenger} onChange={v => set("empfaenger", v)} />
      <BeField label="Betrag (€ brutto)" value={data.betrag} onChange={v => set("betrag", v)} />
      <BeField label="Verwendungszweck / Ware" value={data.zweck} onChange={v => set("zweck", v)} />
    </>
  );
}

// ── Vorschau-Komponenten ─────────────────────────────────────────────────────
// ── Modernes Beleg-Design ────────────────────────────────────────────────────
const BV = {
  // Rechnung: zweispaltiger Header, Accent-Streifen links, saubere Tabelle
  re: {
    wrap: { fontFamily:"'IBM Plex Sans',system-ui,sans-serif", fontSize:12, background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,.07)" },
    accent: { height:4, background:"linear-gradient(90deg,#0f172a 0%,#334155 60%,#f59e0b 100%)" },
    header: { display:"grid", gridTemplateColumns:"1fr auto", gap:16, padding:"18px 20px 14px", borderBottom:"1px solid #f1f5f9" },
    firma: { fontWeight:800, fontSize:15, color:"#0f172a", marginBottom:2 },
    adrsub: { fontSize:11, color:"#64748b", lineHeight:1.6 },
    typBadge: active => ({ display:"inline-block", padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:".04em", background: active ? "#f59e0b" : "#f1f5f9", color: active ? "#0f172a" : "#64748b", border: active ? "none" : "1px solid #e2e8f0", alignSelf:"flex-start" }),
    body: { padding:"14px 20px" },
    adressgrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:14 },
    adrlabel: { fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:4 },
    adrname: { fontWeight:700, fontSize:13 },
    adrsub2: { fontSize:11, color:"#64748b", marginTop:1 },
    chips: { display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 },
    chip: { padding:"3px 10px", borderRadius:20, background:"#f8fafc", border:"1px solid #e2e8f0", fontSize:10, color:"#64748b", fontWeight:600 },
    table: { width:"100%", borderCollapse:"collapse", fontSize:11, marginBottom:12 },
    th: { background:"#f8fafc", padding:"7px 8px", textAlign:"left", fontSize:9, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"#94a3b8", borderBottom:"2px solid #e2e8f0" },
    td: { padding:"7px 8px", borderBottom:"1px solid #f8fafc", verticalAlign:"middle" },
    tdR: { padding:"7px 8px", borderBottom:"1px solid #f8fafc", textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" },
    hlRow: { background:"#fffbeb", borderLeft:"3px solid #f59e0b" },
    sumBox: { display:"flex", justifyContent:"flex-end", marginTop:4 },
    sumInner: { width:220, borderTop:"1px solid #e2e8f0", paddingTop:10 },
    sumRow: { display:"flex", justifyContent:"space-between", fontSize:11, padding:"2px 0", color:"#475569" },
    sumTotal: { display:"flex", justifyContent:"space-between", fontSize:14, fontWeight:800, color:"#0f172a", borderTop:"2px solid #0f172a", marginTop:6, paddingTop:7 },
    footer: { background:"#f8fafc", borderTop:"1px solid #f1f5f9", padding:"9px 20px", display:"flex", gap:20, fontSize:10, color:"#94a3b8" },
  },
};

function BeVorschauRechnung({ data, typ }) {
  const isAusgang = typ === "ausgangsrechnung";
  const absender = isAusgang
    ? { name: data.absenderName, strasse: data.absenderStrasse, plz: data.absenderPlz, ort: data.absenderOrt, ustId: "—" }
    : { name: data.lieferantName, strasse: data.lieferantStrasse, plz: data.lieferantPlz, ort: data.lieferantOrt, ustId: data.lieferantUStId };
  const empfNamen = isAusgang ? data.kundeName : data.empfaengerName;
  const empfAdr1  = isAusgang ? data.kundeStrasse : data.empfaengerStrasse;
  const empfAdr2  = isAusgang ? `${data.kundePlz} ${data.kundeOrt}` : `${data.empfaengerPlz} ${data.empfaengerOrt}`;

  const ust = Number(data.ustSatz) / 100;
  let warenwert = 0;
  data.positionen.forEach(p => { warenwert += parseGeld(p.menge) * parseGeld(p.ep); });
  const bezug        = parseGeld(data.bezugskosten);
  const rabattPct    = data.rabattAktiv ? (parseFloat(data.rabattPct) || 0) : 0;
  const rabattBetrag = r2(warenwert * rabattPct / 100);
  const netto        = r2(warenwert - rabattBetrag + bezug);
  const ustBetrag    = r2(netto * ust);
  const brutto       = r2(netto + ustBetrag);
  const skontoBetrag = r2(brutto * parseFloat(data.skontoPct || 0) / 100);
  const R = BV.re;

  return (
    <div style={R.wrap}>
      <div style={R.accent} />
      <div style={R.header}>
        <div>
          <div style={R.firma}>{absender.name}</div>
          <div style={R.adrsub}>{absender.strasse} · {absender.plz} {absender.ort}</div>
          {absender.ustId && absender.ustId !== "—" && <div style={R.adrsub}>USt-IdNr: {absender.ustId}</div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={R.typBadge(true)}>{isAusgang ? "RECHNUNG" : "EINGANGSRECHNUNG"}</div>
          <div style={{fontSize:11,color:"#64748b",marginTop:8}}>Nr. <strong style={{color:"#0f172a"}}>{data.rechnungsNr}</strong></div>
          <div style={{fontSize:11,color:"#64748b"}}>Datum: <strong style={{color:"#0f172a"}}>{fmtDatum(data.datum)}</strong></div>
        </div>
      </div>
      <div style={R.body}>
        <div style={R.adressgrid}>
          <div>
            <div style={R.adrlabel}>Rechnungsempfänger</div>
            <div style={R.adrname}>{empfNamen}</div>
            <div style={R.adrsub2}>{empfAdr1}</div>
            <div style={R.adrsub2}>{empfAdr2}</div>
          </div>
          <div>
            <div style={R.adrlabel}>Zahlungskonditionen</div>
            <div style={{...R.adrsub2, marginBottom:3}}>Zahlungsziel: <strong>{data.zahlungsziel} Tage</strong></div>
            {parseFloat(data.skontoPct) > 0 && <div style={R.adrsub2}>Skonto: <strong>{data.skontoPct} %</strong> bei Zahlung in <strong>{data.skontoTage} Tagen</strong></div>}
            <div style={R.adrsub2}>USt-Satz: <strong>{data.ustSatz} %</strong></div>
          </div>
        </div>

        <table style={R.table}>
          <thead>
            <tr>
              {["Pos.", "Bezeichnung", "Menge", "Einh.", "EP netto", "Gesamt netto"].map((h,i) =>
                <th key={i} style={{...R.th, textAlign: i>=2 ? "right" : "left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.positionen.map((p, i) => {
              const gp = r2(parseGeld(p.menge) * parseGeld(p.ep));
              const hl = p.highlight;
              return (
                <tr key={p.id} style={hl ? R.hlRow : {}}>
                  <td style={{...R.td, ...(hl?{borderLeft:"3px solid #f59e0b"}:{})}}>{i+1}</td>
                  <td style={{...R.td, fontWeight: hl ? 700 : 400}}>{p.artikel}{hl && <span style={{marginLeft:6,fontSize:9,background:"#f59e0b",color:"#0f172a",padding:"1px 5px",borderRadius:3,fontWeight:800}}>BUCHEN</span>}</td>
                  <td style={{...R.tdR}}>{p.menge}</td>
                  <td style={{...R.td}}>{p.einheit}</td>
                  <td style={{...R.tdR}}>{be_fmt(parseGeld(p.ep))} €</td>
                  <td style={{...R.tdR, fontWeight:600}}>{be_fmt(gp)} €</td>
                </tr>
              );
            })}
            {bezug > 0 && (
              <tr>
                <td style={R.td}></td>
                <td style={{...R.td, color:"#64748b", fontStyle:"italic"}}>Bezugskosten (Transport/Fracht)</td>
                <td colSpan={3} style={R.td}></td>
                <td style={{...R.tdR, color:"#64748b"}}>{be_fmt(bezug)} €</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={R.sumBox}>
          <div style={R.sumInner}>
            <div style={R.sumRow}><span>Warenwert (netto)</span><span>{be_fmt(warenwert)} €</span></div>
            {rabattBetrag > 0 && <div style={{...R.sumRow, color:"#b45309"}}><span>− {data.rabattArt} ({data.rabattPct} %)</span><span>−{be_fmt(rabattBetrag)} €</span></div>}
            {bezug > 0 && <div style={R.sumRow}><span>+ Bezugskosten</span><span>{be_fmt(bezug)} €</span></div>}
            <div style={R.sumRow}><span>Nettobetrag</span><span style={{fontWeight:600,color:"#0f172a"}}>{be_fmt(netto)} €</span></div>
            {ust > 0 && <div style={R.sumRow}><span>zzgl. {data.ustSatz} % USt</span><span>{be_fmt(ustBetrag)} €</span></div>}
            <div style={R.sumTotal}><span>Rechnungsbetrag</span><span style={{fontFamily:"'IBM Plex Mono',monospace"}}>{be_fmt(brutto)} €</span></div>
            {skontoBetrag > 0 && (
              <div style={{...R.sumRow, fontSize:10, marginTop:6, background:"#f0fdf4", padding:"4px 8px", borderRadius:4, color:"#15803d"}}>
                <span>Bei Skonto ({data.skontoPct} %) zahlen:</span>
                <span style={{fontWeight:700}}>{be_fmt(r2(brutto - skontoBetrag))} €</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={R.footer}>
        <span>Rechnungsnummer: {data.rechnungsNr}</span>
        <span>Rechnungsdatum: {fmtDatum(data.datum)}</span>
        {absender.ustId && <span>USt-IdNr: {absender.ustId}</span>}
      </div>
    </div>
  );
}

function BeVorschauKontoauszug({ data }) {
  let saldo = parseGeld(data.saldoVor);
  const rows = data.buchungen.map(b => {
    const raw = b.betrag.replace(/\s/g,"");
    const neg = raw.startsWith("-");
    const num = parseGeld(neg ? raw.slice(1) : (raw.startsWith("+") ? raw.slice(1) : raw)) * (neg ? -1 : 1);
    saldo = r2(saldo + num);
    return { ...b, betragNum: num, saldoNach: saldo };
  });
  return (
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",fontSize:12,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
      {/* Bank-Header */}
      <div style={{background:"linear-gradient(135deg,#1e3a5f 0%,#1e40af 100%)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontWeight:900,fontSize:16,color:"#fff",letterSpacing:"-.01em"}}>{data.bank}</div>
          <div style={{fontSize:10,color:"#93c5fd",marginTop:2}}>Kontoauszug vom {fmtDatum(data.datum)}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:"#93c5fd"}}>Kontoinhaber</div>
          <div style={{fontWeight:700,color:"#fff",fontSize:12}}>{data.inhaber}</div>
        </div>
      </div>
      {/* IBAN-Strip */}
      <div style={{background:"#dbeafe",padding:"6px 20px",display:"flex",justifyContent:"space-between",fontSize:10,color:"#1e40af",fontWeight:600}}>
        <span>IBAN: {data.iban}</span>
        <span>Saldo Vortrag: <strong>{data.saldoVor} €</strong></span>
      </div>
      {/* Buchungen */}
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead>
          <tr style={{background:"#f8fafc"}}>
            {["Datum","Buchungstext","Betrag","Saldo"].map((h,i) =>
              <th key={i} style={{padding:"7px 12px",textAlign:i>=2?"right":"left",fontSize:9,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#94a3b8",borderBottom:"2px solid #e2e8f0"}}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((b,i) => (
            <tr key={b.id} style={{background: b.highlight ? "#fffbeb" : i%2===0 ? "#fff" : "#fafafa"}}>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",color:"#64748b",whiteSpace:"nowrap"}}>{fmtDatum(b.datum)}</td>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",fontWeight: b.highlight ? 700 : 400, borderLeft: b.highlight ? "3px solid #f59e0b" : "3px solid transparent"}}>
                {b.text}
                {b.highlight && <span style={{marginLeft:8,fontSize:9,background:"#f59e0b",color:"#0f172a",padding:"2px 6px",borderRadius:3,fontWeight:800}}>▶ BUCHEN</span>}
              </td>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",textAlign:"right",fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color: b.betragNum >= 0 ? "#059669" : "#dc2626"}}>
                {b.betragNum >= 0 ? "+" : ""}{be_fmt(b.betragNum)} €
              </td>
              <td style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",textAlign:"right",fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,color:"#0f172a"}}>
                {be_fmt(b.saldoNach)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BeVorschauUeberweisung({ data }) {
  const betragNum   = parseGeld(data.betrag);
  const skontoNum   = parseGeld(data.skontoBetrag);
  const ueberBetrag = r2(betragNum - skontoNum);
  const IbanFeld = ({label, name, iban}) => (
    <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px"}}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#94a3b8",marginBottom:4}}>{label}</div>
      <div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:2}}>{name}</div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"#475569",letterSpacing:".06em"}}>{iban}</div>
    </div>
  );
  return (
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",fontSize:12,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
      <div style={{height:4,background:"linear-gradient(90deg,#0f172a,#334155,#0ea5e9)"}} />
      <div style={{padding:"14px 20px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #f1f5f9"}}>
        <div>
          <div style={{fontWeight:800,fontSize:14,letterSpacing:"-.01em",color:"#0f172a"}}>SEPA-Überweisungsbeleg</div>
          <div style={{fontSize:10,color:"#64748b",marginTop:1}}>{fmtDatum(data.datum)}</div>
        </div>
        <div style={{fontSize:10,color:"#64748b",background:"#f1f5f9",padding:"3px 10px",borderRadius:20,fontWeight:600}}>SEPA Credit Transfer</div>
      </div>
      <div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <IbanFeld label="Auftraggeber" name={data.auftraggeberName} iban={data.auftraggeberIban} />
          <IbanFeld label="Empfänger" name={data.empfaengerName} iban={data.empfaengerIban} />
        </div>
        <div style={{background:"#0f172a",borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>Überweisungsbetrag</div>
            {skontoNum > 0 && <div style={{fontSize:10,color:"#64748b"}}>{be_fmt(betragNum)} € − {be_fmt(skontoNum)} € Skonto</div>}
          </div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:900,color:"#f59e0b"}}>{be_fmt(ueberBetrag)} €</div>
        </div>
        <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"9px 14px"}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#94a3b8",marginBottom:3}}>Verwendungszweck</div>
          <div style={{fontWeight:600,color:"#0f172a"}}>{data.verwendung || "—"}</div>
        </div>
      </div>
      <div style={{background:"#f8fafc",borderTop:"1px solid #f1f5f9",padding:"7px 20px",fontSize:9,color:"#94a3b8",display:"flex",gap:16}}>
        <span>Datum der Ausführung: {fmtDatum(data.datum)}</span>
        <span>SEPA-Überweisung</span>
      </div>
    </div>
  );
}

function BeVorschauEmail({ data }) {
  return (
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",fontSize:12,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
      {/* E-Mail-Kopf */}
      <div style={{background:"#f8fafc",borderBottom:"1px solid #e2e8f0",padding:"14px 18px"}}>
        <div style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✉️</div>
          <div style={{fontWeight:700,fontSize:15,color:"#0f172a",lineHeight:1.3}}>{data.betreff || "(kein Betreff)"}</div>
        </div>
        {[["Von", data.von],["An", data.an],["Datum", fmtDatum(data.datum)]].map(([l,v]) => (
          <div key={l} style={{display:"flex",gap:8,fontSize:11,marginBottom:2}}>
            <span style={{color:"#94a3b8",fontWeight:700,width:42,flexShrink:0}}>{l}:</span>
            <span style={{color:"#374151"}}>{v}</span>
          </div>
        ))}
      </div>
      {/* Nachricht */}
      <div style={{padding:"16px 18px",lineHeight:1.8,whiteSpace:"pre-wrap",fontSize:12,color:"#1e293b",background:"#fff"}}>
        {data.text}
      </div>
    </div>
  );
}

function BeVorschauQuittung({ data }) {
  return (
    <div style={{fontFamily:"'IBM Plex Sans',system-ui,sans-serif",fontSize:12,background:"#fff",border:"2px solid #0f172a",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
      {/* Quittungs-Kopf */}
      <div style={{background:"#0f172a",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:"-.02em",color:"#fff"}}>QUITTUNG</div>
          <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Nr. {data.quittungsNr}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{background:"#22c55e",color:"#fff",fontSize:10,fontWeight:800,padding:"4px 12px",borderRadius:20,marginBottom:4}}>✓ BEZAHLT</div>
          <div style={{fontSize:10,color:"#94a3b8"}}>{fmtDatum(data.datum)}</div>
        </div>
      </div>
      {/* Quittungs-Body */}
      <div style={{padding:"16px 20px"}}>
        {[
          ["Ausgestellt von", data.aussteller],
          ["Erhalten von",    data.empfaenger],
          ["Verwendungszweck", data.zweck],
        ].map(([l,v]) => (
          <div key={l} style={{display:"flex",gap:12,marginBottom:12,alignItems:"baseline"}}>
            <span style={{fontSize:10,color:"#64748b",width:130,flexShrink:0,fontWeight:700}}>{l}</span>
            <span style={{fontWeight:600,flex:1,borderBottom:"1px solid #e2e8f0",paddingBottom:2}}>{v}</span>
          </div>
        ))}
        <div style={{background:"#f8fafc",border:"2px solid #0f172a",borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
          <span style={{fontSize:11,color:"#64748b",fontWeight:700}}>Betrag (inkl. MwSt.)</span>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:900,color:"#0f172a"}}>{data.betrag} €</span>
        </div>
      </div>
      {/* Footer */}
      <div style={{borderTop:"1px solid #e2e8f0",padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc"}}>
        <span style={{fontSize:10,color:"#64748b"}}>Barzahlung bestätigt</span>
        <div style={{textAlign:"center"}}>
          <div style={{width:140,borderBottom:"1px solid #0f172a",marginBottom:3}} />
          <span style={{fontSize:9,color:"#94a3b8"}}>Unterschrift Aussteller</span>
        </div>
      </div>
    </div>
  );
}

// ── BelegEditorModal ─────────────────────────────────────────────────────────
function BelegEditorModal({ onSchliessen }) {
  const [typ, setTyp] = useState("eingangsrechnung");
  const [dataER, setDataER] = useState(defaultEingangsrechnung);
  const [dataAR, setDataAR] = useState(defaultAusgangsrechnung);
  const [dataKA, setDataKA] = useState(defaultKontoauszug);
  const [dataUB, setDataUB] = useState(defaultUeberweisung);
  const [dataEM, setDataEM] = useState(defaultEmail);
  const [dataQU, setDataQU] = useState(defaultQuittung);
  const [belegTitel, setBelegTitel] = useState("");
  const [saveState, setSaveState] = useState(null);

  const dataMap = {
    eingangsrechnung: [dataER, setDataER],
    ausgangsrechnung: [dataAR, setDataAR],
    kontoauszug:      [dataKA, setDataKA],
    ueberweisung:     [dataUB, setDataUB],
    email:            [dataEM, setDataEM],
    quittung:         [dataQU, setDataQU],
  };
  const [data] = dataMap[typ];

  const handleSaveToPool = () => {
    try {
      const existing = JSON.parse(localStorage.getItem("buchungswerk_belege") || "[]");
      existing.push({
        id: be_uid(), typ,
        titel: belegTitel.trim() || `${BELEGTYPEN.find(t=>t.id===typ)?.label} vom ${new Date().toLocaleDateString("de-DE")}`,
        data, erstellt: new Date().toISOString(),
      });
      localStorage.setItem("buchungswerk_belege", JSON.stringify(existing));
      setSaveState("ok"); setTimeout(() => setSaveState(null), 2500);
    } catch { setSaveState("error"); setTimeout(() => setSaveState(null), 3000); }
  };

  const typLabel = BELEGTYPEN.find(t => t.id === typ)?.label;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1100, display:"flex", flexDirection:"column" }}>
      <style>{BE_CSS}</style>
      {/* Modal-Header */}
      <div style={{ background:"#0f172a", borderBottom:"2px solid #f59e0b", padding:"0 24px", height:"52px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ color:"#fff", fontWeight:800, fontSize:"17px" }}>Buchungs<span style={{color:"#f59e0b"}}>Werk</span></span>
          <span style={{ fontSize:"10px", fontWeight:700, background:"#f59e0b22", color:"#f59e0b", border:"1px solid #f59e0b55", borderRadius:"4px", padding:"2px 8px", letterSpacing:".06em", textTransform:"uppercase" }}>Beleg-Editor</span>
        </div>
        <button onClick={onSchliessen} style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:"7px", padding:"5px 14px", cursor:"pointer", fontSize:"12px", fontWeight:700 }}>✕ Schließen</button>
      </div>
      {/* Typ-Tabs */}
      <div className="be-typ-bar">
        {BELEGTYPEN.map(t => (
          <button key={t.id} className={`be-typ-tab ${typ === t.id ? "active" : ""}`} onClick={() => setTyp(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {/* Body */}
      <div className="be-root" style={{ flex:1, overflow:"hidden" }}>
        <div className="be-body">
          {/* Formular */}
          <div className="be-panel be-panel-form">
            <div className="be-panel-head">✏️ {typLabel} · Felder bearbeiten</div>
            <div className="be-panel-body">
              {typ === "eingangsrechnung" && <BeFormEingangsrechnung data={dataER} setData={setDataER} />}
              {typ === "ausgangsrechnung" && <BeFormAusgangsrechnung data={dataAR} setData={setDataAR} />}
              {typ === "kontoauszug"      && <BeFormKontoauszug      data={dataKA} setData={setDataKA} />}
              {typ === "ueberweisung"     && <BeFormUeberweisung     data={dataUB} setData={setDataUB} />}
              {typ === "email"            && <BeFormEmail            data={dataEM} setData={setDataEM} />}
              {typ === "quittung"         && <BeFormQuittung         data={dataQU} setData={setDataQU} />}
            </div>
            <div className="be-action-bar">
              <input className="be-field-input" placeholder={`Titel (z. B. „${typLabel} mit Mengenrabatt, Kl. 9")`}
                value={belegTitel} onChange={e => setBelegTitel(e.target.value)} style={{fontSize:12}} />
              <div style={{ display:"flex", gap:8 }}>
                <button className="be-btn-save"
                  style={saveState === "ok" ? {background:"#16a34a",flex:1} : saveState === "error" ? {background:"#dc2626",flex:1} : {flex:1}}
                  onClick={handleSaveToPool}>
                  {saveState === "ok" ? "✓ In Eigene Belege gespeichert!" : saveState === "error" ? "⚠ Fehler" : "📥 In BuchungsWerk übernehmen"}
                </button>
                <button className="be-btn-print" onClick={() => window.print()} style={{flexShrink:0}}>🖨</button>
              </div>
            </div>
          </div>
          {/* Vorschau */}
          <div className="be-panel">
            <div className="be-panel-head">👁 Live-Vorschau · {typLabel}</div>
            <div className="be-preview-wrap">
              {typ === "eingangsrechnung" && <BeVorschauRechnung data={dataER} typ="eingangsrechnung" />}
              {typ === "ausgangsrechnung" && <BeVorschauRechnung data={dataAR} typ="ausgangsrechnung" />}
              {typ === "kontoauszug"      && <BeVorschauKontoauszug data={dataKA} />}
              {typ === "ueberweisung"     && <BeVorschauUeberweisung data={dataUB} />}
              {typ === "email"            && <BeVorschauEmail data={dataEM} />}
              {typ === "quittung"         && <BeVorschauQuittung data={dataQU} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EIGENE BELEGE – Aufgabenpool aus BelegEditor
// ══════════════════════════════════════════════════════════════════════════════

const BELEGTYP_LABELS = {
  eingangsrechnung: "📥 Eingangsrechnung",
  ausgangsrechnung: "📤 Ausgangsrechnung",
  kontoauszug:      "🏦 Kontoauszug",
  ueberweisung:     "💸 Überweisung",
  email:            "✉️ E-Mail",
  quittung:         "🧾 Quittung",
};

function belegZuText(b) {
  const d = b.data;
  switch (b.typ) {
    case "eingangsrechnung": {
      const pos = (d.positionen || []).map(p => `${p.menge} ${p.einheit} ${p.artikel} à ${p.ep} € netto`).join(", ");
      const rabatt = d.rabattAktiv ? ` Sofortrabatt: ${d.rabattArt} ${d.rabattPct} %.` : "";
      const bezug  = parseFloat(d.bezugskosten) > 0 ? ` Bezugskosten: ${d.bezugskosten} €.` : "";
      const skonto = parseFloat(d.skontoPct) > 0 ? ` Skonto: ${d.skontoPct} % bei Zahlung in ${d.skontoTage} Tagen.` : "";
      return `Eingangsrechnung von ${d.lieferantName} an ${d.empfaengerName}. Positionen: ${pos}.${rabatt}${bezug} USt: ${d.ustSatz} %. Zahlungsziel: ${d.zahlungsziel} Tage.${skonto} Rechnungs-Nr.: ${d.rechnungsNr}.`;
    }
    case "ausgangsrechnung": {
      const pos = (d.positionen || []).map(p => `${p.menge} ${p.einheit} ${p.artikel} à ${p.ep} € netto`).join(", ");
      const rabatt = d.rabattAktiv ? ` Sofortrabatt: ${d.rabattArt} ${d.rabattPct} %.` : "";
      const skonto = parseFloat(d.skontoPct) > 0 ? ` Skonto: ${d.skontoPct} % bei Zahlung in ${d.skontoTage} Tagen.` : "";
      return `Ausgangsrechnung von ${d.absenderName} an ${d.kundeName}. Positionen: ${pos}.${rabatt} USt: ${d.ustSatz} %. Zahlungsziel: ${d.zahlungsziel} Tage.${skonto}`;
    }
    case "kontoauszug": {
      const hl = (d.buchungen || []).find(x => x.highlight);
      return `Kontoauszug der ${d.bank}, Inhaber: ${d.inhaber}. Zu buchende Zeile: "${hl?.text || "(keine markiert)"}", Betrag: ${hl?.betrag || "?"} €.`;
    }
    case "ueberweisung":
      return `Überweisung von ${d.auftraggeberName} an ${d.empfaengerName}, Betrag: ${d.betrag} €, Verwendung: ${d.verwendung}.${parseFloat(d.skontoBetrag) > 0 ? ` Skonto-Abzug: ${d.skontoBetrag} €.` : ""}`;
    case "email":
      return `E-Mail von ${d.von} an ${d.an}, Betreff: "${d.betreff}". Inhalt: ${d.text?.slice(0, 200)}`;
    case "quittung":
      return `Quittung Nr. ${d.quittungsNr}. Aussteller: ${d.aussteller}. Zahlender: ${d.empfaenger}. Betrag: ${d.betrag} €. Zweck: ${d.zweck}.`;
    default: return JSON.stringify(b.data).slice(0, 300);
  }
}

function EigeneBelege({ onSchliessen }) {
  const [belege, setBelege] = useState(() => {
    try { return JSON.parse(localStorage.getItem("buchungswerk_belege") || "[]"); }
    catch { return []; }
  });
  const [selected, setSelected]         = useState(null);
  const [genStatus, setGenStatus]       = useState(null);
  // FIX 2: Historie statt einzelnem Result – Folgeaufgaben werden ANGEHÄNGT
  const [historie, setHistorie]         = useState([]);
  const [klasse, setKlasse]             = useState("9");
  const [kopiert, setKopiert]           = useState(null);
  const [vorschlaege, setVorschlaege]   = useState(null);
  const [vorschlaegeStatus, setVorschlaegeStatus] = useState(null);

  const loeschen = (id) => {
    const neu = belege.filter(b => b.id !== id);
    localStorage.setItem("buchungswerk_belege", JSON.stringify(neu));
    setBelege(neu);
    if (selected?.id === id) { setSelected(null); setHistorie([]); setVorschlaege(null); }
  };

  // FIX 2+3: Anhängen + ISB-Punkte im Prompt
  const generieren = async (varianteHinweis = null, varianteTitel = null) => {
    if (!selected) return;
    setGenStatus("loading");
    setVorschlaege(null);
    setVorschlaegeStatus(null);
    const belegText = belegZuText(selected);
    const varianteZusatz = varianteHinweis ? `\n\nVariante / Fokus: ${varianteHinweis}` : "";
    const prompt = `Du bist BwR-Lehrer an einer bayerischen Realschule (Klasse ${klasse}).
Erstelle auf Basis des folgenden Belegs eine vollständige Buchungsaufgabe im bayerischen BwR-Stil (ISB-Kontenplan).

BELEG: ${belegText}${varianteZusatz}

Punktevergabe nach ISB-Standard (überarbeitete Handreichung 2025 – exakt anwenden!):

BUCHUNGSSÄTZE:
- 1 Punkt pro Konto-Betrag-Block (Kontonr. + Kontobezeichnung + Betrag = Einheit)
- Bei zusammengesetzten Buchungssätzen: 1 Punkt pro Teilbuchung

NEBENRECHNUNGEN (§ 2.3.3 Handreichung):
Jeder gesondert zu berechnende Betrag erhält 1 Punkt, z. B.:
- Skonto-Berechnung beim Eingangs- oder Ausgangsrechnungsausgleich (BwR 8.2, 8.4)
- Ermittlung der Anschaffungskosten oder Abschreibungshöhe (BwR 9.2)
- Ermittlung zeitanteiliger Abschreibungsmonate (BwR 9.2) → 1 eigener Punkt
- Auszahlungsbetrag / Disagio-Berechnung (BwR 9.3)
- Berechnung bei Forderungsausfall, EWB, PWB (BwR 9.5)
- Periodenrichtige Aufwands-/Ertragsabgrenzung (BwR 10.1)
KEIN eigener Punkt: reine Rabattberechnung oder reine USt-Berechnung ohne weiteren Gedankenschritt; Kalkulationsschemata bekommen keinen Punkt für das Schema selbst

BRUTTO → NETTO-UMRECHNUNG (§ 2.2.11 / 2.3.2 Handreichung – besondere Regel!):
- Klasse 7: 1 Punkt für Brutto→Netto-Umrechnung
- Ab Klasse 8: KEIN eigener Punkt für Brutto→Netto – außer bei diesen betriebswirtschaftlich relevanten Gedankenschritten:
  * Netto-Skonto als Vergleichsgröße zum Zinsaufwand (BwR 9.3 Lieferantenkredit)
  * Nettoforderung als Grundlage für EWB oder PWB (BwR 9.5)
  * Netto-Mietbetrag als Grundlage für Abgrenzungsbuchung (BwR 10.1)

Setze nebenrechnung_punkte nur dann > 0, wenn die Nebenrechnung nach obigen Regeln einen echten Punkt verdient.

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärung davor/danach):
{
  "aufgabe": "vollständige Aufgabenstellung für Schüler (1-3 Sätze, Du-Anrede wenn Klasse ≤9)",
  "buchungssatz": [
    { "soll_nr": "XXXX", "soll_name": "Kontoname (KÜRZEL)", "haben_nr": "XXXX", "haben_name": "Kontoname (KÜRZEL)", "betrag": 0.00, "punkte": 1, "erklaerung": "kurze Begründung" }
  ],
  "nebenrechnung": "Rechenweg falls nötig mit Schrittangabe, sonst leer",
  "nebenrechnung_punkte": 0,
  "punkte_gesamt": 2,
  "erklaerung": "didaktische Erklärung für den Lehrer (2-3 Sätze)"
}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const json = await res.json();
      const text = json.content?.find(c => c.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const eintrag = { ...parsed, _label: varianteTitel || "Aufgabe", _ts: Date.now() };
      setHistorie(prev => {
        const neu = [...prev, eintrag];
        // Für Export in SchrittAufgaben bereitstellen
        try { localStorage.setItem("buchungswerk_ki_export", JSON.stringify(neu.map(e => ({ result: e, beleg: selected })))); } catch {}
        return neu;
      });
      setGenStatus("ok");
      ladeVorschlaege(belegText, parsed);
    } catch { setGenStatus("error"); }
  };

  const ladeVorschlaege = async (belegText, ergebnis) => {
    setVorschlaegeStatus("loading");
    const prompt = `Du bist BwR-Lehrer (Klasse ${klasse}, Bayern). Zum folgenden Beleg wurde bereits eine Buchungsaufgabe erstellt.
Beleg: ${belegText}
Bereits generierte Aufgabe: ${ergebnis.aufgabe}

Schlage 3 weitere didaktisch sinnvolle Aufgabenvarianten oder Folgethemen vor.

Antworte NUR mit JSON (kein Markdown):
{ "vorschlaege": [ { "titel": "Kurzer Titel", "beschreibung": "1 Satz was geübt wird", "variante": "Präziser Hinweis für Aufgabengenerierung (1-2 Sätze)" } ] }`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
      });
      const json = await res.json();
      const text = json.content?.find(c => c.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setVorschlaege(parsed.vorschlaege);
      setVorschlaegeStatus("ok");
    } catch { setVorschlaegeStatus("error"); }
  };

  const exportText = (result, idx) => {
    const bs = result.buchungssatz?.map(b =>
      `  ${b.soll_nr} ${b.soll_name}  an  ${b.haben_nr} ${b.haben_name}  ${typeof b.betrag === "number" ? b.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : b.betrag} €  [${b.punkte ?? 1} P]`
    ).join("\n") || "";
    const text = `AUFGABE (${result.punkte_gesamt ?? "?"} Punkte)\n${"─".repeat(50)}\n${result.aufgabe}\n\n${result.nebenrechnung ? `NEBENRECHNUNG (${result.nebenrechnung_punkte ?? 0} P)\n${"─".repeat(50)}\n${result.nebenrechnung}\n\n` : ""}BUCHUNGSSATZ\n${"─".repeat(50)}\n${bs}\n\n${result.erklaerung ? `DIDAKTIK (Lehrer)\n${"─".repeat(50)}\n${result.erklaerung}` : ""}`;
    navigator.clipboard.writeText(text).then(() => { setKopiert(idx); setTimeout(() => setKopiert(null), 2000); });
  };

  const exportDruck = (result) => {
    const bs = result.buchungssatz?.map(b =>
      `<tr><td style="padding:7px 10px;font-weight:700">${b.soll_nr} ${b.soll_name}</td><td style="padding:7px 10px;color:#64748b;text-align:center">an</td><td style="padding:7px 10px;font-weight:700">${b.haben_nr} ${b.haben_name}</td><td style="padding:7px 10px;text-align:right;font-family:monospace;color:#059669;font-weight:700">${typeof b.betrag === "number" ? b.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : b.betrag} €</td><td style="padding:7px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;background:#0f172a;border-radius:4px">${b.punkte ?? 1} P</td></tr>`
    ).join("") || "";
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>BuchungsWerk – Aufgabe</title><style>body{font-family:'Segoe UI',sans-serif;max-width:720px;margin:40px auto;color:#0f172a}.lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;margin:0 0 5px}.badge{display:inline-block;background:#0f172a;color:#f59e0b;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:800;margin-left:8px}p{font-size:15px;line-height:1.7;margin:0 0 20px}table{width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e2e8f0}td{font-size:13px;border-bottom:1px solid #f1f5f9}.nr{font-family:monospace;font-size:12px;background:#f8fafc;padding:12px 14px;border-radius:6px;white-space:pre-wrap;margin-bottom:20px;border:1px solid #e2e8f0}.erkl{background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;font-size:12px;color:#92400e}@media print{.erkl{display:none}}</style></head><body><div class="lbl">Aufgabenstellung <span class="badge">${result.punkte_gesamt ?? "?"} Punkte</span></div><p>${result.aufgabe}</p>${result.nebenrechnung ? `<div class="lbl">Nebenrechnung <span class="badge">${result.nebenrechnung_punkte ?? 0} P</span></div><div class="nr">${result.nebenrechnung.replace(/\n/g,"<br>")}</div>` : ""}<div class="lbl">Buchungssatz</div><table>${bs}</table>${result.erklaerung ? `<div class="erkl"><strong>💡 Didaktik (Lehrer):</strong> ${result.erklaerung}</div>` : ""}</body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  // ISB Korrekturzeichen: DraggableHaken (globale Komponente) – frei verschiebbar
  const ISBHaken = () => <DraggableHaken />;

  // Wiederverwendbare Aufgaben-Karte
  const AufgabeKarte = ({ result, nr, isLatest }) => {
    const nrPunkte = result.nebenrechnung_punkte ?? 0;
    return (
    <div style={{ borderTop: nr > 1 ? "2px dashed #e2e8f0" : "none", paddingTop: nr > 1 ? 16 : 0, display:"flex", flexDirection:"column", gap:10 }}>
      {/* Kopfzeile */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:24, height:24, borderRadius:"50%", background: isLatest ? "#f59e0b" : "#e2e8f0", color: isLatest ? "#0f172a" : "#94a3b8", fontWeight:800, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{nr}</div>
        <span style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{result._label}</span>
        {(result.punkte_gesamt ?? 0) > 0 && (
          <span style={{ marginLeft:"auto", background:"#0f172a", color:"#f59e0b", borderRadius:20, padding:"2px 11px", fontSize:11, fontWeight:800 }}>{result.punkte_gesamt} P</span>
        )}
      </div>

      {/* Aufgabenstellung */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:7 }}>Aufgabenstellung</div>
        <div style={{ fontSize:14, lineHeight:1.7 }}>{result.aufgabe}</div>
      </div>

      {/* Nebenrechnung mit ✓-Haken wenn bepunktet */}
      {result.nebenrechnung && (
        <div style={{ background:"#fefce8", border:"1px solid #fde68a", borderRadius:8, padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#92400e" }}>📐 Nebenrechnung</div>
            <div style={{ display:"flex", gap:3, alignItems:"center" }}>
              {nrPunkte > 0
                ? Array.from({ length: nrPunkte }).map((_, i) => <ISBHaken key={i} title={`ISB ✓ = 1 Punkt (Nebenrechnung Schritt ${i+1})`} />)
                : <span style={{ fontSize:9, color:"#92400e", fontStyle:"italic" }}>kein eigener Punkt (ISB-Regel)</span>
              }
            </div>
          </div>
          <div style={{ fontFamily:"monospace", fontSize:12, whiteSpace:"pre-wrap", background:"#fffbeb", padding:"10px 12px", borderRadius:6, color:"#78350f" }}>{result.nebenrechnung}</div>
        </div>
      )}

      {/* Buchungssätze mit ISB-Haken pro Block */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:10 }}>Buchungssatz</div>
        {result.buchungssatz?.map((bs, i) => {
          const p = bs.punkte ?? 1;
          return (
            <div key={i} style={{ padding:"9px 12px", background:"#f8fafc", borderRadius:6, marginBottom:5, borderLeft:"3px solid #e2e8f0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", fontSize:13, fontWeight:600 }}>
                {/* Soll-Block: Nr  Name  ✓  Betrag */}
                <span style={{ color:"#1d4ed8" }}>{bs.soll_nr} <KürzelSpan nr={bs.soll_nr} style={{ color:"#1d4ed8", fontWeight:600, fontSize:13 }} /></span>
                <ISBHaken />
                <span style={{ color:"#94a3b8", fontWeight:400, fontSize:12, margin:"0 2px" }}>an</span>
                {/* Haben-Block: Nr  Name  ✓  Betrag */}
                <span style={{ color:"#dc2626" }}>{bs.haben_nr} <KürzelSpan nr={bs.haben_nr} style={{ color:"#dc2626", fontWeight:600, fontSize:13 }} /></span>
                <ISBHaken />
                <span style={{ marginLeft:"auto", fontFamily:"monospace", color:"#059669", fontWeight:700 }}>
                  {typeof bs.betrag === "number" ? bs.betrag.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) : bs.betrag} €
                </span>
                <span style={{ background:"#0f172a", color:"#f59e0b", borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:800 }}>{(bs.punkte ?? 1) * 2} P</span>
              </div>
              {bs.erklaerung && <div style={{ fontSize:11, color:"#64748b", fontWeight:400, marginTop:4 }}>{bs.erklaerung}</div>}
            </div>
          );
        })}
      </div>

      {/* Didaktik */}
      {result.erklaerung && (
        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:12, fontSize:12, color:"#92400e", lineHeight:1.6 }}>
          <strong>💡 Didaktik (Lehrer):</strong> {result.erklaerung}
        </div>
      )}

      {/* Export-Leiste */}
      <div style={{ display:"flex", gap:7 }}>
        <button onClick={() => exportText(result, nr)}
          style={{ flex:1, padding:"8px 10px", background: kopiert===nr ? "#f0fdf4" : "#fff", border:`1.5px solid ${kopiert===nr?"#86efac":"#e2e8f0"}`, borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700, color: kopiert===nr?"#15803d":"#374151" }}>
          {kopiert===nr ? "✓ Kopiert!" : "📋 Kopieren"}
        </button>
        <button onClick={() => exportDruck(result)}
          style={{ flex:1, padding:"8px 10px", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700, color:"#374151" }}>
          🖨 Drucken
        </button>
      </div>
    </div>
  );};

  const fmt_datum = iso => new Date(iso).toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px", overflowY:"auto" }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:1100, overflow:"hidden", boxShadow:"0 24px 64px rgba(0,0,0,.25)" }}>
        {/* Header */}
        <div style={{ background:"#0f172a", padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"#fff", fontWeight:800, fontSize:18 }}>📂 Eigene Belege</div>
            <div style={{ color:"#94a3b8", fontSize:12, marginTop:2 }}>{belege.length} Beleg{belege.length!==1?"e":""} im Pool · erstellt im Beleg-Editor</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>✕ Schließen</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", minHeight:500 }}>
          {/* Linke Liste */}
          <div style={{ borderRight:"1px solid #e2e8f0", overflowY:"auto", maxHeight:"70vh" }}>
            {belege.length === 0 ? (
              <div style={{ padding:"32px 20px", textAlign:"center", color:"#94a3b8" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
                <div style={{ fontWeight:700, marginBottom:6 }}>Noch keine Belege</div>
                <div style={{ fontSize:12, lineHeight:1.5 }}>Erstelle im Beleg-Editor einen Beleg und klicke auf „In BuchungsWerk übernehmen".</div>
              </div>
            ) : belege.map(b => (
              <div key={b.id}
                onClick={() => { setSelected(b); setHistorie([]); setGenStatus(null); setVorschlaege(null); setVorschlaegeStatus(null); }}
                style={{ padding:"14px 16px", borderBottom:"1px solid #f1f5f9", cursor:"pointer",
                  background: selected?.id===b.id ? "#f0f9ff" : "#fff",
                  borderLeft: selected?.id===b.id ? "3px solid #0ea5e9" : "3px solid transparent" }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{b.titel}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{BELEGTYP_LABELS[b.typ]||b.typ} · {fmt_datum(b.erstellt)}</div>
                <button onClick={e=>{e.stopPropagation();loeschen(b.id);}}
                  style={{ marginTop:6, fontSize:10, color:"#ef4444", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:600 }}>🗑 Löschen</button>
              </div>
            ))}
          </div>
          {/* Rechte Detailansicht */}
          <div style={{ overflowY:"auto", maxHeight:"70vh", padding:20 }}>
            {!selected ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#94a3b8", textAlign:"center" }}>
                <div><div style={{ fontSize:40, marginBottom:12 }}>👈</div><div style={{ fontWeight:700 }}>Beleg auswählen</div><div style={{ fontSize:12, marginTop:4 }}>Klicke links auf einen Beleg.</div></div>
              </div>
            ) : (
              <>
                {/* Beleg-Vorschau */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:10 }}>Beleg-Vorschau</div>
                  {selected.typ==="eingangsrechnung" && <BeVorschauRechnung data={selected.data} typ="eingangsrechnung" />}
                  {selected.typ==="ausgangsrechnung" && <BeVorschauRechnung data={selected.data} typ="ausgangsrechnung" />}
                  {selected.typ==="kontoauszug"      && <BeVorschauKontoauszug data={selected.data} />}
                  {selected.typ==="ueberweisung"     && <BeVorschauUeberweisung data={selected.data} />}
                  {selected.typ==="email"            && <BeVorschauEmail data={selected.data} />}
                  {selected.typ==="quittung"         && <BeVorschauQuittung data={selected.data} />}
                </div>

                {/* KI-Block */}
                <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:16 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>🤖 Aufgabe mit KI generieren</div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:"#64748b", flexShrink:0 }}>Klassenstufe:</label>
                    {["7","8","9","10"].map(k => (
                      <button key={k} onClick={() => setKlasse(k)}
                        style={{ padding:"5px 14px", borderRadius:20, border:"1.5px solid", borderColor:klasse===k?"#0f172a":"#e2e8f0", background:klasse===k?"#0f172a":"#fff", color:klasse===k?"#fff":"#475569", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                        {k}
                      </button>
                    ))}
                    <button onClick={() => generieren(null, "Aufgabe")} disabled={genStatus==="loading"}
                      style={{ marginLeft:"auto", padding:"8px 20px", background:genStatus==="loading"?"#94a3b8":"#f59e0b", color:"#0f172a", border:"none", borderRadius:8, fontWeight:800, fontSize:13, cursor:genStatus==="loading"?"not-allowed":"pointer" }}>
                      {genStatus==="loading" ? "⏳ Generiere…" : historie.length===0 ? "✨ Aufgabe generieren" : "✨ Weitere Aufgabe"}
                    </button>
                  </div>

                  {genStatus==="error" && (
                    <div style={{ padding:12, background:"#fee2e2", borderRadius:8, color:"#dc2626", fontSize:12, fontWeight:600 }}>⚠ Fehler. Bitte nochmal versuchen.</div>
                  )}

                  {/* Alle Aufgaben in der Historie */}
                  {historie.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      {historie.map((result, idx) => (
                        <AufgabeKarte key={result._ts} result={result} nr={idx+1} isLatest={idx===historie.length-1} />
                      ))}

                      {/* Weiterführende Vorschläge unter der letzten Karte */}
                      <div style={{ borderTop:"1px solid #e2e8f0", paddingTop:14 }}>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:10 }}>💡 Weiterführende Aufgaben</div>
                        {vorschlaegeStatus==="loading" && <div style={{ fontSize:12, color:"#94a3b8" }}>⏳ Lade Vorschläge…</div>}
                        {vorschlaegeStatus==="error"   && <div style={{ fontSize:12, color:"#ef4444" }}>Vorschläge konnten nicht geladen werden.</div>}
                        {vorschlaege && (
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            {vorschlaege.map((v, i) => (
                              <button key={i} onClick={() => generieren(v.variante, v.titel)}
                                style={{ textAlign:"left", padding:"11px 14px", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:10, cursor:"pointer" }}
                                onMouseEnter={e=>e.currentTarget.style.borderColor="#0f172a"}
                                onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}>
                                <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{v.titel}</div>
                                <div style={{ fontSize:11, color:"#64748b", lineHeight:1.5 }}>{v.beschreibung}</div>
                                <div style={{ fontSize:10, color:"#94a3b8", marginTop:5, fontWeight:600 }}>→ Aufgabe generieren und unten anfügen</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





// ══════════════════════════════════════════════════════════════════════════════
// H5P / INTERAKTIVES QUIZ — Generator + Modal  (v3 – ISB-konform)
// ══════════════════════════════════════════════════════════════════════════════

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
function shuffleArr(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function fmtBtr(b) {
  if (typeof b !== "number") return String(b);
  return b.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fmtNum(b) {
  if (typeof b !== "number") return String(b);
  return b.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pick3Distractors(richtigeNr, pool) {
  const same = pool.filter(k => k.nr !== richtigeNr && k.nr[0] === richtigeNr[0]);
  const rest = pool.filter(k => k.nr !== richtigeNr && k.nr[0] !== richtigeNr[0]);
  return [...same, ...rest].sort(() => Math.random() - 0.5).slice(0, 3);
}

// ── Sinnvolle Fragetyp-Vorauswahl ─────────────────────────────────────────────
function bestimmeFragetyp(a) {
  if (a.taskTyp === "rechnung" && a.schema?.length) return "drag_kalk";
  if (a.taskTyp === "theorie") return "single_choice";
  if (a.taskTyp === "komplex") return "drag_konten";
  // Buchungssatz → immer drag_konten (interaktiver Kontenplan)
  return "drag_konten";
}

// ── Beleg-Serialisierung ───────────────────────────────────────────────────────
// Extrahiert relevante Daten aus dem Beleg-Objekt für das Quiz-HTML
function serialisiereBeleg(beleg) {
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
function macheDragKonten(a, nr) {
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
function macheFillBlanks(a, nr, schritte) {
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

function macheSingleChoice(a, nr) {
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

function macheTrueFalse(a, nr) {
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

function macheDragKalk(a, nr) {
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

function generiereMatchingFragen(anzahl) {
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

function generiereAlleQuizFragen(aufgaben, fragenTypen) {
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
function generateQuizHTML({ aufgaben, config, firma, fragenTypen, apiUrl = "", sessionId = null }) {
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
.card{background:#fff;border-radius:14px;padding:16px 18px;box-shadow:0 2px 12px rgba(0,0,0,.08);margin-bottom:12px}
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
.fp-isb{background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:8px 11px;font-size:11px;color:#92400e;margin-top:9px;line-height:1.5}{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;min-height:46px}
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
  const card=mk("div","card");
  // Header
  const hd=mk("div");hd.style.cssText="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:14px;color:#fff";
  const nm=mk("div");nm.style.cssText="font-size:18px;font-weight:900;margin-bottom:2px";nm.textContent=FIRMA.icon+" "+FIRMA.name;
  const sub=mk("div");sub.style.cssText="font-size:11px;color:#94a3b8";sub.textContent=[FIRMA.rechtsform,FIRMA.plz+" "+FIRMA.ort,FIRMA.branche].filter(Boolean).join(" · ");
  hd.appendChild(nm);hd.appendChild(sub);
  if(FIRMA.slogan){const sl=mk("div");sl.style.cssText="font-size:12px;color:#f59e0b;margin-top:5px;font-style:italic";sl.textContent="\u201e"+FIRMA.slogan+"\u201c";hd.appendChild(sl);}
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
      const tr=mk("tr");
      const cells=[p.pos||"1",p.beschr,p.menge+" "+p.einheit,
        p.ep.toLocaleString("de-DE",{minimumFractionDigits:2})+" \u20ac",
        p.netto.toLocaleString("de-DE",{minimumFractionDigits:2})+" \u20ac"
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
  maxP++;
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
  const zMitA=f.zeilen.filter(z=>z.antwort);maxP+=zMitA.length;const dm={};
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
  maxP+=f.paare.length;const vb={};const lE={};
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

function shuffleArr(a){return[...a].sort(()=>Math.random()-.5);}
rf();
</script>
</body>
</html>`;
}

// ── H5PModal ──────────────────────────────────────────────────────────────────
const QUIZ_TYPEN = [
  { key: "drag_konten",   icon: "🗂",  label: "Kontenplan-Drag" },
  { key: "fill_blanks",   icon: "✏️",  label: "Lückentext" },
  { key: "single_choice", icon: "☑️",  label: "Multiple Choice" },
  { key: "true_false",    icon: "⚖️",  label: "Wahr/Falsch" },
  { key: "drag_kalk",     icon: "📊",  label: "Kalkulation" },
];

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
    a.href = url; a.download = `BuchungsWerk_Quiz_Kl${config.klasse}_${config.datum || "2025"}.html`;
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
    { key: "quiz", icon: "📱", label: "Interaktives Quiz" },
    { key: "qr",   icon: "📷", label: "QR / Teilen" },
    { key: "h5p",  icon: "🎓", label: "H5P (mebis)" },
  ];

  const S2 = {
    infoBox: { background:"#1e293b", borderRadius:"12px", padding:"13px 15px", marginBottom:"14px", fontSize:"13px", color:"#e2e8f0", lineHeight:1.7 },
    sectionLbl: { fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"9px" },
    aufgRow: { display:"flex", alignItems:"center", gap:"8px", padding:"9px 12px", background:"#1e293b", borderRadius:"9px", marginBottom:"6px", flexWrap:"wrap" },
    aufgNr: { fontSize:"11px", fontWeight:800, color:"#f59e0b", minWidth:"24px" },
    aufgTxt: { fontSize:"12px", color:"#e2e8f0", flex:1, minWidth:"120px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
    typPill: (active) => ({ padding:"4px 8px", borderRadius:"6px", border:"1px solid", fontSize:"10px", fontWeight:700, cursor:"pointer", borderColor: active ? "#f59e0b" : "#334155", background: active ? "#f59e0b" : "transparent", color: active ? "#0f172a" : "#64748b" }),
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
              <div style={{ fontSize:"20px", fontWeight:900, color:"#fff" }}>🖥 Quiz & H5P</div>
            </div>
            <button onClick={onSchliessen} style={{ background:"transparent", border:"1px solid #334155", borderRadius:"8px", color:"#94a3b8", width:"36px", height:"36px", cursor:"pointer", fontSize:"18px" }}>×</button>
          </div>
          <div style={{ display:"flex" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:"9px 4px", border:"none", background:"transparent", borderBottom: tab===t.key?"3px solid #f59e0b":"3px solid transparent", color: tab===t.key?"#f59e0b":"#64748b", fontSize:"11px", fontWeight: tab===t.key?700:500, cursor:"pointer" }}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowY:"auto", padding:"20px 22px", flex:1 }}>

          {tab==="quiz" && (
            <div>
              <div style={S2.infoBox}>
                Self-contained HTML für iPad – kein Internet nötig. Neuer Modus: <strong style={{color:"#f59e0b"}}>Kontenplan-Drag</strong> – Schüler wählt Konten selbst aus dem vollständigen ISB-Kontenplan. Jeder Slot verlangt Nr. + Kürzel + Betrag (ISB-Vorgabe). Beleg wird vollständig angezeigt.
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
                            {t.icon} {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:"9px" }}>
                <button onClick={vorschauQuiz} style={S2.outlineBtn}>👁 Vorschau</button>
                <button onClick={downloadQuiz} style={S2.bigBtn("#7c3aed")}>⬇ Herunterladen (.html)</button>
              </div>
              <div style={{ marginTop:"9px", fontSize:"11px", color:"#475569", textAlign:"center" }}>
                iPad-optimiert · Offline · ISB-Kontenplan eingebettet · Belege vollständig
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
                {[{label:"📡 Pi-Server",url:"http://buchungswerk.local"},{label:"🏫 mebis",url:"https://lernplattform.mebis.bycs.de/"}].map(p=>(
                  <button key={p.label} onClick={()=>{setQrUrl(p.url);setQrReady(false);}}
                    style={{ flex:1, padding:"8px", borderRadius:"8px", border:"1px solid #334155", background:"#1e293b", color:"#94a3b8", fontSize:"11px", cursor:"pointer" }}>{p.label}</button>
                ))}
              </div>
              <button onClick={generiereQR} disabled={!qrUrl||qrLoading}
                style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"none", background:qrUrl?"#f59e0b":"#334155", color:qrUrl?"#0f172a":"#64748b", fontWeight:800, fontSize:"14px", cursor:qrUrl?"pointer":"not-allowed", marginBottom:"14px" }}>
                {qrLoading?"⏳ Lädt…":"📷 QR-Code generieren"}
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
              <div style={{ ...S2.infoBox, borderLeft:"3px solid #f59e0b" }}>
                <div style={{ fontSize:"13px", color:"#f59e0b", fontWeight:700, marginBottom:"7px" }}>🚧 Geplant für nächste Phase</div>
                Nativer .h5p-Export folgt nach der Testphase. Das Quiz-HTML lässt sich in mebis bereits als URL-Ressource oder iFrame einbinden.
              </div>
              <div style={S2.sectionLbl}>Geplante H5P-Aktivitäten</div>
              {["Fill in the Blanks","Drag Text","Question Set","True/False Question","Dialog Cards (Paare)"].map(name=>(
                <div key={name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 13px", background:"#1e293b", borderRadius:"8px", marginBottom:"5px" }}>
                  <span style={{ fontSize:"13px", color:"#e2e8f0", fontWeight:600 }}>{name}</span>
                  <span style={{ fontSize:"10px", color:"#f59e0b", background:"#0f0800", padding:"2px 7px", borderRadius:"5px", fontWeight:700 }}>geplant</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function BuchungsWerk() {
  const [schritt, setSchritt] = useState(1);
  const [config, setConfig] = useState(null);
  const [firma, setFirma] = useState(null);
  const [eigeneBelegeOffen, setEigeneBelegeOffen] = useState(false);
  const [belegEditorOffen, setBelegEditorOffen]   = useState(false);
  const [kontenplanOffen, setKontenplanOffen]     = useState(false);
  const [materialienStartOffen, setMaterialienStartOffen] = useState(false);
  const reset = () => { setSchritt(1); setConfig(null); setFirma(null); };

  const materialLaden = ({ config: c, firma: f }) => {
    setConfig(c);
    setFirma(f);
    setSchritt(3);
  };

  const [skipFirma, setSkipFirma] = useState(false);
  const zuThemen = () => { setSkipFirma(true); setSchritt(1); };
  const zuFirma  = () => setSchritt(2);

  return (
    <div style={S.page}>
      {belegEditorOffen  && <BelegEditorModal  onSchliessen={() => setBelegEditorOffen(false)} />}
      {eigeneBelegeOffen && <EigeneBelege onSchliessen={() => setEigeneBelegeOffen(false)} />}
      {kontenplanOffen   && <KontenplanModal   onSchliessen={() => setKontenplanOffen(false)} />}
      {materialienStartOffen && <MaterialienModal onSchliessen={() => setMaterialienStartOffen(false)} onLaden={materialLaden} />}
      <div style={S.topbar}>
        {/* Logo – links */}
        <div style={S.logo} onClick={reset}>
          Buchungs<span style={S.logoAccent}>Werk</span>
          <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 600, color: "#475569", letterSpacing: ".12em", textTransform: "uppercase", verticalAlign: "middle" }}>BwR Bayern</span>
        </div>

        {/* Stepper – Mitte */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {[["Einstellungen","⚙"], ["Unternehmen","🏢"], ["Aufgaben","📋"]].map(([label, icon], i) => {
              const s = i + 1;
              const done = schritt > s;
              const active = schritt === s;
              return (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <div style={{ width: 40, height: 1.5, background: done ? "#22c55e" : "#1e293b", flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: done ? 13 : 11, fontWeight: 800,
                      background: done ? "#22c55e" : active ? "#f59e0b" : "#1e293b",
                      color: done ? "#fff" : active ? "#0f172a" : "#475569",
                      border: active ? "none" : done ? "none" : "1.5px solid #334155",
                      boxShadow: active ? "0 0 0 3px rgba(245,158,11,0.25)" : "none",
                      transition: "all 0.2s"
                    }}>
                      {done ? "✓" : s}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? "#f59e0b" : done ? "#22c55e" : "#475569", letterSpacing: ".05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Rechts: Materialien + ISB-Info */}
        <div style={{ minWidth: 180, flexShrink: 0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"5px" }}>
          <button onClick={() => setMaterialienStartOffen(true)}
            style={{ background:"#1e293b", border:"1.5px solid #334155", borderRadius:8, color:"#f59e0b", fontSize:11, fontWeight:700, padding:"5px 12px", cursor:"pointer", letterSpacing:".04em" }}>
            📚 Meine Materialien
          </button>
          <div style={{ fontSize: 10, color: "#334155", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
            ISB · Realschule · 2025
          </div>
        </div>
      </div>

      <div style={S.container}>
        {schritt === 1 && <SchrittTyp onWeiter={cfg => { setConfig(cfg); if (skipFirma) { setSkipFirma(false); setSchritt(3); } else setSchritt(2); }} onBelegEditor={() => setBelegEditorOffen(true)} onEigeneBelege={() => setEigeneBelegeOffen(true)} initialConfig={skipFirma ? config : null} />}
        {schritt === 2 && <SchrittFirma config={config} onWeiter={f => { setFirma(f); setSchritt(3); }} onZurueck={() => setSchritt(1)} />}
        {schritt === 3 && <SchrittAufgaben config={config} firma={firma} onNeu={reset} onMaterialLaden={materialLaden} onThemen={zuThemen} onFirma={zuFirma} />}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1e293b", padding: "10px 24px", display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => setKontenplanOffen(true)}
          style={{ background: "transparent", border: "1.5px solid #1e293b", borderRadius: 7, color: "#475569",
            fontSize: 11, fontWeight: 700, padding: "6px 14px", cursor: "pointer", letterSpacing: ".05em",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          📖 ISB-Kontenplan
        </button>
      </div>
    </div>
  );
}
