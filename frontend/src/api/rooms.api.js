import api from './axios';

export const roomsApi = {
  list:             (params) => api.get('/rooms', { params }).then((r) => r.data),
  popular:          ()       => api.get('/rooms/popular').then((r) => r.data),
  get:              (id)     => api.get(`/rooms/${id}`).then((r) => r.data),
  reviews:          (id, params) => api.get(`/rooms/${id}/reviews`, { params }).then((r) => r.data),
  unavailableDates: (id)     => api.get(`/rooms/${id}/unavailable-dates`).then((r) => r.data),
  publicReviews:    (params) => api.get('/reviews/public', { params }).then((r) => r.data),
};

export const adminRoomsApi = {
  list: (params) => api.get('/admin/rooms', { params }).then((r) => r.data),
  get: (id) => api.get(`/admin/rooms/${id}`).then((r) => r.data),

  create: (payload) => {
    const isFormData = payload instanceof FormData;
    return api
      .post('/admin/rooms', payload, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
      })
      .then((r) => r.data);
  },

  update: (id, payload) => {
    const isFormData = payload instanceof FormData;
    if (isFormData) {
      payload.append('_method', 'PUT');
      return api
        .post(`/admin/rooms/${id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    }
    return api.put(`/admin/rooms/${id}`, payload).then((r) => r.data);
  },

  deleteImage: (roomId, imageId) =>
    api.delete(`/admin/rooms/${roomId}/images/${imageId}`).then((r) => r.data),

  setPrimaryImage: (roomId, imageId) =>
    api.put(`/admin/rooms/${roomId}/images/${imageId}/primary`).then((r) => r.data),

  remove: (id) => api.delete(`/admin/rooms/${id}`).then((r) => r.data),

  /** Suppression parallèle de plusieurs chambres */
  bulkRemove: (ids) =>
    Promise.all(ids.map((id) => api.delete(`/admin/rooms/${id}`).then((r) => r.data))),
};
