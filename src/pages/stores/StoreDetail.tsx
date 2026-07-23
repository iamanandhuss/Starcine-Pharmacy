import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Store, Users, ArrowLeft,
  MapPin, Phone, User, AlertCircle,
  RefreshCw, CheckCircle2, Calendar, ChevronLeft, ChevronRight,
  Clock, ArrowRight, IndianRupee, Sun, Moon, Sunrise
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RoleNameBadge } from '../../components/ui/RoleBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';

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
  latitude: number | null;
  longitude: number | null;
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
  status?: string;
  check_in?: string | null;
  check_out?: string | null;
}

interface ShiftInfo {
  name: string;
  timeRange: string;
  icon: React.ReactNode;
  status: 'previous' | 'current' | 'upcoming';
  assignedStaff: EmployeeRow[];
}

export const StoreDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Date Navigation state (defaults to Today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [store, setStore] = useState<StoreDetailInfo | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [todaySales, setTodaySales] = useState<number>(0);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  
  // Geocoding Search State
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodedPlaces, setGeocodedPlaces] = useState<any[]>([]);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
  const [mapLink, setMapLink] = useState('');
  
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dateString = selectedDate.toISOString().split('T')[0];
  const isToday = new Date().toISOString().split('T')[0] === dateString;

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleTodayJump = () => {
    setSelectedDate(new Date());
  };

  const handleSearchPlaceLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!placeSearchQuery.trim()) {
      showToast('Please enter a landmark or place name to search.', 'error');
      return;
    }

    setGeocodingLoading(true);
    setGeocodedPlaces([]);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeSearchQuery.trim())}&limit=5`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setGeocodedPlaces(data);
        const topPlace = data[0];
        const lat = parseFloat(topPlace.lat).toFixed(6);
        const lon = parseFloat(topPlace.lon).toFixed(6);

        setLatInput(lat);
        setLonInput(lon);
        setSelectedPlaceName(topPlace.display_name);
        showToast(`Detected location: ${lat}, ${lon}`);
      } else {
        showToast('No matching places found. Try a broader search phrase.', 'error');
      }
    } catch (err: any) {
      showToast('Place search service unavailable.', 'error');
    } finally {
      setGeocodingLoading(false);
    }
  };

  const handleSelectGeocodedPlace = (place: any) => {
    const lat = parseFloat(place.lat).toFixed(6);
    const lon = parseFloat(place.lon).toFixed(6);
    setLatInput(lat);
    setLonInput(lon);
    setSelectedPlaceName(place.display_name);
    setGeocodedPlaces([]);
    showToast(`Selected location: ${lat}, ${lon}`);
  };

  const handleMapLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMapLink(val);
    
    const match = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      setLatInput(parseFloat(match[1]).toFixed(6));
      setLonInput(parseFloat(match[2]).toFixed(6));
      setSelectedPlaceName("Parsed from Google Maps link");
      showToast(`Detected location: ${match[1]}, ${match[2]}`);
    } else if (val.includes('goo.gl') || val.includes('maps.app.goo.gl')) {
      showToast('Short links cannot be parsed automatically. Please open it in a browser and paste the full URL.', 'error');
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (isNaN(lat) || isNaN(lon)) {
      showToast('Invalid coordinates', 'error');
      return;
    }
    try {
      const { error } = await supabase.from('branches').update({ latitude: lat, longitude: lon }).eq('id', id);
      if (error) throw error;
      showToast('Store location updated successfully');
      setIsLocationModalOpen(false);
      fetchStoreData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

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

      // 2. Fetch Employees, Attendance, Sales for selected date
      const [
        { data: employeesData, error: empError },
        { data: attData },
        { data: salesData }
      ] = await Promise.all([
        supabase.from('users').select('id, full_name, first_name, last_name, email, phone, roles(name)').eq('branch_id', id).eq('is_active', true),
        supabase.from('attendance').select('*').eq('attendance_date', dateString),
        supabase.from('sales_registers').select('total_sales').eq('branch_id', id).eq('sales_date', dateString).maybeSingle()
      ]);

      if (empError) throw empError;

      const rawEmployees: EmployeeRow[] = (employeesData || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        email: u.email || '',
        phone: u.phone || null,
        role_name: u.roles?.name || 'Staff'
      }));

      // Map attendance to employees
      const attMap = new Map();
      (attData || []).forEach((att: any) => {
        attMap.set(att.user_id, att);
      });

      const empWithAttendance = rawEmployees.map(emp => {
        const att = attMap.get(emp.id);
        return {
          ...emp,
          status: att ? (att.late_minutes > 0 ? 'Late' : 'Present') : 'Off Duty',
          check_in: att?.check_in || null,
          check_out: att?.check_out || null
        };
      });

      setEmployees(empWithAttendance);
      setTodaySales(Number(salesData?.total_sales) || 0);

    } catch (err: any) {
      console.error('Error fetching store detail:', err.message);
      setErrorMsg(err.message || 'Store details not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [id, dateString]);

  // Derived Strength Metrics
  const presentStaffCount = employees.filter(e => e.status === 'Present' || e.status === 'Late').length;
  const lateStaffCount = employees.filter(e => e.status === 'Late').length;

  // Derived Operational Shifts
  const currentHour = new Date().getHours();

  const shifts: ShiftInfo[] = [
    {
      name: 'Morning Shift',
      timeRange: '07:00 AM – 03:00 PM',
      icon: <Sunrise className="h-4 w-4 text-amber-500" />,
      status: isToday && currentHour < 15 && currentHour >= 7 ? 'current' : isToday && currentHour >= 15 ? 'previous' : 'upcoming',
      assignedStaff: employees.slice(0, Math.ceil(employees.length / 2))
    },
    {
      name: 'Evening Shift',
      timeRange: '03:00 PM – 11:00 PM',
      icon: <Sun className="h-4 w-4 text-orange-500" />,
      status: isToday && currentHour >= 15 && currentHour < 23 ? 'current' : isToday && currentHour < 15 ? 'upcoming' : 'previous',
      assignedStaff: employees.slice(Math.ceil(employees.length / 2))
    },
    {
      name: 'Night Rotation',
      timeRange: '11:00 PM – 07:00 AM',
      icon: <Moon className="h-4 w-4 text-indigo-400" />,
      status: isToday && (currentHour >= 23 || currentHour < 7) ? 'current' : 'upcoming',
      assignedStaff: employees.slice(0, 1)
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-dark-500">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-xs font-semibold">Loading store dashboard & shift strength details...</p>
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
    <div className="space-y-6 pb-12">
      {/* Top Header & Date Navigation Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dark-200 dark:border-dark-800 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/super-admin/stores')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="p-2 rounded-full"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-dark-900 dark:text-white">{store.name}</h1>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                {store.store_code || store.code}
              </span>
            </div>
            <p className="text-xs text-dark-500 dark:text-dark-400">
              Operational Branch Control, Daily Strength & Shift Logs
            </p>
          </div>
        </div>

        {/* Interactive Date Navigation Bar */}
        <div className="flex items-center gap-2 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-750 p-1.5 rounded-xl shadow-sm">
          <Button variant="ghost" size="sm" onClick={handlePrevDay} className="p-1.5 text-xs">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-2">
            <Calendar className="h-4 w-4 text-brand-500 shrink-0" />
            <span className="text-xs font-bold text-dark-900 dark:text-white whitespace-nowrap">
              {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {isToday ? (
              <span className="text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Today
              </span>
            ) : (
              <Button variant="outline" size="sm" onClick={handleTodayJump} className="text-[10px] px-2 py-0.5">
                Jump to Today
              </Button>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={handleNextDay} className="p-1.5 text-xs">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Daily Strength Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <Card.Content className="p-5 flex items-center gap-4">
            <div className="p-3.5 bg-brand-500/10 text-brand-500 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">On-Duty Strength</p>
              <p className="text-2xl font-black text-dark-900 dark:text-white leading-tight mt-0.5">
                {presentStaffCount} <span className="text-xs font-semibold text-dark-500">/ {employees.length} staff</span>
              </p>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-5 flex items-center gap-4">
            <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Attendance Rate</p>
              <p className="text-2xl font-black text-dark-900 dark:text-white leading-tight mt-0.5">
                {employees.length > 0 ? `${Math.round((presentStaffCount / employees.length) * 100)}%` : '100%'}
              </p>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-5 flex items-center gap-4">
            <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Late Arrivals</p>
              <p className="text-2xl font-black text-dark-900 dark:text-white leading-tight mt-0.5">
                {lateStaffCount} <span className="text-xs font-semibold text-dark-500">late</span>
              </p>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-5 flex items-center gap-4">
            <div className="p-3.5 bg-teal-500/10 text-teal-500 rounded-xl">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Daily Register Revenue</p>
              <p className="text-2xl font-black text-dark-900 dark:text-white leading-tight mt-0.5">
                ₹{todaySales.toLocaleString()}
              </p>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Shifts Breakdown Section (Current, Upcoming, Previous) */}
      <Card>
        <Card.Header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark-150 dark:border-dark-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-500" />
              <Card.Title>Shift Rotations & Duty Schedules</Card.Title>
            </div>
            <Card.Description>
              Current active duty roster, upcoming shift assignments, and previous shift records for {dateString}.
            </Card.Description>
          </div>
        </Card.Header>

        <Card.Content className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {shifts.map((shift) => (
            <div
              key={shift.name}
              className={`p-4 rounded-xl border transition-all ${
                shift.status === 'current'
                  ? 'bg-brand-500/5 border-brand-500/30 shadow-md ring-1 ring-brand-500/20'
                  : 'bg-dark-50/50 dark:bg-dark-900/40 border-dark-150 dark:border-dark-800'
              }`}
            >
              <div className="flex justify-between items-center pb-3 border-b border-dark-150 dark:border-dark-800">
                <div className="flex items-center gap-2">
                  {shift.icon}
                  <h3 className="font-extrabold text-dark-900 dark:text-white text-sm">{shift.name}</h3>
                </div>
                <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                  shift.status === 'current'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-pulse'
                    : shift.status === 'upcoming'
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    : 'bg-dark-200/50 dark:bg-dark-800 text-dark-500 border-dark-300/30'
                }`}>
                  {shift.status === 'current' ? '⚡ Active Shift' : shift.status === 'upcoming' ? 'Upcoming' : 'Previous'}
                </span>
              </div>

              <p className="text-[11px] font-mono text-dark-500 dark:text-dark-400 mt-2 font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" /> {shift.timeRange}
              </p>

              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Roster Staff ({shift.assignedStaff.length})</p>
                {shift.assignedStaff.length === 0 ? (
                  <p className="text-xs text-dark-450 italic">No staff scheduled.</p>
                ) : (
                  shift.assignedStaff.map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="p-2 rounded-lg bg-white dark:bg-dark-900 border border-dark-150 dark:border-dark-800 flex justify-between items-center text-xs hover:border-brand-500/40 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-dark-900 dark:text-white group-hover:text-brand-500 transition-colors truncate">{emp.full_name}</p>
                        <p className="text-[10px] text-dark-400 truncate">{emp.role_name}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        emp.status === 'Present' || emp.status === 'Late'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-dark-100 dark:bg-dark-800 text-dark-400'
                      }`}>
                        {emp.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </Card.Content>
      </Card>

      {/* Grid of Store Details: Contact info, Active Staff list, Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact details */}
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title>Branch Details</Card.Title>
            <Card.Description>Branch contact information & location</Card.Description>
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
                  <p className="text-[9px] uppercase font-bold text-dark-400 leading-tight">Address & GPS Location</p>
                  <p className="font-semibold text-dark-800 dark:text-dark-200 truncate">{store.address}</p>
                  {store.latitude && store.longitude ? (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-brand-500 hover:underline mt-1 block">
                      📍 {store.latitude}, {store.longitude}
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsLocationModalOpen(true)} className="mt-2 text-[10px] py-1 h-auto">
                      Add Permanent GPS Location
                    </Button>
                  )}
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

        {/* Employees Table with Clickable Rows to Employee Profile */}
        <Card className="lg:col-span-2">
          <Card.Header className="flex justify-between items-center">
            <div>
              <Card.Title>Store Staff Roster ({employees.length})</Card.Title>
              <Card.Description>Click any staff row to view individual profile & timesheets</Card.Description>
            </div>
          </Card.Header>
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Staff Name</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Status ({dateString})</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800 text-xs font-medium">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-dark-450">No employees assigned to this store branch.</td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="hover:bg-dark-50/50 dark:hover:bg-dark-900/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-bold text-dark-900 dark:text-white group-hover:text-brand-500 transition-colors">
                        {emp.full_name}
                      </td>
                      <td className="py-3 px-4"><RoleNameBadge roleName={emp.role_name} /></td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                          emp.status === 'Present' || emp.status === 'Late' ? 'text-emerald-600 dark:text-emerald-400' : 'text-dark-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${emp.status === 'Present' || emp.status === 'Late' ? 'bg-emerald-500' : 'bg-dark-400'}`} />
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[10px] font-bold text-brand-500 group-hover:underline inline-flex items-center gap-1">
                          View Profile <ArrowRight className="h-3 w-3" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      </div>

      {/* Location Modal */}
      <Modal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} title="Add Permanent Store Location">
        <form onSubmit={handleSaveLocation} className="space-y-4">
          <p className="text-xs text-dark-500 mb-2">Set the exact GPS coordinates for this store. You can search for a landmark or enter coordinates manually.</p>
          
          <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-dark-800 dark:text-dark-200 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-500" /> Landmark & Place Search
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={placeSearchQuery}
                onChange={(e) => setPlaceSearchQuery(e.target.value)}
                placeholder="e.g. City Name, Street, or Landmark"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchPlaceLocation(); } }}
                className="flex-1 text-xs py-2 px-3 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-750 rounded-lg text-dark-900 dark:text-white"
              />
              <Button type="button" variant="primary" size="sm" onClick={handleSearchPlaceLocation} disabled={geocodingLoading}>
                {geocodingLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-dark-200 dark:border-dark-700"></div>
              <span className="flex-shrink-0 mx-4 text-dark-400 text-[10px] uppercase font-bold">OR Paste Link</span>
              <div className="flex-grow border-t border-dark-200 dark:border-dark-700"></div>
            </div>

            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={mapLink}
                onChange={handleMapLinkChange}
                placeholder="Paste full Google Maps URL (e.g. google.com/maps/@13.08,80.27...)"
                className="w-full text-xs py-2 px-3 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-750 rounded-lg text-dark-900 dark:text-white"
              />
            </div>

            {geocodedPlaces.length > 0 && (
              <div className="bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg p-2 space-y-1 max-h-36 overflow-y-auto text-xs">
                <p className="text-[10px] font-bold text-dark-400 uppercase">Select exact result:</p>
                {geocodedPlaces.map(place => (
                  <div
                    key={place.place_id}
                    onClick={() => handleSelectGeocodedPlace(place)}
                    className="p-1.5 rounded hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer flex items-center justify-between text-dark-800 dark:text-dark-200"
                  >
                    <span className="truncate pr-2">{place.display_name}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedPlaceName && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-[10px] text-emerald-600 flex items-center gap-1.5 font-semibold">
                <span className="truncate">Detected: {selectedPlaceName}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-dark-200/60 dark:border-dark-800">
              <Input label="Latitude" placeholder="e.g. 13.0827" value={latInput} onChange={e => setLatInput(e.target.value)} required />
              <Input label="Longitude" placeholder="e.g. 80.2707" value={lonInput} onChange={e => setLonInput(e.target.value)} required />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" type="button" onClick={() => setIsLocationModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save GPS Coordinates</Button>
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

export default StoreDetail;
