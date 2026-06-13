/**
 * AdminReviewsPage - /admin/avis
 * Consultation de tous les avis clients (y compris les négatifs).
 * Permission requise : view_reviews
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Star, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, MessageSquare,
  ThumbsUp, Minus, ThumbsDown, BedDouble,
  User, Calendar, Quote,
} from 'lucide-react';
import { adminApi }   from '../../api/admin.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage   from '../../components/common/ErrorMessage';
import { formatDate } from '../../utils/formatDate';

/* ─── Couleurs par note ───────────────────────────────────────── */
const ratingMeta = (r) =>
  r >= 4
    ? { border: 'border-l-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' }
    : r === 3
    ? { border: 'border-l-amber-400',   badge: 'bg-amber-50  text-amber-700  border-amber-200',   dot: 'bg-amber-400'   }
    : { border: 'border-l-red-400',     badge: 'bg-red-50    text-red-700    border-red-200',     dot: 'bg-red-400'     };

/* ─── Catégories ──────────────────────────────────────────────── */
const CATEGORIES = [
  { value: '',         label: 'Tous',     Icon: MessageSquare },
  { value: 'positive', label: 'Positifs', Icon: ThumbsUp     },
  { value: 'neutral',  label: 'Neutres',  Icon: Minus        },
  { value: 'negative', label: 'Négatifs', Icon: ThumbsDown   },
];

/* ─── Étoiles ──────────────────────────────────────────────────── */
function Stars({ value, size = 'sm' }) {
  const s = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${s} ${i <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
      ))}
    </span>
  );
}

/* ─── Avatar client ────────────────────────────────────────────── */
function ClientAvatar({ client, size = 'md' }) {
  const dim = size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';
  if (client?.profile_photo) {
    return (
      <img
        src={client.profile_photo}
        alt={client.full_name}
        className={`${dim} rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow`}
      />
    );
  }
  const initials = client?.full_name
    ? client.full_name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
  ];
  const color = colors[(client?.id ?? 0) % colors.length];
  return (
    <div className={`${dim} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0 ring-2 ring-white shadow`}>
      {client ? initials : <User className="h-4 w-4" />}
    </div>
  );
}

/* ─── Carte avis ───────────────────────────────────────────────── */
function ReviewCard({ review }) {
  const m = ratingMeta(review.rating);
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${m.border} shadow-sm hover:shadow-md transition-all duration-200 flex flex-col`}>

      {/* ── En-tête ── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <ClientAvatar client={review.client} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate leading-tight">
            {review.client?.full_name ?? <span className="italic text-slate-400">Client supprimé</span>}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {review.created_at ? formatDate(review.created_at) : '-'}
          </p>
          <div className="mt-1.5">
            <Stars value={review.rating} />
          </div>
        </div>
        {/* Badge note */}
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 ${m.badge}`}>
          <Star className="h-3 w-3 fill-current" />
          {review.rating}/5
        </span>
      </div>

      {/* ── Commentaire ── */}
      <div className="px-4 pb-3 flex-1">
        {review.comment ? (
          <div className="relative">
            <Quote className="absolute -top-0.5 -left-0.5 h-4 w-4 text-slate-200 fill-slate-200" aria-hidden />
            <p className="text-sm text-slate-700 leading-relaxed pl-4 italic">
              {review.comment}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic pl-1">Aucun commentaire laissé.</p>
        )}
      </div>

      {/* ── Pied : chambre + dates ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
        {review.room && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
            <BedDouble className="h-3.5 w-3.5 text-slate-400" />
            Ch. {review.room.room_number}
            {review.room.room_type && (
              <span className="text-slate-400 font-normal"> · {review.room.room_type}</span>
            )}
          </span>
        )}
        {review.reservation?.check_in_date && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {formatDate(review.reservation.check_in_date)}
            {review.reservation.check_out_date && ` → ${formatDate(review.reservation.check_out_date)}`}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Barre de distribution ────────────────────────────────────── */
function DistributionBar({ stats }) {
  const total = stats?.total || 1;
  const pos = Math.round(((stats?.positive ?? 0) / total) * 100);
  const neu = Math.round(((stats?.neutral  ?? 0) / total) * 100);
  const neg = 100 - pos - neu;
  if (!stats?.total) return null;
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px mt-2">
      {pos > 0 && <div className="bg-emerald-400 transition-all" style={{ width: `${pos}%` }} />}
      {neu > 0 && <div className="bg-amber-400  transition-all" style={{ width: `${neu}%` }} />}
      {neg > 0 && <div className="bg-red-400    transition-all" style={{ width: `${neg}%` }} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Page principale
══════════════════════════════════════════════════════════════════ */
const PER_PAGE = 12;

export default function AdminReviewsPage() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [category, setCategory] = useState('');
  const [rating,   setRating]   = useState('');
  const [page,     setPage]     = useState(1);

  const fetchReviews = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, per_page: PER_PAGE };
      if (category) params.category = category;
      if (rating)   params.rating   = rating;
      const res = await adminApi.reviews.list(params);
      setData(res?.data ?? res);
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de charger les avis.');
    } finally {
      setLoading(false);
    }
  }, [category, rating, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { setPage(1); }, [category, rating]);

  const stats    = data?.stats;
  const reviews  = data?.reviews?.data ?? [];
  const meta     = data?.reviews;
  const lastPage = meta?.last_page ?? 1;
  const total    = meta?.total ?? 0;
  const hasFilters = category !== '' || rating !== '';

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ════════════ EN-TÊTE ════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
            Avis clients
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tous les avis émis, y compris les avis négatifs non visibles sur le site.
          </p>
        </div>
        {!loading && stats && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400 flex-shrink-0" />
            <span className="text-2xl font-extrabold text-amber-700 tabular-nums">{stats.average}</span>
            <div className="text-xs text-amber-600 leading-tight">
              <p className="font-semibold">Note moyenne</p>
              <p>{stats.total} avis au total</p>
            </div>
          </div>
        )}
      </div>

      {/* ════════════ STATS ════════════ */}
      {stats && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {/* Positifs */}
            <div className="px-4 text-center first:pl-0 last:pr-0">
              <div className="inline-flex items-center gap-1.5 text-emerald-600 mb-1">
                <ThumbsUp className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Positifs</span>
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">{stats.positive}</p>
              <p className="text-xs text-slate-400 mt-0.5">note ≥ 4 ★</p>
            </div>
            {/* Neutres */}
            <div className="px-4 text-center">
              <div className="inline-flex items-center gap-1.5 text-amber-600 mb-1">
                <Minus className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Neutres</span>
              </div>
              <p className="text-3xl font-extrabold text-amber-600 tabular-nums">{stats.neutral}</p>
              <p className="text-xs text-slate-400 mt-0.5">note = 3 ★</p>
            </div>
            {/* Négatifs */}
            <div className="px-4 text-center">
              <div className="inline-flex items-center gap-1.5 text-red-600 mb-1">
                <ThumbsDown className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Négatifs</span>
              </div>
              <p className="text-3xl font-extrabold text-red-600 tabular-nums">{stats.negative}</p>
              <p className="text-xs text-slate-400 mt-0.5">note ≤ 2 ★</p>
            </div>
          </div>
          <DistributionBar stats={stats} />
          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Positifs</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Neutres</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block" /> Négatifs</span>
          </div>
        </div>
      )}

      {/* ════════════ FILTRES ════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Catégorie */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ value, label, Icon }) => {
            const active = category === value;
            const styles = {
              '':         active ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-600 border-slate-200 hover:bg-slate-50',
              positive:   active ? 'bg-emerald-600 text-white border-emerald-600' : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50',
              neutral:    active ? 'bg-amber-500 text-white border-amber-500' : 'text-amber-700 border-amber-200 hover:bg-amber-50',
              negative:   active ? 'bg-red-600 text-white border-red-600' : 'text-red-700 border-red-200 hover:bg-red-50',
            };
            return (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm ${styles[value]}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Séparateur */}
        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Note exacte */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Note :</span>
          <div className="flex gap-1">
            {[0, 5, 4, 3, 2, 1].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n === 0 ? '' : String(n))}
                className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  rating === (n === 0 ? '' : String(n))
                    ? 'bg-amber-400 text-white border-amber-400 shadow-sm'
                    : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {n === 0 ? 'Toutes' : <><Star className="h-3 w-3 fill-current" />{n}</>}
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={() => { setCategory(''); setRating(''); }}
            className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Effacer les filtres
          </button>
        )}
      </div>

      {/* ════════════ CONTENU ════════════ */}
      {loading ? (
        <LoadingSpinner label="Chargement des avis…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchReviews} />
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 opacity-40" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-slate-600">Aucun avis trouvé</p>
          <p className="text-sm">
            {hasFilters ? 'Aucun avis ne correspond à vos critères.' : 'Aucun avis enregistré pour le moment.'}
          </p>
          {hasFilters && (
            <button
              onClick={() => { setCategory(''); setRating(''); }}
              className="mt-1 text-xs text-brand-600 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        </>
      )}

      {/* ════════════ PAGINATION ════════════ */}
      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-700">{page}</span> sur{' '}
            <span className="font-semibold text-slate-700">{lastPage}</span>
            <span className="ml-2 text-slate-400">· {total} avis</span>
          </span>
          <div className="flex items-center gap-1">
            <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(1)} title="Première page">
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} title="Page précédente">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-ghost h-8 w-8 p-0" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} title="Page suivante">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button className="btn-ghost h-8 w-8 p-0" disabled={page >= lastPage} onClick={() => setPage(lastPage)} title="Dernière page">
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
