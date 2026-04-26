import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, LogOut, User, ExternalLink, Sun, Moon, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUiStore } from '../../store/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { useDarkStore } from '../../store/darkStore';
import { authApi } from '../../api/auth.api';

export default function AdminHeader({ title = 'Espace Administrateur', profilePath = '/admin/profil' }) {
  const { toggleSidebar } = useUiStore();
  const { user, isAdmin, isOwner, logout } = useAuth();
  const { dark, toggle: toggleDark } = useDarkStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (_) { /* ignore */ }
    finally {
      logout();
      toast.success('Déconnexion réussie.');
      navigate('/login');
    }
  };

  const photo = user?.profile_photo;
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()
    || (user?.email?.[0] ?? 'U').toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-gray-600 dark:text-gray-300" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base lg:text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Voir le site public */}
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                     text-gray-700 hover:bg-gray-100
                     dark:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          title="Retourner sur le site public"
        >
          <ExternalLink className="h-4 w-4" /> Voir le site
        </Link>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleDark}
          aria-label="Basculer le thème"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {photo ? (
              <img src={photo} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900" />
            ) : (
              <span className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
                {initials}
              </span>
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[140px] truncate hidden md:inline">
              {user?.first_name} {user?.last_name}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">{user?.job_title || user?.role}</p>
              </div>

              <Link
                to={profilePath}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <User className="h-4 w-4" /> Mon profil
              </Link>

              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="sm:hidden flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ExternalLink className="h-4 w-4" /> Voir le site
              </Link>

              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
              <button
                onClick={() => { setOpen(false); handleLogout(); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
