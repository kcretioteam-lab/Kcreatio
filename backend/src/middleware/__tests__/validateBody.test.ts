import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { friendlyMessage } from '../validateBody';

const first = (schema: z.ZodTypeAny, input: unknown) => friendlyMessage((schema.safeParse(input) as any).error.issues[0]);

describe('friendlyMessage', () => {
  it('turns a zero deal value into plain English', () => {
    expect(first(z.object({ dealValue: z.number().positive() }), { dealValue: 0 })).toBe('Enter a deal value above ₹0');
  });
  it('explains enum errors without listing internal values', () => {
    expect(first(z.object({ source: z.enum(['brand_deal', 'adsense']) }), { source: 'x' })).toBe('Choose a valid income source');
  });
  it('reports missing required fields', () => {
    expect(first(z.object({ brandName: z.string().min(1) }), {})).toBe('Brand name is required');
    expect(first(z.object({ brandName: z.string().min(1) }), { brandName: '' })).toBe('Brand name is required');
  });
  it('keeps custom messages', () => {
    expect(first(z.object({ pan: z.string().regex(/^X$/, 'PAN should look like ABCDE1234F') }), { pan: 'y' })).toBe('PAN should look like ABCDE1234F');
  });
});
