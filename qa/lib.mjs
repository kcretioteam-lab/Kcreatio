// Shared helpers for the Kcreatio E2E suite. See ../TEST_PLAN.md.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

export const API = 'http://localhost:4000/api/v1';
export const APP = 'http://localhost:5174';      // production build, real auth
export const DEV_APP = 'http://localhost:5173';  // dev server, dev bypass
export const BACKEND_LOG = process.env.BACKEND_LOG;
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
export const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });

// ── Results ─────────────────────────────────────────────────────────────────
const RESULTS = path.join(OUT, 'results.json');
export function record(id, status, notes, evidence = {}) {
  const all = fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, 'utf8')) : {};
  all[id] = { status, notes, evidence, at: new Date().toISOString() };
  fs.writeFileSync(RESULTS, JSON.stringify(all, null, 2));
  console.log(`${status.padEnd(7)} ${id}  ${notes}`);
}

// Run a check; an assertion failure becomes FAIL, anything unexpected becomes FAIL with the error.
export async function check(id, fn) {
  if ((process.env.SKIP || '').split(',').includes(id)) return;
  try {
    const r = await fn();
    if (r) record(id, r.status || 'PASS', r.notes || '', r.evidence);
  } catch (e) {
    record(id, 'FAIL', e.message, { stack: String(e.stack).split('\n').slice(0, 4).join('\n') });
  }
}

export function expect(cond, msg) { if (!cond) throw new Error(msg); }
export const eq = (a, b, what) => expect(Number(a) === Number(b) || a === b, `${what}: expected ${b}, got ${a}`);

// ── State shared between steps (QA account etc.) ────────────────────────────
const STATE = path.join(OUT, 'state.json');
export const state = {
  get: () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {}),
  set: (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...state.get(), ...patch }, null, 2)),
};

// ── API client with a cookie jar. Each client gets its own X-Forwarded-For so the
// per-IP rate limiter (150/15 min) doesn't throttle the suite.
let ipSeq = Math.floor(Math.random() * 200);
export function client({ cookies = {} } = {}) {
  const jar = { ...cookies };
  const ip = `10.77.${Math.floor(Math.random() * 250)}.${(ipSeq++ % 250) + 1}`;
  async function call(method, url, body, headers = {}) {
    const res = await fetch(url.startsWith('http') ? url : API + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
        Origin: APP,
        ...(Object.keys(jar).length ? { Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (v === '' || /Expires=Thu, 01 Jan 1970/i.test(c)) delete jar[k]; else jar[k] = v;
    }
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json().catch(() => null)
      : type.includes('pdf') ? Buffer.from(await res.arrayBuffer()) : await res.text();
    return { status: res.status, data, headers: res.headers, setCookie: res.headers.getSetCookie?.() || [] };
  }
  return {
    jar, ip,
    get: (u, h) => call('GET', u, undefined, h),
    post: (u, b, h) => call('POST', u, b ?? {}, h),
    put: (u, b, h) => call('PUT', u, b ?? {}, h),
    del: (u, h) => call('DELETE', u, undefined, h),
  };
}

// ── Read-only DB access with the backend's service-role client (verification only).
let _db;
export function db() {
  if (_db) return _db;
  const req = createRequire(path.join(HERE, '../backend/package.json'));
  req('dotenv').config({ path: path.join(HERE, '../backend/.env') });
  const { createClient } = req('@supabase/supabase-js');
  _db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  return _db;
}

// ── Backend log scraping (OTPs and approve links are logged when Resend isn't configured)
export async function waitForLog(regex, { since = 0, timeout = 15000 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const text = fs.readFileSync(BACKEND_LOG, 'utf8').slice(since);
    const m = [...text.matchAll(new RegExp(regex, 'g'))].pop();
    if (m) return m;
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for backend log /${regex}/`);
}
export const logSize = () => fs.statSync(BACKEND_LOG).size;
export const logSince = (since) => fs.readFileSync(BACKEND_LOG, 'utf8').slice(since);

// ── Browser ─────────────────────────────────────────────────────────────────
export async function browser() {
  return chromium.launch({ headless: true });
}

// A page that collects console errors, page errors and failed requests.
export async function watchedPage(context) {
  const page = await context.newPage();
  const issues = { console: [], pageErrors: [], failed: [] };
  page.on('console', m => { if (m.type() === 'error') issues.console.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => issues.pageErrors.push(String(e.message).slice(0, 300)));
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) issues.failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
  page.on('requestfailed', r => { if (!/google|fonts|analytics/.test(r.url())) issues.failed.push(`FAILED ${r.url()} ${r.failure()?.errorText}`); });
  page.issues = issues;
  page.dialogs = [];
  page.on('dialog', d => { page.dialogs.push(d.message()); d.dismiss().catch(() => {}); });
  return page;
}

export async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return `qa/out/${name}.png`;
}

// A browser context signed in with the QA account's cookies (from an API login).
export async function authedContext(b, jar, opts = {}) {
  const context = await b.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { 'X-Forwarded-For': `10.88.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}` }, ...opts });
  await context.addCookies(Object.entries(jar).map(([name, value]) => ({ name, value, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Strict' })));
  return context;
}

// Log in the QA account via the API and return a client holding its cookies.
export async function login() {
  const s = state.get();
  const c = client();
  const r = await c.post('/auth/login', { identifier: s.email, password: s.password });
  if (r.status !== 200) throw new Error(`QA login failed: ${r.status} ${JSON.stringify(r.data)}`);
  return c;
}

export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
