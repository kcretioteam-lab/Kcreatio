import { useEffect, lazy, Suspense, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { UsageProvider } from './hooks/useUsage.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import AppShell from './components/layout/AppShell.jsx';
import { SkeletonPage } from './components/ui/Skeleton.jsx';
import PageTransition from './components/ui/PageTransition.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';

// Eager: auth-critical
import LandingPage from './pages/LandingPage.jsx';
import LandingPageV2 from './pages/LandingPageV2.jsx';
import LandingPageV3 from './pages/LandingPageV3.jsx';
import LandingPageV5 from './pages/LandingPageV5.jsx';
import LandingPageV6 from './pages/LandingPageV6.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Lazy: code-split per route
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const InvoicePage = lazy(() => import('./pages/InvoicePage.jsx'));
const TDSPage = lazy(() => import('./pages/TDSPage.jsx'));
const TaxPlannerPage = lazy(() => import('./pages/TaxPlannerPage.jsx'));
const DealsPage = lazy(() => import('./pages/DealsPage.jsx'));
const IncomePage = lazy(() => import('./pages/IncomePage.jsx'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));

const PageLoader = () => <SkeletonPage />;

// ── Theme context ─────────────────────────────────────────────────────────────
export const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });
export function useTheme() { return useContext(ThemeContext); }

function AppInitializer() { return null; }

// Auth-enforced route guard: redirects unauthenticated users to /login
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <SkeletonPage />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <SkeletonPage />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// Helper: wrap protected pages with error boundary + transition
function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          <ErrorBoundary>
            <PageTransition>
              {children}
            </PageTransition>
          </ErrorBoundary>
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        <AuthProvider>
          <UsageProvider>
            <ToastProvider>
              <AppInitializer />
              <a href="#main-content" className="skip-link">Skip to content</a>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/v2" element={<LandingPageV2 />} />
                <Route path="/v3" element={<LandingPageV3 />} />
                <Route path="/v5" element={<LandingPageV5 />} />
                <Route path="/v6" element={<LandingPageV6 />} />
                <Route path="/login" element={<PublicOnlyRoute><AuthPage defaultMode="login" /></PublicOnlyRoute>} />
                <Route path="/register" element={<PublicOnlyRoute><AuthPage defaultMode="register" /></PublicOnlyRoute>} />
                <Route path="/auth" element={<Navigate to="/login" replace />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                {/* Brand-facing payment confirmation — no auth, handled by backend */}
                <Route path="/confirm-payment/:token" element={<Navigate to="/" replace />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
                <Route path="/invoices" element={<Protected><InvoicePage /></Protected>} />
                <Route path="/invoices/new" element={<Protected><InvoicePage initialView="create" /></Protected>} />
                <Route path="/invoices/:id/edit" element={<Protected><InvoicePage initialView="edit" /></Protected>} />
                <Route path="/tds" element={<Protected><TDSPage /></Protected>} />
                <Route path="/tax-planner" element={<Protected><TaxPlannerPage /></Protected>} />
                <Route path="/deals" element={<Protected><DealsPage /></Protected>} />
                <Route path="/income" element={<Protected><IncomePage /></Protected>} />
                <Route path="/expenses" element={<Protected><ExpensesPage /></Protected>} />
                <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />

                {/* 404 — show NotFoundPage instead of redirecting */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ToastProvider>
          </UsageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}
