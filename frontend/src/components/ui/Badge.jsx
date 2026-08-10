const VARIANT_STYLES = {
  success: { background: 'var(--success-dim)', color: 'var(--success-text)', border: '1px solid rgba(34,197,94,0.2)' },
  warning: { background: 'var(--warning-dim)', color: 'var(--warning-text)', border: '1px solid rgba(245,158,11,0.2)' },
  danger:  { background: 'var(--danger-dim)',  color: 'var(--danger-text)',  border: '1px solid rgba(239,68,68,0.2)' },
  info:    { background: 'var(--info-dim)',    color: 'var(--info-text)',    border: '1px solid rgba(59,130,246,0.2)' },
  muted:   { background: 'var(--surface-3)',   color: 'var(--text-muted)',   border: '1px solid var(--border)' },
};

export default function Badge({ children, variant = 'muted', style: extra }) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.muted;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px var(--space-2)',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...v,
        ...extra,
      }}
    >
      {children}
    </span>
  );
}
