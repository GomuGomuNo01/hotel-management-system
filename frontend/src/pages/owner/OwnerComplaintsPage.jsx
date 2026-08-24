/**
 * OwnerComplaintsPage — /owner/reclamations
 * Vue owner : liste des réclamations clients avec action de traitement.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquareWarning, CheckCircle2, Clock, Filter, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  User, BedDouble, Calendar, Loader2, Send,
} from 'lucide-react';
import toast from '../../lib/toast';
import { ownerApi }       from '../../api/owner.api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import LoadingSpinner     from '../../components/common/LoadingSpinner';
import ErrorMessage       from '../../components/common/ErrorMessage';
import EmptyState         from '../../components/common/EmptyState';
import ModalPortal        from '../../components/common/ModalPortal';
import { formatDate }     from '../../utils/formatDate';

const STATUSES = [
  { value: 'open',    label: 'Ouvertes' },
  { value: 'handled', label: 'Traitées' },
  { value: '',        label: 'Toutes' },
];

const STATUS_CONFIG = {
  open:    { label: 'Ouverte', icon: Clock,        cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  handled: { label: 'Traitée', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

function ComplaintBadge({ status }) {
  const cfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {cfg.label}
    </span>
  );
}

/* ── Modal de traitement ─────────────────────────────────────── */
function HandleModal({ complaint, onClose, onDone }) {
  const [response, setResponse] = useState('');
  const [busy, setBusy]         = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ownerApi.complaints.handle(complaint.id, { response: response.trim() || undefined });
      toast.success('Réclamation clôturée. Le client a été informé.');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de traiter cette réclamation. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 rounded-t-2xl flex items-center gap-3 bg-emerald-50 border-b border-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="font-bold text-slate-900">Marquer comme traitée</h2>
              <p className="text-xs text-slate-500">
                RCL-{String(complaint.id).padStart(6, '0')} · {complaint.category_label}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-slate-900">
                {complaint.client?.last_name} {complaint.client?.first_name}
              </p>
              <p className="text-slate-500 text-xs">{complaint.client?.email}</p>
              <p className="text-slate-700 text-sm mt-2 leading-relaxed">{complaint.message}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Réponse au client <span className="font-normal text-slate-400">(optionnel)</span>
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[100px]"
                placeholder="Expliquez la résolution apportée…"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                maxLength={2000}
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
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Confirmer
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

/* ── Carte réclamation ───────────────────────────────────────── */
function ComplaintCard({ complaint, onHandle }) {
  const isOpen = complaint.status === 'open';
  const room   = complaint.reservation?.room ?? {};

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isOpen ? 'border-orange-200' : 'border-slate-100'}`}>
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              RCL-{String(complaint.id).padStart(6, '0')}
            </span>
            <span className="text-sm font-bold text-slate-900">{complaint.category_label}</span>
          </div>
          <ComplaintBadge status={complaint.status} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">
                {complaint.client?.last_name} {complaint.client?.first_name}
              </p>
              <p className="text-xs text-slate-500">{complaint.client?.email}</p>
            </div>
          </div>
          {complaint.reservation && (
            <>
              <div className="flex items-start gap-2">
                <BedDouble className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">Réservation #{complaint.reservation_id}</p>
                  {room.room_number && (
                    <p className="text-xs text-slate-500">Chambre {room.room_number} · {room.room_type}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Dates du séjour</p>
                  <p className="font-medium text-slate-900 text-xs">
                    {formatDate(complaint.reservation.check_in_date)} → {formatDate(complaint.reservation.check_out_date)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
          {complaint.message}
        </p>

        {complaint.admin_response && (
          <p className="text-xs text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
            <span className="font-semibold">Réponse :</span> {complaint.admin_response}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Reçue le {formatDate(complaint.created_at)}
            {complaint.handled_at && ` · Traitée le ${formatDate(complaint.handled_at)}`}
            {complaint.admin && ` par ${complaint.admin.last_name} ${complaint.admin.first_name}`}
          </p>
          {isOpen && (
            <button
              onClick={() => onHandle(complaint)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" /> Marquer traité
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────── */
export default function OwnerComplaintsPage() {
  const [complaints, setComplaints]         = useState([]);
  const [meta, setMeta]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [statusFilter, setStatusFilter]     = useState('open');
  const [page, setPage]                     = useState(1);
  const [modal, setModal]                   = useState(null);

  const fetchComplaints = useCallback(async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const res = await ownerApi.complaints.list({
        status:   statusFilter || undefined,
        page,
        per_page: 20,
      });
      setComplaints(res?.data ?? []);
      setMeta(res?.meta ?? null);
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || 'Impossible de charger les réclamations.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  // Synchro temps réel : nouvelles réclamations et traitements (admin ou owner).
  useAutoRefresh(
    ['complaint.created', 'complaint.handled'],
    () => fetchComplaints({ silent: true }),
  );

  const handleDone = () => { setModal(null); fetchComplaints(); };

  return (
    <div className="space-y-6 p-6 max-w-screen-xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <MessageSquareWarning className="h-7 w-7 text-orange-500" />
          Réclamations
        </h1>
        {meta && (
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-800">{meta.total}</span>{' '}
            réclamation{meta.total !== 1 ? 's' : ''} au total
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
                ? 'bg-amber-500 text-white'
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
        <LoadingSpinner label="Chargement des réclamations…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchComplaints} />
      ) : complaints.length === 0 ? (
        <EmptyState message="Aucune réclamation trouvée." />
      ) : (
        <>
          <div className="space-y-3">
            {complaints.map((c) => (
              <ComplaintCard key={c.id} complaint={c} onHandle={(cmp) => setModal(cmp)} />
            ))}
          </div>

          {meta && (
            <div className="flex items-center justify-between px-1 pt-2">
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold">{meta.current_page}</span> sur{' '}
                <span className="font-semibold">{meta.last_page}</span>
                <span className="ml-2 text-slate-400">· {meta.total} résultat{meta.total !== 1 ? 's' : ''}</span>
              </span>
              <div className="flex items-center gap-1">
                <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1}               onClick={() => setPage(1)}                  title="Première page"><ChevronsLeft  className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1}               onClick={() => setPage((p) => p - 1)}       title="Page précédente"><ChevronLeft className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" disabled={page >= meta.last_page}  onClick={() => setPage((p) => p + 1)}       title="Page suivante"><ChevronRight  className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" disabled={page >= meta.last_page}  onClick={() => setPage(meta.last_page)}     title="Dernière page"><ChevronsRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <HandleModal complaint={modal} onClose={() => setModal(null)} onDone={handleDone} />
      )}
    </div>
  );
}
