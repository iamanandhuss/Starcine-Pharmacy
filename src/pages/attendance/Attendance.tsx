import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  History,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

interface AttendanceLog {
  dayNumber: number;
  date: string;
  checkIn: string;
  checkOut: string | null;
  workingHours: number;
  lateMinutes: number;
  overtimeHours: number;
  status: 'Present' | 'Late' | 'Overtime' | 'Absent' | 'Off';
}

export const Attendance: React.FC = () => {
  const { profile } = useAuth();
  
  // Digital clock states
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Clocking status states
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Break tracking states
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [totalBreakMs, setTotalBreakMs] = useState(0); // accumulated break ms across multiple breaks

  // Modal details state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayDetails, setSelectedDayDetails] = useState<AttendanceLog | null>(null);

  // Toasts state
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  // Database log history (initially empty)
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [activeRecord, setActiveRecord] = useState<any>(null);
  const [logsLoading, setLogsLoading] = useState(true);

  const fetchAttendance = async () => {
    if (!profile) return;
    setLogsLoading(true);
    try {
      // 1. Fetch active session
      const { data: active } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', profile.id)
        .is('check_out', null)
        .maybeSingle();

      if (active) {
        setActiveRecord(active);
        setIsClockedIn(true);
        setCheckInTime(new Date(active.check_in));
        
        const remarks = active.remarks || '';
        const breakStartMatch = remarks.match(/break_start:([^;]+)/);
        const totalMsMatch = remarks.match(/total_break_ms:(\d+)/);

        const totalMs = totalMsMatch ? parseInt(totalMsMatch[1], 10) : 0;
        setTotalBreakMs(totalMs);

        if (breakStartMatch) {
          setIsOnBreak(true);
          setBreakStartTime(new Date(breakStartMatch[1]));
        } else {
          setIsOnBreak(false);
          setBreakStartTime(null);
        }
      } else {
        setIsClockedIn(false);
        setCheckInTime(null);
        setIsOnBreak(false);
        setBreakStartTime(null);
        setTotalBreakMs(0);
        setActiveRecord(null);
      }

      // 2. Fetch history logs
      const { data: history, error: historyError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', profile.id)
        .not('check_out', 'is', null)
        .order('attendance_date', { ascending: false });

      if (historyError) throw historyError;

      if (history && history.length > 0) {
        const mappedLogs: AttendanceLog[] = history.map((log: any) => {
          const dateStr = log.attendance_date;
          const checkInLocal = new Date(log.check_in).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          const checkOutLocal = new Date(log.check_out).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          const workingHrs = (log.worked_minutes || 0) / 60;
          const overtimeHrs = (log.overtime_minutes || 0) / 60;
          
          return {
            dayNumber: new Date(dateStr).getDate() + 1,
            date: dateStr,
            checkIn: checkInLocal,
            checkOut: checkOutLocal,
            workingHours: Math.round(workingHrs * 100) / 100,
            lateMinutes: log.late_minutes || 0,
            overtimeHours: Math.round(overtimeHrs * 100) / 100,
            status: log.status,
          };
        });
        setLogs(mappedLogs);
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      console.error('Error fetching attendance logs:', err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [profile]);

  // Digital clock timer hook
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Elapsed hours timer hook (pauses during break)
  useEffect(() => {
    let timer: any;
    if (isClockedIn && checkInTime && !isOnBreak) {
      timer = setInterval(() => {
        // Net elapsed = total since check-in minus accumulated break time
        const grossMs = new Date().getTime() - checkInTime.getTime();
        const netMs = grossMs - totalBreakMs;
        const hrs = Math.floor(netMs / (1000 * 60 * 60));
        const mins = Math.floor((netMs / (1000 * 60)) % 60);
        const secs = Math.floor((netMs / 1000) % 60);

        const pad = (num: number) => num.toString().padStart(2, '0');
        setElapsedTime(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      }, 1000);
    } else if (!isClockedIn) {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(timer);
  }, [isClockedIn, checkInTime, isOnBreak, totalBreakMs]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Clock In trigger
  const handleCheckIn = async () => {
    if (!profile) return;
    const now = new Date();
    try {
      const todayStr = now.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: profile.id,
          attendance_date: todayStr,
          check_in: now.toISOString(),
          status: 'Present',
          remarks: 'total_break_ms:0'
        })
        .select()
        .single();

      if (error) throw error;

      setActiveRecord(data);
      setIsClockedIn(true);
      setCheckInTime(now);
      setIsOnBreak(false);
      setTotalBreakMs(0);
      showToast(`Checked In at ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`, 'success');
    } catch (err: any) {
      showToast(`Check in failed: ${err.message}`, 'info');
    }
  };

  // Take a Break trigger
  const handleTakeBreak = async () => {
    if (!activeRecord) return;
    const now = new Date();
    try {
      const updatedRemarks = `break_start:${now.toISOString()};total_break_ms:${totalBreakMs}`;
      const { error } = await supabase
        .from('attendance')
        .update({ remarks: updatedRemarks })
        .eq('id', activeRecord.id);

      if (error) throw error;

      setIsOnBreak(true);
      setBreakStartTime(now);
      showToast(`Break started at ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`, 'info');
    } catch (err: any) {
      showToast(`Break trigger failed: ${err.message}`, 'info');
    }
  };

  // Resume Work trigger
  const handleResumeWork = async () => {
    if (!activeRecord || !breakStartTime) return;
    const now = new Date();
    try {
      const breakDurationMs = now.getTime() - breakStartTime.getTime();
      const newTotalBreakMs = totalBreakMs + breakDurationMs;
      
      const updatedRemarks = `total_break_ms:${newTotalBreakMs}`;
      const { error } = await supabase
        .from('attendance')
        .update({ remarks: updatedRemarks })
        .eq('id', activeRecord.id);

      if (error) throw error;

      setTotalBreakMs(newTotalBreakMs);
      setIsOnBreak(false);
      setBreakStartTime(null);
      const breakMins = Math.round(breakDurationMs / (1000 * 60));
      showToast(`Resumed work. Break duration: ${breakMins} min(s).`, 'success');
    } catch (err: any) {
      showToast(`Resume failed: ${err.message}`, 'info');
    }
  };

  // Clock Out trigger
  const handleCheckOut = async () => {
    if (!activeRecord || !checkInTime) return;

    // If still on break, end it first
    let finalBreakMs = totalBreakMs;
    if (isOnBreak && breakStartTime) {
      finalBreakMs += new Date().getTime() - breakStartTime.getTime();
    }

    const outTime = new Date();
    const inTime = checkInTime;

    // Gross elapsed minus break time = net working hours
    const grossMs = outTime.getTime() - inTime.getTime();
    const netMs = grossMs - finalBreakMs;
    const rawWorkingHours = netMs / (1000 * 60 * 60);
    const workingHours = Math.round(rawWorkingHours * 100) / 100;
    const workedMinutes = Math.round(netMs / (1000 * 60));

    // Late calculation (standard is 09:00 AM)
    const standardStart = new Date(inTime);
    standardStart.setHours(9, 0, 0, 0);
    let lateMinutes = 0;
    if (inTime.getTime() > standardStart.getTime()) {
      lateMinutes = Math.floor((inTime.getTime() - standardStart.getTime()) / (1000 * 60));
    }

    // Overtime calculation (standard shift is 8.0 hours)
    const overtimeHours = workingHours > 8 ? Math.round((workingHours - 8) * 100) / 100 : 0;
    const overtimeMinutes = Math.round(overtimeHours * 60);

    // Determine status
    let status: 'Present' | 'Late' | 'Overtime' = 'Present';
    if (overtimeHours > 0) status = 'Overtime';
    else if (lateMinutes > 0) status = 'Late';

    const totalBreakMinutes = Math.round(finalBreakMs / (1000 * 60));

    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: outTime.toISOString(),
          worked_minutes: workedMinutes,
          late_minutes: lateMinutes,
          overtime_minutes: overtimeMinutes,
          status,
          remarks: `total_break_ms:${finalBreakMs}`
        })
        .eq('id', activeRecord.id);

      if (error) throw error;

      setIsClockedIn(false);
      setCheckInTime(null);
      setIsOnBreak(false);
      setBreakStartTime(null);
      setTotalBreakMs(0);
      setActiveRecord(null);
      showToast(`Checked Out. Net work: ${workingHours} hrs (break: ${totalBreakMinutes} min).`, 'success');
      await fetchAttendance();
    } catch (err: any) {
      showToast(`Check out failed: ${err.message}`, 'info');
    }
  };

  // Helper for current day index
  const nowDayNumber = (): number => {
    return new Date().getDate();
  };

  // Summary Metrics calculations
  const totalDaysPresent = logs.filter((l) => l.status === 'Present' || l.status === 'Late' || l.status === 'Overtime').length;
  const totalLateDays = logs.filter((l) => l.status === 'Late').length;
  const totalLateMinutes = logs.reduce((sum, l) => sum + l.lateMinutes, 0);
  const totalOvertimeHours = Math.round(logs.reduce((sum, l) => sum + l.overtimeHours, 0) * 100) / 100;
  const totalWorkingHours = Math.round(logs.reduce((sum, l) => sum + l.workingHours, 0) * 100) / 100;

  // Calendar parameters: July 2026
  // July 2026 starts on a Wednesday, has 31 days.
  const daysInMonth = 31;
  const startDayOfWeek: number = 3; // Wednesday (0: Sun, 1: Mon, 2: Tue, 3: Wed, etc.)

  const calendarDays: (number | null)[] = [];
  
  // Fill leading empty days
  const leadingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Align to Monday
  for (let i = 0; i < leadingDays; i++) {
    calendarDays.push(null);
  }
  
  // Fill calendar days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const handleDayClick = (day: number) => {
    const dayLog = logs.find((l) => l.dayNumber === day);
    const todayNum = nowDayNumber();

    if (dayLog) {
      setSelectedDayDetails(dayLog);
      setIsModalOpen(true);
    } else if (day === todayNum && isClockedIn) {
      setSelectedDayDetails({
        dayNumber: day,
        date: '2026-07-10',
        checkIn: checkInTime?.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) || '',
        checkOut: 'Active Shift',
        workingHours: 0,
        lateMinutes: 0,
        overtimeHours: 0,
        status: 'Present',
      });
      setIsModalOpen(true);
    } else if (day > todayNum) {
      showToast('Cannot inspect scheduled shifts in the future.', 'info');
    } else {
      // Offline/Off days
      const isWeekend = isDayWeekend(day);
      setSelectedDayDetails({
        dayNumber: day,
        date: `2026-07-${day.toString().padStart(2, '0')}`,
        checkIn: '--:--',
        checkOut: '--:--',
        workingHours: 0,
        lateMinutes: 0,
        overtimeHours: 0,
        status: isWeekend ? 'Off' : 'Absent',
      });
      setIsModalOpen(true);
    }
  };

  const isDayWeekend = (dayNum: number): boolean => {
    // July 2026 calendar day index checks
    // Wednesday is day 1, Thursday is day 2, Fri day 3, Sat day 4, Sun day 5.
    // Days where (dayNumber + 1) % 7 === 5 or 6 are weekends (Sat/Sun)
    const dayOfWeek = (dayNum - 1 + startDayOfWeek) % 7;
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  const getDayStatusColor = (dayNum: number) => {
    const todayNum = nowDayNumber();
    if (dayNum > todayNum) return 'bg-transparent text-dark-300 dark:text-dark-700 cursor-not-allowed';
    
    if (dayNum === todayNum && isClockedIn) return 'bg-brand-500/20 text-brand-600 border border-brand-500 animate-pulse';

    const dayLog = logs.find((l) => l.dayNumber === dayNum);
    if (!dayLog) {
      return isDayWeekend(dayNum)
        ? 'bg-dark-100 dark:bg-dark-800/40 text-dark-400 dark:text-dark-600'
        : 'bg-red-500/10 text-red-500 border border-red-500/20'; // Absent
    }

    switch (dayLog.status) {
      case 'Present':
        return 'bg-green-500/10 text-green-600 border border-green-500/20';
      case 'Late':
        return 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20';
      case 'Overtime':
        return 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
      default:
        return 'bg-dark-100 dark:bg-dark-800/40 text-dark-400 dark:text-dark-600';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Toast Container */}
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

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-brand-600 p-2.5 rounded-xl text-white">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-dark-900 dark:text-white">Attendance logging</h2>
          <p className="text-xs text-dark-500 dark:text-dark-400">
             Track timesheets, calculate overtime parameters, and review check-in checklists.
          </p>
        </div>
      </div>

      {/* Roster / Calculations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Clock In / Out Controller */}
          <Card className="overflow-hidden relative border-brand-500/20 dark:border-brand-500/10">
            <Card.Content className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
              
              {/* Digital Clock Display */}
              <div className="text-center md:text-left space-y-2">
                <div className="text-3xl sm:text-5xl font-black font-mono tracking-wider text-dark-900 dark:text-white leading-none">
                  {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <p className="text-xs text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                {isClockedIn && checkInTime && (
                  <div className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-bold mt-2 ${
                    isOnBreak
                      ? 'bg-yellow-500/10 text-yellow-600'
                      : 'bg-green-500/10 text-green-600'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      isOnBreak ? 'bg-yellow-500' : 'bg-green-500 animate-ping'
                    }`} />
                    {isOnBreak ? 'On break — timer paused' : `Active shift: ${elapsedTime}`}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center gap-2.5 shrink-0 w-full sm:w-auto">
                {!isClockedIn ? (
                  // ── Not clocked in: show Check In ──
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleCheckIn}
                    className="w-full sm:w-48 bg-green-600 hover:bg-green-700"
                  >
                    Check In Shift
                  </Button>
                ) : isOnBreak ? (
                  // ── On break: show Resume Work + Check Out ──
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleResumeWork}
                      className="w-full sm:w-48 bg-brand-600 hover:bg-brand-700"
                    >
                      Resume Work
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleCheckOut}
                      className="w-full sm:w-48"
                    >
                      Check Out Shift
                    </Button>
                  </>
                ) : (
                  // ── Active shift: show Take a Break + Check Out ──
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleTakeBreak}
                      className="w-full sm:w-48 border-yellow-400 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                    >
                      Take a Break
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleCheckOut}
                      className="w-full sm:w-48"
                    >
                      Check Out Shift
                    </Button>
                  </>
                )}
                <p className="text-[10px] text-dark-400 dark:text-dark-500 font-medium text-center">
                  *Standard shift starts at 8:00 AM · breaks excluded from working hours
                </p>
              </div>

            </Card.Content>
          </Card>

          {/* History log list */}
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-brand-500" />
                <Card.Title>Attendance Logs</Card.Title>
              </div>
              <Card.Description>Roster checkout details for this pay cycle.</Card.Description>
            </Card.Header>
            <Card.Content className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-4">Shift Timings</th>
                    <th className="py-3 px-4">Work Hours</th>
                    <th className="py-3 px-4">Calculations</th>
                    <th className="py-3 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800 text-xs">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-dark-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent" />
                          Loading logs from database...
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-dark-400">
                        No attendance logs found for this period.
                      </td>
                    </tr>
                  ) : (
                    [...logs].reverse().map((log) => {
                      if (log.status === 'Off') return null;
                      return (
                        <tr key={log.date} className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-dark-900 dark:text-white">
                            {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-dark-600 dark:text-dark-350">
                            {log.checkIn} - {log.checkOut || '--:--'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">
                            {log.workingHours} hrs
                          </td>
                          <td className="py-3.5 px-4 text-[10px] text-dark-500 space-y-0.5">
                            {log.lateMinutes > 0 && (
                              <p className="text-yellow-600 dark:text-yellow-400 font-semibold">
                                Late: +{log.lateMinutes} mins
                              </p>
                            )}
                            {log.overtimeHours > 0 && (
                              <p className="text-purple-600 dark:text-purple-400 font-semibold">
                                Overtime: +{log.overtimeHours} hrs
                              </p>
                            )}
                            {log.lateMinutes === 0 && log.overtimeHours === 0 && (
                              <p className="text-dark-400">Standard Shift</p>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right font-bold">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wide border
                              ${log.status === 'Present' ? 'bg-green-500/10 text-green-600 border-green-500/25' :
                                log.status === 'Late' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/25' :
                                log.status === 'Overtime' ? 'bg-purple-500/10 text-purple-600 border-purple-500/25' :
                                'bg-red-500/10 text-red-500 border-red-500/25'}
                            `}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Card.Content>
          </Card>
        </div>

        {/* Right column (1/3 width on desktop) */}
        <div className="space-y-6">
          
          {/* Calendar Widget */}
          <Card>
            <Card.Header className="flex flex-row justify-between items-center p-6 border-b border-dark-100 dark:border-dark-800">
              <div>
                <Card.Title>July 2026</Card.Title>
                <Card.Description>Timesheet Grid</Card.Description>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="p-1 rounded cursor-not-allowed text-dark-300 dark:text-dark-700" leftIcon={<ChevronLeft className="h-4 w-4" />} />
                <Button variant="outline" size="sm" className="p-1 rounded cursor-not-allowed text-dark-300 dark:text-dark-700" leftIcon={<ChevronRight className="h-4 w-4" />} />
              </div>
            </Card.Header>
            <Card.Content className="p-4 sm:p-5">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-dark-400 dark:text-dark-500 uppercase tracking-wide mb-2">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="aspect-square" />;
                  }
                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => handleDayClick(day)}
                      className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95
                        ${getDayStatusColor(day)}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 pt-4 border-t border-dark-100 dark:border-dark-800 text-[10px] font-semibold text-dark-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span>Late</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span>Overtime</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-dark-250 dark:bg-dark-600" />
                  <span>Off</span>
                </div>
              </div>

            </Card.Content>
          </Card>

          {/* Stats Widget */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <Card.Content className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                  <CheckCircle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-dark-400 uppercase tracking-wide leading-tight">Attendance Rate</p>
                  <p className="text-base font-bold text-dark-900 dark:text-white pt-0.5">
                    {totalDaysPresent > 0 ? Math.round(((totalDaysPresent - logs.filter(l => l.status === 'Absent').length) / totalDaysPresent) * 1000) / 10 : 100}%
                  </p>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-4 flex items-center gap-3">
                <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-dark-400 uppercase tracking-wide leading-tight">Working Hours</p>
                  <p className="text-base font-bold text-dark-900 dark:text-white pt-0.5">
                    {totalWorkingHours} hrs
                  </p>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-dark-400 uppercase tracking-wide leading-tight">Late Count</p>
                  <p className="text-base font-bold text-dark-900 dark:text-white pt-0.5">
                    {totalLateDays} ({totalLateMinutes}m)
                  </p>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-dark-400 uppercase tracking-wide leading-tight">Overtime</p>
                  <p className="text-base font-bold text-dark-900 dark:text-white pt-0.5">
                    +{totalOvertimeHours} hrs
                  </p>
                </div>
              </Card.Content>
            </Card>
          </div>

        </div>

      </div>

      {/* Calendar Day Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDayDetails ? `Shift Log Details: ${new Date(selectedDayDetails.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Shift details'}
        footer={
          <Button variant="primary" onClick={() => setIsModalOpen(false)}>
            Close Details
          </Button>
        }
      >
        {selectedDayDetails && (
          <div className="space-y-4 text-xs font-semibold">
            
            <div className="flex justify-between items-center p-3 border border-dark-150 dark:border-dark-800 rounded-lg bg-dark-50/20">
              <span className="text-dark-500">Day Status</span>
              <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase
                ${selectedDayDetails.status === 'Present' ? 'bg-green-500/10 text-green-600 border-green-500/25' :
                  selectedDayDetails.status === 'Late' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/25' :
                  selectedDayDetails.status === 'Overtime' ? 'bg-purple-500/10 text-purple-600 border-purple-500/25' :
                  selectedDayDetails.status === 'Off' ? 'bg-dark-100 dark:bg-dark-800 text-dark-500 border-dark-250 dark:border-dark-750' :
                  'bg-red-500/10 text-red-500 border-red-500/25'}
              `}>
                {selectedDayDetails.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-dark-150 dark:border-dark-800 rounded-lg bg-dark-50/20">
                <p className="text-[10px] text-dark-400 font-bold uppercase pb-1 leading-none">Clock In</p>
                <p className="text-sm font-mono text-dark-900 dark:text-white font-extrabold">{selectedDayDetails.checkIn}</p>
              </div>
              <div className="p-3 border border-dark-150 dark:border-dark-800 rounded-lg bg-dark-50/20">
                <p className="text-[10px] text-dark-400 font-bold uppercase pb-1 leading-none">Clock Out</p>
                <p className="text-sm font-mono text-dark-900 dark:text-white font-extrabold">{selectedDayDetails.checkOut || 'Active'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border border-dark-150 dark:border-dark-800 rounded-lg bg-dark-50/20 text-center">
                <p className="text-[9px] text-dark-400 font-bold uppercase pb-1 leading-none">Hours</p>
                <p className="text-sm text-dark-900 dark:text-white font-extrabold">{selectedDayDetails.workingHours}h</p>
              </div>
              <div className="p-3 border border-dark-150 dark:border-dark-800 rounded-lg bg-dark-50/20 text-center">
                <p className="text-[9px] text-dark-400 font-bold uppercase pb-1 leading-none font-semibold">Late Minutes</p>
                <p className={`text-sm font-extrabold ${selectedDayDetails.lateMinutes > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-dark-900 dark:text-white'}`}>
                  {selectedDayDetails.lateMinutes}m
                </p>
              </div>
              <div className="p-3 border border-dark-150 dark:border-dark-800 rounded-lg bg-dark-50/20 text-center">
                <p className="text-[9px] text-dark-400 font-bold uppercase pb-1 leading-none">Overtime</p>
                <p className={`text-sm font-extrabold ${selectedDayDetails.overtimeHours > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-dark-900 dark:text-white'}`}>
                  +{selectedDayDetails.overtimeHours}h
                </p>
              </div>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
};
