import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../hooks/useAuth.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { formatINR, formatINRCompact } from '../utils/formatINR.js';
import { getFinancialYear } from '../utils/taxCalc.js';
import api from '../utils/api.js';
import StatCard from '../components/ui/StatCard.jsx';
import Badge from '../components/ui/Badge.jsx';
import { SkeletonStatCard, SkeletonTableRow, SkeletonCard } from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import OnboardingChecklist from '../components/features/onboarding/OnboardingChecklist.jsx';
import AnimatedCounter from '../components/ui/AnimatedCounter.jsx';
import { DollarSign, FileText, Briefcase, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import PlanGate from '../components/ui/PlanGate.jsx';
import { canAccess } from '../utils/planConfig.js';
import SmartInboxWidget from '../components/SmartInboxWidget.jsx';
import ManualPasteModal from '../components/ManualPasteModal.jsx';

const CURRENT_FY = (() => { const n = new Date(), y = n.getFullYear(), m = n.getMonth()+1; return m>=4?`${y}-${String(y+1).slice(-2)}`:`${y-1}-${String(y).slice(-2)}`; })();

export default function DashboardPage() {
  const { user, trialDaysLeft } = useAuth();
  const isMobile = useIsMobile();
  const hasIncomeDashboard = canAccess('income_dashboard', user?.plan);
  const hasFullCalendar = canAccess('full_calendar', user?.plan);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inboxPendingCount, setInboxPendingCount] = useState(0);
  const [showManualPaste, setShowManualPaste] = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [incSummary, tdsSum, deadlines, invoices, deals] = await Promise.all([
        api.get('/income/summary', { params: { fy: CURRENT_FY } }),
        api.get('/tds/summary', { params: { fy: CURRENT_FY } }),
        api.get('/tax/deadlines'),
        api.get('/invoices', { params: { limit: 5 } }),
        api.get('/deals'),
      ]);
      setData({ incSummary: incSummary.data, tdsSum: tdsSum.data, deadlines: deadlines.data.deadlines, recentInvoices: invoices.data.invoices, deals: deals.data.deals });
    } catch {
      // Dashboard loads partial data gracefully
    } finally {
      setLoading(false);
    }
  }

  // Monthly chart data — last 6 months
  const chartData = (() => {
    if (!data?.incSummary?.byMonth) return [];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      months.push({ month: format(d, 'MMM'), amount: data.incSummary.byMonth[key] || 0 });
    }
    return months;
  })();

  // This month income
  const thisMonthKey = format(new Date(), 'yyyy-MM');
  const lastMonthKey = format(subMonths(new Date(), 1), 'yyyy-MM');
  const thisMonth = data?.incSummary?.byMonth?.[thisMonthKey] || 0;
  const lastMonth = data?.incSummary?.byMonth?.[lastMonthKey] || 0;
  const deltaText = lastMonth > 0 ? `${thisMonth >= lastMonth ? '+' : ''}${Math.round((thisMonth - lastMonth) / lastMonth * 100)}% vs last month` : null;
  const deltaType = thisMonth >= lastMonth ? 'positive' : 'negative';

  const pipelineTotal = (data?.deals || []).filter(d => !['paid','rejected'].includes(d.status)).reduce((s, d) => s + Number(d.deal_value), 0);
  const activeDeals = (data?.deals || []).filter(d => ['inquiry','negotiating','active','delivered'].includes(d.status)).length;
  const nextDeadline = data?.deadlines?.[0];

  const STATUS_VARIANT = { draft: 'muted', sent: 'info', paid: 'success', overdue: 'danger' };

  // March season: Jan (0), Feb (1), Mar (2) — India advance tax + FY close
  const now = new Date();
  const isMarSeason = now.getMonth() <= 2;
  const mar15 = new Date(now.getFullYear(), 2, 15);
  const mar31 = new Date(now.getFullYear(), 2, 31);
  const daysToMar15 = Math.ceil((mar15 - now) / 86400000);
  const daysToMar31 = Math.ceil((mar31 - now) / 86400000);
  const [marBannerDismissed, setMarBannerDismissed] = useState(() => {
    try { return localStorage.getItem(`ctos_mar_banner_${now.getFullYear()}`) === '1'; } catch { return false; }
  });

  function dismissMarBanner() {
    setMarBannerDismissed(true);
    try { localStorage.setItem(`ctos_mar_banner_${now.getFullYear()}`, '1'); } catch {}
  }

  return (
    <>
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-6)', maxWidth: 1200, width: '100%' }}>
      {/* March season banner */}
      {isMarSeason && !marBannerDismissed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--space-3)', flexWrap: 'wrap',
          padding: isMobile ? 'var(--space-3)' : 'var(--space-4) var(--space-5)',
          background: 'var(--accent-dim)',
          border: '1px solid rgba(232,146,26,0.25)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--accent)' }}>
              FY {CURRENT_FY} closes in {daysToMar31} days
            </span>
            {daysToMar15 > 0 && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', background: 'var(--surface)', borderRadius: 'var(--radius-full)', padding: '2px 8px', border: '1px solid var(--border)' }}>
                Q4 advance tax due in {daysToMar15}d (Mar 15)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Link to="/tax-planner" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 600 }}>
              Calculate my advance tax →
            </Link>
            <button onClick={dismissMarBanner} aria-label="Dismiss" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-md)', lineHeight: 1 }}>
              ×
            </button>
          </div>
        </div>
      )}

      <header style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* FY badge with pulse dot */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 'var(--text-xs)', fontWeight: 600,
            color: 'var(--success-text)',
            background: 'var(--success-dim)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 8px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-dot 2s ease-in-out infinite', display: 'inline-block' }} aria-hidden="true" />
            FY {CURRENT_FY}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
          Welcome back, {user?.name?.split(' ')[0] || 'Creator'} · {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </header>

      {/* Onboarding checklist — shown until dismissed */}
      <OnboardingChecklist />

      {/* Trial countdown banner */}
      {user?.plan === 'trial' && trialDaysLeft() <= 7 && trialDaysLeft() > 0 && (
        <div style={{ background:'rgba(232,146,26,0.1)', border:'1px solid rgba(232,146,26,0.3)', borderRadius:'var(--radius-md)', padding:'var(--space-3) var(--space-4)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'var(--space-3)', flexWrap:'wrap', marginBottom:'var(--space-4)' }}>
          <span style={{ fontSize:'var(--text-sm)', color:'var(--accent)', fontWeight:600 }}>
            ⚠ Your trial ends in {trialDaysLeft()} day{trialDaysLeft() !== 1 ? 's' : ''} — upgrade to keep access
          </span>
          <Link to="/settings#billing" style={{ fontSize:'var(--text-sm)', color:'var(--accent)', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
            Upgrade now →
          </Link>
        </div>
      )}

      {/* Stats grid — Net Income dominant, others supporting */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          {/* Net Income — dominant card */}
          {hasIncomeDashboard ? (
          <div style={{
            gridColumn: isMobile ? 'span 1' : 'span 2',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="label">Net Income This Month</span>
              <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <DollarSign size={16} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: isMobile ? 'var(--text-2xl)' : 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
              {thisMonth > 0 ? (
                <AnimatedCounter to={Math.round(thisMonth / 100)} suffix={`₹${(thisMonth % 100) > 0 ? ` (${formatINR(thisMonth)})` : ''}`} duration={1200} />
              ) : formatINR(thisMonth)}
            </div>
            {deltaText && (
              <div style={{ fontSize: 'var(--text-xs)', color: deltaType === 'positive' ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 500 }}>
                {deltaText}
              </div>
            )}
          </div>
          ) : (
          <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'var(--space-5)', display:'flex', flexDirection:'column', gap:'var(--space-2)', opacity:0.7 }}>
            <span style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', fontWeight:500, display:'flex', alignItems:'center', gap:'var(--space-1)' }}>
              <Lock size={12} /> Net Income
            </span>
            <span style={{ fontSize:'var(--text-xl)', fontWeight:700, color:'var(--text-disabled)' }}>—</span>
            <Link to="/settings#billing" style={{ fontSize:'var(--text-xs)', color:'var(--accent)', fontWeight:600, textDecoration:'none' }}>Unlock on Pro →</Link>
          </div>
          )}

          {/* Active Deals */}
          <StatCard
            label="Active Deals"
            value={String(activeDeals)}
            subLabel={pipelineTotal > 0 ? `${formatINRCompact(pipelineTotal)} in pipeline` : 'Nothing in progress'}
            icon={Briefcase}
            accentColor="var(--text-muted)"
          />

          {/* TDS This Year */}
          <StatCard
            label="TDS This Year"
            value={formatINR(data?.tdsSum?.totalDeducted || 0)}
            subLabel="tracked this year"
            icon={FileText}
            accentColor="var(--text-muted)"
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        {/* Income chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-4)' }}>Income — Last 6 Months</div>
          {loading ? (
            <SkeletonCard rows={5} style={{ minHeight: 180 }} />
          ) : chartData.length > 0 ? (
            <div role="img" aria-label="Last 6 months income chart">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barSize={24}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'var(--surface-2)' }} />
                  <Bar dataKey="amount" radius={[4,4,0,0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={i === chartData.length-1 ? 'var(--accent)' : 'var(--border-2)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6) 0' }}>Log your first brand deal payment to see your P&amp;L take shape.</p>
          )}
        </div>

        {/* Deadlines widget */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-4)' }}>Upcoming Deadlines</div>
          {loading ? <SkeletonCard rows={3} style={{ border: 'none', padding: 0, background: 'transparent' }} />
          : (data?.deadlines || []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No upcoming deadlines.</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {(hasFullCalendar ? data.deadlines : data.deadlines?.slice(0, 2)).map(d => (
                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>{format(new Date(d.dueDate), 'd MMM yyyy')}</div>
                  </div>
                  <Badge variant={d.urgency === 'danger' ? 'danger' : d.urgency === 'warning' ? 'warning' : 'success'}>
                    {d.daysUntil}d
                  </Badge>
                </div>
              ))}
              <Link to="/tax-planner" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', textDecoration: 'underline' }}>View all →</Link>
              {!hasFullCalendar && (
                <Link to="/settings#billing" style={{ fontSize:'var(--text-xs)', color:'var(--accent)', textDecoration:'none', fontWeight:600 }}>
                  See all deadlines on Starter →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compliance streak — shown when ≥1 quarter paid on time */}
      {!loading && data?.deadlines && (data?.deadlines || []).filter(d => d.daysUntil > 0).length === 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-5)',
          background: 'var(--success-dim)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-5)',
        }}>
          <CheckCircle2 size={16} style={{ color: 'var(--success-text)', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--success-text)', fontWeight: 600 }}>
            All deadlines met this quarter. You're ahead of most creators.
          </span>
          <Link to="/tax-planner" style={{ fontSize: 'var(--text-xs)', color: 'var(--success-text)', textDecoration: 'underline', marginLeft: 'auto' }}>
            View Tax Planner →
          </Link>
        </div>
      )}

      {/* Smart Inbox — auto-detected payments, deals, TDS, expenses */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <SmartInboxWidget
          user={user}
          onManualPaste={() => setShowManualPaste(true)}
          onPendingCountChange={setInboxPendingCount}
        />
      </div>

      {/* Recent Invoices */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
          <span className="label">Recent Invoices</span>
          <Link to="/invoices" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>View all →</Link>
        </div>
        {loading ? (
          <div style={{ padding: 'var(--space-5)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>{[1,2,3].map(i => <SkeletonTableRow key={i} />)}</tbody>
            </table>
          </div>
        ) : (data?.recentInvoices || []).length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>No invoices yet. Brands are waiting.</p>
            <Link to="/invoices/new" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600 }}>Create your first GST invoice →</Link>
          </div>
        ) : (
          isMobile ? (
            /* Mobile: stacked invoice cards */
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.recentInvoices.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{inv.invoice_number}</span>
                      <Badge variant={STATUS_VARIANT[inv.status] || 'muted'}>{inv.status}</Badge>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.brand_name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>{format(new Date(inv.invoice_date), 'd MMM yyyy')}</div>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{formatINR(inv.total_amount)}</div>
                </div>
              ))}
            </div>
          ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Invoice #', 'Brand', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentInvoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{inv.invoice_number}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>{inv.brand_name}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)' }}>{formatINR(inv.total_amount)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}><Badge variant={STATUS_VARIANT[inv.status] || 'muted'}>{inv.status}</Badge></td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{format(new Date(inv.invoice_date), 'd MMM yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )
        )}
      </div>
    </div>

    {showManualPaste && (
      <ManualPasteModal
        onClose={() => setShowManualPaste(false)}
        onDetectionCreated={() => {
          setShowManualPaste(false);
        }}
      />
    )}
    </>
  );
}
