import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import { LIMITS, sanitizeNumber, overLimitMessage } from '../../utils/limits';
import { FORMATS } from '../../utils/fieldFormats';

export function InlineTooltip({ text }) {
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

// type="number" renders a text field with the numeric keypad instead: no spinner arrows,
// digits and one decimal point only, and keystrokes that would go past `max` are refused.
//   max      — upper limit (default LIMITS.MONEY, ₹99,99,999)
//   decimals — decimal places allowed (default 2; 0 for whole numbers)
//   currency — prefix the limit message with ₹ (default true)
// format="gstin" | "pan" | "tan" | "ifsc" | "mobile" | "phone" | "account" | "upi" | "email"
// (utils/fieldFormats.js) strips characters the field can't contain as you type, and
// checks the finished value when the field loses focus.
export default function Input({
  label,
  id,
  error,
  hint,
  tooltip,
  style: extra,
  containerStyle,
  onBlur: outerBlur,
  type,
  max = LIMITS.MONEY,
  decimals = 2,
  currency = true,
  onChange,
  format,
  min,    // negatives are always refused; a min above 0 is validated on submit
  step,   // not used: decimals controls precision
  ...props
}) {
  const numeric = type === 'number';
  const fmt = format ? FORMATS[format] : null;
  const [limitMsg, setLimitMsg] = useState('');
  const [formatMsg, setFormatMsg] = useState('');

  const handleChange = numeric
    ? (e) => {
        const next = sanitizeNumber(e.target.value, { max: Number(max), decimals });
        if (next === null) { setLimitMsg(overLimitMessage(max, currency)); return; }
        setLimitMsg('');
        e.target.value = next;
        onChange?.(e);
      }
    : fmt
      ? (e) => {
          e.target.value = fmt.clean(e.target.value);
          setFormatMsg('');
          onChange?.(e);
        }
      : onChange;

  const shownError = error || limitMsg || formatMsg;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', ...containerStyle }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor={id} style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-body)' }}>
            {typeof label === 'string' && label.includes(' *')
              ? <>{label.replace(' *', '')} <span style={{ color: 'var(--danger-text)', fontWeight: 700 }} aria-hidden="true">*</span></>
              : label
            }
          </label>
          {tooltip && <InlineTooltip text={tooltip} />}
        </div>
      )}
      <input
        id={id}
        type={numeric ? 'text' : type}
        {...(numeric && { inputMode: decimals > 0 ? 'decimal' : 'numeric', autoComplete: 'off' })}
        {...(fmt?.inputMode && { inputMode: fmt.inputMode })}
        {...(fmt && !fmt.inputMode && { autoCapitalize: 'characters', spellCheck: false })}
        onChange={handleChange}
        style={{
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--surface-2)',
          border: `1px solid ${shownError ? 'var(--danger)' : 'var(--border)'}`,
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
          e.target.style.borderColor = shownError ? 'var(--danger)' : 'var(--border)';
          e.target.style.boxShadow = 'none';
          setLimitMsg('');
          if (fmt) setFormatMsg(e.target.value ? (fmt.validate(e.target.value) || '') : '');
          if (outerBlur) outerBlur(e);
        }}
        {...props}
      />
      {shownError && (
        <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)', marginTop: '2px' }}>
          {shownError}
        </span>
      )}
      {hint && !shownError && (
        <span style={{ fontSize: 'var(--text-xs)', color: hint.startsWith('✓') ? 'var(--success-text)' : 'var(--text-muted)' }}>{hint}</span>
      )}
    </div>
  );
}
