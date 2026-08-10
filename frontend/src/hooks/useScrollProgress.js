import { useState, useEffect, useRef } from 'react';

export function useScrollProgress(sectionRef) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / (window.innerHeight * 1.6)));
      setProgress(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionRef]);

  return progress;
}
