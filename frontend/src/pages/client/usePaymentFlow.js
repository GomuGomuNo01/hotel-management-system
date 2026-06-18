import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { reservationsApi } from '../../api/reservations.api';
import { paymentsApi } from '../../api/payments.api';
import { secondsLeft } from '../../utils/payment';

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

/**
 * usePaymentFlow — toute la logique du parcours de paiement (chargement,
 * reprise de session, compte à rebours, polling du statut, initiation,
 * simulation, annulation, reçu). Extraite de PaymentPage pour séparer la
 * logique d'état de la présentation. Le rendu reste dans la page.
 */
export function usePaymentFlow() {
  const { id: reservationId } = useParams();
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
  const paymentIdRef = useRef(null); // Accessible depuis autoExpire sans dépendance circulaire

  /* Synchroniser paymentIdRef avec le state (accès dans callbacks sans dépendance) */
  useEffect(() => { paymentIdRef.current = payment?.id ?? null; }, [payment?.id]);

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
      toast.success('Paiement reçu ! Votre réservation est confirmée.');
      // Recharger la réservation pour mettre à jour paid_amount etc.
      reservationsApi.get(reservationId).then((r) => setReservation(r?.data ?? r));
    } else if (p.status === 'failed') {
      setStep('failed');
      toast.error('Paiement refusé. Vérifiez votre solde et réessayez.');
    } else {
      setStep('cancelled');
      // Recharger - la réservation a pu être auto-annulée côté backend
      reservationsApi.get(reservationId).then((r) => setReservation(r?.data ?? r));
    }
  }, [reservationId]);

  const autoExpire = useCallback(() => {
    stopPolling();
    stopCountdown();
    setTimeLeft(0);
    clearSession(reservationId);
    setPayment((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    setStep('cancelled');
    toast.error('Délai expiré. Votre réservation a été annulée automatiquement.');
    // Notifier le backend → déclenche l'expiration + auto-annulation de la réservation
    const pid = paymentIdRef.current;
    if (pid) {
      paymentsApi.status(pid)
        .catch(() => {})
        .finally(() => reservationsApi.get(reservationId).then((r) => setReservation(r?.data ?? r)));
    }
  }, [reservationId]);

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
              toast('Paiement précédent retrouvé - reprise en cours.', { icon: '🔄' });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, payment?.expires_at]);

  /* ── 3. Polling (5 s) ────────────────────────────────────── */
  useEffect(() => {
    if (step !== 'pending' || !payment?.id) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await paymentsApi.status(payment.id);
        const p   = res?.data ?? res;
        if (p.status !== 'pending') handlePaymentFinished(p);
      } catch { /* réseau - on réessaie */ }
    }, 5000);
    return () => clearInterval(pollingRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (status === 409) toast.error(msg || 'Un paiement est déjà en attente de confirmation.');
      else if (status === 422) toast.error(msg || 'Cette réservation est déjà entièrement payée.');
      else toast.error(msg || 'Impossible de lancer le paiement. Réessayez.');
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
    // Déterminer si la réservation va être auto-annulée (aucun paiement réussi)
    const willCancelReservation = (reservation?.paid_amount ?? 0) === 0;
    setCancelling(true);
    try {
      await paymentsApi.cancel(payment.id);
      stopPolling();
      stopCountdown();
      clearSession(reservationId);
      setStep('cancelled');
      setPayment((prev) => ({ ...prev, status: 'cancelled' }));
      toast.error(
        willCancelReservation
          ? 'Paiement annulé. Votre réservation a également été annulée.'
          : 'Paiement annulé.',
      );
      // Recharger la réservation pour refléter l'annulation automatique côté backend
      reservationsApi.get(reservationId).then((r) => setReservation(r?.data ?? r));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible d\'annuler le paiement. Réessayez.');
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
      toast.error('Impossible de télécharger le reçu. Réessayez.');
    }
  };

  return {
    reservation, pageLoading,
    showPayForm, setShowPayForm,
    provider, setProvider,
    phone, setPhone,
    initiating,
    payment, step, timeLeft, simBusy,
    cancelConfirm, setCancelConfirm, cancelling, resumed,
    initiate, simulate, cancelPayment, downloadReceipt, resetToForm,
  };
}
