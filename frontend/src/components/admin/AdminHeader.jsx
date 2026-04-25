import { Menu, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useUiStore } from '../../store/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';

export default function AdminHeader({ title = 'Espace Administrateur' }) {
  const { toggleSidebar } = useUiStore();
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(role); } catch (e) { /* ignore */ }
    logout();
    toast.success('Déconnexion réussie.');
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-gray-600" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base lg:text-lg font-semibold text-gray-800">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 hidden sm:flex items-center gap-1">
          <User className="h-4 w-4" />
          {user?.first_name || user?.full_name}
        </span>
        <button onClick={handleLogout} className="btn-secondary">
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </div>
    </header>
  );
}
