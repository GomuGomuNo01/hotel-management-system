import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

// Variantes semantiques fixes par type de KPI
const VARIANT_STYLES = {
  blue:   { icon: 'bg-blue-100 text-blue-700',   border: 'border-l-4 border-l-blue-500' },
  green:  { icon: 'bg-emerald-100 text-emerald-700', border: 'border-l-4 border-l-emerald-500' },
  violet: { icon: 'bg-violet-100 text-violet-700', border: 'border-l-4 border-l-violet-500' },
  amber:  { icon: 'bg-amber-100 text-amber-700',  border: 'border-l-4 border-l-amber-500' },
  red:    { icon: 'bg-red-100 text-red-700',     border: 'border-l-4 border-l-red-500' },
  cyan:   { icon: 'bg-cyan-100 text-cyan-700',   border: 'border-l-4 border-l-cyan-500' },
  indigo: { icon: 'bg-indigo-100 text-indigo-700', border: 'border-l-4 border-l-indigo-500' },
  orange: { icon: 'bg-orange-100 text-orange-700', border: 'border-l-4 border-l-orange-500' },
};

export default function StatCard({ label, value, icon: Icon, change, suffix, variant = 'blue' }) {
  const positive = typeof change === 'number' && change >= 0;
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.blue;

  return (
    <div className={cn(
      'bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow duration-200',
      styles.border,
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Label KPI - lisible et contraste */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 truncate">
            {label}
          </p>
          {/* Valeur KPI - tres grande et tres visible */}
          <p className="mt-2 text-3xl font-extrabold text-slate-950 tabular-nums leading-none">
            {value}
            {suffix && (
              <span className="ml-1.5 text-base font-semibold text-slate-500">
                {suffix}
              </span>
            )}
          </p>
          {/* Variation vs periode precedente */}
          {typeof change === 'number' && (
            <p
              className={cn(
                'mt-1.5 text-xs flex items-center gap-1 font-semibold',
                positive ? 'text-emerald-700' : 'text-red-600',
              )}
            >
              {positive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {Math.abs(change)}% vs periode prec.
            </p>
          )}
        </div>
        {/* Icone - fond teinte, couleur semantique */}
        {Icon && (
          <div
            className={cn(
              'flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center',
              styles.icon,
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
