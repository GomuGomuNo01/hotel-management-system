import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ShieldCheck, CalendarCheck, Wallet, TrendingUp,
  BedDouble, Wrench, Activity, ArrowRight, Hotel, Crown,
} from 'lucide-react';
import { ownerApi } from '../../api/owner.api';
import StatCard from '../../components/owner/StatCard';
import RevenueChart from '../../components/owner/RevenueChart';
import PaymentMixChart from '../../components/owner/PaymentMixChart';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { formatXOF } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';

const PERIODS = [
  { v: 7,   l: '7 jours' },
  { v: 30,  l: '30 jours' },
  { v: 90,  l: '90 jours' },
  { v: 180, l: '6 mois' },
];

const ACTION_COLOR = (type) => {
  if (!type) return 'bg-gray-100 text-gray-700';
  if (type.includes('CREATED'))   return 'bg-green-100 text-green-800';
  if (type.includes('DELETED') || type.includes('CANCELLED')) return 'bg-red-100 text-red-800';
  if (type.includes('MODIFIED') || type.includes('UPDATED'))  return 'bg-orange-100 text-orange-800';
  if (type.includes('CHECKIN') || type.includes('CHECKOUT'))  return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-700';
};

export default function OwnerDashboardPage() {
  const [days, setDays]       = useState(30);
  const [statsRes, setStats]  = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [occ, setOcc]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchAll = async () => {
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
      setError(e.response?.data?.message || 'Impossible de charger le dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [days]);

  if (loading) return <LoadingSpinner label="Chargement du tableau de bord…" />;
  if (error)   return <ErrorMessage message={error} onRetry={fetchAll} />;

  const stats = statsRes?.stats ?? {};
  const recentReservations = statsRes?.recent_reservations ?? [];
  const recentAudit        = statsRes?.recent_audit ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" /> Tableau de bord propriétaire
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vue stratégique — pilotage et performance globale.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.v}
              onClick={() => setDays(p.v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                days === p.v
                  ? 'bg-white dark:bg-gray-900 text-brand-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Clients enregistrés" value={stats.total_clients ?? 0} icon={Users} />
        <StatCard label="Admins actifs"       value={stats.active_admins ?? 0} icon={ShieldCheck} />
        <StatCard label="Réservations / mois" value={stats.month_reservations ?? 0} icon={CalendarCheck} />
        <StatCard
          label="CA du mois"
          value={formatXOF(stats.month_revenue ?? 0)}
          icon={Wallet}
        />
        <StatCard
          label="Taux d'occupation"
          value={`${stats.occupancy_rate ?? 0}`}
          suffix="%"
          icon={TrendingUp}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Chambres totales"  value={stats.total_rooms ?? 0}    icon={Hotel} />
        <StatCard label="Disponibles"       value={stats.available_rooms ?? 0} icon={BedDouble} />
        <StatCard label="Occupées"          value={stats.occupied_rooms ?? 0}  icon={BedDouble} />
        <StatCard label="En maintenance"    value={stats.maintenance_rooms ?? 0} icon={Wrench} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card card-pad">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-600" /> Évolution du CA ({days} jours)
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total : <span className="font-semibold text-brand-600">{formatXOF(revenue?.total ?? 0)}</span>
            </span>
          </div>
          <RevenueChart data={revenue?.daily ?? []} />
        </div>

        <div className="card card-pad">
          <h3 className="font-semibold mb-2">Répartition par fournisseur</h3>
          <PaymentMixChart data={revenue?.provider_mix ?? []} />
        </div>
      </div>

      {/* Top rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card card-pad">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-brand-600" /> Top chambres réservées
          </h3>
          {(occ?.top_rooms ?? []).length === 0
            ? <EmptyState message="Aucune réservation sur la période." />
            : (
              <ul className="space-y-2 text-sm">
                {(occ?.top_rooms ?? []).map((r, i) => (
                  <li key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <span className="h-7 w-7 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-bold">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="font-medium">Chambre {r.room_number}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{r.room_type}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-brand-600">{r.bookings_count}</span>
                  </li>
                ))}
              </ul>
            )}
        </div>

        {/* Recent reservations */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-brand-600" /> Réservations récentes
            </h3>
            <Link to="/admin/reservations" className="text-sm font-medium text-brand-600 hover:underline inline-flex items-center gap-1">
              Voir tout <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentReservations.length === 0
            ? <EmptyState message="Aucune réservation pour le moment." />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2">Client</th>
                      <th className="px-4 py-2">Chambre</th>
                      <th className="px-4 py-2">Dates</th>
                      <th className="px-4 py-2">Montant</th>
                      <th className="px-4 py-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentReservations.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 font-medium">
                          {r.client?.full_name || `${r.client?.first_name ?? ''} ${r.client?.last_name ?? ''}`}
                        </td>
                        <td className="px-4 py-2">N° {r.room?.room_number}</td>
                        <td className="px-4 py-2 text-gray-500">{formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}</td>
                        <td className="px-4 py-2 font-semibold text-brand-600">{formatXOF(r.total_amount)}</td>
                        <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>

      {/* Recent audit */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-600" /> Dernières actions d'administration
          </h3>
          <Link to="/owner/audit" className="text-sm font-medium text-brand-600 hover:underline inline-flex items-center gap-1">
            Voir le journal complet <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recentAudit.length === 0
          ? <EmptyState message="Aucune action récente." />
          : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentAudit.map((a) => (
                <li key={a.id} className="p-3 flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {a.admin?.full_name || `Admin #${a.admin_id}`}
                      <span className="text-gray-500 dark:text-gray-400 font-normal"> a effectué </span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLOR(a.action_type)}`}>
                        {a.action_type}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 font-normal"> sur </span>
                      <span className="font-mono text-xs">{a.entity_type} #{a.entity_id}</span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{formatDateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}
