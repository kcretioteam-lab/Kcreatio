/**
 * LandingPageV6Acts — Section components for LandingPageV6
 * Exports: reduced, useInView, Reveal, FlowCanvas, FlowPipeline, Act5Impact,
 *          DashboardReveal, Act6Ecosystem, ComparisonTable, Pricing, Act7Return, Footer
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, TrendingDown, Calendar, Briefcase,
  Download, IndianRupee, BarChart2,
  Zap, Shield, RefreshCw, Check, ChevronRight,
} from 'lucide-react';

// ─── Shared utils (exported so LandingPageV6.jsx can import) ─────────────────

export const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, visible];
}

export function Reveal({ children, delay = 0, from = 28, axis = 'y', className = '', style: sx }) {
  const [ref, vis] = useInView();
  const transform = axis === 'y'
    ? (vis ? 'translateY(0)' : `translateY(${from}px)`)
    : (vis ? 'translateX(0)' : `translateX(${from}px)`);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform,
        transition: reduced() ? 'none' : `opacity 0.7s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        ...sx,
      }}
    >
      {children}
    </div>
  );
}

// ─── FlowCanvas (used by Act7Return) ─────────────────────────────────────────

export function FlowCanvas({ active, style: sx }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced()) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;

    const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    window.addEventListener('resize', resize, { passive: true });

    const COUNT = 60;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.5,
      r: 1 + Math.random() * 2.5, alpha: 0.3 + Math.random() * 0.5,
      hue: 30 + Math.random() * 20,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.002;
        if (p.y < -10 || p.alpha <= 0) { p.x = Math.random() * W; p.y = H + 10; p.alpha = 0.3 + Math.random() * 0.5; p.vy = -0.3 - Math.random() * 0.5; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${p.alpha})`; ctx.fill();
      });
      ctx.strokeStyle = 'rgba(232,146,26,0.06)'; ctx.lineWidth = 1;
      for (let i = 0; i < particles.length - 1; i++) {
        const a = particles[i], b = particles[i + 1];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 80) { ctx.globalAlpha = (1 - dist / 80) * 0.3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    };
    if (active) draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [active]);

  return (
    <canvas ref={canvasRef} aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', ...sx }}
    />
  );
}

// ─── FlowPipeline ─────────────────────────────────────────────────────────────

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
  const [stepVisible, setStepVisible] = useState(Array(PIPELINE_STEPS.length).fill(false));
  const [lineVisible, setLineVisible] = useState(Array(PIPELINE_STEPS.length - 1).fill(false));
  const fired = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fired.current) {
        fired.current = true;
        observer.disconnect();
        if (reduced()) {
          setStepVisible(Array(PIPELINE_STEPS.length).fill(true));
          setLineVisible(Array(PIPELINE_STEPS.length - 1).fill(true));
          return;
        }
        PIPELINE_STEPS.forEach((_, i) => {
          setTimeout(() => setStepVisible(prev => { const n = [...prev]; n[i] = true; return n; }), i * 120);
          if (i < PIPELINE_STEPS.length - 1)
            setTimeout(() => setLineVisible(prev => { const n = [...prev]; n[i] = true; return n; }), i * 120 + 60);
        });
      }
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} role="region" aria-label="How Kcretio works — pipeline"
      style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-20) var(--space-6)', textAlign: 'center' }}
    >
      <style>{`
        .fp-pipeline { display:flex; flex-direction:row; align-items:flex-start; justify-content:center; gap:0; }
        .fp-step-wrap { display:flex; flex-direction:row; align-items:flex-start; }
        .fp-connector { display:flex; flex-direction:column; align-items:center; padding-top:24px; flex-shrink:0; }
        .fp-connector-line { width:40px; height:2px; background:var(--accent); transform-origin:left center; transition:transform 400ms var(--ease-decelerate); }
        .fp-connector-arrow { color:var(--accent); font-size:var(--text-base); margin-top:-1px; line-height:1; }
        @media (max-width:767px) {
          .fp-pipeline { flex-direction:column; align-items:flex-start; padding-left:var(--space-4); }
          .fp-step-wrap { flex-direction:row; }
          .fp-connector { flex-direction:row; align-items:center; padding-top:0; padding-left:23px; height:28px; }
          .fp-connector-line { width:2px; height:28px; transform-origin:top center; }
          .fp-connector-arrow { display:none; }
        }
      `}</style>

      <p className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>YOUR FLOW</p>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-12)', lineHeight: 1.2 }}>
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
              transition: reduced() ? 'none' : 'opacity 400ms var(--ease-decelerate), transform 400ms var(--ease-decelerate)',
            }}>
              <div aria-hidden="true" style={{
                width: 50, height: 50, borderRadius: 'var(--radius-full)',
                background: i === 0 ? 'var(--accent)' : 'var(--surface-2)',
                border: `2px solid ${i === 0 ? 'var(--accent)' : 'rgba(232,146,26,0.35)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--text-lg)', color: i === 0 ? '#fff' : 'var(--accent)',
                fontWeight: 700, flexShrink: 0, marginBottom: 'var(--space-3)',
              }}>{step.num}</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-1)', textAlign: 'center' }}>{step.title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center', maxWidth: 130 }}>{step.desc}</div>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="fp-connector" aria-hidden="true">
                <div className="fp-connector-line" style={{ transform: lineVisible[i] ? 'scaleX(1) scaleY(1)' : 'scaleX(0) scaleY(0)' }} />
                <span className="fp-connector-arrow">›</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Reveal delay={200}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-5)', marginTop: 'var(--space-12)', paddingTop: 'var(--space-10)', borderTop: '1px solid var(--border)' }}>
          {BEFORE_AFTER_STATS.map((stat) => (
            <div key={stat.value} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5) var(--space-6)', textAlign: 'center', minWidth: 200, flex: '1 1 200px', maxWidth: 280 }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginBottom: 'var(--space-1)' }}>{stat.value}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', marginBottom: 'var(--space-2)' }}>{stat.label}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                was: <span style={{ textDecoration: 'line-through', color: 'var(--text-disabled)' }}>{stat.was}</span>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// ─── Act5Impact ───────────────────────────────────────────────────────────────

const IMPACTS = [
  { icon: FileText, color: '#60a5fa', headline: 'Send a professional invoice in 30 seconds.', subline: 'GST auto-calculated. Rule 46-compliant. Your brand\'s finance team gets exactly what they need.', stat: '30s', statLabel: 'avg send time' },
  { icon: Shield, color: '#4ade80', headline: 'One less thing to think about.', subline: 'CGST, SGST, IGST — Kcretio picks the right one based on your state codes. You never think about it.', stat: '₹0', statLabel: 'penalty risk' },
  { icon: TrendingDown, color: '#a78bfa', headline: 'Every rupee tracked. No surprises.', subline: 'TDS deducted by brands? Recorded automatically. Form 16A expected? Tracked. ITR season? Zero panic.', stat: '100%', statLabel: 'TDS reconciliation' },
  { icon: Calendar, color: '#fb923c', headline: 'Never miss an advance tax deadline.', subline: '14-day reminders. Pre-calculated amounts. No penalties, no interest, no surprise CA calls.', stat: '14d', statLabel: 'before every deadline' },
  { icon: Briefcase, color: '#f59e0b', headline: 'Your brand pipeline, always current.', subline: 'Log deals in seconds. Track status. Forecast revenue. Know which brands owe you money — right now.', stat: '∞', statLabel: 'brand deals tracked' },
  { icon: Download, color: '#34d399', headline: 'Your CA will love you.', subline: 'All invoices, all income, all TDS. One clean ZIP. 20 minutes to file. Cleanest file of the season.', stat: '20m', statLabel: 'to file ITR' },
];

function ImpactCard({ item, index }) {
  const [ref, vis] = useInView(0.15);
  const Icon = item.icon;
  const [hovered, setHovered] = useState(false);
  return (
    <div ref={ref} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(32px)',
        padding: '28px', borderRadius: 18,
        background: hovered ? `linear-gradient(135deg, ${item.color}14 0%, ${item.color}06 100%)` : 'var(--surface)',
        border: `1px solid ${hovered ? item.color + '55' : 'var(--border)'}`,
        cursor: 'default',
        boxShadow: hovered ? `0 16px 48px ${item.color}22, 0 0 0 1px ${item.color}18` : 'var(--card-shadow)',
        transition: reduced() ? 'none' : `opacity 0.6s ease ${index * 80}ms, transform 0.6s ease ${index * 80}ms, background 0.25s ease, border 0.25s ease, box-shadow 0.25s ease`,
      }}
    >
      {/* Faint background watermark of the stat value */}
      <div aria-hidden="true" style={{
        position: 'absolute', right: -4, bottom: -6,
        fontSize: 96, fontWeight: 900, lineHeight: 1,
        color: item.color, opacity: 0.05,
        pointerEvents: 'none', userSelect: 'none',
        fontVariantNumeric: 'tabular-nums',
      }}>{item.stat}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${item.color}18`, border: `1px solid ${item.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s ease',
          transform: hovered ? 'scale(1.1) rotate(-6deg)' : 'scale(1)',
        }}>
          <Icon size={20} color={item.color} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.stat}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{item.statLabel}</div>
        </div>
      </div>
      <h3 style={{ margin: '0 0 10px', fontSize: 'clamp(15px, 1.4vw, 17px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 }}>{item.headline}</h3>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.7 }}>{item.subline}</p>
      {/* Hover CTA arrow */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 600, color: item.color,
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateX(0)' : 'translateX(-8px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        Explore <ChevronRight size={12} />
      </div>
    </div>
  );
}

export function Act5Impact() {
  return (
    <section id="impact" style={{ padding: 'clamp(48px, 6vw, 80px) 24px', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 16 }}>
              Not features.<br />
              <span style={{ background: 'linear-gradient(135deg, #E8921A, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Life improvements.</span>
            </h2>
            <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
              Every tool in Kcretio is designed to give you back time, money, and mental space.
            </p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {IMPACTS.map((item, i) => <ImpactCard key={i} item={item} index={i} />)}
        </div>
      </div>
    </section>
  );
}

// ─── DashboardReveal ──────────────────────────────────────────────────────────

const BAR_HEIGHTS_DATA = [40, 65, 55, 80, 70, 90, 100];

function MiniBarChart({ animate }) {
  const [heights, setHeights] = useState(BAR_HEIGHTS_DATA.map(() => 0));
  useEffect(() => {
    if (!animate) return;
    if (reduced()) { setHeights(BAR_HEIGHTS_DATA); return; }
    BAR_HEIGHTS_DATA.forEach((h, i) => {
      setTimeout(() => setHeights(prev => { const n = [...prev]; n[i] = h; return n; }), i * 200);
    });
  }, [animate]);
  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, marginTop: 'var(--space-3)' }}>
      {BAR_HEIGHTS_DATA.map((_, i) => (
        <div key={i} style={{
          flex: 1, height: `${heights[i]}%`,
          background: i === BAR_HEIGHTS_DATA.length - 1 ? 'var(--accent)' : 'var(--surface-3)',
          borderRadius: '2px 2px 0 0',
          transition: reduced() ? 'none' : 'height 300ms var(--ease-decelerate)', minHeight: 2,
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
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fired.current) {
        fired.current = true;
        observer.disconnect();
        if (reduced()) { setCardVisible([true, true, true, true]); return; }
        [0, 1, 2, 3].forEach(i => setTimeout(() => setCardVisible(prev => { const n = [...prev]; n[i] = true; return n; }), i * 100));
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cardStyle = (i) => ({
    background: i === 0
      ? 'linear-gradient(135deg, rgba(232,146,26,0.1) 0%, var(--surface) 60%)'
      : 'var(--surface)',
    border: i === 0 ? '1px solid rgba(232,146,26,0.35)' : '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
    boxShadow: i === 0 ? '0 0 40px rgba(232,146,26,0.14)' : 'none',
    opacity: cardVisible[i] ? 1 : 0,
    transform: cardVisible[i] ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.98)',
    transition: reduced() ? 'none' : `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
    position: 'relative', overflow: 'hidden',
  });

  return (
    <section ref={sectionRef} role="region" aria-label="Dashboard preview"
      style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-16) var(--space-6) var(--space-20)' }}
    >
      <style>{`.dr-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--space-5); margin-bottom:var(--space-10); } @media (max-width:767px) { .dr-grid { grid-template-columns:1fr; } }`}</style>

      <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          Your dashboard.{' '}
          <span style={{ background: 'linear-gradient(135deg, #E8921A, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>In 3 months.</span>
        </h2>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)' }}>Real numbers. Real creators. Real results.</p>
      </div>

      <div className="dr-grid">
        <div style={cardStyle(0)}>
          <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>NET INCOME THIS MONTH</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>₹2,40,000</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--success-text)', fontWeight: 600 }}>↑ 18% vs last month</div>
          <MiniBarChart animate={cardVisible[0]} />
        </div>

        <div style={cardStyle(1)}>
          <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>ACTIVE DEALS</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>3 deals</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-3)', fontVariantNumeric: 'tabular-nums' }}>₹1,08,000 in pipeline</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {[
              { label: 'ACTIVE',      bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6' },
              { label: 'NEGOTIATING', bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
              { label: 'DELIVERED',   bg: 'rgba(34,197,94,0.12)',   color: '#22C55E' },
            ].map(chip => (
              <span key={chip.label} style={{ padding: '2px var(--space-2)', background: chip.bg, color: chip.color, borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>{chip.label}</span>
            ))}
          </div>
        </div>

        <div style={cardStyle(2)}>
          <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>TDS TRACKED THIS YEAR</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>₹24,000</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)', fontVariantNumeric: 'tabular-nums' }}>from 6 brands · 4 Form 16As received</div>
          <div>
            <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: cardVisible[2] ? '67%' : '0%', background: 'var(--accent)', borderRadius: 'var(--radius-full)', transition: reduced() ? 'none' : 'width 600ms cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>4 of 6 Form 16As received (67%)</div>
          </div>
        </div>

        <div style={cardStyle(3)}>
          <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>NEXT TAX DEADLINE</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Sep 15</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-3)', fontVariantNumeric: 'tabular-nums' }}>Q3 Advance Tax · ₹18,400 due</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', padding: '3px var(--space-3)', background: 'var(--warning-dim)', color: 'var(--warning-text)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
            14 days away
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 'var(--text-base)', color: 'var(--text-muted)', fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
        This is what running a content business feels like when the infrastructure works.
      </p>
    </section>
  );
}

// ─── Act6Ecosystem ────────────────────────────────────────────────────────────

const ECOSYSTEM_NODES = [
  { label: 'Invoices',  color: '#60a5fa', angle: 0   },
  { label: 'GST',       color: '#4ade80', angle: 60  },
  { label: 'TDS',       color: '#a78bfa', angle: 120 },
  { label: 'Clients',   color: '#fb923c', angle: 180 },
  { label: 'Analytics', color: '#f59e0b', angle: 240 },
  { label: 'Taxes',     color: '#34d399', angle: 300 },
];

function EcosystemViz() {
  const [ref, vis] = useInView(0.3);
  const R = 140;
  return (
    <div ref={ref} style={{ position: 'relative', width: 340, height: 340, flexShrink: 0, margin: '0 auto' }}>
      <div aria-hidden="true" style={{ position: 'absolute', top: '50%', left: '50%', width: R * 2, height: R * 2, transform: 'translate(-50%,-50%)', borderRadius: '50%', border: '1px dashed rgba(232,146,26,0.2)', opacity: vis ? 1 : 0, transition: 'opacity 0.8s ease' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 72, height: 72, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(232,146,26,0.3), rgba(232,146,26,0.1))', border: '2px solid rgba(232,146,26,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 12px rgba(232,146,26,0.06)', opacity: vis ? 1 : 0, transition: 'opacity 0.5s ease', zIndex: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#E8921A', letterSpacing: '0.05em' }}>YOU</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>CREATING</span>
      </div>
      {ECOSYSTEM_NODES.map((node, i) => {
        const rad = (node.angle - 90) * Math.PI / 180;
        const x = 170 + R * Math.cos(rad);
        const y = 170 + R * Math.sin(rad);
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, transform: vis ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-50%) scale(0.5)', opacity: vis ? 1 : 0, transition: reduced() ? 'none' : `opacity 0.5s ease ${200 + i * 100}ms, transform 0.5s cubic-bezier(.34,1.56,.64,1) ${200 + i * 100}ms`, zIndex: 2 }}>
            <div style={{ padding: '6px 12px', borderRadius: 100, background: `${node.color}18`, border: `1px solid ${node.color}55`, fontSize: 11, fontWeight: 700, color: node.color, whiteSpace: 'nowrap' }}>{node.label}</div>
          </div>
        );
      })}
      <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {ECOSYSTEM_NODES.map((node, i) => {
          const rad = (node.angle - 90) * Math.PI / 180;
          return <line key={i} x1="170" y1="170" x2={170 + R * Math.cos(rad)} y2={170 + R * Math.sin(rad)} stroke={node.color} strokeWidth="1.5" strokeOpacity={vis ? 0.3 : 0} strokeDasharray="4 4" style={{ transition: reduced() ? 'none' : `stroke-opacity 0.6s ease ${300 + i * 100}ms` }} />;
        })}
      </svg>
    </div>
  );
}

export function Act6Ecosystem() {
  return (
    <section style={{ padding: 'clamp(48px, 6vw, 80px) 24px', background: 'linear-gradient(180deg, var(--bg-page) 0%, var(--surface-0) 50%, var(--bg-page) 100%)', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 16 }}>
              You're at the center.<br />
              <span style={{ background: 'linear-gradient(135deg, #E8921A, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Everything orbits you.</span>
            </h2>
            <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
              One platform connects invoices, GST, TDS, clients, and taxes into a single living system.
            </p>
          </div>
        </Reveal>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 64 }}>
          <EcosystemViz />
          <div style={{ maxWidth: 400 }}>
            {[
              ['Everything synced', 'Log a deal → invoice auto-drafted. Payment received → income logged. TDS deducted → Form 16A tracked.'],
              ['Nothing manual', 'No copying between apps. No Excel formulas. No "wait let me calculate this." Just create.'],
              ['Always current', 'Open Kcretio anytime and see exactly where your business stands. Live. Accurate. Complete.'],
            ].map(([title, desc], i) => (
              <Reveal key={i} delay={i * 100}>
                <div style={{ display: 'flex', gap: 14, padding: '18px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'rgba(232,146,26,0.12)', border: '1px solid rgba(232,146,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <Check size={12} color="#E8921A" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.65 }}>{desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── ComparisonTable ──────────────────────────────────────────────────────────

const CMP_ROWS = [
  { feature: 'GST invoice (SAC 998399)',    vals: ['✓', '✗', 'Partial', '✗'] },
  { feature: 'TDS tracking (all brands)',   vals: ['✓', 'Manual', '✗', '✗'] },
  { feature: 'Advance tax planner',         vals: ['✓', '✗', '✗', 'Once/yr'] },
  { feature: 'Brand deal CRM',              vals: ['✓', 'Manual', '✗', '✗'] },
  { feature: 'Built for creators',          vals: ['✓', '✗', '✗', '✗'] },
  { feature: 'Year-round OS',               vals: ['✓', '✗', '✗', '✗'] },
  { feature: 'Price',                       vals: ['From ₹0', 'Free', '₹1,200/mo', '₹5,000/yr'] },
];

const CMP_COLS = ['Kcretio ★', 'Google Sheets', 'Zoho Books', 'CA Only'];

const CMP_MOBILE_CARDS = [
  { feature: 'GST Invoice (creator SAC)',  ours: '✓ Included',       others: 'Not in any competitor' },
  { feature: 'TDS from all brands',        ours: '✓ Automatic',      others: 'Manual spreadsheet at best' },
  { feature: 'Advance tax reminders',      ours: '✓ 14-day + 2-day', others: 'Not available' },
  { feature: 'Brand deal pipeline',        ours: '✓ Kanban + list',   others: 'Build it yourself' },
  { feature: 'Price',                      ours: 'From ₹0',           others: 'Zoho ₹1,200/mo · CA ₹5,000/yr' },
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
    <tr style={{ borderBottom: '1px solid var(--border)', background: hovered ? 'var(--surface-2)' : 'transparent', transition: 'background 150ms ease' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-body)', fontWeight: 500 }}>{row.feature}</td>
      {row.vals.map((v, vi) => (
        <td key={vi} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', fontWeight: vi === 0 && v === '✓' ? 700 : 400, color: cmpCellColor(v, vi), background: vi === 0 ? 'var(--accent-dim)' : 'transparent', borderLeft: vi === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined, borderRight: vi === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined, fontVariantNumeric: 'tabular-nums' }}>
          {v}
        </td>
      ))}
    </tr>
  );
}

export function ComparisonTable() {
  return (
    <section aria-label="Why Kcretio" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 var(--space-6) var(--space-20)' }}>
      <style>{`.cmp-desktop { display:block; overflow-x:auto; } .cmp-mobile { display:none; } @media (max-width:640px) { .cmp-desktop { display:none; } .cmp-mobile { display:flex; flex-direction:column; gap:var(--space-3); } }`}</style>
      <Reveal>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center', margin: '0 auto var(--space-4)' }}>WHY KCREATIO</p>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', margin: '0 auto var(--space-10)' }}>Built for this. Nothing else comes close.</h2>
      </Reveal>
      <div className="cmp-desktop">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr>
              <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>Feature</th>
              {CMP_COLS.map((col, ci) => (
                <th key={col} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', fontWeight: 700, fontSize: 'var(--text-xs)', color: ci === 0 ? 'var(--accent)' : 'var(--text-muted)', borderBottom: `2px solid ${ci === 0 ? 'var(--accent)' : 'var(--border)'}`, background: ci === 0 ? 'var(--accent-dim)' : 'transparent', borderLeft: ci === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined, borderRight: ci === 0 ? '1px solid rgba(232,146,26,0.2)' : undefined }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>{CMP_ROWS.map(row => <CmpRow key={row.feature} row={row} />)}</tbody>
        </table>
      </div>
      <div className="cmp-mobile">
        {CMP_MOBILE_CARDS.map(card => (
          <div key={card.feature} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{card.feature}</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{card.ours}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{card.others}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const PLANS = [
  { name: 'Starter', price: '₹0', period: '/month', desc: 'For creators just starting their business journey.', color: '#60a5fa', features: ['5 invoices/month', 'Basic GST calculation', 'TDS tracking', 'Advance tax reminders'], cta: 'Start free', href: '/register' },
  { name: 'Creator Pro', price: '₹599', period: '/month', desc: 'For serious creators managing real brand business.', color: '#E8921A', highlight: true, features: ['Unlimited invoices', 'CGST / SGST / IGST auto', 'Full TDS + Form 16A tracker', 'Advance tax calculator', 'Brand deal CRM (unlimited)', 'P&L + income dashboard', 'ITR-ready export (ZIP)', 'Priority support'], cta: 'Start 14-day free trial', href: '/register' },
  { name: 'Agency', price: '₹1,999', period: '/month', desc: 'For MCNs, talent managers, and creator agencies.', color: '#a78bfa', features: ['Everything in Pro', 'Up to 20 creators', 'Team access', 'White-label invoices', 'Dedicated account manager'], cta: 'Contact us', href: '/register' },
];

function PricingCard({ plan, index }) {
  const [ref, vis] = useInView(0.15);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(36px)',
      transition: reduced() ? 'none' : `opacity 0.6s ease ${index * 100}ms, transform 0.6s ease ${index * 100}ms`,
      padding: '32px', borderRadius: 20, flex: 1, minWidth: 260, maxWidth: 360,
      display: 'flex', flexDirection: 'column',
      background: plan.highlight ? 'linear-gradient(160deg, rgba(232,146,26,0.14) 0%, rgba(232,146,26,0.05) 100%)' : 'var(--surface)',
      border: plan.highlight ? '2px solid rgba(232,146,26,0.5)' : '1px solid var(--border)',
      boxShadow: plan.highlight ? '0 24px 60px rgba(232,146,26,0.2)' : 'var(--card-shadow)',
      position: 'relative',
    }}>
      {plan.highlight && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', borderRadius: 100, background: '#E8921A', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>MOST POPULAR</div>
      )}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: plan.color, textTransform: 'uppercase' }}>{plan.name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{plan.price}</span>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{plan.period}</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, marginBottom: 24 }}>{plan.desc}</p>
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
            <Check size={13} color={plan.color} style={{ flexShrink: 0, marginTop: 2 }} />
            {f}
          </li>
        ))}
      </ul>
      <Link to={plan.href} style={{ display: 'block', textAlign: 'center', padding: plan.highlight ? '13px' : '11px', borderRadius: 100, fontWeight: 700, fontSize: 14, background: plan.highlight ? '#E8921A' : 'transparent', border: plan.highlight ? 'none' : `1.5px solid ${plan.color}66`, color: plan.highlight ? '#fff' : plan.color, textDecoration: 'none', transition: 'opacity 0.15s, transform 0.15s', boxShadow: plan.highlight ? '0 6px 20px rgba(232,146,26,0.3)' : 'none', marginTop: 'auto' }}
        onMouseEnter={e => { e.target.style.opacity = 0.88; e.target.style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { e.target.style.opacity = 1; e.target.style.transform = 'scale(1)'; }}
      >{plan.cta}</Link>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" style={{ padding: 'clamp(48px, 6vw, 80px) 24px', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#E8921A', textTransform: 'uppercase', marginBottom: 16 }}>PRICING</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 16px' }}>
              Start free. Scale when you're ready.
            </h2>
            <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto' }}>
              No credit card required. No hidden fees. No accountant required.
            </p>
          </div>
        </Reveal>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'stretch' }}>
          {PLANS.map((plan, i) => <PricingCard key={i} plan={plan} index={i} />)}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Do I need to be GST-registered to use Kcretio?',
    a: 'No. Kcretio works whether you\'re GST-registered or not. Unregistered creators send invoices without GST. Once you cross ₹20L annual turnover, Kcretio flags the threshold and you register — nothing breaks.',
  },
  {
    q: 'How does the GST calculation actually work?',
    a: 'Kcretio reads the first two digits of both GSTINs (yours and the brand\'s) and automatically applies CGST+SGST for intrastate deals, IGST for interstate. SAC code 998399 is pre-filled. Every invoice is Rule 46 CGST Rules 2017 compliant — no manual math, ever.',
  },
  {
    q: 'What about TDS? Do I need to track it manually?',
    a: 'Never. When a brand deducts 10% TDS (Section 194C/194J) before paying you, Kcretio records it automatically when you mark the invoice paid. All TDS is reconciled against your PAN throughout the year. At ITR season, everything lines up with your Form 26AS.',
  },
  {
    q: 'Is the free plan actually free — or is it a trial?',
    a: 'Actually free. No credit card. No expiry. The Starter plan gives you 5 invoices per month forever. When you outgrow that — meaning real brand business is coming in — upgrade to Creator Pro for ₹599/month.',
  },
  {
    q: 'Can I export everything for my CA?',
    a: 'Yes. Creator Pro includes a one-click ITR-ready ZIP: all invoices (PDF), all TDS records, income summary, and P&L — in one clean file. Most CAs file your ITR in under 20 minutes from this export.',
  },
  {
    q: 'I already track things in Excel. Do I need to migrate?',
    a: 'No migration needed. Start Kcretio from today — new invoices and deals go in here, your old Excel stays wherever it is. Your CA gets the Kcretio export for the new period; old data stays with you.',
  },
  {
    q: 'How is my financial data protected?',
    a: 'Your data lives on encrypted PostgreSQL (Supabase) with row-level security — no other user can ever see your records. All connections are TLS-encrypted. We never sell or share your data.',
  },
];

function FAQItem({ item, index }) {
  const [open, setOpen] = useState(false);
  const [ref, vis] = useInView(0.1);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(20px)',
      transition: reduced() ? 'none' : `opacity 0.5s ease ${index * 60}ms, transform 0.5s ease ${index * 60}ms`,
      borderBottom: '1px solid var(--border)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 'clamp(14px, 1.3vw, 16px)', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {item.q}
        </span>
        <span style={{
          flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
          background: open ? 'rgba(232,146,26,0.15)' : 'var(--surface-2)',
          border: `1px solid ${open ? 'rgba(232,146,26,0.4)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: open ? '#E8921A' : 'var(--text-muted)',
          transition: 'transform 0.25s ease, background 0.2s, color 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}>+</span>
      </button>
      <div style={{
        overflow: 'hidden', maxHeight: open ? 300 : 0,
        transition: reduced() ? 'none' : 'max-height 0.35s cubic-bezier(.22,1,.36,1)',
      }}>
        <p style={{
          fontSize: 14, color: 'var(--text-body)', lineHeight: 1.75,
          paddingBottom: 20, margin: 0, maxWidth: 680,
        }}>{item.a}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section id="faq" style={{ padding: 'clamp(48px, 6vw, 80px) 24px', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#E8921A', textTransform: 'uppercase', marginBottom: 16 }}>FAQ</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 16px' }}>
              Questions creators ask.
            </h2>
            <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
              Real answers — no marketing fluff.
            </p>
          </div>
        </Reveal>
        <div>
          {FAQ_ITEMS.map((item, i) => <FAQItem key={i} item={item} index={i} />)}
        </div>
        <Reveal delay={200}>
          <div style={{ textAlign: 'center', marginTop: 48, padding: '28px', borderRadius: 16, background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, color: 'var(--text-body)', margin: '0 0 12px' }}>Still have questions?</p>
            <a href="mailto:hello@kcreatio.in" style={{ fontSize: 14, fontWeight: 600, color: '#E8921A', textDecoration: 'none' }}>
              hello@kcreatio.in →
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Act7Return ───────────────────────────────────────────────────────────────

export function Act7Return() {
  const [ref, vis] = useInView(0.2);
  return (
    <section ref={ref} style={{ position: 'relative', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(48px, 6vw, 80px) 24px', overflow: 'hidden', background: 'var(--bg-page)', textAlign: 'center' }}>
      <div aria-hidden="true" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '80vw', height: '80vw', maxWidth: 700, maxHeight: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,146,26,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <FlowCanvas active={vis} style={{ opacity: 0.3 }} />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 660 }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '0 0 24px' }}>
            Spend your energy<br />
            <span style={{ background: 'linear-gradient(135deg, #E8921A 0%, #f59e0b 50%, #E8921A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 100%', animation: 'v6shimmer 4s ease infinite' }}>creating.</span>
          </h2>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 48px', fontWeight: 400 }}>
            We'll handle the business behind it.<br />
            Invoices. GST. TDS. Taxes. Running quietly, so you never have to stop.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: 'linear-gradient(135deg, #E8921A, #c8711a)', color: '#fff', borderRadius: 100, fontWeight: 700, fontSize: 18, textDecoration: 'none', boxShadow: '0 12px 40px rgba(232,146,26,0.4)', transition: 'transform 0.2s, box-shadow 0.2s', letterSpacing: '-0.01em' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 20px 56px rgba(232,146,26,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(232,146,26,0.4)'; }}
          >
            Get Started Free <Zap size={18} />
          </Link>
        </Reveal>
        <Reveal delay={350}>
          <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>No credit card. No setup. 60-second onboarding.</p>
        </Reveal>
        <Reveal delay={450}>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 48 }}>
            {[[Shield, 'SOC 2 Ready'], [LockIcon, 'Encrypted'], [RefreshCw, 'GSTIN Validated'], [Check, 'Rule 46 Compliant']].map(([Icon, label], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                <Icon size={12} color="var(--text-muted)" />{label}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LockIcon({ size = 16, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer style={{ padding: '48px 24px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
          <div style={{ maxWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #E8921A, #c8711a)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>K</div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>Kcretio</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              The financial operating system for Indian content creators. Built for creators, by people who care about them.
            </p>
          </div>
          {[
            ['Product', ['Dashboard', 'Invoices', 'TDS', 'Tax Planner', 'Deals']],
            ['Company', ['About', 'Blog', 'Careers', 'Press']],
            ['Legal', ['Privacy', 'Terms', 'GST Policy', 'Security']],
          ].map(([group, links]) => (
            <div key={group}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>{group}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {links.map(l => (
                  <a key={l} href="#" style={{ fontSize: 13, color: 'var(--text-body)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.target.style.color = 'var(--text-body)'}
                  >{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>© 2026 Kcretio. Built with ♥ for Indian creators.</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Subject to GST as applicable</span>
        </div>
      </div>
    </footer>
  );
}
