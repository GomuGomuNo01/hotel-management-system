import { useState } from 'react';
import { Filter, CalendarCheck } from 'lucide-react';
import { useReservations } from '../../hooks/useReservations';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import { formatXOF } from '../../utils/formatCurrency';

const STATUSES = [
  { value: '',            label: 'Tous les statuts' },
  { value: 'pending',     label: 'En attente' },
  { value: 'confirmed',   label: 'Confirmées' },
  { value: 'checked_in',  label: 'Check-in' },
  { value: 'checked_out', label: 'Check-out' },
  { value: 'cancelled',   label: 'Annulées' },
];

export default function AdminReservationsPage() {
  const [filters, setFilters] = useState({ status: '', date: '' });
  const [page, setPage]       = useState(1);
  const { data, meta, loading } = useReservations({ ...filters, page }, { admin: true });

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const columns = [
    { key: 'id',     label: '#',    render: (r) => <span className="font-mono text-xs text-gray-400">#{r.id}</span> },
    {
      key: 'client', label: 'Client',
      render: (r) => r.client ? (
        <div>
          <p className="font-medium">{r.client.first_name} {r.client.last_name}</p>
          <p className="text-xs text-gray-400">{r.client.email}</p>
        </div>
      ) : '—',
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
    {
      key: 'dates', label: 'Période',
      render: (r) => (
        <span className="text-sm">
          {formatDate(r.check_in_date)}<span className="text-gray-400"> → </span>{formatDate(r.check_out_date)}
        </span>
      ),
    },
    { key: 'amount', label: 'Montant', render: (r) => <span className="font-semibold text-brand-600">{formatXOF(r.total_amount)}</span> },
    { key: 'status', label: 'Statut',  render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CalendarCheck className="h-6 w-6 text-brand-500" />
          Réservations
        </h1>
        {meta && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {meta.total} réservation{meta.total !== 1 ? 's' : ''} au total
          </p>
        )}
      </div>

      {/* Filtres */}
      <div className="card card-pad">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <select
            className="input w-auto"
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            type="date"
            className="input w-auto"
            value={filters.date}
            onChange={(e) => setFilter('date_from', e.target.value)}
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          page={meta?.current_page || page}
          totalPages={meta?.last_page || 1}
          onPageChange={setPage}
          emptyMessage="Aucune réservation trouvée."
        />
      </div>
    </div>
  );
}
