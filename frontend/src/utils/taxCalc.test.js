// PENDING CA SIGN-OFF — runs the same cases as backend/src/services/__tests__/taxEngine.test.ts
// so the two copies of the tax engine can't drift apart.
import { describe, it, expect } from 'vitest';
import { computeTax } from './taxCalc.js';
import fixtures from '../../../backend/src/services/__tests__/taxCases.json';

describe('computeTax (frontend mirror)', () => {
  for (const c of fixtures.cases) {
    it(c.name, () => {
      const r = computeTax(c.input);
      const { instalments, ...totals } = c.expected;
      expect(r).toMatchObject(totals);
      if (instalments) expect(r.instalments.map(i => i.amountDue)).toEqual(instalments);
    });
  }
});
