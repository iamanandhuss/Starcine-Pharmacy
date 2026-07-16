import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: import('../context/AuthContext').UserRole[];
  /** Where to redirect if unauthorized. Defaults to role-based home. */
  redirectTo?: string;
}

const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Authorizing...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-dark-50 dark:bg-dark-950 text-dark-900 dark:text-dark-100 transition-colors duration-300">
    <div className="relative flex items-center justify-center">
      <div className="h-4 w-4 bg-brand-500 rounded-full animate-ping absolute" />
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-dark-200 dark:border-dark-800 border-t-brand-500 dark:border-t-brand-400" />
    </div>
    <p className="mt-4 text-xs font-semibold tracking-wider text-dark-500 dark:text-dark-400 uppercase animate-pulse">
      {message}
    </p>
  </div>
);

export const RoleRoute: React.FC<RoleRouteProps> = ({
  children,
  allowedRoles,
  redirectTo,
}) => {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(role)) {
    // Redirect unauthorized users to their home dashboard
    const fallback =
      redirectTo ??
      (role === 'super_admin'
        ? '/super-admin/dashboard'
        : role === 'store_admin'
        ? '/store/dashboard'
        : '/dashboard');

    console.warn(`Role '${role}' is not authorized for this route. Redirecting to ${fallback}`);
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

/** Convenience wrapper: Super Admin only */
export const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleRoute allowedRoles={['super_admin']}>{children}</RoleRoute>
);

/** Convenience wrapper: Super Admin or Store Admin */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleRoute allowedRoles={['super_admin', 'store_admin']}>{children}</RoleRoute>
);

export { LoadingScreen };
