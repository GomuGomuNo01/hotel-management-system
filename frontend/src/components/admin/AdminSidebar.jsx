import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BedDouble, CalendarCheck, Users, LogIn as CheckInIcon,
  X, Hotel, User, ExternalLink, RotateCcw,
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../api/admin.api';
import { cn } from '../../utils/cn';

/*
 * Chaque lien peut avoir une permission requise.
 * Dashboard et Mon profil sont toujours visibles.
 */
const NAV_LINKS = [
  { to: '/admin',                  end: true, label: 'Dashboard',         icon: LayoutDashboard },
  { to: '/admin/rooms',            label: 'Chambres',                     icon: BedDouble,    permission: 'manage_rooms' },
  { to: '/admin/reservations',     label: 'Réservations',                 icon: CalendarCheck, permission: 'manage_reservations' },
  { to: '/admin/clients',          label: 'Clients',                      icon: Users,         permission: 'manage_clients' },
  { to: '/admin/checkin-checkout', label: 'Check-in / Check-out',         icon: CheckInIcon,  permission: 'manage_checkin_checkout' },
  { to: '/admin/remboursements',   label: 'Remboursements',               icon: RotateCcw,    permission: 'manage_payments', badge: 'refunds' },
  { to: '/admin/profil',           label: 'Mon profil',                   icon: User },
];

/* Rafraîchit le badge remboursements toutes les 30 s
   ET immédiatement quand badgeSignal change */
function useNavBadges() {
  const [refunds, setRefunds]   = useState(0);
  const { badgeSignal }         = useUiStore();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await adminApi.refunds.list({ status: 'pending', per_page: 1 });
        if (!cancelled) setRefunds(res?.meta?.total ?? 0);
      } catch { /* silencieux */ }
    };

    load();
    const timer = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [badgeSignal]); // rechargement immédiat quand badgeSignal change

  return { refunds };
}

export default function AdminSidebar() {
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const { user } = useAuth();
  const badges = useNavBadges();

  /* Ensemble des permissions de l'utilisateur courant */
  const userPerms = new Set(user?.permissions ?? []);

  /* Filtre les liens selon les permissions */
  const visibleLinks = NAV_LINKS.filter((l) =>
    !l.permission || userPerms.has(l.permission)
  );

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:static lg:inset-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200">
          <Link to="/admin" className="flex items-center gap-2 font-bold text-brand-600">
            <Hotel className="h-5 w-5" />
            <span>Admin</span>
          </Link>
          <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {visibleLinks.map((l) => {
            const badgeCount = l.badge ? (badges[l.badge] ?? 0) : 0;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  )
                }
              >
                <l.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{l.label}</span>
                {badgeCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black tabular-nums shadow-sm">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="border-t border-gray-100 my-3" />

          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Voir le site public
          </Link>
        </nav>
      </aside>
    </>
  );
}
