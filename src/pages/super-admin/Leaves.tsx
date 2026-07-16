import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';
import { Toast } from '../../components/ui/Toast';

interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  users?: { full_name: string; email: string } | null;
  branches?: { name: string } | null;
}

export const Leaves: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, users!leave_requests_user_id_fkey(full_name, email), branches!leave_requests_branch_id_fkey(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      showToast(`Leave request marked as ${status}`);
      fetchLeaveRequests();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">📅 Leave Administration</h1>
          <p className="text-xs text-dark-500">Track and review employee vacation and sick leave applications across all stores</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchLeaveRequests}
          leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Sync List
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-500 font-semibold uppercase">Pending Approvals</p>
              <h3 className="text-2xl font-black mt-1 text-amber-500">{pendingCount}</h3>
            </div>
            <span className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <AlertCircle className="h-5 w-5" />
            </span>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-500 font-semibold uppercase">Approved Vacation</p>
              <h3 className="text-2xl font-black mt-1 text-green-600 dark:text-green-400">{approvedCount}</h3>
            </div>
            <span className="p-2.5 bg-green-500/10 text-green-600 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-500 font-semibold uppercase">Total Applications</p>
              <h3 className="text-2xl font-black mt-1 text-dark-900 dark:text-white">{requests.length}</h3>
            </div>
            <span className="p-2.5 bg-brand-500/10 text-brand-600 rounded-xl">
              <Calendar className="h-5 w-5" />
            </span>
          </Card.Content>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-dark-400">Loading vacation schedule logs...</div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-xs text-dark-400">No leave applications registered.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Employee Details</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Pharmacy Branch</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Leave Date Range</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase w-1/4">Reason / Notes</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Status</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-dark-50/20">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-dark-800 dark:text-dark-200">{req.users?.full_name || 'Staff Member'}</p>
                        <p className="text-[10px] text-dark-400 mt-0.5">{req.users?.email}</p>
                      </td>
                      <td className="px-3 py-3.5 font-medium text-dark-700 dark:text-dark-300">{req.branches?.name || 'Unassigned'}</td>
                      <td className="px-3 py-3.5 space-y-0.5">
                        <p className="font-semibold text-dark-800 dark:text-dark-200">
                          {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-dark-400 font-mono">
                          {Math.ceil((new Date(req.end_date).getTime() - new Date(req.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                        </p>
                      </td>
                      <td className="px-3 py-3.5 text-dark-500 line-clamp-2 leading-relaxed">{req.reason || 'No details specified'}</td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold 
                          ${req.status === 'Approved' ? 'bg-green-500/10 text-green-600' : req.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}
                        `}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        {req.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'Approved')}
                              title="Approve Request"
                              className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                              title="Reject Request"
                              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-dark-400 italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};
