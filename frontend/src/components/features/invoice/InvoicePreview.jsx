import { format } from 'date-fns';
import { formatINR } from '../../../utils/formatINR.js';

export default function InvoicePreview({ form, calc, invoiceNumber, user }) {
  const empty = !form.brandName && !form.baseAmount;

  const displayBrandName = form.brandName || 'Brand Name';
  const displayInvoiceNumber = invoiceNumber || 'INV-0001';
  const displayDate = form.invoiceDate ? format(new Date(form.invoiceDate + 'T00:00:00'), 'd MMM yyyy') : format(new Date(), 'd MMM yyyy');
  const displayDueDate = form.dueDate ? format(new Date(form.dueDate + 'T00:00:00'), 'd MMM yyyy') : '';

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
      role="img"
      aria-label="Invoice preview"
    >
      {/* Invoice header */}
      <div style={{ background: 'var(--surface-2)', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>
              TAX INVOICE
            </div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {displayInvoiceNumber}
            </div>
          </div>
          <div
            style={{
              width: 36, height: 36, background: 'var(--accent)',
              borderRadius: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff',
            }}
          >
            C
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Date: {displayDate}{displayDueDate ? ` · Due: ${displayDueDate}` : ''}
        </div>
      </div>

      <div style={{ padding: 'var(--space-5) var(--space-6)' }}>
        {/* Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>FROM</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.business_name || user?.name || 'Your Business'}
            </div>
            {user?.gstin && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                GSTIN: {user.gstin}
              </div>
            )}
            {user?.business_address && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                {user.business_address}
              </div>
            )}
          </div>
          <div>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>TO</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {displayBrandName}
            </div>
            {form.brandGstin && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                GSTIN: {form.brandGstin}
              </div>
            )}
            {form.brandAddress && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                {form.brandAddress}
              </div>
            )}
          </div>
        </div>

        {/* Service line */}
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              padding: 'var(--space-2) var(--space-3)',
              borderBottom: '1px solid var(--border)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <span>Description</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
          </div>
          <div style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {form.serviceDescription || 'Content Creation and Influencer Marketing Services'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  HSN: 998399
                </div>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {calc.base > 0 ? formatINR(calc.base) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-end' }}>
          <PreviewRow label="Sub-total" value={calc.base > 0 ? formatINR(calc.base) : '—'} />
          {calc.base > 0 && calc.supplyType === 'intrastate' ? (
            <>
              <PreviewRow label={`CGST ${calc.gstRate / 2}%`} value={formatINR(calc.cgst)} />
              <PreviewRow label={`SGST ${calc.gstRate / 2}%`} value={formatINR(calc.sgst)} />
            </>
          ) : calc.base > 0 ? (
            <PreviewRow label={`IGST ${calc.gstRate}%`} value={formatINR(calc.igst)} />
          ) : null}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: 200,
              paddingTop: 'var(--space-2)',
              borderTop: '1px solid var(--border)',
              marginTop: 'var(--space-1)',
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
            <span
              style={{
                fontSize: 'var(--text-md)',
                fontWeight: 700,
                color: 'var(--accent)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {calc.total > 0 ? formatINR(calc.total) : '—'}
            </span>
          </div>
        </div>

        {form.notes && (
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
            <div className="label" style={{ marginBottom: 'var(--space-1)' }}>Notes</div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)' }}>{form.notes}</p>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-5)', textAlign: 'center', fontSize: 10, color: 'var(--text-disabled)' }}>
          Generated with Kcretio
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
