import { writeFileSync } from 'fs';
import { join }          from 'path';

export async function generateReport({ results, durationMs, iterations, reportDir }) {
  const now      = new Date();
  const dateStr  = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  const mdPath   = join(reportDir, `TEST_REPORT_${dateStr}.md`);
  const jsonPath = join(reportDir, `TEST_REPORT_${dateStr}.json`);

  const { poolStress, engineMatrix } = results;
  const allOK = poolStress.totalFailures === 0 && engineMatrix.totalFailures === 0;

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
  lines.push(`*Erstellt von BuchungsWerk Digitaler Tester · ${now.toLocaleString('de-DE')}*`);

  const md = lines.join('\n');
  writeFileSync(mdPath,   md);
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  return { mdPath, jsonPath, allOK };
}
