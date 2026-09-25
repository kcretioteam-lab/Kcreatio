import { Resend } from 'resend';
import { getFrontendUrl } from '../lib/env.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.FROM_EMAIL || 'noreply@kcretio.in';

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[EMAIL-DEV] To: ${to} | Subject: ${subject}`);
    return;
  }
  // The Resend SDK resolves with { data, error } instead of throwing on API-level
  // failures (invalid/unverified from-domain, etc.) — checking only for a thrown
  // exception silently missed these, so email sends could "succeed" while
  // actually rejected by Resend.
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`);
  }
  console.log(`[EMAIL] Sent to ${to} | id: ${data?.id}`);
}

export async function sendOtpEmail(to: string, otp: string, purpose: 'email_verify' | 'password_reset') {
  const label = purpose === 'email_verify' ? 'Verify your email' : 'Reset your password';
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080F;color:#F0F1F8;border-radius:12px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#E8921A;">Kcretio</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 16px;">${label}</h2>
      <p style="color:#94a3b8;margin:0 0 24px;">Your verification code is valid for 10 minutes.</p>
      <div style="background:#0E1018;border:1px solid #1E2130;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:36px;font-weight:800;letter-spacing:12px;font-family:monospace;color:#F0F1F8;">${otp}</span>
      </div>
      <p style="color:#64748b;font-size:12px;">If you didn't request this, ignore this email. Do not share this code with anyone.</p>
    </div>`;
  await send(to, `${otp} — ${label} (Kcretio)`, html);
}

export async function sendPasswordResetEmail(to: string, name: string, resetLink: string) {
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080F;color:#F0F1F8;border-radius:12px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#E8921A;">Kcretio</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">Reset your password</h2>
      <p style="color:#94a3b8;margin:0 0 24px;">Hi ${name}, someone (hopefully you) requested a password reset.</p>
      <a href="${resetLink}" style="display:inline-block;background:#E8921A;color:#fff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;margin-bottom:24px;">Reset Password</a>
      <p style="color:#64748b;font-size:12px;margin:0;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>`;
  await send(to, 'Reset your Kcretio password', html);
}

export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080F;color:#F0F1F8;border-radius:12px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#E8921A;">Kcretio</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">Welcome, ${name}! 🎉</h2>
      <!-- Auto 28-day trial disabled — premium is now granted on request -->
      <p style="color:#94a3b8;margin:0 0 16px;">Want Pro features (advance tax calculator, P&amp;L, CA export, Smart Inbox)? Request 28 days of free Pro access from Settings.</p>
      <p style="color:#94a3b8;margin:0 0 24px;">Start by creating your first GST-compliant invoice in under 30 seconds.</p>
      <a href="${getFrontendUrl()}/invoices/new" style="display:inline-block;background:#E8921A;color:#fff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Create First Invoice →</a>
    </div>`;
  await send(to, `Welcome to Kcretio, ${name}!`, html);
}

export async function sendInvoiceEmail(to: string, opts: {
  creatorName: string;
  brandName: string;
  invoiceNumber: string;
  amount: string;
  pdfUrl?: string;
  fromName?: string;
}) {
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080F;color:#F0F1F8;border-radius:12px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#E8921A;">${opts.fromName || opts.creatorName}</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">GST Invoice ${opts.invoiceNumber}</h2>
      <p style="color:#94a3b8;margin:0 0 8px;">Dear ${opts.brandName},</p>
      <p style="color:#94a3b8;margin:0 0 24px;">Please find attached the GST invoice for <strong style="color:#F0F1F8;">${opts.amount}</strong>. Kindly process payment at your earliest convenience.</p>
      ${opts.pdfUrl ? `<a href="${opts.pdfUrl}" style="display:inline-block;background:#E8921A;color:#fff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;margin-bottom:24px;">Download Invoice PDF</a>` : ''}
      <p style="color:#64748b;font-size:12px;margin:0;">This invoice was generated using Kcretio.</p>
    </div>`;
  await send(to, `GST Invoice ${opts.invoiceNumber} from ${opts.creatorName}`, html);
}

export async function sendPaymentConfirmedEmail(to: string, opts: {
  recipientName: string;
  invoiceNumber: string;
  amount: string;
  brandName: string;
  creatorName: string;
}) {
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080F;color:#F0F1F8;border-radius:12px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#22c55e;">✓ Payment Confirmed</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">Invoice ${opts.invoiceNumber}</h2>
      <p style="color:#94a3b8;margin:0 0 16px;">Hi ${opts.recipientName},</p>
      <p style="color:#94a3b8;margin:0 0 24px;">Payment of <strong style="color:#F0F1F8;">${opts.amount}</strong> has been confirmed for invoice <strong style="color:#F0F1F8;">${opts.invoiceNumber}</strong> between <strong style="color:#F0F1F8;">${opts.creatorName}</strong> and <strong style="color:#F0F1F8;">${opts.brandName}</strong>.</p>
      <p style="color:#64748b;font-size:12px;">Powered by Kcretio</p>
    </div>`;
  await send(to, `Payment confirmed — Invoice ${opts.invoiceNumber}`, html);
}

export async function sendAdvanceTaxReminder(to: string, opts: {
  creatorName: string;
  quarter: string;
  amount: string;
  dueDate: string;
  daysLeft: number;
}) {
  const urgency = opts.daysLeft <= 2 ? '🔴 URGENT: ' : opts.daysLeft <= 7 ? '🟡 ' : '';
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080F;color:#F0F1F8;border-radius:12px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#E8921A;">Kcretio</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">${urgency}Advance Tax Due in ${opts.daysLeft} day${opts.daysLeft !== 1 ? 's' : ''}</h2>
      <p style="color:#94a3b8;margin:0 0 16px;">Hi ${opts.creatorName},</p>
      <div style="background:#0E1018;border:1px solid #1E2130;border-radius:8px;padding:20px;margin-bottom:24px;">
        <div style="margin-bottom:8px;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Quarter</span><br><strong style="font-size:16px;">${opts.quarter}</strong></div>
        <div style="margin-bottom:8px;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Amount Due</span><br><strong style="font-size:24px;color:#E8921A;font-variant-numeric:tabular-nums;">${opts.amount}</strong></div>
        <div><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Due Date</span><br><strong>${opts.dueDate}</strong></div>
      </div>
      <a href="${getFrontendUrl()}/tax-planner" style="display:inline-block;background:#E8921A;color:#fff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;margin-bottom:16px;">View Tax Planner →</a>
      <p style="color:#64748b;font-size:12px;">Late payment attracts 1% interest per month under Section 234B/234C.</p>
    </div>`;
  await send(to, `${urgency}Advance Tax ${opts.quarter} due in ${opts.daysLeft} days — ${opts.amount}`, html);
}

const escHtml = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function sendPremiumRequestAdminEmail(opts: {
  name: string; email: string; features: string[]; platform: string; followerCount: number;
  approveUrl: string; appUrl: string;
}) {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin) {
    console.log(`[EMAIL-DEV] ADMIN_EMAIL not set — premium request from ${opts.email} | Approve: ${opts.approveUrl}`);
    return;
  }
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080F;color:#F0F1F8;border-radius:12px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#E8921A;">Kcretio</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 16px;">New premium access request</h2>
      <p style="color:#94a3b8;margin:0 0 4px;"><strong style="color:#F0F1F8;">${escHtml(opts.name)}</strong> · ${escHtml(opts.email)}</p>
      <p style="color:#94a3b8;margin:0 0 4px;">Platform: ${escHtml(opts.platform)} · Followers: ${opts.followerCount.toLocaleString('en-IN')}</p>
      <p style="color:#94a3b8;margin:0 0 24px;">Wants: ${opts.features.map(escHtml).join(', ')}</p>
      <a href="${opts.approveUrl}" style="display:inline-block;background:#E8921A;color:#fff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Approve 28 days of Pro →</a>
      <p style="color:#64748b;font-size:12px;margin:16px 0 0;">Link expires in 7 days. Ignore this email to leave the request pending.</p>
    </div>`;
  console.log(`[PREMIUM] Request from ${opts.email} | Approve: ${opts.approveUrl}`);
  await send(admin, `Premium request: ${opts.name} (${opts.platform}, ${opts.followerCount.toLocaleString('en-IN')})`, html);
}

export async function sendPremiumApprovedEmail(to: string, name: string, endsAt: Date) {
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080F;color:#F0F1F8;border-radius:12px;">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#E8921A;">Kcretio</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">You're on Pro, ${escHtml(name)}! 🎉</h2>
      <p style="color:#94a3b8;margin:0 0 24px;">Your premium access request was approved. You have full Pro access until ${endsAt.toDateString()}.</p>
      <a href="${getFrontendUrl()}/dashboard" style="display:inline-block;background:#E8921A;color:#fff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Open Kcretio →</a>
    </div>`;
  await send(to, 'Your Kcretio Pro access is live', html);
}
