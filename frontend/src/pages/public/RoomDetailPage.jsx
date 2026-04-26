import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Users, BedDouble } from 'lucide-react';
import { roomsApi } from '../../api/rooms.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import { formatXOF } from '../../utils/formatCurrency';
import { useAuth } from '../../hooks/useAuth';

export default function RoomDetailPage() {
  const { id } = useParams();
  const { isClient, isAuthenticated } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await roomsApi.get(id);
      setRoom(res?.data ?? res);
    } catch (e) {
      setError(e.response?.data?.message || 'Chambre introuvable.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <LoadingSpinner label="Chargement…" />;
  if (error) return <div className="max-w-3xl mx-auto p-6"><ErrorMessage message={error} onRetry={load} /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/rooms" className="text-sm text-brand-600 inline-flex items-center gap-1 mb-4">
        <ChevronLeft className="h-4 w-4" /> Retour aux chambres
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="aspect-[4/3] rounded-xl bg-gray-100 overflow-hidden">
          <img src={room.photo_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=70'} alt="" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Chambre N° {room.room_number}</p>
          <h1 className="text-3xl font-bold capitalize">{room.room_type}</h1>
          <div className="mt-2"><StatusBadge status={room.status} /></div>

          <div className="mt-4 flex items-center gap-4 text-gray-700">
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {room.capacity} pers.</span>
            <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {room.room_type}</span>
          </div>

          <p className="mt-4 text-gray-600">{room.description || 'Chambre confortable, idéale pour un séjour reposant.'}</p>

          {Array.isArray(room.amenities) && room.amenities.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-700">
              {room.amenities.map((a, i) => <li key={i}>• {a}</li>)}
            </ul>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-brand-600">{formatXOF(room.price_per_night)}</span>
              <span className="text-sm text-gray-500"> / nuit</span>
            </div>
            {room.status !== 'available' ? (
              <span className="text-sm text-gray-500">Indisponible</span>
            ) : isClient ? (
              <Link to={`/mon-espace/reservations/new?roomId=${room.id}`} className="btn-primary">Réserver</Link>
            ) : !isAuthenticated ? (
              <Link
                to={`/login?redirect=${encodeURIComponent(`/mon-espace/reservations/new?roomId=${room.id}`)}`}
                className="btn-primary"
              >
                Se connecter pour réserver
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
