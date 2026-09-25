import { describe, it, expect } from 'vitest';
import { hotp, verifyTotp, base32Encode, base32Decode, encryptSecret, decryptSecret, hashRecoveryCode, generateRecoveryCodes } from '../totp';

// RFC 6238 appendix B test secret "12345678901234567890" (SHA-1)
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP', () => {
  it('matches the RFC 6238 test vectors (last 6 digits)', () => {
    expect(hotp(RFC_SECRET, Math.floor(59 / 30))).toBe('287082');
    expect(hotp(RFC_SECRET, Math.floor(1111111109 / 30))).toBe('081804');
    expect(hotp(RFC_SECRET, Math.floor(1234567890 / 30))).toBe('005924');
  });
  it('accepts the current code and one step of drift, rejects others', () => {
    const now = 1234567890 * 1000;
    const step = Math.floor(1234567890 / 30);
    expect(verifyTotp(RFC_SECRET, hotp(RFC_SECRET, step), now)).toBe(step);
    expect(verifyTotp(RFC_SECRET, hotp(RFC_SECRET, step - 1), now)).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, hotp(RFC_SECRET, step - 3), now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, 'abc123', now)).toBeNull();
  });
  it('round-trips base32', () => {
    const b = Buffer.from([1, 2, 3, 250, 99]);
    expect(base32Decode(base32Encode(b))).toEqual(b);
  });
  it('encrypts secrets at rest', () => {
    process.env.JWT_REFRESH_SECRET = 'test';
    const enc = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(enc)).toBe('JBSWY3DPEHPK3PXP');
  });
  it('normalises recovery codes before hashing', () => {
    const [code] = generateRecoveryCodes(1);
    expect(hashRecoveryCode(code.toLowerCase())).toBe(hashRecoveryCode(code.replace('-', '')));
  });
});
