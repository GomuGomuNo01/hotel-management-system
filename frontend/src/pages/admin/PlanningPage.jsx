import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarRange, ChevronLeft, ChevronRight, Loader2, AlertTriangle,
  X, BedDouble, Moon, CalendarDays,
} from 'lucide-react';
import {
  addDays, differenceInCalendarDays, format, isToday, isWeekend, parseISO, startOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { adminApi } from '../../api/admin.api';
import { getStatusConfig } from '../../utils/getStatusColor';
import { formatDate } from '../../utils/formatDate';
import { assignLanes, findConflicts, barGeometry } from '../../utils/planning';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const WINDOW_SIZES = [7, 14, 30];

export default function PlanningPage() {
  const [from, setFrom]       = useState(() => startOfDay(new Date()));
  const [days, setDays]       = useState(14);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchPlanning = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await adminApi.planning({ from: format(from, 'yyyy-MM-dd'), days });
      setData(res?.data ?? res);
    } catch (e) {
      setError(true);
      toast.error("Impossible de charger le planning.");
    } finally {
      setLoading(false);
    }
  }, [from, days]);

  useEffect(() => { fetchPlanning(); }, [fetchPlanning]);

  const dayList = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(from, i)),
    [from, days]
  );

  const rooms = data?.rooms ?? [];

  // Ensemble des réservations en conflit (chevauchement actif sur une même chambre).
  const conflictIds = useMemo(() => findConflicts(rooms), [rooms]);

  const goToday = () => setFrom(startOfDay(new Date()));
  const shift   = (dir) => setFrom((f) => addDays(f, dir * days));

  const rangeLabel = `${format(from, 'd MMM', { locale: fr })} – ${format(addDays(from, days - 1), 'd MMM yyyy', { locale: fr })}`;

  return (
    <div className="space-y-5">
      {/* En-tête + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-brand-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Planning d'occupation</h1>
            <p className="text-sm text-slate-500">{rangeLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            {WINDOW_SIZES.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  days === d ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {d} j
              </button>
            ))}
          </div>

          <button onClick={() => shift(-1)} className="btn-secondary !px-2" aria-label="Période précédente">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="btn-secondary">Aujourd'hui</button>
          <button onClick={() => shift(1)} className="btn-secondary !px-2" aria-label="Période suivante">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Légende + alerte conflits */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {['pending', 'confirmed', 'checked_in', 'checked_out'].map((s) => {
          const cfg = getStatusConfig(s);
          return (
            <span key={s} className="inline-flex items-center gap-1.5 text-slate-600">
              <span className={cn('h-3 w-4 rounded', cfg.color)} />
              {cfg.label}
            </span>
          );
        })}
        {conflictIds.size > 0 && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            {conflictIds.size} réservation(s) en conflit d'occupation
          </span>
        )}
      </div>

      {/* Grille calendrier */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-slate-500">
            <p>Le planning n'a pas pu être chargé.</p>
            <button onClick={fetchPlanning} className="btn-secondary mt-3">Réessayer</button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <BedDouble className="h-8 w-8 mx-auto text-slate-300" />
            <p className="mt-2">Aucune chambre à afficher.</p>
          </div>
        ) : (
          <div className="min-w-[760px]">
            {/* En-tête des jours */}
            <div className="flex border-b border-slate-200">
              <div className="w-28 shrink-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Chambre
              </div>
              <div className="flex-1 flex">
                {dayList.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 text-center py-2 border-l border-slate-100',
                      isWeekend(d) && 'bg-slate-50',
                      isToday(d) && 'bg-brand-50'
                    )}
                  >
                    <div className={cn('text-[10px] uppercase', isToday(d) ? 'text-brand-600 font-bold' : 'text-slate-400')}>
                      {format(d, 'EEE', { locale: fr })}
                    </div>
                    <div className={cn('text-xs font-semibold', isToday(d) ? 'text-brand-700' : 'text-slate-600')}>
                      {format(d, 'd')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lignes chambres */}
            {rooms.map((room) => {
              const laned    = assignLanes(room.reservations);
              const laneCount = Math.max(1, ...laned.map((r) => r.lane + 1));
              const rowHeight = laneCount * 30 + 8;

              return (
                <div key={room.id} className="flex border-b border-slate-100 last:border-0">
                  {/* Libellé chambre */}
                  <div className="w-28 shrink-0 px-3 py-2 flex flex-col justify-center">
                    <span className="text-sm font-semibold text-slate-800">{room.room_number}</span>
                    <span className="text-[11px] text-slate-400 capitalize">{room.room_type}</span>
                  </div>

                  {/* Piste avec barres */}
                  <div className="flex-1 relative" style={{ height: rowHeight }}>
                    {/* Lignes de grille des jours */}
                    <div className="absolute inset-0 flex">
                      {dayList.map((d, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex-1 border-l border-slate-100',
                            isWeekend(d) && 'bg-slate-50/60',
                            isToday(d) && 'bg-brand-50/50'
                          )}
                        />
                      ))}
                    </div>

                    {/* Barres de réservation */}
                    {laned.map((r) => {
                      const { startIdx, span } = barGeometry(r, from, days);
                      if (span <= 0) return null;

                      const cfg        = getStatusConfig(r.status);
                      const isConflict = conflictIds.has(r.id);

                      return (
                        <button
                          key={r.id}
                          onClick={() => setSelected({ ...r, room })}
                          title={`${r.client_name} — ${formatDate(r.check_in_date)} → ${formatDate(r.check_out_date)}`}
                          className={cn(
                            'absolute h-[26px] rounded-md border px-2 text-[11px] font-medium truncate flex items-center transition-shadow hover:shadow-md',
                            cfg.color,
                            isConflict && 'ring-2 ring-red-500 ring-offset-1'
                          )}
                          style={{
                            left:  `calc(${(startIdx / days) * 100}% + 2px)`,
                            width: `calc(${(span / days) * 100}% - 4px)`,
                            top:   r.lane * 30 + 4,
                          }}
                        >
                          {isConflict && <AlertTriangle className="h-3 w-3 mr-1 shrink-0 text-red-600" />}
                          <span className="truncate">{r.client_name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Détail réservation */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Réservation #{selected.id}
                </p>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selected.client_name}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {conflictIds.has(selected.id) && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Conflit d'occupation sur cette chambre
              </div>
            )}

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <BedDouble className="h-4 w-4 text-slate-400" />
                Chambre {selected.room.room_number}
                <span className="text-slate-400 capitalize">· {selected.room.room_type}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {formatDate(selected.check_in_date)} → {formatDate(selected.check_out_date)}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Moon className="h-4 w-4 text-slate-400" />
                {differenceInCalendarDays(parseISO(selected.check_out_date), parseISO(selected.check_in_date))} nuit(s)
              </div>
              <div>
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', getStatusConfig(selected.status).color)}>
                  {getStatusConfig(selected.status).label}
                </span>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
