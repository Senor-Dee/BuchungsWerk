import { writeFileSync } from 'fs';
import { join }          from 'path';

export async function generateShadowReport({ results, durationMs, reportDir }) {
  const now     = new Date();
  const dateStr = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  const mdPath  = join(reportDir, `SHADOW_REPORT_${dateStr}.md`);
  const jsonPath = join(reportDir, `SHADOW_REPORT_${dateStr}.json`);

  const { adversarial, security, language } = results;

  const sumA = adversarial  || { totalPass: 0, totalWarn: 0, totalFail: 0, totalCritical: 0, results: [] };
  const sumB = security     || { totalPass: 0, totalWarn: 0, totalFail: 0, totalCritical: 0, results: [] };
  const sumC = language     || { totalPass: 0, totalWarn: 0, totalFail: 0, totalCritical: 0, results: [] };

  const totalPass     = sumA.totalPass     + sumB.totalPass     + sumC.totalPass;
  const totalWarn     = sumA.totalWarn     + sumB.totalWarn     + sumC.totalWarn;
  const totalFail     = sumA.totalFail     + sumB.totalFail     + sumC.totalFail;
  const totalCritical = sumA.totalCritical + sumB.totalCritical + sumC.totalCritical;

  const gesamtBewertung =
    totalCritical > 0 ? '🔴 NICHT SICHER – Kritische Funde sofort beheben!' :
    totalFail > 0     ? '🟡 BEDINGT SICHER – Fehler beheben vor Produktivbetrieb' :
    totalWarn > 0     ? '🟡 SICHER mit Empfehlungen' :
                        '🟢 SICHER – Alle Checks bestanden';

  function statusIcon(s) {
    return s === 'PASS' ? '✅' : s === 'WARN' ? '⚠️' : s === 'CRITICAL' ? '🚨' : '❌';
  }

  function renderResultTable(rows) {
    if (!rows || rows.length === 0) return '_Keine Ergebnisse._\n';
    const lines = [];
    lines.push('| Status | Check | Detail | Empfehlung |');
    lines.push('|--------|-------|--------|------------|');
    for (const r of rows) {
      const icon    = statusIcon(r.status);
      const detail  = (r.detail || '').replace(/\|/g, '∣');
      const fix     = (r.fix   || '—').replace(/\|/g, '∣');
      const label   = (r.label || '').replace(/\|/g, '∣');
      lines.push(`| ${icon} ${r.status} | ${label} | ${detail} | ${fix} |`);
    }
    return lines.join('\n') + '\n';
  }

  function renderCriticalFindings(allResults) {
    const critical = allResults.filter(r => r.status === 'CRITICAL' || r.status === 'FAIL');
    if (critical.length === 0) return '_Keine kritischen Funde – weiter so!_\n';
    const lines = [];
    for (const r of critical) {
      const icon = statusIcon(r.status);
      lines.push(`### ${icon} ${r.label}`);
      lines.push(`**Detail:** ${r.detail}`);
      if (r.fix) lines.push(`**Maßnahme:** ${r.fix}`);
      lines.push('');
    }
    return lines.join('\n');
  }

  function renderRecommendations(allResults) {
    const nonPass = allResults.filter(r => r.status !== 'PASS');
    if (nonPass.length === 0) return '_Keine offenen Empfehlungen._\n';
    const bySeverity = ['CRITICAL', 'FAIL', 'WARN'].flatMap(s => nonPass.filter(r => r.status === s));
    const lines = [];
    bySeverity.forEach((r, i) => {
      const prio = r.status === 'CRITICAL' ? '🚨 Sofort' : r.status === 'FAIL' ? '❌ Dringend' : '⚠️ Optional';
      lines.push(`${i + 1}. **[${prio}]** \`${r.label}\` – ${r.detail}${r.fix ? ` → ${r.fix}` : ''}`);
    });
    return lines.join('\n') + '\n';
  }

  const allResults = [...sumA.results, ...sumB.results, ...sumC.results];

  const md = [
    `# Shadow Test Report – BuchungsWerk`,
    `**Datum:** ${now.toLocaleString('de-DE')}  `,
    `**Laufzeit:** ${(durationMs / 1000).toFixed(1)}s  `,
    `**Gesamtbewertung:** ${gesamtBewertung}`,
    ``,
    `---`,
    ``,
    `## Executive Summary`,
    ``,
    `| Kategorie | ✅ PASS | ⚠️ WARN | ❌ FAIL | 🚨 CRITICAL |`,
    `|-----------|---------|---------|---------|------------|`,
    `| A: BwR Adversarial | ${sumA.totalPass} | ${sumA.totalWarn} | ${sumA.totalFail} | ${sumA.totalCritical} |`,
    `| B: Security Scanner | ${sumB.totalPass} | ${sumB.totalWarn} | ${sumB.totalFail} | ${sumB.totalCritical} |`,
    `| C: Sprachqualität | ${sumC.totalPass} | ${sumC.totalWarn} | ${sumC.totalFail} | ${sumC.totalCritical} |`,
    `| **GESAMT** | **${totalPass}** | **${totalWarn}** | **${totalFail}** | **${totalCritical}** |`,
    ``,
    `---`,
    ``,
    `## Teil A – BwR Adversarial Tests`,
    ``,
    `### A-1: Crash-Input-Tests`,
    renderResultTable(sumA.sections?.crash || []),
    ``,
    `### A-2: Bilanz-Verletzungs-Tests`,
    renderResultTable(sumA.sections?.bilanz || []),
    ``,
    `### A-3: ISB-Bayern-Konsistenz`,
    renderResultTable(sumA.sections?.isb || []),
    ``,
    `---`,
    ``,
    `## Teil B – Security Scanner`,
    ``,
    renderResultTable(sumB.results),
    ``,
    `---`,
    ``,
    `## Teil C – Sprachqualität`,
    ``,
    `### C-1: Strukturelle Checks`,
    renderResultTable(sumC.sections?.c1 || []),
    ``,
    `### C-2: BwR Fachbegriff-Konsistenz`,
    renderResultTable(sumC.sections?.c2 || []),
    ``,
    `### C-3: Rechtschreibung (nspell)`,
    renderResultTable(sumC.sections?.c3 || []),
    ``,
    `### C-4: Aufgabenpool-Texte`,
    renderResultTable(sumC.sections?.c4 || []),
    ``,
    `---`,
    ``,
    `## Kritische Funde`,
    ``,
    renderCriticalFindings(allResults),
    ``,
    `---`,
    ``,
    `## Empfehlungen (priorisiert)`,
    ``,
    renderRecommendations(allResults),
    ``,
    `---`,
    `*Erstellt von BuchungsWerk Shadow Tester · ${now.toLocaleString('de-DE')}*`,
  ].join('\n');

  writeFileSync(mdPath,   md);
  writeFileSync(jsonPath, JSON.stringify({ meta: { date: now.toISOString(), durationMs }, results }, null, 2));

  return { mdPath, jsonPath };
}
