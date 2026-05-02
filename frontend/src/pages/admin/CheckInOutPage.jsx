import { useState } from 'react';
import toast from 'react-hot-toast';
import { LogIn, LogOut, Search, CalendarClock } from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import { adminReservationsApi } from '../../api/reservations.api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDate } from '../../utils/formatDate';

export default function CheckInOutPage() {
  const { data, loading, refetch } = useReservations({ per_page: 50 }, { admin: true });
  const [busyId, setBusyId]   = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'in'|'out', reservation }
  const [search, setSearch]   = useState('');

  const filtered = data.filter((r) => {
    if (!search) return r.status === 'confirmed' || r.status === 'checked_in';
    const q = search.toLowerCase();
    return (
      (r.status === 'confirmed' || r.status === 'checked_in') &&
      (
        r.client?.first_name?.toLowerCase().includes(q) ||
        r.client?.last_name?.toLowerCase().includes(q) ||
        r.room?.room_number?.toString().includes(q)
      )
    );
  });

  const performAction = async () => {
    if (!confirm) return;
    const { type, reservation: r } = confirm;
    setBusyId(r.id);
    try {
      if (type === 'in')  await adminReservationsApi.checkIn(r.id);
      else                await adminReservationsApi.checkOut(r.id);
      toast.success(type === 'in' ? 'Check-in effectué.' : 'Check-out effectué.');
      setConfirm(null);
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'client', label: 'Client',
      render: (r) => (
        <div>
          <p className="font-medium">{r.client ? `${r.client.first_name} ${r.client.last_name}` : '—'}</p>
          <p className="text-xs text-gray-400">{r.client?.email}</p>
        </div>
      ),
    },
    {
      key: 'room', label: 'Chambre',
      render: (r) => (
        <div>
          <p className="font-medium">N° {r.room?.room_number}</p>
          <p className="text-xs text-gray-400 capitalize">{r.room?.room_type}</p>
        </div>
      ),
    },
    { key: 'in',  label: 'Arrivée',  render: (r) => formatDate(r.check_in_date) },
    { key: 'out', label: 'Départ',   render: (r) => formatDate(r.check_out_date) },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: 'Action',
      render: (r) => (
        <div className="flex gap-2">
          {r.status === 'confirmed' && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
              disabled={busyId === r.id}
              onClick={() => setConfirm({ type: 'in', reservation: r })}
            >
              <LogIn className="h-3.5 w-3.5" /> Check-in
            </button>
          )}
          {r.status === 'checked_in' && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
              disabled={busyId === r.id}
              onClick={() => setConfirm({ type: 'out', reservation: r })}
            >
              <LogOut className="h-3.5 w-3.5" /> Check-out
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-blue-600" />
            Check-in / Check-out
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            <span className="text-blue-700 font-black">{filtered.length} </span>arrivée{filtered.length !== 1 ? 's' : ''} / départ{filtered.length !== 1 ? 's' : ''} en attente
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            className="input pl-9 w-56"
            placeholder="Client ou chambre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="Aucune arrivée ou départ en attente."
        />
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.type === 'in' ? 'Confirmer le check-in' : 'Confirmer le check-out'}
        message={
          confirm
            ? `${confirm.type === 'in' ? 'Enregistrer l\'arrivée' : 'Enregistrer le départ'} de ${confirm.reservation.client?.first_name} ${confirm.reservation.client?.last_name} pour la chambre N° ${confirm.reservation.room?.room_number} ?`
            : ''
        }
        confirmLabel={confirm?.type === 'in' ? 'Check-in' : 'Check-out'}
        loading={busyId != null}
        onClose={() => setConfirm(null)}
        onConfirm={performAction}
      />
    </div>
  );
}
