import React, { useState } from 'react';
import { IndianRupee, TrendingUp, Target, RefreshCw, BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';

interface SalesMetric {
  store_name: string;
  daily_sales: number;
  monthly_sales: number;
  target_sales: number;
  achieved_percent: number;
}

export const Sales: React.FC = () => {
  const [metrics] = useState<SalesMetric[]>([
    { store_name: 'Main Street Pharmacy', daily_sales: 4200, monthly_sales: 125000, target_sales: 150000, achieved_percent: 83.3 },
    { store_name: 'Westside Branch', daily_sales: 3100, monthly_sales: 98000, target_sales: 100000, achieved_percent: 98.0 },
    { store_name: 'Downtown Pharmacy', daily_sales: 5800, monthly_sales: 172000, target_sales: 180000, achieved_percent: 95.5 },
  ]);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleFetchReport = () => {
    showToast('Sales reports compiled from database records!');
  };

  const totalMonthlySales = metrics.reduce((acc, m) => acc + m.monthly_sales, 0);
  const totalTargetSales = metrics.reduce((acc, m) => acc + m.target_sales, 0);
  const overallAchievedPercent = (totalMonthlySales / totalTargetSales) * 100;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">💰 Corporate Sales Dashboard</h1>
          <p className="text-xs text-dark-500">Monitor financial performance, verify sales milestones, and review branch achievements</p>
        </div>
        <Button
          onClick={handleFetchReport}
          leftIcon={<RefreshCw className="h-4 w-4" />}
          className="shadow-sm"
        >
          Sync Sales Logs
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-500 font-semibold uppercase">Total Monthly Sales</p>
              <h3 className="text-2xl font-black mt-1 text-dark-900 dark:text-white">
                ₹{totalMonthlySales.toLocaleString()}
              </h3>
            </div>
            <span className="p-2.5 bg-green-500/10 text-green-600 rounded-xl">
              <IndianRupee className="h-5 w-5" />
            </span>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-500 font-semibold uppercase">Platform Target</p>
              <h3 className="text-2xl font-black mt-1 text-dark-900 dark:text-white">
                ₹{totalTargetSales.toLocaleString()}
              </h3>
            </div>
            <span className="p-2.5 bg-brand-500/10 text-brand-600 rounded-xl">
              <Target className="h-5 w-5" />
            </span>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-500 font-semibold uppercase">Platform Achievement</p>
              <h3 className="text-2xl font-black mt-1 text-brand-600 dark:text-brand-400">
                {overallAchievedPercent.toFixed(1)}%
              </h3>
            </div>
            <span className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </span>
          </Card.Content>
        </Card>
      </div>

      {/* Store Performance comparison table */}
      <Card>
        <Card.Header>
          <Card.Title className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <BarChart3 className="h-4 w-4 text-brand-500" />
            Branch Sales Target Matrix
          </Card.Title>
          <Card.Description>Review achievements, monthly projections, and active daily volumes per branch</Card.Description>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                <tr>
                  <th className="px-4 py-3 font-bold text-dark-500 uppercase">Pharmacy Branch</th>
                  <th className="px-3 py-3 font-bold text-dark-500 uppercase text-right">Daily Sales Volume</th>
                  <th className="px-3 py-3 font-bold text-dark-500 uppercase text-right">Monthly Sales Volume</th>
                  <th className="px-3 py-3 font-bold text-dark-500 uppercase text-right">Target Sales Volume</th>
                  <th className="px-4 py-3 font-bold text-dark-500 uppercase text-center">Milestone %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                {metrics.map(metric => (
                  <tr key={metric.store_name} className="hover:bg-dark-50/20">
                    <td className="px-4 py-3.5 font-bold text-dark-800 dark:text-dark-200">{metric.store_name}</td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold text-dark-700 dark:text-dark-300">
                      ₹{metric.daily_sales.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold text-dark-700 dark:text-dark-300">
                      ₹{metric.monthly_sales.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-dark-500">
                      ₹{metric.target_sales.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 max-w-[150px] mx-auto">
                        <div className="w-full bg-dark-100 dark:bg-dark-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, metric.achieved_percent)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[10px] text-dark-600 dark:text-dark-400 shrink-0 w-10">
                          {metric.achieved_percent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
