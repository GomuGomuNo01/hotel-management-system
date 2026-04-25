import { Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon = Inbox, title = 'Rien à afficher', message, ctaLabel, ctaTo, onCta }) {
  return (
    <div className="text-center py-14 px-6">
      <Icon className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-3 text-base font-semibold text-gray-900">{title}</h3>
      {message && <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">{message}</p>}
      {ctaLabel && (ctaTo ? (
        <Link to={ctaTo} className="btn-primary mt-5">{ctaLabel}</Link>
      ) : (
        <button onClick={onCta} className="btn-primary mt-5">{ctaLabel}</button>
      ))}
    </div>
  );
}
