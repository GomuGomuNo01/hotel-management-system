import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Filter, CalendarCheck, X, Calendar, Moon, FileText,
  BedDouble, XCircle, Loader2, Search,
  ChevronRight, ChevronDown, Info, Clock, Mail, Phone, Tag, Eye,
  AlertCircle, CheckCircle2, RotateCcw,
} from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import { usePdfViewer } from '../../store/pdfViewerStore';
import { useAutoRefresh }   from '../../hooks/useAutoRefresh';
import { adminReservationsApi } from '../../api/reservations.api';
import { useAuth } from '../../hooks/useAuth';
import { useUiStore } from '../../store/uiStore';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import ModalPortal from '../../components/common/ModalPortal';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';
import toast from '../../lib/toast';

// Libellés alignés sur le badge de statut (colonne STATUT) pour faciliter la recherche
const STATUSES = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending',     label: 'En attente' },
  { value: 'confirmed',   label: 'Confirmée' },
  { value: 'checked_in',  label: 'Arrivé (en séjour)' },
  { value: 'checked_out', label: 'Parti (terminé)' },
  { value: 'cancelled',   label: 'Annulée' },
];

/* ── Mini badge statut remboursement ─────────────────────────── */
const REFUND_BADGE_CFG = {
  pending:  { label: 'Remb. en attente', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  approved: { label: 'Remboursé',        cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected: { label: 'Remb. refusé',     cls: 'bg-red-100 text-red-800 border-red-300' },
};

function RefundMiniTag({ status }) {
  const cfg = REFUND_BADGE_CFG[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${cfg.cls}`}>
      <RotateCcw className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

/* ── Bandeau remboursement pour le modal ─────────────────────── */
const REFUND_MODAL_CFG = {
  pending:  { label: 'Remboursement en cours de traitement', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-100' },
  approved: { label: 'Remboursement approuvé',               color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  rejected: { label: 'Remboursement refusé',                 color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-100' },
};

function RefundBlock({ refund }) {
  if (!refund) return null;
  const cfg = REFUND_MODAL_CFG[refund.status] ?? REFUND_MODAL_CFG.pending;
  return (
    <div className={`rounded-2xl p-4 border ${cfg.bg} ${cfg.border}`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <RotateCcw className="h-3 w-3" /> Remboursement
      </p>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className={`text-sm font-extrabold ${cfg.color}`}>{cfg.label}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Montant : <span className="font-bold">{formatXOF(refund.amount)}</span>
            {refund.processed_at && (
              <span className="ml-2 text-slate-400">
                · Traité le {new Date(refund.processed_at).toLocaleDateString('fr-FR')}
              </span>
            )}
          </p>
          {refund.admin_notes && (
            <p className="text-xs text-slate-500 mt-1.5 italic bg-white/60 rounded-lg px-2.5 py-1.5 border border-white">
              « {refund.admin_notes} »
            </p>
          )}
        </div>
        <RefundMiniTag status={refund.status} />
      </div>
    </div>
  );
}

/* ── Detail / action modal ───────────────────────────────────── */
function ReservationDetailModal({ reservation: initial, onClose, onUpdated }) {
  const [reservation, setReservation] = useState(initial);
  const [confirm, setConfirm]         = useState(null);
  const [busy, setBusy]               = useState(false);
  const [editNotes, setEditNotes]     = useState(false);
  const [notes, setNotes]             = useState(initial.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  // Permissions de l'acteur connecté
  const { user } = useAuth();
  const perms = new Set(user?.permissions ?? []);

  const room   = reservation.room   || {};
  const client = reservation.client || {};

  const paidAmount      = reservation.paid_amount      ?? 0;
  const remainingAmount = reservation.remaining_amount ?? 0;
  const isFullyPaid     = reservation.is_fully_paid    ?? false;
  const hasReceipt      = reservation.has_receipt      ?? false;
  const paymentPlan     = reservation.payment_plan     ?? 'full';

  const runAction = async (action) => {
    setBusy(true);
    try {
      let res;
      switch (action) {
        case 'confirm':  res = await adminReservationsApi.confirm(reservation.id); break;
        case 'cancel':   res = await adminReservationsApi.update(reservation.id, { status: 'cancelled' }); break;
        case 'checkin':  res = await adminReservationsApi.checkIn(reservation.id); break;
        case 'checkout': res = await adminReservationsApi.checkOut(reservation.id); break;
        default: throw new Error('Action inconnue');
      }
      const updated = res?.data ?? res;
      setReservation(updated);
      toast.success(confirm?.successMsg || 'Action réalisée avec succès.');
      onUpdated(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de l'opération. Vérifiez le statut de la réservation.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await adminReservationsApi.update(reservation.id, { notes });
      const updated = res?.data ?? res;
      setReservation(updated);
      setEditNotes(false);
      toast.success('Notes enregistrées.');
      onUpdated(updated);
    } catch {
      toast.error("Impossible d'enregistrer les notes. Réessayez.");
    } finally {
      setSavingNotes(false);
    }
  };

  // Consultation du reçu dans le panneau latéral PDF (implémentation projet)
  const viewReceipt = () => {
    usePdfViewer.getState().view(
      `Reçu - réservation n°${reservation.id}`,
      `recu-reservation-${reservation.id}.pdf`,
      () => adminReservationsApi.receiptBlob(reservation.id),
      "Impossible d'afficher le reçu.",
    );
  };

  // Sur cette page, la seule action possible est l'ANNULATION.
  // Le check-in / check-out et l'encaissement du solde d'acompte se gèrent
  // exclusivement depuis la page « Check-in / Check-out ».
  const cancelAction = {
    action: 'cancel', label: 'Annuler la réservation',
    message: `Annuler la réservation #${reservation.id} de ${client.first_name ?? 'ce client'} ? Si un paiement a déjà été effectué, un remboursement sera automatiquement initié.`,
    successMsg: `Réservation #${reservation.id} annulée. Un remboursement sera traité si un paiement avait été encaissé.`,
  };
  const canCancel = perms.has('manage_reservations')
    && ['pending', 'confirmed'].includes(reservation.status);
  // Info : opérations (check-in/out, encaissement) à effectuer ailleurs
  const showOpsHint = ['confirmed', 'checked_in'].includes(reservation.status);

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-blue-600" />
              Réservation{' '}
              <span className="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg text-base tracking-wider">
                RES-{String(reservation.id).padStart(6, '0')}
              </span>
            </h3>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mt-1">
              Chambre {room.room_number} <span className="text-slate-300 mx-1">|</span> {room.room_type}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Client info */}
          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 flex items-center gap-4">
            {client.profile_photo ? (
              <img
                src={client.profile_photo}
                alt={`${client.last_name ?? ''} ${client.first_name ?? ''}`}
                className="h-12 w-12 rounded-full object-cover shadow-md border-2 border-white"
          loading="lazy"
          decoding="async"
        />
            ) : (
              <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-black shadow-md border-2 border-white">
                {client.last_name?.[0]}{client.first_name?.[0]}
              </div>
            )}
            <div>
              <p className="text-base font-black text-slate-900">{client.last_name} {client.first_name}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                <span className="flex items-center gap-1 text-xs font-bold text-slate-600"><Mail className="h-3 w-3" /> {client.email}</span>
                {client.phone && <span className="flex items-center gap-1 text-xs font-bold text-slate-600"><Phone className="h-3 w-3" /> {client.phone}</span>}
              </div>
            </div>
          </div>

          {/* Dates + montant */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Arrivée
              </p>
              <p className="text-sm font-extrabold text-slate-900">{formatDate(reservation.check_in_date)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Départ
              </p>
              <p className="text-sm font-extrabold text-slate-900">{formatDate(reservation.check_out_date)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Moon className="h-3 w-3" /> Durée
              </p>
              <p className="text-sm font-extrabold text-slate-900">
                {reservation.nights || 0} nuit{reservation.nights > 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> Montant total
              </p>
              <p className="text-base font-black text-blue-700">{formatXOF(reservation.total_amount)}</p>
            </div>
          </div>

          {/* Statut paiement */}
          <div className={`rounded-2xl p-4 border ${isFullyPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Paiement
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">
                  {paymentPlan === 'partial' ? 'Paiement en 2 fois' : 'Paiement intégral'}
                </p>
                <div className="flex items-center gap-2">
                  {isFullyPaid
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <AlertCircle className="h-4 w-4 text-amber-600" />
                  }
                  <span className={`text-sm font-extrabold ${isFullyPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isFullyPaid ? 'Entièrement payé' : `Solde dû : ${formatXOF(remainingAmount)}`}
                  </span>
                </div>
                {paidAmount > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Payé : {formatXOF(paidAmount)} / {formatXOF(reservation.total_amount)}
                  </p>
                )}
              </div>
              {hasReceipt && (
                <button
                  onClick={viewReceipt}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Consulter
                </button>
              )}
            </div>
            {/* Barre de progression */}
            {paidAmount > 0 && (
              <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (paidAmount / reservation.total_amount) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Remboursement */}
          {reservation.refund && <RefundBlock refund={reservation.refund} />}

          {/* Notes */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Notes internes
              </p>
              {!editNotes && (
                <button
                  onClick={() => setEditNotes(true)}
                  className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                >
                  {reservation.notes ? 'Modifier' : 'Ajouter'}
                </button>
              )}
            </div>

            {editNotes ? (
              <div className="space-y-3">
                <textarea
                  className="w-full p-3 text-sm font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 min-h-[100px] shadow-inner"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajouter une note..."
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditNotes(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
                    Annuler
                  </button>
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingNotes && <Loader2 className="h-3 w-3 animate-spin" />} Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-slate-700 leading-relaxed italic bg-white/50 p-3 rounded-xl border border-slate-100 min-h-[50px]">
                {reservation.notes || <span className="text-slate-400 font-normal">Aucune note pour cette réservation.</span>}
              </div>
            )}
          </div>

          {/* Orientation : les opérations se font sur la page Check-in / Check-out */}
          {showOpsHint && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                L'<strong>enregistrement des arrivées</strong>, des <strong>départs</strong> et l&apos;
                <strong>encaissement du solde d&apos;acompte</strong> se gèrent depuis la page{' '}
                <strong>Arrivées & Départs</strong>.
                {!isFullyPaid && paymentPlan === 'partial' && (
                  <> Cette réservation a un solde restant de <strong>{formatXOF(remainingAmount)}</strong>.</>
                )}
              </p>
            </div>
          )}

          {/* Action : annulation uniquement */}
          {canCancel && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Action disponible
              </p>
              <button
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black bg-red-600 hover:bg-red-700 text-white shadow-lg transition-transform active:scale-95"
                onClick={() => setConfirm(cancelAction)}
                disabled={busy}
              >
                <XCircle className="h-4 w-4" />
                {cancelAction.label}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal confirmation annulation */}
      {confirm && (
        <ConfirmModal
          open
          title="Annuler la réservation"
          message={confirm.message}
          confirmLabel="Oui, annuler la réservation"
          cancelLabel="Retour"
          variant="danger"
          loading={busy}
          onClose={() => setConfirm(null)}
          onConfirm={() => runAction(confirm.action)}
        />
      )}
    </div>
    </ModalPortal>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function AdminReservationsPage() {
  const [filters, setFilters] = useState({ search: '', status: '', date_from: '', date_to: '' });
  const [searchInput, setSearchInput] = useState(''); // saisie brute (débouncée vers filters.search)
  const [page, setPage] = useState(1);
  const { data, meta, loading, refetch } = useReservations({ ...filters, page }, { admin: true });
  const [selected, setSelected] = useState(null);
  const { badgeCounts } = useUiStore();

  // Débounce : on n'interroge l'API que 350 ms après la dernière frappe
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Rafraîchissement automatique temps-réel quand un événement pertinent arrive
  useAutoRefresh(
    ['reservation.created', 'reservation.cancelled', 'payment.confirmed', 'checkin.done', 'checkout.done'],
    () => refetch(),
  );

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const handleUpdated = () => refetch();

  const columns = [
    {
      key: 'id', label: 'N° réservation',
      render: (r) => (
        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 tracking-wide whitespace-nowrap">
          RES-{String(r.id).padStart(6, '0')}
        </span>
      ),
    },
    {
      key: 'client', label: 'Client',
      render: (r) => r.client ? (
        <div>
          <p className="text-sm font-bold text-slate-900">{r.client.last_name} {r.client.first_name}</p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">{r.client.email}</p>
        </div>
      ) : <span className="text-slate-300">-</span>,
    },
    {
      key: 'room', label: 'Chambre',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
            <BedDouble className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 uppercase">N° {r.room?.room_number}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{r.room?.room_type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dates', label: 'Période',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-sm font-bold text-slate-700 tabular-nums">
            {formatDate(r.check_in_date)}
            <ChevronRight className="inline h-3 w-3 mx-1 text-slate-300" />
            {formatDate(r.check_out_date)}
            {r.nights != null && <span className="ml-2 text-[10px] font-black text-slate-400 uppercase">({r.nights}n)</span>}
          </span>
        </div>
      ),
    },
    {
      key: 'payment', label: 'Paiement',
      render: (r) => (
        <div>
          <span className="text-sm font-black text-slate-900 tabular-nums">{formatXOF(r.total_amount)}</span>
          {r.is_fully_paid
            ? <span className="ml-1.5 text-[10px] font-bold text-emerald-600 uppercase">✓ payé</span>
            : r.paid_amount > 0
              ? <span className="ml-1.5 text-[10px] font-bold text-amber-600 uppercase">acompte</span>
              : null
          }
        </div>
      ),
    },
    {
      key: 'status', label: 'Statut',
      render: (r) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={r.status} />
          {r.status === 'cancelled' && r.refund && (
            <RefundMiniTag status={r.refund.status} />
          )}
        </div>
      ),
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <button
          className="bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95"
          onClick={() => setSelected(r)}
        >
          Détails
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <CalendarCheck className="h-7 w-7 text-blue-600" />
            Réservations
          </h1>
          {meta && (
            <p className="text-sm font-bold text-slate-600 mt-1">
              <span className="text-blue-700 font-black">{meta.total}</span> réservation{meta.total !== 1 ? 's' : ''} au total
            </p>
          )}
        </div>
        {/* Badge acomptes non soldés → redirige vers Check-in / Check-out pour régler le solde */}
        {badgeCounts.deposits > 0 && (
          <Link
            to="/admin/checkin-checkout"
            className="group flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 hover:bg-amber-100 hover:border-amber-300 transition-colors"
            title="Aller à Arrivées & Départs pour régler les soldes"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-black">
              {badgeCounts.deposits > 99 ? '99+' : badgeCounts.deposits}
            </span>
            <span className="text-sm font-semibold text-amber-800">
              {badgeCounts.deposits === 1
                ? 'réservation avec acompte non soldé'
                : 'réservations avec acompte non soldé'}
            </span>
            <ChevronRight className="h-4 w-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Filtres : 3 éléments par ligne (recherche client · statut · période) */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche client */}
          <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-2.5 rounded-xl border-2 border-slate-100">
            <Search className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              className="bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-semibold focus:outline-none w-full"
              placeholder="N° réservation, nom, e-mail, téléphone…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Statut */}
          <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-2.5 rounded-xl border-2 border-slate-100">
            <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <div className="relative flex-1">
              <select
                className="appearance-none bg-transparent text-sm font-bold text-slate-900 focus:outline-none w-full cursor-pointer pr-5"
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Période */}
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border-2 border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">Période</span>
            <input
              type="date"
              className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer min-w-0 flex-1"
              value={filters.date_from}
              onChange={(e) => setFilter('date_from', e.target.value)}
            />
            <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
            <input
              type="date"
              className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer min-w-0 flex-1"
              value={filters.date_to}
              onChange={(e) => setFilter('date_to', e.target.value)}
            />
          </div>
        </div>

        {(filters.search || filters.status || filters.date_from || filters.date_to) && (
          <div className="flex justify-end">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              onClick={() => {
                setSearchInput('');
                setFilters({ search: '', status: '', date_from: '', date_to: '' });
                setPage(1);
              }}
            >
              <X className="h-4 w-4" /> Effacer les filtres
            </button>
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          page={meta?.current_page || page}
          totalPages={meta?.last_page || 1}
          onPageChange={setPage}
          onRowClick={(r) => setSelected(r)}
          emptyMessage="Aucune réservation trouvée."
        />
      </div>

      {/* Modal détail */}
      {selected && (
        <ReservationDetailModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
