import { describe, it, expect } from 'vitest';
import { checkGstin, gstinCheckDigit, supplierStateCode, panFromGstin } from '../gst';

describe('GSTIN', () => {
  it('accepts a GSTIN with a correct check digit', () => {
    const first14 = '27AAPFU0939F1Z';
    expect(checkGstin(first14 + gstinCheckDigit(first14))).toBeNull();
  });
  it('accepts the published sample GSTIN 27AAPFU0939F1ZV', () => {
    expect(checkGstin('27AAPFU0939F1ZV')).toBeNull();
  });
  it('rejects a typo in the check digit', () => {
    expect(checkGstin('27AAPFU0939F1ZA')).toBe('checksum');
  });
  it('rejects the placeholder GSTIN 29AAAAA0000A1Z5', () => {
    expect(checkGstin('29AAAAA0000A1Z5')).not.toBeNull();
  });
  it('rejects unknown state codes and bad formats', () => {
    expect(checkGstin('99AAPFU0939F1ZV')).toBe('state');
    expect(checkGstin('27AAPFU0939F')).toBe('format');
  });
  it('extracts PAN', () => {
    expect(panFromGstin('27AAPFU0939F1ZV')).toBe('AAPFU0939F');
  });
});

describe('supplierStateCode', () => {
  it('prefers the GSTIN prefix over the typed state code', () => {
    expect(supplierStateCode({ gstin: '29AAPFU0939F1ZV', state_code: '27' })).toBe('29');
  });
  it('falls back to state_code, then null', () => {
    expect(supplierStateCode({ gstin: null, state_code: '29' })).toBe('29');
    expect(supplierStateCode({})).toBeNull();
  });
});
