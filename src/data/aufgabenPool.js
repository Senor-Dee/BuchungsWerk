import { pick, r2, fmt, rnd, rgnr, augnr, fakeDatum, fmtIBAN, duSie, duSieGross, anrede, berechnePunkte, WERKSTOFF_TYPEN } from "../utils.js";
import { LIEFERANTEN, KUNDEN, UNTERNEHMEN, mkEingangsRE, mkAusgangsRE, mkUeberweisung, mkKontoauszug, mkEmail } from "./stammdaten.js";

export const AUFGABEN_POOL = {
  7: {
    // ── Lernbereich: Prozentrechnung ──────────────────────────────────────────
    "LB 1 · Prozentrechnung": [

      // ── 1. Prozentwert berechnen ──────────────────────────────────────────
      {
        id: "7_pct_prozentwert", nrPunkte: 2, titel: "Prozentwert berechnen (W = G × p%)",
        taskTyp: "rechnung",
        generate: (f, opts = {}) => {
          const schwer = (opts.schwierigkeit || "gemischt") === "schwer";
          const einfach = (opts.schwierigkeit || "gemischt") === "einfach";
          const g = einfach ? rnd(100, 1000, 100) : schwer ? rnd(1234, 9876, 1) : rnd(200, 5000, 50);
          const p = einfach ? pick([10, 20, 25, 50]) : schwer ? pick([3, 7, 12.5, 17.5]) : pick([5, 8, 10, 12, 15, 20, 25]);
          const w = r2(g * p / 100);
          const ctx = pick([
            `${f.name} gewährt ${p} % Preisnachlass auf einen Rechnungsbetrag von ${fmt(g)} €.`,
            `${f.name} erhält ${p} % Rabatt auf einen Listenpreis von ${fmt(g)} €.`,
            `Auf einen Warenwert von ${fmt(g)} € fallen ${p} % Umsatzsteuer an.`,
            `${f.name} zahlt ${p} % Zinsen auf ein Darlehen von ${fmt(g)} €.`,
          ]);
          return {
            aufgabe: `${ctx} Berechnen Sie den Prozentwert.`,
            schema: [
              { label: `Grundwert (G)`, wert: g, einheit: "€" },
              { label: `Prozentsatz (p)`, wert: p, einheit: "%" },
              { label: `W = G × p% = ${fmt(g)} × ${p}/100`, wert: w, einheit: "€", bold: true, trennlinie: true },
            ],
            punkte: 2, // 1 P Ergebnis + 1 P Schemapunkt
          };
        },
      },

      // ── 2. Grundwert berechnen ────────────────────────────────────────────
      {
        id: "7_pct_grundwert", nrPunkte: 2, titel: "Grundwert berechnen (G = W ÷ p%)",
        taskTyp: "rechnung",
        generate: (f, opts = {}) => {
          const einfach = (opts.schwierigkeit || "gemischt") === "einfach";
          const schwer  = (opts.schwierigkeit || "gemischt") === "schwer";
          const g = einfach ? rnd(100, 1000, 100) : schwer ? rnd(1234, 9876, 1) : rnd(200, 5000, 50);
          const p = einfach ? pick([10, 20, 25, 50]) : schwer ? pick([3, 7, 12.5, 17.5]) : pick([5, 8, 10, 12, 15, 20, 25]);
          const w = r2(g * p / 100);
          const ctx = pick([
            `${f.name} erhält ${fmt(w)} € Rabatt. Der Rabattsatz beträgt ${p} %.`,
            `Der Rabattbetrag beläuft sich auf ${fmt(w)} € bei einem Rabattsatz von ${p} %.`,
            `Die Umsatzsteuer beträgt ${fmt(w)} €. Der USt-Satz ist ${p} %.`,
          ]);
          return {
            aufgabe: `${ctx} Berechnen Sie den Grundwert (Ausgangsbetrag).`,
            schema: [
              { label: `Prozentwert (W)`, wert: w, einheit: "€" },
              { label: `Prozentsatz (p)`, wert: p, einheit: "%" },
              { label: `G = W ÷ p% = ${fmt(w)} ÷ ${p/100}`, wert: g, einheit: "€", bold: true, trennlinie: true },
            ],
            punkte: 2, // 1 P Ergebnis + 1 P Schemapunkt
          };
        },
      },

      // ── 3. Prozentsatz berechnen ──────────────────────────────────────────
      {
        id: "7_pct_prozentsatz", nrPunkte: 2, titel: "Prozentsatz berechnen (p% = W ÷ G)",
        taskTyp: "rechnung",
        generate: (f, opts = {}) => {
          const einfach = (opts.schwierigkeit || "gemischt") === "einfach";
          const schwer  = (opts.schwierigkeit || "gemischt") === "schwer";
          const p = einfach ? pick([10, 20, 25, 50]) : schwer ? pick([3, 7, 12.5, 17.5]) : pick([5, 8, 10, 12, 15, 20, 25]);
          const g = einfach ? rnd(100, 1000, 100) : schwer ? rnd(1234, 9876, 1) : rnd(200, 5000, 50);
          const w = r2(g * p / 100);
          const ctx = pick([
            `Vom Listenpreis ${fmt(g)} € werden ${fmt(w)} € Rabatt gewährt.`,
            `${f.name} zahlt ${fmt(w)} € Zinsen auf ein Darlehen von ${fmt(g)} €.`,
            `Auf einen Warenwert von ${fmt(g)} € entfallen ${fmt(w)} € Umsatzsteuer.`,
          ]);
          return {
            aufgabe: `${ctx} Berechnen Sie den Prozentsatz.`,
            schema: [
              { label: `Prozentwert (W)`, wert: w, einheit: "€" },
              { label: `Grundwert (G)`, wert: g, einheit: "€" },
              { label: `p% = W ÷ G = ${fmt(w)} ÷ ${fmt(g)}`, wert: p, einheit: "%", bold: true, trennlinie: true },
            ],
            punkte: 2, // 1 P Ergebnis + 1 P Schemapunkt
          };
        },
      },

      // ── 4. Erhöhter Grundwert (brutto) ────────────────────────────────────
      {
        id: "7_pct_erhoeht", nrPunkte: 3, titel: "Erhöhter Grundwert / Bruttobetrag",
        taskTyp: "rechnung",
        generate: (f, opts = {}) => {
          const einfach = (opts.schwierigkeit || "gemischt") === "einfach";
          const g = einfach ? rnd(100, 1000, 100) : rnd(200, 5000, 50);
          const p = einfach ? pick([10, 20]) : pick([7, 10, 15, 19, 20]);
          const brutto = r2(g * (1 + p / 100));
          const w = r2(brutto - g);
          return {
            aufgabe: pick([
              `Ein Nettopreis beträgt ${fmt(g)} €. Der Umsatzsteuersatz ist ${p} %. Berechnen Sie den Bruttobetrag.`,
              `Der Grundpreis einer Ware bei ${f.name} beträgt ${fmt(g)} €. Aufschlag: ${p} %. Wie hoch ist der Bruttobetrag?`,
            ]),
            schema: [
              { label: `Nettobetrag (G)`, wert: g, einheit: "€" },
              { label: `+ ${p} % Aufschlag (${fmt(g)} × ${p}/100)`, wert: w, einheit: "€" },
              { label: `= Brutto (G × (1 + p%))`, wert: brutto, einheit: "€", bold: true, trennlinie: true },
            ],
            punkte: 3, // 2 P Ergebnisse (Zuschlag + Brutto) + 1 P Schemapunkt
          };
        },
      },

      // ── 5. Verminderter Grundwert (netto rückrechnen) ─────────────────────
      {
        id: "7_pct_vermindert", nrPunkte: 2, titel: "Verminderter Grundwert / Nettobetrag rückrechnen",
        taskTyp: "rechnung",
        generate: (f, opts = {}) => {
          const einfach = (opts.schwierigkeit || "gemischt") === "einfach";
          const p = einfach ? pick([10, 20]) : pick([7, 10, 15, 19, 20]);
          const g = einfach ? rnd(100, 1000, 100) : rnd(200, 5000, 50);
          const brutto = r2(g * (1 + p / 100));
          const netto = r2(brutto / (1 + p / 100));
          return {
            aufgabe: `Ein Bruttobetrag (inkl. ${p} % USt) beträgt ${fmt(brutto)} €. Berechnen Sie den Nettobetrag (verminderter Grundwert).`,
            schema: [
              { label: `Bruttobetrag`, wert: brutto, einheit: "€" },
              { label: `Divisor (1 + ${p}/100 = ${1 + p/100})`, wert: null, einheit: "" },
              { label: `Netto = Brutto ÷ (1 + p%) = ${fmt(brutto)} ÷ ${1 + p/100}`, wert: netto, einheit: "€", bold: true, trennlinie: true },
            ],
            punkte: 2, // 1 P Ergebnis (Netto) + 1 P Schemapunkt
          };
        },
      },

      // ── 6. Prozentuale Veränderung ────────────────────────────────────────
      {
        id: "7_pct_veraenderung", nrPunkte: 3, titel: "Prozentuale Veränderung berechnen",
        taskTyp: "rechnung",
        generate: (f, opts = {}) => {
          const einfach = (opts.schwierigkeit || "gemischt") === "einfach";
          const alt = einfach ? rnd(100, 1000, 100) : rnd(100, 3000, 50);
          const pct = einfach
            ? pick([-20, -10, 10, 20, 25, 50])
            : pick([-20, -15, -10, -5, 5, 8, 10, 12, 15, 20, 25]);
          const neu = r2(alt * (1 + pct / 100));
          const diff = r2(neu - alt);
          const richtung = pct > 0 ? "gestiegen" : "gesunken";
          const kontext = pick([
            `Der Umsatz von ${f.name} betrug im Vorjahr ${fmt(alt)} €. Im aktuellen Jahr beträgt er ${fmt(neu)} €.`,
            `Der Einkaufspreis für ${pick(f.rohstoffe || ["Rohstoffe"])} stieg von ${fmt(alt)} € auf ${fmt(neu)} €.`,
            `Der Warenwert sank von ${fmt(alt)} € auf ${fmt(neu)} €.`,
          ]);
          return {
            aufgabe: `${kontext} Berechnen Sie die prozentuale Veränderung.`,
            schema: [
              { label: `Neuer Wert`, wert: neu, einheit: "€" },
              { label: `Alter Wert`, wert: alt, einheit: "€" },
              { label: `Differenz`, wert: Math.abs(diff), einheit: "€" },
              { label: `p% = Differenz ÷ alter Wert × 100`, wert: Math.abs(pct), einheit: "%", bold: true, trennlinie: true },
              { label: `→ Wert ist um ${Math.abs(pct)} % ${richtung}`, wert: null, einheit: "" },
            ],
            punkte: 3, // 2 P Ergebnisse (Differenz + p%) + 1 P Schemapunkt
          };
        },
      },

      // ── 7. Kombinierte Aufgabe: Mehrere Schritte ──────────────────────────
      {
        id: "7_pct_kombiniert", nrPunkte: 3, titel: "Prozentrechnung kombiniert (Einkauf mit Rabatt)",
        taskTyp: "rechnung",
        generate: (f, opts = {}) => {
          const einfach = (opts.schwierigkeit || "gemischt") === "einfach";
          const lep = einfach ? rnd(200, 2000, 100) : rnd(500, 5000, 100);
          const rabPct = einfach ? pick([10, 20]) : pick([5, 8, 10, 12, 15]);
          const mitSkonto = false; // Skonto erst ab Ende Kl. 7 – hier deaktiviert
          const skoPct = 2;
          const rab = r2(lep * rabPct / 100);
          const zep = r2(lep - rab);
          const sko = r2(zep * skoPct / 100);
          const bep = r2(zep - sko);
          const lief = pick(LIEFERANTEN);
          const schema = [
            { label: `Listeneinkaufspreis (LEP)`, wert: lep, einheit: "€" },
            { label: `− Rabatt (${rabPct} % von ${fmt(lep)} €)`, wert: rab, einheit: "€" },
            { label: `= Zieleinkaufspreis (ZEP)`, wert: zep, einheit: "€", trennlinie: true, highlight: true },
          ];
          if (mitSkonto) {
            schema.push({ label: `− Skonto (${skoPct} % von ${fmt(zep)} €)`, wert: sko, einheit: "€" });
            schema.push({ label: `= Bareinkaufspreis (BEP)`, wert: bep, einheit: "€", bold: true, trennlinie: true });
          }
          return {
            aufgabe: `${f.name} kauft Waren bei ${lief.name}. Listenpreis: ${fmt(lep)} €. Rabatt: ${rabPct} %.${mitSkonto ? ` Skonto: ${skoPct} %.` : ""} Berechnen Sie den ${mitSkonto ? "Zieleinkaufs- und Bareinkaufspreis" : "Zieleinkaufspreis"}.`,
            schema,
            punkte: 3, // 2 P Ergebnisse (Rabatt + ZEP) + 1 P Schemapunkt
          };
        },
      },

    ],

    "LB 1 · Schaubild-Analyse": [

      // ── Liniendiagramm: Umsatzentwicklung ───────────────────────────────────
      {
        id: "7_schaubild_linie", nrPunkte: 6, titel: "Schaubild analysieren – Liniendiagramm",
        taskTyp: "schaubild",
        generate: (f, opts = {}) => {
          const endJahr = 2025; // immer bis Vorjahr
          const startJahr = endJahr - 4;
          const jahre = [startJahr, startJahr+1, startJahr+2, startJahr+3, startJahr+4];
          const basis = rnd(80, 300, 10);
          const werte = [basis];
          for (let i = 1; i < 5; i++) {
            const change = pick([-15,-10,-5,5,8,10,12,15,20]);
            werte.push(Math.max(20, r2(werte[i-1] * (1 + change/100))));
          }
          const einheit = "Tsd. €";
          const thema = pick(["Umsatz", "Gewinn", "Absatz"]);
          const quelle = "Fiktive Daten – Eigene Darstellung 2025";
          const herausgeber = f.name;
          // Prozentuale Veränderung vom ersten zum letzten Jahr
          const veraenderung = r2((werte[4] - werte[0]) / werte[0] * 100);
          const richtung = veraenderung >= 0 ? "gestiegen" : "gesunken";
          // Zwei Jahre für Vergleichsaufgabe
          const j1idx = 0, j2idx = pick([2, 3, 4]);
          const pctZwei = r2((werte[j2idx] - werte[j1idx]) / werte[j1idx] * 100);

          return {
            aufgabe: `Analysiere das folgende Schaubild und beantworte die Aufgaben.`,
            schaubild: {
              typ: "linie",
              titel: `${thema}sentwicklung der ${f.name}`,
              untertitel: `in ${einheit}`,
              einheit,
              quelle,
              herausgeber,
              jahre,
              werte,
              j1: j1idx,
              j2: j2idx,
            },
            teilaufgaben: [
              { nr: "a", text: `Nenne die Bestandteile eines Schaubildes und ordne sie dem vorliegenden Diagramm zu.`,
                loesung: `Überschrift: "${thema}sentwicklung der ${f.name}". Unterüberschrift: "in ${einheit}". Diagrammart: Liniendiagramm. Einheit: ${einheit}. Quelle: ${quelle}. Herausgeber: ${herausgeber}.`, punkte: 2 },
              { nr: "b", text: `Beschreibe die Entwicklung des ${thema}s im Beobachtungszeitraum.`,
                loesung: `Der ${thema} ist von ${fmt(werte[0])} ${einheit} (${jahre[0]}) auf ${fmt(werte[4])} ${einheit} (${jahre[4]}) insgesamt ${Math.abs(veraenderung) >= 0.1 ? Math.abs(veraenderung).toFixed(1) + " % " : ""}${richtung}.`, punkte: 2 },
              { nr: "c", text: `Berechne die prozentuale Veränderung des ${thema}s von ${jahre[j1idx]} auf ${jahre[j2idx]}.`,
                loesung: `p% = (${fmt(werte[j2idx])} − ${fmt(werte[j1idx])}) ÷ ${fmt(werte[j1idx])} × 100 = ${pctZwei.toFixed(1)} %`, punkte: 2 },
            ],
            punkte: 6,
          };
        },
      },

      // ── Balkendiagramm: Kostenvergleich ─────────────────────────────────────
      {
        id: "7_schaubild_balken", nrPunkte: 5, titel: "Schaubild analysieren – Balkendiagramm",
        taskTyp: "schaubild",
        generate: (f, opts = {}) => {
          const kategorien = pick([
            { name: "Kostenarten", items: ["Materialkosten", "Personalkosten", "Mietkosten", "Sonstige"], einheit: "Tsd. €" },
            { name: "Produktgruppen", items: pick([f.fertigerzeugnisse, f.handelswaren, f.rohstoffe].filter(a => a?.length >= 3)) || ["Produkt A","Produkt B","Produkt C","Produkt D"], einheit: "Stk." },
          ]);
          const werte = kategorien.items.map(() => rnd(20, 200, 5));
          const gesamt = werte.reduce((s,w) => s+w, 0);
          const maxIdx = werte.indexOf(Math.max(...werte));
          const pctMax = r2(werte[maxIdx] / gesamt * 100);
          const quelle = "Fiktive Daten – Interne Kostenrechnung 2025";

          return {
            aufgabe: `Analysiere das folgende Balkendiagramm und beantworte die Aufgaben.`,
            schaubild: {
              typ: "balken",
              titel: `${kategorien.name} der ${f.name}`,
              untertitel: `in ${kategorien.einheit}`,
              einheit: kategorien.einheit,
              quelle,
              herausgeber: f.name,
              kategorien: kategorien.items,
              werte,
            },
            teilaufgaben: [
              { nr: "a", text: `Benenne Diagrammart, Überschrift, Einheit und Quelle des Schaubildes.`,
                loesung: `Diagrammart: Balkendiagramm. Überschrift: "${kategorien.name} der ${f.name}". Einheit: ${kategorien.einheit}. Quelle: ${quelle}.`, punkte: 2 },
              { nr: "b", text: `Welche Kategorie hat den größten Anteil? Berechne den prozentualen Anteil.`,
                loesung: `${kategorien.items[maxIdx]} mit ${werte[maxIdx]} ${kategorien.einheit}. Anteil: ${werte[maxIdx]} ÷ ${gesamt} × 100 = ${pctMax.toFixed(1)} %`, punkte: 3 },
            ],
            punkte: 5,
          };
        },
      },

    ],

    "LB 3 · Einführung Buchführung": [
      {
        id: "7_anlage_kauf_ziel", titel: "Kauf einer Anlage auf Ziel (ohne USt – Einführung)",
        generate: f => {
          const anlagenTyp = pick([
            { art: "Fertigungsmaschine", konto: "0700", name: "Maschinen und Anlagen" },
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
            erklaerung: `Forderung erlischt komplett (2400 FO Haben, ${fmt(gesamt)} €). Bankeingang (2800 BK Soll, ${fmt(bank)} €). Bareingang (2880 KA Soll, ${fmt(bar)} €). Zusammengesetzter Buchungssatz.`,
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
            nrPunkte: 1, erklaerung: "Brutto ÷ 1,19 = Netto. Fremdbauteile (6010 AWF Soll). Vorsteuer (2600 VORST Soll). Verbindlichkeit (4400 VE Haben).",
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
            nrPunkte: 1, erklaerung: "Hilfsstoffe (6020 AWH Soll). Vorsteuer (2600 VORST Soll). Verbindlichkeit (4400 VE Haben). Brutto ÷ 1,19 = Netto.",
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
            nrPunkte: 1, erklaerung: `Betriebsstoffe z. B. Öl, Strom, Reinigungsmittel = kein Bestandteil des Produkts (6030 AWB Soll). Vorsteuer (2600 VORST Soll). ${via === "BK" ? "Zahlung per Bank (2800 BK Haben)." : "Zielkauf → Verbindlichkeit (4400 VE Haben)."}`,
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
            nrPunkte: 0, erklaerung: "Forderung = Bruttobetrag (2400 FO Soll). Umsatzerlöse FE (5000 UEFE Haben). USt-Schuld (4800 UST Haben).",
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
            aufgabe: `${f.name} verkauft ${menge} Stück "${art}" an einen Kunden. Listenpreis: ${fmt(listenEP)} € je Stück. Dem Kunden wird ein Rabatt von ${rabattPct} % gewährt. Erstellen Sie die Kalkulation und bilden Sie den Buchungssatz.`,
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
            nrPunkte: 1, erklaerung: `Anlage verlässt das Unternehmen (0700 MA Haben, Buchwert ${fmt(buchwert)} €). Forderung = Bruttobetrag (2400 FO Soll). USt-Schuld (4800 UST Haben).`,
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
            { nr: "5430", kürzel: "ASBE", name: "Andere sonstige betriebl. Erträge (ASBE)" },
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
        id: "8_rechnung_pruefen", titel: "Eingangsrechnung auf Richtigkeit prüfen (Fehler finden)",
        taskTyp: "rechnung",
        generate: f => {
          const wt = WERKSTOFF_TYPEN[0];
          const art = pick(f.rohstoffe);
          const menge = rnd(50, 300, 10);
          const ep = rnd(20, 80);
          const richtigNetto = r2(menge * ep);
          // Fehler: falscher Nettobetrag auf Rechnung
          const fehlerTyp = pick(["netto", "ust", "brutto"]);
          const richtigUSt = r2(richtigNetto * 0.19);
          const richtigBrutto = r2(richtigNetto + richtigUSt);
          const falschNetto = fehlerTyp === "netto" ? r2(richtigNetto + rnd(100, 500, 50)) : richtigNetto;
          const falschUSt = fehlerTyp === "ust" ? r2(richtigUSt + rnd(50, 200, 10)) : r2(falschNetto * 0.19);
          const falschBrutto = fehlerTyp === "brutto" ? r2(richtigBrutto + rnd(80, 300, 20)) : r2(falschNetto + falschUSt);
          return {
            aufgabe: `Prüfen Sie die folgende Eingangsrechnung auf sachliche und rechnerische Richtigkeit. Nennen Sie den Fehler und bilden Sie den korrekten Buchungssatz.`,
            beleg: {
              typ: "eingangsrechnung_fehler",
              lief: pick(LIEFERANTEN),
              empfaenger: { name: f.name, strasse: f.strasse, plz_ort: `${f.plz} ${f.ort}` },
              rgnr: rgnr(),
              datum: fakeDatum(-8),
              positionen: [{ pos: 1, beschr: art, menge, einheit: "Stk", ep, netto: falschNetto }],
              netto: falschNetto,
              ustPct: 19,
              ustBetrag: falschUSt,
              brutto: falschBrutto,
              zahlungsziel: `Netto 30 Tage, zahlbar bis ${fakeDatum(22)}`,
              hatFehler: true,
              fehlerHinweis: fehlerTyp === "netto"
                ? `Rechnerischer Fehler: ${menge} Stk × ${ep} € = ${fmt(richtigNetto)} € (nicht ${fmt(falschNetto)} €)`
                : fehlerTyp === "ust"
                ? `USt-Fehler: 19 % von ${fmt(richtigNetto)} € = ${fmt(richtigUSt)} € (nicht ${fmt(falschUSt)} €)`
                : `Brutto-Fehler: ${fmt(richtigNetto)} € + ${fmt(richtigUSt)} € = ${fmt(richtigBrutto)} € (nicht ${fmt(falschBrutto)} €)`,
            },
            schema: [
              { label: `${menge} Stk × ${ep} € = Netto (richtig)`, wert: richtigNetto, einheit: "€" },
              { label: `+ USt 19 % (richtig)`, wert: richtigUSt, einheit: "€" },
              { label: `= Brutto (richtig)`, wert: richtigBrutto, einheit: "€", bold: true, trennlinie: true },
              { label: `Fehler auf Rechnung`, wert: falschBrutto, einheit: "€" },
              { label: `→ Differenz`, wert: r2(Math.abs(falschBrutto - richtigBrutto)), einheit: "€", bold: true },
            ],
            soll: [{ nr: wt.aw.nr, name: wt.aw.name, betrag: richtigNetto }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: richtigUSt }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: richtigBrutto }],
            nrPunkte: 1,
            erklaerung: `Fehler: ${fehlerTyp === "netto" ? `Netto falsch berechnet (${fmt(falschNetto)} statt ${fmt(richtigNetto)} €)` : fehlerTyp === "ust" ? `USt falsch berechnet (${fmt(falschUSt)} statt ${fmt(richtigUSt)} €)` : `Brutto falsch berechnet (${fmt(falschBrutto)} statt ${fmt(richtigBrutto)} €)`}. ISB Kl.8: Nur Menge×EP = 1 NR-Punkt. USt- und Brutto-Berechnung = kein Punkt (ISB-Handreichung 2025). Buchung mit korrekten Werten: ${wt.aw.kürzel} ${fmt(richtigNetto)} €, VORST ${fmt(richtigUSt)} €, VE ${fmt(richtigBrutto)} €.`,
          };
        },
      },
      {
        id: "8_ek_rs_netto", titel: "Einkauf Werkstoffe auf Ziel (Nettobetrag)",
        generate: (f, opts = {}) => {
          const wt = WERKSTOFF_TYPEN.find(w => w.id === (opts.werkstoffId || "rohstoffe")) || WERKSTOFF_TYPEN[0];
          const art = pick(f[wt.key] || f.rohstoffe); const menge = rnd(100, 1000, 50); const n = rnd(800, 12000); const u = r2(n * 0.19);
          return {
            aufgabe: "Prüfen Sie die Eingangsrechnung auf rechnerische Richtigkeit und erfassen Sie den Einkauf buchhalterisch.",
            beleg: mkEingangsRE(f, art, menge, "Stk", n, 19, false),
            soll: [{ nr: wt.aw.nr, name: wt.aw.name, betrag: n }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: u }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: r2(n + u) }],
            nrPunkte: 0, erklaerung: `Ab Kl. 8 steht Netto auf der Rechnung. ${wt.aw.name} (${wt.aw.nr} ${wt.aw.kürzel} Soll). Vorsteuer (2600 VORST Soll). Verbindlichkeit brutto (4400 VE Haben).`,
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
          const lieferant = pick(LIEFERANTEN);
          const schwellenText = menge >= schwelle ? `(${menge} Stk ≥ ${schwelle} Stk → ${rabattPct} % Rabatt)` : `(${menge} Stk < ${schwelle} Stk → kein erhöhter Rabatt)`;
          return {
            aufgabe: `${f.name} bestellt ${menge} Stk ${art} bei ${lieferant.name}, ${lieferant.ort}. Listenpreis: ${fmt(listpreis)} €/Stk. Staffelrabatt (Sofortrabatt): ab ${schwelle} Stk ${menge >= schwelle ? rabattPct : (rabattPct + 2)} % ${schwellenText}. Zahlungsbedingung: ${skontoPct} % Skonto. Bezugskosten (Fracht): ${fmt(bezugskosten)} €. Berechnen Sie den Einstandspreis.`,
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

          // Rabatt-Konfiguration aus opts (Sofortrabatt – direkt auf Rechnung, kein eigenes Konto)
          const rabattTypen = ["Sofortrabatt", "Mengenrabatt", "Treuerabatt", "Wiederverkäuferrabatt"];
          const rabattTypA = opts.rabattTyp || pick(rabattTypen);
          const rabattTypB = pick(rabattTypen.filter(r => r !== rabattTypA));

          // Angebot A – Rabatt aus opts oder zufällig
          const lepA   = rnd(8, 20, 1) * menge;
          // Wenn opts.rabattEuro gesetzt: Prozentsatz rückrechnen
          const rabPctA = opts.rabattEuro ? Math.round(opts.rabattEuro / lepA * 100 * 10) / 10
                        : (opts.rabattPct || pick([5, 8, 10, 12]));
          const skPctA  = pick([2, 3]);
          const bzkA    = rnd(50, 300, 10);
          const kA      = mkKalk(lepA, rabPctA, skPctA, bzkA);

          // Angebot B – absichtlich nicht immer günstiger, eigener zufälliger Rabatt
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

          // Kalkulationszeile: Sofortrabatt NICHT als eigenes Konto gebucht!
          // Er wird direkt auf der Rechnung abgezogen (LEP → ZEP)
          const kalkulationszeilen = (k, skPct, rabTyp) => [
            { label: "Listeneinkaufspreis (netto)", wert: k.lep, einheit: "€" },
            { label: `− ${rabTyp || "Sofortrabatt"} (${k.rabPct} %)`, wert: k.rab, einheit: "€" },
            { label: "= Zieleinkaufspreis (netto)", wert: k.zep, einheit: "€", trennlinie: true, highlight: true },
            { label: `− Lieferantenskonto (${skPct} %)`, wert: k.sko, einheit: "€" },
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
              _optsKey: "angebotsvergleich",
              aufgabe: aufgabentext,
              beleg: null, soll: [], haben: [],
              angebote: [
                { name: "Angebot A", lief: lief.name,  ort: lief.ort,  k: kA, skPct: skPctA, rows: kalkulationszeilen(kA, skPctA, rabattTypA) },
                { name: "Angebot B", lief: lief2.name, ort: lief2.ort, k: kB, skPct: skPctB, rows: kalkulationszeilen(kB, skPctB, rabattTypB) },
              ],
              gewinner,
              punkte: 8,
              nrPunkte: 6,
              erklaerung: `Angebot ${gewinner === 0 ? "A" : "B"} (${winLief.name}) ist günstiger: Einstandspreis ${fmt(winKalk.einst)} € < ${fmt(gewinner === 0 ? kB.einst : kA.einst)} €. Für den Kauf auf Ziel gilt der Zieleinkaufspreis (ZielEP) = ${fmt(winKalk.zep)} €.`,
            });
          } else if (mitKalk) {
            // ── Einfache Kalkulation mit vollständigen Angaben ────────────────
            schritte.push({
              nr: schrNr++,
              titel: "Einkaufskalkulation",
              typ: "kalkulation",
              _optsKey: "kalkulation",
              aufgabe: `${f.name} bezieht ${menge} ${einheit} ${art} von ${winLief.name}, ${winLief.ort}. Ermitteln Sie den Einstandspreis anhand folgender Konditionen: Listeneinkaufspreis: ${fmt(winKalk.lep)} € · Sofortrabatt: ${winKalk.rabPct} % · Lieferantenskonto: ${winSkoPct} % · Bezugskosten: ${fmt(winKalk.bzkBetrag)} €.`,
              beleg: null, soll: [], haben: [],
              schema: kalkulationszeilen(winKalk, winSkoPct, rabattTypA),
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
            aufgabe: `Buchen Sie die folgende Eingangsrechnung.${mitAV || mitKalk ? " Hinweis: Als Buchungsbetrag gilt der Zieleinkaufspreis (nach Sofortrabatt-Abzug)!" : ""}`,
            beleg: (() => {
              const showRab = (mitAV || mitKalk) && winKalk.rab > 0;
              const lep = showRab ? winKalk.lep : basisNetto;
              const ep  = r2(lep / menge);
              const pos = [{ pos: 1, beschr: art, menge, einheit, ep, lepNetto: lep, netto: lep }];
              if (showRab) pos.push({ pos: 2, beschr: `− ${rabattTypA} (${winRabPct} %)`, menge: null, einheit: null, ep: null, netto: -winKalk.rab, isRabatt: true });
              return {
                typ: "eingangsrechnung", lief: winLief,
                empfaenger: { name: f.name, strasse: f.strasse, plz_ort: `${f.plz} ${f.ort}` },
                rgnr: nr1, datum: fakeDatum(-8), lieferdatum: fakeDatum(-11), positionen: pos,
                netto: basisNetto, ustPct: 19, ustBetrag: ust1, brutto: brutto1,
                zahlungsziel: `Netto 30 Tage, zahlbar bis ${fakeDatum(22)}`, klasse7: false,
              };
            })(),
            soll: [{ nr: wt.aw.nr, name: wt.aw.name, betrag: basisNetto }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: ust1 }],
            haben: [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: brutto1 }],
            nrPunkte: 1, punkte: 2 + 1 + 1,
            erklaerung: `${mitAV || mitKalk ? `Buchungsbasis = Zieleinkaufspreis (${fmt(basisNetto)} €) – nicht Listeneinkaufspreis! Sofortrabatt wird auf der Rechnung direkt abgezogen, kein eigenes Buchungskonto. ` : ""}${wt.aw.kürzel} Soll ${fmt(basisNetto)} €. VORST Soll ${fmt(ust1)} €. VE Haben ${fmt(brutto1)} €.`,
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
              _optsKey: "ruecksendung",
              aufgabe: `${f.name} sendet ${mengenH} der Lieferung zurück. Bilde den Buchungssatz!`,
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
              _optsKey: "nachlass",
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
      },
    ],
    "LB 2 · Bestandsveränderungen Werkstoffe": [
      {
        id: "8_bestandsveraenderung_erklaerung", titel: "Bestandsveränderungen – Grundprinzip erläutern",
        taskTyp: "theorie", themenTyp: "freitext",
        generate: () => ({
          aufgabe: "Erläutern Sie, was unter einer Bestandsveränderung bei Werkstoffen zu verstehen ist. Nennen Sie die möglichen Arten und erklären Sie, wann eine Bestandsminderung bzw. eine Bestandserhöhung vorliegt.",
          freitext: { zeilen: 6,
            loesung: `Bestandsveränderungen entstehen, wenn der tatsächliche Endbestand laut Inventur vom Anfangsbestand abweicht.

Bestandsminderung: Endbestand < Anfangsbestand → mehr Werkstoffe verbraucht als eingekauft. Buchung: Aufwandskonto (z. B. 2000 R) wird im Soll erhöht (zusätzlicher Aufwand).

Bestandserhöhung: Endbestand > Anfangsbestand → mehr eingekauft als verbraucht. Buchung: Aufwandskonto wird im Haben vermindert (Aufwand sinkt).

Konten: 2000 R (Rohstoffe), 2010 F (Fremdbauteile), 2020 H (Hilfsstoffe), 2030 B (Betriebsstoffe).`,
          }, nrPunkte: 4,
        }),
      },
      {
        id: "8_bestandsmin_rohstoffe", titel: "Bestandsminderung Rohstoffe (2000 R)",
        taskTyp: "rechnung",
        generate: f => {
          const ab = rnd(15000, 60000, 1000);
          const eb = rnd(8000, ab - 2000, 500);
          const diff = r2(ab - eb);
          const wt = WERKSTOFF_TYPEN[0]; // Rohstoffe
          return {
            aufgabe: `Ermitteln Sie auf Grundlage der Inventurergebnisse die Bestandsveränderung bei den Rohstoffen und erfassen Sie diese buchhalterisch. Anfangsbestand: ${fmt(ab)} €, Endbestand laut Inventur: ${fmt(eb)} €.`,
            beleg: null,
            schema: [
              { label: "Anfangsbestand (01.01.) laut Eröffnungsbilanz", wert: ab, einheit: "€" },
              { label: "− Endbestand (31.12.) laut Inventur", wert: eb, einheit: "€" },
              { label: "= Bestandsminderung", wert: diff, einheit: "€", bold: true, trennlinie: true, highlight: false },
              { label: "→ Buchung: 2000 R an 6000 AWR", wert: diff, einheit: "€", bold: true },
            ],
            soll: [{ nr: "2000", name: "Bestandsveränderung Rohstoffe (R)", betrag: diff }],
            haben: [{ nr: "6000", name: "Aufwendungen Rohstoffe (AWR)", betrag: diff }],
            nrPunkte: 3,
            erklaerung: `Endbestand (${fmt(eb)} €) < Anfangsbestand (${fmt(ab)} €) → Bestandsminderung von ${fmt(diff)} €. Mehrverbrauch = zusätzlicher Aufwand: AWR-Konto steigt (Haben), Bestandskonto 2000 R sinkt (Soll). Buchung: 2000 R an 6000 AWR.`,
          };
        },
      },
      {
        id: "8_bestandserh_rohstoffe", titel: "Bestandserhöhung Rohstoffe (2000 R)",
        taskTyp: "rechnung",
        generate: f => {
          const ab = rnd(15000, 50000, 1000);
          const eb = rnd(ab + 1000, ab + 15000, 500);
          const diff = r2(eb - ab);
          return {
            aufgabe: `Ermitteln Sie auf Grundlage der Inventurergebnisse die Bestandsveränderung bei den Rohstoffen und erfassen Sie diese buchhalterisch. Anfangsbestand: ${fmt(ab)} €, Endbestand laut Inventur: ${fmt(eb)} €.`,
            beleg: null,
            schema: [
              { label: "Endbestand (31.12.) laut Inventur", wert: eb, einheit: "€" },
              { label: "− Anfangsbestand (01.01.)", wert: ab, einheit: "€" },
              { label: "= Bestandserhöhung", wert: diff, einheit: "€", bold: true, trennlinie: true, highlight: true },
              { label: "→ Buchung: 6000 AWR an 2000 R", wert: diff, einheit: "€", bold: true },
            ],
            soll: [{ nr: "6000", name: "Aufwendungen Rohstoffe (AWR)", betrag: diff }],
            haben: [{ nr: "2000", name: "Bestandsveränderung Rohstoffe (R)", betrag: diff }],
            nrPunkte: 3,
            erklaerung: `Endbestand (${fmt(eb)} €) > Anfangsbestand (${fmt(ab)} €) → Bestandserhöhung von ${fmt(diff)} €. Weniger verbraucht als eingekauft = Aufwand sinkt: AWR-Konto wird gekürzt (Soll), Bestandskonto 2000 R steigt (Haben). Buchung: 6000 AWR an 2000 R.`,
          };
        },
      },
      {
        id: "8_bestandsveraenderung_werkstoff", titel: "Bestandsveränderung – alle Werkstoffarten",
        taskTyp: "rechnung",
        generate: f => {
          const typen = [
            { nr: "2000", kürzel: "R",  name: "Rohstoffe (R)",       aw: "6000", awName: "AWR" },
            { nr: "2010", kürzel: "F",  name: "Fremdbauteile (F)",   aw: "6010", awName: "AWF" },
            { nr: "2020", kürzel: "H",  name: "Hilfsstoffe (H)",     aw: "6020", awName: "AWH" },
            { nr: "2030", kürzel: "B",  name: "Betriebsstoffe (B)",  aw: "6030", awName: "AWB" },
          ];
          const t = pick(typen);
          const istMin = Math.random() > 0.5;
          const ab = rnd(10000, 50000, 1000);
          const eb = istMin ? rnd(5000, ab - 1000, 500) : rnd(ab + 500, ab + 12000, 500);
          const diff = r2(Math.abs(eb - ab));
          const art = istMin ? "Bestandsminderung" : "Bestandserhöhung";
          return {
            aufgabe: `Die Inventur ergibt folgenden Befund bei den ${t.name}: Anfangsbestand ${fmt(ab)} €, Endbestand ${fmt(eb)} €. Ermitteln Sie Art und Höhe der Bestandsveränderung und bilden Sie den Buchungssatz.`,
            beleg: null,
            schema: [
              { label: `Endbestand 31.12. (laut Inventur)`, wert: eb, einheit: "€" },
              { label: `− Anfangsbestand 01.01.`, wert: ab, einheit: "€" },
              { label: `= ${art}`, wert: diff, einheit: "€", bold: true, trennlinie: true, highlight: !istMin },
              { label: `Buchung: ${istMin ? `${t.nr} ${t.kürzel} an ${t.aw} ${t.awName}` : `${t.aw} ${t.awName} an ${t.nr} ${t.kürzel}`}`, wert: diff, einheit: "€", bold: true },
            ],
            soll: istMin
              ? [{ nr: t.nr, name: t.name, betrag: diff }]
              : [{ nr: t.aw, name: `Aufwend. ${t.name} (${t.awName})`, betrag: diff }],
            haben: istMin
              ? [{ nr: t.aw, name: `Aufwend. ${t.name} (${t.awName})`, betrag: diff }]
              : [{ nr: t.nr, name: t.name, betrag: diff }],
            nrPunkte: 3,
            erklaerung: istMin
              ? `${art}: EB (${fmt(eb)} €) < AB (${fmt(ab)} €). Mehrverbrauch → ${t.awName}-Konto steigt (Haben). Bestandskonto ${t.kürzel} sinkt (Soll). Buchung: ${t.nr} ${t.kürzel} an ${t.aw} ${t.awName}.`
              : `${art}: EB (${fmt(eb)} €) > AB (${fmt(ab)} €). Weniger verbraucht → ${t.awName}-Konto sinkt (Soll). Bestandskonto ${t.kürzel} steigt (Haben). Buchung: ${t.aw} ${t.awName} an ${t.nr} ${t.kürzel}.`,
          };
        },
      },
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
            nrPunkte: 0, erklaerung: "Forderung = Bruttobetrag (2400 FO Soll). Erlöse FE (5000 UEFE Haben). USt-Schuld (4800 UST Haben).",
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
            nrPunkte: 2, erklaerung: `Forderung erlischt vollständig (2400 FO Haben, ${fmt(brutto)} €). Eingang nur ${fmt(zahl)} € (2800 BK Soll). Skonto kürzt Erlöse + USt.`,
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
            nrPunkte: 0, erklaerung: "Nachlass wegen Mängelrüge mindert Erlöse (5001 EBFE Soll, Nettobetrag). USt-Schuld sinkt (4800 UST Soll). Forderung wird gekürzt (2400 FO Haben, Bruttobetrag).",
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
            nrPunkte: 0, erklaerung: `Versandkosten bei "frei Haus"-Lieferung = Aufwand (6140 AFR Soll, Nettobetrag). Vorsteuer (2600 VORST Soll). ${viaName} (${viaKonto} Haben).`,
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

          // ── Vorkalkulation (Verkaufskalkulation – ISB Vorwärtskalkulation) ─────
          // EP → +Gewinn → BVP → +Kundenskonto → ZVP(Buchungsbasis) → +Kundenrabatt → LVP
          const ekp        = rnd(800, 6000, 100);
          const aufschPct  = pick([20, 25, 30, 35, 40]);
          const aufsch     = r2(ekp * aufschPct / 100);
          const bvp        = r2(ekp + aufsch);                       // Barverkaufspreis
          const skoKalkPct = pick([2, 3]);                           // Kundenskonto %
          const zvp        = r2(bvp / (1 - skoKalkPct / 100));      // Zielverkaufspreis (ISB: BVP÷(1−sk%))
          const skoKalkB   = r2(zvp - bvp);                         // Kundenskonto-Betrag
          const rabKalkPct = pick([5, 8, 10]);                       // Kundenrabatt %
          const lvp        = r2(zvp / (1 - rabKalkPct / 100));      // Listenverkaufspreis netto
          const rabKalkB   = r2(lvp - zvp);                         // Kundenrabatt-Betrag
          const basisNetto = mitKalk ? zvp : rnd(2000, 14000, 200); // ZVP = Buchungsbasis!
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
              _optsKey: "vorkalkulation",
              aufgabe: `Ermitteln Sie den Listenverkaufspreis (netto) für ${menge} Stk. ${art} mithilfe der Vorwärtskalkulation.\nGegebene Größen:\n• Einstandspreis: ${fmt(ekp)} €\n• Gewinnzuschlag: ${aufschPct} % auf den EP\n• Kundenskonto: ${skoKalkPct} %\n• Kundenrabatt: ${rabKalkPct} %\nMarkieren Sie den Buchungsbetrag.`,
              beleg: null, soll: [], haben: [],
              schema: [
                { label: "Einstandspreis (EP)", wert: ekp, einheit: "€" },
                { label: `+ Gewinn (${aufschPct} %)`, wert: aufsch, einheit: "€" },
                { label: "= Barverkaufspreis (BVP)", wert: bvp, einheit: "€", bold: true, trennlinie: true },
                { label: `+ Kundenskonto (${skoKalkPct} % auf ZVP)`, wert: skoKalkB, einheit: "€" },
                { label: "= Zielverkaufspreis (ZVP)", wert: zvp, einheit: "€", bold: true, trennlinie: true, highlight: true },
                { label: `+ Kundenrabatt (${rabKalkPct} % auf LVP)`, wert: rabKalkB, einheit: "€" },
                { label: "= Listenverkaufspreis netto (LVP)", wert: lvp, einheit: "€", bold: true, trennlinie: true },
                { label: "+ USt (19 %)", wert: ust1, einheit: "€" },
                { label: "= Brutto-Rechnungsbetrag (auf Basis ZVP)", wert: brutto1, einheit: "€", bold: true, trennlinie: true },
              ],
              punkte: 6,
              nrPunkte: 5,
              erklaerung: `EP (${fmt(ekp)} €) + Gewinn ${aufschPct} % = BVP ${fmt(bvp)} €. BVP ÷ (1 − ${skoKalkPct} %) = ZVP ${fmt(zvp)} € → Buchungsbasis! ZVP ÷ (1 − ${rabKalkPct} %) = LVP ${fmt(lvp)} € (Katalogpreis). Buchungssatz: FO ${fmt(brutto1)} € Soll | UEFE ${fmt(zvp)} € + UST ${fmt(ust1)} € Haben.`,
            });
          }

          // ── Schritt: Verkauf auf Ziel ─────────────────────────────────────────
          schritte.push({
            nr: schrNr++,
            titel: `Verkauf auf Ziel${mitKalk ? " (Zielverkaufspreis!)" : ""}`,
            typ: "buchung",
            aufgabe: `Buchen Sie die folgende Ausgangsrechnung.${mitKalk ? " Hinweis: Als Buchungsbetrag gilt der Zielverkaufspreis!" : ""}`,
            beleg: {
              typ: "ausgangsrechnung", firma: f, kunde,
              rgnr: nr1, datum: fakeDatum(-5), lieferdatum: fakeDatum(-7),
              positionen: [{ pos: 1, beschr: art, menge, einheit: "Stk", ep: r2(basisNetto / menge), netto: basisNetto }],
              netto: basisNetto, ustPct: 19, ustBetrag: ust1, brutto: brutto1,
              zahlungsziel: `Netto 30 Tage, zahlbar bis ${fakeDatum(25)}`,
            },
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
              _optsKey: "ruecksendung",
              aufgabe: `Der Kunde sendet ${mengenH} der Lieferung wegen Mängeln zurück. Bilde den Buchungssatz!`,
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
              _optsKey: "nachlass",
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
              nrPunkte: 0,
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
            aufgabe: "Analysieren Sie die Entgeltabrechnung und erfassen Sie den monatlichen Personalaufwand buchhalterisch.",
            beleg: mkEmail(`personal@${f.name.toLowerCase().replace(/[\s\-]/g,"")}.de`, `${f.name} – Personalbüro`, f.email,
              `Gehaltsabrechnung ${monat} 2025`,
              `Gehaltsabrechnung ${monat} 2025\n\nBruttolohn:              ${fmt(brutto)} €\n− Lohnsteuer:            ${fmt(lst)} €\n− Kirchensteuer:         ${fmt(kist)} €\n− SV-Beitrag AN (20 %):  ${fmt(svAN)} €\n─────────────────────────────────\nNettobetrag:             ${fmt(netto)} €\n\nAG-SV-Beitrag (20 %):    ${fmt(svAG)} €\nGesamtpersonalkosten:    ${fmt(r2(brutto+svAG))} €\n\nNettoauszahlung per Überweisung. LSt/KiSt an FA, SV-Gesamt an SV-Träger.`),
            nebenrechnungen: [{ label: "Nettolohn", formel: `${fmt(brutto)} − ${fmt(lst)} − ${fmt(kist)} − ${fmt(svAN)}`, ergebnis: `${fmt(netto)} €` }, { label: "Gesamt-SV (4840)", formel: `${fmt(svAN)} + ${fmt(svAG)}`, ergebnis: `${fmt(svGes)} €` }],
            soll: [{ nr: "6200", name: "Löhne und Gehälter", betrag: brutto }, { nr: "6400", name: "AG-Anteil Sozialversicherung (AGASV)", betrag: svAG }],
            haben: [{ nr: "2800", name: "Bank (BK — Nettobetrag)", betrag: netto }, { nr: "4830", name: "Verbindl. Finanzamt (LSt/KiSt)", betrag: r2(lst + kist) }, { nr: "4840", name: "Verbindl. SV-Träger (AN+AG)", betrag: svGes }],
            nrPunkte: 2, erklaerung: `Bruttolohn = Aufwand (6200). AG-SV = weiterer Aufwand (6400). Netto ${fmt(netto)} € (2800 BK). LSt/KiSt ${fmt(r2(lst+kist))} € (4830). SV-Gesamt ${fmt(svGes)} € (4840).`,
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
        id: "8_ust_zahllast_ermittlung", titel: "USt-Zahllast ermitteln (Berechnung + Buchung)",
        taskTyp: "rechnung",
        generate: f => {
          const ust = rnd(4000, 15000, 100);
          const vst = rnd(1500, ust - 500, 100);
          const zahllast = r2(ust - vst);
          return {
            aufgabe: `Ermitteln Sie rechnerisch die USt-Zahllast für ${f.name} und erfassen Sie deren Überweisung an das Finanzamt buchhalterisch. Umsatzsteuer (4800 UST): ${fmt(ust)} €, Vorsteuer (2600 VORST): ${fmt(vst)} €.`,
            beleg: null,
            schema: [
              { label: "Umsatzsteuer (4800 UST) – Schuld ggü. Finanzamt", wert: ust, einheit: "€" },
              { label: "− Vorsteuer (2600 VORST) – Forderung ggü. Finanzamt", wert: vst, einheit: "€" },
              { label: "= USt-Zahllast (an Finanzamt zu überweisen)", wert: zahllast, einheit: "€", bold: true, trennlinie: true, highlight: false },
              { label: "Buchungssatz: 4800 UST an 2600 VORST + 2800 BK", wert: zahllast, einheit: "€", bold: true },
            ],
            soll: [{ nr: "4800", name: "Umsatzsteuer (UST)", betrag: ust }],
            haben: [{ nr: "2600", name: "Vorsteuer (VORST)", betrag: vst }, { nr: "2800", name: "Bank (BK — Zahllast)", betrag: zahllast }],
            nrPunkte: 3,
            erklaerung: `Zahllast = UST (${fmt(ust)} €) − VORST (${fmt(vst)} €) = ${fmt(zahllast)} €. USt-Konto aufgelöst (4800 Soll). VORST aufgelöst (2600 Haben). Zahllast per Bank (2800 Haben). Merke: USt = Schuld, VORST = Forderung.`,
          };
        },
      },
      {
        id: "8_ust_zahllast", titel: "Überweisung der USt-Zahllast",
        generate: f => {
          const ust = rnd(3000, 12000, 100); const vst = rnd(1000, ust - 500, 100); const zahllast = r2(ust - vst);
          return {
            aufgabe: "Ermitteln Sie rechnerisch die USt-Zahllast und erfassen Sie deren Überweisung an das Finanzamt buchhalterisch.",
            beleg: mkUeberweisung(f, "Finanzamt Ingolstadt", "DE86 7000 0000 0070 0101 00", zahllast, `USt-Voranmeldung ${["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][new Date().getMonth()]} 2025`),
            nebenrechnungen: [{ label: "USt-Zahllast", formel: `${fmt(ust)} € − ${fmt(vst)} €`, ergebnis: `${fmt(zahllast)} €` }],
            soll: [{ nr: "4800", name: "Umsatzsteuer (UST)", betrag: ust }],
            haben: [{ nr: "2600", name: "Vorsteuer (VORST)", betrag: vst }, { nr: "2800", name: "Bank (BK — Zahllast)", betrag: zahllast }],
            nrPunkte: 1, erklaerung: `USt-Konto aufgelöst (4800 UST Soll, ${fmt(ust)} €). VSt-Konto aufgelöst (2600 VORST Haben, ${fmt(vst)} €). Zahllast ${fmt(zahllast)} € an FA überwiesen (2800 BK Haben). Zahllast = USt − VSt.`,
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
        id: "8_gewerbesteuer_berechnung", titel: "Gewerbesteuer berechnen (Freibetrag, Messbetrag, Hebesatz)",
        taskTyp: "rechnung",
        generate: f => {
          const gewinn = rnd(60000, 250000, 5000);
          const freibetrag = 24500;
          const steuermesszahl = 0.035;
          const hebesatz = pick([310, 340, 370, 400, 430, 460]);
          const bmg = Math.max(0, gewinn - freibetrag);
          const messbetrag = r2(bmg * steuermesszahl);
          const gwst = r2(messbetrag * hebesatz / 100);
          return {
            aufgabe: `Berechnen Sie die Gewerbesteuer für ${f.name}. Gewinn laut GUV: ${fmt(gewinn)} €. Hebesatz der Gemeinde ${f.ort}: ${hebesatz} %. Freibetrag: ${fmt(freibetrag)} €, Steuermesszahl: 3,5 %.`,
            beleg: null,
            schema: [
              { label: "Gewinn laut GUV", wert: gewinn, einheit: "€" },
              { label: `− Freibetrag (Einzelunternehmen)`, wert: freibetrag, einheit: "€" },
              { label: "= Bemessungsgrundlage", wert: bmg, einheit: "€", bold: true, trennlinie: true },
              { label: "× Steuermesszahl (3,5 %)", wert: messbetrag, einheit: "€" },
              { label: `× Hebesatz (${hebesatz} %)`, wert: gwst, einheit: "€", bold: true, trennlinie: true },
              { label: "= Gewerbesteuer", wert: gwst, einheit: "€", bold: true, highlight: false },
              { label: "Buchungssatz: 7000 GWST an 2800 BK", wert: gwst, einheit: "€", bold: true },
            ],
            soll: [{ nr: "7000", name: "Gewerbesteuer (GWST)", betrag: gwst }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: gwst }],
            nrPunkte: 4,
            erklaerung: `Berechnung: (${fmt(gewinn)} € − ${fmt(freibetrag)} €) × 3,5 % × ${hebesatz} % = ${fmt(gwst)} €. Gewerbesteuer = Betriebsaufwand (7000 GWST Soll). Kein Vorsteuerabzug! Bank sinkt (2800 BK Haben).`,
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
            nrPunkte: 2, erklaerung: `AK = Kaufpreis + Nebenkosten = ${fmt(ak)} €. Anlage wird zum AK aktiviert (0700 MA Soll). Vorsteuer auf AK (2600 VORST Soll).`,
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
            nrPunkte: 0, erklaerung: "Reparatur = sofortiger Aufwand (6160 FRI Soll). Vorsteuer (2600 VORST Soll). Zahlung per Bank (2800 BK Haben).",
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
            { art: "CNC-Maschine", konto: "0700", nd: 8 },
            { art: "Büromöbel", konto: "0870", nd: 13 },
            { art: "Kopierer", konto: "0860", nd: 7 },
            { art: "Computer/Server", konto: "0860", nd: 3 },
            { art: "LKW", konto: "0840", nd: 9 },
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
            nrPunkte: 2, erklaerung: `Darlehen = volle Kreditsumme ${fmt(kreditsumme)} € (4250 LBKV Haben). Bank überweist nur ${fmt(auszahlung)} € (2800 BK Soll). Disagio = aktiver RAP (2900 Soll).`,
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
            nrPunkte: 1, erklaerung: `Tilgung mindert Schuld (4250 LBKV Soll, ${fmt(tilgung)} €). Zinsaufwand (7510 ZAW Soll, ${fmt(zins)} €). Gesamtabfluss ${fmt(rate)} € (2800 BK Haben).`,
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
            beleg: {
              typ: "ausgangsrechnung", firma: f, kunde,
              rgnr: nr1, datum: fakeDatum(-5), lieferdatum: fakeDatum(-7),
              positionen: [{ pos: 1, beschr: art, menge, einheit: "Stk", ep: r2(netto / menge), netto }],
              netto, ustPct: 19, ustBetrag: ust, brutto,
              zahlungsziel: `Netto 30 Tage, zahlbar bis ${fakeDatum(25)}`,
            },
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
              _optsKey: "ewb",
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
            nrPunkte: 0, erklaerung: "Zweifelhafte Forderungen werden auf ein gesondertes Konto umgebucht (2470 Soll / 2400 FO Haben). Bruttobetrag bleibt.",
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
            nrPunkte: 3, erklaerung: `Teilzahlung (2800 BK Soll, ${fmt(zahlung)} €). Nettoausfall = Verlust (6950 Soll). USt auf Ausfall korrigieren (4800 UST Soll, §17 UStG). Bruttoforderung erlischt (2400 FO Haben, ${fmt(brutto)} €).`,
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
            nrPunkte: 1, erklaerung: `Zahlung wider Erwarten → Ertrag (5495 EFO Haben, Nettobetrag ${fmt(netto)} €). USt nachträglich wieder schulden (4800 UST Haben, ${fmt(ust)} €). Bank steigt (2800 BK Soll, ${fmt(brutto)} €).`,
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
              _optsKey: "ara",
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
              _optsKey: "rst",
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
              _optsKey: "afa",
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
              _optsKey: "ewb",
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
              _optsKey: "guv",
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
              _optsKey: "kennzahlen",
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
            nrPunkte: 2, erklaerung: `Vorauszahlung für das Folgejahr ist kein Aufwand dieses Jahres. ARA aktivieren (2900 Soll). Mietaufwand korrigieren (6700 AWMP Haben).`,
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
      {
        id: "10_ara_bildung", titel: "ARA bilden (Aktive Rechnungsabgrenzung)",
        taskTyp: "rechnung",
        generate: f => {
          const konten = [
            { nr: "6900", name: "Versicherungsbeiträge (VBEI)", art: "Versicherungsprämie" },
            { nr: "6700", name: "Mieten und Pachten (AWMP)", art: "Mietzahlung" },
            { nr: "7510", name: "Zinsaufwendungen (ZAW)", art: "Zinszahlung" },
          ];
          const k = pick(konten);
          const monateBez = pick([6, 9, 12]);
          const monateDJ  = pick([2, 3, 4, 5]);
          const monateNJ  = r2(monateBez - monateDJ);
          const gesamt    = rnd(1200, 9600, 600);
          const perMonat  = r2(gesamt / monateBez);
          const djBetrag  = r2(perMonat * monateDJ);
          const araBetrag = r2(perMonat * monateNJ);
          return {
            aufgabe: `Bilden Sie die Buchungssätze: (1) Zahlung am 01.10. per Bank, (2) Vorabschlussbuchung am 31.12.
${f.name} überweist am 01.10. eine ${k.art} in Höhe von ${fmt(gesamt)} € für ${monateBez} Monate im Voraus.`,
            beleg: null,
            schema: [
              { label: `Gesamtbetrag (${monateBez} Monate)`, wert: gesamt, einheit: "€" },
              { label: `÷ ${monateBez} Monate = pro Monat`, wert: perMonat, einheit: "€/Monat" },
              { label: `× ${monateDJ} Monate (altes Jahr)`, wert: djBetrag, einheit: "€", bold: true },
              { label: `× ${monateNJ} Monate (neues Jahr) → ARA`, wert: araBetrag, einheit: "€", bold: true, trennlinie: true, highlight: true },
            ],
            soll: [{ nr: k.nr, name: k.name, betrag: gesamt }, { nr: "2900", name: "Aktive Rechnungsabgrenzung (ARA)", betrag: araBetrag }],
            haben: [{ nr: "2800", name: "Bank (BK)", betrag: gesamt }, { nr: k.nr, name: k.name, betrag: araBetrag }],
            nrPunkte: 4,
            erklaerung: `ARA: Zahlung im alten Jahr, Aufwand gehört auch ins neue Jahr. (1) ${k.nr} ${fmt(gesamt)} € an 2800 BK. (2) Vorabschluss: 2900 ARA ${fmt(araBetrag)} € an ${k.nr} (Anteil neues Jahr).`,
          };
        },
      },
      {
        id: "10_pra_bildung", titel: "PRA bilden (Passive Rechnungsabgrenzung)",
        taskTyp: "rechnung",
        generate: f => {
          const konten = [
            { nr: "5400", name: "Erträge aus Mieten/Pachten (EMP)", art: "Mieteinnahme" },
            { nr: "5710", name: "Zinserträge (ZE)", art: "Zinsgutschrift" },
          ];
          const k = pick(konten);
          const monateBez = pick([3, 6, 9]);
          const monateDJ  = pick([1, 2]);
          const monateNJ  = r2(monateBez - monateDJ);
          const netto     = rnd(900, 7200, 300);
          const ust       = r2(netto * 0.19);
          const brutto    = r2(netto + ust);
          const perMonat  = r2(netto / monateBez);
          const djBetrag  = r2(perMonat * monateDJ);
          const praBetrag = r2(perMonat * monateNJ);
          const mitUSt    = k.nr === "5400";
          return {
            aufgabe: `Bilden Sie die Buchungssätze: (1) Zahlung am 01.12. per Bank, (2) Vorabschlussbuchung am 31.12.
Ein Mieter überweist am 01.12. die ${k.art} für ${monateBez} Monate im Voraus: ${fmt(mitUSt ? brutto : netto)} € ${mitUSt ? "brutto" : ""}.`,
            beleg: null,
            schema: [
              { label: `Nettobetrag (${monateBez} Monate)`, wert: netto, einheit: "€" },
              { label: `÷ ${monateBez} Monate = pro Monat (netto)`, wert: perMonat, einheit: "€/Monat" },
              { label: `× ${monateDJ} Monat(e) (altes Jahr)`, wert: djBetrag, einheit: "€", bold: true },
              { label: `× ${monateNJ} Monat(e) (neues Jahr) → PRA`, wert: praBetrag, einheit: "€", bold: true, trennlinie: true, highlight: true },
            ],
            soll: mitUSt
              ? [{ nr: "2800", name: "Bank (BK)", betrag: brutto }, { nr: k.nr, name: k.name, betrag: praBetrag }]
              : [{ nr: "2800", name: "Bank (BK)", betrag: netto }, { nr: k.nr, name: k.name, betrag: praBetrag }],
            haben: mitUSt
              ? [{ nr: k.nr, name: k.name, betrag: netto }, { nr: "4800", name: "Umsatzsteuer (UST)", betrag: ust }, { nr: "4900", name: "Passive Rechnungsabgrenzung (PRA)", betrag: praBetrag }]
              : [{ nr: k.nr, name: k.name, betrag: netto }, { nr: "4900", name: "Passive Rechnungsabgrenzung (PRA)", betrag: praBetrag }],
            nrPunkte: 4,
            erklaerung: `PRA: Zahlung im alten Jahr, Ertrag gehört ins neue Jahr. (1) BK an ${k.nr}${mitUSt ? " + UST" : ""}. (2) Vorabschluss: ${k.nr} ${praBetrag} € an 4900 PRA.`,
          };
        },
      },
      {
        id: "10_rst_bildung", titel: "Rückstellung bilden (Kostenvoranschlag)",
        generate: f => {
          const szenarien = [
            { art: "Reparatur einer CNC-Maschine", konto: "6160", kname: "Fremdleistungen/Reparaturen (FRI)", absender: "Maschinenservice GmbH" },
            { art: "Reparatur des Firmen-LKW", konto: "6160", kname: "Fremdleistungen/Reparaturen (FRI)", absender: "Kfz-Werkstatt Müller" },
            { art: "laufender Prozess gegen Lieferant", konto: "6770", kname: "Rechts- und Beratungskosten (RBK)", absender: "Kanzlei Dr. Schmidt" },
          ];
          const sz = pick(szenarien);
          const betrag = rnd(1500, 12000, 500);
          return {
            aufgabe: `Bilden Sie den Buchungssatz zum 31.12. für folgende E-Mail.`,
            beleg: mkEmail(`info@${sz.absender.toLowerCase().replace(/[\s.]/g,"")+".de"}`, sz.absender, f.email,
              `Kostenvoranschlag – ${sz.art}`,
              `Sehr geehrte Damen und Herren,

bezugnehmend auf unser Gespräch teilen wir Ihnen mit, dass wir die Kosten für ${sz.art} auf ca. ${fmt(betrag)} € schätzen.

Da die Reparatur erst im neuen Jahr erfolgen kann, empfehlen wir die Bildung einer Rückstellung.

Mit freundlichen Grüßen
${sz.absender}`),
            soll: [{ nr: sz.konto, name: sz.kname, betrag }],
            haben: [{ nr: "3900", name: "Rückstellungen (RST)", betrag }],
            nrPunkte: 0,
            erklaerung: `Rückstellung für ungewisse Verbindlichkeit. Aufwand (${sz.konto} Soll, Nettobetrag). Rückstellung auf der Passivseite (3900 RST Haben). Keine USt bei Bildung!`,
          };
        },
      },
      {
        id: "10_rst_aufloesung_vollstaendig", titel: "Rückstellung auflösen (4 Fälle)",
        taskTyp: "rechnung",
        generate: f => {
          const rst = rnd(2000, 10000, 500);
          const fall = pick(["gleich", "mehr", "weniger", "entfaellt"]);
          const tat = fall === "gleich" ? rst : fall === "mehr" ? r2(rst + rnd(200,1500,100)) : fall === "weniger" ? r2(rst - rnd(200,1000,100)) : 0;
          const diff = r2(rst - tat);
          const ust  = fall !== "entfaellt" ? r2(tat * 0.19) : 0;
          const label = fall === "gleich" ? "Rückstellung = tatsächliche Kosten" : fall === "mehr" ? "Rückstellung < tatsächliche Kosten (→ PFAW)" : fall === "weniger" ? "Rückstellung > tatsächliche Kosten (→ PFE)" : "Kosten entfallen (→ PFE)";
          const mehrPFAW = r2(tat - rst); // positiv wenn tat > rst
          const sollArr = fall === "mehr"
            ? [{ nr: "3900", name: "Rückstellungen (RST)", betrag: rst }, { nr: "6990", name: "Periodfremder Aufwand (PFAW)", betrag: Math.abs(mehrPFAW) }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: ust }]
            : [{ nr: "3900", name: "Rückstellungen (RST)", betrag: rst }];
          const habenArr = fall === "entfaellt"
            ? [{ nr: "5490", name: "Periodfremder Ertrag (PFE)", betrag: rst }]
            : fall === "weniger"
            ? [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: r2(tat + ust) }, { nr: "5490", name: "Periodfremder Ertrag (PFE)", betrag: Math.abs(diff) }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: ust }]
            : [{ nr: "4400", name: "Verbindlichkeiten aus L+L (VE)", betrag: r2(tat + ust) }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: ust }];
          return {
            aufgabe: `Eine Rückstellung (3900 RST) von ${fmt(rst)} € wird aufgelöst. ${label}. ${fall !== "entfaellt" ? `Tatsächliche Reparaturkosten: ${fmt(tat)} € netto (Rechnung liegt vor).` : "Die Reparatur entfällt (Kostenlosleistung des Lieferanten)."}`,
            beleg: null,
            schema: [
              { label: "Rückstellung (RST) Vorjahr", wert: rst, einheit: "€" },
              { label: fall !== "entfaellt" ? "Tatsächliche Kosten netto" : "Tatsächliche Kosten (entfällt)", wert: tat, einheit: "€" },
              { label: `Differenz → ${fall === "mehr" ? "Periodenfremder Aufwand (PFAW)" : "Periodenfremder Ertrag (PFE)"}`, wert: Math.abs(diff), einheit: "€", bold: true, trennlinie: true, highlight: diff > 0 },
            ],
            soll: sollArr,
            haben: habenArr,
            nrPunkte: fall === "gleich" ? 2 : 3,
            erklaerung: `Fall: ${label}. RST wird immer aufgelöst (Soll). ${fall === "entfaellt" ? "Keine Kosten → PFE." : fall === "gleich" ? "Kosten decken sich genau." : fall === "mehr" ? `Mehrkosten ${fmt(r2(tat-rst))} € → PFAW.` : `Einsparung ${fmt(diff)} € → PFE.`} USt erst bei Auflösung!`,
          };
        },
      },
      {
        id: "10_ara_pra_unterschied", titel: "ARA vs. PRA – Unterschied erläutern",
        taskTyp: "theorie", themenTyp: "zuordnung",
        generate: () => ({
          aufgabe: "Ordnen Sie die Merkmale der aktiven bzw. passiven Rechnungsabgrenzung zu.",
          zuordnung: { paare: [
            { term: "Aktive Rechnungsabgrenzung (ARA)", def: "Zahlung im alten Jahr, Aufwand gehört ins neue Jahr" },
            { term: "Passive Rechnungsabgrenzung (PRA)", def: "Zahlung im alten Jahr, Ertrag gehört ins neue Jahr" },
            { term: "2900 ARA", def: "Aktivkonto – steht auf der Aktivseite der Bilanz" },
            { term: "4900 PRA", def: "Passivkonto – steht auf der Passivseite der Bilanz" },
            { term: "Auflösung am 01.01.", def: "Umbuchung in das jeweilige Aufwands- oder Ertragskonto" },
            { term: "Keine USt-Buchung", def: "Abgrenzung erfolgt immer mit Nettobetrag" },
          ]}, nrPunkte: 6,
        }),
      },
    ],
    "LB 2 · Kennzahlen & Bilanzanalyse": [
      {
        id: "10_ara_buchungskette", titel: "ARA – vollständige Buchungskette (3 Buchungen)",
        taskTyp: "komplex",
        generate: (f, opts = {}) => {
          const konto = pick([
            { nr: "6900", name: "Versicherungsbeiträge (VBEI)", art: "Versicherungsprämie" },
            { nr: "6700", name: "Mieten und Pachten (AWMP)", art: "Mietzahlung" },
          ]);
          const monateBez = pick([6, 9, 12]);
          const startMonat = pick([8, 9, 10, 11]);
          const monateAltJ = 12 - startMonat + 1;
          const monateNeuJ = monateBez - monateAltJ;
          const netto = rnd(1200, 9600, 600);
          const vorst = r2(netto * 0.19);
          const brutto = r2(netto + vorst);
          const perMonat = r2(netto / monateBez);
          const djBetrag = r2(perMonat * monateAltJ);
          const araBetrag = r2(perMonat * monateNeuJ);
          const datum1 = `01.${startMonat < 10 ? "0" + startMonat : startMonat}.`;
          return {
            vorspann: `Als Mitarbeiterin bzw. Mitarbeiter von ${f.name} bearbeiten Sie folgende Jahresabschlussaufgabe.`,
            schritte: [
              {
                nr: 1, titel: "Buchung bei Zahlung", typ: "buchung", punkte: 4,
                aufgabe: `${f.name} überweist am ${datum1} die ${konto.art} in Höhe von ${fmt(brutto)} € brutto für ${monateBez} Monate ab ${datum1}. Bilden Sie den Buchungssatz.`,
                beleg: null,
                soll: [{ nr: konto.nr, name: konto.name, betrag: netto }, { nr: "2600", name: "Vorsteuer (VORST)", betrag: vorst }],
                haben: [{ nr: "2800", name: "Bank (BK)", betrag: brutto }],
                nrPunkte: 0,
                erklaerung: `Zahlung brutto: ${konto.nr} ${fmt(netto)} + VORST ${fmt(vorst)} an BK ${fmt(brutto)}.`,
              },
              {
                nr: 2, titel: "Vorabschlussbuchung 31.12.", typ: "buchung", punkte: 2,
                aufgabe: `Buchen Sie die Vorabschlussbuchung zum 31.12. (Anteil neues Jahr: ${monateNeuJ} Monate = ${fmt(araBetrag)} €).`,
                beleg: null,
                soll: [{ nr: "2900", name: "Aktive Rechnungsabgrenzung (ARA)", betrag: araBetrag }],
                haben: [{ nr: konto.nr, name: konto.name, betrag: araBetrag }],
                nrPunkte: 2,
                erklaerung: `ARA = Anteil neues Jahr: ${monateNeuJ} × ${fmt(perMonat)} = ${fmt(araBetrag)} €. 2900 ARA an ${konto.nr}.`,
              },
              {
                nr: 3, titel: "Auflösung am 01.01.", typ: "buchung", punkte: 2,
                aufgabe: `Buchen Sie die Auflösung der ARA zu Beginn des neuen Jahres (01.01.).`,
                beleg: null,
                soll: [{ nr: konto.nr, name: konto.name, betrag: araBetrag }],
                haben: [{ nr: "2900", name: "Aktive Rechnungsabgrenzung (ARA)", betrag: araBetrag }],
                nrPunkte: 0,
                erklaerung: `Umbuchung am 01.01.: ${konto.nr} an 2900 ARA ${fmt(araBetrag)} €. ARA-Konto auf 0.`,
              },
            ],
          };
        },
      },
      {
        id: "10_zeitstrahl_ara_pra", titel: "Zeitstrahl: Beträge auf Geschäftsjahre aufteilen",
        taskTyp: "rechnung",
        generate: f => {
          const typ = pick(["ara", "pra"]);
          const konten = typ === "ara"
            ? [{ nr: "6900", name: "VBEI", art: "KFZ-Versicherung" }, { nr: "6700", name: "AWMP", art: "Mietzahlung" }]
            : [{ nr: "5400", name: "EMP", art: "Mieteinnahme" }, { nr: "5710", name: "ZE", art: "Zinsgutschrift" }];
          const k = pick(konten);
          const startMonat = pick([8, 9, 10, 11]);
          const monateBez = pick([3, 6, 9, 12]);
          const monateAlt = 12 - startMonat + 1;
          const monateNeu = monateBez - monateAlt;
          const gesamt = r2(rnd(1200, 9600, 300));
          const perMonat = r2(gesamt / monateBez);
          const altBetrag = r2(perMonat * monateAlt);
          const neuBetrag = r2(perMonat * monateNeu);
          return {
            aufgabe: `Teilen Sie die Zahlung auf die Geschäftsjahre auf. ${typ === "ara" ? `${f.name} überweist am 01.${startMonat < 10 ? "0"+startMonat : startMonat}. eine ${k.art} von ${fmt(gesamt)} € für ${monateBez} Monate im Voraus.` : `Ein Mieter überweist am 01.${startMonat < 10 ? "0"+startMonat : startMonat}. ${fmt(gesamt)} € für ${monateBez} Monate Miete im Voraus.`}`,
            beleg: null,
            schema: [
              { label: `Gesamtbetrag (${monateBez} Monate)`, wert: gesamt, einheit: "€" },
              { label: `÷ ${monateBez} Monate = Betrag pro Monat`, wert: perMonat, einheit: "€/Monat" },
              { label: `× ${monateAlt} Monate im alten Jahr (→ lfd. GuV)`, wert: altBetrag, einheit: "€", bold: true },
              { label: `× ${monateNeu} Monate im neuen Jahr (→ ${typ === "ara" ? "2900 ARA" : "4900 PRA"})`, wert: neuBetrag, einheit: "€", bold: true, trennlinie: true, highlight: true },
              { label: `Art der Abgrenzung: ${typ === "ara" ? "Aktive Rechnungsabgrenzung (ARA)" : "Passive Rechnungsabgrenzung (PRA)"}`, wert: null, einheit: "" },
            ],
            nrPunkte: 3,
            erklaerung: `${fmt(gesamt)} € ÷ ${monateBez} = ${fmt(perMonat)} €/Monat. Anteil altes Jahr: ${monateAlt} × ${fmt(perMonat)} = ${fmt(altBetrag)} €. Anteil neues Jahr: ${monateNeu} × ${fmt(perMonat)} = ${fmt(neuBetrag)} €. → ${typ.toUpperCase()} bilden.`,
          };
        },
      },
      {
        id: "10_aufbereitete_bilanz", titel: "Aufbereitete Bilanz erstellen",
        taskTyp: "rechnung",
        generate: f => {
          const gr = rnd(200000, 500000, 10000);
          const bvg = rnd(300000, 800000, 10000);
          const ma = rnd(400000, 1200000, 10000);
          const fp = rnd(100000, 300000, 10000);
          const bga = rnd(20000, 80000, 5000);
          const wp = rnd(50000, 200000, 5000);
          const av = r2(gr+bvg+ma+fp+bga+wp);
          const r = rnd(50000, 150000, 5000);
          const fo = rnd(100000, 400000, 10000);
          const ewb = rnd(5000, 20000, 1000);
          const vorst = rnd(10000, 30000, 1000);
          const ara = rnd(2000, 10000, 500);
          const foNetto = r2(fo - ewb + vorst + ara);
          const bk = rnd(30000, 100000, 5000);
          const ka = rnd(5000, 20000, 1000);
          const fm = rnd(20000, 80000, 5000);
          const uv = r2(r + foNetto + bk + ka + fm);
          const gv = r2(av + uv);
          const ek = rnd(200000, 600000, 10000);
          const lbkv = rnd(100000, 400000, 10000);
          const kbkv = rnd(50000, 150000, 5000);
          const ve = rnd(30000, 120000, 5000);
          const ust = rnd(5000, 25000, 1000);
          const rst = rnd(10000, 40000, 2000);
          const pra = rnd(1000, 8000, 500);
          const gk = r2(ek + lbkv + kbkv + ve + ust + rst + pra);
          return {
            aufgabe: `Erstellen Sie die aufbereitete Bilanz für ${f.name} aus den folgenden Kontenwerten.`,
            beleg: null,
            schema: [
              { label: "A. Anlagevermögen", wert: av, einheit: "€", bold: true },
              { label: "   GR+BVG+MA+FP+BGA+WP", wert: av, einheit: "€" },
              { label: "B. Umlaufvermögen – Vorräte (R)", wert: r2(r+fm), einheit: "€" },
              { label: "   Forderungen (FO−EWB+VORST+ARA)", wert: foNetto, einheit: "€" },
              { label: "   Flüssige Mittel (BK+KA)", wert: r2(bk+ka), einheit: "€" },
              { label: "= Gesamtvermögen", wert: gv, einheit: "€", bold: true, trennlinie: true },
              { label: "A. Eigenkapital (EK)", wert: ek, einheit: "€", bold: true },
              { label: "B. Langfr. Fremdkapital (LBKV)", wert: lbkv, einheit: "€" },
              { label: "   Kurzfr. Fremdkapital (KBKV+VE+UST+RST+PRA)", wert: r2(kbkv+ve+ust+rst+pra), einheit: "€" },
              { label: "= Gesamtkapital", wert: gk, einheit: "€", bold: true },
            ],
            nrPunkte: 6,
            erklaerung: `Aufbereitete Bilanz: Anlagevermögen (alle AV-Konten), Forderungen (FO − EWB − PWB + VORST + ARA), Vorräte (R+F+H+B), Flüssige Mittel (BK+KA). Kurzfr. FK = KBKV+VE+UST+VFA+VSV+RST+PRA.`,
          };
        },
      },
      {
        id: "10_kennzahlen_alle", titel: "Alle Kennzahlen berechnen und beurteilen",
        taskTyp: "rechnung",
        generate: f => {
          const av = rnd(1000000, 4000000, 50000);
          const ek = rnd(500000, 2000000, 50000);
          const lbkv = rnd(300000, 1500000, 50000);
          const kfFk = rnd(200000, 800000, 25000);
          const gk = r2(ek + lbkv + kfFk);
          const fo = rnd(100000, 500000, 25000);
          const flm = rnd(30000, 200000, 10000);
          const gewinn = rnd(20000, 200000, 5000);
          const ekQuote = r2(ek / gk * 100);
          const barLiq = r2(flm / kfFk * 100);
          const einzugLiq = r2((flm + fo) / kfFk * 100);
          const anlDeck1 = r2(ek / av * 100);
          const anlDeck2 = r2((ek + lbkv) / av * 100);
          const ekRent = r2(gewinn / ek * 100);
          return {
            aufgabe: `Berechnen Sie alle Kennzahlen für ${f.name}. AV: ${fmt(av)} €, EK: ${fmt(ek)} €, langfr. FK: ${fmt(lbkv)} €, kurzfr. FK: ${fmt(kfFk)} €, Forderungen: ${fmt(fo)} €, Flüssige Mittel: ${fmt(flm)} €, Jahresgewinn: ${fmt(gewinn)} €.`,
            beleg: null,
            schema: [
              { label: `Gesamtkapital = ${fmt(ek)} + ${fmt(lbkv)} + ${fmt(kfFk)}`, wert: gk, einheit: "€" },
              { label: "EK-Quote (EK ÷ GK × 100)", wert: ekQuote, einheit: "%", bold: true, highlight: ekQuote >= 30 },
              { label: "Barliquidität (Flm ÷ kurzfr.FK × 100)", wert: barLiq, einheit: "%", bold: true, highlight: barLiq >= 10 && barLiq <= 30 },
              { label: "Einzugsliquidität ((Flm+FO) ÷ kurzfr.FK × 100)", wert: einzugLiq, einheit: "%", bold: true, highlight: einzugLiq >= 100 },
              { label: "Anlagendeckung I (EK ÷ AV × 100)", wert: anlDeck1, einheit: "%", bold: true, highlight: anlDeck1 >= 70 },
              { label: "Anlagendeckung II ((EK+lfr.FK) ÷ AV × 100)", wert: anlDeck2, einheit: "%", bold: true, highlight: anlDeck2 >= 100 },
              { label: "EK-Rentabilität (Gewinn ÷ EK × 100)", wert: ekRent, einheit: "%", bold: true, highlight: ekRent >= 5 },
            ],
            nrPunkte: 7,
            erklaerung: `Zielwerte: EK-Quote ≥ 30%, Barliquidität 10–30%, Einzugsliquidität 100–120%, Anlagendeckung I 70–100%, Anlagendeckung II > 100%.`,
          };
        },
      },
      {
        id: "10_ek_rentabilitaet", titel: "EK-Rentabilität mit Privatkonto berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const ekEnde = rnd(300000, 900000, 10000);
          const entnahmen = rnd(20000, 80000, 5000);
          const einlagen = rnd(0, 30000, 5000);
          const gewinn = rnd(30000, 150000, 5000);
          const ekAnfang = r2(ekEnde - gewinn + entnahmen - einlagen);
          const rent = r2(gewinn / ekAnfang * 100);
          return {
            aufgabe: `Ermitteln Sie das EK-Anfangsbestand und berechnen Sie die EK-Rentabilität für ${f.name}. EK 31.12.: ${fmt(ekEnde)} €, Privatentnahmen: ${fmt(entnahmen)} €, Privateinlagen: ${fmt(einlagen)} €, Jahresgewinn: ${fmt(gewinn)} €.`,
            beleg: null,
            schema: [
              { label: "EK-Schlussbestand (31.12.)", wert: ekEnde, einheit: "€" },
              { label: "− Jahresgewinn (+ Verlust)", wert: gewinn, einheit: "€" },
              { label: "+ Privatentnahmen", wert: entnahmen, einheit: "€" },
              { label: `− Privateinlagen`, wert: einlagen, einheit: "€" },
              { label: "= EK-Anfangsbestand (01.01.)", wert: ekAnfang, einheit: "€", bold: true, trennlinie: true },
              { label: "EK-Rentabilität = Gewinn ÷ EK-Anfang × 100", wert: rent, einheit: "%", bold: true, highlight: rent >= 5 },
            ],
            nrPunkte: 4,
            erklaerung: `EK-Anfang = EK-Ende − Gewinn + Entnahmen − Einlagen = ${fmt(ekAnfang)} €. EK-Rent. = ${fmt(gewinn)} ÷ ${fmt(ekAnfang)} × 100 = ${fmt(rent)} %. Sollte über Kapitalmarktzins liegen!`,
          };
        },
      },
      {
        id: "10_privatkonto", titel: "Privatkonto abschließen (3001 P)",
        taskTyp: "rechnung",
        generate: f => {
          const entnahmen = rnd(25000, 90000, 2500);
          const einlagen = rnd(0, 40000, 2500);
          const saldo = r2(entnahmen - einlagen);
          const istGewinn = saldo > 0;
          return {
            aufgabe: `Bilden Sie den Buchungssatz für den Abschluss des Privatkontos (3001 P) von ${f.name}. Privatentnahmen (Soll): ${fmt(entnahmen)} €, Privateinlagen (Haben): ${fmt(einlagen)} €.`,
            beleg: null,
            schema: [
              { label: "Privatentnahmen (Soll)", wert: entnahmen, einheit: "€" },
              { label: "− Privateinlagen (Haben)", wert: einlagen, einheit: "€" },
              { label: `= Saldo (${istGewinn ? "Privatentnahmen überwiegen → EK sinkt" : "Privateinlagen überwiegen → EK steigt"})`, wert: Math.abs(saldo), einheit: "€", bold: true, trennlinie: true },
              { label: `Buchung: ${istGewinn ? "3000 EK an 3001 P" : "3001 P an 3000 EK"}`, wert: Math.abs(saldo), einheit: "€", bold: true },
            ],
            soll: istGewinn ? [{ nr: "3000", name: "Eigenkapital (EK)", betrag: Math.abs(saldo) }] : [{ nr: "3001", name: "Privatkonto (P)", betrag: Math.abs(saldo) }],
            haben: istGewinn ? [{ nr: "3001", name: "Privatkonto (P)", betrag: Math.abs(saldo) }] : [{ nr: "3000", name: "Eigenkapital (EK)", betrag: Math.abs(saldo) }],
            nrPunkte: 2,
            erklaerung: `Privatkonto schließt auf EK. ${istGewinn ? `Entnahmen (${fmt(entnahmen)}) > Einlagen (${fmt(einlagen)}) → EK sinkt: 3000 EK an 3001 P.` : `Einlagen (${fmt(einlagen)}) > Entnahmen (${fmt(entnahmen)}) → EK steigt: 3001 P an 3000 EK.`}`,
          };
        },
      },
      {
        id: "10_vergleich_intern_extern", titel: "Interner vs. externer Vergleich beurteilen",
        taskTyp: "theorie", themenTyp: "freitext",
        generate: f => {
          const kennzahl = pick(["Eigenkapitalquote", "Einzugsliquidität", "Anlagendeckung II", "EK-Rentabilität"]);
          const vorjahr = r2(30 + Math.random() * 40);
          const aktuell = r2(vorjahr + (Math.random() > 0.5 ? 5 : -8));
          const branche = r2(35 + Math.random() * 20);
          return {
            aufgabe: `${f.name} verzeichnet bei der Kennzahl ${kennzahl} folgende Werte: Vorjahr ${fmt(vorjahr)} %, aktuelles Jahr ${fmt(aktuell)} %, Branchendurchschnitt ${fmt(branche)} %. Führen Sie einen internen und einen externen Vergleich durch und beurteilen Sie die Entwicklung.`,
            freitext: { zeilen: 6,
              loesung: `Interner Vergleich (Zeitvergleich): Die ${kennzahl} hat sich von ${fmt(vorjahr)} % auf ${fmt(aktuell)} % ${aktuell > vorjahr ? "verbessert" : "verschlechtert"} (${aktuell > vorjahr ? "+" : "−"}${fmt(Math.abs(aktuell-vorjahr))} %). Das Unternehmen entwickelt sich ${aktuell > vorjahr ? "positiv" : "negativ"}.

Externer Vergleich (Branchenvergleich): Mit ${fmt(aktuell)} % liegt ${f.name} ${aktuell >= branche ? "über" : "unter"} dem Branchendurchschnitt von ${fmt(branche)} %. Die Unternehmensposition ist damit im Branchenvergleich ${aktuell >= branche ? "gut" : "unterdurchschnittlich"}.`,
            }, nrPunkte: 4,
          };
        },
      },
      {
        id: "10_aufbereitete_guv", titel: "Aufbereitete GUV – Posten zuordnen und berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const uefe = rnd(1000000, 4000000, 50000);
          const asbe = rnd(10000, 60000, 5000);
          const eawp = rnd(5000, 30000, 2000);
          const ze = rnd(3000, 20000, 1000);
          const ertraege = r2(uefe + asbe + eawp + ze);
          const awr = rnd(300000, 1200000, 25000);
          const lg = rnd(150000, 600000, 10000);
          const agasv = rnd(30000, 120000, 5000);
          const absa = rnd(20000, 100000, 5000);
          const sba = rnd(30000, 150000, 5000);
          const gwst = rnd(5000, 30000, 2000);
          const zaw = rnd(5000, 40000, 2000);
          const aufwendungen = r2(awr + lg + agasv + absa + sba + gwst + zaw);
          const gewinn = r2(ertraege - aufwendungen);
          return {
            aufgabe: `Vervollständigen Sie die aufbereitete GUV von ${f.name} und ermitteln Sie den Jahresüberschuss/-fehlbetrag.`,
            beleg: null,
            schema: [
              { label: "AUFWENDUNGEN (Soll)", wert: null, einheit: "" },
              { label: "Materialaufwand (AWR+AWF+AWH+AWB)", wert: awr, einheit: "€" },
              { label: "Personalaufwand (LG+AGASV)", wert: r2(lg+agasv), einheit: "€" },
              { label: "Abschreibungen auf AV", wert: absa, einheit: "€" },
              { label: "Sonstige betr. Aufwendungen", wert: sba, einheit: "€" },
              { label: "Betriebliche Steuern (GWST+GRST+KFZST)", wert: gwst, einheit: "€" },
              { label: "Zinsen (ZAW)", wert: zaw, einheit: "€" },
              { label: "Summe Aufwendungen", wert: aufwendungen, einheit: "€", bold: true, trennlinie: true },
              { label: "ERTRÄGE (Haben)", wert: null, einheit: "" },
              { label: "Umsatzerlöse (UEFE)", wert: uefe, einheit: "€" },
              { label: "Sonst. betr. Erträge (ASBE)", wert: asbe, einheit: "€" },
              { label: "Erträge aus Wertpapieren (EAWP)", wert: eawp, einheit: "€" },
              { label: "Zinsen und ähnliche Erträge (ZE)", wert: ze, einheit: "€" },
              { label: "Summe Erträge", wert: ertraege, einheit: "€", bold: true, trennlinie: true },
              { label: gewinn >= 0 ? "Jahresüberschuss (Gewinn)" : "Jahresfehlbetrag (Verlust)", wert: Math.abs(gewinn), einheit: "€", bold: true, highlight: gewinn >= 0 },
            ],
            nrPunkte: 5,
            erklaerung: `Aufbereitete GUV fasst einzelne Konten zusammen. Buchungssatz Abschluss: 8020 GUV an 3000 EK ${fmt(Math.abs(gewinn))} € (Gewinn) bzw. 3000 EK an 8020 GUV (Verlust).`,
          };
        },
      },
      {
        id: "10_liquiditaet_berechnen", titel: "Bar- und Einzugsliquidität berechnen & beurteilen",
        taskTyp: "rechnung",
        generate: f => {
          const flm = rnd(20000, 150000, 5000);
          const fo = rnd(50000, 300000, 10000);
          const kfFk = rnd(80000, 400000, 10000);
          const barLiq = r2(flm / kfFk * 100);
          const einzugLiq = r2((flm + fo) / kfFk * 100);
          const barOK = barLiq >= 10 && barLiq <= 30;
          const einzugOK = einzugLiq >= 100 && einzugLiq <= 120;
          return {
            aufgabe: `Berechnen und beurteilen Sie die Liquiditätskennzahlen für ${f.name}. Flüssige Mittel: ${fmt(flm)} €, Forderungen: ${fmt(fo)} €, kurzfristiges Fremdkapital: ${fmt(kfFk)} €.`,
            beleg: null,
            schema: [
              { label: "Barliquidität = (Flüssige Mittel ÷ kurzfr. FK) × 100", wert: barLiq, einheit: "%", bold: true, highlight: barOK },
              { label: `Zielwert: 10 % – 30 % → ${barOK ? "✓ im Zielbereich" : barLiq < 10 ? "⚠ zu niedrig" : "⚠ zu hoch (gebundenes Kapital)"}`, wert: null, einheit: "" },
              { label: "Einzugsliquidität = ((Flm + FO) ÷ kurzfr. FK) × 100", wert: einzugLiq, einheit: "%", bold: true, highlight: einzugOK },
              { label: `Zielwert: 100 % – 120 % → ${einzugOK ? "✓ im Zielbereich" : einzugLiq < 100 ? "⚠ Zahlungsschwierigkeiten möglich" : "⚠ zu hohe Liquidität"}`, wert: null, einheit: "" },
            ],
            nrPunkte: 4,
            erklaerung: `Barliquidität: nur Flüssige Mittel vs. kurzfr. FK. Einzugsliquidität: Flüssige Mittel + Forderungen vs. kurzfr. FK. Zielwerte unbedingt nennen und Wert beurteilen!`,
          };
        },
      },
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
        id: "10_bab_zuschlagsaetze", titel: "BAB – Zuschlagsätze berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const fm = rnd(50000, 200000, 5000);
          const fl = rnd(80000, 300000, 5000);
          const mgk = rnd(5000, 30000, 1000);
          const fgk = rnd(30000, 150000, 5000);
          const hkde = r2(fm + mgk + fl + fgk);
          const vwgk = rnd(5000, 40000, 2000);
          const vtgk = rnd(8000, 50000, 2000);
          const hkdu = r2(hkde + rnd(-5000, 5000, 500));
          const mgkPct = r2(mgk / fm * 100);
          const fgkPct = r2(fgk / fl * 100);
          const vwPct = r2(vwgk / hkdu * 100);
          const vtPct = r2(vtgk / hkdu * 100);
          return {
            aufgabe: `Ermitteln Sie alle Gemeinkostenzuschlagsätze für ${f.name}. Fertigungsmaterial (FM): ${fmt(fm)} €, Fertigungslöhne (FL): ${fmt(fl)} €, MGK: ${fmt(mgk)} €, FGK: ${fmt(fgk)} €, HKdU: ${fmt(hkdu)} €, VwGK: ${fmt(vwgk)} €, VtGK: ${fmt(vtgk)} €.`,
            beleg: null,
            schema: [
              { label: "MGK-Zuschlagsatz = MGK ÷ FM × 100", wert: mgkPct, einheit: "%", bold: true },
              { label: "FGK-Zuschlagsatz = FGK ÷ FL × 100", wert: fgkPct, einheit: "%", bold: true },
              { label: "VwGK-Zuschlagsatz = VwGK ÷ HKdU × 100", wert: vwPct, einheit: "%", bold: true },
              { label: "VtGK-Zuschlagsatz = VtGK ÷ HKdU × 100", wert: vtPct, einheit: "%", bold: true },
              { label: "Gemeinsamer Vw/VtGK-Zuschlagsatz", wert: r2((vwgk+vtgk)/hkdu*100), einheit: "%", bold: true, trennlinie: true },
            ],
            nrPunkte: 5,
            erklaerung: `MGK beziehen sich auf FM, FGK auf FL, VwGK und VtGK auf HKdU (oder HKdE wenn keine Bestandsveränderung).`,
          };
        },
      },
      {
        id: "10_kalkulation_mit_bestand", titel: "Kalkulation mit Bestandsveränderung FE",
        taskTyp: "rechnung",
        generate: f => {
          const fm = rnd(1000, 5000, 100);
          const fl = rnd(1500, 6000, 100);
          const mgkPct = pick([8, 10, 12, 15]);
          const fgkPct = pick([80, 100, 120, 150]);
          const vwvtPct = pick([8, 10, 12, 15]);
          const mgk = r2(fm * mgkPct / 100);
          const fgk = r2(fl * fgkPct / 100);
          const mk = r2(fm + mgk);
          const fk = r2(fl + fgk);
          const hkde = r2(mk + fk);
          const bestandAenderung = pick(["minderung", "erhoehung"]);
          const bestandBetrag = rnd(200, 1500, 100);
          const hkdu = bestandAenderung === "minderung" ? r2(hkde + bestandBetrag) : r2(hkde - bestandBetrag);
          const vwvtk = r2(hkdu * vwvtPct / 100);
          const sk = r2(hkdu + vwvtk);
          const gwPct = pick([15, 20, 25]);
          const gw = r2(sk * gwPct / 100);
          const ap = r2(sk + gw);
          return {
            aufgabe: `Berechnen Sie Selbstkosten und Angebotspreis für ${pick(f.fertigerzeugnisse)}. FM: ${fmt(fm)} €, FL: ${fmt(fl)} €, MGK: ${mgkPct} %, FGK: ${fgkPct} %, Vw/VtGK: ${vwvtPct} %, Bestands${bestandAenderung === "minderung" ? "minderung" : "erhöhung"} FE: ${fmt(bestandBetrag)} €, Gewinn: ${gwPct} %.`,
            beleg: null,
            schema: [
              { label: "Fertigungsmaterial (FM)", wert: fm, einheit: "€" },
              { label: `+ MGK (${mgkPct} %)`, wert: mgk, einheit: "€" },
              { label: "= Materialkosten (MK)", wert: mk, einheit: "€", bold: true },
              { label: "+ Fertigungslöhne (FL)", wert: fl, einheit: "€" },
              { label: `+ FGK (${fgkPct} %)`, wert: fgk, einheit: "€" },
              { label: "= Fertigungskosten (FK)", wert: fk, einheit: "€", bold: true },
              { label: "= Herstellkosten der Erzeugung (HKdE)", wert: hkde, einheit: "€", bold: true, trennlinie: true },
              { label: bestandAenderung === "minderung" ? "+ Bestandsminderung FE" : "− Bestandserhöhung FE", wert: bestandBetrag, einheit: "€" },
              { label: "= Herstellkosten des Umsatzes (HKdU)", wert: hkdu, einheit: "€", bold: true },
              { label: `+ Vw/VtGK (${vwvtPct} % auf HKdU)`, wert: vwvtk, einheit: "€" },
              { label: "= Selbstkosten (SK)", wert: sk, einheit: "€", bold: true, trennlinie: true },
              { label: `+ Gewinn (${gwPct} %)`, wert: gw, einheit: "€" },
              { label: "= Angebotspreis (ListenVP)", wert: ap, einheit: "€", bold: true, highlight: true },
            ],
            nrPunkte: 7,
            erklaerung: `${bestandAenderung === "minderung" ? "Bestandsminderung: mehr verkauft als produziert → HKdU = HKdE + Minderung." : "Bestandserhöhung: weniger verkauft als produziert → HKdU = HKdE − Erhöhung."} VwGK/VtGK auf HKdU beziehen!`,
          };
        },
      },
      {
        id: "10_kosten_leistungen", titel: "Kosten vs. Leistungen vs. neutral – zuordnen",
        taskTyp: "theorie", themenTyp: "zuordnung",
        generate: () => ({
          aufgabe: "Ordnen Sie die Konten/Vorgänge den Begriffen Kosten, Leistungen, neutrale Aufwendungen oder neutrale Erträge zu.",
          zuordnung: { paare: [
            { term: "5000 UEFE (Umsatzerlöse FE)", def: "Leistungen – betriebsbezogener Ertrag" },
            { term: "6950 ABFO (Abschreibung Forderungen)", def: "Neutrale Aufwendungen – betriebsfremd" },
            { term: "6000 AWR (Aufwendungen Rohstoffe)", def: "Kosten – betriebsbezogener Aufwand" },
            { term: "5490 PFE (Periodenfremder Ertrag)", def: "Neutrale Erträge – periodenfremd" },
            { term: "5400 EMP (Erträge aus Miete/Pacht)", def: "Neutrale Erträge – betriebsfremd" },
            { term: "7460 VAWP (Verluste aus Wertpapieren)", def: "Neutrale Aufwendungen – betriebsfremd" },
          ]}, nrPunkte: 6,
        }),
      },
      {
        id: "10_betriebsergebnis_ermittlung", titel: "Betriebsergebnis aus GUV ermitteln",
        taskTyp: "rechnung",
        generate: f => {
          const aufwGes = rnd(800000, 3000000, 50000);
          const ertrGes = r2(aufwGes + rnd(50000, 300000, 10000));
          const neutAufw = rnd(10000, 60000, 5000); // ABFO, PFAW, VAWP
          const neutErtr = rnd(5000, 40000, 5000); // EMP, PFE, ZE, EAWP
          const bilmAbs = rnd(20000, 80000, 5000);
          const kalkAbs = r2(bilmAbs + rnd(5000, 20000, 2000)); // höher als bilm.
          const kalkUl = rnd(30000, 80000, 5000);
          const kosten = r2(aufwGes - neutAufw - bilmAbs + kalkAbs + kalkUl);
          const leistungen = r2(ertrGes - neutErtr);
          const be = r2(leistungen - kosten);
          const neutrErg = r2(neutErtr - neutAufw);
          const gesErg = r2(ertrGes - aufwGes);
          return {
            aufgabe: `Ermitteln Sie das Betriebsergebnis für ${f.name}. Gesamtaufwand: ${fmt(aufwGes)} €, Gesamtertrag: ${fmt(ertrGes)} €, neutrale Aufwendungen: ${fmt(neutAufw)} €, neutrale Erträge: ${fmt(neutErtr)} €, bilanzmäßige AfA: ${fmt(bilmAbs)} €, kalk. AfA: ${fmt(kalkAbs)} €, kalk. Unternehmerlohn: ${fmt(kalkUl)} €.`,
            beleg: null,
            schema: [
              { label: "Aufwendungen gesamt", wert: aufwGes, einheit: "€" },
              { label: "− neutrale Aufwendungen", wert: neutAufw, einheit: "€" },
              { label: "− bilanzmäßige AfA", wert: bilmAbs, einheit: "€" },
              { label: "+ kalkulatorische AfA", wert: kalkAbs, einheit: "€" },
              { label: "+ kalkulatorischer Unternehmerlohn", wert: kalkUl, einheit: "€" },
              { label: "= Kosten", wert: kosten, einheit: "€", bold: true, trennlinie: true },
              { label: "Erträge gesamt", wert: ertrGes, einheit: "€" },
              { label: "− neutrale Erträge", wert: neutErtr, einheit: "€" },
              { label: "= Leistungen", wert: leistungen, einheit: "€", bold: true, trennlinie: true },
              { label: "Betriebsergebnis (Leistungen − Kosten)", wert: be, einheit: "€", bold: true, highlight: be >= 0 },
            ],
            nrPunkte: 5,
            erklaerung: `Betriebsergebnis = Leistungen − Kosten = ${fmt(leistungen)} − ${fmt(kosten)} = ${fmt(be)} €. Kalk. AfA (Anderskosten) ersetzt bilanzmäßige AfA. Kalk. UL (Zusatzkosten) hat keine GUV-Buchung.`,
          };
        },
      },
      {
        id: "10_kalkulation_vollstaendig", titel: "Vollständige Kalkulation bis Bruttopreis",
        taskTyp: "rechnung",
        generate: f => {
          const fm = rnd(50, 300, 10); const fl = rnd(80, 400, 10);
          const mgkPct = pick([8, 10, 12, 15]);
          const fgkPct = pick([80, 100, 120, 150]);
          const vwvtPct = pick([8, 10, 12, 15]);
          const gwPct = pick([15, 20, 25, 30]);
          const rabattPct = pick([10, 15, 20]);
          const skontoPct = pick([2, 3]);
          const mgk = r2(fm * mgkPct / 100);
          const fgk = r2(fl * fgkPct / 100);
          const mk = r2(fm + mgk); const fk = r2(fl + fgk);
          const hk = r2(mk + fk);
          const vwvtk = r2(hk * vwvtPct / 100);
          const sk = r2(hk + vwvtk);
          const gw = r2(sk * gwPct / 100);
          const barVP = r2(sk + gw);
          const skonto = r2(barVP / (1 - skontoPct/100) - barVP);
          const zielVP = r2(barVP + skonto);
          const rabatt = r2(zielVP / (1 - rabattPct/100) - zielVP);
          const listenVP = r2(zielVP + rabatt);
          const ust = r2(listenVP * 0.19);
          const bruttoVP = r2(listenVP + ust);
          return {
            aufgabe: `Berechnen Sie den vollständigen Angebotskalkulationsweg für ${pick(f.fertigerzeugnisse)} von den Selbstkosten bis zum Bruttoverkaufspreis. SK: ${fmt(sk)} €, Gewinn: ${gwPct} %, Kundenskonto: ${skontoPct} %, Kundenrabatt: ${rabattPct} %.`,
            beleg: null,
            schema: [
              { label: "Selbstkosten (SK)", wert: sk, einheit: "€" },
              { label: `+ Gewinn (${gwPct} % auf SK)`, wert: gw, einheit: "€" },
              { label: "= Barverkaufspreis (BarVP)", wert: barVP, einheit: "€", bold: true },
              { label: `+ Kundenskonto (${skontoPct} % auf ZielVP)`, wert: r2(skonto), einheit: "€" },
              { label: "= Zielverkaufspreis (ZielVP)", wert: zielVP, einheit: "€", bold: true },
              { label: `+ Kundenrabatt (${rabattPct} % auf ListenVP)`, wert: r2(rabatt), einheit: "€" },
              { label: "= Listenverkaufspreis / Angebotspreis (netto)", wert: listenVP, einheit: "€", bold: true, trennlinie: true },
              { label: "+ Umsatzsteuer 19 %", wert: ust, einheit: "€" },
              { label: "= Bruttoverkaufspreis", wert: bruttoVP, einheit: "€", bold: true, highlight: true },
            ],
            nrPunkte: 6,
            erklaerung: `Rückwärtskalkulation: BarVP = SK + Gewinn. Skonto und Rabatt werden aufaddiert (Lieferantensicht). ZielVP = BarVP ÷ (1 − Skonto%). ListenVP = ZielVP ÷ (1 − Rabatt%).`,
          };
        },
      },
      {
        id: "10_bab_verteilung", titel: "BAB – Gemeinkosten verteilen",
        taskTyp: "rechnung",
        generate: f => {
          const gesamt = rnd(10000, 50000, 1000);
          const anteile = [pick([2,3,4]), pick([8,10,12,14]), pick([3,4,5]), pick([2,3])];
          const sumAnteile = anteile.reduce((a,b) => a+b, 0);
          const kosten = anteile.map(a => r2(gesamt * a / sumAnteile));
          const rest = r2(gesamt - kosten.slice(0,-1).reduce((a,b)=>a+b, 0));
          kosten[3] = rest;
          return {
            aufgabe: `Verteilen Sie die Heizkosten von ${fmt(gesamt)} € auf die vier Kostenstellen nach Flächenanteilen. Material: ${anteile[0]} Anteile, Fertigung: ${anteile[1]} Anteile, Verwaltung: ${anteile[2]} Anteile, Vertrieb: ${anteile[3]} Anteile.`,
            beleg: null,
            schema: [
              { label: `Gesamtkosten ÷ ${sumAnteile} Anteile = je Anteil`, wert: r2(gesamt/sumAnteile), einheit: "€/Anteil" },
              { label: `Kostenstelle I Material (${anteile[0]} Anteile)`, wert: kosten[0], einheit: "€", bold: true },
              { label: `Kostenstelle II Fertigung (${anteile[1]} Anteile)`, wert: kosten[1], einheit: "€", bold: true },
              { label: `Kostenstelle III Verwaltung (${anteile[2]} Anteile)`, wert: kosten[2], einheit: "€", bold: true },
              { label: `Kostenstelle IV Vertrieb (${anteile[3]} Anteile)`, wert: kosten[3], einheit: "€", bold: true },
              { label: "Summe (Probe)", wert: gesamt, einheit: "€", trennlinie: true },
            ],
            nrPunkte: 4,
            erklaerung: `BAB: Gemeinkosten verteilen nach Verteilungsschlüssel. ${fmt(gesamt)} ÷ ${sumAnteile} = ${fmt(r2(gesamt/sumAnteile))} € je Anteil. Geeigneter Schlüssel für Heizkosten: Fläche (m²).`,
          };
        },
      },
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
        id: "10_db_zweiprodukt", titel: "Deckungsbeitragsrechnung (2 Produkte)",
        taskTyp: "rechnung",
        generate: f => {
          const fe = f.fertigerzeugnisse || ["Produkt A", "Produkt B"];
          const p1 = pick(fe); const p2 = pick(fe.filter(x => x !== p1)) || "Produkt B";
          const preis1 = rnd(100, 500, 10); const vk1 = rnd(40, r2(preis1*0.75), 10); const menge1 = rnd(200, 1000, 50);
          const preis2 = rnd(80, 400, 10); const vk2 = rnd(30, r2(preis2*0.75), 10); const menge2 = rnd(300, 1200, 50);
          const fixk = rnd(20000, 100000, 5000);
          const db1 = r2(preis1 - vk1); const db2 = r2(preis2 - vk2);
          const dbGes = r2(db1 * menge1 + db2 * menge2);
          const be = r2(dbGes - fixk);
          return {
            aufgabe: `Berechnen Sie das Betriebsergebnis für ${f.name} mit zwei Produkten. ${p1}: ${fmt(preis1)} €/Stk, var. K. ${fmt(vk1)} €, ${menge1} Stk. ${p2}: ${fmt(preis2)} €/Stk, var. K. ${fmt(vk2)} €, ${menge2} Stk. Fixkosten: ${fmt(fixk)} €.`,
            beleg: null,
            schema: [
              { label: `${p1}: NVP ${fmt(preis1)} − var.K. ${fmt(vk1)} = DB/Stk.`, wert: db1, einheit: "€/Stk", bold: true },
              { label: `${p1}: DB/Stk × ${menge1} Stk = DB gesamt`, wert: r2(db1*menge1), einheit: "€" },
              { label: `${p2}: NVP ${fmt(preis2)} − var.K. ${fmt(vk2)} = DB/Stk.`, wert: db2, einheit: "€/Stk", bold: true },
              { label: `${p2}: DB/Stk × ${menge2} Stk = DB gesamt`, wert: r2(db2*menge2), einheit: "€" },
              { label: "Gesamtdeckungsbeitrag", wert: dbGes, einheit: "€", bold: true, trennlinie: true },
              { label: "− Fixkosten", wert: fixk, einheit: "€" },
              { label: "= Betriebsergebnis", wert: be, einheit: "€", bold: true, highlight: be >= 0 },
            ],
            nrPunkte: 5,
            erklaerung: `Bei 2 Produkten: Fixkosten als Block. DB/Stk = NVP − var.K. Gesamt-DB = Summe aller Einzel-DB. Betriebsergebnis = Gesamt-DB − Fixkosten.`,
          };
        },
      },
      {
        id: "10_zusatzauftrag", titel: "Zusatzauftrag annehmen oder ablehnen?",
        taskTyp: "rechnung",
        generate: f => {
          const vk = rnd(80, 300, 10);
          const nvp = r2(vk * (1 + 0.3 + Math.random() * 0.2)); // 30-50% über var.K.
          const menge = rnd(100, 500, 50);
          const rabatt = pick([10, 15, 20, 25]);
          const nvpZusatz = r2(nvp * (1 - rabatt / 100));
          const dbZusatz = r2(nvpZusatz - vk);
          const fixkSteigerung = Math.random() > 0.6 ? rnd(500, 3000, 500) : 0;
          const gesamtDb = r2(dbZusatz * menge);
          const ergebnis = r2(gesamtDb - fixkSteigerung);
          const lohnt = ergebnis > 0;
          return {
            aufgabe: `${f.name} erhält eine Anfrage für einen Zusatzauftrag: ${menge} Stk. ${pick(f.fertigerzeugnisse)} zu ${rabatt} % unter dem normalen NVP von ${fmt(nvp)} €. Variable Kosten: ${fmt(vk)} €/Stk.${fixkSteigerung > 0 ? ` Die Fixkosten steigen um ${fmt(fixkSteigerung)} €.` : ""} Begründen Sie rechnerisch, ob der Zusatzauftrag angenommen werden soll.`,
            beleg: null,
            schema: [
              { label: `Normaler NVP: ${fmt(nvp)} €`, wert: nvp, einheit: "€" },
              { label: `− ${rabatt} % Sonderrabatt`, wert: r2(nvp * rabatt / 100), einheit: "€" },
              { label: `= NVP Zusatzauftrag`, wert: nvpZusatz, einheit: "€" },
              { label: `− variable Kosten/Stk.`, wert: vk, einheit: "€" },
              { label: "= Deckungsbeitrag/Stk.", wert: dbZusatz, einheit: "€", bold: true },
              { label: `× ${menge} Stk. = DB gesamt`, wert: gesamtDb, einheit: "€", bold: true, trennlinie: true },
              ...(fixkSteigerung > 0 ? [{ label: "− Fixkostensteigerung", wert: fixkSteigerung, einheit: "€" }] : []),
              { label: `= Verbesserung des Betriebsergebnisses`, wert: ergebnis, einheit: "€", bold: true, highlight: lohnt },
              { label: lohnt ? "→ Zusatzauftrag LOHNT SICH" : "→ Zusatzauftrag LOHNT SICH NICHT", wert: " ", einheit: "" },
            ],
            nrPunkte: 4,
            erklaerung: `Zusatzauftrag lohnt sich, wenn DB > 0 (bzw. DB > Fixkostensteigerung). NVP Zusatz ${fmt(nvpZusatz)} € > var. K. ${fmt(vk)} € = DB ${fmt(dbZusatz)} €/Stk. ${lohnt ? "Betriebsergebnis verbessert sich." : "Betriebsergebnis verschlechtert sich."}`,
          };
        },
      },
      {
        id: "10_eigenfertigung_fremdbezug", titel: "Eigenfertigung oder Fremdbezug (make-or-buy)",
        taskTyp: "rechnung",
        generate: f => {
          const menge = rnd(500, 3000, 100);
          const varKEigen = rnd(8, 40, 2);
          const fixkEigen = rnd(3000, 15000, 500);
          const lep = rnd(r2(varKEigen * 1.1), r2(varKEigen * 2), 2);
          const rabatt = pick([5, 10, 15, 20]);
          const einstand = r2(lep * (1 - rabatt / 100));
          const gesEigen = r2(varKEigen * menge + fixkEigen);
          const gesFremdb = r2(einstand * menge);
          const diff = r2(gesFremdb - gesEigen);
          const eigenBesser = gesEigen < gesFremdb;
          return {
            aufgabe: `Überprüfen Sie für ${menge} Stk., ob ${f.name} einen Bauteil selbst fertigen oder fremdbezziehen soll. Eigenfertigung: var.K. ${fmt(varKEigen)} €/Stk., Fixkosten ${fmt(fixkEigen)} €. Fremdbezug: LEP ${fmt(lep)} €/Stk., Rabatt ${rabatt} %.`,
            beleg: null,
            schema: [
              { label: "EIGENFERTIGUNG:", wert: null, einheit: "" },
              { label: `Variable Kosten (${fmt(varKEigen)} × ${menge})`, wert: r2(varKEigen * menge), einheit: "€" },
              { label: "+ Fixkosten", wert: fixkEigen, einheit: "€" },
              { label: "= Gesamtkosten Eigenfertigung", wert: gesEigen, einheit: "€", bold: true },
              { label: "FREMDBEZUG:", wert: null, einheit: "" },
              { label: `LEP: ${fmt(lep)} − ${rabatt} % = Einstandspreis`, wert: einstand, einheit: "€/Stk." },
              { label: `× ${menge} Stk. = Gesamtkosten Fremdbezug`, wert: gesFremdb, einheit: "€", bold: true },
              { label: `Differenz (günstiger: ${eigenBesser ? "Eigenfertigung" : "Fremdbezug"})`, wert: Math.abs(diff), einheit: "€", bold: true, trennlinie: true, highlight: true },
            ],
            nrPunkte: 4,
            erklaerung: `${eigenBesser ? `Eigenfertigung günstiger (${fmt(gesEigen)} € < ${fmt(gesFremdb)} €, Ersparnis ${fmt(diff)} €).` : `Fremdbezug günstiger (${fmt(gesFremdb)} € < ${fmt(gesEigen)} €, Ersparnis ${fmt(Math.abs(diff))} €).`}`,
          };
        },
      },
      {
        id: "10_gewinnschwelle", titel: "Gewinnschwelle (Break-Even-Point) berechnen",
        taskTyp: "rechnung",
        generate: f => {
          const nvp = rnd(50, 400, 10);
          const vk = rnd(20, r2(nvp * 0.75), 10);
          const fixk = rnd(10000, 80000, 2500);
          const db = r2(nvp - vk);
          const bep = Math.ceil(fixk / db);
          const kapazitaet = r2(bep * (1.5 + Math.random() * 1.5));
          const auslastungPct = r2(bep / kapazitaet * 100);
          return {
            aufgabe: `Berechnen Sie die Gewinnschwellenmenge (Break-Even-Point) für ${pick(f.fertigerzeugnisse)}. NVP: ${fmt(nvp)} €, variable Kosten: ${fmt(vk)} €/Stk., Fixkosten: ${fmt(fixk)} €.`,
            beleg: null,
            schema: [
              { label: `NVP ${fmt(nvp)} € − var.K. ${fmt(vk)} € = DB/Stk.`, wert: db, einheit: "€/Stk.", bold: true },
              { label: "BEP = Fixkosten ÷ DB/Stk.", wert: bep, einheit: "Stk.", bold: true, trennlinie: true, highlight: true },
              { label: `BEP = ${fmt(fixk)} ÷ ${fmt(db)} =`, wert: bep, einheit: "Stk." },
              { label: "→ Ab dieser Stückzahl wird Gewinn erzielt", wert: null, einheit: "" },
              { label: `Gewinnschwellenumsatz (BEP × NVP)`, wert: r2(bep * nvp), einheit: "€", bold: true },
            ],
            nrPunkte: 4,
            erklaerung: `BEP = Fixkosten ÷ DB/Stk. = ${fmt(fixk)} ÷ ${fmt(db)} = ${bep} Stk. Unterhalb = Verlustzone, oberhalb = Gewinnzone.`,
          };
        },
      },
      {
        id: "10_preisuntergrenze", titel: "Kurz- und langfristige Preisuntergrenze",
        taskTyp: "rechnung",
        generate: f => {
          const vk = rnd(30, 150, 5);
          const fixk = rnd(5000, 40000, 1000);
          const menge = rnd(200, 800, 50);
          const fixkJeStk = r2(fixk / menge);
          const pug_kurz = vk;
          const pug_lang = r2(vk + fixkJeStk);
          return {
            aufgabe: `Ermitteln Sie die kurz- und langfristige Preisuntergrenze für ${pick(f.fertigerzeugnisse)}. Variable Kosten: ${fmt(vk)} €/Stk., Fixkosten: ${fmt(fixk)} €, Produktionsmenge: ${menge} Stk.`,
            beleg: null,
            schema: [
              { label: "Kurzfristige Preisuntergrenze", wert: pug_kurz, einheit: "€/Stk.", bold: true },
              { label: "= variable Kosten/Stk. (DB = 0)", wert: pug_kurz, einheit: "€/Stk." },
              { label: "→ Verlust = Fixkosten (Weiterproduzieren sinnvoll wenn Marktpreis > var.K.)", wert: null, einheit: "" },
              { label: "Fixkosten/Stk. = Fixkosten ÷ Menge", wert: fixkJeStk, einheit: "€/Stk." },
              { label: "Langfristige Preisuntergrenze", wert: pug_lang, einheit: "€/Stk.", bold: true, trennlinie: true, highlight: true },
              { label: "= var.K. + Fixkosten/Stk. (Betriebsergebnis = 0)", wert: pug_lang, einheit: "€/Stk." },
            ],
            nrPunkte: 4,
            erklaerung: `Kurzfristige PUG = variable Kosten (${fmt(vk)} €). Langfristige PUG = var.K. + Fixkosten/Stk. = ${fmt(vk)} + ${fmt(fixkJeStk)} = ${fmt(pug_lang)} €. Unter langfr. PUG = Verlust auf Dauer nicht tragbar.`,
          };
        },
      },
      {
        id: "10_produkteliminierung", titel: "Produkteliminierung (Sortimentsentscheidung)",
        taskTyp: "rechnung",
        generate: f => {
          const fe = f.fertigerzeugnisse.slice(0,3);
          const produkte = fe.map(name => ({
            name,
            nvp: rnd(100, 500, 10),
            vk: rnd(40, 200, 10),
          })).map(p => ({ ...p, db: r2(p.nvp - p.vk) }));
          const minDB = Math.min(...produkte.map(p => p.db));
          const eliminieren = produkte.find(p => p.db === minDB);
          return {
            aufgabe: `${f.name} produziert ${produkte.length} Produkte. Welches soll aus dem Programm genommen werden? Begründen Sie rechnerisch.`,
            beleg: null,
            schema: produkte.map(p => ({
              label: `${p.name}: NVP ${fmt(p.nvp)} € − var.K. ${fmt(p.vk)} € = DB/Stk.`,
              wert: p.db,
              einheit: "€",
              bold: p.name === eliminieren.name,
            })).concat([
              { label: `→ ${eliminieren.name} hat den geringsten DB/Stk. → eliminieren`, wert: null, einheit: "" },
            ]),
            nrPunkte: 3,
            erklaerung: `Produkt mit dem niedrigsten Deckungsbeitrag/Stk. wird zuerst eliminiert. Für Verkaufsförderung wird das Produkt mit dem höchsten DB/Stk. gewählt.`,
          };
        },
      },
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
      {
        id: "10_vorabschluss_unterkonten", titel: "Vorabschluss von Unterkonten",
        taskTyp: "theorie", themenTyp: "zuordnung",
        generate: () => ({
          aufgabe: "Ordnen Sie die Vorabschlussbuchungen den richtigen Beschreibungen zu.",
          zuordnung: { paare: [
            { term: "6001 BZKR – Mehrbestand", def: "6000 AWR an 6001 BZKR – Rohstofflager gewachsen, Aufwand sinkt" },
            { term: "6001 BZKR – Minderbestand", def: "6001 BZKR an 6000 AWR – Rohstofflager geschrumpft, Aufwand steigt" },
            { term: "5001 EBFE", def: "5000 UEFE an 5001 EBFE – Erlösberichtigungen auf Hauptkonto saldieren" },
            { term: "6012 NF (Nachlässe FB)", def: "6012 NF an 6010 AWF – Nachlässe-Unterkonto auf Fremdbauteile abschließen" },
          ]}, nrPunkte: 4,
        }),
      },
      {
        id: "10_jahresabschluss_buchungen", titel: "Jahresabschluss-Buchungssätze (Wiederholung)",
        taskTyp: "komplex",
        generate: (f) => {
          const afa = rnd(15000, 60000, 2500);
          const lbkv = rnd(50000, 300000, 10000);
          const guv = rnd(10000, 200000, 5000);
          const istGewinn = Math.random() > 0.35;
          const sb_bk = rnd(20000, 80000, 5000);
          return {
            vorspann: `Bilden Sie die folgenden Jahresabschluss-Buchungssätze für ${f.name} zum 31.12.`,
            schritte: [
              {
                nr: 1, titel: "Abschreibung auf Sachanlagen", typ: "buchung", punkte: 2,
                aufgabe: `Nehmen Sie Abschreibungen in Höhe von ${fmt(afa)} € auf Maschinen und Anlagen vor.`,
                beleg: null, nrPunkte: 0,
                soll: [{ nr: "6520", name: "Abschreibungen Sachanlagen (ABSA)", betrag: afa }],
                haben: [{ nr: "0700", name: "Maschinen und Anlagen (MA)", betrag: afa }],
                erklaerung: `6520 ABSA an 0700 MA. Aufwand im GUV, Buchwert sinkt.`,
              },
              {
                nr: 2, titel: "Bankkonto auf SBK abschließen", typ: "buchung", punkte: 2,
                aufgabe: `Schließen Sie das Konto 2800 BK mit einem Schlussbestand von ${fmt(sb_bk)} € auf die SBK ab.`,
                beleg: null, nrPunkte: 0,
                soll: [{ nr: "2800", name: "Bank (BK)", betrag: sb_bk }],
                haben: [{ nr: "8010", name: "Schlussbilanz (SBK)", betrag: sb_bk }],
                erklaerung: `Aktivkonto: 2800 BK an 8010 SBK (Schlussbestand auf Haben-Seite der SBK).`,
              },
              {
                nr: 3, titel: "GUV-Konto abschließen", typ: "buchung", punkte: 2,
                aufgabe: `Das GUV-Konto zeigt einen ${istGewinn ? "Gewinn" : "Verlust"} in Höhe von ${fmt(guv)} €. Bilden Sie den Buchungssatz.`,
                beleg: null, nrPunkte: 0,
                soll: istGewinn ? [{ nr: "8020", name: "GUV", betrag: guv }] : [{ nr: "3000", name: "Eigenkapital (EK)", betrag: guv }],
                haben: istGewinn ? [{ nr: "3000", name: "Eigenkapital (EK)", betrag: guv }] : [{ nr: "8020", name: "GUV", betrag: guv }],
                erklaerung: istGewinn ? `Gewinn erhöht EK: 8020 GUV an 3000 EK.` : `Verlust mindert EK: 3000 EK an 8020 GUV.`,
              },
            ],
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
