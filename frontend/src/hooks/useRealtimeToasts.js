/**
 * useRealtimeToasts - Notifications toast temps-réel pour les admins.
 *
 * Affiche des toasts discrets quand des événements importants arrivent
 * sur le canal hotel-events, sans interrompre le flux de travail.
 *
 * Appelé UNE SEULE FOIS dans AdminLayout (et OwnerLayout).
 * Les pages individuelles n'ont pas besoin de l'appeler.
 *
 * @param {Object} options
 * @param {string} options.role         - 'admin' | 'owner' : contrôle quels toasts afficher
 * @param {number} [options.currentUserId] - ID de l'admin connecté : supprime les toasts
 *                                          pour les actions qu'il vient lui-même de déclencher
 */
import { useEffect, useRef } from 'react';
import toast  from 'react-hot-toast';
import { getEcho } from '../lib/echo';

const CHANNEL = 'hotel-events';
const EVENT   = '.hotel.event';

// Délai minimum entre deux toasts du même type (évite le spam)
const TOAST_COOLDOWN_MS = 5_000;

export function useRealtimeToasts({ role = 'admin', currentUserId } = {}) {
  const lastToastAt = useRef({}); // { [type]: timestamp }

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.channel(CHANNEL);

    const listener = ({ type, payload }) => {
      const now = Date.now();
      if (now - (lastToastAt.current[type] ?? 0) < TOAST_COOLDOWN_MS) return;
      lastToastAt.current[type] = now;

      if (role === 'admin') {
        switch (type) {
          case 'reservation.created':
            toast('📅 Nouvelle réservation enregistrée', {
              duration: 4000,
              style: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' },
              icon: null,
            });
            break;
          case 'payment.confirmed':
            // Pas de toast si c'est l'admin connecté qui a enregistré le paiement en espèces
            if (currentUserId && payload?.actorId === currentUserId) break;
            toast('💳 Paiement reçu en ligne', {
              duration: 3500,
              style: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' },
              icon: null,
            });
            break;
          case 'refund.requested':
            toast('🔔 Un client demande un remboursement', {
              duration: 5000,
              style: { background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e' },
              icon: null,
            });
            break;
          case 'checkin.done':
            // Pas de toast si c'est l'admin connecté qui a déclenché le check-in
            // (la page Check-in/out affiche déjà son propre toast de confirmation)
            if (currentUserId && payload?.actorId === currentUserId) break;
            toast('🏨 Arrivée enregistrée par un collègue', {
              duration: 3000,
              style: { background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e40af' },
              icon: null,
            });
            break;
          case 'checkout.done':
            // Même principe que checkin.done
            if (currentUserId && payload?.actorId === currentUserId) break;
            toast('🚪 Départ validé par un collègue', {
              duration: 3000,
              style: { background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e40af' },
              icon: null,
            });
            break;
          case 'reservation.cancelled':
            // Pas de toast si c'est l'admin connecté qui a annulé la réservation
            if (currentUserId && payload?.actorId === currentUserId) break;
            toast(
              payload?.cancelledBy === 'client'
                ? '⚠️ Un client a annulé sa réservation'
                : '⚠️ Une réservation a été annulée',
              {
                duration: 4000,
                style: { background: '#fff1f2', border: '1px solid #fca5a5', color: '#991b1b' },
                icon: null,
              },
            );
            break;
          default:
            break;
        }
      } else if (role === 'owner') {
        // Patron : toasts discrets, uniquement les événements stratégiques
        switch (type) {
          case 'reservation.created':
            toast('📅 Nouvelle réservation enregistrée', {
              duration: 3000,
              style: { background: '#f9fafb', border: '1px solid #d1d5db', color: '#374151' },
              icon: null,
            });
            break;
          case 'refund.requested':
            toast('🔔 Nouvelle demande de remboursement', {
              duration: 3000,
              style: { background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e' },
              icon: null,
            });
            break;
          default:
            break;
        }
      }
    };

    channel.listen(EVENT, listener);

    return () => {
      channel.stopListening(EVENT, listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abonnement (re)créé selon le rôle ; currentUserId lu via closure stable
  }, [role]);
}
