/**
 * ReviewCard — carte d'avis client, partagée par les écrans admin et owner.
 * Design épuré : fine barre d'accent selon la note, avatar plat, étoiles + note,
 * commentaire, et pied discret (chambre + dates du séjour).
 */
import { Star, BedDouble, Calendar, User } from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];

/** Barre d'accent (haut de carte) selon le sentiment de la note. */
const accentFor = (r) => (r >= 4 ? 'bg-emerald-400' : r === 3 ? 'bg-amber-400' : 'bg-rose-400');

function Avatar({ client }) {
  const base = 'h-11 w-11 shrink-0 rounded-full ring-1 ring-black/5';
  if (client?.profile_photo) {
    return (
      <img
        src={client.profile_photo}
        alt={client.full_name}
        className={`${base} object-cover`}
        loading="lazy"
        decoding="async"
      />
    );
  }
  const initials = client?.full_name
    ? client.full_name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : null;
  const color = AVATAR_COLORS[(client?.id ?? 0) % AVATAR_COLORS.length];
  return (
    <div className={`${base} ${color} flex items-center justify-center text-sm font-semibold`}>
      {initials ?? <User className="h-4 w-4" />}
    </div>
  );
}

function Stars({ value }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
        />
      ))}
    </span>
  );
}

export default function ReviewCard({ review }) {
  const { client, room, reservation, rating, comment, created_at } = review;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`h-1 ${accentFor(rating)}`} />

      <div className="p-5">
        <header className="flex items-center gap-3">
          <Avatar client={client} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">
              {client?.full_name ?? <span className="font-normal italic text-slate-400">Client supprimé</span>}
            </p>
            <p className="text-xs text-slate-400">{created_at ? formatDate(created_at) : '—'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Stars value={rating} />
            <span className="text-sm font-semibold text-slate-600">
              {Number(rating).toFixed(1).replace('.', ',')}
            </span>
          </div>
        </header>

        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          {comment || <span className="italic text-slate-400">Aucun commentaire laissé.</span>}
        </p>
      </div>

      <footer className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
        {room && (
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" />
            Ch. {room.room_number}
            {room.room_type && <span> · {room.room_type}</span>}
          </span>
        )}
        {reservation?.check_in_date && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(reservation.check_in_date)}
            {reservation.check_out_date && ` → ${formatDate(reservation.check_out_date)}`}
          </span>
        )}
      </footer>
    </article>
  );
}
