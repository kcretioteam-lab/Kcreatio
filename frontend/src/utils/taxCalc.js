// Tax slabs FY 2025-26 (New Regime - Section 115BAC)
const NEW_REGIME_SLABS = [
  { min: 0,       max: 400000,  rate: 0 },
  { min: 400000,  max: 800000,  rate: 0.05 },
  { min: 800000,  max: 1200000, rate: 0.10 },
  { min: 1200000, max: 1600000, rate: 0.15 },
  { min: 1600000, max: 2000000, rate: 0.20 },
  { min: 2000000, max: 2400000, rate: 0.25 },
  { min: 2400000, max: Infinity, rate: 0.30 },
];

// Tax slabs FY 2025-26 (Old Regime)
const OLD_REGIME_SLABS = [
  { min: 0,       max: 250000,  rate: 0 },
  { min: 250000,  max: 500000,  rate: 0.05 },
  { min: 500000,  max: 1000000, rate: 0.20 },
  { min: 1000000, max: Infinity, rate: 0.30 },
];

const INSTALMENT_SCHEDULE = [
  { quarter: 'Q1', dueDate: 'Jun 15', dueMonth: 5, dueDay: 15, cumPct: 0.15 },
  { quarter: 'Q2', dueDate: 'Sep 15', dueMonth: 8, dueDay: 15, cumPct: 0.45 },
  { quarter: 'Q3', dueDate: 'Dec 15', dueMonth: 11, dueDay: 15, cumPct: 0.75 },
  { quarter: 'Q4', dueDate: 'Mar 15', dueMonth: 2, dueDay: 15, cumPct: 1.00 },
];

export function getFinancialYear(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 4) return `${year}-${String(year + 1).slice(-2)}`;
  return `${year - 1}-${String(year).slice(-2)}`;
}

export function getFYStartYear(fy) {
  return parseInt(fy.split('-')[0]);
}

// All monetary calculations in paise (integers) to avoid float errors
function taxOnSlabs(taxableIncomePaise, slabs) {
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncomePaise <= slab.min * 100) break;
    const slabTax = Math.min(taxableIncomePaise, slab.max * 100) - slab.min * 100;
    tax += slabTax * slab.rate;
  }
  return Math.round(tax);
}

export function calculateAdvanceTax(annualIncomeRupees, regime = 'new', tdsDeductedRupees = 0) {
  const annualIncomePaise = Math.round(annualIncomeRupees * 100);

  // Standard deduction: ₹50,000 for new regime, ₹50,000 for old if salaried (creators use business income — no standard deduction on business; spec says ₹50K for new regime)
  const standardDeductionPaise = regime === 'new' ? 5000000 : 0;
  const taxableIncomePaise = Math.max(0, annualIncomePaise - standardDeductionPaise);

  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const baseTaxPaise = taxOnSlabs(taxableIncomePaise, slabs);
  const cessPaise = Math.round(baseTaxPaise * 0.04); // Health + Education Cess 4%
  const totalTaxPaise = baseTaxPaise + cessPaise;
  const tdsDeductedPaise = Math.round(tdsDeductedRupees * 100);
  const netAdvanceTaxPaise = Math.max(0, totalTaxPaise - tdsDeductedPaise);

  const instalments = INSTALMENT_SCHEDULE.map((inst) => ({
    quarter: inst.quarter,
    dueDate: inst.dueDate,
    dueMonth: inst.dueMonth,
    dueDay: inst.dueDay,
    amountDueRupees: Math.round((netAdvanceTaxPaise * inst.cumPct) / 100),
  }));

  // Each instalment is the MARGINAL amount (not cumulative)
  const marginalInstalments = instalments.map((inst, i) => ({
    ...inst,
    amountDueRupees: i === 0
      ? inst.amountDueRupees
      : inst.amountDueRupees - instalments[i - 1].amountDueRupees,
  }));

  return {
    annualIncome: annualIncomeRupees,
    standardDeduction: standardDeductionPaise / 100,
    taxableIncome: taxableIncomePaise / 100,
    baseTax: baseTaxPaise / 100,
    cess: cessPaise / 100,
    totalTax: totalTaxPaise / 100,
    tdsDeducted: tdsDeductedRupees,
    netAdvanceTax: netAdvanceTaxPaise / 100,
    instalments: marginalInstalments,
    slabBreakdown: slabs.map((slab) => {
      const from = slab.min * 100;
      const to = slab.max === Infinity ? null : slab.max * 100;
      const taxableInSlab = Math.max(
        0,
        Math.min(taxableIncomePaise, to ?? Infinity) - from
      );
      return {
        from: slab.min,
        to: slab.max === Infinity ? null : slab.max,
        rate: slab.rate,
        taxableAmount: taxableInSlab / 100,
        taxAmount: Math.round(taxableInSlab * slab.rate) / 100,
      };
    }),
  };
}

export function getAdvanceTaxQuarter(date) {
  const month = date.getMonth() + 1;
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}

export { INSTALMENT_SCHEDULE };
