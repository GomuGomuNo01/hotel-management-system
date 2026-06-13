/**
 * StatusBadge - Affichage professionnel des statuts
 * Couleurs opaques et contrastes eleves pour lisibilite optimale
 */
import { CheckCircle2, Clock, Wrench, XCircle, CalendarCheck, LogIn, LogOut, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
  // -- Chambres --
  available: {
    label: 'Disponible',
    icon: CheckCircle2,
    classes: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
  },
  occupied: {
    label: 'Occupée',
    icon: XCircle,
    classes: 'bg-red-100 text-red-800 border border-red-300 font-bold',
  },
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    classes: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
  },
  reserved: {
    label: 'Réservée',
    icon: CalendarCheck,
    classes: 'bg-blue-100 text-blue-800 border border-blue-300 font-bold',
  },
  // -- Reservations --
  pending: {
    label: 'En attente',
    icon: Clock,
    classes: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
  },
  confirmed: {
    label: 'Confirmée',
    icon: CheckCircle2,
    classes: 'bg-blue-100 text-blue-800 border border-blue-300 font-bold',
  },
  checked_in: {
    label: 'En séjour',
    icon: LogIn,
    classes: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
  },
  checked_out: {
    label: 'Parti',
    icon: LogOut,
    classes: 'bg-slate-100 text-slate-700 border border-slate-300 font-bold',
  },
  cancelled: {
    label: 'Annulée',
    icon: XCircle,
    classes: 'bg-red-100 text-red-800 border border-red-300 font-bold',
  },
  // -- Paiements --
  paid: {
    label: 'Payé',
    icon: CheckCircle2,
    classes: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
  },
  unpaid: {
    label: 'Non payé',
    icon: AlertCircle,
    classes: 'bg-red-100 text-red-800 border border-red-300 font-bold',
  },
  partial: {
    label: 'Partiel',
    icon: Clock,
    classes: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
  },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status];

  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        {status}
      </span>
    );
  }

  const Icon = config.icon;
  const iconSize = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${config.classes}`}
    >
      <Icon className={iconSize} />
      {config.label}
    </span>
  );
}
