import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Briefcase, TrendingUp,
  MoreHorizontal, DollarSign, Calculator, Receipt, Settings, X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';

const PRIMARY_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/invoices',  icon: FileText,         label: 'Invoices' },
  { to: '/deals',     icon: Briefcase,        label: 'Deals' },
  { to: '/income',    icon: TrendingUp,       label: 'Income' },
];

const MORE_ITEMS = [
  { to: '/tds',         icon: DollarSign,  label: 'TDS Tracker' },
  { to: '/tax-planner', icon: Calculator,  label: 'Tax Planner' },
  { to: '/expenses',    icon: Receipt,     label: 'Expenses' },
  { to: '/settings',    icon: Settings,    label: 'Settings' },
];

export default function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef(null);
  const { isTrialActive, trialDaysLeft } = useAuth();

  useEffect(() => {
    if (!moreOpen) return;
    const onTap = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('pointerdown', onTap);
    return () => document.removeEventListener('pointerdown', onTap);
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  return (
    <>
      {/* Scrim */}
      {moreOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 48 }}
          aria-hidden="true"
        />
      )}

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-label="More navigation"
        aria-modal="true"
        style={{
          position: 'fixed',
          bottom: 64,
          left: 0, right: 0,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          zIndex: 49,
          padding: 'var(--space-4)',
          transform: moreOpen ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 280ms var(--ease-decelerate)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            More
          </span>
          <button
            onClick={() => setMoreOpen(false)}
            aria-label="Close"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
          {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMoreOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--accent-dim)' : 'var(--surface-2)',
                color: isActive ? 'var(--accent)' : 'var(--text-body)',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 400,
                fontSize: 'var(--text-sm)',
              })}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>

        {isTrialActive() && (
          <NavLink
            to="/settings"
            onClick={() => setMoreOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(232,146,26,0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Trial: {trialDaysLeft()} days left · Upgrade to Pro →
          </NavLink>
        )}
      </div>

      {/* Tab bar */}
      <nav
        aria-label="Mobile navigation"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 64,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 50,
        }}
      >
        {PRIMARY_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: 10,
              fontWeight: isActive ? 600 : 400,
              transition: 'color var(--duration-fast)',
            })}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setMoreOpen(o => !o)}
          aria-label="More navigation options"
          aria-expanded={moreOpen}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            color: moreOpen ? 'var(--accent)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: moreOpen ? 600 : 400,
            transition: 'color var(--duration-fast)',
          }}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
