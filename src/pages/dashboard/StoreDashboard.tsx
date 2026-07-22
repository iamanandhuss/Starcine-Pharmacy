import React, { useEffect, useState } from 'react';
import {
  CalendarCheck, Truck, Megaphone, Activity, AlertCircle, Clock, RefreshCw,
  IndianRupee, ShieldAlert, CheckCircle2, UserPlus, Trophy, Users
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';

// Recharts imports for visual excellence
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface StoreStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  todayDeliveries: number;
  pendingTasks: number;
  openIssuesCount: number;
  todaySales: number;
  healthScore: number;
  championshipRank: number;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action: string;
  module: string;
  description: string | null;
  created_at: string;
}

export const StoreDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { selectedStoreId, selectedStoreName } = useStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState<StoreStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    todayDeliveries: 0,
    pendingTasks: 0,
    openIssuesCount: 0,
    todaySales: 0,
    healthScore: 88, // fallback default
    championshipRank: 2, // fallback default
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Quick Action Modal states
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [counterSalesInput, setCounterSalesInput] = useState('');
  const [deliverySalesInput, setDeliverySalesInput] = useState('');
  const [issueTitleInput, setIssueTitleInput] = useState('');
  const [issueCategoryInput, setIssueCategoryInput] = useState('Maintenance');
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchStats = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      // 1. Base counts & sums
      const [
        { count: totalEmployees },
        { count: presentToday },
        { count: todayDeliveries },
        { count: pendingTasks },
        { count: openIssuesCount },
        { data: announcementData },
        { data: activityData },
        { count: pendingCountRes },
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('branch_id', selectedStoreId).eq('is_active', true),
        supabase.from('attendance').select('id', { count: 'exact', head: true })
          .eq('attendance_date', today)
          .in('user_id', (await supabase.from('users').select('id').eq('branch_id', selectedStoreId)).data?.map((u) => u.id) || []),
        supabase.from('home_deliveries').select('id', { count: 'exact', head: true }).eq('branch_id', selectedStoreId).gte('created_at', `${today}T00:00:00`),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('branch_id', selectedStoreId).in('status', ['Pending', 'In Progress', 'To Do']),
        supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('branch_id', selectedStoreId).eq('action', 'Issue Reported'),
        supabase.from('announcements').select('id, title, message, created_at').or(`branch_id.eq.${selectedStoreId},branch_id.is.null`).order('created_at', { ascending: false }).limit(3),
        supabase.from('activity_logs').select('id, action, module, description, created_at').eq('branch_id', selectedStoreId).order('created_at', { ascending: false }).limit(4),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('branch_id', selectedStoreId).eq('approval_status', 'pending'),
      ]);

      const empCount = totalEmployees ?? 0;
      const presentCount = presentToday ?? 0;
      const absentCount = Math.max(0, empCount - presentCount);

      // Compute live sales sum from sales_registers
      const { data: todaySalesData } = await supabase
        .from('sales_registers')
        .select('total_sales')
        .eq('branch_id', selectedStoreId)
        .eq('register_date', today);

      const realSalesSum = (todaySalesData || []).reduce((acc: number, curr: any) => acc + (Number(curr.total_sales) || 0), 0);
      const attendanceRate = empCount > 0 ? (presentCount / empCount) * 100 : 100;
      const computedHealthScore = Math.min(100, Math.max(60, Math.round(attendanceRate * 0.6 + 40)));

      setStats({
        totalEmployees: empCount,
        presentToday: presentCount,
        absentToday: absentCount,
        lateToday: 0,
        todayDeliveries: todayDeliveries ?? 0,
        pendingTasks: pendingTasks ?? 0,
        openIssuesCount: openIssuesCount ?? 0,
        todaySales: realSalesSum,
        healthScore: computedHealthScore,
        championshipRank: 1,
      });

      setAnnouncements((announcementData as Announcement[]) || []);
      setRecentActivity((activityData as ActivityLog[]) || []);
      setPendingCount(pendingCountRes ?? 0);
    } catch (err: any) {
      console.error('Error fetching store stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedStoreId]);

  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(counterSalesInput) + Number(deliverySalesInput);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter valid sales numbers', 'error');
      return;
    }
    setStats(prev => ({ ...prev, todaySales: prev.todaySales + val }));
    showToast(`Registered today's sales: ₹${val.toLocaleString()}`);
    setIsSalesModalOpen(false);
    setCounterSalesInput('');
    setDeliverySalesInput('');
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitleInput.trim()) return;
    setStats(prev => ({ ...prev, openIssuesCount: prev.openIssuesCount + 1 }));
    showToast(`Filed ticket: ${issueTitleInput}`);
    setIsIssueModalOpen(false);
    setIssueTitleInput('');
  };

  // Premium charts datasets
  const attendanceData = [
    { day: 'Mon', Present: 88, Late: 12 },
    { day: 'Tue', Present: 92, Late: 8 },
    { day: 'Wed', Present: 95, Late: 5 },
    { day: 'Thu', Present: 90, Late: 10 },
    { day: 'Fri', Present: 96, Late: 4 },
    { day: 'Sat', Present: 85, Late: 15 },
    { day: 'Sun', Present: 92, Late: 8 },
  ];

  const salesData = [
    { name: 'Mon', Sales: 3100 },
    { name: 'Tue', Sales: 4200 },
    { name: 'Wed', Sales: 3800 },
    { name: 'Thu', Sales: 5200 },
    { name: 'Fri', Sales: 6100 },
    { name: 'Sat', Sales: 4500 },
    { name: 'Sun', Sales: 3450 },
  ];

  const groomingData = [
    { name: 'Completed', value: 85 },
    { name: 'Pending', value: 15 },
  ];

  const issueStatusData = [
    { name: 'Open', value: stats.openIssuesCount },
    { name: 'In Progress', value: 2 },
    { name: 'Closed', value: 8 },
  ];

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

  if (!selectedStoreId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center gap-3">
        <AlertCircle className="h-10 w-10 text-dark-300 dark:text-dark-600 animate-bounce" />
        <p className="text-sm font-semibold text-dark-600 dark:text-dark-400">No physical branch assigned to your credentials.</p>
        <p className="text-xs text-dark-400 dark:text-dark-500">Contact platform administrators to assign you to a branch store.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              🏪 Store Administration Console
            </span>
          </div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">
            {selectedStoreName || 'Pharmacy Branch'}
          </h1>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
            Manager: {profile?.full_name || 'Admin'} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchStats}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Pending Approvals Callout */}
      {!loading && pendingCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/20 text-amber-500 rounded-lg animate-pulse">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">
                Action Required: Pending Approvals
              </h4>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                You have {pendingCount} new employee registration{pendingCount > 1 ? 's' : ''} waiting for approval.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employees')}
            className="border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 text-xs font-bold"
          >
            Review Requests
          </Button>
        </div>
      )}

      {/* KPI Display Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        
        {/* Store Health */}
        <Card
          onClick={() => navigate('/store/performance')}
          className="hover:shadow-lg hover:border-emerald-500/40 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase">Health Score</p>
              <h3 className="text-xl font-black mt-1 text-green-600 dark:text-green-400 group-hover:scale-105 transition-transform">{stats.healthScore}/100</h3>
            </div>
            <span className="p-2 bg-green-500/10 text-green-600 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </Card.Content>
        </Card>

        {/* Championship Standings */}
        <Card
          onClick={() => navigate('/store/performance')}
          className="hover:shadow-lg hover:border-yellow-500/40 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase">Standings Rank</p>
              <h3 className="text-xl font-black mt-1 text-yellow-600 dark:text-yellow-500 group-hover:scale-105 transition-transform">{stats.championshipRank}nd Place</h3>
            </div>
            <span className="p-2 bg-yellow-500/10 text-yellow-600 rounded-lg group-hover:scale-110 transition-transform">
              <Trophy className="h-4 w-4" />
            </span>
          </Card.Content>
        </Card>

        {/* Today's Sales */}
        <Card
          onClick={() => navigate('/store/sales')}
          className="hover:shadow-lg hover:border-blue-500/40 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase">Today's Sales</p>
              <h3 className="text-xl font-black mt-1 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">₹{stats.todaySales.toLocaleString()}</h3>
            </div>
            <span className="p-2 bg-blue-500/10 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
              <IndianRupee className="h-4 w-4" />
            </span>
          </Card.Content>
        </Card>

        {/* Today's Attendance */}
        <Card
          onClick={() => navigate('/store/attendance')}
          className="hover:shadow-lg hover:border-brand-500/40 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500" />
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase">Present Today</p>
              <h3 className="text-xl font-black mt-1 text-brand-600 group-hover:scale-105 transition-transform">{stats.presentToday}/{stats.totalEmployees}</h3>
            </div>
            <span className="p-2 bg-brand-500/10 text-brand-500 rounded-lg group-hover:scale-110 transition-transform">
              <CalendarCheck className="h-4 w-4" />
            </span>
          </Card.Content>
        </Card>

        {/* Deliveries */}
        <Card
          onClick={() => navigate('/store/deliveries')}
          className="hover:shadow-lg hover:border-purple-500/40 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" />
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase">Home Deliveries</p>
              <h3 className="text-xl font-black mt-1 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">{stats.todayDeliveries} Dispatched</h3>
            </div>
            <span className="p-2 bg-purple-500/10 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
              <Truck className="h-4 w-4" />
            </span>
          </Card.Content>
        </Card>
      </div>

      {/* Lateness, Tasks, Issues strip */}
      <div className="grid grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/store/attendance')}
          className="bg-amber-500/10 text-amber-700 p-3 rounded-xl flex items-center justify-between text-xs font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
        >
          <span>Late checks today:</span>
          <span className="text-sm font-black">{stats.lateToday} Staff</span>
        </div>
        <div
          onClick={() => navigate('/store/checklist')}
          className="bg-blue-500/10 text-blue-700 p-3 rounded-xl flex items-center justify-between text-xs font-bold border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
        >
          <span>Pending tasks / checklist:</span>
          <span className="text-sm font-black">{stats.pendingTasks} Checklist</span>
        </div>
        <div
          onClick={() => navigate('/store/issues')}
          className="bg-red-500/10 text-red-700 p-3 rounded-xl flex items-center justify-between text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
        >
          <span>Open support incidents:</span>
          <span className="text-sm font-black">{stats.openIssuesCount} Incidents</span>
        </div>
      </div>

      {/* Graphical Chart Panel */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Attendance Trend Line */}
        <Card>
          <Card.Header>
            <Card.Title className="text-xs uppercase font-extrabold tracking-wide">Attendance Compliance Trend</Card.Title>
          </Card.Header>
          <Card.Content className="h-60 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceData}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Present" stroke="#3B82F6" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        {/* Weekly Sales Bar */}
        <Card>
          <Card.Header>
            <Card.Title className="text-xs uppercase font-extrabold tracking-wide">Weekly Sales Performance (₹)</Card.Title>
          </Card.Header>
          <Card.Content className="h-60 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="Sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        {/* Grooming Pie / Doughnut */}
        <Card className="md:col-span-2 lg:col-span-1">
          <Card.Header>
            <Card.Title className="text-xs uppercase font-extrabold tracking-wide">Grooming & Issues Ratios</Card.Title>
          </Card.Header>
          <Card.Content className="h-60 flex items-center justify-around p-2">
            
            {/* Pie: Grooming */}
            <div className="text-center">
              <p className="text-[9px] font-bold text-dark-400 uppercase mb-2">Grooming Checks</p>
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={groomingData} innerRadius={25} outerRadius={35} paddingAngle={3} dataKey="value">
                    {groomingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#E5E7EB'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <span className="text-xs font-black text-dark-700 dark:text-dark-300">85% Complete</span>
            </div>

            {/* Pie: Issues */}
            <div className="text-center">
              <p className="text-[9px] font-bold text-dark-400 uppercase mb-2">Incident Resolves</p>
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={issueStatusData} innerRadius={25} outerRadius={35} paddingAngle={3} dataKey="value">
                    {issueStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <span className="text-xs font-black text-dark-700 dark:text-dark-300">Resolved: 8</span>
            </div>

          </Card.Content>
        </Card>
      </div>

      {/* Main Row: Recent Actions & Announcements */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Quick Actions Panel */}
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title className="text-xs uppercase font-extrabold tracking-wide">Quick Action Registry</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-3.5">
            <Button
              onClick={() => navigate('/store/employees')}
              leftIcon={<UserPlus className="h-4 w-4" />}
              className="w-full text-left justify-start shadow-sm"
            >
              Hire Employee
            </Button>
            <Button
              onClick={() => setIsIssueModalOpen(true)}
              leftIcon={<ShieldAlert className="h-4 w-4" />}
              variant="outline"
              className="w-full text-left justify-start"
            >
              File Support Ticket
            </Button>
            <Button
              onClick={() => setIsSalesModalOpen(true)}
              leftIcon={<IndianRupee className="h-4 w-4" />}
              variant="outline"
              className="w-full text-left justify-start"
            >
              Record Counter Sales
            </Button>
            <Button
              onClick={() => navigate('/store/attendance')}
              leftIcon={<Clock className="h-4 w-4" />}
              variant="outline"
              className="w-full text-left justify-start"
            >
              Overtime Check
            </Button>
          </Card.Content>
        </Card>

        {/* Announcements & Activity */}
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
          {/* Announcements */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-1.5 text-xs font-extrabold uppercase">
                <Megaphone className="h-4 w-4 text-purple-500" />
                Active Announcements
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-0">
              <div className="divide-y divide-dark-100 dark:divide-dark-800">
                {announcements.length === 0 ? (
                  <div className="p-6 text-center text-xs text-dark-400 dark:text-dark-500">
                    No announcements yet.
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div key={ann.id} className="p-4 text-xs">
                      <p className="font-bold text-dark-800 dark:text-dark-200">{ann.title}</p>
                      <p className="text-dark-500 dark:text-dark-400 mt-1 line-clamp-2 leading-relaxed">{ann.message}</p>
                      <p className="text-[10px] text-dark-400 dark:text-dark-500 mt-1.5 font-mono">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Recent activities */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-1.5 text-xs font-extrabold uppercase">
                <Activity className="h-4 w-4 text-brand-500" />
                Audits & Activity
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-0">
              <div className="divide-y divide-dark-100 dark:divide-dark-800">
                {recentActivity.length === 0 ? (
                  <div className="p-6 text-center text-xs text-dark-400 dark:text-dark-500">
                    No activities recorded.
                  </div>
                ) : (
                  recentActivity.map((log) => (
                    <div key={log.id} className="p-3 flex items-start gap-2.5 text-xs font-mono">
                      <span className="p-1 bg-dark-100 dark:bg-dark-800 text-dark-500 rounded mt-0.5 shrink-0">
                        <Clock className="h-3 w-3" />
                      </span>
                      <div className="flex-1 min-w-0 font-sans">
                        <p className="font-semibold text-dark-700 dark:text-dark-300">
                          {log.action} · <span className="text-dark-400">{log.module}</span>
                        </p>
                        {log.description && (
                          <p className="text-[10px] text-dark-400 mt-0.5">{log.description}</p>
                        )}
                        <p className="text-[9px] text-dark-400 mt-1 font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Record Sales Modal */}
      <Modal isOpen={isSalesModalOpen} onClose={() => setIsSalesModalOpen(false)} title="💰 Record Daily Sales Register">
        <form onSubmit={handleSalesSubmit} className="space-y-4">
          <Input
            label="Counter POS Sales (₹)"
            type="number"
            placeholder="e.g. 1500"
            value={counterSalesInput}
            onChange={e => setCounterSalesInput(e.target.value)}
            required
          />
          <Input
            label="Delivery Sales (₹)"
            type="number"
            placeholder="e.g. 800"
            value={deliverySalesInput}
            onChange={e => setDeliverySalesInput(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsSalesModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Sales</Button>
          </div>
        </form>
      </Modal>

      {/* File Support Ticket Modal */}
      <Modal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} title="⚠️ File Support Incident Ticket">
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          <Input
            label="Incident Title"
            placeholder="e.g. Printer label feed jam"
            value={issueTitleInput}
            onChange={e => setIssueTitleInput(e.target.value)}
            required
          />
          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Category</label>
            <select
              value={issueCategoryInput}
              onChange={e => setIssueCategoryInput(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500"
            >
              <option value="Maintenance">Maintenance</option>
              <option value="IT Hardware">IT Hardware</option>
              <option value="Software Bug">Software Bug</option>
              <option value="Utility Refrigerator">Utility Refrigerator</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsIssueModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Incident</Button>
          </div>
        </form>
      </Modal>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};
