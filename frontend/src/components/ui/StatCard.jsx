import { formatINR } from '../../utils/formatINR.js';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ label, value, delta, deltaType = 'neutral', subLabel, icon: Icon, accentColor }) {
  const deltaColor = deltaType === 'positive' ? 'var(--success-text)' : deltaType === 'negative' ? 'var(--danger-text)' : 'var(--text-muted)';

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
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
        {Icon && (
          <div
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              background: accentColor ? `${accentColor}1a` : 'var(--surface-2)',
              color: accentColor || 'var(--text-muted)',
            }}
          >
            <Icon size={16} aria-hidden="true" />
          </div>
        )}
      </div>
      <div>
        <div
          className="financial-number"
          style={{ fontSize: 'var(--text-2xl)', lineHeight: 1.1 }}
        >
          {value}
        </div>
        {(delta || subLabel) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              marginTop: 'var(--space-1)',
              fontSize: 'var(--text-xs)',
              color: delta ? deltaColor : 'var(--text-muted)',
            }}
          >
            {delta && deltaType === 'positive' && <TrendingUp size={12} aria-hidden="true" />}
            {delta && deltaType === 'negative' && <TrendingDown size={12} aria-hidden="true" />}
            <span>{delta || subLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
