import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import MobileNav from './MobileNav.jsx';

const TABLET_BP = 1024;
const MOBILE_BP = 768;

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
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BP);
  const [isTablet, setIsTablet] = useState(window.innerWidth < TABLET_BP && window.innerWidth >= MOBILE_BP);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || (location.pathname.startsWith('/invoices/') ? 'Invoice' : 'Dashboard');

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < MOBILE_BP);
      setIsTablet(w >= MOBILE_BP && w < TABLET_BP);
      if (w < TABLET_BP) setCollapsed(true);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
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
            collapsed={collapsed || isTablet}
            onToggle={() => setCollapsed((c) => !c)}
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
          <TopBar pageTitle={pageTitle} />
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

