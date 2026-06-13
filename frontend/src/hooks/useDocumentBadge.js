/**
 * useDocumentBadge - Compte les notifications « documents » non lues du client
 * (réservation confirmée, paiement, reçu, facture, remboursement).
 *
 * - Interroge /notifications/unread-count?categories=… au montage et après
 *   chaque événement WS pertinent.
 * - Expose `docCount`, `refreshDocCount()` et `markDocsRead()`.
 * - Compteur partagé via le store → la bulle reste synchronisée partout.
 */
import { useEffect, useCallback, useRef } from 'react';
import { notificationsApi, DOCUMENT_CATEGORIES } from '../api/notifications.api';
import { getEcho }    from '../lib/echo';
import { useAuth }    from './useAuth';
import { useUiStore } from '../store/uiStore';

const CHANNEL = 'hotel-events';
const EVENT   = '.hotel.event';
const REFRESH_EVENTS = new Set([
  'reservation.created', 'payment.confirmed', 'checkout.done',
  'refund.requested', 'refund.processed', 'reservation.cancelled',
]);

export function useDocumentBadge() {
  const { isAuthenticated, isClient, user } = useAuth();
  const docCount    = useUiStore((s) => s.docCount);
  const setDocCount = useUiStore((s) => s.setDocCount);
  const debounce = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!isAuthenticated || !isClient) { setDocCount(0); return; }
    try {
      setDocCount(await notificationsApi.unreadCount(DOCUMENT_CATEGORIES));
    } catch {
      // silencieux - pas critique
    }
  }, [isAuthenticated, isClient, setDocCount]);

  const markDocsRead = useCallback(async () => {
    setDocCount(0); // optimiste
    try { await notificationsApi.markAllRead(DOCUMENT_CATEGORIES); }
    catch { fetchCount(); }
  }, [setDocCount, fetchCount]);

  // Chargement initial
  useEffect(() => { fetchCount(); }, [fetchCount]);

  // Mise à jour temps-réel
  useEffect(() => {
    if (!isAuthenticated || !isClient) return;
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.channel(CHANNEL);
    const listener = ({ type, payload }) => {
      if (!REFRESH_EVENTS.has(type)) return;
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

  return { docCount, refreshDocCount: fetchCount, markDocsRead };
}
