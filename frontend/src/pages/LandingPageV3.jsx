import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, X, FileText, TrendingDown, Calendar, Briefcase, BarChart2, Download, Lock, Shield, RefreshCw, Check, IndianRupee, ArrowRight } from 'lucide-react';
import { useTheme } from '../App.jsx';
import { useScrollProgress } from '../hooks/useScrollProgress.js';

// ── Prefers-reduced-motion check ──────────────────────────────────────────────
function pRM() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ── Intersection-observer reveal hook ─────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, vis];
}

// ── Reveal wrapper: children fade + rise on scroll entry ──────────────────────
function R({ children, delay = 0, y = 28 }) {
  const [ref, vis] = useReveal();
  const motion = pRM();
  return (
    <div
      ref={ref}
      style={{
        opacity: vis || motion ? 1 : 0,
        transform: vis || motion ? 'none' : `translateY(${y}px)`,
        transition: motion
          ? 'none'
          : `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Noise SVG texture overlay ─────────────────────────────────────────────────
function Noise() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.022,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <filter id="v3noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#v3noise)" />
    </svg>
  );
}

// ── Ambient glow blob ─────────────────────────────────────────────────────────
function Glow({ color = 'rgba(232,146,26,0.07)', size = 700, x = '50%', y = '40%' }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: 'translate(-50%,-50%)',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(40px)',
      }}
    />
  );
}

// ── Floating Pill Navbar ──────────────────────────────────────────────────────
function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    ['#act2', 'Story'],
    ['#act4', 'How it Works'],
    ['#pricing', 'Pricing'],
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 'var(--space-4)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        width: 'calc(100% - var(--space-8))',
        maxWidth: 'min(960px, 100%)',
      }}
    >
      <header
        role="banner"
        style={{
          background: scrolled
            ? theme === 'dark'
              ? 'rgba(14,16,24,0.92)'
              : 'rgba(255,255,255,0.92)'
            : theme === 'dark'
              ? 'rgba(14,16,24,0.70)'
              : 'rgba(255,255,255,0.70)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-full)',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--space-4)',
          justifyContent: 'space-between',
          transition: 'background 0.25s ease, box-shadow 0.25s ease',
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.18)' : 'none',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 26,
              height: 26,
              background: 'linear-gradient(135deg, var(--accent) 0%, #c8711a 100%)',
              borderRadius: 7,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 13,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            C
          </div>
          <span
            style={{
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              letterSpacing: '-0.02em',
            }}
          >
            CreatiFlow
          </span>
        </Link>

        {/* Desktop nav links — hidden on mobile via media query via inline class trick */}
        <nav
          aria-label="Main navigation"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
          className="v3-nav-desktop"
        >
          {navLinks.map(([href, label]) => (
            <a
              key={href}
              href={href}
              style={{
                padding: 'var(--space-1) var(--space-3)',
                color: 'var(--text-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                borderRadius: 'var(--radius-full)',
                transition: 'background 0.15s ease, color 0.15s ease',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-body)';
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'background 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
          >
            {theme === 'dark' ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
          </button>

          {/* Sign in — hidden on small mobile */}
          <Link
            to="/login"
            className="v3-nav-signin"
            style={{
              padding: 'var(--space-1) var(--space-3)',
              color: 'var(--text-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              borderRadius: 'var(--radius-full)',
              textDecoration: 'none',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-body)';
            }}
          >
            Sign in
          </Link>

          {/* Start free CTA — hidden on very small, shown md+ */}
          <Link
            to="/register"
            className="v3-nav-cta"
            style={{
              padding: '6px var(--space-4)',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            Start free →
          </Link>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            className="v3-nav-hamburger"
            style={{
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              color: 'var(--text-body)',
              flexShrink: 0,
            }}
          >
            {menuOpen ? <X size={14} aria-hidden="true" /> : <Menu size={14} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          role="navigation"
          aria-label="Mobile navigation"
          style={{
            marginTop: 'var(--space-2)',
            background: theme === 'dark' ? 'rgba(14,16,24,0.97)' : 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {navLinks.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-base)',
                fontWeight: 500,
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
              }}
            >
              {label}
            </a>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }} />
          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              color: 'var(--text-body)',
              fontSize: 'var(--text-base)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
          <Link
            to="/register"
            onClick={() => setMenuOpen(false)}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-base)',
              textAlign: 'center',
              marginTop: 'var(--space-1)',
              textDecoration: 'none',
            }}
          >
            Start free trial
          </Link>
        </div>
      )}

      {/* Scoped responsive styles */}
      <style>{`
        @media (min-width: 768px) {
          .v3-nav-hamburger { display: none !important; }
          .v3-nav-desktop { display: flex !important; }
          .v3-nav-signin { display: inline-flex !important; }
          .v3-nav-cta { display: inline-flex !important; }
        }
        @media (max-width: 767px) {
          .v3-nav-desktop { display: none !important; }
          .v3-nav-signin { display: none !important; }
          .v3-nav-cta { display: none !important; }
          .v3-nav-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ACT 1 — Dream
// ════════════════════════════════════════════════════════════════════════════

// Fragment mini-card — static atmosphere pieces
function FragmentCard({ style: extra, title, sub, tag, tagColor = 'var(--text-muted)' }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 180,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3)',
        pointerEvents: 'none',
        opacity: 0.13,
        filter: 'blur(3px)',
        userSelect: 'none',
        ...extra,
      }}
    >
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{title}</p>
      {sub && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)', margin: '4px 0 0', lineHeight: 1.3 }}>
          {sub}
        </p>
      )}
      {tag && (
        <span
          style={{
            display: 'inline-block',
            marginTop: 6,
            fontSize: 10,
            color: tagColor,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {tag}
        </span>
      )}
    </div>
  );
}

export function Act1Dream() {
  const [subVisible, setSubVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSubVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  const motion = pRM();

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      <Noise />
      <Glow color="rgba(232,146,26,0.08)" size={900} x="50%" y="55%" />

      {/* Atmosphere fragment cards — hidden on mobile via CSS */}
      <div className="v3-act1-fragments">
        {/* Top-left: draft invoice */}
        <FragmentCard
          title="TAX INVOICE · Draft · ₹45,000"
          sub="Brand Collab · Jun 2026"
          tag="DRAFT"
          tagColor="var(--text-muted)"
          style={{ top: '12%', left: '4%', transform: 'rotate(-12deg)' }}
        />
        {/* Top-right: TDS entry */}
        <FragmentCard
          title="TDS · boAt · ₹6,200"
          sub="Q1 FY26 · Form 26AS"
          tag="AWAITING"
          tagColor="var(--warning-text)"
          style={{ top: '8%', right: '3%', transform: 'rotate(8deg)' }}
        />
        {/* Bottom-left: advance tax reminder */}
        <FragmentCard
          title="Q3 Advance Tax"
          sub="Sep 15 deadline"
          tag="⚠ DUE SOON"
          tagColor="var(--danger-text)"
          style={{ bottom: '14%', left: '5%', transform: 'rotate(10deg)' }}
        />
        {/* Bottom-right: GST confusion */}
        <FragmentCard
          title="GST: CGST??? · IGST???"
          sub="SAC code: ???"
          tag="UNRESOLVED"
          tagColor="var(--danger-text)"
          style={{ bottom: '10%', right: '4%', transform: 'rotate(-8deg)' }}
        />
      </div>

      {/* Center content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          padding: '0 var(--space-6)',
          maxWidth: 700,
          width: '100%',
        }}
      >
        <p
          className="label"
          style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}
        >
          FINANCIAL OS FOR INDIAN CREATORS
        </p>

        <h1 className="display" style={{ margin: '0 0 var(--space-6)' }}>
          You create.<br />
          <em>Everything else flows.</em>
        </h1>

        <p
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--text-body)',
            maxWidth: 480,
            margin: '0 auto var(--space-8)',
            lineHeight: 1.6,
            opacity: subVisible || motion ? 1 : 0,
            transform: subVisible || motion ? 'none' : 'translateY(12px)',
            transition: motion
              ? 'none'
              : 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0ms',
          }}
        >
          CreatiFlow handles GST invoicing, TDS tracking, and advance tax — so you never have to think about them.
        </p>

        {/* CTA row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Link
            to="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-8)',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: 'var(--text-base)',
              textDecoration: 'none',
              transition: 'background 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--accent-hover)';
              e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-dim)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Start free — no credit card
          </Link>
          <a
            href="#act2"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-6)',
              background: 'transparent',
              color: 'var(--text-body)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-base)',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'border-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-2)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-body)';
            }}
          >
            See what you're missing ↓
          </a>
        </div>

        {/* Microcopy */}
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          No credit card · 28-day trial · Cancel anytime
        </p>
      </div>

      {/* Scroll indicator */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 'var(--space-8)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          opacity: 0.4,
          animation: motion ? 'none' : 'v3chevronbounce 1.5s ease-in-out infinite',
        }}
      >
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
          <path d="M1 1l9 9 9-9" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Scoped styles */}
      <style>{`
        @keyframes v3chevronbounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(5px); }
        }
        @media (max-width: 767px) {
          .v3-act1-fragments { display: none !important; }
        }
        .v3-act1-fragments {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ACT 2 — Reality
// ════════════════════════════════════════════════════════════════════════════

// ── Frame visual: upload complete ─────────────────────────────────────────────
function FrameUpload() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          background: 'var(--success-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Check size={20} color="var(--success-text)" aria-hidden="true" />
      </div>
      <div>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Brand Collab v3.mp4 · 8:42
        </p>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--success-text)',
            margin: '2px 0 0',
            fontWeight: 500,
          }}
        >
          Upload complete ✓
        </p>
      </div>
    </div>
  );
}

// ── Frame visual: blank invoice fields ────────────────────────────────────────
function FrameInvoiceBlank() {
  const fields = ['Brand Name', 'GSTIN', 'Invoice No.', 'Amount', 'Place of Supply'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {fields.map(field => (
        <div
          key={field}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
            {field}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--danger-text)',
              background: 'rgba(239,68,68,0.10)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 8px',
              letterSpacing: '0.04em',
            }}
          >
            REQUIRED
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Frame visual: GST confusion ───────────────────────────────────────────────
function FrameGSTConfused() {
  const rows = ['CGST rate', 'SGST rate', 'Place of supply', 'SAC / HSN code', 'IGST or CGST+SGST?'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {rows.map(row => (
        <div
          key={row}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
            {row}
          </span>
          <span
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 800,
              color: 'var(--warning-text)',
              letterSpacing: '0.1em',
            }}
          >
            ???
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Frame visual: payment gap ─────────────────────────────────────────────────
function FramePaymentGap() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      {/* Invoiced */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Invoiced</span>
        <span
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ₹45,000
        </span>
      </div>
      {/* Divider line */}
      <div
        style={{
          height: 1,
          background: 'rgba(239,68,68,0.30)',
          borderRadius: 'var(--radius-full)',
        }}
      />
      {/* TDS deducted */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          TDS deducted (10%)
        </span>
        <span
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            color: 'var(--danger-text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          −₹4,500
        </span>
      </div>
      {/* You received */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(245,158,11,0.08)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2) var(--space-3)',
          marginTop: 'var(--space-1)',
        }}
      >
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-body)' }}>
          You received
        </span>
        <span
          style={{
            fontSize: 'var(--text-md)',
            fontWeight: 800,
            color: 'var(--warning-text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ₹40,500
        </span>
      </div>
    </div>
  );
}

// ── Frame visual: TDS missing ─────────────────────────────────────────────────
function FrameTDSMissing() {
  const entries = [
    { brand: 'boAt', amount: '₹6,200' },
    { brand: 'PhonePe', amount: '₹2,800' },
    { brand: 'Zomato', amount: '₹11,800' },
  ];
  return (
    <div>
      <p
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.06em',
          margin: '0 0 var(--space-3)',
        }}
      >
        TDS THIS FY
      </p>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: 'var(--space-3)',
        }}
      >
        {entries.map((e, i) => (
          <div
            key={e.brand}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-2) var(--space-3)',
              borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)' }}>{e.brand}</span>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {e.amount}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Total untracked:
        </span>
        <span
          style={{
            fontSize: 'var(--text-md)',
            fontWeight: 800,
            color: 'var(--danger-text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ₹40,000+
        </span>
      </div>
    </div>
  );
}

// ── Frame visual: WhatsApp follow-up ─────────────────────────────────────────
function FrameWhatsApp() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Sent message — right aligned */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            background: 'var(--accent-dim)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) var(--space-1) var(--radius-xl)',
            padding: 'var(--space-3) var(--space-4)',
            maxWidth: '80%',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Hey, sent the invoice last week...
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', textAlign: 'right' }}>
            Mon 11:34 AM ✓✓
          </p>
        </div>
      </div>
      {/* Received message — left aligned */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--space-1) var(--radius-xl) var(--radius-xl) var(--radius-xl)',
            padding: 'var(--space-3) var(--space-4)',
            maxWidth: '80%',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Hi, can you resend? Our finance team needs it in a different format.
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Mon 2:17 PM
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Frame visual: spreadsheet chaos ──────────────────────────────────────────
function FrameChaos() {
  const files = [
    'Invoice Log.xlsx — 47 entries',
    'TDS_Tracker_Final_v3.xlsx',
    'Payments_March_ACTUAL.xlsx',
  ];
  return (
    <div>
      <div style={{ position: 'relative', height: 120, marginBottom: 'var(--space-4)' }}>
        {files.map((f, i) => (
          <div
            key={f}
            style={{
              position: 'absolute',
              left: i * 6,
              top: i * 10,
              right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              transform: `rotate(${[-2, 1, -1][i]}deg)`,
              zIndex: 3 - i,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-body)',
                margin: 0,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              📊 {f}
            </p>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          background: 'rgba(239,68,68,0.08)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239,68,68,0.20)',
        }}
      >
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--danger-text)' }}>
          ▲ Numbers don't match
        </span>
      </div>
    </div>
  );
}

// ── FRAMES data array ─────────────────────────────────────────────────────────
const FRAMES = [
  { headline: 'You finished the content.', Visual: FrameUpload },
  { headline: 'Then the paperwork starts.', Visual: FrameInvoiceBlank },
  { headline: 'GST? CGST? SAC code?', Visual: FrameGSTConfused },
  { headline: 'They paid ₹45,000.\nYou got ₹40,500.', Visual: FramePaymentGap },
  { headline: '₹40,000 in TDS.\nSomewhere. Untracked.', Visual: FrameTDSMissing },
  { headline: '"Hi, just checking\non the invoice..."', Visual: FrameWhatsApp },
  { headline: '5 spreadsheet tabs.\n0 reconciliation.', Visual: FrameChaos },
];

// ── VideoEditorCard ───────────────────────────────────────────────────────────
function VideoEditorCard({ chaosMode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 380,
      }}
    >
      {/* macOS window */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          {/* Traffic lights */}
          <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
          </div>
          <span
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              fontWeight: 500,
            }}
          >
            Video Editor
          </span>
          <div style={{ width: 34 }} aria-hidden="true" />
        </div>

        {/* Preview area */}
        <div
          aria-hidden="true"
          style={{
            background: '#000',
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.9,
            }}
          >
            <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true">
              <path d="M1 1l14 8-14 8V1z" fill="#fff" />
            </svg>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
          {/* Timecode */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: 'var(--accent)',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'monospace',
              }}
            >
              5:26
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'monospace',
              }}
            >
              8:42
            </span>
          </div>
          {/* Tracks */}
          {[
            { label: 'Video', color: 'rgba(232,146,26,0.70)', width: '64%' },
            { label: 'Audio', color: 'rgba(99,102,241,0.65)', width: '80%' },
            { label: 'Title', color: 'rgba(34,197,94,0.60)', width: '35%' },
          ].map(track => (
            <div key={track.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  width: 32,
                  flexShrink: 0,
                  textAlign: 'right',
                  letterSpacing: '0.03em',
                }}
              >
                {track.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 10,
                  background: 'var(--surface-3)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: track.width,
                    background: track.color,
                    borderRadius: 3,
                  }}
                />
                {/* Playhead */}
                <div
                  style={{
                    position: 'absolute',
                    left: '64%',
                    top: 0,
                    width: 2,
                    height: '100%',
                    background: '#fff',
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chaos overlay cards — visible when chaosMode */}
      {chaosMode && (
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -10,
              right: -16,
              background: 'var(--surface-2)',
              border: '1px solid rgba(239,68,68,0.40)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              transform: 'rotate(4deg)',
              zIndex: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              minWidth: 148,
            }}
          >
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--danger-text)', margin: 0 }}>
              Invoice pending
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              boAt — ₹45,000 · 12 days overdue
            </p>
          </div>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 30,
              right: -20,
              background: 'var(--surface-2)',
              border: '1px solid rgba(245,158,11,0.40)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              transform: 'rotate(-3deg)',
              zIndex: 11,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              minWidth: 148,
            }}
          >
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--warning-text)', margin: 0 }}>
              TDS missing
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Form 16A — not yet received
            </p>
          </div>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: -8,
              left: -16,
              background: 'var(--surface-2)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              transform: 'rotate(2deg)',
              zIndex: 9,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              minWidth: 148,
            }}
          >
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--danger-text)', margin: 0 }}>
              Payment overdue
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Zomato — ₹11,200 · Net 30 passed
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── FrameContent ─────────────────────────────────────────────────────────────
function FrameContent({ frameIndex }) {
  const rm = pRM();
  const fr = FRAMES[frameIndex];
  return (
    <div style={{ width: '100%' }}>
      <div
        key={frameIndex}
        style={{
          animation: rm ? 'none' : 'v3framein 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        <p
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.15,
            marginBottom: 'var(--space-6)',
            whiteSpace: 'pre-line',
          }}
        >
          {fr.headline}
        </p>
        <fr.Visual />
      </div>
      <style>{`@keyframes v3framein { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }`}</style>
    </div>
  );
}

// ── Act2Reality ───────────────────────────────────────────────────────────────
export function Act2Reality() {
  const sectionRef = useRef(null);
  const progress = useScrollProgress(sectionRef);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  const frameIndex = Math.min(6, Math.floor(progress * 7));
  const rm = pRM();

  return (
    <div style={{ background: 'var(--bg)' }}>
      {/* Section headline — outside sticky */}
      <div
        style={{
          textAlign: 'center',
          padding: 'var(--space-20) var(--space-6) var(--space-12)',
          background: 'var(--bg)',
        }}
      >
        <R>
          <p className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
            THE HIDDEN JOB
          </p>
          <h2 className="display" style={{ margin: '0 0 var(--space-4)' }}>
            You made the content.<br />
            <em>Now do the rest.</em>
          </h2>
          <p
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--text-muted)',
              marginTop: 'var(--space-4)',
              margin: 0,
            }}
          >
            Every creator we talked to had the same story.
          </p>
        </R>
      </div>

      {/* Sticky scroll section */}
      <div
        ref={sectionRef}
        id="act2"
        style={{ height: isMobile ? 'auto' : '480vh', position: 'relative' }}
      >
        {/* Desktop sticky view */}
        {!isMobile && (
          <div
            style={{
              position: 'sticky',
              top: 0,
              height: '100vh',
              overflow: 'hidden',
              display: 'flex',
              background: 'var(--bg)',
            }}
          >
            <Noise />

            {/* Red tinge overlay that grows with progress */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(239,68,68,${Math.min(0.06, progress * 0.09).toFixed(4)}) 0%, transparent 70%)`,
                transition: rm ? 'none' : 'background 0.3s ease',
              }}
            />

            {/* LEFT PANEL 42% — Video editor card */}
            <div
              style={{
                width: '42%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-8)',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <VideoEditorCard chaosMode={frameIndex === 6} />
            </div>

            {/* RIGHT PANEL 58% — Frame content */}
            <div
              style={{
                width: '58%',
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--space-8)',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <FrameContent frameIndex={frameIndex} progress={progress} />
            </div>

            {/* Progress dots — bottom center */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: 'var(--space-6)',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 'var(--space-2)',
                zIndex: 10,
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  style={{
                    width: i === frameIndex ? 24 : 8,
                    height: 8,
                    borderRadius: 'var(--radius-full)',
                    background: i === frameIndex ? 'var(--accent)' : 'var(--surface-3)',
                    transition: rm ? 'none' : 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mobile: 7 vertical cards */}
        {isMobile && (
          <div
            style={{
              padding: '0 var(--space-4) var(--space-12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            {FRAMES.map((fr, i) => (
              <R key={i} delay={i * 60}>
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-5)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: 'var(--space-3)',
                      marginTop: 0,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {fr.headline}
                  </p>
                  <fr.Visual />
                </div>
              </R>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



// ─── PipelineSteps (internal to Act3) ───────────────────────────────────────

const PIPELINE = [
  { num: '①', label: 'INVOICE',  status: 'Generated',  outcome: '₹1,18,000'  },
  { num: '②', label: 'PAYMENT',  status: 'Tracked',    outcome: 'In 3 days'  },
  { num: '③', label: 'GST',      status: 'Calculated', outcome: '₹18,000'    },
  { num: '④', label: 'TDS',      status: 'Recorded',   outcome: '₹10,000'    },
  { num: '⑤', label: 'REPORTS',  status: 'Ready',      outcome: 'ITR-ready'  },
];

function PipelineSteps() {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        width: 'fit-content',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        {PIPELINE.map((step, i) => (
          <R key={step.label} delay={i * 80}>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--space-4)' }}>
              {/* Left connector line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 'var(--radius-full)',
                  background: 'var(--accent)', flexShrink: 0,
                  marginTop: 'var(--space-4)',
                }} aria-hidden="true"/>
                {i < PIPELINE.length - 1 && (
                  <div style={{
                    width: 1,
                    flex: 1,
                    background: 'var(--border-2)',
                    minHeight: 'var(--space-8)',
                  }} aria-hidden="true"/>
                )}
              </div>
              {/* Card */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-4) var(--space-5)',
                marginBottom: i < PIPELINE.length - 1 ? 'var(--space-3)' : 0,
                minWidth: 220,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-full)',
                    background: 'var(--accent)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 'var(--text-lg)', flexShrink: 0,
                    color: '#fff', fontWeight: 700,
                  }} aria-hidden="true">
                    {step.num}
                  </div>
                  <span className="label" style={{ color: 'var(--text-muted)' }}>{step.label}</span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', margin: '0 0 var(--space-2)' }}>
                  → {step.status}
                </p>
                <p style={{
                  fontSize: 'var(--text-sm)', fontWeight: 700,
                  color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                  fontVariantNumeric: 'tabular-nums', margin: 0,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', background: 'var(--success)', display: 'inline-block', flexShrink: 0 }} aria-hidden="true"/>
                  {step.outcome}
                </p>
              </div>
            </div>
          </R>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-3)',
      flexWrap: 'wrap',
      position: 'relative',
      zIndex: 1,
      maxWidth: 960,
      margin: '0 auto',
    }}>
      {PIPELINE.map((step, i) => (
        <React.Fragment key={step.label}>
          <R delay={i * 80}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-4) var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-2)',
              minWidth: 130,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-full)',
                background: 'var(--accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 'var(--text-lg)',
                color: '#fff', fontWeight: 700, flexShrink: 0,
              }} aria-hidden="true">
                {step.num}
              </div>
              <span className="label" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{step.label}</span>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', margin: 0, textAlign: 'center' }}>
                → {step.status}
              </p>
              <p style={{
                fontSize: 'var(--text-sm)', fontWeight: 700,
                color: 'var(--success-text)', display: 'flex', alignItems: 'center',
                gap: 'var(--space-1)', fontVariantNumeric: 'tabular-nums', margin: 0,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 'var(--radius-full)',
                  background: 'var(--success)', display: 'inline-block', flexShrink: 0,
                }} aria-hidden="true"/>
                {step.outcome}
              </p>
            </div>
          </R>
          {i < PIPELINE.length - 1 && (
            <div aria-hidden="true" style={{
              width: 24, height: 1,
              borderTop: '1px dashed var(--border-2)',
              flexShrink: 0,
            }}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Act 3 ───────────────────────────────────────────────────────────────────

export function Act3TurningPoint() {
  return (
    <section style={{
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
      padding: 'var(--space-20) var(--space-6)',
    }}>
      {/* Warm glow returns */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(232,146,26,0.07) 0%, transparent 70%)',
      }}/>

      {/* The pause headline */}
      <div style={{
        textAlign: 'center', maxWidth: 640,
        margin: '0 auto var(--space-16)', position: 'relative', zIndex: 1,
      }}>
        <R>
          <h2 className="display" style={{ fontSize: 'clamp(38px,4vw,58px)' }}>
            What if all of this<br/><em>just... flowed?</em>
          </h2>
        </R>
        <R delay={150}>
          <div aria-hidden="true" style={{
            width: 80, height: 2, background: 'var(--accent)',
            margin: 'var(--space-6) auto', borderRadius: 2,
          }}/>
        </R>
        <R delay={250}>
          <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Every task that used to pile up — handled automatically.<br/>
            You send the invoice. CreatiFlow does the rest.
          </p>
        </R>
      </div>

      {/* Pipeline */}
      <PipelineSteps/>

      {/* Social proof quote */}
      <R delay={200}>
        <blockquote style={{
          textAlign: 'center', maxWidth: 600,
          margin: 'var(--space-16) auto 0',
          position: 'relative', zIndex: 1,
        }}>
          <p className="display" style={{
            fontSize: 'clamp(22px,2.2vw,32px)', fontStyle: 'italic',
            color: 'var(--text-primary)', lineHeight: 1.4,
            marginBottom: 'var(--space-4)',
          }}>
            "I haven't thought about invoicing in 3 months. It just happens."
          </p>
          <footer style={{
            fontSize: 'var(--text-sm)', color: 'var(--text-muted)',
            letterSpacing: '0.04em', textTransform: 'uppercase', fontStyle: 'normal',
          }}>
            — Riya M., Tech Creator · 220K Subscribers
          </footer>
        </blockquote>
      </R>

      {/* Mini CTA */}
      <R delay={300}>
        <div style={{ textAlign: 'center', marginTop: 'var(--space-10)' }}>
          <a
            href="#act4"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-5)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-sm)', color: 'var(--text-body)',
              textDecoration: 'none', cursor: 'pointer',
            }}
          >
            See how it works <ArrowRight size={14} aria-hidden="true"/>
          </a>
        </div>
      </R>
    </section>
  );
}

// ─── Journey data + components (Act 4) ───────────────────────────────────────

const JOURNEY = [
  {
    num: '01', icon: Briefcase, color: 'var(--info, #3B82F6)',
    label: 'BRAND DEAL',
    title: 'Mamaearth DMs Riya.',
    desc: 'She logs the deal in 10 seconds. Pipeline updated.',
    stat: '₹1,18,000 deal',
    statColor: 'var(--accent)',
  },
  {
    num: '02', icon: FileText, color: 'var(--accent)',
    label: 'INVOICE SENT',
    title: 'Invoice sent. In 30 seconds.',
    desc: "Rule 46-compliant PDF. Mamaearth's finance team gets exactly what they need.",
    stat: 'GST auto-calculated',
    statColor: 'var(--success-text)',
  },
  {
    num: '03', icon: TrendingDown, color: 'var(--danger)',
    label: 'TDS LOGGED',
    title: '₹11,800 TDS deducted.',
    desc: 'CreatiFlow records it before Riya even checks her account.',
    stat: 'Form 16A: Awaiting',
    statColor: 'var(--warning-text)',
  },
  {
    num: '04', icon: IndianRupee, color: 'var(--success)',
    label: 'PAYMENT IN',
    title: '₹1,06,200 hits her account.',
    desc: 'Income auto-logged. P&L updated. Running total current.',
    stat: 'No spreadsheet needed',
    statColor: 'var(--success-text)',
  },
  {
    num: '05', icon: Calendar, color: 'var(--warning)',
    label: 'TAX HANDLED',
    title: 'Sep 15 arrives.',
    desc: 'CreatiFlow already calculated her Q3 advance tax. She pays ₹18,400. Zero penalty.',
    stat: '14-day reminder sent',
    statColor: 'var(--accent)',
  },
  {
    num: '06', icon: Download, color: 'var(--success)',
    label: 'CA EXPORT',
    title: 'March. Her CA opens the ZIP.',
    desc: '20 minutes later, ITR filed. The cleanest file her CA has seen all season.',
    stat: 'ITR-ready export',
    statColor: 'var(--success-text)',
  },
];

function JourneyStep({ step, reverse }) {
  const [hovered, setHovered] = React.useState(false);
  const Icon = step.icon;
  const rm = pRM();

  const iconCircleStyle = {
    width: 56, height: 56, borderRadius: 'var(--radius-full)',
    background: `color-mix(in srgb, ${step.color} 15%, transparent)`,
    border: `1.5px solid color-mix(in srgb, ${step.color} 30%, transparent)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: rm ? 'none' : 'box-shadow 200ms ease',
    boxShadow: hovered && !rm ? `0 0 20px color-mix(in srgb, ${step.color} 30%, transparent)` : 'none',
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: reverse ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 'var(--space-8)',
        paddingBottom: 'var(--space-12)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: Big number + icon */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'var(--space-3)', flexShrink: 0,
        minWidth: 80,
      }}>
        <span aria-hidden="true" style={{
          fontSize: 'clamp(64px,6vw,96px)', fontWeight: 800,
          color: 'var(--surface-3)', lineHeight: 1, userSelect: 'none',
        }}>
          {step.num}
        </span>
        <div style={iconCircleStyle}>
          <Icon size={24} color={step.color} aria-hidden="true"/>
        </div>
      </div>

      {/* Right: Content */}
      <div style={{ flex: 1 }}>
        <p className="label" style={{
          color: 'var(--text-muted)', marginBottom: 'var(--space-2)',
        }}>
          {step.label}
        </p>
        <h3 style={{
          fontSize: 'var(--text-xl)', fontWeight: 700,
          color: 'var(--text-primary)', marginBottom: 'var(--space-2)',
          lineHeight: 1.3,
        }}>
          {step.title}
        </h3>
        <p style={{
          fontSize: 'var(--text-base)', color: 'var(--text-body)',
          lineHeight: 1.65, marginBottom: 'var(--space-4)',
        }}>
          {step.desc}
        </p>
        <span style={{
          display: 'inline-block',
          padding: 'var(--space-1) var(--space-3)',
          borderRadius: 'var(--radius-full)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          fontSize: 'var(--text-sm)', fontWeight: 600,
          color: step.statColor,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {step.stat}
        </span>
      </div>
    </div>
  );
}

// ─── Act 4 ───────────────────────────────────────────────────────────────────

export function Act4Journey({ id }) {
  const [isMobile] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  return (
    <section
      id={id}
      style={{
        background: 'var(--bg)',
        padding: 'var(--space-20) var(--space-6)',
        position: 'relative',
      }}
    >
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 80%, rgba(59,130,246,0.025) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <R>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
            <p className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
              ONE FLOW
            </p>
            <h2 className="display">
              From brand deal<br/><em>to filed taxes.</em>
            </h2>
            <p style={{
              fontSize: 'var(--text-lg)', color: 'var(--text-muted)',
              marginTop: 'var(--space-4)',
            }}>
              Meet Riya — 220K subscribers, 8 brand deals a month.
            </p>
          </div>
        </R>

        {/* Journey steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {JOURNEY.map((step, i) => (
            <R key={step.num} delay={i * 50}>
              <JourneyStep step={step} reverse={!isMobile && i % 2 === 1} />
            </R>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Impact data + Act 5 ─────────────────────────────────────────────────────

const IMPACT = [
  {
    icon: FileText, color: 'var(--accent)',
    tag: 'Most used',
    emotion: 'Professional invoices. Instantly.',
    outcome: 'Send a PDF that brands accept first try. No resubmissions. Brands pay faster.',
    proof: '₹0 lost to rejected invoices',
  },
  {
    icon: TrendingDown, color: 'var(--danger-text)',
    tag: 'Saves ₹ at ITR',
    emotion: 'Never leave money on the table.',
    outcome: '₹40,000 in TDS credits the average creator misses every year. Every rupee tracked.',
    proof: '₹40,000 recovered at ITR',
  },
  {
    icon: Calendar, color: 'var(--warning-text)',
    tag: 'No March shock',
    emotion: "March arrives. You're ready.",
    outcome: 'Quarterly instalments from your real income. 14-day reminders. Zero penalties.',
    proof: '₹0 in late fees',
  },
  {
    icon: Briefcase, color: 'var(--info-text, #3B82F6)',
    tag: 'Pipeline to payment',
    emotion: 'No more awkward follow-ups.',
    outcome: 'Every deal tracked from inquiry to paid. Payment in — income auto-logged.',
    proof: 'Every deal visible',
  },
  {
    icon: BarChart2, color: '#8B5CF6',
    tag: 'Full picture',
    emotion: 'Know exactly what you earned.',
    outcome: 'AdSense, brand deals, affiliate — every source, one view. Real P&L, always current.',
    proof: 'No year-end surprises',
  },
  {
    icon: Download, color: 'var(--success-text)',
    tag: 'ITR-ready',
    emotion: 'Give your CA a ZIP, not a headache.',
    outcome: 'Full annual summary — invoices, TDS, expenses. CA meeting: 2 hours → 20 minutes.',
    proof: 'Save ₹14,000 in CA fees',
  },
];

function ImpactCard({ card, delay }) {
  const [hovered, setHovered] = React.useState(false);
  const rm = pRM();
  const Icon = card.icon;

  const glassStyle = {
    background: 'rgba(14,16,24,0.7)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: hovered && !rm
      ? '1px solid rgba(232,146,26,0.25)'
      : '1px solid rgba(255,255,255,0.07)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-6)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 16px 40px rgba(0,0,0,0.3)',
    transform: hovered && !rm ? 'scale(1.02)' : 'scale(1)',
    transition: rm ? 'none' : 'transform 200ms ease, border-color 200ms ease',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  };

  return (
    <R delay={delay}>
      <div
        style={glassStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Top row: icon + tag */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 'var(--space-3)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: `color-mix(in srgb, ${card.color} 20%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={18} color={card.color} aria-hidden="true"/>
          </div>
          <span style={{
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            padding: 'var(--space-1) var(--space-3)',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}>
            {card.tag}
          </span>
        </div>

        {/* Emotion headline */}
        <p style={{
          fontSize: 'var(--text-md)', fontWeight: 700,
          color: 'var(--text-primary)', lineHeight: 1.3, margin: 0,
        }}>
          {card.emotion}
        </p>

        {/* Outcome */}
        <p style={{
          fontSize: 'var(--text-sm)', color: 'var(--text-body)',
          lineHeight: 1.65, margin: 0, flex: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {card.outcome}
        </p>

        {/* Proof */}
        <p style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
          fontSize: 'var(--text-sm)', fontWeight: 600,
          color: 'var(--success-text)', margin: 0,
          fontVariantNumeric: 'tabular-nums',
        }}>
          <Check size={12} aria-hidden="true"/>
          {card.proof}
        </p>
      </div>
    </R>
  );
}

export function Act5Impact() {
  return (
    <section style={{
      background: 'var(--surface)',
      padding: 'var(--space-20) var(--space-6)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Success-green tinge overlay */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(16,185,129,0.04) 0%, transparent 70%)',
      }}/>

      <div style={{ maxWidth: 980, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Section header */}
        <R>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            <p className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
              WHAT YOU GET
            </p>
            <h2 className="display">
              Less stress.<br/><em>More money back.</em>
            </h2>
            <p style={{
              fontSize: 'var(--text-lg)', color: 'var(--text-muted)',
              marginTop: 'var(--space-4)', maxWidth: 520, margin: 'var(--space-4) auto 0',
            }}>
              Six tools, one platform. Every feature built around an outcome creators actually care about.
            </p>
          </div>
        </R>

        {/* Glass cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))',
          gap: 'var(--space-5)',
        }}>
          {IMPACT.map((card, i) => (
            <ImpactCard key={card.tag} card={card} delay={i * 60}/>
          ))}
        </div>

        {/* Mid-page CTA */}
        <R delay={100}>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-16)' }}>
            <Link
              to="/register"
              style={{
                display: 'inline-block',
                padding: 'var(--space-4) var(--space-10)',
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: 'var(--text-md)',
                textDecoration: 'none',
              }}
            >
              Start your free trial →
            </Link>
            <p style={{
              fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
              marginTop: 'var(--space-3)',
            }}>
              28-day trial · No credit card · Cancel anytime
            </p>
          </div>
        </R>
      </div>
    </section>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ACT 6 — Universe (SVG network diagram)
// ─────────────────────────────────────────────────────────────────────────────

const UNIVERSE_NODES = [
  { label: 'Brand Deals', color: '#3B82F6',  angle: 0      },
  { label: 'Invoices',    color: '#E8921A',  angle: 51.4   },
  { label: 'Payments',   color: '#22C55E',  angle: 102.8  },
  { label: 'GST',        color: '#F59E0B',  angle: 154.2  },
  { label: 'TDS',        color: '#EF4444',  angle: 205.7  },
  { label: 'Analytics',  color: '#8B5CF6',  angle: 257.1  },
  { label: 'CA Export',  color: '#10B981',  angle: 308.5  },
];

const PULSE_KEYFRAMES = `
@keyframes cfPulse {
  0%,100% { transform: scale(1); }
  50%      { transform: scale(1.03); }
}
@keyframes cfLineReveal {
  to { stroke-dashoffset: 0; }
}
`;

function UniverseNetwork() {
  const containerRef = useRef(null);
  const [linesVisible, setLinesVisible] = useState(false);
  const reducedMotion = pRM();
  const size = typeof window !== 'undefined' && window.innerWidth < 400 ? 'small' : 'normal';
  const containerPx = size === 'small' ? Math.min(window.innerWidth * 0.9, 340) : 560;
  const radiusPct = size === 'small' ? 0.38 : 0.42;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLinesVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cx = containerPx / 2;
  const cy = containerPx / 2;
  const radius = containerPx * radiusPct;
  const nodeSize = size === 'small' ? 40 : 48;

  return (
    <>
      <style>{PULSE_KEYFRAMES}</style>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: containerPx,
          height: containerPx,
          margin: '0 auto',
        }}
        role="img"
        aria-label="Network diagram showing CreatiFlow connecting brand deals, invoices, payments, GST, TDS, analytics, and CA export"
      >
        {/* SVG connector lines */}
        <svg
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
          }}
          viewBox={`0 0 ${containerPx} ${containerPx}`}
        >
          {UNIVERSE_NODES.map((node, i) => {
            const rad = (node.angle * Math.PI) / 180;
            const nx = cx + radius * Math.cos(rad);
            const ny = cy + radius * Math.sin(rad);
            return (
              <line
                key={node.label}
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke={node.color}
                strokeOpacity={0.3}
                strokeWidth={1.5}
                strokeDasharray={200}
                strokeDashoffset={linesVisible && !reducedMotion ? 200 : 0}
                style={
                  linesVisible && !reducedMotion
                    ? {
                        animation: `cfLineReveal 0.6s ease ${i * 60}ms forwards`,
                      }
                    : undefined
                }
              />
            );
          })}
        </svg>

        {/* Center node */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 18,
            color: '#fff',
            zIndex: 2,
            boxShadow: '0 0 32px rgba(232,146,26,0.35)',
            animation: reducedMotion ? 'none' : 'cfPulse 3s ease-in-out infinite',
          }}
        >
          CF
        </div>

        {/* Orbit nodes */}
        {UNIVERSE_NODES.map((node) => {
          const rad = (node.angle * Math.PI) / 180;
          const nx = cx + radius * Math.cos(rad);
          const ny = cy + radius * Math.sin(rad);
          return (
            <div
              key={node.label}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: nx - nodeSize / 2,
                top: ny - nodeSize / 2,
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: nodeSize,
                  height: nodeSize,
                  borderRadius: '50%',
                  background: `${node.color}22`,
                  border: `1.5px solid ${node.color}66`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                  marginTop: 2,
                }}
              >
                {node.label}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Act6Universe() {
  return (
    <section
      role="region"
      aria-label="The bigger picture — everything connected"
      style={{
        background: 'var(--bg)',
        padding: 'var(--space-20) var(--space-6)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Noise />

      {/* Starfield radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(232,146,26,0.04) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <R>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <p
            className="label"
            style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}
          >
            THE BIGGER PICTURE
          </p>
          <h2 className="display">
            Every part of your business,
            <br />
            <em>talking to each other.</em>
          </h2>
        </div>
      </R>

      <R delay={150}>
        <UniverseNetwork />
      </R>

      <R delay={300}>
        <p
          className="display"
          style={{
            textAlign: 'center',
            fontSize: 'clamp(22px, 2.2vw, 34px)',
            color: 'var(--text-muted)',
            marginTop: 'var(--space-12)',
            fontStyle: 'italic',
          }}
        >
          "Your creative business. Finally working together."
        </p>
      </R>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACT 7 — Return (cinematic bookend — mirrors Act 1)
// ─────────────────────────────────────────────────────────────────────────────

const RESOLVED_FRAGMENTS = [
  {
    text: 'TAX INVOICE · #INV-0047 · PAID ✓',
    style: { top: '8%', left: '-2%' },
    badgeColor: 'rgba(34,197,94,0.18)',
    badgeText: 'PAID ✓',
    badgeTextColor: '#22C55E',
  },
  {
    text: 'TDS Tracked · ₹40,000 · ✓ All recorded',
    style: { top: '12%', right: '-2%' },
    badgeColor: 'rgba(34,197,94,0.18)',
    badgeText: '✓ All recorded',
    badgeTextColor: '#22C55E',
  },
  {
    text: 'Q3 Advance Tax · Sep 15 · PAID ✓',
    style: { bottom: '14%', left: '-1%' },
    badgeColor: 'rgba(34,197,94,0.18)',
    badgeText: 'PAID ✓',
    badgeTextColor: '#22C55E',
  },
  {
    text: 'CA Export · Annual Report · Ready ✓',
    style: { bottom: '10%', right: '-1%' },
    badgeColor: 'rgba(34,197,94,0.18)',
    badgeText: 'Ready ✓',
    badgeTextColor: '#22C55E',
  },
];

const MAGNETIC_KEYFRAMES = `
@keyframes cfMagneticReset {
  to { transform: translate(0,0); }
}
`;

function MagneticCTA() {
  const reducedMotion = pRM();
  const btnRef = useRef(null);

  const handleMouseMove = (e) => {
    if (reducedMotion || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    const tx = (relX / rect.width) * 12;
    const ty = (relY / rect.height) * 8;
    btnRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
    btnRef.current.style.transition = 'transform 80ms linear';
  };

  const handleMouseLeave = () => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = 'translate(0,0)';
    btnRef.current.style.transition = 'transform 200ms ease';
  };

  return (
    <>
      <style>{MAGNETIC_KEYFRAMES}</style>
      <Link
        to="/register"
        ref={btnRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--accent-hover)';
        }}
        style={{
          display: 'inline-block',
          padding: 'var(--space-4) var(--space-12)',
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          fontWeight: 700,
          fontSize: 'var(--text-md)',
          textDecoration: 'none',
          transition: 'background var(--duration-fast), transform 200ms ease',
          willChange: 'transform',
        }}
      >
        Start Creating →
      </Link>
    </>
  );
}

export function Act7Return() {
  return (
    <section
      role="region"
      aria-label="Start creating — CreatiFlow handles the rest"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: 'var(--space-24) var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        background:
          'radial-gradient(ellipse 90% 80% at 50% 60%, rgba(232,146,26,0.08) 0%, transparent 65%), var(--bg)',
      }}
    >
      <Noise />

      {/* Gradient mask at top — blends with Act 6 */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(to bottom, var(--bg) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Resolved fragment cards — static, very dim */}
      {RESOLVED_FRAGMENTS.map((frag, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            ...frag.style,
            opacity: 0.12,
            pointerEvents: 'none',
            zIndex: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{frag.text}</span>
          <span
            style={{
              background: frag.badgeColor,
              color: frag.badgeTextColor,
              borderRadius: 'var(--radius-sm)',
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 6px',
            }}
          >
            {frag.badgeText}
          </span>
        </div>
      ))}

      {/* Center content */}
      <div
        style={{
          textAlign: 'center',
          zIndex: 2,
          position: 'relative',
          padding: '0 var(--space-6)',
          maxWidth: 640,
          margin: '0 auto',
        }}
      >
        <R>
          <h2 className="display">
            Spend your energy
            <br />
            <em>creating.</em>
          </h2>
        </R>

        <R delay={100}>
          <p
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--text-body)',
              maxWidth: 420,
              margin: 'var(--space-4) auto var(--space-8)',
              lineHeight: 1.6,
            }}
          >
            We'll take care of the business behind it.
          </p>
        </R>

        <R delay={200}>
          <MagneticCTA />
        </R>

        <R delay={300}>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
              marginTop: 'var(--space-4)',
            }}
          >
            Join 200+ Indian creators running their business properly.
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-disabled)',
              marginTop: 'var(--space-2)',
            }}
          >
            28-day trial · No credit card · Cancel anytime · Data stored in India
          </p>
        </R>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V3Testimonials
// ─────────────────────────────────────────────────────────────────────────────

const TESTI = [
  {
    quote:
      "I haven't thought about invoicing in 3 months. It just happens. I get the confirmation email and that's the last I hear of it.",
    name: 'Priya R.',
    role: 'Tech Creator · 220K subs',
    initials: 'PR',
    avatarBg: '#8B5CF6',
    badge: '4 min → 0 min per invoice',
    featured: false,
  },
  {
    quote:
      "I missed advance tax for two years straight. In March I owed ₹1.8 lakhs plus penalties. That was the last time. The tax planner alone is worth every rupee.",
    name: 'Arjun S.',
    role: 'Finance Creator · 95K subs',
    initials: 'AS',
    avatarBg: 'var(--accent)',
    badge: '₹1.8L penalty → ₹0',
    featured: true,
  },
  {
    quote:
      "My CA used to charge ₹18,000 in March just to sort through my records. Last year I handed him the ZIP. He called back in 20 minutes. Filing cost ₹4,000.",
    name: 'Meera K.',
    role: 'Lifestyle Creator · 210K subs',
    initials: 'MK',
    avatarBg: '#10B981',
    badge: '₹18,000 CA bill → ₹4,000',
    featured: false,
  },
];

export function V3Testimonials() {
  return (
    <section
      aria-label="What creators say"
      style={{
        background: 'var(--surface)',
        padding: 'var(--space-20) var(--space-6)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <R>
          <p
            className="label"
            style={{
              color: 'var(--accent)',
              textAlign: 'center',
              marginBottom: 'var(--space-4)',
            }}
          >
            WHAT CREATORS SAY
          </p>
          <h2
            className="display"
            style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}
          >
            Real creators. Real results.
          </h2>
        </R>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-5)',
          }}
        >
          {TESTI.map((t, i) => (
            <R key={t.name} delay={i * 80}>
              <div
                style={{
                  background: 'rgba(14,16,24,0.6)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: t.featured
                    ? '1px solid rgba(232,146,26,0.4)'
                    : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* Opening quote mark */}
                <div
                  aria-hidden="true"
                  style={{
                    fontSize: 48,
                    lineHeight: 1,
                    color: 'var(--accent)',
                    opacity: 0.3,
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    marginBottom: 'calc(var(--space-2) * -1)',
                    userSelect: 'none',
                  }}
                >
                  &ldquo;
                </div>

                {/* Quote */}
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-body)',
                    lineHeight: 1.75,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {t.quote}
                </p>

                {/* Outcome badge — shown above avatar row */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignSelf: 'flex-start',
                    background: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 10px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {t.badge}
                </div>

                {/* Avatar + name */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: t.avatarBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {t.name}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            </R>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V3Pricing
// ─────────────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Basic',
    monthly: 0,
    annual: 0,
    isFree: true,
    highlight: false,
    payback: null,
    features: [
      '5 invoices/month (watermarked)',
      '10 TDS entries',
      '3 templates',
      '2 compliance deadlines',
    ],
  },
  {
    name: 'Starter',
    monthly: 299,
    annual: 249,
    isFree: false,
    highlight: false,
    payback: 'Recover in: 1 untracked TDS deduction',
    features: [
      'Unlimited invoices',
      'All 7 templates',
      'Unlimited TDS tracking',
      'Email reminders',
      'Expense tracker',
    ],
  },
  {
    name: 'Pro',
    monthly: 599,
    annual: 499,
    isFree: false,
    highlight: true,
    payback: 'Recover in: 1.5 days of saved admin time',
    features: [
      'Everything in Starter',
      'Advance tax planner',
      'P&L dashboard',
      'CA annual export',
    ],
  },
  {
    name: 'Business',
    monthly: 1499,
    annual: 1249,
    isFree: false,
    highlight: false,
    payback: 'Recover in: 1 hour of CA time saved',
    features: [
      'Everything in Pro',
      '5 creators (multi-seat)',
      'White-label invoices',
      'Priority support',
    ],
  },
];

const TRUST_BADGES = [
  { icon: Lock,         label: 'AES-256' },
  { icon: Shield,       label: 'Data in India' },
  { icon: RefreshCw,    label: 'Cancel anytime' },
  { icon: Calendar,     label: '28-day trial' },
  { icon: IndianRupee,  label: 'No hidden fees' },
];

function PricingPlanCard({ plan, price, annualSaving, isAnnual }) {
  return (
    <div
      style={{
        background: plan.highlight ? 'var(--accent-dim)' : 'rgba(14,16,24,0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${plan.highlight ? 'var(--accent)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        position: 'relative',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {plan.highlight && (
        <div
          aria-label="Most popular plan"
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent)',
            color: '#fff',
            padding: '2px var(--space-3)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Most Popular
        </div>
      )}

      <h3
        style={{
          fontSize: 'var(--text-md)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 var(--space-2)',
        }}
      >
        {plan.name}
      </h3>

      {/* Price */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-1)',
        }}
      >
        {plan.isFree ? (
          <span
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Free
          </span>
        ) : (
          <>
            {isAnnual && (
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-disabled)',
                  textDecoration: 'line-through',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ₹{plan.monthly}
              </span>
            )}
            <span
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ₹{price}
            </span>
            <span
              style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}
            >
              /month
            </span>
          </>
        )}
      </div>

      {isAnnual && !plan.isFree ? (
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--success-text)',
            fontWeight: 600,
            marginBottom: 'var(--space-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Save ₹{annualSaving.toLocaleString('en-IN')}/year
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-3)' }} />
      )}

      {/* Payback badge */}
      {plan.payback ? (
        <div
          style={{
            background: 'var(--success-dim)',
            color: 'var(--success-text)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            padding: '3px 8px',
            display: 'inline-block',
            marginBottom: 'var(--space-3)',
            alignSelf: 'flex-start',
          }}
        >
          {plan.payback}
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-3)' }} />
      )}

      {/* Features */}
      <ul
        style={{
          margin: '0 0 var(--space-5)',
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          flex: 1,
        }}
      >
        {plan.features.map((f) => (
          <li
            key={f}
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-body)',
              display: 'flex',
              gap: 'var(--space-2)',
              alignItems: 'flex-start',
            }}
          >
            <Check
              size={14}
              aria-hidden="true"
              style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }}
            />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        to="/register"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = plan.highlight
            ? 'var(--accent-hover)'
            : 'var(--surface-2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = plan.highlight
            ? 'var(--accent)'
            : 'transparent';
        }}
        style={{
          display: 'block',
          padding: 'var(--space-2) var(--space-4)',
          textAlign: 'center',
          background: plan.highlight ? 'var(--accent)' : 'transparent',
          color: plan.highlight ? '#fff' : 'var(--text-body)',
          border: `1px solid ${plan.highlight ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          transition: 'background var(--duration-fast)',
          textDecoration: 'none',
        }}
      >
        {plan.isFree ? 'Start free' : 'Start free trial'}
      </Link>
    </div>
  );
}

export function V3Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      id="pricing"
      aria-label="Pricing plans"
      style={{
        background: 'var(--surface)',
        padding: 'var(--space-20) var(--space-6)',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        <R>
          <p
            className="label"
            style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}
          >
            PRICING
          </p>
          <h2 className="display" style={{ marginBottom: 'var(--space-3)' }}>
            Simple pricing.
            <br />
            No surprises.
          </h2>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-6)',
              lineHeight: 1.6,
            }}
          >
            Less than one CA consultation. Available every day of the year.
          </p>

          {/* Annual / Monthly toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              padding: 3,
              marginBottom: 'var(--space-8)',
              gap: 2,
            }}
          >
            {[
              { label: 'Monthly', val: false },
              { label: 'Annual (2m free)', val: true },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => setAnnual(opt.val)}
                aria-pressed={annual === opt.val}
                style={{
                  padding: 'var(--space-1) var(--space-4)',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition:
                    'background var(--duration-fast), color var(--duration-fast)',
                  background: annual === opt.val ? 'var(--accent)' : 'transparent',
                  color: annual === opt.val ? '#fff' : 'var(--text-muted)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </R>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-5)',
          }}
        >
          {PLANS.map((plan, pi) => {
            const price = annual ? plan.annual : plan.monthly;
            const annualSaving = Math.round((plan.monthly - plan.annual) * 12);
            return (
              <R key={plan.name} delay={pi * 80}>
                <PricingPlanCard
                  plan={plan}
                  price={price}
                  annualSaving={annualSaving}
                  isAnnual={annual}
                />
              </R>
            );
          })}
        </div>

        <p
          style={{
            marginTop: 'var(--space-5)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}
        >
          {annual ? 'Billed annually · ' : ''}Annual plans get 2 months free · No credit
          card for trial
        </p>

        {/* Trust badges */}
        <R>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 'var(--space-5)',
              marginTop: 'var(--space-8)',
              paddingTop: 'var(--space-8)',
              borderTop: '1px solid var(--border)',
            }}
          >
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--text-muted)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                }}
              >
                <Icon size={13} aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>
        </R>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V3FAQ
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_DATA = [
  {
    q: 'Do I need a CA to use CreatiFlow?',
    a: "No. CreatiFlow handles day-to-day GST invoicing, TDS tracking, and advance tax planning automatically. Your CA still files your ITR once a year — but instead of spending 2 hours sorting your records, they get a clean ZIP file and you're done in 20 minutes.",
  },
  {
    q: 'I have a GSTIN. How do I set it up?',
    a: 'After signup, go to Settings → Tax Profile and enter your GSTIN, PAN, business address, and state. All invoices auto-populate from there.',
  },
  {
    q: "What if I don't have a GSTIN yet?",
    a: "You can use CreatiFlow to track income, TDS, and deals without a GSTIN. GST registration is mandatory once your turnover crosses ₹20 lakhs/year — we'll remind you when you're approaching that threshold.",
  },
  {
    q: 'Is my financial data safe?',
    a: 'All data is encrypted at rest (AES-256) and in transit (HTTPS). Servers are hosted in India. We never share your financial data with third parties. You can export or delete everything at any time.',
  },
  {
    q: 'What is the 28-day trial?',
    a: 'Full access to all Pro features for 28 days. No credit card required. You can upgrade to a paid plan anytime during or after the trial.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from Settings → Billing. Your subscription stays active until the end of the current billing period. No questions asked.',
  },
];

export function V3FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section
      id="faq"
      aria-label="Frequently asked questions"
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: 'var(--space-20) var(--space-6)',
      }}
    >
      <R>
        <h2
          className="display"
          style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}
        >
          Frequently asked questions
        </h2>
      </R>

      <R delay={80}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
        >
          {FAQ_DATA.map((item, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                aria-controls={`faq-answer-${i}`}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-4) var(--space-5)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: 'var(--space-4)',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {item.q}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 'var(--text-lg)',
                    flexShrink: 0,
                    lineHeight: 1,
                    display: 'inline-block',
                    transition: 'transform 280ms ease',
                    transform: openIndex === i ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}
                >
                  +
                </span>
              </button>
              <div
                id={`faq-answer-${i}`}
                role="region"
                style={{
                  maxHeight: openIndex === i ? '500px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height 280ms ease',
                }}
              >
                <p
                  style={{
                    padding: '0 var(--space-5) var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-body)',
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </R>

      {/* Contact line */}
      <R delay={160}>
        <p
          style={{
            textAlign: 'center',
            marginTop: 'var(--space-8)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}
        >
          Still have questions?{' '}
          <a
            href="mailto:hello@creatflow.in"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.textDecoration = 'underline')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.textDecoration = 'none')
            }
          >
            hello@creatflow.in
          </a>
        </p>
      </R>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V3Footer
// ─────────────────────────────────────────────────────────────────────────────

export function V3Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: 'var(--space-8) var(--space-6)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-6)',
        }}
      >
        {/* Left: logo + wordmark + tagline */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              background: 'var(--accent)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 14,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            C
          </div>
          <div>
            <span
              style={{
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                letterSpacing: '-0.01em',
                display: 'block',
              }}
            >
              CreatiFlow
            </span>
            <span
              style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}
            >
              Everything flows.
            </span>
          </div>
        </div>

        {/* Center: nav links */}
        <nav
          aria-label="Footer navigation"
          style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}
        >
          {['Privacy', 'Terms', 'Contact'].map((label) => (
            <a
              key={label}
              href="#"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'color var(--duration-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-body)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right: copyright */}
        <span
          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}
        >
          Made with ♥ for Indian creators · © 2025 CreatiFlow
        </span>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPageV3() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-body)' }}>
      {/* Skip link for keyboard/screen-reader users */}
      <a
        href="#v3-main"
        style={{
          position: 'absolute',
          top: -100,
          left: 'var(--space-4)',
          background: 'var(--accent)',
          color: '#fff',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          textDecoration: 'none',
          zIndex: 9999,
          transition: 'top var(--duration-fast)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.top = 'var(--space-4)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = '-100px';
        }}
      >
        Skip to main content
      </a>

      <Navbar />
      <div style={{ height: 72 }} aria-hidden="true" />

      <main id="v3-main">
        <Act1Dream />
        <Act2Reality />
        <Act3TurningPoint />
        <Act4Journey id="act4" />
        <Act5Impact />
        <Act6Universe />
        <Act7Return />
        <V3Testimonials />
        <V3Pricing />
        <V3FAQ />
      </main>

      <V3Footer />
    </div>
  );
}
