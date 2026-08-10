import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, X, Briefcase } from 'lucide-react';
import api from '../utils/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { formatINR } from '../utils/formatINR.js';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import { SkeletonCard } from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const STATUSES = ['inquiry', 'negotiating', 'active', 'delivered', 'invoiced', 'paid', 'rejected'];
const STATUS_LABELS = { inquiry: 'Inquiry', negotiating: 'Negotiating', active: 'Active', delivered: 'Delivered', invoiced: 'Invoiced', paid: 'Paid', rejected: 'Rejected' };
const STATUS_COLORS = { inquiry: 'var(--status-inquiry)', negotiating: 'var(--status-negotiate)', active: 'var(--status-active)', delivered: 'var(--status-completed)', invoiced: 'var(--info)', paid: 'var(--status-paid)', rejected: 'var(--status-rejected)' };
const STATUS_VARIANT = { inquiry: 'info', negotiating: 'warning', active: 'info', delivered: 'success', invoiced: 'info', paid: 'success', rejected: 'muted' };

const EMPTY_FORM = { brandName: '', brandContactEmail: '', dealValue: '', status: 'inquiry', niche: '', deliverables: '', deadline: '', paymentDueDate: '', notes: '' };

export default function DealsPage() {
  const toast = useToast();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadDeals();
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  async function loadDeals() {
    setLoading(true);
    try {
      const res = await api.get('/deals');
      setDeals(res.data.deals || []);
    } catch { toast.error('Failed to load deals'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.brandName || !form.dealValue) { toast.error('Brand name and value are required'); return; }
    setSaving(true);
    try {
      await api.post('/deals', {
        brandName: form.brandName,
        brandContactEmail: form.brandContactEmail || undefined,
        dealValue: parseFloat(form.dealValue),
        status: form.status,
        niche: form.niche || undefined,
        deliverables: form.deliverables || undefined,
        deadline: form.deadline || undefined,
        paymentDueDate: form.paymentDueDate || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Deal created');
      setAddOpen(false);
      setForm(EMPTY_FORM);
      loadDeals();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to create deal'); }
    finally { setSaving(false); }
  }

  async function moveStatus(deal, newStatus) {
    try {
      await api.put(`/deals/${deal.id}`, { status: newStatus });
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: newStatus } : d));
    } catch { toast.error('Failed to update'); }
  }

  async function markPaid(deal) {
    try {
      await api.post(`/deals/${deal.id}/mark-paid`, {});
      toast.success('Deal marked paid — income logged');
      loadDeals();
    } catch { toast.error('Failed to mark paid'); }
  }

  async function deleteDeal(deal) {
    if (!window.confirm(`Delete deal with ${deal.brand_name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/deals/${deal.id}`);
      toast.success('Deal deleted');
      setSelectedDeal(null);
      loadDeals();
    } catch { toast.error('Failed to delete'); }
  }

  const totalPipeline = deals.filter(d => !['paid','rejected'].includes(d.status)).reduce((s, d) => s + Number(d.deal_value), 0);

  if (loading) return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', overflowX: 'auto', paddingBottom: 'var(--space-4)' }}>
        {[1,2,3,4].map(i => <SkeletonCard key={i} rows={3} style={{ minWidth: 220, width: 220 }} />)}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 'var(--space-6)', overflow: 'auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          
          {totalPipeline > 0 && <Badge variant="info" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalPipeline)} in pipeline</Badge>}
        </div>
        <button onClick={() => setAddOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', border: 'none' }}>
          <Plus size={14} aria-hidden="true" /> New Deal
        </button>
      </header>

      {deals.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No brand deals yet"
          description="Track from inquiry to payment. Never lose a deal in WhatsApp threads again."
          actionLabel="+ New Deal"
          onAction={() => setAddOpen(true)}
        />
      ) : isMobile ? (
        /* Mobile: list view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {deals.map(deal => (
            <div key={deal.id} onClick={() => setSelectedDeal(deal)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-base)', marginBottom: 2 }}>{deal.brand_name}</div>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(deal.deal_value)}</div>
                </div>
                <Badge variant={STATUS_VARIANT[deal.status]}>{STATUS_LABELS[deal.status]}</Badge>
              </div>
              {deal.deadline && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>Deadline: {format(new Date(deal.deadline + 'T00:00:00'), 'd MMM yyyy')}</div>}
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: Kanban */
        <div style={{ display: 'flex', gap: 'var(--space-4)', overflowX: 'auto', paddingBottom: 'var(--space-4)' }}>
          {STATUSES.map(status => {
            const col = deals.filter(d => d.status === status);
            return (
              <div key={status} style={{ minWidth: 220, width: 220, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', padding: '0 var(--space-1)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] }} aria-hidden="true" />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{STATUS_LABELS[status]}</span>
                  {col.length > 0 && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'auto' }}>{col.length}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {col.map(deal => (
                    <DealCard key={deal.id} deal={deal} onClick={() => setSelectedDeal(deal)} />
                  ))}
                  {col.length === 0 && (
                    <div style={{ padding: 'var(--space-4)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>No deals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Deal Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Brand Deal">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
          <Input id="deal-brand" label="Brand Name *" value={form.brandName} onChange={e => setForm(p => ({...p, brandName: e.target.value}))} placeholder="Mamaearth Pvt Ltd" />
          <Input id="deal-email" label="Brand Contact Email" type="email" value={form.brandContactEmail} onChange={e => setForm(p => ({...p, brandContactEmail: e.target.value}))} />
          <Input id="deal-value" label="Deal Value (₹) *" type="number" value={form.dealValue} onChange={e => setForm(p => ({...p, dealValue: e.target.value}))} style={{ fontVariantNumeric: 'tabular-nums' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="deal-status" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Status</label>
            <select id="deal-status" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              {STATUSES.filter(s => s !== 'paid' && s !== 'rejected').map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <Input id="deal-deadline" label="Deadline" type="date" value={form.deadline} onChange={e => setForm(p => ({...p, deadline: e.target.value}))} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="deal-deliverables" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Deliverables</label>
            <textarea id="deal-deliverables" value={form.deliverables} onChange={e => setForm(p => ({...p, deliverables: e.target.value}))} rows={2} placeholder="2 Instagram reels, 1 YouTube integration…" style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
          <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            {saving ? 'Creating…' : 'Create Deal'}
          </button>
        </form>
      </Modal>

      {/* Deal Detail Panel */}
      {selectedDeal && (
        <DealDetail deal={selectedDeal} onClose={() => setSelectedDeal(null)} onMove={moveStatus} onMarkPaid={markPaid} onDelete={deleteDeal} />
      )}
    </div>
  );
}

function DealCard({ deal, onClick }) {
  const daysInStage = Math.floor((new Date() - new Date(deal.updated_at || deal.created_at)) / 86400000);
  return (
    <div onClick={onClick} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', cursor: 'pointer', transition: 'border-color var(--duration-fast)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>{deal.brand_name}</div>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', marginBottom: 'var(--space-2)' }}>{formatINR(deal.deal_value)}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {deal.deadline ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(deal.deadline + 'T00:00:00'), 'd MMM')}</span> : <span />}
        {daysInStage > 14 && <span style={{ fontSize: 10, color: 'var(--warning-text)', fontWeight: 600 }}>{daysInStage}d in stage</span>}
      </div>
    </div>
  );
}

function DealDetail({ deal, onClose, onMove, onMarkPaid, onDelete }) {
  const nextStatus = { inquiry: 'negotiating', negotiating: 'active', active: 'delivered', delivered: 'invoiced', invoiced: 'paid' };
  const next = nextStatus[deal.status];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderLeft: '1px solid var(--border)', height: '100%', overflow: 'auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>{deal.brand_name}</h2>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(deal.deal_value)}</div>
          <Badge variant={STATUS_VARIANT[deal.status]} style={{ marginTop: 'var(--space-2)' }}>{STATUS_LABELS[deal.status]}</Badge>
        </div>

        {deal.brand_contact_email && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}><span style={{ color: 'var(--text-muted)' }}>Contact: </span>{deal.brand_contact_email}</div>}
        {deal.deadline && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}><span style={{ color: 'var(--text-muted)' }}>Deadline: </span>{format(new Date(deal.deadline + 'T00:00:00'), 'd MMM yyyy')}</div>}
        {deal.deliverables && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', whiteSpace: 'pre-wrap' }}><span style={{ color: 'var(--text-muted)' }}>Deliverables: </span>{deal.deliverables}</div>}
        {deal.notes && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', whiteSpace: 'pre-wrap' }}><span style={{ color: 'var(--text-muted)' }}>Notes: </span>{deal.notes}</div>}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {next && deal.status !== 'paid' && (
            <button onClick={() => onMove(deal, next)} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', border: 'none' }}>
              Move to {STATUS_LABELS[next]} →
            </button>
          )}
          {deal.status !== 'paid' && (
            <button onClick={() => onMarkPaid(deal)} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--success-dim)', color: 'var(--success-text)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
              Mark Paid + Log Income
            </button>
          )}
          <button onClick={() => onDelete(deal)} style={{ padding: 'var(--space-2) var(--space-4)', background: 'transparent', color: 'var(--danger-text)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', fontWeight: 500, fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            Delete Deal
          </button>
        </div>
      </div>
    </div>
  );
}
