import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import MobileNav from './MobileNav.jsx';

const TABLET_BP = 1024;
const MOBILE_BP = 768;
const SIDEBAR_KEY = 'kcreatio:sidebar_collapsed';

// The user's own choice wins; without one, start collapsed on tablet-sized screens
function initialCollapsed() {
  try {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) return saved === '1';
  } catch { /* storage blocked — fall through */ }
  return window.innerWidth < TABLET_BP;
}

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/invoices': 'Invoices',
  '/invoices/new': 'New Invoice',
  '/tds': 'TDS Tracker',
  '/tax-planner': 'Tax Planner',
  '/deals': 'Brand Deals',
  '/income': 'Income',
  '/expenses': 'Expenses',
  '/settings': 'Settings',
};

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BP);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || (location.pathname.startsWith('/invoices/') ? 'Invoice' : 'Dashboard');

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < MOBILE_BP);
      if (w < TABLET_BP) setCollapsed(true);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleSidebar = () => setCollapsed((c) => {
    try { localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1'); } catch { /* not remembered, still toggles */ }
    return !c;
  });

  // Ctrl+B / Cmd+B toggles the sidebar (same shortcut as most editors)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Donezo-style: outer bg, inner rounded card ──────────────────────────────
  return (
    <div style={{
      height: '100dvh',
      background: 'var(--bg)',
      padding: isMobile ? 0 : 'var(--space-3)',
      overflow: 'hidden',
      display: 'flex',
    }}>
      {/* The one unified card that contains sidebar + topbar + content */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        background: 'var(--surface)',
        borderRadius: isMobile ? 0 : 'var(--radius-xl)',
        border: isMobile ? 'none' : '1px solid var(--border)',
      }}>
        {/* Sidebar */}
        {!isMobile && (
          <Sidebar
            collapsed={collapsed}
            onToggle={toggleSidebar}
          />
        )}

        {/* Main column */}
        <div
          id="main-content"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            paddingBottom: isMobile ? 64 : 0,
          }}
        >
          {/* Invoice editor has its own header (Back, number, template, preview) — skip global search/notifications there */}
          {!location.pathname.startsWith('/invoices/') && <TopBar pageTitle={pageTitle} />}
          <main style={{
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            background: 'var(--bg)',
            width: '100%',
          }}>
            {children}
          </main>
        </div>
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
}

