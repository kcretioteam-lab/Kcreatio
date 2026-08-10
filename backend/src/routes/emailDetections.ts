import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { classifyEmail } from '../services/emailClassifier.js';
import { scanInbox } from '../services/gmailService.js';
import { hasFeature } from '../config/plans.js';

const router = Router();

// Per-user rate limit for manual scan-now: 1 call per 60 seconds
const scanCooldowns = new Map<string, number>();

// ── GET /email-detections ─────────────────────────────────────────────────────
// Returns pending detections + metadata for the Smart Inbox widget
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status = 'pending_review', limit = '20' } = req.query;

  // Use req.userPlan (set by auth middleware; 'pro' in dev-bypass) — don't re-query Supabase for plan
  const userPlan = (req as any).userPlan ?? 'basic';

  const { data: user } = await supabase
    .from('users')
    .select('gmail_connected_at, gmail_last_scan_at')
    .eq('id', req.userId!)
    .maybeSingle();

  // Basic plan: return count only (used for the teaser/locked widget)
  if (!hasFeature('smart_inbox', userPlan)) {
    const { count } = await supabase
      .from('email_detections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .eq('status', 'pending_review');

    res.json({
      detections: [],
      pending_count: count ?? 0,
      last_scan_at: user?.gmail_last_scan_at ?? null,
      gmail_connected: !!user?.gmail_connected_at,
      plan_locked: true,
    });
    return;
  }

  const { data, error } = await supabase
    .from('email_detections')
    .select('*')
    .eq('user_id', req.userId!)
    .eq('status', String(status))
    .order('email_received_at', { ascending: false })
    .limit(Math.min(50, parseInt(String(limit), 10) || 20));

  if (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', statusCode: 500 });
    return;
  }

  const { count: pendingCount } = await supabase
    .from('email_detections')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.userId!)
    .eq('status', 'pending_review');

  res.json({
    detections: data ?? [],
    pending_count: pendingCount ?? 0,
    last_scan_at: user?.gmail_last_scan_at ?? null,
    gmail_connected: !!user?.gmail_connected_at,
    plan_locked: false,
  });
});

// ── POST /email-detections/scan-now ──────────────────────────────────────────
// Manually trigger a Gmail scan for the requesting user (rate-limited: 1/60s)
router.post('/scan-now', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!hasFeature('gmail_scan', (req as any).userPlan ?? 'basic')) {
    res.status(403).json({ error: 'PLAN_REQUIRED', message: 'Gmail scan requires Starter plan or higher', statusCode: 403 });
    return;
  }

  const lastCall = scanCooldowns.get(req.userId!);
  if (lastCall && Date.now() - lastCall < 60_000) {
    const waitSecs = Math.ceil((60_000 - (Date.now() - lastCall)) / 1000);
    res.status(429).json({ error: 'RATE_LIMITED', message: `Please wait ${waitSecs}s before scanning again`, statusCode: 429 });
    return;
  }

  const { data: user } = await supabase
    .from('users')
    .select('gmail_access_token, gmail_refresh_token, gmail_connected_at, gmail_last_scan_at, notification_preferences(gmail_auto_apply, gmail_auto_apply_threshold)')
    .eq('id', req.userId!)
    .single();

  if (!user?.gmail_access_token || !user?.gmail_connected_at) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Gmail not connected', statusCode: 422 });
    return;
  }

  scanCooldowns.set(req.userId!, Date.now());

  const sinceDate = user.gmail_last_scan_at ? new Date(user.gmail_last_scan_at) : undefined;
  const results = await scanInbox(user.gmail_access_token, user.gmail_refresh_token, sinceDate);

  let newDetections = 0;
  const prefs = (user as any).notification_preferences?.[0];
  const autoApply = prefs?.gmail_auto_apply ?? false;
  const threshold = prefs?.gmail_auto_apply_threshold ?? 0.90;

  for (const result of results) {
    // Attempt insert — unique index on (user_id, gmail_message_id) prevents duplicates
    const row = {
      user_id: req.userId!,
      gmail_message_id: result.gmailMessageId,
      source: 'gmail',
      detected_type: result.type,
      confidence: result.confidence,
      raw_subject: result.rawSubject,
      raw_sender: result.rawSender,
      raw_sender_email: result.rawSenderEmail,
      raw_snippet: result.rawSnippet,
      email_received_at: result.emailReceivedAt,
      extracted_data: result.extracted,
      status: 'pending_review',
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('email_detections')
      .insert(row)
      .select('id')
      .single();

    if (insertErr || !inserted) continue; // duplicate or error — skip
    newDetections++;

    // Auto-apply if Pro feature enabled, confidence meets threshold, and not a soft inquiry
    if (
      autoApply &&
      result.confidence >= threshold &&
      result.type !== 'deal_inquiry' &&
      hasFeature('gmail_auto_apply', (req as any).userPlan ?? 'basic')
    ) {
      await applyDetection(inserted.id, req.userId!, result.type, result.extracted, supabase, 'auto_applied');
    }
  }

  await supabase
    .from('users')
    .update({ gmail_last_scan_at: new Date().toISOString() })
    .eq('id', req.userId!);

  res.json({ scanned: results.length, new_detections: newDetections });
});

// ── POST /email-detections/paste ─────────────────────────────────────────────
// Classify a manually pasted email and create a pending detection row
const PasteSchema = z.object({
  subject: z.string().min(1).max(500),
  body: z.string().max(50_000).default(''),
  from_email: z.string().email().optional(),
  from_name: z.string().max(200).optional(),
});

router.post('/paste', authenticate, validateBody(PasteSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!hasFeature('smart_inbox', (req as any).userPlan ?? 'basic')) {
    res.status(403).json({ error: 'PLAN_REQUIRED', message: 'Smart Inbox requires Starter plan or higher', statusCode: 403 });
    return;
  }

  const { subject, body, from_email, from_name } = req.body;
  const result = classifyEmail({ subject, body, fromEmail: from_email, fromName: from_name });

  const { data, error } = await supabase
    .from('email_detections')
    .insert({
      user_id: req.userId!,
      source: 'manual',
      detected_type: result.type,
      confidence: result.confidence,
      raw_subject: subject,
      raw_sender: from_name ? `${from_name} <${from_email ?? ''}>` : (from_email ?? ''),
      raw_sender_email: from_email ?? null,
      raw_snippet: body.slice(0, 300),
      email_received_at: new Date().toISOString(),
      extracted_data: { ...result.extracted, reasons: result.reasons },
      status: 'pending_review',
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', statusCode: 500 });
    return;
  }

  res.status(201).json({ detection: data, classification: result });
});

// ── PUT /email-detections/:id/accept ─────────────────────────────────────────
// User accepts a detection — creates the linked record
const AcceptSchema = z.object({
  brand_name: z.string().max(200).optional(),
  amount: z.number().positive().optional(),
  tds_rate: z.number().min(0).max(100).optional(),
  tan: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
  invoice_id: z.string().uuid().optional(),   // user can pick which invoice to mark paid
  expense_category: z.enum(['equipment','software','travel','props','marketing','team','subscription','other']).optional(),
}).optional();

router.put('/:id/accept', authenticate, validateBody(AcceptSchema ?? z.object({})), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!hasFeature('smart_inbox', (req as any).userPlan ?? 'basic')) {
    res.status(403).json({ error: 'PLAN_REQUIRED', statusCode: 403 });
    return;
  }

  const { data: detection, error: fetchErr } = await supabase
    .from('email_detections')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .eq('status', 'pending_review')
    .single();

  if (fetchErr || !detection) {
    res.status(404).json({ error: 'NOT_FOUND', statusCode: 404 });
    return;
  }

  // Merge user overrides with extracted data
  const overrides = req.body ?? {};
  const merged = { ...detection.extracted_data, ...overrides };

  const createdRecord = await applyDetection(
    detection.id,
    req.userId!,
    detection.detected_type,
    merged,
    supabase,
    'accepted',
    overrides.invoice_id,
    overrides.expense_category,
  );

  res.json({ detection: { ...detection, status: 'accepted' }, created_record: createdRecord });
});

// ── PUT /email-detections/:id/reject ─────────────────────────────────────────
router.put('/:id/reject', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { error } = await supabase
    .from('email_detections')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', statusCode: 500 });
    return;
  }
  res.json({ ok: true });
});

// ── Apply detection logic ─────────────────────────────────────────────────────
// Shared between scan-now (auto-apply) and PUT /:id/accept (user confirm)
async function applyDetection(
  detectionId: string,
  userId: string,
  detectedType: string,
  data: Record<string, any>,
  db: typeof supabase,
  finalStatus: 'accepted' | 'auto_applied',
  preferredInvoiceId?: string,
  expenseCategory?: string,
): Promise<Record<string, any> | null> {
  const now = new Date().toISOString();
  let createdRecord: Record<string, any> | null = null;
  const updates: Record<string, any> = {
    status: finalStatus,
    reviewed_at: now,
  };

  try {
    if (detectedType === 'payment_received') {
      // Find matching unpaid sent invoice by amount (±1%)
      let invoiceId = preferredInvoiceId;
      if (!invoiceId && data.amount) {
        const paise = Math.round(data.amount * 100);
        const { data: invoices } = await db
          .from('invoices')
          .select('id, invoice_number, total_amount, brand_name')
          .eq('user_id', userId)
          .eq('status', 'sent')
          .gte('total_amount', paise - paise * 0.01)
          .lte('total_amount', paise + paise * 0.01)
          .limit(1);
        invoiceId = invoices?.[0]?.id;
      }

      if (invoiceId) {
        await db.from('invoices').update({ status: 'paid' }).eq('id', invoiceId).eq('user_id', userId);
        updates.linked_invoice_id = invoiceId;
      }

      // Log income entry regardless of whether an invoice matched
      if (data.amount) {
        const today = new Date();
        const fy = today.getMonth() >= 3
          ? `${today.getFullYear()}-${String(today.getFullYear() + 1).slice(-2)}`
          : `${today.getFullYear() - 1}-${String(today.getFullYear()).slice(-2)}`;
        const qtr = [0,1,2].includes(today.getMonth()) ? 'Q4' :
                    [3,4,5].includes(today.getMonth()) ? 'Q1' :
                    [6,7,8].includes(today.getMonth()) ? 'Q2' : 'Q3';

        const { data: income } = await db.from('income').insert({
          user_id: userId,
          source: 'brand_deal',
          amount: data.amount,
          description: data.description ?? data.brand_name ?? 'Payment detected via Smart Inbox',
          income_date: new Date().toISOString().split('T')[0],
          financial_year: fy,
          quarter: qtr,
          extracted_data: { detection_id: detectionId },
        }).select().single();

        updates.linked_income_id = income?.id;
        createdRecord = income;
      }

    } else if (detectedType === 'deal_confirmed' || detectedType === 'deal_inquiry') {
      const { data: deal } = await db.from('deals').insert({
        user_id: userId,
        brand_name: data.brand_name ?? 'Unknown Brand',
        brand_contact_email: data.contact_email ?? null,
        deal_value: data.amount ?? 0,
        status: 'inquiry',
        notes: `Added from Smart Inbox (${detectedType === 'deal_confirmed' ? 'confirmed' : 'soft inquiry'})`,
        extracted_data: { detection_id: detectionId },
      }).select().single();

      updates.linked_deal_id = deal?.id;
      createdRecord = deal;

    } else if (detectedType === 'tds_deduction') {
      const tdsAmount = data.amount && data.tds_rate
        ? data.amount * (data.tds_rate / 100)
        : data.tds_amount ?? 0;

      const today = new Date();
      const fy = today.getMonth() >= 3
        ? `${today.getFullYear()}-${String(today.getFullYear() + 1).slice(-2)}`
        : `${today.getFullYear() - 1}-${String(today.getFullYear()).slice(-2)}`;

      const { data: tds } = await db.from('tds_records').insert({
        user_id: userId,
        brand_name: data.brand_name ?? 'Unknown Brand',
        brand_tan: data.tan ?? null,
        invoice_amount: data.amount ?? 0,
        tds_rate: data.tds_rate ?? 10,
        tds_amount: tdsAmount,
        received_amount: data.amount ? data.amount - tdsAmount : 0,
        form_16a_status: 'awaiting',
        financial_year: fy,
        payment_date: new Date().toISOString().split('T')[0],
        extracted_data: { detection_id: detectionId },
      }).select().single();

      updates.linked_tds_id = tds?.id;
      createdRecord = tds;

    } else if (detectedType === 'expense') {
      const today = new Date();
      const fy = today.getMonth() >= 3
        ? `${today.getFullYear()}-${String(today.getFullYear() + 1).slice(-2)}`
        : `${today.getFullYear() - 1}-${String(today.getFullYear()).slice(-2)}`;

      const { data: expense } = await db.from('expenses').insert({
        user_id: userId,
        category: expenseCategory ?? 'subscription',
        amount: data.amount ?? 0,
        description: data.description ?? 'Detected via Smart Inbox',
        expense_date: new Date().toISOString().split('T')[0],
        financial_year: fy,
        extracted_data: { detection_id: detectionId },
      }).select().single();

      createdRecord = expense;

    } else if (detectedType === 'form_16a') {
      // Update the most recent TDS record from this brand with form_16a_status = received
      const brandName = data.brand_name;
      if (brandName) {
        await db.from('tds_records')
          .update({ form_16a_status: 'received' })
          .eq('user_id', userId)
          .ilike('brand_name', `%${brandName}%`)
          .in('form_16a_status', ['awaiting', 'requested']);
      }
      createdRecord = { updated: true, brand: brandName };
    }

    // Update detection status
    await db.from('email_detections').update(updates).eq('id', detectionId);

  } catch (err) {
    console.error('[APPLY_DETECTION] Error:', err);
  }

  return createdRecord;
}

export default router;
