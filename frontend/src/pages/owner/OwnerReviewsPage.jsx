/**
 * OwnerReviewsPage - /owner/avis
 * Consultation de tous les avis clients (y compris les négatifs).
 * Accès sans restriction de permission pour le propriétaire.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Star, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, MessageSquare,
  ThumbsUp, Minus, ThumbsDown,
} from 'lucide-react';
import { ownerApi }   from '../../api/owner.api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage   from '../../components/common/ErrorMessage';
import ReviewCard     from '../../components/common/ReviewCard';

/* ─── Catégories ──────────────────────────────────────────────── */
const CATEGORIES = [
  { value: '',         label: 'Tous',     Icon: MessageSquare },
  { value: 'positive', label: 'Positifs', Icon: ThumbsUp     },
  { value: 'neutral',  label: 'Neutres',  Icon: Minus        },
  { value: 'negative', label: 'Négatifs', Icon: ThumbsDown   },
];

/* ─── Barre distribution ───────────────────────────────────────── */
function DistributionBar({ stats }) {
  const total = stats?.total || 1;
  const pos = Math.round(((stats?.positive ?? 0) / total) * 100);
  const neu = Math.round(((stats?.neutral  ?? 0) / total) * 100);
  const neg = 100 - pos - neu;
  if (!stats?.total) return null;
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px mt-2">
      {pos > 0 && <div className="bg-emerald-400" style={{ width: `${pos}%` }} />}
      {neu > 0 && <div className="bg-amber-400"  style={{ width: `${neu}%` }} />}
      {neg > 0 && <div className="bg-red-400"    style={{ width: `${neg}%` }} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Page principale
══════════════════════════════════════════════════════════════════ */
const PER_PAGE = 12;

export default function OwnerReviewsPage() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [category, setCategory] = useState('');
  const [rating,   setRating]   = useState('');
  const [page,     setPage]     = useState(1);

  const fetchReviews = useCallback(async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const params = { page, per_page: PER_PAGE };
      if (category) params.category = category;
      if (rating)   params.rating   = rating;
      const res = await ownerApi.reviews.list(params);
      setData(res?.data ?? res);
    } catch (e) {
      if (!silent) setError(e.response?.data?.message || 'Impossible de charger les avis.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [category, rating, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // Synchro temps réel : un nouvel avis client apparaît sans rechargement.
  useAutoRefresh(['review.submitted'], () => fetchReviews({ silent: true }));
  useEffect(() => { setPage(1); }, [category, rating]);

  const stats    = data?.stats;
  const reviews  = data?.reviews?.data ?? [];
  const meta     = data?.reviews;
  const lastPage = meta?.last_page ?? 1;
  const total    = meta?.total ?? 0;
  const hasFilters = category !== '' || rating !== '';

  return (
    <div className="space-y-6 max-w-7xl">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-400 fill-amber-400" /> Avis clients
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tous les avis émis par les clients, y compris les avis négatifs non publiés.
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

      {/* Stats */}
      {stats && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="px-4 text-center first:pl-0">
              <div className="inline-flex items-center gap-1.5 text-emerald-600 mb-1">
                <ThumbsUp className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Positifs</span>
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">{stats.positive}</p>
              <p className="text-xs text-gray-400 mt-0.5">note ≥ 4 ★</p>
            </div>
            <div className="px-4 text-center">
              <div className="inline-flex items-center gap-1.5 text-amber-600 mb-1">
                <Minus className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Neutres</span>
              </div>
              <p className="text-3xl font-extrabold text-amber-600 tabular-nums">{stats.neutral}</p>
              <p className="text-xs text-gray-400 mt-0.5">note = 3 ★</p>
            </div>
            <div className="px-4 text-center">
              <div className="inline-flex items-center gap-1.5 text-red-600 mb-1">
                <ThumbsDown className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Négatifs</span>
              </div>
              <p className="text-3xl font-extrabold text-red-600 tabular-nums">{stats.negative}</p>
              <p className="text-xs text-gray-400 mt-0.5">note ≤ 2 ★</p>
            </div>
          </div>
          <DistributionBar stats={stats} />
          <div className="flex justify-between text-[11px] text-gray-400 font-medium">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Positifs</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Neutres</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block" /> Négatifs</span>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ value, label, Icon }) => {
            const active = category === value;
            const s = {
              '':       active ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-600 border-gray-200 hover:bg-gray-50',
              positive: active ? 'bg-emerald-600 text-white border-emerald-600' : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50',
              neutral:  active ? 'bg-amber-500 text-white border-amber-500' : 'text-amber-700 border-amber-200 hover:bg-amber-50',
              negative: active ? 'bg-red-600 text-white border-red-600' : 'text-red-700 border-red-200 hover:bg-red-50',
            };
            return (
              <button key={value} onClick={() => setCategory(value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${s[value]}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Note :</span>
          <div className="flex gap-1">
            {[0, 5, 4, 3, 2, 1].map((n) => (
              <button key={n} onClick={() => setRating(n === 0 ? '' : String(n))}
                className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  rating === (n === 0 ? '' : String(n))
                    ? 'bg-amber-400 text-white border-amber-400'
                    : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}>
                {n === 0 ? 'Toutes' : <><Star className="h-3 w-3 fill-current" />{n}</>}
              </button>
            ))}
          </div>
        </div>

        {hasFilters && (
          <button onClick={() => { setCategory(''); setRating(''); }}
            className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <X className="h-3.5 w-3.5" /> Effacer les filtres
          </button>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <LoadingSpinner label="Chargement des avis…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchReviews} />
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 opacity-40" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-gray-600">Aucun avis trouvé</p>
          <p className="text-sm">{hasFilters ? 'Aucun avis ne correspond à vos critères.' : 'Aucun avis enregistré pour le moment.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500">
            Page <span className="font-semibold text-gray-700">{page}</span> sur{' '}
            <span className="font-semibold text-gray-700">{lastPage}</span>
            <span className="ml-2 text-gray-400">· {total} avis</span>
          </span>
          <div className="flex items-center gap-1">
            <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(1)} title="Première page"><ChevronsLeft className="h-4 w-4" /></button>
            <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} title="Page précédente"><ChevronLeft className="h-4 w-4" /></button>
            <button className="btn-ghost h-8 w-8 p-0" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} title="Page suivante"><ChevronRight className="h-4 w-4" /></button>
            <button className="btn-ghost h-8 w-8 p-0" disabled={page >= lastPage} onClick={() => setPage(lastPage)} title="Dernière page"><ChevronsRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
