import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, TrendingUp, Pencil } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api, { getErrorMessage } from '../utils/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { formatINR, formatINRCompact } from '../utils/formatINR.js';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import { SkeletonTableRow } from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PlanGate from '../components/ui/PlanGate.jsx';
import { CURRENT_FY, PREVIOUS_FY as PREV_FY } from '../utils/financialYear.js';
import { taxYearLabel } from '../utils/taxLabels.js';
import { readCache, writeCache } from '../utils/listCache.js';

const SOURCES = ['brand_deal', 'barter', 'adsense', 'foreign_brand', 'instagram_bonus', 'affiliate', 'consulting', 'other'];
const SOURCE_LABELS = { brand_deal: 'Brand Deal', barter: 'Gifted products (barter)', adsense: 'YouTube AdSense', foreign_brand: 'Foreign brand / platform', instagram_bonus: 'Instagram Bonus', affiliate: 'Affiliate', consulting: 'Consulting', other: 'Other' };
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'];
const EMPTY_INCOME = () => ({ source: 'brand_deal', amount: '', description: '', incomeDate: format(new Date(), 'yyyy-MM-dd'), currency: 'INR', foreignAmount: '', fxRate: '', firaReceived: false });
const SELECT_STYLE = { padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit' };
export default function IncomePage() {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fy, setFY] = useState(CURRENT_FY);
  const [addOpen, setAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState(EMPTY_INCOME);
  const isForeign = form.currency !== 'INR';
  const convertedAmount = isForeign && parseFloat(form.foreignAmount) > 0 && parseFloat(form.fxRate) > 0
    ? Math.round(parseFloat(form.foreignAmount) * parseFloat(form.fxRate) * 100) / 100 : null;
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [fy]);

  async function loadData() {
    // Show the last copy straight away, then refresh
    const cacheKey = `income:${fy}`;
    const cached = readCache(cacheKey);
    if (cached) { setEntries(cached.list); setSummary(cached.summary); setLoading(false); }
    else setLoading(true);
    try {
      const [inc, sum] = await Promise.all([
        api.get('/income', { params: { fy } }),
        api.get('/income/summary', { params: { fy } }),
      ]);
      setEntries(inc.data.income || []);
      setSummary(sum.data);
      writeCache(cacheKey, { list: inc.data.income || [], summary: sum.data });
    } catch (err) { if (!cached) toast.error(getErrorMessage(err, 'Failed to load income')); }
    finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    const amount = isForeign ? convertedAmount : parseFloat(form.amount);
    if (!amount || !form.incomeDate) { toast.error(isForeign ? 'Enter the foreign amount and the exchange rate' : 'Enter the amount and date'); return; }
    setSaving(true);
    try {
      await api.post('/income', {
        source: form.source, amount, description: form.description || undefined, incomeDate: form.incomeDate,
        currency: form.currency,
        ...(isForeign ? { foreignAmount: parseFloat(form.foreignAmount), fxRate: parseFloat(form.fxRate), firaReceived: form.firaReceived } : {}),
      });
      toast.success('Income logged');
      setAddOpen(false);
      setForm(EMPTY_INCOME());
      loadData();
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to log income')); }
    finally { setSaving(false); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!form.amount || !form.incomeDate) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      await api.put(`/income/${editingEntry.id}`, { source: form.source, amount: parseFloat(form.amount), description: form.description || undefined, incomeDate: form.incomeDate });
      toast.success('Income updated');
      setEditingEntry(null);
      setForm(EMPTY_INCOME());
      loadData();
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to update income')); }
    finally { setSaving(false); }
  }

  // Build chart data from monthly breakdown
  const chartData = summary?.byMonth
    ? Object.entries(summary.byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, amount]) => ({
        month: format(new Date(month + '-01'), 'MMM'),
        amount,
      }))
    : [];

  return (
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-6)', maxWidth: 1100, width: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          
          <select value={fy} onChange={e => setFY(e.target.value)} style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
            <option value={CURRENT_FY}>{taxYearLabel(CURRENT_FY)}</option>
            <option value={PREV_FY}>{taxYearLabel(PREV_FY)}</option>
          </select>
        </div>
        <button onClick={() => setAddOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', border: 'none' }}>
          <Plus size={14} aria-hidden="true" /> Log Income
        </button>
      </header>

      <PlanGate feature="income_dashboard">
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Total Income</div>
            <div className="financial-number" style={{ fontSize: 'var(--text-xl)' }}>{formatINR(summary.total)}</div>
          </div>
          {Object.entries(summary.bySource || {}).sort(([,a],[,b]) => b-a).map(([source, amt]) => (
            <div key={source} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
              <div className="label" style={{ marginBottom: 'var(--space-2)' }}>{SOURCE_LABELS[source]}</div>
              <div className="financial-number" style={{ fontSize: 'var(--text-lg)' }}>{formatINR(amt)}</div>
            </div>
          ))}
        </div>
      )}

      {chartData.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div className="label" style={{ marginBottom: 'var(--space-4)' }}>Monthly Income</div>
          <div role="img" aria-label="Monthly income bar chart">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="amount" radius={[4,4,0,0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === chartData.length - 1 ? 'var(--accent)' : 'var(--border-2)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{[1,2,3,4].map(i => <SkeletonTableRow key={i} cols={5} />)}</tbody>
          </table>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No income logged yet"
          description="Log income to unlock your advance tax estimate and P&L chart. Income from brand deals is auto-logged when you mark a deal as paid."
          actionLabel="+ Log Income"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        isMobile ? (
          /* Mobile: stacked income cards */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {entries.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                    <Badge variant="info">{SOURCE_LABELS[e.source]}</Badge>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{e.quarter}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{format(new Date(e.income_date), 'd MMM yyyy')}
                    {e.description && <span> · {e.description}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', flexShrink: 0 }}>{formatINR(e.amount)}</div>
              </div>
            ))}
          </div>
        ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Source', 'Description', 'Amount', 'Quarter'].map(h => (
                  <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{format(new Date(e.income_date), 'd MMM yyyy')}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)' }}><Badge variant="info">{SOURCE_LABELS[e.source]}</Badge></td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{e.description || '—'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
                    {formatINR(e.amount)}
                    {e.currency && e.currency !== 'INR' && (
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--text-muted)' }}>
                        {e.currency} {Number(e.foreign_amount || 0).toLocaleString('en-IN')}{e.fira_received ? ' · FIRA ✓' : ' · FIRA pending'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{e.quarter}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <button onClick={() => { setEditingEntry(e); setForm({ ...EMPTY_INCOME(), source: e.source, amount: String(e.amount), description: e.description || '', incomeDate: e.income_date }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }} title="Edit">
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Log Income">
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor="inc-source" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Source</label>
              <select id="inc-source" value={form.source} onChange={e => setForm(p => ({...p, source: e.target.value, currency: ['adsense', 'foreign_brand'].includes(e.target.value) ? (p.currency === 'INR' ? 'USD' : p.currency) : p.currency}))} style={SELECT_STYLE}>
                {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor="inc-currency" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Currency</label>
              <select id="inc-currency" value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))} style={SELECT_STYLE}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {form.source === 'barter' && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              Products you keep are taxable income at their market value. Brands must deduct TDS on gifts worth more than ₹20,000 a year.
            </p>
          )}
          {isForeign ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <Input id="inc-foreign" label={`Amount (${form.currency}) *`} type="number" value={form.foreignAmount} onChange={e => setForm(p => ({...p, foreignAmount: e.target.value}))} style={{ fontVariantNumeric: 'tabular-nums' }} />
                <Input id="inc-fx" label={`₹ per 1 ${form.currency} *`} type="number" value={form.fxRate} onChange={e => setForm(p => ({...p, fxRate: e.target.value}))} hint="Rate your bank credited at" style={{ fontVariantNumeric: 'tabular-nums' }} />
              </div>
              {convertedAmount && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Logged as <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(convertedAmount)}</strong></div>}
              <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', fontSize: 'var(--text-sm)', color: 'var(--text-body)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.firaReceived} onChange={e => setForm(p => ({...p, firaReceived: e.target.checked}))} style={{ marginTop: 3 }} />
                <span>I have the bank’s foreign remittance certificate (FIRA / e-BRC)<span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Your bank issues it for each foreign payment. Keep it to prove export income.</span></span>
              </label>
            </>
          ) : (
            <Input id="inc-amount" label={form.source === 'barter' ? 'Market value of products (₹) *' : 'Amount (₹) *'} type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} style={{ fontVariantNumeric: 'tabular-nums' }} />
          )}
          <Input id="inc-date" label="Date *" type="date" value={form.incomeDate} onChange={e => setForm(p => ({...p, incomeDate: e.target.value}))} />
          <Input id="inc-desc" label="Description" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Brand deal — Glowleaf Naturals" />
          <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            {saving ? 'Saving…' : 'Log Income'}
          </button>
        </form>
      </Modal>

      {/* Edit Income Modal */}
      <Modal isOpen={!!editingEntry} onClose={() => { setEditingEntry(null); setForm(EMPTY_INCOME()); }} title="Edit Income">
        <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="edit-inc-source" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Source</label>
            <select id="edit-inc-source" value={form.source} onChange={e => setForm(p => ({...p, source: e.target.value}))} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </div>
          <Input id="edit-inc-amount" label="Amount (₹) *" type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} style={{ fontVariantNumeric: 'tabular-nums' }} />
          <Input id="edit-inc-date" label="Date *" type="date" value={form.incomeDate} onChange={e => setForm(p => ({...p, incomeDate: e.target.value}))} />
          <Input id="edit-inc-desc" label="Description" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
          <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </Modal>
      </PlanGate>
    </div>
  );
}
