export const STATUS_CONFIG = {
  pending:     { label: 'En attente',  color: 'bg-amber-50  text-amber-700  border border-amber-200',  dot: 'bg-amber-400'  },
  confirmed:   { label: 'Confirmée',   color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  checked_in:  { label: 'Check-in',    color: 'bg-blue-50   text-blue-700   border border-blue-200',    dot: 'bg-blue-400'   },
  checked_out: { label: 'Check-out',   color: 'bg-slate-50  text-slate-600  border border-slate-200',   dot: 'bg-slate-400'  },
  cancelled:   { label: 'Annulée',     color: 'bg-red-50    text-red-700    border border-red-200',     dot: 'bg-red-400'    },
  success:     { label: 'Payé',        color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  failed:      { label: 'Échoué',      color: 'bg-red-50    text-red-700    border border-red-200',     dot: 'bg-red-400'    },
  available:   { label: 'Disponible',  color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  occupied:    { label: 'Occupée',     color: 'bg-red-50    text-red-700    border border-red-200',     dot: 'bg-red-400'    },
  maintenance: { label: 'Maintenance', color: 'bg-orange-50  text-orange-700 border border-orange-200',  dot: 'bg-orange-400' },
  reserved:    { label: 'Réservée',    color: 'bg-purple-50  text-purple-700 border border-purple-200',  dot: 'bg-purple-400' },
};

export const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || { label: status || '—', color: 'bg-gray-50 text-gray-600 border border-gray-200', dot: 'bg-gray-400' };
