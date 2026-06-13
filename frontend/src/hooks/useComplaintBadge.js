/**
 * useComplaintBadge - Compte les réclamations encore ouvertes du client.
 *
 * - Interroge /complaints/pending-count au montage et après chaque
 *   événement WS complaint.created / complaint.handled le concernant.
 * - Expose `complaintCount` (number) et `refreshComplaintCount()` (manual trigger)
 * - Renvoie 0 si le client n'est pas authentifié.
 */
import { useEffect, useCallback, useRef } from 'react';
import { complaintApi } from '../api/complaint.api';
import { getEcho }      from '../lib/echo';
import { useAuth }      from './useAuth';
import { useUiStore }   from '../store/uiStore';

const CHANNEL = 'hotel-events';
const EVENT   = '.hotel.event';
const REFRESH_EVENTS = new Set(['complaint.created', 'complaint.handled']);

export function useComplaintBadge() {
  const { isAuthenticated, isClient, user } = useAuth();
  // Compteur partagé (store) → la bulle reste synchronisée partout.
  const complaintCount    = useUiStore((s) => s.complaintCount);
  const setComplaintCount = useUiStore((s) => s.setComplaintCount);
  const debounce = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!isAuthenticated || !isClient) { setComplaintCount(0); return; }
    try {
      const count = await complaintApi.pendingCount();
      setComplaintCount(count);
    } catch {
      // silencieux - pas critique
    }
  }, [isAuthenticated, isClient, setComplaintCount]);

  // Chargement initial
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

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

  return { complaintCount, refreshComplaintCount: fetchCount };
}
