import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { validateBody } from '../middleware/validateBody.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const BCRYPT_ROUNDS = 12;
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '30d';
const TRIAL_DAYS = 28;
const MAX_FAILED_ATTEMPTS = 5;
const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_MINUTES = 60;

// Frontend (Netlify) and backend (Render) live on different domains in production —
// that's cross-site, so cookies need SameSite=None (paired with Secure) to survive
// the trip. Locally, frontend/backend share "localhost" (same-site), so Strict is
// fine and safer there.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'strict') as 'none' | 'strict',
  path: '/',
};

// Password complexity: 8+ chars, uppercase, lowercase, special char
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

function signTokens(userId: string, plan: string, tokenVersion: number = 0) {
  const accessToken = jwt.sign(
    { sub: userId, plan, tv: tokenVersion },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { sub: userId, tv: tokenVersion },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: REFRESH_EXPIRY }
  );
  return { accessToken, refreshToken };
}

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── POST /auth/send-otp ────────────────────────────────────────────────────────
// Send 6-digit OTP to email for verification. Rate limited at route level.
const SendOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  purpose: z.enum(['email_verify', 'password_reset']),
});

router.post('/send-otp', validateBody(SendOtpSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, purpose } = req.body;

  // For password_reset, verify email exists first (but don't reveal timing)
  if (purpose === 'password_reset') {
    const { data: user } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    // Always return success to prevent email enumeration
    if (!user) { res.json({ sent: true }); return; }
  }

  // Rate limit: max 3 OTPs per email per 15 minutes
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('otp_logs')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('purpose', purpose)
    .gte('created_at', fifteenMinsAgo);

  if ((count ?? 0) >= 3) {
    res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many OTP requests. Try again in 15 minutes.', statusCode: 429 });
    return;
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10); // lighter rounds for OTP
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await supabase.from('otp_logs').insert({ email, otp_hash: otpHash, purpose, expires_at: expiresAt });

  // Send email via Resend if configured, otherwise log in dev
  const { sendOtpEmail } = await import('../services/emailService.js').catch(() => ({ sendOtpEmail: null }));
  if (sendOtpEmail) {
    await sendOtpEmail(email, otp, purpose).catch(() => null);
  } else {
    console.log(`[DEV] OTP for ${email} (${purpose}): ${otp}`);
  }

  res.json({ sent: true });
});

// ── POST /auth/verify-otp ──────────────────────────────────────────────────────
const VerifyOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp: z.string().length(6),
  purpose: z.enum(['email_verify', 'password_reset']),
});

router.post('/verify-otp', validateBody(VerifyOtpSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, otp, purpose } = req.body;

  const { data: logs } = await supabase
    .from('otp_logs')
    .select('id, otp_hash, expires_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  const log = logs?.[0];
  if (!log) {
    res.status(400).json({ error: 'INVALID_OTP', message: 'OTP is invalid or expired', statusCode: 400 });
    return;
  }

  const isValid = await bcrypt.compare(otp, log.otp_hash);
  if (!isValid) {
    res.status(400).json({ error: 'INVALID_OTP', message: 'Incorrect OTP', statusCode: 400 });
    return;
  }

  // Mark OTP used
  await supabase.from('otp_logs').update({ used: true }).eq('id', log.id);

  // Return a short-lived verification token (5 min) to use in register/reset-password
  const verificationToken = jwt.sign(
    { email, purpose },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '5m' }
  );

  res.json({ verified: true, verificationToken });
});

// ── POST /auth/register ────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional().or(z.literal('')),
  password: passwordSchema,
  verificationToken: z.string().min(10), // JWT from verify-otp step
  termsAccepted: z.literal(true),
  marketingEmails: z.boolean().default(true),
});

router.post('/register', validateBody(RegisterSchema), async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, password, verificationToken, marketingEmails } = req.body;

  // Validate the email verification token
  try {
    const payload = jwt.verify(verificationToken, process.env.JWT_ACCESS_SECRET!) as { email: string; purpose: string };
    if (payload.email !== email || payload.purpose !== 'email_verify') {
      res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Email verification required', field: 'email', statusCode: 422 });
      return;
    }
  } catch {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Email verification expired. Please verify again.', field: 'email', statusCode: 422 });
    return;
  }

  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (existing) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'An account with this email already exists', field: 'email', statusCode: 422 });
    return;
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      name,
      email,
      phone: phone || null,
      password_hash: hash,
      plan: 'trial',
      trial_ends_at: trialEndsAt.toISOString(),
      invoice_prefix: 'INV',
      is_email_verified: true,
      terms_accepted_at: new Date().toISOString(),
      marketing_emails: marketingEmails,
    })
    .select('id, name, email, plan, trial_ends_at, gstin, pan, business_name, business_address, state_code, invoice_prefix, token_version')
    .single();

  if (error || !user) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to create account', statusCode: 500 });
    return;
  }

  const { accessToken, refreshToken } = signTokens(user.id, user.plan, user.token_version || 0);
  setTokenCookies(res, accessToken, refreshToken);

  const { token_version, ...safeUser } = user;
  res.status(201).json({ user: safeUser });
});

// ── POST /auth/login ───────────────────────────────────────────────────────────
const LoginSchema = z.object({
  identifier: z.string().min(1).trim(), // email OR phone number
  password: z.string().min(1),
});

router.post('/login', validateBody(LoginSchema), async (req: Request, res: Response): Promise<void> => {
  const { identifier, password } = req.body;

  // Try email lookup first, then phone
  const identifierLower = identifier.toLowerCase();
  let { data: user } = await supabase
    .from('users')
    .select('id, name, email, password_hash, plan, trial_ends_at, gstin, pan, business_name, business_address, state_code, invoice_prefix, failed_login_attempts, locked_until, token_version')
    .eq('email', identifierLower)
    .maybeSingle();

  if (!user) {
    const { data: byPhone } = await supabase
      .from('users')
      .select('id, name, email, password_hash, plan, trial_ends_at, gstin, pan, business_name, business_address, state_code, invoice_prefix, failed_login_attempts, locked_until, token_version')
      .eq('phone', identifier)
      .maybeSingle();
    user = byPhone;
  }

  // Timing-safe: always compare to prevent user enumeration
  const dummyHash = '$2b$12$invalidhashfillerthatpreventstimingleak';
  const isValid = await bcrypt.compare(password, user?.password_hash || dummyHash);

  // Check account lockout
  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    res.status(423).json({
      error: 'ACCOUNT_LOCKED',
      message: `Too many failed attempts. Account locked until ${new Date(user.locked_until).toLocaleTimeString()}. Reset your password to unlock immediately.`,
      statusCode: 423,
    });
    return;
  }

  if (!user || !isValid) {
    // Increment failed attempts if user exists
    if (user) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const updates: Record<string, unknown> = { failed_login_attempts: newAttempts };
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updates.locked_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
      await supabase.from('users').update(updates).eq('id', user.id);
    }
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid credentials', statusCode: 401 });
    return;
  }

  // Reset failed attempts on success
  if ((user.failed_login_attempts || 0) > 0) {
    await supabase.from('users').update({ failed_login_attempts: 0, locked_until: null }).eq('id', user.id);
  }

  // Check if trial expired and downgrade
  let plan = user.plan;
  if (plan === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) < new Date()) {
    plan = 'basic';
    await supabase.from('users').update({ plan: 'basic' }).eq('id', user.id);
  }

  const { accessToken, refreshToken } = signTokens(user.id, plan, user.token_version || 0);
  setTokenCookies(res, accessToken, refreshToken);

  const { password_hash, failed_login_attempts, locked_until, token_version, ...safeUser } = user;
  res.json({ user: { ...safeUser, plan } });
});

// POST /auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('access_token', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_OPTIONS);
  res.json({ success: true });
});

// POST /auth/refresh — token version check to prevent use of revoked tokens
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refresh_token;
  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'No refresh token', statusCode: 401 });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { sub: string; tv?: number };

    const { data: user } = await supabase
      .from('users')
      .select('id, plan, token_version')
      .eq('id', payload.sub)
      .maybeSingle();

    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not found', statusCode: 401 });
      return;
    }

    // Reject token if version mismatch (issued before password reset)
    if ((payload.tv ?? 0) < (user.token_version ?? 0)) {
      res.status(401).json({ error: 'TOKEN_REVOKED', message: 'Session revoked. Please log in again.', statusCode: 401 });
      return;
    }

    const { accessToken, refreshToken } = signTokens(user.id, user.plan, user.token_version || 0);
    setTokenCookies(res, accessToken, refreshToken);
    res.json({ success: true });
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid refresh token', statusCode: 401 });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, plan, trial_ends_at, gstin, pan, business_name, business_address, state_code, invoice_prefix, created_at, phone, show_phone_on_invoice, invoice_phone, invoice_email, avatar_url, is_email_verified, social_links, social_verified, gmail_connected_email, marketing_emails')
    .eq('id', req.userId!)
    .maybeSingle();

  if (error || !user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found', statusCode: 404 });
    return;
  }

  res.json(user);
});

// PUT /auth/profile
const ProfileSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  business_name: z.string().max(200).trim().optional(),
  business_address: z.string().max(500).trim().optional(),
  state_code: z.string().max(2).optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().or(z.literal('')),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional().or(z.literal('')),
  invoice_prefix: z.string().min(2).max(5).toUpperCase().optional(),
  phone: z.string().max(20).trim().optional().or(z.literal('')),
  show_phone_on_invoice: z.boolean().optional(),
  invoice_phone: z.string().max(20).trim().optional().or(z.literal('')),
  invoice_email: z.string().email().optional().or(z.literal('')),
  avatar_url: z.string().url().optional().or(z.literal('')),
  marketing_emails: z.boolean().optional(),
  social_links: z.object({
    instagram: z.string().url().optional().or(z.literal('')),
    youtube: z.string().url().optional().or(z.literal('')),
    facebook: z.string().url().optional().or(z.literal('')),
    x: z.string().url().optional().or(z.literal('')),
    tiktok: z.string().url().optional().or(z.literal('')),
    snapchat: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
  }).optional(),
});

router.put('/profile', authenticate, validateBody(ProfileSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([, v]) => v !== undefined && v !== '')
  );

  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', req.userId!)
    .select('id, name, email, plan, trial_ends_at, gstin, pan, business_name, business_address, state_code, invoice_prefix, phone, show_phone_on_invoice, invoice_phone, invoice_email, avatar_url, marketing_emails, social_links')
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update profile', statusCode: 500 });
    return;
  }

  res.json(data);
});

// PUT /auth/change-password — requires current password
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

router.put('/change-password', authenticate, validateBody(ChangePasswordSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  const { data: user } = await supabase
    .from('users')
    .select('id, password_hash, token_version')
    .eq('id', req.userId!)
    .maybeSingle();

  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', statusCode: 404 });
    return;
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Current password is incorrect', field: 'currentPassword', statusCode: 422 });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const newVersion = (user.token_version || 0) + 1;

  await supabase.from('users').update({
    password_hash: newHash,
    token_version: newVersion,
    failed_login_attempts: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  }).eq('id', req.userId!);

  // Issue new tokens with updated version
  const { data: updated } = await supabase.from('users').select('plan').eq('id', req.userId!).maybeSingle();
  const { accessToken, refreshToken } = signTokens(req.userId!, updated?.plan || 'basic', newVersion);
  setTokenCookies(res, accessToken, refreshToken);

  res.json({ success: true });
});

// POST /auth/forgot-password — send reset email
const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

router.post('/forgot-password', validateBody(ForgotPasswordSchema), async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const { data: user } = await supabase.from('users').select('id, name').eq('email', email).maybeSingle();

  // Always return success to prevent email enumeration
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Invalidate previous reset tokens for this user
    await supabase.from('password_reset_tokens').update({ used: true }).eq('user_id', user.id).eq('used', false);

    await supabase.from('password_reset_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    const { sendPasswordResetEmail } = await import('../services/emailService.js').catch(() => ({ sendPasswordResetEmail: null }));
    if (sendPasswordResetEmail) {
      await sendPasswordResetEmail(email, user.name, resetLink).catch(() => null);
    } else {
      console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);
    }
  }

  res.json({ sent: true });
});

// POST /auth/reset-password — validate token and set new password
const ResetPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  token: z.string().min(10),
  newPassword: passwordSchema,
});

router.post('/reset-password', validateBody(ResetPasswordSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, token, newPassword } = req.body;

  const { data: user } = await supabase.from('users').select('id, token_version').eq('email', email).maybeSingle();
  if (!user) {
    res.status(400).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired reset link', statusCode: 400 });
    return;
  }

  // Find a valid, unused, unexpired token for this user
  const { data: tokens } = await supabase
    .from('password_reset_tokens')
    .select('id, token_hash')
    .eq('user_id', user.id)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  let matchedToken = null;
  for (const t of tokens || []) {
    const matches = await bcrypt.compare(token, t.token_hash);
    if (matches) { matchedToken = t; break; }
  }

  if (!matchedToken) {
    res.status(400).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired reset link', statusCode: 400 });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const newVersion = (user.token_version || 0) + 1;

  await Promise.all([
    supabase.from('users').update({
      password_hash: newHash,
      token_version: newVersion,
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id),
    supabase.from('password_reset_tokens').update({ used: true }).eq('id', matchedToken.id),
  ]);

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});

// POST /auth/avatar
const AvatarSchema = z.object({
  imageBase64: z.string().min(10),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
});

router.post('/avatar', authenticate, validateBody(AvatarSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { imageBase64, mimeType } = req.body;

  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > 2097152) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Avatar must be under 2MB', statusCode: 422 });
    return;
  }

  const ext = mimeType.split('/')[1];
  const fileName = `avatars/${req.userId!}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('invoice-signatures')
    .upload(fileName, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    res.status(500).json({ error: 'UPLOAD_FAILED', message: `Upload failed: ${uploadError.message}`, statusCode: 500 });
    return;
  }

  const { data: urlData } = supabase.storage.from('invoice-signatures').getPublicUrl(fileName);
  const avatarUrl = urlData.publicUrl;

  const { data, error } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', req.userId!)
    .select('avatar_url')
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to save avatar URL', statusCode: 500 });
    return;
  }

  res.json({ url: avatarUrl });
});

// DELETE /auth/account
router.delete('/account', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const { data: user } = await supabase.from('users').select('subscription_id').eq('id', userId).maybeSingle();

  if (user?.subscription_id) {
    try {
      const Razorpay = (await import('razorpay')).default;
      const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
      await (rzp.subscriptions as any).cancel(user.subscription_id, false);
    } catch { /* Non-blocking */ }
  }

  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to delete account', statusCode: 500 });
    return;
  }

  res.clearCookie('access_token', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_OPTIONS);
  res.json({ message: 'Account permanently deleted' });
});

export default router;

// ── Google OAuth (Login / Signup) ──────────────────────────────────────────────
// GET /auth/google — redirect to Google consent screen
router.get('/google', (req: Request, res: Response): void => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /auth/google/callback — exchange code for tokens, upsert user
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.query as { code?: string };
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    return;
  }

  try {
    const { OAuth2Client } = await import('google-auth-library');
    const oauthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`
    );

    const { tokens } = await oauthClient.getToken(code as string);
    oauthClient.setCredentials(tokens);

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) {
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    // Try to find existing user by google_id OR email
    let { data: user } = await supabase
      .from('users')
      .select('id, plan, trial_ends_at, token_version')
      .eq('google_id', googleId)
      .maybeSingle();

    if (!user) {
      const { data: byEmail } = await supabase
        .from('users')
        .select('id, plan, trial_ends_at, token_version')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (byEmail) {
        // Link Google to existing account
        await supabase.from('users').update({ google_id: googleId, avatar_url: picture || null }).eq('id', byEmail.id);
        user = byEmail;
      } else {
        // Create new user via Google
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            name: name || email.split('@')[0],
            email: email.toLowerCase(),
            password_hash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10), // random unusable password
            google_id: googleId,
            avatar_url: picture || null,
            plan: 'trial',
            trial_ends_at: trialEndsAt.toISOString(),
            invoice_prefix: 'INV',
            is_email_verified: true,
            terms_accepted_at: new Date().toISOString(),
          })
          .select('id, plan, trial_ends_at, token_version')
          .single();
        user = newUser;
      }
    }

    if (!user) {
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
      return;
    }

    // Check trial expiry
    let plan = user.plan;
    if (plan === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at) < new Date()) {
      plan = 'basic';
      await supabase.from('users').update({ plan: 'basic' }).eq('id', user.id);
    }

    const { accessToken, refreshToken } = signTokens(user.id, plan, user.token_version || 0);
    setTokenCookies(res, accessToken, refreshToken);
    res.redirect(`${frontendUrl}/dashboard`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
});

// ── Gmail Connect (Read Inbox + Send As Creator) ───────────────────────────────
// GET /auth/gmail/connect — redirect to Google with gmail scopes
router.get('/gmail/connect', authenticate, (req: AuthRequest, res: Response): void => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${process.env.FRONTEND_URL?.replace(':5173', ':4000') || 'http://localhost:4000'}/api/v1/auth/gmail/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: Buffer.from(JSON.stringify({ userId: req.userId })).toString('base64'),
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /auth/gmail/callback — store gmail tokens on user
router.get('/gmail/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query as { code?: string; state?: string };
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code || !state) {
    res.redirect(`${frontendUrl}/settings?gmail=error`);
    return;
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
    const { OAuth2Client } = await import('google-auth-library');
    const callbackUrl = `${process.env.FRONTEND_URL?.replace(':5173', ':4000') || 'http://localhost:4000'}/api/v1/auth/gmail/callback`;
    const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, callbackUrl);

    const { tokens } = await oauthClient.getToken(code as string);

    // Get connected email from id_token
    let connectedEmail = '';
    if (tokens.id_token) {
      const ticket = await oauthClient.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
      connectedEmail = ticket.getPayload()?.email || '';
    }

    await supabase.from('users').update({
      gmail_access_token: tokens.access_token,
      gmail_refresh_token: tokens.refresh_token || null,
      gmail_connected_email: connectedEmail,
      gmail_connected_at: new Date().toISOString(),
    }).eq('id', userId);

    res.redirect(`${frontendUrl}/settings?gmail=connected`);
  } catch (err) {
    console.error('Gmail OAuth error:', err);
    res.redirect(`${frontendUrl}/settings?gmail=error`);
  }
});

// DELETE /auth/gmail/disconnect
router.delete('/gmail/disconnect', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await supabase.from('users').update({
    gmail_access_token: null,
    gmail_refresh_token: null,
    gmail_connected_email: null,
    gmail_connected_at: null,
    gmail_last_scan_at: null,
  }).eq('id', req.userId!);
  res.json({ disconnected: true });
});
