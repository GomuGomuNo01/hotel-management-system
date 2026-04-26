import api from './axios';

export const profileApi = {
  get: () => api.get('/profile').then((r) => r.data),
  update: (payload) => api.patch('/profile', payload).then((r) => r.data),
  updatePassword: (payload) => api.patch('/profile/password', payload).then((r) => r.data),
  uploadPhoto: (file) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api
      .post('/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
  deletePhoto: () => api.delete('/profile/photo').then((r) => r.data),
};
