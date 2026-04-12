// ══════════════════════════════════════════════════════════════════════════════
// ExportModal – PDF/DOCX-Export Dialog
// Extrahiert aus BuchungsWerk.jsx – Phase E5 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { FilePen, Printer, ClipboardList,
         FileText, CheckSquare, Files, Bot, Monitor } from "lucide-react";
import { anrede, berechnePunkte } from "../../utils.js";
import { S } from "../../styles.js";
import { generateExportHTML, makeBelegDocx, buildDocxBlob, firmaIconEmoji } from "../../utils/exportFunctions.js";
import KopfzeilenEditor, { DEFAULT_KOPFZEILE } from "../export/KopfzeilenEditor.jsx";
import H5PModal from "../quiz/H5PModal.jsx";

export default function ExportModal({ aufgaben, config, firma, kiHistorie, onSchliessen }) {
  const [modus, setModus] = useState("aufgaben");
  const [kopfzeile, setKopfzeile] = useState({ ...DEFAULT_KOPFZEILE, klasse: config.klasse + "", pruefungsart: config.pruefungsart || config.typ || "Schulaufgabe", datum: config.datum || new Date().toISOString().split("T")[0] });
  const [zeigeKopfEditor, setZeigeKopfEditor] = useState(false);
  const [h5pOffen, setH5pOffen] = useState(false);

  const modusOpts = [
    { key: "aufgaben",  icon: FileText,    label: "Aufgabenblatt",   desc: "Ohne Lösung (für Schüler)" },
    { key: "loesungen", icon: CheckSquare, label: "Lösungsblatt",    desc: "Mit Buchungssatz + Haken" },
    { key: "beides",    icon: Files,       label: "Aufgabe + Lösung", desc: "Lösung auf Folgeseite" },
    { key: "ki",        icon: Bot,         label: "KI-Aufgaben",      desc: "Eigene Belege / KI-Output" },
  ];

  // PDF: öffnet HTML in neuem Tab → Drucken / Als PDF speichern
  const exportPDF = () => {
    try {
      const html = generateExportHTML({ aufgaben, config, firma, modus, kiHistorie, kopfzeile, format: "pdf" });
      const w = window.open("", "_blank");
      if (!w) { alert("Bitte Popup-Blocker deaktivieren und erneut versuchen."); return; }
      w.document.write(html);
      w.document.close();
    } catch(err) {
      alert("PDF-Export Fehler: " + err.message);
    }
  };

  const exportWordGetBlob = () => exportWord("blob");
  const exportPages = () => exportWord("pages");

  // Word: echtes DOCX via docx-Library – Format nach Vorgabe Erich-Kästner-RS
  const exportWord = async (ext = "docx") => {
    try {
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
              WidthType, BorderStyle, AlignmentType, ShadingType, LevelFormat,
              VerticalAlign } = await import("docx");

      const mitAufgabe = modus !== "loesungen";
      const mitLoesung = modus !== "aufgaben";
      const isLoesung  = modus === "loesungen";
      const kl = kopfzeile || {};
      const schulName   = kl.schulName   || "";
      const pruefArt    = kl.pruefungsart || config.typ || "Übung";
      const klasseStr   = kl.klasse      || String(config.klasse);
      const datumStr    = kl.datum
        ? new Date(kl.datum + "T00:00:00").toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" })
        : "";
      const gesamtP     = aufgaben.reduce((s, a) => s + berechnePunkte(a), 0);
      const stripHtml   = t => (t || "").replace(/<[^>]*>/g, "");

      // ── A4, 2 cm Ränder ────────────────────────────────────────────────────
      // A4 = 11906 × 16838 DXA  |  2 cm = 1134 DXA  |  Textbreite = 9638 DXA
      const PW = 9638;

      // ── Border-Helfer ──────────────────────────────────────────────────────
      const nb = { style: BorderStyle.NONE,   size: 0, color: "FFFFFF" };
      const sb = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
      const lb = { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" };

      // ── Absatz-Helfer ──────────────────────────────────────────────────────
      const p = (text, opts = {}) => new Paragraph({
        children: [new TextRun({
          text: text || "",
          size:   opts.size   || 22,
          bold:   opts.bold   || false,
          italic: opts.italic || false,
          color:  opts.color  || "000000",
          font:   "Arial",
        })],
        spacing:   { before: opts.before || 0, after: opts.after || 80 },
        alignment: opts.align || AlignmentType.LEFT,
        keepNext:  opts.keepNext || false,
        shading:   opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
        indent:    opts.indent ? { left: opts.indent } : undefined,
      });
      const ep = (h = 80) => new Paragraph({ children: [], spacing: { after: h } });

      // ── Buchungssatz-Tabelle ───────────────────────────────────────────────
      const bsTable = (sollArr, habenArr) => {
        const maxR = Math.max(sollArr.length, habenArr.length);
        const cw = [900, 3000, 1200, 360, 900, 3000, 1200];
        const tw = PW - 240;
        const rows = [];
        for (let r = 0; r < maxR; r++) {
          const s = sollArr[r];
          const h = habenArr[r];
          const showAn = r === sollArr.length - 1;
          const cell = (txt, w, opts = {}) => new TableCell({
            width: { size: w, type: WidthType.DXA },
            borders: { top: nb, bottom: nb, left: nb, right: nb },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: opts.right ? AlignmentType.RIGHT : opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
              spacing: { after: 0 },
              children: [new TextRun({ text: txt || "", size: 20, bold: opts.bold || false, font: "Arial" })],
            })],
          });
          rows.push(new TableRow({ children: [
            cell(s ? s.nr   : "", cw[0], { bold: true }),
            cell(s ? s.name : "", cw[1]),
            cell(s && s.betrag != null ? s.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " \u20ac" : "", cw[2], { right: true }),
            cell(showAn ? "an" : "", cw[3], { center: true, bold: true }),
            cell(h ? h.nr   : "", cw[0], { bold: true }),
            cell(h ? h.name : "", cw[1]),
            cell(h && h.betrag != null ? h.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " \u20ac" : "", cw[2], { right: true }),
          ]}));
        }
        return new Table({
          width: { size: tw, type: WidthType.DXA },
          columnWidths: cw,
          borders: { top: lb, bottom: lb, left: nb, right: nb, insideH: nb, insideV: nb },
          rows,
          indent: { size: 240, type: WidthType.DXA },
        });
      };

      // ── Aufgabenzeile: Text links, Punkte rechtsbündig per Tab-Stop ───────
      const aufgZeile = (numText, aufgText, pkte, keepNext) => new Paragraph({
        spacing: { before: 120, after: 60 },
        keepNext: !!keepNext,
        tabStops: [{ type: "right", position: PW - 200 }],
        children: [
          new TextRun({ text: numText, size: 22, bold: true, font: "Arial" }),
          new TextRun({ text: aufgText, size: 22, font: "Arial" }),
          new TextRun({ text: "\t[" + pkte + "\u202fP]", size: 20, color: "555555", font: "Arial" }),
        ],
      });

      const belegToDocx = makeBelegDocx({ Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, AlignmentType, ShadingType, VerticalAlign });
      const children = [];

      // ══════════════════════════════════════════════════════════════════════
      // 1. KOPFZEILE
      // ══════════════════════════════════════════════════════════════════════
      // Tabelle A: Prüfungsart-Titel  |  Note + Punkte (gestapelt)
      // Kompakte Kopfzeile: Titel links, Note+Punkte einzeilig rechts
      const noteW = 1800; // Breite Note-Box
      const pktW  = 2000; // Breite Punkte-Box
      const titW  = PW - noteW - pktW;
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA },
        columnWidths: [titW, noteW, pktW],
        rows: [new TableRow({ height: { value: 900, rule: "atLeast" }, children: [
          // Titel: Schulname + Prüfungsart, zentriert
          new TableCell({
            width: { size: titW, type: WidthType.DXA },
            borders: { top: sb, bottom: sb, left: sb, right: nb },
            margins: { top: 80, bottom: 80, left: 120, right: 60 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              ...(schulName ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 16 }, children: [
                new TextRun({ text: schulName, size: 16, color: "666666", font: "Arial" }),
              ]})] : []),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
                new TextRun({ text: (isLoesung ? "Musterl\u00f6sung \u2013 " : "") + pruefArt, size: 30, bold: true, font: "Arial" }),
              ]}),
            ],
          }),
          // Note: einzeilig
          new TableCell({
            width: { size: noteW, type: WidthType.DXA },
            borders: { top: sb, bottom: sb, left: sb, right: nb },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 80, bottom: 80, left: 80, right: 40 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
              new TextRun({ text: "_______", size: 22, font: "Arial" }),
              new TextRun({ text: " Note", size: 18, color: "666666", font: "Arial" }),
            ]})],
          }),
          // Punkte: einzeilig
          new TableCell({
            width: { size: pktW, type: WidthType.DXA },
            borders: { top: sb, bottom: sb, left: sb, right: sb },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 80, bottom: 80, left: 40, right: 80 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
              new TextRun({ text: "______ / " + String(gesamtP) + "\u202fP", size: 22, font: "Arial" }),
            ]})],
          }),
        ]}),],
      }));

      // Tabelle B: Name / Datum / Klasse
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA },
        columnWidths: [PW],
        rows: [
          new TableRow({ children: [
            new TableCell({
              width: { size: PW, type: WidthType.DXA },
              borders: { top: nb, bottom: sb, left: sb, right: sb },
              margins: { top: 160, bottom: 160, left: 120, right: 120 },
              children: [new Paragraph({ spacing: { after: 0 }, children: [
                new TextRun({ text: "Name: ", size: 22, bold: true, font: "Arial" }),
                new TextRun({ text: "___________________________          ", size: 22, font: "Arial" }),
                new TextRun({ text: "Datum: ", size: 22, bold: true, font: "Arial" }),
                new TextRun({ text: (datumStr || "___________") + "          ", size: 22, font: "Arial" }),
                new TextRun({ text: "Klasse: ", size: 22, bold: true, font: "Arial" }),
                new TextRun({ text: klasseStr || "____", size: 22, bold: true, font: "Arial" }),
              ]})],
            }),
          ]}),
        ],
      }));

      // Tabelle C: Elternkenntnisnahme + Unterschrift
      if (kl.zeigeUnterschrift !== false) {
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [PW],
          rows: [
            new TableRow({ children: [
              new TableCell({
                width: { size: PW, type: WidthType.DXA },
                shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                borders: { top: nb, bottom: nb, left: sb, right: sb },
                margins: { top: 60, bottom: 20, left: 120, right: 120 },
                children: [new Paragraph({ spacing: { after: 0 }, children: [
                  new TextRun({ text: "Ich/Wir habe/n von diesem Leistungsnachweis beziehungsweise von der Note Kenntnis genommen.", size: 18, bold: true, font: "Arial" }),
                ]})],
              }),
            ]}),
            new TableRow({ children: [
              new TableCell({
                width: { size: PW, type: WidthType.DXA },
                borders: { top: nb, bottom: sb, left: sb, right: sb },
                margins: { top: 360, bottom: 120, left: 120, right: 120 },
                children: [new Paragraph({ spacing: { after: 0 }, children: [
                  new TextRun({ text: "Datum  __________________               Unterschrift  _______________________________", size: 20, font: "Arial" }),
                ]})],
              }),
            ]}),
          ],
        }));
      }

      children.push(ep(200));

      // ══════════════════════════════════════════════════════════════════════
      // 2. SZENARIO-BOX
      // ══════════════════════════════════════════════════════════════════════
      if (firma?.name) {
        const szenarioRaw = `Als Mitarbeiter/in im Unternehmen ${firma.name}${firma.ort ? ", " + firma.ort : ""}, bearbeiten Sie verschiedene betriebswirtschaftliche Aufgaben.`;
        const szenario = anrede(config.klasse, szenarioRaw);

        // ── Unternehmensvorstellung ──────────────────────────────────────────
        const wt = [
          firma.rohstoffe?.length     ? `Rohstoffe: ${firma.rohstoffe.join(", ")}`         : null,
          firma.hilfsstoffe?.length   ? `Hilfsstoffe: ${firma.hilfsstoffe.join(", ")}`     : null,
          firma.fremdbauteile?.length ? `Fremdbauteile: ${firma.fremdbauteile.join(", ")}` : null,
          firma.betriebsstoffe?.length? `Betriebsstoffe: ${firma.betriebsstoffe.join(", ")}`:null,
          firma.fertigerzeugnisse?.length ? `Fertigerzeugnisse: ${firma.fertigerzeugnisse.join(", ")}` : null,
        ].filter(Boolean);
        const firmaFarbe = (firma.farbe||"#1e293b").replace("#","").toUpperCase();
        const firmaAkz = { style: BorderStyle.SINGLE, size: 16, color: firmaFarbe };
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [PW],
          borders: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" }, left: { style: BorderStyle.SINGLE, size: 16, color: firmaFarbe }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideH: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideV: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
          rows: [new TableRow({ children: [new TableCell({
            width: { size: PW, type: WidthType.DXA },
            shading: { fill: "F8F9FA", type: ShadingType.CLEAR },
            borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
            margins: { top: 100, bottom: 100, left: 180, right: 140 },
            children: [
              new Paragraph({ spacing: { after: 16 }, children: [
                new TextRun({ text: firmaIconEmoji(firma.icon) + "  " + firma.name, size: 24, bold: true, color: firmaFarbe, font: "Arial" }),
                // rechtsform nicht separat – bereits im Firmennamen enthalten
                ...(firma.ort ? [new TextRun({ text: "  ·  " + firma.plz + " " + firma.ort, size: 18, color: "555555", font: "Arial" })] : []),
                ...(firma.slogan ? [new TextRun({ text: "  |  ", size: 18, color: "BBBBBB", font: "Arial" }), new TextRun({ text: firma.slogan, size: 20, italic: true, bold: false, color: "555555", font: "Georgia" })] : []),
              ]}),
              ...(firma.inhaber ? [new Paragraph({ spacing: { after: wt.length ? 16 : 0 }, children: [
                new TextRun({ text: (() => {
                  // Geschlecht aus Vornamen ableiten (typisch deutsche Vornamen)
                  const fn = (firma.inhaber || "").replace(/^Dr\.\s+|^Prof\.\s+/i, "").split(" ")[0];
                  const femaleEndings = ["a", "e", "ine", "tte", "lie", "ia", "ra", "ika", "ita"];
                  const isFemale = femaleEndings.some(end => fn.toLowerCase().endsWith(end));
                  return isFemale ? "Inhaberin: " : "Inhaber: ";
                })(), size: 20, bold: true, color: "444444", font: "Arial" }),
                new TextRun({ text: firma.inhaber, size: 20, color: "444444", font: "Arial" }),
              ]})] : []),
              ...wt.map((line, idx) => {
                const colonIdx = line.indexOf(":");
                const label = colonIdx >= 0 ? line.slice(0, colonIdx + 1) : line;
                const rest  = colonIdx >= 0 ? line.slice(colonIdx + 1) : "";
                return new Paragraph({
                  spacing: { after: idx === wt.length - 1 ? 0 : 8 },
                  indent: { left: 320 },
                  children: [
                    new TextRun({ text: label, size: 20, bold: true, color: "333333", font: "Arial" }),
                    ...(rest ? [new TextRun({ text: rest, size: 20, bold: false, color: "555555", font: "Arial" })] : []),
                  ],
                });
              }),
            ],
          })]})]
        }));
        children.push(ep(160));

        // ── Szenario + Formale Vorgaben ──────────────────────────────────────
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [PW],
          rows: [new TableRow({ children: [
            new TableCell({
              width: { size: PW, type: WidthType.DXA },
              shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
              borders: { top: sb, bottom: sb, left: sb, right: sb },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [
                new Paragraph({ spacing: { after: 80 }, children: [
                  new TextRun({ text: szenario, size: 20, italic: true, font: "Arial" }),
                ]}),
                new Paragraph({ spacing: { after: 60 }, children: [
                  new TextRun({ text: "Formale Vorgaben:", size: 20, bold: true, font: "Arial" }),
                ]}),
                ...[
                  "Bei Buchungss\u00e4tzen sind stets Kontonummern, Kontennamen (abgek\u00fcrzt m\u00f6glich) und Betr\u00e4ge anzugeben.",
                  "Bei Berechnungen sind jeweils alle notwendigen L\u00f6sungsschritte und Nebenrechnungen darzustellen.",
                  "Alle Ergebnisse sind in der Regel auf zwei Nachkommastellen gerundet anzugeben.",
                  "Soweit nicht anders vermerkt, gilt ein Umsatzsteuersatz von 19\u00a0%.",
                ].map(txt => new Paragraph({
                  spacing: { after: 40 },
                  numbering: { reference: "bw-bullets", level: 0 },
                  children: [new TextRun({ text: txt, size: 20, font: "Arial" })],
                })),
              ],
            }),
          ]})],
        }));
        children.push(ep(240));
      }

      aufgaben.forEach((a, i) => {
        const punkte  = berechnePunkte(a);
        const aufgTxt = stripHtml(anrede(config.klasse, (a._aufgabeEdit ?? a.aufgabe) || ""));

        // ── Aufgaben-Titel (grauer Balken, Seitenumbruch wenn nötig) ──
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA },
          columnWidths: [PW],
          rows: [new TableRow({ children: [
            new TableCell({
              width: { size: PW, type: WidthType.DXA },
              shading: { fill: "E5E7EB", type: ShadingType.CLEAR },
              borders: { top: nb, bottom: nb, left: nb, right: nb },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({
                spacing: { after: 0, before: i > 0 ? 0 : 0 },
                pageBreakBefore: i > 0,
                children: [
                  new TextRun({ text: `Aufgabe ${i + 1} (${punkte} Punkte)`, size: 26, bold: true, font: "Arial" }),
                ],
              })],
            }),
          ]})],
        }));
        children.push(ep(80));

        // ── Komplex-Aufgabe (Kettenbuchung) ──────────────────────────────
        if (a.taskTyp === "komplex" && a.schritte?.length) {
          // kontext wird im Export bewusst weggelassen – die Teilaufgaben
          // entwickeln das Szenario selbst aus den Aufgabenstellungen
          a.schritte.forEach((s, si) => {
            children.push(si === 0 ? ep(120) : ep(80));
            const hasBeleg = mitAufgabe && !!s.beleg;
            if (hasBeleg) {
              // Aufgabenzeile + Freizeile + Beleg in einem Container → kein Seitenumbruch
              const aufgPara = aufgZeile(`${i + 1}.${si + 1}  `, stripHtml(anrede(config.klasse, (s._aufgabeEdit ?? s.aufgabe) || "")), s.punkte, false);
              const belegElems = belegToDocx(s.beleg, firma);
              const containerRows = [
                new TableRow({ cantSplit: true, children: [new TableCell({
                  width: { size: PW, type: WidthType.DXA },
                  borders: { top: nb, bottom: nb, left: nb, right: nb },
                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                  children: [aufgPara, ep(60)],
                })] }),
                new TableRow({ cantSplit: true, children: [new TableCell({
                  width: { size: PW, type: WidthType.DXA },
                  borders: { top: nb, bottom: nb, left: nb, right: nb },
                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                  children: belegElems,
                })] }),
              ];
              children.push(new Table({
                width: { size: PW, type: WidthType.DXA },
                columnWidths: [PW],
                borders: { top: nb, bottom: nb, left: nb, right: nb, insideH: nb, insideV: nb },
                rows: containerRows,
              }));
              children.push(ep(80));
            } else {
              children.push(aufgZeile(`${i + 1}.${si + 1}  `, stripHtml(anrede(config.klasse, (s._aufgabeEdit ?? s.aufgabe) || "")), s.punkte, false));
            }
            if (mitLoesung && s.soll?.length) {
              children.push(bsTable(s.soll, s.haben || []));
              children.push(ep(60));
              if (s.erklaerung) children.push(p(s.erklaerung, { size: 18, italic: true, color: "374151", after: 40 }));
            } else if (mitAufgabe && !mitLoesung) {
            }
          });

        // ── Einfache Aufgabe ─────────────────────────────────────────────
        } else {
          if (mitAufgabe && a.beleg) { children.push(ep(80)); children.push(...belegToDocx(a.beleg, firma)); children.push(ep(80)); }
          if (mitAufgabe && aufgTxt) {
            children.push(p(aufgTxt, { size: 22, after: 80, align: AlignmentType.JUSTIFIED, keepNext: !!(mitAufgabe && a.beleg) }));
          }
          // Nebenrechnungen
          if (mitAufgabe && a.nebenrechnungen?.length) {
            a.nebenrechnungen.forEach(nr => {
              children.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: [
                new TextRun({ text: nr.label + ": ", size: 20, bold: true, font: "Arial" }),
                new TextRun({ text: nr.formel + " = " + nr.ergebnis, size: 20, font: "Arial" }),
              ]}));
            });
            children.push(ep(60));
          }
          if (mitLoesung && a.soll?.length) {
            children.push(bsTable(a.soll, a.haben || []));
            children.push(ep(80));
            if (a.erklaerung) children.push(p(a.erklaerung, { size: 18, italic: true, color: "374151", after: 60 }));
          } else if (mitAufgabe && !mitLoesung) {
          }
        }

        // ── Theorie-Aufgabe ──────────────────────────────────────────────
        if (a.taskTyp === "theorie") {
          if (mitAufgabe && (a._aufgabeEdit ?? a.aufgabe)) {
            children.push(p(stripHtml(anrede(config.klasse, (a._aufgabeEdit ?? a.aufgabe))), { size: 22, after: 80, align: AlignmentType.JUSTIFIED }));
          }
          if (mitLoesung && a.loesung) {
            children.push(p(stripHtml(a.loesung), { size: 20, italic: true, color: "166534", after: 80 }));
          } else if (mitAufgabe && !mitLoesung) {
          }
        }
      });

      // ══════════════════════════════════════════════════════════════════════
      // 4. DOKUMENT BAUEN
      // ══════════════════════════════════════════════════════════════════════
      const doc = new Document({
        numbering: {
          config: [{
            reference: "bw-bullets",
            levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 480, hanging: 240 } } } }],
          }],
        },
        styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
        sections: [{
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
            },
          },
          children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      if (ext === "blob") return blob; // interner Aufruf → Blob zurückgeben
      const url  = URL.createObjectURL(blob);
      const el   = document.createElement("a");
      el.href    = url;
      el.download = `${pruefArt.replace(/[^a-zA-Z0-9äöüÄÖÜß_\- ]/g, "")}_Kl${klasseStr}_${kl.datum || config.datum || "2026"}.${ext}`;
      document.body.appendChild(el); el.click(); document.body.removeChild(el);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err) {
      alert("Word-Export Fehler: " + err.message);
    }
  };

  return (
    <>
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"rgba(22,16,8,0.97)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(240,236,227,0.12)", borderRadius:"16px", width:"100%", maxWidth:"520px", overflow:"hidden", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid rgba(240,236,227,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(240,236,227,0.4)", marginBottom:"4px" }}>Export</div>
            <div style={{ fontSize:"20px", fontWeight:900, color:"#f0ece3" }}>📄 Buchungs<span style={{color:"#e8600a"}}>Werk</span></div>
          </div>
          <button onClick={onSchliessen} style={{ background:"transparent", border:"1px solid rgba(240,236,227,0.15)", borderRadius:"8px", color:"rgba(240,236,227,0.5)", width:"36px", height:"36px", cursor:"pointer", fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Modus-Auswahl */}
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"10px" }}>Inhalt</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"20px" }}>
            {modusOpts.map(opt => {
              const isActive = modus === opt.key;
              const disabled = opt.key === "ki" && !kiHistorie?.length;
              return (
                <button key={opt.key} onClick={() => !disabled && setModus(opt.key)}
                  style={{ padding:"12px 14px", borderRadius:"10px", border:`2px solid ${isActive ? "#e8600a" : "#1e293b"}`,
                    background: isActive ? "#1e3a5f" : "#1e293b",
                    cursor: disabled ? "not-allowed" : "pointer",
                    textAlign:"left", opacity: disabled ? 0.4 : 1, transition:"all 0.15s" }}>
                  <div style={{ marginBottom:"6px", color: isActive ? "#e8600a" : "#64748b" }}>{React.createElement(opt.icon, { size: 20, strokeWidth: 1.5 })}</div>
                  <div style={{ fontSize:"13px", fontWeight:700, color: isActive ? "#e8600a" : "#e2e8f0" }}>{opt.label}</div>
                  <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Kopfzeile */}
          <div style={{ marginBottom:"14px" }}>
            <button onClick={() => setZeigeKopfEditor(p => !p)}
              style={{ width:"100%", padding:"9px 14px", borderRadius:"8px", border:"1px solid #334155",
                background: zeigeKopfEditor ? "#1e3a5f" : "#1e293b", color: zeigeKopfEditor ? "#e8600a" : "#94a3b8",
                fontWeight:700, fontSize:12, cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between" }}>
              <span style={{display:"flex",alignItems:"center",gap:5}}><ClipboardList size={12} strokeWidth={1.5}/>Kopfzeile bearbeiten</span>
              <span>{zeigeKopfEditor ? "▲" : "▼"}</span>
            </button>
            {zeigeKopfEditor && (
              <div style={{ background:"#fff", borderRadius:"0 0 8px 8px", padding:"14px", border:"1px solid #334155", borderTop:"none" }}>
                <KopfzeilenEditor config={config} firma={firma} kopfzeile={kopfzeile} setKopfzeile={setKopfzeile} />
              </div>
            )}
          </div>

          {/* Export-Buttons */}
          <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"10px" }}>Format</div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <button onClick={() => exportWord("docx")}
              style={{ flex:1, minWidth:"120px", padding:"12px 14px", borderRadius:"10px",
                background:"linear-gradient(180deg,rgba(37,99,235,0.22) 0%,rgba(37,99,235,0.10) 100%)",
                border:"1.5px solid rgba(37,99,235,0.55)", color:"#93c5fd", fontWeight:800, fontSize:"13px", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                boxShadow:"0 3px 0 rgba(0,0,0,0.5), 0 0 18px rgba(37,99,235,0.25), inset 0 1px 0 rgba(147,197,253,0.15)" }}>
              <FilePen size={18} strokeWidth={1.5}/>
              Word / Pages
            </button>
            <button onClick={() => exportPDF()}
              style={{ flex:1, minWidth:"120px", padding:"12px 14px", borderRadius:"10px",
                background:"linear-gradient(180deg,rgba(220,38,38,0.22) 0%,rgba(220,38,38,0.10) 100%)",
                border:"1.5px solid rgba(220,38,38,0.55)", color:"#fca5a5", fontWeight:800, fontSize:"13px", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                boxShadow:"0 3px 0 rgba(0,0,0,0.5), 0 0 18px rgba(220,38,38,0.25), inset 0 1px 0 rgba(252,165,165,0.15)" }}>
              <Printer size={18} strokeWidth={1.5}/>
              PDF
            </button>
          </div>
          <div style={{ marginTop:"10px", fontSize:"10px", color:"#64748b", textAlign:"center" }}>
            Word/Pages: .docx herunterladen, dann "Öffnen mit Pages" · PDF: neuer Tab öffnet → Drucken / Als PDF speichern
          </div>

          {/* H5P-Export */}
          <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid rgba(240,236,227,0.07)" }}>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:"8px" }}>Interaktiv</div>
            <button onClick={() => setH5pOffen(true)}
              style={{ width:"100%", padding:"12px 14px", borderRadius:"10px",
                background:"linear-gradient(180deg,rgba(16,185,129,0.18) 0%,rgba(16,185,129,0.07) 100%)",
                border:"1.5px solid rgba(16,185,129,0.4)", color:"#6ee7b7", fontWeight:800, fontSize:"13px", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                boxShadow:"0 3px 0 rgba(0,0,0,0.5), 0 0 16px rgba(16,185,129,0.18), inset 0 1px 0 rgba(110,231,183,0.10)" }}>
              <Monitor size={18} strokeWidth={1.5}/>
              H5P-Paket erstellen
            </button>
            <div style={{ marginTop:"8px", fontSize:"10px", color:"#64748b", textAlign:"center" }}>
              Interaktive Buchungsaufgaben für Moodle · LernSax · H5P.org
            </div>
          </div>
        </div>
      </div>
    </div>
    {h5pOffen && <H5PModal aufgaben={aufgaben} config={config} firma={firma} onSchliessen={() => setH5pOffen(false)} />}
    </>
  );
}
