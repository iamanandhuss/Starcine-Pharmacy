import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Plus, Search, LayoutGrid, List, CalendarDays,
  ChevronLeft, ChevronRight, Paperclip, MessageSquare,
  AlertCircle, ArrowRight, ArrowLeft, X, Check, Trash2, Send,
  Flag, RefreshCw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';

// ─── Types ──────────────────────────────────────────────────────────────────

type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';
type Status = 'To Do' | 'In Progress' | 'In Review' | 'Done';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

interface Attachment {
  id: string;
  name: string;
  size: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string; // YYYY-MM-DD
  assignee: string;
  assigneeId?: string | null;
  progress: number; // 0-100
  subtasks: Subtask[];
  comments: Comment[];
  attachments: Attachment[];
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['Urgent', 'High', 'Medium', 'Low']),
  status: z.enum(['To Do', 'In Progress', 'In Review', 'Done']),
  dueDate: z.string().min(1, 'Due date is required'),
  assignee: z.string().min(1, 'Assignee is required'),
});
type TaskFormValues = z.infer<typeof taskSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  Urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-600 border-red-500/20', dot: 'bg-red-500' },
  High:   { label: 'High',   color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', dot: 'bg-orange-500' },
  Medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', dot: 'bg-yellow-500' },
  Low:    { label: 'Low',    color: 'bg-green-500/10 text-green-600 border-green-500/20', dot: 'bg-green-500' },
};

const STATUS_ORDER: Status[] = ['To Do', 'In Progress', 'In Review', 'Done'];

const STATUS_COLOR: Record<Status, string> = {
  'To Do':       'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300',
  'In Progress': 'bg-brand-500/10 text-brand-600 border border-brand-500/20',
  'In Review':   'bg-purple-500/10 text-purple-600 border border-purple-500/20',
  'Done':        'bg-green-500/10 text-green-600 border border-green-500/20',
};

const getInitials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const isOverdue = (dueDate: string, status: Status) =>
  status !== 'Done' && new Date(dueDate) < new Date(new Date().toDateString());

// ─── Sub-components ───────────────────────────────────────────────────────────

const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const AssigneeAvatar: React.FC<{ name: string; size?: 'sm' | 'md' }> = ({ name, size = 'sm' }) => (
  <div
    title={name}
    className={`rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center text-white font-extrabold shrink-0 ${size === 'sm' ? 'h-6 w-6 text-[8px]' : 'h-8 w-8 text-xs'}`}
  >
    {getInitials(name)}
  </div>
);

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full h-1.5 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-500 ${value === 100 ? 'bg-green-500' : value >= 60 ? 'bg-brand-500' : value >= 30 ? 'bg-yellow-500' : 'bg-red-400'}`}
      style={{ width: `${value}%` }}
    />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const TaskManager: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [storeEmployees, setStoreEmployees] = useState<{ id: string; name: string }[]>([]);

  // Search / filter state (list view)
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');

  // Modal / drawer state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Task detail editing
  const [commentText, setCommentText] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newAttachment, setNewAttachment] = useState('');
  const [drawerProgress, setDrawerProgress] = useState(0);

  // Calendar popover
  const [calendarPopoverDay, setCalendarPopoverDay] = useState<number | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  const fetchStoreEmployees = async () => {
    if (!selectedStoreId) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, first_name, last_name')
        .eq('branch_id', selectedStoreId);

      if (error) throw error;

      if (data) {
        setStoreEmployees(
          data.map((u: any) => ({
            id: u.id,
            name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'No Name',
          }))
        );
      }
    } catch (err: any) {
      console.error('Error fetching store employees:', err.message);
    }
  };

  const fetchTasks = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      const { data: dbTasks, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignments (
            user_id,
            users (
              id,
              full_name,
              first_name,
              last_name
            )
          )
        `)
        .eq('branch_id', selectedStoreId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (dbTasks && dbTasks.length > 0) {
        const mapped: Task[] = dbTasks.map((t: any) => {
          let cleanDesc = t.description || '';
          let subtasks: Subtask[] = [];
          let comments: Comment[] = [];
          let attachments: Attachment[] = [];
          
          if (cleanDesc.includes('---JSON---')) {
            const parts = cleanDesc.split('---JSON---');
            cleanDesc = parts[0].trim();
            try {
              const extra = JSON.parse(parts[1]);
              subtasks = extra.subtasks || [];
              comments = extra.comments || [];
              attachments = extra.attachments || [];
            } catch (pErr) {
              console.warn('JSON parse error in description:', pErr);
            }
          }

          const assigneeUser = t.task_assignments?.[0]?.users;
          const assigneeName = assigneeUser ? (assigneeUser.full_name || `${assigneeUser.first_name} ${assigneeUser.last_name}`) : 'Unassigned';
          const assigneeId = t.task_assignments?.[0]?.user_id || null;

          const statusMap: Record<string, Status> = {
            'Pending': 'To Do',
            'In Progress': 'In Progress',
            'Completed': 'Done',
            'Cancelled': 'Done'
          };
          const priorityMap: Record<string, Priority> = {
            'Critical': 'Urgent',
            'High': 'High',
            'Medium': 'Medium',
            'Low': 'Low'
          };

          const completedSubtasks = subtasks.filter(s => s.completed).length;
          const progress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : (t.status === 'Completed' ? 100 : 0);

          return {
            id: t.id,
            title: t.title,
            description: cleanDesc,
            priority: priorityMap[t.priority] || 'Medium',
            status: statusMap[t.status] || 'To Do',
            dueDate: t.due_date || '',
            assignee: assigneeName,
            assigneeId,
            progress,
            subtasks,
            comments,
            attachments
          };
        });
        setTasks(mapped);
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      console.warn('TaskManager failed to load from Supabase:', err.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchStoreEmployees();
  }, [selectedStoreId]);

  // Add Task form
  const { register, handleSubmit, formState: { errors }, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'Medium', status: 'To Do', assignee: '' },
  });

  const onAddTask = async (values: TaskFormValues) => {
    if (!selectedStoreId) {
      showToast('No active store selected.', 'info');
      return;
    }
    try {
      const dbStatus = values.status === 'To Do' ? 'Pending' : 
                       values.status === 'In Progress' ? 'In Progress' : 'Completed';
      
      const dbPriority = values.priority === 'Urgent' ? 'Critical' : values.priority;

      // 1. Insert task
      const { data: insertedTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: values.title,
          description: values.description || '',
          priority: dbPriority,
          status: dbStatus,
          due_date: values.dueDate,
          branch_id: selectedStoreId,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // 2. Insert assignment if assignee is chosen
      if (insertedTask && values.assignee) {
        const { error: assignError } = await supabase
          .from('task_assignments')
          .insert({
            task_id: insertedTask.id,
            user_id: values.assignee,
            status: dbStatus,
          });

        if (assignError) throw assignError;
      }

      showToast(`Task "${values.title}" created.`, 'success');
      reset();
      setIsAddModalOpen(false);
      await fetchTasks();
    } catch (err: any) {
      showToast(`Failed to create task: ${err.message}`, 'info');
    }
  };

  // Open drawer
  const openDrawer = (task: Task) => {
    setSelectedTask({ ...task });
    setDrawerProgress(task.progress);
    setCommentText('');
    setNewSubtask('');
    setNewAttachment('');
    setIsDrawerOpen(true);
  };

  // Save drawer changes
  const saveDrawer = async () => {
    if (!selectedTask) return;
    const updated = { ...selectedTask, progress: drawerProgress };
    
    // Update local state first
    setTasks((p) => p.map((t) => (t.id === updated.id ? updated : t)));
    setIsDrawerOpen(false);

    try {
      const dbStatus = updated.status === 'To Do' ? 'Pending' : 
                       updated.status === 'In Progress' ? 'In Progress' : 'Completed';
      
      const dbPriority = updated.priority === 'Urgent' ? 'Critical' : updated.priority;
      
      // Package extra details inside description using special ---JSON--- marker
      const serializedJson = JSON.stringify({
        subtasks: updated.subtasks,
        comments: updated.comments,
        attachments: updated.attachments
      });
      const descriptionWithJson = `${updated.description} ---JSON--- ${serializedJson}`;

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          title: updated.title,
          description: descriptionWithJson,
          priority: dbPriority,
          status: dbStatus,
          due_date: updated.dueDate
        })
        .eq('id', updated.id);

      if (updateError) throw updateError;

      // Sync assignments: delete existing, insert new if selected
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', updated.id);

      if (updated.assigneeId) {
        const { error: assignError } = await supabase
          .from('task_assignments')
          .insert({
            task_id: updated.id,
            user_id: updated.assigneeId,
            status: dbStatus,
          });

        if (assignError) throw assignError;
      }
      
      showToast(`Task "${updated.title}" updated in database.`, 'success');
      await fetchTasks();
    } catch (err: any) {
      showToast(`Failed to update task: ${err.message}`, 'info');
    }
  };

  // Add comment
  const addComment = () => {
    if (!commentText.trim() || !selectedTask) return;
    const c: Comment = {
      id: `c${Date.now()}`,
      author: 'You',
      text: commentText.trim(),
      timestamp: new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    const updated = { ...selectedTask, comments: [...selectedTask.comments, c] };
    setSelectedTask(updated);
    setCommentText('');
  };

  // Toggle subtask
  const toggleSubtask = (id: string) => {
    if (!selectedTask) return;
    const subs = selectedTask.subtasks.map((s) => s.id === id ? { ...s, completed: !s.completed } : s);
    const done = subs.filter((s) => s.completed).length;
    const auto = subs.length > 0 ? Math.round((done / subs.length) * 100) : 0;
    setSelectedTask({ ...selectedTask, subtasks: subs });
    setDrawerProgress(auto);
  };

  // Add subtask
  const addSubtask = () => {
    if (!newSubtask.trim() || !selectedTask) return;
    const s: Subtask = { id: `s${Date.now()}`, title: newSubtask.trim(), completed: false };
    setSelectedTask({ ...selectedTask, subtasks: [...selectedTask.subtasks, s] });
    setNewSubtask('');
  };

  // Delete subtask
  const deleteSubtask = (id: string) => {
    if (!selectedTask) return;
    setSelectedTask({ ...selectedTask, subtasks: selectedTask.subtasks.filter((s) => s.id !== id) });
  };

  // Add attachment
  const addAttachment = () => {
    if (!newAttachment.trim() || !selectedTask) return;
    const a: Attachment = { id: `a${Date.now()}`, name: newAttachment.trim(), size: 'Local' };
    setSelectedTask({ ...selectedTask, attachments: [...selectedTask.attachments, a] });
    setNewAttachment('');
  };

  // Move task status
  const moveTask = async (taskId: string, direction: 'forward' | 'back') => {
    let targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const idx = STATUS_ORDER.indexOf(targetTask.status);
    const newIdx = direction === 'forward' ? Math.min(idx + 1, 3) : Math.max(idx - 1, 0);
    const newStatus = STATUS_ORDER[newIdx];

    // Local update
    setTasks((p) => p.map((t) => {
      if (t.id !== taskId) return t;
      return { ...t, status: newStatus };
    }));

    try {
      const dbStatus = newStatus === 'To Do' ? 'Pending' : 
                       newStatus === 'In Progress' ? 'In Progress' : 'Completed';

      const { error } = await supabase
        .from('tasks')
        .update({ status: dbStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      showToast(`Task moved to ${newStatus}.`, 'success');
      await fetchTasks();
    } catch (err: any) {
      console.warn('Failed to move task status in database:', err.message);
    }
  };

  // ─── Kanban View ─────────────────────────────────────────────────────────

  const KanbanView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {STATUS_ORDER.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col);
        return (
          <div key={col} className="flex flex-col gap-3">
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-dark-700 dark:text-dark-300">{col}</span>
                <span className="text-[10px] font-bold bg-dark-100 dark:bg-dark-800 text-dark-500 dark:text-dark-400 px-1.5 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Task cards */}
            <div className="flex flex-col gap-3">
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => openDrawer(task)}
                  className="group bg-white dark:bg-dark-900 rounded-xl border border-dark-100 dark:border-dark-800 p-4 cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-md transition-all duration-200 space-y-3"
                >
                  {/* Priority + overdue */}
                  <div className="flex items-center justify-between gap-2">
                    <PriorityBadge priority={task.priority} />
                    {isOverdue(task.dueDate, task.status) && (
                      <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Overdue</span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-sm font-bold text-dark-900 dark:text-white leading-snug line-clamp-2">
                    {task.title}
                  </p>

                  {/* Progress bar */}
                  <ProgressBar value={task.progress} />
                  <div className="flex items-center justify-between text-[10px] text-dark-400">
                    <span>{task.progress}% complete</span>
                    <span className={`font-mono ${isOverdue(task.dueDate, task.status) ? 'text-red-500' : ''}`}>
                      {formatDate(task.dueDate)}
                    </span>
                  </div>

                  {/* Footer: assignee + meta */}
                  <div className="flex items-center justify-between pt-1 border-t border-dark-50 dark:border-dark-800">
                    <AssigneeAvatar name={task.assignee} />
                    <div className="flex items-center gap-2.5 text-dark-400">
                      {task.comments.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold">
                          <MessageSquare className="h-3 w-3" />{task.comments.length}
                        </span>
                      )}
                      {task.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold">
                          <Paperclip className="h-3 w-3" />{task.attachments.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Move buttons */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    {STATUS_ORDER.indexOf(task.status) > 0 && (
                      <button
                        onClick={() => moveTask(task.id, 'back')}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-dark-500 hover:text-dark-800 dark:hover:text-white border border-dark-200 dark:border-dark-700 rounded-lg py-1 hover:bg-dark-50 dark:hover:bg-dark-800 transition-all"
                      >
                        <ArrowLeft className="h-3 w-3" /> Back
                      </button>
                    )}
                    {STATUS_ORDER.indexOf(task.status) < 3 && (
                      <button
                        onClick={() => moveTask(task.id, 'forward')}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 border border-brand-300 dark:border-brand-800 rounded-lg py-1 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all"
                      >
                        Move <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {colTasks.length === 0 && (
                <div className="border-2 border-dashed border-dark-150 dark:border-dark-800 rounded-xl p-6 text-center text-xs text-dark-400">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ─── List View ────────────────────────────────────────────────────────────

  const ListView = () => {
    const filtered = tasks.filter((t) => {
      const q = search.toLowerCase();
      return (
        (t.title.toLowerCase().includes(q) || t.assignee.toLowerCase().includes(q)) &&
        (filterStatus === 'All' || t.status === filterStatus) &&
        (filterPriority === 'All' || t.priority === filterPriority) &&
        (filterAssignee === 'All' || t.assignee === filterAssignee)
      );
    });

    return (
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <Card.Content className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:max-w-xs relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tasks or assignees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs py-2.5 pl-10 pr-4 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-full text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Status', value: filterStatus, set: setFilterStatus, options: ['All', ...STATUS_ORDER] },
                { label: 'Priority', value: filterPriority, set: setFilterPriority, options: ['All', 'Urgent', 'High', 'Medium', 'Low'] },
                { label: 'Assignee', value: filterAssignee, set: setFilterAssignee, options: ['All', ...storeEmployees.map((e) => e.name)] },
              ].map(({ label, value, set, options }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">{label}:</span>
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="text-xs py-1.5 px-3 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-700 dark:text-dark-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        {/* Table */}
        <Card>
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] font-bold text-dark-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Task</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800 text-xs">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-dark-400">No tasks match the filters.</td></tr>
                ) : filtered.map((task) => (
                  <tr key={task.id} className="hover:bg-dark-50/20 dark:hover:bg-dark-900/20 transition-colors">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-dark-900 dark:text-white line-clamp-1 max-w-xs">{task.title}</p>
                      <p className="text-[10px] text-dark-400 mt-0.5 flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" />{task.comments.length}
                        <Paperclip className="h-3 w-3" />{task.attachments.length}
                      </p>
                    </td>
                    <td className="py-3.5 px-4"><PriorityBadge priority={task.priority} /></td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_COLOR[task.status]}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <AssigneeAvatar name={task.assignee} />
                        <span className="text-dark-600 dark:text-dark-350 font-semibold">{task.assignee.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className={`py-3.5 px-4 font-mono text-[10px] font-bold ${isOverdue(task.dueDate, task.status) ? 'text-red-500' : 'text-dark-600 dark:text-dark-350'}`}>
                      {formatDate(task.dueDate)}
                    </td>
                    <td className="py-3.5 px-4 w-28">
                      <ProgressBar value={task.progress} />
                      <span className="text-[10px] text-dark-400 mt-1 block">{task.progress}%</span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {STATUS_ORDER.indexOf(task.status) < 3 && (
                          <Button variant="ghost" size="sm" onClick={() => moveTask(task.id, 'forward')}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded"
                            leftIcon={<ArrowRight className="h-3.5 w-3.5" />} />
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openDrawer(task)}
                          className="p-1.5 text-dark-500 hover:bg-dark-50 rounded text-[10px] font-bold"
                          leftIcon={<AlertCircle className="h-3.5 w-3.5" />} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      </div>
    );
  };

  // ─── Calendar View ────────────────────────────────────────────────────────

  const CalendarView = () => {
    const daysInMonth = 31;
    const startDayOfWeek: number = 3; // Wednesday
    const leadingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const days: (number | null)[] = [
      ...Array(leadingDays).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const tasksForDay = (day: number) =>
      tasks.filter((t) => {
        const d = new Date(t.dueDate);
        return d.getMonth() === 6 && d.getDate() === day;
      });

    return (
      <Card>
        <Card.Header className="flex flex-row justify-between items-center border-b border-dark-100 dark:border-dark-800">
          <div>
            <Card.Title>Task Calendar — July 2026</Card.Title>
            <Card.Description>Tasks plotted by due date. Click any date to see details.</Card.Description>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="p-1.5 rounded cursor-not-allowed text-dark-300" leftIcon={<ChevronLeft className="h-4 w-4" />} />
            <Button variant="outline" size="sm" className="p-1.5 rounded cursor-not-allowed text-dark-300" leftIcon={<ChevronRight className="h-4 w-4" />} />
          </div>
        </Card.Header>
        <Card.Content className="p-5">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-dark-400 dark:text-dark-500 uppercase tracking-wide mb-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => <span key={d}>{d}</span>)}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day, idx) => {
              if (day === null) return <div key={`e${idx}`} className="min-h-[72px]" />;
              const dayTasks = tasksForDay(day);
              const isToday = day === 10;
              const isPopoverOpen = calendarPopoverDay === day;

              return (
                <div key={day} className="relative">
                  <button
                    onClick={() => setCalendarPopoverDay(isPopoverOpen ? null : (dayTasks.length > 0 ? day : null))}
                    className={`w-full min-h-[72px] p-1.5 rounded-xl border text-left transition-all duration-150 ${
                      isToday
                        ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10'
                        : 'border-dark-100 dark:border-dark-800 hover:border-dark-300 dark:hover:border-dark-600 bg-white dark:bg-dark-900/50'
                    } ${dayTasks.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`text-[11px] font-extrabold block mb-1 ${isToday ? 'text-brand-600' : 'text-dark-700 dark:text-dark-300'}`}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          className={`w-full text-[8px] font-bold px-1 py-0.5 rounded truncate ${PRIORITY_CONFIG[t.priority].color}`}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <span className="text-[8px] text-dark-400 font-bold px-1">+{dayTasks.length - 2} more</span>
                      )}
                    </div>
                  </button>

                  {/* Popover */}
                  {isPopoverOpen && dayTasks.length > 0 && (
                    <div className="absolute top-full left-0 z-30 mt-1 w-56 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl shadow-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-dark-900 dark:text-white">July {day}</span>
                        <button onClick={() => setCalendarPopoverDay(null)} className="text-dark-400 hover:text-dark-700">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => { setCalendarPopoverDay(null); openDrawer(t); }}
                          className="p-2 rounded-lg border border-dark-100 dark:border-dark-800 hover:border-brand-400 cursor-pointer transition-all"
                        >
                          <p className="text-[10px] font-bold text-dark-900 dark:text-white line-clamp-2">{t.title}</p>
                          <div className="flex items-center justify-between mt-1">
                            <PriorityBadge priority={t.priority} />
                            <AssigneeAvatar name={t.assignee} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-dark-100 dark:border-dark-800 text-[10px] font-semibold text-dark-500">
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
              <div key={p} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[p].dot}`} />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    );
  };

  // ─── Task Detail Drawer ────────────────────────────────────────────────────

  const TaskDrawer = () => {
    if (!selectedTask) return null;
    const completedSubs = selectedTask.subtasks.filter((s) => s.completed).length;

    return (
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Task Details"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveDrawer}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-6 text-sm">
          {/* Title */}
          <div>
            <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide block mb-1">Title</label>
            <input
              className="w-full text-sm font-bold text-dark-900 dark:text-white bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              value={selectedTask.title}
              onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide block mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full text-xs text-dark-700 dark:text-dark-200 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
              value={selectedTask.description}
              onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
            />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide block mb-1">Priority</label>
              <select
                className="w-full text-xs py-2 px-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={selectedTask.priority}
                onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value as Priority })}
              >
                {(['Urgent','High','Medium','Low'] as Priority[]).map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide block mb-1">Status</label>
              <select
                className="w-full text-xs py-2 px-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={selectedTask.status}
                onChange={(e) => setSelectedTask({ ...selectedTask, status: e.target.value as Status })}
              >
                {STATUS_ORDER.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide block mb-1">Due Date</label>
              <input
                type="date"
                className="w-full text-xs py-2 px-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={selectedTask.dueDate}
                onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide block mb-1">Assignee</label>
              <select
                className="w-full text-xs py-2 px-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={selectedTask.assigneeId || ''}
                onChange={(e) => {
                  const empId = e.target.value;
                  const emp = storeEmployees.find((x) => x.id === empId);
                  setSelectedTask({
                    ...selectedTask,
                    assigneeId: empId || null,
                    assignee: emp ? emp.name : 'Unassigned',
                  });
                }}
              >
                <option value="">Unassigned</option>
                {storeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">Progress</label>
              <span className="text-xs font-extrabold text-brand-600">{drawerProgress}%</span>
            </div>
            <input
              type="range"
              min={0} max={100} step={5}
              value={drawerProgress}
              onChange={(e) => setDrawerProgress(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <ProgressBar value={drawerProgress} />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">
                Subtasks ({completedSubs}/{selectedTask.subtasks.length})
              </label>
            </div>
            <div className="space-y-1.5 mb-3">
              {selectedTask.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 group/sub">
                  <button
                    onClick={() => toggleSubtask(s.id)}
                    className={`h-4.5 w-4.5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${s.completed ? 'bg-green-500 border-green-500 text-white' : 'border-dark-300 dark:border-dark-600 hover:border-brand-500'}`}
                  >
                    {s.completed && <Check className="h-2.5 w-2.5" />}
                  </button>
                  <span className={`text-xs flex-1 ${s.completed ? 'line-through text-dark-400' : 'text-dark-700 dark:text-dark-200'}`}>{s.title}</span>
                  <button onClick={() => deleteSubtask(s.id)} className="opacity-0 group-hover/sub:opacity-100 text-dark-400 hover:text-red-500 transition-all">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                placeholder="Add subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                className="flex-1 text-xs py-1.5 px-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 text-dark-900 dark:text-dark-50"
              />
              <Button variant="outline" size="sm" onClick={addSubtask} leftIcon={<Plus className="h-3.5 w-3.5" />} />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide block mb-2">Attachments</label>
            <div className="space-y-1.5 mb-3">
              {selectedTask.attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 p-2 bg-dark-50 dark:bg-dark-800 rounded-lg border border-dark-150 dark:border-dark-700">
                  <Paperclip className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                  <span className="text-xs font-semibold text-dark-700 dark:text-dark-200 flex-1 truncate">{a.name}</span>
                  <span className="text-[10px] text-dark-400">{a.size}</span>
                </div>
              ))}
              {selectedTask.attachments.length === 0 && (
                <p className="text-[10px] text-dark-400 italic">No attachments yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                placeholder="File name (e.g. report.pdf)"
                value={newAttachment}
                onChange={(e) => setNewAttachment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAttachment()}
                className="flex-1 text-xs py-1.5 px-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 text-dark-900 dark:text-dark-50"
              />
              <Button variant="outline" size="sm" onClick={addAttachment} leftIcon={<Plus className="h-3.5 w-3.5" />} />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wide block mb-2">
              Comments ({selectedTask.comments.length})
            </label>
            <div className="space-y-3 mb-3 max-h-48 overflow-y-auto pr-1">
              {selectedTask.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-extrabold shrink-0">
                    {getInitials(c.author)}
                  </div>
                  <div className="flex-1 bg-dark-50 dark:bg-dark-800 rounded-xl rounded-tl-none px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold text-dark-800 dark:text-dark-200">{c.author}</span>
                      <span className="text-[9px] text-dark-400">{c.timestamp}</span>
                    </div>
                    <p className="text-xs text-dark-600 dark:text-dark-350 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
              {selectedTask.comments.length === 0 && (
                <p className="text-[10px] text-dark-400 italic">No comments yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addComment()}
                className="flex-1 text-xs py-2 px-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 text-dark-900 dark:text-dark-50"
              />
              <Button variant="primary" size="sm" onClick={addComment} leftIcon={<Send className="h-3.5 w-3.5" />} />
            </div>
          </div>
        </div>
      </Drawer>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const totalDone = tasks.filter((t) => t.status === 'Done').length;
  const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;

  if (loading) {
    return (
      <div className="p-20 text-center text-xs text-dark-400 space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-500" />
        <p>Loading tasks from Supabase...</p>
      </div>
    );
  }

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
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dark-900 dark:text-white">Task Management</h2>
            <p className="text-xs text-dark-500 dark:text-dark-400">Track, assign, and manage pharmacy operational tasks.</p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Task
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, icon: <ClipboardList className="h-4 w-4" />, color: 'text-brand-500 bg-brand-500/10' },
          { label: 'Completed', value: totalDone, icon: <Check className="h-4 w-4" />, color: 'text-green-500 bg-green-500/10' },
          { label: 'Avg Progress', value: `${avgProgress}%`, icon: <Flag className="h-4 w-4" />, color: 'text-purple-500 bg-purple-500/10' },
          { label: 'Overdue', value: overdue, icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-500 bg-red-500/10' },
        ].map(({ label, value, icon, color }) => (
          <Card key={label}>
            <Card.Content className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
              <div>
                <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-black text-dark-900 dark:text-white leading-tight">{value}</p>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 bg-dark-100/60 dark:bg-dark-900/60 rounded-xl p-1 w-fit">
        {([
          { key: 'kanban', label: 'Kanban', icon: <LayoutGrid className="h-4 w-4" /> },
          { key: 'list',   label: 'List',   icon: <List className="h-4 w-4" /> },
          { key: 'calendar', label: 'Calendar', icon: <CalendarDays className="h-4 w-4" /> },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              view === key
                ? 'bg-white dark:bg-dark-800 text-brand-600 shadow-sm'
                : 'text-dark-500 dark:text-dark-400 hover:text-dark-800 dark:hover:text-white'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Active View */}
      {view === 'kanban' && <KanbanView />}
      {view === 'list' && <ListView />}
      {view === 'calendar' && <CalendarView />}

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Task"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit(onAddTask)} leftIcon={<Plus className="h-4 w-4" />}>
              Create Task
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onAddTask)} className="space-y-4" noValidate>
          <Input label="Task Title" placeholder="e.g. Restock Metformin 500mg" error={errors.title?.message} {...register('title')} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">Description (optional)</label>
            <textarea
              rows={3}
              placeholder="What needs to be done?"
              className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
              {...register('description')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Priority', name: 'priority', opts: ['Urgent','High','Medium','Low'] },
              { label: 'Status',   name: 'status',   opts: ['To Do','In Progress','In Review','Done'] },
            ].map(({ label, name, opts }) => (
              <div key={name} className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">{label}</label>
                <select
                  className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  {...register(name as 'priority' | 'status')}
                >
                  {opts.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">Due Date</label>
              <input
                type="date"
                className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                {...register('dueDate')}
              />
              {errors.dueDate && <span className="text-xs text-red-500">{errors.dueDate.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">Assignee</label>
              <select
                className="w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                {...register('assignee')}
              >
                <option value="">Unassigned</option>
                {storeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Task Detail Drawer */}
      <TaskDrawer />
    </div>
  );
};
