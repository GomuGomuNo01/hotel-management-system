import { Link } from 'react-router-dom';
import { BedDouble, Users, LogIn, ShieldCheck } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatXOF } from '../../utils/formatCurrency';
import { useAuth } from '../../hooks/useAuth';

const ROOM_TYPE_LABEL = {
  simple:    'Simple',
  double:    'Double',
  suite:     'Suite',
  familiale: 'Familiale',
};

const ROOM_TYPE_COLOR = {
  simple:    'bg-slate-100 text-slate-700',
  double:    'bg-blue-100 text-blue-700',
  suite:     'bg-violet-100 text-violet-700',
  familiale: 'bg-emerald-100 text-emerald-700',
};

const AMENITY_LABELS = {
  wifi:          'Wi-Fi',
  climatisation: 'Clim.',
  tv:            'TV',
  minibar:       'Minibar',
};

export default function RoomCard({ room }) {
  const { isAuthenticated, isClient, isAdmin, isOwner } = useAuth();

  const primaryImage = room.images?.find((i) => i.is_primary) ?? room.images?.[0] ?? null;
  const photo = primaryImage?.url ?? room.photo_url ?? `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=60&room=${room.id}`;

  const available = room.status === 'available';
  const typeLabel = ROOM_TYPE_LABEL[room.room_type] ?? room.room_type;
  const typeBadge = ROOM_TYPE_COLOR[room.room_type] ?? 'bg-slate-100 text-slate-700';

  let cta = null;
  if (available) {
    if (isClient) {
      cta = (
        <Link to={`/mon-espace/reservations/new?roomId=${room.id}`} className="btn-primary text-sm">
          Reserver
        </Link>
      );
    } else if (isAdmin || isOwner) {
      cta = (
        <span
          title="Les administrateurs ne peuvent pas reserver depuis le site public."
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Reserve aux clients
        </span>
      );
    } else if (!isAuthenticated) {
      cta = (
        <Link
          to={`/login?redirect=${encodeURIComponent(`/mon-espace/reservations/new?roomId=${room.id}`)}`}
          className="btn-primary text-sm"
        >
          <LogIn className="h-4 w-4" /> Reserver
        </Link>
      );
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-slate-300 transition-all duration-200">

      {/* Image de la chambre */}
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
        <img
          src={photo}
          alt={`${typeLabel} - Chambre ${room.room_number}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=60&room=${room.id}`;
          }}
        />
        {/* Badge statut - toujours visible */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={room.status} />
        </div>
        {/* Badge nb photos */}
        {room.images && room.images.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/65 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {room.images.length} photos
          </span>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">

        {/* Titre : type en premier, numero en second */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-950 leading-tight">
              {typeLabel}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Chambre n&deg;{room.room_number}</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${typeBadge}`}>
            {typeLabel}
          </span>
        </div>

        {/* Capacite */}
        <div className="flex items-center gap-3 text-sm font-medium text-slate-700 mb-3">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-500" />
            {room.capacity} personne{room.capacity > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="h-4 w-4 text-slate-500" />
            {typeLabel}
          </span>
        </div>

        {/* Description */}
        {room.description && (
          <p className="text-sm text-slate-700 line-clamp-2 mb-3 leading-relaxed">
            {room.description}
          </p>
        )}

        {/* Equipements - lisibles */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {room.amenities.map((a) => (
              <span
                key={a}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
              >
                {AMENITY_LABELS[a] ?? a}
              </span>
            ))}
          </div>
        )}

        {/* Prix + CTAs - toujours en bas */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            <span className="text-2xl font-extrabold text-brand-600 tabular-nums">
              {formatXOF(room.price_per_night)}
            </span>
            <span className="text-xs font-semibold text-slate-500 ml-1">/nuit</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/rooms/${room.id}`} className="btn-secondary text-xs">
              Details
            </Link>
            {cta}
          </div>
        </div>
      </div>
    </div>
  );
}
