import { nightsBetween } from './formatDate';

/**
 * Logique métier de réservation, isolée et testable : détection de conflits de
 * dates, total du séjour, montant à régler immédiatement selon le plan.
 */

/** Le créneau [checkIn, checkOut[ chevauche-t-il une période déjà réservée ? */
export function overlapsUnavailable(checkIn, checkOut, periods = []) {
  if (!checkIn || !checkOut || !periods.length) return false;
  const s = new Date(checkIn);
  const e = new Date(checkOut);
  return periods.some((p) => s < new Date(p.check_out) && e > new Date(p.check_in));
}

/** Nombre de nuits entre deux dates (jamais négatif). */
export function nightsCount(checkIn, checkOut) {
  return nightsBetween(checkIn, checkOut);
}

/** Total du séjour = prix par nuit × nombre de nuits. */
export function reservationTotal(pricePerNight, nights) {
  return (pricePerNight || 0) * (nights || 0);
}

/**
 * Montant à régler immédiatement : 50 % en plan « partial » (acompte),
 * 100 % sinon (paiement intégral).
 */
export function amountDueNow(total, plan) {
  return plan === 'partial' ? total / 2 : total;
}

/**
 * Raison pour laquelle l'étape « dates » n'est pas encore validable, ou null
 * si tout est complet.
 *
 * Sert de libellé au bouton de validation : celui-ci restait grisé sans aucune
 * explication tant que les dates n'étaient pas saisies, laissant le client
 * devant un bouton mort sans savoir quoi corriger.
 *
 * @returns {string|null}
 */
export function reservationBlockReason({ checkIn, checkOut, nights, hasConflict }) {
  if (!checkIn && !checkOut) return 'Choisissez vos dates de séjour';
  if (!checkIn)              return "Choisissez la date d'arrivée";
  if (!checkOut)             return 'Choisissez la date de départ';
  if (nights <= 0)           return 'Le départ doit être après l’arrivée';
  if (hasConflict)           return 'Dates indisponibles — choisissez une autre période';
  return null;
}
