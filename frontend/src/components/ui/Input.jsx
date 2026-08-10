import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

function InlineTooltip({ text }) {
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
      {pos && createPortal(
        <div role="tooltip" style={{
          position: 'fixed', left: pos.left, top: pos.top,
          transform: 'translate(-50%, -100%)',
          background: '#1a1a2e', color: '#fff',
          borderRadius: '6px', padding: '6px 10px',
          fontSize: '11px', lineHeight: 1.5,
          width: 220, zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>,
        document.body
      )}
    </span>
  );
}

export default function Input({
  label,
  id,
  error,
  hint,
  tooltip,
  style: extra,
  containerStyle,
  onBlur: outerBlur,
  ...props
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', ...containerStyle }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor={id} style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>
            {label}
          </label>
          {tooltip && <InlineTooltip text={tooltip} />}
        </div>
      )}
      <input
        id={id}
        style={{
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--surface-2)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-base)',
          outline: 'none',
          transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
          width: '100%',
          ...extra,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--border-focus)';
          e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)';
          e.target.style.boxShadow = 'none';
          if (outerBlur) outerBlur(e);
        }}
        {...props}
      />
      {error && (
        <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)', marginTop: '2px' }}>
          {error}
        </span>
      )}
      {hint && !error && (
        <span style={{ fontSize: 'var(--text-xs)', color: hint.startsWith('✓') ? 'var(--success-text)' : 'var(--text-muted)' }}>{hint}</span>
      )}
    </div>
  );
}
