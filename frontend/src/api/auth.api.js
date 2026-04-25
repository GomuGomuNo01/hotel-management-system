import api from './axios';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  logout: (role) => {
    const url = role === 'client' ? '/auth/logout' : `/${role}/auth/logout`;
    return api.post(url).then((r) => r.data);
  },
  googleRedirectUrl: () =>
    import.meta.env.VITE_GOOGLE_REDIRECT_URL ||
    `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/google/redirect`,
};
