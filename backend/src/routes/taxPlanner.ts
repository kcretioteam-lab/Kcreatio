import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, checkPlan, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { getFinancialYear } from '../services/invoiceService.js';
import { computeTax, estimateDeferralInterest, quickTaxEstimate, INSTALMENT_SCHEDULE, Regime, Presumptive } from '../services/taxEngine.js';

const router = Router();

// PUBLIC — no auth required (used by landing page tax calculator)
router.get('/quick-estimate', (req, res): void => {
  const monthlyIncome = parseFloat(req.query.monthly_income as string) || 0;
  const brandCount = parseInt(req.query.brand_count as string, 10) || 1;
  res.json(quickTaxEstimate(monthlyIncome, brandCount));
});

router.use(authenticate);

// GET /tax/estimate — projects this tax year's income and runs it through the tax engine.
router.get('/estimate', checkPlan('pro'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { fy, regime: regimeParam, annualEstimate } = req.query as Record<string, string>;
  const currentFY = /^\d{4}-\d{2}$/.test(fy || '') ? fy : getFinancialYear(new Date());
  const fyStartYear = parseInt(currentFY.split('-')[0], 10);

  const [{ data: profile }, { data: incomeData }, { data: expenseData }, { data: tdsData }, { data: paidData }] = await Promise.all([
    supabase.from('users').select('tax_regime, presumptive').eq('id', req.userId!).maybeSingle(),
    supabase.from('income').select('amount').eq('user_id', req.userId!).eq('financial_year', currentFY),
    supabase.from('expenses').select('amount').eq('user_id', req.userId!).eq('financial_year', currentFY),
    supabase.from('tds_records').select('tds_amount').eq('user_id', req.userId!).eq('financial_year', currentFY),
    supabase.from('tax_payments').select('quarter, amount_paid').eq('user_id', req.userId!).eq('financial_year', currentFY).eq('type', 'advance_tax'),
  ]);

  const sum = (rows: Record<string, unknown>[] | null, key: string) =>
    (rows || []).reduce((s, r) => s + Number(r[key] || 0), 0);
  const ytdIncome = sum(incomeData, 'amount');
  const ytdExpenses = sum(expenseData, 'amount');
  const totalTDS = sum(tdsData, 'tds_amount');

  // Annualise from year-to-date, unless the user typed their own estimate.
  const now = new Date();
  const fyStart = new Date(fyStartYear, 3, 1);
  const fyEnd = new Date(fyStartYear + 1, 2, 31);
  const totalDays = (fyEnd.getTime() - fyStart.getTime()) / 86400000;
  const elapsed = Math.min(totalDays, Math.max(1, (now.getTime() - fyStart.getTime()) / 86400000));
  const factor = totalDays / elapsed;
  const manual = parseFloat(annualEstimate);
  const projectedAnnual = Number.isFinite(manual) && manual >= 0 ? manual : Math.round(ytdIncome * factor);
  const projectedExpenses = Number.isFinite(manual) ? 0 : Math.round(ytdExpenses * factor);

  const regime: Regime = regimeParam === 'old' || regimeParam === 'new'
    ? regimeParam : (profile?.tax_regime === 'old' ? 'old' : 'new');
  const presumptive: Presumptive = profile?.presumptive === '44ADA' || profile?.presumptive === '44AD'
    ? profile.presumptive : 'none';

  const result = computeTax({
    grossReceipts: projectedAnnual,
    expenses: projectedExpenses,
    regime,
    presumptive,
    tdsPaid: totalTDS,
  });

  // Cumulative advance tax paid by each instalment's due date, for the deferral-interest estimate.
  const paidByQuarter = new Map<string, number>();
  for (const p of paidData || []) paidByQuarter.set(p.quarter, (paidByQuarter.get(p.quarter) || 0) + Number(p.amount_paid || 0));
  let running = 0;
  const paidCumulative = INSTALMENT_SCHEDULE.map(i => (running += paidByQuarter.get(i.quarter) || 0));
  const interest = estimateDeferralInterest(result.instalments, paidCumulative, now, fyStartYear);

  res.json({
    financialYear: currentFY,
    ytdIncome,
    ytdExpenses,
    projectedAnnual,
    projectedExpenses,
    tdsDeducted: totalTDS,
    ...result,
    advanceTaxPaid: running,
    balanceDue: Math.max(0, result.netPayable - running),
    // kept for older clients
    totalTax: result.totalTax,
    netAdvanceTax: result.netPayable,
    instalments: result.instalments.map((inst, i) => ({ ...inst, paid: paidByQuarter.get(inst.quarter) || 0, ...interest[i] })),
    interestTotal: interest.reduce((s, q) => s + q.interest, 0),
  });
});

// GET /tax/deadlines
router.get('/deadlines', async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const currentFY = getFinancialYear(now);
  const fyStartYear = parseInt(currentFY.split('-')[0]);

  const deadlines = [
    { name: 'Q1 Advance Tax', quarter: 'Q1', date: new Date(fyStartYear, 5, 15), fy: currentFY },
    { name: 'Q2 Advance Tax', quarter: 'Q2', date: new Date(fyStartYear, 8, 15), fy: currentFY },
    { name: 'Q3 Advance Tax', quarter: 'Q3', date: new Date(fyStartYear, 11, 15), fy: currentFY },
    { name: 'Q4 Advance Tax', quarter: 'Q4', date: new Date(fyStartYear + 1, 2, 15), fy: currentFY },
    { name: 'GSTR-3B Filing', quarter: null, date: new Date(now.getFullYear(), now.getMonth() + 1, 20), fy: currentFY },
  ]
    .filter(d => d.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4)
    .map(d => {
      const daysUntil = Math.ceil((d.date.getTime() - now.getTime()) / 86400000);
      return {
        name: d.name,
        quarter: d.quarter,
        dueDate: d.date.toISOString().split('T')[0],
        daysUntil,
        urgency: daysUntil <= 7 ? 'danger' : daysUntil <= 14 ? 'warning' : 'ok',
      };
    });

  const plan = req.userPlan || 'basic';
  const limitedDeadlines = plan === 'basic' ? deadlines.slice(0, 2) : deadlines;
  res.json({ deadlines: limitedDeadlines, limited: plan === 'basic' });
});

// POST /tax/payments
const TaxPaymentSchema = z.object({
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  financialYear: z.string(),
  amountPaid: z.number().positive(),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  challanNumber: z.string().max(50).optional(),
});

router.post('/payments', checkPlan('pro'), validateBody(TaxPaymentSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;
  const qDueDates: Record<string, string> = {
    Q1: `${body.financialYear.split('-')[0]}-06-15`,
    Q2: `${body.financialYear.split('-')[0]}-09-15`,
    Q3: `${body.financialYear.split('-')[0]}-12-15`,
    Q4: `${parseInt(body.financialYear.split('-')[0]) + 1}-03-15`,
  };

  const { data, error } = await supabase
    .from('tax_payments')
    .insert({
      user_id: req.userId!,
      type: 'advance_tax',
      quarter: body.quarter,
      financial_year: body.financialYear,
      amount_due: 0,
      amount_paid: body.amountPaid,
      due_date: qDueDates[body.quarter],
      paid_date: body.paidDate,
      challan_number: body.challanNumber || null,
    })
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'Failed to log payment' });
    return;
  }

  res.status(201).json(data);
});

// GET /tax/schedule
router.get('/schedule', checkPlan('pro'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { fy } = req.query as Record<string, string>;
  const currentFY = fy || getFinancialYear(new Date());

  const { data } = await supabase
    .from('tax_payments')
    .select('*')
    .eq('user_id', req.userId!)
    .eq('financial_year', currentFY)
    .eq('type', 'advance_tax');

  res.json({ payments: data || [], financialYear: currentFY });
});

export default router;
