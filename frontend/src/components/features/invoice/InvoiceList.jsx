import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, Pencil, Download, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle, Send, Copy } from 'lucide-react';
import Badge from '../../ui/Badge.jsx';
import { formatINR } from '../../../utils/formatINR.js';
import api from '../../../utils/api.js';
import { useToast } from '../../../hooks/useToast.jsx';

const STATUS_VARIANT = { draft: 'muted', sent: 'info', paid: 'success', overdue: 'danger' };

const COLS = [
  { key: 'invoice_number', label: 'Invoice #', sortable: true },
  { key: 'brand_name',     label: 'Brand',     sortable: true },
  { key: 'base_amount',    label: 'Taxable',   sortable: true },
  { key: 'gst_amount',     label: 'GST',       sortable: false },
  { key: 'total_amount',   label: 'Total',     sortable: true },
  { key: 'status',         label: 'Status',    sortable: true },
  { key: 'invoice_date',   label: 'Date',      sortable: true },
  { key: 'actions',        label: 'Actions',   sortable: false },
];

export default function InvoiceList({ invoices, loading, onDownload, onDelete, onRefresh, onMarkPaid, sortCol, sortDir, onSort }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [viewModalId, setViewModalId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [copyingId, setCopyingId] = useState(null);

  async function handleSend(inv) {
    if (!inv.brand_email) { toast.error('Add a brand email to this invoice before sending'); return; }
    setSendingId(inv.id);
    try {
      await api.post(`/invoices/${inv.id}/send`);
      toast.success(`Invoice sent to ${inv.brand_email}`);
      onRefresh?.();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to send invoice'); }
    finally { setSendingId(null); }
  }

  async function handleCopyPaymentLink(inv) {
    setCopyingId(inv.id);
    try {
      const res = await api.post(`/invoices/${inv.id}/payment-confirm-token`);
      await navigator.clipboard.writeText(res.data.url);
      toast.success('Payment confirmation link copied to clipboard');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to generate link'); }
    finally { setCopyingId(null); }
  }

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null;
    if (sortCol !== col.key) return <ChevronsUpDown size={11} style={{ color: 'var(--text-disabled)', marginLeft: 2 }} aria-hidden="true" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} style={{ color: 'var(--accent)', marginLeft: 2 }} aria-hidden="true" />
      : <ChevronDown size={11} style={{ color: 'var(--accent)', marginLeft: 2 }} aria-hidden="true" />;
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Loading invoices…</div>;
  }

  if (invoices.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-12)', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 'var(--space-3)' }} aria-hidden="true">📄</div>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>No invoices yet</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Create your first GST invoice for a brand deal.</p>
        <button onClick={() => navigate('/invoices/new')} style={{ padding: 'var(--space-2) var(--space-5)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          Create Invoice →
        </button>
      </div>
    );
  }

  // The invoice being viewed in the read-only modal
  const viewInv = viewModalId ? invoices.find(i => i.id === viewModalId) : null;

  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }} role="table">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                {COLS.map(col => (
                  <th key={col.key}
                    onClick={col.sortable ? () => onSort?.(col.key) : undefined}
                    style={{
                      padding: 'var(--space-3) var(--space-3)',
                      textAlign: col.key === 'actions' ? 'center' : 'left',
                      fontSize: 'var(--text-xs)', fontWeight: 600,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: sortCol === col.key ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {col.label}
                      <SortIcon col={col} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background var(--duration-fast)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: 'var(--space-3)', fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600 }}>
                    {inv.invoice_number}
                  </td>
                  <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.brand_name}
                  </td>
                  <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-body)' }}>
                    {formatINR(inv.base_amount)}
                  </td>
                  <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
                    {formatINR(inv.gst_amount)}
                  </td>
                  <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatINR(inv.total_amount)}
                  </td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <Badge variant={STATUS_VARIANT[inv.status] || 'muted'}>
                      {(inv.status || 'draft').charAt(0).toUpperCase() + (inv.status || 'draft').slice(1)}
                    </Badge>
                  </td>
                  <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {inv.invoice_date ? format(new Date(inv.invoice_date + (inv.invoice_date.includes('T') ? '' : 'T00:00:00')), 'd MMM yyyy') : '—'}
                  </td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      {/* VIEW */}
                      <ActionBtn icon={<Eye size={13}/>} label="View invoice" title="View"
                        onClick={e => { e.stopPropagation(); setViewModalId(inv.id); }} />
                      {/* EDIT — only draft */}
                      {inv.status === 'draft' && (
                        <ActionBtn icon={<Pencil size={13}/>} label="Edit invoice" title="Edit"
                          onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.id}/edit`); }} />
                      )}
                      {/* SEND TO BRAND */}
                      {['draft','sent'].includes(inv.status) && (
                        <ActionBtn icon={<Send size={13}/>} label={inv.brand_email ? `Send to ${inv.brand_email}` : 'Add brand email to enable sending'} title="Send"
                          onClick={e => { e.stopPropagation(); handleSend(inv); }}
                          disabled={sendingId === inv.id || !inv.brand_email} info />
                      )}
                      {/* PAYMENT CONFIRM LINK — sent or draft */}
                      {['draft','sent'].includes(inv.status) && (
                        <ActionBtn icon={<Copy size={13}/>} label="Copy payment confirmation link to send to brand" title="Payment Link"
                          onClick={e => { e.stopPropagation(); handleCopyPaymentLink(inv); }}
                          disabled={copyingId === inv.id} />
                      )}
                      {/* DUPLICATE */}
                      <ActionBtn icon={<Copy size={13} style={{ opacity: 0.7 }}/>} label="Duplicate invoice" title="Duplicate"
                        onClick={e => { e.stopPropagation(); navigate('/invoices/new', { state: { duplicate: inv } }); }} />
                      {/* MARK PAID */}
                      {['draft','sent'].includes(inv.status) && (
                        <ActionBtn icon={<CheckCircle size={13}/>} label="Mark as paid — logs TDS + income" title="Mark Paid"
                          onClick={e => { e.stopPropagation(); onMarkPaid?.(inv); }} success />
                      )}
                      {/* DOWNLOAD */}
                      <ActionBtn icon={<Download size={13}/>} label="Download PDF" title="PDF"
                        onClick={e => { e.stopPropagation(); onDownload(inv); }} accent />
                      {/* DELETE — only draft */}
                      {inv.status === 'draft' && (
                        <ActionBtn icon={<Trash2 size={13}/>} label="Delete invoice" title="Delete"
                          onClick={e => { e.stopPropagation(); onDelete(inv); }} danger />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View-only modal */}
      {viewInv && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}
          onClick={() => setViewModalId(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', overflow: 'auto', maxHeight: '90dvh', maxWidth: 600, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}>{viewInv.invoice_number}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{viewInv.brand_name} · {formatINR(viewInv.total_amount)}</div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {viewInv.status === 'draft' && (
                  <button onClick={() => { setViewModalId(null); navigate(`/invoices/${viewInv.id}/edit`); }}
                    style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Pencil size={13}/> Edit
                  </button>
                )}
                <button onClick={() => { setViewModalId(null); onDownload(viewInv); }}
                  style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit', color: '#fff', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Download size={13}/> PDF
                </button>
                <button onClick={() => setViewModalId(null)} aria-label="Close"
                  style={{ padding: 'var(--space-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                ['Invoice Number', viewInv.invoice_number],
                ['Brand', viewInv.brand_name],
                ['Brand GSTIN', viewInv.brand_gstin],
                ['Brand PAN', viewInv.brand_pan],
                ['Brand Email', viewInv.brand_email],
                ['Brand Phone', viewInv.brand_phone],
                ['Brand Address', viewInv.brand_address],
                ['Place of Supply', viewInv.place_of_supply ? `${viewInv.place_of_supply} (${viewInv.supply_type})` : null],
                ['Service Description', viewInv.service_description],
                ['SAC Code', viewInv.sac_code || '998399'],
                ['Taxable Value', formatINR(viewInv.base_amount)],
                ['GST Amount', formatINR(viewInv.gst_amount)],
                ['Total', formatINR(viewInv.total_amount)],
                ['Invoice Date', viewInv.invoice_date ? format(new Date(viewInv.invoice_date + 'T00:00:00'), 'd MMM yyyy') : null],
                ['Due Date', viewInv.due_date ? format(new Date(viewInv.due_date + 'T00:00:00'), 'd MMM yyyy') : null],
                ['Payment Terms', viewInv.payment_terms],
                ['Reverse Charge', viewInv.reverse_charge || 'No'],
                ['Status', viewInv.status],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-2)', gap: 'var(--space-4)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 120, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{v}</span>
                </div>
              ))}
              {viewInv.notes && (
                <div style={{ padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
                  <strong>Notes:</strong> {viewInv.notes}
                </div>
              )}

              {/* Bank Details */}
              {viewInv.include_bank_details && (
                <div style={{ padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                    Bank Details for Payment
                  </div>
                  {[
                    ['Account Holder', viewInv.account_holder_name],
                    ['Bank', viewInv.bank_name],
                    ['Account No.', viewInv.account_number],
                    ['IFSC Code', viewInv.ifsc_code],
                    ['UPI ID', viewInv.upi_id],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 'var(--space-4)', paddingBottom: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ minWidth: 110, color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{k}</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: ['Account No.','IFSC Code'].includes(k) ? 'monospace' : 'inherit' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Terms & Conditions */}
              {viewInv.include_terms && viewInv.terms_text && (
                <div style={{ padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                    Terms &amp; Conditions
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {viewInv.terms_text}
                  </p>
                </div>
              )}

              {/* Authorized Signatory */}
              {viewInv.include_signatory && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 'var(--space-2)' }}>
                  <div style={{ textAlign: 'center', minWidth: 180 }}>
                    {viewInv.signatory_image_url && (
                      <img src={viewInv.signatory_image_url} alt="Signature" style={{ height: 48, maxWidth: 160, objectFit: 'contain', marginBottom: 4, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fff', padding: 4 }} />
                    )}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        For {viewInv.seller_business_name || '—'}
                      </div>
                      <div style={{ marginTop: 2 }}>
                        Authorized Signatory{viewInv.signatory_name ? `: ${viewInv.signatory_name}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActionBtn({ icon, label, title, onClick, accent, danger, success, info, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} aria-label={label} title={title} disabled={disabled}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: danger ? 'var(--danger-dim)' : success ? 'var(--success-dim)' : accent ? 'var(--accent-dim)' : info ? 'var(--info-dim)' : 'var(--surface-3)',
        border: `1px solid ${danger ? 'var(--danger)' : success ? 'var(--success)' : accent ? 'var(--accent-glow)' : info ? 'var(--info)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        color: danger ? 'var(--danger-text)' : success ? 'var(--success-text)' : accent ? 'var(--accent)' : info ? 'var(--info-text)' : 'var(--text-body)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity var(--duration-fast)', flexShrink: 0,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.75'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '1'; }}
    >
      {icon}
    </button>
  );
}

