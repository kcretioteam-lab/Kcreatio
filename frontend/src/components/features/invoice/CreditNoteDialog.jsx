import { useState, useEffect } from 'react';
import Modal from '../../ui/Modal.jsx';
import Input from '../../ui/Input.jsx';
import api, { getErrorMessage } from '../../../utils/api.js';
import { formatINRDecimal } from '../../../utils/formatINR.js';

const today = () => new Date().toISOString().slice(0, 10);

// Issues a credit note against an invoice — required by GST law when a deal is cancelled or
// the amount is reduced after the invoice went out. GST is reversed in the same proportion.
export default function CreditNoteDialog({ invoice, onClose, onDone }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [noteDate, setNoteDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const base = Number(invoice?.base_amount || 0);
  const gstShare = base > 0 ? Number(invoice?.gst_amount || 0) / base : 0;
  const amt = parseFloat(amount) || 0;

  useEffect(() => {
    if (!invoice) return;
    setAmount(String(base)); setReason(''); setNoteDate(today()); setError('');
  }, [invoice?.id]);

  async function submit(e) {
    e.preventDefault();
    if (!(amt > 0)) { setError('Enter the amount to credit (before GST)'); return; }
    if (reason.trim().length < 3) { setError('Say why you’re issuing the credit note'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.post('/credit-notes', { invoiceId: invoice.id, amount: amt, reason: reason.trim(), noteDate });
      onDone(data);
    } catch (err) { setError(getErrorMessage(err, 'Couldn’t create the credit note. Please try again.')); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={Boolean(invoice)} onClose={saving ? () => {} : onClose} title={invoice ? `Credit note for ${invoice.invoice_number}` : ''}>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Use a credit note when a deal is cancelled or its value is reduced after the invoice was issued. Don’t edit or delete the original invoice.
        </p>
        <Input id="cn-amount" label="Amount to credit, before GST (₹) *" type="number" value={amount} onChange={e => setAmount(e.target.value)}
          hint={`Invoice taxable value: ${formatINRDecimal(base)}`} style={{ fontVariantNumeric: 'tabular-nums' }} />
        <Input id="cn-reason" label="Reason *" value={reason} onChange={e => setReason(e.target.value)} placeholder="Deal cancelled / deliverables reduced" maxLength={300} />
        <Input id="cn-date" label="Credit note date" type="date" value={noteDate} max={today()} onChange={e => setNoteDate(e.target.value)} />
        {amt > 0 && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
            GST reversed: <strong>{formatINRDecimal(Math.round(amt * gstShare * 100) / 100)}</strong> · Total credit: <strong>{formatINRDecimal(Math.round(amt * (1 + gstShare) * 100) / 100)}</strong>
            {['paid', 'partially_paid'].includes(invoice?.status) && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>This invoice was paid, so {formatINRDecimal(amt)} will be taken off your income.</div>}
          </div>
        )}
        {error && <p role="alert" style={{ color: 'var(--danger-text)', fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Creating…' : 'Create credit note'}
        </button>
      </form>
    </Modal>
  );
}
