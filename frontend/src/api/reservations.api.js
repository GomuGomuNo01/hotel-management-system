import api from './axios';

export const reservationsApi = {
  list: (params) => api.get('/reservations', { params }).then((r) => r.data),
  get: (id) => api.get(`/reservations/${id}`).then((r) => r.data),
  create: (payload) => api.post('/reservations', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/reservations/${id}`, payload).then((r) => r.data),
  cancel: (id) => api.delete(`/reservations/${id}`).then((r) => r.data),
};

export const adminReservationsApi = {
  list: (params) => api.get('/admin/reservations', { params }).then((r) => r.data),
  get: (id) => api.get(`/admin/reservations/${id}`).then((r) => r.data),
  update: (id, payload) => api.put(`/admin/reservations/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/admin/reservations/${id}`).then((r) => r.data),
  checkIn: (id) => api.post(`/admin/checkin/${id}`).then((r) => r.data),
  checkOut: (id) => api.post(`/admin/checkout/${id}`).then((r) => r.data),
};
