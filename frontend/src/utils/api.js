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
    // A 401 on these two IS the expected, normal outcome for "not logged in yet"
    // (checked on every app boot by fetchUser()) — it's not a mid-session expiry
    // that warrants a silent refresh-and-retry. Letting it through here means
    // fetchUser()'s own handler clears user state and loading cleanly, so
    // ProtectedRoute redirects via React Router — no hard reload, no loop.
    // Without this, a logged-out visit to any page triggered: 401 on /auth/me →
    // refresh attempt → 401 again (no session at all) → hard window.location
    // redirect to /login → which re-mounts the app → fetches /auth/me again →
    // same 401 → same failed refresh → same hard redirect, forever.
    const isAuthCheck = original?.url?.includes('/auth/me') || original?.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !original._retry && !isAuthCheck) {
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
