export const STATUS_CONFIG = {
  pending:     { label: 'En attente',  color: 'bg-yellow-100 text-yellow-800' },
  confirmed:   { label: 'Confirmée',   color: 'bg-green-100 text-green-800' },
  checked_in:  { label: 'Check-in',    color: 'bg-blue-100 text-blue-800' },
  checked_out: { label: 'Check-out',   color: 'bg-gray-100 text-gray-800' },
  cancelled:   { label: 'Annulée',     color: 'bg-red-100 text-red-800' },
  success:     { label: 'Payé',        color: 'bg-green-100 text-green-800' },
  failed:      { label: 'Échoué',      color: 'bg-red-100 text-red-800' },
  available:   { label: 'Disponible',  color: 'bg-green-100 text-green-800' },
  occupied:    { label: 'Occupée',     color: 'bg-red-100 text-red-800' },
  maintenance: { label: 'Maintenance', color: 'bg-orange-100 text-orange-800' },
};

export const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || { label: status || '—', color: 'bg-gray-100 text-gray-700' };
