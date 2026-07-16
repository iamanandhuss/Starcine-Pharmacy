import React, { useState } from 'react';
import { Calendar, Check, X, Image as ImageIcon, Eye } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';

interface GroomingTask {
  id: string;
  store_name: string;
  task_name: string;
  assigned_to: string;
  before_photo: string;
  after_photo: string;
  status: string; // Pending, Approved, Rejected
  submitted_time: string;
}

export const Grooming: React.FC = () => {
  const [tasks, setTasks] = useState<GroomingTask[]>([
    { id: '1', store_name: 'Main Street Pharmacy', task_name: 'Narcotics Fridge Temperature Log & Wipe', assigned_to: 'Sarah T.', before_photo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300', after_photo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300', status: 'Pending', submitted_time: '10 mins ago' },
    { id: '2', store_name: 'Main Street Pharmacy', task_name: 'POS Counters & Display Shelves Dusted', assigned_to: 'Alex M.', before_photo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300', after_photo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300', status: 'Pending', submitted_time: '35 mins ago' },
    { id: '3', store_name: 'Westside Branch', task_name: 'Waiting Room Seating Sanitized', assigned_to: 'David L.', before_photo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300', after_photo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300', status: 'Approved', submitted_time: '2 hrs ago' },
  ]);

  const [selectedTask, setSelectedTask] = useState<GroomingTask | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleAction = (id: string, status: 'Approved' | 'Rejected') => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    showToast(`Grooming task submission ${status.toLowerCase()} successfully`);
    setIsPreviewOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🧹 Store Grooming & Compliance</h1>
          <p className="text-xs text-dark-500">Audit daily cleanliness schedules, review before/after verification photos, and approve queues</p>
        </div>
      </div>

      {/* Grid: Stats + Submissions */}
      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Sidebar Schedule Calendar Mockup */}
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title className="flex items-center gap-1 text-xs">
              <Calendar className="h-4 w-4 text-brand-500" />
              Grooming Cycles
            </Card.Title>
            <Card.Description>Standard intervals configured for store auditing</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-3 text-xs">
            <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-lg flex items-center justify-between">
              <span className="font-bold text-dark-700 dark:text-dark-300">Daily wipe checks</span>
              <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-bold">Enabled</span>
            </div>
            <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-lg flex items-center justify-between">
              <span className="font-bold text-dark-700 dark:text-dark-300">Bi-weekly narcotics lock audit</span>
              <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-bold">Enabled</span>
            </div>
            <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-lg flex items-center justify-between">
              <span className="font-bold text-dark-700 dark:text-dark-300">Monthly fire hazard drill</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded font-bold">Due in 5d</span>
            </div>
          </Card.Content>
        </Card>

        {/* Grooming Submissions Queue */}
        <Card className="lg:col-span-3">
          <Card.Header>
            <Card.Title className="text-xs">Compliance Verification Queue</Card.Title>
            <Card.Description>Review before/after verification uploads from branch teams</Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Pharmacy Branch</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Task Detail</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Auditor</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center font-bold">Verification Photos</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Status</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {tasks.map(task => (
                    <tr key={task.id} className="hover:bg-dark-50/20">
                      <td className="px-4 py-3.5 font-bold text-dark-800 dark:text-dark-200">{task.store_name}</td>
                      <td className="px-3 py-3.5">
                        <p className="font-semibold text-dark-700 dark:text-dark-300">{task.task_name}</p>
                        <span className="text-[10px] text-dark-400 mt-1 block">Uploaded {task.submitted_time}</span>
                      </td>
                      <td className="px-3 py-3.5 font-medium text-dark-600 dark:text-dark-400">{task.assigned_to}</td>
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setIsPreviewOpen(true);
                          }}
                          className="px-2.5 py-1 bg-dark-100 dark:bg-dark-800 hover:bg-brand-500/10 text-dark-600 dark:text-dark-400 hover:text-brand-500 rounded font-bold uppercase tracking-wide flex items-center gap-1 mx-auto"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Photo
                        </button>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold 
                          ${task.status === 'Approved' ? 'bg-green-500/10 text-green-600' : task.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}
                        `}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        {task.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleAction(task.id, 'Approved')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleAction(task.id, 'Rejected')}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-dark-400 italic">Audited</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      </div>

      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={`📸 Task Verification: ${selectedTask?.task_name || ''}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-dark-400 uppercase text-center">Before Photo</p>
              <div className="h-40 bg-dark-100 rounded-lg overflow-hidden flex items-center justify-center relative">
                <ImageIcon className="h-8 w-8 text-dark-300 absolute" />
                <img src={selectedTask?.before_photo} className="w-full h-full object-cover relative z-10" alt="Before" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-dark-400 uppercase text-center">After Photo</p>
              <div className="h-40 bg-dark-100 rounded-lg overflow-hidden flex items-center justify-center relative">
                <ImageIcon className="h-8 w-8 text-dark-300 absolute" />
                <img src={selectedTask?.after_photo} className="w-full h-full object-cover relative z-10" alt="After" />
              </div>
            </div>
          </div>
          {selectedTask?.status === 'Pending' && (
            <div className="flex justify-end gap-2 pt-4 border-t border-dark-100 dark:border-dark-800">
              <Button variant="outline" onClick={() => handleAction(selectedTask!.id, 'Rejected')}>Reject Submission</Button>
              <Button onClick={() => handleAction(selectedTask!.id, 'Approved')}>Approve Task</Button>
            </div>
          )}
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
