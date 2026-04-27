import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Hotel, LogIn, LogOut, User, Menu, X, ChevronDown,
  LayoutDashboard, UserPlus,} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';
import { profileApi } from '../../api/profile.api';
import toast from 'react-hot-toast';

const navItem = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'text-brand-600 bg-brand-50 dark:text-brand-300 dark:bg-brand-500/10'
      : 'text-gray-700 hover:text-brand-600 dark:text-gray-200 dark:hover:text-brand-300'
  }`;

function UserAvatar({ user, size = 'md' }) {
  const sizeClasses = size === 'md' ? 'h-9 w-9 text-sm' : 'h-8 w-8 text-xs';
  const initials = (() => {
    if (user?.first_name && user?.last_name)
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    const parts = user?.full_name?.trim().split(' ');
    if (parts?.length >= 2)
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return (user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase();
  })();

  const photoUrl =
    user?.profile_photo || user?.avatar_url || user?.profile_picture || null;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={user?.full_name || 'Avatar'}
        className={`${sizeClasses} rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900`}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }

  return (
    <span
      className={`${sizeClasses} rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold`}
    >
      {initials}
    </span>
  );
}


export default function Navbar() {
  const { user, token, isAuthenticated, isClient, isAdmin, isOwner, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Si le token existe mais que le profil user est incomplet (cas Google OAuth),
  // on recharge le profil depuis l'API.
  useEffect(() => {
    if (token && (!user || !user.first_name)) {
      profileApi
        .get()
        .then((res) => {
          const data = res?.data ?? res;
          if (data?.id) updateUser(data);
        })
        .catch(() => { /* silencieux */ });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (_) { /* ignore */ }
    finally {
      logout();
      toast.success('Vous avez été déconnecté.');
      navigate('/');
    }
  };

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : user?.full_name || 'Utilisateur';

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 dark:bg-gray-900 dark:shadow-gray-950/40 dark:border-b dark:border-gray-800">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-lg">
            <Hotel className="h-6 w-6" />
            <span>Hotel Management</span>
          </Link>

          {/* Navigation desktop */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navItem}>Accueil</NavLink>
            <NavLink to="/rooms" className={navItem}>Chambres</NavLink>
            {isAuthenticated && isClient && (
              <NavLink to="/mon-espace" className={navItem}>Mon espace</NavLink>
            )}
            {isAuthenticated && isAdmin && (
              <NavLink to="/admin" className={navItem}>
                <LayoutDashboard className="h-4 w-4 inline mr-1" />
                Admin
              </NavLink>
            )}
            {isAuthenticated && isOwner && (
              <NavLink to="/owner" className={navItem}>
                <LayoutDashboard className="h-4 w-4 inline mr-1" />
                Espace propriétaire
              </NavLink>
            )}
          </div>

          {/* Actions desktop */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />

            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <UserAvatar user={user} size="md" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>

                    {isClient && (
                      <Link
                        to="/mon-espace"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <User className="h-4 w-4" />
                        Mon espace
                      </Link>
                    )}

                    <Link
                      to="/mon-espace/profil"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <User className="h-4 w-4" />
                      Mon profil
                    </Link>

                    <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

                    <button
                      onClick={() => { setDropdownOpen(false); handleLogout(); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50
                             dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Inscription
                </Link>
              </>
            )}
          </div>

          {/* Boutons mobile */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2 rounded-md text-gray-600 hover:text-brand-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-brand-300 dark:hover:bg-gray-800"
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 py-3 space-y-1">
            {isAuthenticated && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2 border-b border-gray-100 dark:border-gray-800">
                <UserAvatar user={user} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
            )}

            <NavLink to="/" end className={navItem} onClick={() => setMenuOpen(false)}>
              Accueil
            </NavLink>
            <NavLink to="/rooms" className={navItem} onClick={() => setMenuOpen(false)}>
              Chambres
            </NavLink>

            {isAuthenticated && isClient && (
              <NavLink to="/mon-espace" className={navItem} onClick={() => setMenuOpen(false)}>
                Mon espace
              </NavLink>
            )}

            {isAuthenticated ? (
              <>
                <NavLink to="/mon-espace/profil" className={navItem} onClick={() => setMenuOpen(false)}>
                  Mon profil
                </NavLink>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </>
            ) : (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200"
                >
                  <LogIn className="h-4 w-4" />
                  Connexion
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-brand-600 text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  Inscription
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
