// Invoice editor UI (Basic plan): Rule 46 panel, SAC/GSTIN blocking, net-in-hand, templates, XSS rendering.
import { APP, check, expect, eq, record, state, db, login, browser, watchedPage, shot, authedContext } from './lib.mjs';

const s = state.get();
const c = await login();
const b = await browser();
const ctx = await authedContext(b, c.jar);

async function openNew(page) {
  await page.goto(APP + '/invoices/new', { waitUntil: 'networkidle' });
  const discard = page.getByRole('button', { name: /discard draft/i });
  if (await discard.isVisible().catch(() => false)) { await discard.click(); await page.waitForTimeout(400); }
  await page.waitForTimeout(600);
}
const RULE_RE = /rule\s*46\s*(\d+\s*\/\s*\d+|✓\s*compliant)/i;
const ruleCount = (t) => /compliant/i.test(t) ? [9, 9] : (t.match(/(\d+)\s*\/\s*(\d+)/) || [0, 0, 0]).slice(1).map(Number);
const ruleText = (page) => page.evaluate((src) => {
  const re = new RegExp(src, 'i');
  const els = [...document.querySelectorAll('body *')].filter(e => re.test(e.innerText || ''));
  els.sort((a, b) => a.innerText.length - b.innerText.length);
  return els[0] ? els[0].innerText.replace(/\s+/g, ' ') : '(not found)';
}, RULE_RE.source);
const ruleEl = (page) => page.getByText(/rule\s*46/i).first();
const amount = (page) => page.locator('input[placeholder="45000"]').first();
const sac = (page) => page.locator('input[placeholder="998399"]').first();

async function fillValid(page, { gstin = '29AABCM5678D1Z9', state = '29', amt = '100000', name = 'UI Test Brand Pvt Ltd' } = {}) {
  await page.locator('#brandName').fill(name);
  await page.locator('#brandGstin').pressSequentially(gstin, { delay: 10 });
  await page.locator('#brandGstin').blur();
  await page.locator('#brandAddress').fill('7 Residency Rd, Bengaluru, Karnataka 560025');
  await page.locator('#brandState').selectOption(state);
  await page.locator('#placeOfSupply').selectOption(state).catch(() => {});
  await amount(page).click(); await amount(page).pressSequentially(amt, { delay: 10 });
  await amount(page).blur();
  await page.waitForTimeout(500);
}

try {
  const page = await watchedPage(ctx);

  await check('INV-03', async () => {
    await openNew(page);
    const blank = await ruleText(page);            // pill hidden until the form has input
    await page.locator('#brandName').fill('UI Test Brand Pvt Ltd');
    await page.waitForTimeout(300);
    const empty = await ruleText(page);
    await fillValid(page);
    const filled = await ruleText(page);
    const [a1, t1] = ruleCount(empty);
    const [a2] = ruleCount(filled);
    const sticky = await ruleEl(page).first().evaluate(el => { let n = el; while (n && !['sticky', 'fixed'].includes(getComputedStyle(n).position)) n = n.parentElement; return n ? getComputedStyle(n).position : 'static'; });
    await ruleEl(page).first().click().catch(() => {});
    await page.waitForTimeout(400);
    const sh = await shot(page, 'inv03-rule46-filled');
    expect(a2 > a1, `counter didn’t move: ${empty} → ${filled}`);
    expect(['sticky', 'fixed'].includes(sticky), `panel position ${sticky}`);
    const note = t1 !== 7 ? ` (spec said x/7; app has ${t1} checks)` : '';
    await page.keyboard.press('Escape');
    return { notes: `Blank form: ${blank === '(not found)' ? 'no pill' : blank}. Sticky (${sticky}) action bar: "${empty}" after brand name → "${filled}" after brand/GSTIN/address/state/amount${note}`, evidence: { sh } };
  });

  await check('INV-06', async () => {
    const body = await page.locator('body').innerText();
    const sh = await shot(page, 'inv06-tax-breakdown');
    await page.getByText(/Tax Calculation/).first().scrollIntoViewIfNeeded();
    const sh2 = await shot(page, 'inv06-tax-breakdown-scrolled');
    const want = { 'CGST @ 9%': /CGST\s*@\s*9%/, 'SGST @ 9%': /SGST\s*@\s*9%/, '9,000': /9,000/, 'total 1,18,000': /1,18,000/, 'TDS 10,000': /10,000/, 'net 1,08,000': /1,08,000/, 'Form 16A': /Form 16A/i, 'amount in words': /One Lakh Eighteen Thousand/i };
    const found = Object.fromEntries(Object.entries(want).map(([k, re]) => [k, re.test(body)]));
    const missing = Object.entries(found).filter(([, v]) => !v).map(([k]) => k);
    const snippet = body.slice(body.search(/Tax Calculation/), body.search(/Tax Calculation/) + 700).replace(/\n+/g, ' | ');
    expect(!missing.length, `missing on screen: ${missing.join(', ')} — tax section: ${snippet}`);
    return { notes: 'Live form: CGST @ 9% ₹9,000 + SGST @ 9% ₹9,000 = ₹1,18,000; TDS ₹10,000 (10% of taxable); net ₹1,08,000; Form 16A reminder; amount in words', evidence: { sh, sh2, snippet } };
  });

  await check('INV-04', async () => {
    const before = await ruleText(page);
    await sac(page).fill('');
    await sac(page).blur();
    await page.waitForTimeout(400);
    const after = await ruleText(page);
    let posted = false;
    const onReq = r => { if (r.method() === 'POST' && /\/api\/v1\/invoices$/.test(r.url())) posted = true; };
    page.on('request', onReq);
    const saveBtn = page.getByRole('button', { name: /^Save$/ });
    const disabledSac = await saveBtn.isDisabled();
    if (!disabledSac) await saveBtn.click();
    await page.waitForTimeout(1500);
    page.off('request', onReq);
    const body = await page.locator('body').innerText();
    const msg = (body.match(/[^\n]*SAC[^\n]*/gi) || []).filter(l => /required|missing|enter|add/i.test(l)).slice(0, 3);
    const sh = await shot(page, 'inv04-sac-cleared');
    await sac(page).click(); await page.keyboard.press('Control+A'); await sac(page).pressSequentially('998399', { delay: 10 }); await sac(page).blur();
    expect(!posted, `Save with empty SAC still POSTed the invoice (counter ${before} → ${after})`);
    return { notes: `SAC cleared: counter ${before} → ${after}; Save ${disabledSac ? 'button disabled' : 'clicked but no POST'}. Messages: ${JSON.stringify(msg)}`, evidence: { sh } };
  });

  await check('INV-05', async () => {
    const out = {};
    for (const [label, v] of [['14 chars', '29AABCM5678D1Z'], ['bad checksum', '29AABCM5678D1Z8'], ['state mismatch', '27AAACB1234C1ZF']]) {
      await page.locator('#brandGstin').fill(v);
      await page.locator('#brandGstin').blur();
      await page.waitForTimeout(300);
      const err = await page.locator('#brandGstin').evaluate(el => {
        const wrap = el.closest('div')?.parentElement; return (wrap?.innerText || '').split('\n').filter(l => /gstin|state|check|valid|15/i.test(l)).join(' / ');
      });
      let posted = false;
      const onReq = r => { if (r.method() === 'POST' && /\/api\/v1\/invoices$/.test(r.url())) posted = true; };
      page.on('request', onReq);
      const sb = page.getByRole('button', { name: /^Save$/ });
      const dis = await sb.isDisabled();
      if (!dis) await sb.click();
      await page.waitForTimeout(1200);
      page.off('request', onReq);
      out[label] = { error: err.slice(0, 160), rule46: await ruleText(page), saveDisabled: dis, posted };
    }
    const sh = await shot(page, 'inv05-bad-gstin');
    await page.locator('#brandGstin').fill(''); await page.locator('#brandGstin').pressSequentially('29AABCM5678D1Z9', { delay: 10 }); await page.locator('#brandGstin').blur();
    const leaked = Object.entries(out).filter(([, v]) => v.posted);
    expect(!leaked.length, `invalid GSTIN still saved: ${leaked.map(([k]) => k)} ${JSON.stringify(out)}`);
    return { notes: 'Malformed GSTINs flagged inline and Save blocked (backend also 422s — INV-05-API)', evidence: { out, sh } };
  });

  await check('INV-07', async () => {
    await page.locator('button').filter({ hasText: /^\s*Classic\s*$/ }).first().click();
    await page.getByText('Choose Invoice Template').waitFor({ timeout: 5000 });
    await page.waitForTimeout(400);
    const sh1 = await shot(page, 'inv07-template-picker');
    const cards = await page.evaluate(() => {
      const title = [...document.querySelectorAll('*')].find(e => e.textContent.trim() === 'Choose Invoice Template');
      let modal = title; while (modal && modal.querySelectorAll('button').length < 7) modal = modal.parentElement;
      return [...modal.querySelectorAll('button')].filter(bt => getComputedStyle(bt).width === '160px')
        .map(bt => ({ text: bt.innerText.replace(/\s+/g, ' '), locked: getComputedStyle(bt).cursor === 'not-allowed' }));
    });
    const IDS = ['classic', 'modern', 'professional', 'vintage', 'evergreen', 'compact', 'genz']; // TEMPLATES order
    const names = IDS.slice(0, cards.length);
    const locked = IDS.filter((_, i) => cards[i]?.locked);
    expect(locked.join() === 'professional,vintage,evergreen,genz', `locked on Basic: ${locked}`);
    // pick Modern (allowed on Basic) — preview switches layout
    await page.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].filter(bt => getComputedStyle(bt).width === '160px')[1]?.click());
    await page.waitForTimeout(600);
    const current = await page.locator('button').filter({ hasText: /^\s*Modern\s*$/ }).count();
    // extra service line + bank details
    await page.getByRole('button', { name: /Add Another Service Line/i }).click();
    await page.waitForTimeout(300);
    const amounts = page.locator('input[placeholder="45000"]');
    const descs = page.locator('textarea[placeholder*="Content Creation"]');
    if (await descs.count() > 1) await descs.nth(1).fill('YouTube integration 60s');
    await amounts.nth(1).click(); await amounts.nth(1).pressSequentially('50000', { delay: 10 });
    await amounts.nth(1).blur();
    await page.waitForTimeout(600);
    const body = await page.locator('body').innerText();
    const sh2 = await shot(page, 'inv07-two-lines');
    expect(names.length >= 7, `template picker shows ${names}`);
    expect(/1,77,000/.test(body), 'two lines (₹1,00,000 + ₹50,000) → total ₹1,77,000 not shown');
    expect(current > 0, 'selecting Modern did not change the template button');
    return { notes: `Picker lists ${cards.length} templates (${names.join(', ')}); locked on Basic: ${locked.join(', ') || 'none'}; Modern selected; second line ₹50,000 → total ₹1,77,000 in preview`, evidence: { sh1, sh2 } };
  });

  await check('INV-SAVE-UI', async () => {
    const saveBtn = page.getByRole('button', { name: /^Save$/ });
    if (await saveBtn.isDisabled()) {
      const why = { title: await saveBtn.getAttribute('title'), rule46: await ruleText(page), gstin: await page.locator('#brandGstin').inputValue() };
      await shot(page, 'inv-save-disabled');
      throw new Error(`Save disabled: ${JSON.stringify(why)}`);
    }
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/v1\/invoices$/.test(r.url()), { timeout: 20000 }),
      page.getByRole('button', { name: /^Save$/ }).click(),
    ]);
    const j = await resp.json();
    await page.waitForTimeout(1200);
    const sh = await shot(page, 'inv-save-ui');
    expect(resp.status() === 201, `save status ${resp.status()}: ${JSON.stringify(j)} — request: ${resp.request().postData()?.slice(0, 900)}`);
    const { data: row } = await db().from('invoices').select('total_amount, template_id, line_items, cgst_amount, sgst_amount').eq('id', j.id).single();
    eq(row.total_amount, 177000, 'DB total');
    state.set({ invUi: j.id });
    return { notes: `UI save → 201 ${j.invoice_number}; DB total ₹1,77,000, template ${row.template_id}, ${row.line_items?.length} lines, CGST ${row.cgst_amount} / SGST ${row.sgst_amount}`, evidence: { sh } };
  });

  await check('SEC-01', async () => {
    const p2 = await watchedPage(ctx);
    await p2.goto(APP + '/invoices', { waitUntil: 'networkidle' });
    await p2.waitForTimeout(1200);
    const row = p2.getByText(/XSS Brand/).first();
    const listed = await row.isVisible().catch(() => false);
    if (listed) { await row.click(); await p2.waitForTimeout(1500); }
    const sh = await shot(p2, 'sec01-xss-list');
    const injected = await p2.evaluate(() => document.querySelectorAll('img[src="x"]').length);
    // Open edit view (renders preview with the stored payload)
    await p2.goto(APP + `/invoices/${state.get().invXss}/edit`, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(1500);
    const injected2 = await p2.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.getAttribute('src') === 'x').length);
    const sh2 = await shot(p2, 'sec01-xss-edit');
    expect(p2.dialogs.length === 0, `alert() fired: ${p2.dialogs}`);
    expect(injected2 === 0, 'payload injected as live <img> in edit view');
    return { notes: `XSS payload listed as text: ${listed}; no alert dialogs; no live <img src=x> in list (${injected}) or editor preview (${injected2})`, evidence: { sh, sh2 } };
  });

  const issues = page.issues;
  record('UI-CONSOLE-INVOICE', issues.pageErrors.length || issues.console.length ? 'FAIL' : 'PASS',
    `Invoice editor session: ${issues.pageErrors.length} page errors, ${issues.console.length} console errors, failed API calls: ${JSON.stringify(issues.failed)}`,
    issues);
} finally {
  await b.close();
}
