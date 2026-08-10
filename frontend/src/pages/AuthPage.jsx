import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, FileText, Receipt, Calculator, CheckCircle2, Loader2, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile.js';
import Input from '../components/ui/Input.jsx';
import api from '../utils/api.js';
import Modal from '../components/ui/Modal.jsx';
import { useTheme } from '../App.jsx';

const BRAND_BULLETS = [
  { icon: FileText,   text: 'GST-compliant invoices in 30 seconds' },
  { icon: Receipt,    text: 'TDS tracking from every brand' },
  { icon: Calculator, text: 'Advance tax planning — no March shock' },
];

// Password strength checker
function getPasswordStrength(password) {
  return {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };
}

function PasswordStrengthIndicator({ password }) {
  const s = getPasswordStrength(password);
  if (!password) return null;
  const criteria = [
    { key: 'length',    label: '8+ characters' },
    { key: 'uppercase', label: 'Uppercase letter' },
    { key: 'lowercase', label: 'Lowercase letter' },
    { key: 'special',   label: 'Special character (!@#$…)' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
      {criteria.map(c => (
        <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: s[c.key] ? 'var(--success-text)' : 'var(--text-muted)' }}>
          <CheckCircle2 size={12} style={{ opacity: s[c.key] ? 1 : 0.3 }} aria-hidden="true" />
          {c.label}
        </div>
      ))}
    </div>
  );
}

// Terms & Conditions text for modal
const TERMS_TEXT = `Kcreatio Terms of Service

1. Acceptance of Terms
By creating an account, you agree to these terms.

2. Service Description
Kcreatio provides GST invoicing, TDS tracking, advance tax planning, and financial management tools for Indian content creators.

3. Data Privacy
Your financial data is encrypted and stored securely. We do not share your data with third parties except as required by law.

4. User Responsibilities
You are responsible for the accuracy of information you enter. Tax estimates are indicative only — consult a CA for ITR filing.

5. Payments & Subscriptions
Subscriptions auto-renew until cancelled. Cancellations take effect at the end of the billing period.

6. Intellectual Property
All content, designs, and software are property of Kcreatio.

7. Disclaimer
Tax calculations are estimates based on prevailing laws. Kcreatio is not a licensed CA or tax advisor.

8. Governing Law
These terms are governed by the laws of India, subject to jurisdiction of courts in Bengaluru.`;

export default function AuthPage({ defaultMode = 'register' }) {
  const [mode, setMode] = useState(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [searchParams] = useSearchParams();
  const [errors, setErrors] = useState(
    searchParams.get('error') === 'oauth_failed'
      ? { form: 'Google sign-in failed. Please try again.' }
      : {}
  );
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(640);
  const { theme, toggleTheme } = useTheme();

  // OTP flow state
  const [otpStep, setOtpStep] = useState(false);  // show OTP input
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  // T&C state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => setOtpCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  const pwdStrength = getPasswordStrength(password);
  const pwdValid = Object.values(pwdStrength).every(Boolean);

  const allRegisterReady = mode === 'register'
    ? (otpVerified && pwdValid && name.trim() && termsAccepted)
    : true;

  const validate = () => {
    const e = {};
    if (mode === 'register') {
      if (!name.trim()) e.name = 'Name is required';
      if (!otpVerified) e.email = 'Please verify your email first';
      if (!pwdValid) e.password = 'Password does not meet all requirements';
      if (!termsAccepted) e.terms = 'You must accept the Terms of Service';
    } else {
      if (!email.trim()) e.identifier = 'Email or phone is required';
    }
    return e;
  };

  async function handleSendOtp() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Enter a valid email first' });
      return;
    }
    setOtpSending(true);
    setErrors({});
    try {
      await api.post('/auth/send-otp', { email, purpose: 'email_verify' });
      setOtpStep(true);
      setOtpCooldown(30);
    } catch (err) {
      setErrors({ email: err?.response?.data?.message || 'Failed to send OTP' });
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) { setErrors({ otp: 'Enter the 6-digit code' }); return; }
    setOtpVerifying(true);
    setErrors({});
    try {
      const res = await api.post('/auth/verify-otp', { email, otp, purpose: 'email_verify' });
      setVerificationToken(res.data.verificationToken);
      setOtpVerified(true);
      setOtpStep(false);
      setOtp('');
    } catch (err) {
      setErrors({ otp: err?.response?.data?.message || 'Invalid or expired OTP' });
    } finally {
      setOtpVerifying(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    if (mode === 'register') {
      const result = await register(name.trim(), email.trim(), password, {
        phone: phone.trim() || undefined,
        verificationToken,
        termsAccepted,
        marketingEmails,
      });
      setLoading(false);
      if (result.success) navigate('/dashboard');
      else setErrors({ form: result.error });
    } else {
      const result = await login(email.trim(), password);
      setLoading(false);
      if (result.success) navigate('/dashboard');
      else {
        if (result.errorCode === 'ACCOUNT_LOCKED') {
          setErrors({ form: result.error + ' ' });
        } else {
          setErrors({ form: result.error });
        }
      }
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)',
    }}>
      {/* Minimal auth navbar */}
      <header style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 var(--space-4)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          color: 'var(--text-body)', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 500,
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-body)'}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to home
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div aria-hidden="true" style={{ width: 24, height: 24, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#fff' }}>C</div>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Kcreatio</span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'background var(--duration-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
        >
          {theme === 'dark' ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
        </button>
      </header>

      {/* Card container */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 3fr',
        width: '100%',
        maxWidth: 840,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}>
        {/* Left brand panel */}
        {!isMobile && (
          <div style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--border)', padding: 'var(--space-10)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-10)' }}>
                <div aria-hidden="true" style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0 }}>C</div>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>Kcreatio</span>
              </div>
              <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 'clamp(22px, 2vw, 30px)', fontWeight: 400, lineHeight: 1.2, color: 'var(--text-primary)', marginBottom: 'var(--space-6)', letterSpacing: '-0.01em' }}>
                Your financial OS.<br />
                <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Built for Indian creators.</em>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {BRAND_BULLETS.map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                      <Icon size={15} aria-hidden="true" />
                    </div>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.4 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Join 200+ Indian creators who handle GST, TDS & advance tax without a CA.
            </p>
          </div>
        )}

        {/* Right form panel */}
        <div style={{ padding: isMobile ? 'var(--space-6)' : 'var(--space-10)' }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
            {mode === 'register' ? 'Start your 28-day trial' : 'Welcome back'}
          </h1>
          {mode === 'register' && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              GST invoices, TDS tracking, advance tax — all in one place.
            </p>
          )}
          {mode === 'login' && <div style={{ marginBottom: 'var(--space-6)' }} />}

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => { window.location.href = `${api.defaults.baseURL}/auth/google`; }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
              width: '100%', padding: 'var(--space-3)',
              background: 'var(--surface-2)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              fontWeight: 500, fontSize: 'var(--text-base)', cursor: 'pointer',
              transition: 'background var(--duration-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {errors.form && (
            <div role="alert" style={{ padding: 'var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
              {errors.form}
              {errors.form.includes('locked') && (
                <Link to="/forgot-password" style={{ display: 'block', marginTop: 4, color: 'var(--danger-text)', fontWeight: 700, textDecoration: 'underline' }}>
                  Reset password to unlock →
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
            {mode === 'register' && (
              <Input id="name" label="Full name" type="text" value={name} onChange={e => setName(e.target.value)} error={errors.name} autoComplete="name" placeholder="Arjun Sharma" />
            )}

            {/* Email with OTP verify button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label htmlFor="email" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>
                  {mode === 'register' ? 'Email' : 'Email or mobile number'}
                </label>
                {otpVerified && mode === 'register' && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <CheckCircle2 size={12} /> Verified
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  id="email"
                  type={mode === 'login' ? 'text' : 'email'}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setOtpVerified(false); setOtpStep(false); setVerificationToken(''); }}
                  autoComplete="email"
                  placeholder={mode === 'login' ? 'you@example.com or +91 98765 43210' : 'you@example.com'}
                  style={{
                    flex: 1, padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--surface-2)',
                    border: `1px solid ${errors.email ? 'var(--danger)' : otpVerified ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    fontSize: 'var(--text-base)', outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = errors.email ? 'var(--danger)' : otpVerified ? 'var(--success)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                {mode === 'register' && !otpVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending || otpCooldown > 0}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--accent)', color: '#fff',
                      border: 'none', borderRadius: 'var(--radius-md)',
                      fontWeight: 600, fontSize: 'var(--text-xs)', cursor: 'pointer',
                      whiteSpace: 'nowrap', flexShrink: 0,
                      opacity: otpSending || otpCooldown > 0 ? 0.6 : 1,
                    }}
                  >
                    {otpSending ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} /> : otpCooldown > 0 ? `${otpCooldown}s` : 'Verify email'}
                  </button>
                )}
              </div>
              {errors.email && <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)' }}>{errors.email}</span>}

              {/* OTP input row */}
              {otpStep && mode === 'register' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                    Enter the 6-digit code sent to <strong style={{ color: 'var(--text-body)' }}>{email}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <input
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      autoFocus
                      style={{
                        flex: 1, padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--surface)', border: `1px solid ${errors.otp ? 'var(--danger)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                        fontSize: 'var(--text-lg)', fontFamily: 'monospace', letterSpacing: '0.2em',
                        outline: 'none', textAlign: 'center',
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleVerifyOtp(); } }}
                    />
                    <button type="button" onClick={handleVerifyOtp} disabled={otpVerifying || otp.length < 6}
                      style={{ padding: 'var(--space-2) var(--space-3)', background: otp.length === 6 ? 'var(--success)' : 'var(--border-2)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-xs)', cursor: otp.length === 6 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
                      {otpVerifying ? 'Checking…' : 'Confirm'}
                    </button>
                  </div>
                  {errors.otp && <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)' }}>{errors.otp}</span>}
                  <button type="button" onClick={() => { setOtpStep(false); setOtp(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'left', padding: 0 }}>
                    ← Change email
                  </button>
                </div>
              )}
            </div>

            {/* Phone (register only) */}
            {mode === 'register' && (
              <Input id="phone" label="Mobile number (optional)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" hint="Used for login and invoice contact" />
            )}

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label htmlFor="password" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Password</label>
                {mode === 'login' && (
                  <Link to="/forgot-password" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>Forgot password?</Link>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder="Minimum 8 characters"
                  style={{
                    width: '100%', padding: 'var(--space-2) var(--space-10) var(--space-2) var(--space-3)',
                    background: 'var(--surface-2)',
                    border: `1px solid ${errors.password ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    fontSize: 'var(--text-base)', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = errors.password ? 'var(--danger)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}>
                  {showPwd ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)' }}>{errors.password}</span>}
              {mode === 'register' && <PasswordStrengthIndicator password={password} />}
            </div>

            {/* T&C checkboxes — register only */}
            {mode === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--text-body)', lineHeight: 1.5 }}>
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }} />
                  <span>
                    I agree to the{' '}
                    <button type="button" onClick={() => setTermsModalOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontSize: 'inherit', padding: 0, fontFamily: 'inherit' }}>
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button type="button" onClick={() => setTermsModalOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontSize: 'inherit', padding: 0, fontFamily: 'inherit' }}>
                      Privacy Policy
                    </button>
                    {' '}<span style={{ color: 'var(--danger-text)' }}>*</span>
                  </span>
                </label>
                {errors.terms && <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)', marginTop: -4 }}>{errors.terms}</span>}

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <input type="checkbox" checked={marketingEmails} onChange={e => setMarketingEmails(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }} />
                  I'd like to receive product updates, tax deadline reminders, and creator finance tips
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'register' && !allRegisterReady)}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: loading || (mode === 'register' && !allRegisterReady) ? 'var(--border-2)' : 'var(--accent)',
                color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600,
                fontSize: 'var(--text-base)',
                cursor: loading || (mode === 'register' && !allRegisterReady) ? 'not-allowed' : 'pointer',
                transition: 'background var(--duration-fast), transform var(--duration-fast)',
                border: 'none', marginTop: 'var(--space-1)', minHeight: 44, width: '100%',
              }}
              onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {loading ? 'Please wait…' : mode === 'register' ? 'Create free account' : 'Sign in'}
            </button>
          </form>

          {mode === 'register' && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>No credit card required</p>
          )}

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', textAlign: 'center', marginTop: 'var(--space-4)' }}>
            {mode === 'register' ? 'Already have an account? ' : "Don't have an account? "}
            <Link to={mode === 'register' ? '/login' : '/register'} onClick={() => { setErrors({}); setOtpVerified(false); setOtpStep(false); }}
              style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>
              {mode === 'register' ? 'Sign in' : 'Start free trial'}
            </Link>
          </p>
        </div>
      </div>

      {/* T&C Modal */}
      <Modal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} title="Terms of Service">
        <pre style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
          {TERMS_TEXT}
        </pre>
        <button
          onClick={() => { setTermsAccepted(true); setTermsModalOpen(false); }}
          style={{ marginTop: 'var(--space-4)', padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
          Accept & Close
        </button>
      </Modal>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .auth-brand-panel { display: none !important; } }
      `}</style>
    </div>
    </div>
  );
}
