import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { PLAN_LIMITS, Plan } from '../config/plans.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/usage — returns all quota counts for the current user in one request.
// Frontend uses this on mount to preemptively disable buttons before any API call is made.
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const plan = (req.userPlan || 'basic') as Plan;
  const limits = PLAN_LIMITS[plan];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [invoiceResult, tdsResult, bankResult, upiResult, tcResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .gte('created_at', startOfMonth),
    supabase
      .from('tds_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!),
    supabase
      .from('invoice_settings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .eq('setting_type', 'bank_account'),
    supabase
      .from('invoice_settings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .eq('setting_type', 'upi'),
    supabase
      .from('invoice_settings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!)
      .eq('setting_type', 'terms'),
  ]);

  res.json({
    plan,
    invoices_this_month: invoiceResult.count ?? 0,
    invoices_limit: limits.invoices_monthly,
    tds_entries_total: tdsResult.count ?? 0,
    tds_limit: limits.tds_entries,
    bank_accounts: bankResult.count ?? 0,
    bank_limit: limits.bank_accounts,
    upi_ids: upiResult.count ?? 0,
    upi_limit: limits.upi_ids,
    tc_profiles: tcResult.count ?? 0,
    tc_limit: limits.tc_profiles,
    allowed_templates: limits.free_templates,
  });
});

export default router;
