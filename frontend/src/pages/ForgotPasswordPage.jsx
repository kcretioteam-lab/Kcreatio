import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError('Enter your email address'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 'var(--space-4)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <div aria-hidden="true" style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>C</div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Kcretio</span>
        </div>

        {submitted ? (
          <div>
            <div style={{ width: 48, height: 48, background: 'var(--success-dim)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)', fontSize: 22 }}>✓</div>
            <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Check your inbox</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: 'var(--text-body)' }}>{email}</strong>, you'll receive a password reset link within a few minutes.
            </p>
            <Link to="/login" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600 }}>← Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Reset password</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>Enter your email and we'll send a reset link.</p>

            {error && (
              <div role="alert" style={{ padding: 'var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label htmlFor="reset-email" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Email address</label>
                <input
                  id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" placeholder="you@example.com"
                  style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', outline: 'none', transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ padding: 'var(--space-3)', background: loading ? 'var(--border-2)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-base)', cursor: loading ? 'wait' : 'pointer', minHeight: 44 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>← Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
