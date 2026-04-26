import { Link } from 'react-router-dom';
import { BedDouble, Users, LogIn, ShieldCheck } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatXOF } from '../../utils/formatCurrency';
import { useAuth } from '../../hooks/useAuth';

const ROOM_TYPE_LABEL = {
  simple: 'Simple',
  double: 'Double',
  suite: 'Suite',
  familiale: 'Familiale',
};

const AMENITY_ICONS = {
  wifi: '\uD83D\uDCF6',
  climatisation: '\u2744\uFE0F',
  tv: '\uD83D\uDCFA',
  minibar: '\uD83C\uDF79',
};

export default function RoomCard({ room }) {
  const { isAuthenticated, isClient, isAdmin, isOwner } = useAuth();

  // FIX: utiliser room.images[] en priorité, puis room.photo_url, puis fallback Unsplash
  const primaryImage =
    room.images?.find((i) => i.is_primary) ??
    room.images?.[0] ??
    null;
  const photo =
    primaryImage?.url ??
    room.photo_url ??
    `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=60&room=${room.id}`;

  const available = room.status === 'available';
  let cta = null;

  if (available) {
    if (isClient) {
      cta = <Link to={`/mon-espace/reservations/new?roomId=${room.id}`} className="btn-primary">Réserver</Link>;
    } else if (isAdmin || isOwner) {
      cta = (
        <span
          title="Les administrateurs et propriétaires ne peuvent pas réserver depuis le site public."
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Réservé aux clients
        </span>
      );
    } else if (!isAuthenticated) {
      cta = (
        <Link
          to={`/login?redirect=${encodeURIComponent(`/mon-espace/reservations/new?roomId=${room.id}`)}`}
          className="btn-primary"
        >
          <LogIn className="h-4 w-4" /> Se connecter pour réserver
        </Link>
      );
    }
  }

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Image de la chambre */}
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
        <img
          src={photo}
          alt={`Chambre ${room.room_number}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=60&room=${room.id}`;
          }}
        />
        {/* Badge nombre d'images si plusieurs */}
        {room.images && room.images.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {room.images.length} photos
          </span>
        )}
      </div>

      <div className="card-pad flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">N° {room.room_number}</p>
            <h3 className="font-semibold text-gray-900">{ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}</h3>
          </div>
          <StatusBadge status={room.status} />
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {room.capacity} pers.</span>
          <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}</span>
        </div>

        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{room.description || 'Chambre confortable et moderne.'}</p>

        {/* Équipements */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {room.amenities.map((a) => (
              <span key={a} className="text-sm" title={a}>{AMENITY_ICONS[a] ?? a}</span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-brand-600">{formatXOF(room.price_per_night)}</span>
            <span className="text-xs text-gray-500"> / nuit</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/rooms/${room.id}`} className="btn-secondary">Détails</Link>
            {cta}
          </div>
        </div>
      </div>
    </div>
  );
}
