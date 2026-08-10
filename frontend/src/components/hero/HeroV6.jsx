/**
 * HeroV6 — Cinematic 5-Scene Scroll Narrative
 *
 * Scene 1  (0–15%)   Creator peacefully editing, docs drift in background
 * Scene 2  (15–35%)  Invoices, reminders, GST forms accumulate
 * Scene 3  (35–55%)  Creator buried in admin chaos
 * Scene 4  (55–70%)  Everything freezes. One sentence.
 * Scene 5  (70–100%) Documents flow into CreatiFlow, resolve. Dashboard appears.
 *
 * Stack: GSAP ScrollTrigger + Lenis + pure CSS/SVG
 */

import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// ─── Document hologram data ───────────────────────────────────────────────────

const DOCS = [
  {
    id: 'invoice',
    label: 'GST Invoice',
    sublabel: '#INV-0042 • ₹45,000',
    icon: '📄',
    color: '#E8921A',
    startX: -380, startY: -160, startR: -18,
    orbitR: 320, orbitAngle: 210,
    resolvedLabel: 'Invoice → Paid',
  },
  {
    id: 'tds',
    label: 'TDS Deducted',
    sublabel: 'boAt • ₹6,200 pending',
    icon: '🧾',
    color: '#3B82F6',
    startX: 360, startY: -180, startR: 16,
    orbitR: 340, orbitAngle: 330,
    resolvedLabel: 'TDS → Recorded',
  },
  {
    id: 'gst',
    label: 'GSTR-1 Due',
    sublabel: '11th Jul • Overdue',
    icon: '⚠️',
    color: '#EF4444',
    startX: -420, startY: 120, startR: 12,
    orbitR: 290, orbitAngle: 150,
    resolvedLabel: 'GST → Filed',
  },
  {
    id: 'contract',
    label: 'Brand Contract',
    sublabel: 'Mamaearth • Sign now',
    icon: '✍️',
    color: '#8B5CF6',
    startX: 400, startY: 140, startR: -14,
    orbitR: 360, orbitAngle: 60,
    resolvedLabel: 'Contract → Organized',
  },
  {
    id: 'payment',
    label: 'Payment Due',
    sublabel: 'PhonePe • ₹28,000',
    icon: '💸',
    color: '#10B981',
    startX: 480, startY: -20, startR: 8,
    orbitR: 300, orbitAngle: 20,
    resolvedLabel: 'Payment → Tracked',
  },
  {
    id: 'advance',
    label: 'Advance Tax',
    sublabel: 'Jun 15 • ₹18,500 due',
    icon: '📅',
    color: '#F59E0B',
    startX: -460, startY: -60, startR: -10,
    orbitR: 350, orbitAngle: 260,
    resolvedLabel: 'Tax → Planned',
  },
  {
    id: 'chat',
    label: 'Client Message',
    sublabel: 'Where is my invoice?',
    icon: '💬',
    color: '#06B6D4',
    startX: 60, startY: -280, startR: 6,
    orbitR: 280, orbitAngle: 100,
    resolvedLabel: 'Client → Handled',
  },
];

// ─── Easing ───────────────────────────────────────────────────────────────────
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

// ─── Main component ───────────────────────────────────────────────────────────

export default function HeroV6() {
  const wrapperRef = useRef(null);
  const stickyRef = useRef(null);
  const creatorRef = useRef(null);
  const docRefs = useRef([]);
  const resolvedStreamRef = useRef(null);
  const freezeTextRef = useRef(null);
  const ctaRef = useRef(null);
  const bgRef = useRef(null);
  const particlesRef = useRef(null);
  const auroraRef = useRef(null);
  const lenisRef = useRef(null);
  const [scene, setScene] = useState(1);

  useEffect(() => {
    // ── Initial states — must happen before timeline ──────────────────────────
    // Docs hidden far off-screen
    DOCS.forEach((doc, i) => {
      const el = docRefs.current[i];
      if (!el) return;
      gsap.set(el, {
        x: doc.startX * 1.8,
        y: doc.startY * 1.8,
        rotation: doc.startR * 2,
        opacity: 0,
        scale: 0.6,
      });
    });
    gsap.set(freezeTextRef.current, { opacity: 0, y: 30 });
    gsap.set(resolvedStreamRef.current, { opacity: 0, scaleY: 0, transformOrigin: 'top center' });
    gsap.set(ctaRef.current, { opacity: 0, y: 40 });

    // ── Lenis smooth scroll ──────────────────────────────────────────────────
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // ── Creator entrance (independent of scroll) ──────────────────────────────
    gsap.fromTo(
      creatorRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 1.6, ease: 'power3.out', delay: 0.2 }
    );

    // ── Master scroll timeline ─────────────────────────────────────────────────
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapperRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        onUpdate: (self) => {
          const p = self.progress;
          if (p < 0.15) setScene(1);
          else if (p < 0.35) setScene(2);
          else if (p < 0.55) setScene(3);
          else if (p < 0.70) setScene(4);
          else setScene(5);
        },
      },
    });

    // Scene 1→2 (0–15%): first 3 docs drift in from the periphery
    DOCS.slice(0, 3).forEach((doc, i) => {
      const el = docRefs.current[i];
      if (!el) return;
      tl.to(el, {
        x: doc.startX,
        y: doc.startY,
        rotation: doc.startR,
        opacity: 1,
        scale: 1,
        duration: 0.14,
        ease: 'power2.out',
      }, i * 0.04);
    });

    // Scene 2→3 (15–35%): remaining 4 docs appear, creator begins to dim
    DOCS.slice(3).forEach((doc, i) => {
      const el = docRefs.current[i + 3];
      if (!el) return;
      tl.to(el, {
        x: doc.startX,
        y: doc.startY,
        rotation: doc.startR,
        opacity: 1,
        scale: 1,
        duration: 0.12,
        ease: 'power2.out',
      }, 0.15 + i * 0.03);
    });
    tl.to(creatorRef.current, {
      filter: 'brightness(0.72)',
      duration: 0.18,
    }, 0.18);

    // Scene 3 (35–55%): docs close in, creator dimmer but still readable
    DOCS.forEach((doc, i) => {
      const el = docRefs.current[i];
      if (!el) return;
      const angle = (doc.orbitAngle * Math.PI) / 180;
      tl.to(el, {
        x: Math.cos(angle) * 170,
        y: Math.sin(angle) * 105,
        rotation: doc.startR * 0.25,
        scale: 1.08,
        duration: 0.18,
        ease: 'power1.inOut',
      }, 0.36 + i * 0.012);
    });
    tl.to(creatorRef.current, {
      filter: 'brightness(0.5)',
      duration: 0.18,
    }, 0.38);

    // Scene 4 (55–70%): everything slows, freezes. Docs fade back, freeze text appears.
    DOCS.forEach((doc, i) => {
      const el = docRefs.current[i];
      if (!el) return;
      tl.to(el, {
        scale: 0.88,
        opacity: 0.28,
        duration: 0.1,
        ease: 'power1.in',
      }, 0.56 + i * 0.004);
    });
    tl.to(creatorRef.current, {
      filter: 'brightness(0.32)',
      duration: 0.08,
    }, 0.57);
    tl.to(auroraRef.current, { opacity: 0.15, duration: 0.1 }, 0.56);
    tl.to(freezeTextRef.current, { opacity: 1, y: 0, duration: 0.12 }, 0.62);

    // Scene 5 (70–100%): resolution — freeze lifts, docs funnel out, CTA appears
    tl.to(freezeTextRef.current, { opacity: 0, y: -18, duration: 0.07 }, 0.71);
    tl.to(creatorRef.current, { filter: 'brightness(1)', duration: 0.14, ease: 'power2.out' }, 0.73);
    tl.to(auroraRef.current, { opacity: 1, duration: 0.14 }, 0.73);

    DOCS.forEach((doc, i) => {
      const el = docRefs.current[i];
      if (!el) return;
      tl.to(el, {
        x: 0, y: 60,
        rotation: 0, scale: 0.08, opacity: 0,
        duration: 0.09, ease: 'power3.in',
      }, 0.73 + i * 0.022);
    });

    tl.to(resolvedStreamRef.current, { opacity: 1, scaleY: 1, duration: 0.13, ease: 'power2.out' }, 0.84);
    tl.to(ctaRef.current, { opacity: 1, y: 0, duration: 0.14, ease: 'power2.out' }, 0.89);

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={wrapperRef} style={{ height: '600vh', position: 'relative' }}>
      {/* ── Sticky viewport ──────────────────────────────────────────────── */}
      <div
        ref={stickyRef}
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Layer 1: Background */}
        <Background bgRef={bgRef} />

        {/* Layer 2: Aurora */}
        <Aurora auroraRef={auroraRef} scene={scene} />

        {/* Layer 3: Particles */}
        <Particles particlesRef={particlesRef} />

        {/* Layer 4: Floating document holograms */}
        {DOCS.map((doc, i) => (
          <DocHologram
            key={doc.id}
            doc={doc}
            ref={el => (docRefs.current[i] = el)}
          />
        ))}

        {/* Layer 5: Creator scene (SVG) */}
        <div
          ref={creatorRef}
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 520,
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          <CreatorScene />
        </div>

        {/* Layer 6: Scene headline (top center) */}
        <SceneHeadline scene={scene} />

        {/* Layer 7: Freeze text (scene 4) */}
        <div
          ref={freezeTextRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 20,
            pointerEvents: 'none',
            width: '90%',
            maxWidth: 640,
          }}
        >
          <FreezeText />
        </div>

        {/* Layer 8: Resolution stream (scene 5) */}
        <div
          ref={resolvedStreamRef}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            height: '100%',
            background: 'linear-gradient(180deg, transparent 0%, #E8921A 40%, #E8921A 60%, transparent 100%)',
            zIndex: 15,
            filter: 'blur(1px)',
            boxShadow: '0 0 24px 8px rgba(232,146,26,0.4)',
            pointerEvents: 'none',
          }}
        />

        {/* Layer 9: Final CTA (scene 5) */}
        <div
          ref={ctaRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 25,
            width: '90%',
            maxWidth: 620,
          }}
        >
          <HeroCTA />
        </div>

        {/* Scroll hint (scene 1 only) */}
        {scene === 1 && <ScrollHint />}
      </div>
    </div>
  );
}

// ─── Background ───────────────────────────────────────────────────────────────

function Background({ bgRef }) {
  return (
    <div
      ref={bgRef}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--bg-hero, #07080f)',
        zIndex: 0,
      }}
    >
      {/* Noise texture */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }}
      >
        <filter id="heroNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#heroNoise)" />
      </svg>
    </div>
  );
}

// ─── Aurora ───────────────────────────────────────────────────────────────────

function Aurora({ auroraRef, scene }) {
  return (
    <div
      ref={auroraRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        transition: 'opacity 1.2s ease',
      }}
    >
      {/* Bottom warm glow — desk lamp / laptop screen */}
      <div style={{
        position: 'absolute',
        bottom: -60,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 800,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(232,146,26,0.18) 0%, rgba(232,146,26,0.06) 40%, transparent 70%)',
        filter: 'blur(30px)',
      }} />
      {/* Top cool glow — monitor / creative energy */}
      <div style={{
        position: 'absolute',
        top: -100,
        left: '30%',
        width: 600,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.10) 0%, transparent 60%)',
        filter: 'blur(50px)',
      }} />
      {/* Purple accent — right side */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '10%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />
    </div>
  );
}

// ─── Particles ────────────────────────────────────────────────────────────────

const PARTICLE_DATA = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.sin(i * 137.5 * (Math.PI / 180)) * 48 + 50,
  y: Math.cos(i * 137.5 * (Math.PI / 180)) * 48 + 50,
  size: 1 + (i % 3) * 0.5,
  delay: (i * 0.18) % 4,
  duration: 3 + (i % 5) * 0.8,
  opacity: 0.15 + (i % 4) * 0.08,
}));

function Particles({ particlesRef }) {
  return (
    <div
      ref={particlesRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {PARTICLE_DATA.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(232,146,26,0.6)',
            opacity: p.opacity,
            animation: `particleDrift ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes particleDrift {
          0%   { transform: translateY(0) scale(1); opacity: var(--op, 0.2); }
          100% { transform: translateY(-12px) scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Document Hologram ────────────────────────────────────────────────────────

import { forwardRef } from 'react';

const DocHologram = forwardRef(function DocHologram({ doc }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -44,
        marginLeft: -110,
        width: 220,
        zIndex: 8,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      {/* Glass hologram card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid rgba(${hexToRgb(doc.color)},0.3)`,
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: `
          0 0 0 1px rgba(${hexToRgb(doc.color)},0.1),
          0 8px 32px rgba(0,0,0,0.4),
          inset 0 1px 0 rgba(255,255,255,0.08),
          0 0 20px rgba(${hexToRgb(doc.color)},0.15)
        `,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 14 }}>{doc.icon}</span>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: doc.color,
            letterSpacing: '0.04em',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {doc.label}
          </span>
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.3,
        }}>
          {doc.sublabel}
        </div>
        {/* Hologram scan line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(${hexToRgb(doc.color)},0.6), transparent)`,
          borderRadius: '0 0 12px 12px',
          animation: `hologramScan 2.4s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`,
        }} />
      </div>
      <style>{`
        @keyframes hologramScan {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
});

// ─── Creator Scene (SVG) ──────────────────────────────────────────────────────

function CreatorScene() {
  return (
    <svg
      viewBox="0 0 520 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* ── Desk surface ─────────────────────────────────────────────────── */}
      <ellipse cx="260" cy="385" rx="240" ry="18" fill="rgba(232,146,26,0.06)" />
      <rect x="40" y="370" width="440" height="10" rx="5" fill="rgba(255,255,255,0.04)" />
      {/* Desk edge highlight */}
      <line x1="40" y1="370" x2="480" y2="370" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* ── Ring light (behind creator) ───────────────────────────────────── */}
      <circle cx="260" cy="200" r="130" stroke="rgba(232,146,26,0.06)" strokeWidth="28" />
      <circle cx="260" cy="200" r="130" stroke="rgba(232,146,26,0.12)" strokeWidth="2" />
      {/* Ring light inner glow */}
      <circle cx="260" cy="200" r="100" fill="rgba(232,146,26,0.03)" />

      {/* ── Camera on tripod (left) ───────────────────────────────────────── */}
      {/* Tripod legs */}
      <line x1="95" y1="320" x2="75" y2="370" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <line x1="95" y1="320" x2="115" y2="370" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <line x1="95" y1="320" x2="95" y2="370" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      {/* Tripod pole */}
      <line x1="95" y1="180" x2="95" y2="320" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
      {/* Camera body */}
      <rect x="75" y="160" width="50" height="34" rx="5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      {/* Camera lens */}
      <circle cx="100" cy="177" r="12" fill="rgba(30,30,50,0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <circle cx="100" cy="177" r="7" fill="rgba(10,10,30,0.95)" />
      <circle cx="100" cy="177" r="3" fill="rgba(59,130,246,0.5)" />
      {/* Rec light */}
      <circle cx="118" cy="163" r="3" fill="#EF4444">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* Camera mic */}
      <rect x="83" y="152" width="16" height="9" rx="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      {/* ── Creator silhouette ────────────────────────────────────────────── */}
      {/* Body / torso */}
      <path
        d="M 210 370 Q 205 310 210 280 Q 215 250 260 242 Q 305 250 310 280 Q 315 310 310 370 Z"
        fill="rgba(15,16,28,0.95)"
        stroke="rgba(232,146,26,0.15)"
        strokeWidth="1"
      />
      {/* Left arm */}
      <path
        d="M 215 280 Q 195 295 185 320 Q 180 340 188 350"
        stroke="rgba(15,16,28,0.95)"
        strokeWidth="22"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 215 280 Q 195 295 185 320 Q 180 340 188 350"
        stroke="rgba(232,146,26,0.1)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right arm */}
      <path
        d="M 305 280 Q 325 295 335 320 Q 340 340 332 350"
        stroke="rgba(15,16,28,0.95)"
        strokeWidth="22"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 305 280 Q 325 295 335 320 Q 340 340 332 350"
        stroke="rgba(232,146,26,0.1)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
      {/* Neck */}
      <rect x="248" y="222" width="24" height="26" rx="8" fill="rgba(20,18,32,0.95)" />
      {/* Head */}
      <ellipse cx="260" cy="200" rx="38" ry="44" fill="rgba(20,18,32,0.97)" stroke="rgba(232,146,26,0.12)" strokeWidth="1" />
      {/* Face glow from screen */}
      <ellipse cx="260" cy="212" rx="28" ry="34" fill="rgba(232,146,26,0.04)" />
      {/* Headphones */}
      <path
        d="M 224 198 Q 222 158 260 156 Q 298 158 296 198"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="217" y="193" width="12" height="18" rx="4" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <rect x="291" y="193" width="12" height="18" rx="4" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      {/* Rim light on head (from ring light) */}
      <ellipse cx="260" cy="172" rx="30" ry="6" fill="rgba(232,146,26,0.08)" filter="url(#rimBlur)" />

      {/* ── Laptop ────────────────────────────────────────────────────────── */}
      {/* Screen back */}
      <rect x="170" y="282" width="180" height="118" rx="8" fill="rgba(18,20,32,0.98)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      {/* Screen bezel */}
      <rect x="174" y="286" width="172" height="108" rx="6" fill="rgba(12,14,24,1)" />
      {/* Screen content — editor timeline */}
      <rect x="178" y="290" width="164" height="100" rx="4" fill="rgba(8,10,20,1)" />
      {/* Timeline tracks */}
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <rect x="182" y={296 + i * 22} width="20" height="15" rx="2" fill="rgba(255,255,255,0.05)" />
          <rect x="206" y={296 + i * 22} width={60 + (i % 3) * 20} height="15" rx="2" fill={i === 1 ? 'rgba(232,146,26,0.35)' : 'rgba(59,130,246,0.2)'} />
          <rect x={270 + (i % 3) * 15} y={296 + i * 22} width={40 + (i % 2) * 25} height="15" rx="2" fill={i === 2 ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)'} />
          <rect x={330 - (i % 2) * 10} y={296 + i * 22} width={20 + i * 8} height="15" rx="2" fill="rgba(16,185,129,0.2)" />
        </g>
      ))}
      {/* Playhead */}
      <line x1="255" y1="292" x2="255" y2="388" stroke="rgba(232,146,26,0.7)" strokeWidth="1.5" />
      <polygon points="252,292 258,292 255,296" fill="rgba(232,146,26,0.8)" />
      {/* Screen glow */}
      <rect x="174" y="286" width="172" height="108" rx="6" fill="none"
        style={{
          filter: 'blur(0)',
          boxShadow: '0 0 30px 8px rgba(232,146,26,0.15)',
        }}
      />
      {/* Laptop base / keyboard */}
      <path d="M 162 400 Q 165 392 170 390 L 350 390 Q 355 392 358 400 Z" fill="rgba(22,24,38,0.98)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* Keyboard rows */}
      {[0, 1, 2].map(row => (
        Array.from({ length: 10 }, (_, k) => (
          <rect
            key={`${row}-${k}`}
            x={175 + k * 17}
            y={394 + row * 0}
            width={14}
            height={3}
            rx={1}
            fill="rgba(255,255,255,0.04)"
          />
        ))
      ))}
      {/* Laptop screen glow reflection on desk */}
      <ellipse cx="260" cy="408" rx="120" ry="12" fill="rgba(232,146,26,0.06)" filter="url(#deskGlow)" />

      {/* ── Coffee mug (right of laptop) ─────────────────────────────────── */}
      <rect x="368" y="342" width="34" height="30" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
      {/* Mug handle */}
      <path d="M 402 350 Q 412 350 412 357 Q 412 364 402 364" stroke="rgba(255,255,255,0.14)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Coffee surface */}
      <ellipse cx="385" cy="344" rx="16" ry="4" fill="rgba(120,80,40,0.4)" />
      {/* Steam */}
      <path d="M 378 340 Q 376 332 378 326 Q 380 320 378 314" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <animate attributeName="d"
          values="
            M 378 340 Q 376 332 378 326 Q 380 320 378 314;
            M 378 340 Q 381 332 379 326 Q 377 320 380 314;
            M 378 340 Q 376 332 378 326 Q 380 320 378 314
          "
          dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.12;0.22;0.12" dur="2.5s" repeatCount="indefinite" />
      </path>
      <path d="M 386 338 Q 384 330 386 324 Q 388 318 386 312" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" strokeLinecap="round">
        <animate attributeName="d"
          values="
            M 386 338 Q 384 330 386 324 Q 388 318 386 312;
            M 386 338 Q 389 330 387 324 Q 385 318 388 312;
            M 386 338 Q 384 330 386 324 Q 388 318 386 312
          "
          dur="2s" begin="0.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.08;0.18;0.08" dur="2s" begin="0.4s" repeatCount="indefinite" />
      </path>

      {/* ── Mouse ────────────────────────────────────────────────────────── */}
      <rect x="340" y="355" width="22" height="30" rx="11" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <line x1="351" y1="355" x2="351" y2="370" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* Mouse subtle movement */}
      <style>{`
        @keyframes mouseFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(1px, -2px); }
        }
      `}</style>

      {/* ── Light rays (from laptop screen) ──────────────────────────────── */}
      <defs>
        <radialGradient id="screenRayGrad" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="rgba(232,146,26,0.12)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="rimBlur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="deskGlow">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="screenGlow">
          <feGaussianBlur stdDeviation="6" />
          <feComposite in="SourceGraphic" />
        </filter>
      </defs>

      {/* Screen glow cone */}
      <path
        d="M 210 390 L 170 420 L 350 420 L 310 390 Z"
        fill="url(#screenRayGrad)"
        opacity="0.6"
      />

      {/* ── Creator subtle breathing ──────────────────────────────────────── */}
      <style>{`
        @keyframes creatorBreathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes screenBlink {
          0%, 96%, 100% { opacity: 1; }
          98% { opacity: 0.85; }
        }
        @keyframes ringLightPulse {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.10; }
        }
      `}</style>
    </svg>
  );
}

// ─── Scene Headline ───────────────────────────────────────────────────────────

const SCENE_COPY = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
};

function SceneHeadline({ scene }) {
  return null;
}

// ─── Freeze Text ──────────────────────────────────────────────────────────────

function FreezeText() {
  return (
    <div>
      <div style={{
        display: 'inline-block',
        width: 40,
        height: 1,
        background: 'rgba(255,255,255,0.2)',
        marginBottom: 24,
        verticalAlign: 'middle',
      }} />
      <p style={{
        fontSize: 'clamp(22px, 3.2vw, 42px)',
        fontWeight: 300,
        color: 'rgba(255,255,255,0.88)',
        lineHeight: 1.35,
        letterSpacing: '-0.02em',
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        No one starts creating
        <br />
        <em style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.55)' }}>to become an accountant.</em>
      </p>
      <div style={{
        display: 'inline-block',
        width: 40,
        height: 1,
        background: 'rgba(255,255,255,0.2)',
        marginTop: 24,
      }} />
    </div>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function HeroCTA() {
  return (
    <div>
      {/* Resolved document stream labels */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 32,
      }}>
        {DOCS.map(doc => (
          <span key={doc.id} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            color: doc.color,
            background: `rgba(${hexToRgb(doc.color)},0.1)`,
            border: `1px solid rgba(${hexToRgb(doc.color)},0.2)`,
            letterSpacing: '0.03em',
            fontFamily: 'system-ui, sans-serif',
          }}>
            <span>✓</span>
            {doc.resolvedLabel}
          </span>
        ))}
      </div>

      <p style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#E8921A',
        marginBottom: 14,
        fontFamily: 'system-ui, sans-serif',
      }}>
        Financial OS for Indian Creators
      </p>

      <h1 style={{
        fontSize: 'clamp(32px, 4.5vw, 58px)',
        fontWeight: 700,
        color: 'rgba(255,255,255,0.95)',
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        margin: '0 0 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        GST invoices for creators.{' '}
        <em style={{ color: '#E8921A', fontStyle: 'normal' }}>In 30 seconds.</em>
      </h1>

      <p style={{
        fontSize: 'clamp(15px, 1.6vw, 18px)',
        color: 'rgba(255,255,255,0.52)',
        maxWidth: 460,
        margin: '0 auto 32px',
        lineHeight: 1.65,
        fontFamily: 'system-ui, sans-serif',
      }}>
        Stop chasing brands for payments. Generate compliant invoices,
        track TDS, plan advance tax. All in one place.
      </p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to="/register"
          style={{
            padding: '14px 32px',
            background: '#E8921A',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
            display: 'inline-block',
            letterSpacing: '-0.01em',
            boxShadow: '0 0 32px rgba(232,146,26,0.35)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Start free — 28 days
        </Link>
        <a
          href="#features"
          style={{
            padding: '14px 24px',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 15,
            textDecoration: 'none',
            display: 'inline-block',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          See features
        </a>
      </div>

      <p style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.28)',
        marginTop: 12,
        fontFamily: 'system-ui, sans-serif',
      }}>
        No credit card required · Trusted by Indian creators
      </p>
    </div>
  );
}

// ─── Scroll hint ──────────────────────────────────────────────────────────────

function ScrollHint() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: 0.4,
        animation: 'scrollHintFade 2s ease-in-out infinite',
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
        Scroll
      </span>
      <div style={{ width: 1, height: 32, background: 'linear-gradient(180deg, rgba(255,255,255,0.4), transparent)' }} />
      <style>{`
        @keyframes scrollHintFade {
          0%, 100% { opacity: 0.4; transform: translateX(-50%) translateY(0); }
          50% { opacity: 0.7; transform: translateX(-50%) translateY(4px); }
        }
      `}</style>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
