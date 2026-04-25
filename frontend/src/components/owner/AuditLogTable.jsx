import DataTable from '../common/DataTable';
import { formatDateTime } from '../../utils/formatDate';
import { cn } from '../../utils/cn';

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-orange-100 text-orange-800',
  delete: 'bg-red-100 text-red-800',
};

const colorFor = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('creat')) return ACTION_COLORS.create;
  if (t.includes('update') || t.includes('modif')) return ACTION_COLORS.update;
  if (t.includes('delet') || t.includes('suppr')) return ACTION_COLORS.delete;
  return 'bg-gray-100 text-gray-700';
};

export default function AuditLogTable({ logs, loading, page, totalPages, onPageChange }) {
  const columns = [
    { key: 'admin', label: 'Admin', render: (r) => r.admin?.full_name || `#${r.admin_id}` },
    { key: 'action_type', label: 'Action', render: (r) => (
      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', colorFor(r.action_type))}>
        {r.action_type}
      </span>
    )},
    { key: 'entity', label: 'Ressource', render: (r) => `${r.entity_type} #${r.entity_id ?? '—'}` },
    { key: 'ip_address', label: 'IP' },
    { key: 'created_at', label: 'Date', render: (r) => formatDateTime(r.created_at) },
  ];
  return (
    <DataTable
      columns={columns}
      data={logs}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      emptyMessage="Aucun log à afficher."
    />
  );
}
