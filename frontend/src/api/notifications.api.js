import api from './axios';

/** Catégories de notifications rattachées à l'espace « Mes documents ». */
export const DOCUMENT_CATEGORIES = ['reservation', 'payment', 'receipt', 'invoice', 'refund'];

export const notificationsApi = {
  list:        (params) => api.get('/notifications', { params }).then((r) => r.data),
  unreadCount: (categories) =>
    api.get('/notifications/unread-count', {
      params: categories ? { categories: categories.join(',') } : undefined,
    }).then((r) => r.data?.data?.count ?? 0),
  markRead:    (id) => api.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: (categories) =>
    api.post('/notifications/read-all', categories ? { categories } : {}).then((r) => r.data),
};
