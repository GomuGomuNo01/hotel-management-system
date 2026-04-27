/**
 * StatusBadge — Affichage professionnel des statuts
 * Utilise des icones Lucide + couleurs semantiques
 */
import { CheckCircle2, Clock, Wrench, XCircle, CalendarCheck, LogIn, LogOut, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
  // -- Chambres --
  available: {
    label: 'Disponible',
    icon: CheckCircle2,
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  },
  occupied: {
    label: 'Occupe',
    icon: XCircle,
    classes: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
  },
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    classes: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  },
  reserved: {
    label: 'Reserve',
    icon: CalendarCheck,
    classes: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
  },
  // -- Reservations --
  pending: {
    label: 'En attente',
    icon: Clock,
    classes: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  },
  confirmed: {
    label: 'Confirme',
    icon: CheckCircle2,
    classes: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
  },
  checked_in: {
    label: 'Arrive',
    icon: LogIn,
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  },
  checked_out: {
    label: 'Parti',
    icon: LogOut,
    classes: 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20',
  },
  cancelled: {
    label: 'Annule',
    icon: XCircle,
    classes: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
  },
  // -- Paiements --
  paid: {
    label: 'Paye',
    icon: CheckCircle2,
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  },
  unpaid: {
    label: 'Non paye',
    icon: AlertCircle,
    classes: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
  },
  partial: {
    label: 'Partiel',
    icon: Clock,
    classes: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status];
  
  if (!config) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ring-1 ring-inset
        bg-gray-50 text-gray-600 ring-gray-600/20 text-${size}`}>
        {status}
      </span>
    );
  }

  const Icon = config.icon;
  const iconSize = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const textSize = size === 'xs' ? 'text-xs' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ring-1 ring-inset ${textSize} ${config.classes}`}
    >
      <Icon className={`${iconSize} shrink-0`} />
      {config.label}
    </span>
  );
}
