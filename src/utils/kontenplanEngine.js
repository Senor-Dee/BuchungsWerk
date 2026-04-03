// ══════════════════════════════════════════════════════════════════════════════
// kontenplanEngine.js – ISB-Kontenplan Bayern (LehrplanPLUS 2026)
// Deterministische Datenquelle für BuchungsEngine
// Validiert durch bwr-sensei (BwR-Fachexperte Bayern) ✅
// ══════════════════════════════════════════════════════════════════════════════

import { KONTEN } from '../data/kontenplan.js';

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
 *
 * Single Source of Truth: src/data/kontenplan.js
 * KONTENPLAN wird programmatisch aus KONTEN abgeleitet.
 */

// KONTENPLAN-Dict aus kontenplan.js ableiten (Single Source of Truth)
// Konvertiert Array-Format → Dict-Format mit kürzel (Umlaut) statt kuerzel
export const KONTENPLAN = Object.fromEntries(
  KONTEN
    .filter(k => k.minSchulklasse !== undefined)
    .map(k => [
      k.nr,
      {
        kürzel:      k.kuerzel,           // kuerzel → kürzel (Konsistenz mit Engine)
        name:        k.name,
        minKlasse:   k.minSchulklasse,    // minSchulklasse → minKlasse (Engine-API bleibt gleich)
        lernbereich: k.lernbereich,
        typ:         k.typ,
      }
    ])
);

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
