/**
 * useAutoRefresh - Rafraîchissement automatique des données via WebSocket.
 *
 * Utilisé par les pages admin/client pour recharger leurs données
 * quand un événement pertinent est reçu sur le canal hotel-events.
 *
 * Exemple :
 *   useAutoRefresh(['reservation.created', 'reservation.cancelled'], fetchReservations);
 *   useAutoRefresh(['refund.requested', 'refund.processed'], fetchRefunds);
 *
 * @param {string[]} eventTypes - types d'événements qui déclenchent le refresh
 * @param {Function} onRefresh  - callback appelé quand un événement correspond
 * @param {Object}   [options]
 * @param {number}   [options.debounceMs=600] - délai anti-rebond en ms
 * @param {Function} [options.filter]         - filtre sur le payload (ex. vérifier clientId)
 */
import { useEffect, useRef } from 'react';
import { getEcho }           from '../lib/echo';

const CHANNEL = 'hotel-events';
const EVENT   = '.hotel.event';

export function useAutoRefresh(eventTypes, onRefresh, options = {}) {
  const { debounceMs = 600, filter } = options;

  const onRefreshRef  = useRef(onRefresh);
  const filterRef     = useRef(filter);
  const debounceTimer = useRef(null);
  const typesSet      = useRef(new Set(eventTypes));

  // Garder les refs à jour
  useEffect(() => { onRefreshRef.current  = onRefresh; });
  useEffect(() => { filterRef.current     = filter; });
  useEffect(() => { typesSet.current      = new Set(eventTypes); });

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return; // dégradation gracieuse si Reverb indisponible

    const channel = echo.channel(CHANNEL);

    const listener = ({ type, payload, at }) => {
      if (!typesSet.current.has(type)) return;
      if (filterRef.current && !filterRef.current(payload, type)) return;

      // Debounce : évite plusieurs rechargements pour des événements groupés
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onRefreshRef.current?.(type, payload, at);
      }, debounceMs);
    };

    channel.listen(EVENT, listener);

    return () => {
      clearTimeout(debounceTimer.current);
      // Ne pas quitter le canal ici - d'autres hooks l'utilisent peut-être
      // Le channel est partagé par référence dans Echo
      channel.stopListening(EVENT, listener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionnel (réfs stables)
}
