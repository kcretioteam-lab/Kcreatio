import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.jsx';
import api from '../../../utils/api.js';

const STEPS = [
  { id: 'profile',  label: 'Set up your Tax Profile',    detail: 'Add GSTIN, PAN, business address',           href: '/settings' },
  { id: 'invoice',  label: 'Create your first invoice',   detail: 'GST-compliant in 30 seconds',                href: '/invoices/new' },
  { id: 'income',   label: 'Log your first income',       detail: 'Unlocks advance tax estimate & P&L chart',   href: '/income' },
  { id: 'deal',     label: 'Add a brand deal',            detail: 'Track from inquiry to payment',              href: '/deals' },
  { id: 'tds',      label: 'Add a TDS record',            detail: 'Every brand deducts 10% — track it all',     href: '/tds' },
];

const STORAGE_KEY = 'ctos_onboarding_v1';

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const [state, setState] = useState(loadState);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('ctos_onboarding_dismissed') === '1'; } catch { return false; }
  });
  const [celebrating, setCelebrating] = useState(false);

  async function verifySteps() {
    try {
      const [invoiceRes, incomeRes, dealRes, tdsRes] = await Promise.all([
        api.get('/invoices', { params: { limit: 1 } }),
        api.get('/income', { params: { limit: 1 } }),
        api.get('/deals', { params: { limit: 1 } }),
        api.get('/tds', { params: { limit: 1 } }),
      ]);
      const verified = {
        profile: !!(user?.gstin),
        invoice: (invoiceRes.data?.invoices?.length || invoiceRes.data?.total || 0) > 0,
        income:  (incomeRes.data?.income?.length || 0) > 0,
        deal:    (dealRes.data?.deals?.length || 0) > 0,
        tds:     (tdsRes.data?.records?.length || 0) > 0,
      };
      const next = { ...loadState(), ...verified };
      setState(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    } catch { /* Silently fail — offline or server error */ }
  }

  // Verify on mount
  useEffect(() => {
    if (!dismissed) verifySteps();
  }, [user?.gstin, dismissed]);

  // Re-verify when user returns to this tab/window after completing a task elsewhere
  useEffect(() => {
    function recheck() {
      if (!dismissed) verifySteps();
    }
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [dismissed, user?.gstin]);

  const completed = STEPS.filter(s => state[s.id]).length;
  const total = STEPS.length;
  const allDone = completed === total;

  // Watch for all-done → brief celebration then dismiss
  useEffect(() => {
    if (allDone && !dismissed) {
      setCelebrating(true);
      const t = setTimeout(() => {
        dismiss();
      }, 2800);
      return () => clearTimeout(t);
    }
  }, [allDone, dismissed]);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem('ctos_onboarding_dismissed', '1'); } catch {}
  }

  if (dismissed) return null;

  const pct = Math.round((completed / total) * 100);

  if (celebrating) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-6)',
        textAlign: 'center',
        borderColor: 'var(--success)',
        background: 'var(--success-dim)',
      }}>
        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--success-text)', margin: 0 }}>
          You're all set! Every feature is ready to use.
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
          Time to send your first GST invoice.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: 'var(--space-6)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Get started with Kcretio
          </span>
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: completed === total ? 'var(--success-text)' : 'var(--text-muted)',
            background: completed === total ? 'var(--success-dim)' : 'var(--surface-2)',
            border: `1px solid ${completed === total ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-full)',
            padding: '2px 8px',
          }}>
            {completed}/{total}
          </span>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss setup checklist"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-body)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--surface-2)' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct === 100 ? 'var(--success)' : 'var(--accent)',
          transition: 'width 400ms var(--ease-decelerate)',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>

      {/* Steps */}
      <div style={{ padding: 'var(--space-2) 0' }}>
        {STEPS.map((step) => {
          const done = !!state[step.id];
          return (
            <Link
              key={step.id}
              to={step.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-5)',
                textDecoration: 'none',
                transition: 'background var(--duration-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {done
                ? <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0 }} aria-hidden="true" />
                : <Circle size={18} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} aria-hidden="true" />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: done ? 400 : 500,
                  color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {step.label}
                </span>
                {!done && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {step.detail}
                  </span>
                )}
              </div>
              {!done && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>
                  Start →
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
