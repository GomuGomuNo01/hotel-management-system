import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

const CFG = {
  pending: { icon: Loader2, label: 'Paiement en attente — Veuillez confirmer sur votre téléphone.', cls: 'bg-yellow-50 text-yellow-800 border-yellow-200', spin: true },
  success: { icon: CheckCircle2, label: 'Paiement reçu avec succès ! 🎉', cls: 'bg-green-50 text-green-800 border-green-200' },
  failed:  { icon: XCircle, label: 'Le paiement a échoué. Veuillez réessayer.', cls: 'bg-red-50 text-red-800 border-red-200' },
};

export default function PaymentStatusBanner({ status }) {
  const cfg = CFG[status] || CFG.pending;
  const Icon = cfg.icon;
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-4', cfg.cls)}>
      <Icon className={cn('h-6 w-6', cfg.spin && 'animate-spin')} />
      <p className="text-sm font-medium">{cfg.label}</p>
    </div>
  );
}
