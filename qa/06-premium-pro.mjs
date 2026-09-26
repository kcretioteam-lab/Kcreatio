// Premium request → approve link → Pro features: clean PDF, tax planner, Smart Inbox, bell badge.
import fs from 'node:fs';
import path from 'node:path';
import { APP, OUT, client, check, expect, eq, record, state, db, login, browser, watchedPage, shot, authedContext, waitForLog, logSize, inr } from './lib.mjs';

const s = state.get();
let c = await login();
const b = await browser();

async function pdfText(buf) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) text += (await (await doc.getPage(i)).getTextContent()).items.map(x => x.str).join(' ') + '\n';
  return text;
}

try {
  // ── PRM-01: request via UI (Tax Planner gate) ──────────────────────────────
  await check('PRM-01', async () => {
    const ctx = await authedContext(b, c.jar);
    const page = await watchedPage(ctx);
    await page.goto(APP + '/tax-planner', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const gate = await shot(page, 'prm01-gate');
    await page.getByRole('button', { name: /request/i }).first().click();
    await page.getByRole('heading', { name: 'Request premium access' }).waitFor({ timeout: 5000 });
    await page.getByLabel('Advance tax calculator').check();
    await page.getByLabel('Watermark-free invoice PDFs').check();
    await page.getByLabel('Smart Inbox (Gmail auto-detect)').check();
    await page.locator('#premium-platform').selectOption('youtube');
    await page.locator('#premium-followers').pressSequentially('120000', { delay: 5 });
    const modal = await shot(page, 'prm01-modal');
    const since = logSize();
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.request().method() === 'POST' && /premium-requests$/.test(r.url())),
      page.getByRole('button', { name: /Request 28 days of Pro/ }).click(),
    ]);
    const body = await resp.json();
    const m = await waitForLog('Approve: (http\\S+)', { since });
    state.set({ approveUrl: m[1], premiumRequestId: body.request?.id });
    await page.waitForTimeout(800);
    const after = await shot(page, 'prm01-after');
    const { data: row } = await db().from('premium_requests').select('status, features, platform, follower_count').eq('id', body.request.id).single();
    await ctx.close();
    eq(resp.status(), 201, 'status'); eq(row.status, 'pending', 'db status'); eq(row.follower_count, 120000, 'followers');
    return { notes: `UI → 201; premium_requests row {status:pending, platform:${row.platform}, features:${row.features.join('/')}}; admin email logged with Approve link (ADMIN_EMAIL unset locally → console)`, evidence: { gate, modal, after } };
  });

  await check('PRM-03', async () => {
    const dup = await c.post('/premium-requests', { features: ['ca_export'], platform: 'instagram', followerCount: 5000 });
    const forged = await client().get('/premium-requests/approve?token=eyJhbGciOiJIUzI1NiJ9.eyJyZXF1ZXN0SWQiOiJ4IiwicHVycG9zZSI6InByZW1pdW1fYXBwcm92ZSJ9.bad');
    const accessTok = c.jar.access_token; // a real sign-in token must not approve anything
    const wrongPurpose = await client().get(`/premium-requests/approve?token=${accessTok}`);
    eq(dup.status, 409, 'duplicate'); eq(forged.status, 400, 'forged'); eq(wrongPurpose.status, 400, 'access token as approve token');
    return { notes: `Second request while pending → 409 "${dup.data.message}"; forged token → 400 "Link invalid or expired"; session token used as approve token → 400` };
  });

  await check('PRM-02', async () => {
    const url = state.get().approveUrl;
    const r = await client().get(url);
    const again = await client().get(url);
    const { data: u } = await db().from('users').select('plan, trial_ends_at').eq('id', s.userId).single();
    const { data: pr } = await db().from('premium_requests').select('status, approved_at').eq('id', state.get().premiumRequestId).single();
    const days = Math.round((new Date(u.trial_ends_at) - Date.now()) / 86400000);
    eq(r.status, 200, 'approve'); expect(/Approved/.test(r.data), 'page text'); eq(u.plan, 'trial', 'plan');
    expect(days === 28, `trial_ends_at in ${days} days`); eq(pr.status, 'approved', 'request status');
    const stale = await c.get('/tax/estimate?annualEstimate=1500000');   // old access token still says basic
    c = await login();                                                     // fresh login picks up the new plan
    const fresh = await c.get('/tax/estimate?annualEstimate=1500000');
    return { notes: `Approve link → 200 "Approved ✓"; users.plan=trial, trial_ends_at +${days}d; request approved; re-opening link → "${/Already approved/.test(again.data) ? 'Already approved ✓' : again.status}". Existing session keeps the old plan claim until token refresh (/tax/estimate ${stale.status}); after re-login → ${fresh.status}` };
  });

  // ── Pro: clean PDF ─────────────────────────────────────────────────────────
  await check('INV-09', async () => {
    // new invoice so the per-invoice PDF cache (keyed on id+updated_at, not plan) can't serve the Basic copy
    const inv = await c.post('/invoices', { brandName: 'Pro PDF Brand', brandGstin: '29AABCM5678D1Z9', brandAddress: '1 Palace Rd, Mysuru, Karnataka', brandStateCode: '29', placeOfSupply: '29', lineItems: [{ description: 'Reel', sacCode: '998399', amount: 100000, gstRate: 18 }], templateId: 'professional' });
    const r = await c.get(`/invoices/${inv.data.id}/pdf`);
    fs.writeFileSync(path.join(OUT, 'inv09-pro.pdf'), r.data);
    const text = await pdfText(r.data);
    // Basic invoice re-downloaded right after the upgrade (cache check)
    const cached = await c.get(`/invoices/${state.get().invIntra}/pdf`);
    const cachedText = await pdfText(cached.data);
    eq(inv.status, 201, `pro-only template "professional" allowed on trial (${inv.status})`);
    eq(r.status, 200, 'pdf');
    // exact watermark text — the QA account's own email (…@kcreatio.com) is printed on the invoice too
    expect(!/Made with ease on kcreatio\.com/i.test(text), 'Pro PDF still has the watermark footer');
    const note = /Made with ease on kcreatio\.com/i.test(cachedText) ? ' Note: the Basic-era invoice re-downloaded within 5 min still carries the watermark (PDF cache key ignores plan)' : '';
    return { notes: `Trial/Pro PDF has no watermark footer; "professional" template accepted.${note}`, evidence: { file: 'qa/out/inv09-pro.pdf' } };
  });

  // ── Tax planner API ────────────────────────────────────────────────────────
  await check('TAX-01', async () => {
    const r = await c.get('/tax/estimate?annualEstimate=1500000&regime=new');
    eq(r.status, 200, 'status'); eq(r.data.standardDeduction, 0, 'standardDeduction'); eq(r.data.taxableIncome, 1500000, 'taxableIncome');
    eq(r.data.totalTax, 109200, 'totalTax');
    return { notes: `₹15L professional income: standardDeduction ₹0, taxable ₹15,00,000, tax ₹1,09,200 (new regime)` };
  });

  await check('TAX-02', async () => {
    const n = (await c.get('/tax/estimate?annualEstimate=1500000&regime=new')).data;
    const o = (await c.get('/tax/estimate?annualEstimate=1500000&regime=old')).data;
    eq(o.baseTax, 262500, 'old slab tax'); eq(o.cess, 10500, 'old cess'); eq(o.totalTax, 273000, 'old total');
    eq(n.baseTax, 105000, 'new slab tax'); eq(n.cess, 4200, 'new cess');
    return { notes: `Old: slab ₹2,62,500 + cess ₹10,500 = ₹2,73,000; New: ₹1,05,000 + ₹4,200 = ₹1,09,200 (UI toggle checked in TAX-UI)` };
  });

  await check('TAX-03', async () => {
    const r = (await c.get('/tax/estimate?annualEstimate=15000000&regime=new')).data;
    eq(r.baseTax, 4080000, 'slab'); eq(r.surchargeRate, 0.15, 'surcharge rate');
    eq(r.surcharge, 612000, 'surcharge 15%'); eq(r.cess, Math.round((4080000 + 612000) * 0.04), 'cess');
    const edge = (await c.get('/tax/estimate?annualEstimate=5010000&regime=new')).data; // just over ₹50L → marginal relief
    const atLimit = (await c.get('/tax/estimate?annualEstimate=5000000&regime=new')).data;
    expect(edge.baseTax + edge.surcharge - (atLimit.baseTax + atLimit.surcharge) <= 10000, `marginal relief not applied at ₹50.1L: ${edge.surcharge}`);
    return { notes: `₹1.5 Cr: slab ₹40,80,000 + 15% surcharge ₹6,12,000 + 4% cess ₹${r.cess} = ₹${r.totalTax}. ₹50.1L: surcharge limited to ₹${edge.surcharge} by marginal relief` };
  });

  await check('TAX-04', async () => {
    const r = (await c.get('/tax/estimate?annualEstimate=2400000&regime=new')).data;
    const cum = r.instalments.map(i => `${i.quarter} ${i.dueDate} ${inr(i.cumulativeDue)}`);
    const pct = r.instalments.map(i => Math.round(i.cumulativeDue / r.netPayable * 100));
    expect(pct.join() === '15,45,75,100', `cumulative % ${pct}`);
    expect(r.instalments.map(i => i.dueDate).join() === 'Jun 15,Sep 15,Dec 15,Mar 15', 'dates');
    return { notes: `Net payable ${inr(r.netPayable)} → ${cum.join('; ')} (15/45/75/100%)` };
  });

  await check('TAX-06', async () => {
    const r = await c.get('/tax/deadlines');
    const list = (r.data.deadlines || r.data || []).slice?.(0, 6) || r.data;
    eq(r.status, 200, 'status');
    return {
      status: 'PASS',
      notes: `GET /tax/deadlines → ${JSON.stringify(list).slice(0, 300)}. Reminder job (0 9 * * *) sends when days-until = user pref (default 14) or 2; Basic gets Q4 only. Not triggerable locally (ENABLE_JOBS off, no export, no RESEND) — verified by code review; see bug on unscoped tax_payments lookup`,
    };
  });

  // ── Smart Inbox (paste) ───────────────────────────────────────────────────
  const paste = (subject, body, from_email, from_name) => c.post('/email-detections/paste', { subject, body, from_email, from_name });

  await check('INB-02', async () => {
    const r = await paste('Payment processed – Campaign X', 'Hi, We have processed ₹45,000 for campaign X after 10% TDS. The amount will reflect in 2 working days. Regards, Finance Team, Boat Lifestyle', 'finance@boat-lifestyle.example', 'boAt Finance');
    const cl = r.data.classification;
    state.set({ detPayment: r.data.detection?.id });
    eq(r.status, 201, 'status');
    const ex = cl.extracted || {};
    const ok = ['payment_received', 'tds_deduction'].includes(cl.type) && Number(ex.amount) === 45000;
    return { status: ok ? (ex.tds_rate == 10 ? 'PASS' : 'FAIL') : 'FAIL', notes: `type=${cl.type} confidence=${cl.confidence} extracted=${JSON.stringify(ex)} reasons=${JSON.stringify(cl.reasons).slice(0, 200)}` };
  });

  await check('INB-01', async () => {
    const r = await paste('TDS deducted on invoice INV/2627/0001', 'Dear Creator, TDS of Rs. 10,000 has been deducted under Section 194J on your invoice of Rs. 1,00,000. TAN: BLRM12345C. Form 16A will be issued quarterly.', 'accounts@mysoresilks.example', 'Mysore Silks Accounts');
    const cl = r.data.classification;
    state.set({ detTds: r.data.detection?.id });
    const { data: row } = await db().from('email_detections').select('status, confidence, email_received_at, extracted_data, detected_type').eq('id', r.data.detection.id).single();
    eq(row.status, 'pending_review', 'status');
    expect(row.email_received_at && row.extracted_data?.reasons?.length, 'timestamp/reasons missing');
    return { status: cl.type === 'tds_deduction' ? 'PASS' : 'FAIL', notes: `TDS email → type=${cl.type} conf=${cl.confidence} extracted=${JSON.stringify(cl.extracted)}; DB row pending_review with timestamp + ${row.extracted_data.reasons.length} provenance reasons` };
  });

  await check('INB-03', async () => {
    const r = await paste('Collaboration opportunity 🚀', 'Hey! We love your content and we want to collaborate with you on our upcoming launch. Would you be interested? Let us know your rates.', 'marketing@glowleaf.example', 'Glowleaf');
    const cl = r.data.classification;
    state.set({ detOutreach: r.data.detection?.id });
    expect(cl.type !== 'deal_confirmation', `soft inquiry classified as confirmed deal (conf ${cl.confidence})`);
    return { notes: `Soft inquiry → type=${cl.type} conf=${cl.confidence} (not deal_confirmation)` };
  });

  await check('INB-04', async () => {
    const ctx = await authedContext(b, c.jar);
    const page = await watchedPage(ctx);
    await page.goto(APP + '/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const readBadge = () => page.evaluate(() => {
      const bell = [...document.querySelectorAll('button, a')].find(e => /notification|inbox|bell/i.test(e.getAttribute('aria-label') || '') || e.querySelector('svg.lucide-bell'));
      return bell ? (bell.innerText || bell.getAttribute('aria-label') || '').trim() : '(no bell)';
    });
    const b1 = await readBadge();
    const { count: pending1 } = await db().from('email_detections').select('id', { count: 'exact', head: true }).eq('user_id', s.userId).eq('status', 'pending_review');
    const sh1 = await shot(page, 'inb04-bell-before');
    const rej = await c.put(`/email-detections/${state.get().detOutreach}/reject`, {});
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const b2 = await readBadge();
    const { count: pending2 } = await db().from('email_detections').select('id', { count: 'exact', head: true }).eq('user_id', s.userId).eq('status', 'pending_review');
    const sh2 = await shot(page, 'inb04-bell-after');
    const body = await page.locator('body').innerText();
    await ctx.close();
    const n1 = Number((b1.match(/\d+/) || [NaN])[0]), n2 = Number((b2.match(/\d+/) || [NaN])[0]);
    eq(rej.status, 200, 'reject');
    expect(n1 === pending1 && n2 === pending2, `bell ${JSON.stringify(b1)} → ${JSON.stringify(b2)} vs pending ${pending1} → ${pending2}`);
    return { notes: `Bell badge ${n1} = ${pending1} pending; after rejecting one → ${n2} = ${pending2}. Smart Inbox cards visible: ${/Smart Inbox/i.test(body)}`, evidence: { sh1, sh2 } };
  });

  await check('INB-ACCEPT', async () => {
    const r = await c.put(`/email-detections/${state.get().detTds}/accept`, {});
    const { data: det } = await db().from('email_detections').select('status, linked_tds_id').eq('id', state.get().detTds).single();
    const { data: tds } = det.linked_tds_id ? await db().from('tds_records').select('tds_amount, invoice_amount, brand_name').eq('id', det.linked_tds_id).single() : { data: null };
    eq(r.status, 200, 'accept');
    return { status: tds && Number(tds.tds_amount) === 10000 ? 'PASS' : 'FAIL', notes: `Accept TDS detection → ${det.status}; linked TDS row ${JSON.stringify(tds)} (expected TDS ₹10,000 on ₹1,00,000)` };
  });

  // ── Tax planner UI ─────────────────────────────────────────────────────────
  await check('TAX-UI', async () => {
    const ctx = await authedContext(b, c.jar);
    const page = await watchedPage(ctx);
    await page.goto(APP + '/tax-planner', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const sh1 = await shot(page, 'tax-ui-new');
    const t1 = await page.locator('main').innerText().catch(() => page.locator('body').innerText());
    const oldBtn = page.getByRole('button', { name: /^old/i }).or(page.getByText(/^Old regime$/i)).first();
    let toggled = false, t2 = '';
    if (await oldBtn.isVisible().catch(() => false)) {
      const [resp] = await Promise.all([page.waitForResponse(r => r.url().includes('/tax/estimate'), { timeout: 8000 }).catch(() => null), oldBtn.click()]);
      await page.waitForTimeout(1000);
      t2 = await page.locator('body').innerText();
      toggled = Boolean(resp) && resp.url().includes('regime=old');
    }
    const sh2 = await shot(page, 'tax-ui-old');
    const issues = page.issues;
    await ctx.close();
    expect(!issues.pageErrors.length, `page errors ${issues.pageErrors}`);
    expect(toggled, 'regime toggle did not re-query with regime=old');
    expect(/Jun 15|15 Jun/.test(t1) && /Mar 15|15 Mar/.test(t1), 'instalment dates not shown');
    expect(t1 !== t2, 'numbers unchanged after toggle');
    return { notes: `Planner renders instalments; toggling Old re-fetches /tax/estimate?regime=old and updates figures`, evidence: { sh1, sh2 } };
  });
} finally {
  await b.close();
}
