// Numeric input limits. Each one mirrors the Zod .max() on the matching backend field,
// so a value the form accepts is never rejected by the API.
export const LIMITS = {
  MONEY: 9999999,           // ₹99,99,999 — invoice, income, expense, deal, TDS, credit-note amounts
  MONEY_LARGE: 99999999,    // ₹9,99,99,999 — amount received, advance-tax payments
  ANNUAL_ESTIMATE: 999999999, // ₹99,99,99,999 — tax planner income override
  FOREIGN_AMOUNT: 999999999,
  FX_RATE: 100000,
  PERCENT: 100,             // TDS rate, percentage discount
  FOLLOWERS: 1000000000,
};

// Cleans a typed or pasted value for a numeric field.
// Returns the cleaned string, or null when the value is over `max` (the caller should then ignore the keystroke).
// Only non-negative numbers are supported; `min` above 0 is checked on submit, because "0.5" passes through "0".
export function sanitizeNumber(raw, { max = LIMITS.MONEY, decimals = 2 } = {}) {
  let v = String(raw ?? '').replace(/[^\d.]/g, '');
  if (decimals > 0) {
    const [int, ...rest] = v.split('.');
    v = rest.length ? `${int}.${rest.join('').slice(0, decimals)}` : int;
  } else {
    v = v.replace(/\./g, '');
  }
  v = v.replace(/^0+(?=\d)/, '');
  if (v.startsWith('.')) v = `0${v}`;
  if (v === '') return '';
  return Number(v) > max ? null : v;
}

export const overLimitMessage = (max, money = true) =>
  `Can be at most ${money ? '₹' : ''}${Number(max).toLocaleString('en-IN')}`;
