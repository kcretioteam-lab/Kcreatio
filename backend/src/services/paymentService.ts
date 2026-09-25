import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { getAdvanceTaxQuarter, getFinancialYear } from './invoiceService.js';

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
};

// Marks an invoice or deal paid in one DB transaction (see migration 016):
// status → paid, one income row on the taxable value, one TDS row if any was deducted.
export async function markPaid(kind: 'invoice' | 'deal', userId: string, id: string, body: MarkPaidBody): Promise<Result> {
  const date = new Date(body.paymentDate + 'T00:00:00');
  const { data, error } = await supabase.rpc(kind === 'invoice' ? 'mark_invoice_paid' : 'mark_deal_paid', {
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
export async function recordDetectedPayment(
  userId: string,
  amountReceived: number,
  detectionId: string,
  description: string,
  preferredInvoiceId?: string,
): Promise<{ invoiceId?: string; income: Record<string, any> | null }> {
  const today = new Date();
  const paymentDate = today.toISOString().split('T')[0];

  let invoice: { id: string; total_amount: number; base_amount: number } | undefined;
  if (preferredInvoiceId) {
    const { data } = await supabase.from('invoices').select('id, total_amount, base_amount')
      .eq('id', preferredInvoiceId).eq('user_id', userId).in('status', ['draft', 'sent', 'overdue']).maybeSingle();
    invoice = data ?? undefined;
  } else {
    const { data } = await supabase.from('invoices').select('id, total_amount, base_amount')
      .eq('user_id', userId).in('status', ['sent', 'overdue'])
      .gte('total_amount', amountReceived * 0.99)
      .lte('total_amount', amountReceived * 1.12);
    invoice = (data || []).sort((a, b) => Number(a.total_amount) - Number(b.total_amount))[0];
  }

  if (invoice) {
    const tds = Math.min(Number(invoice.base_amount), Math.max(0, Math.round((Number(invoice.total_amount) - amountReceived) * 100) / 100));
    const result = await markPaid('invoice', userId, invoice.id, {
      paymentDate, amountReceived, tdsDeducted: tds, tdsSection: tds > 0 ? '393 (formerly 194J)' : undefined,
    });
    if (result.ok) {
      const { data: income } = await supabase.from('income').select('*').eq('invoice_id', invoice.id).eq('user_id', userId).maybeSingle();
      return { invoiceId: invoice.id, income };
    }
  }

  const { data: income } = await supabase.from('income').insert({
    user_id: userId,
    source: 'brand_deal',
    amount: amountReceived,
    description,
    income_date: paymentDate,
    financial_year: getFinancialYear(today),
    quarter: getAdvanceTaxQuarter(today),
    extracted_data: { detection_id: detectionId },
  }).select().single();
  return { income };
}
