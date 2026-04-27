import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarRange, Loader2 } from 'lucide-react';
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
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [checkIn, setCheckIn]         = useState('');
  const [checkOut, setCheckOut]       = useState('');
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    if (!roomId) { setLoadingRoom(false); return; }
    roomsApi.get(roomId)
      .then((r) => setRoom(r?.data ?? r))
      .catch(() => toast.error('Chambre introuvable.'))
      .finally(() => setLoadingRoom(false));
  }, [roomId]);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const total  = (room?.price_per_night || 0) * nights;

  const submit = async (e) => {
    e.preventDefault();
    if (!room)      return toast.error('Sélectionnez une chambre.');
    if (nights <= 0) return toast.error('Sélectionnez une période valide.');
    setSubmitting(true);
    try {
      const res = await reservationsApi.create({
        room_id:        room.id,
        check_in_date:  checkIn,
        check_out_date: checkOut,
      });
      const reservation = res?.data ?? res;
      toast.success('Réservation créée — passez au paiement.');
      navigate(`/mon-espace/paiement/${reservation.id}`);
    } catch (err) {
      if (err.response?.status !== 422) toast.error(err.response?.data?.message || 'Création impossible.');
    } finally { setSubmitting(false); }
  };

  if (loadingRoom) return <LoadingSpinner label="Chargement…" />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Nouvelle réservation</h1>

      {!room ? (
        <p className="text-gray-600">Aucune chambre sélectionnée. Choisissez une chambre depuis la liste.</p>
      ) : (
        <form onSubmit={submit} className="card card-pad space-y-5">

          {/* ── Galerie d'images ── */}
          <RoomGallery images={room.images?.length ? room.images : room.photo_url} />

          {/* ── Infos chambre ── */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500">Chambre N° {room.room_number}</p>
              <p className="font-semibold capitalize text-lg">{room.room_type}</p>
              <p className="text-sm text-brand-600 font-medium">{formatXOF(room.price_per_night)} / nuit</p>
              {room.description && (
                <p className="text-sm text-gray-500 mt-1">{room.description}</p>
              )}
            </div>

            {/* Équipements */}
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

          {/* ── Dates ── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date d'arrivée</label>
              <input
                type="date" className="input" required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <label className="label">Date de départ</label>
              <input
                type="date" className="input" required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          {/* ── Récapitulatif ── */}
          <div className="rounded-lg bg-brand-50 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-brand-700">Total estimé</p>
              <p className="text-xl font-bold text-brand-700 flex items-center gap-2">
                <CalendarRange className="h-5 w-5" /> {nights} nuit(s) — {formatXOF(total)}
              </p>
            </div>
          </div>

          <button
            type="submit" className="btn-primary w-full"
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
