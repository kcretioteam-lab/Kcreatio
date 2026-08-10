import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScrollProgress } from '../../hooks/useScrollProgress.js';

// Fragment positions from spec
const FRAGMENTS = [
  { id: 'invoice',  startX: -480, startY: -200, startR: -22, component: FragmentInvoice  },
  { id: 'tds',      startX:  420, startY: -220, startR:  18, component: FragmentTDS      },
  { id: 'deadline', startX: -420, startY:  230, startR:  14, component: FragmentDeadline },
  { id: 'income',   startX:  400, startY:  200, startR: -16, component: FragmentIncome   },
  { id: 'deals',    startX:  520, startY:   10, startR:   8, component: FragmentDeals    },
];

export default function ChaosHero() {
  const sectionRef = useRef(null);
  const progress = useScrollProgress(sectionRef);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    check();
    window.addEventListener('resize', check, { passive: true });
    // Stagger entrance
    const t = setTimeout(() => setMounted(true), 50);
    return () => { window.removeEventListener('resize', check); clearTimeout(t); };
  }, []);

  const phase =
    progress > 0.65 ? 'resolved' :
    progress > 0.04 ? 'converging' :
    'chaos';

  const converged = phase === 'converging' || phase === 'resolved';
  const disappear = phase === 'resolved';

  // Spotlight opacity
  const spotlightOpacity =
    phase === 'resolved'   ? 0.09 :
    phase === 'converging' ? Math.min(0.13, 0.04 + progress * 0.14) :
    0.03;

  // Background gradient fades from warm saffron glow → pure dark
  const bgGradient = `radial-gradient(ellipse 120% 60% at 50% 110%,
    rgba(232, 146, 26, ${0.06 - progress * 0.04}) 0%,
    rgba(14, 16, 24, ${0.9 - progress * 0.3}) 35%,
    rgba(7, 8, 15, 1) 65%)`;

  const sectionHeight = isMobile ? 'auto' : isTablet ? '220vh' : '280vh';

  if (isMobile) {
    return (
      <section
        ref={sectionRef}
        style={{ background: 'var(--bg)', position: 'relative' }}
        aria-label="Hero section"
      >
        {/* Static resolved CTA on mobile */}
        <div style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 var(--space-6)',
          background: bgGradient,
        }}>
          <NoiseTexture />
          <ResolvedCTA />
        </div>

        {/* Fragment cards as horizontal swipe strip */}
        <div style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          display: 'flex',
          gap: 'var(--space-4)',
          padding: 'var(--space-4) var(--space-6)',
        }}>
          {FRAGMENTS.map(f => (
            <div key={f.id} style={{
              scrollSnapAlign: 'start',
              flexShrink: 0,
              width: 200,
            }}>
              <f.component />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      style={{ height: sectionHeight, position: 'relative' }}
      aria-label="Hero section"
    >
      {/* Sticky viewport */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bgGradient,
      }}>
        <NoiseTexture />

        {/* Stage spotlight */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: 900,
            height: 900,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(232,146,26,${spotlightOpacity}) 0%, transparent 70%)`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
            transition: 'opacity var(--duration-slow)',
          }}
        />

        {/* Headline — phases */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 2,
          width: '100%',
          padding: '0 var(--space-6)',
        }}>
          {phase !== 'resolved' && (
            <p style={{
              fontSize: 'clamp(22px, 2.4vw, 36px)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              opacity: phase === 'chaos' ? 1 : Math.max(0, 1 - (progress - 0.04) / 0.2),
              transition: 'opacity var(--duration-standard)',
            }}>
              {phase === 'chaos'
                ? 'GST notice. Tax panic. Spreadsheet chaos.'
                : 'Your creator business, finally organised.'}
            </p>
          )}
        </div>

        {/* Resolved CTA */}
        {phase === 'resolved' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${disappear ? 1 : 0.97})`,
            opacity: disappear ? 1 : 0,
            transition: 'opacity var(--duration-moderate) var(--ease-decelerate), transform var(--duration-moderate)',
            textAlign: 'center',
            zIndex: 10,
            pointerEvents: 'auto',
          }}>
            <ResolvedCTA withRule />
          </div>
        )}

        {/* Fragment cards */}
        {FRAGMENTS.map((frag, i) => {
          const offsetScale = isTablet ? 0.65 : 1;
          const sx = frag.startX * offsetScale;
          const sy = frag.startY * offsetScale;
          const sr = frag.startR;

          return (
            <div
              key={frag.id}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `
                  translate(
                    calc(-50% + ${converged ? 0 : sx}px),
                    calc(-50% + ${converged ? 0 : sy}px)
                  )
                  rotate(${converged ? 0 : sr}deg)
                  scale(${disappear ? 0.12 : mounted ? 1 : 0.6})
                `,
                opacity: disappear ? 0 : mounted ? 1 : 0,
                transition: [
                  converged
                    ? `transform 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 30}ms`
                    : `transform 0.6s cubic-bezier(0.34,1.3,0.64,1) ${(i+1)*80}ms`,
                  `opacity 0.4s ease ${(i+1)*80}ms`,
                ].join(', '),
                willChange: 'transform',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              <frag.component />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResolvedCTA({ withRule }) {
  return (
    <div>
      <p style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--accent)',
        marginBottom: 'var(--space-4)',
      }}>
        Financial OS for Indian Creators
      </p>
      {withRule && (
        <div style={{
          width: 80,
          height: 1,
          background: 'var(--accent)',
          margin: '0 auto var(--space-5)',
          animation: 'ruleExpand 0.7s ease forwards',
        }} />
      )}
      <h1 className="display" style={{ marginBottom: 'var(--space-5)', maxWidth: 640, margin: '0 auto var(--space-5)' }}>
        GST invoices for creators. <em>In 30 seconds.</em>
      </h1>
      <p style={{
        fontSize: 'var(--text-lg)',
        color: 'var(--text-body)',
        maxWidth: 480,
        margin: '0 auto var(--space-8)',
        lineHeight: 1.6,
      }}>
        Stop chasing brands for payments. Generate compliant invoices, track TDS, plan advance tax.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to="/register"
          style={{
            padding: 'var(--space-3) var(--space-8)',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: 'var(--text-md)',
            display: 'inline-block',
          }}
        >
          Start 28-day free trial
        </Link>
        <a
          href="#features"
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'transparent',
            color: 'var(--text-body)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            fontSize: 'var(--text-md)',
          }}
        >
          See features
        </a>
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
        No credit card required · 28-day free trial
      </p>
    </div>
  );
}

function NoiseTexture() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.02, pointerEvents: 'none' }}
    >
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  );
}

// ─── Fragment Cards ──────────────────────────────────────────────────────────

function FragCard({ children, width = 220 }) {
  return (
    <div style={{
      width,
      background: 'var(--surface)',
      border: '1px solid var(--border-2)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-body)',
      fontFamily: "'Inter', sans-serif",
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }} />;
}

function FragmentInvoice() {
  return (
    <FragCard width={220}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <div>
          <div className="label" style={{ marginBottom: 2 }}>GST INVOICE</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>#INV-0042</div>
        </div>
        <span style={{ padding: '2px 6px', background: 'var(--success-dim)', color: 'var(--success-text)', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700 }}>PAID</span>
      </div>
      <Divider />
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Mamaearth Pvt Ltd</div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-body)' }}>27AAACM9517F1ZW</div>
      <Divider />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div className="label">AMOUNT</div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>₹45,000</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">GST 18%</div>
          <div style={{ fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>+₹8,100</div>
        </div>
      </div>
    </FragCard>
  );
}

function FragmentTDS() {
  const rows = [
    { brand: 'boAt',    inv: '₹62,000', tds: '₹6,200', ok: true },
    { brand: 'PhonePe', inv: '₹28,000', tds: '₹2,800', ok: false },
    { brand: 'Noise',   inv: '₹20,000', tds: '₹2,000', ok: true },
  ];
  return (
    <FragCard width={240}>
      <div className="label" style={{ marginBottom: 'var(--space-3)' }}>TDS TRACKER — FY 2025–26</div>
      <Divider />
      {rows.map(r => (
        <div key={r.brand} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, width: 56 }}>{r.brand}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', width: 50 }}>{r.inv}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--warning-text)', width: 44 }}>{r.tds}</span>
          {r.ok
            ? <span style={{ color: 'var(--success-text)', fontSize: 10, fontWeight: 700 }}>16A ✓</span>
            : <span style={{ color: 'var(--warning-text)', fontSize: 10 }}>Awaiting</span>
          }
        </div>
      ))}
    </FragCard>
  );
}

function FragmentDeadline() {
  const rows = [
    { date: 'Jun 15', label: 'Q1 Advance Tax', amt: '₹18,500' },
    { date: 'Sep 15', label: 'Q2 Advance Tax', amt: '₹18,500' },
    { date: 'Mar 15', label: 'Q4 Advance Tax', amt: '₹37,000' },
  ];
  return (
    <FragCard width={210}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <div style={{ width: 24, height: 24, background: 'var(--accent-dim)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📅</div>
        <div>
          <div className="label">ADVANCE TAX</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>FY 2025–26</div>
        </div>
      </div>
      <Divider />
      {rows.map(r => (
        <div key={r.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', alignItems: 'center' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 11, width: 38 }}>{r.date}</span>
          <span style={{ color: 'var(--text-muted)', flex: 1, paddingLeft: 4 }}>{r.label}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)' }}>{r.amt}</span>
        </div>
      ))}
    </FragCard>
  );
}

function FragmentIncome() {
  const bars = [40, 65, 55, 80, 70, 90, 100];
  const months = ['D', 'J', 'F', 'M', 'A', 'M', 'J'];
  return (
    <FragCard width={200}>
      <div className="label" style={{ marginBottom: 'var(--space-2)' }}>NET INCOME</div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>₹2.4L</div>
      <div style={{ fontSize: 11, color: 'var(--success-text)', marginTop: 2, marginBottom: 'var(--space-3)' }}>↑ 18% vs last month</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: i === bars.length - 1 ? 'var(--accent)' : 'var(--border-2)', borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {months.map((m, i) => <span key={i} style={{ fontSize: 9, color: 'var(--text-muted)' }}>{m}</span>)}
      </div>
    </FragCard>
  );
}

function FragmentDeals() {
  const deals = [
    { brand: 'Mamaearth', status: 'ACTIVE',       color: 'var(--info)',              val: '₹35K' },
    { brand: 'boAt Audio', status: 'NEGOTIATING',  color: 'var(--status-negotiate)',  val: '₹45K' },
    { brand: 'PhonePe',   status: 'PAID',          color: 'var(--status-paid)',        val: '₹28K' },
  ];
  return (
    <FragCard width={215}>
      <div className="label" style={{ marginBottom: 'var(--space-3)' }}>BRAND DEALS</div>
      <Divider />
      {deals.map(d => (
        <div key={d.brand} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 11 }}>{d.brand}</span>
          <span style={{ padding: '1px 5px', background: `${d.color}22`, color: d.color, borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{d.status}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)', fontSize: 11 }}>{d.val}</span>
        </div>
      ))}
    </FragCard>
  );
}
