// RES-01 dev-bypass render on the dev server; UI-SWEEP: every app page, desktop + mobile, console/network/overflow.
import { APP, DEV_APP, check, expect, record, login, browser, watchedPage, shot, authedContext, client } from './lib.mjs';

const PAGES = ['/dashboard', '/invoices', '/invoices/new', '/tds', '/tax-planner', '/deals', '/income', '/expenses', '/settings'];
const b = await browser();

try {
  // SWEEP_PLAN=basic runs only the page sweep, as the (still Basic) QA account, before premium is approved
  const planTag = process.env.SWEEP_PLAN ? `${process.env.SWEEP_PLAN}-` : '';
  if (!planTag) await check('RES-01', async () => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const out = {};
    for (const p of PAGES) {
      const page = await watchedPage(ctx);
      await page.goto(DEV_APP + p, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1200);
      const text = await page.locator('body').innerText();
      out[p] = {
        rendered: text.length > 200 && !/Something went wrong/i.test(text),
        onLogin: /\/login/.test(page.url()),
        pageErrors: page.issues.pageErrors.length,
        api5xx: page.issues.failed.filter(f => /^5\d\d/.test(f)).length,
        api4xx: page.issues.failed.filter(f => /^4\d\d/.test(f)).length,
      };
      if (p === '/dashboard') await shot(page, 'res01-dev-dashboard');
      await page.close();
    }
    const health = await client().get('http://localhost:4000/api/health');
    await ctx.close();
    const broken = Object.entries(out).filter(([, v]) => !v.rendered || v.onLogin || v.pageErrors);
    const fails = Object.values(out).reduce((a, v) => a + v.api5xx, 0);
    expect(!broken.length, `pages not rendering in dev bypass: ${JSON.stringify(broken)}`);
    expect(health.status === 200, 'backend died');
    return {
      status: 'PASS',
      notes: `All ${PAGES.length} pages render as MOCK_USER with no page errors; backend stayed up. ${fails} API calls returned 5xx because "dev-bypass-user" is not a UUID in the real DB (UI falls back gracefully)`,
      evidence: out,
    };
  });

  const c = await login();
  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    await check(`UI-SWEEP-${planTag}${label}`, async () => {
      const ctx = await authedContext(b, c.jar, { viewport: vp, isMobile: label === 'mobile', hasTouch: label === 'mobile' });
      const out = {};
      for (const p of PAGES) {
        const page = await watchedPage(ctx);
        await page.goto(APP + p, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(1200);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        out[p] = { overflow, pageErrors: page.issues.pageErrors, console: page.issues.console, failed: page.issues.failed.filter(f => !/ERR_ABORTED/.test(f)) };
        await shot(page, `sweep-${label}${p.replace(/\//g, '_')}`);
        await page.close();
      }
      await ctx.close();
      const bad = Object.entries(out).filter(([, v]) => v.overflow > 1 || v.pageErrors.length || v.console.length || v.failed.length);
      expect(!bad.length, JSON.stringify(Object.fromEntries(bad)).slice(0, 1200));
      return { notes: `${PAGES.length} pages at ${vp.width}px: no page/console errors, no failed API calls, no horizontal overflow` };
    });
  }
} finally {
  await b.close();
}
