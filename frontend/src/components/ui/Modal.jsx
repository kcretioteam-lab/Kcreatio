import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, width = 'min(480px, calc(100vw - var(--space-8)))' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes modal-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-panel-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)',
          animation: 'modal-overlay-in 150ms var(--ease-decelerate) both',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: width,
            maxHeight: '90dvh',
            overflow: 'auto',
            animation: 'modal-panel-in 200ms var(--ease-decelerate) both',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-5) var(--space-6)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                padding: 'var(--space-1)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'color var(--duration-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div style={{ padding: 'var(--space-6)' }}>{children}</div>
        </div>
      </div>
    </>,
    document.body
  );
}
