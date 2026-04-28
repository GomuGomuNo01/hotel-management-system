import api from './axios';

export const paymentsApi = {
  initiate:    (payload)          => api.post('/payments/initiate', payload).then((r) => r.data),
  status:      (id)               => api.get(`/payments/${id}/status`).then((r) => r.data),
  cancel:      (id)               => api.delete(`/payments/${id}`).then((r) => r.data),
  simulate:    (id, outcome)      => api.post(`/payments/${id}/simulate`, { outcome }).then((r) => r.data),
  invoiceUrl:  (id)               => `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/payments/${id}/invoice`,
  invoiceBlob: (id)               => api.get(`/payments/${id}/invoice`, { responseType: 'blob' }).then((r) => r.data),
  // Reçu récapitulatif de réservation (client)
  receiptBlob: (reservationId)    => api.get(`/reservations/${reservationId}/receipt`, { responseType: 'blob' }).then((r) => r.data),
};

export const adminPaymentsApi = {
  // Enregistrer un paiement en espèces lors du check-in
  cashPayment: (reservationId) => api.post(`/admin/reservations/${reservationId}/cash-payment`).then((r) => r.data),
  // Reçu récapitulatif de réservation (admin)
  receiptBlob: (reservationId) => api.get(`/admin/reservations/${reservationId}/receipt`, { responseType: 'blob' }).then((r) => r.data),
};
