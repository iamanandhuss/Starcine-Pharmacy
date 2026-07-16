import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Store, Users, ClipboardList, Truck, ArrowLeft,
  MapPin, Phone, User, AlertCircle,
  RefreshCw, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RoleNameBadge } from '../../components/ui/RoleBadge';

interface StoreDetailInfo {
  id: string;
  name: string;
  store_code: string | null;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface EmployeeRow {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role_name: string;
}

interface TaskRow {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
}

interface DeliveryRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_method: string;
}

export const StoreDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [store, setStore] = useState<StoreDetailInfo | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStoreData = async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch Store Details
      const { data: storeData, error: storeError } = await supabase
        .from('branches')
        .select('*')
        .eq('id', id)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // 2. Fetch Employees, Tasks, Deliveries concurrently
      const [
        { data: employeesData, error: empError },
        { data: tasksData, error: taskError },
        { data: deliveriesData, error: delError }
      ] = await Promise.all([
        supabase.from('users').select('id, full_name, first_name, last_name, email, phone, roles(name)').eq('branch_id', id).eq('is_active', true),
        supabase.from('tasks').select('id, title, priority, status, due_date').eq('branch_id', id),
        supabase.from('home_deliveries').select('id, customer_name, customer_phone, status, payment_method').eq('branch_id', id)
      ]);

      if (empError) throw empError;
      if (taskError) throw taskError;
      if (delError) throw delError;

      setEmployees((employeesData || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        email: u.email || '',
        phone: u.phone || null,
        role_name: u.roles?.name || 'Staff'
      })));

      setTasks(tasksData || []);
      setDeliveries(deliveriesData || []);

    } catch (err: any) {
      console.error('Error fetching store detail:', err.message);
      setErrorMsg(err.message || 'Store details not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-dark-500">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-xs font-semibold">Loading store dashboard details...</p>
      </div>
    );
  }

  if (errorMsg || !store) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center max-w-md mx-auto">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <h3 className="text-base font-bold text-dark-900 dark:text-white">Failed to Load Store Details</h3>
        <p className="text-xs text-dark-500">{errorMsg || 'Store does not exist.'}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/super-admin/stores')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to Stores List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Back Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/super-admin/stores')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="p-2"
        />
        <div>
          <h2 className="text-xl font-bold text-dark-900 dark:text-white">{store.name} Dashboard</h2>
          <p className="text-xs text-dark-500 dark:text-dark-400">
            Store management and branch operational insights.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact details */}
        <Card className="md:col-span-1">
          <Card.Header>
            <Card.Title>Store Details</Card.Title>
            <Card.Description>Branch contact information</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-850 rounded-lg">
              <Store className="h-4 w-4 text-brand-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase font-bold text-dark-400 leading-tight">Store Code</p>
                <p className="font-semibold text-dark-800 dark:text-dark-200 truncate">{store.store_code || store.code}</p>
              </div>
            </div>

            {store.manager_name && (
              <div className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-850 rounded-lg">
                <User className="h-4 w-4 text-brand-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase font-bold text-dark-400 leading-tight">Store Manager</p>
                  <p className="font-semibold text-dark-800 dark:text-dark-200 truncate">{store.manager_name}</p>
                </div>
              </div>
            )}

            {store.address && (
              <div className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-850 rounded-lg">
                <MapPin className="h-4 w-4 text-brand-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase font-bold text-dark-400 leading-tight">Address</p>
                  <p className="font-semibold text-dark-800 dark:text-dark-200 truncate">{store.address}</p>
                </div>
              </div>
            )}

            {store.phone && (
              <div className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-850 rounded-lg">
                <Phone className="h-4 w-4 text-brand-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase font-bold text-dark-400 leading-tight">Phone Number</p>
                  <p className="font-semibold text-dark-800 dark:text-dark-200 truncate">{store.phone}</p>
                </div>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Store KPIs */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label: 'Active Staff', value: employees.length, icon: <Users className="h-5 w-5" />, color: 'text-brand-500 bg-brand-500/10' },
            { label: 'Pending Deliveries', value: deliveries.filter(d => d.status === 'Pending').length, icon: <Truck className="h-5 w-5" />, color: 'text-yellow-500 bg-yellow-500/10' },
            { label: 'Active Tasks', value: tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length, icon: <ClipboardList className="h-5 w-5" />, color: 'text-purple-500 bg-purple-500/10' },
            { label: 'Status', value: store.is_active ? 'Active' : 'Disabled', icon: <CheckCircle2 className="h-5 w-5" />, color: store.is_active ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10' }
          ].map(({ label, value, icon, color }) => (
            <Card key={label}>
              <Card.Content className="p-6 flex items-center gap-4">
                <div className={`p-3.5 rounded-xl ${color}`}>{icon}</div>
                <div>
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-black text-dark-900 dark:text-white leading-tight mt-0.5">{value}</p>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      </div>

      {/* Grid of details: Employees list and Tasks list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employees */}
        <Card>
          <Card.Header>
            <Card.Title>Store Staff ({employees.length})</Card.Title>
            <Card.Description>Employees assigned to this branch</Card.Description>
          </Card.Header>
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800 text-xs">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-dark-450">No employees assigned to this store branch.</td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20">
                      <td className="py-3 px-4 font-bold text-dark-900 dark:text-white">{emp.full_name}</td>
                      <td className="py-3 px-4"><RoleNameBadge roleName={emp.role_name} /></td>
                      <td className="py-3 px-4 text-dark-500">{emp.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>

        {/* Tasks */}
        <Card>
          <Card.Header>
            <Card.Title>Active Tasks ({tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length})</Card.Title>
            <Card.Description>Assigned branch operational tasks</Card.Description>
          </Card.Header>
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Task</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800 text-xs">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-dark-450">No tasks created for this store.</td>
                  </tr>
                ) : (
                  tasks.slice(0, 5).map((task) => (
                    <tr key={task.id} className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20">
                      <td className="py-3 px-4 font-bold text-dark-900 dark:text-white truncate max-w-[150px]">{task.title}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          task.priority === 'Critical' || task.priority === 'Urgent' ? 'bg-red-500/10 text-red-600' :
                          task.priority === 'High' ? 'bg-orange-500/10 text-orange-600' : 'bg-dark-100 text-dark-600'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-dark-700 dark:text-dark-300">{task.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};
