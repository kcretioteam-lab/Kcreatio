// Credit notes (Section 34 CGST Act): issued when an invoiced deal is cancelled or reduced.
import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { getFinancialYear, getFYCode, getAdvanceTaxQuarter } from '../services/invoiceService.js';
import { renderHtmlToPdf } from '../services/puppeteerPdfService.js';
import { logInvoiceEvent } from '../services/auditLog.js';
import { stateLabel, supplierStateCode } from '../lib/gst.js';

const router = Router();
router.use(authenticate);

const CreateSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive('Enter the amount to credit (before GST)').max(9999999),   // taxable value being reversed
  reason: z.string().trim().min(3, 'Say why the credit note is being issued').max(300),
  noteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().slice(0, 10)),
});

const round2 = (n: number) => Math.round(n * 100) / 100;

async function nextCreditNoteNumber(userId: string, fyCode: string): Promise<string> {
  const { data } = await supabase.from('credit_notes').select('credit_note_number')
    .eq('user_id', userId).like('credit_note_number', `CN/${fyCode}/%`);
  const max = (data || []).reduce((m, r) => Math.max(m, parseInt(r.credit_note_number.split('/').pop() || '0', 10) || 0), 0);
  return `CN/${fyCode}/${String(max + 1).padStart(4, '0')}`;
}

// POST /credit-notes
router.post('/', validateBody(CreateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;
  const { data: inv } = await supabase.from('invoices').select('*').eq('id', body.invoiceId).eq('user_id', req.userId!).maybeSingle();
  if (!inv) { res.status(404).json({ error: 'NOT_FOUND', message: 'Invoice not found' }); return; }
  if (inv.status === 'draft' || inv.status === 'cancelled') {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Draft invoices can be edited or deleted instead — credit notes are for invoices already issued.' });
    return;
  }

  const { data: existing } = await supabase.from('credit_notes').select('base_amount').eq('invoice_id', inv.id);
  const alreadyCredited = (existing || []).reduce((s, r) => s + Number(r.base_amount), 0);
  const base = Number(inv.base_amount);
  if (body.amount > base - alreadyCredited + 0.005) {
    res.status(422).json({ error: 'VALIDATION_ERROR', field: 'amount', message: `You can credit at most ₹${round2(base - alreadyCredited).toLocaleString('en-IN')} on this invoice.` });
    return;
  }

  // GST is reversed in the same proportion as the taxable value
  const share = base > 0 ? body.amount / base : 0;
  const gst = round2(Number(inv.gst_amount) * share);
  const cgst = inv.cgst_amount != null ? round2(Number(inv.cgst_amount) * share) : null;
  const sgst = inv.sgst_amount != null ? round2(gst - (cgst ?? 0)) : null;
  const igst = inv.igst_amount != null ? gst : null;
  const noteDate = new Date(body.noteDate + 'T00:00:00');
  const fy = getFinancialYear(noteDate);

  const insert = async () => supabase.from('credit_notes').insert({
    user_id: req.userId!,
    invoice_id: inv.id,
    credit_note_number: await nextCreditNoteNumber(req.userId!, getFYCode(fy)),
    note_date: body.noteDate,
    reason: body.reason,
    base_amount: round2(body.amount),
    gst_amount: gst,
    cgst_amount: cgst,
    sgst_amount: sgst,
    igst_amount: igst,
    total_amount: round2(body.amount + gst),
    financial_year: fy,
  }).select().single();

  let { data: note, error } = await insert();
  for (let i = 0; i < 3 && error?.code === '23505'; i++) ({ data: note, error } = await insert());
  if (error || !note) { res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Couldn’t create the credit note. Please try again.' }); return; }

  // If income was already logged for this invoice, reverse the credited part of it
  if (inv.status === 'paid' || inv.status === 'partially_paid') {
    await supabase.from('income').insert({
      user_id: req.userId!, invoice_id: inv.id, deal_id: inv.deal_id, source: 'brand_deal',
      amount: -round2(body.amount), currency: 'INR',
      description: `Credit note ${note.credit_note_number} against ${inv.invoice_number}`,
      income_date: body.noteDate, financial_year: fy, quarter: getAdvanceTaxQuarter(noteDate),
    });
  }

  await logInvoiceEvent(req, req.userId!, inv, 'credit_note', { credit_note: note.credit_note_number, amount: body.amount, reason: body.reason });
  res.status(201).json(note);
});

// GET /credit-notes?invoiceId=
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  let q = supabase.from('credit_notes').select('*, invoices(invoice_number, brand_name)').eq('user_id', req.userId!).order('note_date', { ascending: false });
  if (typeof req.query.invoiceId === 'string') q = q.eq('invoice_id', req.query.invoiceId);
  const { data, error } = await q;
  if (error) { res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Couldn’t load credit notes.' }); return; }
  res.json({ creditNotes: data || [] });
});

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const inr = (n: unknown) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// GET /credit-notes/:id/pdf
router.get('/:id/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  const { data: note } = await supabase.from('credit_notes').select('*').eq('id', req.params.id).eq('user_id', req.userId!).maybeSingle();
  if (!note) { res.status(404).json({ error: 'NOT_FOUND', message: 'Credit note not found' }); return; }
  const [{ data: inv }, { data: user }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', note.invoice_id).maybeSingle(),
    supabase.from('users').select('name, business_name, legal_name, gstin, pan, business_address, state_code').eq('id', req.userId!).maybeSingle(),
  ]);
  const supplierState = user ? supplierStateCode(user) : null;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a} h1{font-size:18px;margin:0}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0} .lbl{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.08em}
    table{width:100%;border-collapse:collapse;margin-top:12px} td,th{padding:6px;border-bottom:1px solid #eee;text-align:left} .r{text-align:right}
    .total td{font-weight:700;border-top:2px solid #1a1a1a}
  </style></head><body>
    <h1>CREDIT NOTE</h1>
    <div>${esc(note.credit_note_number)} · Date ${esc(note.note_date)} · Against invoice <b>${esc(inv?.invoice_number)}</b> dated ${esc(inv?.invoice_date)}</div>
    <div class="grid">
      <div><div class="lbl">Supplier</div><b>${esc(user?.legal_name || user?.business_name || user?.name)}</b><br>${user?.gstin ? `GSTIN: ${esc(user.gstin)}<br>` : ''}${esc(user?.business_address)}<br>${esc(stateLabel(supplierState))}</div>
      <div><div class="lbl">Recipient</div><b>${esc(inv?.brand_name)}</b><br>${inv?.brand_gstin ? `GSTIN: ${esc(inv.brand_gstin)}<br>` : ''}${esc(inv?.brand_address)}<br>${esc(stateLabel(inv?.brand_state_code))}</div>
    </div>
    <div><span class="lbl">Reason</span><br>${esc(note.reason)}</div>
    <table>
      <tr><td>Taxable value reduced</td><td class="r">${inr(note.base_amount)}</td></tr>
      ${note.cgst_amount != null ? `<tr><td>Less: CGST</td><td class="r">${inr(note.cgst_amount)}</td></tr><tr><td>Less: SGST</td><td class="r">${inr(note.sgst_amount)}</td></tr>` : ''}
      ${note.igst_amount != null ? `<tr><td>Less: IGST</td><td class="r">${inr(note.igst_amount)}</td></tr>` : ''}
      <tr class="total"><td>Total credit</td><td class="r">${inr(note.total_amount)}</td></tr>
    </table>
    <p style="margin-top:40px;text-align:right">For ${esc(user?.business_name || user?.name)}<br><br>Authorised signatory</p>
  </body></html>`;
  try {
    const pdf = await renderHtmlToPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${note.credit_note_number.replace(/\//g, '-')}.pdf"`);
    res.send(pdf);
  } catch {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
});

export default router;
