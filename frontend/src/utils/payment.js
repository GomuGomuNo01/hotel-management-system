/**
 * Helpers purs du flux de paiement (libellé de type, compte à rebours),
 * isolés pour être testables indépendamment de l'UI.
 */

/** Libellé lisible du type de paiement. */
export function paymentTypeLabel(type) {
  return ({
    deposit: 'Acompte (50 %)',
    balance: 'Solde restant',
    full:    'Paiement intégral',
  }[type] ?? 'Paiement');
}

/** Secondes restantes avant expiration : null si pas de date, jamais négatif. */
export function secondsLeft(expiresAt) {
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
}
