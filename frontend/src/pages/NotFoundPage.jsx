import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 'var(--space-8)', textAlign: 'center',
    }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ fontSize: 72, fontWeight: 800, color: 'var(--border-2)', lineHeight: 1, marginBottom: 'var(--space-2)', fontVariantNumeric: 'tabular-nums' }}>404</div>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>Page Not Found</div>
      </div>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
        This isn't where brand deals happen
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
        The page you're looking for doesn't exist or was moved. Your invoices and tax data are safe.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/dashboard" style={{
          padding: 'var(--space-3) var(--space-6)',
          background: 'var(--accent)', color: '#fff',
          borderRadius: 'var(--radius-md)', fontWeight: 700,
          fontSize: 'var(--text-base)', textDecoration: 'none',
          transition: 'background var(--duration-fast)',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
        >
          Go to Dashboard
        </Link>
        <Link to="/" style={{
          padding: 'var(--space-3) var(--space-6)',
          background: 'transparent', color: 'var(--text-body)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          fontWeight: 600, fontSize: 'var(--text-base)', textDecoration: 'none',
          transition: 'border-color var(--duration-fast)',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          Go to Landing Page
        </Link>
      </div>
    </div>
  );
}
