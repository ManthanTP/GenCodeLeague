import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  requiredRole?: 'participant' | 'captain' | 'admin' | 'super_admin';
  allowCaptainOrAdmin?: boolean;
}

export function ProtectedRoute({ requiredRole, allowCaptainOrAdmin }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, isAdmin, isCaptain } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowCaptainOrAdmin && !(isCaptain || isAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole === 'captain' && !(isCaptain || isAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
