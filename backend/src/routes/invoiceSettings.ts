import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { PLAN_LIMITS, Plan } from '../config/plans.js';

const router = Router();
router.use(authenticate);

// ── Zod Schemas ───────────────────────────────────────────────────────────────
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const BankAccountSchema = z.object({
  settingType: z.literal('bank_account'),
  name: z.string().min(1).max(100).trim(),
  bankName: z.string().min(1).max(100).trim(),
  accountNumber: z.string().min(5).max(30).trim(),
  ifscCode: z.string().regex(IFSC_REGEX, 'Invalid IFSC code format (e.g. HDFC0001234)'),
  accountHolderName: z.string().min(1).max(200).trim(),
  upiId: z.string().max(100).trim().optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
});

const TermsSchema = z.object({
  settingType: z.literal('terms'),
  name: z.string().min(1).max(100).trim(),
  termsText: z.string().min(1).max(5000).trim(),
  isDefault: z.boolean().default(false),
});

const SignatorySchema = z.object({
  settingType: z.literal('signatory'),
  name: z.string().min(1).max(100).trim(),
  signatoryName: z.string().min(1).max(200).trim(),
  signatoryImageUrl: z.string().url().optional().or(z.literal('')),
});

const UpiSchema = z.object({
  settingType: z.literal('upi'),
  name: z.string().min(1).max(100).trim(),
  upiId: z.string().min(3).max(100).trim(),
  scannerImageUrl: z.string().url().optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
});

// Partial versions for PUT (all fields optional except settingType for routing)
const UpdateBankSchema = BankAccountSchema.partial().extend({ settingType: z.literal('bank_account') });
const UpdateTermsSchema = TermsSchema.partial().extend({ settingType: z.literal('terms') });
const UpdateSignatorySchema = SignatorySchema.partial().extend({ settingType: z.literal('signatory') });
const UpdateUpiSchema = UpiSchema.partial().extend({ settingType: z.literal('upi') });

const CreateSchema = z.discriminatedUnion('settingType', [
  BankAccountSchema,
  TermsSchema,
  SignatorySchema,
  UpiSchema,
]);

const UpdateSchema = z.discriminatedUnion('settingType', [
  UpdateBankSchema,
  UpdateTermsSchema,
  UpdateSignatorySchema,
  UpdateUpiSchema,
]);

// ── Helper ────────────────────────────────────────────────────────────────────
function buildInsert(userId: string, body: any) {
  return {
    user_id: userId,
    setting_type: body.settingType,
    name: body.name,
    is_default: body.isDefault || false,
    bank_name: body.bankName || null,
    account_number: body.accountNumber || null,
    ifsc_code: body.ifscCode || null,
    account_holder_name: body.accountHolderName || null,
    upi_id: body.upiId || null,
    terms_text: body.termsText || null,
    signatory_name: body.signatoryName || null,
    signatory_image_url: body.signatoryImageUrl || null,
    scanner_image_url: body.scannerImageUrl || null,
    updated_at: new Date().toISOString(),
  };
}

// ── GET /invoice-settings ─────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('invoice_settings')
    .select('*')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.json({ settings: data });
});

// ── POST /invoice-settings ────────────────────────────────────────────────────
router.post('/', validateBody(CreateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;

  // Plan-aware limits for invoice settings
  const plan = (req.userPlan || 'basic') as Plan;
  const planLimits = PLAN_LIMITS[plan];

  if (body.settingType === 'bank_account') {
    const { count } = await supabase
      .from('invoice_settings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .eq('setting_type', 'bank_account');
    if ((count ?? 0) >= planLimits.bank_accounts) {
      res.status(403).json({
        error: 'QUOTA_EXCEEDED',
        message: plan === 'basic'
          ? 'Free plan allows 1 bank account. Upgrade to Starter for up to 5.'
          : 'Maximum 5 bank accounts allowed.',
        required_plan: plan === 'basic' ? 'starter' : null,
      });
      return;
    }
  }

  if (body.settingType === 'upi') {
    const { count } = await supabase
      .from('invoice_settings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .eq('setting_type', 'upi');
    if ((count ?? 0) >= planLimits.upi_ids) {
      res.status(403).json({
        error: 'QUOTA_EXCEEDED',
        message: plan === 'basic'
          ? 'Free plan allows 1 UPI ID. Upgrade to Starter for up to 5.'
          : 'Maximum 5 UPI IDs allowed.',
        required_plan: plan === 'basic' ? 'starter' : null,
      });
      return;
    }
  }

  if (body.settingType === 'terms') {
    const { count } = await supabase
      .from('invoice_settings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .eq('setting_type', 'terms');
    if ((count ?? 0) >= planLimits.tc_profiles) {
      res.status(403).json({
        error: 'QUOTA_EXCEEDED',
        message: plan === 'basic'
          ? 'Free plan allows 1 T&C profile. Upgrade to Starter for up to 5.'
          : 'Maximum 5 T&C profiles allowed.',
        required_plan: plan === 'basic' ? 'starter' : null,
      });
      return;
    }
  }

  // Signatory: only one allowed — delete existing before inserting
  if (body.settingType === 'signatory') {
    await supabase.from('invoice_settings')
      .delete()
      .eq('user_id', req.userId!)
      .eq('setting_type', 'signatory');
  }

  // If setting as default: clear existing defaults of same type
  if (body.isDefault) {
    await supabase.from('invoice_settings')
      .update({ is_default: false })
      .eq('user_id', req.userId!)
      .eq('setting_type', body.settingType);
  }

  const { data, error } = await supabase
    .from('invoice_settings')
    .insert(buildInsert(req.userId!, body))
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to create setting' });
    return;
  }
  res.status(201).json(data);
});

// ── PUT /invoice-settings/:id ─────────────────────────────────────────────────
router.put('/:id', validateBody(UpdateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: existing } = await supabase
    .from('invoice_settings')
    .select('id, setting_type')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!existing) { res.status(404).json({ error: 'NOT_FOUND', message: 'Setting not found' }); return; }

  const body = req.body;

  // If setting as default: clear others of same type
  if (body.isDefault) {
    await supabase.from('invoice_settings')
      .update({ is_default: false })
      .eq('user_id', req.userId!)
      .eq('setting_type', existing.setting_type);
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.isDefault !== undefined) updates.is_default = body.isDefault;
  if (body.bankName !== undefined) updates.bank_name = body.bankName;
  if (body.accountNumber !== undefined) updates.account_number = body.accountNumber;
  if (body.ifscCode !== undefined) updates.ifsc_code = body.ifscCode;
  if (body.accountHolderName !== undefined) updates.account_holder_name = body.accountHolderName;
  if (body.upiId !== undefined) updates.upi_id = body.upiId;
  if (body.termsText !== undefined) updates.terms_text = body.termsText;
  if (body.signatoryName !== undefined) updates.signatory_name = body.signatoryName;
  if (body.signatoryImageUrl !== undefined) updates.signatory_image_url = body.signatoryImageUrl;
  if (body.scannerImageUrl !== undefined) updates.scanner_image_url = body.scannerImageUrl;

  const { data, error } = await supabase
    .from('invoice_settings')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to update setting' });
    return;
  }
  res.json(data);
});

// ── DELETE /invoice-settings/:id ──────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  // Fetch before deleting to check ownership + get metadata
  const { data: existing } = await supabase
    .from('invoice_settings')
    .select('id, setting_type, is_default')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!existing) { res.status(404).json({ error: 'NOT_FOUND', message: 'Setting not found' }); return; }

  const { error } = await supabase
    .from('invoice_settings')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }

  // If the deleted item was the default, promote the next one of the same type
  if (existing.is_default) {
    const { data: next } = await supabase
      .from('invoice_settings')
      .select('id')
      .eq('user_id', req.userId!)
      .eq('setting_type', existing.setting_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (next) {
      await supabase.from('invoice_settings')
        .update({ is_default: true })
        .eq('id', next.id);
    }
  }

  res.status(204).send();
});

// ── POST /invoice-settings/:id/set-default ────────────────────────────────────
router.post('/:id/set-default', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: target } = await supabase
    .from('invoice_settings')
    .select('id, setting_type')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!target) { res.status(404).json({ error: 'NOT_FOUND', message: 'Setting not found' }); return; }

  // Clear all defaults for this user+type
  await supabase.from('invoice_settings')
    .update({ is_default: false })
    .eq('user_id', req.userId!)
    .eq('setting_type', target.setting_type);

  // Set this one as default
  const { data, error } = await supabase
    .from('invoice_settings')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to set default' });
    return;
  }
  res.json(data);
});

export default router;
