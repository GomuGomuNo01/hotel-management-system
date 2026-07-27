import api from './axios';

export const adminApi = {
  dashboard: {
    stats: () => api.get('/admin/dashboard/stats').then((r) => r.data),
  },
  profile: {
    get: () => api.get('/admin/profile').then((r) => r.data),
    update: (payload) => api.patch('/admin/profile', payload).then((r) => r.data),
    updatePassword: (payload) => api.patch('/admin/profile/password', payload).then((r) => r.data),
    uploadPhoto: (file) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api
        .post('/admin/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then((r) => r.data);
    },
    deletePhoto: () => api.delete('/admin/profile/photo').then((r) => r.data),
    // Consultation (lecture seule) de la pièce d'identité fournie par le propriétaire
    idDocumentBlob: () =>
      api.get('/admin/profile/id-document', { responseType: 'blob' }).then((r) => r.data),
  },
  clients: {
    list: (params) => api.get('/admin/clients', { params }).then((r) => r.data),
    get: (id) => api.get(`/admin/clients/${id}`).then((r) => r.data),
    // Consultation (lecture seule) d'une pièce d'identité du client, en blob
    idDocumentBlob: (id, path) =>
      api.get(`/admin/clients/${id}/id-document`, { params: { path }, responseType: 'blob' }).then((r) => r.data),
  },
  planning:         (params) => api.get('/admin/planning', { params }).then((r) => r.data),
  housekeeping: {
    list:   (params)      => api.get('/admin/housekeeping', { params }).then((r) => r.data),
    update: (id, payload) => api.patch(`/admin/housekeeping/${id}`, payload).then((r) => r.data),
    // Recouches (ménage en cours de séjour)
    startTask:    (id) => api.post(`/admin/housekeeping/tasks/${id}/start`).then((r) => r.data),
    completeTask: (id) => api.post(`/admin/housekeeping/tasks/${id}/complete`).then((r) => r.data),
    deferTask:    (id) => api.post(`/admin/housekeeping/tasks/${id}/defer`).then((r) => r.data),
  },
  badges:           ()    => api.get('/admin/dashboard/badges').then((r) => r.data),
  checkInEligible:  ()    => api.get('/admin/checkin-eligible').then((r) => r.data),
  depositAlerts:    ()    => api.get('/admin/reservations/deposit-alerts').then((r) => r.data),
  checkIn:         (id)  => api.post(`/admin/checkin/${id}`).then((r) => r.data),
  checkOut:        (id)  => api.post(`/admin/checkout/${id}`).then((r) => r.data),
  cashPayment:     (id)  => api.post(`/admin/reservations/${id}/cash-payment`).then((r) => r.data),
  refunds: {
    list:        (params)       => api.get('/admin/refunds', { params }).then((r) => r.data),
    approve:     (id, payload)  => api.post(`/admin/refunds/${id}/approve`, payload).then((r) => r.data),
    reject:      (id, payload)  => api.post(`/admin/refunds/${id}/reject`, payload).then((r) => r.data),
    receiptBlob: (id)           => api.get(`/admin/refunds/${id}/receipt`, { responseType: 'blob' }).then((r) => r.data),
  },
  complaints: {
    list:   (params)       => api.get('/admin/complaints', { params }).then((r) => r.data),
    handle: (id, payload)  => api.post(`/admin/complaints/${id}/handle`, payload).then((r) => r.data),
  },
  reports: {
    summary: () => api.get('/admin/reports').then((r) => r.data),
  },
  auditSummary: {
    list: (params) => api.get('/admin/audit-summary', { params }).then((r) => r.data),
  },
  reviews: {
    list: (params) => api.get('/admin/reviews', { params }).then((r) => r.data),
  },
};
