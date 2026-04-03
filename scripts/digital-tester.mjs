#!/usr/bin/env node
/**
 * BuchungsWerk Digitaler Tester
 * Autonomes Stress-Test-System – kann overnight unbeaufsichtigt laufen.
 *
 * Usage:
 *   node scripts/digital-tester.mjs          → 50 Iterationen pro Task
 *   node scripts/digital-tester.mjs --quick  → 10 Iterationen (schnell)
 */

import { runPoolStressTest }  from './tester/pool-stress.mjs';
import { runEngineMatrix }    from './tester/engine-matrix.mjs';
import { generateReport }     from './tester/report-generator.mjs';
import { mkdirSync }          from 'fs';
import { join, dirname }      from 'path';
import { fileURLToPath }      from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const REPORT_DIR = join(ROOT, '..', '.claude', 'communication', 'TEST_REPORTS');

const QUICK = process.argv.includes('--quick');
const ITER  = QUICK ? 10 : 50;

console.log(`\n🤖 BuchungsWerk Digitaler Tester`);
console.log(`   Modus: ${QUICK ? 'Quick (10 Iter.)' : 'Full (50 Iter.)'}`);
console.log(`   Start: ${new Date().toLocaleString('de-DE')}\n`);

mkdirSync(REPORT_DIR, { recursive: true });

const startTime = Date.now();
const results   = {};

// ── Track A: Pool Stress Test ─────────────────────────────────────────────────
console.log('── Track A: Pool Stress Test ──');
results.poolStress = await runPoolStressTest({ iterations: ITER, rootDir: ROOT });
const poolOK = results.poolStress.totalFailures === 0;
console.log(`   ${poolOK ? '✅' : '❌'} ${results.poolStress.totalTasks} Tasks × ${ITER} Iter. → ${results.poolStress.totalFailures} Fehler\n`);

// ── Track B: Engine Belegtyp-Matrix ──────────────────────────────────────────
console.log('── Track B: Engine Belegtyp-Matrix ──');
results.engineMatrix = await runEngineMatrix({ rootDir: ROOT });
const engineOK = results.engineMatrix.totalFailures === 0;
console.log(`   ${engineOK ? '✅' : '❌'} ${results.engineMatrix.totalTests} Tests → ${results.engineMatrix.totalFailures} Fehler\n`);

// ── Report generieren ─────────────────────────────────────────────────────────
const durationMs = Date.now() - startTime;
const report     = await generateReport({ results, durationMs, iterations: ITER, reportDir: REPORT_DIR });

console.log(`\n📋 Report: ${report.mdPath}`);
console.log(`⏱️  Laufzeit: ${(durationMs / 1000).toFixed(1)}s`);
console.log(`\n${poolOK && engineOK ? '✅ ALLE TESTS BESTANDEN' : '❌ FEHLER GEFUNDEN – Report prüfen!'}\n`);

process.exit(poolOK && engineOK ? 0 : 1);
