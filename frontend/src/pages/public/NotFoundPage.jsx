import { Link } from 'react-router-dom';
import { Home, ArrowLeft, SearchX } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gray-100 dark:bg-gray-800 mb-6">
          <SearchX className="h-10 w-10 text-gray-400 dark:text-gray-500" />
        </div>
        <h1 className="text-7xl font-black text-brand-500 dark:text-brand-400 tracking-tight">404</h1>
        <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Page introuvable
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <Link to="/" className="btn-primary">
            <Home className="h-4 w-4" /> Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
