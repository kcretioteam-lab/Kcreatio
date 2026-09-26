// GST helpers shared by invoice routes, profile validation and PDFs.
// MIRRORED in frontend/src/utils/gst.js — change them together.

export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu (old)', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (old)', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
  '96': 'Foreign country', '97': 'Other Territory',
};

// GST rates after the September 2025 rationalisation. 12% and 28% were removed;
// old invoices keep whatever rate they were issued at.
export const GST_RATES = [0, 5, 18, 40] as const;
export const LEGACY_GST_RATES = [12, 28] as const;
export const DEFAULT_GST_RATE = 18;
export const FOREIGN_STATE_CODE = '96'; // place of supply for exports in GST returns

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// The 15th character of a GSTIN is a mod-36 check digit over the first 14.
export function gstinCheckDigit(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export type GstinProblem = 'format' | 'state' | 'checksum' | null;

export function checkGstin(gstin: string): GstinProblem {
  const g = gstin.toUpperCase();
  if (!GSTIN_REGEX.test(g)) return 'format';
  if (!STATE_CODES[g.slice(0, 2)]) return 'state';
  if (gstinCheckDigit(g.slice(0, 14)) !== g[14]) return 'checksum';
  return null;
}

export function isValidGstin(gstin: string): boolean {
  return checkGstin(gstin) === null;
}

export const GSTIN_MESSAGES: Record<Exclude<GstinProblem, null>, string> = {
  format: 'GSTIN should be 15 characters, like 27ABCDE1234F1Z5',
  state: 'GSTIN starts with an unknown state code',
  checksum: 'This GSTIN has a typo — the last character doesn’t match. Please re-check it.',
};

export const panFromGstin = (gstin: string) => gstin.slice(2, 12).toUpperCase();

// The supplier's state comes from their GSTIN; the state code field is only a fallback
// for creators who aren't GST-registered yet.
export function supplierStateCode(user: { gstin?: string | null; state_code?: string | null }): string | null {
  if (user.gstin && GSTIN_REGEX.test(user.gstin)) return user.gstin.slice(0, 2);
  return user.state_code || null;
}

export const stateLabel = (code?: string | null) =>
  code ? `${STATE_CODES[code] || 'Unknown'} | Code: ${code}` : '';
