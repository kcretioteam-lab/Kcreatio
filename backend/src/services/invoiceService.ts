// GST configuration for Indian content creators
export const CREATOR_GST_CONFIG = {
  hsnCode: '998399',
  serviceDescription: 'Content Creation and Influencer Marketing Services',
  defaultGstRate: 18,
};

export const VALID_GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = typeof VALID_GST_RATES[number];

export interface GstCalculation {
  baseAmount: number;
  gstRate: GstRate;
  gstAmount: number;
  totalAmount: number;
  supplyType: 'intrastate' | 'interstate';
  cgstAmount: number | null;
  sgstAmount: number | null;
  igstAmount: number | null;
}

export function calculateGst(
  baseAmountRupees: number,
  gstRate: GstRate,
  creatorStateCode: string,
  brandStateCode: string
): GstCalculation {
  // Calculate in paise to avoid floating point errors
  const basePaise = Math.round(baseAmountRupees * 100);
  const gstPaise = Math.round(basePaise * gstRate / 100);
  const totalPaise = basePaise + gstPaise;

  const supplyType: 'intrastate' | 'interstate' =
    creatorStateCode && brandStateCode && creatorStateCode === brandStateCode
      ? 'intrastate'
      : 'interstate';

  return {
    baseAmount: basePaise / 100,
    gstRate,
    gstAmount: gstPaise / 100,
    totalAmount: totalPaise / 100,
    supplyType,
    cgstAmount: supplyType === 'intrastate' ? gstPaise / 2 / 100 : null,
    sgstAmount: supplyType === 'intrastate' ? gstPaise / 2 / 100 : null,
    igstAmount: supplyType === 'interstate' ? gstPaise / 100 : null,
  };
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
