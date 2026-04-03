/**
 * TEIL C – Sprachqualitäts-Scanner
 * C-1: Strukturelle Regex-Checks (doppelte Wörter, Leerzeichen, Euro-Format)
 * C-2: BwR Fachbegriff-Konsistenz (Whitelist gegen Falschschreibungen)
 * C-3: nspell Deutsches Wörterbuch (optional, CJS via createRequire)
 * C-4: Aufgabenpool-Texte (dynamisch generierte Task-Texte)
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname }              from 'path';
import { fileURLToPath }                       from 'url';
import { createRequire }                       from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..', '..');
const SRC_DIR   = join(ROOT, 'src');

const require   = createRequire(import.meta.url);

// ── Helpers ────────────────────────────────────────────────────────────────────

function collectFiles(dir, exts = ['.jsx', '.js']) {
  const out = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        out.push(...collectFiles(full, exts));
      } else if (exts.includes(extname(entry))) {
        out.push(full);
      }
    }
  } catch { /* ignore unreadable dirs */ }
  return out;
}

function shortPath(full) {
  return full.replace(ROOT + '\\', '').replace(ROOT + '/', '');
}

function hasGermanChars(s) {
  return /[äöüÄÖÜß]/.test(s) || /\b(der|die|das|und|ist|für|mit|von|auf|zu|ein|eine|werden|wird|haben|hat)\b/i.test(s);
}

// Extract template literals that look like user-visible German text
function extractGermanTemplates(content) {
  const results = [];
  const lines   = content.split('\n');
  lines.forEach((line, idx) => {
    // Skip imports, comments, pure-code lines
    if (/^\s*(import|export\s+\{|\/\/|const\s+\w+\s*=\s*\{)/.test(line)) return;
    const matches = [...line.matchAll(/`([^`]{15,})`/g)];
    for (const m of matches) {
      // Replace ${...} with · (non-word char) to avoid false positives in regex checks
      const text = m[1].replace(/\$\{[^}]+\}/g, '·');
      if (hasGermanChars(text) && text.split(/\s+/).length >= 4) {
        results.push({ text, line: idx + 1 });
      }
    }
  });
  return results;
}

// ── C-1: Strukturelle Regex-Checks ───────────────────────────────────────────

const STRUKTURELL = [
  {
    label:    'doppelte-woerter',
    regex:    /\b(\w{3,})\s+\1\b/g,   // case-sensitive to avoid "haben Haben" false positives
    severity: 'HIGH',
    fix:      'Doppeltes Wort entfernen',
  },
  {
    label:    'euro-punkt-format',
    regex:    /\b\d+\.\d{1,2}\s*€/g,
    severity: 'HIGH',
    fix:      'Dezimaltrennzeichen muss Komma sein: "100,00 €" nicht "100.00 €"',
  },
  {
    label:    'doppelte-leerzeichen',
    regex:    /\S {2,}\S/g,
    severity: 'MEDIUM',
    fix:      'Doppeltes Leerzeichen entfernen',
  },
  {
    label:    'leerzeichen-vor-satzzeichen',
    regex:    /\w ([\.,;:!?])(?!\s*\d)/g,
    severity: 'MEDIUM',
    fix:      'Leerzeichen vor Satzzeichen entfernen',
  },
];

function runC1Structural(files) {
  const results  = [];
  let   findings = 0;

  for (const file of files) {
    const content  = readFileSync(file, 'utf8');
    const snippets = extractGermanTemplates(content);
    for (const { text, line } of snippets) {
      for (const check of STRUKTURELL) {
        check.regex.lastIndex = 0;
        const match = check.regex.exec(text);
        if (match) {
          findings++;
          results.push({
            label:    `c1-${check.label}`,
            status:   check.severity === 'HIGH' ? 'FAIL' : 'WARN',
            detail:   `${shortPath(file)}:${line} – "${match[0].slice(0, 50)}"`,
            fix:      check.fix,
            severity: check.severity,
          });
        }
      }
    }
  }

  if (findings === 0) {
    results.push({ label: 'c1-strukturell', status: 'PASS', detail: `Keine strukturellen Fehler in ${files.length} Dateien` });
  }
  return results;
}

// ── C-2: BwR Fachbegriff-Konsistenz ──────────────────────────────────────────

// Only genuine misspellings and hyphenated errors – NOT abbreviations
const FACHBEGRIFF_FALSCH = [
  // Bindestriche (ISB schreibt zusammen)
  { falsch: /Buchungs-Satz\b/g,          korrekt: 'Buchungssatz'       },
  { falsch: /Bilanz-Konto\b/g,           korrekt: 'Bilanzkonto'        },
  { falsch: /Erfolgs-Konto\b/g,          korrekt: 'Erfolgskonto'       },
  { falsch: /Vor-Steuer\b/g,             korrekt: 'Vorsteuer'          },
  { falsch: /Umsatz-Steuer\b/g,          korrekt: 'Umsatzsteuer'       },
  { falsch: /Eigen-Kapital\b/g,          korrekt: 'Eigenkapital'       },
  { falsch: /Fremd-Kapital\b/g,          korrekt: 'Fremdkapital'       },
  { falsch: /Waren-Einkauf\b/g,          korrekt: 'Wareneinkauf'       },
  { falsch: /Waren-Verkauf\b/g,          korrekt: 'Warenverkauf'       },
  { falsch: /Schlussbilanz-Konto\b/g,    korrekt: 'Schlussbilanzkonto' },
  // Tippfehler
  { falsch: /\bBuchungssaz\b/g,          korrekt: 'Buchungssatz'       },
  { falsch: /\bBuchungssatzt\b/g,        korrekt: 'Buchungssatz'       },
  { falsch: /\bUmsazsteuer\b/g,          korrekt: 'Umsatzsteuer'       },
  { falsch: /\bVohrsteuer\b/g,           korrekt: 'Vorsteuer'          },
  { falsch: /\bWahreneinkauf\b/g,        korrekt: 'Wareneinkauf'       },
  { falsch: /\bWahrenverkauf\b/g,        korrekt: 'Warenverkauf'       },
];

function runC2Fachbegriffe(files) {
  const results  = [];
  let   findings = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines   = content.split('\n');
    for (const { falsch, korrekt } of FACHBEGRIFF_FALSCH) {
      lines.forEach((line, idx) => {
        falsch.lastIndex = 0;
        const m = falsch.exec(line);
        if (m) {
          findings++;
          results.push({
            label:    `c2-fachbegriff`,
            status:   'FAIL',
            detail:   `${shortPath(file)}:${idx + 1} – "${m[0]}" → korrekt: "${korrekt}"`,
            fix:      `"${m[0]}" ersetzen durch "${korrekt}"`,
            severity: 'MEDIUM',
          });
        }
      });
    }
  }

  if (findings === 0) {
    results.push({ label: 'c2-fachbegriffe', status: 'PASS', detail: `Alle BwR-Fachbegriffe korrekt in ${files.length} Dateien` });
  }
  return results;
}

// ── C-3: nspell Wörterbuch (optional) ────────────────────────────────────────

const BWR_WHITELIST = new Set([
  // Buchführungs-Fachbegriffe
  'Buchungssatz','Buchungssätze','Kontenplan','Kontenrahmen','Bilanzkonto','Bilanzkonten',
  'Erfolgskonto','Erfolgskonten','Bestandskonto','Bestandskonten','Schlussbilanzkonto',
  'Eröffnungsbilanzkonto','Habenseite','Sollseite','Wareneinkauf','Warenverkauf',
  'Warenbestand','Eigenkapital','Fremdkapital','Umlaufvermögen','Anlagevermögen',
  'Vorsteuer','Umsatzsteuer','Vorsteuerabzug','Skonto','Preisnachlass','Debitor',
  'Kreditorkonto','Debitorenkonto','Kontokorrent','Hauptbuch','Nebenbuch',
  'Lernbereich','Jahrgangsstufe','Schulklasse','Buchungssatzt',
  // App-Begriffe
  'BuchungsWerk','LumiTec','AlpenTextil','VitaSport','Waldform','GmbH','KG','OHG',
  // ISB-Abkürzungen (immer korrekt im Kontext)
  'USt','VORST','BK','KA','FO','VE','AWR','KGV','SBK','EBK','GWG','AfA',
  'BMK','AFR','WER','VBEI','UEFE','EBFE','BZKR','NR','FRI','ABSA','ABGWG',
  'AGASV','GWST','GRST','KFZST','ZAW','ZE','RST','ARA','PRA','EWB','PWB',
  'GUV','IKR','ISB','LB','Nr','Kl','Std','pct',
  // BwR Komposita
  'Einkaufskalkulation','Verkaufskalkulation','Vorwärtskalkulation','Rückwärtskalkulation',
  'Nettoverkaufspreis','Listenverkaufspreis','Listenpreis','Einstandspreis',
  'Bezugskosten','Bezugspreis','Angebotspreis','Kalkulationszuschlag',
  'Gewinnzuschlag','Selbstkostenpreis','Bareinkaufspreis','Barverkaufspreis',
  'Kundenskonto','Lieferantenskonto','Kundenrabatt','Lieferantenrabatt',
  'Eingangsrechnung','Ausgangsrechnung','Lieferschein','Rechnungsbetrag',
  'Bruttobetrag','Nettobetrag','Bruttopreis','Nettopreis',
  'Umsatzsteuerpflicht','Vorsteuerabzug','Zahllast','Vorsteuerüberhang',
  'Anschaffungskosten','Anschaffungspreis','Abschreibung','Restbuchwert',
  'Gewerbesteuer','Einkommensteuer','Körperschaftsteuer',
  'Rohstoffe','Hilfsstoffe','Betriebsstoffe','Fertigerzeugnisse','Fertigteile',
  'Fremdbauteile','Handelswaren','Maschinen','Geschäftsausstattung',
  'Geringwertige','Wirtschaftsgüter','Grundstücke','Forderungen','Verbindlichkeiten',
  // Lehrplan-Begriffe
  'Praxismaßnahme','Kompetenzen','Lernbereich','Lernbereiche',
  'Realschule','Bayern','Jahrgangsstufen',
]);

async function loadSpellChecker() {
  try {
    const nspell = require('nspell');
    const deDic  = require('dictionary-de');
    return await new Promise((resolve) => {
      if (typeof deDic === 'function') {
        deDic((err, dict) => {
          if (err) resolve(null);
          else resolve(nspell(dict));
        });
      } else if (deDic && deDic.aff && deDic.dic) {
        resolve(nspell(deDic));
      } else {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

async function runC3Spellcheck(files) {
  const spell = await loadSpellChecker();
  if (!spell) {
    return [{ label: 'c3-spellcheck', status: 'WARN', detail: 'nspell nicht geladen – Rechtschreibprüfung übersprungen' }];
  }

  const wordCounts = {};  // word → count (for WARN vs FAIL threshold)
  const wordFiles  = {};  // word → first file:line

  for (const file of files) {
    const content  = readFileSync(file, 'utf8');
    const snippets = extractGermanTemplates(content);
    for (const { text, line } of snippets) {
      // Extract individual German words (5+ chars, contains German chars or lowercase)
      const words = text
        .replace(/\$\{[^}]+\}/g, ' ')
        .match(/\b[A-ZÄÖÜa-zäöüß]{5,}\b/g) || [];
      for (const word of words) {
        // Skip whitelisted, uppercase acronyms, numbers-mixed, camelCase internals
        if (BWR_WHITELIST.has(word) || /^[A-Z]{2,}$/.test(word)) continue;
        if (!spell.correct(word) && !spell.correct(word.toLowerCase())) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
          if (!wordFiles[word]) wordFiles[word] = `${shortPath(file)}:${line}`;
        }
      }
    }
  }

  const results = [];
  for (const [word, count] of Object.entries(wordCounts)) {
    const suggestions = spell.suggest(word).slice(0, 3).join(', ');
    results.push({
      label:    'c3-spelling',
      status:   count >= 3 ? 'FAIL' : 'WARN',
      detail:   `"${word}" (${count}×) – zuerst: ${wordFiles[word]}`,
      fix:      suggestions ? `Vorschläge: ${suggestions}` : 'Manuell prüfen oder Whitelist ergänzen',
      severity: count >= 3 ? 'HIGH' : 'LOW',
    });
  }

  if (results.length === 0) {
    results.push({ label: 'c3-spellcheck', status: 'PASS', detail: `nspell: Keine unbekannten Wörter in ${files.length} Dateien` });
  }
  return results;
}

// ── C-4: Aufgabenpool-Texte ───────────────────────────────────────────────────

async function runC4PoolTexts() {
  const results = [];

  // Try dynamic import
  let AUFGABEN_POOL = null;
  let UNTERNEHMEN   = null;
  try {
    const poolMod = await import('../../src/data/aufgabenPool.js');
    AUFGABEN_POOL  = poolMod.AUFGABEN_POOL || poolMod.default;
    const stdMod   = await import('../../src/data/stammdaten.js');
    UNTERNEHMEN    = stdMod.UNTERNEHMEN || stdMod.default;
  } catch (e) {
    results.push({
      label: 'c4-pool-import',
      status: 'WARN',
      detail: `AUFGABEN_POOL konnte nicht importiert werden: ${e.message?.slice(0, 80)}`,
    });
    return results;
  }

  if (!AUFGABEN_POOL || !UNTERNEHMEN) {
    results.push({ label: 'c4-pool-import', status: 'WARN', detail: 'AUFGABEN_POOL oder UNTERNEHMEN fehlt' });
    return results;
  }

  const firma = UNTERNEHMEN[0];
  const opts  = { werkstoffId: 'rohstoffe', schwierigkeit: 'einfach' };
  const allTexts = [];
  let   taskCount = 0;

  for (const [, lernbereiche] of Object.entries(AUFGABEN_POOL)) {
    for (const [, tasks] of Object.entries(lernbereiche)) {
      for (const task of tasks) {
        if (!task.generate) continue;
        taskCount++;
        try {
          const gen = task.taskTyp === 'theorie'
            ? task.generate()
            : task.generate(firma, opts);

          // Collect text fields
          for (const field of ['aufgabe', 'titel', 'erklaerung', 'hinweis']) {
            if (gen[field] && typeof gen[field] === 'string') {
              allTexts.push({ text: gen[field], source: `task:${task.id}/${field}` });
            }
          }
          // Schritte
          if (gen.schritte) {
            gen.schritte.forEach((s, si) => {
              for (const field of ['aufgabe', 'erklaerung']) {
                if (s[field]) allTexts.push({ text: s[field], source: `task:${task.id}/schritt${si}/${field}` });
              }
            });
          }
        } catch { /* einzelner Task-Fehler überspringen */ }
      }
    }
  }

  // Apply structural checks to collected texts
  let c4Findings = 0;
  for (const { text, source } of allTexts) {
    for (const check of STRUKTURELL) {
      check.regex.lastIndex = 0;
      const match = check.regex.exec(text);
      if (match) {
        c4Findings++;
        results.push({
          label:    `c4-${check.label}`,
          status:   check.severity === 'HIGH' ? 'FAIL' : 'WARN',
          detail:   `${source}: "${match[0].slice(0, 50)}" (${check.label})`,
          fix:      check.fix,
          severity: check.severity,
        });
      }
    }
    // BwR term check
    for (const { falsch, korrekt } of FACHBEGRIFF_FALSCH) {
      falsch.lastIndex = 0;
      const m = falsch.exec(text);
      if (m) {
        c4Findings++;
        results.push({
          label:    'c4-fachbegriff',
          status:   'FAIL',
          detail:   `${source}: "${m[0]}" → korrekt: "${korrekt}"`,
          fix:      `"${m[0]}" ersetzen durch "${korrekt}"`,
          severity: 'MEDIUM',
        });
      }
    }
    // Du/Sie-Mixing check per text
    const hasDu  = /\b(du|dein|deine|deinen|deiner|dir)\b/i.test(text);
    const hasSie = /\b(Sie\s|Ihnen|Ihrer|Ihre[^r])/i.test(text) &&
                   !/\bSie\s+(mehr|auch|noch|aber|sich)\b/i.test(text);
    if (hasDu && hasSie) {
      c4Findings++;
      results.push({
        label:    'c4-anrede-mixing',
        status:   'FAIL',
        detail:   `${source}: Mischung von "du" und "Sie" in einem Text`,
        fix:      'Anrede vereinheitlichen (du für Kl ≤9, Sie für Kl 10)',
        severity: 'HIGH',
      });
    }
  }

  if (c4Findings === 0) {
    results.push({ label: 'c4-pool-texte', status: 'PASS', detail: `${taskCount} Tasks generiert, ${allTexts.length} Texte geprüft – keine Fehler` });
  }
  return results;
}

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export async function runLanguageScan({ quiet = false } = {}) {
  const srcFiles = collectFiles(SRC_DIR);

  const c1Results = runC1Structural(srcFiles);
  const c2Results = runC2Fachbegriffe(srcFiles);
  const c3Results = await runC3Spellcheck(srcFiles);
  const c4Results = await runC4PoolTexts();

  const all = [...c1Results, ...c2Results, ...c3Results, ...c4Results];

  const summary = {
    totalTests:    all.length,
    totalPass:     all.filter(r => r.status === 'PASS').length,
    totalWarn:     all.filter(r => r.status === 'WARN').length,
    totalFail:     all.filter(r => r.status === 'FAIL').length,
    totalCritical: all.filter(r => r.status === 'CRITICAL').length,
    results: all,
    sections: { c1: c1Results, c2: c2Results, c3: c3Results, c4: c4Results },
  };

  const icon = summary.totalFail > 0 ? '❌' : summary.totalWarn > 0 ? '⚠️' : '✅';
  process.stdout.write(`   ${icon} ${summary.totalPass} PASS · ${summary.totalWarn} WARN · ${summary.totalFail} FAIL\n`);
  return summary;
}

// ── Standalone-Modus (npm run test:shadow:lang) ────────────────────────────────

const isMain = process.argv[1] != null && (
  fileURLToPath(import.meta.url) === process.argv[1].replace(/\\/g, '/') ||
  fileURLToPath(import.meta.url) === process.argv[1]
);

if (isMain) {
  console.log(`\n🔤 BuchungsWerk Sprachqualitäts-Scanner`);
  console.log(`   Start: ${new Date().toLocaleString('de-DE')}\n`);
  console.log('── Teil C: Sprachqualitäts-Scanner ──');
  const result = await runLanguageScan();
  const hasFail = result.totalFail > 0;
  console.log(`\n${hasFail ? '❌ Sprachfehler gefunden' : '✅ Keine Sprachfehler'}\n`);
  process.exit(hasFail ? 1 : 0);
}
