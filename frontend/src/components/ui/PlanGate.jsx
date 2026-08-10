import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { canAccess, getRequiredPlan, PLAN_DISPLAY } from '../../utils/planConfig.js';
import { useAuth } from '../../hooks/useAuth.jsx';

/**
 * PlanGate — shows children if user has access, otherwise shows a locked upgrade card.
 *
 * Props:
 *   feature        — key from FEATURE_REQUIREMENTS in planConfig.js
 *   children       — content to show if accessible
 *   teaserContent  — optional blurred preview shown behind the lock (JSX)
 *   compact        — show a small inline lock badge instead of a full card
 */
export default function PlanGate({ feature, children, teaserContent = null, compact = false }) {
  const { user } = useAuth();
  const plan = user?.plan || 'basic';

  if (canAccess(feature, plan)) return children;

  const required = getRequiredPlan(feature);
  const requiredDisplay = PLAN_DISPLAY[required] || { name: 'Pro', price: 599 };

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-3)', background: 'var(--surface-2)',
        borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
      }}>
        <Lock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Available on <strong style={{ color: 'var(--text-primary)' }}>{requiredDisplay.name}</strong> plan
        </span>
        <Link
          to="/settings#billing"
          style={{
            marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--accent)',
            fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          Upgrade →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: 240, borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
      {/* Blurred teaser content behind the lock overlay */}
      {teaserContent && (
        <div style={{
          filter: 'blur(5px)', opacity: 0.35, pointerEvents: 'none',
          userSelect: 'none', position: 'absolute', inset: 0, overflow: 'hidden',
        }}>
          {teaserContent}
        </div>
      )}

      {/* Lock overlay */}
      <div style={{
        position: teaserContent ? 'absolute' : 'static',
        inset: teaserContent ? 0 : undefined,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 'var(--space-4)',
        padding: 'var(--space-10) var(--space-6)',
        background: teaserContent
          ? 'rgba(0,0,0,0.65)'
          : 'var(--surface)',
        border: teaserContent ? 'none' : '1px solid var(--border)',
        borderRadius: teaserContent ? 0 : 'var(--radius-xl)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={20} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        </div>

        <div>
          <p style={{
            fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)', fontSize: 'var(--text-md)',
          }}>
            Available on {requiredDisplay.name} plan
          </p>
          <p style={{
            fontSize: 'var(--text-sm)', color: 'var(--text-muted)',
            maxWidth: 320, lineHeight: 1.5,
          }}>
            Upgrade to unlock this feature and get full access to all {requiredDisplay.name} capabilities.
          </p>
        </div>

        <Link
          to="/settings#billing"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 var(--space-6)', height: 44,
            background: 'var(--accent)', color: '#fff',
            borderRadius: 'var(--radius-md)', fontWeight: 700,
            fontSize: 'var(--text-sm)', textDecoration: 'none',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Upgrade to {requiredDisplay.name}
          {requiredDisplay.price > 0 && ` — ₹${requiredDisplay.price.toLocaleString('en-IN')}/month`}
        </Link>

        <Link
          to="/settings#billing"
          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textDecoration: 'underline' }}
        >
          View all plans
        </Link>
      </div>
    </div>
  );
}
