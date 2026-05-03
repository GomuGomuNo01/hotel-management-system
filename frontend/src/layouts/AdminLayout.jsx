import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import ForcePasswordChange from '../components/admin/ForcePasswordChange';
import { useAuth } from '../hooks/useAuth';

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay bloquant si le mot de passe temporaire n'a pas encore été changé */}
      {user?.must_change_password && <ForcePasswordChange />}
    </div>
  );
}
