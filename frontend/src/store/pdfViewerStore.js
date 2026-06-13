import { create } from 'zustand';

/**
 * pdfViewerStore - pilote le panneau latéral (drawer) de consultation PDF.
 *
 * Permet de déclencher l'ouverture du lecteur depuis n'importe où, y compris
 * des fonctions hors composant React (ex. viewReceipt/viewInvoice) via
 * `usePdfViewer.getState().view(...)`.
 *
 * Le PDF est récupéré sous forme de blob authentifié (axios) puis affiché
 * dans une <iframe> à partir d'une URL d'objet - aucun téléchargement,
 * aucune ouverture d'onglet.
 */
export const usePdfViewer = create((set, get) => ({
  open:     false,
  title:    '',
  filename: 'document.pdf',
  loading:  false,
  error:    null,
  url:      null, // object URL (révoquée à la fermeture / au remplacement)

  /**
   * Ouvre le drawer et charge le PDF.
   * @param {string}   title     Titre affiché dans l'en-tête
   * @param {string}   filename  Nom de fichier proposé au téléchargement
   * @param {Function} fetchBlob () => Promise<Blob>
   * @param {string}   errorMsg  Message d'erreur si la récupération échoue
   */
  view: async (title, filename, fetchBlob, errorMsg) => {
    const prev = get().url;
    if (prev) URL.revokeObjectURL(prev);

    set({ open: true, title, filename: filename || 'document.pdf', loading: true, error: null, url: null });

    try {
      const blob     = await fetchBlob();
      // Conserver le type d'origine (PDF, image…) ; défaut PDF si inconnu.
      const type     = blob.type || 'application/pdf';
      const viewBlob = blob.type ? blob : new Blob([blob], { type });
      const url      = URL.createObjectURL(viewBlob);
      // Si l'utilisateur a fermé entre-temps, on libère et on s'arrête.
      if (!get().open) { URL.revokeObjectURL(url); return; }
      set({ url, loading: false });
    } catch {
      set({ loading: false, error: errorMsg || 'Document indisponible.' });
    }
  },

  close: () => {
    const prev = get().url;
    if (prev) URL.revokeObjectURL(prev);
    set({ open: false, url: null, error: null, loading: false, title: '', filename: 'document.pdf' });
  },
}));
