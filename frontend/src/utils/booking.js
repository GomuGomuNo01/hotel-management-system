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
