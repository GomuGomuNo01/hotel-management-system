import { useEffect }          from 'react';
import { Outlet }             from 'react-router-dom';
import OwnerSidebar           from '../components/owner/OwnerSidebar';
import AdminHeader            from '../components/admin/AdminHeader';
import { disconnectEcho }     from '../lib/echo';
import { useRealtimeToasts }  from '../hooks/useRealtimeToasts';

export default function OwnerLayout() {
  // Toasts temps-réel discrets pour le patron
  useRealtimeToasts({ role: 'owner' });

  // Déconnecte Echo quand le patron quitte son espace (déconnexion / route publique)
  useEffect(() => {
    return () => {
      disconnectEcho();
    };
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <OwnerSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader title="Espace Patron" profilePath="/owner/profil" />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
