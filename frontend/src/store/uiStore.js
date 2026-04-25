import { create } from 'zustand';

export const useUiStore = create((set) => ({
  globalLoading: false,
  sidebarOpen: false,
  setLoading: (v) => set({ globalLoading: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}));
