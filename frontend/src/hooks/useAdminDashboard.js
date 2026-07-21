import { useEffect, useState, useCallback } from 'react';
import { adminApi }  from '../api/admin.api';
import { ttlCache }  from '../lib/ttlCache';

const CACHE_KEY    = 'admin-dashboard-stats';
const CACHE_TTL_MS = 30_000; // 30 s

/**
 * useAdminDashboard - stats du dashboard admin avec cache TTL.
 *
 * - Mount/re-navigation : sert depuis le cache si < 30 s → pas de spinner
 * - refetch() : bypass (mutations, événements WS)
 */
export function useAdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetcher = useCallback(async (bypassCache = false) => {
    if (!bypassCache) {
      const cached = ttlCache.get(CACHE_KEY);
      if (cached) { setData(cached); setLoading(false); return; }
    }

    setLoading(true);
    setError(null);
    try {
      const res  = await adminApi.dashboard.stats();
      const body = res?.data ?? res;
      setData(body);
      ttlCache.set(CACHE_KEY, body, CACHE_TTL_MS);
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetcher(false); }, [fetcher]);

  const refetch = useCallback(() => {
    ttlCache.delete(CACHE_KEY);
    return fetcher(true);
  }, [fetcher]);

  return { data, loading, error, refetch };
}
