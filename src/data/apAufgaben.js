// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Anton Gebert <info@buchungswerk.org> – BuchungsWerk
// AP-Aufgabenpool BwR Klasse 10, Abschlussprüfung Bayern
// Konten: ISB Bayern PLUSPunkt BwR 2024
//
// ── Korrekturen (geprüft März 2026) ────────────────────────────────────
// Fix 1 – A2-02 2.3.2:  VAWP konto "6700" → "7460"  (6700 = AWMP!)
// Fix 2 – A3-01 3.4.1:  loesung_korrektur-Feld entfernt; Pro-Power (DB 110 > 105)
// Fix 3 – WT8 8.3.1:    USt 1.704,50 → 1.662,50 €; RB 10.412,50 € (8.600 × 19 %)
// Fix 4 – WT8 8.3.2:    Gutschrift 10 × 43 = 430 € netto; USt 81,70; Brutto 511,70 €
// Fix 5 – A1-03:        Leihverpackung (Verkäufer): 5030 BZKV → 5000 UEFE

// ── UNTERNEHMENSPOOL ─────────────────────────────────────────────────────
export const AP_UNTERNEHMEN = [
  { id:"HUBI", name:"Maximilian Huber Solaranlagen e.K.", kurz:"HUBI", inhaber:"Maximilian Huber", anschrift:"Sonnenallee 12, 85049 Ingolstadt", hauptwerk:{ort:"Ingolstadt",produkt:"Solarmodule"}, zweigwerk:{ort:"Eichstätt",produkt:"Wechselrichter"}, rohstoffe:"Siliziumwafer, Aluminiumrahmen", fremdbauteile:"Solarzellen, Kabelverbinder", hilfsstoffe:"Klebstoffe, Schrauben", betriebsstoffe:"Strom, Schmierstoffe", gj:"1. Januar bis 31. Dezember 2025", branche:"Erneuerbare Energie" },
  { id:"VELO", name:"Sandra Berger E-Bikes e. Kfr.", kurz:"VELO", inhaber:"Sandra Berger", anschrift:"Radweg 7, 94032 Passau", hauptwerk:{ort:"Passau",produkt:"E-Bikes"}, zweigwerk:{ort:"Vilshofen",produkt:"Fahrradhelme"}, rohstoffe:"Aluminiumrohre, Carbongewebe", fremdbauteile:"Elektromotoren, Lithium-Akkus", hilfsstoffe:"Schrauben, Klebstoff", betriebsstoffe:"Schmiermittel, Strom", gj:"1. Januar bis 31. Dezember 2025", branche:"Elektromobilität" },
  { id:"HOLZ", name:"Thomas Gruber Holzmöbel e.K.", kurz:"HOLZ", inhaber:"Thomas Gruber", anschrift:"Waldstraße 3, 83022 Rosenheim", hauptwerk:{ort:"Rosenheim",produkt:"Massivholzmöbel"}, zweigwerk:{ort:"Kolbermoor",produkt:"Holzspielzeug"}, rohstoffe:"Fichten-, Eichen- und Buchenholz", fremdbauteile:"Scharniere, Griffe", hilfsstoffe:"Holzleim, Lacke", betriebsstoffe:"Schleifpapier, Strom", gj:"1. Januar bis 31. Dezember 2025", branche:"Möbel / Holzverarbeitung" },
];

// ── AUFGABE 1 – Beleg & Grundbuchführung (~15 P) ─────────────────────────
export const AP_AUFGABE_1 = [
  {
    id:"A1-01", typ:"ausgangsrechnung", gesamtpunkte:15, unternehmenId:"HUBI",
    beleg:{ typ:"Ausgangsrechnung", rechnungsNr:"AR-12/25", datum:"5. Januar 2025", lieferdatum:"5. Januar 2025", kunde:{name:"Sonnenkraft Bayern GmbH",ort:"Augsburg"}, positionen:[{artikel:`Solarmodul "SunPower 400W"`,menge:30,einzelpreis:280.00},{artikel:`Solarmodul "SunPower 600W"`,menge:20,einzelpreis:420.00}], rabatt_pct:10, ust_pct:19, skonto_pct:2, skonto_frist:"15. Januar 2025", zahlungsziel:"4. Februar 2025", listenpreis:16800.00, rabatt:1680.00, warenwert:15120.00, ust:2872.80, rechnungsbetrag:17992.80, skonto_brutto:359.86, ueberweisung:17632.94, skonto_netto:302.40, skonto_ust:57.46 },
    teilaufgaben:[
      { nr:"1.1", punkte:2, text:"Eine der Aussagen A–C zur Ausgangsrechnung AR-12/25 ist falsch. Nennen Sie den Kennbuchstaben und berichtigen Sie die falsche Aussage.", aussagen:[{buchstabe:"A",text:"HUBI trägt die Kosten der Lieferung (Lieferklausel: frei Haus).",richtig:true},{buchstabe:"B",text:"HUBI gewährt der Sonnenkraft Bayern GmbH ein Zahlungsziel bis zum 4. Februar 2025.",richtig:true},{buchstabe:"C",text:"Mit dem Versand der Solarmodule ist HUBI nicht mehr Eigentümer der Ware.",richtig:false}], falsch:"C", loesung:"C ist falsch. Richtig: Eigentumsvorbehalt – Solarmodule bleiben bis zur vollständigen Bezahlung Eigentum von HUBI." },
      { nr:"1.2", punkte:1, text:"Nennen Sie einen Grund, warum die Sonnenkraft Bayern GmbH einen Treuerabatt von 10 % erhält.", loesung:"z. B.: langjährige Kundenbeziehung / hohe Abnahmemenge / Stammkunde" },
      { nr:"1.3", punkte:3, text:"Erstellen Sie den Buchungssatz für die Ausgangsrechnung AR-12/25.", loesung:{ soll:[{konto:"2400",name:"FO",betrag:17992.80}], haben:[{konto:"5000",name:"UEFE",betrag:15120.00},{konto:"4800",name:"UST",betrag:2872.80}] } },
      { nr:"1.4", punkte:5, text:"Die Sonnenkraft Bayern GmbH überweist am 15.01.2025 und nutzt dabei die Skontomöglichkeit (2 %). Erstellen Sie den Buchungssatz für den Zahlungseingang.", loesung:{ nebenrechnung:["17.992,80 × 2 % = 359,86 € Brutto-Skonto","17.992,80 – 359,86 = 17.632,94 € Überweisungsbetrag","359,86 / 1,19 = 302,40 € Netto-Skonto"], soll:[{konto:"2800",name:"BK",betrag:17632.94},{konto:"5001",name:"EBFE",betrag:302.40},{konto:"4800",name:"UST",betrag:57.46}], haben:[{konto:"2400",name:"FO",betrag:17992.80}] } },
      { nr:"1.5.1", punkte:1, text:`Bestimmen Sie, in welcher Phase des Produktlebenszyklus sich das Solarmodul \u201ESunPower 300\u201C befindet.`, loesung:"Wachstumsphase" },
      { nr:"1.5.2", punkte:3, text:"Tragen Sie die Produktbezeichnungen der fehlenden Modelle A–C in das Produktlebenszyklus-Diagramm von HUBI ein.", loesung:{A:"Eco-20",B:"SunPower 400",C:"Ultra-Sun"} },
    ],
  },
  {
    id:"A1-02", typ:"eingangsrechnung", gesamtpunkte:15, unternehmenId:"VELO",
    beleg:{ typ:"Eingangsrechnung", rechnungsNr:"2348/25", datum:"10. Februar 2025", lieferant:{name:"AkkuTech GmbH",ort:"München"}, positionen:[{artikel:"Lithium-Akku 36V/15Ah",menge:80,einzelpreis:185.00},{artikel:"Elektromotor 250W",menge:60,einzelpreis:220.00}], ust_pct:19, skonto_pct:2, skonto_frist:"20. Februar 2025", zahlungsziel:"12. März 2025", warenwert:28000.00, ust:5320.00, rechnungsbetrag:33320.00, skonto_brutto:666.40, ueberweisung:32653.60, skonto_netto:560.00, skonto_ust:106.40 },
    teilaufgaben:[
      { nr:"1.1", punkte:2, text:`Erklären Sie den Begriff \u201Erein netto\u201C im Zusammenhang mit der vorliegenden Eingangsrechnung.`, loesung:"Rechnungsbetrag von 33.320,00 € ist ohne Skontoabzug bis zum Zahlungsziel (12.03.2025) zu zahlen." },
      { nr:"1.2", punkte:2, text:"Beurteilen Sie die Aussagen A–D zur Eingangsrechnung Nr. 2348/25 als richtig oder falsch.", aussagen:[{buchstabe:"A",text:"Die AkkuTech GmbH (München) ist der Lieferant der bestellten Fremdbauteile.",richtig:true},{buchstabe:"B",text:"Der Rechnungsbetrag von 33.320,00 € ist spätestens bis zum 12. März 2025 zu begleichen.",richtig:true},{buchstabe:"C",text:"Bei Zahlung bis zum 20. Februar 2025 darf VELO 2 % Skonto (= 666,40 €) in Abzug bringen.",richtig:true},{buchstabe:"D",text:"VELO wird unmittelbar mit der Lieferung Eigentümer der Lithium-Akkus und Elektromotoren.",richtig:false}], loesung:{A:"richtig",B:"richtig",C:"richtig",D:"falsch – Eigentumsvorbehalt: VELO wird erst bei vollständiger Bezahlung Eigentümer."} },
      { nr:"1.3", punkte:3, text:"Erstellen Sie den Buchungssatz für den Rechnungseingang (Eingangsrechnung Nr. 2348/25).", loesung:{ soll:[{konto:"6010",name:"AWF",betrag:28000.00},{konto:"2600",name:"VORST",betrag:5320.00}], haben:[{konto:"4400",name:"VE",betrag:33320.00}] } },
      { nr:"1.4", punkte:5, text:"VELO überweist am 20.02.2025 und nutzt dabei die Skontomöglichkeit (2 %). Erstellen Sie den Buchungssatz.", loesung:{ nebenrechnung:["33.320 × 2 % = 666,40 € Brutto-Skonto","32.653,60 € Überweisungsbetrag","666,40 / 1,19 = 560,00 € Netto-Skonto"], soll:[{konto:"4400",name:"VE",betrag:33320.00}], haben:[{konto:"2800",name:"BK",betrag:32653.60},{konto:"6012",name:"NF",betrag:560.00},{konto:"2600",name:"VORST",betrag:106.40}] } },
      { nr:"1.5.1", punkte:3, text:"Ergänzen Sie die fehlenden Werte A–C in der Tabelle zur Vorratshaltung von VELO.", loesung:{A:"1.200,00",B:"sinken",C:"300"} },
    ],
  },
  {
    // FIX 5: Leihverpackung → 5000 UEFE statt 5030 BZKV
    id:"A1-03", typ:"ausgangsrechnung_leihverpackung", gesamtpunkte:15, unternehmenId:"HOLZ",
    beleg:{ typ:"Ausgangsrechnung mit Leihverpackung", rechnungsNr:"59/25", datum:"8. März 2025", kunde:{name:"Möbelhaus Süd GmbH",ort:"Landsberg am Lech"}, positionen:[{artikel:`Esstisch "Waldblick" Buche massiv`,menge:10,einzelpreis:680.00}], rabatt_pct:15, leihverpackung:240.00, ust_pct:19, skonto_pct:2, skonto_frist:"18. März 2025", zahlungsziel:"7. April 2025", listenpreis:6800.00, rabatt:1020.00, warenwert:5780.00, leihverpackungWert:240.00, ust:1143.80, rechnungsbetrag:7163.80, leihvp_rueck_brutto:285.60, offener_betrag:6878.20, skonto_brutto:137.56, ueberweisung:6740.64, skonto_netto:115.60, skonto_ust:21.96 },
    teilaufgaben:[
      { nr:"1.1", punkte:4, text:"Erstellen Sie den Buchungssatz für den Rechnungsausgang (Ausgangsrechnung Nr. 59/25 inkl. Leihverpackung).", loesung:{ soll:[{konto:"2400",name:"FO",betrag:7163.80}], haben:[{konto:"5000",name:"UEFE",betrag:5780.00},{konto:"5000",name:"UEFE (Leihverpackung)",betrag:240.00},{konto:"4800",name:"UST",betrag:1143.80}] } },
      { nr:"1.2", punkte:1, text:"Nennen Sie einen Vorteil der Leihverpackung für das Unternehmen HOLZ.", loesung:"z. B.: ressourcenschonend / Mehrfachnutzung / keine Entsorgungskosten" },
      { nr:"1.2.2", punkte:3, text:"Die Möbelhaus Süd GmbH gibt die Leihverpackung zurück. HOLZ erteilt eine Gutschrift über 285,60 € brutto (Leihverpackung netto 240,00 € + 19 % USt). Erstellen Sie den Buchungssatz.", loesung:{ soll:[{konto:"5000",name:"UEFE",betrag:240.00},{konto:"4800",name:"UST",betrag:45.60}], haben:[{konto:"2400",name:"FO",betrag:285.60}] } },
      { nr:"1.3", punkte:6, text:"Die Möbelhaus Süd GmbH gleicht die Rechnung am 18.03.2025 aus und zieht 2 % Skonto vom offenen Betrag (nach Abzug der Gutschrift) ab. Erstellen Sie den Buchungssatz.", loesung:{ nebenrechnung:["7.163,80 – 285,60 = 6.878,20 € offener Betrag","6.878,20 × 2 % = 137,56 € Brutto-Skonto","6.740,64 € Überweisungsbetrag","137,56 / 1,19 = 115,60 € Netto-Skonto"], soll:[{konto:"2800",name:"BK",betrag:6740.64},{konto:"5001",name:"EBFE",betrag:115.60},{konto:"4800",name:"UST",betrag:21.96}], haben:[{konto:"2400",name:"FO",betrag:6878.20}] } },
      { nr:"1.4", punkte:1, text:"Nennen Sie den Fachbegriff für den umsatzsteuerrechtlichen Vorgang, der durch die Rückgabe der Leihverpackung nach § 17 UStG ausgelöst wird.", loesung:"Berichtigung des Vorsteuerabzugs (Vorsteuerberichtigung)" },
    ],
  },
];

// ── AUFGABE 2 – Wertpapiere (~14 P) ──────────────────────────────────────
export const AP_AUFGABE_2 = [
  {
    id:"A2-01", gesamtpunkte:14, unternehmenId:"HUBI",
    teilaufgaben:[
      { nr:"2.1", punkte:1, text:"Nennen Sie einen Nachteil der Geldanlage in Gold gegenüber der Anlage in Aktien.", loesung:"z. B.: keine laufenden Erträge (keine Dividenden) / Wertschwankungen / Aufbewahrungskosten" },
      { nr:"2.2", punkte:1, text:"Nennen Sie ein weiteres Kriterium, das eine Geldanlage als nachhaltig ausweist (außer ökologischen Aspekten).", loesung:"z. B.: soziales Engagement / faire Arbeitsbedingungen / verantwortungsvolle Unternehmensführung (Governance)" },
      { nr:"2.2.2", punkte:2, text:"HUBI erwirbt 150 GreenEnergy-Aktien zum Kurs von 42,00 € je Aktie. Bankspesen betragen 1 % des Kurswerts. Die Zahlung erfolgt per Banklastschrift. Erstellen Sie den Buchungssatz.", daten:{stueckzahl:150,kurs:42.00,spesen_pct:1,kurswert:6300.00,spesen:63.00,lastschrift:6363.00}, loesung:{ soll:[{konto:"1500",name:"WP",betrag:6363.00}], haben:[{konto:"2800",name:"BK",betrag:6363.00}] } },
      { nr:"2.3", punkte:4, text:"HUBI erhält eine Dividende von 450,00 € (Bu.-Nr. 42, Bankgutschrift). Im selben Monat werden Depotgebühren von 28,00 € abgebucht (Bu.-Nr. 43). Erstellen Sie beide Buchungssätze.", loesung:[ {buchungsNr:42,soll:[{konto:"2800",name:"BK",betrag:450.00}],haben:[{konto:"5780",name:"DDE",betrag:450.00}]}, {buchungsNr:43,soll:[{konto:"6750",name:"KGV",betrag:28.00}],haben:[{konto:"2800",name:"BK",betrag:28.00}]} ] },
      { nr:"2.4", punkte:6, text:"HUBI verkauft alle 150 GreenEnergy-Aktien zum Kurs von 47,50 € je Aktie. Bankspesen: 1 % des Kurswerts. Der Nettobetrag wird gutgeschrieben (Buchwert: 6.363,00 €). Erstellen Sie den Buchungssatz.", daten:{stueckzahl:150,kurs:47.50,buchwert:6363.00,kurswert:7125.00,spesen:71.25,gutschrift:7053.75,gewinn:690.75}, loesung:{ nebenrechnung:["7.125 – 71,25 = 7.053,75 € Gutschrift"], soll:[{konto:"2800",name:"BK",betrag:7053.75}], haben:[{konto:"1500",name:"WP",betrag:6363.00},{konto:"5650",name:"EAWP",betrag:690.75}] } },
    ],
  },
  {
    id:"A2-02", gesamtpunkte:14, unternehmenId:"VELO",
    teilaufgaben:[
      { nr:"2.1",   punkte:1, text:"Nennen Sie einen Vorteil eines hohen Bankgeldbestands für das Unternehmen VELO.", loesung:"z. B.: Sicherung der Zahlungsfähigkeit (Liquidität) / sofortige Verfügbarkeit der Mittel" },
      { nr:"2.1.2", punkte:1, text:"Erläutern Sie, warum eine alternative Geldanlage für VELO sinnvoll sein kann.", loesung:"Das Bankkonto bringt kaum Zinserträge; eine alternative Anlage (z. B. Aktien) ermöglicht höhere Renditen." },
      { nr:"2.1.3", punkte:1, text:"Nennen Sie den Fachbegriff für die Streuung des Anlagerisikos auf verschiedene Anlageformen.", loesung:"Diversifikation" },
      { nr:"2.2",   punkte:2, text:"VELO erwirbt 200 EcoRide-Aktien zum Kurs von 31,00 € je Aktie. Bankspesen: 1 % des Kurswerts. Erstellen Sie den Buchungssatz für die Banklastschrift.", daten:{stueckzahl:200,kurs:31.00,kurswert:6200.00,spesen:62.00,lastschrift:6262.00}, loesung:{ soll:[{konto:"1500",name:"WP",betrag:6262.00}], haben:[{konto:"2800",name:"BK",betrag:6262.00}] } },
      { nr:"2.3.1", punkte:2, text:"Von VELOs Bankkonto werden Depotgebühren in Höhe von 32,00 € abgebucht. Erstellen Sie den Buchungssatz.", loesung:{ soll:[{konto:"6750",name:"KGV",betrag:32.00}], haben:[{konto:"2800",name:"BK",betrag:32.00}] } },
      {
        // FIX 1: VAWP korrekte Kontonummer 7460 (6700 = AWMP = Mieten/Pachten!)
        nr:"2.3.2", punkte:3, text:"VELO verkauft die Profit-Öl-AG-Aktien (Buchwert: 3.100,00 €). Die Bank schreibt nach Abzug der Spesen 2.650,00 € gut. Erstellen Sie den Buchungssatz.",
        daten:{buchwert:3100.00,gutschrift:2650.00,verlust:450.00},
        loesung:{ soll:[{konto:"2800",name:"BK",betrag:2650.00},{konto:"7460",name:"VAWP",betrag:450.00}], haben:[{konto:"1500",name:"WP",betrag:3100.00}] }
      },
      { nr:"2.3.3", punkte:4, text:"Berechnen Sie die effektive Verzinsung der Wertpapieranlage (EcoRide-Aktien). Gegeben: Besitzdauer 180 Tage, Dividende 85,00 €, Depotgebühren 32,00 €, Anschaffungskosten 3.100,00 €, Veräußerungserlös 2.650,00 €. Beurteilen Sie das Ergebnis.", loesung:{ nebenrechnung:["G/V: 2.650 – 3.100 = –450 €","Kapitalertrag: 85 – 32 – 450 = –397 €","EV: (–397 × 100 × 360) / (3.100 × 180) = –25,61 %"], ergebnis:-25.61, hinweis:"Die Anlage war wirtschaftlich nicht sinnvoll." } },
    ],
  },
];

// ── AUFGABE 3 – Deckungsbeitragsrechnung (~18 P) ─────────────────────────
export const AP_AUFGABE_3 = [
  {
    id:"A3-01", gesamtpunkte:18, unternehmenId:"HUBI", zweigwerk:"Eichstätt (Wechselrichter)", quartal:"2. Quartal 2025",
    modelle:[{name:"Eco-Smart",nvp:280.00,vk:175.00,menge:2400},{name:"Pro-Power",nvp:420.00,vk:310.00,menge:1800}],
    fixkosten:188700.00, kapazitaet:4500,
    teilaufgaben:[
      { nr:"3.1", punkte:6, text:"Berechnen Sie das Betriebsergebnis des Zweigwerks Eichstätt für das 2. Quartal 2025 mithilfe der Deckungsbeitragsrechnung. Fixkosten: 188.700,00 €.", loesung:{ schema:[{pos:"NVE",eco:672000,pro:756000},{pos:"– VK",eco:420000,pro:558000},{pos:"DB",eco:252000,pro:198000,gesamt:450000},{pos:"– FK",gesamt:188700},{pos:"Gewinn",gesamt:261300}] } },
      { nr:"3.2", punkte:2, text:`Beurteilen Sie die folgende Aussage und begründen Sie Ihre Antwort: „Eine Senkung der Fixkosten hat keinen Einfluss auf das Betriebsergebnis."`, loesung:"Die Aussage ist falsch. Eine Senkung der Fixkosten erhöht das Betriebsergebnis, da das Betriebsergebnis = Gesamtdeckungsbeitrag – Fixkosten ist." },
      { nr:"3.3", punkte:2, text:"Berechnen Sie die Kapazitätsauslastung des Zweigwerks Eichstätt im 2. Quartal 2025 in Prozent (Kapazität: 4.500 Stück).", loesung:{rechnung:"(2.400 + 1.800) × 100 / 4.500 = 93,33 %",ergebnis:93.33} },
      {
        // FIX 2: Nur korrekte Lösung (Pro-Power, DB 110 > 105)
        nr:"3.4.1", punkte:2, text:"Entscheiden Sie, welches Modell vorrangig durch verkaufsfördernde Maßnahmen gefördert werden sollte. Begründen Sie Ihre Entscheidung mithilfe des Deckungsbeitrags je Stück.",
        loesung:`Das Modell „Pro-Power" sollte gefördert werden, da es den höheren Deckungsbeitrag je Stück aufweist (110,00 € > 105,00 €). Dadurch wird das Betriebsergebnis stärker verbessert.`
      },
      { nr:"3.4.2", punkte:1, text:"Nennen Sie eine geeignete verkaufsfördernde Maßnahme für das ausgewählte Modell.", loesung:"z. B.: Rabattaktion / Messeteilnahme / Online-Werbung / Handelsrabatt" },
      { nr:"3.4.3", punkte:1, text:"Bestimmen Sie den Führungsstil von Maximilian Huber anhand der beschriebenen Situation.", loesung:"Kooperativer (demokratischer) Führungsstil" },
      { nr:"3.5", punkte:4, text:"HUBI benötigt 8.000 Kabelverbinder. Eigenfertigung: variable Kosten 0,80 €/Stück, Fixkosten 3.800,00 €. Fremdbezug: Listenpreis gesamt 8.000,00 €, Rabatt 5 %. Entscheiden Sie auf Basis eines Kostenvergleichs.", daten:{eigenfertigung:{vk:0.80,fixkosten:3800,menge:8000,gesamt:10200},fremdbezug:{listenpreis:8000,rabatt_pct:5,rabatt:400,zieleinstandspreis:7600}}, loesung:{rechnung:["EF: 8.000 × 0,80 + 3.800 = 10.200 €","FB: 8.000 – 5 % = 7.600 €","Entscheidung: Fremdbezug ist kostengünstiger (7.600 € < 10.200 €)."],entscheidung:"Fremdbezug"} },
    ],
  },
  {
    id:"A3-02", gesamtpunkte:18, unternehmenId:"VELO", zweigwerk:"Vilshofen (Fahrradhelme)", quartal:"3. Quartal 2025",
    modelle:[{name:"CityHelm",nvp:65.00,vk:38.00,menge:3600},{name:"ProHelm",nvp:120.00,vk:85.00,menge:2100}],
    fixkosten:147500.00, kapazitaet:6000,
    teilaufgaben:[
      { nr:"3.1", punkte:6, text:"Berechnen Sie das Betriebsergebnis des Zweigwerks Vilshofen für das 3. Quartal 2025 mithilfe der Deckungsbeitragsrechnung. Fixkosten: 147.500,00 €.", loesung:{ schema:[{pos:"NVE",city:234000,pro:252000},{pos:"– VK",city:136800,pro:178500},{pos:"DB",city:97200,pro:73500,gesamt:170700},{pos:"– FK",gesamt:147500},{pos:"Gewinn",gesamt:23200}] } },
      { nr:"3.2", punkte:2, text:`Beurteilen Sie die folgende Aussage und begründen Sie Ihre Antwort: „Eine Erhöhung des Nettoverkaufspreises hat keinen Einfluss auf den Deckungsbeitrag je Stück."`, loesung:"Die Aussage ist falsch. Ein höherer Nettoverkaufspreis steigert den Deckungsbeitrag je Stück (DB = NVP – variable Kosten je Stück)." },
      { nr:"3.3", punkte:2, text:"Berechnen Sie die Kapazitätsauslastung des Zweigwerks Vilshofen im 3. Quartal 2025 in Prozent (Kapazität: 6.000 Stück).", loesung:{rechnung:"(3.600 + 2.100) × 100 / 6.000 = 95,00 %",ergebnis:95.00} },
      { nr:"3.4.1", punkte:2, text:"Entscheiden Sie, welches Modell vorrangig durch verkaufsfördernde Maßnahmen gefördert werden sollte. Begründen Sie Ihre Entscheidung mithilfe des Deckungsbeitrags je Stück.", loesung:`Das Modell „ProHelm" sollte gefördert werden, da es den höheren Deckungsbeitrag je Stück aufweist (35,00 € > 27,00 €).` },
      { nr:"3.4.2", punkte:1, text:"Nennen Sie eine geeignete verkaufsfördernde Maßnahme für das ausgewählte Modell.", loesung:"z. B.: Teilnahme an Sportmessen / Social-Media-Kampagne / Kooperation mit Sportclubs" },
      { nr:"3.4.3", punkte:1, text:"Bestimmen Sie den Führungsstil von Sandra Berger anhand der beschriebenen Situation.", loesung:"Kooperativer (demokratischer) Führungsstil" },
      { nr:"3.5", punkte:4, text:"VELO benötigt 15.000 Schnallenverschlüsse. Eigenfertigung: variable Kosten 0,45 €/Stück, Fixkosten 5.100,00 €. Fremdbezug: Listenpreis gesamt 9.750,00 €, Rabatt 10 %. Entscheiden Sie auf Basis eines Kostenvergleichs.", loesung:{rechnung:["EF: 15.000 × 0,45 + 5.100 = 11.850 €","FB: 9.750 – 10 % = 8.775 €","Entscheidung: Fremdbezug ist kostengünstiger (8.775 € < 11.850 €)."]} },
    ],
  },
];

// ── AUFGABE 4 – Investition & Kostenvergleich (~19 P) ────────────────────
export const AP_AUFGABE_4 = [
  {
    id:"A4-01", gesamtpunkte:19, unternehmenId:"HUBI", maschine:"Laminiermaschine",
    teilaufgaben:[
      { nr:"4.1", punkte:2, text:"Erläutern Sie je ein wirtschaftliches und ein ökologisches Investitionsziel für die Anschaffung einer neuen, energieeffizienten Laminiermaschine bei HUBI.", loesung:"Wirtschaftliches Ziel: Betriebskosten senken / Produktionskapazität steigern. Ökologisches Ziel: CO₂-Ausstoß reduzieren / Energieverbrauch senken." },
      { nr:"4.2", punkte:1, text:"Nennen Sie einen Vorteil der Eigenfinanzierung gegenüber der Fremdfinanzierung.", loesung:"z. B.: keine Zinsbelastung / keine Abhängigkeit von Kreditgebern / volle Entscheidungsfreiheit" },
      { nr:"4.3.1", punkte:4, text:"Beurteilen Sie die Aussagen A–D zur abgebildeten Infografik über die installierte Solarleistung in Deutschland (in GW) als richtig oder falsch.", aussagen:[{buchstabe:"A",text:"Die Daten wurden in einem Liniendiagramm dargestellt.",richtig:false},{buchstabe:"B",text:"Die installierte Solarleistung in Deutschland ist seit 2015 kontinuierlich gestiegen.",richtig:true},{buchstabe:"C",text:"Deutschland zählt im europäischen Vergleich zu den führenden Ländern bei installierter Solarleistung.",richtig:true},{buchstabe:"D",text:"Solarenergie ist eine erneuerbare Energiequelle und trägt zur Reduzierung von CO₂-Emissionen bei.",richtig:true}], loesung:{A:"falsch – die Daten wurden in einem Balkendiagramm dargestellt.",B:"richtig",C:"richtig",D:"richtig"} },
      { nr:"4.3.2", punkte:1, text:"Berechnen Sie, welchen prozentualen Anteil 90 GW an der europäischen Gesamtsolarleistung von 420 GW ausmachen.", loesung:{rechnung:"90 × 100 / 420 = 21,43 %",ergebnis:21.43} },
      { nr:"4.4.1", punkte:3, text:"Berechnen Sie die Gesamtkosten über die Nutzungsdauer für Angebot 2 (Anschaffungskosten 36.000,00 €, AfA 7.200,00 €/Jahr, Zinssatz 7,5 %, variable Kosten 92.500,00 €).", loesung:{rechnung:["KZ: 36.000 × 7,5 / 200 = 1.350 €","Fix: 7.200 + 1.350 = 8.550 €","Gesamt: 92.500 + 8.550 = 101.050 €"],ergebnis:101050} },
      { nr:"4.4.2", punkte:2, text:"Nennen Sie zwei nicht-monetäre Kriterien, die für Angebot 1 sprechen.", loesung:"z. B.: kostenloser Wartungsservice (5 Jahre) / geringerer Flächenbedarf (18 m² vs. 24 m²) / kürzere Lieferzeit" },
      { nr:"4.4.3", punkte:3, text:"HUBI erhält die Rechnung für die Laminiermaschine (Angebot 1, Netto-Kaufpreis 38.000,00 €, 19 % USt). Erstellen Sie den Buchungssatz für den Rechnungseingang.", loesung:{ soll:[{konto:"0700",name:"MA",betrag:38000.00},{konto:"2600",name:"VORST",betrag:7220.00}], haben:[{konto:"4400",name:"VE",betrag:45220.00}] } },
      { nr:"4.5", punkte:3, text:"HUBI kauft per Karte einen Monitor für den Bürobetrieb. Laut Quittung: Netto 239,00 €, USt 45,41 €, Brutto 284,41 €. Erstellen Sie den Buchungssatz.", loesung:{ soll:[{konto:"0890",name:"GWG",betrag:239.00},{konto:"2600",name:"VORST",betrag:45.41}], haben:[{konto:"2800",name:"BK",betrag:284.41}], hinweis:"Buchung auf GWG, da Nettowert ≤ 800 €" } },
    ],
  },
  {
    id:"A4-02", gesamtpunkte:19, unternehmenId:"VELO", maschine:"Rahmenschweißautomat",
    teilaufgaben:[
      { nr:"4.1", punkte:2, text:"Erläutern Sie je ein soziales und ein wirtschaftliches Investitionsziel für die Anschaffung eines neuen Rahmenschweißautomaten bei VELO.", loesung:"Soziales Ziel: höhere Arbeitssicherheit / Entlastung der Mitarbeiter. Wirtschaftliches Ziel: Senkung der Fertigungskosten / Steigerung der Produktionskapazität." },
      { nr:"4.2", punkte:1, text:"Nennen Sie einen Vorteil der Fremdfinanzierung gegenüber der Eigenfinanzierung.", loesung:"z. B.: Erhalt der Liquidität (Eigenkapital bleibt verfügbar) / steuerliche Absetzbarkeit der Zinsen" },
      { nr:"4.3.1", punkte:4, text:"Beurteilen Sie die Aussagen A–D zur abgebildeten Infografik über den E-Bike-Absatz in Deutschland (in Mio. Stück) als richtig oder falsch.", aussagen:[{buchstabe:"A",text:"Die Absatzdaten wurden in einem Kreisdiagramm dargestellt.",richtig:false},{buchstabe:"B",text:"Der E-Bike-Absatz in Deutschland hat sich in den letzten Jahren deutlich erhöht.",richtig:true},{buchstabe:"C",text:"E-Bikes werden durch einen Elektromotor unterstützt und zählen zu umweltfreundlichen Fortbewegungsmitteln.",richtig:true},{buchstabe:"D",text:"Die steigende Nachfrage nach E-Bikes bietet Unternehmen wie VELO Wachstumschancen.",richtig:true}], loesung:{A:"falsch – die Daten wurden in einem Balkendiagramm dargestellt.",B:"richtig",C:"richtig",D:"richtig"} },
      { nr:"4.3.2", punkte:1, text:"Berechnen Sie den prozentualen Anstieg des E-Bike-Absatzes in Deutschland von 1,4 Mio. auf 5,1 Mio. Stück.", loesung:{rechnung:"(5,1 – 1,4) × 100 / 1,4 = 264,29 %",ergebnis:264.29} },
      { nr:"4.4.1", punkte:3, text:"Berechnen Sie die Gesamtkosten über die Nutzungsdauer für Angebot 2 (Anschaffungskosten 42.000,00 €, AfA 8.400,00 €/Jahr, Zinssatz 7,5 %, variable Kosten 95.000,00 €).", loesung:{rechnung:["KZ: 42.000 × 7,5 / 200 = 1.575 €","Fix: 8.400 + 1.575 = 9.975 €","Gesamt: 95.000 + 9.975 = 104.975 €"],ergebnis:104975} },
      { nr:"4.4.2", punkte:2, text:"Nennen Sie zwei nicht-monetäre Kriterien, die für Angebot 1 sprechen.", loesung:"z. B.: kostenloser technischer Support (3 Jahre) / kleinerer Flächenbedarf (16 m² vs. 22 m²) / kürzere Einarbeitungszeit" },
      { nr:"4.4.3", punkte:3, text:"VELO erhält die Rechnung für den Rahmenschweißautomaten (Angebot 1, Netto-Kaufpreis 44.000,00 €, 19 % USt). Erstellen Sie den Buchungssatz für den Rechnungseingang.", loesung:{ soll:[{konto:"0700",name:"MA",betrag:44000.00},{konto:"2600",name:"VORST",betrag:8360.00}], haben:[{konto:"4400",name:"VE",betrag:52360.00}] } },
      { nr:"4.5", punkte:3, text:"VELO kauft bar einen ergonomischen Bürostuhl für den Bürobetrieb. Laut Quittung: Netto 310,00 €, USt 58,90 €, Brutto 368,90 €. Erstellen Sie den Buchungssatz.", loesung:{ soll:[{konto:"0890",name:"GWG",betrag:310.00},{konto:"2600",name:"VORST",betrag:58.90}], haben:[{konto:"2880",name:"KA",betrag:368.90}] } },
    ],
  },
];

// ── AUFGABE 5 – Jahresabschluss & Kennzahlen (~16 P) ─────────────────────
export const AP_AUFGABE_5 = [
  {
    id:"A5-01", gesamtpunkte:16, unternehmenId:"HUBI", bilanzstichtag:"31.12.2025",
    teilaufgaben:[
      { nr:"5.1.1", punkte:3, text:"HUBI hat am 01.10.2025 einen Versicherungsbeitrag von 480,00 € für den Zeitraum 01.10.2025–30.09.2026 per Bank bezahlt. Erstellen Sie die Buchung zum Jahresabschluss 31.12.2025 (aktive Rechnungsabgrenzung).", daten:{betrag:480,monate_gj:3,monate_naechstes:9,ara:360,aufwand_gj:120}, loesung:{ nebenrechnung:["ARA: 480 / 12 × 9 = 360,00 €"], soll:[{konto:"2900",name:"ARA",betrag:360.00}], haben:[{konto:"6900",name:"VBEI",betrag:360.00}] } },
      { nr:"5.1.2", punkte:2, text:"HUBI hat im laufenden Geschäftsjahr ein geringwertiges Wirtschaftsgut (GWG) mit einem Nettowert von 4.750,00 € angeschafft. Erstellen Sie den Buchungssatz für die Abschreibung zum Jahresabschluss.", loesung:{ soll:[{konto:"6540",name:"ABGWG",betrag:4750.00}], haben:[{konto:"0890",name:"GWG",betrag:4750.00}] } },
      { nr:"5.2.1", punkte:2, text:"Erstellen Sie den Buchungssatz für den Abschluss des Eigenkapitalkontos (Schlussbestand laut SBK: 910.000,00 €).", loesung:{ soll:[{konto:"3000",name:"EK",betrag:910000}], haben:[{konto:"8010",name:"SBK",betrag:910000}] } },
      { nr:"5.2.2", punkte:4, text:"Berechnen Sie die Eigenkapitalrentabilität von HUBI (Jahresüberschuss: 184.000,00 €; Eigenkapital zu Jahresbeginn: 774.000,00 €). Beurteilen Sie das Ergebnis.", loesung:{rechnung:"184.000 × 100 / 774.000 = 23,77 %",ergebnis:23.77,beurteilung:"23,77 % deutlich über dem Kapitalmarktzins → sehr gut; das eingesetzte EK verzinst sich überdurchschnittlich."} },
      { nr:"5.3.1", punkte:4, text:"Berechnen Sie die Anlagendeckung II von HUBI (Anlagevermögen: 2.900.000,00 €; EK: 910.000,00 €; langfr. Fremdkapital: 2.500.000,00 €; kurzfr. Fremdkapital: 94.000,00 €). Beurteilen Sie das Ergebnis.", bilanz:{av:2900000,fm:74000,ek:910000,lfk:2500000,kfk:94000}, loesung:{rechnung:"(910.000 + 2.500.000) × 100 / 2.900.000 = 117,59 %",ergebnis:117.59,beurteilung:"117,59 % > 100 % → positiv; das Anlagevermögen ist vollständig durch langfristiges Kapital finanziert."} },
      { nr:"5.3.2", punkte:1, text:"Berechnen Sie die Barliquidität von HUBI (flüssige Mittel: 74.000,00 €; kurzfristiges Fremdkapital: 94.000,00 €).", loesung:{rechnung:"74.000 × 100 / 94.000 = 78,72 %",ergebnis:78.72} },
    ],
  },
  {
    id:"A5-02", gesamtpunkte:16, unternehmenId:"VELO", bilanzstichtag:"31.12.2025",
    teilaufgaben:[
      { nr:"5.1.1", punkte:3, text:"VELO hat am 01.09.2025 die Kfz-Steuer für den Zeitraum 01.09.2025–31.08.2026 in Höhe von 1.380,00 € per Bank bezahlt. Erstellen Sie die Buchung zum Jahresabschluss 31.12.2025 (aktive Rechnungsabgrenzung).", daten:{betrag:1380,monate_gj:4,monate_naechstes:8,ara:920,aufwand_gj:460}, loesung:{ nebenrechnung:["ARA: 1.380 / 12 × 8 = 920,00 €"], soll:[{konto:"2900",name:"ARA",betrag:920.00}], haben:[{konto:"7030",name:"KFZST",betrag:920.00}] } },
      { nr:"5.1.2", punkte:2, text:"VELO hat im laufenden Geschäftsjahr ein geringwertiges Wirtschaftsgut (GWG) mit einem Nettowert von 5.800,00 € angeschafft. Erstellen Sie den Buchungssatz für die Abschreibung zum Jahresabschluss.", loesung:{ soll:[{konto:"6540",name:"ABGWG",betrag:5800.00}], haben:[{konto:"0890",name:"GWG",betrag:5800.00}] } },
      { nr:"5.2.1", punkte:2, text:"Erstellen Sie den Buchungssatz für den Abschluss des Eigenkapitalkontos (Schlussbestand laut SBK: 805.000,00 €).", loesung:{ soll:[{konto:"3000",name:"EK",betrag:805000}], haben:[{konto:"8010",name:"SBK",betrag:805000}] } },
      { nr:"5.2.2", punkte:4, text:"Berechnen Sie die Eigenkapitalrentabilität von VELO (Jahresüberschuss: 129.000,00 €; Eigenkapital zu Jahresbeginn: 712.000,00 €). Beurteilen Sie das Ergebnis.", loesung:{rechnung:"129.000 × 100 / 712.000 = 18,12 %",ergebnis:18.12,beurteilung:"18,12 % über dem Kapitalmarktzins → gut; das eingesetzte EK verzinst sich überdurchschnittlich."} },
      { nr:"5.3.1", punkte:4, text:"Berechnen Sie die Anlagendeckung II von VELO (Anlagevermögen: 2.650.000,00 €; EK: 805.000,00 €; langfr. Fremdkapital: 2.200.000,00 €; kurzfr. Fremdkapital: 207.000,00 €). Beurteilen Sie das Ergebnis.", bilanz:{av:2650000,ek:805000,lfk:2200000,kfk:207000,fm:82000}, loesung:{rechnung:"(805.000 + 2.200.000) × 100 / 2.650.000 = 113,40 %",ergebnis:113.40,beurteilung:"113,40 % > 100 % → positiv; das Anlagevermögen ist vollständig durch langfristiges Kapital gedeckt."} },
      { nr:"5.3.2", punkte:1, text:"Berechnen Sie die Barliquidität von VELO (flüssige Mittel: 82.000,00 €; kurzfristiges Fremdkapital: 207.000,00 €).", loesung:{rechnung:"82.000 × 100 / 207.000 = 39,61 %",ergebnis:39.61} },
    ],
  },
];

// ── WAHLTEIL 6 – KLR / Kalkulation (~15 P) ───────────────────────────────
export const AP_WAHLTEIL_6 = [
  {
    id:"WT6-01", gesamtpunkte:15, unternehmenId:"HUBI", quartal:"3. Quartal 2025",
    teilaufgaben:[
      { nr:"6.1.1", punkte:2, text:"Die Materialgemeinkosten (MGK) betrugen im 1. Quartal 35.000,00 € und im 3. Quartal 49.000,00 €. Berechnen Sie den prozentualen Anstieg.", loesung:{rechnung:"(49.000 – 35.000) × 100 / 35.000 = 40,00 %",ergebnis:40.00} },
      { nr:"6.1.2", punkte:1, text:"Nennen Sie einen möglichen Grund für den Anstieg der Materialgemeinkosten.", loesung:"z. B.: gestiegene Energiekosten / höhere Rohstoffpreise / Preissteigerungen bei Betriebsstoffen" },
      { nr:"6.1.3", punkte:1, text:"Berechnen Sie den MGK-Zuschlagssatz für das 3. Quartal (MGK: 49.000,00 €; Fertigungsmaterial: 280.000,00 €).", loesung:{rechnung:"49.000 × 100 / 280.000 = 17,50 %",ergebnis:17.50} },
      { nr:"6.2", punkte:6, text:"Ermitteln Sie die Selbstkosten des Umsatzes für das 3. Quartal nach folgendem Schema: FM 280.000,00 €, FL 195.000,00 €, MGK 49.000,00 €, FGK 215.000,00 €, VwVt-GK 148.000,00 €, Mehrbestand FE 8.000,00 €.", loesung:{ schema:[{pos:"FM",betrag:280000},{pos:"+ MGK",betrag:49000},{pos:"= Materialkosten",betrag:329000},{pos:"+ FL",betrag:195000},{pos:"+ FGK",betrag:215000},{pos:"= Fertigungskosten",betrag:410000},{pos:"= HK der Erzeugung",betrag:739000},{pos:"– Mehrbestand FE",betrag:8000},{pos:"= HK des Umsatzes",betrag:731000},{pos:"+ VwVt-GK",betrag:148000},{pos:"= Selbstkosten",betrag:879000}] } },
      { nr:"6.3", punkte:2, text:"Erläutern Sie den Unterschied zwischen Einzelkosten und Gemeinkosten anhand je eines Beispiels.", loesung:"Einzelkosten: direkt einem Kostenträger zurechenbar, z. B. Fertigungsmaterial. Gemeinkosten: mehreren Kostenträgern gemeinsam, Verrechnung über Zuschlagssätze, z. B. Hallenmiete." },
      { nr:"6.4", punkte:3, text:"Eine Fremdfirma repariert eine Produktionsanlage von HUBI. Die Rechnung lautet auf 200,00 € netto zuzüglich 19 % USt. Erstellen Sie den Buchungssatz für den Rechnungseingang.", loesung:{ soll:[{konto:"6160",name:"FRI",betrag:200.00},{konto:"2600",name:"VORST",betrag:38.00}], haben:[{konto:"4400",name:"VE",betrag:238.00}] } },
    ],
  },
];

// ── WAHLTEIL 7 – Forderungsmanagement (~15 P) ─────────────────────────────
export const AP_WAHLTEIL_7 = [
  {
    id:"WT7-01", gesamtpunkte:15, unternehmenId:"HUBI",
    teilaufgaben:[
      { nr:"7.1.1", punkte:1, text:"Der aktuelle Basiszinssatz beträgt –0,50 %. Berechnen Sie den gesetzlichen Verzugszinssatz für Rechtsgeschäfte zwischen Unternehmern.", loesung:{rechnung:"–0,50 + 9 = 8,50 %",ergebnis:8.50} },
      { nr:"7.1.2", punkte:1, text:"Nennen Sie eine Quelle, bei der HUBI den jeweils aktuellen Basiszinssatz abrufen kann.", loesung:"Bundesanzeiger (der Basiszinssatz wird halbjährlich durch die Deutsche Bundesbank festgesetzt)" },
      { nr:"7.2", punkte:3, text:"HUBI schickt einem säumigen Kunden eine Mahnung und berechnet dabei Verzugszinsen von 48,20 € sowie eine Mahngebühr von 40,00 €. Erstellen Sie den Buchungssatz.", loesung:{ soll:[{konto:"2400",name:"FO",betrag:88.20}], haben:[{konto:"5710",name:"ZE",betrag:48.20},{konto:"5430",name:"ASBE",betrag:40.00}] } },
      { nr:"7.3", punkte:5, text:"Über einen Kunden von HUBI wurde das Insolvenzverfahren eröffnet. Die zweifelhafte Forderung (ZWFO) beträgt 23.800,00 € brutto. Die Insolvenzquote beträgt 30 %. Erstellen Sie den Buchungssatz für den Zahlungseingang und den endgültigen Forderungsausfall.", daten:{zweifo:23800,zahlungseingang:7140,bruttoausfall:16660,nettoausfall:14000,ust_ausfall:2660}, loesung:{ nebenrechnung:["ZI: 23.800 × 30 % = 7.140 €","BA: 23.800 × 70 % = 16.660 €","NA: 16.660 / 1,19 = 14.000 €"], soll:[{konto:"2800",name:"BK",betrag:7140.00},{konto:"6950",name:"ABFO",betrag:14000.00},{konto:"4800",name:"UST",betrag:2660.00}], haben:[{konto:"2470",name:"ZWFO",betrag:23800.00}] } },
      { nr:"7.4", punkte:1, text:"Nennen Sie eine Möglichkeit, wie sich HUBI zukünftig vor Forderungsausfällen schützen kann.", loesung:"z. B.: Factoring / Warenkreditversicherung / Vorauszahlung / Bonitätsprüfung der Kunden" },
      { nr:"7.5", punkte:4, text:"HUBI hat zum 31.12.2025 Forderungen in Höhe von 189.840,00 € brutto. Das pauschale Ausfallrisiko wird auf 1 % geschätzt. Erstellen Sie den Buchungssatz für die Pauschalwertberichtigung (PWB).", daten:{brutto:189840,netto:159529.41,pwb:1595.29}, loesung:{ nebenrechnung:["Netto: 189.840 / 1,19 = 159.529,41 €","PWB: 159.529,41 × 1 % = 1.595,29 €"], soll:[{konto:"6950",name:"ABFO",betrag:1595.29}], haben:[{konto:"3680",name:"PWB",betrag:1595.29}] } },
    ],
  },
];

// ── WAHLTEIL 8 – Beschaffung / Einkauf (~15 P) ───────────────────────────
export const AP_WAHLTEIL_8 = [
  {
    id:"WT8-01", gesamtpunkte:15, unternehmenId:"HUBI",
    teilaufgaben:[
      { nr:"8.1", punkte:2, text:"HUBI möchte seine Solarmodule zukünftig auch mit einem schwarzen Rahmen anbieten. Bestimmen Sie die Maßnahme der Programmgestaltung und erläutern Sie diese kurz.", loesung:"Produktdifferenzierung: Ein bereits vorhandenes Produkt wird in einer neuen Variante (verändertes Merkmal: schwarzer Rahmen) angeboten." },
      { nr:"8.2", punkte:5, text:"HUBI bezieht 200 m² Siliziumwafer. Listenpreis: 45,00 €/m², Rabatt: 8 %, Skonto: 2 %, Bezugskosten: 180,00 €. Ermitteln Sie den Einstandspreis.", daten:{menge:200,listenpreis_je:45,listpreis_gesamt:9000,rabatt_pct:8,rabatt:720,zielpreis:8280,skonto_pct:2,skonto:165.60,barpreis:8114.40,bezugskosten:180,einstandspreis:8294.40}, loesung:{ schema:[{pos:"LP (200 × 45)",betrag:9000},{pos:"– Rabatt 8 %",betrag:720},{pos:"= Zielpreis",betrag:8280},{pos:"– Skonto 2 %",betrag:165.60},{pos:"= Barpreis",betrag:8114.40},{pos:"+ Bezugskosten",betrag:180},{pos:"= Einstandspreis",betrag:8294.40}] } },
      {
        // FIX 3: USt 8.600 × 19 % = 1.662,50 €; RB = 10.412,50 €
        nr:"8.3.1", punkte:4, text:"HUBI erhält die Eingangsrechnung: 200 m² Siliziumwafer à 43,00 €, zuzüglich Leihverpackung 150,00 €, 19 % USt. Erstellen Sie den Buchungssatz für den Rechnungseingang.",
        daten:{ warenwert:8600.00, leihvp:150.00, ust:1662.50, rechnungsbetrag:10412.50 },
        loesung:{ soll:[{konto:"6000",name:"AWR",betrag:8600.00},{konto:"6001",name:"BZKR",betrag:150.00},{konto:"2600",name:"VORST",betrag:1662.50}], haben:[{konto:"4400",name:"VE",betrag:10412.50}] }
      },
      {
        // FIX 4: 10 m² × 43 € = 430 € netto; USt 81,70 €; Brutto 511,70 €
        nr:"8.3.2", punkte:3, text:"Bei der Wareneingangsprüfung stellt HUBI fest, dass 10 m² des Siliziumwafers unbrauchbar sind. Der Lieferant erteilt eine Gutschrift (10 m² × 43,00 € = 430,00 € netto, 19 % USt). Erstellen Sie den Buchungssatz.",
        daten:{brutto:511.70,netto:430.00,ust:81.70},
        loesung:{ soll:[{konto:"4400",name:"VE",betrag:511.70}], haben:[{konto:"6000",name:"AWR",betrag:430.00},{konto:"2600",name:"VORST",betrag:81.70}] }
      },
      { nr:"8.4", punkte:1, text:"Nennen Sie einen Vorteil einer größeren Bestellmenge gegenüber dem Prinzip der bedarfsgerechten Belieferung (Just-in-Time).", loesung:"z. B.: geringere Bestellkosten je Einheit / Schutz vor Lieferengpässen / Möglichkeit eines Mengenrabatts" },
    ],
  },
];

// ── HILFSFUNKTIONEN ───────────────────────────────────────────────────────
export function zufallsAuswahl(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generiereAPSatz() {
  return {
    unternehmen: zufallsAuswahl(AP_UNTERNEHMEN),
    aufgabe1:    zufallsAuswahl(AP_AUFGABE_1),
    aufgabe2:    zufallsAuswahl(AP_AUFGABE_2),
    aufgabe3:    zufallsAuswahl(AP_AUFGABE_3),
    aufgabe4:    zufallsAuswahl(AP_AUFGABE_4),
    aufgabe5:    zufallsAuswahl(AP_AUFGABE_5),
    wahlteil6:   zufallsAuswahl(AP_WAHLTEIL_6),
    wahlteil7:   zufallsAuswahl(AP_WAHLTEIL_7),
    wahlteil8:   zufallsAuswahl(AP_WAHLTEIL_8),
  };
}

export function gesamtpunkte(satz, wahlaufgabe = "wahlteil6") {
  const pflicht = ["aufgabe1","aufgabe2","aufgabe3","aufgabe4","aufgabe5"]
    .reduce((sum, k) => sum + (satz[k]?.gesamtpunkte ?? 0), 0);
  return pflicht + (satz[wahlaufgabe]?.gesamtpunkte ?? 0);
}
