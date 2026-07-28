/**
 * OwnerRoomsPage — /owner/rooms
 * Vue owner : liste des chambres (lecture seule) avec filtres statut/type.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  BedDouble, Filter, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CheckCircle2, Clock, Wrench,
} from 'lucide-react';
import { ownerApi }    from '../../api/owner.api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import LoadingSpinner  from '../../components/common/LoadingSpinner';
import ErrorMessage    from '../../components/common/ErrorMessage';
import EmptyState      from '../../components/common/EmptyState';
import { formatXOF }   from '../../utils/formatCurrency';

const STATUS_OPTIONS = [
  { value: '',            label: 'Tous les statuts' },
  { value: 'available',   label: 'Disponibles' },
  { value: 'occupied',    label: 'Occupées' },
  { value: 'maintenance', label: 'Maintenance' },
];

const TYPE_OPTIONS = [
  { value: '',          label: 'Tous les types' },
  { value: 'simple',    label: 'Simple' },
  { value: 'double',    label: 'Double' },
  { value: 'suite',     label: 'Suite' },
  { value: 'deluxe',    label: 'Deluxe' },
];

const STATUS_CFG = {
  available:   { label: 'Disponible', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  occupied:    { label: 'Occupée',    icon: Clock,        cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  maintenance: { label: 'Maintenance', icon: Wrench,      cls: 'bg-amber-100 text-amber-800 border-amber-200' },
};

function RoomStatusBadge({ status }) {
  const cfg  = STATUS_CFG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

/* ── Carte chambre ───────────────────────────────────────────── */
function RoomCard({ room }) {
  const photo = room.photo_url ?? room.images?.[0]?.url ?? null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Bande colorée top */}
      <div className={`h-1 w-full ${room.status === 'available' ? 'bg-emerald-400' : room.status === 'occupied' ? 'bg-blue-400' : 'bg-amber-400'}`} />

      {/* Photo */}
      {photo ? (
        <img
          src={photo}
          alt={`Chambre ${room.room_number}`}
          className="w-full h-40 object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
          <BedDouble className="h-10 w-10 text-slate-300" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-slate-900 text-lg">Chambre {room.room_number}</p>
            <p className="text-sm text-slate-500 capitalize">{room.room_type}</p>
          </div>
          <RoomStatusBadge status={room.status} />
        </div>

        {/* Prix + capacité */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-amber-600">{formatXOF(room.price_per_night)}<span className="text-slate-400 font-normal">/nuit</span></span>
          <span className="text-slate-500">{room.capacity} pers. max</span>
        </div>

        {/* Stats réservations */}
        <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-xs text-slate-500">
          <span>{room.reservations_count ?? 0} réservation{room.reservations_count !== 1 ? 's' : ''} au total</span>
          {(room.active_reservations_count ?? 0) > 0 && (
            <span className="text-blue-600 font-semibold">{room.active_reservations_count} active{room.active_reservations_count !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────── */
export default function OwnerRoomsPage() {
  const [rooms, setRooms]                   = useState([]);
  const [meta, setMeta]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [statusFilter, setStatusFilter]     = useState('');
  const [typeFilter, setTypeFilter]         = useState('');
  const [page, setPage]                     = useState(1);

  const fetchRooms = useCallback(async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const res = await ownerApi.rooms.list({
        status:    statusFilter || undefined,
        room_type: typeFilter   || undefined,
        page,
        per_page:  20,
      });
      setRooms(res?.data ?? []);
      setMeta(res?.meta ?? null);
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || 'Impossible de charger les chambres.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, typeFilter, page]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Synchro temps réel : statuts de chambre (maintenance, ménage) et
  // réservations impactent directement cette vue.
  useAutoRefresh(
    ['room.updated', 'room.deleted', 'reservation.created', 'reservation.cancelled', 'checkin.done', 'checkout.done'],
    () => fetchRooms({ silent: true }),
  );

  const hasFilters = statusFilter || typeFilter;

  return (
    <div className="space-y-6 p-6 max-w-screen-xl mx-auto">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <BedDouble className="h-7 w-7 text-amber-500" />
          Chambres
        </h1>
        {meta && (
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-800">{meta.total}</span>{' '}
            chambre{meta.total !== 1 ? 's' : ''} au total
          </p>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-slate-400" />

        {/* Statut */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                statusFilter === s.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

        {/* Type */}
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setTypeFilter(t.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                typeFilter === t.value
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1); }}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" /> Tout effacer
          </button>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <LoadingSpinner label="Chargement des chambres…" />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchRooms} />
      ) : rooms.length === 0 ? (
        <EmptyState message="Aucune chambre trouvée." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between px-1 pt-2">
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-700">{meta.current_page}</span> sur{' '}
                <span className="font-semibold text-slate-700">{meta.last_page}</span>
                <span className="ml-2 text-slate-400">· {meta.total} chambre{meta.total !== 1 ? 's' : ''}</span>
              </span>
              <div className="flex items-center gap-1">
                <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1}              onClick={() => setPage(1)}                 title="Première page"><ChevronsLeft  className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1}              onClick={() => setPage((p) => p - 1)}      title="Page précédente"><ChevronLeft className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}      title="Page suivante"><ChevronRight  className="h-4 w-4" /></button>
                <button className="btn-ghost h-8 w-8 p-0" disabled={page >= meta.last_page} onClick={() => setPage(meta.last_page)}    title="Dernière page"><ChevronsRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
