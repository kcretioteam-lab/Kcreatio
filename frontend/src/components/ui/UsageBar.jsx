import { Link } from 'react-router-dom';
import { getRequiredPlan, PLAN_DISPLAY } from '../../utils/planConfig.js';

/**
 * UsageBar — shows quota usage with a progress bar.
 * Renders nothing when limit is null (unlimited plan).
 *
 * Props:
 *   label       — text label, e.g. "Invoices this month"
 *   used        — current usage count
 *   limit       — plan limit (null = unlimited, renders nothing)
 *   upgradeText — CTA text shown when at limit (optional)
 */
export default function UsageBar({ label, used, limit, upgradeText }) {
  if (limit === null || limit === undefined) return null;

  const percent = Math.min(100, Math.round((used / limit) * 100));
  const isNearLimit = percent >= 80;
  const atLimit = used >= limit;

  const barColor = atLimit
    ? 'var(--danger)'
    : isNearLimit
    ? '#F59E0B'
    : 'var(--accent)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
          {label}
        </span>
        <span style={{
          fontSize: 'var(--text-xs)',
          color: atLimit ? 'var(--danger-text, #ef4444)' : 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {used} / {limit} used
        </span>
      </div>

      <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${percent}%`,
          background: barColor,
          borderRadius: 2,
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>

      {atLimit && upgradeText && (
        <Link
          to="/settings#billing"
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--accent)',
            textDecoration: 'none',
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          {upgradeText} →
        </Link>
      )}
    </div>
  );
}
