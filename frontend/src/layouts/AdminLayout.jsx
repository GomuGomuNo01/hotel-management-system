import { useEffect }            from 'react';
import { Outlet }               from 'react-router-dom';
import AdminSidebar             from '../components/admin/AdminSidebar';
import AdminHeader              from '../components/admin/AdminHeader';
import ForcePasswordChange      from '../components/admin/ForcePasswordChange';
import { useAuth }              from '../hooks/useAuth';
import { useBadgeSync }         from '../hooks/useBadgeSync';
import { useRealtimeToasts }    from '../hooks/useRealtimeToasts';
import { disconnectEcho }       from '../lib/echo';

export default function AdminLayout() {
  const { user } = useAuth();

  // Synchronisation centralisée des bulles de notification (polling + WebSocket)
  useBadgeSync();

  // Toasts temps-réel pour alerter l'admin des actions importantes
  // currentUserId permet de ne pas doubler le toast quand l'admin déclenche lui-même l'action
  useRealtimeToasts({ role: 'admin', currentUserId: user?.id });

  // Déconnecte Echo quand l'admin quitte le layout (déconnexion / route publique)
  useEffect(() => {
    return () => {
      disconnectEcho();
    };
  }, []);

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
