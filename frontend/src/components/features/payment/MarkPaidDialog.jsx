import { useState, useEffect } from 'react';
import Modal from '../../ui/Modal.jsx';
import Input from '../../ui/Input.jsx';
import { formatINRDecimal } from '../../../utils/formatINR.js';
import { tdsSectionLabel } from '../../../utils/taxLabels.js';
import { getFinancialYear } from '../../../utils/financialYear.js';
import { getErrorMessage } from '../../../utils/api.js';
import InfoTip from '../../ui/InfoTip.jsx';

// Common TDS rates on creator income. The user can always type the exact amount the brand deducted.
const TDS_OPTIONS = [
  { value: '194J', rate: 10, label: 'Professional fees — 10%' },
  { value: '194C-2', rate: 2, label: 'Contract work (company) — 2%' },
  { value: '194C-1', rate: 1, label: 'Contract work (individual) — 1%' },
  { value: '194R', rate: 10, label: 'Gifted products over ₹20,000 — 10%' },
  { value: 'none', rate: 0, label: 'No TDS deducted' },
];

const today = () => new Date().toISOString().split('T')[0];
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Records a payment against an invoice or a deal.
 * taxableValue: amount before GST — income and TDS are based on this.
 * total: what the brand owes in full (incl. GST).
 * onSubmit({ paymentDate, amountReceived, tdsDeducted, tdsSection }) must return a promise.
 */
export default function MarkPaidDialog({ isOpen, onClose, title, brandName, taxableValue, total, defaultSection = '194J', barter = false, onSubmit }) {
  const [paymentDate, setPaymentDate] = useState(today());
  const [section, setSection] = useState(defaultSection);
  const [tds, setTds] = useState('');
  const [received, setReceived] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rateFor = (s) => TDS_OPTIONS.find(o => o.value === s)?.rate ?? 0;

  // Reset every time the dialog opens for a new record
  useEffect(() => {
    if (!isOpen) return;
    const t = round2(taxableValue * rateFor(defaultSection) / 100);
    setPaymentDate(today());
    setSection(defaultSection);
    setTds(String(t));
    // Barter: no money arrives — the products are the payment
    setReceived(String(barter ? 0 : round2(total - t)));
    setError('');
  }, [isOpen, taxableValue, total, defaultSection, barter]);

  function pickSection(s) {
    setSection(s);
    const t = round2(taxableValue * rateFor(s) / 100);
    setTds(String(t));
    if (!barter) setReceived(String(round2(total - t)));
  }

  function changeTds(v) {
    setTds(v);
    const n = parseFloat(v);
    if (Number.isFinite(n) && !barter) setReceived(String(round2(total - n)));
  }

  async function submit(e) {
    e.preventDefault();
    const tdsNum = parseFloat(tds) || 0;
    const receivedNum = parseFloat(received);
    if (!paymentDate) { setError('Enter the date you were paid'); return; }
    if (!Number.isFinite(receivedNum) || receivedNum < 0) { setError('Enter the amount you received'); return; }
    if (tdsNum < 0) { setError('TDS can’t be negative'); return; }
    if (tdsNum > taxableValue) { setError(`TDS can’t be more than the taxable value (${formatINRDecimal(taxableValue)})`); return; }
    setSaving(true);
    setError('');
    try {
      const code = section.split('-')[0];
      await onSubmit({
        paymentDate,
        amountReceived: receivedNum,
        tdsDeducted: tdsNum,
        tdsSection: tdsNum > 0 && section !== 'none' ? tdsSectionLabel(code, getFinancialYear(new Date(paymentDate))).replace(/^Sec /, '') : undefined,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Couldn’t record the payment. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  const fy = paymentDate ? getFinancialYear(new Date(paymentDate)) : undefined;
  const rowStyle = { display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' };

  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title={title || 'Record payment'}>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {brandName && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', margin: 0 }}>
            Payment from <strong style={{ color: 'var(--text-primary)' }}>{brandName}</strong>
          </p>
        )}

        <Input id="mp-date" label="Date you were paid *" type="date" value={paymentDate} max={today()} onChange={e => setPaymentDate(e.target.value)} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor="mp-section" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>TDS the brand deducted <InfoTip term="tds" /></label>
          <select id="mp-section" value={section} onChange={e => pickSection(e.target.value)}
            style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}>
            {TDS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.value === 'none' ? o.label : `${tdsSectionLabel(o.value.split('-')[0], fy)} · ${o.label}`}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
          <Input id="mp-tds" label="TDS amount (₹)" type="number" inputMode="decimal" min="0" step="0.01" value={tds} onChange={e => changeTds(e.target.value)}
            hint="Check the brand’s payment advice — brands often deduct odd amounts." style={{ fontVariantNumeric: 'tabular-nums' }} />
          <Input id="mp-received" label={barter ? 'Cash received, if any (₹)' : 'Amount received (₹) *'} type="number" inputMode="decimal" min="0" step="0.01" value={received} onChange={e => setReceived(e.target.value)}
            hint={barter ? undefined : 'Got less than the full amount? Enter what arrived — the rest stays outstanding as a part payment.'}
            style={{ fontVariantNumeric: 'tabular-nums' }} />
        </div>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <div style={rowStyle}><span style={{ color: 'var(--text-muted)' }}>Income logged (excl. GST)</span><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINRDecimal(taxableValue)}</strong></div>
          <div style={rowStyle}><span style={{ color: 'var(--text-muted)' }}>TDS credit you can claim</span><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINRDecimal(parseFloat(tds) || 0)}</strong></div>
          {total > taxableValue && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
              The {formatINRDecimal(round2(total - taxableValue))} GST you collected is owed to the government, so it isn’t counted as income.
            </div>
          )}
        </div>

        {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p>}

        <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', border: 'none', fontFamily: 'inherit' }}>
          {saving ? 'Saving…' : 'Mark as paid'}
        </button>
      </form>
    </Modal>
  );
}
