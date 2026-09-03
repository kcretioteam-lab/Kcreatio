import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, DollarSign, Calculator,
  Briefcase, TrendingUp, Receipt, Settings,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices',    icon: FileText,         label: 'Invoices' },
  { to: '/tds',         icon: DollarSign,       label: 'TDS Tracker' },
  { to: '/tax-planner', icon: Calculator,       label: 'Tax Planner' },
  { to: '/deals',       icon: Briefcase,        label: 'Brand Deals' },
  { to: '/income',      icon: TrendingUp,       label: 'Income' },
  { to: '/expenses',    icon: Receipt,          label: 'Expenses' },
];

// Shared NavLink style factory — reduced active weight (Linear-style)
function navStyle({ isActive, collapsed }) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 'var(--space-3)',
    padding: 'var(--space-2) var(--space-3)',
    color: isActive ? 'var(--accent)' : 'var(--text-body)',
    // Subtle background — half of accent-dim
    background: isActive ? 'rgba(232,146,26,0.07)' : 'transparent',
    fontWeight: isActive ? 600 : 400,
    fontSize: 'var(--text-sm)',
    transition: 'background var(--duration-fast), color var(--duration-fast)',
    textDecoration: 'none',
    justifyContent: collapsed ? 'center' : 'flex-start',
    // 3px left border — the primary active signal
    borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
    marginLeft: -1,
    borderRadius: `0 var(--radius-md) var(--radius-md) 0`,
  };
}

export default function Sidebar({ collapsed, onToggle }) {
  const { isTrialActive, trialDaysLeft } = useAuth();
  const w = collapsed ? 64 : 240;

  return (
    <aside
      style={{
        width: w, minWidth: w, maxWidth: w,
        height: '100dvh', position: 'sticky', top: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width var(--duration-standard) var(--ease-standard), min-width var(--duration-standard), max-width var(--duration-standard)',
        overflow: 'hidden', zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center',
        padding: '0 var(--space-4)', borderBottom: '1px solid var(--border)',
        gap: 'var(--space-3)', flexShrink: 0,
      }}>
        <div aria-hidden="true" style={{
          width: 28, height: 28, background: 'var(--accent)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0,
        }}>C</div>
        {!collapsed && (
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-base)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            Kcretio
          </span>
        )}
      </div>

      {/* Nav — no section labels, just a subtle separator */}
      <nav aria-label="Main navigation" style={{ flex: 1, padding: 'var(--space-3) var(--space-2)', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 1, listStyle: 'none' }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                title={collapsed ? label : undefined}
                style={({ isActive }) => navStyle({ isActive, collapsed })}
                onMouseEnter={e => {
                  if (!e.currentTarget.getAttribute('aria-current')) {
                    e.currentTarget.style.background = 'var(--surface-2)';
                  }
                }}
                onMouseLeave={e => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.background = isActive ? 'rgba(232,146,26,0.07)' : '';
                }}
              >
                <Icon size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Subtle separator before Settings */}
        <div style={{ margin: 'var(--space-2) var(--space-2)', height: 1, background: 'var(--border)' }} aria-hidden="true" />

        <ul style={{ listStyle: 'none' }}>
          <li>
            <NavLink
              to="/settings"
              title={collapsed ? 'Settings' : undefined}
              style={({ isActive }) => navStyle({ isActive, collapsed })}
              onMouseEnter={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.background = 'var(--surface-2)';
                }
              }}
              onMouseLeave={e => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                e.currentTarget.style.background = isActive ? 'rgba(232,146,26,0.07)' : '';
              }}
            >
              <Settings size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
              {!collapsed && <span>Settings</span>}
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Trial banner */}
      {!collapsed && isTrialActive() && (
        <div style={{
          margin: 'var(--space-3)', padding: 'var(--space-3)',
          background: 'var(--accent-dim)', border: '1px solid rgba(232,146,26,0.2)',
          borderRadius: 'var(--radius-md)',
        }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 700, marginBottom: 2 }}>
            Trial: {trialDaysLeft()} days left
          </p>
          <NavLink to="/settings" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', textDecoration: 'underline' }}>
            Upgrade to Pro →
          </NavLink>
        </div>
      )}

      {/* Collapse toggle */}
      <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-2)' }}>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-2)', borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)', background: 'transparent', border: 'none',
            cursor: 'pointer', width: '100%',
            transition: 'background var(--duration-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {collapsed
            ? <ChevronRight size={14} aria-hidden="true" />
            : <ChevronLeft size={14} aria-hidden="true" />
          }
        </button>
      </div>
    </aside>
  );
}
