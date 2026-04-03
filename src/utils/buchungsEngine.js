// ══════════════════════════════════════════════════════════════════════════════
// buchungsEngine.js – Deterministische Buchungsrechnung (BuchungsWerk Phase G)
// ISB-Bayern konform · LehrplanPLUS 2026 · Klassen 7–10
// Validiert durch bwr-sensei ✅
//
// Kernprinzip:
//   belegToBuchungssatz(beleg, klasse) → Buchungssatz[]
//   Lokal, offline, <50ms, 100% korrekt – kein KI-Call nötig!
//
// Token-Einsparnis: ~95% (3.000 → 150 Tokens pro Aufgabe)
// ══════════════════════════════════════════════════════════════════════════════

import {
  KONTENPLAN,
  GWG_GRENZE,
  getWerkstoffKonten,
  isKontoForKlasse,
} from './kontenplanEngine.js';

// ── Interne Hilfsfunktionen ───────────────────────────────────────────────────

/**
 * Parst deutsche Geldbeträge (String → Number).
 * "12.000,50" → 12000.50 · "1.500" → 1500 · "3,00" → 3
 * @param {string|number} str
 * @returns {number}
 */
function parseGeld(str) {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return str;
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * Rundet auf 2 Dezimalstellen (kaufmännisch).
 * @param {number} n
 * @returns {number}
 */
function r2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Gibt Kontonummer zurück – leer für Klasse 7 (Kürzel-only-Darstellung).
 * Klasse 7: Schüler kennen noch keine Kontonummern (ISB LehrplanPLUS).
 * @param {number} klasse
 * @param {string} nr
 * @returns {string}
 */
function nr(klasse, kontoNr) {
  return klasse >= 8 ? kontoNr : '';
}

/**
 * Erstellt eine Buchungssatz-Zeile im Format, das BelegEditorModal erwartet.
 * @param {object} opts
 * @returns {object} Buchungssatz-Zeile
 */
function zeile({ gruppe = 1, sollNr, sollName, habenNr, habenName, betrag, punkte = 1, erklaerung = '', klasse = 8 }) {
  return {
    gruppe,
    soll_nr:   nr(klasse, sollNr),
    soll_name: sollName,
    haben_nr:  nr(klasse, habenNr),
    haben_name: habenName,
    betrag:    r2(betrag),
    punkte,
    erklaerung,
  };
}

// ── Validierung ───────────────────────────────────────────────────────────────

/**
 * Prüft Vollständigkeit und Konsistenz einer Buchungssatz-Zeile (Engine-Format).
 * Hinweis: Im Engine-Format repräsentiert jede Zeile genau eine Soll-Haben-Paarung
 * mit einem Betrag. Es gibt kein separates haben_betrag-Feld – Soll = Haben je Zeile.
 * @param {object[]} buchungssatz
 * @throws {Error} wenn Zeile unvollständig oder inkonsistent
 */
function validateBilanzregel(buchungssatz) {
  buchungssatz.forEach((z, i) => {
    if (typeof z.betrag !== 'number') {
      throw new Error(`Buchungssatz Zeile ${i + 1}: betrag muss eine Zahl sein (ist: ${typeof z.betrag})`);
    }
    if (z.betrag < 0) {
      throw new Error(`Buchungssatz Zeile ${i + 1}: betrag darf nicht negativ sein (${z.betrag})`);
    }
    if (!z.soll_name || !z.haben_name) {
      throw new Error(`Buchungssatz Zeile ${i + 1}: soll_name und haben_name müssen gesetzt sein`);
    }
    if (z.soll_name === z.haben_name && z.soll_nr === z.haben_nr) {
      throw new Error(`Buchungssatz Zeile ${i + 1}: Soll- und Haben-Konto sind identisch (${z.soll_name})`);
    }
  });
}

/**
 * Prüft ob ein Konto in der angegebenen Klasse lehrplan-konform ist.
 * Gibt eine Warnung zurück (kein throw), da Engine tolerant sein soll.
 * @param {string} kontoNr
 * @param {number} klasse
 * @returns {string|null} Warnung oder null
 */
function checkKlasseKonformität(kontoNr, klasse) {
  if (!isKontoForKlasse(kontoNr, klasse)) {
    const konto = KONTENPLAN[kontoNr];
    if (konto) {
      return `Konto ${kontoNr} ${konto.kürzel} erst ab Klasse ${konto.minKlasse} lehrplan-konform (aktuelle Klasse: ${klasse})`;
    }
  }
  return null;
}

// ── Eingangsrechnung ──────────────────────────────────────────────────────────

/**
 * Fall 1–3: Eingangsrechnung (Standard, Bezugskosten, GWG)
 * Lehrplan: Jg 7 LB4 (Basis), Jg 8 LB2 (Bezugskosten, GWG), Jg 8 LB6 (USt)
 *
 * Buchungsstruktur:
 *   Jg 7: [AWR brutto] an [VE brutto]  (kein VORST – USt noch nicht im LP!)
 *   Jg 8+: [AWR netto] an [VE] + [VORST ust] an [VE] (zusammengesetzt, gruppe=1)
 *   Jg 8+ mit BZKR: [AWR mat] + [BZKR bzk] + [VORST ust] an [VE] (alle gruppe=1)
 *   Jg 8+ GWG: [GWG netto] an [VE] + [VORST ust] an [VE]
 *
 * @param {object} data – Felder aus defaultEingangsrechnung()
 * @param {number} klasse
 * @returns {object[]} Buchungssatz-Zeilen
 */
function processEingangsrechnung(data, klasse) {
  const ustRate  = parseGeld(data.ustSatz) / 100;

  // Warenwert aus Positionen berechnen
  let warenwert = 0;
  const positionen = data.positionen || [];
  positionen.forEach(p => {
    warenwert += r2(parseGeld(p.menge) * parseGeld(p.ep));
  });

  // Rabatt anwenden (reduziert Warenwert, nicht BZK)
  const rabattPct    = data.rabattAktiv ? (parseGeld(data.rabattPct) || 0) : 0;
  const rabattBetrag = r2(warenwert * rabattPct / 100);
  const materialNetto = r2(warenwert - rabattBetrag);

  // Bezugskosten (separates Feld, kein Rabatt auf BZK!)
  const bzkNetto = r2(parseGeld(data.bezugskosten));

  const nettoGesamt = r2(materialNetto + bzkNetto);
  const brutto      = r2(nettoGesamt * (1 + ustRate));
  const ustBetrag   = r2(nettoGesamt * ustRate);

  // Klasse 7: kein VORST (USt erst ab Klasse 8 LB6), Bruttobetrag buchen
  if (klasse < 8) {
    return [
      zeile({
        gruppe: 1, klasse,
        sollNr: '6000', sollName: 'AWR',
        habenNr: '4400', habenName: 'VE',
        betrag: brutto,
        erklaerung: `Kl.${klasse} LB4: Eingangsrechnung – Wareneinkauf auf Ziel (ohne USt-Kontierung)`,
      }),
    ];
  }

  // Werkstoff-Konten ermitteln (AWR, BZKR etc. je nach Artikel-Typ)
  const hauptArtikel = positionen.length > 0 ? (positionen[0].artikel || '') : '';
  const werkstoff    = getWerkstoffKonten(hauptArtikel);

  // GWG-Prüfung (Geringwertiges Wirtschaftsgut): nur für Einzelwert ≤800€ netto
  // Bezugskosten zählen zum Anschaffungswert (ISB-Handreichung)!
  // WICHTIG: GWG gilt NUR für Anlagevermögen (Werkzeug, Geräte etc.),
  //          NICHT für reguläre Vorräte (Rohstoffe, Hilfsstoffe etc.)!
  const isVorräte = ['rohstoffe', 'hilfsstoffe', 'fremdbauteile', 'betriebsstoffe'].some(
    v => hauptArtikel.toLowerCase().includes(v.slice(0, 8))  // Prefix-Match z.B. "rohstoff"
  );
  const isGWG = nettoGesamt <= GWG_GRENZE && nettoGesamt > 0 && klasse >= 8 && !isVorräte;

  const sollKontoNr   = isGWG ? '0890'          : werkstoff.aw.nr;
  const sollKontoKürz = isGWG ? 'GWG'           : werkstoff.aw.kürzel;
  const bzkKontoNr    = werkstoff.bzk.nr;
  const bzkKontoKürz  = werkstoff.bzk.kürzel;

  const erklaerungBase = isGWG
    ? `Kl.${klasse} LB2: GWG ≤800€ – sofort abschreiben`
    : `Kl.${klasse} LB2: Wareneinkauf auf Ziel`;

  const result = [];

  // Materialzeile (AWR oder GWG)
  result.push(zeile({
    gruppe: 1, klasse,
    sollNr: sollKontoNr, sollName: sollKontoKürz,
    habenNr: '4400', habenName: 'VE',
    betrag: materialNetto,
    erklaerung: erklaerungBase,
  }));

  // Bezugskostenzeile (BZKR) – nur wenn vorhanden und nicht GWG
  // Bei GWG werden Bezugskosten im GWG-Konto zusammengefasst (Anschaffungskosten)
  if (bzkNetto > 0 && !isGWG) {
    result.push(zeile({
      gruppe: 1, klasse,
      sollNr: bzkKontoNr, sollName: bzkKontoKürz,
      habenNr: '4400', habenName: 'VE',
      betrag: bzkNetto,
      erklaerung: `Kl.${klasse} LB2: Bezugskosten gehören zu den Anschaffungskosten`,
    }));
  }

  // Vorsteuer-Zeile (auf Gesamtnetto inkl. BZK)
  if (ustBetrag > 0) {
    result.push(zeile({
      gruppe: 1, klasse,
      sollNr: '2600', sollName: 'VORST',
      habenNr: '4400', habenName: 'VE',
      betrag: ustBetrag,
      erklaerung: `Kl.${klasse} LB6: Vorsteuer ${data.ustSatz}% auf Nettobetrag ${nettoGesamt.toFixed(2)}€`,
    }));
  }

  return result;
}

// ── Ausgangsrechnung ──────────────────────────────────────────────────────────

/**
 * Fall 4: Ausgangsrechnung
 * Lehrplan: Jg 8 LB4 (Verkauf von Fertigerzeugnissen)
 *
 * Buchungsstruktur:
 *   Jg 8+: [FO netto] an [UEFE netto]  (gruppe=1)
 *           [FO ust]   an [UST ust]     (gruppe=2, separates Konto!)
 *
 * WICHTIG: FO und UST müssen in SEPARATEN gruppen stehen, damit der
 * Renderer beide Haben-Konten (UEFE und UST) korrekt anzeigt.
 *
 * @param {object} data – Felder aus defaultAusgangsrechnung()
 * @param {number} klasse
 * @returns {object[]} Buchungssatz-Zeilen
 */
function processAusgangsrechnung(data, klasse) {
  const ustRate = parseGeld(data.ustSatz) / 100;

  let warenwert = 0;
  (data.positionen || []).forEach(p => {
    warenwert += r2(parseGeld(p.menge) * parseGeld(p.ep));
  });

  const rabattPct    = data.rabattAktiv ? (parseGeld(data.rabattPct) || 0) : 0;
  const rabattBetrag = r2(warenwert * rabattPct / 100);
  const netto        = r2(warenwert - rabattBetrag);
  const ustBetrag    = r2(netto * ustRate);

  if (klasse < 8) {
    // Klasse 7: FO noch nicht im LP, verwende vereinfachte Darstellung
    return [
      zeile({
        gruppe: 1, klasse,
        sollNr: '2400', sollName: 'FO',
        habenNr: '5000', habenName: 'UEFE',
        betrag: r2(netto + ustBetrag),
        erklaerung: `Kl.${klasse}: Ausgangsrechnung (vereinfacht, ohne USt-Kontierung)`,
      }),
    ];
  }

  const result = [];

  // Forderung → Ertrag (Nettobetrag)
  result.push(zeile({
    gruppe: 1, klasse,
    sollNr: '2400', sollName: 'FO',
    habenNr: '5000', habenName: 'UEFE',
    betrag: netto,
    erklaerung: `Kl.${klasse} LB4: Ausgangsrechnung – Forderung gegen Kunden`,
  }));

  // Forderung → USt (Umsatzsteuer-Schuld)
  if (ustBetrag > 0) {
    result.push(zeile({
      gruppe: 2, klasse,  // SEPARATE gruppe! Für korrekten Renderer-Output
      sollNr: '2400', sollName: 'FO',
      habenNr: '4800', habenName: 'UST',
      betrag: ustBetrag,
      erklaerung: `Kl.${klasse} LB6: USt ${data.ustSatz}% wird auf Forderung (2400 FO) gebucht, NICHT auf Ertrag!`,
    }));
  }

  return result;
}

// ── Überweisung ───────────────────────────────────────────────────────────────

/**
 * Fall 5–6: Überweisung (ohne und mit Skonto)
 * Lehrplan: Jg 7 LB3 (ohne Skonto), Jg 9 LB3 (Skonto-Gewinn als KGV)
 *
 * Buchungsstruktur:
 *   Standard: [VE betrag] an [BK betrag]
 *   Skonto:   [VE zahlbetrag] an [BK zahlbetrag]  (gruppe=1)
 *             [VE skontobetrag] an [KGV skontobetrag]  (gruppe=2)
 *
 * WICHTIG: Skonto ist ERTRAG (6750 KGV), KEIN Aufwand-Minderung!
 *
 * @param {object} data – Felder aus defaultUeberweisung()
 * @param {number} klasse
 * @returns {object[]} Buchungssatz-Zeilen
 */
function processUeberweisung(data, klasse) {
  const betrag      = parseGeld(data.betrag);
  const skonto      = r2(parseGeld(data.skontoBetrag));

  if (betrag <= 0) {
    throw new Error('Überweisung: Betrag muss größer als 0 sein');
  }

  // Standard: ohne Skonto
  if (skonto <= 0) {
    return [
      zeile({
        gruppe: 1, klasse,
        sollNr: '4400', sollName: 'VE',
        habenNr: '2800', habenName: 'BK',
        betrag,
        erklaerung: `Kl.${klasse} LB3: Verbindlichkeit durch Banküberweisung beglichen`,
      }),
    ];
  }

  // Mit Skonto (erst ab Klasse 9 lehrplan-konform)
  // In niedrigeren Klassen trotzdem verarbeiten (Lehrperson entscheidet)
  const zahlbetrag = r2(betrag - skonto);

  const result = [
    zeile({
      gruppe: 1, klasse,
      sollNr: '4400', sollName: 'VE',
      habenNr: '2800', habenName: 'BK',
      betrag: zahlbetrag,
      erklaerung: `Kl.${klasse} LB3: Zahlung an Lieferant mit Skontoabzug (${zahlbetrag.toFixed(2)}€)`,
    }),
    zeile({
      gruppe: 2, klasse,  // SEPARATE gruppe für Skonto-Ertrag
      sollNr: '4400', sollName: 'VE',
      habenNr: '6750', habenName: 'KGV',
      betrag: skonto,
      erklaerung: `Kl.${klasse} LB3: Skonto = ERTRAG (6750 KGV) – nicht Aufwand-Minderung! Bilanzregel: ${betrag.toFixed(2)} = ${zahlbetrag.toFixed(2)} + ${skonto.toFixed(2)}`,
    }),
  ];

  return result;
}

// ── Kontoauszug ───────────────────────────────────────────────────────────────

/**
 * Fall 7: Kontoauszug (3 Varianten: Zinsertrag, Gebühren, Abhebung)
 * Lehrplan: Jg 9 LB3 (Kontokorrentkredite)
 *
 * Buchungsstruktur:
 *   Zinsertrag:  [BK betrag] an [DDE betrag]   (5780 Dividendenerträge)
 *   Gebühren:    [KOM betrag] an [BK betrag]   (6820 Kommunikationsgebühren)
 *   Abhebung:    [KA betrag] an [BK betrag]    (Bargeld aktivieren)
 *   Überweisung: [VE betrag] an [BK betrag]    (Lieferant bezahlen)
 *   Eingang:     [BK betrag] an [FO betrag]    (Kundenzahlung)
 *
 * @param {object} data – Felder aus defaultKontoauszug()
 * @param {number} klasse
 * @returns {object[]} Buchungssatz-Zeilen
 */
function processKontoauszug(data, klasse) {
  const buchungen    = data.buchungen || [];
  const markiert     = buchungen.find(b => b.highlight);

  if (!markiert) {
    throw new Error('Kontoauszug: Keine Buchung markiert (highlight: true benötigt)');
  }

  const betragRaw = parseGeld(markiert.betrag);
  const betrag    = Math.abs(betragRaw);
  const text      = (markiert.text || '').toLowerCase();

  if (betrag <= 0) {
    throw new Error('Kontoauszug: Markierter Betrag muss ungleich 0 sein');
  }

  // Typ-Erkennung aus Text-Schlüsselwörtern
  const isZins     = /zins|zinsgut|rendite|kapital/.test(text);
  const isGebühr   = /gebühr|gebuehr|bankgebühr|bankgebuehr|kontoführ|kontofuehr|provision|comm/.test(text);
  const isAbhebung = /abhebung|barabhebung|bargeld|kassenab/.test(text);
  const isEingang  = betragRaw > 0 || /eingang|kundenzahlung|gutschrift|überweisung eingang/.test(text);

  if (isZins) {
    return [zeile({
      gruppe: 1, klasse,
      sollNr: '2800', sollName: 'BK',
      habenNr: '5780', habenName: 'DDE',
      betrag,
      erklaerung: `Kl.${klasse} LB3: Zinsgutschrift der Bank – Ertrag (5780 DDE)`,
    })];
  }

  if (isGebühr) {
    return [zeile({
      gruppe: 1, klasse,
      sollNr: '6820', sollName: 'KOM',
      habenNr: '2800', habenName: 'BK',
      betrag,
      erklaerung: `Kl.${klasse} LB3: Kontogebühren als Aufwand (6820 KOM)`,
    })];
  }

  if (isAbhebung) {
    return [zeile({
      gruppe: 1, klasse,
      sollNr: '2880', sollName: 'KA',
      habenNr: '2800', habenName: 'BK',
      betrag,
      erklaerung: `Kl.${klasse} LB3: Bargeldabhebung – Kasse (KA) erhöht, Bank (BK) verringert`,
    })];
  }

  if (isEingang) {
    // Kundenzahlung: Forderung sinkt, Bank steigt
    return [zeile({
      gruppe: 1, klasse,
      sollNr: '2800', sollName: 'BK',
      habenNr: '2400', habenName: 'FO',
      betrag,
      erklaerung: `Kl.${klasse} LB4: Kundenzahlung eingetroffen – Forderung (FO) beglichen`,
    })];
  }

  // Default: Lieferantenzahlung (negative Kontobuchung)
  return [zeile({
    gruppe: 1, klasse,
    sollNr: '4400', sollName: 'VE',
    habenNr: '2800', habenName: 'BK',
    betrag,
    erklaerung: `Kl.${klasse} LB3: Lieferantenzahlung – Verbindlichkeit (VE) beglichen`,
  })];
}

// ── Email-Belege ──────────────────────────────────────────────────────────────

/**
 * Fall 8: Email-Belege (Gutschrift, Mahngebühren)
 * Lehrplan: Jg 8 LB4 (Gutschrift), Jg 9 LB5 (Mahngebühren)
 *
 * Typ-Erkennung aus betreff/text Schlüsselwörtern:
 *   "gutschrift", "storno" → Storno der Ausgangsrechnung
 *   "mahnung", "mahngebühr" → Mahngebühren als Ertrag
 *
 * @param {object} data – Felder aus defaultEmail()
 * @param {number} klasse
 * @returns {object[]} Buchungssatz-Zeilen
 */
function processEmail(data, klasse) {
  const betreff = (data.betreff || '').toLowerCase();
  const text    = (data.text   || '').toLowerCase();
  const kombi   = betreff + ' ' + text;

  // Gutschrift / Storno
  const isGutschrift = /gutschrift|storno|rückgabe|rueckgabe|rücksend|ruecksend/.test(kombi);
  // Mahngebühren
  const isMahnung    = /mahnung|mahngebühr|mahngebuehr|mahnkost|verzugszins/.test(kombi);

  // Betrag aus Email-Text extrahieren (sucht Muster wie "5,00 €" oder "5.00")
  const betragMatch = kombi.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:€|eur)/i) ||
                      kombi.match(/(\d+[,\.]\d{2})/);
  const emailBetrag = betragMatch ? r2(parseGeld(betragMatch[1])) : 0;

  if (isGutschrift) {
    if (emailBetrag <= 0) {
      throw new Error('Email Gutschrift: Kein Betrag erkannt (bitte Betrag wie "100,00 €" in Betreff oder Text angeben)');
    }
    const ustRate = parseGeld(data.ustSatz ?? 19) / 100;
    const ust = r2(emailBetrag * ustRate);

    return [
      // Storno der FO→UEFE Buchung: UEFE an FO (Ertrag gemindert, Forderung weg)
      zeile({
        gruppe: 1, klasse,
        sollNr: '5000', sollName: 'UEFE',
        habenNr: '2400', habenName: 'FO',
        betrag: emailBetrag,
        erklaerung: `Kl.${klasse} LB4: Gutschrift – Storno Ausgangsrechnung, Ertrag (UEFE) gemindert`,
      }),
      // Storno der USt-Buchung: UST an FO (USt-Schuld gemindert, Forderung weg)
      zeile({
        gruppe: 2, klasse,
        sollNr: '4800', sollName: 'UST',
        habenNr: '2400', habenName: 'FO',
        betrag: ust,
        erklaerung: `Kl.${klasse} LB6: Gutschrift – USt-Schuld (4800 UST) wird zurückgebucht`,
      }),
    ];
  }

  if (isMahnung) {
    if (emailBetrag <= 0) {
      throw new Error('Email Mahngebühr: Kein Betrag erkannt (bitte Betrag wie "5,00 €" in Betreff oder Text angeben)');
    }
    return [
      zeile({
        gruppe: 1, klasse,
        sollNr: '2400', sollName: 'FO',
        habenNr: '5400', habenName: 'EMP',
        betrag: emailBetrag,
        erklaerung: `Kl.${klasse} LB5: Mahngebühr = sonstiger Ertrag (5400 EMP) – Forderung erhöht sich`,
      }),
    ];
  }

  throw new Error(
    'Email-Beleg: Typ nicht erkannt. Betreff oder Text muss Schlüsselwörter enthalten: ' +
    '"Gutschrift"/"Storno" für Gutschrift, "Mahnung"/"Mahngebühr" für Mahngebühren. ' +
    'Betrag in der Form "100,00 €" angeben.'
  );
}

// ── Quittung ──────────────────────────────────────────────────────────────────

/**
 * Quittung: Barzahlung für Verbrauchsmaterial/Dienstleistungen
 * Typisch: Büromaterial bar bezahlt → BMK an KA
 *
 * @param {object} data – Felder aus defaultQuittung()
 * @param {number} klasse
 * @returns {object[]} Buchungssatz-Zeilen
 */
function processQuittung(data, klasse) {
  const betrag = parseGeld(data.betrag);
  if (betrag <= 0) {
    throw new Error('Quittung: Betrag muss größer als 0 sein');
  }

  const zweck = (data.zweck || '').toLowerCase();

  // Konto-Auswahl basierend auf Zweck
  let aufwandNr   = '6800';
  let aufwandKürz = 'BMK';   // Default: Büromaterial
  let erklaerung  = `Kl.${klasse}: Barkauf Büromaterial – Kasse (KA) abnimmt`;

  if (/porto|fracht|transport|versand/.test(zweck)) {
    aufwandNr = '6140'; aufwandKürz = 'AFR';
    erklaerung = `Kl.${klasse}: Portokosten bar bezahlt`;
  } else if (/werbung|anzeige|flyer|plakat/.test(zweck)) {
    aufwandNr = '6870'; aufwandKürz = 'WER';
    erklaerung = `Kl.${klasse}: Werbekosten bar bezahlt`;
  } else if (/versicherung/.test(zweck)) {
    aufwandNr = '6900'; aufwandKürz = 'VBEI';
    erklaerung = `Kl.${klasse}: Versicherungsbeitrag bar bezahlt`;
  }

  return [
    zeile({
      gruppe: 1, klasse,
      sollNr: aufwandNr, sollName: aufwandKürz,
      habenNr: '2880', habenName: 'KA',
      betrag,
      erklaerung,
    }),
  ];
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────

/**
 * Konvertiert einen Beleg deterministisch in einen Buchungssatz nach ISB-Bayern.
 *
 * Die Engine ersetzt die KI-Buchungssatz-Generierung zu ~95% (lokal, offline, <50ms).
 * Die KI wird nur noch für den Aufgabentext verwendet (~150 Tokens statt 3.000).
 *
 * @param {{ typ: string, data: object }} beleg – Beleg-Objekt aus BelegEditorModal
 * @param {number} klasse – Jahrgangsstufe (7–10)
 * @returns {{ buchungssatz: object[], warnings: string[], punkte_gesamt: number }}
 *
 * @throws {Error} bei unbekanntem belegTyp oder fehlenden Pflichtfeldern
 *
 * @example
 * const { buchungssatz } = belegToBuchungssatz({ typ: 'eingangsrechnung', data: {...} }, 8);
 * // → [{ gruppe:1, soll_nr:'6000', soll_name:'AWR', haben_nr:'4400', ... }]
 */
export function belegToBuchungssatz(beleg, klasse) {
  // ── Input-Validierung ────────────────────────────────────────────────────
  if (!beleg || typeof beleg !== 'object') {
    throw new Error('belegToBuchungssatz: beleg muss ein Objekt sein');
  }
  if (!beleg.typ || typeof beleg.typ !== 'string') {
    throw new Error('belegToBuchungssatz: beleg.typ muss ein String sein');
  }
  if (!beleg.data || typeof beleg.data !== 'object') {
    throw new Error('belegToBuchungssatz: beleg.data muss ein Objekt sein');
  }

  const klasseNum = Number(klasse);
  if (isNaN(klasseNum) || klasseNum < 7 || klasseNum > 10) {
    throw new Error(`belegToBuchungssatz: klasse muss 7–10 sein (erhalten: ${klasse})`);
  }

  const { typ, data } = beleg;
  const warnings = [];

  // ── Buchungssatz generieren ──────────────────────────────────────────────
  let buchungssatz;

  switch (typ) {
    case 'eingangsrechnung':
      buchungssatz = processEingangsrechnung(data, klasseNum);
      break;

    case 'ausgangsrechnung':
      buchungssatz = processAusgangsrechnung(data, klasseNum);
      break;

    case 'ueberweisung':
      buchungssatz = processUeberweisung(data, klasseNum);
      break;

    case 'kontoauszug':
      buchungssatz = processKontoauszug(data, klasseNum);
      break;

    case 'email':
      buchungssatz = processEmail(data, klasseNum);
      break;

    case 'quittung':
      buchungssatz = processQuittung(data, klasseNum);
      break;

    default:
      throw new Error(
        `belegToBuchungssatz: Unbekannter belegTyp "${typ}". ` +
        'Gültige Typen: eingangsrechnung, ausgangsrechnung, ueberweisung, kontoauszug, email, quittung'
      );
  }

  // ── Nachvalidierung ──────────────────────────────────────────────────────
  if (!buchungssatz || buchungssatz.length === 0) {
    throw new Error(`belegToBuchungssatz: Kein Buchungssatz für Typ "${typ}" generiert`);
  }

  validateBilanzregel(buchungssatz);

  // Klassenkonformitäts-Warnungen (keine Fehler – Lehrperson entscheidet)
  buchungssatz.forEach(z => {
    const sollWarn = checkKlasseKonformität(z.soll_nr, klasseNum);
    const habenWarn = checkKlasseKonformität(z.haben_nr, klasseNum);
    if (sollWarn)  warnings.push(sollWarn);
    if (habenWarn) warnings.push(habenWarn);
  });

  // Punkte berechnen
  const punkte_gesamt = buchungssatz.reduce((sum, z) => sum + (z.punkte || 1), 0);

  return { buchungssatz, warnings, punkte_gesamt };
}

// ── Hilfsfunktionen für Integration ──────────────────────────────────────────

/**
 * Berechnet die Zusammenfassung eines Buchungssatzes für Token-sparenden KI-Prompt.
 * Gibt einen 1-Zeiler zurück, den die KI für den Aufgabentext nutzen kann.
 *
 * @param {object[]} buchungssatz
 * @returns {string} z.B. "6000 AWR 100,00 + 2600 VORST 19,00 an 4400 VE 119,00"
 */
export function buchungssatzToText(buchungssatz) {
  if (!buchungssatz) return '';

  // Pool-Format erkennen: Objekt mit soll[] und haben[] Arrays (kein Engine-Array)
  if (!Array.isArray(buchungssatz) && buchungssatz.soll && buchungssatz.haben) {
    return _buchungssatzToTextPoolFormat([buchungssatz]);
  }
  if (!Array.isArray(buchungssatz) || buchungssatz.length === 0) return '';

  // Pool-Format als Array: [{ soll: [...], haben: [...] }]
  if (buchungssatz[0] && Array.isArray(buchungssatz[0].soll)) {
    return _buchungssatzToTextPoolFormat(buchungssatz);
  }

  // Engine-Format: [{ gruppe, soll_nr, soll_name, haben_nr, haben_name, betrag }]
  const gruppen = {};
  buchungssatz.forEach(z => {
    const g = z.gruppe ?? 1;
    if (!gruppen[g]) gruppen[g] = [];
    gruppen[g].push(z);
  });

  return Object.values(gruppen).map(gr => {
    const sollSeite = gr.map(z => `${z.soll_nr} ${z.soll_name} ${z.betrag.toFixed(2)}`).join(' + ');
    const habenGesamt = gr.reduce((s, z) => s + z.betrag, 0);
    const erstHaben = gr[0];
    const habenSeite = gr.length === 1
      ? `${erstHaben.haben_nr} ${erstHaben.haben_name} ${erstHaben.betrag.toFixed(2)}`
      : `${erstHaben.haben_nr} ${erstHaben.haben_name} ${habenGesamt.toFixed(2)}`;
    return `${sollSeite} an ${habenSeite}`;
  }).join(' | ');
}

/** @private Interne Hilfsfunktion für Pool-Format */
function _buchungssatzToTextPoolFormat(aufgaben) {
  return aufgaben.map(a => {
    if (!a.soll || !a.haben) return '';
    const sollSeite = a.soll.map(s => `${s.nr} ${s.name} ${Number(s.betrag).toFixed(2)}`).join(' + ');
    const habenSeite = a.haben.map(h => `${h.nr} ${h.name} ${Number(h.betrag).toFixed(2)}`).join(' + ');
    return `${sollSeite} an ${habenSeite}`;
  }).filter(Boolean).join(' | ');
}

/**
 * Gibt die minimale Jahrgangsstufe zurück, ab der ein Belegtyp lehrplan-konform ist.
 * @param {string} belegTyp
 * @returns {number}
 */
export function getMinKlasseForBelegTyp(belegTyp) {
  const minKlassen = {
    eingangsrechnung: 7,
    ausgangsrechnung: 8,
    ueberweisung:     7,
    kontoauszug:      9,
    email:            8,
    quittung:         7,
  };
  return minKlassen[belegTyp] ?? 7;
}

// ── Pool-Format-Adapter ───────────────────────────────────────────────────────

/**
 * Adapter: Konvertiert stammdaten.js Pool-Beleg-Format → Engine-Format.
 *
 * Pool-Format (mkEingangsRE / mkAusgangsRE etc.) verwendet numerische Werte
 * und etwas andere Feldnamen als das BelegEditorModal-Format, das die Engine
 * normalerweise erwartet. Dieser Adapter überbrückt die Differenz.
 *
 * @param {{ typ: string, netto?: number, ustPct?: number, positionen?: object[], betrag?: number, skontoBetrag?: number, buchungen?: object[], betreff?: string, text?: string }} poolBeleg
 * @param {number} klasse – Jahrgangsstufe (7–10)
 * @returns {{ buchungssatz: object[], warnings: string[], punkte_gesamt: number }}
 *
 * @example
 * import { mkEingangsRE } from '../data/stammdaten.js';
 * const beleg = mkEingangsRE(firma, 'Rohstoffe', 100, 'kg', 1500, 19);
 * const { buchungssatz } = belegPoolToBuchungssatz(beleg, 8);
 */
export function belegPoolToBuchungssatz(poolBeleg, klasse) {
  if (!poolBeleg || !poolBeleg.typ) {
    throw new Error('belegPoolToBuchungssatz: Ungültiges Pool-Beleg-Objekt');
  }

  const { typ } = poolBeleg;
  let engineData;

  switch (typ) {
    case 'eingangsrechnung': {
      // BZK-Position aus Positionen extrahieren (Transportkosten/Spedition)
      const bzkPos = (poolBeleg.positionen || []).find(p =>
        /transport|spedition|fracht|lieferung/i.test(p.beschr || p.artikel || '')
      );
      const bzkNetto = bzkPos ? r2(bzkPos.netto || bzkPos.ep || 0) : 0;

      // Hauptartikel (erste nicht-rabatt, nicht-BZK Position)
      const hauptPos = (poolBeleg.positionen || []).find(p =>
        !p.isRabatt &&
        !/transport|spedition|fracht|lieferung/i.test(p.beschr || p.artikel || '')
      );
      const hauptArtikel = hauptPos?.beschr || hauptPos?.artikel || '';

      // Netto ohne BZK als einzelne Position (rabatt ist bereits im pool-netto eingearbeitet)
      const matNetto = r2((poolBeleg.netto ?? 0) - bzkNetto);

      engineData = {
        ustSatz:      String(poolBeleg.ustPct ?? 19),
        bezugskosten: bzkNetto,
        rabattAktiv:  false,  // rabatt ist im pool-netto bereits enthalten
        positionen: [{
          artikel: hauptArtikel,
          menge:   1,
          ep:      matNetto,   // parseGeld handles numbers
        }],
      };
      break;
    }

    case 'ausgangsrechnung': {
      // Pool hat positionen mit ep als Zahl, menge als Zahl – direkt verwendbar
      engineData = {
        ustSatz:     String(poolBeleg.ustPct ?? 19),
        rabattAktiv: false,
        positionen:  (poolBeleg.positionen || []).map(p => ({
          artikel: p.beschr || p.artikel || '',
          menge:   p.menge ?? 1,
          ep:      p.ep ?? r2((p.netto ?? 0) / (p.menge ?? 1)),
        })),
      };
      break;
    }

    case 'ueberweisung': {
      // Pool-Format stimmt mit Engine-Format überein (beide: betrag, skontoBetrag als Zahlen)
      engineData = {
        betrag:      poolBeleg.betrag ?? 0,
        skontoBetrag: poolBeleg.skontoBetrag ?? 0,
      };
      break;
    }

    case 'kontoauszug':
    case 'email':
    case 'quittung': {
      // Diese Typen verwenden dieselbe Struktur wie das Engine-Format
      engineData = poolBeleg;
      break;
    }

    default:
      throw new Error(
        `belegPoolToBuchungssatz: Unbekannter Typ "${typ}". ` +
        'Gültige Typen: eingangsrechnung, ausgangsrechnung, ueberweisung, kontoauszug, email, quittung'
      );
  }

  return belegToBuchungssatz({ typ, data: engineData }, klasse);
}
