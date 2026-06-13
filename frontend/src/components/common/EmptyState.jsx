import { PackageSearch, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  Icon = PackageSearch,
  title = 'Aucun resultat',
  message,
  ctaLabel,
  ctaTo,
  onCta,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Icone encerclee */}
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/20 flex items-center justify-center shadow-sm">
          <Icon className="h-9 w-9 text-brand-500 dark:text-brand-400" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
      </div>

      {/* Texte */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      {message && (
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
          {message}
        </p>
      )}

      {/* CTA */}
      {(ctaLabel && ctaTo) ? (
        <Link to={ctaTo} className="btn-primary gap-2">
          <Plus className="h-4 w-4" />
          {ctaLabel}
        </Link>
      ) : (ctaLabel && onCta) ? (
        <button onClick={onCta} className="btn-primary gap-2">
          <Plus className="h-4 w-4" />
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
