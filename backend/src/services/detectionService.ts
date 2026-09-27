import { supabase } from '../lib/supabase.js';
import { recordDetectedPayment } from './paymentService.js';
import { getFinancialYear, getAdvanceTaxQuarter } from './invoiceService.js';

// Applies a Smart Inbox detection — creates the income / TDS / expense / deal it describes and links it.
// Shared by PUT /email-detections/:id/accept, scan-now auto-apply and the background Gmail job.
// Throws if the record can't be saved, so the detection is never marked accepted without its record.

export interface DetectionData {
  brand_name?: string;
  amount?: number;        // payment: what reached the bank · tds: taxable (gross) value · expense/deal: the amount
  tds_amount?: number;    // TDS the email says was deducted
  tds_rate?: number;
  tan?: string;
  contact_email?: string;
  description?: string;
  [key: string]: unknown;
}

const toPaise = (rupees: number) => Math.round(rupees * 100);
const toRupees = (paise: number) => paise / 100;

export class DetectionApplyError extends Error {}

function fail(what: string, error: { message?: string } | null): never {
  throw new DetectionApplyError(`Couldn’t save the ${what}${error?.message ? `: ${error.message}` : ''}`);
}

// TDS figures from what the email stated. Gross is the taxable value TDS was charged on.
export function tdsFigures(data: DetectionData): { gross: number; tds: number; rate: number } | null {
  const rate = data.tds_rate && data.tds_rate > 0 ? data.tds_rate : undefined;
  let gross = data.amount && data.amount > 0 ? toPaise(data.amount) : 0;
  let tds = data.tds_amount && data.tds_amount > 0 ? toPaise(data.tds_amount) : 0;
  if (!tds && gross && rate) tds = Math.round(gross * rate / 100);
  if (!gross && tds && rate) gross = Math.round(tds * 100 / rate);
  if (!gross || !tds || tds > gross) return null;
  return { gross: toRupees(gross), tds: toRupees(tds), rate: rate ?? Math.round(tds / gross * 10000) / 100 };
}

export async function applyDetection(
  detectionId: string,
  userId: string,
  detectedType: string,
  data: DetectionData,
  finalStatus: 'accepted' | 'auto_applied',
  preferredInvoiceId?: string,
  expenseCategory?: string,
): Promise<Record<string, any> | null> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const fy = getFinancialYear(today);
  const updates: Record<string, any> = { status: finalStatus, reviewed_at: today.toISOString() };
  let createdRecord: Record<string, any> | null = null;

  if (detectedType === 'payment_received') {
    if (!data.amount) throw new DetectionApplyError('Add the amount you received before accepting');
    const { invoiceId, income, tdsRecordId } = await recordDetectedPayment(
      userId, Number(data.amount), detectionId,
      data.description ?? data.brand_name ?? 'Payment detected via Smart Inbox', preferredInvoiceId,
      data.tds_amount ? Number(data.tds_amount) : undefined, data.brand_name,
    );
    if (invoiceId) updates.linked_invoice_id = invoiceId;
    if (tdsRecordId) updates.linked_tds_id = tdsRecordId;
    updates.linked_income_id = income?.id ?? null;
    createdRecord = income;

  } else if (detectedType === 'deal_confirmed' || detectedType === 'deal_inquiry') {
    const { data: deal, error } = await supabase.from('deals').insert({
      user_id: userId,
      brand_name: data.brand_name ?? 'Unknown Brand',
      brand_contact_email: data.contact_email ?? null,
      deal_value: data.amount ?? 0,
      status: 'inquiry',
      notes: `Added from Smart Inbox (${detectedType === 'deal_confirmed' ? 'confirmed' : 'soft inquiry'})`,
    }).select().single();
    if (error || !deal) fail('deal', error);
    updates.linked_deal_id = deal.id;
    createdRecord = deal;

  } else if (detectedType === 'tds_deduction') {
    const figures = tdsFigures(data);
    if (!figures) throw new DetectionApplyError('Add the taxable amount and the TDS (or TDS rate) before accepting');
    const { data: tds, error } = await supabase.from('tds_records').insert({
      user_id: userId,
      brand_name: data.brand_name ?? 'Unknown Brand',
      brand_tan: data.tan ?? null,
      invoice_amount: figures.gross,
      tds_rate: figures.rate,
      tds_amount: figures.tds,
      received_amount: toRupees(toPaise(figures.gross) - toPaise(figures.tds)),
      quarter: getAdvanceTaxQuarter(today),
      form_16a_status: 'awaiting',
      financial_year: fy,
      payment_date: todayStr,
    }).select().single();
    if (error || !tds) fail('TDS entry', error);
    updates.linked_tds_id = tds.id;
    createdRecord = tds;

  } else if (detectedType === 'expense') {
    if (!data.amount) throw new DetectionApplyError('Add the amount before accepting');
    const { data: expense, error } = await supabase.from('expenses').insert({
      user_id: userId,
      category: expenseCategory ?? 'subscription',
      amount: data.amount,
      description: data.description ?? 'Detected via Smart Inbox',
      expense_date: todayStr,
      financial_year: fy,
    }).select().single();
    if (error || !expense) fail('expense', error);
    createdRecord = expense;

  } else if (detectedType === 'form_16a') {
    // Mark this brand's outstanding TDS entries as having their Form 16A
    const brandName = data.brand_name?.replace(/[%_\\]/g, '');
    let updated = 0;
    if (brandName) {
      const { data: rows, error } = await supabase.from('tds_records')
        .update({ form_16a_status: 'received' })
        .eq('user_id', userId)
        .ilike('brand_name', `%${brandName}%`)
        .in('form_16a_status', ['awaiting', 'requested'])
        .select('id');
      if (error) fail('Form 16A status', error);
      updated = rows?.length ?? 0;
    }
    createdRecord = { updated, brand: brandName };
  }

  const { error } = await supabase.from('email_detections').update(updates).eq('id', detectionId).eq('user_id', userId);
  if (error) fail('detection status', error);
  return createdRecord;
}
