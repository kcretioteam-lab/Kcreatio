import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, RefreshCw } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { formatINR } from '../utils/formatINR.js';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { SkeletonStatCard, SkeletonTableRow } from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { IndianRupee, CheckCircle, Clock, AlertCircle, Receipt } from 'lucide-react';
import UsageBar from '../components/ui/UsageBar.jsx';
import { useUsage } from '../hooks/useUsage.jsx';
import { CURRENT_FY, PREVIOUS_FY as PREV_FY, getFinancialYear } from '../utils/financialYear.js';
import { taxYearLabel, tdsSectionLabel } from '../utils/taxLabels.js';
import { readCache, writeCache } from '../utils/listCache.js';
import { uploadDocument, openDocument } from '../utils/documents.js';
import InfoTip from '../components/ui/InfoTip.jsx';

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
  const [form, setForm] = useState({ brandName: '', brandTan: '', invoiceAmount: '', tdsRate: '10', tdsAmount: '', paymentDate: format(new Date(), 'yyyy-MM-dd') });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [fy]);

  async function loadData() {
    // Show the last copy straight away, then refresh
    const cacheKey = `tds:${fy}`;
    const cached = readCache(cacheKey);
    if (cached) { setRecords(cached.list); setSummary(cached.summary); setLoading(false); }
    else setLoading(true);
    try {
      const [recs, sum] = await Promise.all([
        api.get('/tds', { params: { fy } }),
        api.get('/tds/summary', { params: { fy } }),
      ]);
      setRecords(recs.data.records || []);
      setSummary(sum.data);
      writeCache(cacheKey, { list: recs.data.records || [], summary: sum.data });
    } catch (err) { if (!cached) toast.error(getErrorMessage(err, 'Failed to load TDS data')); }
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
        tdsAmount: tdsAmount,
        section: tdsSectionLabel(form.tdsRate === '10' ? '194J' : '194C', getFinancialYear(new Date(form.paymentDate))).replace(/^Sec /, ''),
        paymentDate: form.paymentDate,
      });
      toast.success('TDS record added');
      setAddOpen(false);
      setForm({ brandName: '', brandTan: '', invoiceAmount: '', tdsRate: '10', tdsAmount: '', paymentDate: format(new Date(), 'yyyy-MM-dd') });
      loadData();
      refreshUsage();
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to add record')); }
    finally { setSaving(false); }
  }

  async function uploadForm16A(record, file) {
    if (!file) return;
    try {
      const path = await uploadDocument(file, 'form16a');
      await api.put(`/tds/${record.id}`, { form16aPath: path });
      toast.success(`Form 16A saved for ${record.brand_name}`);
      loadData();
    } catch (err) { toast.error(err?.response ? getErrorMessage(err, 'Upload failed') : err.message); }
  }

  async function setInAis(record, value) {
    try {
      await api.put(`/tds/${record.id}`, { inAis: value });
      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, in_ais: value } : r));
      loadData();
    } catch (err) { toast.error(getErrorMessage(err, 'Couldn’t update')); }
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/tds/${id}`, { form16aStatus: status });
      toast.success('Status updated');
      loadData();
    } catch { toast.error('Failed to update'); }
  }

  // Suggested TDS = rate × taxable value; the user can overwrite it with what the brand actually deducted.
  const suggestedTds = form.invoiceAmount ? Math.round(parseFloat(form.invoiceAmount) * parseFloat(form.tdsRate)) / 100 : 0;
  const tdsAmount = form.tdsAmount !== '' && Number.isFinite(parseFloat(form.tdsAmount)) ? parseFloat(form.tdsAmount) : suggestedTds;

  return (
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-6)', maxWidth: 1100, width: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          
          <select
            value={fy}
            onChange={(e) => setFY(e.target.value)}
            style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}
          >
            <option value={CURRENT_FY}>{taxYearLabel(CURRENT_FY)}</option>
            <option value={PREV_FY}>{taxYearLabel(PREV_FY)}</option>
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

      {/* ITR claimable callout */}
      {!loading && summary && summary.totalDeducted > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          background: 'linear-gradient(135deg, rgba(72,187,120,.12), rgba(72,187,120,.06))',
          border: '1px solid rgba(72,187,120,.3)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4) var(--space-5)',
          marginBottom: 'var(--space-5)',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'var(--text-lg)', color: '#48bb78' }}>
              {formatINR(summary.netTdsCredit)} claimable at ITR
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
              Total TDS deducted this FY — fully recoverable when you file your ITR
            </div>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', maxWidth: 220, textAlign: 'right' }}>
            Collect Form 16A from all brands before filing to claim the full amount
          </div>
        </div>
      )}

      {/* Summary cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
        </div>
      ) : summary && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <StatCard label="Total TDS Deducted" value={formatINR(summary.totalDeducted)} icon={IndianRupee} accentColor="var(--warning)" />
          <StatCard label="Form 16A Received" value={formatINR(summary.form16aReceived)} icon={CheckCircle} accentColor="var(--success)" />
          <StatCard label="Pending Form 16A" value={formatINR(summary.pending)} icon={Clock} accentColor="var(--danger)" />
          <StatCard label="Net TDS Credit" value={formatINR(summary.netTdsCredit)} icon={AlertCircle} accentColor="var(--info)" />
        </div>
      )}

      {/* Before filing: every deduction should appear in Form 26AS / AIS */}
      {!loading && summary?.ais && records.length > 0 && (
        <div style={{ background: 'var(--surface)', border: `1px solid ${summary.ais.missing > 0 ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>Before you file: match against Form 26AS / AIS <InfoTip term="ais" /></div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Download your Annual Information Statement from the income-tax portal (Services → AIS) and tick each entry below that appears there.
            TDS that isn’t in AIS can’t be claimed until the brand files its TDS return — chase them early.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: 'var(--text-sm)' }}>
            <span style={{ color: 'var(--text-body)' }}>Not checked yet: <strong>{summary.ais.unchecked}</strong></span>
            <span style={{ color: summary.ais.missing ? 'var(--danger-text)' : 'var(--text-body)' }}>Missing from AIS: <strong>{summary.ais.missing}</strong>{summary.ais.missing ? ` (${formatINR(summary.ais.missingAmount)})` : ''}</span>
            {summary.byQuarter && <span style={{ color: 'var(--text-muted)' }}>By quarter: {summary.byQuarter.map(q => `${q.quarter} ${formatINR(q.amount)}`).join(' · ')}</span>}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{[1,2,3,4].map(i => <SkeletonTableRow key={i} cols={10} />)}</tbody>
          </table>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No TDS records yet"
          description="Brands usually deduct 1–10% TDS before paying you. Track every rupee here so you can claim it back in your ITR."
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
                {['Brand', 'TAN', 'Taxable', 'Rate', 'TDS', 'Received', 'Date', 'Qtr', 'Form 16A', 'In AIS?'].map(h => (
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
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{format(new Date(r.payment_date), 'd MMM yyyy')}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{r.quarter || '—'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <Badge variant={FORM_16A_VARIANT[r.form_16a_status] || 'muted'}>{FORM_16A_LABEL[r.form_16a_status]}</Badge>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', whiteSpace: 'nowrap' }}>
                        {r.form_16a_url ? (
                          <button onClick={() => openDocument(r.form_16a_url).catch(() => toast.error('Couldn’t open the file'))} style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>View</button>
                        ) : (
                          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                            Upload
                            <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e => uploadForm16A(r, e.target.files?.[0])} style={{ display: 'none' }} />
                          </label>
                        )}
                        {r.form_16a_status === 'awaiting' && (
                          <button onClick={() => updateStatus(r.id, 'requested')} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Mark requested</button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <select aria-label={`Is ${r.brand_name}'s TDS in AIS?`} value={r.in_ais == null ? '' : String(r.in_ais)} onChange={e => setInAis(r, e.target.value === '' ? null : e.target.value === 'true')}
                      style={{ padding: '2px 6px', background: 'var(--surface-2)', border: `1px solid ${r.in_ais === false ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 'var(--text-xs)' }}>
                      <option value="">Not checked</option>
                      <option value="true">✓ Yes</option>
                      <option value="false">✗ Missing</option>
                    </select>
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
          <Input id="tds-brand" label="Brand Name *" value={form.brandName} onChange={e => setForm(p => ({...p, brandName: e.target.value}))} placeholder="Glowleaf Naturals Pvt Ltd" />
          <Input id="tds-tan" label="Brand TAN (optional)" value={form.brandTan} onChange={e => setForm(p => ({...p, brandTan: e.target.value.toUpperCase()}))} placeholder="BLRA12345B" maxLength={10} />
          <Input id="tds-amount" label="Taxable value, before GST (₹) *" type="number" value={form.invoiceAmount} onChange={e => setForm(p => ({...p, invoiceAmount: e.target.value, tdsAmount: ''}))} placeholder="45000" hint="TDS is worked out on the amount before GST." style={{ fontVariantNumeric: 'tabular-nums' }} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor="tds-rate" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>TDS Rate</label>
              <select id="tds-rate" value={form.tdsRate} onChange={e => setForm(p => ({...p, tdsRate: e.target.value, tdsAmount: ''}))} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                <option value="10">10% · {tdsSectionLabel('194J', fy)} (professional fees)</option>
                <option value="2">2% · {tdsSectionLabel('194C', fy)} (contract, company)</option>
                <option value="1">1% · {tdsSectionLabel('194C', fy)} (contract, individual)</option>
              </select>
            </div>
            <Input id="tds-date" label="Payment Date *" type="date" value={form.paymentDate} onChange={e => setForm(p => ({...p, paymentDate: e.target.value}))} />
          </div>
          {form.invoiceAmount && (
            <Input id="tds-actual" label="TDS actually deducted (₹)" type="number" value={form.tdsAmount === '' ? String(suggestedTds) : form.tdsAmount}
              onChange={e => setForm(p => ({...p, tdsAmount: e.target.value}))}
              hint="Brands often deduct an odd amount — copy it from their payment advice or Form 16A."
              style={{ fontVariantNumeric: 'tabular-nums' }} />
          )}
          <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', border: 'none', marginTop: 'var(--space-2)' }}>
            {saving ? 'Saving…' : 'Add TDS Record'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
