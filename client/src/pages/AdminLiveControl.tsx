import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { ConfirmModal } from '../components/common/ConfirmModal.js';
import {
  Play,
  Pause,
  Square,
  Trophy,
  Users,
  Clock,
  Radio,
  Eye,
  EyeOff,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Round } from '../types/index.js';

export const AdminLiveControl: React.FC = () => {
  const { token } = useAdminAuth();
  const { socket } = useSocket();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('round-1');
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [leaderboardVisible, setLeaderboardVisible] = useState<boolean>(true);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [totalTeams, setTotalTeams] = useState<number>(0);
  const [topTeams, setTopTeams] = useState<any[]>([]);

  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
    variant: 'warning'
  });

  const fetchLiveState = async () => {
    try {
      // 1. Fetch rounds
      const rRes = await fetch('/api/admin/rounds', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rData = await rRes.json();
      if (rData.rounds) {
        setRounds(rData.rounds);
        const live = rData.rounds.find((r: Round) => r.status === 'LIVE');
        setActiveRound(live || null);
        if (live) setSelectedRoundId(live.id);
      }

      // 2. Fetch current round countdown & stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      setTotalTeams(statsData.totalTeams || 0);
      setSubmittedCount(statsData.submittedCount || 0);
      setLeaderboardVisible(statsData.event?.show_leaderboard === 1);

      // 3. Fetch server remaining seconds
      const curRes = await fetch('/api/rounds/current');
      const curData = await curRes.json();
      if (curData.isLive) {
        setRemainingSeconds(curData.remainingSeconds || 0);
      }

      // 4. Fetch leaderboard top teams
      const leadRes = await fetch('/api/leaderboard');
      const leadData = await leadRes.json();
      if (leadData.leaderboard) {
        setTopTeams(leadData.leaderboard.slice(0, 6));
      }
    } catch (e) {
      console.error('Live state fetch error:', e);
    }
  };

  useEffect(() => {
    fetchLiveState();
    const interval = setInterval(fetchLiveState, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Local timer decrement
  useEffect(() => {
    if (!activeRound || remainingSeconds <= 0) return;
    const t = setInterval(() => {
      setRemainingSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [activeRound, remainingSeconds]);

  // Actions
  const handleStartRound = (roundId: string) => {
    const targetRound = rounds.find(r => r.id === roundId);
    setConfirmAction({
      isOpen: true,
      title: `Start ${targetRound?.name}?`,
      message: `Starting this round will immediately broadcast the challenge to all connected students and synchronize their countdown timers.`,
      variant: 'warning',
      action: async () => {
        setConfirmAction(prev => ({ ...prev, isOpen: false }));
        await fetch(`/api/admin/rounds/${roundId}/start`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchLiveState();
      }
    });
  };

  const handlePauseRound = async (roundId: string) => {
    await fetch(`/api/admin/rounds/${roundId}/pause`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchLiveState();
  };

  const handleEndRound = (roundId: string) => {
    const targetRound = rounds.find(r => r.id === roundId);
    setConfirmAction({
      isOpen: true,
      title: `End ${targetRound?.name}?`,
      message: `Are you sure you want to end this round? Unsubmitted answers will be locked immediately and the timer will stop.`,
      variant: 'danger',
      action: async () => {
        setConfirmAction(prev => ({ ...prev, isOpen: false }));
        await fetch(`/api/admin/rounds/${roundId}/end`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchLiveState();
      }
    });
  };

  const handleToggleLeaderboard = async () => {
    const nextVal = !leaderboardVisible;
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ show_leaderboard: nextVal ? 1 : 0 })
    });
    setLeaderboardVisible(nextVal);
  };

  const selectedRound = rounds.find(r => r.id === selectedRoundId) || rounds[0];

  const min = Math.floor(remainingSeconds / 60);
  const sec = remainingSeconds % 60;
  const formattedTimer = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>ORGANIZER STAGE CONTROL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            LIVE ROUND MASTER CONTROLLER
          </h1>
          <p className="text-xs text-slate-400">
            Engineered for low-latency live operations on event day.
          </p>
        </div>

        {/* Global Leaderboard Visibility Toggle */}
        <button
          onClick={handleToggleLeaderboard}
          className={`px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            leaderboardVisible
              ? 'bg-amber-500/15 border-amber-500 text-amber-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          {leaderboardVisible ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
          <span>{leaderboardVisible ? 'LEADERBOARD VISIBLE' : 'LEADERBOARD FROZEN'}</span>
        </button>
      </div>

      {/* Main Live Round Control Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Master Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
            {/* Round Selector Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Round to Control
              </label>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {rounds.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoundId(r.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      selectedRoundId === r.id
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                        : r.status === 'LIVE'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {r.name.replace(/^Round\s*\d*:\s*/, '')} ({r.status})
                  </button>
                ))}
              </div>
            </div>

            {/* Live Round Details & Big Timer */}
            {selectedRound && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                      selectedRound.status === 'LIVE'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {selectedRound.status} MODE
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">{selectedRound.name}</h2>
                    <p className="text-xs text-slate-400">{selectedRound.subtitle}</p>
                  </div>

                  {/* Big Server Timer Display */}
                  <div className="bg-slate-900 border border-amber-500/30 px-6 py-3 rounded-2xl text-center shadow-lg">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Remaining Time</div>
                    <div className="font-mono text-3xl sm:text-4xl font-black text-amber-400 tracking-wider">
                      {selectedRound.status === 'LIVE' ? formattedTimer : `${selectedRound.duration_minutes}:00`}
                    </div>
                  </div>
                </div>

                {/* Submissions & Participants Counters */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Teams</div>
                    <div className="text-2xl font-black text-white font-mono">{totalTeams}</div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Submitted</div>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {selectedRound.status === 'LIVE' ? submittedCount : (selectedRound as any).totalSubmissions || 0}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">In-Progress</div>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {selectedRound.status === 'LIVE' ? Math.max(0, totalTeams - submittedCount) : 0}
                    </div>
                  </div>
                </div>

                {/* BIG ACTION BUTTONS (Requirement 26 & 42) */}
                <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {selectedRound.status !== 'LIVE' ? (
                    <button
                      onClick={() => handleStartRound(selectedRound.id)}
                      className="py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center space-x-2 sm:col-span-2"
                    >
                      <Play className="w-5 h-5 fill-slate-950" />
                      <span>START THIS ROUND</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handlePauseRound(selectedRound.id)}
                        className="py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <Pause className="w-5 h-5 fill-slate-950" />
                        <span>PAUSE ROUND</span>
                      </button>

                      <button
                        onClick={() => handleEndRound(selectedRound.id)}
                        className="py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 transition cursor-pointer flex items-center justify-center space-x-2 sm:col-span-2"
                      >
                        <Square className="w-5 h-5 fill-white" />
                        <span>END &amp; LOCK ROUND</span>
                      </button>
                    </>
                  )}

                  {selectedRound.status !== 'LIVE' && (
                    <button
                      onClick={() => handleEndRound(selectedRound.id)}
                      className="py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm uppercase tracking-wider transition cursor-pointer"
                    >
                      Force End
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Live Standings Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Current Top Ranks</span>
            </h3>
            <span className="text-xs font-mono text-amber-400">Live</span>
          </div>

          <div className="space-y-2.5">
            {topTeams.map((team, idx) => (
              <div key={team.teamId || idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center space-x-2.5 truncate pr-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 font-mono font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-white truncate">{team.teamName}</span>
                </div>
                <span className="font-mono font-black text-amber-400 text-sm">{team.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmAction.isOpen}
        title={confirmAction.title}
        message={confirmAction.message}
        variant={confirmAction.variant}
        confirmText="PROCEED"
        cancelText="CANCEL"
        onConfirm={confirmAction.action}
        onCancel={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
