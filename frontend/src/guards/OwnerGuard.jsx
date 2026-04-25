import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function OwnerGuard({ children }) {
  const { isAuthenticated, isOwner } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isOwner) return <Navigate to="/" replace />;
  return children;
}
