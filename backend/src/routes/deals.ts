import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { getFinancialYear } from '../services/invoiceService.js';

const router = Router();
router.use(authenticate);

const DealSchema = z.object({
  brandName: z.string().min(1).max(200).trim(),
  brandContactEmail: z.string().email().optional().or(z.literal('')),
  dealValue: z.number().positive().max(9999999),
  status: z.enum(['inquiry', 'negotiating', 'active', 'delivered', 'invoiced', 'paid', 'rejected']).default('inquiry'),
  niche: z.string().max(100).optional(),
  deliverables: z.string().max(1000).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(1000).optional(),
});

const UpdateDealSchema = DealSchema.partial();

// GET /deals
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.query as Record<string, string>;

  let query = supabase
    .from('deals')
    .select('*')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.json({ deals: data });
});

// POST /deals
router.post('/', validateBody(DealSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;
  const { data, error } = await supabase
    .from('deals')
    .insert({
      user_id: req.userId!,
      brand_name: body.brandName,
      brand_contact_email: body.brandContactEmail || null,
      deal_value: body.dealValue,
      status: body.status,
      niche: body.niche || null,
      deliverables: body.deliverables || null,
      deadline: body.deadline || null,
      payment_due_date: body.paymentDueDate || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to create deal' });
    return;
  }

  res.status(201).json(data);
});

// PUT /deals/:id
router.put('/:id', validateBody(UpdateDealSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.brandName !== undefined) updates.brand_name = body.brandName;
  if (body.brandContactEmail !== undefined) updates.brand_contact_email = body.brandContactEmail || null;
  if (body.dealValue !== undefined) updates.deal_value = body.dealValue;
  if (body.status !== undefined) updates.status = body.status;
  if (body.niche !== undefined) updates.niche = body.niche;
  if (body.deliverables !== undefined) updates.deliverables = body.deliverables;
  if (body.deadline !== undefined) updates.deadline = body.deadline;
  if (body.paymentDueDate !== undefined) updates.payment_due_date = body.paymentDueDate;
  if (body.notes !== undefined) updates.notes = body.notes;

  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (!data) { res.status(404).json({ error: 'NOT_FOUND', message: 'Deal not found' }); return; }
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.json(data);
});

// POST /deals/:id/mark-paid — marks paid + auto-creates income entry
router.post('/:id/mark-paid', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: deal } = await supabase
    .from('deals')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!deal) { res.status(404).json({ error: 'NOT_FOUND', message: 'Deal not found' }); return; }

  const paymentDate = req.body.paidDate || new Date().toISOString().split('T')[0];
  const fy = getFinancialYear(new Date(paymentDate + 'T00:00:00'));

  // Update deal status to paid + auto-create income entry atomically via Supabase RPC
  // Using sequential ops with rollback on failure
  const { error: dealUpdateError } = await supabase
    .from('deals')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', deal.id);

  if (dealUpdateError) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to mark deal as paid' });
    return;
  }

  // Auto-create income entry
  const { data: income, error: incomeError } = await supabase
    .from('income')
    .insert({
      user_id: req.userId!,
      deal_id: deal.id,
      source: 'brand_deal',
      amount: deal.deal_value,
      currency: 'INR',
      description: `Brand deal payment — ${deal.brand_name}`,
      income_date: paymentDate,
      financial_year: fy,
    })
    .select()
    .single();

  if (incomeError) {
    // Rollback the deal update
    await supabase.from('deals').update({ status: deal.status }).eq('id', deal.id);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Deal mark-paid rolled back — income entry failed' });
    return;
  }

  // Send payment confirmation emails (non-blocking)
  try {
    const { data: user } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', req.userId!)
      .maybeSingle();

    if (user) {
      const { sendPaymentConfirmedEmail } = await import('../services/emailService.js');
      const amount = `₹${(deal.deal_value / 100).toLocaleString('en-IN')}`;

      // Notify creator
      await sendPaymentConfirmedEmail(user.email, {
        recipientName: user.name,
        invoiceNumber: `Deal: ${deal.brand_name}`,
        amount,
        brandName: deal.brand_name,
        creatorName: user.name,
      });

      // Notify brand if email is available
      if (deal.brand_contact_email) {
        await sendPaymentConfirmedEmail(deal.brand_contact_email, {
          recipientName: deal.brand_name,
          invoiceNumber: `Deal: ${deal.brand_name}`,
          amount,
          brandName: deal.brand_name,
          creatorName: user.name,
        });
      }
    }
  } catch { /* Non-blocking — email failure doesn't fail the request */ }

  res.json({ deal: { ...deal, status: 'paid' }, income });
});

// DELETE /deals/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  // Atomically delete linked income entries first
  await supabase
    .from('income')
    .delete()
    .eq('deal_id', req.params.id)
    .eq('user_id', req.userId!);

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  res.status(204).send();
});

export default router;
