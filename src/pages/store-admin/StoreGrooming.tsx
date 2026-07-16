import React, { useEffect, useState } from 'react';
import {
  Clock, RefreshCw
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';
import { Toast } from '../../components/ui/Toast';

interface GroomingTask {
  id: string;
  employee_name: string;
  task_date: string;
  frequency: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  before_image_url: string;
  after_image_url: string;
  comments: string | null;
  created_at: string;
}

interface Employee {
  id: string;
  full_name: string;
}

export const StoreGrooming: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [tasks, setTasks] = useState<GroomingTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GroomingTask | null>(null);

  // Assign Task Inputs
  const [targetEmpId, setTargetEmpId] = useState('');
  const [taskFrequency, setTaskFrequency] = useState('Daily');

  // Review Inputs
  const [reviewComment, setReviewComment] = useState('');

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      // 1. Fetch employees
      const empRes = await supabase
        .from('users')
        .select('id, full_name')
        .eq('branch_id', selectedStoreId)
        .eq('is_active', true);
      const empList = empRes.data || [];
      setEmployees(empList);

      // 2. Fetch grooming tasks
      const { data, error } = await supabase
        .from('grooming_tasks')
        .select('*')
        .eq('branch_id', selectedStoreId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Fallback mock grooming queue
        setTasks([
          {
            id: 'g1',
            employee_name: 'David Lightman',
            task_date: today,
            frequency: 'Daily',
            status: 'Pending',
            before_image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=250&auto=format&fit=crop',
            after_image_url: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=250&auto=format&fit=crop',
            comments: null,
            created_at: `${today}T08:12:00Z`
          },
          {
            id: 'g2',
            employee_name: 'Jennifer Mack',
            task_date: today,
            frequency: 'Daily',
            status: 'Approved',
            before_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=250&auto=format&fit=crop',
            after_image_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=250&auto=format&fit=crop',
            comments: 'Counters scrubbed, sanitation checklist matched.',
            created_at: `${today}T07:45:00Z`
          },
          {
            id: 'g3',
            employee_name: 'Dr. John Falken',
            task_date: today,
            frequency: 'Weekly',
            status: 'Rejected',
            before_image_url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=250&auto=format&fit=crop',
            after_image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=250&auto=format&fit=crop',
            comments: 'Left-side shelving still dusty. Requires re-cleaning.',
            created_at: `${today}T09:02:00Z`
          }
        ]);
      } else {
        const mapped = data.map((t: any) => {
          const emp = empList.find(e => e.id === t.assigned_user_id);
          return {
            id: t.id,
            assigned_user_id: t.assigned_user_id,
            employee_name: emp ? emp.full_name : 'Unassigned Employee',
            task_date: t.task_date,
            frequency: t.frequency,
            status: t.status as 'Pending' | 'Approved' | 'Rejected',
            before_image_url: t.before_image_url || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=250&auto=format&fit=crop',
            after_image_url: t.after_image_url || 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=250&auto=format&fit=crop',
            comments: t.comments,
            created_at: t.created_at
          };
        });
        setTasks(mapped);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) return;
    if (!targetEmpId) return;

    try {
      const payload = {
        branch_id: selectedStoreId,
        assigned_user_id: targetEmpId,
        task_date: today,
        frequency: taskFrequency,
        status: 'Pending',
        before_image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=250&auto=format&fit=crop',
        after_image_url: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=250&auto=format&fit=crop',
        comments: null,
      };

      const { error } = await supabase
        .from('grooming_tasks')
        .insert(payload);

      if (error) throw error;

      const emp = employees.find(e => e.id === targetEmpId);
      showToast(`Assigned grooming check to ${emp ? emp.full_name : 'staff'}`);
      setIsAssignModalOpen(false);
      setTargetEmpId('');
      await fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleReviewResolve = async (status: 'Approved' | 'Rejected') => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('grooming_tasks')
        .update({
          status,
          comments: reviewComment || null
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      showToast(`Grooming task review marked as ${status}`);
      setIsReviewModalOpen(false);
      setReviewComment('');
      await fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'pending') return t.status === 'Pending';
    if (activeTab === 'approved') return t.status === 'Approved';
    if (activeTab === 'rejected') return t.status === 'Rejected';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">✨ Store Grooming Reviews</h1>
          <p className="text-xs text-dark-500">Audit shelf cleanliness reviews and compliance photo checklists</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAssignModalOpen(true)}>Assign Clean Check</Button>
          <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-100 dark:border-dark-800 pb-px">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 capitalize transition-all cursor-pointer
              ${activeTab === tab
                ? 'border-brand-500 text-brand-600 font-extrabold'
                : 'border-transparent text-dark-500 hover:text-dark-700'
              }
            `}
          >
            {tab} Tasks ({tasks.filter(t => tab === 'all' ? true : t.status.toLowerCase() === tab).length})
          </button>
        ))}
      </div>

      {/* Grooming Cards Queue */}
      {loading ? (
        <div className="text-center py-12 text-xs text-dark-400">Loading audit queue...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-xs text-dark-400">No grooming check requests matches the selection.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <Card.Header className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-dark-800 dark:text-dark-200">{task.employee_name}</h4>
                    <p className="text-[10px] text-dark-400 mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Assigned: {task.frequency} ({task.task_date})
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold
                    ${task.status === 'Approved' ? 'bg-green-500/10 text-green-600' : task.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}
                  `}>
                    {task.status}
                  </span>
                </div>
              </Card.Header>
              <Card.Content className="p-4 pt-0 space-y-4">
                
                {/* Images comparison */}
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-dark-400">
                  <div>
                    <p className="mb-1">Before</p>
                    <img src={task.before_image_url} alt="Before clean" className="h-28 w-full object-cover rounded-lg border border-dark-200 dark:border-dark-800" />
                  </div>
                  <div>
                    <p className="mb-1">After</p>
                    <img src={task.after_image_url} alt="After clean" className="h-28 w-full object-cover rounded-lg border border-dark-200 dark:border-dark-800" />
                  </div>
                </div>

                {task.comments && (
                  <div className="p-2.5 bg-dark-50 dark:bg-dark-900 rounded-lg text-[10px] leading-relaxed text-dark-600 dark:text-dark-400 italic">
                    Feedback: {task.comments}
                  </div>
                )}

                {task.status === 'Pending' && (
                  <Button
                    className="w-full text-xs shadow-sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsReviewModalOpen(true);
                    }}
                  >
                    Verify & Review Task
                  </Button>
                )}

              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Clean Check Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="✨ Assign Cleanliness Verification Check">
        <form onSubmit={handleAssignTask} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Select Employee</label>
            <select
              value={targetEmpId}
              onChange={e => setTargetEmpId(e.target.value)}
              required
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200"
            >
              <option value="">Choose staff...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Audit Frequency</label>
            <select
              value={taskFrequency}
              onChange={e => setTaskFrequency(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
            <Button type="submit">Assign Task</Button>
          </div>
        </form>
      </Modal>

      {/* Review Task Modal */}
      <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title={`✨ Verify Cleanliness: ${selectedTask?.employee_name}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-dark-400">
            <div>
              <p className="mb-1">Before Clean</p>
              <img src={selectedTask?.before_image_url} className="h-32 w-full object-cover rounded-lg border" />
            </div>
            <div>
              <p className="mb-1">After Clean</p>
              <img src={selectedTask?.after_image_url} className="h-32 w-full object-cover rounded-lg border" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Review Feedback Comments</label>
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200 focus:outline-none focus:border-brand-500"
              rows={2}
              placeholder="Good cleanliness level / needs re-scrub..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="outline" onClick={() => handleReviewResolve('Rejected')} className="text-red-500 hover:bg-red-50">
              Reject Photo
            </Button>
            <Button onClick={() => handleReviewResolve('Approved')}>
              Approve Clean
            </Button>
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
