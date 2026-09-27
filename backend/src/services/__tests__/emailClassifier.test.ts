import { describe, it, expect, vi } from 'vitest';

// detectionService pulls in the Supabase client; tdsFigures is pure, so no DB is needed
vi.mock('../../lib/supabase.js', () => ({ supabase: {} }));

import { classifyEmail } from '../emailClassifier.js';
import { tdsFigures } from '../detectionService.js';

const classify = (subject: string, body: string, fromEmail = 'accounts@brand.example') =>
  classifyEmail({ subject, body, fromEmail, fromName: 'Brand Accounts' });

describe('classifyEmail — payments', () => {
  it('reads "processed ₹X after N% TDS" as a payment with the TDS worked out', () => {
    const r = classify('Payment processed – Campaign X', 'We have processed ₹45,000 for campaign X after 10% TDS.');
    expect(r.type).toBe('payment_received');
    expect(r.extracted.amount).toBe(45000);
    expect(r.extracted.tds_rate).toBe(10);
    expect(r.extracted.tds_amount).toBe(5000);   // gross 50,000 − net 45,000
  });

  it('recognises NEFT transfers', () => {
    const r = classify('NEFT payment', 'We have transferred INR 45,000 via NEFT. UTR 12345.');
    expect(r.type).toBe('payment_received');
    expect(r.extracted.amount).toBe(45000);
  });

  it('keeps the credited amount and the stated TDS apart', () => {
    const r = classify('Payment credited', 'Rs. 45,000 has been credited to your account after deducting TDS of Rs. 5,000.');
    expect(r.type).toBe('payment_received');
    expect(r.extracted.amount).toBe(45000);
    expect(r.extracted.tds_amount).toBe(5000);
  });

  it('does not treat a SaaS order receipt as income', () => {
    const r = classify('Your order', 'Your order of ₹999 has been processed. Thanks for renewing your subscription.', 'billing@canva.com');
    expect(r.type).toBe('expense');
  });
});

describe('classifyEmail — TDS and Form 16A', () => {
  it('separates the TDS from the invoice value', () => {
    const r = classify('TDS deducted on invoice INV/2627/0001',
      'TDS of Rs. 10,000 has been deducted under Section 194J on your invoice of Rs. 1,00,000. TAN: BLRM12345C.');
    expect(r.type).toBe('tds_deduction');
    expect(r.extracted.amount).toBe(100000);
    expect(r.extracted.tds_amount).toBe(10000);
    expect(r.extracted.tan).toBe('BLRM12345C');
  });

  it('a deduction notice that mentions Form 16A is still a TDS notice', () => {
    const r = classify('TDS deducted',
      'TDS of Rs. 10,000 has been deducted under Section 194J on your invoice of Rs. 1,00,000. TAN: BLRM12345C. Form 16A will be issued quarterly.');
    expect(r.type).toBe('tds_deduction');
    expect(r.extracted.tds_amount).toBe(10000);
    expect(r.extracted.amount).toBe(100000);
  });

  it('derives the taxable value from TDS amount and rate', () => {
    const r = classify('TDS deducted', 'TDS of ₹4,500 has been deducted @ 10% under section 194J.');
    expect(r.extracted.tds_amount).toBe(4500);
    expect(r.extracted.amount).toBe(45000);
  });

  it('an email carrying the certificate is Form 16A', () => {
    const r = classify('Form 16A for Q1 FY 2026-27', 'Please find attached Form 16A for the quarter.');
    expect(r.type).toBe('form_16a');
  });
});

describe('classifyEmail — deals', () => {
  it('soft outreach is never a confirmed deal', () => {
    const r = classify('Collab?', 'Hey, we want to collaborate with you. What are your rates?');
    expect(r.type).toBe('deal_inquiry');
    expect(r.confidence).toBeLessThan(0.5);
  });

  it('a confirmation with a price is a confirmed deal', () => {
    const r = classify('Deal confirmed', 'We are pleased to confirm the collaboration for 2 reels at INR 60,000. PO attached.');
    expect(r.type).toBe('deal_confirmed');
    expect(r.extracted.amount).toBe(60000);
  });
});

describe('tdsFigures — what gets saved when a TDS detection is accepted', () => {
  it('uses the stated TDS, not rate × TDS', () => {
    expect(tdsFigures({ amount: 100000, tds_amount: 10000, tds_rate: 10 })).toEqual({ gross: 100000, tds: 10000, rate: 10 });
  });
  it('fills in whichever figure is missing', () => {
    expect(tdsFigures({ amount: 50000, tds_rate: 10 })).toEqual({ gross: 50000, tds: 5000, rate: 10 });
    expect(tdsFigures({ tds_amount: 2000, tds_rate: 2 })).toEqual({ gross: 100000, tds: 2000, rate: 2 });
  });
  it('refuses figures that cannot be saved', () => {
    expect(tdsFigures({ amount: 1000, tds_amount: 5000 })).toBeNull();
    expect(tdsFigures({ tds_rate: 10 })).toBeNull();
  });
});
