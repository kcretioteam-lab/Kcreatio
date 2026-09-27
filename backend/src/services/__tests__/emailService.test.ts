import { describe, it, expect, vi, beforeAll } from 'vitest';

// Capture what would be sent instead of calling Resend
const sent: { subject: string; html: string }[] = [];
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: async (m: { subject: string; html: string }) => { sent.push(m); return { data: { id: 'test' }, error: null }; } };
  },
}));

let email: typeof import('../emailService.js');
beforeAll(async () => {
  process.env.RESEND_API_KEY = 're_test';
  email = await import('../emailService.js');
});

const PAYLOAD = '<a href="https://evil.example">Pay here</a><img src=x onerror=alert(1)>';

describe('email templates escape user-controlled text', () => {
  it('invoice email', async () => {
    await email.sendInvoiceEmail('brand@example.com', {
      invoiceNumber: 'INV/2627/0001', brandName: PAYLOAD, creatorName: PAYLOAD, amount: '₹1,18,000',
    } as any);
    const { html } = sent.at(-1)!;
    expect(html).not.toContain('<a href="https://evil.example">');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;');
  });

  it('new sign-in email (device string comes from the User-Agent header)', async () => {
    await email.sendNewDeviceEmail('me@example.com', PAYLOAD, { device: PAYLOAD, ip: '1.2.3.4', when: new Date() });
    const { html } = sent.at(-1)!;
    expect(html).not.toContain('<img src=x');
  });

  it('payment reminder email', async () => {
    await email.sendPaymentReminderEmail('brand@example.com', {
      invoiceNumber: 'INV/2627/0001', brandName: PAYLOAD, creatorName: PAYLOAD, amountDue: '₹10', dueDate: '1 Oct', daysOverdue: 3,
    } as any);
    expect(sent.at(-1)!.html).not.toContain('<img src=x');
  });
});
