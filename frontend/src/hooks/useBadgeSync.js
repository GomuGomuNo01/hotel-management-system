/**
 * useBadgeSync - Synchronisation centralisée des bulles de notification admin.
 *
 * Doit être appelé UNE SEULE FOIS, dans AdminLayout.
 * Toutes les pages et composants lisent ensuite depuis le store Zustand.
 *
 * Optimisation : 3 appels API séparés → 1 seul GET /admin/dashboard/badges
 * Le backend n'exécute que les requêtes SQL correspondant aux permissions de l'admin.
 *
 * Stratégie "non-gourmande" :
 *  - WebSocket (Reverb) pour les mises à jour instantanées
 *  - Polling 60 s en fallback si Reverb n'est pas disponible
 *  - Debounce 400 ms sur badgeSignal (évite les cascades)
 *  - Cooldown 10 s entre deux fetchs
 *  - Refresh au retour sur l'onglet si inactif > 60 s
 */
import { useEffect, useRef, useCallback } from 'react';
import { adminApi }        from '../api/admin.api';
import { useUiStore }      from '../store/uiStore';
import { getEcho }         from '../lib/echo';

const POLL_INTERVAL_MS  = 60_000;  // polling de secours toutes les 60 secondes
const DEBOUNCE_MS       = 400;     // délai anti-rebond sur badgeSignal
const MIN_COOLDOWN_MS   = 10_000;  // pas de re-fetch si < 10 s depuis le dernier
const VISIBILITY_AGE_MS = 60_000;  // refresh à la visibilité si stale > 60 s
const CHANNEL           = 'hotel-events';
const EVENT             = '.hotel.event';

// Types d'événements qui impactent les badges
const BADGE_EVENTS = new Set([
  'reservation.created',   // nouveau dépôt potentiel
  'reservation.cancelled', // annulation avec remboursement potentiel
  'payment.confirmed',     // dépôt soldé
  'refund.requested',      // nouveau remboursement en attente
  'refund.processed',      // remboursement traité
  'checkin.done',          // check-in effectué → liste change
  'checkout.done',         // check-out effectué → liste change
  'complaint.created',     // nouvelle réclamation client
  'complaint.handled',     // réclamation traitée
  'room.updated',          // état ménage change (chambre à nettoyer)
  'room.deleted',          // chambre supprimée → recompte
]);

export function useBadgeSync() {
  const { badgeSignal, setBadgeCounts } = useUiStore();

  const lastFetchAt   = useRef(0);
  const debounceTimer = useRef(null);
  const wsConnected   = useRef(false);

  /* ── Fetch unique : 1 requête réseau, 1–3 SQL côté serveur ── */
  const fetchBadges = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchAt.current < MIN_COOLDOWN_MS) return;
    lastFetchAt.current = now;

    try {
      const res = await adminApi.badges();
      const data = res?.data ?? res;
      // data = { refunds, deposits, checkins, complaints, housekeeping }
      // seuls les champs correspondant aux permissions de l'admin sont > 0
      if (data && typeof data === 'object') {
        setBadgeCounts({
          refunds:      data.refunds      ?? 0,
          deposits:     data.deposits     ?? 0,
          checkins:     data.checkins     ?? 0,
          complaints:   data.complaints   ?? 0,
          housekeeping: data.housekeeping ?? 0,
        });
      }
    } catch { /* silencieux - les badges ne sont pas bloquants */ }
  }, [setBadgeCounts]);

  /* ── Fetch initial + polling de secours ── */
  useEffect(() => {
    fetchBadges(true);

    const interval = setInterval(() => {
      if (!wsConnected.current) {
        fetchBadges();
      } else {
        // WS actif : polling long comme filet de sécurité (5 min)
        const stale = Date.now() - lastFetchAt.current > 300_000;
        if (stale) fetchBadges(true);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchBadges]);

  /* ── WebSocket - abonnement au canal hotel-events ── */
  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.channel(CHANNEL);
    wsConnected.current = true;

    const listener = ({ type }) => {
      if (!BADGE_EVENTS.has(type)) return;
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => fetchBadges(true), DEBOUNCE_MS);
    };

    channel.listen(EVENT, listener);

    return () => {
      wsConnected.current = false;
      channel.stopListening(EVENT, listener);
      clearTimeout(debounceTimer.current);
    };
  }, [fetchBadges]);

  /* ── Debounce sur badgeSignal (déclenché manuellement par les pages) ── */
  useEffect(() => {
    if (badgeSignal === 0) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchBadges(true), DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
  }, [badgeSignal, fetchBadges]);

  /* ── Refresh au retour sur l'onglet ── */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const stale = Date.now() - lastFetchAt.current > VISIBILITY_AGE_MS;
      if (stale) fetchBadges(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchBadges]);
}
