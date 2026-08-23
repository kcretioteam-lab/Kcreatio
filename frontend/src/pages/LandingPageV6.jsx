/**
 * LandingPageV6 — Kcreatio Cinematic Experience
 * Base: v5 (7-act narrative) + Act1Hero from v5 + 3 v2 sections
 * Act4 scroll bug fixed: stepRefs + translateY to keep active step visible
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, TrendingDown, Calendar, Briefcase,
  Download, IndianRupee, BarChart2, ChevronRight,
  Zap, Shield, Check, Sun, Moon, Menu, X,
} from 'lucide-react';
import { useTheme } from '../App.jsx';
import {
  reduced, useInView, Reveal,
  FlowPipeline, Act5Impact, DashboardReveal,
  Act6Ecosystem, ComparisonTable, Pricing,
  FAQ, Act7Return, Footer,
} from './LandingPageV6Acts.jsx';

// ─── CursorGlow ───────────────────────────────────────────────────────────────

function CursorGlow() {
  const pos = useRef({ x: -200, y: -200 });
  const raf = useRef(null);
  const elRef = useRef(null);

  useEffect(() => {
    if (reduced()) return;
    const move = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!raf.current) {
        raf.current = requestAnimationFrame(() => {
          if (elRef.current) {
            elRef.current.style.left = pos.current.x + 'px';
            elRef.current.style.top = pos.current.y + 'px';
          }
          raf.current = null;
        });
      }
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf.current); };
  }, []);

  return (
    <div ref={elRef} aria-hidden="true" style={{
      position: 'fixed', left: -200, top: -200,
      width: 480, height: 480, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(232,146,26,0.08) 0%, transparent 70%)',
      transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 0,
    }} />
  );
}

// ─── FlowCanvas ───────────────────────────────────────────────────────────────

function FlowCanvas({ active, style: sx }) {
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
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.5,
      r: 1 + Math.random() * 2.5,
      alpha: 0.3 + Math.random() * 0.5,
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

  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', ...sx }} />;
}

// ─── Floating docs ────────────────────────────────────────────────────────────

const FLOATING_DOCS = [
  { icon: FileText,     label: 'Invoice #42',    color: '#4ade80', x: 12, y: 22, rot: -8 },
  { icon: TrendingDown, label: 'TDS ₹11,800',    color: '#60a5fa', x: 78, y: 18, rot:  6 },
  { icon: IndianRupee,  label: '₹1,18,000 paid', color: '#f59e0b', x: 8,  y: 58, rot: -5 },
  { icon: Calendar,     label: 'Advance Tax',     color: '#a78bfa', x: 80, y: 55, rot:  9 },
  { icon: BarChart2,    label: 'P&L Summary',     color: '#f87171', x: 50, y: 16, rot: -3 },
  { icon: Briefcase,    label: 'Mamaearth Deal',  color: '#34d399', x: 20, y: 74, rot:  7 },
  { icon: Download,     label: 'ITR-Ready ZIP',   color: '#fb923c', x: 72, y: 74, rot: -6 },
  { icon: Shield,       label: 'Rule 46 GST',     color: '#e879f9', x: 62, y: 82, rot:  4 },
];

function FloatingDoc({ doc, phase, index, convergeProgress }) {
  const rm = reduced();
  const Icon = doc.icon;
  const delay = index * 120;

  // Scroll-driven convergence: stagger each tile's start by 0.05 progress units
  const tileDelay = index * 0.05;
  const rawTP = convergeProgress > 0
    ? Math.max(0, Math.min(1, (convergeProgress - tileDelay) / Math.max(0.01, 1 - tileDelay)))
    : 0;
  // Smoothstep easing for organic feel
  const tp = rawTP * rawTP * (3 - 2 * rawTP);
  const isConverging = convergeProgress > 0 && !rm;

  // Drive position, scale, opacity directly from scroll progress
  const left = isConverging ? `${doc.x + (50 - doc.x) * tp}%` : `${doc.x}%`;
  const top  = isConverging ? `${doc.y + (50 - doc.y) * tp}%` : `${doc.y}%`;
  const scale = isConverging ? Math.max(0, 1 - tp * 0.9) : (phase === 'chaos' ? 0.85 + index * 0.04 : 1);
  const opacity = isConverging ? Math.max(0, 1 - tp * 1.2) : (phase === 'chaos' ? 0.9 : 1);
  const rot = isConverging
    ? doc.rot * (1 - tp)
    : phase === 'chaos' ? doc.rot * 2.5 : doc.rot;
  const extraTranslate = phase === 'chaos' && !isConverging
    ? `translate(${(index % 3 - 1) * 18}px, ${(index % 2 === 0 ? 1 : -1) * 14}px)`
    : '';

  return (
    <div aria-hidden="true" style={{
      position: 'absolute', left, top,
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 14px', background: 'rgba(255,255,255,0.06)',
      border: `1px solid ${doc.color}33`, borderRadius: 10,
      backdropFilter: 'blur(12px)', boxShadow: `0 4px 20px ${doc.color}1a`,
      fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap',
      transform: `rotate(${rot}deg) scale(${scale}) ${extraTranslate}`,
      opacity,
      // No CSS transition during convergence — scroll drives it directly
      transition: isConverging ? 'none' : (rm ? 'none' : `all 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms`),
      animation: rm || phase !== 'dream' ? 'none' : `v6float ${3 + (index % 3)}s ease-in-out ${delay}ms infinite alternate`,
      zIndex: 2,
    }}>
      <Icon size={13} color={doc.color} />
      <span style={{ color: 'var(--text-body)', fontSize: 11 }}>{doc.label}</span>
    </div>
  );
}

// ─── ACT 1: Hero ──────────────────────────────────────────────────────────────

function Act1Hero() {
  const [phase, setPhase] = useState('dream');
  const [scrollY, setScrollY] = useState(0);
  const [convergeProgress, setConvergeProgress] = useState(0);
  const sectionRef = useRef(null);

  useEffect(() => {
    const fn = () => {
      const sy = window.scrollY;
      setScrollY(sy);
      const vh = window.innerHeight;
      if (sy < vh * 0.3) setPhase('dream');
      else if (sy < vh * 0.6) setPhase('chaos');
      else setPhase('flow');
      // Convergence: starts at 60% vh scroll, completes at 110% vh
      setConvergeProgress(Math.max(0, Math.min(1, (sy - vh * 0.6) / (vh * 0.5))));
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const parallaxY = reduced() ? 0 : scrollY * 0.35;
  const heroOpacity = Math.max(0, 1 - scrollY / (window.innerHeight * 0.8));

  return (
    <section ref={sectionRef} id="hero" style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', background: 'var(--bg-page)',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 60% at 50% 10%, rgba(232,146,26,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <FlowCanvas active style={{ opacity: 0.6 }} />

      <div aria-hidden="true" className="v6-floating-tiles" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        transform: reduced() ? 'none' : `translateY(${parallaxY * 0.3}px)`,
        transition: 'transform 0.05s linear',
      }}>
        {FLOATING_DOCS.map((doc, i) => (
          <FloatingDoc key={i} doc={doc} phase={phase} index={i} convergeProgress={convergeProgress} />
        ))}
      </div>

      <div style={{
        position: 'relative', zIndex: 10, textAlign: 'center',
        padding: '0 24px', maxWidth: 760,
        transform: reduced() ? 'none' : `translateY(${-parallaxY * 0.15}px)`,
        opacity: heroOpacity, transition: 'opacity 0.1s linear',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 14px', borderRadius: 100,
          background: 'rgba(232,146,26,0.1)', border: '1px solid rgba(232,146,26,0.3)',
          marginBottom: 28, fontSize: 12, fontWeight: 600, color: '#E8921A', letterSpacing: '0.08em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8921A', animation: 'v6pulse 2s infinite' }} />
          BUILT FOR INDIAN CREATORS
        </div>

        <h1 style={{
          fontSize: 'clamp(42px, 7vw, 88px)', fontWeight: 900, lineHeight: 1.0,
          letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '0 0 20px',
        }}>
          <span style={{ display: 'block' }}>Create.</span>
          <span style={{
            display: 'block',
            background: 'linear-gradient(135deg, #E8921A 0%, #f59e0b 50%, #E8921A 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%', animation: 'v6shimmer 4s ease infinite',
          }}>
            Everything else flows.
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-body)',
          lineHeight: 1.65, maxWidth: 540, margin: '0 auto 40px', fontWeight: 400,
        }}>
          Invoices. GST. TDS. Advance tax. Client management.<br />
          All running quietly — so you never have to stop creating.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #E8921A, #c8711a)',
            color: '#fff', borderRadius: 100, fontWeight: 700, fontSize: 16,
            textDecoration: 'none', boxShadow: '0 8px 24px rgba(232,146,26,0.35)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(232,146,26,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(232,146,26,0.35)'; }}
          >
            Start Flowing — It's Free
            <ChevronRight size={16} />
          </Link>
          <a href="#story" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 100, fontWeight: 600, fontSize: 16,
            border: '1px solid var(--border)', color: 'var(--text-body)',
            textDecoration: 'none', transition: 'background 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-body)'; }}
          >
            See the story ↓
          </a>
        </div>

        <p style={{ marginTop: 36, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          <span style={{ color: '#E8921A', fontWeight: 700 }}>2,400+</span> creators managing ₹42Cr+ in annual billings
        </p>
      </div>

      <div aria-hidden="true" style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        opacity: scrollY > 50 ? 0 : 0.6, transition: 'opacity 0.3s ease',
      }}>
        <div style={{
          width: 1, height: 48,
          background: 'linear-gradient(to bottom, var(--text-muted), transparent)',
          animation: 'v6scrollline 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scroll</span>
      </div>
    </section>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
      display: 'flex', justifyContent: 'center',
      padding: '16px 24px', pointerEvents: 'none',
    }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: 960, height: 52, padding: '0 16px',
        background: scrolled
          ? (theme === 'dark' ? 'rgba(10,11,18,0.94)' : 'rgba(255,255,255,0.94)')
          : (theme === 'dark' ? 'rgba(10,11,18,0.5)'  : 'rgba(255,255,255,0.5)'),
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid var(--border)', borderRadius: 100,
        boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.15)' : 'none',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
        pointerEvents: 'auto',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, #E8921A 0%, #c8711a 100%)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 13, color: '#fff',
          }}>K</div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, letterSpacing: '-0.02em' }}>
            Kcreatio
          </span>
        </Link>

        <div className="v6-nav-links" style={{ display: 'flex', gap: 4 }}>
          {[['#story', 'Story'], ['#how', 'How it Works'], ['#impact', 'Impact'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([h, l]) => (
            <a key={h} href={h} style={{
              padding: '6px 14px', color: 'var(--text-body)', fontSize: 13, fontWeight: 500,
              borderRadius: 100, textDecoration: 'none', transition: 'background 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { e.target.style.background = 'var(--surface-2)'; e.target.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-body)'; }}
            >{l}</a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggleTheme} aria-label="Toggle theme" style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)',
            border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <Link to="/login" className="v6-nav-signin" style={{
            padding: '6px 16px', fontSize: 13, fontWeight: 500,
            color: 'var(--text-body)', textDecoration: 'none',
          }}>Sign in</Link>
          <Link to="/register" className="v6-nav-cta" style={{
            padding: '7px 18px', background: '#E8921A', color: '#fff',
            borderRadius: 100, fontWeight: 600, fontSize: 13, textDecoration: 'none',
            transition: 'background 0.15s, transform 0.15s',
          }}
            onMouseEnter={e => { e.target.style.background = '#d47f16'; e.target.style.transform = 'scale(1.03)'; }}
            onMouseLeave={e => { e.target.style.background = '#E8921A'; e.target.style.transform = 'scale(1)'; }}
          >Start free →</Link>
          <button aria-label="Open menu" className="v6-hamburger"
            onClick={() => setMobileOpen(o => !o)}
            style={{
              display: 'none', width: 32, height: 32, borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-primary)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 76, left: 16, right: 16,
          background: theme === 'dark' ? 'rgba(10,11,18,0.97)' : 'rgba(255,255,255,0.97)',
          border: '1px solid var(--border)', borderRadius: 16, padding: '12px 8px',
          backdropFilter: 'blur(14px)', zIndex: 301, pointerEvents: 'auto',
        }}>
          {[['#story', 'Story'], ['#how', 'How it Works'], ['#impact', 'Impact'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([h, l]) => (
            <a key={h} href={h} onClick={() => setMobileOpen(false)} style={{
              display: 'block', padding: '10px 16px', color: 'var(--text-body)',
              fontWeight: 500, fontSize: 14, textDecoration: 'none', borderRadius: 10,
            }}>{l}</a>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          <Link to="/login" onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '10px 16px', color: 'var(--text-body)', fontSize: 14, textDecoration: 'none', borderRadius: 10 }}>Sign in</Link>
          <Link to="/register" onClick={() => setMobileOpen(false)} style={{ display: 'block', margin: '8px', padding: '12px', background: '#E8921A', color: '#fff', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>Start free →</Link>
        </div>
      )}
    </header>
  );
}

// ─── ACT 2: The Reality ───────────────────────────────────────────────────────

const CHAOS_ITEMS = [
  { label: 'Invoice #38 — overdue 12 days', color: '#f87171', icon: FileText },
  { label: 'GST portal: deadline today',    color: '#fb923c', icon: Shield },
  { label: 'TDS mismatch — Boat invoice',   color: '#f59e0b', icon: TrendingDown },
  { label: 'Excel sheet: #REF! error',      color: '#f87171', icon: BarChart2 },
  { label: 'CA needs advance tax now',      color: '#fb923c', icon: Calendar },
  { label: 'Brand payment: still pending',  color: '#ef4444', icon: IndianRupee },
  { label: 'GSTR-1: 3 invoices missing',    color: '#f59e0b', icon: FileText },
  { label: 'Form 16A: still not received',  color: '#fb923c', icon: Download },
  { label: '5 spreadsheets. None agree.',   color: '#f87171', icon: BarChart2 },
  { label: 'Mamaearth PO: wrong GST no.',   color: '#ef4444', icon: Briefcase },
];

function Act2Reality() {
  const [ref, vis] = useInView(0.1);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!vis || reduced()) { if (vis) setCount(CHAOS_ITEMS.length); return; }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCount(i);
      if (i >= CHAOS_ITEMS.length) clearInterval(interval);
    }, 280);
    return () => clearInterval(interval);
  }, [vis]);

  return (
    <section id="story" ref={ref} style={{
      position: 'relative', padding: 'clamp(48px, 6vw, 80px) 24px',
      background: 'var(--bg-page)', overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 16 }}>
            No one starts creating
            <br />
            <span style={{ color: '#f87171' }}>to become an accountant.</span>
          </h2>
          <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 36px' }}>
            You upload a video. Brands respond. Then comes the part nobody warns you about — and none of it is creating.
          </p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {CHAOS_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const show = i < count;
            return (
              <div key={i} style={{
                opacity: show ? 1 : 0,
                transform: show ? `rotate(${(i % 5 - 2) * 1.2}deg) scale(1)` : 'scale(0.8) translateY(10px)',
                transition: reduced() ? 'none' : `all 0.4s cubic-bezier(.34,1.56,.64,1) ${i * 30}ms`,
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: 'var(--surface-1)',
                border: `1px solid ${item.color}44`, borderRadius: 10,
                boxShadow: `0 2px 12px ${item.color}22`,
                fontSize: 12, fontWeight: 600, color: 'var(--text-body)', textAlign: 'left',
              }}>
                <Icon size={13} color={item.color} style={{ flexShrink: 0 }} />
                {item.label}
              </div>
            );
          })}
        </div>

        <Reveal delay={400}>
          <div style={{
            marginTop: 48, padding: '40px 32px',
            background: 'linear-gradient(135deg, rgba(232,146,26,0.08) 0%, rgba(232,146,26,0.03) 100%)',
            border: '1px solid rgba(232,146,26,0.2)', borderRadius: 20,
          }}>
            <p style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, margin: 0, letterSpacing: '-0.02em' }}>
              "What if all of this simply… flowed?"
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── ACT 3: Flow ──────────────────────────────────────────────────────────────

const FLOW_TRANSFORMS = [
  { from: 'Invoice created',  to: 'Sent in 30 sec',     icon: FileText,    color: '#4ade80' },
  { from: 'GST calculation',  to: 'Auto-calculated',    icon: Shield,      color: '#60a5fa' },
  { from: 'TDS deducted',     to: 'Instantly recorded', icon: TrendingDown,color: '#a78bfa' },
  { from: 'Payment received', to: 'Income logged',      icon: IndianRupee, color: '#f59e0b' },
  { from: 'Advance tax due',  to: 'Pre-calculated',     icon: Calendar,    color: '#fb923c' },
  { from: 'CA asks for data', to: 'ZIP ready to send',  icon: Download,    color: '#34d399' },
];

function FlowTransformCard({ item, index }) {
  const [ref, vis] = useInView(0.2);
  const [flipped, setFlipped] = useState(false);
  const Icon = item.icon;

  useEffect(() => {
    if (vis && !reduced()) {
      const t = setTimeout(() => setFlipped(true), 300 + index * 200);
      return () => clearTimeout(t);
    }
    if (vis) setFlipped(true);
  }, [vis, index]);

  return (
    <div ref={ref} style={{
      perspective: 800, height: 120,
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(24px)',
      transition: reduced() ? 'none' : `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
    }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: reduced() ? 'none' : 'transform 0.6s cubic-bezier(.23,1,.32,1)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: 20, borderRadius: 14,
          background: 'var(--surface-1)', border: '1px solid rgba(248,113,113,0.3)',
        }}>
          <Icon size={20} color="#f87171" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>{item.from}</span>
          <span style={{ fontSize: 11, color: '#f87171', fontWeight: 500 }}>MANUAL</span>
        </div>
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: 20, borderRadius: 14,
          background: `linear-gradient(135deg, ${item.color}18 0%, ${item.color}08 100%)`,
          border: `1px solid ${item.color}44`,
        }}>
          <Icon size={20} color={item.color} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{item.to}</span>
          <span style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>✓ FLOWS</span>
        </div>
      </div>
    </div>
  );
}

function Act3Flow() {
  return (
    <section style={{
      padding: 'clamp(48px, 6vw, 80px) 24px',
      background: 'linear-gradient(180deg, var(--bg-page) 0%, var(--surface-0) 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '60vw', height: '60vw', maxWidth: 600, maxHeight: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,146,26,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 16 }}>
            Chaos becomes clarity.
            <br />
            <span style={{ background: 'linear-gradient(135deg, #E8921A, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Automatically.</span>
          </h2>
          <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 40px' }}>
            Watch what was manual become effortless. Every card flips from friction to flow.
          </p>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
          {FLOW_TRANSFORMS.map((item, i) => <FlowTransformCard key={i} item={item} index={i} />)}
        </div>
        <Reveal delay={800}>
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 2, height: 48, background: 'linear-gradient(to bottom, rgba(232,146,26,0.8), transparent)' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 100, background: 'rgba(232,146,26,0.1)', border: '1px solid rgba(232,146,26,0.3)', fontSize: 13, fontWeight: 600, color: '#E8921A' }}>
              <Zap size={13} />
              One platform. Zero manual work.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── ACT 4: How It Works (sticky scroll — scroll bug fixed) ──────────────────

const JOURNEY = [
  {
    step: '01', icon: Briefcase, color: '#4ade80',
    title: 'Brand slides into your DMs.',
    body: 'Mamaearth offers ₹1,18,000 for a YouTube integration. You log the deal in 10 seconds. Pipeline updated. Nothing falls through.',
    tag: '₹1,18,000 deal logged',
    detail: 'Brand: Mamaearth · Due: 15 Aug · Platform: YouTube',
  },
  {
    step: '02', icon: FileText, color: '#60a5fa',
    title: 'Invoice sent. In under a minute.',
    body: 'GST auto-calculated. IGST vs CGST+SGST decided by state code. Rule 46-compliant PDF. Mamaearth gets exactly what their finance team needs.',
    tag: 'IGST 18% auto-applied',
    detail: 'Invoice #CF-2024-042 · SAC 998399 · ₹1,39,240 total',
  },
  {
    step: '03', icon: TrendingDown, color: '#a78bfa',
    title: '₹11,800 TDS deducted at source.',
    body: 'Mamaearth pays ₹1,06,200. Kcreatio records the ₹11,800 TDS before you even check your account. Form 16A? Already tracked.',
    tag: 'Form 16A: awaiting',
    detail: 'Net received: ₹1,06,200 · TDS: ₹11,800 · Cert pending',
  },
  {
    step: '04', icon: IndianRupee, color: '#f59e0b',
    title: 'Income logged. P&L updated.',
    body: 'Payment hits your account. Kcreatio auto-logs it. Running totals stay current. Gross income, net income, deductions — all live.',
    tag: 'No spreadsheet needed',
    detail: 'FY 2024-25 gross: ₹38,40,000 · Net: ₹33,12,000',
  },
  {
    step: '05', icon: Calendar, color: '#fb923c',
    title: 'Sep 15 arrives. You pay zero penalty.',
    body: 'Kcreatio calculates your Q3 advance tax 14 days before the deadline. Reminder sent. ₹18,400 paid. No interest. No CA panic calls.',
    tag: '14-day reminder sent',
    detail: 'Q3 advance tax: ₹18,400 · Penalty avoided: ₹2,460',
  },
  {
    step: '06', icon: Download, color: '#34d399',
    title: 'March. Your CA opens the ZIP.',
    body: "20 minutes later, ITR filed. Your CA calls it the cleanest file of the season. You're already working on your next video.",
    tag: 'ITR-ready in one click',
    detail: 'All invoices · All TDS · All income · One clean export',
  },
];

function JourneyStep({ stage, index, activeIndex }) {
  const isActive = index === activeIndex;
  const isPast = index < activeIndex;
  const Icon = stage.icon;

  return (
    <div style={{
      display: 'flex', gap: 20, alignItems: 'flex-start',
      opacity: isActive ? 1 : isPast ? 0.45 : 0.25,
      transform: isActive ? 'translateX(0)' : isPast ? 'translateX(-6px)' : 'translateX(8px)',
      transition: reduced() ? 'none' : 'all 0.5s cubic-bezier(.22,1,.36,1)',
      padding: '20px 0',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: isActive ? `linear-gradient(135deg, ${stage.color}33, ${stage.color}18)` : 'var(--surface-1)',
          border: `2px solid ${isActive ? stage.color : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.4s ease',
          boxShadow: isActive ? `0 0 0 6px ${stage.color}18` : 'none',
        }}>
          <Icon size={18} color={isActive ? stage.color : 'var(--text-muted)'} />
        </div>
        {index < JOURNEY.length - 1 && (
          <div style={{
            width: 2, flexGrow: 1, minHeight: 40,
            background: isPast
              ? `linear-gradient(to bottom, ${stage.color}, ${JOURNEY[index + 1].color}66)`
              : 'var(--border)',
            margin: '6px 0', transition: 'background 0.5s ease',
          }} />
        )}
      </div>
      <div style={{ flex: 1, paddingTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: isActive ? stage.color : 'var(--text-muted)', marginBottom: 6 }}>
          STEP {stage.step}
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 'clamp(16px, 1.8vw, 20px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3, letterSpacing: '-0.02em' }}>{stage.title}</h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-body)', lineHeight: 1.7 }}>{stage.body}</p>
        {isActive && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 100,
            background: `${stage.color}18`, border: `1px solid ${stage.color}44`,
            fontSize: 11, fontWeight: 600, color: stage.color,
            animation: reduced() ? 'none' : 'v6fadein 0.3s ease',
          }}>
            <Check size={10} /> {stage.tag}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveCard({ stage }) {
  const Icon = stage.icon;
  return (
    <div key={stage.step} style={{
      width: '100%', maxWidth: 380, padding: '28px', borderRadius: 20,
      background: `linear-gradient(135deg, ${stage.color}0f 0%, ${stage.color}05 100%)`,
      border: `1px solid ${stage.color}33`,
      boxShadow: `0 20px 60px ${stage.color}18`,
      animation: reduced() ? 'none' : 'v6cardenter 0.4s cubic-bezier(.22,1,.36,1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${stage.color}22`, border: `1px solid ${stage.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={stage.color} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: stage.color }}>STEP {stage.step}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{stage.title}</div>
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.02em', lineHeight: 1.7, marginBottom: 16 }}>
        {stage.detail}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 100, background: `${stage.color}18`, border: `1px solid ${stage.color}44`, fontSize: 12, fontWeight: 700, color: stage.color }}>
        <Check size={11} /> {stage.tag}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 20, justifyContent: 'flex-end' }}>
        {JOURNEY.map((_, i) => (
          <div key={i} style={{
            width: i === parseInt(stage.step) - 1 ? 20 : 6, height: 6, borderRadius: 3,
            background: i === parseInt(stage.step) - 1 ? stage.color : 'var(--border)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  );
}

function Act4HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const stepRefs = useRef([]);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Scroll active step into view (fixes the scroll bug where steps 2-6 were clipped)
  useEffect(() => {
    const el = stepRefs.current[activeIndex];
    if (!el) return;
    setTranslateY(-Math.max(0, el.offsetTop - 8));
  }, [activeIndex]);

  useEffect(() => {
    if (isMobile) return;
    const fn = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionH = sectionRef.current.offsetHeight - window.innerHeight;
      if (sectionH <= 0 || rect.top > 0 || rect.bottom < window.innerHeight) return;
      const prog = Math.max(0, Math.min(1, -rect.top / sectionH));
      setActiveIndex(Math.min(JOURNEY.length - 1, Math.floor(prog * JOURNEY.length)));
    };
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, [isMobile]);

  if (isMobile) {
    return (
      <section id="how" style={{ padding: '56px 24px', background: 'var(--bg-page)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 16px' }}>
                One deal. Fully handled.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-body)', lineHeight: 1.7 }}>
                Follow Riya's journey — from brand deal to filed ITR. Kcreatio handles every step.
              </p>
            </div>
          </Reveal>
          {JOURNEY.map((stage, i) => (
            <Reveal key={i} delay={i * 80}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '20px 0', borderBottom: i < JOURNEY.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: `${stage.color}18`, border: `2px solid ${stage.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <stage.icon size={16} color={stage.color} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: stage.color, marginBottom: 4, letterSpacing: '0.08em' }}>STEP {stage.step}</div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{stage.title}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.65 }}>{stage.body}</p>
                  <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, background: `${stage.color}18`, border: `1px solid ${stage.color}44`, fontSize: 11, fontWeight: 600, color: stage.color }}>
                    <Check size={9} /> {stage.tag}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="how" ref={sectionRef} style={{ height: `${100 * (JOURNEY.length + 1)}vh`, position: 'relative' }}>
      <div style={{
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
        maxWidth: 1200, margin: '0 auto', padding: '0 48px', alignItems: 'center',
      }}>
        {/* Left: header pinned above, steps scroll within their own overflow container */}
        <div style={{ paddingRight: 60, height: '80vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ marginBottom: 40, flexShrink: 0 }}>
            <h2 style={{ fontSize: 'clamp(28px, 2.8vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 12px' }}>
              One deal.<br />Fully handled.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-body)', lineHeight: 1.7, margin: 0 }}>
              Follow Riya's journey from a brand DM to a filed ITR. Every step flows automatically.
            </p>
          </div>
          <div style={{ flex: 1, overflowY: 'hidden', overflowX: 'hidden' }}>
            <div style={{
              transform: `translateY(${translateY}px)`,
              transition: reduced() ? 'none' : 'transform 0.5s cubic-bezier(.22,1,.36,1)',
            }}>
              {JOURNEY.map((stage, i) => (
                <div key={i} ref={el => { stepRefs.current[i] = el; }}>
                  <JourneyStep stage={stage} index={i} activeIndex={activeIndex} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: live card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LiveCard stage={JOURNEY[activeIndex]} />
        </div>
      </div>
    </section>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const V6_STYLES = `
  .v6-page { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; }
  [data-theme='dark']  .v6-page { --bg-page: #0a0b12; --surface-0: #0d0e18; --surface-1: rgba(255,255,255,0.04); --surface-2: rgba(255,255,255,0.07); --surface-3: rgba(255,255,255,0.11); }
  [data-theme='light'] .v6-page { --bg-page: #fafaf9; --surface-0: #f4f3ef; --surface-1: #ffffff; --surface-2: #f4f3ef; --surface-3: #ece9e3; }

  @keyframes v6float    { from { transform: translateY(0px); } to { transform: translateY(-10px); } }
  @keyframes v6pulse    { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.8); } }
  @keyframes v6shimmer  { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
  @keyframes v6scrollline { 0%,100% { opacity:0.5; transform:scaleY(1); } 50% { opacity:1; transform:scaleY(0.6); } }
  @keyframes v6fadein   { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
  @keyframes v6cardenter { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes ruleExpand { from { transform:scaleX(0); } to { transform:scaleX(1); } }

  @media (max-width: 680px) {
    .v6-nav-links  { display: none !important; }
    .v6-nav-signin { display: none !important; }
    .v6-nav-cta    { display: none !important; }
    .v6-hamburger  { display: flex !important; }
    .v6-floating-tiles { display: none !important; }
  }
`;

function InjectStyles() {
  useEffect(() => {
    if (document.getElementById('v6-styles')) return;
    const tag = document.createElement('style');
    tag.id = 'v6-styles';
    tag.textContent = V6_STYLES;
    document.head.appendChild(tag);
    return () => document.getElementById('v6-styles')?.remove();
  }, []);
  return null;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LandingPageV6() {
  return (
    <div className="v6-page" style={{ position: 'relative', minHeight: '100vh' }}>
      <InjectStyles />
      <CursorGlow />
      <Navbar />
      <main id="main-content">
        <Act1Hero />
        <Act2Reality />
        <Act3Flow />
        <Act4HowItWorks />
        <FlowPipeline />
        <Act5Impact />
        <DashboardReveal />
        <Act6Ecosystem />
        <ComparisonTable />
        <Pricing />
        <FAQ />
        <Act7Return />
      </main>
      <Footer />
    </div>
  );
}
