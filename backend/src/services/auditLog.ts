import { Request } from 'express';
import { supabase } from '../lib/supabase.js';
import { currentSessionId } from './sessionService.js';

export type InvoiceAction = 'created' | 'updated' | 'sent' | 'paid' | 'deleted' | 'brand_confirmed';

// Records who changed an invoice and how. Never throws — an audit write must not fail the request.
export async function logInvoiceEvent(
  req: Request | null,
  userId: string,
  invoice: { id: string; invoice_number?: string | null },
  action: InvoiceAction,
  changes?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from('invoice_audit_log').insert({
      user_id: userId,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number ?? null,
      action,
      changes: changes ?? null,
      session_id: req ? currentSessionId(req) ?? null : null,
    });
  } catch (err) {
    console.warn('[audit] could not record invoice event:', err);
  }
}
