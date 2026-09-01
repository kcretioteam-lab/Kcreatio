import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, X, Lock, Shield, RefreshCw, Calendar, FileText, Eye, Download } from 'lucide-react';
import ChaosHero from '../components/hero/ChaosHero.jsx';
import { useTheme } from '../App.jsx';

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


const FAQ_ITEMS = [
  {
    q: 'Do I need a CA to use Kcretio?',
    a: 'No. Kcretio handles your day-to-day GST invoicing, TDS tracking, and advance tax planning automatically. You can still use a CA for final ITR filing — we make their job easier by giving them a clean annual summary.',
  },
  {
    q: 'I have a GSTIN. How do I set it up?',
    a: 'After signup, go to Settings → Tax Profile and enter your GSTIN, PAN, business address, and state. All invoices will auto-populate with your details from there.',
  },
  {
    q: 'What if I don\'t have a GSTIN yet?',
    a: 'You can still use the app to track income, TDS, and deals. GST registration is mandatory once your turnover crosses ₹20L/year — we\'ll remind you when you\'re approaching that threshold.',
  },
  {
    q: 'Is my financial data safe?',
    a: 'Yes. All data is encrypted at rest via Supabase (AES-256) and in transit via HTTPS. We never share your financial data with third parties. Invoice PDFs are stored in a private bucket — only you can access them.',
  },
  {
    q: 'What is the 28-day trial?',
    a: 'Full access to all Pro features for 28 days. No credit card required to start. You can upgrade to a paid plan anytime during or after the trial.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel anytime from Settings → Billing. Your subscription stays active until the end of the current billing period. No questions asked.',
  },
];

function FaqAccordion() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {FAQ_ITEMS.map((item, i) => (
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
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
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
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {item.q}
            </span>
            <span
              aria-hidden="true"
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-lg)',
                flexShrink: 0,
                transition: 'transform var(--duration-standard)',
                transform: open === i ? 'rotate(45deg)' : 'none',
                lineHeight: 1,
              }}
            >
              +
            </span>
          </button>
          <div
            style={{
              maxHeight: open === i ? '500px' : '0',
              overflow: 'hidden',
              transition: 'max-height 280ms var(--ease-standard)',
            }}
          >
            <p style={{
              padding: '0 var(--space-5) var(--space-4)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-body)',
              lineHeight: 1.7,
            }}>
              {item.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-body)' }}>

      {/* ── Floating Pill Navbar (FintechX-style) ───────────── */}
      <div style={{
        position: 'fixed', top: 'var(--space-4)', left: '50%',
        transform: 'translateX(-50%)', zIndex: 200,
        width: 'calc(100% - var(--space-8))', maxWidth: 'min(960px, 100%)',
      }}>
        <header style={{
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
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}>
            <div aria-hidden="true" style={{
              width: 26, height: 26, background: 'var(--accent)',
              borderRadius: 7, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', flexShrink: 0,
            }}>C</div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)', letterSpacing: '-0.01em' }}>
              Kcretio
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
            className="desktop-nav">
            {[['#features', 'Features'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} style={{
                padding: 'var(--space-1) var(--space-3)',
                color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontWeight: 500,
                borderRadius: 'var(--radius-full)',
                transition: 'background var(--duration-fast), color var(--duration-fast)',
              }}
              onMouseEnter={e => { e.target.style.background = 'var(--surface-2)'; e.target.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-body)'; }}
              >{label}</a>
            ))}
          </nav>

          {/* Right: theme toggle + sign in + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {/* Dark/Light toggle */}
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

            <Link to="/register" style={{
              padding: 'var(--space-1) var(--space-3)',
              color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontWeight: 500,
              borderRadius: 'var(--radius-full)',
              display: 'none',
            }} className="desktop-signin">Sign in</Link>

            <Link to="/register" style={{
              padding: '6px var(--space-4)',
              background: 'var(--accent)', color: '#fff',
              borderRadius: 'var(--radius-full)', fontWeight: 600,
              fontSize: 'var(--text-sm)', whiteSpace: 'nowrap',
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
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{
                width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)', cursor: 'pointer', color: 'var(--text-body)',
              }}
              className="mobile-hamburger"
            >
              {menuOpen ? <X size={14} aria-hidden="true" /> : <Menu size={14} aria-hidden="true" />}
            </button>
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div style={{
            marginTop: 'var(--space-2)',
            background: theme === 'dark' ? 'rgba(14,16,24,0.97)' : 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-3)',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {[['#features', 'Features'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{
                padding: 'var(--space-3) var(--space-4)',
                color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontWeight: 500,
                borderRadius: 'var(--radius-md)',
              }}>{label}</a>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }} />
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-body)', fontSize: 'var(--text-base)', borderRadius: 'var(--radius-md)' }}>Sign in</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-base)', textAlign: 'center', marginTop: 'var(--space-1)' }}>Start free trial</Link>
          </div>
        )}
      </div>

      {/* Spacer for fixed navbar */}
      <div style={{ height: 72 }} aria-hidden="true" />

      <main id="main-content">
        {/* ChaosHero — scroll-driven */}
        <ChaosHero />

        {/* Proof bar */}
        {/* Proof bar with animated counters */}
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
              { pre: '', counter: 200, suffix: '+', post: ' creators onboarded' },
              { pre: '', counter: 30, suffix: 's', post: ' to generate invoice' },
              { pre: '', counter: 100, suffix: '%', post: ' GST compliant' },
              { pre: '', counter: 4, suffix: '.9★', post: ' average rating' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  <AnimatedCounter to={item.counter} suffix={item.suffix} duration={1400 + i * 100} />
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                  {item.post}
                </div>
              </div>
            ))}
          </div>
        </div>
        </Reveal>

        {/* ── Social Proof ──────────────────────────────────── */}
        <Reveal>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-16) var(--space-6) 0' }}>
          {/* Testimonial cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-12)' }}>
            {[
              {
                quote: "I used to send WhatsApp screenshots to brands and pray they paid. Now I send a proper GST invoice in 2 minutes.",
                name: "Priya R.",
                role: "Tech YouTuber · 180K subs",
                initials: "PR",
                color: "#8B5CF6",
              },
              {
                quote: "Got a GST notice in March. Found Kcretio. Haven't missed a deadline since. The advance tax planner alone is worth it.",
                name: "Arjun S.",
                role: "Finance Creator · 95K subs",
                initials: "AS",
                color: "#E8921A",
              },
              {
                quote: "My CA was spending 2 hours decoding my spreadsheets. Now I just export the annual summary and we're done in 20 minutes.",
                name: "Meera K.",
                role: "Lifestyle Instagrammer · 210K subs",
                initials: "MK",
                color: "#10B981",
              },
            ].map((t) => (
              <div key={t.name} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
              }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.7, flex: 1, margin: 0 }}>
                  "{t.quote}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
                  }} aria-hidden="true">{t.initials}</div>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        </Reveal>

        {/* ── How It Works ──────────────────────────────────── */}
        <Reveal>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 var(--space-6) var(--space-20)', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
            HOW IT WORKS
          </p>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-10)' }}>
            A GST invoice in 30 seconds. Seriously.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-8)', position: 'relative' }}>
            {[
              { num: '01', icon: FileText,  title: 'Enter deal details', desc: 'Brand name, deal amount. Your GSTIN, SAC code 998399, and place of supply are auto-filled from your profile.' },
              { num: '02', icon: Eye,        title: 'Preview live',        desc: 'See exactly what the brand receives — Rule 46 CGST compliant. GST split (CGST/SGST or IGST) calculated automatically.' },
              { num: '03', icon: Download,   title: 'Download PDF',        desc: "Send to the brand's finance team. They process payment. You get paid faster, minus 10% TDS which you track here." },
            ].map((step) => (
              <div key={step.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                    background: 'var(--accent-dim)', border: '1px solid rgba(232,146,26,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)',
                  }}>
                    <step.icon size={22} aria-hidden="true" />
                  </div>
                  <span style={{
                    position: 'absolute', top: -10, right: -10,
                    fontSize: 10, fontWeight: 800, color: 'var(--accent)',
                    background: 'var(--bg)', padding: '0 4px', lineHeight: 1,
                    letterSpacing: '0.04em',
                  }}>{step.num}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.65, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        </Reveal>

        {/* Features */}
        <section id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-20) var(--space-6)' }}>
          <Reveal>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            Everything a creator needs to handle taxes
          </h2>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 'var(--space-10)', maxWidth: 500, margin: '0 auto var(--space-10)' }}>
            No CA needed for day-to-day. No spreadsheets. No WhatsApp invoices.
          </p>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
            {[
              {
                title: 'GST Invoice Generator',
                tag: 'Most used',
                desc: 'Generate compliant invoices in 30 seconds. Auto-fills your GSTIN, HSN code 998399, place of supply, and splits CGST/SGST or IGST automatically based on brand state.',
              },
              {
                title: 'TDS Tracker',
                tag: 'Saves ₹ at ITR time',
                desc: 'Brands deduct 10% TDS before paying. Track every deduction, every brand, every Form 16A. See exactly how much TDS credit you can claim at year-end.',
              },
              {
                title: 'Advance Tax Planner',
                tag: 'No more March panic',
                desc: 'Automatically calculates your quarterly advance tax instalments from your logged income. Email reminders 14 days and 2 days before each deadline.',
              },
              {
                title: 'Brand Deals CRM',
                tag: 'Pipeline to payment',
                desc: 'Track deals from inquiry to paid. Kanban board on desktop, list on mobile. Mark a deal paid and income is auto-logged. Generate invoice directly from a deal.',
              },
              {
                title: 'Income Dashboard',
                tag: 'All sources in one view',
                desc: 'AdSense, brand deals, Instagram bonuses, affiliate — all logged in one place. Month-over-month charts, quarterly breakdown, financial year summary.',
              },
              {
                title: 'CA Export',
                tag: 'ITR-ready summary',
                desc: 'At year-end, export a clean annual summary: all invoices, all TDS records, P&L statement, expenses — formatted for CA submission. Save hours in March.',
              },
            ].map((f, fi) => (
              <Reveal key={f.title} delay={fi * 60}>
              <div
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
                  display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                  height: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {f.title}
                  </h3>
                  <span style={{
                    padding: '1px 8px', background: 'var(--accent-dim)', color: 'var(--accent)',
                    borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {f.tag}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.6, flex: 1 }}>
                  {f.desc}
                </p>
              </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Comparison Table ──────────────────────────────── */}
        <Reveal>
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 var(--space-6) var(--space-20)' }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
            WHY NOT JUST USE A SPREADSHEET?
          </p>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 'var(--space-10)' }}>
            Built for this. Nothing else is.
          </h2>

          {/* Desktop table */}
          <div className="comparison-desktop" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>Feature</th>
                  {['Kcretio', 'Google Sheets', 'Zoho Books', 'CA', 'ClearTax'].map((col, ci) => (
                    <th key={col} style={{
                      padding: 'var(--space-3) var(--space-4)',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                      color: ci === 0 ? 'var(--accent)' : 'var(--text-muted)',
                      borderBottom: `2px solid ${ci === 0 ? 'var(--accent)' : 'var(--border)'}`,
                      background: ci === 0 ? 'var(--accent-dim)' : 'transparent',
                      borderLeft: ci === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined,
                      borderRight: ci === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined,
                    }}>
                      {ci === 0 ? '★ ' : ''}{col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'GST Invoice (creator SAC 998399)',     vals: ['✓', '✗', 'Partial', '✗', '✗'] },
                  { feature: 'TDS tracking from 30+ brands',         vals: ['✓', 'Manual', '✗', '✗', '✗'] },
                  { feature: 'Advance tax reminders',                vals: ['✓', '✗', '✗', 'Year-end', '✗'] },
                  { feature: 'Brand deal pipeline CRM',              vals: ['✓', 'Manual', '✗', '✗', '✗'] },
                  { feature: 'Built for Indian creators',            vals: ['✓', '✗', '✗', '✗', '✗'] },
                  { feature: 'Year-round OS (not just filing)',      vals: ['✓', '✗', '✗', '✗', '✗'] },
                  { feature: 'Price',                                 vals: ['₹299/mo', 'Free', '₹1,200/mo', '₹5,000/yr', '₹999/yr'] },
                ].map((row, ri) => (
                  <tr key={row.feature} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-body)', fontWeight: 500 }}>{row.feature}</td>
                    {row.vals.map((v, vi) => (
                      <td key={vi} style={{
                        padding: 'var(--space-3) var(--space-4)',
                        textAlign: 'center',
                        fontWeight: vi === 0 ? 700 : 400,
                        color: vi === 0
                          ? (v === '✓' ? 'var(--accent)' : 'var(--text-primary)')
                          : v === '✓' ? 'var(--success-text)' : v === '✗' ? 'var(--text-disabled)' : 'var(--text-muted)',
                        background: vi === 0 ? 'var(--accent-dim)' : 'transparent',
                        borderLeft: vi === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined,
                        borderRight: vi === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined,
                      }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <style>{`
            @media (max-width: 640px) {
              .comparison-desktop { display: none; }
              .comparison-mobile { display: flex !important; }
            }
            @media (min-width: 641px) {
              .comparison-mobile { display: none !important; }
            }
          `}</style>
          <div className="comparison-mobile" style={{ flexDirection: 'column', gap: 'var(--space-3)', display: 'none' }}>
            {[
              { feature: 'GST Invoice (creator SAC)',     ours: '✓ Included', others: 'Not in any competitor' },
              { feature: 'TDS from 30+ brands',           ours: '✓ Automatic', others: 'Manual spreadsheet at best' },
              { feature: 'Advance tax reminders',         ours: '✓ 14d + 2d alerts', others: 'Not available' },
              { feature: 'Brand deal pipeline',           ours: '✓ Kanban + list', others: 'Build it yourself' },
              { feature: 'Price',                         ours: 'From ₹299/mo', others: 'Zoho ₹1,200/mo · CA ₹5,000/yr' },
            ].map(row => (
              <div key={row.feature} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>{row.feature}</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{row.ours}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{row.others}</div>
              </div>
            ))}
          </div>
        </section>
        </Reveal>

        {/* Pricing */}
        <section id="pricing" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 var(--space-6) var(--space-20)', textAlign: 'center' }}>
          <Reveal>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
            Less than a CA consultation. Available year-round.
          </p>

          {/* Annual/Monthly toggle */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: 3, marginBottom: 'var(--space-8)', gap: 2 }}>
            {[{ label: 'Monthly', val: false }, { label: 'Annual (2m free)', val: true }].map(opt => (
              <button
                key={String(opt.val)}
                onClick={() => setAnnual(opt.val)}
                style={{
                  padding: 'var(--space-1) var(--space-4)',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)',
                  border: 'none',
                  cursor: 'pointer',
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
            {[
              {
                name: 'Basic',
                monthly: 0,
                annual: 0,
                features: ['5 invoices/month (watermarked PDF)', '10 TDS entries total', '3 invoice templates', 'Basic compliance calendar (2 deadlines)'],
                highlight: false,
                isFree: true,
              },
              { name: 'Starter', monthly: 299, annual: 249, features: ['Unlimited invoices (clean PDF)', 'All 7 invoice templates', 'Unlimited TDS tracking', 'Full compliance calendar + email reminders', 'Expense tracker'], highlight: false },
              { name: 'Pro', monthly: 599, annual: 499, features: ['Everything in Starter', 'Advance tax calculator', 'P&L dashboard', 'CA annual export'], highlight: true },
              { name: 'Business', monthly: 1499, annual: 1249, features: ['Everything in Pro', 'Multi-creator (up to 5)', 'White-label invoices', 'Priority support'], highlight: false },
            ].map((plan, pi) => {
              const price = annual ? plan.annual : plan.monthly;
              const saving = Math.round((plan.monthly - plan.annual) * 12);
              return (
                <Reveal key={plan.name} delay={pi * 80}>
                <div
                  style={{
                    background: 'var(--surface)', padding: 'var(--space-6)',
                    border: `1px solid ${plan.highlight ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-xl)', position: 'relative',
                    height: '100%',
                  }}
                >
                  {plan.highlight && (
                    <div style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--accent)', color: '#fff', padding: '2px var(--space-3)',
                      borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>
                      Most Popular
                    </div>
                  )}
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                    {plan.name}
                  </h3>
                  <div style={{ marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                    {plan.isFree ? (
                      <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Free</span>
                    ) : (
                      <>
                        {annual && (
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
                  {annual && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success-text)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                      Save ₹{saving.toLocaleString('en-IN')}/year
                    </div>
                  )}
                  {!annual && <div style={{ marginBottom: 'var(--space-4)' }} />}
                  <ul style={{ textAlign: 'left', marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {plan.features.map((f) => (
                      <li key={f} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    style={{
                      display: 'block', padding: 'var(--space-2) var(--space-4)', textAlign: 'center',
                      background: plan.highlight ? 'var(--accent)' : 'transparent',
                      color: plan.highlight ? '#fff' : 'var(--text-body)',
                      border: `1px solid ${plan.highlight ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)',
                      transition: 'background var(--duration-fast)',
                    }}
                    onMouseEnter={e => { if (plan.highlight) e.currentTarget.style.background = 'var(--accent-hover)'; else e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = plan.highlight ? 'var(--accent)' : 'transparent'; }}
                  >
                    Start free trial
                  </Link>
                </div>
                </Reveal>
              );
            })}
          </div>
          <p style={{ marginTop: 'var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {annual ? 'Billed annually · ' : ''}Annual plans get 2 months free · No credit card for trial
          </p>

          {/* Trust badges */}
          <Reveal>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-5)', marginTop: 'var(--space-8)', paddingTop: 'var(--space-8)', borderTop: '1px solid var(--border)' }}>
            {[
              { icon: Lock,       label: 'AES-256 Encrypted' },
              { icon: Shield,     label: 'Data stored in India' },
              { icon: RefreshCw,  label: 'Cancel anytime' },
              { icon: Calendar,   label: '28-day free trial' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 500 }}>
                <Icon size={14} aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ maxWidth: 680, margin: '0 auto', padding: '0 var(--space-6) var(--space-20)' }}>
          <Reveal>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            Frequently asked questions
          </h2>
          </Reveal>
          <Reveal delay={80}>
          <FaqAccordion />
          </Reveal>
        </section>

        {/* Final CTA band */}
        <Reveal>
        <div style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: 'var(--space-16) var(--space-6)',
          textAlign: 'center',
        }}>
          <h2 className="display" style={{ marginBottom: 'var(--space-4)', maxWidth: 520, margin: '0 auto var(--space-4)' }}>
            Stop losing money to <em>tax confusion.</em>
          </h2>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
            Join 200+ creators who handle GST, TDS, and advance tax on their own.
          </p>
          <Link
            to="/register"
            style={{
              display: 'inline-block',
              padding: 'var(--space-3) var(--space-10)',
              background: 'var(--accent)', color: '#fff',
              borderRadius: 'var(--radius-md)', fontWeight: 700,
              fontSize: 'var(--text-md)',
            }}
          >
            Start free — no credit card
          </Link>
        </div>
        </Reveal>
      </main>

      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: 'var(--space-8) var(--space-6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div aria-hidden="true" style={{ width: 22, height: 22, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#fff' }}>C</div>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Kcretio · Built for Indian creators</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
          {['Privacy Policy', 'Terms of Service', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{l}</a>
          ))}
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>© 2025 Kcretio</span>
      </footer>
    </div>
  );
}

