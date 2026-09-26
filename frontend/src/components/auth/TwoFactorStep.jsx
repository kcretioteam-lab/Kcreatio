import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import Input from '../ui/Input.jsx';

// Second sign-in step for accounts with two-factor on: a 6-digit authenticator code
// or one of the recovery codes.
export default function TwoFactorStep({ onVerify, onCancel }) {
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const clean = code.trim();
    if (!useRecovery && !/^\d{6}$/.test(clean.replace(/\s/g, ''))) { setError('Enter the 6-digit code from your authenticator app'); return; }
    if (useRecovery && clean.replace(/[\s-]/g, '').length < 10) { setError('Enter one of your recovery codes, like ABCDE-FGHIJ'); return; }
    setBusy(true);
    setError('');
    const result = await onVerify(clean);
    setBusy(false);
    if (!result.success) setError(result.error);
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ShieldCheck size={20} aria-hidden="true" />
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Two-factor sign-in</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
            {useRecovery ? 'Enter one of the recovery codes you saved when you turned on two-factor sign-in. Each code works once.' : 'Open your authenticator app and enter the 6-digit code for Kcretio.'}
          </p>
        </div>
      </div>

      <Input
        id="twofa-code"
        label={useRecovery ? 'Recovery code' : 'Authentication code'}
        value={code}
        onChange={e => setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/[^\d\s]/g, '').slice(0, 7))}
        inputMode={useRecovery ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        autoFocus
        placeholder={useRecovery ? 'ABCDE-FGHIJ' : '123 456'}
        error={error}
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: useRecovery ? '0.08em' : '0.3em', fontSize: 'var(--text-lg)' }}
      />

      <button type="submit" disabled={busy} style={{ padding: 'var(--space-3)', background: busy ? 'var(--border-2)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-base)', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
        {busy ? 'Checking…' : 'Verify and sign in'}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => { setUseRecovery(r => !r); setCode(''); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 'var(--text-sm)', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          {useRecovery ? 'Use my authenticator app instead' : 'Lost your phone? Use a recovery code'}
        </button>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
