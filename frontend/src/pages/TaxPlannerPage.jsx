import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../utils/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { formatINR } from '../utils/formatINR.js';
import { computeTax } from '../utils/taxCalc.js';
import { CURRENT_FY } from '../utils/financialYear.js';
import { taxYearLabel } from '../utils/taxLabels.js';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import { TrendingUp, PartyPopper } from 'lucide-react';
import PlanGate from '../components/ui/PlanGate.jsx';
import InfoTip from '../components/ui/InfoTip.jsx';

function getQuarterDueDate(quarter, fy) {
  const startYear = parseInt(fy.split('-')[0]);
  const dates = { Q1: new Date(startYear, 5, 15), Q2: new Date(startYear, 8, 15), Q3: new Date(startYear, 11, 15), Q4: new Date(startYear+1, 2, 15) };
  return dates[quarter];
}

// Status for one advance-tax instalment card. "Overdue" only when money was actually due.
function getInstalmentStatus(inst, dueDate, isPaid) {
  if (isPaid) return { variant: 'success', label: 'Paid' };
  if (!inst.amountDue) return { variant: 'muted', label: 'Nothing due' };
  const days = Math.ceil((dueDate - new Date()) / 86400000);
  if (days < 0) return { variant: 'danger', label: 'Overdue' };
  if (days <= 14) return { variant: 'warning', label: 'Due soon' };
  return { variant: 'muted', label: 'Upcoming' };
}

const EMPTY_ESTIMATE = computeTax({ grossReceipts: 0 });

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

  // The server runs the tax engine with the user's Tax Profile (regime, presumptive) applied.
  const taxData = estimate;

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
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to log payment')); }
    finally { setSaving(false); }
  }

  const paidSet = new Set(paidPayments.map(p => p.quarter));

  return (
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-6)', maxWidth: 900, width: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>{taxYearLabel(CURRENT_FY)}</p>
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
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>Annual Income Estimate <InfoTip term="advanceTax" /></div>
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

      {/* Refund — the best news the app can give */}
      {taxData?.refund > 0 && (
        <div style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
          <PartyPopper size={20} aria-hidden="true" style={{ color: 'var(--success-text)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              Expected refund at ITR: {formatINR(taxData.refund)}
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginTop: 'var(--space-1)' }}>
              Brands have deducted {formatINR(taxData.tdsDeducted)} in TDS, which is more than your estimated tax of {formatINR(taxData.totalTax)}. You get the difference back when you file your return. No advance tax is due.
            </p>
          </div>
        </div>
      )}

      {taxData?.presumptive && taxData.presumptive !== 'none' && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginBottom: 'var(--space-3)' }}>
          You use presumptive taxation, so all advance tax is due in one instalment by 15 March. <InfoTip term="presumptive" />
        </p>
      )}

      {/* 4 Instalment Cards — always shown (with ₹0 when no data) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(190px, 1fr))', gap: isMobile ? 'var(--space-3)' : 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {(taxData || EMPTY_ESTIMATE).instalments.map(inst => {
          const dueDate = getQuarterDueDate(inst.quarter, CURRENT_FY);
          const isPaid = paidSet.has(inst.quarter);
          const paidEntry = paidPayments.find(p => p.quarter === inst.quarter);
          const status = getInstalmentStatus(inst, dueDate, isPaid);
          const border = { success: 'var(--success)', danger: 'var(--danger)', warning: 'var(--warning)' }[status.variant] || 'var(--border)';

          return (
            <div key={inst.quarter} style={{ background: 'var(--surface)', border: `1px solid ${border}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-md)' }}>{inst.quarter}</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Due {inst.dueDate}</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: inst.amountDue === 0 ? 'var(--text-disabled)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', marginBottom: 'var(--space-3)' }}>
                {formatINR(inst.amountDue)}
              </div>
              {inst.interest > 0 && !isPaid && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', marginBottom: 'var(--space-2)' }}>
                  Est. late interest so far: {formatINR(inst.interest)}
                </div>
              )}
              {isPaid ? (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success-text)' }}>
                  ✓ Paid {formatINR(paidEntry?.amount_paid || 0)}{paidEntry?.challan_number ? ` · ${paidEntry.challan_number}` : ''}
                </div>
              ) : inst.amountDue > 0 ? (
                <button onClick={() => { setPayingQ(inst.quarter); setPayForm(p => ({...p, amountPaid: String(inst.amountDue)})); setPayOpen(true); }} style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Mark as Paid
                </button>
              ) : (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>No liability</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tax breakdown */}
      {taxData && (
        <details style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <summary style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', userSelect: 'none' }}>
            Tax Calculation Breakdown ▾
          </summary>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              ['Projected gross receipts (excl. GST)', formatINR(taxData.grossReceipts)],
              taxData.presumptive === 'none'
                ? taxData.projectedExpenses > 0 && ['Business expenses', `− ${formatINR(taxData.projectedExpenses)}`]
                : ['Presumptive income', formatINR(taxData.businessIncome)],
              taxData.salaryIncome > 0 && ['Salary', formatINR(taxData.salaryIncome)],
              taxData.standardDeduction > 0 && ['Standard deduction (salary only)', `− ${formatINR(taxData.standardDeduction)}`],
              ['Taxable income', formatINR(taxData.taxableIncome)],
              ['Tax on slabs', formatINR(taxData.baseTax)],
              taxData.rebate > 0 && ['Rebate (Sec 87A)', `− ${formatINR(taxData.rebate)}`],
              taxData.marginalRelief > 0 && ['Marginal relief', `− ${formatINR(taxData.marginalRelief)}`],
              ['Health + Education Cess (4%)', formatINR(taxData.cess)],
              ['Total tax liability', formatINR(taxData.totalTax)],
              ['TDS already deducted', `− ${formatINR(taxData.tdsDeducted)}`],
              taxData.refund > 0
                ? ['Expected refund', formatINR(taxData.refund)]
                : ['Net tax payable', formatINR(taxData.netPayable)],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--text-body)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
        Estimates use tax year {CURRENT_FY} rules under the Income-tax Act 2025.{taxData?.surchargeNotApplied ? ' Surcharge on income above ₹50L is not included.' : ''} Always verify with your CA before filing.
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
