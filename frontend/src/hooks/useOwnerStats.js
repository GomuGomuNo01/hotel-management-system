import { useEffect, useState, useCallback } from 'react';
import { ownerApi } from '../api/owner.api';

export const useOwnerStats = (period = '30d') => {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetcher = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, o] = await Promise.all([
        ownerApi.dashboard.stats(),
        ownerApi.dashboard.revenue({ period }),
        ownerApi.dashboard.occupancy({ period }),
      ]);
      setStats(s?.data ?? s);
      setRevenue(r?.data ?? r ?? []);
      setOccupancy(o?.data ?? o ?? []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetcher();
  }, [fetcher]);

  return { stats, revenue, occupancy, loading, error, refetch: fetcher };
};
