import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle2, Download, FlaskConical,
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

/* ── Clé sessionStorage ──────────────────────────────────────── */
const ssKey = (reservationId) => `pay_${reservationId}`;

const saveSession = (reservationId, paymentId, expiresAt) =>
  sessionStorage.setItem(ssKey(reservationId), JSON.stringify({ paymentId, expiresAt }));

const loadSession = (reservationId) => {
  try { return JSON.parse(sessionStorage.getItem(ssKey(reservationId)) || 'null'); }
  catch { return null; }
};

const clearSession = (reservationId) =>
  sessionStorage.removeItem(ssKey(reservationId));

/* ── Calcul des secondes restantes avant expiration ─────────── */
const secondsLeft = (expiresAt) => {
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
};

/* ── Constantes ──────────────────────────────────────────────── */
const EXPIRY_TOTAL = 30 * 60; // 30 minutes en secondes

/* ════════════════════════════════════════════════════════════════
   Page principale
════════════════════════════════════════════════════════════════ */
export default function PaymentPage() {
  const { id: reservationId } = useParams();
  const navigate = useNavigate();

  /* Données */
  const [reservation, setReservation]   = useState(null);
  const [pageLoading, setPageLoading]   = useState(true);

  /* Formulaire */
  const [provider, setProvider]         = useState('orange_ci');
  const [phone, setPhone]               = useState('');
  const [submitting, setSubmitting]     = useState(false);

  /* Paiement en cours */
  const [payment, setPayment]           = useState(null);
  const [step, setStep]                 = useState('form'); // form | pending | success | failed | cancelled
  const [timeLeft, setTimeLeft]         = useState(null);
  const [simBusy, setSimBusy]           = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling]     = useState(false);

  /* Paiement précédent retrouvé (session abandonnée) */
  const [resumed, setResumed]           = useState(false);

  const pollingRef  = useRef(null);
  const countdownRef = useRef(null);

  /* ── 1. Chargement de la réservation + vérification session ── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await reservationsApi.get(reservationId);
        const resa = res?.data ?? res;
        setReservation(resa);

        // Vérifier si un paiement pending a été laissé en sessionStorage
        const session = loadSession(reservationId);
        if (session?.paymentId) {
          try {
            const sRes = await paymentsApi.status(session.paymentId);
            const p = sRes?.data ?? sRes;
            if (p && p.status === 'pending') {
              // Paiement toujours valide — on reprend
              setPayment(p);
              setStep('pending');
              setResumed(true);
              toast('Paiement précédent retrouvé — reprise en cours.', { icon: '🔄' });
            } else {
              // Expiré / échoué / succès — nettoyer
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

  /* ── 2. Countdown (mis à jour chaque seconde quand pending) ── */
  useEffect(() => {
    if (step !== 'pending' || !payment?.expires_at) return;

    const tick = () => {
      const left = secondsLeft(payment.expires_at);
      setTimeLeft(left);
      if (left === 0) autoExpire();
    };

    tick(); // immédiat
    countdownRef.current = setInterval(tick, 1000);
    return () => clearInterval(countdownRef.current);
  }, [step, payment?.expires_at]);

  /* ── 3. Polling automatique (5 s) ──────────────────────────── */
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

  /* ── 4. Alerte beforeunload si paiement en cours ───────────── */
  useEffect(() => {
    if (step !== 'pending') return;

    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'Un paiement est en cours. Si vous quittez la page, vous pourrez le retrouver lors de votre prochaine visite.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step]);

  /* ── Helpers ────────────────────────────────────────────────── */

  const stopPolling  = () => clearInterval(pollingRef.current);
  const stopCountdown = () => clearInterval(countdownRef.current);

  const handlePaymentFinished = useCallback((p) => {
    stopPolling();
    stopCountdown();
    setPayment(p);
    clearSession(reservationId);

    if (p.status === 'success') {
      setStep('success');
      toast.success('Paiement confirmé ! 🎉');
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
    // On marque cancelled côté UI (le backend auto-expire au prochain appel status)
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
  };

  /* ── Actions ────────────────────────────────────────────────── */

  const initiate = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error('Numéro de téléphone requis.');
    setSubmitting(true);
    try {
      const res = await paymentsApi.initiate({
        reservation_id: Number(reservationId),
        provider,
        phone_number:   phone.trim(),
      });
      const p = res?.data ?? res;
      setPayment(p);
      setStep('pending');
      saveSession(reservationId, p.id, p.expires_at);
      toast('Confirmez le paiement sur votre téléphone.', { icon: '📱' });
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 409) toast.error(msg || 'Un paiement est déjà en cours.');
      else if (status !== 422) toast.error(msg || "Impossible d'initier le paiement.");
    } finally {
      setSubmitting(false);
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

  /* ── Rendu ──────────────────────────────────────────────────── */

  if (pageLoading) return <LoadingSpinner label="Chargement…" />;
  if (!reservation) return (
    <p className="text-center py-10 text-gray-500">Réservation introuvable.</p>
  );

  const room = reservation.room || {};

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
          <p className="text-xl font-bold text-brand-600 whitespace-nowrap">{formatXOF(reservation.total_amount)}</p>
        </div>
      </div>

      {/* ════════ FORMULAIRE ════════ */}
      {step === 'form' && (
        <form onSubmit={initiate} className="card card-pad space-y-5">
          <h2 className="font-semibold text-gray-900">Choisir un moyen de paiement</h2>

          <PaymentMethodSelector value={provider} onChange={setProvider} disabled={submitting} />

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
              disabled={submitting}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Numéro associé à votre compte{' '}
              {provider === 'orange_ci' ? 'Orange Money' : 'Wave'}.
            </p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Initiation en cours…</>
              : 'Payer maintenant'
            }
          </button>
        </form>
      )}

      {/* ════════ EN ATTENTE ════════ */}
      {step === 'pending' && payment && (
        <div className="space-y-4">

          {/* Bannière reprise */}
          {resumed && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 flex-shrink-0" />
              Paiement précédent retrouvé — vous pouvez reprendre là où vous en étiez.
            </div>
          )}

          {/* Statut + countdown */}
          <PaymentStatusBanner
            status="pending"
            timeLeft={timeLeft}
            totalSeconds={EXPIRY_TOTAL}
          />

          {/* Infos paiement */}
          <div className="card card-pad text-sm space-y-2 text-gray-700">
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
                Mode simulation activé
              </div>
              <p className="text-xs text-indigo-600">
                Les APIs Orange CI / Wave CI ne sont pas encore configurées.
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

          {/* Note fermeture page */}
          <p className="text-xs text-gray-400 text-center">
            Vous pouvez fermer cet onglet. Le paiement sera retrouvé automatiquement à votre retour.
          </p>

          {/* Annuler */}
          <button
            type="button"
            className="btn-ghost w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
            onClick={() => setCancelConfirm(true)}
          >
            <Trash2 className="h-4 w-4" /> Annuler ce paiement
          </button>
        </div>
      )}

      {/* ════════ SUCCÈS ════════ */}
      {step === 'success' && payment && (
        <div className="card card-pad text-center space-y-4">
          <PaymentStatusBanner status="success" />

          <div className="pt-2">
            <p className="text-sm text-gray-600">
              Référence : <span className="font-mono font-medium">{payment.transaction_reference}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={downloadInvoice} className="btn-primary">
              <Download className="h-4 w-4" /> Télécharger la facture
            </button>
            <Link to="/mon-espace/reservations" className="btn-secondary justify-center">
              Mes réservations
            </Link>
          </div>
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
          <PaymentStatusBanner
            status={timeLeft === 0 ? 'expired' : 'cancelled'}
          />
          <button onClick={resetToForm} className="btn-primary w-full">
            <RefreshCw className="h-4 w-4" /> Nouvelle tentative
          </button>
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
