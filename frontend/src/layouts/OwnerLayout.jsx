import { Outlet } from 'react-router-dom';
import OwnerSidebar from '../components/owner/OwnerSidebar';
import AdminHeader from '../components/admin/AdminHeader';

export default function OwnerLayout() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <OwnerSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader title="Espace Patron" />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
