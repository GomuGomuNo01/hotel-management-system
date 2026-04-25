import api from './axios';

export const adminApi = {
  clients: {
    list: (params) => api.get('/admin/clients', { params }).then((r) => r.data),
    get: (id) => api.get(`/admin/clients/${id}`).then((r) => r.data),
  },
};
