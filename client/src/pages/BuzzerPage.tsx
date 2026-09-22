import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext.js';
import { useSocket } from '../context/SocketContext.js';
import { BellRing, CheckCircle2, XCircle, Clock, Zap, AlertCircle } from 'lucide-react';
import { BuzzerSession } from '../types/index.js';

interface BuzzerPageProps {
  onNavigate: (route: string) => void;
}

export const BuzzerPage: React.FC<BuzzerPageProps> = ({ onNavigate }) => {
  const { team } = useTeam();
  const { socket } = useSocket();

  const [session, setSession] = useState<BuzzerSession | null>(null);
  const [isBuzzedByMe, setIsBuzzedByMe] = useState(false);
  const [buzzing, setBuzzing] = useState(false);

  useEffect(() => {
    if (!team) {
      onNavigate('/join');
      return;
    }

    // Fetch current state
    fetch('/api/buzzer/state?roundId=round-7')
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          setSession(data.session);
          if (data.session.buzzed_team_id === team.id) {
            setIsBuzzedByMe(true);
          }
        }
      });
  }, [team, onNavigate]);

  // Real-time socket events
  useEffect(() => {
    if (!socket || !team) return;

    const handleActivated = (data: any) => {
      setIsBuzzedByMe(false);
      setSession(prev => prev ? {
        ...prev,
        is_active: 1,
        status: 'ACTIVE',
        question_id: data.questionId,
        question_text: data.questionText,
        buzzed_team_id: null,
        buzzed_team_name: null
      } : null);
    };

    const handleLocked = (data: any) => {
      if (data.teamId === team.id) {
        setIsBuzzedByMe(true);
      }
      setSession(prev => prev ? {
        ...prev,
        status: 'LOCKED',
        buzzed_team_id: data.teamId,
        buzzed_team_name: data.teamName,
        buzzed_at: data.buzzedAt
      } : null);
    };

    const handleDecision = (data: any) => {
      setSession(data.session);
    };

    const handleReset = (data: any) => {
      setIsBuzzedByMe(false);
      setSession(prev => prev ? {
        ...prev,
        status: data.status,
        is_active: data.isActive,
        buzzed_team_id: null,
        buzzed_team_name: null
      } : null);
    };

    socket.on('BUZZER_ACTIVATED', handleActivated);
    socket.on('BUZZER_LOCKED', handleLocked);
    socket.on('BUZZER_DECISION', handleDecision);
    socket.on('BUZZER_RESET', handleReset);

    return () => {
      socket.off('BUZZER_ACTIVATED', handleActivated);
      socket.off('BUZZER_LOCKED', handleLocked);
      socket.off('BUZZER_DECISION', handleDecision);
      socket.off('BUZZER_RESET', handleReset);
    };
  }, [socket, team]);

  const handlePressBuzzer = async () => {
    if (!team || !session || session.status !== 'ACTIVE' || buzzing) return;
    setBuzzing(true);

    try {
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      const res = await fetch('/api/buzzer/buzz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: 'round-7', teamId: team.id })
      });

      const data = await res.json();
      if (data.buzzedFirst) {
        setIsBuzzedByMe(true);
      }
    } catch (e) {
      console.error('Buzzer press failed:', e);
    } finally {
      setBuzzing(false);
    }
  };

  const isActive = session?.is_active === 1 && session?.status === 'ACTIVE';
  const isLocked = session?.status === 'LOCKED';

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 bg-slate-950">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Header Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>FINALE: BUZZER BLAST</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">LIVE BUZZER DESK</h1>
          <p className="text-xs text-slate-400">Team: <strong className="text-white">{team?.name}</strong></p>
        </div>

        {/* Active Question Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-2">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Current Question</span>
          <p className="text-sm sm:text-base font-bold text-slate-200">
            {session?.question_text || 'Waiting for host to present question...'}
          </p>
        </div>

        {/* Big Interactive Buzzer Button */}
        <div className="py-6 flex flex-col items-center justify-center space-y-4">
          <button
            onClick={handlePressBuzzer}
            disabled={!isActive || buzzing}
            className={`w-52 h-52 sm:w-60 sm:h-60 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-150 transform active:scale-95 ${
              isActive
                ? 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-4 border-yellow-300 shadow-amber-500/50 cursor-pointer animate-buzzer text-black'
                : isLocked
                ? 'bg-slate-800 border-4 border-slate-700 text-slate-500 cursor-not-allowed opacity-80'
                : 'bg-slate-900 border-4 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <BellRing className={`w-14 h-14 sm:w-16 sm:h-16 mb-2 ${isActive ? 'animate-bounce text-black' : ''}`} />
            <span className="text-2xl sm:text-3xl font-black tracking-wider uppercase">
              {isActive ? 'BUZZ IN!' : isLocked ? 'LOCKED' : 'STANDBY'}
            </span>
          </button>
        </div>

        {/* Buzzer Lock Announcement */}
        {isLocked && (
          <div className="p-4 rounded-2xl border bg-slate-900 animate-fadeIn space-y-1">
            {isBuzzedByMe ? (
              <div className="text-emerald-400 flex items-center justify-center space-x-2 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>YOU BUZZED FIRST! Please answer the host.</span>
              </div>
            ) : (
              <div className="text-amber-400 flex items-center justify-center space-x-2 font-semibold text-sm">
                <Clock className="w-4 h-4" />
                <span>Team <strong className="text-white">{session?.buzzed_team_name}</strong> buzzed first!</span>
              </div>
            )}
          </div>
        )}

        {session?.status === 'ACCEPTED' && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm font-bold">
            ✔ Answer Accepted! Marks Awarded.
          </div>
        )}

        {session?.status === 'WRONG' && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-bold">
            ✖ Wrong Answer! Host will unlock for the next team.
          </div>
        )}
      </div>
    </div>
  );
};
