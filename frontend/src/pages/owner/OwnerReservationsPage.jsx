/**
 * OwnerReservationsPage — /owner/reservations
 * Vue owner : liste read-only des réservations avec filtres et recherche.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  CalendarCheck, Filter, X, Search, Eye,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  BedDouble, User, Calendar, Moon, Tag, Mail, Phone,
  CheckCircle2, AlertCircle, RotateCcw,
} from 'lucide-react';
import { ownerApi }       from '../../api/owner.api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import StatusBadge        from '../../components/common/StatusBadge';
import ModalPortal        from '../../components/common/ModalPortal';
import LoadingSpinner     from '../../components/common/LoadingSpinner';
import ErrorMessage       from '../../components/common/ErrorMessage';
import EmptyState         from '../../components/common/EmptyState';
import { formatXOF }      from '../../utils/formatCurrency';
import { formatDate }     from '../../utils/formatDate';

/* ── Config statut remboursement ──────────────────────────────── */
const REFUND_CFG = {
  pending:  { label: 'Remb. en attente', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved: { label: 'Remboursé',        cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Remb. refusé',     cls: 'bg-red-50 text-red-800 border-red-200' },
};

/* ── Modal détail réservation (lecture seule) ─────────────────── */
function ReservationDetailModal({ reservation: r, onClose }) {
  const room   = r.room   || {};
  const client = r.client || {};
  const nights = r.nights ?? (() => {
    if (r.check_in_date && r.check_out_date) {
      const d = (new Date(r.check_out_date) - new Date(r.check_in_date)) / 86400000;
      return Math.max(1, Math.round(d));
    }
    return null;
  })();

  const paidAmount      = r.paid_amount      ?? 0;
  const remainingAmount = r.remaining_amount ?? 0;
  const isFullyPaid     = r.is_fully_paid    ?? (paidAmount >= r.total_amount);
  const paymentPlan     = r.payment_plan     ?? 'full';
  const refund          = r.refund           ?? null;

  const refundCfg = refund ? REFUND_CFG[refund.status] : null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">

          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-amber-50">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <CalendarCheck className="h-6 w-6 text-amber-600" />
                Réservation{' '}
                <span className="font-mono text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg text-base tracking-wider">
                  RES-{String(r.id).padStart(6, '0')}
                </span>
              </h3>
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mt-1">
                Chambre {room.room_number} {room.room_type && <span>· {room.room_type}</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-amber-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

            {/* Client */}
            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 flex items-center gap-4">
              {client.profile_photo ? (
                <img
                  src={client.profile_photo}
                  alt={client.full_name}
                  className="h-12 w-12 rounded-full object-cover shadow-md border-2 border-white flex-shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-amber-500 text-white flex items-center justify-center text-lg font-black shadow-md border-2 border-white flex-shrink-0">
                  {(client.last_name?.[0] ?? client.full_name?.[0] ?? '?').toUpperCase()}
                  {client.first_name?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-base font-black text-slate-900">
                  {client.full_name ?? `${client.last_name ?? ''} ${client.first_name ?? ''}`.trim()}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                  {client.email && (
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                      <Mail className="h-3 w-3" /> {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                      <Phone className="h-3 w-3" /> {client.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dates + montant */}
            <div className="grid grid-cols-2 gap-3">
              <InfoTile icon={Calendar} label="Arrivée"   value={formatDate(r.check_in_date)} />
              <InfoTile icon={Calendar} label="Départ"    value={formatDate(r.check_out_date)} />
              {nights != null && (
                <InfoTile icon={Moon} label="Durée" value={`${nights} nuit${nights > 1 ? 's' : ''}`} />
              )}
              <InfoTile
                icon={Tag} label="Montant total"
                value={formatXOF(r.total_amount)}
                highlight
              />
            </div>

            {/* Statut paiement */}
            <div className={`rounded-2xl p-4 border ${isFullyPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> Paiement
              </p>
              <p className="text-xs font-bold text-slate-500 mb-1">
                {paymentPlan === 'partial' ? 'Paiement en 2 fois' : 'Paiement intégral'}
              </p>
              <div className="flex items-center gap-2">
                {isFullyPaid
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <AlertCircle  className="h-4 w-4 text-amber-600" />
                }
                <span className={`text-sm font-extrabold ${isFullyPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isFullyPaid ? 'Entièrement payé' : `Solde dû : ${formatXOF(remainingAmount)}`}
                </span>
              </div>
              {paidAmount > 0 && (
                <>
                  <p className="text-xs text-slate-500 mt-1">
                    Payé : {formatXOF(paidAmount)} / {formatXOF(r.total_amount)}
                  </p>
                  <div className="mt-2.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, (paidAmount / r.total_amount) * 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Remboursement */}
            {refund && refundCfg && (
              <div className={`rounded-2xl p-4 border ${
                refund.status === 'approved' ? 'bg-emerald-50 border-emerald-100'
                : refund.status === 'rejected' ? 'bg-red-50 border-red-100'
                : 'bg-amber-50 border-amber-100'
              }`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <RotateCcw className="h-3 w-3" /> Remboursement
                </p>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-slate-700">
                      {refund.status === 'approved' ? 'Remboursement approuvé'
                       : refund.status === 'rejected' ? 'Remboursement refusé'
                       : 'Remboursement en attente'}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Montant : <span className="font-bold">{formatXOF(refund.amount)}</span>
                    </p>
                    {refund.admin_notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">« {refund.admin_notes} »</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${refundCfg.cls}`}>
                    <RotateCcw className="h-3 w-3" />
                    {refundCfg.label}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            {r.notes && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Notes internes
                </p>
                <p className="text-sm text-slate-700 italic">{r.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function InfoTile({ icon: Icon, label, value, highlight }) {
  return (
    <div className={`p-3.5 rounded-2xl border ${highlight ? 'bg-amber-50/60 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 ${highlight ? 'text-amber-500' : 'text-slate-400'}`}>
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className={`text-sm font-extrabold ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

const STATUSES = [
  { value: '',             label: 'Tous' },
  { value: 'pending',      label: 'En attente' },
  { value: 'confirmed',    label: 'Confirmées' },
  { value: 'checked_in',  label: 'En cours' },
  { value: 'checked_out', label: 'Terminées' },
  { value: 'cancelled',   label: 'Annulées' },
];

export default function OwnerReservationsPage() {
  const [reservations, setReservations]     = useState([]);
  const [meta, setMeta]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [statusFilter, setStatusFilter]     = useState('');
  const [page, setPage]                     = useState(1);
  const [searchInput, setSearchInput]       = useState('');
  const [search, setSearch]                 = useState('');
  const [dateFrom, setDateFrom]             = useState('');
  const [dateTo, setDateTo]                 = useState('');
  const [selected, setSelected]             = useState(null); // modal détail

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchReservations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const res = await ownerApi.reservations.list({
        status:    statusFilter || undefined,
        search:    search       || undefined,
        date_from: dateFrom     || undefined,
        date_to:   dateTo       || undefined,
        page,
        per_page:  20,
      });
      setReservations(res?.data ?? []);
      setMeta(res?.meta ?? null);
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || 'Impossible de charger les réservations.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, search, dateFrom, dateTo, page]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  // Synchro temps réel : le cycle de vie des réservations est diffusé sur
  // hotel-events — la liste reste à jour sans rechargement.
  useAutoRefresh(
    ['reservation.created', 'reservation.cancelled', 'payment.confirmed', 'checkin.done', 'checkout.done'],
    () => fetchReservations({ silent: true }),
  );

  const hasFilters = statusFilter || search || dateFrom || dateTo;

  return (
    <div className="space-y-6 p-6 max-w-screen-xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <CalendarCheck className="h-7 w-7 text-amber-500" />
          Réservations
        </h1>
        {meta && (
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-800">{meta.total}</span>{' '}
            réservation{meta.total !== 1 ? 's' : ''} au total
          </p>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">

        {/* Ligne 1 — statut + recherche */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  statusFilter === s.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
              placeholder="Nom, email ou n° réservation…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Ligne 2 — période */}
        <div className="flex flex-wrap gap-3 items-center pt-1 border-t border-slate-100">
          <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Période de séjour</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
            <span className="text-slate-400 text-sm">→</span>
            <input
              type="date"
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={() => { setStatusFilter(''); setSearchInput(''); setDateFrom(''); setDateTo(''); setPage(1); }}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" /> Tout effacer
            </button>
          )}
        </div>
      </div>

      {/* Modal détail */}
      {selected && (
        <ReservationDetailModal
          reservation={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Contenu */}
      {loading ? (
        <LoadingSpinner label="Chargement des réservations…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchReservations} />
      ) : reservations.length === 0 ? (
        <EmptyState message="Aucune réservation trouvée." />
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Réf.</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Client</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Chambre</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Dates</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Montant</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reservations.map((res) => (
                    <tr
                      key={res.id}
                      className="hover:bg-amber-50/20 transition-colors cursor-pointer"
                      onClick={() => setSelected(res)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                          RES-{String(res.id).padStart(6, '0')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-900">{res.client?.full_name}</p>
                            <p className="text-xs text-slate-500">{res.client?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BedDouble className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-slate-900">Chambre {res.room?.room_number}</p>
                            <p className="text-xs text-slate-500">{res.room?.room_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          {formatDate(res.check_in_date)} → {formatDate(res.check_out_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-slate-900">{formatXOF(res.total_amount)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={res.status} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelected(res)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-all shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" /> Détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between px-1 pt-2">
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-700">{meta.current_page}</span> sur{' '}
                <span className="font-semibold text-slate-700">{meta.last_page}</span>
                <span className="ml-2 text-slate-400">· {meta.total} résultat{meta.total !== 1 ? 's' : ''}</span>
              </span>
              <div className="flex items-center gap-1">
                <button className="btn-ghost h-8 w-8 p-0" title="Première page"   disabled={page <= 1}              onClick={() => setPage(1)}>                  <ChevronsLeft  className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" title="Page précédente" disabled={page <= 1}              onClick={() => setPage((p) => p - 1)}>        <ChevronLeft   className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" title="Page suivante"   disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>        <ChevronRight  className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" title="Dernière page"   disabled={page >= meta.last_page} onClick={() => setPage(meta.last_page)}>      <ChevronsRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
