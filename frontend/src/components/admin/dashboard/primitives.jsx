import { Link } from 'react-router-dom';
import {
  Inbox, AlertTriangle, Loader2, ArrowRight,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { formatXOF } from '../../../utils/formatCurrency';

/**
 * Primitives présentationnelles du tableau de bord admin, extraites de
 * AdminDashboardPage pour dégonfler le monolithe (1044 l.) et rendre ces
 * briques réutilisables/testables. Composants purs, pilotés par props.
 */

/* ─── Carte statistique KPI ─────────────────────────────────────── */
const STAT_C = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700', bar: 'bg-emerald-400' },
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    val: 'text-blue-700',    bar: 'bg-blue-400'    },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  val: 'text-violet-700',  bar: 'bg-violet-400'  },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  val: 'text-indigo-700',  bar: 'bg-indigo-400'  },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700',   bar: 'bg-amber-400'   },
  orange:  { bg: 'bg-orange-50',  icon: 'text-orange-600',  val: 'text-orange-700',  bar: 'bg-orange-400'  },
  red:     { bg: 'bg-red-50',     icon: 'text-red-600',     val: 'text-red-700',     bar: 'bg-red-400'     },
  slate:   { bg: 'bg-slate-100',  icon: 'text-slate-600',   val: 'text-slate-700',   bar: 'bg-slate-300'   },
};

export function StatCard({ value, label, sublabel, icon: Icon, color = 'slate', to }) {
  const C = STAT_C[color] ?? STAT_C.slate;
  const inner = (
    <div className={`relative bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm transition-all duration-200 h-full min-h-[130px] ${
      to ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300' : ''
    }`}>
      {/* Bande colorée en haut */}
      <div className={`h-1 w-full ${C.bar}`} />
      {/* Corps */}
      <div className="p-4 flex flex-col gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${C.bg}`}>
          <Icon className={`h-5 w-5 ${C.icon}`} />
        </div>
        <div>
          <p className={`text-2xl font-black tabular-nums leading-none ${C.val}`}>{value}</p>
          <p className="text-sm font-medium text-slate-600 mt-1.5 leading-snug">{label}</p>
          {sublabel && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}

/* ─── Barre visuelle d'occupation ───────────────────────────────── */
export function OccupancyBar({ available, occupied, maintenance }) {
  const total = available + occupied + maintenance;
  if (total === 0) return <p className="text-sm text-slate-400 text-center py-6">Aucune chambre enregistrée.</p>;
  const pct  = (n) => Math.max(1, Math.round((n / total) * 100));
  const rate = Math.round((occupied / total) * 100);

  const stats = [
    { count: occupied,    label: 'Occupée',         plural: 's', dot: 'bg-indigo-500',  val: 'text-indigo-600'  },
    { count: available,   label: 'Disponible',      plural: 's', dot: 'bg-emerald-400', val: 'text-emerald-600' },
    { count: maintenance, label: 'En maintenance',  plural: '',  dot: 'bg-orange-400',  val: 'text-orange-600'  },
  ];

  return (
    <div className="space-y-5">
      {/* Barre fine + taux au bout */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Répartition</p>
          <span className="text-xs font-bold text-slate-700">
            {rate}% occupé · {total} chambre{total !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 bg-slate-100">
          {occupied    > 0 && <div className="bg-indigo-500  rounded-full transition-all duration-500" style={{ width: `${pct(occupied)}%` }} />}
          {available   > 0 && <div className="bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct(available)}%` }} />}
          {maintenance > 0 && <div className="bg-orange-400  rounded-full transition-all duration-500" style={{ width: `${pct(maintenance)}%` }} />}
        </div>
      </div>

      {/* 3 tuiles compactes */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ count, label, plural, dot, val }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 py-3 px-2">
            <p className={`text-2xl font-black tabular-nums leading-none ${val}`}>{count}</p>
            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dot}`} />
              {label}{count !== 1 ? plural : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Carte de section (titre + contenu ou état vide) ───────────── */
export function SectionCard({ title, subtitle, icon: Icon, iconFg, iconBg, action, isEmpty, emptyMsg, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm ${iconBg}`}>
            <Icon className={`h-4.5 w-4.5 ${iconFg}`} strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2">
          <Inbox className="h-8 w-8" strokeWidth={1.5} />
          <p className="text-sm text-slate-400">{emptyMsg ?? "Aucun élément pour l'instant."}</p>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

/* ─── Ligne réservation avec bouton d'action ────────────────────── */
export function ReservationRow({ reservation: r, actionLabel, btnClass, onAction, loading }) {
  const blocked    = r.is_fully_paid === false;
  const clientName = r.client?.full_name
    || `${r.client?.last_name ?? ''} ${r.client?.first_name ?? ''}`.trim()
    || 'Client inconnu';
  const initials   = clientName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <li className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/80 transition-colors">
      {/* Avatar initiales */}
      <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {initials || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate leading-tight">{clientName}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          Ch. {r.room?.room_number ?? '-'}
          {r.room?.room_type ? ` · ${r.room.room_type}` : ''}
        </p>
        {blocked && (
          <p className="text-xs font-semibold text-amber-600 mt-0.5 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" /> Solde : {formatXOF(r.remaining_amount)}
          </p>
        )}
      </div>
      <button
        onClick={onAction}
        disabled={loading || blocked}
        title={blocked ? "Encaissez d'abord le solde avant d'enregistrer." : undefined}
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${btnClass}`}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : actionLabel}
      </button>
    </li>
  );
}

/* ─── Titre de section avec lien optionnel ──────────────────────── */
export function SectionTitle({ children, to, linkLabel = 'Voir tout' }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
        <span className="h-3 w-0.5 rounded-full bg-brand-400 inline-block" />
        {children}
      </h2>
      {to && (
        <Link to={to} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
          {linkLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ─── Barre de pagination réutilisable ──────────────────────────── */
export function PaginationBar({ page, lastPage, total, itemLabel = 'éléments', setPage }) {
  if (lastPage <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
      <span className="text-xs text-slate-500">
        Page <span className="font-semibold">{page}</span> sur{' '}
        <span className="font-semibold">{lastPage}</span>
        <span className="ml-2 text-slate-400">· {total} {itemLabel}</span>
      </span>
      <div className="flex items-center gap-1">
        <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(1)} title="Première page">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} title="Page précédente">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="btn-ghost h-8 w-8 p-0" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} title="Page suivante">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className="btn-ghost h-8 w-8 p-0" disabled={page >= lastPage} onClick={() => setPage(lastPage)} title="Dernière page">
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
