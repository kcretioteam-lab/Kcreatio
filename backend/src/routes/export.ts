import { Router, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver');
import ExcelJS from 'exceljs';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { checkPlan } from '../middleware/auth.js';
import { getFinancialYear } from '../services/invoiceService.js';
import { computeTax, firstYearDepreciation, Presumptive, Regime } from '../services/taxEngine.js';
import { generateInvoicePdfWithPuppeteer, renderHtmlToPdf } from '../services/puppeteerPdfService.js';
import { stateLabel } from '../lib/gst.js';

const router = Router();
router.use(authenticate);

// Amounts are stored in rupees; Supabase returns numeric columns as strings.
const num = (v: unknown) => Number(v || 0);
const sum = (rows: Record<string, unknown>[], key: string) => rows.reduce((s, r) => s + num(r[key]), 0);
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const fileSafe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-');

// Indian digit grouping (1,23,45,678.00) in Excel
const INR_FORMAT = '[>=10000000]##\\,##\\,##\\,##0.00;[>=100000]##\\,##\\,##0.00;##,##0.00';

type Col = { header: string; key: string; width?: number; money?: boolean };

function addSheet(wb: ExcelJS.Workbook, name: string, cols: Col[], rows: Record<string, unknown>[], totals?: string[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = cols.map(c => ({ header: c.header, key: c.key, width: c.width ?? Math.max(12, c.header.length + 2) }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F7' } };
  rows.forEach(r => ws.addRow(Object.fromEntries(cols.map(c => [c.key, c.money ? num(r[c.key]) : (r[c.key] ?? '')]))));
  if (totals?.length && rows.length) {
    const totalRow = ws.addRow(Object.fromEntries(cols.map((c, i) => [c.key, i === 0 ? 'Total' : totals.includes(c.key) ? sum(rows, c.key) : ''])));
    totalRow.font = { bold: true };
  }
  cols.forEach((c, i) => { if (c.money) ws.getColumn(i + 1).numFmt = INR_FORMAT; });
  return ws;
}

// GET /export/annual?fy=2026-27 — Pro plan required
// ZIP for the creator's CA: invoice PDFs, one Excel workbook, and a one-page summary PDF.
router.get('/annual', checkPlan('pro'), async (req: AuthRequest, res: Response): Promise<void> => {
  const fy = /^\d{4}-\d{2}$/.test(String(req.query.fy || '')) ? String(req.query.fy) : getFinancialYear(new Date());
  const userId = req.userId!;

  const [invoicesRes, tdsRes, incomeRes, expensesRes, taxPaidRes, userRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('user_id', userId).eq('financial_year', fy).neq('status', 'cancelled').order('invoice_date'),
    supabase.from('tds_records').select('*').eq('user_id', userId).eq('financial_year', fy).order('payment_date'),
    supabase.from('income').select('*').eq('user_id', userId).eq('financial_year', fy).order('income_date'),
    supabase.from('expenses').select('*').eq('user_id', userId).eq('financial_year', fy).order('expense_date'),
    supabase.from('tax_payments').select('*').eq('user_id', userId).eq('financial_year', fy).order('paid_date'),
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
  ]);

  const firstError = [invoicesRes, tdsRes, incomeRes, expensesRes, taxPaidRes, userRes].find(r => r.error)?.error;
  if (firstError || !userRes.data) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Couldn’t prepare your export. Please try again.' });
    return;
  }

  const invoices = invoicesRes.data || [];
  const tds = tdsRes.data || [];
  const income = incomeRes.data || [];
  const expenses = expensesRes.data || [];
  const taxPaid = taxPaidRes.data || [];
  const user = userRes.data;

  const totalIncome = sum(income, 'amount');
  const fyStartYear = parseInt(fy.split('-')[0], 10);
  const depreciation = firstYearDepreciation(
    expenses.filter(e => e.is_capital_asset).map(e => ({ amount: num(e.amount), assetClass: e.asset_class, purchaseDate: e.expense_date })), fyStartYear);
  const totalExpenses = sum(expenses.filter(e => !e.is_capital_asset), 'amount') + depreciation;
  const totalTds = sum(tds, 'tds_amount');
  const advanceTaxPaid = sum(taxPaid, 'amount_paid');
  const gstCollected = sum(invoices, 'gst_amount');
  const regime: Regime = user.tax_regime === 'old' ? 'old' : 'new';
  const presumptive: Presumptive = user.presumptive === '44ADA' || user.presumptive === '44AD' ? user.presumptive : 'none';
  const tax = computeTax({ grossReceipts: totalIncome, expenses: totalExpenses, regime, presumptive, tdsPaid: totalTds, advanceTaxPaid });

  // ── Excel workbook ──────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kcreatio';
  wb.created = new Date();

  const summaryRows: [string, string | number][] = [
    ['Name', user.legal_name || user.name || ''],
    ['Trade name', user.trade_name || user.business_name || ''],
    ['PAN', user.pan || ''],
    ['GSTIN', user.gstin || 'Not registered'],
    ['Tax year', fy],
    ['Regime', regime === 'new' ? 'New' : 'Old'],
    ['Taxation', presumptive === 'none' ? 'Regular books' : `Presumptive (formerly ${presumptive})`],
    ['Gross receipts (excl. GST)', totalIncome],
    ['Business expenses (incl. depreciation)', totalExpenses],
    ['of which depreciation on assets bought this year', depreciation],
    ['GST charged on invoices', gstCollected],
    ['TDS deducted by brands', totalTds],
    ['Advance tax paid', advanceTaxPaid],
    ['Estimated tax liability', tax.totalTax],
    [tax.refund > 0 ? 'Estimated refund' : 'Estimated balance payable', tax.refund > 0 ? tax.refund : tax.balanceDue],
  ];
  const ws = wb.addWorksheet('Summary');
  ws.columns = [{ width: 32 }, { width: 24 }];
  summaryRows.forEach(([k, v]) => {
    const row = ws.addRow([k, v]);
    row.getCell(1).font = { bold: true };
    if (typeof v === 'number') row.getCell(2).numFmt = INR_FORMAT;
  });
  ws.addRow([]);
  ws.addRow(['Estimates only — please verify before filing.']).getCell(1).font = { italic: true, color: { argb: 'FF888888' } };

  addSheet(wb, 'Invoices', [
    { header: 'Invoice no.', key: 'invoice_number', width: 18 },
    { header: 'Date', key: 'invoice_date' },
    { header: 'Brand', key: 'brand_name', width: 28 },
    { header: 'Brand GSTIN', key: 'brand_gstin', width: 18 },
    { header: 'Place of supply', key: 'place_of_supply' },
    { header: 'Taxable value', key: 'base_amount', money: true },
    { header: 'CGST', key: 'cgst_amount', money: true },
    { header: 'SGST', key: 'sgst_amount', money: true },
    { header: 'IGST', key: 'igst_amount', money: true },
    { header: 'Invoice total', key: 'total_amount', money: true },
    { header: 'Status', key: 'status' },
    { header: 'Amount received', key: 'amount_received', money: true },
  ], invoices.map(i => ({ ...i, place_of_supply: i.place_of_supply || i.brand_state_code })),
  ['base_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount', 'amount_received']);

  addSheet(wb, 'Income', [
    { header: 'Date', key: 'income_date' },
    { header: 'Quarter', key: 'quarter' },
    { header: 'Source', key: 'source' },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Amount (excl. GST)', key: 'amount', money: true },
  ], income, ['amount']);

  addSheet(wb, 'Expenses', [
    { header: 'Date', key: 'expense_date' },
    { header: 'Category', key: 'category' },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Amount', key: 'amount', money: true },
    { header: 'GST paid (ITC)', key: 'gst_paid', money: true },
    { header: 'Vendor GSTIN', key: 'vendor_gstin', width: 18 },
    { header: 'Capital asset', key: 'asset_class' },
  ], expenses, ['amount', 'gst_paid']);

  addSheet(wb, 'TDS', [
    { header: 'Payment date', key: 'payment_date' },
    { header: 'Quarter', key: 'quarter' },
    { header: 'Brand', key: 'brand_name', width: 28 },
    { header: 'TAN', key: 'brand_tan' },
    { header: 'Section', key: 'section', width: 24 },
    { header: 'Taxable value', key: 'invoice_amount', money: true },
    { header: 'Rate %', key: 'tds_rate' },
    { header: 'TDS', key: 'tds_amount', money: true },
    { header: 'Amount received', key: 'received_amount', money: true },
    { header: 'Form 16A', key: 'form_16a_status' },
  ], tds, ['invoice_amount', 'tds_amount', 'received_amount']);

  addSheet(wb, 'Advance tax paid', [
    { header: 'Quarter', key: 'quarter' },
    { header: 'Paid on', key: 'paid_date' },
    { header: 'Challan / CIN', key: 'challan_number', width: 22 },
    { header: 'Amount', key: 'amount_paid', money: true },
  ], taxPaid, ['amount_paid']);

  const workbook = Buffer.from(await wb.xlsx.writeBuffer());

  // ── Summary PDF ─────────────────────────────────────────────────────────────
  const row = (k: string, v: string, strong = false) =>
    `<tr${strong ? ' class="strong"' : ''}><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>`;
  const summaryHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:11px}
    h1{font-size:18px;margin:0 0 2px} .muted{color:#666} h2{font-size:12px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.06em;color:#555}
    table{width:100%;border-collapse:collapse} td{padding:5px 6px;border-bottom:1px solid #eee} .r{text-align:right;font-variant-numeric:tabular-nums}
    .strong td{font-weight:700;border-top:2px solid #1a1a1a} .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px}
    .note{margin-top:18px;font-size:9px;color:#777}
  </style></head><body>
    <h1>Tax year ${esc(fy)} — summary for your CA</h1>
    <div class="muted">Prepared with Kcreatio on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <h2>Taxpayer</h2>
    <div class="grid">
      <div>Name: <b>${esc(user.legal_name || user.name)}</b></div><div>PAN: <b>${esc(user.pan || '—')}</b></div>
      <div>Trade name: ${esc(user.trade_name || user.business_name || '—')}</div><div>GSTIN: ${esc(user.gstin || 'Not registered')}</div>
      <div>State: ${esc(stateLabel(user.gstin?.slice(0, 2) || user.state_code) || '—')}</div><div>Regime: ${regime === 'new' ? 'New' : 'Old'} · ${presumptive === 'none' ? 'Regular books' : `Presumptive (formerly ${presumptive})`}</div>
    </div>
    <h2>Income and expenses</h2>
    <table>
      ${row('Gross receipts, excluding GST', inr(totalIncome))}
      ${row(presumptive === 'none' ? 'Business expenses' : 'Business expenses (not used under presumptive taxation)', inr(totalExpenses))}
      ${presumptive !== 'none' ? row('Presumptive income', inr(tax.businessIncome)) : ''}
      ${row('Taxable income', inr(tax.taxableIncome), true)}
    </table>
    <h2>Tax computation (estimate)</h2>
    <table>
      ${row('Tax on slabs', inr(tax.baseTax))}
      ${tax.rebate ? row('Less: rebate (Sec 87A)', inr(tax.rebate)) : ''}
      ${tax.marginalRelief ? row('Less: marginal relief', inr(tax.marginalRelief)) : ''}
      ${row('Health and education cess (4%)', inr(tax.cess))}
      ${row('Total tax liability', inr(tax.totalTax), true)}
      ${row('Less: TDS deducted by brands', inr(totalTds))}
      ${row('Less: advance tax paid', inr(advanceTaxPaid))}
      ${tax.refund > 0 ? row('Estimated refund', inr(tax.refund), true) : row('Estimated balance payable', inr(tax.balanceDue), true)}
    </table>
    <h2>GST and records</h2>
    <table>
      ${row('Invoices issued', String(invoices.length))}
      ${row('GST charged on invoices', inr(gstCollected))}
      ${row('TDS entries', `${tds.length} (Form 16A received: ${tds.filter(t => t.form_16a_status === 'received').length})`)}
    </table>
    <p class="note">These figures come from the records entered in Kcreatio and are estimates. They are not tax advice — please check them against Form 26AS / AIS and the underlying documents before filing.${tax.surchargeNotApplied ? ' Surcharge on income above ₹50 lakh is not included.' : ''}</p>
  </body></html>`;

  // ── Invoice PDFs (rendered one by one; if the PDF engine is down, the rest are listed as missing)
  const invoicePdfs: { name: string; buffer: Buffer }[] = [];
  const missing: string[] = [];
  let pdfEngineOk = true;
  for (const inv of invoices) {
    if (!pdfEngineOk) { missing.push(inv.invoice_number); continue; }
    try {
      const buffer = await generateInvoicePdfWithPuppeteer(inv, user, `${inv.id}:${inv.updated_at || inv.created_at}`, req.userPlan);
      invoicePdfs.push({ name: `invoices/${fileSafe(inv.invoice_number)}.pdf`, buffer });
    } catch (err) {
      console.warn('[export] invoice PDF failed:', err);
      pdfEngineOk = false;
      missing.push(inv.invoice_number);
    }
  }
  let summaryPdf: Buffer | null = null;
  if (pdfEngineOk) {
    try { summaryPdf = await renderHtmlToPdf(summaryHtml); } catch (err) { console.warn('[export] summary PDF failed:', err); }
  }

  const readme = [
    `Kcreatio export — tax year ${fy}`,
    '',
    `summary.${summaryPdf ? 'pdf' : 'html'}        One-page summary with the tax computation`,
    `kcreatio-${fy}.xlsx     Sheets: Summary, Invoices, Income, Expenses, TDS, Advance tax paid`,
    `invoices/              ${invoicePdfs.length} invoice PDF(s)`,
    ...(missing.length ? ['', `These invoices couldn't be rendered as PDF — download them from Kcreatio: ${missing.join(', ')}`] : []),
    '',
    'Figures are estimates based on the records entered. Verify against Form 26AS / AIS before filing.',
  ].join('\n');

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="kcreatio-${fy}.zip"`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: Error) => { console.error('[export] zip failed:', err); res.destroy(err); });
  archive.pipe(res);
  archive.append(readme, { name: 'README.txt' });
  archive.append(workbook, { name: `kcreatio-${fy}.xlsx` });
  if (summaryPdf) archive.append(summaryPdf, { name: 'summary.pdf' });
  else archive.append(summaryHtml, { name: 'summary.html' });
  for (const f of invoicePdfs) archive.append(f.buffer, { name: f.name });
  await archive.finalize();
});

export default router;
