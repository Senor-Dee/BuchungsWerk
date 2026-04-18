import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync('src/components/modals/APUebungModal.jsx', 'utf8');

const START = '// \u2500\u2500 Word-Export f\u00fcr AP-Satz';
const END   = '// \u2500\u2500 PDF-Export f\u00fcr AP-Satz';
const si = src.indexOf(START);
const ei = src.indexOf(END);
console.log(`Replacing chars ${si}..${ei}`);

const newWord = `// \u2500\u2500 Word-Export f\u00fcr AP-Satz (AP-Layout nach ISB-Vorgabe) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function exportAPWord(satz, wahlteil, gesamtP) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, BorderStyle, AlignmentType, ShadingType, VerticalAlign } = await import('docx');

  const PW = 9638;
  const nb = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' };
  const sb = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const lb = { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' };
  const bb = { style: BorderStyle.SINGLE, size: 2, color: 'AAAAAA' };

  const p = (text, opts = {}) => new Paragraph({
    children: [new TextRun({
      text: text || '', size: opts.size || 22, bold: opts.bold || false,
      italic: opts.italic || false, color: opts.color || '000000', font: 'Arial',
    })],
    spacing: { before: opts.before || 0, after: opts.after ?? 80 },
    alignment: opts.align || AlignmentType.LEFT,
    indent: opts.indent ? { left: opts.indent } : undefined,
  });
  const ep = (h = 80) => new Paragraph({ children: [], spacing: { after: h } });

  const aufgZeile = (nr, text, punkte, pageBreakBefore = false) => new Paragraph({
    spacing: { before: 120, after: 60 },
    pageBreakBefore,
    tabStops: [{ type: 'right', position: PW - 200 }],
    children: [
      new TextRun({ text: String(nr) + '  ', size: 22, bold: true,  font: 'Arial' }),
      new TextRun({ text: text,              size: 22, bold: false, font: 'Arial' }),
      new TextRun({ text: '\t[' + punkte + '\u202fP]', size: 20, color: '555555', font: 'Arial' }),
    ],
  });

  const fmt = n => typeof n === 'number'
    ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'
    : String(n ?? '');

  const unt = satz.unternehmen;
  const children = [];

  // 1. KOPFZEILE
  const noteW = 1800, pktW = 2000, titW = PW - noteW - pktW;
  children.push(new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: [titW, noteW, pktW],
    rows: [new TableRow({ height: { value: 900, rule: 'atLeast' }, children: [
      new TableCell({
        width: { size: titW, type: WidthType.DXA },
        borders: { top: sb, bottom: sb, left: sb, right: nb },
        margins: { top: 80, bottom: 80, left: 120, right: 60 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 16 }, children: [
            new TextRun({ text: 'Abschlusspr\u00fcfungs-\u00dcbung  \u00b7  BwR Klasse 10', size: 20, color: '666666', font: 'Arial' }),
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
            new TextRun({ text: unt.name, size: 28, bold: true, font: 'Arial' }),
          ]}),
        ],
      }),
      new TableCell({
        width: { size: noteW, type: WidthType.DXA },
        borders: { top: sb, bottom: sb, left: sb, right: nb },
        verticalAlign: VerticalAlign.BOTTOM,
        margins: { top: 80, bottom: 80, left: 80, right: 40 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
          new TextRun({ text: '_______', size: 22, font: 'Arial' }),
          new TextRun({ text: ' Note',  size: 18, color: '666666', font: 'Arial' }),
        ]})],
      }),
      new TableCell({
        width: { size: pktW, type: WidthType.DXA },
        borders: { top: sb, bottom: sb, left: sb, right: sb },
        verticalAlign: VerticalAlign.BOTTOM,
        margins: { top: 80, bottom: 80, left: 40, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
          new TextRun({ text: '______ / ' + String(gesamtP) + '\u202fP', size: 22, font: 'Arial' }),
        ]})],
      }),
    ]}),
  ]}));

  children.push(new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: PW, type: WidthType.DXA },
      borders: { top: nb, bottom: sb, left: sb, right: sb },
      margins: { top: 140, bottom: 140, left: 120, right: 120 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [
        new TextRun({ text: 'Name: ',   size: 22, bold: true, font: 'Arial' }),
        new TextRun({ text: '___________________________          ', size: 22, font: 'Arial' }),
        new TextRun({ text: 'Datum: ',  size: 22, bold: true, font: 'Arial' }),
        new TextRun({ text: new Date().toLocaleDateString('de-DE') + '          ', size: 22, font: 'Arial' }),
        new TextRun({ text: 'Klasse: ', size: 22, bold: true, font: 'Arial' }),
        new TextRun({ text: '_____',    size: 22, font: 'Arial' }),
      ]})],
    })]})],
  }));
  children.push(ep(220));

  // 2. UNTERNEHMENSVORSTELLUNG
  children.push(new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
    borders: {
      top: lb, bottom: lb,
      left: { style: BorderStyle.SINGLE, size: 16, color: '1E4D8C' },
      right: nb, insideH: nb, insideV: nb,
    },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: PW, type: WidthType.DXA },
      shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
      borders: { top: nb, bottom: nb, left: nb, right: nb },
      margins: { top: 100, bottom: 100, left: 180, right: 140 },
      children: [
        new Paragraph({ spacing: { after: 14 }, children: [
          new TextRun({ text: unt.name,                    size: 24, bold: true, color: '1E4D8C', font: 'Arial' }),
          new TextRun({ text: '  \u00b7  ' + unt.anschrift, size: 18, color: '555555',            font: 'Arial' }),
        ]}),
        new Paragraph({ spacing: { after: 10 }, children: [
          new TextRun({ text: 'Inhaber: ',             size: 20, bold: true,  color: '444444', font: 'Arial' }),
          new TextRun({ text: unt.inhaber,             size: 20,              color: '444444', font: 'Arial' }),
          new TextRun({ text: '  \u00b7  Branche: ',  size: 20, bold: true,  color: '444444', font: 'Arial' }),
          new TextRun({ text: unt.branche,             size: 20,              color: '444444', font: 'Arial' }),
          new TextRun({ text: '  \u00b7  GJ: ',       size: 20, bold: true,  color: '444444', font: 'Arial' }),
          new TextRun({ text: unt.gj,                  size: 20,              color: '444444', font: 'Arial' }),
        ]}),
        ...[
          unt.rohstoffe      ? 'Rohstoffe: '      + unt.rohstoffe      : null,
          unt.fremdbauteile  ? 'Fremdbauteile: '  + unt.fremdbauteile  : null,
          unt.hilfsstoffe    ? 'Hilfsstoffe: '    + unt.hilfsstoffe    : null,
          unt.betriebsstoffe ? 'Betriebsstoffe: ' + unt.betriebsstoffe : null,
        ].filter(Boolean).map((line, idx, arr) => {
          const ci = line.indexOf(': ');
          return new Paragraph({
            spacing: { after: idx === arr.length - 1 ? 0 : 8 }, indent: { left: 320 },
            children: [
              new TextRun({ text: line.slice(0, ci + 2), size: 20, bold: true, color: '333333', font: 'Arial' }),
              new TextRun({ text: line.slice(ci + 2),    size: 20,             color: '555555', font: 'Arial' }),
            ],
          });
        }),
      ],
    })]})],
  }));
  children.push(ep(160));

  // 3. SZENARIO + FORMALE VORGABEN
  children.push(new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: PW, type: WidthType.DXA },
      shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
      borders: { top: sb, bottom: sb, left: sb, right: sb },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({ spacing: { after: 80 }, children: [
          new TextRun({ text: 'Als Mitarbeiter/in im Unternehmen ' + unt.name + ' bearbeiten Sie betriebswirtschaftliche Aufgaben.', size: 20, italic: true, font: 'Arial' }),
        ]}),
        new Paragraph({ spacing: { after: 60 }, children: [
          new TextRun({ text: 'Formale Vorgaben:', size: 20, bold: true, font: 'Arial' }),
        ]}),
        ...[
          'Bei Buchungsst\u00e4zen sind stets Kontonummern, Kontennamen (abgek\u00fcrzt m\u00f6glich) und Betr\u00e4ge anzugeben.',
          'Bei Berechnungen sind jeweils alle notwendigen L\u00f6sungsschritte und Nebenrechnungen darzustellen.',
          'Alle Ergebnisse sind in der Regel auf zwei Nachkommastellen gerundet anzugeben.',
          'Soweit nicht anders vermerkt, gilt ein Umsatzsteuersatz von 19\u00a0%.',
        ].map(txt => new Paragraph({
          spacing: { after: 40 }, indent: { left: 360 },
          children: [
            new TextRun({ text: '\u2022  ', size: 20, font: 'Arial' }),
            new TextRun({ text: txt,        size: 20, font: 'Arial' }),
          ],
        })),
      ],
    })]})],
  }));
  children.push(ep(240));

  // 4. AUFGABEN
  const allAufgaben = [
    ...PFLICHT_NAV.map(nav => ({ ...nav, data: satz[nav.key] })),
    { key: wahlteil, nr: WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil)?.nr || 'W',
      titel: WAHLTEIL_OPTIONEN.find(w => w.key === wahlteil)?.label || 'Wahlteil',
      data: satz[wahlteil] },
  ];

  allAufgaben.forEach((aufgabe, ai) => {
    if (!aufgabe.data) return;

    // Aufgaben-Titel (grauer Balken + Seitenumbruch)
    children.push(new Table({
      width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
      rows: [new TableRow({ children: [new TableCell({
        width: { size: PW, type: WidthType.DXA },
        shading: { fill: 'E5E7EB', type: ShadingType.CLEAR },
        borders: { top: nb, bottom: nb, left: nb, right: nb },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          spacing: { after: 0 }, pageBreakBefore: ai > 0,
          tabStops: [{ type: 'right', position: PW - 200 }],
          children: [
            new TextRun({ text: 'Aufgabe ' + aufgabe.nr + ' \u2013 ' + aufgabe.titel, size: 26, bold: true, font: 'Arial' }),
            new TextRun({ text: '\t(' + aufgabe.data.gesamtpunkte + ' Punkte)', size: 22, bold: false, color: '555555', font: 'Arial' }),
          ],
        })],
      })]})],
    }));
    children.push(ep(100));

    // Beleg als vollstaendige Rechnung
    if (aufgabe.data.beleg) {
      const b   = aufgabe.data.beleg;
      const par = b.kunde || b.lieferant;
      const colW = [Math.floor(PW*0.40), Math.floor(PW*0.12), Math.floor(PW*0.24), PW - Math.floor(PW*0.40) - Math.floor(PW*0.12) - Math.floor(PW*0.24)];

      // Belegkopf
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
        borders: { top: sb, bottom: nb, left: sb, right: sb, insideH: nb, insideV: nb },
        rows: [new TableRow({ children: [new TableCell({
          width: { size: PW, type: WidthType.DXA },
          shading: { fill: '1E293B', type: ShadingType.CLEAR },
          borders: { top: nb, bottom: nb, left: nb, right: nb },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            spacing: { after: 0 }, tabStops: [{ type: 'right', position: PW - 200 }],
            children: [
              new TextRun({ text: b.typ.toUpperCase(), size: 24, bold: true, color: 'FFFFFF', font: 'Arial' }),
              new TextRun({ text: '\tNr. ' + b.rechnungsNr + '  \u00b7  ' + b.datum, size: 18, color: 'AAAAAA', font: 'Arial' }),
            ],
          })],
        })]})],
      }));

      // Adressblock
      const aW = Math.floor(PW / 2);
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA }, columnWidths: [aW, aW],
        borders: { top: nb, bottom: bb, left: sb, right: sb, insideH: nb, insideV: bb },
        rows: [new TableRow({ children: [
          new TableCell({
            width: { size: aW, type: WidthType.DXA }, borders: { top: nb, bottom: nb, left: nb, right: nb },
            margins: { top: 80, bottom: 80, left: 120, right: 60 },
            children: [
              new Paragraph({ spacing: { after: 16 }, children: [new TextRun({ text: 'Absender', size: 16, bold: true, color: '888888', font: 'Arial' })] }),
              new Paragraph({ spacing: { after: 8  }, children: [new TextRun({ text: unt.name,      size: 20, bold: true, font: 'Arial' })] }),
              new Paragraph({ spacing: { after: 0  }, children: [new TextRun({ text: unt.anschrift, size: 18, color: '555555', font: 'Arial' })] }),
            ],
          }),
          new TableCell({
            width: { size: aW, type: WidthType.DXA }, borders: { top: nb, bottom: nb, left: nb, right: nb },
            margins: { top: 80, bottom: 80, left: 60, right: 120 },
            children: par ? [
              new Paragraph({ spacing: { after: 16 }, children: [new TextRun({ text: b.kunde ? 'An' : 'Von', size: 16, bold: true, color: '888888', font: 'Arial' })] }),
              new Paragraph({ spacing: { after: 8  }, children: [new TextRun({ text: par.name,     size: 20, bold: true, font: 'Arial' })] }),
              new Paragraph({ spacing: { after: 0  }, children: [new TextRun({ text: par.ort || '', size: 18, color: '555555', font: 'Arial' })] }),
            ] : [ep(0)],
          }),
        ]})]
      }));

      // Positionen
      if (b.positionen?.length) {
        const mkH = (txt, w, last = false) => new TableCell({
          width: { size: w, type: WidthType.DXA }, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
          borders: { top: nb, bottom: bb, left: sb, right: last ? sb : nb },
          margins: { top: 50, bottom: 50, left: 80, right: 80 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: txt, size: 18, bold: true, color: '555555', font: 'Arial' })] })],
        });
        const mkC = (txt, w, right = false, last = false) => new TableCell({
          width: { size: w, type: WidthType.DXA },
          borders: { top: nb, bottom: nb, left: sb, right: last ? sb : nb },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT, spacing: { after: 0 }, children: [new TextRun({ text: txt, size: 20, font: 'Arial' })] })],
        });
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA }, columnWidths: colW,
          borders: { top: nb, bottom: nb, left: nb, right: nb, insideH: nb, insideV: nb },
          rows: [
            new TableRow({ children: [mkH('Artikel', colW[0]), mkH('Menge', colW[1]), mkH('Einzelpreis', colW[2]), mkH('Gesamt', colW[3], true)] }),
            ...b.positionen.map(pos => new TableRow({ children: [
              mkC(pos.artikel, colW[0]), mkC(String(pos.menge), colW[1]),
              mkC(fmt(pos.einzelpreis), colW[2], true), mkC(fmt(pos.menge * pos.einzelpreis), colW[3], true, true),
            ]})),
          ],
        }));
      }

      // Summenblock
      const spW = Math.floor(PW * 0.55), valW = PW - spW;
      const mkSum = (label, value, bold = false, topB = false) => {
        const bT = topB ? { style: BorderStyle.SINGLE, size: 4, color: '000000' } : nb;
        return new TableRow({ children: [
          new TableCell({
            width: { size: spW, type: WidthType.DXA },
            borders: { top: bT, bottom: nb, left: sb, right: nb },
            margins: { top: bold ? 60 : 30, bottom: bold ? 60 : 30, left: 120, right: 80 },
            children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: label, size: bold ? 22 : 20, bold, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: valW, type: WidthType.DXA },
            borders: { top: bT, bottom: nb, left: nb, right: sb },
            margins: { top: bold ? 60 : 30, bottom: bold ? 60 : 30, left: 80, right: 80 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: value, size: bold ? 22 : 20, bold, font: 'Arial' })] })],
          }),
        ]});
      };
      const sumRows = [];
      if (b.listenpreis != null && b.rabatt_pct) {
        sumRows.push(mkSum('Listenpreis', fmt(b.listenpreis)));
        sumRows.push(mkSum('\u2212 Rabatt (' + b.rabatt_pct + ' %)', '\u2212 ' + fmt(b.rabatt)));
      }
      if (b.leihverpackung > 0) sumRows.push(mkSum('+ Leihverpackung', '+ ' + fmt(b.leihverpackung)));
      sumRows.push(mkSum('Warenwert (netto)',                   fmt(b.warenwert)));
      sumRows.push(mkSum('+ Umsatzsteuer (' + b.ust_pct + ' %)', fmt(b.ust)));
      sumRows.push(mkSum('Rechnungsbetrag', fmt(b.rechnungsbetrag), true, true));
      children.push(new Table({
        width: { size: PW, type: WidthType.DXA }, columnWidths: [spW, valW],
        borders: { top: nb, bottom: sb, left: nb, right: nb, insideH: nb, insideV: nb },
        rows: sumRows,
      }));

      // Zahlungskonditionen
      if (b.skonto_pct || b.zahlungsziel) {
        const zInfo = [
          b.skonto_pct   ? 'Skonto: ' + b.skonto_pct + ' % bis ' + b.skonto_frist : null,
          b.zahlungsziel ? 'Zahlungsziel: ' + b.zahlungsziel : null,
        ].filter(Boolean).join('     ');
        children.push(new Table({
          width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
          borders: { top: nb, bottom: sb, left: sb, right: sb, insideH: nb, insideV: nb },
          rows: [new TableRow({ children: [new TableCell({
            width: { size: PW, type: WidthType.DXA }, borders: { top: nb, bottom: nb, left: nb, right: nb },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: zInfo, size: 18, italic: true, color: '666666', font: 'Arial' })] })],
          })]})],
        }));
      }
      children.push(ep(160));
    }

    // Teilaufgaben
    aufgabe.data.teilaufgaben?.forEach(ta => {
      children.push(aufgZeile(ta.nr, ta.text, ta.punkte));
    });
    children.push(ep(80));
  });

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top:1134, bottom:1134, left:1134, right:1134 } } }, children }],
  });
  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'AP-\u00dcbung_' + unt.kurz + '_' + new Date().toLocaleDateString('de-DE').replace(/\./g, '-') + '.docx';
  a.click();
  URL.revokeObjectURL(url);
}

`;

const result = src.slice(0, si) + newWord + src.slice(ei);
writeFileSync('src/components/modals/APUebungModal.jsx', result);
console.log('Done. File size:', result.length);
