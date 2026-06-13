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
  uploadDocuments: (files) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('documents[]', f));
    return api
      .post('/profile/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
  deleteDocument: (path) => api.delete('/profile/documents', { data: { path } }).then((r) => r.data),
  // Récupère un document (image/PDF) en blob, authentifié, pour le drawer de consultation
  documentBlob: (path) =>
    api.get('/profile/documents/view', { params: { path }, responseType: 'blob' }).then((r) => r.data),

  // RGPD — export des données personnelles (blob JSON téléchargeable)
  dataExport: () => api.get('/profile/data-export', { responseType: 'blob' }).then((r) => r.data),
  // RGPD — droit à l'oubli (anonymisation + suppression du compte)
  deleteAccount: (payload) => api.delete('/profile', { data: payload }).then((r) => r.data),
};
