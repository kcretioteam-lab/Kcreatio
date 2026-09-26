import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { partialWithoutDefaults } from '../lib/zodUtils.js';
import { validateBody } from '../middleware/validateBody.js';
import { markPaid, MarkPaidSchema } from '../services/paymentService.js';
import { logInvoiceEvent } from '../services/auditLog.js';

const router = Router();
router.use(authenticate);

const DealSchema = z.object({
  brandName: z.string().min(1).max(200).trim(),
  brandContactEmail: z.string().email().optional().or(z.literal('')),
  dealValue: z.number().positive().max(9999999),
  // Barter: paid in products instead of cash. marketValue = what those products sell for.
  dealType: z.enum(['cash', 'barter']).default('cash'),
  marketValue: z.number().positive().max(9999999).optional(),
  status: z.enum(['inquiry', 'negotiating', 'active', 'delivered', 'invoiced', 'paid', 'rejected']).default('inquiry'),
  niche: z.string().max(100).optional(),
  deliverables: z.string().max(1000).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(1000).optional(),
});

const UpdateDealSchema = partialWithoutDefaults(DealSchema);

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

// GET /deals/:id — includes the latest linked invoice, if any
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message }); return; }
  if (!data) { res.status(404).json({ error: 'NOT_FOUND', message: 'Deal not found' }); return; }
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, base_amount, total_amount')
    .eq('deal_id', data.id)
    .eq('user_id', req.userId!)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  res.json({ ...data, invoice: invoice || null });
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
      deal_type: body.dealType,
      market_value: body.dealType === 'barter' ? body.marketValue ?? body.dealValue : null,
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
  if (body.dealType !== undefined) updates.deal_type = body.dealType;
  if (body.marketValue !== undefined) updates.market_value = body.marketValue;
  if (body.status === 'paid') {
    res.status(422).json({ error: 'USE_MARK_PAID', message: 'Use “Mark paid” so the income and TDS are recorded.' });
    return;
  }
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

// POST /deals/:id/mark-paid — records the payment. If the deal has an invoice, the invoice is
// marked paid instead so the same payment is never logged twice.
router.post('/:id/mark-paid', validateBody(MarkPaidSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: deal } = await supabase
    .from('deals')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!deal) { res.status(404).json({ error: 'NOT_FOUND', message: 'Deal not found' }); return; }
  if (deal.status === 'paid') { res.status(409).json({ error: 'ALREADY_PAID', message: 'This deal is already marked as paid' }); return; }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('deal_id', deal.id)
    .eq('user_id', req.userId!)
    .in('status', ['draft', 'sent', 'overdue', 'partially_paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const result = invoice
    ? await markPaid('invoice', req.userId!, invoice.id, req.body)
    : await markPaid('deal', req.userId!, deal.id, req.body);
  if (!result.ok) { res.status(result.status).json({ error: result.error, message: result.message }); return; }
  if (invoice) {
    await logInvoiceEvent(req, req.userId!, { id: invoice.id }, 'paid', { via: 'deal', deal_id: deal.id, amount_received: req.body.amountReceived, tds: req.body.tdsDeducted });
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
      const amount = `₹${Number(req.body.amountReceived).toLocaleString('en-IN')}`;

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

  res.json({ deal: { ...deal, status: 'paid' }, viaInvoice: Boolean(invoice) });
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
