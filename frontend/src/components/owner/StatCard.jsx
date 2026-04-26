import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const ICON_COLORS = [
  'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
];

let _colorIndex = 0;
const colorCache = new WeakMap();

function getIconColor(iconRef) {
  if (!iconRef) return ICON_COLORS[0];
  if (!colorCache.has(iconRef)) {
    colorCache.set(iconRef, ICON_COLORS[_colorIndex % ICON_COLORS.length]);
    _colorIndex++;
  }
  return colorCache.get(iconRef);
}

export default function StatCard({ label, value, icon: Icon, change, suffix, colorClass }) {
  const positive = typeof change === 'number' && change >= 0;
  const iconColor = colorClass ?? getIconColor(Icon);

  return (
    <div className="card card-pad group hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {value}
            {suffix && (
              <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                {suffix}
              </span>
            )}
          </p>
          {typeof change === 'number' && (
            <p
              className={cn(
                'mt-1 text-xs flex items-center gap-1 font-medium',
                positive ? 'text-emerald-600' : 'text-red-500',
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(change)}% vs période préc.
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center',
              iconColor,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
