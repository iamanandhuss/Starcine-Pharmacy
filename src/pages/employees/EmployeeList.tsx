import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@supabase/supabase-js';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';

// Initialize a non-persisting Supabase client for safe admin signups
const tempSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'Active' | 'Offline';
  employee_code: string;
  store_name?: string;
  store_id?: string;
  approval_status?: string;
}

// Zod Schema for creating/inviting a new employee with all database fields
const inviteSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  joining_date: z.string().optional().or(z.literal('')),
  role_id: z.string().min(1, 'Role selection is required'),
  department_id: z.string().optional().or(z.literal('')),
  branch_id: z.string().min(1, 'Store branch selection is required'),
  address: z.string().optional().or(z.literal('')),
  emergency_contact_name: z.string().optional().or(z.literal('')),
  emergency_contact_phone: z.string().optional().or(z.literal('')),
  employee_code: z.string().optional().or(z.literal('')),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

// Keep edit schema separate
const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  role: z.enum(['Pharmacist', 'Cashier', 'Delivery Staff', 'Staff']),
  status: z.enum(['Active', 'Offline']),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, isStoreAdmin, profile } = useAuth();
  const { selectedStoreId } = useStore();

  // Database employee data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  // Active tab: 'active' | 'pending' | 'all'
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'all'>('active');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modals / Drawers state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Toasts state
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  const handleApprove = async (emp: Employee) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          approval_status: 'approved',
          approved_by: profile?.id || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', emp.id);

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id
            ? { ...e, approval_status: 'approved' }
            : e
        )
      );
      showToast(`Employee "${emp.name}" approved successfully!`, 'success');
    } catch (err: any) {
      console.error('Approval failed:', err);
      showToast(`Error: ${err.message}`, 'info');
    }
  };

  const handleReject = async (emp: Employee) => {
    const confirmed = window.confirm(`Are you sure you want to reject "${emp.name}"?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          approval_status: 'rejected'
        })
        .eq('id', emp.id);

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id
            ? { ...e, approval_status: 'rejected' }
            : e
        )
      );
      showToast(`Employee "${emp.name}" rejected.`, 'info');
    } catch (err: any) {
      console.error('Rejection failed:', err);
      showToast(`Error: ${err.message}`, 'info');
    }
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('id, employee_code, first_name, last_name, full_name, email, phone, is_active, created_at, approval_status, roles(name), branches!users_branch_id_fkey(id, name)')
        .order('full_name', { ascending: true });

      // Super Admin fetches all users to allow checking pending approvals globally.
      // Store Admin / Employee are restricted to their branch.
      if (!isSuperAdmin && selectedStoreId) {
        query = query.eq('branch_id', selectedStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: Employee[] = (data || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'No Name',
        email: u.email || '',
        phone: u.phone || '',
        role: u.roles?.name || 'Staff',
        status: u.is_active ? 'Active' : 'Offline',
        employee_code: u.employee_code || '—',
        store_name: u.branches?.name || '—',
        store_id: u.branches?.id || null,
        approval_status: u.approval_status || 'approved',
      }));
      setEmployees(mapped);
    } catch (err: any) {
      console.error('Error fetching employees:', err.message);
      showToast(`Failed to load employees: ${err.message}`, 'info');
    } finally {
      setLoading(false);
    }
  };

  // Form dropdown lookup states
  const [dbRoles, setDbRoles] = useState<{ id: string; name: string }[]>([]);
  const [dbDepartments, setDbDepartments] = useState<{ id: string; name: string }[]>([]);
  const [dbBranches, setDbBranches] = useState<{ id: string; name: string }[]>([]);

  // Function to load all foreign key lookup options
  const fetchFormLookups = async () => {
    try {
      const [rolesRes, deptsRes, branchesRes] = await Promise.all([
        supabase.from('roles').select('id, name').order('name', { ascending: true }),
        supabase.from('departments').select('id, name').order('name', { ascending: true }),
        supabase.from('branches').select('id, name').order('name', { ascending: true }),
      ]);

      if (rolesRes.error) console.error('Error fetching roles:', rolesRes.error.message);
      if (deptsRes.error) console.error('Error fetching departments:', deptsRes.error.message);
      if (branchesRes.error) console.error('Error fetching branches:', branchesRes.error.message);

      if (rolesRes.data) setDbRoles(rolesRes.data);
      if (deptsRes.data) setDbDepartments(deptsRes.data);
      if (branchesRes.data) setDbBranches(branchesRes.data);
    } catch (err: any) {
      console.error('Error loading lookup values:', err.message);
    }
  };

  // Generate a unique sequential employee code
  const generateEmployeeCode = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('employee_code')
        .like('employee_code', 'EMP%');

      if (error) throw error;

      const codes = (data || [])
        .map((u) => u.employee_code)
        .filter(Boolean) as string[];

      let maxNum = 0;
      codes.forEach((code) => {
        const match = code.match(/^EMP(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });

      const nextNum = maxNum + 1;
      return `EMP${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Failed to generate employee code sequential sequence:', err);
      // Fallback
      return 'EMP' + Math.floor(1000 + Math.random() * 9000);
    }
  };

  React.useEffect(() => {
    fetchEmployees();
    fetchFormLookups();
  }, [selectedStoreId]);

  // React Hook Form for Invite Employee
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    formState: { errors: errorsAdd },
    reset: resetAdd,
    setValue: setValueAdd,
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      gender: '',
      date_of_birth: '',
      joining_date: new Date().toISOString().split('T')[0],
      role_id: '',
      department_id: '',
      branch_id: selectedStoreId || '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      employee_code: '',
    },
  });

  // Sync selectedStoreId to form's branch_id
  React.useEffect(() => {
    if (selectedStoreId) {
      setValueAdd('branch_id', selectedStoreId);
    }
  }, [selectedStoreId, setValueAdd]);

  // React Hook Form for Edit Employee
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: errorsEdit },
    reset: resetEdit,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
  });

  // Filter Roster
  const filteredEmployees = employees.filter((emp) => {
    // Filter by tab
    if (activeTab === 'active' && emp.approval_status !== 'approved') return false;
    if (activeTab === 'pending' && emp.approval_status !== 'pending') return false;
    // (if 'all', we show everything)

    // Store filter (client-side for Active and All tabs only)
    if (activeTab !== 'pending' && selectedStoreId && emp.store_id !== selectedStoreId) {
      return false;
    }

    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Invite / Create Employee Handler
  const onAddSubmit = async (values: InviteFormValues) => {
    setInviting(true);
    try {
      // 1. Validate form values and foreign keys
      const selectedRole = dbRoles.find((r) => r.id === values.role_id);
      const selectedBranch = dbBranches.find((b) => b.id === values.branch_id);
      const selectedDept = values.department_id
        ? dbDepartments.find((d) => d.id === values.department_id)
        : null;

      if (!selectedRole) {
        showToast('Selected role is invalid or does not exist.', 'info');
        return;
      }
      if (!selectedBranch) {
        showToast('Selected store branch is invalid or does not exist.', 'info');
        return;
      }
      if (values.department_id && !selectedDept) {
        showToast('Selected department is invalid or does not exist.', 'info');
        return;
      }

      // 2. Validate email uniqueness in public.users
      const { data: emailCheck, error: emailCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('email', values.email.trim().toLowerCase())
        .maybeSingle();

      if (emailCheckError) {
        console.error('Email check query error:', emailCheckError);
      }
      if (emailCheck) {
        showToast('This email address is already in use by another user.', 'info');
        return;
      }

      // 3. Generate a unique sequential employee code if not manually set
      let code = values.employee_code?.trim();
      if (!code) {
        code = await generateEmployeeCode();
      } else {
        const { data: codeCheck } = await supabase
          .from('users')
          .select('id')
          .eq('employee_code', code)
          .maybeSingle();
        if (codeCheck) {
          showToast(`Employee code "${code}" is already in use.`, 'info');
          return;
        }
      }

      // 4. Create user in Supabase Authentication using the non-persisting client
      console.log('Registering employee in Supabase Auth:', values.email.trim());
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            first_name: values.first_name.trim(),
            last_name: values.last_name.trim(),
            full_name: `${values.first_name.trim()} ${values.last_name.trim()}`,
          },
        },
      });

      if (authError) {
        throw new Error(`Authentication SignUp failed: ${authError.message}`);
      }

      // Check for email enumeration protection (empty identities array if email exists in Auth)
      const identities = authData?.user?.identities;
      if (identities && identities.length === 0) {
        throw new Error('This email address is already registered in the system.');
      }

      const newAuthId = authData?.user?.id;
      if (!newAuthId) {
        throw new Error('Authentication user created but failed to return a valid User ID.');
      }

      console.log('Auth user created successfully with ID:', newAuthId);

      // 6. Insert record into public.users
      const initialApprovalStatus = isSuperAdmin ? 'approved' : 'pending';
      const payload = {
        auth_user_id: newAuthId,
        employee_code: code,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        full_name: `${values.first_name.trim()} ${values.last_name.trim()}`,
        email: values.email.trim().toLowerCase(),
        phone: values.phone?.trim() || null,
        gender: values.gender || null,
        date_of_birth: values.date_of_birth || null,
        joining_date: values.joining_date || null,
        role_id: values.role_id,
        department_id: values.department_id || null,
        branch_id: values.branch_id,
        profile_image: null,
        address: values.address?.trim() || null,
        emergency_contact_name: values.emergency_contact_name?.trim() || null,
        emergency_contact_phone: values.emergency_contact_phone?.trim() || null,
        is_active: true,
        approval_status: initialApprovalStatus,
      };

      console.log('Inserting profile payload into public.users:', payload);
      const { error: profileError } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'auth_user_id' });

      if (profileError) {
        // Rollback / warn clear error message about the orphan account
        console.error('Database user insert failed:', profileError);
        throw new Error(
          `Auth user was created successfully, but the database profile sync failed: ${profileError.message}`
        );
      }

      const successMsg = isSuperAdmin
        ? `Employee "${payload.full_name}" created successfully!`
        : `Employee "${payload.full_name}" created and pending approval by a Super Admin.`;
      showToast(successMsg, 'success');
      resetAdd();
      setIsAddModalOpen(false);
      await fetchEmployees();
    } catch (err: any) {
      console.error('Create employee failure:', err);
      showToast(`Error: ${err.message}`, 'info');
    } finally {
      setInviting(false);
    }
  };

  // Edit Employee Trigger
  const handleEditClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    resetEdit({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role as any,
      status: emp.status,
    });
    setIsEditDrawerOpen(true);
  };

  // Edit Employee Handler
  const onEditSubmit = async (values: EmployeeFormValues) => {
    if (!selectedEmployee) return;

    try {
      const nameParts = values.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          full_name: values.name,
          email: values.email,
          phone: values.phone,
          is_active: values.status === 'Active'
        })
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmployee.id
            ? { ...emp, name: values.name, email: values.email, phone: values.phone, role: values.role, status: values.status }
            : emp
        )
      );
      showToast(`Profile for "${values.name}" updated successfully.`, 'success');
    } catch (err: any) {
      showToast(`Error updating employee: ${err.message}`, 'info');
    } finally {
      setIsEditDrawerOpen(false);
      setSelectedEmployee(null);
    }
  };

  // Delete Employee Trigger
  const handleDeleteClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDeleteModalOpen(true);
  };

  // Delete Employee Handler
  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      setEmployees((prev) => prev.filter((emp) => emp.id !== selectedEmployee.id));
      showToast(`Staff member "${selectedEmployee.name}" deleted from roster.`, 'info');
    } catch (err: any) {
      showToast(`Error deleting employee: ${err.message}`, 'info');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedEmployee(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2.5 rounded-xl text-white">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark-900 dark:text-white">Staff Roster</h2>
            <p className="text-xs text-dark-500 dark:text-dark-400">
              Manage pharmacist licenses, technician access roles, and schedule hours.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Employee
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <Card.Content className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="w-full md:max-w-sm relative">
            <Search className="absolute left-3.5 h-4 w-4 text-dark-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search staff name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs py-2.5 pl-10 pr-4 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-full text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-200"
            />
          </div>

          {/* Filters Selectors */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs py-1.5 px-3 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-700 dark:text-dark-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                <option value="All">All Roles</option>
                <option value="Pharmacist">Pharmacist</option>
                <option value="Cashier">Cashier</option>
                <option value="Delivery Staff">Delivery Staff</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-3 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-700 dark:text-dark-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Offline">Offline</option>
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Tab bar */}
      <div className="flex border-b border-dark-200 dark:border-dark-800 gap-6 text-xs font-bold text-dark-500 dark:text-dark-400 px-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === 'active'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
              : 'hover:text-dark-700 dark:hover:text-dark-300'
          }`}
        >
          Active Staff ({employees.filter((e) => e.approval_status === 'approved').length})
        </button>

        {(isSuperAdmin || isStoreAdmin) && (
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 relative transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
                : 'hover:text-dark-700 dark:hover:text-dark-300'
            }`}
          >
            Pending Approval
            {employees.filter((e) => e.approval_status === 'pending').length > 0 && (
              <span className="bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                {employees.filter((e) => e.approval_status === 'pending').length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
              : 'hover:text-dark-700 dark:hover:text-dark-300'
          }`}
        >
          All Staff ({employees.length})
        </button>
      </div>

      {/* Roster Table Card */}
      <Card>
        <Card.Content className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                <th className="py-3 px-6">Staff Member</th>
                <th className="py-3 px-4">Role</th>
                {activeTab === 'all' && <th className="py-3 px-4">Approval Status</th>}
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Store Branch</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100 dark:divide-dark-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'all' ? 6 : 5} className="py-8 text-center text-dark-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent" />
                      Loading staff roster from database...
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'all' ? 6 : 5} className="py-8 text-center text-dark-400">
                    No employees matching the search filters were found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20 transition-colors">
                    {/* User profile details */}
                    <td
                      className="py-4 px-6 flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(`/employees/${emp.id}`)}
                    >
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center text-white text-xs font-extrabold group-hover:scale-105 transition-transform shadow-sm">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-dark-900 dark:text-white truncate group-hover:text-brand-500 transition-colors">{emp.name}</p>
                        <p className="text-[10px] text-dark-400 dark:text-dark-500 truncate">{emp.email}</p>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="py-4 px-4">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300">
                        {emp.role}
                      </span>
                    </td>

                     {/* Approval Status (only on All Staff tab) */}
                    {activeTab === 'all' && (
                      <td className="py-4 px-4">
                        {emp.approval_status === 'approved' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Approved
                          </span>
                        )}
                        {emp.approval_status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Pending Approval
                          </span>
                        )}
                        {emp.approval_status === 'rejected' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400">
                            Rejected
                          </span>
                        )}
                      </td>
                    )}

                    {/* Status badge */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${
                        emp.status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-dark-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          emp.status === 'Active' ? 'bg-green-500' : 'bg-dark-400'
                        }`} />
                        {emp.status}
                      </span>
                    </td>

                    {/* Store Branch */}
                    <td className="py-4 px-4 font-semibold text-dark-700 dark:text-dark-300">
                      {emp.store_name || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-1 shrink-0 whitespace-nowrap">
                      {emp.approval_status === 'pending' ? (
                        <div className="inline-flex gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-xs px-2.5 py-1"
                            onClick={() => handleApprove(emp)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="text-xs px-2.5 py-1"
                            onClick={() => handleReject(emp)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            leftIcon={<Eye className="h-3.5 w-3.5" />}
                            className="p-1 rounded text-dark-500 hover:bg-dark-50"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(emp)}
                            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                            className="p-1 rounded text-dark-500 hover:bg-dark-50"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(emp)}
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          />
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Employee"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitAdd(onAddSubmit)}
              leftIcon={<UserPlus className="h-4 w-4" />}
              isLoading={inviting}
            >
              Create Employee
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitAdd(onAddSubmit)} className="space-y-6" noValidate>
          {/* Section 1: Basic Information & Auth credentials */}
          <div>
            <h4 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3">Basic Information & Credentials</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name *"
                placeholder="e.g. Emily"
                error={errorsAdd.first_name?.message}
                {...registerAdd('first_name')}
                required
              />
              <Input
                label="Last Name *"
                placeholder="e.g. Watson"
                error={errorsAdd.last_name?.message}
                {...registerAdd('last_name')}
                required
              />
              <Input
                label="Email Address *"
                type="email"
                placeholder="emily@company.com"
                error={errorsAdd.email?.message}
                {...registerAdd('email')}
                required
              />
              <Input
                label="Temporary Password *"
                type="password"
                placeholder="Minimum 6 characters"
                error={errorsAdd.password?.message}
                {...registerAdd('password')}
                required
              />
              <Input
                label="Phone Number"
                placeholder="e.g. +1234567890"
                error={errorsAdd.phone?.message}
                {...registerAdd('phone')}
              />
              <Input
                label="Employee Code (Auto-generated if empty)"
                placeholder="e.g. EMP0042"
                error={errorsAdd.employee_code?.message}
                {...registerAdd('employee_code')}
              />
            </div>
          </div>

          <hr className="border-dark-100 dark:border-dark-800" />

          {/* Section 2: Store Assignment & Department / Role */}
          <div>
            <h4 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3">Store Assignment & Role</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-dark-500">
                  Staff Role *
                </label>
                <select
                  className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  {...registerAdd('role_id')}
                >
                  <option value="">— Select a role —</option>
                  {dbRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                {errorsAdd.role_id?.message && (
                  <span className="text-xs text-red-500 font-medium">{errorsAdd.role_id.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-dark-500">
                  Department
                </label>
                <select
                  className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  {...registerAdd('department_id')}
                >
                  <option value="">— Select a department —</option>
                  {dbDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {errorsAdd.department_id?.message && (
                  <span className="text-xs text-red-500 font-medium">{errorsAdd.department_id.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-dark-500">
                  Store Branch *
                </label>
                <select
                  className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  {...registerAdd('branch_id')}
                >
                  <option value="">— Select store branch —</option>
                  {dbBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                {errorsAdd.branch_id?.message && (
                  <span className="text-xs text-red-500 font-medium">{errorsAdd.branch_id.message}</span>
                )}
              </div>
            </div>
          </div>

          <hr className="border-dark-100 dark:border-dark-800" />

          {/* Section 3: Personal & Emergencies */}
          <div>
            <h4 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3">Personal & Contact Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-dark-500">
                  Gender
                </label>
                <select
                  className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  {...registerAdd('gender')}
                >
                  <option value="">— Select gender —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errorsAdd.gender?.message && (
                  <span className="text-xs text-red-500 font-medium">{errorsAdd.gender.message}</span>
                )}
              </div>

              <Input
                label="Date of Birth"
                type="date"
                error={errorsAdd.date_of_birth?.message}
                {...registerAdd('date_of_birth')}
              />

              <Input
                label="Joining Date"
                type="date"
                error={errorsAdd.joining_date?.message}
                {...registerAdd('joining_date')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="md:col-span-1">
                <Input
                  label="Address"
                  placeholder="Street details, City"
                  error={errorsAdd.address?.message}
                  {...registerAdd('address')}
                />
              </div>
              <Input
                label="Emergency Contact Name"
                placeholder="e.g. Robert Watson"
                error={errorsAdd.emergency_contact_name?.message}
                {...registerAdd('emergency_contact_name')}
              />
              <Input
                label="Emergency Contact Phone"
                placeholder="e.g. +1234567890"
                error={errorsAdd.emergency_contact_phone?.message}
                {...registerAdd('emergency_contact_phone')}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Drawer */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title={selectedEmployee ? `Edit Profile: ${selectedEmployee.name}` : 'Edit Employee'}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitEdit(onEditSubmit)}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4" noValidate>
          <Input
            label="Full Name"
            error={errorsEdit.name?.message}
            {...registerEdit('name')}
            required
          />

          <Input
            label="Email Address"
            type="email"
            error={errorsEdit.email?.message}
            {...registerEdit('email')}
            required
          />

          <Input
            label="Phone Number"
            error={errorsEdit.phone?.message}
            {...registerEdit('phone')}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-dark-500">
              Staff Role
            </label>
            <select
              className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              {...registerEdit('role')}
            >
              <option value="Pharmacist">Pharmacist</option>
              <option value="Cashier">Cashier</option>
              <option value="Delivery Staff">Delivery Staff</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-dark-500">
              Status
            </label>
            <select
              className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              {...registerEdit('status')}
            >
              <option value="Active">Active</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
        </form>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Employee Deletion"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete Employee
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-sm">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <p className="font-bold text-dark-900 dark:text-white">
              Are you sure you want to delete this staff member?
            </p>
            <p className="text-dark-500 text-xs leading-relaxed">
              This will permanently revoke system access for{' '}
              <span className="font-semibold text-dark-800 dark:text-dark-200">
                {selectedEmployee?.name}
              </span>{' '}
              ({selectedEmployee?.email}). This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
