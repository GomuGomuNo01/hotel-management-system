import api from './axios';

export const ownerApi = {
  admins: {
    list: (params) => api.get('/owner/admins', { params }).then((r) => r.data),
    get: (id) => api.get(`/owner/admins/${id}`).then((r) => r.data),
    create: (payload) => api.post('/owner/admins', payload, {
      headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }).then((r) => r.data),
    update: (id, payload) => {
      // Laravel ne supporte pas PUT avec multipart — on utilise POST + _method spoofing
      if (payload instanceof FormData) {
        payload.append('_method', 'PUT');
        return api.post(`/owner/admins/${id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).then((r) => r.data);
      }
      return api.put(`/owner/admins/${id}`, payload).then((r) => r.data);
    },
    remove: (id) => api.delete(`/owner/admins/${id}`).then((r) => r.data),
    toggleStatus: (id) => api.patch(`/owner/admins/${id}/status`).then((r) => r.data),
  },
  dashboard: {
    stats: () => api.get('/owner/dashboard/stats').then((r) => r.data),
    revenue: (params) => api.get('/owner/dashboard/revenue', { params }).then((r) => r.data),
    occupancy: (params) => api.get('/owner/dashboard/occupancy', { params }).then((r) => r.data),
  },
  audit: {
    list: (params) => api.get('/owner/audit-logs', { params }).then((r) => r.data),
    byAdmin: (adminId, params) =>
      api.get(`/owner/audit-logs/${adminId}`, { params }).then((r) => r.data),
  },
};
