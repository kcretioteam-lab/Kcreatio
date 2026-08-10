import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import api from '../utils/api.js';

function getPasswordStrength(password) {
  return {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const s = getPasswordStrength(password);
  const pwdValid = Object.values(s).every(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pwdValid) { setError('Password does not meet all requirements'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 'var(--space-4)' }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <p style={{ color: 'var(--danger-text)', marginBottom: 'var(--space-4)' }}>Invalid reset link.</p>
          <Link to="/forgot-password" style={{ color: 'var(--accent)', fontWeight: 600 }}>Request a new one →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 'var(--space-4)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <div aria-hidden="true" style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>C</div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Kcreatio</span>
        </div>

        {success ? (
          <div>
            <div style={{ width: 48, height: 48, background: 'var(--success-dim)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)', fontSize: 22, color: 'var(--success-text)' }}>✓</div>
            <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Password reset!</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Redirecting to sign in…</p>
            <Link to="/login" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600 }}>Sign in now →</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Set new password</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>For <strong style={{ color: 'var(--text-body)' }}>{email}</strong></p>

            {error && (
              <div role="alert" style={{ padding: 'var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label htmlFor="new-password" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-password" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password" placeholder="Minimum 8 characters"
                    style={{ width: '100%', padding: 'var(--space-2) var(--space-10) var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} aria-label="Toggle visibility"
                    style={{ position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {showPwd ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </button>
                </div>
                {/* Strength indicators */}
                {password && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                    {[
                      { key: 'length', label: '8+ characters' },
                      { key: 'uppercase', label: 'Uppercase letter' },
                      { key: 'lowercase', label: 'Lowercase letter' },
                      { key: 'special', label: 'Special character' },
                    ].map(c => (
                      <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: s[c.key] ? 'var(--success-text)' : 'var(--text-muted)' }}>
                        <CheckCircle2 size={11} style={{ opacity: s[c.key] ? 1 : 0.3 }} aria-hidden="true" />
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label htmlFor="confirm-password" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Confirm new password</label>
                <input
                  id="confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password" placeholder="Repeat your password"
                  style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: `1px solid ${confirm && confirm !== password ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', outline: 'none' }}
                />
                {confirm && confirm !== password && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)' }}>Passwords don't match</span>
                )}
              </div>

              <button type="submit" disabled={loading || !pwdValid || password !== confirm}
                style={{ padding: 'var(--space-3)', background: (!loading && pwdValid && password === confirm) ? 'var(--accent)' : 'var(--border-2)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-base)', cursor: (!loading && pwdValid && password === confirm) ? 'pointer' : 'not-allowed', minHeight: 44 }}>
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
