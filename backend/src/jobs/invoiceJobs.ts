import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { getFinancialYear, getFYCode, nextInvoiceNumber } from '../services/invoiceService.js';
import { nextRecurringDate } from '../lib/dates.js';
import { logInvoiceEvent } from '../services/auditLog.js';
import { sendPaymentReminderEmail, sendRecurringDraftEmail } from '../services/emailService.js';

const MAX_REMINDERS = 3;
const REMINDER_GAP_DAYS = 7;
const DAY = 86400000;
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Emails the brand about unpaid invoices the creator opted in for: first after the due date,
// then weekly, at most three times.
export async function runPaymentReminders(now = new Date()): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  const { data: invoices, error } = await supabase.from('invoices')
    .select('id, user_id, invoice_number, brand_name, brand_email, total_amount, amount_received, due_date, last_reminder_at, reminder_count')
    .eq('reminders_enabled', true)
    .in('status', ['sent', 'overdue', 'partially_paid'])
    .lt('due_date', today)
    .lt('reminder_count', MAX_REMINDERS)
    .not('brand_email', 'is', null);
  if (error || !invoices) { if (error) console.error('[CRON] reminders query failed:', error); return 0; }

  let sent = 0;
  for (const inv of invoices) {
    if (inv.last_reminder_at && now.getTime() - new Date(inv.last_reminder_at).getTime() < REMINDER_GAP_DAYS * DAY) continue;
    const { data: user } = await supabase.from('users').select('name, business_name, email, invoice_email').eq('id', inv.user_id).maybeSingle();
    if (!user) continue;
    try {
      await sendPaymentReminderEmail(inv.brand_email!, {
        brandName: inv.brand_name,
        creatorName: user.business_name || user.name,
        invoiceNumber: inv.invoice_number,
        amountDue: inr(Math.max(0, Number(inv.total_amount) - Number(inv.amount_received || 0))),
        dueDate: new Date(inv.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        daysOverdue: Math.floor((now.getTime() - new Date(inv.due_date + 'T00:00:00').getTime()) / DAY),
        replyTo: user.invoice_email || user.email,
      });
      await supabase.from('invoices').update({ last_reminder_at: now.toISOString(), reminder_count: (inv.reminder_count || 0) + 1 }).eq('id', inv.id);
      await logInvoiceEvent(null, inv.user_id, inv, 'reminder_sent', { to: inv.brand_email, count: (inv.reminder_count || 0) + 1 });
      sent++;
    } catch (err) {
      console.error('[CRON] reminder failed for', inv.id, err);
    }
  }
  return sent;
}

// Drafts the next copy of each recurring invoice on its date. The new draft carries the
// schedule forward; the creator reviews and sends it.
const COPY_FIELDS = [
  'brand_name', 'brand_gstin', 'brand_address', 'brand_state_code', 'brand_pan', 'brand_email', 'brand_phone',
  'hsn_code', 'service_description', 'line_items', 'base_amount', 'gst_rate', 'gst_amount', 'total_amount', 'supply_type',
  'cgst_amount', 'sgst_amount', 'igst_amount', 'deal_id', 'notes', 'sac_code', 'place_of_supply', 'reverse_charge',
  'template_id', 'payment_terms', 'discount_value', 'discount_type', 'include_bank_details', 'bank_name', 'account_number',
  'ifsc_code', 'account_holder_name', 'upi_id', 'include_terms', 'terms_text', 'include_signatory', 'signatory_name',
  'signatory_image_url', 'seller_business_name', 'include_upi', 'upi_scanner_url', 'invoice_accent_color',
  'is_export', 'export_currency', 'lut_number', 'reminders_enabled', 'recurring',
] as const;

export async function runRecurringInvoices(now = new Date()): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  const { data: due, error } = await supabase.from('invoices').select('*').not('recurring', 'is', null).lte('next_recurring_on', today);
  if (error || !due) { if (error) console.error('[CRON] recurring query failed:', error); return 0; }

  let created = 0;
  for (const src of due) {
    const { data: user } = await supabase.from('users').select('name, email, invoice_prefix').eq('id', src.user_id).maybeSingle();
    if (!user) continue;
    const issueDate: string = src.next_recurring_on;
    const fy = getFinancialYear(new Date(issueDate + 'T00:00:00'));
    const termDays = src.due_date && src.invoice_date
      ? Math.max(0, Math.round((new Date(src.due_date).getTime() - new Date(src.invoice_date).getTime()) / DAY)) : 30;
    const copy: Record<string, unknown> = Object.fromEntries(COPY_FIELDS.map(k => [k, src[k]]));

    let inserted = null;
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      const number = await nextInvoiceNumber(src.user_id, user.invoice_prefix || 'INV', getFYCode(fy));
      const { data, error: insErr } = await supabase.from('invoices').insert({
        ...copy,
        user_id: src.user_id,
        invoice_number: number,
        status: 'draft',
        invoice_date: issueDate,
        due_date: new Date(new Date(issueDate + 'T00:00:00Z').getTime() + termDays * DAY).toISOString().slice(0, 10),
        financial_year: fy,
        next_recurring_on: nextRecurringDate(issueDate, src.recurring),
        recurring_parent_id: src.id,
      }).select('id, invoice_number').single();
      if (!insErr) inserted = data;
      else if (insErr.code !== '23505') { console.error('[CRON] recurring insert failed:', insErr); break; }
    }
    if (!inserted) continue;

    // The schedule now lives on the new draft
    await supabase.from('invoices').update({ recurring: null, next_recurring_on: null }).eq('id', src.id);
    await logInvoiceEvent(null, src.user_id, inserted, 'recurring_created', { from: src.invoice_number });
    sendRecurringDraftEmail(user.email, user.name, inserted.invoice_number, src.brand_name, inserted.id).catch(() => {});
    created++;
  }
  return created;
}

export function startInvoiceJobs() {
  cron.schedule('30 9 * * *', () => {
    runPaymentReminders().then(n => console.log(`[CRON] payment reminders sent: ${n}`)).catch(err => console.error('[CRON] reminders', err));
  }, { timezone: 'Asia/Kolkata' });
  cron.schedule('0 7 * * *', () => {
    runRecurringInvoices().then(n => console.log(`[CRON] recurring drafts created: ${n}`)).catch(err => console.error('[CRON] recurring', err));
  }, { timezone: 'Asia/Kolkata' });
}
