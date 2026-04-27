import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ClientGuard({ children }) {
  const { isAuthenticated, isClient, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isClient) return <Navigate to="/" replace />;

  /* Rediriger vers la page de vérification si l'e-mail n'est pas confirmé */
  if (!user?.email_verified_at) {
    return <Navigate to={`/verifier-email?email=${encodeURIComponent(user?.email || '')}`} replace />;
  }

  return children;
}
