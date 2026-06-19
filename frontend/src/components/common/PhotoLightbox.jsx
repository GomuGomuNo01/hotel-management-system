import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Lightbox d'image accessible (photo de profil agrandie).
 * Boîte de dialogue : role/aria-modal/aria-label, fermeture par Échap, clic sur
 * le fond ou la croix, et focus déplacé à l'ouverture. Mutualise 4 implémentations
 * inline (profils admin/owner/client + formulaire admin).
 */
export default function PhotoLightbox({ open, src, alt = 'Photo', onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onEsc);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open || !src) return null;

  return createPortal(
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4 outline-none"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
        onClick={onClose}
        aria-label="Fermer"
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
