import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api.js';
import { useToast } from '../hooks/useToast.jsx';

export default function ManualPasteModal({ onClose, onDetectionCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ subject: '', body: '', from_email: '', from_name: '' });
  const [showSender, setShowSender] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);    // classification result
  const [detection, setDetection] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [confirming, setConfirming] = useState(false);

  async function handleAnalyse() {
    if (!form.subject.trim() && !form.body.trim()) return;
    setLoading(true);
    try {
      const payload = {
        subject: form.subject,
        body: form.body,
        from_email: form.from_email || undefined,
        from_name: form.from_name || undefined,
      };
      const res = await api.post('/email-detections/paste', payload);
      setResult(res.data.classification);
      setDetection(res.data.detection);
      setEditAmount(res.data.classification.extracted?.amount ?? '');
    } catch {
      toast('Analysis failed — please try again', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!detection) return;
    setConfirming(true);
    try {
      const overrides = {};
      if (editAmount) overrides.amount = Number(editAmount);
      await api.put(`/email-detections/${detection.id}/accept`, overrides);
      toast('Logged successfully ✓', 'success');
      onDetectionCreated?.();
      onClose();
    } catch {
      toast('Failed to log — please try again', 'error');
    } finally {
      setConfirming(false);
    }
  }

  function handleReset() {
    setResult(null);
    setDetection(null);
    setEditAmount('');
  }

  const isOther = result?.type === 'other';
  const hasAmount = result?.extracted?.amount || editAmount;
  const typeLabelMap = {
    payment_received: 'Payment Received',
    deal_confirmed:   'Deal Confirmed',
    deal_inquiry:     'Possible Interest',
    tds_deduction:    'TDS Deduction',
    expense:          'Expense',
    form_16a:         'Form 16A',
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
        width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>
              Add a missed email
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              We're not perfect — paste any email we missed and we'll figure it out.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Form state */}
        {!result && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Subject */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Email subject</span>
                <input
                  type="text"
                  value={form.subject}
                  placeholder='e.g. "Amount of ₹12,500 credited to your account"'
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  style={{
                    padding: '9px 12px', background: 'var(--input-bg)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
                  }}
                />
              </label>

              {/* Body */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Email body</span>
                <textarea
                  value={form.body}
                  rows={8}
                  placeholder="Bank transfer, brand payment confirmation, AdSense payout — paste it all"
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  style={{
                    padding: '9px 12px', background: 'var(--input-bg)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
              </label>

              {/* Optional sender details */}
              <div>
                <button
                  onClick={() => setShowSender(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0,
                  }}
                >
                  {showSender ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Add sender details (optional — helps with accuracy)
                </button>

                {showSender && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>From email</span>
                      <input
                        type="email" value={form.from_email}
                        placeholder="e.g. noreply@hdfcbank.com"
                        onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))}
                        style={{ padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Sender name</span>
                      <input
                        type="text" value={form.from_name}
                        placeholder="e.g. HDFC Bank"
                        onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))}
                        style={{ padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <p style={{ margin: 'var(--space-4) 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Nothing is saved until you confirm.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button onClick={onClose} style={{
                flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)',
              }}>Cancel</button>
              <button
                onClick={handleAnalyse}
                disabled={loading || (!form.subject.trim() && !form.body.trim())}
                style={{
                  flex: 2, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 'var(--text-sm)',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {loading && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                Analyse email →
              </button>
            </div>
          </>
        )}

        {/* Result state — zero match */}
        {result && isOther && (
          <div style={{
            background: 'var(--warning-dim)', border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ color: 'var(--warning-text)', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: 'var(--warning-text)', fontSize: 'var(--text-sm)' }}>
                This one stumped us.
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              We couldn't identify this as a payment, deal, TDS, or expense. You can add it manually from the relevant page.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <a href="/income" style={{
                flex: 1, padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                textDecoration: 'none', textAlign: 'center',
              }}>Add income →</a>
              <button onClick={handleReset} style={{
                flex: 1, padding: '8px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)',
              }}>Try again</button>
            </div>
          </div>
        )}

        {/* Result state — match found */}
        {result && !isOther && (
          <>
            <div style={{
              background: 'var(--success-dim)', border: '1px solid var(--success)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-2)' }}>
                <Check size={14} style={{ color: 'var(--success-text)' }} />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--success-text)' }}>
                  Found it. Does this look right?
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Detected as: <strong>{typeLabelMap[result.type] ?? result.type}</strong>
                {result.extracted?.brand_name && <> · {result.extracted.brand_name}</>}
              </div>
              {result.reasons?.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {result.reasons.slice(0, 3).map((r, i) => (
                    <li key={i} style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Amount field — shown even if detected, for confirmation */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {hasAmount ? 'Amount (₹) — confirm or edit' : 'Almost there — what was the amount?'}
              </span>
              <input
                type="number"
                value={editAmount}
                placeholder="Enter the amount in ₹"
                onChange={e => setEditAmount(e.target.value)}
                style={{
                  padding: '9px 12px', background: 'var(--input-bg)',
                  border: `1px solid ${!hasAmount ? 'var(--warning)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-md)',
                  fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                }}
              />
            </label>

            <p style={{ margin: '0 0 var(--space-4)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Nothing is saved until you confirm.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={handleReset} style={{
                flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)',
              }}>← Back</button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                style={{
                  flex: 2, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 'var(--text-sm)',
                  cursor: confirming ? 'not-allowed' : 'pointer', opacity: confirming ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {confirming ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={14} />}
                Yes, add this →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  , document.body);
}
