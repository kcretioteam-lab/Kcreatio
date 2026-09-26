import { supabase } from '../lib/supabase.js';
// GST configuration for Indian content creators
export const CREATOR_GST_CONFIG = {
  hsnCode: '998399',
  serviceDescription: 'Content Creation and Influencer Marketing Services',
  defaultGstRate: 18,
};

export { GST_RATES as VALID_GST_RATES } from '../lib/gst.js';
export type GstRate = number;

export interface InvoiceLine {
  description: string;
  sacCode?: string | null;
  amount: number;
  gstRate: number;
}

export interface GstCalculation {
  baseAmount: number;
  gstRate: GstRate;
  gstAmount: number;
  totalAmount: number;
  supplyType: 'intrastate' | 'interstate' | 'export';
  cgstAmount: number | null;
  sgstAmount: number | null;
  igstAmount: number | null;
  discountAmount: number;
  lines: (InvoiceLine & { taxableValue: number; gstAmount: number })[];
}

// Intrastate (CGST+SGST) only when the supplier's state and the place of supply match.
// Callers must make sure the supplier state is known — see supplierStateCode().
export function calculateInvoiceTotals(
  lines: InvoiceLine[],
  discount: { value?: number | null; type?: 'flat' | 'percent' | null },
  supplierState: string,
  placeOfSupply: string,
  opts: { exportUnderLut?: boolean } = {},
): GstCalculation {
  // Exports under a Letter of Undertaking are zero-rated: no IGST is charged.
  if (opts.exportUnderLut) lines = lines.map(l => ({ ...l, gstRate: 0 }));
  // Work in paise to avoid floating point errors
  const linePaise = lines.map(l => Math.round(l.amount * 100));
  const subtotalPaise = linePaise.reduce((s, p) => s + p, 0);
  const dv = Number(discount.value) || 0;
  const discountPaise = dv > 0
    ? Math.min(subtotalPaise, discount.type === 'percent' ? Math.round(subtotalPaise * dv / 100) : Math.round(dv * 100))
    : 0;
  const ratio = subtotalPaise > 0 ? (subtotalPaise - discountPaise) / subtotalPaise : 0;

  // Discount is spread across lines in proportion to their value, before GST.
  let basePaise = 0;
  let gstPaise = 0;
  const computed = lines.map((l, i) => {
    const taxable = Math.round(linePaise[i] * ratio);
    const gst = Math.round(taxable * l.gstRate / 100);
    basePaise += taxable;
    gstPaise += gst;
    return { ...l, taxableValue: taxable / 100, gstAmount: gst / 100 };
  });

  const supplyType: GstCalculation['supplyType'] = opts.exportUnderLut ? 'export' : supplierState === placeOfSupply ? 'intrastate' : 'interstate';
  const cgstPaise = Math.floor(gstPaise / 2);
  return {
    baseAmount: basePaise / 100,
    gstRate: lines.length ? Math.max(...lines.map(l => l.gstRate)) : 0,
    gstAmount: gstPaise / 100,
    totalAmount: (basePaise + gstPaise) / 100,
    supplyType,
    cgstAmount: supplyType === 'intrastate' ? cgstPaise / 100 : null,
    sgstAmount: supplyType === 'intrastate' ? (gstPaise - cgstPaise) / 100 : null,
    igstAmount: supplyType === 'interstate' ? gstPaise / 100 : supplyType === 'export' ? 0 : null,
    discountAmount: discountPaise / 100,
    lines: computed,
  };
}

// Single-line convenience wrapper
export function calculateGst(
  baseAmountRupees: number,
  gstRate: GstRate,
  supplierState: string,
  placeOfSupply: string,
): GstCalculation {
  return calculateInvoiceTotals(
    [{ description: '', amount: baseAmountRupees, gstRate }], {}, supplierState, placeOfSupply,
  );
}

export function getFinancialYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 4) return `${year}-${String(year + 1).slice(-2)}`;
  return `${year - 1}-${String(year).slice(-2)}`;
}

export function getAdvanceTaxQuarter(date: Date): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const month = date.getMonth() + 1;
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}

export function getFYCode(fy: string): string {
  // "2025-26" → "2526"
  const [startYear, endYY] = fy.split('-');
  return `${startYear.slice(-2)}${endYY}`;
}

// Next number in the creator's series for this tax year, e.g. INV/2627/0007
export async function nextInvoiceNumber(userId: string, prefix: string, fyCode: string): Promise<string> {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', userId)
    .like('invoice_number', `${prefix}/${fyCode}/%`);
  const maxSeq = (data || []).reduce((max, row) => {
    const n = parseInt(String(row.invoice_number).split('/').pop() || '0', 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}/${fyCode}/${String(maxSeq + 1).padStart(4, '0')}`;
}
