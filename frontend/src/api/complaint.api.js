import api from './axios';

/**
 * Catalogue des catégories de réclamation - doit rester aligné avec
 * App\Models\Complaint::CATEGORIES côté backend.
 * 'other' impose la saisie d'un objet libre (custom_subject).
 */
export const COMPLAINT_CATEGORIES = [
  { value: 'room_cleanliness', label: 'Propreté de la chambre' },
  { value: 'billing_issue',    label: 'Problème de facturation' },
  { value: 'payment_issue',    label: 'Problème de paiement' },
  { value: 'booking_error',    label: 'Erreur de réservation' },
  { value: 'amenities',        label: 'Équipement défectueux' },
  { value: 'staff_service',    label: 'Accueil / service' },
  { value: 'noise',            label: 'Nuisances sonores' },
  { value: 'other',            label: 'Autre' },
];

export const complaintApi = {
  /** Réclamations du client connecté. */
  mine: () =>
    api.get('/complaints').then((r) => r.data.data ?? []),

  /** Nombre de réclamations encore ouvertes → badge menu client. */
  pendingCount: () =>
    api.get('/complaints/pending-count').then((r) => r.data.count ?? 0),

  /** Créer une réclamation liée à une réservation. */
  create: (reservationId, payload) =>
    api.post(`/reservations/${reservationId}/complaints`, payload).then((r) => r.data),

  /** Annuler (supprimer) une réclamation ouverte. */
  remove: (id) =>
    api.delete(`/complaints/${id}`).then((r) => r.data),
};
