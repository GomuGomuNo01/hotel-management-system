import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, BedDouble, Wallet, LogIn as CheckInIcon, LogOut as CheckOutIcon,
  Wrench, Clock, AlertCircle, Loader2, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.api';
import StatCard from '../../components/owner/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actioning, setActioning] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'in'|'out', reservation }

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.dashboard.stats();
      setData(res?.data ?? res);
    } catch (e) {
      setError(e.response?.data?.message || 'Impossible de charger le dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const performCheck = async () => {
    if (!confirm) return;
    setActioning(confirm.reservation.id);
    try {
      if (confirm.type === 'in')  await adminApi.checkIn(confirm.reservation.id);
      if (confirm.type === 'out') await adminApi.checkOut(confirm.reservation.id);
      toast.success(confirm.type === 'in' ? 'Check-in effectué.' : 'Check-out effectué.');
      setConfirm(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action impossible.');
    } finally {
      setActioning(null);
    }
  };

  if (loading) return <LoadingSpinner label="Chargement du tableau de bord…" />;
  if (error)   return <ErrorMessage message={error} onRetry={fetchData} />;

  const k = data?.kpi ?? {};
  const checkIns  = data?.today_check_ins  ?? [];
  const checkOuts = data?.today_check_outs ?? [];
  const recents   = data?.recent_reservations ?? [];
  const pendings  = data?.pending_payments    ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vue opérationnelle — {formatDate(new Date(), "EEEE d MMMM yyyy")}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Réservations du jour"  value={k.today_reservations ?? 0} icon={CalendarCheck} />
        <StatCard label="Check-in du jour"      value={k.today_check_ins ?? 0}    icon={CheckInIcon} />
        <StatCard label="Check-out du jour"     value={k.today_check_outs ?? 0}   icon={CheckOutIcon} />
        <StatCard label="Chambres disponibles"  value={k.available_rooms ?? 0}    icon={BedDouble} />
        <StatCard label="Chambres occupées"     value={k.occupied_rooms ?? 0}     icon={BedDouble} />
        <StatCard label="En maintenance"        value={k.maintenance_rooms ?? 0}  icon={Wrench} />
        <StatCard label="Réservations en attente" value={k.pending_reservations ?? 0} icon={Clock} />
        <StatCard label="Paiements en attente"  value={k.pending_payments ?? 0}   icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-ins du jour */}
        <Section
          title="Check-in prévus aujourd'hui"
          subtitle={`${checkIns.length} arrivée${checkIns.length > 1 ? 's' : ''}`}
          icon={CheckInIcon}
          color="text-blue-600"
        >
          {checkIns.length === 0
            ? <EmptyState message="Aucune arrivée prévue aujourd'hui." />
            : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {checkIns.map((r) => (
                  <ReservationRow
                    key={r.id}
                    reservation={r}
                    actionLabel="Check-in"
                    onAction={() => setConfirm({ type: 'in', reservation: r })}
                    loading={actioning === r.id}
                  />
                ))}
              </ul>
            )}
        </Section>

        {/* Check-outs du jour */}
        <Section
          title="Check-out prévus aujourd'hui"
          subtitle={`${checkOuts.length} départ${checkOuts.length > 1 ? 's' : ''}`}
          icon={CheckOutIcon}
          color="text-amber-600"
        >
          {checkOuts.length === 0
            ? <EmptyState message="Aucun départ prévu aujourd'hui." />
            : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {checkOuts.map((r) => (
                  <ReservationRow
                    key={r.id}
                    reservation={r}
                    actionLabel="Check-out"
                    actionVariant="amber"
                    onAction={() => setConfirm({ type: 'out', reservation: r })}
                    loading={actioning === r.id}
                  />
                ))}
              </ul>
            )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Réservations récentes */}
        <Section
          title="Réservations récentes"
          subtitle={`${recents.length} dernières`}
          icon={CalendarCheck}
          color="text-brand-600"
          footer={<Link to="/admin/reservations" className="text-sm font-medium text-brand-600 hover:underline inline-flex items-center gap-1">Voir tout <ArrowRight className="h-4 w-4" /></Link>}
        >
          {recents.length === 0
            ? <EmptyState message="Aucune réservation enregistrée." />
            : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {recents.map((r) => (
                  <li key={r.id} className="p-4 flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {r.client?.full_name || `${r.client?.first_name ?? ''} ${r.client?.last_name ?? ''}`}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 truncate">
                        Ch. {r.room?.room_number} • {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-brand-600">{formatXOF(r.total_amount)}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </Section>

        {/* Paiements en attente */}
        <Section
          title="Paiements en attente"
          subtitle={`${pendings.length} en attente`}
          icon={AlertCircle}
          color="text-yellow-600"
        >
          {pendings.length === 0
            ? <EmptyState message="Aucun paiement en attente." />
            : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {pendings.map((p) => (
                  <li key={p.id} className="p-4 flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{p.transaction_reference}</p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {p.provider?.toUpperCase().replace('_', ' ')} • {formatDateTime(p.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-yellow-700">{formatXOF(p.amount)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </Section>
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.type === 'in' ? 'Confirmer le check-in' : 'Confirmer le check-out'}
        message={
          confirm
            ? `${confirm.type === 'in' ? 'Enregistrer l\'arrivée' : 'Enregistrer le départ'} de ${confirm.reservation.client?.full_name} pour la chambre ${confirm.reservation.room?.room_number} ?`
            : ''
        }
        confirmLabel={confirm?.type === 'in' ? 'Check-in' : 'Check-out'}
        loading={actioning != null}
        onClose={() => setConfirm(null)}
        onConfirm={performCheck}
      />
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, color, children, footer }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`h-4 w-4 ${color || 'text-gray-500'}`} />}
          <div>
            <p className="font-semibold text-sm">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {footer}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ReservationRow({ reservation: r, actionLabel, actionVariant = 'blue', onAction, loading }) {
  const btn = actionVariant === 'amber'
    ? 'bg-amber-500 hover:bg-amber-600 text-white'
    : 'bg-blue-500 hover:bg-blue-600 text-white';
  return (
    <li className="p-4 flex items-center gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {r.client?.full_name || `${r.client?.first_name ?? ''} ${r.client?.last_name ?? ''}`}
        </p>
        <p className="text-gray-500 dark:text-gray-400 truncate">
          Chambre {r.room?.room_number} • {r.room?.room_type}
        </p>
      </div>
      <StatusBadge status={r.status} />
      <button
        onClick={onAction}
        disabled={loading}
        className={`btn ${btn} disabled:opacity-50`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : actionLabel}
      </button>
    </li>
  );
}
