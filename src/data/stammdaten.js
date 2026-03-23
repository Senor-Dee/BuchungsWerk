import { pick, r2, rgnr, augnr, fakeDatum } from "../utils.js";

// ── Lieferanten ────────────────────────────────────────────────────────────────
export const LIEFERANTEN = [
  { name: "Bayern Rohstoffe GmbH",    slogan: "Rohstoffe aus Bayern",                  branche: "Rohstoffhandel",   gf: "Thomas Huber",      farbe: "#92400e", icon: "⛏️",
    ort: "Augsburg",   plz: "86150", strasse: "Industriestraße 12",  iban: "DE12720501010012345678", bank: "UniCredit Bank AG",              email: "buchhaltung@bayern-rohstoffe.de", tel: "0821 / 44 33 21-0", hrb: "HRB 8812" },
  { name: "Südbayer Werkstoffe KG",   slogan: "Werkstofftechnik auf höchstem Niveau",  branche: "Werkstoffhandel",  gf: "Maria Steinberger", farbe: "#1e3a5f", icon: "🔩",
    ort: "Regensburg", plz: "93049", strasse: "Gewerbepark 5",       iban: "DE45750300150001234567", bank: "Volksbank Regensburg eG",        email: "info@suedbayer-werkstoffe.de",    tel: "0941 / 88 77 66-0", hrb: "HRA 2241" },
  { name: "Alpen Material AG",        slogan: "Qualität aus den Alpen",                branche: "Baumaterialien",   gf: "Josef Brandl",      farbe: "#14532d", icon: "⛰️",
    ort: "München",    plz: "80997", strasse: "Münchner Str. 88",    iban: "DE78760100850201234567", bank: "Postbank",                       email: "vertrieb@alpen-material.de",      tel: "089 / 35 46 78-0",  hrb: "HRB 5544" },
  { name: "Ostbayern Handel GmbH",    slogan: "Ihr Partner im Osten Bayerns",          branche: "Großhandel",       gf: "Klaus Wimmer",      farbe: "#7c2d12", icon: "📦",
    ort: "Landshut",   plz: "84030", strasse: "Bahnhofstraße 22",    iban: "DE11750400350012987654", bank: "Sparkasse Landshut",             email: "rechnungen@ostbayern-handel.de",  tel: "0871 / 22 11 00-0", hrb: "HRB 3301" },
  { name: "Maier Industriebedarf KG", slogan: "Alles für die Industrie",               branche: "Industriebedarf",  gf: "Andreas Maier",     farbe: "#374151", icon: "⚙️",
    ort: "Passau",     plz: "94032", strasse: "Hafenstraße 7",       iban: "DE34730500000023456789", bank: "Raiffeisenbank Passau",           email: "buchhaltung@maier-industrie.de",  tel: "0851 / 99 88 77-0", hrb: "HRA 1122" },
];

// ── Kunden ─────────────────────────────────────────────────────────────────────
export const KUNDEN = [
  { name: "TechBau AG",          slogan: "Bauen mit Technik und Tradition",     branche: "Bauunternehmen",       gf: "Stefan Riedl",    farbe: "#1e40af", icon: "🏗️", ort: "Nürnberg",    plz: "90402", strasse: "Hauptstraße 100",    iban: "DE78760100850000111122", kundennr: "KD-4821" },
  { name: "Maier Technik GmbH",  slogan: "Präzision und Innovation",            branche: "Maschinenbau",         gf: "Eva Maier",       farbe: "#374151", icon: "🔧", ort: "München",     plz: "80335", strasse: "Karlsplatz 5",       iban: "DE45700200700012345678", kundennr: "KD-3307" },
  { name: "Franken Industrie KG",slogan: "Industrielle Lösungen aus Franken",   branche: "Industrie",            gf: "Bernd Hofmann",   farbe: "#4c1d95", icon: "🏭", ort: "Würzburg",    plz: "97070", strasse: "Juliuspromenade 64", iban: "DE12790000000012345678", kundennr: "KD-5519" },
  { name: "Allgäu Handel GmbH",  slogan: "Handel und Logistik im Allgäu",       branche: "Einzelhandel",         gf: "Monika Zeller",   farbe: "#065f46", icon: "🛒", ort: "Kempten",     plz: "87435", strasse: "Rottachstraße 25",   iban: "DE56733500000012345678", kundennr: "KD-2044" },
  { name: "Nord-Süd Vertrieb AG",slogan: "Vertrieb ohne Grenzen",               branche: "Vertrieb & Logistik",  gf: "Peter Schuster",  farbe: "#7c3aed", icon: "🚛", ort: "Ingolstadt",  plz: "85049", strasse: "Ringstraße 45",      iban: "DE89721304000012345678", kundennr: "KD-6630" },
];

// ── Komplex-Step-Definitionen ──────────────────────────────────────────────────
export const KOMPLEX_STEP_DEFS = {
  "8_komplex_einkauf_kette":  [
    { optsKey: "angebotsvergleich", label: "Angebotsvergleich",   setVal: true },
    { optsKey: "kalkulation",       label: "Einkaufskalkulation", setVal: true },
    { optsKey: "ruecksendung",      label: "Rücksendung",         setVal: true },
    { optsKey: "nachlass",          label: "Preisnachlass",       setVal: true },
  ],
  "8_komplex_verkauf_kette":  [
    { optsKey: "vorkalkulation",    label: "Verkaufskalkulation", setVal: true },
    { optsKey: "ruecksendung",      label: "Rücksendung",         setVal: true },
    { optsKey: "nachlass",          label: "Preisnachlass",       setVal: true },
  ],
  "9_komplex_forderungskette":[
    { optsKey: "ewb", label: "EWB bilden", setVal: true },
  ],
  "10_komplex_abschlusskette":[
    { optsKey: "ara",        label: "Rechnungsabgrenzung (ARA)", setVal: true },
    { optsKey: "rst",        label: "Rückstellung",              setVal: true },
    { optsKey: "afa",        label: "Abschreibung (AfA)",        setVal: true },
    { optsKey: "ewb",        label: "EWB bilden",                setVal: true },
    { optsKey: "guv",        label: "GuV-Abschluss",             setVal: true },
    { optsKey: "kennzahlen", label: "Kennzahlen",                setVal: true },
  ],
};

// ── Modellunternehmen ──────────────────────────────────────────────────────────
export const UNTERNEHMEN = [
  {
    id: "lumitec", name: "LumiTec GmbH", ort: "Ingolstadt", plz: "85049", strasse: "Solarring 14",
    branche: "Elektronik/Solartechnik", rechtsform: "GmbH", inhaber: "Dr. Sabine Lux",
    iban: "DE45700604800000123456", bank: "Commerzbank AG", email: "buchhaltung@lumitec.de",
    farbe: "#f59e0b", icon: "☀️", slogan: "Energie aus Bayern.",
    rohstoffe:       ["Siliziumscheiben", "Kupferfolie", "Aluminiumprofile", "Borosilikatglas"],
    fremdbauteile:   ["Wechselrichter-Platinen", "Anschlussklemmen", "Dichtungsrahmen"],
    hilfsstoffe:     ["Lötpaste", "Isolierband", "Schrauben", "Silikon-Dichtmasse"],
    betriebsstoffe:  ["Druckluft (m³)", "Kühlwasser", "Reinigungsmittel"],
    handelswaren:    ["Batteriespeicher", "Laderegler", "Solarhalterungen"],
    fertigerzeugnisse: ["Solarmodul 400W", "LED-Flächenstrahler", "PV-Dachsystem"],
    anlagen:         ["CNC-Schneidanlage", "Bestückungsautomat", "Prüfstand", "Gabelstapler"],
  },
  {
    id: "waldform", name: "Waldform Design GmbH", ort: "Straubing", plz: "94315", strasse: "Holzhandwerkerring 3",
    branche: "Holz/Möbel/Design", rechtsform: "GmbH", inhaber: "Markus Waldner",
    iban: "DE12750501010034567890", bank: "Sparkasse Straubing-Bogen", email: "finanzen@waldform.de",
    farbe: "#92400e", icon: "🪵", slogan: "Massivholz aus dem Bayerischen Wald.",
    rohstoffe:       ["Eichenholz (Bohlen)", "Buchenholz (Bretter)", "Kirschholz (Furniere)"],
    fremdbauteile:   ["Möbelbeschläge", "Schubladenführungen", "Verbindungsbolzen"],
    hilfsstoffe:     ["Holzleim", "Schleifpapier", "Holzöl", "Grundierfarbe"],
    betriebsstoffe:  ["Kettenöl", "Maschinenöl", "Sägeblätter"],
    handelswaren:    ["Designergriffe", "Wandhaken-Sets", "Tischbeine Metall"],
    fertigerzeugnisse: ["Esstisch 'Forst'", "Sideboard 'Strom'", "Bücherregal 'Ast'"],
    anlagen:         ["CNC-Fräse", "Formatkreissäge", "Schleifmaschine", "Lackieranlage"],
  },
  {
    id: "alpentextil", name: "AlpenTextil KG", ort: "Kaufbeuren", plz: "87600", strasse: "Textilstraße 8",
    branche: "Textil/Bekleidung", rechtsform: "KG", inhaber: "Elisabeth Bergner",
    iban: "DE67733500000045678901", bank: "Volksbank Kaufbeuren-Ostallgäu eG", email: "verwaltung@alpentextil.de",
    farbe: "#047857", icon: "🧵", slogan: "Qualität aus dem Allgäu.",
    rohstoffe:       ["Merino-Wolle (kg)", "Gore-Tex-Gewebe (m²)", "Polyamid-Garn", "Fleece-Stoff"],
    fremdbauteile:   ["YKK-Reißverschlüsse", "Druckknöpfe", "Kordelstopper"],
    hilfsstoffe:     ["Nähgarn", "Klebeeinlage", "Schneidöl"],
    betriebsstoffe:  ["Maschinenöl", "Dampf (Bügelanlage)"],
    handelswaren:    ["Outdoorjacken (zugekauft)", "Wanderrucksäcke", "Thermosocken"],
    fertigerzeugnisse: ["Funktionsjacke 'AlpFlex'", "Arbeitshose 'ProWork'", "Wetterschutzjacke 'BergTop'"],
    anlagen:         ["Industrienähmaschinen (Set)", "Zuschneideroboter", "Stickmaschine", "Bügelanlage"],
  },
  {
    id: "vitasport", name: "VitaSport GmbH", ort: "Landsberg am Lech", plz: "86899", strasse: "Sportgeräteweg 21",
    branche: "Sportgeräte/Fitness", rechtsform: "GmbH", inhaber: "Thomas Kraft",
    iban: "DE23721604000056789012", bank: "Kreissparkasse Landsberg-Dießen", email: "buchhaltung@vitasport.de",
    farbe: "#1d4ed8", icon: "🏋️", slogan: "Fitness made in Bavaria.",
    rohstoffe:       ["Stahlrohr (m)", "Naturkautschuk (kg)", "PU-Schaumstoff (m²)"],
    fremdbauteile:   ["Stellschrauben", "Lager und Achsen", "Griffgummi", "Urethanrollen"],
    hilfsstoffe:     ["Schweißdraht", "Schleifscheiben", "Montagekleber"],
    betriebsstoffe:  ["Schutzgas", "Schneidöl"],
    handelswaren:    ["Gewichtsscheiben (Guss)", "Springseil-Sets", "Yogamatten"],
    fertigerzeugnisse: ["Kraftstation 'MaxForce 300'", "Laufband 'PulseRun'", "Rudergerät 'AquaPro'"],
    anlagen:         ["Schweißroboter", "Biegemaschine", "Pulverbeschichtungsanlage", "Prüfstand"],
  },
];

// ── Beleg-Helpers ──────────────────────────────────────────────────────────────
export const mkEingangsRE = (f, artikel, menge, einheit, netto, ustPct, klasse7 = false, skonto = 0, bezugskosten = 0, rabattInfo = null) => {
  const lief = pick(LIEFERANTEN);
  const lep = rabattInfo && rabattInfo.pct > 0 ? r2(netto / (1 - rabattInfo.pct / 100)) : netto;
  const rabBetrag = rabattInfo && rabattInfo.pct > 0 ? r2(lep - netto) : 0;
  const epVal = menge > 0 ? r2(lep / menge) : lep;
  const u = r2(netto * ustPct / 100);
  const b = r2(netto + u);
  const bzkNetto = bezugskosten;
  const bzkU = r2(bzkNetto * ustPct / 100);
  const gesamtBrutto = r2(b + bzkNetto + bzkU);
  const positionen = [{ pos: 1, beschr: artikel, menge, einheit, ep: epVal, lepNetto: lep, netto: lep }];
  if (rabattInfo && rabBetrag > 0) positionen.push({ pos: 2, beschr: "− " + (rabattInfo.typ || "Sofortrabatt") + " (" + rabattInfo.pct + " %)", menge: null, einheit: null, ep: null, netto: -rabBetrag, isRabatt: true });
  if (bzkNetto > 0) positionen.push({ pos: 3, beschr: "Transportkosten (Spedition)", menge: 1, einheit: "pauschal", ep: bzkNetto, netto: bzkNetto });
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

export const mkAusgangsRE = (f, artikel, menge, einheit, netto, ustPct, skonto = 0) => {
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

export const mkUeberweisung = (absender, empfaengerName, empfaengerIBAN, betrag, verwendung, skontoBetrag = 0) => ({
  typ: "ueberweisung",
  bank: "BayernOnline Banking",
  absender:   { name: absender.name, iban: absender.iban },
  empfaenger: { name: empfaengerName, iban: empfaengerIBAN },
  betrag: r2(betrag), skontoBetrag,
  verwendungszweck:  verwendung,
  ausfuehrungsdatum: fakeDatum(0),
});

export const mkKontoauszug = (f, buchungen) => ({
  typ: "kontoauszug",
  bank: "Volksbank Bayern eG",
  kontoinhaber: f.name,
  iban:         f.iban,
  auszugNr:     `${String(new Date().getMonth() + 1).padStart(2, "0")}/2025`,
  buchungen,
});

export const mkEmail = (von, vonName, an, betreff, text, datum = fakeDatum(-3)) => ({
  typ: "email", von, vonName, an, betreff, datum,
  uhrzeit: `${9 + Math.floor(Math.random() * 8)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")} Uhr`,
  text,
});
