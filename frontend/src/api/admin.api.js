import api from './axios';

export const adminApi = {
  dashboard: {
    stats: () => api.get('/admin/dashboard/stats').then((r) => r.data),
  },
  clients: {
    list: (params) => api.get('/admin/clients', { params }).then((r) => r.data),
    get: (id) => api.get(`/admin/clients/${id}`).then((r) => r.data),
  },
  checkIn:  (id) => api.post(`/admin/checkin/${id}`).then((r) => r.data),
  checkOut: (id) => api.post(`/admin/checkout/${id}`).then((r) => r.data),
};
