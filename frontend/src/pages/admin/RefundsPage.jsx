import { useCallback, useEffect, useState } from 'react';
import { useUiStore }    from '../../store/uiStore';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import {
  RotateCcw, CheckCircle2, XCircle, Clock, Filter, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  User, BedDouble, Calendar, Loader2, Search, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.api';
import { usePdfViewer } from '../../store/pdfViewerStore';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import ModalPortal from '../../components/common/ModalPortal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import { formatXOF } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const STATUSES = [
  { value: '',         label: 'Tous les statuts' },
  { value: 'pending',  label: 'En attente' },
  { value: 'approved', label: 'Approuvés' },
  { value: 'rejected', label: 'Refusés' },
];

const STATUS_CONFIG = {
  pending:  { label: 'En attente',  icon: Clock,        cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved: { label: 'Approuvé',    icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Refusé',      icon: XCircle,      cls: 'bg-red-100 text-red-800 border-red-200' },
};

function RefundBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

/* ── Modal traitement ────────────────────────────────────────── */
function ProcessModal({ refund, action, onClose, onDone }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy]   = useState(false);

  const isApprove = action === 'approve';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isApprove && !notes.trim()) return toast.error('Veuillez indiquer le motif du refus.');
    setBusy(true);
    try {
      const fn = isApprove ? adminApi.refunds.approve : adminApi.refunds.reject;
      await fn(refund.id, { notes: notes.trim() || undefined });
      toast.success(isApprove ? 'Remboursement accordé. Le client a reçu une notification.' : 'Demande refusée. Le client a reçu une notification.');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action impossible. Vérifiez les informations et réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className={`px-6 py-4 rounded-t-2xl flex items-center gap-3 ${isApprove ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-red-50 border-b border-red-100'}`}>
          {isApprove
            ? <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            : <XCircle      className="h-6 w-6 text-red-600" />
          }
          <div>
            <h2 className="font-bold text-slate-900">
              {isApprove ? 'Approuver le remboursement' : 'Refuser le remboursement'}
            </h2>
            <p className="text-xs text-slate-500">
              Dossier RMB-{String(refund.id).padStart(6, '0')} - {formatXOF(refund.amount)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Récap client */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
            <p className="font-semibold text-slate-900">
              {refund.client?.last_name} {refund.client?.first_name}
            </p>
            <p className="text-slate-500 text-xs">{refund.client?.email}</p>
            <p className="text-slate-600 text-xs mt-1">
              Réservation #{refund.reservation_id}
              {refund.reservation?.room && ` · Chambre ${refund.reservation.room.room_number}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isApprove ? 'Note interne (optionnel)' : 'Motif du refus (obligatoire)'}
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[100px]"
              placeholder={isApprove ? 'Ex. : virement initié le…' : 'Expliquer le motif du refus au client…'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              disabled={busy}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={busy}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${
                isApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isApprove ? "Confirmer l'approbation" : 'Confirmer le refus'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

/* ── Page principale ─────────────────────────────────────────── */
export default function AdminRefundsPage() {
  const [refunds, setRefunds]   = useState([]);
  const [meta, setMeta]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage]         = useState(1);
  const [modal, setModal]       = useState(null); // { refund, action }
  const [searchInput, setSearchInput] = useState(''); // valeur brute (input)
  const [search, setSearch]           = useState('');  // valeur débouncée → API
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  const { triggerBadgeRefresh, badgeCounts } = useUiStore();

  // Debounce 350 ms sur la recherche texte uniquement
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRefunds = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.refunds.list({
        status:    statusFilter || undefined,
        search:    search       || undefined,
        date_from: dateFrom     || undefined,
        date_to:   dateTo       || undefined,
        page,
        per_page: 20,
      });
      setRefunds(res?.data ?? []);
      setMeta(res?.meta ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les remboursements.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, dateFrom, dateTo, page]);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  // Rafraîchissement temps-réel - nouvelle demande ou traitement d'un remboursement
  useAutoRefresh(
    ['refund.requested', 'refund.processed'],
    () => fetchRefunds(),
  );

  const handleDone = () => {
    setModal(null);
    fetchRefunds();
    // Rafraîchit immédiatement le badge dans la sidebar
    triggerBadgeRefresh();
  };

  return (
    <div className="space-y-6 p-6 max-w-screen-xl mx-auto">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <RotateCcw className="h-7 w-7 text-brand-600" />
            Remboursements
          </h1>
          {meta && (
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-semibold text-slate-800">{meta.total}</span> demande{meta.total !== 1 ? 's' : ''} au total
            </p>
          )}
        </div>
        {badgeCounts.refunds > 0 && (
          <div className="flex-shrink-0 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black">
              {badgeCounts.refunds > 99 ? '99+' : badgeCounts.refunds}
            </span>
            <span className="text-sm font-semibold text-red-700">
              {badgeCounts.refunds === 1 ? 'demande en attente' : 'demandes en attente'}
            </span>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">

        {/* Ligne 1 - statut + recherche client */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />

          {/* Boutons statut */}
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  statusFilter === s.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          {/* Recherche client */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              placeholder="Nom ou email du client…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Effacer la recherche"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Ligne 2 - période de demande */}
        <div className="flex flex-wrap gap-3 items-center pt-1 border-t border-slate-100">
          <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Période de demande</span>

          <div className="flex items-center gap-2">
            <input
              type="date"
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
            <span className="text-slate-400 text-sm font-medium">→</span>
            <input
              type="date"
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
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

          {/* Effacer tous les filtres */}
          {(statusFilter || search || dateFrom || dateTo) && (
            <button
              onClick={() => { setStatusFilter(''); setSearchInput(''); setDateFrom(''); setDateTo(''); setPage(1); }}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" /> Tout effacer
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <LoadingSpinner label="Chargement des remboursements…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchRefunds} />
      ) : refunds.length === 0 ? (
        <EmptyState message="Aucune demande de remboursement trouvée." />
      ) : (
        <>
          <div className="space-y-3">
            {refunds.map((refund) => (
              <RefundCard
                key={refund.id}
                refund={refund}
                onApprove={() => setModal({ refund, action: 'approve' })}
                onReject={() => setModal({ refund, action: 'reject' })}
                onViewReceipt={() => {
                  const ref = String(refund.id).padStart(6, '0');
                  const isRej = refund.status === 'rejected';
                  usePdfViewer.getState().view(
                    isRej ? `Avis de refus RMB-${ref}` : `Reçu remboursement RMB-${ref}`,
                    `recu-remboursement-${ref}.pdf`,
                    () => adminApi.refunds.receiptBlob(refund.id),
                    'Document de remboursement indisponible.',
                  );
                }}
              />
            ))}
          </div>

          {/* Pagination - modèle DataTable du projet */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between px-1 pt-2">
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-700">{meta.current_page}</span> sur{' '}
                <span className="font-semibold text-slate-700">{meta.last_page}</span>
                <span className="ml-2 text-slate-400">· {meta.total} résultat{meta.total !== 1 ? 's' : ''}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="btn-ghost h-8 w-8 p-0" title="Première page"
                  disabled={page <= 1} onClick={() => setPage(1)}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost h-8 w-8 p-0" title="Page précédente"
                  disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost h-8 w-8 p-0" title="Page suivante"
                  disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost h-8 w-8 p-0" title="Dernière page"
                  disabled={page >= meta.last_page} onClick={() => setPage(meta.last_page)}
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <ProcessModal
          refund={modal.refund}
          action={modal.action}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}

/* ── Carte remboursement ─────────────────────────────────────── */
function RefundCard({ refund, onApprove, onReject, onViewReceipt }) {
  const isPending  = refund.status === 'pending';
  const isApproved = refund.status === 'approved';
  const isRejected = refund.status === 'rejected';
  const hasReceipt = isApproved || isRejected; // reçu disponible pour les deux statuts finaux

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      isPending ? 'border-amber-200' : isRejected ? 'border-red-100' : 'border-slate-100'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">

        {/* Infos principales */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              RMB-{String(refund.id).padStart(6, '0')}
            </span>
            <RefundBadge status={refund.status} />
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">
                  {refund.client?.last_name} {refund.client?.first_name}
                </p>
                <p className="text-xs text-slate-500">{refund.client?.email}</p>
              </div>
            </div>
            {refund.reservation && (
              <>
                <div className="flex items-start gap-2">
                  <BedDouble className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      Réservation #{refund.reservation_id}
                    </p>
                    {refund.reservation.room && (
                      <p className="text-xs text-slate-500">
                        Chambre {refund.reservation.room.room_number} - {refund.reservation.room.room_type}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Dates du séjour</p>
                    <p className="font-medium text-slate-900 text-xs">
                      {formatDate(refund.reservation.check_in_date)} → {formatDate(refund.reservation.check_out_date)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {refund.admin_notes && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <span className="font-semibold">Note admin :</span> {refund.admin_notes}
            </p>
          )}

          <p className="text-xs text-slate-400">
            Demandé le {formatDate(refund.created_at)}
            {refund.processed_at && ` · Traité le ${formatDate(refund.processed_at)}`}
            {refund.admin && ` par ${refund.admin.last_name} ${refund.admin.first_name}`}
          </p>
        </div>

        {/* Montant + actions */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <p className="text-2xl font-black text-slate-900">{formatXOF(refund.amount)}</p>

          <div className="flex flex-wrap gap-2 justify-end">
            {/* Reçu PDF - disponible pour les remboursements approuvés ET refusés */}
            {hasReceipt && (
              <button
                onClick={onViewReceipt}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  isRejected
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <FileText className="h-4 w-4" />
                {isRejected ? 'Voir l\'avis de refus' : 'Voir le reçu'}
              </button>
            )}

            {isPending && (
              <>
                <button
                  onClick={onReject}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  <XCircle className="h-4 w-4" /> Refuser
                </button>
                <button
                  onClick={onApprove}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approuver
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
