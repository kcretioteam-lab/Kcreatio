import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest, checkPlan } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { getFinancialYear } from '../services/invoiceService.js';

const router = Router();
router.use(authenticate);
router.use(checkPlan('starter'));

const CATEGORIES = ['equipment', 'software', 'travel', 'props', 'marketing', 'team', 'subscription', 'other'] as const;

const CreateExpenseSchema = z.object({
  category: z.enum(CATEGORIES),
  amount: z.number().positive().max(9999999),
  description: z.string().max(500).optional(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// GET /expenses
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { fy, category } = req.query as Record<string, string>;

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', req.userId!)
    .order('expense_date', { ascending: false });

  if (fy) query = query.eq('financial_year', fy);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.json({ expenses: data });
});

// GET /expenses/summary
router.get('/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  const { fy } = req.query as Record<string, string>;
  const currentFY = fy || getFinancialYear(new Date());

  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount, expense_date')
    .eq('user_id', req.userId!)
    .eq('financial_year', currentFY);

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }

  const records = data || [];
  const total = records.reduce((s, r) => s + Number(r.amount), 0);
  const byCategory: Record<string, number> = {};
  for (const r of records) {
    byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.amount);
  }

  res.json({ financialYear: currentFY, total, byCategory });
});

// POST /expenses
router.post('/', validateBody(CreateExpenseSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;
  const fy = getFinancialYear(new Date(body.expenseDate + 'T00:00:00'));

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: req.userId!,
      category: body.category,
      amount: body.amount,
      description: body.description || null,
      expense_date: body.expenseDate,
      financial_year: fy,
    })
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to log expense' });
    return;
  }

  res.status(201).json(data);
});

// DELETE /expenses/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.status(204).send();
});

export default router;

// PUT /expenses/:id — edit expense entry
router.put('/:id', validateBody(CreateExpenseSchema.partial()), async (req: AuthRequest, res: Response): Promise<void> => {
  const updates: Record<string, unknown> = {};
  if (req.body.category !== undefined) updates.category = req.body.category;
  if (req.body.amount !== undefined) updates.amount = Math.round(req.body.amount * 100);
  if (req.body.description !== undefined) updates.description = req.body.description || null;
  if (req.body.expenseDate !== undefined) {
    updates.expense_date = req.body.expenseDate;
    const { getFinancialYear } = await import('../services/invoiceService.js').catch(() => ({ getFinancialYear: null }));
    if (getFinancialYear) updates.financial_year = getFinancialYear(new Date(req.body.expenseDate + 'T00:00:00'));
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error || !data) { res.status(error ? 500 : 404).json({ error: error ? 'INTERNAL_ERROR' : 'NOT_FOUND', message: error?.message || 'Not found' }); return; }
  res.json(data);
});
