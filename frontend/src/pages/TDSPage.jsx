import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, RefreshCw } from 'lucide-react';
import api from '../utils/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { formatINR } from '../utils/formatINR.js';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { SkeletonStatCard, SkeletonTableRow } from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { DollarSign, CheckCircle, Clock, AlertCircle, Receipt } from 'lucide-react';
import UsageBar from '../components/ui/UsageBar.jsx';
import { useUsage } from '../hooks/useUsage.jsx';

const FORM_16A_VARIANT = {
  received: 'success',
  awaiting: 'warning',
  requested: 'info',
  overdue: 'danger',
};
const FORM_16A_LABEL = {
  received: 'Form 16A ✓',
  awaiting: 'Awaiting',
  requested: 'Requested',
  overdue: 'Overdue',
};

const CURRENT_FY = (() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
})();

const PREV_FY = (() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const base = m >= 4 ? y : y - 1;
  return `${base - 1}-${String(base).slice(-2)}`;
})();

export default function TDSPage() {
  const toast = useToast();
  const isMobile = useIsMobile();
  const { usage, isAtLimit, refresh: refreshUsage } = useUsage();
  const tdsLimitReached = isAtLimit('tds_entries');
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fy, setFY] = useState(CURRENT_FY);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ brandName: '', brandTan: '', invoiceAmount: '', tdsRate: '10', paymentDate: format(new Date(), 'yyyy-MM-dd') });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [fy]);

  async function loadData() {
    setLoading(true);
    try {
      const [recs, sum] = await Promise.all([
        api.get('/tds', { params: { fy } }),
        api.get('/tds/summary', { params: { fy } }),
      ]);
      setRecords(recs.data.records || []);
      setSummary(sum.data);
    } catch { toast.error('Failed to load TDS data'); }
    finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.brandName || !form.invoiceAmount || !form.paymentDate) { toast.error('Fill all required fields'); return; }
    setSaving(true);
    try {
      await api.post('/tds', {
        brandName: form.brandName,
        brandTan: form.brandTan || undefined,
        invoiceAmount: parseFloat(form.invoiceAmount),
        tdsRate: parseFloat(form.tdsRate),
        paymentDate: form.paymentDate,
      });
      toast.success('TDS record added');
      setAddOpen(false);
      setForm({ brandName: '', brandTan: '', invoiceAmount: '', tdsRate: '10', paymentDate: format(new Date(), 'yyyy-MM-dd') });
      loadData();
      refreshUsage();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to add record'); }
    finally { setSaving(false); }
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/tds/${id}`, { form16aStatus: status });
      toast.success('Status updated');
      loadData();
    } catch { toast.error('Failed to update'); }
  }

  const tdsAmount = form.invoiceAmount ? Math.round(parseFloat(form.invoiceAmount) * parseFloat(form.tdsRate)) / 100 : 0;

  return (
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-6)', maxWidth: 1100, width: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          
          <select
            value={fy}
            onChange={(e) => setFY(e.target.value)}
            style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}
          >
            <option value={CURRENT_FY}>FY {CURRENT_FY}</option>
            <option value={PREV_FY}>FY {PREV_FY}</option>
          </select>
          {summary && (
            <Badge variant="warning" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(summary.totalDeducted)} deducted
            </Badge>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
          <UsageBar
            label="TDS entries"
            used={usage.tds_entries_total}
            limit={usage.tds_limit}
            upgradeText="Upgrade to Starter for unlimited TDS tracking"
          />
          <button
            onClick={tdsLimitReached ? undefined : () => setAddOpen(true)}
            disabled={tdsLimitReached}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: tdsLimitReached ? 'not-allowed' : 'pointer', border: 'none', opacity: tdsLimitReached ? 0.5 : 1 }}
          >
            <Plus size={14} aria-hidden="true" /> Add TDS Record
          </button>
        </div>
      </header>

      {/* Summary cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
        </div>
      ) : summary && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <StatCard label="Total TDS Deducted" value={formatINR(summary.totalDeducted)} icon={DollarSign} accentColor="var(--warning)" />
          <StatCard label="Form 16A Received" value={formatINR(summary.form16aReceived)} icon={CheckCircle} accentColor="var(--success)" />
          <StatCard label="Pending Form 16A" value={formatINR(summary.pending)} icon={Clock} accentColor="var(--danger)" />
          <StatCard label="Net TDS Credit" value={formatINR(summary.netTdsCredit)} icon={AlertCircle} accentColor="var(--info)" />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{[1,2,3,4].map(i => <SkeletonTableRow key={i} cols={9} />)}</tbody>
          </table>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No TDS records yet"
          description="Brands deduct 10% before paying you under Section 194J. Track every rupee here so you can claim it back in your ITR."
          actionLabel="+ Add TDS Record"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        isMobile ? (
          /* Mobile: stacked TDS cards */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {records.map(r => (
              <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{r.brand_name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{format(new Date(r.payment_date), 'd MMM yyyy')} · {r.tds_rate}% TDS</div>
                  </div>
                  <Badge variant={FORM_16A_VARIANT[r.form_16a_status] || 'muted'}>{FORM_16A_LABEL[r.form_16a_status]}</Badge>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>Invoice</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-body)' }}>{formatINR(r.invoice_amount)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>TDS Deducted</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--warning-text)' }}>{formatINR(r.tds_amount)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>You Received</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', color: 'var(--success-text)' }}>{formatINR(r.received_amount)}</div>
                  </div>
                  {r.brand_tan && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>TAN</div>
                      <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.brand_tan}</div>
                    </div>
                  )}
                </div>
                {r.form_16a_status !== 'received' && (
                  <button
                    onClick={() => updateStatus(r.id, r.form_16a_status === 'awaiting' ? 'requested' : 'received')}
                    style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {r.form_16a_status === 'awaiting' ? 'Mark Requested' : 'Mark Received'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Brand', 'TAN', 'Invoice Amt', 'TDS Rate', 'TDS Amt', 'Received', 'Date', 'Form 16A', 'Action'].map(h => (
                  <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{r.brand_name}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.brand_tan || '—'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-body)' }}>{formatINR(r.invoice_amount)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{r.tds_rate}%</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--warning-text)' }}>{formatINR(r.tds_amount)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', color: 'var(--success-text)' }}>{formatINR(r.received_amount)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{format(new Date(r.payment_date), 'd MMM yyyy')}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={FORM_16A_VARIANT[r.form_16a_status] || 'muted'}>{FORM_16A_LABEL[r.form_16a_status]}</Badge>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {r.form_16a_status !== 'received' && (
                      <button
                        onClick={() => updateStatus(r.id, r.form_16a_status === 'awaiting' ? 'requested' : 'received')}
                        style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {r.form_16a_status === 'awaiting' ? 'Mark Requested' : 'Mark Received'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}

      {/* Add TDS Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add TDS Record">
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
          <Input id="tds-brand" label="Brand Name *" value={form.brandName} onChange={e => setForm(p => ({...p, brandName: e.target.value}))} placeholder="Mamaearth Pvt Ltd" />
          <Input id="tds-tan" label="Brand TAN (optional)" value={form.brandTan} onChange={e => setForm(p => ({...p, brandTan: e.target.value.toUpperCase()}))} placeholder="MUMM12345E" maxLength={10} />
          <Input id="tds-amount" label="Invoice Amount (₹) *" type="number" value={form.invoiceAmount} onChange={e => setForm(p => ({...p, invoiceAmount: e.target.value}))} placeholder="45000" style={{ fontVariantNumeric: 'tabular-nums' }} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor="tds-rate" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>TDS Rate</label>
              <select id="tds-rate" value={form.tdsRate} onChange={e => setForm(p => ({...p, tdsRate: e.target.value}))} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                <option value="10">10% (Section 194J)</option>
                <option value="2">2% (Section 194C)</option>
                <option value="1">1% (Section 194C low)</option>
              </select>
            </div>
            <Input id="tds-date" label="Payment Date *" type="date" value={form.paymentDate} onChange={e => setForm(p => ({...p, paymentDate: e.target.value}))} />
          </div>
          {form.invoiceAmount && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>TDS Amount ({form.tdsRate}%)</span>
                <span style={{ color: 'var(--warning-text)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatINR(tdsAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount you received</span>
                <span style={{ color: 'var(--success-text)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatINR(parseFloat(form.invoiceAmount) - tdsAmount)}</span>
              </div>
            </div>
          )}
          <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', border: 'none', marginTop: 'var(--space-2)' }}>
            {saving ? 'Saving…' : 'Add TDS Record'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
