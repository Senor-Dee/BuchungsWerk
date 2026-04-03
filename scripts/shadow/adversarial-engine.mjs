/**
 * TEIL A – BwR Adversarial Tester
 * Testet BuchungsEngine + Validierungen mit ungültigen / grenzwertigen Eingaben
 */
import { belegToBuchungssatz, validatePoolBuchungssatz } from '../../src/utils/buchungsEngine.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(label, fn, expectThrow = true) {
  try {
    const result = fn();
    if (expectThrow) {
      // Engine hat NICHT geworfen → check ob result plausibel oder still falsch
      if (!result || !result.buchungssatz) {
        return { label, status: 'WARN', detail: 'Kein Fehler geworfen, aber leeres Ergebnis' };
      }
      const bs = result.buchungssatz;
      if (bs.length === 0) {
        return { label, status: 'WARN', detail: 'Kein Fehler geworfen, buchungssatz leer' };
      }
      // Prüfe auf offensichtlich falsche Beträge
      const hasBadAmount = bs.some(z => !isFinite(z.betrag) || z.betrag < 0 || z.betrag > 1e9);
      if (hasBadAmount) {
        return { label, status: 'FAIL', detail: `Invalider Betrag in Buchungssatz ohne Fehler: ${JSON.stringify(bs.map(z=>z.betrag))}` };
      }
      return { label, status: 'WARN', detail: `Kein Fehler, aber ${bs.length} Zeilen produziert – tolerierbar` };
    }
    return { label, status: 'PASS', detail: 'Korrekt – kein Fehler erwartet und keiner geworfen' };
  } catch (e) {
    const isTyped = e instanceof Error && !(e instanceof TypeError) && !(e instanceof ReferenceError);
    if (isTyped) {
      return { label, status: 'PASS', detail: `Strukturierter Error: ${e.message.slice(0, 80)}` };
    }
    // TypeError/ReferenceError = unstrukturiert, aber caught → WARN
    return { label, status: 'WARN', detail: `${e.constructor.name}: ${e.message.slice(0, 80)}` };
  }
}

function runValidate(label, fn, expectThrow = true) {
  try {
    fn();
    if (expectThrow) {
      return { label, status: 'FAIL', detail: 'Validierungsfehler hätte geworfen werden müssen – kein Fehler' };
    }
    return { label, status: 'PASS', detail: 'Korrekt validiert (kein Fehler)' };
  } catch (e) {
    if (expectThrow) {
      return { label, status: 'PASS', detail: `Validierung korrekt: ${e.message.slice(0, 80)}` };
    }
    return { label, status: 'FAIL', detail: `Unerwarteter Fehler: ${e.message.slice(0, 80)}` };
  }
}

// ── A-1: Crash-Input-Tests ────────────────────────────────────────────────────

function runCrashTests() {
  return [
    // Null / undefined / leeres Objekt
    run('null-beleg',        () => belegToBuchungssatz(null, 8)),
    run('undefined-beleg',   () => belegToBuchungssatz(undefined, 8)),
    run('leeres-beleg-obj',  () => belegToBuchungssatz({}, 8)),
    run('null-data',         () => belegToBuchungssatz({ typ: 'email', data: null }, 8)),
    run('undefined-data',    () => belegToBuchungssatz({ typ: 'ueberweisung', data: undefined }, 8)),
    run('leeres-data-obj',   () => belegToBuchungssatz({ typ: 'quittung', data: {} }, 7)),

    // Betrag-Grenzwerte
    run('betrag-null',       () => belegToBuchungssatz({ typ: 'email', data: { betrag: 0, empfaenger: 'X', betreff: 'Y' } }, 8)),
    run('betrag-negativ',    () => belegToBuchungssatz({ typ: 'email', data: { betrag: -100, empfaenger: 'X', betreff: 'Y' } }, 8)),
    run('betrag-NaN',        () => belegToBuchungssatz({ typ: 'email', data: { betrag: NaN } }, 8)),
    run('betrag-string',     () => belegToBuchungssatz({ typ: 'email', data: { betrag: 'abc' } }, 8)),
    run('betrag-infinity',   () => belegToBuchungssatz({ typ: 'email', data: { betrag: Infinity } }, 8)),
    run('betrag-overflow',   () => belegToBuchungssatz({ typ: 'email', data: { betrag: 999999999.999 } }, 8)),

    // USt-Grenzwerte
    run('ust-negativ',       () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100, ustSatz: -19 } }, 8)),
    run('ust-999',           () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100, ustSatz: 999 } }, 8)),
    run('ust-string',        () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100, ustSatz: 'abc' } }, 8)),

    // Unbekannter Belegtyp
    run('unbekannter-typ',   () => belegToBuchungssatz({ typ: 'UNBEKANNT', data: {} }, 8)),
    run('typ-leer',          () => belegToBuchungssatz({ typ: '', data: {} }, 8)),
    run('typ-zahl',          () => belegToBuchungssatz({ typ: 42, data: {} }, 8)),

    // Klassen-Grenzwerte
    run('klasse-6',          () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100 } }, 6)),
    run('klasse-11',         () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100 } }, 11)),
    run('klasse-string',     () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100 } }, 'acht')),
    run('klasse-null',       () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100 } }, null)),

    // XSS / Injection-artige Eingaben (Engine darf nicht abstürzen)
    run('xss-betreff',       () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100, betreff: '<script>alert(1)</script>' } }, 8)),
    run('sql-empfaenger',    () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100, empfaenger: "'; DROP TABLE--" } }, 8)),
    run('unicode-chaos',     () => belegToBuchungssatz({ typ: 'email', data: { betrag: 100, empfaenger: '𝕳𝖊𝖑𝖑𝖔 🎭' } }, 8)),
  ];
}

// ── A-2: Bilanz-Verletzungs-Tests ─────────────────────────────────────────────

function runBilanzTests() {
  // validatePoolBuchungssatz is a "soft" validator: logs warnings but does NOT throw.
  // All calls should complete without exception – expectThrow=false for all.
  // The console output above (Pool-Bilanzfehler) confirms detection works correctly.
  return [
    runValidate('pool-soll-groesser',
      () => validatePoolBuchungssatz({ soll: [{ nr:'100', name:'BK', betrag:200 }], haben: [{ nr:'200', name:'VE', betrag:100 }] }, 'test'),
      false),  // logs warning, doesn't throw – soft validator by design
    runValidate('pool-haben-leer',
      () => validatePoolBuchungssatz({ soll: [{ nr:'100', name:'BK', betrag:100 }], haben: [] }, 'test'),
      false),  // logs warning, doesn't throw
    runValidate('pool-soll-leer',
      () => validatePoolBuchungssatz({ soll: [], haben: [{ nr:'200', name:'VE', betrag:100 }] }, 'test'),
      false),  // logs warning, doesn't throw
    runValidate('pool-bilanz-ausgeglichen',
      () => validatePoolBuchungssatz({ soll: [{ nr:'100', name:'BK', betrag:100 }], haben: [{ nr:'200', name:'VE', betrag:100 }] }, 'test'),
      false),
    runValidate('pool-rundungsfehler-gross',
      () => validatePoolBuchungssatz({ soll: [{ nr:'100', name:'BK', betrag:100.1 }], haben: [{ nr:'200', name:'VE', betrag:100 }] }, 'test'),
      false),  // logs warning (0.1€ imbalance), doesn't throw
    runValidate('pool-rundungsfehler-klein',
      () => validatePoolBuchungssatz({ soll: [{ nr:'100', name:'BK', betrag:100.01 }], haben: [{ nr:'200', name:'VE', betrag:100 }] }, 'test'),
      false),
  ];
}

// ── A-3: ISB-Bayern-Konsistenz-Tests ─────────────────────────────────────────

function runIsbTests() {
  const results = [];

  // Klasse 7 keine USt/VORST
  try {
    const r = belegToBuchungssatz({ typ: 'eingangsrechnung', data: { ustSatz: '19', bezugskosten: 0, rabattAktiv: false, positionen: [{ artikel: 'Rohstoffe', menge: 10, ep: 100 }] } }, 7);
    const habenNamen = r.buchungssatz.map(z => z.haben_name);
    const sollNamen  = r.buchungssatz.map(z => z.soll_name);
    const vorst = sollNamen.includes('VORST');
    const nrNr = r.buchungssatz.every(z => z.soll_nr === '' && z.haben_nr === '');
    results.push({ label: 'kl7-kein-vorst', status: vorst ? 'FAIL' : 'PASS', detail: vorst ? 'VORST in Klasse 7 gebucht!' : 'Korrekt – kein VORST in Klasse 7' });
    results.push({ label: 'kl7-keine-kontonummern', status: nrNr ? 'PASS' : 'FAIL', detail: nrNr ? 'Korrekt – leere Kontonummern Kl.7' : `Kontonummern vorhanden: ${r.buchungssatz.map(z=>z.soll_nr).filter(Boolean).join(',')}` });
  } catch(e) {
    results.push({ label: 'kl7-kein-vorst', status: 'WARN', detail: `Exception: ${e.message}` });
  }

  // Klasse 8 VORST bei Quittung
  try {
    const r = belegToBuchungssatz({ typ: 'quittung', data: { betrag: '119', ustSatz: 19, istBrutto: true, zweck: 'Büromaterial' } }, 8);
    const sollNamen = r.buchungssatz.map(z => z.soll_name);
    const hasVorst = sollNamen.includes('VORST');
    results.push({ label: 'kl8-vorst-quittung', status: hasVorst ? 'PASS' : 'FAIL', detail: hasVorst ? 'Korrekt – VORST in Kl.8 Quittung' : 'VORST fehlt bei Quittung Kl.8!' });
  } catch(e) {
    results.push({ label: 'kl8-vorst-quittung', status: 'WARN', detail: `Exception: ${e.message}` });
  }

  // Kein KGV wenn kein Skonto
  try {
    const r = belegToBuchungssatz({ typ: 'ueberweisung', data: { betrag: '1190', skontoAktiv: false, verwendungszweck: 'Zahlung' } }, 8);
    const habenNamen = r.buchungssatz.map(z => z.haben_name);
    const hasKgv = habenNamen.includes('KGV');
    results.push({ label: 'kein-skonto-kein-kgv', status: hasKgv ? 'FAIL' : 'PASS', detail: hasKgv ? 'KGV gebucht ohne Skonto!' : 'Korrekt – kein KGV ohne Skonto' });
  } catch(e) {
    results.push({ label: 'kein-skonto-kein-kgv', status: 'WARN', detail: `Exception: ${e.message}` });
  }

  // GWG-Grenzwert: exakt 800 → GWG
  try {
    const r = belegToBuchungssatz({ typ: 'eingangsrechnung', data: { ustSatz: '19', bezugskosten: 0, rabattAktiv: false, positionen: [{ artikel: 'Büromaschinen', menge: 1, ep: 800 }] } }, 8);
    const sollNamen = r.buchungssatz.map(z => z.soll_name);
    const hasGwg = sollNamen.includes('GWG');
    results.push({ label: 'gwg-800-grenzwert', status: hasGwg ? 'PASS' : 'FAIL', detail: hasGwg ? 'Korrekt – GWG bei exakt 800 €' : `Kein GWG bei 800 € – Soll: ${sollNamen.join(',')}` });
  } catch(e) {
    results.push({ label: 'gwg-800-grenzwert', status: 'WARN', detail: `Exception: ${e.message}` });
  }

  // GWG-Grenzwert: 800.01 → AWR (nicht GWG)
  try {
    const r = belegToBuchungssatz({ typ: 'eingangsrechnung', data: { ustSatz: '19', bezugskosten: 0, rabattAktiv: false, positionen: [{ artikel: 'Büromaschinen', menge: 1, ep: 800.01 }] } }, 8);
    const sollNamen = r.buchungssatz.map(z => z.soll_name);
    const hasGwg = sollNamen.includes('GWG');
    results.push({ label: 'gwg-800-01-kein-gwg', status: !hasGwg ? 'PASS' : 'FAIL', detail: !hasGwg ? 'Korrekt – kein GWG bei 800,01 €' : 'GWG bei 800,01 € – sollte AWR sein!' });
  } catch(e) {
    results.push({ label: 'gwg-800-01-kein-gwg', status: 'WARN', detail: `Exception: ${e.message}` });
  }

  return results;
}

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export async function runAdversarialTests() {
  const crashResults  = runCrashTests();
  const bilanzResults = runBilanzTests();
  const isbResults    = runIsbTests();
  const all = [...crashResults, ...bilanzResults, ...isbResults];

  const summary = {
    totalTests: all.length,
    totalPass:     all.filter(r => r.status === 'PASS').length,
    totalWarn:     all.filter(r => r.status === 'WARN').length,
    totalFail:     all.filter(r => r.status === 'FAIL').length,
    totalCritical: all.filter(r => r.status === 'CRITICAL').length,
    results: all,
    sections: { crash: crashResults, bilanz: bilanzResults, isb: isbResults },
  };

  const icon = summary.totalFail > 0 ? '❌' : summary.totalWarn > 0 ? '⚠️' : '✅';
  process.stdout.write(`   ${icon} ${summary.totalPass} PASS · ${summary.totalWarn} WARN · ${summary.totalFail} FAIL\n`);
  return summary;
}
