#!/usr/bin/env node
/**
 * BuchungsWerk Shadow Tester
 * Dreistufiges Sicherheits- und Qualitäts-System:
 *   Teil A – BwR Adversarial (Engine mit ungültigen Eingaben testen)
 *   Teil B – Security Scanner (Dependencies, API-Keys, HTTP-Header, Rate-Limit)
 *   Teil C – Sprachqualität (Struktur, Fachbegriffe, nspell, Pool-Texte)
 *
 * Usage:
 *   node scripts/shadow-tester.mjs
 *   SHADOW_QUICK=1 node scripts/shadow-tester.mjs
 *
 * Exit Codes:
 *   0 = alles PASS/WARN
 *   1 = mindestens ein FAIL
 *   2 = mindestens ein CRITICAL
 */

import { runAdversarialTests } from './shadow/adversarial-engine.mjs';
import { runSecurityScan }     from './shadow/security-scanner.mjs';
import { runLanguageScan }     from './shadow/language-scanner.mjs';
import { generateShadowReport } from './shadow/shadow-report-generator.mjs';
import { mkdirSync }           from 'fs';
import { join, dirname }       from 'path';
import { fileURLToPath }       from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const REPORT_DIR = join(ROOT, '..', '.claude', 'communication', 'TEST_REPORTS');

mkdirSync(REPORT_DIR, { recursive: true });

console.log(`\n🔴 BuchungsWerk Shadow Tester`);
console.log(`   Start: ${new Date().toLocaleString('de-DE')}\n`);

const startTime = Date.now();

// ── Teil A: Adversarial ───────────────────────────────────────────────────────
console.log('── Teil A: BwR Adversarial Tests ──');
const adversarial = await runAdversarialTests();

// ── Teil B: Security ─────────────────────────────────────────────────────────
console.log('── Teil B: Security Scanner ──');
const security = await runSecurityScan();

// ── Teil C: Sprache ───────────────────────────────────────────────────────────
console.log('── Teil C: Sprachqualitäts-Scanner ──');
const language = await runLanguageScan();

// ── Report ────────────────────────────────────────────────────────────────────
const durationMs = Date.now() - startTime;
const report     = await generateShadowReport({
  results: { adversarial, security, language },
  durationMs,
  reportDir: REPORT_DIR,
});

// ── Zusammenfassung ────────────────────────────────────────────────────────────
const allResults = [
  ...adversarial.results,
  ...security.results,
  ...language.results,
];
const totalCritical = allResults.filter(r => r.status === 'CRITICAL').length;
const totalFail     = allResults.filter(r => r.status === 'FAIL').length;
const totalWarn     = allResults.filter(r => r.status === 'WARN').length;
const totalPass     = allResults.filter(r => r.status === 'PASS').length;

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Ergebnis: ${totalPass} PASS · ${totalWarn} WARN · ${totalFail} FAIL · ${totalCritical} CRITICAL`);
console.log(`  Laufzeit: ${(durationMs / 1000).toFixed(1)}s`);
console.log(`  Report:   ${report.mdPath}`);

if (totalCritical > 0) {
  console.log(`\n🚨 KRITISCH – ${totalCritical} kritische Funde! Sofort prüfen!\n`);
  process.exit(2);
} else if (totalFail > 0) {
  console.log(`\n❌ FAIL – ${totalFail} Fehler gefunden. Report prüfen!\n`);
  process.exit(1);
} else if (totalWarn > 0) {
  console.log(`\n⚠️  ${totalWarn} Warnungen – keine kritischen Funde.\n`);
  process.exit(0);
} else {
  console.log(`\n✅ Alle Shadow-Tests bestanden!\n`);
  process.exit(0);
}
