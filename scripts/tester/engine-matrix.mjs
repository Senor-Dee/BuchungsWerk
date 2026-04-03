import { belegToBuchungssatz } from '../../src/utils/buchungsEngine.js';

// Repräsentative Testfälle pro Belegtyp × Klasse
const MATRIX = [
  // eingangsrechnung
  { typ: 'eingangsrechnung', klasse: 7,
    data: { ustSatz: '19', bezugskosten: 0, rabattAktiv: false,
            positionen: [{ artikel: 'Rohstoffe', menge: 10, ep: 100 }] },
    expect: { sollNames: ['AWR'], habenNames: ['VE'], keineNr: true } },
  { typ: 'eingangsrechnung', klasse: 8,
    data: { ustSatz: '19', bezugskosten: 0, rabattAktiv: false,
            positionen: [{ artikel: 'Rohstoffe', menge: 10, ep: 100 }] },
    expect: { sollNames: ['AWR', 'VORST'], habenNames: ['VE'] } },
  { typ: 'eingangsrechnung', klasse: 8,
    data: { ustSatz: '19', bezugskosten: 50, rabattAktiv: false,
            positionen: [{ artikel: 'Rohstoffe', menge: 10, ep: 100 }] },
    expect: { sollNames: ['AWR', 'BZKR', 'VORST'], habenNames: ['VE'] } },
  { typ: 'eingangsrechnung', klasse: 8,
    data: { ustSatz: '19', bezugskosten: 0, rabattAktiv: false,
            positionen: [{ artikel: 'Büromaschinen', menge: 1, ep: 800 }] },
    expect: { sollNames: ['GWG'], habenNames: ['VE'] } },
  { typ: 'eingangsrechnung', klasse: 8,
    data: { ustSatz: '7', bezugskosten: 0, rabattAktiv: false,
            positionen: [{ artikel: 'Rohstoffe', menge: 1, ep: 200 }] },
    expect: { sollNames: ['AWR', 'VORST'], habenNames: ['VE'],
              betragCheck: { VORST: 14.00 } } },

  // ausgangsrechnung
  { typ: 'ausgangsrechnung', klasse: 8,
    data: { ustSatz: '19', positionen: [{ artikel: 'FE', menge: 5, ep: 200 }] },
    expect: { sollNames: ['FO'], habenNames: ['UEFE', 'UST'] } },

  // ueberweisung
  { typ: 'ueberweisung', klasse: 8,
    data: { betrag: '1190', skontoAktiv: false, verwendungszweck: 'Zahlung RE-001' },
    expect: { sollNames: ['VE'], habenNames: ['BK'] } },
  { typ: 'ueberweisung', klasse: 9,
    data: { betrag: '1190', skontoBetrag: '23,80',
            verwendungszweck: 'Zahlung mit Skonto' },
    expect: { sollNames: ['VE'], habenNames: ['BK', 'KGV'] } },

  // kontoauszug
  { typ: 'kontoauszug', klasse: 9,
    data: { buchungen: [{ text: 'Kundenzahlung', betrag: '500', highlight: true }],
            richtung: 'eingang' },
    expect: { sollNames: ['BK'], habenNames: ['FO'] } },
  { typ: 'kontoauszug', klasse: 9,
    data: { buchungen: [{ text: 'Überweisung Lieferant', betrag: '300', highlight: true }],
            richtung: 'ausgang' },
    expect: { sollNames: ['VE'], habenNames: ['BK'] } },
  { typ: 'kontoauszug', klasse: 9,
    data: { buchungen: [{ text: 'Zinsgutschrift', betrag: '25', highlight: true }] },
    expect: { sollNames: ['BK'], habenNames: ['DDE'] } },

  // email
  { typ: 'email', klasse: 8,
    data: { betreff: 'Gutschrift', text: '', betrag: 100, ustSatz: 19 },
    expect: { sollNames: ['UEFE', 'UST'], habenNames: ['FO'] } },
  { typ: 'email', klasse: 9,
    data: { betreff: 'Mahngebühr fällig', text: '', betrag: 5 },
    expect: { sollNames: ['FO'], habenNames: ['EMP'] } },

  // quittung
  { typ: 'quittung', klasse: 7,
    data: { betrag: '50', zweck: 'Büromaterial' },
    expect: { sollNames: ['BMK'], habenNames: ['KA'], keinVORST: true } },
  { typ: 'quittung', klasse: 8,
    data: { betrag: '119', ustSatz: 19, istBrutto: true, zweck: 'Büromaterial' },
    expect: { sollNames: ['BMK', 'VORST'], habenNames: ['KA'],
              betragCheck: { VORST: 19.00 } } },
];

export async function runEngineMatrix() {
  const results = { totalTests: MATRIX.length, totalFailures: 0, failures: [] };

  for (const tc of MATRIX) {
    try {
      const { buchungssatz } = belegToBuchungssatz({ typ: tc.typ, data: tc.data }, tc.klasse);

      const sollNames  = buchungssatz.map(z => z.soll_name);
      const habenNames = buchungssatz.map(z => z.haben_name);
      const errors     = [];

      // Soll-Namen prüfen
      (tc.expect.sollNames || []).forEach(name => {
        if (!sollNames.includes(name))
          errors.push(`Soll-Seite: "${name}" nicht gefunden (vorhanden: ${sollNames.join(', ')})`);
      });

      // Haben-Namen prüfen
      (tc.expect.habenNames || []).forEach(name => {
        if (!habenNames.includes(name))
          errors.push(`Haben-Seite: "${name}" nicht gefunden (vorhanden: ${habenNames.join(', ')})`);
      });

      // Keine Kontonummern für Klasse 7
      if (tc.expect.keineNr) {
        buchungssatz.forEach(z => {
          if (z.soll_nr !== '') errors.push(`Klasse 7: Kontonummer "${z.soll_nr}" sollte leer sein`);
        });
      }

      // Kein VORST erwartet
      if (tc.expect.keinVORST && sollNames.includes('VORST'))
        errors.push('VORST sollte nicht gebucht sein');

      // Betrags-Checks
      if (tc.expect.betragCheck) {
        for (const [kuerzel, expected] of Object.entries(tc.expect.betragCheck)) {
          const zeile = buchungssatz.find(z => z.soll_name === kuerzel || z.haben_name === kuerzel);
          if (!zeile) errors.push(`Konto ${kuerzel} nicht gefunden`);
          else if (Math.abs(zeile.betrag - expected) > 0.01)
            errors.push(`${kuerzel}: erwartet ${expected.toFixed(2)} € – erhalten ${zeile.betrag.toFixed(2)} €`);
        }
      }

      if (errors.length > 0) {
        results.failures.push({ typ: tc.typ, klasse: tc.klasse, data: tc.data, errors });
        results.totalFailures++;
        process.stdout.write('❌');
      } else {
        process.stdout.write('✅');
      }
    } catch (err) {
      results.failures.push({ typ: tc.typ, klasse: tc.klasse, data: tc.data,
                               errors: [`Exception: ${err.message}`] });
      results.totalFailures++;
      process.stdout.write('💥');
    }
  }
  process.stdout.write('\n');
  return results;
}
