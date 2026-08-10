import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import {
  calculateGst,
  getFinancialYear,
  getFYCode,
  VALID_GST_RATES,
  CREATOR_GST_CONFIG,
} from '../services/invoiceService.js';
import { generateInvoicePdf } from '../services/pdfService.js';
import { PLAN_LIMITS, Plan } from '../config/plans.js';

const router = Router();

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ── Public route: payment confirmation by brand ──────────────────────────────
// Must be defined BEFORE router.use(authenticate) to skip auth middleware
import type { Request as ExpressRequest } from 'express';
router.get('/confirm-payment/:token', async (req: ExpressRequest, res: Response): Promise<void> => {
  const { token } = req.params;

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, invoice_number, brand_name, total_amount, user_id, status, payment_confirm_expires_at')
    .eq('payment_confirm_token', token)
    .maybeSingle();

  const html404 = (msg: string) => `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;background:#07080F;color:#F0F1F8;padding:32px;"><h2>${msg}</h2><p style="color:#64748b;">This payment confirmation link is no longer valid.</p></body></html>`;

  if (!inv) { res.status(200).send(html404('Link expired or invalid')); return; }
  if (inv.status === 'paid') { res.status(200).send(html404('✓ Already paid')); return; }
  if (inv.payment_confirm_expires_at && new Date(inv.payment_confirm_expires_at) < new Date()) {
    res.status(200).send(html404('Link expired'));
    return;
  }

  await supabase.from('invoices').update({
    status: 'paid',
    payment_confirm_token: null,
    payment_confirmed_by_brand: true,
  }).eq('id', inv.id);

  const user = await getUser(inv.user_id);
  if (user) {
    const { sendPaymentConfirmedEmail } = await import('../services/emailService.js');
    const amount = `₹${(inv.total_amount / 100).toLocaleString('en-IN')}`;
    await sendPaymentConfirmedEmail(user.email, {
      recipientName: user.name,
      invoiceNumber: inv.invoice_number,
      amount,
      brandName: inv.brand_name,
      creatorName: user.name,
    }).catch(() => null);
  }

  res.status(200).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;background:#07080F;color:#F0F1F8;padding:32px;"><div style="font-size:48px;margin-bottom:16px;">✓</div><h2 style="color:#22c55e;margin-bottom:8px;">Payment Confirmed</h2><p style="color:#94a3b8;">Invoice ${inv.invoice_number} payment confirmed. The creator has been notified.</p><p style="margin-top:32px;font-size:12px;color:#64748b;">Powered by Kcreatio</p></body></html>`);
});

// All routes below require authentication
router.use(authenticate);

const CreateInvoiceSchema = z.object({
  brandName: z.string().min(1).max(200).trim(),
  brandGstin: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format').optional().or(z.literal('')),
  brandAddress: z.string().min(1).max(500).trim(),
  brandStateCode: z.string().length(2),
  brandPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional().or(z.literal('')),
  serviceDescription: z.string().min(5).max(500).trim().default(CREATOR_GST_CONFIG.serviceDescription),
  baseAmount: z.number().positive().max(9999999),
  gstRate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]).default(18),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dealId: z.string().uuid().optional(),
  notes: z.string().max(1000).trim().optional(),
  // Extended fields
  sacCode: z.string().max(10).optional(),
  placeOfSupply: z.string().length(2).optional(),
  reverseCharge: z.enum(['Yes', 'No']).default('No'),
  templateId: z.string().max(20).default('classic'),
  paymentTerms: z.string().max(100).default('Net 30'),
  // Bank details
  includeBankDetails: z.boolean().default(false),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(30).optional(),
  ifscCode: z.string().max(11).optional(),
  accountHolderName: z.string().max(200).optional(),
  upiId: z.string().max(100).optional(),
  // Terms
  includeTerms: z.boolean().default(false),
  termsText: z.string().max(5000).optional(),
  // Signatory
  includeSignatory: z.boolean().default(false),
  signatoryName: z.string().max(200).optional(),
  signatoryImageUrl: z.string().optional(),
  sellerBusinessName: z.string().max(200).optional(),
  // Contact fields
  brandEmail: z.string().email().optional().or(z.literal('')),
  brandPhone: z.string().max(20).optional(),
  // UPI QR
  includeUpi: z.boolean().default(false),
  upiScannerUrl: z.string().optional(),
});

// GET /invoices/next-number — must come before /:id routes
router.get('/next-number', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await getUser(req.userId!);
  if (!user) { res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' }); return; }

  const fy = getFinancialYear(new Date());
  const fyCode = getFYCode(fy);
  const prefix = user.invoice_prefix || 'INV';

  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.userId!)
    .like('invoice_number', `${prefix}/${fyCode}/%`);

  const nextSeq = String((count || 0) + 1).padStart(4, '0');
  res.json({ invoiceNumber: `${prefix}/${fyCode}/${nextSeq}` });
});

// GET /invoices
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, fy, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (status) query = query.eq('status', status);
  if (fy) query = query.eq('financial_year', fy);

  const { data, error, count } = await query;
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }

  res.json({ invoices: data, total: count, page: parseInt(page), limit: parseInt(limit) });
});

// POST /invoices
router.post('/', validateBody(CreateInvoiceSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;

  // ── Plan enforcement (runs before DB calls) ───────────────────────────────
  const plan = (req.userPlan || 'basic') as Plan;
  const limits = PLAN_LIMITS[plan];

  // Template restriction (free: only classic/modern/compact) — no DB needed
  if (limits.free_templates !== null) {
    const templateId = body.templateId || 'classic';
    if (!limits.free_templates.includes(templateId)) {
      res.status(403).json({
        error: 'PLAN_REQUIRED',
        message: 'This invoice template requires Starter plan or higher.',
        required_plan: 'starter',
      });
      return;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const user = await getUser(req.userId!);
  if (!user) { res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' }); return; }

  // Invoice monthly quota (free: 5/month)
  if (limits.invoices_monthly !== null) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .gte('created_at', startOfMonth.toISOString());
    if ((count ?? 0) >= limits.invoices_monthly) {
      res.status(403).json({
        error: 'QUOTA_EXCEEDED',
        message: `Free plan allows ${limits.invoices_monthly} invoices per month. Upgrade to Starter for unlimited invoices.`,
        required_plan: 'starter',
        quota: { limit: limits.invoices_monthly, used: count, feature: 'invoices_monthly' },
      });
      return;
    }
  }

  // GSTIN state code cross-validation: first 2 digits must match brand's state code
  if (body.brandGstin && body.brandStateCode && body.brandGstin.slice(0, 2) !== body.brandStateCode) {
    res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: `Brand GSTIN state code (${body.brandGstin.slice(0, 2)}) does not match the selected brand state (${body.brandStateCode})`,
      field: 'brandGstin',
      statusCode: 422,
    });
    return;
  }

  const gst = calculateGst(body.baseAmount, body.gstRate, user.state_code || '', body.brandStateCode);

  const fy = getFinancialYear(new Date(body.invoiceDate));
  const fyCode = getFYCode(fy);
  const prefix = user.invoice_prefix || 'INV';

  // Get next sequence (atomic-ish — good enough for V1 solo user scale)
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.userId!)
    .like('invoice_number', `${prefix}/${fyCode}/%`);

  const seq = String((count || 0) + 1).padStart(4, '0');
  const invoiceNumber = `${prefix}/${fyCode}/${seq}`;

  const dueDate = body.dueDate || (() => {
    const d = new Date(body.invoiceDate + 'T00:00:00');
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      user_id: req.userId!,
      invoice_number: invoiceNumber,
      brand_name: body.brandName,
      brand_gstin: body.brandGstin || null,
      brand_address: body.brandAddress,
      brand_state_code: body.brandStateCode,
      brand_pan: body.brandPan || null,
      hsn_code: CREATOR_GST_CONFIG.hsnCode,
      service_description: body.serviceDescription,
      base_amount: gst.baseAmount,
      gst_rate: gst.gstRate,
      gst_amount: gst.gstAmount,
      total_amount: gst.totalAmount,
      supply_type: gst.supplyType,
      cgst_amount: gst.cgstAmount,
      sgst_amount: gst.sgstAmount,
      igst_amount: gst.igstAmount,
      status: 'draft',
      invoice_date: body.invoiceDate,
      due_date: dueDate,
      deal_id: body.dealId || null,
      notes: body.notes || null,
      financial_year: fy,
      // Extended fields
      sac_code: body.sacCode || CREATOR_GST_CONFIG.hsnCode,
      place_of_supply: body.placeOfSupply || null,
      reverse_charge: body.reverseCharge || 'No',
      template_id: body.templateId || 'classic',
      payment_terms: body.paymentTerms || 'Net 30',
      // Bank details
      include_bank_details: body.includeBankDetails || false,
      bank_name: body.bankName || null,
      account_number: body.accountNumber || null,
      ifsc_code: body.ifscCode || null,
      account_holder_name: body.accountHolderName || null,
      upi_id: body.upiId || null,
      // T&C
      include_terms: body.includeTerms || false,
      terms_text: body.termsText || null,
      // Signatory
      include_signatory: body.includeSignatory || false,
      signatory_name: body.signatoryName || null,
      signatory_image_url: body.signatoryImageUrl || null,
      seller_business_name: body.sellerBusinessName || null,
      // Contact fields
      brand_email: body.brandEmail || null,
      brand_phone: body.brandPhone || null,
      // UPI QR
      include_upi: body.includeUpi || false,
      upi_scanner_url: body.upiScannerUrl || null,
    })
    .select()
    .single();

  if (error || !invoice) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to create invoice' });
    return;
  }

  res.status(201).json({
    ...invoice,
    supplyType: gst.supplyType,
    cgstAmount: gst.cgstAmount,
    sgstAmount: gst.sgstAmount,
    igstAmount: gst.igstAmount,
  });
});

// GET /invoices/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!data) { res.status(404).json({ error: 'NOT_FOUND', message: 'Invoice not found' }); return; }
  res.json(data);
});

// GET /invoices/:id/pdf
router.get('/:id/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!invoice) { res.status(404).json({ error: 'NOT_FOUND', message: 'Invoice not found' }); return; }

  const user = await getUser(req.userId!);
  if (!user) { res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' }); return; }

  try {
    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      seller: {
        name: user.business_name || user.name,
        gstin: user.gstin,
        address: user.business_address,
        stateCode: user.state_code,
      },
      buyer: {
        name: invoice.brand_name,
        gstin: invoice.brand_gstin,
        address: invoice.brand_address,
        stateCode: invoice.brand_state_code,
      },
      serviceDescription: invoice.service_description,
      gst: {
        baseAmount: invoice.base_amount,
        gstRate: invoice.gst_rate,
        gstAmount: invoice.gst_amount,
        totalAmount: invoice.total_amount,
        supplyType: invoice.supply_type,
        cgstAmount: invoice.cgst_amount,
        sgstAmount: invoice.sgst_amount,
        igstAmount: invoice.igst_amount,
      },
      notes: invoice.notes,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number.replace(/\//g, '-')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to generate PDF' });
  }
});

// PUT /invoices/:id
router.put('/:id', validateBody(CreateInvoiceSchema.partial()), async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: existing } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!existing) { res.status(404).json({ error: 'NOT_FOUND', message: 'Invoice not found' }); return; }
  if (existing.status !== 'draft') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only draft invoices can be edited' });
    return;
  }

  const body = req.body;

  // GSTIN cross-validation on edit too
  if (body.brandGstin && body.brandStateCode && body.brandGstin.slice(0, 2) !== body.brandStateCode) {
    res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: `Brand GSTIN state code (${body.brandGstin.slice(0, 2)}) does not match the selected brand state (${body.brandStateCode})`,
      field: 'brandGstin',
      statusCode: 422,
    });
    return;
  }

  // Map camelCase body fields to snake_case DB columns (safe whitelist)
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  const fieldMap: Record<string, string> = {
    brandName: 'brand_name', brandGstin: 'brand_gstin', brandAddress: 'brand_address',
    brandStateCode: 'brand_state_code', brandPan: 'brand_pan',
    brandEmail: 'brand_email', brandPhone: 'brand_phone',
    serviceDescription: 'service_description', sacCode: 'sac_code',
    baseAmount: 'base_amount', gstRate: 'gst_rate', gstAmount: 'gst_amount',
    totalAmount: 'total_amount', supplyType: 'supply_type',
    cgstAmount: 'cgst_amount', sgstAmount: 'sgst_amount', igstAmount: 'igst_amount',
    invoiceDate: 'invoice_date', dueDate: 'due_date', notes: 'notes',
    placeOfSupply: 'place_of_supply', reverseCharge: 'reverse_charge',
    templateId: 'template_id', paymentTerms: 'payment_terms',
    includeBankDetails: 'include_bank_details', bankName: 'bank_name',
    accountNumber: 'account_number', ifscCode: 'ifsc_code',
    accountHolderName: 'account_holder_name', upiId: 'upi_id',
    includeUpi: 'include_upi', upiScannerUrl: 'upi_scanner_url',
    includeTerms: 'include_terms', termsText: 'terms_text',
    includeSignatory: 'include_signatory', signatoryName: 'signatory_name',
    signatoryImageUrl: 'signatory_image_url', sellerBusinessName: 'seller_business_name',
  };
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (body[camel] !== undefined) updates[snake] = body[camel];
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.json(data);
});

// DELETE /invoices/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: existing } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!existing) { res.status(404).json({ error: 'NOT_FOUND', message: 'Invoice not found' }); return; }
  if (existing.status !== 'draft') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only draft invoices can be deleted' });
    return;
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.status(204).send();
});

async function getUser(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('id, name, email, business_name, gstin, pan, business_address, state_code, invoice_prefix, phone, show_phone_on_invoice, invoice_phone, invoice_email, gmail_access_token, gmail_refresh_token, gmail_connected_email')
    .eq('id', userId)
    .maybeSingle();
  return data;
}


// POST /invoices/:id/send — send invoice via email to brand
router.post('/:id/send', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: inv } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!inv) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
  if (!inv.brand_email) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Add the brand email to this invoice before sending', statusCode: 422 });
    return;
  }

  const user = await getUser(req.userId!);
  if (!user) { res.status(404).json({ error: 'NOT_FOUND' }); return; }

  const { sendInvoiceEmail } = await import('../services/emailService.js');
  const { sendViaGmail } = await import('../services/gmailService.js');

  const amount = `₹${(inv.total_amount / 100).toLocaleString('en-IN')}`;
  const subject = `GST Invoice ${inv.invoice_number} from ${user.name}`;

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080F;color:#F0F1F8;border-radius:12px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#E8921A;">${user.business_name || user.name}</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">GST Invoice ${inv.invoice_number}</h2>
      <p style="color:#94a3b8;margin:0 0 8px;">Dear ${inv.brand_name},</p>
      <p style="color:#94a3b8;margin:0 0 24px;">Please find the GST invoice for <strong style="color:#F0F1F8;">${amount}</strong> for services rendered. Kindly process payment at your earliest convenience.</p>
      <p style="color:#64748b;font-size:12px;margin:0;">This is a GST-compliant invoice generated via Kcreatio.</p>
    </div>`;

  try {
    if (user.gmail_access_token) {
      // Send via creator's Gmail
      await sendViaGmail(user.gmail_access_token, user.gmail_refresh_token || null, {
        to: inv.brand_email,
        subject,
        html,
        fromName: user.business_name || user.name,
        fromEmail: user.gmail_connected_email || undefined,
      });
    } else {
      // Send via Resend
      await sendInvoiceEmail(inv.brand_email, {
        creatorName: user.business_name || user.name,
        brandName: inv.brand_name,
        invoiceNumber: inv.invoice_number,
        amount,
      });
    }

    // Update invoice status to 'sent' if it was draft
    if (inv.status === 'draft') {
      await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', inv.id);
    }

    res.json({ success: true, sentTo: inv.brand_email });
  } catch (err: any) {
    res.status(500).json({ error: 'EMAIL_FAILED', message: 'Failed to send email. Check your email configuration.', statusCode: 500 });
  }
});

// POST /invoices/:id/payment-confirm-token — generate one-time brand confirmation link
router.post('/:id/payment-confirm-token', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: inv } = await supabase
    .from('invoices')
    .select('id, invoice_number, status')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!inv) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
  if (inv.status === 'paid') { res.status(422).json({ error: 'ALREADY_PAID', message: 'Invoice is already marked paid', statusCode: 422 }); return; }

  const rawToken = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('invoices').update({
    payment_confirm_token: rawToken,
    payment_confirm_expires_at: expiresAt,
  }).eq('id', inv.id);

  const confirmUrl = `${process.env.FRONTEND_URL}/confirm-payment/${rawToken}`;
  res.json({ url: confirmUrl, expiresAt });
});

export default router;
