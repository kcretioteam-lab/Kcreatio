// TDS page + Brand deal CRM: pipeline, pre-fill, mark paid → income/TDS, stale badge, delete.
import { APP, check, expect, eq, record, state, db, login, browser, watchedPage, shot, authedContext, inr } from './lib.mjs';

const s = state.get();
const c = await login();
const b = await browser();
const ctx = await authedContext(b, c.jar);
const today = new Date().toISOString().slice(0, 10);
const fy = (() => { const d = new Date(); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${String(y + 1).slice(2)}`; })();

async function openDeal(page, name) {
  await page.goto(APP + '/deals', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.getByText(name, { exact: true }).first().click();
  await page.waitForTimeout(500);
}

try {
  const page = await watchedPage(ctx);

  // ── Deal pipeline via UI ───────────────────────────────────────────────────
  await check('DEAL-01', async () => {
    await page.goto(APP + '/deals', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /New Deal/ }).first().click();
    await page.locator('#deal-brand').fill('Pipeline Brand Co');
    await page.locator('#deal-email').pressSequentially('collab@pipelinebrand.example', { delay: 5 });
    await page.locator('#deal-value').pressSequentially('75000', { delay: 5 });
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.request().method() === 'POST' && /\/deals$/.test(r.url())),
      page.getByRole('button', { name: 'Create Deal' }).click(),
    ]);
    const deal = await resp.json();
    state.set({ dealPipe: deal.id });
    const path = ['inquiry'];
    for (const next of ['Negotiating', 'Active', 'Delivered']) {
      await openDeal(page, 'Pipeline Brand Co');
      const [r] = await Promise.all([
        page.waitForResponse(x => x.request().method() === 'PUT' && x.url().includes(`/deals/${deal.id}`)),
        page.getByRole('button', { name: new RegExp(`Move to ${next}`) }).click(),
      ]);
      path.push(`${next.toLowerCase()}(${r.status()})`);
    }
    await page.goto(APP + '/deals', { waitUntil: 'networkidle' });
    const sh = await shot(page, 'deal01-kanban');
    const { data: row } = await db().from('deals').select('status').eq('id', deal.id).single();
    eq(resp.status(), 201, 'create'); eq(row.status, 'delivered', 'DB status');
    const drag = await page.locator('[draggable="true"]').count();
    return { notes: `UI: created ₹75,000 deal, moved ${path.join(' → ')}; DB status delivered. No drag-and-drop on the Kanban (${drag} draggable cards) — stages advance via "Move to …" in the deal panel; Invoiced is set by creating an invoice and Paid only via Mark paid`, evidence: { sh } };
  });

  await check('DEAL-02', async () => {
    const r = await c.put(`/deals/${state.get().dealPipe}`, { status: 'paid' });
    eq(r.status, 422, 'status'); eq(r.data.error, 'USE_MARK_PAID', 'error');
    return { notes: 'PUT {status:"paid"} → 422 USE_MARK_PAID' };
  });

  await check('DEAL-04', async () => {
    await openDeal(page, 'Pipeline Brand Co');
    await page.getByRole('button', { name: /Create invoice/ }).click();
    await page.waitForURL(/\/invoices\/new/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    const url = page.url();
    const vals = {
      brandName: await page.locator('#brandName').inputValue(),
      brandEmail: await page.locator('#brandEmail').inputValue(),
      amount: await page.locator('input[placeholder="45000"]').first().inputValue(),
      sac: await page.locator('input[placeholder="998399"]').first().inputValue(),
    };
    const sh = await shot(page, 'deal04-prefill');
    eq(vals.brandName, 'Pipeline Brand Co', 'brand name'); eq(vals.brandEmail, 'collab@pipelinebrand.example', 'brand email');
    expect(Number(vals.amount.replace(/[^\d.]/g, '')) === 75000, `amount ${vals.amount}`); eq(vals.sac, '998399', 'SAC');
    return { notes: `"Create invoice" → ${url.replace(APP, '')}; pre-filled ${JSON.stringify(vals)}`, evidence: { sh } };
  });

  await check('DEAL-05', async () => {
    await page.locator('#brandGstin').pressSequentially('29AABCM5678D1Z9', { delay: 5 });
    await page.locator('#brandAddress').fill('3 Lavelle Rd, Bengaluru, Karnataka 560001');
    await page.locator('#brandState').selectOption('29');
    await page.locator('#placeOfSupply').selectOption('29').catch(() => {});
    await page.waitForTimeout(400);
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/v1\/invoices$/.test(r.url()), { timeout: 20000 }),
      page.getByRole('button', { name: /^Save$/ }).click(),
    ]);
    const inv = await resp.json();
    const { data: d } = await db().from('deals').select('status').eq('id', state.get().dealPipe).single();
    eq(resp.status(), 201, `save ${JSON.stringify(inv).slice(0, 200)}`); eq(inv.deal_id, state.get().dealPipe, 'invoice.deal_id');
    eq(d.status, 'invoiced', 'deal status');
    state.set({ invFromDeal: inv.id });
    return { notes: `Invoice ${inv.invoice_number} (₹${inv.total_amount}) linked to deal; deal → invoiced (DB)` };
  });

  // ── Mark paid: income + TDS ────────────────────────────────────────────────
  await check('TDS-01', async () => {
    const d = await c.post('/deals', { brandName: 'TDS Flow Brand', dealValue: 50000, status: 'delivered' });
    state.set({ dealTds: d.data.id });
    await openDeal(page, 'TDS Flow Brand');
    await page.getByRole('button', { name: /Mark paid \+ log income/ }).click();
    await page.waitForTimeout(500);
    const suggestedTds = await page.locator('#mp-tds').inputValue();
    const suggestedRecv = await page.locator('#mp-received').inputValue();
    await page.locator('#mp-received').fill('');
    await page.locator('#mp-received').pressSequentially('45000', { delay: 5 });
    const sh1 = await shot(page, 'tds01-markpaid-dialog');
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/deals/${d.data.id}/mark-paid`)),
      page.locator('form button[type=submit]').last().click(),
    ]);
    const body = JSON.parse(resp.request().postData());
    await page.waitForTimeout(800);
    const { data: inc } = await db().from('income').select('amount, financial_year').eq('deal_id', d.data.id);
    const { data: tds } = await db().from('tds_records').select('tds_amount, invoice_amount, received_amount, form_16a_status, section').eq('deal_id', d.data.id);
    const { data: deal } = await db().from('deals').select('status').eq('id', d.data.id).single();
    eq(resp.status(), 200, 'mark-paid'); eq(deal.status, 'paid', 'deal status');
    eq(inc.length, 1, 'income rows'); eq(inc[0].amount, 50000, 'income = taxable value');
    eq(tds.length, 1, 'tds rows'); eq(tds[0].tds_amount, 5000, 'tds_amount');
    eq(tds[0].form_16a_status, 'awaiting', 'form16a');
    return { notes: `Dialog suggested TDS ₹${suggestedTds}, received ₹${suggestedRecv}; sent ${JSON.stringify(body)} → 200. DB: income ₹50,000 (taxable value, FY ${inc[0].financial_year}); TDS ₹5,000 "awaiting", section ${tds[0].section}; deal paid`, evidence: { sh1 } };
  });

  await check('DEAL-03', async () => {
    const again = await c.post(`/deals/${state.get().dealTds}/mark-paid`, { paymentDate: today, amountReceived: 45000, tdsDeducted: 5000 });
    const { count } = await db().from('income').select('id', { count: 'exact', head: true }).eq('deal_id', state.get().dealTds);
    eq(again.status, 409, 'second mark-paid'); eq(count, 1, 'income rows');
    return { notes: 'Second mark-paid → 409 ALREADY_PAID; still one income row' };
  });

  await check('DEAL-06', async () => {
    const d = await c.post('/deals', { brandName: 'Stale Deal Brand', dealValue: 20000, status: 'negotiating' });
    // Fixture: age the deal 20 days (only the QA user's row)
    const old = new Date(Date.now() - 20 * 86400000).toISOString();
    await db().from('deals').update({ updated_at: old, created_at: old }).eq('id', d.data.id).eq('user_id', s.userId);
    await page.goto(APP + '/deals', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const card = page.getByText('Stale Deal Brand').first().locator('xpath=ancestor::*[self::div or self::button][2]');
    const txt = await card.innerText();
    const sh = await shot(page, 'deal06-stale');
    expect(/\b20d in stage/.test(txt), `no stale badge on card: ${txt}`);
    return { status: 'PASS', notes: `Card shows "20d in stage" badge (client-side, >14 days). NOTE: README's scheduled "deal stale alert" nudge has no backend job — only this badge exists`, evidence: { sh } };
  });

  // ── TDS page ──────────────────────────────────────────────────────────────
  await check('TDS-04', async () => {
    await page.goto(APP + '/tds', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    const { data: rows } = await db().from('tds_records').select('tds_amount').eq('user_id', s.userId).eq('financial_year', fy);
    const total = rows.reduce((a, r) => a + Number(r.tds_amount), 0);
    const sh = await shot(page, 'tds04-banner');
    const shown = inr(total);
    expect(body.includes(`${shown} claimable at ITR`) || body.includes(`${shown}.00 claimable at ITR`), `banner doesn't show ${shown}: ${body.match(/[^\n]*claimable at ITR[^\n]*/)?.[0]}`);
    expect(/Collect Form 16A/i.test(body), 'Form 16A reminder missing');
    return { notes: `Banner "${body.match(/[^\n]*claimable at ITR[^\n]*/)[0]}" = DB sum of ${rows.length} FY ${fy} rows (${shown}) + "Collect Form 16A…" reminder`, evidence: { sh } };
  });

  await check('DEAL-07', async () => {
    const id = state.get().dealTds;
    const del = await c.del(`/deals/${id}`);
    const { data: inc } = await db().from('income').select('id').eq('user_id', s.userId).eq('description', 'x').limit(0);
    const { count: incomeLeft } = await db().from('income').select('id', { count: 'exact', head: true }).eq('deal_id', id);
    const { data: orphan } = await db().from('tds_records').select('id, tds_amount, deal_id, brand_name').eq('user_id', s.userId).eq('brand_name', 'TDS Flow Brand');
    const summary = (await c.get('/tds/summary')).data;
    expect([200, 204].includes(del.status), `delete ${del.status}`);
    expect(!orphan.length, `Deleting a paid deal removed its income (${incomeLeft} left) but left ${orphan.length} TDS row(s) (₹${orphan.map(o => o.tds_amount)}; deal_id now ${orphan[0]?.deal_id}) — still counted in the TDS banner/summary (total ₹${summary.totalDeducted}) and ITR credit`);
    return { notes: 'Income and TDS removed together' };
  });

  const issues = page.issues;
  record('UI-CONSOLE-DEALS-TDS', issues.pageErrors.length || issues.console.length ? 'FAIL' : 'PASS',
    `Deals/TDS session: ${issues.pageErrors.length} page errors, ${issues.console.length} console errors; failed API calls ${JSON.stringify(issues.failed)}`, issues);
} finally {
  await b.close();
}
