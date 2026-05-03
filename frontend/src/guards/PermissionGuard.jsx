import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Protège une route admin par permission.
 * Si l'utilisateur n'a pas la permission requise → redirige vers /admin.
 */
export default function PermissionGuard({ permission, children }) {
  const { user } = useAuth();
  const perms = new Set(user?.permissions ?? []);

  if (!perms.has(permission)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
