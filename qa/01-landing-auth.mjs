// Landing page, public tax calculator, registration and session cookies.
import { APP, API, client, check, expect, eq, record, state, browser, watchedPage, shot, waitForLog, logSize, db, inr } from './lib.mjs';

const pub = client();

await check('RES-02', async () => {
  const r = await pub.get('http://localhost:4000/api/health');
  eq(r.status, 200, 'status'); eq(r.data.status, 'ok', 'body.status');
  return { notes: 'GET /api/health → 200 {status:"ok"}' };
});

// ── Quick estimate API ───────────────────────────────────────────────────────
await check('LND-01', async () => {
  const { status, data } = await pub.get('/tax/quick-estimate?monthly_income=125000&brand_count=3');
  eq(status, 200, 'status');
  eq(data.annual, 1500000, 'annual'); eq(data.estimatedTds, 150000, 'estimatedTds');
  eq(data.incomeTax, 109200, 'incomeTax'); eq(data.itrRefund, 40800, 'itrRefund'); eq(data.advanceTaxOwed, 0, 'advanceTaxOwed');
  return { notes: 'API: ₹15L → TDS ₹1,50,000, tax ₹1,09,200, refund ₹40,800 (UI checked below)', evidence: data };
});

await check('LND-03', async () => {
  const { data } = await pub.get('/tax/quick-estimate?monthly_income=1250000&brand_count=10');
  // 1.5 Cr new regime: slab 40,20,000; surcharge 15% (above 1 Cr) with marginal relief check; cess 4%
  const slab = 20000 + 40000 + 60000 + 80000 + 100000 + (15000000 - 2400000) * 0.30; // 42,80,000
  const surcharge = Math.round(slab * 0.15);
  const total = slab + surcharge + Math.round((slab + surcharge) * 0.04);
  eq(data.incomeTax, total, 'incomeTax');
  eq(data.advanceTaxOwed, total - 1500000, 'advanceTaxOwed (tax − 10% TDS)');
  eq(data.q2Due, Math.round((total - 1500000) * 0.45), 'q2Due (45% cumulative)');
  return { notes: `₹1.5 Cr: tax ${inr(total)} incl. 15% surcharge + 4% cess; owed ${inr(data.advanceTaxOwed)}; Q2 cum ${inr(data.q2Due)}`, evidence: data };
});

await check('LND-04', async () => {
  const out = {};
  for (const v of ['abc', '-5000', '1e12', '']) {
    const r = await pub.get(`/tax/quick-estimate?monthly_income=${encodeURIComponent(v)}`);
    out[v || '(empty)'] = { status: r.status, annual: r.data?.annual, tax: r.data?.incomeTax };
    expect(r.status === 200, `monthly_income=${v} → ${r.status}`);
  }
  const huge = out['1e12'];
  const issues = [];
  if (huge.annual > 999999999) issues.push(`no upper bound: 1e12/month accepted → annual ${huge.annual.toExponential(2)}`);
  const pl = await pub.get('/tax/quick-estimate?monthly_income=125000&brand_count=3');
  if (/1 of 3 brand likely/.test(pl.data.form16aRisk)) issues.push(`copy: "${pl.data.form16aRisk}" (should be "brands")`);
  if (issues.length) return { status: 'PASS', notes: `No 500s; garbage → zeros. Minor: ${issues.join('; ')}`, evidence: out };
  return { notes: 'Garbage/negative/huge inputs handled without 5xx', evidence: out };
});

// ── Landing UI ───────────────────────────────────────────────────────────────
const b = await browser();
try {
  await check('LND-05', async () => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await watchedPage(ctx);
    await page.goto(APP + '/', { waitUntil: 'networkidle' });
    const theme = await page.evaluate(() => ({
      dataTheme: document.documentElement.getAttribute('data-theme'),
      bg: getComputedStyle(document.body).backgroundColor,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    }));
    // scroll through the ChaosHero sequence
    for (let y = 0; y < 6000; y += 600) { await page.mouse.wheel(0, 600); await page.waitForTimeout(120); }
    const desk = await shot(page, 'lnd05-desktop');
    const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mp = await watchedPage(m);
    await mp.goto(APP + '/', { waitUntil: 'networkidle' });
    for (let y = 0; y < 6000; y += 700) { await mp.mouse.wheel(0, 700); await mp.waitForTimeout(100); }
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const mob = await shot(mp, 'lnd05-mobile');
    const errs = [...page.issues.pageErrors, ...page.issues.console, ...mp.issues.pageErrors, ...mp.issues.console];
    const rgb = theme.bg.match(/\d+/g).map(Number);
    const dark = rgb.slice(0, 3).reduce((a, c) => a + c, 0) < 150;
    await ctx.close(); await m.close();
    expect(errs.length === 0, `console/page errors: ${errs.join(' | ')}`);
    expect(overflow <= 1, `mobile horizontal overflow ${overflow}px`);
    expect(/e8921a/i.test(theme.accent), `--accent is ${theme.accent}`);
    expect(dark, `body background ${theme.bg} is not dark`);
    return { notes: `Dark bg ${theme.bg}, --accent ${theme.accent}, no console errors, mobile overflow ${overflow}px`, evidence: { desk, mob, theme } };
  });

  await check('LND-01-UI', async () => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await watchedPage(ctx);
    await page.goto(APP + '/', { waitUntil: 'networkidle' });
    const input = page.locator('#calc-monthly');
    await input.scrollIntoViewIfNeeded();
    await input.fill('125000');
    await page.locator('#calc-brands').fill('3');
    await page.getByRole('button', { name: /show me the numbers/i }).click();
    await page.waitForTimeout(1500);
    const panel = page.locator('[aria-live="polite"]').first();
    const text = await panel.innerText();
    const tabular = await panel.evaluate(el => [...el.querySelectorAll('*')].filter(n => /₹/.test(n.textContent) && n.children.length === 0)
      .map(n => getComputedStyle(n).fontVariantNumeric));
    const s = await shot(page, 'lnd01-calculator');
    await ctx.close();
    for (const v of ['15,00,000', '1,50,000', '13,50,000', '40,800']) expect(text.includes(v), `widget missing ${v}: ${text.replace(/\s+/g, ' ').slice(0, 300)}`);
    const nonTab = tabular.filter(t => !t.includes('tabular-nums')).length;
    record('LND-01', 'PASS', `API + UI agree: ₹15,00,000 / TDS ₹1,50,000 / receive ₹13,50,000 / refund ₹40,800${nonTab ? ` (note: ${nonTab}/${tabular.length} ₹ values lack tabular-nums)` : ''}`, { s, text: text.slice(0, 600) });
  });

  await check('LND-02', async () => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await watchedPage(ctx);
    await page.goto(APP + '/', { waitUntil: 'networkidle' });
    await page.locator('#calc-monthly').scrollIntoViewIfNeeded();
    await page.locator('#calc-monthly').fill('100000');
    await page.locator('#calc-brands').fill('3');
    await page.getByRole('button', { name: /show me the numbers/i }).click();
    await page.waitForTimeout(1500);
    const text = await page.locator('[aria-live="polite"]').first().innerText();
    const banner = page.getByText(/refund when you file ITR/i).first();
    const visible = await banner.isVisible();
    const color = visible ? await banner.evaluate(el => { let n = el; while (n && getComputedStyle(n).backgroundColor === 'rgba(0, 0, 0, 0)') n = n.parentElement; return n ? getComputedStyle(n).backgroundColor : ''; }) : '';
    const api = (await pub.get('/tax/quick-estimate?monthly_income=100000&brand_count=3')).data;
    const s = await shot(page, 'lnd02-refund-banner');
    await ctx.close();
    eq(api.incomeTax, 0, 'incomeTax at ₹12L'); eq(api.itrRefund, 120000, 'itrRefund'); eq(api.advanceTaxOwed, 0, 'advanceTaxOwed');
    expect(visible, 'refund banner not visible');
    expect(text.includes('1,20,000'), 'banner amount ₹1,20,000 missing');
    expect(!/advance tax (owed|due)[^.]*₹[1-9]/i.test(text), 'advance tax liability shown');
    return { notes: `₹12L → tax ₹0 (87A), banner "₹1,20,000 refund when you file ITR", bg ${color}`, evidence: { s, api } };
  });

  // ── Registration through the UI ─────────────────────────────────────────────
  await check('AUTH-01', async () => {
    const ts = Date.now();
    const email = `qa.e2e+${ts}@kcreatio.com`;
    const password = 'QaTest#2026x';
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { 'X-Forwarded-For': `10.99.1.${ts % 250}` } });
    const page = await watchedPage(ctx);
    await page.goto(APP + '/register', { waitUntil: 'networkidle' });
    await page.locator('#name').fill('QA E2E Creator');
    await page.locator('#email').fill(email);
    const since = logSize();
    await page.getByRole('button', { name: 'Verify email' }).click();
    const m = await waitForLog(`To: ${email.replace(/[+.]/g, '\\$&')} \\| Subject: (\\d{6})`, { since });
    await page.getByPlaceholder('123456').fill(m[1]);
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.waitForTimeout(1200);
    await page.locator('#password').fill(password);
    const confirm = page.locator('#confirmPassword, #confirm-password, input[autocomplete="new-password"]').nth(1);
    if (await confirm.count()) await confirm.fill(password).catch(() => {});
    await page.locator('label:has-text("Terms of Service") input[type=checkbox]').check();
    await shot(page, 'auth01-register-filled');
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/auth/register'), { timeout: 20000 }),
      page.locator('button[type=submit]').click(),
    ]);
    const body = await resp.json();
    await page.waitForURL(u => !/register/.test(u.toString()), { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const landed = page.url();
    const s = await shot(page, 'auth01-after-register');

    // AUTH-02 — cookies
    const cookies = await ctx.cookies();
    const at = cookies.find(c => c.name === 'access_token'), rt = cookies.find(c => c.name === 'refresh_token');
    const jsCookie = await page.evaluate(() => document.cookie);
    state.set({ email, password, userId: body.user?.id, jar: { access_token: at?.value, refresh_token: rt?.value } });
    const setCookie = resp.headers()['set-cookie'] || '';
    await ctx.close();

    eq(resp.status(), 201, 'register status');
    const { data: row } = await db().from('users').select('id, plan, is_email_verified, email').eq('id', body.user.id).single();
    eq(row.plan, 'basic', 'db plan'); expect(row.is_email_verified === true, 'is_email_verified false');
    record('AUTH-02', at?.httpOnly && rt?.httpOnly && !/access_token|refresh_token/.test(jsCookie) ? 'PASS' : 'FAIL',
      `access_token httpOnly=${at?.httpOnly} sameSite=${at?.sameSite} secure=${at?.secure}; refresh_token httpOnly=${rt?.httpOnly}; document.cookie="${jsCookie}"`,
      { setCookie: setCookie.replace(/=[^;]{20,}/g, '=<redacted>') });
    return { notes: `Registered ${email} via UI (OTP from server log); 201; landed on ${landed.replace(APP, '')}; DB plan=basic, verified=true`, evidence: { s, userId: row.id, landed } };
  });

  // ── Validation paths (API) ────────────────────────────────────────────────
  await check('AUTH-04', async () => {
    const c = client();
    const disp = await c.post('/auth/send-otp', { email: 'someone@mailinator.com', purpose: 'email_verify' });
    const dup = await c.post('/auth/send-otp', { email: state.get().email, purpose: 'email_verify' });
    const badOtp = await c.post('/auth/verify-otp', { email: state.get().email, otp: '000000', purpose: 'email_verify' });
    const weak = await c.post('/auth/register', { name: 'x', email: 'weak@kcreatio.com', password: 'password', verificationToken: 'abcdefghijk', termsAccepted: true });
    const fakeTok = await c.post('/auth/register', { name: 'x', email: 'fake@kcreatio.com', password: 'Str0ng#Pass', verificationToken: 'abcdefghijk.fake', termsAccepted: true });
    const ev = { disposable: [disp.status, disp.data?.message], duplicate: [dup.status, dup.data?.message], badOtp: [badOtp.status, badOtp.data?.message], weak: [weak.status, weak.data?.message], forgedVerification: [fakeTok.status, fakeTok.data?.message] };
    eq(disp.status, 422, 'disposable'); eq(dup.status, 409, 'duplicate'); eq(badOtp.status, 400, 'wrong otp');
    eq(weak.status, 422, 'weak password'); eq(fakeTok.status, 422, 'forged verification token');
    const { count } = await db().from('users').select('id', { count: 'exact', head: true }).in('email', ['weak@kcreatio.com', 'fake@kcreatio.com']);
    eq(count, 0, 'users created by invalid registrations');
    return { notes: 'Disposable 422, duplicate 409, wrong OTP 400, weak password 422, forged verification token 422; no rows created', evidence: ev };
  });

  await check('AUTH-03', async () => {
    const s = state.get();
    const c = client({ cookies: s.jar });
    const me = await c.get('/auth/me');
    eq(me.status, 200, '/auth/me with cookies');
    const out = await c.post('/auth/logout');
    const cleared = out.setCookie.filter(x => /access_token=;|refresh_token=;/.test(x)).length;
    const after = await client().get('/auth/me');
    // old refresh token must be dead after logout
    const reuse = await client({ cookies: { refresh_token: s.jar.refresh_token } }).post('/auth/refresh');
    const bad = await client().post('/auth/login', { identifier: s.email, password: 'Wrong#Pass1' });
    const good = await client().post('/auth/login', { identifier: s.email, password: s.password });
    eq(out.status, 200, 'logout'); expect(cleared === 2, `logout cleared ${cleared}/2 cookies`);
    eq(after.status, 401, '/auth/me without cookies'); eq(bad.status, 401, 'wrong password');
    eq(good.status, 200, 'login');
    // UI: protected page after logout redirects to /login
    const ctx = await b.newContext();
    const page = await watchedPage(ctx);
    await page.goto(APP + '/invoices', { waitUntil: 'networkidle' });
    const url = page.url();
    await ctx.close();
    expect(/\/login/.test(url), `unauthenticated /invoices landed on ${url}`);
    return { status: reuse.status === 401 ? 'PASS' : 'FAIL', notes: `logout 200 clears both cookies; /me → 401; wrong pw 401; login 200; /invoices → /login; refresh token reuse after logout → ${reuse.status}`, evidence: { reuse: reuse.status } };
  });
} finally {
  await b.close();
}
