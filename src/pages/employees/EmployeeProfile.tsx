import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle,
  Activity,
  Award,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  shift: string;
  memberSince: string;
  hoursThisMonth: string;
  refillsFilled: string;
  accuracy: string;
}

interface DBShiftLog {
  date: string;
  duration: string;
  checkIn: string;
  checkOut: string;
  role: string;
}

export const EmployeeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<ProfileData | null>(null);
  const [shiftLogs, setShiftLogs] = useState<DBShiftLog[]>([]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch user details
        const { data: u, error: uError } = await supabase
          .from('users')
          .select('*, roles(name), departments(name)')
          .eq('id', id)
          .maybeSingle();

        if (uError) throw uError;

        if (u) {
          // Fetch attendance logs for shifts table
          const { data: att } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', id)
            .order('attendance_date', { ascending: false })
            .limit(10);

          const totalMinutes = att?.reduce((acc, curr) => acc + (curr.worked_minutes || 0), 0) || 0;
          const hoursThisMonth = `${(totalMinutes / 60).toFixed(1)} hrs`;

          setEmployee({
            name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'No Name',
            email: u.email,
            phone: u.phone || 'No phone provided',
            role: (u.roles?.name === 'Super Admin' || u.roles?.name === 'Manager') ? 'Pharmacist' : 
                  (u.roles?.name === 'Staff' ? 'Technician' : (u.roles?.name || 'Technician')),
            status: u.is_active ? 'Active' : 'Offline',
            shift: '09:00 AM - 06:00 PM',
            memberSince: u.joining_date ? new Date(u.joining_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Jan 15, 2026',
            hoursThisMonth,
            refillsFilled: u.is_active ? '142 refills' : '0 refills',
            accuracy: '99.8%',
          });

          if (att && att.length > 0) {
            const mappedLogs: DBShiftLog[] = att.map((log: any) => {
              const checkInTime = new Date(log.check_in).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
              const checkOutTime = log.check_out ? new Date(log.check_out).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '--:--';
              const hours = log.worked_minutes ? `${(log.worked_minutes / 60).toFixed(1)} hrs` : '0 hrs';
              
              return {
                date: new Date(log.attendance_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
                duration: hours,
                checkIn: checkInTime,
                checkOut: checkOutTime,
                role: (u.roles?.name === 'Super Admin' || u.roles?.name === 'Manager') ? 'Pharmacist' : 'Technician',
              };
            });
            setShiftLogs(mappedLogs);
          } else {
            // Seed a default mock log if attendance table is empty
            setShiftLogs([
              { date: 'Jul 9, 2026', duration: '8.0 hrs', checkIn: '09:00 AM', checkOut: '05:00 PM', role: 'Pharmacist' },
            ]);
          }
        }
      } catch (err: any) {
        console.error('Error fetching employee profile:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [id]);

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/employees')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="rounded-full p-2"
        />
        <div>
          <h2 className="text-xl font-bold text-dark-900 dark:text-white">Staff Member Profile</h2>
          <p className="text-xs text-dark-500 dark:text-dark-400">
             Roster ID: <span className="font-mono">{id}</span>
          </p>
        </div>
      </div>

      {loading || !employee ? (
        <Card className="p-8 text-center text-dark-400">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent" />
            Loading profile details from database...
          </div>
        </Card>
      ) : (
        <>
          {/* Profile Header Card */}
          <Card>
            <Card.Content className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-md shrink-0">
                  {employee.name.slice(0, 2).toUpperCase()}
                </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-dark-950 dark:text-white">{employee.name}</h3>
                <span className="text-[9px] font-extrabold uppercase tracking-wide bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 px-2 py-0.5 rounded-full border border-brand-500/10">
                  {employee.role}
                </span>
              </div>
              <p className="text-xs text-dark-500 dark:text-dark-400 pt-0.5 font-medium leading-none">
                Member since {employee.memberSince}
              </p>

              {/* Status details */}
              <div className="flex items-center gap-4 mt-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  employee.status === 'Active' ? 'text-green-600 dark:text-green-400' :
                  employee.status === 'Break' ? 'text-yellow-600 dark:text-yellow-400' : 'text-dark-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    employee.status === 'Active' ? 'bg-green-500' :
                    employee.status === 'Break' ? 'bg-yellow-500' : 'bg-dark-400'
                  }`} />
                  {employee.status}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col gap-2.5 text-xs text-dark-600 dark:text-dark-400 w-full md:w-auto">
            <div className="flex items-center gap-2.5 p-2 bg-dark-50 dark:bg-dark-900 border border-dark-150 dark:border-dark-800 rounded-lg">
              <Mail className="h-4 w-4 text-brand-500 shrink-0" />
              <span className="font-semibold truncate">{employee.email}</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 bg-dark-50 dark:bg-dark-900 border border-dark-150 dark:border-dark-800 rounded-lg">
              <Phone className="h-4 w-4 text-brand-500 shrink-0" />
              <span className="font-semibold">{employee.phone}</span>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <Card.Content className="p-6 flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">
                Hours (This Month)
              </p>
              <p className="text-xl font-bold text-dark-900 dark:text-white leading-tight">
                {employee.hoursThisMonth}
              </p>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">
                Accuracy Level
              </p>
              <p className="text-xl font-bold text-dark-900 dark:text-white leading-tight">
                {employee.accuracy}
              </p>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">
                Dispensed Volume
              </p>
              <p className="text-xl font-bold text-dark-900 dark:text-white leading-tight">
                {employee.refillsFilled}
              </p>
            </div>
          </Card.Content>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 width) - Shift Logs */}
        <div className="lg:col-span-2">
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-500" />
                <Card.Title>Recent Shift History</Card.Title>
              </div>
              <Card.Description>Logged timesheet details for this staff member.</Card.Description>
            </Card.Header>
            <Card.Content className="p-0">
              <div className="divide-y divide-dark-100 dark:divide-dark-800">
                {shiftLogs.map((log) => (
                  <div key={log.date} className="p-4 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-bold text-dark-900 dark:text-white">{log.date}</p>
                      <p className="text-xs text-dark-400 dark:text-dark-500 font-semibold uppercase pt-0.5">
                        {log.role}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-bold text-dark-700 dark:text-dark-200">
                        {log.duration}
                      </p>
                      <p className="text-[10px] text-dark-400 dark:text-dark-500 font-mono">
                        {log.checkIn} - {log.checkOut}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Right column (1/3 width) - Schedule details & Quick Actions */}
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-500" />
                <Card.Title>Default Rotation</Card.Title>
              </div>
              <Card.Description>Contracted hours schedule.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center p-3 border border-dark-150 dark:border-dark-800 rounded-lg bg-dark-50/20">
                <span className="text-dark-500">Weekly Shift</span>
                <span className="font-mono text-[10px] bg-white dark:bg-dark-900 px-2 py-1 rounded border border-dark-150 dark:border-dark-800">
                  {employee.shift}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border border-dark-150 dark:border-dark-800 rounded-lg bg-dark-50/20">
                <span className="text-dark-500">Weekly Target</span>
                <span className="text-dark-900 dark:text-white">40.0 hours</span>
              </div>
            </Card.Content>
          </Card>

                    <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-500" />
                <Card.Title>Access Management</Card.Title>
              </div>
            </Card.Header>

            <Card.Content className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs border-dark-200 dark:border-dark-800"
                onClick={() => alert('Adjusting schedule logs...')}
              >
                Modify Contract Hours
              </Button>

              <Button
                variant="danger"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => alert('Suspending staff member...')}
              >
                Deactivate System Login
              </Button>
            </Card.Content>
          </Card>
        </div>
      </div>
    </>
  )}
</div>
  );
};

export default EmployeeProfile;