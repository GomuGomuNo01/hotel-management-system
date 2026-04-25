import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function LoadingSpinner({ className, label }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-10 text-gray-500', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  );
}
