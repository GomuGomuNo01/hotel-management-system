import api from './axios';

export const reviewApi = {
  /** Soumettre un avis pour une réservation (checked_out uniquement). */
  submit: (reservationId, { rating, comment }) =>
    api.post(`/reservations/${reservationId}/review`, { rating, comment }).then((r) => r.data),

  /** Nombre de séjours terminés en attente d'avis → badge navbar. */
  pendingCount: () =>
    api.get('/reviews/pending-count').then((r) => r.data.count ?? 0),

  /** Réservations terminées sans avis → alimente la page /mon-espace/avis. */
  reviewable: () =>
    api.get('/reviews/reviewable').then((r) => r.data.data ?? []),

  /** Avis déjà soumis par le client → historique. */
  mine: () =>
    api.get('/reviews/mine').then((r) => r.data.data ?? []),
};
