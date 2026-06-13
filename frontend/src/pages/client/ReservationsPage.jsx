import { useState, useMemo } from 'react';
import { Link }             from 'react-router-dom';
import { Plus, Download, Receipt, Star, Search, X, SlidersHorizontal } from 'lucide-react';
import { useReservations }  from '../../hooks/useReservations';
import { useAutoRefresh }   from '../../hooks/useAutoRefresh';
import { useAuth }          from '../../hooks/useAuth';
import { useReviewBadge }   from '../../hooks/useReviewBadge';
import ReservationCard      from '../../components/reservations/ReservationCard';
import ReservationModal, { downloadReceipt, downloadInvoice } from '../../components/reservations/ReservationModal';
import LoadingSpinner       from '../../components/common/LoadingSpinner';
import EmptyState           from '../../components/common/EmptyState';
import ErrorMessage         from '../../components/common/ErrorMessage';
import ReviewModal          from '../../components/client/ReviewModal';

const STATUS_OPTIONS = [
  { value: 'all',         label: 'Tous les statuts' },
  { value: 'pending',     label: 'En attente' },
  { value: 'confirmed',   label: 'Confirmée' },
  { value: 'checked_in',  label: 'Arrivé (en séjour)' },
  { value: 'checked_out', label: 'Parti' },
  { value: 'cancelled',   label: 'Annulée' },
];

const PAYMENT_OPTIONS = [
  { value: 'all',     label: 'Tous les paiements' },
  { value: 'paid',    label: 'Payée' },
  { value: 'partial', label: 'Partielle' },
  { value: 'unpaid',  label: 'Non payée' },
];

export default function ReservationsPage() {
  const { data, loading, error, refetch } = useReservations();
  const [selected, setSelected]           = useState(null);
  const [reviewTarget, setReviewTarget]   = useState(null);
  const { user }               = useAuth();
  const { refreshReviewCount } = useReviewBadge();

  // ── Filtres (côté client) ──────────────────────────────────────
  const [query, setQuery]           = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [paymentFilter, setPayment] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      if (paymentFilter !== 'all') {
        const paid = r.paid_amount ?? 0;
        const full = r.is_fully_paid ?? false;
        if (paymentFilter === 'paid'    && !full) return false;
        if (paymentFilter === 'partial' && !(paid > 0 && !full)) return false;
        if (paymentFilter === 'unpaid'  && paid > 0) return false;
      }

      if (q) {
        const room = String(r.room?.room_number ?? '').toLowerCase();
        const type = String(r.room?.room_type ?? '').toLowerCase();
        const id   = String(r.id ?? '');
        // Accepte "RES-000051", "RES51", "51" pour retrouver une réservation par numéro
        const resRef = `RES-${id.padStart(6, '0')}`;
        const resMatch = resRef.toLowerCase().includes(q)
          || id.includes(q.replace(/^res-?0*/i, ''));
        if (!room.includes(q) && !type.includes(q) && !resMatch) return false;
      }
      return true;
    });
  }, [data, query, statusFilter, paymentFilter]);

  const hasActiveFilters = query.trim() || statusFilter !== 'all' || paymentFilter !== 'all';
  const resetFilters = () => { setQuery(''); setStatus('all'); setPayment('all'); };

  // Rafraîchissement temps-réel - toute action admin qui impacte le client
  useAutoRefresh(
    ['checkin.done', 'checkout.done', 'payment.confirmed', 'refund.processed', 'reservation.cancelled'],
    () => { refetch(); refreshReviewCount(); },
    { filter: (payload) => !payload.clientId || payload.clientId === user?.id },
  );

  const handleCancelled = () => { setSelected(null); refetch(); };
  const handleUpdated   = (updated) => { setSelected(updated); refetch(); };
  const handleReviewSubmitted = () => {
    setReviewTarget(null);
    refreshReviewCount();
    refetch();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes réservations</h1>
        <Link to="/rooms" className="btn-primary">
          <Plus className="h-4 w-4" /> Nouvelle
        </Link>
      </div>

      {/* ── Barre de filtres ── */}
      {(data.length > 0 || hasActiveFilters) && !loading && !error && (
        <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <SlidersHorizontal className="h-4 w-4 text-slate-400 mb-2.5 flex-shrink-0" />

          {/* Recherche */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">Rechercher</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="N° réservation (RES-000051), chambre…"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Paiement */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Paiement</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPayment(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-2.5"
            >
              <X className="h-3.5 w-3.5" /> Réinitialiser
            </button>
          )}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} onRetry={refetch} />
      ) : !data.length ? (
        <EmptyState
          message="Aucune réservation pour le moment."
          ctaLabel="Réserver une chambre"
          ctaTo="/rooms"
        />
      ) : !filtered.length ? (
        <EmptyState
          message="Aucune réservation ne correspond à ces filtres."
          ctaLabel="Réinitialiser les filtres"
          onCta={resetFilters}
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">
            <span className="font-semibold text-slate-800">{filtered.length}</span> réservation{filtered.length > 1 ? 's' : ''}
            {hasActiveFilters && ` sur ${data.length}`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onViewClick={() => setSelected(r)}
              actions={
                <div className="flex flex-wrap gap-1.5">
                  {r.status === 'pending' && (r.paid_amount ?? 0) === 0 && (
                    <Link to={`/mon-espace/paiement/${r.id}`} className="btn-primary text-xs">
                      Payer
                    </Link>
                  )}
                  {!r.is_fully_paid && (r.paid_amount ?? 0) > 0 && r.status !== 'cancelled' && !r.refund && (
                    <Link to={`/mon-espace/paiement/${r.id}`} className="btn-primary text-xs">
                      Payer le solde
                    </Link>
                  )}
                  {r.has_receipt && (
                    <button
                      className={r.status === 'cancelled'
                        ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : 'btn-secondary text-xs'
                      }
                      onClick={(e) => { e.stopPropagation(); downloadReceipt(r.id); }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {r.status === 'cancelled' ? 'Télécharger' : 'Reçu'}
                    </button>
                  )}
                  {r.has_invoice && (
                    <button
                      className="btn-secondary text-xs"
                      onClick={(e) => { e.stopPropagation(); downloadInvoice(r.id); }}
                    >
                      <Receipt className="h-3.5 w-3.5" /> Facture
                    </button>
                  )}
                  {r.can_review && !r.has_review && (
                    <button
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setReviewTarget(r); }}
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      Donner mon avis
                    </button>
                  )}
                  {r.has_review && (
                    <Link
                      to={`/mon-espace/avis?reservationId=${r.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Star className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                      Voir mon avis
                    </Link>
                  )}
                </div>
              }
            />
          ))}
          </div>
        </>
      )}

      {selected && (
        <ReservationModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onCancelled={handleCancelled}
          onUpdated={handleUpdated}
          onOpenReview={(r) => setReviewTarget(r)}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          reservation={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
}
