/**
 * Monitoring des erreurs (Sentry) — désactivé par défaut.
 *
 * @sentry/react n'est chargé (import dynamique) que si VITE_SENTRY_DSN est
 * défini : sans DSN, aucun octet de Sentry n'entre dans le bundle principal et
 * reportError() ne fait rien. Pour activer en production, renseigner
 * VITE_SENTRY_DSN à la compilation.
 */
let sentry = null;

export async function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  try {
    sentry = await import('@sentry/react');
    sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    });
  } catch (e) {
    // Ne jamais laisser l'échec d'init du monitoring casser l'application.
    sentry = null;
    console.error('Initialisation du monitoring impossible :', e);
  }
}

/** Remonte une erreur capturée. No-op si le monitoring n'est pas actif. */
export function reportError(error, context) {
  if (!sentry) return;
  sentry.captureException(error, context ? { extra: context } : undefined);
}
