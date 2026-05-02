import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, X, Calendar, Moon, FileText, BedDouble, CreditCard,
  Download, AlertCircle, CheckCircle2, RotateCcw, Clock, XCircle, Receipt,
} from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import { reservationsApi } from '../../api/reservations.api';
import { paymentsApi } from '../../api/payments.api';
import ReservationCard from '../../components/reservations/ReservationCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmModal from '../../components/common/ConfirmModal';
import StatusBadge from '../../components/common/StatusBadge';
import { formatXOF } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

/* ── Bandeau statut remboursement ────────────────────────────── */
const REFUND_STATUS_CFG = {
  pending:  { label: 'Remboursement en cours de traitement', icon: Clock,       cls: 'bg-amber-50 border-amber-200 text-amber-800' },
  approved: { label: 'Remboursement approuvé',               icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  rejected: { label: 'Remboursement refusé',                 icon: XCircle,     cls: 'bg-red-50 border-red-200 text-red-800' },
};

function RefundStatusBanner({ refund }) {
  if (!refund) return null;
  const cfg  = REFUND_STATUS_CFG[refund.status] ?? REFUND_STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <div className={`rounded-lg p-3 text-sm flex items-start gap-2 border ${cfg.cls}`}>
      <RotateCcw className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">{cfg.label}</p>
        <p className="text-xs mt-0.5 opacity-80">
          Montant : {formatXOF(refund.amount)}
          {refund.admin_notes && ` — ${refund.admin_notes}`}
        </p>
        {refund.status === 'rejected' && (
          <p className="text-xs mt-1 opacity-70">
            Pour contester cette décision, veuillez contacter la réception.
          </p>
        )}
      </div>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
        <Icon className="h-3 w-3" />
        {refund.status === 'pending' ? 'En attente' : refund.status === 'approved' ? 'Approuvé' : 'Refusé'}
      </span>
    </div>
  );
}

/* ── Téléchargements PDF ─────────────────────────────────────── */
async function downloadReceipt(reservationId) {
  try {
    const blob = await paymentsApi.receiptBlob(reservationId);
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

async function downloadInvoice(reservationId) {
  try {
    const blob = await paymentsApi.invoiceStayBlob(reservationId);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `facture-sejour-${reservationId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Impossible de télécharger la facture.');
  }
}

/* ── Detail / Edit modal ─────────────────────────────────────── */
function ReservationModal({ reservation: initial, onClose, onCancelled, onUpdated }) {
  const [reservation, setReservation] = useState(initial);
  const [editMode, setEditMode]       = useState(false);
  const [checkIn, setCheckIn]         = useState(initial.check_in_date ?? '');
  const [checkOut, setCheckOut]       = useState(initial.check_out_date ?? '');
  const [notes, setNotes]             = useState(initial.notes ?? '');
  const [saving, setSaving]           = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  const room             = reservation.room || {};
  const paidAmount       = reservation.paid_amount ?? 0;
  const remainingAmount  = reservation.remaining_amount ?? 0;
  const isFullyPaid      = reservation.is_fully_paid ?? false;
  const hasReceipt       = reservation.has_receipt ?? false;
  const paymentPlan      = reservation.payment_plan ?? 'full';

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await reservationsApi.update(reservation.id, {
        check_in_date:  checkIn,
        check_out_date: checkOut,
        notes,
      });
      const updated = res?.data ?? res;
      setReservation(updated);
      toast.success('Réservation mise à jour.');
      onUpdated(updated);
      setEditMode(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        toast.error(err.response?.data?.message || 'La chambre est déjà réservée sur cette période.');
      } else {
        toast.error(err.response?.data?.message || 'Modification impossible.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await reservationsApi.cancel(reservation.id);
      toast.success('Réservation annulée.');
      onCancelled(reservation.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Annulation impossible.');
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    await downloadReceipt(reservation.id);
    setDownloadingReceipt(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Réservation #{reservation.id}</p>
              <h2 className="font-bold text-gray-900 text-lg">
                Chambre {room.room_number}
                {room.room_type && <span className="text-gray-500 font-normal"> — {room.room_type}</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={reservation.status} />
              <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {editMode ? (
              /* ── Edit form ── */
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date d'arrivée</label>
                    <input
                      type="date"
                      className="input"
                      required
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div>
                    <label className="label">Date de départ</label>
                    <input
                      type="date"
                      className="input"
                      required
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Remarques</label>
                  <textarea
                    className="input min-h-[80px] resize-y"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={1000}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" className="btn-secondary" onClick={() => setEditMode(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            ) : (
              /* ── Detail view ── */
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Arrivée</p>
                      <p className="font-medium">{formatDate(reservation.check_in_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Départ</p>
                      <p className="font-medium">{formatDate(reservation.check_out_date)}</p>
                    </div>
                  </div>
                  {reservation.nights != null && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Moon className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Durée</p>
                        <p className="font-medium">{reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <BedDouble className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Montant total</p>
                      <p className="font-bold text-brand-600">{formatXOF(reservation.total_amount)}</p>
                    </div>
                  </div>
                </div>

                {/* Statut paiement */}
                {paymentPlan === 'partial' && (
                  <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
                    isFullyPaid ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
                  }`}>
                    {isFullyPaid
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      : <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className={`font-medium text-sm ${isFullyPaid ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {isFullyPaid ? 'Entièrement payé' : `Solde restant : ${formatXOF(remainingAmount)}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Payé : {formatXOF(paidAmount)} / {formatXOF(reservation.total_amount)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Remboursement */}
                {reservation.refund && (
                  <RefundStatusBanner refund={reservation.refund} />
                )}

                {reservation.notes && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 flex gap-2">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p>{reservation.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {/* Payer (première fois) */}
                  {reservation.status === 'pending' && paidAmount === 0 && (
                    <Link
                      to={`/mon-espace/paiement/${reservation.id}`}
                      className="btn-primary flex-1 justify-center"
                    >
                      <CreditCard className="h-4 w-4" /> Payer
                    </Link>
                  )}

                  {/* Payer le solde */}
                  {!isFullyPaid && paidAmount > 0 && ['pending', 'confirmed', 'checked_in'].includes(reservation.status) && (
                    <Link
                      to={`/mon-espace/paiement/${reservation.id}`}
                      className="btn-primary flex-1 justify-center"
                    >
                      <CreditCard className="h-4 w-4" /> Payer le solde ({formatXOF(remainingAmount)})
                    </Link>
                  )}

                  {/* Télécharger le reçu */}
                  {hasReceipt && (
                    <button
                      className="btn-secondary flex-1"
                      onClick={handleDownloadReceipt}
                      disabled={downloadingReceipt}
                    >
                      <Download className="h-4 w-4" />
                      {downloadingReceipt ? 'Téléchargement…' : 'Reçu'}
                    </button>
                  )}

                  {/* Télécharger la facture — uniquement après check-out */}
                  {reservation.has_invoice && (
                    <button
                      className="btn-secondary flex-1"
                      onClick={() => downloadInvoice(reservation.id)}
                    >
                      <Receipt className="h-4 w-4" />
                      Facture
                    </button>
                  )}

                  {/* Modifier */}
                  {reservation.is_editable && (
                    <button
                      className="btn-secondary flex-1"
                      onClick={() => setEditMode(true)}
                    >
                      Modifier
                    </button>
                  )}

                  {/* Annuler */}
                  {reservation.is_cancellable && (
                    <button
                      className="btn-danger flex-1"
                      onClick={() => setConfirmCancel(true)}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmCancel}
        title="Annuler la réservation"
        message={`Voulez-vous vraiment annuler la réservation #${reservation.id} ? Cette action est définitive.`}
        confirmLabel="Oui, annuler"
        variant="danger"
        loading={cancelling}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
      />
    </>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function ReservationsPage() {
  const { data, loading, error, refetch } = useReservations();
  const [selected, setSelected] = useState(null);

  const handleCancelled = () => {
    setSelected(null);
    refetch();
  };

  const handleUpdated = (updated) => {
    setSelected(updated);
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onViewClick={() => setSelected(r)}
              actions={
                <div className="flex gap-2 flex-wrap">
                  {r.status === 'pending' && (r.paid_amount ?? 0) === 0 && (
                    <Link to={`/mon-espace/paiement/${r.id}`} className="btn-primary text-xs">
                      Payer
                    </Link>
                  )}
                  {!(r.is_fully_paid) && (r.paid_amount ?? 0) > 0 && (
                    <Link to={`/mon-espace/paiement/${r.id}`} className="btn-primary text-xs">
                      Payer le solde
                    </Link>
                  )}
                  {r.has_receipt && (
                    <button
                      className="btn-secondary text-xs"
                      onClick={(e) => { e.stopPropagation(); downloadReceipt(r.id); }}
                    >
                      <Download className="h-3.5 w-3.5" /> Reçu
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
                </div>
              }
            />
          ))}
        </div>
      )}

      {selected && (
        <ReservationModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onCancelled={handleCancelled}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
