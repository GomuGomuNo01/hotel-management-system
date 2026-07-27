import { BRAND } from '../../config/brand';
import Logo from './Logo';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-muted dark:text-gray-500">
        <div className="flex items-center gap-2">
          <Logo size="sm" markOnly />
          <span className="font-semibold text-ink dark:text-gray-300">{BRAND.name}</span>
          <span className="hidden sm:inline text-gray-300 dark:text-gray-600">·</span>
          <span className="hidden sm:inline">{BRAND.tagline}</span>
        </div>
        <span>© {year} {BRAND.name} - Tous droits réservés.</span>
      </div>
    </footer>
  );
}
