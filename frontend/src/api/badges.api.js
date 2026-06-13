import api from './axios';

export const badgesApi = {
  // Compteurs client regroupés : { reviews, complaints, documents }
  client: () => api.get('/badges').then((r) => r.data?.data ?? {}),
};
