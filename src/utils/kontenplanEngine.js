// ══════════════════════════════════════════════════════════════════════════════
// kontenplanEngine.js – ISB-Kontenplan Bayern (LehrplanPLUS 2026)
// Deterministische Datenquelle für BuchungsEngine
// Validiert durch bwr-sensei (BwR-Fachexperte Bayern) ✅
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ISB-Kontenplan Bayern nach LehrplanPLUS 2026.
 * NUR diese Konten sind lehrplan-konform (kein SKR03/04!).
 *
 * Felder:
 *   kürzel      – offizielle ISB-Abkürzung (z.B. "AWR", "VORST")
 *   name        – Vollname des Kontos
 *   minKlasse   – ab welcher Jahrgangsstufe lehrplan-konform eingeführt
 *   lernbereich – primärer Lernbereich im Lehrplan (z.B. "LB4")
 *   typ         – "aktiv" | "passiv" | "ertrag" | "aufwand" | "abschluss"
 */
export const KONTENPLAN = {
  // ── AKTIVKONTEN (Bestand) ──────────────────────────────────────────────────
  // Anlagevermögen
  '0500': { kürzel: 'GR',    name: 'Grundstücke',                               minKlasse: 7, lernbereich: 'LB3',      typ: 'aktiv'    },
  '0700': { kürzel: 'MA',    name: 'Maschinen und Anlagen',                      minKlasse: 8, lernbereich: 'LB2',      typ: 'aktiv'    },
  '0840': { kürzel: 'FP',    name: 'Fuhrpark',                                   minKlasse: 8, lernbereich: 'LB2',      typ: 'aktiv'    },
  '0860': { kürzel: 'BM',    name: 'Büromaschinen',                              minKlasse: 8, lernbereich: 'LB2',      typ: 'aktiv'    },
  '0870': { kürzel: 'BGA',   name: 'Büromöbel und Geschäftsausstattung',         minKlasse: 8, lernbereich: 'LB2',      typ: 'aktiv'    },
  '0890': { kürzel: 'GWG',   name: 'Geringwertige Wirtschaftsgüter',             minKlasse: 8, lernbereich: 'LB2',      typ: 'aktiv'    },
  // Umlaufvermögen – Vorräte
  '2000': { kürzel: 'R',     name: 'Rohstoffe',                                  minKlasse: 7, lernbereich: 'LB4',      typ: 'aktiv'    },
  '2010': { kürzel: 'F',     name: 'Fremdbauteile',                              minKlasse: 8, lernbereich: 'LB2',      typ: 'aktiv'    },
  '2020': { kürzel: 'H',     name: 'Hilfsstoffe',                                minKlasse: 8, lernbereich: 'LB2',      typ: 'aktiv'    },
  '2030': { kürzel: 'B',     name: 'Betriebsstoffe',                             minKlasse: 8, lernbereich: 'LB2',      typ: 'aktiv'    },
  // Umlaufvermögen – Forderungen
  '2400': { kürzel: 'FO',    name: 'Forderungen aus L+L',                        minKlasse: 8, lernbereich: 'LB4',      typ: 'aktiv'    },
  '2470': { kürzel: 'ZWFO',  name: 'Zweifelhafte Forderungen',                   minKlasse: 9, lernbereich: 'LB5',      typ: 'aktiv'    },
  // Umlaufvermögen – Steuern & Abgrenzung
  '2600': { kürzel: 'VORST', name: 'Vorsteuer',                                  minKlasse: 8, lernbereich: 'LB6',      typ: 'aktiv'    },
  '2800': { kürzel: 'BK',    name: 'Bank (Kontokorrentkonto)',                   minKlasse: 7, lernbereich: 'LB3',      typ: 'aktiv'    },
  '2880': { kürzel: 'KA',    name: 'Kasse',                                      minKlasse: 7, lernbereich: 'LB3',      typ: 'aktiv'    },
  '2900': { kürzel: 'ARA',   name: 'Aktive Rechnungsabgrenzung',                 minKlasse: 10, lernbereich: 'LB1',     typ: 'aktiv'    },

  // ── PASSIVKONTEN (Bestand) ─────────────────────────────────────────────────
  // Eigenkapital
  '3000': { kürzel: 'EK',    name: 'Eigenkapital',                               minKlasse: 7, lernbereich: 'LB3',      typ: 'passiv'   },
  '3001': { kürzel: 'P',     name: 'Privatkonto',                                minKlasse: 9, lernbereich: 'LB1',      typ: 'passiv'   },
  // Wertberichtigungen
  '3670': { kürzel: 'EWB',   name: 'Einzelwertberichtigung',                     minKlasse: 9, lernbereich: 'LB5',      typ: 'passiv'   },
  '3680': { kürzel: 'PWB',   name: 'Pauschalwertberichtigung',                   minKlasse: 9, lernbereich: 'LB5',      typ: 'passiv'   },
  '3900': { kürzel: 'RST',   name: 'Rückstellungen',                             minKlasse: 10, lernbereich: 'LB1',     typ: 'passiv'   },
  // Verbindlichkeiten
  '4200': { kürzel: 'KBKV',  name: 'Kurzfristige Bankverbindlichkeiten',         minKlasse: 8, lernbereich: 'LB6',      typ: 'passiv'   },
  '4250': { kürzel: 'LBKV',  name: 'Langfristige Bankverbindlichkeiten',         minKlasse: 9, lernbereich: 'LB3',      typ: 'passiv'   },
  '4400': { kürzel: 'VE',    name: 'Verbindlichkeiten aus L+L',                  minKlasse: 7, lernbereich: 'LB4',      typ: 'passiv'   },
  // Steuern
  '4800': { kürzel: 'UST',   name: 'Umsatzsteuer',                               minKlasse: 8, lernbereich: 'LB6',      typ: 'passiv'   },
  '4900': { kürzel: 'PRA',   name: 'Passive Rechnungsabgrenzung',                minKlasse: 10, lernbereich: 'LB1',     typ: 'passiv'   },

  // ── ERTRAGSKONTEN (GuV – Haben = Einnahmen) ───────────────────────────────
  '5000': { kürzel: 'UEFE',  name: 'Umsatzerlöse für eigene Erzeugnisse',        minKlasse: 8, lernbereich: 'LB4',      typ: 'ertrag'   },
  '5400': { kürzel: 'EMP',   name: 'Erlöse/Mahngebühren/Provisionen',            minKlasse: 9, lernbereich: 'LB5',      typ: 'ertrag'   },
  '5430': { kürzel: 'ASBE',  name: 'Andere sonstige betriebliche Erträge',       minKlasse: 8, lernbereich: 'LB4',      typ: 'ertrag'   },
  '5710': { kürzel: 'ZE',    name: 'Zinserträge',                                minKlasse: 9, lernbereich: 'LB3',      typ: 'ertrag'   },
  '5780': { kürzel: 'DDE',   name: 'Dividendenerträge',                          minKlasse: 9, lernbereich: 'LB3',      typ: 'ertrag'   },

  // ── AUFWANDSKONTEN (GuV – Soll = Ausgaben) ────────────────────────────────
  // Materialaufwand
  '6000': { kürzel: 'AWR',   name: 'Aufwendungen für Rohstoffe',                 minKlasse: 7, lernbereich: 'LB4',      typ: 'aufwand'  },
  '6001': { kürzel: 'BZKR',  name: 'Bezugskosten für Rohstoffe',                 minKlasse: 8, lernbereich: 'LB2',      typ: 'aufwand'  },
  '6010': { kürzel: 'AWF',   name: 'Aufwendungen für Fremdbauteile',             minKlasse: 8, lernbereich: 'LB2',      typ: 'aufwand'  },
  '6011': { kürzel: 'BZKF',  name: 'Bezugskosten für Fremdbauteile',             minKlasse: 8, lernbereich: 'LB2',      typ: 'aufwand'  },
  '6020': { kürzel: 'AWH',   name: 'Aufwendungen für Hilfsstoffe',               minKlasse: 8, lernbereich: 'LB2',      typ: 'aufwand'  },
  '6021': { kürzel: 'BZKH',  name: 'Bezugskosten für Hilfsstoffe',               minKlasse: 8, lernbereich: 'LB2',      typ: 'aufwand'  },
  '6030': { kürzel: 'AWB',   name: 'Aufwendungen für Betriebsstoffe',            minKlasse: 8, lernbereich: 'LB2',      typ: 'aufwand'  },
  '6031': { kürzel: 'BZKB',  name: 'Bezugskosten für Betriebsstoffe',            minKlasse: 8, lernbereich: 'LB2',      typ: 'aufwand'  },
  // Personal
  '6200': { kürzel: 'LG',    name: 'Löhne und Gehälter',                         minKlasse: 8, lernbereich: 'LB5',      typ: 'aufwand'  },
  '6400': { kürzel: 'AGASV', name: 'Arbeitgeberanteil Sozialversicherung',       minKlasse: 8, lernbereich: 'LB5',      typ: 'aufwand'  },
  // Abschreibungen
  '6520': { kürzel: 'ABSA',  name: 'Abschreibungen auf Sachanlagen',             minKlasse: 9, lernbereich: 'LB2',      typ: 'aufwand'  },
  '6540': { kürzel: 'ABGWG', name: 'Abschreibungen auf GWG',                    minKlasse: 8, lernbereich: 'LB2',      typ: 'aufwand'  },
  // Sonstige
  '6700': { kürzel: 'AWMP',  name: 'Mieten, Pachten',                            minKlasse: 7, lernbereich: 'LB3',      typ: 'aufwand'  },
  '6750': { kürzel: 'KGV',   name: 'Kosten des Geldverkehrs (Skonto-Gewinn)',    minKlasse: 9, lernbereich: 'LB3',      typ: 'aufwand'  },
  '6800': { kürzel: 'BMK',   name: 'Büromaterial und Kleingüter',                minKlasse: 7, lernbereich: 'LB3',      typ: 'aufwand'  },
  '6820': { kürzel: 'KOM',   name: 'Kommunikationsgebühren',                     minKlasse: 9, lernbereich: 'LB3',      typ: 'aufwand'  },
  '6870': { kürzel: 'WER',   name: 'Werbung',                                    minKlasse: 7, lernbereich: 'LB3',      typ: 'aufwand'  },
  '6900': { kürzel: 'VBEI',  name: 'Versicherungsbeiträge',                      minKlasse: 7, lernbereich: 'LB3',      typ: 'aufwand'  },
  '6950': { kürzel: 'ABFO',  name: 'Abschreibungen auf Forderungen',             minKlasse: 9, lernbereich: 'LB5',      typ: 'aufwand'  },
  '7510': { kürzel: 'ZAW',   name: 'Zinsaufwendungen',                           minKlasse: 9, lernbereich: 'LB3',      typ: 'aufwand'  },

  // ── ABSCHLUSSKONTEN ────────────────────────────────────────────────────────
  '8010': { kürzel: 'SBK',   name: 'Schlussbilanzkonto',                         minKlasse: 7, lernbereich: 'LB5',      typ: 'abschluss' },
  '8020': { kürzel: 'GUV',   name: 'Gewinn- und Verlustrechnung',                minKlasse: 7, lernbereich: 'LB5',      typ: 'abschluss' },
};

// ── Konten nach Jahrgangsstufe (erstmals eingeführt) ──────────────────────────
// Jede Stufe ENTHÄLT alle vorherigen Konten (kumulativ)!
export const KONTEN_BY_KLASSE = {
  7:  ['6000', '4400', '2800', '2880', '1500', '3000', '2000', '0500', '6700', '6800', '6870', '6900', '8010', '8020', '4400'],
  8:  ['6001', '6010', '6011', '6020', '6021', '6030', '6031', '0700', '0840', '0860', '0870', '0890', '2010', '2020', '2030',
        '2400', '2600', '4800', '5000', '4200', '6200', '6400', '6540'],
  9:  ['6750', '5400', '5780', '5710', '6820', '6950', '6520', '7510', '4250', '3670', '3680', '2470', '3001'],
  10: ['2900', '4900', '3900'],
};

// ── Lookup-Index: Kürzel → { nr, ...konto } ──────────────────────────────────
export const KONTENPLAN_INDEX = {};
Object.entries(KONTENPLAN).forEach(([nr, data]) => {
  KONTENPLAN_INDEX[data.kürzel] = { ...data, nr };
});

// ── Werkstoff-Konten-Mapping (Rohstoffe, Hilfsstoffe, etc.) ──────────────────
// Ermöglicht korrekte Konto-Auswahl nach Artikel-Typ
export const WERKSTOFF_KONTEN = {
  rohstoffe:     { aw: { nr: '6000', kürzel: 'AWR'  }, bzk: { nr: '6001', kürzel: 'BZKR' } },
  hilfsstoffe:   { aw: { nr: '6020', kürzel: 'AWH'  }, bzk: { nr: '6021', kürzel: 'BZKH' } },
  fremdbauteile: { aw: { nr: '6010', kürzel: 'AWF'  }, bzk: { nr: '6011', kürzel: 'BZKF' } },
  betriebsstoffe:{ aw: { nr: '6030', kürzel: 'AWB'  }, bzk: { nr: '6031', kürzel: 'BZKB' } },
};

// ── GWG-Grenze nach ISB ───────────────────────────────────────────────────────
export const GWG_GRENZE = 800.00; // ≤800€ netto = Geringwertiges Wirtschaftsgut

// ── Helper-Funktionen ─────────────────────────────────────────────────────────

/**
 * Prüft ob eine Kontonummer im ISB-Kontenplan vorhanden ist.
 * @param {string} nr – Kontonummer z.B. "6000"
 * @returns {boolean}
 */
export function validateKonto(nr) {
  return nr in KONTENPLAN;
}

/**
 * Gibt das Kürzel für eine Kontonummer zurück.
 * @param {string} nr – z.B. "6000" → "AWR"
 * @returns {string|null}
 */
export function getKürzel(nr) {
  return KONTENPLAN[nr]?.kürzel ?? null;
}

/**
 * Gibt den Vollnamen eines Kontos zurück.
 * @param {string} nr – z.B. "6000" → "Aufwendungen für Rohstoffe"
 * @returns {string|null}
 */
export function getKontoName(nr) {
  return KONTENPLAN[nr]?.name ?? null;
}

/**
 * Sucht ein Konto nach Kürzel.
 * @param {string} kürzel – z.B. "AWR"
 * @returns {{ nr, kürzel, name, minKlasse, lernbereich, typ }|null}
 */
export function getKontoByKürzel(kürzel) {
  return KONTENPLAN_INDEX[kürzel] ?? null;
}

/**
 * Prüft ob ein Konto für eine Jahrgangsstufe lehrplan-konform ist.
 * Jahrgänge sind KUMULATIV: Klasse 8 kennt alle Konten aus Klasse 7 und 8.
 * @param {string} nr – Kontonummer
 * @param {number} klasse – Jahrgangsstufe (7–10)
 * @returns {boolean}
 */
export function isKontoForKlasse(nr, klasse) {
  const konto = KONTENPLAN[nr];
  if (!konto) return false;
  return konto.minKlasse <= klasse;
}

/**
 * Gibt die Werkstoff-Konten für ein Artikel-Stichwort zurück.
 * Erkennt: rohstoffe, hilfsstoffe, fremdbauteile, betriebsstoffe
 * Default: rohstoffe (AWR)
 * @param {string} artikelName – z.B. "Rohstoffe" oder "Hilfsstoffe A-01"
 * @returns {{ aw: {nr, kürzel}, bzk: {nr, kürzel} }}
 */
export function getWerkstoffKonten(artikelName) {
  const name = (artikelName || '').toLowerCase();
  if (name.includes('hilfsstoff'))    return WERKSTOFF_KONTEN.hilfsstoffe;
  if (name.includes('fremdbauteil'))  return WERKSTOFF_KONTEN.fremdbauteile;
  if (name.includes('betriebsstoff')) return WERKSTOFF_KONTEN.betriebsstoffe;
  return WERKSTOFF_KONTEN.rohstoffe; // Default: Rohstoffe
}
