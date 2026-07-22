import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  Activity,
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  MapPin,
  AlertTriangle,
  Building2,
  Briefcase
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabase';
import { Toast } from '../../components/ui/Toast';

interface ProfileDetails {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string | null;
  date_of_birth: string | null;
  joining_date: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  is_active: boolean;
  approval_status: string;
  role_name: string;
  branch_name: string;
  branch_id: string | null;
  department_name: string;
}

interface AttendanceLog {
  id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  worked_minutes: number;
  late_minutes: number;
  overtime_minutes: number;
  status: string;
}

type SortField = 'date' | 'hours' | 'late';
type SortOrder = 'asc' | 'desc';

export const EmployeeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<ProfileDetails | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);

  // Sorting, filtering & pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toastId = Date.now();
    setToasts(prev => [...prev, { id: toastId, message, type }]);
  };

  const fetchProfileData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch complete user profile with role, branch, department joins
      const { data: u, error: uError } = await supabase
        .from('users')
        .select('*, roles(name), branches(name), departments(name)')
        .eq('id', id)
        .maybeSingle();

      if (uError) throw uError;

      if (u) {
        setEmployee({
          id: u.id,
          employee_code: u.employee_code || `EMP-${u.id.substring(0, 6).toUpperCase()}`,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Staff Member',
          email: u.email,
          phone: u.phone || '—',
          gender: u.gender || null,
          date_of_birth: u.date_of_birth || null,
          joining_date: u.joining_date || null,
          address: u.address || null,
          emergency_contact_name: u.emergency_contact_name || null,
          emergency_contact_phone: u.emergency_contact_phone || null,
          is_active: !!u.is_active,
          approval_status: u.approval_status || 'approved',
          role_name: u.roles?.name || 'Staff',
          branch_name: u.branches?.name || 'Unassigned Store',
          branch_id: u.branch_id || null,
          department_name: u.departments?.name || 'Pharmacy Ops'
        });

        // 2. Fetch full attendance history for this user
        const { data: attData, error: attError } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', id)
          .order('attendance_date', { ascending: false });

        if (attError) console.error('Error fetching attendance logs:', attError.message);

        const logs: AttendanceLog[] = (attData || []).map((a: any) => {
          let status = 'Present';
          if (a.late_minutes > 0) status = 'Late';
          if (!a.check_in && !a.check_out) status = 'Absent';

          return {
            id: a.id,
            attendance_date: a.attendance_date,
            check_in: a.check_in,
            check_out: a.check_out,
            worked_minutes: a.worked_minutes || 0,
            late_minutes: a.late_minutes || 0,
            overtime_minutes: a.overtime_minutes || 0,
            status
          };
        });

        setAttendanceLogs(logs);
      }
    } catch (err: any) {
      console.error('Error loading employee profile:', err.message);
      showToast('Failed to load employee profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [id]);

  // Handle Approve / Reject actions
  const handleApprove = async () => {
    if (!employee) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          approval_status: 'approved',
          is_active: true,
          approved_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      if (error) throw error;
      showToast(`Employee "${employee.full_name}" approved successfully!`);
      fetchProfileData();
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`, 'error');
    }
  };

  const handleReject = async () => {
    if (!employee) return;
    if (!window.confirm(`Are you sure you want to reject ${employee.full_name}?`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          approval_status: 'rejected',
          is_active: false
        })
        .eq('id', employee.id);

      if (error) throw error;
      showToast(`Employee "${employee.full_name}" request rejected.`);
      fetchProfileData();
    } catch (err: any) {
      showToast(`Rejection failed: ${err.message}`, 'error');
    }
  };

  // Filtered & Sorted Attendance Logs
  const filteredLogs = useMemo(() => {
    return attendanceLogs.filter(log => {
      const matchesSearch = log.attendance_date.includes(searchTerm) || log.status.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || log.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [attendanceLogs, searchTerm, statusFilter]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let valA: any = a.attendance_date;
      let valB: any = b.attendance_date;

      if (sortField === 'hours') {
        valA = a.worked_minutes;
        valB = b.worked_minutes;
      } else if (sortField === 'late') {
        valA = a.late_minutes;
        valB = b.late_minutes;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLogs, sortField, sortOrder]);

  // Paginated Attendance Logs
  const totalPages = Math.ceil(sortedLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLogs.slice(start, start + pageSize);
  }, [sortedLogs, currentPage, pageSize]);

  // Compute Overview Summary Stats
  const totalWorkedMinutes = useMemo(() => attendanceLogs.reduce((acc, curr) => acc + curr.worked_minutes, 0), [attendanceLogs]);
  const totalLateCount = useMemo(() => attendanceLogs.filter(a => a.late_minutes > 0).length, [attendanceLogs]);
  const attendanceRate = useMemo(() => {
    if (attendanceLogs.length === 0) return '100%';
    const presentCount = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
    return `${Math.round((presentCount / attendanceLogs.length) * 100)}%`;
  }, [attendanceLogs]);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notifications */}
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(item => item.id !== t.id))} />
      ))}

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark-200 dark:border-dark-800 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employees')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="rounded-full p-2"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-dark-900 dark:text-white">
                {employee?.full_name || 'Staff Profile'}
              </h1>
              {employee && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  {employee.employee_code}
                </span>
              )}
            </div>
            <p className="text-xs text-dark-500 dark:text-dark-400">
              Detailed Staff Roster Profile & Attendance Transaction Logs
            </p>
          </div>
        </div>

        {/* Approval Actions Banner if Pending */}
        {employee?.approval_status === 'pending' && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs">
            <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Pending Approval
            </span>
            <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2.5 py-1" onClick={handleApprove}>
              <UserCheck className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
            <Button variant="danger" size="sm" className="text-xs px-2.5 py-1" onClick={handleReject}>
              <UserX className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
          </div>
        )}
      </div>

      {loading || !employee ? (
        <Card className="p-12 text-center text-dark-400">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
            <p className="text-sm font-semibold">Loading profile & attendance logs from database...</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Main Staff Information Card */}
          <Card className="overflow-hidden border border-dark-200 dark:border-dark-800">
            <div className="bg-gradient-to-r from-brand-600/10 via-purple-600/10 to-transparent p-6 border-b border-dark-150 dark:border-dark-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
                    {employee.first_name.slice(0, 1).toUpperCase()}{employee.last_name.slice(0, 1).toUpperCase() || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-dark-900 dark:text-white">{employee.full_name}</h2>
                      <span className="text-[10px] font-extrabold uppercase tracking-wide bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 px-2.5 py-0.5 rounded-full border border-brand-500/20">
                        {employee.role_name}
                      </span>
                    </div>
                    <p className="text-xs text-dark-500 dark:text-dark-400 mt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (employee.branch_id) {
                            navigate(`/super-admin/stores/${employee.branch_id}`);
                          }
                        }}
                        className="flex items-center gap-1.5 font-bold text-dark-800 dark:text-dark-200 hover:text-brand-500 dark:hover:text-brand-400 hover:underline transition-colors group cursor-pointer"
                        title="Click to view Store Branch details"
                      >
                        <Building2 className="h-3.5 w-3.5 text-brand-500 group-hover:scale-110 transition-transform" />
                        <span>{employee.branch_name}</span>
                      </button>
                      <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 text-purple-500" /> {employee.department_name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                    employee.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${employee.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    {employee.is_active ? 'Active Employee' : 'Inactive / Offline'}
                  </span>
                </div>
              </div>
            </div>

            <Card.Content className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
              <div>
                <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Email Address</p>
                <p className="font-semibold text-dark-900 dark:text-white mt-1 flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 text-brand-500 shrink-0" /> {employee.email}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Phone Number</p>
                <p className="font-semibold text-dark-900 dark:text-white mt-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-brand-500 shrink-0" /> {employee.phone}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Joining Date</p>
                <p className="font-semibold text-dark-900 dark:text-white mt-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-brand-500 shrink-0" /> 
                  {employee.joining_date ? new Date(employee.joining_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Address Location</p>
                <p className="font-semibold text-dark-900 dark:text-white mt-1 flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.5 w-3.5 text-brand-500 shrink-0" /> {employee.address || 'Not specified'}
                </p>
              </div>
            </Card.Content>
          </Card>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card>
              <Card.Content className="p-5 flex items-center gap-4">
                <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Total Worked Hours</p>
                  <p className="text-2xl font-black text-dark-900 dark:text-white leading-tight">
                    {(totalWorkedMinutes / 60).toFixed(1)} <span className="text-xs font-semibold text-dark-500">hrs</span>
                  </p>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Attendance Rate</p>
                  <p className="text-2xl font-black text-dark-900 dark:text-white leading-tight">{attendanceRate}</p>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-5 flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Late Check-ins</p>
                  <p className="text-2xl font-black text-dark-900 dark:text-white leading-tight">
                    {totalLateCount} <span className="text-xs font-semibold text-dark-500">days</span>
                  </p>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Detailed Attendance History Table with Sorting & Pagination */}
          <Card>
            <Card.Header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dark-150 dark:border-dark-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-brand-500" />
                  <Card.Title>Attendance History & Timesheets</Card.Title>
                </div>
                <Card.Description>
                  Complete log of check-ins, check-outs, worked hours, and lateness penalties.
                </Card.Description>
              </div>

              {/* Controls: Search & Status Filter */}
              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <div className="w-full sm:w-48">
                  <Input
                    placeholder="Search by date..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    leftIcon={<Search className="h-3.5 w-3.5 text-dark-400" />}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 text-xs font-semibold rounded-lg px-3 py-2 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            </Card.Header>

            <Card.Content className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-dark-50 dark:bg-dark-900/50 text-dark-500 dark:text-dark-400 font-bold border-b border-dark-150 dark:border-dark-800 uppercase tracking-wider">
                    <tr>
                      <th
                        className="py-3.5 px-4 cursor-pointer hover:text-brand-500 transition-colors"
                        onClick={() => handleSortToggle('date')}
                      >
                        <div className="flex items-center gap-1">
                          Date <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4">Check In</th>
                      <th className="py-3.5 px-4">Check Out</th>
                      <th
                        className="py-3.5 px-4 cursor-pointer hover:text-brand-500 transition-colors"
                        onClick={() => handleSortToggle('hours')}
                      >
                        <div className="flex items-center gap-1">
                          Worked Duration <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th
                        className="py-3.5 px-4 cursor-pointer hover:text-brand-500 transition-colors"
                        onClick={() => handleSortToggle('late')}
                      >
                        <div className="flex items-center gap-1">
                          Lateness <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-dark-100 dark:divide-dark-800 font-medium">
                    {paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-dark-400">
                          No attendance entries match the current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log) => {
                        const formattedDate = new Date(log.attendance_date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                        const checkInTime = log.check_in
                          ? new Date(log.check_in).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                          : '—';
                        const checkOutTime = log.check_out
                          ? new Date(log.check_out).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                          : '—';

                        return (
                          <tr key={log.id} className="hover:bg-dark-50/50 dark:hover:bg-dark-900/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">
                              {formattedDate}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-dark-600 dark:text-dark-300">
                              {checkInTime}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-dark-600 dark:text-dark-300">
                              {checkOutTime}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">
                              {(log.worked_minutes / 60).toFixed(1)} hrs
                            </td>
                            <td className="py-3.5 px-4">
                              {log.late_minutes > 0 ? (
                                <span className="inline-flex items-center text-amber-600 font-bold">
                                  +{log.late_minutes} min
                                </span>
                              ) : (
                                <span className="text-dark-400">On Time</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  log.status === 'Present'
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : log.status === 'Late'
                                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                    : 'bg-red-500/10 text-red-600 border border-red-500/20'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-dark-150 dark:border-dark-800 bg-dark-50/50 dark:bg-dark-900/20">
                <div className="flex items-center gap-2 text-xs text-dark-500">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded px-2 py-1 text-dark-900 dark:text-white font-semibold"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>per page (Total {sortedLogs.length} logs)</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-dark-500 mr-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
};

export default EmployeeProfile;