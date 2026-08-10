import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { formatINR } from '../utils/formatINR.js';
import { calculateAdvanceTax, INSTALMENT_SCHEDULE } from '../utils/taxCalc.js';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import { TrendingUp } from 'lucide-react';
import PlanGate from '../components/ui/PlanGate.jsx';

const CURRENT_FY = (() => {
  const now = new Date();
  const y = now.getFullYear(); const m = now.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y+1).slice(-2)}` : `${y-1}-${String(y).slice(-2)}`;
})();

function getQuarterDueDate(quarter, fy) {
  const startYear = parseInt(fy.split('-')[0]);
  const dates = { Q1: new Date(startYear, 5, 15), Q2: new Date(startYear, 8, 15), Q3: new Date(startYear, 11, 15), Q4: new Date(startYear+1, 2, 15) };
  return dates[quarter];
}

function getUrgency(dueDate) {
  const days = Math.ceil((dueDate - new Date()) / 86400000);
  if (days < 0) return 'danger';
  if (days <= 7) return 'danger';
  if (days <= 14) return 'warning';
  return 'muted';
}

export default function TaxPlannerPage() {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [regime, setRegime] = useState('new');
  const [estimate, setEstimate] = useState(null);
  const [paidPayments, setPaidPayments] = useState([]);
  const [manualEstimate, setManualEstimate] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payingQ, setPayingQ] = useState(null);
  const [payForm, setPayForm] = useState({ amountPaid: '', paidDate: '', challanNumber: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [regime, manualEstimate]);

  async function loadData() {
    setLoading(true);
    try {
      const params = { fy: CURRENT_FY, regime };
      if (manualEstimate) params.annualEstimate = manualEstimate;
      const [est, schedule] = await Promise.all([
        api.get('/tax/estimate', { params }),
        api.get('/tax/schedule', { params: { fy: CURRENT_FY } }),
      ]);
      setEstimate(est.data);
      setPaidPayments(schedule.data.payments || []);
    } catch { toast.error('Failed to load tax estimate'); }
    finally { setLoading(false); }
  }

  // Client-side calculation from API data
  const taxData = estimate ? calculateAdvanceTax(
    manualEstimate ? parseFloat(manualEstimate) : estimate.projectedAnnual,
    regime,
    estimate.tdsDeducted
  ) : null;

  async function handleMarkPaid(e) {
    e.preventDefault();
    if (!payForm.amountPaid || !payForm.paidDate) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      await api.post('/tax/payments', {
        quarter: payingQ,
        financialYear: CURRENT_FY,
        amountPaid: parseFloat(payForm.amountPaid),
        paidDate: payForm.paidDate,
        challanNumber: payForm.challanNumber || undefined,
      });
      toast.success(`${payingQ} advance tax logged`);
      setPayOpen(false);
      setPayForm({ amountPaid: '', paidDate: '', challanNumber: '' });
      loadData();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to log payment'); }
    finally { setSaving(false); }
  }

  const paidSet = new Set(paidPayments.map(p => p.quarter));

  return (
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-6)', maxWidth: 900, width: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>FY {CURRENT_FY}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Tax Regime:</span>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {['new', 'old'].map(r => (
              <button key={r} onClick={() => setRegime(r)} style={{ padding: 'var(--space-1) var(--space-3)', background: regime === r ? 'var(--accent)' : 'var(--surface-2)', color: regime === r ? '#fff' : 'var(--text-body)', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <PlanGate feature="advance_tax_calculator">
      {/* Annual income estimate */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>Annual Income Estimate</div>
        {estimate && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginBottom: 'var(--space-3)' }}>
            Based on {formatINR(estimate.ytdIncome)} logged this year, projecting {formatINR(estimate.projectedAnnual)} annual income.
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <label htmlFor="manual-estimate" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>Override estimate:</label>
          <input id="manual-estimate" type="number" value={manualEstimate} onChange={e => setManualEstimate(e.target.value)} placeholder={estimate ? String(Math.round(estimate.projectedAnnual)) : '0'} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit', width: 180, fontVariantNumeric: 'tabular-nums' }} />
        </div>
      </div>

      {/* Guide card — shown when no income logged yet */}
      {!loading && estimate && estimate.ytdIncome === 0 && !manualEstimate && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-5)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-4)',
        }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
            <TrendingUp size={18} aria-hidden="true" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
              Log income to get your advance tax estimate
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
              Once you log income, we'll automatically project your annual earnings and calculate exact quarterly instalments — or enter an estimate above to see it now.
            </p>
            <Link to="/income" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600 }}>
              → Log Income
            </Link>
          </div>
        </div>
      )}

      {/* 4 Instalment Cards — always shown (with ₹0 when no data) */}
      {(() => {
        const displayData = taxData || calculateAdvanceTax(0, regime, 0);
        return (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(190px, 1fr))', gap: isMobile ? 'var(--space-3)' : 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            {displayData.instalments.map(inst => {
              const dueDate = getQuarterDueDate(inst.quarter, CURRENT_FY);
              const urgency = getUrgency(dueDate);
              const isPaid = paidSet.has(inst.quarter);
              const paidEntry = paidPayments.find(p => p.quarter === inst.quarter);

              return (
                <div key={inst.quarter} style={{ background: 'var(--surface)', border: `1px solid ${isPaid ? 'var(--success)' : urgency === 'danger' ? 'var(--danger)' : urgency === 'warning' ? 'var(--warning)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-md)' }}>{inst.quarter}</span>
                    <Badge variant={isPaid ? 'success' : urgency === 'danger' ? 'danger' : urgency === 'warning' ? 'warning' : 'muted'}>
                      {isPaid ? 'Paid' : urgency === 'danger' ? 'Overdue' : urgency === 'warning' ? 'Due Soon' : 'Upcoming'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Due {inst.dueDate}</div>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: inst.amountDueRupees === 0 ? 'var(--text-disabled)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', marginBottom: 'var(--space-3)' }}>
                    {inst.amountDueRupees === 0 ? '₹0' : formatINR(inst.amountDueRupees)}
                  </div>
                  {isPaid ? (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success-text)' }}>
                      ✓ Paid {formatINR(paidEntry?.amount_paid || 0)}{paidEntry?.challan_number ? ` · ${paidEntry.challan_number}` : ''}
                    </div>
                  ) : inst.amountDueRupees > 0 ? (
                    <button onClick={() => { setPayingQ(inst.quarter); setPayForm(p => ({...p, amountPaid: String(inst.amountDueRupees)})); setPayOpen(true); }} style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Mark as Paid
                    </button>
                  ) : (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>No liability</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Tax breakdown */}
      {taxData && (
        <details style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <summary style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', userSelect: 'none' }}>
            Tax Calculation Breakdown ▾
          </summary>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              ['Estimated Annual Income', formatINR(taxData.annualIncome)],
              ['Standard Deduction', `− ${formatINR(taxData.standardDeduction)}`],
              ['Taxable Income', formatINR(taxData.taxableIncome)],
              ['Base Tax', formatINR(taxData.baseTax)],
              ['Health + Education Cess (4%)', formatINR(taxData.cess)],
              ['Total Tax Liability', formatINR(taxData.totalTax)],
              ['TDS Already Deducted', `− ${formatINR(taxData.tdsDeducted)}`],
              ['Net Advance Tax Payable', formatINR(taxData.netAdvanceTax)],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--text-body)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
        Estimates based on current Indian tax law. Always verify with your CA before filing. Tax laws may change.
      </p>
      </PlanGate>

      <Modal isOpen={payOpen} onClose={() => setPayOpen(false)} title={`Mark ${payingQ} as Paid`}>
        <form onSubmit={handleMarkPaid} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
          <Input id="pay-amount" label="Amount Paid (₹) *" type="number" value={payForm.amountPaid} onChange={e => setPayForm(p => ({...p, amountPaid: e.target.value}))} style={{ fontVariantNumeric: 'tabular-nums' }} />
          <Input id="pay-date" label="Payment Date *" type="date" value={payForm.paidDate} onChange={e => setPayForm(p => ({...p, paidDate: e.target.value}))} />
          <Input id="pay-challan" label="Challan Number (optional)" value={payForm.challanNumber} onChange={e => setPayForm(p => ({...p, challanNumber: e.target.value}))} placeholder="BSR code or CIN" />
          <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            {saving ? 'Saving…' : 'Log Payment'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
