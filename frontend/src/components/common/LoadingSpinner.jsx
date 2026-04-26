import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function LoadingSpinner({ className, label = 'Chargement…' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-14 text-gray-500 dark:text-gray-400', className)}>
      <Loader2 className="h-9 w-9 animate-spin text-brand-500" />
      {label && <p className="mt-3 text-sm font-medium">{label}</p>}
    </div>
  );
}
