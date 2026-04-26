import { AlertCircle, RotateCw } from 'lucide-react';

export default function ErrorMessage({ message = 'Une erreur est survenue.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <AlertCircle className="h-7 w-7 text-red-500" />
      </div>
      <p className="text-sm font-medium text-red-800 dark:text-red-300 max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-5">
          <RotateCw className="h-4 w-4" /> Réessayer
        </button>
      )}
    </div>
  );
}
