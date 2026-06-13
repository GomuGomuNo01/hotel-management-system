import api from './axios';

export const refundsApi = {
  // Remboursements du client connecté
  listMine: () => api.get('/refunds').then((r) => r.data?.data ?? []),

  // Reçu PDF (approuvé) ou avis de refus (refusé) - blob pour PdfViewerDrawer
  receiptBlob: (id) =>
    api.get(`/refunds/${id}/receipt`, { responseType: 'blob' }).then((r) => r.data),
};
