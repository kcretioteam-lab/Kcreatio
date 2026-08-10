import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  RefreshCw, Info, Check, X, Edit2, Loader2, Zap,
  CreditCard, Handshake, FileText, ShoppingBag, Eye, Lock
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import api from '../utils/api.js';
import { canAccess } from '../utils/planConfig.js';
import { useToast } from '../hooks/useToast.jsx';

const TYPE_META = {
  payment_received: { label: 'Payment Received',   icon: CreditCard,  accent: 'var(--success)',         dim: 'var(--success-dim)' },
  deal_confirmed:   { label: 'Deal Confirmed',      icon: Handshake,   accent: 'var(--accent)',          dim: 'var(--accent-dim)'  },
  deal_inquiry:     { label: 'Possible Interest',   icon: Eye,         accent: 'var(--text-muted)',      dim: 'var(--surface-2)'   },
  tds_deduction:    { label: 'TDS Deducted',        icon: FileText,    accent: 'var(--warning)',         dim: 'var(--warning-dim)' },
  expense:          { label: 'Expense Detected',    icon: ShoppingBag, accent: 'var(--warning)',         dim: 'var(--warning-dim)' },
  form_16a:         { label: 'Form 16A Received',   icon: FileText,    accent: 'var(--success)',         dim: 'var(--success-dim)' },
  other:            { label: 'Other',               icon: Info,        accent: 'var(--text-muted)',      dim: 'var(--surface-2)'   },
};

// Confidence dots: 4 dots filled based on confidence score
function ConfidenceDots({ confidence, type }) {
  const filled = type === 'deal_inquiry' ? 1
    : confidence >= 0.85 ? 4
    : confidence >= 0.70 ? 3
    : confidence >= 0.50 ? 2 : 1;

  const label = type === 'deal_inquiry' ? 'Soft inquiry'
    : filled === 4 ? 'High' : filled === 3 ? 'Medium' : 'Low';

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1,2,3,4].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i <= filled ? 'var(--accent)' : 'var(--border)',
          display: 'inline-block',
        }} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>{label}</span>
    </span>
  );
}

// Info popover — "How we detected this"
function ProvenancePopover({ detection, onClose }) {
  const ref = useRef(null);
  const meta = TYPE_META[detection.detected_type] ?? TYPE_META.other;
  const reasons = detection.extracted_data?.reasons ?? [];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const receivedAt = detection.email_received_at
    ? format(new Date(detection.email_received_at), "EEEE, d MMMM yyyy 'at' h:mm a")
    : 'Unknown';
  const scannedAt = detection.scanned_at
    ? format(new Date(detection.scanned_at), "d MMMM yyyy 'at' h:mm a")
    : null;

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, zIndex: 200,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
      minWidth: 320, maxWidth: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      marginTop: 4,
    }}>
      <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)', color: 'var(--text-primary)' }}>
        How we detected this
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {detection.raw_sender && (
          <div><span style={{ color: 'var(--text-muted)' }}>From: </span>{detection.raw_sender}</div>
        )}
        {detection.raw_subject && (
          <div><span style={{ color: 'var(--text-muted)' }}>Subject: </span>
            <span style={{ wordBreak: 'break-word' }}>"{detection.raw_subject}"</span>
          </div>
        )}
        <div><span style={{ color: 'var(--text-muted)' }}>Received: </span>{receivedAt}</div>
        {scannedAt && (
          <div><span style={{ color: 'var(--text-muted)' }}>Scanned: </span>{scannedAt}</div>
        )}
      </div>

      {reasons.length > 0 && (
        <>
          <div style={{ margin: 'var(--space-3) 0 var(--space-2)', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>
            We detected this as <strong style={{ color: meta.accent }}>{meta.label}</strong> because:
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {reasons.map((r, i) => (
              <li key={i} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r}</li>
            ))}
          </ul>
        </>
      )}

      <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <ConfidenceDots confidence={detection.confidence} type={detection.detected_type} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({(detection.confidence * 100).toFixed(0)}%)</span>
      </div>

      <button onClick={onClose} style={{
        marginTop: 'var(--space-3)', width: '100%', padding: '6px',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12,
        color: 'var(--text-secondary)',
      }}>Close</button>
    </div>
  );
}

// Single detection card
function DetectionCard({ detection, onAccept, onReject, onEdit }) {
  const [showProvenance, setShowProvenance] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const meta = TYPE_META[detection.detected_type] ?? TYPE_META.other;
  const Icon = meta.icon;
  const isSoftInquiry = detection.detected_type === 'deal_inquiry';

  const receivedLabel = (() => {
    if (!detection.email_received_at) return detection.source === 'manual' ? 'Added manually' : null;
    const d = new Date(detection.email_received_at);
    if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
    if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
    return format(d, "d MMM 'at' h:mm a");
  })();

  const amountDisplay = detection.extracted_data?.amount
    ? `₹${Number(detection.extracted_data.amount).toLocaleString('en-IN')}`
    : null;

  async function handleAccept() {
    setAccepting(true);
    await onAccept(detection.id);
    setAccepting(false);
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid var(--border)`,
      borderLeft: `3px solid ${meta.accent}`,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3) var(--space-4)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            background: meta.dim, borderRadius: 'var(--radius-sm)',
            padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Icon size={12} style={{ color: meta.accent }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: meta.accent }}>{meta.label}</span>
          </div>
          <ConfidenceDots confidence={detection.confidence} type={detection.detected_type} />
        </div>

        {/* Primary action */}
        {!isSoftInquiry && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600,
              cursor: accepting ? 'not-allowed' : 'pointer', opacity: accepting ? 0.7 : 1,
            }}
          >
            {accepting ? <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={10} />}
            {detection.confidence >= 0.85 ? 'Accept' : 'Review'}
          </button>
        )}
      </div>

      {/* Sender + amount row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
          {detection.raw_sender_email || detection.raw_sender || 'Unknown sender'}
        </span>
        {amountDisplay && (
          <>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {amountDisplay}
            </span>
          </>
        )}
        {detection.extracted_data?.brand_name && (
          <>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detection.extracted_data.brand_name}</span>
          </>
        )}

        {/* Info icon */}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            onClick={() => setShowProvenance(v => !v)}
            title="How we detected this"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
          >
            <Info size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
          {showProvenance && (
            <ProvenancePopover detection={detection} onClose={() => setShowProvenance(false)} />
          )}
        </div>
      </div>

      {/* Snippet */}
      {detection.raw_snippet && (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', lineClamp: 2,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          "{detection.raw_snippet}"
        </p>
      )}

      {/* Timestamp row */}
      {receivedLabel && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>📅</span> {detection.source === 'manual' ? 'Added manually · ' : 'Email received: '}{receivedLabel}
        </div>
      )}

      {/* Soft inquiry warning */}
      {isSoftInquiry && (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '6px var(--space-3)',
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          We're not sure this is a confirmed deal — add it only if you've agreed to work together
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2 }}>
        {isSoftInquiry && (
          <button onClick={handleAccept} disabled={accepting} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {accepting ? <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
            Add to deals
          </button>
        )}
        {!isSoftInquiry && (
          <button onClick={() => onEdit(detection)} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer',
          }}>
            <Edit2 size={10} /> Edit
          </button>
        )}
        <button onClick={() => onReject(detection.id)} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
          background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer', marginLeft: 'auto',
        }}>
          <X size={10} /> {isSoftInquiry ? 'Skip' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}

// Edit + Accept modal for reviewing extracted data before confirming
function EditAcceptModal({ detection, onConfirm, onClose }) {
  const meta = TYPE_META[detection.detected_type] ?? TYPE_META.other;
  const [form, setForm] = useState({
    brand_name: detection.extracted_data?.brand_name ?? '',
    amount: detection.extracted_data?.amount ?? '',
    tds_rate: detection.extracted_data?.tds_rate ?? 10,
    tan: detection.extracted_data?.tan ?? '',
    description: detection.extracted_data?.description ?? '',
    expense_category: 'subscription',
  });
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    await onConfirm(detection.id, {
      brand_name: form.brand_name || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      tds_rate: form.tds_rate ? Number(form.tds_rate) : undefined,
      tan: form.tan || undefined,
      description: form.description || undefined,
      expense_category: form.expense_category,
    });
    setSaving(false);
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
        width: '100%', maxWidth: 420,
      }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--text-md)', marginBottom: 4, color: 'var(--text-primary)' }}>
          Found it. Does this look right?
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
          {meta.label} · {detection.raw_sender_email}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {['payment_received', 'tds_deduction', 'expense'].includes(detection.detected_type) && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Amount (₹)</span>
              <input
                type="number" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={{ padding: '8px 10px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
              />
            </label>
          )}
          {['deal_confirmed', 'deal_inquiry', 'payment_received', 'tds_deduction'].includes(detection.detected_type) && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Brand / Company</span>
              <input
                type="text" value={form.brand_name} placeholder="e.g. Samsung India"
                onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))}
                style={{ padding: '8px 10px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
              />
            </label>
          )}
          {detection.detected_type === 'tds_deduction' && (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>TDS Rate (%)</span>
                <input
                  type="number" value={form.tds_rate} min={0} max={100}
                  onChange={e => setForm(f => ({ ...f, tds_rate: e.target.value }))}
                  style={{ padding: '8px 10px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>TAN Number</span>
                <input
                  type="text" value={form.tan} placeholder="e.g. BANG12345A"
                  onChange={e => setForm(f => ({ ...f, tan: e.target.value.toUpperCase() }))}
                  style={{ padding: '8px 10px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
                />
              </label>
            </>
          )}
          {detection.detected_type === 'expense' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Category</span>
              <select
                value={form.expense_category}
                onChange={e => setForm(f => ({ ...f, expense_category: e.target.value }))}
                style={{ padding: '8px 10px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
              >
                {['subscription','equipment','software','travel','props','marketing','team','other'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <p style={{ margin: 'var(--space-4) 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          Nothing is saved until you confirm.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)',
          }}>Cancel</button>
          <button onClick={handleConfirm} disabled={saving} style={{
            flex: 2, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius-sm)', cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={14} />}
            Yes, add this
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

// ── Main widget ────────────────────────────────────────────────────────────────

export default function SmartInboxWidget({ user, onManualPaste, onPendingCountChange }) {
  const { toast } = useToast();
  const [detections, setDetections] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastScanAt, setLastScanAt] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [planLocked, setPlanLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [editingDetection, setEditingDetection] = useState(null);
  const [lastScanLabel, setLastScanLabel] = useState('');

  const isStarterPlus = canAccess('smart_inbox', user?.plan);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/email-detections?status=pending_review&limit=20');
      setDetections(res.data.detections ?? []);
      setPendingCount(res.data.pending_count ?? 0);
      setLastScanAt(res.data.last_scan_at);
      setGmailConnected(res.data.gmail_connected);
      // Only respect plan_locked from API if the frontend auth also says no access.
      // Prevents dev-bypass (Supabase null user → 'basic') from locking Starter+ UI.
      setPlanLocked(res.data.plan_locked ?? false);
      onPendingCountChange?.(res.data.pending_count ?? 0);
    } catch {
      // silently fail — widget is non-critical
    } finally {
      setLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => { load(); }, [load]);

  // Update "last checked" label every 30s
  useEffect(() => {
    function updateLabel() {
      if (!lastScanAt) { setLastScanLabel(''); return; }
      setLastScanLabel(formatDistanceToNow(new Date(lastScanAt), { addSuffix: true }));
    }
    updateLabel();
    const id = setInterval(updateLabel, 30_000);
    return () => clearInterval(id);
  }, [lastScanAt]);

  async function handleScanNow() {
    if (scanCooldown || scanning) return;
    setScanning(true);
    setScanCooldown(true);
    try {
      const res = await api.post('/email-detections/scan-now');
      const { new_detections } = res.data;
      setLastScanAt(new Date().toISOString());
      if (new_detections > 0) {
        toast(`Found ${new_detections} new item${new_detections > 1 ? 's' : ''} in your inbox`, 'success');
        await load();
      } else {
        toast('All clear — nothing new found', 'info');
      }
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Scan failed';
      toast(msg, 'error');
    } finally {
      setScanning(false);
      setTimeout(() => setScanCooldown(false), 60_000);
    }
  }

  async function handleAccept(id, overrides = {}) {
    try {
      await api.put(`/email-detections/${id}/accept`, overrides);
      setDetections(d => d.filter(x => x.id !== id));
      setPendingCount(c => Math.max(0, c - 1));
      onPendingCountChange?.(Math.max(0, pendingCount - 1));
      toast('Logged successfully ✓', 'success');
    } catch {
      toast('Failed to accept — please try again', 'error');
    }
  }

  async function handleReject(id) {
    try {
      await api.put(`/email-detections/${id}/reject`);
      setDetections(d => d.filter(x => x.id !== id));
      setPendingCount(c => Math.max(0, c - 1));
      onPendingCountChange?.(Math.max(0, pendingCount - 1));
    } catch {
      toast('Failed to dismiss', 'error');
    }
  }

  if (loading) return null;

  const showWidget = isStarterPlus || planLocked;
  if (!showWidget) return null;

  return (
    <div id="smart-inbox" style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: detections.length > 0 || !isStarterPlus ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Zap size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Smart Inbox</span>
          {pendingCount > 0 && (
            <span style={{
              background: 'var(--accent-dim)', color: 'var(--accent)',
              fontSize: 11, fontWeight: 700, borderRadius: 'var(--radius-full)',
              padding: '1px 7px',
            }}>{pendingCount}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {lastScanLabel && isStarterPlus && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Last checked: {lastScanLabel}
            </span>
          )}
          {isStarterPlus && (
            <button
              onClick={handleScanNow}
              disabled={scanning || scanCooldown}
              title={scanCooldown && !scanning ? 'Checked recently' : 'Check inbox now'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: (scanning || scanCooldown) ? 'not-allowed' : 'pointer',
                fontSize: 12, color: 'var(--text-secondary)',
                opacity: scanCooldown && !scanning ? 0.6 : 1,
              }}
            >
              <RefreshCw size={11} style={{ animation: scanning ? 'spin 0.8s linear infinite' : 'none' }} />
              {scanning ? 'Checking...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* Plan locked teaser — only when frontend auth also says no access */}
      {planLocked && !isStarterPlus && (
        <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 'var(--space-2)' }}>
            <Lock size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {pendingCount} payment{pendingCount !== 1 ? 's' : ''} detected in your inbox
            </span>
          </div>
          <p style={{ margin: '0 0 var(--space-4)', fontSize: 12, color: 'var(--text-muted)' }}>
            Connect Gmail and upgrade to Starter to review and log them automatically.
          </p>
          <a href="/settings#billing" style={{
            display: 'inline-block', padding: '8px 20px',
            background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)',
            fontWeight: 700, fontSize: 12, textDecoration: 'none',
          }}>
            Upgrade to Starter →
          </a>
        </div>
      )}

      {/* No Gmail connected */}
      {isStarterPlus && !gmailConnected && (
        <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          <p style={{ margin: '0 0 var(--space-3)' }}>
            Connect Gmail to auto-detect payments, brand deals, TDS deductions, and subscription expenses.
          </p>
          <a href="/settings#integrations" style={{
            color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', fontSize: 12,
          }}>
            Connect in Settings → Integrations →
          </a>
        </div>
      )}

      {/* All caught up */}
      {isStarterPlus && gmailConnected && detections.length === 0 && (
        <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          You're all caught up ✓ — we'll check again automatically every 6 hours.
        </div>
      )}

      {/* Detection cards */}
      {isStarterPlus && detections.length > 0 && (
        <div style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {detections.map(d => (
            <DetectionCard
              key={d.id}
              detection={d}
              onAccept={id => handleAccept(id)}
              onReject={handleReject}
              onEdit={setEditingDetection}
            />
          ))}
        </div>
      )}

      {/* Manual paste footer */}
      {isStarterPlus && (
        <div style={{
          padding: 'var(--space-3) var(--space-5)',
          borderTop: detections.length > 0 ? '1px solid var(--border)' : 'none',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Don't see a payment?{' '}
            <button onClick={onManualPaste} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: 0,
            }}>
              Add it manually →
            </button>
          </span>
        </div>
      )}

      {/* Edit + Accept modal */}
      {editingDetection && (
        <EditAcceptModal
          detection={editingDetection}
          onConfirm={async (id, overrides) => {
            await handleAccept(id, overrides);
            setEditingDetection(null);
          }}
          onClose={() => setEditingDetection(null)}
        />
      )}
    </div>
  );
}
