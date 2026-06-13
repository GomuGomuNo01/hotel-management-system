/**
 * useReviewBadge - Compte les séjours terminés sans avis.
 *
 * - Interroge /reviews/pending-count au montage et après chaque checkout.done WS
 * - Expose `reviewCount` (number) et `refreshReviewCount()` (manual trigger)
 * - Renvoie 0 si le client n'est pas authentifié.
 */
import { useEffect, useCallback, useRef } from 'react';
import { reviewApi }  from '../api/review.api';
import { getEcho }    from '../lib/echo';
import { useAuth }    from './useAuth';
import { useUiStore } from '../store/uiStore';

const CHANNEL = 'hotel-events';
const EVENT   = '.hotel.event';
const REFRESH_EVENTS = new Set(['checkout.done']);

export function useReviewBadge() {
  const { isAuthenticated, isClient, user } = useAuth();
  // Compteur partagé (store) → la bulle reste synchronisée partout.
  const reviewCount    = useUiStore((s) => s.reviewCount);
  const setReviewCount = useUiStore((s) => s.setReviewCount);
  const debounce = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!isAuthenticated || !isClient) { setReviewCount(0); return; }
    try {
      const count = await reviewApi.pendingCount();
      setReviewCount(count);
    } catch {
      // silencieux - pas critique
    }
  }, [isAuthenticated, isClient, setReviewCount]);

  // Chargement initial
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Mise à jour temps-réel après checkout
  useEffect(() => {
    if (!isAuthenticated || !isClient) return;
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.channel(CHANNEL);
    const listener = ({ type, payload }) => {
      if (!REFRESH_EVENTS.has(type)) return;
      // Filtrer par clientId si disponible
      if (payload?.clientId && payload.clientId !== user?.id) return;

      clearTimeout(debounce.current);
      debounce.current = setTimeout(fetchCount, 800);
    };

    channel.listen(EVENT, listener);
    return () => {
      clearTimeout(debounce.current);
      channel.stopListening(EVENT, listener);
    };
  }, [isAuthenticated, isClient, user?.id, fetchCount]);

  return { reviewCount, refreshReviewCount: fetchCount };
}
