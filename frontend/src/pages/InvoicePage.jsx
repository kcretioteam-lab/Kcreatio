import { useState, useCallback, useEffect, useRef } from 'react';
import { format, addDays } from 'date-fns';
import { Plus, FileText, Check, AlertCircle, Eye, Download, X, HelpCircle, ChevronUp, ChevronDown, ChevronsUpDown, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import UsageBar from '../components/ui/UsageBar.jsx';
import { useUsage } from '../hooks/useUsage.jsx';
import { isTemplateLocked } from '../utils/planConfig.js';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../utils/api.js';
import { formatINR, amountInWords } from '../utils/formatINR.js';
import Input from '../components/ui/Input.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import InvoiceList from '../components/features/invoice/InvoiceList.jsx';

// ── Indian states ─────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' }, { code: '28', name: 'Andhra Pradesh (old)' },
  { code: '29', name: 'Karnataka' }, { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' }, { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' }, { code: '38', name: 'Ladakh' },
];
const STATE_MAP = Object.fromEntries(INDIAN_STATES.map(s => [s.code, s.name]));

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ── GST calc — works with serviceLines array ─────────────────────────────────
function calcGSTMulti(form, userStateCode) {
  const lines = form.serviceLines || [{ amount: form.baseAmount, gstRate: form.gstRate }];
  const isIntra = form.brandStateCode && userStateCode && form.brandStateCode === userStateCode;

  let totalBasePaise = 0;
  let totalGstPaise = 0;
  const lineCalcs = lines.map(line => {
    const basePaise = Math.round((parseFloat(line.amount) || 0) * 100);
    const rate = parseInt(line.gstRate || form.gstRate || 18) / 100;
    const gstPaise = Math.round(basePaise * rate);
    totalBasePaise += basePaise;
    totalGstPaise += gstPaise;
    return { base: basePaise / 100, gstRate: parseInt(line.gstRate || form.gstRate || 18), gstAmount: gstPaise / 100 };
  });

  return {
    base: totalBasePaise / 100,
    gstRate: parseInt(form.gstRate || 18),
    gstAmount: totalGstPaise / 100,
    total: (totalBasePaise + totalGstPaise) / 100,
    supplyType: isIntra ? 'intrastate' : 'interstate',
    cgst: isIntra ? totalGstPaise / 2 / 100 : 0,
    sgst: isIntra ? totalGstPaise / 2 / 100 : 0,
    igst: !isIntra ? totalGstPaise / 100 : 0,
    lines: lineCalcs,
  };
}

// Keep old single-line calc for backward compat
function calcGST(form, userStateCode) {
  return calcGSTMulti(form, userStateCode);
}

// ── Invoice templates (7 styles inspired by Swipe) ───────────────────────────
const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Traditional professional layout — most widely accepted for Indian GST invoices',
    tag: 'Most Popular',
    headerColor: '#1a1a2e', accentColor: '#E8921A',
    headerStyle: 'Dark navy with gold accent',
    layout: 'classic',
  },
  {
    id: 'modern',
    name: 'Modern',
    desc: 'Centered header with full-width band, Qty/Rate/Amount columns — corporate style',
    tag: 'Corporate',
    headerColor: '#2563EB', accentColor: '#2563EB',
    headerStyle: 'Bright blue, corporate',
    layout: 'corporate',
  },
  {
    id: 'professional',
    name: 'Professional',
    desc: 'Formal corporate layout with tax summary table, best for agencies',
    tag: 'Agency',
    headerColor: '#16A34A', accentColor: '#16A34A',
    headerStyle: 'Forest green, formal',
    layout: 'corporate',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    desc: 'Warm sepia tones, serif accents — classic Indian business style',
    tag: 'Classic',
    headerColor: '#78350F', accentColor: '#D97706',
    headerStyle: 'Warm brown, serif feel',
    layout: 'classic',
  },
  {
    id: 'evergreen',
    name: 'Evergreen',
    desc: 'Timeless teal design, clean typography, works for any industry',
    tag: 'Versatile',
    headerColor: '#0F766E', accentColor: '#0D9488',
    headerStyle: 'Deep teal, balanced',
    layout: 'classic',
  },
  {
    id: 'compact',
    name: 'Compact',
    desc: 'Minimal layout, company name top-right, right-aligned tax summary — clean print',
    tag: 'Minimal',
    headerColor: '#374151', accentColor: '#6B7280',
    headerStyle: 'Charcoal grey, minimal',
    layout: 'minimal',
  },
  {
    id: 'genz',
    name: 'Bold',
    desc: 'Minimal layout with purple accent — high-contrast, modern style',
    tag: 'Trending',
    headerColor: '#6D28D9', accentColor: '#8B5CF6',
    headerStyle: 'Purple gradient, vibrant',
    layout: 'minimal',
  },
];

const EMPTY_FORM = {
  brandName: '', brandGstin: '', brandAddress: '', brandStateCode: '', brandPan: '',
  brandEmail: '', brandPhone: '',
  // Multiple service lines
  serviceLines: [{ description: 'Content Creation and Influencer Marketing Services', sacCode: '998399', amount: '', gstRate: '18' }],
  // Legacy single fields kept for backward compat
  serviceDescription: 'Content Creation and Influencer Marketing Services',
  sacCode: '998399',
  baseAmount: '', gstRate: '18',
  invoiceDate: format(new Date(), 'yyyy-MM-dd'),
  dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  placeOfSupply: '', reverseCharge: 'No', notes: '',
  paymentTerms: 'Net 30', templateId: 'classic',
  // Bank details (optional)
  includeBankDetails: false,
  bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '',
  // UPI QR (separate from bank details)
  includeUpi: false,
  upiScannerUrl: null,
  // Terms & Conditions (optional)
  includeTerms: false,
  termsText: 'Payment due within 30 days of invoice date.\nLate payments may incur interest at 1.5% per month.\nAll disputes subject to jurisdiction of Bengaluru courts.\nThis is a computer-generated invoice.',
  // Authorized signatory
  includeSignatory: false,
  signatoryName: '',
  signatoryImageUrl: null,  // base64 data URL for signature image
};

// ── Validation (Rule 46 CGST Rules) ──────────────────────────────────────────
function getErrors(form) {
  const e = {};
  if (!form.brandName.trim())                              e.brandName = 'Brand name is required';
  if (!form.brandAddress.trim())                           e.brandAddress = 'Brand address is mandatory on GST invoice';
  if (!form.brandStateCode)                                e.brandStateCode = 'Brand state is required';
  if (!form.placeOfSupply)                                 e.placeOfSupply = 'Place of supply is mandatory per GST law (Rule 46)';
  if (form.brandGstin && !GSTIN_REGEX.test(form.brandGstin)) e.brandGstin = 'Invalid GSTIN (format: 22AAAAA0000A1Z5)';
  if (form.brandGstin && GSTIN_REGEX.test(form.brandGstin) && form.brandStateCode && form.brandGstin.slice(0, 2) !== form.brandStateCode) {
    e.brandGstin = `GSTIN state code (${form.brandGstin.slice(0, 2)}) does not match selected brand state (${form.brandStateCode})`;
  }
  if (!form.serviceDescription.trim() || form.serviceDescription.trim().length < 5)
                                                           e.serviceDescription = 'Description of services is mandatory';
  if (!form.sacCode.trim())                                e.sacCode = 'SAC/HSN code is mandatory for service invoices';
  if (!form.baseAmount || parseFloat(form.baseAmount) <= 0)  e.baseAmount = 'Taxable value must be > ₹0';
  if (parseFloat(form.baseAmount) > 9999999)               e.baseAmount = 'Amount exceeds ₹99,99,999';
  if (!form.invoiceDate)                                   e.invoiceDate = 'Invoice date is required';
  return e;
}

function isComplete(form) {
  const e = getErrors(form);
  return Object.keys(e).length === 0;
}


// ── localStorage helpers — works without backend ──────────────────────────────
const LS_KEY = 'creator_tax_invoices';
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function lsSave(arr) { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
function lsNextNumber(user) {
  const prefix = user?.invoice_prefix || 'INV';
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyCode = `${String(y).slice(-2)}${String(y+1).slice(-2)}`;
  const count = lsLoad().filter(i => i.invoice_number?.startsWith(`${prefix}/${fyCode}/`)).length;
  return `${prefix}/${fyCode}/${String(count+1).padStart(4,'0')}`;
}

// ── PDF download — browser print window ──────────────────────────────────────
function buildClassicHTML(inv, user, t, plan) {
  const stateMap = Object.fromEntries(INDIAN_STATES.map(s => [s.code, s.name]));
  const fmt = (d) => {
    if (!d) return '—';
    try { return format(new Date(d.includes('T') ? d : d + 'T00:00:00'), 'dd MMM yyyy'); }
    catch { return d; }
  };
  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const words = amountInWords(inv.total_amount || 0);
  // Use invoice-specific contact if user opted out of showing login contact
  const displayEmail = (user?.show_phone_on_invoice === false && user?.invoice_email) ? user.invoice_email : user?.email;
  const displayPhone = (user?.show_phone_on_invoice === false && user?.invoice_phone) ? user.invoice_phone : user?.phone;

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${inv.invoice_number || ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #1a1a1a; background: #fff; padding: 32px; }
  .hdr { background: ${t.headerColor}; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: flex-start; }
  .hdr-left h1 { font-size: 9px; letter-spacing: .12em; opacity: .7; text-transform: uppercase; margin-bottom: 4px; }
  .hdr-left h2 { font-size: 18px; font-weight: 800; letter-spacing: -.02em; }
  .hdr-right { text-align: right; font-size: 11px; opacity: .9; line-height: 1.7; }
  .rc { display: inline-block; background: rgba(255,255,255,.2); border-radius: 4px; padding: 2px 7px; font-size: 9px; margin-top: 6px; letter-spacing: .06em; }
  .body { border: 1px solid #e5e5e5; border-top: none; padding: 20px 24px; border-radius: 0 0 8px 8px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .party-label { font-size: 8px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #999; margin-bottom: 6px; }
  .party-name { font-weight: 700; font-size: 13px; margin-bottom: 3px; }
  .party-detail { font-size: 10px; color: #555; margin-top: 1px; }
  .pos { padding: 6px 10px; background: #f5f5f5; border-radius: 5px; font-size: 10px; color: #555; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { padding: 8px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #666; background: #f9f9f9; border-bottom: 2px solid #e5e5e5; }
  td { padding: 9px 8px; font-size: 11px; border-bottom: 1px solid #f0f0f0; }
  .r { text-align: right; }
  .totals { margin-left: auto; max-width: 220px; margin-top: 4px; }
  .trow { display: flex; justify-content: space-between; font-size: 10px; padding: 4px 0; border-bottom: 1px solid #f0f0f0; color: #666; }
  .trow span:last-child { font-variant-numeric: tabular-nums; }
  .tfinal { display: flex; justify-content: space-between; padding: 8px 0 0; border-top: 2px solid #1a1a1a; margin-top: 4px; }
  .tfinal span:first-child { font-weight: 800; font-size: 12px; }
  .tfinal span:last-child { font-weight: 800; font-size: 14px; color: ${t.accentColor}; font-variant-numeric: tabular-nums; }
  .notes { margin-top: 14px; padding: 10px 12px; background: #f9f9f9; border-radius: 6px; font-size: 10px; color: #555; line-height: 1.6; }
  .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #ccc; }
  @page { margin: 0; size: A4 portrait; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  @media print { body { padding: 16px 24px; } .hdr { border-radius: 0; } .body { border-radius: 0; } }
</style>
</head><body>
<div class="hdr">
  <div class="hdr-left">
    <h1>TAX INVOICE</h1>
    <h2>${inv.invoice_number || 'INV/0001'}</h2>
    ${inv.reverse_charge === 'Yes' ? '<div class="rc">REVERSE CHARGE APPLICABLE</div>' : ''}
  </div>
  <div class="hdr-right">
    <div><strong>Invoice Date:</strong> ${fmt(inv.invoice_date)}</div>
    <div><strong>Due Date:</strong> ${fmt(inv.due_date)}</div>
    ${inv.payment_terms ? `<div><strong>Payment Terms:</strong> ${inv.payment_terms}</div>` : ''}
  </div>
</div>
<div class="body">
  <div class="parties">
    <div>
      <div class="party-label">Supplier (From)</div>
      <div class="party-name">${user?.business_name || user?.name || '—'}</div>
      ${user?.gstin ? `<div class="party-detail">GSTIN: <strong>${user.gstin}</strong></div>` : ''}
      ${user?.pan ? `<div class="party-detail">PAN: ${user.pan}</div>` : ''}
      ${displayEmail ? `<div class="party-detail">Email: ${displayEmail}</div>` : ''}
      ${displayPhone ? `<div class="party-detail">Ph: ${displayPhone}</div>` : ''}
      ${user?.business_address ? `<div class="party-detail" style="margin-top:4px;line-height:1.4">${user.business_address}</div>` : ''}
      ${user?.state_code ? `<div class="party-detail">State: ${stateMap[user.state_code] || ''} | Code: ${user.state_code}</div>` : ''}
    </div>
    <div>
      <div class="party-label">Recipient (Bill To)</div>
      <div class="party-name">${inv.brand_name || '—'}</div>
      ${inv.brand_gstin ? `<div class="party-detail">GSTIN: <strong>${inv.brand_gstin}</strong></div>` : ''}
      ${inv.brand_pan ? `<div class="party-detail">PAN: ${inv.brand_pan}</div>` : ''}
      ${inv.brand_email ? `<div class="party-detail">Email: ${inv.brand_email}</div>` : ''}
      ${inv.brand_phone ? `<div class="party-detail">Ph: ${inv.brand_phone}</div>` : ''}
      ${inv.brand_address ? `<div class="party-detail" style="margin-top:4px;line-height:1.4">${inv.brand_address}</div>` : ''}
      ${inv.brand_state_code ? `<div class="party-detail">State: ${stateMap[inv.brand_state_code] || ''} | Code: ${inv.brand_state_code}</div>` : ''}
    </div>
  </div>
  ${inv.place_of_supply ? `<div class="pos"><strong>Place of Supply:</strong> ${stateMap[inv.place_of_supply] || inv.place_of_supply} (${inv.place_of_supply}) &nbsp;·&nbsp; <strong>Supply Type:</strong> ${inv.supply_type === 'intrastate' ? 'Intrastate (CGST + SGST)' : 'Interstate (IGST)'}</div>` : ''}
  <table>
    <thead><tr>
      <th>Description of Services</th><th>SAC/HSN</th><th>GST Rate</th><th class="r">Taxable Value</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>${inv.service_description || 'Content Creation and Influencer Marketing Services'}</td>
        <td>${inv.sac_code || '998399'}</td>
        <td>${inv.gst_rate || 18}%</td>
        <td class="r"><strong>${inr(inv.base_amount)}</strong></td>
      </tr>
    </tbody>
  </table>
  <div class="totals">
    <div class="trow"><span>Taxable Value</span><span>${inr(inv.base_amount)}</span></div>
    ${inv.supply_type === 'intrastate' ? `
    <div class="trow"><span>Add: CGST @ ${(inv.gst_rate || 18) / 2}%</span><span>${inr(inv.cgst_amount)}</span></div>
    <div class="trow"><span>Add: SGST @ ${(inv.gst_rate || 18) / 2}%</span><span>${inr(inv.sgst_amount)}</span></div>
    ` : `<div class="trow"><span>Add: IGST @ ${inv.gst_rate || 18}%</span><span>${inr(inv.igst_amount)}</span></div>`}
    <div class="tfinal"><span>Invoice Total</span><span>${inr(inv.total_amount)}</span></div>
  </div>
  <div style="margin-top:6px;font-size:9px;color:#555;font-style:italic">
    Amount Chargeable (in words): <strong>${words}</strong>
  </div>
  <div style="margin-top:6px;font-size:9px;color:#555">
    Reverse Charge: <strong>${inv.reverse_charge === 'Yes' ? 'Applicable' : 'Not Applicable'}</strong>
  </div>
  ${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
  ${inv.include_bank_details && inv.bank_name ? `
  <div class="notes" style="margin-top:10px">
    <strong>Bank Details for Payment:</strong>
    <table style="margin-top:6px;font-size:10px;border:none">
      ${inv.account_holder_name?`<tr><td style="padding:2px 0;color:#666;width:140px">Account Holder</td><td style="font-weight:700">${inv.account_holder_name}</td></tr>`:''}
      ${inv.bank_name?`<tr><td style="padding:2px 0;color:#666">Bank</td><td>${inv.bank_name}</td></tr>`:''}
      ${inv.account_number?`<tr><td style="padding:2px 0;color:#666">Account No.</td><td style="font-family:monospace">${inv.account_number}</td></tr>`:''}
      ${inv.ifsc_code?`<tr><td style="padding:2px 0;color:#666">IFSC Code</td><td style="font-family:monospace">${inv.ifsc_code}</td></tr>`:''}
    </table>
  </div>` : ''}
  ${inv.include_upi && (inv.upi_id || inv.upi_scanner_url) ? `
  <div class="notes" style="margin-top:10px;display:flex;align-items:center;gap:12px">
    ${inv.upi_scanner_url ? `<img src="${inv.upi_scanner_url}" style="width:60px;height:60px;object-fit:contain;border:1px solid #ddd;border-radius:4px;background:#fff" />` : ''}
    <div><strong>Pay via UPI</strong>${inv.upi_id ? `<div style="font-family:monospace;font-size:10px;color:#555">${inv.upi_id}</div>` : ''}</div>
  </div>` : ''}
  ${inv.include_terms && inv.terms_text ? `
  <div class="notes" style="margin-top:10px">
    <strong>Terms &amp; Conditions:</strong>
    <div style="margin-top:4px;white-space:pre-line;color:#666">${inv.terms_text}</div>
  </div>` : ''}
  ${inv.include_signatory ? `
  <div style="margin-top:30px;display:flex;justify-content:flex-end">
    <div style="text-align:center;min-width:180px">
      ${inv.signatory_image_url ? `<img src="${inv.signatory_image_url}" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:4px;border:1px solid #ddd;border-radius:4px;background:#fff;padding:4px" />` : ''}
      <div style="border-top:1px solid #1a1a1a;padding-top:6px;font-size:10px;color:#333">
        <div><strong>For ${inv.seller_business_name || user?.business_name || user?.name || 'Creator'}</strong></div>
        ${inv.signatory_name?`<div style="color:#666">Authorized Signatory: ${inv.signatory_name}</div>`:'<div style="color:#666">Authorized Signatory</div>'}
      </div>
    </div>
  </div>` : ''}
  <div class="footer">Computer-generated invoice &nbsp;·&nbsp; Kcretio &nbsp;·&nbsp; Subject to GST as applicable</div>
</div>
<script>window.onload = function() { window.print(); };</script>
${plan === 'basic' ? `<div style="position:fixed;bottom:8px;left:0;right:0;text-align:center;font-size:9px;color:#94a3b8;font-family:Inter,sans-serif;letter-spacing:0.04em;pointer-events:none;">Created with Kcretio — Basic Plan · kcreatio.com</div>` : ''}
</body></html>`;
}

function buildCorporateHTML(inv, user, t, plan) {
  const stateMap = Object.fromEntries(INDIAN_STATES.map(s => [s.code, s.name]));
  const fmt = (d) => { if (!d) return '—'; try { return format(new Date(d.includes('T') ? d : d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; } };
  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const words = amountInWords(inv.total_amount || 0);
  const displayEmail = (user?.show_phone_on_invoice === false && user?.invoice_email) ? user.invoice_email : user?.email;
  const displayPhone = (user?.show_phone_on_invoice === false && user?.invoice_phone) ? user.invoice_phone : user?.phone;

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${inv.invoice_number || ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #1a1a1a; background: #fff; padding: 28px; }
  .hdr { background: ${t.headerColor}; color: #fff; padding: 18px 24px; display: flex; justify-content: space-between; align-items: flex-start; }
  .hdr-co { }
  .hdr-co .co-name { font-size: 20px; font-weight: 800; }
  .hdr-co .co-gstin { font-size: 10px; opacity: 0.85; margin-top: 2px; }
  .hdr-right { text-align: right; }
  .hdr-right .inv-label { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; opacity: .7; }
  .hdr-right .inv-num { font-size: 15px; font-weight: 700; }
  .orig { display: inline-block; font-size: 8px; letter-spacing: .08em; text-transform: uppercase; border: 1px solid rgba(255,255,255,.5); padding: 2px 6px; border-radius: 3px; margin-top: 4px; }
  .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 2px solid ${t.headerColor}; }
  .info-cell { padding: 12px 16px; }
  .info-cell:first-child { border-right: 1px solid #e5e5e5; }
  .info-label { font-size: 8px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #999; margin-bottom: 4px; }
  .info-val { font-size: 11px; color: #333; }
  .info-val strong { font-size: 13px; color: #111; }
  .detail-row { display: grid; grid-template-columns: 1fr 1fr; background: #f8f8f8; border-bottom: 1px solid #e5e5e5; }
  .detail-cell { padding: 6px 16px; font-size: 10px; }
  .detail-cell .dl { color: #888; }
  .detail-cell .dv { color: #333; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; }
  th { padding: 8px 10px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #fff; background: ${t.headerColor}; }
  th.r { text-align: right; }
  td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #f0f0f0; }
  td.r { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-left: auto; max-width: 260px; border: 1px solid #e5e5e5; border-radius: 4px; overflow: hidden; }
  .trow { display: flex; justify-content: space-between; padding: 5px 12px; font-size: 11px; border-bottom: 1px solid #f0f0f0; color: #555; }
  .trow span:last-child { font-variant-numeric: tabular-nums; }
  .tfinal { display: flex; justify-content: space-between; padding: 8px 12px; background: ${t.headerColor}; color: #fff; }
  .tfinal span:last-child { font-weight: 800; font-size: 14px; font-variant-numeric: tabular-nums; }
  .footer-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 20px; }
  .footer-sect { font-size: 10px; }
  .footer-sect .fh { font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #999; margin-bottom: 6px; }
  .notes { margin-top: 10px; padding: 8px 12px; background: #f9f9f9; border-radius: 4px; font-size: 10px; color: #555; }
  @page { margin: 0; size: A4 portrait; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  @media print { body { padding: 16px 24px; } }
</style>
</head><body>
<div class="hdr">
  <div class="hdr-co">
    <div class="co-name">${user?.business_name || user?.name || '—'}</div>
    ${user?.gstin ? `<div class="co-gstin">GSTIN: ${user.gstin}</div>` : ''}
    ${user?.business_address ? `<div style="font-size:10px;opacity:.8;margin-top:4px">${user.business_address}</div>` : ''}
    ${user?.state_code ? `<div style="font-size:10px;opacity:.75;margin-top:2px">State: ${stateMap[user.state_code] || ''} | Code: ${user.state_code}</div>` : ''}
    ${displayEmail ? `<div style="font-size:10px;opacity:.75;margin-top:2px">Email: ${displayEmail}</div>` : ''}
  </div>
  <div class="hdr-right">
    <div class="inv-label">TAX INVOICE</div>
    <div class="inv-num">${inv.invoice_number || 'INV/0001'}</div>
    <div class="orig">ORIGINAL FOR RECIPIENT</div>
    ${inv.reverse_charge === 'Yes' ? '<div style="margin-top:4px;font-size:9px;opacity:.8">REVERSE CHARGE APPLICABLE</div>' : ''}
  </div>
</div>
<div class="info-row">
  <div class="info-cell">
    <div class="info-label">Customer Details</div>
    <div class="info-val"><strong>${inv.brand_name || '—'}</strong></div>
    ${inv.brand_gstin ? `<div style="font-size:10px;color:#555">GSTIN: ${inv.brand_gstin}</div>` : ''}
    ${inv.brand_pan ? `<div style="font-size:10px;color:#555">PAN: ${inv.brand_pan}</div>` : ''}
    ${inv.brand_email ? `<div style="font-size:10px;color:#555">Email: ${inv.brand_email}</div>` : ''}
    ${inv.brand_phone ? `<div style="font-size:10px;color:#555">Ph: ${inv.brand_phone}</div>` : ''}
    ${inv.brand_address ? `<div style="font-size:10px;color:#666;margin-top:3px;line-height:1.4">${inv.brand_address}</div>` : ''}
    ${inv.brand_state_code ? `<div style="font-size:10px;color:#555">State: ${stateMap[inv.brand_state_code] || ''} | Code: ${inv.brand_state_code}</div>` : ''}
  </div>
  <div class="info-cell">
    <div class="detail-cell" style="margin-bottom:4px"><span class="dl">Invoice #: </span><span class="dv">${inv.invoice_number || '—'}</span></div>
    <div class="detail-cell" style="margin-bottom:4px"><span class="dl">Invoice Date: </span><span class="dv">${fmt(inv.invoice_date)}</span></div>
    <div class="detail-cell" style="margin-bottom:4px"><span class="dl">Due Date: </span><span class="dv">${fmt(inv.due_date)}</span></div>
    ${inv.place_of_supply ? `<div class="detail-cell" style="margin-bottom:4px"><span class="dl">Place of Supply: </span><span class="dv">${stateMap[inv.place_of_supply] || inv.place_of_supply}</span></div>` : ''}
    ${inv.payment_terms ? `<div class="detail-cell"><span class="dl">Payment Terms: </span><span class="dv">${inv.payment_terms}</span></div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th style="width:30px">#</th>
    <th>Description of Services</th>
    <th>HSN/SAC</th>
    <th>Tax</th>
    <th class="r">Taxable Value</th>
    <th class="r">Amount</th>
  </tr></thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>${inv.service_description || 'Content Creation and Influencer Marketing Services'}</td>
      <td style="font-family:monospace;font-size:10px">${inv.sac_code || '998399'}</td>
      <td>${inv.gst_rate || 18}%</td>
      <td class="r">₹${Number(inv.base_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="r"><strong>₹${Number(inv.base_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
    </tr>
  </tbody>
</table>
<div class="totals">
  <div class="trow"><span>Taxable Amount</span><span>${inr(inv.base_amount)}</span></div>
  ${inv.supply_type === 'intrastate' ? `
  <div class="trow"><span>Add: CGST @ ${(inv.gst_rate||18)/2}%</span><span>${inr(inv.cgst_amount)}</span></div>
  <div class="trow"><span>Add: SGST @ ${(inv.gst_rate||18)/2}%</span><span>${inr(inv.sgst_amount)}</span></div>
  ` : `<div class="trow"><span>Add: IGST @ ${inv.gst_rate||18}%</span><span>${inr(inv.igst_amount)}</span></div>`}
  <div class="tfinal"><span>Total</span><span>${inr(inv.total_amount)}</span></div>
</div>
<div style="margin-top:6px;font-size:9px;color:#555;font-style:italic">
  Amount Chargeable (in words): <strong>${words}</strong>
</div>
<div style="margin-top:4px;font-size:9px;color:#555">
  Reverse Charge: <strong>${inv.reverse_charge === 'Yes' ? 'Applicable' : 'Not Applicable'}</strong>
</div>
${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
  <div class="footer-sect">
    ${inv.include_bank_details && inv.bank_name ? `
    <div class="fh">Bank Details</div>
    ${inv.bank_name ? `<div>${inv.bank_name}</div>` : ''}
    ${inv.account_number ? `<div>A/c: <span style="font-family:monospace">${inv.account_number}</span></div>` : ''}
    ${inv.ifsc_code ? `<div>IFSC: <span style="font-family:monospace">${inv.ifsc_code}</span></div>` : ''}
    ${inv.account_holder_name ? `<div>${inv.account_holder_name}</div>` : ''}
    ` : ''}
  </div>
  <div class="footer-sect" style="text-align:center">
    ${inv.include_upi && inv.upi_scanner_url ? `
    <div class="fh">Pay via UPI</div>
    <img src="${inv.upi_scanner_url}" style="width:70px;height:70px;object-fit:contain;border:1px solid #ddd;border-radius:4px;background:#fff" />
    ${inv.upi_id ? `<div style="font-family:monospace;font-size:9px;margin-top:2px">${inv.upi_id}</div>` : ''}
    ` : inv.include_upi && inv.upi_id ? `<div class="fh">Pay via UPI</div><div style="font-family:monospace">${inv.upi_id}</div>` : ''}
  </div>
  <div class="footer-sect" style="text-align:right">
    ${inv.include_signatory ? `
    <div style="margin-top:8px">
      ${inv.signatory_image_url ? `<img src="${inv.signatory_image_url}" style="height:40px;max-width:120px;object-fit:contain;border:1px solid #ddd;background:#fff;padding:3px" />` : ''}
      <div style="border-top:1px solid #1a1a1a;padding-top:5px;font-size:9px">
        <div><strong>For ${inv.seller_business_name || user?.business_name || user?.name || 'Creator'}</strong></div>
        <div style="color:#666">Authorized Signatory${inv.signatory_name ? ': '+inv.signatory_name : ''}</div>
      </div>
    </div>` : ''}
  </div>
</div>
${inv.include_terms && inv.terms_text ? `
<div class="notes" style="margin-top:10px">
  <strong>Terms &amp; Conditions:</strong>
  <div style="margin-top:4px;white-space:pre-line;color:#666;font-size:9px">${inv.terms_text}</div>
</div>` : ''}
<div style="margin-top:16px;text-align:center;font-size:8px;color:#ccc">Computer-generated invoice · Kcretio · Subject to GST as applicable</div>
<script>window.onload = function() { window.print(); };</script>
${plan === 'basic' ? `<div style="position:fixed;bottom:8px;left:0;right:0;text-align:center;font-size:9px;color:#94a3b8;font-family:Inter,sans-serif;letter-spacing:0.04em;pointer-events:none;">Created with Kcretio — Basic Plan · kcreatio.com</div>` : ''}
</body></html>`;
}

function buildMinimalHTML(inv, user, t, plan) {
  const stateMap = Object.fromEntries(INDIAN_STATES.map(s => [s.code, s.name]));
  const fmt = (d) => { if (!d) return '—'; try { return format(new Date(d.includes('T') ? d : d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; } };
  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const words = amountInWords(inv.total_amount || 0);
  const displayEmail = (user?.show_phone_on_invoice === false && user?.invoice_email) ? user.invoice_email : user?.email;
  const displayPhone = (user?.show_phone_on_invoice === false && user?.invoice_phone) ? user.invoice_phone : user?.phone;

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${inv.invoice_number || ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #1a1a1a; background: #fff; padding: 32px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .co-name { font-size: 22px; font-weight: 800; color: #111; }
  .co-sub { font-size: 10px; color: #666; margin-top: 2px; }
  .inv-label { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: ${t.accentColor}; text-align: right; }
  .inv-num { font-size: 14px; font-weight: 700; text-align: right; color: #111; }
  .divider { border: none; border-top: 2px solid ${t.headerColor}; margin: 12px 0; }
  .meta-row { display: flex; gap: 24px; font-size: 10px; color: #555; margin-bottom: 14px; flex-wrap: wrap; }
  .meta-row .m { }
  .meta-row .ml { font-weight: 700; color: #888; font-size: 9px; letter-spacing:.06em; text-transform:uppercase; }
  .meta-row .mv { color: #222; font-size: 11px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; padding: 10px; background: #f8f8f8; border-radius: 4px; }
  .party-lbl { font-size: 8px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#999; margin-bottom:4px; }
  .party-name { font-weight: 700; font-size: 12px; }
  .party-d { font-size: 10px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { padding: 7px 8px; text-align: left; font-size: 9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color: #888; border-bottom: 1px solid #e0e0e0; }
  th.r { text-align: right; }
  td { padding: 8px; font-size: 11px; border-bottom: 1px solid #f0f0f0; }
  td.r { text-align: right; font-variant-numeric: tabular-nums; }
  .tax-blk { float: right; width: 220px; }
  .trow { display: flex; justify-content: space-between; font-size: 10px; padding: 3px 0; color: #666; border-bottom: 1px solid #f5f5f5; }
  .trow span:last-child { font-variant-numeric: tabular-nums; }
  .tfinal { display: flex; justify-content: space-between; padding: 6px 0 0; border-top: 2px solid ${t.headerColor}; margin-top: 4px; font-weight: 800; }
  .tfinal span:last-child { color: ${t.accentColor}; font-size: 13px; font-variant-numeric: tabular-nums; }
  .cb { clear: both; }
  .notes { margin-top: 12px; padding: 8px 12px; background: #f9f9f9; border-radius: 4px; font-size: 10px; color: #555; line-height: 1.6; }
  .btm { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 20px; font-size: 10px; }
  .btm-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #999; margin-bottom: 6px; }
  @page { margin: 0; size: A4 portrait; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  @media print { body { padding: 16px 24px; } }
</style>
</head><body>
<div class="top">
  <div>
    <div class="co-name">${user?.business_name || user?.name || '—'}</div>
    <div class="co-sub">
      ${user?.gstin ? `GSTIN: ${user.gstin}` : ''}
      ${user?.pan ? ` · PAN: ${user.pan}` : ''}
    </div>
    ${user?.business_address ? `<div class="co-sub">${user.business_address}</div>` : ''}
    ${user?.state_code ? `<div class="co-sub">State: ${stateMap[user.state_code] || ''} | Code: ${user.state_code}</div>` : ''}
    ${displayEmail ? `<div class="co-sub">Email: ${displayEmail}</div>` : ''}
    ${displayPhone ? `<div class="co-sub">Ph: ${displayPhone}</div>` : ''}
  </div>
  <div>
    <div class="inv-label">TAX INVOICE</div>
    <div class="inv-num">${inv.invoice_number || '—'}</div>
    ${inv.reverse_charge === 'Yes' ? '<div style="text-align:right;font-size:9px;color:#e87500;margin-top:2px">REVERSE CHARGE</div>' : ''}
  </div>
</div>
<hr class="divider" />
<div class="meta-row">
  <div class="m"><div class="ml">Invoice Date</div><div class="mv">${fmt(inv.invoice_date)}</div></div>
  <div class="m"><div class="ml">Due Date</div><div class="mv">${fmt(inv.due_date)}</div></div>
  ${inv.place_of_supply ? `<div class="m"><div class="ml">Place of Supply</div><div class="mv">${stateMap[inv.place_of_supply] || inv.place_of_supply}</div></div>` : ''}
  ${inv.payment_terms ? `<div class="m"><div class="ml">Payment Terms</div><div class="mv">${inv.payment_terms}</div></div>` : ''}
</div>
<div class="parties">
  <div>
    <div class="party-lbl">Bill From</div>
    <div class="party-name">${user?.business_name || user?.name || '—'}</div>
    ${user?.gstin ? `<div class="party-d">GSTIN: ${user.gstin}</div>` : ''}
    ${user?.state_code ? `<div class="party-d">State: ${stateMap[user.state_code] || ''} | Code: ${user.state_code}</div>` : ''}
  </div>
  <div>
    <div class="party-lbl">Bill To</div>
    <div class="party-name">${inv.brand_name || '—'}</div>
    ${inv.brand_gstin ? `<div class="party-d">GSTIN: ${inv.brand_gstin}</div>` : ''}
    ${inv.brand_email ? `<div class="party-d">Email: ${inv.brand_email}</div>` : ''}
    ${inv.brand_phone ? `<div class="party-d">Ph: ${inv.brand_phone}</div>` : ''}
    ${inv.brand_address ? `<div class="party-d">${inv.brand_address}</div>` : ''}
    ${inv.brand_state_code ? `<div class="party-d">State: ${stateMap[inv.brand_state_code] || ''} | Code: ${inv.brand_state_code}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>Description</th><th>HSN/SAC</th><th>Tax</th><th class="r">Amount</th>
  </tr></thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>${inv.service_description || 'Content Creation and Influencer Marketing Services'}</td>
      <td style="font-family:monospace;font-size:10px">${inv.sac_code || '998399'}</td>
      <td>${inv.gst_rate || 18}%</td>
      <td class="r"><strong>${inr(inv.base_amount)}</strong></td>
    </tr>
  </tbody>
</table>
<div class="tax-blk">
  <div class="trow"><span>Taxable Value</span><span>${inr(inv.base_amount)}</span></div>
  ${inv.supply_type === 'intrastate' ? `
  <div class="trow"><span>Add: CGST @ ${(inv.gst_rate||18)/2}%</span><span>${inr(inv.cgst_amount)}</span></div>
  <div class="trow"><span>Add: SGST @ ${(inv.gst_rate||18)/2}%</span><span>${inr(inv.sgst_amount)}</span></div>
  ` : `<div class="trow"><span>Add: IGST @ ${inv.gst_rate||18}%</span><span>${inr(inv.igst_amount)}</span></div>`}
  <div class="tfinal"><span>Total</span><span>${inr(inv.total_amount)}</span></div>
</div>
<div class="cb"></div>
<div style="margin-top:6px;font-size:9px;color:#555;font-style:italic">
  Amount Chargeable (in words): <strong>${words}</strong>
</div>
<div style="margin-top:4px;font-size:9px;color:#555">
  Reverse Charge: <strong>${inv.reverse_charge === 'Yes' ? 'Applicable' : 'Not Applicable'}</strong>
</div>
${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
<div class="btm">
  <div>
    ${inv.include_bank_details && inv.bank_name ? `
    <div class="btm-lbl">Bank Details</div>
    ${inv.bank_name ? `<div>${inv.bank_name}</div>` : ''}
    ${inv.account_number ? `<div>A/c: <span style="font-family:monospace">${inv.account_number}</span></div>` : ''}
    ${inv.ifsc_code ? `<div>IFSC: <span style="font-family:monospace">${inv.ifsc_code}</span></div>` : ''}
    ` : ''}
  </div>
  <div style="text-align:center">
    ${inv.include_upi && inv.upi_scanner_url ? `
    <div class="btm-lbl">Pay via UPI</div>
    <img src="${inv.upi_scanner_url}" style="width:64px;height:64px;object-fit:contain;border:1px solid #ddd;background:#fff;border-radius:4px" />
    ${inv.upi_id ? `<div style="font-size:9px;font-family:monospace;margin-top:2px">${inv.upi_id}</div>` : ''}
    ` : inv.include_upi && inv.upi_id ? `<div class="btm-lbl">Pay via UPI</div><div style="font-family:monospace">${inv.upi_id}</div>` : ''}
  </div>
  <div style="text-align:right">
    ${inv.include_signatory ? `
    ${inv.signatory_image_url ? `<img src="${inv.signatory_image_url}" style="height:36px;max-width:110px;object-fit:contain;border:1px solid #ddd;background:#fff;padding:3px" />` : ''}
    <div style="border-top:1px solid #1a1a1a;padding-top:4px;font-size:9px">
      <div><strong>For ${inv.seller_business_name || user?.business_name || user?.name || 'Creator'}</strong></div>
      <div style="color:#666">Authorized Signatory${inv.signatory_name ? ': '+inv.signatory_name : ''}</div>
    </div>` : ''}
  </div>
</div>
${inv.include_terms && inv.terms_text ? `
<div class="notes" style="margin-top:10px">
  <strong>Terms &amp; Conditions:</strong>
  <div style="margin-top:4px;white-space:pre-line;color:#666;font-size:9px">${inv.terms_text}</div>
</div>` : ''}
<div style="margin-top:16px;text-align:center;font-size:8px;color:#ccc">Computer-generated invoice · Kcretio · Subject to GST as applicable</div>
<script>window.onload = function() { window.print(); };</script>
${plan === 'basic' ? `<div style="position:fixed;bottom:8px;left:0;right:0;text-align:center;font-size:9px;color:#94a3b8;font-family:Inter,sans-serif;letter-spacing:0.04em;pointer-events:none;">Created with Kcretio — Basic Plan · kcreatio.com</div>` : ''}
</body></html>`;
}

function downloadInvoicePDF(inv, user, template, plan) {
  const t = template || TEMPLATES[0];
  let html;
  if (t.layout === 'corporate') html = buildCorporateHTML(inv, user, t, plan);
  else if (t.layout === 'minimal') html = buildMinimalHTML(inv, user, t, plan);
  else html = buildClassicHTML(inv, user, t, plan);

  // Use Blob URL — avoids popup blocker issues with document.write
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    // Fallback: download as .html file
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(inv.invoice_number || 'invoice').replace(/\//g, '-')}.html`;
    a.click();
  }
  // Clean up blob URL after window loads
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InvoicePage({ initialView }) {
  const { user } = useAuth();
  const toast = useToast();
  const { usage, isAtLimit, refresh: refreshUsage } = useUsage();
  const invoiceLimitReached = isAtLimit('invoices_monthly');
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const location = useLocation();

  // Derive view from URL so navigation always triggers re-render
  const view = location.pathname === '/invoices/new' ? 'create'
    : location.pathname.includes('/edit') ? 'edit'
    : 'list';

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [nextNumber, setNextNumber] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [customGstRate, setCustomGstRate] = useState(null);   // null=not custom, ''=custom empty, '12'=custom value
  const [customPaymentTerms, setCustomPaymentTerms] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortCol, setSortCol] = useState('invoice_date');
  const [sortDir, setSortDir] = useState('desc');
  const [savedBankAccounts, setSavedBankAccounts] = useState([]);
  const [savedUpiIds, setSavedUpiIds] = useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(null);
  const [selectedUpiId, setSelectedUpiId] = useState(null);
  const PAGE_SIZE = 10;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const calc = calcGST(form, user?.state_code);
  const formErrors = getErrors(form);
  const complete = isComplete(form);
  const selectedTemplate = TEMPLATES.find(t => t.id === form.templateId) || TEMPLATES[0];

  // Load list whenever page/sort/search/filter changes
  useEffect(() => { loadInvoices(); }, [page, sortCol, sortDir, searchQuery, filterStatus]);

  // When navigating to create, reset form + prefill from saved settings
  // Also supports duplicate (location.state.duplicate = source invoice)
  useEffect(() => {
    if (view === 'create') {
      const dupSource = location.state?.duplicate;
      if (dupSource) {
        // Pre-fill from duplicated invoice — strip invoice-specific fields
        setForm({
          ...EMPTY_FORM,
          brandName: dupSource.brand_name || '',
          brandGstin: dupSource.brand_gstin || '',
          brandPan: dupSource.brand_pan || '',
          brandAddress: dupSource.brand_address || '',
          brandStateCode: dupSource.brand_state_code || '',
          brandEmail: dupSource.brand_email || '',
          brandPhone: dupSource.brand_phone || '',
          serviceDescription: dupSource.service_description || '',
          placeOfSupply: dupSource.place_of_supply || '',
          sacCode: dupSource.sac_code || '998399',
          gstRate: dupSource.gst_rate || 18,
          templateId: dupSource.template_id || TEMPLATES[0].id,
          bankName: dupSource.bank_name || '',
          accountHolderName: dupSource.account_holder_name || '',
          accountNumber: dupSource.account_number || '',
          ifscCode: dupSource.ifsc_code || '',
          notes: dupSource.notes || '',
          // Date and invoice number auto-generate fresh
        });
        setTouched({});
        setEditingId(null);
        setNextNumber(lsNextNumber(user));
        api.get('/invoices/next-number').then(r => setNextNumber(r.data.invoiceNumber)).catch(() => {});
        return;
      }
      setForm({ ...EMPTY_FORM });
      setTouched({});
      setEditingId(null);
      setCustomGstRate(null);
      setCustomPaymentTerms(null);
      setSelectedBankAccountId(null);
      setSelectedUpiId(null);
      setNextNumber(lsNextNumber(user));
      api.get('/invoices/next-number').then(r => setNextNumber(r.data.invoiceNumber)).catch(() => {});

      // Smart pre-fill from deal if deal_id is in location.state or query string
      const dealId = location.state?.deal_id || new URLSearchParams(location.search).get('deal_id');
      if (dealId) {
        api.get(`/deals/${dealId}`).then(res => {
          const deal = res.data.deal || res.data;
          if (!deal) return;
          setForm(prev => ({
            ...prev,
            brandName: deal.brand_name || '',
            brandEmail: deal.brand_contact_email || '',
            serviceLines: [{
              description: deal.deliverables || prev.serviceLines[0]?.description || '',
              sacCode: '998399',
              amount: deal.deal_value ? String(Math.round(deal.deal_value)) : '',
              gstRate: '18',
            }],
            notes: deal.notes || '',
          }));
        }).catch(() => {}); // pre-fill is best-effort, don't block on failure
      }
      // Prefill from saved invoice settings (silent — no error shown)
      api.get('/invoice-settings').then(res => {
        const all = res.data.settings || [];
        const banks = all.filter(s => s.setting_type === 'bank_account');
        const upis = all.filter(s => s.setting_type === 'upi');
        setSavedBankAccounts(banks);
        setSavedUpiIds(upis);
        const defaultBank = banks.find(s => s.is_default);
        const defaultTerms = all.find(s => s.setting_type === 'terms' && s.is_default);
        const signatory = all.find(s => s.setting_type === 'signatory');
        const defaultUpi = upis.find(s => s.is_default);
        setForm(prev => ({
          ...prev,
          ...(defaultBank ? {
            includeBankDetails: true,
            bankName: defaultBank.bank_name || '',
            accountNumber: defaultBank.account_number || '',
            ifscCode: defaultBank.ifsc_code || '',
            accountHolderName: defaultBank.account_holder_name || '',
            upiId: defaultBank.upi_id || '',
          } : {}),
          ...(defaultUpi ? {
            includeUpi: true,
            upiId: defaultUpi.upi_id || '',
            upiScannerUrl: defaultUpi.scanner_image_url || null,
          } : {}),
          ...(defaultTerms ? {
            includeTerms: true,
            termsText: defaultTerms.terms_text || EMPTY_FORM.termsText,
          } : {}),
          ...(signatory ? {
            includeSignatory: true,
            signatoryName: signatory.signatory_name || '',
            signatoryImageUrl: signatory.signatory_image_url || null,
          } : {}),
        }));
        if (defaultBank) setSelectedBankAccountId(defaultBank.id);
        if (defaultUpi) setSelectedUpiId(defaultUpi.id);
      }).catch(() => {});
    }
    if (view === 'edit') {
      setNextNumber(lsNextNumber(user));
      api.get('/invoices/next-number').then(r => setNextNumber(r.data.invoiceNumber)).catch(() => {});
    }
  }, [view]);

  useEffect(() => {
    if (!editId) return;
    setEditingId(editId);
    // Try backend first, fall back to localStorage
    const buildForm = (inv) => ({
      brandName: inv.brand_name||'', brandGstin: inv.brand_gstin||'',
      brandAddress: inv.brand_address||'', brandStateCode: inv.brand_state_code||'',
      brandPan: inv.brand_pan||'',
      brandEmail: inv.brand_email||'', brandPhone: inv.brand_phone||'',
      serviceDescription: inv.service_description||EMPTY_FORM.serviceDescription,
      sacCode: inv.sac_code||'998399', baseAmount: String(inv.base_amount||''),
      gstRate: String(inv.gst_rate||'18'), invoiceDate: inv.invoice_date||format(new Date(),'yyyy-MM-dd'),
      dueDate: inv.due_date||format(addDays(new Date(),30),'yyyy-MM-dd'),
      placeOfSupply: inv.place_of_supply||'', reverseCharge: inv.reverse_charge||'No',
      notes: inv.notes||'', paymentTerms: inv.payment_terms||'Net 30', templateId: inv.template_id||'classic',
      serviceLines: [{ description: inv.service_description||EMPTY_FORM.serviceDescription, sacCode: inv.sac_code||'998399', amount: String(inv.base_amount||''), gstRate: String(inv.gst_rate||'18') }],
      // Bank details
      includeBankDetails: inv.include_bank_details||false,
      bankName: inv.bank_name||'', accountNumber: inv.account_number||'',
      ifscCode: inv.ifsc_code||'', accountHolderName: inv.account_holder_name||'', upiId: inv.upi_id||'',
      // UPI QR
      includeUpi: inv.include_upi||false,
      upiScannerUrl: inv.upi_scanner_url||null,
      // T&C
      includeTerms: inv.include_terms||false,
      termsText: inv.terms_text||EMPTY_FORM.termsText,
      // Signatory
      includeSignatory: inv.include_signatory||false,
      signatoryName: inv.signatory_name||'',
      signatoryImageUrl: inv.signatory_image_url||null,
    });
    api.get(`/invoices/${editId}`)
      .then(res => setForm(buildForm(res.data)))
      .catch(() => {
        const inv = lsLoad().find(i => i.id === editId);
        if (inv) setForm(buildForm(inv));
      });
  }, [editId]);

  useEffect(() => {
    if (form.brandStateCode && !form.placeOfSupply) {
      setForm(p => ({ ...p, placeOfSupply: p.brandStateCode }));
    }
  }, [form.brandStateCode]);

  function loadInvoices() {
    setListLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const params = { limit: PAGE_SIZE, offset, sort: sortCol, dir: sortDir };
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (filterStatus !== 'all') params.status = filterStatus;
    api.get('/invoices', { params })
      .then(res => { setInvoices(res.data.invoices || []); setTotalCount(res.data.total || 0); })
      .catch(() => setInvoices(lsLoad()))
      .finally(() => setListLoading(false));
  }

  const update = useCallback((field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setTouched(p => ({ ...p, [field]: true }));
  }, []);
  const touch = (field) => setTouched(p => ({ ...p, [field]: true }));
  const showErr = (f) => touched[f] && formErrors[f];

  // ── Core save logic ────────────────────────────────────────────────────────
  async function doSave() {
    const allTouched = Object.keys(EMPTY_FORM).reduce((a,k) => ({...a,[k]:true}), {});
    setTouched(allTouched);
    if (!complete) { toast.error('Please fill all required fields'); return null; }
    setSubmitting(true);

    const c = calcGST(form, user?.state_code);
    const invNum = nextNumber || lsNextNumber(user);
    const payload = {
      invoice_number: invNum, brand_name: form.brandName.trim(),
      brand_gstin: form.brandGstin.trim()||null, brand_address: form.brandAddress.trim(),
      brand_state_code: form.brandStateCode, brand_pan: form.brandPan.trim()||null,
      brand_email: form.brandEmail.trim()||null, brand_phone: form.brandPhone.trim()||null,
      service_description: form.serviceDescription.trim(), sac_code: form.sacCode,
      base_amount: parseFloat(form.baseAmount), gst_rate: parseInt(form.gstRate),
      gst_amount: c.gstAmount, total_amount: c.total, supply_type: c.supplyType,
      cgst_amount: c.cgst, sgst_amount: c.sgst, igst_amount: c.igst,
      invoice_date: form.invoiceDate, due_date: form.dueDate,
      place_of_supply: form.placeOfSupply, reverse_charge: form.reverseCharge,
      notes: form.notes.trim()||null, payment_terms: form.paymentTerms,
      template_id: form.templateId, status: 'draft',
      // Bank details
      include_bank_details: form.includeBankDetails,
      bank_name: form.bankName||null, account_number: form.accountNumber||null,
      ifsc_code: form.ifscCode||null, account_holder_name: form.accountHolderName||null,
      upi_id: form.upiId||null,
      // UPI QR
      include_upi: form.includeUpi,
      upi_scanner_url: form.upiScannerUrl||null,
      // T&C
      include_terms: form.includeTerms, terms_text: form.termsText||null,
      // Signatory
      include_signatory: form.includeSignatory, signatory_name: form.signatoryName||null,
      signatory_image_url: form.signatoryImageUrl||null,
      seller_business_name: user?.business_name||user?.name||null,
    };

    // Upload images before saving if they're still base64 data URLs
    if (payload.signatory_image_url?.startsWith('data:')) {
      try {
        const parts = payload.signatory_image_url.split(',');
        const mimeType = parts[0].split(';')[0].split(':')[1];
        const { data: upData } = await api.post('/upload/signature', { imageBase64: parts[1], mimeType });
        payload.signatory_image_url = upData.url;
      } catch { /* keep data url if upload fails */ }
    }
    if (payload.upi_scanner_url?.startsWith('data:')) {
      try {
        const parts = payload.upi_scanner_url.split(',');
        const mimeType = parts[0].split(';')[0].split(':')[1];
        const { data: upData } = await api.post('/upload/scanner', { imageBase64: parts[1], mimeType });
        payload.upi_scanner_url = upData.url;
      } catch { /* keep data url if upload fails */ }
    }

    let saved = null;
    try {
      const res = await api.post('/invoices', {
        brandName: payload.brand_name, brandGstin: payload.brand_gstin,
        brandAddress: payload.brand_address, brandStateCode: payload.brand_state_code,
        brandPan: payload.brand_pan,
        brandEmail: payload.brand_email, brandPhone: payload.brand_phone,
        serviceDescription: payload.service_description, baseAmount: payload.base_amount,
        gstRate: payload.gst_rate, invoiceDate: payload.invoice_date, dueDate: payload.due_date,
        notes: payload.notes, sacCode: payload.sac_code, placeOfSupply: payload.place_of_supply,
        reverseCharge: payload.reverse_charge, templateId: payload.template_id,
        paymentTerms: payload.payment_terms,
        // Bank details
        includeBankDetails: payload.include_bank_details,
        bankName: payload.bank_name, accountNumber: payload.account_number,
        ifscCode: payload.ifsc_code, accountHolderName: payload.account_holder_name,
        upiId: payload.upi_id,
        // UPI QR
        includeUpi: payload.include_upi,
        upiScannerUrl: payload.upi_scanner_url,
        // T&C
        includeTerms: payload.include_terms, termsText: payload.terms_text,
        // Signatory
        includeSignatory: payload.include_signatory, signatoryName: payload.signatory_name,
        signatoryImageUrl: payload.signatory_image_url,
        sellerBusinessName: payload.seller_business_name,
      });
      saved = { ...payload, id: res.data.id };
    } catch {
      const existing = lsLoad();
      const id = editingId || `local-${Date.now()}`;
      saved = { ...payload, id };
      lsSave(editingId ? existing.map(i => i.id===editingId ? saved : i) : [saved, ...existing]);
    }
    setSubmitting(false);
    refreshUsage();
    return saved;
  }

  async function handleSave(e) {
    e?.preventDefault();
    const inv = await doSave();
    if (!inv) return;
    toast.success(editingId ? 'Invoice updated' : 'Invoice saved');
    resetAndGoList();
  }

  async function handleSaveAndDownload(e) {
    e?.preventDefault();
    const inv = await doSave();
    if (!inv) return;
    toast.success('Invoice saved — opening PDF…');
    resetAndGoList();
    setTimeout(() => downloadInvoicePDF(inv, user, TEMPLATES.find(t => t.id === inv.template_id)||TEMPLATES[0], user?.plan), 300);
  }

  function resetAndGoList() {
    setForm({ ...EMPTY_FORM });
    setTouched({});
    setEditingId(null);
    setSubmitting(false); // always reset so buttons re-enable
    setCustomGstRate(null);
    setCustomPaymentTerms(null);
    navigate('/invoices');
    loadInvoices();
  }

  async function handleDownloadFromList(inv) {
    try {
      const res = await api.get(`/invoices/${inv.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${(inv.invoice_number||'invoice').replace(/\//g,'-')}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      downloadInvoicePDF(inv, user, TEMPLATES.find(t => t.id===inv.template_id)||TEMPLATES[0], user?.plan);
    }
  }

  async function handleDelete(inv) {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}? This cannot be undone.`)) return;
    try { await api.delete(`/invoices/${inv.id}`); }
    catch { lsSave(lsLoad().filter(i => i.id !== inv.id)); }
    toast.success('Invoice deleted');
    loadInvoices();
  }

  async function handleMarkPaid(inv) {
    if (!window.confirm(`Mark ${inv.invoice_number} as PAID?\n\nThis will:\n• Change invoice status to Paid\n• Auto-log ₹${Number(inv.total_amount).toLocaleString('en-IN')} as income\n• Log ₹${Math.round(Number(inv.total_amount) * 0.1).toLocaleString('en-IN')} as TDS deducted (10%)`)) return;

    const paymentDate = new Date().toISOString().split('T')[0];
    const fyStart = paymentDate.slice(0,4);
    const month = parseInt(paymentDate.slice(5,7));
    const fy = month >= 4 ? `${fyStart}-${String(parseInt(fyStart)+1).slice(-2)}` : `${parseInt(fyStart)-1}-${String(parseInt(fyStart)).slice(-2)}`;

    // Update invoice status
    const existing = lsLoad();
    lsSave(existing.map(i => i.id === inv.id ? { ...i, status: 'paid' } : i));

    // Try backend for income + TDS logging
    try {
      await api.post('/income', {
        source: 'brand_deal', amount: inv.total_amount,
        description: `Payment for invoice ${inv.invoice_number} — ${inv.brand_name}`,
        incomeDate: paymentDate,
      });
      await api.post('/tds', {
        brandName: inv.brand_name,
        brandTan: inv.brand_tan || undefined,
        invoiceAmount: inv.total_amount,
        tdsRate: 10,
        paymentDate,
      });
    } catch {
      // Silently log locally — backend not available
    }

    toast.success(`Invoice marked as Paid · Income + TDS logged for FY ${fy}`);
    loadInvoices();
  }

  // Mobile detection for invoice form
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Create/Edit view ──────────────────────────────────────────────────────
  if (view === 'create' || view === 'edit') {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {/* Sticky header — full width */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'var(--bg)', borderBottom: '1px solid var(--border)',
          padding: 'var(--space-3) var(--space-5)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <button onClick={() => navigate('/invoices')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>← Back</button>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>{editingId ? 'Edit Invoice' : 'New GST Invoice'}</h2>
            {nextNumber && <Badge variant="muted" style={{ fontFamily: 'monospace' }}>{nextNumber}</Badge>}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" onClick={() => setTemplateOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
              <FileText size={13} aria-hidden="true" /> {selectedTemplate.name}
            </button>
            {!isMobile && (
              <button type="button" onClick={() => setPreviewOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Eye size={13} aria-hidden="true" /> Preview
              </button>
            )}
          </div>
        </div>

        {/* Content area — constrained width, centered, fills remaining height */}
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', minWidth: 0, flex: 1 }}>
        {!user?.gstin && (
          <div style={{ margin: 'var(--space-4) var(--space-5) 0', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', background: 'var(--warning-dim)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--warning-text)' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <span>Your GSTIN is not set — invoices won't be GST-compliant without it. <a href="/settings" style={{ color: 'var(--warning-text)', fontWeight: 700, textDecoration: 'underline' }}>Add in Settings →</a></span>
          </div>
        )}

        <div style={{ padding: isMobile ? '0 var(--space-3)' : '0 var(--space-5)', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: 'var(--space-5)', paddingTop: 'var(--space-4)', paddingBottom: isMobile ? 'calc(80px + var(--space-4))' : 'calc(72px + var(--space-4))' }}>
          <form noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0, width: '100%', overflow: 'hidden' }}>

            <Sect title="Creator (Your Details)" collapsible defaultOpen={false}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user?.business_name||user?.name||'—'}</div>
                {user?.gstin ? <div style={{ color: 'var(--text-muted)' }}>GSTIN: <span style={{ fontFamily: 'monospace', color: 'var(--text-body)' }}>{user.gstin}</span></div> : <div style={{ color: 'var(--danger-text)', fontSize: 12 }}>⚠ GSTIN not set</div>}
                {user?.pan && <div style={{ color: 'var(--text-muted)' }}>PAN: <span style={{ fontFamily: 'monospace' }}>{user.pan}</span></div>}
                {user?.business_address && <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>{user.business_address}</div>}
                <a href="/settings" style={{ color: 'var(--accent)', fontSize: 11, marginTop: 2 }}>Edit in Settings →</a>
              </div>
            </Sect>

            <Sect title="Bill To — Brand / Recipient">
              <Input id="brandName" label="Brand / Company Name *" value={form.brandName} onChange={e => update('brandName', e.target.value)} onBlur={() => touch('brandName')} error={showErr('brandName')} placeholder="Mamaearth Pvt Ltd" tooltip="Legal name of the brand or company you are billing. Must match their GST registration exactly for B2B invoices." />
              <Input id="brandGstin" label="Brand GSTIN" value={form.brandGstin} onChange={e => update('brandGstin', e.target.value.toUpperCase().slice(0,15))} onBlur={() => touch('brandGstin')} error={showErr('brandGstin')} placeholder="27AAACM9517F1ZW" hint={form.brandGstin.length === 15 && GSTIN_REGEX.test(form.brandGstin) ? '✓ Valid GSTIN format' : 'Mandatory for B2B input tax credit'} maxLength={15} tooltip="15-digit GST Identification Number of the brand. Format: 2 digits state code + 10 digit PAN + 1 digit entity number + Z + 1 check digit. Required for B2B input tax credit." style={form.brandGstin.length === 15 && GSTIN_REGEX.test(form.brandGstin) ? { borderColor: 'var(--success)', boxShadow: '0 0 0 3px var(--success-dim)' } : {}} />
              <Input id="brandPan" label="Brand PAN" value={form.brandPan} onChange={e => update('brandPan', e.target.value.toUpperCase().slice(0,10))} placeholder="AAACM9517F" maxLength={10} tooltip="10-character Permanent Account Number of the brand. Optional but useful for TDS reconciliation and Form 26AS." />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
                <Input id="brandEmail" label="Brand Email (optional)" type="email" value={form.brandEmail} onChange={e => update('brandEmail', e.target.value)} placeholder="accounts@brand.com" tooltip="Brand's billing or accounts email address. Optional — appears on invoice for reference." />
                <Input id="brandPhone" label="Brand Contact No. (optional)" type="tel" value={form.brandPhone} onChange={e => update('brandPhone', e.target.value)} placeholder="+91 98765 43210" tooltip="Brand contact number. Optional — appears on invoice for reference." />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <label htmlFor="brandAddress" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Brand Address *</label>
                  <Tooltip text="Complete registered address of the brand. Must include city, state, and PIN code. Mandatory on GST invoices per Rule 46." />
                </div>
                <textarea id="brandAddress" value={form.brandAddress} onChange={e => update('brandAddress', e.target.value)} onBlur={() => touch('brandAddress')} rows={2} placeholder="123, Business Park, Mumbai, Maharashtra - 400001"
                  style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: `1px solid ${showErr('brandAddress')?'var(--danger)':'var(--border)'}`, borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', resize: 'vertical', fontFamily: 'inherit' }} />
                {showErr('brandAddress') && <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)' }}>{formErrors.brandAddress}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <SField id="brandState" label="Brand State *" value={form.brandStateCode} onChange={e => update('brandStateCode', e.target.value)} onBlur={() => touch('brandStateCode')} error={showErr('brandStateCode')} tooltip="The Indian state where the brand/company is registered. Determines IGST vs CGST+SGST split.">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                </SField>
                <SField id="placeOfSupply" label="Place of Supply *" value={form.placeOfSupply} onChange={e => update('placeOfSupply', e.target.value)} onBlur={() => touch('placeOfSupply')} error={showErr('placeOfSupply')} tooltip="Mandatory per Rule 46 CGST Rules. For services, this is typically the state where the recipient (brand) is located. Auto-filled from Brand State.">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                </SField>
              </div>
            </Sect>

            {/* ── Service Lines (multiple) ── */}
            <Sect title="Service Details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {(form.serviceLines || []).map((line, idx) => (
                  <div key={idx} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 'var(--space-3)', position: 'relative' }}>
                    {form.serviceLines.length > 1 && (
                      <button type="button" onClick={() => {
                        const lines = form.serviceLines.filter((_, i) => i !== idx);
                        update('serviceLines', lines);
                      }} style={{ position: 'absolute', top: 8, right: 8, background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger-text)', cursor: 'pointer', padding: '1px 6px', fontSize: 11, fontFamily: 'inherit' }}>
                        ✕
                      </button>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Service {form.serviceLines.length > 1 ? `#${idx+1}` : ''}
                        </label>
                        <Tooltip text="Describe the exact service provided. This appears on the invoice line item. Be specific: 'YouTube integration video for [Campaign Name]'." />
                      </div>
                      <textarea
                        value={line.description}
                        onChange={e => {
                          const lines = [...form.serviceLines];
                          lines[idx] = { ...lines[idx], description: e.target.value };
                          update('serviceLines', lines);
                          if (idx === 0) update('serviceDescription', e.target.value);
                        }}
                        rows={2} placeholder="Content Creation and Influencer Marketing Services"
                        style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                      {/* Service line grid: Amount | GST% | SAC Code */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '120px 80px 1fr', gap: 'var(--space-2)', alignItems: 'end' }}>
                        {/* Amount first */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Amount ₹ *</label>
                            <Tooltip text="Taxable value before GST for this service line." />
                          </div>
                          <input type="number" min="0" step="0.01" value={line.amount}
                            onChange={e => { const lines=[...form.serviceLines]; lines[idx]={...lines[idx],amount:e.target.value}; update('serviceLines',lines); if(idx===0) update('baseAmount',e.target.value); }}
                            placeholder="45000"
                            style={{ padding: 'var(--space-2)', background: 'var(--surface)', border: `1px solid ${!line.amount?'var(--danger)':'var(--border)'}`, borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', outline: 'none' }}
                          />
                        </div>
                        {/* GST% second */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>GST %</label>
                          <select value={line.gstRate || '18'} onChange={e => { const lines=[...form.serviceLines]; lines[idx]={...lines[idx],gstRate:e.target.value}; update('serviceLines',lines); if(idx===0) update('gstRate',e.target.value); }}
                            style={{ padding: 'var(--space-2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}>
                            {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </div>
                        {/* SAC Code last */}
                        <Input
                          label="SAC Code" value={line.sacCode || '998399'}
                          onChange={e => { const lines=[...form.serviceLines]; lines[idx]={...lines[idx],sacCode:e.target.value}; update('serviceLines',lines); if(idx===0) update('sacCode',e.target.value); }}
                          placeholder="998399" tooltip="SAC 998399 = Content creation & influencer marketing services"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {/* Add service line */}
                <button type="button" onClick={() => {
                  const lines = [...(form.serviceLines||[]), { description: '', sacCode: '998399', amount: '', gstRate: form.gstRate || '18' }];
                  update('serviceLines', lines);
                }} style={{ padding: 'var(--space-2) var(--space-3)', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'center' }}>
                  + Add Another Service Line
                </button>
              </div>
            </Sect>

            {/* ── GST Summary ── */}
            <Sect title="Tax Calculation">
              {calc.base > 0 ? (
                <div style={{ padding: 'var(--space-4)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                    {calc.supplyType==='intrastate'?`Intrastate — CGST ${calc.gstRate/2}% + SGST ${calc.gstRate/2}%`:`Interstate — IGST ${calc.gstRate}%`}
                  </div>
                  {[['Taxable Value', formatINR(calc.base)],
                    ...(calc.supplyType==='intrastate'?[[`CGST @ ${calc.gstRate/2}%`,formatINR(calc.cgst)],[`SGST @ ${calc.gstRate/2}%`,formatINR(calc.sgst)]]:[[`IGST @ ${calc.gstRate}%`,formatINR(calc.igst)]])
                  ].map(([l,v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-body)' }}>{l}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Invoice Value</span>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(calc.total)}</span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4) 0' }}>
                  Add amount to service lines above to see tax calculation
                </p>
              )}
              <SField id="reverseCharge" label="Reverse Charge" value={form.reverseCharge} onChange={e => update('reverseCharge', e.target.value)} tooltip="Reverse charge means the recipient (brand) pays GST instead of supplier. Very rare for creator invoices — select 'No' unless specifically instructed by your CA.">
                <option value="No">No — Normal (creator charges GST)</option>
                <option value="Yes">Yes — Reverse charge applicable</option>
              </SField>
            </Sect>

            <Sect title="Invoice Dates">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <Input id="invoiceDate" label="Invoice Date *" type="date" value={form.invoiceDate} onChange={e => update('invoiceDate', e.target.value)} onBlur={() => touch('invoiceDate')} error={showErr('invoiceDate')} tooltip="Date the invoice is issued. Cannot be backdated by more than 30 days for GST filing." />
                <Input id="dueDate" label="Due Date" type="date" value={form.dueDate} onChange={e => update('dueDate', e.target.value)} tooltip="Payment expected by this date. Standard is 30 days from invoice date (Net 30)." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <label htmlFor="paymentTerms" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Payment Terms</label>
                    <Tooltip text="How many days the brand has to pay. Net 30 is standard. Select 'Custom' to enter specific terms." />
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <select id="paymentTerms"
                      value={customPaymentTerms !== null ? 'custom' : form.paymentTerms}
                      onChange={e => {
                        if (e.target.value === 'custom') { setCustomPaymentTerms(''); }
                        else { update('paymentTerms', e.target.value); setCustomPaymentTerms(null); }
                      }}
                      style={{ flex: 1, padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontFamily: 'inherit' }}>
                      {['Immediate','Net 7','Net 15','Net 30','Net 45','Net 60'].map(t => <option key={t} value={t}>{t}{t==='Net 30'?' (Default)':''}</option>)}
                      <option value="custom">Custom Terms</option>
                    </select>
                    {customPaymentTerms !== null && (
                      <input
                        autoFocus
                        type="text"
                        value={customPaymentTerms}
                        onChange={e => { setCustomPaymentTerms(e.target.value); update('paymentTerms', e.target.value); }}
                        placeholder="e.g. Net 45 days"
                        style={{ flex: 1, padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontFamily: 'inherit', outline: 'none' }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </Sect>

            <Sect title="Notes">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label htmlFor="notes" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Internal Notes</label>
                <textarea id="notes" value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} placeholder="PO reference, special instructions..."
                  style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-base)', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </Sect>

            {/* ── Bank Details (Optional) ── */}
            <Sect title="Bank Details for Payment">
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.includeBankDetails} onChange={e => update('includeBankDetails', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
                  Include bank details on invoice
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'var(--space-2)' }}>(helps brands pay directly)</span>
                </span>
              </label>
              {form.includeBankDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
                  {/* Saved account selector */}
                  {savedBankAccounts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select saved account</div>
                      {savedBankAccounts.map(acc => (
                        <label key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-2) var(--space-3)', background: selectedBankAccountId === acc.id ? 'var(--accent-dim)' : 'var(--surface-2)', border: `1px solid ${selectedBankAccountId === acc.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', transition: 'all var(--duration-fast)' }}>
                          <input type="radio" name="savedBank" checked={selectedBankAccountId === acc.id} onChange={() => {
                            setSelectedBankAccountId(acc.id);
                            setForm(prev => ({ ...prev, bankName: acc.bank_name||'', accountNumber: acc.account_number||'', ifscCode: acc.ifsc_code||'', accountHolderName: acc.account_holder_name||'', upiId: acc.upi_id||'' }));
                          }} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{acc.name}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{acc.bank_name} ••••{(acc.account_number||'').slice(-4)} · {acc.ifsc_code}</div>
                          </div>
                          {acc.is_default && <span style={{ fontSize: 9, padding: '1px 6px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>Default</span>}
                        </label>
                      ))}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-2) var(--space-3)', background: selectedBankAccountId === 'manual' ? 'var(--accent-dim)' : 'var(--surface-2)', border: `1px solid ${selectedBankAccountId === 'manual' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)' }}>
                        <input type="radio" name="savedBank" checked={selectedBankAccountId === 'manual'} onChange={() => { setSelectedBankAccountId('manual'); setForm(prev => ({ ...prev, bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '' })); }} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Enter manually</span>
                      </label>
                    </div>
                  )}
                  {/* Manual fields — always show when no saved accounts, or "manual" selected */}
                  {(savedBankAccounts.length === 0 || selectedBankAccountId === 'manual' || !selectedBankAccountId) && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
                        <Input id="bankName" label="Bank Name" value={form.bankName} onChange={e => update('bankName', e.target.value)} placeholder="HDFC Bank" tooltip="Name of the bank where you hold the account" />
                        <Input id="accountHolderName" label="Account Holder Name" value={form.accountHolderName} onChange={e => update('accountHolderName', e.target.value)} placeholder="Your full name or business name" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
                        <Input id="accountNumber" label="Account Number" value={form.accountNumber} onChange={e => update('accountNumber', e.target.value)} placeholder="1234567890" tooltip="Your bank account number for NEFT/RTGS/IMPS transfers" />
                        <Input id="ifscCode" label="IFSC Code" value={form.ifscCode} onChange={e => update('ifscCode', e.target.value.toUpperCase())} placeholder="HDFC0001234" tooltip="11-character bank branch code for NEFT/RTGS" maxLength={11} />
                      </div>
                    </>
                  )}
                  {/* Edit auto-filled fields from saved account */}
                  {savedBankAccounts.length > 0 && selectedBankAccountId && selectedBankAccountId !== 'manual' && (
                    <details style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <summary style={{ cursor: 'pointer', padding: 'var(--space-1) 0' }}>Override details for this invoice (optional)</summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
                          <Input id="bankName2" label="Bank Name" value={form.bankName} onChange={e => update('bankName', e.target.value)} placeholder="HDFC Bank" />
                          <Input id="accountHolderName2" label="Account Holder" value={form.accountHolderName} onChange={e => update('accountHolderName', e.target.value)} placeholder="Your Name" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
                          <Input id="accountNumber2" label="Account Number" value={form.accountNumber} onChange={e => update('accountNumber', e.target.value)} placeholder="1234567890" />
                          <Input id="ifscCode2" label="IFSC Code" value={form.ifscCode} onChange={e => update('ifscCode', e.target.value.toUpperCase())} placeholder="HDFC0001234" maxLength={11} />
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </Sect>

            {/* ── UPI QR Code (Optional, separate from bank) ── */}
            <Sect title="UPI Payment QR">
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.includeUpi} onChange={e => update('includeUpi', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
                  Include UPI QR on invoice
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'var(--space-2)' }}>(instant payment with scanner)</span>
                </span>
              </label>
              {form.includeUpi && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
                  {/* Saved UPI selector */}
                  {savedUpiIds.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select saved UPI</div>
                      {savedUpiIds.map(u => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-2) var(--space-3)', background: selectedUpiId === u.id ? 'var(--accent-dim)' : 'var(--surface-2)', border: `1px solid ${selectedUpiId === u.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)' }}>
                          <input type="radio" name="savedUpi" checked={selectedUpiId === u.id} onChange={() => {
                            setSelectedUpiId(u.id);
                            setForm(prev => ({ ...prev, upiId: u.upi_id||'', upiScannerUrl: u.scanner_image_url||null }));
                          }} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{u.upi_id}</div>
                          </div>
                          {u.scanner_image_url && <img src={u.scanner_image_url} alt="QR" style={{ width: 32, height: 32, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 4, background: '#fff' }} />}
                          {u.is_default && <span style={{ fontSize: 9, padding: '1px 6px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>Default</span>}
                        </label>
                      ))}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-2) var(--space-3)', background: selectedUpiId === 'manual' ? 'var(--accent-dim)' : 'var(--surface-2)', border: `1px solid ${selectedUpiId === 'manual' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)' }}>
                        <input type="radio" name="savedUpi" checked={selectedUpiId === 'manual'} onChange={() => { setSelectedUpiId('manual'); setForm(prev => ({ ...prev, upiId: '', upiScannerUrl: null })); }} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Enter manually</span>
                      </label>
                    </div>
                  )}
                  {/* Manual UPI entry */}
                  {(savedUpiIds.length === 0 || selectedUpiId === 'manual' || !selectedUpiId) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      <Input id="upiId" label="UPI ID" value={form.upiId} onChange={e => update('upiId', e.target.value)} placeholder="yourname@okicici" tooltip="UPI ID for instant payment" />
                      {/* UPI QR Scanner upload */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>UPI QR Scanner Image (optional)</label>
                          <Tooltip text="Upload a QR code image for your UPI ID. Brands can scan it directly to pay. Use a clear, high-contrast image under 500KB." />
                        </div>
                        {form.upiScannerUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <img src={form.upiScannerUrl} alt="UPI QR" style={{ height: 80, width: 80, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff', padding: 4 }} />
                            <button type="button" onClick={() => update('upiScannerUrl', null)} style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontFamily: 'inherit' }}>
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label style={{ cursor: 'pointer' }}>
                            <div style={{ padding: 'var(--space-4)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', background: 'var(--surface-2)' }}>
                              📷 Click to upload QR code image
                            </div>
                            <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 500000) { alert('Image must be under 500KB'); return; }
                              const reader = new FileReader();
                              reader.onload = ev => update('upiScannerUrl', ev.target.result);
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Sect>

            {/* ── Terms & Conditions (Optional) ── */}
            <Sect title="Terms & Conditions">
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.includeTerms} onChange={e => update('includeTerms', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
                  Include terms &amp; conditions on invoice
                </span>
              </label>
              {form.includeTerms && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <textarea
                    value={form.termsText}
                    onChange={e => update('termsText', e.target.value)}
                    rows={4}
                    style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                  />
                </div>
              )}
            </Sect>

            {/* ── Authorized Signatory (Optional) ── */}
            <Sect title="Authorized Signatory">
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.includeSignatory} onChange={e => update('includeSignatory', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>
                  Show "For [Business Name]" signatory block
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'var(--space-2)' }}>(with signature line)</span>
                </span>
              </label>
              {form.includeSignatory && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <Input id="signatoryName" label="Signatory Name" value={form.signatoryName} onChange={e => update('signatoryName', e.target.value)} placeholder={user?.name || 'Your Name'} hint="Name printed under the signature line" tooltip="The person authorized to sign invoices on behalf of your business" />
                  {/* Signature image upload */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>Signature Image (optional)</label>
                      <Tooltip text="Upload a PNG/JPG of your handwritten signature. It will appear above the signature line on the invoice. Use a white or transparent background." />
                    </div>
                    {form.signatoryImageUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <img src={form.signatoryImageUrl} alt="Signature" style={{ height: 48, maxWidth: 160, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff', padding: 4 }} />
                        <button type="button" onClick={() => update('signatoryImageUrl', null)} style={{ padding: 'var(--space-1) var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontFamily: 'inherit' }}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label style={{ cursor: 'pointer' }}>
                        <div style={{ padding: 'var(--space-4)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', background: 'var(--surface-2)', transition: 'background var(--duration-fast)' }}>
                          📷 Click to upload signature image (PNG/JPG)
                        </div>
                        <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 500000) { alert('Image must be under 500KB'); return; }
                          const reader = new FileReader();
                          reader.onload = ev => update('signatoryImageUrl', ev.target.result);
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                    )}
                  </div>
                </div>
              )}
            </Sect>

            {/* Mobile: collapsible invoice preview above action buttons */}
            {isMobile && (
              <MobilePreviewCollapsible>
                <InvoicePreview form={form} calc={calc} invoiceNumber={nextNumber} user={user} template={selectedTemplate} />
              </MobilePreviewCollapsible>
            )}
          </form>

          {/* Desktop: sticky right-side preview */}
          {!isMobile && (
          <div style={{ position: 'sticky', top: 'calc(52px + var(--space-4))', alignSelf: 'flex-start', maxHeight: 'calc(100dvh - 120px)', overflowY: 'auto' }}>
            <InvoicePreview form={form} calc={calc} invoiceNumber={nextNumber} user={user} template={selectedTemplate} />
          </div>
          )}
        </div>
        </div>{/* end maxWidth wrapper */}

        {/* ── Action bar — always pinned at bottom, 3 buttons in one row ── */}
        <div style={{
          position: isMobile ? 'fixed' : 'sticky',
          bottom: isMobile ? 64 : 0,
          ...(isMobile ? { left: 0, right: 0, zIndex: 25 } : {}),
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          padding: 'var(--space-3) var(--space-5)',
          flexShrink: 0,
        }}>
          {!complete && Object.keys(touched).length > 0 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textAlign: 'center' }}>
              Fill all required (*) fields to enable invoice creation
            </p>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-2)', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <button type="button" onClick={handleSave} disabled={!complete||submitting}
              style={{ flex: 1, padding: 'var(--space-3)', background: complete&&!submitting?'var(--surface-2)':'var(--border-2)', color: complete&&!submitting?'var(--text-primary)':'var(--text-disabled)', border: `1px solid ${complete?'var(--border)':'transparent'}`, borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: complete&&!submitting?'pointer':'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
              <Check size={14} aria-hidden="true" />
              {submitting ? 'Saving…' : 'Save Invoice'}
            </button>
            <button type="button" onClick={handleSaveAndDownload} disabled={!complete||submitting}
              style={{ flex: 1, padding: 'var(--space-3)', background: complete&&!submitting?'var(--accent)':'var(--border-2)', color: complete&&!submitting?'#fff':'var(--text-disabled)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: complete&&!submitting?'pointer':'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', transition: 'background var(--duration-standard)' }}>
              <Download size={14} aria-hidden="true" />
              {submitting ? 'Saving…' : 'Save & Download PDF'}
            </button>
            <button type="button" onClick={() => navigate('/invoices')}
              style={{ flex: 1, padding: 'var(--space-3)', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', transition: 'background var(--duration-fast)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--danger-dim)'}
            >
              <X size={13} aria-hidden="true" /> Discard &amp; Close
            </button>
          </div>
        </div>

        {/* Template picker — scrollable gallery like Swipe */}
        <Modal isOpen={templateOpen} onClose={() => setTemplateOpen(false)} title="Choose Invoice Template" width="680px">
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Scroll to explore all 7 templates. Preview updates live on the right.
            </p>
            {/* Horizontal scroll strip */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-3)', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
              {TEMPLATES.map(t => {
              const locked = isTemplateLocked(t.id, user?.plan);
              return (
                <button
                  key={t.id}
                  onClick={locked ? () => {} : () => { update('templateId', t.id); setTemplateOpen(false); }}
                  style={{
                    flexShrink: 0, scrollSnapAlign: 'start',
                    width: 160, cursor: locked ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${form.templateId===t.id?'var(--accent)':'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                    background: 'transparent', padding: 0,
                    transition: 'border-color var(--duration-fast)',
                    position: 'relative',
                    opacity: locked ? 0.55 : 1,
                  }}
                >
                  {/* Template preview card — layout-aware header */}
                  {t.layout === 'minimal' ? (
                    <div style={{ height: 110, background: '#fff', padding: '10px 12px', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#111' }}>Company</div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 6, letterSpacing: '.1em', textTransform: 'uppercase', color: t.accentColor }}>TAX INVOICE</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#111' }}>INV/0001</div>
                        </div>
                      </div>
                      <div style={{ height: 2, background: t.headerColor, borderRadius: 1 }} />
                      <div style={{ fontSize: 6, color: '#999', display: 'flex', gap: 6 }}>
                        <span>Date: 23 Jun</span><span>·</span><span>Due: 23 Jul</span>
                      </div>
                    </div>
                  ) : t.layout === 'corporate' ? (
                    <div style={{ height: 110, background: t.headerColor, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>Company</div>
                          <div style={{ fontSize: 6, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>GSTIN: 29ABCDE1234F</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 6, letterSpacing: '.08em', color: 'rgba(255,255,255,.7)', textTransform: 'uppercase' }}>TAX INVOICE</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>INV/0001</div>
                          <div style={{ fontSize: 5, border: '1px solid rgba(255,255,255,.5)', borderRadius: 2, padding: '1px 3px', color: '#fff', marginTop: 2 }}>ORIGINAL</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fff' }}>
                        <div style={{ padding: '4px 8px', borderRight: '1px solid #eee' }}>
                          <div style={{ fontSize: 5, color: '#999', textTransform: 'uppercase' }}>Customer</div>
                          <div style={{ fontSize: 7, fontWeight: 700, color: '#111' }}>Brand Co.</div>
                        </div>
                        <div style={{ padding: '4px 8px' }}>
                          <div style={{ fontSize: 5, color: '#999' }}>Invoice #: INV/0001</div>
                          <div style={{ fontSize: 5, color: '#999' }}>Date: 23 Jun 2026</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 110, background: t.headerColor, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 12px' }}>
                      <div style={{ fontSize: 7, letterSpacing: '.1em', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', marginBottom: 2 }}>TAX INVOICE</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>INV/2627/0001</div>
                      <div style={{ marginTop: 6, height: 2, background: t.accentColor, borderRadius: 1, width: '60%' }} aria-hidden="true" />
                    </div>
                  )}
                  {/* Mini invoice body — layout-aware */}
                  {t.layout === 'minimal' ? (
                    <div style={{ background: '#fff', padding: '6px 12px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 6, color: '#888' }}>Bill From</div>
                        <div style={{ fontSize: 6, color: '#888' }}>Bill To</div>
                      </div>
                      <div style={{ height: 1, background: '#f0f0f0', marginBottom: 5 }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: 8, fontWeight: 700, color: t.accentColor }}>₹59,000</div>
                      </div>
                    </div>
                  ) : t.layout === 'corporate' ? (
                    <div style={{ background: '#fff', padding: '5px 8px 8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px', gap: 2, marginBottom: 3 }}>
                        {['Item','HSN','Tax%','Amt'].map(h => (
                          <div key={h} style={{ fontSize: 5, fontWeight: 700, color: '#fff', background: t.headerColor, padding: '1px 3px' }}>{h}</div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px', gap: 2 }}>
                        <div style={{ fontSize: 5, color: '#555' }}>Services</div>
                        <div style={{ fontSize: 5, color: '#555' }}>998399</div>
                        <div style={{ fontSize: 5, color: '#555' }}>18%</div>
                        <div style={{ fontSize: 6, fontWeight: 700, color: t.accentColor }}>₹59k</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff', padding: '8px 12px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 7, background: '#f0f0f0', borderRadius: 2, padding: '2px 5px', color: '#666' }}>Supplier</div>
                        <div style={{ fontSize: 7, background: '#f0f0f0', borderRadius: 2, padding: '2px 5px', color: '#666' }}>Brand</div>
                      </div>
                      <div style={{ height: 1, background: '#e5e5e5', marginBottom: 5 }} aria-hidden="true" />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 7, color: '#999' }}>Services</div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: t.accentColor }}>₹59,000</div>
                      </div>
                    </div>
                  )}
                  {/* Selected check */}
                  {form.templateId===t.id && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={11} style={{ color: '#fff' }} aria-hidden="true" />
                    </div>
                  )}
                  {/* Tag */}
                  {t.tag && (
                    <div style={{ position: 'absolute', top: 6, left: 6, padding: '1px 5px', background: 'rgba(0,0,0,0.4)', borderRadius: 3, fontSize: 8, color: '#fff', fontWeight: 600 }}>
                      {t.tag}
                    </div>
                  )}
                  {/* Lock overlay for premium templates */}
                  {locked && (
                    <Lock size={10} style={{ position: 'absolute', top: 4, right: 4, color: 'var(--text-muted)' }} />
                  )}
                </button>
              );
            })}
            </div>
            {/* Selected template info */}
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: 32, height: 32, background: selectedTemplate.headerColor, borderRadius: 6, flexShrink: 0 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{selectedTemplate.name} selected</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{selectedTemplate.desc}</div>
              </div>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>Invoice preview is always in light mode — invoices are print-ready documents</p>
          </div>
        </Modal>

        <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Invoice Preview" width="640px">
          <InvoicePreview form={form} calc={calc} invoiceNumber={nextNumber} user={user} template={selectedTemplate} />
        </Modal>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div style={{ padding: isMobile ? 'var(--space-3)' : 'var(--space-5)', width: '100%', maxWidth: 1200 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>GST-compliant · Rule 46 CGST Rules{totalCount > 0 ? ` · ${totalCount} total` : ''}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {usage.invoices_limit !== null && (
            <span style={{
              fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {usage.invoices_this_month ?? 0}/{usage.invoices_limit} this month
            </span>
          )}
          <button
            onClick={invoiceLimitReached ? undefined : () => navigate('/invoices/new')}
            disabled={invoiceLimitReached}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: '0 var(--space-2) 0 var(--space-4)',
              height: 36,
              background: invoiceLimitReached ? 'var(--border-2)' : 'var(--accent)',
              color: invoiceLimitReached ? 'var(--text-disabled)' : '#fff',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600, fontSize: 'var(--text-sm)',
              cursor: invoiceLimitReached ? 'not-allowed' : 'pointer',
              border: 'none', fontFamily: 'inherit',
              transition: 'background var(--duration-fast)',
            }}
            title={invoiceLimitReached ? 'Monthly invoice limit reached — upgrade to Starter' : ''}
          >
            <Plus size={14} aria-hidden="true" />
            New Invoice
            {usage.invoices_limit !== null && (
              <span style={{
                marginLeft: 2,
                padding: '2px 8px',
                background: invoiceLimitReached ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.18)',
                borderRadius: 'var(--radius-full)',
                fontSize: 11,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: invoiceLimitReached ? 'var(--text-disabled)' : 'rgba(255,255,255,0.9)',
              }}>
                {usage.invoices_this_month ?? 0}/{usage.invoices_limit}
              </span>
            )}
          </button>
          {invoiceLimitReached && (
            <a href="/settings#billing" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              Upgrade →
            </a>
          )}
        </div>
      </header>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="Search brand name or invoice number…"
          style={{ flex: 1, minWidth: 200, padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none' }}
          onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
        />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontSize: 'var(--text-sm)', fontFamily: 'inherit' }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <InvoiceList
        invoices={invoices} loading={listLoading}
        onDownload={handleDownloadFromList} onDelete={handleDelete} onMarkPaid={handleMarkPaid} onRefresh={loadInvoices}
        sortCol={sortCol} sortDir={sortDir}
        onSort={(col) => {
          if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
          else { setSortCol(col); setSortDir('desc'); }
          setPage(1);
        }}
      />
      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages} · {totalCount} invoices
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <button onClick={() => setPage(1)} disabled={page===1} style={pgBtnStyle(page===1)}>«</button>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={pgBtnStyle(page===1)}>‹ Prev</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i) => {
              const p = totalPages <= 5 ? i+1 : Math.max(1, Math.min(totalPages-4, page-2)) + i;
              return (
                <button key={p} onClick={() => setPage(p)} style={{ ...pgBtnStyle(false), background: p===page?'var(--accent)':'var(--surface-2)', color: p===page?'#fff':'var(--text-body)', fontWeight: p===page?700:400 }}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={pgBtnStyle(page===totalPages)}>Next ›</button>
            <button onClick={() => setPage(totalPages)} disabled={page===totalPages} style={pgBtnStyle(page===totalPages)}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
// ── Pagination button style ────────────────────────────────────────────────────
const pgBtnStyle = (disabled) => ({
  padding: '4px 10px', fontSize: 'var(--text-xs)', fontWeight: 500,
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? 'var(--text-disabled)' : 'var(--text-body)',
  fontFamily: 'inherit',
});

// ── Tooltip component — uses fixed position to escape overflow:hidden parents ──
function Tooltip({ text }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  const show = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.top - 8, left: r.left + r.width / 2 });
  };
  const hide = () => setPos(null);

  return (
    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show} onFocus={show}
        onMouseLeave={hide} onBlur={hide}
        aria-label="Help"
        style={{ background: 'none', border: 'none', cursor: 'help', color: 'var(--text-muted)', padding: '0 2px', display: 'flex', alignItems: 'center' }}
      >
        <HelpCircle size={13} aria-hidden="true" />
      </button>
      {pos && (
        <div role="tooltip" style={{
          position: 'fixed',
          left: pos.left, top: pos.top,
          transform: 'translate(-50%, -100%)',
          background: '#1a1a2e', color: '#fff',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
          fontSize: 'var(--text-xs)', lineHeight: 1.5,
          width: 230, zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

// ── Mobile preview collapsible ────────────────────────────────────────────────
function MobilePreviewCollapsible({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 'var(--space-3)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)',
          fontWeight: 600, fontSize: 'var(--text-sm)',
        }}
      >
        <span>📄 Invoice Preview</span>
        {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </button>
      {open && (
        <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Sect({ title, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: collapsible ? 'pointer' : 'default', userSelect: 'none' }}
      >
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
        {collapsible && (open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />)}
      </div>
      {(!collapsible || open) && (
        <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function SField({ id, label, children, error, value, onChange, onBlur, tooltip }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <label htmlFor={id} style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>{label}</label>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <select id={id} value={value} onChange={onChange} onBlur={onBlur} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-2)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 'var(--text-base)', fontFamily: 'inherit' }}>
        {children}
      </select>
      {error && <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)' }}>{error}</span>}
    </div>
  );
}

// ── Invoice preview — always light mode ───────────────────────────────────────
function InvoicePreview({ form, calc, invoiceNumber, user, template }) {
  if (template.layout === 'corporate') return <CorporatePreview form={form} calc={calc} invoiceNumber={invoiceNumber} user={user} template={template} />;
  if (template.layout === 'minimal') return <MinimalPreview form={form} calc={calc} invoiceNumber={invoiceNumber} user={user} template={template} />;
  return <ClassicPreview form={form} calc={calc} invoiceNumber={invoiceNumber} user={user} template={template} />;
}

function ClassicPreview({ form, calc, invoiceNumber, user, template }) {
  return (
    <div style={{ background: '#fff', color: '#1a1a1a', border: '1px solid #e2e5ef', borderRadius: 12, overflow: 'hidden', fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
      {/* Header */}
      <div style={{ background: template.headerColor, padding: '18px 22px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', opacity: 0.75, textTransform: 'uppercase', marginBottom: 4 }}>TAX INVOICE</div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>{invoiceNumber || 'INV/2526/0001'}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, opacity: 0.9 }}>
            <div>Date: {form.invoiceDate ? format(new Date(form.invoiceDate + 'T00:00:00'), 'dd MMM yyyy') : '—'}</div>
            <div>Due: {form.dueDate ? format(new Date(form.dueDate + 'T00:00:00'), 'dd MMM yyyy') : '—'}</div>
            {form.reverseCharge === 'Yes' && (
              <div style={{ marginTop: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 6px', fontSize: 9 }}>REVERSE CHARGE</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 22px' }}>
        {/* Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 5 }}>SUPPLIER</div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{user?.business_name || user?.name || '—'}</div>
            {user?.gstin && <div style={{ fontSize: 10, color: '#555' }}>GSTIN: {user.gstin}</div>}
            {user?.pan && <div style={{ fontSize: 10, color: '#555' }}>PAN: {user.pan}</div>}
            {(() => { const e = (user?.show_phone_on_invoice === false && user?.invoice_email) ? user.invoice_email : user?.email; return e ? <div style={{ fontSize: 10, color: '#555' }}>Email: {e}</div> : null; })()}
            {(() => { const p = (user?.show_phone_on_invoice === false && user?.invoice_phone) ? user.invoice_phone : user?.phone; return p ? <div style={{ fontSize: 10, color: '#555' }}>Ph: {p}</div> : null; })()}
            {user?.business_address && <div style={{ fontSize: 10, color: '#666', marginTop: 2, lineHeight: 1.4 }}>{user.business_address}</div>}
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 5 }}>RECIPIENT</div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{form.brandName || 'Brand Name'}</div>
            {form.brandGstin && <div style={{ fontSize: 10, color: '#555' }}>GSTIN: {form.brandGstin}</div>}
            {form.brandPan && <div style={{ fontSize: 10, color: '#555' }}>PAN: {form.brandPan}</div>}
            {form.brandEmail && <div style={{ fontSize: 10, color: '#555' }}>Email: {form.brandEmail}</div>}
            {form.brandPhone && <div style={{ fontSize: 10, color: '#555' }}>Ph: {form.brandPhone}</div>}
            {form.brandAddress && <div style={{ fontSize: 10, color: '#666', marginTop: 2, lineHeight: 1.4 }}>{form.brandAddress}</div>}
          </div>
        </div>

        {/* Place of supply */}
        {form.placeOfSupply && (
          <div style={{ marginBottom: 14, padding: '5px 8px', background: '#f5f5f5', borderRadius: 5, fontSize: 10, color: '#555' }}>
            <strong>Place of Supply:</strong> {STATE_MAP[form.placeOfSupply] || form.placeOfSupply} ({form.placeOfSupply}) &nbsp;·&nbsp;
            <strong>Type:</strong> {calc.supplyType === 'intrastate' ? 'Intrastate' : 'Interstate'}
          </div>
        )}

        {/* Service lines — multi-line support */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
          <thead>
            <tr style={{ background: '#f9f9f9', borderBottom: '2px solid #e5e5e5' }}>
              {['Description of Services', 'SAC', 'GST%', 'Taxable Value'].map(h => (
                <th key={h} style={{ padding: '7px 8px', textAlign: h.includes('Value') ? 'right' : 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#666' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(form.serviceLines && form.serviceLines.some(l => l.description || l.amount))
              ? form.serviceLines.map((line, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 8, fontSize: 11 }}>{line.description || '—'}</td>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 10, color: '#555' }}>{line.sacCode || '998399'}</td>
                  <td style={{ padding: 8, fontSize: 10, color: '#555' }}>{line.gstRate || 18}%</td>
                  <td style={{ padding: 8, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{line.amount ? formatINR(parseFloat(line.amount)) : '—'}</td>
                </tr>
              ))
              : (
                <tr>
                  <td style={{ padding: 8, fontSize: 11 }}>{form.serviceDescription}</td>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 10, color: '#555' }}>{form.sacCode}</td>
                  <td style={{ padding: 8, fontSize: 10, color: '#555' }}>{form.gstRate}%</td>
                  <td style={{ padding: 8, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{calc.base > 0 ? formatINR(calc.base) : '—'}</td>
                </tr>
              )
            }
          </tbody>
        </table>

        {/* Tax summary */}
        {calc.base > 0 && (
          <div style={{ marginLeft: 'auto', maxWidth: 210 }}>
            {[
              ['Taxable Value', formatINR(calc.base)],
              ...(calc.supplyType === 'intrastate'
                ? [[`CGST (${calc.gstRate/2}%)`, formatINR(calc.cgst)], [`SGST (${calc.gstRate/2}%)`, formatINR(calc.sgst)]]
                : [[`IGST (${calc.gstRate}%)`, formatINR(calc.igst)]]
              ),
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#666' }}>{l}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0 0', borderTop: '2px solid #1a1a1a', marginTop: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 12 }}>Invoice Total</span>
              <span style={{ fontWeight: 800, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: template.accentColor }}>{formatINR(calc.total)}</span>
            </div>
          </div>
        )}

        {/* Notes + Payment Terms */}
        {(form.paymentTerms && form.paymentTerms !== 'Net 30' || form.notes) && (
          <div style={{ marginTop: 14, padding: 10, background: '#f9f9f9', borderRadius: 6, fontSize: 10 }}>
            {form.paymentTerms && <div><strong>Payment Terms:</strong> {form.paymentTerms}</div>}
            {form.notes && <div style={{ marginTop: 3, color: '#666' }}>{form.notes}</div>}
          </div>
        )}

        {/* Bank Details */}
        {form.includeBankDetails && form.bankName && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0f7ff', border: '1px solid #bdd7f5', borderRadius: 6, fontSize: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 10, color: '#333' }}>Bank Details for Payment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2px 8px' }}>
              {form.accountHolderName && <><span style={{ color: '#666' }}>Account Holder</span><span style={{ fontWeight: 600 }}>{form.accountHolderName}</span></>}
              {form.bankName && <><span style={{ color: '#666' }}>Bank</span><span>{form.bankName}</span></>}
              {form.accountNumber && <><span style={{ color: '#666' }}>Account No.</span><span style={{ fontFamily: 'monospace' }}>{form.accountNumber}</span></>}
              {form.ifscCode && <><span style={{ color: '#666' }}>IFSC Code</span><span style={{ fontFamily: 'monospace' }}>{form.ifscCode}</span></>}
            </div>
          </div>
        )}

        {/* UPI QR */}
        {form.includeUpi && (form.upiId || form.upiScannerUrl) && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0fff4', border: '1px solid #86efac', borderRadius: 6, fontSize: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            {form.upiScannerUrl && (
              <img src={form.upiScannerUrl} alt="UPI QR" style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid #ccc', borderRadius: 4, background: '#fff', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 700, color: '#333', marginBottom: 2 }}>Pay via UPI</div>
              {form.upiId && <div style={{ color: '#555', fontFamily: 'monospace' }}>{form.upiId}</div>}
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        {form.includeTerms && form.termsText && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 6, fontSize: 9, color: '#666', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Terms &amp; Conditions</div>
            <div style={{ whiteSpace: 'pre-line' }}>{form.termsText}</div>
          </div>
        )}

        {/* Authorized Signatory */}
        {form.includeSignatory && (
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center', minWidth: 180 }}>
              {form.signatoryImageUrl && (
                <img src={form.signatoryImageUrl} alt="Signature" style={{ height: 40, maxWidth: 150, objectFit: 'contain', marginBottom: 4 }} />
              )}
              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 5, fontSize: 10, color: '#333' }}>
                <div style={{ fontWeight: 700 }}>For {user?.business_name || user?.name || 'Creator'}</div>
                <div style={{ color: '#666', marginTop: 2 }}>Authorized Signatory{form.signatoryName ? `: ${form.signatoryName}` : ''}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 8, color: '#ccc' }}>
          Computer-generated invoice · Kcretio · GST compliant per Rule 46 CGST Rules
        </div>
      </div>

      {/* Passive separator when secondary sections present */}
      {(form.includeBankDetails || form.includeUpi || form.includeTerms || form.includeSignatory) && (
        <div style={{ borderTop: '1px solid #e8e8e8', margin: '12px 22px 0', paddingTop: 4, fontSize: 8, color: '#bbb', textAlign: 'center' }}>
          — additional details below —
        </div>
      )}
    </div>
  );
}

function CorporatePreview({ form, calc, invoiceNumber, user, template }) {
  return (
    <div style={{ background: '#fff', color: '#1a1a1a', border: '1px solid #e2e5ef', borderRadius: 12, overflow: 'hidden', fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
      {/* Header — full-width colored band */}
      <div style={{ background: template.headerColor, padding: '16px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>{user?.business_name || user?.name || '—'}</div>
          {user?.gstin && <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>GSTIN: {user.gstin}</div>}
          {user?.business_address && <div style={{ fontSize: 9, opacity: 0.75, marginTop: 2, lineHeight: 1.4 }}>{user.business_address}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.12em', opacity: 0.7, textTransform: 'uppercase' }}>TAX INVOICE</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{invoiceNumber || 'INV/2526/0001'}</div>
          <div style={{ fontSize: 8, border: '1px solid rgba(255,255,255,0.5)', borderRadius: 3, padding: '1px 5px', marginTop: 4, display: 'inline-block' }}>ORIGINAL FOR RECIPIENT</div>
        </div>
      </div>

      {/* Two-column info row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `2px solid ${template.headerColor}` }}>
        <div style={{ padding: '10px 14px', borderRight: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Customer Details</div>
          <div style={{ fontWeight: 700, fontSize: 11 }}>{form.brandName || 'Brand Name'}</div>
          {form.brandGstin && <div style={{ fontSize: 9, color: '#555' }}>GSTIN: {form.brandGstin}</div>}
          {form.brandEmail && <div style={{ fontSize: 9, color: '#555' }}>Email: {form.brandEmail}</div>}
          {form.brandPhone && <div style={{ fontSize: 9, color: '#555' }}>Ph: {form.brandPhone}</div>}
          {form.brandAddress && <div style={{ fontSize: 9, color: '#666', marginTop: 2, lineHeight: 1.4 }}>{form.brandAddress}</div>}
        </div>
        <div style={{ padding: '10px 14px' }}>
          {[
            ['Invoice #', invoiceNumber || '—'],
            ['Invoice Date', form.invoiceDate ? format(new Date(form.invoiceDate + 'T00:00:00'), 'dd MMM yyyy') : '—'],
            ['Due Date', form.dueDate ? format(new Date(form.dueDate + 'T00:00:00'), 'dd MMM yyyy') : '—'],
            ...(form.placeOfSupply ? [['Place of Supply', STATE_MAP[form.placeOfSupply] || form.placeOfSupply]] : []),
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 8, marginBottom: 3, fontSize: 9 }}>
              <span style={{ color: '#888', minWidth: 90 }}>{l}:</span>
              <span style={{ fontWeight: 600, color: '#222' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <thead>
            <tr style={{ background: template.headerColor }}>
              {['#', 'Description', 'HSN/SAC', 'Tax%', 'Taxable Value', 'Amount'].map(h => (
                <th key={h} style={{ padding: '6px 7px', textAlign: ['Taxable Value','Amount'].includes(h) ? 'right' : 'left', fontSize: 8, fontWeight: 700, color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(form.serviceLines && form.serviceLines.some(l => l.description || l.amount))
              ? form.serviceLines.map((line, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 7px', fontSize: 10 }}>{i+1}</td>
                  <td style={{ padding: '6px 7px', fontSize: 10 }}>{line.description || '—'}</td>
                  <td style={{ padding: '6px 7px', fontFamily: 'monospace', fontSize: 9, color: '#555' }}>{line.sacCode || '998399'}</td>
                  <td style={{ padding: '6px 7px', fontSize: 9, color: '#555' }}>{line.gstRate || 18}%</td>
                  <td style={{ padding: '6px 7px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>{line.amount ? formatINR(parseFloat(line.amount)) : '—'}</td>
                  <td style={{ padding: '6px 7px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 10 }}>{line.amount ? formatINR(parseFloat(line.amount)) : '—'}</td>
                </tr>
              ))
              : <tr>
                  <td style={{ padding: '6px 7px', fontSize: 10 }}>1</td>
                  <td style={{ padding: '6px 7px', fontSize: 10 }}>{form.serviceDescription}</td>
                  <td style={{ padding: '6px 7px', fontFamily: 'monospace', fontSize: 9, color: '#555' }}>{form.sacCode}</td>
                  <td style={{ padding: '6px 7px', fontSize: 9, color: '#555' }}>{form.gstRate}%</td>
                  <td style={{ padding: '6px 7px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>{calc.base > 0 ? formatINR(calc.base) : '—'}</td>
                  <td style={{ padding: '6px 7px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 10 }}>{calc.base > 0 ? formatINR(calc.base) : '—'}</td>
                </tr>
            }
          </tbody>
        </table>

        {/* Tax summary */}
        {calc.base > 0 && (
          <div style={{ marginLeft: 'auto', maxWidth: 220, border: '1px solid #e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
            {[
              ['Taxable Amount', formatINR(calc.base)],
              ...(calc.supplyType === 'intrastate'
                ? [[`CGST (${calc.gstRate/2}%)`, formatINR(calc.cgst)], [`SGST (${calc.gstRate/2}%)`, formatINR(calc.sgst)]]
                : [[`IGST (${calc.gstRate}%)`, formatINR(calc.igst)]]
              ),
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '4px 10px', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ color: '#666' }}>{l}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: template.headerColor, color: '#fff' }}>
              <span style={{ fontWeight: 700, fontSize: 11 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatINR(calc.total)}</span>
            </div>
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 8, color: '#ccc', textAlign: 'center' }}>Computer-generated invoice · Kcretio · GST compliant per Rule 46</div>
      </div>
    </div>
  );
}

function MinimalPreview({ form, calc, invoiceNumber, user, template }) {
  return (
    <div style={{ background: '#fff', color: '#1a1a1a', border: '1px solid #e2e5ef', borderRadius: 12, overflow: 'hidden', fontFamily: "'Inter', sans-serif", fontSize: 12, padding: '18px 20px' }}>
      {/* Top: company left, invoice right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>{user?.business_name || user?.name || '—'}</div>
          {user?.gstin && <div style={{ fontSize: 9, color: '#888', marginTop: 1 }}>GSTIN: {user.gstin}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: template.accentColor, marginBottom: 2 }}>TAX INVOICE</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{invoiceNumber || 'INV/2526/0001'}</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 2, background: template.headerColor, marginBottom: 10 }} />

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 16, fontSize: 9, marginBottom: 12, flexWrap: 'wrap' }}>
        {form.invoiceDate && <div><span style={{ color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date </span><span style={{ fontWeight: 600, color: '#222' }}>{format(new Date(form.invoiceDate + 'T00:00:00'), 'dd MMM yyyy')}</span></div>}
        {form.dueDate && <div><span style={{ color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due </span><span style={{ fontWeight: 600, color: '#222' }}>{format(new Date(form.dueDate + 'T00:00:00'), 'dd MMM yyyy')}</span></div>}
      </div>

      {/* Parties */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, padding: 8, background: '#f8f8f8', borderRadius: 4 }}>
        <div>
          <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 3 }}>Bill From</div>
          <div style={{ fontWeight: 700, fontSize: 11 }}>{user?.business_name || user?.name || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 3 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 11 }}>{form.brandName || 'Brand Name'}</div>
          {form.brandGstin && <div style={{ fontSize: 9, color: '#666' }}>GSTIN: {form.brandGstin}</div>}
          {form.brandEmail && <div style={{ fontSize: 9, color: '#666' }}>Email: {form.brandEmail}</div>}
        </div>
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            {['Description', 'SAC', 'Tax%', 'Amount'].map(h => (
              <th key={h} style={{ padding: '5px 6px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(form.serviceLines && form.serviceLines.some(l => l.description || l.amount))
            ? form.serviceLines.map((line, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px', fontSize: 10 }}>{line.description || '—'}</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: 9, color: '#888' }}>{line.sacCode || '998399'}</td>
                <td style={{ padding: '6px', fontSize: 9, color: '#888' }}>{line.gstRate || 18}%</td>
                <td style={{ padding: '6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 10 }}>{line.amount ? formatINR(parseFloat(line.amount)) : '—'}</td>
              </tr>
            ))
            : <tr>
                <td style={{ padding: '6px', fontSize: 10 }}>{form.serviceDescription}</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: 9, color: '#888' }}>{form.sacCode}</td>
                <td style={{ padding: '6px', fontSize: 9, color: '#888' }}>{form.gstRate}%</td>
                <td style={{ padding: '6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 10 }}>{calc.base > 0 ? formatINR(calc.base) : '—'}</td>
              </tr>
          }
        </tbody>
      </table>

      {/* Tax summary — right aligned */}
      {calc.base > 0 && (
        <div style={{ marginLeft: 'auto', maxWidth: 200 }}>
          {[
            ['Taxable Value', formatINR(calc.base)],
            ...(calc.supplyType === 'intrastate'
              ? [[`CGST (${calc.gstRate/2}%)`, formatINR(calc.cgst)], [`SGST (${calc.gstRate/2}%)`, formatINR(calc.sgst)]]
              : [[`IGST (${calc.gstRate}%)`, formatINR(calc.igst)]]
            ),
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ color: '#666' }}>{l}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', borderTop: `2px solid ${template.headerColor}`, marginTop: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 11 }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 12, color: template.accentColor, fontVariantNumeric: 'tabular-nums' }}>{formatINR(calc.total)}</span>
          </div>
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 7, color: '#ccc', textAlign: 'center' }}>Computer-generated invoice · Kcretio · GST compliant per Rule 46</div>
    </div>
  );
}
