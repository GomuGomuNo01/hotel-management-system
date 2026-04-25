import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, ScrollText, X, Crown } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { cn } from '../../utils/cn';

const links = [
  { to: '/owner', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owner/admins', label: 'Administrateurs', icon: ShieldCheck },
  { to: '/owner/audit', label: 'Audit', icon: ScrollText },
];

export default function OwnerSidebar() {
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-gray-100 transform transition-transform lg:translate-x-0 lg:static lg:inset-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-800">
          <div className="flex items-center gap-2 font-bold">
            <Crown className="h-5 w-5 text-yellow-400" />
            <span>Patron</span>
          </div>
          <button className="lg:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>
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
                  isActive ? 'bg-gray-800 text-white font-medium' : 'text-gray-300 hover:bg-gray-800/60'
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
