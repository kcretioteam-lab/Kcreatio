/**
 * LandingPageV6 — Kcreatio
 * Hero: cinematic 5-scene scroll narrative (HeroV6)
 * Below fold: features, social proof, pricing, final CTA
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, TrendingDown, Calendar, Briefcase,
  BarChart2, Download, Check, Menu, X, Sun, Moon,
  ArrowRight, Zap, Shield, IndianRupee,
} from 'lucide-react';
import HeroV6 from '../components/hero/HeroV6.jsx';
import { useTheme } from '../App.jsx';

// ─── Tokens (dark-first hero overrides) ──────────────────────────────────────

const S = {
  // palette
  bg:       '#07080f',
  surface:  'rgba(255,255,255,0.04)',
  border:   'rgba(255,255,255,0.08)',
  accent:   '#E8921A',
  accentDim:'rgba(232,146,26,0.12)',
  text:     'rgba(255,255,255,0.88)',
  muted:    'rgba(255,255,255,0.44)',
  faint:    'rgba(255,255,255,0.16)',
  // type
  display:  'clamp(32px, 4vw, 52px)',
  h2:       'clamp(22px, 2.6vw, 32px)',
  body:     'clamp(14px, 1.4vw, 16px)',
  // spacing
  sectionPad: 'clamp(80px, 10vw, 120px) clamp(20px, 5vw, 60px)',
};

// ─── Intersection reveal hook ─────────────────────────────────────────────────

function useReveal(threshold = 0.12) {
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

function Reveal({ children, delay = 0, style: sx }) {
  const [ref, vis] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.7s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        ...sx,
      }}
    >
      {children}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '0 clamp(20px, 5vw, 60px)',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: scrolled ? 'rgba(7,8,15,0.9)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease',
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: S.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 900, color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}>C</div>
        <span style={{
          fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
          letterSpacing: '-0.02em', fontFamily: 'system-ui, sans-serif',
        }}>
          Kcreatio
        </span>
      </Link>

      {/* Desktop nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="nav-desktop">
        {['Features', 'Pricing', 'Blog'].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`} style={{
            fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
            fontFamily: 'system-ui, sans-serif', fontWeight: 500,
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.88)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
          >{item}</a>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={toggleTheme}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', padding: 6, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <Link to="/login" style={{
          fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
          fontFamily: 'system-ui, sans-serif', fontWeight: 500, padding: '6px 12px',
        }}>
          Login
        </Link>
        <Link to="/register" style={{
          fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none',
          background: S.accent, padding: '7px 16px', borderRadius: 7,
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 0 20px rgba(232,146,26,0.25)',
        }}>
          Start free
        </Link>
      </div>
    </nav>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: FileText,
    color: '#E8921A',
    title: 'GST Invoice Generator',
    desc: 'Rule 46-compliant invoices with auto CGST/SGST/IGST, SAC code 998399, state codes. Send to brands in 30 seconds.',
    badge: 'Most used',
  },
  {
    icon: TrendingDown,
    color: '#3B82F6',
    title: 'TDS Tracker',
    desc: 'Log every deduction. Track Form 16A status from every brand. Reconcile everything at year-end with one export.',
  },
  {
    icon: Calendar,
    color: '#F59E0B',
    title: 'Advance Tax Planner',
    desc: 'Know exactly how much to pay on Jun 15, Sep 15, Dec 15, Mar 15. No March shock. 14-day reminders included.',
    badge: 'Fan favourite',
  },
  {
    icon: Briefcase,
    color: '#8B5CF6',
    title: 'Brand Deal CRM',
    desc: 'Inquiry → Negotiating → Active → Delivered → Paid. Mark paid, income logs itself, invoice generates automatically.',
  },
  {
    icon: BarChart2,
    color: '#10B981',
    title: 'Income Dashboard',
    desc: 'P&L overview with monthly charts. All ₹ values in Indian notation. April–March financial year. Not Jan–Dec.',
  },
  {
    icon: Download,
    color: '#06B6D4',
    title: 'CA Export',
    desc: 'Annual income summary formatted for ITR-3/ITR-4. Every invoice, every TDS, every expense. One click.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" style={{
      background: S.bg,
      padding: S.sectionPad,
      position: 'relative',
    }}>
      {/* Top separator */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <Reveal>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.accent, marginBottom: 12, fontFamily: 'system-ui, sans-serif' }}>
            Everything you need
          </p>
          <h2 style={{ fontSize: S.h2, fontWeight: 700, color: S.text, letterSpacing: '-0.03em', margin: '0 0 12px', fontFamily: 'system-ui, sans-serif' }}>
            Built for Indian creator tax law.
            <br />
            <span style={{ color: S.muted, fontWeight: 400 }}>Not adapted from retail GST tools.</span>
          </h2>
        </Reveal>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 1,
          marginTop: 48,
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <FeatureCard f={f} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ f }) {
  const Icon = f.icon;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '28px 28px 24px',
        background: hovered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.2s ease',
        position: 'relative',
      }}
    >
      {f.badge && (
        <span style={{
          position: 'absolute', top: 20, right: 20,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          color: f.color, background: `rgba(${hexToRgb(f.color)},0.12)`,
          border: `1px solid rgba(${hexToRgb(f.color)},0.2)`,
          padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif',
        }}>{f.badge}</span>
      )}
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: `rgba(${hexToRgb(f.color)},0.12)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        transition: 'transform 0.2s ease',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
      }}>
        <Icon size={17} color={f.color} />
      </div>
      <h3 style={{
        fontSize: 15, fontWeight: 700, color: S.text, margin: '0 0 8px',
        letterSpacing: '-0.01em', fontFamily: 'system-ui, sans-serif',
      }}>{f.title}</h3>
      <p style={{
        fontSize: 13, color: S.muted, lineHeight: 1.65, margin: 0,
        fontFamily: 'system-ui, sans-serif',
      }}>{f.desc}</p>
    </div>
  );
}

// ─── Pain → Solution strip ────────────────────────────────────────────────────

const PAIN_ITEMS = [
  { pain: 'Brand holds payment until you send a GST invoice', fix: 'Generate in 30 seconds' },
  { pain: 'You paid TDS but have no record — Form 16A never came', fix: 'Every deduction logged & tracked' },
  { pain: 'March 31 advance tax shock + 1% monthly interest', fix: 'Know your quarterly amount in advance' },
  { pain: 'Spreadsheet with 15 tabs for deals, income, expenses', fix: 'One dashboard. One export for CA.' },
];

function PainSolutionSection() {
  return (
    <section style={{ background: '#0a0b14', padding: S.sectionPad, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <Reveal>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.accent, marginBottom: 12, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
            Why creators switch
          </p>
          <h2 style={{ fontSize: S.h2, fontWeight: 700, color: S.text, letterSpacing: '-0.03em', margin: '0 0 48px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
            Zoho Books is for retail. Tally is for accountants.
            <br />
            <span style={{ color: S.muted, fontWeight: 400 }}>Kcreatio is for you.</span>
          </h2>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {PAIN_ITEMS.map((item, i) => (
            <Reveal key={i} delay={i * 80}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 20,
                padding: '20px 24px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>😩</span>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
                    {item.pain}
                  </p>
                </div>
                <ArrowRight size={14} color="rgba(232,146,26,0.5)" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5, fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                    {item.fix}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Social proof ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "I was chasing Mamaearth for payment for 3 weeks. Turns out they needed a GST invoice with the exact GSTIN format. Kcreatio fixed this in my first session.",
    name: "Priya S.",
    handle: "@priyacooks",
    followers: "182K YouTube",
    avatar: "P",
    color: '#E8921A',
  },
  {
    quote: "My CA charged ₹6,000 to just organise my TDS certificates at year end. Now I do it myself in 20 minutes. This product pays for itself in month one.",
    name: "Rohan M.",
    handle: "@rohanbuilds",
    followers: "94K Instagram",
    avatar: "R",
    color: '#3B82F6',
  },
  {
    quote: "The advance tax planner showed me I owed ₹74,000 by September. I would have found out in March and paid interest. Genuinely saved me money.",
    name: "Ananya K.",
    handle: "@ananyafinance",
    followers: "210K YouTube",
    avatar: "A",
    color: '#10B981',
  },
];

function SocialProofSection() {
  return (
    <section style={{ background: S.bg, padding: S.sectionPad, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <Reveal style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.accent, marginBottom: 12, fontFamily: 'system-ui, sans-serif' }}>
            Creator stories
          </p>
          <h2 style={{ fontSize: S.h2, fontWeight: 700, color: S.text, letterSpacing: '-0.03em', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
            Real problems. Real fixes.
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <TestimonialCard t={t} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ t }) {
  return (
    <div style={{
      padding: '24px',
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <p style={{
        fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7,
        margin: 0, fontStyle: 'italic', fontFamily: 'system-ui, sans-serif',
      }}>
        "{t.quote}"
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `rgba(${hexToRgb(t.color)},0.2)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: t.color, flexShrink: 0,
          fontFamily: 'system-ui, sans-serif',
        }}>{t.avatar}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.text, fontFamily: 'system-ui, sans-serif' }}>{t.name}</div>
          <div style={{ fontSize: 11, color: S.muted, fontFamily: 'system-ui, sans-serif' }}>{t.handle} · {t.followers}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Starter',
    price: '₹299',
    period: '/month',
    desc: 'For creators just getting started with GST compliance.',
    features: [
      'Unlimited GST invoices',
      'TDS tracker',
      'Compliance calendar',
      '7 invoice templates',
      'Email support',
    ],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹599',
    period: '/month',
    desc: 'For creators managing 5+ brand deals/month.',
    features: [
      'Everything in Starter',
      'Advance tax calculator',
      'P&L dashboard + charts',
      'Brand deal CRM',
      'CA export (ITR-3/4)',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Business',
    price: '₹1,499',
    period: '/month',
    desc: 'For agencies managing multiple creators.',
    features: [
      'Everything in Pro',
      'Up to 5 creators',
      'White-label invoices',
      'Dedicated onboarding',
      'SLA support',
    ],
    cta: 'Contact us',
    highlight: false,
  },
];

function PricingSection() {
  return (
    <section id="pricing" style={{ background: '#0a0b14', padding: S.sectionPad, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      <div style={{ maxWidth: 1020, margin: '0 auto' }}>
        <Reveal style={{ textAlign: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.accent, marginBottom: 12, fontFamily: 'system-ui, sans-serif' }}>
            Pricing
          </p>
          <h2 style={{ fontSize: S.h2, fontWeight: 700, color: S.text, letterSpacing: '-0.03em', margin: '0 0 8px', fontFamily: 'system-ui, sans-serif' }}>
            Less than your CA charges for one hour.
          </h2>
          <p style={{ fontSize: 14, color: S.muted, margin: '0 0 16px', fontFamily: 'system-ui, sans-serif' }}>
            28-day free trial on all plans. No credit card required.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(232,146,26,0.1)', border: '1px solid rgba(232,146,26,0.2)',
            borderRadius: 20, padding: '5px 14px',
            fontSize: 12, color: S.accent, fontFamily: 'system-ui, sans-serif', fontWeight: 600,
          }}>
            <Zap size={11} /> Annual billing = 2 months free
          </div>
        </Reveal>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginTop: 48,
        }}>
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 80}>
              <PricingCard plan={plan} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <div style={{
            marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center',
            color: S.muted, fontSize: 12, fontFamily: 'system-ui, sans-serif',
          }}>
            {['28-day free trial', 'Cancel anytime', 'No setup fee', 'INR billing'].map(item => (
              <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={12} color={S.accent} /> {item}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PricingCard({ plan }) {
  return (
    <div style={{
      padding: '28px 24px',
      background: plan.highlight ? 'rgba(232,146,26,0.06)' : 'rgba(255,255,255,0.02)',
      border: plan.highlight ? '1px solid rgba(232,146,26,0.3)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      position: 'relative',
    }}>
      {plan.badge && (
        <div style={{
          position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
          background: S.accent, color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '3px 12px', borderRadius: '0 0 8px 8px', letterSpacing: '0.06em',
          textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif',
        }}>{plan.badge}</div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: S.text, marginBottom: 4, fontFamily: 'system-ui, sans-serif' }}>{plan.name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 8 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: S.text, letterSpacing: '-0.04em', fontFamily: 'system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{plan.price}</span>
        <span style={{ fontSize: 13, color: S.muted, fontFamily: 'system-ui, sans-serif' }}>{plan.period}</span>
      </div>
      <p style={{ fontSize: 12, color: S.muted, margin: '0 0 20px', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>{plan.desc}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, flex: 1 }}>
        {plan.features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Check size={13} color={plan.highlight ? S.accent : '#10B981'} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)', fontFamily: 'system-ui, sans-serif' }}>{f}</span>
          </div>
        ))}
      </div>
      <Link to="/register" style={{
        display: 'block', textAlign: 'center', padding: '11px 20px',
        background: plan.highlight ? S.accent : 'rgba(255,255,255,0.06)',
        color: plan.highlight ? '#fff' : 'rgba(255,255,255,0.7)',
        borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none',
        fontFamily: 'system-ui, sans-serif',
        border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: plan.highlight ? '0 0 24px rgba(232,146,26,0.3)' : 'none',
        transition: 'opacity 0.15s ease',
      }}
        onMouseEnter={e => e.target.style.opacity = '0.85'}
        onMouseLeave={e => e.target.style.opacity = '1'}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

// ─── Trust strip ──────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { icon: Shield, label: 'GST Rule 46 compliant', sub: 'CGST Rules 2017' },
  { icon: IndianRupee, label: 'SAC code 998399', sub: 'Content creation services' },
  { icon: Zap, label: '28-day free trial', sub: 'No credit card needed' },
  { icon: Check, label: 'ITR-3/4 ready export', sub: 'CA-formatted output' },
];

function TrustStrip() {
  return (
    <section style={{
      background: S.bg, borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '28px clamp(20px, 5vw, 60px)',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto',
        display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-around',
      }}>
        {TRUST_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={16} color={S.accent} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: S.text, fontFamily: 'system-ui, sans-serif' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: S.muted, fontFamily: 'system-ui, sans-serif' }}>{item.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section style={{ background: S.bg, padding: S.sectionPad, position: 'relative', textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      {/* Background glow */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(232,146,26,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 540, margin: '0 auto', position: 'relative' }}>
        <Reveal>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.accent, marginBottom: 16, fontFamily: 'system-ui, sans-serif' }}>
            Start today
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, color: S.text, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.15, fontFamily: 'system-ui, sans-serif' }}>
            Your next brand deal deserves
            a proper invoice.
          </h2>
          <p style={{ fontSize: 14, color: S.muted, margin: '0 0 32px', lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}>
            Join creators who stopped using Google Sheets for their finances.
            28 days free. No credit card.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              padding: '14px 32px', background: S.accent, color: '#fff',
              borderRadius: 8, fontWeight: 700, fontSize: 15, textDecoration: 'none',
              boxShadow: '0 0 40px rgba(232,146,26,0.3)', fontFamily: 'system-ui, sans-serif',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              Start 28-day free trial <ArrowRight size={15} />
            </Link>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 12, fontFamily: 'system-ui, sans-serif' }}>
            Already have an account? <Link to="/login" style={{ color: S.accent, textDecoration: 'none' }}>Login →</Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{
      background: '#040508',
      padding: '32px clamp(20px, 5vw, 60px)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 5,
            background: S.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 900, color: '#fff', fontFamily: 'system-ui, sans-serif',
          }}>C</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui, sans-serif' }}>
            Kcreatio
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
          Built for Indian creators who deserve real financial infrastructure.
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy', 'Terms', 'Contact'].map(item => (
            <a key={item} href="#" style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', fontFamily: 'system-ui, sans-serif' }}>{item}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPageV6() {
  useEffect(() => {
    // Force dark bg on page
    document.documentElement.style.setProperty('--bg-hero', '#07080f');
    document.body.style.background = '#07080f';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  return (
    <div style={{ background: S.bg, minHeight: '100vh' }}>
      <Navbar />
      {/* Hero must NOT be inside an overflow:hidden ancestor — sticky depends on it */}
      <HeroV6 />
      {/* Below-fold sections can safely clip horizontal overflow */}
      <div style={{ overflowX: 'hidden' }}>
      <TrustStrip />
      <FeaturesSection />
      <PainSolutionSection />
      <SocialProofSection />
      <PricingSection />
      <FinalCTASection />
      <Footer />
      </div>
    </div>
  );
}

// ─── util ─────────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
