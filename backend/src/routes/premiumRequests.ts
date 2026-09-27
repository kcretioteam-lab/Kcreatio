import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { getFrontendUrl } from '../lib/env.js';
import { sendPremiumRequestAdminEmail, sendPremiumApprovedEmail } from '../services/emailService.js';

// Premium access by request — replaces paid upgrades while payments are disabled.
// User requests → row in premium_requests + email to ADMIN_EMAIL with a signed approve link
// → approve grants plan='trial' for PREMIUM_DAYS. Existing trial-expiry logic in auth.ts downgrades to basic.

const router = Router();
// Approval pages are opened from an email and authorised by the signed token, not cookies — mounted in
// server.ts ahead of CORS (the confirm form's POST carries Origin: null under Helmet's no-referrer policy).
export const approvalRouter = Router();
const PREMIUM_DAYS = 28;

const FEATURES = [
  'advance_tax_calculator', 'income_dashboard', 'ca_export', 'smart_inbox',
  'watermark_free_pdf', 'unlimited_tds', 'expense_tracker',
] as const;

const RequestSchema = z.object({
  features: z.array(z.enum(FEATURES)).min(1, 'Pick at least one feature'),
  platform: z.enum(['youtube', 'instagram', 'other']),
  followerCount: z.number().int().min(0).max(1_000_000_000),
});

const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function approvalPage(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Inter,Arial,sans-serif;background:#07080F;color:#F0F1F8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
<div style="max-width:420px;padding:32px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#E8921A;margin-bottom:12px;">Kcreatio</div>
<h2 style="margin:0 0 8px;">${title}</h2><p style="color:#94a3b8;">${body}</p></div></body></html>`;
}

// Approve link from the admin email — PUBLIC, authorised by the signed token.
// GET only shows a confirmation page; the grant happens on POST from its button. Mail scanners
// (Outlook Safe Links, corporate gateways) pre-fetch links with GET and must not approve anything.
type ApprovalLookup =
  | { ok: true; request: { id: string; user_id: string; status: string } }
  | { ok: false; status: number; title: string; body: string };

async function lookupApproval(token: unknown): Promise<ApprovalLookup> {
  let requestId: string;
  try {
    const payload = jwt.verify(String(token || ''), process.env.JWT_ACCESS_SECRET!, { algorithms: ['HS256'] }) as { requestId: string; purpose: string };
    if (payload.purpose !== 'premium_approve') throw new Error('bad purpose');
    requestId = payload.requestId;
  } catch {
    return { ok: false, status: 400, title: 'Link invalid or expired', body: 'Ask the user to submit a new request.' };
  }
  const { data: request } = await supabase
    .from('premium_requests')
    .select('id, user_id, status')
    .eq('id', requestId)
    .maybeSingle();
  if (!request) return { ok: false, status: 404, title: 'Request not found', body: 'It may have been deleted.' };
  if (request.status === 'approved') return { ok: false, status: 200, title: 'Already approved ✓', body: 'Nothing more to do.' };
  return { ok: true, request };
}

approvalRouter.get('/approve', async (req: Request, res: Response): Promise<void> => {
  const found = await lookupApproval(req.query.token);
  if (!found.ok) { res.status(found.status).send(approvalPage(found.title, found.body)); return; }

  const { data: user } = await supabase.from('users').select('name, email').eq('id', found.request.user_id).maybeSingle();
  const who = user ? `${esc(user.name)} (${esc(user.email)})` : 'this user';
  const action = `?token=${encodeURIComponent(String(req.query.token))}`;
  res.send(approvalPage('Approve premium access?',
    `Give ${who} ${PREMIUM_DAYS} days of Pro.</p>
<form method="post" action="${esc(action)}" style="margin-top:24px;">
<button type="submit" style="background:#E8921A;color:#fff;font-weight:700;padding:14px 32px;border:none;border-radius:8px;font-size:15px;cursor:pointer;">Approve ${PREMIUM_DAYS} days of Pro</button>
</form><p style="color:#64748b;font-size:12px;">`));
});

approvalRouter.post('/approve', async (req: Request, res: Response): Promise<void> => {
  const found = await lookupApproval(req.query.token);
  if (!found.ok) { res.status(found.status).send(approvalPage(found.title, found.body)); return; }
  const { request } = found;

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + PREMIUM_DAYS);

  const { data: user, error } = await supabase
    .from('users')
    .update({ plan: 'trial', trial_ends_at: endsAt.toISOString() })
    .eq('id', request.user_id)
    .select('name, email')
    .single();
  if (error || !user) { res.status(500).send(approvalPage('Could not approve', 'Updating the user failed — try again.')); return; }

  await supabase
    .from('premium_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', request.id);

  sendPremiumApprovedEmail(user.email, user.name, endsAt).catch(err => console.error('[premium] approved email failed', err));
  res.send(approvalPage('Approved ✓', `${esc(user.name)} (${esc(user.email)}) has Pro access until ${endsAt.toDateString()}.`));
});

router.use(authenticate);

// GET /premium-requests/me — latest request for the current user
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data } = await supabase
    .from('premium_requests')
    .select('id, status, features, created_at, approved_at')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  res.json({ request: data || null });
});

// POST /premium-requests — ask for 28 days of Pro
router.post('/', validateBody(RequestSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { features, platform, followerCount } = req.body as z.infer<typeof RequestSchema>;

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, plan, trial_ends_at')
    .eq('id', req.userId!)
    .single();
  if (!user) { res.status(404).json({ error: 'NOT_FOUND', message: 'User not found', statusCode: 404 }); return; }

  const onActiveTrial = user.plan === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) > new Date();
  if (onActiveTrial || ['starter', 'pro', 'business'].includes(user.plan)) {
    res.status(409).json({ error: 'VALIDATION_ERROR', message: 'You already have premium access', statusCode: 409 });
    return;
  }

  const { data: request, error } = await supabase
    .from('premium_requests')
    .insert({ user_id: user.id, features, platform, follower_count: followerCount })
    .select('id, status, features, created_at')
    .single();
  if (error) {
    // 23505 = unique violation on the one-pending-request-per-user index
    if (error.code === '23505') {
      res.status(409).json({ error: 'VALIDATION_ERROR', message: 'Your request is already pending review', statusCode: 409 });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Could not save request', statusCode: 500 });
    return;
  }

  const token = jwt.sign({ requestId: request.id, purpose: 'premium_approve' }, process.env.JWT_ACCESS_SECRET!, { algorithm: 'HS256', expiresIn: '7d' });
  const apiUrl = process.env.API_URL || 'http://localhost:4000';
  sendPremiumRequestAdminEmail({
    name: user.name, email: user.email, features, platform, followerCount,
    approveUrl: `${apiUrl}/api/v1/premium-requests/approve?token=${encodeURIComponent(token)}`,
    appUrl: getFrontendUrl(),
  }).catch(err => console.error('[premium] admin email failed', err));

  res.status(201).json({ request });
});

export default router;
