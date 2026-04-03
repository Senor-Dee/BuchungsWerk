// ══════════════════════════════════════════════════════════════════════════════
// buchungsEngine.test.js – Unit-Tests für BuchungsEngine
// ISB-Bayern · LehrplanPLUS 2026 · Vitest
// ══════════════════════════════════════════════════════════════════════════════

import { describe, test, expect } from 'vitest';
import { belegToBuchungssatz, buchungssatzToText, getMinKlasseForBelegTyp, validatePoolBuchungssatz } from './buchungsEngine.js';
import { KONTEN } from '../data/kontenplan.js';
import { KONTENPLAN } from '../utils/kontenplanEngine.js';

// ── Testdaten-Helfer ──────────────────────────────────────────────────────────

function mkEingangsRE(overrides = {}) {
  return {
    typ: 'eingangsrechnung',
    data: {
      positionen: [{ id: '1', artikel: 'Rohstoffe', menge: '100', einheit: 'kg', ep: '10,00' }],
      bezugskosten: '0',
      ustSatz: '19',
      rabattAktiv: false,
      rabattPct: '0',
      zahlungsziel: '30',
      lieferantName: 'Müller GmbH',
      empfaengerName: 'LumiTec GmbH',
      ...overrides,
    },
  };
}

function mkAusgangsRE(overrides = {}) {
  return {
    typ: 'ausgangsrechnung',
    data: {
      positionen: [{ id: '1', artikel: 'Fertigerzeugnisse', menge: '10', einheit: 'Stk', ep: '50,00' }],
      ustSatz: '19',
      rabattAktiv: false,
      rabattPct: '0',
      absenderName: 'LumiTec GmbH',
      kundeName: 'Kunde AG',
      ...overrides,
    },
  };
}

function mkUeberweisung(overrides = {}) {
  return {
    typ: 'ueberweisung',
    data: {
      betrag: '100,00',
      skontoBetrag: '0',
      auftraggeberName: 'LumiTec GmbH',
      empfaengerName: 'Müller GmbH',
      verwendung: 'RE-2026-001',
      ...overrides,
    },
  };
}

function mkKontoauszug(text, betrag, overrides = {}) {
  return {
    typ: 'kontoauszug',
    data: {
      bank: 'Volksbank Bayern eG',
      inhaber: 'LumiTec GmbH',
      buchungen: [
        { id: '1', datum: '2026-04-01', text, betrag: String(betrag), highlight: true },
      ],
      ...overrides,
    },
  };
}

function mkEmail(betreff, text, overrides = {}) {
  return {
    typ: 'email',
    data: {
      von: 'kunde@test.de',
      an: 'lumitec@test.de',
      betreff,
      text,
      ...overrides,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 1: Eingangsrechnungen (10 Tests)
// ══════════════════════════════════════════════════════════════════════════════
describe('Eingangsrechnung', () => {

  test('Standard Kl.8: 6000 AWR + 2600 VORST an 4400 VE', () => {
    const { buchungssatz } = belegToBuchungssatz(mkEingangsRE(), 8);
    // Alle Zeilen in gruppe=1 (zusammengesetzter Buchungssatz)
    expect(buchungssatz.every(z => z.gruppe === 1)).toBe(true);
    // Soll-Konten: AWR und VORST
    const sollKonten = buchungssatz.map(z => z.soll_name);
    expect(sollKonten).toContain('AWR');
    expect(sollKonten).toContain('VORST');
    // Haben: VE (alle)
    expect(buchungssatz.every(z => z.haben_name === 'VE')).toBe(true);
    // Beträge: 100 netto + 19 vorst
    const awr  = buchungssatz.find(z => z.soll_name === 'AWR');
    const vorst = buchungssatz.find(z => z.soll_name === 'VORST');
    expect(awr.betrag).toBe(1000.00);  // 100 kg × 10,00
    expect(vorst.betrag).toBe(190.00); // 19%
  });

  test('Kontonummern vorhanden ab Kl.8', () => {
    const { buchungssatz } = belegToBuchungssatz(mkEingangsRE(), 8);
    expect(buchungssatz[0].soll_nr).toBe('6000');
    expect(buchungssatz[0].haben_nr).toBe('4400');
  });

  test('Klasse 7: NUR Kürzel (keine Kontonummern)', () => {
    const { buchungssatz } = belegToBuchungssatz(mkEingangsRE(), 7);
    buchungssatz.forEach(z => {
      expect(z.soll_nr).toBe('');
      expect(z.haben_nr).toBe('');
    });
  });

  test('Klasse 7: Bruttobetrag, kein VORST', () => {
    const { buchungssatz } = belegToBuchungssatz(mkEingangsRE(), 7);
    expect(buchungssatz).toHaveLength(1);
    expect(buchungssatz[0].soll_name).toBe('AWR');
    expect(buchungssatz[0].betrag).toBe(1190.00); // 1000 + 19% = 1190 (brutto)
  });

  test('GWG ≤800€: 0890 GWG statt 6000 AWR', () => {
    // 5 Stk × 100,00 = 500€ netto → GWG
    const beleg = mkEingangsRE({
      positionen: [{ id: '1', artikel: 'Werkzeug', menge: '5', einheit: 'Stk', ep: '100,00' }],
    });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    const gwg = buchungssatz.find(z => z.soll_name === 'GWG');
    expect(gwg).toBeDefined();
    expect(gwg.soll_nr).toBe('0890');
    expect(gwg.betrag).toBe(500.00);
  });

  test('GWG-Grenze: 800€ = GWG', () => {
    const beleg = mkEingangsRE({
      positionen: [{ id: '1', artikel: 'Gerät', menge: '1', einheit: 'Stk', ep: '800,00' }],
    });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    expect(buchungssatz.some(z => z.soll_name === 'GWG')).toBe(true);
  });

  test('GWG-Grenze: 800,01€ = AWR (kein GWG)', () => {
    const beleg = mkEingangsRE({
      positionen: [{ id: '1', artikel: 'Gerät', menge: '1', einheit: 'Stk', ep: '800,01' }],
    });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    expect(buchungssatz.some(z => z.soll_name === 'AWR')).toBe(true);
    expect(buchungssatz.some(z => z.soll_name === 'GWG')).toBe(false);
  });

  test('+ Bezugskosten: AWR + BZKR + VORST an VE', () => {
    const beleg = mkEingangsRE({ bezugskosten: '50,00' });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    const sollKonten = buchungssatz.map(z => z.soll_name);
    expect(sollKonten).toContain('AWR');
    expect(sollKonten).toContain('BZKR');
    expect(sollKonten).toContain('VORST');
    // VORST auf Gesamtnetto (Material + BZK) berechnet
    const vorst = buchungssatz.find(z => z.soll_name === 'VORST');
    expect(vorst.betrag).toBe(199.50); // (1000 + 50) × 19% = 199,50
  });

  test('USt-Satz 7%: VORST korrekt berechnet', () => {
    const beleg = mkEingangsRE({ ustSatz: '7' });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    const vorst = buchungssatz.find(z => z.soll_name === 'VORST');
    expect(vorst.betrag).toBe(70.00); // 1000 × 7% = 70
  });

  test('Rabatt: Nettobetrag nach Abzug', () => {
    const beleg = mkEingangsRE({ rabattAktiv: true, rabattPct: '10' });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    const awr = buchungssatz.find(z => z.soll_name === 'AWR');
    expect(awr.betrag).toBe(900.00); // 1000 × (1 - 10%) = 900
    const vorst = buchungssatz.find(z => z.soll_name === 'VORST');
    expect(vorst.betrag).toBe(171.00); // 900 × 19% = 171
  });

  test('Hilfsstoffe: AWH statt AWR', () => {
    const beleg = mkEingangsRE({
      positionen: [{ id: '1', artikel: 'Hilfsstoffe', menge: '10', einheit: 'kg', ep: '20,00' }],
    });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    expect(buchungssatz.some(z => z.soll_name === 'AWH')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 2: Ausgangsrechnungen (5 Tests)
// ══════════════════════════════════════════════════════════════════════════════
describe('Ausgangsrechnung', () => {

  test('Standard Kl.8: FO an UEFE (netto) + FO an UST (ust)', () => {
    const { buchungssatz } = belegToBuchungssatz(mkAusgangsRE(), 8);
    // Zwei separate Gruppen (keine zusammengesetzten – verschiedene Haben-Konten)
    const fo_uefe = buchungssatz.find(z => z.soll_name === 'FO' && z.haben_name === 'UEFE');
    const fo_ust  = buchungssatz.find(z => z.soll_name === 'FO' && z.haben_name === 'UST');
    expect(fo_uefe).toBeDefined();
    expect(fo_ust).toBeDefined();
    // Netto: 10 × 50 = 500
    expect(fo_uefe.betrag).toBe(500.00);
    // USt: 500 × 19% = 95
    expect(fo_ust.betrag).toBe(95.00);
  });

  test('Separate gruppen (UEFE und UST in unterschiedlichen gruppen)', () => {
    const { buchungssatz } = belegToBuchungssatz(mkAusgangsRE(), 8);
    const fo_uefe = buchungssatz.find(z => z.haben_name === 'UEFE');
    const fo_ust  = buchungssatz.find(z => z.haben_name === 'UST');
    expect(fo_uefe.gruppe).not.toBe(fo_ust.gruppe);
  });

  test('Kontonummern korrekt: 2400, 5000, 4800', () => {
    const { buchungssatz } = belegToBuchungssatz(mkAusgangsRE(), 8);
    const fo_uefe = buchungssatz.find(z => z.haben_name === 'UEFE');
    const fo_ust  = buchungssatz.find(z => z.haben_name === 'UST');
    expect(fo_uefe.soll_nr).toBe('2400');
    expect(fo_uefe.haben_nr).toBe('5000');
    expect(fo_ust.haben_nr).toBe('4800');
  });

  test('USt-Satz 7%: UST korrekt', () => {
    const { buchungssatz } = belegToBuchungssatz(mkAusgangsRE({ ustSatz: '7' }), 8);
    const fo_ust = buchungssatz.find(z => z.haben_name === 'UST');
    expect(fo_ust.betrag).toBe(35.00); // 500 × 7% = 35
  });

  test('Rabatt 10%: Nettobetrag reduziert', () => {
    const { buchungssatz } = belegToBuchungssatz(mkAusgangsRE({ rabattAktiv: true, rabattPct: '10' }), 8);
    const fo_uefe = buchungssatz.find(z => z.haben_name === 'UEFE');
    expect(fo_uefe.betrag).toBe(450.00); // 500 × (1-10%) = 450
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 3: Überweisungen (5 Tests)
// ══════════════════════════════════════════════════════════════════════════════
describe('Überweisung', () => {

  test('Standard: 4400 VE an 2800 BK', () => {
    const { buchungssatz } = belegToBuchungssatz(mkUeberweisung(), 8);
    expect(buchungssatz).toHaveLength(1);
    expect(buchungssatz[0].soll_name).toBe('VE');
    expect(buchungssatz[0].haben_name).toBe('BK');
    expect(buchungssatz[0].soll_nr).toBe('4400');
    expect(buchungssatz[0].haben_nr).toBe('2800');
    expect(buchungssatz[0].betrag).toBe(100.00);
  });

  test('Mit Skonto 2%: VE→BK (98) + VE→KGV (2)', () => {
    const beleg = mkUeberweisung({ betrag: '100,00', skontoBetrag: '2,00' });
    const { buchungssatz } = belegToBuchungssatz(beleg, 9);
    const bk  = buchungssatz.find(z => z.haben_name === 'BK');
    const kgv = buchungssatz.find(z => z.haben_name === 'KGV');
    expect(bk).toBeDefined();
    expect(kgv).toBeDefined();
    expect(bk.betrag).toBe(98.00);
    expect(kgv.betrag).toBe(2.00);
  });

  test('Skonto: KGV (6750) ist Ertrag – separate gruppe von BK', () => {
    const beleg = mkUeberweisung({ betrag: '200,00', skontoBetrag: '4,00' });
    const { buchungssatz } = belegToBuchungssatz(beleg, 9);
    const bk  = buchungssatz.find(z => z.haben_name === 'BK');
    const kgv = buchungssatz.find(z => z.haben_name === 'KGV');
    expect(bk.gruppe).not.toBe(kgv.gruppe);
    expect(kgv.haben_nr).toBe('6750');
  });

  test('Skonto-Bilanz: Zahlbetrag + Skonto = Gesamtbetrag', () => {
    const beleg = mkUeberweisung({ betrag: '500,00', skontoBetrag: '10,00' });
    const { buchungssatz } = belegToBuchungssatz(beleg, 9);
    const bk  = buchungssatz.find(z => z.haben_name === 'BK');
    const kgv = buchungssatz.find(z => z.haben_name === 'KGV');
    expect(bk.betrag + kgv.betrag).toBe(500.00); // 490 + 10 = 500
  });

  test('Klasse 7: Kürzel ohne Nummer', () => {
    const { buchungssatz } = belegToBuchungssatz(mkUeberweisung(), 7);
    expect(buchungssatz[0].soll_nr).toBe('');
    expect(buchungssatz[0].haben_nr).toBe('');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 4: Kontoauszug (5 Tests)
// ══════════════════════════════════════════════════════════════════════════════
describe('Kontoauszug', () => {

  test('Zinsgutschrift: 2800 BK an 5780 DDE', () => {
    const { buchungssatz } = belegToBuchungssatz(mkKontoauszug('Zinsgutschrift', '+5,00'), 9);
    expect(buchungssatz[0].soll_name).toBe('BK');
    expect(buchungssatz[0].haben_name).toBe('DDE');
    expect(buchungssatz[0].soll_nr).toBe('2800');
    expect(buchungssatz[0].haben_nr).toBe('5780');
    expect(buchungssatz[0].betrag).toBe(5.00);
  });

  test('Kontogebühren: 6820 KOM an 2800 BK', () => {
    const { buchungssatz } = belegToBuchungssatz(mkKontoauszug('Kontogebühren', '-2,50'), 9);
    expect(buchungssatz[0].soll_name).toBe('KOM');
    expect(buchungssatz[0].haben_name).toBe('BK');
    expect(buchungssatz[0].soll_nr).toBe('6820');
    expect(buchungssatz[0].betrag).toBe(2.50);
  });

  test('Barabhebung: 2880 KA an 2800 BK', () => {
    const { buchungssatz } = belegToBuchungssatz(mkKontoauszug('Barabhebung', '-500,00'), 9);
    expect(buchungssatz[0].soll_name).toBe('KA');
    expect(buchungssatz[0].haben_name).toBe('BK');
    expect(buchungssatz[0].betrag).toBe(500.00);
  });

  test('Kundenzahlung (positiv): 2800 BK an 2400 FO', () => {
    const { buchungssatz } = belegToBuchungssatz(mkKontoauszug('Eingang Kundenzahlung', '+8.500,00'), 9);
    expect(buchungssatz[0].soll_name).toBe('BK');
    expect(buchungssatz[0].haben_name).toBe('FO');
  });

  test('Keine Buchung markiert: Error', () => {
    expect(() => belegToBuchungssatz({
      typ: 'kontoauszug',
      data: { buchungen: [{ id: '1', text: 'Test', betrag: '100', highlight: false }] },
    }, 9)).toThrow(/keine buchung markiert/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 5: Email-Belege (4 Tests)
// ══════════════════════════════════════════════════════════════════════════════
describe('Email-Belege', () => {

  test('Gutschrift: UEFE an FO + UST an FO (Storno)', () => {
    const beleg = mkEmail('Gutschrift Nr. GS-2026-001', 'Wir stornieren die Rechnung über 100,00 €.');
    const { buchungssatz } = belegToBuchungssatz(beleg, 9);
    const uefe_fo = buchungssatz.find(z => z.soll_name === 'UEFE' && z.haben_name === 'FO');
    const ust_fo  = buchungssatz.find(z => z.soll_name === 'UST'  && z.haben_name === 'FO');
    expect(uefe_fo).toBeDefined();
    expect(ust_fo).toBeDefined();
    expect(uefe_fo.betrag).toBe(100.00);
    expect(ust_fo.betrag).toBe(19.00);
  });

  test('Mahngebühren: 2400 FO an 5400 EMP', () => {
    const beleg = mkEmail('Mahngebühr – RE-2026-042', 'Mahngebühr: 5,00 €');
    const { buchungssatz } = belegToBuchungssatz(beleg, 9);
    expect(buchungssatz[0].soll_name).toBe('FO');
    expect(buchungssatz[0].haben_name).toBe('EMP');
    expect(buchungssatz[0].betrag).toBe(5.00);
  });

  test('Unbekannter Email-Typ: Error', () => {
    const beleg = mkEmail('Bestellung Nr. 2026-042', 'Bitte liefern Sie...');
    expect(() => belegToBuchungssatz(beleg, 8)).toThrow('Typ nicht erkannt');
  });

  test('Gutschrift ohne Betrag: Error', () => {
    const beleg = mkEmail('Gutschrift', 'Wir stornieren die Rechnung.');
    expect(() => belegToBuchungssatz(beleg, 8)).toThrow('Kein Betrag erkannt');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 6: Validierung & Fehlerbehandlung (7 Tests)
// ══════════════════════════════════════════════════════════════════════════════
describe('Validierung und Fehlerbehandlung', () => {

  test('Ungültiger belegTyp: Error', () => {
    expect(() => belegToBuchungssatz({ typ: 'ungueltig', data: {} }, 8))
      .toThrow('Unbekannter belegTyp');
  });

  test('Klasse <7: Error', () => {
    expect(() => belegToBuchungssatz(mkEingangsRE(), 6))
      .toThrow('klasse muss 7–10 sein');
  });

  test('Klasse >10: Error', () => {
    expect(() => belegToBuchungssatz(mkEingangsRE(), 11))
      .toThrow('klasse muss 7–10 sein');
  });

  test('Kein beleg-Objekt: Error', () => {
    expect(() => belegToBuchungssatz(null, 8)).toThrow('beleg muss ein Objekt sein');
  });

  test('Fehlender beleg.typ: Error', () => {
    expect(() => belegToBuchungssatz({ data: {} }, 8)).toThrow('beleg.typ muss ein String sein');
  });

  test('Überweisung Betrag 0: Error', () => {
    expect(() => belegToBuchungssatz(mkUeberweisung({ betrag: '0' }), 8))
      .toThrow('Betrag muss größer als 0');
  });

  test('Punkte pro Zeile korrekt (1 Punkt pro Block)', () => {
    const { buchungssatz } = belegToBuchungssatz(mkEingangsRE(), 8);
    buchungssatz.forEach(z => {
      expect(z.punkte).toBe(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 7: Punkte-System (ISB-Handreichung) (4 Tests)
// ══════════════════════════════════════════════════════════════════════════════
describe('Punkte-System (ISB-Handreichung)', () => {

  test('Eingangsrechnung Standard: 2 Punkte (AWR + VORST)', () => {
    const { punkte_gesamt } = belegToBuchungssatz(mkEingangsRE(), 8);
    expect(punkte_gesamt).toBe(2);
  });

  test('Eingangsrechnung + BZK: 3 Punkte (AWR + BZKR + VORST)', () => {
    const { punkte_gesamt } = belegToBuchungssatz(mkEingangsRE({ bezugskosten: '50,00' }), 8);
    expect(punkte_gesamt).toBe(3);
  });

  test('Ausgangsrechnung: 2 Punkte (FO→UEFE + FO→UST)', () => {
    const { punkte_gesamt } = belegToBuchungssatz(mkAusgangsRE(), 8);
    expect(punkte_gesamt).toBe(2);
  });

  test('Überweisung mit Skonto: 2 Punkte (VE→BK + VE→KGV)', () => {
    const { punkte_gesamt } = belegToBuchungssatz(
      mkUeberweisung({ betrag: '100,00', skontoBetrag: '2,00' }), 9
    );
    expect(punkte_gesamt).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 8: Edge Cases (5 Tests)
// ══════════════════════════════════════════════════════════════════════════════
describe('Edge Cases', () => {

  test('Sehr hohe Beträge (>100.000€): korrekt berechnet', () => {
    const beleg = mkEingangsRE({
      positionen: [{ id: '1', artikel: 'Rohstoffe', menge: '10000', einheit: 'kg', ep: '15,00' }],
    });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    const awr = buchungssatz.find(z => z.soll_name === 'AWR');
    expect(awr.betrag).toBe(150000.00);
  });

  test('Geldformat "1.500,00": korrekt geparst', () => {
    const beleg = mkUeberweisung({ betrag: '1.500,00' });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    expect(buchungssatz[0].betrag).toBe(1500.00);
  });

  test('Geldformat "3.200,50": korrekt geparst', () => {
    const beleg = mkUeberweisung({ betrag: '3.200,50' });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    expect(buchungssatz[0].betrag).toBe(3200.50);
  });

  test('Rundung 2 Dezimalstellen: kein Floating-Point-Fehler', () => {
    const beleg = mkEingangsRE({
      positionen: [{ id: '1', artikel: 'Rohstoffe', menge: '3', einheit: 'kg', ep: '33,33' }],
    });
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    const vorst = buchungssatz.find(z => z.soll_name === 'VORST');
    // 3 × 33,33 = 99,99 · 19% = 18,9981 → gerundet 19,00
    expect(vorst.betrag).toBe(19.00);
  });

  test('Numerischer Betrag als Eingabe: korrekt verarbeitet', () => {
    const beleg = mkUeberweisung({ betrag: 250.50 }); // number statt string
    const { buchungssatz } = belegToBuchungssatz(beleg, 8);
    expect(buchungssatz[0].betrag).toBe(250.50);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 9: Kontenplan & Kürzel (3 Tests)
// ══════════════════════════════════════════════════════════════════════════════
describe('Kontenplan', () => {

  test('buchungssatzToText gibt lesbaren Text zurück', () => {
    const { buchungssatz } = belegToBuchungssatz(mkEingangsRE(), 8);
    const text = buchungssatzToText(buchungssatz);
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('AWR');
    expect(text).toContain('VE');
  });

  test('getMinKlasseForBelegTyp: eingangsrechnung → 7', () => {
    expect(getMinKlasseForBelegTyp('eingangsrechnung')).toBe(7);
  });

  test('getMinKlasseForBelegTyp: kontoauszug → 9', () => {
    expect(getMinKlasseForBelegTyp('kontoauszug')).toBe(9);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 10: Engine-Fix-1 (Neue Tests – 2026-04-03)
// ══════════════════════════════════════════════════════════════════════════════
describe('Engine-Fix-1: processEmail ustSatz + buchungssatzToText Pool-Format', () => {

  test('processEmail Gutschrift mit 7% USt', () => {
    const result = belegToBuchungssatz({
      typ: 'email',
      data: { betreff: 'Gutschrift 100,00 €', text: '', ustSatz: 7 }
    }, 9);
    const ustZeile = result.buchungssatz.find(z =>
      z.soll_name?.includes('UST') || z.haben_name?.includes('UST')
    );
    expect(ustZeile).toBeDefined();
    expect(ustZeile.betrag).toBeCloseTo(7, 1);
  });

  test('processEmail Gutschrift mit 19% USt (Standard wenn kein ustSatz)', () => {
    const result = belegToBuchungssatz({
      typ: 'email',
      data: { betreff: 'Gutschrift 100,00 €', text: '' }
    }, 9);
    const ustZeile = result.buchungssatz.find(z =>
      z.soll_name?.includes('UST') || z.haben_name?.includes('UST')
    );
    expect(ustZeile).toBeDefined();
    expect(ustZeile.betrag).toBeCloseTo(19, 1);
  });

  test('buchungssatzToText – Pool-Format als Array', () => {
    const poolAufgabe = [{
      soll: [{ nr: '6000', name: 'AWR', betrag: 1000 }, { nr: '2600', name: 'VORST', betrag: 190 }],
      haben: [{ nr: '4400', name: 'VE', betrag: 1190 }],
    }];
    const text = buchungssatzToText(poolAufgabe);
    expect(text).toContain('6000');
    expect(text).toContain('4400');
    expect(text).toContain('an');
  });

  test('buchungssatzToText – Pool-Format als Objekt (kein Array)', () => {
    const poolObjekt = {
      soll: [{ nr: '2400', name: 'FO', betrag: 1190 }],
      haben: [{ nr: '5000', name: 'UEFE', betrag: 1000 }, { nr: '4800', name: 'UST', betrag: 190 }],
    };
    const text = buchungssatzToText(poolObjekt);
    expect(text).toContain('2400');
    expect(text).toContain('5000');
    expect(text).toContain('an');
  });

  test('validateBilanzregel wirft bei negativem betrag', () => {
    expect(() => belegToBuchungssatz({
      typ: 'eingangsrechnung',
      data: {
        positionen: [{ id: '1', artikel: 'Test', menge: '-10', einheit: 'Stk', ep: '100,00' }],
        ustSatz: '19', bezugskosten: '0', rabattAktiv: false, rabattPct: '0', zahlungsziel: '30',
        isGWG: false, skonto: false, skontoPct: '0',
      }
    }, 8)).toThrow();
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 11: Performance (1 Test)
// ══════════════════════════════════════════════════════════════════════════════
describe('Performance (1 Test)', () => {

  test('Ausführungszeit < 50ms pro Buchungssatz', () => {
    const belege = [
      mkEingangsRE(), mkAusgangsRE(), mkUeberweisung(),
      mkKontoauszug('Zinsgutschrift', '+5,00'),
    ];
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      belege.forEach(b => belegToBuchungssatz(b, 8));
    }
    const ms = (Date.now() - start) / 100;
    expect(ms).toBeLessThan(50); // < 50ms für 4 Buchungen
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 12: Kontenplan Konsistenz (Engine-Fix-2 / BUG-05)
// ══════════════════════════════════════════════════════════════════════════════
describe('Kontenplan Konsistenz', () => {
  const kernKonten = [
    { nr: '2600', kuerzel: 'VORST' },
    { nr: '2800', kuerzel: 'BK' },
    { nr: '2880', kuerzel: 'KA' },
    { nr: '2400', kuerzel: 'FO' },
    { nr: '4400', kuerzel: 'VE' },
    { nr: '4800', kuerzel: 'UST' },
    { nr: '5000', kuerzel: 'UEFE' },
    { nr: '6000', kuerzel: 'AWR' },
    { nr: '6750', kuerzel: 'KGV' },
    { nr: '8010', kuerzel: 'SBK' },
  ];

  kernKonten.forEach(({ nr, kuerzel }) => {
    test(`Konto ${nr} (${kuerzel}) existiert in BEIDEN Kontenplan-Quellen`, () => {
      const altKonto = KONTEN.find(k => k.nr === nr);
      expect(altKonto, `Konto ${nr} fehlt in src/data/kontenplan.js`).toBeTruthy();

      const neuKonto = KONTENPLAN[nr];
      expect(neuKonto, `Konto ${nr} fehlt in src/utils/kontenplanEngine.js`).toBeTruthy();

      const altKuerzel = (altKonto?.kuerzel || altKonto?.kürzel || '').toUpperCase();
      const neuKuerzel = (neuKonto?.kürzel || '').toUpperCase();
      expect(altKuerzel).toBe(neuKuerzel);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GRUPPE 13: validatePoolBuchungssatz (Engine-Fix-3 / BUG-01)
// ══════════════════════════════════════════════════════════════════════════════
describe('validatePoolBuchungssatz', () => {
  test('Korrekte Pool-Aufgabe (Soll = Haben) – kein Fehler', () => {
    const aufgabe = {
      soll:  [{ nr: '6000', name: 'AWR', betrag: 1000 }, { nr: '2600', name: 'VORST', betrag: 190 }],
      haben: [{ nr: '4400', name: 'VE',  betrag: 1190 }],
    };
    expect(() => validatePoolBuchungssatz(aufgabe, 'test_korrekt')).not.toThrow();
  });

  test('Bilanzfehler (Soll ≠ Haben) – wirft Error in DEV', () => {
    const aufgabe = {
      soll:  [{ nr: '6000', name: 'AWR', betrag: 1000 }],
      haben: [{ nr: '4400', name: 'VE',  betrag: 999 }], // 1 € Differenz
    };
    expect(() => validatePoolBuchungssatz(aufgabe, 'test_fehler')).toThrow(/Bilanzfehler/);
  });

  test('Aufgabe ohne soll/haben (Rechnung/Theorie) – kein Fehler', () => {
    const aufgabe = { aufgabe: 'Was ist Buchhaltung?', punkte: 2 };
    expect(() => validatePoolBuchungssatz(aufgabe, 'test_theorie')).not.toThrow();
  });

  test('Rundungstoleranz 0.01 wird akzeptiert', () => {
    const aufgabe = {
      soll:  [{ nr: '6000', name: 'AWR', betrag: 100.005 }],
      haben: [{ nr: '4400', name: 'VE',  betrag: 100.01 }],
    };
    expect(() => validatePoolBuchungssatz(aufgabe, 'test_rundung')).not.toThrow();
  });
});
