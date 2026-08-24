import axios from 'axios';
import toast from '../lib/toast';
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

    // Pas de réponse = serveur injoignable, DNS, CORS ou coupure réseau.
    // axios.isCancel filtre les requêtes volontairement annulées (pas une vraie erreur).
    if (!error.response && !axios.isCancel(error)) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      toast.error(
        offline
          ? 'Vous semblez hors ligne. Vérifiez votre connexion internet.'
          : 'Serveur inaccessible. Réessayez dans quelques instants.',
        { id: 'network-error' }
      );
      return Promise.reject(error);
    }

    if (status === 401) {
      const path = window.location.pathname;
      const publicPaths = ['/', '/rooms', '/login', '/register'];
      const isPublic = publicPaths.includes(path) || path.startsWith('/rooms/');
      useAuthStore.getState().logout();
      if (!isPublic) {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error(message || "Vous n'êtes pas autorisé à effectuer cette action.");
    } else if (status === 404) {
      // let pages handle 404 contextually
    } else if (status === 422) {
      const errors = error.response?.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0];
        toast.error(Array.isArray(first) ? first[0] : String(first));
      } else {
        toast.error(message || 'Certaines informations sont incorrectes. Vérifiez le formulaire.');
      }
    } else if (status >= 500) {
      toast.error('Une erreur est survenue côté serveur. Réessayez dans quelques instants.');
    }

    return Promise.reject(error);
  }
);

export default api;
