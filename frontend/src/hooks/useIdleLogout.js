import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

/**
 * Déconnexion automatique côté client après une période d'inactivité, pour les
 * sessions standard (hors « Se souvenir de moi »). Complète l'expiration
 * glissante côté serveur : ici on redirige immédiatement l'utilisateur inactif,
 * sans attendre qu'une requête reçoive un 401.
 *
 * Fenêtre alignée sur le backend (SESSION_IDLE_MINUTES = 30 min).
 */
const IDLE_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange'];

export function useIdleLogout() {
  const token    = useAuthStore((s) => s.token);
  const remember = useAuthStore((s) => s.remember);
  const logout   = useAuthStore((s) => s.logout);
  const timerRef = useRef(null);

  useEffect(() => {
    // Sessions déconnectées ou « Se souvenir de moi » : pas de minuterie
    // (le serveur applique une fenêtre de 7 j pour le remember).
    if (!token || remember) return undefined;

    const arm = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
        toast('Session expirée pour inactivité. Veuillez vous reconnecter.', { icon: '🔒' });
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }, IDLE_MS);
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [token, remember, logout]);
}
