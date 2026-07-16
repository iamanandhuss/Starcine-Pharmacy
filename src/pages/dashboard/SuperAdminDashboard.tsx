import React, { useEffect, useState } from 'react';
import {
  Store, Users, ShieldCheck, CalendarCheck, Truck,
  ClipboardList, TrendingUp, Activity,
  CheckCircle2, AlertCircle, BarChart2, RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';

interface StoreStats {
  id: string;
  name: string;
  store_code: string | null;
  code: string | null;
  is_active: boolean;
  employee_count?: number;
  delivery_count?: number;
}

interface OverallStats {
  totalStores: number;
  activeStores: number;
  totalEmployees: number;
  totalStoreAdmins: number;
  todayAttendance: number;
  todayDeliveries: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  totalTasks: number;
}

interface ActivityLog {
  id: string;
  action: string;
  module: string;
  description: string | null;
  created_at: string;
  users?: { full_name: string } | null;
}

export const SuperAdminDashboard: React.FC = () => {
  const { user, role, isSuperAdmin, isStoreAdmin, profile } = useAuth();
  const { allStores } = useStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState<OverallStats>({
    totalStores: 0,
    activeStores: 0,
    totalEmployees: 0,
    totalStoreAdmins: 0,
    todayAttendance: 0,
    todayDeliveries: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
    totalTasks: 0,
  });
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [
        { count: totalEmployees },
        { count: todayAttendance },
        { count: todayDeliveries },
        { count: pendingDeliveries },
        { count: completedDeliveries },
        { count: totalTasks },
        { data: activityData },
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('attendance_date', today),
        supabase.from('home_deliveries').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
        supabase.from('home_deliveries').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('home_deliveries').select('id', { count: 'exact', head: true }).eq('status', 'Delivered'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'Done'),
        supabase.from('activity_logs').select('id, action, module, description, created_at, users(full_name)').order('created_at', { ascending: false }).limit(8),
      ]);

      // Fetch store admin count separately (join workaround)
      const { count: storeAdminCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('roles.name', 'Store Admin');

      const statsObj = {
        totalStores: allStores.length,
        activeStores: allStores.filter(s => s.is_active).length,
        totalEmployees: totalEmployees ?? 0,
        totalStoreAdmins: storeAdminCount ?? 0,
        todayAttendance: todayAttendance ?? 0,
        todayDeliveries: todayDeliveries ?? 0,
        pendingDeliveries: pendingDeliveries ?? 0,
        completedDeliveries: completedDeliveries ?? 0,
        totalTasks: totalTasks ?? 0,
      };

      setStats(statsObj);
      setRecentActivity((activityData as any as ActivityLog[]) || []);

      // Per-store stats
      const storeStatsList: StoreStats[] = await Promise.all(
        allStores.map(async (store) => {
          const [{ count: empCount }, { count: delCount }] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('branch_id', store.id),
            supabase.from('home_deliveries')
              .select('id', { count: 'exact', head: true })
              .eq('store_id', store.id)
              .gte('created_at', `${today}T00:00:00`),
          ]);

          return {
            ...store,
            employee_count: empCount ?? 0,
            delivery_count: delCount ?? 0,
          };
        })
      );
      setStoreStats(storeStatsList);
    } catch (err: any) {
      console.error('Error fetching super admin stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [allStores]);

  const statCards = [
    { label: 'Total Stores', value: stats.totalStores, sub: `${stats.activeStores} active`, icon: <Store className="h-5 w-5" />, color: 'bg-brand-500/10 text-brand-500' },
    { label: 'Total Employees', value: stats.totalEmployees, sub: 'across all stores', icon: <Users className="h-5 w-5" />, color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Store Admins', value: stats.totalStoreAdmins, sub: 'active accounts', icon: <ShieldCheck className="h-5 w-5" />, color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Today\'s Attendance', value: stats.todayAttendance, sub: 'checked in today', icon: <CalendarCheck className="h-5 w-5" />, color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Today\'s Deliveries', value: stats.todayDeliveries, sub: `${stats.pendingDeliveries} pending`, icon: <Truck className="h-5 w-5" />, color: 'bg-orange-500/10 text-orange-500' },
    { label: 'Completed Deliveries', value: stats.completedDeliveries, sub: 'all time', icon: <CheckCircle2 className="h-5 w-5" />, color: 'bg-teal-500/10 text-teal-500' },
    { label: 'Open Tasks', value: stats.totalTasks, sub: 'across all stores', icon: <ClipboardList className="h-5 w-5" />, color: 'bg-amber-500/10 text-amber-500' },
    { label: 'Revenue', value: '—', sub: 'Coming soon', icon: <TrendingUp className="h-5 w-5" />, color: 'bg-dark-500/10 text-dark-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Dynamic Session Role Debugger */}
      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-red-500 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            Session Security & Role Debug Console
          </span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">
            Developer Mode
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-red-500/10 text-dark-800 dark:text-dark-200">
          <div>
            <p className="text-[10px] text-dark-400 font-bold uppercase">Logged User</p>
            <p className="font-mono mt-0.5">{user?.email || 'No email'}</p>
          </div>
          <div>
            <p className="text-[10px] text-dark-400 font-bold uppercase">AuthContext.role</p>
            <p className="font-mono mt-0.5 text-blue-500 font-bold">"{role}"</p>
          </div>
          <div>
            <p className="text-[10px] text-dark-400 font-bold uppercase">isSuperAdmin Flag</p>
            <p className={`font-mono mt-0.5 font-bold ${isSuperAdmin ? 'text-green-500' : 'text-red-500'}`}>
              {isSuperAdmin ? 'TRUE (Super Admin Mode)' : 'FALSE'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-dark-400 font-bold uppercase">isStoreAdmin Flag</p>
            <p className={`font-mono mt-0.5 font-bold ${isStoreAdmin ? 'text-green-500' : 'text-red-500'}`}>
              {isStoreAdmin ? 'TRUE (Store Admin Mode)' : 'FALSE'}
            </p>
          </div>
        </div>
        <div className="text-[10px] text-dark-400 pt-1">
          💡 <strong>Tip:</strong> If <em>isSuperAdmin</em> is <strong>FALSE</strong>, the application restricts access to Super Admin pages and redirects users to employee or store administration consoles.
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Super Admin Console
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-dark-900 dark:text-white">
            Welcome back, {profile?.first_name || 'Admin'} 👋
          </h1>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
            Overview of all pharmacy stores and operations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="hover:shadow-md transition-shadow">
            <Card.Content className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`p-2 rounded-lg ${card.color}`}>
                  {card.icon}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-dark-900 dark:text-white leading-none">
                {loading ? '—' : card.value}
              </p>
              <p className="text-[11px] font-semibold text-dark-500 dark:text-dark-400 mt-1">
                {card.label}
              </p>
              <p className="text-[10px] text-dark-400 dark:text-dark-500">{card.sub}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Store Performance Table + Recent Activity */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Store Performance */}
        <Card className="lg:col-span-3">
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <Card.Title className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-brand-500" />
                  Store Performance
                </Card.Title>
                <Card.Description>Today's snapshot per branch</Card.Description>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/super-admin/stores')}
                className="text-xs"
              >
                Manage Stores
              </Button>
            </div>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dark-100 dark:border-dark-800 bg-dark-50/50 dark:bg-dark-900/50">
                    <th className="text-left px-4 py-2.5 font-bold text-dark-500 uppercase tracking-wider">Store</th>
                    <th className="text-center px-3 py-2.5 font-bold text-dark-500 uppercase tracking-wider">Code</th>
                    <th className="text-center px-3 py-2.5 font-bold text-dark-500 uppercase tracking-wider">Staff</th>
                    <th className="text-center px-3 py-2.5 font-bold text-dark-500 uppercase tracking-wider">Deliveries</th>
                    <th className="text-center px-3 py-2.5 font-bold text-dark-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-4 bg-dark-100 dark:bg-dark-800 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : storeStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-dark-400 dark:text-dark-500">
                        No stores found. Add your first store.
                      </td>
                    </tr>
                  ) : (
                    storeStats.map((store) => (
                      <tr
                        key={store.id}
                        className="hover:bg-dark-50/50 dark:hover:bg-dark-900/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/super-admin/stores/${store.id}`)}
                      >
                        <td className="px-4 py-3 font-semibold text-dark-800 dark:text-dark-200">
                          {store.name}
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-dark-500 dark:text-dark-400">
                          {store.store_code || store.code || '—'}
                        </td>
                        <td className="px-3 py-3 text-center text-dark-700 dark:text-dark-300">
                          {store.employee_count}
                        </td>
                        <td className="px-3 py-3 text-center text-dark-700 dark:text-dark-300">
                          {store.delivery_count}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            store.is_active
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-dark-100 text-dark-400 dark:bg-dark-800'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${store.is_active ? 'bg-emerald-500' : 'bg-dark-400'}`} />
                            {store.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              Recent Activity
            </Card.Title>
            <Card.Description>System-wide activity log</Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="divide-y divide-dark-100 dark:divide-dark-800 max-h-72 overflow-y-auto">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded animate-pulse mb-1.5" />
                    <div className="h-2.5 bg-dark-100 dark:bg-dark-800 rounded animate-pulse w-3/4" />
                  </div>
                ))
              ) : recentActivity.length === 0 ? (
                <div className="p-6 text-center text-xs text-dark-400 dark:text-dark-500">
                  No recent activity
                </div>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id} className="p-3 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="p-1 bg-brand-500/10 text-brand-500 rounded mt-0.5 shrink-0">
                        <AlertCircle className="h-3 w-3" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-dark-800 dark:text-dark-200 truncate">
                          {log.action} · {log.module}
                        </p>
                        {log.description && (
                          <p className="text-[10px] text-dark-500 dark:text-dark-400 truncate">
                            {log.description}
                          </p>
                        )}
                        <p className="text-[9px] text-dark-400 dark:text-dark-500 mt-0.5">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};
