import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle2, Download, FileText, FlaskConical,
  Loader2, Phone, RefreshCw, Trash2, XCircle,
} from 'lucide-react';
import { reservationsApi } from '../../api/reservations.api';
import { paymentsApi } from '../../api/payments.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmModal from '../../components/common/ConfirmModal';
import PaymentMethodSelector from '../../components/payments/PaymentMethodSelector';
import PaymentStatusBanner from '../../components/payments/PaymentStatusBanner';
import { formatXOF } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

/* ── SessionStorage ──────────────────────────────────────────── */
const ssKey = (id) => `pay_${id}`;

const saveSession = (reservationId, paymentId, expiresAt) =>
  sessionStorage.setItem(ssKey(reservationId), JSON.stringify({ paymentId, expiresAt }));

const loadSession = (reservationId) => {
  try { return JSON.parse(sessionStorage.getItem(ssKey(reservationId)) || 'null'); }
  catch { return null; }
};

const clearSession = (reservationId) =>
  sessionStorage.removeItem(ssKey(reservationId));

/* ── Secondes restantes ──────────────────────────────────────── */
const secondsLeft = (expiresAt) => {
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
};

/* ── Libellé du type de paiement ────────────────────────────── */
const paymentTypeLabel = (type) => ({
  deposit: 'Acompte (50 %)',
  balance: 'Solde restant',
  full:    'Paiement intégral',
}[type] ?? 'Paiement');

const EXPIRY_TOTAL = 30 * 60;

/* ════════════════════════════════════════════════════════════════
   Page principale
════════════════════════════════════════════════════════════════ */
export default function PaymentPage() {
  const { id: reservationId } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();

  /* Données */
  const [reservation, setReservation]     = useState(null);
  const [pageLoading, setPageLoading]     = useState(true);

  /* Formulaire de paiement du solde (si plan=partial + déjà un acompte) */
  const [showPayForm, setShowPayForm]     = useState(false);
  const [provider, setProvider]           = useState('orange_ci');
  const [phone, setPhone]                 = useState('');
  const [initiating, setInitiating]       = useState(false);

  /* Paiement en cours */
  const [payment, setPayment]             = useState(null);
  const [step, setStep]                   = useState('form'); // form | pending | success | failed | cancelled
  const [timeLeft, setTimeLeft]           = useState(null);
  const [simBusy, setSimBusy]             = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling]       = useState(false);
  const [resumed, setResumed]             = useState(false);

  const pollingRef   = useRef(null);
  const countdownRef = useRef(null);

  /* ── 1. Chargement + vérification session ────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await reservationsApi.get(reservationId);
        const resa = res?.data ?? res;
        setReservation(resa);

        // Si on arrive depuis NewReservationPage avec un paiement déjà initié
        const statePayment = location.state?.payment;
        if (statePayment && statePayment.status === 'pending') {
          setPayment(statePayment);
          setStep('pending');
          saveSession(reservationId, statePayment.id, statePayment.expires_at);
          // Nettoyer le state pour éviter la reprise si on recharge
          window.history.replaceState({}, document.title);
          return;
        }

        // Sinon vérifier sessionStorage (paiement abandonné)
        const session = loadSession(reservationId);
        if (session?.paymentId) {
          try {
            const sRes = await paymentsApi.status(session.paymentId);
            const p = sRes?.data ?? sRes;
            if (p && p.status === 'pending') {
              setPayment(p);
              setStep('pending');
              setResumed(true);
              toast('Paiement précédent retrouvé — reprise en cours.', { icon: '🔄' });
            } else {
              clearSession(reservationId);
              if (p?.status === 'success') {
                setPayment(p);
                setStep('success');
              }
            }
          } catch {
            clearSession(reservationId);
          }
        }
      } catch {
        toast.error('Réservation introuvable.');
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [reservationId]);

  /* ── 2. Countdown ────────────────────────────────────────── */
  useEffect(() => {
    if (step !== 'pending' || !payment?.expires_at) return;
    const tick = () => {
      const left = secondsLeft(payment.expires_at);
      setTimeLeft(left);
      if (left === 0) autoExpire();
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => clearInterval(countdownRef.current);
  }, [step, payment?.expires_at]);

  /* ── 3. Polling (5 s) ────────────────────────────────────── */
  useEffect(() => {
    if (step !== 'pending' || !payment?.id) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await paymentsApi.status(payment.id);
        const p   = res?.data ?? res;
        if (p.status !== 'pending') handlePaymentFinished(p);
      } catch { /* réseau — on réessaie */ }
    }, 5000);
    return () => clearInterval(pollingRef.current);
  }, [step, payment?.id]);

  /* ── 4. beforeunload ─────────────────────────────────────── */
  useEffect(() => {
    if (step !== 'pending') return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'Un paiement est en cours. Vous pourrez le retrouver à votre retour.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step]);

  /* ── Helpers ─────────────────────────────────────────────── */
  const stopPolling   = () => clearInterval(pollingRef.current);
  const stopCountdown = () => clearInterval(countdownRef.current);

  const handlePaymentFinished = useCallback((p) => {
    stopPolling();
    stopCountdown();
    setPayment(p);
    clearSession(reservationId);
    if (p.status === 'success') {
      setStep('success');
      toast.success('Paiement confirmé ! 🎉');
      // Recharger la réservation pour mettre à jour paid_amount etc.
      reservationsApi.get(reservationId).then((r) => setReservation(r?.data ?? r));
    } else if (p.status === 'failed') {
      setStep('failed');
      toast.error('Le paiement a échoué.');
    } else {
      setStep('cancelled');
    }
  }, [reservationId]);

  const autoExpire = useCallback(() => {
    stopPolling();
    stopCountdown();
    setTimeLeft(0);
    clearSession(reservationId);
    setPayment((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    setStep('cancelled');
    toast.error('Le délai de paiement a expiré.');
  }, [reservationId]);

  const resetToForm = () => {
    stopPolling();
    stopCountdown();
    clearSession(reservationId);
    setPayment(null);
    setStep('form');
    setResumed(false);
    setTimeLeft(null);
    setShowPayForm(false);
  };

  /* ── Actions ─────────────────────────────────────────────── */

  /** Initier un paiement (utilisé depuis la page pour payer le solde) */
  const initiate = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error('Numéro de téléphone requis.');
    setInitiating(true);
    try {
      const res = await paymentsApi.initiate({
        reservation_id: Number(reservationId),
        provider,
        phone_number:   phone.trim(),
      });
      const p = res?.data ?? res;
      setPayment(p);
      setStep('pending');
      setShowPayForm(false);
      saveSession(reservationId, p.id, p.expires_at);
      toast('Confirmez le paiement sur votre téléphone.', { icon: '📱' });
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 409) toast.error(msg || 'Un paiement est déjà en cours.');
      else if (status === 422) toast.error(msg || 'Déjà entièrement payé.');
      else toast.error(msg || "Impossible d'initier le paiement.");
    } finally {
      setInitiating(false);
    }
  };

  const simulate = async (outcome) => {
    setSimBusy(true);
    try {
      const res = await paymentsApi.simulate(payment.id, outcome);
      const p   = res?.data ?? res;
      handlePaymentFinished(p);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Simulation impossible.');
    } finally {
      setSimBusy(false);
    }
  };

  const cancelPayment = async () => {
    setCancelling(true);
    try {
      await paymentsApi.cancel(payment.id);
      stopPolling();
      stopCountdown();
      clearSession(reservationId);
      setStep('cancelled');
      setPayment((prev) => ({ ...prev, status: 'cancelled' }));
      toast('Paiement annulé.', { icon: '🚫' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Annulation impossible.');
    } finally {
      setCancelling(false);
      setCancelConfirm(false);
    }
  };

  const downloadReceipt = async () => {
    try {
      const blob = await paymentsApi.receiptBlob(Number(reservationId));
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `recu-reservation-${reservationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Téléchargement du reçu impossible.');
    }
  };

  const downloadInvoice = async () => {
    try {
      const blob = await paymentsApi.invoiceBlob(payment.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `facture-${payment.transaction_reference ?? payment.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Téléchargement impossible.');
    }
  };

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
              {room.room_type && <span className="font-normal text-gray-500"> — {room.room_type}</span>}
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

      {/* ════════ SUCCÈS ════════ */}
      {step === 'success' && payment && (
        <div className="card card-pad space-y-4">
          <PaymentStatusBanner status="success" />

          <div className="text-sm text-gray-600 space-y-1">
            <p>Type : <span className="font-medium">{paymentTypeLabel(payment.payment_type)}</span></p>
            <p>Montant payé : <span className="font-bold text-emerald-600">{formatXOF(payment.amount)}</span></p>
            <p>Référence : <span className="font-mono">{payment.transaction_reference}</span></p>
          </div>

          {/* Paiement partiel → solde restant */}
          {!isFullyPaid && (
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
            <button onClick={downloadInvoice} className="btn-secondary flex-1 justify-center">
              <Download className="h-4 w-4" /> Facture
            </button>
          </div>

          {/* Bouton payer le solde */}
          {!isFullyPaid && !showPayForm && (
            <button
              onClick={() => setShowPayForm(true)}
              className="btn-ghost w-full text-brand-600 hover:bg-brand-50 border border-brand-200"
            >
              Payer le solde maintenant ({formatXOF(remainingAmount)})
            </button>
          )}

          {/* Formulaire paiement solde */}
          {!isFullyPaid && showPayForm && (
            <form onSubmit={initiate} className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700">Payer le solde de {formatXOF(remainingAmount)}</p>
              <PaymentMethodSelector value={provider} onChange={setProvider} disabled={initiating} />
              <div>
                <label className="label flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Numéro de téléphone
                </label>
                <input
                  className="input"
                  type="tel"
                  placeholder="+225 07 00 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={initiating}
                  required
                />
              </div>
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
              Paiement précédent retrouvé — reprise en cours.
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
                Mode simulation — APIs non configurées
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
          <button onClick={resetToForm} className="btn-primary w-full">
            <RefreshCw className="h-4 w-4" /> Nouvelle tentative
          </button>
        </div>
      )}

      {/* ════════ FORMULAIRE — Premier paiement (aucun paiement existant) ════════ */}
      {step === 'form' && !isFullyPaid && paidAmount === 0 && (
        <form onSubmit={initiate} className="card card-pad space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900">
              {paymentPlan === 'partial' ? "Payer l'acompte (50 %)" : 'Payer maintenant'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Montant à régler :{' '}
              <strong className="text-brand-600">{formatXOF(remainingAmount)}</strong>
              {paymentPlan === 'partial' && (
                <span className="text-gray-400"> — solde de {formatXOF(reservation.total_amount / 2)} à l'arrivée</span>
              )}
            </p>
          </div>

          <PaymentMethodSelector value={provider} onChange={setProvider} disabled={initiating} />

          <div>
            <label className="label flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Numéro de téléphone
            </label>
            <input
              className="input"
              type="tel"
              placeholder="+225 07 00 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={initiating}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Numéro associé à votre compte{' '}
              {provider === 'orange_ci' ? 'Orange Money' : 'Wave'}.
            </p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={initiating}>
            {initiating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Initiation en cours…</>
              : `Payer maintenant — ${formatXOF(remainingAmount)}`
            }
          </button>
        </form>
      )}

      {/* ════════ FORMULAIRE — Solde restant (acompte déjà versé) ════════ */}
      {step === 'form' && !isFullyPaid && paidAmount > 0 && (
        <form onSubmit={initiate} className="card card-pad space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900">Payer le solde restant</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Montant dû : <strong className="text-amber-600">{formatXOF(remainingAmount)}</strong>
            </p>
          </div>

          <PaymentMethodSelector value={provider} onChange={setProvider} disabled={initiating} />

          <div>
            <label className="label flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Numéro de téléphone
            </label>
            <input
              className="input"
              type="tel"
              placeholder="+225 07 00 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={initiating}
              required
            />
          </div>

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
        message="Voulez-vous annuler ce paiement en cours ? Vous pourrez en initier un nouveau ensuite."
        confirmLabel="Oui, annuler"
        variant="danger"
        loading={cancelling}
        onClose={() => setCancelConfirm(false)}
        onConfirm={cancelPayment}
      />
    </div>
  );
}
