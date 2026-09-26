import { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import Modal from './Modal.jsx';
import Input from './Input.jsx';
import { LIMITS } from '../../utils/limits.js';
import api, { getErrorMessage } from '../../utils/api.js';
import { useToast } from '../../hooks/useToast.jsx';

const FEATURE_OPTIONS = [
  { id: 'advance_tax_calculator', label: 'Advance tax calculator' },
  { id: 'income_dashboard',       label: 'P&L / income dashboard' },
  { id: 'ca_export',              label: 'CA export (ITR-ready)' },
  { id: 'smart_inbox',            label: 'Smart Inbox (Gmail auto-detect)' },
  { id: 'watermark_free_pdf',     label: 'Watermark-free invoice PDFs' },
  { id: 'unlimited_tds',          label: 'Unlimited TDS tracking' },
  { id: 'expense_tracker',        label: 'Expense tracker' },
];

const PLATFORMS = [
  { id: 'youtube',   label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'other',     label: 'Other' },
];

export default function RequestPremiumModal({ isOpen, onClose, isPending, onSubmitted }) {
  const toast = useToast();
  const [features, setFeatures] = useState([]);
  const [platform, setPlatform] = useState('youtube');
  const [followers, setFollowers] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id) => setFeatures(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  const submit = async (e) => {
    e.preventDefault();
    const followerCount = parseInt(followers, 10);
    if (features.length === 0) { toast.error('Pick at least one feature'); return; }
    if (!Number.isFinite(followerCount) || followerCount < 0) { toast.error('Enter your follower count'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/premium-requests', { features, platform, followerCount });
      onSubmitted?.(res.data?.request);
      toast.success('Request sent — we’ll email you once it’s approved');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not send request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request premium access">
      {isPending ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <Clock size={28} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', margin: 0 }}>
            Your request is pending review. We’ll email you as soon as your 28 days of Pro are unlocked.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Get 28 days of full Pro access, free. Tell us a little about you and we’ll review your request.
          </p>

          <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <legend style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Which features do you want?
            </legend>
            {FEATURE_OPTIONS.map(f => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-body)', cursor: 'pointer' }}>
                <input type="checkbox" checked={features.includes(f.id)} onChange={() => toggle(f.id)} />
                {f.label}
              </label>
            ))}
          </fieldset>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="premium-platform" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Main platform</label>
            <select
              id="premium-platform"
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}
            >
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          <Input
            id="premium-followers"
            label="Follower / subscriber count"
            type="number"
            max={LIMITS.FOLLOWERS}
            decimals={0}
            currency={false}
            value={followers}
            onChange={e => setFollowers(e.target.value)}
            placeholder="e.g. 120000"
          />

          <button
            type="submit"
            disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--accent)', color: 'var(--text-on-accent, #fff)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', fontFamily: 'inherit', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
          >
            <Check size={14} aria-hidden="true" />
            {submitting ? 'Sending…' : 'Request 28 days of Pro'}
          </button>
        </form>
      )}
    </Modal>
  );
}
