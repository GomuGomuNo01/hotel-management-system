import { Link }         from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useAutoRefresh }  from '../../hooks/useAutoRefresh';
import { useReviewBadge }  from '../../hooks/useReviewBadge';
import {
  CalendarCheck, BedDouble, UserCircle, ArrowRight,
  Clock, CheckCircle2, XCircle, Star, Download, Receipt,
} from 'lucide-react';
import { useAuth }         from '../../hooks/useAuth';
import { useReservations } from '../../hooks/useReservations';
import ReservationCard     from '../../components/reservations/ReservationCard';
import ReservationModal, { downloadReceipt, downloadInvoice } from '../../components/reservations/ReservationModal';
import ReviewModal         from '../../components/client/ReviewModal';
import LoadingSpinner      from '../../components/common/LoadingSpinner';
import EmptyState          from '../../components/common/EmptyState';

const QUICK_LINKS = [
  {
    to: '/mon-espace/reservations',
    icon: CalendarCheck,
    label: 'Mes réservations',
    desc: 'Historique & suivi',
    iconClass: 'bg-blue-100 text-blue-700',
    border: 'hover:border-blue-300',
  },
  {
    to: '/rooms',
    icon: BedDouble,
    label: 'Chambres',
    desc: 'Réserver une chambre',
    iconClass: 'bg-emerald-100 text-emerald-700',
    border: 'hover:border-emerald-300',
  },
  {
    to: '/mon-espace/profil',
    icon: UserCircle,
    label: 'Mon profil',
    desc: 'Informations & sécurité',
    iconClass: 'bg-violet-100 text-violet-700',
    border: 'hover:border-violet-300',
  },
];

export default function DashboardPage() {
  const { user }                            = useAuth();
  const { data, loading, refetch }          = useReservations({ per_page: 4 });
  const { refreshReviewCount }              = useReviewBadge();
  const [selected, setSelected]             = useState(null);
  const [reviewTarget, setReviewTarget]     = useState(null);

  // Rafraîchissement temps-réel quand l'admin agit sur les réservations
  const handleRefresh = useCallback(() => {
    refetch();
    refreshReviewCount();
  }, [refetch, refreshReviewCount]);

  useAutoRefresh(
    ['checkin.done', 'checkout.done', 'payment.confirmed', 'refund.processed', 'reservation.cancelled'],
    handleRefresh,
    { filter: (payload) => !payload.clientId || payload.clientId === user?.id },
  );

  // On s'assure de n'afficher que 4 réservations maximum
  const recent = data.slice(0, 4);

  const pending   = recent.filter((r) => r.status === 'pending').length;
  const confirmed = recent.filter((r) => ['confirmed', 'checked_in'].includes(r.status)).length;
  const cancelled = recent.filter((r) => r.status === 'cancelled').length;

  const handleCancelled = () => { setSelected(null); refetch(); };
  const handleUpdated   = (updated) => { setSelected(updated); refetch(); };
  const handleReviewSubmitted = () => {
    setReviewTarget(null);
    refreshReviewCount();
    refetch();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── Bienvenue ── */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl px-6 py-7 text-white shadow-lg shadow-brand-500/20">
        <p className="text-sm font-medium text-brand-100 mb-1">Bienvenue dans votre espace personnel</p>
        <h1 className="text-2xl font-bold">
          Bonjour, {`${user?.last_name || ''} ${user?.first_name || ''}`.trim() || 'cher client'} !
        </h1>
        <p className="mt-1 text-sm text-brand-100">
          Gérez vos réservations et votre profil depuis ce tableau de bord.
        </p>
        <Link
          to="/rooms"
          className="inline-flex items-center gap-2 mt-4 bg-white text-brand-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors shadow-sm"
        >
          <BedDouble className="h-4 w-4" />
          Voir les chambres
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Mini stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'En attente', value: pending,   icon: Clock,        iconClass: 'bg-amber-100 text-amber-700',     border: 'border-l-4 border-l-amber-500' },
          { label: 'Actives',    value: confirmed, icon: CheckCircle2, iconClass: 'bg-emerald-100 text-emerald-700', border: 'border-l-4 border-l-emerald-500' },
          { label: 'Annulées',   value: cancelled, icon: XCircle,      iconClass: 'bg-red-100 text-red-700',         border: 'border-l-4 border-l-red-500' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 ${s.border}`}>
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${s.iconClass}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-950 tabular-nums leading-none">
                  {loading ? '…' : s.value}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Accès rapides ── */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">Accès rapide</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`group bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 transition-all duration-150 hover:shadow-md ${l.border}`}
            >
              <div className={`flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${l.iconClass} transition-transform duration-200 group-hover:scale-110`}>
                <l.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate">{l.label}</p>
                <p className="text-xs font-medium text-slate-600 truncate">{l.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 ml-auto flex-shrink-0 group-hover:translate-x-1 group-hover:text-brand-500 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Dernières réservations (4 max) ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Dernières réservations</h2>
            <p className="text-xs font-medium text-slate-600 mt-0.5">Vos 4 séjours les plus récents</p>
          </div>
          <Link
            to="/mon-espace/reservations"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 transition-colors"
          >
            Voir tout <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : !recent.length ? (
          <EmptyState
            icon={CalendarCheck}
            title="Aucune réservation"
            message="Vous n'avez pas encore effectué de réservation."
            ctaLabel="Parcourir les chambres"
            ctaTo="/rooms"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {recent.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onViewClick={() => setSelected(r)}
                actions={
                  <div className="flex flex-wrap gap-1.5">
                    {/* Payer (première fois) */}
                    {r.status === 'pending' && (r.paid_amount ?? 0) === 0 && (
                      <Link to={`/mon-espace/paiement/${r.id}`} className="btn-primary text-xs">
                        Payer
                      </Link>
                    )}
                    {/* Payer le solde */}
                    {!r.is_fully_paid && (r.paid_amount ?? 0) > 0 && r.status !== 'cancelled' && !r.refund && (
                      <Link to={`/mon-espace/paiement/${r.id}`} className="btn-primary text-xs">
                        Payer le solde
                      </Link>
                    )}
                    {/* Reçu / Reçu d'annulation */}
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
                    {/* Facture */}
                    {r.has_invoice && (
                      <button
                        className="btn-secondary text-xs"
                        onClick={(e) => { e.stopPropagation(); downloadInvoice(r.id); }}
                      >
                        <Receipt className="h-3.5 w-3.5" /> Facture
                      </button>
                    )}
                    {/* Donner mon avis */}
                    {r.can_review && !r.has_review && (
                      <button
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setReviewTarget(r); }}
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        Donner mon avis
                      </button>
                    )}
                    {/* Avis déjà donné → lien vers la page avis */}
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
        )}
      </div>

      {/* ── Modale détail réservation ── */}
      {selected && (
        <ReservationModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onCancelled={handleCancelled}
          onUpdated={handleUpdated}
          onOpenReview={(r) => setReviewTarget(r)}
        />
      )}

      {/* ── Modale avis ── */}
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
