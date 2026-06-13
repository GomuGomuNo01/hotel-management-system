/**
 * echo.js - Instance Echo singleton pour la communication temps-réel.
 *
 * Utilise Laravel Reverb (compatible Pusher protocol) via pusher-js.
 * La connexion est établie une seule fois et réutilisée dans toute l'app.
 *
 * Reverb tourne sur ws://localhost:8080 (configurable via .env VITE_REVERB_*)
 */
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// pusher-js doit être disponible globalement pour que Echo le trouve
window.Pusher = Pusher;

let echoInstance = null;

export function getEcho() {
  if (echoInstance) return echoInstance;

  try {
    echoInstance = new Echo({
      broadcaster:       'reverb',
      key:               import.meta.env.VITE_REVERB_APP_KEY,
      wsHost:            import.meta.env.VITE_REVERB_HOST ?? 'localhost',
      wsPort:            import.meta.env.VITE_REVERB_PORT ?? 8080,
      wssPort:           import.meta.env.VITE_REVERB_PORT ?? 8080,
      forceTLS:          (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
      enabledTransports: ['ws', 'wss'],
      // Désactiver les logs en production
      disableStats:      true,
    });
  } catch (err) {
    console.warn('[Echo] Connexion Reverb impossible :', err);
    return null;
  }

  return echoInstance;
}

/** Déconnecte et nettoie l'instance (utile à la déconnexion de l'utilisateur). */
export function disconnectEcho() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}
