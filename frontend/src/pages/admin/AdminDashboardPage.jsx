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
      toast.success(confirm.type === 'in' ? 'Check-in effectue.' : 'Check-out effectue.');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action impossible.');
    } finally {
      setActioning(null);
      setConfirm(null);
    }
  };

  if (loading) return <LoadingSpinner label="Chargement du tableau de bord..." />;
  if (error)   return <ErrorMessage message={error} onRetry={fetchData} />;

  const k        = data?.kpi ?? {};
  const checkIns  = data?.today_check_ins  ?? [];
  const checkOuts = data?.today_check_outs ?? [];
  const recents   = data?.recent_reservations ?? [];
  const pendings  = data?.pending_payments   ?? [];

  return (
    <div className="space-y-8 p-6 max-w-screen-xl mx-auto">

      {/* En-tete du dashboard */}
      <div>
        <h1 className="text-2xl font-bold text-slate-950">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Vue operationnelle — {formatDate(new Date(), "EEEE d MMMM yyyy")}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Reservations du jour"   value={k.today_reservations ?? 0}  icon={CalendarCheck}   variant="blue" />
        <StatCard label="Check-in du jour"        value={k.today_check_ins ?? 0}     icon={CheckInIcon}     variant="green" />
        <StatCard label="Check-out du jour"       value={k.today_check_outs ?? 0}    icon={CheckOutIcon}    variant="violet" />
        <StatCard label="Chambres disponibles"    value={k.available_rooms ?? 0}     icon={BedDouble}       variant="cyan" />
        <StatCard label="Chambres occupees"       value={k.occupied_rooms ?? 0}      icon={BedDouble}       variant="indigo" />
        <StatCard label="En maintenance"          value={k.maintenance_rooms ?? 0}   icon={Wrench}          variant="orange" />
        <StatCard label="Reservations en attente" value={k.pending_reservations ?? 0} icon={Clock}          variant="amber" />
        <StatCard label="Paiements en attente"    value={k.pending_payments ?? 0}    icon={Wallet}          variant="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Check-ins du jour */}
        <Section
          title="Check-in prevus aujourd'hui"
          subtitle={`${checkIns.length} arrivee${checkIns.length > 1 ? 's' : ''}`}
          icon={CheckInIcon}
          color="text-emerald-700"
          bg="bg-emerald-50"
        >
          {checkIns.length === 0
            ? <EmptyState message="Aucune arrivee prevue aujourd'hui." />
            : (
              <ul className="divide-y divide-slate-100">
                {checkIns.map((r) => (
                  <ReservationRow
                    key={r.id}
                    reservation={r}
                    actionLabel="Check-in"
                    actionVariant="amber"
                    onAction={() => setConfirm({ type: 'in', reservation: r })}
                    loading={actioning === r.id}
                  />
                ))}
              </ul>
            )
          }
        </Section>

        {/* Check-outs du jour */}
        <Section
          title="Check-out prevus aujourd'hui"
          subtitle={`${checkOuts.length} depart${checkOuts.length > 1 ? 's' : ''}`}
          icon={CheckOutIcon}
          color="text-violet-700"
          bg="bg-violet-50"
        >
          {checkOuts.length === 0
            ? <EmptyState message="Aucun depart prevu aujourd'hui." />
            : (
              <ul className="divide-y divide-slate-100">
                {checkOuts.map((r) => (
                  <ReservationRow
                    key={r.id}
                    reservation={r}
                    actionLabel="Check-out"
                    actionVariant="blue"
                    onAction={() => setConfirm({ type: 'out', reservation: r })}
                    loading={actioning === r.id}
                  />
                ))}
              </ul>
            )
          }
        </Section>

        {/* Reservations recentes */}
        <Section
          title="Reservations recentes"
          subtitle="Derniers sejours crees"
          icon={CalendarCheck}
          color="text-blue-700"
          bg="bg-blue-50"
          action={<Link to="/admin/reservations" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">Voir tout <ArrowRight className="h-3 w-3" /></Link>}
        >
          {recents.length === 0
            ? <EmptyState message="Aucune reservation recente." />
            : (
              <ul className="divide-y divide-slate-100">
                {recents.map((r) => (
                  <li key={r.id} className="p-4 flex items-center gap-3 text-sm hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {r.client?.full_name || `${r.client?.first_name ?? ''} ${r.client?.last_name ?? ''}`}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        Chambre {r.room?.room_number} &bull; {formatDate(r.check_in_date)} - {formatDate(r.check_out_date)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )
          }
        </Section>

        {/* Paiements en attente */}
        <Section
          title="Paiements en attente"
          subtitle="A traiter en priorite"
          icon={AlertCircle}
          color="text-red-700"
          bg="bg-red-50"
          action={<Link to="/admin/payments" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">Voir tout <ArrowRight className="h-3 w-3" /></Link>}
        >
          {pendings.length === 0
            ? <EmptyState message="Aucun paiement en attente." />
            : (
              <ul className="divide-y divide-slate-100">
                {pendings.map((p) => (
                  <li key={p.id} className="p-4 flex items-center justify-between gap-3 text-sm hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {p.reservation?.client?.full_name || 'Client inconnu'}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {formatDateTime(p.created_at)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums">{formatXOF(p.amount)}</span>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )
          }
        </Section>

      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.type === 'in' ? 'Confirmer le check-in' : 'Confirmer le check-out'}
          message={`Confirmer ${confirm.type === 'in' ? "l'arrivee" : "le depart"} de ${confirm.reservation.client?.full_name ?? 'ce client'} (Chambre ${confirm.reservation.room?.room_number}) ?`}
          onConfirm={performCheck}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/* =================================================================
   Section wrapper avec header contraste
================================================================= */
function Section({ title, subtitle, icon: Icon, color, bg, action, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

/* =================================================================
   Ligne de reservation avec bouton d'action
================================================================= */
function ReservationRow({ reservation: r, actionLabel, actionVariant = 'blue', onAction, loading }) {
  const btn = actionVariant === 'amber'
    ? 'bg-amber-500 hover:bg-amber-600 text-white'
    : 'bg-blue-500 hover:bg-blue-600 text-white';
  return (
    <li className="p-4 flex items-center gap-3 text-sm hover:bg-slate-50">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 truncate">
          {r.client?.full_name || `${r.client?.first_name ?? ''} ${r.client?.last_name ?? ''}`}
        </p>
        <p className="text-xs text-slate-600 truncate">
          Chambre {r.room?.room_number} &bull; {r.room?.room_type}
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
