import { differenceInCalendarDays, parseISO } from 'date-fns';

/**
 * Logique pure du planning d'occupation, isolée du composant pour être testée
 * indépendamment du rendu (positionnement des barres, empilement en lanes,
 * détection des conflits d'occupation).
 *
 * Les dates de réservation sont des chaînes ISO « yyyy-MM-dd » comparables
 * lexicographiquement — d'où l'usage de localeCompare / comparaisons de chaînes.
 */

/** Deux intervalles [aIn, aOut) et [bIn, bOut) se chevauchent-ils ? */
export const overlaps = (aIn, aOut, bIn, bOut) => aIn < bOut && bIn < aOut;

/**
 * Répartit les réservations d'une chambre en « lanes » (sous-lignes) : deux
 * séjours qui se chevauchent reçoivent des lanes différentes, rendant le
 * conflit visible au lieu de superposer les barres. Algorithme glouton par
 * date d'arrivée croissante.
 */
export function assignLanes(reservations) {
  const sorted = [...reservations].sort((a, b) =>
    a.check_in_date.localeCompare(b.check_in_date)
  );
  const lanes = []; // lanes[i] = date de départ du dernier séjour placé sur la lane i
  return sorted.map((r) => {
    let lane = lanes.findIndex((end) => end <= r.check_in_date);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(r.check_out_date);
    } else {
      lanes[lane] = r.check_out_date;
    }
    return { ...r, lane };
  });
}

/**
 * Ensemble des identifiants de réservations en conflit d'occupation : deux
 * séjours actifs (déjà filtrés hors annulations en amont) qui se chevauchent
 * sur une même chambre.
 */
export function findConflicts(rooms) {
  const set = new Set();
  for (const room of rooms) {
    const rs = room.reservations ?? [];
    for (let i = 0; i < rs.length; i++) {
      for (let j = i + 1; j < rs.length; j++) {
        if (overlaps(rs[i].check_in_date, rs[i].check_out_date, rs[j].check_in_date, rs[j].check_out_date)) {
          set.add(rs[i].id);
          set.add(rs[j].id);
        }
      }
    }
  }
  return set;
}

/**
 * Géométrie d'une barre dans une fenêtre de `days` jours commençant à `from`
 * (Date). Renvoie les index de colonnes bornés à la fenêtre et la largeur en
 * colonnes (span). Un span ≤ 0 signifie que la barre est hors fenêtre.
 */
export function barGeometry(reservation, from, days) {
  const startIdx = Math.max(0, differenceInCalendarDays(parseISO(reservation.check_in_date), from));
  const endIdx   = Math.min(days, differenceInCalendarDays(parseISO(reservation.check_out_date), from));
  return { startIdx, endIdx, span: endIdx - startIdx };
}
