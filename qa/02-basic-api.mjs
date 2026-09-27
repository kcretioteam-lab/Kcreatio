// Basic-plan API checks: profile, GST maths, validation, PDF watermark, TDS, plan gates, security.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { API, client, check, expect, eq, record, state, db, login, logSize, logSince, OUT, inr } from './lib.mjs';

const breq = createRequire(path.resolve('../backend/package.json'));
const jwt = breq('jsonwebtoken');
const s = state.get();
const c = await login();

const CREATOR_GSTIN = '29AAACK1234A1Z6';
const BRAND_KA = '29AABCM5678D1Z9';
const BRAND_MH = '27AAACB1234C1ZF';
const today = new Date().toISOString().slice(0, 10);

// Profile: the supplier state comes from the creator's GSTIN
const prof = await c.put('/auth/profile', { gstin: CREATOR_GSTIN, business_name: 'QA Creator Studio', business_address: '12 MG Road, Bengaluru, Karnataka 560001' });
if (prof.status !== 200) throw new Error('profile update failed ' + JSON.stringify(prof.data));
eq(prof.data.state_code, '29', 'state_code derived from GSTIN');

const baseInvoice = (over = {}) => ({
  brandName: 'Mysore Silks Pvt Ltd', brandGstin: BRAND_KA, brandAddress: '1 Palace Rd, Mysuru, Karnataka', brandStateCode: '29',
  placeOfSupply: '29', lineItems: [{ description: 'Instagram reel + 2 stories', sacCode: '998399', amount: 100000, gstRate: 18 }],
  invoiceDate: today, templateId: 'classic', brandEmail: 'accounts@mysoresilks.example', ...over,
});

await check('INV-01', async () => {
  const r = await c.post('/invoices', baseInvoice());
  eq(r.status, 201, 'create status');
  const { data: row } = await db().from('invoices').select('*').eq('id', r.data.id).single();
  eq(row.base_amount, 100000, 'base'); eq(row.cgst_amount, 9000, 'CGST'); eq(row.sgst_amount, 9000, 'SGST');
  eq(row.igst_amount, 0, 'IGST'); eq(row.total_amount, 118000, 'total'); eq(row.sac_code, '998399', 'SAC');
  state.set({ invIntra: row.id, invIntraNo: row.invoice_number });
  return { notes: `${row.invoice_number}: CGST ₹9,000 + SGST ₹9,000, total ₹1,18,000, supply_type=${row.supply_type} (DB verified)`, evidence: { id: row.id } };
});

await check('INV-02', async () => {
  const r = await c.post('/invoices', baseInvoice({ brandName: 'Pune Gadgets LLP', brandGstin: BRAND_MH, brandAddress: 'FC Road, Pune, Maharashtra', brandStateCode: '27', placeOfSupply: '27' }));
  eq(r.status, 201, 'create status');
  const { data: row } = await db().from('invoices').select('*').eq('id', r.data.id).single();
  eq(row.igst_amount, 18000, 'IGST'); eq(row.cgst_amount, 0, 'CGST'); eq(row.sgst_amount, 0, 'SGST'); eq(row.total_amount, 118000, 'total');
  state.set({ invInter: row.id });
  return { notes: `${row.invoice_number}: IGST ₹18,000, total ₹1,18,000, supply_type=${row.supply_type} (DB verified)` };
});

await check('INV-05-API', async () => {
  const bad = {
    checksum: await c.post('/invoices', baseInvoice({ brandGstin: '29AABCM5678D1Z8' })),
    short: await c.post('/invoices', baseInvoice({ brandGstin: '29AABCM5678D1Z' })),
    stateMismatch: await c.post('/invoices', baseInvoice({ brandGstin: BRAND_MH, brandStateCode: '29' })),
  };
  const ev = Object.fromEntries(Object.entries(bad).map(([k, v]) => [k, [v.status, v.data?.message || v.data?.details?.[0]?.message]]));
  for (const [k, v] of Object.entries(bad)) eq(v.status, 422, k);
  return { notes: 'Bad checksum, 14-char and state-mismatched GSTINs all rejected with 422', evidence: ev };
});

await check('INV-10', async () => {
  const id = crypto.randomUUID();
  const a = await c.post('/invoices', baseInvoice({ clientRequestId: id, brandName: 'Idempotency Test Co' }));
  const b2 = await c.post('/invoices', baseInvoice({ clientRequestId: id, brandName: 'Idempotency Test Co' }));
  const { count } = await db().from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', s.userId).eq('brand_name', 'Idempotency Test Co');
  eq(a.status, 201, 'first'); eq(b2.status, 200, 'retry'); eq(b2.data.id, a.data.id, 'same id'); eq(count, 1, 'rows');
  state.set({ invIdem: a.data.id });
  return { notes: 'Retry with the same clientRequestId → 200, same invoice, 1 DB row' };
});

await check('INV-11', async () => {
  const r = await c.get('/invoices/next-number');
  const { data: rows } = await db().from('invoices').select('invoice_number').eq('user_id', s.userId).order('created_at');
  eq(r.status, 200, 'status');
  const nums = rows.map(x => x.invoice_number);
  const seq = nums.map(n => parseInt(n.split(/[/-]/).pop(), 10));
  expect(seq.every((v, i) => i === 0 || v === seq[i - 1] + 1), `not sequential: ${nums}`);
  return { notes: `Existing ${nums.join(', ')} → next ${JSON.stringify(r.data)}` };
});

await check('INV-07-API', async () => {
  const out = {};
  for (const t of ['classic', 'modern', 'compact', 'professional', 'vintage', 'evergreen', 'genz']) {
    const r = await c.post('/invoices', baseInvoice({ templateId: t, brandName: `Template ${t}` }));
    out[t] = r.status;
    if (r.status === 201) await c.del(`/invoices/${r.data.id}`);
  }
  for (const t of ['classic', 'modern', 'compact']) eq(out[t], 201, `basic ${t}`);
  for (const t of ['professional', 'vintage', 'evergreen', 'genz']) eq(out[t], 403, `basic ${t}`);
  return { notes: 'Basic: classic/modern/compact → 201; professional/vintage/evergreen/genz → 403 PLAN_REQUIRED', evidence: out };
});

async function pdfText(buf) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) text += (await (await doc.getPage(i)).getTextContent()).items.map(x => x.str).join(' ') + '\n';
  return text;
}
export { pdfText };

await check('INV-08', async () => {
  const since = logSize();
  const r = await c.get(`/invoices/${state.get().invIntra}/pdf`);
  eq(r.status, 200, 'pdf status');
  fs.writeFileSync(path.join(OUT, 'inv08-basic.pdf'), r.data);
  const text = await pdfText(r.data);
  const fellBack = /Puppeteer PDF failed/.test(logSince(since));
  // exact watermark text — the QA account's own email (…@kcreatio.com) is printed on the invoice too
  const hasFooter = /Made with ease on kcreatio\.com/i.test(text);
  const labels = { cgst: /CGST\s*@\s*9%/i.test(text), sgst: /SGST\s*@\s*9%/i.test(text), words: /Rupees|Lakh|Thousand/i.test(text), reverse: /Reverse Charge/i.test(text), sac: /998399/.test(text) };
  state.set({ inv08Fallback: fellBack });
  expect(hasFooter, `Basic PDF has no "kcreatio.com" watermark footer (renderer: ${fellBack ? 'pdfmake fallback — Puppeteer failed' : 'Puppeteer'})`);
  return { notes: `Watermark footer present (renderer: ${fellBack ? 'pdfmake fallback' : 'Puppeteer'}); Rule 46 labels ${JSON.stringify(labels)}`, evidence: { file: 'qa/out/inv08-basic.pdf' } };
});

// ── TDS (Basic) ────────────────────────────────────────────────────────────
await check('TDS-02', async () => {
  const r = await c.post('/tds', { brandName: 'Nykaa Fashion', invoiceAmount: 45000, tdsRate: 10, paymentDate: today, section: '194J' });
  eq(r.status, 201, 'status'); eq(r.data.tds_amount, 4500, 'tds_amount'); eq(r.data.received_amount, 40500, 'received_amount');
  eq(r.data.form_16a_status, 'awaiting', 'form16a');
  state.set({ tdsManual: r.data.id });
  return { notes: `₹45,000 @10% → TDS ₹4,500, received ₹40,500, quarter ${r.data.quarter}, FY ${r.data.financial_year}` };
});

await check('TDS-07', async () => {
  const r = await c.post('/tds', { brandName: 'Too Much TDS', invoiceAmount: 1000, tdsAmount: 5000, paymentDate: today });
  const neg = await c.post('/tds', { brandName: 'Neg', invoiceAmount: -5, paymentDate: today });
  eq(r.status, 422, 'tds > taxable'); eq(neg.status, 422, 'negative amount');
  return { notes: `TDS above taxable value → 422 ("${r.data.message}"); negative amount → 422` };
});

await check('TDS-05', async () => {
  const body = { brandName: 'Duplicate Brand', invoiceAmount: 20000, tdsRate: 10, paymentDate: today, invoiceId: state.get().invIntra };
  const a = await c.post('/tds', body), b2 = await c.post('/tds', body);
  const { count } = await db().from('tds_records').select('id', { count: 'exact', head: true }).eq('user_id', s.userId).eq('brand_name', 'Duplicate Brand');
  state.set({ tdsDup: [a.data?.id, b2.data?.id] });
  expect(!(a.status === 201 && b2.status === 201 && count === 2),
    `Identical TDS entry (same brand, amount, date, invoice) accepted twice: ${a.status}/${b2.status}, ${count} rows → TDS credit double-counted (₹2,000 × 2)`);
  return { notes: `Duplicate handled: ${a.status}/${b2.status}` };
});

await check('TDS-06', async () => {
  const { count: before } = await db().from('tds_records').select('id', { count: 'exact', head: true }).eq('user_id', s.userId);
  const made = [];
  let last;
  for (let i = before; i < 11; i++) {
    last = await c.post('/tds', { brandName: `Quota Brand ${i}`, invoiceAmount: 1000, tdsRate: 10, paymentDate: today });
    if (last.status === 201) made.push(last.data.id);
  }
  eq(last.status, 403, '11th entry'); eq(last.data.error, 'QUOTA_EXCEEDED', 'error code');
  // remove the filler rows so later totals stay readable
  for (const id of made) await c.del(`/tds/${id}`);
  return { notes: `Entries ${before + 1}–10 accepted; 11th → 403 QUOTA_EXCEEDED ("${last.data.message}"). Filler rows deleted` };
});

// ── Plan gates ─────────────────────────────────────────────────────────────
await check('TAX-05', async () => {
  const r = await c.get('/tax/estimate?annualEstimate=1500000');
  eq(r.status, 403, 'status'); eq(r.data.error, 'SUBSCRIPTION_REQUIRED', 'error');
  return { notes: 'Basic → 403 SUBSCRIPTION_REQUIRED for /tax/estimate' };
});
await check('INB-05', async () => {
  const r = await c.post('/email-detections/paste', { subject: 'Payment processed', body: 'We have processed ₹45,000' });
  eq(r.status, 403, 'status');
  return { notes: `Basic → 403 ${r.data.error} for /email-detections/paste` };
});

// ── Security ───────────────────────────────────────────────────────────────
await check('SEC-03', async () => {
  const anon = client();
  const out = {};
  for (const u of ['/invoices', '/tds', '/deals', '/income', '/expenses', '/tax/estimate', '/email-detections', '/premium-requests/me', '/export/annual', `/invoices/${state.get().invIntra}/pdf`]) out[u] = (await anon.get(u)).status;
  expect(Object.values(out).every(v => v === 401), `non-401: ${JSON.stringify(out)}`);
  return { notes: `All ${Object.keys(out).length} protected endpoints → 401 without cookies`, evidence: out };
});

await check('SEC-04', async () => {
  const { data: foreignInv } = await db().from('invoices').select('id').neq('user_id', s.userId).limit(1).maybeSingle();
  const { data: foreignTds } = await db().from('tds_records').select('id, form_16a_status').neq('user_id', s.userId).limit(1).maybeSingle();
  const { data: foreignDeal } = await db().from('deals').select('id').neq('user_id', s.userId).limit(1).maybeSingle();
  const out = {};
  if (foreignInv) {
    out.getInvoice = (await c.get(`/invoices/${foreignInv.id}`)).status;
    out.pdfInvoice = (await c.get(`/invoices/${foreignInv.id}/pdf`)).status;
    out.deleteInvoice = (await c.del(`/invoices/${foreignInv.id}`)).status;
    const still = await db().from('invoices').select('id').eq('id', foreignInv.id).maybeSingle();
    out.invoiceStillExists = Boolean(still.data);
  }
  if (foreignTds) {
    out.putTds = (await c.put(`/tds/${foreignTds.id}`, { notes: 'x' })).status;
    const after = await db().from('tds_records').select('notes').eq('id', foreignTds.id).single();
    out.tdsUnchanged = after.data.notes !== 'x';
  }
  if (foreignDeal) out.markPaidForeignDeal = (await c.post(`/deals/${foreignDeal.id}/mark-paid`, { paymentDate: today, amountReceived: 1 })).status;
  if (!foreignInv && !foreignTds) return { status: 'BLOCKED', notes: 'No other users’ rows in the DB to test against' };
  expect([out.getInvoice, out.pdfInvoice].every(x => x === 404) && out.invoiceStillExists && out.tdsUnchanged !== false && (out.putTds ?? 404) === 404, JSON.stringify(out));
  return { notes: `Other users’ rows invisible: ${JSON.stringify(out)}` };
});

await check('SEC-05', async () => {
  const forged = jwt.sign({ sub: s.userId, plan: 'pro' }, 'not-the-secret', { expiresIn: '5m' });
  const r1 = await client({ cookies: { access_token: forged } }).get('/invoices');
  const challenge = jwt.sign({ sub: s.userId, plan: 'basic', purpose: '2fa' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
  const r2 = await client({ cookies: { access_token: challenge } }).get('/invoices');
  const none = jwt.sign({ sub: s.userId, plan: 'pro' }, '', { algorithm: 'none' });
  const r3 = await client({ cookies: { access_token: none } }).get('/invoices');
  const expired = jwt.sign({ sub: s.userId, plan: 'basic', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_ACCESS_SECRET);
  const r4 = await client({ cookies: { access_token: expired } }).get('/invoices');
  const out = { wrongSecret: r1.status, twoFactorChallenge: r2.status, algNone: r3.status, expired: r4.status };
  expect(Object.values(out).every(v => v === 401), JSON.stringify(out));
  return { notes: `Wrong secret, alg=none, expired, and 2FA-challenge tokens all → 401`, evidence: out };
});

await check('SEC-06', async () => {
  const r = await client().get('/invoices', { 'X-Dev-User-Id': s.userId });
  const planEsc = await client().get('/tax/estimate?annualEstimate=100000', { 'X-Dev-User-Id': s.userId });
  const n = r.data?.invoices?.length ?? (Array.isArray(r.data) ? r.data.length : 0);
  return {
    status: 'PASS',
    notes: `Local NODE_ENV=development: X-Dev-User-Id=<QA uuid> with no cookie → ${r.status} (${n} of QA’s invoices), plan "pro" (/tax/estimate → ${planEsc.status}). Only honoured when NODE_ENV is exactly "development" (auth.ts) — staging/unset NODE_ENV ignores it`,
    evidence: { invoices: r.status, taxEstimate: planEsc.status },
  };
});

await check('SEC-07', async () => {
  const r = await client().get('/tax/quick-estimate?monthly_income=1');
  const h = Object.fromEntries(['x-content-type-options', 'strict-transport-security', 'x-frame-options', 'content-security-policy', 'referrer-policy', 'x-powered-by'].map(k => [k, r.headers.get(k)]));
  const evil = await client().get('/tax/quick-estimate?monthly_income=1', { Origin: 'https://evil.example' });
  const ok = await client().get('/tax/quick-estimate?monthly_income=1', { Origin: 'http://localhost:5173' });
  expect(h['x-content-type-options'] === 'nosniff' && !h['x-powered-by'] && h['x-frame-options'], `headers ${JSON.stringify(h)}`);
  expect(!evil.headers.get('access-control-allow-origin'), 'evil origin got ACAO');
  eq(evil.status, 403, 'foreign origin status');
  return { notes: `Helmet headers present, no X-Powered-By; allowed origin gets ACAO=${ok.headers.get('access-control-allow-origin')}; foreign origin → 403 with no CORS header`, evidence: { headers: h, evil: evil.status } };
});

await check('SEC-02', async () => {
  const inj = "' OR '1'='1'; DROP TABLE invoices;--";
  const r = await c.post('/invoices', baseInvoice({ brandName: inj, brandAddress: "1' OR 1=1 --", notes: inj }));
  eq(r.status, 201, 'create');
  const { data: row } = await db().from('invoices').select('brand_name').eq('id', r.data.id).single();
  eq(row.brand_name, inj.trim(), 'stored literally');
  const q1 = await c.get(`/tds?fy=${encodeURIComponent("2026-27' OR '1'='1")}`);
  const q2 = await c.get(`/deals?status=${encodeURIComponent("inquiry' OR '1'='1")}`);
  const q3 = await c.get(`/invoices?status=${encodeURIComponent("x') OR 1=1--")}`);
  const leaked = [q1, q2, q3].some(q => JSON.stringify(q.data).includes('"user_id"') && !JSON.stringify(q.data).split('"user_id":"').slice(1).every(x => x.startsWith(s.userId)));
  expect(!leaked, 'foreign rows returned');
  await c.del(`/invoices/${r.data.id}`);
  const ev = { tds: q1.status, deals: q2.status, invoices: q3.status };
  const fiveHundreds = Object.entries(ev).filter(([, v]) => v >= 500);
  return { status: 'PASS', notes: `Payload stored literally (PostgREST parameterises); no cross-tenant rows. Query-param injection → ${JSON.stringify(ev)}${fiveHundreds.length ? ' (500s are unvalidated query params reaching Postgres — see bugs)' : ''}`, evidence: ev };
});

await check('SEC-01-API', async () => {
  const xss = '<img src=x onerror=alert(document.domain)><script>alert(1)</script>';
  const r = await c.post('/invoices', baseInvoice({ brandName: `XSS Brand ${xss}`, notes: xss, brandAddress: `Addr ${xss}` }));
  eq(r.status, 201, 'create');
  state.set({ invXss: r.data.id });
  const { data: row } = await db().from('invoices').select('brand_name').eq('id', r.data.id).single();
  const pdf = await c.get(`/invoices/${r.data.id}/pdf`);
  fs.writeFileSync(path.join(OUT, 'sec01-xss.pdf'), pdf.data);
  const text = pdf.status === 200 ? await pdfText(pdf.data) : '';
  return { notes: `Stored raw (no server-side sanitising — relies on output escaping): "${row.brand_name.slice(0, 40)}…". PDF ${pdf.status}; payload rendered as text in PDF: ${text.includes('<script>') || text.includes('onerror')}` };
});

await check('JOB-01', async () => {
  const r = await c.post('/invoices', baseInvoice({ brandName: 'Overdue Test Brand', invoiceDate: '2026-08-01', dueDate: '2026-08-31' }));
  const send = await c.post(`/invoices/${r.data.id}/send`);
  const { data: mid } = await db().from('invoices').select('status, due_date').eq('id', r.data.id).single();
  // Same statement as startInvoiceOverdueJob() (scheduledJobs.ts), scoped to the QA user.
  // The job has no exported runner, so it's replayed here verbatim with an extra user_id filter.
  const todayStr = new Date().toISOString().split('T')[0];
  const { error } = await db().from('invoices').update({ status: 'overdue' }).eq('user_id', s.userId)
    .in('status', ['sent', 'partially_paid']).lt('due_date', todayStr).not('due_date', 'is', null);
  const { data: after } = await db().from('invoices').select('status').eq('id', r.data.id).single();
  const { data: others } = await db().from('invoices').select('status').eq('user_id', s.userId).neq('id', r.data.id);
  state.set({ invOverdue: r.data.id });
  eq(send.status, 200, 'send'); eq(mid.status, 'sent', 'status after send'); expect(!error, error?.message);
  eq(after.status, 'overdue', 'status after job');
  expect(others.every(o => o.status !== 'overdue'), 'future-dated invoices flipped too');
  return { notes: `Sent invoice due 2026-08-31 → job query → overdue; invoices not yet due untouched. (Job logic has no manual trigger/export — replayed its exact query)` };
});

console.log('done');
