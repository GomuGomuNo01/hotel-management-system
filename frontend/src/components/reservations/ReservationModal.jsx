/**
 * ReservationModal - composant partagé (DashboardPage + ReservationsPage).
 * Mise en forme améliorée : header dégradé, grille infos, boutons groupés.
 */
/* eslint-disable react-refresh/only-export-components -- actions PDF (viewReceipt/downloadInvoice…) co-localisées volontairement ; n'affecte que le Fast Refresh en dev. */
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal }    from 'react-dom';
import { Link }            from 'react-router-dom';
import toast               from 'react-hot-toast';
import {
  X, Calendar, Moon, FileText, BedDouble, CreditCard,
  Download, AlertCircle, CheckCircle2, RotateCcw, Clock,
  XCircle, Receipt, Star, Hash, MessageSquareWarning, Eye,
} from 'lucide-react';
import { reservationsApi } from '../../api/reservations.api';
import { paymentsApi }     from '../../api/payments.api';
import { usePdfViewer }    from '../../store/pdfViewerStore';
import StatusBadge         from '../common/StatusBadge';
import ConfirmModal        from '../common/ConfirmModal';
import ComplaintFormModal  from '../complaints/ComplaintFormModal';
import { formatXOF }       from '../../utils/formatCurrency';
import { formatDate }      from '../../utils/formatDate';

/* ── Consultation PDF en ligne (réutilisable) ────────────────────── */
/* Ouvre le panneau latéral (drawer) avec le lecteur PDF intégré - aucun
   téléchargement ni nouvel onglet. Utilisable hors composant React. */
export function viewReceipt(reservationId) {
  usePdfViewer.getState().view(
    `Reçu - réservation n°${reservationId}`,
    `recu-reservation-${reservationId}.pdf`,
    () => paymentsApi.receiptBlob(reservationId),
    'Impossible d\'afficher le reçu. Vérifiez que votre paiement a bien été confirmé.',
  );
}

export function viewInvoice(reservationId) {
  usePdfViewer.getState().view(
    `Facture de séjour - réservation n°${reservationId}`,
    `facture-sejour-${reservationId}.pdf`,
    () => paymentsApi.invoiceStayBlob(reservationId),
    "La facture est disponible après la validation de votre départ par la réception.",
  );
}

/* ── Téléchargements PDF (réutilisables) ─────────────────────────── */
export async function downloadReceipt(reservationId) {
  try {
    const blob = await paymentsApi.receiptBlob(reservationId);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `recu-reservation-${reservationId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Impossible de télécharger le reçu. Vérifiez que votre paiement a bien été confirmé.');
  }
}

export async function downloadInvoice(reservationId) {
  try {
    const blob = await paymentsApi.invoiceStayBlob(reservationId);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `facture-sejour-${reservationId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("La facture est disponible après la validation de votre départ par la réception.");
  }
}

/* ── Bandeau remboursement ───────────────────────────────────────── */
const REFUND_CFG = {
  pending:  { label: 'Remboursement en cours de traitement', Icon: Clock,        cls: 'bg-amber-50   border-amber-200   text-amber-800'   },
  approved: { label: 'Remboursement approuvé',               Icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  rejected: { label: 'Remboursement refusé',                 Icon: XCircle,      cls: 'bg-red-50     border-red-200     text-red-800'     },
};

function RefundBanner({ refund }) {
  if (!refund) return null;
  const { label, Icon, cls } = REFUND_CFG[refund.status] ?? REFUND_CFG.pending;
  const badge = refund.status === 'pending' ? 'En attente' : refund.status === 'approved' ? 'Approuvé' : 'Refusé';
  return (
    <div className={`rounded-xl p-3.5 flex items-start gap-3 border ${cls}`}>
      <RotateCcw className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-70" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs mt-0.5 opacity-75">
          Montant : {formatXOF(refund.amount)}
          {refund.admin_notes && ` - ${refund.admin_notes}`}
        </p>
        {refund.status === 'rejected' && (
          <p className="text-xs mt-1 opacity-60">Pour contester, veuillez contacter la réception.</p>
        )}
      </div>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls} shrink-0`}>
        <Icon className="h-3 w-3" /> {badge}
      </span>
    </div>
  );
}

/* ── Bloc info (icône + label + valeur) ──────────────────────────── */
function InfoCell({ icon: Icon, label, value, valueClass = '' }) {
  return (
    <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3">
      <div className="h-8 w-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 leading-none mb-0.5">{label}</p>
        <p className={`text-sm font-semibold text-gray-800 leading-snug ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

/* ── Modale principale ───────────────────────────────────────────── */
export default function ReservationModal({
  reservation: initial,
  onClose,
  onCancelled,
  onUpdated,
  onOpenReview,
}) {
  const [reservation, setReservation]             = useState(initial);
  const [editMode, setEditMode]                   = useState(false);
  const [checkIn, setCheckIn]                     = useState(initial.check_in_date ?? '');
  const [checkOut, setCheckOut]                   = useState(initial.check_out_date ?? '');
  const [notes, setNotes]                         = useState(initial.notes ?? '');
  const [saving, setSaving]                       = useState(false);
  const [cancelling, setCancelling]               = useState(false);
  const [confirmCancel, setConfirmCancel]         = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [showComplaint, setShowComplaint]         = useState(false);

  const room            = reservation.room || {};
  const paidAmount      = reservation.paid_amount   ?? 0;
  const remainingAmount = reservation.remaining_amount ?? 0;
  const isFullyPaid     = reservation.is_fully_paid ?? false;
  const hasReceipt      = reservation.has_receipt   ?? false;
  const paymentPlan     = reservation.payment_plan  ?? 'full';

  const titleId   = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && !saving && !cancelling && onClose?.();
    document.addEventListener('keydown', onEsc);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onEsc);
  }, [saving, cancelling, onClose]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res     = await reservationsApi.update(reservation.id, { check_in_date: checkIn, check_out_date: checkOut, notes });
      const updated = res?.data ?? res;
      setReservation(updated);
      toast.success('Votre réservation a bien été modifiée.');
      onUpdated?.(updated);
      setEditMode(false);
    } catch (err) {
      toast.error(
        err.response?.status === 409
          ? err.response?.data?.message || 'Ces dates ne sont plus disponibles.'
          : err.response?.data?.message || "La modification a échoué. Réessayez ou contactez l'hôtel.",
      );
    } finally { setSaving(false); }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await reservationsApi.cancel(reservation.id);
      toast.success("Réservation annulée. Un remboursement sera traité si un paiement a été effectué.");
      onCancelled?.(reservation.id);
    } catch (err) {
      toast.error(err.response?.data?.message || "L'annulation a échoué. Contactez l'hôtel.");
    } finally { setCancelling(false); setConfirmCancel(false); }
  };

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    await downloadReceipt(reservation.id);
    setDownloadingReceipt(false);
  };

  const typeLabel = room.room_type
    ? room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)
    : '';

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="bg-white w-full sm:rounded-2xl sm:max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl outline-none"
        >

          {/* ── Header dégradé ── */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-5 pt-5 pb-4 text-white flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-brand-200 text-xs mb-1">
                  <Hash className="h-3 w-3" />
                  Réservation #{reservation.id}
                </div>
                <h2 id={titleId} className="font-bold text-xl leading-tight">
                  Chambre {room.room_number}
                </h2>
                {typeLabel && (
                  <p className="text-brand-200 text-sm mt-0.5">{typeLabel}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                <StatusBadge status={reservation.status} />
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Corps scrollable ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">

              {editMode ? (
                /* ── Formulaire de modification ── */
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Date d&apos;arrivée</label>
                      <input type="date" className="input" required value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)} />
                    </div>
                    <div>
                      <label className="label">Date de départ</label>
                      <input type="date" className="input" required value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        min={checkIn || new Date().toISOString().slice(0, 10)} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Remarques</label>
                    <textarea className="input min-h-[80px] resize-y" value={notes}
                      onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button type="button" className="btn-secondary" onClick={() => setEditMode(false)}>Annuler</button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </div>
                </form>

              ) : (
                <>
                  {/* ── Grille infos ── */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <InfoCell icon={Calendar} label="Arrivée"       value={formatDate(reservation.check_in_date)} />
                    <InfoCell icon={Calendar} label="Départ"        value={formatDate(reservation.check_out_date)} />
                    {reservation.nights != null && (
                      <InfoCell icon={Moon}     label="Durée"
                        value={`${reservation.nights} nuit${reservation.nights > 1 ? 's' : ''}`} />
                    )}
                    <InfoCell icon={BedDouble} label="Montant total"
                      value={formatXOF(reservation.total_amount)}
                      valueClass="text-brand-600" />
                  </div>

                  {/* ── Statut paiement partiel ── */}
                  {paymentPlan === 'partial' && reservation.status !== 'cancelled' && (
                    <div className={`rounded-xl p-3.5 flex items-start gap-3 border ${
                      isFullyPaid
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      {isFullyPaid
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        : <AlertCircle  className="h-5 w-5 text-amber-500  flex-shrink-0 mt-0.5" />
                      }
                      <div>
                        <p className={`font-semibold text-sm ${isFullyPaid ? 'text-emerald-800' : 'text-amber-800'}`}>
                          {isFullyPaid ? 'Paiement complet' : `Solde restant : ${formatXOF(remainingAmount)}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Payé : {formatXOF(paidAmount)} / {formatXOF(reservation.total_amount)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Remboursement ── */}
                  {reservation.refund && <RefundBanner refund={reservation.refund} />}

                  {/* ── Notes ── */}
                  {reservation.notes && (
                    <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3.5">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600 leading-relaxed">{reservation.notes}</p>
                    </div>
                  )}

                  {/* ── Avis soumis ── */}
                  {reservation.has_review && (
                    <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <Star className="h-5 w-5 fill-emerald-400 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-emerald-800">Avis déjà soumis - merci !</p>
                        {reservation.review?.rating && (
                          <p className="text-xs text-emerald-600 mt-0.5">Note : {reservation.review.rating}/5</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Footer actions (fixe) ── */}
          {!editMode && (
            <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-4 flex-shrink-0 space-y-2.5">

              {/* Payer (première fois) */}
              {reservation.status === 'pending' && paidAmount === 0 && (
                <Link to={`/mon-espace/paiement/${reservation.id}`} className="btn-primary w-full justify-center">
                  <CreditCard className="h-4 w-4" /> Payer maintenant
                </Link>
              )}

              {/* Payer le solde */}
              {!isFullyPaid && paidAmount > 0 && ['pending', 'confirmed', 'checked_in'].includes(reservation.status) && !reservation.refund && (
                <Link to={`/mon-espace/paiement/${reservation.id}`} className="btn-primary w-full justify-center">
                  <CreditCard className="h-4 w-4" /> Payer le solde ({formatXOF(remainingAmount)})
                </Link>
              )}

              {/* Donner mon avis */}
              {reservation.can_review && !reservation.has_review && (
                <button
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                  onClick={() => { onOpenReview?.(reservation); onClose(); }}
                >
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  Donner mon avis sur ce séjour
                </button>
              )}

              {/* Signaler un problème (service client) - pendant le séjour uniquement */}
              {reservation.status === 'checked_in' && (
                <button
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors"
                  onClick={() => setShowComplaint(true)}
                >
                  <MessageSquareWarning className="h-4 w-4" />
                  Signaler un problème
                </button>
              )}

              {/* ── Documents (reçu / facture) ── */}
              {(hasReceipt || reservation.has_invoice) && (
                <div className="rounded-xl border border-gray-200 bg-white p-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-1 mb-1.5">Documents</p>
                  <div className="grid grid-cols-2 gap-2">
                    {hasReceipt && (
                      <button
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
                        onClick={() => viewReceipt(reservation.id)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir le reçu
                      </button>
                    )}
                    {hasReceipt && (
                      <button
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                          reservation.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                        }`}
                        onClick={handleDownloadReceipt}
                        disabled={downloadingReceipt}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingReceipt ? 'Téléchargement…' : 'Télécharger le reçu'}
                      </button>
                    )}
                    {reservation.has_invoice && (
                      <button
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
                        onClick={() => viewInvoice(reservation.id)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir la facture
                      </button>
                    )}
                    {reservation.has_invoice && (
                      <button
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
                        onClick={() => downloadInvoice(reservation.id)}
                      >
                        <Receipt className="h-3.5 w-3.5" /> Télécharger la facture
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Gestion de la réservation ── */}
              {(reservation.is_editable || reservation.is_cancellable) && (
                <div className="flex flex-wrap gap-2">
                  {reservation.is_editable && (
                    <button
                      className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors"
                      onClick={() => setEditMode(true)}
                    >
                      Modifier
                    </button>
                  )}
                  {reservation.is_cancellable && (
                    <button
                      className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                      onClick={() => setConfirmCancel(true)}
                    >
                      Annuler la réservation
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
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

      {showComplaint && (
        <ComplaintFormModal
          reservation={reservation}
          onClose={() => setShowComplaint(false)}
          onSubmitted={() => setShowComplaint(false)}
        />
      )}
    </>,
    document.body,
  );
}
