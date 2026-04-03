/**
 * TEIL B – Security Scanner
 * Automatisierter Sicherheits-Check: Dependencies, API-Keys, HTTP-Header
 */
import { execSync }      from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..', '..');
const BUILD_DIR = join(ROOT, '..', 'buchungswerk-backend', 'app', 'assets');
const LIVE_URL  = 'https://buchungswerk.org';
const PI_URL    = 'http://192.168.68.54:8000';

// ── B-1: npm audit ─────────────────────────────────────────────────────────────

function runNpmAudit() {
  try {
    const raw = execSync('npm audit --json', { cwd: ROOT, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    const data = JSON.parse(raw);
    const meta = data.metadata || {};
    const vulns = meta.vulnerabilities || {};
    const total = (vulns.low||0) + (vulns.moderate||0) + (vulns.high||0) + (vulns.critical||0);

    const results = [];
    if (vulns.critical > 0) {
      results.push({ label: 'npm-audit-critical', status: 'CRITICAL', detail: `${vulns.critical} kritische Schwachstellen!`, fix: 'npm audit fix --force' });
    }
    if (vulns.high > 0) {
      results.push({ label: 'npm-audit-high', status: 'FAIL', detail: `${vulns.high} hohe Schwachstellen`, fix: 'npm audit fix' });
    }
    if (vulns.moderate > 0) {
      results.push({ label: 'npm-audit-moderate', status: 'FAIL', detail: `${vulns.moderate} mittlere Schwachstellen`, fix: 'npm audit fix' });
    }
    if (vulns.low > 0) {
      results.push({ label: 'npm-audit-low', status: 'WARN', detail: `${vulns.low} niedrige Schwachstellen (tolerierbar)` });
    }
    if (total === 0) {
      results.push({ label: 'npm-audit', status: 'PASS', detail: '0 Schwachstellen in Dependencies' });
    }
    return results;
  } catch (e) {
    // npm audit exits with code 1 even when only reporting – try parsing stdout
    try {
      const data = JSON.parse(e.stdout || '{}');
      const meta = data.metadata || {};
      const vulns = meta.vulnerabilities || {};
      const results = [];
      if ((vulns.critical||0) > 0) results.push({ label:'npm-audit-critical', status:'CRITICAL', detail:`${vulns.critical} kritisch`, fix:'npm audit fix --force'});
      if ((vulns.high||0) > 0) results.push({ label:'npm-audit-high', status:'FAIL', detail:`${vulns.high} hoch`, fix:'npm audit fix'});
      if ((vulns.moderate||0) > 0) results.push({ label:'npm-audit-moderate', status:'FAIL', detail:`${vulns.moderate} mittel`, fix:'npm audit fix'});
      if ((vulns.low||0) > 0) results.push({ label:'npm-audit-low', status:'WARN', detail:`${vulns.low} niedrig`});
      if (results.length === 0) results.push({ label:'npm-audit', status:'PASS', detail:'0 Schwachstellen'});
      return results;
    } catch {
      return [{ label: 'npm-audit', status: 'WARN', detail: `Audit nicht auswertbar: ${e.message?.slice(0,60)}` }];
    }
  }
}

// ── B-2: API-Key-Leak-Scan ────────────────────────────────────────────────────

const SENSITIVE_PATTERNS = [
  { name: 'Anthropic API Key', regex: /sk-ant-api0[34]-[a-zA-Z0-9\-_]{20,}/ },
  { name: 'Generic Secret Key', regex: /sk-[a-zA-Z0-9]{40,}/ },
  { name: 'JWT Secret hardcoded', regex: /jwt[_\-]?secret\s*[:=]\s*["'][^"']{16,}["']/i },
  { name: 'Password hardcoded', regex: /password\s*[:=]\s*["'][^"']{8,}["']/i },
  { name: 'API Key hardcoded', regex: /api[_\-]?key\s*[:=]\s*["'][^"']{16,}["']/i },
  { name: 'Bearer Token', regex: /Bearer\s+[a-zA-Z0-9\-_]{40,}/ },
];

function scanDirForSecrets(dir, label) {
  const results = [];
  let files = [];
  try {
    files = readdirSync(dir).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
  } catch {
    results.push({ label: `${label}-scan`, status: 'WARN', detail: `Verzeichnis nicht gefunden: ${dir}` });
    return results;
  }

  let foundAny = false;
  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf8');
    for (const pat of SENSITIVE_PATTERNS) {
      if (pat.regex.test(content)) {
        results.push({ label: `${label}-leak-${pat.name.replace(/\s+/g,'-').toLowerCase()}`, status: 'CRITICAL',
          detail: `"${pat.name}" gefunden in ${file}!`, fix: 'API Key sofort rotieren + .gitignore prüfen' });
        foundAny = true;
      }
    }
  }
  if (!foundAny) {
    results.push({ label: `${label}-api-key-scan`, status: 'PASS', detail: `Keine sensitiven Patterns in ${files.length} Dateien (${label})` });
  }
  return results;
}

function runApiKeyScan() {
  const buildResults = scanDirForSecrets(BUILD_DIR, 'build');
  const srcResults   = scanDirForSecrets(join(ROOT, 'src', 'utils'), 'src-utils');
  return [...buildResults, ...srcResults];
}

// ── B-3: HTTP Security Headers ────────────────────────────────────────────────

const REQUIRED_HEADERS = [
  { name: 'strict-transport-security', check: v => v && v.includes('max-age='), severity: 'HIGH',   fix: 'HSTS aktivieren (Cloudflare: SSL/TLS → HSTS)' },
  { name: 'x-content-type-options',    check: v => v === 'nosniff',             severity: 'MEDIUM', fix: 'Cloudflare Transform Rule: X-Content-Type-Options: nosniff' },
  { name: 'x-frame-options',           check: v => v && (v.includes('DENY') || v.includes('SAMEORIGIN')), severity: 'MEDIUM', fix: 'X-Frame-Options: SAMEORIGIN' },
  { name: 'referrer-policy',           check: v => v && v.includes('strict-origin'), severity: 'LOW', fix: 'Referrer-Policy: strict-origin-when-cross-origin' },
  { name: 'permissions-policy',        check: v => !!v, severity: 'LOW', fix: 'Permissions-Policy: camera=(), microphone=(), geolocation=()' },
  { name: 'content-security-policy',   check: v => !!v, severity: 'MEDIUM', fix: "CSP: default-src 'self'; script-src 'self' 'unsafe-inline'" },
];

async function runHeaderCheck() {
  try {
    const resp = await fetch(LIVE_URL, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    const results = [];
    for (const hdr of REQUIRED_HEADERS) {
      const val = resp.headers.get(hdr.name);
      const ok  = hdr.check(val);
      const status = ok ? 'PASS' : hdr.severity === 'HIGH' ? 'FAIL' : hdr.severity === 'MEDIUM' ? 'FAIL' : 'WARN';
      results.push({ label: `header-${hdr.name}`, status, detail: ok ? `✅ ${hdr.name}: ${val?.slice(0,50)}` : `Fehlt: ${hdr.name}`, fix: ok ? undefined : hdr.fix, severity: hdr.severity });
    }
    return results;
  } catch (e) {
    return [{ label: 'header-check', status: 'WARN', detail: `Live-URL nicht erreichbar (${e.message?.slice(0,40)}) – Header-Check übersprungen` }];
  }
}

// ── B-4: Rate-Limiting ────────────────────────────────────────────────────────

async function runRateLimitCheck() {
  try {
    const statuses = [];
    for (let i = 0; i < 12; i++) {
      try {
        const r = await fetch(`${PI_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'shadow_test@buchungswerk.local', password: 'wrong_pw_shadow' }),
          signal: AbortSignal.timeout(3000),
        });
        statuses.push(r.status);
        if (r.status === 429) break;
      } catch {
        return [{ label: 'rate-limit', status: 'WARN', detail: 'Backend nicht erreichbar – Rate-Limit-Check übersprungen' }];
      }
    }
    const has429 = statuses.includes(429);
    const backendUp = statuses.some(s => s === 200 || s === 401 || s === 422 || s === 429);
    if (!backendUp) return [{ label: 'rate-limit', status: 'WARN', detail: 'Backend antwortet nicht – Test übersprungen' }];
    return [{
      label: 'rate-limit-login',
      status: has429 ? 'PASS' : 'WARN',
      detail: has429 ? `✅ 429 nach ${statuses.indexOf(429)+1} Versuchen` : `Kein 429 nach ${statuses.length} Versuchen – Rate-Limiting möglicherweise inaktiv`,
      fix: has429 ? undefined : 'Rate-Limiting im Backend prüfen (slowapi / fastapi-limiter)',
    }];
  } catch (e) {
    return [{ label: 'rate-limit', status: 'WARN', detail: `Exception: ${e.message?.slice(0,50)}` }];
  }
}

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export async function runSecurityScan() {
  const auditResults  = runNpmAudit();
  const keyResults    = runApiKeyScan();
  const headerResults = await runHeaderCheck();
  const rateResults   = await runRateLimitCheck();
  const all = [...auditResults, ...keyResults, ...headerResults, ...rateResults];

  const summary = {
    totalTests:    all.length,
    totalPass:     all.filter(r => r.status === 'PASS').length,
    totalWarn:     all.filter(r => r.status === 'WARN').length,
    totalFail:     all.filter(r => r.status === 'FAIL').length,
    totalCritical: all.filter(r => r.status === 'CRITICAL').length,
    results: all,
  };

  const icon = summary.totalCritical > 0 ? '❌' : summary.totalFail > 0 ? '❌' : summary.totalWarn > 0 ? '⚠️' : '✅';
  process.stdout.write(`   ${icon} ${summary.totalPass} PASS · ${summary.totalWarn} WARN · ${summary.totalFail} FAIL · ${summary.totalCritical} CRITICAL\n`);
  return summary;
}
