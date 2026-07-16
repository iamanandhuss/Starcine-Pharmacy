import React, { useState } from 'react';
import { Trophy, Plus, Calendar, Award, Star, Play } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';

interface Tournament {
  name: string;
  prize_pool: number;
  duration_days: number;
  is_active: boolean;
}

interface LeaderboardRow {
  rank: number;
  store_name: string;
  score: number;
  prize_share: number;
}

export const Championship: React.FC = () => {
  const [activeTournament, setActiveTournament] = useState<Tournament>({
    name: 'Q3 Pharmacy Operations Grand Championship',
    prize_pool: 2500,
    duration_days: 30,
    is_active: true,
  });

  const [leaderboard] = useState<LeaderboardRow[]>([
    { rank: 1, store_name: 'Downtown Pharmacy', score: 95.5, prize_share: 1500 },
    { rank: 2, store_name: 'Main Street Pharmacy', score: 94.0, prize_share: 750 },
    { rank: 3, store_name: 'Westside Branch', score: 82.0, prize_share: 250 },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [prize, setPrize] = useState('1000');
  const [days, setDays] = useState('30');

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleLaunchTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setActiveTournament({
      name,
      prize_pool: Number(prize),
      duration_days: Number(days),
      is_active: true,
    });
    setIsModalOpen(false);
    showToast('New Championship Tournament initiated! Branch scorecards reset.');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🏆 Championship Module</h1>
          <p className="text-xs text-dark-500">Configure team championships, define cash pools, and track real-time store standings</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
          className="shadow-sm"
        >
          New Tournament
        </Button>
      </div>

      {/* Active Tournament Details */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Championship Card */}
        <Card className="lg:col-span-1 border-brand-500 bg-gradient-to-tr from-brand-500/10 to-white dark:from-brand-950/10 dark:to-dark-900 overflow-hidden relative">
          <div className="absolute top-2 right-2 text-brand-500/20">
            <Trophy className="h-32 w-32 -rotate-12" />
          </div>
          <Card.Header className="relative z-10">
            <span className="px-2 py-0.5 rounded bg-brand-500 text-white text-[9px] font-bold uppercase tracking-wider w-fit flex items-center gap-1">
              <Award className="h-3 w-3" /> Active Season
            </span>
            <Card.Title className="text-sm font-extrabold text-dark-800 dark:text-dark-200 mt-2">
              {activeTournament.name}
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4 text-xs relative z-10">
            <div className="flex items-center justify-between p-2.5 bg-white dark:bg-dark-950 rounded-lg shadow-sm border border-dark-100 dark:border-dark-800">
              <span className="font-semibold text-dark-500">Prize Pool Cash</span>
              <span className="font-black text-sm text-green-600 dark:text-green-400 font-mono">
                ${activeTournament.prize_pool.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-white dark:bg-dark-950 rounded-lg shadow-sm border border-dark-100 dark:border-dark-800">
              <span className="font-semibold text-dark-500">Season Duration</span>
              <span className="font-bold text-dark-700 dark:text-dark-300 font-mono">
                {activeTournament.duration_days} Days
              </span>
            </div>

            <div className="pt-2 flex items-center gap-1.5 text-[10px] text-dark-400">
              <Calendar className="h-4 w-4" />
              <span>Ends in 12 days. Standings are computed hourly.</span>
            </div>
          </Card.Content>
        </Card>

        {/* Leaderboard Standings */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="text-xs">Live Standings Leaderboard</Card.Title>
            <Card.Description>Current rankings based on combined compliance and performance scorecards</Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-center w-12">Rank</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Pharmacy Branch</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Operational score</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Projected Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {leaderboard.map(row => (
                    <tr key={row.store_name} className="hover:bg-dark-50/20">
                      <td className="px-4 py-3.5 text-center">
                        {row.rank === 1 ? (
                          <span className="p-1 bg-yellow-500/10 text-yellow-600 rounded-full inline-block font-black font-mono">1st</span>
                        ) : row.rank === 2 ? (
                          <span className="p-1 bg-dark-200 text-dark-600 rounded-full inline-block font-black font-mono">2nd</span>
                        ) : (
                          <span className="p-1 bg-amber-600/10 text-amber-700 rounded-full inline-block font-black font-mono">3rd</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 font-bold text-dark-800 dark:text-dark-200">
                        <div className="flex items-center gap-1.5">
                          {row.rank === 1 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                          {row.store_name}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center font-black text-brand-600 font-mono text-sm">{row.score.toFixed(1)}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-green-600 dark:text-green-400">
                        ${row.prize_share.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="🏆 Initiate Championship Tournament">
        <form onSubmit={handleLaunchTournament} className="space-y-4">
          <Input label="Tournament Label" placeholder="e.g. Q4 Performance Cup" value={name} onChange={e => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prize Pool ($)" type="number" value={prize} onChange={e => setPrize(e.target.value)} required />
            <Input label="Duration (Days)" type="number" value={days} onChange={e => setDays(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" leftIcon={<Play className="h-4 w-4" />}>Launch Season</Button>
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
