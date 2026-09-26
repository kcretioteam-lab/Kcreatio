import { Link } from 'react-router-dom';
import LogoMark from '../components/ui/LogoMark.jsx';

const SECTIONS = [
  {
    title: '1. What This Covers',
    body: 'This policy explains what Kcretio collects, why, and who it is shared with. Kcretio provides GST invoicing, TDS tracking, advance tax planning, and brand-deal management — using it means giving us your business and financial details, so we take that seriously.',
  },
  {
    title: '2. Information You Provide',
    body: 'Name, email, phone number, password (stored as a bcrypt hash — we never store or see your plain-text password), business name, GSTIN, PAN, business address and state code, bank account and UPI details you add for invoices, and the invoices, TDS records, brand deals, income and expense entries you create.',
  },
  {
    title: '3. Information From Google Sign-In',
    body: 'If you sign in or sign up with Google, we receive your name, email address, and profile picture from Google to create or match your account. We do not receive your Google password.',
  },
  {
    title: '4. Optional Gmail Connection',
    body: 'If you choose to connect Gmail from Settings, we read your inbox to automatically detect brand-deal, payment-received, and TDS-deduction emails, and can send invoice emails from your Gmail account on your request. This is off by default, entirely optional, and you can disconnect it at any time from Settings — doing so revokes our access to your Gmail account.',
  },
  {
    title: '5. Payment Information',
    body: 'Kcretio does not currently take payments. When paid plans launch, subscription payments will be processed by Razorpay. Kcretio does not receive or store your card, UPI PIN, or bank login details — Razorpay handles that directly and shares back only your subscription status and plan.',
  },
  {
    title: '6. Cookies & Sessions',
    body: 'We use httpOnly authentication cookies to keep you signed in. These cookies are not readable by JavaScript and are never stored in localStorage. We do not use third-party advertising or tracking cookies.',
  },
  {
    title: '7. How We Use Your Information',
    body: 'To generate GST-compliant invoices, calculate TDS and advance tax, run your brand-deal CRM, send transactional emails (OTP codes, password resets, invoice copies, tax-deadline reminders), process subscription billing, and secure your account.',
  },
  {
    title: '8. Who We Share It With',
    body: 'We do not sell your data. It is shared only with the services that run Kcretio on our behalf: Supabase (database and file storage), Render (backend hosting), Netlify (frontend hosting), Resend (transactional email delivery), Razorpay (subscription payments), and Google (sign-in, and Gmail access only if you connect it). Each of these processes data solely to provide their part of the service, under their own privacy and security terms.',
  },
  {
    title: '9. Where Your Data Lives',
    body: 'Your account and financial data is stored in a Supabase-hosted PostgreSQL database in [DATA REGION — e.g. Mumbai, India (ap-south-1)]. Uploaded images — your avatar, invoice signature, and UPI QR code — are stored in Supabase Storage in the same region. Some of the service providers listed above may process data outside India; we only use providers with appropriate security safeguards.',
  },
  {
    title: '10. Data Retention',
    body: 'We keep your account and financial records for as long as your account is active, so your invoice and TDS history stays available across tax years. If you delete your account from Settings, your data is permanently removed within 30 days, except records we must keep by law (for example, GST law requires invoice records to be kept for at least 6 years), which we delete once that period ends.',
  },
  {
    title: '11. Your Rights',
    body: 'Under the Digital Personal Data Protection Act, 2023 you can: see a summary of the personal data we hold and how we use it; correct, complete or update it (most of it directly in Settings); erase it by deleting your account; and have your grievances addressed. Email grievance@kcretio.in and we will respond within 30 days.',
  },
  {
    title: '12. Withdrawing Consent',
    body: 'You can withdraw your consent at any time, as easily as you gave it: disconnect Gmail or Google sign-in in Settings, turn off marketing emails in Settings → Notifications, or delete your account. Withdrawing consent does not affect processing that happened before you withdrew it. If you withdraw consent for data we need to run the service, we may no longer be able to provide it.',
  },
  {
    title: '13. Nominating Someone',
    body: 'You may nominate another person to exercise your rights over your data if you die or become unable to do so. Email grievance@kcretio.in from your registered email address with the nominee’s name and contact details.',
  },
  {
    title: '14. Security and Data Breaches',
    body: 'Passwords are hashed with bcrypt, authentication uses httpOnly, secure cookies, all traffic is encrypted with HTTPS, and database access is restricted with row-level security. No online service can guarantee absolute security. If a personal data breach affects you, we will tell you and the Data Protection Board of India without delay, explain what happened and its likely impact, and tell you what we are doing and what you can do to protect yourself.',
  },
  {
    title: '15. Children',
    body: "Kcretio is a business and financial tool for adults and is not directed at, or intended for use by, anyone under 18.",
  },
  {
    title: '16. Changes to This Policy',
    body: 'If this policy changes in a material way, we will update the "last updated" date below and notify you by email before the change takes effect.',
  },
  {
    title: '17. Who We Are and Grievance Officer',
    body: 'Kcretio is operated by [LEGAL ENTITY NAME], [REGISTERED ADDRESS]. Grievance Officer: [NAME], grievance@kcretio.in. We acknowledge grievances within 48 hours and resolve them within 30 days. If you are not satisfied with our response, you may complain to the Data Protection Board of India.',
  },
  {
    title: '18. Contact',
    body: 'Questions about this policy can be sent to support@kcretio.in. Requests about your data and complaints go to grievance@kcretio.in.',
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>
          <LogoMark size={28} />
          Kcretio
        </Link>
        <Link to="/register" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>← Back to sign up</Link>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-16) var(--space-6) var(--space-24)' }}>
        <p className="label" style={{ marginBottom: 'var(--space-3)' }}>Legal</p>
        <h1 className="display" style={{ fontSize: 'clamp(32px, 4.4vw, 46px)', marginBottom: 'var(--space-3)' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-12)' }}>Last updated: September 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>{s.title}</h2>
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-body)', lineHeight: 1.7, margin: 0 }}>{s.body}</p>
            </section>
          ))}
        </div>

        <p style={{ marginTop: 'var(--space-16)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          See also our <Link to="/terms" style={{ color: 'var(--accent)', fontWeight: 600 }}>Terms of Service</Link>.
        </p>
      </main>
    </div>
  );
}
