// Counts API requests in flight so the full-screen loader (ApiLoadingOverlay) can show while any are running.
// api.js calls start()/end(); components read it with useSyncExternalStore(subscribe, getPending).
let pending = 0;
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn());

export function start() {
  pending += 1;
  emit();
}

export function end() {
  pending = Math.max(0, pending - 1);
  emit();
}

export const getPending = () => pending;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
