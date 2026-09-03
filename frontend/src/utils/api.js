import axios from 'axios';

const DEV_USER_ID = 'dev-bypass-user';
const isDev = import.meta.env.DEV;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // Send dev bypass header in development so the backend accepts requests without a real JWT cookie
    ...(isDev ? { 'X-Dev-User-Id': DEV_USER_ID } : {}),
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // A 401 from any of these public, unauthenticated auth-flow endpoints means
    // something entirely different from "your session token expired mid-use" —
    // wrong password, unknown email, expired OTP, etc. It should surface to the
    // caller as-is, never trigger a silent refresh-and-retry: there IS no
    // session to refresh yet, so that refresh attempt would itself 401 (with a
    // backend message like "No refresh token"), and its error — not the actual
    // login/register failure reason — is what ends up shown to the user, on top
    // of an unwanted hard window.location redirect. (The /auth/me case here also
    // prevents a genuine infinite reload loop: a logged-out visit to any page
    // fires /auth/me → 401 → refresh attempt → 401 again → hard redirect to
    // /login → app re-mounts → /auth/me again → same loop, forever.)
    const PUBLIC_AUTH_PATHS = ['/auth/me', '/auth/refresh', '/auth/login', '/auth/register', '/auth/send-otp', '/auth/verify-otp', '/auth/forgot-password', '/auth/reset-password'];
    const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((p) => original?.url?.includes(p));
    if (error.response?.status === 401 && !original._retry && !isPublicAuthCall) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original)).catch((e) => Promise.reject(e));
      }
      original._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (e) {
        processQueue(e);
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
