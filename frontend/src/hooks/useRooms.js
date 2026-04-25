import { useEffect, useState, useCallback } from 'react';
import { roomsApi, adminRoomsApi } from '../api/rooms.api';

export const useRooms = (params, { admin = false } = {}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetcher = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = admin ? adminRoomsApi : roomsApi;
      const res = await api.list(params);
      const items = res?.data?.data ?? res?.data ?? [];
      setData(items);
      setMeta(res?.data?.meta ?? res?.meta ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les chambres.');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params), admin]);

  useEffect(() => {
    fetcher();
  }, [fetcher]);

  return { data, meta, loading, error, refetch: fetcher };
};
