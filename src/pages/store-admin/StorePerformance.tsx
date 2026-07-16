import React, { useEffect, useState } from 'react';
import {
  RefreshCw, Trophy, Star, Flame
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../context/StoreContext';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

interface StoreRankItem {
  rank: number;
  name: string;
  score: number;
  sales_achievement: number;
  is_current: boolean;
}

export const StorePerformance: React.FC = () => {
  const { selectedStoreId, selectedStoreName } = useStore();

  const [leaderboard, setLeaderboard] = useState<StoreRankItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mock leaderboard comparing store health scores
      setLeaderboard([
        { rank: 1, name: 'Starcine Downtown Pharmacy', score: 94, sales_achievement: 110, is_current: false },
        { rank: 2, name: selectedStoreName || 'Starcine Main Pharmacy', score: 92, sales_achievement: 104, is_current: true },
        { rank: 3, name: 'Starcine Northside Clinic', score: 88, sales_achievement: 96, is_current: false },
        { rank: 4, name: 'Starcine Westside Apothecary', score: 85, sales_achievement: 91, is_current: false },
        { rank: 5, name: 'Starcine East Gate Pharmacy', score: 81, sales_achievement: 84, is_current: false },
      ]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId, selectedStoreName]);

  const daysRemaining = 12;

  const healthCategories = [
    { name: 'Cleanliness', score: 98 },
    { name: 'Attendance', score: 92 },
    { name: 'Sales targets', score: 85 }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🏆 Store Championship & Health</h1>
          <p className="text-xs text-dark-500">Monitor overall store Health Score category breakdowns and active Championship standings</p>
        </div>
        <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />} />
      </div>
      {loading ? (
        <div className="text-center py-12 text-xs text-dark-400 font-bold">Loading store performance metrics...</div>
      ) : (
        <>
          {/* Championship Header metrics */}
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Tournament Timer */}
            <Card className="relative overflow-hidden bg-brand-600 text-white border-none">
              <div className="absolute top-0 right-0 h-full w-24 bg-white/5 skew-x-12 translate-x-8 pointer-events-none" />
              <Card.Content className="p-6 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-brand-200">Championship Status</p>
                <h2 className="text-3xl font-black">{daysRemaining} Days Left</h2>
                <p className="text-xs text-brand-100 leading-relaxed">Active tournament pool concludes soon. Elevate operations to secure the top tier reward!</p>
              </Card.Content>
            </Card>

            {/* Current Position */}
            <Card className="relative overflow-hidden">
              <Card.Content className="p-6 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-dark-400">Current Standing</p>
                <h2 className="text-3xl font-black flex items-center gap-1.5 text-dark-800 dark:text-dark-200">
                  <Trophy className="h-7 w-7 text-yellow-500 shrink-0" />
                  #2 Rank
                </h2>
                <p className="text-xs text-dark-500 leading-relaxed">Outperforming 82% of regional stores this week. 2 points gap to #1 spot!</p>
              </Card.Content>
            </Card>

            {/* Quality Score */}
            <Card className="relative overflow-hidden">
              <Card.Content className="p-6 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-dark-400">Weekly Health Index</p>
                <h2 className="text-3xl font-black flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
                  <Star className="h-7 w-7 text-brand-500 shrink-0 fill-brand-500" />
                  92/100
                </h2>
                <p className="text-xs text-dark-500 leading-relaxed">Compliance standard checks completed. High cleanliness levels logged.</p>
              </Card.Content>
            </Card>

          </div>

          {/* Grid Layout: Leaderboard + Health Breakdowns */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Leaderboard Table */}
            <Card className="lg:col-span-2">
              <Card.Header>
                <Card.Title className="text-xs uppercase font-extrabold tracking-wider">Pharmacy Championship Leaderboard</Card.Title>
              </Card.Header>
              <Card.Content className="p-0">
                <div className="divide-y divide-dark-100 dark:divide-dark-800">
                  {leaderboard.map(item => (
                    <div
                      key={item.name}
                      className={`p-4 flex items-center justify-between text-xs transition-colors
                        ${item.is_current
                          ? 'bg-brand-500/5 font-extrabold text-brand-600'
                          : 'text-dark-700 dark:text-dark-300'
                        }
                      `}
                    >
                      <div className="flex items-center gap-4 truncate">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0
                          ${item.rank === 1 ? 'bg-yellow-100 text-yellow-700' : item.rank === 2 ? 'bg-slate-100 text-slate-700' : 'bg-dark-100 dark:bg-dark-800 text-dark-500'}
                        `}>
                          #{item.rank}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-6 shrink-0 font-mono font-bold">
                        <span>Sales Target: {item.sales_achievement}%</span>
                        <span className="text-dark-800 dark:text-white">{item.score} Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>

            {/* Health Score category chart */}
            <Card className="lg:col-span-1">
              <Card.Header>
                <Card.Title className="text-xs uppercase font-extrabold tracking-wider">Health Breakdown</Card.Title>
              </Card.Header>
              <Card.Content className="h-64 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={healthCategories} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={70} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                      {healthCategories.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : index === 1 ? '#3B82F6' : '#F59E0B'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card.Content>
            </Card>

          </div>

          {/* Championship rules footer card */}
          <Card>
            <Card.Header>
              <Card.Title className="text-xs uppercase font-extrabold tracking-wider">Tournament Guidelines & Streaks</Card.Title>
            </Card.Header>
            <Card.Content className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-dark-50/20 dark:bg-dark-900/10">
                <Card.Content className="p-4 flex items-center gap-3">
                  <span className="p-2.5 bg-brand-500/10 text-brand-600 rounded-xl">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-dark-800 dark:text-dark-200">Active Champion</h4>
                    <p className="text-[10px] text-dark-500">Downtown Pharmacy (94 Score)</p>
                  </div>
                </Card.Content>
              </Card>
              <Card className="bg-dark-50/20 dark:bg-dark-900/10">
                <Card.Content className="p-4 flex items-center gap-3">
                  <span className="p-2.5 bg-yellow-500/10 text-yellow-600 rounded-xl">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-dark-800 dark:text-dark-200">Q4 2025 Champion</h4>
                    <p className="text-[10px] text-dark-500">Starcine Main Branch (94 score)</p>
                  </div>
                </Card.Content>
              </Card>
              <Card className="bg-dark-50/20 dark:bg-dark-900/10">
                <Card.Content className="p-4 flex items-center gap-3">
                  <span className="p-2.5 bg-yellow-500/10 text-yellow-600 rounded-xl">
                    <Flame className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-dark-800 dark:text-dark-200">Record Streak Holder</h4>
                    <p className="text-[10px] text-dark-500">Main Pharmacy (3 Tournaments)</p>
                  </div>
                </Card.Content>
              </Card>
            </Card.Content>
          </Card>
        </>
      )}

    </div>
  );
};
export { BarChart };
