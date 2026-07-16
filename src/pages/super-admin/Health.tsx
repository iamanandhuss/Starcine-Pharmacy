import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';

interface StoreHealth {
  store_name: string;
  health_score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  cleanliness: number;
  delivery_compliance: number;
  tasks_compliance: number;
  incidents_count: number;
}

export const Health: React.FC = () => {
  const [storeHealthList] = useState<StoreHealth[]>([
    { store_name: 'Main Street Pharmacy', health_score: 94, grade: 'A', cleanliness: 96, delivery_compliance: 92, tasks_compliance: 94, incidents_count: 0 },
    { store_name: 'Westside Branch', health_score: 82, grade: 'B', cleanliness: 80, delivery_compliance: 88, tasks_compliance: 78, incidents_count: 1 },
    { store_name: 'Downtown Pharmacy', health_score: 75, grade: 'C', cleanliness: 68, delivery_compliance: 82, tasks_compliance: 75, incidents_count: 2 },
  ]);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleAudit = () => {
    showToast('Branch operational safety audit triggered!');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🏪 Branch Health & Safety Scores</h1>
          <p className="text-xs text-dark-500">Monitor environmental safety registers, audit records, and branch compliance trends</p>
        </div>
        <Button
          onClick={handleAudit}
          leftIcon={<RefreshCw className="h-4 w-4" />}
          className="shadow-sm"
        >
          Run Platform Audit
        </Button>
      </div>

      {/* Grid: Health breakdown cards per branch */}
      <div className="grid md:grid-cols-3 gap-6">
        {storeHealthList.map(store => (
          <Card key={store.store_name} className="hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-full h-1 
              ${store.health_score >= 90 ? 'bg-green-500' : store.health_score >= 80 ? 'bg-blue-500' : 'bg-amber-500'}
            `} />
            <Card.Header className="pb-2">
              <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold 
                  ${store.health_score >= 90 ? 'bg-green-500/10 text-green-600' : store.health_score >= 80 ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-600'}
                `}>
                  Grade {store.grade}
                </span>
                <span className="text-2xl font-black text-dark-900 dark:text-white font-mono">{store.health_score}</span>
              </div>
              <Card.Title className="text-sm font-extrabold text-dark-800 dark:text-dark-200 mt-2">{store.store_name}</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3 text-xs">
              
              {/* Compliance progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold text-dark-500">
                  <span>Cleanliness Index</span>
                  <span>{store.cleanliness}%</span>
                </div>
                <div className="w-full bg-dark-100 dark:bg-dark-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: `${store.cleanliness}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold text-dark-500">
                  <span>Task Execution</span>
                  <span>{store.tasks_compliance}%</span>
                </div>
                <div className="w-full bg-dark-100 dark:bg-dark-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-500 h-full" style={{ width: `${store.tasks_compliance}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold text-dark-500">
                  <span>Delivery Speed</span>
                  <span>{store.delivery_compliance}%</span>
                </div>
                <div className="w-full bg-dark-100 dark:bg-dark-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: `${store.delivery_compliance}%` }} />
                </div>
              </div>

              {/* Incidents check */}
              <div className="flex items-center justify-between pt-2 border-t border-dark-100 dark:border-dark-800 text-[10px]">
                <span className="text-dark-400">Environmental Incidents:</span>
                <span className={`font-bold flex items-center gap-1 ${store.incidents_count > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {store.incidents_count > 0 ? (
                    <>
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {store.incidents_count} Open Issue(s)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Clean Log
                    </>
                  )}
                </span>
              </div>
            </Card.Content>
          </Card>
        ))}
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
