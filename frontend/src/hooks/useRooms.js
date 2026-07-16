import { useEffect, useState, useCallback, useRef } from 'react';
import { roomsApi, adminRoomsApi } from '../api/rooms.api';
import { ttlCache } from '../lib/ttlCache';
import { useAutoRefresh } from './useAutoRefresh';

const CACHE_TTL_MS = 60_000; // 60 s - les chambres changent moins souvent que les réservations

/** Événements temps réel qui invalident la liste des chambres. */
export const ROOM_SYNC_EVENTS = [
  'room.updated',
  'room.deleted',
  'reservation.created',
  'reservation.cancelled',
  'checkin.done',
  'checkout.done',
];

/**
 * useRooms - charge et met en cache la liste des chambres.
 *
 * - Premier mount : sert depuis le cache si disponible (< 60 s)
 * - refetch() : bypass le cache (après une mutation ou un événement WS)
 * - Temps réel : toute mise à jour de chambre ou de réservation diffusée sur
 *   hotel-events recharge la liste (ex. passage en maintenance → la chambre
 *   disparaît immédiatement côté client, sans rafraîchir la page).
 */
export const useRooms = (params, { admin = false } = {}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paramsKey = JSON.stringify(params);
  const cacheKey  = `rooms|${admin ? 'admin' : 'public'}|${paramsKey}`;

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
      const api = admin ? adminRoomsApi : roomsApi;
      // bypassCache (mutation ou événement WS) : casser aussi le cache HTTP
      // navigateur de la route publique /rooms (Cache-Control: max-age=60).
      const res = admin ? await api.list(params) : await api.list(params, { fresh: bypassCache });
      const items = res?.data?.data ?? res?.data ?? [];
      const m     = res?.data?.meta ?? res?.meta ?? null;

      setData(items);
      setMeta(m);
      ttlCache.set(key, { data: items, meta: m }, CACHE_TTL_MS);
    } catch (err) {
      if (!servedStale) setError(err.response?.data?.message || 'Impossible de charger les chambres.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, admin]);

  useEffect(() => {
    fetcher(false);
  }, [fetcher]);

  /** refetch() → bypass cache */
  const refetch = useCallback(() => {
    ttlCache.delete(cacheKeyRef.current);
    return fetcher(true);
  }, [fetcher]);

  // Synchro temps réel : recharge (hors cache) dès qu'une chambre ou une
  // réservation change côté backend.
  useAutoRefresh(ROOM_SYNC_EVENTS, refetch);

  return { data, meta, loading, error, refetch };
};
