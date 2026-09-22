import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import {
  Trophy,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Award,
  Clock,
  CheckCircle2
} from 'lucide-react';

export const AdminLeaderboard: React.FC = () => {
  const { token } = useAdminAuth();
  const { socket } = useSocket();

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leaderboard', {
        headers: {
          'x-admin-request': 'true',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setLeaderboard(data.leaderboard || []);
      }

      // Fetch settings to check public visibility state
      const sRes = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sData = await sRes.json();
      if (sRes.ok) {
        setSettings(sData.settings);
      }
    } catch (err) {
      console.error('Failed to load admin leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    socket.on('leaderboard:refresh', fetchLeaderboard);
    socket.on('LEADERBOARD_UPDATED', fetchLeaderboard);
    return () => {
      socket.off('leaderboard:refresh');
      socket.off('LEADERBOARD_UPDATED');
    };
  }, [socket]);

  // Toggle public leaderboard visibility
  const handleToggleVisibility = async () => {
    if (!settings) return;
    setTogglingVisibility(true);
    try {
      const nextVal = settings.leaderboard_visible === 1 ? 0 : 1;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ leaderboard_visible: nextVal })
      });
      if (res.ok) {
        setSettings((prev: any) => ({ ...prev, leaderboard_visible: nextVal }));
      }
    } catch (err) {
      console.error('Visibility toggle error:', err);
    } finally {
      setTogglingVisibility(false);
    }
  };

  // Export Results as CSV
  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/admin/export?format=csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neural_nexus_2026_leaderboard_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const isPublicVisible = settings?.leaderboard_visible === 1;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Live Competition Leaderboard</h2>
          <p className="text-xs text-slate-400">
            Real-time standings evaluated live from SQLite database records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Public Visibility Toggle */}
          <button
            onClick={handleToggleVisibility}
            disabled={togglingVisibility}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer ${
              isPublicVisible
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isPublicVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{isPublicVisible ? 'Publicly Visible' : 'Hidden from Participants'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchLeaderboard}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      {leaderboard.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Scores Available Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The leaderboard will automatically populate with live calculations as participants submit answers.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-4 text-center font-bold">Rank</th>
                  <th className="py-4 px-4 font-bold">Team Code</th>
                  <th className="py-4 px-6 font-bold">Team Name</th>
                  <th className="py-4 px-4 text-center font-bold">Progress</th>
                  <th className="py-4 px-4 text-center font-bold">Correct</th>
                  <th className="py-4 px-4 text-center font-bold">Accuracy</th>
                  <th className="py-4 px-4 text-center font-bold">Avg Speed</th>
                  <th className="py-4 px-6 text-right font-bold text-amber-400">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboard.map((team) => (
                  <tr key={team.teamCode} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 text-center font-black">
                      {team.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black">
                          1
                        </span>
                      ) : team.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-300 text-slate-950 font-black">
                          2
                        </span>
                      ) : team.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-700 text-white font-black">
                          3
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">#{team.rank}</span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-amber-400">
                      {team.teamCode}
                    </td>

                    <td className="py-4 px-6 font-bold text-white text-sm">
                      {team.teamName}
                      {team.completed && (
                        <span className="ml-2 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          FINISHED
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center font-mono text-slate-300">
                      {team.questionsCompleted} / {team.totalQuestions}
                    </td>

                    <td className="py-4 px-4 text-center font-mono text-emerald-400 font-bold">
                      {team.correctAnswers}
                    </td>

                    <td className="py-4 px-4 text-center font-mono text-sky-400">
                      {team.accuracy}
                    </td>

                    <td className="py-4 px-4 text-center font-mono text-slate-400">
                      {team.averageAnswerTime}s
                    </td>

                    <td className="py-4 px-6 text-right font-mono font-black text-lg text-amber-400">
                      {team.totalScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
