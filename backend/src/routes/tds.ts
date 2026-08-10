import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { getFinancialYear } from '../services/invoiceService.js';
import { PLAN_LIMITS, Plan } from '../config/plans.js';

const router = Router();
router.use(authenticate);

const CreateTDSSchema = z.object({
  brandName: z.string().min(1).max(200).trim(),
  brandTan: z.string().max(10).trim().optional(),
  invoiceAmount: z.number().positive().max(9999999),
  tdsRate: z.number().min(0).max(100).default(10),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  invoiceId: z.string().uuid().optional(),
  financialYear: z.string().optional(),
});

const UpdateTDSSchema = z.object({
  form16aStatus: z.enum(['received', 'awaiting', 'requested', 'overdue']).optional(),
  brandTan: z.string().max(10).trim().optional(),
  notes: z.string().max(500).optional(),
});

// GET /tds
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { fy } = req.query as Record<string, string>;

  let query = supabase
    .from('tds_records')
    .select('*')
    .eq('user_id', req.userId!)
    .order('payment_date', { ascending: false });

  if (fy) query = query.eq('financial_year', fy);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.json({ records: data });
});

// GET /tds/summary
router.get('/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  const { fy } = req.query as Record<string, string>;
  const currentFY = fy || getFinancialYear(new Date());

  const { data, error } = await supabase
    .from('tds_records')
    .select('tds_amount, received_amount, form_16a_status')
    .eq('user_id', req.userId!)
    .eq('financial_year', currentFY);

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }

  const totalDeducted = (data || []).reduce((s, r) => s + Number(r.tds_amount), 0);
  const form16aReceived = (data || [])
    .filter(r => r.form_16a_status === 'received')
    .reduce((s, r) => s + Number(r.tds_amount), 0);
  const pending = totalDeducted - form16aReceived;

  res.json({
    financialYear: currentFY,
    totalDeducted: Math.round(totalDeducted * 100) / 100,
    form16aReceived: Math.round(form16aReceived * 100) / 100,
    pending: Math.round(pending * 100) / 100,
    netTdsCredit: Math.round(totalDeducted * 100) / 100,
    recordCount: (data || []).length,
  });
});

// POST /tds
router.post('/', validateBody(CreateTDSSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  // ── TDS entry quota (free: 10 total) ─────────────────────────────────────
  const plan = (req.userPlan || 'basic') as Plan;
  const tdsLimit = PLAN_LIMITS[plan].tds_entries;
  if (tdsLimit !== null) {
    const { count } = await supabase
      .from('tds_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!);
    if ((count ?? 0) >= tdsLimit) {
      res.status(403).json({
        error: 'QUOTA_EXCEEDED',
        message: `Free plan allows ${tdsLimit} TDS entries total. Upgrade to Starter for unlimited tracking.`,
        required_plan: 'starter',
        quota: { limit: tdsLimit, used: count, feature: 'tds_entries' },
      });
      return;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  const body = req.body;
  const tdsAmountPaise = Math.round(body.invoiceAmount * body.tdsRate);
  const tdsAmount = tdsAmountPaise / 100;
  const receivedAmount = body.invoiceAmount - tdsAmount;
  const financialYear = body.financialYear || getFinancialYear(new Date(body.paymentDate + 'T00:00:00'));

  const { data, error } = await supabase
    .from('tds_records')
    .insert({
      user_id: req.userId!,
      invoice_id: body.invoiceId || null,
      brand_name: body.brandName,
      brand_tan: body.brandTan || null,
      invoice_amount: body.invoiceAmount,
      tds_rate: body.tdsRate,
      tds_amount: tdsAmount,
      received_amount: receivedAmount,
      form_16a_status: 'awaiting',
      financial_year: financialYear,
      payment_date: body.paymentDate,
    })
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to create TDS record' });
    return;
  }

  res.status(201).json(data);
});

// PUT /tds/:id
router.put('/:id', validateBody(UpdateTDSSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const updates: Record<string, any> = {};
  if (req.body.form16aStatus) updates.form_16a_status = req.body.form16aStatus;
  if (req.body.brandTan) updates.brand_tan = req.body.brandTan;

  const { data, error } = await supabase
    .from('tds_records')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (!data) { res.status(404).json({ error: 'NOT_FOUND', message: 'TDS record not found' }); return; }
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.json(data);
});

// DELETE /tds/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { error } = await supabase
    .from('tds_records')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.status(204).send();
});

export default router;
