import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BedDouble, CalendarCheck, Users, LogIn as CheckInIcon,
  X, Hotel, User, RotateCcw, BarChart2, ShieldCheck,
  MessageSquareWarning, Star,
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

/*
 * Chaque lien peut avoir une permission requise.
 * Dashboard et Mon profil sont toujours visibles.
 *
 * badge : clé dans badgeCounts du store  (refunds | deposits)
 * badgeColor : couleur Tailwind de la bulle
 */
const NAV_LINKS = [
  // ── Vue d'ensemble ───────────────────────────────────────────────────
  { to: '/admin',                  end: true, label: 'Tableau de bord',  icon: LayoutDashboard },
  // ── Opérations quotidiennes (cœur du métier) ─────────────────────────
  { to: '/admin/checkin-checkout', label: 'Arrivées & Départs',           icon: CheckInIcon,  permission: 'manage_checkin_checkout', badge: 'checkins', badgeColor: 'bg-blue-500' },
  { to: '/admin/reservations',     label: 'Réservations',                icon: CalendarCheck, permission: 'manage_reservations', badge: 'deposits', badgeColor: 'bg-amber-500' },
  // ── Référentiel ──────────────────────────────────────────────────────
  { to: '/admin/clients',          label: 'Clients',                     icon: Users,         permission: 'manage_clients' },
  { to: '/admin/rooms',            label: 'Chambres',                    icon: BedDouble,    permission: 'manage_rooms' },
  // ── Financier & litiges ──────────────────────────────────────────────
  { to: '/admin/remboursements',   label: 'Remboursements',              icon: RotateCcw,    permission: 'manage_payments', badge: 'refunds', badgeColor: 'bg-red-500' },
  { to: '/admin/reclamations',     label: 'Réclamations',                icon: MessageSquareWarning, permission: 'manage_complaints', badge: 'complaints', badgeColor: 'bg-orange-500' },
  // ── Pilotage & traçabilité ───────────────────────────────────────────
  { to: '/admin/rapports',         label: 'Rapports financiers',         icon: BarChart2,    permission: 'view_reports' },
  { to: '/admin/audit-summary',    label: "Journal d'audit",             icon: ShieldCheck,  permission: 'view_audit_summary' },
  { to: '/admin/avis',             label: 'Avis clients',                icon: Star,         permission: 'view_reviews' },
  // ── Personnel ────────────────────────────────────────────────────────
  { to: '/admin/profil',           label: 'Mon profil',                  icon: User },
];

export default function AdminSidebar() {
  const { sidebarOpen, setSidebarOpen, badgeCounts } = useUiStore();
  const { user } = useAuth();

  const userPerms    = new Set(user?.permissions ?? []);
  const visibleLinks = NAV_LINKS.filter((l) => !l.permission || userPerms.has(l.permission));

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
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
            const count = l.badge ? (badgeCounts[l.badge] ?? 0) : 0;
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
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-black tabular-nums shadow-sm ${l.badgeColor}`}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
