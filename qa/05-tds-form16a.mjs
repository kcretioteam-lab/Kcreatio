// TDS-03: Form 16A status → received (desktop flow: "Mark requested", then upload the certificate).
import fs from 'node:fs';
import path from 'node:path';
import { APP, OUT, check, expect, eq, state, db, login, browser, watchedPage, shot, authedContext, inr } from './lib.mjs';

const c = await login();
const b = await browser();
const ctx = await authedContext(b, c.jar);
const pdf = path.join(OUT, 'form16a-test.pdf');
fs.copyFileSync(path.join(OUT, 'inv08-basic.pdf'), pdf);   // any small real PDF

try {
  const page = await watchedPage(ctx);
  await check('TDS-03', async () => {
    const before = (await c.get('/tds/summary')).data;
    await page.goto(APP + '/tds', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const row = page.locator('tr', { hasText: 'Nykaa Fashion' }).first();   // ₹4,500 manual entry from TDS-02
    const [r1] = await Promise.all([
      page.waitForResponse(x => x.request().method() === 'PUT' && x.url().includes('/tds/')),
      row.getByRole('button', { name: /Mark requested/ }).click(),
    ]);
    await page.waitForTimeout(600);
    const [r2] = await Promise.all([
      page.waitForResponse(x => x.request().method() === 'PUT' && x.url().includes('/tds/'), { timeout: 30000 }),
      row.locator('input[type=file]').setInputFiles(pdf),
    ]);
    await page.waitForTimeout(1200);
    const upload = JSON.parse(r2.request().postData());
    state.set({ form16aPath: upload.form16aPath });
    const after = (await c.get('/tds/summary')).data;
    const body = await page.locator('body').innerText();
    const rowText = (await row.innerText()).replace(/\s+/g, ' ');
    const sh = await shot(page, 'tds03-form16a');
    eq(r1.status(), 200, 'mark requested'); eq(r2.status(), 200, 'upload');
    eq(after.form16aReceived - before.form16aReceived, 4500, 'form16aReceived delta');
    eq(before.pending - after.pending, 4500, 'pending delta');
    expect(body.includes(inr(after.form16aReceived)), `stat card doesn't show ${inr(after.form16aReceived)} without reload`);
    return { notes: `"Mark requested" → 200; uploaded certificate → status received. Summary received ${inr(before.form16aReceived)} → ${inr(after.form16aReceived)}, pending ${inr(before.pending)} → ${inr(after.pending)}; stat cards updated in place. Row: "${rowText.slice(0, 140)}"`, evidence: { sh } };
  });
} finally {
  await b.close();
}
