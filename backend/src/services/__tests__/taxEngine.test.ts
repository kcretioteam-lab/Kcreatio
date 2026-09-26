// PENDING CA SIGN-OFF — expected values in taxCases.json must be confirmed by a CA
// before release. The frontend mirror (frontend/src/utils/taxCalc.js) runs the same cases.
import { describe, it, expect } from 'vitest';
import { computeTax, estimateDeferralInterest, quickTaxEstimate, firstYearDepreciation } from '../taxEngine';
import fixtures from './taxCases.json';

describe('computeTax', () => {
  for (const c of fixtures.cases) {
    it(c.name, () => {
      const r = computeTax(c.input as Parameters<typeof computeTax>[0]);
      const { instalments, ...totals } = c.expected as Record<string, unknown> & { instalments?: number[] };
      expect(r).toMatchObject(totals);
      if (instalments) expect(r.instalments.map(i => i.amountDue)).toEqual(instalments);
    });
  }
});

describe('estimateDeferralInterest', () => {
  const { instalments } = computeTax({ grossReceipts: 2000000, tdsPaid: 100000 });

  it('charges nothing before a due date', () => {
    const r = estimateDeferralInterest(instalments, [0, 0, 0, 0], new Date(2026, 5, 1), 2026);
    expect(r.every(q => q.interest === 0)).toBe(true);
  });

  it('charges 1% × 3 months on a missed Q1 instalment', () => {
    const r = estimateDeferralInterest(instalments, [0, 0, 0, 0], new Date(2026, 6, 1), 2026);
    expect(r[0]).toEqual({ quarter: 'Q1', shortfall: 16200, interest: 486 });
  });

  it('treats 12% paid by Q1 as safe', () => {
    const r = estimateDeferralInterest(instalments, [12960, 12960, 12960, 12960], new Date(2026, 6, 1), 2026);
    expect(r[0].interest).toBe(0);
  });
});

describe('quickTaxEstimate', () => {
  it('₹1L/month → full TDS refund', () => {
    expect(quickTaxEstimate(100000)).toMatchObject({ annual: 1200000, incomeTax: 0, itrRefund: 120000, advanceTaxOwed: 0 });
  });
});

describe('firstYearDepreciation', () => {
  it('uses full rate when used 180+ days, half rate otherwise', () => {
    // ₹1,00,000 laptop bought 1 Jun 2026: 40% = ₹40,000
    expect(firstYearDepreciation([{ amount: 100000, assetClass: 'computer', purchaseDate: '2026-06-01' }], 2026)).toBe(40000);
    // ₹2,00,000 camera bought 15 Jan 2027: 15% × ½ = ₹15,000
    expect(firstYearDepreciation([{ amount: 200000, assetClass: 'camera_equipment', purchaseDate: '2027-01-15' }], 2026)).toBe(15000);
  });
});
