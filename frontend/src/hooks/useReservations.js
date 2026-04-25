import { useEffect, useState, useCallback } from 'react';
import { reservationsApi, adminReservationsApi } from '../api/reservations.api';

export const useReservations = (params, { admin = false } = {}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetcher = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiSet = admin ? adminReservationsApi : reservationsApi;
      const res = await apiSet.list(params);
      const items = res?.data?.data ?? res?.data ?? [];
      setData(items);
      setMeta(res?.data?.meta ?? res?.meta ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les réservations.');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params), admin]);

  useEffect(() => {
    fetcher();
  }, [fetcher]);

  return { data, meta, loading, error, refetch: fetcher };
};
