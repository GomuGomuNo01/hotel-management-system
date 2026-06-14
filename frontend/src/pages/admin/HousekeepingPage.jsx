import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, BedDouble, Loader2, Check, Brush, Ban, RotateCcw,
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

/* Présentation de chaque état ménage. */
const HK = {
  clean:          { label: 'Propre',       chip: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  dirty:          { label: 'À nettoyer',   chip: 'bg-amber-100 text-amber-800 border-amber-300',       dot: 'bg-amber-500' },
  in_progress:    { label: 'En cours',     chip: 'bg-blue-100 text-blue-800 border-blue-300',          dot: 'bg-blue-500' },
  out_of_service: { label: 'Hors service', chip: 'bg-slate-200 text-slate-700 border-slate-300',       dot: 'bg-slate-500' },
};
const ORDER = ['dirty', 'in_progress', 'clean', 'out_of_service'];

/* Transitions proposées selon l'état courant. */
const ACTIONS = {
  dirty:          [['in_progress', 'Commencer', Brush], ['clean', 'Marquer propre', Check]],
  in_progress:    [['clean', 'Marquer propre', Check]],
  clean:          [['dirty', 'À nettoyer', RotateCcw], ['out_of_service', 'Hors service', Ban]],
  out_of_service: [['clean', 'Remettre en service', Check]],
};

export default function HousekeepingPage() {
  const [rooms, setRooms]     = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [busyId, setBusyId]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await adminApi.housekeeping.list(filter ? { housekeeping_status: filter } : {});
      const data = res?.data ?? res;
      setRooms(data.rooms ?? []);
      setSummary(data.summary ?? {});
    } catch {
      toast.error("Impossible de charger l'état ménage.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setStatus = async (room, next) => {
    setBusyId(room.id);
    try {
      await adminApi.housekeeping.update(room.id, { housekeeping_status: next });
      toast.success(`Chambre ${room.room_number} · ${HK[next].label}`);
      await fetchData();
    } catch {
      toast.error('Mise à jour impossible.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Housekeeping</h1>
          <p className="text-sm text-slate-500">État ménage des chambres</p>
        </div>
      </div>

      {/* Compteurs cliquables = filtres */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ORDER.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(active ? '' : key)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                active ? 'border-brand-400 ring-2 ring-brand-100 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', HK[key].dot)} />
                <span className="text-xs font-medium text-slate-500">{HK[key].label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary[key] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {filter && (
        <button onClick={() => setFilter('')} className="text-sm text-brand-600 font-medium">
          ← Voir toutes les chambres
        </button>
      )}

      {/* Liste des chambres */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <BedDouble className="h-8 w-8 mx-auto text-slate-300" />
            <p className="mt-2">Aucune chambre dans cet état.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((room) => {
              const cfg = HK[room.housekeeping_status] ?? HK.clean;
              return (
                <div key={room.id} className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-bold text-slate-900">Chambre {room.room_number}</p>
                      <p className="text-xs text-slate-400 capitalize">{room.room_type}</p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border', cfg.chip)}>
                      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                      {room.housekeeping_label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(ACTIONS[room.housekeeping_status] ?? []).map(([next, label, Icon]) => (
                      <button
                        key={next}
                        onClick={() => setStatus(room, next)}
                        disabled={busyId === room.id}
                        className="btn-secondary text-xs !py-1.5 disabled:opacity-50"
                      >
                        {busyId === room.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
