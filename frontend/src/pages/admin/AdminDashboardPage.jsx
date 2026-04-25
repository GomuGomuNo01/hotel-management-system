import { CalendarCheck, BedDouble, Wallet } from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import { useRooms } from '../../hooks/useRooms';
import StatCard from '../../components/owner/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatDate';

export default function AdminDashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: reservations, loading: lr } = useReservations({ date: today, per_page: 50 }, { admin: true });
  const { data: rooms, loading: lo } = useRooms({ status: 'available' }, { admin: true });

  const todays = reservations.filter((r) => r.check_in_date === today || r.check_out_date === today);
  const pending = reservations.filter((r) => r.status === 'pending');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Réservations du jour" value={todays.length} icon={CalendarCheck} />
        <StatCard label="Chambres disponibles" value={rooms.length} icon={BedDouble} />
        <StatCard label="En attente de paiement" value={pending.length} icon={Wallet} />
      </div>

      <div className="card">
        <div className="border-b p-4 font-semibold">Check-in / Check-out prévus aujourd'hui</div>
        {(lr || lo) ? <LoadingSpinner /> : todays.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Aucune arrivée ou départ prévu.</p>
        ) : (
          <ul className="divide-y">
            {todays.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{r.client?.first_name} {r.client?.last_name}</p>
                  <p className="text-gray-500">Chambre {r.room?.room_number} — {formatDate(r.check_in_date)} → {formatDate(r.check_out_date)}</p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
