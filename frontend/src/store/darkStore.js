import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store Zustand pour le mode sombre.
 * Persiste le choix dans localStorage sous la cle 'hms-dark'.
 * La classe 'dark' est appliquee sur <html> dans App.jsx.
 */
export const useDarkStore = create(
  persist(
    (set) => ({
      dark: false,
      toggle: () => set((s) => ({ dark: !s.dark })),
      setDark: (v) => set({ dark: v }),
    }),
    {
      name: 'hms-dark',
      partialize: (state) => ({ dark: state.dark }),
    }
  )
);
