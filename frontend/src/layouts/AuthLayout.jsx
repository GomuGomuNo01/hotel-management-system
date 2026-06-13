import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

/**
 * AuthLayout - Navbar uniquement, sans footer.
 * Utilisé pour les pages login, register, vérification email, etc.
 */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
