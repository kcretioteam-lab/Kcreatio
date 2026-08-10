export default function Card({ children, style: extra, as: Tag = 'div', interactive = false, onClick, ...props }) {
  const interactiveHandlers = interactive ? {
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = 'var(--border-2)';
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'var(--card-shadow)';
    },
  } : {};

  return (
    <Tag
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        boxShadow: 'var(--card-shadow)',
        transition: interactive ? 'transform 200ms var(--ease-standard), border-color 150ms, box-shadow 200ms' : undefined,
        cursor: interactive ? 'pointer' : undefined,
        ...extra,
      }}
      {...interactiveHandlers}
      {...props}
    >
      {children}
    </Tag>
  );
}
