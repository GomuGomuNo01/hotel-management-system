import { Hotel } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();
  const name = import.meta.env.VITE_APP_NAME || 'Hotel Management';

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-2">
          <Hotel className="h-4 w-4 text-brand-500" />
          <span className="font-medium text-gray-600 dark:text-gray-400">{name}</span>
        </div>
        <span>© {year} - Tous droits réservés.</span>
      </div>
    </footer>
  );
}
