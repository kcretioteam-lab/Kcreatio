import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { partialWithoutDefaults } from '../zodUtils';

describe('partialWithoutDefaults', () => {
  const schema = z.object({ status: z.enum(['a', 'b']).default('a'), n: z.number().positive(), note: z.string().nullish() });
  it('does not fill defaults for missing fields', () => {
    expect(partialWithoutDefaults(schema).parse({ n: 2 })).toEqual({ n: 2 });
  });
  it('still validates provided fields', () => {
    expect(() => partialWithoutDefaults(schema).parse({ n: -1 })).toThrow();
    expect(partialWithoutDefaults(schema).parse({ status: 'b' })).toEqual({ status: 'b' });
  });
});
