import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Hotel, LogIn, LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

const navItem = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-700 hover:text-brand-600'
  }`;

export default function Navbar() {
  const { isAuthenticated, isClient, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) { /* ignore */ }
    logout();
    toast.success('Déconnexion réussie.');
    navigate('/');
  };

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
              <>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {user?.first_name || user?.full_name || 'Utilisateur'}
                </span>
                <button onClick={handleLogout} className="btn-secondary">
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
              </>
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
            <NavLink to="/" end className={navItem} onClick={() => setOpen(false)}>Accueil</NavLink>
            <NavLink to="/rooms" className={navItem} onClick={() => setOpen(false)}>Chambres</NavLink>
            {isClient && <NavLink to="/mon-espace" className={navItem} onClick={() => setOpen(false)}>Mon espace</NavLink>}
            {isAuthenticated ? (
              <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm text-gray-700">Déconnexion</button>
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
