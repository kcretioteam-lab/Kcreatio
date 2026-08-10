import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, X, FileText, TrendingDown, Calendar, Briefcase, BarChart2, Download, Lock, Shield, RefreshCw, Check, Handshake, Minus, IndianRupee } from 'lucide-react';
import ChaosHero from '../components/hero/ChaosHero.jsx';
import { useTheme } from '../App.jsx';
import { useScrollProgress } from '../hooks/useScrollProgress.js';

// ── Scroll reveal hook ────────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ to, suffix = '', duration = 1600 }) {
  const [ref, visible] = useScrollReveal();
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [visible, to, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// ── Reveal wrapper ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, style: extra }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        ...extra,
      }}
    >
      {children}
    </div>
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
    ['#features', 'Features'],
    ['#how-it-works', 'How it Works'],
    ['#pricing', 'Pricing'],
  ];

  return (
    <div style={{
      position: 'fixed', top: 'var(--space-4)', left: '50%',
      transform: 'translateX(-50%)', zIndex: 200,
      width: 'calc(100% - var(--space-8))', maxWidth: 'min(960px, 100%)',
    }}>
      <header role="banner" style={{
        background: scrolled
          ? (theme === 'dark' ? 'rgba(14,16,24,0.92)' : 'rgba(255,255,255,0.92)')
          : (theme === 'dark' ? 'rgba(14,16,24,0.7)' : 'rgba(255,255,255,0.7)'),
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-full)',
        height: 52,
        display: 'flex', alignItems: 'center',
        padding: '0 var(--space-4)',
        justifyContent: 'space-between',
        transition: 'background var(--duration-standard)',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.12)' : 'none',
      }}>
        {/* Logo */}
        <Link to="/v2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}>
          <div aria-hidden="true" style={{
            width: 26, height: 26,
            background: 'linear-gradient(135deg, var(--accent) 0%, #c8711a 100%)',
            borderRadius: 7, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', flexShrink: 0,
          }}>C</div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)', letterSpacing: '-0.02em' }}>
            CreatiFlow
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav aria-label="Main navigation" style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
        }}>
          {navLinks.map(([href, label]) => (
            <a
              key={href}
              href={href}
              style={{
                padding: 'var(--space-1) var(--space-3)',
                color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontWeight: 500,
                borderRadius: 'var(--radius-full)',
                transition: 'background var(--duration-fast), color var(--duration-fast)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-body)'; }}
            >{label}</a>
          ))}
        </nav>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-muted)',
              transition: 'background var(--duration-fast)',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
          >
            {theme === 'dark'
              ? <Sun size={14} aria-hidden="true" />
              : <Moon size={14} aria-hidden="true" />
            }
          </button>

          <Link
            to="/login"
            style={{
              padding: 'var(--space-1) var(--space-3)',
              color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontWeight: 500,
              borderRadius: 'var(--radius-full)',
              textDecoration: 'none',
              transition: 'background var(--duration-fast), color var(--duration-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-body)'; }}
          >
            Sign in
          </Link>

          <Link
            to="/register"
            style={{
              padding: '6px var(--space-4)',
              background: 'var(--accent)', color: '#fff',
              borderRadius: 'var(--radius-full)', fontWeight: 600,
              fontSize: 'var(--text-sm)', whiteSpace: 'nowrap',
              textDecoration: 'none',
              transition: 'background var(--duration-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
          >
            Start free →
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            style={{
              width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)', cursor: 'pointer', color: 'var(--text-body)',
            }}
          >
            {menuOpen ? <X size={14} aria-hidden="true" /> : <Menu size={14} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div role="navigation" aria-label="Mobile navigation" style={{
          marginTop: 'var(--space-2)',
          background: theme === 'dark' ? 'rgba(14,16,24,0.97)' : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-3)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {navLinks.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontWeight: 500,
                borderRadius: 'var(--radius-md)', textDecoration: 'none',
              }}
            >{label}</a>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }} />
          <Link to="/login" onClick={() => setMenuOpen(false)} style={{
            padding: 'var(--space-3) var(--space-4)', color: 'var(--text-body)',
            fontSize: 'var(--text-base)', borderRadius: 'var(--radius-md)', textDecoration: 'none',
          }}>Sign in</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)} style={{
            padding: 'var(--space-3) var(--space-4)', background: 'var(--accent)',
            color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600,
            fontSize: 'var(--text-base)', textAlign: 'center',
            marginTop: 'var(--space-1)', textDecoration: 'none',
          }}>Start free trial</Link>
        </div>
      )}
    </div>
  );
}

// ── ProofBar ──────────────────────────────────────────────────────────────────
function ProofBar() {
  return (
    <Reveal>
      <div style={{
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: 'var(--space-5) var(--space-6)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          gap: 'var(--space-6)', flexWrap: 'wrap',
        }}>
          {[
            { counter: 200, suffix: '+', label: 'creators onboarded' },
            { counter: 30,  suffix: 's', label: 'to generate invoice' },
            { counter: 100, suffix: '%', label: 'GST compliant' },
            { counter: 4,   suffix: '.9★', label: 'average rating' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                fontSize: 'var(--text-xl)', fontWeight: 700,
                color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
              }}>
                <AnimatedCounter to={item.counter} suffix={item.suffix} duration={1400 + i * 100} />
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

// ── Frame visual sub-components ───────────────────────────────────────────────

function CardShell({ children, style: extra }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-5)',
      ...extra,
    }}>
      {children}
    </div>
  );
}

function FieldRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 'var(--text-xs)', fontWeight: 600,
        color: highlight === 'error' ? 'var(--danger)' : highlight === 'warn' ? 'var(--warning-text)' : 'var(--text-primary)',
      }}>{value}</span>
    </div>
  );
}

function FrameVisualUpload() {
  return (
    <CardShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }} aria-hidden="true">✓</div>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Upload complete</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Brand Collab v3.mp4 · 8 min 42 sec</div>
        </div>
      </div>
      <div style={{
        background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Resolution: 4K</span>
        <span>Size: 2.1 GB</span>
        <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>Published</span>
      </div>
    </CardShell>
  );
}

function FrameVisualInvoiceBlank() {
  return (
    <CardShell>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>TAX INVOICE</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>Draft</span>
      </div>
      {[
        ['Brand Name', 'REQUIRED', 'error'],
        ['GSTIN', 'REQUIRED', 'error'],
        ['Invoice No.', 'REQUIRED', 'error'],
        ['Amount', 'REQUIRED', 'error'],
        ['Place of Supply', 'REQUIRED', 'error'],
      ].map(([label, value, hl]) => (
        <FieldRow key={label} label={label} value={value} highlight={hl} />
      ))}
    </CardShell>
  );
}

function FrameVisualGSTConfused() {
  return (
    <CardShell>
      <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>GST Calculation</div>
      {[
        ['CGST rate', '???', 'warn'],
        ['SGST rate', '???', 'warn'],
        ['Place of supply', '???', 'warn'],
        ['SAC / HSN code', '???', 'warn'],
        ['IGST or CGST+SGST?', '???', 'error'],
      ].map(([label, value, hl]) => (
        <FieldRow key={label} label={label} value={value} highlight={hl} />
      ))}
      <div style={{
        marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)',
        background: 'rgba(232,146,26,0.08)', borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-xs)', color: 'var(--warning-text)', fontWeight: 500,
      }}>
        Intrastate or interstate? Depends on the brand's state.
      </div>
    </CardShell>
  );
}

function FrameVisualPaymentGap() {
  return (
    <CardShell>
      <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Payment Received</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Invoiced</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>₹45,000</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--danger)' }}>TDS deducted (10%)</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums', textDecoration: 'line-through' }}>−₹4,500</span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--space-3) var(--space-3)',
          background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
          marginTop: 'var(--space-1)',
        }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>You received</span>
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>₹40,500</span>
        </div>
      </div>
    </CardShell>
  );
}

function FrameVisualWhatsApp() {
  return (
    <CardShell style={{ background: 'var(--surface-2)' }}>
      <div style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Follow-up Message
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '80%', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: '18px 18px 4px 18px',
          padding: 'var(--space-3) var(--space-4)',
        }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>
            Hi, just checking on the invoice I sent last week — could you confirm if payment has been processed? 🙏
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)', gap: 'var(--space-1)', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>2:47 PM</span>
            <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>✓✓</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <div style={{
          width: 6, height: 6, borderRadius: 'var(--radius-full)',
          background: 'var(--text-disabled)',
        }} aria-hidden="true" />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)', fontStyle: 'italic' }}>3rd follow-up this month</span>
      </div>
    </CardShell>
  );
}

function FrameVisualChaos() {
  const miniCards = [
    { label: 'Invoice Log', value: '₹1,82,000', color: 'var(--accent)' },
    { label: 'TDS Sheet', value: '₹17,300 deducted', color: 'var(--danger)' },
    { label: 'Payment Tracker', value: '₹1,58,500 received', color: 'var(--success-text)' },
  ];
  return (
    <div style={{ position: 'relative', height: 180 }}>
      {miniCards.map((card, i) => (
        <div
          key={card.label}
          style={{
            position: 'absolute',
            top: i * 22,
            left: i * 18,
            right: i === 2 ? 0 : 'auto',
            width: 'calc(100% - 36px)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            transform: `rotate(${(i - 1) * 1.5}deg)`,
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{card.label}</div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: card.color, fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
          <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 4, fontWeight: 500 }}>Numbers don't match ⚠</div>
        </div>
      ))}
    </div>
  );
}

// ── StickyStory frame data (must be after visual components are defined) ─────
const FRAMES = [
  {
    num: '01',
    headline: 'You finished the content.',
    visual: <FrameVisualUpload />,
  },
  {
    num: '02',
    headline: 'Then the paperwork starts.',
    visual: <FrameVisualInvoiceBlank />,
  },
  {
    num: '03',
    headline: 'GST? CGST? SAC code?',
    visual: <FrameVisualGSTConfused />,
  },
  {
    num: '04',
    headline: 'They paid ₹45,000. You got ₹40,500.',
    visual: <FrameVisualPaymentGap />,
  },
  {
    num: '05',
    headline: '"Hi, just checking on the invoice…"',
    visual: <FrameVisualWhatsApp />,
  },
  {
    num: '06',
    headline: '5 spreadsheet tabs. 0 reconciliation.',
    visual: <FrameVisualChaos />,
  },
];

// ── Creator at Work card (left panel, stays throughout) ───────────────────────
function CreatorWorkCard({ showChaos }) {
  return (
    <div style={{ position: 'relative' }}>
      <CardShell style={{ background: 'var(--surface-2)' }}>
        {/* Fake video editor header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 5 }} aria-hidden="true">
            {['#ff5f57', '#febc2e', '#28c840'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: 'var(--radius-full)', background: c }} />
            ))}
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'var(--space-2)' }}>Video Editor</span>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          marginBottom: 'var(--space-3)',
        }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            Editing: Brand Collab v3.mp4
          </div>
          {/* Fake timeline tracks */}
          {['Video', 'Audio', 'Title'].map((track, i) => (
            <div key={track} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: 'var(--text-disabled)', width: 28, flexShrink: 0, textAlign: 'right' }}>{track}</span>
              <div style={{
                flex: 1, height: 14, borderRadius: 3,
                background: `linear-gradient(90deg, ${i === 0 ? 'rgba(232,146,26,0.4)' : i === 1 ? 'rgba(99,102,241,0.35)' : 'rgba(16,185,129,0.35)'} 0%, transparent 85%)`,
                border: `1px solid ${i === 0 ? 'rgba(232,146,26,0.25)' : i === 1 ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'}`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: `${62 + i * 3}%`,
                  width: 2, background: 'var(--accent)', opacity: 0.8,
                }} aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>

        {/* Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            role="img"
            aria-label="Play button"
            style={{
              width: 28, height: 28, borderRadius: 'var(--radius-full)',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #fff', marginLeft: 2 }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, height: 4, background: 'var(--surface-3)', borderRadius: 'var(--radius-full)', position: 'relative' }}>
            <div style={{ width: '63%', height: '100%', background: 'var(--accent)', borderRadius: 'var(--radius-full)' }} />
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>5:26 / 8:42</span>
        </div>
      </CardShell>

      {/* Chaos overlay — appears at frame 5 */}
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: showChaos ? 'auto' : 'none',
        opacity: showChaos ? 1 : 0,
        transition: 'opacity var(--duration-moderate)',
      }} aria-hidden={!showChaos}>
        {[
          { label: 'Invoice #INV-034', sub: 'Pending?', top: '-18%', left: '-8%', rotate: '-4deg' },
          { label: 'TDS Form 16A', sub: 'Missing!', top: '30%', right: '-10%', rotate: '5deg' },
          { label: 'Payment follow-up', sub: 'Day 18 🙁', bottom: '-12%', left: '10%', rotate: '-2deg' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              position: 'absolute',
              top: card.top, left: card.left, right: card.right, bottom: card.bottom,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              transform: `rotate(${card.rotate})`,
              minWidth: 130,
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>{card.label}</div>
            <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Single frame panel (right side, desktop) ──────────────────────────────────
function FramePanel({ frame, reducedMotion }) {
  return (
    <div
      key={frame.num}
      style={{
        animation: reducedMotion ? 'none' : 'frameFadeIn var(--duration-standard) var(--ease-decelerate) both',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-6)',
        height: '100%', justifyContent: 'center',
      }}
    >
      <div style={{
        fontSize: 'clamp(56px, 8vw, 96px)', fontWeight: 800,
        color: 'var(--accent)', opacity: 0.15, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em',
        userSelect: 'none',
      }} aria-hidden="true">{frame.num}</div>
      <h3 style={{
        fontSize: 'var(--text-2xl)', fontWeight: 800,
        color: 'var(--text-primary)', lineHeight: 1.2,
        margin: 0, letterSpacing: '-0.02em',
      }}>{frame.headline}</h3>
      <div style={{ maxWidth: 380 }}>
        {frame.visual}
      </div>
    </div>
  );
}

// ── Mobile frame card ─────────────────────────────────────────────────────────
function MobileFrameCard({ frame, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: reducedMotion
          ? 'none'
          : `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
      }}
    >
      <span style={{
        fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--accent)',
        letterSpacing: '0.04em', opacity: 0.7,
      }} aria-hidden="true">{frame.num}</span>
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
        {frame.headline}
      </h3>
      {frame.visual}
    </div>
  );
}

// ── StickyStory ───────────────────────────────────────────────────────────────
function StickyStory() {
  const sectionRef = useRef(null);
  const progress = useScrollProgress(sectionRef);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  const frameIndex = Math.min(5, Math.floor(progress * 6));

  return (
    <>
      {/* Section headline — outside the sticky scroll area */}
      <Reveal>
        <div style={{
          maxWidth: 720, margin: '0 auto',
          padding: 'var(--space-20) var(--space-6) var(--space-12)',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 'var(--text-xs)', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--accent)', marginBottom: 'var(--space-4)',
          }}>THE HIDDEN JOB</p>
          <h2 style={{
            fontSize: 'var(--text-3xl)', fontWeight: 800,
            color: 'var(--text-primary)', lineHeight: 1.15,
            letterSpacing: '-0.03em', marginBottom: 'var(--space-5)',
            whiteSpace: 'pre-line',
          }}>{'You made the content.\nNow make the invoice.\nAnd track the TDS.\nAnd plan the tax.'}</h2>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Every creator we talked to had the same story.
          </p>
        </div>
      </Reveal>

      {/* Mobile: plain vertical cards */}
      {isMobile && (
        <div
          role="region"
          aria-label="The hidden job — creator story"
          style={{
            padding: '0 var(--space-4) var(--space-12)',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
          }}
        >
          {FRAMES.map((frame, i) => (
            <MobileFrameCard key={frame.num} frame={frame} index={i} />
          ))}
        </div>
      )}

      {/* Desktop: sticky scroll section */}
      {!isMobile && (
        <section
          ref={sectionRef}
          role="region"
          aria-label="The hidden job — creator story"
          style={{ height: '500vh', position: 'relative' }}
        >
          <div style={{
            position: 'sticky', top: 0,
            height: '100vh', overflow: 'hidden',
          }}>
            <div style={{
              maxWidth: 1100, margin: '0 auto',
              padding: '0 var(--space-6)',
              height: '100%',
              display: 'flex', alignItems: 'center', gap: 'var(--space-10)',
            }}>
              {/* Left 42%: creator at work card */}
              <div style={{ flex: '0 0 42%', maxWidth: '42%' }}>
                <CreatorWorkCard showChaos={frameIndex === 5} />
              </div>

              {/* Right 58%: crossfading frames */}
              <div style={{
                flex: '1 1 58%',
                height: '100%',
                display: 'flex', alignItems: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <FramePanel
                  key={frameIndex}
                  frame={FRAMES[frameIndex]}
                  reducedMotion={reducedMotion.current}
                />
              </div>
            </div>

            {/* Progress dots */}
            <div style={{
              position: 'absolute', bottom: 'var(--space-8)', left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex', gap: 'var(--space-2)', alignItems: 'center',
            }} aria-hidden="true">
              {FRAMES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === frameIndex ? 20 : 6,
                    height: 6, borderRadius: 'var(--radius-full)',
                    background: i === frameIndex ? 'var(--accent)' : 'var(--border)',
                    transition: reducedMotion.current ? 'none' : 'width var(--duration-standard), background var(--duration-standard)',
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`
        @keyframes frameFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ── MidCTA1 ───────────────────────────────────────────────────────────────────
export function MidCTA1() {
  return (
    <Reveal>
      <div
        role="region"
        aria-label="Get started with CreatiFlow"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: 'var(--space-16) var(--space-6)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle saffron glow backdrop */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60%', height: '200%',
            background: 'radial-gradient(ellipse at center, var(--accent-glow, rgba(232,146,26,0.07)) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 540, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'var(--text-2xl)', fontWeight: 800,
            color: 'var(--text-primary)', lineHeight: 1.2,
            letterSpacing: '-0.02em', marginBottom: 'var(--space-3)',
          }}>
            This is fixable. In 30 seconds.
          </h2>
          <p style={{
            fontSize: 'var(--text-base)', color: 'var(--text-muted)',
            lineHeight: 1.65, marginBottom: 'var(--space-8)',
          }}>
            CreatiFlow handles every one of those frames automatically.
          </p>
          <Link
            to="/register"
            style={{
              display: 'inline-block',
              padding: 'var(--space-3) var(--space-8)',
              background: 'transparent',
              color: 'var(--accent)',
              border: '1.5px solid var(--accent)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: 'var(--text-base)',
              textDecoration: 'none',
              transition: 'background var(--duration-fast), color var(--duration-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent)'; }}
          >
            See how it works →
          </Link>
          <p style={{
            marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)',
            color: 'var(--text-disabled)', fontWeight: 500,
          }}>
            No credit card · 28-day free trial
          </p>
        </div>
      </div>
    </Reveal>
  );
}

// ── Top sections named export ─────────────────────────────────────────────────
export function LandingPageV2TopSections() {
  return (
    <>
      <a
        href="#main-content"
        style={{
          position: 'absolute', top: -100, left: 'var(--space-4)',
          background: 'var(--accent)', color: '#fff',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)', fontWeight: 600,
          textDecoration: 'none', zIndex: 9999,
          transition: 'top var(--duration-fast)',
        }}
        onFocus={e => { e.currentTarget.style.top = 'var(--space-4)'; }}
        onBlur={e => { e.currentTarget.style.top = '-100px'; }}
      >
        Skip to main content
      </a>
      <Navbar />
      <div style={{ height: 72 }} aria-hidden="true" />
      <main id="main-content" style={{ background: 'var(--bg)', color: 'var(--text-body)' }}>
        <ChaosHero />
        <ProofBar />
        <StickyStory />
        <MidCTA1 />
      </main>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MIDDLE SECTION COMPONENTS (named exports for /v2 assembler)
// ═════════════════════════════════════════════════════════════════════════════

// ── Shared module-level helpers ───────────────────────────────────────────────

const sectionWrap = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: 'var(--space-20) var(--space-6)',
};

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. FlowPipeline — "One flow. Deal to ITR."
// ══════════════════════════════════════════════════════════════════════════════

const PIPELINE_STEPS = [
  { num: '①', title: 'Brand Deal arrives',  desc: 'Inquiry logged in your CRM.' },
  { num: '②', title: 'Invoice sent',         desc: '30 seconds. GST compliant.' },
  { num: '③', title: 'TDS auto-logged',      desc: '10% deduction recorded instantly.' },
  { num: '④', title: 'Income tracked',       desc: 'Net payment auto-reconciled.' },
  { num: '⑤', title: 'CA export ready',      desc: 'One ZIP. 20 minutes with your CA.' },
];

const BEFORE_AFTER_STATS = [
  { value: '30 seconds',  label: 'to generate a compliant invoice', was: '45 minutes' },
  { value: '₹0 lost',     label: 'in untracked TDS this year',       was: '₹40,000+' },
  { value: '0 penalties', label: 'in missed advance tax',            was: '₹3,600/quarter' },
];

export function FlowPipeline() {
  const sectionRef = useRef(null);
  const [stepVisible, setStepVisible] = useState(
    Array(PIPELINE_STEPS.length).fill(false)
  );
  const [lineVisible, setLineVisible] = useState(
    Array(PIPELINE_STEPS.length - 1).fill(false)
  );
  const fired = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          observer.disconnect();
          if (prefersReducedMotion()) {
            setStepVisible(Array(PIPELINE_STEPS.length).fill(true));
            setLineVisible(Array(PIPELINE_STEPS.length - 1).fill(true));
            return;
          }
          PIPELINE_STEPS.forEach((_, i) => {
            setTimeout(() => {
              setStepVisible((prev) => { const n = [...prev]; n[i] = true; return n; });
            }, i * 120);
            if (i < PIPELINE_STEPS.length - 1) {
              setTimeout(() => {
                setLineVisible((prev) => { const n = [...prev]; n[i] = true; return n; });
              }, i * 120 + 60);
            }
          });
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      role="region"
      aria-label="How CreatiFlow works — pipeline"
      style={{ ...sectionWrap, textAlign: 'center' }}
    >
      <style>{`
        .fp-pipeline {
          display: flex; flex-direction: row;
          align-items: flex-start; justify-content: center; gap: 0;
        }
        .fp-step-wrap { display: flex; flex-direction: row; align-items: flex-start; }
        .fp-connector {
          display: flex; flex-direction: column; align-items: center;
          padding-top: 24px; flex-shrink: 0;
        }
        .fp-connector-line {
          width: 40px; height: 2px; background: var(--accent);
          transform-origin: left center;
          transition: transform 400ms var(--ease-decelerate);
        }
        .fp-connector-arrow {
          color: var(--accent); font-size: var(--text-base); margin-top: -1px; line-height: 1;
        }
        @media (max-width: 767px) {
          .fp-pipeline {
            flex-direction: column; align-items: flex-start; padding-left: var(--space-4);
          }
          .fp-step-wrap { flex-direction: row; }
          .fp-connector {
            flex-direction: row; align-items: center;
            padding-top: 0; padding-left: 23px; height: 28px;
          }
          .fp-connector-line { width: 2px; height: 28px; transform-origin: top center; }
          .fp-connector-arrow { display: none; }
        }
      `}</style>

      <p className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
        HOW IT WORKS
      </p>

      <h2 style={{
        fontSize: 'var(--text-2xl)', fontWeight: 700,
        color: 'var(--text-primary)', marginBottom: 'var(--space-12)', lineHeight: 1.2,
      }}>
        One deal. One flow.{' '}
        <span style={{ color: 'var(--accent)' }}>Zero spreadsheets.</span>
      </h2>

      <div className="fp-pipeline" role="list">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.num} className="fp-step-wrap" role="listitem">
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              width: 160, flexShrink: 0,
              opacity: stepVisible[i] ? 1 : 0,
              transform: stepVisible[i] ? 'translateY(0)' : 'translateY(20px)',
              transition: prefersReducedMotion()
                ? 'none'
                : 'opacity 400ms var(--ease-decelerate), transform 400ms var(--ease-decelerate)',
            }}>
              <div aria-hidden="true" style={{
                width: 50, height: 50, borderRadius: 'var(--radius-full)',
                background: i === 0 ? 'var(--accent)' : 'var(--surface-2)',
                border: `2px solid ${i === 0 ? 'var(--accent)' : 'rgba(232,146,26,0.35)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--text-lg)', color: i === 0 ? '#fff' : 'var(--accent)',
                fontWeight: 700, flexShrink: 0, marginBottom: 'var(--space-3)',
              }}>
                {step.num}
              </div>
              <div style={{
                fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: 'var(--space-1)', textAlign: 'center',
              }}>
                {step.title}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
                lineHeight: 1.5, textAlign: 'center', maxWidth: 130,
              }}>
                {step.desc}
              </div>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="fp-connector" aria-hidden="true">
                <div className="fp-connector-line" style={{
                  transform: lineVisible[i] ? 'scaleX(1) scaleY(1)' : 'scaleX(0) scaleY(0)',
                }} />
                <span className="fp-connector-arrow">›</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Reveal delay={200}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-5)',
          marginTop: 'var(--space-12)', paddingTop: 'var(--space-10)',
          borderTop: '1px solid var(--border)',
        }}>
          {BEFORE_AFTER_STATS.map((stat) => (
            <div key={stat.value} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-5) var(--space-6)',
              textAlign: 'center', minWidth: 200, flex: '1 1 200px', maxWidth: 280,
            }}>
              <div style={{
                fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--accent)',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginBottom: 'var(--space-1)',
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', marginBottom: 'var(--space-2)' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                was:{' '}
                <span style={{ textDecoration: 'line-through', color: 'var(--text-disabled)' }}>
                  {stat.was}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. DealJourney — "From brand deal to ITR. Every step."
// ══════════════════════════════════════════════════════════════════════════════

const JOURNEY_STAGES = [
  { IconComp: Handshake,   num: '01', title: 'Brand Deal',   desc: 'Inquiry arrives. You log it in deals.' },
  { IconComp: FileText,    num: '02', title: 'Invoice Sent',  desc: '30 seconds. GST compliant. PDF ready.' },
  { IconComp: Minus,       num: '03', title: 'TDS Logged',    desc: '₹4,500 deducted. CreatiFlow records it.' },
  { IconComp: IndianRupee, num: '04', title: 'Payment In',    desc: '₹40,500 hits your account. Income auto-logged.' },
  { IconComp: BarChart2,   num: '05', title: 'Books Updated', desc: 'P&L updated. Running total current.' },
  { IconComp: Download,    num: '06', title: 'CA Export',     desc: 'One ZIP. 20 minutes with your CA.' },
];

export function DealJourney() {
  const sectionRef = useRef(null);
  const [cardVisible, setCardVisible] = useState(Array(JOURNEY_STAGES.length).fill(false));
  const fired = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          observer.disconnect();
          if (prefersReducedMotion()) {
            setCardVisible(Array(JOURNEY_STAGES.length).fill(true));
            return;
          }
          JOURNEY_STAGES.forEach((_, i) => {
            setTimeout(() => {
              setCardVisible((prev) => { const n = [...prev]; n[i] = true; return n; });
            }, i * 80);
          });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      role="region"
      aria-label="Deal journey stages"
      style={{ ...sectionWrap, paddingTop: 'var(--space-16)' }}
    >
      <style>{`
        .dj-scroll-outer { position: relative; }
        .dj-scroll-container {
          display: flex; flex-direction: row;
          overflow-x: auto; scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          gap: var(--space-4); padding-bottom: var(--space-4);
        }
        .dj-scroll-container::-webkit-scrollbar { height: 4px; }
        .dj-scroll-container::-webkit-scrollbar-track {
          background: var(--surface-2); border-radius: var(--radius-full);
        }
        .dj-scroll-container::-webkit-scrollbar-thumb {
          background: var(--border-2); border-radius: var(--radius-full);
        }
        .dj-card-desktop { scroll-snap-align: start; flex-shrink: 0; width: 220px; }
        .dj-mobile-layout { display: none; flex-direction: column; position: relative; }
        @media (max-width: 1023px) {
          .dj-scroll-outer { display: none !important; }
          .dj-mobile-layout { display: flex !important; }
        }
        @media (min-width: 1024px) { .dj-mobile-layout { display: none !important; } }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          From first message to filed taxes.
        </h2>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)' }}>
          Track every rupee. Every step of the way.
        </p>
      </div>

      {/* Desktop: horizontal scroll + fade overlays */}
      <div className="dj-scroll-outer">
        <div aria-hidden="true" style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 40,
          background: 'linear-gradient(to right, var(--bg) 0%, transparent 100%)',
          zIndex: 2, pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 60,
          background: 'linear-gradient(to left, var(--bg) 0%, transparent 100%)',
          zIndex: 2, pointerEvents: 'none',
        }} />
        <div className="dj-scroll-container" role="list">
          {JOURNEY_STAGES.map((stage, i) => (
            <div key={stage.num} className="dj-card-desktop" role="listitem" style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
              opacity: cardVisible[i] ? 1 : 0,
              transform: cardVisible[i] ? 'translateX(0)' : 'translateX(-20px)',
              transition: prefersReducedMotion()
                ? 'none'
                : 'opacity 400ms var(--ease-decelerate), transform 400ms var(--ease-decelerate)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--accent-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'var(--space-3)', color: 'var(--accent)',
              }}>
                <stage.IconComp size={18} aria-hidden="true" />
              </div>
              <div className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-1)' }}>
                STEP {stage.num}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                {stage.title}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', lineHeight: 1.6, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {stage.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical stacked with left accent line + dot */}
      <div className="dj-mobile-layout" role="list">
        <div aria-hidden="true" style={{
          position: 'absolute', left: 19, top: 0, bottom: 0,
          width: 2, background: 'rgba(232,146,26,0.30)', borderRadius: 'var(--radius-full)',
        }} />
        {JOURNEY_STAGES.map((stage, i) => (
          <div key={stage.num} role="listitem" style={{
            display: 'flex', gap: 'var(--space-4)',
            marginBottom: i < JOURNEY_STAGES.length - 1 ? 'var(--space-4)' : 0,
            opacity: cardVisible[i] ? 1 : 0,
            transform: cardVisible[i] ? 'translateX(0)' : 'translateX(24px)',
            transition: prefersReducedMotion()
              ? 'none'
              : 'opacity 400ms var(--ease-decelerate), transform 400ms var(--ease-decelerate)',
          }}>
            <div aria-hidden="true" style={{
              width: 40, height: 40, borderRadius: 'var(--radius-full)',
              background: 'var(--accent-dim)', border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0, zIndex: 1,
            }}>
              <stage.IconComp size={16} aria-hidden="true" />
            </div>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', flex: 1,
            }}>
              <div className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-1)' }}>STEP {stage.num}</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                {stage.title}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', lineHeight: 1.6, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {stage.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. DashboardReveal — "This is what 3 months looks like."
// ══════════════════════════════════════════════════════════════════════════════

const BAR_HEIGHTS_DATA = [40, 65, 55, 80, 70, 90, 100];

function MiniBarChart({ animate }) {
  const [heights, setHeights] = useState(BAR_HEIGHTS_DATA.map(() => 0));

  useEffect(() => {
    if (!animate) return;
    if (prefersReducedMotion()) { setHeights(BAR_HEIGHTS_DATA); return; }
    BAR_HEIGHTS_DATA.forEach((h, i) => {
      setTimeout(() => {
        setHeights((prev) => { const n = [...prev]; n[i] = h; return n; });
      }, i * 200);
    });
  }, [animate]);

  return (
    <div aria-hidden="true" style={{
      display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, marginTop: 'var(--space-3)',
    }}>
      {BAR_HEIGHTS_DATA.map((_, i) => (
        <div key={i} style={{
          flex: 1, height: `${heights[i]}%`,
          background: i === BAR_HEIGHTS_DATA.length - 1 ? 'var(--accent)' : 'var(--surface-3)',
          borderRadius: '2px 2px 0 0',
          transition: prefersReducedMotion() ? 'none' : 'height 300ms var(--ease-decelerate)',
          minHeight: 2,
        }} />
      ))}
    </div>
  );
}

export function DashboardReveal() {
  const sectionRef = useRef(null);
  const [cardVisible, setCardVisible] = useState([false, false, false, false]);
  const fired = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          observer.disconnect();
          if (prefersReducedMotion()) { setCardVisible([true, true, true, true]); return; }
          [0, 1, 2, 3].forEach((i) => {
            setTimeout(() => {
              setCardVisible((prev) => { const n = [...prev]; n[i] = true; return n; });
            }, i * 100);
          });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cardStyle = (i) => ({
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
    opacity: cardVisible[i] ? 1 : 0,
    transform: cardVisible[i] ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.98)',
    transition: prefersReducedMotion()
      ? 'none'
      : `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
  });

  return (
    <section
      ref={sectionRef}
      role="region"
      aria-label="Dashboard preview — 3 months of real results"
      style={{ ...sectionWrap, paddingTop: 'var(--space-16)' }}
    >
      <style>{`
        .dr-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: var(--space-5); margin-bottom: var(--space-10);
        }
        @media (max-width: 767px) { .dr-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          Your dashboard. In 3 months.
        </h2>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)' }}>
          Real numbers. Real creators. Real results.
        </p>
      </div>

      <div className="dr-grid">
        {/* Card 1 — Net Income */}
        <div style={cardStyle(0)}>
          <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>NET INCOME THIS MONTH</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            ₹2,40,000
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--success-text)', fontWeight: 600 }}>
            ↑ 18% vs last month
          </div>
          <MiniBarChart animate={cardVisible[0]} />
        </div>

        {/* Card 2 — Active Deals */}
        <div style={cardStyle(1)}>
          <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>ACTIVE DEALS</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            3 deals
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-3)', fontVariantNumeric: 'tabular-nums' }}>
            ₹1,08,000 in pipeline
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {[
              { label: 'ACTIVE',      bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6' },
              { label: 'NEGOTIATING', bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
              { label: 'DELIVERED',   bg: 'rgba(34,197,94,0.12)',   color: '#22C55E' },
            ].map((chip) => (
              <span key={chip.label} style={{
                padding: '2px var(--space-2)', background: chip.bg, color: chip.color,
                borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              }}>{chip.label}</span>
            ))}
          </div>
        </div>

        {/* Card 3 — TDS Tracked */}
        <div style={cardStyle(2)}>
          <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>TDS TRACKED THIS YEAR</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            ₹24,000
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)', fontVariantNumeric: 'tabular-nums' }}>
            from 6 brands · 4 Form 16As received
          </div>
          <div>
            <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: cardVisible[2] ? '67%' : '0%',
                background: 'var(--accent)', borderRadius: 'var(--radius-full)',
                transition: prefersReducedMotion() ? 'none' : 'width 600ms cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
              4 of 6 Form 16As received (67%)
            </div>
          </div>
        </div>

        {/* Card 4 — Next Tax Deadline */}
        <div style={cardStyle(3)}>
          <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>NEXT TAX DEADLINE</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Sep 15
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-3)', fontVariantNumeric: 'tabular-nums' }}>
            Q3 Advance Tax · ₹18,400 due
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
            padding: '3px var(--space-3)', background: 'var(--warning-dim)',
            color: 'var(--warning-text)', borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-xs)', fontWeight: 700,
          }}>
            14 days away
          </div>
        </div>
      </div>

      <p style={{
        textAlign: 'center', fontSize: 'var(--text-base)', color: 'var(--text-muted)',
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontStyle: 'italic', maxWidth: 600, margin: '0 auto', lineHeight: 1.6,
      }}>
        This is what running a content business feels like when the infrastructure works.
      </p>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. MidCTA2 — High-intent mid-page CTA
// ══════════════════════════════════════════════════════════════════════════════

export function MidCTA2() {
  const btnRef = useRef(null);
  const [btnTransform, setBtnTransform] = useState('translate(0px,0px)');

  const handleMouseMove = (e) => {
    if (prefersReducedMotion()) return;
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = Math.max(-6, Math.min(6, (e.clientX - cx) * 0.25));
    const dy = Math.max(-6, Math.min(6, (e.clientY - cy) * 0.25));
    setBtnTransform(`translate(${dx}px,${dy}px)`);
  };

  const TRUST = [
    { IconComp: Lock,      label: 'AES-256 Encrypted' },
    { IconComp: Shield,    label: 'Data stored in India' },
    { IconComp: RefreshCw, label: 'Cancel anytime' },
    { IconComp: Calendar,  label: '28-day free trial' },
  ];

  return (
    <section
      role="region"
      aria-label="Start your free trial"
      style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'var(--surface)' }} />
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 100% at 50% 100%, var(--accent-glow) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 640, margin: '0 auto',
        padding: 'var(--space-20) var(--space-6)', textAlign: 'center',
      }}>
        <p className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
          28-DAY FREE TRIAL
        </p>

        <h2 className="display" style={{ marginBottom: 'var(--space-5)' }}>
          Start free. <em>Everything flows.</em>
        </h2>

        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', marginBottom: 'var(--space-8)', lineHeight: 1.6 }}>
          Join 200+ Indian creators who stopped losing money to tax confusion.
        </p>

        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setBtnTransform('translate(0px,0px)')}
          style={{ display: 'inline-block', marginBottom: 'var(--space-8)' }}
        >
          <Link
            ref={btnRef}
            to="/register"
            style={{
              display: 'inline-block',
              padding: 'var(--space-4) var(--space-10)',
              background: 'var(--accent)', color: '#fff',
              borderRadius: 'var(--radius-md)', fontWeight: 700,
              fontSize: 'var(--text-md)', textDecoration: 'none',
              transform: btnTransform,
              transition: prefersReducedMotion()
                ? 'none'
                : 'transform 200ms var(--ease-standard), background var(--duration-fast)',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            Start free trial →
          </Link>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-5)' }}>
          {TRUST.map(({ IconComp, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 500,
            }}>
              <IconComp size={13} aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. TimeReclaimed — COMPLETELY STATIC. No animation.
// ══════════════════════════════════════════════════════════════════════════════

const WITHOUT_ROWS = [
  { label: 'Editing content',    pct: 28, accent: false },
  { label: 'Invoicing',          pct: 18, accent: false },
  { label: 'GST & TDS admin',    pct: 18, accent: false },
  { label: 'Payment follow-ups', pct: 14, accent: false },
  { label: 'CA prep & export',   pct: 14, accent: false },
  { label: 'Spreadsheet chaos',  pct:  8, accent: false },
];

const WITH_ROWS = [
  { label: 'Editing content', pct: 88, accent: true },
  { label: 'Everything else', pct: 12, accent: false },
];

function BarGroupStatic({ title, rows }) {
  return (
    <div style={{ flex: '1 1 300px' }}>
      <div style={{
        fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)',
        marginBottom: 'var(--space-5)', paddingBottom: 'var(--space-3)',
        borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.map((row) => (
          <div key={row.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-1)' }}>
              <span style={{
                fontSize: 'var(--text-xs)',
                color: row.accent ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: row.accent ? 600 : 400,
              }}>{row.label}</span>
              <span style={{
                fontSize: 'var(--text-xs)',
                color: row.accent ? 'var(--accent)' : 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: row.accent ? 700 : 400,
              }}>{row.pct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${row.pct}%`,
                background: row.accent ? 'var(--accent)' : 'var(--surface-3)',
                borderRadius: 'var(--radius-full)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimeReclaimed() {
  return (
    <section
      role="region"
      aria-label="Time reclaimed with CreatiFlow"
      style={{ ...sectionWrap, paddingTop: 'var(--space-16)' }}
    >
      <style>{`
        .tr-groups { display: flex; gap: var(--space-12); align-items: flex-start; }
        .tr-divider { width: 1px; background: var(--border); align-self: stretch; flex-shrink: 0; }
        @media (max-width: 767px) {
          .tr-groups { flex-direction: column; gap: var(--space-8); }
          .tr-divider { width: 100%; height: 1px; }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          More time creating.
        </h2>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)' }}>
          Less time operating.
        </p>
      </div>

      <div className="tr-groups">
        <BarGroupStatic title="Without CreatiFlow" rows={WITHOUT_ROWS} />
        <div className="tr-divider" aria-hidden="true" />
        <BarGroupStatic title="With CreatiFlow" rows={WITH_ROWS} />
      </div>

      <p style={{
        textAlign: 'center', fontSize: 'var(--text-sm)',
        color: 'var(--text-muted)', marginTop: 'var(--space-10)', lineHeight: 1.6,
      }}>
        The 12% is handled by CreatiFlow. Automatically.
      </p>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BOTTOM SECTION COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. FeaturesGrid
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES_DATA = [
  {
    title: 'GST Invoice Generator',
    tag: 'Most used',
    icon: FileText,
    desc: 'Rule 46-compliant in 30 seconds. Auto-fills GSTIN, SAC code 998399, place of supply. CGST/SGST or IGST calculated automatically. 7 templates.',
  },
  {
    title: 'TDS Tracker',
    tag: 'Saves ₹ at ITR',
    icon: TrendingDown,
    desc: "Track every 10% deduction from every brand. Log Form 16A status. At ITR time, export your full TDS credit — don't leave ₹40,000 on the table.",
  },
  {
    title: 'Advance Tax Planner',
    tag: 'No March panic',
    icon: Calendar,
    desc: 'Calculates quarterly instalments from your real income. Reminds you 14 days before Jun 15, Sep 15, Dec 15, Mar 15. No more penalties.',
  },
  {
    title: 'Brand Deals CRM',
    tag: 'Pipeline to pay',
    icon: Briefcase,
    desc: 'Inquiry → Negotiating → Active → Delivered → Invoiced → Paid. Mark paid and income is auto-logged. Generate invoice directly from a deal.',
  },
  {
    title: 'Income Dashboard',
    tag: 'Full picture',
    icon: BarChart2,
    desc: 'AdSense, brand deals, Instagram bonuses, affiliate — all sources logged. Monthly P&L, 6-month chart, financial year breakdown.',
  },
  {
    title: 'CA Export',
    tag: 'ITR-ready',
    icon: Download,
    desc: 'Annual ZIP: every invoice, TDS record, income entry, expense log. Formatted for CA submission. 20 minutes, not 2 hours.',
  },
];

function FeatureCard({ title, tag, icon: Icon, desc, delay: cardDelay }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={cardDelay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${hovered ? 'var(--accent-dim)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          height: '100%',
          boxSizing: 'border-box',
          transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
          boxShadow: hovered ? '0 8px 32px rgba(232,146,26,0.08)' : 'none',
          transition: 'transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
          cursor: 'default',
        }}
      >
        {/* Top row: icon circle + tag badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--accent)',
            }}
          >
            <Icon size={18} aria-hidden="true" />
          </div>
          <span style={{
            padding: '2px var(--space-3)',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            borderRadius: 'var(--radius-full)',
            fontSize: 10,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {tag}
          </span>
        </div>

        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.65, margin: 0, flex: 1 }}>
          {desc}
        </p>
      </div>
    </Reveal>
  );
}

export function FeaturesGrid() {
  return (
    <section
      id="features"
      aria-label="Features"
      style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-20) var(--space-6)' }}
    >
      <Reveal>
        <p style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--accent)',
          textAlign: 'center', margin: '0 auto var(--space-4)',
        }}>
          FEATURES
        </p>
        <h2 style={{
          fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)',
          textAlign: 'center', margin: '0 auto var(--space-3)',
        }}>
          Everything your content business needs. Nothing it doesn&apos;t.
        </h2>
        <p style={{
          fontSize: 'var(--text-base)', color: 'var(--text-muted)',
          textAlign: 'center', maxWidth: 520, margin: '0 auto var(--space-12)',
        }}>
          No CA needed for day-to-day. No spreadsheets. No WhatsApp invoices.
        </p>
      </Reveal>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--space-5)',
      }}>
        {FEATURES_DATA.map((f, i) => (
          <FeatureCard key={f.title} {...f} delay={i * 60} />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Testimonials
// ─────────────────────────────────────────────────────────────────────────────

const TESTIMONIALS_DATA = [
  {
    quote: "I used to spend two hours before every brand payment hunting for the right invoice format online, second-guessing every field. My first invoice on CreatiFlow took 4 minutes. I've never gone back.",
    name: 'Priya R.',
    role: 'Tech Creator · 220K subscribers',
    initials: 'PR',
    avatarBg: '#8B5CF6',
    featured: false,
  },
  {
    quote: "I missed advance tax for two years. In March I owed ₹1.8 lakhs plus penalties. That was the last time. The tax planner alone is worth the subscription.",
    name: 'Arjun S.',
    role: 'Finance Creator · 95K subscribers',
    initials: 'AS',
    avatarBg: 'var(--accent)',
    featured: true,
  },
  {
    quote: "My CA used to charge ₹18,000 in March just to sort through my records. Last year I handed him the CreatiFlow export ZIP. He called back in 20 minutes. Filing cost ₹4,000.",
    name: 'Meera K.',
    role: 'Lifestyle Creator · 210K subscribers',
    initials: 'MK',
    avatarBg: '#10B981',
    featured: false,
  },
];

export function Testimonials() {
  return (
    <section
      aria-label="What creators say"
      style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--space-6) var(--space-20)' }}
    >
      <Reveal>
        <p style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--accent)',
          textAlign: 'center', margin: '0 auto var(--space-4)',
        }}>
          WHAT CREATORS SAY
        </p>
        <h2 style={{
          fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)',
          textAlign: 'center', margin: '0 auto var(--space-10)',
        }}>
          Real creators. Real results.
        </h2>
      </Reveal>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--space-5)',
      }}>
        {TESTIMONIALS_DATA.map((t, i) => (
          <Reveal key={t.name} delay={i * 80}>
            <div style={{
              background: 'var(--surface)',
              border: t.featured ? '1px solid rgba(232,146,26,0.4)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-5)',
              height: '100%',
              boxSizing: 'border-box',
            }}>
              {/* Opening quote mark */}
              <div aria-hidden="true" style={{
                fontSize: 48, lineHeight: 1,
                color: 'var(--accent)', opacity: 0.3,
                fontFamily: 'Georgia, serif',
                marginBottom: 'calc(var(--space-2) * -1)',
                userSelect: 'none',
              }}>
                &ldquo;
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.7, margin: 0, flex: 1 }}>
                {t.quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: t.avatarBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0,
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ComparisonTable
// ─────────────────────────────────────────────────────────────────────────────

const CMP_ROWS = [
  { feature: 'GST invoice (SAC 998399)',    vals: ['✓', '✗', 'Partial', '✗'] },
  { feature: 'TDS tracking (all brands)',   vals: ['✓', 'Manual', '✗', '✗'] },
  { feature: 'Advance tax planner',         vals: ['✓', '✗', '✗', 'Once/yr'] },
  { feature: 'Brand deal CRM',              vals: ['✓', 'Manual', '✗', '✗'] },
  { feature: 'Built for creators',          vals: ['✓', '✗', '✗', '✗'] },
  { feature: 'Year-round OS',               vals: ['✓', '✗', '✗', '✗'] },
  { feature: 'Price',                        vals: ['₹299/mo', 'Free', '₹1,200/mo', '₹5,000/yr'] },
];

const CMP_COLS = ['CreatiFlow ★', 'Google Sheets', 'Zoho Books', 'CA Only'];

const CMP_MOBILE_CARDS = [
  { feature: 'GST Invoice (creator SAC)',  ours: '✓ Included',       others: 'Not in any competitor' },
  { feature: 'TDS from all brands',        ours: '✓ Automatic',      others: 'Manual spreadsheet at best' },
  { feature: 'Advance tax reminders',      ours: '✓ 14-day + 2-day', others: 'Not available' },
  { feature: 'Brand deal pipeline',        ours: '✓ Kanban + list',   others: 'Build it yourself' },
  { feature: 'Price',                      ours: 'From ₹299/mo',      others: 'Zoho ₹1,200/mo · CA ₹5,000/yr' },
];

function cmpCellColor(val, colIndex) {
  if (colIndex === 0) return val === '✓' ? 'var(--accent)' : 'var(--text-primary)';
  if (val === '✓') return 'var(--success-text)';
  if (val === '✗') return 'var(--text-disabled)';
  return 'var(--text-muted)';
}

function CmpRow({ row }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      style={{
        borderBottom: '1px solid var(--border)',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        transition: 'background 150ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-body)', fontWeight: 500 }}>
        {row.feature}
      </td>
      {row.vals.map((v, vi) => (
        <td
          key={vi}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            textAlign: 'center',
            fontWeight: vi === 0 && v === '✓' ? 700 : 400,
            color: cmpCellColor(v, vi),
            background: vi === 0 ? 'var(--accent-dim)' : 'transparent',
            borderLeft: vi === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined,
            borderRight: vi === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

export function ComparisonTable() {
  return (
    <section
      aria-label="Why CreatiFlow"
      style={{ maxWidth: 1000, margin: '0 auto', padding: '0 var(--space-6) var(--space-20)' }}
    >
      <Reveal>
        <p style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--accent)',
          textAlign: 'center', margin: '0 auto var(--space-4)',
        }}>
          WHY CREATFLOW
        </p>
        <h2 style={{
          fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)',
          textAlign: 'center', margin: '0 auto var(--space-10)',
        }}>
          Built for this. Nothing else comes close.
        </h2>
      </Reveal>

      <style>{`
        .cmp-desktop { display: block; overflow-x: auto; }
        .cmp-mobile  { display: none;  }
        @media (max-width: 640px) {
          .cmp-desktop { display: none; }
          .cmp-mobile  { display: flex; flex-direction: column; gap: var(--space-3); }
        }
      `}</style>

      {/* Desktop table */}
      <div className="cmp-desktop">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr>
              <th style={{
                padding: 'var(--space-3) var(--space-4)', textAlign: 'left',
                color: 'var(--text-muted)', fontWeight: 600, fontSize: 'var(--text-xs)',
                letterSpacing: '0.04em', borderBottom: '1px solid var(--border)',
              }}>
                Feature
              </th>
              {CMP_COLS.map((col, ci) => (
                <th
                  key={col}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    textAlign: 'center', fontWeight: 700, fontSize: 'var(--text-xs)',
                    color: ci === 0 ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: `2px solid ${ci === 0 ? 'var(--accent)' : 'var(--border)'}`,
                    background: ci === 0 ? 'var(--accent-dim)' : 'transparent',
                    borderLeft: ci === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined,
                    borderRight: ci === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CMP_ROWS.map((row) => <CmpRow key={row.feature} row={row} />)}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="cmp-mobile">
        {CMP_MOBILE_CARDS.map((card) => (
          <div key={card.feature} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
          }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              {card.feature}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
              {card.ours}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {card.others}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PricingSection
// ─────────────────────────────────────────────────────────────────────────────

const PLANS_DATA = [
  {
    name: 'Basic',
    monthly: 0, annual: 0,
    isFree: true, highlight: false,
    features: ['5 invoices/mo (watermarked)', '10 TDS entries', '3 templates', '2 compliance deadlines'],
  },
  {
    name: 'Starter',
    monthly: 299, annual: 249,
    isFree: false, highlight: false,
    features: ['Unlimited invoices', 'All 7 templates', 'Unlimited TDS tracking', 'Reminders + expense tracker'],
  },
  {
    name: 'Pro',
    monthly: 599, annual: 499,
    isFree: false, highlight: true,
    features: ['Everything in Starter', 'Advance tax planner', 'P&L dashboard', 'CA annual export'],
  },
  {
    name: 'Business',
    monthly: 1499, annual: 1249,
    isFree: false, highlight: false,
    features: ['Everything in Pro', '5 creators (multi-seat)', 'White-label invoices', 'Priority support'],
  },
];

const TRUST_BADGES = [
  { icon: Lock,      label: 'AES-256 Encrypted' },
  { icon: Shield,    label: 'Data stored in India' },
  { icon: RefreshCw, label: 'Cancel anytime' },
  { icon: Calendar,  label: '28-day free trial' },
];

function PlanCard({ plan, price, annualSaving, annual: isAnnual }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        padding: 'var(--space-6)',
        border: `1px solid ${plan.highlight ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-xl)',
        position: 'relative',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {plan.highlight && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff',
          padding: '2px var(--space-3)',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--text-xs)', fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          Most Popular
        </div>
      )}

      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--space-2)' }}>
        {plan.name}
      </h3>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
        {plan.isFree ? (
          <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Free</span>
        ) : (
          <>
            {isAnnual && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-disabled)', textDecoration: 'line-through', fontVariantNumeric: 'tabular-nums' }}>
                ₹{plan.monthly}
              </span>
            )}
            <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              ₹{price}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>/month</span>
          </>
        )}
      </div>

      {isAnnual && !plan.isFree ? (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success-text)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
          Save ₹{annualSaving.toLocaleString('en-IN')}/year
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-4)' }} />
      )}

      <ul style={{
        textAlign: 'left', margin: '0 0 var(--space-5)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        padding: 0, listStyle: 'none', flex: 1,
      }}>
        {plan.features.map((f) => (
          <li key={f} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
            <Check size={14} aria-hidden="true" style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
            {f}
          </li>
        ))}
      </ul>

      <Link
        to="/register"
        onMouseEnter={e => { e.currentTarget.style.background = plan.highlight ? 'var(--accent-hover)' : 'var(--surface-2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = plan.highlight ? 'var(--accent)' : 'transparent'; }}
        style={{
          display: 'block', padding: 'var(--space-2) var(--space-4)', textAlign: 'center',
          background: plan.highlight ? 'var(--accent)' : 'transparent',
          color: plan.highlight ? '#fff' : 'var(--text-body)',
          border: `1px solid ${plan.highlight ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)',
          transition: 'background var(--duration-fast)',
          textDecoration: 'none',
        }}
      >
        Start free trial
      </Link>
    </div>
  );
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      id="pricing"
      aria-label="Pricing"
      style={{ maxWidth: 1000, margin: '0 auto', padding: '0 var(--space-6) var(--space-20)', textAlign: 'center' }}
    >
      <Reveal>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 auto var(--space-3)' }}>
          Simple, transparent pricing.
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '0 auto var(--space-6)' }}>
          Less than a CA consultation. Available every day of the year.
        </p>

        {/* Toggle */}
        <div style={{
          display: 'inline-flex', background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-full)',
          padding: 3, marginBottom: 'var(--space-8)', gap: 2,
        }}>
          {[{ label: 'Monthly', val: false }, { label: 'Annual (2m free)', val: true }].map((opt) => (
            <button
              key={String(opt.val)}
              type="button"
              onClick={() => setAnnual(opt.val)}
              style={{
                padding: 'var(--space-1) var(--space-4)', borderRadius: 'var(--radius-full)',
                fontWeight: 600, fontSize: 'var(--text-xs)', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background var(--duration-fast), color var(--duration-fast)',
                background: annual === opt.val ? 'var(--accent)' : 'transparent',
                color: annual === opt.val ? '#fff' : 'var(--text-muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Reveal>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-5)' }}>
        {PLANS_DATA.map((plan, pi) => {
          const price = annual ? plan.annual : plan.monthly;
          const annualSaving = Math.round((plan.monthly - plan.annual) * 12);
          return (
            <Reveal key={plan.name} delay={pi * 80}>
              <PlanCard plan={plan} price={price} annualSaving={annualSaving} annual={annual} />
            </Reveal>
          );
        })}
      </div>

      <p style={{ marginTop: 'var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        {annual ? 'Billed annually · ' : ''}Annual plans get 2 months free · No credit card for trial
      </p>

      <Reveal>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 'var(--space-5)', marginTop: 'var(--space-8)',
          paddingTop: 'var(--space-8)', borderTop: '1px solid var(--border)',
        }}>
          {TRUST_BADGES.map(({ icon: Icon, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 500,
            }}>
              <Icon size={14} aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FAQSection
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

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section
      id="faq"
      aria-label="Frequently asked questions"
      style={{ maxWidth: 680, margin: '0 auto', padding: '0 var(--space-6) var(--space-20)' }}
    >
      <Reveal>
        <h2 style={{
          fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)',
          textAlign: 'center', margin: '0 auto var(--space-8)',
        }}>
          Frequently asked questions
        </h2>
      </Reveal>

      <Reveal delay={80}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {FAQ_DATA.map((item, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: 'var(--space-4) var(--space-5)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', gap: 'var(--space-4)', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.q}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    color: 'var(--text-muted)', fontSize: 'var(--text-lg)',
                    flexShrink: 0, lineHeight: 1, display: 'inline-block',
                    transition: `transform var(--duration-standard)`,
                    transform: openIndex === i ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}
                >
                  +
                </span>
              </button>
              <div style={{
                maxHeight: openIndex === i ? '500px' : '0',
                overflow: 'hidden',
                transition: 'max-height 280ms ease',
              }}>
                <p style={{
                  padding: '0 var(--space-5) var(--space-4)',
                  fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.7, margin: 0,
                }}>
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FinalCTA
// ─────────────────────────────────────────────────────────────────────────────

export function FinalCTA() {
  return (
    <Reveal>
      <div style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: 'var(--space-16) var(--space-6)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <h2 className="display" style={{ marginBottom: 'var(--space-6)' }}>
            You built something real. <em>It deserves real infrastructure.</em>
          </h2>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
            marginBottom: 'var(--space-8)', alignItems: 'center',
          }}>
            {[
              'Stop losing money to untracked TDS.',
              'Stop paying penalties on late advance tax.',
              "Stop sending invoices you're not sure about.",
            ].map((line) => (
              <p key={line} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {line}
              </p>
            ))}
          </div>

          <Link
            to="/register"
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
            style={{
              display: 'inline-block',
              padding: 'var(--space-3) var(--space-12)',
              background: 'var(--accent)', color: '#fff',
              borderRadius: 'var(--radius-md)', fontWeight: 700,
              fontSize: 'var(--text-md)', textDecoration: 'none',
              transition: 'background var(--duration-fast)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Start free — no credit card
          </Link>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
            28-day trial · Full Pro access · Cancel anytime
          </p>
        </div>
      </div>
    </Reveal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6b. FooterV2
// ─────────────────────────────────────────────────────────────────────────────

export function FooterV2() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-8) var(--space-6)' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 'var(--space-4)',
      }}>
        {/* Left: logo + tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            aria-hidden="true"
            style={{
              width: 26, height: 26, background: 'var(--accent)',
              borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, color: '#fff', flexShrink: 0,
            }}
          >
            C
          </div>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)', letterSpacing: '-0.01em', display: 'block' }}>
              CreatiFlow
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Everything flows.</span>
          </div>
        </div>

        {/* Center: nav links */}
        <nav aria-label="Footer navigation" style={{ display: 'flex', gap: 'var(--space-5)' }}>
          {['Privacy Policy', 'Terms of Service', 'Contact'].map((label) => (
            <a
              key={label}
              href="#"
              style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color var(--duration-fast)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-body)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right: copyright */}
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>
          © 2025 CreatiFlow · Built for Indian creators
        </span>
      </div>
    </footer>
  );
}

// ── Default export — full page ────────────────────────────────────────────────
export default function LandingPageV2() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-body)' }}>
      <LandingPageV2TopSections />
      <div id="v2-main">
        <FlowPipeline />
        <DealJourney />
        <DashboardReveal />
        <MidCTA2 />
        <TimeReclaimed />
        <FeaturesGrid />
        <Testimonials />
        <ComparisonTable />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </div>
      <FooterV2 />
    </div>
  );
}
