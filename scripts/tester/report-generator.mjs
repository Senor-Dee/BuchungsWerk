import { writeFileSync } from 'fs';
import { join }          from 'path';

export async function generateReport({ results, durationMs, iterations, reportDir }) {
  const now      = new Date();
  const dateStr  = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  const mdPath   = join(reportDir, `TEST_REPORT_${dateStr}.md`);
  const jsonPath = join(reportDir, `TEST_REPORT_${dateStr}.json`);

  const { poolStress, engineMatrix, language } = results;
  const langOK = !language || language.totalFail === 0;
  const allOK  = poolStress.totalFailures === 0 && engineMatrix.totalFailures === 0 && langOK;

  function statusIcon(s) {
    return s === 'PASS' ? '✅' : s === 'WARN' ? '⚠️' : s === 'CRITICAL' ? '🚨' : '❌';
  }

  function renderLangTable(rows) {
    if (!rows || rows.length === 0) return '_Keine Ergebnisse._\n';
    const lines = [];
    lines.push('| Status | Check | Detail | Empfehlung |');
    lines.push('|--------|-------|--------|------------|');
    for (const r of rows) {
      const icon   = statusIcon(r.status);
      const detail = (r.detail || '').replace(/\|/g, '∣');
      const fix    = (r.fix   || '—').replace(/\|/g, '∣');
      const label  = (r.label || '').replace(/\|/g, '∣');
      lines.push(`| ${icon} ${r.status} | ${label} | ${detail} | ${fix} |`);
    }
    return lines.join('\n') + '\n';
  }

  const lines = [
    `# BuchungsWerk – Digitaler Tester Report`,
    `**Datum:** ${now.toLocaleString('de-DE')}  `,
    `**Modus:** ${iterations} Iterationen pro Task  `,
    `**Laufzeit:** ${(durationMs / 1000).toFixed(1)}s  `,
    `**Ergebnis:** ${allOK ? '✅ ALLE TESTS BESTANDEN' : '❌ FEHLER GEFUNDEN'}`,
    ``,
    `---`,
    ``,
    `## Zusammenfassung`,
    ``,
    `| Track | Tasks/Tests | Iterationen | Fehler | Status |`,
    `|-------|------------|-------------|--------|--------|`,
    `| A Pool Stress Test | ${poolStress.totalTasks} | ${poolStress.totalIterations} | ${poolStress.totalFailures} | ${poolStress.totalFailures === 0 ? '✅' : '❌'} |`,
    `| B Engine Matrix    | ${engineMatrix.totalTests} | ${engineMatrix.totalTests} | ${engineMatrix.totalFailures} | ${engineMatrix.totalFailures === 0 ? '✅' : '❌'} |`,
    `| C Sprachqualität   | ${language?.totalTests ?? '–'} | – | ${language?.totalFail ?? '–'} | ${langOK ? '✅' : '❌'} |`,
    ``,
    `---`,
    ``,
    `## Track A – Pool Stress Test Details`,
    ``,
  ];

  if (poolStress.failures.length === 0) {
    lines.push(`✅ Alle ${poolStress.totalTasks} Pool-Tasks × ${iterations} Iterationen fehlerfrei.`);
  } else {
    lines.push(`### ❌ Fehlerhafte Tasks (${poolStress.failures.length})`);
    lines.push(``);
    poolStress.failures.forEach(task => {
      lines.push(`#### \`${task.id}\` (Klasse ${task.klasse}, ${task.lb})`);
      lines.push(`- ${task.failures.length} von ${task.iterations} Iterationen fehlgeschlagen`);
      lines.push(``);
      lines.push(`| # | Firma | Opts | Fehlertyp | Detail |`);
      lines.push(`|---|-------|------|-----------|--------|`);
      task.failures.slice(0, 5).forEach((f, i) => {
        lines.push(`| ${i+1} | ${f.firma} | ${f.opts.werkstoffId}/${f.opts.schwierigkeit} | ${f.type} | ${f.detail} |`);
      });
      if (task.failures.length > 5)
        lines.push(`| … | … | … | (${task.failures.length - 5} weitere) | … |`);
      lines.push(``);
    });
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Track B – Engine Belegtyp-Matrix`);
  lines.push(``);

  if (engineMatrix.failures.length === 0) {
    lines.push(`✅ Alle ${engineMatrix.totalTests} Engine-Tests bestanden.`);
  } else {
    lines.push(`### ❌ Fehlgeschlagene Engine-Tests (${engineMatrix.failures.length})`);
    lines.push(``);
    engineMatrix.failures.forEach(f => {
      lines.push(`#### ${f.typ} Klasse ${f.klasse}`);
      f.errors.forEach(e => lines.push(`- ${e}`));
      lines.push(``);
    });
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Track C – Sprachqualität`);
  lines.push(``);

  if (!language) {
    lines.push(`_Track C nicht ausgeführt._`);
  } else {
    lines.push(`| Check | Status | Funde |`);
    lines.push(`|-------|--------|-------|`);
    const sec = language.sections || {};
    const c1Icon = (sec.c1 || []).some(r => r.status === 'FAIL') ? '❌' : (sec.c1 || []).some(r => r.status === 'WARN') ? '⚠️' : '✅';
    const c2Icon = (sec.c2 || []).some(r => r.status === 'FAIL') ? '❌' : (sec.c2 || []).some(r => r.status === 'WARN') ? '⚠️' : '✅';
    const c3Icon = (sec.c3 || []).some(r => r.status === 'FAIL') ? '❌' : (sec.c3 || []).some(r => r.status === 'WARN') ? '⚠️' : '✅';
    const c4Icon = (sec.c4 || []).some(r => r.status === 'FAIL') ? '❌' : (sec.c4 || []).some(r => r.status === 'WARN') ? '⚠️' : '✅';
    lines.push(`| C-1 Struktur-Regex | ${c1Icon} | ${(sec.c1 || []).filter(r => r.status !== 'PASS').length} |`);
    lines.push(`| C-2 Fachbegriff-Konsistenz | ${c2Icon} | ${(sec.c2 || []).filter(r => r.status !== 'PASS').length} |`);
    lines.push(`| C-3 nspell Wörterbuch | ${c3Icon} | ${(sec.c3 || []).filter(r => r.status !== 'PASS').length} |`);
    lines.push(`| C-4 Aufgabentexte | ${c4Icon} | ${(sec.c4 || []).filter(r => r.status !== 'PASS').length} |`);
    lines.push(``);

    if (language.totalFail > 0 || language.totalWarn > 0) {
      lines.push(`### Details`);
      lines.push(``);
      lines.push(`#### C-1: Strukturelle Checks`);
      lines.push(renderLangTable(sec.c1 || []));
      lines.push(`#### C-2: BwR Fachbegriff-Konsistenz`);
      lines.push(renderLangTable(sec.c2 || []));
      lines.push(`#### C-3: Rechtschreibung (nspell)`);
      lines.push(renderLangTable(sec.c3 || []));
      lines.push(`#### C-4: Aufgabenpool-Texte`);
      lines.push(renderLangTable(sec.c4 || []));
    } else {
      lines.push(`✅ Alle Sprachqualitäts-Checks bestanden (${language.totalPass} PASS).`);
    }
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(`*Erstellt von BuchungsWerk Digitaler Tester · ${now.toLocaleString('de-DE')}*`);

  const md = lines.join('\n');
  writeFileSync(mdPath,   md);
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  return { mdPath, jsonPath, allOK };
}
