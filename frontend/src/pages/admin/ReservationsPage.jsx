import { useState } from 'react';
import {
  Filter, CalendarCheck, X, Calendar, Moon, FileText,
  BedDouble, User, CheckCircle, XCircle, LogIn, LogOut, Loader2,
  ChevronRight, Info, Clock, Mail, Phone, Tag, Banknote, Download,
  AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import { adminReservationsApi } from '../../api/reservations.api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';
import toast from 'react-hot-toast';

const STATUSES = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'checked_in', label: 'Check-in' },
  { value: 'checked_out', label: 'Check-out' },
  { value: 'cancelled', label: 'Annulées' },
];

/* ── Téléchargement reçu admin ───────────────────────────────── */
async function downloadReceipt(reservationId) {
  try {
    const blob = await adminReservationsApi.receiptBlob(reservationId);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `recu-reservation-${reservationId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Impossible de télécharger le reçu.');
  }
}

/* ── Detail / action modal ───────────────────────────────────── */
function ReservationDetailModal({ reservation: initial, onClose, onUpdated }) {
  const [reservation, setReservation] = useState(initial);
  const [confirm, setConfirm]         = useState(null);
  const [busy, setBusy]               = useState(false);
  const [editNotes, setEditNotes]     = useState(false);
  const [notes, setNotes]             = useState(initial.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [cashConfirm, setCashConfirm] = useState(false);
  const [cashBusy, setCashBusy]       = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

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
      toast.success(confirm?.successMsg || 'Opération réussie.');
      onUpdated(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Opération impossible.');
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
      toast.error('Enregistrement impossible.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCashPayment = async () => {
    setCashBusy(true);
    try {
      const res = await adminReservationsApi.cashPayment(reservation.id);
      const updated = res?.data ?? res;
      setReservation(updated);
      toast.success(`Paiement espèces de ${formatXOF(remainingAmount)} enregistré.`);
      onUpdated(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setCashBusy(false);
      setCashConfirm(false);
    }
  };

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    await downloadReceipt(reservation.id);
    setDownloadingReceipt(false);
  };

  const ACTION_MAP = {
    confirm: {
      action: 'confirm', label: 'Confirmer',
      message: `Confirmer la réservation #${reservation.id} de ${client.first_name} ${client.last_name} ?`,
      successMsg: 'Réservation confirmée.', icon: CheckCircle, cls: 'bg-blue-600 hover:bg-blue-700 text-white',
      allowed: reservation.status === 'pending',
    },
    cancel: {
      action: 'cancel', label: 'Annuler',
      message: `Annuler la réservation #${reservation.id} ? Cette action est irréversible.`,
      successMsg: 'Réservation annulée.', icon: XCircle, cls: 'bg-red-600 hover:bg-red-700 text-white',
      allowed: ['pending', 'confirmed'].includes(reservation.status),
    },
    checkin: {
      action: 'checkin', label: 'Check-in',
      message: `Effectuer le check-in pour la réservation #${reservation.id} ?`,
      successMsg: 'Check-in effectué.', icon: LogIn, cls: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      allowed: reservation.status === 'confirmed',
    },
    checkout: {
      action: 'checkout', label: 'Check-out',
      message: `Effectuer le check-out pour la réservation #${reservation.id} ?`,
      successMsg: 'Check-out effectué.', icon: LogOut, cls: 'bg-slate-700 hover:bg-slate-800 text-white',
      allowed: reservation.status === 'checked_in',
    },
  };

  const availableActions = Object.values(ACTION_MAP).filter((a) => a.allowed);
  const canRecordCash    = !isFullyPaid && ['confirmed', 'checked_in', 'checked_out'].includes(reservation.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-blue-600" />
              Réservation #{reservation.id}
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
            <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-black shadow-md border-2 border-white">
              {client.first_name?.[0]}{client.last_name?.[0]}
            </div>
            <div>
              <p className="text-base font-black text-slate-900">{client.first_name} {client.last_name}</p>
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
                  onClick={handleDownloadReceipt}
                  disabled={downloadingReceipt}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingReceipt ? '…' : 'Reçu'}
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

          {/* Action buttons */}
          {(availableActions.length > 0 || canRecordCash) && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Actions disponibles
              </p>
              <div className="grid grid-cols-2 gap-3">
                {availableActions.map((a) => (
                  <button
                    key={a.action}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black shadow-lg transition-transform active:scale-95 ${a.cls}`}
                    onClick={() => setConfirm(a)}
                    disabled={busy}
                  >
                    <a.icon className="h-4 w-4" />
                    {a.label}
                  </button>
                ))}

                {/* Paiement espèces */}
                {canRecordCash && (
                  <button
                    className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black bg-amber-500 hover:bg-amber-600 text-white shadow-lg transition-transform active:scale-95"
                    onClick={() => setCashConfirm(true)}
                    disabled={cashBusy}
                  >
                    <Banknote className="h-4 w-4" />
                    Enregistrer paiement espèces — {formatXOF(remainingAmount)}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal confirmation action */}
      {confirm && (
        <ConfirmModal
          open
          title={confirm.label}
          message={confirm.message}
          confirmLabel={confirm.label}
          variant={confirm.action === 'cancel' ? 'danger' : 'primary'}
          loading={busy}
          onClose={() => setConfirm(null)}
          onConfirm={() => runAction(confirm.action)}
        />
      )}

      {/* Modal confirmation paiement espèces */}
      <ConfirmModal
        open={cashConfirm}
        title="Paiement en espèces"
        message={`Confirmer la réception de ${formatXOF(remainingAmount)} en espèces pour la réservation #${reservation.id} de ${client.first_name} ${client.last_name} ?`}
        confirmLabel="Confirmer la réception"
        variant="primary"
        loading={cashBusy}
        onClose={() => setCashConfirm(false)}
        onConfirm={handleCashPayment}
      />
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function AdminReservationsPage() {
  const [filters, setFilters] = useState({ status: '', date_from: '', date_to: '' });
  const [page, setPage] = useState(1);
  const { data, meta, loading, refetch } = useReservations({ ...filters, page }, { admin: true });
  const [selected, setSelected] = useState(null);

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const handleUpdated = () => refetch();

  const columns = [
    {
      key: 'id', label: '#',
      render: (r) => <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">#{r.id}</span>,
    },
    {
      key: 'client', label: 'Client',
      render: (r) => r.client ? (
        <div>
          <p className="text-sm font-bold text-slate-900">{r.client.first_name} {r.client.last_name}</p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">{r.client.email}</p>
        </div>
      ) : <span className="text-slate-300">—</span>,
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
      render: (r) => <StatusBadge status={r.status} />,
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
      </div>

      {/* Filtres */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-2.5 rounded-xl border-2 border-slate-100 min-w-[200px]">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none w-full cursor-pointer"
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border-2 border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période</span>
            <input
              type="date"
              className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
              value={filters.date_from}
              onChange={(e) => setFilter('date_from', e.target.value)}
            />
            <ChevronRight className="h-4 w-4 text-slate-300" />
            <input
              type="date"
              className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
              value={filters.date_to}
              onChange={(e) => setFilter('date_to', e.target.value)}
            />
          </div>

          {(filters.status || filters.date_from || filters.date_to) && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              onClick={() => {
                setFilters({ status: '', date_from: '', date_to: '' });
                setPage(1);
              }}
            >
              <X className="h-4 w-4" /> Effacer les filtres
            </button>
          )}
        </div>
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
