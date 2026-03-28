// ══════════════════════════════════════════════════════════════════════════════
// HILFSFUNKTIONEN
// ══════════════════════════════════════════════════════════════════════════════
export const r2    = n => Math.round(n * 100) / 100;
export const fmt   = n => (n == null ? "0,00" : n).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
export const rnd   = (min, max, step = 50) => Math.round((min + Math.random() * (max - min)) / step) * step;

export const BUCHUNGS_JAHR = new Date().getFullYear();
export const rgnr     = () => `RE-${BUCHUNGS_JAHR}-${String(Math.floor(1000 + Math.random() * 8999))}`;
export const augnr    = () => `AR-${BUCHUNGS_JAHR}-${String(Math.floor(1000 + Math.random() * 8999))}`;
export const fakeDatum = (offsetDays = 0) => {
  const d = new Date(BUCHUNGS_JAHR, 2, 8 + offsetDays);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
};
export const fmtIBAN = iban => iban.replace(/(.{4})/g, "$1 ").trim();

// Du/Sie je nach Klasse
export const duSie      = klasse => klasse <= 9 ? "du" : "Sie";
export const duSieGross = klasse => klasse <= 9 ? "Du" : "Sie";

// ── Anrede-Transformation (Sie → du für Klassen 7–9) ──────────────────────────
const _satzAnfang = (before, offset) =>
  offset === 0 || /[.!?]\s+$/.test(before) || /^[\s]*$/.test(before);
const _imp = du => (match, offset, str) => {
  const atStart = _satzAnfang(str.slice(0, offset), offset);
  return atStart ? du[0].toUpperCase() + du.slice(1) : du[0].toLowerCase() + du.slice(1);
};
const _ind = (cap, low) => (m, o, s) => {
  const start = o === 0 || /[.!?]\s+$/.test(s.slice(0, o));
  return start ? cap : low;
};
export const ANREDE_REGELN = [
  [/bilden Sie/gi,               _imp("bilde")],
  [/buchen Sie/gi,               _imp("buche")],
  [/berechnen Sie/gi,            _imp("berechne")],
  [/erstellen Sie/gi,            _imp("erstelle")],
  [/vergleichen Sie/gi,          _imp("vergleiche")],
  [/entscheiden Sie/gi,          _imp("entscheide")],
  [/begr\u00fcnden Sie/gi,       _imp("begr\u00fcnde")],
  [/f\u00fcllen Sie/gi,          _imp("f\u00fclle")],
  [/tragen Sie/gi,               _imp("trage")],
  [/notieren Sie/gi,             _imp("notiere")],
  [/ermitteln Sie/gi,            _imp("ermittle")],
  [/stornieren Sie/gi,           _imp("storniere")],
  [/pr\u00fcfen Sie/gi,          _imp("pr\u00fcfe")],
  [/nennen Sie/gi,               _imp("nenne")],
  [/analysieren Sie/gi,          _imp("analysiere")],
  [/erl\u00e4utern Sie/gi,       _imp("erl\u00e4utere")],
  [/erkl\u00e4ren Sie/gi,        _imp("erkl\u00e4re")],
  [/beurteilen Sie/gi,           _imp("beurteile")],
  [/beschreiben Sie/gi,          _imp("beschreibe")],
  [/geben Sie/gi,                _imp("gib")],
  [/w\u00e4hlen Sie/gi,          _imp("w\u00e4hle")],
  [/stellen Sie/gi,              _imp("stelle")],
  [/zeigen Sie/gi,               _imp("zeige")],
  [/lesen Sie/gi,                _imp("lies")],
  [/verwenden Sie/gi,            _imp("verwende")],
  [/erfassen Sie/gi,             _imp("erfasse")],
  [/ordnen Sie/gi,               _imp("ordne")],
  [/f\u00fchren Sie/gi,          _imp("f\u00fchre")],
  [/vervollst\u00e4ndigen Sie/gi, _imp("vervollst\u00e4ndige")],
  [/beantworten Sie/gi,          _imp("beantworte")],
  [/beachten Sie/gi,             _imp("beachte")],
  [/bearbeiten Sie/gi,  _ind("Du bearbeitest", "du bearbeitest")],
  [/sind Sie/gi,        _ind("Bist du",        "bist du")],
  [/haben Sie/gi,       _ind("Hast du",        "hast du")],
  [/m\u00fcssen Sie/gi, _ind("Musst du",       "musst du")],
  [/k\u00f6nnen Sie/gi, _ind("Kannst du",      "kannst du")],
  [/sollen Sie/gi,      _ind("Sollst du",      "sollst du")],
  [/(^|\s)Sie(\s|$|[.,!?])/g, (_, a, b) => a + "du" + b],
  [/\bIhnen\b/g,  "dir"],
  [/\bIhrer\b/g,  "deiner"],
  [/\bIhrem\b/g,  "deinem"],
  [/\bIhre\b/g,   "deine"],
  [/\bIhr\b/g,    "dein"],
];
export const anrede = (klasse, text) => {
  if (!text || klasse >= 10) return text;
  return ANREDE_REGELN.reduce((t, [re, repl]) => t.replace(re, repl), text);
};

// ── Punkte & Notensystem ───────────────────────────────────────────────────────
export const berechnePunkte = a => a.taskTyp === "komplex"
  ? (a.schritte || []).reduce((s, st) => s + st.punkte, 0)
  : a.taskTyp === "theorie"
    ? (a.nrPunkte || 4)
    : a.taskTyp === "rechnung" || a.taskTyp === "schaubild"
    ? (a.punkte || a.nrPunkte || 0)
    : (a.soll?.length || 0) + (a.haben?.length || 0) + (a.nrPunkte || 0);

export const NOTEN_ANKER = {
  locker: [0.90, 0.77, 0.58, 0.40, 0.23],
  isb:    [0.92, 0.80, 0.67, 0.50, 0.30],
  streng: [0.96, 0.87, 0.74, 0.59, 0.38],
};
export const notenTabelle = (max, strenge = 0.5) => {
  const r5 = v => Math.round(v * 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const pcts = NOTEN_ANKER.isb.map((isb, i) =>
    strenge <= 0.5
      ? lerp(NOTEN_ANKER.locker[i], isb, strenge * 2)
      : lerp(isb, NOTEN_ANKER.streng[i], (strenge - 0.5) * 2)
  );
  const ug = idx => Math.min(max, r5(max * pcts[idx]));
  const n1 = ug(0), n2 = ug(1), n3 = ug(2), n4 = ug(3), n5 = ug(4);
  const n6bis = Math.max(0, n5 - 0.5);
  return [
    { note: 1, text: "Sehr gut",     farbe: "#15803d", von: n1,  bis: max      },
    { note: 2, text: "Gut",          farbe: "#16a34a", von: n2,  bis: n1 - 0.5 },
    { note: 3, text: "Befriedigend", farbe: "#ca8a04", von: n3,  bis: n2 - 0.5 },
    { note: 4, text: "Ausreichend",  farbe: "#d97706", von: n4,  bis: n3 - 0.5 },
    { note: 5, text: "Mangelhaft",   farbe: "#dc2626", von: n5,  bis: n4 - 0.5 },
    { note: 6, text: "Ungenügend",   farbe: "#991b1b", von: 0,   bis: n6bis    },
  ];
};

// ── Werkstoff-Typen & Lernbereich-Meta ────────────────────────────────────────
export const WERKSTOFF_TYPEN = [
  { id: "rohstoffe",     label: "Rohstoffe",     icon: "Layers",    aw: { nr: "6000", kürzel: "AWR",  name: "Aufwend. Rohstoffe (AWR)"        }, nl: { nr: "6002", kürzel: "NR",   name: "Nachlässe auf Rohstoffe (NR)"      }, bzk: { nr: "6001", kürzel: "BZKR", name: "Bezugskosten Rohstoffe (BZKR)"   }, key: "rohstoffe"     },
  { id: "hilfsstoffe",   label: "Hilfsstoffe",   icon: "Wrench",    aw: { nr: "6020", kürzel: "AWH",  name: "Aufwend. Hilfsstoffe (AWH)"       }, nl: { nr: "6022", kürzel: "NH",   name: "Nachlässe auf Hilfsstoffe (NH)"    }, bzk: { nr: "6021", kürzel: "BZKH", name: "Bezugskosten Hilfsstoffe (BZKH)" }, key: "hilfsstoffe"   },
  { id: "fremdbauteile", label: "Fremdbauteile", icon: "Component", aw: { nr: "6010", kürzel: "AWF",  name: "Aufwend. Fremdbauteile (AWF)"     }, nl: { nr: "6012", kürzel: "NF",   name: "Nachlässe auf Fremdbauteile (NF)" }, bzk: { nr: "6011", kürzel: "BZKF", name: "Bezugskosten Fremdbauteile (BZKF)"},key: "fremdbauteile" },
  { id: "betriebsstoffe",label: "Betriebsstoffe",icon: "Fuel",      aw: { nr: "6030", kürzel: "AWB",  name: "Aufwend. Betriebsstoffe (AWB)"    }, nl: { nr: "6032", kürzel: "NB",   name: "Nachlässe auf Betriebsstoffe (NB)"},bzk: { nr: "6031", kürzel: "BZKB", name: "Bezugskosten Betriebsstoffe (BZKB)"},key:"betriebsstoffe" },
];

export const LB_INFO = {
  "LB 1 · Prozentrechnung":                   { icon: "Hash",          farbe: "#f59e0b" },
  "LB 1 · Schaubild-Analyse":                 { icon: "BarChart2",     farbe: "#0ea5e9" },
  "LB 3 · Einführung Buchführung":            { icon: "BookOpen",      farbe: "#3b82f6" },
  "LB 4 · Betrieblicher Produktionsprozess":  { icon: "Settings",      farbe: "#8b5cf6" },
  "LB 2 · Werkstoffe & Einkauf":              { icon: "Package",       farbe: "#f59e0b" },
  "LB 2 · Bestandsveränderungen Werkstoffe":  { icon: "BarChart2",     farbe: "#0ea5e9" },
  "LB 3 · Marketing":                         { icon: "Megaphone",     farbe: "#e11d48" },
  "LB 4 · Verkauf & Fertigerzeugnisse":       { icon: "Tag",           farbe: "#10b981" },
  "LB 5 · Personalbereich":                   { icon: "Users",         farbe: "#ec4899" },
  "LB 6 · Unternehmen und Staat":             { icon: "Landmark",      farbe: "#6366f1" },
  "LB 1 · Privatkonto & Unternehmerlohn":     { icon: "Briefcase",     farbe: "#f97316" },
  "LB 2 · Anlagenbereich":                    { icon: "Factory",       farbe: "#64748b" },
  "LB 3 · Finanzierung":                      { icon: "Building2",     farbe: "#0ea5e9" },
  "LB 4 · Kapitalanlage":                     { icon: "TrendingUp",    farbe: "#84cc16" },
  "LB 5 · Forderungsbewertung":               { icon: "AlertTriangle", farbe: "#ef4444" },
  "LB 1 · Abgrenzung & Rückstellungen":       { icon: "Calendar",      farbe: "#7c3aed" },
  "LB 2 · Kennzahlen & Bilanzanalyse":        { icon: "TrendingDown",  farbe: "#059669" },
  "LB 3 · Vollkostenrechnung":                { icon: "Calculator",    farbe: "#0d9488" },
  "LB 4 · Teilkostenrechnung":                { icon: "BarChart2",     farbe: "#d97706" },
  "LB 5 · Jahresabschluss":                   { icon: "ClipboardList", farbe: "#0891b2" },
  "Kontenabschluss":                           { icon: "Lock",          farbe: "#0f172a" },
  "Theorie · Grundbegriffe":                   { icon: "Library",       farbe: "#0891b2" },
  "Theorie · Rechnungswesen":                  { icon: "Library",       farbe: "#0891b2" },
  "Theorie · Bewertung & Personal":            { icon: "Library",       farbe: "#0891b2" },
  "Theorie · Abschluss & Controlling":         { icon: "Library",       farbe: "#0891b2" },
};
