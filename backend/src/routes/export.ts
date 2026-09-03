import { Router, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver');
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { checkPlan } from '../middleware/auth.js';
import { getFinancialYear } from '../services/invoiceService.js';

const router = Router();
router.use(authenticate);

function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

// GET /export/annual?fy=2026-27 — Pro plan required
router.get('/annual', checkPlan('pro'), async (req: AuthRequest, res: Response): Promise<void> => {
  const fy = (req.query.fy as string) || getFinancialYear(new Date());
  const userId = req.userId!;

  // Fetch all data for the FY in parallel
  const [invoicesRes, tdsRes, incomeRes, expensesRes, userRes] = await Promise.all([
    supabase.from('invoices').select('invoice_number, brand_name, brand_gstin, invoice_date, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_amount, status').eq('user_id', userId).eq('financial_year', fy).order('invoice_date'),
    supabase.from('tds_records').select('brand_name, brand_tan, invoice_amount, tds_rate, tds_amount, received_amount, payment_date, form_16a_status').eq('user_id', userId).eq('financial_year', fy).order('payment_date'),
    supabase.from('income').select('source, amount, description, income_date, quarter').eq('user_id', userId).eq('financial_year', fy).order('income_date'),
    supabase.from('expenses').select('category, amount, description, expense_date').eq('user_id', userId).eq('financial_year', fy).order('expense_date'),
    supabase.from('users').select('name, email, gstin, pan, business_name').eq('id', userId).maybeSingle(),
  ]);

  const invoices = invoicesRes.data || [];
  const tds = tdsRes.data || [];
  const income = incomeRes.data || [];
  const expenses = expensesRes.data || [];
  const user = userRes.data;

  const toRupees = (paise: number) => (paise / 100).toFixed(2);

  // Build CSVs
  const invoiceCsv = toCsv(
    invoices.map(i => ({
      ...i,
      taxable_amount: toRupees(i.taxable_amount),
      cgst_amount: toRupees(i.cgst_amount || 0),
      sgst_amount: toRupees(i.sgst_amount || 0),
      igst_amount: toRupees(i.igst_amount || 0),
      total_amount: toRupees(i.total_amount),
    })),
    ['invoice_number', 'brand_name', 'brand_gstin', 'invoice_date', 'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount', 'status']
  );

  const tdsCsv = toCsv(
    tds.map(t => ({
      ...t,
      invoice_amount: toRupees(t.invoice_amount),
      tds_amount: toRupees(t.tds_amount),
      received_amount: toRupees(t.received_amount),
    })),
    ['brand_name', 'brand_tan', 'invoice_amount', 'tds_rate', 'tds_amount', 'received_amount', 'payment_date', 'form_16a_status']
  );

  const incomeCsv = toCsv(
    income.map(i => ({ ...i, amount: toRupees(i.amount) })),
    ['income_date', 'source', 'description', 'amount', 'quarter']
  );

  const expensesCsv = toCsv(
    expenses.map(e => ({ ...e, amount: toRupees(e.amount) })),
    ['expense_date', 'category', 'description', 'amount']
  );

  // P&L summary
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalTds = tds.reduce((s, t) => s + t.tds_amount, 0);
  const netPnL = totalIncome - totalExpenses;

  const summary = [
    `Kcretio — Annual Summary FY ${fy}`,
    `Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    `Creator: ${user?.name || ''} | ${user?.email || ''}`,
    `GSTIN: ${user?.gstin || 'Not set'} | PAN: ${user?.pan || 'Not set'}`,
    '',
    '--- FINANCIAL SUMMARY ---',
    `Total Income:    ₹${toRupees(totalIncome)}`,
    `Total Expenses:  ₹${toRupees(totalExpenses)}`,
    `Net P&L:         ₹${toRupees(netPnL)}`,
    `Total TDS:       ₹${toRupees(totalTds)} (claimable in ITR)`,
    '',
    '--- INVOICE SUMMARY ---',
    `Total Invoices: ${invoices.length}`,
    `Paid: ${invoices.filter(i => i.status === 'paid').length}`,
    `Pending: ${invoices.filter(i => i.status !== 'paid').length}`,
    '',
    '--- TDS SUMMARY ---',
    `Form 16A Received: ${tds.filter(t => t.form_16a_status === 'received').length}/${tds.length}`,
    '',
    'Note: These figures are indicative. Verify with your CA before ITR filing.',
  ].join('\n');

  // Stream ZIP response
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="kcreatio-${fy}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archive.append(invoiceCsv, { name: 'invoices.csv' });
  archive.append(tdsCsv, { name: 'tds.csv' });
  archive.append(incomeCsv, { name: 'income.csv' });
  archive.append(expensesCsv, { name: 'expenses.csv' });
  archive.append(summary, { name: 'summary.txt' });
  await archive.finalize();
});

export default router;
