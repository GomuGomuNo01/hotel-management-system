import api from './axios';

export const paymentsApi = {
  initiate:    (payload)          => api.post('/payments/initiate', payload).then((r) => r.data),
  status:      (id)               => api.get(`/payments/${id}/status`).then((r) => r.data),
  cancel:      (id)               => api.delete(`/payments/${id}`).then((r) => r.data),
  simulate:    (id, outcome)      => api.post(`/payments/${id}/simulate`, { outcome }).then((r) => r.data),
  invoiceUrl:  (id)               => `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/payments/${id}/invoice`,
  invoiceBlob: (id)               => api.get(`/payments/${id}/invoice`, { responseType: 'blob' }).then((r) => r.data),
};
