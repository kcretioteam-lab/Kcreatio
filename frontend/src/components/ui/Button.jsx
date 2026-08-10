const VARIANTS = {
  primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
  ghost:   { background: 'transparent', color: 'var(--text-body)', border: '1px solid var(--border)' },
  danger:  { background: 'var(--danger-dim)', color: 'var(--danger-text)', border: '1px solid var(--danger)' },
};

const SIZES = {
  sm: { padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-sm)', height: '32px', borderRadius: 'var(--radius-sm)' },
  md: { padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-base)', height: '40px', borderRadius: 'var(--radius-md)' },
  lg: { padding: 'var(--space-3) var(--space-6)', fontSize: 'var(--text-md)', height: '48px', borderRadius: 'var(--radius-lg)' },
};

// CSS spinner — no character glyph
function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'rgba(255,255,255,0.9)',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  style: extraStyle,
  ...props
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <button
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          fontWeight: 600,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'background var(--duration-fast) var(--ease-standard), transform 100ms, opacity var(--duration-fast)',
          width: fullWidth ? '100%' : 'auto',
          ...v,
          ...s,
          ...extraStyle,
        }}
        onMouseDown={e => { if (!isDisabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        {...props}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    </>
  );
}
