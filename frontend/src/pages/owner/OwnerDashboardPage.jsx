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
  { v: 7, l: '7 jours' },
  { v: 30, l: '30 jours' },
  { v: 90, l: '90 jours' },
  { v: 180, l: '6 mois' },
];

const ACTION_COLOR = (type) => {
  if (!type) return 'bg-slate-100 text-slate-700 border-slate-300';
  if (type.includes('CREATED')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (type.includes('DELETED') || type.includes('CANCELLED')) return 'bg-red-100 text-red-800 border-red-300';
  if (type.includes('MODIFIED') || type.includes('UPDATED')) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (type.includes('CHECKIN') || type.includes('CHECKOUT')) return 'bg-blue-100 text-blue-800 border-blue-300';
  return 'bg-slate-100 text-slate-700 border-slate-300';
};

export default function OwnerDashboardPage() {
  const [days, setDays]       = useState(30);
  const [statsRes, setStats]  = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [occ, setOcc]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
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

  useEffect(() => {
    fetchAll();
    /* eslint-disable-next-line */
  }, [days]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} retry={fetchAll} />;

  const stats = statsRes?.stats ?? {};
  const recentReservations = statsRes?.recent_reservations ?? [];
  const recentAudit = statsRes?.recent_audit ?? [];

  return (
    <div className="space-y-8 pb-10">
      {/* En-tête stratégique */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Crown className="h-9 w-9 text-amber-500 fill-amber-50" />
            Tableau de bord propriétaire
          </h1>
          <p className="text-slate-600 font-semibold mt-2 text-lg">
            Vue stratégique — pilotage et performance globale.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {PERIODS.map((p) => (
            <button
              key={p.v}
              onClick={() => setDays(p.v)}
              className={`px-4 py-2 text-sm font-extrabold rounded-lg transition-all ${
                days === p.v
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPIs - Variantes sémantiques fortes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Chiffre d'Affaires"
          value={formatXOF(stats.total_revenue || 0)}
          icon={Wallet}
          variant="success"
          trend={+12.5}
          description="Total cumulé"
        />
        <StatCard
          label="Taux d'Occupation"
          value={`${stats.occupancy_rate || 0}%`}
          icon={Activity}
          variant="info"
          trend={+5.2}
          description="Sur la période"
        />
        <StatCard
          label="Total Réservations"
          value={stats.total_bookings || 0}
          icon={CalendarCheck}
          variant="warning"
          description="Toutes sources"
        />
        <StatCard
          label="Total Clients"
          value={stats.total_clients || 0}
          icon={Users}
          variant="brand"
          description="Base de données"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chambres Totales</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-extrabold text-slate-900">{stats.total_rooms || 0}</h3>
            <Hotel className="h-6 w-6 text-slate-400" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moyenne / Nuit</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatXOF(stats.avg_daily_rate || 0)}</h3>
            <TrendingUp className="h-6 w-6 text-emerald-500" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admins actifs</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-extrabold text-slate-900">{stats.total_admins || 0}</h3>
            <ShieldCheck className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">En maintenance</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-extrabold text-slate-900">{stats.rooms_maintenance || 0}</h3>
            <Wrench className="h-6 w-6 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Graphique Revenue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Évolution du CA ({days} jours)</h3>
              <p className="text-sm font-semibold text-slate-500">Performance financière temporelle</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-700">{formatXOF(revenue?.total ?? 0)}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Total Période</p>
            </div>
          </div>
          <div className="p-6 flex-1 min-h-[350px]">
            <RevenueChart data={revenue?.chart_data || []} />
          </div>
        </div>

        {/* Payment Mix */}
        <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-extrabold text-slate-900">Répartition par fournisseur</h3>
            <p className="text-sm font-semibold text-slate-500">Canaux de réservation</p>
          </div>
          <div className="p-6 flex-1 min-h-[350px]">
            <PaymentMixChart data={revenue?.provider_mix || []} />
          </div>
        </div>
      </div>

      {/* Top rooms & Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top chambres */}
        <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Top chambres réservées
            </h3>
          </div>
          <div className="p-2">
            {(occ?.top_rooms ?? []).length === 0 ? (
              <EmptyState message="Aucune donnée d'occupation." />
            ) : (
              <div className="divide-y divide-slate-50">
                {(occ?.top_rooms ?? []).map((r, i) => (
                  <div key={r.id || i} className="p-4 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                        i === 0 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        i === 1 ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                        #{i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Chambre {r.room_number}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">{r.room_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-blue-700">{r.bookings_count}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Ventes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audit / Journal */}
        <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-extrabold text-slate-900">Dernières actions d'administration</h3>
            <Link to="/owner/audit" className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Voir tout <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-2">
            {recentAudit.length === 0 ? (
              <EmptyState message="Aucun log d'activité récent." />
            ) : (
              <div className="divide-y divide-slate-50">
                {recentAudit.map((a) => (
                  <div key={a.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex gap-3">
                      <div className={`mt-1 p-2 rounded-lg border-2 ${ACTION_COLOR(a.action_type)}`}>
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          <span className="text-blue-700 font-extrabold uppercase text-[11px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mr-2">
                            {a.admin?.full_name || `Admin #${a.admin_id}`}
                          </span>
                          {a.action_type.toLowerCase().replace('_', ' ')}
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tighter">
                          Objet : {a.entity_type} <span className="text-slate-900 font-black">#{a.entity_id}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      {formatDateTime(a.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Réservations récentes */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-extrabold text-slate-900">Réservations récentes</h3>
          <Link to="/owner/reservations" className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
            Voir le planning <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {recentReservations.length === 0 ? (
            <div className="p-10"><EmptyState message="Aucune réservation récente." /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Client</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Chambre</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Dates</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Montant</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentReservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-extrabold text-slate-900 truncate max-w-[180px]">
                        {r.client?.full_name || `${r.client?.first_name ?? ''} ${r.client?.last_name ?? ''}`}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[180px]">{r.client?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                        <BedDouble className="h-3 w-3 text-slate-500 mr-1.5" />
                        <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">N° {r.room?.room_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 tabular-nums">
                      {formatDate(r.check_in_date)} <ArrowRight className="inline h-3 w-3 mx-1 text-slate-300" /> {formatDate(r.check_out_date)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900 tabular-nums">{formatXOF(r.total_amount)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
