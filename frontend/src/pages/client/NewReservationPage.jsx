import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarRange, Loader2, ArrowLeft, BedDouble } from 'lucide-react';
import { roomsApi } from '../../api/rooms.api';
import { reservationsApi } from '../../api/reservations.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RoomGallery from '../../components/common/RoomGallery';
import { formatXOF } from '../../utils/formatCurrency';
import { nightsBetween } from '../../utils/formatDate';

const AMENITY_LABELS = {
  wifi:          { label: 'WiFi',         icon: '📶' },
  climatisation: { label: 'Climatisation', icon: '❄️' },
  tv:            { label: 'TV',            icon: '📺' },
  minibar:       { label: 'Mini-bar',      icon: '🍹' },
};

export default function NewReservationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const roomId = params.get('roomId');

  const [room, setRoom]               = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(!!roomId);
  const [rooms, setRooms]             = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(!roomId);
  const [checkIn, setCheckIn]         = useState('');
  const [checkOut, setCheckOut]       = useState('');
  const [notes, setNotes]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Load single room from URL param
  useEffect(() => {
    if (!roomId) return;
    setLoadingRoom(true);
    roomsApi.get(roomId)
      .then((r) => setRoom(r?.data ?? r))
      .catch(() => toast.error('Chambre introuvable.'))
      .finally(() => setLoadingRoom(false));
  }, [roomId]);

  // Load room list when no roomId provided
  useEffect(() => {
    if (roomId) return;
    setLoadingRooms(true);
    roomsApi.list({ per_page: 50, status: 'available' })
      .then((r) => {
        const items = r?.data?.data ?? r?.data ?? [];
        setRooms(items);
      })
      .catch(() => toast.error('Impossible de charger les chambres.'))
      .finally(() => setLoadingRooms(false));
  }, [roomId]);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const total  = (room?.price_per_night || 0) * nights;

  const submit = async (e) => {
    e.preventDefault();
    if (!room)       return toast.error('Sélectionnez une chambre.');
    if (nights <= 0) return toast.error('Sélectionnez une période valide.');
    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await reservationsApi.create({
        room_id:        room.id,
        check_in_date:  checkIn,
        check_out_date: checkOut,
        notes:          notes || undefined,
      });
      const reservation = res?.data ?? res;
      toast.success('Réservation créée — passez au paiement.');
      navigate(`/mon-espace/paiement/${reservation.id}`);
    } catch (err) {
      const status = err.response?.status;
      if (status === 422) {
        const errors = err.response?.data?.errors || {};
        setFieldErrors(errors);
        toast.error('Veuillez corriger les erreurs du formulaire.');
      } else if (status === 409) {
        toast.error(err.response?.data?.message || 'Cette chambre est déjà réservée sur cette période.');
      } else {
        toast.error(err.response?.data?.message || 'Création impossible.');
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
        <Link to="/rooms" className="btn-ghost p-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Nouvelle réservation</h1>
      </div>

      {/* Room picker — shown when no roomId in URL */}
      {!roomId && !room && (
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

      {/* Reservation form */}
      {room && (
        <form onSubmit={submit} className="card card-pad space-y-5">

          {/* Change room button when no roomId in URL */}
          {!roomId && (
            <button
              type="button"
              onClick={() => setRoom(null)}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              ← Changer de chambre
            </button>
          )}

          {/* Room gallery */}
          <RoomGallery images={room.images?.length ? room.images : room.photo_url} />

          {/* Room info */}
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
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1"
                    >
                      <span>{meta.icon}</span>
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date d'arrivée</label>
              <input
                type="date"
                className={`input ${fieldErrors.check_in_date ? 'border-red-400' : ''}`}
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
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
                className={`input ${fieldErrors.check_out_date ? 'border-red-400' : ''}`}
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().slice(0, 10)}
              />
              {fieldErrors.check_out_date && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.check_out_date[0]}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Remarques / demandes particulières <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="Chambre non-fumeur, lit bébé, heure d'arrivée tardive…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
            />
          </div>

          {/* Total summary */}
          {nights > 0 && (
            <div className="rounded-lg bg-brand-50 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-brand-700">Total estimé</p>
                <p className="text-xl font-bold text-brand-700 flex items-center gap-2">
                  <CalendarRange className="h-5 w-5" />
                  {nights} nuit{nights > 1 ? 's' : ''} — {formatXOF(total)}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={submitting || nights <= 0}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmer et payer
          </button>
        </form>
      )}
    </div>
  );
}
