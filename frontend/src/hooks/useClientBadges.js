/**
 * useClientBadges - charge en UNE requête (GET /badges) les trois compteurs
 * client (séjours à noter, réclamations ouvertes, notifications documents) et
 * les place dans le store partagé. Réduit le nombre d'appels parallèles sur
 * chaque page (3 -> 1) et reste synchronisé en temps réel via WebSocket.
 *
 * Stratégie « non-gourmande » (alignée sur useBadgeSync admin) :
 *  - WebSocket (Reverb) pour les mises à jour instantanées,
 *  - polling de secours (45 s) si le WebSocket n'est pas disponible,
 *  - rafraîchissement quand l'onglet redevient visible / reprend le focus.
 * Ainsi les bulles s'incrémentent sans avoir à recharger la page.
 *
 * À appeler UNE SEULE FOIS (Navbar). Les pages lisent depuis le store.
 */
import { useEffect, useCallback, useRef } from 'react';
import { badgesApi } from '../api/badges.api';
import { notificationsApi, DOCUMENT_CATEGORIES } from '../api/notifications.api';
import { getEcho }    from '../lib/echo';
import { useAuth }    from './useAuth';
import { useUiStore } from '../store/uiStore';

const CHANNEL = 'hotel-events';
const EVENT   = '.hotel.event';
const POLL_INTERVAL_MS = 45_000; // fallback si le WebSocket est indisponible
const MIN_COOLDOWN_MS  = 5_000;  // anti-rafale entre deux fetchs
const REFRESH_EVENTS = new Set([
  'reservation.created', 'reservation.cancelled', 'payment.confirmed',
  'checkin.done', 'checkout.done', 'refund.requested', 'refund.processed',
  'complaint.created', 'complaint.handled', 'review.submitted',
]);

export function useClientBadges() {
  const { isAuthenticated, isClient, user } = useAuth();
  const reviewCount       = useUiStore((s) => s.reviewCount);
  const complaintCount    = useUiStore((s) => s.complaintCount);
  const docCount          = useUiStore((s) => s.docCount);
  const setReviewCount    = useUiStore((s) => s.setReviewCount);
  const setComplaintCount = useUiStore((s) => s.setComplaintCount);
  const setDocCount       = useUiStore((s) => s.setDocCount);
  const debounce    = useRef(null);
  const lastFetchAt = useRef(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !isClient) {
      setReviewCount(0); setComplaintCount(0); setDocCount(0);
      return;
    }
    lastFetchAt.current = Date.now();
    try {
      const b = await badgesApi.client();
      setReviewCount(b.reviews ?? 0);
      setComplaintCount(b.complaints ?? 0);
      setDocCount(b.documents ?? 0);
    } catch {
      // silencieux - pas critique
    }
  }, [isAuthenticated, isClient, setReviewCount, setComplaintCount, setDocCount]);

  const markDocsRead = useCallback(async () => {
    setDocCount(0); // optimiste
    try { await notificationsApi.markAllRead(DOCUMENT_CATEGORIES); }
    catch { refresh(); }
  }, [setDocCount, refresh]);

  // Chargement initial
  useEffect(() => { refresh(); }, [refresh]);

  // Mise à jour temps-réel (debounce pour éviter les rafales)
  useEffect(() => {
    if (!isAuthenticated || !isClient) return;
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.channel(CHANNEL);
    const listener = ({ type, payload }) => {
      if (!REFRESH_EVENTS.has(type)) return;
      if (payload?.clientId && payload.clientId !== user?.id) return;
      clearTimeout(debounce.current);
      debounce.current = setTimeout(refresh, 800);
    };

    channel.listen(EVENT, listener);
    return () => {
      clearTimeout(debounce.current);
      channel.stopListening(EVENT, listener);
    };
  }, [isAuthenticated, isClient, user?.id, refresh]);

  // Fallback : polling régulier + rafraîchissement au retour sur l'onglet/focus.
  // Garantit l'incrémentation des bulles même si le WebSocket est indisponible.
  useEffect(() => {
    if (!isAuthenticated || !isClient) return;

    const maybeRefresh = () => {
      if (Date.now() - lastFetchAt.current >= MIN_COOLDOWN_MS) refresh();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') maybeRefresh(); };

    const interval = setInterval(maybeRefresh, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', maybeRefresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', maybeRefresh);
    };
  }, [isAuthenticated, isClient, refresh]);

  const total = isClient ? reviewCount + complaintCount + docCount : 0;

  return { reviewCount, complaintCount, docCount, total, refresh, markDocsRead };
}
