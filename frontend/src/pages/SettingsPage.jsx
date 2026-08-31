import { useState, useEffect, useCallback, useRef } from 'react';
import { Pencil, Trash2, Star, Plus, ChevronDown, ChevronUp, Check, Camera, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../hooks/useToast.jsx';
import api from '../utils/api.js';
import { openSubscriptionCheckout } from '../utils/razorpay.js';
import { PLAN_DISPLAY, PLAN_HIERARCHY } from '../utils/planConfig.js';

const SECTIONS = ['Profile', 'Tax Profile', 'Invoice Settings', 'Billing', 'Notifications', 'Security', 'Export', 'Integrations', 'Danger Zone'];

// ── Invoice Settings sub-components ──────────────────────────────────────────

function ExpandCard({ title, subtitle, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', background: open ? 'var(--surface-2)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', gap: 'var(--space-3)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
          </div>
          {badge && (
            <span style={{ padding: '1px 7px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function InvoiceSettingsSection({ user }) {
  const toast = useToast();
  const [settings, setSettings] = useState({ bankAccounts: [], termsProfiles: [], signatory: null, upiIds: [] });
  const [loading, setLoading] = useState(false);
  // Bank account form state
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBank, setEditingBank] = useState(null); // { id, ...fields } or null
  const [bankForm, setBankForm] = useState({ name: '', bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', isDefault: false });
  const [savingBank, setSavingBank] = useState(false);
  // Terms form state
  const [showTermsForm, setShowTermsForm] = useState(false);
  const [editingTerms, setEditingTerms] = useState(null);
  const [termsForm, setTermsForm] = useState({ name: '', termsText: '', isDefault: false });
  const [savingTerms, setSavingTerms] = useState(false);
  // Signatory form state
  const [showSignatoryForm, setShowSignatoryForm] = useState(false);
  const [signatoryForm, setSignatoryForm] = useState({ name: 'Primary', signatoryName: '', signatoryImageUrl: null });
  const [savingSignatory, setSavingSignatory] = useState(false);
  // UPI form state
  const [showUpiForm, setShowUpiForm] = useState(false);
  const [editingUpi, setEditingUpi] = useState(null);
  const [upiForm, setUpiForm] = useState({ name: '', upiId: '', scannerImageUrl: null, isDefault: false });
  const [savingUpi, setSavingUpi] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await api.get('/invoice-settings');
      const all = res.data.settings || [];
      setSettings({
        bankAccounts: all.filter(s => s.setting_type === 'bank_account'),
        termsProfiles: all.filter(s => s.setting_type === 'terms'),
        signatory: all.find(s => s.setting_type === 'signatory') || null,
        upiIds: all.filter(s => s.setting_type === 'upi'),
      });
    } catch { toast.error('Failed to load invoice settings'); }
    finally { setLoading(false); }
  }

  // ── Bank Accounts ──────────────────────────────────────────────────────────
  function startAddBank() {
    setEditingBank(null);
    setBankForm({ name: '', bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', isDefault: settings.bankAccounts.length === 0 });
    setShowBankForm(true);
  }
  function startEditBank(acct) {
    setEditingBank(acct);
    setBankForm({ name: acct.name, bankName: acct.bank_name || '', accountNumber: acct.account_number || '', ifscCode: acct.ifsc_code || '', accountHolderName: acct.account_holder_name || '', isDefault: acct.is_default });
    setShowBankForm(true);
  }

  async function saveBank() {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.ifscCode || !bankForm.accountHolderName) {
      toast.error('Bank name, account number, IFSC, and account holder name are required'); return;
    }
    setSavingBank(true);
    try {
      const payload = { settingType: 'bank_account', ...bankForm };
      if (editingBank) await api.put(`/invoice-settings/${editingBank.id}`, payload);
      else await api.post('/invoice-settings', payload);
      toast.success(editingBank ? 'Bank account updated' : 'Bank account added');
      setShowBankForm(false); setEditingBank(null);
      loadSettings();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to save'); }
    finally { setSavingBank(false); }
  }

  async function deleteBank(id) {
    if (!window.confirm('Delete this bank account?')) return;
    try { await api.delete(`/invoice-settings/${id}`); toast.success('Bank account deleted'); loadSettings(); }
    catch { toast.error('Failed to delete'); }
  }

  async function setDefaultBank(id) {
    try { await api.post(`/invoice-settings/${id}/set-default`); toast.success('Set as default'); loadSettings(); }
    catch { toast.error('Failed to set default'); }
  }

  // ── T&C Profiles ───────────────────────────────────────────────────────────
  function startAddTerms() {
    setEditingTerms(null);
    setTermsForm({ name: '', termsText: 'Payment due within 30 days.\nAll disputes subject to jurisdiction of Bengaluru courts.', isDefault: settings.termsProfiles.length === 0 });
    setShowTermsForm(true);
  }
  function startEditTerms(t) {
    setEditingTerms(t);
    setTermsForm({ name: t.name, termsText: t.terms_text || '', isDefault: t.is_default });
    setShowTermsForm(true);
  }

  async function saveTerms() {
    if (!termsForm.name || !termsForm.termsText) { toast.error('Name and terms text are required'); return; }
    setSavingTerms(true);
    try {
      const payload = { settingType: 'terms', ...termsForm };
      if (editingTerms) await api.put(`/invoice-settings/${editingTerms.id}`, payload);
      else await api.post('/invoice-settings', payload);
      toast.success(editingTerms ? 'T&C updated' : 'T&C profile added');
      setShowTermsForm(false); setEditingTerms(null);
      loadSettings();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to save'); }
    finally { setSavingTerms(false); }
  }

  async function deleteTerms(id) {
    if (!window.confirm('Delete this T&C profile?')) return;
    try { await api.delete(`/invoice-settings/${id}`); toast.success('T&C deleted'); loadSettings(); }
    catch { toast.error('Failed to delete'); }
  }

  async function setDefaultTerms(id) {
    try { await api.post(`/invoice-settings/${id}/set-default`); toast.success('Set as default'); loadSettings(); }
    catch { toast.error('Failed to set default'); }
  }

  // ── Signatory ──────────────────────────────────────────────────────────────
  function startEditSignatory() {
    const s = settings.signatory;
    setSignatoryForm({ name: s?.name || 'Primary', signatoryName: s?.signatory_name || user?.name || '', signatoryImageUrl: s?.signatory_image_url || null });
    setShowSignatoryForm(true);
  }

  async function saveSignatory() {
    if (!signatoryForm.signatoryName) { toast.error('Signatory name is required'); return; }
    setSavingSignatory(true);
    try {
      let imageUrl = signatoryForm.signatoryImageUrl;
      // If it's a base64 data URL, upload to storage first
      if (imageUrl && imageUrl.startsWith('data:')) {
        const mimeMatch = imageUrl.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch?.[1] || 'image/png';
        const res = await api.post('/upload/signature', { imageBase64: imageUrl, mimeType });
        imageUrl = res.data.url;
      }
      await api.post('/invoice-settings', {
        settingType: 'signatory',
        name: signatoryForm.name,
        signatoryName: signatoryForm.signatoryName,
        signatoryImageUrl: imageUrl || '',
      });
      toast.success('Signatory saved');
      setShowSignatoryForm(false);
      loadSettings();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to save signatory'); }
    finally { setSavingSignatory(false); }
  }

  if (loading) return <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Loading invoice settings…</p>;

  // ── UPI IDs ────────────────────────────────────────────────────────────────
  function startAddUpi() {
    setEditingUpi(null);
    setUpiForm({ name: '', upiId: '', scannerImageUrl: null, isDefault: settings.upiIds.length === 0 });
    setShowUpiForm(true);
  }
  function startEditUpi(u) {
    setEditingUpi(u);
    setUpiForm({ name: u.name, upiId: u.upi_id || '', scannerImageUrl: u.scanner_image_url || null, isDefault: u.is_default });
    setShowUpiForm(true);
  }
  async function saveUpi() {
    if (!upiForm.upiId) { toast.error('UPI ID is required'); return; }
    setSavingUpi(true);
    try {
      let scannerUrl = upiForm.scannerImageUrl;
      if (scannerUrl?.startsWith('data:')) {
        const parts = scannerUrl.split(',');
        const mimeType = parts[0].split(';')[0].split(':')[1];
        const res = await api.post('/upload/scanner', { imageBase64: parts[1], mimeType });
        scannerUrl = res.data.url;
      }
      const payload = { settingType: 'upi', name: upiForm.name || upiForm.upiId, upiId: upiForm.upiId, scannerImageUrl: scannerUrl || '', isDefault: upiForm.isDefault };
      if (editingUpi) await api.put(`/invoice-settings/${editingUpi.id}`, payload);
      else await api.post('/invoice-settings', payload);
      toast.success(editingUpi ? 'UPI updated' : 'UPI added');
      setShowUpiForm(false); setEditingUpi(null);
      loadSettings();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to save'); }
    finally { setSavingUpi(false); }
  }
  async function deleteUpi(id) {
    if (!window.confirm('Delete this UPI?')) return;
    try { await api.delete(`/invoice-settings/${id}`); toast.success('UPI deleted'); loadSettings(); }
    catch { toast.error('Failed to delete'); }
  }
  async function setDefaultUpi(id) {
    try { await api.post(`/invoice-settings/${id}/set-default`); toast.success('Set as default'); loadSettings(); }
    catch { toast.error('Failed to set default'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── Bank Accounts ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>Bank Accounts</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Up to 5 accounts. The default is pre-filled on new invoices.</p>
          </div>
          <button
            type="button"
            onClick={startAddBank}
            disabled={settings.bankAccounts.length >= 5}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-1) var(--space-3)', background: settings.bankAccounts.length >= 5 ? 'var(--border-2)' : 'var(--accent)', color: settings.bankAccounts.length >= 5 ? 'var(--text-disabled)' : '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: settings.bankAccounts.length >= 5 ? 'not-allowed' : 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'inherit' }}
          >
            <Plus size={12} /> Add ({settings.bankAccounts.length}/5)
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {settings.bankAccounts.map(acct => (
            <ExpandCard
              key={acct.id}
              title={acct.name}
              subtitle={`${acct.bank_name} · ••••${(acct.account_number || '').slice(-4)}`}
              badge={acct.is_default ? 'Default' : null}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                {[['Account Holder', acct.account_holder_name], ['Bank', acct.bank_name], ['Account No.', acct.account_number], ['IFSC', acct.ifsc_code], ['UPI ID', acct.upi_id]].filter(([,v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    <span style={{ minWidth: 110, color: 'var(--text-muted)', fontWeight: 500 }}>{k}</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: ['Account No.','IFSC'].includes(k) ? 'monospace' : 'inherit' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-2)' }}>
                  {!acct.is_default && (
                    <button onClick={() => setDefaultBank(acct.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                      <Star size={11} /> Set Default
                    </button>
                  )}
                  <button onClick={() => startEditBank(acct)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                    <Pencil size={11} /> Edit
                  </button>
                  <button onClick={() => deleteBank(acct.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger-text)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            </ExpandCard>
          ))}
          {settings.bankAccounts.length === 0 && !showBankForm && (
            <div style={{ padding: 'var(--space-5)', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No bank accounts yet. Add one to pre-fill invoices.
            </div>
          )}
        </div>

        {/* Bank form */}
        {showBankForm && (
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{editingBank ? 'Edit Bank Account' : 'Add Bank Account'}</h4>
            <Input id="bank-nickname" label="Nickname" value={bankForm.name} onChange={e => setBankForm(p => ({...p, name: e.target.value}))} placeholder="HDFC Primary" hint="A label for this account" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              <Input id="bank-bname" label="Bank Name *" value={bankForm.bankName} onChange={e => setBankForm(p => ({...p, bankName: e.target.value}))} placeholder="HDFC Bank" />
              <Input id="bank-holder" label="Account Holder Name *" value={bankForm.accountHolderName} onChange={e => setBankForm(p => ({...p, accountHolderName: e.target.value}))} placeholder="Your full name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              <Input id="bank-acctno" label="Account Number *" value={bankForm.accountNumber} onChange={e => setBankForm(p => ({...p, accountNumber: e.target.value}))} placeholder="1234567890" />
              <Input id="bank-ifsc" label="IFSC Code *" value={bankForm.ifscCode} onChange={e => setBankForm(p => ({...p, ifscCode: e.target.value.toUpperCase()}))} placeholder="HDFC0001234" maxLength={11} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={bankForm.isDefault} onChange={e => setBankForm(p => ({...p, isDefault: e.target.checked}))} style={{ accentColor: 'var(--accent)' }} />
              Set as default for new invoices
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button onClick={saveBank} disabled={savingBank} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {savingBank ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setShowBankForm(false); setEditingBank(null); }} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── UPI IDs (separate from bank) ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>UPI IDs</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Up to 5 UPI IDs with optional QR scanner images. Pre-fills UPI section on new invoices.</p>
          </div>
          <button type="button" onClick={startAddUpi} disabled={settings.upiIds.length >= 5}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: settings.upiIds.length >= 5 ? 'var(--border-2)' : 'var(--accent)', color: settings.upiIds.length >= 5 ? 'var(--text-disabled)' : '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: settings.upiIds.length >= 5 ? 'not-allowed' : 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'inherit' }}>
            <Plus size={12} /> Add ({settings.upiIds.length}/5)
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {settings.upiIds.map(u => (
            <ExpandCard key={u.id} title={u.name} subtitle={u.upi_id} badge={u.is_default ? 'Default' : null}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  {u.scanner_image_url && <img src={u.scanner_image_url} alt="QR" style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fff', padding: 4 }} />}
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{u.upi_id}</div>
                    {!u.scanner_image_url && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No QR image</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-2)' }}>
                  {!u.is_default && <button onClick={() => setDefaultUpi(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}><Star size={11} /> Set Default</button>}
                  <button onClick={() => startEditUpi(u)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}><Pencil size={11} /> Edit</button>
                  <button onClick={() => deleteUpi(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger-text)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}><Trash2 size={11} /> Delete</button>
                </div>
              </div>
            </ExpandCard>
          ))}
          {settings.upiIds.length === 0 && !showUpiForm && (
            <div style={{ padding: 'var(--space-5)', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No UPI IDs yet. Add one to include a QR code on invoices.
            </div>
          )}
        </div>
        {showUpiForm && (
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{editingUpi ? 'Edit UPI' : 'Add UPI ID'}</h4>
            <Input id="upi-label" label="Label (optional)" value={upiForm.name} onChange={e => setUpiForm(p => ({...p, name: e.target.value}))} placeholder="Primary UPI" hint="A nickname for this UPI ID" />
            <Input id="upi-id" label="UPI ID *" value={upiForm.upiId} onChange={e => setUpiForm(p => ({...p, upiId: e.target.value}))} placeholder="yourname@okicici" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>QR Scanner Image (optional)</label>
              {upiForm.scannerImageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <img src={upiForm.scannerImageUrl} alt="QR" style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff', padding: 4 }} />
                  <button type="button" onClick={() => setUpiForm(p => ({...p, scannerImageUrl: null}))} style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Remove</button>
                </div>
              ) : (
                <label style={{ cursor: 'pointer' }}>
                  <div style={{ padding: 'var(--space-4)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', background: 'var(--surface)' }}>
                    📷 Click to upload QR code image (PNG/JPG, max 500KB)
                  </div>
                  <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 512000) { alert('Image must be under 500KB'); return; }
                    const reader = new FileReader();
                    reader.onload = ev => setUpiForm(p => ({...p, scannerImageUrl: ev.target.result}));
                    reader.readAsDataURL(file);
                  }} />
                </label>
              )}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={upiForm.isDefault} onChange={e => setUpiForm(p => ({...p, isDefault: e.target.checked}))} style={{ accentColor: 'var(--accent)' }} />
              Set as default for new invoices
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button onClick={saveUpi} disabled={savingUpi} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {savingUpi ? 'Saving…' : 'Save UPI'}
              </button>
              <button onClick={() => { setShowUpiForm(false); setEditingUpi(null); }} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Terms & Conditions ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>Terms &amp; Conditions</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Named T&C profiles. The default is pre-filled on new invoices.</p>
          </div>
          <button type="button" onClick={startAddTerms} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'inherit' }}>
            <Plus size={12} /> Add T&C
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {settings.termsProfiles.map(t => (
            <ExpandCard key={t.id} title={t.name} subtitle={(t.terms_text || '').split('\n')[0].slice(0, 60) + '…'} badge={t.is_default ? 'Default' : null}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <pre style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', whiteSpace: 'pre-wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', maxHeight: 120, overflow: 'auto', fontFamily: 'inherit', lineHeight: 1.6 }}>
                  {t.terms_text}
                </pre>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {!t.is_default && (
                    <button onClick={() => setDefaultTerms(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                      <Star size={11} /> Set Default
                    </button>
                  )}
                  <button onClick={() => startEditTerms(t)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                    <Pencil size={11} /> Edit
                  </button>
                  <button onClick={() => deleteTerms(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger-text)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            </ExpandCard>
          ))}
          {settings.termsProfiles.length === 0 && !showTermsForm && (
            <div style={{ padding: 'var(--space-5)', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No T&C profiles yet.
            </div>
          )}
        </div>

        {showTermsForm && (
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{editingTerms ? 'Edit T&C Profile' : 'Add T&C Profile'}</h4>
            <Input id="tc-name" label="Profile Name" value={termsForm.name} onChange={e => setTermsForm(p => ({...p, name: e.target.value}))} placeholder="Standard T&C" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Terms Text *</label>
              <textarea value={termsForm.termsText} onChange={e => setTermsForm(p => ({...p, termsText: e.target.value}))} rows={5}
                style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={termsForm.isDefault} onChange={e => setTermsForm(p => ({...p, isDefault: e.target.checked}))} style={{ accentColor: 'var(--accent)' }} />
              Set as default for new invoices
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button onClick={saveTerms} disabled={savingTerms} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {savingTerms ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setShowTermsForm(false); setEditingTerms(null); }} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Authorized Signatory ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>Authorized Signatory</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>One signatory per account. Shows as a signature block on invoices.</p>
          </div>
          <button type="button" onClick={startEditSignatory} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'inherit' }}>
            <Pencil size={12} /> {settings.signatory ? 'Edit' : 'Add Signatory'}
          </button>
        </div>

        {settings.signatory ? (
          <div style={{ padding: 'var(--space-4)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {settings.signatory.signatory_image_url && (
              <img src={settings.signatory.signatory_image_url} alt="Signature" style={{ height: 48, maxWidth: 120, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fff', padding: 4 }} />
            )}
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{settings.signatory.signatory_name}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Authorized Signatory · {settings.signatory.signatory_image_url ? 'Signature image uploaded' : 'No signature image'}</div>
            </div>
          </div>
        ) : !showSignatoryForm && (
          <div style={{ padding: 'var(--space-5)', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No signatory configured yet.
          </div>
        )}

        {showSignatoryForm && (
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Authorized Signatory</h4>
            <Input id="sig-name" label="Signatory Name *" value={signatoryForm.signatoryName} onChange={e => setSignatoryForm(p => ({...p, signatoryName: e.target.value}))} placeholder="Your Name" hint="Name printed under the signature line" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Signature Image (optional)</label>
              {signatoryForm.signatoryImageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <img src={signatoryForm.signatoryImageUrl} alt="Signature" style={{ height: 48, maxWidth: 160, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff', padding: 4 }} />
                  <button type="button" onClick={() => setSignatoryForm(p => ({...p, signatoryImageUrl: null}))} style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                    Remove
                  </button>
                </div>
              ) : (
                <label style={{ cursor: 'pointer' }}>
                  <div style={{ padding: 'var(--space-4)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', background: 'var(--surface)' }}>
                    📷 Click to upload signature image (PNG/JPG, max 500KB)
                  </div>
                  <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 512000) { alert('Image must be under 500KB'); return; }
                    const reader = new FileReader();
                    reader.onload = ev => setSignatoryForm(p => ({...p, signatoryImageUrl: ev.target.result}));
                    reader.readAsDataURL(file);
                  }} />
                </label>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Uploaded to secure cloud storage. Use a white/transparent background.</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button onClick={saveSignatory} disabled={savingSignatory} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {savingSignatory ? 'Saving…' : 'Save Signatory'}
              </button>
              <button onClick={() => setShowSignatoryForm(false)} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Billing Section ───────────────────────────────────────────────────────────

const UPGRADE_FEATURES = {
  starter:  ['Unlimited invoices (clean PDF)', 'All 7 invoice templates', 'Unlimited TDS tracking', 'Full compliance calendar + email reminders', 'Expense tracker'],
  pro:      ['Everything in Starter', 'Advance tax calculator (both regimes)', 'Income & P&L dashboard', 'CA export (ITR-ready PDF + CSV)'],
  business: ['Everything in Pro', 'Up to 5 creator seats', 'White-label invoices (no branding)', 'Priority chat support (4hr response)'],
};

function BillingSection({ user, onPlanChange }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [annual, setAnnual] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'cancel'|'downgrade'|'change', targetPlan? }
  const toast = useToast();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/payments/status');
      setStatus(res.data);
    } catch {
      // Use user data as fallback
      setStatus({ plan: user?.plan, trial_ends_at: user?.trial_ends_at, subscription_ends_at: null });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const currentPlan = status?.plan || user?.plan || 'basic';
  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;

  // After the user authorizes payment, the plan is activated by the Razorpay
  // `subscription.charged` webhook — which can lag a few seconds. Re-check status
  // a handful of times so the UI reflects the new plan without a manual refresh.
  const pollForActivation = useCallback(async (tries = 0) => {
    try {
      const res = await api.get('/payments/status');
      setStatus(res.data);
      if (['starter', 'pro', 'business'].includes(res.data?.plan)) {
        onPlanChange?.();
        return true;
      }
    } catch { /* keep polling */ }
    if (tries >= 4) return false;
    await new Promise(r => setTimeout(r, 2500));
    return pollForActivation(tries + 1);
  }, [onPlanChange]);

  const handleUpgrade = async (targetPlan) => {
    setActionLoading(targetPlan);
    setConfirmModal(null);
    const d = PLAN_DISPLAY[targetPlan];
    const isPaidNow = ['starter', 'pro', 'business'].includes(currentPlan);

    try {
      // 1. Ask the backend to create (or switch to) the Razorpay subscription.
      //    Both endpoints return { subscriptionId } for the checkout step.
      const endpoint = isPaidNow && currentPlan !== targetPlan
        ? '/payments/change-plan'
        : '/payments/create-subscription';
      const res = await api.post(endpoint, { plan: targetPlan, period: 'monthly' });
      const subscriptionId = res.data?.subscriptionId;

      // change-plan may take effect next cycle without a fresh authorization step
      if (!subscriptionId) {
        toast.success(res.data?.message || `Plan change to ${d?.name} initiated. Takes effect next billing cycle.`);
        await fetchStatus();
        onPlanChange?.();
        setActionLoading('');
        return;
      }

      // 2. Open Razorpay Checkout to authorize the subscription.
      await openSubscriptionCheckout({
        subscriptionId,
        planName: d?.name || targetPlan,
        amount: d?.price || 0,
        user,
        onSuccess: async () => {
          toast.info('Payment authorized — activating your plan…');
          const activated = await pollForActivation();
          toast.success(
            activated
              ? `You're now on the ${d?.name} plan.`
              : 'Payment received. Your plan will activate in a moment — refresh if it doesn\'t update.'
          );
          await fetchStatus();
          onPlanChange?.();
          setActionLoading('');
        },
        onDismiss: () => {
          toast.error('Payment cancelled — your plan was not changed.');
          setActionLoading('');
        },
        onError: (msg) => {
          toast.error(msg);
          setActionLoading('');
        },
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to start the upgrade. Please try again.');
      setActionLoading('');
    }
  };

  const handleCancel = async () => {
    setActionLoading('cancel');
    try {
      await api.post('/payments/cancel');
      toast.success('Subscription will cancel at end of billing period.');
      await fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading('');
      setConfirmModal(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading('reactivate');
    try {
      await api.post('/payments/reactivate');
      toast.success('Subscription reactivated successfully.');
      await fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reactivate');
    } finally {
      setActionLoading('');
    }
  };

  const trialDaysLeft = () => {
    if (!status?.trial_ends_at) return 0;
    return Math.max(0, Math.ceil((new Date(status.trial_ends_at) - new Date()) / 86400000));
  };

  const isTrialActive = currentPlan === 'trial' && trialDaysLeft() > 0;

  const planStatusText = () => {
    if (isTrialActive) return `Trial · ${trialDaysLeft()} days remaining`;
    if (currentPlan === 'basic') return 'Basic plan · Limited access';
    if (status?.subscription_ends_at) {
      const d = new Date(status.subscription_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return `Active · renews ${d}`;
    }
    return 'Active';
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Loading billing info…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Card 1 — Current Plan Status */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {PLAN_DISPLAY[currentPlan]?.name || 'Basic'} Plan
              </span>
              <span style={{ padding: '2px 10px', background: isTrialActive ? 'rgba(232,146,26,0.15)' : 'var(--surface-2)', color: isTrialActive ? 'var(--accent)' : 'var(--text-muted)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {planStatusText()}
              </span>
            </div>
            {PLAN_DISPLAY[currentPlan]?.price > 0 && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                ₹{PLAN_DISPLAY[currentPlan].price.toLocaleString('en-IN')}/month · billed monthly
              </p>
            )}
            {isTrialActive && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600, marginTop: 'var(--space-2)' }}>
                ⚠ Upgrade before your trial ends to keep access to all features
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {['starter', 'pro', 'business'].includes(currentPlan) && (
              <button
                onClick={() => setConfirmModal({ type: 'cancel' })}
                disabled={actionLoading === 'cancel'}
                style={{ padding: 'var(--space-2) var(--space-4)', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger-text, #ef4444)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 }}
              >
                Cancel subscription
              </button>
            )}
            {status?.subscription_ends_at && !['starter', 'pro', 'business'].includes(currentPlan) && (
              <button
                onClick={handleReactivate}
                disabled={actionLoading === 'reactivate'}
                style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 }}
              >
                {actionLoading === 'reactivate' ? 'Reactivating…' : 'Reactivate'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card 2 — Choose/Change Plan */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {['starter', 'pro', 'business'].includes(currentPlan) ? 'Change Plan' : 'Choose a Plan'}
          </h3>
          {/* Monthly / Annual toggle — annual billing not wired to Razorpay yet (monthly plans only) */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: 3, gap: 2 }}>
            {[{ label: 'Monthly', val: false, disabled: false }, { label: 'Annual · soon', val: true, disabled: true }].map(opt => (
              <button
                key={String(opt.val)}
                onClick={() => { if (!opt.disabled) setAnnual(opt.val); }}
                disabled={opt.disabled}
                title={opt.disabled ? 'Annual billing is coming soon' : undefined}
                style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: 'var(--text-xs)', border: 'none', cursor: opt.disabled ? 'not-allowed' : 'pointer', background: annual === opt.val ? 'var(--accent)' : 'transparent', color: annual === opt.val ? '#fff' : 'var(--text-muted)', opacity: opt.disabled ? 0.45 : 1, fontFamily: 'inherit' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          {['starter', 'pro', 'business'].map(plan => {
            const d = PLAN_DISPLAY[plan];
            const price = annual ? d.annualPrice : d.price;
            const targetLevel = PLAN_HIERARCHY[plan] ?? 0;
            const isCurrentPlan = plan === currentPlan;
            const isUpgrade = targetLevel > currentLevel;

            return (
              <div key={plan} style={{ border: `1px solid ${isCurrentPlan ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative' }}>
                {plan === 'pro' && !isCurrentPlan && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', padding: '2px 12px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Most Popular
                  </div>
                )}
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>{d.name}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-1)' }}>
                    <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>₹{price.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/month</span>
                  </div>
                  {annual && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--success-text, #22c55e)', fontWeight: 600 }}>Save ₹{((d.price - d.annualPrice) * 12).toLocaleString('en-IN')}/year</p>}
                </div>
                <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', listStyle: 'none', padding: 0, margin: 0 }}>
                  {(UPGRADE_FEATURES[plan] || []).map(f => (
                    <li key={f} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--success, #22c55e)', flexShrink: 0, marginTop: 1 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                {isCurrentPlan ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-2)', background: 'rgba(232,146,26,0.1)', color: 'var(--accent)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => isUpgrade ? handleUpgrade(plan) : setConfirmModal({ type: 'downgrade', targetPlan: plan })}
                    disabled={!!actionLoading}
                    style={{ padding: 'var(--space-2)', background: isUpgrade ? 'var(--accent)' : 'transparent', color: isUpgrade ? '#fff' : 'var(--text-muted)', border: `1px solid ${isUpgrade ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, fontFamily: 'inherit' }}
                  >
                    {actionLoading === plan ? 'Processing…' : isUpgrade ? `Upgrade to ${d.name} →` : `Downgrade to ${d.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          <ShieldCheck size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Payments are processed securely by Razorpay. Billed monthly in INR · cancel anytime.
          </span>
        </div>
      </div>

      {/* Card 3 — Payment Method */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>Payment Method</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {status?.subscription_id
              ? 'Payment method on file via Razorpay.'
              : 'No payment method on file.'}
          </p>
          {status?.subscription_id && (
            <a
              href="https://payments.razorpay.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
            >
              Update payment method →
            </a>
          )}
        </div>
      </div>

      {/* Confirm Modal for cancel/downgrade */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-4)' }}
          onClick={() => setConfirmModal(null)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', maxWidth: 400, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
              {confirmModal.type === 'cancel' ? 'Cancel Subscription?' : `Downgrade to ${PLAN_DISPLAY[confirmModal.targetPlan]?.name}?`}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 'var(--space-5)' }}>
              {confirmModal.type === 'cancel'
                ? `Your ${PLAN_DISPLAY[currentPlan]?.name} plan will stay active until the end of your billing period. After that, your account switches to the Free plan. Your existing data remains accessible — you just won't be able to add new records beyond Free limits.`
                : `You will lose access to ${PLAN_DISPLAY[currentPlan]?.name} features. The change takes effect at the next billing cycle.`}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-body)', fontFamily: 'inherit' }}>
                Keep my subscription
              </button>
              <button
                onClick={confirmModal.type === 'cancel' ? handleCancel : () => handleUpgrade(confirmModal.targetPlan)}
                disabled={!!actionLoading}
                style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--danger, #ef4444)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}
              >
                {confirmModal.type === 'cancel' ? 'Cancel subscription' : 'Confirm downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Social Links Section ──────────────────────────────────────────────────────
function SocialLinksSection({ user, onSave }) {
  const PLATFORMS = [
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourchannel' },
    { key: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/@yourchannel' },
    { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/yourpage' },
    { key: 'x',         label: 'X (Twitter)', placeholder: 'https://x.com/yourhandle' },
    { key: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@yourhandle' },
    { key: 'snapchat',  label: 'Snapchat',  placeholder: 'https://snapchat.com/add/yourhandle' },
    { key: 'linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/in/yourprofile' },
    { key: 'website',   label: 'Website',   placeholder: 'https://yourwebsite.com' },
  ];
  const [links, setLinks] = useState(user?.social_links || {});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { setLinks(user?.social_links || {}); }, [user?.social_links]);

  async function handleSave() {
    setSaving(true);
    try { await onSave(links); toast.success('Social links saved'); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>Social Profiles</h3>
        <button onClick={handleSave} disabled={saving} style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        {PLATFORMS.map(p => (
          <div key={p.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)' }}>{p.label}</label>
            <input
              type="url"
              value={links[p.key] || ''}
              onChange={e => setLinks(l => ({ ...l, [p.key]: e.target.value }))}
              placeholder={p.placeholder}
              style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Notifications Section ─────────────────────────────────────────────────────
function NotificationsSection() {
  const toast = useToast();
  const [prefs, setPrefs] = useState({ email_enabled: true, marketing_emails: true, alert_days_before: 14, gst_filing_alerts: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/notifications/preferences').then(r => { setPrefs(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function save(updates) {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    setSaving(true);
    try {
      await api.put('/notifications/preferences', updates);
      toast.success('Notification preferences saved');
    } catch { toast.error('Failed to save preferences'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-4)' }}>Loading…</div>;

  const Toggle = ({ label, desc, checked, onChange }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--space-4) 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      <label style={{ cursor: 'pointer', position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
      </label>
    </div>
  );

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
      <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>Notifications</h2>
      <Toggle label="Email reminders" desc="Receive advance tax deadline alerts and compliance reminders" checked={prefs.email_enabled} onChange={v => save({ email_enabled: v })} />
      <Toggle label="Marketing emails" desc="Product updates, new features, and tax tips for creators" checked={prefs.marketing_emails} onChange={v => save({ marketing_emails: v })} />
      <Toggle label="GST filing alerts" desc="Reminders for GSTR-1/3B filing deadlines" checked={prefs.gst_filing_alerts} onChange={v => save({ gst_filing_alerts: v })} />
      <div style={{ padding: 'var(--space-4) 0' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Remind me before advance tax deadline</div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[2, 7, 14].map(d => (
            <button key={d} onClick={() => save({ alert_days_before: d })} style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', border: `1px solid ${prefs.alert_days_before === d ? 'var(--accent)' : 'var(--border)'}`, background: prefs.alert_days_before === d ? 'var(--accent-dim)' : 'transparent', color: prefs.alert_days_before === d ? 'var(--accent)' : 'var(--text-body)', fontWeight: prefs.alert_days_before === d ? 700 : 400, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {d} days before
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Security Section ──────────────────────────────────────────────────────────
function SecuritySection() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const pwdReqs = {
    length: form.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(form.newPassword),
    lowercase: /[a-z]/.test(form.newPassword),
    special: /[^A-Za-z0-9]/.test(form.newPassword),
  };
  const pwdValid = Object.values(pwdReqs).every(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pwdValid) { setErrors({ newPassword: 'Password does not meet all requirements' }); return; }
    if (form.newPassword !== form.confirmPassword) { setErrors({ confirmPassword: 'Passwords do not match' }); return; }
    setErrors({});
    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setErrors({ currentPassword: err?.response?.data?.message || 'Failed to change password' });
    } finally { setSaving(false); }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
      <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-5)' }}>Security</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 400 }} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor="cur-pwd" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Current password</label>
          <div style={{ position: 'relative' }}>
            <input id="cur-pwd" type={showCurrent ? 'text' : 'password'} value={form.currentPassword} onChange={e => setForm(p => ({...p, currentPassword: e.target.value}))} style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: `1px solid ${errors.currentPassword ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', outline: 'none', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowCurrent(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>{showCurrent ? 'Hide' : 'Show'}</button>
          </div>
          {errors.currentPassword && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)' }}>{errors.currentPassword}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor="new-pwd" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>New password</label>
          <div style={{ position: 'relative' }}>
            <input id="new-pwd" type={showNew ? 'text' : 'password'} value={form.newPassword} onChange={e => setForm(p => ({...p, newPassword: e.target.value}))} style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: `1px solid ${errors.newPassword ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', outline: 'none', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowNew(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>{showNew ? 'Hide' : 'Show'}</button>
          </div>
          {form.newPassword && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
              {Object.entries({ length: '8+ characters', uppercase: 'Uppercase', lowercase: 'Lowercase', special: 'Special character' }).map(([k, l]) => (
                <div key={k} style={{ fontSize: 12, color: pwdReqs[k] ? 'var(--success-text)' : 'var(--text-muted)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  <span style={{ opacity: pwdReqs[k] ? 1 : 0.3 }}>✓</span> {l}
                </div>
              ))}
            </div>
          )}
        </div>
        <Input id="confirm-pwd" label="Confirm new password" type="password" value={form.confirmPassword} onChange={e => setForm(p => ({...p, confirmPassword: e.target.value}))} error={errors.confirmPassword} />
        <button type="submit" disabled={saving || !form.currentPassword || !pwdValid} style={{ padding: 'var(--space-2) var(--space-4)', background: (!saving && form.currentPassword && pwdValid) ? 'var(--accent)' : 'var(--border-2)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: (!saving && form.currentPassword && pwdValid) ? 'pointer' : 'not-allowed', fontFamily: 'inherit', alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </div>
  );
}

// ── Export Section ────────────────────────────────────────────────────────────
function ExportSection({ user }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const currentFY = (() => { const n = new Date(), y = n.getFullYear(), m = n.getMonth()+1; return m>=4?`${y}-${String(y+1).slice(-2)}`:`${y-1}-${String(y).slice(-2)}`; })();
  const prevFY = (() => { const n = new Date(), y = n.getFullYear(), m = n.getMonth()+1; const b = m>=4?y:y-1; return `${b-1}-${String(b).slice(-2)}`; })();
  const [selectedFY, setSelectedFY] = useState(currentFY);

  const isPro = user && ['pro', 'business', 'trial'].includes(user.plan);

  async function download() {
    setDownloading(true);
    try {
      const res = await api.get(`/export/annual?fy=${selectedFY}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kcreatio-${selectedFY}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Export failed. Ensure you have a Pro plan.');
    } finally { setDownloading(false); }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
      <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>CA Export</h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
        Download a ZIP file with all invoices, TDS records, income, expenses, and a P&amp;L summary — formatted for your CA's ITR-3/ITR-4 filing.
      </p>
      {!isPro && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--warning-dim)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--warning-text)', marginBottom: 'var(--space-4)' }}>
          CA Export is a Pro plan feature. Upgrade to download your annual summary.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <select value={selectedFY} onChange={e => setSelectedFY(e.target.value)} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
          <option value={currentFY}>FY {currentFY}</option>
          <option value={prevFY}>FY {prevFY}</option>
        </select>
        <button onClick={download} disabled={downloading || !isPro} style={{ padding: 'var(--space-2) var(--space-4)', background: isPro && !downloading ? 'var(--accent)' : 'var(--border-2)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: isPro && !downloading ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
          {downloading ? 'Downloading…' : '↓ Download Annual Summary'}
        </button>
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
        Includes: invoices.csv · tds.csv · income.csv · expenses.csv · summary.txt
      </p>
    </div>
  );
}

// ── Integrations Section ──────────────────────────────────────────────────────
function IntegrationsSection({ user, onRefresh }) {
  const toast = useToast();
  const [disconnecting, setDisconnecting] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScanLabel, setLastScanLabel] = useState('');
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
  const backendBase = apiBase.replace('/api/v1', '');

  const gmailConnected = !!user?.gmail_connected_email;
  const isProPlus = ['pro', 'business', 'trial'].includes(user?.plan);

  // Load notification prefs (for auto-apply settings)
  useEffect(() => {
    api.get('/notifications/preferences').then(r => setPrefs(r.data)).catch(() => {});
  }, []);

  // Update last scan label
  useEffect(() => {
    if (!user?.gmail_last_scan_at) return;
    const update = () => {
      const d = new Date(user.gmail_last_scan_at);
      const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
      setLastScanLabel(
        mins < 1 ? 'just now'
        : mins < 60 ? `${mins}m ago`
        : `${Math.floor(mins / 60)}h ago`
      );
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [user?.gmail_last_scan_at]);

  async function disconnectGmail() {
    setDisconnecting(true);
    try {
      await api.delete('/auth/gmail/disconnect');
      toast.success('Gmail disconnected');
      onRefresh();
    } catch { toast.error('Failed to disconnect Gmail'); }
    finally { setDisconnecting(false); }
  }

  async function handleScanNow() {
    setScanning(true);
    try {
      const res = await api.post('/email-detections/scan-now');
      toast.success(`Scan complete — ${res.data.new_detections} new items found`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  async function savePrefs(updates) {
    setSavingPrefs(true);
    try {
      const res = await api.put('/notifications/preferences', updates);
      setPrefs(res.data);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSavingPrefs(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Gmail integration card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>Gmail</span>
              {gmailConnected && (
                <span style={{ padding: '1px 7px', background: 'var(--success-dim)', color: 'var(--success-text)', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700 }}>CONNECTED</span>
              )}
            </div>
            {gmailConnected ? (
              <div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>
                  Connected as <strong style={{ color: 'var(--text-body)' }}>{user.gmail_connected_email}</strong>
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Invoices are sent from your Gmail · Smart Inbox scans for payments, deals, and TDS automatically
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Connect Gmail to send invoices from your own email address and automatically detect brand payments, deal confirmations, and TDS deductions in your inbox.
              </p>
            )}
          </div>
          {gmailConnected ? (
            <button onClick={disconnectGmail} disabled={disconnecting} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <a href={`${backendBase}/api/v1/auth/gmail/connect`} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Connect Gmail
            </a>
          )}
        </div>
      </div>

      {/* Smart Inbox Settings — only shown when Gmail connected */}
      {gmailConnected && prefs && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Smart Inbox Settings
          </h3>

          {/* Last scanned + manual scan */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Last scanned: <strong style={{ color: 'var(--text-secondary)' }}>{lastScanLabel || 'Never'}</strong>
            </span>
            <button
              onClick={handleScanNow}
              disabled={scanning}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
                background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {scanning ? 'Scanning…' : 'Scan now'}
            </button>
          </div>

          {/* Auto-apply toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Auto-apply mode</span>
                  {!isProPlus && (
                    <span style={{ padding: '1px 6px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700 }}>PRO</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  When ON, high-confidence detections are applied automatically without your review. Only recommended after you've used the inbox for a few weeks and trust our detection.
                </p>
              </div>
              <button
                disabled={!isProPlus || savingPrefs}
                onClick={() => isProPlus && savePrefs({ gmail_auto_apply: !prefs.gmail_auto_apply })}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: isProPlus ? 'pointer' : 'not-allowed',
                  background: prefs.gmail_auto_apply && isProPlus ? 'var(--accent)' : 'var(--border)',
                  position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                  opacity: !isProPlus ? 0.5 : 1,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: prefs.gmail_auto_apply && isProPlus ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>

            {/* Confidence threshold — shown only when auto-apply is on */}
            {prefs.gmail_auto_apply && isProPlus && (
              <div style={{ paddingLeft: 'var(--space-3)', borderLeft: '2px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Confidence threshold</span>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Only auto-apply when we're this confident</p>
                  </div>
                  <select
                    value={String(prefs.gmail_auto_apply_threshold)}
                    onChange={e => savePrefs({ gmail_auto_apply_threshold: parseFloat(e.target.value) })}
                    style={{ padding: '5px 8px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12 }}
                  >
                    <option value="0.95">95% — Very strict</option>
                    <option value="0.90">90% — Strict (Recommended)</option>
                    <option value="0.80">80% — Balanced</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google login integration */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>Google</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {user?.google_id ? 'Your Google account is linked for sign-in' : 'Link Google for one-click sign-in'}
            </p>
          </div>
          {user?.google_id ? (
            <span style={{ padding: '1px 7px', background: 'var(--success-dim)', color: 'var(--success-text)', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700 }}>LINKED</span>
          ) : (
            <a href={`${backendBase}/api/v1/auth/google`} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-body)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, textDecoration: 'none' }}>
              Link Google
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, fetchUser } = useAuth();
  const toast = useToast();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('Profile');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Personal card state
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Business card state
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    business_name: user?.business_name || '',
    gstin: user?.gstin || '',
    pan: user?.pan || '',
    business_address: user?.business_address || '',
    state_code: user?.state_code || '',
    invoice_prefix: user?.invoice_prefix || 'INV',
  });
  const [savingBusiness, setSavingBusiness] = useState(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  // Refresh user data on mount
  useEffect(() => { fetchUser(); }, []);

  // Sync forms when user context updates
  useEffect(() => {
    if (user) {
      setPersonalForm({ name: user.name || '', phone: user.phone || '' });
      setBusinessForm({
        business_name: user.business_name || '',
        gstin: user.gstin || '',
        pan: user.pan || '',
        business_address: user.business_address || '',
        state_code: user.state_code || '',
        invoice_prefix: user.invoice_prefix || 'INV',
      });
    }
  }, [user]);

  const savePersonal = async () => {
    setSavingPersonal(true);
    try {
      await api.put('/auth/profile', personalForm);
      await fetchUser();
      toast.success('Personal info updated');
      setEditingPersonal(false);
    } catch { toast.error('Failed to save'); }
    finally { setSavingPersonal(false); }
  };

  const saveBusiness = async () => {
    setSavingBusiness(true);
    try {
      await api.put('/auth/profile', businessForm);
      await fetchUser();
      toast.success('Business info updated');
      setEditingBusiness(false);
    } catch { toast.error('Failed to save'); }
    finally { setSavingBusiness(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2097152) { toast.error('Avatar must be under 2MB'); return; }
    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        const mimeType = dataUrl.split(';')[0].split(':')[1];
        const base64 = dataUrl.split(',')[1];
        const res = await api.post('/auth/avatar', { imageBase64: base64, mimeType });
        await fetchUser();
        toast.success('Avatar updated');
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch { toast.error('Failed to upload avatar'); setUploadingAvatar(false); }
  };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'AU';
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

  // Field display row helper
  const FieldRow = ({ label, value }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{value || '—'}</div>
    </div>
  );

  // Card header helper
  const CardHeader = ({ title, onEdit, isEditing }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}>
      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
      {!isEditing && (
        <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 'var(--space-1) var(--space-3)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Pencil size={11} /> Edit
        </button>
      )}
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-6)', maxWidth: 1100, width: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
      {/* Section nav */}
      {isMobile ? (
        /* Mobile: horizontal scrollable tab strip */
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 'var(--space-2)',
          paddingBottom: 'var(--space-1)',
          scrollbarWidth: 'none',
          WebkitScrollbarWidth: 'none',
          width: '100%',
          flexShrink: 0,
        }}>
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-full)',
                background: activeSection === s ? 'var(--accent-dim)' : 'var(--surface)',
                color: s === 'Danger Zone' ? 'var(--danger-text)' : activeSection === s ? 'var(--accent)' : 'var(--text-body)',
                border: `1px solid ${activeSection === s ? 'rgba(232,146,26,0.3)' : 'var(--border)'}`,
                fontWeight: activeSection === s ? 700 : 400,
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        /* Desktop: sticky sidebar nav card */
        <nav aria-label="Settings sections" style={{
          width: 220, flexShrink: 0,
          position: 'sticky', top: 'var(--space-4)', alignSelf: 'flex-start',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 'var(--space-2)',
          maxHeight: 'calc(100dvh - 120px)', overflowY: 'auto',
        }}>
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              style={{
                width: '100%', textAlign: 'left',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: activeSection === s ? 'var(--accent-dim)' : 'transparent',
                color: s === 'Danger Zone' ? 'var(--danger-text)' : activeSection === s ? 'var(--accent)' : 'var(--text-body)',
                fontWeight: activeSection === s ? 700 : 400,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                display: 'block', marginBottom: 1,
              }}
            >
              {s}
            </button>
          ))}
        </nav>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {activeSection === 'Profile' && (
          <>
            {/* Card 1 — Avatar */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
                {/* Avatar circle */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', border: '3px solid var(--accent-dim)' }}>
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    aria-label="Change avatar"
                    style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {uploadingAvatar ? <span style={{ fontSize: 9 }}>…</span> : <Camera size={14} />}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
                {/* Name + plan + member since */}
                <div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-primary)' }}>{user?.name || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 4 }}>
                    <span style={{ padding: '2px 10px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {user?.plan || 'Trial'}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Member since {memberSince}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 — Personal Information */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
              <CardHeader title="Personal Information" onEdit={() => setEditingPersonal(true)} isEditing={editingPersonal} />
              {editingPersonal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <Input id="p-name" label="Full Name" value={personalForm.name} onChange={e => setPersonalForm(p => ({...p, name: e.target.value}))} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)' }}>Email Address</label>
                    <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--text-disabled)' }}>{user?.email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Email cannot be changed</div>
                  </div>
                  <Input id="p-phone" label="Phone Number" type="tel" value={personalForm.phone} onChange={e => setPersonalForm(p => ({...p, phone: e.target.value}))} placeholder="+91 98765 43210" />
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <button onClick={savePersonal} disabled={savingPersonal} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {savingPersonal ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingPersonal(false); setPersonalForm({ name: user?.name||'', phone: user?.phone||'' }); }} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 'var(--space-4) var(--space-6)' }}>
                  <FieldRow label="Full Name" value={user?.name} />
                  <FieldRow label="Email Address" value={user?.email} />
                  <FieldRow label="Phone Number" value={user?.phone} />
                  <FieldRow label="Plan" value={user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : '—'} />
                </div>
              )}
            </div>

            {/* Card 3 — Business & Tax */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
              <CardHeader title="Business &amp; Tax" onEdit={() => setEditingBusiness(true)} isEditing={editingBusiness} />
              {editingBusiness ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <Input id="b-bname" label="Business / Channel Name" value={businessForm.business_name} onChange={e => setBusinessForm(p => ({...p, business_name: e.target.value}))} />
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
                    <Input id="b-gstin" label="GSTIN" value={businessForm.gstin} onChange={e => setBusinessForm(p => ({...p, gstin: e.target.value.toUpperCase()}))} placeholder="29ABCDE1234F1Z5" maxLength={15} hint="15-character GST ID" />
                    <Input id="b-pan" label="PAN" value={businessForm.pan} onChange={e => setBusinessForm(p => ({...p, pan: e.target.value.toUpperCase()}))} placeholder="ABCDE1234F" maxLength={10} />
                  </div>
                  <Input id="b-addr" label="Business Address" value={businessForm.business_address} onChange={e => setBusinessForm(p => ({...p, business_address: e.target.value}))} />
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
                    <Input id="b-prefix" label="Invoice Prefix" value={businessForm.invoice_prefix} onChange={e => setBusinessForm(p => ({...p, invoice_prefix: e.target.value.toUpperCase()}))} placeholder="INV" maxLength={5} hint="2–5 chars, used in invoice numbers" />
                    <Input id="b-state" label="State Code" value={businessForm.state_code} onChange={e => setBusinessForm(p => ({...p, state_code: e.target.value}))} placeholder="29" maxLength={2} />
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <button onClick={saveBusiness} disabled={savingBusiness} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {savingBusiness ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingBusiness(false); setBusinessForm({ business_name: user?.business_name||'', gstin: user?.gstin||'', pan: user?.pan||'', business_address: user?.business_address||'', state_code: user?.state_code||'', invoice_prefix: user?.invoice_prefix||'INV' }); }} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 'var(--space-4) var(--space-6)' }}>
                  <FieldRow label="Business / Channel Name" value={user?.business_name} />
                  <FieldRow label="GSTIN" value={user?.gstin} />
                  <FieldRow label="PAN" value={user?.pan} />
                  <FieldRow label="Business Address" value={user?.business_address} />
                  <FieldRow label="State Code" value={user?.state_code} />
                  <FieldRow label="Invoice Prefix" value={user?.invoice_prefix} />
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Tax Profile shows social links too ── */}
        {activeSection === 'Profile' && (
          <SocialLinksSection user={user} onSave={async (links) => {
            try { await api.put('/auth/profile', { social_links: links }); await fetchUser(); } catch { toast.error('Failed to save social links'); }
          }} />
        )}
        {activeSection === 'Tax Profile' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>Tax Profile</h2>
            <Input id="gstin" label="GSTIN" value={businessForm.gstin} onChange={(e) => setBusinessForm(p => ({...p, gstin: e.target.value.toUpperCase()}))} hint="15-character GST identification number" maxLength={15} placeholder="29ABCDE1234F1Z5" />
            <Input id="pan" label="PAN" value={businessForm.pan} onChange={(e) => setBusinessForm(p => ({...p, pan: e.target.value.toUpperCase()}))} maxLength={10} placeholder="ABCDE1234F" />
            <Input id="business_address" label="Business address" value={businessForm.business_address} onChange={(e) => setBusinessForm(p => ({...p, business_address: e.target.value}))} />
            <Input id="invoice_prefix" label="Invoice prefix" value={businessForm.invoice_prefix} onChange={(e) => setBusinessForm(p => ({...p, invoice_prefix: e.target.value.toUpperCase()}))} hint="2–5 characters. Used in invoice numbers." maxLength={5} placeholder="INV" />
            <button onClick={saveBusiness} disabled={savingBusiness} style={{ alignSelf: 'flex-start', padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
              {savingBusiness ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
        {activeSection === 'Invoice Settings' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
            <InvoiceSettingsSection user={user} />
          </div>
        )}
        {activeSection === 'Billing' && (
          <BillingSection user={user} onPlanChange={fetchUser} />
        )}
        {activeSection === 'Danger Zone' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--danger-text)', marginBottom: 'var(--space-4)' }}>Danger Zone</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              Permanently delete your account and all associated data — invoices, TDS records, income, expenses, brand deals, and settings. This action <strong style={{ color: 'var(--danger-text)' }}>cannot be undone</strong>.
            </p>
            <button
              style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => { setDeleteConfirmText(''); setDeleteConfirmOpen(true); }}
            >
              Delete account permanently
            </button>
          </div>
        )}

        {/* Account deletion confirmation modal */}
        <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Account">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.6 }}>
              This will permanently delete your account and all data. There is no way to recover it.
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={async () => {
                  if (deleteConfirmText !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
                  setDeleting(true);
                  try {
                    await api.delete('/auth/account');
                    toast.success('Account deleted');
                    window.location.href = '/';
                  } catch { toast.error('Failed to delete account. Please try again.'); }
                  finally { setDeleting(false); }
                }}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                style={{ flex: 1, padding: 'var(--space-3)', background: deleteConfirmText === 'DELETE' ? 'var(--danger)' : 'var(--border-2)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: deleteConfirmText === 'DELETE' && !deleting ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                style={{ flex: 1, padding: 'var(--space-3)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>

        {/* ── Notifications Section ─────────────────────────────────── */}
        {activeSection === 'Notifications' && (
          <NotificationsSection />
        )}

        {/* ── Security Section ──────────────────────────────────────── */}
        {activeSection === 'Security' && (
          <SecuritySection />
        )}

        {/* ── Export Section ────────────────────────────────────────── */}
        {activeSection === 'Export' && (
          <ExportSection user={user} />
        )}

        {/* ── Integrations Section ──────────────────────────────────── */}
        {activeSection === 'Integrations' && (
          <IntegrationsSection user={user} onRefresh={fetchUser} />
        )}
      </div>
    </div>
  );
}
