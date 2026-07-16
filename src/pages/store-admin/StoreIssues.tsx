import React, { useEffect, useState } from 'react';
import {
  RefreshCw, Plus
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';
import { Toast } from '../../components/ui/Toast';

interface Issue {
  id: string;
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  assigned_employee_name: string | null;
  reporter_name: string;
  description: string | null;
  created_at: string;
  resolution_comments?: string | null;
}

interface Employee {
  id: string;
  full_name: string;
}

export const StoreIssues: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // New Issue Inputs
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Wrong Arrangement');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [newDescription, setNewDescription] = useState('');

  // Action Inputs
  const [assigneeName, setAssigneeName] = useState('');
  const [issueStatus, setIssueStatus] = useState<'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed'>('Open');
  const [resolutionText, setResolutionText] = useState('');

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
      const [empRes] = await Promise.all([
        supabase.from('users').select('id, full_name').eq('branch_id', selectedStoreId).eq('is_active', true),
      ]);

      setEmployees(empRes.data || []);

      // Mock issues list
      setIssues([
        {
          id: 'i1',
          title: 'Cold-chain refrigerator thermostat alert',
          category: 'Refrigerator',
          priority: 'Critical',
          status: 'In Progress',
          assigned_employee_name: 'Dr. Sarah Connor',
          reporter_name: 'Staff Member',
          description: 'Insulin fridge temp reading +8C. Needs immediate check.',
          created_at: `${today}T08:00:00Z`
        },
        {
          id: 'i2',
          title: 'Cephalexin shelf dirty',
          category: 'Dirty Shelf',
          priority: 'Low',
          status: 'Open',
          assigned_employee_name: null,
          reporter_name: 'Audit Agent',
          description: 'Spilled powder residue observed on Level 3 Shelf level.',
          created_at: `${today}T09:15:00Z`
        },
        {
          id: 'i3',
          title: 'Label printer roller jammed',
          category: 'Printer',
          priority: 'High',
          status: 'Resolved',
          assigned_employee_name: 'Dr. Alan Grant',
          reporter_name: 'Pharmacist Admin',
          description: 'Sticker feed jam. Cleared roller teeth.',
          created_at: `${today}T06:30:00Z`,
          resolution_comments: 'Roller teeth cleaned and sticky residue cleared.'
        }
      ]);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newIssue: Issue = {
      id: `issue-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      priority: newPriority,
      status: 'Open',
      assigned_employee_name: null,
      reporter_name: 'Store Manager',
      description: newDescription,
      created_at: new Date().toISOString()
    };

    setIssues(prev => [newIssue, ...prev]);
    setIsNewModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    showToast(`Filed incident: ${newTitle}`);
  };

  const handleUpdateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    setIssues(prev => prev.map(i => i.id === selectedIssue.id ? {
      ...i,
      assigned_employee_name: assigneeName || i.assigned_employee_name,
      status: issueStatus,
      resolution_comments: resolutionText || i.resolution_comments
    } : i));

    showToast(`Updated incident status: ${issueStatus}`);
    setIsActionModalOpen(false);
  };

  const categories = [
    'Wrong Arrangement', 'Missing Product', 'Expired Product', 'Dirty Shelf',
    'Damaged Rack', 'Printer', 'Computer', 'AC', 'Refrigerator', 'Lighting', 'Other'
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">⚠️ Support Incident Tickets</h1>
          <p className="text-xs text-dark-500">Track drug storage temperature exceptions, missing stock warnings, and printer faults</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsNewModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            File Incident
          </Button>
          <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-dark-400 font-bold">Loading incident boards...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Open Board */}
          <Card className="flex flex-col h-[500px]">
            <Card.Header className="bg-red-500/5 border-b pb-2 flex justify-between items-center shrink-0">
              <Card.Title className="text-xs font-black uppercase text-red-600 flex items-center gap-1">
                🚨 Open Incidents
              </Card.Title>
              <span className="text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded font-bold">
                {issues.filter(i => i.status === 'Open').length}
              </span>
            </Card.Header>
            <Card.Content className="flex-1 overflow-y-auto p-3 space-y-3">
              {issues.filter(i => i.status === 'Open').map(issue => (
                <Card
                  key={issue.id}
                  onClick={() => {
                    setSelectedIssue(issue);
                    setAssigneeName('');
                    setIssueStatus('Assigned');
                    setResolutionText('');
                    setIsActionModalOpen(true);
                  }}
                  className="hover:shadow cursor-pointer transition-shadow"
                >
                  <Card.Content className="p-3 text-xs space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-dark-800 dark:text-dark-200">{issue.title}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${issue.priority === 'Critical' ? 'bg-red-50/10 text-red-600' : 'bg-amber-500/10 text-amber-500'}`}>
                        {issue.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-dark-500 line-clamp-2 leading-relaxed">{issue.description}</p>
                    <span className="text-[9px] font-mono text-dark-400 block pt-1 border-t">Type: {issue.category} • {issue.reporter_name}</span>
                  </Card.Content>
                </Card>
              ))}
            </Card.Content>
          </Card>

          {/* Assigned & In Progress Board */}
          <Card className="flex flex-col h-[500px]">
            <Card.Header className="bg-blue-500/5 border-b pb-2 flex justify-between items-center shrink-0">
              <Card.Title className="text-xs font-black uppercase text-blue-600">
                ⚙️ In Progress / Assigned
              </Card.Title>
              <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                {issues.filter(i => ['Assigned', 'In Progress'].includes(i.status)).length}
              </span>
            </Card.Header>
            <Card.Content className="flex-1 overflow-y-auto p-3 space-y-3">
              {issues.filter(i => ['Assigned', 'In Progress'].includes(i.status)).map(issue => (
                <Card
                  key={issue.id}
                  onClick={() => {
                    setSelectedIssue(issue);
                    setAssigneeName(issue.assigned_employee_name || '');
                    setIssueStatus(issue.status);
                    setResolutionText(issue.resolution_comments || '');
                    setIsActionModalOpen(true);
                  }}
                  className="hover:shadow cursor-pointer transition-shadow"
                >
                  <Card.Content className="p-3 text-xs space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-dark-800 dark:text-dark-200">{issue.title}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${issue.priority === 'Critical' ? 'bg-red-50/10 text-red-600' : 'bg-amber-500/10 text-amber-500'}`}>
                        {issue.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-dark-500 line-clamp-2 leading-relaxed">{issue.description}</p>
                    <div className="flex justify-between items-center text-[9px] font-mono text-dark-400 pt-1 border-t">
                      <span>Owner: {issue.assigned_employee_name}</span>
                      <span className="capitalize px-1 rounded bg-blue-500/10 text-blue-600 font-bold">{issue.status}</span>
                    </div>
                  </Card.Content>
                </Card>
              ))}
            </Card.Content>
          </Card>

          {/* Resolved Board */}
          <Card className="flex flex-col h-[500px]">
            <Card.Header className="bg-green-500/5 border-b pb-2 flex justify-between items-center shrink-0">
              <Card.Title className="text-xs font-black uppercase text-green-600">
                ✅ Resolved / Closed
              </Card.Title>
              <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-bold">
                {issues.filter(i => ['Resolved', 'Closed'].includes(i.status)).length}
              </span>
            </Card.Header>
            <Card.Content className="flex-1 overflow-y-auto p-3 space-y-3">
              {issues.filter(i => ['Resolved', 'Closed'].includes(i.status)).map(issue => (
                <Card key={issue.id} className="opacity-80">
                  <Card.Content className="p-3 text-xs space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-dark-800 dark:text-dark-200 line-through">{issue.title}</p>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/10 text-green-600">
                        Resolved
                      </span>
                    </div>
                    {issue.resolution_comments && (
                      <p className="text-[9px] text-green-600 bg-green-500/5 p-1.5 rounded-lg border border-green-500/10 leading-relaxed font-sans">{issue.resolution_comments}</p>
                    )}
                    <span className="text-[9px] font-mono text-dark-400 block pt-1 border-t">Tech: {issue.assigned_employee_name}</span>
                  </Card.Content>
                </Card>
              ))}
            </Card.Content>
          </Card>

        </div>
      )}

      {/* File Incident Modal */}
      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="⚠️ File Support Incident Ticket">
        <form onSubmit={handleCreateIssue} className="space-y-4">
          <Input label="Incident Title" placeholder="e.g. Antibiotics A level dust accumulation" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Incident Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-dark-200"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-dark-200"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Description / Location Details</label>
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200 focus:border-brand-500 focus:outline-none"
              rows={3}
              placeholder="Provide exact details of the incident..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Incident</Button>
          </div>
        </form>
      </Modal>

      {/* Action / Resolution Modal */}
      <Modal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} title={`⚠️ Manage Incident: ${selectedIssue?.title}`}>
        <form onSubmit={handleUpdateIssue} className="space-y-4">
          <p className="text-xs text-dark-500 leading-relaxed bg-dark-50 dark:bg-dark-900 p-2.5 rounded-lg">
            Details: <strong>{selectedIssue?.description}</strong>
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Assign Technician / Staff</label>
              <select
                value={assigneeName}
                onChange={e => setAssigneeName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-dark-200 bg-white"
              >
                <option value="">No assignment</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.full_name}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Incident Status</label>
              <select
                value={issueStatus}
                onChange={e => setIssueStatus(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-dark-200 bg-white"
              >
                <option value="Open">Open</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Resolution Comments</label>
            <textarea
              value={resolutionText}
              onChange={e => setResolutionText(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200"
              rows={2}
              placeholder="Detail actions taken to resolve incident..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsActionModalOpen(false)}>Cancel</Button>
            <Button type="submit">Update Ticket</Button>
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
