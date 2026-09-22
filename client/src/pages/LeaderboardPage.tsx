import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext.js';
import {
  Trophy,
  Medal,
  Award,
  Clock,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Lock
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  teamCode: string;
  teamName: string;
  questionsCompleted: number;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  averageAnswerTime: number;
  accuracy: string;
  accuracyNum: number;
  completed: boolean;
  completedAt?: string;
}

export const LeaderboardPage: React.FC = () => {
  const { socket } = useSocket();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [message, setMessage] = useState('');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leaderboard');
      const data = await res.json();

      if (data.showLeaderboard === false) {
        setShowLeaderboard(false);
        setMessage(data.message || 'The leaderboard is currently hidden.');
        setLeaderboard([]);
      } else {
        setShowLeaderboard(true);
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchLeaderboard();
    };

    socket.on('LEADERBOARD_UPDATED', handleUpdate);
    socket.on('leaderboard:refresh', handleUpdate);
    socket.on('QUIZ_COMPLETED', handleUpdate);

    return () => {
      socket.off('LEADERBOARD_UPDATED', handleUpdate);
      socket.off('leaderboard:refresh', handleUpdate);
      socket.off('QUIZ_COMPLETED', handleUpdate);
    };
  }, [socket]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>NEURAL NEXUS 2026 STANDINGS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            Official Competition Leaderboard
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Live rankings evaluated in real time. Ranked by Total Score, with completion speed and earliest finish as authoritative tie-breakers.
          </p>

          <div className="pt-2">
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh Standings</span>
            </button>
          </div>
        </div>

        {/* Hidden Leaderboard Notice */}
        {!showLeaderboard ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-10 text-center max-w-lg mx-auto space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Standings Hidden During Active Quiz</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {message || 'The live leaderboard will be revealed to participants once the quiz concludes.'}
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
          /* Empty Initial State (Zero Dummy Data) */
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No Scores Recorded Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standings will populate as teams join and submit answers during the live event.
            </p>
          </div>
        ) : (
          /* Ranked Table */
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-4 text-center font-bold">Rank</th>
                    <th className="py-4 px-4 font-bold">Team Code</th>
                    <th className="py-4 px-6 font-bold">Team Name</th>
                    <th className="py-4 px-4 text-center font-bold">Progress</th>
                    <th className="py-4 px-4 text-center font-bold">Correct</th>
                    <th className="py-4 px-4 text-center font-bold">Accuracy</th>
                    <th className="py-4 px-4 text-center font-bold">Avg Time</th>
                    <th className="py-4 px-6 text-right font-bold text-amber-400">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leaderboard.map((team) => {
                    const isTop1 = team.rank === 1;
                    const isTop2 = team.rank === 2;
                    const isTop3 = team.rank === 3;

                    return (
                      <tr
                        key={team.teamCode}
                        className={`transition-colors ${
                          isTop1
                            ? 'bg-amber-500/10 hover:bg-amber-500/15'
                            : isTop2
                            ? 'bg-slate-800/40 hover:bg-slate-800/60'
                            : isTop3
                            ? 'bg-orange-500/5 hover:bg-orange-500/10'
                            : 'hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-4 text-center font-black">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-300 text-slate-950 font-black">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-700 text-white font-black">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">#{team.rank}</span>
                          )}
                        </td>

                        {/* Team Code */}
                        <td className="py-4 px-4 font-mono font-bold text-xs text-amber-400/90">
                          {team.teamCode}
                        </td>

                        {/* Team Name */}
                        <td className="py-4 px-6 font-bold text-white text-base">
                          {team.teamName}
                          {team.completed && (
                            <span className="ml-2 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              FINISHED
                            </span>
                          )}
                        </td>

                        {/* Progress */}
                        <td className="py-4 px-4 text-center font-mono text-xs text-slate-300">
                          {team.questionsCompleted} / {team.totalQuestions}
                        </td>

                        {/* Correct Answers */}
                        <td className="py-4 px-4 text-center font-mono text-xs text-emerald-400 font-bold">
                          {team.correctAnswers}
                        </td>

                        {/* Accuracy */}
                        <td className="py-4 px-4 text-center font-mono text-xs text-sky-400">
                          {team.accuracy}
                        </td>

                        {/* Avg Time */}
                        <td className="py-4 px-4 text-center font-mono text-xs text-slate-400">
                          {team.averageAnswerTime}s
                        </td>

                        {/* Total Score */}
                        <td className="py-4 px-6 text-right font-mono font-black text-xl text-amber-400">
                          {team.totalScore}
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
    </div>
  );
};
