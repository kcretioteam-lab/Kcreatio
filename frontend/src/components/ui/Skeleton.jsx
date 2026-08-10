// Skeleton shimmer components — replace all "Loading…" text

function Sk({ width = '100%', height = 16, style: extra }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, flexShrink: 0, ...extra }}
      aria-hidden="true"
    />
  );
}

// Single line or multi-line text skeleton
export function SkeletonText({ lines = 3, lastLineWidth = '60%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Sk key={i} width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'} height={14} />
      ))}
    </div>
  );
}

// Stat card skeleton — matches StatCard.jsx layout
export function SkeletonStatCard() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Sk width={120} height={11} />
        <Sk width={32} height={32} style={{ borderRadius: 'var(--radius-md)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Sk width={100} height={28} />
        <Sk width={80} height={11} />
      </div>
    </div>
  );
}

// Table row skeleton — matches standard table row height
export function SkeletonTableRow({ cols = 5 }) {
  const widths = ['80%', '60%', '50%', '40%', '30%'];
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <Sk width={widths[i] ?? '50%'} height={14} />
        </td>
      ))}
    </tr>
  );
}

// Generic content card skeleton — for full-page loading states
export function SkeletonCard({ rows = 4, style: extra }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        ...extra,
      }}
      aria-hidden="true"
    >
      <Sk width={160} height={13} />
      {Array.from({ length: rows }).map((_, i) => (
        <Sk key={i} width={i % 3 === 2 ? '60%' : '100%'} height={16} />
      ))}
    </div>
  );
}

// Full page skeleton — used in AppShell Suspense fallback
export function SkeletonPage() {
  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }} aria-hidden="true" aria-busy="true" aria-label="Loading page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
        <Sk width={60} height={22} style={{ borderRadius: 'var(--radius-full)' }} />
        <Sk width={200} height={14} />
      </div>
      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
      </div>
      {/* Chart + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-5)' }}>
        <SkeletonCard rows={6} style={{ minHeight: 200 }} />
        <SkeletonCard rows={5} />
      </div>
      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
          <Sk width={120} height={13} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[1,2,3,4,5].map(i => <SkeletonTableRow key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Sk;
