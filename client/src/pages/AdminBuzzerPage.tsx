import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { BellRing, Check, X, Unlock, RotateCcw, Play, Zap, HelpCircle } from 'lucide-react';
import { BuzzerSession, Question } from '../types/index.js';

export const AdminBuzzerPage: React.FC = () => {
  const { token } = useAdminAuth();
  const { socket } = useSocket();

  const [session, setSession] = useState<BuzzerSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [customQuestionText, setCustomQuestionText] = useState<string>('');

  const fetchBuzzerState = async () => {
    try {
      const res = await fetch('/api/buzzer/state?roundId=round-7');
      const data = await res.json();
      if (data.session) setSession(data.session);

      // Fetch buzzer questions
      const qRes = await fetch('/api/admin/questions?roundId=round-7', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const qData = await qRes.json();
      if (qData.questions) {
        setQuestions(qData.questions);
        if (qData.questions.length > 0 && !selectedQuestionId) {
          setSelectedQuestionId(qData.questions[0].id);
          setCustomQuestionText(qData.questions[0].question_text);
        }
      }
    } catch (e) {
      console.error('Failed to fetch buzzer state:', e);
    }
  };

  useEffect(() => {
    fetchBuzzerState();
  }, [token]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchBuzzerState();

    socket.on('BUZZER_LOCKED', handleUpdate);
    socket.on('BUZZER_ACTIVATED', handleUpdate);
    socket.on('BUZZER_DECISION', handleUpdate);
    socket.on('BUZZER_RESET', handleUpdate);

    return () => {
      socket.off('BUZZER_LOCKED', handleUpdate);
      socket.off('BUZZER_ACTIVATED', handleUpdate);
      socket.off('BUZZER_DECISION', handleUpdate);
      socket.off('BUZZER_RESET', handleUpdate);
    };
  }, [socket]);

  const handleActivateBuzzer = async () => {
    try {
      await fetch('/api/buzzer/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roundId: 'round-7',
          questionId: selectedQuestionId,
          questionText: customQuestionText
        })
      });
      fetchBuzzerState();
    } catch (e) {
      alert('Failed to activate buzzer');
    }
  };

  const handleDecision = async (decision: 'ACCEPT' | 'WRONG') => {
    try {
      await fetch('/api/buzzer/decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roundId: 'round-7',
          decision,
          marks: 20,
          penalty: 10
        })
      });
      fetchBuzzerState();
    } catch (e) {
      alert('Failed to record decision');
    }
  };

  const handleUnlockRemaining = async () => {
    try {
      await fetch('/api/buzzer/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roundId: 'round-7',
          unlockForRemaining: true
        })
      });
      fetchBuzzerState();
    } catch (e) {
      alert('Failed to unlock buzzer');
    }
  };

  const handleCompleteReset = async () => {
    try {
      await fetch('/api/buzzer/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roundId: 'round-7',
          unlockForRemaining: false
        })
      });
      fetchBuzzerState();
    } catch (e) {
      alert('Failed to reset');
    }
  };

  const isBuzzed = session?.status === 'LOCKED' && session?.buzzed_team_name;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">LIVE BUZZER CONTROLLER</h1>
        <p className="text-xs text-slate-400">Server-authoritative buzzer desk for the rapid fire grand finale.</p>
      </div>

      {/* Main Buzzer Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-2xl border ${
              session?.is_active
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</span>
              <div className="text-xl font-black text-white">{session?.status || 'IDLE'}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCompleteReset}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Full Reset</span>
            </button>
          </div>
        </div>

        {/* Current Buzzer Question */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Question to Present
          </label>
          {questions.length > 0 && (
            <select
              value={selectedQuestionId}
              onChange={(e) => {
                setSelectedQuestionId(e.target.value);
                const q = questions.find(item => item.id === e.target.value);
                if (q) setCustomQuestionText(q.question_text);
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-white text-xs sm:text-sm outline-none cursor-pointer mb-2"
            >
              {questions.map((q, i) => (
                <option key={q.id} value={q.id}>Q{i + 1}: {q.question_text}</option>
              ))}
            </select>
          )}

          <textarea
            value={customQuestionText}
            onChange={(e) => setCustomQuestionText(e.target.value)}
            rows={2}
            placeholder="Type question text..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-white text-sm outline-none"
          />
        </div>

        {/* Buzzer Lock Announcement Box */}
        {isBuzzed ? (
          <div className="p-6 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-center space-y-3 animate-fadeIn">
            <div className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
              FIRST TEAM ON THE BUZZER
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white">
              {session?.buzzed_team_name}
            </div>
            <div className="text-xs font-mono text-slate-400">
              Server Timestamp: {session?.buzzed_at ? new Date(session.buzzed_at).toLocaleTimeString() : ''}
            </div>

            {/* Host Decision Controls (Requirement 32) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-amber-500/30">
              <button
                onClick={() => handleDecision('ACCEPT')}
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>ACCEPT (+20)</span>
              </button>

              <button
                onClick={() => handleDecision('WRONG')}
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase flex items-center justify-center space-x-1.5 shadow-lg shadow-red-600/20 transition cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>WRONG (-10)</span>
              </button>

              <button
                onClick={handleUnlockRemaining}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm uppercase flex items-center justify-center space-x-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Unlock className="w-4 h-4 text-amber-400" />
                <span>NEXT TEAM</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Buzzer Inactive / Standby
            </div>

            <button
              onClick={handleActivateBuzzer}
              className="py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base uppercase tracking-wider shadow-xl shadow-amber-500/25 transition cursor-pointer inline-flex items-center space-x-2"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>ACTIVATE BUZZER FOR STUDENTS</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
