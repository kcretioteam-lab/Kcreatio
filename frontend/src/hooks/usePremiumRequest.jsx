import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../utils/api.js';
import { useAuth } from './useAuth.jsx';
import RequestPremiumModal from '../components/ui/RequestPremiumModal.jsx';

// Premium access by request — replaces paid upgrades while payments are disabled.
// Any upgrade CTA calls openRequest() to show the one shared modal.

const PremiumRequestContext = createContext(null);

export function PremiumRequestProvider({ children }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [request, setRequest] = useState(null); // latest request: { status, ... } | null

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/premium-requests/me');
      setRequest(res.data?.request || null);
    } catch { /* backend unavailable in dev — keep last known state */ }
  }, []);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  const openRequest = useCallback(() => setIsOpen(true), []);
  const isPending = request?.status === 'pending';

  return (
    <PremiumRequestContext.Provider value={{ openRequest, request, isPending, refresh }}>
      {children}
      <RequestPremiumModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        isPending={isPending}
        onSubmitted={(r) => setRequest(r)}
      />
    </PremiumRequestContext.Provider>
  );
}

export function usePremiumRequest() {
  const ctx = useContext(PremiumRequestContext);
  if (!ctx) throw new Error('usePremiumRequest must be used within PremiumRequestProvider');
  return ctx;
}
