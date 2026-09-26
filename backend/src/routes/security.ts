// Two-factor sign-in and session management. Mounted under /api/v1/auth.
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import {
  generateSecret, verifyTotp, otpauthUri, encryptSecret, decryptSecret,
  generateRecoveryCodes, hashRecoveryCode,
} from '../services/totp.js';
import { startSession, currentSessionId, clearTokenCookies, describeDevice, revokeSession } from '../services/sessionService.js';

const router = Router();

const CodeSchema = z.object({ code: z.string().trim().min(6, 'Enter the 6-digit code').max(12) });

// Checks a 6-digit authenticator code (refusing a replay of the last used one) or, when
// allowRecovery is set, a one-time recovery code. Returns true and records usage on success.
async function checkSecondFactor(user: { id: string; totp_secret: string | null; totp_last_step: number | null; totp_recovery_codes: string[] | null }, code: string, allowRecovery: boolean): Promise<boolean> {
  if (!user.totp_secret) return false;
  const step = verifyTotp(decryptSecret(user.totp_secret), code);
  if (step !== null) {
    if (user.totp_last_step != null && step <= Number(user.totp_last_step)) return false;
    await supabase.from('users').update({ totp_last_step: step }).eq('id', user.id);
    return true;
  }
  if (allowRecovery) {
    const hash = hashRecoveryCode(code);
    const codes = user.totp_recovery_codes || [];
    if (codes.includes(hash)) {
      await supabase.from('users').update({ totp_recovery_codes: codes.filter(c => c !== hash) }).eq('id', user.id);
      return true;
    }
  }
  return false;
}

const TOTP_FIELDS = 'id, name, email, totp_secret, totp_enabled, totp_last_step, totp_recovery_codes';

// GET /auth/2fa — status
router.get('/2fa', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data } = await supabase.from('users').select('totp_enabled, totp_recovery_codes').eq('id', req.userId!).maybeSingle();
  res.json({ enabled: Boolean(data?.totp_enabled), recoveryCodesLeft: data?.totp_recovery_codes?.length ?? 0 });
});

// POST /auth/2fa/setup — new secret (not active until confirmed with a code)
router.post('/2fa/setup', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: user } = await supabase.from('users').select('email, totp_enabled').eq('id', req.userId!).maybeSingle();
  if (!user) { res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' }); return; }
  if (user.totp_enabled) { res.status(409).json({ error: 'ALREADY_ENABLED', message: 'Two-factor sign-in is already on' }); return; }

  const secret = generateSecret();
  const { error } = await supabase.from('users').update({ totp_secret: encryptSecret(secret), totp_last_step: null }).eq('id', req.userId!);
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Couldn’t start setup. Please try again.' }); return; }

  const uri = otpauthUri(secret, user.email);
  res.json({ secret, uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) });
});

// POST /auth/2fa/enable — confirm the first code, returns one-time recovery codes
router.post('/2fa/enable', authenticate, validateBody(CodeSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: user } = await supabase.from('users').select(TOTP_FIELDS).eq('id', req.userId!).maybeSingle();
  if (!user?.totp_secret) { res.status(422).json({ error: 'SETUP_REQUIRED', message: 'Start setup first' }); return; }
  if (user.totp_enabled) { res.status(409).json({ error: 'ALREADY_ENABLED', message: 'Two-factor sign-in is already on' }); return; }
  if (!(await checkSecondFactor(user, req.body.code, false))) {
    res.status(422).json({ error: 'INVALID_CODE', message: 'That code didn’t match. Check your phone’s time is set automatically and try the newest code.', field: 'code' });
    return;
  }
  const recoveryCodes = generateRecoveryCodes();
  await supabase.from('users').update({ totp_enabled: true, totp_recovery_codes: recoveryCodes.map(hashRecoveryCode) }).eq('id', req.userId!);
  res.json({ enabled: true, recoveryCodes });
});

// POST /auth/2fa/disable — needs the password and a current code (or recovery code)
const DisableSchema = z.object({ password: z.string().min(1, 'Enter your password'), code: z.string().trim().min(6, 'Enter the 6-digit code').max(12) });
router.post('/2fa/disable', authenticate, validateBody(DisableSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: user } = await supabase.from('users').select(`${TOTP_FIELDS}, password_hash`).eq('id', req.userId!).maybeSingle();
  if (!user?.totp_enabled) { res.json({ enabled: false }); return; }
  const passwordOk = user.password_hash && await bcrypt.compare(req.body.password, user.password_hash);
  if (!passwordOk || !(await checkSecondFactor(user, req.body.code, true))) {
    res.status(422).json({ error: 'INVALID_CODE', message: 'Password or code is incorrect' });
    return;
  }
  await supabase.from('users').update({ totp_enabled: false, totp_secret: null, totp_recovery_codes: [], totp_last_step: null }).eq('id', req.userId!);
  res.json({ enabled: false });
});

// POST /auth/2fa/verify — second step of sign-in
const VerifySchema = z.object({ challenge: z.string().min(1), code: z.string().trim().min(6, 'Enter the 6-digit code').max(12) });
router.post('/2fa/verify', validateBody(VerifySchema), async (req: Request, res: Response): Promise<void> => {
  let payload: { sub: string; plan: string; purpose?: string };
  try {
    payload = jwt.verify(req.body.challenge, process.env.JWT_ACCESS_SECRET!, { algorithms: ['HS256'] }) as typeof payload;
    if (payload.purpose !== '2fa') throw new Error('wrong purpose');
  } catch {
    res.status(401).json({ error: 'CHALLENGE_EXPIRED', message: 'That took too long — please sign in again.' });
    return;
  }

  const { data: user } = await supabase.from('users')
    .select(`${TOTP_FIELDS}, plan, trial_ends_at, gstin, pan, business_name, business_address, state_code, invoice_prefix, token_version, locked_until`)
    .eq('id', payload.sub).maybeSingle();
  if (!user?.totp_enabled) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Please sign in again.' }); return; }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    res.status(423).json({ error: 'ACCOUNT_LOCKED', message: 'Too many failed attempts. Reset your password to unlock your account.' });
    return;
  }
  if (!(await checkSecondFactor(user, req.body.code, true))) {
    res.status(422).json({ error: 'INVALID_CODE', message: 'That code didn’t match. Try the newest code from your authenticator app, or a recovery code.', field: 'code' });
    return;
  }

  await startSession(req, res, user, payload.plan, user.token_version || 0);
  const { totp_secret, totp_enabled, totp_last_step, totp_recovery_codes, token_version, locked_until, ...safeUser } = user;
  res.json({ user: { ...safeUser, plan: payload.plan } });
});

// GET /auth/sessions — devices signed in to this account
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data, error } = await supabase.from('user_sessions')
    .select('id, user_agent, ip, created_at, last_seen_at')
    .eq('user_id', req.userId!).is('revoked_at', null)
    .gt('last_seen_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('last_seen_at', { ascending: false });
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Couldn’t load your sessions.' }); return; }
  const current = currentSessionId(req);
  res.json({
    sessions: (data || []).map(s => ({ ...s, device: describeDevice(s.user_agent || ''), current: s.id === current })),
  });
});

// DELETE /auth/sessions/:id — sign one device out
router.delete('/sessions/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await revokeSession(String(req.params.id), req.userId!);
  if (req.params.id === currentSessionId(req)) clearTokenCookies(res);
  res.status(204).send();
});

// POST /auth/sessions/revoke-all — sign out everywhere, including this device
router.post('/sessions/revoke-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: user } = await supabase.from('users').select('token_version').eq('id', req.userId!).maybeSingle();
  // Bumping token_version also invalidates refresh tokens issued before sessions existed
  await supabase.from('users').update({ token_version: (user?.token_version || 0) + 1 }).eq('id', req.userId!);
  await supabase.from('user_sessions').update({ revoked_at: new Date().toISOString() }).eq('user_id', req.userId!).is('revoked_at', null);
  clearTokenCookies(res);
  res.json({ success: true });
});

export default router;
