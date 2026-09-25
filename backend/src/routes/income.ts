import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest, checkPlan } from '../middleware/auth.js';
import { partialWithoutDefaults } from '../lib/zodUtils.js';
import { validateBody } from '../middleware/validateBody.js';
import { getFinancialYear, getAdvanceTaxQuarter } from '../services/invoiceService.js';

const router = Router();
router.use(authenticate);
router.use(checkPlan('pro'));

const INCOME_SOURCES = ['brand_deal', 'barter', 'adsense', 'instagram_bonus', 'affiliate', 'consulting', 'foreign_brand', 'other'] as const;

const CreateIncomeSchema = z.object({
  source: z.enum(INCOME_SOURCES),
  amount: z.number().positive().max(9999999),              // always in rupees
  description: z.string().max(500).optional(),
  incomeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dealId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  // Foreign income (AdSense, foreign brands): the original amount and the rate used to convert it
  currency: z.string().length(3).toUpperCase().default('INR'),
  foreignAmount: z.number().positive().max(999999999).optional(),
  fxRate: z.number().positive().max(100000).optional(),
  firaReceived: z.boolean().optional(),
});

// GET /income
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { fy, source } = req.query as Record<string, string>;

  let query = supabase
    .from('income')
    .select('*')
    .eq('user_id', req.userId!)
    .order('income_date', { ascending: false });

  if (fy) query = query.eq('financial_year', fy);
  if (source) query = query.eq('source', source);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.json({ income: data });
});

// GET /income/summary — must be before /:id
router.get('/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  const { fy } = req.query as Record<string, string>;
  const currentFY = fy || getFinancialYear(new Date());

  const { data, error } = await supabase
    .from('income')
    .select('source, amount, income_date')
    .eq('user_id', req.userId!)
    .eq('financial_year', currentFY);

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }

  const records = data || [];
  const total = records.reduce((s, r) => s + Number(r.amount), 0);

  const bySource: Record<string, number> = {};
  for (const r of records) {
    bySource[r.source] = (bySource[r.source] || 0) + Number(r.amount);
  }

  // Monthly breakdown
  const byMonth: Record<string, number> = {};
  for (const r of records) {
    const month = r.income_date.slice(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] || 0) + Number(r.amount);
  }

  res.json({ financialYear: currentFY, total, bySource, byMonth });
});

// POST /income
router.post('/', validateBody(CreateIncomeSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;
  const fy = getFinancialYear(new Date(body.incomeDate + 'T00:00:00'));
  const quarter = getAdvanceTaxQuarter(new Date(body.incomeDate + 'T00:00:00'));

  const { data, error } = await supabase
    .from('income')
    .insert({
      user_id: req.userId!,
      deal_id: body.dealId || null,
      invoice_id: body.invoiceId || null,
      source: body.source,
      // For foreign income the rupee amount is the converted value on the day it was received
      amount: body.currency !== 'INR' && body.foreignAmount && body.fxRate ? Math.round(body.foreignAmount * body.fxRate * 100) / 100 : body.amount,
      currency: body.currency || 'INR',
      foreign_amount: body.currency !== 'INR' ? body.foreignAmount ?? null : null,
      fx_rate: body.currency !== 'INR' ? body.fxRate ?? null : null,
      fira_received: body.firaReceived ?? false,
      description: body.description || null,
      income_date: body.incomeDate,
      financial_year: fy,
      quarter,
    })
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to log income' });
    return;
  }

  res.status(201).json(data);
});

// DELETE /income/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { error } = await supabase
    .from('income')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.status(204).send();
});

export default router;

// PUT /income/:id — edit income entry
router.put('/:id', validateBody(partialWithoutDefaults(CreateIncomeSchema)), async (req: AuthRequest, res: Response): Promise<void> => {
  const updates: Record<string, unknown> = {};
  if (req.body.source !== undefined) updates.source = req.body.source;
  if (req.body.amount !== undefined) updates.amount = req.body.amount; // rupees, same as POST
  if (req.body.description !== undefined) updates.description = req.body.description || null;
  if (req.body.firaReceived !== undefined) updates.fira_received = req.body.firaReceived;
  if (req.body.incomeDate !== undefined) {
    updates.income_date = req.body.incomeDate;
    const date = new Date(req.body.incomeDate + 'T00:00:00');
    updates.financial_year = getFinancialYear(date);
    updates.quarter = getAdvanceTaxQuarter(date);
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('income')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error || !data) { res.status(error ? 500 : 404).json({ error: error ? 'INTERNAL_ERROR' : 'NOT_FOUND', message: error?.message || 'Not found' }); return; }
  res.json(data);
});
