import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      login: (user, token, role) => set({ user, token, role }),
      logout: () => set({ user: null, token: null, role: null }),
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'hms-auth',
      partialize: (state) => ({ user: state.user, role: state.role, token: state.token }),
    }
  )
);
