import React, { useState } from 'react';
import {
  BarChart2, Download, FileText, FileSpreadsheet,
  Calendar, TrendingUp, Users, Clock, AlertTriangle,
  Filter,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportTab = 'attendance' | 'productivity' | 'overtime' | 'summary';
type DateRange = '7d' | '14d' | '30d' | 'custom';

// ─── Seed Data ────────────────────────────────────────────────────────────────

const ATTENDANCE_DAILY_SEED = [
  { day: 'Jul 1', present: 4, late: 0, absent: 0 },
  { day: 'Jul 2', present: 3, late: 1, absent: 0 },
  { day: 'Jul 3', present: 3, late: 0, absent: 1 },
  { day: 'Jul 6', present: 2, late: 2, absent: 0 },
  { day: 'Jul 7', present: 4, late: 0, absent: 0 },
  { day: 'Jul 8', present: 3, late: 0, absent: 1 },
  { day: 'Jul 9', present: 4, late: 0, absent: 0 },
  { day: 'Jul 10', present: 3, late: 1, absent: 0 },
];

const WORKING_HOURS_DATA_SEED = [
  { day: 'Jul 1', sarah: 8.0, jessica: 8.2, david: 8.0, alex: 8.5 },
  { day: 'Jul 2', sarah: 7.9, jessica: 8.0, david: 7.8, alex: 8.0 },
  { day: 'Jul 3', sarah: 9.5, jessica: 8.0, david: 0,   alex: 8.1 },
  { day: 'Jul 6', sarah: 7.8, jessica: 7.9, david: 8.2, alex: 8.0 },
  { day: 'Jul 7', sarah: 8.2, jessica: 8.5, david: 8.0, alex: 9.0 },
  { day: 'Jul 8', sarah: 0,   jessica: 8.0, david: 8.1, alex: 8.0 },
  { day: 'Jul 9', sarah: 9.9, jessica: 9.5, david: 8.0, alex: 8.0 },
  { day: 'Jul 10', sarah: 6.0, jessica: 7.5, david: 5.5, alex: 7.0 },
];

const OVERTIME_DATA_SEED = [
  { name: 'Sarah Thomas', overtimeHours: 3.4, lateMinutes: 5 },
  { name: 'Jessica K.',   overtimeHours: 2.2, lateMinutes: 0 },
  { name: 'David Lee',    overtimeHours: 0.3, lateMinutes: 20 },
  { name: 'Alex Mercer',  overtimeHours: 1.5, lateMinutes: 0 },
];

const PRODUCTIVITY_DATA_SEED = [
  { name: 'Sarah Thomas', tasksCompleted: 6,  docsUploaded: 3, hoursWorked: 49.3, accuracy: 98 },
  { name: 'Jessica K.',   tasksCompleted: 8,  docsUploaded: 5, hoursWorked: 55.1, accuracy: 100 },
  { name: 'David Lee',    tasksCompleted: 4,  docsUploaded: 2, hoursWorked: 45.6, accuracy: 99 },
  { name: 'Alex Mercer',  tasksCompleted: 10, docsUploaded: 4, hoursWorked: 56.5, accuracy: 100 },
];

const ATTENDANCE_PIE_SEED = [
  { name: 'Present', value: 26, color: '#22c55e' },
  { name: 'Late',    value: 4,  color: '#eab308' },
  { name: 'Absent',  value: 2,  color: '#ef4444' },
  { name: 'Off',     value: 4,  color: '#94a3b8' },
];

const STATUS_PIE = [
  { name: 'On Time',   value: 26, color: '#6366f1' },
  { name: 'Overtime',  value: 8,  color: '#a855f7' },
  { name: 'Undertime', value: 2,  color: '#f97316' },
];

const COLORS_LINE = ['#6366f1', '#a855f7', '#22c55e', '#f59e0b'];

// ─── Chart Tooltip customisation ─────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-dark-800 border border-dark-100 dark:border-dark-700 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-extrabold text-dark-800 dark:text-dark-100 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-dark-500 dark:text-dark-400 capitalize">{p.name}:</span>
          <span className="font-bold text-dark-800 dark:text-dark-100">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Reports: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [activeTab, setActiveTab] = useState<ReportTab>('attendance');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [fromDate, setFromDate] = useState('2026-07-01');
  const [toDate, setToDate] = useState('2026-07-31');
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  const [attendanceDaily, setAttendanceDaily] = useState(ATTENDANCE_DAILY_SEED);
  const [workingHoursData] = useState(WORKING_HOURS_DATA_SEED);
  const [overtimeData, setOvertimeData] = useState(OVERTIME_DATA_SEED);
  const [productivityData] = useState(PRODUCTIVITY_DATA_SEED);
  const [attendancePie, setAttendancePie] = useState(ATTENDANCE_PIE_SEED);
  const [statsSummary, setStatsSummary] = useState({
    attendanceRate: '89.3%',
    totalHours: '206.5 hrs',
    overtimeTotal: '7.4 hrs',
    lateArrivals: '4 events',
  });

  // Shadow variables for JSX compatibility
  const ATTENDANCE_DAILY = attendanceDaily;
  const WORKING_HOURS_DATA = workingHoursData;
  const OVERTIME_DATA = overtimeData;
  const PRODUCTIVITY_DATA = productivityData;
  const ATTENDANCE_PIE = attendancePie;
  const kpis = statsSummary;

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  const fetchReportsData = React.useCallback(async () => {
    if (!selectedStoreId) return;
    try {
      // 1. Fetch attendance records in range
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select(`
          *,
          users!inner (
            id,
            full_name,
            first_name,
            last_name,
            branch_id
          )
        `)
        .eq('users.branch_id', selectedStoreId)
        .gte('attendance_date', fromDate)
        .lte('attendance_date', toDate);

      if (attErr) throw attErr;

      if (attData && attData.length > 0) {
        // Group by day for ATTENDANCE_DAILY
        const dailyMap: Record<string, { present: number; late: number; absent: number }> = {};
        // Aggregate hours worked by employee
        const empHoursMap: Record<string, { name: string; worked: number; late: number; overtime: number }> = {};

        attData.forEach((record: any) => {
          const rawDate = new Date(record.attendance_date);
          const dayLabel = rawDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          
          if (!dailyMap[dayLabel]) {
            dailyMap[dayLabel] = { present: 0, late: 0, absent: 0 };
          }
          if (record.status === 'Present') dailyMap[dayLabel].present += 1;
          else if (record.status === 'Late') dailyMap[dayLabel].late += 1;
          else if (record.status === 'Absent') dailyMap[dayLabel].absent += 1;
          else dailyMap[dayLabel].present += 1;

          const userName = record.users.full_name || `${record.users.first_name || ''} ${record.users.last_name || ''}`.trim() || 'Staff';
          if (!empHoursMap[userName]) {
            empHoursMap[userName] = { name: userName, worked: 0, late: 0, overtime: 0 };
          }
          const workedHrs = (record.worked_minutes || 0) / 60;
          const lateMins = record.late_minutes || 0;
          const overtimeHrs = (record.overtime_minutes || 0) / 60;

          empHoursMap[userName].worked += workedHrs;
          empHoursMap[userName].late += lateMins;
          empHoursMap[userName].overtime += overtimeHrs;
        });

        // Set ATTENDANCE_DAILY
        const formattedDaily = Object.entries(dailyMap).map(([day, val]) => ({
          day,
          present: val.present,
          late: val.late,
          absent: val.absent,
        })).sort((a,b) => new Date(a.day).getTime() - new Date(b.day).getTime());
        setAttendanceDaily(formattedDaily);

        // Set OVERTIME_DATA
        const formattedOvertime = Object.values(empHoursMap).map((emp) => ({
          name: emp.name,
          overtimeHours: Math.round(emp.overtime * 10) / 10,
          lateMinutes: emp.late,
        }));
        setOvertimeData(formattedOvertime);

        // Calculate KPI summaries
        const totalWorked = Object.values(empHoursMap).reduce((sum, e) => sum + e.worked, 0);
        const totalOvertime = Object.values(empHoursMap).reduce((sum, e) => sum + e.overtime, 0);
        const totalLate = attData.filter((r: any) => r.status === 'Late').length;
        
        const attendanceRateVal = attData.length > 0 
          ? Math.round((attData.filter((r: any) => r.status !== 'Absent').length / attData.length) * 1000) / 10
          : 100;

        setStatsSummary({
          attendanceRate: `${attendanceRateVal}%`,
          totalHours: `${Math.round(totalWorked * 10) / 10} hrs`,
          overtimeTotal: `${Math.round(totalOvertime * 10) / 10} hrs`,
          lateArrivals: `${totalLate} events`,
        });

        // Set ATTENDANCE_PIE
        const presentCount = attData.filter((r: any) => r.status === 'Present').length;
        const lateCount = attData.filter((r: any) => r.status === 'Late').length;
        const absentCount = attData.filter((r: any) => r.status === 'Absent').length;
        setAttendancePie([
          { name: 'Present', value: presentCount, color: '#22c55e' },
          { name: 'Late', value: lateCount, color: '#eab308' },
          { name: 'Absent', value: absentCount, color: '#ef4444' },
          { name: 'Off', value: 0, color: '#94a3b8' },
        ]);
      }
    } catch (err: any) {
      console.warn('Failed to generate real reports data:', err.message);
    }
  }, [selectedStoreId, fromDate, toDate]);

  React.useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const handleExportPDF = (reportName: string) => {
    showToast(`Generating "${reportName}" PDF report…`, 'info');
    setTimeout(() => showToast(`"${reportName}.pdf" is ready to download.`), 1800);
  };

  const handleExportExcel = (reportName: string) => {
    showToast(`Exporting "${reportName}" to Excel…`, 'info');
    setTimeout(() => showToast(`"${reportName}.xlsx" exported successfully.`), 1200);
  };

  const tabs: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
    { key: 'attendance',   label: 'Attendance',   icon: <Calendar className="h-4 w-4" /> },
    { key: 'productivity', label: 'Productivity', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'overtime',     label: 'Overtime',     icon: <Clock className="h-4 w-4" /> },
    { key: 'summary',      label: 'Summary',      icon: <BarChart2 className="h-4 w-4" /> },
  ];

  // ─── Export Action Bar ──────────────────────────────────────────────────────

  const ExportBar = ({ name }: { name: string }) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExportExcel(name)}
        leftIcon={<FileSpreadsheet className="h-4 w-4 text-green-600" />}
        className="text-xs"
      >
        Export Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExportPDF(name)}
        leftIcon={<FileText className="h-4 w-4 text-red-500" />}
        className="text-xs"
      >
        Export PDF
      </Button>
    </div>
  );

  // ─── Attendance Report Tab ──────────────────────────────────────────────────

  const AttendanceReport = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base font-bold text-dark-900 dark:text-white">Attendance Report</h3>
          <p className="text-xs text-dark-400">Daily staff presence, tardiness, and absence breakdown.</p>
        </div>
        <ExportBar name="Attendance_Report_July2026" />
      </div>

      {/* Daily presence bar chart */}
      <Card>
        <Card.Header>
          <Card.Title>Daily Attendance Breakdown</Card.Title>
          <Card.Description>Present / Late / Absent counts per working day.</Card.Description>
        </Card.Header>
        <Card.Content className="pt-2 pb-4">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ATTENDANCE_DAILY} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late"    name="Late"    fill="#eab308" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent"  name="Absent"  fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card.Content>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <Card>
          <Card.Header>
            <Card.Title>Attendance Distribution</Card.Title>
            <Card.Description>Proportion of days per status for the period.</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col items-center py-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ATTENDANCE_PIE} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {ATTENDANCE_PIE.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {ATTENDANCE_PIE.map((e) => (
                <div key={e.name} className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-600 dark:text-dark-400">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                  {e.name}: {e.value} days
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        {/* Attendance table */}
        <Card>
          <Card.Header>
            <Card.Title>Individual Summary</Card.Title>
            <Card.Description>Per-employee attendance figures for July 2026.</Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-3 text-center">Present</th>
                  <th className="py-2.5 px-3 text-center">Late</th>
                  <th className="py-2.5 px-3 text-center">Absent</th>
                  <th className="py-2.5 px-3 text-center">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                {[
                  { name: 'Sarah Thomas', present: 7, late: 1, absent: 1, rate: '87%' },
                  { name: 'Jessica K.',   present: 8, late: 0, absent: 1, rate: '89%' },
                  { name: 'David Lee',    present: 7, late: 1, absent: 1, rate: '87%' },
                  { name: 'Alex Mercer',  present: 8, late: 0, absent: 0, rate: '100%' },
                ].map((r) => (
                  <tr key={r.name} className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20">
                    <td className="py-3 px-4 font-semibold text-dark-900 dark:text-white">{r.name}</td>
                    <td className="py-3 px-3 text-center font-bold text-green-600">{r.present}</td>
                    <td className="py-3 px-3 text-center font-bold text-yellow-600">{r.late}</td>
                    <td className="py-3 px-3 text-center font-bold text-red-500">{r.absent}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                        parseFloat(r.rate) >= 95 ? 'bg-green-500/10 text-green-600' :
                        parseFloat(r.rate) >= 85 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {r.rate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      </div>
    </div>
  );

  // ─── Productivity Report Tab ────────────────────────────────────────────────

  const ProductivityReport = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base font-bold text-dark-900 dark:text-white">Employee Productivity Report</h3>
          <p className="text-xs text-dark-400">Tasks, hours worked, accuracy, and document output per staff member.</p>
        </div>
        <ExportBar name="Productivity_Report_July2026" />
      </div>

      {/* Working hours area chart */}
      <Card>
        <Card.Header>
          <Card.Title>Daily Working Hours per Employee</Card.Title>
          <Card.Description>Net hours worked (excluding breaks) over the reporting period.</Card.Description>
        </Card.Header>
        <Card.Content className="pt-2 pb-4">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={WORKING_HOURS_DATA} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <defs>
                {(['sarah','jessica','david','alex'] as const).map((k, i) => (
                  <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS_LINE[i]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS_LINE[i]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 12]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {(['sarah','jessica','david','alex'] as const).map((k, i) => (
                <Area key={k} type="monotone" dataKey={k} name={['Sarah','Jessica','David','Alex'][i]}
                  stroke={COLORS_LINE[i]} fill={`url(#grad-${k})`} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Card.Content>
      </Card>

      {/* Productivity table */}
      <Card>
        <Card.Header>
          <Card.Title>Productivity Summary Table</Card.Title>
          <Card.Description>Composite metrics for each staff member this period.</Card.Description>
        </Card.Header>
        <Card.Content className="p-0 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 uppercase tracking-wider">
                <th className="py-2.5 px-5">Employee</th>
                <th className="py-2.5 px-4 text-center">Tasks Done</th>
                <th className="py-2.5 px-4 text-center">Docs Uploaded</th>
                <th className="py-2.5 px-4 text-center">Hours Worked</th>
                <th className="py-2.5 px-4 text-center">Accuracy</th>
                <th className="py-2.5 px-4 text-center">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
              {PRODUCTIVITY_DATA.map((r) => {
                const score = Math.round((r.tasksCompleted * 5 + r.docsUploaded * 3 + r.accuracy * 0.2) / 2);
                return (
                  <tr key={r.name} className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-extrabold shrink-0">
                          {r.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-bold text-dark-900 dark:text-white">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-brand-600">{r.tasksCompleted}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-dark-700 dark:text-dark-200">{r.docsUploaded}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-dark-600 dark:text-dark-350">{r.hoursWorked} h</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                        r.accuracy === 100 ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                      }`}>{r.accuracy}%</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="h-1.5 w-16 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full" style={{ width: `${Math.min(score, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-dark-600 dark:text-dark-300">{score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* Tasks completed bar */}
      <Card>
        <Card.Header>
          <Card.Title>Tasks Completed vs Hours Worked</Card.Title>
          <Card.Description>Comparative output efficiency per team member.</Card.Description>
        </Card.Header>
        <Card.Content className="pt-2 pb-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={PRODUCTIVITY_DATA} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
              layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="tasksCompleted" name="Tasks" fill="#6366f1" radius={[0, 4, 4, 0]} />
              <Bar dataKey="docsUploaded"   name="Documents" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card.Content>
      </Card>
    </div>
  );

  // ─── Overtime Report Tab ────────────────────────────────────────────────────

  const OvertimeReport = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base font-bold text-dark-900 dark:text-white">Overtime & Late Arrival Report</h3>
          <p className="text-xs text-dark-400">Extra hours logged and late arrival minutes per employee.</p>
        </div>
        <ExportBar name="Overtime_Report_July2026" />
      </div>

      {/* Overtime bar chart */}
      <Card>
        <Card.Header>
          <Card.Title>Overtime Hours by Employee</Card.Title>
          <Card.Description>Total overtime hours accrued during the reporting period.</Card.Description>
        </Card.Header>
        <Card.Content className="pt-2 pb-4">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={OVERTIME_DATA} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="overtimeHours" name="Overtime (hrs)" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lateMinutes"   name="Late (mins)"    fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card.Content>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overtime status pie */}
        <Card>
          <Card.Header>
            <Card.Title>Shift Status Distribution</Card.Title>
            <Card.Description>On time vs overtime vs undertime overall.</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col items-center py-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={STATUS_PIE} cx="50%" cy="50%" outerRadius={80}
                  paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={9}>
                  {STATUS_PIE.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {STATUS_PIE.map((e) => (
                <div key={e.name} className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-600 dark:text-dark-400">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                  {e.name}: {e.value} shifts
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        {/* Overtime detail table */}
        <Card>
          <Card.Header>
            <Card.Title>Overtime Detail</Card.Title>
            <Card.Description>Breakdown and payable extra hours per employee.</Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-3 text-center">OT Hours</th>
                  <th className="py-2.5 px-3 text-center">Late Mins</th>
                  <th className="py-2.5 px-3 text-center">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                {OVERTIME_DATA.map((r) => {
                  const netMins = r.overtimeHours * 60 - r.lateMinutes;
                  return (
                    <tr key={r.name} className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20">
                      <td className="py-3 px-4 font-semibold text-dark-900 dark:text-white">{r.name}</td>
                      <td className="py-3 px-3 text-center font-bold text-purple-600">+{r.overtimeHours}h</td>
                      <td className="py-3 px-3 text-center font-bold text-yellow-600">{r.lateMinutes}m</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          netMins >= 0 ? 'bg-purple-500/10 text-purple-600' : 'bg-orange-500/10 text-orange-600'
                        }`}>
                          {netMins >= 0 ? `+${(netMins / 60).toFixed(1)}h OT` : `-${Math.abs(netMins)}m`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      </div>
    </div>
  );

  // ─── Summary Report Tab ─────────────────────────────────────────────────────

  const SummaryReport = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base font-bold text-dark-900 dark:text-white">Monthly Summary Report</h3>
          <p className="text-xs text-dark-400">Complete pharmacy operations overview for the selected period.</p>
        </div>
        <ExportBar name="Summary_Report_July2026" />
      </div>

      {/* Summary line chart */}
      <Card>
        <Card.Header>
          <Card.Title>Weekly Performance Trend</Card.Title>
          <Card.Description>Composite performance scores across attendance, productivity, and quality.</Card.Description>
        </Card.Header>
        <Card.Content className="pt-2 pb-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={[
                { week: 'Week 1', attendance: 88, productivity: 82, quality: 95 },
                { week: 'Week 2', attendance: 92, productivity: 88, quality: 97 },
                { week: 'Week 3 (partial)', attendance: 89, productivity: 91, quality: 99 },
              ]}
              margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="attendance"   name="Attendance"   stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
              <Line type="monotone" dataKey="productivity" name="Productivity" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4, fill: '#a855f7' }} />
              <Line type="monotone" dataKey="quality"      name="Quality"      stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card.Content>
      </Card>

      {/* Summary table with all employees */}
      <Card>
        <Card.Header>
          <Card.Title>Complete Staff Report — July 2026</Card.Title>
          <Card.Description>Combined attendance, hours, overtime, and tasks data for the pay cycle.</Card.Description>
        </Card.Header>
        <Card.Content className="p-0 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 uppercase tracking-wider">
                <th className="py-2.5 px-5">Employee</th>
                <th className="py-2.5 px-3 text-center">Att. Rate</th>
                <th className="py-2.5 px-3 text-center">Hours</th>
                <th className="py-2.5 px-3 text-center">OT Hours</th>
                <th className="py-2.5 px-3 text-center">Late Mins</th>
                <th className="py-2.5 px-3 text-center">Tasks</th>
                <th className="py-2.5 px-3 text-center">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
              {[
                { name: 'Sarah Thomas', rate: '87%', hours: 49.3, ot: 3.4, late: 5,  tasks: 6,  acc: 98 },
                { name: 'Jessica K.',   rate: '89%', hours: 55.1, ot: 2.2, late: 0,  tasks: 8,  acc: 100 },
                { name: 'David Lee',    rate: '87%', hours: 45.6, ot: 0.3, late: 20, tasks: 4,  acc: 99 },
                { name: 'Alex Mercer',  rate: '100%',hours: 56.5, ot: 1.5, late: 0,  tasks: 10, acc: 100 },
              ].map((r) => (
                <tr key={r.name} className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-extrabold shrink-0">
                        {r.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-bold text-dark-900 dark:text-white">{r.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      parseFloat(r.rate) === 100 ? 'bg-green-500/10 text-green-600' :
                      parseFloat(r.rate) >= 88 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-orange-500/10 text-orange-600'
                    }`}>{r.rate}</span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-dark-600 dark:text-dark-350">{r.hours}h</td>
                  <td className="py-3.5 px-3 text-center font-bold text-purple-600">+{r.ot}h</td>
                  <td className="py-3.5 px-3 text-center font-bold text-yellow-600">{r.late}m</td>
                  <td className="py-3.5 px-3 text-center font-bold text-brand-600">{r.tasks}</td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      r.acc === 100 ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                    }`}>{r.acc}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
        ))}
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2.5 rounded-xl text-white">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark-900 dark:text-white">Reports & Analytics</h2>
            <p className="text-xs text-dark-500 dark:text-dark-400">
              Visual analytics, exportable reports, and pharmacy performance insights.
            </p>
          </div>
        </div>

        {/* Download All button */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleExportPDF('Full_Report_July2026')}
          leftIcon={<Download className="h-4 w-4" />}
        >
          Download All Reports
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <Card.Content className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-dark-400" />
            <span className="text-xs font-bold text-dark-500 uppercase tracking-wide">Date Range:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { key: '7d',  label: 'Last 7 Days' },
              { key: '14d', label: 'Last 14 Days' },
              { key: '30d', label: 'This Month' },
              { key: 'custom', label: 'Custom' },
            ] as { key: DateRange; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateRange(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateRange === key
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs py-1.5 px-3 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 text-dark-900 dark:text-dark-50"
              />
              <span className="text-xs text-dark-400 font-bold">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs py-1.5 px-3 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 text-dark-900 dark:text-dark-50"
              />
            </div>
          )}
        </Card.Content>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Attendance Rate', value: kpis.attendanceRate, icon: <Users className="h-5 w-5" />, color: 'bg-brand-500/10 text-brand-500', trend: '+2.1%' },
          { label: 'Total Hours Worked', value: kpis.totalHours, icon: <Clock className="h-5 w-5" />, color: 'bg-purple-500/10 text-purple-500', trend: '+5.8h' },
          { label: 'Overtime Logged', value: kpis.overtimeTotal, icon: <TrendingUp className="h-5 w-5" />, color: 'bg-yellow-500/10 text-yellow-500', trend: '-0.6h' },
          { label: 'Late Arrivals', value: kpis.lateArrivals, icon: <AlertTriangle className="h-5 w-5" />, color: 'bg-red-500/10 text-red-500', trend: '-2 vs prev' },
        ].map(({ label, value, icon, color, trend }) => (
          <Card key={label}>
            <Card.Content className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
                <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">{trend}</span>
              </div>
              <div>
                <p className="text-xl font-black text-dark-900 dark:text-white leading-tight">{value}</p>
                <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-1 bg-dark-100/60 dark:bg-dark-900/60 rounded-xl p-1 w-fit">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === key
                ? 'bg-white dark:bg-dark-800 text-brand-600 shadow-sm'
                : 'text-dark-500 dark:text-dark-400 hover:text-dark-800 dark:hover:text-white'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Active Report View */}
      {activeTab === 'attendance'   && <AttendanceReport />}
      {activeTab === 'productivity' && <ProductivityReport />}
      {activeTab === 'overtime'     && <OvertimeReport />}
      {activeTab === 'summary'      && <SummaryReport />}
    </div>
  );
};
