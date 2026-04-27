import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=70';

/**
 * RoomGallery — affiche une ou plusieurs images avec lightbox.
 * Props:
 *   images: [{ id, url, is_primary }]  ou  string (url unique)  ou  undefined
 */
export default function RoomGallery({ images, className = '' }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [sliderIndex, setSliderIndex] = useState(0);

  const list = (() => {
    if (!images || (Array.isArray(images) && images.length === 0)) {
      return [{ id: 0, url: PLACEHOLDER, is_primary: true }];
    }
    if (typeof images === 'string') {
      return [{ id: 0, url: images, is_primary: true }];
    }
    const sorted = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
    return sorted;
  })();

  const prev = useCallback(
    (e) => { e?.stopPropagation(); setSliderIndex((i) => (i - 1 + list.length) % list.length); },
    [list.length]
  );
  const next = useCallback(
    (e) => { e?.stopPropagation(); setSliderIndex((i) => (i + 1) % list.length); },
    [list.length]
  );
  const prevLb = useCallback(
    (e) => { e?.stopPropagation(); setLightboxIndex((i) => (i - 1 + list.length) % list.length); },
    [list.length]
  );
  const nextLb = useCallback(
    (e) => { e?.stopPropagation(); setLightboxIndex((i) => (i + 1) % list.length); },
    [list.length]
  );

  const isSingle = list.length === 1;

  return (
    <>
      {/* ── Galerie principale ── */}
      <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className}`}>
        {/* Image principale */}
        <div
          className="relative cursor-zoom-in"
          onClick={() => setLightboxIndex(sliderIndex)}
        >
          <img
            src={list[sliderIndex]?.url || PLACEHOLDER}
            alt={`Chambre — image ${sliderIndex + 1}`}
            className={`w-full object-cover transition-all duration-300 ${
              isSingle ? 'h-72 sm:h-96' : 'h-64 sm:h-80'
            }`}
          />
          <span className="absolute bottom-2 right-2 bg-black/50 text-white rounded-full p-1">
            <ZoomIn className="h-4 w-4" />
          </span>
        </div>

        {/* Contrôles slider (multi images) */}
        {!isSingle && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition"
              aria-label="Image précédente"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition"
              aria-label="Image suivante"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Indicateurs dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {list.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setSliderIndex(idx); }}
                  className={`h-2 w-2 rounded-full transition-all ${
                    idx === sliderIndex ? 'bg-white scale-125' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Miniatures (multi images) */}
      {!isSingle && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {list.map((img, idx) => (
            <button
              key={img.id ?? idx}
              onClick={() => { setSliderIndex(idx); }}
              className={`flex-shrink-0 h-16 w-24 rounded-lg overflow-hidden border-2 transition ${
                idx === sliderIndex ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Fermer */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image lightbox */}
          <img
            src={list[lightboxIndex]?.url || PLACEHOLDER}
            alt={`Image ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navigation lightbox */}
          {!isSingle && (
            <>
              <button
                onClick={prevLb}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition"
                aria-label="Précédente"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                onClick={nextLb}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition"
                aria-label="Suivante"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                {lightboxIndex + 1} / {list.length}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
