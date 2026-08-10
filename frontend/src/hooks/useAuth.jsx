import { createContext, useContext, useReducer, useCallback } from 'react';
import api from '../utils/api.js';
import { canAccess as canAccessFn } from '../utils/planConfig.js';

const AuthContext = createContext(null);

// ── DEV BYPASS ───────────────────────────────────────────────────────────────
// Change `plan` here to test different tiers: 'basic' | 'trial' | 'starter' | 'pro' | 'business'
const MOCK_USER = {
  id: 'dev-bypass-user',
  name: 'Admin User',
  email: 'admin@kcreatio.in',
  business_name: 'Test Creator Channel',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  business_address: '123 Creator Street, Bengaluru, Karnataka - 560001',
  state_code: '29',
  invoice_prefix: 'ADM',
  plan: 'pro',   // Use 'basic' to test feature gates
  trial_ends_at: null,
  phone: '+91 98765 43210',
  show_phone_on_invoice: true,
  invoice_phone: '',
  invoice_email: '',
  avatar_url: null,
  created_at: '2025-01-15T10:00:00Z',
};
// ─────────────────────────────────────────────────────────────────────────────

const initialState = {
  user: MOCK_USER,
  loading: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false, error: null };
    case 'CLEAR_USER':
      return { ...state, user: null, loading: false, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      dispatch({ type: 'SET_USER', payload: res.data });
    } catch (e) {
      // Only clear user on auth failures (401/403), not on server errors
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        dispatch({ type: 'CLEAR_USER' });
      }
      // On 5xx or network error: keep current user state (DB may not be configured yet)
    }
  }, []);

  const login = useCallback(async (identifier, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.post('/auth/login', { identifier, password });
      dispatch({ type: 'SET_USER', payload: res.data.user });
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.message || 'Login failed';
      const code = e.response?.data?.error;
      dispatch({ type: 'SET_ERROR', payload: msg });
      return { success: false, error: msg, errorCode: code };
    }
  }, []);

  const register = useCallback(async (name, email, password, extras = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.post('/auth/register', {
        name, email, password,
        verificationToken: extras.verificationToken,
        termsAccepted: extras.termsAccepted,
        marketingEmails: extras.marketingEmails ?? true,
        phone: extras.phone || undefined,
      });
      dispatch({ type: 'SET_USER', payload: res.data.user });
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: msg });
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      dispatch({ type: 'CLEAR_USER' });
    }
  }, []);

  const trialDaysLeft = useCallback(() => {
    if (!state.user?.trial_ends_at) return 0;
    const msLeft = new Date(state.user.trial_ends_at) - new Date();
    return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  }, [state.user]);

  const isTrialActive = useCallback(() => {
    if (!state.user) return false;
    if (state.user.plan !== 'trial') return false;
    return trialDaysLeft() > 0;
  }, [state.user, trialDaysLeft]);

  const hasActivePlan = useCallback(() => {
    if (!state.user) return false;
    if (['starter', 'pro', 'business'].includes(state.user.plan)) return true;
    return isTrialActive();
  }, [state.user, isTrialActive]);

  // Shortcut for checking feature access from any component
  const canAccess = useCallback((feature) => {
    return canAccessFn(feature, state.user?.plan || 'basic');
  }, [state.user]);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        loading: state.loading,
        error: state.error,
        fetchUser,
        login,
        register,
        logout,
        trialDaysLeft,
        isTrialActive,
        hasActivePlan,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
