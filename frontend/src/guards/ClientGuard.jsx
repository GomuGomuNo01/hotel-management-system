import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ClientGuard({ children }) {
  const { isAuthenticated, isClient } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isClient) return <Navigate to="/" replace />;
  return children;
}
