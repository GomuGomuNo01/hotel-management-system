import { Loader2, CheckCircle2, XCircle, Ban, Clock } from 'lucide-react';

const CONFIG = {
  pending: {
    icon:  Loader2,
    spin:  true,
    label: 'Paiement en attente de confirmation',
    sub:   'Vérification en cours…',
    bg:    'bg-amber-50 border-amber-200',
    text:  'text-amber-800',
    subCls:'text-amber-600',
  },
  success: {
    icon:  CheckCircle2,
    spin:  false,
    label: 'Paiement confirmé avec succès',
    sub:   'Votre réservation est maintenant confirmée.',
    bg:    'bg-emerald-50 border-emerald-200',
    text:  'text-emerald-800',
    subCls:'text-emerald-600',
  },
  failed: {
    icon:  XCircle,
    spin:  false,
    label: 'Paiement échoué',
    sub:   "La transaction n'a pas pu être traitée.",
    bg:    'bg-red-50 border-red-200',
    text:  'text-red-800',
    subCls:'text-red-600',
  },
  cancelled: {
    icon:  Ban,
    spin:  false,
    label: 'Paiement annulé',
    sub:   'Cette tentative de paiement a été annulée.',
    bg:    'bg-gray-50 border-gray-200',
    text:  'text-gray-700',
    subCls:'text-gray-500',
  },
  expired: {
    icon:  Clock,
    spin:  false,
    label: 'Paiement expiré',
    sub:   'Le délai de 30 minutes a été dépassé.',
    bg:    'bg-gray-50 border-gray-200',
    text:  'text-gray-700',
    subCls:'text-gray-500',
  },
};

export default function PaymentStatusBanner({ status, timeLeft = null, totalSeconds = 1800 }) {
  const cfg  = CONFIG[status] ?? CONFIG.pending;
  const Icon = cfg.icon;

  const pct = (timeLeft != null && totalSeconds > 0)
    ? Math.max(0, Math.min(100, (timeLeft / totalSeconds) * 100))
    : null;

  const mm = timeLeft != null ? String(Math.floor(timeLeft / 60)).padStart(2, '0') : null;
  const ss = timeLeft != null ? String(timeLeft % 60).padStart(2, '0') : null;

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 flex-shrink-0 ${cfg.text} ${cfg.spin ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${cfg.text}`}>{cfg.label}</p>
          <p className={`text-sm mt-0.5 ${cfg.subCls}`}>{cfg.sub}</p>
        </div>

        {/* Compte à rebours visible uniquement si pending + timeLeft fourni */}
        {mm !== null && status === 'pending' && (
          <div className={`text-right flex-shrink-0 ${cfg.text}`}>
            <p className="font-mono text-xl font-bold leading-none tabular-nums">{mm}:{ss}</p>
            <p className="text-xs opacity-70 mt-0.5">restant</p>
          </div>
        )}
      </div>

      {/* Barre de progression */}
      {pct !== null && status === 'pending' && (
        <div className="mt-3 h-1.5 rounded-full bg-amber-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
