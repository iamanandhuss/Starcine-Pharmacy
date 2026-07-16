import React, { useState } from 'react';
import { Clock, Plus, Edit2, Sliders, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';

interface ShiftRule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_duration: number; // in minutes
  grace_time: number; // in minutes
  is_active: boolean;
}

export const Shifts: React.FC = () => {
  const [shifts, setShifts] = useState<ShiftRule[]>([
    { id: '1', name: 'Morning Shift', start_time: '08:00', end_time: '16:00', break_duration: 45, grace_time: 15, is_active: true },
    { id: '2', name: 'Evening Shift', start_time: '16:00', end_time: '00:00', break_duration: 45, grace_time: 15, is_active: true },
    { id: '3', name: 'Night Shift', start_time: '00:00', end_time: '08:00', break_duration: 30, grace_time: 10, is_active: true },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftRule | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [breakDur, setBreakDur] = useState('45');
  const [grace, setGrace] = useState('15');

  // Global settings
  const [globalGrace, setGlobalGrace] = useState('15');
  const [globalBreak, setGlobalBreak] = useState('45');

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleOpenModal = (shift: ShiftRule | null = null) => {
    setSelectedShift(shift);
    if (shift) {
      setName(shift.name);
      setStart(shift.start_time);
      setEnd(shift.end_time);
      setBreakDur(String(shift.break_duration));
      setGrace(String(shift.grace_time));
    } else {
      setName('');
      setStart('');
      setEnd('');
      setBreakDur('45');
      setGrace('15');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload: ShiftRule = {
      id: selectedShift ? selectedShift.id : String(Date.now()),
      name,
      start_time: start,
      end_time: end,
      break_duration: Number(breakDur),
      grace_time: Number(grace),
      is_active: true,
    };

    if (selectedShift) {
      setShifts(prev => prev.map(s => s.id === selectedShift.id ? payload : s));
      showToast('Shift rule updated (Simulation mode)');
    } else {
      setShifts(prev => [...prev, payload]);
      showToast('New shift rule registered (Simulation mode)');
    }
    setIsModalOpen(false);
  };

  const handleSaveGlobal = () => {
    showToast('Platform grace and break configurations saved globally!');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🕒 Shift & Grace-Time Settings</h1>
          <p className="text-xs text-dark-500">Configure global shift patterns, grace-time limits, and compliance parameters</p>
        </div>
        <Button
          onClick={() => handleOpenModal(null)}
          leftIcon={<Plus className="h-4 w-4" />}
          className="shadow-sm"
        >
          Add Shift
        </Button>
      </div>

      {/* Grid: Global Settings + Active Shifts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Global Settings Panel */}
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title className="flex items-center gap-1.5 text-xs">
              <Sliders className="h-4 w-4 text-brand-500" />
              Global Parameters
            </Card.Title>
            <Card.Description>Default parameters used for automated check-in evaluations</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <Input
              label="Default Grace Time (Minutes)"
              type="number"
              value={globalGrace}
              onChange={e => setGlobalGrace(e.target.value)}
              placeholder="e.g. 15"
            />
            <Input
              label="Default Meal Break (Minutes)"
              type="number"
              value={globalBreak}
              onChange={e => setGlobalBreak(e.target.value)}
              placeholder="e.g. 45"
            />

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg flex items-start gap-2.5 text-[10px] leading-relaxed">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Important compliance note</span>: Shifts exceeding these thresholds will flag check-ins as "Late" or overtime registers as "Compliance Alert" automatically.
              </div>
            </div>

            <Button onClick={handleSaveGlobal} className="w-full">
              Save Parameters
            </Button>
          </Card.Content>
        </Card>

        {/* Shift List Table */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="text-xs">Corporate Work Shifts</Card.Title>
            <Card.Description>Daily active working hours configured for pharmacy branches</Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Shift Name</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Schedule Hours</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Grace Period</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Break duration</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {shifts.map(shift => (
                    <tr key={shift.id} className="hover:bg-dark-50/20">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-brand-500/10 text-brand-500 rounded-md">
                            <Clock className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-bold text-dark-800 dark:text-dark-200">{shift.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-semibold text-dark-700 dark:text-dark-300">
                        {shift.start_time} — {shift.end_time}
                      </td>
                      <td className="px-3 py-3.5 text-center font-medium text-dark-600 dark:text-dark-400">
                        {shift.grace_time} mins
                      </td>
                      <td className="px-3 py-3.5 text-center font-medium text-dark-600 dark:text-dark-400">
                        {shift.break_duration} mins
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button onClick={() => handleOpenModal(shift)} className="p-1 text-dark-400 hover:text-brand-500 transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedShift ? 'Edit Shift Configuration' : 'Register New Shift'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Shift Label" placeholder="e.g. Afternoon Duty" value={name} onChange={e => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" type="time" value={start} onChange={e => setStart(e.target.value)} required />
            <Input label="End Time" type="time" value={end} onChange={e => setEnd(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Grace Limit (Mins)" type="number" value={grace} onChange={e => setGrace(e.target.value)} />
            <Input label="Break Duration (Mins)" type="number" value={breakDur} onChange={e => setBreakDur(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{selectedShift ? 'Save Changes' : 'Create Shift'}</Button>
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
