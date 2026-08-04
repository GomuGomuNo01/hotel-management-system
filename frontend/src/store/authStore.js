import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ttlCache } from '../lib/ttlCache';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      // Session « Se souvenir de moi » : désactive la déconnexion auto sur
      // inactivité côté client (le serveur applique alors une fenêtre de 7 j).
      remember: false,
      login: (user, token, role, remember = false) => set({ user, token, role, remember }),
      logout: () => {
        ttlCache.clear(); // on vide le cache à la déconnexion
        set({ user: null, token: null, role: null, remember: false });
      },
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'hms-auth',
      partialize: (state) => ({ user: state.user, role: state.role, token: state.token, remember: state.remember }),
    }
  )
);
