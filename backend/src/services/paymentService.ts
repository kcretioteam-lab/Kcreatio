import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { getAdvanceTaxQuarter, getFinancialYear } from './invoiceService.js';
import { logInvoiceEvent } from './auditLog.js';

// Body for marking an invoice or deal paid. TDS is what the brand actually deducted —
// brands often deduct odd amounts, so the client suggests rate × taxable value and the user confirms.
export const MarkPaidSchema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the payment date'),
  amountReceived: z.number().min(0, 'Enter the amount you received').max(99999999),
  tdsDeducted: z.number().min(0, 'TDS can’t be negative').max(99999999).default(0),
  tdsSection: z.string().max(60).optional(),
});

export type MarkPaidBody = z.infer<typeof MarkPaidSchema>;

type Result = { ok: true; id: string } | { ok: false; status: number; error: string; message: string };

const ERRORS: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: 'Not found' },
  ALREADY_PAID: { status: 409, message: 'This is already marked as paid' },
  TDS_TOO_HIGH: { status: 422, message: 'TDS can’t be more than the taxable value' },
  OVERPAID: { status: 422, message: 'That’s more than is still owed on this invoice' },
};

// Records a payment against an invoice (full or part — migration 018) or marks a deal paid,
// in one DB transaction: income on the taxable value (pro-rated for part payments), TDS if deducted,
// and status → paid once the invoice is fully settled.
export async function markPaid(kind: 'invoice' | 'deal', userId: string, id: string, body: MarkPaidBody): Promise<Result> {
  const date = new Date(body.paymentDate + 'T00:00:00');
  const { data, error } = await supabase.rpc(kind === 'invoice' ? 'record_invoice_payment' : 'mark_deal_paid', {
    p_user_id: userId,
    [kind === 'invoice' ? 'p_invoice_id' : 'p_deal_id']: id,
    p_payment_date: body.paymentDate,
    p_amount_received: body.amountReceived,
    p_tds_amount: body.tdsDeducted,
    p_tds_section: body.tdsSection || null,
    p_financial_year: getFinancialYear(date),
    p_quarter: getAdvanceTaxQuarter(date),
  });

  if (error) {
    const code = Object.keys(ERRORS).find(k => error.message?.includes(k));
    if (code) return { ok: false, error: code, ...ERRORS[code] };
    return { ok: false, status: 500, error: 'INTERNAL_ERROR', message: 'Couldn’t record the payment. Please try again.' };
  }
  return { ok: true, id: data as string };
}

// A payment spotted by Smart Inbox. The amount in the email is what reached the bank —
// the invoice total minus any TDS — so match invoices whose total is at or a little above it.
// tdsFromEmail is the TDS the email says was deducted, when it says so.
export async function recordDetectedPayment(
  userId: string,
  amountReceived: number,
  detectionId: string,
  description: string,
  preferredInvoiceId?: string,
  tdsFromEmail?: number,
  brandName?: string,
): Promise<{ invoiceId?: string; income: Record<string, any> | null; tdsRecordId?: string }> {
  const today = new Date();
  const paymentDate = today.toISOString().split('T')[0];
  const receivedPaise = Math.round(amountReceived * 100);
  const emailTdsPaise = tdsFromEmail && tdsFromEmail > 0 ? Math.round(tdsFromEmail * 100) : 0;

  let invoice: { id: string; total_amount: number; base_amount: number } | undefined;
  if (preferredInvoiceId) {
    const { data } = await supabase.from('invoices').select('id, total_amount, base_amount')
      .eq('id', preferredInvoiceId).eq('user_id', userId).in('status', ['draft', 'sent', 'overdue', 'partially_paid']).maybeSingle();
    invoice = data ?? undefined;
  } else {
    const { data } = await supabase.from('invoices').select('id, total_amount, base_amount')
      .eq('user_id', userId).in('status', ['sent', 'overdue'])
      .gte('total_amount', amountReceived * 0.99)
      .lte('total_amount', amountReceived * 1.12);
    invoice = (data || []).sort((a, b) => Number(a.total_amount) - Number(b.total_amount))[0];
  }

  if (invoice) {
    const basePaise = Math.round(Number(invoice.base_amount) * 100);
    const shortfallPaise = Math.max(0, Math.round(Number(invoice.total_amount) * 100) - receivedPaise);
    const tds = Math.min(basePaise, emailTdsPaise || shortfallPaise) / 100;
    const result = await markPaid('invoice', userId, invoice.id, {
      paymentDate, amountReceived, tdsDeducted: tds, tdsSection: tds > 0 ? '393 (formerly 194J)' : undefined,
    });
    if (!result.ok) throw new Error(`Couldn’t mark invoice paid: ${result.message}`);
    await logInvoiceEvent(null, userId, { id: invoice.id }, 'paid', { via: 'smart_inbox', amount_received: amountReceived, tds, detection_id: detectionId });
    const { data: income } = await supabase.from('income').select('*').eq('invoice_id', invoice.id).eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    return { invoiceId: invoice.id, income };
  }

  // No invoice to settle. Income is the taxable value — what arrived plus any TDS the brand kept —
  // and the TDS itself is logged so it counts towards the ITR credit.
  const fy = getFinancialYear(today);
  const quarter = getAdvanceTaxQuarter(today);
  const grossPaise = receivedPaise + emailTdsPaise;
  const { data: income, error } = await supabase.from('income').insert({
    user_id: userId,
    source: 'brand_deal',
    amount: grossPaise / 100,
    description,
    income_date: paymentDate,
    financial_year: fy,
    quarter,
  }).select().single();
  if (error || !income) throw new Error(`Couldn’t save the income: ${error?.message ?? 'unknown error'}`);

  let tdsRecordId: string | undefined;
  if (emailTdsPaise > 0) {
    const { data: tds, error: tdsErr } = await supabase.from('tds_records').insert({
      user_id: userId,
      brand_name: brandName ?? description,
      invoice_amount: grossPaise / 100,
      tds_rate: Math.round(emailTdsPaise / grossPaise * 10000) / 100,
      tds_amount: emailTdsPaise / 100,
      received_amount: receivedPaise / 100,
      section: '393 (formerly 194J)',
      quarter,
      form_16a_status: 'awaiting',
      financial_year: fy,
      payment_date: paymentDate,
    }).select('id').single();
    if (tdsErr || !tds) throw new Error(`Couldn’t save the TDS entry: ${tdsErr?.message ?? 'unknown error'}`);
    tdsRecordId = tds.id;
  }
  return { income, tdsRecordId };
}
