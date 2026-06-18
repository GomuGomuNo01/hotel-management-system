import { Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, FileText, FlaskConical,
  Loader2, RefreshCw, RotateCcw, Trash2, XCircle,
} from 'lucide-react';
import PhoneInputWithCode from '../../components/common/PhoneInputWithCode';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import PaymentMethodSelector from '../../components/payments/PaymentMethodSelector';
import PaymentStatusBanner from '../../components/payments/PaymentStatusBanner';
import { formatXOF } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { paymentTypeLabel } from '../../utils/payment';
import { usePaymentFlow } from './usePaymentFlow';

const EXPIRY_TOTAL = 30 * 60;

/* ════════════════════════════════════════════════════════════════
   Page principale
════════════════════════════════════════════════════════════════ */
export default function PaymentPage() {
  const {
    reservation, pageLoading,
    showPayForm, setShowPayForm,
    provider, setProvider,
    phone, setPhone,
    initiating,
    payment, step, timeLeft, simBusy,
    cancelConfirm, setCancelConfirm, cancelling, resumed,
    initiate, simulate, cancelPayment, downloadReceipt, resetToForm,
  } = usePaymentFlow();

  /* ── Rendu ───────────────────────────────────────────────── */
  if (pageLoading) return <LoadingSpinner label="Chargement…" />;
  if (!reservation) return (
    <p className="text-center py-10 text-gray-500">Réservation introuvable.</p>
  );

  const room             = reservation.room || {};
  const paidAmount       = reservation.paid_amount ?? 0;
  const remainingAmount  = reservation.remaining_amount ?? reservation.total_amount;
  const isFullyPaid      = reservation.is_fully_paid;
  const paymentPlan      = reservation.payment_plan ?? 'full';
  const isCancelled      = reservation.status === 'cancelled';
  const refund           = reservation.refund ?? null;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-5">

      {/* Retour */}
      <Link to="/mon-espace/reservations" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Mes réservations
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Paiement</h1>

      {/* ── Récapitulatif réservation ── */}
      <div className="card card-pad">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Réservation</h2>
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-gray-700 space-y-1">
            <p className="font-semibold text-gray-900">
              Chambre N° {room.room_number}
              {room.room_type && <span className="font-normal text-gray-500"> - {room.room_type}</span>}
            </p>
            <p>Du <strong>{formatDate(reservation.check_in_date)}</strong> au <strong>{formatDate(reservation.check_out_date)}</strong></p>
            {reservation.nights != null && (
              <p className="text-gray-500">{reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold text-brand-600">{formatXOF(reservation.total_amount)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {paymentPlan === 'partial' ? 'Paiement en 2 fois' : 'Paiement intégral'}
            </p>
          </div>
        </div>

        {/* Barre de progression paiement */}
        {paymentPlan === 'partial' && paidAmount > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Payé : <strong className="text-emerald-600">{formatXOF(paidAmount)}</strong></span>
              {!isFullyPaid && <span>Reste : <strong className="text-amber-600">{formatXOF(remainingAmount)}</strong></span>}
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (paidAmount / reservation.total_amount) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bandeau remboursement ── */}
      {refund && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          refund.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
          refund.status === 'rejected' ? 'bg-red-50 border-red-200' :
          'bg-amber-50 border-amber-200'
        }`}>
          <RotateCcw className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
            refund.status === 'approved' ? 'text-emerald-600' :
            refund.status === 'rejected' ? 'text-red-600' :
            'text-amber-600'
          }`} />
          <div className="flex-1">
            <p className={`font-semibold text-sm ${
              refund.status === 'approved' ? 'text-emerald-800' :
              refund.status === 'rejected' ? 'text-red-800' :
              'text-amber-800'
            }`}>
              {refund.status === 'approved'
                ? 'Remboursement approuvé'
                : refund.status === 'rejected'
                ? 'Remboursement refusé'
                : 'Remboursement en cours de traitement'}
            </p>
            <p className="text-xs mt-1 opacity-80">
              Montant : {formatXOF(refund.amount)}
              {refund.admin_notes && ` - ${refund.admin_notes}`}
            </p>
            {refund.status === 'rejected' && (
              <p className="text-xs mt-1 opacity-70">
                Pour contester cette décision, veuillez contacter la réception.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ════════ SUCCÈS ════════ */}
      {step === 'success' && payment && (
        <div className="card card-pad space-y-4">
          <PaymentStatusBanner status="success" />

          <div className="text-sm text-gray-600 space-y-1">
            <p>Type : <span className="font-medium">{paymentTypeLabel(payment.payment_type)}</span></p>
            <p>Montant payé : <span className="font-bold text-emerald-600">{formatXOF(payment.amount)}</span></p>
            <p>Référence : <span className="font-mono">{payment.transaction_reference}</span></p>
          </div>

          {/* Paiement partiel → solde restant (masqué si annulé/remboursé) */}
          {!isFullyPaid && !isCancelled && !refund && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Solde restant : {formatXOF(remainingAmount)}</p>
              <p className="text-xs text-amber-600 mt-1">
                Vous pouvez payer le solde en ligne à tout moment, ou en espèces à votre arrivée.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={downloadReceipt} className="btn-primary flex-1 justify-center">
              <FileText className="h-4 w-4" /> Télécharger le reçu
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Votre facture officielle sera disponible et envoyée par e-mail à l'issue de votre séjour (après votre départ).
          </p>

          {/* Bouton payer le solde (masqué si réservation annulée / remboursement) */}
          {!isFullyPaid && !showPayForm && !isCancelled && !refund && (
            <button
              onClick={() => setShowPayForm(true)}
              className="btn-ghost w-full text-brand-600 hover:bg-brand-50 border border-brand-200"
            >
              Payer le solde maintenant ({formatXOF(remainingAmount)})
            </button>
          )}

          {/* Formulaire paiement solde */}
          {!isFullyPaid && showPayForm && !isCancelled && !refund && (
            <form onSubmit={initiate} className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700">Payer le solde de {formatXOF(remainingAmount)}</p>
              <PaymentMethodSelector value={provider} onChange={setProvider} disabled={initiating} />
              <PhoneInputWithCode
                label="Numéro de téléphone"
                value={phone}
                onChange={setPhone}
                disabled={initiating}
                required
              />
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowPayForm(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={initiating}>
                  {initiating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Payer {formatXOF(remainingAmount)}
                </button>
              </div>
            </form>
          )}

          <Link to="/mon-espace/reservations" className="btn-ghost w-full justify-center">
            Mes réservations
          </Link>
        </div>
      )}

      {/* ════════ EN ATTENTE ════════ */}
      {step === 'pending' && payment && (
        <div className="space-y-4">
          {resumed && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 flex-shrink-0" />
              Paiement précédent retrouvé - reprise en cours.
            </div>
          )}

          <PaymentStatusBanner status="pending" timeLeft={timeLeft} totalSeconds={EXPIRY_TOTAL} />

          {/* Infos paiement */}
          <div className="card card-pad text-sm space-y-2 text-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium">{paymentTypeLabel(payment.payment_type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fournisseur</span>
              <span className="font-medium">{payment.provider === 'orange_ci' ? 'Orange Money' : 'Wave'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Téléphone</span>
              <span className="font-medium">{payment.phone_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Montant</span>
              <span className="font-bold text-brand-600">{formatXOF(payment.amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Référence</span>
              <span className="font-mono text-gray-500 truncate max-w-[180px]">{payment.transaction_reference}</span>
            </div>
          </div>

          {/* ── Panneau simulation ── */}
          {payment.simulation_mode && (
            <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                <FlaskConical className="h-4 w-4" />
                Mode simulation - APIs non configurées
              </div>
              <p className="text-xs text-indigo-600">
                Simulez le résultat pour tester le comportement de l'application.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="btn-primary justify-center"
                  onClick={() => simulate('success')}
                  disabled={simBusy}
                >
                  {simBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Simuler succès
                </button>
                <button
                  type="button"
                  className="btn-danger justify-center"
                  onClick={() => simulate('failed')}
                  disabled={simBusy}
                >
                  {simBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Simuler échec
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Vous pouvez fermer cet onglet. Le paiement sera retrouvé automatiquement à votre retour.
          </p>

          <button
            type="button"
            className="btn-ghost w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
            onClick={() => setCancelConfirm(true)}
          >
            <Trash2 className="h-4 w-4" /> Annuler ce paiement
          </button>
        </div>
      )}

      {/* ════════ ÉCHOUÉ ════════ */}
      {step === 'failed' && (
        <div className="space-y-4">
          <PaymentStatusBanner status="failed" />
          <p className="text-sm text-gray-600 text-center">
            Vérifiez votre solde ou réessayez avec un autre moyen de paiement.
          </p>
          <button onClick={resetToForm} className="btn-primary w-full">
            <RefreshCw className="h-4 w-4" /> Réessayer
          </button>
        </div>
      )}

      {/* ════════ ANNULÉ / EXPIRÉ ════════ */}
      {step === 'cancelled' && (
        <div className="space-y-4">
          <PaymentStatusBanner status={timeLeft === 0 ? 'expired' : 'cancelled'} />
          {/* Nouvelle tentative uniquement si la réservation n'est pas elle-même annulée */}
          {!isCancelled && (
            <button onClick={resetToForm} className="btn-primary w-full">
              <RefreshCw className="h-4 w-4" /> Nouvelle tentative
            </button>
          )}
          {isCancelled && (
            <Link to="/mon-espace/reservations" className="btn-ghost w-full justify-center">
              Mes réservations
            </Link>
          )}
        </div>
      )}

      {/* ════════ FORMULAIRE - Premier paiement (aucun paiement existant) ════════ */}
      {step === 'form' && !isFullyPaid && paidAmount === 0 && !isCancelled && (
        <form onSubmit={initiate} className="card card-pad space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900">
              {paymentPlan === 'partial' ? "Payer l'acompte (50 %)" : 'Payer maintenant'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Montant à régler :{' '}
              <strong className="text-brand-600">{formatXOF(remainingAmount)}</strong>
              {paymentPlan === 'partial' && (
                <span className="text-gray-400"> - solde de {formatXOF(reservation.total_amount / 2)} à l'arrivée</span>
              )}
            </p>
          </div>

          <PaymentMethodSelector value={provider} onChange={setProvider} disabled={initiating} />

          <PhoneInputWithCode
            label="Numéro de téléphone"
            value={phone}
            onChange={setPhone}
            disabled={initiating}
            required
            hint={`Numéro associé à votre compte ${provider === 'orange_ci' ? 'Orange Money' : 'Wave'}.`}
          />

          <button type="submit" className="btn-primary w-full" disabled={initiating}>
            {initiating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Initiation en cours…</>
              : `Payer maintenant - ${formatXOF(remainingAmount)}`
            }
          </button>
        </form>
      )}

      {/* ════════ FORMULAIRE - Solde restant (acompte déjà versé) ════════ */}
      {step === 'form' && !isFullyPaid && paidAmount > 0 && !isCancelled && (
        <form onSubmit={initiate} className="card card-pad space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900">Payer le solde restant</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Montant dû : <strong className="text-amber-600">{formatXOF(remainingAmount)}</strong>
            </p>
          </div>

          <PaymentMethodSelector value={provider} onChange={setProvider} disabled={initiating} />

          <PhoneInputWithCode
            label="Numéro de téléphone"
            value={phone}
            onChange={setPhone}
            disabled={initiating}
            required
          />

          <button type="submit" className="btn-primary w-full" disabled={initiating}>
            {initiating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Initiation en cours…</>
              : `Payer ${formatXOF(remainingAmount)}`
            }
          </button>
        </form>
      )}

      {/* ════════ ENTIÈREMENT PAYÉ ════════ */}
      {step === 'form' && isFullyPaid && (
        <div className="card card-pad space-y-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <p className="font-semibold text-gray-900">Réservation entièrement payée</p>
          <p className="text-sm text-gray-500">
            Total : {formatXOF(reservation.total_amount)}
          </p>
          <button onClick={downloadReceipt} className="btn-primary w-full justify-center">
            <FileText className="h-4 w-4" /> Télécharger le reçu
          </button>
          <Link to="/mon-espace/reservations" className="btn-ghost w-full justify-center">
            Mes réservations
          </Link>
        </div>
      )}

      {/* ── Modal confirmation annulation ── */}
      <ConfirmModal
        open={cancelConfirm}
        title="Annuler le paiement"
        message={
          (reservation?.paid_amount ?? 0) === 0
            ? "Voulez-vous annuler ce paiement ? Aucun montant n'ayant encore été confirmé, votre réservation sera automatiquement annulée."
            : "Voulez-vous annuler ce paiement en cours ? Votre réservation reste active - vous pourrez payer le solde ultérieurement."
        }
        confirmLabel="Oui, annuler"
        variant="danger"
        loading={cancelling}
        onClose={() => setCancelConfirm(false)}
        onConfirm={cancelPayment}
      />
    </div>
  );
}
