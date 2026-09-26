// Full-screen loader shown while API requests are running: a centred spinner on a backdrop.
// While it's up, the app behind it is made `inert`, so nothing can be clicked, typed or tabbed to.
// It waits SHOW_DELAY before appearing so quick requests don't flash it, and stays at least
// MIN_VISIBLE once shown so it never blinks. Background calls opt out with { silent: true }.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { subscribe, getPending } from '../../utils/apiActivity';

const SHOW_DELAY = 250;  // ms before a slow request earns the overlay
const MIN_VISIBLE = 400; // ms the overlay stays up once shown
const FADE_OUT = 150;    // ms for the fade at the end — matches .api-overlay--leaving

// Only busy ↔ idle matters here; watching the raw count would restart the show-delay timer
// every time another request started, so a burst of calls could keep the overlay hidden.
const isBusy = () => getPending() > 0;

export default function ApiLoadingOverlay() {
  const busy = useSyncExternalStore(subscribe, isBusy);
  const [phase, setPhase] = useState('idle'); // idle → loading → leaving → idle
  const shownAt = useRef(0);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (busy) {
      if (phase === 'loading') return;
      const t = setTimeout(() => {
        shownAt.current = Date.now();
        setPhase('loading');
      }, phase === 'leaving' ? 0 : SHOW_DELAY);
      return () => clearTimeout(t);
    }
    if (phase !== 'loading') return;
    const wait = Math.max(0, MIN_VISIBLE - (Date.now() - shownAt.current));
    const t = setTimeout(() => setPhase('leaving'), wait);
    return () => clearTimeout(t);
  }, [busy, phase]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const t = setTimeout(() => setPhase('idle'), FADE_OUT);
    return () => clearTimeout(t);
  }, [phase]);

  // Lock the app while loading, then hand focus back to where the user was
  useEffect(() => {
    const app = document.getElementById('root');
    if (!app || phase !== 'loading') return;
    lastFocus.current = document.activeElement;
    app.inert = true;
    app.setAttribute('aria-busy', 'true');
    return () => {
      app.inert = false;
      app.removeAttribute('aria-busy');
      const el = lastFocus.current;
      if (el && el !== document.body && document.contains(el) && document.activeElement === document.body) {
        el.focus({ preventScroll: true });
      }
    };
  }, [phase]);

  if (phase === 'idle') return null;
  return createPortal(
    <div className={`api-overlay${phase === 'leaving' ? ' api-overlay--leaving' : ''}`}>
      <div className="api-overlay__card" role="status" aria-live="polite">
        <Loader2 size={32} className="api-overlay__spin" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    </div>,
    document.body,
  );
}
