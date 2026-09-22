import React, { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext.js';
import { useSocket } from '../context/SocketContext.js';
import { Users, Sparkles, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

interface WaitingRoomPageProps {
  onNavigate: (route: string) => void;
}

export const WaitingRoomPage: React.FC<WaitingRoomPageProps> = ({ onNavigate }) => {
  const { team: contextTeam, teamCode: contextCode } = useTeam();
  const { socket } = useSocket();
  const [checking, setChecking] = useState(false);

  // Fallback to localStorage immediately
  const savedTeamStr = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_team') : null;
  const team = contextTeam || (savedTeamStr ? JSON.parse(savedTeamStr) : null);
  const teamCode = contextCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_team_code') : null);

  useEffect(() => {
    const code = teamCode || localStorage.getItem('nexus_team_code');
    if (!code) {
      onNavigate('/join');
      return;
    }

    // Check if event is live
    const checkState = async () => {
      try {
        setChecking(true);
        const res = await fetch(`/api/quiz/current?teamCode=${code}`);
        const data = await res.json();
        if (data.eventState === 'LIVE' && !data.completed) {
          onNavigate('/quiz');
        }
      } catch (err) {
        // Fallback
      } finally {
        setChecking(false);
      }
    };

    checkState();
    const interval = setInterval(checkState, 2000);

    return () => clearInterval(interval);
  }, [teamCode, onNavigate]);

  // Listen to real-time event start via WebSockets
  useEffect(() => {
    if (!socket) return;

    const handleQuizStart = () => {
      onNavigate('/quiz');
    };

    const handleStatusChange = (data: { status: string }) => {
      if (data.status === 'LIVE') {
        onNavigate('/quiz');
      }
    };

    socket.on('QUIZ_STARTED', handleQuizStart);
    socket.on('EVENT_STATUS_CHANGED', handleStatusChange);

    return () => {
      socket.off('QUIZ_STARTED', handleQuizStart);
      socket.off('EVENT_STATUS_CHANGED', handleStatusChange);
    };
  }, [socket, onNavigate]);

  if (!team && !teamCode) return null;

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-slate-950 text-slate-100">
      <div className="max-w-lg w-full space-y-6">
        {/* Team Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-slate-800 text-amber-400 border border-amber-500/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>TEAM REGISTERED &bull; READY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{team?.team_name || 'Your Team'}</h1>
            <div className="inline-block font-mono text-base font-extrabold px-4 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {teamCode || team?.id}
            </div>
          </div>

          {/* Members list */}
          {team && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Team Members</div>
              <div className="flex items-center justify-between text-slate-200">
                <span>{team.leader_name} (Leader)</span>
                <span className="font-mono text-slate-400">{team.leader_roll}</span>
              </div>
              {team.member2_name && (
                <div className="flex items-center justify-between text-slate-200">
                  <span>{team.member2_name}</span>
                  <span className="font-mono text-slate-400">{team.member2_roll}</span>
                </div>
              )}
              {team.member3_name && (
                <div className="flex items-center justify-between text-slate-200">
                  <span>{team.member3_name}</span>
                  <span className="font-mono text-slate-400">{team.member3_roll}</span>
                </div>
              )}
              {team.member4_name && (
                <div className="flex items-center justify-between text-slate-200">
                  <span>{team.member4_name}</span>
                  <span className="font-mono text-slate-400">{team.member4_roll}</span>
                </div>
              )}
            </div>
          )}

          {/* Waiting animation state */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
              </span>
              <span className="text-sm font-bold uppercase tracking-wider text-amber-400">
                WAITING FOR ADMIN TO START QUIZ
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
              Please stay on this screen. As soon as the event administrator clicks <span className="text-amber-400 font-bold">START QUIZ</span>, your 100-question randomized test will begin automatically.
            </p>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-center justify-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Independent randomized sequence locked for your team</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
