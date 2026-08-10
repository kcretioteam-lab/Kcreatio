import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
let toastId = 0;
const DURATION = 4000;

const TYPE_CONFIG = {
  success: { color: 'var(--success)',      dimColor: 'var(--success-dim)',  icon: CheckCircle },
  error:   { color: 'var(--danger)',        dimColor: 'var(--danger-dim)',   icon: AlertCircle },
  warning: { color: 'var(--warning)',       dimColor: 'var(--warning-dim)',  icon: AlertTriangle },
  info:    { color: 'var(--info)',          dimColor: 'var(--info-dim)',     icon: Info },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), DURATION + 300);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    info:    (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @media (max-width: 640px) {
          .toast-container { right: var(--space-4) !important; left: var(--space-4) !important; bottom: 80px !important; }
        }
      `}</style>
      <div
        className="toast-container"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 'var(--space-6)',
          right: 'var(--space-6)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </div>
    </>
  );
}

function ToastItem({ toast, onRemove }) {
  const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--surface)',
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-primary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 500,
        maxWidth: 360,
        minWidth: 260,
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        animation: 'toast-in 220ms var(--ease-decelerate) both',
        pointerEvents: 'all',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
    >
      <Icon size={16} style={{ color: cfg.color, flexShrink: 0 }} aria-hidden="true" />
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        style={{
          color: 'var(--text-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          flexShrink: 0,
        }}
      >
        <X size={14} aria-hidden="true" />
      </button>
      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        height: 2,
        background: cfg.color,
        opacity: 0.5,
        animation: `toast-progress ${DURATION}ms linear both`,
        borderRadius: '0 0 0 2px',
      }} />
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
