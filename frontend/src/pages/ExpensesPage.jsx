import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, ShoppingBag, Pencil } from 'lucide-react';
import api from '../utils/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { formatINR } from '../utils/formatINR.js';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import { SkeletonTableRow } from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PlanGate from '../components/ui/PlanGate.jsx';

const CATEGORIES = ['equipment', 'software', 'travel', 'props', 'marketing', 'team', 'subscription', 'other'];
const CAT_LABELS = { equipment: 'Equipment', software: 'Software', travel: 'Travel', props: 'Props', marketing: 'Marketing', team: 'Team', subscription: 'Subscription', other: 'Other' };
const CURRENT_FY = (() => { const n = new Date(), y = n.getFullYear(), m = n.getMonth()+1; return m>=4?`${y}-${String(y+1).slice(-2)}`:`${y-1}-${String(y).slice(-2)}`; })();
const PREV_FY = (() => { const n = new Date(), y = n.getFullYear(), m = n.getMonth()+1; const b = m>=4?y:y-1; return `${b-1}-${String(b).slice(-2)}`; })();

export default function ExpensesPage() {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fy, setFY] = useState(CURRENT_FY);
  const [addOpen, setAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState({ category: 'software', amount: '', description: '', expenseDate: format(new Date(), 'yyyy-MM-dd') });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [fy]);

  async function loadData() {
    setLoading(true);
    try {
      const [exp, sum] = await Promise.all([
        api.get('/expenses', { params: { fy } }),
        api.get('/expenses/summary', { params: { fy } }),
      ]);
      setExpenses(exp.data.expenses || []);
      setSummary(sum.data);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.amount || !form.expenseDate) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      await api.post('/expenses', { category: form.category, amount: parseFloat(form.amount), description: form.description || undefined, expenseDate: form.expenseDate });
      toast.success('Expense logged');
      setAddOpen(false);
      setForm({ category: 'software', amount: '', description: '', expenseDate: format(new Date(), 'yyyy-MM-dd') });
      loadData();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to log expense'); }
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
      setForm({ category: 'software', amount: '', description: '', expenseDate: format(new Date(), 'yyyy-MM-dd') });
      loadData();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update expense'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-6)', maxWidth: 900, width: '100%' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          
          <select value={fy} onChange={e => setFY(e.target.value)} style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
            <option value={CURRENT_FY}>FY {CURRENT_FY}</option>
            <option value={PREV_FY}>FY {PREV_FY}</option>
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
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--danger-text)' }}>{formatINR(e.amount)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <button onClick={() => { setEditingEntry(e); setForm({ category: e.category, amount: String(e.amount/100), description: e.description || '', expenseDate: e.expense_date }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }} title="Edit">
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
          <button type="submit" disabled={saving} style={{ padding: 'var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
            {saving ? 'Saving…' : 'Log Expense'}
          </button>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal isOpen={!!editingEntry} onClose={() => { setEditingEntry(null); setForm({ category: 'software', amount: '', description: '', expenseDate: format(new Date(), 'yyyy-MM-dd') }); }} title="Edit Expense">
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
