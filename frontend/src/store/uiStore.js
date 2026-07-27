import { create } from 'zustand';

export const useUiStore = create((set) => ({
  globalLoading: false,
  sidebarOpen:   false,

  /**
   * badgeSignal - incrémenté après chaque action qui change un compteur
   * (approbation remboursement, encaissement acompte, etc.).
   * useBadgeSync observe ce signal pour déclencher un rechargement immédiat (debounced).
   */
  badgeSignal: 0,

  /**
   * badgeCounts - compteurs partagés entre sidebar, pages et composants.
   * Mis à jour par useBadgeSync (centralisé dans AdminLayout).
   *   refunds      : remboursements en attente
   *   deposits     : réservations avec acompte non soldé
   *   housekeeping : chambres à nettoyer (état ménage « dirty »)
   */
  badgeCounts: { refunds: 0, deposits: 0, checkins: 0, complaints: 0, housekeeping: 0 },

  /**
   * Compteurs CLIENT partagés (séjours à noter / réclamations ouvertes).
   * Centralisés ici pour que la navbar ET les pages restent synchronisées :
   * une action sur une page (avis soumis, réclamation annulée…) met à jour
   * la bulle partout instantanément.
   */
  reviewCount:    0,
  complaintCount: 0,
  docCount:       0, // notifications documents (reçus/factures/remboursements) non lues

  setLoading:      (v) => set({ globalLoading: v }),
  toggleSidebar:   ()  => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen:  (v) => set({ sidebarOpen: v }),
  triggerBadgeRefresh: () => set((s) => ({ badgeSignal: s.badgeSignal + 1 })),

  /** Met à jour un ou plusieurs compteurs : setBadgeCounts({ refunds: 3 }) */
  setBadgeCounts: (updates) =>
    set((s) => ({ badgeCounts: { ...s.badgeCounts, ...updates } })),

  setReviewCount:    (v) => set({ reviewCount: v }),
  setComplaintCount: (v) => set({ complaintCount: v }),
  setDocCount:       (v) => set({ docCount: v }),
}));
