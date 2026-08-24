import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, BedDouble, Loader2, Check, Brush, Ban, RotateCcw, AlertTriangle, CalendarClock,
  BedSingle, Clock, User,
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { cn } from '../../utils/cn';
import toast from '../../lib/toast';

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
  const [rooms, setRooms]         = useState([]);
  const [summary, setSummary]     = useState({});
  const [stayovers, setStayovers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('');
  const [busyId, setBusyId]       = useState(null);
  const [taskBusyId, setTaskBusyId] = useState(null);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res  = await adminApi.housekeeping.list(filter ? { housekeeping_status: filter } : {});
      const data = res?.data ?? res;
      setRooms(data.rooms ?? []);
      setSummary(data.summary ?? {});
      setStayovers(data.stayovers ?? []);
    } catch {
      toast.error("Impossible de charger l'état ménage.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Synchro temps réel : reflète immédiatement les changements faits depuis la
  // section Chambres (maintenance ⇄ hors service), les check-in/out et la
  // planification/traitement des recouches.
  useAutoRefresh(
    ['room.updated', 'room.deleted', 'checkin.done', 'checkout.done', 'housekeeping.task'],
    () => fetchData({ silent: true }),
  );

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

  const runTaskAction = async (task, action, successMsg) => {
    setTaskBusyId(task.id);
    try {
      await adminApi.housekeeping[action](task.id);
      toast.success(successMsg);
      await fetchData({ silent: true });
    } catch {
      toast.error('Action impossible.');
    } finally {
      setTaskBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-brand-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ménage</h1>
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

      {/* Recouches du jour (ménage en cours de séjour) */}
      {stayovers.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BedSingle className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Recouches du jour</h2>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-500 text-white text-[10px] font-black">
              {stayovers.length}
            </span>
            <span className="text-xs text-slate-500">· ménage des séjours en cours</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stayovers.map((task) => {
              const busy = taskBusyId === task.id;
              return (
                <div key={task.id} className="rounded-xl border border-indigo-200 bg-white p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-bold text-slate-900">Chambre {task.room_number}</p>
                      <p className="text-xs text-slate-400 capitalize">{task.room_type}</p>
                    </div>
                    {task.status === 'in_progress' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-100 text-blue-800 border-blue-300">
                        <Clock className="h-3 w-3" /> En cours
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-indigo-100 text-indigo-800 border-indigo-300">
                        <BedSingle className="h-3 w-3" /> À faire
                      </span>
                    )}
                  </div>

                  {task.guest_name && (
                    <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <User className="h-3.5 w-3.5 text-slate-400" /> {task.guest_name}
                    </p>
                  )}

                  {task.deferred_count > 0 && (
                    <p className="text-[11px] text-amber-600 font-medium">
                      Reportée {task.deferred_count}× (client présent)
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-1">
                    {task.status !== 'in_progress' && (
                      <button
                        onClick={() => runTaskAction(task, 'startTask', `Recouche démarrée · chambre ${task.room_number}`)}
                        disabled={busy}
                        className="btn-secondary text-xs !py-1.5 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brush className="h-3.5 w-3.5" />}
                        Commencer
                      </button>
                    )}
                    <button
                      onClick={() => runTaskAction(task, 'completeTask', `Recouche terminée · chambre ${task.room_number}`)}
                      disabled={busy}
                      className="btn-secondary text-xs !py-1.5 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Fait
                    </button>
                    <button
                      onClick={() => runTaskAction(task, 'deferTask', `Recouche reportée · chambre ${task.room_number}`)}
                      disabled={busy}
                      className="btn-secondary text-xs !py-1.5 disabled:opacity-50"
                      title="Client présent / Ne pas déranger — reporter au lendemain"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
                      Reporter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
            {[...rooms].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0)).map((room) => {
              const cfg = HK[room.housekeeping_status] ?? HK.clean;
              return (
                <div
                  key={room.id}
                  className={cn(
                    'rounded-xl border p-4 flex flex-col gap-3',
                    room.priority ? 'border-red-300 ring-1 ring-red-100 bg-red-50/30' : 'border-slate-200'
                  )}
                >
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

                  {room.priority ? (
                    <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                      <AlertTriangle className="h-3.5 w-3.5" /> Priorité · arrivée aujourd'hui
                    </span>
                  ) : room.arrival_today ? (
                    <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CalendarClock className="h-3.5 w-3.5" /> Prête · arrivée aujourd'hui
                    </span>
                  ) : null}

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
