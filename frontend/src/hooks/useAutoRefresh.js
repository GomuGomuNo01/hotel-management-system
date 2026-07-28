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
    let channel   = null;
    let cancelled = false;

    const listener = ({ type, payload, at }) => {
      if (!typesSet.current.has(type)) return;
      if (filterRef.current && !filterRef.current(payload, type)) return;

      // Debounce : évite plusieurs rechargements pour des événements groupés
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onRefreshRef.current?.(type, payload, at);
      }, debounceMs);
    };

    /*
     * Import différé : laravel-echo + pusher-js (~72 ko) ne sont téléchargés
     * qu'au montage d'un écran qui écoute réellement les événements. Un
     * visiteur anonyme sur la page d'accueil ne paie plus ce coût — et
     * n'ouvre pas de connexion WebSocket inutile.
     */
    import('../lib/echo')
      .then(({ getEcho }) => {
        if (cancelled) return;
        const echo = getEcho();
        if (!echo) return; // dégradation gracieuse si Reverb indisponible

        channel = echo.channel(CHANNEL);
        channel.listen(EVENT, listener);
      })
      .catch(() => { /* temps réel indisponible : l'écran reste fonctionnel */ });

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer.current);
      // Ne pas quitter le canal ici - d'autres hooks l'utilisent peut-être
      // Le channel est partagé par référence dans Echo
      channel?.stopListening(EVENT, listener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionnel (réfs stables)
}
