// Runs the whole suite in order. Prereqs (see ../TEST_PLAN.md §1):
//   backend on :4000, production build on :5174 (`VITE_API_URL=/api/v1 vite build` + `vite preview --port 5174`),
//   dev server on :5173, BACKEND_LOG=<file the backend's stdout is written to> (OTP codes and approve links are read from it).
// 09-pdf-fallback needs the backend restarted with a CHROME_PATH that doesn't exist — the runner pauses for it.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import readline from 'node:readline/promises';

if (!process.env.BACKEND_LOG) { console.error('Set BACKEND_LOG to the backend stdout log file'); process.exit(1); }
for (const f of ['out/results.json', 'out/state.json']) fs.rmSync(f, { force: true });

const run = (step, env = {}) => {
  console.log(`\n── ${step}${env.SWEEP_PLAN ? ` (${env.SWEEP_PLAN})` : ''}`);
  try { execFileSync(process.execPath, [`${step}.mjs`], { stdio: 'inherit', env: { ...process.env, ...env } }); }
  catch { console.error(`${step} exited non-zero`); }
};

for (const step of ['01-landing-auth', '02-basic-api', '03-invoice-ui', '04-tds-deals', '05-tds-form16a']) run(step);
run('08-resilience-sweep', { SWEEP_PLAN: 'basic' });            // page sweep while the QA account is still Basic
for (const step of ['06-premium-pro', '07-inbox-accept', '08-resilience-sweep']) run(step);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question('\nRestart the backend with CHROME_PATH=C:/does-not-exist/chrome.exe, then press Enter (or type "skip"): ');
rl.close();
if (answer.trim() !== 'skip') run('09-pdf-fallback');
run('99-cleanup');

const r = JSON.parse(fs.readFileSync('out/results.json', 'utf8'));
const tally = Object.values(r).reduce((a, x) => ({ ...a, [x.status]: (a[x.status] || 0) + 1 }), {});
console.log('\nSummary', tally);
