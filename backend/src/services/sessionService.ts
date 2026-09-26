import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '30d';

// Frontend (Netlify) and backend (Render) live on different domains in production —
// that's cross-site, so cookies need SameSite=None (paired with Secure) to survive
// the trip. Locally, frontend/backend share "localhost" (same-site), so Strict is
// fine and safer there.
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'strict') as 'none' | 'strict',
  path: '/',
};

export interface RefreshPayload { sub: string; tv?: number; sid?: string }

export function signTokens(userId: string, plan: string, tokenVersion = 0, sid?: string) {
  const accessToken = jwt.sign({ sub: userId, plan, tv: tokenVersion, ...(sid ? { sid } : {}) }, process.env.JWT_ACCESS_SECRET!, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign({ sub: userId, tv: tokenVersion, ...(sid ? { sid } : {}) }, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken };
}

export function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

export function clearTokenCookies(res: Response) {
  res.clearCookie('access_token', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_OPTIONS);
}

// The session id from the refresh cookie, if it's valid (used to mark "this device").
export function currentSessionId(req: Request): string | undefined {
  const token = req.cookies?.refresh_token;
  if (!token) return undefined;
  try {
    return (jwt.verify(token, process.env.JWT_REFRESH_SECRET!, { algorithms: ['HS256'] }) as RefreshPayload).sid;
  } catch {
    return undefined;
  }
}

const clientIp = (req: Request) => (req.ip || req.socket?.remoteAddress || '').slice(0, 64);
const userAgent = (req: Request) => String(req.headers['user-agent'] || '').slice(0, 300);

// Signs the user in on this device: records a session, sets cookies, and emails the user
// if this browser hasn't been seen on their account before.
export async function startSession(req: Request, res: Response, user: { id: string; email?: string; name?: string }, plan: string, tokenVersion = 0): Promise<string | undefined> {
  const ua = userAgent(req);
  let sid: string | undefined;
  let newDevice = false;
  try {
    const { count } = await supabase.from('user_sessions').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('user_agent', ua);
    const { count: anyCount } = await supabase.from('user_sessions').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    newDevice = (anyCount ?? 0) > 0 && (count ?? 0) === 0;
    const { data } = await supabase.from('user_sessions')
      .insert({ user_id: user.id, user_agent: ua, ip: clientIp(req) })
      .select('id').single();
    sid = data?.id;
  } catch (err) {
    // Sessions table missing (migration 017 not run) — sign in without session tracking
    console.warn('[sessions] could not record session:', err);
  }

  const { accessToken, refreshToken } = signTokens(user.id, plan, tokenVersion, sid);
  setTokenCookies(res, accessToken, refreshToken);

  if (newDevice && user.email) {
    import('./emailService.js')
      .then(m => m.sendNewDeviceEmail(user.email!, user.name || 'there', { device: describeDevice(ua), ip: clientIp(req), when: new Date() }))
      .catch(err => console.warn('[sessions] new-device email failed:', err));
  }
  return sid;
}

// Called on refresh. Returns false when the session was signed out.
export async function touchSession(sid: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('user_sessions').select('revoked_at').eq('id', sid).eq('user_id', userId).maybeSingle();
  if (error) return true; // table unavailable — don't lock people out
  if (!data || data.revoked_at) return false;
  await supabase.from('user_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', sid);
  return true;
}

export async function revokeSession(sid: string, userId: string) {
  await supabase.from('user_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', sid).eq('user_id', userId).is('revoked_at', null);
}

// "Chrome on Windows" from a user-agent string — good enough for a session list.
export function describeDevice(ua: string): string {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown device';
  return `${browser} on ${os}`;
}
