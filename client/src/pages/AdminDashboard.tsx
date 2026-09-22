import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext.js';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import {
  Users,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Zap,
  Clock,
  Sparkles,
  Flame,
  Radio,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectTab: (tab: string) => void;
  onNavigate: (route: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectTab, onNavigate }) => {
  const { token } = useAdminAuth();
  const { socket } = useSocket();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    socket.on('admin:monitor:update', (data: any) => {
      setStats((prev: any) => prev ? { ...prev, ...data } : prev);
    });

    socket.on('ADMIN_ALERT', (alert: any) => {
      setActionMessage(`Anti-Cheat Alert: Team ${alert.teamName} (${alert.teamCode}) switched tabs.`);
      fetchDashboard();
    });

    return () => {
      socket.off('admin:monitor:update');
      socket.off('ADMIN_ALERT');
    };
  }, [socket]);

  const handleSetStatus = async (newStatus: 'WAITING' | 'LIVE' | 'COMPLETED') => {
    if (newStatus === 'LIVE' && (!stats?.activeQuestions || stats.activeQuestions === 0)) {
      alert('Cannot start quiz: There are 0 active questions in the Question Bank! Please load the 100 questions first.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/event/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Event status changed to ${newStatus}`);
        fetchDashboard();
      } else {
        alert(data.error || 'Failed to update event status');
      }
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetEvent = async () => {
    const confirmReset = window.confirm(
      'Are you sure you want to RESET THE ENTIRE EVENT?\n\nThis will purge all registered teams, participant answers, and session scores to prepare for a clean new competition. Question bank is preserved.'
    );
    if (!confirmReset) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/event/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActionMessage('Event reset successfully. All teams and scores cleared.');
        fetchDashboard();
      }
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
        <p>Loading organizer dashboard...</p>
      </div>
    );
  }

  const isLive = stats?.eventStatus === 'LIVE';
  const isWaiting = stats?.eventStatus === 'WAITING';
  const isCompleted = stats?.eventStatus === 'COMPLETED';

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs text-amber-400 font-bold uppercase hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Event Control Deck */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isLive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                    : isWaiting
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                EVENT STATUS: {stats?.eventStatus || 'WAITING'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Target: {stats?.settings?.total_questions || 100} Questions &bull; {stats?.settings?.question_time_seconds || 120}s Per Question
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Neural Nexus 2026 Master Event Deck
            </h2>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isWaiting ? (
              <button
                onClick={() => handleSetStatus('LIVE')}
                disabled={actionLoading}
                className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START QUIZ (GO LIVE)</span>
              </button>
            ) : isLive ? (
              <button
                onClick={() => handleSetStatus('WAITING')}
                disabled={actionLoading}
                className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>PAUSE QUIZ</span>
              </button>
            ) : (
              <button
                onClick={() => handleSetStatus('WAITING')}
                disabled={actionLoading}
                className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RE-OPEN FOR WAITING</span>
              </button>
            )}

            {!isCompleted && (
              <button
                onClick={() => handleSetStatus('COMPLETED')}
                disabled={actionLoading}
                className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm uppercase tracking-wider transition cursor-pointer"
              >
                END QUIZ
              </button>
            )}

            <button
              onClick={handleResetEvent}
              disabled={actionLoading}
              className="px-4 py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-sm uppercase tracking-wider transition cursor-pointer active:scale-95"
              title="Purge teams and scores for a fresh start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warning if 0 active questions */}
        {(!stats?.activeQuestions || stats.activeQuestions === 0) && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">Question Bank is Empty (0 Active Questions). </span>
                Participants cannot start until questions are loaded.
              </div>
            </div>
            <button
              onClick={() => onSelectTab('questions')}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition cursor-pointer shrink-0 ml-4"
            >
              Go to Question Bank
            </button>
          </div>
        )}
      </div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Teams Joined</span>
          </div>
          <div className="text-3xl font-black text-white">{stats?.totalTeams || 0}</div>
          <div className="text-[10px] text-slate-500">Registered devices</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Active Playing</span>
          </div>
          <div className="text-3xl font-black text-orange-400">{stats?.activeSessions || 0}</div>
          <div className="text-[10px] text-slate-500">Currently answering</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Completed</span>
          </div>
          <div className="text-3xl font-black text-emerald-400">{stats?.completedSessions || 0}</div>
          <div className="text-[10px] text-slate-500">Finished all Qs</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Waiting Teams</span>
          </div>
          <div className="text-3xl font-black text-sky-400">{stats?.waitingTeams || 0}</div>
          <div className="text-[10px] text-slate-500">In waiting room</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Answers Logged</span>
          </div>
          <div className="text-3xl font-black text-amber-400">{stats?.totalAnswers || 0}</div>
          <div className="text-[10px] text-slate-500">Submissions scored</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Active Questions</span>
          </div>
          <div className="text-3xl font-black text-white">{stats?.activeQuestions || 0}</div>
          <div className="text-[10px] text-slate-500">Pool capacity</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => onSelectTab('questions')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 space-y-3 cursor-pointer transition"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-white">Question Bank</h3>
          <p className="text-xs text-slate-400">
            Manage question pool, toggle active questions, or load the official 100 AI/DS competition question pack.
          </p>
          <div className="text-xs font-bold text-amber-400 flex items-center space-x-1 pt-2">
            <span>Manage Questions ({stats?.totalQuestions || 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onSelectTab('leaderboard')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 space-y-3 cursor-pointer transition"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-white">Live Leaderboard</h3>
          <p className="text-xs text-slate-400">
            Monitor real-time team rankings, accuracy percentages, speed scores, and export final results as CSV.
          </p>
          <div className="text-xs font-bold text-orange-400 flex items-center space-x-1 pt-2">
            <span>View Standings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onSelectTab('teams')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 space-y-3 cursor-pointer transition"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-white">Registered Teams</h3>
          <p className="text-xs text-slate-400">
            Inspect team member names, roll numbers, individual progress, and verify device connections.
          </p>
          <div className="text-xs font-bold text-sky-400 flex items-center space-x-1 pt-2">
            <span>View Teams ({stats?.totalTeams || 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Live Anti-Cheat & Event Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-wider text-white flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Recent Event &amp; Anti-Cheat Logs</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Live Socket Stream</span>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto font-mono text-xs">
          {stats?.recentLogs && stats.recentLogs.length > 0 ? (
            stats.recentLogs.map((log: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.event_type.includes('TAB_SWITCH')
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {log.event_type}
                  </span>
                  <span className="text-slate-300">{log.details || log.event_type}</span>
                </div>
                <span className="text-slate-500 text-[10px] shrink-0 ml-4">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-slate-500">No event logs recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
