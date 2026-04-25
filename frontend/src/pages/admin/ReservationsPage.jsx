import { useState } from 'react';
import { useReservations } from '../../hooks/useReservations';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';

const STATUSES = ['', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

export default function AdminReservationsPage() {
  const [filters, setFilters] = useState({ status: '', date: '' });
  const [page, setPage] = useState(1);
  const { data, meta, loading } = useReservations({ ...filters, page }, { admin: true });

  const columns = [
    { key: 'id', label: '#', render: (r) => `#${r.id}` },
    { key: 'client', label: 'Client', render: (r) => r.client ? `${r.client.first_name} ${r.client.last_name}` : '—' },
    { key: 'room', label: 'Chambre', render: (r) => `N° ${r.room?.room_number} (${r.room?.room_type})` },
    { key: 'dates', label: 'Période', render: (r) => `${formatDate(r.check_in_date)} → ${formatDate(r.check_out_date)}` },
    { key: 'amount', label: 'Montant', render: (r) => formatXOF(r.total_amount) },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Réservations</h1>

      <div className="card card-pad grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Statut</label>
          <select className="input" value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'Tous'}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={filters.date} onChange={(e) => { setFilters({ ...filters, date: e.target.value }); setPage(1); }} />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          page={meta?.current_page || page}
          totalPages={meta?.last_page || 1}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
