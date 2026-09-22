import React, { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext.js';
import { CheckCircle2, Award, Clock, ArrowRight, Trophy, RefreshCw, XCircle, HelpCircle } from 'lucide-react';

interface ResultsPageProps {
  roundId?: string;
  onNavigate: (route: string) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ roundId = 'round-1', onNavigate }) => {
  const { team } = useTeam();
  const [resultData, setResultData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team) {
      onNavigate('/');
      return;
    }

    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/quiz/${roundId}/results`, {
          headers: { 'x-team-id': team.id }
        });
        const data = await res.json();
        setResultData(data);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };

    fetchResults();
  }, [team, roundId, onNavigate]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-slate-950 text-slate-400">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const showImmediate = resultData?.showResults;
  const sub = resultData?.submission;

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-slate-950">
      <div className="max-w-xl w-full space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400">
              SUBMISSION RECORDED
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">ROUND COMPLETE</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Team: <strong className="text-white">{team?.name}</strong> ({team?.id})
            </p>
          </div>

          {showImmediate && sub ? (
            /* Score Summary Cards */
            <div className="space-y-4 pt-2">
              <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-6 space-y-1">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Round Score
                </div>
                <div className="text-4xl sm:text-5xl font-mono font-black text-amber-400">
                  {sub.totalScore}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Correct</span>
                  </div>
                  <div className="text-xl font-mono font-extrabold text-emerald-400">
                    {sub.correctCount}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 flex items-center space-x-1">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Wrong</span>
                  </div>
                  <div className="text-xl font-mono font-extrabold text-red-400">
                    {sub.wrongCount}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
                  <div className="text-xs text-slate-400 flex items-center space-x-1">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Skipped</span>
                  </div>
                  <div className="text-xl font-mono font-extrabold text-slate-300">
                    {sub.unansweredCount}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-center space-x-1.5 pt-1">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Time Taken: <strong>{Math.floor(sub.timeTakenSeconds / 60)}m {sub.timeTakenSeconds % 60}s</strong></span>
              </div>
            </div>
          ) : (
            /* Results Hidden by Organizer */
            <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
              <Award className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm font-semibold text-white">
                Round submitted successfully.
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Official scores and finalist rankings will be revealed on the main auditorium stage screen!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('/waiting')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Back to Waiting Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('/leaderboard')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>View Leaderboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
