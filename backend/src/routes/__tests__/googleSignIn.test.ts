import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

// No database: every user lookup finds the same signed-up user
const USER = { id: 'user-1', name: 'Asha', email: 'asha@example.com', plan: 'basic', trial_ends_at: null, token_version: 0, totp_enabled: false };
vi.mock('../../lib/supabase.js', () => {
  const query: any = {
    select: () => query, eq: () => query, update: () => query, insert: () => query,
    maybeSingle: async () => ({ data: USER }), single: async () => ({ data: USER }),
  };
  return { supabase: { from: () => query } };
});
// Record who would be signed in instead of creating a real session
const sessions: string[] = [];
vi.mock('../../services/sessionService.js', async (orig) => ({
  ...(await orig<typeof import('../../services/sessionService.js')>()),
  startSession: async (_req: unknown, _res: unknown, user: { id: string }) => { sessions.push(user.id); return 'sid'; },
}));

const SECRET = 'test-access-secret';
let handler: (path: string) => (req: any, res: any) => Promise<void>;
beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = SECRET;
  process.env.PRIMARY_FRONTEND_URL = 'https://kcreatio.com';
  const { default: router } = await import('../auth.js');
  handler = (path) => (router as any).stack.find((l: any) => l.route?.path === path).route.stack.at(-1).handle;
});

// Calls a GET route with the given query and cookies; returns where it redirected
async function get(path: string, query: Record<string, string>, cookies: Record<string, string> = {}) {
  let location = '';
  const res: any = { redirect(url: string) { location = url; }, clearCookie() {}, cookie() {} };
  await handler(path)({ query, cookies, headers: {} }, res);
  return location;
}

const ticket = (payload: object, secret = SECRET) => jwt.sign(payload, secret, { expiresIn: '2m' });

describe('Google sign-in completed on the site (/google/complete)', () => {
  it('signs the visitor in when the ticket matches their state cookie', async () => {
    sessions.length = 0;
    const url = await get('/google/complete', { ticket: ticket({ sub: 'user-1', state: 'n1', purpose: 'google_login' }) }, { google_oauth_state: 'n1' });
    expect(url).toBe('https://kcreatio.com/dashboard');
    expect(sessions).toEqual(['user-1']);
  });

  it('refuses a ticket from another browser (no or different state cookie), so nobody can be signed into the wrong account', async () => {
    sessions.length = 0;
    const t = ticket({ sub: 'user-1', state: 'n1', purpose: 'google_login' });
    expect(await get('/google/complete', { ticket: t })).toBe('https://kcreatio.com/login?error=oauth_failed');
    expect(await get('/google/complete', { ticket: t }, { google_oauth_state: 'other' })).toBe('https://kcreatio.com/login?error=oauth_failed');
    expect(sessions).toEqual([]);
  });

  it('refuses a forged, missing or wrong-purpose ticket', async () => {
    sessions.length = 0;
    const c = { google_oauth_state: 'n1' };
    expect(await get('/google/complete', {}, c)).toContain('error=oauth_failed');
    expect(await get('/google/complete', { ticket: ticket({ sub: 'user-1', state: 'n1', purpose: 'google_login' }, 'wrong-secret') }, c)).toContain('error=oauth_failed');
    expect(await get('/google/complete', { ticket: ticket({ sub: 'user-1', state: 'n1', purpose: '2fa' }) }, c)).toContain('error=oauth_failed');
    expect(sessions).toEqual([]);
  });
});

describe('Gmail connect callback (/gmail/callback)', () => {
  it('refuses an unsigned state naming someone else\'s account', async () => {
    const forged = Buffer.from(JSON.stringify({ userId: 'victim' })).toString('base64');
    expect(await get('/gmail/callback', { code: 'c', state: forged })).toBe('https://kcreatio.com/settings?gmail=error');
  });

  it('refuses a state signed for another purpose', async () => {
    const state = ticket({ sub: 'user-1', state: 'n1', purpose: 'google_login' });
    expect(await get('/gmail/callback', { code: 'c', state })).toBe('https://kcreatio.com/settings?gmail=error');
  });
});
