import { useEffect, useState, useCallback, useRef } from 'react';
import { reservationsApi, adminReservationsApi } from '../api/reservations.api';
import { ttlCache } from '../lib/ttlCache';

const CACHE_TTL_MS = 30_000; // 30 s - expire assez vite pour ne pas afficher de données périmées

/**
 * useReservations - charge et met en cache les réservations.
 *
 * - Premier mount : sert depuis le cache si disponible (< 30 s) → affichage instantané
 * - refetch(true) : bypass le cache (utilisé après une mutation ou un événement WS)
 * - refetch() sans argument : bypass aussi (action manuelle de l'utilisateur)
 */
export const useReservations = (params, { admin = false } = {}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paramsKey = JSON.stringify(params);
  const cacheKey  = `reservations|${admin ? 'admin' : 'client'}|${paramsKey}`;

  // Ref stable pour éviter de recréer fetcher à chaque render
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;

  const fetcher = useCallback(async (bypassCache = false) => {
    const key = cacheKeyRef.current;

    // ── Lecture cache (stale-while-revalidate) ────────────────────────────────
    let servedStale = false;
    if (!bypassCache) {
      const entry = ttlCache.peek(key);
      if (entry) {
        setData(entry.value.data);
        setMeta(entry.value.meta);
        setLoading(false);
        if (entry.fresh) return;   // données fraîches → rien d'autre à faire
        servedStale = true;        // périmées → on revalide en arrière-plan
      }
    }

    // ── Fetch réseau ─────────────────────────────────────────────────────────
    if (!servedStale) setLoading(true); // spinner uniquement si rien à afficher
    setError(null);
    try {
      const apiSet = admin ? adminReservationsApi : reservationsApi;
      const res    = await apiSet.list(params);
      const items  = res?.data?.data ?? res?.data ?? [];
      const m      = res?.data?.meta ?? res?.meta ?? null;

      setData(items);
      setMeta(m);
      ttlCache.set(key, { data: items, meta: m }, CACHE_TTL_MS);
    } catch (err) {
      // Ne pas écraser des données déjà affichées par une erreur de revalidation
      if (!servedStale) setError(err.response?.data?.message || 'Impossible de charger les réservations.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, admin]);

  useEffect(() => {
    fetcher(false); // utilise le cache au mount
  }, [fetcher]);

  /** refetch() → bypass cache (mutation / WS) */
  const refetch = useCallback(() => {
    ttlCache.delete(cacheKeyRef.current);
    return fetcher(true);
  }, [fetcher]);

  return { data, meta, loading, error, refetch };
};
