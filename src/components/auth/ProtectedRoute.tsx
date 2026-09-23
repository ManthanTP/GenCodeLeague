import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  requiredRole?: 'team_leader' | 'captain' | 'admin' | 'super_admin' | 'participant';
  allowTeamLeaderOrAdmin?: boolean;
}

export function ProtectedRoute({ requiredRole, allowTeamLeaderOrAdmin }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isAdmin, isTeamLeader } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Authenticating GCL session..." />
      </div>
    );
  }

  // 1. Admin route protection
  if (requiredRole === 'admin' || requiredRole === 'super_admin') {
    if (!isAuthenticated) {
      return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    }
    if (!isAdmin) {
      return <Navigate to="/admin/login?error=unauthorized" replace />;
    }
    return <Outlet />;
  }

  // 2. Team Leader route protection
  if (requiredRole === 'team_leader' || requiredRole === 'captain' || allowTeamLeaderOrAdmin) {
    if (!isAuthenticated) {
      return <Navigate to={`/team/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    }
    if (!isTeamLeader && !isAdmin) {
      return <Navigate to="/team/login?error=no_team" replace />;
    }
    return <Outlet />;
  }

  // 3. Generic authenticated routes
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
}
