import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
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
  // Dev bypass only applies in dev builds — matches the same import.meta.env.DEV
  // gate api.js uses for the X-Dev-User-Id header. Without this check, every
  // production page load started "logged in" as MOCK_USER before the real
  // session was ever checked, which also made Sign Out look broken: clearing
  // the real session worked, but any reload reset state right back to MOCK_USER.
  user: import.meta.env.DEV ? MOCK_USER : null,
  // In production, start in "loading" until the session check below resolves —
  // ProtectedRoute waits on this before deciding whether to redirect to /login,
  // so a real logged-in user refreshing the page doesn't get bounced out during
  // the brief window before fetchUser() confirms their session.
  loading: !import.meta.env.DEV,
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

  // Tracks the in-flight boot-time /auth/me check so login()/register() can
  // cancel it — otherwise a slow session check fired while the user was still
  // on the login page could resolve with 401 *after* a fresh login succeeded,
  // clobbering the just-set real user with CLEAR_USER and bouncing back to
  // /login right after getting in.
  const fetchAbortRef = useRef(null);

  const fetchUser = useCallback(async () => {
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    try {
      const res = await api.get('/auth/me', { signal: controller.signal });
      dispatch({ type: 'SET_USER', payload: res.data });
    } catch (e) {
      if (e?.code === 'ERR_CANCELED') return; // superseded by login/register, ignore
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        dispatch({ type: 'CLEAR_USER' });
      } else {
        // 5xx or network error: stop loading so ProtectedRoute can redirect to login
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, []);

  // Rehydrate the real session from the httpOnly cookie on first load, in
  // production only. Previously only SettingsPage called fetchUser() — every
  // other page relied on MOCK_USER (always populated) to avoid a blank state,
  // which silently masked a real logged-in user's session never being
  // restored on refresh anywhere else in the app. Skipped in dev since
  // MOCK_USER already covers that case without touching the network.
  useEffect(() => {
    if (import.meta.env.PROD) {
      fetchUser();
    }
  }, [fetchUser]);

  const login = useCallback(async (identifier, password) => {
    fetchAbortRef.current?.abort(); // this login supersedes any in-flight session check
    // Deliberately NOT dispatching SET_LOADING here — AuthPage already tracks its
    // own local loading state for the submit button. Dispatching the shared
    // context loading flag made PublicOnlyRoute/ProtectedRoute (which gate on
    // it) swap the whole page to <SkeletonPage/> on every login attempt,
    // unmounting AuthPage mid-request — so a failed login's setErrors() call
    // landed on an already-unmounted component and silently vanished, making
    // failed logins look like a blank flash back to an empty form.
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
    fetchAbortRef.current?.abort(); // same race as login() — a fresh registration supersedes it
    // Same reasoning as login() above — AuthPage tracks its own loading state.
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
