// ─────────────────────────────────────────────────────────────────────────────
// Acts 4–7 for LandingPageV3.jsx
// DO NOT add imports here — they live at the top of LandingPageV3.jsx
// ─────────────────────────────────────────────────────────────────────────────

// ── ACT 4 ─ How It Works ─────────────────────────────────────────────────────

const JOURNEY_STAGES = [
  {
    icon: Briefcase,
    step: 'STEP 01',
    title: 'Mamaearth DMs Riya.',
    desc: 'She logs the deal in 10 seconds. Pipeline updated.',
    tag: '₹1,18,000 deal',
  },
  {
    icon: FileText,
    step: 'STEP 02',
    title: 'Invoice sent. In 30 seconds.',
    desc: "Rule 46-compliant PDF. Mamaearth's finance team gets exactly what they need.",
    tag: 'GST auto-calculated',
  },
  {
    icon: TrendingDown,
    step: 'STEP 03',
    title: '₹11,800 TDS deducted.',
    desc: 'CreatiFlow records it before Riya even checks her account.',
    tag: 'Form 16A: Awaiting',
  },
  {
    icon: IndianRupee,
    step: 'STEP 04',
    title: '₹1,06,200 hits Riya\'s account.',
    desc: 'Income auto-logged. P&L updated. Running total current.',
    tag: 'No spreadsheet needed',
  },
  {
    icon: Calendar,
    step: 'STEP 05',
    title: 'Sep 15 arrives.',
    desc: "CreatiFlow already calculated Riya's Q3 advance tax. She pays ₹18,400. No penalty.",
    tag: '14-day reminder sent',
  },
  {
    icon: Download,
    step: 'STEP 06',
    title: "March. Riya's CA opens the ZIP.",
    desc: "20 minutes later, ITR filed. CA calls it the cleanest file he's seen all season.",
    tag: 'ITR-ready export',
  },
];

function JourneyCard({ stage, delay, isMobile }) {
  const Icon = stage.icon;
  const [hovered, setHovered] = useState(false);
  const rm = prefersReducedMotion();

  if (isMobile) {
    return (
      <Reveal delay={delay}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
          {/* Left accent line + dot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 'var(--radius-full)',
              background: 'var(--accent)', flexShrink: 0,
            }} aria-hidden="true" />
            <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 48, marginTop: 4 }} aria-hidden="true" />
          </div>
          {/* Card */}
          <div style={{
            flex: 1,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)',
            marginBottom: 'var(--space-4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div aria-hidden="true" style={{
                width: 40, height: 40, borderRadius: 'var(--radius-full)',
                background: 'var(--accent-dim)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={18} color="var(--accent)" />
              </div>
              <span style={{
                background: 'var(--success-dim)', color: 'var(--success-text)',
                borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)',
                fontWeight: 600, padding: '2px 10px',
              }}>{stage.tag}</span>
            </div>
            <div className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-1)' }}>{stage.step}</div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>{stage.title}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.65 }}>{stage.desc}</div>
          </div>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => !rm && setHovered(true)}
        onMouseLeave={() => !rm && setHovered(false)}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${hovered ? 'rgba(232,146,26,0.3)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          height: '100%',
          boxSizing: 'border-box',
          transition: 'transform var(--duration-standard) ease, border-color var(--duration-standard) ease, box-shadow var(--duration-standard) ease',
          transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
          boxShadow: hovered ? '0 8px 24px rgba(232,146,26,0.06)' : 'none',
          cursor: 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div aria-hidden="true" style={{
            width: 40, height: 40, borderRadius: 'var(--radius-full)',
            background: 'var(--accent-dim)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={18} color="var(--accent)" />
          </div>
          <span style={{
            background: 'var(--success-dim)', color: 'var(--success-text)',
            borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)',
            fontWeight: 600, padding: '3px 10px',
          }}>{stage.tag}</span>
        </div>
        <div className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-2)' }}>{stage.step}</div>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          {stage.title}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.65 }}>
          {stage.desc}
        </div>
      </div>
    </Reveal>
  );
}

export function Act4Journey() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <section
      id="act4"
      aria-label="How CreatiFlow works — Riya's journey"
      style={{ position: 'relative', padding: 'var(--space-20) 0', overflow: 'hidden' }}
    >
      {/* Color temperature overlay — confidence blue */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(59,130,246,0.03) 0%, transparent 70%)',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--space-6)', position: 'relative' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <Reveal>
            <div className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-3)' }}>ONE FLOW</div>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="display" style={{ marginBottom: 'var(--space-4)' }}>
              From brand deal<br />to filed taxes.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p style={{
              fontSize: 'var(--text-base)', color: 'var(--text-body)',
              maxWidth: 520, margin: '0 auto', lineHeight: 1.65,
            }}>
              Meet Riya — 220K subscribers, 8 brand deals a month. This is her month on CreatiFlow.
            </p>
          </Reveal>
        </div>

        {/* Stages grid */}
        {isMobile ? (
          <div style={{ paddingLeft: 'var(--space-2)' }}>
            {JOURNEY_STAGES.map((stage, i) => (
              <JourneyCard key={i} stage={stage} delay={i * 80} isMobile={true} />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-5)',
          }}>
            {JOURNEY_STAGES.map((stage, i) => (
              <JourneyCard key={i} stage={stage} delay={i * 80} isMobile={false} />
            ))}
          </div>
        )}

        {/* Bottom stat row */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          gap: 'var(--space-12)', flexWrap: 'wrap',
          marginTop: 'var(--space-12)',
          paddingTop: 'var(--space-8)',
          borderTop: '1px solid var(--border)',
        }}>
          {[
            { value: '30', suffix: ' sec', label: 'avg invoice' },
            { value: '₹0', suffix: '', label: 'untracked TDS' },
            { value: '0', suffix: '', label: 'penalties this quarter' },
          ].map((stat, i) => (
            <Reveal key={i} delay={i * 100}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 'var(--text-2xl)', fontWeight: 800,
                  color: 'var(--accent)', fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.1, letterSpacing: '-0.02em',
                }}>
                  {stat.value}{stat.suffix}
                </div>
                <div style={{
                  fontSize: 'var(--text-sm)', color: 'var(--text-muted)',
                  marginTop: 'var(--space-1)', fontWeight: 500,
                }}>
                  {stat.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── ACT 5 ─ Impact / Emotional Features ──────────────────────────────────────

const IMPACT_CARDS = [
  {
    icon: FileText,
    emotion: 'Professional invoices. Instantly.',
    outcome: "Send a PDF that brands' finance teams accept on the first try. No resubmissions. No delays.",
    tag: 'Most used',
    rupee: 'Brands pay faster.',
  },
  {
    icon: TrendingDown,
    emotion: 'Never leave money on the table.',
    outcome: '₹40,000 in TDS credits the average creator misses every year. CreatiFlow tracks every rupee.',
    tag: 'Saves ₹ at ITR',
    rupee: '₹40,000 recovered.',
  },
  {
    icon: Calendar,
    emotion: 'March arrives. You\'re ready.',
    outcome: 'Quarterly instalments calculated from your real income. 14-day reminders. No penalties. No panic.',
    tag: 'No more March shock',
    rupee: 'Zero late fees.',
  },
  {
    icon: Briefcase,
    emotion: 'No more awkward follow-ups.',
    outcome: 'Every deal tracked from inquiry to payment. When it\'s paid, income auto-logs. You just create.',
    tag: 'Pipeline to payment',
    rupee: 'Every deal visible.',
  },
  {
    icon: BarChart2,
    emotion: 'Know exactly what you earned.',
    outcome: 'AdSense, brand deals, affiliate, Instagram bonuses — every source, one view. Real P&L, always current.',
    tag: 'Full picture',
    rupee: 'No year-end surprises.',
  },
  {
    icon: Download,
    emotion: 'Give your CA a ZIP file. Not a headache.',
    outcome: 'Annual summary with every invoice, TDS record, and expense log. Your CA meeting goes from 2 hours to 20 minutes.',
    tag: 'ITR-ready',
    rupee: 'Save ₹14,000 in CA fees.',
  },
];

function ImpactCard({ card, delay }) {
  const Icon = card.icon;
  const [hovered, setHovered] = useState(false);
  const rm = prefersReducedMotion();

  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => !rm && setHovered(true)}
        onMouseLeave={() => !rm && setHovered(false)}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${hovered ? 'rgba(232,146,26,0.3)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          transition: 'transform var(--duration-standard) ease, border-color var(--duration-standard) ease, box-shadow var(--duration-standard) ease',
          transform: !rm && hovered ? 'translateY(-3px)' : 'translateY(0)',
          boxShadow: hovered ? '0 8px 24px rgba(232,146,26,0.06)' : 'none',
          cursor: 'default',
        }}
      >
        {/* Top row: icon + tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div aria-hidden="true" style={{
            width: 36, height: 36, borderRadius: 'var(--radius-full)',
            background: 'var(--accent-dim)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={16} color="var(--accent)" />
          </div>
          <span style={{
            background: 'var(--accent-dim)', color: 'var(--accent)',
            borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)',
            fontWeight: 600, padding: '3px 10px',
          }}>{card.tag}</span>
        </div>

        {/* Emotion headline */}
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
          {card.emotion}
        </div>

        {/* Outcome body */}
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.65, flex: 1 }}>
          {card.outcome}
        </div>

        {/* Rupee proof line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Check size={13} color="var(--success-text)" aria-hidden="true" />
          <span style={{
            fontSize: 'var(--text-sm)', fontWeight: 700,
            color: 'var(--success-text)', fontVariantNumeric: 'tabular-nums',
          }}>
            {card.rupee}
          </span>
        </div>
      </div>
    </Reveal>
  );
}

export function Act5Impact() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <section
      id="act5"
      aria-label="What CreatiFlow gives you"
      style={{ position: 'relative', padding: 'var(--space-20) 0', overflow: 'hidden' }}
    >
      {/* Color temperature overlay — aspiration green */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(34,197,94,0.04) 0%, transparent 70%)',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--space-6)', position: 'relative' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <Reveal>
            <div className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-3)' }}>THE IMPACT</div>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="display" style={{ marginBottom: 'var(--space-4)' }}>
              One less thing<br />to <em>think about.</em>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p style={{
              fontSize: 'var(--text-base)', color: 'var(--text-body)',
              maxWidth: 480, margin: '0 auto', lineHeight: 1.65,
            }}>
              Every feature tied to what it actually gives you.
            </p>
          </Reveal>
        </div>

        {/* Impact cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 'var(--space-5)',
        }}>
          {IMPACT_CARDS.map((card, i) => (
            <ImpactCard key={i} card={card} delay={i * 80} />
          ))}
        </div>

        {/* Mini CTA */}
        <Reveal delay={200}>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-12)' }}>
            <Link
              to="/register"
              style={{
                display: 'inline-block',
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: 'var(--text-md)',
                padding: 'var(--space-4) var(--space-10)',
                textDecoration: 'none',
                transition: 'background var(--duration-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
            >
              Start your free trial →
            </Link>
            <div style={{
              marginTop: 'var(--space-3)',
              fontSize: 'var(--text-sm)', color: 'var(--text-muted)',
            }}>
              28-day trial · No credit card · Cancel anytime
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── ACT 6 ─ Connected Universe ────────────────────────────────────────────────

const UNIVERSE_NODES = [
  { label: 'Brand Deals', color: '#3B82F6', tooltip: 'Track inquiry to paid' },
  { label: 'Invoices',    color: '#E8921A', tooltip: 'GST compliant in 30s' },
  { label: 'Payments',   color: '#22C55E', tooltip: 'Auto-logged income' },
  { label: 'GST',        color: '#F59E0B', tooltip: 'CGST/SGST auto-split' },
  { label: 'TDS',        color: '#EF4444', tooltip: 'Every deduction tracked' },
  { label: 'Analytics',  color: '#8B5CF6', tooltip: 'Real P&L, always' },
  { label: 'CA Export',  color: '#10B981', tooltip: 'ITR-ready ZIP' },
];

function UniverseNetwork() {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [linesDrawn, setLinesDrawn] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [hoveredNode, setHoveredNode] = useState(null);
  const rm = prefersReducedMotion();

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
          if (!rm) {
            // Trigger line-draw shortly after enter
            requestAnimationFrame(() => setLinesDrawn(true));
          } else {
            setLinesDrawn(true);
          }
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rm]);

  const size = isMobile ? 'min(320px, 90vw)' : 'min(600px, 90vw)';
  const radius = isMobile ? 130 : 220;
  const centerPx = isMobile ? 160 : 300;

  // Compute node positions
  const nodePositions = UNIVERSE_NODES.map((node, i) => {
    const angle = (2 * Math.PI * i) / UNIVERSE_NODES.length - Math.PI / 2;
    return {
      ...node,
      x: centerPx + radius * Math.cos(angle),
      y: centerPx + radius * Math.sin(angle),
    };
  });

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
      }}
      aria-label="CreatiFlow connected universe diagram"
    >
      {/* SVG lines */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
        viewBox={`0 0 ${centerPx * 2} ${centerPx * 2}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {nodePositions.map((node, i) => {
          const drawn = linesDrawn;
          return (
            <line
              key={i}
              x1={centerPx}
              y1={centerPx}
              x2={node.x}
              y2={node.y}
              stroke={node.color}
              strokeOpacity={0.3}
              strokeWidth={1.5}
              strokeDasharray={300}
              strokeDashoffset={drawn ? 0 : 300}
              style={{
                transition: rm
                  ? 'none'
                  : `stroke-dashoffset 400ms ease ${i * 80}ms`,
              }}
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
          width: isMobile ? 60 : 80,
          height: isMobile ? 60 : 80,
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: isMobile ? 14 : 18,
          color: '#fff',
          zIndex: 2,
          animation: rm ? 'none' : 'cfPulse 3s ease-in-out infinite',
          boxShadow: '0 0 32px rgba(232,146,26,0.35)',
          flexShrink: 0,
        }}
      >
        CF
      </div>

      {/* Orbit nodes */}
      {nodePositions.map((node, i) => {
        const nodeSize = isMobile ? 44 : 52;
        // Convert from viewBox coords to % of container
        const leftPct = (node.x / (centerPx * 2)) * 100;
        const topPct = (node.y / (centerPx * 2)) * 100;
        const isHovered = hoveredNode === i;

        return (
          <div
            key={i}
            onMouseEnter={() => !isMobile && setHoveredNode(i)}
            onMouseLeave={() => setHoveredNode(null)}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
              cursor: 'default',
            }}
          >
            {/* Tooltip (desktop only, on hover) */}
            {!isMobile && isHovered && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: 6,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-body)',
                  padding: '4px 10px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              >
                {node.tooltip}
              </div>
            )}

            {/* Node circle */}
            <div style={{
              width: nodeSize,
              height: nodeSize,
              borderRadius: 'var(--radius-full)',
              background: `${node.color}20`,
              border: `1.5px solid ${node.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }} aria-hidden="true" />

            {/* Label */}
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 5,
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              fontWeight: 500,
            }}>
              {node.label}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes cfPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.04); }
        }
      `}</style>
    </div>
  );
}

export function Act6Universe() {
  return (
    <section
      id="act6"
      aria-label="CreatiFlow connected business universe"
      style={{ position: 'relative', padding: 'var(--space-20) 0', overflow: 'hidden' }}
    >
      {/* No color tint — pure dark, expansive */}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--space-6)', position: 'relative' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-14)' }}>
          <Reveal>
            <div className="label" style={{ color: 'var(--accent)', marginBottom: 'var(--space-3)' }}>THE BIGGER PICTURE</div>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="display" style={{ marginBottom: 'var(--space-4)' }}>
              Every part of your business,<br />talking to each other.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p style={{
              fontSize: 'var(--text-base)', color: 'var(--text-body)',
              maxWidth: 500, margin: '0 auto', lineHeight: 1.65,
            }}>
              CreatiFlow connects every financial node of your content business.
            </p>
          </Reveal>
        </div>

        {/* Network diagram */}
        <Reveal delay={160}>
          <UniverseNetwork />
        </Reveal>

        {/* After-network headline */}
        <Reveal delay={220}>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-14)' }}>
            <h2
              className="display"
              style={{
                fontSize: 'clamp(24px, 2vw, 34px)',
                lineHeight: 1.25,
                maxWidth: 560,
                margin: '0 auto',
              }}
            >
              Your creative business.<br />Finally working together.
            </h2>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── ACT 7 ─ The Return ────────────────────────────────────────────────────────

const RESOLVED_FRAGMENTS = [
  { text: 'GST INVOICE · #INV-0047 · PAID ✓', top: '8%',  left: '3%'  },
  { text: 'TDS Tracked · FY 2025-26 · ₹40,000 ✓', top: '18%', right: '4%', left: undefined },
  { text: 'Q3 Advance Tax · Sep 15 · PAID ✓', bottom: '22%', left: '5%' },
  { text: 'Payment Received · Zomato · ₹1,06,200 ✓', bottom: '14%', right: '3%', left: undefined },
  { text: 'Annual Report · CA Export · Ready ✓', top: '50%', left: '1%' },
];

function useMagneticButton(disabled) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    setOffset({ x: dx * 0.12, y: dy * 0.12 });
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  return { ref, offset, handleMouseMove, handleMouseLeave };
}

function ParticleBurst({ active }) {
  const rm = prefersReducedMotion();
  if (!active || rm) return null;

  const particles = Array.from({ length: 8 }, (_, i) => i);
  const angles = particles.map((_, i) => (360 / 8) * i);

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {particles.map((_, i) => {
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 5,
              height: 5,
              borderRadius: 'var(--radius-full)',
              background: 'var(--accent)',
              transform: 'translate(-50%, -50%)',
              animation: `particleFly${i} 1.2s ease-out forwards`,
            }}
          />
        );
      })}
      <style>{`
        ${particles.map((_, i) => {
          const angle = angles[i];
          const rad = (angle * Math.PI) / 180;
          const tx = Math.round(Math.cos(rad) * 44);
          const ty = Math.round(Math.sin(rad) * 44 - 18);
          return `
            @keyframes particleFly${i} {
              0%   { transform: translate(-50%, -50%) translate(0px, 0px); opacity: 1; }
              60%  { opacity: 0.8; }
              100% { transform: translate(-50%, -50%) translate(${tx}px, ${ty}px); opacity: 0; }
            }
          `;
        }).join('')}
      `}</style>
    </div>
  );
}

export function Act7Return() {
  const sectionRef = useRef(null);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [particleFired, setParticleFired] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const rm = prefersReducedMotion();

  const { ref: btnRef, offset, handleMouseMove, handleMouseLeave } = useMagneticButton(isMobile || rm);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
          if (!particleFired && !rm) {
            setTimeout(() => setParticleFired(true), 600);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rm, particleFired]);

  return (
    <section
      id="act7"
      ref={sectionRef}
      aria-label="Start creating with CreatiFlow"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 'var(--space-20) var(--space-6)',
      }}
    >
      {/* Color temperature overlay — warm amber, mirrors Act 1 */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(232,146,26,0.06) 0%, transparent 70%)',
      }} />

      {/* Act 6 → Act 7 fade transition mask */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 120,
        background: 'linear-gradient(to bottom, var(--bg), transparent)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Resolved state fragments — static, calm, edges of viewport */}
      {RESOLVED_FRAGMENTS.map((frag, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: frag.top,
            bottom: frag.bottom,
            left: frag.left,
            right: frag.right,
            opacity: 0.12,
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            background: 'var(--success-dim)',
            color: 'var(--success-text)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 10px',
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {frag.text}
        </div>
      ))}

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 680 }}>
        {/* Main headline */}
        <Reveal>
          <h2 className="display" style={{ marginBottom: 'var(--space-5)' }}>
            Spend your energy<br /><em>creating.</em>
          </h2>
        </Reveal>

        {/* Subheadline */}
        <Reveal delay={80}>
          <p style={{
            fontSize: 'var(--text-md)',
            color: 'var(--text-body)',
            lineHeight: 1.6,
            marginBottom: 'var(--space-8)',
          }}>
            We'll take care of the business behind it.
          </p>
        </Reveal>

        {/* CTA button with magnetic effect + particle burst */}
        <Reveal delay={140}>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            <Link
              ref={btnRef}
              to="/register"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                display: 'inline-block',
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: 'var(--text-md)',
                padding: 'var(--space-4) var(--space-12)',
                textDecoration: 'none',
                transition: `background var(--duration-fast), transform var(--duration-standard) ease`,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                position: 'relative',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent-hover)';
              }}
            >
              Start Creating →
              <ParticleBurst active={particleFired} />
            </Link>
          </div>
        </Reveal>

        {/* Social proof */}
        <Reveal delay={200}>
          <div style={{
            marginTop: 'var(--space-5)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-muted)',
          }}>
            Join 200+ Indian creators running their business properly.
          </div>
        </Reveal>

        {/* Microcopy */}
        <Reveal delay={240}>
          <div style={{
            marginTop: 'var(--space-3)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-disabled)',
            letterSpacing: '0.01em',
          }}>
            28-day free trial · No credit card · Cancel anytime · Data stored in India
          </div>
        </Reveal>
      </div>
    </section>
  );
}
