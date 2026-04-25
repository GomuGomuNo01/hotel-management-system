import { useState } from 'react';
import toast from 'react-hot-toast';
import { LogIn, LogOut } from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import { adminReservationsApi } from '../../api/reservations.api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatDate';

export default function CheckInOutPage() {
  const { data, loading, refetch } = useReservations({ per_page: 50 }, { admin: true });
  const [busyId, setBusyId] = useState(null);

  const action = async (type, r) => {
    setBusyId(r.id);
    try {
      if (type === 'in') await adminReservationsApi.checkIn(r.id);
      else await adminReservationsApi.checkOut(r.id);
      toast.success(type === 'in' ? 'Check-in effectué.' : 'Check-out effectué.');
      refetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Action impossible.'); }
    finally { setBusyId(null); }
  };

  const columns = [
    { key: 'client', label: 'Client', render: (r) => r.client ? `${r.client.first_name} ${r.client.last_name}` : '—' },
    { key: 'room', label: 'Chambre', render: (r) => `N° ${r.room?.room_number}` },
    { key: 'in', label: 'Arrivée', render: (r) => formatDate(r.check_in_date) },
    { key: 'out', label: 'Départ', render: (r) => formatDate(r.check_out_date) },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex gap-2">
        {r.status === 'confirmed' && (
          <button className="btn-primary text-xs" disabled={busyId === r.id} onClick={() => action('in', r)}>
            <LogIn className="h-3 w-3" /> Check-in
          </button>
        )}
        {r.status === 'checked_in' && (
          <button className="btn-secondary text-xs" disabled={busyId === r.id} onClick={() => action('out', r)}>
            <LogOut className="h-3 w-3" /> Check-out
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Check-in / Check-out</h1>
      <div className="card">
        <DataTable columns={columns} data={data} loading={loading} />
      </div>
    </div>
  );
}
