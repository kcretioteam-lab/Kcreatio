import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, IndianRupee, Calculator,
  Briefcase, TrendingUp, Receipt, Settings,
  PanelLeftClose, PanelLeftOpen, MessageCircle,
} from 'lucide-react';

// WhatsApp support number in international format without '+', e.g. 91XXXXXXXXXX
const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP;
const SUPPORT_HREF = SUPPORT_WHATSAPP
  ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hi Kcreatio team, I need help with ')}`
  : 'mailto:support@kcreatio.com';
import { useAuth } from '../../hooks/useAuth.jsx';
import LogoMark from '../ui/LogoMark.jsx';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices',    icon: FileText,         label: 'Invoices' },
  { to: '/tds',         icon: IndianRupee,      label: 'TDS Tracker' },
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
        // Fill the AppShell card, not the window: the card is inset by padding, so 100dvh pushed the
        // collapse toggle below the visible edge
        height: '100%', alignSelf: 'stretch',
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
        <LogoMark size={28} />
        {!collapsed && (
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-base)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            Kcreatio
          </span>
        )}
      </div>

      {/* Nav — no section labels, just a subtle separator */}
      <nav aria-label="Main navigation" style={{ flex: 1, minHeight: 0, padding: 'var(--space-3) var(--space-2)', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
          <li>
            <a href={SUPPORT_HREF} target="_blank" rel="noopener noreferrer" title={collapsed ? 'Help' : undefined}
              style={navStyle({ isActive: false, collapsed })}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
              <MessageCircle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
              {!collapsed && <span>{SUPPORT_WHATSAPP ? 'Help on WhatsApp' : 'Help'}</span>}
            </a>
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
            Pro access: {trialDaysLeft()} days left
          </p>
          {/* Paid upgrade disabled — premium is granted on request
          <NavLink to="/settings" ...>Upgrade to Pro →</NavLink> */}
        </div>
      )}

      {/* Collapse toggle — also Ctrl+B / Cmd+B (AppShell) */}
      <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-2)', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar for more space (Ctrl+B)'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)', background: 'transparent', border: 'none',
            cursor: 'pointer', width: '100%', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            transition: 'background var(--duration-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {collapsed
            ? <PanelLeftOpen size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
            : <><PanelLeftClose size={16} aria-hidden="true" style={{ flexShrink: 0 }} /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}
