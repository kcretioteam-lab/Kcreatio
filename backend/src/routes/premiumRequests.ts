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
<div style="max-width:420px;padding:32px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#E8921A;margin-bottom:12px;">Kcretio</div>
<h2 style="margin:0 0 8px;">${title}</h2><p style="color:#94a3b8;">${body}</p></div></body></html>`;
}

// GET /premium-requests/approve?token=… — PUBLIC, opened from the admin email
router.get('/approve', async (req: Request, res: Response): Promise<void> => {
  let requestId: string;
  try {
    const payload = jwt.verify(String(req.query.token || ''), process.env.JWT_ACCESS_SECRET!, { algorithms: ['HS256'] }) as { requestId: string; purpose: string };
    if (payload.purpose !== 'premium_approve') throw new Error('bad purpose');
    requestId = payload.requestId;
  } catch {
    res.status(400).send(approvalPage('Link invalid or expired', 'Ask the user to submit a new request.'));
    return;
  }

  const { data: request } = await supabase
    .from('premium_requests')
    .select('id, user_id, status')
    .eq('id', requestId)
    .maybeSingle();
  if (!request) { res.status(404).send(approvalPage('Request not found', 'It may have been deleted.')); return; }
  if (request.status === 'approved') { res.send(approvalPage('Already approved ✓', 'Nothing more to do.')); return; }

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
