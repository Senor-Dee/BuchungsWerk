// ══════════════════════════════════════════════════════════════════════════════
// EigeneBelege – Aufgabengenerator aus dem Beleg-Editor
// Extrahiert aus BuchungsWerk.jsx – Phase C8 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { CheckSquare, ClipboardList, Star, Zap } from "lucide-react";
import { apiFetch } from "../../api.js";
import { belegToBuchungssatz, buchungssatzToText } from "../../utils/buchungsEngine.js";
import DraggableHaken from "../DraggableHaken.jsx";
import { KürzelSpan } from "../kontenplan/KontenplanModal.jsx";
import { BeVorschauRechnung, BeVorschauKontoauszug, BeVorschauUeberweisung, BeVorschauEmail, BeVorschauQuittung } from "../beleg/BelegEditorModal.jsx";

// EIGENE BELEGE – Aufgabenpool aus BelegEditor
// ══════════════════════════════════════════════════════════════════════════════

const BELEGTYP_LABELS = {
  eingangsrechnung: "Eingangsrechnung",
  ausgangsrechnung: "Ausgangsrechnung",
  kontoauszug:      "Kontoauszug",
  ueberweisung:     "Überweisung",
  email:            "E-Mail",
  quittung:         "Quittung",
};

function belegZuText(b) {
  const d = b.data;
  switch (b.typ) {
    case "eingangsrechnung": {
      const pos = (d.positionen || []).map(p => `${p.menge} ${p.einheit} ${p.artikel} à ${p.ep} € netto`).join(", ");
      const rabatt = d.rabattAktiv ? ` Sofortrabatt: ${d.rabattArt} ${d.rabattPct} %.` : "";
      const bezug  = parseFloat(d.bezugskosten) > 0 ? ` Bezugskosten: ${d.bezugskosten} €.` : "";
      const skonto = parseFloat(d.skontoPct) > 0 ? ` Skonto: ${d.skontoPct} % bei Zahlung in ${d.skontoTage} Tagen.` : "";
      return `Eingangsrechnung von ${d.lieferantName} an ${d.empfaengerName}. Positionen: ${pos}.${rabatt}${bezug} USt: ${d.ustSatz} %. Zahlungsziel: ${d.zahlungsziel} Tage.${skonto} Rechnungs-Nr.: ${d.rechnungsNr}.`;
    }
    case "ausgangsrechnung": {
      const pos = (d.positionen || []).map(p => `${p.menge} ${p.einheit} ${p.artikel} à ${p.ep} € netto`).join(", ");
      const rabatt = d.rabattAktiv ? ` Sofortrabatt: ${d.rabattArt} ${d.rabattPct} %.` : "";
      const skonto = parseFloat(d.skontoPct) > 0 ? ` Skonto: ${d.skontoPct} % bei Zahlung in ${d.skontoTage} Tagen.` : "";
      return `Ausgangsrechnung von ${d.absenderName} an ${d.kundeName}. Positionen: ${pos}.${rabatt} USt: ${d.ustSatz} %. Zahlungsziel: ${d.zahlungsziel} Tage.${skonto}`;
    }
    case "kontoauszug": {
      const hl = (d.buchungen || []).find(x => x.highlight);
      return `Kontoauszug der ${d.bank}, Inhaber: ${d.inhaber}. Zu buchende Zeile: "${hl?.text || "(keine markiert)"}", Betrag: ${hl?.betrag || "?"} €.`;
    }
    case "ueberweisung":
      return `Überweisung von ${d.auftraggeberName} an ${d.empfaengerName}, Betrag: ${d.betrag} €, Verwendung: ${d.verwendung}.${parseFloat(d.skontoBetrag) > 0 ? ` Skonto-Abzug: ${d.skontoBetrag} €.` : ""}`;
    case "email":
      return `E-Mail von ${d.von} an ${d.an}, Betreff: "${d.betreff}". Inhalt: ${d.text?.slice(0, 200)}`;
    case "quittung":
      return `Quittung Nr. ${d.quittungsNr}. Aussteller: ${d.aussteller}. Zahlender: ${d.empfaenger}. Betrag: ${d.betrag} €. Zweck: ${d.zweck}.`;
    default: return JSON.stringify(b.data).slice(0, 300);
  }
}

function EigeneBelege({ onSchliessen }) {
  const [belege, setBelege] = useState(() => {
    try { return JSON.parse(localStorage.getItem("buchungswerk_belege") || "[]"); }
    catch { return []; }
  });
  const [selected, setSelected]         = useState(null);
  const [genStatus, setGenStatus]       = useState(null); // null | "loading" | "ok" | "error:<msg>"
  // FIX 2: Historie statt einzelnem Result – Folgeaufgaben werden ANGEHÄNGT
  const [historie, setHistorie]         = useState([]);
  const [klasse, setKlasse]             = useState("9");
  const [kopiert, setKopiert]           = useState(null);
  const [vorschlaege, setVorschlaege]   = useState(null);
  const [vorschlaegeStatus, setVorschlaegeStatus] = useState(null);

  const loeschen = (id) => {
    const neu = belege.filter(b => b.id !== id);
    localStorage.setItem("buchungswerk_belege", JSON.stringify(neu));
    setBelege(neu);
    if (selected?.id === id) { setSelected(null); setHistorie([]); setVorschlaege(null); }
  };

  // FIX 2+3: Anhängen + ISB-Punkte im Prompt
  const generieren = async (varianteHinweis = null, varianteTitel = null) => {
    if (!selected) return;
    setGenStatus("loading");
    setVorschlaege(null);
    setVorschlaegeStatus(null);

    // ── Schritt 1: Lokale BuchungsEngine (0 Tokens, offline, <50ms) ──────────
    let engineBuchungssatz = null;
    try {
      const { buchungssatz } = belegToBuchungssatz({ typ: selected.typ, data: selected.data }, Number(klasse));
      engineBuchungssatz = buchungssatz;
    } catch { /* Fallback: vollständiger KI-Prompt */ }

    const belegText = belegZuText(selected);
    const varianteZusatz = varianteHinweis ? `\n\nVariante / Fokus: ${varianteHinweis}` : "";

    // ── Schritt 2: KI-Prompt (kurz wenn Engine erfolgreich, sonst vollständig) ─
    let maxTokens;
    let prompt;
    if (engineBuchungssatz) {
      // Engine hat Buchungssatz berechnet → KI nur für Aufgabentext (~400 Tokens)
      const bsText = buchungssatzToText(engineBuchungssatz);
      maxTokens = 400;
      prompt = `Du bist BwR-Fachlehrer an einer bayerischen Realschule (Klasse ${klasse}, ISB LehrplanPLUS Bayern).
Erstelle auf Basis des folgenden Belegs einen Aufgabentext für Schüler.
Der Buchungssatz wurde bereits berechnet: ${bsText}

BELEG: ${belegText}${varianteZusatz}

Kontoangabe: Klasse ≤7 → nur Kürzel (soll_nr = ""), Klasse 8–10 → Nummer + Kürzel.
Anrede: Klasse ≤9 → Du-Form, Klasse 10 → Sie-Form.

Antworte NUR mit JSON (kein Markdown):
{
  "aufgabe": "Aufgabenstellung für Schüler (1–3 Sätze)",
  "nebenrechnung": "Rechenweg mit Schrittangabe, sonst leer",
  "nebenrechnung_punkte": 0,
  "erklaerung": "Didaktischer Kommentar für den Lehrer (2–3 Sätze)"
}`;
    } else {
      // Fallback: vollständiger Prompt mit Kontenplan (~1000 Tokens)
      maxTokens = 1000;
      prompt = `Du bist BwR-Fachlehrer an einer bayerischen Realschule (Klasse ${klasse}, ISB LehrplanPLUS Bayern).
Erstelle auf Basis des folgenden Belegs eine korrekte Buchungsaufgabe.

BELEG: ${belegText}${varianteZusatz}

══════════════════════════════════════════════
ISB-KONTENPLAN BAYERN – NUR DIESE KONTEN VERWENDEN!
══════════════════════════════════════════════
AKTIVKONTEN:
0500 GR     | Grundstücke
0700 MA     | Maschinen und Anlagen
0840 FP     | Fuhrpark
0860 BM     | Büromaschinen
0870 BGA    | Büromöbel und Geschäftsausstattung
0890 GWG    | Geringwertige Wirtschaftsgüter
2000 R      | Rohstoffe
2010 F      | Fremdbauteile
2020 H      | Hilfsstoffe
2030 B      | Betriebsstoffe
2400 FO     | Forderungen aus Lieferungen und Leistungen
2470 ZWFO   | Zweifelhafte Forderungen
2600 VORST  | Vorsteuer
2800 BK     | Bank (Kontokorrentkonto)
2880 KA     | Kasse
2900 ARA    | Aktive Rechnungsabgrenzung

PASSIVKONTEN:
3000 EK     | Eigenkapital
3001 P      | Privatkonto
3670 EWB    | Einzelwertberichtigung
3680 PWB    | Pauschalwertberichtigung
3900 RST    | Rückstellungen
4200 KBKV   | Kurzfristige Bankverbindlichkeiten
4250 LBKV   | Langfristige Bankverbindlichkeiten
4400 VE     | Verbindlichkeiten aus Lieferungen und Leistungen
4800 UST    | Umsatzsteuer
4900 PRA    | Passive Rechnungsabgrenzung

ERTRAGSKONTEN:
5000 UEFE   | Umsatzerlöse für eigene Erzeugnisse
5430 ASBE   | Andere sonstige betriebliche Erträge
5495 EFO    | Erträge aus abgeschriebenen Forderungen
5710 ZE     | Zinserträge

AUFWANDSKONTEN:
6000 AWR    | Aufwendungen für Rohstoffe
6001 BZKR   | Bezugskosten für Rohstoffe
6010 AWF    | Aufwendungen für Fremdbauteile
6020 AWH    | Aufwendungen für Hilfsstoffe
6030 AWB    | Aufwendungen für Betriebsstoffe
6140 AFR    | Ausgangsfrachten
6200 LG     | Löhne und Gehälter
6400 AGASV  | Arbeitgeberanteil zur Sozialversicherung
6520 ABSA   | Abschreibungen auf Sachanlagen
6700 AWMP   | Mieten, Pachten
6750 KGV    | Kosten des Geldverkehrs
6800 BMK    | Büromaterial und Kleingüter
6870 WER    | Werbung
6900 VBEI   | Versicherungsbeiträge
6950 ABFO   | Abschreibungen auf Forderungen
7510 ZAW    | Zinsaufwendungen

══════════════════════════════════════════════
BUCHUNGSSTRUKTUR-REGELN (ISB LehrplanPLUS Bayern)
══════════════════════════════════════════════

AUSGANGSRECHNUNG (Verkauf auf Ziel):
  Buchungssatz: 2400 FO an 5000 UEFE (Nettobetrag) + 4800 UST (Umsatzsteuerbetrag)
  → IMMER als zusammengesetzter Buchungssatz mit 3 Posten im JSON!
  → Jede Teilbuchung = 1 Punkt (2400 FO an 5000 UEFE = Punkt 1; 2400 FO an 4800 UST = Punkt 2)
  → Bei Sofortrabatt auf Rechnung: Nettobetrag NACH Rabatt verwenden, kein eigenes Rabattkonto!

EINGANGSRECHNUNG (Kauf auf Ziel):
  Buchungssatz: 6000 AWR (o.ä.) + 2600 VORST an 4400 VE
  → IMMER zusammengesetzt! Jede Teilbuchung = 1 Punkt
  → Bei Bezugskosten: 6001 BZKR als eigene Zeile
  → Bei Sofortrabatt: Nettobetrag nach Abzug, kein Rabattkonto
  → Bei GWG (≤800 € netto): 0890 GWG + 2600 VORST an 4400 VE

BARZAHLUNG (Kassenbeleg):
  Kauf bar:    Aufwandskonto + 2600 VORST an 2880 KA
  Verkauf bar: 2880 KA an 5000 UEFE + 4800 UST

RECHNUNGSAUSGLEICH ÜBERWEISUNG:
  Ausgangsrechnung beglichen: 2800 BK an 2400 FO (Bruttobetrag)
  Eingangsrechnung bezahlt:   4400 VE an 2800 BK (Bruttobetrag)
  Mit Skonto (Klasse 8+): zusätzlich 6750 KGV (Käufer) bzw. 5430 ASBE (Verkäufer) buchen

ANLAGEVERMÖGEN (Kauf auf Ziel):
  0700 MA (o.ä.) + 2600 VORST an 4400 VE

ABSCHREIBUNG:
  6520 ABSA an 0700 MA (o.ä.)  – kein USt-Vorgang!

══════════════════════════════════════════════
KONTOANGABE nach Klassenstufe:
══════════════════════════════════════════════
Klasse 7:    NUR Kürzel (z. B. "FO", "UEFE", "UST") – soll_nr und haben_nr = ""
Klasse 8–10: Nummer + Kürzel (z. B. "2400 FO", "5000 UEFE", "4800 UST")

══════════════════════════════════════════════
PUNKTEVERGABE (ISB Handreichung BwR 2025)
══════════════════════════════════════════════
BUCHUNGSSÄTZE:
- 1 Punkt pro Konto-Betrag-Block (Teilbuchung im zusammengesetzten Satz)
- Reine USt-Berechnung = KEIN eigener Punkt

NEBENRECHNUNGEN (1 Punkt je wenn echter betriebswirtschaftlicher Gedankenschritt):
- Skonto-Berechnung beim Rechnungsausgleich: 1 Punkt
- Anschaffungskosten / Abschreibungshöhe: 1 Punkt
- Zeitanteilige Abschreibung (Monatszahl): 1 Punkt
- EWB / PWB / Forderungsausfall-Berechnung: 1 Punkt
- Disagio / Auszahlungsbetrag Darlehen: 1 Punkt
- Periodenrichtige Abgrenzung: 1 Punkt
KEIN Punkt: reine USt-Berechnung, reine Rabattrechnung

BRUTTO→NETTO:
- Klasse 7: 1 Punkt
- Klasse 8+: kein Punkt (außer als Basis für EWB/PWB, Skonto-Nettovergleich, Abgrenzung)

Setze nebenrechnung_punkte nur dann > 0, wenn ein echter Punkt nach obigen Regeln vorliegt.

══════════════════════════════════════════════
AUSGABE: NUR JSON (kein Markdown, kein Text davor/danach)
══════════════════════════════════════════════
{
  "aufgabe": "Aufgabenstellung für Schüler (1-3 Sätze; Klasse ≤9: Du-Form; Klasse 10: Sie-Form)",
  "buchungssatz": [
    {
      "gruppe": 1,
      "soll_nr": "XXXX", "soll_name": "Kontoname (KÜRZEL)",
      "haben_nr": "XXXX", "haben_name": "Kontoname (KÜRZEL)",
      "betrag": 0.00, "punkte": 1, "erklaerung": "Begründung"
    }
  ],
  "nebenrechnung": "Rechenweg mit Schrittangabe, sonst leer",
  "nebenrechnung_punkte": 0,
  "punkte_gesamt": 2,
  "erklaerung": "Didaktischer Kommentar für den Lehrer (2-3 Sätze)"
}

ZUSAMMENGESETZTER BUCHUNGSSATZ – PFLICHT-REGELN FÜR DAS JSON:
- Alle Zeilen, die zum selben buchhalterischen Vorgang gehören, erhalten dieselbe "gruppe"-Zahl (z. B. alle 1).
- Verschiedene Vorgänge (z. B. Einkauf UND Abschreibung in derselben Aufgabe) erhalten verschiedene gruppe-Zahlen (1, 2, ...).
- Bei Ausgangsrechnung (Verkauf auf Ziel): gruppe=1 für BEIDE Zeilen:
    { "gruppe":1, "soll_nr":"2400", "soll_name":"Forderungen aus L+L (FO)", "haben_nr":"5000", "haben_name":"Umsatzerlöse f. eig. Erzeugnisse (UEFE)", "betrag":4500.00, "punkte":1, "erklaerung":"Forderung gegen Kunden" }
    { "gruppe":1, "soll_nr":"2400", "soll_name":"Forderungen aus L+L (FO)", "haben_nr":"4800", "haben_name":"Umsatzsteuer (UST)", "betrag":855.00, "punkte":1, "erklaerung":"USt-Schuld gegenüber Finanzamt" }
- Bei Eingangsrechnung (Kauf auf Ziel): gruppe=1 für BEIDE Zeilen:
    { "gruppe":1, "soll_nr":"6000", "soll_name":"Aufwendungen f. Rohstoffe (AWR)", "haben_nr":"4400", "haben_name":"Verbindlichkeiten aus L+L (VE)", "betrag":1000.00, "punkte":1, "erklaerung":"Materialaufwand" }
    { "gruppe":1, "soll_nr":"2600", "soll_name":"Vorsteuer (VORST)", "haben_nr":"4400", "haben_name":"Verbindlichkeiten aus L+L (VE)", "betrag":190.00, "punkte":1, "erklaerung":"Vorsteuer aus Eingangsrechnung" }
- NIEMALS nur eine Zeile für einen zusammengesetzten Vorgang ausgeben!
- Die punkte_gesamt-Zahl muss der Summe aller punkte-Felder (+ nebenrechnung_punkte) entsprechen.`;
    } // end else (fallback prompt)

    try {
      const json = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: maxTokens }, 45000, true);
      const text = json.content?.find(c => c.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

      // ── Schritt 3: Buchungssatz zusammensetzen (Engine hat Vorrang) ──────────
      const finalBuchungssatz = engineBuchungssatz ?? parsed.buchungssatz;
      const bsPunkte = (finalBuchungssatz || []).reduce((s, z) => s + (z.punkte || 1), 0);
      const punkte_gesamt = bsPunkte + (parsed.nebenrechnung_punkte || 0);

      const eintrag = { ...parsed, buchungssatz: finalBuchungssatz, punkte_gesamt, _label: varianteTitel || "Aufgabe", _ts: Date.now() };
      setHistorie(prev => {
        const neu = [...prev, eintrag];
        // Für Export in SchrittAufgaben bereitstellen
        try { localStorage.setItem("buchungswerk_ki_export", JSON.stringify(neu.map(e => ({ result: e, beleg: selected })))); } catch {}
        return neu;
      });
      setGenStatus("ok");
      ladeVorschlaege(belegText, parsed);
    } catch(e) { setGenStatus("error:" + (e?.message || "unbekannt")); }
  };

  const ladeVorschlaege = async (belegText, ergebnis) => {
    setVorschlaegeStatus("loading");
    const prompt = `Du bist BwR-Lehrer (Klasse ${klasse}, Bayern). Zum folgenden Beleg wurde bereits eine Buchungsaufgabe erstellt.
Beleg: ${belegText}
Bereits generierte Aufgabe: ${ergebnis.aufgabe}

Schlage 3 weitere didaktisch sinnvolle Aufgabenvarianten oder Folgethemen vor.

Antworte NUR mit JSON (kein Markdown):
{ "vorschlaege": [ { "titel": "Kurzer Titel", "beschreibung": "1 Satz was geübt wird", "variante": "Präziser Hinweis für Aufgabengenerierung (1-2 Sätze)" } ] }`;
    try {
      const json = await apiFetch("/ki/buchung", "POST", { prompt, max_tokens: 600 }, 45000);
      if (!json) throw new Error("Keine Antwort vom KI-Proxy");
      const text = json.content?.find(c => c.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setVorschlaege(parsed.vorschlaege);
      setVorschlaegeStatus("ok");
    } catch { setVorschlaegeStatus("error"); }
  };

  const exportText = (result, idx) => {
    const buchungen = result.buchungssatz || [];
    const gruppen = [...new Set(buchungen.map(b => b.gruppe ?? 0))];
    const bs = gruppen.map(g => {
      const zeilen = buchungen.filter(b => (b.gruppe ?? 0) === g);
      const sollSeite = [...new Map(zeilen.map(z => [z.soll_nr, z])).values()];
      const gesamtBetrag = zeilen.reduce((s, z) => s + (typeof z.betrag === "number" ? z.betrag : 0), 0);
      const sollStr = sollSeite.map(z => `${z.soll_nr} ${z.soll_name}`).join(" + ");
      if (zeilen.length === 1) {
        const z = zeilen[0];
        const b = typeof z.betrag === "number" ? z.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : z.betrag;
        return `  ${z.soll_nr} ${z.soll_name}  an  ${z.haben_nr} ${z.haben_name}  ${b} €  [${z.punkte ?? 1} P]`;
      }
      const habenZeilen = zeilen.map(z => {
        const b = typeof z.betrag === "number" ? z.betrag.toLocaleString("de-DE",{minimumFractionDigits:2}) : z.betrag;
        return `    an  ${z.haben_nr} ${z.haben_name}  ${b} €  [${z.punkte ?? 1} P]`;
      }).join("\n");
      return `  ${sollStr}  ${gesamtBetrag.toLocaleString("de-DE",{minimumFractionDigits:2})} €\n${habenZeilen}`;
    }).join("\n") || "";
    const text = `AUFGABE (${result.punkte_gesamt ?? "?"} Punkte)\n${"─".repeat(50)}\n${result.aufgabe}\n\n${result.nebenrechnung ? `NEBENRECHNUNG (${result.nebenrechnung_punkte ?? 0} P)\n${"─".repeat(50)}\n${result.nebenrechnung}\n\n` : ""}BUCHUNGSSATZ\n${"─".repeat(50)}\n${bs}\n\n${result.erklaerung ? `DIDAKTIK (Lehrer)\n${"─".repeat(50)}\n${result.erklaerung}` : ""}`;
    navigator.clipboard.writeText(text).then(() => { setKopiert(idx); setTimeout(() => setKopiert(null), 2000); });
  };

  const exportDruck = (result) => {
    const buchungen = result.buchungssatz || [];
    const gruppen = [...new Set(buchungen.map(b => b.gruppe ?? 0))];
    const bs = gruppen.map(g => {
      const zeilen = buchungen.filter(b => (b.gruppe ?? 0) === g);
      const sollSeite = [...new Map(zeilen.map(z => [z.soll_nr, z])).values()];
      const gesamtBetrag = zeilen.reduce((s, z) => s + (typeof z.betrag === "number" ? z.betrag : 0), 0);
      const btFmt = n => typeof n === "number" ? n.toLocaleString("de-DE",{minimumFractionDigits:2}) : n;
      if (zeilen.length === 1) {
        const z = zeilen[0];
        return `<tr><td style="padding:7px 10px;font-weight:700;color:#1d4ed8">${z.soll_nr} ${z.soll_name}</td><td style="padding:7px 10px;color:#94a3b8;text-align:center;font-weight:400">an</td><td style="padding:7px 10px;font-weight:700;color:#dc2626">${z.haben_nr} ${z.haben_name}</td><td style="padding:7px 10px;text-align:right;font-family:monospace;color:#059669;font-weight:700">${btFmt(z.betrag)} €</td><td style="padding:7px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;background:#0f172a;border-radius:4px">${z.punkte ?? 1} P</td></tr>`;
      }
      const sollStr = sollSeite.map(z => `${z.soll_nr} ${z.soll_name}`).join("<br>");
      const firstRow = `<tr><td rowspan="${zeilen.length}" style="padding:7px 10px;font-weight:700;color:#1d4ed8;vertical-align:middle;border-right:1px solid #e2e8f0">${sollStr}<br><span style='font-family:monospace;color:#059669;font-size:12px'>${btFmt(gesamtBetrag)} €</span></td><td style="padding:7px 10px;color:#94a3b8;text-align:center;font-weight:400">an</td><td style="padding:7px 10px;font-weight:700;color:#dc2626">${zeilen[0].haben_nr} ${zeilen[0].haben_name}</td><td style="padding:7px 10px;text-align:right;font-family:monospace;color:#059669;font-weight:700">${btFmt(zeilen[0].betrag)} €</td><td style="padding:7px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;background:#0f172a;border-radius:4px">${zeilen[0].punkte ?? 1} P</td></tr>`;
      const restRows = zeilen.slice(1).map(z => `<tr><td style="padding:7px 10px;color:#94a3b8;text-align:center;font-weight:400">an</td><td style="padding:7px 10px;font-weight:700;color:#dc2626">${z.haben_nr} ${z.haben_name}</td><td style="padding:7px 10px;text-align:right;font-family:monospace;color:#059669;font-weight:700">${btFmt(z.betrag)} €</td><td style="padding:7px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;background:#0f172a;border-radius:4px">${z.punkte ?? 1} P</td></tr>`).join("");
      return firstRow + restRows;
    }).join("") || "";
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>BuchungsWerk – Aufgabe</title><style>body{font-family:'Segoe UI',sans-serif;max-width:720px;margin:40px auto;color:#0f172a}.lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;margin:0 0 5px}.badge{display:inline-block;background:#0f172a;color:#e8600a;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:800;margin-left:8px}p{font-size:15px;line-height:1.7;margin:0 0 20px}table{width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e2e8f0}td{font-size:13px;border-bottom:1px solid #f1f5f9}.nr{font-family:monospace;font-size:12px;background:#f8fafc;padding:12px 14px;border-radius:6px;white-space:pre-wrap;margin-bottom:20px;border:1px solid #e2e8f0}.erkl{background:#fffbeb;border-left:4px solid #e8600a;padding:12px 16px;font-size:12px;color:#92400e}@media print{.erkl{display:none}}</style></head><body><div class="lbl">Aufgabenstellung <span class="badge">${result.punkte_gesamt ?? "?"} Punkte</span></div><p>${result.aufgabe}</p>${result.nebenrechnung ? `<div class="lbl">Nebenrechnung <span class="badge">${result.nebenrechnung_punkte ?? 0} P</span></div><div class="nr">${result.nebenrechnung.replace(/\n/g,"<br>")}</div>` : ""}<div class="lbl">Buchungssatz</div><table>${bs}</table>${result.erklaerung ? `<div class="erkl"><strong>💡 Didaktik (Lehrer):</strong> ${result.erklaerung}</div>` : ""}</body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  // ISB Korrekturzeichen: DraggableHaken (globale Komponente) – frei verschiebbar
  const ISBHaken = () => <DraggableHaken />;

  // Wiederverwendbare Aufgaben-Karte
  const AufgabeKarte = ({ result, nr, isLatest }) => {
    const nrPunkte = result.nebenrechnung_punkte ?? 0;
    return (
    <div style={{ borderTop: nr > 1 ? "2px dashed rgba(240,236,227,0.1)" : "none", paddingTop: nr > 1 ? 16 : 0, display:"flex", flexDirection:"column", gap:10 }}>
      {/* Kopfzeile */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:24, height:24, borderRadius:"50%", background: isLatest ? "#e8600a" : "rgba(240,236,227,0.1)", color: isLatest ? "#0f172a" : "rgba(240,236,227,0.5)", fontWeight:800, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{nr}</div>
        <span style={{ fontWeight:700, fontSize:13, color:"#f0ece3" }}>{result._label}</span>
        {(result.punkte_gesamt ?? 0) > 0 && (
          <span style={{ marginLeft:"auto", background:"#0f172a", color:"#e8600a", borderRadius:20, padding:"2px 11px", fontSize:11, fontWeight:800 }}>{result.punkte_gesamt} P</span>
        )}
      </div>

      {/* Aufgabenstellung */}
      <div style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.08)", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(240,236,227,0.4)", marginBottom:7 }}>Aufgabenstellung</div>
        <div style={{ fontSize:14, lineHeight:1.7, color:"#f0ece3" }}>{result.aufgabe}</div>
      </div>

      {/* Nebenrechnung mit ✓-Haken wenn bepunktet */}
      {result.nebenrechnung && (
        <div style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:8, padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(251,191,36,0.7)" }}>📐 Nebenrechnung</div>
            <div style={{ display:"flex", gap:3, alignItems:"center" }}>
              {nrPunkte > 0
                ? Array.from({ length: nrPunkte }).map((_, i) => <ISBHaken key={i} title={`✓ = 1 Punkt (Nebenrechnung Schritt ${i+1})`} />)
                : <span style={{ fontSize:9, color:"rgba(251,191,36,0.6)", fontStyle:"italic" }}>kein eigener Punkt (Handreichung)</span>
              }
            </div>
          </div>
          <div style={{ fontFamily:"monospace", fontSize:12, whiteSpace:"pre-wrap", background:"rgba(251,191,36,0.04)", padding:"10px 12px", borderRadius:6, color:"rgba(251,191,36,0.8)" }}>{result.nebenrechnung}</div>
        </div>
      )}

      {/* Buchungssätze – gruppe-basiert, ISB-Format: "an" nur einmal */}
      <div style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.08)", borderRadius:8, padding:14 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(240,236,227,0.4)", marginBottom:10 }}>Buchungssatz</div>
        {(() => {
          const buchungen = result.buchungssatz || [];
          const gruppen = [...new Set(buchungen.map(b => b.gruppe ?? 0))];
          const btFmt = n => typeof n === "number" ? n.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) : n;
          return gruppen.map(g => {
            const zeilen = buchungen.filter(b => (b.gruppe ?? 0) === g);
            const sollSeite = [...new Map(zeilen.map(z => [z.soll_nr, z])).values()];
            const isMehrfach = zeilen.length > 1;
            // ISB-Buchungssatzformat:
            // Einfach:      SOLL ✓  an  HABEN ✓  Betrag  P
            // Zusammenges.: SOLL ✓  an  HABEN1 ✓  Betrag1  P
            //                           HABEN2 ✓  Betrag2  P
            return (
              <div key={g} style={{ padding:"10px 12px", background:"rgba(240,236,227,0.03)", borderRadius:6, marginBottom:6, borderLeft:"3px solid #3b82f6", fontFamily:"inherit" }}>
                {zeilen.map((z, zi) => (
                  <div key={zi} style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", fontSize:13, fontWeight:600, marginBottom: zi < zeilen.length-1 ? 4 : 0 }}>
                    {/* Soll – nur in erster Zeile */}
                    {zi === 0 ? (
                      <span style={{ color:"#93c5fd", minWidth:0 }}>
                        {sollSeite.map((s, si) => (
                          <span key={si}>{s.soll_nr && <>{s.soll_nr} </>}<KürzelSpan nr={s.soll_nr} style={{ color:"#93c5fd", fontWeight:600, fontSize:13 }} /></span>
                        ))}
                      </span>
                    ) : (
                      /* Platzhalter gleicher Breite für Folgezeilen */
                      <span style={{ visibility:"hidden", color:"#93c5fd", userSelect:"none", minWidth:0 }}>
                        {sollSeite.map((s, si) => (
                          <span key={si}>{s.soll_nr && <>{s.soll_nr} </>}<KürzelSpan nr={s.soll_nr} style={{ color:"#93c5fd", fontWeight:600, fontSize:13 }} /></span>
                        ))}
                      </span>
                    )}
                    {/* ISBHaken nach Soll – nur in erster Zeile sichtbar */}
                    {zi === 0 ? <ISBHaken /> : <span style={{ visibility:"hidden" }}><ISBHaken /></span>}
                    {/* "an" – nur in erster Zeile */}
                    {zi === 0
                      ? <span style={{ color:"rgba(240,236,227,0.35)", fontWeight:400, fontSize:12, flexShrink:0 }}>an</span>
                      : <span style={{ color:"transparent", fontWeight:400, fontSize:12, flexShrink:0, userSelect:"none" }}>an</span>
                    }
                    {/* Haben-Konto */}
                    <span style={{ color:"#fca5a5" }}>
                      {z.haben_nr && <>{z.haben_nr} </>}<KürzelSpan nr={z.haben_nr} style={{ color:"#fca5a5", fontWeight:600, fontSize:13 }} />
                    </span>
                    <ISBHaken />
                    {/* Betrag + Punkte */}
                    <span style={{ marginLeft:"auto", fontFamily:"monospace", color:"#4ade80", fontWeight:700 }}>
                      {btFmt(z.betrag)} €
                    </span>
                    <span style={{ background:"rgba(232,96,10,0.15)", border:"1px solid rgba(232,96,10,0.35)", color:"#e8600a", borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:800 }}>{z.punkte ?? 1} P</span>
                    {/* Erklärung */}
                    {z.erklaerung && <div style={{ width:"100%", fontSize:11, color:"rgba(240,236,227,0.45)", fontWeight:400, marginTop:2, paddingLeft:2 }}>{z.erklaerung}</div>}
                  </div>
                ))}
              </div>
            );
          });
        })()}
      </div>

      {/* Didaktik */}
      {result.erklaerung && (
        <div style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.15)", borderRadius:8, padding:12, fontSize:12, color:"rgba(251,191,36,0.75)", lineHeight:1.6 }}>
          <strong>💡 Didaktik (Lehrer):</strong> {result.erklaerung}
        </div>
      )}

      {/* Export-Leiste */}
      <div style={{ display:"flex", gap:7 }}>
        <button onClick={() => exportText(result, nr)}
          style={{ flex:1, padding:"8px 10px", background: kopiert===nr ? "rgba(74,222,128,0.1)" : "rgba(240,236,227,0.04)", border:`1.5px solid ${kopiert===nr?"rgba(74,222,128,0.4)":"rgba(240,236,227,0.1)"}`, borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700, color: kopiert===nr?"#4ade80":"rgba(240,236,227,0.6)", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          {kopiert===nr ? <><CheckSquare size={11} strokeWidth={1.5}/>Kopiert!</> : <><ClipboardList size={11} strokeWidth={1.5}/>Kopieren</>}
        </button>
        <button onClick={() => exportDruck(result)}
          style={{ flex:1, padding:"8px 10px", background:"rgba(240,236,227,0.04)", border:"1.5px solid rgba(240,236,227,0.1)", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700, color:"rgba(240,236,227,0.6)" }}>
          🖨 Drucken
        </button>
      </div>
    </div>
  );};

  const fmt_datum = iso => new Date(iso).toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px", overflowY:"auto" }}>
      <div style={{ background:"rgba(22,16,8,0.97)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:16, width:"100%", maxWidth:1100, overflow:"hidden", boxShadow:"0 24px 64px rgba(0,0,0,.5)" }}>
        {/* Header */}
        <div style={{ background:"rgba(240,236,227,0.04)", borderBottom:"1px solid rgba(240,236,227,0.08)", padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"#f0ece3", fontWeight:800, fontSize:18 }}>📂 Eigene Belege</div>
            <div style={{ color:"rgba(240,236,227,0.45)", fontSize:12, marginTop:2 }}>{belege.length} Beleg{belege.length!==1?"e":""} im Pool · erstellt im Beleg-Editor</div>
          </div>
          <button onClick={onSchliessen} style={{ background:"none", border:"1px solid rgba(240,236,227,0.15)", color:"rgba(240,236,227,0.5)", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>✕ Schließen</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", minHeight:500 }}>
          {/* Linke Liste */}
          <div style={{ borderRight:"1px solid rgba(240,236,227,0.08)", overflowY:"auto", maxHeight:"70vh" }}>
            {belege.length === 0 ? (
              <div style={{ padding:"32px 20px", textAlign:"center", color:"rgba(240,236,227,0.4)" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
                <div style={{ fontWeight:700, marginBottom:6, color:"rgba(240,236,227,0.6)" }}>Noch keine Belege</div>
                <div style={{ fontSize:12, lineHeight:1.5 }}>Erstelle im Beleg-Editor einen Beleg und klicke auf "In BuchungsWerk übernehmen".</div>
              </div>
            ) : belege.map(b => (
              <div key={b.id}
                onClick={() => { setSelected(b); setHistorie([]); setGenStatus(null); setVorschlaege(null); setVorschlaegeStatus(null); }}
                style={{ padding:"14px 16px", borderBottom:"1px solid rgba(240,236,227,0.08)", cursor:"pointer",
                  background: selected?.id===b.id ? "rgba(232,96,10,0.08)" : "transparent",
                  borderLeft: selected?.id===b.id ? "3px solid #e8600a" : "3px solid transparent" }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{b.titel}</div>
                <div style={{ fontSize:11, color:"rgba(240,236,227,0.4)" }}>{BELEGTYP_LABELS[b.typ]||b.typ} · {fmt_datum(b.erstellt)}</div>
                <button onClick={e=>{e.stopPropagation();loeschen(b.id);}}
                  style={{ marginTop:6, fontSize:10, color:"#ef4444", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:600 }}>🗑 Löschen</button>
              </div>
            ))}
          </div>
          {/* Rechte Detailansicht */}
          <div style={{ overflowY:"auto", maxHeight:"70vh", padding:20 }}>
            {!selected ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"rgba(240,236,227,0.4)", textAlign:"center" }}>
                <div><div style={{ fontSize:40, marginBottom:12 }}>👈</div><div style={{ fontWeight:700 }}>Beleg auswählen</div><div style={{ fontSize:12, marginTop:4 }}>Klicke links auf einen Beleg.</div></div>
              </div>
            ) : (
              <>
                {/* Beleg-Vorschau */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(240,236,227,0.4)", marginBottom:10 }}>Beleg-Vorschau</div>
                  {selected.typ==="eingangsrechnung" && <BeVorschauRechnung data={selected.data} typ="eingangsrechnung" />}
                  {selected.typ==="ausgangsrechnung" && <BeVorschauRechnung data={selected.data} typ="ausgangsrechnung" />}
                  {selected.typ==="kontoauszug"      && <BeVorschauKontoauszug data={selected.data} />}
                  {selected.typ==="ueberweisung"     && <BeVorschauUeberweisung data={selected.data} />}
                  {selected.typ==="email"            && <BeVorschauEmail data={selected.data} />}
                  {selected.typ==="quittung"         && <BeVorschauQuittung data={selected.data} />}
                </div>

                {/* KI-Block */}
                <div style={{ background:"rgba(240,236,227,0.04)", border:"1px solid rgba(240,236,227,0.1)", borderRadius:12, padding:16 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:"#f0ece3" }}>🤖 Aufgabe mit KI generieren</div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:"rgba(240,236,227,0.45)", flexShrink:0 }}>Klassenstufe:</label>
                    {["7","8","9","10"].map(k => (
                      <button key={k} onClick={() => setKlasse(k)}
                        style={{ padding:"5px 14px", borderRadius:20, border:"1.5px solid", borderColor:klasse===k?"#e8600a":"rgba(240,236,227,0.15)", background:klasse===k?"rgba(232,96,10,0.15)":"transparent", color:klasse===k?"#e8600a":"rgba(240,236,227,0.5)", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                        {k}
                      </button>
                    ))}
                    <button onClick={() => generieren(null, "Aufgabe")} disabled={genStatus==="loading"}
                      style={{ marginLeft:"auto", padding:"8px 20px", background:genStatus==="loading"?"#94a3b8":"#e8600a", color:"#0f172a", border:"none", borderRadius:8, fontWeight:800, fontSize:13, cursor:genStatus==="loading"?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6 }}>
                      {genStatus==="loading" ? <><Zap size={13} strokeWidth={1.5}/>Generiere…</> : historie.length===0 ? <><Star size={13} strokeWidth={1.5}/>Aufgabe generieren</> : <><Star size={13} strokeWidth={1.5}/>Weitere Aufgabe</>}
                    </button>
                  </div>

                  {genStatus?.startsWith("error") && (() => {
                    const msg = genStatus.slice(6);
                    const hint = msg.includes("503") ? "KI nicht konfiguriert (API-Key fehlt auf Server)"
                               : msg.includes("502") ? "Anthropic-API-Fehler (Key ungültig oder Rate-Limit)"
                               : msg.includes("401") || msg.includes("403") ? "Nicht autorisiert – bitte neu einloggen"
                               : msg.includes("Timeout") ? "Timeout – Server zu langsam, bitte nochmal versuchen"
                               : `Fehler: ${msg}`;
                    return <div style={{ padding:12, background:"rgba(239,68,68,0.15)", borderRadius:8, color:"#f87171", fontSize:12, fontWeight:600 }}>⚠ {hint}</div>;
                  })()}

                  {/* Alle Aufgaben in der Historie */}
                  {historie.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      {historie.map((result, idx) => (
                        <AufgabeKarte key={result._ts} result={result} nr={idx+1} isLatest={idx===historie.length-1} />
                      ))}

                      {/* Weiterführende Vorschläge unter der letzten Karte */}
                      <div style={{ borderTop:"1px solid rgba(240,236,227,0.08)", paddingTop:14 }}>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(240,236,227,0.4)", marginBottom:10 }}>💡 Weiterführende Aufgaben</div>
                        {vorschlaegeStatus==="loading" && <div style={{ fontSize:12, color:"rgba(240,236,227,0.4)" }}>⏳ Lade Vorschläge…</div>}
                        {vorschlaegeStatus==="error"   && <div style={{ fontSize:12, color:"#ef4444" }}>Vorschläge konnten nicht geladen werden.</div>}
                        {vorschlaege && (
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            {vorschlaege.map((v, i) => (
                              <button key={i} onClick={() => generieren(v.variante, v.titel)}
                                style={{ textAlign:"left", padding:"11px 14px", background:"rgba(240,236,227,0.04)", border:"1.5px solid rgba(240,236,227,0.1)", borderRadius:10, cursor:"pointer", color:"#f0ece3" }}
                                onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(232,96,10,0.5)"}
                                onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(240,236,227,0.1)"}>
                                <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{v.titel}</div>
                                <div style={{ fontSize:11, color:"rgba(240,236,227,0.45)", lineHeight:1.5 }}>{v.beschreibung}</div>
                                <div style={{ fontSize:10, color:"rgba(240,236,227,0.3)", marginTop:5, fontWeight:600 }}>→ Aufgabe generieren und unten anfügen</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}







export default EigeneBelege;
