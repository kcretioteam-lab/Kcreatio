import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating a Kcretio account, or by using Kcretio through Google sign-in, you agree to these Terms of Service. If you do not agree, do not create an account or use the service.',
  },
  {
    title: '2. Service Description',
    body: 'Kcretio provides GST-compliant invoicing, TDS tracking, advance tax planning, and brand-deal management tools, built primarily for Indian content creators and equally usable by any freelancer or small business that needs to raise a compliant GST invoice.',
  },
  {
    title: '3. Your Account',
    body: 'You are responsible for keeping your password confidential and for all activity under your account. If you sign in with Google, we rely on Google to verify your identity for that sign-in — see our Privacy Policy for what we receive from Google.',
  },
  {
    title: '4. Accuracy of Information',
    body: 'You are responsible for the accuracy of the business, GSTIN, PAN, invoice, and financial information you enter. Kcretio performs calculations based on the data you provide and on prevailing tax rules — it does not independently verify your GSTIN, PAN, or business details with government authorities.',
  },
  {
    title: '5. Not Tax or Legal Advice',
    body: 'Kcretio is a record-keeping and calculation tool, not a licensed Chartered Accountant, tax advisor, or legal service. GST, TDS, and advance-tax figures shown in the product are estimates based on the information you enter and the rules in effect at the time — always confirm with a qualified CA before filing returns or making tax payments.',
  },
  {
    title: '6. Payments & Subscriptions',
    body: 'Paid plans are billed through Razorpay. Subscriptions renew automatically at the end of each billing period until cancelled. Cancelling stops future renewals; it does not refund the current billing period unless required by law.',
  },
  {
    title: '7. Free Trial',
    body: 'New accounts receive a 28-day free trial with full access. At the end of the trial, your account moves to the free plan unless you subscribe to a paid plan.',
  },
  {
    title: '8. Acceptable Use',
    body: 'You agree not to use Kcretio to generate fraudulent invoices, misrepresent GST/TDS figures to evade tax, impersonate another business, or attempt to disrupt or gain unauthorized access to the service.',
  },
  {
    title: '9. Optional Gmail Connection',
    body: 'If you choose to connect Gmail from Settings, Kcretio reads your inbox to automatically detect brand-deal, payment, and TDS-related emails, and can send invoice emails on your behalf. This is entirely optional and can be disconnected at any time from Settings.',
  },
  {
    title: '10. Intellectual Property',
    body: 'The Kcretio name, product design, and software are the property of Kcretio. The invoices, financial records, and business data you enter remain yours.',
  },
  {
    title: '11. Termination',
    body: 'You may delete your account at any time from Settings, which permanently removes your account data as described in the Privacy Policy. We may suspend accounts that violate these terms or applicable law.',
  },
  {
    title: '12. Disclaimer of Warranty',
    body: 'Kcretio is provided "as is." While we take reasonable care to keep calculations accurate and the service available, we do not guarantee uninterrupted access or that every tax scenario is covered.',
  },
  {
    title: '13. Governing Law',
    body: 'These terms are governed by the laws of India, subject to the jurisdiction of the courts of Bengaluru, Karnataka.',
  },
  {
    title: '14. Changes to These Terms',
    body: 'We may update these terms as the product evolves. Continued use of Kcretio after an update constitutes acceptance of the revised terms.',
  },
  {
    title: '15. Contact',
    body: 'Questions about these terms can be sent to kcretioteam@gmail.com.',
  },
];

export default function TermsPage() {
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
        <h1 className="display" style={{ fontSize: 'clamp(32px, 4.4vw, 46px)', marginBottom: 'var(--space-3)' }}>Terms of Service</h1>
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
          See also our <Link to="/privacy" style={{ color: 'var(--accent)', fontWeight: 600 }}>Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
