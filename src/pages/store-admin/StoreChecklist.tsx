import React, { useState } from 'react';
import {
  Sun, Moon, ShieldCheck, Check
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';

interface ChecklistItem {
  id: string;
  task: string;
  checked: boolean;
}

export const StoreChecklist: React.FC = () => {

  const [openingItems, setOpeningItems] = useState<ChecklistItem[]>([
    { id: 'o1', task: 'Turn on all showroom and storage lighting', checked: false },
    { id: 'o2', task: 'Set showroom AC thermostat to 22C', checked: false },
    { id: 'o3', task: 'Boot cashier POS computers and printers', checked: false },
    { id: 'o4', task: 'Check refrigerator temperature log reading (must be between 2C and 8C)', checked: false },
    { id: 'o5', task: 'Inspect physical counters for dust and clean display surfaces', checked: false },
    { id: 'o6', task: 'Examine security locks on emergency exit doors', checked: false },
  ]);

  const [closingItems, setClosingItems] = useState<ChecklistItem[]>([
    { id: 'c1', task: 'Perform POS cash register count and reconcile card receipts', checked: false },
    { id: 'c2', task: 'Lock cold-chain refrigerator medicine drawers', checked: false },
    { id: 'c3', task: 'Audit all patient prescription drawers for pending dispatches', checked: false },
    { id: 'c4', task: 'Clear billing counter trash bins', checked: false },
    { id: 'c5', task: 'Switch off show-window lights and showroom AC units', checked: false },
    { id: 'c6', task: 'Arm building burglar security system and lock exit doors', checked: false },
  ]);

  const [lastSubmittedOpening, setLastSubmittedOpening] = useState<string | null>(null);
  const [lastSubmittedClosing, setLastSubmittedClosing] = useState<string | null>(null);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleToggleOpening = (id: string) => {
    setOpeningItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleToggleClosing = (id: string) => {
    setClosingItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleSubmittingChecklist = (type: 'Opening' | 'Closing') => {
    const items = type === 'Opening' ? openingItems : closingItems;
    const completed = items.filter(i => i.checked).length;
    if (completed < items.length) {
      showToast(`Warning: Please check all tasks before submission.`, 'error');
      return;
    }

    if (type === 'Opening') {
      setLastSubmittedOpening(new Date().toLocaleTimeString());
    } else {
      setLastSubmittedClosing(new Date().toLocaleTimeString());
    }

    showToast(`Daily ${type} Checklist submitted! Contribution pushed to active Health Score.`);
  };

  const openCompleted = openingItems.filter(i => i.checked).length;
  const closeCompleted = closingItems.filter(i => i.checked).length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">📋 Daily Compliance Checklists</h1>
          <p className="text-xs text-dark-500">Perform standard branch opening/closing procedures to maintain store Health scores</p>
        </div>
      </div>

      {/* Grid: Open & Close side-by-side */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Opening Checklist */}
        <Card className="flex flex-col">
          <Card.Header className="bg-brand-500/5 pb-3 border-b flex justify-between items-center">
            <Card.Title className="text-xs font-black uppercase text-brand-600 flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-amber-500 animate-spin" style={{ animationDuration: '20s' }} />
              Opening Procedures
            </Card.Title>
            <span className="text-[10px] bg-brand-500/10 text-brand-600 px-2 py-0.5 rounded-full font-bold">
              {openCompleted}/{openingItems.length} Complete
            </span>
          </Card.Header>
          <Card.Content className="p-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3.5 mb-6">
              {openingItems.map(item => (
                <label key={item.id} className="flex items-start gap-3 text-xs text-dark-700 dark:text-dark-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleOpening(item.id)}
                    className="mt-0.5 accent-brand-500 rounded border-dark-300"
                  />
                  <span className={item.checked ? 'line-through text-dark-400' : ''}>{item.task}</span>
                </label>
              ))}
            </div>

            <div className="pt-4 border-t space-y-3">
              {lastSubmittedOpening && (
                <p className="text-[10px] text-green-600 font-bold bg-green-500/5 p-2 rounded-lg border border-green-500/10 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Opening checklist certified at {lastSubmittedOpening}
                </p>
              )}
              <Button
                className="w-full text-xs shadow"
                onClick={() => handleSubmittingChecklist('Opening')}
                disabled={!!lastSubmittedOpening}
              >
                Submit Opening Checklist
              </Button>
            </div>
          </Card.Content>
        </Card>

        {/* Closing Checklist */}
        <Card className="flex flex-col">
          <Card.Header className="bg-purple-500/5 pb-3 border-b flex justify-between items-center">
            <Card.Title className="text-xs font-black uppercase text-purple-600 flex items-center gap-1.5">
              <Moon className="h-4 w-4 text-purple-500 animate-pulse" />
              Closing Procedures
            </Card.Title>
            <span className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full font-bold">
              {closeCompleted}/{closingItems.length} Complete
            </span>
          </Card.Header>
          <Card.Content className="p-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3.5 mb-6">
              {closingItems.map(item => (
                <label key={item.id} className="flex items-start gap-3 text-xs text-dark-700 dark:text-dark-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleClosing(item.id)}
                    className="mt-0.5 accent-purple-600 rounded border-dark-300"
                  />
                  <span className={item.checked ? 'line-through text-dark-400' : ''}>{item.task}</span>
                </label>
              ))}
            </div>

            <div className="pt-4 border-t space-y-3">
              {lastSubmittedClosing && (
                <p className="text-[10px] text-green-600 font-bold bg-green-500/5 p-2 rounded-lg border border-green-500/10 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Closing checklist certified at {lastSubmittedClosing}
                </p>
              )}
              <Button
                className="w-full text-xs shadow"
                onClick={() => handleSubmittingChecklist('Closing')}
                disabled={!!lastSubmittedClosing}
              >
                Submit Closing Checklist
              </Button>
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
export { ShieldCheck };
