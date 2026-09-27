import { supabase } from './supabase.js';

// Columns added by later migrations that the code relies on. Some features quietly degrade when one is
// missing (e.g. invoice saves stop being idempotent without 019), so say so loudly at startup.
const REQUIRED: { table: string; column: string; migration: string; impact: string }[] = [
  { table: 'invoices', column: 'client_request_id', migration: '019_invoice_client_request_id.sql', impact: 'retried invoice saves create duplicate invoices' },
  { table: 'invoices', column: 'line_items', migration: '016_payment_integrity_tax_profile.sql', impact: 'multi-line invoices can’t be saved' },
  { table: 'tds_records', column: 'deal_id', migration: '016_payment_integrity_tax_profile.sql', impact: 'deal payments can’t record TDS' },
  { table: 'invoice_payments', column: 'id', migration: '018_creator_features.sql', impact: 'part payments fail' },
];

export async function checkSchema(): Promise<string[]> {
  const problems: string[] = [];
  for (const r of REQUIRED) {
    const { error } = await supabase.from(r.table).select(r.column).limit(0);
    if (error && /does not exist|schema cache|Could not find/i.test(error.message)) {
      problems.push(`${r.table}.${r.column} is missing — run ${r.migration} (${r.impact})`);
    }
  }
  for (const p of problems) console.error(`[SCHEMA] ${p}`);
  return problems;
}
