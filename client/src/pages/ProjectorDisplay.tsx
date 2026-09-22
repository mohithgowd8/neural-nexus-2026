import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext.js';
import confetti from 'canvas-confetti';
import { Trophy, Clock, BellRing, Cpu, Sparkles, Award, Radio, CheckCircle2 } from 'lucide-react';

export const ProjectorDisplay: React.FC = () => {
  const { socket } = useSocket();
  const [displayData, setDisplayData] = useState<any>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const fetchDisplayData = async () => {
    try {
      const res = await fetch('/api/leaderboard/display');
      const data = await res.json();
      setDisplayData(data);
      if (data.activeRound) {
        setRemainingSeconds(data.activeRound.remainingSeconds || 0);
      }
    } catch (e) {
      console.error('Display fetch error:', e);
    }
  };

  useEffect(() => {
    fetchDisplayData();
    const interval = setInterval(fetchDisplayData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Timer countdown local tick
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSeconds]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;
    socket.emit('JOIN_ROOM', { role: 'display' });

    const handleUpdate = () => {
      fetchDisplayData();
    };

    const handleBuzzer = (data: any) => {
      fetchDisplayData();
    };

    socket.on('LEADERBOARD_UPDATED', handleUpdate);
    socket.on('ROUND_STARTED', handleUpdate);
    socket.on('ROUND_ENDED', handleUpdate);
    socket.on('BUZZER_LOCKED', handleBuzzer);
    socket.on('BUZZER_ACTIVATED', handleBuzzer);

    return () => {
      socket.off('LEADERBOARD_UPDATED', handleUpdate);
      socket.off('ROUND_STARTED', handleUpdate);
      socket.off('ROUND_ENDED', handleUpdate);
      socket.off('BUZZER_LOCKED', handleBuzzer);
      socket.off('BUZZER_ACTIVATED', handleBuzzer);
    };
  }, [socket]);

  // Confetti when event is COMPLETED
  useEffect(() => {
    if (displayData?.event?.status === 'COMPLETED') {
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [displayData?.event?.status]);

  const activeRound = displayData?.activeRound;
  const topTeams = displayData?.topTeams || [];
  const buzzerSession = displayData?.buzzerSession;
  const isEventCompleted = displayData?.event?.status === 'COMPLETED';

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10 flex flex-col justify-between overflow-hidden relative selection:bg-transparent">
      {/* Background Ambience */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Branding */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-xl shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Cpu className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
                NEURAL <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-orange-400 bg-clip-text text-transparent">NEXUS</span> 2026
              </h1>
              <span className="text-xs uppercase font-extrabold tracking-widest px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                AUDITORIUM STAGE
              </span>
            </div>
            <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase mt-0.5">
              THINK. DECODE. INNOVATE. &bull; Department of Artificial Intelligence &amp; Data Science
            </p>
          </div>
        </div>

        {/* Live Round or Status Badge */}
        {activeRound ? (
          <div className="flex items-center space-x-4 bg-slate-900 border border-amber-500/30 px-6 py-3 rounded-2xl shadow-xl">
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span>ACTIVE LIVE ROUND</span>
              </div>
              <div className="text-lg font-black text-white">{activeRound.name}</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="font-mono text-3xl font-black text-amber-400 tracking-wider">
              {formattedTimer}
            </div>
          </div>
        ) : (
          <div className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm font-bold uppercase tracking-wider">
            {displayData?.event?.status || 'STANDBY'}
          </div>
        )}
      </header>

      {/* Main Screen Body */}
      {isEventCompleted ? (
        /* Grand Finale Winners Podium Screen (Requirement 55) */
        <div className="flex-1 my-8 flex flex-col items-center justify-center space-y-10 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-sm font-extrabold uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>THE OFFICIAL RESULTS</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tight">
              NEURAL NEXUS CHAMPIONS
            </h2>
          </div>

          {/* Podium 3-2-1 */}
          <div className="grid grid-cols-3 gap-6 max-w-4xl w-full items-end">
            {/* 2nd Runner Up */}
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-3 shadow-2xl h-64 flex flex-col justify-between">
              <div className="text-3xl">🥈</div>
              <div>
                <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">RUNNER-UP</div>
                <div className="text-xl sm:text-2xl font-black text-white truncate mt-1">
                  {topTeams[1]?.teamName || 'Team Name'}
                </div>
              </div>
              <div className="font-mono text-2xl font-black text-slate-300">
                {topTeams[1]?.score || 0} pts
              </div>
            </div>

            {/* 1st Champion */}
            <div className="bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-400 rounded-3xl p-8 text-center space-y-4 shadow-2xl shadow-amber-500/20 h-80 flex flex-col justify-between">
              <div className="text-5xl">🥇</div>
              <div>
                <div className="text-xs uppercase font-extrabold text-amber-400 tracking-widest">CHAMPION</div>
                <div className="text-2xl sm:text-4xl font-black text-amber-300 truncate mt-1">
                  {topTeams[0]?.teamName || 'Team Name'}
                </div>
              </div>
              <div className="font-mono text-4xl font-black text-amber-400">
                {topTeams[0]?.score || 0} pts
              </div>
            </div>

            {/* 3rd Second Runner Up */}
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-3 shadow-2xl h-56 flex flex-col justify-between">
              <div className="text-3xl">🥉</div>
              <div>
                <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">SECOND RUNNER-UP</div>
                <div className="text-xl sm:text-2xl font-black text-white truncate mt-1">
                  {topTeams[2]?.teamName || 'Team Name'}
                </div>
              </div>
              <div className="font-mono text-2xl font-black text-amber-500/80">
                {topTeams[2]?.score || 0} pts
              </div>
            </div>
          </div>
        </div>
      ) : buzzerSession?.is_active === 1 ? (
        /* Live Buzzer Round Stage Visualization */
        <div className="flex-1 my-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div className="inline-flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
              <BellRing className="w-4 h-4 animate-bounce" />
              <span>ROUND 7: RAPID FIRE BUZZER</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {buzzerSession.question_text || 'Listen to the Host for the Question!'}
            </h2>

            {buzzerSession.status === 'LOCKED' && buzzerSession.buzzed_team_name ? (
              <div className="p-6 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-center space-y-2 animate-fadeIn">
                <div className="text-xs uppercase font-extrabold text-amber-300 tracking-widest">FIRST TO BUZZ IN</div>
                <div className="text-3xl sm:text-5xl font-black text-white">{buzzerSession.buzzed_team_name}</div>
                <div className="text-xs text-amber-300 font-mono">Answer in Progress...</div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <div className="text-xs uppercase font-bold text-slate-500 tracking-widest">BUZZER STATUS</div>
                <div className="text-2xl font-extrabold text-amber-400 animate-pulse">BUZZER IS UNLOCKED &bull; FIRST FINGER WINS</div>
              </div>
            )}
          </div>

          {/* Top 5 Leaderboard Column */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live Stage Standings</h3>
              <span className="text-xs font-mono text-amber-400">Top Teams</span>
            </div>
            <div className="space-y-2.5">
              {topTeams.slice(0, 5).map((team: any) => (
                <div key={team.rank} className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                      {team.rank}
                    </span>
                    <span className="font-bold text-white text-base">{team.teamName}</span>
                  </div>
                  <span className="font-mono text-lg font-black text-amber-400">{team.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Standard Live Leaderboard Stage View */
        <div className="flex-1 my-8 max-w-5xl mx-auto w-full space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  AUDITORIUM SCOREBOARD
                </h2>
                <p className="text-xs text-slate-400">Live synchronized rankings</p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-amber-400 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>UPDATING REAL-TIME</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topTeams.map((team: any) => (
                <div
                  key={team.rank}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    team.rank === 1
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : team.rank <= 3
                      ? 'bg-slate-950 border-slate-700'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate pr-2">
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                        team.rank === 1
                          ? 'bg-amber-500 text-black shadow-md'
                          : team.rank === 2
                          ? 'bg-slate-300 text-black'
                          : team.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {team.rank}
                    </span>
                    <span className="font-extrabold text-white text-base truncate">
                      {team.teamName}
                    </span>
                  </div>
                  <span className="font-mono text-xl font-black text-amber-400 flex-shrink-0">
                    {team.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Department of Artificial Intelligence &amp; Data Science</span>
        <span>Neural Nexus 2026 Live Arena Platform</span>
      </footer>
    </div>
  );
};
