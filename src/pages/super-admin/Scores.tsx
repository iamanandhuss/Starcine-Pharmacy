import React, { useState } from 'react';
import { Sliders, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';

interface ScoreCategory {
  name: string;
  weight: number; // percent
  description: string;
}

export const Scores: React.FC = () => {
  const [categories, setCategories] = useState<ScoreCategory[]>([
    { name: 'Grooming Compliance', weight: 30, description: 'Photo checklist clearances and cleanliness audits' },
    { name: 'Task Completion Rate', weight: 35, description: 'Assigned checklist task resolution speeds' },
    { name: 'Deliveries Fulfilling', weight: 20, description: 'Fulfillment accuracy and driver return speeds' },
    { name: 'Attendance & Timeliness', weight: 15, description: 'Lateness controls and grace-time compliance' },
  ]);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleWeightChange = (index: number, val: string) => {
    setCategories(prev => prev.map((cat, i) => {
      if (i === index) {
        return { ...cat, weight: Number(val) || 0 };
      }
      return cat;
    }));
  };

  const handleSaveWeights = () => {
    const sum = categories.reduce((acc, cat) => acc + cat.weight, 0);
    if (sum !== 100) {
      showToast(`Total weight must sum to 100%. Current sum: ${sum}%`, 'error');
      return;
    }
    showToast('Platform KPI weights updated globally!');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">📊 KPI & Daily Score Configuration</h1>
          <p className="text-xs text-dark-500">Configure platform performance metrics, balance evaluation categories, and adjust weights</p>
        </div>
      </div>

      {/* KPI Distribution Matrix */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Weight Adjuster */}
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title className="flex items-center gap-1.5 text-xs">
              <Sliders className="h-4 w-4 text-brand-500" />
              Weight Matrix
            </Card.Title>
            <Card.Description>Adjust category distribution. Total must equal exactly 100%</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            {categories.map((cat, idx) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-dark-700 dark:text-dark-300">{cat.name}</span>
                  <span className="text-brand-600">{cat.weight}%</span>
                </div>
                <Input
                  type="number"
                  value={cat.weight}
                  onChange={e => handleWeightChange(idx, e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>
            ))}

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-brand-600 rounded-lg flex items-start gap-2.5 text-[10px] leading-relaxed">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Automated Daily Scoring</span>: Score algorithms evaluate store performances overnight by multiplying each category score with its specified weight factor.
              </div>
            </div>

            <Button onClick={handleSaveWeights} className="w-full">
              Save KPI Config
            </Button>
          </Card.Content>
        </Card>

        {/* Detailed Breakdowns */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="text-xs">Category Evaluation Descriptions</Card.Title>
            <Card.Description>Details of parameters parsed for nightly scoring operations</Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Category Name</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Evaluation Criteria</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Target Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {categories.map(cat => (
                    <tr key={cat.name} className="hover:bg-dark-50/20">
                      <td className="px-4 py-3.5 font-bold text-dark-800 dark:text-dark-200">{cat.name}</td>
                      <td className="px-3 py-3.5 text-dark-500 leading-relaxed">{cat.description}</td>
                      <td className="px-4 py-3.5 text-right font-black text-brand-600 dark:text-brand-400 font-mono text-sm">
                        {cat.weight}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
