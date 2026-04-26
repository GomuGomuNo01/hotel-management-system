import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401) {
      const path = window.location.pathname;
      const publicPaths = ['/', '/rooms', '/login', '/register'];
      const isPublic = publicPaths.includes(path) || path.startsWith('/rooms/');
      useAuthStore.getState().logout();
      if (!isPublic) {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error(message || "Vous n'avez pas la permission d'effectuer cette action.");
    } else if (status === 404) {
      // let pages handle 404 contextually
    } else if (status === 422) {
      const errors = error.response?.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0];
        toast.error(Array.isArray(first) ? first[0] : String(first));
      } else {
        toast.error(message || 'Données invalides.');
      }
    } else if (status >= 500) {
      toast.error('Une erreur serveur est survenue. Veuillez réessayer.');
    }

    return Promise.reject(error);
  }
);

export default api;
