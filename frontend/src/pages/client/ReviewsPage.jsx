/**
 * ReviewsPage - /mon-espace/avis
 *
 * Deux sections :
 *  1. "À noter" - séjours terminés sans avis (cards avec formulaire inline)
 *  2. "Mes avis" - historique des avis soumis (lecture seule)
 *
 * Supporte le paramètre URL ?reservationId=X pour scroller vers
 * et surligner l'avis correspondant à une réservation donnée.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams }   from 'react-router-dom';
import {
  Star, CheckCircle2, MessageSquare, BedDouble,
  Calendar, Moon, ArrowLeft, Send, Sparkles,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import toast              from '../../lib/toast';
import { reviewApi }      from '../../api/review.api';
import { useReviewBadge } from '../../hooks/useReviewBadge';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useAuth }        from '../../hooks/useAuth';
import LoadingSpinner     from '../../components/common/LoadingSpinner';
import { ttlCache }       from '../../lib/ttlCache';

const REVIEWS_CACHE_KEY = 'reviews|all';
const REVIEWS_TTL_MS    = 30_000;

/* ── Utilitaires ──────────────────────────────────────────────── */
const ROOM_TYPE_LABEL = { simple: 'Simple', double: 'Double', suite: 'Suite', familiale: 'Familiale' };
const STAR_LABEL = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent !'];
const STAR_COLOR = ['', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-lime-500', 'text-emerald-500'];

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Étoiles interactives ──────────────────────────────────────── */
function StarPicker({ value, onChange, disabled, size = 'md' }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  const cls = size === 'lg' ? 'h-10 w-10' : 'h-7 w-7';

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none disabled:cursor-default transition-transform hover:scale-110 active:scale-95"
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
        >
          <Star className={`${cls} transition-colors ${
            n <= display ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-100 text-slate-300'
          }`} />
        </button>
      ))}
    </div>
  );
}

/* ── Étoiles en lecture seule ──────────────────────────────────── */
function StarDisplay({ rating, size = 'sm' }) {
  const cls = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${cls} ${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-200 text-slate-200'}`} />
      ))}
    </div>
  );
}

/* ── Card "À noter" ────────────────────────────────────────────── */
function ReviewableCard({ reservation, onSubmitted }) {
  const [rating,     setRating]     = useState(0);
  const [comment,    setComment]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded,   setExpanded]   = useState(false);

  const room  = reservation.room ?? {};
  const photo = room.photo_url ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=60';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error('Veuillez choisir une note.'); return; }
    setSubmitting(true);
    try {
      const res = await reviewApi.submit(reservation.id, { rating, comment: comment.trim() || null });
      toast.success('Merci pour votre avis ! 🎉');
      onSubmitted?.(res.review);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-0">
        <div className="relative w-28 flex-shrink-0 bg-slate-100">
          <img
            src={photo}
            alt={`Chambre ${room.room_number}`}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=60'; }}
          loading="lazy"
          decoding="async"
        />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type} - N°{room.room_number}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(reservation.check_in_date)}
                </span>
                <span className="text-slate-300">→</span>
                <span>{formatDate(reservation.check_out_date)}</span>
                <span className="flex items-center gap-1">
                  <Moon className="h-3 w-3" />
                  {reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              #{reservation.id}
            </span>
          </div>

          <div className="mt-3">
            {!expanded ? (
              <button
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold transition-colors"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                Donner mon avis
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Votre note :</p>
                  <div className="flex items-center gap-3">
                    <StarPicker value={rating} onChange={setRating} disabled={submitting} size="lg" />
                    {rating > 0 && (
                      <span className={`text-sm font-bold ${STAR_COLOR[rating]}`}>
                        {STAR_LABEL[rating]}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Commentaire <span className="font-normal text-slate-400">(optionnel)</span>
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-400 bg-slate-50"
                    placeholder="Accueil, propreté, confort, service…"
                    rows={2}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={submitting}
                  />
                  <p className="text-xs text-slate-400 text-right">{comment.length}/1000</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    disabled={submitting}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || rating === 0}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {submitting ? 'Envoi…' : <><Send className="h-3.5 w-3.5" /> Publier mon avis</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Card avis déjà soumis ─────────────────────────────────────── */
function SubmittedReviewCard({ review, highlighted }) {
  const cardRef = useRef(null);
  const room    = review.room ?? {};
  const photo   = room.photo_url ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=60';
  const res     = review.reservation ?? {};

  // Animation de surlignage : disparaît après 2.5 s
  const [glowing, setGlowing] = useState(highlighted);
  useEffect(() => {
    if (!highlighted) return;
    setGlowing(true);
    const t = setTimeout(() => setGlowing(false), 2500);
    return () => clearTimeout(t);
  }, [highlighted]);

  return (
    <div
      ref={cardRef}
      id={`review-res-${res.id}`}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-700 ${
        glowing
          ? 'border-emerald-400 ring-2 ring-emerald-300 ring-offset-2 shadow-emerald-100'
          : 'border-slate-200 hover:shadow-md'
      }`}
    >
      <div className="flex gap-0">
        <div className="relative w-28 flex-shrink-0 bg-slate-100">
          <img
            src={photo}
            alt={`Chambre ${room.room_number}`}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=60'; }}
          loading="lazy"
          decoding="async"
        />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type} - N°{room.room_number}
              </h3>
              <div className="text-xs text-slate-500 mt-0.5">
                {formatDate(res.check_in_date)} → {formatDate(res.check_out_date)}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <StarDisplay rating={review.rating} />
              <span className="text-xs text-slate-400">
                {new Date(review.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {review.comment && (
            <p className="mt-2 text-sm text-slate-700 italic leading-relaxed line-clamp-2">
              &ldquo;{review.comment}&rdquo;
            </p>
          )}

          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Avis publié
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Statistiques header ───────────────────────────────────────── */
function ReviewStats({ submittedReviews }) {
  if (!submittedReviews.length) return null;
  const avg     = submittedReviews.reduce((s, r) => s + r.rating, 0) / submittedReviews.length;
  const rounded = Math.round(avg * 10) / 10;

  return (
    <div className="flex items-center gap-6 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
      <div className="text-center">
        <p className="text-3xl font-extrabold text-slate-950">{rounded}</p>
        <StarDisplay rating={Math.round(avg)} size="sm" />
        <p className="text-xs text-slate-500 mt-1">Votre note moyenne</p>
      </div>
      <div className="w-px h-12 bg-slate-200" />
      <div className="text-center">
        <p className="text-3xl font-extrabold text-slate-950">{submittedReviews.length}</p>
        <p className="text-xs text-slate-500 mt-1">Avis publiés</p>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {[5, 4, 3, 2, 1].map((n) => {
          const cnt = submittedReviews.filter((r) => r.rating === n).length;
          const pct = submittedReviews.length ? (cnt / submittedReviews.length) * 100 : 0;
          return (
            <div key={n} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-4 text-right">{n}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div
                  className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-4">{cnt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page principale ───────────────────────────────────────────── */
export default function ReviewsPage() {
  const { user }               = useAuth();
  const { refreshReviewCount } = useReviewBadge();
  const [searchParams]         = useSearchParams();

  // ?reservationId=X → scroller + surligner l'avis de cette réservation
  const targetReservationId = searchParams.get('reservationId')
    ? Number(searchParams.get('reservationId'))
    : null;

  const [reviewable,     setReviewable]     = useState([]);
  const [submitted,      setSubmitted]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [submittedPage,  setSubmittedPage]  = useState(1);
  const SUBMITTED_PER_PAGE = 5;

  const loadAll = useCallback(async (bypassCache = false) => {
    // Stale-while-revalidate : affiche le cache instantanément, revalide en fond.
    let servedStale = false;
    if (!bypassCache) {
      const entry = ttlCache.peek(REVIEWS_CACHE_KEY);
      if (entry) {
        setReviewable(entry.value.reviewable);
        setSubmitted(entry.value.submitted);
        setLoading(false);
        if (entry.fresh) return;
        servedStale = true;
      }
    }

    if (!servedStale) setLoading(true);
    try {
      const [rev, mine] = await Promise.all([reviewApi.reviewable(), reviewApi.mine()]);
      setReviewable(rev);
      setSubmitted(mine);
      ttlCache.set(REVIEWS_CACHE_KEY, { reviewable: rev, submitted: mine }, REVIEWS_TTL_MS);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Temps-réel : si un checkout arrive, recharger (données fraîches)
  useAutoRefresh(
    ['checkout.done'],
    () => loadAll(true),
    { filter: (p) => !p.clientId || p.clientId === user?.id },
  );

  const handleSubmitted = useCallback(() => {
    loadAll(true);   // bypass cache après soumission
    refreshReviewCount();
  }, [loadAll, refreshReviewCount]);

  // Scroll vers l'avis ciblé après le chargement
  useEffect(() => {
    if (!targetReservationId || loading) return;
    const el = document.getElementById(`review-res-${targetReservationId}`);
    if (el) {
      // Petit délai pour laisser le DOM se stabiliser
      const t = setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
      return () => clearTimeout(t);
    }
  }, [targetReservationId, loading]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── Header ── */}
      <div>
        <Link
          to="/mon-espace"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Tableau de bord
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950">Mes avis</h1>
            <p className="text-sm text-slate-500 mt-1">
              Partagez votre expérience et aidez-nous à améliorer nos services.
            </p>
          </div>
          {reviewable.length > 0 && (
            <div className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-sm font-black">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              {reviewable.length} à noter
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      {submitted.length > 0 && <ReviewStats submittedReviews={submitted} />}

      {/* ── Section "À noter" ── */}
      {reviewable.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">
              Séjours à noter <span className="text-amber-500">({reviewable.length})</span>
            </h2>
          </div>
          <div className="space-y-4">
            {reviewable.map((r) => (
              <ReviewableCard key={r.id} reservation={r} onSubmitted={handleSubmitted} />
            ))}
          </div>
        </div>
      )}

      {/* ── Section "Avis publiés" ── */}
      {submitted.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900">
              Avis publiés <span className="text-slate-400">({submitted.length})</span>
            </h2>
          </div>
          <div className="space-y-3">
            {submitted
              .slice((submittedPage - 1) * SUBMITTED_PER_PAGE, submittedPage * SUBMITTED_PER_PAGE)
              .map((review) => {
                const resId = review.reservation?.id;
                return (
                  <SubmittedReviewCard
                    key={review.id}
                    review={review}
                    highlighted={!!targetReservationId && resId === targetReservationId}
                  />
                );
              })}
          </div>
          {Math.ceil(submitted.length / SUBMITTED_PER_PAGE) > 0 && (
            <div className="flex items-center justify-between px-4 py-3 mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-700">{submittedPage}</span> sur{' '}
                <span className="font-semibold text-slate-700">{Math.ceil(submitted.length / SUBMITTED_PER_PAGE)}</span>
                <span className="ml-2 text-slate-400">· {submitted.length} avis</span>
              </span>
              <div className="flex items-center gap-1">
                <button className="btn-ghost h-8 w-8 p-0" disabled={submittedPage <= 1} onClick={() => setSubmittedPage(1)} title="Première page"><ChevronsLeft className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" disabled={submittedPage <= 1} onClick={() => setSubmittedPage((p) => p - 1)} title="Page précédente"><ChevronLeft className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" disabled={submittedPage >= Math.ceil(submitted.length / SUBMITTED_PER_PAGE)} onClick={() => setSubmittedPage((p) => p + 1)} title="Page suivante"><ChevronRight className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" disabled={submittedPage >= Math.ceil(submitted.length / SUBMITTED_PER_PAGE)} onClick={() => setSubmittedPage(Math.ceil(submitted.length / SUBMITTED_PER_PAGE))} title="Dernière page"><ChevronsRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── État vide ── */}
      {reviewable.length === 0 && submitted.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <BedDouble className="h-8 w-8 text-slate-400" />
          </div>
          <p className="font-bold text-slate-900">Aucun séjour à noter</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            Vos avis apparaîtront ici après chaque départ validé par la réception.
          </p>
          <Link to="/rooms" className="inline-flex items-center gap-2 mt-5 btn-primary text-sm">
            <BedDouble className="h-4 w-4" /> Réserver une chambre
          </Link>
        </div>
      )}

      {/* ── Aucun avis en attente mais des avis soumis ── */}
      {reviewable.length === 0 && submitted.length > 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            Tous vos séjours ont été notés. Merci pour vos retours !
          </p>
        </div>
      )}
    </div>
  );
}
