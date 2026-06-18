import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarRange, Loader2, ArrowLeft, BedDouble, AlertTriangle, CalendarX } from 'lucide-react';
import { roomsApi } from '../../api/rooms.api';
import { reservationsApi } from '../../api/reservations.api';
import { paymentsApi } from '../../api/payments.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RoomGallery from '../../components/common/RoomGallery';
import PaymentPlanSelector from '../../components/payments/PaymentPlanSelector';
import PaymentMethodSelector from '../../components/payments/PaymentMethodSelector';
import PhoneInputWithCode from '../../components/common/PhoneInputWithCode';
import { formatXOF } from '../../utils/formatCurrency';
import { nightsBetween, formatDate } from '../../utils/formatDate';
import { overlapsUnavailable, reservationTotal, amountDueNow } from '../../utils/booking';

const AMENITY_LABELS = {
  wifi:          { label: 'WiFi',         icon: '📶' },
  climatisation: { label: 'Climatisation', icon: '❄️' },
  tv:            { label: 'TV',            icon: '📺' },
  minibar:       { label: 'Mini-bar',      icon: '🍹' },
};

/* Étapes du formulaire */
const STEP_DATES    = 'dates';     // Dates + notes + chambre
const STEP_PAYMENT  = 'payment';   // Plan + moyen + téléphone

export default function NewReservationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const roomId = params.get('roomId');

  /* ── Chambre ── */
  const [room, setRoom]               = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(!!roomId);
  const [rooms, setRooms]             = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(!roomId);

  /* ── Dates indisponibles ── */
  const [unavailable, setUnavailable]         = useState([]);   // [{ check_in, check_out }]
  const [loadingUnavailable, setLoadingUnavailable] = useState(false);

  /* ── Étape 1 : dates ── */
  const [checkIn, setCheckIn]         = useState('');
  const [checkOut, setCheckOut]       = useState('');
  const [notes, setNotes]             = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  /* ── Étape 2 : paiement ── */
  const [paymentPlan, setPaymentPlan] = useState('full');
  const [provider, setProvider]       = useState('orange_ci');
  const [phone, setPhone]             = useState('');

  /* ── UI state ── */
  const [step, setStep]               = useState(STEP_DATES);
  const [submitting, setSubmitting]   = useState(false);

  /* ── Chargement chambre depuis URL ── */
  useEffect(() => {
    if (!roomId) return;
    setLoadingRoom(true);
    roomsApi.get(roomId)
      .then((r) => setRoom(r?.data ?? r))
      .catch(() => toast.error('Chambre introuvable.'))
      .finally(() => setLoadingRoom(false));
  }, [roomId]);

  /* ── Chargement liste chambres (pas de roomId) ── */
  useEffect(() => {
    if (roomId) return;
    setLoadingRooms(true);
    roomsApi.list({ per_page: 50 })            // toutes les chambres, pas seulement disponibles
      .then((r) => {
        const items = r?.data?.data ?? r?.data ?? [];
        // Exclure uniquement les chambres en maintenance
        setRooms(items.filter((rm) => rm.status !== 'maintenance'));
      })
      .catch(() => toast.error('Impossible de charger les chambres.'))
      .finally(() => setLoadingRooms(false));
  }, [roomId]);

  /* ── Chargement des périodes indisponibles dès qu'une chambre est connue ── */
  useEffect(() => {
    if (!room?.id) { setUnavailable([]); return; }
    setLoadingUnavailable(true);
    roomsApi.unavailableDates(room.id)
      .then((r) => setUnavailable(r?.data ?? []))
      .catch(() => setUnavailable([]))
      .finally(() => setLoadingUnavailable(false));
  }, [room?.id]);

  const nights      = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const total       = reservationTotal(room?.price_per_night, nights);
  const dueNow      = amountDueNow(total, paymentPlan);
  const hasConflict = useMemo(
    () => overlapsUnavailable(checkIn, checkOut, unavailable),
    [checkIn, checkOut, unavailable],
  );

  /* ── Passage à l'étape paiement ── */
  const goToPayment = (e) => {
    e.preventDefault();
    if (!room)          return toast.error('Sélectionnez une chambre.');
    if (nights <= 0)    return toast.error('Sélectionnez une période valide.');
    if (hasConflict)    return toast.error('Ces dates sont déjà réservées. Choisissez une autre période.');
    setFieldErrors({});
    setStep(STEP_PAYMENT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Soumission finale ── */
  const submit = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error('Numéro de téléphone requis.');
    setSubmitting(true);
    try {
      /* 1. Créer la réservation */
      const resRes = await reservationsApi.create({
        room_id:        room.id,
        check_in_date:  checkIn,
        check_out_date: checkOut,
        notes:          notes || undefined,
        payment_plan:   paymentPlan,
      });
      const reservation = resRes?.data ?? resRes;

      /* 2. Initier le paiement */
      const payRes = await paymentsApi.initiate({
        reservation_id: reservation.id,
        provider,
        phone_number:   phone.trim(),
      });
      const payment = payRes?.data ?? payRes;

      toast.success('Réservation créée ! Confirmez le paiement pour la valider.');
      navigate(`/mon-espace/paiement/${reservation.id}`, {
        state: { payment, reservation },
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 422) {
        const errors = err.response?.data?.errors || {};
        setFieldErrors(errors);
        toast.error('Veuillez corriger les erreurs du formulaire.');
        setStep(STEP_DATES); // revenir à l'étape 1 si erreurs de dates
      } else if (status === 409) {
        toast.error(err.response?.data?.message || 'Cette chambre est déjà réservée sur cette période.');
        setStep(STEP_DATES);
      } else {
        toast.error(err.response?.data?.message || 'Impossible de créer la réservation. Réessayez.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRoom) return <LoadingSpinner label="Chargement de la chambre…" />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step === STEP_PAYMENT ? (
          <button type="button" onClick={() => setStep(STEP_DATES)} className="btn-ghost p-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <Link to="/rooms" className="btn-ghost p-2">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold">Nouvelle réservation</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {step === STEP_DATES ? 'Étape 1 / 2 - Dates et chambre' : 'Étape 2 / 2 - Plan et paiement'}
          </p>
        </div>
      </div>

      {/* ── Sélecteur chambre (pas de roomId + aucune chambre choisie) ── */}
      {!roomId && !room && step === STEP_DATES && (
        <div className="card card-pad mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-brand-500" />
            Choisir une chambre
          </h2>
          {loadingRooms ? (
            <LoadingSpinner label="Chargement des chambres…" />
          ) : rooms.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune chambre disponible pour le moment.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRoom(r)}
                  className="text-left p-4 border-2 border-transparent rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors group"
                >
                  <p className="font-semibold group-hover:text-brand-700">N° {r.room_number}</p>
                  <p className="text-sm text-gray-500 capitalize">{r.room_type}</p>
                  <p className="text-sm font-medium text-brand-600 mt-1">{formatXOF(r.price_per_night)} / nuit</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ ÉTAPE 1 : DATES ══════════ */}
      {room && step === STEP_DATES && (
        <form onSubmit={goToPayment} className="card card-pad space-y-5">
          {/* Changer de chambre */}
          {!roomId && (
            <button
              type="button"
              onClick={() => setRoom(null)}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              ← Changer de chambre
            </button>
          )}

          {/* Galerie + infos chambre */}
          <RoomGallery images={room.images?.length ? room.images : room.photo_url} />
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500">Chambre N° {room.room_number}</p>
              <p className="font-semibold capitalize text-lg">{room.room_type}</p>
              <p className="text-sm text-brand-600 font-medium">{formatXOF(room.price_per_night)} / nuit</p>
              {room.description && (
                <p className="text-sm text-gray-500 mt-1">{room.description}</p>
              )}
            </div>
            {room.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {room.amenities.map((a) => {
                  const meta = AMENITY_LABELS[a] || { label: a, icon: '•' };
                  return (
                    <span key={a} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
                      <span>{meta.icon}</span>{meta.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Périodes indisponibles */}
          {loadingUnavailable && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Vérification des disponibilités…
            </p>
          )}
          {!loadingUnavailable && unavailable.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
                <CalendarX className="h-3.5 w-3.5" /> Périodes déjà réservées - non sélectionnables
              </p>
              <div className="flex flex-wrap gap-2">
                {unavailable.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 text-xs font-medium"
                  >
                    <CalendarX className="h-3 w-3 opacity-60" />
                    {formatDate(p.check_in)} → {formatDate(p.check_out)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date d'arrivée</label>
              <input
                type="date"
                className={`input ${fieldErrors.check_in_date || hasConflict ? 'border-red-400' : ''}`}
                required
                value={checkIn}
                onChange={(e) => { setCheckIn(e.target.value); setFieldErrors((fe) => ({ ...fe, check_in_date: null })); }}
                min={new Date().toISOString().slice(0, 10)}
              />
              {fieldErrors.check_in_date && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.check_in_date[0]}</p>
              )}
            </div>
            <div>
              <label className="label">Date de départ</label>
              <input
                type="date"
                className={`input ${fieldErrors.check_out_date || hasConflict ? 'border-red-400' : ''}`}
                required
                value={checkOut}
                onChange={(e) => { setCheckOut(e.target.value); setFieldErrors((fe) => ({ ...fe, check_out_date: null })); }}
                min={checkIn || new Date().toISOString().slice(0, 10)}
              />
              {fieldErrors.check_out_date && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.check_out_date[0]}</p>
              )}
            </div>
          </div>

          {/* Alerte conflit de dates */}
          {hasConflict && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">
                Ces dates chevauchent une période déjà réservée. Veuillez choisir d'autres dates.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">
              Remarques / demandes particulières{' '}
              <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="Chambre non-fumeur, lit bébé, heure d'arrivée tardive…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
            />
          </div>

          {/* Récapitulatif */}
          {nights > 0 && (
            <div className="rounded-lg bg-brand-50 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-brand-700">Total estimé</p>
                <p className="text-xl font-bold text-brand-700 flex items-center gap-2">
                  <CalendarRange className="h-5 w-5" />
                  {nights} nuit{nights > 1 ? 's' : ''} - {formatXOF(total)}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={nights <= 0 || hasConflict}
          >
            {hasConflict ? 'Dates indisponibles - choisissez une autre période' : 'Continuer vers le paiement →'}
          </button>
        </form>
      )}

      {/* ══════════ ÉTAPE 2 : PAIEMENT ══════════ */}
      {room && step === STEP_PAYMENT && (
        <form onSubmit={submit} className="space-y-4">
          {/* Récapitulatif chambre */}
          <div className="card card-pad">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Récapitulatif</h2>
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-semibold text-gray-900">
                  Chambre N° {room.room_number}
                  {room.room_type && <span className="font-normal text-gray-500"> - {room.room_type}</span>}
                </p>
                <p>Du <strong>{checkIn}</strong> au <strong>{checkOut}</strong></p>
                <p className="text-gray-500">{nights} nuit{nights > 1 ? 's' : ''}</p>
              </div>
              <p className="text-xl font-bold text-brand-600 whitespace-nowrap">{formatXOF(total)}</p>
            </div>
          </div>

          {/* Plan de paiement */}
          <div className="card card-pad space-y-3">
            <h2 className="font-semibold text-gray-900">Plan de paiement</h2>
            <PaymentPlanSelector
              value={paymentPlan}
              onChange={setPaymentPlan}
              totalAmount={total}
              disabled={submitting}
            />
          </div>

          {/* Moyen de paiement + téléphone */}
          <div className="card card-pad space-y-5">
            <h2 className="font-semibold text-gray-900">Moyen de paiement</h2>

            <PaymentMethodSelector value={provider} onChange={setProvider} disabled={submitting} />

            <PhoneInputWithCode
              label="Numéro de téléphone pour Mobile Money"
              value={phone}
              onChange={setPhone}
              disabled={submitting}
              required
              hint={`Numéro associé à votre compte ${provider === 'orange_ci' ? 'Orange Money' : 'Wave'}.`}
            />

            {/* Montant à payer maintenant */}
            <div className="rounded-lg bg-brand-50 border border-brand-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-brand-600 font-semibold uppercase tracking-wide">
                  {paymentPlan === 'partial' ? 'Acompte à payer maintenant (50 %)' : 'Montant à payer'}
                </p>
                <p className="text-2xl font-bold text-brand-700">{formatXOF(dueNow)}</p>
                {paymentPlan === 'partial' && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Solde de {formatXOF(total / 2)} à régler à l'arrivée ou en ligne
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={submitting}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Traitement en cours…</>
                : `Payer maintenant - ${formatXOF(dueNow)}`
              }
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
