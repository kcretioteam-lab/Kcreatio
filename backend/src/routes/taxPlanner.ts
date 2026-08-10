import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, checkPlan, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { getFinancialYear } from '../services/invoiceService.js';

const router = Router();
router.use(authenticate);

// Tax slabs FY 2025-26 (New Regime)
const NEW_REGIME_SLABS = [
  { min: 0,       max: 400000,  rate: 0 },
  { min: 400000,  max: 800000,  rate: 0.05 },
  { min: 800000,  max: 1200000, rate: 0.10 },
  { min: 1200000, max: 1600000, rate: 0.15 },
  { min: 1600000, max: 2000000, rate: 0.20 },
  { min: 2000000, max: 2400000, rate: 0.25 },
  { min: 2400000, max: Infinity, rate: 0.30 },
];

const OLD_REGIME_SLABS = [
  { min: 0,       max: 250000,  rate: 0 },
  { min: 250000,  max: 500000,  rate: 0.05 },
  { min: 500000,  max: 1000000, rate: 0.20 },
  { min: 1000000, max: Infinity, rate: 0.30 },
];

const INSTALMENT_SCHEDULE = [
  { quarter: 'Q1', dueDate: 'Jun 15', dueMonth: 5, dueDay: 15, cumPct: 0.15 },
  { quarter: 'Q2', dueDate: 'Sep 15', dueMonth: 8, dueDay: 15, cumPct: 0.45 },
  { quarter: 'Q3', dueDate: 'Dec 15', dueMonth: 11, dueDay: 15, cumPct: 0.75 },
  { quarter: 'Q4', dueDate: 'Mar 15', dueMonth: 2,  dueDay: 15, cumPct: 1.00 },
];

function calcTax(annualIncomePaise: number, regime: string): number {
  const slabs = regime === 'old' ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  const standardDeduction = regime === 'new' ? 5000000 : 0; // ₹50,000 in paise
  const taxableIncomePaise = Math.max(0, annualIncomePaise - standardDeduction);
  let taxPaise = 0;
  for (const slab of slabs) {
    if (taxableIncomePaise <= slab.min * 100) break;
    const inSlab = Math.min(taxableIncomePaise, slab.max === Infinity ? Infinity : slab.max * 100) - slab.min * 100;
    taxPaise += Math.round(inSlab * slab.rate);
  }
  const cessPaise = Math.round(taxPaise * 0.04);
  return taxPaise + cessPaise;
}

// GET /tax/estimate
router.get('/estimate', checkPlan('pro'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { fy, regime = 'new', annualEstimate } = req.query as Record<string, string>;
  const currentFY = fy || getFinancialYear(new Date());

  // Get YTD income from logged records
  const { data: incomeData } = await supabase
    .from('income')
    .select('amount')
    .eq('user_id', req.userId!)
    .eq('financial_year', currentFY);

  const ytdIncome = (incomeData || []).reduce((s, r) => s + Number(r.amount), 0);

  // Annualize: project full year from YTD
  const now = new Date();
  const fyStart = new Date(currentFY.startsWith('20') ? parseInt(currentFY.split('-')[0]) : 2024, 3, 1);
  const fyEnd = new Date(parseInt(currentFY.split('-')[0]) + 1, 2, 31);
  const totalDays = (fyEnd.getTime() - fyStart.getTime()) / 86400000;
  const elapsed = Math.max(1, (now.getTime() - fyStart.getTime()) / 86400000);
  const projectedAnnual = annualEstimate ? parseFloat(annualEstimate) : Math.round(ytdIncome * (totalDays / elapsed));

  // Get TDS deducted this FY
  const { data: tdsData } = await supabase
    .from('tds_records')
    .select('tds_amount')
    .eq('user_id', req.userId!)
    .eq('financial_year', currentFY);

  const totalTDS = (tdsData || []).reduce((s, r) => s + Number(r.tds_amount), 0);

  const annualIncomePaise = Math.round(projectedAnnual * 100);
  const totalTaxPaise = calcTax(annualIncomePaise, regime);
  const tdsPaise = Math.round(totalTDS * 100);
  const netAdvanceTaxPaise = Math.max(0, totalTaxPaise - tdsPaise);

  const cumInstalments = INSTALMENT_SCHEDULE.map(inst => ({
    ...inst,
    cumAmountPaise: Math.round(netAdvanceTaxPaise * inst.cumPct),
  }));

  const instalments = cumInstalments.map((inst, i) => ({
    quarter: inst.quarter,
    dueDate: inst.dueDate,
    dueMonth: inst.dueMonth,
    dueDay: inst.dueDay,
    amountDue: (inst.cumAmountPaise - (i > 0 ? cumInstalments[i-1].cumAmountPaise : 0)) / 100,
  }));

  res.json({
    financialYear: currentFY,
    regime,
    ytdIncome,
    projectedAnnual,
    totalTax: totalTaxPaise / 100,
    tdsDeducted: totalTDS,
    netAdvanceTax: netAdvanceTaxPaise / 100,
    instalments,
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
