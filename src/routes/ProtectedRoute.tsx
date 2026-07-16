import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from './RoleRoute';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function getSuperAdminRedirect(pathname: string): string | null {
  if (pathname.startsWith('/super-admin')) return null;

  if (pathname === '/' || pathname === '/dashboard' || pathname === '/store/dashboard' || pathname === '/admin/dashboard') {
    return '/super-admin/dashboard';
  }
  if (pathname === '/employees') return '/super-admin/employees';
  if (pathname.startsWith('/employees/')) {
    const id = pathname.split('/').pop();
    return `/super-admin/employees/${id}`;
  }
  if (pathname === '/attendance') return '/super-admin/attendance';
  if (pathname === '/tasks') return '/super-admin/tasks';
  if (pathname === '/deliveries') return '/super-admin/deliveries';
  if (pathname === '/reports') return '/super-admin/reports';
  if (pathname === '/documents') return '/super-admin/documents';
  if (pathname === '/profile') return '/super-admin/profile';
  if (pathname === '/settings') return '/super-admin/settings';

  return null;
}

function getStoreAdminRedirect(pathname: string): string | null {
  if (pathname.startsWith('/super-admin')) return '/store/dashboard';
  if (pathname.startsWith('/store')) return null;

  if (pathname === '/' || pathname === '/dashboard' || pathname === '/store/dashboard') {
    return '/store/dashboard';
  }
  if (pathname === '/employees') return '/store/employees';
  if (pathname.startsWith('/employees/')) {
    const id = pathname.split('/').pop();
    return `/store/employees/${id}`;
  }
  if (pathname === '/attendance') return '/store/attendance';
  if (pathname === '/tasks') return '/store/checklist';
  if (pathname === '/deliveries') return '/store/deliveries';
  if (pathname === '/reports') return '/store/reports';
  if (pathname === '/profile') return '/store/profile';
  if (pathname === '/settings') return '/store/settings';

  return null;
}

/**
 * Guards any route requiring authentication.
 * Redirects super admin and store admin users trying to access general or employee paths
 * to their corresponding console paths.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isSuperAdmin, isStoreAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen message="Loading Session..." />;
  if (!user) return <Navigate to="/login" replace />;

  if (isSuperAdmin) {
    const superAdminPath = getSuperAdminRedirect(location.pathname);
    if (superAdminPath) {
      console.log(`Super Admin auto-redirected: ${location.pathname} -> ${superAdminPath}`);
      return <Navigate to={superAdminPath} replace />;
    }
  }

  if (isStoreAdmin) {
    const storeAdminPath = getStoreAdminRedirect(location.pathname);
    if (storeAdminPath) {
      console.log(`Store Admin auto-redirected: ${location.pathname} -> ${storeAdminPath}`);
      return <Navigate to={storeAdminPath} replace />;
    }
  }

  return <>{children}</>;
};
