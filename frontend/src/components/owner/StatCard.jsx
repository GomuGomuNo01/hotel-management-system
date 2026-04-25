import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function StatCard({ label, value, icon: Icon, change, suffix }) {
  const positive = change && change >= 0;
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {value}{suffix && <span className="text-sm text-gray-500 font-medium ml-1">{suffix}</span>}
          </p>
          {typeof change === 'number' && (
            <p className={cn('mt-1 text-xs flex items-center gap-1', positive ? 'text-green-600' : 'text-red-600')}>
              {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(change)}% vs période précédente
            </p>
          )}
        </div>
        {Icon && (
          <div className="h-11 w-11 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
