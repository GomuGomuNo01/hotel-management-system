import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ShieldCheck, CalendarCheck, Wallet, TrendingUp, BarChart2,
  BedDouble, Activity, ArrowRight, Crown, LogIn as CheckInIcon,
  LogOut as CheckOutIcon, RotateCcw, MessageSquareWarning,
  CheckCircle2, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Inbox,
} from 'lucide-react';
import { ownerApi }        from '../../api/owner.api';
import { useAutoRefresh }  from '../../hooks/useAutoRefresh';
import { useAuth }         from '../../hooks/useAuth';
import RevenueChart        from '../../components/owner/RevenueChart';
import PaymentMixChart     from '../../components/owner/PaymentMixChart';
import LoadingSpinner      from '../../components/common/LoadingSpinner';
import ErrorMessage        from '../../components/common/ErrorMessage';
import StatusBadge         from '../../components/common/StatusBadge';
import { formatXOF }       from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';

/* ─── Périodes disponibles ───────────────────────────────────────── */
const PERIODS = [
  { v: 7,   l: '7 jours'  },
  { v: 30,  l: '30 jours' },
  { v: 90,  l: '90 jours' },
  { v: 180, l: '6 mois'   },
];

/* ─── Couleurs palette KPI ───────────────────────────────────────── */
const KPI_C = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700', bar: 'bg-emerald-400' },
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    val: 'text-blue-700',    bar: 'bg-blue-400'    },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  val: 'text-violet-700',  bar: 'bg-violet-400'  },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  val: 'text-indigo-700',  bar: 'bg-indigo-400'  },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700',   bar: 'bg-amber-400'   },
  orange:  { bg: 'bg-orange-50',  icon: 'text-orange-600',  val: 'text-orange-700',  bar: 'bg-orange-400'  },
  red:     { bg: 'bg-red-50',     icon: 'text-red-600',     val: 'text-red-700',     bar: 'bg-red-400'     },
  slate:   { bg: 'bg-slate-100',  icon: 'text-slate-600',   val: 'text-slate-700',   bar: 'bg-slate-300'   },
  cyan:    { bg: 'bg-cyan-50',    icon: 'text-cyan-600',    val: 'text-cyan-700',    bar: 'bg-cyan-400'    },
};

/* ─── KpiCard ────────────────────────────────────────────────────── */
function KpiCard({ value, label, sublabel, icon: Icon, color = 'slate', to }) {
  const C = KPI_C[color] ?? KPI_C.slate;
  const inner = (
    <div className={`relative bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm transition-all duration-200 h-full min-h-[130px] ${
      to ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300' : ''
    }`}>
      <div className={`h-1 w-full ${C.bar}`} />
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

/* ─── SectionTitle ───────────────────────────────────────────────── */
function SectionTitle({ children, to, linkLabel = 'Voir tout' }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
        <span className="h-3 w-0.5 rounded-full bg-amber-400 inline-block" />
        {children}
      </h2>
      {to && (
        <Link to={to} className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
          {linkLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ─── SectionCard ────────────────────────────────────────────────── */
function SectionCard({ title, subtitle, icon: Icon, iconFg, iconBg, action, isEmpty, emptyMsg, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconFg}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
          <Inbox className="h-7 w-7" strokeWidth={1.5} />
          <p className="text-sm text-slate-400">{emptyMsg ?? "Aucun élément."}</p>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

/* ─── OccupancyBar ───────────────────────────────────────────────── */
function OccupancyBar({ available, occupied, maintenance }) {
  const total = available + occupied + maintenance;
  if (total === 0) return <p className="text-sm text-slate-400 text-center py-6">Aucune chambre enregistrée.</p>;
  const pct  = (n) => Math.max(1, Math.round((n / total) * 100));
  const rate = Math.round((occupied / total) * 100);
  const stats = [
    { count: occupied,    label: 'Occupée',        plural: 's', dot: 'bg-indigo-500',  val: 'text-indigo-600'  },
    { count: available,   label: 'Disponible',     plural: 's', dot: 'bg-emerald-400', val: 'text-emerald-600' },
    { count: maintenance, label: 'En maintenance', plural: '',  dot: 'bg-orange-400',  val: 'text-orange-600'  },
  ];
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Répartition</p>
          <span className="text-xs font-bold text-slate-700">{rate}% occupé · {total} chambre{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 bg-slate-100">
          {occupied    > 0 && <div className="bg-indigo-500  rounded-full transition-all duration-500" style={{ width: `${pct(occupied)}%` }} />}
          {available   > 0 && <div className="bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct(available)}%` }} />}
          {maintenance > 0 && <div className="bg-orange-400  rounded-full transition-all duration-500" style={{ width: `${pct(maintenance)}%` }} />}
        </div>
      </div>
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

/* ─── BannerAlert ────────────────────────────────────────────────── */
function BannerAlert({ icon: Icon, iconBg, iconFg, title, subtitle, to, btnLabel = 'Traiter' }) {
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
      <Link to={to} className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 transition-colors">
        {btnLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ─── Couleurs log audit ─────────────────────────────────────────── */
const AUDIT_COLOR = (type) => {
  if (!type) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (type.includes('CREATED'))                       return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (type.includes('DELETED') || type.includes('CANCELLED')) return 'bg-red-100 text-red-800 border-red-200';
  if (type.includes('MODIFIED') || type.includes('UPDATED'))  return 'bg-amber-100 text-amber-800 border-amber-200';
  if (type.includes('CHECKIN') || type.includes('CHECKOUT'))  return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

/* ─── PaginationBar ──────────────────────────────────────────────── */
function PaginationBar({ page, lastPage, total, itemLabel = 'éléments', setPage }) {
  if (lastPage <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
      <span className="text-xs text-slate-500">
        Page <span className="font-semibold">{page}</span> sur{' '}
        <span className="font-semibold">{lastPage}</span>
        <span className="ml-2 text-slate-400">· {total} {itemLabel}</span>
      </span>
      <div className="flex items-center gap-1">
        <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></button>
        <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn-ghost h-8 w-8 p-0" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></button>
        <button className="btn-ghost h-8 w-8 p-0" disabled={page >= lastPage} onClick={() => setPage(lastPage)}><ChevronsRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════════════════ */
const RES_PER_PAGE = 6;

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [days,     setDays]    = useState(30);
  const [statsRes, setStats]   = useState(null);
  const [revenue,  setRevenue] = useState(null);
  const [occ,      setOcc]     = useState(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);
  const [resPage,  setResPage] = useState(1);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, r, o] = await Promise.all([
        ownerApi.dashboard.stats(),
        ownerApi.dashboard.revenue({ days }),
        ownerApi.dashboard.occupancy({ days }),
      ]);
      setStats(s?.data ?? s);
      setRevenue(r?.data ?? r);
      setOcc(o?.data ?? o);
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useAutoRefresh(
    ['reservation.created', 'reservation.cancelled', 'payment.confirmed',
     'checkin.done', 'checkout.done', 'refund.requested', 'refund.processed'],
    () => fetchAll(),
    { debounceMs: 1500 },
  );

  if (loading && !statsRes) return <LoadingSpinner label="Chargement du tableau de bord…" />;
  if (error   && !statsRes) return <ErrorMessage message={error} onRetry={fetchAll} />;

  const s   = statsRes?.stats ?? {};
  const allRes  = statsRes?.recent_reservations ?? [];
  const audit   = statsRes?.recent_audit        ?? [];
  const topRooms = occ?.top_rooms ?? [];

  /* Pagination réservations côté client */
  const resTotalPages = Math.max(1, Math.ceil(allRes.length / RES_PER_PAGE));
  const safeResPage   = Math.min(resPage, resTotalPages);
  const recentRes     = allRes.slice((safeResPage - 1) * RES_PER_PAGE, safeResPage * RES_PER_PAGE);

  /* Alertes urgentes */
  const hasAlerts = (s.pending_refunds ?? 0) > 0
    || (s.open_complaints ?? 0) > 0
    || (s.failed_payments ?? 0) > 0;

  const now  = new Date();
  const hour = now.getHours();
  const salut = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const todayFr = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-8 max-w-screen-xl mx-auto pb-10">

      {/* ══ EN-TÊTE GRADIENT ══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-5 text-white shadow-lg">
        <div className="absolute right-4 -top-6 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute right-20 bottom-0 h-14 w-14 rounded-full bg-white/10" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-medium capitalize">{todayFr}</p>
            <h1 className="text-2xl md:text-3xl font-black mt-0.5 tracking-tight flex items-center gap-2">
              {salut}{user?.full_name ? `, ${user.full_name}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Sélecteur de période */}
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm p-1 rounded-xl border border-white/30">
              {PERIODS.map((p) => (
                <button key={p.v} onClick={() => setDays(p.v)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    days === p.v
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/20'
                  }`}
                >
                  {p.l}
                </button>
              ))}
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              <Crown className="h-3.5 w-3.5" /> Propriétaire
            </span>
          </div>
        </div>
      </div>

      {/* ══ KPI EXPLOITATION ══ */}
      <div>
        <SectionTitle>Exploitation — Aujourd'hui</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon={Activity}     color="indigo"  value={`${s.occupancy_rate ?? 0}%`}   label="Taux d'occupation"   sublabel={`${s.occupied_rooms ?? 0} / ${s.total_rooms ?? 0} chambres`}  />
          <KpiCard icon={Users}        color="blue"    value={s.checked_in_count ?? 0}        label="Clients en séjour"   sublabel="Actuellement à l'hôtel"    />
          <KpiCard icon={CheckInIcon}  color="emerald" value={s.today_check_ins ?? 0}         label="Arrivées aujourd'hui" sublabel="À enregistrer"             to="/owner/reservations" />
          <KpiCard icon={CheckOutIcon} color="violet"  value={s.today_check_outs ?? 0}        label="Départs aujourd'hui" sublabel="Chambres à libérer"         to="/owner/reservations" />
        </div>
      </div>

      {/* ══ KPI FINANCES ══ */}
      <div>
        <SectionTitle>Finances</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard icon={TrendingUp} color="emerald" value={formatXOF(s.revenue_today ?? 0)}        label="Encaissé aujourd'hui"  sublabel="Paiements confirmés"         />
          <KpiCard icon={BarChart2}  color="blue"    value={formatXOF(s.revenue_this_month ?? 0)}   label="Recettes ce mois"      sublabel="Total confirmé"              />
          <KpiCard icon={Wallet}     color="amber"   value={formatXOF(revenue?.total ?? s.total_revenue ?? 0)}
                                                                                                    label={`CA — ${days} jours`}  sublabel="Période sélectionnée"        />
        </div>
      </div>

      {/* ══ KPI STRUCTURE ══ */}
      <div>
        <SectionTitle>Structure</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon={BedDouble}     color="slate"   value={s.total_rooms ?? 0}          label="Chambres"             sublabel={`${s.maintenance_rooms ?? 0} en maintenance`}  to="/owner/rooms" />
          <KpiCard icon={Users}         color="cyan"    value={s.total_clients ?? 0}        label="Clients inscrits"     sublabel="Base totale"                                    />
          <KpiCard icon={ShieldCheck}   color="indigo"  value={s.active_admins ?? 0}        label="Admins actifs"        sublabel={`${s.inactive_admins ?? 0} inactifs`}          to="/owner/admins" />
          <KpiCard icon={CalendarCheck} color="violet"  value={s.total_reservations ?? 0}  label="Réservations"         sublabel={`${s.month_reservations ?? 0} ce mois`}        to="/owner/reservations" />
        </div>
      </div>

      {/* ══ ALERTES URGENTES ══ */}
      <section>
        <SectionTitle>Signaux à traiter</SectionTitle>
        {hasAlerts ? (
          <div className="space-y-3">
            {(s.pending_refunds ?? 0) > 0 && (
              <BannerAlert
                icon={RotateCcw} iconBg="bg-orange-100" iconFg="text-orange-600"
                title={`${s.pending_refunds} demande${s.pending_refunds > 1 ? 's' : ''} de remboursement en attente`}
                subtitle="Des clients attendent une réponse."
                to="/owner/remboursements"
              />
            )}
            {(s.open_complaints ?? 0) > 0 && (
              <BannerAlert
                icon={MessageSquareWarning} iconBg="bg-orange-100" iconFg="text-orange-600"
                title={`${s.open_complaints} réclamation${s.open_complaints > 1 ? 's' : ''} ouverte${s.open_complaints > 1 ? 's' : ''}`}
                subtitle="Des clients signalent un problème et attendent votre réponse."
                to="/owner/reclamations"
              />
            )}
            {(s.failed_payments ?? 0) > 0 && (
              <BannerAlert
                icon={Wallet} iconBg="bg-red-100" iconFg="text-red-600"
                title={`${s.failed_payments} paiement${s.failed_payments > 1 ? 's' : ''} échoué${s.failed_payments > 1 ? 's' : ''}`}
                subtitle="Des transactions n'ont pas abouti."
                to="/owner/remboursements" btnLabel="Consulter"
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800">Aucune alerte en cours</p>
              <p className="text-xs text-emerald-700 mt-0.5">Remboursements, réclamations et paiements — tout est en ordre.</p>
            </div>
          </div>
        )}
      </section>

      {/* ══ ÉTAT DES CHAMBRES ══ */}
      <section>
        <SectionTitle to="/owner/rooms" linkLabel="Gérer les chambres">État des chambres</SectionTitle>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <OccupancyBar
            available={s.available_rooms    ?? 0}
            occupied={s.occupied_rooms      ?? 0}
            maintenance={s.maintenance_rooms ?? 0}
          />
        </div>
      </section>

      {/* ══ GRAPHIQUES CA + RÉPARTITION ══ */}
      <section>
        <SectionTitle>Évolution du chiffre d'affaires — {days} jours</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Courbe CA */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <div>
                <p className="text-sm font-bold text-slate-900">Évolution du CA</p>
                <p className="text-xs text-slate-500 mt-0.5">Orange CI · Wave CI · Total</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-emerald-700 tabular-nums">{formatXOF(revenue?.total ?? 0)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total période</p>
              </div>
            </div>
            <div className="p-5 flex-1 min-h-[300px]">
              <RevenueChart data={revenue?.daily ?? []} />
            </div>
          </div>

          {/* Répartition providers */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <p className="text-sm font-bold text-slate-900">Répartition par canal</p>
              <p className="text-xs text-slate-500 mt-0.5">Canaux de paiement</p>
            </div>
            <div className="p-5 flex-1 min-h-[300px]">
              <PaymentMixChart data={revenue?.provider_mix ?? []} />
            </div>
          </div>

        </div>
      </section>

      {/* ══ TOP CHAMBRES + JOURNAL ACTIVITÉ ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top chambres */}
        <SectionCard
          title="Top chambres réservées"
          subtitle={`Sur ${days} jours`}
          icon={TrendingUp} iconFg="text-emerald-600" iconBg="bg-emerald-50"
          isEmpty={topRooms.length === 0}
          emptyMsg="Aucune donnée d'occupation."
        >
          <ul className="divide-y divide-slate-50">
            {topRooms.map((r, i) => (
              <li key={r.id || i} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-sm border-2 flex-shrink-0 ${
                  i === 0 ? 'bg-amber-100 text-amber-700 border-amber-200'
                : i === 1 ? 'bg-slate-100 text-slate-600 border-slate-200'
                :           'bg-orange-50 text-orange-700 border-orange-100'
                }`}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">Chambre {r.room_number}</p>
                  <p className="text-xs text-slate-500 capitalize">{r.room_type}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-blue-700 tabular-nums">{r.bookings_count}</p>
                  <p className="text-[10px] text-slate-400">résa.</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Journal d'activité */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Journal d'activité"
            subtitle="Dernières actions des admins"
            icon={Activity} iconFg="text-slate-600" iconBg="bg-slate-100"
            isEmpty={audit.length === 0}
            emptyMsg="Aucune activité récente."
            action={
              <Link to="/owner/audit" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                Voir tout <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <ul className="divide-y divide-slate-50">
              {audit.map((a) => (
                <li key={a.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className={`mt-0.5 p-1.5 rounded-lg border flex-shrink-0 ${AUDIT_COLOR(a.action_type)}`}>
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-snug">
                      <span className="font-bold text-amber-700">{a.admin?.full_name || `Admin #${a.admin_id}`}</span>
                      {' · '}
                      <span className="text-slate-600">{a.action_type?.toLowerCase().replace(/_/g, ' ')}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {a.entity_type} <span className="font-semibold text-slate-600">#{a.entity_id}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                    {formatDateTime(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

      </div>

      {/* ══ RÉSERVATIONS RÉCENTES ══ */}
      <section>
        <SectionTitle to="/owner/reservations" linkLabel="Toutes les réservations">
          Réservations récentes
        </SectionTitle>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {allRes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2">
              <Inbox className="h-8 w-8" strokeWidth={1.5} />
              <p className="text-sm text-slate-400">Aucune réservation enregistrée.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Chambre</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dates</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Montant</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentRes.map((r) => {
                      const name = r.client?.full_name
                        || `${r.client?.last_name ?? ''} ${r.client?.first_name ?? ''}`.trim()
                        || 'Client inconnu';
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-sm font-bold text-slate-900 truncate max-w-[160px]">{name}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{r.client?.email}</p>
                          </td>
                          <td className="px-5 py-3">
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                              <BedDouble className="h-3 w-3 text-slate-500" />
                              <span className="text-xs font-bold text-slate-700">N°{r.room?.room_number}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap">
                            {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm font-extrabold text-slate-900 tabular-nums">{formatXOF(r.total_amount)}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={safeResPage} lastPage={resTotalPages} total={allRes.length}
                itemLabel={`réservation${allRes.length !== 1 ? 's' : ''}`}
                setPage={setResPage}
              />
            </>
          )}
        </div>
      </section>

    </div>
  );
}
