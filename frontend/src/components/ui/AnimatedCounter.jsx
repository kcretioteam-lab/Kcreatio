import { useState, useEffect, useRef } from 'react';

// Shared animated counter — counts from 0 to `to` when visible.
// `format` renders each frame's value, e.g. formatINR for money.
export default function AnimatedCounter({ to, suffix = '', duration = 1400, format }) {
  const ref = useRef(null);
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || started.current || to === 0) return;
    started.current = true;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [visible, to, duration]);

  // When to===0, show 0 immediately
  useEffect(() => {
    if (to === 0) setCount(0);
  }, [to]);

  return <span ref={ref}>{format ? format(count) : count}{suffix}</span>;
}
