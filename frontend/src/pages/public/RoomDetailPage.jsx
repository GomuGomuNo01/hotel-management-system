import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Users, BedDouble,
  ShieldCheck, X, Star, MessageSquare, Wifi,
  Wind, Tv, Coffee, Check,
} from 'lucide-react';
import { roomsApi }    from '../../api/rooms.api';
import LoadingSpinner  from '../../components/common/LoadingSpinner';
import ErrorMessage    from '../../components/common/ErrorMessage';
import StatusBadge     from '../../components/common/StatusBadge';
import { formatXOF }   from '../../utils/formatCurrency';
import { useAuth }     from '../../hooks/useAuth';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const ROOM_TYPE_LABEL = { simple: 'Simple', double: 'Double', suite: 'Suite', familiale: 'Familiale' };
const AMENITY_CONFIG  = {
  wifi:          { icon: Wifi,    label: 'WiFi' },
  climatisation: { icon: Wind,    label: 'Climatisation' },
  tv:            { icon: Tv,      label: 'TV' },
  minibar:       { icon: Coffee,  label: 'Mini-bar' },
};
const FALLBACK = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=70';

/* ─── Galerie + lightbox ─────────────────────────────────────────── */
function RoomGallery({ images, fallback }) {
  const [idx, setIdx]       = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const photos = images && images.length > 0 ? images.map((i) => i.url) : [fallback];
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);

  return (
    <>
      <div
        className="relative aspect-[16/8] bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-md group"
        onClick={() => setLightbox(true)}
      >
        {/* Visuel principal de la fiche = élément LCP : priorité haute, jamais différé. */}
        <img
          src={photos[idx]} alt=""
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          fetchPriority="high"
          decoding="async"
          onError={(e) => { e.currentTarget.src = FALLBACK; }}
        />
        {/* Dégradé bas */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-4 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
              {idx + 1} / {photos.length}
            </span>
          </>
        )}
        <span className="absolute bottom-3 left-4 text-white/70 text-xs">
          Cliquer pour agrandir
        </span>
      </div>

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((src, i) => (
            <img
              key={i} src={src} alt=""
              onClick={() => setIdx(i)}
              className={`h-16 w-24 object-cover rounded-xl cursor-pointer flex-shrink-0 border-2 transition-all ${
                i === idx ? 'border-brand-500 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
          loading="lazy"
          decoding="async"
        />
          ))}
        </div>
      )}

      {lightbox && createPortal(
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={(e) => { e.stopPropagation(); prev(); }}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          {/* Ouverte au clic : le chargement différé n'aurait aucun sens ici. */}
          <img
            src={photos[idx]} alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            decoding="async"
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={(e) => { e.stopPropagation(); next(); }}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          <span className="absolute bottom-5 text-white/70 text-sm font-medium">
            {idx + 1} / {photos.length}
          </span>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ─── Étoiles ────────────────────────────────────────────────────── */
function StarRow({ rating, size = 'sm' }) {
  const s = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${s} ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
    </span>
  );
}

/* ─── Barre de distribution ──────────────────────────────────────── */
function DistributionBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2 text-gray-500 text-right shrink-0">{label}</span>
      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-gray-400 text-xs shrink-0">{count}</span>
    </div>
  );
}

/* ─── Carte individuelle d'avis ──────────────────────────────────── */
function ReviewCard({ review }) {
  const initial = review.reviewer ? review.reviewer.charAt(0).toUpperCase() : '?';
  const palette = ['bg-amber-500', 'bg-brand-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500'];
  const color   = palette[initial.charCodeAt(0) % palette.length];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`${color} text-white font-bold text-sm h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{review.reviewer}</p>
            <p className="text-xs text-gray-400">{review.created_at}</p>
          </div>
        </div>
        <StarRow rating={review.rating} />
      </div>
      {review.comment && (
        <p className="text-sm text-gray-600 leading-relaxed flex-1 italic">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}
    </div>
  );
}

/* ─── Squelette avis ─────────────────────────────────────────────── */
function ReviewSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-28 bg-gray-200 rounded" />
          <div className="h-2 w-16 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-3/6" />
      </div>
    </div>
  );
}

/* ─── Carousel d'avis ────────────────────────────────────────────── */
function ReviewCarousel({ reviews }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused]   = useState(false);
  const timerRef              = useRef(null);
  const total                 = reviews.length;

  useEffect(() => {
    if (total <= 1 || paused) return;
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % total), 6000);
    return () => clearInterval(timerRef.current);
  }, [total, paused]);

  if (total === 0) return null;

  const prev = () => setCurrent(c => (c - 1 + total) % total);
  const next = () => setCurrent(c => (c + 1) % total);
  const translatePct = current * (100 / total);

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${translatePct}%)`, width: `${total * 100}%` }}
        >
          {reviews.map((r) => (
            <div key={r.id} style={{ width: `${100 / total}%` }} className="px-1">
              <ReviewCard review={r} />
            </div>
          ))}
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Avis précédent"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={next}
            aria-label="Avis suivant"
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </>
      )}

      {total > 1 && (
        <div className="flex flex-col items-center gap-2 mt-5">
          <p className="text-xs text-gray-400">{current + 1} / {total}</p>
          <div className="flex gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Avis ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'w-6 bg-brand-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section avis complète ──────────────────────────────────────── */
function ReviewsSection({ roomId }) {
  const [reviews,  setReviews]  = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const fetchPage = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await roomsApi.reviews(roomId, { page: p, per_page: 12 });
      setReviews(res?.data ?? []);
      setLastPage(res?.meta?.last_page ?? 1);
      if (p === 1) setStats(res?.stats ?? null);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const loadPage = (p) => {
    setPage(p);
    fetchPage(p);
    const el = document.getElementById('room-reviews');
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
  };

  if (loading && !stats) {
    return (
      <section id="room-reviews" className="space-y-4">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <ReviewSkeleton />
      </section>
    );
  }

  if (!loading && (!reviews || reviews.length === 0) && stats?.total === 0) {
    return (
      <section id="room-reviews">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Avis clients</h2>
        <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-2xl text-gray-400 gap-3">
          <MessageSquare className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Aucun avis pour le moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="room-reviews" className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-900">Avis clients</h2>
        {stats?.total > 0 && (
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            {stats.total} avis positif{stats.total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Bloc stats */}
      {stats && stats.total > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="flex flex-col items-center gap-1.5 min-w-[110px]">
            <span className="text-5xl font-extrabold text-gray-900 leading-none tabular-nums">
              {stats.avg_rating ? Number(stats.avg_rating).toFixed(1) : '-'}
            </span>
            <StarRow rating={Math.round(stats.avg_rating ?? 0)} size="md" />
            <span className="text-xs text-gray-400 mt-0.5">{stats.total} avis</span>
          </div>
          <div className="w-px h-16 bg-gray-200 hidden sm:block self-center" />
          <div className="flex-1 w-full space-y-2">
            {[5, 4, 3].map((n) => (
              <DistributionBar
                key={n}
                label={n}
                count={stats.distribution?.[n] ?? 0}
                total={stats.total}
              />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <ReviewSkeleton />
      ) : reviews.length > 0 ? (
        <ReviewCarousel reviews={reviews} />
      ) : null}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => loadPage(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="h-4 w-4" /> Précédent
          </button>
          <span className="text-sm text-gray-500">Page {page} / {lastPage}</span>
          <button
            onClick={() => loadPage(page + 1)}
            disabled={page === lastPage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Suivant <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}

/* ─── Page détail chambre ─────────────────────────────────────────── */
export default function RoomDetailPage() {
  const { id } = useParams();
  const { isClient, isAuthenticated, isAdmin, isOwner } = useAuth();
  const [room,    setRoom]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchRoom = useCallback(({ silent = false } = {}) => {
    let mounted = true;
    if (!silent) setLoading(true);
    roomsApi.get(id)
      .then((res) => { if (mounted) { setRoom(res?.data ?? res); setError(null); } })
      .catch((e)  => { if (mounted) setError(e.response?.data?.message || 'Chambre introuvable.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => fetchRoom(), [fetchRoom]);

  // Synchro temps réel : si la chambre passe en maintenance (ou redevient
  // disponible), la fiche se met à jour sans rechargement de page.
  useAutoRefresh(
    ['room.updated', 'room.deleted'],
    () => fetchRoom({ silent: true }),
    { filter: (payload) => String(payload?.roomId) === String(id) },
  );

  if (loading) return <LoadingSpinner label="Chargement de la chambre…" />;
  if (error)   return <ErrorMessage message={error} />;
  if (!room)   return null;

  const fallbackPhoto = room.photo_url || FALLBACK;

  let cta = null;
  if (room.status === 'maintenance') {
    cta = (
      <div className="text-center py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-500 font-medium">
        Chambre en maintenance
      </div>
    );
  } else if (isAdmin || isOwner) {
    cta = (
      <div className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-gray-500">
        <ShieldCheck className="h-4 w-4" /> Réservé aux clients
      </div>
    );
  } else if (isClient) {
    cta = (
      <Link
        to={`/mon-espace/reservations/new?roomId=${room.id}`}
        className="btn-primary w-full text-center"
      >
        Réserver cette chambre
      </Link>
    );
  } else if (!isAuthenticated) {
    cta = (
      <Link
        to={`/login?redirect=${encodeURIComponent(`/rooms/${room.id}`)}`}
        className="btn-primary w-full text-center"
      >
        Se connecter pour réserver
      </Link>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── Retour ── */}
      <Link
        to="/rooms"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux chambres
      </Link>

      {/* ── Galerie ── */}
      <RoomGallery images={room.images} fallback={fallbackPhoto} />

      {/* ── Infos + Prix ── */}
      <div className="grid sm:grid-cols-3 gap-6 items-start">

        {/* Colonne infos */}
        <div className="sm:col-span-2 space-y-5">

          {/* Titre + badge */}
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}
                <span className="text-gray-400 font-normal text-xl"> - N° {room.room_number}</span>
              </h1>
            </div>
            <StatusBadge status={room.status} />
          </div>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed">
            {room.description || 'Chambre confortable et moderne.'}
          </p>

          {/* Caractéristiques */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium px-3 py-2 rounded-xl">
              <Users className="h-4 w-4 text-slate-400" />
              {room.capacity} pers.
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium px-3 py-2 rounded-xl">
              <BedDouble className="h-4 w-4 text-slate-400" />
              {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}
            </div>
          </div>

          {/* Équipements */}
          {room.amenities && room.amenities.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2.5">Équipements</p>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map((a) => {
                  const cfg = AMENITY_CONFIG[a];
                  const Icon = cfg?.icon;
                  return (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-100 text-brand-700 text-sm font-medium px-3 py-1.5 rounded-xl"
                    >
                      {Icon
                        ? <Icon className="h-3.5 w-3.5" />
                        : <Check className="h-3.5 w-3.5" />
                      }
                      {cfg?.label ?? a}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Colonne prix */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md">
          {/* Bandeau haut */}
          <div className="h-1.5 bg-gradient-to-r from-brand-500 to-brand-400" />
          <div className="p-5 space-y-4">
            <div>
              <span className="text-3xl font-extrabold text-brand-600 tabular-nums">
                {formatXOF(room.price_per_night)}
              </span>
              <span className="text-sm text-gray-400 ml-1">/ nuit</span>
            </div>

            <div className="border-t border-gray-100 pt-4">
              {cta ?? (
                <div className="text-center text-sm text-red-500 font-medium">
                  Chambre non disponible
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Avis ── */}
      <ReviewsSection roomId={id} />
    </div>
  );
}
