import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, ShoppingBag, Pencil } from 'lucide-react';
import api, { getErrorMessage } from '../utils/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { formatINR } from '../utils/formatINR.js';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import { SkeletonTableRow } from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PlanGate from '../components/ui/PlanGate.jsx';
import { CURRENT_FY, PREVIOUS_FY as PREV_FY } from '../utils/financialYear.js';
import { taxYearLabel } from '../utils/taxLabels.js';
import { readCache, writeCache } from '../utils/listCache.js';
import { uploadDocument, openDocument } from '../utils/documents.js';

const CATEGORIES = ['equipment', 'software', 'travel', 'props', 'marketing', 'team', 'subscription', 'other'];
const ASSET_CLASSES = [
  ['computer', 'Laptop / computer (40% a year)'],
  ['camera_equipment', 'Camera, lens, lights, mic (15% a year)'],
  ['furniture', 'Furniture, studio set-up (10% a year)'],
  ['vehicle', 'Vehicle (15% a year)'],
  ['other', 'Other equipment (15% a year)'],
];
const EMPTY_EXPENSE = () => ({ category: 'software', amount: '', description: '', expenseDate: format(new Date(), 'yyyy-MM-dd'), gstPaid: '', vendorGstin: '', isCapitalAsset: false, assetClass: 'camera_equipment', receiptFile: null });
const CAT_LABELS = { equipment: 'Equipment', software: 'Software', travel: 'Travel', props: 'Props', marketing: 'Marketing', team: 'Team', subscription: 'Subscription', other: 'Other' };
export default function ExpensesPage() {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fy, setFY] = useState(CURRENT_FY);
  const [addOpen, setAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [fy]);

  async function loadData() {
    // Show the last copy straight away, then refresh
    const cacheKey = `expenses:${fy}`;
    const cached = readCache(cacheKey);
    if (cached) { setExpenses(cached.list); setSummary(cached.summary); setLoading(false); }
    else setLoading(true);
    try {
      const [exp, sum] = await Promise.all([
        api.get('/expenses', { params: { fy } }),
        api.get('/expenses/summary', { params: { fy } }),
      ]);
      setExpenses(exp.data.expenses || []);
      setSummary(sum.data);
      writeCache(cacheKey, { list: exp.data.expenses || [], summary: sum.data });
    } catch (err) { if (!cached) toast.error(getErrorMessage(err, 'Failed to load expenses')); }
    finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.amount || !form.expenseDate) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      const receiptPath = form.receiptFile ? await uploadDocument(form.receiptFile, 'receipt') : undefined;
      await api.post('/expenses', {
        category: form.category, amount: parseFloat(form.amount), description: form.description || undefined, expenseDate: form.expenseDate,
        gstPaid: parseFloat(form.gstPaid) || 0,
        vendorGstin: form.vendorGstin.trim() || undefined,
        receiptPath,
        isCapitalAsset: form.isCapitalAsset,
        assetClass: form.isCapitalAsset ? form.assetClass : undefined,
      });
      toast.success('Expense logged');
      setAddOpen(false);
      setForm(EMPTY_EXPENSE());
      loadData();
    } catch (err) { toast.error(err?.response || !err?.message ? getErrorMessage(err, 'Failed to log expense') : err.message); }
    finally { setSaving(false); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!form.amount || !form.expenseDate) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      await api.put(`/expenses/${editingEntry.id}`, { category: form.category, amount: parseFloat(form.amount), description: form.description || undefined, expenseDate: form.expenseDate });
      toast.success('Expense updated');
      setEditingEntry(null);
      setForm(EMPTY_EXPENSE());
      loadData();
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to update expense')); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-6)', maxWidth: 900, width: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          
          <select value={fy} onChange={e => setFY(e.target.value)} style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
            <option value={CURRENT_FY}>{taxYearLabel(CURRENT_FY)}</option>
            <option value={PREV_FY}>{taxYearLabel(PREV_FY)}</option>
          </select>
        </div>
        <button onClick={() => setAddOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', border: 'none' }}>
          <Plus size={14} aria-hidden="true" /> Add Expense
        </button>
      </header>

      <PlanGate feature="expense_tracker">
      {summary && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Total Expenses</div>
            <div className="financial-number" style={{ fontSize: 'var(--text-xl)' }}>{formatINR(summary.total)}</div>
          </div>
          {Object.entries(summary.byCategory || {}).sort(([,a],[,b]) => b-a).map(([cat, amt]) => (
            <div key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-sm)' }}>
              <span style={{ color: 'var(--text-body)' }}>{CAT_LABELS[cat]}</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{formatINR(amt)}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{[1,2,3,4].map(i => <SkeletonTableRow key={i} cols={4} />)}</tbody>
          </table>
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No expenses logged yet"
          description="Track equipment, software, travel, and other business expenses. Legitimate deductions reduce your taxable income."
          actionLabel="+ Add Expense"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Category', 'Description', 'Amount', ''].map(h => (
                  <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{format(new Date(e.expense_date), 'd MMM yyyy')}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}><Badge variant="muted">{CAT_LABELS[e.category]}</Badge></td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{e.description || '—'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--danger-text)' }}>
                    {formatINR(e.amount)}
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--text-muted)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {Number(e.gst_paid) > 0 && <span>GST {formatINR(e.gst_paid)}</span>}
                      {e.is_capital_asset && <span>Asset · depreciated</span>}
                      {e.receipt_url && <button type="button" onClick={() => openDocument(e.receipt_url).catch(() => toast.error('Couldn’t open the receipt'))} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}>Receipt</button>}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <button onClick={() => { setEditingEntry(e); setForm({ ...EMPTY_EXPENSE(), category: e.category, amount: String(e.amount), description: e.description || '', expenseDate: e.expense_date }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }} title="Edit">
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Expense">
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="exp-cat" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Category</label>
            <select id="exp-cat" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <Input id="exp-amount" label="Amount (₹) *" type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} style={{ fontVariantNumeric: 'tabular-nums' }} />
          <Input id="exp-date" label="Date *" type="date" value={form.expenseDate} onChange={e => setForm(p => ({...p, expenseDate: e.target.value}))} />
          <Input id="exp-desc" label="Description" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Adobe Premiere Pro subscription" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input id="exp-gst" label="GST on the bill (₹)" type="number" value={form.gstPaid} onChange={e => setForm(p => ({...p, gstPaid: e.target.value}))} hint="Claimable as input tax credit if you're GST-registered" style={{ fontVariantNumeric: 'tabular-nums' }} />
            <Input id="exp-vendor" label="Seller's GSTIN" value={form.vendorGstin} onChange={e => setForm(p => ({...p, vendorGstin: e.target.value.toUpperCase().slice(0, 15)}))} placeholder="Optional" maxLength={15} />
          </div>
          <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isCapitalAsset} onChange={e => setForm(p => ({...p, isCapitalAsset: e.target.checked, category: e.target.checked ? 'equipment' : p.category}))} style={{ marginTop: 3 }} />
            <span>This is equipment I'll use for years
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Cameras and laptops are depreciated over several years instead of being deducted all at once.</span>
            </span>
          </label>
          {form.isCapitalAsset && (
            <select aria-label="Type of equipment" value={form.assetClass} onChange={e => setForm(p => ({...p, assetClass: e.target.value}))} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              {ASSET_CLASSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="exp-receipt" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Receipt (optional)</label>
            <input id="exp-receipt" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e => setForm(p => ({...p, receiptFile: e.target.files?.[0] || null}))} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }} />
          </div>
          <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            {saving ? 'Saving…' : 'Log Expense'}
          </button>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal isOpen={!!editingEntry} onClose={() => { setEditingEntry(null); setForm(EMPTY_EXPENSE()); }} title="Edit Expense">
        <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="edit-exp-cat" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Category</label>
            <select id="edit-exp-cat" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <Input id="edit-exp-amount" label="Amount (₹) *" type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} style={{ fontVariantNumeric: 'tabular-nums' }} />
          <Input id="edit-exp-date" label="Date *" type="date" value={form.expenseDate} onChange={e => setForm(p => ({...p, expenseDate: e.target.value}))} />
          <Input id="edit-exp-desc" label="Description" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
          <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </Modal>
      </PlanGate>
    </div>
  );
}
