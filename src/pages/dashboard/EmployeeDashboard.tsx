import React, { useEffect, useState } from 'react';
import {
  Clock, CheckCircle2, ClipboardList, Megaphone,
  Truck, CalendarOff, User, RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface TodayShift {
  name: string;
  start_time: string;
  end_time: string;
}

interface MyTask {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  status: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface DeliveryItem {
  id: string;
  customer_name: string;
  customer_address: string;
  status: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  Urgent: 'text-red-600 bg-red-500/10',
  High: 'text-orange-600 bg-orange-500/10',
  Medium: 'text-yellow-600 bg-yellow-500/10',
  Low: 'text-emerald-600 bg-emerald-500/10',
};

export const EmployeeDashboard: React.FC = () => {
  const { user, role, isSuperAdmin, isStoreAdmin, profile } = useAuth();
  const isDeliveryStaff = profile?.role_name === 'Delivery Staff';

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayShift, setTodayShift] = useState<TodayShift | null>(null);
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<DeliveryItem[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  // Digital clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const storeId = profile.store_id;

      let announcementsQuery = supabase
        .from('announcements')
        .select('id, title, message, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (storeId) {
        announcementsQuery = announcementsQuery.or(`branch_id.eq.${storeId},branch_id.is.null`);
      } else {
        announcementsQuery = announcementsQuery.is('branch_id', null);
      }

      const [
        { data: activeAttendance },
        { data: shiftData },
        { data: taskAssignments },
        { data: announcementData },
        { count: leavePendingCount },
      ] = await Promise.all([
        supabase.from('attendance').select('check_in').eq('user_id', profile.id).eq('attendance_date', today).is('check_out', null).maybeSingle(),
        supabase.from('employee_shifts').select('shifts(name, start_time, end_time)').eq('user_id', profile.id).lte('from_date', today).or(`to_date.gte.${today},to_date.is.null`).maybeSingle(),
        supabase.from('task_assignments').select('task_id, status, tasks(id, title, priority, due_date, status)').eq('user_id', profile.id).in('status', ['Pending', 'In Progress']).limit(5),
        announcementsQuery,
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'Pending'),
      ]);

      if (activeAttendance) {
        setIsClockedIn(true);
        setCheckInTime(new Date(activeAttendance.check_in).toLocaleTimeString());
      } else {
        setIsClockedIn(false);
        setCheckInTime(null);
      }

      if (shiftData?.shifts) {
        const s = shiftData.shifts;
        const shiftObj = Array.isArray(s) ? s[0] : s;
        if (shiftObj) {
          setTodayShift(shiftObj as any as TodayShift);
        }
      }

      const tasks: MyTask[] = (taskAssignments || []).map((ta: any) => ({
        id: ta.tasks.id,
        title: ta.tasks.title,
        priority: ta.tasks.priority,
        due_date: ta.tasks.due_date,
        status: ta.status,
      }));
      setMyTasks(tasks);
      setAnnouncements((announcementData as Announcement[]) || []);
      setPendingLeaves(leavePendingCount ?? 0);

      if (isDeliveryStaff) {
        const { data: deliveries } = await supabase
          .from('home_deliveries')
          .select('id, customer_name, customer_address, status')
          .eq('assigned_to', profile.id)
          .in('status', ['Pending', 'Out for Delivery'])
          .limit(3);
        setMyDeliveries((deliveries as DeliveryItem[]) || []);
      }
    } catch (err: any) {
      console.error('Error fetching employee dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.id]);

  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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
            <div className={`h-2.5 w-2.5 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-dark-300 dark:bg-dark-600'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isClockedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-dark-400'}`}>
              {isClockedIn ? `On Duty since ${checkInTime}` : 'Not Clocked In'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-dark-900 dark:text-white">
            Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile?.first_name || 'Staff'} 👋
          </h1>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">{formatDate(currentTime)}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Live Clock */}
        <Card className="col-span-2 md:col-span-1 bg-gradient-to-br from-brand-500 to-purple-600 border-0 text-white">
          <Card.Content className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Current Time</p>
            <p className="text-xl font-extrabold font-mono leading-none">{formatTime(currentTime)}</p>
            <p className="text-[10px] opacity-70 mt-1">{profile?.store_name || 'Your Store'}</p>
          </Card.Content>
        </Card>

        {/* Today's Shift */}
        <Card>
          <Card.Content className="p-4">
            <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500 inline-flex mb-2">
              <Clock className="h-4 w-4" />
            </span>
            <p className="text-xs font-bold text-dark-800 dark:text-dark-200">Today's Shift</p>
            <p className="text-[11px] text-dark-500 dark:text-dark-400 mt-0.5">
              {loading ? '—' : todayShift ? `${todayShift.start_time.slice(0, 5)} – ${todayShift.end_time.slice(0, 5)}` : 'Not assigned'}
            </p>
            <p className="text-[10px] text-dark-400 dark:text-dark-500">{loading ? '' : todayShift?.name || ''}</p>
          </Card.Content>
        </Card>

        {/* My Tasks */}
        <Card>
          <Card.Content className="p-4">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 inline-flex mb-2">
              <ClipboardList className="h-4 w-4" />
            </span>
            <p className="text-2xl font-extrabold text-dark-900 dark:text-white leading-none">
              {loading ? '—' : myTasks.length}
            </p>
            <p className="text-xs font-semibold text-dark-500 dark:text-dark-400 mt-0.5">Pending Tasks</p>
          </Card.Content>
        </Card>

        {/* Leave Balance */}
        <Card>
          <Card.Content className="p-4">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500 inline-flex mb-2">
              <CalendarOff className="h-4 w-4" />
            </span>
            <p className="text-2xl font-extrabold text-dark-900 dark:text-white leading-none">
              {loading ? '—' : pendingLeaves}
            </p>
            <p className="text-xs font-semibold text-dark-500 dark:text-dark-400 mt-0.5">Pending Leaves</p>
          </Card.Content>
        </Card>
      </div>

      {/* My Tasks + Announcements */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Assigned Tasks */}
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-500" />
              My Tasks
            </Card.Title>
            <Card.Description>Active assignments for you</Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="divide-y divide-dark-100 dark:divide-dark-800">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded animate-pulse mb-1.5" />
                    <div className="h-2.5 bg-dark-100 dark:bg-dark-800 rounded animate-pulse w-1/2" />
                  </div>
                ))
              ) : myTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-dark-400 dark:text-dark-500">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-400" />
                  No pending tasks — you're all caught up!
                </div>
              ) : (
                myTasks.map((task) => (
                  <div key={task.id} className="p-3 flex items-center gap-3 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${PRIORITY_COLOR[task.priority] || 'text-dark-400 bg-dark-100'}`}>
                      {task.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark-800 dark:text-dark-200 truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-[10px] text-dark-400 dark:text-dark-500">Due {task.due_date}</p>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-dark-400 bg-dark-100 dark:bg-dark-800 px-1.5 py-0.5 rounded uppercase">
                      {task.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Announcements */}
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-purple-500" />
              Announcements
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="divide-y divide-dark-100 dark:divide-dark-800">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded animate-pulse mb-2" />
                    <div className="h-2.5 bg-dark-100 dark:bg-dark-800 rounded animate-pulse w-2/3" />
                  </div>
                ))
              ) : announcements.length === 0 ? (
                <div className="p-6 text-center text-xs text-dark-400 dark:text-dark-500">
                  No announcements at this time
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-4 text-xs">
                    <p className="font-bold text-dark-800 dark:text-dark-200">{ann.title}</p>
                    <p className="text-dark-500 dark:text-dark-400 mt-1 line-clamp-2">{ann.message}</p>
                    <p className="text-[10px] text-dark-400 dark:text-dark-500 mt-1.5">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* My Deliveries (only for Delivery Staff) */}
      {isDeliveryStaff && (
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-500" />
              My Deliveries
            </Card.Title>
            <Card.Description>Deliveries currently assigned to you</Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="divide-y divide-dark-100 dark:divide-dark-800">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded animate-pulse mb-1.5" />
                    <div className="h-2.5 bg-dark-100 dark:bg-dark-800 rounded animate-pulse w-1/2" />
                  </div>
                ))
              ) : myDeliveries.length === 0 ? (
                <div className="p-6 text-center text-xs text-dark-400 dark:text-dark-500">
                  No active deliveries assigned to you
                </div>
              ) : (
                myDeliveries.map((delivery) => (
                  <div key={delivery.id} className="p-3 flex items-center gap-3 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${delivery.status === 'Out for Delivery' ? 'text-orange-600 bg-orange-500/10' : 'text-amber-600 bg-amber-500/10'}`}>
                      {delivery.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark-800 dark:text-dark-200">{delivery.customer_name}</p>
                      <p className="text-[10px] text-dark-400 dark:text-dark-500 truncate">{delivery.customer_address}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Profile Summary */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            <User className="h-4 w-4 text-brand-500" />
            My Profile
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {[
              { label: 'Name', value: profile?.full_name || '—' },
              { label: 'Role', value: profile?.role_name || '—' },
              { label: 'Store', value: profile?.store_name || '—' },
              { label: 'Employee Code', value: profile?.employee_code || '—' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-dark-400 dark:text-dark-500 text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
                <p className="font-semibold text-dark-800 dark:text-dark-200 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};
