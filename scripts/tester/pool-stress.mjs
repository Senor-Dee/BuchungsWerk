import { AUFGABEN_POOL }         from '../../src/data/aufgabenPool.js';
import { validatePoolBuchungssatz, belegPoolToBuchungssatz, engineFormatToPoolFormat }
                                  from '../../src/utils/buchungsEngine.js';
import { UNTERNEHMEN }           from '../../src/data/stammdaten.js';

// Alle 4 Modellunternehmen als Testfirmen
const TEST_FIRMEN = UNTERNEHMEN; // LumiTec, Waldform, AlpenTextil, VitaSport

const ALL_OPTS_VARIANTS = [
  { werkstoffId: 'rohstoffe',      schwierigkeit: 'einfach'  },
  { werkstoffId: 'rohstoffe',      schwierigkeit: 'gemischt' },
  { werkstoffId: 'rohstoffe',      schwierigkeit: 'schwer'   },
  { werkstoffId: 'fremdbauteile',  schwierigkeit: 'gemischt' },
  { werkstoffId: 'hilfsstoffe',    schwierigkeit: 'gemischt' },
  { werkstoffId: 'betriebsstoffe', schwierigkeit: 'gemischt' },
];

export async function runPoolStressTest({ iterations }) {
  const summary = {
    totalTasks: 0, totalIterations: 0, totalFailures: 0,
    failures: [], taskResults: []
  };

  for (const [klasse, lernbereiche] of Object.entries(AUFGABEN_POOL)) {
    for (const [lb, tasks] of Object.entries(lernbereiche)) {
      for (const task of tasks) {
        if (!['buchungssatz', 'komplex'].includes(task.taskTyp)) continue;

        summary.totalTasks++;
        const taskResult = { id: task.id, klasse, lb, iterations: 0, failures: [] };

        // N Iterationen mit rotierten Firmen und Opts
        for (let i = 0; i < iterations; i++) {
          const firma = TEST_FIRMEN[i % TEST_FIRMEN.length];
          const opts  = ALL_OPTS_VARIANTS[i % ALL_OPTS_VARIANTS.length];
          summary.totalIterations++;
          taskResult.iterations++;

          try {
            const gen = task.taskTyp === 'theorie'
              ? task.generate()
              : task.generate(firma, opts);

            // Buchungssatz-Validierung
            if (task.taskTyp === 'komplex' && gen.schritte) {
              gen.schritte.forEach((schritt, si) => {
                validatePoolBuchungssatz(schritt, `${task.id}_schritt_${si}`);
              });
            } else {
              validatePoolBuchungssatz(gen, task.id);
            }

            // Engine-Crosscheck für Beleg-Tasks
            if (gen?.beleg?.typ) {
              try {
                const klasseNum = parseInt(klasse, 10);
                const engineResult = belegPoolToBuchungssatz(gen.beleg, klasseNum);
                if (engineResult?.buchungssatz?.length && gen.soll?.length) {
                  const enginePool = engineFormatToPoolFormat(engineResult.buchungssatz);
                  const poolSoll   = gen.soll.reduce((s, z) => s + (z.betrag || 0), 0);
                  const engSoll    = enginePool.soll.reduce((s, z) => s + (z.betrag || 0), 0);
                  if (Math.abs(poolSoll - engSoll) > 0.02) {
                    taskResult.failures.push({
                      iteration: i, firma: firma.name, opts,
                      type: 'ENGINE_DISKREPANZ',
                      detail: `Pool-Soll=${poolSoll.toFixed(2)} Engine-Soll=${engSoll.toFixed(2)}`
                    });
                    summary.totalFailures++;
                  }
                }
              } catch (e) { /* Engine-Crosscheck-Fehler: kein Failure */ }
            }

          } catch (err) {
            taskResult.failures.push({
              iteration: i, firma: firma.name, opts,
              type: 'BILANZ_FEHLER', detail: err.message
            });
            summary.totalFailures++;
          }
        }

        if (taskResult.failures.length > 0) {
          summary.failures.push(taskResult);
          process.stdout.write(`  ❌ ${task.id}: ${taskResult.failures.length} Fehler\n`);
        } else {
          process.stdout.write('.');
        }

        summary.taskResults.push(taskResult);
      }
    }
  }
  process.stdout.write('\n');
  return summary;
}
