import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Users, BedDouble, ShieldCheck, X } from 'lucide-react';
import { roomsApi } from '../../api/rooms.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import { formatXOF } from '../../utils/formatCurrency';
import { useAuth } from '../../hooks/useAuth';

const ROOM_TYPE_LABEL = { simple: 'Simple', double: 'Double', suite: 'Suite', familiale: 'Familiale' };
const AMENITY_ICONS  = { wifi: '\uD83D\uDCF6 WiFi', climatisation: '\u2744\uFE0F Climatisation', tv: '\uD83D\uDCFA TV', minibar: '\uD83C\uDF79 Mini-bar' };
const FALLBACK = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=70';

// ---- Galerie simple avec lightbox ----
function RoomGallery({ images, fallback }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const photos = images && images.length > 0
    ? images.map((i) => i.url)
    : [fallback];

  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);

  return (
    <>
      {/* Image principale */}
      <div className="relative aspect-[16/9] bg-gray-100 rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightbox(true)}>
        <img src={photos[idx]} alt="" className="w-full h-full object-cover" loading="lazy"
          onError={(e) => { e.currentTarget.src = FALLBACK; }} />
        {photos.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-2 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              {idx + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      {/* Miniatures */}
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {photos.map((src, i) => (
            <img key={i} src={src} alt="" onClick={() => setIdx(i)}
              className={`h-16 w-24 object-cover rounded-lg cursor-pointer flex-shrink-0 border-2 transition ${
                i === idx ? 'border-brand-500' : 'border-transparent hover:border-gray-300'
              }`} />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(false)}><X className="h-7 w-7" /></button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white" onClick={(e) => { e.stopPropagation(); prev(); }}><ChevronLeft className="h-9 w-9" /></button>
          <img src={photos[idx]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white" onClick={(e) => { e.stopPropagation(); next(); }}><ChevronRight className="h-9 w-9" /></button>
          <span className="absolute bottom-4 text-white text-sm">{idx + 1} / {photos.length}</span>
        </div>
      )}
    </>
  );
}

export default function RoomDetailPage() {
  const { id } = useParams();
  const { isClient, isAuthenticated, isAdmin, isOwner } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await roomsApi.get(id);
      setRoom(res?.data ?? res);
    } catch (e) {
      setError(e.response?.data?.message || 'Chambre introuvable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <LoadingSpinner label="Chargement de la chambre…" />;
  if (error)   return <ErrorMessage message={error} />;
  if (!room)   return null;

  const available = room.status === 'available';
  const fallbackPhoto = room.photo_url || FALLBACK;

  let cta = null;
  if (available) {
    if (isClient) {
      cta = <Link to={`/mon-espace/reservations/new?roomId=${room.id}`} className="btn-primary w-full text-center">Réserver cette chambre</Link>;
    } else if (isAdmin || isOwner) {
      cta = <span className="inline-flex items-center gap-1 text-sm text-gray-500"><ShieldCheck className="h-4 w-4" /> Réservé aux clients</span>;
    } else if (!isAuthenticated) {
      cta = <Link to={`/login?redirect=${encodeURIComponent(`/rooms/${room.id}`)}`} className="btn-primary w-full text-center">Se connecter pour réserver</Link>;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to="/rooms" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ChevronLeft className="h-4 w-4" /> Retour aux chambres
      </Link>

      {/* Galerie */}
      <RoomGallery images={room.images} fallback={fallbackPhoto} />

      {/* Infos */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type} — N° {room.room_number}
            </h1>
            <StatusBadge status={room.status} />
          </div>

          <p className="text-gray-600">{room.description || 'Chambre confortable et moderne.'}</p>

          <div className="flex gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {room.capacity} pers.</span>
            <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}</span>
          </div>

          {room.amenities && room.amenities.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Équipements</p>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map((a) => (
                  <span key={a} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                    {AMENITY_ICONS[a] ?? a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Carte prix + CTA */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm h-fit">
          <div>
            <span className="text-2xl font-bold text-brand-600">{formatXOF(room.price_per_night)}</span>
            <span className="text-sm text-gray-500"> / nuit</span>
          </div>
          {cta || <span className="text-sm text-red-500">Chambre non disponible</span>}
        </div>
      </div>
    </div>
  );
}
