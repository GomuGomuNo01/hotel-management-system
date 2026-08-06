import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ShieldCheck, CalendarCheck, Wallet, TrendingUp, BarChart2,
  BedDouble, Activity, ArrowRight, Crown, LogIn as CheckInIcon,
  LogOut as CheckOutIcon, RotateCcw, MessageSquareWarning, Inbox,
} from 'lucide-react';
import { ownerApi }        from '../../api/owner.api';
import { useAutoRefresh }  from '../../hooks/useAutoRefresh';
import { useAuth }         from '../../hooks/useAuth';
import LoadingSpinner      from '../../components/common/LoadingSpinner';
import ErrorMessage        from '../../components/common/ErrorMessage';
import StatusBadge         from '../../components/common/StatusBadge';
import { formatXOF }       from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';
// Primitives et bandeaux partagés avec le tableau de bord admin — même langage
// visuel (cartes, sections, pagination, accent `brand`) pour une UI cohérente.
import { StatCard, SectionCard, SectionTitle, PaginationBar, OccupancyBar } from '../../components/admin/dashboard/primitives';
import { BannerAlert, BannerOk } from '../../components/admin/dashboard/sections';

/* Graphiques (recharts ~400 kB) chargés à la demande. */
const RevenueChart    = lazy(() => import('../../components/owner/RevenueChart'));
const PaymentMixChart = lazy(() => import('../../components/owner/PaymentMixChart'));

function ChartSkeleton() {
  return <div className="h-full min-h-[260px] w-full rounded-xl bg-slate-100 animate-pulse" aria-hidden="true" />;
}

const PERIODS = [
  { v: 7,   l: '7 jours'  },
  { v: 30,  l: '30 jours' },
  { v: 90,  l: '90 jours' },
  { v: 180, l: '6 mois'   },
];

/* Couleur de la pastille d'action dans le journal d'audit. */
const AUDIT_COLOR = (type) => {
  if (!type) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (type.includes('CREATED'))                               return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (type.includes('DELETED') || type.includes('CANCELLED')) return 'bg-red-100 text-red-800 border-red-200';
  if (type.includes('MODIFIED') || type.includes('UPDATED'))  return 'bg-amber-100 text-amber-800 border-amber-200';
  if (type.includes('CHECKIN') || type.includes('CHECKOUT'))  return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

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

  const s        = statsRes?.stats ?? {};
  const allRes   = statsRes?.recent_reservations ?? [];
  const audit    = statsRes?.recent_audit        ?? [];
  const topRooms = Array.isArray(occ?.top_rooms) ? occ.top_rooms : [];

  const resTotalPages = Math.max(1, Math.ceil(allRes.length / RES_PER_PAGE));
  const safeResPage   = Math.min(resPage, resTotalPages);
  const recentRes     = allRes.slice((safeResPage - 1) * RES_PER_PAGE, safeResPage * RES_PER_PAGE);

  const hasAlerts = (s.pending_refunds ?? 0) > 0
    || (s.open_complaints ?? 0) > 0
    || (s.failed_payments ?? 0) > 0;

  const now     = new Date();
  const hour    = now.getHours();
  const salut   = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const todayFr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const displayName = user?.full_name?.split(' ')[0] || user?.full_name || 'Propriétaire';

  return (
    <div className="space-y-8 max-w-screen-xl mx-auto pb-10">

      {/* ══ EN-TÊTE (même structure que l'admin, gradient propre au Propriétaire) ══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-5 text-white shadow-lg">
        <div className="absolute right-4 -top-6 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute right-20 bottom-0 h-14 w-14 rounded-full bg-white/10" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-white/70 text-sm font-medium capitalize">{todayFr}</p>
            <h1 className="text-2xl md:text-3xl font-black mt-0.5 tracking-tight">{salut}, {displayName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm p-1 rounded-xl border border-white/30">
              {PERIODS.map((p) => (
                <button
                  key={p.v}
                  onClick={() => setDays(p.v)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    days === p.v ? 'bg-white text-amber-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/20'
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

      {/* ══ KPI — EXPLOITATION ══ */}
      <div>
        <SectionTitle>Exploitation du jour</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Activity}     color="indigo"  value={`${s.occupancy_rate ?? 0}%`} label="Taux d'occupation"    sublabel={`${s.occupied_rooms ?? 0} / ${s.total_rooms ?? 0} chambres`} />
          <StatCard icon={Users}        color="blue"    value={s.checked_in_count ?? 0}     label="Clients en séjour"    sublabel="Actuellement à l'hôtel" />
          <StatCard icon={CheckInIcon}  color="emerald" value={s.today_check_ins ?? 0}      label="Arrivées aujourd'hui" sublabel="À enregistrer" to="/owner/reservations" />
          <StatCard icon={CheckOutIcon} color="violet"  value={s.today_check_outs ?? 0}     label="Départs aujourd'hui"  sublabel="Chambres à libérer" to="/owner/reservations" />
        </div>
      </div>

      {/* ══ KPI — FINANCES ══ */}
      <div>
        <SectionTitle>Finances</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={TrendingUp} color="emerald" value={formatXOF(s.revenue_today ?? 0)}      label="Encaissé aujourd'hui" sublabel="Paiements confirmés" />
          <StatCard icon={BarChart2}  color="blue"    value={formatXOF(s.revenue_this_month ?? 0)} label="Recettes ce mois"     sublabel="Total confirmé" />
          <StatCard icon={Wallet}     color="amber"   value={formatXOF(revenue?.total ?? s.total_revenue ?? 0)} label={`CA sur ${days} jours`} sublabel="Période sélectionnée" />
        </div>
      </div>

      {/* ══ KPI — STRUCTURE ══ */}
      <div>
        <SectionTitle>Structure</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={BedDouble}     color="slate"  value={s.total_rooms ?? 0}         label="Chambres"         sublabel={`${s.maintenance_rooms ?? 0} en maintenance`} to="/owner/rooms" />
          <StatCard icon={Users}         color="blue"   value={s.total_clients ?? 0}       label="Clients inscrits" sublabel="Base totale" />
          <StatCard icon={ShieldCheck}   color="indigo" value={s.active_admins ?? 0}       label="Admins actifs"    sublabel={`${s.inactive_admins ?? 0} inactifs`} to="/owner/admins" />
          <StatCard icon={CalendarCheck} color="violet" value={s.total_reservations ?? 0}  label="Réservations"     sublabel={`${s.month_reservations ?? 0} ce mois`} to="/owner/reservations" />
        </div>
      </div>

      {/* ══ SIGNAUX À TRAITER ══ */}
      <section>
        <SectionTitle>Signaux à traiter</SectionTitle>
        {hasAlerts ? (
          <div className="space-y-3">
            {(s.pending_refunds ?? 0) > 0 && (
              <BannerAlert
                icon={RotateCcw} iconBg="bg-orange-100" iconFg="text-orange-600"
                title={`${s.pending_refunds} demande${s.pending_refunds > 1 ? 's' : ''} de remboursement en attente`}
                subtitle="Des clients attendent une réponse." to="/owner/remboursements"
              />
            )}
            {(s.open_complaints ?? 0) > 0 && (
              <BannerAlert
                icon={MessageSquareWarning} iconBg="bg-orange-100" iconFg="text-orange-600"
                title={`${s.open_complaints} réclamation${s.open_complaints > 1 ? 's' : ''} ouverte${s.open_complaints > 1 ? 's' : ''}`}
                subtitle="Des clients signalent un problème." to="/owner/reclamations"
              />
            )}
            {(s.failed_payments ?? 0) > 0 && (
              <BannerAlert
                icon={Wallet} iconBg="bg-red-100" iconFg="text-red-600"
                title={`${s.failed_payments} paiement${s.failed_payments > 1 ? 's' : ''} échoué${s.failed_payments > 1 ? 's' : ''}`}
                subtitle="Des transactions n'ont pas abouti." to="/owner/remboursements"
                btnLabel="Consulter" btnColor="bg-red-600 hover:bg-red-700"
              />
            )}
          </div>
        ) : (
          <BannerOk>Remboursements, réclamations et paiements : tout est en ordre.</BannerOk>
        )}
      </section>

      {/* ══ ÉTAT DES CHAMBRES ══ */}
      <section>
        <SectionTitle to="/owner/rooms" linkLabel="Gérer les chambres">État des chambres</SectionTitle>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <OccupancyBar
            available={s.available_rooms ?? 0}
            occupied={s.occupied_rooms ?? 0}
            maintenance={s.maintenance_rooms ?? 0}
          />
        </div>
      </section>

      {/* ══ ÉVOLUTION DU CA + RÉPARTITION ══ */}
      <section>
        <SectionTitle>Évolution du chiffre d'affaires sur {days} jours</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              <Suspense fallback={<ChartSkeleton />}>
                <RevenueChart data={revenue?.daily ?? []} />
              </Suspense>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <p className="text-sm font-bold text-slate-900">Répartition par canal</p>
              <p className="text-xs text-slate-500 mt-0.5">Canaux de paiement</p>
            </div>
            <div className="p-5 flex-1 min-h-[300px]">
              <Suspense fallback={<ChartSkeleton />}>
                <PaymentMixChart data={revenue?.provider_mix ?? []} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TOP CHAMBRES + JOURNAL D'ACTIVITÉ ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Top chambres réservées"
          subtitle={`Sur ${days} jours`}
          icon={TrendingUp} iconFg="text-emerald-600" iconBg="bg-emerald-50"
          isEmpty={topRooms.length === 0}
          emptyMsg="Aucune donnée d'occupation."
        >
          <ul className="divide-y divide-slate-100">
            {topRooms.map((r, i) => (
              <li key={r.id || i} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50/80 transition-colors">
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

        <div className="lg:col-span-2">
          <SectionCard
            title="Journal d'activité"
            subtitle="Dernières actions des admins"
            icon={Activity} iconFg="text-slate-600" iconBg="bg-slate-100"
            isEmpty={audit.length === 0}
            emptyMsg="Aucune activité récente."
            action={
              <Link to="/owner/audit" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Voir tout <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <ul className="divide-y divide-slate-100">
              {audit.map((a) => (
                <li key={a.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/80 transition-colors">
                  <div className={`mt-0.5 p-1.5 rounded-lg border flex-shrink-0 ${AUDIT_COLOR(a.action_type)}`}>
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-snug">
                      <span className="font-bold text-brand-700">{a.admin?.full_name || `Admin #${a.admin_id}`}</span>
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

      {/* ══ RÉSERVATIONS RÉCENTES (style liste, comme l'admin) ══ */}
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
              <ul className="divide-y divide-slate-100">
                {recentRes.map((r) => {
                  const name = r.client?.full_name
                    || `${r.client?.last_name ?? ''} ${r.client?.first_name ?? ''}`.trim()
                    || 'Client inconnu';
                  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                  return (
                    <li key={r.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/80 transition-colors">
                      <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0 hidden sm:flex">
                        {initials || '?'}
                      </div>
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
