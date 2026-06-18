import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LogIn as CheckInIcon, LogOut as CheckOutIcon, ArrowRight,
  Inbox, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import StatusBadge from '../../common/StatusBadge';
import { formatDate } from '../../../utils/formatDate';
import { formatXOF } from '../../../utils/formatCurrency';
import { SectionCard, ReservationRow, SectionTitle, PaginationBar } from './primitives';

/**
 * Sections et bandeaux partagés du tableau de bord admin, extraits de
 * AdminDashboardPage et réutilisés par les vues par rôle (Réceptionniste,
 * Comptable, Manager). Composants purs, pilotés par props.
 */

/* ─── En-tête de page (commun aux 3 vues) ───────────────────────── */
const ROLE_LABELS = {
  manager:      'Manager',
  receptionist: 'Réceptionniste',
  accountant:   'Comptable',
};
const ROLE_GRADIENT = {
  manager:      'from-violet-600 to-violet-500',
  receptionist: 'from-emerald-600 to-emerald-500',
  accountant:   'from-blue-600 to-blue-500',
};

export function PageHeader({ user }) {
  const now     = new Date();
  const hour    = now.getHours();
  const salut   = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const todayFr = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const role       = user?.role;
  const roleLabel  = ROLE_LABELS[role] ?? 'Administrateur';
  const gradient   = ROLE_GRADIENT[role] ?? 'from-slate-600 to-slate-500';
  const displayName = user?.last_name || user?.full_name?.split(' ')[0] || 'Admin';

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} px-6 py-5 text-white shadow-lg`}>
      {/* Bulles décoratives */}
      <div className="absolute right-4 -top-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute right-20 bottom-0 h-14 w-14 rounded-full bg-white/10" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-white/70 text-sm font-medium capitalize">{todayFr}</p>
          <h1 className="text-2xl md:text-3xl font-black mt-0.5 tracking-tight">
            {salut}, {displayName}
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
        </span>
      </div>
    </div>
  );
}

/* ─── Bloc Arrivées & Départs (réutilisé dans les 3 vues) ───────── */
export function CheckInOutSection({ checkIns, checkOuts, actioning, setConfirm }) {
  return (
    <section>
      <SectionTitle to="/admin/checkin-checkout" linkLabel="Voir tout">
        Arrivées &amp; Départs - Aujourd'hui
      </SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard
          title="Arrivées prévues"
          subtitle={`${checkIns.length} client${checkIns.length !== 1 ? 's' : ''} attendu${checkIns.length !== 1 ? 's' : ''}`}
          icon={CheckInIcon} iconFg="text-emerald-600" iconBg="bg-emerald-50"
          isEmpty={checkIns.length === 0}
          emptyMsg="Aucune arrivée prévue aujourd'hui."
          action={
            <Link to="/admin/checkin-checkout" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100">
            {checkIns.map((r) => (
              <ReservationRow key={r.id} reservation={r} actionLabel="Valider l'arrivée"
                btnClass="bg-emerald-500 hover:bg-emerald-600"
                onAction={() => setConfirm({ type: 'in', reservation: r })}
                loading={actioning === r.id} />
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Départs prévus"
          subtitle={`${checkOuts.length} client${checkOuts.length !== 1 ? 's' : ''} à libérer`}
          icon={CheckOutIcon} iconFg="text-violet-600" iconBg="bg-violet-50"
          isEmpty={checkOuts.length === 0}
          emptyMsg="Aucun départ prévu aujourd'hui."
          action={
            <Link to="/admin/checkin-checkout" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100">
            {checkOuts.map((r) => (
              <ReservationRow key={r.id} reservation={r} actionLabel="Valider le départ"
                btnClass="bg-violet-500 hover:bg-violet-600"
                onAction={() => setConfirm({ type: 'out', reservation: r })}
                loading={actioning === r.id} />
            ))}
          </ul>
        </SectionCard>

      </div>
    </section>
  );
}

/* ─── Réservations récentes avec pagination (réutilisé) ─────────── */
const RES_PER_PAGE = 6;

export function RecentReservationsSection({ recentRes }) {
  const [page, setPage] = useState(1);
  const total    = recentRes.length;
  const lastPage = Math.max(1, Math.ceil(total / RES_PER_PAGE));
  const safePage = Math.min(page, lastPage);
  const items    = recentRes.slice((safePage - 1) * RES_PER_PAGE, safePage * RES_PER_PAGE);

  return (
    <section>
      <SectionTitle to="/admin/reservations" linkLabel="Toutes les réservations">
        Réservations récentes
      </SectionTitle>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2">
            <Inbox className="h-8 w-8" strokeWidth={1.5} />
            <p className="text-sm text-slate-400">Aucune réservation enregistrée.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {items.map((r) => {
                const name = r.client?.full_name
                  || `${r.client?.last_name ?? ''} ${r.client?.first_name ?? ''}`.trim()
                  || 'Client inconnu';
                const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                return (
                  <li key={r.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/80 transition-colors">
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0 hidden sm:flex">
                      {initials || '?'}
                    </div>
                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate leading-tight">{name}</p>
                        <span className="font-mono text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100 flex-shrink-0 hidden md:inline">
                          #{String(r.id).padStart(4, '0')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        Ch. {r.room?.room_number ?? '-'} · {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
                      </p>
                    </div>
                    {/* Montant + statut */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="text-sm font-extrabold text-slate-800 tabular-nums hidden sm:inline">
                        {formatXOF(r.total_amount)}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <PaginationBar
              page={safePage} lastPage={lastPage} total={total}
              itemLabel={`réservation${total !== 1 ? 's' : ''}`}
              setPage={setPage}
            />
          </>
        )}
      </div>
    </section>
  );
}

/* ─── Bandeaux d'alerte / OK ─────────────────────────────────────── */
export function BannerAlert({ icon: Icon, iconBg, iconFg, title, subtitle, to, btnLabel = 'Traiter', btnColor = 'bg-orange-600 hover:bg-orange-700' }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconFg}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-orange-900">{title}</p>
          {subtitle && <p className="text-xs text-orange-700 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <Link to={to} className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-bold transition-colors ${btnColor}`}>
        {btnLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function BannerOk({ children }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
      <p className="text-sm font-medium text-emerald-800">{children}</p>
    </div>
  );
}

/* ─── Tuile d'alerte cliquable (utilisée par ManagerView) ───────── */
const ALERT_C = {
  emerald: { wrap: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100', num: 'text-emerald-700', text: 'text-emerald-800', sub: 'text-emerald-600', iBg: 'bg-emerald-100', iFg: 'text-emerald-600', ar: 'text-emerald-400' },
  violet:  { wrap: 'bg-violet-50  border-violet-200  hover:bg-violet-100',  num: 'text-violet-700',  text: 'text-violet-800',  sub: 'text-violet-600',  iBg: 'bg-violet-100',  iFg: 'text-violet-600',  ar: 'text-violet-400'  },
  blue:    { wrap: 'bg-blue-50    border-blue-200    hover:bg-blue-100',    num: 'text-blue-700',    text: 'text-blue-800',    sub: 'text-blue-600',    iBg: 'bg-blue-100',    iFg: 'text-blue-600',    ar: 'text-blue-400'    },
  amber:   { wrap: 'bg-amber-50   border-amber-200   hover:bg-amber-100',   num: 'text-amber-700',   text: 'text-amber-800',   sub: 'text-amber-600',   iBg: 'bg-amber-100',   iFg: 'text-amber-600',   ar: 'text-amber-400'   },
  orange:  { wrap: 'bg-orange-50  border-orange-200  hover:bg-orange-100',  num: 'text-orange-700',  text: 'text-orange-800',  sub: 'text-orange-600',  iBg: 'bg-orange-100',  iFg: 'text-orange-600',  ar: 'text-orange-400'  },
  red:     { wrap: 'bg-red-50     border-red-200     hover:bg-red-100',     num: 'text-red-700',     text: 'text-red-800',     sub: 'text-red-600',     iBg: 'bg-red-100',     iFg: 'text-red-600',     ar: 'text-red-400'     },
};

export function AlertTile({ count, label, sublabel, icon: Icon, color, to }) {
  const C = ALERT_C[color] ?? {};
  return (
    <Link to={to} className={`group relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${C.wrap}`}>
      {/* Accent bande droite */}
      <div className={`absolute right-0 top-0 h-full w-1 ${C.iBg} opacity-60`} />
      <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${C.iBg}`}>
        <Icon className={`h-6 w-6 ${C.iFg}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-3xl font-black tabular-nums leading-none ${C.num}`}>{count}</p>
        <p className={`text-sm font-bold mt-0.5 ${C.text}`}>{label}</p>
        {sublabel && <p className={`text-xs mt-0.5 ${C.sub}`}>{sublabel}</p>}
      </div>
      <ArrowRight className={`h-4 w-4 ${C.ar} group-hover:translate-x-1 transition-transform flex-shrink-0`} />
    </Link>
  );
}
