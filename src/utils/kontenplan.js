// ══════════════════════════════════════════════════════════════════════════════
// Kontenplan-Utilities – Re-Export + Hilfsfunktionen für externe Nutzung
// renderMitTooltips() bleibt in BuchungsWerk.jsx (JSX-Abhängigkeit auf KürzelSpan)
// und wird in Phase C hierher migriert sobald KürzelSpan extrahiert ist.
// ══════════════════════════════════════════════════════════════════════════════
export {
  KONTEN,
  getKonto,
  getKürzel,
  getVollname,
  _KUERZEL_SET,
  _KUERZEL_REGEX,
  _KUERZEL_TO_NR,
  KONTEN_KLASSEN,
  KONTEN_TYP_FARBEN,
} from "../data/kontenplan.js";
