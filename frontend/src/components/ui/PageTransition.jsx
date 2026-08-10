import { useState, useEffect } from 'react';

export default function PageTransition({ children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 180ms var(--ease-decelerate), transform 180ms var(--ease-decelerate)',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
}
