import { Router, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { partialWithoutDefaults } from '../lib/zodUtils.js';
import { validateBody } from '../middleware/validateBody.js';
import { getFrontendUrl } from '../lib/env.js';
import { markPaid, MarkPaidSchema } from '../services/paymentService.js';
import { logInvoiceEvent } from '../services/auditLog.js';
import { nextRecurringDate } from '../lib/dates.js';
import {
  calculateInvoiceTotals,
  nextInvoiceNumber,
  getFinancialYear,
  getFYCode,
  CREATOR_GST_CONFIG,
  InvoiceLine,
} from '../services/invoiceService.js';
import { GST_RATES, DEFAULT_GST_RATE, checkGstin, GSTIN_MESSAGES, supplierStateCode, FOREIGN_STATE_CODE } from '../lib/gst.js';
import { generateInvoicePdf } from '../services/pdfService.js';
import { generateInvoicePdfWithPuppeteer, warmBrowser } from '../services/puppeteerPdfService.js';
import { PLAN_LIMITS, Plan } from '../config/plans.js';

const router = Router();

const gstinField = z.string().trim().toUpperCase().superRefine((v, ctx) => {
  const problem = checkGstin(v);
  if (problem) ctx.addIssue({ code: 'custom', message: `Brand ${GSTIN_MESSAGES[problem]}` });
});
const gstRateField = z.number().refine(r => (GST_RATES as readonly number[]).includes(r), {
  message: `GST rate must be one of ${GST_RATES.join(', ')}%`,
});
const LineItemSchema = z.object({
  description: z.string().trim().min(1, 'Describe each service line').max(500),
  sacCode: z.string().max(10).nullish(),
  amount: z.number().positive('Each line needs an amount above ₹0').max(9999999),
  gstRate: gstRateField,
});

const SUPPLIER_STATE_MISSING = {
  error: 'SUPPLIER_STATE_MISSING',
  message: 'Add your GSTIN in Settings → Tax Profile (or your state, if you aren’t GST-registered) so we can charge the right GST.',
  field: 'supplierState',
  statusCode: 422,
};
const DATA_URL_REGEX = /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;

function isValidImageField(val: string | undefined | null): boolean {
  if (!val) return true;
  if (DATA_URL_REGEX.test(val)) return true;
  const supabaseUrl = process.env.SUPABASE_URL || '';
  return supabaseUrl.length > 0 &&
    val.startsWith(supabaseUrl) &&
    val.includes('/storage/v1/object/public/invoice-signatures/');
}

const pdfRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).userId || 'anonymous',
  message: { error: 'RATE_LIMITED', message: 'PDF generation limit reached — please try again in an hour' },
});

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

  // The brand's word only flags the invoice. The creator records the payment (with the TDS
  // actually deducted) so income and TDS are logged correctly.
  await supabase.from('invoices').update({
    payment_confirm_token: null,
    payment_confirmed_by_brand: true,
  }).eq('id', inv.id);
  await logInvoiceEvent(null, inv.user_id, inv, 'brand_confirmed');

  const user = await getUser(inv.user_id);
  if (user) {
    const { sendPaymentConfirmedEmail } = await import('../services/emailService.js');
    const amount = `₹${Number(inv.total_amount).toLocaleString('en-IN')}`;
    await sendPaymentConfirmedEmail(user.email, {
      recipientName: user.name,
      invoiceNumber: inv.invoice_number,
      amount,
      brandName: inv.brand_name,
      creatorName: user.name,
    }).catch(() => null);
  }

  res.status(200).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;background:#07080F;color:#F0F1F8;padding:32px;"><div style="font-size:48px;margin-bottom:16px;">✓</div><h2 style="color:#22c55e;margin-bottom:8px;">Thanks for confirming</h2><p style="color:#94a3b8;">We've told the creator that invoice ${inv.invoice_number} has been paid.</p><p style="margin-top:32px;font-size:12px;color:#64748b;">Powered by Kcreatio</p></body></html>`);
});

// All routes below require authentication
router.use(authenticate);

const CreateInvoiceSchema = z.object({
  brandName: z.string().min(1).max(200).trim(),
  brandGstin: gstinField.nullish().or(z.literal('')),
  brandAddress: z.string().min(1).max(500).trim(),
  brandStateCode: z.string().length(2),
  brandPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).nullish().or(z.literal('')),
  serviceDescription: z.string().min(5).max(500).trim().default(CREATOR_GST_CONFIG.serviceDescription),
  // Either lineItems (preferred — amounts before discount) or a single baseAmount (after discount).
  lineItems: z.array(LineItemSchema).min(1).max(30).nullish(),
  baseAmount: z.number().positive('Enter an amount above ₹0').max(9999999).optional(),
  gstRate: gstRateField.default(DEFAULT_GST_RATE),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  dealId: z.string().uuid().nullish(),
  notes: z.string().max(1000).trim().nullish(),
  // Extended fields
  sacCode: z.string().max(10).nullish(),
  placeOfSupply: z.string().length(2).nullish(),
  reverseCharge: z.enum(['Yes', 'No']).default('No'),
  templateId: z.string().max(20).default('classic'),
  paymentTerms: z.string().max(100).default('Net 30'),
  purchaseOrderNumber: z.string().max(100).nullish(),
  discountValue: z.number().min(0).max(9999999).nullish(),
  discountType: z.enum(['flat', 'percent']).nullish(),
  // Bank details
  includeBankDetails: z.boolean().default(false),
  bankName: z.string().max(100).nullish(),
  accountNumber: z.string().max(30).nullish(),
  ifscCode: z.string().max(11).nullish(),
  accountHolderName: z.string().max(200).nullish(),
  upiId: z.string().max(100).nullish(),
  // Terms
  includeTerms: z.boolean().default(false),
  termsText: z.string().max(5000).nullish(),
  // Signatory
  includeSignatory: z.boolean().default(true),
  signatoryName: z.string().max(200).nullish(),
  signatoryImageUrl: z.string().nullish().refine(isValidImageField, { message: 'signatoryImageUrl must be a base64 data URL or Supabase storage URL' }),
  sellerBusinessName: z.string().max(200).nullish(),
  // Contact fields
  brandEmail: z.string().email().nullish().or(z.literal('')),
  brandPhone: z.string().max(20).nullish(),
  // UPI QR
  includeUpi: z.boolean().default(false),
  upiScannerUrl: z.string().nullish().refine(isValidImageField, { message: 'upiScannerUrl must be a base64 data URL or Supabase storage URL' }),
  // Accent color override
  invoiceAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish().nullable(),
  // Export of services to a foreign client, zero-rated under the creator's LUT
  isExport: z.boolean().default(false),
  exportCurrency: z.string().length(3).toUpperCase().nullish(),
  // Payment reminders to the brand and recurring invoices
  remindersEnabled: z.boolean().default(false),
  recurring: z.enum(['monthly', 'quarterly']).nullish(),
});

const LUT_MISSING = {
  error: 'LUT_REQUIRED',
  message: 'Add your LUT reference in Settings → Tax Profile to invoice foreign clients without IGST.',
  field: 'isExport',
  statusCode: 422,
};

// GET /invoices/warm — pre-warms Puppeteer browser (called on page load from frontend)
router.get('/warm', async (_req: AuthRequest, res: Response): Promise<void> => {
  warmBrowser().catch(() => {});
  res.json({ ok: true });
});

// GET /invoices/next-number — must come before /:id routes
router.get('/next-number', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await getUser(req.userId!);
  if (!user) { res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' }); return; }

  const fy = getFinancialYear(new Date());
  const fyCode = getFYCode(fy);
  const prefix = user.invoice_prefix || 'INV';

  res.json({ invoiceNumber: await nextInvoiceNumber(req.userId!, prefix, fyCode) });
});

// GET /invoices/brands — distinct past brands for party picker
router.get('/brands', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data } = await supabase
    .from('invoices')
    .select('brand_name, brand_gstin, brand_address, brand_state_code, brand_pan, brand_email, brand_phone')
    .eq('user_id', req.userId!)
    .not('brand_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!data) { res.json({ brands: [] }); return; }

  // Deduplicate by brand_name (keep most recent)
  const seen = new Set<string>();
  const brands = data.filter(b => {
    const key = (b.brand_name || '').toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);

  res.json({ brands });
});

// GET /invoices
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, fy, search, sort, dir, page = '1', limit = '20', offset: offsetParam } = req.query as Record<string, string>;
  const lim = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const offset = offsetParam !== undefined ? Math.max(parseInt(offsetParam) || 0, 0) : (Math.max(parseInt(page) || 1, 1) - 1) * lim;
  const SORTABLE = ['invoice_number', 'brand_name', 'base_amount', 'total_amount', 'status', 'invoice_date', 'created_at'];
  const sortCol = SORTABLE.includes(sort) ? sort : 'created_at';

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('user_id', req.userId!)
    .order(sortCol, { ascending: dir === 'asc' })
    .order('created_at', { ascending: false })
    .range(offset, offset + lim - 1);

  if (status && ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'].includes(status)) query = query.eq('status', status);
  if (fy) query = query.eq('financial_year', fy);
  if (search && search.trim()) {
    // Strip characters that would break PostgREST's or() filter syntax
    const term = search.trim().slice(0, 100).replace(/[,()*%\\]/g, ' ');
    query = query.or(`brand_name.ilike.%${term}%,invoice_number.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }

  res.json({ invoices: data, total: count, limit: lim, offset });
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

  // Invoice monthly quota — disabled: invoices are unlimited on every plan (Basic gets a watermarked PDF instead)
  // if (limits.invoices_monthly !== null) {
  //   const startOfMonth = new Date();
  //   startOfMonth.setDate(1);
  //   startOfMonth.setHours(0, 0, 0, 0);
  //   const { count } = await supabase
  //     .from('invoices')
  //     .select('id', { count: 'exact', head: true })
  //     .eq('user_id', req.userId!)
  //     .gte('created_at', startOfMonth.toISOString());
  //   if ((count ?? 0) >= limits.invoices_monthly) {
  //     res.status(403).json({
  //       error: 'QUOTA_EXCEEDED',
  //       message: `Basic plan allows ${limits.invoices_monthly} invoices per month. Upgrade to Starter for unlimited invoices.`,
  //       required_plan: 'starter',
  //       quota: { limit: limits.invoices_monthly, used: count, feature: 'invoices_monthly' },
  //     });
  //     return;
  //   }
  // }

  // GSTIN state code cross-validation: first 2 digits must match brand's state code
  if (!body.isExport && body.brandGstin && body.brandStateCode && body.brandGstin.slice(0, 2) !== body.brandStateCode) {
    res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: `Brand GSTIN state code (${body.brandGstin.slice(0, 2)}) does not match the selected brand state (${body.brandStateCode})`,
      field: 'brandGstin',
      statusCode: 422,
    });
    return;
  }

  const supplierState = supplierStateCode(user);
  if (!supplierState) { res.status(422).json(SUPPLIER_STATE_MISSING); return; }
  if (!body.lineItems?.length && !body.baseAmount) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Enter an amount above ₹0', field: 'baseAmount', statusCode: 422 });
    return;
  }
  const lines: InvoiceLine[] = body.lineItems?.length
    ? body.lineItems
    : [{ description: body.serviceDescription, sacCode: body.sacCode, amount: body.baseAmount, gstRate: body.gstRate }];
  // Old clients send baseAmount after discount; line items are always before discount.
  const discount = body.lineItems?.length ? { value: body.discountValue, type: body.discountType } : {};
  if (body.isExport && !user.lut_number) { res.status(422).json(LUT_MISSING); return; }
  const gst = calculateInvoiceTotals(lines, discount, supplierState,
    body.isExport ? FOREIGN_STATE_CODE : body.placeOfSupply || body.brandStateCode, { exportUnderLut: body.isExport });

  const fy = getFinancialYear(new Date(body.invoiceDate));
  const fyCode = getFYCode(fy);
  const prefix = user.invoice_prefix || 'INV';

  let invoiceNumber = await nextInvoiceNumber(req.userId!, prefix, fyCode);

  const dueDate = body.dueDate || (() => {
    const d = new Date(body.invoiceDate + 'T00:00:00');
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();

  // Only link deals that belong to this user
  if (body.dealId) {
    const { data: deal } = await supabase.from('deals').select('id').eq('id', body.dealId).eq('user_id', req.userId!).maybeSingle();
    if (!deal) body.dealId = null;
  }

  const insertInvoice = () => supabase
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
      service_description: body.lineItems?.length ? body.lineItems[0].description : body.serviceDescription,
      line_items: gst.lines,
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
      purchase_order_number: body.purchaseOrderNumber || null,
      discount_value: body.discountValue ?? null,
      discount_type: body.discountType || null,
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
      invoice_accent_color: body.invoiceAccentColor || null,
      is_export: Boolean(body.isExport),
      export_currency: body.isExport ? body.exportCurrency || 'USD' : null,
      lut_number: body.isExport ? user.lut_number : null,
      reminders_enabled: Boolean(body.remindersEnabled),
      recurring: body.recurring || null,
      next_recurring_on: body.recurring ? nextRecurringDate(body.invoiceDate, body.recurring) : null,
    })
    .select()
    .single();

  let { data: invoice, error } = await insertInvoice();
  // Unique (user_id, invoice_number) clash — e.g. two tabs saving at once — take the next number and retry
  for (let attempt = 0; attempt < 3 && error?.code === '23505'; attempt++) {
    invoiceNumber = await nextInvoiceNumber(req.userId!, prefix, fyCode);
    ({ data: invoice, error } = await insertInvoice());
  }

  if (error || !invoice) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to create invoice' });
    return;
  }

  if (body.dealId) {
    await supabase.from('deals').update({ status: 'invoiced', updated_at: new Date().toISOString() })
      .eq('id', body.dealId).eq('user_id', req.userId!).in('status', ['inquiry', 'negotiating', 'active', 'delivered']);
  }

  await logInvoiceEvent(req, req.userId!, invoice, 'created', { total_amount: invoice.total_amount, deal_id: invoice.deal_id });

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
router.get('/:id/pdf', pdfRateLimit, async (req: AuthRequest, res: Response): Promise<void> => {
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
    const cacheKey = `${invoice.id}:${invoice.updated_at || invoice.created_at}`;
    const pdfBuffer = await generateInvoicePdfWithPuppeteer(invoice, user, cacheKey, req.userPlan);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number.replace(/\//g, '-')}.pdf"`);
    res.send(pdfBuffer);
  } catch (puppeteerErr) {
    console.warn('Puppeteer PDF failed, falling back to pdfmake:', puppeteerErr);
    try {
      const pdfBuffer = await generateInvoicePdf({
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        seller: {
          name: user.business_name || user.name,
          gstin: user.gstin,
          address: user.business_address,
          stateCode: supplierStateCode(user) ?? undefined,
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
  }
});

// GET /invoices/:id/export
router.get('/:id/export', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!invoice) { res.status(404).json({ error: 'NOT_FOUND', message: 'Invoice not found' }); return; }

  const filename = `${(invoice.invoice_number || 'invoice').replace(/\//g, '-')}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(invoice);
});

// PUT /invoices/:id
router.put('/:id', validateBody(partialWithoutDefaults(CreateInvoiceSchema)), async (req: AuthRequest, res: Response): Promise<void> => {
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
    templateId: 'template_id', paymentTerms: 'payment_terms', purchaseOrderNumber: 'purchase_order_number',
    discountValue: 'discount_value', discountType: 'discount_type',
    includeBankDetails: 'include_bank_details', bankName: 'bank_name',
    accountNumber: 'account_number', ifscCode: 'ifsc_code',
    accountHolderName: 'account_holder_name', upiId: 'upi_id',
    includeUpi: 'include_upi', upiScannerUrl: 'upi_scanner_url',
    includeTerms: 'include_terms', termsText: 'terms_text',
    includeSignatory: 'include_signatory', signatoryName: 'signatory_name',
    signatoryImageUrl: 'signatory_image_url', sellerBusinessName: 'seller_business_name',
    invoiceAccentColor: 'invoice_accent_color',
    exportCurrency: 'export_currency', remindersEnabled: 'reminders_enabled', recurring: 'recurring',
  };
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (body[camel] !== undefined) updates[snake] = body[camel];
  }

  // Amounts are always recomputed server-side — never trust client totals
  if (body.recurring !== undefined) updates.next_recurring_on = body.recurring ? nextRecurringDate(body.invoiceDate || new Date().toISOString().slice(0, 10), body.recurring) : null;
  const touchesTotals = ['lineItems', 'baseAmount', 'gstRate', 'brandStateCode', 'placeOfSupply', 'discountValue', 'discountType', 'isExport']
    .some(k => body[k] !== undefined);
  if (touchesTotals) {
    const { data: current } = await supabase
      .from('invoices')
      .select('base_amount, gst_rate, brand_state_code, place_of_supply, line_items, discount_value, discount_type, service_description, sac_code, is_export')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();
    const user = await getUser(req.userId!);
    const supplierState = user && supplierStateCode(user);
    if (!supplierState) { res.status(422).json(SUPPLIER_STATE_MISSING); return; }
    const isExport = body.isExport ?? Boolean(current?.is_export);
    if (isExport && !user?.lut_number) { res.status(422).json(LUT_MISSING); return; }
    updates.is_export = isExport;
    updates.lut_number = isExport ? user?.lut_number : null;
    const pos = isExport ? FOREIGN_STATE_CODE : body.placeOfSupply || body.brandStateCode || current?.place_of_supply || current?.brand_state_code;

    const storedLines: InvoiceLine[] | null = Array.isArray(current?.line_items)
      ? current.line_items.map((l: InvoiceLine) => ({ description: l.description, sacCode: l.sacCode, amount: Number(l.amount), gstRate: Number(l.gstRate) }))
      : null;
    const lines: InvoiceLine[] | null = body.lineItems?.length ? body.lineItems : storedLines;
    const gst = lines
      ? calculateInvoiceTotals(
          lines,
          { value: body.discountValue !== undefined ? body.discountValue : current?.discount_value, type: body.discountType ?? current?.discount_type },
          supplierState,
          pos,
          { exportUnderLut: isExport },
        )
      : calculateInvoiceTotals(
          [{ description: body.serviceDescription ?? current?.service_description, amount: body.baseAmount ?? Number(current?.base_amount), gstRate: body.gstRate ?? Number(current?.gst_rate) }],
          {},
          supplierState,
          pos,
          { exportUnderLut: isExport },
        );
    if (lines) {
      updates.line_items = gst.lines;
      updates.service_description = lines[0].description;
    }
    Object.assign(updates, {
      base_amount: gst.baseAmount, gst_rate: gst.gstRate, gst_amount: gst.gstAmount,
      total_amount: gst.totalAmount, supply_type: gst.supplyType,
      cgst_amount: gst.cgstAmount, sgst_amount: gst.sgstAmount, igst_amount: gst.igstAmount,
    });
  }
  if (body.invoiceDate) updates.financial_year = getFinancialYear(new Date(body.invoiceDate));

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Couldn’t save the invoice. Please try again.' }); return; }
  await logInvoiceEvent(req, req.userId!, data, 'updated', { fields: Object.keys(updates).filter(k => k !== 'updated_at') });
  res.json(data);
});

// DELETE /invoices/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: existing } = await supabase
    .from('invoices')
    .select('id, status, invoice_number, total_amount')
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

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Couldn’t delete the invoice. Please try again.' }); return; }
  await logInvoiceEvent(req, req.userId!, existing, 'deleted', { total_amount: existing.total_amount });
  res.status(204).send();
});

// Next sequence = highest existing number in this prefix/FY + 1 (not a count — deleted drafts leave gaps)

async function getUser(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('id, name, email, business_name, gstin, pan, business_address, state_code, invoice_prefix, lut_number, phone, show_phone_on_invoice, invoice_phone, invoice_email, gmail_access_token, gmail_refresh_token, gmail_connected_email')
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

  const amount = `₹${Number(inv.total_amount).toLocaleString('en-IN')}`;
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

    await logInvoiceEvent(req, req.userId!, inv, 'sent', { to: inv.brand_email });
    res.json({ success: true, sentTo: inv.brand_email });
  } catch (err: any) {
    res.status(500).json({ error: 'EMAIL_FAILED', message: 'Failed to send email. Check your email configuration.', statusCode: 500 });
  }
});

// POST /invoices/:id/mark-paid — records the payment: status, income (taxable value) and TDS, atomically
router.post('/:id/mark-paid', validateBody(MarkPaidSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await markPaid('invoice', req.userId!, String(req.params.id), req.body);
  if (!result.ok) { res.status(result.status).json({ error: result.error, message: result.message }); return; }
  const { data } = await supabase.from('invoices').select('*').eq('id', String(req.params.id)).eq('user_id', req.userId!).single();
  await logInvoiceEvent(req, req.userId!, data || { id: String(req.params.id) }, data?.status === 'paid' ? 'paid' : 'part_paid', {
    payment_date: req.body.paymentDate, amount_received: req.body.amountReceived, tds: req.body.tdsDeducted,
  });
  res.json(data);
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

  const confirmUrl = `${getFrontendUrl()}/confirm-payment/${rawToken}`;
  res.json({ url: confirmUrl, expiresAt });
});

export default router;
