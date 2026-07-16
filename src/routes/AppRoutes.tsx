import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute, SuperAdminRoute, AdminRoute } from './RoleRoute';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';

// ── Auth Pages ──────────────────────────────────────────────────────────────
import { Login } from '../pages/auth/Login';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';
import { InviteSetPassword } from '../pages/auth/InviteSetPassword';

// ── Public Pages ────────────────────────────────────────────────────────────
import { Home } from '../pages/Home';
import { NotFound } from '../pages/NotFound';

// ── Dashboards ──────────────────────────────────────────────────────────────
import { SuperAdminDashboard } from '../pages/dashboard/SuperAdminDashboard';
import { StoreDashboard } from '../pages/dashboard/StoreDashboard';
import { EmployeeDashboard } from '../pages/dashboard/EmployeeDashboard';
import { AdminDashboard } from '../pages/admin/AdminDashboard';

// ── Store Management (Super Admin only) ─────────────────────────────────────
import { StoreList } from '../pages/stores/StoreList';
import { StoreDetail } from '../pages/stores/StoreDetail';

// ── Shared Pages (access varies by role — scoped in the page itself) ─────────
import { EmployeeList } from '../pages/employees/EmployeeList';
import { EmployeeProfile } from '../pages/employees/EmployeeProfile';
import { Attendance } from '../pages/attendance/Attendance';
import { TaskManager } from '../pages/tasks/TaskManager';
import { DocumentManager } from '../pages/documents/DocumentManager';
import { Reports } from '../pages/reports/Reports';
import { HomeDelivery } from '../pages/delivery/HomeDelivery';
import { Profile } from '../pages/profile/Profile';

// ── Super Admin Configured Pages ───────────────────────────────────────────
import { Branches } from '../pages/super-admin/Branches';
import { Departments } from '../pages/super-admin/Departments';
import { Roles } from '../pages/super-admin/Roles';
import { Users } from '../pages/super-admin/Users';
import { Leaves } from '../pages/super-admin/Leaves';
import { Shifts } from '../pages/super-admin/Shifts';
import { Blueprints } from '../pages/super-admin/Blueprints';
import { Assets } from '../pages/super-admin/Assets';
import { Racks } from '../pages/super-admin/Racks';
import { Grooming } from '../pages/super-admin/Grooming';
import { Issues } from '../pages/super-admin/Issues';
import { Sales } from '../pages/super-admin/Sales';
import { Scores } from '../pages/super-admin/Scores';
import { Health } from '../pages/super-admin/Health';
import { Championship } from '../pages/super-admin/Championship';
import { Settings } from '../pages/super-admin/Settings';
import { AuditLogs } from '../pages/super-admin/AuditLogs';

// ── Store Admin Configured Pages ─────────────────────────────────────────────
import { StoreEmployees } from '../pages/store-admin/StoreEmployees';
import { StoreAttendance } from '../pages/store-admin/StoreAttendance';
import { StoreLayout } from '../pages/store-admin/StoreLayout';
import { StoreRacks } from '../pages/store-admin/StoreRacks';
import { StoreGrooming } from '../pages/store-admin/StoreGrooming';
import { StoreIssues } from '../pages/store-admin/StoreIssues';
import { StoreDeliveries } from '../pages/store-admin/StoreDeliveries';
import { StoreSales } from '../pages/store-admin/StoreSales';
import { StoreChecklist } from '../pages/store-admin/StoreChecklist';
import { StorePerformance } from '../pages/store-admin/StorePerformance';
import { StoreReports } from '../pages/store-admin/StoreReports';
import { StoreSettings } from '../pages/store-admin/StoreSettings';

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const StoreAdminProtected: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Protected>
    <RoleRoute allowedRoles={['store_admin', 'super_admin']}>
      {children}
    </RoleRoute>
  </Protected>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* ── Public Landing ─────────────────────────────────────────────── */}
      <Route path="/" element={<Home />} />

      {/* ── Auth (no AppLayout) ────────────────────────────────────────── */}
      <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
      <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />

      {/* Invite activation — uses AuthLayout, Supabase sets session via URL hash */}
      <Route path="/invite" element={<AuthLayout><InviteSetPassword /></AuthLayout>} />

      {/* ── Super Admin Routes ─────────────────────────────────────────── */}
      <Route
        path="/super-admin/dashboard"
        element={
          <Protected>
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/stores"
        element={
          <Protected>
            <SuperAdminRoute>
              <StoreList />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/stores/:id"
        element={
          <Protected>
            <SuperAdminRoute>
              <StoreDetail />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/employees"
        element={
          <Protected>
            <SuperAdminRoute>
              <EmployeeList />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/employees/:id"
        element={
          <Protected>
            <SuperAdminRoute>
              <EmployeeProfile />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/attendance"
        element={
          <Protected>
            <SuperAdminRoute>
              <Attendance />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/tasks"
        element={
          <Protected>
            <SuperAdminRoute>
              <TaskManager />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/deliveries"
        element={
          <Protected>
            <SuperAdminRoute>
              <HomeDelivery />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/reports"
        element={
          <Protected>
            <SuperAdminRoute>
              <Reports />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/documents"
        element={
          <Protected>
            <SuperAdminRoute>
              <DocumentManager />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/controls"
        element={
          <Protected>
            <SuperAdminRoute>
              <AdminDashboard />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/profile"
        element={
          <Protected>
            <SuperAdminRoute>
              <Profile />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/branches"
        element={
          <Protected>
            <SuperAdminRoute>
              <Branches />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/departments"
        element={
          <Protected>
            <SuperAdminRoute>
              <Departments />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/roles"
        element={
          <Protected>
            <SuperAdminRoute>
              <Roles />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/users"
        element={
          <Protected>
            <SuperAdminRoute>
              <Users />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/leave"
        element={
          <Protected>
            <SuperAdminRoute>
              <Leaves />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/shifts"
        element={
          <Protected>
            <SuperAdminRoute>
              <Shifts />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/layouts"
        element={
          <Protected>
            <SuperAdminRoute>
              <Blueprints />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/assets"
        element={
          <Protected>
            <SuperAdminRoute>
              <Assets />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/racks"
        element={
          <Protected>
            <SuperAdminRoute>
              <Racks />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/grooming"
        element={
          <Protected>
            <SuperAdminRoute>
              <Grooming />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/issues"
        element={
          <Protected>
            <SuperAdminRoute>
              <Issues />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/sales"
        element={
          <Protected>
            <SuperAdminRoute>
              <Sales />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/scores"
        element={
          <Protected>
            <SuperAdminRoute>
              <Scores />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/health"
        element={
          <Protected>
            <SuperAdminRoute>
              <Health />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/championship"
        element={
          <Protected>
            <SuperAdminRoute>
              <Championship />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/settings"
        element={
          <Protected>
            <SuperAdminRoute>
              <Settings />
            </SuperAdminRoute>
          </Protected>
        }
      />
      <Route
        path="/super-admin/audit"
        element={
          <Protected>
            <SuperAdminRoute>
              <AuditLogs />
            </SuperAdminRoute>
          </Protected>
        }
      />

      {/* ── Store Admin Dashboard ──────────────────────────────────────── */}
      <Route
        path="/store/dashboard"
        element={
          <Protected>
            <RoleRoute allowedRoles={['store_admin', 'super_admin']}>
              <StoreDashboard />
            </RoleRoute>
          </Protected>
        }
      />

      {/* ── Store Admin Pages ─────────────────────────────────────────── */}
      <Route path="/store/employees" element={<StoreAdminProtected><StoreEmployees /></StoreAdminProtected>} />
      <Route path="/store/attendance" element={<StoreAdminProtected><StoreAttendance /></StoreAdminProtected>} />
      <Route path="/store/leave" element={<StoreAdminProtected><StoreAttendance /></StoreAdminProtected>} />
      <Route path="/store/layouts" element={<StoreAdminProtected><StoreLayout /></StoreAdminProtected>} />
      <Route path="/store/assets" element={<StoreAdminProtected><StoreLayout /></StoreAdminProtected>} />
      <Route path="/store/racks" element={<StoreAdminProtected><StoreRacks /></StoreAdminProtected>} />
      <Route path="/store/products" element={<StoreAdminProtected><StoreRacks /></StoreAdminProtected>} />
      <Route path="/store/grooming" element={<StoreAdminProtected><StoreGrooming /></StoreAdminProtected>} />
      <Route path="/store/issues" element={<StoreAdminProtected><StoreIssues /></StoreAdminProtected>} />
      <Route path="/store/deliveries" element={<StoreAdminProtected><StoreDeliveries /></StoreAdminProtected>} />
      <Route path="/store/sales" element={<StoreAdminProtected><StoreSales /></StoreAdminProtected>} />
      <Route path="/store/checklist" element={<StoreAdminProtected><StoreChecklist /></StoreAdminProtected>} />
      <Route path="/store/performance" element={<StoreAdminProtected><StorePerformance /></StoreAdminProtected>} />
      <Route path="/store/reports" element={<StoreAdminProtected><StoreReports /></StoreAdminProtected>} />
      <Route path="/store/settings" element={<StoreAdminProtected><StoreSettings /></StoreAdminProtected>} />
      <Route path="/store/profile" element={<StoreAdminProtected><Profile /></StoreAdminProtected>} />

      {/* ── Employee Dashboard ─────────────────────────────────────────── */}
      <Route
        path="/dashboard"
        element={
          <Protected>
            <EmployeeDashboard />
          </Protected>
        }
      />

      {/* ── Shared Protected Routes (scoped per role inside the page) ────── */}
      <Route path="/employees" element={<Protected><AdminRoute><EmployeeList /></AdminRoute></Protected>} />
      <Route path="/employees/:id" element={<Protected><AdminRoute><EmployeeProfile /></AdminRoute></Protected>} />
      <Route path="/attendance" element={<Protected><Attendance /></Protected>} />
      <Route path="/tasks" element={<Protected><TaskManager /></Protected>} />
      <Route path="/documents" element={<Protected><DocumentManager /></Protected>} />
      <Route path="/reports" element={<Protected><AdminRoute><Reports /></AdminRoute></Protected>} />
      <Route path="/deliveries" element={<Protected><HomeDelivery /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />

      {/* ── Legacy redirect from old admin dashboard ───────────────────── */}
      <Route path="/admin/dashboard" element={<Navigate to="/super-admin/dashboard" replace />} />

      {/* ── 404 ────────────────────────────────────────────────────────── */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};
