import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, LogOut, User, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUiStore } from '../../store/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';

export default function AdminHeader({ title = 'Espace Administrateur', profilePath = '/admin/profil' }) {
  const { toggleSidebar } = useUiStore();
  const { user, isAdmin, isOwner, logout } = useAuth();
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

  // Owner has full_name only — admins have last_name + first_name
  const displayName = user?.full_name
    ?? (`${user?.last_name ?? ''} ${user?.first_name ?? ''}`.trim() || user?.email?.split('@')[0] || 'Utilisateur');

  const initials = (() => {
    if (user?.full_name) {
      const parts = user.full_name.trim().split(/\s+/);
      return parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    const raw = `${user?.last_name?.[0] ?? ''}${user?.first_name?.[0] ?? ''}`.toUpperCase();
    return raw || (user?.email?.[0] ?? 'U').toUpperCase();
  })();

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-gray-600" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base lg:text-lg font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* User dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {photo ? (
              <img
                src={photo}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-100"
                style={{ imageRendering: 'auto', WebkitBackfaceVisibility: 'hidden' }}
                width={32}
                height={32}
              />
            ) : (
              <span className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
                {initials}
              </span>
            )}
            <span className="text-sm font-medium text-gray-700 max-w-[200px] truncate hidden md:inline">
              {displayName}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 break-words leading-snug">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                {(user?.job_title || user?.role) && !user?.full_name && (
                  <p className="text-xs text-gray-400 mt-0.5">{user?.job_title || user?.role}</p>
                )}
                {user?.full_name && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-700 border-yellow-200">
                    Propriétaire
                  </span>
                )}
              </div>

              <Link
                to={profilePath}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4" /> Mon profil
              </Link>

              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { setOpen(false); handleLogout(); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
