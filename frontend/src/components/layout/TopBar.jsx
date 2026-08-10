import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Search, Bell, Settings, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useTheme } from '../../App.jsx';
import api from '../../utils/api.js';

export default function TopBar({ pageTitle }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bellCount, setBellCount] = useState(0);
  const profileRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Fetch Smart Inbox pending count — poll on route change
  const fetchBellCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/email-detections?status=pending_review&limit=1');
      setBellCount(res.data.pending_count ?? 0);
    } catch {
      // non-critical
    }
  }, [user]);

  useEffect(() => { fetchBellCount(); }, [fetchBellCount, location.pathname]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AU';

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K';

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <header style={{
      height: 60,
      display: isMobile ? 'flex' : 'grid',
      gridTemplateColumns: isMobile ? undefined : '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 var(--space-4)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 20,
      gap: 'var(--space-2)',
    }}>

      {/* Left: page title — flex:1 on mobile so it fills remaining space */}
      <h1 style={{
        fontSize: 'var(--text-md)',
        fontWeight: 700,
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...(isMobile ? { flex: 1, minWidth: 0 } : {}),
      }}>
        {pageTitle}
      </h1>

      {/* Center: search — hidden on mobile, centered via grid on desktop */}
      {!isMobile && (
      <div style={{ width: 320, maxWidth: '40vw' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          background: 'var(--surface-2)',
          border: `1px solid ${searchFocused ? 'var(--border-focus)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '0 var(--space-3)', height: 36,
          transition: 'border-color var(--duration-fast)',
          cursor: 'text',
        }}
        onClick={() => { searchInputRef.current?.focus(); setSearchFocused(true); }}
        >
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); searchInputRef.current?.blur(); }}}
            placeholder="Search invoices, deals..."
            aria-label="Search"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
              outline: 'none', flex: 1, minWidth: 0,
            }}
          />
          {!searchFocused && !searchQuery && (
            <kbd style={{
              fontSize: 9, padding: '1px 5px',
              background: 'var(--border)', borderRadius: 4,
              color: 'var(--text-muted)', fontFamily: 'inherit', flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>{shortcutLabel}</kbd>
          )}
        </div>
      </div>
      )} {/* end !isMobile search */}

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', ...(isMobile ? {} : { justifyContent: 'flex-end' }) }}>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'background var(--duration-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
        >
          {theme === 'dark'
            ? <Sun size={15} aria-hidden="true" />
            : <Moon size={15} aria-hidden="true" />
          }
        </button>

        {/* Notification bell */}
        <button
          aria-label={bellCount > 0 ? `${bellCount} Smart Inbox items pending` : 'Notifications'}
          onClick={() => {
            if (location.pathname === '/dashboard') {
              document.getElementById('smart-inbox')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              navigate('/dashboard');
              setTimeout(() => document.getElementById('smart-inbox')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
            }
          }}
          style={{
            position: 'relative', width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-body)',
            transition: 'background var(--duration-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
        >
          <Bell size={15} aria-hidden="true" />
          {bellCount > 0 && (
            <span aria-hidden="true" style={{
              position: 'absolute', top: 5, right: 5,
              minWidth: bellCount > 9 ? 16 : 14, height: 14,
              borderRadius: 'var(--radius-full)',
              background: 'var(--danger)', border: '1.5px solid var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff', padding: '0 2px',
              lineHeight: 1,
            }}>
              {bellCount > 99 ? '99+' : bellCount}
            </span>
          )}
          {bellCount === 0 && (
            <span aria-hidden="true" style={{
              position: 'absolute', top: 7, right: 7,
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--danger)', border: '1.5px solid var(--surface)',
            }} />
          )}
        </button>

        {/* Profile pill */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen(o => !o)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Profile menu"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: '4px 8px 4px 4px',
              background: profileOpen ? 'var(--surface-3)' : 'var(--surface-2)',
              border: `1px solid ${profileOpen ? 'var(--border-2)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-full)', cursor: 'pointer',
              transition: 'background var(--duration-fast)',
            }}
            onMouseEnter={e => { if (!profileOpen) e.currentTarget.style.background = 'var(--surface-3)'; }}
            onMouseLeave={e => { if (!profileOpen) e.currentTarget.style.background = 'var(--surface-2)'; }}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user?.name || 'Avatar'} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0, letterSpacing: '0.02em',
              }}>
                {initials}
              </div>
            )}
            {/* Name hidden on mobile */}
            <span className="topbar-name" style={{
              fontSize: 'var(--text-sm)', fontWeight: 600,
              color: 'var(--text-primary)', maxWidth: 90,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.name?.split(' ')[0] || 'Admin'}
            </span>
            <ChevronDown size={11} aria-hidden="true" style={{
              color: 'var(--text-muted)',
              transition: 'transform var(--duration-fast)',
              transform: profileOpen ? 'rotate(180deg)' : 'none',
            }} />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div role="menu" style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              minWidth: 0, width: 'min(220px, calc(100vw - 32px))', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
              overflow: 'hidden', zIndex: 100,
              animation: 'dropdownIn 0.12s ease',
            }}>
              {/* User info */}
              <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user?.name || 'Avatar'} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'var(--accent)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, flexShrink: 0,
                    }}>{initials}</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.name || 'Admin User'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.email || 'admin@kcreatio.in'}
                    </div>
                  </div>
                </div>
                <span style={{
                  display: 'inline-block', marginTop: 'var(--space-2)',
                  padding: '2px 8px', background: 'var(--accent-dim)', color: 'var(--accent)',
                  borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {user?.plan || 'Pro'} Plan
                </span>
              </div>

              {/* Menu items */}
              <div style={{ padding: 'var(--space-2)' }}>
                <Link to="/settings" role="menuitem" onClick={() => setProfileOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', textDecoration: 'none', transition: 'background var(--duration-fast)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Settings size={14} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                  Settings
                </Link>
                <div style={{ borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }} />
                <button role="menuitem" onClick={handleLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', fontSize: 'var(--text-sm)', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background var(--duration-fast)', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-dim)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={14} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 500px) {
          .topbar-name { display: none !important; }
        }
      `}</style>
    </header>
  );
}
