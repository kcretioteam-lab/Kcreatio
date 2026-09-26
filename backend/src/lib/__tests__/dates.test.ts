import { describe, it, expect } from 'vitest';
import { nextRecurringDate } from '../dates';

describe('nextRecurringDate', () => {
  it('moves monthly and quarterly', () => {
    expect(nextRecurringDate('2026-04-15', 'monthly')).toBe('2026-05-15');
    expect(nextRecurringDate('2026-11-10', 'quarterly')).toBe('2027-02-10');
  });
  it('clamps to the end of shorter months', () => {
    expect(nextRecurringDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(nextRecurringDate('2027-11-30', 'quarterly')).toBe('2028-02-29');
  });
});
