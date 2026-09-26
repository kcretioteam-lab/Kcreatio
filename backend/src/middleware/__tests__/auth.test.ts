import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate } from '../auth';

const SECRET = 'test-access-secret';
const env = { ...process.env };
beforeAll(() => { process.env.JWT_ACCESS_SECRET = SECRET; process.env.NODE_ENV = 'production'; });
afterAll(() => { process.env = env; });

// Runs the middleware and reports whether the request got through, and as whom
function check(cookie?: string, headers: Record<string, string> = {}) {
  let status = 0;
  let passed = false;
  const req: any = { headers, cookies: cookie ? { access_token: cookie } : {} };
  const res: any = { status(c: number) { status = c; return this; }, json() { return this; } };
  authenticate(req, res, () => { passed = true; });
  return { passed, status, userId: req.userId };
}

const sign = (payload: object, secret = SECRET) => jwt.sign(payload, secret, { expiresIn: '5m' });

describe('authenticate', () => {
  it('lets a real sign-in token through', () => {
    expect(check(sign({ sub: 'user-1', plan: 'pro', tv: 0 }))).toMatchObject({ passed: true, userId: 'user-1' });
  });

  it('rejects a missing, garbage or wrongly signed token', () => {
    expect(check()).toMatchObject({ passed: false, status: 401 });
    expect(check('abc.def.ghi')).toMatchObject({ passed: false, status: 401 });
    expect(check(sign({ sub: 'user-1' }, 'someone-elses-secret'))).toMatchObject({ passed: false, status: 401 });
  });

  it('rejects the 2FA challenge token, so the 2FA code cannot be skipped', () => {
    expect(check(sign({ sub: 'user-1', plan: 'pro', purpose: '2fa' }))).toMatchObject({ passed: false, status: 401 });
  });

  it('rejects the email-verification and premium-approval tokens', () => {
    expect(check(sign({ email: 'a@b.in', purpose: 'email_verify' }))).toMatchObject({ passed: false, status: 401 });
    expect(check(sign({ requestId: 'r1', purpose: 'premium_approve' }))).toMatchObject({ passed: false, status: 401 });
  });

  it('rejects a token without a user', () => {
    expect(check(sign({ plan: 'pro' }))).toMatchObject({ passed: false, status: 401 });
  });

  it('ignores the dev bypass header in production', () => {
    expect(check(undefined, { 'x-dev-user-id': 'dev-bypass-user' })).toMatchObject({ passed: false, status: 401 });
  });
});
