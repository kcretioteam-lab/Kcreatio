// GST helpers. MIRROR of backend/src/lib/gst.ts — change them together.

export const STATE_CODES = {
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

// Current states for pickers — legacy codes (25, 28) stay valid in GSTINs but aren't offered.
export const INDIAN_STATES = Object.entries(STATE_CODES)
  .filter(([code]) => code !== '25' && code !== '28' && code !== '96')
  .map(([code, name]) => ({ code, name }));

// GST rates after the September 2025 rationalisation. 12% and 28% were removed.
export const GST_RATES = [0, 5, 18, 40];
export const DEFAULT_GST_RATE = 18;
export const FOREIGN_STATE_CODE = '96';

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function gstinCheckDigit(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

// Returns null when valid, otherwise a user-facing message.
export function gstinError(gstin) {
  const g = (gstin || '').toUpperCase();
  if (!GSTIN_REGEX.test(g)) return 'GSTIN should be 15 characters, like 27ABCDE1234F1Z5';
  if (!STATE_CODES[g.slice(0, 2)]) return 'GSTIN starts with an unknown state code';
  if (gstinCheckDigit(g.slice(0, 14)) !== g[14]) return 'This GSTIN has a typo — the last character doesn’t match. Please re-check it.';
  return null;
}

export const panFromGstin = (gstin) => gstin.slice(2, 12).toUpperCase();

// The supplier's state comes from their GSTIN; state_code is a fallback for unregistered creators.
export function supplierStateCode(user) {
  if (user?.gstin && GSTIN_REGEX.test(user.gstin)) return user.gstin.slice(0, 2);
  return user?.state_code || null;
}

export const stateLabel = (code) => (code ? `${STATE_CODES[code] || 'Unknown'} | Code: ${code}` : '');
