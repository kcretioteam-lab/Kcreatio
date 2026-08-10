import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../utils/api.js';
import { useAuth } from './useAuth.jsx';

const UsageContext = createContext(null);

const DEFAULT_USAGE = {
  plan: 'basic',
  invoices_this_month: 0, invoices_limit: 5,
  tds_entries_total:   0, tds_limit: 10,
  bank_accounts:       0, bank_limit: 1,
  upi_ids:             0, upi_limit: 1,
  tc_profiles:         0, tc_limit: 1,
  allowed_templates: ['classic', 'modern', 'compact'],
};

export function UsageProvider({ children }) {
  const { user } = useAuth();
  const [usage, setUsage] = useState(DEFAULT_USAGE);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/usage');
      setUsage(res.data);
    } catch {
      // Keep stale defaults on network error — don't block the UI
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Synchronous check — used to preemptively disable buttons before any API call
  const isAtLimit = useCallback((feature) => {
    switch (feature) {
      case 'invoices_monthly':
        return usage.invoices_limit !== null && usage.invoices_this_month >= usage.invoices_limit;
      case 'tds_entries':
        return usage.tds_limit !== null && usage.tds_entries_total >= usage.tds_limit;
      case 'bank_accounts':
        return usage.bank_accounts >= usage.bank_limit;
      case 'upi_ids':
        return usage.upi_ids >= usage.upi_limit;
      case 'tc_profiles':
        return usage.tc_profiles >= usage.tc_limit;
      default:
        return false;
    }
  }, [usage]);

  const remaining = useCallback((feature) => {
    switch (feature) {
      case 'invoices_monthly':
        return usage.invoices_limit === null ? null : Math.max(0, usage.invoices_limit - usage.invoices_this_month);
      case 'tds_entries':
        return usage.tds_limit === null ? null : Math.max(0, usage.tds_limit - usage.tds_entries_total);
      default:
        return null;
    }
  }, [usage]);

  return (
    <UsageContext.Provider value={{ usage, loading, refresh, isAtLimit, remaining }}>
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error('useUsage must be used within UsageProvider');
  return ctx;
}
