// Kcreatio tax engine — single source of truth for income-tax maths.
// MIRROR of backend/src/services/taxEngine.ts. Both copies are checked against
// backend/src/services/__tests__/taxCases.json — change them together.
//
// All amounts are in rupees. Rules as of tax year 2026-27 (Income-tax Act 2025;
// slab rates and 87A carried over from FY 2025-26). PENDING CA SIGN-OFF.


export const NEW_REGIME_SLABS = [
  { min: 0,       max: 400000,   rate: 0 },
  { min: 400000,  max: 800000,   rate: 0.05 },
  { min: 800000,  max: 1200000,  rate: 0.10 },
  { min: 1200000, max: 1600000,  rate: 0.15 },
  { min: 1600000, max: 2000000,  rate: 0.20 },
  { min: 2000000, max: 2400000,  rate: 0.25 },
  { min: 2400000, max: Infinity, rate: 0.30 },
];

export const OLD_REGIME_SLABS = [
  { min: 0,       max: 250000,   rate: 0 },
  { min: 250000,  max: 500000,   rate: 0.05 },
  { min: 500000,  max: 1000000,  rate: 0.20 },
  { min: 1000000, max: Infinity, rate: 0.30 },
];

const STANDARD_DEDUCTION = { new: 75000, old: 50000 };
const REBATE = { new: { limit: 1200000, max: 60000 }, old: { limit: 500000, max: 12500 } };
const PRESUMPTIVE_RATE = { '44ADA': 0.5, '44AD': 0.06 }; // 44AD: 6% for digital receipts
export const ADVANCE_TAX_THRESHOLD = 10000;

// Surcharge on income-tax when taxable income exceeds each threshold. The new regime caps it at 25%.
export const SURCHARGE_BANDS = [
  { above: 50000000, rate: { new: 0.25, old: 0.37 } },
  { above: 20000000, rate: { new: 0.25, old: 0.25 } },
  { above: 10000000, rate: { new: 0.15, old: 0.15 } },
  { above: 5000000,  rate: { new: 0.10, old: 0.10 } },
];

function surchargeRate(taxable, regime) {
  const band = SURCHARGE_BANDS.find(b => taxable > b.above);
  return band ? band.rate[regime] : 0;
}

// Surcharge with marginal relief: tax + surcharge may not exceed the tax + surcharge at the
// threshold just crossed by more than the income above that threshold.
export function surchargeOn(taxable, tax, regime) {
  const band = SURCHARGE_BANDS.find(b => taxable > b.above);
  if (!band || tax <= 0) return 0;
  const full = tax * band.rate[regime];
  const taxAtThreshold = slabTax(band.above, regime);
  const cap = taxAtThreshold * (1 + surchargeRate(band.above, regime)) + (taxable - band.above);
  return Math.round(Math.max(0, Math.min(full, cap - tax)));
}

export const INSTALMENT_SCHEDULE = [
  { quarter: 'Q1', dueDate: 'Jun 15', dueMonth: 5,  dueDay: 15, cumPct: 0.15 },
  { quarter: 'Q2', dueDate: 'Sep 15', dueMonth: 8,  dueDay: 15, cumPct: 0.45 },
  { quarter: 'Q3', dueDate: 'Dec 15', dueMonth: 11, dueDay: 15, cumPct: 0.75 },
  { quarter: 'Q4', dueDate: 'Mar 15', dueMonth: 2,  dueDay: 15, cumPct: 1.00 },
];

export function slabTax(taxable, regime) {
  const slabs = regime === 'old' ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  let tax = 0;
  for (const s of slabs) {
    if (taxable <= s.min) break;
    tax += (Math.min(taxable, s.max) - s.min) * s.rate;
  }
  return Math.round(tax);
}

export function computeTax(input) {
  const regime = input.regime === 'old' ? 'old' : 'new';
  const presumptive = input.presumptive ?? 'none';
  const gross = Math.max(0, input.grossReceipts || 0);
  const salary = Math.max(0, input.salaryIncome || 0);
  const tdsPaid = Math.max(0, input.tdsPaid || 0);
  const advanceTaxPaid = Math.max(0, input.advanceTaxPaid || 0);

  const businessIncome = presumptive === 'none'
    ? Math.max(0, gross - Math.max(0, input.expenses || 0))
    : Math.round(gross * PRESUMPTIVE_RATE[presumptive]);
  // Standard deduction applies to salary only — never to creator (business/professional) income.
  const standardDeduction = Math.min(salary, STANDARD_DEDUCTION[regime]);
  const taxableIncome = businessIncome + salary - standardDeduction;

  const baseTax = slabTax(taxableIncome, regime);
  const { limit, max } = REBATE[regime];
  let rebate = 0;
  let marginalRelief = 0;
  if (taxableIncome <= limit) {
    rebate = Math.min(baseTax, max);
  } else if (regime === 'new') {
    // Marginal relief: tax payable can't exceed the income above ₹12L.
    marginalRelief = Math.max(0, baseTax - (taxableIncome - limit));
  }
  const taxAfterRebate = baseTax - rebate - marginalRelief;
  const surcharge = surchargeOn(taxableIncome, taxAfterRebate, regime);
  const cess = Math.round((taxAfterRebate + surcharge) * 0.04);
  const totalTax = taxAfterRebate + surcharge + cess;

  const afterTds = totalTax - tdsPaid;
  const netPayable = Math.max(0, afterTds);
  const refund = Math.max(0, -afterTds);
  const advanceTaxRequired = netPayable >= ADVANCE_TAX_THRESHOLD;

  const cumPcts = presumptive === 'none' ? [0.15, 0.45, 0.75, 1] : [0, 0, 0, 1];
  let prevCum = 0;
  const instalments = INSTALMENT_SCHEDULE.map((inst, i) => {
    const cum = advanceTaxRequired ? Math.round(netPayable * cumPcts[i]) : 0;
    const amountDue = cum - prevCum;
    prevCum = cum;
    return { quarter: inst.quarter, dueDate: inst.dueDate, dueMonth: inst.dueMonth, dueDay: inst.dueDay, cumulativeDue: cum, amountDue };
  });

  return {
    regime, presumptive,
    grossReceipts: gross, businessIncome, salaryIncome: salary, standardDeduction, taxableIncome,
    baseTax, rebate, marginalRelief, surcharge, surchargeRate: surchargeRate(taxableIncome, regime), cess, totalTax,
    tdsPaid, netPayable, refund,
    advanceTaxRequired, advanceTaxPaid, balanceDue: Math.max(0, netPayable - advanceTaxPaid),
    instalments,
  };
}

// Interest for deferring advance tax (old s.234C): 1% a month on the shortfall,
// 3 months for Q1–Q3 and 1 month for Q4. Q1/Q2 are safe at 12%/36% paid.
// paidCumulative[i] = total advance tax paid by instalment i's due date.
export function estimateDeferralInterest(instalments, paidCumulative, asOf, fyStartYear) {
  const safePct = [0.12, 0.36, 0.75, 1];
  return INSTALMENT_SCHEDULE.map((inst, i) => {
    const due = new Date(inst.dueMonth < 3 ? fyStartYear + 1 : fyStartYear, inst.dueMonth, inst.dueDay);
    const required = instalments[i].cumulativeDue;
    const paid = paidCumulative[i] || 0;
    const safe = required === 0 || paid >= Math.round((required / INSTALMENT_SCHEDULE[i].cumPct) * safePct[i]);
    if (asOf <= due || safe) return { quarter: inst.quarter, shortfall: 0, interest: 0 };
    const shortfall = Math.max(0, required - paid);
    const interest = Math.round(shortfall * 0.01 * (i === 3 ? 1 : 3));
    return { quarter: inst.quarter, shortfall, interest };
  });
}

// Landing-page calculator. Assumes brands deduct 10% TDS on professional fees
// (Sec 393, formerly 194J) on the taxable value.
export function quickTaxEstimate(monthlyIncome, brandCount = 1) {
  const annual = Math.max(0, monthlyIncome) * 12;
  const estimatedTds = Math.round(annual * 0.10);
  const r = computeTax({ grossReceipts: annual, tdsPaid: estimatedTds });
  const q2Due = r.advanceTaxRequired ? r.instalments[1].cumulativeDue : 0;
  const lateCount = Math.round(brandCount * 0.4);
  const form16aRisk = brandCount < 3
    ? `${Math.round(brandCount * 40)}% chance of delay`
    : `~${lateCount} of ${brandCount} brand${lateCount !== 1 ? 's' : ''} likely late`;
  return { annual, estimatedTds, incomeTax: r.totalTax, advanceTaxOwed: r.netPayable, itrRefund: r.refund, q2Due, form16aRisk };
}

export function getFinancialYear(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 4) return `${year}-${String(year + 1).slice(-2)}`;
  return `${year - 1}-${String(year).slice(-2)}`;
}

export function getFYStartYear(fy) {
  return parseInt(fy.split('-')[0]);
}

export function getAdvanceTaxQuarter(date) {
  const month = date.getMonth() + 1;
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}
