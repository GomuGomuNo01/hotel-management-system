import { Link }                        from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  BedDouble, ShieldCheck, Sparkles, ArrowRight,
  Star, Users, TrendingUp, Quote,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth }   from '../../hooks/useAuth';
import { roomsApi }  from '../../api/rooms.api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { formatXOF } from '../../utils/formatCurrency';

/* ── Constantes ──────────────────────────────────────────────────── */
const FEATURES = [
  { icon: BedDouble,   title: 'Chambres confortables',  desc: "Du lit simple à la suite familiale, trouvez la chambre qui vous correspond.",    iconClass: 'bg-blue-100 text-blue-700' },
  { icon: ShieldCheck, title: 'Paiement sécurisé',       desc: 'Payez via Orange CI ou Wave CI, rapide, sécurisé, sans frais cachés.',         iconClass: 'bg-emerald-100 text-emerald-700' },
  { icon: Sparkles,    title: 'Service attentionné',      desc: 'Une équipe disponible 24h/24 pour rendre votre séjour parfait.',                iconClass: 'bg-violet-100 text-violet-700' },
];

const ROOM_TYPE_LABEL = { simple: 'Simple', double: 'Double', suite: 'Suite', familiale: 'Familiale' };

const RANK_CFG = [
  { border: 'ring-2 ring-yellow-400 ring-offset-2', medal: '🥇', label: 'N°1', labelBg: 'bg-gradient-to-r from-yellow-400 to-amber-400 text-white' },
  { border: 'ring-2 ring-slate-400 ring-offset-2',  medal: '🥈', label: 'N°2', labelBg: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white' },
  { border: 'ring-2 ring-orange-400 ring-offset-2', medal: '🥉', label: 'N°3', labelBg: 'bg-gradient-to-r from-orange-400 to-amber-500 text-white' },
  { border: '',                                       medal: null, label: 'N°4', labelBg: 'bg-slate-600 text-white' },
];

/* ── Étoiles ─────────────────────────────────────────────────────── */
function StarRating({ rating, count }) {
  if (!rating) {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Star className="h-3.5 w-3.5 text-slate-300" />
        Aucun avis
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
      ))}
      <span className="text-xs font-bold text-amber-600 ml-0.5">{rating}</span>
      {count > 0 && <span className="text-xs text-slate-400">({count})</span>}
    </div>
  );
}

/* ── Carte chambre populaire ─────────────────────────────────────── */
function PopularRoomCard({ room, rank }) {
  const { isAuthenticated, isClient, isAdmin, isOwner } = useAuth();
  const cfg = RANK_CFG[rank] ?? RANK_CFG[3];

  const imgs = Array.isArray(room.images) ? room.images : [];
  const primaryImage = imgs.find((i) => i.is_primary) ?? imgs[0];
  const photo = primaryImage?.url ?? room.photo_url
    ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=70';

  const typeLabel = ROOM_TYPE_LABEL[room.room_type] ?? room.room_type ?? '';

  const ctaTo = isClient
    ? `/mon-espace/reservations/new?roomId=${room.id}`
    : !isAuthenticated
      ? `/login?redirect=${encodeURIComponent(`/mon-espace/reservations/new?roomId=${room.id}`)}`
      : null;

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col ${cfg.border}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
        <img
          src={photo}
          alt={`Chambre ${room.room_number} - ${typeLabel}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=70'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {cfg.medal && (
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 ${cfg.labelBg} text-xs font-black px-2.5 py-1 rounded-full shadow-md`}>
            <span className="text-sm">{cfg.medal}</span>
            {cfg.label}
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
          <TrendingUp className="h-3 w-3" />
          {room.reservations_count ?? 0} séjour{(room.reservations_count ?? 0) > 1 ? 's' : ''}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-white font-bold text-lg leading-tight drop-shadow-sm">{typeLabel}</h3>
              <p className="text-white/75 text-xs mt-0.5">Chambre n°{room.room_number}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-extrabold text-xl tabular-nums leading-none">
                {formatXOF(room.price_per_night)}
              </p>
              <p className="text-white/70 text-[10px] mt-0.5">/nuit</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            {room.capacity} personne{room.capacity > 1 ? 's' : ''}
          </span>
          <StarRating rating={room.avg_rating} count={room.reviews_count} />
        </div>

        {room.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{room.description}</p>
        )}

        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.amenities.slice(0, 3).map((a) => (
              <span key={a} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {a}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500">
                +{room.amenities.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2 border-t border-slate-100">
          <Link
            to={`/rooms/${room.id}`}
            className="flex-1 text-center py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Détails
          </Link>
          {!isAdmin && !isOwner && (
            ctaTo ? (
              <Link
                to={ctaTo}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-colors ${
                  rank === 0
                    ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-500/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                Réserver
              </Link>
            ) : (
              <span className="flex-1 text-center py-2 text-xs font-bold rounded-lg bg-slate-100 text-slate-400 cursor-default">
                Réserver
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton chambre ─────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-3 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-200 rounded w-1/4" />
        </div>
        <div className="h-3 bg-slate-100 rounded w-3/4" />
        <div className="flex gap-1">
          <div className="h-4 bg-slate-100 rounded w-10" />
          <div className="h-4 bg-slate-100 rounded w-10" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="flex-1 h-8 bg-slate-100 rounded-lg" />
          <div className="flex-1 h-8 bg-slate-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/* ── Carte témoignage ─────────────────────────────────────────────── */
function ReviewCard({ review }) {
  const roomLabel = review.room
    ? `${ROOM_TYPE_LABEL[review.room.room_type] ?? review.room.room_type} N°${review.room.room_number}`
    : null;
  const initial = review.reviewer?.[0]?.toUpperCase() ?? 'C';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
            {initial}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">{review.reviewer}</p>
            {roomLabel && (
              <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                <BedDouble className="h-3 w-3" />
                {roomLabel}
              </p>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border bg-amber-50 text-amber-600 border-amber-100">
          <Star className="h-3 w-3 fill-current" />
          {review.rating}/5
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`h-4 w-4 ${n <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
        ))}
      </div>

      <div className="relative flex-1">
        <Quote className="absolute -top-1 -left-1 h-5 w-5 text-slate-200" />
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 pl-4 italic">
          {review.comment}
        </p>
      </div>

      <p className="text-[10px] text-slate-400 mt-auto">
        {(() => {
          try {
            return new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
          } catch {
            return review.created_at ?? '';
          }
        })()}
      </p>
    </div>
  );
}

/* ── Skeleton témoignage ──────────────────────────────────────────── */
function ReviewSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 animate-pulse h-full">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-slate-200 flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-slate-200 rounded w-1/3" />
          <div className="h-2.5 bg-slate-100 rounded w-1/4" />
        </div>
      </div>
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(n => <div key={n} className="h-4 w-4 rounded bg-slate-200" />)}
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-slate-100 rounded" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
        <div className="h-3 bg-slate-100 rounded w-4/6" />
      </div>
    </div>
  );
}

/* ── Carousel témoignages (3 par slide) ───────────────────────────── */
const PER_SLIDE = 3;

function ReviewCarousel({ reviews }) {
  const [slide, setSlide]   = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef            = useRef(null);

  // Grouper par slides de PER_SLIDE
  const slides = [];
  for (let i = 0; i < reviews.length; i += PER_SLIDE) {
    slides.push(reviews.slice(i, i + PER_SLIDE));
  }
  const total = slides.length;

  const goTo = (n) => setSlide(((n % total) + total) % total);
  const prev = () => goTo(slide - 1);
  const next = () => goTo(slide + 1);

  // Auto-advance
  useEffect(() => {
    if (total <= 1 || paused) return;
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % total), 6000);
    return () => clearInterval(timerRef.current);
  }, [total, paused]);

  if (total === 0) return null;

  // translateX: chaque slide occupe (100/total)% de la piste
  const translatePct = slide * (100 / total);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Piste */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${translatePct}%)`,
            width: `${total * 100}%`,
          }}
        >
          {slides.map((group, gi) => (
            <div
              key={gi}
              style={{ width: `${100 / total}%` }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 px-1"
            >
              {group.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Boutons prev / next */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Avis précédents"
            className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <button
            onClick={next}
            aria-label="Avis suivants"
            className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </button>

          {/* Points de navigation */}
          <div className="flex justify-center gap-2 mt-7">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === slide ? 'w-7 bg-brand-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Page d'accueil ──────────────────────────────────────────────── */
export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [popularRooms,   setPopularRooms]   = useState([]);
  const [loadingRooms,   setLoadingRooms]   = useState(true);
  const [publicReviews,  setPublicReviews]  = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    let mounted = true;

    roomsApi.popular()
      .then((res) => { if (mounted) setPopularRooms(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (mounted) setPopularRooms([]); })
      .finally(() => { if (mounted) setLoadingRooms(false); });

    roomsApi.publicReviews({ limit: 9 })
      .then((res) => { if (mounted) setPublicReviews(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (mounted) setPublicReviews([]); })
      .finally(() => { if (mounted) setLoadingReviews(false); });

    return () => { mounted = false; };
  }, []);

  // Synchro temps réel : une chambre mise en maintenance disparaît des
  // « chambres populaires » sans rechargement (fresh: casse le cache HTTP).
  useAutoRefresh(['room.updated', 'room.deleted'], () => {
    roomsApi.popular({ fresh: true })
      .then((res) => setPopularRooms(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
  });

  return (
    <div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="bg-cover bg-center min-h-[560px] lg:min-h-[660px] flex items-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1600&q=70')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36 text-white">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold max-w-2xl leading-tight drop-shadow-lg">
              Un séjour d&apos;exception
              <br className="hidden sm:block" />
              <span className="text-brand-300"> au cœur de la ville</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg max-w-xl text-white/90 leading-relaxed font-medium">
              Réservez votre chambre en ligne en quelques clics et profitez d&apos;un service de qualité supérieure.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/rooms" className="btn-primary px-7 py-3 text-base shadow-xl shadow-brand-500/30">
                Voir les chambres <ArrowRight className="h-5 w-5" />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="btn border-2 border-white/60 text-white bg-white/10 backdrop-blur-md hover:bg-white/25 font-semibold px-7 py-3 text-base"
                >
                  Créer un compte
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Chambres les plus réservées ── */}
      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 rounded-full px-3.5 py-1 text-xs font-black mb-3 tracking-wide uppercase">
                <TrendingUp className="h-3.5 w-3.5" />
                Tendances
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-950 leading-tight">
                Chambres les plus réservées
              </h2>
              <p className="mt-2 text-slate-500 text-sm max-w-md leading-relaxed">
                Plébiscitées par nos clients, réservez avant qu&apos;elles ne soient plus disponibles.
              </p>
            </div>
            <Link
              to="/rooms"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors bg-white border border-brand-200 rounded-xl px-4 py-2 shadow-sm hover:shadow-md hover:border-brand-300"
            >
              Toutes les chambres <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loadingRooms
              ? [0, 1, 2, 3].map((n) => <SkeletonCard key={n} />)
              : popularRooms.length === 0
                ? (
                  <div className="col-span-4 text-center py-16 text-slate-400 text-sm">
                    Aucune chambre disponible pour le moment.
                  </div>
                )
                : popularRooms.map((room, i) => (
                  <PopularRoomCard key={room.id} room={room} rank={i} />
                ))
            }
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link to="/rooms" className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700">
              Voir toutes les chambres <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Témoignages clients (carousel) ── */}
      {(loadingReviews || publicReviews.length > 0) && (
        <section className="bg-white py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 rounded-full px-3.5 py-1 text-xs font-black mb-3 tracking-wide uppercase">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
                Avis vérifiés
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-950 leading-tight">
                Ce que disent nos clients
              </h2>
              <p className="mt-2 text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                Des avis authentiques de clients ayant séjourné dans notre établissement.
              </p>
            </div>

            {loadingReviews ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[0, 1, 2].map((n) => <ReviewSkeleton key={n} />)}
              </div>
            ) : (
              <div className="px-6">
                <ReviewCarousel reviews={publicReviews} />
              </div>
            )}

          </div>
        </section>
      )}

      {/* ── Features ── */}
      <section className={`${!loadingReviews && publicReviews.length > 0 ? 'bg-slate-50' : 'bg-white'} py-16 lg:py-20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-950">Pourquoi nous choisir ?</h2>
            <p className="mt-3 text-base text-slate-600 max-w-md mx-auto">
              Nous mettons tout en œuvre pour que votre séjour soit inoubliable.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 text-center group hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-200"
              >
                <div className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-5 mx-auto ${f.iconClass}`}>
                  <f.icon className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-white">
          <h2 className="text-3xl font-bold">Prêt à réserver votre séjour ?</h2>
          <p className="mt-3 text-brand-100 text-base">
            Des chambres disponibles dès aujourd&apos;hui - réservation en moins de 2 minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/rooms"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-7 py-3 rounded-xl hover:bg-brand-50 transition-colors shadow-lg text-base"
            >
              Voir les chambres <ArrowRight className="h-4 w-4" />
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/10 transition-colors text-base"
              >
                Créer mon compte
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
