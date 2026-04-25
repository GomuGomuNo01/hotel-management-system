import { AlertTriangle, RotateCw } from 'lucide-react';

export default function ErrorMessage({ message = 'Une erreur est survenue.', onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
      <p className="mt-2 text-sm text-red-800">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4 mx-auto">
          <RotateCw className="h-4 w-4" /> Réessayer
        </button>
      )}
    </div>
  );
}
