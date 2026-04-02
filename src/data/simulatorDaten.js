// ══════════════════════════════════════════════════════════════════════════════
// Simulator-Daten – Banking Simulator Aufgaben, Kalender + Hilfsfunktionen
// Extrahiert aus BuchungsWerk.jsx – Phase D1 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import { LIEFERANTEN } from "./stammdaten.js";

// ══════════════════════════════════════════════════════════════════════════════
// BANKING SIMULATOR – Klasse 7
// ══════════════════════════════════════════════════════════════════════════════

export const BANK_IBAN = "DE12 8001 0010 0000 3456 78";
export const BANK_START = 20000;

export const BANK_AUFGABEN = [
  { id:"b1",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Miete abgebucht",
    story:"Im Kontoauszug siehst du folgende Abbuchung:",
    transaktion:{ datum:"03.01.2026", text:"Miete Januar · SEPA-Lastschrift · Immobilien Müller GmbH", betrag:-2400 },
    aufgabe:"Welcher Buchungssatz gehört zu dieser Kontoabbuchung?",
    soll:[{kuerzel:"AWMP",name:"Mieten und Pachten"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:2400,
    erklaerung:"Miete ist betrieblicher Aufwand → Soll: AWMP. Das Geld verlässt das Bankkonto → Haben: BK." },
  { id:"b2",  ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"Lieferantenrechnung überweisen",
    story:"Bayern Rohstoffe GmbH (IBAN: DE12 7205 0101 0012 3456 78) hat eine Rechnung gestellt: 3.500 €, Ref.: RE-2026-0112. Überweise den Betrag.",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"Bayern Rohstoffe GmbH", iban:"DE12 7205 0101 0012 3456 78", betrag:"3500", verwendung:"RE-2026-0112" },
    aufgabe:"Welcher Buchungssatz wird durch diese Banküberweisung ausgelöst?",
    soll:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:3500,
    erklaerung:"Verbindlichkeit wird beglichen → Soll: VE. Bankabgang → Haben: BK." },
  { id:"b3",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Versicherungsprämie",
    story:"Die Betriebshaftpflicht hat per Lastschrift abgebucht:",
    transaktion:{ datum:"15.01.2026", text:"ALLIANZ Versicherung · Prämie Q1 2026", betrag:-780 },
    aufgabe:"Buche diese Lastschrift korrekt.",
    soll:[{kuerzel:"VBEI",name:"Versicherungsbeiträge"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:780,
    erklaerung:"Versicherungsprämie = Versicherungsbeiträge → Soll: VBEI. Bankabbuchung → Haben: BK." },
  { id:"b4",  ansicht:"dauerauftrag", punkte:3, aktion:"dauerauftrag",
    titel:"Dauerauftrag einrichten",
    story:"Immobilien Müller GmbH (IBAN: DE45 7002 0070 0012 3456 78) vermietet euch das Büro für 1.800 € monatlich, Zahlung am 1. jeden Monats. Richte den Dauerauftrag ein.",
    dauerauftragsDaten:{ empfaenger:"Immobilien Müller GmbH", iban:"DE45 7002 0070 0012 3456 78", betrag:"1800", verwendung:"Miete Büro", rhythmus:"monatlich", tag:"1" },
    aufgabe:"Was bucht man buchhalterisch, wenn der Dauerauftrag ausgeführt wird?",
    soll:[{kuerzel:"AWMP",name:"Mieten, Pachten"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:1800,
    erklaerung:"Dauerauftrag = Miete (Aufwand AWMP) wird vom Bankkonto (BK) überwiesen." },
  { id:"b5",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Kundenzahlung eingegangen",
    story:"Auf dem Konto ist folgende Gutschrift eingegangen:",
    transaktion:{ datum:"18.01.2026", text:"Schmidt AG · RE-2026-0089 · Zahlung", betrag:+4200 },
    aufgabe:"Welcher Buchungssatz gehört zu diesem Zahlungseingang?",
    soll:[{kuerzel:"BK",name:"Bank"}], haben:[{kuerzel:"FO",name:"Forderungen aus L+L"}], betrag:4200,
    erklaerung:"Geld kommt aufs Konto → Soll: BK. Forderung erlischt → Haben: FO." },
  { id:"b6",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Gehaltsüberweisungen Januar",
    story:"Ende Januar wurden Löhne und Gehälter per Banküberweisung ausgezahlt:",
    transaktion:{ datum:"31.01.2026", text:"Gehaltsüberweisung Januar 2026 · 5 Mitarbeiter", betrag:-8500 },
    aufgabe:"Buche die Gehaltszahlung.",
    soll:[{kuerzel:"LG",name:"Löhne und Gehälter"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:8500,
    erklaerung:"Gehälter = Personalaufwand → Soll: LG. Bankabgang → Haben: BK." },
  { id:"b7",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Telefonrechnung",
    story:"Der Telekommunikationsanbieter hat die monatliche Rechnung per Lastschrift eingezogen:",
    transaktion:{ datum:"22.01.2026", text:"Telekom · Festnetz & Internet Januar", betrag:-129 },
    aufgabe:"Buche diese Lastschrift.",
    soll:[{kuerzel:"KOM",name:"Kommunikationsgebühren"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:129,
    erklaerung:"Telefonkosten = Kommunikationsgebühren → Soll: KOM. Bankabgang → Haben: BK." },
  { id:"b8",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Kasseneinlage",
    story:"Das Unternehmen zahlt 1.500 € Bargeld auf das Bankkonto ein:",
    transaktion:{ datum:"25.01.2026", text:"Bareinzahlung Kasse · Filiale München", betrag:+1500 },
    aufgabe:"Buche diese Kasseneinlage auf das Bankkonto.",
    soll:[{kuerzel:"BK",name:"Bank"}], haben:[{kuerzel:"KA",name:"Kasse"}], betrag:1500,
    erklaerung:"Geld kommt auf Bankkonto → Soll: BK. Kasse wird geleert → Haben: KA." },
  { id:"b9",  ansicht:"konto",        punkte:2, aktion:"buchung",
    titel:"Bankgebühren",
    story:"Die BayernBank bucht monatliche Kontoführungsgebühren ab:",
    transaktion:{ datum:"31.01.2026", text:"BayernBank AG · Kontoführung Januar 2026", betrag:-18.50 },
    aufgabe:"Buche diese Bankgebühr.",
    soll:[{kuerzel:"KGV",name:"Kosten des Geldverkehrs"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:18.50,
    erklaerung:"Bankgebühren = Kosten des Geldverkehrs → Soll: KGV. Bankabgang → Haben: BK." },
  { id:"b10", ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"Werbekosten bezahlen",
    story:"Bayern Medien GmbH (IBAN: DE89 7001 0080 0012 3456 78) hat eine Rechnung für Werbeanzeigen gestellt: 450 €, Ref.: Rechnung 2026-0045 Werbung. Führe die Überweisung durch.",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"Bayern Medien GmbH", iban:"DE89 7001 0080 0012 3456 78", betrag:"450", verwendung:"Rechnung 2026-0045 Werbung" },
    aufgabe:"Welcher Buchungssatz entsteht durch diese Überweisung?",
    soll:[{kuerzel:"WER",name:"Werbung"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:450,
    erklaerung:"Werbekosten = Werbung → Soll: WER. Bankabgang → Haben: BK." },

  { id:"b11", ansicht:"beleg", punkte:4, aktion:"beleg",
    titel:"Eingangsrechnung überweisen",
    story:"Du hast folgende Eingangsrechnung erhalten. Gib die Überweisung korrekt ein und buche den Vorgang.",
    transaktion:null,
    belegDaten:{
      typ:"eingangsrechnung",
      absenderName:"Bayern Bürobedarf GmbH",
      absenderAdresse:"Kaufingerstr. 12, 80331 München",
      absenderIBAN:"DE33 7002 0270 0012 3456 89",
      rechnungsnummer:"RE-2026-0198",
      datum:"07.02.2026",
      faellig:"21.02.2026",
      positionen:[
        { menge:5, einheit:"Stk.", beschreibung:"Ordner A4 breit, blau", einzelpreis:3.20, gesamt:16.00 },
        { menge:10, einheit:"Stk.", beschreibung:"Kugelschreiber Set", einzelpreis:2.40, gesamt:24.00 },
        { menge:2, einheit:"Pck.", beschreibung:"Kopierpapier A4 500 Blatt", einzelpreis:5.00, gesamt:10.00 },
      ],
      netto:50.00, brutto:50.00,
      verwendung:"RE-2026-0198 Bürobedarf",
    },
    ueberweisungsDaten:{ empfaenger:"Bayern Bürobedarf GmbH", iban:"DE33 7002 0270 0012 3456 89", betrag:"50", verwendung:"RE-2026-0198 Bürobedarf" },
    aufgabe:"Buche die Bezahlung dieser Rechnung.",
    soll:[{kuerzel:"BMK",name:"Büromaterial und Kleingüter"}], haben:[{kuerzel:"BK",name:"Bank"}], betrag:50,
    erklaerung:"Büromaterial = Büromaterial und Kleingüter → Soll: BMK. Banküberweisung → Haben: BK." },

  { id:"b12", ansicht:"beleg", punkte:4, aktion:"beleg",
    titel:"Ausgangsrechnung eintragen",
    story:"Du hast an einen Kunden geliefert und folgende Ausgangsrechnung geschrieben. Überweise noch ausstehende Positionen und buche die Forderung als eingegangen.",
    transaktion:null,
    belegDaten:{
      typ:"ausgangsrechnung",
      absenderName:"Schmidt Handels AG",
      absenderAdresse:"Leopoldstr. 5, 80802 München",
      absenderIBAN:"DE44 7001 0080 0001 2345 67",
      rechnungsnummer:"AR-2026-0055",
      datum:"12.02.2026",
      faellig:"26.02.2026",
      positionen:[
        { menge:3, einheit:"Stk.", beschreibung:"Bürostuhl Modell Comfort", einzelpreis:189.00, gesamt:567.00 },
        { menge:1, einheit:"Stk.", beschreibung:"Schreibtisch Profi 160 cm", einzelpreis:233.00, gesamt:233.00 },
      ],
      netto:800.00, brutto:800.00,
      verwendung:"AR-2026-0055 Warenlieferung",
    },
    ueberweisungsDaten:{ empfaenger:"Schmidt Handels AG", iban:"DE44 7001 0080 0001 2345 67", betrag:"800", verwendung:"AR-2026-0055 Warenlieferung" },
    aufgabe:"Der Kunde hat die Rechnung bezahlt. Welcher Buchungssatz entsteht beim Zahlungseingang?",
    soll:[{kuerzel:"BK",name:"Bank"}], haben:[{kuerzel:"FO",name:"Forderungen aus L+L"}], betrag:800,
    erklaerung:"Geld kommt aufs Bankkonto → Soll: BK. Die Forderung erlischt → Haben: FO." },

  // ── Theorieaufgaben (Multiple Choice) ─────────────────────────────────────
  { id:"t1", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Buchungssatz",
    story:"Grundregel der doppelten Buchführung: Jeder Buchungssatz hat eine Soll- und eine Haben-Seite.",
    aufgabe:"Welche Reihenfolge gilt im Buchungssatz?",
    mcOptionen:["Soll-Konto an Haben-Konto","Haben-Konto an Soll-Konto","Aktivkonto an Passivkonto","Ertrags- an Aufwandskonto"],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Ein Buchungssatz lautet immer: Soll-Konto an Haben-Konto. Beispiel: AWMP an BK." },

  { id:"t2", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Kontotypen",
    story:"Bestandskonten teilen sich in Aktiv- und Passivkonten auf.",
    aufgabe:"Was ist die Kasse (KA) für ein Kontotyp?",
    mcOptionen:["Passivkonto (Schulden)","Erfolgskonto (Aufwand)","Aktivkonto (Vermögen)","Abschlusskonto"],
    mcKorrekt:2, soll:[], haben:[], betrag:0,
    erklaerung:"Die Kasse (KA) ist ein Aktivkonto – sie zählt zum Vermögen des Unternehmens (Aktivseite der Bilanz)." },

  // ── Kalkulationsaufgaben ───────────────────────────────────────────────────
  { id:"k1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Kalkulation: Eigenkapital",
    story:"Die Eröffnungsbilanz zeigt: Aktiva insgesamt 48.000 €, Verbindlichkeiten aus L+L (VE) 13.000 €.",
    aufgabe:"Berechne das Eigenkapital (EK = Aktiva − Schulden).",
    kalkulation:{ richtigerWert:35000, einheit:"€" },
    soll:[], haben:[], betrag:35000,
    erklaerung:"Eigenkapital = Aktiva − Schulden = 48.000 € − 13.000 € = 35.000 €" },

  { id:"k2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie", nurMitUst:true,
    titel:"Kalkulation: Bruttobetrag",
    story:"Eine Eingangsrechnung zeigt: Nettobetrag 500 €, Umsatzsteuer 19 %.",
    aufgabe:"Berechne den Bruttobetrag (Netto + 19 % USt).",
    kalkulation:{ richtigerWert:595, einheit:"€" },
    soll:[], haben:[], betrag:595,
    erklaerung:"Brutto = Netto × 1,19 = 500 × 1,19 = 595 €" },

  // ── Lückentext-Aufgaben (Kl. 7) ──────────────────────────────────────────
  { id:"lt7_1", typ:"lueckentext", ansicht:"konto", punkte:2, aktion:"lueckentext",
    titel:"Lückentext: Buchungssatz Miete",
    story:"Dein Chef schickt dir eine Notiz: Bitte vervollständige den Buchungssatz für die monatliche Miete (2.400,00 €, Bankabbuchung).",
    aufgabe:"Fülle die fehlenden Kürzel im Buchungssatz aus.",
    lueckentext:{
      template:"[L0] (6700) an [L1] (2800) — 2.400,00 €",
      luecken:[
        { id:0, hinweis:"Miet-Aufwand (Kürzel z.B. AWMP)",  korrekt:"AWMP" },
        { id:1, hinweis:"Bankkonto (Kürzel z.B. BK)",        korrekt:"BK"   }
      ]
    },
    soll:[{kuerzel:"AWMP",nr:"6700"}], haben:[{kuerzel:"BK",nr:"2800"}], betrag:2400,
    erklaerung:"Miete: AWMP (6700) im Soll – Aufwand steigt. Bank: BK (2800) im Haben – Bankguthaben sinkt." },

  // ── Zuordnung-Aufgaben (Kl. 7) ───────────────────────────────────────────
  { id:"zu7_1", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Zuordnung: Aktiv- oder Passivkonto?",
    story:"Dein Chef fragt: Auf welche Seite der Bilanz gehören diese Konten?",
    aufgabe:"Ordne jedes Konto der richtigen Bilanzseite zu.",
    zuordnung:{
      items:[
        { id:"BK", text:"BK – Bank",                      korrektKat:"A" },
        { id:"KA", text:"KA – Kasse",                     korrektKat:"A" },
        { id:"VE", text:"VE – Verbindlichkeiten aus L+L",  korrektKat:"P" },
        { id:"EK", text:"EK – Eigenkapital",               korrektKat:"P" },
        { id:"FO", text:"FO – Forderungen aus L+L",        korrektKat:"A" },
      ],
      kategorien:[
        { id:"A", label:"Aktivseite (Vermögen)", color:"#10b981", rgb:"16,185,129" },
        { id:"P", label:"Passivseite (Kapital)",  color:"#a855f7", rgb:"168,85,247" },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Aktiv (Vermögen): BK, KA, FO. Passiv (Kapital): VE (Schulden), EK (Eigenkapital). Aktiva = Mittelverwendung, Passiva = Mittelherkunft." },

  // ── Freitext-Aufgaben (Kl. 7) ─────────────────────────────────────────────
  { id:"ft7_1", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Grundsätze ordnungsgem. Buchführung",
    story:"Dein Chef fragt dich vor dem Steuerberater-Termin: Was bedeuten eigentlich die GoB?",
    aufgabe:"Erkläre in 2–3 Sätzen: Was sind die Grundsätze ordnungsgemäßer Buchführung (GoB) und wozu dienen sie?",
    freitext:{ zeilen:4, minZeichen:40,
      loesung:"Die GoB (Grundsätze ordnungsgemäßer Buchführung, §238 HGB) regeln, wie die Buchführung zu erfolgen hat. Wichtige Grundsätze sind: Vollständigkeit, Richtigkeit, Zeitgerechtheit, Klarheit und das Belegprinzip (keine Buchung ohne Beleg). Ziel: Dritte (z.B. Finanzamt, Gläubiger) sollen sich ein klares Bild der wirtschaftlichen Lage machen können." },
    erklaerung:"GoB: Grundsätze ordnungsgem. Buchführung – Vollständigkeit, Richtigkeit, Zeitgerechtheit, Klarheit, Belegprinzip. Rechtsgrundlage: §238 HGB. Klasse 7, LB 3." },

  { id:"ft7_2", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Bestandskonto vs. Erfolgskonto",
    story:"Dein Mitschüler Leo fragt dich: Was ist der Unterschied zwischen einem Bestandskonto und einem Erfolgskonto?",
    aufgabe:"Erkläre den Unterschied zwischen Bestandskonto und Erfolgskonto. Nenne je ein Beispiel.",
    freitext:{ zeilen:4, minZeichen:40,
      loesung:"Bestandskonten zeigen, was ein Unternehmen HAT (Vermögen) oder SCHULDET (Kapital). Sie erscheinen in der Bilanz und werden am Jahresende über den SBK abgeschlossen. Beispiel: BK (Bank), VE (Verbindlichkeiten). Erfolgskonten zeigen Aufwendungen oder Erträge einer Periode. Sie werden über die GuV abgeschlossen. Beispiel: LG (Löhne, Aufwand), UEFE (Umsatzerlöse, Ertrag)." },
    erklaerung:"Bestandskonten: Bilanz (Aktiv/Passiv) → SBK-Abschluss. Erfolgskonten: GuV (Aufwand/Ertrag) → GuV-Abschluss. Kl.7 LB 3/5." },

  // ── Prozentrechnung (Kl. 7 LB1) ───────────────────────────────────────────
  { id:"pz7_1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Rabattbetrag",
    story:"Dein Chef zeigt dir das Angebot von Bayern Bürobedarf GmbH: Listenpreis 320,00 €, Sofortrabatt 25 %.",
    aufgabe:"Berechne den Rabattbetrag (Grundwert × Prozentsatz).",
    kalkulation:{ richtigerWert:80, einheit:"€" },
    soll:[], haben:[], betrag:80,
    erklaerung:"Rabattbetrag = Listenpreis × Rabattsatz = 320,00 € × 0,25 = 80,00 €. (Kl.7 LB1 – Dreisatz/Prozentrechnung)" },

  { id:"pz7_2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Zieleinkaufspreis nach Rabatt",
    story:"Gleiche Rechnung: Listenpreis 320,00 €, Sofortrabatt 25 %. Du hast den Rabattbetrag (80,00 €) bereits ermittelt.",
    aufgabe:"Berechne den Zieleinkaufspreis (Listenpreis − Rabattbetrag).",
    kalkulation:{ richtigerWert:240, einheit:"€" },
    soll:[], haben:[], betrag:240,
    erklaerung:"Zieleinkaufspreis = 320,00 € − 80,00 € = 240,00 €. Wird auf dem Überweisungsformular als Zahlungsbetrag eingetragen. (Kl.7 LB1)" },

  { id:"pz7_3", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Skontobetrag",
    story:"Bayern Rohstoffe GmbH schickt eine Rechnung über 850,00 € mit dem Hinweis: '2 % Skonto bei Zahlung innerhalb 10 Tagen'.",
    aufgabe:"Berechne den Skontobetrag (Rechnungsbetrag × Skontosatz).",
    kalkulation:{ richtigerWert:17, einheit:"€" },
    soll:[], haben:[], betrag:17,
    erklaerung:"Skontobetrag = 850,00 € × 0,02 = 17,00 €. Skonto ist ein Preisnachlass bei früher Zahlung. (Kl.7 LB1)" },

  { id:"pz7_4", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Zahlbetrag nach Skonto",
    story:"Rechnungsbetrag 850,00 €, Skonto 2 % (= 17,00 €). Zahlung erfolgt innerhalb der Skontofrist.",
    aufgabe:"Berechne den Zahlbetrag (Rechnungsbetrag − Skontobetrag).",
    kalkulation:{ richtigerWert:833, einheit:"€" },
    soll:[], haben:[], betrag:833,
    erklaerung:"Zahlbetrag = 850,00 € − 17,00 € = 833,00 €. Dieser Betrag wird überwiesen. (Kl.7 LB1)" },

  { id:"pz7_5", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Umsatzsteuer-Betrag",
    story:"Dein Unternehmen kauft Büromaterial. Nettobetrag laut Rechnung: 600,00 €. Umsatzsteuer: 19 %.",
    aufgabe:"Berechne den Umsatzsteuerbetrag (Netto × 19 %).",
    kalkulation:{ richtigerWert:114, einheit:"€" },
    soll:[], haben:[], betrag:114,
    erklaerung:"USt = 600,00 € × 0,19 = 114,00 €. Die Umsatzsteuer wird als Vorsteuer (VORST) auf den Kontoauszug verbucht (ab Kl. 8). (Kl.7 LB1)" },

  { id:"pz7_6", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Grundwert ermitteln",
    story:"Die Rechnung weist einen Rabattbetrag von 45,00 € aus. Der Rabattsatz beträgt 15 %.",
    aufgabe:"Berechne den Grundwert (= Listenpreis). Formel: G = W ÷ p%",
    kalkulation:{ richtigerWert:300, einheit:"€" },
    soll:[], haben:[], betrag:300,
    erklaerung:"Grundwert = Prozentwert ÷ Prozentsatz = 45,00 € ÷ 0,15 = 300,00 €. (Kl.7 LB1 – Dreisatz)" },

  { id:"pz7_7", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Prozentrechnung: Prozentsatz ermitteln",
    story:"Der Listenpreis einer Maschine beträgt 500,00 €. Der Händler gewährt einen Rabatt von 75,00 €.",
    aufgabe:"Berechne den Rabattsatz in % (Formel: p% = W ÷ G × 100).",
    kalkulation:{ richtigerWert:15, einheit:"%" },
    soll:[], haben:[], betrag:15,
    erklaerung:"Prozentsatz = 75,00 € ÷ 500,00 € × 100 = 15 %. (Kl.7 LB1 – Dreisatz)" },

  // ── Schaubild-Aufgaben (Kl. 7) ────────────────────────────────────────────
  { id:"sb7_1", typ:"mc", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Schaubild: Kostenstruktur LumiTec GmbH",
    story:"Die LumiTec GmbH hat ihre jährlichen Ausgaben nach Kostenart ausgewertet. Schau dir das Schaubild an.",
    schaubild:{
      typ:"balken",
      titel:"Kostenstruktur LumiTec GmbH (2025)",
      untertitel:"Jährliche Ausgaben nach Kostenart in €",
      einheit:"€",
      quelle:"Unternehmensbericht 2025",
      herausgeber:"Fiktive Daten – Übungszweck",
      kategorien:["Personalkosten","Wareneinkauf","Miete","Werbung","Sonstiges"],
      werte:[52000, 38000, 14400, 4500, 6100]
    },
    aufgabe:"Welcher Kostenfaktor ist der größte Ausgabenposten der LumiTec GmbH?",
    mcOptionen:["Wareneinkauf (38.000 €)","Personalkosten (52.000 €)","Miete (14.400 €)","Werbung (4.500 €)"],
    mcKorrekt:1, soll:[], haben:[], betrag:0,
    erklaerung:"Personalkosten (52.000 €) sind der größte Posten. In produzierenden Betrieben machen Löhne/Gehälter (LG) und Sozialabgaben (AGASV) oft 40–60 % der Gesamtkosten aus. (Kl.7 LB4)" },

  { id:"sb7_2", typ:"mc", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Schaubild: Umsatzentwicklung Waldform Design GmbH",
    story:"Die Waldform Design GmbH zeigt in der Betriebsversammlung die Umsatzentwicklung der letzten 5 Jahre.",
    schaubild:{
      typ:"linie",
      titel:"Umsatzentwicklung Waldform Design GmbH",
      untertitel:"Nettoumsatz in €, 2021–2025",
      einheit:"€",
      quelle:"Geschäftsbericht Waldform Design GmbH",
      herausgeber:"Fiktive Daten – Übungszweck",
      jahre:["2021","2022","2023","2024","2025"],
      werte:[95000, 112000, 108000, 124000, 138000]
    },
    aufgabe:"In welchem Jahr ist der Umsatz der Waldform Design GmbH im Vergleich zum Vorjahr gesunken?",
    mcOptionen:["2022 (von 95.000 auf 112.000 €)","2023 (von 112.000 auf 108.000 €)","2024 (von 108.000 auf 124.000 €)","2025 (von 124.000 auf 138.000 €)"],
    mcKorrekt:1, soll:[], haben:[], betrag:0,
    erklaerung:"2023 ist der Umsatz von 112.000 € (2022) auf 108.000 € gesunken – ein Rückgang von 4.000 €. In allen anderen Jahren stieg der Umsatz. (Kl.7 LB2 – Schaubild lesen)" },

  // ── Paare zuordnen (Kl. 7) ────────────────────────────────────────────────
  { id:"pa7_1", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Paare zuordnen: Kürzel → Kontoname",
    story:"Dein Chef zeigt dir einen Kontenplan-Auszug. Ordne jedem Konto-Kürzel den richtigen vollständigen Kontonamen zu.",
    aufgabe:"Welcher Kontoname gehört zu welchem Kürzel?",
    zuordnung:{
      items:[
        { id:"BK",  text:"BK",  korrektKat:"bank"   },
        { id:"KA",  text:"KA",  korrektKat:"kasse"  },
        { id:"VE",  text:"VE",  korrektKat:"verb"   },
        { id:"FO",  text:"FO",  korrektKat:"ford"   },
        { id:"LG",  text:"LG",  korrektKat:"loehne" },
      ],
      kategorien:[
        { id:"bank",   label:"Bank",                     color:"#e8600a", rgb:"232,96,10"  },
        { id:"kasse",  label:"Kasse",                    color:"#10b981", rgb:"16,185,129" },
        { id:"verb",   label:"Verbindlichkeiten aus L+L",color:"#a855f7", rgb:"168,85,247" },
        { id:"ford",   label:"Forderungen aus L+L",      color:"#3b82f6", rgb:"59,130,246" },
        { id:"loehne", label:"Löhne und Gehälter",       color:"#eab308", rgb:"234,179,8"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"BK=Bank, KA=Kasse, VE=Verbindlichkeiten aus L+L, FO=Forderungen aus L+L, LG=Löhne und Gehälter. Kürzel auswendig lernen – sie stehen in jedem Buchungssatz! (Kl.7 LB2)" },

  { id:"pa7_2", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Paare zuordnen: Buchungsregel → Kontentyp",
    story:"Dein Buchführungslehrer erklärt die vier Grundregeln der doppelten Buchführung. Ordne jede Regel dem richtigen Kontentyp zu.",
    aufgabe:"Zu welchem Kontentyp gehört welche Buchungsregel?",
    zuordnung:{
      items:[
        { id:"r1", text:"Zugänge im SOLL · Abgänge im HABEN",  korrektKat:"aktiv"   },
        { id:"r2", text:"Zugänge im HABEN · Abgänge im SOLL",  korrektKat:"passiv"  },
        { id:"r3", text:"Aufwand erhöht sich immer im SOLL",   korrektKat:"aufwand" },
        { id:"r4", text:"Ertrag erhöht sich immer im HABEN",   korrektKat:"ertrag"  },
      ],
      kategorien:[
        { id:"aktiv",   label:"Aktivkonto (Vermögen)",  color:"#10b981", rgb:"16,185,129" },
        { id:"passiv",  label:"Passivkonto (Kapital)",  color:"#a855f7", rgb:"168,85,247" },
        { id:"aufwand", label:"Aufwandskonto (GuV)",    color:"#ef4444", rgb:"239,68,68"  },
        { id:"ertrag",  label:"Ertragskonto (GuV)",     color:"#22c55e", rgb:"34,197,94"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Aktivkonten: Zugänge im Soll (Vermögen wächst). Passivkonten: Zugänge im Haben (Schulden/EK wächst). Aufwandskonto: Soll = Aufwand steigt, mindert GuV. Ertragskonto: Haben = Ertrag steigt, erhöht GuV. (Kl.7 LB3)" },

  // ── Sequenzkette Kl. 7 (LB4) ─────────────────────────────────────────────
  { id:"kette7_1", typ:"kette", ansicht:"konto", punkte:5, aktion:"kette",
    titel:"Rohstoffeinkauf: E-Mail → Fälligkeit → Buchung",
    story:"Bayern Rohstoffe GmbH hat Siliziumscheiben für die Produktion von LumiTec GmbH geliefert. Im E-Mail-Postfach liegt eine Lieferantenbenachrichtigung.",
    soll:[], haben:[], betrag:0,
    erklaerung:"Rohstoffzukauf auf Ziel: 6000 AWR an 4400 VE. Kl.7 LB4.",
    kette:[
      { typ:"mc", punkte:1, label:"E-Mail lesen",
        aufgabe:"Bayern Rohstoffe GmbH – Betreff: Lieferung Siliziumscheiben, Rg.-Nr. BR-2026-0115\n\nSehr geehrte Damen und Herren,\nhiermit bestätigen wir die Lieferung von 500 kg Siliziumscheiben.\nNettobetrag: 350,00 €  ·  Rechnungsdatum: 10.01.2026  ·  Zahlungsziel: 14 Tage\n\nWie hoch ist der Rechnungsbetrag?",
        mcOptionen:["200,00 €","280,00 €","350,00 €","420,00 €"],
        mcKorrekt:2,
        erklaerung:"Der Nettobetrag steht direkt in der E-Mail: 350,00 €. Immer Beleg prüfen – GoB: Belegprinzip!" },
      { typ:"mc", punkte:1, label:"Fälligkeit prüfen",
        aufgabe:"Rechnungsdatum: 10. Januar 2026  ·  Zahlungsziel: 14 Tage\n\nBis wann muss LumiTec GmbH spätestens zahlen?\n(Tipp: Zähle 14 Tage ab dem 10. Januar!)",
        mcOptionen:["17. Januar 2026","24. Januar 2026","31. Januar 2026","10. Februar 2026"],
        mcKorrekt:1,
        erklaerung:"10. Jan + 14 Tage = 24. Januar 2026. Dieser Termin gehört als Zahlungsfrist in den Kalender – so wird keine Mahnung fällig!" },
      { typ:"buchung", punkte:3, label:"Buchungssatz",
        aufgabe:"Buche den Rohstoffeinkauf auf Ziel:\nSiliziumscheiben, 350,00 € (ohne USt, Kl.7 LB4).",
        soll:[{kuerzel:"AWR",nr:"6000"}],
        haben:[{kuerzel:"VE",nr:"4400"}],
        betrag:350,
        erklaerung:"Rohstoff auf Ziel zugekauft: Aufwendungen für Rohstoffe (6000 AWR) ↑ im Soll, Verbindlichkeiten aus L+L (4400 VE) entstehen im Haben. Kl.7 LB4." },
    ] },

  { id:"kette7_2", typ:"kette", ansicht:"konto", punkte:4, aktion:"kette",
    titel:"Verkauf von Fertigerzeugnissen: E-Mail → Buchung",
    story:"Kunde TechBau AG hat Solarmodule bestellt und bezahlt. Im Posteingang liegt eine Zahlungsbestätigung der BayernBank AG.",
    soll:[], haben:[], betrag:0,
    erklaerung:"Verkauf auf Ziel: FO an UEFE. Kl.7 LB4.",
    kette:[
      { typ:"mc", punkte:1, label:"E-Mail lesen",
        aufgabe:"BayernBank AG – Betreff: Zahlungseingang Kd.-Nr. KD-4821\n\nSehr geehrte Damen und Herren,\nfolgender Zahlungseingang wurde gebucht:\nAuftraggeberin: TechBau AG, Nürnberg\nVerwendungszweck: RE LT-2026-0072 · Solarmodule\nBetrag: 1.190,00 € (brutto, inkl. 19% USt)\n\nWie hoch ist der Bruttobetrag laut E-Mail?",
        mcOptionen:["950,00 €","1.000,00 €","1.190,00 €","1.250,00 €"],
        mcKorrekt:2,
        erklaerung:"Bruttobetrag = 1.190,00 €. Dieser Betrag inkl. USt steht auf der Ausgangsrechnung und im Bankeingang." },
      { typ:"kalkulation", punkte:1, label:"Nettobetrag",
        aufgabe:"Der Bruttobetrag beträgt 1.190,00 € (inkl. 19% USt).\n\nBerechne den Nettobetrag (Umsatzerlös):\nNetto = Brutto ÷ 1,19",
        kalkulation:{ richtigerWert:1000, einheit:"€" },
        erklaerung:"1.190 ÷ 1,19 = 1.000,00 €. Der Nettobetrag ist der eigentliche Umsatzerlös – die USt gehört dem Finanzamt." },
      { typ:"buchung", punkte:2, label:"Buchungssatz",
        aufgabe:"Buche den Zahlungseingang von TechBau AG:\n1.190,00 € Brutto (vereinfacht: BK an FO).",
        soll:[{kuerzel:"BK",nr:"2800"}],
        haben:[{kuerzel:"FO",nr:"2400"}],
        betrag:1190,
        erklaerung:"Zahlung eingegangen: Bank (2800 BK) erhöht sich im Soll, Forderung aus L+L (2400 FO) sinkt im Haben. Kl.7 LB3/4." },
    ] },
];

// Welches Desk-Item ist für welchen Aufgabentyp zuständig?
export const DESK_MAP = { buchung:"email", ueberweisung:"pc", dauerauftrag:"kalender", beleg:"post", theorie:"email", kette:"email",
  aktie_kauf:"boerse", aktie_verkauf:"boerse", dividende:"post",
  klr:"klr",
  lueckentext:"email", zuordnung:"post", multi_mc:"email", freitext:"email" };

// ── Klasse 8 – Simulationsaufgaben ────────────────────────────────────────────
export const BANK8_AUFGABEN = [
  { id:"b8_1", ansicht:"beleg", aktion:"buchung",
    titel:"Eingangsrechnung mit Frachtkosten",
    story:"LumiTec GmbH hat folgende Eingangsrechnung von Alumet Bayern GmbH erhalten (Kauf auf Ziel, Zahlungsziel 30 Tage):",
    transaktion:null,
    belegDaten:{
      typ:"eingangsrechnung",
      absenderName:"Alumet Bayern GmbH",
      absenderAdresse:"Gewerbepark 7, 85221 Dachau",
      absenderIBAN:"DE44 7001 0080 0123 4567 89",
      rechnungsnummer:"RE-AB-2026-0041",
      datum:"09.01.2026", faellig:"08.02.2026",
      positionen:[
        { menge:40, einheit:"Stk.", beschreibung:"Aluminiumrahmen für Solarmodule (Rohstoff)", einzelpreis:15.00, gesamt:600.00 },
        { menge:1,  einheit:"Psch.", beschreibung:"Frachtkosten Spedition Schäfer GmbH", einzelpreis:60.00, gesamt:60.00 },
      ],
      netto:660.00, brutto:785.40,
      verwendung:"RE-AB-2026-0041 Aluminiumrahmen",
    },
    aufgabe:"Buche diesen Rechnungseingang auf Ziel (vollständig mit USt). Drei Soll-Konten: Rohstoffwert, Frachtkosten und Vorsteuer – ein Haben-Konto.",
    soll:[
      {kuerzel:"AWR",  name:"Aufwendungen Rohstoffe",       nr:"6000", betrag:600.00},
      {kuerzel:"BZKR", name:"Bezugskosten Rohstoffe",       nr:"6001", betrag:60.00},
      {kuerzel:"VORST",name:"Vorsteuer",                    nr:"2600", betrag:125.40},
    ],
    haben:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L",nr:"4400", betrag:785.40}],
    punkte:4,
    betrag:785.40,
    erklaerung:"Zusammengesetzter Buchungssatz: 6000 AWR 600,00 + 6001 BZKR 60,00 + 2600 VORST 125,40 an 4400 VE 785,40. Rohstoffwert → AWR · Frachtkosten → BZKR · 19 % USt → VORST · Verbindlichkeit auf Ziel → VE (Kl.8 LB2)." },

  { id:"b8_2", ansicht:"beleg", punkte:2, aktion:"beleg",
    titel:"Eingangsrechnung Rohstoffe",
    story:"Bayern Rohstoffe GmbH hat folgende Rechnung für gelieferte Solarmodulglas-Platten zugeschickt (Kauf auf Ziel, Zahlungsziel 14 Tage):",
    transaktion:null,
    belegDaten:{
      typ:"eingangsrechnung",
      absenderName:"Bayern Rohstoffe GmbH",
      absenderAdresse:"Industriestraße 12, 86150 Augsburg",
      absenderIBAN:"DE12 7205 0101 0012 3456 78",
      rechnungsnummer:"RE-2026-0042",
      datum:"08.01.2026", faellig:"22.01.2026",
      positionen:[
        { menge:200, einheit:"kg", beschreibung:"Solarmodulglas geschnitten 4 mm (Rohstoff)", einzelpreis:10.00, gesamt:2000.00 },
      ],
      netto:2000.00, brutto:2380.00,
      verwendung:"RE-2026-0042 Solarmodulglas",
    },
    ueberweisungsDaten:{ empfaenger:"Bayern Rohstoffe GmbH", iban:"DE12 7205 0101 0012 3456 78", betrag:"2380", verwendung:"RE-2026-0042 Solarmodulglas" },
    aufgabe:"Buche diesen Rohstoffeinkauf auf Ziel (vereinfacht ohne USt, netto 2.000,00 €). Welche Konten kommen ins Soll und ins Haben?",
    soll:[{kuerzel:"AWR",name:"Aufwendungen Rohstoffe",nr:"6000"}],
    haben:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L",nr:"4400"}],
    betrag:2000,
    erklaerung:"Rohstoffe auf Ziel (vereinfacht): AWR (6000) im Soll, netto 2.000,00 €. Verbindlichkeit VE (4400) im Haben. Vollständig mit USt: 6000 AWR 2.000,00 + 2600 VORST 380,00 an 4400 VE 2.380,00." },

  { id:"b8_3", ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"Verbindlichkeit überweisen",
    story:"Bayern Rohstoffe GmbH (IBAN: DE12 7205 0101 0012 3456 78) – die Rechnung RE-2026-0042 ist fällig. Betrag: 2.380 €. Überweise den Betrag.",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"Bayern Rohstoffe GmbH", iban:"DE12 7205 0101 0012 3456 78", betrag:"2380", verwendung:"RE-2026-0042 Rohstoffe" },
    aufgabe:"Welcher Buchungssatz entsteht beim Begleichen der Verbindlichkeit per Banküberweisung?",
    soll:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L",nr:"4400"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:2380,
    erklaerung:"Verbindlichkeit erlischt → VE (4400) im Soll. Bank wird belastet → BK (2800) im Haben." },

  { id:"b8_4", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Nachlass vom Lieferanten",
    story:"Bayern Rohstoffe GmbH sendet euch eine Gutschrift (GS-2026-0018): Wegen festgestellter Mängel gewährt sie einen nachträglichen Preisnachlass von 150 €. Die Verbindlichkeit aus der ursprünglichen Rechnung verringert sich entsprechend.",
    transaktion:null,
    aufgabe:"Buche den Preisnachlass laut Gutschrift: Die Verbindlichkeit (VE) sinkt im Soll – welches Erlöskorrektur-/Nachlasskonto kommt ins Haben? (Signalwort: Nachlass für Rohstoffe)",
    soll:[{kuerzel:"VE",name:"Verbindlichkeiten aus L+L",nr:"4400"}],
    haben:[{kuerzel:"NR",name:"Nachlässe für Rohstoffe",nr:"6002"}],
    betrag:150,
    erklaerung:"Verbindlichkeit sinkt → VE (4400) im Soll. Nachlass für Rohstoffe → NR (6002) im Haben." },

  { id:"b8_5", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Fertigerzeugnisse auf Ziel verkauft",
    story:"Ihr habt an TechBau AG Fertigerzeugnisse auf Ziel (= gegen Rechnung, Zahlungsziel 14 Tage) geliefert. Ausgangsrechnung AR-2026-0021: 4.760 € brutto (= 4.000 € netto). Das Geld ist noch nicht eingegangen.",
    transaktion:null,
    aufgabe:"Buche den Verkauf auf Ziel (vereinfacht): Eine Forderung entsteht (FO im Soll), ein Umsatzerlös wird realisiert (UEFE im Haben). Betrag: 4.760 €.",
    soll:[{kuerzel:"FO",name:"Forderungen aus L+L",nr:"2400"}],
    haben:[{kuerzel:"UEFE",name:"Umsatzerlöse FE",nr:"5000"}],
    betrag:4760,
    erklaerung:"Forderung entsteht → FO (2400) im Soll. Umsatzerlös realisiert → UEFE (5000) im Haben." },

  { id:"b8_6", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Kundenzahlung eingegangen",
    story:"TechBau AG hat die Rechnung vollständig bezahlt. Auf dem Kontoauszug siehst du:",
    transaktion:{ datum:"26.01.2026", text:"TechBau AG · AR-2026-0021 · Zahlung", betrag:+4760 },
    aufgabe:"Welcher Buchungssatz gehört zu diesem Zahlungseingang?",
    soll:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    haben:[{kuerzel:"FO",name:"Forderungen aus L+L",nr:"2400"}],
    betrag:4760,
    erklaerung:"Geld kommt auf Bankkonto → BK (2800) im Soll. Forderung erlischt → FO (2400) im Haben." },

  { id:"b8_7", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Kunde zieht Skonto ab",
    story:"Maier Technik GmbH hat eine Rechnung über 2.380 € bezahlt, aber 2 % Skonto (= 47,60 €) abgezogen und nur 2.332,40 € überwiesen:",
    transaktion:{ datum:"20.01.2026", text:"Maier Technik GmbH · AR-2026-0018 · Zahlung abzgl. 2 % Skonto", betrag:+2332.40 },
    aufgabe:"Buche den Skontoabzug des Kunden – die Erlösberichtigung (Differenz: 47,60 €).",
    soll:[{kuerzel:"EBFE",name:"Erlösberichtigungen FE",nr:"5001"}],
    haben:[{kuerzel:"FO",name:"Forderungen aus L+L",nr:"2400"}],
    betrag:47.60,
    erklaerung:"Kundenskonto = Erlösminderung → EBFE (5001) im Soll. Forderung sinkt → FO (2400) im Haben." },

  { id:"b8_8", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Gehälter überwiesen",
    story:"Ende Januar wurden die Nettolöhne per Banküberweisung ausgezahlt:",
    transaktion:{ datum:"31.01.2026", text:"Gehaltsüberweisung Januar 2026 · 4 Mitarbeiter", betrag:-7200 },
    aufgabe:"Buche die Gehaltszahlung (vereinfacht: Bruttolohn direkt an Bank).",
    soll:[{kuerzel:"LG",name:"Löhne und Gehälter",nr:"6200"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:7200,
    erklaerung:"Personalaufwand → LG (6200) im Soll. Bankabgang → BK (2800) im Haben. (Vollständig: LG / VFA + VSV + BK)" },

  { id:"b8_9", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"AG-Sozialversicherung überwiesen",
    story:"Das Unternehmen überweist den Arbeitgeberanteil zur Sozialversicherung:",
    transaktion:{ datum:"31.01.2026", text:"DAK Gesundheit · AG-Anteil SV Jan 2026 · SEPA", betrag:-1800 },
    aufgabe:"Buche den Arbeitgeberanteil zur Sozialversicherung.",
    soll:[{kuerzel:"AGASV",name:"AG-Anteil Sozialversicherung",nr:"6400"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:1800,
    erklaerung:"AG-Anteil SV = betrieblicher Personalaufwand → AGASV (6400) im Soll. Bankabgang → BK (2800) im Haben." },

  { id:"b8_10", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Gewerbesteuer-Vorauszahlung",
    story:"Das Finanzamt hat die Gewerbesteuer-Vorauszahlung per SEPA eingezogen:",
    transaktion:{ datum:"15.02.2026", text:"Finanzamt München · Gewerbesteuer VZ Q1/2026", betrag:-3200 },
    aufgabe:"Buche diese Gewerbesteuerzahlung.",
    soll:[{kuerzel:"GWST",name:"Gewerbesteuer",nr:"7000"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:3200,
    erklaerung:"Gewerbesteuer = Betriebssteuer → GWST (7000) im Soll. Bankabgang → BK (2800) im Haben." },

  { id:"b8_11", ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"USt-Zahllast überweisen",
    story:"Die monatliche Umsatzsteuer-Zahllast (USt − Vorsteuer) beträgt 940 €. Überweise an das Finanzamt (IBAN: DE86 7000 0000 0070 0070 07, Ref.: USt Jan 2026).",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"Finanzamt München", iban:"DE86 7000 0000 0070 0070 07", betrag:"940", verwendung:"USt Jan 2026" },
    aufgabe:"Welcher Buchungssatz entsteht bei der Überweisung der Umsatzsteuer-Zahllast?",
    soll:[{kuerzel:"UST",name:"Umsatzsteuer",nr:"4800"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:940,
    erklaerung:"USt-Verbindlichkeit erlischt → UST (4800) im Soll. Bankabgang → BK (2800) im Haben." },

  { id:"b8_12", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Werbeanzeige bezahlt",
    story:"Medienhaus Bayern GmbH hat eine Rechnung für eine Werbeanzeige per Lastschrift eingezogen:",
    transaktion:{ datum:"17.01.2026", text:"Medienhaus Bayern GmbH · Werbeanzeige Jan 2026", betrag:-595 },
    aufgabe:"Buche diese Werbekosten.",
    soll:[{kuerzel:"WER",name:"Werbung",nr:"6870"}],
    haben:[{kuerzel:"BK",name:"Bank",nr:"2800"}],
    betrag:595,
    erklaerung:"Werbekosten = betrieblicher Aufwand → WER (6870) im Soll. Bankabgang → BK (2800) im Haben." },

  { id:"t8_1", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Bezugskosten",
    story:"Beim Werkstoffeinkauf fallen neben dem Kaufpreis noch weitere Kosten an.",
    aufgabe:"Was versteht man unter Bezugskosten (z.B. BZKR 6001)?",
    mcOptionen:["Rabatte des Lieferanten","Transport- und Frachtkosten beim Einkauf","Rücksendungen an den Lieferanten","Provisionen an Handelsvertreter"],
    mcKorrekt:1, soll:[], haben:[], betrag:0,
    erklaerung:"Bezugskosten (BZKR 6001) sind Transport- und Frachtkosten, die beim Einkauf von Rohstoffen anfallen." },

  { id:"k8_1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Kalkulation: Nettobetrag ermitteln",
    story:"Eine Eingangsrechnung zeigt: Bruttobetrag 2.380 €, Umsatzsteuer 19 %.",
    aufgabe:"Berechne den Nettobetrag (Netto = Brutto ÷ 1,19).",
    kalkulation:{ richtigerWert:2000, einheit:"€" },
    soll:[], haben:[], betrag:2000,
    erklaerung:"Netto = 2.380 ÷ 1,19 = 2.000,00 €. Nettobetrag ist Basis für AWR (6000) und VORST (2600)." },

  // ── Lückentext (Kl. 8) ───────────────────────────────────────────────────
  { id:"lt8_1", typ:"lueckentext", ansicht:"konto", punkte:3, aktion:"lueckentext",
    titel:"E-Mail: Buchungsanweisung Rohstoffe auf Ziel",
    story:"E-Mail der Buchhaltungsleitung: Bitte den Rohstoffkauf von Bayern Rohstoffe GmbH (Brutto 2.380,00 €, Netto 2.000,00 €, USt 380,00 €) auf Ziel buchen.",
    aufgabe:"Vervollständige den zusammengesetzten Buchungssatz (Kürzel oder Nr.).",
    lueckentext:{
      template:"[L0] (6000) + VORST (2600) an [L1] (4400) — Brutto 2.380,00 €",
      luecken:[
        { id:0, hinweis:"Rohstoff-Aufwand (AWR oder 6000)",     korrekt:"AWR",  korrektAlt:["6000"] },
        { id:1, hinweis:"Verbindlichkeiten Lieferant (VE/4400)", korrekt:"VE",   korrektAlt:["4400"] }
      ]
    },
    soll:[{kuerzel:"AWR",nr:"6000"},{kuerzel:"VORST",nr:"2600"}], haben:[{kuerzel:"VE",nr:"4400"}], betrag:2380,
    erklaerung:"Rohstoffe auf Ziel: AWR + VORST im Soll (Aufwand + Vorsteuer). VE im Haben (Verbindlichkeit entsteht). (Kl.8 LB2)" },

  // ── Multi-Choice (Kl. 8) ─────────────────────────────────────────────────
  { id:"mc8_1", typ:"multi_mc", ansicht:"konto", punkte:2, aktion:"multi_mc",
    titel:"Multi-Choice: Löhne überweisen – was stimmt?",
    story:"Der Chef testet dein Kontenwissen. Gehälter i.H.v. 8.500,00 € werden per Bank überwiesen.",
    aufgabe:"Welche Aussagen sind RICHTIG? (Mehrere Antworten möglich)",
    mcOptionen:[
      "LG (6200) kommt ins Soll",
      "BK (2800) kommt ins Soll",
      "BK (2800) kommt ins Haben",
      "LG (6200) ist ein Aufwandskonto",
    ],
    multiKorrekt:[0, 2, 3],
    soll:[], haben:[], betrag:0,
    erklaerung:"Richtig: A, C, D – Löhne LG (6200) ins Soll (Aufwand steigt). Bank BK (2800) ins Haben (sinkt). LG ist ein Aufwandskonto. B ist falsch: BK kommt ins Haben, nicht ins Soll. (Kl.8 LB5)" },

  // ── Freitext-Aufgaben (Kl. 8) ─────────────────────────────────────────────
  { id:"ft8_1", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Skonto, Rabatt, Bonus – Unterschiede",
    story:"Beim Durchsehen der Eingangsrechnung von Bayern Rohstoffe GmbH siehst du: 3 % Rabatt, 2 % Skonto, Jahresbonus 1 %.",
    aufgabe:"Erkläre den Unterschied zwischen Rabatt, Skonto und Bonus. Wann wird welcher gewährt?",
    freitext:{ zeilen:5, minZeichen:50,
      loesung:"Rabatt: Preisnachlass beim Kauf, z.B. für große Abnahmemengen oder als Treuerabatt – wird sofort vom Listenpreis abgezogen (Anschaffungspreisminderung, Konto NR/NF/NH). Skonto: Preisnachlass für schnelle Zahlung innerhalb der Skontofrist (z.B. 2 % bei Zahlung binnen 10 Tagen) – Konto EBFE/5001 beim Verkauf, NR-ähnlich beim Einkauf. Bonus: Nachträglicher Jahresrabatt bei Erreichen einer bestimmten Abnahmemenge, wird am Jahresende gutgeschrieben. Alle drei sind Anschaffungspreisminderungen." },
    erklaerung:"Rabatt (sofort), Skonto (bei früher Zahlung), Bonus (nachträglich bei Jahresumsatz). Alle mindern die Anschaffungskosten. Kl.8 LB2." },

  { id:"ft8_2", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Warum Rohstoffverbrauch als Aufwand?",
    story:"Dein Chef erklärt dir die Gewinn- und Verlustrechnung. Er fragt: Weißt du, warum der Rohstoffeinsatz als Aufwand erscheint und nicht einfach als Lagerbestand stehen bleibt?",
    aufgabe:"Begründe, warum der Rohstoffverbrauch (Einsatz für die Produktion) als Aufwand gebucht wird und nicht als Bestand.",
    freitext:{ zeilen:4, minZeichen:40,
      loesung:"Wenn Rohstoffe ins Lager kommen, sind sie Vermögen (Bestandskonto R, 2000) – das Unternehmen hat etwas. Sobald sie für die Produktion verbraucht werden, verlässt ihr Wert das Unternehmen: Sie werden zu einem Produkt umgewandelt, dessen Wert noch nicht realisiert ist. Dieser Verbrauch senkt das Vermögen und ist deshalb ein Aufwand (AWR 6000) – er erscheint in der GuV und mindert den Gewinn. Buchungssatz: AWR an R." },
    erklaerung:"Rohstoffe im Lager = Bestand (Aktivkonto). Rohstoffverbrauch für Produktion = Aufwand (AWR 6000). GoB: Aufwände werden in der Periode erfasst, in der sie entstehen. Kl.8 LB2/LB4." },

  // ── Paare zuordnen (Kl. 8) ────────────────────────────────────────────────
  { id:"pa8_1", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Paare zuordnen: Kontonummer → Kontoname",
    story:"Der Buchhalter legt dir einen Kontenplan-Auszug vor. Ordne jeder vierstelligen Kontonummer den richtigen Kontonamen zu.",
    aufgabe:"Welcher Kontoname gehört zu welcher Kontonummer?",
    zuordnung:{
      items:[
        { id:"n6000", text:"6000", korrektKat:"awr"   },
        { id:"n4400", text:"4400", korrektKat:"ve"    },
        { id:"n2600", text:"2600", korrektKat:"vorst" },
        { id:"n3800", text:"3800", korrektKat:"aust"  },
        { id:"n2000", text:"2000", korrektKat:"r"     },
      ],
      kategorien:[
        { id:"awr",   label:"AWR – Aufwand f. Rohstoffe",   color:"#e8600a", rgb:"232,96,10"  },
        { id:"ve",    label:"VE – Verbindlichkeiten L+L",   color:"#a855f7", rgb:"168,85,247" },
        { id:"vorst", label:"VORST – Vorsteuer",            color:"#10b981", rgb:"16,185,129" },
        { id:"aust",  label:"AUST – Umsatzsteuer",          color:"#ef4444", rgb:"239,68,68"  },
        { id:"r",     label:"R – Rohstoffe (Lager)",        color:"#3b82f6", rgb:"59,130,246" },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"6000 AWR (Rohstoffaufwand), 4400 VE (Verbindlichkeiten L+L), 2600 VORST (abziehbare Vorsteuer, Aktivkonto), 3800 AUST (Umsatzsteuerverbindlichkeit, Passivkonto), 2000 R (Rohstofflager). (Kl.8 LB2/LB3)" },

  // ── Sequenzkette Kl. 8 (LB2) ─────────────────────────────────────────────
  { id:"kette8_1", typ:"kette", ansicht:"konto", punkte:8, aktion:"kette",
    titel:"Eingangsrechnung mit Bezugskosten: Komplett-Workflow",
    story:"Waldform Design GmbH erhält eine Eingangsrechnung von Südbayer Werkstoffe KG für Eichenholzbohlen inkl. Frachtkosten der Spedition.",
    soll:[], haben:[], betrag:0,
    erklaerung:"Eingangsrechnung: AWR + BZKR im Soll, VE im Haben. Kl.8 LB2.",
    kette:[
      { typ:"mc", punkte:1, label:"Beleg prüfen",
        aufgabe:"Eingangsrechnung, Südbayer Werkstoffe KG, Regensburg\nRg.-Nr. SW-2026-0882  ·  Datum: 15.01.2026\n\n· Eichenholzbohlen (Rohstoffe):    800,00 €\n· Frachtkosten Spedition Bayern:    60,00 €\n· Gesamtnetto:                      860,00 €\n\nIn welches Konto werden die Frachtkosten beim Rohstoffeinkauf gebucht?",
        mcOptionen:["6000 AWR – Aufwendungen für Rohstoffe","6001 BZKR – Bezugskosten Rohstoffe","4400 VE – Verbindlichkeiten aus L+L","2600 VORST – Vorsteuer"],
        mcKorrekt:1,
        erklaerung:"Frachtkosten beim Rohstoffeinkauf = Bezugskosten → 6001 BZKR. Sie erhöhen den Einstandspreis! Kl.8 LB2." },
      { typ:"kalkulation", punkte:2, label:"Einstandspreis",
        aufgabe:"Berechne den Gesamtnettobetrag (Einstandspreis) der Lieferung:\n· Eichenholzbohlen:  800,00 €\n· Frachtkosten:       60,00 €\n\nEinstandspreis = Warenpreis + Bezugskosten",
        kalkulation:{ richtigerWert:860, einheit:"€" },
        erklaerung:"Einstandspreis = 800 + 60 = 860,00 €. Das ist der tatsächliche Aufwand, der in die Bücher kommt. Kl.8 LB2." },
      { typ:"buchung", punkte:2, label:"Buchung: Rohstoffe",
        aufgabe:"Buche den Rohstoff-Nettobetrag (ohne Frachtkosten): 800,00 € auf Ziel.\nHinweis: Vereinfacht ohne USt.",
        soll:[{kuerzel:"AWR",nr:"6000"}],
        haben:[{kuerzel:"VE",nr:"4400"}],
        betrag:800,
        erklaerung:"Rohstoffaufwand (6000 AWR) ↑ im Soll, Verbindlichkeit (4400 VE) entsteht im Haben. Kl.8 LB2." },
      { typ:"buchung", punkte:3, label:"Buchung: Frachtkosten",
        aufgabe:"Buche die Frachtkosten (Bezugskosten Rohstoffe): 60,00 € ebenfalls auf Ziel.\nBeachte: Frachtkosten → eigenes Konto BZKR!",
        soll:[{kuerzel:"BZKR",nr:"6001"}],
        haben:[{kuerzel:"VE",nr:"4400"}],
        betrag:60,
        erklaerung:"Bezugskosten Rohstoffe (6001 BZKR) ↑ im Soll, Verbindlichkeit (4400 VE) ↑ im Haben. Zusammen mit AWR: Einstandspreis 860 €. Kl.8 LB2." },
    ] },
];

export const KALENDER8_EINTRAEGE = [
  // Jan 1 = Neujahr (Feiertag) → Freitag 2.1.
  { tag:2,  text:"Nettolöhne überweisen (Personalabrechnung)",    typ:"task", aufgabeAktion:"buchung"      },
  { tag:8,  text:"Eingangsrechnung Bayern Rohstoffe prüfen",       typ:"task", aufgabeAktion:"beleg"        },
  // Jan 9 = Samstag → Dienstag 13.1. (12.1. Mon = Steuerberater)
  { tag:12, text:"Steuerberater-Termin · Gewerbesteuer",           typ:"info"                              },
  { tag:13, text:"Frachtkosten Spedition Meyer verbuchen",         typ:"task", aufgabeAktion:"buchung"      },
  // Jan 17 = Samstag → Freitag 16.1.
  { tag:16, text:"Werbung Medienhaus Bayern bezahlen",             typ:"task", aufgabeAktion:"buchung"      },
  { tag:20, text:"Kundenzahlung Maier Technik (Skonto prüfen!)",   typ:"task", aufgabeAktion:"buchung"      },
  { tag:22, text:"Verbindlichkeit Bayern Rohstoffe überweisen",    typ:"task", aufgabeAktion:"ueberweisung" },
  { tag:26, text:"Kundenzahlung TechBau AG eingetroffen",          typ:"task", aufgabeAktion:"buchung"      },
  { tag:28, text:"AG-SV + USt-Zahllast: Frist prüfen!",           typ:"info"                              },
  // Jan 31 = Samstag → Freitag 30.1.
  { tag:30, text:"Monatsabschluss: Buchungen kontrollieren",       typ:"info"                              },
];

// Geschäftskalender – dynamisch; wird auf den aktuellen Monat gemappt
// typ:"task" = auswählbar + farbcodiert; typ:"info" = nur Hinweis
export const KALENDER_EINTRAEGE = [
  // Jan 1 = Neujahr (Feiertag) → Bank-Ausführung am 2.1. (Freitag)
  { tag:2,  text:"Dauerauftrag Miete ausführen (2.400 €)",       typ:"task", aufgabeAktion:"dauerauftrag" },
  // Jan 3 = Samstag → Montag 5.1. belegt → Mittwoch 7.1.
  { tag:5,  text:"Gehaltsabrechnung vorbereiten",                 typ:"info" },
  { tag:7,  text:"Miete abgebucht → Buchung erfassen",            typ:"info" },
  { tag:8,  text:"Angebot Bayern Rohstoffe GmbH einholen",        typ:"info" },
  // Jan 10 = Samstag → Freitag 9.1.
  { tag:9,  text:"Steuerberater-Termin 14:00 Uhr (Finanzamt)",    typ:"info" },
  { tag:15, text:"ALLIANZ: Versicherungsprämie fällig (780 €)",   typ:"task", aufgabeAktion:"buchung"     },
  // Jan 18 = Sonntag → Montag 19.1.
  { tag:19, text:"Kundenzahlung Schmidt AG prüfen",               typ:"task", aufgabeAktion:"buchung"     },
  { tag:22, text:"Telefonrechnung Telekom einbuchen",             typ:"task", aufgabeAktion:"buchung"     },
  // Jan 25 = Sonntag → Montag 26.1.
  { tag:26, text:"Bankauszug prüfen + buchen",                    typ:"info" },
  { tag:28, text:"Offene Buchungsfälle erledigen",                typ:"task", aufgabeAktion:"buchung"     },
  // Jan 31 = Samstag → Freitag 30.1.
  { tag:30, text:"Gehälter überweisen (8.500 €) + LSt melden",   typ:"info" },
];

// ── Klasse 9 – Börsenspiel (LB4 Kapitalanlage) ───────────────────────────────

// 5 fiktive Bayern-Aktien mit deterministischen Kursverläufen (Jan 2026, 30 Tage)
// Kurs-Arrays: Index 0 = Tag 1, Index 29 = Tag 30
export const BOERSEN_AKTIEN = [
  { id:"BSOL", name:"BayernSolar AG",  kuerzel:"BSOL", branche:"Solar/Energie",
    startKurs:48.50,
    kurse:[48.50,48.80,49.10,49.35,52.65,52.10,51.80,51.90,52.20,52.10,
           51.80,51.95,52.30,52.40,52.50,53.10,53.50,53.80,54.00,54.20,
           54.15,54.00,54.10,54.20,54.30,54.40,54.20,54.50,54.60,54.70] },
  { id:"SUDB", name:"SüdBau AG",       kuerzel:"SUDB", branche:"Immobilien",
    startKurs:52.00,
    kurse:[52.00,52.20,52.10,52.30,52.50,52.40,52.20,51.80,51.50,51.20,
           50.80,50.30,50.50,50.60,51.00,51.20,51.00,51.10,51.30,52.00,
           52.10,52.20,52.00,51.80,51.90,52.10,52.00,51.90,52.00,52.10] },
  { id:"BFOO", name:"BavariaFood AG",  kuerzel:"BFOO", branche:"Lebensmittel",
    startKurs:38.20,
    kurse:[38.20,38.30,38.25,38.40,38.60,38.50,38.45,38.20,38.00,37.90,
           37.75,37.80,38.00,38.10,38.20,38.30,38.40,38.50,38.60,39.20,
           39.10,39.00,39.10,39.20,39.30,39.40,39.30,39.40,39.50,39.60] },
  { id:"ALPM", name:"AlpenMobil KGaA", kuerzel:"ALPM", branche:"Mobilität/Transport",
    startKurs:67.80,
    kurse:[67.80,68.10,68.50,68.30,69.00,68.80,68.50,68.20,68.00,67.80,
           67.50,67.20,66.80,66.50,59.90,60.50,61.20,61.80,62.50,64.20,
           64.50,64.80,65.00,65.20,65.50,65.80,66.00,66.20,66.50,66.80] },
  { id:"MTEX", name:"MünchTex AG",     kuerzel:"MTEX", branche:"Textil/Mode",
    startKurs:24.50,
    kurse:[24.50,24.70,24.60,24.80,25.10,24.90,24.80,24.70,24.60,24.50,
           24.40,24.30,24.50,24.60,24.80,24.70,24.60,24.50,24.40,24.80,
           24.90,24.70,24.60,24.50,24.30,20.10,20.50,20.80,21.00,21.20] },
];

// Kursereignisse für Nachrichten-Feed im Börsencockpit
export const BOERSEN_EREIGNISSE = [
  { tag:5,  ticker:"BSOL", pct:+8.3,  text:"BayernSolar AG: Quartalsbericht – Rekordgewinn, Kurs +8,3 %" },
  { tag:12, ticker:"SUDB", pct:-4.1,  text:"EZB-Entscheidung: Leitzins stabil – Immobilienaktien unter Druck, SUDB −4,1 %" },
  { tag:15, ticker:"ALPM", pct:-11.5, text:"AlpenMobil KGaA: Gewinnwarnung – Auftragseingang −15 %, Kurs −11,5 %" },
  { tag:20, ticker:null,   pct:+2.5,  text:"DAX-Allzeithoch! Breite Kursgewinne an allen deutschen Börsen" },
  { tag:26, ticker:"MTEX", pct:-18.0, text:"MünchTex AG: Insolvenzgerücht – Aktie bricht massiv ein, −18 %" },
];

// ── Klasse 9 – Simulationsaufgaben (LB2 Anlagen, LB3 Finanzierung, LB4 Kapitalanlage, LB5 Forderungen)
// bwr-sensei-check: Klasse 9 → du/dir · Konten: 1500 WP, 5780 DDE, 5650 EAWP, 7460 VAWP, 6750 KGV, 6520 ABSA
export const BANK9_AUFGABEN = [

  // ── LB4 Kapitalanlage – Aktienkauf ────────────────────────────────────────
  { id:"b9_1", ansicht:"konto", punkte:2, aktion:"aktie_kauf",
    titel:"Aktienkauf BayernSolar AG",
    story:"Du kaufst über die BayernBank AG 100 Aktien der BayernSolar AG zum Kurs von 48,50 € je Aktie. Bankprovision 1,5 % (72,75 €) ist bereits im WP-Wert enthalten. Gesamtkaufpreis: 4.922,75 €.",
    transaktion:{ datum:"13.01.2026", text:"BayernBank AG · Aktienkauf BSOL 100 Stk. · Depot-Nr. 012345", betrag:-4922.75 },
    aufgabe:"Buche den Aktienkauf (vereinfacht: alle Anschaffungsnebenkosten sind im 1500 WP-Betrag enthalten).",
    soll:[{kuerzel:"WP", name:"Wertpapiere des Anlagevermögens", nr:"1500"}],
    haben:[{kuerzel:"BK", name:"Bank", nr:"2800"}], betrag:4922.75,
    erklaerung:"Aktienkauf → Wertpapier aktivieren: 1500 WP im Soll. Bank wird belastet → 2800 BK im Haben. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Depotgebühren (Kosten des Geldverkehrs) ──────────
  { id:"b9_2", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Depotgebühren buchen",
    story:"Die BayernBank AG berechnet jährlich 0,5 % Depotgebühr auf den Depotwert (11.200 €). Quartalsbetrag (1/4 von 56 €): 14,00 €. Lastschrift heute:",
    transaktion:{ datum:"02.01.2026", text:"BayernBank AG · Depotgebühr Q1/2026 · Konto 012345", betrag:-14 },
    aufgabe:"Buche diese Depotgebühr.",
    soll:[{kuerzel:"KGV", name:"Kosten des Geldverkehrs", nr:"6750"}],
    haben:[{kuerzel:"BK", name:"Bank", nr:"2800"}], betrag:14,
    erklaerung:"Depotgebühren = Kosten des Geldverkehrs → 6750 KGV im Soll. Bankabgang → 2800 BK im Haben. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Dividendeneingang (BK / DDE) ────────────────────
  { id:"b9_3", ansicht:"beleg", punkte:3, aktion:"dividende",
    titel:"Dividende SüdBau AG",
    story:"Die SüdBau AG schüttet eine Dividende von 1,20 € je Aktie aus. Du besitzt 50 Aktien → 60,00 €. Dividendenabrechnung der BayernBank AG:",
    transaktion:null,
    belegDaten:{
      typ:"ausgangsrechnung",
      absenderName:"BayernBank AG – Depot-Service",
      absenderAdresse:"Maximilianstraße 5, 80333 München",
      absenderIBAN:"DE92700200000020000000",
      rechnungsnummer:"DIV-2026-0042",
      datum:"08.01.2026", faellig:"08.01.2026",
      positionen:[
        { menge:50, einheit:"Stk.", beschreibung:"SüdBau AG (SUDB) – Dividende Geschäftsjahr 2025, 1,20 €/Aktie", einzelpreis:1.20, gesamt:60.00 },
      ],
      netto:60.00, brutto:60.00,
      verwendung:"Dividende SUDB GJ 2025",
    },
    ueberweisungsDaten:{ empfaenger:"BayernBank AG – Depot", iban:"DE92700200000020000000", betrag:"60", verwendung:"Dividende SUDB GJ 2025" },
    aufgabe:"Buche den Dividendeneingang von 60,00 €.",
    soll:[{kuerzel:"BK", name:"Bank", nr:"2800"}],
    haben:[{kuerzel:"DDE", name:"Dividendenerträge", nr:"5780"}], betrag:60.00,
    erklaerung:"Dividende fließt auf Bankkonto → 2800 BK im Soll. Kapitalertrag → 5780 DDE im Haben. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Zinserträge Termingeld (BK / ZE) ────────────────
  { id:"b9_4", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Zinserträge Termingeld",
    story:"Das Termingeld (4.000 €, 3 % p.a.) wurde nach 6 Monaten ausgezahlt. Zinsen: 4.000 × 3 % ÷ 2 = 60,00 €. Gutschrift auf Bankkonto:",
    transaktion:{ datum:"15.01.2026", text:"BayernBank AG · Zinsgutschrift Termingeld TG-2025-07", betrag:+60 },
    aufgabe:"Buche den Zinsertrag aus dem Termingeld.",
    soll:[{kuerzel:"BK", name:"Bank", nr:"2800"}],
    haben:[{kuerzel:"ZE", name:"Zinserträge", nr:"5710"}], betrag:60,
    erklaerung:"Zinsgutschrift auf Bankkonto → 2800 BK im Soll. Zinsertrag → 5710 ZE im Haben. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – MC: Buchgewinn beim Aktienverkauf → EAWP ─────────
  { id:"b9_5", typ:"mc", ansicht:"konto", punkte:1, aktion:"aktie_verkauf",
    titel:"Aktienverkauf mit Buchgewinn",
    story:"BayernSolar AG (BSOL): 100 Aktien gekauft für 4.922,75 €. Verkauft für 5.420,00 €. Buchgewinn = 497,25 €. BK wird mit 5.420 € gutgeschrieben, 1500 WP mit 4.922,75 € ausgebucht.",
    aufgabe:"Welches Konto erfasst den Buchgewinn von 497,25 € beim Aktienverkauf?",
    mcOptionen:[
      "5650 EAWP – Erträge aus Abgang von Wertpapieren",
      "7460 VAWP – Verluste aus Abgang von Wertpapieren",
      "5780 DDE – Dividendenerträge",
      "5710 ZE – Zinserträge",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Ein Buchgewinn beim Aktienverkauf (Verkaufspreis > Buchwert) fließt auf 5650 EAWP (Erträge aus Abgang von Wertpapieren). (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – MC: Magisches Dreieck ────────────────────────────
  { id:"t9_1", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Magisches Dreieck",
    story:"Das magische Dreieck der Geldanlage zeigt, dass keine Anlageform alle drei Eigenschaften gleichzeitig vollständig erfüllen kann.",
    aufgabe:"Welche drei Eigenschaften bilden das magische Dreieck der Geldanlage?",
    mcOptionen:[
      "Liquidität – Rentabilität – Sicherheit",
      "Eigenkapital – Fremdkapital – Gewinn",
      "Aktien – Anleihen – Immobilien",
      "Kurs – Dividende – Depotgebühr",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Das magische Dreieck: Liquidität (schnelle Verfügbarkeit) – Rentabilität (Rendite) – Sicherheit (Verlustrisiko). Alle drei sind nie gleichzeitig optimal. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Kalkulation: Kaufpreis + Provision ──────────────
  { id:"k9_1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Kalkulation: Kaufpreis Aktien",
    story:"Du kaufst 100 Aktien der BayernSolar AG zum Kurs von 48,50 € je Aktie. Die BayernBank AG berechnet 1,5 % Bankprovision auf den Kurswert.",
    aufgabe:"Berechne den gesamten Anschaffungswert (Kurswert + 1,5 % Provision) in €.",
    kalkulation:{ richtigerWert:4922.75, einheit:"€" },
    soll:[], haben:[], betrag:4922.75,
    erklaerung:"100 × 48,50 € = 4.850,00 € + 1,5 % × 4.850 € = 72,75 € → Anschaffungswert = 4.922,75 €. (Kl.9 LB4)" },

  // ── LB2 Anlagenbereich – Abschreibung auf Sachanlagen (ABSA / MA) ────────
  { id:"b9_6", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Jahresabschreibung auf Maschine",
    story:"Eine Fertigungsmaschine (0700 MA) wurde für 48.000 € angeschafft. Nutzungsdauer laut AfA-Tabelle: 8 Jahre. Lineare Abschreibung: 48.000 ÷ 8 = 6.000 € pro Jahr.",
    transaktion:null,
    aufgabe:"Buche die planmäßige Jahresabschreibung auf die Maschine.",
    soll:[{kuerzel:"ABSA", name:"Abschreibungen auf Sachanlagen", nr:"6520"}],
    haben:[{kuerzel:"MA", name:"Maschinen und Anlagen", nr:"0700"}], betrag:6000,
    erklaerung:"Wertminderung Sachanlage → 6520 ABSA im Soll (Aufwand). Buchwert Maschine sinkt → 0700 MA im Haben. (Kl.9 LB2)" },

  // ── LB3 Finanzierung – Zinsaufwand Bankkredit (ZAW / BK) ─────────────────
  { id:"b9_7", ansicht:"ueberweisung", punkte:3, aktion:"ueberweisung",
    titel:"Zinsaufwand Bankkredit überweisen",
    story:"Für den Investitionskredit (20.000 €, 5 % p.a.) werden Quartalszinsen fällig: 20.000 × 5 % ÷ 4 = 250 €. Überweisung an BayernBank AG (IBAN: DE92700200000020000000, Ref.: ZAW Q1/2026).",
    transaktion:null,
    ueberweisungsDaten:{ empfaenger:"BayernBank AG", iban:"DE92700200000020000000", betrag:"250", verwendung:"ZAW Q1/2026 Kredit-Nr. 7734" },
    aufgabe:"Welcher Buchungssatz entsteht bei der Überweisung der Kreditzinsen?",
    soll:[{kuerzel:"ZAW", name:"Zinsaufwendungen", nr:"7510"}],
    haben:[{kuerzel:"BK", name:"Bank", nr:"2800"}], betrag:250,
    erklaerung:"Kreditzinsen = Finanzierungsaufwand → 7510 ZAW im Soll. Bankabgang → 2800 BK im Haben. (Kl.9 LB3)" },

  // ── LB4 Kapitalanlage – MC: Buchverlust beim Aktienverkauf → VAWP ────────
  { id:"t9_2", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Buchverlust Aktienverkauf",
    story:"MünchTex AG (MTEX): 50 Aktien zu je 24,50 € gekauft (= 1.225 €). Kurs fällt auf 20,10 € → Verkaufserlös 1.005 €. Buchverlust = 220 €.",
    aufgabe:"Welches Konto erfasst den Buchverlust von 220 € beim Aktienverkauf?",
    mcOptionen:[
      "7460 VAWP – Verluste aus Abgang von Wertpapieren",
      "5650 EAWP – Erträge aus Abgang von Wertpapieren",
      "6750 KGV – Kosten des Geldverkehrs",
      "5780 DDE – Dividendenerträge",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Ein Buchverlust beim Aktienverkauf (Verkaufspreis < Buchwert) wird auf 7460 VAWP (Verluste aus Abgang von Wertpapieren) gebucht. (Kl.9 LB4)" },

  // ── LB4 Kapitalanlage – Kalkulation: Dividendenrendite ──────────────────
  { id:"k9_2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Kalkulation: Dividendenrendite",
    story:"SüdBau AG: Dividende 1,20 € je Aktie, aktueller Kurs 52,00 € je Aktie. Dividendenrendite = Dividende ÷ Kurs × 100.",
    aufgabe:"Berechne die Dividendenrendite der SüdBau AG (in %, auf 2 Nachkommastellen).",
    kalkulation:{ richtigerWert:2.31, einheit:"%" },
    soll:[], haben:[], betrag:2.31,
    erklaerung:"Dividendenrendite = 1,20 ÷ 52,00 × 100 = 2,31 %. Zeigt die jährliche Ausschüttung relativ zum Kurs. (Kl.9 LB4)" },

  // ── LB5 Forderungen – MC: Zweifelhafte Forderungen (ZWFO) ────────────────
  { id:"t9_3", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Zweifelhafte Forderungen",
    story:"Ein Kunde (Maier Technik GmbH) zahlt trotz Mahnung nicht. Du zweifelst an der Einbringlichkeit der Forderung (2.000 €).",
    aufgabe:"Auf welches Konto werden zweifelhafte Forderungen umgebucht?",
    mcOptionen:[
      "2470 ZWFO – Zweifelhafte Forderungen",
      "3670 EWB – Einzelwertberichtigung",
      "6950 ABFO – Abschreibungen auf Forderungen",
      "2400 FO – Forderungen aus L+L",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Zweifelhafte Forderungen werden von 2400 FO auf 2470 ZWFO umgebucht (Buchung: ZWFO / FO). Erst beim tatsächlichen Ausfall folgt die Abschreibung mit 6950 ABFO. (Kl.9 LB5)" },

  // ── Lückentext (Kl. 9) ───────────────────────────────────────────────────
  { id:"lt9_1", typ:"lueckentext", ansicht:"konto", punkte:2, aktion:"lueckentext",
    titel:"Lückentext: Dividendeneingang buchen",
    story:"E-Mail der BayernBank AG: SüdBau AG Dividende 1,20 €/Aktie × 50 Stk. = 60,00 € wird auf dein Konto überwiesen. Vervollständige den Buchungssatz:",
    aufgabe:"Fülle die fehlenden Kürzel aus.",
    lueckentext:{
      template:"[L0] (2800) an [L1] (5780) — 60,00 €",
      luecken:[
        { id:0, hinweis:"Bankkonto (BK / 2800)",          korrekt:"BK",  korrektAlt:["2800"] },
        { id:1, hinweis:"Dividendenerträge (DDE / 5780)",  korrekt:"DDE", korrektAlt:["5780"] }
      ]
    },
    soll:[{kuerzel:"BK",nr:"2800"}], haben:[{kuerzel:"DDE",nr:"5780"}], betrag:60,
    erklaerung:"Dividende: BK (2800) im Soll (Bankzugang). DDE (5780) im Haben – Ertrag aus Kapitalanlage. (Kl.9 LB4)" },

  // ── Zuordnung (Kl. 9) ────────────────────────────────────────────────────
  { id:"zu9_1", typ:"zuordnung", ansicht:"konto", punkte:4, aktion:"zuordnung",
    titel:"Zuordnung: Anlage- oder Umlaufvermögen?",
    story:"Der Steuerberater fragt für die Bilanzgliederung: Welche Konten gehören ins Anlage-, welche ins Umlaufvermögen?",
    aufgabe:"Ordne jede Bilanzposition dem richtigen Vermögensbereich zu.",
    zuordnung:{
      items:[
        { id:"MA",  text:"MA (0700) – Maschinen und Anlagen", korrektKat:"AV" },
        { id:"WP",  text:"WP (1500) – Wertpapiere (Depot)",   korrektKat:"AV" },
        { id:"FO",  text:"FO (2400) – Forderungen aus L+L",    korrektKat:"UV" },
        { id:"BK",  text:"BK (2800) – Bank",                   korrektKat:"UV" },
        { id:"R",   text:"R (2000) – Rohstoffe (Lager)",       korrektKat:"UV" },
      ],
      kategorien:[
        { id:"AV", label:"Anlagevermögen",  color:"#3b82f6", rgb:"59,130,246"  },
        { id:"UV", label:"Umlaufvermögen",  color:"#10b981", rgb:"16,185,129"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Anlagevermögen (dauerhafter Nutzen): MA, WP (Depot 1500). Umlaufvermögen (kurzfristig): FO, BK, R (Vorräte). (Kl.9 LB2/LB4)" },

  // ── Freitext-Aufgaben (Kl. 9) ─────────────────────────────────────────────
  { id:"ft9_1", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Eigen- vs. Fremdfinanzierung",
    story:"Die Geschäftsleitung berät über die Finanzierung einer neuen Maschine (60.000 €). Option A: Eigenkapitalerhöhung, Option B: Bankdarlehen.",
    aufgabe:"Nenne je zwei Vor- und Nachteile der Eigenfinanzierung und der Fremdfinanzierung.",
    freitext:{ zeilen:6, minZeichen:60,
      loesung:"Eigenfinanzierung – Vorteile: keine Zinsen, keine Rückzahlungspflicht, volle Unabhängigkeit vom Kreditgeber. Nachteile: Kapital muss im Unternehmen vorhanden sein / aufgebracht werden, Gewinn muss einbehalten werden (Liquiditätsbindung). Fremdfinanzierung – Vorteile: sofortiger Kapitalbedarf gedeckt auch ohne eigenes Kapital, Zinsen als Betriebsausgabe steuerlich absetzbar. Nachteile: Zinszahlungen (Aufwand, Konto ZAW 7510), Tilgungspflicht, Abhängigkeit vom Gläubiger, Sicherheiten erforderlich." },
    erklaerung:"Eigenfinanzierung: EK-Erhöhung ohne Schulden, aber Kapitalaufbringung nötig. Fremdfinanzierung: Bankkredit mit Zinsen (ZAW 7510) und Tilgung, dafür sofort verfügbar. Kl.9 LB3." },

  { id:"ft9_2", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Warum Abschreibungen?",
    story:"Beim Jahresgespräch mit dem Steuerberater fragt er dich: Erklär mir mal in eigenen Worten, warum wir überhaupt abschreiben.",
    aufgabe:"Erkläre, was Abschreibungen sind, warum sie notwendig sind und welche Wirkung sie auf Gewinn und Liquidität haben.",
    freitext:{ zeilen:5, minZeichen:50,
      loesung:"Abschreibungen (ABSA 6520) erfassen die jährliche Wertminderung von Sachanlagen durch Nutzung, Verschleiß oder wirtschaftliche Veralterung. Sie sind notwendig, weil Anschaffungskosten nicht im Kaufjahr voll als Aufwand verrechnet werden dürfen – der Aufwand muss auf die Nutzungsdauer verteilt werden (Periodenabgrenzung). Wirkung: Abschreibungen mindern den Gewinn (→ geringere Steuerbelastung) und stellen gleichzeitig Kapital für die spätere Wiederbeschaffung bereit (Selbstfinanzierungseffekt / Abschreibungskreislauf). Sie sind nicht zahlungswirksam – die Liquidität bleibt erhalten." },
    erklaerung:"AfA = Absetzung für Abnutzung (§7 EStG). Lineares Verfahren: AK / ND = jährl. AfA. ABSA (6520) im Soll / MA im Haben (direkte Abschreibung). Selbstfinanzierungseffekt! Kl.9 LB2." },

  // ── Schaubild: Börsenkurs (Kl. 9 LB4) ────────────────────────────────────
  { id:"sb9_1", typ:"mc", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Börsenchart: BayernSolar AG – Kursentwicklung",
    story:"Im Börsenfenster siehst du den Kursverlauf der BayernSolar AG der letzten 6 Monate.",
    schaubild:{
      typ:"linie",
      titel:"BayernSolar AG – Aktienkurs (Jul–Dez 2025)",
      untertitel:"Schlusskurs in € je Aktie (fiktive Daten)",
      einheit:"€/Aktie",
      quelle:"Fiktiver Börsenkurs",
      herausgeber:"BuchungsWerk – Übungszweck",
      jahre:["Jul","Aug","Sep","Okt","Nov","Dez"],
      werte:[41.20, 44.80, 43.50, 47.30, 52.10, 48.50]
    },
    aufgabe:"In welchem Monat war der Aktienkurs der BayernSolar AG am höchsten?",
    mcOptionen:["August (44,80 €)","Oktober (47,30 €)","November (52,10 €)","Dezember (48,50 €)"],
    mcKorrekt:2, soll:[], haben:[], betrag:0,
    erklaerung:"Im November 2025 erreichte der Kurs mit 52,10 € sein Höchst. Im Dezember fiel er wieder auf 48,50 €. Beim Verkauf im Dezember ergibt sich ein Buchgewinn gegenüber dem Kaufkurs von 41,20 € (Juli): EAWP 5650 im Haben. (Kl.9 LB4)" },

  { id:"sb9_2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"theorie",
    titel:"Börsenchart: Kursgewinn berechnen",
    story:"Du hast BayernSolar AG-Aktien im Juli zu 41,20 € je Aktie gekauft (50 Stück). Im Dezember verkaufst du sie zum Kurs von 48,50 €.",
    aufgabe:"Berechne den Kursgewinn in € (Verkaufswert − Kaufwert, ohne Nebenkosten).",
    kalkulation:{ richtigerWert:365, einheit:"€" },
    schaubild:{
      typ:"linie",
      titel:"BayernSolar AG – Aktienkurs (Jul–Dez 2025)",
      untertitel:"Schlusskurs in € je Aktie (fiktive Daten)",
      einheit:"€/Aktie",
      quelle:"Fiktiver Börsenkurs",
      herausgeber:"BuchungsWerk – Übungszweck",
      jahre:["Jul","Aug","Sep","Okt","Nov","Dez"],
      werte:[41.20, 44.80, 43.50, 47.30, 52.10, 48.50]
    },
    soll:[], haben:[], betrag:365,
    erklaerung:"Kaufwert: 50 × 41,20 € = 2.060,00 €. Verkaufswert: 50 × 48,50 € = 2.425,00 €. Kursgewinn = 2.425,00 − 2.060,00 = 365,00 €. Buchung: BK / WP 1500 + EAWP 5650. (Kl.9 LB4)" },

  // ── Paare zuordnen (Kl. 9) ────────────────────────────────────────────────
  { id:"pa9_1", typ:"zuordnung", ansicht:"konto", punkte:3, aktion:"zuordnung",
    titel:"Paare zuordnen: Börsenbegriff → Erklärung",
    story:"Vor dem Aktienkauf musst du die wichtigsten Börsenbegriffe kennen. Ordne jeden Begriff der richtigen Erklärung zu.",
    aufgabe:"Welche Erklärung gehört zu welchem Börsenbegriff?",
    zuordnung:{
      items:[
        { id:"kurs",  text:"Kurs",      korrektKat:"kurs_def"  },
        { id:"div",   text:"Dividende", korrektKat:"div_def"   },
        { id:"depot", text:"Depot",     korrektKat:"depot_def" },
        { id:"emit",  text:"Emission",  korrektKat:"emit_def"  },
        { id:"rend",  text:"Rendite",   korrektKat:"rend_def"  },
      ],
      kategorien:[
        { id:"kurs_def",  label:"Marktpreis einer Aktie an der Börse",  color:"#e8600a", rgb:"232,96,10"  },
        { id:"div_def",   label:"Gewinnausschüttung je Aktie",          color:"#10b981", rgb:"16,185,129" },
        { id:"depot_def", label:"Wertpapier-Konto bei der Bank",        color:"#3b82f6", rgb:"59,130,246" },
        { id:"emit_def",  label:"Erstausgabe neuer Aktien am Markt",    color:"#a855f7", rgb:"168,85,247" },
        { id:"rend_def",  label:"Ertrag einer Kapitalanlage in %",      color:"#eab308", rgb:"234,179,8"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Kurs=Börsenpreis. Dividende=Gewinnanteil/Aktie (BK/DDE 5780). Depot=WP-Konto (1500). Emission=Neuausgabe von Aktien. Rendite=Ertrag in % (Dividendenrendite = Div÷Kurs×100). (Kl.9 LB4)" },
];

// ── Klasse 9 Kalender – Börsentermine Januar 2026 ────────────────────────────
// Wochenenden Jan 2026: 3,4,10,11,17,18,24,25,31 · Feiertage: 1 (Neujahr), 6 (Hl. 3 Könige)
export const KALENDER9_EINTRAEGE = [
  // Jan 1 = Neujahr → Freitag 2.1.
  { tag:2,  text:"Depotgebühr BayernBank AG fällig (Q1)",          typ:"task", aufgabeAktion:"buchung"       },
  // Jan 6 = Hl. 3 Könige → Mittwoch 7.1.
  { tag:7,  text:"Quartalsbericht BayernSolar AG · Kurs +8 %",     typ:"info"                               },
  { tag:8,  text:"Dividende SüdBau AG eingetroffen – buchen!",      typ:"task", aufgabeAktion:"dividende"    },
  { tag:13, text:"Aktienkauf BayernSolar AG ausführen",             typ:"task", aufgabeAktion:"aktie_kauf"   },
  { tag:15, text:"Termingeld-Zinsgutschrift prüfen + buchen",       typ:"task", aufgabeAktion:"buchung"      },
  { tag:16, text:"AlpenMobil Gewinnwarnung · Kurs −11,5 %",        typ:"info"                               },
  { tag:20, text:"DAX-Allzeithoch – Depot­wert prüfen",            typ:"info"                               },
  { tag:22, text:"BayernSolar Aktienverkauf: Buchgewinn erfassen",  typ:"task", aufgabeAktion:"aktie_verkauf"},
  { tag:26, text:"MünchTex Insolvenzgerücht · Kurs −18 %",         typ:"info"                               },
  { tag:28, text:"Quartalszinsen Bankkredit überweisen",            typ:"task", aufgabeAktion:"ueberweisung" },
  // Jan 31 = Samstag → Freitag 30.1.
  { tag:30, text:"Monatsabschluss: Depot + Buchführung prüfen",     typ:"info"                               },
];

// ── Klasse 10 Aufgaben – MSA-Vorbereitung ────────────────────────────────────
// LB1: ARA/PRA/RST · LB2: Kennzahlen · LB3: Vollkostenrechnung · LB4: DBR
// Sprache: Sie/Ihr/Ihnen (Klasse 10)
export const BANK10_AUFGABEN = [

  // ── LB1 ARA – Aktive Rechnungsabgrenzung (VBEI / ARA) ────────────────────
  { id:"b10_1", ansicht:"konto", punkte:3, aktion:"buchung",
    titel:"Aktive Rechnungsabgrenzung: Versicherungsbeitrag",
    story:"Am 01.12.2025 zahlt die VitaSport GmbH den Jahresbeitrag der Betriebsunterbrechungsversicherung (2.400 €). Der Beitrag deckt 01.12.2025–30.11.2026. Auf das GJ 2025 entfallen 1/12 = 200 €, auf 2026 entfallen 11/12 = 2.200 €.",
    transaktion:{ datum:"01.12.2025", text:"VSH Versicherungs-AG · Betriebsunterbrechung JB 2025/26", betrag:-2400 },
    aufgabe:"Buchen Sie zum 31.12.2025 die Bildung des aktiven Rechnungsabgrenzungspostens für den auf 2026 entfallenden Anteil (2.200 €).",
    soll:[{kuerzel:"ARA", name:"Aktive Rechnungsabgrenzung", nr:"2900"}],
    haben:[{kuerzel:"VBEI", name:"Versicherungsbeiträge", nr:"6900"}], betrag:2200,
    erklaerung:"Der auf das Folgejahr entfallende Aufwand wird abgegrenzt: 2900 ARA im Soll (Aktivierung), 6900 VBEI im Haben (Korrektur des Aufwands). Im Folgejahr Auflösung VBEI/ARA. (Kl.10 LB1)" },

  // ── LB1 RST – Rückstellung für Prozesskosten (PFAW / RST) ────────────────
  { id:"b10_2", ansicht:"konto", punkte:2, aktion:"buchung",
    titel:"Rückstellung für Prozesskosten",
    story:"Ein ehemaliger Mitarbeiter klagt auf Schadensersatz. Der Rechtsanwalt schätzt die anfallenden Prozesskosten auf ca. 3.500 €. Höhe und Zeitpunkt der Zahlung sind noch ungewiss (§ 249 HGB).",
    transaktion:null,
    aufgabe:"Buchen Sie zum 31.12.2025 die Bildung der Rückstellung für Prozesskosten.",
    soll:[{kuerzel:"PFAW", name:"Periodenfremde Aufwendungen", nr:"6990"}],
    haben:[{kuerzel:"RST", name:"Rückstellungen", nr:"3900"}], betrag:3500,
    erklaerung:"Ungewisse Verbindlichkeit → Rückstellung bilden: 6990 PFAW im Soll (Aufwand im GJ 2025), 3900 RST im Haben. Pflicht nach § 249 HGB. (Kl.10 LB1)" },

  // ── LB1 MC – Was ist 2900 ARA? ────────────────────────────────────────────
  { id:"t10_1", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Aktive Rechnungsabgrenzung",
    story:"Zum Jahresabschluss werden Aufwendungen und Erträge periodengerecht abgegrenzt.",
    aufgabe:"Welcher Sachverhalt führt zur Buchung 2900 ARA im Soll?",
    mcOptionen:[
      "Vorauszahlung einer Versicherungsprämie, die das Folgejahr betrifft",
      "Eingang einer Kundenzahlung für eine noch nicht erbrachte Leistung",
      "Zahlung einer Lieferantenrechnung vor der Fälligkeit",
      "Bildung einer Rücklage für geplante Investitionen",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"2900 ARA (aktiver RAP) entsteht, wenn im laufenden GJ eine Ausgabe getätigt wird, die Aufwand des Folgejahres ist. Vorauszahlte Versicherungsprämien sind das klassische Beispiel. (Kl.10 LB1)" },

  // ── LB2 Kennzahl – Anlagendeckung II ──────────────────────────────────────
  { id:"k10_1", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kennzahl: Anlagendeckung II",
    story:"VitaSport GmbH Bilanz 31.12.2025: Eigenkapital 180.000 €, langfristige Fremdverbindlichkeiten (LBKV) 50.000 €, Anlagevermögen gesamt 184.000 €.",
    aufgabe:"Berechnen Sie die Anlagendeckung II in % (auf 2 Nachkommastellen). Formel: (EK + LFV) ÷ AV × 100.",
    kalkulation:{ richtigerWert:125.00, einheit:"%" },
    soll:[], haben:[], betrag:125.00,
    erklaerung:"Anlagendeckung II = (180.000 + 50.000) / 184.000 × 100 = 125,00 %. Ziel ≥ 100 % (goldene Bilanzregel) → erfüllt! Das AV ist vollständig durch langfristige Mittel gedeckt. (Kl.10 LB2)" },

  // ── LB2 Kennzahl – Eigenkapitalrentabilität ────────────────────────────────
  { id:"k10_2", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kennzahl: Eigenkapitalrentabilität",
    story:"VitaSport GmbH GJ 2025: Jahresüberschuss (Gewinn) 27.000 €, Eigenkapital zum 31.12.2025 = 180.000 €.",
    aufgabe:"Berechnen Sie die Eigenkapitalrentabilität in % (auf 2 Nachkommastellen). Formel: Gewinn ÷ EK × 100.",
    kalkulation:{ richtigerWert:15.00, einheit:"%" },
    soll:[], haben:[], betrag:15.00,
    erklaerung:"EK-Rentabilität = 27.000 / 180.000 × 100 = 15,00 %. Bedeutung: Auf jede 100 € eingesetztes Eigenkapital erwirtschaftet die VitaSport GmbH 15 € Gewinn. (Kl.10 LB2)" },

  // ── LB2 Kennzahl – Einzugsliquidität ──────────────────────────────────────
  { id:"k10_3", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kennzahl: Einzugsliquidität",
    story:"VitaSport GmbH 31.12.2025: Forderungen aus L+L (FO) 42.000 €, Bankguthaben (BK) 28.000 €, kurzfristige Verbindlichkeiten (KBKV + VE) 56.000 €.",
    aufgabe:"Berechnen Sie die Einzugsliquidität in % (auf 2 Nachkommastellen). Formel: (FO + BK) ÷ KFV × 100.",
    kalkulation:{ richtigerWert:125.00, einheit:"%" },
    soll:[], haben:[], betrag:125.00,
    erklaerung:"Einzugsliquidität = (42.000 + 28.000) / 56.000 × 100 = 125,00 %. Ziel ≥ 100 % → erfüllt! Kurzfristige Verbindlichkeiten sind durch liquide Mittel + Forderungen gedeckt. (Kl.10 LB2)" },

  // ── LB2 MC – Anlagendeckung II Zielwert ───────────────────────────────────
  { id:"t10_2", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Zielwert Anlagendeckung II",
    story:"Die Anlagendeckung II ist eine zentrale Kennzahl der goldenen Bilanzregel und jedes Jahr im MSA relevant.",
    aufgabe:"Welchen Mindestzielwert sollte die Anlagendeckung II nach der goldenen Bilanzregel aufweisen?",
    mcOptionen:[
      "≥ 100 % – das Anlagevermögen soll vollständig durch langfristige Mittel gedeckt sein",
      "≥ 50 % – mindestens die Hälfte des AV durch Eigenkapital finanzieren",
      "≥ 200 % – zur Sicherheit doppelte Deckung des Anlagevermögens anstreben",
      "Es gibt keinen festen Zielwert – nur Branchenvergleiche sind aussagekräftig",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Anlagendeckung II ≥ 100 %: Das Anlagevermögen soll vollständig durch Eigenkapital + langfristiges Fremdkapital finanziert sein (goldene Bilanzregel). (Kl.10 LB2)" },

  // ── LB3 Vollkosten – FGKZ berechnen ──────────────────────────────────────
  { id:"k10_4", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kalkulation: Fertigungsgemeinkostenzuschlagssatz",
    story:"Aus dem BAB der VitaSport GmbH (GJ 2025) entnehmen Sie: Fertigungsgemeinkosten (FGK) 96.000 €, Fertigungseinzelkosten (FEK) 240.000 €.",
    aufgabe:"Berechnen Sie den Fertigungsgemeinkostenzuschlagssatz in % (auf 2 Nachkommastellen). Formel: FGK ÷ FEK × 100.",
    kalkulation:{ richtigerWert:40.00, einheit:"%" },
    soll:[], haben:[], betrag:40.00,
    erklaerung:"FGKZ = 96.000 / 240.000 × 100 = 40,00 %. Auf jeden Euro Fertigungseinzelkosten kommen 0,40 € Fertigungsgemeinkosten. (Kl.10 LB3)" },

  // ── LB3 Vollkosten – Herstellkosten Stückkalkulation ─────────────────────
  { id:"k10_5", typ:"kalkulation", ansicht:"konto", punkte:3, aktion:"klr",
    titel:"Kalkulation: Herstellkosten Kraftstation",
    story:"Zuschlagskalkulation VitaSport GmbH, Kraftstation 'MaxForce 300': Materialeinzelkosten (MEK) 85,00 €, Materialgemeinkostenzuschlag 12 %, Fertigungseinzelkosten (FEK) 120,00 €, Fertigungsgemeinkostenzuschlag 40 %, Sondereinzelkosten der Fertigung (SEF) 15,00 €.",
    aufgabe:"Berechnen Sie die Herstellkosten je Stück in € (auf 2 Nachkommastellen).",
    kalkulation:{ richtigerWert:278.20, einheit:"€" },
    soll:[], haben:[], betrag:278.20,
    erklaerung:"MEK 85,00 + MGK (12%) 10,20 + FEK 120,00 + FGK (40%) 48,00 + SEF 15,00 = Herstellkosten 278,20 €/Stk. (Kl.10 LB3)" },

  // ── LB3 MC – Einzelkosten vs. Gemeinkosten ────────────────────────────────
  { id:"t10_3", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Einzel- vs. Gemeinkosten",
    story:"Im Betriebsabrechnungsbogen (BAB) werden Kosten verursachungsgerecht auf Kostenstellen verteilt.",
    aufgabe:"Welche Kostenart lässt sich einem einzelnen Erzeugnis direkt zurechnen?",
    mcOptionen:[
      "Einzelkosten – z.B. Materialeinzelkosten, Fertigungseinzelkosten",
      "Gemeinkosten – z.B. Miete, Versicherungsbeiträge",
      "Fixkosten – z.B. Jahresabschreibungen auf Maschinen",
      "Zusatzkosten – z.B. kalkulatorische Zinsen auf das EK",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Einzelkosten (z.B. MEK, FEK) können dem Kostenträger direkt zugerechnet werden. Gemeinkosten (Miete, Versicherungen) entstehen für mehrere Kostenstellen und werden über Zuschlagssätze verteilt. (Kl.10 LB3)" },

  // ── LB4 DBR – Stückdeckungsbeitrag ────────────────────────────────────────
  { id:"k10_6", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kalkulation: Stückdeckungsbeitrag",
    story:"VitaSport GmbH, Produkt 'PulseRun' Laufband: Nettoverkaufspreis (NVP) 890,00 €/Stk., variable Kosten je Stück 580,00 €.",
    aufgabe:"Berechnen Sie den Stückdeckungsbeitrag in € (auf 2 Nachkommastellen). Formel: NVP − variable Kosten.",
    kalkulation:{ richtigerWert:310.00, einheit:"€" },
    soll:[], haben:[], betrag:310.00,
    erklaerung:"Stückdeckungsbeitrag = 890,00 − 580,00 = 310,00 €. Jeder verkaufte PulseRun trägt 310 € zur Deckung der Fixkosten und zum Gewinn bei. (Kl.10 LB4)" },

  // ── LB4 DBR – Break-even-Menge ────────────────────────────────────────────
  { id:"k10_7", typ:"kalkulation", ansicht:"konto", punkte:2, aktion:"klr",
    titel:"Kalkulation: Break-even-Menge",
    story:"VitaSport GmbH, PulseRun Laufband: Stückdeckungsbeitrag 310,00 €, Fixkosten gesamt 186.000 €.",
    aufgabe:"Berechnen Sie die Break-even-Menge (Gewinnschwelle) in Stück. Formel: Fixkosten ÷ Stück-DB.",
    kalkulation:{ richtigerWert:600, einheit:"Stk." },
    soll:[], haben:[], betrag:600,
    erklaerung:"Break-even-Menge = 186.000 / 310 = 600 Stk. Ab der 601. Einheit erzielt die VitaSport GmbH Gewinn. Unterhalb = Verlust. (Kl.10 LB4)" },

  // ── LB4 DBR – MC: Zusatzauftrag annehmen? ─────────────────────────────────
  { id:"t10_4", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Zusatzauftrag",
    story:"VitaSport GmbH erhält Zusatzauftrag: 50 Stk. 'AquaPro' Rudergerät zu 320 €/Stk. (NVP). Variable Kosten je Stück: 280 €. Freie Kapazität vorhanden.",
    aufgabe:"Soll der Zusatzauftrag angenommen werden?",
    mcOptionen:[
      "Ja – NVP (320 €) > variable Kosten (280 €) → positiver DB von 40 €/Stk.; freie Kapazität vorhanden",
      "Nein – der NVP liegt unter dem regulären Angebotspreis",
      "Nein – die Fixkosten werden durch den Zusatzauftrag nicht vollständig gedeckt",
      "Ja – aber nur dann, wenn der NVP über den Herstellkosten (inkl. Fixkostenanteil) liegt",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Bei freier Kapazität: Zusatzauftrag annehmen, wenn NVP > variable Kosten (positiver Deckungsbeitrag). Fixkosten sind bereits gedeckt und steigen nicht. → Jeder positive DB erhöht den Gewinn. (Kl.10 LB4)" },

  // ── LB4 DBR – MC: langfristige Preisuntergrenze ───────────────────────────
  { id:"t10_5", typ:"mc", ansicht:"konto", punkte:1, aktion:"theorie",
    titel:"Theoriefrage: Langfristige Preisuntergrenze",
    story:"Die VitaSport GmbH überlegt, dauerhaft zu einem günstigeren Preis zu verkaufen.",
    aufgabe:"Was ist die langfristige Preisuntergrenze bei der Teilkostenrechnung?",
    mcOptionen:[
      "Die Selbstkosten (Herstellkosten + Verwaltungs- und Vertriebsgemeinkosten) – alle Kosten müssen langfristig gedeckt sein",
      "Die variablen Kosten je Stück – kurzfristig reicht ein positiver Deckungsbeitrag",
      "Der Einstandspreis der Rohstoffe – nur direkte Materialkosten müssen gedeckt sein",
      "Null – solange überhaupt Umsatz erzielt wird, ist jeder Preis langfristig akzeptabel",
    ],
    mcKorrekt:0, soll:[], haben:[], betrag:0,
    erklaerung:"Langfristige Preisuntergrenze = Selbstkosten. Kurzfristig reichen variable Kosten (Deckungsbeitrag ≥ 0), aber langfristig müssen alle Kosten – auch Fixkosten – gedeckt werden. (Kl.10 LB4)" },

  // ── Lückentext (Kl. 10) ──────────────────────────────────────────────────
  { id:"lt10_1", typ:"lueckentext", ansicht:"konto", punkte:2, aktion:"lueckentext",
    titel:"Lückentext: Aktive Rechnungsabgrenzung bilden",
    story:"Zum Jahresabschluss 31.12.2025: Die Versicherungsprämie (01.07.2025–30.06.2026, 2.200,00 €) wurde bereits gezahlt. Der auf 2026 entfallende Anteil (6 Monate = 1.100,00 €) ist abzugrenzen.",
    aufgabe:"Vervollständigen Sie den Buchungssatz (Kürzel oder Nr. eingeben).",
    lueckentext:{
      template:"[L0] (2900) an [L1] (6900) — 1.100,00 €",
      luecken:[
        { id:0, hinweis:"Aktive Rechnungsabgrenzung (ARA / 2900)", korrekt:"ARA",  korrektAlt:["2900"] },
        { id:1, hinweis:"Versicherungsbeiträge (VBEI / 6900)",      korrekt:"VBEI", korrektAlt:["6900"] }
      ]
    },
    soll:[{kuerzel:"ARA",nr:"2900"}], haben:[{kuerzel:"VBEI",nr:"6900"}], betrag:1100,
    erklaerung:"ARA (2900) im Soll: Vorauszahlung auf 2026 aktivieren. VBEI (6900) im Haben: Aufwand auf das Folgejahr verschieben. Ergebnis 2025 wird entlastet. (Kl.10 LB1)" },

  // ── Zuordnung (Kl. 10) ───────────────────────────────────────────────────
  { id:"zu10_1", typ:"zuordnung", ansicht:"konto", punkte:4, aktion:"zuordnung",
    titel:"Zuordnung: Kosten → Kostenstelle im BAB",
    story:"Im Betriebsabrechnungsbogen (BAB) müssen Gemeinkosten den Kostenstellen zugeordnet werden.",
    aufgabe:"Ordnen Sie jede Kostenart der richtigen Hauptkostenstelle zu.",
    zuordnung:{
      items:[
        { id:"LohnFert",  text:"Löhne der Fertigungsarbeiter",   korrektKat:"FERT" },
        { id:"MieteVerw", text:"Miete Verwaltungsgebäude",        korrektKat:"VERW" },
        { id:"WerbVtr",   text:"Werbekosten (Anzeigen)",          korrektKat:"VTR"  },
        { id:"HilfsMat",  text:"Hilfsmaterial für Produktion",   korrektKat:"MAT"  },
        { id:"GehVerw",   text:"Gehälter Buchhaltungsabteilung", korrektKat:"VERW" },
      ],
      kategorien:[
        { id:"MAT",  label:"Material",    color:"#3b82f6", rgb:"59,130,246"  },
        { id:"FERT", label:"Fertigung",   color:"#e8600a", rgb:"232,96,10"   },
        { id:"VERW", label:"Verwaltung",  color:"#8b5cf6", rgb:"139,92,246"  },
        { id:"VTR",  label:"Vertrieb",    color:"#10b981", rgb:"16,185,129"  },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Fertigungsarbeiter → Fertigung. Verwaltungsmiete + Buchh.-Gehälter → Verwaltung. Werbung → Vertrieb. Hilfsmaterial → Material. Schlüssel: Verursachungsgerechte Zuteilung. (Kl.10 LB3)" },

  // ── Freitext-Aufgaben (Kl. 10) ────────────────────────────────────────────
  { id:"ft10_1", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Voll- vs. Teilkostenrechnung",
    story:"Im MSA-Kurs fragt Ihre Lehrkraft: Was ist der grundlegende Unterschied zwischen Voll- und Teilkostenrechnung?",
    aufgabe:"Erläutern Sie den Unterschied zwischen Voll- und Teilkostenrechnung. Nennen Sie je einen typischen Anwendungsfall.",
    freitext:{ zeilen:5, minZeichen:60,
      loesung:"Die Vollkostenrechnung verrechnet alle Kosten (fixe und variable) auf die Kostenträger (Produkte). Anwendungsfall: Kalkulation des Angebotspreises (Herstellkosten inkl. Fixkostenanteil über GKZ). Vorteil: langfristige Preisfindung. Nachteil: Fixkosten werden proportional verteilt – bei Beschäftigungsschwankungen entstehen Verzerrungen. Die Teilkostenrechnung berücksichtigt nur die variablen Kosten pro Einheit; Fixkosten werden als Periodenblock behandelt. Anwendungsfall: Entscheidung über Zusatzaufträge, kurzfristige Preisuntergrenze (DB ≥ 0). Vorteil: klare Entscheidungsgrundlage. Kennzahl: Deckungsbeitrag = NVP − variable Kosten." },
    erklaerung:"Vollkosten → BAB + GKZ → Herstellkosten → Angebotspreis. Teilkosten → DB = NVP − VK → Break-even, Make-or-buy, Zusatzauftrag. Kl.10 LB3/LB4." },

  { id:"ft10_2", typ:"freitext", ansicht:"konto", punkte:2, aktion:"freitext",
    titel:"Freitext: Rechnungsabgrenzungsposten",
    story:"Der Steuerberater erklärt dem Geschäftsführer aktive und passive Rechnungsabgrenzungsposten. Er bittet Sie, es in eigenen Worten zusammenzufassen.",
    aufgabe:"Erläutern Sie, was aktive und passive Rechnungsabgrenzungsposten (ARA/PRA) sind und geben Sie je ein Beispiel.",
    freitext:{ zeilen:5, minZeichen:60,
      loesung:"Rechnungsabgrenzungsposten dienen der periodengerechten Erfolgsermittlung: Aufwendungen und Erträge sollen in dem Jahr erfasst werden, zu dem sie wirtschaftlich gehören. ARA (2900, Aktiva): Ausgabe erfolgt bereits in diesem Jahr, der Aufwand gehört aber ins nächste Jahr – z.B. Versicherungsprämie 01.07.–30.06. wird im Juli bezahlt; der Anteil Jan.–Juni des Folgejahres wird als ARA aktiviert (ARA an VBEI). PRA (4900, Passiva): Einnahme erfolgt bereits, der Ertrag gehört aber ins nächste Jahr – z.B. Mietvorauszahlung des Mieters für das Folgejahr (BK an PRA)." },
    erklaerung:"ARA: Aktivseite (2900) – Ausgabe jetzt, Aufwand später. PRA: Passivseite (4900) – Einnahme jetzt, Ertrag später. Buchungen: ARA an Aufwandskonto / BK an PRA. Kl.10 LB1." },

  // ── Paare zuordnen (Kl. 10) ───────────────────────────────────────────────
  { id:"pa10_1", typ:"zuordnung", ansicht:"konto", punkte:4, aktion:"klr",
    titel:"Paare zuordnen: Kennzahl → Berechnungsformel",
    story:"Zur MSA-Vorbereitung legt Ihre Lehrkraft eine Formelübersicht vor. Ordnen Sie jeder Kennzahl die richtige Berechnungsformel zu.",
    aufgabe:"Welche Berechnungsformel gehört zu welcher Kennzahl?",
    zuordnung:{
      items:[
        { id:"adII", text:"Anlagendeckung II",       korrektKat:"adII_f" },
        { id:"ekr",  text:"EK-Rentabilität",          korrektKat:"ekr_f"  },
        { id:"eliq", text:"Einzugsliquidität",        korrektKat:"eliq_f" },
        { id:"mgkz", text:"Materialgemeinkostenzuschlag", korrektKat:"mgkz_f" },
      ],
      kategorien:[
        { id:"adII_f", label:"(EK + LFV) ÷ AV × 100",  color:"#e8600a", rgb:"232,96,10"  },
        { id:"ekr_f",  label:"Gewinn ÷ EK × 100",      color:"#10b981", rgb:"16,185,129" },
        { id:"eliq_f", label:"(FO + BK) ÷ KFV × 100",  color:"#3b82f6", rgb:"59,130,246" },
        { id:"mgkz_f", label:"MGK ÷ MEK × 100",        color:"#a855f7", rgb:"168,85,247" },
      ]
    },
    soll:[], haben:[], betrag:0,
    erklaerung:"Anlagendeckung II: (EK+LFV)÷AV×100 ≥100% = goldene Bilanzregel erfüllt. EK-Rentabilität: Gewinn÷EK×100. Einzugsliquidität: (FO+BK)÷KFV×100. MGKZ: MGK÷MEK×100. (Kl.10 LB2/LB3)" },
];

// ── Klasse 10 Kalender – Jahresabschluss-Nacharbeiten Januar 2026 ─────────────
// Wochenenden Jan 2026: 3,4,10,11,17,18,24,25,31 · Feiertage: 1 (Neujahr), 6 (Hl.3 Könige)
// Verfügbare Werktage: 2,5,7,8,9,12,13,14,15,16,19,20,21,22,23,26,27,28,29,30
export const KALENDER10_EINTRAEGE = [
  { tag:2,  text:"Jahresabschluss GJ 2025 – Startbesprechung mit Steuerberater", typ:"info" },
  { tag:5,  text:"ARA-Buchung: Versicherungsbeitrag 2025/26 abgrenzen",           typ:"task", aufgabeAktion:"buchung" },
  { tag:7,  text:"Rückstellung Prozesskosten bilden (3.500 €)",                   typ:"task", aufgabeAktion:"buchung" },
  { tag:9,  text:"BAB abschließen: Fertigungsgemeinkostenzuschlag berechnen",     typ:"task", aufgabeAktion:"klr"    },
  { tag:12, text:"Herstellkosten Kraftstation 'MaxForce 300' kalkulieren",         typ:"task", aufgabeAktion:"klr"    },
  { tag:14, text:"Stückdeckungsbeitrag PulseRun berechnen",                       typ:"task", aufgabeAktion:"klr"    },
  { tag:15, text:"Teambesprechung: Vertriebsstrategie Q1/2026",                   typ:"info" },
  { tag:19, text:"Break-even-Analyse PulseRun abschließen",                       typ:"task", aufgabeAktion:"klr"    },
  { tag:21, text:"Eigenkapitalrentabilität GJ 2025 ermitteln",                    typ:"task", aufgabeAktion:"klr"    },
  { tag:22, text:"Anlagendeckung II + Einzugsliquidität berechnen",               typ:"task", aufgabeAktion:"klr"    },
  { tag:27, text:"Entwurf Geschäftsbericht GJ 2025 prüfen",                       typ:"info" },
  { tag:29, text:"Jahresabschluss GJ 2025 finalisiert und übermittelt",            typ:"info" },
];

export const SIM_SCHWIERIGKEITEN = [
  { id: "7",  label: "Klasse 7",  desc: "Einfache Buchungen, keine USt" },
  { id: "8",  label: "Klasse 8",  desc: "Einkauf, Verkauf, Zahlung mit USt" },
  { id: "9",  label: "Klasse 9",  desc: "Kapitalanlage, Börsenspiel, AfA" },
  { id: "10", label: "Klasse 10", desc: "ARA, RST, Kennzahlen, KLR, MSA-Vorbereitung" },
];

// Eröffnungsbilanz-Werte je Schwierigkeit
export function simStartKonten(klasse) {
  const k = Number(klasse);
  const basis = [
    { nr:"0870", name:"BGA",         kuerzel:"BGA",   seite:"aktiv",  betrag: 15000 },
    { nr:"2800", name:"Bank (BK)",    kuerzel:"BK",    seite:"aktiv",  betrag: 20000 },
    { nr:"2400", name:"Ford. aus L+L (FO)", kuerzel:"FO", seite:"aktiv", betrag: 8000 },
    { nr:"2000", name:"Rohstoffe (R)", kuerzel:"R",    seite:"aktiv",  betrag:  5000 },
    { nr:"3000", name:"Eigenkapital (EK)", kuerzel:"EK", seite:"passiv", betrag: 35000 },
    { nr:"4400", name:"Verb. aus L+L (VE)", kuerzel:"VE", seite:"passiv", betrag: 13000 },
  ];
  if (k >= 9) {
    basis.push({ nr:"0700", name:"Maschinen und Anlagen (MA)", kuerzel:"MA", seite:"aktiv", betrag: 30000 });
    basis.find(b => b.nr==="3000").betrag += 30000;
  }
  return basis;
}

// Hilfsfunktion: Ereignis-Objekt bauen
// Klasse 7: nur Kürzel (keine Nummern), Klasse 8+: Nr + Kürzel
export function simKto(nr, name, kuerzel, betrag, klasse) {
  return { nr: Number(klasse) >= 8 ? nr : "", name: `${name}`, kuerzel, betrag };
}

// Geschäftsvorfälle-Pool je Schwierigkeit (je 15 Ereignisse)
export function simEreignisse(klasse, firma) {
  const k = Number(klasse);
  const fn = firma?.name || "Unser Unternehmen";
  const lief = (firma?.lieferanten || LIEFERANTEN)[0]?.name || "Müller GmbH";
  const kunde = (firma?.kunden || [{ name:"Schmidt AG" }])[0]?.name || "Schmidt AG";
  const kto = (nr, name, kuerzel, betrag) => simKto(nr, name, kuerzel, betrag, k);
  const pool = [];

  // Klasse 7+: Einfache Buchungen, nur Kürzel
  pool.push(
    { id:"s1", titel:"Bareinkauf Büromaterial", text:`${fn} kauft Büromaterial für 480 € bar.`,
      soll:[kto("0870","Büromöbel/Geschäftsausstattung","BGA",480)],
      haben:[kto("2880","Kasse","KA",480)], punkte:2, klasse:7 },
    { id:"s2", titel:"Barverkauf Waren", text:`${fn} verkauft Waren für 1.200 € bar (ohne USt, Kl. 7).`,
      soll:[kto("2880","Kasse","KA",1200)],
      haben:[kto("5000","Umsatzerlöse FE","UEFE",1200)], punkte:2, klasse:7 },
    { id:"s3", titel:"Miete überweisen", text:`${fn} überweist die Monatsmiete von 2.400 € per Bank.`,
      soll:[kto("6700","Mieten und Pachten","AWMP",2400)],
      haben:[kto("2800","Bank","BK",2400)], punkte:2, klasse:7 },
    { id:"s4", titel:"Gehälter überweisen", text:`${fn} überweist Löhne und Gehälter i.H.v. 8.500 €.`,
      soll:[kto("6200","Löhne und Gehälter","LG",8500)],
      haben:[kto("2800","Bank","BK",8500)], punkte:2, klasse:7 },
    { id:"s4b", titel:"Rohstoffe bar eingekauft", text:`${fn} kauft Rohstoffe für 3.200 € bar.`,
      soll:[kto("6000","Aufwend. Rohstoffe","AWR",3200)],
      haben:[kto("2880","Kasse","KA",3200)], punkte:2, klasse:7 },
  );

  // Klasse 8+: mit Kontonummern und USt
  if (k >= 8) pool.push(
    { id:"s5", titel:"Eingangsrechnung buchen", text:`${lief} liefert Rohstoffe auf Ziel. Netto 4.000 €, USt 19 % = 760 €, Brutto 4.760 €.`,
      soll:[kto("6000","Aufwend. Rohstoffe (AWR)",   "AWR",  4000),
            kto("2600","Vorsteuer (VORST)",           "VORST", 760)],
      haben:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE",4760)], punkte:3, klasse:8 },
    { id:"s6", titel:"Ausgangsrechnung buchen", text:`${fn} liefert Fertigerzeugnisse an ${kunde} auf Ziel. Netto 6.000 €, USt 19 % = 1.140 €, Brutto 7.140 €.`,
      soll:[kto("2400","Forderungen aus L+L (FO)",   "FO",   7140)],
      haben:[kto("5000","Umsatzerlöse FE (UEFE)",     "UEFE", 6000),
             kto("4800","Umsatzsteuer (UST)",          "UST",  1140)], punkte:3, klasse:8 },
    { id:"s7", titel:"Lieferantenrechnung bezahlen", text:`${fn} bezahlt Verbindlichkeiten i.H.v. 4.760 € per Banküberweisung.`,
      soll:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE",4760)],
      haben:[kto("2800","Bank (BK)",                   "BK", 4760)], punkte:2, klasse:8 },
    { id:"s8", titel:"Forderungseingang", text:`${kunde} überweist 7.140 €.`,
      soll:[kto("2800","Bank (BK)",                   "BK", 7140)],
      haben:[kto("2400","Forderungen aus L+L (FO)",   "FO", 7140)], punkte:2, klasse:8 },
    { id:"s9", titel:"Rücksendung an Lieferant", text:`${fn} sendet Rohstoffe im Wert von 500 € netto + 95 € USt (19 %) zurück.`,
      soll:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE", 595)],
      haben:[kto("6000","Aufwend. Rohstoffe (AWR)",   "AWR", 500),
             kto("2600","Vorsteuer (VORST)",           "VORST", 95)], punkte:3, klasse:8 },
    { id:"s10", titel:"Zahlung mit Skonto", text:`${fn} bezahlt VE über 2.380 € unter Abzug von 2 % Skonto (= 47,60 €). Zahlung per Bank: 2.332,40 €.`,
      soll:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE",   2380)],
      haben:[kto("2800","Bank (BK)",                   "BK",    2332.40),
             kto("6001","Bezugskosten Rohstoffe (BZKR)","BZKR", 47.60)], punkte:4, klasse:8 },
    { id:"s10b", titel:"Warenlieferung bar (mit USt)", text:`${fn} kauft Hilfsstoffe für 595 € brutto (19 % USt) bar.`,
      soll:[kto("6020","Aufwend. Hilfsstoffe (AWH)","AWH",500),
            kto("2600","Vorsteuer (VORST)",          "VORST",95)],
      haben:[kto("2880","Kasse (KA)","KA",595)], punkte:3, klasse:8 },
  );

  // Klasse 9+: Anlagen, AfA, ZWFO
  if (k >= 9) pool.push(
    { id:"s11", titel:"Maschine kaufen (auf Ziel)", text:`${fn} kauft eine Maschine für 24.000 € netto + 19 % USt (= 4.560 €) auf Ziel.`,
      soll:[kto("0700","Maschinen und Anlagen (MA)","MA",  24000),
            kto("2600","Vorsteuer (VORST)",          "VORST",4560)],
      haben:[kto("4400","Verbindlichkeiten aus L+L (VE)","VE",28560)], punkte:3, klasse:9 },
    { id:"s12", titel:"Abschreibung auf Sachanlagen", text:`Die Jahres-AfA auf Maschinen und Anlagen beträgt 4.800 €.`,
      soll:[kto("6520","Abschreibungen auf Sachanlagen (ABSA)","ABSA",4800)],
      haben:[kto("0700","Maschinen und Anlagen (MA)","MA",4800)], punkte:2, klasse:9 },
    { id:"s13", titel:"Zweifelhafte Forderung", text:`Die Forderung über 3.570 € brutto an ${kunde} ist gefährdet. Umbuchen auf zweifelhafte Forderungen.`,
      soll:[kto("2470","Zweifelhafte Forderungen (ZWFO)","ZWFO",3570)],
      haben:[kto("2400","Forderungen aus L+L (FO)",      "FO",  3570)], punkte:3, klasse:9 },
  );

  // Klasse 10: Jahresabschluss
  if (k >= 10) pool.push(
    { id:"s14", titel:"Rückstellung bilden", text:`${fn} bildet eine Rückstellung für Prozesskosten i.H.v. 5.000 €.`,
      soll:[kto("6990","Rückstellungsaufwand","RST-AW",5000)],
      haben:[kto("3900","Rückstellungen (RST)","RST",5000)], punkte:3, klasse:10 },
    { id:"s15", titel:"Aktive Rechnungsabgrenzung", text:`${fn} hat Versicherungskosten von 1.800 € vorausgezahlt, die das Folgejahr betreffen.`,
      soll:[kto("2900","Aktiver Rechnungsabgrenzungsposten (ARA)","ARA",1800)],
      haben:[kto("6700","Mieten und Pachten (AWMP)","AWMP",1800)], punkte:3, klasse:10 },
  );

  const gefiltert = pool.filter(e => e.klasse <= k);
  const gemischt = [...gefiltert].sort(() => Math.random() - 0.5);
  return gemischt.slice(0, Math.min(15, gemischt.length));
}
