/**
 * useAuthInit
 * ---------
 * Called once at app startup. When a token exists in the persisted store,
 * it hits GET /auth/me to refresh the user object (especially permissions)
 * from the server. This guarantees that stale localStorage data (e.g. a session
 * created before permissions were added) is always reconciled on load.
 */
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth.api';

export function useAuthInit() {
  const { token, login, logout } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    authApi.me()
      .then((res) => {
        const data = res?.data ?? res;
        if (data?.user && data?.role) {
          login(data.user, token, data.role);
        }
      })
      .catch((err) => {
        // 401 means token is expired / invalid - log the user out
        if (err?.response?.status === 401) {
          logout();
        }
        // For other errors (network, 500…) keep the stored session as-is
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
