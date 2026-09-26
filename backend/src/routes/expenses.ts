import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest, checkPlan } from '../middleware/auth.js';
import { partialWithoutDefaults } from '../lib/zodUtils.js';
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
  // GST on the purchase — claimable as input tax credit by GST-registered creators
  gstPaid: z.number().min(0).max(9999999).optional(),
  vendorGstin: z.string().trim().toUpperCase().regex(/^([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])?$/, 'Enter a valid vendor GSTIN').optional(),
  receiptPath: z.string().max(300).nullable().optional(),
  // Cameras, laptops etc. are depreciated over years, not expensed at once
  isCapitalAsset: z.boolean().optional(),
  assetClass: z.enum(['computer', 'camera_equipment', 'furniture', 'vehicle', 'other']).nullable().optional(),
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
      gst_paid: body.gstPaid ?? 0,
      vendor_gstin: body.vendorGstin || null,
      receipt_url: body.receiptPath?.startsWith(`${req.userId!}/docs/`) ? body.receiptPath : null,
      is_capital_asset: Boolean(body.isCapitalAsset),
      asset_class: body.isCapitalAsset ? body.assetClass || 'other' : null,
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
router.put('/:id', validateBody(partialWithoutDefaults(CreateExpenseSchema)), async (req: AuthRequest, res: Response): Promise<void> => {
  const updates: Record<string, unknown> = {};
  if (req.body.category !== undefined) updates.category = req.body.category;
  if (req.body.amount !== undefined) updates.amount = req.body.amount; // rupees, same as POST
  if (req.body.description !== undefined) updates.description = req.body.description || null;
  if (req.body.gstPaid !== undefined) updates.gst_paid = req.body.gstPaid;
  if (req.body.vendorGstin !== undefined) updates.vendor_gstin = req.body.vendorGstin || null;
  if (req.body.receiptPath !== undefined) updates.receipt_url = req.body.receiptPath?.startsWith(`${req.userId!}/docs/`) ? req.body.receiptPath : null;
  if (req.body.isCapitalAsset !== undefined) updates.is_capital_asset = req.body.isCapitalAsset;
  if (req.body.assetClass !== undefined) updates.asset_class = req.body.assetClass;
  if (req.body.expenseDate !== undefined) {
    updates.expense_date = req.body.expenseDate;
    updates.financial_year = getFinancialYear(new Date(req.body.expenseDate + 'T00:00:00'));
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
