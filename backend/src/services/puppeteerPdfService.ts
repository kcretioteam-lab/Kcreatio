import puppeteer, { Browser } from 'puppeteer-core';
import { format } from 'date-fns';

const STATE_MAP: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (old)', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tensWords = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWordsBelowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tensWords[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWordsBelowThousand(n % 100) : '');
}

function amountInWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return 'INR Zero Only';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;
  let words = '';
  if (crore) words += numToWordsBelowThousand(crore) + ' Crore ';
  if (lakh) words += numToWordsBelowThousand(lakh) + ' Lakh ';
  if (thousand) words += numToWordsBelowThousand(thousand) + ' Thousand ';
  if (remainder) words += numToWordsBelowThousand(remainder);
  return 'INR ' + words.trim() + ' Only';
}

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  try { return format(new Date(d.includes('T') ? d : d + 'T00:00:00'), 'dd MMM yyyy'); }
  catch { return d; }
}

function inr(n: number | null | undefined): string {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface InvoiceForPdf {
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  payment_terms?: string | null;
  purchase_order_number?: string | null;
  discount_value?: number | null;
  discount_type?: string | null;
  reverse_charge?: string | null;
  brand_name: string;
  brand_gstin?: string | null;
  brand_address?: string | null;
  brand_state_code?: string | null;
  brand_pan?: string | null;
  brand_email?: string | null;
  brand_phone?: string | null;
  service_description: string;
  sac_code?: string | null;
  base_amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  supply_type: string;
  cgst_amount?: number | null;
  sgst_amount?: number | null;
  igst_amount?: number | null;
  place_of_supply?: string | null;
  notes?: string | null;
  include_bank_details?: boolean;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  account_holder_name?: string | null;
  upi_id?: string | null;
  include_upi?: boolean;
  upi_scanner_url?: string | null;
  include_terms?: boolean;
  terms_text?: string | null;
  include_signatory?: boolean;
  signatory_name?: string | null;
  signatory_image_url?: string | null;
  seller_business_name?: string | null;
  template_id?: string | null;
  invoice_accent_color?: string | null;
}

export interface UserForPdf {
  name: string;
  email?: string | null;
  business_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  business_address?: string | null;
  state_code?: string | null;
  phone?: string | null;
  show_phone_on_invoice?: boolean | null;
  invoice_phone?: string | null;
  invoice_email?: string | null;
}

function buildInvoiceHtml(inv: InvoiceForPdf, user: UserForPdf): string {
  const displayEmail = (user.show_phone_on_invoice === false && user.invoice_email) ? user.invoice_email : user.email;
  const displayPhone = (user.show_phone_on_invoice === false && user.invoice_phone) ? user.invoice_phone : user.phone;
  const words = amountInWords(inv.total_amount || 0);
  const headerColor = inv.template_id === 'corporate' ? '#1E293B' : '#0D0F1A';
  const accentColor = inv.invoice_accent_color || '#E8921A';

  // Escape HTML entities to prevent XSS in PDF output
  const esc = (s: string | null | undefined): string => {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Invoice ${esc(inv.invoice_number)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #1a1a1a; background: #fff; padding: 32px; }
  .hdr { background: ${headerColor}; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: flex-start; }
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
  .tfinal span:last-child { font-weight: 800; font-size: 14px; color: ${accentColor}; font-variant-numeric: tabular-nums; }
  .notes { margin-top: 14px; padding: 10px 12px; background: #f9f9f9; border-radius: 6px; font-size: 10px; color: #555; line-height: 1.6; }
  .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #ccc; }
  @page { margin: 0; size: A4 portrait; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
</style>
</head><body>
<div class="hdr">
  <div class="hdr-left">
    <h1>TAX INVOICE</h1>
    <h2>${esc(inv.invoice_number)}</h2>
    ${inv.reverse_charge === 'Yes' ? '<div class="rc">REVERSE CHARGE APPLICABLE</div>' : ''}
  </div>
  <div class="hdr-right">
    <div><strong>Invoice Date:</strong> ${fmt(inv.invoice_date)}</div>
    ${inv.due_date ? `<div><strong>Due Date:</strong> ${fmt(inv.due_date)}</div>` : ''}
    ${inv.payment_terms ? `<div><strong>Payment Terms:</strong> ${esc(inv.payment_terms)}</div>` : ''}
    ${inv.purchase_order_number ? `<div><strong>PO Number:</strong> ${esc(inv.purchase_order_number)}</div>` : ''}
  </div>
</div>
<div class="body">
  <div class="parties">
    <div>
      <div class="party-label">Supplier (From)</div>
      <div class="party-name">${esc(user.business_name || user.name)}</div>
      ${user.gstin ? `<div class="party-detail">GSTIN: <strong>${esc(user.gstin)}</strong></div>` : ''}
      ${user.pan ? `<div class="party-detail">PAN: ${esc(user.pan)}</div>` : ''}
      ${displayEmail ? `<div class="party-detail">Email: ${esc(displayEmail)}</div>` : ''}
      ${displayPhone ? `<div class="party-detail">Ph: ${esc(displayPhone)}</div>` : ''}
      ${user.business_address ? `<div class="party-detail" style="margin-top:4px;line-height:1.4">${esc(user.business_address)}</div>` : ''}
      ${user.state_code ? `<div class="party-detail">State: ${esc(STATE_MAP[user.state_code] || '')} | Code: ${esc(user.state_code)}</div>` : ''}
    </div>
    <div>
      <div class="party-label">Recipient (Bill To)</div>
      <div class="party-name">${esc(inv.brand_name)}</div>
      ${inv.brand_gstin ? `<div class="party-detail">GSTIN: <strong>${esc(inv.brand_gstin)}</strong></div>` : ''}
      ${inv.brand_pan ? `<div class="party-detail">PAN: ${esc(inv.brand_pan)}</div>` : ''}
      ${inv.brand_email ? `<div class="party-detail">Email: ${esc(inv.brand_email)}</div>` : ''}
      ${inv.brand_phone ? `<div class="party-detail">Ph: ${esc(inv.brand_phone)}</div>` : ''}
      ${inv.brand_address ? `<div class="party-detail" style="margin-top:4px;line-height:1.4">${esc(inv.brand_address)}</div>` : ''}
      ${inv.brand_state_code ? `<div class="party-detail">State: ${esc(STATE_MAP[inv.brand_state_code] || '')} | Code: ${esc(inv.brand_state_code)}</div>` : ''}
    </div>
  </div>
  ${inv.place_of_supply ? `<div class="pos"><strong>Place of Supply:</strong> ${esc(STATE_MAP[inv.place_of_supply] || inv.place_of_supply)} (${esc(inv.place_of_supply)}) &nbsp;·&nbsp; <strong>Supply Type:</strong> ${inv.supply_type === 'intrastate' ? 'Intrastate (CGST + SGST)' : 'Interstate (IGST)'}</div>` : ''}
  <table>
    <thead><tr>
      <th>Description of Services</th><th>SAC/HSN</th><th>GST Rate</th><th class="r">Taxable Value</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>${esc(inv.service_description)}</td>
        <td>${esc(inv.sac_code || '998399')}</td>
        <td>${inv.gst_rate || 18}%</td>
        <td class="r"><strong>${inr(inv.base_amount)}</strong></td>
      </tr>
    </tbody>
  </table>
  <div class="totals">
    ${inv.discount_value ? `<div class="trow"><span>Subtotal</span><span>${inr((inv.base_amount||0) + (inv.discount_value||0))}</span></div><div class="trow" style="color:#c0392b"><span>Discount${inv.discount_type==='percent'?` (${inv.discount_value}%)`:''}</span><span>−${inr(inv.discount_value)}</span></div>` : ''}
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
  ${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${esc(inv.notes)}</div>` : ''}
  ${inv.include_bank_details && inv.bank_name ? `
  <div class="notes" style="margin-top:10px">
    <strong>Bank Details for Payment:</strong>
    <table style="margin-top:6px;font-size:10px;border:none">
      ${inv.account_holder_name ? `<tr><td style="padding:2px 0;color:#666;width:140px">Account Holder</td><td style="font-weight:700">${esc(inv.account_holder_name)}</td></tr>` : ''}
      ${inv.bank_name ? `<tr><td style="padding:2px 0;color:#666">Bank</td><td>${esc(inv.bank_name)}</td></tr>` : ''}
      ${inv.account_number ? `<tr><td style="padding:2px 0;color:#666">Account No.</td><td style="font-family:monospace">${esc(inv.account_number)}</td></tr>` : ''}
      ${inv.ifsc_code ? `<tr><td style="padding:2px 0;color:#666">IFSC Code</td><td style="font-family:monospace">${esc(inv.ifsc_code)}</td></tr>` : ''}
    </table>
  </div>` : ''}
  ${inv.include_upi && (inv.upi_id || inv.upi_scanner_url) ? `
  <div class="notes" style="margin-top:10px;display:flex;align-items:center;gap:12px">
    ${inv.upi_scanner_url ? `<img src="${inv.upi_scanner_url}" style="width:60px;height:60px;object-fit:contain;border:1px solid #ddd;border-radius:4px;background:#fff" />` : ''}
    <div><strong>Pay via UPI</strong>${inv.upi_id ? `<div style="font-family:monospace;font-size:10px;color:#555">${esc(inv.upi_id)}</div>` : ''}</div>
  </div>` : ''}
  ${inv.include_terms && inv.terms_text ? `
  <div class="notes" style="margin-top:10px">
    <strong>Terms &amp; Conditions:</strong>
    <div style="margin-top:4px;white-space:pre-line;color:#666">${esc(inv.terms_text)}</div>
  </div>` : ''}
  ${inv.include_signatory ? `
  <div style="margin-top:30px;display:flex;justify-content:flex-end">
    <div style="text-align:center;min-width:180px">
      ${inv.signatory_image_url ? `<img src="${inv.signatory_image_url}" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:4px;border:1px solid #ddd;border-radius:4px;background:#fff;padding:4px" />` : ''}
      <div style="border-top:1px solid #1a1a1a;padding-top:6px;font-size:10px;color:#333">
        <div><strong>For ${esc(inv.seller_business_name || user.business_name || user.name)}</strong></div>
        ${inv.signatory_name ? `<div style="color:#666">Authorized Signatory: ${esc(inv.signatory_name)}</div>` : '<div style="color:#666">Authorized Signatory</div>'}
      </div>
    </div>
  </div>` : ''}
  <div class="footer">Computer-generated invoice &nbsp;·&nbsp; Kcretio &nbsp;·&nbsp; Subject to GST as applicable</div>
</div>
</body></html>`;
}

let browserInstance: Browser | null = null;
let pageInUse = false;

const pdfCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getChromePath(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'linux') {
    return '/usr/bin/google-chrome-stable';
  }
  return 'google-chrome';
}

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance;
  browserInstance = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  return browserInstance;
}

export async function warmBrowser(): Promise<void> {
  try { await getBrowser(); } catch { /* non-fatal */ }
}

export async function generateInvoicePdfWithPuppeteer(
  invoice: InvoiceForPdf,
  user: UserForPdf,
  cacheKey?: string,
): Promise<Buffer> {
  if (cacheKey) {
    const cached = pdfCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.buffer;
    }
  }

  while (pageInUse) {
    await new Promise<void>(resolve => setTimeout(resolve, 50));
  }
  pageInUse = true;

  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    const html = buildInvoiceHtml(invoice, user);
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    const buffer = Buffer.from(pdfUint8);
    if (cacheKey) {
      pdfCache.set(cacheKey, { buffer, timestamp: Date.now() });
    }
    return buffer;
  } finally {
    if (page) await page.close().catch(() => {});
    pageInUse = false;
  }
}
