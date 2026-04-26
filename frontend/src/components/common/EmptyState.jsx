import { PackageSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  icon: Icon = PackageSearch,
  title = 'Aucun résultat',
  message,
  ctaLabel,
  ctaTo,
  onCta,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {message && (
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{message}</p>
      )}
      {ctaLabel && (
        <div className="mt-5">
          {ctaTo ? (
            <Link to={ctaTo} className="btn-primary">
              {ctaLabel}
            </Link>
          ) : (
            <button onClick={onCta} className="btn-primary">
              {ctaLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
