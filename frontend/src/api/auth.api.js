import api from './axios';

export const authApi = {
  register:           (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login:              (payload) => api.post('/auth/login',    payload).then((r) => r.data),
  me:                 ()        => api.get('/auth/me').then((r) => r.data),
  logout:             ()        => api.post('/auth/logout').then((r) => r.data),
  resendVerification: (email)   => api.post('/auth/email/resend', { email }).then((r) => r.data),
  forgotPassword:     (email)   => api.post('/auth/password/forgot', { email }).then((r) => r.data),
  resetPassword:      (payload) => api.post('/auth/password/reset',  payload).then((r) => r.data),
  googleRedirectUrl: () =>
    import.meta.env.VITE_GOOGLE_REDIRECT_URL ||
    `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/google/redirect`,
};
