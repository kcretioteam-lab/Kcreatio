import { useState, useEffect } from 'react';
import { Monitor, Smartphone, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api, { getErrorMessage } from '../../utils/api.js';
import { useToast } from '../../hooks/useToast.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import Badge from '../ui/Badge.jsx';

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' };
const ghostBtn = { padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-2)', color: 'var(--text-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 500, fontSize: 'var(--text-xs)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' };

export default function SessionsCard() {
  const toast = useToast();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);
  function load() {
    api.get('/auth/sessions')
      .then(r => { setSessions(r.data.sessions || []); setError(''); })
      .catch(err => setError(getErrorMessage(err, 'Couldn’t load your devices.')));
  }

  async function signOut(s) {
    try {
      await api.delete(`/auth/sessions/${s.id}`);
      if (s.current) { await logout(); return; }
      toast.success(`Signed out ${s.device}`);
      load();
    } catch (err) { toast.error(getErrorMessage(err, 'Couldn’t sign that device out.')); }
  }

  async function signOutEverywhere() {
    if (!window.confirm('Sign out of Kcreatio on every device, including this one?')) return;
    try {
      await api.post('/auth/sessions/revoke-all');
      await logout();
    } catch (err) { toast.error(getErrorMessage(err, 'Couldn’t sign out everywhere.')); }
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Where you’re signed in</h2>
        <button type="button" onClick={signOutEverywhere} style={{ ...ghostBtn, color: 'var(--danger-text)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={13} aria-hidden="true" /> Sign out everywhere
        </button>
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
        We email you when your account is used on a new device. If you don’t recognise one here, sign it out and change your password.
      </p>
      {error && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--danger-text)', margin: 0 }}>{error}</p>}
      {sessions && sessions.length === 0 && !error && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>No other devices.</p>}
      {sessions && sessions.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
          {sessions.map(s => {
            const Icon = /Android|iOS/.test(s.device) ? Smartphone : Monitor;
            return (
              <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderTop: '1px solid var(--border)' }}>
                <Icon size={18} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                    {s.device} {s.current && <Badge variant="success">This device</Badge>}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Active {formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true })}{s.ip ? ` · ${s.ip}` : ''}
                  </div>
                </div>
                <button type="button" style={ghostBtn} onClick={() => signOut(s)}>Sign out</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
