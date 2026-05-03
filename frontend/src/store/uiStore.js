import { create } from 'zustand';

export const useUiStore = create((set) => ({
  globalLoading: false,
  sidebarOpen:   false,

  /**
   * badgeSignal est incrémenté chaque fois qu'une action modifie le nombre
   * de remboursements en attente (approbation, refus). Le hook useNavBadges
   * observe ce signal pour déclencher un rechargement immédiat.
   */
  badgeSignal: 0,

  setLoading:      (v) => set({ globalLoading: v }),
  toggleSidebar:   ()  => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen:  (v) => set({ sidebarOpen: v }),
  triggerBadgeRefresh: () => set((s) => ({ badgeSignal: s.badgeSignal + 1 })),
}));
