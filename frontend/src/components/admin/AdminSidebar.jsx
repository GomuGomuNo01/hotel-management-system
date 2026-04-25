import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BedDouble, CalendarCheck, Users, LogIn as CheckInIcon, X, Hotel } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { cn } from '../../utils/cn';

const links = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/rooms', label: 'Chambres', icon: BedDouble },
  { to: '/admin/reservations', label: 'Réservations', icon: CalendarCheck },
  { to: '/admin/clients', label: 'Clients', icon: Users },
  { to: '/admin/checkin-checkout', label: 'Check-in / Check-out', icon: CheckInIcon },
];

export default function AdminSidebar() {
  const { sidebarOpen, setSidebarOpen } = useUiStore();
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
        <div className="flex items-center justify-between h-16 px-5 border-b">
          <div className="flex items-center gap-2 font-bold text-brand-600">
            <Hotel className="h-5 w-5" />
            <span>Admin</span>
          </div>
          <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                  isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                )
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
