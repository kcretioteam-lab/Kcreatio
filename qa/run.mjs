// Runs the whole suite in order. Prereqs (see ../TEST_PLAN.md §1):
//   backend on :4000 with CHROME_PATH set (the pdfmake fallback crashes the server — BUG-01),
//   production build on :5174 (`VITE_API_URL=/api/v1 vite build` + `vite preview --port 5174`), dev server on :5173.
//   BACKEND_LOG=<file the backend's stdout is written to> (OTP codes and approve links are read from it).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

if (!process.env.BACKEND_LOG) { console.error('Set BACKEND_LOG to the backend stdout log file'); process.exit(1); }
for (const f of ['out/results.json', 'out/state.json']) fs.rmSync(f, { force: true });
const STEPS = ['01-landing-auth', '02-basic-api', '03-invoice-ui', '04-tds-deals', '05-tds-form16a', '06-premium-pro', '07-inbox-accept', '08-resilience-sweep', '99-cleanup'];
for (const step of STEPS) {
  console.log(`\n── ${step}`);
  try { execFileSync(process.execPath, [`${step}.mjs`], { stdio: 'inherit', env: process.env }); }
  catch { console.error(`${step} exited non-zero`); }
}
const r = JSON.parse(fs.readFileSync('out/results.json', 'utf8'));
const tally = Object.values(r).reduce((a, x) => ({ ...a, [x.status]: (a[x.status] || 0) + 1 }), {});
console.log('\nSummary', tally);
