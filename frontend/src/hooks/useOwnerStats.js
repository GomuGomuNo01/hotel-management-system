import { useEffect, useState, useCallback, useRef } from 'react';
import { ownerApi }   from '../api/owner.api';
import { ttlCache }   from '../lib/ttlCache';

const CACHE_TTL_MS = 60_000; // 60 s - les stats owner changent peu souvent

/**
 * useOwnerStats - charge les 3 blocs du dashboard propriétaire.
 *
 * - Cache 60 s en mémoire pour éviter 3 aller-retours à chaque navigation
 * - refetch() invalide le cache (bouton Rafraîchir, événement WS)
 */
export const useOwnerStats = (period = '30d') => {
  const [stats,     setStats]     = useState(null);
  const [revenue,   setRevenue]   = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const cacheKey    = `owner-stats|${period}`;
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;

  const fetcher = useCallback(async (bypassCache = false) => {
    const key = cacheKeyRef.current;

    // ── Cache hit ────────────────────────────────────────────────────────────
    if (!bypassCache) {
      const cached = ttlCache.get(key);
      if (cached) {
        setStats(cached.stats);
        setRevenue(cached.revenue);
        setOccupancy(cached.occupancy);
        setLoading(false);
        return;
      }
    }

    // ── Fetch réseau ─────────────────────────────────────────────────────────
    setLoading(true);
    setError(null);
    try {
      const [s, r, o] = await Promise.all([
        ownerApi.dashboard.stats(),
        ownerApi.dashboard.revenue({ period }),
        ownerApi.dashboard.occupancy({ period }),
      ]);
      const statsData    = s?.data ?? s;
      const revenueData  = r?.data ?? r ?? [];
      const occupancyData = o?.data ?? o ?? [];

      setStats(statsData);
      setRevenue(revenueData);
      setOccupancy(occupancyData);
      ttlCache.set(key, { stats: statsData, revenue: revenueData, occupancy: occupancyData }, CACHE_TTL_MS);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetcher(false);
  }, [fetcher]);

  const refetch = useCallback(() => {
    ttlCache.delete(cacheKeyRef.current);
    return fetcher(true);
  }, [fetcher]);

  return { stats, revenue, occupancy, loading, error, refetch };
};
