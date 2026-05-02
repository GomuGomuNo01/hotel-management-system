import { useCallback, useEffect, useState } from 'react';
import {
  RotateCcw, CheckCircle2, XCircle, Clock, Filter, X,
  ChevronLeft, ChevronRight, User, BedDouble, Calendar, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.api';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
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
    if (!isApprove && !notes.trim()) return toast.error('Un motif est requis pour un refus.');
    setBusy(true);
    try {
      const fn = isApprove ? adminApi.refunds.approve : adminApi.refunds.reject;
      await fn(refund.id, { notes: notes.trim() || undefined });
      toast.success(isApprove ? 'Remboursement approuvé. Le client a été notifié.' : 'Remboursement refusé. Le client a été notifié.');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
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
              Dossier RMB-{String(refund.id).padStart(6, '0')} — {formatXOF(refund.amount)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Récap client */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
            <p className="font-semibold text-slate-900">
              {refund.client?.first_name} {refund.client?.last_name}
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
              {isApprove ? 'Confirmer l'approbation' : 'Confirmer le refus'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  const fetchRefunds = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.refunds.list({ status: statusFilter || undefined, page, per_page: 20 });
      setRefunds(res?.data ?? []);
      setMeta(res?.meta ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les remboursements.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  const handleDone = () => {
    setModal(null);
    fetchRefunds();
  };

  return (
    <div className="space-y-6 p-6 max-w-screen-xl mx-auto">

      {/* En-tête */}
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

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-slate-400" />
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
        {statusFilter && (
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Effacer
          </button>
        )}
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
              />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-600">
                Page {meta.current_page} / {meta.last_page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
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
function RefundCard({ refund, onApprove, onReject }) {
  const isPending = refund.status === 'pending';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      isPending ? 'border-amber-200' : 'border-slate-100'
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
                  {refund.client?.first_name} {refund.client?.last_name}
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
                        Chambre {refund.reservation.room.room_number} — {refund.reservation.room.room_type}
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
            {refund.admin && ` par ${refund.admin.first_name} ${refund.admin.last_name}`}
          </p>
        </div>

        {/* Montant + actions */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <p className="text-2xl font-black text-slate-900">{formatXOF(refund.amount)}</p>

          {isPending && (
            <div className="flex gap-2">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
