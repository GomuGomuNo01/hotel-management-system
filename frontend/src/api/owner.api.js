import api from './axios';

export const ownerApi = {
  profile: {
    get:            ()     => api.get('/owner/profile').then((r) => r.data),
    update:         (data) => api.put('/owner/profile', data).then((r) => r.data),
    updatePassword: (data) => api.put('/owner/profile/password', data).then((r) => r.data),
    uploadPhoto:    (file) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.post('/owner/profile/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    deletePhoto:    ()     => api.delete('/owner/profile/photo').then((r) => r.data),
  },
  admins: {
    list: (params) => api.get('/owner/admins', { params }).then((r) => r.data),
    get: (id) => api.get(`/owner/admins/${id}`).then((r) => r.data),
    create: (payload) => api.post('/owner/admins', payload, {
      headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }).then((r) => r.data),
    update: (id, payload) => {
      // Laravel ne supporte pas PUT avec multipart - on utilise POST + _method spoofing
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
  reviews: {
    list: (params) => api.get('/owner/reviews', { params }).then((r) => r.data),
  },
  reservations: {
    list: (params) => api.get('/owner/reservations', { params }).then((r) => r.data),
  },
  refunds: {
    list: (params) => api.get('/owner/refunds', { params }).then((r) => r.data),
    approve: (id, data) => api.post(`/owner/refunds/${id}/approve`, data).then((r) => r.data),
    reject: (id, data) => api.post(`/owner/refunds/${id}/reject`, data).then((r) => r.data),
    receiptBlob: (id) =>
      api.get(`/owner/refunds/${id}/receipt`, { responseType: 'blob' }).then((r) => r.data),
  },
  complaints: {
    list: (params) => api.get('/owner/complaints', { params }).then((r) => r.data),
    handle: (id, data) => api.post(`/owner/complaints/${id}/handle`, data).then((r) => r.data),
  },
  rooms: {
    list: (params) => api.get('/owner/rooms', { params }).then((r) => r.data),
    get: (id) => api.get(`/owner/rooms/${id}`).then((r) => r.data),
  },
  clients: {
    list: (params) => api.get('/owner/clients', { params }).then((r) => r.data),
    get: (id) => api.get(`/owner/clients/${id}`).then((r) => r.data),
    idDocumentBlob: (id, path) =>
      api.get(`/owner/clients/${id}/id-document`, { params: { path }, responseType: 'blob' }).then((r) => r.data),
  },
};
