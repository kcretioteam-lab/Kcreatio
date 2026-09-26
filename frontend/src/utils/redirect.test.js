import { describe, it, expect } from 'vitest';
import { safeNextPath } from './redirect.js';

describe('safeNextPath', () => {
  it('keeps in-app paths', () => {
    expect(safeNextPath('/tax-planner')).toBe('/tax-planner');
    expect(safeNextPath('/invoices?status=paid')).toBe('/invoices?status=paid');
  });
  it('blocks open redirects and auth pages', () => {
    expect(safeNextPath('//evil.com')).toBe('/dashboard');
    expect(safeNextPath('https://evil.com')).toBe('/dashboard');
    expect(safeNextPath('/\\evil.com')).toBe('/dashboard');
    expect(safeNextPath('/login')).toBe('/dashboard');
    expect(safeNextPath(null)).toBe('/dashboard');
  });
});
