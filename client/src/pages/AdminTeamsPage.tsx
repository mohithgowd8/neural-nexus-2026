import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import {
  Users,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Hash,
  User,
  ShieldCheck
} from 'lucide-react';

export const AdminTeamsPage: React.FC = () => {
  const { token } = useAdminAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/teams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleDeleteTeam = async (code: string) => {
    if (!window.confirm(`Delete team ${code} and clear all their answers?`)) return;

    try {
      const res = await fetch(`/api/admin/teams/${code}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTeams((prev) => prev.filter((t) => t.id !== code));
      }
    } catch (err) {
      console.error('Delete team error:', err);
    }
  };

  const filteredTeams = teams.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.team_name.toLowerCase().includes(search.toLowerCase()) ||
      t.leader_name.toLowerCase().includes(search.toLowerCase()) ||
      t.leader_roll.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Registered Teams</h2>
          <p className="text-xs text-slate-400">
            {teams.length} Total Teams Registered &bull; Each team has an independent randomized sequence
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team or roll #..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={fetchTeams}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Teams Grid / Table */}
      {filteredTeams.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Teams Registered Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            As students join via <code className="text-amber-400 font-mono">/join</code> on their devices, they will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-4 font-bold">Team Code</th>
                  <th className="py-4 px-6 font-bold">Team Name</th>
                  <th className="py-4 px-6 font-bold">Members</th>
                  <th className="py-4 px-4 text-center font-bold">Progress</th>
                  <th className="py-4 px-4 text-center font-bold">Score</th>
                  <th className="py-4 px-4 text-center font-bold">Status</th>
                  <th className="py-4 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTeams.map((t) => {
                  const answered = t.current_index || 0;
                  const score = t.total_score || 0;
                  const isDone = t.completed === 1;

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4 font-mono font-bold text-amber-400 text-sm">
                        {t.id}
                      </td>

                      <td className="py-4 px-6 font-bold text-white text-sm">
                        {t.team_name}
                      </td>

                      <td className="py-4 px-6 space-y-1">
                        <div className="text-slate-200 font-medium">
                          {t.leader_name} <span className="font-mono text-slate-400">({t.leader_roll})</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {t.member2_name} ({t.member2_roll})
                          {t.member3_name && `, ${t.member3_name}`}
                          {t.member4_name && `, ${t.member4_name}`}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-slate-300">
                        {answered} Qs
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-black text-amber-400 text-sm">
                        {score} pts
                      </td>

                      <td className="py-4 px-4 text-center">
                        {isDone ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            COMPLETED
                          </span>
                        ) : answered > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold">
                            PLAYING
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                            WAITING
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDeleteTeam(t.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                          title="Delete Team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
