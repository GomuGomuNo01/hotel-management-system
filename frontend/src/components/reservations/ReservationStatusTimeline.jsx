import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

const STEPS = [
  { key: 'pending', label: 'En attente' },
  { key: 'confirmed', label: 'Confirmée' },
  { key: 'checked_in', label: 'Check-in' },
  { key: 'checked_out', label: 'Check-out' },
];

export default function ReservationStatusTimeline({ status }) {
  if (status === 'cancelled') {
    return <p className="text-sm text-red-600">Réservation annulée.</p>;
  }
  const idx = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex items-center w-full">
      {STEPS.map((s, i) => {
        const reached = i <= idx;
        return (
          <li key={s.key} className={cn('flex items-center', i < STEPS.length - 1 && 'w-full')}>
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium',
              reached ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 text-gray-400'
            )}>
              {reached ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div className="ml-2 mr-2 text-xs whitespace-nowrap">
              <span className={reached ? 'text-gray-900 font-medium' : 'text-gray-400'}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn('h-0.5 flex-1', i < idx ? 'bg-brand-500' : 'bg-gray-200')} />}
          </li>
        );
      })}
    </ol>
  );
}
