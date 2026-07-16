import React, { useState } from 'react';
import { Plus, ArrowUpRight, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';

interface IssueTicket {
  id: string;
  title: string;
  category: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Assigned' | 'Closed';
  store_name: string;
  assigned_to: string;
  created_at: string;
  comments_count: number;
}

export const Issues: React.FC = () => {
  const [issues, setIssues] = useState<IssueTicket[]>([
    { id: '1', title: 'Fridge B compressor makes loud noise', category: 'Maintenance', priority: 'Urgent', status: 'Open', store_name: 'Main Street Pharmacy', assigned_to: 'Unassigned', created_at: '2 hrs ago', comments_count: 3 },
    { id: '2', title: 'Barcode scanner at POS Register 2 disconnected', category: 'IT Hardware', priority: 'High', status: 'Assigned', store_name: 'Westside Branch', assigned_to: 'Sarah T. (Tech Support)', created_at: 'Yesterday', comments_count: 1 },
    { id: '3', title: 'Narcotic prescription logs page timeout', category: 'Software Bug', priority: 'Medium', status: 'Open', store_name: 'Main Street Pharmacy', assigned_to: 'Unassigned', created_at: '2 days ago', comments_count: 0 },
    { id: '4', title: 'Front entrance glass door sensor alignment', category: 'Maintenance', priority: 'Low', status: 'Closed', store_name: 'Westside Branch', assigned_to: 'David L.', created_at: '3 days ago', comments_count: 2 },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Maintenance');
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newIssue: IssueTicket = {
      id: String(Date.now()),
      title,
      category,
      priority,
      status: 'Open',
      store_name: 'Main Street Pharmacy',
      assigned_to: 'Unassigned',
      created_at: 'Just now',
      comments_count: 0
    };

    setIssues(prev => [newIssue, ...prev]);
    setIsModalOpen(false);
    showToast('Support ticket filed successfully');
  };

  const handleEscalate = (id: string) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        return { ...issue, priority: 'Urgent' };
      }
      return issue;
    }));
    showToast('Issue escalated to High Priority and notification sent to branch managers');
  };

  const handleCloseIssue = (id: string) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        return { ...issue, status: 'Closed' };
      }
      return issue;
    }));
    showToast('Support ticket closed successfully');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">⚠️ Helpdesk & Support Issues</h1>
          <p className="text-xs text-dark-500">Track system complaints, report branch equipment shortages, and manage escalation hierarchies</p>
        </div>
        <Button
          onClick={() => {
            setTitle('');
            setIsModalOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
          className="shadow-sm"
        >
          File Ticket
        </Button>
      </div>

      {/* Ticket List */}
      <div className="grid md:grid-cols-2 gap-6">
        {issues.map(issue => (
          <Card key={issue.id} className="hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1.5 h-full 
              ${issue.priority === 'Urgent' ? 'bg-red-600' : issue.priority === 'High' ? 'bg-orange-500' : issue.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}
            `} />
            <Card.Header className="pb-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400 px-2 py-0.5 rounded font-bold">
                  {issue.category}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider
                  ${issue.status === 'Open' ? 'bg-red-500/10 text-red-500' : issue.status === 'Assigned' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-600'}
                `}>
                  {issue.status}
                </span>
              </div>
              <Card.Title className="text-sm font-extrabold text-dark-800 dark:text-dark-200 mt-2">{issue.title}</Card.Title>
              <Card.Description>{issue.store_name} • Reported {issue.created_at}</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4 text-xs">
              <div className="flex items-center justify-between pt-2 border-t border-dark-100 dark:border-dark-800">
                <span className="text-[10px] text-dark-400">Assigned: <strong className="text-dark-700 dark:text-dark-300 font-semibold">{issue.assigned_to}</strong></span>
                <div className="flex items-center gap-1 text-[10px] text-dark-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{issue.comments_count} comment(s)</span>
                </div>
              </div>

              {issue.status !== 'Closed' && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowUpRight className="h-3 w-3" />}
                    onClick={() => handleEscalate(issue.id)}
                    disabled={issue.priority === 'Urgent'}
                  >
                    Escalate
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-3 w-3" />}
                    onClick={() => handleCloseIssue(issue.id)}
                  >
                    Close Ticket
                  </Button>
                </div>
              )}
            </Card.Content>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="⚠️ File Support Ticket">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Ticket Title" placeholder="e.g. Vaccine fridge failure" value={title} onChange={e => setTitle(e.target.value)} required />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500"
              >
                <option value="Maintenance">Maintenance</option>
                <option value="IT Hardware">IT Hardware</option>
                <option value="Software Bug">Software Bug</option>
                <option value="Drug Shortage">Drug Shortage</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Ticket</Button>
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
