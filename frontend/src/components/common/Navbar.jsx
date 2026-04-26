import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Hotel, LogIn, LogOut, User, Menu, X, ChevronDown, LayoutDashboard } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

const navItem = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-700 hover:text-brand-600'
  }`;

function UserAvatar({ user, size = 'md' }) {
  const sizeClasses = size === 'md' ? 'h-9 w-9 text-sm' : 'h-8 w-8 text-xs';
  const initials = (() => {
    if (user?.first_name && user?.last_name)
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    if (user?.full_name) {
      const parts = user.full_name.trim().split(' ');
      return parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : parts[0][0].toUpperCase();
    }
    if (user?.first_name) return user.first_name[0].toUpperCase();
    return 'U';
  })();

  if (user?.avatar_url || user?.profile_picture) {
    return (
      <img
        src={user.avatar_url || user.profile_picture}
        alt={initials}
        className={`${sizeClasses} rounded-full object-cover ring-2 ring-brand-100`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold ring-2 ring-brand-100`}
    >
      {initials}
    </div>
  );
}

export default function Navbar() {
  const { isAuthenticated, isClient, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) { /* ignore */ }
    logout();
    setDropdownOpen(false);
    toast.success('Déconnexion réussie.');
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : user?.full_name || 'Utilisateur';

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-brand-600 font-bold text-lg">
            <Hotel className="h-6 w-6" />
            <span>{import.meta.env.VITE_APP_NAME || 'Hotel Management'}</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navItem}>Accueil</NavLink>
            <NavLink to="/rooms" className={navItem}>Chambres</NavLink>
            {isClient && <NavLink to="/mon-espace" className={navItem}>Mon espace</NavLink>}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  <UserAvatar user={user} size="md" />
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-black/5 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                    </div>

                    {isClient && (
                      <Link
                        to="/mon-espace"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4 text-gray-400" />
                        Mon espace
                      </Link>
                    )}

                    <Link
                      to="/mon-espace/profil"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      Mon profil
                    </Link>

                    <div className="border-t border-gray-100 mt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-secondary"><LogIn className="h-4 w-4" /> Connexion</Link>
                <Link to="/register" className="btn-primary">Inscription</Link>
              </>
            )}
          </div>

          <button className="md:hidden text-gray-600" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 space-y-1">
            {isAuthenticated && (
              <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 mb-2">
                <UserAvatar user={user} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{displayName}</p>
                  <p className="text-xs text-gray-500">{user?.email || ''}</p>
                </div>
              </div>
            )}
            <NavLink to="/" end className={navItem} onClick={() => setOpen(false)}>Accueil</NavLink>
            <NavLink to="/rooms" className={navItem} onClick={() => setOpen(false)}>Chambres</NavLink>
            {isClient && <NavLink to="/mon-espace" className={navItem} onClick={() => setOpen(false)}>Mon espace</NavLink>}
            {isAuthenticated ? (
              <>
                <Link to="/mon-espace/profil" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700" onClick={() => setOpen(false)}>
                  <User className="h-4 w-4" /> Mon profil
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600">
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-3 py-2 text-sm text-gray-700" onClick={() => setOpen(false)}>Connexion</Link>
                <Link to="/register" className="block px-3 py-2 text-sm text-brand-600" onClick={() => setOpen(false)}>Inscription</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
