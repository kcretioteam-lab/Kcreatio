import { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Download } from 'lucide-react';
import api, { getErrorMessage } from '../../utils/api.js';
import { useToast } from '../../hooks/useToast.jsx';
import Input from '../ui/Input.jsx';
import Badge from '../ui/Badge.jsx';

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' };
const primaryBtn = { alignSelf: 'flex-start', padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' };
const ghostBtn = { ...primaryBtn, background: 'var(--surface-2)', color: 'var(--text-body)', border: '1px solid var(--border)' };

export default function TwoFactorCard() {
  const toast = useToast();
  const [status, setStatus] = useState(null);          // { enabled, recoveryCodesLeft }
  const [setup, setSetup] = useState(null);            // { qr, secret }
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { refresh(); }, []);
  function refresh() {
    api.get('/auth/2fa').then(r => setStatus(r.data)).catch(() => setStatus({ enabled: false, unavailable: true }));
  }

  async function start() {
    setBusy(true); setError('');
    try { setSetup((await api.post('/auth/2fa/setup')).data); }
    catch (err) { toast.error(getErrorMessage(err, 'Couldn’t start setup. Please try again.')); }
    finally { setBusy(false); }
  }

  async function confirm(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api.post('/auth/2fa/enable', { code: code.replace(/\s/g, '') });
      setRecoveryCodes(r.data.recoveryCodes);
      setSetup(null); setCode('');
      refresh();
      toast.success('Two-factor sign-in is on');
    } catch (err) { setError(getErrorMessage(err, 'That code didn’t match')); }
    finally { setBusy(false); }
  }

  async function disable(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/auth/2fa/disable', { password, code: code.trim() });
      setDisabling(false); setPassword(''); setCode('');
      refresh();
      toast.success('Two-factor sign-in is off');
    } catch (err) { setError(getErrorMessage(err, 'Password or code is incorrect')); }
    finally { setBusy(false); }
  }

  function downloadCodes() {
    const text = `Kcretio recovery codes\nEach code works once. Keep them somewhere safe.\n\n${recoveryCodes.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'kcretio-recovery-codes.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ShieldCheck size={18} aria-hidden="true" style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Two-factor sign-in</h2>
        </div>
        {status && <Badge variant={status.enabled ? 'success' : 'muted'}>{status.enabled ? 'On' : 'Off'}</Badge>}
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
        Your account holds your PAN, GSTIN and bank details. With two-factor sign-in, a stolen password isn’t enough — you’ll also need a code from an authenticator app such as Google Authenticator, Microsoft Authenticator or Authy.
      </p>

      {recoveryCodes && (
        <div style={{ background: 'var(--warning-dim)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>Save your recovery codes now</strong>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>If you lose your phone, each of these codes lets you sign in once. You won’t see them again.</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-2)', fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
            {recoveryCodes.map(c => <span key={c}>{c}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button type="button" style={ghostBtn} onClick={downloadCodes}><Download size={13} aria-hidden="true" /> Download</button>
            <button type="button" style={ghostBtn} onClick={() => navigator.clipboard?.writeText(recoveryCodes.join('\n')).then(() => toast.success('Copied'))}><Copy size={13} aria-hidden="true" /> Copy</button>
            <button type="button" style={primaryBtn} onClick={() => setRecoveryCodes(null)}>I’ve saved them</button>
          </div>
        </div>
      )}

      {status?.unavailable && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>Two-factor sign-in isn’t available right now. Please try again later.</p>}

      {status && !status.enabled && !status.unavailable && !setup && (
        <button type="button" style={primaryBtn} disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Turn on two-factor sign-in'}</button>
      )}

      {setup && (
        <form onSubmit={confirm} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <ol style={{ margin: 0, paddingLeft: 'var(--space-5)', fontSize: 'var(--text-sm)', color: 'var(--text-body)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <li>Scan this QR code with your authenticator app.</li>
            <li>Enter the 6-digit code it shows to finish.</li>
          </ol>
          <img src={setup.qr} alt="QR code for your authenticator app" width={180} height={180} style={{ background: '#fff', padding: 8, borderRadius: 'var(--radius-md)' }} />
          <details style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <summary style={{ cursor: 'pointer' }}>Can’t scan? Enter this key instead</summary>
            <code style={{ display: 'block', marginTop: 'var(--space-2)', wordBreak: 'break-all', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{setup.secret.match(/.{1,4}/g).join(' ')}</code>
          </details>
          <Input id="twofa-confirm" label="6-digit code" value={code} onChange={e => setCode(e.target.value.replace(/[^\d\s]/g, '').slice(0, 7))} inputMode="numeric" autoComplete="one-time-code" error={error} style={{ letterSpacing: '0.3em', maxWidth: 200 }} />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="submit" style={primaryBtn} disabled={busy}>{busy ? 'Checking…' : 'Turn on'}</button>
            <button type="button" style={ghostBtn} onClick={() => { setSetup(null); setCode(''); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}

      {status?.enabled && !disabling && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{status.recoveryCodesLeft} recovery code{status.recoveryCodesLeft === 1 ? '' : 's'} left.</span>
          <button type="button" style={ghostBtn} onClick={() => setDisabling(true)}>Turn off</button>
        </div>
      )}

      {disabling && (
        <form onSubmit={disable} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: 360 }}>
          <Input id="twofa-off-pwd" label="Your password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          <Input id="twofa-off-code" label="Code from your app (or a recovery code)" value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" error={error} />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="submit" style={{ ...primaryBtn, background: 'var(--danger)' }} disabled={busy}>{busy ? 'Turning off…' : 'Turn off two-factor sign-in'}</button>
            <button type="button" style={ghostBtn} onClick={() => { setDisabling(false); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
