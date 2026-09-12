// GST state codes (Rule 46 CGST Rules 2017) — single source of truth.
// Both the invoice form's "Brand State" dropdown and the Settings page's
// "Business State" field must use this same list. They used to diverge
// (Settings was a free-text box), which let mismatched formatting
// ("9" vs "29") silently break the intrastate/interstate GST comparison —
// see normalizeStateCode() below for the defensive half of that fix.
export const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' }, { code: '28', name: 'Andhra Pradesh (old)' },
  { code: '29', name: 'Karnataka' }, { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' }, { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' }, { code: '38', name: 'Ladakh' },
];

export const STATE_MAP = Object.fromEntries(INDIAN_STATES.map(s => [s.code, s.name]));

// Defensive normalization for comparing two state codes. Handles the bad-data
// case that caused the intrastate/interstate misclassification bug: a code
// stored without its leading zero ("9" instead of "09"), or with stray
// whitespace, no longer silently fails a strict "===" comparison.
export function normalizeStateCode(code) {
  if (!code) return '';
  const digits = String(code).trim();
  return digits.length === 1 ? `0${digits}` : digits;
}
