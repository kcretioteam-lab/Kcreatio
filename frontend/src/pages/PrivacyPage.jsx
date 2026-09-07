import { Link } from 'react-router-dom';

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
    body: 'Subscription payments are processed by Razorpay. Kcretio does not receive or store your card, UPI PIN, or bank login details — Razorpay handles that directly and shares back only your subscription status and plan.',
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
    body: 'Your account and financial data is stored in a Supabase-hosted PostgreSQL database. Uploaded images — your avatar, invoice signature, and UPI QR code — are stored in a private Supabase Storage bucket.',
  },
  {
    title: '10. Data Retention',
    body: 'We keep your account and financial records for as long as your account is active, so your invoice and TDS history stays available across financial years. If you delete your account from Settings, your data is permanently removed from our systems, except where we are legally required to retain financial records for a longer period.',
  },
  {
    title: '11. Your Rights',
    body: 'You can view and edit your profile and business details from Settings at any time, and permanently delete your account and data from Settings. To request a copy of your data or ask a question about this policy, email kcretioteam@gmail.com.',
  },
  {
    title: '12. Security',
    body: 'Passwords are hashed with bcrypt, authentication uses httpOnly, secure cookies, and all traffic between your browser and Kcretio is encrypted with HTTPS. No online service can guarantee absolute security, but we do not store payment card details, and access to production data is limited to what is needed to operate the service.',
  },
  {
    title: '13. Children',
    body: "Kcretio is a business and financial tool and is not directed at, or intended for use by, children.",
  },
  {
    title: '14. Changes to This Policy',
    body: 'If this policy changes in a material way, we will update the "last updated" date below and, where appropriate, notify you by email.',
  },
  {
    title: '15. Contact',
    body: 'Questions about this policy, or requests about your data, can be sent to kcretioteam@gmail.com.',
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>
          <span aria-hidden="true" style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>K</span>
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
