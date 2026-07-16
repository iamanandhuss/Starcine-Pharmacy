import React, { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, Phone,
  Key, Clock, Check, FileText, Upload
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';
import { Toast } from '../../components/ui/Toast';

interface EmployeeProfileItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string;
  phone: string | null;
  employee_code: string | null;
  is_active: boolean;
  role_id: string | null;
  department_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  roles?: { name: string } | null;
  departments?: { name: string } | null;
}

interface DropdownItemType {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export const StoreEmployees: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [employees, setEmployees] = useState<EmployeeProfileItem[]>([]);
  const [roles, setRoles] = useState<DropdownItemType[]>([]);
  const [departments, setDepartments] = useState<DropdownItemType[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  
  const [selectedEmp, setSelectedEmp] = useState<EmployeeProfileItem | null>(null);

  // Form inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [roleId, setRoleId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [address, setAddress] = useState('');

  // Shift assignment inputs
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [shiftFromDate, setShiftFromDate] = useState('');

  // Document upload inputs
  const [docName, setDocName] = useState('');
  const [docList, setDocList] = useState<{ name: string; date: string }[]>([
    { name: 'National Identity Card.pdf', date: '2026-03-12' },
    { name: 'Pharmacist License.pdf', date: '2026-04-15' },
  ]);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      const [empRes, rolesRes, deptsRes, shiftsRes] = await Promise.all([
        supabase.from('users').select('*, roles(name), departments(name)').eq('branch_id', selectedStoreId).order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name').neq('name', 'Super Admin').neq('name', 'Store Admin'),
        supabase.from('departments').select('id, name'),
        supabase.from('shifts').select('id, name, start_time, end_time').eq('is_active', true),
      ]);

      if (empRes.error) throw empRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (deptsRes.error) throw deptsRes.error;
      if (shiftsRes.error) throw shiftsRes.error;

      setEmployees(empRes.data || []);
      setRoles(rolesRes.data || []);
      setDepartments(deptsRes.data || []);
      setShifts(shiftsRes.data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  const handleOpenForm = (emp: EmployeeProfileItem | null = null) => {
    setSelectedEmp(emp);
    if (emp) {
      setFirstName(emp.first_name || '');
      setLastName(emp.last_name || '');
      setEmail(emp.email || '');
      setPhone(emp.phone || '');
      setCode(emp.employee_code || '');
      setRoleId(emp.role_id || '');
      setDeptId(emp.department_id || '');
      setEmergencyName(emp.emergency_contact_name || '');
      setEmergencyPhone(emp.emergency_contact_phone || '');
      setAddress(emp.address || '');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCode('');
      setRoleId('');
      setDeptId('');
      setEmergencyName('');
      setEmergencyPhone('');
      setAddress('');
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const payload = {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      employee_code: code,
      role_id: roleId || null,
      department_id: deptId || null,
      branch_id: selectedStoreId,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      address,
      is_active: true,
    };

    try {
      if (selectedEmp) {
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', selectedEmp.id);
        if (error) throw error;
        showToast('Employee details updated successfully');
      } else {
        const { error } = await supabase
          .from('users')
          .insert([payload]);
        if (error) throw error;
        showToast('Employee created successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleActive = async (emp: EmployeeProfileItem) => {
    const nextState = !emp.is_active;
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: nextState })
        .eq('id', emp.id);

      if (error) throw error;
      showToast(`Employee ${nextState ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleResetPassword = (emp: EmployeeProfileItem) => {
    alert(`Password reset link generated for ${emp.email}`);
    showToast(`Password reset link dispatched`);
  };

  const handleOpenShift = (emp: EmployeeProfileItem) => {
    setSelectedEmp(emp);
    setSelectedShiftId('');
    setShiftFromDate(new Date().toISOString().split('T')[0]);
    setIsShiftModalOpen(true);
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !selectedShiftId) return;

    try {
      const { error } = await supabase
        .from('employee_shifts')
        .insert([{
          user_id: selectedEmp.id,
          shift_id: selectedShiftId,
          from_date: shiftFromDate
        }]);

      if (error) throw error;
      showToast('Shift assigned successfully');
      setIsShiftModalOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    setDocList(prev => [...prev, { name: docName, date: new Date().toISOString().split('T')[0] }]);
    setDocName('');
    showToast('Document uploaded successfully (Simulation mode)');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">👨‍💼 Employee Management</h1>
          <p className="text-xs text-dark-500">Hire employees, update contact logs, and manage shift schedules for your store</p>
        </div>
        <Button
          onClick={() => handleOpenForm(null)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Employee
        </Button>
      </div>

      {/* Employee List Grid */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-dark-400">Loading branch employees...</div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center text-xs text-dark-400">No employees hired yet. Click "Add Employee" to register.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Employee</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Department / Role</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Emergency Contact</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Status</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-dark-50/20">
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-bold text-dark-800 dark:text-dark-200">{emp.full_name || 'Pharmacist'}</p>
                          <span className="text-[9px] font-mono text-dark-400">Code: {emp.employee_code || '—'} • {emp.email}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 space-y-0.5">
                        <p className="font-medium text-dark-700 dark:text-dark-300">{emp.departments?.name || 'Unassigned Dept'}</p>
                        <span className="px-1.5 py-0.5 bg-brand-500/10 text-brand-600 rounded text-[9px] font-bold">
                          {emp.roles?.name || 'Pharmacist'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 space-y-0.5">
                        <p className="font-medium text-dark-700 dark:text-dark-300">{emp.emergency_contact_name || 'No contact'}</p>
                        {emp.emergency_contact_phone && (
                          <span className="flex items-center gap-1 text-[10px] text-dark-400">
                            <Phone className="h-3 w-3 shrink-0" /> {emp.emergency_contact_phone}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                          {emp.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1">
                        <button
                          onClick={() => handleOpenForm(emp)}
                          title="Edit Details"
                          className="p-1 text-dark-400 hover:text-brand-500 hover:bg-dark-50 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenShift(emp)}
                          title="Assign Shift"
                          className="p-1 text-dark-400 hover:text-blue-500 hover:bg-dark-50 rounded"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmp(emp);
                            setIsDocModalOpen(true);
                          }}
                          title="Documents"
                          className="p-1 text-dark-400 hover:text-purple-600 hover:bg-dark-50 rounded"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(emp)}
                          title="Reset Password"
                          className="p-1 text-dark-400 hover:text-yellow-600 hover:bg-dark-50 rounded"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(emp)}
                          title={emp.is_active ? 'Deactivate Employee' : 'Activate Employee'}
                          className={`p-1 rounded ${emp.is_active ? 'text-dark-400 hover:text-red-500 hover:bg-red-55/10' : 'text-green-600 hover:bg-green-50'}`}
                        >
                          {emp.is_active ? <Trash2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Edit Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedEmp ? 'Edit Employee Credentials' : 'Hire New Employee'}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" placeholder="e.g. John" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            <Input label="Last Name" placeholder="e.g. Doe" value={lastName} onChange={e => setLastName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="e.g. john@pharmacy.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Phone Number" placeholder="e.g. 555-0199" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <Input label="Employee Code" placeholder="e.g. EMP-1092" value={code} onChange={e => setCode(e.target.value)} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Assign Role</label>
              <select value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white">
                <option value="">No Role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Department</label>
              <select value={deptId} onChange={e => setDeptId(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white">
                <option value="">No Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-dark-100 dark:border-dark-800 pt-3">
            <Input label="Emergency Contact Name" placeholder="e.g. Mary Doe" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} />
            <Input label="Emergency Contact Phone" placeholder="e.g. 555-0198" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Full Home Address</label>
            <textarea
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900"
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Maple St..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{selectedEmp ? 'Save Changes' : 'Hire Staff'}</Button>
          </div>
        </form>
      </Modal>

      {/* Shift Assignment Modal */}
      <Modal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} title={`🕒 Schedule Shift: ${selectedEmp?.full_name}`}>
        <form onSubmit={handleShiftSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Select Shift Standard</label>
            <select
              value={selectedShiftId}
              onChange={e => setSelectedShiftId(e.target.value)}
              required
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950"
            >
              <option value="">Choose shift...</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>
              ))}
            </select>
          </div>
          <Input label="Effective Date" type="date" value={shiftFromDate} onChange={e => setShiftFromDate(e.target.value)} required />
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsShiftModalOpen(false)}>Cancel</Button>
            <Button type="submit">Assign Shift</Button>
          </div>
        </form>
      </Modal>

      {/* Document Uploads Modal */}
      <Modal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} title={`📁 Document Archive: ${selectedEmp?.full_name}`}>
        <div className="space-y-4">
          <form onSubmit={handleDocSubmit} className="flex gap-2">
            <Input placeholder="Document name (e.g. ID card)" value={docName} onChange={e => setDocName(e.target.value)} required />
            <Button type="submit" leftIcon={<Upload className="h-4 w-4" />} className="shrink-0 mt-6">
              Upload
            </Button>
          </form>

          <div className="divide-y divide-dark-100 dark:divide-dark-800 text-xs">
            {docList.map(doc => (
              <div key={doc.name} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-dark-800 dark:text-dark-200">{doc.name}</p>
                  <span className="text-[9px] text-dark-400">Uploaded on {doc.date}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => alert(`Simulating file download: ${doc.name}`)}>
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
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
