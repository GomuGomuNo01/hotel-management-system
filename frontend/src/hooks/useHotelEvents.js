/**
 * useHotelEvents - Abonnement WebSocket au canal "hotel-events".
 *
 * S'abonne au canal public Reverb et distribue les événements entrants
 * via les callbacks fournis.
 *
 * Utilisation :
 *   useHotelEvents({
 *     onReservationCreated: (payload) => ...,
 *     onPaymentConfirmed:   (payload) => ...,
 *     // etc.
 *   });
 *
 * Le hook gère automatiquement l'abonnement/désabonnement
 * et la reconnexion si Reverb n'est pas disponible.
 *
 * IMPORTANT : appeler ce hook une seule fois par page/layout.
 * Pour les mises à jour de badges, tout passe par useBadgeSync.
 */
import { useEffect, useRef } from 'react';
import { getEcho }           from '../lib/echo';

const CHANNEL = 'hotel-events';
const EVENT   = '.hotel.event'; // le "." préfixe indique un event sans namespace de class

export function useHotelEvents(handlers = {}) {
  const handlersRef = useRef(handlers);

  // Garder les handlers à jour sans recréer l'abonnement
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return; // Reverb indisponible - dégradation gracieuse

    const channel = echo.channel(CHANNEL);

    channel.listen(EVENT, (data) => {
      const { type, payload, at } = data;
      const h = handlersRef.current;

      switch (type) {
        case 'reservation.created':
          h.onReservationCreated?.(payload, at);
          break;
        case 'reservation.cancelled':
          h.onReservationCancelled?.(payload, at);
          break;
        case 'payment.confirmed':
          h.onPaymentConfirmed?.(payload, at);
          break;
        case 'refund.requested':
          h.onRefundRequested?.(payload, at);
          break;
        case 'refund.processed':
          h.onRefundProcessed?.(payload, at);
          break;
        case 'checkin.done':
          h.onCheckinDone?.(payload, at);
          break;
        case 'checkout.done':
          h.onCheckoutDone?.(payload, at);
          break;
        default:
          h.onAny?.(type, payload, at);
      }
    });

    return () => {
      echo.leave(CHANNEL);
    };
  }, []); // une seule fois au montage
}
