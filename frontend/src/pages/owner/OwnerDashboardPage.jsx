import { useState } from 'react';
import { Users, ShieldCheck, CalendarCheck, Wallet, TrendingUp } from 'lucide-react';
import { useOwnerStats } from '../../hooks/useOwnerStats';
import StatCard from '../../components/owner/StatCard';
import RevenueChart from '../../components/owner/RevenueChart';
import OccupancyChart from '../../components/owner/OccupancyChart';
import PaymentMixChart from '../../components/owner/PaymentMixChart';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatXOF } from '../../utils/formatCurrency';

const PERIODS = [
  { v: '7d', l: '7 jours' },
  { v: '30d', l: '30 jours' },
  { v: '90d', l: '90 jours' },
];

export default function OwnerDashboardPage() {
  const [period, setPeriod] = useState('30d');
  const { stats, revenue, occupancy, loading, error, refetch } = useOwnerStats(period);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const paymentMix = stats?.payment_mix || [
    { name: 'Orange CI', value: stats?.orange_payments || 0 },
    { name: 'Wave CI', value: stats?.wave_payments || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vue d'ensemble</h1>
        <select className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Clients" value={stats?.total_clients ?? 0} icon={Users} />
        <StatCard label="Admins actifs" value={stats?.active_admins ?? 0} icon={ShieldCheck} />
        <StatCard label="Réservations (mois)" value={stats?.month_reservations ?? 0} icon={CalendarCheck} />
        <StatCard label="CA (mois)" value={formatXOF(stats?.month_revenue ?? 0)} icon={Wallet} />
        <StatCard label="Occupation" value={`${stats?.occupancy_rate ?? 0}%`} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <RevenueChart data={revenue} />
        <OccupancyChart data={occupancy} />
      </div>

      <PaymentMixChart data={paymentMix} />
    </div>
  );
}
