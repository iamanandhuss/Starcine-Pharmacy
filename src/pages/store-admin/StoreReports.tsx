import React, { useState } from 'react';
import {
  FileText, ClipboardList, Clock, Truck, IndianRupee,
  Download
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';

export const StoreReports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState('attendance');
  const [dateRange, setDateRange] = useState('week');
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    showToast(`Downloading operational report in ${format} format...`);
    
    // Simulate simple client-side mock download trigger
    const link = document.createElement('a');
    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`Starcine Rx Report: ${selectedReport}\nRange: ${dateRange}\nFormat: ${format}\nExported at: ${new Date().toLocaleString()}`);
    link.download = `Starcine_${selectedReport}_Report_${dateRange}.${format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">📊 Analytical Store Reports</h1>
          <p className="text-xs text-dark-500">Extract operational records, clean schedules, late attendance sheets, and sales targets logs</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Selection side */}
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Report Category</p>
          <div className="space-y-2">
            {[
              { id: 'attendance', label: 'Attendance Audit', icon: <Clock className="h-4 w-4" /> },
              { id: 'sales', label: 'Sales & Invoices', icon: <IndianRupee className="h-4 w-4" /> },
              { id: 'employees', label: 'Staff Directory', icon: <Users className="h-4 w-4" /> },
              { id: 'grooming', label: 'Cleanliness Logs', icon: <ClipboardList className="h-4 w-4" /> },
              { id: 'issues', label: 'Incident Tracking', icon: <FileText className="h-4 w-4" /> },
              { id: 'deliveries', label: 'Home Deliveries', icon: <Truck className="h-4 w-4" /> },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={`w-full flex items-center gap-2.5 p-3 rounded-lg border text-xs font-bold transition-all text-left cursor-pointer
                  ${selectedReport === r.id
                    ? 'border-brand-500 bg-brand-500/5 text-brand-600 font-extrabold'
                    : 'border-dark-200 dark:border-dark-850 text-dark-500 hover:bg-dark-50 dark:hover:bg-dark-900/50'
                  }
                `}
              >
                {r.icon}
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter & Export side */}
        <Card className="lg:col-span-3">
          <Card.Header>
            <Card.Title className="text-xs uppercase font-extrabold tracking-wider">Report Filter Parameters</Card.Title>
          </Card.Header>
          <Card.Content className="p-6 space-y-6">
            
            {/* Filter controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Time Horizon</label>
                <select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-dark-200 bg-white"
                >
                  <option value="today">Today</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">Past 30 Days</option>
                  <option value="quarter">Past Quarter</option>
                </select>
              </div>
              <div className="opacity-50 pointer-events-none">
                <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Audit Filter Scopes</label>
                <select className="w-full text-xs p-2.5 rounded-lg border border-dark-200 bg-white">
                  <option>All active staff members</option>
                </select>
              </div>
            </div>

            {/* Export buttons row */}
            <div className="pt-6 border-t border-dark-100 dark:border-dark-800 space-y-4">
              <p className="text-[10px] font-bold text-dark-400 uppercase">Export Options</p>
              
              <div className="grid sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleExport('PDF')}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Download PDF Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('Excel')}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Download Excel Sheet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('CSV')}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Download CSV Ledger
                </Button>
              </div>
            </div>

          </Card.Content>
        </Card>

      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};

const Users: React.FC<{ className?: string }> = ({ className }) => <span className={className}>👥</span>;
export { Users };
