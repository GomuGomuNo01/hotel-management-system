/**
 * PdfViewerDrawer - panneau latéral de consultation PDF.
 *
 * Glisse depuis la droite et occupe ~50 % de la largeur de l'écran (plein
 * écran sur mobile). Affiche le PDF dans une <iframe> (lecteur natif du
 * navigateur : zoom, défilement, pagination) - sans téléchargement ni
 * nouvel onglet. Monté une seule fois globalement (App.jsx).
 */
import { useEffect } from 'react';
import { X, Download, Loader2, FileWarning } from 'lucide-react';
import { usePdfViewer } from '../../store/pdfViewerStore';

export default function PdfViewerDrawer() {
  const { open, title, filename, loading, error, url, close } = usePdfViewer();

  // Fermer avec la touche Échap + bloquer le scroll de fond quand ouvert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <>
      {/* Voile */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Panneau */}
      <aside
        className={`fixed top-0 right-0 z-[61] h-full w-full md:w-1/2 bg-white shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Document PDF'}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800 truncate">{title || 'Document'}</h2>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleDownload}
              disabled={!url}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Télécharger"
            >
              <Download className="h-3.5 w-3.5" /> Télécharger
            </button>
            <button
              onClick={close}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 min-h-0 bg-slate-100">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm">Chargement du document…</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 px-8 text-center">
              <FileWarning className="h-9 w-9 text-amber-500" />
              <p className="text-sm">{error}</p>
            </div>
          ) : url ? (
            <iframe src={url} title={title || 'Document PDF'} className="w-full h-full border-0" />
          ) : null}
        </div>
      </aside>
    </>
  );
}
