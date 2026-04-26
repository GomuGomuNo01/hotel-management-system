import { Link } from 'react-router-dom';
import { BedDouble, Users, LogIn, ShieldCheck, Wifi, Wind, Tv } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatXOF } from '../../utils/formatCurrency';
import { useAuth } from '../../hooks/useAuth';

const ROOM_TYPE_LABEL = {
  simple:    'Simple',
  double:    'Double',
  suite:     'Suite',
  familiale: 'Familiale',
};

const TYPE_BADGE = {
  simple:    'bg-sky-50 text-sky-700 border-sky-200',
  double:    'bg-violet-50 text-violet-700 border-violet-200',
  suite:     'bg-amber-50 text-amber-700 border-amber-200',
  familiale: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function RoomCard({ room }) {
  const { isAuthenticated, isClient, isAdmin, isOwner } = useAuth();
  const photo = room.photo_url
    || `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=60&sig=${room.id}`;
  const available = room.status === 'available';

  let cta = null;
  if (available) {
    if (isClient) {
      cta = (
        <Link
          to={`/mon-espace/reservations/new?roomId=${room.id}`}
          className="btn-primary"
        >
          Réserver
        </Link>
      );
    } else if (isAdmin || isOwner) {
      cta = (
        <span
          title="Les administrateurs ne peuvent pas réserver depuis le site public."
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
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
          <LogIn className="h-4 w-4" /> Réserver
        </Link>
      );
    }
  }

  return (
    <div className="card overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-200">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={photo}
          alt={`Chambre ${room.room_number}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Badge type */}
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm bg-white/90 ${TYPE_BADGE[room.room_type] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}
        </span>
      </div>

      {/* Contenu */}
      <div className="card-pad flex-1 flex flex-col gap-3">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Chambre N°</p>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">
              {room.room_number}
            </h3>
          </div>
          <StatusBadge status={room.status} />
        </div>

        {/* Infos rapides */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> {room.capacity} pers.
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="h-4 w-4" /> {ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}
          </span>
        </div>

        {/* Équipements (si disponibles) */}
        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.amenities.slice(0, 3).map((a) => (
              <span key={a} className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {a}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
                +{room.amenities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {room.description || 'Chambre confortable et moderne, idéale pour votre séjour.'}
        </p>

        {/* Prix et actions */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
              {formatXOF(room.price_per_night)}
            </span>
            <span className="text-xs text-gray-400 ml-1">/ nuit</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/rooms/${room.id}`} className="btn-secondary text-xs">
              Détails
            </Link>
            {cta}
          </div>
        </div>
      </div>
    </div>
  );
}
