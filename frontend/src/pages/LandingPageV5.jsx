/**
 * LandingPageV5 — CreatiFlow Cinematic Experience
 * One continuous story in 7 acts. Pure React + CSS. No new libraries.
 * Core metaphor: FLOW — everything flows.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, TrendingDown, Calendar, Briefcase,
  Download, IndianRupee, BarChart2, ChevronRight,
  Zap, Shield, RefreshCw, Check, Sun, Moon, Menu, X,
} from 'lucide-react';
import { useTheme } from '../App.jsx';

// ─── utils ───────────────────────────────────────────────────────────────────

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useInView(threshold = 0.15) {
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

function Reveal({ children, delay = 0, from = 28, axis = 'y', className = '', style: sx }) {
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

// ─── Cursor glow ─────────────────────────────────────────────────────────────

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
    <div
      ref={elRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: -200,
        top: -200,
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,146,26,0.08) 0%, transparent 70%)',
        transform: 'translate(-50%,-50%)',
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'opacity 0.3s ease',
      }}
    />
  );
}

// ─── Flowing particles canvas ─────────────────────────────────────────────────

function FlowCanvas({ active, style: sx }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced()) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize, { passive: true });

    const COUNT = 60;
    const particles = Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.5,
      r: 1 + Math.random() * 2.5,
      alpha: 0.3 + Math.random() * 0.5,
      hue: 30 + Math.random() * 20, // warm saffron tones
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.002;
        if (p.y < -10 || p.alpha <= 0) {
          p.x = Math.random() * W;
          p.y = H + 10;
          p.alpha = 0.3 + Math.random() * 0.5;
          p.vy = -0.3 - Math.random() * 0.5;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${p.alpha})`;
        ctx.fill();
      });

      // draw bezier flow lines
      ctx.strokeStyle = 'rgba(232,146,26,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length - 1; i++) {
        const a = particles[i], b = particles[i + 1];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 80) {
          ctx.globalAlpha = (1 - dist / 80) * 0.3;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(draw);
    };

    if (active) draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...sx,
      }}
    />
  );
}

// ─── Floating document cards ──────────────────────────────────────────────────

const FLOATING_DOCS = [
  { icon: FileText,    label: 'Invoice #42',     color: '#4ade80', x: 12,  y: 22, rot: -8  },
  { icon: TrendingDown,label: 'TDS ₹11,800',     color: '#60a5fa', x: 78,  y: 18, rot:  6  },
  { icon: IndianRupee, label: '₹1,18,000 paid',  color: '#f59e0b', x: 8,   y: 58, rot: -5  },
  { icon: Calendar,    label: 'Advance Tax',      color: '#a78bfa', x: 80,  y: 55, rot:  9  },
  { icon: BarChart2,   label: 'P&L Summary',      color: '#f87171', x: 50,  y: 14, rot: -3  },
  { icon: Briefcase,   label: 'Mamaearth Deal',   color: '#34d399', x: 20,  y: 74, rot:  7  },
  { icon: Download,    label: 'ITR-Ready ZIP',    color: '#fb923c', x: 72,  y: 74, rot: -6  },
  { icon: Shield,      label: 'Rule 46 GST',      color: '#e879f9', x: 42,  y: 80, rot:  4  },
];

function FloatingDoc({ doc, phase, index }) {
  const rm = reduced();
  const Icon = doc.icon;
  const delay = index * 120;

  // phase: 'dream' = gentle float, 'chaos' = heavy/overlapping, 'flow' = sucked into center
  const chaosOffset = phase === 'chaos' ? {
    transform: `rotate(${doc.rot * 2.5}deg) scale(${0.85 + index * 0.04}) translate(${(index % 3 - 1) * 18}px, ${(index % 2 === 0 ? 1 : -1) * 14}px)`,
    opacity: 0.9,
  } : {};

  const flowOffset = phase === 'flow' ? {
    transform: 'translate(-50%, -50%) scale(0)',
    opacity: 0,
    left: '50%',
    top: '50%',
  } : {};

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: `${doc.x}%`,
        top: `${doc.y}%`,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${doc.color}33`,
        borderRadius: 10,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 20px ${doc.color}1a`,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap',
        transition: rm ? 'none' : `all 0.9s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        animation: rm || phase !== 'dream' ? 'none' : `v5float ${3 + (index % 3)}s ease-in-out ${delay}ms infinite alternate`,
        ...chaosOffset,
        ...flowOffset,
        zIndex: 2,
      }}
    >
      <Icon size={13} color={doc.color} />
      <span style={{ color: 'var(--text-body)', fontSize: 11 }}>{doc.label}</span>
    </div>
  );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

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
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        display: 'flex',
        justifyContent: 'center',
        padding: '16px 24px',
        pointerEvents: 'none',
      }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: 960,
          height: 52,
          padding: '0 16px',
          background: scrolled
            ? (theme === 'dark' ? 'rgba(10,11,18,0.94)' : 'rgba(255,255,255,0.94)')
            : (theme === 'dark' ? 'rgba(10,11,18,0.5)' : 'rgba(255,255,255,0.5)'),
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid var(--border)',
          borderRadius: 100,
          boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.15)' : 'none',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
          pointerEvents: 'auto',
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, #E8921A 0%, #c8711a 100%)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 13, color: '#fff',
          }}>C</div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, letterSpacing: '-0.02em' }}>
            CreatiFlow
          </span>
        </Link>

        {/* Center links — desktop */}
        <div className="v5-nav-links" style={{ display: 'flex', gap: 4 }}>
          {[['#story', 'Story'], ['#how', 'How it Works'], ['#impact', 'Impact'], ['#pricing', 'Pricing']].map(([h, l]) => (
            <a key={h} href={h} style={{
              padding: '6px 14px', color: 'var(--text-body)', fontSize: 13, fontWeight: 500,
              borderRadius: 100, textDecoration: 'none', transition: 'background 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { e.target.style.background = 'var(--surface-2)'; e.target.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-body)'; }}
            >{l}</a>
          ))}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggleTheme} aria-label="Toggle theme" style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)',
            border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <Link to="/login" style={{
            padding: '6px 16px', fontSize: 13, fontWeight: 500,
            color: 'var(--text-body)', textDecoration: 'none',
          }} className="v5-nav-signin">Sign in</Link>
          <Link to="/register" style={{
            padding: '7px 18px', background: '#E8921A', color: '#fff',
            borderRadius: 100, fontWeight: 600, fontSize: 13, textDecoration: 'none',
            transition: 'background 0.15s, transform 0.15s',
          }}
            onMouseEnter={e => { e.target.style.background = '#d47f16'; e.target.style.transform = 'scale(1.03)'; }}
            onMouseLeave={e => { e.target.style.background = '#E8921A'; e.target.style.transform = 'scale(1)'; }}
            className="v5-nav-cta"
          >Start free →</Link>
          {/* Mobile hamburger */}
          <button
            aria-label="Open menu"
            className="v5-hamburger"
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

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 76, left: 16, right: 16,
          background: theme === 'dark' ? 'rgba(10,11,18,0.97)' : 'rgba(255,255,255,0.97)',
          border: '1px solid var(--border)', borderRadius: 16, padding: '12px 8px',
          backdropFilter: 'blur(14px)', zIndex: 301, pointerEvents: 'auto',
        }}>
          {[['#story', 'Story'], ['#how', 'How it Works'], ['#impact', 'Impact'], ['#pricing', 'Pricing']].map(([h, l]) => (
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

// ─── ACT 1: The Dream (Hero) ──────────────────────────────────────────────────

function Act1Hero() {
  const [phase, setPhase] = useState('dream'); // dream → chaos → flow
  const [scrollY, setScrollY] = useState(0);
  const sectionRef = useRef(null);

  useEffect(() => {
    const fn = () => {
      const sy = window.scrollY;
      setScrollY(sy);
      const vh = window.innerHeight;
      if (sy < vh * 0.3) setPhase('dream');
      else if (sy < vh * 0.7) setPhase('chaos');
      else setPhase('flow');
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const parallaxY = reduced() ? 0 : scrollY * 0.35;
  const heroOpacity = Math.max(0, 1 - scrollY / (window.innerHeight * 0.8));

  return (
    <section
      ref={sectionRef}
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'var(--bg-page)',
      }}
    >
      {/* Gradient background */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 60% at 50% 10%, rgba(232,146,26,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Flowing particles */}
      <FlowCanvas active style={{ opacity: 0.6 }} />

      {/* Floating docs */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        transform: reduced() ? 'none' : `translateY(${parallaxY * 0.3}px)`,
        transition: 'transform 0.05s linear',
      }}>
        {FLOATING_DOCS.map((doc, i) => (
          <FloatingDoc key={i} doc={doc} phase={phase} index={i} />
        ))}
      </div>

      {/* Center content */}
      <div style={{
        position: 'relative', zIndex: 10, textAlign: 'center',
        padding: '0 24px', maxWidth: 760,
        transform: reduced() ? 'none' : `translateY(${-parallaxY * 0.15}px)`,
        opacity: heroOpacity,
        transition: 'opacity 0.1s linear',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 14px', borderRadius: 100,
          background: 'rgba(232,146,26,0.1)', border: '1px solid rgba(232,146,26,0.3)',
          marginBottom: 28,
          fontSize: 12, fontWeight: 600, color: '#E8921A',
          letterSpacing: '0.08em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8921A', animation: 'v5pulse 2s infinite' }} />
          BUILT FOR INDIAN CREATORS
        </div>

        {/* Main headline */}
        <h1 style={{
          fontSize: 'clamp(42px, 7vw, 88px)',
          fontWeight: 900, lineHeight: 1.0,
          letterSpacing: '-0.04em',
          color: 'var(--text-primary)',
          margin: '0 0 20px',
        }}>
          <span style={{ display: 'block' }}>Create.</span>
          <span style={{
            display: 'block',
            background: 'linear-gradient(135deg, #E8921A 0%, #f59e0b 50%, #E8921A 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
            animation: 'v5shimmer 4s ease infinite',
          }}>
            Everything else flows.
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-body)',
          lineHeight: 1.65, maxWidth: 540, margin: '0 auto 40px',
          fontWeight: 400,
        }}>
          Invoices. GST. TDS. Advance tax. Client management.
          <br />
          All running quietly — so you never have to stop creating.
        </p>

        {/* CTAs */}
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

        {/* Social proof */}
        <p style={{ marginTop: 36, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          <span style={{ color: '#E8921A', fontWeight: 700 }}>2,400+</span> creators managing ₹42Cr+ in annual billings
        </p>
      </div>

      {/* Scroll indicator */}
      <div aria-hidden="true" style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        opacity: scrollY > 50 ? 0 : 0.6,
        transition: 'opacity 0.3s ease',
      }}>
        <div style={{
          width: 1, height: 48,
          background: 'linear-gradient(to bottom, var(--text-muted), transparent)',
          animation: 'v5scrollline 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scroll</span>
      </div>
    </section>
  );
}

// ─── ACT 2: The Reality (Chaos builds) ──────────────────────────────────────

const CHAOS_ITEMS = [
  { label: 'Invoice #38 — overdue 12 days', color: '#f87171', icon: FileText },
  { label: 'GST portal: deadline today', color: '#fb923c', icon: Shield },
  { label: 'TDS mismatch — Boat invoice', color: '#f59e0b', icon: TrendingDown },
  { label: 'Excel sheet: #REF! error', color: '#f87171', icon: BarChart2 },
  { label: 'CA needs advance tax now', color: '#fb923c', icon: Calendar },
  { label: 'Brand payment: still pending', color: '#ef4444', icon: IndianRupee },
  { label: 'GSTR-1: 3 invoices missing', color: '#f59e0b', icon: FileText },
  { label: 'Form 16A: still not received', color: '#fb923c', icon: Download },
  { label: '5 spreadsheets. None agree.', color: '#f87171', icon: BarChart2 },
  { label: 'Mamaearth PO: wrong GST no.', color: '#ef4444', icon: Briefcase },
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
      position: 'relative', padding: 'clamp(80px, 12vw, 140px) 24px',
      background: 'var(--bg-page)', overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>ACT II — THE REALITY</div>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900,
            lineHeight: 1.1, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', marginBottom: 16,
          }}>
            No one starts creating
            <br />
            <span style={{ color: '#f87171' }}>to become an accountant.</span>
          </h2>
          <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 56px' }}>
            You upload a video. Brands respond. Then the real work begins — and none of it is creating.
          </p>
        </Reveal>

        {/* Chaos pile */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 10,
          position: 'relative',
        }}>
          {CHAOS_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const show = i < count;
            return (
              <div
                key={i}
                style={{
                  opacity: show ? 1 : 0,
                  transform: show ? `rotate(${(i % 5 - 2) * 1.2}deg) scale(1)` : 'scale(0.8) translateY(10px)',
                  transition: reduced() ? 'none' : `all 0.4s cubic-bezier(.34,1.56,.64,1) ${i * 30}ms`,
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'var(--surface-1)',
                  border: `1px solid ${item.color}44`,
                  borderRadius: 10,
                  boxShadow: `0 2px 12px ${item.color}22`,
                  fontSize: 12, fontWeight: 600, color: 'var(--text-body)',
                  textAlign: 'left',
                }}
              >
                <Icon size={13} color={item.color} style={{ flexShrink: 0 }} />
                {item.label}
              </div>
            );
          })}
        </div>

        {/* Freeze moment */}
        <Reveal delay={400}>
          <div style={{
            marginTop: 72, padding: '40px 32px',
            background: 'linear-gradient(135deg, rgba(232,146,26,0.08) 0%, rgba(232,146,26,0.03) 100%)',
            border: '1px solid rgba(232,146,26,0.2)', borderRadius: 20,
          }}>
            <p style={{
              fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 700,
              color: 'var(--text-primary)', lineHeight: 1.4, margin: 0,
              letterSpacing: '-0.02em',
            }}>
              "What if all of this simply… flowed?"
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── ACT 3: Flow (transformation) ────────────────────────────────────────────

const FLOW_TRANSFORMS = [
  { from: 'Invoice created', to: 'Sent in 30 sec', icon: FileText, color: '#4ade80' },
  { from: 'GST calculation', to: 'Auto-calculated', icon: Shield, color: '#60a5fa' },
  { from: 'TDS deducted', to: 'Instantly recorded', icon: TrendingDown, color: '#a78bfa' },
  { from: 'Payment received', to: 'Income logged', icon: IndianRupee, color: '#f59e0b' },
  { from: 'Advance tax due', to: 'Pre-calculated', icon: Calendar, color: '#fb923c' },
  { from: 'CA asks for data', to: 'ZIP ready to send', icon: Download, color: '#34d399' },
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
    <div
      ref={ref}
      style={{
        perspective: 800,
        height: 120,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(24px)',
        transition: reduced() ? 'none' : `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
      }}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: reduced() ? 'none' : 'transform 0.6s cubic-bezier(.23,1,.32,1)',
      }}>
        {/* Front: chaos */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: 20, borderRadius: 14,
          background: 'var(--surface-1)', border: '1px solid rgba(248,113,113,0.3)',
          boxShadow: '0 2px 12px rgba(248,113,113,0.1)',
        }}>
          <Icon size={20} color="#f87171" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>{item.from}</span>
          <span style={{ fontSize: 11, color: '#f87171', fontWeight: 500 }}>MANUAL</span>
        </div>
        {/* Back: flow */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: 20, borderRadius: 14,
          background: `linear-gradient(135deg, ${item.color}18 0%, ${item.color}08 100%)`,
          border: `1px solid ${item.color}44`,
          boxShadow: `0 4px 20px ${item.color}22`,
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
      padding: 'clamp(80px, 12vw, 140px) 24px',
      background: 'linear-gradient(180deg, var(--bg-page) 0%, var(--surface-0) 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
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
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#E8921A', textTransform: 'uppercase', marginBottom: 16 }}>ACT III — THE FLOW</div>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900,
            lineHeight: 1.1, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', marginBottom: 16,
          }}>
            Chaos becomes clarity.
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #E8921A, #f59e0b)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Automatically.</span>
          </h2>
          <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 64px' }}>
            Watch what was manual become effortless. Every card flips from friction to flow.
          </p>
        </Reveal>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 14,
          position: 'relative',
        }}>
          {FLOW_TRANSFORMS.map((item, i) => (
            <FlowTransformCard key={i} item={item} index={i} />
          ))}
        </div>

        {/* Flow arrow */}
        <Reveal delay={800}>
          <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 2, height: 48,
              background: 'linear-gradient(to bottom, rgba(232,146,26,0.8), transparent)',
            }} />
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 100,
              background: 'rgba(232,146,26,0.1)', border: '1px solid rgba(232,146,26,0.3)',
              fontSize: 13, fontWeight: 600, color: '#E8921A',
            }}>
              <Zap size={13} />
              One platform. Zero manual work.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── ACT 4: How It Works (sticky scroll) ────────────────────────────────────

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
    body: 'Mamaearth pays ₹1,06,200. CreatiFlow records the ₹11,800 TDS before you even check your account. Form 16A? Already tracked.',
    tag: 'Form 16A: awaiting',
    detail: 'Net received: ₹1,06,200 · TDS: ₹11,800 · Cert pending',
  },
  {
    step: '04', icon: IndianRupee, color: '#f59e0b',
    title: 'Income logged. P&L updated.',
    body: 'Payment hits your account. CreatiFlow auto-logs it. Running totals current. Gross income, net income, deductions — all live.',
    tag: 'No spreadsheet needed',
    detail: 'FY 2024-25 gross: ₹38,40,000 · Net: ₹33,12,000',
  },
  {
    step: '05', icon: Calendar, color: '#fb923c',
    title: 'Sep 15 arrives. You pay zero penalty.',
    body: 'CreatiFlow calculated your Q3 advance tax 14 days before the deadline. Reminder sent. ₹18,400 paid. No interest. No CA panic calls.',
    tag: '14-day reminder sent',
    detail: 'Q3 advance tax: ₹18,400 · Penalty avoided: ₹2,460',
  },
  {
    step: '06', icon: Download, color: '#34d399',
    title: 'March. Your CA opens the ZIP.',
    body: '20 minutes later, ITR filed. Your CA calls it the cleanest file of the season. You\'re already working on your next video.',
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
      {/* Step number + line */}
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
            margin: '6px 0',
            transition: 'background 0.5s ease',
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: isActive ? stage.color : 'var(--text-muted)', marginBottom: 6 }}>
          STEP {stage.step}
        </div>
        <h3 style={{
          margin: '0 0 8px', fontSize: 'clamp(16px, 1.8vw, 20px)',
          fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3,
          letterSpacing: '-0.02em',
        }}>{stage.title}</h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-body)', lineHeight: 1.7 }}>{stage.body}</p>
        {isActive && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 100,
            background: `${stage.color}18`, border: `1px solid ${stage.color}44`,
            fontSize: 11, fontWeight: 600, color: stage.color,
            animation: reduced() ? 'none' : 'v5fadein 0.3s ease',
          }}>
            <Check size={10} />
            {stage.tag}
          </div>
        )}
      </div>
    </div>
  );
}

function Act4HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const fn = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionH = sectionRef.current.offsetHeight - window.innerHeight;
      if (rect.top > 0 || rect.bottom < window.innerHeight) return;
      const prog = Math.max(0, Math.min(1, -rect.top / sectionH));
      setActiveIndex(Math.min(JOURNEY.length - 1, Math.floor(prog * JOURNEY.length)));
    };
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, [isMobile]);

  if (isMobile) {
    return (
      <section id="how" style={{ padding: '80px 24px', background: 'var(--bg-page)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#E8921A', textTransform: 'uppercase', marginBottom: 12 }}>ACT IV — HOW IT WORKS</div>
              <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 16px' }}>
                One deal. Fully handled.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-body)', lineHeight: 1.7 }}>
                Follow Riya's journey — from brand deal to filed ITR. CreatiFlow handles every step.
              </p>
            </div>
          </Reveal>
          {JOURNEY.map((stage, i) => (
            <Reveal key={i} delay={i * 80}>
              <div style={{
                display: 'flex', gap: 16, alignItems: 'flex-start',
                padding: '20px 0', borderBottom: i < JOURNEY.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: `${stage.color}18`, border: `2px solid ${stage.color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
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
    <section
      id="how"
      ref={sectionRef}
      style={{ height: `${100 * (JOURNEY.length + 1)}vh`, position: 'relative' }}
    >
      <div style={{
        position: 'sticky', top: 0,
        height: '100vh', overflow: 'hidden',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 0, maxWidth: 1200, margin: '0 auto',
        padding: '0 48px', alignItems: 'center',
      }}>
        {/* Left: steps */}
        <div style={{ paddingRight: 60, overflowY: 'hidden', maxHeight: '80vh', overflowX: 'hidden' }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#E8921A', textTransform: 'uppercase', marginBottom: 12 }}>ACT IV — HOW IT WORKS</div>
            <h2 style={{ fontSize: 'clamp(28px, 2.8vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 12px' }}>
              One deal.<br />Fully handled.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-body)', lineHeight: 1.7, margin: 0 }}>
              Follow Riya's journey from a brand DM to a filed ITR. Every step flows automatically.
            </p>
          </div>
          {JOURNEY.map((stage, i) => (
            <JourneyStep key={i} stage={stage} index={i} activeIndex={activeIndex} />
          ))}
        </div>

        {/* Right: live card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LiveCard stage={JOURNEY[activeIndex]} />
        </div>
      </div>
    </section>
  );
}

function LiveCard({ stage }) {
  const Icon = stage.icon;
  const prev = useRef(stage);

  useEffect(() => { prev.current = stage; }, [stage]);

  return (
    <div
      key={stage.step}
      style={{
        width: '100%', maxWidth: 380,
        padding: '28px', borderRadius: 20,
        background: `linear-gradient(135deg, ${stage.color}0f 0%, ${stage.color}05 100%)`,
        border: `1px solid ${stage.color}33`,
        boxShadow: `0 20px 60px ${stage.color}18`,
        animation: reduced() ? 'none' : 'v5cardenter 0.4s cubic-bezier(.22,1,.36,1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: `${stage.color}22`,
          border: `1px solid ${stage.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} color={stage.color} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: stage.color }}>STEP {stage.step}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{stage.title}</div>
        </div>
      </div>

      {/* Detail line */}
      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: 'var(--surface-1)', border: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace',
        letterSpacing: '0.02em', lineHeight: 1.7, marginBottom: 16,
      }}>
        {stage.detail}
      </div>

      {/* Tag */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 100,
        background: `${stage.color}18`, border: `1px solid ${stage.color}44`,
        fontSize: 12, fontWeight: 700, color: stage.color,
      }}>
        <Check size={11} />
        {stage.tag}
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 20, justifyContent: 'flex-end' }}>
        {JOURNEY.map((_, i) => (
          <div key={i} style={{
            width: i === parseInt(stage.step) - 1 ? 20 : 6,
            height: 6, borderRadius: 3,
            background: i === parseInt(stage.step) - 1 ? stage.color : 'var(--border)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── ACT 5: Impact (features as life improvements) ───────────────────────────

const IMPACTS = [
  {
    icon: FileText, color: '#60a5fa',
    headline: 'Send a professional invoice in 30 seconds.',
    subline: 'GST auto-calculated. Rule 46-compliant. Mamaearth\'s finance team gets exactly what they need.',
    before: 'Invoice Generation', stat: '30s', statLabel: 'avg send time',
  },
  {
    icon: Shield, color: '#4ade80',
    headline: 'One less thing to think about.',
    subline: 'CGST, SGST, IGST — CreatiFlow picks the right one based on your state codes. You never think about it.',
    before: 'GST Automation', stat: '₹0', statLabel: 'penalty risk',
  },
  {
    icon: TrendingDown, color: '#a78bfa',
    headline: 'Every rupee tracked. No surprises.',
    subline: 'TDS deducted by brands? Recorded automatically. Form 16A expected? Tracked. ITR season? Zero panic.',
    before: 'TDS Management', stat: '100%', statLabel: 'TDS reconciliation',
  },
  {
    icon: Calendar, color: '#fb923c',
    headline: 'Never miss an advance tax deadline.',
    subline: '14-day reminders. Pre-calculated amounts. No penalties, no interest, no surprise CA calls.',
    before: 'Tax Planning', stat: '14d', statLabel: 'before every deadline',
  },
  {
    icon: Briefcase, color: '#f59e0b',
    headline: 'Your brand pipeline, always current.',
    subline: 'Log deals in seconds. Track status. Forecast revenue. Know which brands owe you money — right now.',
    before: 'Client Management', stat: '∞', statLabel: 'brand deals tracked',
  },
  {
    icon: Download, color: '#34d399',
    headline: 'Your CA will love you.',
    subline: 'All invoices, all income, all TDS. One clean ZIP. 20 minutes to file. Cleanest file of the season.',
    before: 'Tax Filing Export', stat: '20m', statLabel: 'to file ITR',
  },
];

function ImpactCard({ item, index }) {
  const [ref, vis] = useInView(0.15);
  const Icon = item.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(32px)',
        transition: reduced() ? 'none' : `opacity 0.6s ease ${index * 80}ms, transform 0.6s ease ${index * 80}ms`,
        padding: '28px', borderRadius: 18,
        background: hovered
          ? `linear-gradient(135deg, ${item.color}12 0%, ${item.color}06 100%)`
          : 'var(--surface-1)',
        border: `1px solid ${hovered ? item.color + '44' : 'var(--border)'}`,
        cursor: 'default',
        boxShadow: hovered ? `0 12px 40px ${item.color}18` : '0 2px 8px rgba(0,0,0,0.05)',
        transition: reduced() ? 'none'
          : `opacity 0.6s ease ${index * 80}ms, transform 0.6s ease ${index * 80}ms, background 0.25s ease, border 0.25s ease, box-shadow 0.25s ease`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${item.color}18`, border: `1px solid ${item.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={item.color} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.stat}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{item.statLabel}</div>
        </div>
      </div>
      <h3 style={{ margin: '0 0 10px', fontSize: 'clamp(15px, 1.4vw, 17px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
        {item.headline}
      </h3>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.7 }}>{item.subline}</p>
    </div>
  );
}

function Act5Impact() {
  return (
    <section id="impact" style={{
      padding: 'clamp(80px, 12vw, 140px) 24px',
      background: 'var(--bg-page)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#E8921A', textTransform: 'uppercase', marginBottom: 16 }}>ACT V — THE IMPACT</div>
            <h2 style={{
              fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900,
              lineHeight: 1.1, letterSpacing: '-0.03em',
              color: 'var(--text-primary)', marginBottom: 16,
            }}>
              Not features.
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #E8921A, #f59e0b)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Life improvements.</span>
            </h2>
            <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text-body)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
              Every tool in CreatiFlow is designed to give you back time, money, and mental space.
            </p>
          </div>
        </Reveal>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {IMPACTS.map((item, i) => <ImpactCard key={i} item={item} index={i} />)}
        </div>
      </div>
    </section>
  );
}

// ─── ACT 6: Ecosystem (creator at center) ────────────────────────────────────

const ECOSYSTEM_NODES = [
  { label: 'Invoices',    color: '#60a5fa', angle: 0   },
  { label: 'GST',         color: '#4ade80', angle: 60  },
  { label: 'TDS',         color: '#a78bfa', angle: 120 },
  { label: 'Clients',     color: '#fb923c', angle: 180 },
  { label: 'Analytics',   color: '#f59e0b', angle: 240 },
  { label: 'Taxes',       color: '#34d399', angle: 300 },
];

function EcosystemViz() {
  const [ref, vis] = useInView(0.3);
  const R = 140; // orbit radius

  return (
    <div ref={ref} style={{ position: 'relative', width: 340, height: 340, flexShrink: 0, margin: '0 auto' }}>
      {/* Orbit ring */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: '50%', left: '50%',
        width: R * 2, height: R * 2,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        border: '1px dashed rgba(232,146,26,0.2)',
        opacity: vis ? 1 : 0,
        transition: 'opacity 0.8s ease',
      }} />

      {/* Center node */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 72, height: 72,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(232,146,26,0.3), rgba(232,146,26,0.1))',
        border: '2px solid rgba(232,146,26,0.5)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 12px rgba(232,146,26,0.06)',
        opacity: vis ? 1 : 0,
        transition: 'opacity 0.5s ease',
        zIndex: 2,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#E8921A', letterSpacing: '0.05em' }}>YOU</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>CREATING</span>
      </div>

      {/* Satellite nodes */}
      {ECOSYSTEM_NODES.map((node, i) => {
        const rad = (node.angle - 90) * Math.PI / 180;
        const x = 170 + R * Math.cos(rad);
        const y = 170 + R * Math.sin(rad);
        const delay = 200 + i * 100;
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y,
            transform: vis ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.5)',
            opacity: vis ? 1 : 0,
            transition: reduced() ? 'none' : `opacity 0.5s ease ${delay}ms, transform 0.5s cubic-bezier(.34,1.56,.64,1) ${delay}ms`,
            zIndex: 2,
          }}>
            <div style={{
              padding: '6px 12px', borderRadius: 100,
              background: `${node.color}18`, border: `1px solid ${node.color}55`,
              fontSize: 11, fontWeight: 700, color: node.color,
              whiteSpace: 'nowrap',
            }}>{node.label}</div>
          </div>
        );
      })}

      {/* Connection lines via SVG */}
      <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {ECOSYSTEM_NODES.map((node, i) => {
          const rad = (node.angle - 90) * Math.PI / 180;
          const x = 170 + R * Math.cos(rad);
          const y = 170 + R * Math.sin(rad);
          return (
            <line
              key={i}
              x1="170" y1="170" x2={x} y2={y}
              stroke={node.color} strokeWidth="1.5"
              strokeOpacity={vis ? 0.3 : 0}
              strokeDasharray="4 4"
              style={{ transition: reduced() ? 'none' : `stroke-opacity 0.6s ease ${300 + i * 100}ms` }}
            />
          );
        })}
      </svg>
    </div>
  );
}

function Act6Ecosystem() {
  return (
    <section style={{
      padding: 'clamp(80px, 12vw, 140px) 24px',
      background: 'linear-gradient(180deg, var(--bg-page) 0%, var(--surface-0) 50%, var(--bg-page) 100%)',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#E8921A', textTransform: 'uppercase', marginBottom: 16 }}>ACT VI — YOUR ECOSYSTEM</div>
            <h2 style={{
              fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900,
              lineHeight: 1.1, letterSpacing: '-0.03em',
              color: 'var(--text-primary)', marginBottom: 16,
            }}>
              You're at the center.
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #E8921A, #f59e0b)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Everything orbits you.</span>
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
              ['Always current', 'Open CreatiFlow anytime and see exactly where your business stands. Live. Accurate. Complete.'],
            ].map(([title, desc], i) => (
              <Reveal key={i} delay={i * 100}>
                <div style={{ display: 'flex', gap: 14, padding: '18px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(232,146,26,0.12)', border: '1px solid rgba(232,146,26,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                  }}>
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

// ─── Pricing ─────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Starter', price: '₹0', period: '/month',
    desc: 'For creators just starting their business journey.',
    color: '#60a5fa',
    features: ['5 invoices/month', 'Basic GST calculation', 'TDS tracking', 'Advance tax reminders'],
    cta: 'Start free', href: '/register',
  },
  {
    name: 'Creator Pro', price: '₹599', period: '/month',
    desc: 'For serious creators managing real brand business.',
    color: '#E8921A',
    highlight: true,
    features: [
      'Unlimited invoices',
      'CGST / SGST / IGST auto', 'Full TDS + Form 16A tracker',
      'Advance tax calculator',
      'Brand deal CRM (unlimited)',
      'P&L + income dashboard',
      'ITR-ready export (ZIP)',
      'Priority support',
    ],
    cta: 'Start 14-day free trial', href: '/register',
  },
  {
    name: 'Agency', price: '₹1,999', period: '/month',
    desc: 'For MCNs, talent managers, and creator agencies.',
    color: '#a78bfa',
    features: ['Everything in Pro', 'Up to 20 creators', 'Team access', 'White-label invoices', 'Dedicated account manager'],
    cta: 'Contact us', href: '/register',
  },
];

function PricingCard({ plan, index }) {
  const [ref, vis] = useInView(0.15);
  return (
    <div
      ref={ref}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(36px)',
        transition: reduced() ? 'none' : `opacity 0.6s ease ${index * 100}ms, transform 0.6s ease ${index * 100}ms`,
        padding: '32px', borderRadius: 20, flex: 1,
        minWidth: 260, maxWidth: 360,
        background: plan.highlight
          ? `linear-gradient(160deg, rgba(232,146,26,0.14) 0%, rgba(232,146,26,0.05) 100%)`
          : 'var(--surface-1)',
        border: plan.highlight ? '2px solid rgba(232,146,26,0.5)' : '1px solid var(--border)',
        boxShadow: plan.highlight ? '0 24px 60px rgba(232,146,26,0.2)' : '0 4px 16px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
    >
      {plan.highlight && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          padding: '4px 16px', borderRadius: 100,
          background: '#E8921A', color: '#fff',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap',
        }}>MOST POPULAR</div>
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
      <Link to={plan.href} style={{
        display: 'block', textAlign: 'center',
        padding: plan.highlight ? '13px' : '11px',
        borderRadius: 100, fontWeight: 700, fontSize: 14,
        background: plan.highlight ? '#E8921A' : 'transparent',
        border: plan.highlight ? 'none' : `1.5px solid ${plan.color}66`,
        color: plan.highlight ? '#fff' : plan.color,
        textDecoration: 'none',
        transition: 'opacity 0.15s, transform 0.15s',
        boxShadow: plan.highlight ? '0 6px 20px rgba(232,146,26,0.3)' : 'none',
      }}
        onMouseEnter={e => { e.target.style.opacity = 0.88; e.target.style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { e.target.style.opacity = 1; e.target.style.transform = 'scale(1)'; }}
      >{plan.cta}</Link>
    </div>
  );
}

function Pricing() {
  return (
    <section id="pricing" style={{ padding: 'clamp(80px, 12vw, 140px) 24px', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
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

// ─── ACT 7: The Return (calm close) ──────────────────────────────────────────

function Act7Return() {
  const [ref, vis] = useInView(0.2);
  return (
    <section
      ref={ref}
      style={{
        position: 'relative', minHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(80px, 12vw, 140px) 24px',
        overflow: 'hidden',
        background: 'var(--bg-page)',
        textAlign: 'center',
      }}
    >
      {/* Calm background glow */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80vw', height: '80vw', maxWidth: 700, maxHeight: 700,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,146,26,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Subtle flowing particles — calm, few */}
      <FlowCanvas active={vis} style={{ opacity: 0.3 }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 660 }}>
        <Reveal>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#E8921A', textTransform: 'uppercase', marginBottom: 24 }}>ACT VII — THE RETURN</div>
          <h2 style={{
            fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900,
            lineHeight: 1.05, letterSpacing: '-0.04em',
            color: 'var(--text-primary)', margin: '0 0 24px',
          }}>
            Spend your energy
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #E8921A 0%, #f59e0b 50%, #E8921A 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 100%',
              animation: 'v5shimmer 4s ease infinite',
            }}>
              creating.
            </span>
          </h2>
          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-body)',
            lineHeight: 1.7, maxWidth: 520, margin: '0 auto 48px', fontWeight: 400,
          }}>
            We'll handle the business behind it.
            <br />
            Invoices. GST. TDS. Taxes. Running quietly, so you never have to stop.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <Link to="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '16px 36px',
            background: 'linear-gradient(135deg, #E8921A, #c8711a)',
            color: '#fff', borderRadius: 100, fontWeight: 700, fontSize: 18,
            textDecoration: 'none',
            boxShadow: '0 12px 40px rgba(232,146,26,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            letterSpacing: '-0.01em',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 20px 56px rgba(232,146,26,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(232,146,26,0.4)'; }}
          >
            Start Flowing — It's Free
            <Zap size={18} />
          </Link>
        </Reveal>

        <Reveal delay={350}>
          <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            No credit card. No setup. 60-second onboarding.
          </p>
        </Reveal>

        {/* Trust badges */}
        <Reveal delay={450}>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 48 }}>
            {[
              [Shield, 'SOC 2 Ready'],
              [Lock, 'Encrypted'],
              [RefreshCw, 'GSTIN Validated'],
              [Check, 'Rule 46 Compliant'],
            ].map(([Icon, label], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                <Icon size={12} color="var(--text-muted)" />
                {label}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// Need Lock icon
function Lock({ size = 16, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{
      padding: '48px 24px 32px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-page)',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
          {/* Brand */}
          <div style={{ maxWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #E8921A, #c8711a)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>C</div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>CreatiFlow</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              The financial operating system for Indian content creators. Built for creators, by people who care about them.
            </p>
          </div>
          {/* Links */}
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
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>© 2025 CreatiFlow. Built with ♥ for Indian creators.</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>GST compliant per Rule 46 CGST Rules 2017</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Global styles (injected once) ───────────────────────────────────────────

const V5_STYLES = `
  /* V5 page base */
  .v5-page { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; }
  [data-theme='dark'] .v5-page  { --bg-page: #0a0b12; --surface-0: #0d0e18; --surface-1: rgba(255,255,255,0.04); --surface-2: rgba(255,255,255,0.07); --surface-3: rgba(255,255,255,0.11); }
  [data-theme='light'] .v5-page { --bg-page: #fafaf9; --surface-0: #f4f3ef; --surface-1: #ffffff; --surface-2: #f4f3ef; --surface-3: #ece9e3; }

  /* Keyframes */
  @keyframes v5float    { from { transform: translateY(0px) rotate(var(--rot,0deg)); } to { transform: translateY(-10px) rotate(var(--rot,0deg)); } }
  @keyframes v5pulse    { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.8); } }
  @keyframes v5shimmer  { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
  @keyframes v5scrollline { 0%,100% { opacity:0.5; transform:scaleY(1); } 50% { opacity:1; transform:scaleY(0.6); } }
  @keyframes v5fadein   { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
  @keyframes v5cardenter { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }

  /* Responsive nav */
  @media (max-width: 680px) {
    .v5-nav-links  { display: none !important; }
    .v5-nav-signin { display: none !important; }
    .v5-nav-cta    { display: none !important; }
    .v5-hamburger  { display: flex !important; }
  }
`;

function InjectStyles() {
  useEffect(() => {
    if (document.getElementById('v5-styles')) return;
    const tag = document.createElement('style');
    tag.id = 'v5-styles';
    tag.textContent = V5_STYLES;
    document.head.appendChild(tag);
    return () => document.getElementById('v5-styles')?.remove();
  }, []);
  return null;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LandingPageV5() {
  return (
    <div className="v5-page" style={{ position: 'relative', minHeight: '100vh' }}>
      <InjectStyles />
      <CursorGlow />
      <Navbar />
      <main id="main-content">
        <Act1Hero />
        <Act2Reality />
        <Act3Flow />
        <Act4HowItWorks />
        <Act5Impact />
        <Act6Ecosystem />
        <Pricing />
        <Act7Return />
      </main>
      <Footer />
    </div>
  );
}
