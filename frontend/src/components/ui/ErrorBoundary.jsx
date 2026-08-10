import { Component } from 'react';
import { AlertCircle } from 'lucide-react';

function ErrorFallback({ error, onReset }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 300, padding: 'var(--space-8)', textAlign: 'center',
    }}>
      <div style={{ width: 56, height: 56, background: 'var(--danger-dim)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)', color: 'var(--danger-text)' }}>
        <AlertCircle size={24} aria-hidden="true" />
      </div>
      <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Something went wrong</h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 360, marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
        {import.meta.env.DEV && error?.message
          ? error.message
          : 'An unexpected error occurred. Your data is safe — try refreshing the page.'}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onReset}
          style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Try again
        </button>
        <a
          href="/dashboard"
          style={{ padding: 'var(--space-2) var(--space-4)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-body)', fontWeight: 500, fontSize: 'var(--text-sm)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
        >
          Go to Dashboard
        </a>
        <a
          href="/"
          style={{ padding: 'var(--space-2) var(--space-4)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontWeight: 500, fontSize: 'var(--text-sm)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
        >
          Landing page
        </a>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}
