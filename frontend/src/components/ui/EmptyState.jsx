import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-12)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}
    >
      {Icon && (
        <div
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-1)',
          }}
        >
          <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
      <p style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
          {description}
        </p>
      )}
      {actionLabel && (
        actionHref ? (
          <Link
            to={actionHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-5)',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              textDecoration: 'none',
              transition: 'background var(--duration-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-5)',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background var(--duration-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}
