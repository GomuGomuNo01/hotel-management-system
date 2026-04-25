import api from './axios';

export const roomsApi = {
  list: (params) => api.get('/rooms', { params }).then((r) => r.data),
  get: (id) => api.get(`/rooms/${id}`).then((r) => r.data),
};

export const adminRoomsApi = {
  list: (params) => api.get('/admin/rooms', { params }).then((r) => r.data),
  get: (id) => api.get(`/admin/rooms/${id}`).then((r) => r.data),
  create: (payload) => api.post('/admin/rooms', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/admin/rooms/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/admin/rooms/${id}`).then((r) => r.data),
};
